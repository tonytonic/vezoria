// 🧭 Contrôle par FAMILLES DE FAILLES CONNUES (14/11/2026) : OWASP Top 10 2025, OWASP API 2023, OWASP Mobile 2024, CWE Top 25 2025, menaces MDN d’une appli web installée,
//   et la fuite Polarsteps (sept. 2026). Une partie lit le code, une partie attaque le serveur (même banc que serveur.mjs).
//   node tests/familles.mjs functions
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
const mods = {}; for (const f of ['sync', 'account', 'device', 'member', 'plan', 'push', 'photo', 'admin', 'rotate', 'unfurl', 'act', 'installs', 'stats', 'err']) mods[f] = await imp(f + '.js');
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
const ROOT = path.join(DIR, '..'), PUB = path.join(ROOT, 'public');
const read = f => fs.readFileSync(f, 'utf8');
const ls = (d, re) => fs.readdirSync(d).filter(f => re.test(f)).map(f => path.join(d, f));
const API = ls(path.join(DIR, 'api'), /\.js$/), APP = ls(path.join(PUB, 'assets'), /^app-\d\.js$/);
const RESP = [];   // toutes les réponses du serveur, relues à la fin (erreurs bavardes, champs secrets)
const call2 = async (route, o) => { const r = await call(route, o); RESP.push([route, r]); return r; };

