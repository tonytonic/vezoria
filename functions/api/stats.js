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

export async function onRequestGet({ request, env }) {
  if (!env.STATS_KEY) return json({ error: 'désactivé' }, 404);
  if ((request.headers.get('X-Stats-Key') || '') !== env.STATS_KEY) return json({ error: 'clé invalide' }, 403);
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
