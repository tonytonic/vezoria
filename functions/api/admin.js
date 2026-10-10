/**
 * Vezoria — administration des signalements (réservé à l'éditeur).
 *
 * POST /api/admin   en-tête X-Admin-Key = variable secrète ADMIN_KEY du projet Cloudflare Pages
 *   {action:'look',    token}            → le carnet existe-t-il ? nombre de fiches, place des photos, statut
 *   {action:'suspend', token|space, note} → SUSPENDRE (réversible) : plus de lecture ni d'écriture, rien n'est effacé
 *   {action:'restore', token|space, note} → rétablir un carnet suspendu (signalement infondé)
 *   {action:'delete',  token|space, note} → effacer définitivement fiches + photos (le carnet reste bloqué)
 *   {action:'list'}                        → carnets suspendus/effacés + journal des 100 dernières actions
 *
 * Le CODE du carnet n'est jamais envoyé ici : la page d'administration calcule elle-même son empreinte
 * (« token », la même que celle de l'appli), et le serveur en déduit le dossier du carnet.
 * Aucune photo n'est jamais ouverte ni renvoyée par cette page : seulement des nombres.
 * Sans ADMIN_KEY configurée, la page est désactivée (404).
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  'Access-Control-Max-Age': '86400',
};
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });
async function sha256(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
const short = s => s ? s.slice(0, 12) : '';

async function tables(db) {
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS blocked (space TEXT PRIMARY KEY, status TEXT NOT NULL, at INTEGER NOT NULL, note TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS admin_log (at INTEGER NOT NULL, action TEXT NOT NULL, space TEXT NOT NULL, note TEXT)'),
  ]);
}
async function info(env, space) {
  let records = 0, last = 0, photos = 0, blocked = null;
  try { const r = await env.DB.prepare('SELECT COUNT(*) AS n, MAX(rev) AS m FROM records WHERE space = ?1').bind(space).first(); records = r ? r.n : 0; last = r ? r.m || 0 : 0; } catch (e) {}
  try { const r = await env.DB.prepare('SELECT v FROM photo_stats WHERE k = ?1').bind('s:' + space).first(); photos = r ? r.v : 0; } catch (e) {}
  try { blocked = await env.DB.prepare('SELECT status, at, note FROM blocked WHERE space = ?1').bind(space).first(); } catch (e) {}
  return { space, short: short(space), exists: records > 0 || photos > 0, records, last, photosMb: Math.round(photos / 1e5) / 10, blocked };
}
async function wipe(env, space) {
  let photos = 0, freed = 0;
  if (env.PHOTOS) {
    let cursor;
    do {
      const l = await env.PHOTOS.list({ prefix: space + '/', cursor, limit: 1000 });
      const keys = l.objects.map(o => o.key); l.objects.forEach(o => { freed += o.size; });
      if (keys.length) await env.PHOTOS.delete(keys);
      photos += keys.length; cursor = l.truncated ? l.cursor : undefined;
    } while (cursor);
  }
  const rec = await env.DB.prepare('DELETE FROM records WHERE space = ?1').bind(space).run();
  try { await env.DB.prepare('DELETE FROM photos WHERE space = ?1').bind(space).run(); } catch (e) {}
  try {
    await env.DB.prepare("UPDATE photo_stats SET v = MAX(0, v - ?1) WHERE k = 'r2'").bind(freed).run();
    await env.DB.prepare('DELETE FROM photo_stats WHERE k = ?1').bind('s:' + space).run();
  } catch (e) {}
  return { records: (rec.meta && rec.meta.changes) || 0, photos };
}
const log = (env, action, space, note) => env.DB.prepare('INSERT INTO admin_log (at, action, space, note) VALUES (?1, ?2, ?3, ?4)').bind(Date.now(), action, space, String(note || '').slice(0, 500)).run();

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });
export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_KEY) return json({ error: 'désactivé' }, 404);
  if ((request.headers.get('X-Admin-Key') || '') !== env.ADMIN_KEY) { await new Promise(r => setTimeout(r, 800)); return json({ error: 'clé invalide' }, 403); }
  if (!env.DB) return json({ error: 'Base D1 non liée' }, 500);
  await tables(env.DB);
  let b = {}; try { b = await request.json(); } catch (e) { return json({ error: 'requête illisible' }, 400); }
  const a = b.action;
  if (a === 'list') {
    const bl = await env.DB.prepare('SELECT space, status, at, note FROM blocked ORDER BY at DESC LIMIT 200').all();
    const lg = await env.DB.prepare('SELECT at, action, space, note FROM admin_log ORDER BY at DESC LIMIT 100').all();
    return json({ blocked: (bl.results || []).map(r => ({ ...r, short: short(r.space) })), log: (lg.results || []).map(r => ({ ...r, short: short(r.space) })) });
  }
  let space = '';
  if (b.token && /^[0-9a-f]{64}$/.test(b.token)) space = await sha256('carnet-voyage:' + b.token);
  else if (b.space && /^[0-9a-f]{64}$/.test(b.space)) space = b.space;
  if (!space) return json({ error: 'empreinte manquante' }, 400);
  if (a === 'look') return json(await info(env, space));
  if (a === 'suspend') {
    await env.DB.prepare("INSERT INTO blocked (space, status, at, note) VALUES (?1, 'suspendu', ?2, ?3) ON CONFLICT(space) DO UPDATE SET status = 'suspendu', at = ?2, note = ?3").bind(space, Date.now(), String(b.note || '').slice(0, 500)).run();
    await log(env, 'suspendu', space, b.note); return json({ ok: true, ...(await info(env, space)) });
  }
  if (a === 'restore') {
    await env.DB.prepare('DELETE FROM blocked WHERE space = ?1').bind(space).run();
    await log(env, 'rétabli', space, b.note); return json({ ok: true, ...(await info(env, space)) });
  }
  if (a === 'delete') {
    const w = await wipe(env, space);
    await env.DB.prepare("INSERT INTO blocked (space, status, at, note) VALUES (?1, 'effacé', ?2, ?3) ON CONFLICT(space) DO UPDATE SET status = 'effacé', at = ?2, note = ?3").bind(space, Date.now(), String(b.note || '').slice(0, 500)).run();
    await log(env, 'effacé', space, (b.note || '') + ` (${w.records} fiches, ${w.photos} photos)`); return json({ ok: true, wiped: w, ...(await info(env, space)) });
  }
  return json({ error: 'action inconnue' }, 400);
}
