// 🧪 Injection de code par les données (XSS) : chaque texte de chaque fiche (titre, lieu, récit, prénom, adresse, lien…) est remplacé
// par un texte piégé, comme pourrait en envoyer un compagnon ou un abonné malveillant. On ouvre ensuite chaque écran et chaque fenêtre,
// on touche les boutons, et on vérifie que le piège n’est JAMAIS devenu du HTML, un lien « javascript: » ou du code dans un bouton.
// usage : node tests/e2e/xss.mjs [0|1|2] [rapide]     (0 = voyage en préparation, 1 = en cours, 2 = terminé ; sans argument : les trois)
import fs from 'node:fs'; import { user, say, done, OUT } from './lib.mjs'; import { sweep, KEYS, sheetPlaces } from './boutons.mjs';
const WATCH = () => {
  if (window.__inj) return; window.__inj = [];
  const save = (k, n, where) => { const s = k + ':' + n; if (window.__inj.some(x => x.s === s)) return; const x = { s, k, n, where: String(where || '').slice(0, 260) }; window.__inj.push(x);
    try { const L = JSON.parse(localStorage.getItem('xss-inj') || '[]'); if (!L.some(y => y.s === s)) { L.push(x); localStorage.setItem('xss-inj', JSON.stringify(L)); } } catch (e) {} };
  window.__x = n => save('exec', n, 'code exécuté');
  const scan = el => { if (!el || el.nodeType !== 1) return;
    const all = [el, ...el.querySelectorAll('*')];
    for (const e of all) {
      if (e.tagName === 'IMG' && e.getAttribute('src') === 'x' && /__x\(\d+\)/.test(e.getAttribute('onerror') || '')) save('html', (e.getAttribute('onerror').match(/\d+/) || [0])[0], (e.parentElement || e).outerHTML);
      for (const a of e.attributes) {
        if (/^on/i.test(a.name) && !(e.tagName === 'IMG' && e.getAttribute('src') === 'x')) { const m = a.value.match(/Zq(\d+)'\);__x\(/);
          if (m) { const v = a.value, i = v.indexOf('Zq' + m[1]); let open = null;   // dans quelle sorte de guillemets le texte est-il posé ?
            for (let k = 0; k < i; k++) { const c = v[k]; if (c === '\\') { k++; continue; } if (open) { if (c === open) open = null; } else if (c === "'" || c === '"' || c === '`') open = c; }
            const dq = v.indexOf('__x(' + m[1] + ');//"'), rawDq = dq >= 0;   // le « " » du piège est-il resté tel quel (pas « \" ») ?
            if (!open || open === "'" || (open === '"' && rawDq) || open === '`') save('js', m[1], a.name + '=' + v); } }
        if (/^(href|src|action|formaction|xlink:href)$/i.test(a.name) && /^\s*javascript:/i.test(a.value)) save('url', (a.value.match(/__x\((\d+)\)/) || [0, 0])[1], e.outerHTML);
      } } };
  new MutationObserver(L => L.forEach(m => { if (m.type === 'attributes') scan(m.target); else m.addedNodes.forEach(scan); })).observe(document, { subtree: true, childList: true, attributes: true });
  scan(document.documentElement);
};
// remplace chaque texte libre des fiches par un texte piégé (les identifiants, dates, codes et choix de liste ne sont pas touchés)
const POISON = all => { const R = CV._R(), ids = new Set(Object.keys(R)), map = {}; let n = 0; const ALL = !!all, STRUCT = /^(id|type|trip|cat|statut|status|stay|date|dateFin|debut|fin|heure|heureDep|heureArr|kind|base|partage|qui|voyageurs|createdBy|updatedBy|who|pid|by|dev|feed|tid)$/;
  const P = n => `Zq${n}');__x(${n});//"><img src=x onerror=__x(${n})>`;
  const keep = v => ids.has(v) || /^\d{4}-\d\d-\d\d/.test(v) || /^\d\d?:\d\d$/.test(v) || /^#[0-9a-f]{3,8}$/i.test(v) || v.length <= 2 || /^[a-z0-9_:.\-|]{1,40}$/.test(v) || /^[A-Z]{2,3}$/.test(v) || !/[A-Za-zÀ-ÿ]/.test(v) || /^data:/.test(v) || /^[A-Za-z0-9+/=_-]{40,}$/.test(v);
  const walk = (o, path, d) => { if (!o || d > 5) return;
    for (const k of Object.keys(o)) { const v = o[k];
      if (typeof v === 'string') { if (/^(id|type|trip|_au)$/.test(k) && d === 0) continue; if (ALL ? (STRUCT.test(k) || ids.has(v) || /^\d{4}-\d\d-\d\d/.test(v) || !v) : keep(v)) continue; n++; map[n] = path + '.' + k;
        o[k] = /^(https?|javascript):/i.test(v) ? `javascript:__x(${n})//` + P(n) : v.slice(0, 10) + ' ' + P(n); }
      else if (Array.isArray(v)) { v.forEach((x, i) => { if (typeof x === 'string') { if (ALL ? !(STRUCT.test(k) || ids.has(x)) : !keep(x)) { n++; map[n] = path + '.' + k + '[]'; v[i] = x.slice(0, 10) + ' ' + P(n); } } else if (x && typeof x === 'object' && !Array.isArray(x)) walk(x, path + '.' + k + '[]', d + 1); }); }
      else if (v && typeof v === 'object') walk(v, path + '.' + k, d + 1); } };
  Object.values(R).forEach(r => { if (r && typeof r === 'object' && !r.deleted) walk(r, r.type || '?', 0); });
  try { const M = CV._M(); if (M.followName != null || true) M.followName = 'Moi ' + P(++n); map[n] = 'M.followName'; } catch (e) {}
  try { CV.refresh(); } catch (e) {} return { n, map }; };
// après un rechargement de la page (lien vers une autre page), les fiches sont piégées de nouveau
const AUTO = `(${WATCH})(); window.__poison = ${POISON}; { const t = setInterval(() => { try { if (window.CV && CV._M && CV._M().trip && sessionStorage.getItem('xss-on') && !window.__pz) { window.__pz = 1; clearInterval(t); window.__poison(${process.argv.includes('codes') ? 1 : 0}); } } catch (e) {} }, 400); }`;

const PX = n => `Zq${n}');__x(${n});//"><img src=x onerror=__x(${n})>`, JU = n => `javascript:__x(${n})//` + PX(n);
const APIMAP = { 9001: 'api seewhat', 9002: 'api act', 9003: 'api tp', 9004: 'api geo', 9005: 'api unfurl' };
const API = async route => { const u = new URL(route.request().url()), p = u.pathname, j = o => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
  if (/\/api\/seewhat/.test(p)) return j({ total: 2, places: [1, 2].map(i => ({ name: 'Lieu ' + PX(9001), cat: PX(9001), emo: PX(9001), lat: 41.9 + i / 100, lng: 12.49, distanceKm: i, wiki: JU(9001), site: JU(9001), osm: JU(9001) })) });
  if (/\/api\/act/.test(p)) return j({ ok: true, src: 'viator', tours: [1, 2].map(i => ({ id: 'P' + i + PX(9002), title: 'Visite ' + PX(9002), img: JU(9002), price: 25, currency: PX(9002), rating: 4.5, reviews: 12, duration: PX(9002), url: JU(9002), flags: [PX(9002)] })) });
  if (/\/api\/tp/.test(p)) return j({ ok: true, src: PX(9003), city: PX(9003), currency: PX(9003), flight: { price: 80, at: '2027-05-01T10:00:00Z', ret: '', stops: 0, airline: PX(9003), dur: 120, on: PX(9003), dn: PX(9003), link: JU(9003), search: JU(9003) },
    flights: [{ price: 80, at: '2027-05-01T10:00:00Z', stops: 0, airline: PX(9003), dur: 120, on: PX(9003), dn: PX(9003), link: JU(9003), search: JU(9003) }], search: JU(9003), searchOW: JU(9003),
    tours: [{ id: 'w1' + PX(9003), title: 'Audio ' + PX(9003), img: JU(9003), price: 9, rating: 4.4, reviews: 3, duration: 60, url: JU(9003) }], count: 1, apts: [] });
  if (/\/api\/geo\/reverse/.test(p)) return j({ lat: '41.9', lon: '12.49', name: PX(9004), display_name: PX(9004), addresstype: 'city', address: { city: 'Rome ' + PX(9004), country: PX(9004), country_code: 'it', road: PX(9004), state: PX(9004) } });
  if (/\/api\/geo/.test(p)) return j([1, 2].map(i => ({ lat: String(41.9 + i / 100), lon: '12.49', name: 'Rome ' + PX(9004), display_name: 'Rome ' + PX(9004), addresstype: 'city', type: 'city', class: 'place', address: { city: 'Rome ' + PX(9004), country: PX(9004), country_code: 'it', road: PX(9004), house_number: PX(9004), postcode: PX(9004), state: PX(9004) } })));
  if (/\/api\/unfurl/.test(p)) return j({ ok: true, url: JU(9005), site: PX(9005), name: 'Lieu ' + PX(9005), title: PX(9005), desc: PX(9005), author: PX(9005), lat: 41.9, lng: 12.49 });
  return route.continue(); };
const which = /^[012]$/.test(process.argv[2] || '') ? [+process.argv[2]] : [0, 1, 2], fast = process.argv.includes('rapide');
const K = [KEYS.prep, [...KEYS.live, ...KEYS.prep], [...KEYS.past, ...KEYS.prep]], SKIP = /Effacer ce téléphone|CV\.wipe|CV\.lang|CV\.setLang|su-l|CV\.demo|obCreate/;
const found = [], users = []; let fields = 0, clicks = 0;
for (const st of which) {
  const U = await user('Robot'); users.push(U); await U.ctx.addInitScript(AUTO); if (process.argv.includes('api')) await U.ctx.route(/\/api\/(seewhat|act|tp|geo|unfurl)\b/, API);
  await U.tap(/Je crée mon carnet/, null, 300); await U.fill('#cv-pnom', 'Robot'); await U.ev(() => { void CV.obCreate('demo'); });
  for (let i = 0; i < 40 && !(await U.ev(() => { try { return !!CV._M().trip; } catch (e) { return false; } })); i++) await U.wait(500); await U.wait(1500); await U.closeAll();
  const ids = await U.ev(() => Object.values(CV._R()).filter(r => r.type === 'trip' && !r.deleted).sort((a, b) => (a.debut || '').localeCompare(b.debut || '')).map(t => t.id)); await U.ev(i => CV.go(i), ids[st]); await U.wait(800);
  await U.pg.evaluate(WATCH); await U.ev(() => { sessionStorage.setItem('xss-on', '1'); window.__pz = 1; }); const p = await U.ev(POISON, process.argv.includes('codes') ? 1 : 0); fields += p.n; await U.wait(800);
  const r = await sweep(U, 'xss' + st, { skip: SKIP, keys: K[st], perFn: fast ? 1 : 2, extra: fast ? [] : sheetPlaces(U) }); clicks += r.clicks;
  const inj = await U.ev(() => { let L = []; try { L = JSON.parse(localStorage.getItem('xss-inj') || '[]'); } catch (e) {} return [...L, ...(window.__inj || [])]; });
  const seen = new Set(); inj.forEach(x => { if (seen.has(x.s)) return; seen.add(x.s); found.push({ etat: st, sorte: x.k, champ: p.map[x.n] || APIMAP[x.n] || '?', ou: x.where }); });
  say(`[xss ${st}] ${p.n} textes piégés · ${r.clicks} boutons touchés · ${seen.size} injection(s) · ${r.errs.length} erreur(s) JS`);
  if (r.errs.length) say(r.errs.slice(0, 12).map(e => '   ⚠ ' + e).join('\n'));
  await U.ctx.close();
}
fs.writeFileSync(OUT + '/xss.json', JSON.stringify(found, null, 1));
const by = {}; found.forEach(f => { (by[f.sorte + ' · ' + f.champ] = by[f.sorte + ' · ' + f.champ] || []).push(f.ou); });
say(Object.keys(by).length ? '\n✗ ' + Object.keys(by).length + ' champ(s) où un texte piégé devient du code :\n' + Object.entries(by).map(([k, v]) => '  ✗ ' + k + '\n      ' + v[0].replace(/\s+/g, ' ').slice(0, 230)).join('\n')
  : `\n✓ ${fields} textes piégés, ${clicks} boutons touchés : aucun texte de fiche ne devient du code.`);
process.exit(Object.keys(by).length ? 1 : 0);
