/**
 * Vezoria — notifications (Web Push), sans service payant : Cloudflare Pages Function + D1.
 *
 * Le serveur ne lit jamais le contenu : chaque téléphone chiffre le texte de la notification avec la clé
 * du voyage (ou sa propre clé pour ses rappels) ; le serveur ne fait que le transmettre. Seule la
 * catégorie (dépense, réservation, souvenir…) passe en clair, pour respecter les choix de chacun.
 *
 * POST /api/push  (en-tête X-Carnet-Code : même empreinte que la synchro)
 *   {a:'key'}                                → {pub}                 clé publique VAPID (créée au 1er appel)
 *   {a:'sub', dev, sub, kinds, tz, quiet}    → abonne ce téléphone à cet espace (kinds = catégories voulues)
 *   {a:'unsub', dev}                         → désabonne ce téléphone de cet espace
 *   {a:'send', dev, kind, kid, msg, tag}     → envoie aux AUTRES téléphones de l’espace qui veulent « kind »
 *   {a:'plan', dev, kid, items:[{id,at,msg}]}→ remplace les rappels programmés de ce téléphone
 * GET  /api/push?a=key                      → {pub}
 * GET  /api/push?a=flush                    → envoie les rappels arrivés à l’heure (appelé par la synchro,
 *                                              ou toutes les 10 min par un « cron » facultatif, voir README)
 * Tables créées automatiquement : push_keys, push_subs, push_due.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Carnet-Code',
  'Access-Control-Max-Age': '86400',
};
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });
const KINDS = ['depense', 'resa', 'souv', 'sondage', 'notes', 'rappel', 'social'];
const MAX_PER_HOUR = 60;        // par espace : un garde-fou contre les envois en boucle
const te = new TextEncoder();

// ── petits outils ──
const b64u = u8 => { let s = ''; u8 = new Uint8Array(u8); for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = s => { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
const cat = (...a) => { const n = a.reduce((s, x) => s + x.length, 0), o = new Uint8Array(n); let p = 0; a.forEach(x => { o.set(x, p); p += x.length; }); return o; };
async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', te.encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function tables(db) {
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS push_keys (id INTEGER PRIMARY KEY, pub TEXT NOT NULL, jwk TEXT NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS push_subs (space TEXT NOT NULL, dev TEXT NOT NULL, endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, kinds TEXT NOT NULL, tz TEXT, quiet INTEGER, updated INTEGER, PRIMARY KEY (space, dev))'),
    db.prepare('CREATE TABLE IF NOT EXISTS push_due (space TEXT NOT NULL, dev TEXT NOT NULL, id TEXT NOT NULL, at INTEGER NOT NULL, kid TEXT, msg TEXT NOT NULL, PRIMARY KEY (space, dev, id))'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_push_due_at ON push_due (at)'),
    db.prepare('CREATE TABLE IF NOT EXISTS push_rate (space TEXT PRIMARY KEY, hour INTEGER NOT NULL, n INTEGER NOT NULL)'),
  ]);
}

// Clé VAPID du serveur : créée une seule fois, gardée dans D1 (aucun réglage à faire)
let vapidMem = null;
async function vapid(db) {
  if (vapidMem) return vapidMem;
  let row = await db.prepare('SELECT pub, jwk FROM push_keys WHERE id = 1').first();
  if (!row) {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const pub = b64u(await crypto.subtle.exportKey('raw', kp.publicKey));
    const jwk = JSON.stringify(await crypto.subtle.exportKey('jwk', kp.privateKey));
    await db.prepare('INSERT OR IGNORE INTO push_keys (id, pub, jwk) VALUES (1, ?1, ?2)').bind(pub, jwk).run();
    row = await db.prepare('SELECT pub, jwk FROM push_keys WHERE id = 1').first();
  }
  const priv = await crypto.subtle.importKey('jwk', JSON.parse(row.jwk), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  return (vapidMem = { pub: row.pub, priv });
}

/* Chiffrement du message pour le service de notification (RFC 8291, « aes128gcm ») */
async function encrypt(sub, plain) {
  const ua = unb64u(sub.p256dh), authSecret = unb64u(sub.auth);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const prkKey = await hmac(authSecret, ecdh);
  const ikm = await hmac(prkKey, cat(te.encode('WebPush: info\0'), ua, asPub, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(te.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(te.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(plain, new Uint8Array([2]))));
  const head = new Uint8Array(21); head.set(salt); new DataView(head.buffer).setUint32(16, 4096); head[20] = asPub.length;
  return cat(head, asPub, ct);
}
async function vapidAuth(env, endpoint, v) {
  const aud = new URL(endpoint).origin, contact = String(env.CONTACT || 'appareils.treves6g@icloud.com');
  const h = b64u(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const p = b64u(te.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: /^(mailto:|https:)/.test(contact) ? contact : 'mailto:' + contact })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, v.priv, te.encode(h + '.' + p)));
  return `vapid t=${h}.${p}.${b64u(sig)}, k=${v.pub}`;
}
// Envoie une notification à un abonnement ; renvoie le code HTTP (404/410 = abonnement périmé)
async function sendOne(env, v, sub, payload, ttl) {
  const body = await encrypt(sub, te.encode(JSON.stringify(payload)));
  const r = await fetch(sub.endpoint, { method: 'POST', body, headers: {
    'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: String(ttl || 86400), Urgency: 'high',
    Authorization: await vapidAuth(env, sub.endpoint, v) } });
  return r.status;
}

