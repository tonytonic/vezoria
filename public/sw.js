// Carnet de voyage — fonctionnement hors ligne
// Pages et fichiers de l'appli : réseau d'abord (toujours la dernière version), copie locale si pas de réseau.
// La synchro (/api/…) passe toujours par le réseau : les données restent dans le téléphone en attendant.
const CACHE = 'vezoria-2026-10-11s';
const CORE = ['./', './index.html', './manifest.json', './apple-touch-icon.png', './icon-192.png', './icon-512.png'];
// (les bibliothèques de vendor/ et les fichiers de langue lang/*.json sont mis en cache au premier usage)

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== 'vz-maps').map(k => caches.delete(k))))   // les cartes hors ligne restent
    .then(() => self.clients.claim()));
});
const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  // seul le partage Android (POST /partage-recu) passe ; le reste n'est intercepté qu'en GET
  if (req.method !== 'GET' && !(req.method === 'POST' && url.origin === self.location.origin && url.pathname.endsWith('/partage-recu'))) return;
  if (url.origin === self.location.origin) {
    // Partage Android (« Partager → Carnet de voyage ») : on range le document, puis on ouvre l'appli
    if (e.request.method === 'POST' && url.pathname.endsWith('/partage-recu')) {
      e.respondWith((async () => {
        try {
          const fd = await e.request.formData(), c = await caches.open('share-inbox');
          for (const k of await c.keys()) await c.delete(k);
          const f = fd.getAll('files').find(x => x && x.size);
          if (f) await c.put(new Request('./share/file?name=' + encodeURIComponent(f.name || 'document')), new Response(f, {headers: {'Content-Type': f.type || 'application/octet-stream'}}));
          const txt = [fd.get('title'), fd.get('text'), fd.get('url')].filter(Boolean).join('\n');
          if (txt) await c.put(new Request('./share/text'), new Response(txt));
        } catch (_) {}
        return Response.redirect('./?partage=1', 303);
      })());
      return;
    }
    // Rappels : « rappels.ics?c=… » est fabriqué ici, sur le téléphone, pour que l'iPhone ouvre Calendrier (« Ajouter tout »)
    if (url.pathname.endsWith('/rappels.ics') && url.searchParams.get('c')) {
      let b = url.searchParams.get('c').replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
      let txt = ''; try { txt = decodeURIComponent(escape(atob(b))); } catch (_) {}
      e.respondWith(new Response(txt, {headers: {'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'inline; filename="rappels.ics"', 'Cache-Control': 'no-store'}}));
      return;
    }
    if (url.pathname.startsWith('/api/')) return;
    if (/\.(mp4|mp3)$/.test(url.pathname)) return;
    // icônes et dessins : copie locale d'abord (instantané, pas de clignotement)
    if (/\/(icons|icons-live|icons-past|anim)\//.test(url.pathname)) {
      e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => { if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; })));
      return;
    }   // vidéo du tuto, musiques du film : lues en direct (lecture par morceaux)
    e.respondWith(timeout(fetch(req), 6000)
      .then(r => { if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; })
      .catch(() => caches.match(req, {ignoreSearch: true}).then(m => m || caches.match('./index.html'))));
    return;
  }
  // 🗺️ Cartes (OpenFreeMap) : morceaux de carte, polices et icônes d'abord depuis le téléphone ; le style, réseau d'abord
  if (url.hostname === 'tiles.openfreemap.org') {
    const isStyle = /\/styles\/|\/planet$|\/natural_earth\/[^/]+$/.test(url.pathname);
    e.respondWith((async () => {
      const c = await caches.open('vz-maps');
      if (!isStyle) { const m = await c.match(req); if (m) return m; }
      try { const r = await timeout(fetch(req), isStyle ? 5000 : 15000); if (r && r.ok) c.put(req, r.clone()); return r; }
      catch (_) { const m = await c.match(req); if (m) return m; throw _; }
    })());
    return;
  }
  // Bibliothèques externes (lecteur de ZIP) : copie locale d'abord
  if (/(^|\.)cdn\.jsdelivr\.net$|(^|\.)unpkg\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })));
  }
});

