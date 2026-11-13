// Contrôles d’écran du 13/11 : « Avec qui ? » cohérent avec le nombre de voyageurs ; transports choisis avant de créer le voyage (dont « À pied »).
//   QUIET=1 node tests/e2e/ui13b.mjs
import { ok, log, RES, br, carnet } from './lib.mjs';
const A = await carnet('Anthony');
try {
  await A.ev(() => { void CV.inspireDemo(); }); await A.wait(900);
  const st = () => A.ev(() => ({ qui: document.getElementById('in-qui').value, nb: document.getElementById('in-nb').value, on: [...document.querySelectorAll('#in-qui + .wz-cards .wz-card')].findIndex(b => b.classList.contains('on')) }));
  const card = i => A.ev(i => document.querySelectorAll('#in-qui + .wz-cards .wz-card')[i].click(), i);
  const nb = v => A.ev(v => { const s = document.getElementById('in-nb'); s.value = v; s.dispatchEvent(new Event('change')); }, v);
  await card(0); let s = await st(); ok('« Seul(e) » → 1 voyageur', s.qui === 'solo' && s.nb === '1', JSON.stringify(s));
  await nb('2'); s = await st(); ok('2 voyageurs → « En couple » s’allume, « Seul(e) » s’éteint', s.qui === 'couple' && s.on === 1, JSON.stringify(s));
  await nb('4'); s = await st(); ok('4 voyageurs → « Entre amis »', s.qui === 'amis' && s.on === 2, JSON.stringify(s));
  await card(3); s = await st(); ok('« En famille » garde 4 voyageurs', s.qui === 'famille' && s.nb === '4', JSON.stringify(s));
  await card(1); s = await st(); ok('« En couple » → 2 voyageurs', s.qui === 'couple' && s.nb === '2', JSON.stringify(s));
  await nb('1'); s = await st(); ok('1 voyageur → « Seul(e) »', s.qui === 'solo' && s.on === 0, JSON.stringify(s));
  await card(2); s = await st(); ok('« Entre amis » depuis 1 voyageur → au moins 2', s.qui === 'amis' && +s.nb >= 2, JSON.stringify(s));
  // jusqu’à l’écran de vérification, puis choix des transports
  await A.ev(() => { document.querySelector('.in-w').dataset.p = 4; document.querySelector('.in-next').click(); }); await A.wait(400);
  await A.ev(() => document.querySelector('.in-go').click()); await A.wait(3000);
  await A.ev(() => { const b = [...document.querySelectorAll('#v-sheet-bg button')].find(x => /Créer tel quel/.test(x.innerText)); b && b.click(); }); await A.wait(1500);
  const chips = () => A.ev(() => [...document.querySelectorAll('#v-sheet-bg .v-f')].filter(f => /Pour y aller et revenir|Entre les étapes/.test(f.innerText)).map(f => f.querySelector('label').innerText.trim() + ' : ' + [...f.querySelectorAll('.v-chip')].map(b => (b.classList.contains('on') ? '[' : '') + b.innerText.trim() + (b.classList.contains('on') ? ']' : '')).join(' ')));
  let c = await chips(); ok('écran de vérification : « Pour y aller et revenir » proposé', c.some(x => /Pour y aller/.test(x) && /Peu importe/.test(x) && /Voiture/.test(x)), JSON.stringify(c));
  const multi = c.some(x => /Entre les étapes/.test(x)); log('   plusieurs étapes : ' + multi + ' · ' + JSON.stringify(c));
  const tap = (k, m) => A.ev(([k, m]) => CV.tcfSet(k, m, 1), [k, m]);
  await tap('go', 'Train'); if (multi) await tap('leg', 'À pied'); await A.wait(400); c = await chips();
  ok('le choix s’allume (Train pour y aller' + (multi ? ', À pied entre les étapes)' : ')'), c.some(x => /\[(🚆 )?Train\]/.test(x)) && (!multi || c.some(x => /\[(🚶 )?À pied\]/.test(x))), JSON.stringify(c));
  await A.ev(() => [...document.querySelectorAll('#v-sheet-bg button')].find(x => /Créer le voyage/.test(x.innerText)).click()); await A.wait(3500); await A.closeAll();
  const tr = await A.ev(() => { const R = CV._R(), t = Object.values(R).filter(r => r.type === 'trip' && !r.deleted).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0]; return Object.values(R).filter(r => r.trip === t.id && r.cat === 'transport' && !r.deleted).sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(r => (r.mode || '(peu importe)') + ' · ' + r.titre); });
  ok('voyage créé : aller et retour en train', tr.length >= 2 && tr[0].startsWith('Train') && tr[tr.length - 1].startsWith('Train'), JSON.stringify(tr));
  if (multi) ok('… et les trajets entre étapes à pied', tr.slice(1, -1).length > 0 && tr.slice(1, -1).every(x => x.startsWith('À pied')), JSON.stringify(tr));
  // « À pied » dans la fiche d’un trajet
  const has = await A.ev(() => { const R = CV._R(), it = Object.values(R).find(r => r.cat === 'transport' && !r.deleted); CV.edit ? CV.edit(it.id) : 0; return it.id; }); await A.wait(900);
  const opts = await A.ev(() => [...document.querySelectorAll('#v-sheet-bg select[name="mode"] option')].map(o => o.textContent.trim()));
  ok('fiche d’un trajet : « À pied » dans la liste des modes', opts.some(o => /À pied/.test(o)), JSON.stringify(opts));
} catch (e) { ok('déroulé sans erreur', false, String(e && e.stack || e).slice(0, 400)); }
if (A.errs.length) ok('aucune erreur JavaScript', false, [...new Set(A.errs)].join(' | '));
const bad = RES.filter(r => !r[0]); console.log(`\n═══ ${RES.length - bad.length} vérifications réussies, ${bad.length} en échec ═══`); console.log(bad.length ? '✗ ÉCHEC' : '✓ OK');
await br.close(); process.exit(bad.length ? 1 : 0);
