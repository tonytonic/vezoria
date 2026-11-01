import { codeSpace, ROTATED } from './rotate.js';   // 🔑 code administrateur changé
/**
 * Vezoria — 📱 appareils d’un carnet : le propriétaire bloque (ou débloque) un appareil qui a ouvert son carnet.
 * Le serveur ne connaît que l’identifiant aléatoire de l’appareil (pas de nom, pas de modèle : ils restent chiffrés dans le carnet).
 * POST /api/device  (en-tête X-Carnet-Code : code administrateur, jamais un code compagnon)
 *   {a:'block', dev}   cet appareil ne peut plus lire ni écrire ce carnet (sync.js, photo.js)
 *   {a:'unblock', dev} levée du blocage
 *   {a:'list'}         appareils bloqués
 */
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Carnet-Code, X-Carnet-Dev', 'Access-Control-Max-Age': '86400' };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });
async function sha256(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Base D1 non liée (DB)' }, 500);
  const code = (request.headers.get('X-Carnet-Code') || '').trim();
  if (code.length < 8 || code.startsWith('mb:')) return json({ error: 'Réservé au propriétaire du carnet (code administrateur) — Owner only' }, 403);
  const cs = await codeSpace(env, code), space = cs.space, me = (request.headers.get('X-Carnet-Dev') || '').trim().slice(0, 40);
  if (cs.dead) return json({ error: ROTATED, rotated: true }, 403);
  // un appareil bloqué ne peut pas se débloquer lui-même
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS dev_block (space TEXT NOT NULL, dev TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (space, dev))').run();
  if (me && await env.DB.prepare('SELECT 1 AS x FROM dev_block WHERE space = ?1 AND dev = ?2').bind(space, me).first()) return json({ error: 'Appareil bloqué — Device blocked', devBlocked: true }, 403);
  let b = {}; try { b = await request.json(); } catch (e) { return json({ error: 'Requête illisible' }, 400); }
  const dev = String(b.dev || '').replace(/[^a-z0-9]/gi, '').slice(0, 40);
  if (b.a === 'list') { const { results } = await env.DB.prepare('SELECT dev, at FROM dev_block WHERE space = ?1').bind(space).all(); return json({ ok: true, blocked: results || [] }); }
  if (dev.length < 8) return json({ error: 'Appareil inconnu' }, 400);
  if (dev === me) return json({ error: 'Tu ne peux pas bloquer l’appareil que tu utilises — You can’t block this device' }, 400);
  if (b.a === 'block') { await env.DB.prepare('INSERT OR REPLACE INTO dev_block (space, dev, at) VALUES (?1, ?2, ?3)').bind(space, dev, Date.now()).run(); return json({ ok: true }); }
  if (b.a === 'unblock') { await env.DB.prepare('DELETE FROM dev_block WHERE space = ?1 AND dev = ?2').bind(space, dev).run(); return json({ ok: true }); }
  return json({ error: 'action inconnue' }, 400);
}
