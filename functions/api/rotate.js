/**
 * Vezoria — 🔑 changer de code administrateur.
 *
 * Le carnet garde sa place sur le serveur (fiches, photos, formule payée, voyages branchés, appareils bloqués) :
 * seul le code qui l'ouvre change. Le serveur garde une table de correspondance « empreinte d'un code → carnet » :
 *   space_alias (h, space, dead, at)   h = sha256('carnet-voyage:' + empreinte du code), comme partout ailleurs
 *   dead = 1 : ancien code retiré (plus aucune lecture ni écriture avec lui, sur aucune route)
 *
 * POST /api/rotate
 *   {a:'start', to}   en-tête X-Carnet-Code = code actuel (jamais un code compagnon), X-Carnet-Dev = cet appareil
 *                     → le nouveau code ouvre AUSSI le carnet (le temps que le téléphone renvoie tout, chiffré avec le nouveau code)
 *                     Refusé à un appareil arrivé sur le carnet depuis moins de 24 h : quelqu'un qui aurait volé le code
 *                     ne peut pas s'approprier le carnet tout de suite (les autres appareils sont prévenus et peuvent le bloquer).
 *                     feeds : [{t, o, n}] clés d'auteur de mes fils d'abonnés (tirées du code) : l'ancienne est remplacée.
 *   {a:'done', old}   en-tête X-Carnet-Code = NOUVEAU code → l'ancien est retiré ; codes compagnon et abonnements aux
 *                     notifications effacés (ils reposaient sur l'ancien code) ; fiches et photos chiffrées avec l'ancien
 *                     code (non renvoyées depuis le début du changement) effacées.
 * Le serveur ne voit jamais les codes : seulement leurs empreintes.
 */
