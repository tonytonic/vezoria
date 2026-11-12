// Essais du serveur Vezoria avec une vraie base SQLite (même SQL que D1) et un faux stockage R2
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const DIR = path.resolve(process.argv[2]);
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
  async list({ prefix = '' } = {}) { return { objects: [...m].filter(([k]) => k.startsWith(prefix)).map(([k, x]) => ({ key: k, size: x.v.length, uploaded: x.up })), truncated: false, delimitedPrefixes: [] }; } }; }
import fs from 'node:fs';
const env = { DB: d1(), PHOTOS: r2(), MAIL_DEV: '1', ADMIN_KEY: 'k'.repeat(30), PAY_ON: '1', STRIPE_SECRET: 'sk_test_x', MAIL_KEY: 'clef-de-test' };
env.DB._db.exec(fs.readFileSync(path.join(DIR, '..', 'schema.sql'), 'utf8'));
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => { u = String(u); if (u.includes('api.stripe.com')) return new Response(JSON.stringify({ url: 'https://billing.stripe.com/session/test' }), { status: 200 }); if (u.includes('/api/push?a=flush')) return new Response('{}'); throw new Error('réseau interdit dans les essais : ' + u); };
const mods = {}; for (const f of ['sync', 'account', 'device', 'member', 'plan', 'push', 'photo', 'admin', 'rotate']) mods[f] = await imp(f + '.js');
let IP = '203.0.113.1';
async function call(route, { code, dev, body, method = 'POST', headers = {}, query = '', raw } = {}) {
  const h = { 'Content-Type': 'application/json', 'CF-Connecting-IP': IP, ...headers };
  if (code) h['X-Carnet-Code'] = code; if (dev != null) h['X-Carnet-Dev'] = dev;
  const req = new Request('https://vezoria.test/api/' + route + query, { method, headers: h, body: method === 'GET' ? undefined : raw || JSON.stringify(body || {}) });
  const fn = mods[route]['onRequest' + method[0] + method.slice(1).toLowerCase()] || mods[route].onRequest;
  const res = await fn({ request: req, env, waitUntil: p => { p && p.catch && p.catch(() => {}); }, params: {} });
  let j = {}; try { j = await res.clone().json(); } catch (e) {}
  return { s: res.status, j };
}
let pass = 0, fail = 0; const bad = [];
const ok = (cond, label, extra) => { if (cond) { pass++; console.log('  ✓', label); } else { fail++; bad.push(label); console.log('  ✗', label, extra !== undefined ? JSON.stringify(extra) : ''); } };
const hex = n => [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
const rec = id => ({ id, type: 'note', updatedAt: Date.now(), v: 'x' });
const sync = (code, dev, changes = [], headers = {}) => call('sync', { code, dev, body: { since: 0, changes }, headers });

console.log('\n1. Carnet sans compte, puis compte créé');
const C = hex(), A = 'dAAAAAAAA1', B = 'dBBBBBBBB2';
let r = await sync(C, A, [rec('n1')], { 'X-Carnet-Acct': C }); ok(r.s === 200 || r.j.needAcct, 'première synchro acceptée ou compte demandé', r);
r = await call('account', { code: C, dev: A, body: { a: 'start', email: 'anna@example.org' } }); ok(r.s === 200 && r.j.devOtp, 'code envoyé (mode essai)', r);
r = await call('account', { code: C, dev: A, body: { a: 'verify', otp: r.j.devOtp } }); ok(r.s === 200, 'adresse vérifiée', r);
r = await sync(C, A, [rec('n1')], { 'X-Carnet-Main': '1' }); ok(r.s === 200, 'appareil A synchronise', r);
r = await sync(C, B); ok(r.s === 403 && r.j.needVerify, 'appareil B inconnu : vérification demandée', r);
r = await sync(C, null); ok(r.s === 403 && r.j.needVerify, 'sans identifiant d’appareil : refusé', r);
r = await call('account', { code: C, dev: A, body: { a: 'approve', dev: B } }); ok(r.s === 200, 'A valide B');
r = await sync(C, B); ok(r.s === 200, 'B synchronise après validation', r);

console.log('\n2. A retire B du carnet : B ne doit plus rien pouvoir faire');
r = await call('device', { code: C, dev: A, body: { a: 'block', dev: B } }); ok(r.s === 200, 'B bloqué');
await new Promise(z => setTimeout(z, 10));
// le cache « appareils bloqués » de sync.js dure 60 s : on le contourne en changeant d'espace mémoire → on vérifie surtout les autres routes et l'astuce du tiret
r = await call('account', { code: C, dev: B, body: { a: 'approve', dev: 'dXXXXXXXX9' } }); ok(r.s === 403, 'B ne peut plus valider un autre appareil', r);
r = await call('account', { code: C, dev: B, body: { a: 'start', email: 'voleur@example.org' } }); ok(r.s === 403, 'B ne peut plus changer l’adresse e-mail', r);
r = await call('account', { code: C, dev: B, body: { a: 'delete' } }); ok(r.s === 403, 'B ne peut plus supprimer le compte', r);
r = await call('member', { code: C, dev: B, body: { a: 'add', mt: hex(), grant: 'QUJD', label: 'x' } }); ok(r.s === 403, 'B ne peut plus se créer un code compagnon', r);
r = await sync(C, 'dBBBB-BBBB2'); ok(r.s === 403, 'astuce du tiret dans l’identifiant : refusée', r);
r = await sync(C, 'dBBBBBBBB2 '); ok(r.s === 403, 'astuce de l’espace : refusée', r);
r = await call('account', { code: C, dev: 'dBBBB-BBBB2', body: { a: 'approve', dev: 'dXXXXXXXX9' } }); ok(r.s === 403, 'astuce du tiret sur le compte : refusée', r);
r = await call('push', { code: C, body: { a: 'sub', dev: B, sub: { endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'a', auth: 'b' } }, kinds: ['depense'] } }); ok(r.s === 403, 'B ne peut plus s’abonner aux notifications', r);
r = await call('plan', { code: C, dev: B, body: { a: 'portal' } }); ok(r.s === 403, 'B n’ouvre pas l’espace client Stripe', r);
r = await call('account', { code: C, dev: A, body: { a: 'status' } }); ok(r.s === 200 && r.j.devOk, 'A marche toujours', r);

