// Photos du carnet : POST = envoyer une photo, GET ?id= = la récupérer.
// 🫙 Pot commun (photos « v2 ») : chaque photo est rangée UNE fois, chiffrée avec sa propre clé (sur le téléphone).
//   À l'envoi, l'en-tête X-Photo-Cap porte l'empreinte d'un « droit de lecture » (jamais le droit lui-même).
//   Lecture sans le code du carnet : GET ?s=<empreinte du carnet>&id=<photo>&rk=<droit de lecture>
//   → la photo n'est rendue que si l'empreinte du droit correspond. Compagnons et abonnés lisent ainsi la même photo,
//   sans copie : le serveur ne voit ni la photo (chiffrée) ni le reste du carnet.
// Stockage : Cloudflare R2 (binding « PHOTOS ») si relié, sinon la base D1 (binding « DB »).
// Les anciennes photos restées dans D1 sont toujours lues : rien n'est perdu au passage sur R2.
const MAX_PHOTO = 1_900_000;
// Garde-fous : D1 gratuit = 500 Mo par base → arrêt à 400 Mo.
// R2 : budget d'environ 15 € par mois → arrêt à 1 000 Go (10 Go gratuits + ~990 Go à 0,015 $ ≈ 14,85 $, envois compris ≈ 15 €).
// Pour changer le budget sans toucher au code : variable R2_MAX_GB dans les réglages Cloudflare (ex. 2000 pour ~30 €/mois).
const MAX_TOTAL_D1 = 400_000_000;
const R2_MAX = env => (Number(env.R2_MAX_GB) || 1000) * 1_000_000_000;
// Plafond par carnet (6 Go par défaut ; variable facultative SPACE_MAX_MB dans Cloudflare pour le changer sans toucher au code) : évite qu'un seul carnet remplisse tout
const spaceMax = env => (Number(env.SPACE_MAX_MB) || 6000) * 1_000_000;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Carnet-Code, X-Photo-Id, X-Photo-Cap',
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
const validCap = h => typeof h === 'string' && /^[0-9a-f]{64}$/.test(h);
// table des droits de lecture (seulement si R2 n'est pas relié ; avec R2, l'empreinte est rangée avec la photo)
let capReady = false;
async function capTable(env) { if (capReady) return; await env.DB.prepare('CREATE TABLE IF NOT EXISTS photo_caps (space TEXT NOT NULL, id TEXT NOT NULL, rh TEXT NOT NULL, PRIMARY KEY (space, id))').run(); capReady = true; }

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
  const cap = (request.headers.get('X-Photo-Cap') || '').trim().toLowerCase();
  if (cap && !validCap(cap)) return json({ error: 'Droit de lecture invalide' }, 400);

  // ── R2 ──
  if (env.PHOTOS) {
    const key = r2Key(space, id);
    const total = await getTotal(env, 'r2');
    const old = await env.PHOTOS.head(key);          // photo renvoyée une 2e fois : on ne compte que la différence
    const delta = buf.byteLength - (old ? old.size : 0);
    if (total + delta > R2_MAX(env)) return json({ error: 'Stockage des photos plein', total }, 507);
    const sk = 's:' + space, mine = await getTotal(env, sk);
    if (mine + delta > spaceMax(env)) return json({ error: 'Ce carnet a atteint sa place maximale pour les photos', total: mine, max: spaceMax(env) }, 507);
    await env.PHOTOS.put(key, buf, cap ? { httpMetadata: { contentType: mime }, customMetadata: { rh: cap } } : { httpMetadata: { contentType: mime } });
    await env.DB.batch([
      env.DB.prepare("UPDATE photo_stats SET v = v + ?1 WHERE k = 'r2'").bind(delta),
      env.DB.prepare('UPDATE photo_stats SET v = v + ?1 WHERE k = ?2').bind(delta, sk),
    ]);
    return json({ ok: true, id, size: buf.byteLength, store: 'r2', cap: !!cap });
  }

  // ── D1 (si R2 n'est pas relié) ──
  const total = await getTotal(env, 'total');
  if (total + buf.byteLength > MAX_TOTAL_D1) return json({ error: 'Stockage des photos plein', total }, 507);
  if (cap) await capTable(env);
  await env.DB.batch([
    env.DB.prepare('INSERT OR REPLACE INTO photos (space, id, mime, data, size, created) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
      .bind(space, id, mime, buf, buf.byteLength, Date.now()),
    env.DB.prepare("UPDATE photo_stats SET v = v + ?1 WHERE k = 'total'").bind(buf.byteLength),
  ].concat(cap ? [env.DB.prepare('INSERT OR REPLACE INTO photo_caps (space, id, rh) VALUES (?1, ?2, ?3)').bind(space, id, cap)] : []));
  return json({ ok: true, id, size: buf.byteLength, store: 'd1', cap: !!cap });
}

