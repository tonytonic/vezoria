// 👀 Visite d'un NOUVEL utilisateur, écran par écran, avec captures (revue d'expérience à l'œil) et mesures simples :
//   temps d'ouverture de chaque écran, nombre d'appuis pour créer un 1er voyage, écrans sans bouton pour continuer.
//   OUTDIR=dossier QUIET=1 node tests/e2e/uxtour.mjs
import fs from 'node:fs';
import { user, ok, log, RES, br } from './lib.mjs';
const OUT = process.env.OUTDIR || '.'; fs.mkdirSync(OUT, { recursive: true });
const U = await user('Nouveau'); let n = 0, taps = 0; const T = [];
const shot = async (nom) => { await U.wait(400); const f = `${OUT}/${String(++n).padStart(2, '0')}-${nom}.jpg`; await U.pg.screenshot({ path: f, type: 'jpeg', quality: 80 }); return f; };
// un écran « cul-de-sac » : une fenêtre ouverte sans aucun bouton visible pour avancer, revenir ou fermer
const impasse = () => U.ev(() => { const sh = document.querySelector('#v-sheet-bg'); if (!sh) return false; const vis = [...sh.querySelectorAll('button, a[href]')].filter(b => b.getClientRects().length && !b.disabled); return vis.length === 0; });
const t = async (label, fn) => { const t0 = Date.now(); await fn(); const ms = Date.now() - t0; T.push([label, ms]); };
const tap = async (re, scope, w = 700) => { taps++; await U.tap(re, scope, w); };
try {
  await shot('accueil');
  await t('Je crée mon carnet', () => tap(/Je crée mon carnet/, null, 900)); await shot('prenom');
  await U.fill('#cv-pnom', 'Anthony'); await t('Commencer', () => tap(/^Commencer$/, null, 1500)); await shot('apres-prenom');
  ok('après le prénom : pas de cul-de-sac', !(await impasse()));
  // 1er voyage par « Je sais où je vais »
  await U.closeAll(); await t('Nouveau voyage', async () => { taps++; await U.ev(() => { void CV.newTrip(); }); await U.wait(900); }); await shot('nouveau-voyage');
  await t('Je sais où je vais', () => tap(/Je sais où je vais/, '#v-sheet-bg', 900)); await shot('wz1-qui');
  await U.ev(() => { document.getElementById('wz-titre').value = 'Lisbonne en amoureux'; }); taps++;
  await U.ev(() => document.querySelectorAll('#wz-qui + .wz-cards .wz-card')[1].click()); taps++;
  await t('Suivant 1', () => tap(/Suivant/, '#v-sheet-bg', 600)); await shot('wz2-quand');
  await U.ev(() => { const d = new Date(Date.now() + 45 * 864e5).toISOString().slice(0, 10); const i = document.getElementById('wz-debut'); i.value = d; i.dispatchEvent(new Event('input')); const k = document.getElementById('wz-nuits'); k.value = 5; k.dispatchEvent(new Event('input')); }); taps += 2;
  await t('Suivant 2', () => tap(/Suivant/, '#v-sheet-bg', 800)); await shot('wz3-ou');
  await U.ev(() => { const v = document.querySelector('.wz-et [data-k=ville]'); v.value = 'Lisbonne'; v.dispatchEvent(new Event('input')); }); taps++;
  await t('Suivant 3', () => tap(/Suivant/, '#v-sheet-bg', 900)); await shot('wz4-comment');
  await t('Suivant 4', () => tap(/Suivant/, '#v-sheet-bg', 900)); await shot('wz5-fin');
  await t('Créer le voyage', async () => { taps++; await U.ev(() => { void CV.wzCreate(); }); for (let k = 0; k < 60 && !(await U.ev(() => Object.values(CV._R()).some(r => r.type === 'trip' && !r.deleted && r.titre === 'Lisbonne en amoureux'))); k++) await U.wait(100); }); await U.wait(2500); await shot('voyage-cree');
  ok('après la création : pas de cul-de-sac', !(await impasse()));
  log('   appuis pour créer un 1er voyage : ' + taps);
  ok('1er voyage créé en 15 appuis au plus (' + taps + ')', taps <= 15);
  await U.closeAll(); await shot('accueil-voyage');
  for (const [k, nom] of [['prog', 'programme'], ['resas', 'reservations'], ['sous', 'budget'], ['envies', 'envies'], ['check', 'checklist'], ['livret', 'livret'], ['reglages', 'reglages']]) {
    await t('écran ' + nom, async () => { await U.ev(k => CV.navTo(k), k); await U.wait(900); }); await U.closeAll(); await shot(nom); }
  // « Où partir ? » de bout en bout
  await t('Où partir ?', async () => { await U.ev(() => { void CV.inspire(); }); await U.wait(900); }); await shot('inspire1');
  for (let p = 2; p <= 5; p++) { await U.ev(() => document.querySelector('.in-next') && document.querySelector('.in-next').click()); await U.wait(400); await shot('inspire' + p); }
  await t('Où partir ? résultats', async () => { await U.ev(() => { const b = document.querySelector('.in-go'); b && b.click(); }); for (let k = 0; k < 60 && !(await U.ev(() => /\d+\s*(nuits?|jours?)|€/i.test((document.querySelector('#v-sheet-bg') || document.body).innerText) && !!document.querySelector('#v-sheet-bg .ins-c, #v-sheet-bg .in-res, #v-sheet-bg li, #v-sheet-bg .iti'))); k++) await U.wait(100); }); await U.wait(1500); await shot('inspire-resultats');
  ok('« Où partir ? » : des idées s’affichent', await U.ev(() => /nuit|jour|€/i.test((document.querySelector('#v-sheet-bg') || document.body).innerText)));
  await U.closeAll(); await U.ev(() => CV.navTo('plus')); await U.wait(800); await shot('plus');
} catch (e) { ok('la visite va jusqu’au bout', false, String(e && e.stack || e).split('\n').slice(0, 3).join(' ')); }
const slow = T.filter(([, ms]) => ms > 2500);
log('   temps par écran : ' + T.map(([l, ms]) => l + ' ' + (ms / 1000).toFixed(1) + ' s').join(' · '));
ok('aucun écran ne met plus de 2,5 s à s’ouvrir (hors attentes du test)', !slow.length, slow.map(([l, ms]) => l + ' ' + ms + ' ms').join(', '));
const errs = [...new Set(U.errs || [])]; ok('aucune erreur JavaScript', !errs.length, errs.join(' | '));
fs.writeFileSync(OUT + '/mesures.json', JSON.stringify({ taps, T }, null, 1));
const bad = RES.filter(r => !r[0]); console.log(`\n═══ ${RES.length - bad.length} vérifications réussies, ${bad.length} en échec ═══`); bad.forEach(r => console.log('  ✗ ' + r[1]));
console.log(bad.length ? '✗ ÉCHEC : ' + bad.length : '✓ OK');
await br.close(); process.exit(bad.length ? 1 : 0);
