// 🧭 Parcours guidé d'un nouveau voyage, page après page, avec captures : on avance toujours par le bouton principal,
//   comme un utilisateur pressé. On note les pages sans bouton pour avancer, les retours en arrière inattendus et les erreurs.
//   OUTDIR=dossier QUIET=1 node tests/e2e/uxguide.mjs
import fs from 'node:fs';
import { carnet, ok, log, RES, br } from './lib.mjs';
const OUT = process.env.OUTDIR || '.'; fs.mkdirSync(OUT, { recursive: true });
const A = await carnet('Anthony'); let n = 0;
const shot = async nom => { await A.wait(400); await A.pg.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-${nom}.jpg`, type: 'jpeg', quality: 78 }); };
const etat = () => A.ev(() => { const sh = document.querySelector('#v-sheet-bg'); if (!sh) return { open: false };
  const h = (sh.querySelector('h2') || {}).innerText || '', btn = [...sh.querySelectorAll('button')].filter(b => b.getClientRects().length && !b.disabled);
  return { open: true, h: h.trim().slice(0, 60), n: btn.length, labels: btn.map(b => b.innerText.trim().replace(/\s+/g, ' ').slice(0, 30)).filter(Boolean).slice(0, 12) }; });
try {
  // un voyage à 2 étapes, créé comme un nouvel utilisateur
  await A.ev(() => { void CV.wizard(); }); await A.wait(900);
  await A.ev(() => { document.getElementById('wz-titre').value = 'Portugal en couple'; document.querySelectorAll('#wz-qui + .wz-cards .wz-card')[1].click(); }); await A.ev(() => CV.wzGo(2)); await A.wait(400);
  await A.ev(() => { const d = new Date(Date.now() + 50 * 864e5).toISOString().slice(0, 10); const i = document.getElementById('wz-debut'); i.value = d; i.dispatchEvent(new Event('input')); const k = document.getElementById('wz-nuits'); k.value = 6; k.dispatchEvent(new Event('input')); });
  await A.ev(() => CV.wzGo(3)); await A.wait(500);
  await A.ev(() => { const v = document.querySelector('.wz-et [data-k=ville]'); v.value = 'Lisbonne'; }); await A.ev(() => CV.wzEt('add')); await A.wait(300);
  await A.ev(() => { const v = [...document.querySelectorAll('.wz-et [data-k=ville]')]; v[1].value = 'Porto'; const nn = [...document.querySelectorAll('.wz-et [data-k=nuits]')]; nn[0].value = 3; nn[1].value = 3; });
  await A.ev(() => CV.wzGo(4)); await A.wait(500); await A.ev(() => CV.wzGo(5)); await A.wait(600); await A.ev(() => { void CV.wzCreate(); }); await A.wait(5000); await A.closeAll();
  await shot('accueil-voyage');
  await A.ev(() => { void CV.guideSheet(); }); await A.wait(1500); await shot('parcours-menu');
  let e = await etat(); ok('le parcours guidé s’ouvre avec des choix', e.open && e.n >= 2, JSON.stringify(e)); log('   menu : ' + JSON.stringify(e.labels));
  for (const ent of ['Ma carte', 'Les visites', 'Les trajets', 'Les activités', 'Les hébergements', 'Finaliser']) {
    await A.closeAll(); await A.ev(() => { void CV.guideSheet(); }); await A.wait(1200);
    const go = await A.ev(t => { const b = [...document.querySelectorAll('#v-sheet-bg button')].find(x => x.innerText.trim().startsWith(t)); if (b) { b.click(); return true; } return false; }, ent);
    if (!go) { ok('menu du parcours : « ' + ent + ' » présent', false); continue; }
    await A.wait(1800); const nom = ent.replace(/\W+/g, '-'); await shot(nom + '-0');
    const vus = [];
    for (let k = 1; k <= 6; k++) {
      const e = await etat(); const full = await A.ev(() => !!document.querySelector('.cv-ov, #cv-world, .cp-ov, .ari-ov') && [...document.querySelectorAll('.cv-ov, #cv-world, .cp-ov, .ari-ov')].some(x => x.getClientRects().length));
      if (!e.open && !full) { log('   ' + ent + ' : page ' + k + ' — revenu à l’appli'); break; }
      vus.push(e.h || '(écran plein)');
      const clic = await A.ev(() => { const sh = document.querySelector('#v-sheet-bg') || document.querySelector('.cv-ov, #cv-world, .cp-ov, .ari-ov'); if (!sh) return '';
        const bs = [...sh.querySelectorAll('button')].filter(b => b.getClientRects().length && !b.disabled), t = b => b.innerText.trim();
        const pref = bs.find(b => /Continuer|Suivant|Étape suivante|C’est fait|Valider|Enregistrer|Ajouter/i.test(t(b)) && !/Plus tard/i.test(t(b)));
        if (!pref) return ''; pref.click(); return t(pref).slice(0, 40); });
      log('   ' + ent + ' · page ' + k + ' « ' + (e.h || '(écran plein)') + ' » [' + (e.labels || []).slice(0, 6).join(' | ') + '] → ' + (clic || '(aucun bouton pour avancer)'));
      if (!clic) break; await A.wait(1500); await shot(nom + '-' + k);
    }
  }
} catch (x) { ok('le parcours va jusqu’au bout', false, String(x && x.stack || x).split('\n').slice(0, 3).join(' ')); }
const errs = [...new Set(A.errs || [])]; ok('aucune erreur JavaScript', !errs.length, errs.join(' | '));
const bad = RES.filter(r => !r[0]); console.log(`\n═══ ${RES.length - bad.length} vérifications réussies, ${bad.length} en échec ═══`); bad.forEach(r => console.log('  ✗ ' + r[1]));
console.log(bad.length ? '✗ ÉCHEC : ' + bad.length : '✓ OK');
await br.close(); process.exit(bad.length ? 1 : 0);