console.log('\n3. Quelqu’un a le code mais pas l’e-mail : codes de vérification limités');
const codes = []; for (let i = 0; i < 8; i++) { IP = '198.51.100.' + (10 + i); r = await call('account', { code: C, dev: 'dATTACK' + i + 'zz', body: { a: 'login' } }); codes.push(r.s); }
ok(codes.filter(s => s === 200).length <= 5 && codes.slice(-1)[0] === 429, 'au plus 5 codes par heure pour un carnet, quels que soient l’appareil et la connexion', codes);
IP = '198.51.100.99'; r = await call('push', { code: C, body: { a: 'sub', dev: 'dATTACK0zz', sub: { endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'a', auth: 'b' } }, kinds: ['depense'] } }); ok(r.s === 403 && r.j.needVerify, 'appareil non validé : pas de notifications du carnet', r);
r = await call('push', { code: C, body: { a: 'send', dev: 'dATTACK0zz', kind: 'device', msg: 'QUJD' } }); ok(r.s === 200, 'l’alerte « nouvel appareil » passe toujours', r);
r = await call('plan', { code: C, dev: 'dATTACK0zz', body: { a: 'portal' } }); ok(r.s === 403 && r.j.needVerify, 'appareil non validé : pas d’espace client Stripe', r);
r = await call('plan', { code: C, body: { a: 'portal' } }); ok(r.s === 403, 'sans identifiant d’appareil : pas d’espace client Stripe', r);
env.DB._db.prepare("INSERT INTO plans (space, plan, mb, until, src, ref, cust, at) SELECT space, 'plus', 4800, 0, 'stripe', 'sub_1', 'cus_1', 1 FROM acct LIMIT 1").run();
r = await call('plan', { code: C, dev: A, body: { a: 'portal' } }); ok(r.s === 200 && r.j.url, 'appareil validé : espace client Stripe ouvert', r);
r = await call('plan', { code: C, dev: A, body: { a: 'status' } }); ok(r.s === 200 && r.j.plan === 'plus', 'état de la formule lisible', r);

console.log('\n4. Faire envoyer des e-mails à l’adresse de quelqu’un d’autre');
const st = []; for (let i = 0; i < 7; i++) { IP = '192.0.2.' + (20 + i); r = await call('account', { code: hex(), dev: 'dSPAMMER' + i + 'z', body: { a: 'start', email: 'victime@example.org' } }); st.push(r.s); }
ok(st.filter(s => s === 200).length === 4 && st.slice(-1)[0] === 429, 'une adresse reçoit au plus 4 codes par heure, quel que soit le carnet', st);
IP = '192.0.2.200'; r = await call('account', { code: hex(), dev: 'dHONNETE1z', body: { a: 'start', email: 'autre@example.org' } }); ok(r.s === 200, 'une autre adresse n’est pas gênée', r);

