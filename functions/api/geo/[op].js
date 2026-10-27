/**
 * Vezoria — recherche d'adresses (géocodage) passée par le serveur.
 *
 *   GET /api/geo/search?q=…&accept-language=fr&limit=1&addressdetails=1&extratags=1&viewbox=…&bounded=1
 *   GET /api/geo/reverse?lat=…&lon=…&zoom=10&accept-language=fr
 *
 * Pourquoi : Nominatim (OpenStreetMap) autorise 1 requête par seconde pour TOUTE l'appli, demande
 * une appli identifiée, un cache, et de pouvoir couper le service sans mise à jour.
 *   1. Cache : chaque réponse est gardée (cache Cloudflare + table D1 « geo_cache », 60 jours).
 *   2. 1 requête par seconde au plus vers Nominatim, tous utilisateurs confondus (créneau en D1).
 *   3. Créneau pris, refus ou panne de Nominatim → Photon (komoot), converti au même format.
 *   4. Coupure à distance, sans redéployer : POST /api/admin {action:'geo', mode:'on'|'photon'|'off'}
 *      (ou variable GEO_MODE du projet Cloudflare, prioritaire).
 * Aucune donnée de voyage ici : seulement le nom cherché ou des coordonnées arrondies.
 * L'adresse IP n'est jamais gardée (seule une empreinte horaire sert à limiter les abus).
 */
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const json = (o, s = 200, cache = 0) => new Response(typeof o === 'string' ? o : JSON.stringify(o), {
  status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache ? 'public, max-age=' + cache : 'no-store', ...CORS } });
const TTL = 60 * 864e5;   // 60 jours
const UA = 'Vezoria/1.0 (travel journal app; https://vezoria.pages.dev)';

let ready = false, cfg = null, cfgAt = 0;
async function tables(db) {
  if (ready) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS geo_cache (k TEXT PRIMARY KEY, v TEXT NOT NULL, at INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS geo_slot (k TEXT PRIMARY KEY, t INTEGER NOT NULL)'),
    db.prepare("INSERT OR IGNORE INTO geo_slot (k, t) VALUES ('n', 0)"),
    db.prepare('CREATE TABLE IF NOT EXISTS cfg (k TEXT PRIMARY KEY, v TEXT NOT NULL)'),
  ]);
  ready = true;
}
async function mode(env) {
  if (env.GEO_MODE) return String(env.GEO_MODE);
  if (cfg !== null && Date.now() - cfgAt < 60e3) return cfg;
  try { const r = await env.DB.prepare("SELECT v FROM cfg WHERE k = 'geo'").first(); cfg = r ? r.v : 'on'; } catch (e) { cfg = 'on'; }
  cfgAt = Date.now(); return cfg;
}
// ── limite par connexion (empreinte de l'IP, jamais l'adresse) ──
// compteur en mémoire (plus d'écriture D1 à chaque recherche : la base gratuite n'accepte que 100 000 écritures par jour)
const MEM = new Map();
async function rateIp(env, request, limit) {
  const ip = request.headers.get('CF-Connecting-IP') || '', hour = Math.floor(Date.now() / 3600e3), k = ip, r = MEM.get(k);
  if (MEM.size > 20000) MEM.clear();
  const n = (r && r.hour === hour ? r.n : 0) + 1; MEM.set(k, { hour, n }); return n <= limit;
  try {
    const ip = request.headers.get('CF-Connecting-IP') || ''; if (!ip) return true;
    const hour = Math.floor(Date.now() / 3600e3);
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('vz-ip:' + ip + ':geo'));
    const key = [...new Uint8Array(d)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS rate_ip (k TEXT PRIMARY KEY, hour INTEGER NOT NULL, n INTEGER NOT NULL)').run();
    const r = await env.DB.prepare('INSERT INTO rate_ip (k, hour, n) VALUES (?1, ?2, 1) ON CONFLICT (k) DO UPDATE SET n = CASE WHEN rate_ip.hour = ?2 THEN rate_ip.n + 1 ELSE 1 END, hour = ?2 RETURNING n').bind(key, hour).first();
    return !r || r.n <= limit;
  } catch (e) { return true; }
}
// ── créneau global : 1 appel Nominatim par seconde pour toute l'appli ──
async function slot(env) {
  const now = Date.now();
  try { const r = await env.DB.prepare("UPDATE geo_slot SET t = ?1 WHERE k = 'n' AND t <= ?2").bind(now, now - 1050).run(); return !!(r.meta && r.meta.changes); }
  catch (e) { return false; }
}

