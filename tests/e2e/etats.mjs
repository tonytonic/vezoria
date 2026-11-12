// 🧱 États de départ réutilisables pour les essais (voyages saisis à la main, carnet en ligne, compagnon, abonnés)
import path from 'node:path';
import { user, carnet, log, iso, pickDay, fl, compte, lastShare, sheetCode, souvenir, sync } from './lib.mjs';
const HERE = path.dirname(new URL(import.meta.url).pathname);
export const PHOTO = [HERE + '/photo1.jpg', HERE + '/photo2.jpg'];
export const okDlg = async (U, re = /^OK$/) => { await U.pg.locator('.ui-dlg button', { hasText: re }).last().click({ timeout: 4000 }).catch(() => {}); await U.wait(600); };
export const tripOf = (U, titre) => U.ev(t => { const x = Object.values(CV._R()).find(r => r.type === 'trip' && !r.deleted && r.titre === t); return x ? x.id : ''; }, titre);
export const go = async (U, titre) => { const id = await tripOf(U, titre); await U.closeAll(); await U.ev(i => CV.go(i), id); await U.wait(700); return id; };
// voyage vierge, dates données en jours par rapport à aujourd’hui
export async function voyageVierge(U, titre, j1, j2, { seul = true } = {}) {
  await U.closeAll(); await U.ev(() => CV.newTrip()); await U.wait(700); await U.tap(/Voyage vierge/, null, 900);
  await U.fill('.ui-dlg input', titre); await okDlg(U); await U.wait(1800);
  await U.tap(/Choisir les dates/); await pickDay(U, iso(j1)); await pickDay(U, iso(j2));
  await U.tap(/^Enregistrer$/, null, 2500); if (seul) { await U.tap(/Je pars seul/, null, 1200); await U.closeAll(); }
}
// fiches saisies à la main dans Résas (j = premier jour du voyage, en jours par rapport à aujourd’hui)
export async function remplir(U, j) {
  const add = async cat => { await U.closeAll(); await U.tap(/^Résas/, '.cv-nav', 400); await U.ev(c => CV.tab(c), cat); await U.wait(500); await U.pg.click('#cv-fab'); await U.wait(900); };
  const save = () => U.tap(/^Enregistrer$/, null, 1300);
  await add('transport'); await fl(U, 'Intitulé', 'Train Brest → Quimper'); await fl(U, 'Mode', 'Train'); await fl(U, 'Départ', 'Gare de Brest'); await fl(U, 'Arrivée', 'Gare de Quimper'); await fl(U, 'Date', iso(j + 2)); await fl(U, 'Heure départ', '09:12'); await fl(U, 'Heure arrivée', '10:25'); await fl(U, 'Prix réel', '19,50'); await save();
  await add('hotel'); await fl(U, 'Étape', 'Brest'); await fl(U, 'Nom de', 'Hôtel de la Rade'); await U.tap(/Choisir les dates/); await pickDay(U, iso(j)); await pickDay(U, iso(j + 2)); await fl(U, 'Adresse', '6 rue de Siam, 29200 Brest'); await fl(U, 'Prix réel', '178'); await save();
  await add('hotel'); await fl(U, 'Étape', 'Quimper'); await fl(U, 'Nom de', 'Chambre d’hôtes Ty Kemper'); await U.tap(/Choisir les dates/); await pickDay(U, iso(j + 2)); await pickDay(U, iso(j + 3)); await fl(U, 'Estimation', '85'); await save();
  await add('activite'); await fl(U, 'Intitulé', 'Océanopolis'); await fl(U, 'Date', iso(j + 1)); await fl(U, 'Heure', '10:00'); await fl(U, 'Lieu', 'Port du Moulin Blanc, Brest'); await fl(U, 'Prix réel', '23,50'); await save();
  await add('divers'); await fl(U, 'Intitulé', 'Crêperie du Port'); await fl(U, 'Date', iso(j)); await fl(U, 'Heure', '20:00'); await fl(U, 'Estimation', '40'); await save();
  await U.closeAll();
}
// ☁️ carnet en ligne avec compte (serveur d’essai : le code à 6 chiffres est affiché)
export async function enLigne(U, mail) {
  await U.closeAll(); await U.ev(() => CV.cloudSheet()); await U.wait(900);
  if (!(await U.ev(() => !!document.getElementById('ac-mail')))) { await U.tap(/Tout mon carnet dans le cloud/, '#v-sheet-bg', 1500); if (await U.ev(() => !!document.querySelector('.ui-dlg'))) await okDlg(U); await U.wait(2500); }
  await compte(U, mail); await U.tap(/C’est noté/, null, 2500); await U.closeAll();
  return U.ev(() => !!(CV._M().sync.on && CV._M().sync.code));
}
// 👥 invitation personnelle d’un compagnon dans le voyage ouvert → message à lui envoyer
export async function inviter(U, prenom) {
  // tripInviteNow n’est pas attendu : la fonction ne rend la main qu’une fois le prénom saisi
  await U.closeAll(); const tid = await U.ev(() => CV._M().trip); await U.ev(t => { void CV.tripInviteNow(t); }, tid); await U.wait(1500);
  for (let k = 0; k < 3 && !(await U.ev(() => !!document.getElementById('iw-n'))); k++) { if (await U.ev(() => !!document.querySelector('.ui-dlg'))) await okDlg(U); await U.wait(1800); }
  await U.fill('#iw-n', prenom); await U.tap(/^OK$/, null, 4500);
  const code = await sheetCode(U); await U.tap(/Envoyer l’invitation/, null, 1200); const msg = await lastShare(U); await U.closeAll(); return { code, msg };
}
export const lienDe = msg => ((msg.match(/https?:\/\/\S+/) || [''])[0]).replace(/^https?:\/\/[^/]+/, '');
// le nouveau venu ouvre le lien et entre dans le voyage sous son prénom
export async function rejoindre(msg, prenom, opt = {}) {
  const C = await user(prenom, Object.assign({ url: lienDe(msg) }, opt)); await C.tap(/^Continuer$/, null, 5000);
  if (await C.ev(() => !!document.querySelector('.ui-dlg'))) { await okDlg(C); await C.wait(4000); }
  await C.ev(() => { const r = document.querySelector('#v-sheet-bg input[type=radio][value=new]'); if (r) r.click(); }); await C.fill('#jp-nom', prenom); await C.tap(/C’est bon/, null, 3500);
  for (let i = 0; i < 40 && !(await C.ev(() => { try { const M = CV._M(), t = M.trip && CV._R()[M.trip]; return !!(t && !t.deleted); } catch (e) { return false; } })); i++) await C.wait(500);   // le voyage est arrivé (machine lente : plus de 3 s)
  await C.closeAll(); return C;
}
// 👀 publication pour un abonné → message
export async function publier(U, prenom) {
  await U.closeAll(); const tid = await U.ev(() => CV._M().trip); await U.ev(t => { void CV.feedPublish(t); }, tid); await U.wait(1800);
  for (let k = 0; k < 2 && !(await U.ev(() => { const i = document.querySelector('.ui-dlg input'); return !!i; })); k++) { if (await U.ev(() => !!document.querySelector('.ui-dlg'))) await okDlg(U); await U.wait(1500); }
  await U.fill('.ui-dlg input', prenom); await okDlg(U); await U.wait(4500);
  await U.tap(/Envoyer l’invitation/, null, 1200); const msg = await lastShare(U); await U.closeAll(); await sync(U); return msg;
}
export async function suivreWeb(msg, prenom) {
  const V = await user(prenom, { url: lienDe(msg) }); await V.tap(/Voir le voyage maintenant/, null, 5000);
  await V.fill('#cv-feed input[placeholder="Prénom"]', prenom); await V.tap(/^OK$/, '#cv-feed', 2000); return V;
}
export async function suivreAppli(msg, prenom) {
  const P = await user(prenom); await P.ev(m => { window.__clip = m; }, msg); await P.tap(/Coller mon invitation/, null, 5000);
  await P.fill('#cv-fnom', prenom); await P.tap(/Suivre ses voyages/, null, 6000); return P;
}
export const aimerTout = async V => { const ids = await V.ev(() => [...document.querySelectorAll('#cv-feed [onclick^="CV.feedLike"]')].map(b => b.getAttribute('onclick').match(/'([^']+)'/)[1])); for (const id of ids) { await V.ev(i => CV.feedLike(i), id); await V.wait(400); } return ids; };
export const commenter = async (V, fid, texte) => { await V.fill('[id="cm-' + fid + '"]', texte); await V.ev(i => CV.feedComment(i), fid); await V.wait(1200); };
export const wsync = async V => { await V.ev(() => CV.syncNow && CV.syncNow(true)).catch(() => {}); await V.wait(2500); };
// 🧑‍🤝‍🧑 l’état complet : Anthony (compte, voyage en cours partagé et publié), Claire compagnon, Victoria abonnée (navigateur)
export async function partage({ abonne = true } = {}) {
  // une adresse e-mail par carnet : le serveur limite les codes envoyés à une même adresse (4 par heure)
  const A = await carnet('Anthony'); await voyageVierge(A, 'Rome à deux', -1, 2, { seul: false });
  await A.tap(/Inviter quelqu’un de nouveau/, null, 2500); await okDlg(A); await A.wait(4000); await compte(A, 'anthony' + (Date.now() % 1e7) + '@example.org'); await A.tap(/C’est noté/, null, 3000);
  await okDlg(A); await A.wait(1500); await A.fill('#iw-n', 'Claire'); await A.tap(/^OK$/, null, 4500);
  await A.tap(/Envoyer l’invitation/, null, 1200); const msg = await lastShare(A); await A.closeAll();
  const C = await rejoindre(msg, 'Claire');
  await souvenir(C, 'Fontaine de Trevi', 'Fontaine de Trevi', 'On a jeté une pièce, évidemment.', [PHOTO[0]]);
  await souvenir(A, 'Colisée au petit matin', 'Rome', 'Personne à 7 h, le pied.', [PHOTO[1]]);
  await sync(C, A); let V = null;
  if (abonne) { const m = await publier(A, 'Victoria'); V = await suivreWeb(m, 'Victoria'); const ids = await aimerTout(V); if (ids[1]) await commenter(V, ids[1], 'Trop beau ! Vous me ramenez une glace ?'); await wsync(V); await sync(A, C); await sync(A, C); }
  return { A, C, V };
}
// 💶 dépense saisie pendant le voyage (écran « Aujourd’hui »)
export async function depense(U, titre, montant, { par, entre } = {}) {
  await U.closeAll(); await U.ev(() => CV.tlReceipt()); await U.wait(900);
  await U.fill('#v-sheet-bg input[name=titre]', titre); await U.fill('#rc-m', String(montant));
  if (par) await U.ev(n => { const s = document.getElementById('rc-p'), o = [...s.options].find(o => o.text.trim() === n); if (o) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); } }, par);
  if (entre) await U.ev(n => { const s = document.getElementById('rc-s'), o = [...s.options].find(o => o.text.includes(n)); if (o) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); } }, entre);
  await U.tap(/^Enregistrer$/, '#v-sheet-bg', 1500); await U.closeAll();
}
// 🔎 petits lecteurs d’état pour les vérifications
export const voyage = (U, titre) => U.ev(t => { const R = CV._R(), x = Object.values(R).find(r => r.type === 'trip' && !r.deleted && r.titre === t); if (!x) return null;
  const adm = (x.adminBy && R[x.adminBy] ? x.adminBy : x.createdBy && R[x.createdBy] ? x.createdBy : (x.voyageurs || [])[0]) || ''; return { id: x.id, voyageurs: (x.voyageurs || []).map(v => (R[v] || {}).nom || '?'), admin: (R[adm] || {}).nom || '', ro: !!x.ro }; }, titre);
