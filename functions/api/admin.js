/**
 * Vezoria — administration des signalements (réservé à l'éditeur).
 *
 * POST /api/admin   en-tête X-Admin-Key = variable secrète ADMIN_KEY du projet Cloudflare Pages
 *   {action:'look',    token}            → le carnet existe-t-il ? nombre de fiches, place des photos, statut
 *   {action:'suspend', token|space, note} → SUSPENDRE (réversible) : plus de lecture ni d'écriture, rien n'est effacé
 *   {action:'restore', token|space, note} → rétablir un carnet suspendu (signalement infondé)
 *   {action:'delete',  token|space, note} → effacer définitivement fiches + photos (le carnet reste bloqué)
 *   {action:'usage'}                       → forfait du mois : appels, opérations photos, plafonds
 *   {action:'list'}                        → carnets suspendus/effacés + journal des 100 dernières actions
 *   {action:'geo', mode}                   → recherche d'adresses : 'on' (Nominatim + Photon), 'photon' (Photon seul), 'off' (coupée)
 *                                            sans « mode » : renvoie le mode actuel et la taille du cache
 *   {action:'errors'}                      → les 200 dernières erreurs reçues des téléphones (/api/err), regroupées
 *   {action:'errors', clear:true}          → vider la liste des erreurs
 *   {action:'folders'}                     → 🧹 dossiers photos (R2) : taille, fiches, dernière activité, photos du pot commun
 *   {action:'folderWipe', space, note, force} → effacer un dossier inactif ou sans fiche (refusé s'il a servi depuis 30 jours, sauf force)
 *   {action:'vaultGet', k}                 → 🔐 coffre du tableau de bord (micro-entreprise) : un bloc chiffré sur le téléphone, illisible ici
 *   {action:'vaultPut', k, v, base}        → l'enregistrer ; refusé (409, avec la version actuelle) si un autre appareil l'a changé depuis « base »
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
  try { await env.DB.prepare('DELETE FROM space_members WHERE space = ?1').bind(space).run(); } catch (e) {}   // codes compagnon
  try { await env.DB.batch([env.DB.prepare('DELETE FROM push_subs WHERE space = ?1').bind(space), env.DB.prepare('DELETE FROM push_due WHERE space = ?1').bind(space)]); } catch (e) {}   // notifications
  try {
    await env.DB.prepare("UPDATE photo_stats SET v = MAX(0, v - ?1) WHERE k = 'r2'").bind(freed).run();
    await env.DB.prepare('DELETE FROM photo_stats WHERE k = ?1').bind('s:' + space).run();
  } catch (e) {}
  return { records: (rec.meta && rec.meta.changes) || 0, photos };
}
const log = (env, action, space, note) => env.DB.prepare('INSERT INTO admin_log (at, action, space, note) VALUES (?1, ?2, ?3, ?4)').bind(Date.now(), action, space, String(note || '').slice(0, 500)).run();

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
export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_KEY) return json({ error: 'désactivé' }, 404);
  if (!(await rateIp(env, request, 'ak-check', 10, 0))) return json({ error: 'trop d’essais, réessaie dans une heure' }, 429);
  if ((request.headers.get('X-Admin-Key') || '') !== env.ADMIN_KEY) { await rateIp(env, request, 'ak-check', 10, 1); await new Promise(r => setTimeout(r, 800)); return json({ error: 'clé invalide' }, 403); }
  if (!env.DB) return json({ error: 'Base D1 non liée' }, 500);
  await tables(env.DB);
  let b = {}; try { b = await request.json(); } catch (e) { return json({ error: 'requête illisible' }, 400); }
  const a = b.action;
  if (a === 'usage') {   // 🧮 forfait du mois : appels /api, opérations photos (R2), comptés par _middleware.js
    const m = new Date().toISOString().slice(0, 7), u = { m };
    try { const { results } = await env.DB.prepare('SELECT k, n FROM usage_m WHERE m = ?1').bind(m).all(); (results || []).forEach(r => { u[r.k] = r.n; }); } catch (e) {}
    return json({ ...u, reqMax: Number(env.MAX_REQ_M) || 10_000_000, r2aMax: Number(env.MAX_R2A_M) || 1_000_000, r2bMax: Number(env.MAX_R2B_M) || 10_000_000, r2MaxGb: Number(env.R2_MAX_GB) || 999 });
  }
  if (a === 'list') {
    const bl = await env.DB.prepare('SELECT space, status, at, note FROM blocked ORDER BY at DESC LIMIT 200').all();
    const lg = await env.DB.prepare('SELECT at, action, space, note FROM admin_log ORDER BY at DESC LIMIT 100').all();
    return json({ blocked: (bl.results || []).map(r => ({ ...r, short: short(r.space) })), log: (lg.results || []).map(r => ({ ...r, short: short(r.space) })) });
  }
  if (a === 'geo') {
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS cfg (k TEXT PRIMARY KEY, v TEXT NOT NULL)').run();
    if (['on', 'photon', 'off'].includes(b.mode)) {
      await env.DB.prepare("INSERT INTO cfg (k, v) VALUES ('geo', ?1) ON CONFLICT(k) DO UPDATE SET v = ?1").bind(b.mode).run();
      await log(env, 'geo:' + b.mode, '-', b.note);
    }
    const r = await env.DB.prepare("SELECT v FROM cfg WHERE k = 'geo'").first();
    let n = 0; try { n = (await env.DB.prepare('SELECT COUNT(*) AS n FROM geo_cache').first()).n; } catch (e) {}
    return json({ mode: env.GEO_MODE || (r ? r.v : 'on'), forcedByEnv: !!env.GEO_MODE, cached: n, note: 'le changement prend effet en 1 minute au plus' });
  }
  if (a === 'errors') {
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS errors (k TEXT PRIMARY KEY, msg TEXT, src TEXT, ver TEXT, ua TEXT, n INTEGER NOT NULL, first INTEGER NOT NULL, last INTEGER NOT NULL)').run();
    if (b.clear) { await env.DB.prepare('DELETE FROM errors').run(); await log(env, 'errors:clear', '-', ''); return json({ ok: true }); }
    const e = await env.DB.prepare('SELECT msg, src, ver, ua, n, first, last FROM errors ORDER BY last DESC LIMIT 200').all();
    return json({ errors: e.results || [] });
  }
  if (a === 'folders') {   // 🧹 inventaire des dossiers photos : aucun contenu, seulement des nombres
    if (!env.PHOTOS) return json({ error: 'Stockage R2 non lié (binding PHOTOS)' }, 500);
    const pf = []; let cursor;
    do { const l = await env.PHOTOS.list({ delimiter: '/', cursor, limit: 1000 }); (l.delimitedPrefixes || []).forEach(p => pf.push(p.replace(/\/$/, ''))); cursor = l.truncated ? l.cursor : undefined; } while (cursor);
    const map = (rows, f) => { const o = {}; (rows || []).forEach(r => { o[r.space] = f(r); }); return o; };
    const q = async (sql, f) => { try { return map((await env.DB.prepare(sql).all()).results, f); } catch (e) { return {}; } };
    const rec = await q('SELECT space, COUNT(*) AS n, MAX(rev) AS m FROM records GROUP BY space', r => ({ n: r.n, m: r.m || 0 }));
    const seen = await q('SELECT space, at FROM space_seen', r => r.at);
    const caps = await q('SELECT space, COUNT(*) AS n FROM photo_caps GROUP BY space', r => r.n);
    const blk = await q('SELECT space, status FROM blocked', r => r.status);
    let st = {}; try { (await env.DB.prepare("SELECT k, v FROM photo_stats WHERE k LIKE 's:%'").all()).results.forEach(r => { st[r.k.slice(2)] = r.v; }); } catch (e) {}
    const out = []; let listed = 0;
    for (const sp of pf) {
      let bytes = st[sp], n = null;
      if (bytes == null && listed < 25) {   // dossier pas encore recompté par le ménage quotidien : on le mesure ici (25 au plus par appel)
        listed++; bytes = 0; n = 0; let c;
        do { const l = await env.PHOTOS.list({ prefix: sp + '/', cursor: c, limit: 1000 }); (l.objects || []).forEach(o => { bytes += o.size; n++; }); c = l.truncated && n < 20000 ? l.cursor : undefined; } while (c);
      }
      const r = rec[sp] || { n: 0, m: 0 }, last = Math.max(r.m || 0, seen[sp] || 0);
      out.push({ space: sp, short: short(sp), mb: bytes == null ? null : Math.round(bytes / 1e5) / 10, n, records: r.n, last, caps: caps[sp] || 0, blocked: blk[sp] || null });
    }
    out.sort((x, y) => (x.last || 0) - (y.last || 0));
    return json({ folders: out, now: Date.now() });
  }
  if (a === 'folderWipe') {
    const sp = String(b.space || ''); if (!/^[0-9a-f]{64}$/.test(sp)) return json({ error: 'dossier invalide' }, 400);
    let last = 0;
    try { const r = await env.DB.prepare('SELECT MAX(rev) AS m FROM records WHERE space = ?1').bind(sp).first(); last = (r && r.m) || 0; } catch (e) {}
    try { const r = await env.DB.prepare('SELECT at FROM space_seen WHERE space = ?1').bind(sp).first(); last = Math.max(last, (r && r.at) || 0); } catch (e) {}
    if (!b.force && Date.now() - last < 30 * 864e5) return json({ error: 'Ce dossier a servi il y a moins de 30 jours : il est encore utilisé.' }, 409);
    const w = await wipe(env, sp);
    try { await env.DB.prepare('DELETE FROM photo_caps WHERE space = ?1').bind(sp).run(); } catch (e) {}
    try { await env.DB.prepare('DELETE FROM space_seen WHERE space = ?1').bind(sp).run(); } catch (e) {}
    await log(env, 'ménage', sp, (b.note || '') + ` (${w.records} fiches, ${w.photos} photos)`);
    return json({ ok: true, wiped: w });
  }
  if (a === 'vaultGet' || a === 'vaultPut') {   // 🔐 le serveur ne garde qu'un bloc chiffré avec une clé tirée de ADMIN_KEY, sur le téléphone
    const k = String(b.k || ''); if (!/^[a-z0-9_-]{1,40}$/.test(k)) return json({ error: 'nom de coffre invalide' }, 400);
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS admin_vault (k TEXT PRIMARY KEY, v TEXT NOT NULL, at INTEGER NOT NULL)').run();
    const cur = await env.DB.prepare('SELECT v, at FROM admin_vault WHERE k = ?1').bind(k).first();
    if (a === 'vaultGet') return json(cur ? { v: cur.v, at: cur.at } : { v: null, at: 0 });
    const v = String(b.v || ''); if (!v || v.length > 1_500_000) return json({ error: 'bloc invalide ou trop gros' }, 400);
    if (cur && b.base != null && Number(b.base) !== cur.at) return json({ error: 'conflit', v: cur.v, at: cur.at }, 409);
    const at = Math.max(Date.now(), cur ? cur.at + 1 : 0);
    await env.DB.prepare('INSERT INTO admin_vault (k, v, at) VALUES (?1, ?2, ?3) ON CONFLICT(k) DO UPDATE SET v = ?2, at = ?3').bind(k, v, at).run();
    return json({ ok: true, at });
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
