/**
 * Vezoria — 🫙 place photos par carnet · 🌿 voyages branchés · 💳 formules · 🎁 codes cadeaux
 *
 * Un carnet (code administrateur) = UN pot de photos. Les voyages partagés, les paquets et les publications abonnés
 * créés depuis ce carnet ont leur propre code, mais ils sont « branchés » dessus : toutes leurs photos (celles des
 * compagnons aussi) comptent dans la place du carnet de celui qui les a créés. Le serveur ne sait toujours pas
 * ce que contient un carnet : il additionne seulement des tailles de fichiers chiffrés.
 *
 * Réglages Cloudflare (facultatifs, sans toucher au code) :
 *   FREE_MB      place offerte par carnet, en Mo            (défaut 2000 = 2 Go)
 *   PLUS_MB      place de la formule Plus, en Mo            (défaut 7000)
 *   MAX_MB       place de la formule Max, en Mo             (défaut 14000)
 *   HARD_MAX_MB  plafond de sécurité, même « illimité »     (défaut 50000 = 50 Go)
 *   GRACE_DAYS   délai avant effacement au-delà de la place (défaut 180 jours = 6 mois)
 *   PURGE        '1' = effacer vraiment après le délai (sinon : on bloque les envois, on n'efface jamais)
 *   PAY_ON       '1' = abonnements ouverts dans l'appli (sinon : boutons cachés, paiement refusé)
 *   STRIPE_SECRET, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PLUS_Y, STRIPE_PRICE_PLUS_M, STRIPE_PRICE_MAX_Y, STRIPE_PRICE_MAX_M
 *
 * POST /api/plan
 *   {a:'status'}              en-tête X-Carnet-Code (administrateur, compagnon « mb: » ou code d'un voyage branché)
 *                             → {used, quota, free, plan, until, overSince, graceEnd, branch, pay, purge}
 *   {a:'link', kids:[token]}  administrateur : brancher ses voyages / paquets / publications sur son carnet
 *   {a:'redeem', gift}        administrateur : utiliser un code cadeau
 *   {a:'checkout', plan, period} administrateur : lien de paiement Stripe (seulement si PAY_ON = 1)
 *   {a:'portal'}              administrateur : gérer / résilier son abonnement Stripe
 * POST /api/plan?stripe=1     webhook Stripe (signature vérifiée)
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Carnet-Code',
  'Access-Control-Max-Age': '86400',
};
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });
async function sha256(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
const MB = 1_000_000, DAY = 864e5;
export const FREE_MB = env => Number(env.FREE_MB) || 2000;
const HARD_MB = env => Number(env.HARD_MAX_MB) || 50000;
const GRACE = env => (Number(env.GRACE_DAYS) || 180) * DAY;
export const PLAN_MB = (env, p) => p === 'plus' ? (Number(env.PLUS_MB) || 7000) : p === 'max' ? (Number(env.MAX_MB) || 14000) : p === 'unlimited' ? -1 : 0;

let ready = false;
export async function planTables(db) {
  if (ready) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS space_links (child TEXT PRIMARY KEY, owner TEXT NOT NULL, at INTEGER NOT NULL)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_space_links_owner ON space_links (owner)'),
    db.prepare('CREATE TABLE IF NOT EXISTS plans (space TEXT PRIMARY KEY, plan TEXT NOT NULL, mb INTEGER NOT NULL, until INTEGER NOT NULL DEFAULT 0, src TEXT, ref TEXT, cust TEXT, at INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS quota_state (space TEXT PRIMARY KEY, over_since INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS gifts (gh TEXT PRIMARY KEY, plan TEXT NOT NULL, mb INTEGER NOT NULL, days INTEGER NOT NULL, uses INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0, note TEXT, created INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0)'),
    db.prepare('CREATE TABLE IF NOT EXISTS gift_uses (gh TEXT NOT NULL, space TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (gh, space))'),
    db.prepare('CREATE TABLE IF NOT EXISTS photo_stats (k TEXT PRIMARY KEY, v INTEGER NOT NULL)'),
  ]);
  ready = true;
}

// ── le carnet qui « paie » la place d'un dossier : lui-même, ou le carnet sur lequel il est branché ──
export async function billOf(env, space) {
  try { const r = await env.DB.prepare('SELECT owner FROM space_links WHERE child = ?1').bind(space).first(); return r ? r.owner : space; } catch (e) { return space; }
}
// place utilisée : le carnet + tous ses dossiers branchés (compteurs « s:<dossier> » tenus par photo.js, recomptés chaque jour par sync.js)
export async function usedOf(env, owner) {
  const r = await env.DB.prepare("SELECT COALESCE(SUM(v), 0) AS u FROM photo_stats WHERE k = 's:' || ?1 OR k IN (SELECT 's:' || child FROM space_links WHERE owner = ?1)").bind(owner).first();
  return (r && r.u) || 0;
}
// place permise + état (formule, fin, dépassement)
export async function quotaOf(env, owner, used) {
  await planTables(env.DB);
  const now = Date.now(), free = FREE_MB(env) * MB, hard = HARD_MB(env) * MB;
  const p = await env.DB.prepare('SELECT plan, mb, until, src FROM plans WHERE space = ?1').bind(owner).first();
  const active = !!(p && (!p.until || p.until > now));
  let quota = active ? (p.mb < 0 ? hard : Math.max(free, p.mb * MB)) : free;
  quota = Math.min(quota, hard);
  if (used == null) used = await usedOf(env, owner);
  // dépassement : on note le jour où il commence (fin d'abonnement = date de fin, sinon maintenant) ; effacé quand on repasse dessous
  const st = await env.DB.prepare('SELECT over_since FROM quota_state WHERE space = ?1').bind(owner).first();
  let overSince = st ? st.over_since : 0;
  if (used > quota && !overSince) {
    overSince = p && p.until && p.until <= now ? p.until : now;
    await env.DB.prepare('INSERT INTO quota_state (space, over_since) VALUES (?1, ?2) ON CONFLICT (space) DO UPDATE SET over_since = ?2').bind(owner, overSince).run();
  } else if (used <= quota && overSince) {
    overSince = 0; await env.DB.prepare('DELETE FROM quota_state WHERE space = ?1').bind(owner).run();
  }
  return { used, quota, free, plan: active ? p.plan : (p ? p.plan : ''), active, until: p ? p.until : 0, src: p ? p.src : '', overSince, graceEnd: overSince ? overSince + GRACE(env) : 0 };
}
// vérification avant un envoi de photo (photo.js) : null = OK, sinon la réponse d'erreur à renvoyer
export async function uploadCheck(env, space, delta) {
  if (delta <= 0) return null;
  try {
    const owner = await billOf(env, space), used = await usedOf(env, owner);
    const q = await quotaOf(env, owner, used);
    if (used + delta <= q.quota) return null;
    return json({ error: (owner === space ? 'Place photos de ce carnet pleine' : 'Place photos du carnet de l’organisateur du voyage pleine') + ' — Photo storage of this notebook is full',
      full: true, branch: owner !== space, used, max: q.quota, quota: q.quota, graceEnd: q.graceEnd }, 507);
  } catch (e) { return null; }   // en cas de souci de comptage, on ne bloque jamais un vrai voyageur
}

// 🧹 après le délai de grâce (seulement si PURGE = 1) : on garde les photos les plus RÉCENTES dans la place permise
async function purge(env, owner, q) {
  if (env.PURGE !== '1' || !env.PHOTOS || !q.graceEnd || Date.now() < q.graceEnd || q.used <= q.quota) return 0;
  const kids = ((await env.DB.prepare('SELECT child FROM space_links WHERE owner = ?1').bind(owner).all()).results || []).map(r => r.child);
  const objs = [];
  for (const sp of [owner, ...kids]) { let c; do { const l = await env.PHOTOS.list({ prefix: sp + '/', cursor: c, limit: 1000 }); (l.objects || []).forEach(o => objs.push({ k: o.key, s: o.size, u: new Date(o.uploaded).getTime(), sp })); c = l.truncated && objs.length < 60000 ? l.cursor : undefined; } while (c); }
  objs.sort((a, b) => b.u - a.u);
  let keep = 0; const del = [], freed = {};
  for (const o of objs) { if (keep + o.s <= q.quota) keep += o.s; else if (del.length < 1000) { del.push(o.k); freed[o.sp] = (freed[o.sp] || 0) + o.s; } }
  if (!del.length) return 0;
  await env.PHOTOS.delete(del);
  const tot = Object.values(freed).reduce((a, b) => a + b, 0);
  await env.DB.batch([env.DB.prepare("UPDATE photo_stats SET v = MAX(0, v - ?1) WHERE k = 'r2'").bind(tot)]
    .concat(Object.entries(freed).map(([sp, v]) => env.DB.prepare('UPDATE photo_stats SET v = MAX(0, v - ?1) WHERE k = ?2').bind(v, 's:' + sp))));
  return del.length;
}

// ── qui appelle : administrateur, compagnon (mb:) ou code d'un voyage ──
async function who(request, env) {
  const code = (request.headers.get('X-Carnet-Code') || '').trim();
  if (code.length < 8) return { err: json({ error: 'Code du carnet manquant' }, 400) };
  if (code.startsWith('mb:')) {
    let row = null;
    if (/^[0-9a-f]{64}$/.test(code.slice(3))) try { row = await env.DB.prepare('SELECT space FROM space_members WHERE mh = ?1').bind(await sha256('vz-member:' + code.slice(3))).first(); } catch (e) {}
    if (!row) return { err: json({ error: 'Accès compagnon retiré par le propriétaire du carnet. — Companion access was removed by the notebook owner.', revoked: true }, 403) };
    return { space: row.space, member: true };
  }
  const space = await sha256('carnet-voyage:' + code);
  try { const b = await env.DB.prepare('SELECT status FROM blocked WHERE space = ?1').bind(space).first(); if (b) return { err: json({ error: 'suspendu', suspended: true }, 423) }; } catch (e) {}
  return { space };
}
const MEM = new Map();
function rate(request, bucket, limit) {
  const hour = Math.floor(Date.now() / 3600e3), k = bucket + ':' + (request.headers.get('CF-Connecting-IP') || ''), r = MEM.get(k);
  if (MEM.size > 20000) MEM.clear();
  const n = (r && r.hour === hour ? r.n : 0) + 1; MEM.set(k, { hour, n }); return n <= limit;
}
const giftNorm = g => String(g || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// ── 💳 Stripe (inactif tant que PAY_ON ≠ 1 et que les clés ne sont pas posées) ──
async function stripe(env, path, params) {
  const body = new URLSearchParams(); Object.entries(params || {}).forEach(([k, v]) => { if (v != null) body.append(k, String(v)); });
  const r = await fetch('https://api.stripe.com/v1/' + path, { method: 'POST', headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error((j.error && j.error.message) || ('Stripe ' + r.status)); return j;
}
async function hmacHex(secret, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)))].map(x => x.toString(16).padStart(2, '0')).join('');
}
export async function stripeVerify(secret, raw, sigHeader, tolerance = 600) {
  const parts = {}; String(sigHeader || '').split(',').forEach(p => { const i = p.indexOf('='); if (i > 0) { const k = p.slice(0, i).trim(); (parts[k] = parts[k] || []).push(p.slice(i + 1).trim()); } });
  const t = Number((parts.t || [])[0]); if (!t || Math.abs(Date.now() / 1000 - t) > tolerance) return false;
  const want = await hmacHex(secret, t + '.' + raw);
  return (parts.v1 || []).some(v => v.length === want.length && [...v].reduce((a, c, i) => a | (c.charCodeAt(0) ^ want.charCodeAt(i)), 0) === 0);
}
async function stripeHook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET) return json({ error: 'désactivé' }, 404);
  const raw = await request.text();
  if (!(await stripeVerify(env.STRIPE_WEBHOOK_SECRET, raw, request.headers.get('Stripe-Signature')))) return json({ error: 'signature' }, 400);
  let ev = {}; try { ev = JSON.parse(raw); } catch (e) { return json({ error: 'illisible' }, 400); }
  await planTables(env.DB);
  const o = (ev.data && ev.data.object) || {}, now = Date.now();
  const setPlan = (space, plan, until, ref, cust) => env.DB.prepare('INSERT INTO plans (space, plan, mb, until, src, ref, cust, at) VALUES (?1, ?2, ?3, ?4, \'stripe\', ?5, ?6, ?7) ON CONFLICT (space) DO UPDATE SET plan = ?2, mb = ?3, until = ?4, src = \'stripe\', ref = ?5, cust = ?6, at = ?7')
    .bind(space, plan, PLAN_MB(env, plan), until, ref || '', cust || '', now).run();
  if (ev.type === 'checkout.session.completed' && o.mode === 'subscription') {
    const space = (o.metadata && o.metadata.space) || o.client_reference_id || '', plan = (o.metadata && o.metadata.plan) || 'plus';
    if (/^[0-9a-f]{64}$/.test(space)) await setPlan(space, plan, now + ((o.metadata && o.metadata.period) === 'month' ? 35 : 370) * DAY, o.subscription, o.customer);
  } else if (ev.type === 'customer.subscription.updated' || ev.type === 'customer.subscription.created' || ev.type === 'customer.subscription.deleted') {
    const row = await env.DB.prepare('SELECT space, plan FROM plans WHERE ref = ?1').bind(o.id || '').first();
    const space = row ? row.space : ((o.metadata && o.metadata.space) || '');
    if (/^[0-9a-f]{64}$/.test(space)) {
      const plan = (o.metadata && o.metadata.plan) || (row && row.plan) || 'plus';
      const end = (o.current_period_end || (o.items && o.items.data && o.items.data[0] && o.items.data[0].current_period_end) || 0) * 1000;
      const until = ev.type === 'customer.subscription.deleted' || o.status === 'canceled' ? Math.min(end || now, now) : (end || now + 35 * DAY) + 3 * DAY;   // 3 jours de marge pour un paiement en retard
      await setPlan(space, plan, until, o.id, o.customer);
    }
  }
  return json({ ok: true });
}

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Base D1 non liée (DB)' }, 500);
  if (new URL(request.url).searchParams.get('stripe') === '1') return stripeHook(request, env);
  await planTables(env.DB);
  let b = {}; try { b = await request.json(); } catch (e) { return json({ error: 'Requête illisible' }, 400); }
  const a = b.a, w = await who(request, env); if (w.err) return w.err;
  const pay = env.PAY_ON === '1';

  if (a === 'status') {
    if (!rate(request, 'ps', 600)) return json({ error: 'Trop de demandes' }, 429);
    const owner = await billOf(env, w.space); let q = await quotaOf(env, owner);
    const gone = !w.member && owner === w.space ? await purge(env, owner, q) : 0;
    if (gone) q = await quotaOf(env, owner, await usedOf(env, owner));
    return json({ used: q.used, quota: q.quota, free: q.free, plan: q.plan, active: q.active, until: q.until, src: q.src, overSince: q.overSince, graceEnd: q.graceEnd,
      branch: owner !== w.space, owner: owner === w.space && !w.member, pay, purge: env.PURGE === '1', purged: gone,
      plans: { plus: PLAN_MB(env, 'plus') * MB, max: PLAN_MB(env, 'max') * MB } });
  }
  // les actions suivantes : le propriétaire du carnet seulement (jamais un compagnon, jamais un dossier branché)
  if (w.member) return json({ error: 'Réservé au propriétaire du carnet (code administrateur) — Owner only' }, 403);
  const isKid = await env.DB.prepare('SELECT owner FROM space_links WHERE child = ?1').bind(w.space).first();
  if (isKid) return json({ error: 'Utilise ton code administrateur (celui de ton carnet), pas le code d’un voyage. — Use your admin code.' }, 403);

  if (a === 'link') {
    if (!rate(request, 'pl', 120)) return json({ error: 'Trop de demandes' }, 429);
    const kids = (Array.isArray(b.kids) ? b.kids : []).filter(t => typeof t === 'string' && t.length >= 16 && t.length <= 128).slice(0, 200);
    const n0 = await env.DB.prepare('SELECT COUNT(*) AS n FROM space_links WHERE owner = ?1').bind(w.space).first();
    let linked = 0, taken = 0, room = 1000 - ((n0 && n0.n) || 0); const out = {};
    for (const t of kids) {
      const child = await sha256('carnet-voyage:' + t);
      if (child === w.space) { out[t.slice(0, 8)] = 'self'; continue; }
      const cur = await env.DB.prepare('SELECT owner FROM space_links WHERE child = ?1').bind(child).first();
      if (cur) { if (cur.owner === w.space) linked++; else taken++; continue; }
      const sub = await env.DB.prepare('SELECT 1 AS x FROM space_links WHERE owner = ?1 LIMIT 1').bind(child).first();
      if (sub || room <= 0) { taken++; continue; }   // un autre carnet complet (il a ses propres branches) ne se branche pas
      await env.DB.prepare('INSERT INTO space_links (child, owner, at) VALUES (?1, ?2, ?3) ON CONFLICT (child) DO NOTHING').bind(child, w.space, Date.now()).run();
      linked++; room--;
    }
    return json({ ok: true, linked, taken });
  }
  if (a === 'redeem') {
    if (!rate(request, 'pg', 20)) return json({ error: 'Trop d’essais : réessaie dans une heure.' }, 429);
    const g = giftNorm(b.gift); if (g.length < 8) return json({ error: 'Code cadeau invalide' }, 400);
    const gh = await sha256('vz-gift:' + g);
    const row = await env.DB.prepare('SELECT plan, mb, days, uses, used, revoked FROM gifts WHERE gh = ?1').bind(gh).first();
    if (!row || row.revoked) return json({ error: 'Code cadeau inconnu ou retiré — Unknown gift code' }, 404);
    const done = await env.DB.prepare('SELECT 1 AS x FROM gift_uses WHERE gh = ?1 AND space = ?2').bind(gh, w.space).first();
    if (done) return json({ error: 'Ce code cadeau est déjà utilisé sur ce carnet — Already used on this notebook' }, 409);
    if (row.uses > 0 && row.used >= row.uses) return json({ error: 'Ce code cadeau a déjà servi — This gift code has been used up' }, 410);
    const now = Date.now(), cur = await env.DB.prepare('SELECT plan, mb, until, src FROM plans WHERE space = ?1').bind(w.space).first();
    const curOn = cur && (!cur.until || cur.until > now);
    const mb = row.mb, until = row.days > 0 ? Math.max(now, curOn && cur.until ? cur.until : now) + row.days * DAY : 0;
    // un abonnement payant en cours plus grand reste en place : le cadeau ne le remplace pas
    if (curOn && cur.src === 'stripe' && (cur.mb < 0 || (mb >= 0 && cur.mb >= mb))) return json({ error: 'Ton abonnement en cours offre déjà autant de place — Your current plan already gives as much space' }, 409);
    await env.DB.batch([
      env.DB.prepare('INSERT INTO plans (space, plan, mb, until, src, ref, cust, at) VALUES (?1, ?2, ?3, ?4, \'gift\', ?5, \'\', ?6) ON CONFLICT (space) DO UPDATE SET plan = ?2, mb = ?3, until = ?4, src = \'gift\', ref = ?5, at = ?6').bind(w.space, row.plan, mb, until, gh.slice(0, 12), now),
      env.DB.prepare('UPDATE gifts SET used = used + 1 WHERE gh = ?1').bind(gh),
      env.DB.prepare('INSERT INTO gift_uses (gh, space, at) VALUES (?1, ?2, ?3)').bind(gh, w.space, now),
    ]);
    const q = await quotaOf(env, w.space);
    return json({ ok: true, plan: row.plan, until, quota: q.quota, used: q.used });
  }
  if (a === 'checkout' || a === 'portal') {
    if (!pay || !env.STRIPE_SECRET) return json({ error: 'Les abonnements ne sont pas encore ouverts — Subscriptions are not open yet', closed: true }, 503);
    const origin = new URL(request.url).origin, back = String(b.back || '').split('#')[0];   // retour toujours vers l’appli elle-même (vezoria.pages.dev), jamais ailleurs
    const base = back.startsWith(origin + '/') ? back : (env.APP_URL || origin + '/');
    if (a === 'portal') {
      const p = await env.DB.prepare('SELECT cust FROM plans WHERE space = ?1').bind(w.space).first();
      if (!p || !p.cust) return json({ error: 'Aucun abonnement Stripe sur ce carnet' }, 404);
      const s = await stripe(env, 'billing_portal/sessions', { customer: p.cust, return_url: base });
      return json({ url: s.url });
    }
    const plan = b.plan === 'max' ? 'max' : 'plus', period = b.period === 'month' ? 'month' : 'year';
    const price = env['STRIPE_PRICE_' + plan.toUpperCase() + '_' + (period === 'month' ? 'M' : 'Y')];
    if (!price) return json({ error: 'Formule pas encore configurée' }, 503);
    const s = await stripe(env, 'checkout/sessions', { mode: 'subscription', 'line_items[0][price]': price, 'line_items[0][quantity]': 1,
      client_reference_id: w.space, 'metadata[space]': w.space, 'metadata[plan]': plan, 'metadata[period]': period,
      'subscription_data[metadata][space]': w.space, 'subscription_data[metadata][plan]': plan,
      success_url: base + '#abonnement=ok', cancel_url: base + '#abonnement=annule', allow_promotion_codes: 'true' });
    return json({ url: s.url });
  }
  return json({ error: 'action inconnue' }, 400);
}
