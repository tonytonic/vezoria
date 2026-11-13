// Cloudflare Pages Function — 🔗 LIRE UN LIEN COLLÉ (Google Maps, TikTok, Instagram, YouTube, sites)
// Emplacement : functions/api/unfurl.js  →  /api/unfurl?u=<lien>
//
// L'appli ne peut pas suivre un lien court (maps.app.goo.gl, vm.tiktok.com) ni lire une page d'un autre site :
// cette fonction le fait côté serveur et renvoie ce qu'il faut pour retrouver le lieu :
//   {ok, url, name, lat, lng, title, desc, author, site}
// Gratuit, sans clé. Mis en cache 1 jour.

const H = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=86400" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });
const UA = "Mozilla/5.0 (compatible; Vezoria/1.0; +https://vezoria.pages.dev)";
// seulement des sites connus (pas un relais ouvert vers n'importe quelle adresse)
// 🛡️ l'extension du site est limitée à une vraie extension de pays (google.fr, google.co.uk, google.com.br…) :
//    avant, « google.n-importe-quoi.com » passait, et le serveur allait lire la page d'un inconnu.
const TLD = "(?:[a-z]{2,3}|com?\\.[a-z]{2})";
const OK = new RegExp("(^|\\.)(google\\." + TLD + "|goo\\.gl|tiktok\\.com|instagram\\.com|youtube\\.com|youtu\\.be|facebook\\.com|fb\\.watch|tripadvisor\\." + TLD + "|booking\\.com|airbnb\\." + TLD + "|wikipedia\\.org|openstreetmap\\.org|apple\\.com|bing\\.com|yelp\\." + TLD + "|thefork\\." + TLD + "|lafourchette\\.com|getyourguide\\." + TLD + "|viator\\.com|komoot\\." + TLD + "|alltrails\\.com|pinterest\\." + TLD + "|pin\\.it)$", "i");

const dec = s => String(s || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).trim();
const meta = (html, k) => { const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]*content=["']([^"']*)["']`, "i")) || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${k}["']`, "i")); return m ? dec(m[1]) : ""; };

// coordonnées et nom dans une adresse Google Maps
function gmaps(u) {
  const out = {}; let s = u; try { s = decodeURIComponent(u); } catch (e) {}
  let m = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/); if (m) { out.lat = +m[1]; out.lng = +m[2]; }
  if (out.lat == null) { m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/); if (m) { out.lat = +m[1]; out.lng = +m[2]; } }
  if (out.lat == null) { m = s.match(/[?&](?:q|query|ll|destination|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/); if (m) { out.lat = +m[1]; out.lng = +m[2]; } }
  m = s.match(/\/place\/([^/@?]+)/); if (m) out.name = m[1].replace(/\+/g, " ").trim();
  if (!out.name) { m = s.match(/[?&](?:q|query)=([^&]+)/); if (m && !/^-?\d+\.\d+,/.test(m[1])) out.name = m[1].replace(/\+/g, " ").trim(); }
  return out;
}

// 🛡️ limite par connexion, en mémoire (l'adresse IP n'est gardée nulle part) : sans elle, n'importe qui pouvait faire lire des pages
//    (ou lancer des recherches avec la clé du partenaire) par le serveur, des milliers de fois, et user le forfait du mois.
const MEM = new Map();
function rateOk(request, limit) {
  const hour = Math.floor(Date.now() / 3600e3), k = request.headers.get("CF-Connecting-IP") || "", r = MEM.get(k);
  if (MEM.size > 20000) MEM.clear();
  const n = (r && r.hour === hour ? r.n : 0) + 1; MEM.set(k, { hour, n }); return n <= limit;
}
export async function onRequest({ request }) {
  if (request.method === "OPTIONS") return new Response(null, { headers: { ...H, "Access-Control-Allow-Methods": "GET, OPTIONS" } });
  if (!rateOk(request, 60)) return new Response(JSON.stringify({ ok: false, error: "trop de demandes, réessaie dans une heure" }), { status: 429, headers: { ...H, "Cache-Control": "no-store" } });
  let u = new URL(request.url).searchParams.get("u") || "";
  u = (u.match(/https?:\/\/\S+/) || [""])[0].replace(/[)\].,;]+$/, "");
  let url; try { url = new URL(u); } catch (e) { return json({ ok: false, error: "lien" }, 400); }
  if (!/^https?:$/.test(url.protocol) || !OK.test(url.hostname)) return json({ ok: false, error: "site" }, 400);

  const cache = caches.default, ck = new Request("https://vz-unfurl.cache/" + encodeURIComponent(url.href));
  const hit = await cache.match(ck); if (hit) return hit;

  // les liens courts : on suit les redirections (5 au plus), toujours vers un site connu
  let cur = url.href;
  for (let i = 0; i < 5; i++) {
    let r; try { r = await fetch(cur, { redirect: "manual", headers: { "User-Agent": UA, "Accept-Language": "fr,en;q=0.8" } }); } catch (e) { break; }
    const loc = r.status >= 300 && r.status < 400 ? r.headers.get("location") : null; if (!loc) break;
    const nx = new URL(loc, cur); if (!OK.test(nx.hostname)) break; cur = nx.href;
  }
  const fin = new URL(cur), out = { ok: true, url: cur, site: fin.hostname.replace(/^www\./, "") };

  if (/google\.|goo\.gl/.test(fin.hostname)) Object.assign(out, gmaps(cur));

  // TikTok / YouTube : la légende par oEmbed (public, sans clé)
  try {
    if (/tiktok\.com$/.test(fin.hostname)) { const j = await (await fetch("https://www.tiktok.com/oembed?url=" + encodeURIComponent(cur), { headers: { "User-Agent": UA } })).json(); out.title = j.title || ""; out.author = j.author_name || ""; }
    else if (/youtube\.com$|youtu\.be$/.test(fin.hostname)) { const j = await (await fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent(cur), { headers: { "User-Agent": UA } })).json(); out.title = j.title || ""; out.author = j.author_name || ""; }
  } catch (e) {}

  // les autres (et en secours) : le titre et la description de la page
  if (out.lat == null && !out.title) {
    try {
      // 🛡️ (14/11) sans suivre de redirection : avant, cette dernière lecture suivait toute seule une redirection vers
      //    N'IMPORTE QUEL site (ex. lien google.com/url?q=… → site inconnu), et le serveur servait de relais.
      const r = await fetch(cur, { redirect: "manual", headers: { "User-Agent": UA, "Accept-Language": "fr,en;q=0.8" } });
      const html = r.status >= 300 && r.status < 400 ? "" : (await r.text()).slice(0, 400000);
      out.title = meta(html, "og:title") || dec((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1]);
      out.desc = meta(html, "og:description") || meta(html, "description");
      const la = meta(html, "place:location:latitude") || meta(html, "og:latitude"), lo = meta(html, "place:location:longitude") || meta(html, "og:longitude");
      if (la && lo && isFinite(+la) && isFinite(+lo)) { out.lat = +la; out.lng = +lo; }
      if (/google\./.test(fin.hostname) && out.lat == null) { const m = html.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/); if (m) { out.lat = +m[1]; out.lng = +m[2]; } }
    } catch (e) {}
  }
  ["title", "desc", "author", "name"].forEach(k => { if (out[k]) out[k] = String(out[k]).slice(0, 600); });
  const res = json(out); try { await cache.put(ck, res.clone()); } catch (e) {}
  return res;
}
