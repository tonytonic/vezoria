// Photos du carnet : POST = envoyer une photo, GET ?id= = la récupérer.
// Stockage : Cloudflare R2 (binding « PHOTOS ») si relié, sinon la base D1 (binding « DB »).
// Les anciennes photos restées dans D1 sont toujours lues : rien n'est perdu au passage sur R2.
const MAX_PHOTO = 1_900_000;
// Garde-fous : D1 gratuit = 500 Mo par base → arrêt à 400 Mo.
// R2 : budget d'environ 15 € par mois → arrêt à 1 000 Go (10 Go gratuits + ~990 Go à 0,015 $ ≈ 14,85 $, envois compris ≈ 15 €).
// Pour changer le budget sans toucher au code : variable R2_MAX_GB dans les réglages Cloudflare (ex. 2000 pour ~30 €/mois).
const MAX_TOTAL_D1 = 400_000_000;
const R2_MAX = env => (Number(env.R2_MAX_GB) || 1000) * 1_000_000_000;
// Plafond par carnet (variable facultative SPACE_MAX_MB, 2 Go par défaut) : évite qu'un seul carnet remplisse tout
const spaceMax = env => (Number(env.SPACE_MAX_MB) || 2000) * 1_000_000;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Carnet-Code, X-Photo-Id',
  'Access-Control-Max-Age': '86400',
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function spaceOf(request, env) {
  if (!env.DB) return json({ error: 'Base D1 non liée (binding « DB » manquant)' }, 500);
  const code = (request.headers.get('X-Carnet-Code') || '').trim();
  if (code.length < 8) return json({ error: 'Code du carnet manquant' }, 400);
  if (env.SPACE_CODES) {
    const allowed = String(env.SPACE_CODES).split(',').map(s => s.trim()).filter(Boolean);
    if (!allowed.includes(code)) return json({ error: 'Code de carnet non autorisé sur ce serveur' }, 403);
  }
  const space = await sha256('carnet-voyage:' + code);
  // carnet suspendu après un signalement (voir admin.js) : plus aucune lecture ni écriture, données conservées
  try {
    const b = await env.DB.prepare('SELECT status FROM blocked WHERE space = ?1').bind(space).first();
    if (b) return json({ error: 'Ce carnet est suspendu à la suite d’un signalement. Pour contester : ' + (env.CONTACT || 'appareils.treves6g@icloud.com') + ' — This notebook is suspended following a report. To contest, write to the address above.', suspended: true }, 423);
  } catch (e) {}   // table pas encore créée : aucun carnet suspendu
  return space;
}

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
const validId = id => typeof id === 'string' && /^[\w.\-]{1,120}$/.test(id);
const r2Key = (space, id) => space + '/' + id;

// Compteur de taille totale, rangé dans D1 (clé 'total' pour D1, 'r2' pour R2)
async function getTotal(env, k) {
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS photo_stats (k TEXT PRIMARY KEY, v INTEGER NOT NULL)').run();
  const st = await env.DB.prepare('SELECT v FROM photo_stats WHERE k = ?1').bind(k).first();
  if (st) return st.v;
  let start = 0;
  if (k === 'total') {
    const s = await env.DB.prepare('SELECT COALESCE(SUM(size), 0) AS t FROM photos').first();
    start = s ? s.t : 0;
  }
  await env.DB.prepare('INSERT OR IGNORE INTO photo_stats (k, v) VALUES (?1, ?2)').bind(k, start).run();
  return start;
}

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