// heure locale de l’abonné (pour « ne pas déranger la nuit », 22 h – 8 h)
function nightAt(tz) {
  try { const h = +new Intl.DateTimeFormat('en-GB', { timeZone: tz || 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(new Date()); return h >= 22 || h < 8; } catch (e) { return false; }
}
async function rateOk(db, space) {
  const hour = Math.floor(Date.now() / 3600e3);
  const r = await db.prepare('SELECT hour, n FROM push_rate WHERE space = ?1').bind(space).first();
  if (r && r.hour === hour && r.n >= MAX_PER_HOUR) return false;
  await db.prepare('INSERT INTO push_rate (space, hour, n) VALUES (?1, ?2, 1) ON CONFLICT (space) DO UPDATE SET n = CASE WHEN push_rate.hour = ?2 THEN push_rate.n + 1 ELSE 1 END, hour = ?2').bind(space, hour).run();
  return true;
}
async function dropSub(db, space, dev) {
  await db.batch([db.prepare('DELETE FROM push_subs WHERE space = ?1 AND dev = ?2').bind(space, dev), db.prepare('DELETE FROM push_due WHERE space = ?1 AND dev = ?2').bind(space, dev)]);
}

// Rappels arrivés à l’heure : envoyés puis effacés
async function flush(env) {
  const db = env.DB, now = Date.now();
  const { results } = await db.prepare('SELECT d.space, d.dev, d.id, d.kid, d.msg, s.endpoint, s.p256dh, s.auth, s.kinds FROM push_due d JOIN push_subs s ON s.space = d.space AND s.dev = d.dev WHERE d.at <= ?1 ORDER BY d.at LIMIT 100').bind(now).all();
  let sent = 0;
  if (results && results.length) {
    const v = await vapid(db);
    for (const r of results) {
      await db.prepare('DELETE FROM push_due WHERE space = ?1 AND dev = ?2 AND id = ?3').bind(r.space, r.dev, r.id).run();
      if (!String(r.kinds).split(',').includes('rappel')) continue;
      try { const st = await sendOne(env, v, r, { k: 'rappel', i: r.kid, m: r.msg, t: 'rappel-' + r.id }, 6 * 3600); if (st === 404 || st === 410) await dropSub(db, r.space, r.dev); else sent++; } catch (e) {}
    }
  }
  // rappels orphelins (abonnement disparu) ou très anciens
  await db.prepare('DELETE FROM push_due WHERE at < ?1').bind(now - 2 * 864e5).run();
  return sent;
}

// ── Limite d'envois par connexion (protection contre les robots) ──
// On ne garde qu'une empreinte de l'adresse IP (jamais l'adresse), par heure, effacée après 2 h.
let rateReady = false;
async function rateIp(env, request, bucket, limit, cost = 1) {
  try {
    const ip = request.headers.get('CF-Connecting-IP') || ''; if (!ip || !env.DB) return true;
    const enc = new TextEncoder().encode('vz-ip:' + ip + ':' + bucket);
    const key = [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc))].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
    const hour = Math.floor(Date.now() / 3600e3);
    if (!rateReady) { await env.DB.prepare('CREATE TABLE IF NOT EXISTS rate_ip (k TEXT PRIMARY KEY, hour INTEGER NOT NULL, n INTEGER NOT NULL)').run(); rateReady = true; }
    const r = await env.DB.prepare('SELECT hour, n FROM rate_ip WHERE k = ?1').bind(key).first();
    if (r && r.hour === hour && (cost ? r.n + cost > limit : r.n >= limit)) return false;
    if (!cost) return true;   // simple vérification, sans compter
    await env.DB.prepare('INSERT INTO rate_ip (k, hour, n) VALUES (?1, ?2, ?3) ON CONFLICT (k) DO UPDATE SET n = CASE WHEN rate_ip.hour = ?2 THEN rate_ip.n + ?3 ELSE ?3 END, hour = ?2').bind(key, hour, cost).run();
    if (Math.random() < 0.01) await env.DB.prepare('DELETE FROM rate_ip WHERE hour < ?1').bind(hour - 2).run();
    return true;
  } catch (e) { return true; }   // en cas de souci, on ne bloque jamais un vrai voyageur
}
const TOO_MANY = 'Trop d’envois depuis cette connexion : réessaie dans une heure. — Too many uploads from this connection: try again in an hour.';

