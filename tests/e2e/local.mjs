// Serveur local complet : public/ + /api/* (fonctions Pages) sur SQLite + faux R2
import { DatabaseSync } from 'node:sqlite';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
globalThis.caches = globalThis.caches || { default: { async match() { return null; }, async put() {} } };   // le cache de Cloudflare n’existe pas ici (seewhat, act, unfurl)
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..'), ROOT = REPO + '/public', API = REPO + '/functions/api';
function d1() { const db = new DatabaseSync(':memory:');
  const mk = (sql, args = []) => ({ bind: (...a) => mk(sql, a),
    async first() { const r = db.prepare(sql).get(...args); return r === undefined ? null : r; },
    async all() { return { results: db.prepare(sql).all(...args) }; },
    async run() { const st = db.prepare(sql); if (/RETURNING/i.test(sql)) { st.all(...args); return { meta: { changes: 1 } }; } const r = st.run(...args); return { meta: { changes: Number(r.changes) } }; },
    _exec() { const st = db.prepare(sql); return /^\s*SELECT/i.test(sql) ? st.all(...args) : st.run(...args); } });
  return { prepare: sql => mk(sql), async batch(list) { db.exec('BEGIN'); try { const out = list.map(s => s._exec()); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; } }, _db: db }; }
function r2() { const m = new Map(); return {
  async put(k, v, o) { const b = v instanceof ArrayBuffer ? new Uint8Array(v) : v instanceof Uint8Array ? v : new Uint8Array(await new Response(v).arrayBuffer()); m.set(k, { v: b, o: o || {}, up: new Date() }); return { key: k, size: b.length }; },
  async head(k) { const x = m.get(k); return x ? { key: k, size: x.v.length, uploaded: x.up, customMetadata: x.o.customMetadata, httpMetadata: x.o.httpMetadata } : null; },
  async get(k) { const x = m.get(k); return x ? { body: x.v, size: x.v.length, httpMetadata: x.o.httpMetadata, customMetadata: x.o.customMetadata, writeHttpMetadata(h) { if (x.o.httpMetadata && x.o.httpMetadata.contentType) h.set('Content-Type', x.o.httpMetadata.contentType); }, httpEtag: '"x"', async arrayBuffer() { return x.v.buffer; } } : null; },
  async delete(k) { (Array.isArray(k) ? k : [k]).forEach(x => m.delete(x)); },
  async list({ prefix = '' } = {}) { return { objects: [...m].filter(([k]) => k.startsWith(prefix)).map(([k, x]) => ({ key: k, size: x.v.length, uploaded: x.up })), truncated: false, delimitedPrefixes: [] }; } }; }
export const env = { DB: d1(), PHOTOS: r2(), MAIL_DEV: '1', ADMIN_KEY: 'k'.repeat(30), MAIL_KEY: 'clef-de-test' };
env.DB._db.exec(fs.readFileSync(REPO + '/schema.sql', 'utf8'));
const CITY = { rome: [41.9028, 12.4964, 'Rome', 'Italie', 'it'], florence: [43.7696, 11.2558, 'Florence', 'Italie', 'it'], venise: [45.4408, 12.3155, 'Venise', 'Italie', 'it'], brest: [48.39, -4.486, 'Brest', 'France', 'fr'], lisbonne: [38.7223, -9.1393, 'Lisbonne', 'Portugal', 'pt'], porto: [41.1579, -8.6291, 'Porto', 'Portugal', 'pt'], quimper: [47.996, -4.102, 'Quimper', 'France', 'fr'] };
export const apiLog = [];
const mods = {}; const mod = async f => mods[f] || (mods[f] = await import(pathToFileURL(path.join(API, f)).href));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
export const srv = http.createServer(async (q, r) => { try {
  const u = new URL(q.url, 'http://localhost');
  if (u.pathname.startsWith('/api/')) {
    const chunks = []; for await (const c of q) chunks.push(c); const body = Buffer.concat(chunks);
    const name = u.pathname.split('/')[2];
    if (name === 'geo') { const qq = (u.searchParams.get('q') || u.searchParams.get('city') || '').toLowerCase(); const k = Object.keys(CITY).find(k => qq.includes(k)) || (u.searchParams.get('lat') ? Object.keys(CITY).sort((a, b) => Math.abs(CITY[a][0] - u.searchParams.get('lat')) - Math.abs(CITY[b][0] - u.searchParams.get('lat')))[0] : '');
      r.writeHead(200, { 'Content-Type': 'application/json' }); if (!k) return r.end(u.pathname.includes('reverse') ? '{}' : '[]'); const c = CITY[k]; const o = { place_id: 1, lat: String(c[0]), lon: String(c[1]), name: c[2], display_name: c[2] + ', ' + c[3], class: 'place', type: 'city', addresstype: 'city', importance: 0.8, address: { city: c[2], country: c[3], country_code: c[4] }, boundingbox: [String(c[0] - .1), String(c[0] + .1), String(c[1] - .1), String(c[1] + .1)] };
      return r.end(JSON.stringify(u.pathname.includes('reverse') ? o : [o])); }
    if (!fs.existsSync(path.join(API, name + '.js')) || name.startsWith('_')) { r.writeHead(404); return r.end('{}'); }
    const m = await mod(name + '.js'); const h = new Headers(); for (const [k, v] of Object.entries(q.headers)) if (typeof v === 'string') h.set(k, v); h.set('CF-Connecting-IP', '203.0.113.' + (1 + apiLog.length % 200));
    const req = new Request('https://vezoria.pages.dev' + u.pathname + u.search, { method: q.method, headers: h, body: ['GET', 'HEAD'].includes(q.method) ? undefined : body });
    const fn = m['onRequest' + q.method[0] + q.method.slice(1).toLowerCase()] || m.onRequest;
    if (!fn) { r.writeHead(405); return r.end('{}'); }
    const res = await fn({ request: req, env, waitUntil: p => { p && p.catch && p.catch(() => {}); }, params: {} });
    const buf = Buffer.from(await res.arrayBuffer()); let note = ''; if (res.status >= 400) note = ' ' + buf.toString().slice(0, 160);
    apiLog.push(q.method + ' ' + u.pathname + u.search.slice(0, 50) + ' → ' + res.status + note);
    const hh = {}; res.headers.forEach((v, k) => { hh[k] = v; }); r.writeHead(res.status, hh); return r.end(buf); }
  let p = decodeURIComponent(u.pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
} catch (e) { apiLog.push('ERREUR SERVEUR ' + q.url + ' ' + (e && e.stack || e)); r.writeHead(500); r.end('{}'); } });
await new Promise(z => srv.listen(0, z)); export const BASE = `http://localhost:${srv.address().port}`;
