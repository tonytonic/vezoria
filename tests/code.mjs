// 🧱 Contrôle du code lui-même, sans navigateur (quelques secondes) :
//   1. chaque fichier JavaScript se lit sans erreur de syntaxe ;
//   2. aucune instruction « avalée » par un commentaire posé au milieu d’une ligne
//      (le 11/11/2026, deux lignes ainsi coupées laissaient passer la syntaxe mais cassaient l’appli :
//       les voyages cachés à un abonné s’affichaient, et la ville choisie dans la liste n’était pas retenue) ;
//   3. aucune fiche créée sous un identifiant différent du sien (R['x' + uid()] = {id:'x' + uid()…}).
// usage : node tests/code.mjs     (code de sortie 1 au moindre souci)
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const files = [...fs.readdirSync(REPO + '/public/assets').filter(f => /\.js$/.test(f)).map(f => 'public/assets/' + f), 'public/i18n.js', 'public/sw.js',
  ...fs.readdirSync(REPO + '/public/lang').map(f => 'public/lang/' + f), ...fs.readdirSync(REPO + '/functions/api').filter(f => /\.js$/.test(f)).map(f => 'functions/api/' + f),
  ...fs.readdirSync(REPO + '/tests').filter(f => /\.mjs$/.test(f)).map(f => 'tests/' + f), ...fs.readdirSync(REPO + '/tests/e2e').filter(f => /\.mjs$/.test(f)).map(f => 'tests/e2e/' + f)];
let bad = 0; const say = (f, i, why, txt) => { bad++; console.log(`✗ ${f}:${i} · ${why}\n    ${String(txt).trim().slice(0, 200)}`); };
for (const f of files) { const full = REPO + '/' + f, src = fs.readFileSync(full, 'utf8');
  if (!/functions\/|tests\//.test(f)) { try { execFileSync(process.execPath, ['--check', full], { stdio: 'pipe' }); } catch (e) { say(f, 0, 'erreur de syntaxe', String(e.stderr || e).split('\n').slice(0, 5).join(' ')); } }
  if (/public\/lang\//.test(f) || /vendor|\.min\./.test(f)) continue;
  src.split('\n').forEach((ln, i) => { if (/^\s*(\/\/|\*|\/\*)/.test(ln)) return;
    const m = /(?:^|[;{})\s])\/\/(?!\/)(.*)$/.exec(ln); if (m) { const c = m[1];
      if (/[A-Za-z_$\]\)] = [^;:]{1,60}; *(if\(|[A-Za-z_$.]+\(|[A-Za-z_$.]+ = |return |const |let |await )/.test(c) || /\b(if\([^)]{1,60}\) [A-Za-z_$.]+ = |; return [a-z]|; persist\(\)|; render\(\)|; refresh\(\)|\); *[A-Za-z_$.]+\([^)]*\); *$)/.test(c) || /\}\s*(const|let|var|return|put|putMany|persist|refresh|render)\b[ (]/.test(c))
        say(f, i + 1, 'des instructions sont peut-être passées dans un commentaire', '//' + c); }
    if (/^tests\//.test(f) && f !== 'tests/code.mjs') { const m2 = /;\s+\/\/(?!\/)(.*\bawait [A-Za-z_$.]+[.(].*)$/.exec(ln); if (m2) say(f, i + 1, 'un « await » est passé dans un commentaire', '//' + m2[1]); }
    if (/R\[('[a-z]+' \+ uid\(\)[^\]]*)\] = \{id:\1/.test(ln)) say(f, i + 1, 'fiche rangée sous un autre identifiant que le sien (uid() appelé deux fois)', ln); }); }
// 4. une variable locale qui porte le nom d’une fonction de l’appli, alors que cette fonction est appelée plus haut dans le même bloc :
//    « Cannot access 'x' before initialization » (le 12/11/2026, le bouton « Continuer » du globe plantait ainsi en silence)
{ const app = files.filter(f => /public\/assets\/app-\d\.js$/.test(f)).map(f => [f, fs.readFileSync(REPO + '/' + f, 'utf8')]);
  const fnames = new Set(); app.forEach(([, src]) => { for (const m of src.matchAll(/\bfunction ([A-Za-z_$][\w$]*)\s*\(/g)) fnames.add(m[1]); });
  for (const [f, src] of app) { const L = src.split('\n');
    L.forEach((ln, i) => { for (const m of ln.matchAll(/\b(?:const|let) ([A-Za-z_$][\w$]*) =/g)) { const nm = m[1]; if (!fnames.has(nm)) continue;
      // le bloc : on remonte jusqu’à l’en-tête de fonction le plus proche, moins indenté
      const ind = ln.length - ln.trimStart().length; let k = i; const before = [ln.slice(0, m.index)];
      while (k > 0 && i - k < 80) { k--; const l2 = L[k], i2 = l2.length - l2.trimStart().length; if (/\bfunction\b|=>\s*\{\s*$/.test(l2) && i2 < ind) { before.unshift(l2.slice(l2.indexOf('{') + 1)); break; } before.unshift(l2); }
      const re = new RegExp('(^|[^\\w$.])' + nm.replace(/\$/g, '\\$') + '\\s*\\('), hit = before.map(l => l.replace(/\/\/.*$/, '')).some(l => { const m2 = re.exec(l); return m2 && !/=>/.test(l.slice(0, m2.index)); });   // appel direct, pas dans une petite fonction appelée plus tard
      if (hit) say(f, i + 1, `« ${nm} » est appelée plus haut dans ce bloc, puis redéclarée ici : plantage « before initialization »`, ln); } }); } }
console.log(bad ? bad + ' souci(s).' : files.length + ' fichiers : syntaxe correcte, aucune instruction avalée par un commentaire, aucune fiche mal rangée.'); process.exit(bad ? 1 : 0);
