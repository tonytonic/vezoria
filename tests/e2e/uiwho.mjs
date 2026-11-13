// Contrôles d’écran du 13/11 (soir) : « Qui part ? · Avec qui ? · Combien de voyageurs ? » au début de TOUTES les créations de voyage
//   QUIET=1 node tests/e2e/uiwho.mjs
import { ok, log, RES, br, carnet } from './lib.mjs';
const A = await carnet('Anthony');
const st = p => A.ev(p => ({ qui: (document.getElementById(p + '-qui') || {}).value, nb: (document.getElementById(p + '-nb') || {}).value, cards: document.querySelectorAll('#' + p + '-qui + .wz-cards .wz-card').length }), p);
const card = (p, i) => A.ev(([p, i]) => document.querySelectorAll('#' + p + '-qui + .wz-cards .wz-card')[i].click(), [p, i]);
const nb = (p, v) => A.ev(([p, v]) => { const s = document.getElementById(p + '-nb'); s.value = v; s.dispatchEvent(new Event('change')); }, [p, v]);
try {
  // 1) « Je sais où je vais » : dès le 1er écran
  await A.ev(() => { void CV.wizard(); }); await A.wait(900);
  let s = await st('wz'); ok('Je sais où je vais : « Avec qui ? » (4 cartes) et « Combien de voyageurs ? » dès le 1er écran', s.cards === 4 && !!s.nb, JSON.stringify(s));
  await card('wz', 1); s = await st('wz'); ok('Je sais où je vais : « En couple » → 2 voyageurs', s.qui === 'couple' && s.nb === '2', JSON.stringify(s));
  await nb('wz', '4'); s = await st('wz'); ok('Je sais où je vais : 4 voyageurs → « Entre amis »', s.qui === 'amis', JSON.stringify(s));
  await card('wz', 3); s = await st('wz'); ok('Je sais où je vais : « En famille » garde 4 voyageurs', s.qui === 'famille' && s.nb === '4', JSON.stringify(s));
  // on va jusqu’au bout : le voyage garde « en famille, 4 voyageurs »
  await A.ev(() => { document.getElementById('wz-titre').value = 'Famille à Lisbonne'; }); await A.ev(() => CV.wzGo(2)); await A.wait(400);
  s = await A.ev(() => { const d = new Date(Date.now() + 40 * 864e5).toISOString().slice(0, 10); const i = document.getElementById('wz-debut'); i.value = d; i.dispatchEvent(new Event('input')); return d; });
  await A.ev(() => CV.wzGo(3)); await A.wait(500); await A.ev(() => { const v = document.querySelector('.wz-et [data-k=ville]'); v.value = 'Lisbonne'; }); await A.ev(() => CV.wzGo(4)); await A.wait(500);
  await A.ev(() => CV.wzGo(5)); await A.wait(600);
  await A.ev(() => { void CV.wzCreate(); }); await A.wait(3500); await A.closeAll();
  const t = await A.ev(() => { const r = Object.values(CV._R()).find(x => x.type === 'trip' && !x.deleted && x.titre === 'Famille à Lisbonne'); return r ? { qui: r.qui, nbv: r.nbv } : null; });
  ok('Je sais où je vais : le voyage créé garde « en famille, 4 voyageurs »', !!t && t.qui === 'famille' && t.nbv === 4, JSON.stringify(t));
  // 2) globe : l’écran « Avant de dessiner » pose les mêmes questions
  await A.ev(() => { void CV.newTrip(); }); await A.wait(900); await A.ev(() => { const b = [...document.querySelectorAll('#v-sheet-bg button')].find(x => /Je le dessine sur le globe/.test(x.innerText)); b && b.click(); }); await A.wait(1200);
  s = await st('gp'); ok('globe : « Avec qui ? » et « Combien de voyageurs ? » avant de dessiner', s.cards === 4 && !!s.nb, JSON.stringify(s));
  await card('gp', 0); s = await st('gp'); ok('globe : « Seul(e) » → 1 voyageur', s.qui === 'solo' && s.nb === '1', JSON.stringify(s));
  await nb('gp', '3'); s = await st('gp'); ok('globe : 3 voyageurs → « Entre amis »', s.qui === 'amis', JSON.stringify(s));
  const g = await A.ev(() => { const d1 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), d2 = new Date(Date.now() + 37 * 864e5).toISOString().slice(0, 10);
    document.getElementById('gp-d1').value = d1; document.getElementById('gp-d2').value = d2; document.getElementById('gp-dep').value = 'Paris'; document.getElementById('gp-ret').value = 'Nantes';
    try { CV.worldPreGo(); } catch (e) {} const I = CV._M().insp || {}; return { qui: I.qui, nb: I.nb, dep: I.gDep, ret: I.gRet }; });
  ok('globe : ces réponses sont gardées pour le voyage (amis, 3, Paris → Nantes)', g.qui === 'amis' && g.nb === '3' && g.dep === 'Paris' && g.ret === 'Nantes', JSON.stringify(g));
  await A.closeAll().catch(() => {});
  // 3) « Où partir ? » : toujours là
  await A.ev(() => { void CV.inspire(); }); await A.wait(900); s = await st('in'); ok('Où partir ? : le même bloc, inchangé', s.cards === 4 && !!s.nb, JSON.stringify(s));
} catch (e) { ok('le contrôle va jusqu’au bout', false, String(e && e.stack || e).split('\n').slice(0, 3).join(' ')); }
const errs = [...new Set(A.errs || [])]; ok('aucune erreur JavaScript', !errs.length, errs.join(' | '));
const bad = RES.filter(r => !r[0]); console.log(`\n═══ ${RES.length - bad.length} vérifications réussies, ${bad.length} en échec ═══`); bad.forEach(r => console.log('  ✗ ' + r[1]));
console.log(bad.length ? '✗ ÉCHEC : ' + bad.length : '✓ OK');
await br.close(); process.exit(bad.length ? 1 : 0);
