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
}

export async function onRequestDelete({ request, env }) {
  const space = await spaceOf(request, env);
  if (space instanceof Response) return space;
  const out = await wipeSpace(env, space);
  return json({ ok: true, ...out });
}

export async function onRequestPost({ request, env, waitUntil }) {
  const space = await spaceOf(request, env);
  if (space instanceof Response) return space;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Requête illisible' }, 400); }
  const since = Math.max(0, Number(body.since) || 0);
  const changes = Array.isArray(body.changes) ? body.changes.slice(0, MAX_CHANGES) : [];
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
  return json({ now, records: results.map(r => JSON.parse(r.data)) });
}

export const onRequestGet = () => json({ ok: true, service: 'carnet-voyage' });
