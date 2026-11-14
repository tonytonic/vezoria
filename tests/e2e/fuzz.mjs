// 🧪 Fiches MAL FORMÉES envoyées par un compagnon ou un abonné malveillant (14/11/2026) : le serveur accepte n’importe quel JSON,
// donc un champ peut arriver sous une forme inattendue (null, nombre, liste, objet, texte de 20 000 caractères, date impossible…).
// On abîme au hasard un tiers des champs de toutes les fiches, puis on ouvre chaque écran et chaque fenêtre et on touche les boutons :
// l’appli ne doit ni planter (erreur JavaScript) ni rester bloquée.
// usage : node tests/e2e/fuzz.mjs [0|1|2] [graine]     (0 = voyage en préparation, 1 = en cours, 2 = terminé)
// aides à l’enquête (variables d’environnement) : TRACE=fichier (chaque bouton + mémoire + largeur de page), OOMTRAP=fichier (pile d’appels si la mémoire explose),
//   TYPES=souv,geo ou souv.lat (n’abîmer que ces fiches/champs, mêmes valeurs), DUMP=1 (liste des champs abîmés), NOMANGLE=1 (témoin), WIDE=souv,prog (ce qui déborde)
import fs from 'node:fs'; import { user, say, OUT } from './lib.mjs'; import { sweep, KEYS, sheetPlaces } from './boutons.mjs';
const MANGLE = ([seed, drop, types]) => { let s = seed; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const R = CV._R(), BAD = [null, 0, -1, 1e12, 'NaN', '', [], {}, ['x'], { a: 1 }, 'x'.repeat(20000), '2026-13-45', '🙂'.repeat(40), true, [null], [{}], -0.5].filter((v, i) => !(drop || []).includes(i));
  let n = 0;
  Object.values(R).forEach(r => { if (!r || r.deleted || typeof r !== 'object') return;
    for (const k of Object.keys(r)) { if (/^(id|type|deleted|createdAt|updatedAt|createdBy|updatedBy)$/.test(k)) continue; if (rnd() < 0.35) { const v = BAD[Math.floor(rnd() * BAD.length)]; if (!types || !types.length || types.includes(r.type) || types.includes(r.type + '.' + k)) { r[k] = v; n++; (window.__mk = window.__mk || {})[r.type + '.' + k] = ((window.__mk || {})[r.type + '.' + k] || 0) + 1; } } } });
  try { CV._persist(); } catch (e) {} return n; };