// paramètres acceptés, normalisés pour que le cache serve au plus grand nombre
function clean(op, sp) {
  const lang = (sp.get('accept-language') || 'fr').toLowerCase().replace(/[^a-z-]/g, '').slice(0, 5) || 'fr';
  const p = new URLSearchParams({ format: 'jsonv2', 'accept-language': lang });
  if (op === 'search') {
    const q = (sp.get('q') || '').trim().replace(/\s+/g, ' ').slice(0, 200); if (!q) return null;
    p.set('q', q); p.set('limit', String(Math.min(5, Math.max(1, +sp.get('limit') || 1))));
    if (sp.get('addressdetails') === '1') p.set('addressdetails', '1');
    if (sp.get('extratags') === '1') p.set('extratags', '1');
    const vb = (sp.get('viewbox') || '').split(',').map(Number);
    if (vb.length === 4 && vb.every(Number.isFinite)) { p.set('viewbox', vb.map(n => n.toFixed(3)).join(',')); if (sp.get('bounded') === '1') p.set('bounded', '1'); }
  } else {
    const lat = +sp.get('lat'), lon = +sp.get('lon'); if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    const zoom = Math.min(18, Math.max(3, Math.round(+sp.get('zoom') || 18)));
    const dec = zoom <= 10 ? 2 : zoom <= 14 ? 3 : 4;   // ville : ~1 km suffit · quartier : ~100 m
    p.set('lat', lat.toFixed(dec)); p.set('lon', lon.toFixed(dec)); p.set('zoom', String(zoom)); p.set('addressdetails', '1');
  }
  return p;
}

// ── Photon (komoot) → même forme que Nominatim (lat, lon, address, extratags) ──
const PH_LANG = ['de', 'en', 'fr'];
function phToNom(f, op) {
  const P = f.properties || {}, [lon, lat] = (f.geometry && f.geometry.coordinates) || [];
  const place = P.osm_key === 'place' ? P.osm_value : P.type;
  const a = {};
  const city = P.city || (['city', 'town', 'village', 'hamlet', 'municipality'].includes(place) ? P.name : '');
  if (city) a[['town', 'village'].includes(place) && !P.city ? place : 'city'] = city;
  if (P.district) a.suburb = P.district;
  if (P.locality) a.neighbourhood = P.locality;
  if (P.county) a.county = P.county;
  if (P.state) a.state = P.state;
  if (P.postcode) a.postcode = P.postcode;
  if (P.street) a.road = P.street;
  if (P.country) a.country = P.country;
  if (P.countrycode) a.country_code = String(P.countrycode).toLowerCase();
  const name = P.name || city || '';
  return { lat: String(lat), lon: String(lon), name, addresstype: P.type || place || '', display_name: [...new Set([name, city, P.state, P.country].filter(Boolean))].join(', '),
    category: P.osm_key || '', type: P.osm_value || '', address: a, extratags: {}, source: 'photon' };
}
async function photon(op, p, ac, onlyC, near) {
  const lg = (p.get('accept-language') || 'en').slice(0, 2), lang = PH_LANG.includes(lg) ? lg : 'en';
  const qs = new URLSearchParams({ q: p.get('q'), limit: p.get('limit') || '1', lang });
  // 🔎 saisie en cours : seulement des villes, régions et pays (pas de rues), mots incomplets acceptés
  if (ac) (onlyC ? ['country'] : ['city', 'locality', 'district', 'county', 'state', 'country']).forEach(l => qs.append('layer', l));
  if (ac && near) { qs.set('lat', near.lat); qs.set('lon', near.lon); qs.set('zoom', '7'); qs.set('location_bias_scale', '0.1'); }   // 🎯 priorité aux lieux du pays tapé
  const u = op === 'search' ? 'https://photon.komoot.io/api/?' + qs
    : 'https://photon.komoot.io/reverse?' + new URLSearchParams({ lat: p.get('lat'), lon: p.get('lon'), lang });
  let r = await fetch(u, { headers: { 'User-Agent': UA }, cf: { cacheTtl: 86400 } });
  if (!r.ok && ac) r = await fetch('https://photon.komoot.io/api/?' + new URLSearchParams({ q: p.get('q'), limit: p.get('limit') || '1', lang }), { headers: { 'User-Agent': UA }, cf: { cacheTtl: 86400 } });
  if (!r.ok) throw new Error('photon ' + r.status);
  const j = await r.json(), F = (j && j.features) || [];
  if (op === 'reverse') return F[0] ? phToNom(F[0], op) : { error: 'Unable to geocode' };
  return F.map(f => phToNom(f, op));
}
async function nominatim(op, p, env) {
  const h = { 'User-Agent': UA, 'Referer': 'https://vezoria.pages.dev/' };
  if (env.CONTACT) p.set('email', String(env.CONTACT));
  const r = await fetch('https://nominatim.openstreetmap.org/' + op + '?' + p, { headers: h });
  p.delete('email');
  if (!r.ok) throw new Error('nominatim ' + r.status);
  return r.json();
}

