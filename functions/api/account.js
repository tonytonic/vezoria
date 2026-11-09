/**
 * Vezoria — 👤 compte du carnet en ligne : une adresse e-mail vérifiée + le code du carnet (2 éléments).
 * Le serveur ne voit jamais le code ni le contenu (chiffrés) : seulement l’empreinte du carnet, l’e-mail et les appareils.
 *
 * POST /api/account   en-têtes X-Carnet-Code (code administrateur, jamais un code compagnon) + X-Carnet-Dev (cet appareil)
 *   {a:'status'}              → {acct, mail (masqué), ok (cet appareil est validé), pend:[appareils en attente], max}
 *   {a:'start', email, lang}  → crée/modifie le compte : envoie un code à 6 chiffres à cette adresse
 *                               (si un compte existe déjà, seulement depuis un appareil validé)
 *   {a:'login'}               → nouvel appareil : envoie un code à l’adresse du compte
 *   {a:'ask', lb}             → nouvel appareil : se signale (nom « iPhone · Safari ») pour être validé depuis un autre
 *   {a:'verify', otp}         → bon code : adresse vérifiée et/ou cet appareil validé
 *                               (1re vérification : tous les appareils déjà vus sur ce carnet sont validés d’office)
 *   {a:'approve', dev}        → depuis un appareil validé : valide un autre appareil (sans e-mail)
 *   {a:'deny', dev}           → refuse / retire un appareil en attente
 *   {a:'max', n}              → limite d’appareils (0 = pas de limite)
 *   {a:'delete'}              → supprime le compte (l’adresse e-mail ; les appareils redeviennent libres)
 * Conservation : l’adresse est effacée à la suppression du compte ou du carnet.
 */
