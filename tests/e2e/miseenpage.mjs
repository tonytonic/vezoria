// 📐 Contrôle de la mise en page et des textes restés en français, écran par écran, en plusieurs langues et largeurs.
// usage : node tests/e2e/miseenpage.mjs [langues, ex. fr,de,ar,en]
import { carnet, say, log, done, souvenir, sync } from './lib.mjs'; import { KEYS, SHEETS } from './boutons.mjs';
import { voyageVierge, remplir, depense, PHOTO, go } from './etats.mjs';
const LANGS = (process.argv[2] || 'fr,en,de,ar').split(',');
const CHECK = (mode) => {
  const vw = innerWidth, vis = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  const BASE = e => /^(appC|cv-fab|cv-nav|cv-toast|cv-crypt)$/.test(e.id || '') || (e.classList && (e.classList.contains('cv-nav') || e.classList.contains('header') || e.classList.contains('cv-statusbar')));
  let top = null; for (const y of [420, 700, 200, 90]) { let e = document.elementFromPoint(vw / 2, y); while (e && e.parentElement && e.parentElement !== document.body) e = e.parentElement; if (e && e !== document.body && !BASE(e) && e.offsetHeight > 120 && !/toast/i.test(e.className + e.id)) { top = e; break; } }
  const roots = top ? [top] : [document.querySelector('body > .header'), document.getElementById('appC'), document.getElementById('cv-nav')].filter(Boolean);
  const lab = e => (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40) || e.tagName.toLowerCase() + '.' + String(e.className).slice(0, 20);
  const out = { hscroll: 0, off: [], cut: [], wrap: [], tiny: [], leak: [], win: top ? (top.id || top.className) : '' };
  const sw = document.documentElement.scrollWidth - vw; if (sw > 2 && !top) out.hscroll = sw;
  const scrollsX = e => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true; } return false; };
  const all = roots.flatMap(r => [...r.querySelectorAll('*')]).filter(vis);
  for (const e of all) { const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
    if ((r.right > vw + 4 || r.left < -4) && !scrollsX(e) && getComputedStyle(e).position !== 'fixed' && (e.matches('button, a, img, input, select, h1, h2, h3, label, b, small') || (e.children.length === 0 && e.textContent.trim()))) { if (out.off.length < 6) out.off.push(lab(e) + ` [${Math.round(r.left)}→${Math.round(r.right)}]`); }
    if (e.matches('button, .v-btn, h2, h3, label, .cv-choice b, [role=button]') && e.scrollWidth > e.clientWidth + 3 && /hidden|clip/.test(getComputedStyle(e).overflowX) && e.clientWidth > 20) { if (out.cut.length < 8) out.cut.push(lab(e)); }
    if (e.matches('button, a.v-btn, [role=button]') && e.children.length <= 3) { const t = (e.innerText || '').trim(); if (t && t.length <= 14 && !/\n/.test(t)) { const rg = document.createRange(); rg.selectNodeContents(e); const tops = new Set([...rg.getClientRects()].filter(x => x.width > 2).map(x => Math.round(x.top / 6))); if (tops.size >= 2 && e.querySelectorAll('i, svg, img, small, b, span').length <= 1) { if (out.wrap.length < 6) out.wrap.push(t.replace(/\s+/g, ' ')); } } }
    if (e.matches('button, a[href], [role=button], [onclick]') && (r.width < 26 || r.height < 26) && r.width > 0 && !e.closest('.leaflet-container') && (e.innerText || '').trim().length <= 3) { if (out.tiny.length < 6) out.tiny.push(lab(e) + ` ${Math.round(r.width)}×${Math.round(r.height)}`); } }
  if (mode === 'leak') { const user = window.__userTxt || [], FR = /[àâçéèêëîïôùûœ]|\b(les|des|une|pour|avec|sans|dans|sur|tes|mes|qui|que|est|pas|très|voyages?|jours?|ajouter|supprimer|modifier|enregistrer|annuler|fermer|carnet|souvenirs?|dépenses?|compagnons?|abonnés?|aujourd’hui|ton|ta)\b/i;
    const seen = new Set(); for (const r of roots) { const w = document.createTreeWalker(r, 4); let n; while ((n = w.nextNode())) { const p = n.parentElement; if (!p || !vis(p) || p.closest('[data-notr], script, style, select#su-l, #su-c, .leaflet-container, textarea, option')) continue; const t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (t.length < 3 || !FR.test(t) || seen.has(t)) continue; if (user.some(u => t.includes(u) || u.includes(t))) continue; seen.add(t); if (out.leak.length < 25) out.leak.push(t.slice(0, 90)); } }
    for (const r of roots) for (const e of r.querySelectorAll('[placeholder], [title], [aria-label]')) { if (!vis(e) || e.closest('[data-notr]')) continue; for (const a of ['placeholder', 'aria-label']) { const t = (e.getAttribute(a) || '').trim(); if (t.length > 3 && FR.test(t) && !seen.has(t) && !user.some(u => t.includes(u))) { seen.add(t); if (out.leak.length < 25) out.leak.push(a + '=' + t.slice(0, 70)); } } } }
  return out; };