console.log('\nA. Lecture du code');
// OWASP A05 / CWE-89 : le SQL n’est jamais fabriqué avec un texte venu de l’extérieur
{ const bad = []; for (const f of API) read(f).split('\n').forEach((l, i) => {
    const m = l.match(/prepare\((`[^`]*`|'[^']*'\s*\+[^)]*|"[^"]*"\s*\+[^)]*)/); if (!m) return;
    const s = m[1]; if (!/\$\{|'\s*\+|"\s*\+/.test(s)) return;
    // seuls morceaux permis : un nom de table pris dans une liste écrite dans le code, ou des « ?2, ?3… » fabriqués
    const ok1 = /\$\{t\}|' \+ t \+ '/.test(s) && /for \(const t of \[|\['[a-z_]+'(, '[a-z_]+')*\]\.map\(t =>/.test(l);
    const ok2 = /map\(\(_, j\) => '\?' \+ \(j \+ 2\)\)/.test(l);
    if (!ok1 && !ok2) bad.push(path.basename(f) + ':' + (i + 1)); });
  ok(!bad.length, 'SQL : aucune requête fabriquée avec un texte venu de l’extérieur (CWE-89)', bad); }
// CWE-94 : jamais de code fabriqué à la volée
{ const bad = []; for (const f of [...API, ...APP, path.join(PUB, 'sw.js')]) { const t = read(f); if (/\beval\(|new Function\(|setTimeout\(\s*['"`]|setInterval\(\s*['"`]/.test(t)) bad.push(path.basename(f)); }
  ok(!bad.length, 'aucun eval / new Function / minuterie en texte (CWE-94)', bad); }
// OWASP A04 / CWE-338 : codes et clés tirés avec le vrai hasard
{ const t = APP.map(read).join('\n'); const gc = (t.match(/function genCode\(\)\{[\s\S]{0,400}/) || [''])[0], dk = (t.match(/const devKey = \(\) => [\s\S]{0,500}/) || [''])[0];
  ok(/crypto\.getRandomValues/.test(gc) && !/Math\.random/.test(gc), 'les codes de carnet sont tirés avec crypto.getRandomValues (CWE-338)');
  ok(/crypto\.getRandomValues/.test(dk) && !/Math\.random/.test(dk), 'la clé secrète d’appareil est tirée avec crypto.getRandomValues', dk.slice(0, 120)); }
// OWASP A02 : en-têtes de sécurité
{ const h = read(path.join(PUB, '_headers'));
  for (const [re, lab] of [[/Content-Security-Policy:.*default-src 'self'/, 'politique de contenu (CSP)'], [/Strict-Transport-Security: max-age=\d{7,}/, 'HTTPS obligatoire (HSTS)'], [/X-Frame-Options: DENY|frame-ancestors 'none'/, 'pas d’affichage dans le cadre d’un autre site (clickjacking)'],
    [/X-Content-Type-Options: nosniff/, 'pas de devinette de type (nosniff)'], [/Referrer-Policy: (strict-origin|no-referrer|same-origin)/, 'adresse complète jamais envoyée aux autres sites (Referrer-Policy)'], [/object-src 'none'/, 'aucun plugin (object-src none)'], [/base-uri 'self'|base-uri 'none'/, '« base » verrouillée (base-uri)']])
    ok(re.test(h), 'en-tête : ' + lab); }
// OWASP A03 / Mobile M2 : bibliothèques externes en version fixée
{ const ext = []; for (const f of APP) for (const m of read(f).matchAll(/https:\/\/(?:cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com)\/[^'"`\s)]+/g)) ext.push(m[0]);
  const loose = ext.filter(u => !/@v?\d+\.\d+(\.\d+)?\//.test(u)); ok(!loose.length, 'bibliothèques en ligne : toujours une version fixée (' + ext.length + ' adresses)', loose); }
// Mobile M1 / A04 : aucun secret dans ce qui part chez les utilisateurs
{ const bad = []; const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const p = path.join(d, e.name); if (e.isDirectory()) { if (!/vendor|music|lang|img|icons?/.test(e.name)) walk(p); } else if (/\.(js|html|json|txt)$/.test(e.name)) { const t = read(p);
    if (/sk_live_[0-9A-Za-z]{10}|rk_live_|-----BEGIN [A-Z ]*PRIVATE KEY|AKIA[0-9A-Z]{16}|"private_key"\s*:|whsec_[0-9A-Za-z]{10}/.test(t)) bad.push(path.relative(ROOT, p)); } }); walk(PUB);
  ok(!bad.length, 'aucun secret (clé Stripe, clé privée, compte Google…) dans les fichiers publics', bad); }
// MDN T6 : le service worker ne charge rien d’ailleurs et ne garde que ce qui vient du site
{ const t = read(path.join(PUB, 'sw.js')); ok(!/importScripts\(\s*['"]https?:/.test(t), 'service worker : aucun script chargé depuis un autre site'); }
// MDN T5 : les messages entre fenêtres viennent bien de chez nous
{ const bad = []; for (const f of APP) { const t = read(f); for (const m of t.matchAll(/window\.addEventListener\(\s*['"]message['"][\s\S]{0,300}/g)) if (!/origin/.test(m[0])) bad.push(path.basename(f)); }
  ok(!bad.length, 'messages entre fenêtres : l’expéditeur est toujours vérifié', bad); }

console.log('\nB. Attaques sur le serveur');
// API2 / A07 : CSRF — un autre site ne peut rien faire « à ta place » : le code n’est lu que dans un en-tête, jamais dans le corps ni l’adresse
IP = '203.0.113.150';
const C = hex(), D1 = 'dFAMILLE001';
let r = await call2('sync', { code: C, dev: D1, body: { since: 0, changes: [rec('f1')] } }); ok(r.s === 200, 'préparation : carnet créé', r);
{ const req = new Request('https://vezoria.test/api/sync', { method: 'POST', headers: { 'Content-Type': 'text/plain', 'CF-Connecting-IP': IP }, body: JSON.stringify({ code: C, since: 0, changes: [rec('pirate')] }) });
  const res = await mods.sync.onRequestPost({ request: req, env, waitUntil: () => {}, params: {} }); const back = await sync(C, D1);
  ok(res.status >= 400 && !(back.j.records || []).some(x => x.id === 'pirate'), 'CSRF : un formulaire d’un autre site (code dans le corps, sans en-tête) ne change rien', { s: res.status }); }
{ const res = await call2('sync', { dev: D1, body: { since: 0 }, query: '?code=' + C }); ok(res.s >= 400 && !(res.j.records || []).length, 'le code dans l’adresse (?code=) n’est jamais accepté (il fuirait dans les journaux)', res.s); }
// CWE-22 : chemins piégés dans les identifiants de photo et de fiche
IP = '203.0.113.151';
{ const img = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]); const bad = [];
  for (const id of ['../x', '..%2Fx', 'a/../../b', '/etc/passwd', 'x\\..\\y', 'x\u0000y', '%2e%2e', 'a'.repeat(300), '']) { const hdrOk = !/[\u0000-\u001f]/.test(id);
    const p = hdrOk ? await call2('photo', { code: C, dev: D1, raw: img, headers: { 'Content-Type': 'image/jpeg', 'X-Photo-Id': id } }).catch(e => ({ s: 'plantage' })) : { s: 400 };   // un en-tête ne peut pas porter \0 : le navigateur refuse lui-même
    if (p.s === 200 || p.s >= 500 || p.s === 'plantage') bad.push('envoi ' + JSON.stringify(id) + ' → ' + p.s);
    const g = await call2('photo', { code: C, dev: D1, method: 'GET', query: '?id=' + encodeURIComponent(id) }).catch(e => ({ s: 'plantage' }));
    if (g.s === 200 || g.s >= 500 || g.s === 'plantage') bad.push('lecture ' + JSON.stringify(id) + ' → ' + g.s); }
  ok(!bad.length, 'photo : identifiants piégés (../, /etc/passwd, \\0…) refusés, jamais d’erreur serveur (CWE-22)', bad); }
{ const ids = ['../x', '<img>', '"q"', 'a'.repeat(500), '__proto__', 'constructor']; const res = await call2('sync', { code: C, dev: D1, body: { since: 0, changes: ids.map(id => ({ id, type: 'note', updatedAt: Date.now() })) } });
  const back = await sync(C, D1); const got = (back.j.records || []).map(x => x.id).filter(id => ids.includes(id));
  ok(res.s < 500 && !got.some(id => /<|"|__proto__|constructor/.test(id) || id.length > 200), 'fiches : identifiants piégés (<, ", __proto__, constructor, trop longs) jamais gardés par le serveur', { s: res.s, got }); }
// CWE-1321 : pollution du prototype par le corps de requête
{ const raw = '{"since":0,"changes":[],"__proto__":{"admin":true,"plan":"max"},"constructor":{"prototype":{"admin":true}}}';
  const res = await call2('sync', { code: C, dev: D1, raw }); ok(res.s < 500 && ({}).admin === undefined && ({}).plan === undefined, '« __proto__ » dans une requête : aucun effet sur le serveur (pollution de prototype)', res.s); }
// API4 / CWE-770 : énorme envoi
IP = '203.0.113.152';
{ let s; try { s = (await call2('sync', { code: C, dev: D1, raw: JSON.stringify({ since: 0, changes: Array.from({ length: 3000 }, (_, i) => ({ id: 'big' + i, type: 'note', updatedAt: Date.now(), t: 'x'.repeat(2000) })) }) })).s; } catch (e) { s = 'plantage ' + e.message; }
  ok(typeof s === 'number' && s < 500, 'envoi énorme (3 000 fiches, 6 Mo) : refusé ou limité proprement, jamais de plantage', s); }
// API5 / A01 : fonctions réservées
{ const a = await call2('admin', { body: { action: 'list' } }); ok(a.s === 401 || a.s === 403 || a.s === 404, 'administration sans clé : refusée', a.s);
  const b = await call2('admin', { body: { action: 'list' }, headers: { 'X-Admin-Key': 'k'.repeat(29) + 'x' } }); ok(b.s === 401 || b.s === 403 || b.s === 429, 'administration avec une clé presque juste : refusée', b.s);
  const c = await call2('admin', { body: { action: 'list' }, headers: { 'X-Carnet-Admin': 'k'.repeat(30) } }); ok(c.s === 401 || c.s === 403 || c.s === 429, 'administration : la clé dans un autre en-tête ne compte pas', c.s); }
// API6 : abonnement gratuit en se faisant passer pour Stripe ou Google
IP = '203.0.113.153';
{ env.STRIPE_WEBHOOK_SECRET = 'whsec_test_' + 'z'.repeat(20); const space = hex();
  const ev = JSON.stringify({ type: 'checkout.session.completed', data: { object: { mode: 'subscription', metadata: { space, plan: 'max', period: 'year' }, subscription: 'sub_x', customer: 'cus_x' } } });
  const hmac = async (k, m) => [...new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', new TextEncoder().encode(k), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode(m)))].map(b => b.toString(16).padStart(2, '0')).join('');
  const hook = async sig => { const req = new Request('https://vezoria.test/api/plan?stripe=1', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(sig ? { 'Stripe-Signature': sig } : {}) }, body: ev }); const res = await mods.plan.onRequestPost({ request: req, env, waitUntil: () => {}, params: {} }); return res.status; };
  const has = async () => !!(await env.DB.prepare('SELECT plan FROM plans WHERE space = ?1').bind(space).first().catch(() => null));
  const now = Math.floor(Date.now() / 1000);
  ok((await hook(null)) >= 400 && !(await has()), 'faux Stripe sans signature : refusé, aucun abonnement');
  ok((await hook('t=' + now + ',v1=' + 'a'.repeat(64))) >= 400 && !(await has()), 'faux Stripe avec une signature inventée : refusé');
  ok((await hook('t=' + (now - 3600) + ',v1=' + await hmac(env.STRIPE_WEBHOOK_SECRET, (now - 3600) + '.' + ev))) >= 400 && !(await has()), 'vrai message Stripe rejoué une heure plus tard : refusé');
  ok((await hook('t=' + now + ',v1=' + await hmac('whsec_autre', now + '.' + ev))) >= 400 && !(await has()), 'message signé avec une autre clé : refusé');
  ok((await hook('t=' + now + ',v1=' + await hmac(env.STRIPE_WEBHOOK_SECRET, now + '.' + ev))) === 200 && (await has()), 'contrôle : le vrai message Stripe, lui, passe');
  delete env.STRIPE_WEBHOOK_SECRET;
  env.PLAY_SA = '{}'; env.PLAY_RTDN_KEY = 'play-' + 'q'.repeat(24);
  for (const k of ['', 'play-', 'x'.repeat(29)]) { const req = new Request('https://vezoria.test/api/plan?play=1' + (k ? '&k=' + k : ''), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"message":{"data":""}}' });
    const res = await mods.plan.onRequestPost({ request: req, env, waitUntil: () => {}, params: {} }); ok(res.status === 403, 'faux Google Play (clé ' + (k ? 'fausse' : 'absente') + ') : refusé', res.status); }
  delete env.PLAY_SA; delete env.PLAY_RTDN_KEY; }
// API7 / CWE-918 : le lecteur de liens ne va jamais ailleurs que sur les sites prévus
IP = '203.0.113.154';
{ const seen = [], f0 = globalThis.fetch; globalThis.fetch = async (u, o) => { seen.push(String(u)); return new Response('<title>x</title>', { status: 200, headers: { 'Content-Type': 'text/html' } }); };
  const tries = ['http://169.254.169.254/latest/meta-data', 'http://localhost/', 'http://127.0.0.1/', 'http://[::1]/', 'http://10.0.0.1/', 'http://2130706433/', 'http://0x7f000001/', 'file:///etc/passwd', 'gopher://google.com/',
    'https://google.com.evil.example/', 'https://evil.example/google.com', 'https://google.com@169.254.169.254/', 'https://169.254.169.254#google.com', 'https://evilgoogle.com/', 'https://maps.google.com.attacker.io/x', 'https://xn--ggle-0nda.com/'];
  for (const u of tries) { seen.length = 0; const x = await call2('unfurl', { method: 'GET', query: '?u=' + encodeURIComponent(u) });
    ok(x.s < 500 && !seen.length, 'lecteur de liens : « ' + u + ' » jamais visité', { s: x.s, seen }); }
  globalThis.fetch = f0; }
// installs / stats / err : routes publiques, jamais d’erreur serveur avec n’importe quoi
IP = '203.0.113.155';
{ const bad = []; for (const [route, method, query, raw] of [['installs', 'GET', '?svg=1', null], ['installs', 'POST', '', '{"id":{"$ne":1}}'], ['stats', 'GET', '?x=../../', null], ['err', 'POST', '', '{"m":"' + 'x'.repeat(50000) + '"}'], ['err', 'POST', '', 'null'], ['err', 'POST', '', '<script>']]) {
    let s; try { s = (await call2(route, { method, query, raw: raw || undefined, body: raw ? undefined : {} })).s; } catch (e) { s = 'plantage ' + e.message; } if (!(typeof s === 'number' && s < 500)) bad.push(route + ' ' + method + ' → ' + s); }
  ok(!bad.length, 'routes publiques (installations, statistiques, erreurs) : rien ne les fait planter', bad); }

// A07 : deviner le code reçu par e-mail — 5 essais par code, puis il faut en redemander un
IP = '203.0.113.156';
{ const K = hex(), Dv = 'dOTPTEST001'; await sync(K, Dv, [rec('o1')], { 'X-Carnet-Acct': K });
  let r = await call2('account', { code: K, dev: Dv, body: { a: 'start', email: 'otp@example.org' } }); const good = r.j.devOtp; const codes = [];
  for (let i = 0; i < 7; i++) codes.push((await call2('account', { code: K, dev: Dv, body: { a: 'verify', otp: String(100000 + i) === good ? '999999' : String(100000 + i) } })).s);
  const last = await call2('account', { code: K, dev: Dv, body: { a: 'verify', otp: good } });
  ok(codes.slice(5).every(s => s === 429) && last.s === 429, 'code e-mail : après 5 erreurs, même le bon code est refusé (il faut en redemander un)', { codes, last: last.s }); }
// A09 : une attaque se voit — les refus sont comptés par jour et par route, et l’admin les montre
{ const mw = await imp('_middleware.js'); const pend = [];
  for (let i = 0; i < 120; i++) { const st = i < 90 ? 429 : 200; const req = new Request('https://vezoria.test/api/sync', { method: 'POST' });
    await mw.onRequest({ request: req, env, next: async () => new Response('{}', { status: st }), waitUntil: p => pend.push(p), params: {} }); }
  await Promise.all(pend); await mw.onRequest({ request: new Request('https://vezoria.test/api/sync', { method: 'POST' }), env, next: async () => new Response('{}'), waitUntil: p => pend.push(p), params: {} }); await new Promise(r => setTimeout(r, 30)); await Promise.all(pend);
  const a = await call2('admin', { body: { action: 'usage' }, headers: { 'X-Admin-Key': env.ADMIN_KEY } }); const n = (a.j.alerts || []).filter(x => x.k === '429 sync').reduce((t, x) => t + x.n, 0);
  ok(a.s === 200 && n >= 50, 'alertes : les refus (ici 90 « trop de demandes » sur la synchro) apparaissent dans l’admin (OWASP A09)', { s: a.s, n, alerts: a.j.alerts }); }
// client : « __proto__ » comme identifiant de fiche est refusé avant d’entrer dans le carnet
{ const t = read(path.join(PUB, 'assets', 'app-1.js')); ok(/function saneRec[\s\S]{0,300}__proto__\|constructor\|prototype/.test(t), 'appli : une fiche nommée « __proto__ » est refusée (pollution du carnet en mémoire)'); }

console.log('\nC. Ce que le serveur renvoie (relu sur ' + RESP.length + ' réponses)');
// API8 / CWE-209 : jamais de détail interne dans une erreur
{ const bad = RESP.filter(([, x]) => /at [A-Za-z_$.]+ \(|\/functions\/|\.js:\d+|SQLITE_|D1_ERROR|no such table|syntax error/i.test(JSON.stringify(x.j))).map(([r, x]) => r + ' ' + x.s + ' ' + JSON.stringify(x.j).slice(0, 100));
  ok(!bad.length, 'aucune réponse ne montre un détail interne (pile, fichier, SQL) (CWE-209)', bad); }
// API3 / Polarsteps : jamais de champ secret renvoyé
{ const bad = []; const walk = (o, p, r) => { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (/^(kh|otp|otpHash|pwd|password|secret|adminKey|devKey|key_hash|codeHash|email_hash)$/i.test(k)) bad.push(r + ' → ' + p + k); walk(v, p + k + '.', r); } };
  RESP.forEach(([r, x]) => walk(x.j, '', r)); ok(!bad.length, 'aucune réponse ne contient de champ secret (empreinte, code reçu par e-mail, clé…) (API3)', bad); }

console.log(`\n${pass} essais réussis, ${fail} en échec` + (fail ? ' : ' + bad.join(' | ') : ''));
process.exit(fail ? 1 : 0);
