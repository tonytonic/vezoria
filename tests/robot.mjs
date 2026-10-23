// Vezoria — robot de tests (lancé par GitHub à chaque envoi, voir .github/workflows/robot.yml)
// Ouvre l'appli comme un téléphone (360 px), crée le voyage de démo, puis touche les boutons de chaque écran.
// Échoue si une erreur JavaScript apparaît. Aucun service extérieur n'est appelé (cartes, météo… bloqués).
//   En local : node tests/robot.mjs   (il lance lui-même un petit serveur sur le dossier public/)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, r));
const BASE = `http://localhost:${server.address().port}`;

const SKIP = /démo|demo|suppr|effac|quitt|export|partag|déconn|retir|vider|réinit|bloqu|signal|mettre à jour|réparer|copier|imprim|télécharg|envoyer|installer|offrir un café|annuler l|delete|remove/i;
const LANGS = (process.env.LANGS || 'fr,en').split(',');
const errors = [];
let clicks = 0;

const browser = await chromium.launch(process.env.PW_EXE ? { executablePath: process.env.PW_EXE } : {});
for (const lang of LANGS) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 760 }, serviceWorkers: 'block' });
  await ctx.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  await ctx.addInitScript(l => { try { localStorage.setItem('cv-lang', l); } catch (e) {} window.alert = () => {}; window.confirm = () => true; window.prompt = () => null; window.open = () => null; }, lang);
  const pg = await ctx.newPage();
  pg.on("pageerror", e => errors.push(`[${lang}] ${e.message}` + (process.env.STACK ? "\n" + e.stack : "")));
  await pg.goto(BASE + '/?web=1'); await pg.waitForTimeout(2500);
  for (let i = 0; i < 3 && !(await pg.$('#cv-pnom')); i++) { await pg.evaluate(() => { if (document.getElementById('su-l')) CV.setupGo(); else if (CV.infoOk) CV.infoOk(true); }); await pg.waitForTimeout(800); }
  await pg.fill('#cv-pnom', 'Robot');
  await pg.evaluate(() => { void CV.obCreate('demo'); }); await pg.waitForTimeout(5000);
  const tidy = async () => pg.evaluate(() => {
    document.querySelectorAll('.ui-dlg .ui-act button:last-child').forEach(b => b.click());
    try { CV.close(); } catch (e) {} document.querySelectorAll('#v-sheet-bg').forEach(x => x.remove());
    ['worldClose', 'liveClose', 'filmClose', 'wallClose', 'scrClose', 'pcClose', 'stEdClose', 'vjStop'].forEach(f => { try { if (CV[f]) CV[f](); } catch (e) {} });
    document.body.style.overflow = '';
  });
  await tidy();
  const navs = await pg.evaluate(() => document.querySelectorAll('.cv-nav button').length);
  for (let n = 0; n < navs; n++) {
    await pg.evaluate(i => document.querySelectorAll('.cv-nav button')[i] && document.querySelectorAll('.cv-nav button')[i].click(), n); await pg.waitForTimeout(600); await tidy();
    const total = await pg.evaluate(() => document.querySelectorAll('#cv-body button').length);
    for (let k = 0; k < Math.min(total, 60); k++) {
      const label = await pg.evaluate(k => { const b = document.querySelectorAll('#cv-body button')[k]; return b ? (b.innerText || b.getAttribute('aria-label') || '').trim() : null; }, k);
      if (label == null || SKIP.test(label)) continue;
      await pg.evaluate(k => { const b = document.querySelectorAll('#cv-body button')[k]; if (b) b.click(); }, k).catch(() => {});
      clicks++; await pg.waitForTimeout(150); await tidy();
    }
  }
  await ctx.close();
}
await browser.close(); server.close();
console.log(`${clicks} boutons touchés (${LANGS.join(', ')}).`);
if (errors.length) { console.error('Erreurs JavaScript :\n' + [...new Set(errors)].join('\n')); process.exit(1); }
console.log('Aucune erreur JavaScript.');
