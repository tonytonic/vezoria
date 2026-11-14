// 🔎 Détecteur de boutons sans effet : touche chaque bouton de chaque écran (et de chaque fenêtre qu’il ouvre)
// et vérifie que QUELQUE CHOSE change : écran, fenêtre, message, envoi réseau, partage, fichier, défilement…
// Un bouton qui ne change rien du tout est listé (c’est ce qui avait laissé passer « ＋ Ajouter » sans compte).
import fs from 'node:fs';
import { log, say, BASE } from './lib.mjs';
export const FX_INIT = () => {
  if (window.__fx) return;
  window.__fx = { opened: 0, files: 0, dl: 0, fetches: 0 }; window.__vol = [];
  const of = window.fetch; window.fetch = function () { __fx.fetches++; return of.apply(this, arguments); };
  window.open = () => { __fx.opened++; return null; };
  const ic = HTMLInputElement.prototype.click; HTMLInputElement.prototype.click = function () { if (this.type === 'file') { __fx.files++; return; } return ic.call(this); };
  const ac = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download || /^(blob|data|mailto|tel|sms|https?):/.test(this.getAttribute('href') || '')) { __fx.dl++; return; } return ac.call(this); };
  const vis = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.disabled;
  const BASE = e => /^(appC|cv-fab|cv-nav|cv-toast|cv-crypt)$/.test(e.id || '') || (e.classList && (e.classList.contains('cv-nav') || e.classList.contains('header') || e.classList.contains('cv-statusbar')));
  // la fenêtre du dessus (feuille, dialogue, plein écran) ou null
  window.__fxTop = () => { for (const y of [420, 700, 200, 90]) { let e = document.elementFromPoint(195, y); while (e && e.parentElement && e.parentElement !== document.body) e = e.parentElement; if (e && e !== document.body && e.parentElement === document.body && !BASE(e) && e.offsetHeight > 120 && !/toast/i.test(e.className + e.id)) return e; } return null; };
  const selOf = n => { let e = n && n.nodeType === 1 ? n : n && n.parentElement; for (let k = 0; k < 4 && e && e !== document.body; k++, e = e.parentElement) { if (e.id) return '#' + CSS.escape(e.id); const c = [...e.classList].find(x => !/^(on|sel|open|up|me)$/.test(x)); if (c) return '.' + CSS.escape(c); } return ''; };
  // ce qui bouge tout seul (compte à rebours, horloge…) : repéré une fois, puis ignoré
  window.__fxIdle = ms => new Promise(done => { const S = new Set(); const mo = new MutationObserver(L => L.forEach(m => { const s = selOf(m.target); if (s) S.add(s); }));
    mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true }); setTimeout(() => { mo.disconnect(); window.__vol = [...new Set([...window.__vol, ...S])].filter(s => !/^#(appC|cv-body|v-sheet-bg|v-sheet)$/.test(s)); done(window.__vol); }, ms); });
  const isVol = n => { let e = n.nodeType === 1 ? n : n.parentElement; for (let k = 0; k < 5 && e && e !== document.body; k++, e = e.parentElement) { for (const s of window.__vol) { try { if (e.matches(s)) return true; } catch (x) {} } } return false; };
  const scopeEl = sc => sc === 'top' ? [window.__fxTop()].filter(Boolean) : [document.querySelector('body > .header'), document.getElementById('appC'), document.getElementById('cv-fab')].filter(Boolean);
  const desc = e => { const oc = e.getAttribute('onclick') || (e.tagName === 'A' ? 'href:' + (e.getAttribute('href') || '') : '') || (e.tagName === 'LABEL' ? 'label' : e.tagName.toLowerCase() + (e.id ? '#' + e.id : '')), m = oc.match(/CV\.([A-Za-z0-9_]+)/);
    return { label: (e.innerText || e.getAttribute('aria-label') || e.title || '').trim().replace(/\s+/g, ' ').slice(0, 46), oc: oc.slice(0, 160), fn: m ? m[1] : oc.slice(0, 40), tag: e.tagName, inBody: !!e.closest('#cv-body') }; };
  window.__fxAll = sc => { const out = []; scopeEl(sc).forEach(r => { [...(r.matches('button,[onclick]') ? [r] : []), ...r.querySelectorAll('button, [onclick], a[href], label.cv-choice, [role=button]')].forEach(e => { if (vis(e) && !e.closest('.cv-nav')) out.push(e); }); }); return out; };
  window.__fxList = sc => { const seen = {}; return window.__fxAll(sc).map(e => { const d = desc(e), k = d.oc + '|' + d.label; d.ord = seen[k] = (seen[k] || 0) + 1; d.auto = (e.tagName === 'A' && /^(https?:|mailto:|tel:|sms:)/.test(e.getAttribute('href') || '')) || (e.tagName === 'LABEL' && !!e.querySelector('input')) || !!e.querySelector('input[type=file]'); return d; }); };
  window.__fxSig = () => { const t = window.__fxTop(); let M = {}; try { M = CV._M(); } catch (e) {}
    return { ov: [...document.body.children].filter(e => !BASE(e) && e.getClientRects().length && e.offsetHeight > 60).map(e => e.id || e.className).join(','), top: t ? (t.id || t.className) + ':' + t.innerHTML.length + ':' + (t.querySelector('h2') || {}).textContent : '', tab: M.tab, trip: M.trip, hash: location.hash, sy: Math.round(scrollY) + ':' + (t ? [...t.querySelectorAll('*')].reduce((a, e) => a + e.scrollTop, 0) : 0), ae: (document.activeElement || {}).tagName + ':' + ((document.activeElement || {}).id || ''),
      fx: JSON.stringify(window.__fx), sh: (window.__sh || []).length + ':' + String(window.__clip || '').length, lock: String(M.lock) + document.body.className + document.documentElement.className }; };
  window.__fxHit = async (sc, d) => { const el = window.__fxAll(sc).filter(e => { const x = desc(e); return x.oc === d.oc && x.label === d.label; })[d.ord - 1]; if (!el) return { gone: 1 };
    const b = window.__fxSig(); let mut = 0; const mo = new MutationObserver(L => L.forEach(m => { if (!isVol(m.target)) mut++; }));
    mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    try { el.scrollIntoView({ block: 'center' }); } catch (e) {} const f0 = __fx.fetches; el.click();
    await new Promise(r => setTimeout(r, 420)); if (!mut && __fx.fetches !== f0) await new Promise(r => setTimeout(r, 900));
    let a = window.__fxSig(); if (!mut && JSON.stringify(a) === JSON.stringify(b)) { await new Promise(r => setTimeout(r, 1800)); a = window.__fxSig(); }   // rien vu : on laisse 2 s de plus (action lente) avant de conclure
    mo.disconnect(); return { mut, b, a, same: JSON.stringify(a) === JSON.stringify(b) }; };
  window.__fxTidy = () => { for (let k = 0; k < 3; k++) document.querySelectorAll('.ui-dlg .ui-act button:first-child, .ui-dlg button:first-of-type').forEach(b => { try { b.click(); } catch (e) {} });
    try { CV.close(); } catch (e) {} ['worldClose', 'liveClose', 'filmClose', 'wallClose', 'scrClose', 'pcClose', 'stEdClose', 'vjStop', 'psClose', 'rgClose', 'swClose', 'pgClose', 'momentClose', 'expClose', 'feedClose', 'stClose', 'planClose', 'pdClose', 'tlClose', 'wzClose'].forEach(f => { try { if (CV[f]) CV[f](); } catch (e) {} });
    [...document.body.children].forEach(e => { if (!BASE(e) && !/^(SCRIPT|STYLE|LINK)$/.test(e.tagName) && e.getClientRects().length && e.offsetHeight > 120 && !/toast|crypt/i.test(e.className + e.id)) e.remove(); }); document.body.style.overflow = ''; };
};
export async function arm(U) { await U.ctx.addInitScript(FX_INIT); await U.pg.evaluate(FX_INIT); }
// balaie chaque écran du voyage ouvert (keys = destinations de l’appli) ; renvoie { clicks, dead:[…], errs:[…], places:[…] }
export const KEYS = { prep: ['prog', 'transport', 'hotel', 'activite', 'divers', 'budget', 'ech', 'souv', 'notes', 'outils', 'envies', 'check', 'reglages', 'prefs', 'livret', 'badges', 'past', 'omap', 'plus'],
  live: ['i:live:live', 'i:live:souv', 'i:live:budget', 'a:plan', 'a:map', 'i:bilan:bilan'], past: ['i:bilan:bilan', 'i:bilan:budget', 'i:bilan:ech', 'i:bilan:souv', 'a:film', 'a:globe'] };
// toutes les fenêtres de l’appli, ouvertes directement (beaucoup ne sont accessibles que depuis une autre fenêtre)
export const SHEETS = ['cloudSheet', 'shareHub', 'guideSheet', 'datesSheet', 'albumSheet', 'zipSheet', 'carnetPublishSheet', 'planSheet', 'jrSheet', 'avantSheet', 'shopSheet', 'pkgSheet', 'partsSheet', 'omapSheet', 'impSheet', 'spCompSheet', 'shareSheet', 'serverWipeSheet', 'rotSheet', 'followSheet', 'acctSheet', 'tutoSheet', 'tripSheet', 'travSheet', 'spaceSheet', 'socialHub', 'pdfSheet', 'mergeSheet', 'linkSheet', 'installSheet', 'infoSheet', 'hideSheet', 'dupSheet', 'devSheet', 'codeSheet', 'carnetShareSheet', 'ab2TripsSheet', 'newTrip', 'socialHub:fw', 'socialHub:lk', 'socialHub:fo'];
export const sheetPlaces = U => SHEETS.map(f => ({ name: 'fenêtre ' + f, scope: 'top', settle: 900, open: async () => { await U.ev(f => { const [fn, arg] = f.split(':'); try { arg ? CV[fn](arg) : CV[fn](); } catch (e) { window.__openErr = String(e); } }, f); await U.wait(450); } }));
export async function sweep(U, state, { deep = true, perFn = 2, skip = /^$/, only = null, keys = KEYS.prep, extra = [] } = {}) {
  await arm(U); const dead = [], errs = [], seenP = {}, seenO = {}, placesOut = []; let clicks = 0;
  const tripId = await U.ev(() => CV._M().trip);
  const judge = async (sc, d, where) => { const e0 = U.errs.length, n0 = U.nd || 0; let r; if (process.env.TRACE) fs.appendFileSync(process.env.TRACE, (await U.ev(() => [Math.round(performance.memory.usedJSHeapSize / 1e6) + 'Mo', document.documentElement.scrollWidth + 'px', document.querySelectorAll('*').length + 'el'].join(' ')).catch(() => '?')) + ' → ' + where + ' · ' + d.label + ' · ' + d.oc.slice(0, 90) + '\n');
    try { r = await U.ev(([sc, d]) => window.__fxHit(sc, d), [sc, d]); } catch (e) { r = { nav: 1 }; await U.wait(1200); const away = await alive(); if (away) placesOut.push(`   « ${d.label} » ${d.oc.slice(0, 50)} quitte l’appli → ${away}`); }
    clicks++; if (U.errs.length > e0) errs.push(`${state} · ${where} · « ${d.label} » ${d.oc.slice(0, 70)} → ${U.errs.slice(e0).join(' | ').slice(0, 220)}`);
    if (r.gone) return { gone: 1 }; const eff = r.nav || r.mut > 0 || !r.same || (U.nd || 0) > n0 || U.errs.length > e0;
    if (!eff) dead.push(`${state} · ${where} · « ${d.label} » · ${d.oc.slice(0, 90)}`); return { eff, top: r.a && r.a.top, opened: r.a && r.b && r.a.top && r.a.top !== r.b.top }; };
  // l’appli a quitté sa page (lien vers une autre page) : on revient et on réarme
  const alive = async () => { const ok = await U.ev(() => typeof CV === 'object' && !!window.__fx).catch(() => false); if (ok) return ''; const url = U.pg.url(); await U.pg.goto(BASE + '/?web=1').catch(() => {}); await U.wait(2500); await arm(U).catch(() => {}); return url || '?'; };
  const tidy = async () => { await alive(); await U.ev(() => window.__fxTidy()).catch(() => {}); await U.wait(120); };
  const base = async open => { await tidy(); const st = await U.ev(() => ({ trip: CV._M().trip })).catch(() => ({})); if (st.trip !== tripId && tripId) { await U.ev(t => { try { CV.go(t); } catch (e) {} }, tripId); await U.wait(500); } await open(); };
  const byKey = k => ({ name: k, open: async () => { await U.ev(k => { try { CV.navTo(k); } catch (e) { window.__openErr = String(e); } }, k); await U.wait(380); } });
  const places = [...keys.map(byKey), ...extra];
  for (const pl of places) {
    const e0 = U.errs.length; await base(pl.open); await U.wait(pl.settle || 1500); { const away = await alive(); if (away) { placesOut.push(`${pl.name}: quitte l’appli → ${away}`); continue; } } await U.ev(() => window.__fxIdle(1000));
    if (U.errs.length > e0) errs.push(`${state} · ouverture de ${pl.name} → ${U.errs.slice(e0).join(' | ').slice(0, 220)}`);
    const here = await U.ev(() => { const t = window.__fxTop(), M = CV._M(); return { top: t ? (t.id || t.className) : '', tab: M.tab, mode: M.mode || 'prep' }; });
    if (pl.scope === 'top' && !here.top) { placesOut.push(`${pl.name}: ne s’ouvre pas dans cet état`); continue; }
    const sc0 = pl.scope || (here.top ? 'top' : 'page'), name = pl.name + (here.top ? ' [fenêtre ' + String(here.top).slice(0, 20) + ']' : ' [' + here.mode + '/' + here.tab + ']');
    const L = await U.ev(sc => window.__fxList(sc), sc0); let n = 0;
    for (const d of L) {
      if (d.auto || skip.test(d.label + ' ¦ ' + d.oc) || (only && !only.test(d.label + ' ¦ ' + d.oc))) continue; const kp = (sc0 === 'page' && !d.inBody ? 'entête' : pl.name) + '|' + d.fn; if ((seenP[kp] = (seenP[kp] || 0) + 1) > perFn) continue;
      await base(pl.open); await U.wait(pl.reopen || 60); const r = await judge(sc0, d, name); n++;
      if (deep && r.opened && sc0 === 'page') {   // une fenêtre s’est ouverte : on touche aussi ses boutons
        await U.wait(350); const L2 = await U.ev(() => window.__fxList('top'));
        for (const d2 of L2) { if (d2.auto || skip.test(d2.label + ' ¦ ' + d2.oc)) continue; const ko = d.fn + '>' + d2.fn; if (seenO[ko]) continue; if ((seenO['*' + d2.fn] = (seenO['*' + d2.fn] || 0) + 1) > 2) continue; seenO[ko] = 1;
          const cur = await U.ev(() => { const t = window.__fxTop(); return t ? (t.id || t.className) + ':' + (t.querySelector('h2') || {}).textContent : ''; });
          if (!cur || (r.top && cur !== r.top.replace(/:\d+:/, ':'))) { await base(pl.open); await U.wait(60); await U.ev(([sc, d]) => window.__fxHit(sc, d), [sc0, d]).catch(() => {}); await U.wait(380); }
          await judge('top', d2, name + ' → « ' + d.label + ' »'); n++; } }
    }
    placesOut.push(`${name}: ${L.length} boutons, ${n} touchés`);
  }
  await tidy(); say(`[${state}] ${clicks} boutons touchés · ${dead.length} sans effet · ${errs.length} erreur(s)`); return { clicks, dead, errs, places: placesOut };
}
