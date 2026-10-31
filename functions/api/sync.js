/**
 * Carnet de voyage — synchronisation (Cloudflare Pages Function + D1)
 *
 * DELETE /api/sync  (en-tête X-Carnet-Code) : efface tout le carnet du serveur (fiches + photos).
 * Ménage automatique : de temps en temps, les carnets ni modifiés NI ouverts depuis
 * INACTIVE_DAYS jours (730 par défaut, variable facultative) sont effacés du serveur
 * (un vieux voyage qu’on ne fait que regarder reste donc en ligne).
 * Les données restent sur les téléphones.
 *
 * POST /api/sync
 *   En-tête  X-Carnet-Code : code secret du carnet (partagé entre voyageurs)
 *   Corps    { since: <rev>, changes: [fiche, …] }
 *   Réponse  { now: <rev>, records: [fiches modifiées depuis since] }
 *
 * Règle de fusion : par fiche, la modification la plus récente gagne (updatedAt).
 * Variable optionnelle SPACE_CODES = "code1,code2" : n'accepte que ces codes.
 */
const MAX_CHANGES = 1000;
const MAX_RECORD = 100_000;
const MAX_BODY = 30_000_000;   // 🛡️ une requête de synchro ne dépasse jamais 30 Mo (le téléphone découpe ses envois bien en dessous)
// 🔁 recouvrement : on renvoie aussi les fiches reçues dans les 15 s précédant « since ». Deux téléphones qui synchronisent
// au même instant (deux serveurs Cloudflare) pouvaient sinon se croiser et l'un ne recevait jamais la fiche de l'autre.
// Sans risque : à la réception, la fiche la plus récente gagne (updatedAt), un doublon ne change rien.
const OVERLAP = 15_000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Carnet-Code, X-Carnet-Admin, X-Carnet-Writer',
  'Access-Control-Max-Age': '86400',
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Limite d'envois par connexion (protection contre les robots) ──
// On ne garde qu'une empreinte de l'adresse IP (jamais l'adresse), par heure, effacée après 2 h.
// Compteurs EN MÉMOIRE (aucune écriture dans D1) pour les appels fréquents et légers (afficher une photo, synchro sans changement) :
// la base D1 gratuite n'accepte que 100 000 écritures par jour. Approximatif (un compteur par serveur Cloudflare), mais suffisant contre un robot ou une boucle.
const MEM = new Map();
function memRate(key, limit, cost = 1) {
  const hour = Math.floor(Date.now() / 3600e3), r = MEM.get(key);
  if (MEM.size > 20000) MEM.clear();
  const n = r && r.hour === hour ? r.n : 0;
  if (cost ? n + cost > limit : n >= limit) return false;
  if (cost) MEM.set(key, { hour, n: n + cost });
  return true;
}
let rateReady = false;
async function rateIp(env, request, bucket, limit, cost = 1) {
  return memRate(bucket + ':' + (request.headers.get('CF-Connecting-IP') || ''), limit, cost);   // tout en mémoire : plus aucune écriture D1 pour compter les appels   // synchro : en mémoire seulement
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
// Plafond par carnet (toutes connexions confondues) : une synchro qui tournerait en boucle ne peut pas épuiser l’offre gratuite.
// Variable facultative SYNC_MAX_H (synchros par heure et par carnet, 120 par défaut ≈ 2 par minute).
let rateSpReady = false;
async function rateSpace(env, space, limit) {
  return memRate('sp:' + space.slice(0, 24), limit, 1);   // en mémoire : plus aucune écriture D1 par synchro
  try {
    if (!env.DB) return true;
    const hour = Math.floor(Date.now() / 3600e3), key = 'sp:' + space.slice(0, 24);
    if (!rateSpReady) { await env.DB.prepare('CREATE TABLE IF NOT EXISTS rate_ip (k TEXT PRIMARY KEY, hour INTEGER NOT NULL, n INTEGER NOT NULL)').run(); rateSpReady = true; }
    const r = await env.DB.prepare('INSERT INTO rate_ip (k, hour, n) VALUES (?1, ?2, 1) ON CONFLICT (k) DO UPDATE SET n = CASE WHEN rate_ip.hour = ?2 THEN rate_ip.n + 1 ELSE 1 END, hour = ?2 RETURNING n').bind(key, hour).first();
    return !r || r.n <= limit;
  } catch (e) { return true; }
}
const TOO_MANY = 'Trop d’envois depuis cette connexion : réessaie dans une heure. — Too many uploads from this connection: try again in an hour.';

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

async function spaceOf(request, env) {
  if (!env.DB) return json({ error: 'Base D1 non liée (binding « DB » manquant)' }, 500);
  const code = (request.headers.get('X-Carnet-Code') || '').trim();
  if (code.length < 8) return json({ error: 'Code du carnet trop court (8 caractères minimum)' }, 400);
  // 👥 code compagnon (« mb: » + empreinte) : il ouvre le carnet de son propriétaire, avec des droits réduits
  if (code.startsWith('mb:')) {
    let row = null;
    if (/^[0-9a-f]{64}$/.test(code.slice(3))) try { row = await env.DB.prepare('SELECT space FROM space_members WHERE mh = ?1').bind(await sha256('vz-member:' + code.slice(3))).first(); } catch (e) {}
    if (!row) return json({ error: 'Accès compagnon retiré par le propriétaire du carnet. — Companion access was removed by the notebook owner.', revoked: true }, 403);
    try { const b = await env.DB.prepare('SELECT status FROM blocked WHERE space = ?1').bind(row.space).first(); if (b) return json({ error: 'suspendu', suspended: true }, 423); } catch (e) {}
    return row.space;
  }
  if (env.SPACE_CODES) {
    const allowed = String(env.SPACE_CODES).split(',').map(s => s.trim()).filter(Boolean);
    if (!allowed.includes(code)) return json({ error: 'Code de carnet non autorisé sur ce serveur' }, 403);
  }
  const space = await sha256('carnet-voyage:' + code);
  // carnet suspendu après un signalement (voir admin.js) : plus aucune lecture ni écriture, données conservées
  try {
    const b = await env.DB.prepare('SELECT status FROM blocked WHERE space = ?1').bind(space).first();
    if (b) return json({ error: 'Ce carnet est suspendu à la suite d’un signalement. Pour contester : ' + (env.CONTACT || 'contact.vezoria@icloud.com') + ' — This notebook is suspended following a report. To contest, write to the address above.', suspended: true }, 423);
  } catch (e) {}   // table pas encore créée : aucun carnet suspendu
  return space;
}

// ✍️ Fil d’abonnés : l’AUTEUR seul publie, modifie, supprime ; les abonnés et compagnons lisent, mettent des ❤️ et commentent.
//   Le lien abonné (le code) sert à lire et à commenter. L’auteur envoie en plus sa clé d’auteur (X-Carnet-Admin, jamais gardée :
//   seule son empreinte l’est) : la 1re clé reçue devient celle du fil. Chaque appareil signe ses envois (X-Carnet-Writer) :
//   une fiche n’est remplacée que par celui qui l’a écrite, ou par l’auteur. Les fiches de l’auteur sont marquées « _a »
//   (les téléphones des abonnés n’acceptent rien d’autre que des ❤️, commentaires et abonnements sans cette marque).
//   Un carnet ou un voyage partagé sans clé d’auteur fonctionne comme avant : tous ses membres écrivent tout.
let wkReady = false;
async function wkColumn(env) {
  if (wkReady) return;
  try { await env.DB.prepare('ALTER TABLE records ADD COLUMN wk TEXT').run(); } catch (e) {}   // déjà là : rien à faire
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS space_admin (space TEXT PRIMARY KEY, ah TEXT NOT NULL, at INTEGER NOT NULL)').run();
  wkReady = true;
}
const hdr = (request, k) => (request.headers.get(k) || '').trim().slice(0, 200);
async function writerOf(request) { const w = hdr(request, 'X-Carnet-Writer'); return w.length >= 16 ? (await sha256('vz-w:' + w)).slice(0, 32) : null; }
// rôle de l’appelant sur cet espace : has = un auteur est déclaré ; me = c’est lui ; bad = il a présenté une autre clé
async function adminOf(env, request, space, claim) {
  await wkColumn(env);
  const k = hdr(request, 'X-Carnet-Admin'), ah = k.length >= 16 ? await sha256('vz-admin:' + k) : '';
  let row = await env.DB.prepare('SELECT ah FROM space_admin WHERE space = ?1').bind(space).first();
  if (!row && ah && claim) {
    const r = await env.DB.prepare('INSERT OR IGNORE INTO space_admin (space, ah, at) VALUES (?1, ?2, ?3)').bind(space, ah, Date.now()).run();
    if (r && r.meta && r.meta.changes) {   // 1re clé d’auteur : ce qui est déjà en ligne vient de lui (marqué), le reste suivra
      try { await env.DB.prepare(`UPDATE records SET data = json_set(data, '$._a', 1) WHERE space = ?1 AND json_valid(data)`).bind(space).run(); } catch (e) {}
    }
    row = await env.DB.prepare('SELECT ah FROM space_admin WHERE space = ?1').bind(space).first();
  }
  return { has: !!row, me: !!(row && ah && row.ah === ah), bad: !!(row && ah && row.ah !== ah) };
}

// Efface un carnet : fiches (D1) + photos (R2 et anciennes photos D1) + compteurs
async function wipeSpace(env, space) {
  let photos = 0, freed = 0;
  if (env.PHOTOS) {
    let cursor;
    do {
      const l = await env.PHOTOS.list({ prefix: space + '/', cursor, limit: 1000 });
      const keys = l.objects.map(o => o.key);
      l.objects.forEach(o => { freed += o.size; });
      if (keys.length) await env.PHOTOS.delete(keys);
      photos += keys.length;
      cursor = l.truncated ? l.cursor : undefined;
    } while (cursor);
  }
  const rec = await env.DB.prepare('DELETE FROM records WHERE space = ?1').bind(space).run();
  let d1p = { meta: { changes: 0 } };
  try { d1p = await env.DB.prepare('DELETE FROM photos WHERE space = ?1').bind(space).run(); } catch (e) {}
  try { await env.DB.prepare('DELETE FROM photo_caps WHERE space = ?1').bind(space).run(); } catch (e) {}   // droits de lecture du pot commun
  try { await env.DB.prepare('DELETE FROM space_members WHERE space = ?1').bind(space).run(); } catch (e) {}   // codes compagnon
  try { await env.DB.prepare('DELETE FROM space_admin WHERE space = ?1').bind(space).run(); } catch (e) {}   // clé d’auteur du fil
  try { await env.DB.prepare('DELETE FROM space_links WHERE child = ?1 OR owner = ?1').bind(space).run(); } catch (e) {}   // 🌿 branches (la formule payée reste : table plans)
  try { await env.DB.batch([env.DB.prepare('DELETE FROM push_subs WHERE space = ?1').bind(space), env.DB.prepare('DELETE FROM push_due WHERE space = ?1').bind(space)]); } catch (e) {}   // notifications
  try {
    await env.DB.prepare("UPDATE photo_stats SET v = MAX(0, v - ?1) WHERE k = 'r2'").bind(freed).run();
    await env.DB.prepare('DELETE FROM photo_stats WHERE k = ?1').bind('s:' + space).run();
  } catch (e) {}
  return { records: (rec.meta && rec.meta.changes) || 0, photos: photos + ((d1p.meta && d1p.meta.changes) || 0) };
}

// 🧹 Ménage quotidien des photos : dossiers sans aucune fiche (carnet effacé, envoi arrivé après la suppression…)
// puis recompte exact de la place utilisée. Lancé au plus une fois par 24 h, en arrière-plan d’une synchro.
async function sweepOrphans(env) {
  if (!env.PHOTOS || !env.DB) return;
  const now = Date.now();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS photo_stats (k TEXT PRIMARY KEY, v INTEGER NOT NULL)').run();
  const st = await env.DB.prepare("SELECT v FROM photo_stats WHERE k = 'sweep_at'").first();
  if (st && now - st.v < 864e5) return;
  const lk = await env.DB.prepare("SELECT v FROM photo_stats WHERE k = 'sweep_lock'").first();
  if (lk && now - lk.v < 6e5) return;   // un ménage tourne déjà
  const mark = (k) => env.DB.prepare('INSERT INTO photo_stats (k, v) VALUES (?1, ?2) ON CONFLICT (k) DO UPDATE SET v = ?2').bind(k, now).run();
  await mark('sweep_lock');
  // 1. dossiers orphelins (3 au plus par passage : on reste dans les limites d’une requête ; la suite au passage suivant)
  let cursor, done = 0;
  do {
    const l = await env.PHOTOS.list({ delimiter: '/', cursor, limit: 1000 });
    for (const pfx of (l.delimitedPrefixes || [])) {
      if (done >= 3) break;
      const space = pfx.replace(/\/$/, '');
      if (!/^[0-9a-f]{64}$/.test(space)) continue;
      const has = await env.DB.prepare('SELECT 1 AS x FROM records WHERE space = ?1 LIMIT 1').bind(space).first();
      if (has) continue;
      const page = await env.PHOTOS.list({ prefix: pfx, limit: 1000 });   // une photo arrivée il y a moins de 7 jours ? on n’y touche pas
      if ((page.objects || []).some(o => now - new Date(o.uploaded).getTime() < 7 * 864e5)) continue;
      await wipeSpace(env, space); done++;
    }
    cursor = l.truncated && done < 3 ? l.cursor : undefined;
  } while (cursor);
  if (done) return;   // il en restait peut-être : on repasse à la prochaine synchro, le recompte se fera à la fin
  // 2. recompte exact (place totale et place de chaque carnet)
  const per = {}; let total = 0; cursor = undefined;
  do {
    const l = await env.PHOTOS.list({ cursor, limit: 1000 });
    (l.objects || []).forEach(o => { total += o.size; const sp = o.key.split('/')[0]; per[sp] = (per[sp] || 0) + o.size; });
    cursor = l.truncated ? l.cursor : undefined;
  } while (cursor);
  const up = (k, v) => env.DB.prepare('INSERT INTO photo_stats (k, v) VALUES (?1, ?2) ON CONFLICT (k) DO UPDATE SET v = ?2').bind(k, v);
  const stmts = [up('r2', total), env.DB.prepare("DELETE FROM photo_stats WHERE k LIKE 's:%'")].concat(Object.entries(per).map(([sp, v]) => up('s:' + sp, v)));
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  await mark('sweep_at');
}

// dernière ouverture d’un carnet (1 écriture par jour au plus) : un carnet qu’on ouvre sans le modifier reste « actif »
let seenReady = false;
async function seenTable(env) {
  if (seenReady) return;
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS space_seen (space TEXT PRIMARY KEY, at INTEGER NOT NULL)').run();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS photo_stats (k TEXT PRIMARY KEY, v INTEGER NOT NULL)').run();
  // date de mise en route : les carnets pas encore revus depuis comptent comme ouverts ce jour-là (jamais effacés trop tôt)
  await env.DB.prepare("INSERT OR IGNORE INTO photo_stats (k, v) VALUES ('seen_since', ?1)").bind(Date.now()).run();
  seenReady = true;
}
const SEEN = new Map();
async function markSeen(env, space, now) {
  if (now - (SEEN.get(space) || 0) < 6 * 3600e3) return;   // déjà noté il y a peu sur ce serveur : pas de requête D1
  if (SEEN.size > 20000) SEEN.clear(); SEEN.set(space, now);
  try {
    await seenTable(env);
    await env.DB.prepare('INSERT INTO space_seen (space, at) VALUES (?1, ?2) ON CONFLICT (space) DO UPDATE SET at = ?2 WHERE space_seen.at < ?2 - 86400000').bind(space, now).run();
  } catch (e) {}
}