async function spaceOf(request, env) {
  const code = (request.headers.get('X-Carnet-Code') || '').trim();
  if (code.length < 8) return json({ error: 'Code trop court' }, 400);
  const space = await sha256('carnet-voyage:' + code);
  try { const b = await env.DB.prepare('SELECT status FROM blocked WHERE space = ?1').bind(space).first(); if (b) return json({ error: 'suspendu', suspended: true }, 423); } catch (e) {}
  return space;
}
const clean = (s, n) => String(s || '').slice(0, n);

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'Base D1 non liée (DB)' }, 500);
  await tables(env.DB);
  const a = new URL(request.url).searchParams.get('a');
  if (a === 'flush') return json({ ok: true, sent: await flush(env) });
  return json({ pub: (await vapid(env.DB)).pub });
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.DB) return json({ error: 'Base D1 non liée (DB)' }, 500);
  await tables(env.DB);
  let b; try { b = await request.json(); } catch (e) { return json({ error: 'Requête illisible' }, 400); }
  if (!(await rateIp(env, request, 'pu', 300))) return json({ error: TOO_MANY, retry: 3600 }, 429);
  if (b.a === 'key') return json({ pub: (await vapid(env.DB)).pub });
  const space = await spaceOf(request, env);
  if (space instanceof Response) return space;
  const db = env.DB, dev = clean(b.dev, 40).replace(/[^a-z0-9]/gi, '');
  if (dev.length < 8) return json({ error: 'dev' }, 400);

  if (b.a === 'sub') {
    const s = b.sub || {}, k = s.keys || {};
    if (!/^https:\/\//.test(s.endpoint || '') || !k.p256dh || !k.auth) return json({ error: 'Abonnement invalide' }, 400);
    const kinds = (Array.isArray(b.kinds) ? b.kinds : []).filter(x => KINDS.includes(x));
    if (!kinds.length) { await dropSub(db, space, dev); return json({ ok: true, off: true }); }
    await db.prepare(`INSERT INTO push_subs (space, dev, endpoint, p256dh, auth, kinds, tz, quiet, updated) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
      ON CONFLICT (space, dev) DO UPDATE SET endpoint = excluded.endpoint, p256dh = excluded.p256dh, auth = excluded.auth, kinds = excluded.kinds, tz = excluded.tz, quiet = excluded.quiet, updated = excluded.updated`)
      .bind(space, dev, clean(s.endpoint, 1000), clean(k.p256dh, 200), clean(k.auth, 100), kinds.join(','), clean(b.tz, 60), b.quiet ? 1 : 0, Date.now()).run();
    return json({ ok: true });
  }
  if (b.a === 'unsub') { await dropSub(db, space, dev); return json({ ok: true }); }

  if (b.a === 'send') {
    const kind = KINDS.includes(b.kind) ? b.kind : null, msg = clean(b.msg, 3000);
    if (!kind || !msg) return json({ error: 'kind/msg' }, 400);
    if (!(await rateOk(db, space))) return json({ ok: false, error: 'trop de notifications' }, 429);
    const { results } = await db.prepare('SELECT dev, endpoint, p256dh, auth, kinds, tz, quiet FROM push_subs WHERE space = ?1 AND dev != ?2').bind(space, dev).all();
    const to = (results || []).filter(r => String(r.kinds).split(',').includes(kind) && !(r.quiet && nightAt(r.tz)));
    if (!to.length) return json({ ok: true, sent: 0 });
    const v = await vapid(db), payload = { k: kind, i: clean(b.kid, 24), m: msg, t: clean(b.tag, 60) };
    const job = Promise.all(to.map(async r => { try { const st = await sendOne(env, v, r, payload); if (st === 404 || st === 410) await dropSub(db, space, r.dev); return st < 300; } catch (e) { return false; } }));
    if (waitUntil) { waitUntil(job); return json({ ok: true, sent: to.length }); }
    const ok = (await job).filter(Boolean).length; return json({ ok: true, sent: ok });
  }

  if (b.a === 'plan') {
    // l’essai part tout de suite à l’heure du serveur (l’horloge du téléphone peut avancer ou retarder)
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 60).map(x => x && /^test-/.test(String(x.id)) ? Object.assign({}, x, { at: Date.now() - 1000 }) : x)
      .filter(x => x && x.id && Number(x.at) > Date.now() - 60e3 && x.msg);
    const st = [db.prepare('DELETE FROM push_due WHERE space = ?1 AND dev = ?2').bind(space, dev)];
    items.forEach(x => st.push(db.prepare('INSERT OR REPLACE INTO push_due (space, dev, id, at, kid, msg) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind(space, dev, clean(x.id, 60), Math.round(Number(x.at)), clean(b.kid, 24), clean(x.msg, 3000))));
    await db.batch(st);
    if (waitUntil) waitUntil(flush(env).catch(() => {}));
    return json({ ok: true, planned: items.length });
  }
  return json({ error: 'action inconnue' }, 400);
}