export const heros = U => U.ev(() => [document.querySelector('.cv-adm-p'), document.querySelector('.cv-av-names')].map(e => ((e || {}).textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | '));
export const ecran = (U, n = 4000) => U.ev(n => (document.querySelector('#cv-body') || document.body).innerText.replace(/\s+/g, ' ').slice(0, n), n);
export const dessus = async U => { const t = await U.top(); return t.s + ' ' + t.t; };
export const fiches = (U, type, champ = 'titre') => U.ev(([t, c]) => Object.values(CV._R()).filter(r => r.type === t && !r.deleted).map(r => r[c] || ''), [type, champ]);
export const corbeille = async (U) => { await U.closeAll(); await U.ev(() => CV.spCompSheet()); await U.wait(900); await U.pg.locator('#v-sheet-bg [onclick*="spCompDel"]').first().click({ timeout: 4000 }).catch(() => {}); await U.wait(700); };
export const croix = async (U) => { await U.closeAll(); await U.ev(() => CV.spCompSheet()); await U.wait(900); await U.pg.locator('#v-sheet-bg .sp2-tx').first().click({ timeout: 4000 }).catch(() => {}); await U.wait(700); };
export const dlgTxt = U => U.ev(() => { const d = [...document.querySelectorAll('.ui-dlg')].pop(); return d ? d.innerText.replace(/\s+/g, ' ') : ''; });