// Ménage occasionnel (≈ 1 requête sur 500) : carnets orphelins = ni modifiés ni ouverts depuis longtemps
async function sweepInactive(env) {
  const days = Number(env.INACTIVE_DAYS) || 730;
  const limit = Date.now() - days * 864e5;
  await seenTable(env);
  const since = await env.DB.prepare("SELECT v FROM photo_stats WHERE k = 'seen_since'").first();
  const { results } = await env.DB.prepare(
    `SELECT r.space AS space FROM records r LEFT JOIN space_seen s ON s.space = r.space
     GROUP BY r.space HAVING MAX(r.rev) < ?1 AND COALESCE(MAX(s.at), ?2) < ?1 LIMIT 3`
  ).bind(limit, (since && since.v) || Date.now()).all();
  for (const r of results || []) { await wipeSpace(env, r.space); try { await env.DB.prepare('DELETE FROM space_seen WHERE space = ?1').bind(r.space).run(); } catch (e) {} }
  try { await env.DB.prepare('DELETE FROM space_wipes WHERE at < ?1').bind(Date.now() - 730 * 864e5).run(); } catch (e) {}
}

// date du dernier effacement d’un espace : les autres membres en sont prévenus à leur synchro suivante
async function wipeMark(env, space, at) {
  try {
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS space_wipes (space TEXT PRIMARY KEY, at INTEGER NOT NULL)').run();
    await env.DB.prepare('INSERT INTO space_wipes (space, at) VALUES (?1, ?2) ON CONFLICT (space) DO UPDATE SET at = ?2').bind(space, at).run();
  } catch (e) {}
}

