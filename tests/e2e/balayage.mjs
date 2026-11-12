// usage : node balayage.mjs <état>   → résultat dans $OUTDIR/<état>.json
import fs from 'node:fs'; import { user, carnet, say, done, sync, souvenir } from './lib.mjs'; import { sweep, arm, KEYS, sheetPlaces } from './boutons.mjs';
import { voyageVierge, remplir, depense, partage, publier, suivreAppli, okDlg, PHOTO, go } from './etats.mjs';
const st = process.argv[2], OUT = process.env.OUTDIR || '.'; const users = []; let res = { clicks: 0, dead: [], errs: [], places: [] };
const add = r => { res.clicks += r.clicks; res.dead.push(...r.dead); res.errs.push(...r.errs); res.places.push(...(r.places || [])); };
const K = { prep: KEYS.prep, live: [...KEYS.live, ...KEYS.prep], past: [...KEYS.past, ...KEYS.prep] };
const SKIP = /Effacer ce téléphone|CV\.wipe|CV\.lang|CV\.setLang|su-l/;
try {
  if (/^demo/.test(st)) { const U = await user('Robot'); users.push(U); await U.tap(/Je crée mon carnet/, null, 300); await U.fill('#cv-pnom', 'Robot'); await U.ev(() => { void CV.obCreate('demo'); });
    for (let i = 0; i < 40 && !(await U.ev(() => { try { return !!CV._M().trip; } catch (e) { return false; } })); i++) await U.wait(500); await U.wait(1500); await U.closeAll();
    const ids = await U.ev(() => Object.values(CV._R()).filter(r => r.type === 'trip' && !r.deleted).sort((a, b) => (a.debut || '').localeCompare(b.debut || '')).map(t => t.id)); await U.ev(i => CV.go(i), ids[+st.slice(4)]); await U.wait(800);
    add(await sweep(U, st, { skip: SKIP, keys: [K.prep, K.live, K.past][+st.slice(4)] })); }
  else if (st === 'prep') { const U = await carnet('Anthony'); users.push(U); await voyageVierge(U, 'Bretagne à la main', 20, 23); await remplir(U, 20); add(await sweep(U, st, { skip: SKIP, keys: K.prep })); }
  else if (st === 'live') { const U = await carnet('Anthony'); users.push(U); await voyageVierge(U, 'En cours', -1, 3); await souvenir(U, 'Colisée', 'Rome', 'Tôt le matin.', [PHOTO[0]]); await souvenir(U, 'Trevi', 'Rome', 'Une pièce.', [PHOTO[1]]); await depense(U, 'Dîner', '42,50'); add(await sweep(U, st, { skip: SKIP, keys: K.live })); }
  else if (st === 'past') { const U = await carnet('Anthony'); users.push(U); await voyageVierge(U, 'Passé', -12, -8); await souvenir(U, 'Colisée', 'Rome', 'Tôt le matin.', [PHOTO[0]]); await souvenir(U, 'Trevi', 'Rome', 'Une pièce.', [PHOTO[1]]); add(await sweep(U, st, { skip: SKIP, keys: K.past })); }
  else if (st === 'fenSolo') { const U = await carnet('Anthony'); users.push(U); await voyageVierge(U, 'En cours', -1, 3); await souvenir(U, 'Colisée', 'Rome', 'Tôt le matin.', [PHOTO[0]]); await depense(U, 'Dîner', '42,50'); add(await sweep(U, st, { skip: SKIP, keys: [], extra: sheetPlaces(U) })); }
  else { const { A, C, V } = await partage(); users.push(A, C, V);
    if (st === 'fenOwner') add(await sweep(A, st, { skip: SKIP, keys: [], extra: sheetPlaces(A) }));
    if (st === 'fenComp') add(await sweep(C, st, { skip: SKIP, keys: [], extra: sheetPlaces(C) }));
    if (st === 'ownerA') add(await sweep(A, st, { skip: SKIP, keys: K.live }));
    if (st === 'compC') add(await sweep(C, st, { skip: SKIP, keys: K.live }));
    if (st === 'webV') add(await sweep(V, st, { skip: SKIP, keys: [], extra: [{ name: 'fil abonné (navigateur)', scope: 'top', open: async () => { if (!(await V.ev(() => !!document.getElementById('cv-feed')))) { await V.pg.reload(); await V.wait(3500); await arm(V); await V.tap(/Voir le voyage maintenant/, null, 4000); } } }] }));
    if (st === 'appP') { const m = await publier(A, 'Paul'); const P = await suivreAppli(m, 'Paul'); users.push(P); await P.closeAll(); await P.ev(() => { try { CV.feedClose(); } catch (e) {} }); await P.wait(800); add(await sweep(P, st, { skip: SKIP, keys: ['prog', 'reglages', 'prefs', 'past', 'plus'] })); }
    if (st === 'ro') { await A.closeAll(); await A.ev(() => CV.spCompSheet()); await A.wait(1000); await A.pg.locator('#v-sheet-bg .sp2-tx').first().click(); await A.wait(800); await okDlg(A); await A.wait(6000); for (let i = 0; i < 4; i++) { await sync(A, C); await C.wait(1200); } await C.closeAll(); add(await sweep(C, st, { skip: SKIP, keys: K.live })); } }
} catch (e) { res.crash = String(e && e.stack || e).slice(0, 600); say('PLANTAGE du banc', res.crash); }
res.js = [...new Set(users.flatMap(u => u.errs))]; fs.writeFileSync(`${OUT}/${st}.json`, JSON.stringify(res, null, 1)); await done(users);
