// 🌍 Contrôle des textes d’écran : tout ce que l’appli affiche sans passer par MSGT (alertes, bandeaux, questions, textes fixes des fenêtres,
//    champs, infobulles) doit sortir traduit dans les 13 langues. Complète tests/traductions.mjs.
// usage : node tests/textes.mjs          (code de sortie 1 s’il manque un texte)
import vm from 'node:vm'; import fs from 'node:fs'; import path from 'node:path';
const PUB = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..') + '/public';
const LANGS = (process.env.LANGS || 'en,es,de,it,pt,nl,ru,tr,ar,hi,zh,ja,ko').split(',');
const files = fs.readdirSync(PUB + '/assets').filter(f => /^app-\d\.js$/.test(f)).map(f => [f, fs.readFileSync(PUB + '/assets/' + f, 'utf8')]);
files.push(['index.html', fs.readFileSync(PUB + '/index.html', 'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ''))]);
const flat = s => String(s).replace(/\s+/g, ' ').trim(), un = t => t.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
// 1er argument d’un appel, puis ses morceaux séparés par « + »
function arg(src, i) { let d = 0, q = null, out = ''; for (; i < src.length; i++) { const c = src[i];
  if (q) { out += c; if (c === '\\') { out += src[++i]; continue; } if (c === q) q = null; continue; }
  if (c === "'" || c === '"' || c === '`') { q = c; out += c; continue; }
  if (c === '(' || c === '[' || c === '{') d++; if (c === ')' || c === ']' || c === '}') { if (!d) break; d--; }
  if (c === ',' && !d) break; out += c; } return out; }
function parts(e) { const P = []; let d = 0, q = null, cur = ''; for (let i = 0; i < e.length; i++) { const c = e[i];
  if (q) { cur += c; if (c === '\\') { cur += e[++i]; continue; } if (c === q) q = null; continue; }
  if (c === "'" || c === '"' || c === '`') { q = c; cur += c; continue; }
  if (c === '(' || c === '[' || c === '{') d++; if (c === ')' || c === ']' || c === '}') d--;
  if (c === '+' && !d) { P.push(cur.trim()); cur = ''; continue; } cur += c; } P.push(cur.trim()); return P; }
const dec = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\\n/g, ' ').replace(/\\'/g, "'");
const FR = /\b(le|la|les|un|une|des|du|de|et|ou|pour|avec|sans|ton|ta|tes|mon|ma|mes|ce|cette|qui|que|dans|sur|pas|plus|est|sont|tu|voyage|jour|photos?|ajouter|supprimer|modifier|fermer|enregistrer|annuler|partager|envoyer|choisir)\b/i;
// ── ce que l’appli affiche ──
const plain = new Set(), composed = [], fixed = new Map();
for (const [f, src] of files) { const lineOf = i => src.slice(0, i).split('\n').length;
  for (const m of src.matchAll(/\b(alert|toast|uiConfirm|uiPrompt|uiAlert)\(/g)) { const e = arg(src, m.index + m[0].length).trim(); if (!/^['`]/.test(e)) continue; const P = parts(e);
    if (P.length === 1 && /^'/.test(e)) { const t = un(e.slice(1, -1)); if (/[A-Za-zÀ-ÿ]{3}/.test(t)) plain.add(t); continue; }
    composed.push([f + ':' + lineOf(m.index), P, e]); }
  for (const m of src.matchAll(/\b(?:put|putMany|drop)\([^()']{1,40},\s*'((?:[^'\\]|\\.)*)'\s*\)/g)) { const t = un(m[1]); if (/[A-Za-zÀ-ÿ]{3}/.test(t)) plain.add(t); }
  src.split('\n').forEach((ln, i) => { if (/^\s*\/\//.test(ln)) return; const C = [];
    for (const m of ln.matchAll(/>([^<>`]*?)</g)) C.push(m[1]); for (const m of ln.matchAll(/\b(?:placeholder|aria-label|title|alt)="([^"`]*?)"/g)) C.push(m[1]);
    for (let t of C) { if (/\$\{|\\u|=>|;|\|\||&&|^\s*\)|[={}[\]]|\(\s*$|\w\(/.test(t) || (t.split('(').length !== t.split(')').length)) continue; t = dec(t).replace(/\s+/g, ' ').trim(); if (!/[a-zà-ÿ]{3}/.test(t) || t.length > 240 || /^https?:/.test(t)) continue;
      const core = t.replace(/^[^A-Za-zÀ-ÿ0-9«“"'(]+/, '').replace(/[\s:…·›→▾]+$/, '').trim(); if (!core || (!FR.test(core) && !/[éèêàùçôîû]/.test(core)) || /\?\s*'$/.test(core)) continue;
      if (!fixed.has(core)) fixed.set(core, [f + ':' + (i + 1), t]); } }); }
let bad = 0;
for (const lang of LANGS) {
  const ctx = { console, Map, Set, RegExp, String, Object, Array, JSON, Math, Date }; ctx.window = ctx; ctx.self = ctx;
  ctx.localStorage = { getItem: () => lang, setItem() {} }; ctx.navigator = { languages: [lang], language: lang }; ctx.MutationObserver = class { observe() {} };
  ctx.document = { documentElement: { lang: '', dir: '' }, querySelector: () => null, write: () => {}, createTreeWalker: () => ({ nextNode: () => null }), addEventListener() {} }; ctx.alert = ctx.confirm = ctx.prompt = () => {};
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(PUB + '/i18n.js', 'utf8'), ctx); ctx.document.documentElement = null;
  const keys = new Set(), load0 = ctx.I18N.load; ctx.I18N.load = d => { Object.keys(d).forEach(k => keys.add(flat(k))); return load0(d); };
  vm.runInContext(fs.readFileSync(PUB + '/lang/' + lang + '.js', 'utf8'), ctx);
  const T = s => { let o = ctx.I18N.msg(s); if (o === s) { try { o = ctx.I18N.tr(s); } catch (e) {} } return o; }, miss = [];
  for (const s of plain) if (T(s) === s && !keys.has(flat(s))) miss.push('message · ' + s);
  for (const [w, P, e] of composed) { let a = '', b = '';
    for (const p of P) { const lit = /^'((?:[^'\\]|\\.)*)'$/.exec(p); if (lit) { a += un(lit[1]); b += un(lit[1]); } else if (/^`/.test(p)) { const t = un(p.slice(1, -1)); a += t.replace(/\$\{[^}]*\}/g, '7'); b += t.replace(/\$\{[^}]*\}/g, 'Zed'); } else if (/^(MSGT|RF|MSG)\(/.test(p)) { a += '§'; b += '§'; } else { a += '7'; b += 'Zed'; } }
    if (T(a) !== a || T(b) !== b) continue;
    const fx = P.map(p => /^'((?:[^'\\]|\\.)*)'$/.exec(p)).filter(Boolean).map(x => un(x[1])).filter(t => /[A-Za-zÀ-ÿ]{3}/.test(t));
    if (fx.length ? !fx.some(t => T(t) === t && T(t.trim()) === t.trim()) : !/^`/.test(e)) continue;
    miss.push(w + ' · ' + e.replace(/\s+/g, ' ').slice(0, 140)); }
  for (const [core, [w, t]] of fixed) if (T(t) === t && T(core) === core && !keys.has(flat(t)) && !keys.has(flat(core))) miss.push(w + ' · ' + core.slice(0, 140));
  bad += miss.length; console.log(lang + ' : ' + (miss.length ? miss.length + ' texte(s) non traduit(s)\n' + miss.slice(0, +process.env.MAX || 30).map(x => '   · ' + x.replace(/\n/g, '⏎')).join('\n') : 'tout est traduit'));
}
console.log(plain.size + ' messages simples, ' + composed.length + ' messages composés, ' + fixed.size + ' textes fixes contrôlés dans ' + LANGS.length + ' langues.'); process.exit(bad ? 1 : 0);
