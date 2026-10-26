/**
 * Vezoria — 👥 codes compagnon du carnet principal (le code administrateur ne se partage plus).
 *
 * Le propriétaire (code administrateur) crée un CODE COMPAGNON pour une personne. Ce code donne accès au carnet
 * (lire, ajouter, modifier) mais PAS aux droits du propriétaire : pas d'effacement du carnet, pas de création ni de
 * retrait d'autres compagnons, pas d'accès aux codes des autres voyages. Le propriétaire peut retirer l'accès à tout moment.
 *
 * Le serveur ne voit jamais les codes : il range une empreinte du code compagnon (« mt », dérivée lentement sur le
 * téléphone, puis hachée ici) et un « droit d'accès » chiffré sur le téléphone avec une clé tirée du code compagnon.
 *
 * POST /api/member
 *   {a:'add', mt, grant, label}   en-tête X-Carnet-Code = empreinte du code administrateur → {ok, id}
 *   {a:'list'}                    en-tête X-Carnet-Code = administrateur → {members:[{id, label, created, last}]}
 *   {a:'revoke', id}              en-tête X-Carnet-Code = administrateur → {ok}
 *   {a:'grant', mt}               sans en-tête (le compagnon qui tape son code) → {grant} ou 404
 *   {a:'leave'}                   en-tête X-Carnet-Code = 'mb:' + mt (le compagnon quitte le carnet) → {ok}
 * Le compagnon synchronise ensuite avec l'en-tête X-Carnet-Code = 'mb:' + mt (voir sync.js, photo.js, push.js).
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Carnet-Code',
  'Access-Control-Max-Age': '86400',
};
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });
const MAX_MEMBERS = 20;
async function sha256(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
const validMt = mt => typeof mt === 'string' && /^[0-9a-f]{64}$/.test(mt);

let ready = false;
async function table(db) {
  if (ready) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS space_members (mh TEXT PRIMARY KEY, space TEXT NOT NULL, label TEXT, gk TEXT NOT NULL, created INTEGER NOT NULL, last INTEGER NOT NULL DEFAULT 0)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_space_members_space ON space_members (space)'),
  ]);
  ready = true;
}
// limite par connexion, en mémoire (empreinte de l'IP jamais gardée)
const MEM = new Map();
function rate(request, bucket, limit) {
  const hour = Math.floor(Date.now() / 3600e3), k = bucket + ':' + (request.headers.get('CF-Connecting-IP') || ''), r = MEM.get(k);
  if (MEM.size > 20000) MEM.clear();
  const n = (r && r.hour === hour ? r.n : 0) + 1; MEM.set(k, { hour, n }); return n <= limit;
}
// le propriétaire : même empreinte que la synchro (jamais un code compagnon)
async function ownerSpace(request, env) {
  const code = (request.headers.get('X-Carnet-Code') || '').trim();
  if (code.length < 8) return json({ error: 'Code du carnet manquant' }, 400);
  if (code.startsWith('mb:')) return json({ error: 'Réservé au propriétaire du carnet (code administrateur) — Owner only' }, 403);
  const space = await sha256('carnet-voyage:' + code);
  try { const b = await env.DB.prepare('SELECT status FROM blocked WHERE space = ?1').bind(space).first(); if (b) return json({ error: 'suspendu', suspended: true }, 423); } catch (e) {}
  return space;
}

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Base D1 non liée (DB)' }, 500);
  await table(env.DB);
  let b = {}; try { b = await request.json(); } catch (e) { return json({ error: 'Requête illisible' }, 400); }
  const a = b.a;

  if (a === 'grant') {   // le compagnon tape son code : on lui rend son droit d'accès chiffré (illisible sans le code)
    if (!rate(request, 'mg', 60)) return json({ error: 'Trop d’essais : réessaie dans une heure.' }, 429);
    if (!validMt(b.mt)) return json({ error: 'code' }, 400);
    const mh = await sha256('vz-member:' + b.mt);
    const row = await env.DB.prepare('SELECT space, gk, label FROM space_members WHERE mh = ?1').bind(mh).first();
    if (!row) return json({ error: 'inconnu' }, 404);
    try { const bl = await env.DB.prepare('SELECT status FROM blocked WHERE space = ?1').bind(row.space).first(); if (bl) return json({ error: 'suspendu', suspended: true }, 423); } catch (e) {}
    await env.DB.prepare('UPDATE space_members SET last = ?1 WHERE mh = ?2').bind(Date.now(), mh).run();
    return json({ grant: row.gk, label: row.label || '' });
  }

  if (a === 'leave') {   // le compagnon quitte le carnet
    const code = (request.headers.get('X-Carnet-Code') || '').trim();
    if (!code.startsWith('mb:') || !validMt(code.slice(3))) return json({ error: 'code' }, 400);
    await env.DB.prepare('DELETE FROM space_members WHERE mh = ?1').bind(await sha256('vz-member:' + code.slice(3))).run();
    return json({ ok: true });
  }

  if (!rate(request, 'mo', 300)) return json({ error: 'Trop d’envois : réessaie dans une heure.' }, 429);
  const space = await ownerSpace(request, env);
  if (space instanceof Response) return space;

  if (a === 'add') {
    if (!validMt(b.mt)) return json({ error: 'code' }, 400);
    const grant = String(b.grant || ''); if (!grant || grant.length > 4000 || !/^[A-Za-z0-9+/=]+$/.test(grant)) return json({ error: 'droit d’accès invalide' }, 400);
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM space_members WHERE space = ?1').bind(space).first();
    if (n && n.n >= MAX_MEMBERS) return json({ error: 'Trop de compagnons sur ce carnet (' + MAX_MEMBERS + ' au plus) : retire d’abord un accès.' }, 409);
    const mh = await sha256('vz-member:' + b.mt);
    await env.DB.prepare('INSERT INTO space_members (mh, space, label, gk, created, last) VALUES (?1, ?2, ?3, ?4, ?5, 0) ON CONFLICT (mh) DO UPDATE SET space = ?2, label = ?3, gk = ?4')
      .bind(mh, space, String(b.label || '').slice(0, 40), grant, Date.now()).run();
    return json({ ok: true, id: mh.slice(0, 12) });
  }
  if (a === 'list') {
    const { results } = await env.DB.prepare('SELECT mh, label, created, last FROM space_members WHERE space = ?1 ORDER BY created').bind(space).all();
    return json({ members: (results || []).map(r => ({ id: r.mh.slice(0, 12), label: r.label || '', created: r.created, last: r.last || 0 })) });
  }
  if (a === 'revoke') {
    const id = String(b.id || ''); if (!/^[0-9a-f]{12}$/.test(id)) return json({ error: 'id' }, 400);
    const r = await env.DB.prepare('DELETE FROM space_members WHERE space = ?1 AND substr(mh, 1, 12) = ?2').bind(space, id).run();
    return json({ ok: true, removed: (r.meta && r.meta.changes) || 0 });
  }
  return json({ error: 'action inconnue' }, 400);
}