const isMb = request => (request.headers.get('X-Carnet-Code') || '').trim().startsWith('mb:');
export async function onRequestDelete({ request, env }) {
  if (isMb(request)) return json({ error: 'Un compagnon ne peut pas effacer le carnet : seul son propriétaire le peut. — A companion cannot erase the notebook.' }, 403);
  const space = await spaceOf(request, env);
  if (space instanceof Response) return space;
  const adm = await adminOf(env, request, space, false);
  if (adm.has && !adm.me) return json({ error: 'Seul l’auteur peut effacer ce fil. — Only the author can erase this feed.', author: true }, 403);
  const out = await wipeSpace(env, space);
  const at = Date.now(); await wipeMark(env, space, at);
  return json({ ok: true, ...out, at });
}

export async function onRequestPost({ request, env, waitUntil }) {
  // 🛡️ envoi démesuré : refusé AVANT d'être lu (un vrai téléphone envoie ses fiches par paquets de quelques Mo au plus)
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY) return json({ error: 'Envoi trop volumineux — Upload too large', tooBig: true }, 413);
  const space = await spaceOf(request, env);
  if (space instanceof Response) return space;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Requête illisible' }, 400); }
  const since = Math.max(0, Number(body.since) || 0);
  const changes = Array.isArray(body.changes) ? body.changes.slice(0, MAX_CHANGES) : [];
  if (!(await rateIp(env, request, 'sy', 6000))) return json({ error: TOO_MANY, retry: 3600 }, 429);
  if (!(await rateSpace(env, space, Number(env.SYNC_MAX_H) || 120))) return json({ error: 'Pause de synchronisation : ce carnet s’est synchronisé très souvent. Reprise automatique dans quelques minutes.', retry: 600 }, 429);
  if (changes.length && !(await rateIp(env, request, 'sc', 50000, changes.length))) return json({ error: TOO_MANY, retry: 3600 }, 429);
  const now = Date.now();
  if (waitUntil) waitUntil(markSeen(env, space, now)); else await markSeen(env, space, now);

  // fiches refusées (trop lourdes, identifiant invalide) : le téléphone en est prévenu au lieu de les croire envoyées
  const skipped = [], denied = [];
  const adm = await adminOf(env, request, space, true), wh = await writerOf(request);
  if (changes.length) {
    const stmt = env.DB.prepare(
      `INSERT INTO records (space, id, data, updated_at, rev, wk) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT (space, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, rev = excluded.rev, wk = excluded.wk
       WHERE excluded.updated_at >= records.updated_at`
    );
    const ok = changes.filter(r => r && typeof r.id === 'string' && r.id && r.id.length <= 120);
    changes.forEach(r => { if (r && typeof r.id === 'string' && !ok.includes(r)) skipped.push(r.id.slice(0, 120)); });
    // ✍️ fil avec auteur : un abonné ne remplace que ses propres fiches (jamais celles de l’auteur ni d’un autre abonné)
    const owner = new Map();
    if (adm.has && !adm.me && ok.length) {
      const ids = [...new Set(ok.map(r => r.id))];
      for (let i = 0; i < ids.length; i += 90) {
        const part = ids.slice(i, i + 90);
        const { results: rs } = await env.DB.prepare(`SELECT id, wk FROM records WHERE space = ?1 AND id IN (${part.map((_, j) => '?' + (j + 2)).join(',')})`).bind(space, ...part).all();
        (rs || []).forEach(x => owner.set(x.id, x.wk));
      }
    }
    const batch = [];
    for (const r0 of ok) {
      const r = Object.assign({}, r0); delete r._a;
      if (adm.me) r._a = 1;
      else if (adm.has && owner.has(r.id)) { const w = owner.get(r.id); if (w === 'A' || (w && w !== wh)) { denied.push(r.id); continue; } }
      const data = JSON.stringify(r);
      if (data.length > MAX_RECORD) { skipped.push(r.id); continue; }
      batch.push(stmt.bind(space, r.id, data, Number(r.updatedAt) || 0, now, adm.me ? 'A' : wh));
    }
    if (batch.length) await env.DB.batch(batch);
  }

  const { results } = await env.DB
    .prepare('SELECT data FROM records WHERE space = ?1 AND rev >= ?2')
    .bind(space, since > 0 ? Math.max(0, since - OVERLAP) : 0)
    .all();
  if (Math.random() < 0.002 && waitUntil) waitUntil(sweepInactive(env).catch(() => {}));
  if (Math.random() < 0.1 && waitUntil) waitUntil(sweepOrphans(env).catch(() => {}));   // vérifie au plus 1 fois / 24 h
  // rappels programmés (notifications) : envoyés quand c'est l'heure, à l'occasion des synchros
  // (1 synchro sur 12 environ : chaque appel compte dans l’offre gratuite ; le « cron » facultatif fait le reste)
  if (Math.random() < 0.08 && waitUntil) waitUntil(fetch(new URL('/api/push?a=flush', request.url)).catch(() => {}));
  let wiped = 0;
  try { const w = await env.DB.prepare('SELECT at FROM space_wipes WHERE space = ?1').bind(space).first(); if (w) wiped = w.at; } catch (e) {}
  // 📦 les fiches sont déjà rangées en JSON : renvoyées telles quelles (sans relecture puis réécriture de chacune).
  //    Deux fois moins de mémoire et de calcul pour la 1re synchro d'un gros carnet (des milliers de fiches, des traces GPS).
  let out = '{"now":' + now + ',"records":[' + results.map(r => r.data).filter(d => typeof d === 'string' && d.charCodeAt(0) === 123).join(',') + ']';
  if (wiped) out += ',"wiped":' + (Number(wiped) || 0);
  if (skipped.length) out += ',"skipped":' + JSON.stringify(skipped.slice(0, 200));
  if (adm.has) out += ',"adm":1' + (adm.me ? ',"me":"a"' : '') + (adm.bad ? ',"admBad":1' : '');
  if (denied.length) out += ',"denied":' + JSON.stringify(denied.slice(0, 200));
  return new Response(out + '}', { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });
}

export const onRequestGet = () => json({ ok: true, service: 'carnet-voyage' });
