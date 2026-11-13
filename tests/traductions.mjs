// 🌍 Contrôle des traductions : chaque phrase que l’appli demande (MSGT / RF / MSG) doit sortir traduite dans les 13 langues.
// usage : node tests/traductions.mjs          (code de sortie 1 s’il manque une phrase)
import vm from 'node:vm'; import fs from 'node:fs'; import path from 'node:path';
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), PUB = REPO + '/public';
const LANGS = (process.env.LANGS || 'en,es,de,it,pt,nl,ru,tr,ar,hi,zh,ja,ko').split(',');
const src = fs.readdirSync(PUB + '/assets').filter(f => /^app-\d\.js$/.test(f)).map(f => fs.readFileSync(PUB + '/assets/' + f, 'utf8')).join('\n');
const cand = new Set(); for (const m of src.matchAll(/\b(?:MSGT|RF|MSG)\(\s*'((?:[^'\\]|\\.)*)'/g)) { const t = m[1].replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\'); if (/[A-Za-zÀ-ÿ]{3}/.test(t)) cand.add(t); }
const flat = s => String(s).replace(/\s+/g, ' ').trim(); let bad = 0;
// mots identiques dans beaucoup de langues (noms propres, sigles) : pas une erreur s’ils restent tels quels en écriture latine
const SAME = /^(Source|direct|Suggestions|Photo|Photos|continents|Journal|Satellite|Code|Cloud|Options|Type|Notes?|Budget|Total|Train|Bus|Taxi|Film|Album|Wi-Fi|OK|Menu|Date|Transport|Visa|Destination|Info|Format|Mode|Message|Description|Position|Navigation|Minimum|Maximum|Vezoria.*|pers\.|\{0\} (min|km|h|photos?|Mo|€))$/;
for (const lang of LANGS) {
  const ctx = { console, Map, Set, RegExp, String, Object, Array, JSON, Math, Date }; ctx.window = ctx; ctx.self = ctx;
  ctx.localStorage = { getItem: () => lang, setItem() {} }; ctx.navigator = { languages: [lang], language: lang }; ctx.MutationObserver = class { observe() {} };
  ctx.document = { documentElement: { lang: '', dir: '' }, querySelector: () => null, write: () => {}, createTreeWalker: () => ({ nextNode: () => null }), addEventListener() {} }; ctx.alert = ctx.confirm = ctx.prompt = () => {};
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(PUB + '/i18n.js', 'utf8'), ctx);
  const keys = new Set(), load0 = ctx.I18N.load; ctx.I18N.load = d => { Object.keys(d).forEach(k => keys.add(flat(k))); return load0(d); }; ctx.document.documentElement = null;
  vm.runInContext(fs.readFileSync(PUB + '/lang/' + lang + '.js', 'utf8'), ctx);
  const latin = !/^(ru|ar|hi|zh|ja|ko)$/.test(lang), miss = [];
  for (const s of cand) { const out = ctx.I18N.msg(s); if (out !== s) continue;          // traduite telle quelle
    const smp = s.replace(/\{\d+\}/g, '7'); if (smp !== s && ctx.I18N.msg(smp) !== smp) continue;   // traduite une fois les valeurs en place
    if (keys.has(flat(s)) && !/\n/.test(s)) continue;                                   // clé présente, même texte voulu
    if (latin && SAME.test(s)) continue; miss.push(s); }
  bad += miss.length; console.log(lang + ' : ' + (miss.length ? miss.length + ' phrase(s) non traduite(s)' : 'tout est traduit') + (miss.length ? '\n' + miss.slice(0, +process.env.MAX || 40).map(x => '   · ' + x.replace(/\n/g, '⏎').slice(0, 150)).join('\n') : ''));
}
console.log(cand.size + ' phrases contrôlées dans ' + LANGS.length + ' langues.');
console.log(bad ? '✗ ÉCHEC : ' + bad + ' traduction(s) manquante(s) (voir plus haut)' : '✓ OK : tout est traduit'); process.exit(bad ? 1 : 0);   // la dernière ligne dit toujours le verdict
