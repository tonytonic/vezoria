// Vezoria — fabrique public/assets/dark.css (le thème sombre) à partir de public/assets/app.css.
// À relancer après chaque modification de app.css :   node tools/sombre.mjs
// Le navigateur (Playwright) lit toutes les règles de app.css ; pour chaque couleur claire de fond, sombre de texte…
// on écrit la règle inverse sous « html.vz-dark ». Les couleurs déjà sombres (bandeaux, boutons, photos) ne bougent pas.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'assets');
const css = fs.readFileSync(path.join(ROOT, 'app.css'), 'utf8');
const browser = await chromium.launch(process.env.PW_EXE ? { executablePath: process.env.PW_EXE } : {});
const page = await browser.newPage();
await page.setContent('<!doctype html><html><head></head><body></body></html>');
const out = await page.evaluate((css) => {
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const P = 'html.vz-dark';
  // ── couleurs ──
  const hsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
    if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return [h, s, l]; };
  const rgb = (h, s, l) => { const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [f(0), f(8), f(4)].map(x => Math.round(x * 255)); };
  const fmt = (c, a) => a >= 1 ? `rgb(${c.join(', ')})` : `rgba(${c.join(', ')}, ${+a.toFixed(3)})`;
  // Sombre NEUTRE (noir et gris, comme iOS/Android) : aucune teinte sur les fonds, le texte en blanc.
  // Seules les couleurs d'action et de statut (boutons, « payé », « à réserver »…) gardent leur couleur.
  const grey = L => { const v = Math.round(L * 255); return [v, v, v]; };
  function map(kind, r, g, b, a) {
    const [h, s, l] = hsl(r, g, b);
    if (a === 0) return null;
    if (kind === 'bgN') {                               // dégradé d'un bandeau coloré : tout en gris de même clarté
      if (l >= .7) return map('bg', r, g, b, a);
      return fmt(grey(Math.max(.03, l * .55)), a);
    }
    if (kind === 'bg') {
      if (l < .4 && s > .18) return fmt(grey(Math.max(.04, l * .55)), a);   // fond sombre teinté (prune, vert…) → gris très sombre
      if (l < .55) return null;                         // boutons et couleurs vives moyennes : on garde
      if (s > .55 && l < .82) return null;              // or, corail… : accent, on garde
      if (a < .35 && l > .9) return null;               // voile blanc léger posé sur une photo
      return fmt(grey(Math.min(.22, l >= .985 ? .08 : .08 + (.985 - l) * .45)), a);
    }
    if (kind === 'text') {
      if (a < .3) return null;
      if (l <= .45) {
        if (s < .25) return fmt(grey(.96 - l * .2), a);
        return fmt(rgb(h, Math.min(s, .85), Math.min(.85, .74 + (.45 - l) * .3)), a);
      }
      if (l < .65 && s < .25) return fmt(grey(.66), a);       // gris
      if (l < .66 && s >= .25) return fmt(rgb(h, Math.min(s, .85), Math.max(l, .72)), a);   // couleur vive foncée
      return null;
    }
    if (kind === 'border') {
      if (a < .3) return null;
      if (l >= .7) return fmt(grey(.17 + (1 - l) * .15), a);
      if (l < .32 && s > .18) return fmt(grey(.2), a);
      return null;
    }
    if (kind === 'shadow') {
      if (l > .8) return fmt([255, 255, 255], a * .05);
      return fmt([0, 0, 0], Math.min(1, a * 1.3));
    }
    return null;
  }
  const RX = /rgba?\(\s*(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/g;
  const NAMED = {white:[255,255,255],black:[0,0,0],whitesmoke:[245,245,245],gainsboro:[220,220,220],lightgray:[211,211,211],lightgrey:[211,211,211],silver:[192,192,192],gray:[128,128,128],grey:[128,128,128],darkgray:[169,169,169],dimgray:[105,105,105],snow:[255,250,250],ivory:[255,255,240],linen:[250,240,230],beige:[245,245,220],aliceblue:[240,248,255],ghostwhite:[248,248,255],lavender:[230,230,250],navy:[0,0,128],red:[255,0,0],crimson:[220,20,60],orange:[255,165,0],gold:[255,215,0],green:[0,128,0],purple:[128,0,128],teal:[0,128,128]};
  const NRX = new RegExp('(^|[\\s,(])(' + Object.keys(NAMED).join('|') + ')(?=$|[\\s,)])', 'gi');
  const swap = (kind, v0) => { let v = v0; let ch = false;
    v = v.replace(NRX, (m, p1, n) => p1 + 'rgb(' + NAMED[n.toLowerCase()].join(', ') + ')');
    v = v.replace(/#([0-9a-f]{3,8})\b/gi, (m, h) => { if (![3, 4, 6, 8].includes(h.length)) return m; if (h.length < 5) h = h.split('').map(c => c + c).join('');
      const n = h.match(/../g).map(x => parseInt(x, 16)); return n.length === 4 ? `rgba(${n[0]}, ${n[1]}, ${n[2]}, ${(n[3] / 255).toFixed(3)})` : `rgb(${n.join(', ')})`; });
    if (kind === 'bg' && /gradient/.test(v)) { let dark = false; v.replace(RX, (m, r, g, b) => { const [, S, L] = hsl(+r, +g, +b); if (L < .35 && S > .18) dark = true; return m; }); if (dark) kind = 'bgN'; }
    const nv = v.replace(RX, (m, r, g, b, a) => { let al = a == null ? 1 : a.endsWith('%') ? parseFloat(a) / 100 : +a; const x = map(kind, +r, +g, +b, al); if (x) { ch = true; return x; } return m; });
    return ch ? nv : null; };
  const KIND = p => /^(color|fill|stroke|caret-color|-webkit-text-fill-color|text-decoration-color|text-emphasis-color)$/.test(p) ? 'text'
    : /^background(-color|-image)?$/.test(p) ? 'bg' : /^(border-.*-color|outline-color|column-rule-color)$/.test(p) ? 'border'
    : /^(box-shadow|text-shadow)$/.test(p) ? 'shadow' : null;
  const pre = sel => sel.split(',').map(s => { s = s.trim();
    if (/^:root\b/.test(s)) return P + s.slice(5);
    if (/^html\b/.test(s)) return P + s.slice(4);
    return P + ' ' + s; }).join(',');
  const USE = {}, KEEP = new Set(['--cream', '--light', '--gray', '--card', '--navy', '--navy2', '--ink', '--sun1', '--sun2', '--sun3', '--sunset', '--gold', '--gold2', '--red', '--green', '--amber', '--blue']);
  function rule(r) {
    if (/#vz-splash|\.vz-dark/.test(r.selectorText)) return '';   // écran de démarrage déjà sombre
    const st = r.style, decl = [];
    // fond clair qui RESTE clair (bouton jaune, or…) : on ne touche pas au texte foncé posé dessus
    let brightBg = false;
    for (const bp of ['background-color', 'background-image', 'background']) { const bv = st.getPropertyValue(bp); if (!bv) continue;
      bv.replace(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi, m => { const h = m.length === 4 ? m.slice(1).split('').map(c => c + c).join('') : m.slice(1); const n = h.match(/../g).map(x => parseInt(x, 16)); const [, , L] = hsl(...n); if (L > .55 && !map('bg', ...n, 1)) brightBg = true; return m; });
      bv.replace(RX, (m, r1, g1, b1) => { const [, , L] = hsl(+r1, +g1, +b1); if (L > .55 && !map('bg', +r1, +g1, +b1, 1)) brightBg = true; return m; }); }
    // raccourcis écrits avec var() (« background: linear-gradient(#fff, var(--cream)) ») : le navigateur ne les découpe pas
    for (const [sh, k] of [['background', 'bg'], ['border', 'border'], ['border-top', 'border'], ['border-bottom', 'border'], ['border-left', 'border'], ['border-right', 'border'], ['border-color', 'border'], ['outline', 'border']]) {
      const v = st.getPropertyValue(sh); if (!v || !v.includes('var(')) continue;
      const nv = swap(k, v); if (nv) decl.push(`${sh}:${nv}${st.getPropertyPriority(sh) ? ' !important' : ''}`);
    }
    for (let i = 0; i < st.length; i++) {
      const p = st[i];
      if (p.startsWith('--')) {   // variable locale de couleur, servant à une seule sorte de chose
        if (KEEP.has(p) || !USE[p]) continue; const v = st.getPropertyValue(p).trim();
        if (USE[p].size > 1) {   // sert au texte ET aux fonds : deux versions (le fond devient gris, le texte devient clair)
          if (!USE[p].has('text')) { const b = swap('bg', v); if (b) decl.push(`${p}:${b}`); continue; }
          const b = swap('bg', v), t = 'var(--dk-t1)';
          if (b) decl.push(`${p}:${b}`); decl.push(`${p}-dkt:${t || v}`); continue; }
        const k1 = [...USE[p]][0];
        let nv = /var\(--(navy2?|ink)\b/.test(v) && k1 === 'text' ? 'var(--dk-t1)' : swap(k1, v); if (nv) decl.push(`${p}:${nv}`); continue; }
      const k = KIND(p); if (!k) continue;
      if (k === 'text' && brightBg) continue;
      const v = st.getPropertyValue(p), pr = st.getPropertyPriority(p) ? ' !important' : '';
      let nv = null;
      const mx = k === 'text' ? (v.match(/var\(--[\w-]+/g) || []).map(m => m.slice(4)).filter(n => !KEEP.has(n) && USE[n] && USE[n].size > 1 && USE[n].has('text')) : [];
      if (mx.length) { nv = v; mx.forEach(n => { nv = nv.split('var(' + n + ')').join('var(' + n + '-dkt)').split('var(' + n + ',').join('var(' + n + '-dkt,'); }); nv = swap(k, nv) || nv; }
      else if (k === 'text' && /var\(--(navy2?|ink)\b/.test(v)) nv = 'var(--dk-t1)';
      else if (k === 'text' && /var\(--gray\b/.test(v)) nv = null;   // la variable elle-même est changée
      else nv = swap(k, v);
      if (nv) decl.push(`${p}:${nv}${pr}`);
    }
    return decl.length ? `${pre(r.selectorText)}{${decl.join(';')}}` : '';
  }
  function walk(list) { let s = '';
    for (const r of list) {
      if (r instanceof CSSStyleRule) s += rule(r);
      else if (r instanceof CSSMediaRule) { const x = walk(r.cssRules); if (x) s += `@media ${r.conditionText}{${x}}`; }
      else if (r instanceof CSSSupportsRule) { const x = walk(r.cssRules); if (x) s += `@supports ${r.conditionText}{${x}}`; }
    }
    return s; }
  // variables locales (« --n », « --pc »…) : on regarde à quoi elles servent (texte, fond, bord) pour les assombrir comme il faut
  const flat = l => { const o = []; for (const r of l) { if (r instanceof CSSStyleRule) o.push(r); else if (r.cssRules) o.push(...flat(r.cssRules)); } return o; };
  const ALL = flat(st.sheet.cssRules);
  for (const r of ALL) { const s2 = r.style; for (let i = 0; i < s2.length; i++) { const p = s2[i], k = p.startsWith('--') ? 'var' : KIND(p) || (/^(background|border|outline)/.test(p) ? (p.startsWith('background') ? 'bg' : 'border') : null); if (!k || k === 'var') continue;
    const v = s2.getPropertyValue(p); (v.match(/var\(--[\w-]+/g) || []).forEach(m => { const n = m.slice(4); (USE[n] = USE[n] || new Set()).add(k); }); }
    for (const sh of ['background', 'border', 'border-color', 'border-top', 'border-bottom', 'outline']) { const v = s2.getPropertyValue(sh); (v.match(/var\(--[\w-]+/g) || []).forEach(m => { const n = m.slice(4); (USE[n] = USE[n] || new Set()).add(sh.startsWith('background') ? 'bg' : 'border'); }); } }
  return walk(st.sheet.cssRules);
}, css);
await browser.close();
const head = `/* Vezoria — THÈME SOMBRE. Fichier fabriqué par tools/sombre.mjs à partir de app.css : ne pas modifier à la main.
   Retouches manuelles : dans app.css, section « 🌙 thème sombre : retouches ». */
html.vz-dark{color-scheme:dark}
html.vz-dark body,html.vz-dark body[class]{--cream:#000000;--light:#2C2C30;--gray:#A1A1A6;--card:#141416;--dk-t1:#F5F5F7;--navy:#1C1C1E;--navy2:#2C2C30;--sun1:#FFA06B;--sun2:#F2557F;--sun3:#E0457A;--sunset:linear-gradient(120deg,#FFA06B,#F2557F)}
html.vz-dark body.cv-ph-live,html.vz-dark body.cv-ph-past{--cream:#000000;--light:#2C2C30;--navy:#1C1C1E;--navy2:#2C2C30;--sun1:#FFA06B;--sun2:#F2557F;--sun3:#E0457A;--sunset:linear-gradient(120deg,#FFA06B,#F2557F)}
html.vz-dark body.vz-glass::after{display:none}
`;
fs.writeFileSync(path.join(ROOT, 'dark.css'), head + out.replace(/\}/g, '}\n'));
console.log('dark.css :', Math.round(fs.statSync(path.join(ROOT, 'dark.css')).size / 1024), 'Ko,', out.split('}').length, 'règles');