// ── 🔔 Notifications ──
// Le texte arrive chiffré avec la clé du voyage (rangée dans IndexedDB par l’appli) : il est déchiffré ici,
// sur le téléphone, et écrit dans la langue de l’appli (modèles traduits rangés par l’appli).
const TPL0 = {depense1:'{0} a ajouté une dépense : {1}', depenseN:'{0} a ajouté {1} dépenses', remb:'{0} a enregistré un remboursement : {1}',
  resa1:'{0} a ajouté au programme : {1}', resaN:'{0} a ajouté {1} éléments au programme', resaCh:'{0} a changé l’horaire : {1}',
  souv1:'{0} a ajouté un souvenir : {1}', souvN:'{0} a ajouté {1} souvenirs', sondage:'{0} lance un sondage : {1}',
  notes1:'{0} a ajouté aux courses : {1}', notesN:'{0} a ajouté {1} articles aux courses', note:'{0} a ajouté une note : {1}',
  depart:'Demain : départ pour {0}', checkin:'Enregistrement en ligne ouvert : {0}', echeance:'Échéance de paiement aujourd’hui : {0}',
  test:'Les notifications fonctionnent sur ce téléphone.', fb:'Du nouveau dans ton voyage', someone:'Quelqu’un'};
const pdb = () => new Promise((res, rej) => { const q = indexedDB.open('vz-push', 1); q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
const kvGet = async k => { try { const db = await pdb(); return await new Promise(res => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); }); } catch (_) { return undefined; } };
const kvPut = async (k, v) => { try { const db = await pdb(); await new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; tx.onerror = res; }); } catch (_) {} };
const fill = (s, a) => String(s || '').replace(/\{(\d)\}/g, (_, i) => (a[i] == null ? '' : a[i]));
function compose(p, tt) {
  const who = p.who || tt('someone'), it = p.it || [], n = p.n || it.length || 1, x0 = it[0] || {};
  const names = it.slice(0, 3).map(o => o.x).filter(Boolean).join(', ') + (n > 3 ? '…' : '');
  let b = '';
  if (p.k === 'rappel') b = fill(tt(p.r), p.a || []) + (p.sub ? '\n' + p.sub : '');
  else if (p.k === 'depense') b = x0.rb && n === 1 ? fill(tt('remb'), [who, x0.x + (x0.w ? ' → ' + x0.w : '')]) : n > 1 ? fill(tt('depenseN'), [who, n]) + '\n' + names : fill(tt('depense1'), [who, x0.x + (x0.v ? ' (' + x0.v + ')' : '')]);
  else if (p.k === 'resa') b = x0.ch ? fill(tt('resaCh'), [who, x0.x + (x0.h ? ' · ' + x0.h : '')]) : n > 1 ? fill(tt('resaN'), [who, n]) + '\n' + names : fill(tt('resa1'), [who, x0.x]);
  else if (p.k === 'souv') b = n > 1 ? fill(tt('souvN'), [who, n]) + '\n' + names : fill(tt('souv1'), [who, x0.x]);
  else if (p.k === 'sondage') b = fill(tt('sondage'), [who, x0.x]);
  else if (p.k === 'notes') b = x0.note ? fill(tt('note'), [who, x0.x]) : n > 1 ? fill(tt('notesN'), [who, n]) + '\n' + names : fill(tt('notes1'), [who, x0.x]);
  return { title: p.tt || 'Vezoria', body: b || tt('fb') };
}
self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) {}
    const T = (await kvGet('tpl')) || {}, tt = k => T[k] || TPL0[k] || '';
    let title = 'Vezoria', body = tt('fb'), url = './';
    try {
      const key = await kvGet('k:' + d.i);
      if (key && d.m) {
        const raw = Uint8Array.from(atob(d.m), c => c.charCodeAt(0));
        const p = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, key, raw.slice(12))));
        ({ title, body } = compose(p, tt));
        url = './?vzt=' + encodeURIComponent(p.trip || '') + '&vzk=' + encodeURIComponent(p.k || '');
      }
    } catch (_) {}
    const n = ((await kvGet('badge')) || 0) + 1; await kvPut('badge', n);
    try { if (self.navigator && self.navigator.setAppBadge) await self.navigator.setAppBadge(n); } catch (_) {}
    let ack = { type: 'vz-push', ok: true };
    try { await self.registration.showNotification(title, { body, tag: d.t || 'vezoria', renotify: true, icon: './icon-192.png', badge: './icons/badge-96.png', data: { url } }); }
    catch (err) { ack = { type: 'vz-push', ok: false, m: String(err && err.message || err) }; }
    try { (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).forEach(c => c.postMessage(ack)); } catch (_) {}
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of cs) { if (c.url.startsWith(self.registration.scope)) { try { await c.focus(); } catch (_) {} c.postMessage({ type: 'vz-open', url }); return; } }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
