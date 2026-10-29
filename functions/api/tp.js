// Cloudflare Pages Function — ✈️ PRIX DES VOLS (Aviasales Data API, via Travelpayouts)
// Emplacement : functions/api/tp.js  →  /api/tp
//
// Appels :
//   /api/tp?op=tours&city=Rome&lang=fr   → visites audio WeGoTrip de la ville (API publique, sans clé), avec prix et note
//   /api/tp?op=flight&olat=47.22&olng=-1.55&dlat=41.9&dlng=12.48&date=2026-12-12[&ret=2026-12-19]
//   → { ok, o:'NTE', d:'ROM', on:'Nantes', dn:'Rome', price:89, currency:'EUR', at:'2026-12-12T07:05:00+01:00',
//       transfers:0, airline:'FR', exact:true, link:'https://www.aviasales.com/search/…', search:'https://www.aviasales.com/search/NTE1212ROM1' }
//
// · L'appli envoie seulement les positions des deux villes et la date : rien sur l'utilisateur.
// · Le jeton TP_TOKEN (secret Cloudflare du projet) ne quitte jamais le serveur.
// · Les prix viennent du cache d'Aviasales (recherches des derniers jours) : ce sont des prix « dès », indicatifs.
// · Réponses gardées 6 h au bord du réseau Cloudflare : peu d'appels à Travelpayouts.