const U = await carnet('Anthony');
await voyageVierge(U, 'Bretagne', 20, 23); await remplir(U, 20);
await voyageVierge(U, 'Italie', -1, 3); await souvenir(U, 'Colisée', 'Rome', 'Tôt le matin, personne.', [PHOTO[0]]); await souvenir(U, 'Trevi', 'Rome', 'Une pièce.', [PHOTO[1]]); await depense(U, 'Dîner', '42,50');
await voyageVierge(U, 'Lisbonne', -12, -8); await souvenir(U, 'Belém', 'Lisbonne', 'Pastéis.', [PHOTO[0]]);
const TRIPS = [['Bretagne', KEYS.prep], ['Italie', [...KEYS.live, ...KEYS.prep]], ['Lisbonne', [...KEYS.past, 'prog', 'budget', 'souv']]];
const ISS = {}; const note = (kind, what, where) => { const k = kind + ' · ' + what; (ISS[k] = ISS[k] || new Set()).add(where); };
const userTxt = () => U.ev(() => { const S = new Set(); Object.values(CV._R()).forEach(r => { if (!r || r.deleted) return; for (const k of ['titre', 'nom', 'texte', 'lieu', 'ville', 'dep', 'arr', 'adresse', 'note', 'compagnie', 'who', 'sous', 'plan']) { const v = r[k]; if (typeof v === 'string' && v.trim().length >= 3) { S.add(v.trim()); v.split(/\n|→| - |, /).forEach(x => { if (x.trim().length >= 4) S.add(x.trim()); }); } } }); ['Rome', 'Brest', 'Quimper', 'Lisbonne', 'Italie', 'Portugal', 'France'].forEach(x => S.add(x)); window.__userTxt = [...S]; return S.size; });
const run = async (lang, width) => { await U.closeAll(); await U.pg.setViewportSize({ width, height: 844 }); await U.ev(l => localStorage.setItem('cv-lang', l), lang); await U.pg.reload(); await U.wait(3500); await U.closeAll(); await userTxt(); const tag = lang + (width !== 390 ? '/' + width : '');
  const one = async (where, open) => { await U.closeAll(); await open(); await U.wait(900); const r = await U.ev(CHECK, lang === 'en' ? 'leak' : '').catch(e => null); if (!r) return; const w = tag + ' ' + where + (r.win ? ' [fenêtre]' : '');
    if (r.hscroll) note('défilement horizontal', r.hscroll + ' px', w); r.off.forEach(x => note('dépasse de l’écran', x, w)); r.cut.forEach(x => note('texte coupé', x, w)); r.wrap.forEach(x => note('petit bouton sur 2 lignes', x, w)); r.tiny.forEach(x => note('bouton trop petit', x, w)); r.leak.forEach(x => note('resté en français', x, w)); };
  for (const [titre, keys] of TRIPS) { await go(U, titre); for (const k of keys) await one(titre + '/' + k, () => U.ev(k => { try { CV.navTo(k); } catch (e) {} }, k)); }
  if (width === 390) { await go(U, 'Italie'); for (const f of SHEETS) await one('fenêtre ' + f, () => U.ev(f => { const [fn, a] = f.split(':'); try { a ? CV[fn](a) : CV[fn](); } catch (e) {} }, f)); } };
for (const l of LANGS) { await run(l, 390); say(`[${l}] fait`); } if (LANGS.includes('fr')) { await run('fr', 360); await run('de', 360); }
const kinds = {}; for (const [k, w] of Object.entries(ISS)) { const [kind, what] = k.split(' · '); (kinds[kind] = kinds[kind] || []).push([what, [...w]]); }
for (const [kind, L] of Object.entries(kinds)) { say(`\n■ ${kind} (${L.length})`); L.sort((a, b) => b[1].length - a[1].length).slice(0, +process.env.MAX || 60).forEach(([what, w]) => say('  · ' + what + '   ← ' + w.slice(0, 3).join(' ; ') + (w.length > 3 ? ` (+${w.length - 3})` : ''))); }
await done([U]);