export async function onRequest({ request, env, params, waitUntil }) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'GET') return json({ error: 'GET' }, 405);
  const op = String(params.op || '');
  if (op !== 'search' && op !== 'reverse') return json({ error: 'op' }, 404);
  const p = clean(op, new URL(request.url).searchParams); if (!p) return json(op === 'search' ? [] : { error: 'params' }, 400);
  if (!env.DB) return json({ error: 'Base D1 non liée (DB)' }, 500);
  await tables(env.DB);
  const m = await mode(env);
  if (m === 'off') return json({ error: 'off' }, 503);

  const ac = op === 'search' && new URL(request.url).searchParams.get('ac') === '1';   // propositions pendant la saisie : Photon (fait pour ça)
  const onlyC = ac && new URL(request.url).searchParams.get('pl') === 'country';   // pays seulement
  const su = new URL(request.url).searchParams, nla = +su.get('lat'), nlo = +su.get('lon');
  const near = ac && su.get('lat') && Number.isFinite(nla) && Number.isFinite(nlo) && Math.abs(nla) <= 90 && Math.abs(nlo) <= 180 ? { lat: nla.toFixed(2), lon: nlo.toFixed(2) } : null;
  const key = op + '?' + [...p.entries()].sort().map(([a, b]) => a + '=' + b).join('&') + (ac ? '&ac=1' : '') + (onlyC ? '&pl=country' : '') + (near ? '&near=' + near.lat + ',' + near.lon : '');
  const edge = caches.default, ck = new Request('https://vz-geo.cache/' + encodeURIComponent(key));
  const hit = await edge.match(ck).catch(() => null); if (hit) return json(await hit.text(), 200, 86400);
  try {
    const r = await env.DB.prepare('SELECT v, at FROM geo_cache WHERE k = ?1').bind(key).first();
    if (r && Date.now() - r.at < TTL) { waitUntil(edge.put(ck, new Response(r.v, { headers: { 'Cache-Control': 'max-age=86400' } })).catch(() => {})); return json(r.v, 200, 86400); }
  } catch (e) {}

  if (!(await rateIp(env, request, 400))) return json({ error: 'trop' }, 429);
  let out = null, viaPhoton = false;
  if (m !== 'photon' && !ac) {
    let ok = await slot(env);
    if (!ok) { await new Promise(r => setTimeout(r, 1100)); ok = await slot(env); }
    if (ok) { try { out = await nominatim(op, p, env); } catch (e) { out = null; } }
  }
  if (out === null) { try { out = await photon(op, p, ac, onlyC, near); viaPhoton = true; } catch (e) { return json({ error: 'indisponible' }, 502); } }

  const v = JSON.stringify(out);
  const empty = Array.isArray(out) ? !out.length : !!out.error;
  waitUntil((async () => {
    try {
      await env.DB.prepare('INSERT INTO geo_cache (k, v, at) VALUES (?1, ?2, ?3) ON CONFLICT (k) DO UPDATE SET v = ?2, at = ?3').bind(key, v, empty || viaPhoton ? Date.now() - TTL + 7 * 864e5 : Date.now()).run();   // vide ou Photon (moins complet) : gardé 7 jours seulement
      if (Math.random() < 0.002) await env.DB.prepare('DELETE FROM geo_cache WHERE at < ?1').bind(Date.now() - TTL).run();
      await edge.put(ck, new Response(v, { headers: { 'Cache-Control': 'max-age=86400' } }));
    } catch (e) {}
  })());
  return json(v, 200, 86400);
}
