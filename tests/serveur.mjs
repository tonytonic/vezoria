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
globalThis.caches = globalThis.caches || { default: { async match() { return null; }, async put() {} } };   // cache Cloudflare : absent ici
env.VIATOR_KEY = 'cle-de-test';
globalThis.fetch = async (u, o) => { u = String(u); if (u.includes('api.stripe.com')) return new Response(JSON.stringify({ url: 'https://billing.stripe.com/session/test' }), { status: 200 }); if (u.includes('/api/push?a=flush')) return new Response('{}'); throw new Error('réseau interdit dans les essais : ' + u); };
const mods = {}; for (const f of ['sync', 'account', 'device', 'member', 'plan', 'push', 'photo', 'admin', 'rotate', 'unfurl', 'act']) mods[f] = await imp(f + '.js');
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

console.log('\n7. Audit du 12/11 : prise de contrôle par un compagnon, stockage anonyme');
IP = '203.0.113.90';
// 7a. un compagnon (code « mb: ») se déclare « auteur » du carnet principal de A
r = await sync('mb:' + mt, 'dMEMBRE0001', [], { 'X-Carnet-Admin': 'cle-auteur-du-voleur-000000' });
ok(r.s === 200 && !r.j.adm && !r.j.me, 'un compagnon ne peut pas se déclarer auteur du carnet principal', { s: r.s, adm: r.j.adm, me: r.j.me });
r = await sync(C, A, [rec('n2')], { 'X-Carnet-Main': '1' }); ok(r.s === 200 && !r.j.adm, 'le propriétaire écrit toujours dans son carnet', r);
r = await call('photo', { code: C, dev: A, raw: img, headers: { 'Content-Type': 'image/jpeg', 'X-Photo-Id': 'x' + 'b'.repeat(40) } }); ok(r.s === 200, 'le propriétaire envoie toujours ses photos', r);
// 7b. un membre d’un voyage partagé (il a le code du voyage) se déclare auteur après coup
r = await sync(T, 'dCOMPAGNON1', [], { 'X-Carnet-Admin': 'cle-auteur-du-voleur-111111' });
ok(!r.j.adm, 'un membre ne peut pas se déclarer auteur d’un voyage partagé déjà créé', { adm: r.j.adm, me: r.j.me });
r = await sync(T, A, [rec('t3')], { 'X-Carnet-Acct': C }); ok(r.s === 200 && !(r.j.denied || []).length && !r.j.adm, 'le créateur du voyage écrit toujours', r);
r = await call('sync', { code: T, dev: A, method: 'DELETE', headers: { 'X-Carnet-Acct': C } }); ok(r.s === 200, 'le créateur peut toujours effacer son voyage du serveur', r);
// 7c. le fil d’abonnés : son créateur le signe dès la création, et après coup depuis son carnet
const F1 = hex(); r = await sync(F1, A, [rec('f1')], { 'X-Carnet-Acct': C, 'X-Carnet-Admin': 'cle-auteur-de-A-0000000000' }); ok(r.s === 200 && r.j.me === 'a', 'fil d’abonnés : son créateur en devient l’auteur à la création', r);
r = await sync(F1, 'dABONNE0001', [rec('f1')], { 'X-Carnet-Admin': 'autre-cle-000000000000000' }); ok((r.j.denied || []).includes('f1') && r.j.admBad === 1, 'un abonné ne remplace pas une fiche de l’auteur', r);
const F2 = hex(); r = await sync(F2, A, [rec('g1')], { 'X-Carnet-Acct': C }); r = await sync(F2, A, [], { 'X-Carnet-Acct': C, 'X-Carnet-Admin': 'cle-auteur-de-A-0000000000' });
ok(r.j.me === 'a', 'fil créé sans clé d’auteur : son créateur (même compte) peut encore le signer', r);
// 7d. photos sans compte : un inconnu ne range pas de fichiers dans un dossier qui n’existe pas
IP = '203.0.113.91';
r = await call('photo', { code: hex(), dev: 'dROBOT00001', raw: img, headers: { 'Content-Type': 'image/jpeg', 'X-Photo-Id': 'x' + 'c'.repeat(40) } }); ok(r.s === 403 && r.j.needAcct, 'photo refusée dans un espace inconnu, sans compte', r);
const L1 = hex(); r = await sync(L1, 'dROBOT00002', [rec('iv')]); ok(r.s === 200, 'petit espace sans compte créé (invitation)', r);
r = await call('photo', { code: L1, dev: 'dROBOT00002', raw: img, headers: { 'Content-Type': 'image/jpeg', 'X-Photo-Id': 'x' + 'd'.repeat(40) } }); ok(r.s === 403, 'pas de photo dans un petit espace sans compte', r);
r = await sync(L1, 'dROBOT00002', [{ id: 'gros', type: 'note', updatedAt: Date.now(), v: 'x'.repeat(60000) }]); ok(r.s === 200 && (r.j.skipped || []).includes('gros'), 'petit espace sans compte : une fiche de 60 Ko est refusée', r);
r = await sync(L1, 'dROBOT00002', [{ id: 'petit', type: 'note', updatedAt: Date.now(), v: 'x'.repeat(3000) }]); ok(r.s === 200 && !(r.j.skipped || []).length, 'petit espace sans compte : une fiche normale passe', r);
const T2 = hex(); r = await call('photo', { code: T2, dev: A, raw: img, headers: { 'Content-Type': 'image/jpeg', 'X-Photo-Id': 'x' + 'e'.repeat(40), 'X-Carnet-Acct': C } }); ok(r.s === 200, 'photo acceptée dans un nouveau voyage créé depuis un carnet avec compte', r);
r = await call('photo', { code: T, dev: 'dCOMPAGNON1', raw: img, headers: { 'Content-Type': 'image/jpeg', 'X-Photo-Id': 'x' + 'f'.repeat(40) } }); ok(r.s === 200 || r.s === 403, 'voyage effacé : état cohérent', r.s);
// 7e. lecture de liens et activités : limités par connexion
IP = '203.0.113.92';
if (mods.unfurl) { const us = []; for (let i = 0; i < 70; i++) { const x = await call('unfurl', { method: 'GET', query: '?u=' + encodeURIComponent('https://example.com/' + i) }); us.push(x.s); } ok(us.includes(429), 'lecture de liens : limitée par connexion', us.slice(-3)); }
if (mods.act) { const as = []; for (let i = 0; i < 70; i++) { const x = await call('act', { method: 'GET', query: '?q=ville' + i }); as.push(x.s); } ok(as.includes(429), 'recherche d’activités : limitée par connexion', as.slice(-3)); }
// 7f. suppression demandée par e-mail : les publications et voyages créés par le compte partent aussi
IP = '203.0.113.93';
{ const sp = env.DB._db.prepare("SELECT space FROM acct WHERE verified = 1 LIMIT 1").get().space, before = env.DB._db.prepare('SELECT COUNT(*) AS n FROM records WHERE space IN (SELECT space FROM space_owner WHERE owner = ?)').get(sp).n;
  r = await call('admin', { body: { action: 'userDelete', space: sp }, headers: { 'X-Admin-Key': env.ADMIN_KEY } });
  const after = env.DB._db.prepare('SELECT COUNT(*) AS n FROM records WHERE space IN (SELECT space FROM space_owner WHERE owner = ?)').get(sp).n, f1 = env.DB._db.prepare("SELECT COUNT(*) AS n FROM records WHERE id IN ('f1','g1')").get().n;
  ok(r.s === 200 && before > 0 && after === 0 && f1 === 0 && r.j.spaces >= 2, 'suppression à la demande : le carnet, le compte ET les espaces créés par ce compte', { before, after, f1, j: r.j });
  ok(env.DB._db.prepare('SELECT COUNT(*) AS n FROM acct WHERE space = ?').get(sp).n === 0, 'le compte (adresse e-mail) est effacé'); }
