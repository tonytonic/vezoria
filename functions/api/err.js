/**
 * Vezoria — erreurs reçues des vrais téléphones, de façon anonyme.
 *
 *   POST /api/err  {m, s, v, ua}   m : message de l'erreur · s : fichier:ligne · v : version de l'appli
 *                                  ua : navigateur et système en clair, sans numéro d'appareil (ex. « iOS 17.4 · Safari »)
 * Aucune donnée de voyage, aucun identifiant d'appareil, aucune adresse IP gardée : les erreurs identiques sont
 * regroupées (un compteur), et seules les 500 plus récentes sont gardées.
 * Lecture : POST /api/admin {action:'errors'} (clé ADMIN_KEY), ou {action:'errors', clear:true} pour vider.
 */
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS } });
const cut = (x, n) => String(x == null ? '' : x).replace(/[\u0000-\u001f]+/g, ' ').replace(/\d{6,}/g, '#').slice(0, n);
let ready = false;

async function rateIp(env, request, limit) {
  try {
    const ip = request.headers.get('CF-Connecting-IP') || ''; if (!ip) return true;
    const hour = Math.floor(Date.now() / 3600e3);
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('vz-ip:' + ip + ':err'));
    const key = [...new Uint8Array(d)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS rate_ip (k TEXT PRIMARY KEY, hour INTEGER NOT NULL, n INTEGER NOT NULL)').run();
    const r = await env.DB.prepare('INSERT INTO rate_ip (k, hour, n) VALUES (?1, ?2, 1) ON CONFLICT (k) DO UPDATE SET n = CASE WHEN rate_ip.hour = ?2 THEN rate_ip.n + 1 ELSE 1 END, hour = ?2 RETURNING n').bind(key, hour).first();
    return !r || r.n <= limit;
  } catch (e) { return true; }
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'POST' }, 405);
  if (!env.DB) return json({ error: 'Base D1 non liée (DB)' }, 500);
  const len = +(request.headers.get('Content-Length') || 0); if (len > 4000) return json({ error: 'trop long' }, 413);
  let b = {}; try { b = JSON.parse((await request.text()).slice(0, 4000)); } catch (e) { return json({ error: 'illisible' }, 400); }
  const m = cut(b.m, 300), s = cut(b.s, 160), v = cut(b.v, 20), ua = cut(b.ua, 60);
  if (!m) return json({ error: 'vide' }, 400);
  if (!(await rateIp(env, request, 30))) return json({ ok: true });   // trop d'envois : ignorés sans bruit
  if (!ready) { await env.DB.prepare('CREATE TABLE IF NOT EXISTS errors (k TEXT PRIMARY KEY, msg TEXT, src TEXT, ver TEXT, ua TEXT, n INTEGER NOT NULL, first INTEGER NOT NULL, last INTEGER NOT NULL)').run(); ready = true; }
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(m + '|' + s + '|' + v + '|' + ua));
  const k = [...new Uint8Array(h)].slice(0, 12).map(x => x.toString(16).padStart(2, '0')).join(''), now = Date.now();
  await env.DB.prepare('INSERT INTO errors (k, msg, src, ver, ua, n, first, last) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?6) ON CONFLICT (k) DO UPDATE SET n = n + 1, last = ?6')
    .bind(k, m, s, v, ua, now).run();
  if (Math.random() < 0.05) await env.DB.prepare('DELETE FROM errors WHERE k NOT IN (SELECT k FROM errors ORDER BY last DESC LIMIT 500)').run();
  return json({ ok: true });
}