const which = /^[012]$/.test(process.argv[2] || '') ? [+process.argv[2]] : [0, 1, 2], seed = +(process.argv[3] || 7);
const K = [KEYS.prep, [...KEYS.live, ...KEYS.prep], [...KEYS.past, ...KEYS.prep]], SKIP = /Effacer ce téléphone|CV\.wipe|CV\.lang|CV\.setLang|su-l|CV\.demo|obCreate/;
const all = []; let fields = 0, clicks = 0, bloque = 0;
for (const st of which) {
  const U = await user('Robot');
  await U.tap(/Je crée mon carnet/, null, 300); await U.fill('#cv-pnom', 'Robot'); await U.ev(() => { void CV.obCreate('demo'); });
  for (let i = 0; i < 40 && !(await U.ev(() => { try { return !!CV._M().trip; } catch (e) { return false; } })); i++) await U.wait(500); await U.wait(1500); await U.closeAll();
  const ids = await U.ev(() => Object.values(CV._R()).filter(r => r.type === 'trip' && !r.deleted).sort((a, b) => (a.debut || '').localeCompare(b.debut || '')).map(t => t.id)); await U.ev(i => CV.go(i), ids[st]); await U.wait(800);
  const n = process.env.NOMANGLE ? 0 : await U.ev(MANGLE, [seed + st, (process.env.DROP || '').split(',').filter(Boolean).map(Number), (process.env.TYPES || '').split(',').filter(Boolean)]); fields += n; await U.wait(1500);
  if (process.env.FAR) await U.ev(() => { const S = Object.values(CV._R()).filter(r => r && !r.deleted && r.type === 'souv' && r.lat != null); const F = [[0, 12.4], [41.9, 0], [-1, 12.5], [43.3, 0]]; S.slice(0, 4).forEach((r, i) => { r.lat = F[i][0]; r.lng = F[i][1]; }); CV._persist(); });
  if (process.env.DUMP2) { await U.pg.reload(); await U.wait(6000); console.log(JSON.stringify(await U.ev(() => Object.values(CV._R()).filter(r => r && !r.deleted && (r.type === 'souv' || r.type === 'geo')).map(r => [r.type, r.lat, r.lng]).filter(x => !(x[1] > 40 && x[1] < 47 && x[2] > 8 && x[2] < 14))))); process.exit(0); }
  if (process.env.DUMP) { console.log(JSON.stringify(await U.ev(() => window.__mk))); process.exit(0); }
  // comme dans la vraie vie : les fiches abîmées sont relues au démarrage (ou arrivent du serveur) → on relance l’appli
  U.errs.length = 0; await U.pg.reload(); for (let i = 0; i < 40 && !(await U.ev(() => { try { return !!CV._M().trip; } catch (e) { return false; } }).catch(() => false)); i++) await U.wait(500); await U.wait(1500); await U.closeAll().catch(() => {});
  await U.ev(i => { try { CV.go(i); } catch (e) {} }, ids[st]).catch(() => {}); await U.wait(800);
  if (process.env.OOMTRAP) {   // piège : dès que la mémoire de la page explose, on met en pause et on note la pile d’appels
    const cdp = await U.ctx.newCDPSession(U.pg); await cdp.send('Debugger.enable'); let fired = false;
    cdp.on('Debugger.paused', ev => { fs.writeFileSync(process.env.OOMTRAP, ev.callFrames.slice(0, 25).map(f => f.functionName + ' @ ' + f.url.split('/').pop() + ':' + (f.location.lineNumber + 1) + ':' + f.location.columnNumber).join('\n')); process.exit(3); });
    setInterval(async () => { try { const h = await cdp.send('Runtime.getHeapUsage'); if (process.env.HEAPLOG) fs.appendFileSync(process.env.HEAPLOG, Date.now() + ' ' + Math.round(h.usedSize / 1e6) + '\n'); if (h.usedSize > 150e6 && !fired) { fired = true; await cdp.send('Debugger.pause'); } } catch (e) {} }, 200);
  }
  if (process.env.SYNTAX) { for (const k of process.env.SYNTAX.split(',')) { await U.ev(k => { try { CV.navTo(k); } catch (e) {} }, k); await U.wait(1500);
      console.log(k + ' ' + JSON.stringify(await U.ev(() => { const bad = []; document.querySelectorAll('*').forEach(e => { for (const a of e.getAttributeNames()) if (/^on/.test(a)) { try { new Function(e.getAttribute(a)); } catch (x) { bad.push(a + '=' + e.getAttribute(a).slice(0, 160)); } } }); return bad.slice(0, 5); }))); }
    process.exit(0); }
  if (process.env.WIDE) { const out = []; for (const k of process.env.WIDE.split(',')) { await U.ev(k => { try { CV.navTo(k); } catch (e) {} }, k); await U.wait(1500);
      out.push(k + ' ' + JSON.stringify(await U.ev(() => { const W = document.documentElement.clientWidth; return [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > W + 5 && r.width > 0 && ![...e.children].some(c => c.getBoundingClientRect().right > W + 5); }).slice(0, 6).map(e => { let p = e, ch = []; for (let i = 0; i < 4 && p; i++, p = p.parentElement) ch.push(p.tagName + '.' + String(p.className).slice(0, 30)); return ch.join(' < ') + ' w=' + Math.round(e.getBoundingClientRect().width) + ' «' + (e.textContent || '').slice(0, 20) + '»'; }); }))); }
    console.log(out.join('\n')); process.exit(0); }
  const r = await sweep(U, 'fuzz' + st, { skip: SKIP, keys: K[st], perFn: 1, extra: sheetPlaces(U) }); clicks += r.clicks;
  // aucun écran ne doit devenir plus large que le téléphone (un texte de 20 000 lettres sans espace)
  { const large = []; for (const k of ['prog', 'souv', 'budget', 'envies', 'notes', 'check', 'reglages', 'livret', 'plus']) { await U.closeAll().catch(() => {}); await U.ev(k => { try { CV.navTo(k); } catch (e) {} }, k).catch(() => {}); await U.wait(900);
      const w = await U.ev(() => document.documentElement.scrollWidth - document.documentElement.clientWidth).catch(() => 0); if (w > 4) large.push(k + ' +' + w + ' px');
      // un bouton dont l’action ne se lit plus (valeur vide glissée dans « onclick ») : il ne marcherait jamais
      const hs = await U.ev(() => { const bad = []; document.querySelectorAll('*').forEach(e => { for (const a of e.getAttributeNames()) if (/^on/.test(a)) { try { new Function(e.getAttribute(a)); } catch (x) { bad.push(a + '=' + e.getAttribute(a).slice(0, 60)); } } }); return bad; }).catch(() => []);
      if (hs.length) all.push('[' + st + '] ' + k + ' : action illisible ' + hs.slice(0, 2).join(' · ')); }
    if (large.length) { all.push('[' + st + '] écran plus large que le téléphone : ' + large.join(', ')); } }
  // l'appli répond-elle encore ?
  await U.closeAll().catch(() => {}); const vivant = await U.ev(() => { try { CV.navTo('prog'); return document.body.innerText.length > 200; } catch (e) { return false; } }).catch(() => false); if (!vivant) bloque++;
  const errs = [...new Set([...r.errs, ...U.errs])]; all.push(...errs.map(e => '[' + st + '] ' + e));
  say(`[fuzz ${st}] ${n} champs abîmés · ${r.clicks} boutons touchés · ${errs.length} erreur(s) JS · appli ${vivant ? 'toujours utilisable' : 'BLOQUÉE'}`);
  await U.ctx.close();
}
fs.writeFileSync(OUT + '/fuzz.json', JSON.stringify(all, null, 1));
const grp = {}; all.forEach(e => { const k = e.replace(/^\[\d\] /, '').replace(/\d+/g, 'N').slice(0, 140); grp[k] = (grp[k] || 0) + 1; });
say(Object.keys(grp).length ? '\n✗ ' + Object.keys(grp).length + ' sorte(s) d’erreur :\n' + Object.entries(grp).sort((a, b) => b[1] - a[1]).map(([k, v]) => '  ✗ ×' + v + ' ' + k).join('\n') : `\n✓ ${fields} champs abîmés, ${clicks} boutons touchés : aucune erreur, l’appli reste utilisable.`);
console.log(Object.keys(grp).length || bloque ? '✗ ÉCHEC : ' + (Object.keys(grp).length + bloque) : '✓ OK');
process.exit(Object.keys(grp).length || bloque ? 1 : 0);
