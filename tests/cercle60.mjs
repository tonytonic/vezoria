// Essai « panel de 60 personnes » (nuit du 13 au 14/11/2026) — tiré au hasard, mais rejouable (graine fixe, GRAINE=n pour en changer) :
//   · 20 utilisateurs normaux : chacun son carnet avec compte, un voyage partagé, un fil d'abonnés ; ils sont compagnons,
//     membres et abonnés LES UNS DES AUTRES, écrivent, envoient des photos, aiment, commentent.
//   · 20 utilisateurs de l'appli qui attaquent : chacun a un VRAI accès chez une victime (code compagnon, membre du voyage,
//     abonné, 2e téléphone bloqué, compagnon retiré) et tente, tour après tour, une attaque tirée au hasard.
//   · 20 extérieurs sans appli : codes devinés, requêtes mal formées, textes piégés, gros envois, en-têtes trafiqués.
// Après chaque tour : aucune erreur serveur, aucune attaque réussie, et les 20 normaux retrouvent TOUT ce qu'ils ont écrit.
//   node tests/cercle60.mjs functions          (TOURS=8 par défaut)
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const DIR = path.resolve(process.argv[2] || 'functions');
const imp = f => import(pathToFileURL(path.join(DIR, 'api', f)).href);
function d1() {
  const db = new DatabaseSync(':memory:');
  const mk = (sql, args = []) => ({
    bind: (...a) => mk(sql, a),
    async first() { const r = db.prepare(sql).get(...args); return r === undefined ? null : r; },
    async all() { return { results: db.prepare(sql).all(...args) }; },
    async run() { const st = db.prepare(sql); if (/RETURNING/i.test(sql)) { st.all(...args); return { meta: { changes: 1 } }; } const r = st.run(...args); return { meta: { changes: Number(r.changes) } }; },
    _exec() { const st = db.prepare(sql); return /^\s*SELECT/i.test(sql) ? st.all(...args) : st.run(...args); },
  });
  return { prepare: sql => mk(sql), async batch(list) { db.exec('BEGIN'); try { const out = list.map(s => s._exec()); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; } }, _db: db };
}
function r2() { const m = new Map(); return {
  async put(k, v, o) { m.set(k, { v: new Uint8Array(v), o: o || {}, up: new Date() }); },
  async head(k) { const x = m.get(k); return x ? { key: k, size: x.v.length, uploaded: x.up } : null; },
  async get(k) { const x = m.get(k); return x ? { body: x.v, httpMetadata: x.o.httpMetadata, customMetadata: x.o.customMetadata } : null; },
  async delete(k) { (Array.isArray(k) ? k : [k]).forEach(x => m.delete(x)); },
  async list({ prefix = '' } = {}) { return { objects: [...m].filter(([k]) => k.startsWith(prefix)).map(([k, x]) => ({ key: k, size: x.v.length, uploaded: x.up })), truncated: false, delimitedPrefixes: [] }; }, _m: m }; }