import { codeSpace, ROTATED, devSeen, cleanDev, devIsBlocked } from './rotate.js';
import { sendMail } from './_mail.js';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Carnet-Code, X-Carnet-Dev', 'Access-Control-Max-Age': '86400' };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });
async function sha256(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
const mask = m => { const [u, d] = String(m || '').split('@'); if (!d) return ''; return (u.length <= 2 ? u[0] + '*' : u.slice(0, 2) + '*'.repeat(Math.min(6, u.length - 2))) + '@' + d; };
const okMail = m => /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[a-z]{2,}$/i.test(m);
// 🔐 adresses chiffrées dans la base (AES-GCM, clé tirée de la variable secrète MAIL_KEY) : une copie volée de la base ne montre aucune adresse.
//    Sans MAIL_KEY, les adresses restent lisibles (à éviter). NE JAMAIS PERDRE MAIL_KEY : les adresses déjà enregistrées deviendraient illisibles.
const KEYS = new Map();
async function mkey(env) { const k = env.MAIL_KEY || ''; if (!k) return null; if (!KEYS.has(k)) KEYS.set(k, await crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', new TextEncoder().encode('vz-mail:' + k)), 'AES-GCM', false, ['encrypt', 'decrypt'])); return KEYS.get(k); }
const b64 = u => btoa(String.fromCharCode(...u)), unb64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
export async function mailEnc(env, m) { if (!m) return m; const k = await mkey(env); if (!k) return m; const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(m))); const o = new Uint8Array(12 + ct.length); o.set(iv); o.set(ct, 12); return 'e1:' + b64(o); }
export async function mailDec(env, v) { if (!v || !String(v).startsWith('e1:')) return v || ''; const k = await mkey(env); if (!k) return ''; try { const u = unb64(v.slice(3));
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, k, u.slice(12))); } catch (e) { return ''; } }
// 👤 qui a créé quel espace (voyage partagé, fil d’abonnés, invitation) : pour pouvoir suspendre tout un compte après un signalement
export async function ownerOf(env, space) { try { const r = await env.DB.prepare('SELECT owner FROM space_owner WHERE space = ?1').bind(space).first(); return r ? r.owner : ''; } catch (e) { return ''; } }
let ready = false;
export async function acctTables(db) {
  if (ready) return; await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS acct (space TEXT PRIMARY KEY, email TEXT, pend TEXT, verified INTEGER NOT NULL DEFAULT 0, maxdev INTEGER NOT NULL DEFAULT 0, at INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS acct_dev (space TEXT NOT NULL, dev TEXT NOT NULL, ok INTEGER NOT NULL DEFAULT 0, at INTEGER NOT NULL, lb TEXT, PRIMARY KEY (space, dev))'),
    db.prepare('CREATE TABLE IF NOT EXISTS space_owner (space TEXT PRIMARY KEY, owner TEXT NOT NULL, at INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS acct_otp (space TEXT NOT NULL, dev TEXT NOT NULL, h TEXT NOT NULL, exp INTEGER NOT NULL, tries INTEGER NOT NULL DEFAULT 0, sent INTEGER NOT NULL, PRIMARY KEY (space, dev))'),
  ]); ready = true;
}
const lbOf = b => String(b.lb || '').replace(/[<>"]/g, '').slice(0, 60);   // « iPhone · Safari » : pour reconnaître l’appareil en attente
// 🔒 utilisé par sync.js / photo.js : un carnet avec compte n’accepte que ses appareils validés
export async function acctGate(env, space, dev, ins) {
  dev = String(dev || '').replace(/[^a-z0-9]/gi, '').slice(0, 40);
  try {
    await acctTables(env.DB);
    const a = await env.DB.prepare('SELECT email, verified, maxdev FROM acct WHERE space = ?1').bind(space).first();
    if (!a || !a.verified) return null;
    const d = dev ? await env.DB.prepare('SELECT ok FROM acct_dev WHERE space = ?1 AND dev = ?2').bind(space, dev).first() : null;
    if (d && d.ok) return null;
    if (ins && dev && !d) await env.DB.prepare('INSERT OR IGNORE INTO acct_dev (space, dev, ok, at) VALUES (?1, ?2, 0, ?3)').bind(space, dev, Date.now()).run();   // en attente : visible sur mes autres appareils
    return { error: 'Nouvel appareil : vérifie que c’est toi (code envoyé par e-mail, ou validation depuis ton autre appareil). — New device: please verify it’s you.', needVerify: true, mail: mask(await mailDec(env, a.email)) };
  } catch (e) { return null; }
}
// 📧 « pas d’adresse e-mail, pas de carnet sur le serveur » (ACCT_REQUIRED = '0' pour suspendre en urgence)
//  · le carnet principal (en-tête X-Carnet-Main) ne se lit et ne s’écrit qu’avec un compte vérifié ;
//  · un NOUVEL espace (voyage partagé, fil d’abonnés, invitation…) ne se crée que depuis un carnet qui a un compte vérifié
//    (en-tête X-Carnet-Acct = empreinte du carnet principal, et cet appareil y est validé).
const NEED = { error: 'Pour mettre ton carnet en ligne, crée ton compte (adresse e-mail vérifiée). — An e-mail account is required to keep your notebook online.', needAcct: true };
async function acctReady(env, space, dev) {
  const a = await env.DB.prepare('SELECT verified FROM acct WHERE space = ?1').bind(space).first(); if (!a || !a.verified) return false;
  try { if (await env.DB.prepare('SELECT 1 FROM blocked WHERE space = ?1').bind(space).first()) return false; } catch (e) {}   // compte suspendu : plus de nouveaux partages
  const d = await env.DB.prepare('SELECT ok FROM acct_dev WHERE space = ?1 AND dev = ?2').bind(space, dev).first(); return !!(d && d.ok);
}
export async function acctMain(env, request, space) {
  if (env.ACCT_REQUIRED === '0' || request.headers.get('X-Carnet-Main') !== '1') return null;
  try { await acctTables(env.DB); const a = await env.DB.prepare('SELECT verified FROM acct WHERE space = ?1').bind(space).first(); return a && a.verified ? null : NEED; } catch (e) { return null; }
}
export async function acctNew(env, request, space, nChanges = 1) {
  if (env.ACCT_REQUIRED === '0') return null;
  try {
    await acctTables(env.DB);
    const ow = await ownerOf(env, space);
    if (ow === '-light') {   // petit espace créé sans compte (boîte d’invitations, code de passage) : il reste petit
      const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM records WHERE space = ?1').bind(space).first();
      return r && r.n + nChanges > 200 ? NEED : null;
    }
    const any = await env.DB.prepare('SELECT 1 FROM records WHERE space = ?1 LIMIT 1').bind(space).first(); if (any) return null;   // espace existant : rien ne change
    const dev = String(request.headers.get('X-Carnet-Dev') || '').replace(/[^a-z0-9]/gi, '').slice(0, 40);
    const own = (o) => env.DB.prepare('INSERT OR IGNORE INTO space_owner (space, owner, at) VALUES (?1, ?2, ?3)').bind(space, o, Date.now()).run().catch(() => {});
    const tok0 = (request.headers.get('X-Carnet-Acct') || '').trim();
    // 📨 sans compte, on peut quand même déposer 1 à 3 petites fiches dans un espace neuf : une invitation dans la boîte d’un compagnon,
    //    le code de passage navigateur → appli d’un abonné. Ces espaces restent limités à 200 fiches.
    if (request.headers.get('X-Carnet-Main') !== '1' && tok0.length < 8 && nChanges <= 3 && Number(request.headers.get('Content-Length') || 0) <= 16384) {
      // 🛡️ 40 nouveaux petits espaces par heure et par connexion : un robot ne peut pas remplir la base d'espaces vides
      if (!(await dbRate(env, 'ls:' + (request.headers.get('CF-Connecting-IP') || 'x'), HOUR, 40))) return { error: 'Trop de créations depuis cette connexion : réessaie dans une heure. — Too many new links from this connection: try again in an hour.', retry: 3600 };
      await own('-light'); return null; }
    if (request.headers.get('X-Carnet-Main') === '1') { if (!(await acctReady(env, space, dev))) return NEED; await own(space); return null; }
    const tok = (request.headers.get('X-Carnet-Acct') || '').trim(); if (tok.length < 8 || tok.startsWith('mb:')) return NEED;
    const cs = await codeSpace(env, tok); if (cs.dead || !cs.space) return NEED;
    if (!(await acctReady(env, cs.space, dev))) return NEED; await own(cs.space); return null;   // cet espace appartient à ce compte
  } catch (e) { return null; }
}
// 🛡️ limites gardées dans la base (les compteurs en mémoire ci-dessous repartent de zéro sur chaque serveur Cloudflare : un robot passait entre).
//    Une ligne par compteur (empreinte seulement : jamais l'adresse e-mail ni l'adresse IP en clair), effacée quand elle a expiré.
let rlReady = false;
export async function dbRate(env, key, ms, max) {
  try {
    if (!rlReady) { await env.DB.prepare('CREATE TABLE IF NOT EXISTS rate_db (k TEXT PRIMARY KEY, n INTEGER NOT NULL, exp INTEGER NOT NULL)').run(); rlReady = true; }
    const k = (await sha256('vz-rl:' + key)).slice(0, 24), now = Date.now();
    const r = await env.DB.prepare('INSERT INTO rate_db (k, n, exp) VALUES (?1, 1, ?2) ON CONFLICT (k) DO UPDATE SET n = CASE WHEN rate_db.exp > ?3 THEN rate_db.n + 1 ELSE 1 END, exp = CASE WHEN rate_db.exp > ?3 THEN rate_db.exp ELSE ?2 END RETURNING n').bind(k, now + ms, now).first();
    if (Math.random() < 0.02) await env.DB.prepare('DELETE FROM rate_db WHERE exp < ?1').bind(now).run();
    return !r || r.n <= max;
  } catch (e) { return true; }   // en cas de souci, on ne bloque jamais un vrai voyageur
}
const HOUR = 3600e3, DAY = 864e5;
const lim = new Map();
function rate(k, n, ms) { const now = Date.now(), a = (lim.get(k) || []).filter(t => now - t < ms); if (a.length >= n) return false; a.push(now); lim.set(k, a); if (lim.size > 20000) lim.clear(); return true; }
async function mailCode(env, space, dev, to, lang) {
  const otp = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
  await env.DB.prepare('INSERT OR REPLACE INTO acct_otp (space, dev, h, exp, tries, sent) VALUES (?1, ?2, ?3, ?4, 0, ?5)').bind(space, dev, await sha256('vz-otp:' + space + ':' + otp), Date.now() + 15 * 60e3, Date.now()).run();
  const en = !/^fr/i.test(lang || 'fr');
  const subject = en ? 'Vezoria — your code ' + otp : 'Vezoria — ton code ' + otp;
  const text = en ? `Your Vezoria verification code: ${otp}\n\nIt is valid for 15 minutes. If you didn't ask for it, ignore this e-mail: nobody can open your notebook without its code.\n\nVezoria`
                  : `Ton code de vérification Vezoria : ${otp}\n\nIl est valable 15 minutes. Si tu ne l’as pas demandé, ignore ce message : personne ne peut ouvrir ton carnet sans son code.\n\nVezoria`;
  const r = await sendMail(env, to, subject, text);
  return r.dev ? Object.assign({}, r, { otp }) : r;
}
export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Base D1 non liée (DB)' }, 500);
  const code = (request.headers.get('X-Carnet-Code') || '').trim(), dev = cleanDev(request.headers.get('X-Carnet-Dev'));
  if (code.length < 8 || code.startsWith('mb:')) return json({ error: 'Réservé au propriétaire du carnet — Owner only' }, 403);
  if (dev.length < 8) return json({ error: 'Appareil inconnu' }, 400);
  const cs = await codeSpace(env, code), space = cs.space; if (cs.dead) return json({ error: ROTATED, rotated: true }, 403);
  await acctTables(env.DB);
  // 🛡️ un appareil retiré du carnet (device.js) ne touche plus au compte : ni valider un autre appareil, ni changer l'adresse, ni supprimer le compte
  if (await devIsBlocked(env, space, dev)) return json({ error: 'Cet appareil a été retiré de ce carnet par son propriétaire. — This device was removed from this notebook by its owner.', devBlocked: true }, 403);
  let b = {}; try { b = await request.json(); } catch (e) { return json({ error: 'Requête illisible' }, 400); }
  const ip = request.headers.get('CF-Connecting-IP') || 'x';
  const TOO_MAIL = { error: 'Trop d’envois, réessaie plus tard — Too many e-mails, try again later' };
  const a = await env.DB.prepare('SELECT * FROM acct WHERE space = ?1').bind(space).first();
  const me = await env.DB.prepare('SELECT ok FROM acct_dev WHERE space = ?1 AND dev = ?2').bind(space, dev).first();
  const devOk = !!(me && me.ok), active = !!(a && a.verified);
  const canAdmin = !active || devOk;   // pas encore de compte vérifié : l’appareil qui a le code fait foi
  if (b.a === 'status') {
    let pend = []; if (active && devOk) { const { results } = await env.DB.prepare('SELECT dev, at, lb FROM acct_dev WHERE space = ?1 AND ok = 0 ORDER BY at DESC LIMIT 20').bind(space).all(); pend = results || []; }
    let n = 0; if (active) { const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM acct_dev WHERE space = ?1 AND ok = 1').bind(space).first(); n = r ? r.n : 0; }
    return json({ ok: true, acct: active, pendMail: !!(a && a.pend), mail: a ? mask(await mailDec(env, a.verified ? a.email : a.pend)) : '', devOk: !active || devOk, pend, n, max: a ? a.maxdev : 0 });
  }
  if (b.a === 'start') {
    if (!canAdmin) return json({ error: 'Valide d’abord cet appareil — Verify this device first' }, 403);
    const email = String(b.email || '').trim().toLowerCase(); if (!okMail(email)) return json({ error: 'Adresse e-mail invalide — Invalid e-mail address' }, 400);
    if (!rate('m:' + space, 5, 3600e3) || !rate('i:' + ip, 20, 3600e3)) return json({ error: 'Trop d’envois, réessaie dans une heure — Too many e-mails, try again later' }, 429);
    // 🛡️ une même adresse ne reçoit pas plus de 4 codes par heure et 10 par jour, quel que soit le carnet qui les demande
    //    (sinon n'importe qui pouvait faire envoyer des dizaines de messages Vezoria à l'adresse de quelqu'un d'autre)
    if (!(await dbRate(env, 'mi:' + ip, HOUR, 12)) || !(await dbRate(env, 'mt:' + email, HOUR, 4)) || !(await dbRate(env, 'md:' + email, DAY, 10))) return json(TOO_MAIL, 429);
    const ee = await mailEnc(env, email);
    if (a) await env.DB.prepare('UPDATE acct SET pend = ?2 WHERE space = ?1').bind(space, ee).run();
    else await env.DB.prepare('INSERT INTO acct (space, email, pend, verified, maxdev, at) VALUES (?1, NULL, ?2, 0, 0, ?3)').bind(space, ee, Date.now()).run();
    const r = await mailCode(env, space, dev, email, b.lang);
    return r.ok ? json(Object.assign({ ok: true, mail: mask(email) }, r.otp ? { devOtp: r.otp } : {})) : json({ error: r.error || 'Envoi impossible' }, 502);
  }
  if (b.a === 'login') {
    if (!active) return json({ error: 'Pas de compte sur ce carnet' }, 400);
    if (devOk) return json({ ok: true, devOk: true });
    if (!rate('l:' + space + dev, 4, 3600e3) || !rate('i:' + ip, 20, 3600e3)) return json({ error: 'Trop d’envois, réessaie dans une heure — Too many e-mails, try again later' }, 429);
    // 🛡️ par CARNET : 5 codes par heure et 12 par jour au plus, tous appareils confondus. Avant, la limite était par appareil,
    //    et l'identifiant d'appareil est choisi par celui qui appelle : en le changeant, on obtenait autant de codes (et d'essais) qu'on voulait.
    if (!(await dbRate(env, 'mi:' + ip, HOUR, 12)) || !(await dbRate(env, 'ms:' + space, HOUR, 5)) || !(await dbRate(env, 'mS:' + space, DAY, 12))) return json(TOO_MAIL, 429);
    try { await env.DB.prepare('DELETE FROM acct_otp WHERE space = ?1 AND exp < ?2').bind(space, Date.now() - DAY).run(); } catch (e) {}   // vieux codes expirés
    if (a.maxdev > 0) { const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM acct_dev WHERE space = ?1 AND ok = 1').bind(space).first(); if (r && r.n >= a.maxdev) return json({ error: 'Nombre maximum d’appareils atteint : retire un appareil depuis « Mes appareils ». — Device limit reached.', maxdev: true }, 403); }
    await env.DB.prepare('INSERT INTO acct_dev (space, dev, ok, at, lb) VALUES (?1, ?2, 0, ?3, ?4) ON CONFLICT (space, dev) DO UPDATE SET lb = ?4').bind(space, dev, Date.now(), lbOf(b)).run();
    const em = await mailDec(env, a.email); if (!em) return json({ error: 'Adresse du compte illisible (clé MAIL_KEY changée ?) — contacte le support' }, 500);
    const r = await mailCode(env, space, dev, em, b.lang);
    return r.ok ? json(Object.assign({ ok: true, mail: mask(em) }, r.otp ? { devOtp: r.otp } : {})) : json({ error: r.error || 'Envoi impossible' }, 502);
  }
  if (b.a === 'ask') {   // nouvel appareil : il se présente (nom) pour être validé depuis un appareil déjà validé
    if (!active || devOk) return json({ ok: true, devOk: !active || devOk });
    if (!rate('a:' + space + dev, 6, 3600e3)) return json({ error: 'Trop de demandes' }, 429);
    await env.DB.prepare('INSERT INTO acct_dev (space, dev, ok, at, lb) VALUES (?1, ?2, 0, ?3, ?4) ON CONFLICT (space, dev) DO UPDATE SET lb = ?4, at = ?3').bind(space, dev, Date.now(), lbOf(b)).run();
    return json({ ok: true });
  }
  if (b.a === 'verify') {
    const o = await env.DB.prepare('SELECT h, exp, tries FROM acct_otp WHERE space = ?1 AND dev = ?2').bind(space, dev).first();
    if (!o || o.exp < Date.now()) return json({ error: 'Code expiré : redemande un code — Code expired' }, 400);
    if (o.tries >= 5) return json({ error: 'Trop d’essais : redemande un code — Too many attempts' }, 429);
    if (!(await dbRate(env, 'mv:' + space, HOUR, 20))) return json({ error: 'Trop d’essais : réessaie dans une heure — Too many attempts, try again in an hour' }, 429);   // 🛡️ par carnet, tous appareils confondus
    const otp = String(b.otp || '').replace(/\D/g, '');
    if (await sha256('vz-otp:' + space + ':' + otp) !== o.h) { await env.DB.prepare('UPDATE acct_otp SET tries = tries + 1 WHERE space = ?1 AND dev = ?2').bind(space, dev).run(); return json({ error: 'Code incorrect — Wrong code' }, 400); }
    await env.DB.prepare('DELETE FROM acct_otp WHERE space = ?1 AND dev = ?2').bind(space, dev).run();
    const now = Date.now();
    if (a && a.pend && canAdmin) {   // adresse vérifiée (création ou changement)
      const first = !a.verified;
      await env.DB.prepare('UPDATE acct SET email = pend, pend = NULL, verified = 1 WHERE space = ?1').bind(space).run();
      if (first) {   // les appareils déjà sur ce carnet restent ouverts (personne n’est enfermé dehors)
        try { const { results } = await env.DB.prepare('SELECT dev FROM dev_seen WHERE space = ?1').bind(space).all();
          for (const r of (results || [])) await env.DB.prepare('INSERT OR REPLACE INTO acct_dev (space, dev, ok, at) VALUES (?1, ?2, 1, ?3)').bind(space, r.dev, now).run(); } catch (e) {}
      }
    }
    await env.DB.prepare('INSERT OR REPLACE INTO acct_dev (space, dev, ok, at) VALUES (?1, ?2, 1, ?3)').bind(space, dev, now).run();
    await devSeen(env, space, dev);
    return json({ ok: true, acct: true });
  }
  if (b.a === 'approve' || b.a === 'deny') {
    if (!active || !devOk) return json({ error: 'Depuis un appareil déjà validé seulement — From a verified device only' }, 403);
    const d = String(b.dev || '').replace(/[^a-z0-9]/gi, '').slice(0, 40); if (d.length < 8 || d === dev) return json({ error: 'Appareil inconnu' }, 400);
    if (b.a === 'approve') await env.DB.prepare('INSERT OR REPLACE INTO acct_dev (space, dev, ok, at) VALUES (?1, ?2, 1, ?3)').bind(space, d, Date.now()).run();
    else await env.DB.prepare('DELETE FROM acct_dev WHERE space = ?1 AND dev = ?2').bind(space, d).run();
    return json({ ok: true });
  }
  if (b.a === 'max') {
    if (!active || !devOk) return json({ error: 'Depuis un appareil déjà validé seulement' }, 403);
    const n = Math.max(0, Math.min(50, parseInt(b.n, 10) || 0)); await env.DB.prepare('UPDATE acct SET maxdev = ?2 WHERE space = ?1').bind(space, n).run(); return json({ ok: true, max: n });
  }
  if (b.a === 'delete') {   // le client efface aussi le carnet du serveur (DELETE /api/sync) : sans compte, pas de carnet en ligne
    if (!canAdmin) return json({ error: 'Depuis un appareil déjà validé seulement' }, 403);
    await env.DB.batch([env.DB.prepare('DELETE FROM acct WHERE space = ?1').bind(space), env.DB.prepare('DELETE FROM acct_dev WHERE space = ?1').bind(space), env.DB.prepare('DELETE FROM acct_otp WHERE space = ?1').bind(space)]);
    return json({ ok: true });
  }
  return json({ error: 'action inconnue' }, 400);
}