// Supprimer une photo (sortie d'un souvenir, souvenir ou voyage supprimé)
export async function onRequestDelete({ request, env }) {
  const space = await spaceOf(request, env);
  if (space instanceof Response) return space;
  const u = new URL(request.url);
  // ?all=1 : efface TOUTES les photos de ce carnet (ex. arrêt de la publication pour les abonnés), les fiches restent
  if (u.searchParams.get('all') === '1') {
    let freed = 0, n = 0;
    if (env.PHOTOS) {
      let cursor;
      do {
        const l = await env.PHOTOS.list({ prefix: space + '/', cursor, limit: 1000 });
        const keys = l.objects.map(o => o.key); l.objects.forEach(o => { freed += o.size; });
        if (keys.length) await env.PHOTOS.delete(keys);
        n += keys.length; cursor = l.truncated ? l.cursor : undefined;
      } while (cursor);
    }
    try {
      const r = await env.DB.prepare('SELECT COALESCE(SUM(size),0) AS s, COUNT(*) AS c FROM photos WHERE space = ?1').bind(space).first();
      if (r && r.c) { await env.DB.batch([
        env.DB.prepare('DELETE FROM photos WHERE space = ?1').bind(space),
        env.DB.prepare("UPDATE photo_stats SET v = MAX(0, v - ?1) WHERE k = 'total'").bind(r.s),
      ]); n += r.c; }
    } catch (e) {}
    try { await env.DB.batch([
      env.DB.prepare("UPDATE photo_stats SET v = MAX(0, v - ?1) WHERE k = 'r2'").bind(freed),
      env.DB.prepare('DELETE FROM photo_stats WHERE k = ?1').bind('s:' + space),
    ]); } catch (e) {}
    try { await env.DB.prepare('DELETE FROM photo_caps WHERE space = ?1').bind(space).run(); } catch (e) {}
    return json({ ok: true, deleted: n, freed });
  }
  // ?bulk=1 : efface une liste de photos devenues inutiles (doublons, photos de fiches supprimées).
  // Garde-fou : seules les photos envoyées il y a plus de 3 jours partent (un autre téléphone n’a peut-être pas encore synchronisé ses fiches).
  if (u.searchParams.get('bulk') === '1') {
    if (!env.PHOTOS) return json({ ok: true, deleted: 0, freed: 0 });
    let body = {}; try { body = await request.json(); } catch (e) {}
    const ids = (Array.isArray(body.ids) ? body.ids : []).filter(validId).slice(0, 1000), now = Date.now();
    let freed = 0; const del = [];
    for (let i = 0; i < ids.length; i += 50) {
      const heads = await Promise.all(ids.slice(i, i + 50).map(x => env.PHOTOS.head(r2Key(space, x))));
      heads.forEach(h => { if (h && now - new Date(h.uploaded).getTime() > 3 * 864e5) { del.push(h.key); freed += h.size; } });
    }
    if (del.length) {
      await env.PHOTOS.delete(del);
      await getTotal(env, 's:' + space);
      await env.DB.batch([
        env.DB.prepare("UPDATE photo_stats SET v = MAX(0, v - ?1) WHERE k = 'r2'").bind(freed),
        env.DB.prepare('UPDATE photo_stats SET v = MAX(0, v - ?1) WHERE k = ?2').bind(freed, 's:' + space),
      ]);
    }
    return json({ ok: true, deleted: del.length, freed });
  }
  const id = u.searchParams.get('id') || request.headers.get('X-Photo-Id') || '';
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
    try { await env.DB.prepare('DELETE FROM photo_caps WHERE space = ?1 AND id = ?2').bind(space, id).run(); } catch (e) {}
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

// 🫙 lecture d'une photo du pot commun avec son droit de lecture (compagnon ou abonné), sans le code du carnet
async function capGet(request, env, q) {
  if (!env.DB) return json({ error: 'Base D1 non liée (binding « DB » manquant)' }, 500);
  const space = String(q.get('s') || ''), id = q.get('id') || '', rk = String(q.get('rk') || '');
  if (!/^[0-9a-f]{64}$/.test(space) || !validId(id) || !/^[\w\-]{16,64}$/.test(rk)) return json({ error: 'Lien de photo invalide' }, 400);
  if (!(await rateIp(env, request, 'pg', 20000))) return json({ error: TOO_MANY, retry: 3600 }, 429);
  try { const b = await env.DB.prepare('SELECT status FROM blocked WHERE space = ?1').bind(space).first(); if (b) return json({ error: 'suspendu', suspended: true }, 423); } catch (e) {}
  const rh = await sha256('vz-cap:' + rk), cache = 'private, max-age=31536000, immutable';
  if (env.PHOTOS) {
    const obj = await env.PHOTOS.get(r2Key(space, id));
    if (obj && obj.customMetadata && obj.customMetadata.rh === rh) return new Response(obj.body, { headers: { 'Content-Type': (obj.httpMetadata && obj.httpMetadata.contentType) || 'image/jpeg', 'Cache-Control': cache, ...CORS } });
    if (obj) return json({ error: 'Photo introuvable' }, 404);   // mauvais droit : même réponse qu'une photo absente
  }
  let row = null;
  try { await capTable(env); row = await env.DB.prepare('SELECT p.mime AS mime, p.data AS data FROM photos p JOIN photo_caps c ON c.space = p.space AND c.id = p.id WHERE p.space = ?1 AND p.id = ?2 AND c.rh = ?3').bind(space, id, rh).first(); } catch (e) {}
  if (!row) return json({ error: 'Photo introuvable' }, 404);
  const d = row.data, body = d instanceof ArrayBuffer ? d : ArrayBuffer.isView(d) ? d : new Uint8Array(d);
  return new Response(body, { headers: { 'Content-Type': row.mime || 'image/jpeg', 'Cache-Control': cache, ...CORS } });
}

export async function onRequestGet({ request, env }) {
  { const q0 = new URL(request.url).searchParams; if (q0.get('rk')) return capGet(request, env, q0); }
  const space = await spaceOf(request, env);
  if (space instanceof Response) return space;
  const q = new URL(request.url).searchParams;
  // ?list=1 : liste des photos de CE carnet (identifiants chiffrés, taille, date d’envoi), par pages de 1000 — pour le ménage des doublons
  if (q.get('list') === '1') {
    if (!env.PHOTOS) return json({ ids: [], cursor: '' });
    const l = await env.PHOTOS.list({ prefix: space + '/', cursor: q.get('cursor') || undefined, limit: 1000 });
    return json({ ids: l.objects.map(o => ({ i: o.key.slice(space.length + 1), s: o.size, u: new Date(o.uploaded).getTime() })), cursor: l.truncated ? l.cursor : '' });
  }
  // ?sizes=id1,id2,… (100 max) : taille des photos de CE carnet — le téléphone vérifie que la photo rangée dans le pot commun
  // est bien la grande photo (et pas une vignette) avant d'effacer l'ancienne copie
  if (q.get('sizes')) {
    const ids = String(q.get('sizes')).split(',').filter(Boolean).slice(0, 100);
    if (!ids.length || !ids.every(validId)) return json({ error: 'Identifiant de photo invalide' }, 400);
    if (!(await rateIp(env, request, 'pg', 20000))) return json({ error: TOO_MANY, retry: 3600 }, 429);
    const sizes = {};
    if (env.PHOTOS) for (let i = 0; i < ids.length; i += 25) {
      const hs = await Promise.all(ids.slice(i, i + 25).map(x => env.PHOTOS.head(r2Key(space, x))));
      hs.forEach((h, j) => { if (h) sizes[ids[i + j]] = h.size; });
    }
    const rest = ids.filter(x => !(x in sizes));
    if (rest.length) try {
      const r = await env.DB.prepare('SELECT id, size FROM photos WHERE space = ?1 AND id IN (' + rest.map((_, i) => '?' + (i + 2)).join(',') + ')').bind(space, ...rest).all();
      (r.results || []).forEach(x => { sizes[x.id] = x.size; });
    } catch (e) {}
    return json({ sizes });
  }
  const id = q.get('id') || '';
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
