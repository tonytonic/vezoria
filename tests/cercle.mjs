// Essai « cercle de 10 personnes » : un propriétaire, ses compagnons, les membres d'un voyage partagé,
// ses abonnés, un malveillant dans chaque rôle et un inconnu. Chacun tente toutes les actions réservées
// sur les espaces des autres ; à la fin, les 10 doivent toujours pouvoir faire ce qui leur est permis.
//   node tests/cercle.mjs functions
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
const mods = {}; for (const f of ['sync', 'account', 'device', 'member', 'plan', 'push', 'photo', 'admin', 'rotate']) mods[f] = await imp(f + '.js');
async function call(route, { who, code, body, method = 'POST', headers = {}, query = '', raw } = {}) {
  const h = { 'Content-Type': 'application/json', 'CF-Connecting-IP': (who && who.ip) || '203.0.113.250', ...headers };
  if (code) h['X-Carnet-Code'] = code; if (who && who.dev) h['X-Carnet-Dev'] = who.dev; if (who && who.key) h['X-Carnet-Key'] = who.key;   // 🔐 clé secrète de l'appareil (13/11)
  const req = new Request('https://vezoria.test/api/' + route + query, { method, headers: h, body: method === 'GET' ? undefined : raw || JSON.stringify(body || {}) });
  const fn = mods[route]['onRequest' + method[0] + method.slice(1).toLowerCase()] || mods[route].onRequest;
  const res = await fn({ request: req, env, waitUntil: p => { p && p.catch && p.catch(() => {}); }, params: {} });
  let j = {}; try { j = await res.clone().json(); } catch (e) {}
  return { s: res.status, j };
}
let pass = 0, fail = 0; const bad = [];
const ok = (cond, label, extra) => { if (cond) { pass++; console.log('  ✓', label); } else { fail++; bad.push(label); console.log('  ✗', label, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } };
const hex = () => [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
const rec = (id, extra = {}) => ({ id, type: 'note', updatedAt: Date.now(), v: 'x', ...extra });
// en-têtes qu'envoie la vraie appli : la clé d'écriture de ce téléphone, et l'empreinte de son carnet principal sur les autres espaces
const H = (who, more = {}) => ({ 'X-Carnet-Writer': who.w, ...(who.main ? { 'X-Carnet-Acct': who.main } : {}), ...more });
const sync = (who, code, changes = [], more = {}) => call('sync', { who, code, body: { since: 0, changes }, headers: code === who.main ? { 'X-Carnet-Writer': who.w, 'X-Carnet-Main': '1', ...more } : H(who, more) });
const ids = r => (r.j.records || []).map(x => x.id);
const img = new Uint8Array(2000).fill(7);
const photo = (who, code, id, more = {}) => call('photo', { who, code, raw: img, headers: { 'Content-Type': 'image/jpeg', 'X-Photo-Id': id, ...H(who, more) } });
let nIp = 10;
const person = name => ({ name, dev: 'd' + name.toUpperCase().padEnd(10, '0').slice(0, 10), key: hex(), w: hex().slice(0, 32), ip: '198.51.100.' + (nIp++), main: '' });
async function account(p) {
  p.main = hex();
  let r = await call('account', { who: p, code: p.main, body: { a: 'start', email: p.name + '@example.org' } });
  r = await call('account', { who: p, code: p.main, body: { a: 'verify', otp: r.j.devOtp } });
  const s = await sync(p, p.main, [rec('profil-' + p.name)]);
  ok(r.s === 200 && s.s === 200, p.name + ' : compte créé, carnet en ligne', { r, s });
  return p;
}

// ─────────────────────────────── le cercle ───────────────────────────────
console.log('\nA. Les 10 personnes et leurs espaces');
const anthony = await account(person('anthony'));                    // 1. le propriétaire
const claire = person('claire'), marc = person('marc');              // 2-3. compagnons de tout le carnet (code compagnon) — Marc est malveillant
const victoria = await account(person('victoria'));                  // 4. membre du voyage partagé
const zoe = await account(person('zoe'));                            // 5. membre du voyage partagé, malveillante
const leo = person('leo');                                           // 6. membre du voyage partagé, sans compte
const hugo = await account(person('hugo'));                          // 7. abonné, avec un lien personnel
const ines = person('ines');                                         // 8. abonnée sans compte
const mallory = await account(person('mallory'));                    // 9. abonné malveillant
const eve = await account(person('eve'));                            // 10. inconnue : n'a aucun code
let r, x;
// compagnons de tout le carnet
const mtC = hex(), mtM = hex();
r = await call('member', { who: anthony, code: anthony.main, body: { a: 'add', mt: mtC, grant: 'QUJD', label: 'e1:c' } });
x = await call('member', { who: anthony, code: anthony.main, body: { a: 'add', mt: mtM, grant: 'QUJD', label: 'e1:m' } });
claire.mb = 'mb:' + mtC; marc.mb = 'mb:' + mtM;
ok(r.s === 200 && x.s === 200, 'Anthony donne un code compagnon à Claire et à Marc', { r, x });
r = await sync(claire, claire.mb, [rec('note-claire')]); x = await sync(marc, marc.mb);
ok(r.s === 200 && x.s === 200 && ids(x).includes('note-claire'), 'Claire et Marc lisent et écrivent dans le carnet d’Anthony', { r, x });
// voyage partagé T
const T = hex();
r = await sync(anthony, T, [rec('trip'), rec('visite-1'), rec('depense-1')]);
ok(r.s === 200, 'Anthony crée le voyage partagé', r);
for (const p of [victoria, zoe, leo]) { r = await sync(p, T, [rec('note-' + p.name)]); ok(r.s === 200 && ids(r).includes('trip'), p.name + ' rejoint le voyage partagé', r); }
r = await photo(anthony, T, 'pa' + 'a'.repeat(40)); x = await photo(victoria, T, 'pv' + 'a'.repeat(40));
ok(r.s === 200 && x.s === 200, 'photos d’Anthony et de Victoria dans le voyage', { r, x });
r = await call('plan', { who: anthony, code: anthony.main, body: { a: 'link', kids: [T] } }); ok(r.s === 200, 'le voyage est rattaché au carnet d’Anthony', r);
// fil d'abonnés F (lien public) et lien personnel FP pour Hugo
const F = hex(), FP = hex(), KA = 'cle-auteur-anthony-' + hex().slice(0, 20);
r = await sync(anthony, F, [rec('feedtrip'), rec('post-1'), rec('post-2')], { 'X-Carnet-Admin': KA });
ok(r.s === 200 && r.j.me === 'a', 'Anthony crée son fil d’abonnés (il en est l’auteur)', r);
r = await sync(anthony, FP, [rec('feedtrip'), rec('post-1')], { 'X-Carnet-Admin': KA, 'X-Carnet-Lock': '1', 'X-Carnet-Claim': 'claim-anthony-' + hex().slice(0, 20) });
ok(r.s === 200 && r.j.me === 'a', 'Anthony crée un lien personnel pour Hugo', r);
hugo.claim = 'claim-hugo-' + hex().slice(0, 24); mallory.claim = 'claim-mallory-' + hex().slice(0, 24);
r = await sync(hugo, FP, [], { 'X-Carnet-Claim': hugo.claim }); ok(r.s === 200 && ids(r).includes('post-1'), 'Hugo ouvre son lien personnel', r);
for (const p of [hugo, ines, mallory]) { r = await sync(p, F, [rec('fw-' + p.name)]); ok(r.s === 200 && ids(r).includes('post-1'), p.name + ' suit le fil', r); }
r = await photo(anthony, F, 'pf' + 'a'.repeat(40), { 'X-Carnet-Admin': KA }); ok(r.s === 200, 'photo d’Anthony dans le fil', r);
// boîte d'invitations (petit espace sans compte)
const IB = hex(); r = await call('sync', { who: leo, code: IB, body: { since: 0, changes: [rec('invite-1')] }, headers: { 'X-Carnet-Writer': leo.w } }); ok(r.s === 200, 'une boîte d’invitations existe (petit espace)', r);
// tout le monde est là depuis plus d'un jour (le changement de code demande un appareil connu depuis 24 h)
env.DB._db.exec('UPDATE dev_seen SET first = first - 3 * 86400000');
const count = sp => env.DB._db.prepare('SELECT COUNT(*) AS n FROM records WHERE space = (SELECT space FROM records WHERE id = ? LIMIT 1)').get(sp).n;
const nT0 = count('visite-1'), nF0 = count('post-2');

// ─────────────────────────────── les attaques ───────────────────────────────
// qui tient quel code : Marc → code compagnon ; Zoé → T ; Mallory → F et FP (il a vu passer le lien de Hugo)
console.log('\nB. Prendre un compte sur un espace partagé (voyage, fil, lien personnel, boîte)');
// SAUTE=BC : sauter ces deux attaques, pour voir les suivantes échouer une à une sur un ancien code (sinon le code de l’espace est déjà mort)
const SAUTE = process.env.SAUTE || '';
if (!SAUTE.includes('B')) for (const [p, code, nom] of [[zoe, T, 'le voyage partagé'], [mallory, F, 'le fil d’abonnés'], [mallory, FP, 'le lien personnel'], [eve, IB, 'la boîte d’invitations']]) {
  r = await call('account', { who: p, code, body: { a: 'start', email: 'pirate-' + p.name + '@example.org' } });
  let v = { s: 0, j: {} }; if (r.j.devOtp) v = await call('account', { who: p, code, body: { a: 'verify', otp: r.j.devOtp } });
  ok(r.s >= 400 && v.s !== 200, p.name + ' n’attache pas de compte sur ' + nom, { r, v });
}
r = await sync(anthony, T, [rec('visite-2')]); ok(r.s === 200, 'Anthony n’est pas mis à la porte de son voyage', r);
r = await sync(leo, T); ok(r.s === 200, 'Léo (sans compte) lit toujours le voyage', r);
r = await sync(ines, F); ok(r.s === 200, 'Inès (sans compte) lit toujours le fil', r);

console.log('\nC. Changer le code d’un espace partagé pour en chasser les autres');
if (!SAUTE.includes('C')) for (const [p, code, nom] of [[zoe, T, 'du voyage partagé'], [mallory, F, 'du fil d’abonnés']]) {
  const neu = hex(); r = await call('rotate', { who: p, code, body: { a: 'start', to: neu } });
  let d = { s: 0 }; if (r.s === 200) d = await call('rotate', { who: p, code: neu, body: { a: 'done', old: code } });
  ok(r.s >= 400 && d.s !== 200, p.name + ' ne change pas le code ' + nom, { r, d });
}
r = await sync(victoria, T); ok(r.s === 200 && ids(r).includes('visite-1'), 'le voyage partagé garde son code et ses fiches', r);
r = await sync(hugo, F); ok(r.s === 200 && ids(r).includes('post-2'), 'le fil garde son code et ses publications', r);
r = await call('rotate', { who: marc, code: marc.mb, body: { a: 'start', to: hex() } }); ok(r.s === 403, 'Marc (compagnon) ne change pas le code du carnet d’Anthony', r);

console.log('\nD. Bloquer l’appareil de quelqu’un d’autre');
r = await call('device', { who: zoe, code: T, body: { a: 'block', dev: anthony.dev } }); ok(r.s >= 400, 'Zoé ne bloque pas le téléphone d’Anthony sur le voyage', r);
r = await call('device', { who: mallory, code: F, body: { a: 'block', dev: anthony.dev } }); ok(r.s >= 400, 'Mallory ne bloque pas le téléphone d’Anthony sur son fil', r);
r = await call('device', { who: mallory, code: F, body: { a: 'block', dev: ines.dev } }); ok(r.s >= 400, 'Mallory ne bloque pas le téléphone d’une autre abonnée', r);
r = await call('device', { who: marc, code: marc.mb, body: { a: 'block', dev: anthony.dev } }); ok(r.s === 403, 'Marc ne bloque pas le téléphone d’Anthony', r);
r = await sync(anthony, T); x = await sync(anthony, F, [], { 'X-Carnet-Admin': KA }); ok(r.s === 200 && x.s === 200, 'Anthony synchronise toujours son voyage et son fil', { r, x });

console.log('\nE. Se fabriquer des codes compagnon sur un espace qui n’est pas à soi');
r = await call('member', { who: zoe, code: T, body: { a: 'add', mt: hex(), grant: 'QUJD', label: 'e1:z' } }); ok(r.s >= 400, 'Zoé ne crée pas de code compagnon sur le voyage', r);
r = await call('member', { who: mallory, code: F, body: { a: 'add', mt: hex(), grant: 'QUJD', label: 'e1:z' } }); ok(r.s >= 400, 'Mallory ne crée pas de code compagnon sur le fil', r);
r = await call('member', { who: marc, code: marc.mb, body: { a: 'list' } }); ok(r.s === 403, 'Marc ne liste pas les autres compagnons', r);
r = await call('member', { who: marc, code: marc.mb, body: { a: 'add', mt: hex(), grant: 'QUJD', label: 'e1:z' } }); ok(r.s === 403, 'Marc ne crée pas d’autre code compagnon', r);

console.log('\nF. Devenir « auteur » d’un espace des autres');
r = await sync(marc, marc.mb, [], { 'X-Carnet-Admin': 'cle-pirate-marc-0000000000' }); ok(r.j.me !== 'a', 'Marc ne devient pas auteur du carnet d’Anthony', r);
r = await sync(zoe, T, [], { 'X-Carnet-Admin': 'cle-pirate-zoe-00000000000' }); ok(r.j.me !== 'a', 'Zoé ne devient pas auteure du voyage', r);
r = await sync(mallory, F, [], { 'X-Carnet-Admin': 'cle-pirate-mallory-0000000' }); ok(r.j.me !== 'a', 'Mallory ne devient pas auteur du fil', r);
// vider le voyage puis le recréer à son nom : la manœuvre en trois requêtes
r = await call('sync', { who: zoe, code: T, method: 'DELETE', headers: H(zoe) });
x = await sync(zoe, T, [rec('trip', { v: 'pirate' })], { 'X-Carnet-Admin': 'cle-pirate-zoe-00000000000', 'X-Carnet-Lock': '1', 'X-Carnet-Claim': 'claim-zoe-' + hex().slice(0, 20) });
ok(x.j.me !== 'a', 'Zoé vide le voyage puis le recrée : elle n’en devient pas l’auteure', { r, x });
r = await sync(victoria, T, [rec('note-victoria', { v: 'après' })], { 'X-Carnet-Claim': 'claim-victoria-' + hex().slice(0, 16) }); ok(r.s === 200 && !(r.j.denied || []).length, 'Victoria écrit toujours dans le voyage (ni verrou, ni refus)', r);
r = await sync(leo, T, [rec('note-leo', { v: 'après' })]); ok(r.s === 200 && !(r.j.denied || []).length, 'Léo écrit toujours dans le voyage', r);
r = await sync(anthony, T, [rec('trip'), rec('visite-1'), rec('depense-1'), rec('visite-2')]); ok(r.s === 200 && !(r.j.denied || []).length, 'Anthony remet son voyage en ligne', r);
r = await photo(anthony, T, 'pa' + 'b'.repeat(40)); x = await photo(victoria, T, 'pv' + 'b'.repeat(40)); ok(r.s === 200 && x.s === 200, 'Anthony et Victoria envoient toujours des photos dans le voyage', { r, x });

console.log('\nG. Abonné : effacer, remplacer, noyer le fil');
r = await call('sync', { who: mallory, code: F, method: 'DELETE', headers: H(mallory) }); ok(r.s === 403, 'Mallory n’efface pas le fil', r);
r = await call('photo', { who: mallory, code: F, method: 'DELETE', query: '?all=1', headers: H(mallory) }); ok(r.s === 403, 'Mallory n’efface pas les photos du fil', r);
r = await photo(mallory, F, 'pm' + 'a'.repeat(40)); ok(r.s === 403, 'Mallory n’envoie pas de photo dans le fil', r);
r = await sync(mallory, F, [rec('post-1', { v: 'faux', updatedAt: Date.now() + 5000 })]); ok((r.j.denied || []).includes('post-1'), 'Mallory ne remplace pas une publication d’Anthony', r);
r = await sync(mallory, F, [rec('fw-ines', { v: 'usurpé', updatedAt: Date.now() + 5000 })]); ok((r.j.denied || []).includes('fw-ines'), 'Mallory ne remplace pas l’abonnement d’Inès', r);
r = await call('sync', { who: { ...mallory, w: '' }, code: F, body: { since: 0, changes: [rec('fw-hugo', { v: 'usurpé', updatedAt: Date.now() + 5000 })] }, headers: { 'X-Carnet-Acct': mallory.main } }); ok((r.j.denied || []).includes('fw-hugo'), 'sans clé d’écriture non plus', r);
// réserver d'avance l'identifiant d'une future publication, avec une date dans le futur lointain
r = await sync(mallory, F, [rec('post-3', { v: 'squat', updatedAt: Date.now() + 400 * 864e5 })]);
x = await sync(anthony, F, [rec('post-3', { v: 'vraie publication' })], { 'X-Carnet-Admin': KA });
r = await sync(ines, F); { const p3 = (r.j.records || []).find(q => q.id === 'post-3'); ok(p3 && p3.v === 'vraie publication' && p3._a === 1, 'une publication d’Anthony passe même si un abonné avait réservé son identifiant', p3); }
// grosses fiches et envois en masse par un abonné
r = await sync(mallory, F, [rec('gros-1', { v: 'x'.repeat(60000) })]); ok((r.j.skipped || []).includes('gros-1'), 'une grosse fiche d’abonné est refusée', { s: r.s, sk: r.j.skipped });
{ const lot = []; for (let i = 0; i < 400; i++) lot.push(rec('spam-' + i, { v: 'y'.repeat(900) }));
  r = await sync(mallory, F, lot); const got = ids(await sync(ines, F)).filter(i => i.startsWith('spam-')).length;
  ok(got <= 200, 'un abonné n’ajoute pas des centaines de fiches d’un coup (' + got + ' gardées sur 400)', { s: r.s }); }
r = await sync(hugo, F, [rec('like-hugo-1')]); ok(r.s === 200 && !(r.j.denied || []).length && !(r.j.skipped || []).length, 'Hugo met toujours un ❤️', r);
r = await sync(mallory, FP, [], { 'X-Carnet-Claim': mallory.claim }); ok(r.s === 403 && r.j.claimed, 'Mallory n’ouvre pas le lien personnel de Hugo', r);
r = await sync(mallory, FP, []); ok(r.s === 403, 'ni sans se présenter', r);

console.log('\nH. Date dans le futur : une fiche ne doit pas rester figée');
r = await sync(zoe, T, [rec('depense-1', { v: 'figée', updatedAt: Date.now() + 3650 * 864e5 })]);
x = await sync(anthony, T, [rec('depense-1', { v: 'corrigée', updatedAt: Date.now() + 2000 })]);
r = await sync(victoria, T); { const d = (r.j.records || []).find(q => q.id === 'depense-1'); ok(d && d.v === 'corrigée', 'Anthony corrige une fiche qu’une membre avait datée de dans 10 ans', d); }

console.log('\nI. Abonnement payant, rattachements');
r = await call('plan', { who: zoe, code: zoe.main, body: { a: 'link', kids: [T] } }); ok(r.s === 200 && r.j.taken === 1 && !r.j.linked, 'Zoé ne rattache pas à son abonnement le voyage d’Anthony (même après l’avoir vidé)', r);
r = await call('plan', { who: zoe, code: T, body: { a: 'unlink', kids: [T] } }); ok(r.s >= 400 || !r.j.unlinked, 'Zoé ne détache pas le voyage du carnet d’Anthony', r);
r = await call('plan', { who: marc, code: marc.mb, body: { a: 'redeem', code: 'CADEAU-TEST-0001' } }); ok(r.s === 403, 'Marc n’utilise pas de code cadeau au nom d’Anthony', r);
r = await call('plan', { who: marc, code: marc.mb, body: { a: 'checkout', plan: 'plus' } }); ok(r.s === 403, 'Marc n’ouvre pas de paiement au nom d’Anthony', r);
{ let n429 = 0; for (let i = 0; i < 30; i++) { r = await call('plan', { who: eve, code: eve.main, body: { a: 'checkout', plan: 'plus' } }); if (r.s === 429) n429++; } ok(n429 > 0, 'ouvrir des paiements en boucle est freiné (' + n429 + ' refus sur 30)'); }

// passation : Anthony passe un autre voyage à Victoria (il le détache, elle le rattache)
{ const T2 = hex(); r = await sync(anthony, T2, [rec('trip2')]); await sync(victoria, T2, [rec('note-v')]);
  r = await call('plan', { who: anthony, code: anthony.main, body: { a: 'link', kids: [T2] } });
  x = await call('plan', { who: victoria, code: victoria.main, body: { a: 'link', kids: [T2] } }); ok(x.j.taken === 1, 'Victoria ne rattache pas un voyage qu’Anthony n’a pas passé', x);
  r = await call('plan', { who: anthony, code: anthony.main, body: { a: 'unlink', kids: [T2] } });
  x = await call('plan', { who: victoria, code: victoria.main, body: { a: 'link', kids: [T2] } }); ok(r.s === 200 && x.j.linked === 1, 'Anthony passe le voyage : Victoria le rattache à son carnet', { r, x }); }

console.log('\nJ. Notifications et rappels');
const SUB = { endpoint: 'https://fcm.googleapis.com/fcm/send/x', keys: { p256dh: 'a'.repeat(80), auth: 'b'.repeat(20) } };
r = await call('push', { who: marc, code: marc.mb, body: { a: 'sub', dev: marc.dev, sub: SUB, kinds: ['depense'] } }); ok(r.s === 200, 'Marc (compagnon) reçoit les notifications du carnet : permis', r);
r = await call('push', { who: mallory, code: F, body: { a: 'send', dev: mallory.dev, kind: 'souv', msg: 'QUJD' }, headers: H(mallory) }); ok(r.s === 403, 'Mallory n’envoie pas « nouvelle publication » aux abonnés', r);
r = await call('push', { who: eve, code: hex(), body: { a: 'plan', dev: eve.dev, kid: 'k1', items: [{ id: 'x1', at: Date.now() + 3650 * 864e5, msg: 'QUJD' }] } });
{ const far = env.DB._db.prepare('SELECT COUNT(*) AS n FROM push_due WHERE at > ?').get(Date.now() + 400 * 864e5).n; ok(far === 0, 'pas de rappel gardé pour dans 10 ans', { s: r.s, far }); }
r = await call('push', { who: eve, code: hex(), body: { a: 'plan', dev: eve.dev, kid: 'k1', items: Array.from({ length: 60 }, (_, i) => ({ id: 'y' + i, at: Date.now() + 864e5, msg: 'Q'.repeat(2900) })) } });
{ const big = env.DB._db.prepare("SELECT COALESCE(SUM(LENGTH(msg)), 0) AS b FROM push_due WHERE id LIKE 'y%'").get().b; ok(big < 90000, 'un inconnu ne range pas 170 Ko de faux rappels en une requête (' + big + ' octets gardés)'); }

console.log('\nK. L’inconnue : sans code, rien');
r = await sync(eve, hex().slice(0, 6)); ok(r.s === 400, 'code trop court refusé', r);
r = await call('sync', { who: { ...eve, dev: 'dROBOT00001' }, code: hex(), body: { since: 0, changes: Array.from({ length: 50 }, (_, i) => rec('r' + i, { v: 'z'.repeat(15000) })) }, headers: {} });
ok(r.s === 403 || r.s === 413 || (r.j.skipped || []).length >= 40, 'un inconnu sans compte ne crée pas un gros espace', { s: r.s, sk: (r.j.skipped || []).length });
r = await photo({ ...eve, main: '' }, hex(), 'pe' + 'a'.repeat(40)); ok(r.s === 403, 'ni n’y range de photo', r);
r = await call('sync', { who: eve, code: hex(), body: { since: 0, changes: [rec('a1')] }, headers: { 'X-Carnet-Writer': eve.w, 'X-Carnet-Acct': hex() } }); ok(r.s === 403, 'se réclamer d’un compte qui n’existe pas : refusé', r);
r = await call('admin', { who: eve, body: { action: 'list' }, headers: { 'X-Admin-Key': 'devine' } }); ok(r.s === 403, 'page admin fermée', r);
r = await call('member', { who: eve, body: { a: 'grant', mt: hex() } }); ok(r.s === 404, 'code compagnon inventé : inconnu', r);

console.log('\nL. Trop de données : la base ne se remplit pas sans limite');
{ env.REC_MAX_MB = '3'; let last = { s: 200 }, sent = 0;
  for (let k = 0; k < 12 && last.s === 200; k++) { last = await sync(eve, eve.main, Array.from({ length: 10 }, (_, i) => rec('g' + k + '-' + i, { v: 'q'.repeat(90000) }))); sent++; }
  ok(last.s !== 200, 'un compte ne remplit pas la base sans limite (arrêt après ' + sent + ' envois de 0,9 Mo)', last);
  r = await sync(eve, eve.main); ok(r.s === 200, 'lire reste possible quand la place est pleine', r);
  delete env.REC_MAX_MB; }

// ─────────────────────────────── après les attaques : tout le monde va bien ───────────────────────────────
console.log('\nM. Après tout ça, les 10 font toujours ce qui leur est permis');
r = await call('account', { who: anthony, code: anthony.main, body: { a: 'status' } }); ok(r.s === 200 && r.j.devOk && r.j.acct, 'Anthony : compte intact, appareil validé', r);
r = await sync(anthony, anthony.main, [rec('note-finale')]); ok(r.s === 200 && ids(r).includes('profil-anthony'), 'Anthony : carnet principal', r);
r = await sync(anthony, F, [rec('post-4')], { 'X-Carnet-Admin': KA }); ok(r.s === 200 && r.j.me === 'a', 'Anthony : toujours auteur de son fil', r);
r = await sync(anthony, FP, [rec('post-9')], { 'X-Carnet-Admin': KA }); ok(r.s === 200 && r.j.me === 'a', 'Anthony : toujours auteur du lien personnel', r);
r = await sync(claire, claire.mb, [rec('note-claire-2')]); ok(r.s === 200 && ids(r).includes('note-finale'), 'Claire : lit et écrit dans le carnet', r);
r = await sync(marc, marc.mb); ok(r.s === 200, 'Marc : son accès compagnon normal marche toujours', r);
r = await sync(victoria, T, [rec('note-victoria-2')]); ok(r.s === 200 && ids(r).includes('visite-2'), 'Victoria : voyage partagé', r);
r = await sync(zoe, T); ok(r.s === 200, 'Zoé : son accès normal au voyage marche toujours', r);
r = await sync(leo, T, [rec('note-leo-2')]); ok(r.s === 200, 'Léo : voyage partagé', r);
r = await sync(hugo, FP, [rec('like-hugo-2')], { 'X-Carnet-Claim': hugo.claim }); ok(r.s === 200 && ids(r).includes('post-9'), 'Hugo : son lien personnel', r);
r = await sync(ines, F, [rec('like-ines')]); ok(r.s === 200 && ['post-1', 'post-2', 'post-3', 'post-4'].every(i => ids(r).includes(i)), 'Inès : voit les 4 publications d’Anthony', ids(r).filter(i => i.startsWith('post')));
r = await sync(mallory, F); ok(r.s === 200, 'Mallory : son accès normal d’abonné marche toujours', r);
r = await call('photo', { who: ines, code: F, method: 'GET', query: '?id=pf' + 'a'.repeat(40), headers: H(ines) }); ok(r.s === 200, 'Inès : voit la photo du fil', r);
r = await call('photo', { who: leo, code: T, method: 'GET', query: '?id=pa' + 'b'.repeat(40), headers: H(leo) }); ok(r.s === 200, 'Léo : voit la photo du voyage', r);
r = await sync(eve, eve.main); ok(r.s === 200, 'Eve : son propre carnet', r);
{ const own = env.DB._db.prepare('SELECT COUNT(*) AS n FROM acct').get().n; ok(own === 6, 'toujours 6 comptes, aucun compte parasite (' + own + ')'); }
{ const al = env.DB._db.prepare('SELECT COUNT(*) AS n FROM space_alias').get().n; ok(al === 0, 'aucun code changé (' + al + ')'); }
{ let bl = 0; try { bl = env.DB._db.prepare('SELECT COUNT(*) AS n FROM dev_block').get().n; } catch (e) {} ok(bl === 0, 'aucun appareil bloqué (' + bl + ')'); }

// ─────────────────────────────── retrait, blocage, inconnu sans appli ───────────────────────────────
console.log('\nN. Compagnon retiré : son ancien code ne sert plus à rien');
r = await call('member', { who: anthony, code: anthony.main, body: { a: 'list' } });
{ const m = (r.j.members || []).find(q => q.label === 'e1:m'); x = await call('member', { who: anthony, code: anthony.main, body: { a: 'revoke', id: m && m.id } }); ok(x.s === 200 && x.j.removed === 1, 'Anthony retire Marc', { r, x }); }
r = await sync(marc, marc.mb); ok(r.s >= 400, 'Marc ne lit plus le carnet', r);
r = await sync(marc, marc.mb, [rec('note-marc-après')]); ok(r.s >= 400, 'Marc n’y écrit plus', r);
r = await call('photo', { who: marc, code: marc.mb, method: 'GET', query: '?list=1', headers: H(marc) }); ok(r.s >= 400, 'Marc ne liste plus les photos', r);
r = await call('push', { who: marc, code: marc.mb, body: { a: 'send', dev: marc.dev, kind: 'depense', msg: 'QUJD' } }); ok(r.s >= 400, 'Marc n’envoie plus de notification', r);
r = await call('member', { who: marc, body: { a: 'grant', mt: mtM } }); ok(r.s === 404, 'son code compagnon est inconnu du serveur', r);
r = await call('member', { who: marc, code: marc.main || hex(), body: { a: 'add', mt: mtM, grant: 'QUJD', label: 'e1:m' } }); x = await sync(marc, marc.mb);
ok(x.s >= 400 || !ids(x).includes('profil-anthony'), 'il ne se rebranche pas lui-même sur le carnet d’Anthony', { r, x: { s: x.s, n: ids(x).length } });
r = await sync(claire, claire.mb); ok(r.s === 200 && !ids(r).includes('note-marc-après'), 'Claire, elle, garde son accès', r);

console.log('\nO. 2e téléphone d’Anthony, validé puis bloqué');
const tel2 = { ...anthony, dev: 'dANTHONY2222', key: hex(), w: hex().slice(0, 32), ip: '198.51.100.99' };
r = await sync(tel2, anthony.main); ok(r.s === 403 && (r.j.needVerify || r.j.needAcct), 'un téléphone inconnu qui a le code doit d’abord être validé par e-mail', r);
r = await call('account', { who: tel2, code: anthony.main, body: { a: 'login' } }); x = await call('account', { who: tel2, code: anthony.main, body: { a: 'verify', otp: r.j.devOtp } });
r = await sync(tel2, anthony.main, [rec('note-tel2')]); ok(x.s === 200 && r.s === 200, 'validé par le code reçu par e-mail : il synchronise', { x, r });
r = await call('device', { who: anthony, code: anthony.main, body: { a: 'block', dev: tel2.dev } }); ok(r.s === 200, 'Anthony bloque ce téléphone', r);
r = await sync(tel2, anthony.main); ok(r.s === 403, 'bloqué : il ne lit plus le carnet', r);
r = await sync(tel2, anthony.main, [rec('note-tel2-après')]); ok(r.s === 403, 'bloqué : il n’écrit plus', r);
r = await photo(tel2, anthony.main, 'pb' + 'a'.repeat(40)); ok(r.s === 403, 'bloqué : pas de photo', r);
r = await call('photo', { who: tel2, code: anthony.main, method: 'GET', query: '?list=1', headers: H(tel2) }); ok(r.s === 403, 'bloqué : il ne liste pas les photos', r);
r = await call('device', { who: tel2, code: anthony.main, body: { a: 'unblock', dev: tel2.dev } }); ok(r.s === 403, 'bloqué : il ne se débloque pas lui-même', r);
r = await call('account', { who: tel2, code: anthony.main, body: { a: 'login' } }); ok(r.s === 403 && !r.j.devOtp, 'bloqué : il ne redemande pas de code par e-mail', r);
r = await call('account', { who: tel2, code: anthony.main, body: { a: 'start', email: 'pirate@example.org' } }); ok(r.s === 403, 'bloqué : il ne change pas l’adresse du compte', r);
r = await call('member', { who: tel2, code: anthony.main, body: { a: 'add', mt: hex(), grant: 'QUJD', label: 'e1:x' } }); ok(r.s === 403, 'bloqué : il ne se crée pas de code compagnon', r);
r = await call('rotate', { who: tel2, code: anthony.main, body: { a: 'start', to: hex() } }); ok(r.s === 403, 'bloqué : il ne change pas le code du carnet', r);
r = await call('push', { who: tel2, code: anthony.main, body: { a: 'sub', dev: tel2.dev, sub: SUB, kinds: ['depense'] } }); ok(r.s === 403, 'bloqué : il ne reçoit plus les notifications', r);
r = await sync({ ...tel2, dev: 'dINVENTE0001' }, anthony.main); ok(r.s === 403, 'en changeant d’identifiant d’appareil : toujours refusé (appareil non validé)', r);
r = await sync(anthony, anthony.main); ok(r.s === 200, 'le 1er téléphone d’Anthony marche toujours', r);
// 🔐 (13/11) [A] corrigé : l’identifiant d’un appareil n’est pas un secret, mais sa clé l’est (jamais dans les fiches)
r = await sync({ ...tel2, dev: anthony.dev }, anthony.main); ok(r.s === 403, 'un téléphone bloqué qui envoie l’identifiant du 1er téléphone (sans sa clé) : refusé', r);
r = await sync({ ...tel2, dev: anthony.dev, key: '' }, anthony.main); ok(r.s === 403, '… et sans aucune clé : refusé aussi', r);
r = await call('account', { who: { ...tel2, dev: anthony.dev }, code: anthony.main, body: { a: 'start', email: 'pirate@example.org' } }); ok(r.s === 403, '… il ne change pas l’adresse du compte', r);
r = await sync(anthony, anthony.main); ok(r.s === 200, 'le vrai 1er téléphone, avec sa clé, marche toujours', r);

console.log('\nP. Inconnu sans appli, sans compte, sans aucun code : seulement des requêtes vers le serveur');
const bot = { name: 'bot', dev: '', w: '', ip: '192.0.2.66', main: '' };
for (const [route, method, body, query] of [['sync', 'POST', { since: 0, changes: [] }], ['sync', 'DELETE'], ['photo', 'GET', null, '?list=1'], ['photo', 'DELETE', null, '?all=1'], ['account', 'POST', { a: 'status' }],
  ['device', 'POST', { a: 'list' }], ['member', 'POST', { a: 'list' }], ['rotate', 'POST', { a: 'start', to: hex() }], ['push', 'POST', { a: 'send', kind: 'depense', msg: 'QUJD' }], ['plan', 'POST', { a: 'link', kids: [T] }]]) {
  r = await call(route, { who: bot, method, body: body || {}, query: query || '' }); ok(r.s >= 400 && r.s < 500, 'sans code : ' + method + ' /api/' + route + ' refusé (' + r.s + ')', r);
}
r = await call('photo', { who: bot, raw: img, headers: { 'Content-Type': 'image/jpeg', 'X-Photo-Id': 'pz' + 'a'.repeat(40) } }); ok(r.s >= 400 && r.s < 500, 'sans code : envoi de photo refusé', r);
{ let seen = 0; for (let i = 0; i < 40; i++) { r = await call('sync', { who: bot, code: hex(), body: { since: 0, changes: [] } }); if ((r.j.records || []).length) seen++; } ok(seen === 0, 'deviner des codes au hasard ne donne aucune fiche (40 essais)'); }
r = await call('sync', { who: bot, code: T.slice(0, 63) + (T[63] === 'a' ? 'b' : 'a'), body: { since: 0, changes: [] } }); ok(!(r.j.records || []).length, 'un code presque bon (1 caractère de différence) ne donne rien', r);
for (const evil of ["' OR 1=1 --", '"; DROP TABLE records; --', '../../etc/passwd', '%00%00%00%00%00', 'a'.repeat(5000), '<script>alert(1)</script>']) {
  r = await call('sync', { who: { ...bot, dev: evil.slice(0, 200) }, code: evil, body: { since: evil, changes: [{ id: evil, updatedAt: evil }] }, headers: { 'X-Carnet-Acct': evil.slice(0, 300), 'X-Carnet-Admin': evil.slice(0, 300), 'X-Carnet-Writer': evil.slice(0, 300), 'X-Carnet-Claim': evil.slice(0, 300) } });
  x = await call('photo', { who: bot, code: hex(), method: 'GET', query: '?id=' + encodeURIComponent(evil.slice(0, 300)) });
  ok(r.s < 500 && x.s < 500 && x.s >= 400, 'texte piégé « ' + evil.slice(0, 22) + '… » : refusé proprement, pas d’erreur du serveur (' + r.s + ', ' + x.s + ')');
}
{ const n = env.DB._db.prepare('SELECT COUNT(*) AS n FROM records').get().n; ok(n > 30, 'la base est intacte après les textes piégés (' + n + ' fiches)'); }
r = await call('sync', { who: bot, code: hex(), raw: '{"since":0,"changes":[' }); ok(r.s === 400, 'requête mal formée : refusée (400)', r);
r = await call('sync', { who: bot, code: hex(), raw: '{}', headers: { 'Content-Length': '99999999' } }); ok(r.s === 413 || r.s === 400 || r.s === 403, 'envoi annoncé à 100 Mo : refusé', r);
{ let n429 = 0, last = 0; for (let i = 0; i < 14; i++) { r = await call('admin', { who: bot, body: { action: 'list' }, headers: { 'X-Admin-Key': 'essai-' + i } }); last = r.s; if (r.s === 429) n429++; } ok(n429 > 0 && last !== 200, 'deviner la clé d’administration : bloqué après quelques essais (' + n429 + ' refus « trop d’essais » sur 14)'); }
r = await call('account', { who: { ...bot, dev: 'dBOT00000001' }, code: hex(), body: { a: 'status' } }); ok(r.s === 200 && !r.j.acct && !r.j.mail, 'demander l’état d’un compte au hasard n’apprend rien', r);
r = await call('account', { who: { ...bot, dev: 'dBOT00000001' }, code: hex(), body: { a: 'verify', otp: '123456' } }); ok(r.s >= 400, 'code de vérification inventé : refusé', r);
{ let codes = 0; for (let i = 0; i < 8; i++) { r = await call('account', { who: { ...bot, dev: 'dBOT0000000' + i }, code: anthony.main.slice(0, 60) + 'beef', body: { a: 'start', email: 'anthony@example.org' } }); if (r.s === 200) codes++; } ok(codes <= 4, 'faire envoyer des e-mails en boucle à l’adresse de quelqu’un : freiné (' + codes + ' envois sur 8)'); }
{ const before = env.DB._db.prepare('SELECT COUNT(*) AS n FROM push_due').get().n; for (let i = 0; i < 200; i++) await call('push', { who: bot, code: hex(), body: { a: 'plan', dev: 'dBOT' + i, kid: 'k', items: [{ id: 'z' + i, at: Date.now() + 864e5, msg: 'QUJD' }] } });
  const after = env.DB._db.prepare('SELECT COUNT(*) AS n FROM push_due').get().n; ok(after - before <= 150, 'ranger de faux rappels en boucle : limité par connexion (' + (after - before) + ' gardés sur 200)'); }
r = await call('sync', { who: anthony, code: anthony.main }); x = await sync(ines, F); ok(r.s === 200 && x.s === 200, 'après l’inconnu : Anthony et Inès synchronisent toujours', { r: r.s, x: x.s });

console.log(`\n${pass} essais réussis, ${fail} en échec` + (fail ? ' :\n  - ' + bad.join('\n  - ') : ''));
console.log(fail ? '✗ ÉCHEC' : '✓ OK');
process.exit(fail ? 1 : 0);