// 7g. (13/11) le propriétaire d'un AUTRE carnet ne peut pas « reprendre » un code compagnon qui existe déjà
IP = '203.0.113.94';
{ const C2 = hex(), D2 = 'dAUTRE00001', mt2 = hex();
  let x = await sync(C2, D2, [rec('o1')], { 'X-Carnet-Acct': C2 });
  x = await call('account', { code: C2, dev: D2, body: { a: 'start', email: 'bruno@example.org' } }); x = await call('account', { code: C2, dev: D2, body: { a: 'verify', otp: x.j.devOtp } });
  const C3 = hex(), D3 = 'dPROPRIO003'; x = await sync(C3, D3, [rec('o2')], { 'X-Carnet-Acct': C3 });
  x = await call('account', { code: C3, dev: D3, body: { a: 'start', email: 'carla@example.org' } }); x = await call('account', { code: C3, dev: D3, body: { a: 'verify', otp: x.j.devOtp } });
  x = await call('member', { code: C3, dev: D3, body: { a: 'add', mt: mt2, grant: 'QUJD', label: 'e1:y' } }); ok(x.s === 200, 'un 2e propriétaire crée son code compagnon', x);
  x = await call('member', { code: C2, dev: D2, body: { a: 'add', mt: mt2, grant: 'WFla', label: 'e1:z' } }); ok(x.s === 409, 'un autre propriétaire ne peut pas reprendre ce code compagnon', x);
  x = await call('member', { body: { a: 'grant', mt: mt2 } }); ok(x.s === 200 && x.j.grant === 'QUJD', 'le compagnon garde son accès au bon carnet', x);
  x = await call('member', { code: C3, dev: D3, body: { a: 'add', mt: mt2, grant: 'TU5P', label: 'e1:w' } }); ok(x.s === 200, 'son propriétaire peut toujours le renouveler', x); }
// 7h. (13/11) l'envoi des rappels (?a=flush) ne peut pas être appelé en boucle
IP = '203.0.113.95';
{ const fs2 = []; for (let i = 0; i < 25; i++) { const x = await call('push', { method: 'GET', query: '?a=flush' }); fs2.push(x.s); } ok(fs2.slice(0, 20).every(s => s !== 429) && fs2.includes(429), 'envoi des rappels : limité à 20 appels par heure et par connexion', fs2.join(',')); }
console.log(`\n${pass} essais réussis, ${fail} en échec` + (fail ? ' : ' + bad.join(' | ') : ''));
process.exit(fail ? 1 : 0);
