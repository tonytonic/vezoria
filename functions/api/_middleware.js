/**
 * Vezoria — 🧮 garde-fou du forfait Cloudflare (Workers Paid, 5 $/mois), devant TOUTES les routes /api.
 *
 * Ce qu'il compte, par mois (remis à zéro le 1er) :
 *   req  : appels à /api (le forfait en inclut 10 millions)
 *   r2a  : envois / suppressions de photos (opérations R2 « classe A » : 1 million gratuites par mois)
 *   r2b  : lectures de photos (opérations R2 « classe B » : 10 millions gratuites par mois)
 * Les compteurs sont tenus en mémoire puis ajoutés à la base D1 par paquets (1 écriture toutes les ~100 requêtes ou 30 s) :
 * le garde-fou ne coûte presque rien.
 *
 * Paliers (réglables sans toucher au code, variables Cloudflare facultatives) :
 *   MAX_REQ_M  (10000000) · MAX_R2A_M (1000000) · MAX_R2B_M (10000000)
 *   ≥ 90 % des appels : pause de ce qui n'est pas indispensable (recherche de lieux, « que voir », statistiques, installations)
 *   ≥ 100 % des appels : pause de tout, sauf la synchronisation des carnets (les données restent à jour) et l'admin
 *   photos : au-delà du plafond R2, les envois attendent sur le téléphone (rien n'est perdu), les lectures reprennent le mois suivant
 *   STRICT=1 : à 100 %, la synchronisation est aussi mise en pause (zéro dépassement possible)
 * Les compteurs sont approximatifs (quelques centaines d'appels d'écart au plus) : les paliers gardent une marge.
 */
const C = { req: 0, r2a: 0, r2b: 0 };   // pas encore envoyés à D1 (ce serveur)
let lastFlush = Date.now(), tot = null, totAt = 0, ready = false;
const month = () => new Date().toISOString().slice(0, 7);
const lim = (env, k, d) => Number(env[k]) || d;
const pause = (msg) => new Response(JSON.stringify({ error: msg, budget: true, retry: 3600 }), {
  status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Retry-After': '3600' } });

async function table(env) {
  if (ready) return; await env.DB.prepare('CREATE TABLE IF NOT EXISTS usage_m (m TEXT NOT NULL, k TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (m, k))').run(); ready = true;
}
async function flush(env) {
  const m = month(), d = { ...C }; C.req = C.r2a = C.r2b = 0; lastFlush = Date.now();
  const st = Object.entries(d).filter(([, n]) => n > 0).map(([k, n]) => env.DB.prepare('INSERT INTO usage_m (m, k, n) VALUES (?1, ?2, ?3) ON CONFLICT (m, k) DO UPDATE SET n = n + ?3').bind(m, k, n));
  if (st.length) await env.DB.batch(st);
}
async function totals(env) {
  if (tot && Date.now() - totAt < 60000 && tot.m === month()) return tot;
  const t = { m: month(), req: 0, r2a: 0, r2b: 0 };
  try { const { results } = await env.DB.prepare('SELECT k, n FROM usage_m WHERE m = ?1').bind(t.m).all(); (results || []).forEach(r => { t[r.k] = r.n; }); } catch (e) {}
  tot = t; totAt = Date.now(); return t;
}
export async function onRequest(ctx) {
  const { request, env, next, waitUntil } = ctx;
  if (request.method === 'OPTIONS' || !env.DB) return next();
  const u = new URL(request.url), p = u.pathname, meth = request.method;
  const isSync = p === '/api/sync', isAdmin = p === '/api/admin', isPhoto = p === '/api/photo';
  const essential = isSync || isAdmin || isPhoto || p === '/api/push' || p === '/api/member' || p === '/api/plan';
  let t;
  try { await table(env); t = await totals(env); } catch (e) { return next(); }   // en cas de souci, on ne bloque jamais
  const seen = k => (t[k] || 0) + C[k];
  const maxReq = lim(env, 'MAX_REQ_M', 10_000_000), used = seen('req') / maxReq;
  if (!isAdmin) {
    if (used >= 1 && (!isSync || env.STRICT === '1')) return pause('Forfait du mois atteint : le serveur fait une pause jusqu’au 1er du mois. Tes données restent sur ton téléphone. — Monthly quota reached: the server pauses until the 1st.');
    if (used >= 0.9 && !essential) return pause('Pause de cette fonction jusqu’au 1er du mois (forfait presque atteint). — Paused until the 1st (quota almost reached).');
    if (isPhoto) {
      const write = meth === 'POST' || meth === 'DELETE' || u.searchParams.get('list') === '1';
      if (write && seen('r2a') >= lim(env, 'MAX_R2A_M', 1_000_000)) return pause('Envoi des photos en pause jusqu’au 1er du mois : elles attendent sur ton téléphone. — Photo uploads paused until the 1st.');
      if (!write && seen('r2b') >= lim(env, 'MAX_R2B_M', 10_000_000)) return pause('Affichage des photos du serveur en pause jusqu’au 1er du mois. — Photo downloads paused until the 1st.');
      C[write ? 'r2a' : 'r2b'] += write ? 1 : Math.max(1, String(u.searchParams.get('sizes') || '').split(',').filter(Boolean).length);   // ?sizes= : une lecture par photo demandée
    }
  }
  C.req += 1;
  if (C.req >= 100 || Date.now() - lastFlush > 30000) { const pr = flush(env).catch(() => {}); if (waitUntil) waitUntil(pr); }
  return next();
}
