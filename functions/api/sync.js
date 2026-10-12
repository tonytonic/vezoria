/**
 * Carnet de voyage — synchronisation (Cloudflare Pages Function + D1)
 *
 * DELETE /api/sync  (en-tête X-Carnet-Code) : efface tout le carnet du serveur (fiches + photos).
 * Ménage automatique : de temps en temps, les carnets sans aucune activité depuis
 * INACTIVE_DAYS jours (730 par défaut, variable facultative) sont effacés du serveur.
 * Les données restent sur les téléphones.
 *
 * POST /api/sync
 *   En-tête  X-Carnet-Code : code secret du carnet (partagé entre voyageurs)
 *   Corps    { since: <rev>, changes: [fiche, …] }
 *   Réponse  { now: <rev>, records: [fiches modifiées depuis since] }
 *
 * Règle de fusion : par fiche, la modification la plus récente gagne (updatedAt).
 * Variable optionnelle SPACE_CODES = "code1,code2" : n'accepte que ces codes.
 */
const MAX_CHANGES = 1000;
const MAX_RECORD = 100_000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Carnet-Code',
  'Access-Control-Max-Age': '86400',
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
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

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

async function spaceOf(request, env) {
  if (!env.DB) return json({ error: 'Base D1 non liée (binding « DB » manquant)' }, 500);
  const code = (request.headers.get('X-Carnet-Code') || '').trim();
  if (code.length < 8) return json({ error: 'Code du carnet trop court (8 caractères minimum)' }, 400);
  if (env.SPACE_CODES) {
    const allowed = String(env.SPACE_CODES).split(',').map(s => s.trim()).filter(Boolean);
    if (!allowed.includes(code)) return json({ error: 'Code de carnet non autorisé sur ce serveur' }, 403);
  }
  const space = await sha256('carnet-voyage:' + code);
  // carnet suspendu après un signalement (voir admin.js) : plus aucune lecture ni écriture, données conservées
  try {
    const b = await env.DB.prepare('SELECT status FROM blocked WHERE space = ?1').bind(space).first();
    if (b) return json({ error: 'Ce carnet est suspendu à la suite d’un signalement. Pour contester : ' + (env.CONTACT || 'appareils.treves6g@icloud.com') + ' — This notebook is suspended following a report. To contest, write to the address above.', suspended: true }, 423);
  } catch (e) {}   // table pas encore créée : aucun carnet suspendu
  return space;
}

// Efface un carnet : fiches (D1) + photos (R2 et anciennes photos D1) + compteurs
async function wipeSpace(env, space) {
  let photos = 0, freed = 0;
  if (env.PHOTOS) {
    let cursor;
    do {
      const l = await env.PHOTOS.list({ prefix: space + '/', cursor, limit: 1000 });
      const keys = l.objects.map(o => o.key);
      l.objects.forEach(o => { freed += o.size; });
      if (keys.length) await env.PHOTOS.delete(keys);
      photos += keys.length;
      cursor = l.truncated ? l.cursor : undefined;
    } while (cursor);
  }
  const rec = await env.DB.prepare('DELETE FROM records WHERE space = ?1').bind(space).run();
  let d1p = { meta: { changes: 0 } };
  try { d1p = await env.DB.prepare('DELETE FROM photos WHERE space = ?1').bind(space).run(); } catch (e) {}
  try { await env.DB.batch([env.DB.prepare('DELETE FROM push_subs WHERE space = ?1').bind(space), env.DB.prepare('DELETE FROM push_due WHERE space = ?1').bind(space)]); } catch (e) {}   // notifications
  try {
    await env.DB.prepare("UPDATE photo_stats SET v = MAX(0, v - ?1) WHERE k = 'r2'").bind(freed).run();
    await env.DB.prepare('DELETE FROM photo_stats WHERE k = ?1').bind('s:' + space).run();
  } catch (e) {}
  return { records: (rec.meta && rec.meta.changes) || 0, photos: photos + ((d1p.meta && d1p.meta.changes) || 0) };
}

// Ménage occasionnel (≈ 1 requête sur 500) : carnets inactifs depuis longtemps
async function sweepInactive(env) {
  const days = Number(env.INACTIVE_DAYS) || 730;
  const limit = Date.now() - days * 864e5;
  const { results } = await env.DB.prepare('SELECT space FROM records GROUP BY space HAVING MAX(rev) < ?1 LIMIT 3').bind(limit).all();
  for (const r of results || []) await wipeSpace(env, r.space);
  try { await env.DB.prepare('DELETE FROM space_wipes WHERE at < ?1').bind(Date.now() - 730 * 864e5).run(); } catch (e) {}
}

// date du dernier effacement d’un espace : les autres membres en sont prévenus à leur synchro suivante
async function wipeMark(env, space, at) {
  try {
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS space_wipes (space TEXT PRIMARY KEY, at INTEGER NOT NULL)').run();
    await env.DB.prepare('INSERT INTO space_wipes (space, at) VALUES (?1, ?2) ON CONFLICT (space) DO UPDATE SET at = ?2').bind(space, at).run();
  } catch (e) {}
}

export async function onRequestDelete({ request, env }) {
  const space = await spaceOf(request, env);
  if (space instanceof Response) return space;
  const out = await wipeSpace(env, space);
  const at = Date.now(); await wipeMark(env, space, at);
  return json({ ok: true, ...out, at });
}

export async function onRequestPost({ request, env, waitUntil }) {
  const space = await spaceOf(request, env);
  if (space instanceof Response) return space;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Requête illisible' }, 400); }
  const since = Math.max(0, Number(body.since) || 0);
  const changes = Array.isArray(body.changes) ? body.changes.slice(0, MAX_CHANGES) : [];
  if (!(await rateIp(env, request, 'sy', 6000))) return json({ error: TOO_MANY, retry: 3600 }, 429);
  if (changes.length && !(await rateIp(env, request, 'sc', 50000, changes.length))) return json({ error: TOO_MANY, retry: 3600 }, 429);
  const now = Date.now();

  if (changes.length) {
    const stmt = env.DB.prepare(
      `INSERT INTO records (space, id, data, updated_at, rev) VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT (space, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, rev = excluded.rev
       WHERE excluded.updated_at >= records.updated_at`
    );
    const batch = [];
    for (const r of changes) {
      if (!r || typeof r.id !== 'string' || !r.id || r.id.length > 120) continue;
      const data = JSON.stringify(r);
      if (data.length > MAX_RECORD) continue;
      batch.push(stmt.bind(space, r.id, data, Number(r.updatedAt) || 0, now));
    }
    if (batch.length) await env.DB.batch(batch);
  }

  const { results } = await env.DB
    .prepare('SELECT data FROM records WHERE space = ?1 AND rev >= ?2')
    .bind(space, since)
    .all();
  if (Math.random() < 0.002 && waitUntil) waitUntil(sweepInactive(env).catch(() => {}));
  // rappels programmés (notifications) : envoyés quand c'est l'heure, à l'occasion des synchros
  if (Math.random() < 0.25 && waitUntil) waitUntil(fetch(new URL('/api/push?a=flush', request.url)).catch(() => {}));
  let wiped = 0;
  try { const w = await env.DB.prepare('SELECT at FROM space_wipes WHERE space = ?1').bind(space).first(); if (w) wiped = w.at; } catch (e) {}
  return json(wiped ? { now, records: results.map(r => JSON.parse(r.data)), wiped } : { now, records: results.map(r => JSON.parse(r.data)) });
}

export const onRequestGet = () => json({ ok: true, service: 'carnet-voyage' });