const H = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*' };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: s === 200 ? H : { ...H, 'Cache-Control': 'no-store' } });
const num = x => { const n = parseFloat(x); return Number.isFinite(n) ? n : null; };
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// limite par connexion, en mémoire (l'adresse IP n'est jamais gardée ailleurs)
const MEM = new Map();
function rateOk(request, limit) {
  const hour = Math.floor(Date.now() / 3600e3), k = request.headers.get('CF-Connecting-IP') || '', r = MEM.get(k);
  if (MEM.size > 20000) MEM.clear();
  const n = (r && r.hour === hour ? r.n : 0) + 1; MEM.set(k, { hour, n }); return n <= limit;
}
function km(a, b, c, d) {
  const R = 6371, r = x => x * Math.PI / 180, dLa = r(c - a), dLo = r(d - b);
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// villes qui ont un aéroport (liste officielle Travelpayouts), réduite à [code, lat, lon, nom] et gardée en mémoire
let CITIES = null, citiesAt = 0;
async function cities() {
  if (CITIES && Date.now() - citiesAt < 864e5) return CITIES;
  const r = await fetch('https://api.travelpayouts.com/data/en/cities.json', { cf: { cacheTtl: 86400, cacheEverything: true } });
  if (!r.ok) throw new Error('cities ' + r.status);
  const all = await r.json();
  CITIES = all.filter(c => c && c.has_flightable_airport && c.code && c.coordinates && (c.coordinates.lat || c.coordinates.lon))
    .map(c => [c.code, +c.coordinates.lat, +c.coordinates.lon, c.name || c.code]);
  citiesAt = Date.now(); return CITIES;
}
// la ville avec aéroport la plus proche (180 km au plus : au-delà, on ne devine pas)
function nearest(list, lat, lng) {
  let best = null, bd = 181;
  for (const c of list) { if (Math.abs(c[1] - lat) > 2.5) continue; const d = km(lat, lng, c[1], c[2]); if (d < bd) { bd = d; best = c; } }
  return best ? { code: best[0], name: best[3], km: Math.round(bd) } : null;
}

async function prices(env, o, d, dep, ret) {
  const q = new URLSearchParams({ origin: o, destination: d, departure_at: dep, currency: 'eur', sorting: 'price', limit: '5', one_way: ret ? 'false' : 'true', market: 'fr' });
  if (ret) q.set('return_at', ret);
  const r = await fetch('https://api.travelpayouts.com/aviasales/v3/prices_for_dates?' + q, {
    headers: { 'X-Access-Token': env.TP_TOKEN, 'Accept': 'application/json' }, cf: { cacheTtl: 21600, cacheEverything: true } });
  if (!r.ok) return [];
  const j = await r.json().catch(() => null);
  return j && j.success && Array.isArray(j.data) ? j.data.filter(x => x && x.price > 0) : [];
}
const ddmm = s => s.slice(8, 10) + s.slice(5, 7);

/* ── 🎧 WeGoTrip : visites audio d'une ville (doc partenaire : app.wegotrip.com/api/v2) ── */
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
async function wgt(path, lang) {
  const r = await fetch('https://app.wegotrip.com/api/v2' + path, { headers: { 'Accept': 'application/json', 'Accept-Language': lang }, cf: { cacheTtl: 86400, cacheEverything: true } });
  if (!r.ok) return null; return r.json().catch(() => null);
}
const listOf = j => { const d = j && (j.data !== undefined ? j.data : j); return Array.isArray(d) ? d : d && Array.isArray(d.results) ? d.results : []; };
// toutes les villes repérées dans une réponse de recherche (villes, produits, attractions), quelle que soit sa forme
function citiesIn(j) {
  const out = new Map(), add = c => { if (c && c.id != null && c.name && c.slug) out.set(String(c.id), { id: c.id, name: c.name, slug: c.slug }); };
  const walk = (x, key, depth) => { if (!x || depth > 4) return;
    if (Array.isArray(x)) { x.forEach(y => walk(y, key, depth + 1)); return; }
    if (typeof x !== 'object') return;
    if (/cit/i.test(key || '') || x.type === 'city') add(x);
    if (x.city && typeof x.city === 'object') add(x.city);
    for (const k of Object.keys(x)) if (typeof x[k] === 'object') walk(x[k], k, depth + 1); };
  walk(j, '', 0); return [...out.values()];
}
async function tours(city, lang) {
  const q = norm(city); if (q.length < 3) return { ok: true, tours: [] };
  const s = await wgt(`/search/?query=${encodeURIComponent(city)}&currency=EUR`, lang);
  const C = citiesIn(s), c = C.find(x => norm(x.name) === q) || C.find(x => norm(x.name).startsWith(q) || q.startsWith(norm(x.name)));
  if (!c) return { ok: true, tours: [] };
  const P = listOf(await wgt(`/products/popular/?city=${c.id}&lang=${lang}&currency=EUR&page=1`, lang));
  const T = P.filter(p => p && p.id && p.slug && p.title).slice(0, 6).map(p => {
    const ci = p.city && p.city.slug ? p.city : c;
    return { id: p.id, title: String(p.title).slice(0, 140), price: +p.price || null, was: +p.exprice || null, currency: p.currencyCode || 'EUR',
      rating: +p.rating || null, reviews: +p.reviewsCount || 0, duration: p.duration || '', img: p.preview || p.cover || '',
      url: `https://wegotrip.com/${ci.slug}-d${ci.id}/${p.slug}-p${p.id}/` };
  });
  return { ok: true, city: { id: c.id, name: c.name }, tours: T };
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: H });
  const p = new URL(request.url).searchParams;
  if (p.get('op') === 'tours') {
    if (!rateOk(request, 300)) return json({ ok: false, error: 'trop de demandes, réessaie dans une heure' }, 429);
    const city = String(p.get('city') || '').slice(0, 80), lang = /^[a-z]{2}$/.test(p.get('lang') || '') ? p.get('lang') : 'en';
    try { return json(await tours(city, lang)); } catch (e) { return json({ ok: false, error: 'service indisponible' }, 502); }
  }
  if (p.get('op') !== 'flight') return json({ ok: false, error: 'op inconnue' }, 400);
  if (!env.TP_TOKEN) return json({ ok: false, error: 'TP_TOKEN manquant' }, 503);
  if (!rateOk(request, 150)) return json({ ok: false, error: 'trop de demandes, réessaie dans une heure' }, 429);
  const olat = num(p.get('olat')), olng = num(p.get('olng')), dlat = num(p.get('dlat')), dlng = num(p.get('dlng'));
  const date = p.get('date') || '', ret = p.get('ret') || '';
  if ([olat, olng, dlat, dlng].some(v => v == null || Math.abs(v) > 180) || !DATE.test(date) || (ret && !DATE.test(ret))) return json({ ok: false, error: 'paramètres invalides' }, 400);
  try {
    const L = await cities(), o = nearest(L, olat, olng), d = nearest(L, dlat, dlng);
    if (!o || !d) return json({ ok: false, why: 'aeroport' });
    if (o.code === d.code) return json({ ok: false, why: 'meme' });
    const base = { o: o.code, d: d.code, on: o.name, dn: d.name, search: `https://www.aviasales.com/search/${o.code}${ddmm(date)}${d.code}${ret ? ddmm(ret) : ''}1` };
    // 1) le jour exact, 2) sinon le mois (même logique pour le retour)
    let L1 = await prices(env, o.code, d.code, date, ret), exact = true;
    if (!L1.length) { L1 = await prices(env, o.code, d.code, date.slice(0, 7), ret ? ret.slice(0, 7) : ''); exact = false; }
    if (!L1.length) return json({ ok: true, found: false, ...base });
    const b = L1[0];
    return json({ ok: true, found: true, exact, price: Math.round(b.price), currency: 'EUR', at: b.departure_at || '', back: b.return_at || '',
      transfers: b.transfers ?? null, airline: b.airline || '', link: b.link ? 'https://www.aviasales.com' + (b.link.startsWith('/') ? '' : '/') + b.link : base.search, ...base });
  } catch (e) {
    return json({ ok: false, error: 'service indisponible' }, 502);
  }
}