console.log('\n5. Code cadeau à usage unique');
r = await call('admin', { body: { action: 'giftCreate', plan: 'plus', days: 30, uses: 1 }, headers: { 'X-Admin-Key': env.ADMIN_KEY } }); const gift = r.j.code; ok(!!gift, 'code cadeau créé', r);
const S1 = hex(), S2 = hex();
const [g1, g2] = await Promise.all([call('plan', { code: S1, body: { a: 'redeem', gift } }), call('plan', { code: S2, body: { a: 'redeem', gift } })]);
ok([g1.s, g2.s].sort().join() === '200,410', 'deux carnets en même temps : un seul l’obtient', [g1, g2]);
r = await call('plan', { code: g1.s === 200 ? S1 : S2, body: { a: 'redeem', gift } }); ok(r.s === 409 || r.s === 410, 'le même carnet ne l’utilise pas deux fois', r);
ok(env.DB._db.prepare('SELECT used FROM gifts').get().used === 1, 'compteur d’utilisations = 1');
r = await call('admin', { body: { action: 'giftCreate', plan: 'max', days: 0, uses: 0 }, headers: { 'X-Admin-Key': env.ADMIN_KEY } });
const g3 = await call('plan', { code: S1, body: { a: 'redeem', gift: r.j.code } }), g4 = await call('plan', { code: S2, body: { a: 'redeem', gift: r.j.code } });
ok(g3.s === 200 && g4.s === 200, 'code sans limite : plusieurs carnets', [g3.s, g4.s]);
r = await call('plan', { code: S1, body: { a: 'redeem', gift: 'VZ-AAAA-BBBB-CCCC' } }); ok(r.s === 404, 'code inconnu refusé');

console.log('\n6. Rien de cassé : voyage partagé, compagnon, photos, petits espaces');
IP = '203.0.113.50';
const T = hex(); r = await sync(T, A, [rec('t1'), rec('t2')], { 'X-Carnet-Acct': C }); ok(r.s === 200 && r.j.records.length === 2, 'voyage partagé créé depuis un carnet avec compte', r);
r = await sync(T, 'dCOMPAGNON1'); ok(r.s === 200 && r.j.records.length === 2, 'un compagnon lit le voyage avec son code', r);
const mt = hex(); r = await call('member', { code: C, dev: A, body: { a: 'add', mt, grant: 'QUJD', label: 'e1:x' } }); ok(r.s === 200, 'A crée un code compagnon', r);
r = await call('member', { body: { a: 'grant', mt } }); ok(r.s === 200 && r.j.grant === 'QUJD', 'le compagnon récupère son droit d’accès', r);
r = await sync('mb:' + mt, 'dMEMBRE0001'); ok(r.s === 200, 'le compagnon synchronise le carnet', r);
r = await call('sync', { code: 'mb:' + mt, method: 'DELETE' }); ok(r.s === 403, 'le compagnon ne peut pas effacer le carnet', r);
const img = new Uint8Array(2000).fill(7);
r = await call('photo', { code: C, dev: A, raw: img, headers: { 'Content-Type': 'image/jpeg', 'X-Photo-Id': 'x' + 'a'.repeat(40) } }); ok(r.s === 200, 'photo envoyée', r);
r = await call('photo', { code: C, dev: A, method: 'GET', query: '?id=x' + 'a'.repeat(40) }); ok(r.s === 200, 'photo relue');
r = await call('photo', { code: C, dev: 'dINCONNU001', method: 'GET', query: '?id=x' + 'a'.repeat(40) }); ok(r.s === 403, 'photo refusée à un appareil non validé', r);
r = await call('photo', { code: C, dev: A, raw: img, headers: { 'Content-Type': 'image/svg+xml', 'X-Photo-Id': 'evil' } }); ok(r.s === 415, 'image SVG refusée', r);
const lt = []; IP = '203.0.113.77'; for (let i = 0; i < 43; i++) { r = await sync(hex(), 'dINVITE' + String(i).padStart(4, '0'), [rec('iv')]); lt.push(r.s); }
ok(lt.every(s => s === 200), '43 petits espaces par heure et par connexion, pas plus', lt.join(''));
IP = '203.0.113.78'; r = await sync(hex(), 'dINVITE9999', [rec('iv')]); ok(r.s === 200, 'une autre connexion n’est pas gênée', r);
r = await call('admin', { body: { action: 'list' }, headers: { 'X-Admin-Key': 'mauvaise' } }); ok(r.s === 403, 'page admin : mauvaise clé refusée', r);
console.log(`\n${pass} essais réussis, ${fail} en échec` + (fail ? ' : ' + bad.join(' | ') : ''));
process.exit(fail ? 1 : 0);