import { acctGate } from './account.js';   // 👤 compte du carnet
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Carnet-Code, X-Carnet-Dev', 'Access-Control-Max-Age': '86400' };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });
async function sha256(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
export const ROTATED = 'Ce code administrateur a été remplacé par un nouveau. Entre le nouveau code pour retrouver ton carnet. — This admin code was replaced by a new one. Enter the new code to get your notebook back.';
const YOUNG = 24 * 3600e3;

// ── correspondance code → carnet (relue au plus toutes les 30 s par serveur) ──
const ALI = new Map();
export async function codeSpace(env, token) {
  const h = await sha256('carnet-voyage:' + token), now = Date.now(), c = ALI.get(h);
  if (c && now - c.at < 30e3) return { space: c.space, dead: c.dead };
  let space = h, dead = false;
  try { const r = await env.DB.prepare('SELECT space, dead FROM space_alias WHERE h = ?1').bind(h).first(); if (r) { space = r.space; dead = !!r.dead; } } catch (e) {}   // pas encore de table : aucun code changé
  if (ALI.size > 20000) ALI.clear(); ALI.set(h, { at: now, space, dead });
  return { space, dead };
}
// 📱 appareils vus sur un carnet (date d'arrivée seulement : l'identifiant est aléatoire, sans nom ni modèle)
const SEENDEV = new Set();
let seenDevReady = false;
export async function devSeen(env, space, dev) {
  if (!dev || dev.length < 8) return; const k = space.slice(0, 24) + ':' + dev; if (SEENDEV.has(k)) return;
  try {
    if (!seenDevReady) { await env.DB.prepare('CREATE TABLE IF NOT EXISTS dev_seen (space TEXT NOT NULL, dev TEXT NOT NULL, first INTEGER NOT NULL, PRIMARY KEY (space, dev))').run(); seenDevReady = true; }
    await env.DB.prepare('INSERT OR IGNORE INTO dev_seen (space, dev, first) VALUES (?1, ?2, ?3)').bind(space, dev, Date.now()).run();
    if (SEENDEV.size > 50000) SEENDEV.clear(); SEENDEV.add(k);
  } catch (e) {}
}
async function tables(db) {
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS space_alias (h TEXT PRIMARY KEY, space TEXT NOT NULL, dead INTEGER NOT NULL DEFAULT 0, at INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS space_admin (space TEXT PRIMARY KEY, ah TEXT NOT NULL, at INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS dev_seen (space TEXT NOT NULL, dev TEXT NOT NULL, first INTEGER NOT NULL, PRIMARY KEY (space, dev))'),
  ]);
}
const tok = s => typeof s === 'string' && /^[0-9a-f]{64}$/.test(s);
// 🛡️ identifiant d'appareil : toujours nettoyé de la même façon sur toutes les routes (lettres et chiffres seulement).
//    Sinon un appareil bloqué passait en ajoutant un tiret à son identifiant : le blocage ne le reconnaissait plus, le compte si.
export const cleanDev = d => String(d || '').replace(/[^a-z0-9]/gi, '').slice(0, 40);
// 🛡️ cet appareil a-t-il été retiré du carnet par son propriétaire ? (device.js)
export async function devIsBlocked(env, space, dev) {
  dev = cleanDev(dev); if (!dev) return false;
  try { return !!(await env.DB.prepare('SELECT 1 AS x FROM dev_block WHERE space = ?1 AND dev = ?2').bind(space, dev).first()); } catch (e) { return false; }   // pas encore de table : aucun appareil bloqué
}

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });
export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.DB) return json({ error: 'Base D1 non liée (DB)' }, 500);
  const code = (request.headers.get('X-Carnet-Code') || '').trim(), dev = cleanDev(request.headers.get('X-Carnet-Dev'));
  if (code.length < 8 || code.startsWith('mb:')) return json({ error: 'Réservé au propriétaire du carnet (code administrateur) — Owner only' }, 403);
  let b = {}; try { b = await request.json(); } catch (e) { return json({ error: 'Requête illisible' }, 400); }
  await tables(env.DB);
  const cur = await codeSpace(env, code), space = cur.space, now = Date.now();
  if (cur.dead) return json({ error: ROTATED, rotated: true }, 403);
  { const g = await acctGate(env, space, dev); if (g) return json(g, 403); }   // 👤 compte : appareil pas encore validé
  try { const bl = await env.DB.prepare('SELECT status FROM blocked WHERE space = ?1').bind(space).first(); if (bl) return json({ error: 'suspendu', suspended: true }, 423); } catch (e) {}
  try { if (dev && await env.DB.prepare('SELECT 1 AS x FROM dev_block WHERE space = ?1 AND dev = ?2').bind(space, dev).first()) return json({ error: 'Appareil bloqué — Device blocked', devBlocked: true }, 403); } catch (e) {}

  if (b.a === 'start') {
    if (!tok(b.to) || b.to === code) return json({ error: 'nouveau code invalide' }, 400);
    if (dev.length < 8) return json({ error: 'Mets d’abord l’appli à jour. — Please update the app first.' }, 400);
    const seen = await env.DB.prepare('SELECT first FROM dev_seen WHERE space = ?1 AND dev = ?2').bind(space, dev).first();
    if (!seen || now - seen.first < YOUNG) return json({ error: 'young', young: true, wait: seen ? YOUNG - (now - seen.first) : YOUNG }, 403);
    const nh = await sha256('carnet-voyage:' + b.to);
    const taken = await env.DB.prepare('SELECT space FROM space_alias WHERE h = ?1').bind(nh).first();
    if (taken && taken.space !== space) return json({ error: 'code déjà pris' }, 409);
    if (!taken && await env.DB.prepare('SELECT 1 AS x FROM records WHERE space = ?1 LIMIT 1').bind(nh).first()) return json({ error: 'code déjà pris' }, 409);
    const st = [env.DB.prepare('INSERT OR REPLACE INTO space_alias (h, space, dead, at) VALUES (?1, ?2, 0, ?3)').bind(nh, space, now)];
    // ✍️ mes fils d'abonnés : la clé d'auteur tirée de l'ancien code est remplacée (celle tirée du nouveau code prend la suite)
    let feeds = 0;
    for (const f of (Array.isArray(b.feeds) ? b.feeds : []).slice(0, 200)) {
      if (!f || !tok(f.t) || typeof f.o !== 'string' || typeof f.n !== 'string' || f.o.length < 16 || f.n.length < 16) continue;
      const fs = (await codeSpace(env, f.t)).space, row = await env.DB.prepare('SELECT ah FROM space_admin WHERE space = ?1').bind(fs).first();
      if (!row || row.ah !== await sha256('vz-admin:' + f.o)) continue;
      st.push(env.DB.prepare('UPDATE space_admin SET ah = ?2, at = ?3 WHERE space = ?1').bind(fs, await sha256('vz-admin:' + f.n), now)); feeds++;
    }
    await env.DB.batch(st);
    ALI.delete(nh);
    return json({ ok: true, at: now, feeds });
  }

  if (b.a === 'done') {
    if (!tok(b.old) || b.old === code) return json({ error: 'ancien code invalide' }, 400);
    const oh = await sha256('carnet-voyage:' + b.old), me = await env.DB.prepare('SELECT at FROM space_alias WHERE h = ?1').bind(await sha256('carnet-voyage:' + code)).first();
    const old = await codeSpace(env, b.old);
    if (!me || old.space !== space) return json({ error: 'changement de code introuvable' }, 409);
    const t0 = me.at;
    await env.DB.batch([
      env.DB.prepare('INSERT OR REPLACE INTO space_alias (h, space, dead, at) VALUES (?1, ?2, 1, ?3)').bind(oh, space, now),
      env.DB.prepare('DELETE FROM records WHERE space = ?1 AND rev < ?2').bind(space, t0),   // fiches chiffrées avec l'ancien code, pas renvoyées
    ]);
    ALI.delete(oh);
    for (const q of ['DELETE FROM space_members WHERE space = ?1', 'DELETE FROM push_subs WHERE space = ?1']) { try { await env.DB.prepare(q).bind(space).run(); } catch (e) {} }
    // anciennes photos chiffrées avec l'ancien code (« x » + 40 caractères), envoyées avant le changement ; le pot commun (« p… ») ne bouge pas
    const sweep = async () => {
      if (!env.PHOTOS) return; let cursor, freed = 0, n = 0;
      do {
        const l = await env.PHOTOS.list({ prefix: space + '/', cursor, limit: 1000 });
        const del = (l.objects || []).filter(o => /\/x[0-9a-f]{40}$/.test(o.key) && new Date(o.uploaded).getTime() < t0);
        del.forEach(o => { freed += o.size; }); if (del.length) await env.PHOTOS.delete(del.map(o => o.key)); n += del.length;
        cursor = l.truncated ? l.cursor : undefined;
      } while (cursor);
      try { await env.DB.prepare('DELETE FROM photos WHERE space = ?1 AND created < ?2').bind(space, t0).run(); } catch (e) {}
      try { if (freed) await env.DB.batch([env.DB.prepare("UPDATE photo_stats SET v = MAX(0, v - ?1) WHERE k = 'r2'").bind(freed), env.DB.prepare('UPDATE photo_stats SET v = MAX(0, v - ?1) WHERE k = ?2').bind(freed, 's:' + space)]); } catch (e) {}
      return n;
    };
    if (waitUntil) waitUntil(sweep().catch(() => {})); else await sweep().catch(() => {});
    return json({ ok: true });
  }
  return json({ error: 'action inconnue' }, 400);
}
