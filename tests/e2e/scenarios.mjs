// 🎬 Parcours rejoués à chaque livraison, avec vérification du RÉSULTAT (pas seulement « ça ne plante pas »).
// usage : node tests/e2e/scenarios.mjs [filtre]     QUIET=1 pour n’afficher que les vérifications
import { user, carnet, say, log, ok, RES, sync, souvenir, iso, apiLog, lastShare, sheetCode, compte, br, pickDay, fl, BASE } from './lib.mjs';
import { voyageVierge, remplir, depense, enLigne, inviter, rejoindre, publier, suivreWeb, suivreAppli, aimerTout, commenter, wsync, partage, okDlg, PHOTO, go, tripOf, lienDe, voyage, heros, ecran, dessus, fiches, corbeille, croix, dlgTxt } from './etats.mjs';
const SC = {};

SC['01 création à la main, budget au centime'] = async us => {
  const A = await carnet('Anthony'); us.push(A);
  await A.closeAll(); await A.ev(() => CV.newTrip()); await A.wait(700); await A.tap(/Voyage vierge/, null, 900); await A.fill('.ui-dlg input', 'Bretagne à la main'); await okDlg(A); await A.wait(1800);
  await A.tap(/Choisir les dates/); await pickDay(A, iso(20)); await pickDay(A, iso(23)); await A.tap(/^Enregistrer$/, null, 2500);
  const d = await dessus(A); ok('après la création : une seule fenêtre, « Avec qui pars-tu ? »', /Avec qui pars-tu/.test(d), d.slice(0, 120));
  ok('sans compagnon, la fenêtre ne parle pas de « tes compagnons » qui reçoivent le voyage', !/arrive chez tes compagnons/.test(d));
  await A.tap(/Je pars seul/, null, 1500); const d2 = await A.top(); ok('pas de 2e fenêtre derrière (sauvegarde, bienvenue)', d2.s === '#cv-body', d2.s + ' ' + d2.t.slice(0, 80));
  await remplir(A, 20);
  await A.tap(/^Budget/, '.cv-nav', 1200); const b = await ecran(A); ok('budget = 346 € (19,50 + 178 + 85 + 23,50 + 40)', /346/.test(b), b.slice(0, 200));
  await A.tap(/^Programme/, '.cv-nav', 800); await A.tap(/^Jours$/, null, 500); await A.tap(/Déplier tous les jours/, null, 800); const p = await ecran(A, 6000);
  ok('le train est rangé au 3e jour, la visite au 2e, la crêperie au 1er', /J1[^J]*Crêperie/.test(p) && /J2[^J]*Océanopolis/.test(p) && /J3[^J]*Train Brest/.test(p), p.slice(p.indexOf('J1'), p.indexOf('J1') + 400));
  // lieu ajouté à la main pour le jour 2
  await A.tap(/^＋ Lieu$/, null, 900); await A.fill('#v-sheet-bg input[placeholder^="Ex. Annecy"]', 'Pointe Saint-Mathieu'); await A.ev(() => { const s = document.querySelector('#v-sheet-bg select'); s.value = s.options[2].value; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await A.tap(/Ajouter et explorer/, null, 3000); await A.closeAll(); const p2 = await ecran(A, 6000); ok('un lieu ajouté à la main apparaît dans son jour', /J2[^J]*Pointe Saint-Mathieu/.test(p2));
  await A.tap(/Itinéraire$/, '#d-' + iso(21), 1200); const it = await dessus(A); ok('l’itinéraire du jour liste la visite saisie dans Résas', /Océanopolis/.test(it) && !/Pas encore de visite/.test(it), it.slice(0, 200));
};

SC['02 voyage en cours : Step ici, photos, bilan'] = async us => {
  const A = await carnet('Anthony'); us.push(A); await voyageVierge(A, 'En cours', -1, 5);
  await A.ev(() => CV.navTo('i:live:live')); await A.wait(800); await A.tap(/^Step ici$/, '#cv-body', 6500);
  const f = await dessus(A); ok('Step ici ouvre la fiche du souvenir', /souvenir/i.test(f), f.slice(0, 100)); ok('la fiche dit « Posé sur la carte »', /Posé sur la carte/.test(f) && !/Pas encore placé/.test(f), (f.match(/(Posé|Pas encore)[^|]{0,40}/) || [''])[0]);
  const inp = A.pg.locator('#v-sheet-bg input[type=file]').last(); await inp.setInputFiles(PHOTO); await A.wait(2500); const f2 = await dessus(A); ok('le compteur suit les photos ajoutées : « Photos (2) »', /Photos \(2\)/.test(f2), (f2.match(/Photos \(\d+\)/) || [''])[0]);
  await A.fill('#v-sheet-bg input[name=titre]', 'Colisée'); await A.tap(/^Enregistrer$/, '#v-sheet-bg', 2500); await A.closeAll();
  ok('le souvenir est enregistré avec sa position', await A.ev(() => Object.values(CV._R()).some(r => r.type === 'souv' && r.titre === 'Colisée' && r.lat && (r.photos || []).length === 2)));
  await A.ev(() => CV.navTo('i:bilan:bilan')); await A.wait(1500); const b = await ecran(A, 5000);
  ok('bilan pendant le voyage : « En cours », pas « Quel voyage ! »', /En cours/i.test(b) && !/Quel voyage/i.test(b), b.slice(0, 160));
  const m = b.match(/(\d+) jours? sans souvenir/); ok('les jours pas encore vécus ne comptent pas dans « sans souvenir » (au plus 1 ici)', !m || +m[1] <= 1, m && m[0]);
  // sans localisation : la fiche s’ouvre quand même
  const B = await user('Sansgps', { geo: null }); us.push(B); await B.tap(/Je crée mon carnet/, null, 300); await B.fill('#cv-pnom', 'Sansgps'); await B.tap(/^Commencer$/, null, 1500); await voyageVierge(B, 'Sans GPS', -1, 3);
  await B.ev(() => CV.navTo('i:live:live')); await B.wait(800); await B.tap(/^Step ici$/, '#cv-body', 7000); const g = await B.top();
  ok('Step ici sans localisation : la fiche s’ouvre quand même, avec un message', /souvenir/i.test(g.t), (g.toast || '') + ' ' + g.t.slice(0, 80));
};

SC['03 invitation d’un compagnon qui n’a pas Vezoria'] = async us => {
  const A = await carnet('Anthony'); us.push(A); await voyageVierge(A, 'Rome à deux', -1, 2, { seul: false });
  await A.tap(/Inviter quelqu’un de nouveau/, null, 2500); await okDlg(A); await A.wait(4000); ok('inviter sans compte → l’appli demande de créer le compte', await A.ev(() => !!document.getElementById('ac-mail')));
  await compte(A, 'anthony@example.org'); const c = await dessus(A); ok('le texte sous le code administrateur ne dit plus « Pas de compte chez Vezoria »', !/Pas de compte chez Vezoria/.test(c));
  await A.tap(/C’est noté/, null, 3000); const d = await dessus(A); ok('après « C’est noté », l’invitation reprend (pas l’écran Cloud)', /Envoyer « Rome à deux »|Qui invites-tu/.test(d), d.slice(0, 120));
  await okDlg(A); await A.wait(1500); await A.fill('#iw-n', 'Claire'); await A.tap(/^OK$/, null, 4500); const s = await dessus(A);
  ok('aucune fenêtre technique « remises en file d’envoi » au milieu', !/remises en file/.test(s) && /Invitation (de|pour) Claire/.test(s), s.slice(0, 100));
  await A.tap(/Envoyer l’invitation/, null, 1200); const msg = await lastShare(A); await A.closeAll(); ok('le message contient un lien avec le code', /#rejoindre=[A-Z0-9-]{14}/.test(msg), msg.slice(0, 200));
  const C = await user('Claire', { url: lienDe(msg) }); us.push(C); await C.tap(/^Continuer$/, null, 5500); const q = await dessus(C);
  ok('le nouveau entre dans le voyage sans qu’on lui demande un compte', /Bienvenue/.test(q) && /Qui es-tu/.test(q) && !/crée ton compte|Connexion impossible/.test(q), q.slice(0, 160));
  ok('l’invité voit qui administre le voyage', /Administrateur du voyage : ?Anthony/.test(q));
  ok('le profil de l’hôte n’est pas proposé comme « c’est moi »', await C.ev(() => ![...document.querySelectorAll('input[name=jp-me]')].some(r => r.value !== 'new')));
  ok('la case « ton prénom » est cochée d’office', await C.ev(() => (document.querySelector('input[name=jp-me]:checked') || {}).value === 'new'));
  await C.fill('#jp-nom', 'anthony'); await C.tap(/C’est bon/, null, 1200); const r = await dlgTxt(C); ok('un prénom déjà pris est refusé (même sans majuscule)', /existe déjà dans ce carnet/.test(r), r.slice(0, 120)); await okDlg(C);
  await C.fill('#jp-nom', 'Claire'); await C.tap(/C’est bon/, null, 3500); await C.closeAll(); await C.wait(9500);
  ok('9 s après : pas de question « Le profil … existe déjà, c’est toi ? » chez l’invité', !(await dlgTxt(C)));
  const v = await voyage(C, 'Rome à deux'); ok('Claire est voyageuse, Anthony reste admin', v && v.voyageurs.includes('Claire') && v.voyageurs.includes('Anthony') && v.admin === 'Anthony', JSON.stringify(v));
  await souvenir(C, 'Fontaine de Trevi', 'Fontaine de Trevi', 'Une pièce.', [PHOTO[0]]); await souvenir(A, 'Colisée', 'Rome', 'Tôt.', [PHOTO[1]]); await sync(C, A); await sync(C, A);
  ok('le souvenir de Claire arrive chez Anthony', (await fiches(A, 'souv')).includes('Fontaine de Trevi')); ok('le souvenir d’Anthony arrive chez Claire', (await fiches(C, 'souv')).includes('Colisée'));
  await A.closeAll(); await A.ev(() => (CV._M().trip && CV.go(CV._M().trip))); await A.wait(600); const h = await heros(A); ok('l’étoile « Admin » est sur l’admin en haut du voyage (et sur sa pastille seulement)', /★ ?Admin ?Anthony/.test(h) && await A.ev(() => [...document.querySelectorAll('#cv-avs .cv-av')].filter(x => x.querySelector('.cv-adm')).map(x => x.innerText.replace(/\W/g, '')).join() === 'A'), h);
};

SC['04 code compagnon de tout le carnet'] = async us => {
  const A = await carnet('Anthony'); us.push(A); await voyageVierge(A, 'Lisbonne', 10, 14); ok('carnet en ligne avec compte', await enLigne(A, 'a4@example.org'));
  await A.ev(() => CV.cloudSheet()); await A.wait(1000); await A.tap(/Créer un code compagnon/, '#v-sheet-bg', 1500); await A.fill('.ui-dlg input', 'Marc'); await okDlg(A); await A.wait(5000);
  await A.tap(/Envoyer l’invitation/, null, 1200); const msg = await lastShare(A); await A.closeAll(); ok('le lien du message porte le code', /#rejoindre=[A-Z0-9-]{14}/.test(msg), msg.slice(-160));
  const M = await user('Marc', { url: lienDe(msg) }); us.push(M); ok('le code est déjà rempli à l’ouverture', /^[A-Z0-9-]{14}$/.test(await M.ev(() => (document.getElementById('cv-scode') || {}).value || '')));
  await M.tap(/^Continuer$/, null, 5000); const q = await dlgTxt(M); ok('question « Rejoindre le carnet d’Anthony en compagnon ? »', /Rejoindre le carnet de Anthony en compagnon/.test(q), q.slice(0, 120)); await okDlg(M); await M.wait(5000);
  const d = await dessus(M); ok('Marc entre dans le carnet (plus de « Connexion impossible »)', /Bienvenue|Qui es-tu/.test(d) && !/Connexion impossible/.test(d), d.slice(0, 140));
  await M.ev(() => { const r = document.querySelector('#v-sheet-bg input[type=radio][value=new]'); if (r) r.click(); }); await M.fill('#jp-nom', 'Marc'); await M.tap(/C’est bon/, null, 3500); await M.closeAll();
  ok('Marc voit le voyage d’Anthony', !!(await tripOf(M, 'Lisbonne')));
};

SC['05 abonnés : navigateur et appli, j’aime, commentaires, réponses'] = async us => {
  const { A, C, V } = await partage(); us.push(A, C, V);
  const vf = await V.ev(() => document.querySelector('#cv-feed').innerText.replace(/\s+/g, ' ')); ok('l’abonnée voit les 2 souvenirs dans son navigateur', /Colisée/.test(vf) && /Fontaine de Trevi/.test(vf), vf.slice(0, 200));
  ok('l’en-tête dit « Voyage d’Anthony & Claire » (élision)', /Voyage d’Anthony & Claire/.test(vf), (vf.match(/Voyage d.{0,30}/) || [''])[0]);
  for (const U of [A, C]) { await U.closeAll(); await U.ev(() => CV.socialHub('lk')); await U.wait(1300); const t = await dessus(U);
    ok(`${U.name} voit le j’aime et le commentaire de Victoria`, /Victoria/.test(t) && /Trop beau/.test(t), t.slice(0, 160));
    await U.tap(/Trop beau/, null, 2200); const t2 = await dessus(U); ok(`${U.name} : toucher le commentaire mène au souvenir`, /Fontaine de Trevi/.test(t2) && /Écrire un commentaire|Envoyer/.test(t2), t2.slice(0, 140)); }
  await C.fill('#v-sheet-bg input[id^="cm-"]', 'Promis, pistache !'); await C.tap(/^Envoyer$/, null, 1500); await sync(C, A); await wsync(V); await V.wait(1500);
  const vf2 = await V.ev(() => document.querySelector('#cv-feed').innerText.replace(/\s+/g, ' ')); ok('la réponse de Claire apparaît chez l’abonnée sans rouvrir la page', /Promis, pistache/.test(vf2), vf2.slice(-200));
  await A.closeAll(); await A.ev(() => (CV._M().trip && CV.go(CV._M().trip))); await A.wait(600); const hs = await A.ev(() => document.getElementById('cv-hstats') ? document.getElementById('cv-hstats').innerText.replace(/\s+/g, ' ') : document.querySelector('.header').innerText.replace(/\s+/g, ' '));
  ok('« 1 abonné » au singulier', /1 abonné(?!s)/.test(hs), hs.slice(0, 120));
  // abonné dans l’appli, par « Coller mon invitation »
  const m = await publier(A, 'Paul'); const P = await suivreAppli(m, 'Paul'); us.push(P); const pf = await P.ev(() => (document.querySelector('#cv-feed') || document.body).innerText.replace(/\s+/g, ' '));
  ok('Paul suit le voyage dans l’appli', /Rome à deux/.test(pf) && /Colisée/.test(pf), pf.slice(0, 160));
  // retrait de l’abonnée Victoria
  await A.closeAll(); await A.ev(() => CV.socialHub('fw')); await A.wait(1200); await A.tap(/^Victoria/, null, 1500); await A.tap(/Retirer cet abonné/, null, 1200); await okDlg(A); await A.wait(4500); await sync(A);
  await wsync(V); await V.pg.reload(); await V.wait(4500); const va = await V.ev(() => document.body.innerText.replace(/\s+/g, ' ')); ok('Victoria retirée ne voit plus le voyage', !/Colisée/.test(va) && !/Fontaine de Trevi/.test(va), va.slice(0, 160));
};

SC['06 admin : étoile, seul l’admin retire, passer l’admin, départ'] = async us => {
  const { A, C } = await partage({ abonne: false }); us.push(A, C);
  await corbeille(C); let t = await dlgTxt(C); ok('Claire (compagnon) ne peut pas retirer Anthony : refus immédiat', /Seul l’admin du voyage \(Anthony\) peut retirer/.test(t), t.slice(0, 140)); ok('aucune reprise de l’admin proposée', !/Reprendre l’admin/.test(t)); await okDlg(C);
  await croix(C); t = await dlgTxt(C); ok('la croix du voyage est refusée aussi', /Seul l’admin/.test(t), t.slice(0, 100)); await okDlg(C); await sync(C, A);
  let v = await voyage(A, 'Rome à deux'); ok('Anthony garde son accès et reste admin', v.voyageurs.includes('Anthony') && v.admin === 'Anthony' && !v.ro, JSON.stringify(v));
  // passer l’admin
  await A.closeAll(); await A.ev(() => CV.spCompSheet()); await A.wait(900); await A.tap(/Lui passer l’admin/, '#v-sheet-bg', 900); t = await dlgTxt(A); ok('confirmation « Passer l’administration de … à Claire ? »', /Passer l’administration de « Rome à deux » à Claire/.test(t), t.slice(0, 120)); await okDlg(A); await A.wait(3500);
  for (let i = 0; i < 3; i++) await sync(A, C); await C.closeAll(); await C.ev(() => (CV._M().trip && CV.go(CV._M().trip))); await C.wait(600);
  v = await voyage(C, 'Rome à deux'); ok('chez Claire : elle est admin, Anthony reste voyageur', v.admin === 'Claire' && v.voyageurs.includes('Anthony'), JSON.stringify(v)); ok('l’étoile « Admin » passe sur Claire', /★ ?Admin ?Claire/.test(await heros(C)), await heros(C));
  await corbeille(A); t = await dlgTxt(A); ok('Anthony, qui n’est plus admin, ne peut plus retirer Claire', /Seul l’admin du voyage \(Claire\)/.test(t), t.slice(0, 100)); await okDlg(A);
  // Claire (admin) retire Anthony
  await corbeille(C); await okDlg(C); await C.wait(6500); for (let i = 0; i < 4; i++) { await sync(C, A); await A.wait(1200); } await A.closeAll(); await A.ev(() => CV.go(Object.values(CV._R()).find(r => r.type === 'trip' && r.titre === 'Rome à deux').id)); await A.wait(1200);
  v = await voyage(A, 'Rome à deux'); ok('Anthony retiré : son voyage passe en lecture seule', v && v.ro, JSON.stringify(v));
  const band = await ecran(A, 600); ok('le bouton « Retirer ce voyage de mon Vezoria » est là tout de suite', /Retirer ce voyage de mon Vezoria/.test(band), band.slice(0, 160));
  await souvenir(C, 'Après le départ', '', 'Sans lui.', []); await sync(C, A); await sync(C, A); ok('Anthony ne reçoit plus les nouveaux souvenirs', !(await fiches(A, 'souv')).includes('Après le départ'));
  await A.tap(/Retirer ce voyage de mon Vezoria/, '#cv-body', 900); await okDlg(A); await A.wait(2500); ok('il peut retirer sa copie', !(await tripOf(A, 'Rome à deux')));
};

SC['07 départ volontaire de l’admin'] = async us => {
  const { A, C } = await partage({ abonne: false }); us.push(A, C); const tid = await tripOf(A, 'Rome à deux');
  await A.closeAll(); await A.ev(t => CV.tripUnshare(t), tid); await A.wait(1200); const d = await dessus(A); ok('en quittant, l’admin doit dire à qui il passe le voyage', /Tu es l’admin/.test(d) && /tu le passes à/.test(d) && /Claire/.test(d), d.slice(0, 400));
  ok('le bouton de départ est là', await A.tap(/Les laisser aux autres|Quitter le voyage partagé/, '#v-sheet-bg', 3500) !== false); if (await dlgTxt(A)) await okDlg(A); await A.wait(3500); for (let i = 0; i < 3; i++) await sync(A, C);
  const v = await voyage(C, 'Rome à deux'); ok('chez Claire : elle devient admin, Anthony n’est plus voyageur', v.admin === 'Claire' && !v.voyageurs.includes('Anthony'), JSON.stringify(v));
};

SC['08 compagnon retiré qui suit en abonné : seulement ce voyage'] = async us => {
  const { A, C } = await partage({ abonne: false }); us.push(A, C);
  await voyageVierge(A, 'Autre voyage', 30, 33); await souvenir(A, 'Secret', '', 'Pas pour Claire.', []); await publier(A, 'Zoé');   // un 2e voyage montré aux abonnés
  await go(A, 'Rome à deux'); await publier(A, 'Léa');
  await croix(A); await okDlg(A); await A.wait(6500); for (let i = 0; i < 4; i++) { await sync(A, C); await C.wait(1200); } await C.closeAll(); await C.wait(1500);
  const d = await dessus(C); ok('Claire retirée reçoit la proposition de suivre en abonnée', /Suivre/.test(d), d.slice(0, 200));
  await C.tap(/Suivre$/, '#v-sheet-bg', 7000); await C.closeAll(); await C.ev(() => { try { CV.feedClose(); } catch (e) {} }); await wsync(C);
  // ce qu’elle VOIT à l’écran : la liste de ses suivis, puis le fil
  await C.ev(() => CV.socialHub('fo')); await C.wait(1500); const su = await dessus(C); ok('à l’écran « Mes suivis » : 1 seul voyage suivi, pas « Autre voyage »', /\b1 voyage\(s\) suivi/.test(su) && !/Autre voyage|Secret/.test(su), su.slice(0, 300)); await C.closeAll();
  const scr = await C.ev(() => document.body.innerText.replace(/\s+/g, ' ')); ok('nulle part à l’écran : ni « Autre voyage » ni son souvenir « Secret »', !/Autre voyage|Secret/.test(scr), (scr.match(/.{60}(Autre voyage|Secret).{60}/) || [''])[0]);
  // un voyage montré aux abonnés APRÈS son retrait ne lui arrive pas non plus
  await voyageVierge(A, 'Voyage d’après', 50, 53); await souvenir(A, 'Plus tard', '', 'Après son départ.', []); await publier(A, 'Tom'); await sync(A); await wsync(C); await wsync(C);
  await C.ev(() => CV.socialHub('fo')); await C.wait(1500); const su2 = await dessus(C); ok('un voyage montré aux abonnés après son retrait ne lui arrive pas (toujours 1 voyage suivi)', /\b1 voyage\(s\) suivi/.test(su2) && !/Voyage d’après|Plus tard/.test(su2), su2.slice(0, 300)); await C.closeAll();
  const scr2 = await C.ev(() => document.body.innerText.replace(/\s+/g, ' ')); ok('ni « Voyage d’après » ni « Plus tard » nulle part à l’écran', !/Voyage d’après|Plus tard/.test(scr2), (scr2.match(/.{60}(Voyage d’après|Plus tard).{60}/) || [''])[0]);
  await C.ev(() => CV.go(Object.values(CV._R()).find(r => r.type === 'trip' && r.titre === 'Rome à deux').id)); await C.wait(1000);
  await C.tap(/Retirer ce voyage de mon Vezoria/, '#cv-body', 900); await okDlg(C); await C.wait(900); const q = await dlgTxt(C); ok('2e question : garder dans les suivis ?', /Garder ce voyage dans tes suivis/.test(q), q.slice(0, 100));
  await C.pg.locator('.ui-dlg button', { hasText: /^Annuler$/ }).last().click().catch(() => {}); await C.wait(2500);
  ok('la copie en lecture seule a disparu', !(await tripOf(C, 'Rome à deux'))); ok('les profils des autres sont nettoyés de son téléphone', !(await fiches(C, 'profile', 'nom')).includes('Anthony'), JSON.stringify(await fiches(C, 'profile', 'nom')));
};

SC['09 sans compte : ＋ Ajouter un abonné et Lien commun demandent le compte'] = async us => {
  const V = await carnet('Victoria'); us.push(V); await voyageVierge(V, 'Été 27', 30, 35);
  await V.ev(() => CV.socialHub('fw')); await V.wait(1200); await V.tap(/＋ Ajouter/, null, 1800); let d = await dessus(V); ok('＋ Ajouter sans compte → « Partager en ligne demande un compte »', /Partager en ligne demande un compte/.test(d), d.slice(0, 120));
  await V.closeAll(); await V.ev(() => CV.socialHub('fw')); await V.wait(1200); await V.tap(/Lien commun/, null, 1800); d = await dessus(V); ok('Lien commun sans compte → même demande', /Partager en ligne demande un compte/.test(d), d.slice(0, 120));
};

SC['10 en anglais : un prénom n’est jamais traduit'] = async us => {
  const C = await user('Claire', { lang: 'en' }); us.push(C); await C.ev(() => { document.querySelector('[onclick*="obPick(\'new\')"], .ob-c') && 0; });
  await C.tap(/I.?m creating my|Je crée mon carnet|create my/i, null, 400); await C.fill('#cv-pnom', 'Claire'); await C.ev(() => CV.obCreate('blank')); await C.wait(2500);
  await C.closeAll(); await C.ev(() => CV.newTrip()); await C.wait(800); await C.ev(() => CV.obCreate && 0);
  const t = await C.top(); await C.tap(/Blank trip|Voyage vierge/i, null, 900); await C.fill('.ui-dlg input', 'Rome'); await okDlg(C); await C.wait(1800); await C.tap(/Choose the dates|Choisir les dates/i); await pickDay(C, iso(5)); await pickDay(C, iso(8)); await C.tap(/^(Save|Enregistrer)$/i, null, 2500); await C.closeAll(); await C.ev(() => (CV._M().trip && CV.go(CV._M().trip))); await C.wait(800);
  const h = await heros(C); ok('en anglais, « Claire » reste « Claire » (pas « Light »)', /Claire/.test(h) && !/Light/.test(h), h);
  const top = await C.ev(() => document.querySelector('.header').innerText.replace(/\s+/g, ' ')); ok('l’écran est bien en anglais', /days|trip|Note/i.test(top + (await ecran(C, 800))), top.slice(0, 100));
};

SC['11 dépenses à deux : qui doit quoi'] = async us => {
  const { A, C } = await partage({ abonne: false }); us.push(A, C);
  await depense(A, 'Dîner', '60'); await depense(C, 'Taxi', '20'); await sync(A, C); await sync(A, C);
  for (const U of [A, C]) { await U.closeAll(); await U.ev(() => CV.navTo('i:live:budget')); await U.wait(1500); const t = await ecran(U, 2500);
    ok(`${U.name} : total 80 €, 40 € par personne`, /BUDGET DU VOYAGE 80 €/.test(t) && /40 € par personne/.test(t), t.slice(0, 200));
    ok(`${U.name} : « Claire 20 € → Anthony »`, /Claire 20 € → A? ?Anthony/.test(t), (t.match(/Qui doit quoi.{0,120}/) || [''])[0]); }
  await A.tap(/C’est remboursé/, '#cv-body', 1200); if (await dlgTxt(A)) await okDlg(A); await A.wait(1200); await sync(A, C); await sync(A, C);
  await C.ev(() => (CV._M().trip && CV.go(CV._M().trip))); await C.wait(800); const t2 = await ecran(C, 2500); ok('après « C’est remboursé », Claire ne doit plus rien', !/Claire 20 € →/.test(t2), (t2.match(/Qui doit quoi.{0,140}/) || [''])[0]);
};

SC['12 mon carnet sur un 2e téléphone, puis blocage de cet appareil'] = async us => {
  const A = await carnet('Anthony'); us.push(A); await voyageVierge(A, 'Lisbonne', 10, 14); ok('carnet en ligne avec compte', await enLigne(A, 'a12@example.org'));
  const code = await A.ev(() => CV._M().sync.code);
  const B = await user('Tel2'); us.push(B); await B.tap(/J’ai déjà un code/, null, 700); await B.fill('#cv-scode', code); await B.tap(/^Continuer$/, null, 6000);
  let d = await dessus(B); ok('2e téléphone avec le code administrateur → « Nouvel appareil : vérifie que c’est toi » (plus de « Connexion impossible »)', /Nouvel appareil : vérifie que c’est toi/.test(d) && /Recevoir un code/.test(d), d.slice(0, 160));
  await B.tap(/Recevoir un code/, null, 3000); const otp = await B.ev(() => { const m = (document.querySelector('#v-sheet-bg') || document.body).innerText.match(/test : (\d{6})/); return m && m[1]; });
  await B.fill('#ac-otp', otp || '000000'); await B.tap(/Valider/, null, 6500); d = await dessus(B); ok('après le code reçu par e-mail : « Qui utilise ce téléphone ? »', /Qui utilise ce téléphone/.test(d) && /Anthony/.test(d), d.slice(0, 140));
  await B.tap(/C’est moi/, '#v-sheet-bg', 2500); await B.closeAll(); ok('le voyage est là sur le 2e téléphone', !!(await tripOf(B, 'Lisbonne')));
  await go(B, 'Lisbonne'); await souvenir(B, 'Depuis le 2e téléphone', '', 'Test.', []); await sync(B, A); await sync(B, A); ok('ce qu’il ajoute arrive sur le 1er', (await fiches(A, 'souv')).includes('Depuis le 2e téléphone'));
  await A.closeAll(); await A.ev(() => CV.devSheet()); await A.wait(2500); d = await dessus(A); ok('« Mes appareils » liste les 2 appareils', (d.match(/Bloquer/g) || []).length >= 1, d.slice(0, 260));
  await A.tap(/Bloquer/, '#v-sheet-bg', 1500); if (/\?/.test(await dlgTxt(A))) await okDlg(A); await A.wait(2500); if (await dlgTxt(A)) await okDlg(A); await A.closeAll();
  await souvenir(B, 'Après blocage', '', 'Ne doit pas passer.', []); await sync(B, A); await sync(B, A); ok('appareil bloqué : ce qu’il ajoute n’arrive plus', !(await fiches(A, 'souv')).includes('Après blocage'));
  const e = await B.ev(() => JSON.stringify({ err: CV._M().sync.err || '', on: CV._M().sync.on })); ok('l’appareil bloqué est prévenu (erreur de synchro)', /bloqu|retir|refus|valid|appareil/i.test(e), e);
  const Z = await user('Zed'); us.push(Z); await Z.tap(/J’ai déjà un code/, null, 600); await Z.fill('#cv-scode', 'ABCD-EFGH-JKLM'); await Z.tap(/^Continuer$/, null, 5000); d = await dlgTxt(Z); ok('code inconnu → « Ce code n’est pas reconnu » (plus « crée ton compte »)', /n’est pas reconnu/.test(d), d.slice(0, 120));
};

SC['13 sauvegarde ZIP puis restauration sur un téléphone neuf'] = async us => {
  const A = await carnet('Anthony'); us.push(A); await voyageVierge(A, 'À sauver', -1, 3); await souvenir(A, 'Photo précieuse', 'Rome', 'À ne pas perdre.', [PHOTO[0]]); await depense(A, 'Glace', '4,50');
  await A.closeAll(); await A.ev(() => CV.zipSheet()); await A.wait(900); const dl = A.pg.waitForEvent('download', { timeout: 25000 }).catch(() => null);
  await A.tap(/Créer la sauvegarde ZIP/, '#v-sheet-bg', 3500); await A.tap(/Enregistrer la sauvegarde/, null, 2500);
  let file = ''; const d = await dl; const os = await import('node:os'), fs = await import('node:fs'), path = await import('node:path'); const out = path.join(os.tmpdir(), 'vezoria-sauvegarde-' + Date.now() + '.zip');
  if (d) { await d.saveAs(out); file = out; } else { const b64 = await A.ev(async () => { const x = (window.__sh || []).slice(-1)[0]; const f = x && x.files && x.files[0]; if (!f) return ''; const buf = new Uint8Array(await f.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 8192) s += String.fromCharCode.apply(null, buf.subarray(i, i + 8192)); return btoa(s); }); if (b64) { fs.writeFileSync(out, Buffer.from(b64, 'base64')); file = out; } }
  ok('la sauvegarde ZIP est créée', !!file && fs.statSync(file).size > 1000, file ? fs.statSync(file).size + ' octets' : 'aucun fichier');
  if (!file) return; const B = await carnet('Neuf'); us.push(B); await B.closeAll(); await B.ev(() => CV.zipSheet()); await B.wait(900);
  const fc = B.pg.waitForEvent('filechooser', { timeout: 8000 }); await B.tap(/Restaurer une sauvegarde ZIP/, '#v-sheet-bg', 300); (await fc).setFiles(file); await B.wait(6000); if (await dlgTxt(B)) { log('   dialogue:', await dlgTxt(B)); await okDlg(B); await B.wait(2500); } if (await dlgTxt(B)) await okDlg(B); await B.closeAll();
  ok('le voyage est restauré', !!(await tripOf(B, 'À sauver'))); ok('le souvenir et la dépense aussi', (await fiches(B, 'souv')).includes('Photo précieuse') && (await B.ev(() => Object.values(CV._R()).some(r => !r.deleted && r.titre === 'Glace'))));
  await go(B, 'À sauver'); await B.ev(() => CV.navTo('i:live:souv')); await B.wait(3000); ok('la photo est restaurée et s’affiche', await B.ev(() => [...document.querySelectorAll('#cv-body img')].some(i => i.complete && i.naturalWidth > 50 && i.getClientRects().length)));
};

SC['14 hors ligne puis retour du réseau, et modification en même temps'] = async us => {
  const { A, C } = await partage({ abonne: false }); us.push(A, C);
  await A.ctx.setOffline(true); await souvenir(A, 'Écrit sans réseau', '', 'Dans le métro.', []); await A.ev(() => CV.syncNow(true)).catch(() => {}); await A.wait(1500);
  ok('hors ligne : le souvenir reste sur le téléphone, rien n’est perdu', (await fiches(A, 'souv')).includes('Écrit sans réseau'));
  await A.ctx.setOffline(false); await sync(A, C); await sync(A, C); ok('au retour du réseau, il part chez le compagnon', (await fiches(C, 'souv')).includes('Écrit sans réseau'));
  // les deux modifient le même souvenir sans réseau
  const edit = async (U, titre, champ, val) => { await U.closeAll(); const id = await U.ev(t => (Object.values(CV._R()).find(r => r.type === 'souv' && !r.deleted && r.titre === t) || {}).id, titre); await U.ev(i => CV.editSouv(i), id); await U.wait(900); await U.fill('#v-sheet-bg ' + champ, val); await U.tap(/^Enregistrer$/, '#v-sheet-bg', 1500); await U.closeAll(); };
  await A.ctx.setOffline(true); await C.ctx.setOffline(true);
  await edit(A, 'Colisée au petit matin', 'input[name=titre]', 'Colisée à l’aube'); await edit(C, 'Colisée au petit matin', 'textarea[name=texte]', 'Texte corrigé par Claire.');
  await A.ctx.setOffline(false); await C.ctx.setOffline(false); for (let i = 0; i < 3; i++) await sync(A, C);
  const get = U => U.ev(() => { const r = Object.values(CV._R()).filter(r => r.type === 'souv' && !r.deleted && /Colisée/.test(r.titre)); return r.map(x => x.titre + ' / ' + x.texte).join(' ¦ '); });
  const a = await get(A), c = await get(C); ok('après synchro, les deux téléphones montrent la même chose', a === c && a.split('¦').length === 1, a + '  ≠  ' + c);
  ok('les deux modifications sont gardées (titre d’Anthony + texte de Claire)', /Colisée à l’aube/.test(a) && /Texte corrigé par Claire/.test(a), a);
};

SC['15 un invité qui a déjà son carnet rejoint depuis l’appli'] = async us => {
  const A = await carnet('Anthony'); us.push(A); await voyageVierge(A, 'Porto', 10, 13); ok('carnet en ligne', await enLigne(A, 'a15@example.org')); await go(A, 'Porto'); const { msg } = await inviter(A, 'Léa');
  const L = await carnet('Léa'); us.push(L); await voyageVierge(L, 'Mon voyage à moi', 40, 44); await L.closeAll(); await L.ev(m => { window.__clip = m; }, msg);
  await L.ev(() => CV.socialHub()); await L.wait(1000); await L.tap(/J’ai reçu une invitation/, null, 1500); let d = await L.top(); 
  if (d.i.length) { await L.fill('#v-sheet-bg input', lienDe(msg).replace(/^.*rejoindre=/, '').replace(/&.*/, '')); } await L.tap(/Coller|Rejoindre|Continuer|OK/, null, 6000); if (await dlgTxt(L)) { await okDlg(L); await L.wait(4000); }
  d = await L.top(); if (/Qui es-tu|profil/.test(d.t)) { await L.tap(/C’est bon/, null, 3000); } await L.closeAll();
  ok('Léa a rejoint « Porto » en gardant son propre voyage', !!(await tripOf(L, 'Porto')) && !!(await tripOf(L, 'Mon voyage à moi')));
  const v = await voyage(L, 'Porto'); ok('elle garde son profil « Léa » (pas de doublon)', v && v.voyageurs.filter(n => n === 'Léa').length === 1, JSON.stringify(v));
};

SC['16 photos ajoutées puis « Enregistrer » touché tout de suite'] = async us => {
  const A = await carnet('Anthony'); us.push(A); await voyageVierge(A, 'En cours', -1, 3); await A.closeAll();
  await A.ev(() => CV.editSouv(null)); await A.wait(1000); await A.fill('#v-sheet-bg input[name=titre]', 'Vite fait');
  await A.pg.locator('#v-sheet-bg input[type=file]').last().setInputFiles(PHOTO);   // 2 photos…
  await A.ev(() => { document.getElementById('v-form').requestSubmit(); });           // …et « Enregistrer » sans attendre la fin de leur préparation
  await A.wait(7000);
  const r = await A.ev(() => { const s = Object.values(CV._R()).find(r => r.type === 'souv' && r.titre === 'Vite fait'); return s ? { photos: (s.photos || []).length } : null; });
  ok('le souvenir est enregistré avec ses 2 photos (aucune perdue)', r && r.photos === 2, JSON.stringify(r));
  ok('la fiche s’est refermée toute seule une fois les photos prêtes', !(await A.ev(() => !!document.getElementById('v-form'))));
};

SC['17 démo : chaque fiche répond (sondage, courses, remboursement)'] = async us => {
  const U = await user('Robot'); us.push(U); await U.tap(/Je crée mon carnet/, null, 300); await U.fill('#cv-pnom', 'Robot'); await U.ev(() => { void CV.obCreate('demo'); });
  for (let i = 0; i < 40 && !(await U.ev(() => { try { return !!CV._M().trip; } catch (e) { return false; } })); i++) await U.wait(500); await U.wait(2500); await U.closeAll();
  const bad = await U.ev(() => Object.entries(CV._R()).filter(([k, r]) => r && r.id !== k).map(([k, r]) => r.type)); ok('chaque fiche de la démo est rangée sous son identifiant', bad.length === 0, bad.join(', '));
  await U.ev(() => CV.navTo('envies')); await U.wait(1500); const vote = () => U.ev(() => { const p = Object.values(CV._R()).find(r => r.type === 'poll' && !r.deleted); return p ? p.votes[CV._M().me] : 'pas de sondage'; });
  const v0 = await vote(); await U.ev(() => { const x = document.querySelectorAll('[onclick*="pollVote"]')[1]; if (x) x.click(); }); await U.wait(900); const v1 = await vote();
  ok('voter dans le sondage de la démo change mon vote', v1 === 1 && v0 !== 1, v0 + ' → ' + v1);
};

SC['18 abonné retiré : il ne revient pas dans le compteur aux ouvertures suivantes'] = async us => {
  const { A, C } = await partage({ abonne: false }); us.push(A, C); await publier(A, 'Léa');
  await croix(A); await okDlg(A); await A.wait(6500); for (let i = 0; i < 4; i++) { await sync(A, C); await C.wait(1200); } await C.closeAll(); await C.wait(1500);
  await C.tap(/Suivre$/, '#v-sheet-bg', 7000); await C.closeAll(); await C.ev(() => { try { CV.feedClose(); } catch (e) {} }); await wsync(C); await sync(A); await sync(A);
  const nb = async U => { const t = await U.ev(() => ((document.getElementById('cv-hstats') || {}).innerText || '').replace(/\s+/g, ' ')); const m = t.match(/(\d+) abonnés?/); return m ? +m[1] : -1; };
  await A.closeAll(); await A.ev(() => (CV._M().trip && CV.go(CV._M().trip))); await A.wait(800); const n1 = await nb(A); ok('l’ex-compagnon devenu abonné compte pour 1 abonné', n1 === 1, n1);
  await A.ev(() => CV.socialHub('fw')); await A.wait(1200); await A.tap(/^Claire/, null, 1500); await A.tap(/Retirer cet abonné/, null, 1200); await okDlg(A); await A.wait(4500); await sync(A); await A.closeAll();
  await A.ev(() => (CV._M().trip && CV.go(CV._M().trip))); await A.wait(800); const n2 = await nb(A); ok('une fois retiré : 0 abonné', n2 === 0, n2);
  const vus = [];
  for (let k = 0; k < 3; k++) { await C.pg.reload(); await C.wait(5000); await wsync(C); await A.pg.reload(); for (const t of [1500, 4000, 7000]) { await A.wait(t); vus.push(await nb(A)); } await sync(A); vus.push(await nb(A)); }
  ok('3 ouvertures de suite (lui puis moi) : le compteur reste à 0, pas de « +1 » qui va et vient', vus.every(x => x === 0), vus.join(' '));
};

// ───────── moteur ─────────
const only = process.argv[2] ? new RegExp(process.argv[2], 'i') : null; let jsErr = 0;
for (const [name, fn] of Object.entries(SC)) { if (only && !only.test(name)) continue; console.log('\n▶ ' + name); const us = []; const t0 = Date.now();
  try { await fn(us); } catch (e) { ok('le parcours va jusqu’au bout', false, String(e && e.stack || e).split('\n').slice(0, 3).join(' ')); }
  const errs = [...new Set(us.flatMap(u => u.errs))]; if (errs.length) { jsErr += errs.length; ok('aucune erreur JavaScript', false, errs.join(' | ')); }
  for (const u of us) await u.ctx.close().catch(() => {}); log(`   (${Math.round((Date.now() - t0) / 1000)} s)`); }
const bad = RES.filter(r => !r[0]); console.log(`\n═══ ${RES.length - bad.length} vérifications réussies, ${bad.length} en échec ═══`); bad.forEach(r => console.log('  ✗ ' + r[1]));
const apiBad = apiLog.filter(l => /→ 5\d\d|ERREUR SERVEUR/.test(l)); if (apiBad.length) console.log('Erreurs serveur :\n' + apiBad.slice(0, 10).join('\n'));
await br.close(); process.exit(bad.length || apiBad.length ? 1 : 0);