export async function onRequestPost({ request, env }) {
  const space = await spaceOf(request, env);
  if (space instanceof Response) return space;
  const id = request.headers.get('X-Photo-Id') || '';
  if (!validId(id)) return json({ error: 'Identifiant de photo invalide' }, 400);
  const mime = (request.headers.get('Content-Type') || 'image/jpeg').split(';')[0];
  if (!/^image\//.test(mime)) return json({ error: 'Ce n’est pas une image' }, 415);
  const buf = await request.arrayBuffer();
  if (!buf.byteLength) return json({ error: 'Photo vide' }, 400);
  if (buf.byteLength > MAX_PHOTO) return json({ error: 'Photo trop lourde' }, 413);
  if (!(await rateIp(env, request, 'ph', 30000, Math.ceil(buf.byteLength / 100_000)))) return json({ error: TOO_MANY, retry: 3600 }, 429);

  // ── R2 ──
  if (env.PHOTOS) {
    const key = r2Key(space, id);
    const total = await getTotal(env, 'r2');
    const old = await env.PHOTOS.head(key);          // photo renvoyée une 2e fois : on ne compte que la différence
    const delta = buf.byteLength - (old ? old.size : 0);
    if (total + delta > R2_MAX(env)) return json({ error: 'Stockage des photos plein', total }, 507);
    const sk = 's:' + space, mine = await getTotal(env, sk);
    if (mine + delta > spaceMax(env)) return json({ error: 'Ce carnet a atteint sa place maximale pour les photos', total: mine }, 507);
    await env.PHOTOS.put(key, buf, { httpMetadata: { contentType: mime } });
    await env.DB.batch([
      env.DB.prepare("UPDATE photo_stats SET v = v + ?1 WHERE k = 'r2'").bind(delta),
      env.DB.prepare('UPDATE photo_stats SET v = v + ?1 WHERE k = ?2').bind(delta, sk),
    ]);
    return json({ ok: true, id, size: buf.byteLength, store: 'r2' });
  }

  // ── D1 (si R2 n'est pas relié) ──
  const total = await getTotal(env, 'total');
  if (total + buf.byteLength > MAX_TOTAL_D1) return json({ error: 'Stockage des photos plein', total }, 507);
  await env.DB.batch([
    env.DB.prepare('INSERT OR REPLACE INTO photos (space, id, mime, data, size, created) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
      .bind(space, id, mime, buf, buf.byteLength, Date.now()),
    env.DB.prepare("UPDATE photo_stats SET v = v + ?1 WHERE k = 'total'").bind(buf.byteLength),
  ]);
  return json({ ok: true, id, size: buf.byteLength, store: 'd1' });
}

// Supprimer une photo (sortie d'un souvenir, souvenir ou voyage supprimé)
export async function onRequestDelete({ request, env }) {
  const space = await spaceOf(request, env);
  if (space instanceof Response) return space;
  const id = new URL(request.url).searchParams.get('id') || request.headers.get('X-Photo-Id') || '';
  if (!validId(id)) return json({ error: 'Identifiant de photo invalide' }, 400);
  let freed = 0;
  if (env.PHOTOS) {
    const key = r2Key(space, id), old = await env.PHOTOS.head(key);
    if (old) {
      freed = old.size; await env.PHOTOS.delete(key);
      await getTotal(env, 's:' + space);
      await env.DB.batch([
        env.DB.prepare("UPDATE photo_stats SET v = MAX(0, v - ?1) WHERE k = 'r2'").bind(freed),
        env.DB.prepare('UPDATE photo_stats SET v = MAX(0, v - ?1) WHERE k = ?2').bind(freed, 's:' + space),
      ]);
    }
  }
  try {
    const row = await env.DB.prepare('SELECT size FROM photos WHERE space = ?1 AND id = ?2').bind(space, id).first();
    if (row) {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM photos WHERE space = ?1 AND id = ?2').bind(space, id),
        env.DB.prepare("UPDATE photo_stats SET v = MAX(0, v - ?1) WHERE k = 'total'").bind(row.size),
      ]);
      freed += row.size;
    }
  } catch (e) {}
  return freed ? json({ ok: true, id, freed }) : json({ error: 'Photo introuvable' }, 404);
}

export async function onRequestGet({ request, env }) {
  const space = await spaceOf(request, env);
  if (space instanceof Response) return space;
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!validId(id)) return json({ error: 'Identifiant de photo invalide' }, 400);
  const cache = 'private, max-age=31536000, immutable';

  if (env.PHOTOS) {
    const obj = await env.PHOTOS.get(r2Key(space, id));
    if (obj) return new Response(obj.body, { headers: { 'Content-Type': (obj.httpMetadata && obj.httpMetadata.contentType) || 'image/jpeg', 'Cache-Control': cache, ...CORS } });
  }
  // Anciennes photos (ou R2 non relié) : lecture dans D1
  let row = null;
  try { row = await env.DB.prepare('SELECT mime, data FROM photos WHERE space = ?1 AND id = ?2').bind(space, id).first(); } catch (e) {}
  if (!row) return json({ error: 'Photo introuvable' }, 404);
  const d = row.data;
  const body = d instanceof ArrayBuffer ? d : ArrayBuffer.isView(d) ? d : new Uint8Array(d);
  return new Response(body, { headers: { 'Content-Type': row.mime || 'image/jpeg', 'Cache-Control': cache, ...CORS } });
}
