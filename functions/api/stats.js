/**
 * Vezoria — état du stockage, pour être prévenu avant d'atteindre la limite gratuite.
 *
 * GET /api/stats   (en-tête X-Stats-Key = variable secrète STATS_KEY du projet Cloudflare)
 * Réponse : { r2: {used, max, pct}, freeR2, records, spaces, bigSpaces:[{mb}], d1Photos }
 * Sans STATS_KEY configurée, la page est désactivée (404). Aucune donnée d'utilisateur n'est
 * renvoyée : seulement des tailles et des nombres (les carnets sont chiffrés de toute façon).
 */
const MAX_TOTAL_R2 = 9_000_000_000;   // même garde-fou que /api/photo : arrêt à 9 Go (10 Go gratuits)
const FREE_R2 = 10_000_000_000;
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

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

export async function onRequestGet({ request, env }) {
  if (!env.STATS_KEY) return json({ error: 'désactivé' }, 404);
  if (!(await rateIp(env, request, 'sk-check', 10, 0))) return json({ error: 'trop d’essais, réessaie dans une heure' }, 429);
  if ((request.headers.get('X-Stats-Key') || '') !== env.STATS_KEY) { await rateIp(env, request, 'sk-check', 10, 1); await new Promise(r => setTimeout(r, 800)); return json({ error: 'clé invalide' }, 403); }
  if (!env.DB) return json({ error: 'Base D1 non liée' }, 500);
  let used = 0, d1Photos = 0, big = [], records = 0, spaces = 0;
  try { const r = await env.DB.prepare("SELECT v FROM photo_stats WHERE k = 'r2'").first(); used = r ? r.v : 0; } catch (e) {}
  try { const r = await env.DB.prepare("SELECT v FROM photo_stats WHERE k = 'total'").first(); d1Photos = r ? r.v : 0; } catch (e) {}
  try { const { results } = await env.DB.prepare("SELECT v FROM photo_stats WHERE k LIKE 's:%' ORDER BY v DESC LIMIT 5").all(); big = (results || []).map(x => ({ mb: Math.round(x.v / 1e6) })); } catch (e) {}
  try { const r = await env.DB.prepare('SELECT COUNT(*) AS n, COUNT(DISTINCT space) AS s FROM records').first(); records = r ? r.n : 0; spaces = r ? r.s : 0; } catch (e) {}
  return json({
    r2: { used, max: MAX_TOTAL_R2, pct: Math.round(used / MAX_TOTAL_R2 * 1000) / 10, usedGb: Math.round(used / 1e7) / 100 },
    freeR2: FREE_R2, records, spaces, bigSpaces: big, d1PhotosMb: Math.round(d1Photos / 1e6), at: new Date().toISOString(),
  });
}
