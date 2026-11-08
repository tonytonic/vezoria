// Cloudflare Pages Function — 🎟️ ACTIVITÉS À RÉSERVER (Viator Partner API, accès « affilié »)
// Emplacement : functions/api/act.js  →  /api/act?q=Lausanne&lang=fr&cur=EUR
//
// Visites guidées, excursions, billets coupe-file, croisières, cours de cuisine… dans 200 000 activités.
// Gratuit : la clé s'obtient en créant un compte affilié Viator (accès « Basic » immédiat).
// Les liens renvoyés (productUrl) portent le code affilié : une commission par réservation, sans surcoût.
//
// Variables Cloudflare (Settings → Variables and Secrets) :
//   VIATOR_KEY   la clé API (secret)
// Paramètres facultatifs : from / to (AAAA-MM-JJ) = dates de l’étape.
//   VIATOR_BASE  facultatif : https://api.sandbox.viator.com/partner pour les essais
// Sans clé : {ok:false, reason:'nokey'} et l'appli continue sans (rien ne casse).

const H = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=utf-8" };
const json = (o, s = 200, cache = 0) => new Response(JSON.stringify(o), { status: s, headers: { ...H, "Cache-Control": cache ? "public, max-age=" + cache : "no-store" } });
// langues ouvertes aux partenaires affiliés (doc Viator Partner API 2.0) ; les autres (ru, tr, ar, hi, zh, ko…) → anglais
const LANGS = { fr: "fr", en: "en", es: "es", de: "de", it: "it", pt: "pt", nl: "nl", ja: "ja", da: "da", no: "no", sv: "sv" };
const CURS = new Set(["AED", "ARS", "AUD", "BRL", "CAD", "CHF", "CLP", "CNY", "COP", "DKK", "EUR", "FJD", "GBP", "HKD", "IDR", "ILS", "INR", "ISK", "JPY", "KRW", "MXN", "MYR", "NOK", "NZD", "PEN", "PHP", "PLN", "SEK", "SGD", "THB", "TRY", "TWD", "USD", "VND", "ZAR"]);
const ymd = s => /^\d{4}-\d{2}-\d{2}$/.test(s || "") ? s : "";

const dur = d => { if (!d) return ""; const m = d.fixedDurationInMinutes || d.variableDurationFromMinutes || 0, m2 = d.variableDurationToMinutes || 0;
  const f = x => x >= 1440 ? Math.round(x / 1440) + " j" : x >= 60 ? (Math.round(x / 30) / 2).toString().replace(".", ",") + " h" : x + " min";
  return m ? (m2 && m2 !== m ? f(m) + "–" + f(m2) : f(m)) : ""; };
const img = p => { const im = (p.images || []).find(i => i.isCover) || (p.images || [])[0]; const v = ((im && im.variants) || []).filter(v => v.width >= 400).sort((a, b) => a.width - b.width)[0] || ((im && im.variants) || []).slice(-1)[0]; return v ? v.url : ""; };

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return new Response(null, { headers: { ...H, "Access-Control-Allow-Methods": "GET, OPTIONS" } });
  const p = new URL(request.url).searchParams, q = (p.get("q") || "").trim().slice(0, 80);
  if (q.length < 2) return json({ ok: false, error: "q" }, 400);
  if (!env.VIATOR_KEY) return json({ ok: false, reason: "nokey" }, 200, 3600);
  const lang = LANGS[(p.get("lang") || "fr").slice(0, 2)] || "en", cur = CURS.has((p.get("cur") || "").toUpperCase()) ? p.get("cur").toUpperCase() : "EUR";
  const n = Math.min(20, Math.max(3, +p.get("n") || 12));
  // 📅 les dates de l’étape : seulement les activités qu’on peut réserver ces jours-là (jamais dans le passé)
  const today = new Date().toISOString().slice(0, 10); let from = ymd(p.get("from")), to = ymd(p.get("to"));
  const lim = new Date(Date.now() + 360 * 864e5).toISOString().slice(0, 10);   // Viator : pas plus d’un an à l’avance
  if (from && from < today) from = today; if (from > lim) { from = ""; to = ""; } if (to && (to < from || to < today || !from)) to = ""; if (to > lim) to = lim;

  const cache = caches.default, ck = new Request(`https://vz-act.cache/${encodeURIComponent(q.toLowerCase())}/${lang}/${cur}/${n}/${from}/${to}`);
  const hit = await cache.match(ck); if (hit) return hit;

  const base = env.VIATOR_BASE || "https://api.viator.com/partner";
  let j;
  try {
    const body = { searchTerm: q, currency: cur, productSorting: { sort: "DEFAULT" }, searchTypes: [{ searchType: "PRODUCTS", pagination: { start: 1, count: n } }] };
    if (from) body.productFiltering = { searchTerm: q, dateRange: to ? { from, to } : { from } };
    const call = b => fetch(base + "/search/freetext?campaign-value=vezoria", { method: "POST", headers: { "exp-api-key": env.VIATOR_KEY, "Accept-Language": lang, "Accept": "application/json;version=2.0", "Content-Type": "application/json" },
      body: JSON.stringify(b) });
    let r = await call(body);
    if (!r.ok && r.status === 400 && body.productFiltering) { delete body.productFiltering; r = await call(body); }   // dates refusées : sans filtre de dates
    if (!r.ok) return json({ ok: false, error: "viator " + r.status, detail: (await r.text()).slice(0, 300) }, 502);
    j = await r.json();
  } catch (e) { return json({ ok: false, error: "viator" }, 502); }

  const L = ((j.products && j.products.results) || []).map(x => ({
    id: x.productCode, title: x.title || "", img: img(x),
    price: x.pricing && x.pricing.summary ? (x.pricing.summary.fromPrice ?? null) : null, currency: (x.pricing && x.pricing.currency) || cur,
    rating: x.reviews ? x.reviews.combinedAverageRating || null : null, reviews: x.reviews ? x.reviews.totalReviews || 0 : 0,
    duration: dur(x.duration), url: x.productUrl || "", flags: x.flags || [] })).filter(x => x.id && x.title && x.url);
  const res = json({ ok: true, src: "viator", tours: L }, 200, 86400);
  try { await cache.put(ck, res.clone()); } catch (e) {}
  return res;
}