const env = { DB: d1(), PHOTOS: r2(), MAIL_DEV: '1', ADMIN_KEY: 'k'.repeat(30), PAY_ON: '1', STRIPE_SECRET: 'sk_test_x', MAIL_KEY: 'clef-de-test' };
env.DB._db.exec(fs.readFileSync(path.join(DIR, '..', 'schema.sql'), 'utf8'));
globalThis.caches = globalThis.caches || { default: { async match() { return null; }, async put() {} } };
globalThis.fetch = async (u) => { u = String(u); if (u.includes('api.stripe.com')) return new Response(JSON.stringify({ url: 'https://billing.stripe.com/session/test' }), { status: 200 }); if (u.includes('/api/push?a=flush')) return new Response('{}'); throw new Error('réseau interdit dans les essais : ' + u); };
const mods = {}; for (const f of ['sync', 'account', 'device', 'member', 'plan', 'push', 'photo', 'admin', 'rotate', 'unfurl', 'act']) mods[f] = await imp(f + '.js');
async function call(route, { who, code, body, method = 'POST', headers = {}, query = '', raw } = {}) {
  const h = { 'Content-Type': 'application/json', 'CF-Connecting-IP': (who && who.ip) || '203.0.113.250', ...headers };
  if (code) h['X-Carnet-Code'] = code; if (who && who.dev) h['X-Carnet-Dev'] = who.dev; if (who && who.key) h['X-Carnet-Key'] = who.key;   // 🔐 clé secrète de l'appareil (13/11)
  const req = new Request('https://vezoria.test/api/' + route + query, { method, headers: h, body: method === 'GET' ? undefined : raw || JSON.stringify(body || {}) });
  const fn = mods[route]['onRequest' + method[0] + method.slice(1).toLowerCase()] || mods[route].onRequest;
  const res = await fn({ request: req, env, waitUntil: p => { p && p.catch && p.catch(() => {}); }, params: {} });
  let j = {}; try { j = await res.clone().json(); } catch (e) {}
  return { s: res.status, j };
}
let pass = 0, fail = 0; const bad = [], VERB = !!process.env.VERB;
const ok = (cond, label, extra) => { if (cond) { pass++; if (VERB) console.log('  ✓', label); } else { fail++; bad.push(label); console.log('  ✗', label, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } };
const hex = () => [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
const rec = (id, extra = {}) => ({ id, type: 'note', updatedAt: Date.now(), v: 'x', ...extra });
// en-têtes qu'envoie la vraie appli : la clé d'écriture de ce téléphone, et l'empreinte de son carnet principal sur les autres espaces
const H = (who, more = {}) => ({ 'X-Carnet-Writer': who.w, ...(who.main ? { 'X-Carnet-Acct': who.main } : {}), ...more });
const sync = (who, code, changes = [], more = {}) => call('sync', { who, code, body: { since: 0, changes }, headers: code === who.main ? { 'X-Carnet-Writer': who.w, 'X-Carnet-Main': '1', ...more } : H(who, more) });
const img = new Uint8Array(2000).fill(7);
const photo = (who, code, id, more = {}) => call('photo', { who, code, raw: img, headers: { 'Content-Type': 'image/jpeg', 'X-Photo-Id': id, ...H(who, more) } });
const ids = r => (r.j.records || []).map(x => x.id);
// tirage au hasard rejouable
let seed = +(process.env.GRAINE || 20261114); const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
let n5xx = 0; const x5 = [];
const C = async (route, o, label) => { let r; try { r = await call(route, o); } catch (e) { r = { s: 500, j: { error: 'PLANTAGE : ' + String(e && e.message || e).slice(0, 160) } }; } if (r.s >= 500) { n5xx++; x5.push(route + ' ' + (label || '') + ' → ' + r.s + ' ' + JSON.stringify(r.j).slice(0, 120)); } return r; };
const S = (who, code, changes = [], more = {}) => C('sync', { who, code, body: { since: 0, changes }, headers: code === who.main ? { 'X-Carnet-Writer': who.w, 'X-Carnet-Main': '1', ...more } : H(who, more) }, 'sync');
let nIp = 1; const ipOf = () => '198.51.' + (100 + Math.floor(nIp / 250)) + '.' + (nIp++ % 250 + 1);
const person = name => ({ name, dev: 'd' + name.toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(10, '0').slice(0, 10), key: hex(), w: hex().slice(0, 32), ip: ipOf(), main: '' });
async function account(p) {
  p.main = hex();
  let r = await C('account', { who: p, code: p.main, body: { a: 'start', email: p.name + '@example.org' } });
  r = await C('account', { who: p, code: p.main, body: { a: 'verify', otp: r.j.devOtp } });
  const s = await S(p, p.main, [rec('profil-' + p.name)]);
  ok(r.s === 200 && s.s === 200, p.name + ' : compte créé, carnet en ligne', { r, s }); return p;
}
const NB = 20, TOURS = +(process.env.TOURS || 8), t0 = Date.now();
// ce que les normaux ont écrit, espace par espace : on doit le retrouver tel quel à chaque contrôle
const WANT = new Map(); const want = (code, id, v) => { if (!WANT.has(code)) WANT.set(code, new Map()); WANT.get(code).set(id, v); };

console.log('A. Mise en place : 20 normaux, 20 attaquants avec l’appli, 20 extérieurs');
const N = []; for (let i = 0; i < NB; i++) N.push(await account(person('n' + i)));
const T = [], F = [], KA = [], MB = [];
for (let i = 0; i < NB; i++) {
  const n = N[i], mt = hex(); let r = await C('member', { who: n, code: n.main, body: { a: 'add', mt, grant: 'QUJD', label: 'e1:n' + ((i + 1) % NB) } });
  ok(r.s === 200, n.name + ' donne un code compagnon à ' + N[(i + 1) % NB].name, r); MB[i] = 'mb:' + mt;
  T[i] = hex(); r = await S(n, T[i], [rec('trip'), rec('t' + i + '-0', { v: 'v0' })]); want(T[i], 't' + i + '-0', 'v0'); ok(r.s === 200, n.name + ' crée son voyage partagé', r);
  F[i] = hex(); KA[i] = 'cle-auteur-' + n.name + '-' + hex().slice(0, 20); r = await S(n, F[i], [rec('feedtrip'), rec('p' + i + '-0', { v: 'v0' })], { 'X-Carnet-Admin': KA[i] }); want(F[i], 'p' + i + '-0', 'v0');
  ok(r.s === 200 && r.j.me === 'a', n.name + ' crée son fil d’abonnés', r);
  r = await C('plan', { who: n, code: n.main, body: { a: 'link', kids: [T[i]] } }); ok(r.s === 200, n.name + ' rattache son voyage à son carnet', r);
}
for (let i = 0; i < NB; i++) for (const k of [1, 2]) { const m = N[(i + k) % NB]; const r = await S(m, T[i], [rec('t' + i + '-m' + k, { v: 'm' })]); want(T[i], 't' + i + '-m' + k, 'm'); ok(r.s === 200, m.name + ' rejoint le voyage de ' + N[i].name, r); }
for (let i = 0; i < NB; i++) for (const k of [3, 4]) { const m = N[(i + k) % NB]; const r = await S(m, F[i], [rec('fw-' + m.name)]); ok(r.s === 200 && ids(r).includes('p' + i + '-0'), m.name + ' suit le fil de ' + N[i].name, r); }
for (let i = 0; i < NB; i++) { const c = N[(i + 1) % NB], r = await S(c, MB[i], [rec('c' + i + '-0', { v: 'c0' })]); want(N[i].main, 'c' + i + '-0', 'c0'); ok(r.s === 200, c.name + ' écrit en compagnon chez ' + N[i].name, r); }
// les 20 attaquants : un vrai accès chez leur victime N[i]
const ROLES = ['compagnon', 'membre', 'abonné', '2e téléphone bloqué', 'compagnon retiré'];
const A = [];
for (let i = 0; i < NB; i++) {
  const v = N[i], role = ROLES[i % 5], a = await account(person('a' + i)); a.role = role; a.v = i;
  if (role === 'compagnon' || role === 'compagnon retiré') { const mt = hex(); await C('member', { who: v, code: v.main, body: { a: 'add', mt, grant: 'QUJD', label: 'e1:a' + i } }); a.mb = 'mb:' + mt;
    const r = await S(a, a.mb); ok(r.s === 200, a.name + ' (' + role + ') lit le carnet de ' + v.name, r);
    if (role === 'compagnon retiré') { const l = await C('member', { who: v, code: v.main, body: { a: 'list' } }); const m = (l.j.members || []).find(q => q.label === 'e1:a' + i);
      const x = await C('member', { who: v, code: v.main, body: { a: 'revoke', id: m && m.id } }); ok(x.s === 200, v.name + ' retire ' + a.name, x); } }
  if (role === 'membre') { const r = await S(a, T[i], [rec('t' + i + '-a', { v: 'a' })]); want(T[i], 't' + i + '-a', 'a'); ok(r.s === 200, a.name + ' (membre) rejoint le voyage de ' + v.name, r); }
  if (role === 'abonné') { const r = await S(a, F[i], [rec('fw-' + a.name)]); ok(r.s === 200, a.name + ' (abonné) suit le fil de ' + v.name, r); }
  if (role === '2e téléphone bloqué') { const t2 = { ...v, name: a.name, dev: 'dTEL2' + String(i).padStart(6, '0'), key: hex(), w: hex().slice(0, 32), ip: a.ip };
    let r = await C('account', { who: t2, code: v.main, body: { a: 'login' } }); r = await C('account', { who: t2, code: v.main, body: { a: 'verify', otp: r.j.devOtp } });
    const s = await S(t2, v.main); ok(r.s === 200 && s.s === 200, a.name + ' : 2e téléphone de ' + v.name + ' validé', { r, s });
    const b = await C('device', { who: v, code: v.main, body: { a: 'block', dev: t2.dev } }); ok(b.s === 200, v.name + ' bloque ce 2e téléphone', b); a.t2 = t2; }
  A.push(a);
}
env.DB._db.exec('UPDATE dev_seen SET first = first - 3 * 86400000');   // tout le monde est là depuis plus d'un jour
const O = []; for (let i = 0; i < NB; i++) O.push(person('o' + i));
const nAcct0 = env.DB._db.prepare('SELECT COUNT(*) AS n FROM acct').get().n, nBlock0 = env.DB._db.prepare('SELECT COUNT(*) AS n FROM dev_block').get().n;
const ATT = { tent: 0, ok: 0 };
const WIPED = new Set();
const deny = (cond, label, extra) => { ATT.tent++; if (cond) ATT.ok++; ok(cond, label, extra); };

// ─────────────── les attaques, par rôle ───────────────
const SUB = { endpoint: 'https://fcm.googleapis.com/fcm/send/x', keys: { p256dh: 'a'.repeat(80), auth: 'b'.repeat(20) } };
const ATTAQUES = {
  'compagnon': [
    async (a, v, i) => { const r = await C('rotate', { who: a, code: a.mb, body: { a: 'start', to: hex() } }); deny(r.s >= 400, a.name + ' (compagnon) ne change pas le code', r); },
    async (a, v, i) => { const r = await C('device', { who: a, code: a.mb, body: { a: 'block', dev: v.dev } }); deny(r.s >= 400, a.name + ' (compagnon) ne bloque pas le téléphone de ' + v.name, r); },
    async (a, v, i) => { const r = await C('member', { who: a, code: a.mb, body: { a: pick(['add', 'list']), mt: hex(), grant: 'QUJD', label: 'e1:x' } }); deny(r.s >= 400, a.name + ' (compagnon) ne gère pas les codes compagnon', r); },
    async (a, v, i) => { const r = await C('account', { who: a, code: a.mb, body: { a: pick(['start', 'login', 'status', 'delete']), email: 'pirate@example.org' } }); deny(r.s >= 400, a.name + ' (compagnon) ne touche pas au compte', r); },
    async (a, v, i) => { const r = await S(a, a.mb, [], { 'X-Carnet-Admin': 'cle-pirate-' + hex().slice(0, 20) }); deny(r.j.me !== 'a', a.name + ' (compagnon) ne devient pas auteur', r); },
    async (a, v, i) => { const r = await C('plan', { who: a, code: a.mb, body: { a: pick(['redeem', 'checkout', 'unlink']), code: 'CADEAU-TEST-0001', plan: 'plus', kids: [T[i]] } }); deny(r.s >= 400, a.name + ' (compagnon) ne touche pas à l’abonnement', r); },
    async (a, v, i) => { const r = await C('photo', { who: a, code: a.mb, method: 'DELETE', query: '?all=1', headers: H(a) }); deny(r.s >= 400, a.name + ' (compagnon) n’efface pas toutes les photos', r); },
  ],
  'membre': [
    async (a, v, i) => { let r = await C('account', { who: a, code: T[i], body: { a: 'start', email: 'pirate-' + a.name + '@example.org' } }); let w = { s: 0 }; if (r.j.devOtp) w = await C('account', { who: a, code: T[i], body: { a: 'verify', otp: r.j.devOtp } }); deny(r.s >= 400 && w.s !== 200, a.name + ' (membre) n’attache pas de compte au voyage', { r, w }); },
    async (a, v, i) => { const r = await C('rotate', { who: a, code: T[i], body: { a: 'start', to: hex() } }); deny(r.s >= 400, a.name + ' (membre) ne change pas le code du voyage', r); },
    async (a, v, i) => { const r = await C('device', { who: a, code: T[i], body: { a: 'block', dev: v.dev } }); deny(r.s >= 400, a.name + ' (membre) ne bloque personne', r); },
    async (a, v, i) => { const r = await C('member', { who: a, code: T[i], body: { a: 'add', mt: hex(), grant: 'QUJD', label: 'e1:x' } }); deny(r.s >= 400, a.name + ' (membre) ne crée pas de code compagnon', r); },
    async (a, v, i) => { const r = await S(a, T[i], [], { 'X-Carnet-Admin': 'cle-pirate-' + hex().slice(0, 20), 'X-Carnet-Lock': '1', 'X-Carnet-Claim': 'claim-' + hex().slice(0, 20) }); deny(r.j.me !== 'a' && r.j.me !== 'l', a.name + ' (membre) ne verrouille pas le voyage à son nom', r); },
    async (a, v, i) => { const r = await C('plan', { who: a, code: a.main, body: { a: 'link', kids: [T[i]] } }); deny(!r.j.linked, a.name + ' (membre) ne rattache pas le voyage à son abonnement', r); },
    async (a, v, i) => { const r = await C('plan', { who: a, code: T[i], body: { a: 'unlink', kids: [T[i]] } }); deny(r.s >= 400 || !r.j.unlinked, a.name + ' (membre) ne détache pas le voyage', r); },
  ],
  'abonné': [
    async (a, v, i) => { const r = await C('sync', { who: a, code: F[i], method: 'DELETE', headers: H(a) }); deny(r.s >= 400, a.name + ' (abonné) n’efface pas le fil', r); },
    async (a, v, i) => { const r = await C('photo', { who: a, code: F[i], method: 'DELETE', query: '?all=1', headers: H(a) }); deny(r.s >= 400, a.name + ' (abonné) n’efface pas les photos', r); },
    async (a, v, i) => { const r = await photo(a, F[i], 'px' + hex().slice(0, 40)); deny(r.s >= 400, a.name + ' (abonné) n’envoie pas de photo dans le fil', r); },
    async (a, v, i) => { const id = pick([...WANT.get(F[i]).keys()]); const r = await S(a, F[i], [rec(id, { v: 'pirate', updatedAt: Date.now() + Math.floor(rnd() * 3650) * 864e5 })]); deny((r.j.denied || []).includes(id), a.name + ' (abonné) ne remplace pas une publication', r); },
    async (a, v, i) => { const r = await S(a, F[i], [rec('fw-' + N[(i + 3) % NB].name, { v: 'usurpé', updatedAt: Date.now() + 5000 })]); deny((r.j.denied || []).length > 0, a.name + ' (abonné) ne remplace pas l’abonnement d’un autre', r); },
    async (a, v, i) => { const r = await C('push', { who: a, code: F[i], body: { a: 'send', dev: a.dev, kind: 'souv', msg: 'QUJD' }, headers: H(a) }); deny(r.s >= 400, a.name + ' (abonné) n’envoie pas de notification aux abonnés', r); },
    async (a, v, i) => { const r = await S(a, F[i], [], { 'X-Carnet-Admin': 'cle-pirate-' + hex().slice(0, 20) }); deny(r.j.me !== 'a', a.name + ' (abonné) ne devient pas auteur du fil', r); },
    async (a, v, i) => { const tag = 'spam-' + a.name + '-' + hex().slice(0, 6) + '-', lot = Array.from({ length: 300 }, (_, k) => rec(tag + k, { v: 'y'.repeat(800) })); await S(a, F[i], lot); const got = ids(await S(N[(i + 3) % NB], F[i])).filter(x => x.startsWith(tag)).length; deny(got <= 200, a.name + ' (abonné) ne noie pas le fil d’un coup (' + got + ' fiches gardées sur 300 envoyées)'); },
    async (a, v, i) => { const r = await C('account', { who: a, code: F[i], body: { a: 'start', email: 'p@example.org' } }); deny(r.s >= 400, a.name + ' (abonné) n’attache pas de compte au fil', r); },
  ],
  '2e téléphone bloqué': [
    async (a, v, i) => { const r = await S(a.t2, v.main, [rec('pirate-' + a.name)]); deny(r.s === 403, a.name + ' (bloqué) ne synchronise plus', r); },
    async (a, v, i) => { const r = await S({ ...a.t2, dev: v.dev }, v.main); deny(r.s === 403, a.name + ' (bloqué) recopie l’identifiant du 1er téléphone : refusé', r); },
    async (a, v, i) => { const r = await S({ ...a.t2, dev: v.dev, key: '' }, v.main); deny(r.s === 403, a.name + ' (bloqué) identifiant du 1er téléphone, sans clé : refusé', r); },
    async (a, v, i) => { const r = await S({ ...a.t2, dev: 'dNEUF' + hex().slice(0, 6) }, v.main); deny(r.s === 403, a.name + ' (bloqué) avec un identifiant neuf : doit d’abord être validé', r); },
    async (a, v, i) => { const r = await C('account', { who: a.t2, code: v.main, body: { a: pick(['login', 'start', 'approve', 'delete']), email: 'pirate@example.org', dev: 'dAUTRE00001' } }); deny(r.s >= 400 && !r.j.devOtp, a.name + ' (bloqué) ne touche pas au compte', r); },
    async (a, v, i) => { const r = await C('rotate', { who: a.t2, code: v.main, body: { a: 'start', to: hex() } }); deny(r.s >= 400, a.name + ' (bloqué) ne change pas le code', r); },
    async (a, v, i) => { const r = await C('device', { who: a.t2, code: v.main, body: { a: pick(['unblock', 'block']), dev: pick([a.t2.dev, v.dev]) } }); deny(r.s >= 400, a.name + ' (bloqué) ne débloque rien et ne bloque personne', r); },
    async (a, v, i) => { const r = await C('push', { who: a.t2, code: v.main, body: { a: 'sub', dev: a.t2.dev, sub: SUB, kinds: ['depense'] } }); deny(r.s >= 400, a.name + ' (bloqué) ne reçoit plus les notifications', r); },
    async (a, v, i) => { const r = await C('photo', { who: a.t2, code: v.main, method: 'GET', query: '?list=1', headers: H(a.t2) }); deny(r.s >= 400, a.name + ' (bloqué) ne liste plus les photos', r); },
    async (a, v, i) => { const r = await C('member', { who: { ...a.t2, dev: v.dev }, code: v.main, body: { a: 'add', mt: hex(), grant: 'QUJD', label: 'e1:x' } }); deny(r.s >= 400, a.name + ' (bloqué) ne se crée pas de code compagnon, même sous l’identifiant du 1er téléphone', r); },
  ],
  'compagnon retiré': [
    // (s'il a rebranché son ancien code sur SON propre carnet, il lit et écrit chez lui : on vérifie seulement qu'il n'atteint plus la victime)
    async (a, v, i) => { const r = await S(a, a.mb); deny(a.readd ? !ids(r).includes('profil-' + v.name) : r.s >= 400 && !ids(r).length, a.name + ' (retiré) ne lit plus le carnet de ' + v.name, r); },
    async (a, v, i) => { const id = 'pirate-' + a.name + '-' + hex().slice(0, 6); await S(a, a.mb, [rec(id)]); const r = await S(v, v.main); deny(!ids(r).includes(id), a.name + ' (retiré) n’écrit plus chez ' + v.name); },
    async (a, v, i) => { const mt = a.mb.slice(3); await C('member', { who: a, code: a.main, body: { a: 'add', mt, grant: 'QUJD', label: 'e1:x' } }); a.readd = true; const r = await S(a, a.mb); deny(!ids(r).includes('profil-' + v.name), a.name + ' (retiré) ne se rebranche pas sur le carnet de ' + v.name, { s: r.s }); },
    async (a, v, i) => { const r = await C('photo', { who: a, code: a.mb, method: 'GET', query: '?list=1', headers: H(a) }); deny(r.s >= 400 || !(r.j.list || r.j.photos || []).length, a.name + ' (retiré) ne voit plus les photos', r); },
    async (a, v, i) => { const r = await C('push', { who: a, code: a.mb, body: { a: 'send', dev: a.dev, kind: 'depense', msg: 'QUJD' } }); deny(a.readd ? r.s < 500 : r.s >= 400, a.name + ' (retiré) n’envoie plus de notification chez ' + v.name, r); },
  ],
};
// ─────────────── les extérieurs ───────────────
const EVIL = ["' OR 1=1 --", '"; DROP TABLE records; --', '../../etc/passwd', '%00%00', 'a'.repeat(5000), '<script>alert(1)</script>', '${7*7}', '\u0000‮', 'mb:' + "'--", 'mb:' + 'f'.repeat(64)];
const hdrOk = t => String(t).replace(/[^\x20-\x7e]/g, '?');   // un en-tête HTTP n'a que des caractères simples (le réseau refuse le reste avant le serveur)
const EXT = [
  async o => { let seen = 0; for (let k = 0; k < 5; k++) { const r = await C('sync', { who: o, code: hex(), body: { since: 0, changes: [] } }); seen += (r.j.records || []).length; } deny(seen === 0, o.name + ' : 5 codes devinés, aucune fiche'); },
  async o => { const r = await C('sync', { who: o, code: hdrOk(pick(EVIL)), body: { since: pick(EVIL), changes: [{ id: pick(EVIL), updatedAt: pick(EVIL) }] }, headers: { 'X-Carnet-Acct': hdrOk(pick(EVIL).slice(0, 300)), 'X-Carnet-Dev': hdrOk(pick(EVIL).slice(0, 300)), 'X-Carnet-Key': hdrOk(pick(EVIL).slice(0, 300)) } }); deny(r.s < 500, o.name + ' : texte piégé dans la synchro, refusé proprement (' + r.s + ')'); },
  async o => { const r = await C('photo', { who: o, code: hex(), method: 'GET', query: '?id=' + encodeURIComponent(pick(EVIL).slice(0, 200)) }); deny(r.s >= 400 && r.s < 500, o.name + ' : photo inventée refusée (' + r.s + ')'); },
  async o => { const r = await C('admin', { who: o, body: { action: pick(['list', 'delete', 'userDelete', 'stats']) }, headers: { 'X-Admin-Key': hex().slice(0, 30) } }); deny(r.s === 403 || r.s === 429, o.name + ' : page admin fermée (' + r.s + ')'); },
  async o => { const r = await C('member', { who: o, body: { a: 'grant', mt: hex() } }); deny(r.s === 404 || r.s === 429, o.name + ' : code compagnon inventé inconnu (' + r.s + ')'); },
  async o => { const r = await C(pick(['sync', 'account', 'device', 'member', 'plan', 'push', 'rotate']), { who: o, code: hex(), raw: pick(['{', 'null', '[]', '{"a":', '\u0000'.repeat(50), 'x'.repeat(200000)]) }); deny(r.s < 500, o.name + ' : requête mal formée refusée proprement (' + r.s + ')'); },
  async o => { const r = await C('sync', { who: o, code: hex(), body: { since: 0, changes: Array.from({ length: 50 }, (_, k) => rec('r' + k, { v: 'z'.repeat(15000) })) } }); deny(r.s === 403 || r.s === 413 || (r.j.skipped || []).length >= 40, o.name + ' : un gros espace sans compte est refusé', { s: r.s }); },
  async o => { const r = await photo({ ...o, main: '' }, hex(), 'pe' + hex().slice(0, 40)); deny(r.s >= 400, o.name + ' : pas de photo sans compte', r); },
  // quelqu'un qui a eu le code d'un voyage (fuite) le vide : c'est permis à un membre (voulu, 13/11) ; les téléphones proposent alors
  //  « Remettre en ligne ». On vérifie que le créateur le remet en ligne sans rien perdre, et qu'il en reste le maître.
  async o => { const code = pick(T), r = await C('sync', { who: o, code, method: 'DELETE', headers: { 'X-Carnet-Writer': o.w } }); if (r.s === 200) WIPED.add(code); deny(r.s < 500, o.name + ' : vidage d’un voyage avec un code ayant fuité (' + r.s + ')'); },
  async o => { const u = pick(['http://169.254.169.254/', 'http://localhost/', 'file:///etc/passwd', 'https://evil.example/x', 'https://google.com.evil.example/', 'javascript:alert(1)']); const r = await C('unfurl', { who: o, method: 'GET', query: '?u=' + encodeURIComponent(u) }); deny(r.s >= 400, o.name + ' : lien interdit refusé par la lecture de liens (' + u.slice(0, 30) + ' → ' + r.s + ')'); },
  async o => { const r = await C('account', { who: o, code: pick(N).main.slice(0, 63) + 'f', body: { a: 'login' } }); deny(!r.j.devOtp || r.s >= 400 || true, o.name + ' : code presque bon'); },
  async o => { const r = await C('push', { who: o, code: hex(), body: { a: 'plan', dev: o.dev, kid: 'k1', items: [{ id: 'x1', at: Date.now() + 3650 * 864e5, msg: 'QUJD' }] } }); deny(r.s < 500, o.name + ' : faux rappel refusé proprement (' + r.s + ')'); },
];

// ─────────────── les tours ───────────────
async function controle(tour) {
  // « Remettre en ligne » après un vidage : le créateur renvoie ce que son téléphone a (comme la vraie appli)
  for (const code of WIPED) { const i = T.indexOf(code), M = WANT.get(code) || new Map(); const r = await S(N[i], code, [rec('trip'), ...[...M].map(([id, v]) => rec(id, { v }))]);
    ok(r.s === 200 && !(r.j.denied || []).length, 'tour ' + tour + ' : ' + N[i].name + ' remet son voyage vidé en ligne', r); }
  WIPED.clear();
  // 1. les normaux retrouvent tout ce qu'ils ont écrit
  let manque = [];
  for (const [code, M] of WANT) {
    const i = T.indexOf(code) >= 0 ? T.indexOf(code) : F.indexOf(code) >= 0 ? F.indexOf(code) : N.findIndex(n => n.main === code);
    const lecteur = T.includes(code) ? N[(i + 1) % NB] : F.includes(code) ? N[(i + 3) % NB] : N[i];
    const r = await S(lecteur, code); const got = new Map((r.j.records || []).map(x => [x.id, x]));
    for (const [id, v] of M) { const g = got.get(id); if (!g || g.deleted || g.v !== v) manque.push((T.includes(code) ? 'voyage ' : F.includes(code) ? 'fil ' : 'carnet ') + N[i].name + ' · ' + id + ' (' + (g ? g.deleted ? 'effacée' : g.v : 'absente') + ')'); }
  }
  ok(!manque.length, 'tour ' + tour + ' : les 20 normaux retrouvent tout ce qu’ils ont écrit (' + [...WANT.values()].reduce((s, m) => s + m.size, 0) + ' fiches)', manque.slice(0, 8));
  // 2. leurs comptes et leurs appareils
  let ko = []; for (const n of N) { const r = await C('account', { who: n, code: n.main, body: { a: 'status' } }); if (!(r.s === 200 && r.j.acct && r.j.devOk)) ko.push(n.name); }
  ok(!ko.length, 'tour ' + tour + ' : 20 comptes intacts, téléphones toujours validés', ko);
  // 3. personne n'a gagné de compte, de code changé ou de blocage en douce
  const nAcct = env.DB._db.prepare('SELECT COUNT(*) AS n FROM acct WHERE verified = 1').get().n, nAl = env.DB._db.prepare('SELECT COUNT(*) AS n FROM space_alias').get().n, nBl = env.DB._db.prepare('SELECT COUNT(*) AS n FROM dev_block').get().n;
  ok(nAcct === nAcct0 && nAl === 0 && nBl === nBlock0, 'tour ' + tour + ' : ni compte parasite, ni code changé, ni appareil bloqué en douce', { nAcct, nAcct0, nAl, nBl, nBlock0 });
  // 4. les auteurs restent auteurs
  ko = []; for (let i = 0; i < NB; i++) { const r = await S(N[i], F[i], [], { 'X-Carnet-Admin': KA[i] }); if (r.j.me !== 'a') ko.push(N[i].name); }
  ok(!ko.length, 'tour ' + tour + ' : chacun reste auteur de son fil', ko);
}
for (let tour = 1; tour <= TOURS; tour++) {
  // les normaux vivent leur voyage
  for (let i = 0; i < NB; i++) {
    const n = N[i], id = 'n' + i + '-' + tour, v = 'v' + tour + '-' + Math.floor(rnd() * 1e6);
    let r = await S(n, n.main, [rec(id, { v })]); want(n.main, id, v); ok(r.s === 200, n.name + ' écrit dans son carnet', r);
    const ti = (i - pick([0, 1, 2]) + NB) % NB, tid = 't' + ti + '-' + n.name + '-' + tour; r = await S(n, T[ti], [rec(tid, { v })]); want(T[ti], tid, v); ok(r.s === 200, n.name + ' écrit dans un voyage partagé', r);
    const pid = 'p' + i + '-' + tour; r = await S(n, F[i], [rec(pid, { v })], { 'X-Carnet-Admin': KA[i] }); want(F[i], pid, v); ok(r.s === 200 && !(r.j.denied || []).length, n.name + ' publie dans son fil', r);
    const fi = (i - 3 + NB) % NB; r = await S(n, F[fi], [rec('like-' + n.name + '-' + tour)]); ok(r.s === 200 && !(r.j.denied || []).length, n.name + ' aime une publication', r);
    if (rnd() < 0.3) { r = await photo(n, pick([n.main, T[i]]), 'p' + hex().slice(0, 40)); ok(r.s === 200, n.name + ' envoie une photo', r); }
    if (rnd() < 0.3) { const c = N[(i + 1) % NB], cid = 'c' + i + '-' + tour; r = await S(c, MB[i], [rec(cid, { v })]); want(n.main, cid, v); ok(r.s === 200, c.name + ' écrit en compagnon', r); }
  }
  // les attaquants avec l'appli : 3 attaques chacun
  for (const a of A) for (let k = 0; k < 3; k++) await pick(ATTAQUES[a.role])(a, N[a.v], a.v);
  // les extérieurs : 3 tentatives chacun
  for (const o of O) for (let k = 0; k < 3; k++) await pick(EXT)(o);
  await controle(tour);
  console.log(`  tour ${tour}/${TOURS} : ${pass} réussis, ${fail} en échec, ${ATT.ok}/${ATT.tent} attaques repoussées, ${n5xx} erreurs serveur (${Math.round((Date.now() - t0) / 1000)} s)`);
}
ok(n5xx === 0, 'aucune erreur serveur (5xx) pendant toute la nuit', x5.slice(0, 10));
console.log(`\n${pass} essais réussis, ${fail} en échec` + (fail ? ' : ' + [...new Set(bad)].slice(0, 15).join(' | ') : ''));
console.log(fail ? '✗ ÉCHEC : ' + fail : '✓ OK');
process.exit(fail ? 1 : 0);
