/* Vezoria — code de l’appli, partie 1/8 (chargées dans l’ordre par index.html, même portée globale) */

/* ══════════════════════════════════════════════════════════
   CARNET PARTAGÉ — voyages, profils, notes, envies, synchro
   Stockage local : carnet_v2  ·  Synchro : /api/sync (Cloudflare D1)
══════════════════════════════════════════════════════════ */
const PUBLIC = true;   // version grand public : sans données perso ni archives
  const ESCALE = '';   // version appli (Google Play) : sans Escale
  const KEY = 'carnet_v2', OLD = 'voyage2027_v1', ARCHIVE_KEY = 'roadtrip2026_v3', LEGACY = 'legacy2026';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // 🌍 recherche d’adresses : toujours par notre serveur (cache, 1 requête/s pour toute l’appli, repli Photon, coupure à distance)
  const GEO = (/^https?:/.test(location.protocol) ? location.origin : 'https://vezoria.pages.dev') + '/api/geo/';
  // 🛰️ fonds de carte Esri. ESRI_KEY vide : anciennes adresses publiques (gelées par Esri, sans compte).
  //    Avec une clé gratuite « ArcGIS Location Platform » (restreinte à ton domaine dans le tableau de bord Esri) :
  //    nouveau service officiel, 2 millions de tuiles par mois. Il suffit de coller la clé ici.
  const ESRI_KEY = '';
  const ESRI_SBT = 'https://static-map-tiles-api.arcgis.com/arcgis/rest/services/static-basemap-tiles-service/v1/';
  const ESRI_NEW = {sat:['https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', 256],
    light:[ESRI_SBT + 'arcgis/light-gray/static/tile/{z}/{y}/{x}', 512], dark:[ESRI_SBT + 'arcgis/dark-gray/static/tile/{z}/{y}/{x}', 512], street:[ESRI_SBT + 'arcgis/streets/static/tile/{z}/{y}/{x}', 512]};
  const ESRI_OLD = {sat:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    light:'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    dark:'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    street:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'};
  const esriSrc = k => ESRI_KEY && ESRI_NEW[k] ? {t: ESRI_NEW[k][0] + '?token=' + encodeURIComponent(ESRI_KEY), size: ESRI_NEW[k][1]} : {t: ESRI_OLD[k], size: 256};
  const esriML = k => { const s = esriSrc(k); return {type:'raster', tiles:[s.t], tileSize:s.size}; };   // source MapLibre
  const esriBlobs = new Map();
  // une tuile 256 px (grille z/x/y habituelle), découpée dans la tuile 512 px du nouveau service si besoin
  async function esriTile(k, z, x, y){
    const s = esriSrc(k); let Z = z, X = x, Y = y, sx = 0, sy = 0; const big = s.size === 512;
    if(big && z > 0){ Z = z - 1; X = x >> 1; Y = y >> 1; sx = (x & 1) * 256; sy = (y & 1) * 256; }
    const u = s.t.replace('{z}', Z).replace('{y}', Y).replace('{x}', X);
    if(!esriBlobs.has(u)){ esriBlobs.set(u, fetch(u, {mode:'cors'}).then(r=>r.ok ? r.blob() : null).catch(()=>null)); if(esriBlobs.size > 300) esriBlobs.delete(esriBlobs.keys().next().value); }
    const b = await esriBlobs.get(u); if(!b) return null;
    try { return !big ? await createImageBitmap(b) : z > 0 ? await createImageBitmap(b, sx, sy, 256, 256) : await createImageBitmap(b, {resizeWidth:256, resizeHeight:256}); } catch(e){ return null; }
  }
  // 🗺️ fond « plan » vectoriel OpenFreeMap (libre, sans clé, usage hors ligne permis) : surfaces et routes du style Liberty
  //    à la place des tuiles tile.openstreetmap.org (réservées, pas d’usage hors ligne). from : zoom où il apparaît (fondu sur 2 niveaux).
  function ofmBase(lib, src, from, hidden){
    return (lib.layers || []).filter(l=>l.source === src && (l.type === 'fill' || l.type === 'line')).map(l=>{
      const x = JSON.parse(JSON.stringify(l)), prop = x.type + '-opacity', orig = (x.paint || {})[prop];
      x.id = 'ofm-b-' + x.id; x.source = 'ofm'; x.paint = x.paint || {};
      if(from){ x.minzoom = Math.max(x.minzoom || 0, from);
        if(orig == null || typeof orig === 'number'){ x.paint[prop] = ['interpolate',['linear'],['zoom'], from, 0, from + 2, orig == null ? 1 : orig]; x.metadata = {vzOp:prop, vzOrig:orig == null ? 1 : orig, vzMin:l.minzoom || 0}; } }
      if(hidden) x.layout = Object.assign({}, x.layout, {visibility:'none'});
      return x; });
  }
  // 📍 « Genève, Suisse » + pays « Suisse » : le pays n’est ajouté que s’il manque au lieu
  const lieuPays = (lieu, pays) => { const l = String(lieu || '').trim(), p = String(pays || '').trim(); if(!p) return l; if(!l) return p;
    const n = x => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); return l.split(',').some(x=>n(x) === n(p)) ? l : l + ', ' + p; };
  // 🔒 lien venu des données (compagnon, import…) : seulement http(s), jamais javascript:, data:, etc.
  const safeUrl = u => { const t = String(u ?? '').trim().replace(/[\u0000-\u001F\u007F\s]+/g, ''); if(!t) return ''; if(/^https?:\/\//i.test(t)) return t; return /^[a-z][a-z0-9+.-]*:/i.test(t) ? '' : 'https://' + t.replace(/^\/+/, ''); };

  /* ══ Fenêtres de dialogue de l'appli (remplacent alert/confirm/prompt, qui affichent l'adresse du site sur Android et iPhone) ══ */
  const UIQ = []; let dlgBusy = false;
  const uiBox = (kind, msg, def) => new Promise(res=>{ UIQ.push({kind, msg: String(msg ?? ''), def, res}); uiNext(); });
  function uiNext(){
    if(dlgBusy || !UIQ.length) return; dlgBusy = true;
    const {kind, msg, def, res} = UIQ.shift(), T = x => (window.I18N && I18N.msg ? I18N.msg(x) : x);
    const ov = document.createElement('div'); ov.className = 'ui-dlg'; ov.setAttribute('role', kind === 'alert' ? 'alertdialog' : 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = `<div class="ui-box"><div class="ui-msg"></div>${kind === 'prompt' ? '<input class="v-in ui-in" type="text" autocomplete="off">' : ''}<div class="ui-act">${kind !== 'alert' ? '<button type="button" class="v-btn sec ui-no">Annuler</button>' : ''}<button type="button" class="v-btn ui-ok">OK</button></div></div>`;
    ov.querySelector('.ui-msg').textContent = T(msg);
    const inp = ov.querySelector('.ui-in'); if(inp) inp.value = def == null ? '' : String(def);
    const key = e => { if(e.key === 'Enter'){ e.preventDefault(); e.stopPropagation(); ok(); } else if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); kind === 'alert' ? ok() : no(); } };
    const done = v => { document.removeEventListener('keydown', key, true); ov.remove(); dlgBusy = false; res(v); setTimeout(uiNext, 0); };
    const ok = () => done(kind === 'confirm' ? true : kind === 'prompt' ? inp.value : undefined);
    const no = () => done(kind === 'confirm' ? false : kind === 'prompt' ? null : undefined);
    ov.querySelector('.ui-ok').onclick = ok; const nb = ov.querySelector('.ui-no'); if(nb) nb.onclick = no;
    document.addEventListener('keydown', key, true);
    document.body.appendChild(ov);
    setTimeout(()=>{ try { (inp || ov.querySelector('.ui-ok')).focus({preventScroll:true}); if(inp) inp.select(); } catch(e){} }, 40);
  }
  const uiAlert = m => uiBox('alert', m), uiConfirm = m => uiBox('confirm', m), uiPrompt = (m, d) => uiBox('prompt', m, d);
  window.alert = uiAlert;
  const D = d => d ? '2027-07-' + String(d).padStart(2,'0') : '';
  const num = v => { const n = parseFloat(String(v ?? '').replace(',','.')); return isNaN(n) ? 0 : n; };
  /* ── Devise : chaque voyage a la sienne (t.devise ; absente = euro, comme les anciens voyages) ── */
  const CURS = {EUR:'€', USD:'$', GBP:'£', CHF:'CHF', CAD:'CA$', AUD:'A$', NZD:'NZ$', JPY:'¥', CNY:'CN¥', SEK:'kr', NOK:'kr', DKK:'kr', PLN:'PLN', CZK:'CZK', HUF:'HUF', RON:'RON', MXN:'MX$', BRL:'R$', MAD:'MAD', TND:'TND', TRY:'TRY', AED:'AED', THB:'THB', INR:'INR', ZAR:'R', KRW:'KRW'};
  const REGION_CUR = {US:'USD', GB:'GBP', CH:'CHF', CA:'CAD', AU:'AUD', NZ:'NZD', JP:'JPY', CN:'CNY', SE:'SEK', NO:'NOK', DK:'DKK', PL:'PLN', CZ:'CZK', HU:'HUF', RO:'RON', MX:'MXN', BR:'BRL', MA:'MAD', TN:'TND', TR:'TRY', AE:'AED', TH:'THB', IN:'INR', ZA:'ZAR', KR:'KRW'};
  const curCode = () => { try { const t = trip(); if(t) return t.devise || 'EUR'; return (M && M.cur) || 'EUR'; } catch(e){ return 'EUR'; } };
  const CS = () => CURS[curCode()] || curCode();
  const eur = n => {
    const s = (Math.round(n*100)/100).toLocaleString((window.I18N ? I18N.locale : 'fr-FR'),{minimumFractionDigits:0,maximumFractionDigits:2}), c = CS();
    return (window.I18N && I18N.lang === 'en' && /^(\$|£|[A-Z]{1,2}\$|CN¥|¥)$/.test(c)) ? c + s : s + ' ' + c;
  };
  if(window.I18N) I18N.symFn = () => CS();
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

  const COLORS = ['#2f6fdb','#e0559a','#2e9e6a','#e8862e','#8a5cd6','#d64545','#1fa5b5','#b8902f','#5b6b2e','#c2410c','#0f766e','#7c3aed','#be185d','#15803d','#1d4ed8','#a16207'];
  const MAXP = 50;   // nombre maximum de compagnons (profils et voyageurs d'un voyage)
  // couleur libre pour un nouveau profil (les 16 de la palette, puis des teintes calculées)
  function nextColor(){
    const used = new Set(profiles().map(p=>(p.couleur||'').toLowerCase()));
    const free = COLORS.find(c=>!used.has(c)); if(free) return free;
    const h = (profiles().length * 137.508) % 360, l = .42, a = .55 * Math.min(l, 1-l);
    const f = n => { const k = (n + h/30) % 12; return Math.round(255*(l - a*Math.max(-1, Math.min(k-3, 9-k, 1)))).toString(16).padStart(2,'0'); };
    return '#' + f(0) + f(8) + f(4);
  }
  const CATS = {
    transport:{lbl:'Trajets',     one:'trajet',            icon:'✈️'},
    hotel:    {lbl:'Hébergements',one:'hébergement',       icon:'🏨'},
    activite: {lbl:'Visites & résas', one:'visite / réservation', icon:'🎟️'},
    divers:   {lbl:'Divers',      one:'dépense',           icon:'🧾'},
  };
  const MODE_ICON = {Avion:'✈️',Train:'🚆',Bus:'🚌',Bateau:'⛴️',Voiture:'🚗','Taxi / Uber':'🚕',Autre:'🧭'};
  const STATUTS = {todo:'À réserver', booked:'Réservé', paid:'Payé'};
  const NEXT = {todo:'booked', booked:'paid', paid:'todo'};
  const WISH = {
    weekend:{lbl:'Week-end',          icon:'🏖️'},
    voyage: {lbl:'Prochain voyage',   icon:'🌍'},
    etape:  {lbl:'Pour un voyage prévu', icon:'📍'},
    idee:   {lbl:'Idée en vrac',      icon:'💡'},
  };

  function defaults(){ return {items:[], days:{}, checklist:[], objectif:''}; }

  /* ══════════ Stockage ══════════ */
  let R = {};   // toutes les fiches, par id
  let M = {};   // réglages propres à ce téléphone
  function baseMeta(){ return {me:null, trip:null, tab:'prog', who:'all', filt:{}, envF:'all', envP:'all', dirty:[],
    sync:{url:'', code:'', on:false, since:0, last:0, err:''}}; }
  /* Rangement du carnet (B1) : le texte du carnet va dans la base du téléphone (IndexedDB, plusieurs centaines de Mo possibles),
     seuls les réglages restent dans le petit stockage local (≈ 5 Mo sur iPhone). Jamais pour la version hébergée dans un carnet,
     qui partage son stockage avec ce carnet. Si la base est indisponible : retour à l’ancien rangement, sans rien perdre. */
  const STORE_IDB = !window.VZ_HOST && typeof indexedDB !== 'undefined';
  const RDB = (() => {
    let p = null;
    const db = () => p || (p = new Promise((res, rej) => { const r = indexedDB.open('vz-carnet', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
    return {
      get: async k => { const d = await db(); return new Promise((res, rej) => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); },
      put: async (k, v) => { const d = await db(); return new Promise((res, rej) => { const tx = d.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); }); },
    };
  })();
  let storeIdb = false, storeLoading = false, storeBroken = false, storeReady = false;   // storeReady : carnet relu → seulement là on a le droit d’écrire
  async function loadStoreIdb(){
    try { const r = await RDB.get('R'); if(r && typeof r === 'object') R = r; }
    catch(e){   // jamais d’écriture d’un carnet vide par-dessus le vrai : on bloque et on prévient
      console.warn('carnet : lecture de la base impossible', e); persistOff = true; storeBroken = true;
      setTimeout(()=>alert(MSGT('Ton carnet n’a pas pu être lu sur ce téléphone. Ferme complètement l’appli puis rouvre-la : rien n’a été effacé.')), 1500); }
  }
  function loadStore(){
    try { const raw = localStorage.getItem(KEY); if(raw){ const o = JSON.parse(raw); R = o.records || {}; M = o.meta || {}; storeIdb = !!o.idb; } } catch(e){ R = {}; M = {}; }
    M = Object.assign(baseMeta(), M);
    M.sync = Object.assign(baseMeta().sync, M.sync || {});
    if(!Array.isArray(M.dirty)) M.dirty = [];
    storeReady = true;
  }
  // Enregistrement regroupé : plusieurs modifications d’affilée = une seule écriture (300 ms après la dernière).
  // Rien ne se perd : écrit tout de suite quand l’appli passe en arrière-plan, se ferme ou se recharge.
  let persistT = 0, persistOff = false, idbFail = 0;
  function persistLegacy(){
    try { localStorage.setItem(KEY, JSON.stringify({records:R, meta:M})); storeIdb = false; return true; }
    catch(e){ if(document.visibilityState !== 'hidden') alert('Sauvegarde impossible (stockage plein ou bloqué). Exporte tes données.'); return false; }
  }
  function persistNow(){
    clearTimeout(persistT); persistT = 0; if(persistOff || storeLoading || !storeReady) return Promise.resolve();   // 🛡️ jamais d’écriture avant d’avoir relu le carnet (sinon un carnet vide écraserait le vrai)
    if(!STORE_IDB){ persistLegacy(); return Promise.resolve(); }
    if(storeIdb){ try { localStorage.setItem(KEY, JSON.stringify({idb:1, meta:M})); } catch(e){} }   // réglages : tout de suite
    return RDB.put('R', R).then(()=>{   // le carnet : dans la base ; le petit stockage ne garde plus que les réglages
      if(persistOff) return;
      try { localStorage.setItem(KEY, JSON.stringify({idb:1, meta:M})); storeIdb = true; } catch(e){}
      idbFail = 0;
    }).catch(e=>{ console.warn('carnet : écriture dans la base interrompue', e);
      // 📱 appli fermée ou mise en arrière-plan pendant l’écriture (iPhone coupe la base) : ce n’est pas un stockage plein.
      // La version précédente reste intacte dans la base ; on réessaie au retour, sans message. Ancien rangement seulement si la base échoue vraiment.
      if(document.visibilityState === 'hidden' || ++idbFail < 3){ if(!persistT) persistT = setTimeout(persistNow, 2000); return; }
      idbFail = 0; persistLegacy(); });
  }
  function persist(){ if(persistOff || persistT || !storeReady) return; persistT = setTimeout(persistNow, 300); }
  ['pagehide', 'beforeunload'].forEach(ev=>addEventListener(ev, ()=>{ if(persistT) persistNow(); }));
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'hidden' && persistT) persistNow(); });
  let toastT;
  function toast(msg){
    if(msg === false) return;
    const t = document.getElementById('cv-toast'); if(!t) return;
    t.textContent = msg || '💾 Enregistré'; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(()=>t.classList.remove('show'), 1400);
  }

  /* ── Lecture ── */
  function list(type, f){ return Object.values(R).filter(r => r.type===type && !r.deleted && (!f || f(r))); }
  const prof = id => (R[id] && R[id].type==='profile' && !R[id].deleted) ? R[id] : null;
  try { if(/Android/i.test(navigator.userAgent || '')) document.documentElement.classList.add('vz-and'); } catch(e){}
  const pname = id => { const p = prof(id); return p ? p.nom : (R[id] ? R[id].nom || '?' : '?'); };
  const pcol = id => { const p = prof(id) || R[id]; return p && p.couleur ? p.couleur : '#999'; };
  const profiles = () => list('profile').sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  const trips = () => list('trip').sort((a,b)=>(a.debut||'9999').localeCompare(b.debut||'9999'));
  function trip(){ const t = R[M.trip]; return t && t.type==='trip' && !t.deleted ? t : null; }
  function tv(){ const t = trip(); const v = (t && t.voyageurs || []).filter(prof); return v.length ? v : (M.me ? [M.me] : []); }
  const items = f => list('item', r => r.trip===M.trip && (!f || f(r)));

  /* ── Écriture : chaque fiche garde qui l'a créée / modifiée ── */
  function stamp(r){
    const n = Date.now();
    if(!r.createdAt || r.createdAt < 1000){ r.createdAt = n; r.createdBy = M.me; }
    r.updatedAt = Math.max(n, (r.updatedAt||0) + 1);
    r.updatedBy = M.me;
  }
  /* Partage voyage par voyage : M.tripSpace = {idVoyage: code} (gardé sur ce téléphone seulement),
     M.spaces = [{code, since, dirty, last, err}]. Un voyage sans code propre suit le carnet principal (M.sync). */
  const TS = () => M.tripSpace || (M.tripSpace = {});
  const spaceObj = code => (M.spaces || (M.spaces = [])).find(x=>x.code===code);
  function targets(r){
    if(!r) return ['main'];
    const sp = id => { const c = TS()[id] || (/^ft:/.test(id) ? mateCode(id.slice(3)) : null); return c && spaceObj(c) ? c : null; };
    if(r.type==='feedtrip') return sp(r.id) ? [sp(r.id)] : [];
    if(/^ft:/.test(r.trip || '')) return sp(r.trip) ? [sp(r.trip)] : [];
    if(r.type==='trip') return [sp(r.id) || 'main'];
    if(r.trip) return [sp(r.trip) || 'main'];
    if(r.type==='profile'){ const out = new Set(['main']); Object.entries(TS()).forEach(([tid, c])=>{ const t = R[tid]; if(t && t.type === 'trip' && spaceObj(c) && ((t.voyageurs||[]).includes(r.id) || r.id === M.me)) out.add(c); }); return [...out]; }
    return ['main'];
  }
  function markDirty(id){
    const r = R[id]; if(r && r.demo) return;
    targets(r).forEach(t=>{ const L = t==='main' ? M.dirty : spaceObj(t).dirty || (spaceObj(t).dirty = []); if(!L.includes(id)) L.push(id);
      // un voyage partagé emporte les profils de ses voyageurs
      if(t !== 'main' && r && r.type==='trip') (r.voyageurs||[]).forEach(pid=>{ if(R[pid] && !L.includes(pid)) L.push(pid); }); });
  }
  const isDirty = id => M.dirty.includes(id) || (M.spaces||[]).some(x=>(x.dirty||[]).includes(id));
  // nouveau voyage créé ici (pas reçu, pas importé) : on demande avec qui on part, une fois l’écran du voyage affiché
  const newTripHook = r => { if(r && r.type === 'trip' && !R[r.id] && !r.createdAt && !r.demo && !r.deleted && r.src !== 'polarsteps' && !r.feed) setTimeout(()=>{ try { withWhom(r.id); } catch(e){} }, 1400); };
  function put(r, msg){ newTripHook(r); if(r.type==='trip' && !r.devise && !R[r.id]) r.devise = M.cur || 'EUR'; photoGone(R[r.id], r); stamp(r); R[r.id] = r; markDirty(r.id); persist(); toast(msg); queueSync(); return r; }
  function putMany(arr, msg){ arr.forEach(newTripHook); arr.forEach(r=>{ if(r.type==='trip' && !r.devise && !R[r.id]) r.devise = M.cur || 'EUR'; photoGone(R[r.id], r); stamp(r); R[r.id] = r; markDirty(r.id); }); persist(); toast(msg); queueSync(); }
  function drop(id, msg){ const r = R[id]; if(!r) return; r.deleted = true; put(r, msg || '🗑 Supprimé'); }
  const clone = o => JSON.parse(JSON.stringify(o));

  /* ── Affichage des personnes ── */
  const ini = id => `<span class="cv-ini" style="background:${pcol(id)}" title="${esc(pname(id))}">${esc((pname(id)[0]||'?').toUpperCase())}</span>`;
  const pchip = (id, extra) => `<span class="cv-pchip" style="--pc:${pcol(id)}"><span data-notr>${esc(pname(id))}</span>${extra||''}</span>`;
  // ♿ prénom en couleur : même teinte, assombrie jusqu’à un contraste de 4,5:1 sur fond clair (lisible)
  const pcolTxt = c => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c || '').trim()); if(!m) return c; let [r, g, b] = [0, 2, 4].map(i=>parseInt(m[1].slice(i, i + 2), 16));
    const lum = (r, g, b) => [r, g, b].map(x=>{ x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }).reduce((a, x, i)=>a + x * [.2126, .7152, .0722][i], 0);
    for(let k = 0; k < 20 && 1.05 / (lum(r, g, b) + .05) < 4.6; k++){ r *= .9; g *= .9; b *= .9; }
    return '#' + [r, g, b].map(x=>Math.round(x).toString(16).padStart(2, '0')).join(''); };
  const pname_c = id => `<b style="color:${pcolTxt(pcol(id))}">${esc(pname(id))}</b>`;
  function vzWhen(ts){
    const d = new Date(ts), n = new Date(), s = (n - d)/1000;
    const hm = d.toLocaleTimeString((window.I18N ? I18N.locale : 'fr-FR'),{hour:'2-digit',minute:'2-digit'});
    if(s < 60) return 'à l’instant';
    if(s < 3600) return 'il y a ' + Math.floor(s/60) + ' min';
    if(d.toDateString() === n.toDateString()) return 'aujourd’hui ' + hm;
    return d.toLocaleDateString((window.I18N ? I18N.locale : 'fr-FR'),{day:'numeric',month:'short'}) + ' ' + hm;
  }
  function byline(r){
    if(!r || !r.updatedBy || (r.updatedAt||0) < 1000) return '';
    if(r.imported && Math.abs((r.updatedAt||0) - (r.createdAt||0)) < 5000) return '';
    const created = r.createdBy && r.createdAt > 1000;
    let h = '';
    if(created && r.createdBy !== r.updatedBy) h = `ajouté par ${pname_c(r.createdBy)} · modifié par ${pname_c(r.updatedBy)}`;
    else if(created && Math.abs(r.updatedAt - r.createdAt) < 2000) h = `ajouté par ${pname_c(r.updatedBy)}`;
    else h = `modifié par ${pname_c(r.updatedBy)}`;
    return `<div class="cv-by">✎ ${h} · ${vzWhen(r.updatedAt)}</div>`;
  }

  /* ── Dates ── */
  const JOURS = (window.I18N && I18N.lang !== 'fr') ? [0,1,2,3,4,5,6].map(i=>new Intl.DateTimeFormat(I18N.locale, {weekday:'short'}).format(new Date(2024, 0, 7 + i))) : ['dim.','lun.','mar.','mer.','jeu.','ven.','sam.'];
  function fdate(iso){
    if(!iso) return '';
    const p = iso.split('-'); if(p.length!==3) return iso;
    const dt = new Date(+p[0], +p[1]-1, +p[2]);
    return JOURS[dt.getDay()] + ' ' + (+p[2]) + '/' + p[1];
  }
  function fshort(iso){ if(!iso) return ''; const p = iso.split('-'); return (+p[2]) + '/' + p[1]; }
  function nights(a,b){ if(!a||!b) return 0; const n = Math.round((new Date(b) - new Date(a))/86400000); return n>0 ? n : 0; }
  function range(a,b){
    const out = []; if(!a || !b || b < a) return out;
    const d = new Date(a + 'T12:00:00'), end = new Date(b + 'T12:00:00');
    while(d <= end && out.length < 90){ out.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+1); }
    return out;
  }
  function tripDates(t){
    if(!t || !t.debut) return '';
    const y = t.debut.slice(0,4);
    return t.fin ? `${fshort(t.debut)} → ${fshort(t.fin)}/${y}` : `${fshort(t.debut)}/${y}`;
  }

  /* ── Prix & partage ── */
  const hasPrix = it => String(it.prix ?? '').trim() !== '';
  const base = it => hasPrix(it) ? num(it.prix) : num(it.estime);
  const partage = it => it.partage || ((it.cat==='hotel' || /^Guide \+ chauffeur/.test(it.titre||'')) ? 'grp' : 'pp');
  function parts(it){ const all = tv(); const q = (it.qui||[]).filter(id => all.includes(id)); return q.length ? q : all; }
  const subset = it => parts(it).length < tv().length;
  function amount(it, kind){ return kind==='reel' ? num(it.prix) : kind==='est' ? num(it.estime) : base(it); }
  function totalOf(it, kind){ const b = amount(it, kind); return partage(it)==='pp' ? b * parts(it).length : b; }
  /* Qui prend en charge le coût : égal (défaut), une seule personne, ou montants/proportions perso */
  const chargeOf = it => (it.charge && it.charge.mode) ? it.charge : {mode:'egal'};
  const sumv = o => Object.values(o).reduce((a,b)=>a+b,0);
  function weights(pool, mode, one, map, coef){
    if(mode==='seul' && pool.includes(one)) return Object.fromEntries(pool.map(x=>[x, x===one?1:0]));
    if(mode==='perso'){ const w = Object.fromEntries(pool.map(x=>[x, Math.max(0, num((map||{})[x]))])); if(sumv(w) > 0) return w; }
    return Object.fromEntries(pool.map(x=>[x, coef ? tCoef(x) : 1]));   // parts du voyage (enfant 0,5…) pour les dépenses partagées
  }
  function shareOf(it, pid, kind){
    const c = chargeOf(it);
    if(c.mode === 'perso'){   // montants exacts en € ; le reste éventuel est partagé entre ceux sans montant
      const pool = parts(it), T0 = totalOf(it), T = totalOf(it, kind), ratio = T0 ? T / T0 : 1;
      const given = Object.fromEntries(Object.entries(c.parts||{}).filter(([k])=>pool.includes(k)).map(([k,v])=>[k, num(v)]));
      const rest = pool.filter(x=>!(x in given)), left = T0 - sumv(given);
      if(pid in given) return (given[pid] + (rest.length ? 0 : left / pool.length)) * ratio;
      return rest.includes(pid) ? Math.max(0, left) / rest.length * ratio : 0;
    }
    const w = weights(parts(it), c.mode === 'parts' ? 'perso' : c.mode, c.pid, c.parts, partage(it)!=='pp'), sw = sumv(w);
    return (sw && pid in w) ? totalOf(it, kind) * w[pid] / sw : 0;
  }
  /* Ce qui est déjà réglé : tout si « Payé », sinon les échéances cochées */
  function paidAmount(it){
    const T = totalOf(it); if(it.statut==='paid') return T;
    return Math.min(T, (it.echeances||[]).filter(e=>e.fait).reduce((s,e)=>s+num(e.montant),0));
  }
  const shareOfPaid = (it, pid) => { const T = totalOf(it); return T ? shareOf(it, pid) * paidAmount(it) / T : 0; };
  /* Qui a sorti l'argent : chacun sa part (défaut), une personne, ou montants perso */
  function advancedBy(it, pid){
    const P = paidAmount(it); if(!P) return 0;
    const py = it.payeur || 'chacun';
    if(py==='chacun') return shareOfPaid(it, pid);
    if(py==='perso'){ const w = weights(tv(), 'perso', null, it.payes), sw = sumv(w); return sw && pid in w ? P * w[pid] / sw : 0; }
    return pid===py ? P : 0;
  }
  function balances(){
    const all = items();
    const rb = rembs();
    return tv().map(pid => {
      const avance = all.reduce((s,i)=>s+advancedBy(i,pid),0), part = all.reduce((s,i)=>s+shareOfPaid(i,pid),0);
      const verse = rb.filter(x=>x.de===pid).reduce((s,x)=>s+num(x.montant),0), recu = rb.filter(x=>x.a===pid).reduce((s,x)=>s+num(x.montant),0);
      return {pid, avance, part, verse, recu, solde: avance - part + verse - recu};
    });
  }
  const rembs = () => list('remb', x=>x.trip===M.trip).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  async function rembAdd(de, a, v){
    const t = (await uiPrompt(`Montant remboursé par ${pname(de)} à ${pname(a)} (${CS()}) :`, String(Math.round(v*100)/100).replace('.',',')));
    if(t === null) return;
    const m = num(t); if(!(m > 0)){ alert('Montant invalide.'); return; }
    put({id:'rb'+uid(), type:'remb', trip:M.trip, de, a, montant:m, date:new Date().toISOString().slice(0,10)}, '💸 Remboursement noté');
    render();
  }
  async function rembDel(id){ const x = R[id]; if(!x || !(await uiConfirm(`Supprimer ce remboursement de ${eur(num(x.montant))} ?`))) return; drop(id); render(); }
  function settle(bal){
    const cr = bal.filter(b=>b.solde > 0.5).map(b=>({pid:b.pid, v:b.solde})).sort((a,b)=>b.v-a.v);
    const db = bal.filter(b=>b.solde < -0.5).map(b=>({pid:b.pid, v:-b.solde})).sort((a,b)=>b.v-a.v);
    const out = [];
    while(cr.length && db.length){
      const m = Math.min(cr[0].v, db[0].v); out.push({de:db[0].pid, a:cr[0].pid, v:m});
      cr[0].v -= m; db[0].v -= m; if(cr[0].v < 0.5) cr.shift(); if(db[0].v < 0.5) db.shift();
    }
    return out;
  }
  const forWho = it => M.who==='all' || parts(it).includes(M.who);

  function icon(it){ return it.cat==='transport' ? (MODE_ICON[it.mode]||'✈️') : (CATS[it.cat]||{icon:'•'}).icon; }
  function sortItems(a,b){
    const da = a.date||'9999', db = b.date||'9999';
    if(da!==db) return da<db?-1:1;
    return (a.heureDep||a.heure||'').localeCompare(b.heureDep||b.heure||'');
  }

  /* ══════════ Synchronisation ══════════ */
  let syncing = false, again = false, syncT = null;
  function apiUrl(){
    let u = (M.sync.url || '').trim();
    if(!u && /^https?:/.test(location.protocol)) u = location.origin;
    return u ? u.replace(/\/+$/,'') + '/api/sync' : '';
  }
  function queueSync(){ if(!M.sync.on && !(M.spaces||[]).length) return; syncDot(); clearTimeout(syncT);
    const wait = Math.max(3000, 15000 - (Date.now() - (typeof lastSyncAt === 'number' ? lastSyncAt : 0)));   // économe : modifs regroupées, 15 s mini entre deux synchros
    syncT = setTimeout(()=>syncNow(), wait); }
  /* ── Chiffrement de bout en bout (version publique) ──
     Le code du carnet ne quitte jamais le téléphone : le serveur reçoit seulement une empreinte
     (pour ranger les données) et des fiches/photos chiffrées en AES-256-GCM avec une clé tirée du code. */
  const E2E = window.VZ_HOST ? (()=>{ try { const h = JSON.parse(localStorage.getItem('vz_host') || 'null'); if(h && typeof h.e2e === 'boolean') return h.e2e; } catch(e){} return !/carnet-voyage-clf/.test(location.hostname); })() : PUBLIC;
  const te = new TextEncoder(), td = new TextDecoder();
  const hex = buf => [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
  const b64 = u8 => { let s = ''; for(let i=0;i<u8.length;i+=0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i+0x8000)); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), ch=>ch.charCodeAt(0));
  let ck = {};
  async function keys(code){
    code = code || M.sync.code;
    if(ck[code]) return ck[code];
    const base = await crypto.subtle.importKey('raw', te.encode(code), 'PBKDF2', false, ['deriveKey','deriveBits']);
    const key = await crypto.subtle.deriveKey({name:'PBKDF2', salt:te.encode('carnet-voyage/e2e/v1'), iterations:200000, hash:'SHA-256'}, base, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
    const hb = await crypto.subtle.deriveBits({name:'PBKDF2', salt:te.encode('carnet-voyage/ids/v1'), iterations:200000, hash:'SHA-256'}, base, 256);
    const hkey = await crypto.subtle.importKey('raw', hb, {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
    // empreinte envoyée au serveur : dérivée LENTEMENT du code (PBKDF2, 200 000 tours, comme la clé de chiffrement),
    // pour qu'une base volée ne permette pas d'essayer tous les codes à grande vitesse
    const token = window.VZ_HOST
      ? hex(await crypto.subtle.digest('SHA-256', te.encode('carnet-voyage/space/v1:' + code)))   // version test dans le carnet : même empreinte que le carnet
      : hex(await crypto.subtle.deriveBits({name:'PBKDF2', salt:te.encode('carnet-voyage/space/v2'), iterations:200000, hash:'SHA-256'}, base, 256));
    return ck[code] = {code, key, hkey, token};
  }
  async function authCode(code){ code = code || M.sync.code; return E2E ? (await keys(code)).token : code; }
  async function sid(id, code){ if(!E2E) return id; return 'x' + hex(await crypto.subtle.sign('HMAC', (await keys(code)).hkey, te.encode(id))).slice(0, 40); }
  async function seal(bytes, code){
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, (await keys(code)).key, bytes));
    const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return out;
  }
  async function unseal(u8, code){ return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM', iv:u8.slice(0,12)}, (await keys(code)).key, u8.slice(12))); }
  async function sealRec(r, code){ return {id: await sid(r.id, code), updatedAt: r.updatedAt, enc: b64(await seal(te.encode(JSON.stringify(slim(r))), code))}; }
  async function openRec(x, code){ if(!x || !x.enc) return E2E ? null : x; try { return JSON.parse(td.decode(await unseal(unb64(x.enc), code))); } catch(e){ return null; } }
  // Bandeau « chiffrement en cours » (version publique) : montre que les données partent chiffrées
  let cbT = null, cbSince = 0;
  function cryptShow(txt){
    if(!E2E) return; const el = document.getElementById('cv-crypt'); if(!el) return;
    clearTimeout(cbT); el.textContent = txt; el.classList.add('show'); if(!cbSince) cbSince = Date.now();
  }
  function cryptHide(doneTxt){
    if(!E2E) return; const el = document.getElementById('cv-crypt'); if(!el) return;
    if(doneTxt) el.textContent = doneTxt;
    const wait = /^[⚠⏳]/.test(doneTxt || '') ? 9000 : Math.max(doneTxt ? 1800 : 0, 1200 - (Date.now() - cbSince));
    clearTimeout(cbT); cbT = setTimeout(()=>{ el.classList.remove('show'); cbSince = 0; }, wait);
  }

  async function call(since, changes, code){
    const url = apiUrl(); if(!url) throw new Error('Adresse du serveur inconnue');
    const orig = changes;
    changes = E2E ? await Promise.all(changes.map(r=>sealRec(r, code))) : changes.map(slim);
    const res = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json','X-Carnet-Code':await authCode(code)}, body:JSON.stringify({since, changes})});
    let j = {}; try { j = await res.json(); } catch(e){}
    if(res.status === 429){ M.syncPause = Date.now() + Math.min(3600, Math.max(60, +j.retry || 600)) * 1000; persist(); }
    if(!res.ok) throw new Error(j.error || ('Erreur serveur ' + res.status));
    if(!Array.isArray(j.records)) throw new Error('Réponse inattendue du serveur');
    if(E2E) j.records = (await Promise.all(j.records.map(x=>openRec(x, code)))).filter(Boolean);
    if(code) try { j.records.forEach(r=>{ if(!r || r.type !== 'feedtrip') return; const k = r.id + '|' + code;   // 🔗 même voyage suivi par 2 liens : l’âge de chacun (voir ftPick)
      if(r.deleted){ if(M.ftAt) delete M.ftAt[k]; } else if(!FT()[String(r.id).slice(3)]) (M.ftAt || (M.ftAt = {}))[k] = (r.updatedAt || 0) + (r.link === code ? 1e12 : 0); }); } catch(e){}   // link : le lien où l’auteur publie aujourd’hui
    try { if(orig.length) pushNote(orig, code || M.sync.code); } catch(e){}
    try { if(j.wiped) wipeCheck(code, j.wiped, since); } catch(e){}
    return j;
  }
  /* 🗑 Un compagnon a vidé le serveur d’un voyage partagé (ou du carnet commun) : ce téléphone a encore tout ce qu’il a vu.
     On propose de le remettre en ligne pour tout le monde. Jamais pour un voyage suivi en abonné (il n’est pas à nous). */
  const wipeQ = [];
  function wipeCheck(code, at, since){
    const main = !code || code === M.sync.code, sp = main ? M.sync : spaceObj(code); if(!sp) return;
    if(at <= (sp.wipeSeen || 0)) return;
    sp.wipeSeen = at; persist();
    if(!(since > 0 && since < at)) return;          // premier passage ou c’est nous qui venons d’effacer : rien à proposer
    const tid = main ? '' : Object.keys(TS()).find(k=>TS()[k] === code && R[k] && R[k].type === 'trip' && !R[k].deleted);
    if(!main && !tid) return;
    if(!wipeQ.some(x=>x.tid === tid)) wipeQ.push({tid});
    setTimeout(wipeAskNext, 1500);
  }
  let wipeAsking = false;
  async function wipeAskNext(){
    if(wipeAsking || !wipeQ.length) return; wipeAsking = true;
    const {tid} = wipeQ.shift(), T = x => (window.I18N && I18N.msg ? I18N.msg(x) : x);
    try {
      const msg = tid ? T('🗑 Le voyage « {0} » a été vidé du serveur (par un compagnon ou un autre de tes appareils).\n\nTon téléphone a encore tout ce que tu as vu : fiches et photos. Le remettre en ligne pour tout le monde ?').replace('{0}', (R[tid] && R[tid].titre) || '')
                      : T('🗑 Ton carnet commun a été vidé du serveur (par une personne qui a le code ou un autre de tes appareils).\n\nTon téléphone a encore tout ce que tu as vu : fiches et photos. Le remettre en ligne pour tout le monde ?');
      if(await uiConfirm(msg)){ await photoResend(tid || undefined); toast('📤 Remise en ligne en cours…'); }
    } catch(e){}
    wipeAsking = false; if(wipeQ.length) setTimeout(wipeAskNext, 800);
  }
  // voyage partagé rejoint (ou rejoint de nouveau) : les fiches que j’avais retirées de MON téléphone en le quittant
  // ne doivent pas rester « supprimées » : on efface ces traces locales, le dossier partagé fait foi
  function tombClear(tid){
    let n = 0; const sc = TS()[tid];
    Object.keys(R).forEach(id=>{ const r = R[id]; if(r && r.deleted && (r.id === tid || r.trip === tid) && r.type !== 'member'){ delete R[id]; n++;
      M.dirty = M.dirty.filter(x=>x !== id); (M.spaces||[]).forEach(sp=>{ if(sp.dirty) sp.dirty = sp.dirty.filter(x=>x !== id); }); } });
    if(M.left) delete M.left[tid];
    return n;
  }
  // réparation des téléphones déjà touchés : voyage quitté puis rejoint avant ce correctif
  function rejoinFix(){
    const L = M.left || {}; let n = 0;
    Object.keys(L).forEach(tid=>{ const sp = TS()[tid] && spaceObj(TS()[tid]); if(!sp) return; n += tombClear(tid); sp.since = 0; });
    if(n) persist();
    return n;
  }
  // 🔄 Synchro d’un voyage partagé : ce que ce téléphone a, ce que le dossier partagé contient, et les deux réparations
  function tripCount(id){ const all = Object.values(R).filter(r=>r && r.trip === id && !['member','invite','tripmove','phk'].includes(r.type)); const live = all.filter(r=>!r.deleted); return {live:live.length, dead:all.length - live.length, items:live.filter(r=>r.type==='item').length, days:live.filter(r=>r.type==='day').length}; }
  function tripSyncSheet(id){
    const t = R[id], c = TS()[id], sp = c && spaceObj(c); if(!t || !sp) return;
    const n = tripCount(id), mine = !t.createdBy || t.createdBy === M.me;
    openSheet(`<h2>🔄 Synchro du voyage</h2><div class="v-sum-small" style="margin-bottom:8px" data-notr>${esc(t.titre)}</div>
      <div class="sy-diag"><div><span>Sur ce téléphone</span><b>${n.live}</b><small><span>fiches</span> · <span data-notr>${n.items}</span> <span>résas</span> · <span data-notr>${n.days}</span> <span>jours</span></small></div>
        <div><span>État</span><b>${sp.err ? '🔴' : (sp.dirty||[]).length ? '🟠' : '🟢'}</b><small>${sp.err ? `<span data-notr>${esc(sp.err)}</span>` : (sp.dirty||[]).length ? `<span data-notr>${sp.dirty.length}</span> <span>en attente d’envoi</span>` : sp.last ? `<span>à jour</span> · <span data-notr>${vzWhen(sp.last)}</span>` : '<span>jamais synchronisé</span>'}</small></div></div>
      <div id="sy-res" class="v-sum-small" style="margin:8px 0"></div>
      <button type="button" class="v-btn" onclick="CV.tripPullAll('${id}')">📥 Tout récupérer depuis le voyage partagé</button>
      <div class="v-sum-small" style="margin:4px 0 10px">Recharge tout le voyage tel qu’il est chez les autres. Rien n’est effacé chez eux.</div>
      <button type="button" class="v-btn sec" onclick="CV.tripPushAll('${id}')">📤 Tout renvoyer depuis ce téléphone</button>
      <div class="v-sum-small" style="margin:4px 0 10px">${mine ? 'À faire sur le téléphone de celui qui a rempli le voyage : toutes ses fiches et photos repartent vers les compagnons.' : 'Renvoie tes fiches et tes photos vers le voyage partagé.'}</div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  async function tripPullAll(id){
    const c = TS()[id], sp = c && spaceObj(c), out = document.getElementById('sy-res'); if(!sp) return;
    if(out) out.textContent = MSGT('Je récupère le voyage…');
    try {
      tombClear(id); TS()[id] = c;
      const j = await call(0, [], c), of = j.records.filter(r=>r && r.trip === id && !['member','invite','tripmove'].includes(r.type));
      mergeRemote(j.records); sp.since = j.now; sp.err = ''; sp.last = Date.now(); persist(); refresh();
      const n = tripCount(id);
      if(out) out.innerHTML = `✅ ${MSGT('Le voyage partagé contient')} <b>${of.filter(r=>!r.deleted).length}</b> ${MSGT('fiches')} · ${MSGT('ce téléphone en a maintenant')} <b>${n.live}</b>.`
        + (of.filter(r=>!r.deleted).length < 3 ? '<br>⚠️ ' + MSGT('Le voyage partagé est presque vide : celui qui l’a rempli doit toucher « Tout renvoyer » sur son téléphone.') : '');
    } catch(e){ if(out) out.textContent = '⚠️ ' + (e.message || e); }
  }
  async function tripPushAll(id){
    const out = document.getElementById('sy-res'); if(out) out.textContent = MSGT('J’envoie tout le voyage…');
    try { await photoResend(id); await syncNow(true); const sp = spaceObj(TS()[id]);
      if(out) out.innerHTML = sp && sp.err ? '⚠️ ' + esc(sp.err) : `✅ ${MSGT('Voyage renvoyé :')} <b>${tripCount(id).live}</b> ${MSGT('fiches')}. ${MSGT('Les compagnons le reçoivent à leur prochaine synchro.')}`; }
    catch(e){ if(out) out.textContent = '⚠️ ' + (e.message || e); }
  }
  function mergeRemote(records, fromMain){
    let changed = 0;
    for(const r of records){
      if(!r || !r.id) continue;
      if(M.hide && (M.hide[r.id] || (r.trip && M.hide[r.trip]) || (r.type === 'moved' && M.hide[r.tid]))) continue;   // 🧹 voyage retiré de ce téléphone (arrivé par erreur) : il ne revient pas
      // depuis MON carnet principal : une suppression d’une fiche d’un voyage partagé ne compte pas (le dossier partagé fait foi)
      if(fromMain && r.deleted && r.trip && TS()[r.trip] && spaceObj(TS()[r.trip]) && R[r.id] && !R[r.id].deleted) continue;
      const l = R[r.id];
      if(l && isDirty(r.id) && (l.updatedAt||0) > (r.updatedAt||0)) continue;
      if(!l || (r.updatedAt||0) > (l.updatedAt||0)){ R[r.id] = r; changed++; }
    }
    return changed;
  }
  async function syncSpace(sp, force){
    sp.dirty = sp.dirty || []; let changed = 0;
    try {
      const ids = [...sp.dirty]; let first = true;
      for(let i = 0; first || i < ids.length; i += 500){
        first = false;
        const chunk = ids.slice(i, i+500).map(id => R[id]).filter(Boolean);
        const sent = {}; chunk.forEach(c => sent[c.id] = c.updatedAt);
        const j = await call(Math.max(0, (sp.since||0) - 5000), chunk, sp.code);
        sp.dirty = sp.dirty.filter(id => !(id in sent) || (R[id] && R[id].updatedAt !== sent[id]));
        j.records.forEach(r=>{ if(r && force && r.type==='trip' && M.hide && M.hide[r.id]){ delete M.hide[r.id]; if(M.left) delete M.left[r.id]; if(M.mvSkip) delete M.mvSkip[r.id]; }   // rejoint exprès : un voyage retiré revient
          // 👀 voyage publié que je fais AUSSI en compagnon : je l'ai déjà en entier, pas besoin de le suivre en abonné (ex. Claire suit le carnet de Tony
          // sans revoir les voyages faits ensemble). S'il quitte un jour mes voyages, il redevient suivable.
          if(r && r.type==='feedtrip' && !r.deleted){ const tid = String(r.id).slice(3), own = R[tid] && R[tid].type === 'trip' && !R[tid].deleted && !R[tid].demo && !FT()[tid] && !(typeof ownFt === 'function' && ownFt(r)), un = M.unfol || (M.unfol = {});
            if(own){ un[r.id] = 2; if(TS()[r.id] === sp.code) delete TS()[r.id]; M._mateSkip = (M._mateSkip || 0) + 1; return; }
            if(un[r.id] === 2) delete un[r.id]; }
          if(r && (r.type==='trip' || r.type==='feedtrip') && !(M.hide && M.hide[r.id]) && (force || !TS()[r.id]) && !(r.type==='feedtrip' && (M.unfol||{})[r.id] && !force)){ if(r.type==='trip' && !TS()[r.id]) tombClear(r.id); TS()[r.id] = sp.code; }
          if(r && (r.type==='feedgrant' || r.type==='packtrip') && r.trip && !TS()[r.trip] && (M.unfol || {})[r.trip] !== 2) TS()[r.trip] = sp.code; });
        changed += mergeRemote(j.records); sp.since = j.now;
      }
      sp.last = Date.now(); sp.err = '';
      mateFeedTidy(); ftPick();
    } catch(e){ sp.err = e.message || String(e); }
    return changed;
  }
  // 👀 voyages suivis en abonné que je fais AUSSI en compagnon : retirés de « Je suis » (je les ai déjà en entier), et je ne compte plus
  // comme abonné de ce voyage chez l'auteur. Quel que soit le chemin par lequel ils sont arrivés (lien, autorisation, ancienne version…).
  // 🔗 un voyage suivi par DEUX liens (ancien lien resté en ligne + lien actuel de l’auteur) : on garde celui où l’auteur publie encore
  // (fiche du voyage la plus récente). Les commentaires et ❤️ partent alors chez lui, les notifications aussi. L’auteur est prévenu de
  // l’ancien lien (fiche « oldlink » sur le lien actuel) : son téléphone y récupère les commentaires et fait passer les abonnés restés dessus.
  function ftPick(){
    const at = M.ftAt; if(!at) return 0; const best = {}, sent = M.olSent || (M.olSent = {}); let n = 0;
    const parts = k => { const i = k.lastIndexOf('|'); return [k.slice(0, i), k.slice(i + 1)]; };
    Object.entries(at).forEach(([k, v])=>{ const [id, c] = parts(k); if(Date.now() - (v % 1e12) > 400 * 864e5 && !spaceObj(c)){ delete at[k]; return; }
      if(spaceObj(c) && (!best[id] || v > best[id][1])) best[id] = [c, v]; });
    Object.entries(best).forEach(([id, [c, v]])=>{ const cur = TS()[id], tid = id.slice(3); if(!cur || cur === c || FT()[tid] || (M.unfol || {})[id]) return;
      const v0 = at[id + '|' + cur]; if(v0 == null || v - v0 < 1000) return;
      TS()[id] = c; n++;
      // mes ❤️ et commentaires restés sur l’ancien lien : renvoyés sur le bon
      Object.values(R).filter(x=>x && !x.deleted && x.trip === id && (x.type === 'comment' || x.type === 'like' || x.type === 'follower') && (x.dev === devId() || String(x.id).endsWith(':' + devId()))).forEach(x=>markDirty(x.id)); });
    // l’auteur est prévenu des anciens liens encore en ligne (une fois par lien), même si ce téléphone les a quittés
    Object.entries(at).forEach(([k, v])=>{ const [id, c] = parts(k), tid = id.slice(3), cur = TS()[id], vc = at[id + '|' + cur];
      if(!cur || c === cur || vc == null || vc - v < 1000 || sent[k] || FT()[tid] || !spaceObj(cur)) return; sent[k] = 1; n++;
      try { putQuiet([{id:'ol:' + tid + ':' + c, type:'oldlink', trip:id, code:c, dev:devId()}]); } catch(e){} });
    if(n){ persist(); try { pushRegister(true); } catch(e){} }
    return n;
  }
  function mateFeedTidy(){
    let n = 0; const un = M.unfol || (M.unfol = {}), me = devId();
    Object.keys(TS()).filter(k=>/^ft:/.test(k)).forEach(k=>{ const tid = k.slice(3), t = R[tid], ft = R[k];
      if(!(t && t.type === 'trip' && !t.deleted && !t.demo) || FT()[tid] || (ft && typeof ownFt === 'function' && ownFt(ft))) return;
      delete TS()[k]; un[k] = 2; n++;
      const fw = R['fw:' + k + ':' + me]; if(fw && !fw.deleted) putQuiet([Object.assign(clone(fw), {deleted:true})]); });
    if(n) persist(); return n;
  }
  /* Synchro automatique : une fois par heure (+ à l'ouverture, + juste après chaque modification). Pour plus vite : bouton « Synchroniser maintenant ». */
  const liveShared = () => { try { return trips().some(t=>tripPhase(t)==='live' && !t.demo && (TS()[t.id] || (M.sync && M.sync.on))) || list('feedtrip', f=>TS()[f.id] && tripPhase(f)==='live').length > 0; } catch(e){ return false; } };
  var AUTO_SYNC = 3600000, pollGap = AUTO_SYNC, lastSyncAt = 0;
  async function syncNow(manual){
    if(storeLoading || storeBroken) return;   // carnet pas encore lu depuis la base
    const pull = manual === 'pull'; if(pull) manual = false;   // « pull » : aller chercher les nouveautés tout de suite (notification touchée), sans message
    if(manual === true){ M.pqPause = 0; M.pqFull = {}; }   // « Synchroniser » à la main : on réessaie d’envoyer les photos tout de suite
    if(!M.ftScan1 && (M.spaces||[]).length){ M.ftScan1 = 1; const own = new Set(Object.values(FT())), tsp = new Set(Object.entries(TS()).filter(([k])=>R[k] && R[k].type === 'trip').map(([, c])=>c));   // une fois : relire les liens abonnés en entier (voir ftPick)
      (M.spaces||[]).forEach(sp=>{ if(!own.has(sp.code) && !tsp.has(sp.code) && sp.code !== M.ib) sp.since = 0; }); }
    try { mateFeedSync(); } catch(e){}   // codes abonnés des voyages communs publiés par un compagnon
    fkLive();
    const mainOn = !!(M.sync.on && M.sync.code);
    if(!mainOn && !(M.spaces||[]).length) return;
    if(manual !== true && !pull && M.syncPause && Date.now() < M.syncPause) return;   // pause demandée par le serveur (trop de synchros)
    if(syncing){ again = true; return; }
    syncing = true; syncDot();
    const showC = E2E && !!manual;
    if(showC) cryptShow('🔐 Chiffrement de tes données en cours…');
    let changed = 0; const hadDirty = M.dirty.length;
    try {
      const now0 = Date.now(), auto = manual !== true && !pull;
      try { rejoinFix(); mvMark(); mbTouch(); fwKeyTouch().catch(()=>{}); if((M.hideQ || []).length) hideFlush(); } catch(e){}
      if(mainOn && !(auto && !M.dirty.length && now0 - (M.sync.last || 0) < 120000)){   // rien à envoyer et vu il y a moins de 2 min : on passe
      const ids = [...M.dirty];
      let first = true;
      for(let i = 0; first || i < ids.length; i += 500){
        first = false;
        const chunk = ids.slice(i, i+500).map(id => R[id]).filter(Boolean);
        const sent = {}; chunk.forEach(c => sent[c.id] = c.updatedAt);
        const j = await call(Math.max(0, (M.sync.since||0) - 5000), chunk);
        M.dirty = M.dirty.filter(id => !(id in sent) || (R[id] && R[id].updatedAt !== sent[id]));
        changed += mergeRemote(j.records, true);
        M.sync.since = j.now;
      }
      M.sync.last = Date.now(); M.sync.err = '';
      }
      for(const sp of (M.spaces||[])){
        // carnets sans modif à envoyer : 5 min mini entre deux passages (15 min pour les voyages suivis en abonné)
        const fol = list('feedtrip', f=>TS()[f.id] === sp.code).length && !Object.values(FT()).includes(sp.code);
        if(auto && !(sp.dirty || []).length && sp.last && now0 - sp.last < (fol ? 900000 : 300000)) continue;
        changed += await syncSpace(sp); }
      try { if(movedApply()) changed++; } catch(e){}
      feedMoveCheck().catch(()=>{}); feedGrantCheck().catch(()=>{}); feedOldWipe().catch(()=>{});
      try { mateFeedSync(); } catch(e){}
      try { if(await packApply()) { changed++; setTimeout(()=>{ try { syncNow(); } catch(e){} }, 800); } await tripMoveCheck(); linksScan(); inviteCheck().catch(()=>{}); } catch(e){}
      setTimeout(()=>{ tripExtract().catch(()=>{}); }, 20000);
      if(showC) cryptHide('🔒 Données chiffrées et synchronisées');
      else if(manual) toast('☁️ Synchronisé');
      setTimeout(uploadQueue, 100); setTimeout(feedUpload, 1500); setTimeout(()=>{ potGc().catch(()=>{}); }, 4000); setTimeout(()=>{ pubMapSync().catch(()=>{}); }, 6000); setTimeout(()=>{ potAuto().catch(()=>{}); }, 20000);
    } catch(e){
      M.sync.err = e.message || String(e);
      if(showC) cryptHide();
      if(manual) alert('Synchro impossible : ' + M.sync.err);
    }
    persist(); syncing = false; syncDot();
    lastSyncAt = Date.now();
    pollGap = M.sync.err ? 300000 : liveShared() ? 300000 : AUTO_SYNC;   // voyage en cours partagé : toutes les 5 min, pour voir où sont les autres   // en cas d'erreur on réessaie dans 5 min, sinon dans 1 h
    softRefresh(changed);
    if(PU().on) setTimeout(()=>{ pushRegister().catch(()=>{}); pushPlan().catch(()=>{}); }, 2500);
    if(again){ again = false; syncNow(); }
  }
  /* ══════════ 🔔 Notifications (Web Push) ══════════
     Chacun choisit ce qu’il reçoit (Plus → ⚙️ Réglages). Le texte part chiffré avec la clé du voyage :
     le serveur ne le lit pas, il le transmet seulement ; le téléphone qui le reçoit le déchiffre et l’écrit
     dans SA langue. Les rappels (départ, enregistrement en ligne, échéances) sont programmés par ce
     téléphone pour lui seul, chiffrés avec sa propre clé. */
  const PUSH_KINDS = [['depense','💶','Dépenses et remboursements'], ['resa','🗓️','Réservations et programme'], ['souv','📸','Souvenirs et photos'],
    ['sondage','🗳️','Sondages'], ['notes','🛒','Courses et notes'], ['social','💬','Abonnés : commentaires, ❤️ et nouveaux abonnés'], ['suivi','👀','Voyages que je suis : nouvelles étapes et photos'], ['rappel','⏰','Rappels : départ, enregistrement en ligne, échéances'], ['soir','🌙','Le soir en voyage : « raconte ta journée » et souvenirs « il y a un an »']];
  const PUSH_TPL = {soc_iv:'📩 {0} t’invite dans le voyage « {1} »', soc_ivf:'📩 {0} te propose de suivre « {1} »', soc_iva:'✅ {0} a rejoint « {1} »', soc_ivr:'✕ {0} a refusé l’invitation : « {1} »', soc_cm:'💬 {0} a commenté : « {1} »', soc_lk:'❤️ {0} aime ta publication : {1}', soc_fw:'👀 {0} suit maintenant ton voyage', fb_social:'Du nouveau chez tes abonnés', depense1:'{0} a ajouté une dépense : {1}', depenseN:'{0} a ajouté {1} dépenses', remb:'{0} a enregistré un remboursement : {1}',
    resa1:'{0} a ajouté au programme : {1}', resaN:'{0} a ajouté {1} éléments au programme', resaCh:'{0} a changé l’horaire : {1}',
    souv1:'{0} a ajouté un souvenir : {1}', souvN:'{0} a ajouté {1} souvenirs', sondage:'{0} lance un sondage : {1}',
    notes1:'{0} a ajouté aux courses : {1}', notesN:'{0} a ajouté {1} articles aux courses', note:'{0} a ajouté une note : {1}',
    depart:'Demain : départ pour {0}', checkin:'Enregistrement en ligne ouvert : {0}', resaopen:'⏰ Les réservations ouvrent bientôt : {0}', echeance:'Échéance de paiement aujourd’hui : {0}',
    soir:'Comment s’est passée ta journée ? Ajoute tes photos et quelques mots à ton carnet 📸', anniv1:'Il y a un an, tu partais : « {0} » ✨', annivN:'Il y a {1} ans, tu partais : « {0} » ✨', 
    test:'Les notifications fonctionnent sur ce téléphone.', fb:'Du nouveau dans ton voyage', someone:'Quelqu’un', grp:'{0} nouveautés', fb_depense:'Nouvelle dépense dans ton voyage', fb_resa:'Le programme du voyage a changé', fb_souv:'Nouveau souvenir dans ton voyage', fb_sondage:'Nouveau sondage dans ton voyage', fb_notes:'Nouveautés dans les courses et les notes', fb_rappel:'Rappel pour ton voyage', fol1:'📸 {0} a publié une nouvelle étape : {1}', folN:'📸 {0} a publié {1} nouvelles étapes'};
  const PU = () => { const p = M.push || (M.push = {on:false, quiet:true}); p.kinds = Object.assign({depense:1, resa:1, souv:1, sondage:1, notes:1, rappel:1, soir:1, social:1, suivi:1}, p.kinds || {}); return p; };
  const pushApi = () => { const u = apiUrl(); return u ? u.replace(/\/api\/sync$/, '/api/push') : ''; };
  const pushOk = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!pushApi();
  const isIOSDev = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standaloneApp = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch(e){ return false; } };
  const pushDevCode = () => M.pushCode || (M.pushCode = 'dv-' + uid() + uid());
  const b64url = u8 => b64(u8).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const unb64url = s => { s = String(s).replace(/-/g,'+').replace(/_/g,'/'); while(s.length % 4) s += '='; return unb64(s); };
  // petite base IndexedDB partagée avec le service worker : clés des voyages (non exportables), textes traduits, compteur
  function pushDb(){ return new Promise((res, rej)=>{ const q = indexedDB.open('vz-push', 1); q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
  async function pushKv(k, v){ const db = await pushDb(); return new Promise((res, rej)=>{ const tx = db.transaction('kv', v === undefined ? 'readonly' : 'readwrite'), st = tx.objectStore('kv');
    const q = v === undefined ? st.get(k) : v === null ? st.delete(k) : st.put(v, k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
  // espaces partagés de CE téléphone : le carnet principal et les voyages partagés avec leur propre code (pas les abonnés)
  function pushSpaces(){
    const P = PU(), want = PUSH_KINDS.map(k=>k[0]).filter(k=>k !== 'rappel' && k !== 'suivi' && P.kinds[k]), codes = new Set();
    if(M.sync.on && M.sync.code) codes.add(M.sync.code);
    Object.entries(TS()).forEach(([tid, c])=>{ if(c && spaceObj(c) && R[tid] && R[tid].type === 'trip') codes.add(c); });
    const feeds = P.kinds.social ? [...new Set([...Object.values(FT()).filter(Boolean), ...trips().map(t=>mateCode(t.id)).filter(Boolean)])] : [];
    // 👀 voyages que je suis (pas les miens) : prévenu quand le voyageur publie une étape (envoyé en « souv » sur le lien abonnés)
    const mineF = new Set(Object.values(FT()).filter(Boolean)), fol = new Set();
    if(P.kinds.suivi) list('feedtrip', f=>!f.deleted && TS()[f.id] && !FT()[String(f.id).replace(/^ft:/,'')] && !(M.unfol||{})[f.id]).forEach(f=>{ const c = TS()[f.id]; if(c && !mineF.has(c) && !codes.has(c) && spaceObj(c)) fol.add(c); });
    const ib = M.ib && spaceObj(M.ib) ? [{code:M.ib, kinds:['social']}] : [];   // ma boîte aux lettres : invitations et réponses, toujours
    return [...codes].map(code=>({code, kinds:want.filter(k=>k !== 'social')})).concat(feeds.map(code=>({code, kinds:['social']}))).concat([...fol].map(code=>({code, kinds:['souv']}))).concat(ib).concat([{code:pushDevCode(), kinds:['rappel'], dev:true}]);
  }
  // 🔔 l’auteur est prévenu quand un abonné commente, aime ou commence à suivre (même un abonné sans l’appli)
  async function socialPush(ftid, s, x, to){
    try {
      const code = to || TS()[ftid] || mateCode(String(ftid).replace(/^ft:/, '')); if(!code || !pushApi()) return;
      const ft = R[ftid] || {}, tid = String(ftid).replace(/^ft:/, ''), kk = await keys(code), kid = kk.token.slice(0, 16);
      const p = {k:'social', who: myName() || 'Un proche', trip: tid, tt: ft.titre || '', it:[{s, x: String(x || '').slice(0, 120)}], n:1};
      const msg = b64(await seal(te.encode(JSON.stringify(p)), code));
      await pushPost(code, {a:'send', kind:'social', kid, msg, tag:'social-' + tid});
    } catch(e){}
  }
  async function pushPost(code, body){
    const r = await fetch(pushApi(), {method:'POST', headers:{'Content-Type':'application/json', 'X-Carnet-Code':await authCode(code)}, body:JSON.stringify(Object.assign({dev:devId()}, body))});
    let j = {}; try { j = await r.json(); } catch(e){} if(!r.ok) throw new Error(j.error || ('Erreur serveur ' + r.status)); return j;
  }
  async function pushSub(){
    const reg = await navigator.serviceWorker.ready;
    const pub = (await (await fetch(pushApi() + '?a=key')).json()).pub;
    let sub = await reg.pushManager.getSubscription();
    try { if(sub && sub.options && sub.options.applicationServerKey && b64url(new Uint8Array(sub.options.applicationServerKey)) !== pub){ await sub.unsubscribe(); sub = null; } } catch(e){}
    if(!sub) sub = await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:unb64url(pub)});
    return sub;
  }
  // enregistre (ou met à jour) l’abonnement de ce téléphone dans chacun de ses espaces
  async function pushRegister(force){
    const P = PU(); if(!P.on || !pushOk() || Notification.permission !== 'granted') return;
    const sub = await pushSub(), sj = sub.toJSON(), spaces = pushSpaces();
    const tz = (()=>{ try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e){ return ''; } })();
    const sig = JSON.stringify([sj.endpoint, spaces.map(s=>[s.code.slice(0,6), s.kinds]), P.quiet, tz, (window.I18N && I18N.lang) || 'fr']);
    if(!force && sig === P.sig && Date.now() - (P.regAt||0) < 7*864e5) return;
    const tpl = {}; Object.entries(PUSH_TPL).forEach(([k, s])=>tpl[k] = window.I18N && I18N.tr ? I18N.tr(s) : s);
    await pushKv('tpl', tpl);
    const toks = {};
    // ce téléphone d’abord (rappels et essai), puis chaque voyage : un voyage en erreur ne bloque pas les autres
    let err = null;
    for(const s of spaces.slice().sort((a, b)=>(b.dev ? 1 : 0) - (a.dev ? 1 : 0))){
      try {
        const kk = await keys(s.code), kid = await pushKeyStore(s.code); toks[kk.token] = 1;
        await pushPost(s.code, {a:'sub', sub:sj, kinds:s.kinds, tz, quiet:!!P.quiet});
      } catch(e){ if(s.dev) throw e; err = e; }
    }
    if(err){ console.warn("push sub", err); P.toks = Object.assign(P.toks || {}, toks); persist(); return; }
    // espaces quittés depuis (voyage plus partagé) : on se désabonne
    for(const tk of Object.keys(P.toks || {})) if(!toks[tk]) fetch(pushApi(), {method:'POST', headers:{'Content-Type':'application/json', 'X-Carnet-Code':tk}, body:JSON.stringify({a:'unsub', dev:devId()})}).catch(()=>{});
    P.toks = toks; P.sig = sig; P.regAt = Date.now(); persist();
  }
  // Safari (iPhone) ne relit pas dans le service worker une CryptoKey rangée par la page : on y range aussi la clé brute
  // (même dérivation que keys() : PBKDF2 200 000 tours → 256 bits = la clé AES-GCM du voyage)
  const pushRaw = {};
  async function pushKeyStore(code){
    const kk = await keys(code), kid = kk.token.slice(0, 16);
    await pushKv('k:' + kid, kk.key);
    if(isIOSDev){
      if(!pushRaw[code]){ const base = await crypto.subtle.importKey('raw', te.encode(code), 'PBKDF2', false, ['deriveBits']);
        pushRaw[code] = new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2', salt:te.encode('carnet-voyage/e2e/v1'), iterations:200000, hash:'SHA-256'}, base, 256)); }
      await pushKv('r:' + kid, pushRaw[code]);
    }
    return kid;
  }
  async function pushTog(on){
    const P = PU();
    if(on){
      if(!pushOk()){ alert(isIOSDev && !standaloneApp() ? 'Sur iPhone, les notifications marchent quand Vezoria est ajoutée à l’écran d’accueil (Partager → « Sur l’écran d’accueil »), avec iOS 16.4 ou plus récent.' : 'Ce navigateur ne sait pas recevoir de notifications.'); renderPrefsKeep(); return; }
      let perm = Notification.permission; if(perm === 'default') perm = await Notification.requestPermission();
      if(perm !== 'granted'){ alert('Notifications refusées. Pour les autoriser : réglages du téléphone → Notifications → Vezoria.'); renderPrefsKeep(); return; }
      P.on = true; persist(); toast('🔔 …');
      try { await pushRegister(true); await pushPlan(true); toast('🔔 Notifications activées'); } catch(e){ P.on = false; persist(); alert('Activation impossible : ' + e.message); }
    } else {
      P.on = false; persist();
      try { for(const s of pushSpaces()) await pushPost(s.code, {a:'unsub'}).catch(()=>{}); const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription(); if(sub) await sub.unsubscribe(); } catch(e){}
      P.sig = ''; P.toks = {}; P.planSig = ''; persist(); toast('🔕 Notifications désactivées');
    }
    renderPrefsKeep();
  }
  async function pushKind(k, on){ const P = PU(); P.kinds[k] = on ? 1 : 0; persist(); try { if(k === 'rappel') await pushPlan(true); else await pushRegister(true); } catch(e){} toast(on ? '🔔 ' + (PUSH_KINDS.find(x=>x[0]===k)||[,'',''])[1] : '🔕'); }
  async function pushQuiet(on){ PU().quiet = !!on; persist(); try { await pushRegister(true); } catch(e){} }
  let pushAck = null;
  async function pushTest(){
    try {
      if(!pushOk()){ alert('Ce navigateur ne sait pas recevoir de notifications.'); return; }
      let perm = Notification.permission; if(perm === 'default') perm = await Notification.requestPermission();
      if(perm !== 'granted'){ alert('Notifications refusées. Pour les autoriser : réglages du téléphone → Notifications → Vezoria.'); renderPrefsKeep(); return; }
      try { await pushRegister(true); } catch(e){ console.warn('push sub', e); }
      const got = new Promise(res=>{ pushAck = res; setTimeout(()=>res(null), 25000); });
      await pushPlan(true, {id:'test-' + Date.now(), at:Date.now() - 1000, p:{k:'rappel', r:'test', a:[], tt:'Vezoria'}});
      toast('📨 Notification d’essai envoyée');
      const r = await got; pushAck = null;
      if(r && r.ok) toast('✅ Notification reçue par le téléphone');
      else if(r) alert('Le téléphone a reçu la notification mais n’a pas pu l’afficher. Réglages du téléphone → Applications → Vezoria → Notifications : autorise-les.');
      else {
        // rien reçu : on refait un abonnement neuf (les mises à jour de l’appli peuvent l’avoir rendu caduc)
        try { const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription(); if(sub) await sub.unsubscribe(); } catch(e){}
        PU().sig = ''; persist(); await pushRegister(true).catch(()=>{});
        alert('Aucune notification reçue au bout de 25 secondes. L’abonnement de ce téléphone vient d’être renouvelé : réessaie. Si rien n’arrive, vérifie Réglages du téléphone → Applications → Vezoria → Notifications.');
      }
    } catch(e){ pushAck = null; alert('Envoi impossible : ' + e.message); }
  }
  function renderPrefsKeep(){ if(M.tab === 'prefs'){ const y = window.scrollY; renderPrefs(); window.scrollTo({top:y}); } }
  function pushBox(){
    const P = PU(), ok = pushOk(), denied = ok && Notification.permission === 'denied';
    let h = `<div class="v-box" id="cv-push"><h3>🔔 Notifications</h3>`;
    if(!ok) return h + `<div class="v-sum-small">${isIOSDev && !standaloneApp() ? 'Sur iPhone, les notifications marchent quand Vezoria est ajoutée à l’écran d’accueil (Partager → « Sur l’écran d’accueil »), avec iOS 16.4 ou plus récent.' : 'Ce navigateur ne sait pas recevoir de notifications.'}</div></div>`;
    if(denied) return h + `<div class="v-sum-small">Les notifications sont bloquées pour Vezoria dans les réglages du téléphone. Autorise-les, puis reviens ici.</div></div>`;
    if(P.on && Notification.permission !== 'granted') h += `<div class="v-sum-small" style="margin-bottom:8px">Ce téléphone n’a pas encore autorisé les notifications pour Vezoria.</div><button type="button" class="v-btn" style="margin-bottom:10px" onclick="CV.pushTog(true)">🔔 Autoriser sur ce téléphone</button>`;
    h += `<label class="cv-checkline"><input type="checkbox" ${P.on ? 'checked' : ''} onchange="CV.pushTog(this.checked)"> <span><b>Recevoir des notifications</b></span></label>`;
    if(P.on) h += `<div class="v-sum-small" style="margin:8px 0 4px">Choisis ce qui t’intéresse :</div>`
      + PUSH_KINDS.map(([k, ic, l])=>`<label class="cv-checkline cv-pref"><input type="checkbox" ${P.kinds[k] ? 'checked' : ''} onchange="CV.pushKind('${k}', this.checked)"> <span>${ic} ${l}</span></label>`).join('')
      + `<label class="cv-checkline cv-pref"><input type="checkbox" ${P.quiet ? 'checked' : ''} onchange="CV.pushQuiet(this.checked)"> <span>🌙 Ne pas déranger la nuit (22 h – 8 h)</span></label>`
      + `<button type="button" class="v-day-edit" style="margin-top:8px" onclick="CV.pushTest()">📨 M’envoyer une notification d’essai</button>`
      + (/Android/i.test(navigator.userAgent) ? `<div class="v-sum-small" style="margin-top:6px">Pas de bandeau en haut de l’écran ? Réglages du téléphone → Applications → Vezoria → Notifications → touche la catégorie et active « Afficher en pop-up » (ou « Alerte »).</div>` : '');
    if(cloudMode() === 'none') return h + `<div class="v-sum-small" style="margin-top:8px">📱 Mode sans cloud : tes rappels personnels arrivent, mais pas les notifications de tes amis (elles passent par le cloud).</div></div>`;
    const alone = !M.sync.on && !Object.keys(TS()).length;
    return h + `<div class="v-sum-small" style="margin-top:8px">Le contenu des notifications est chiffré : le serveur ne peut pas le lire. Tes compagnons choisissent les leurs.${alone ? ' Pour être prévenu des ajouts de tes compagnons, partage d’abord un voyage.' : ''}</div></div>`;
  }

  // ── Envoi : après chaque synchro, ce que J’AI ajouté est annoncé aux autres (regroupé par voyage et par sorte) ──
  let pushBuf = {}, pushT = null;
  function pushWhat(r){
    if(!r || r.demo || r.deleted || r.updatedBy !== M.me || !M.me) return null;
    const t = r.trip ? R[r.trip] : null; if(r.trip && (!t || t.demo || t.type !== 'trip')) return null;
    const seenAll = M.pushSeen || (M.pushSeen = {}), seen = seenAll[r.id];
    const isNew = r.createdBy === M.me && (r.updatedAt || 0) - (r.createdAt || 0) < 4000;
    let o = null;
    if(r.type === 'item' && r.trip){
      if(r.cat === 'divers'){ if(isNew && !seen) o = {k:'depense', x:r.titre || '', v: num(r.prix) ? eur(num(r.prix)) : ''}; }
      else { const sig = [r.date, r.heure, r.heureDep, r.heureArr].join('|');
        if(isNew && !seen) o = {k:'resa', x:r.titre || r.nom || ''};
        else if(seen && seen !== 1 && seen !== sig) o = {k:'resa', ch:1, x:r.titre || r.nom || '', h:[r.date ? fshort(r.date) : '', r.heureDep || r.heure || ''].filter(Boolean).join(' ')};
        seenAll[r.id] = sig; return o ? Object.assign(o, {trip:r.trip}) : null; }
    } else if(r.type === 'remb' && r.trip){ if(isNew && !seen) o = {k:'depense', rb:1, x:eur(num(r.montant)), w:pname(r.a)}; }
    else if(r.type === 'souv' && r.trip){ if(isNew && !seen) o = {k:'souv', x:r.titre || r.lieu || ''}; }
    else if(r.type === 'poll'){ if(isNew && !seen) o = {k:'sondage', x:r.question || ''}; }
    else if(r.type === 'check' && r.trip && /courses/i.test(r.cat || '')){ if(isNew && !seen) o = {k:'notes', x:r.label || ''}; }
    else if(r.type === 'note' && r.trip){ if(isNew && !seen) o = {k:'notes', note:1, x:String(r.texte || '').slice(0, 80)}; }
    else if(r.type === 'place' && r.trip){ if(r.sugg) return null; if(!seen && (isNew || (r.kept && Date.now() - r.kept < 6e4))) o = {k:'resa', x:r.nom || ''}; }
    else if(r.type === 'trip' && !r.demo && (r.voyageurs || []).length > 1 && !seen && r.createdBy === M.me && Date.now() - (r.createdAt || 0) < 3 * 864e5){ seenAll[r.id] = 1; return {k:'resa', x:'🧳 ' + (r.titre || ''), trip:r.id}; }   // voyage partagé avec moi : « Nouveau voyage »
    if(o){ seenAll[r.id] = 1; o.trip = r.trip || ''; }
    return o;
  }
  function pushNote(recs, code){
    if(!pushApi() || !code) return;
    const out = recs.map(pushWhat).filter(Boolean); if(!out.length) return;
    const ks = Object.keys(M.pushSeen); if(ks.length > 4000) ks.slice(0, ks.length - 3000).forEach(k=>delete M.pushSeen[k]);
    (pushBuf[code] = pushBuf[code] || []).push(...out);
    clearTimeout(pushT); pushT = setTimeout(pushOut, 1500);
  }
  async function pushOut(){
    const buf = pushBuf; pushBuf = {};
    for(const [code, list] of Object.entries(buf)){
      const by = {}; list.forEach(o=>{ const k = o.k + '|' + (o.ch ? 'ch|' : '') + o.trip; (by[k] = by[k] || []).push(o); });
      for(const arr of Object.values(by)){
        try {
          const o0 = arr[0], t = R[o0.trip], kk = await keys(code), kid = kk.token.slice(0, 16);
          const p = {k:o0.k, who:myName(), trip:o0.trip, tt:t ? t.titre : '', it:arr.slice(0, 5).map(o=>{ const c = Object.assign({}, o); delete c.k; delete c.trip; return c; }), n:arr.length};
          const msg = b64(await seal(te.encode(JSON.stringify(p)), code));
          await pushPost(code, {a:'send', kind:o0.k, kid, msg, tag:o0.k + '-' + (o0.trip || '')});
        } catch(e){}
      }
    }
  }

  // ── Rappels programmés pour CE téléphone (départ la veille à 19 h, enregistrement en ligne 24 h avant, échéances à 9 h) ──
  async function pushPlan(force, extra){
    const P = PU(); if(!P.on || !pushOk()) return;
    const code = pushDevCode(), now = Date.now(), items = [];
    const at = (d, hm) => new Date(d + 'T' + hm + ':00').getTime();
    const money = (n, t) => Math.round(n * 100) / 100 + ' ' + (CURS[(t && t.devise) || 'EUR'] || (t && t.devise) || '€');
    if(P.kinds.rappel) trips().filter(t=>!t.demo && !t.deleted).forEach(t=>{
      const its = Object.values(R).filter(r=>r.type === 'item' && r.trip === t.id && !r.deleted);
      if(t.debut){ const first = its.filter(i=>i.cat === 'transport' && i.date === t.debut).sort((a,b)=>String(a.heureDep||'').localeCompare(String(b.heureDep||'')))[0];
        items.push({id:'dep-' + t.id, at:at(addD(t.debut, -1), '19:00'), p:{k:'rappel', r:'depart', a:[t.titre], sub:first ? [first.heureDep || '', first.titre || ''].join(' ').trim() : '', trip:t.id, tt:t.titre}}); }
      its.filter(i=>i.cat === 'transport' && /avion|vol\b|flight|plane/i.test((i.mode || '') + ' ' + (i.titre || '')) && i.date && i.heureDep).forEach(i=>{
        const d = new Date(at(i.date, i.heureDep) - 24 * 3600e3); if(d.getHours() >= 22) d.setHours(21, 30, 0, 0); else if(d.getHours() < 8) d.setHours(8, 0, 0, 0);
        items.push({id:'ck-' + i.id, at:d.getTime(), p:{k:'rappel', r:'checkin', a:[[i.titre, i.compagnie].filter(Boolean).join(' · ')], trip:t.id, tt:t.titre}}); });
      its.filter(i=>i.resaOpen && (i.statut || 'todo') === 'todo').forEach(i=>{ const w = i.resaOpenH ? at(i.resaOpen, i.resaOpenH) - 15 * 60e3 : at(i.resaOpen, '09:00');   // ⏰ ouverture des ventes
        items.push({id:'ro-' + i.id, at:w, p:{k:'rappel', r:'resaopen', a:[(i.titre || '') + (i.resaOpenH ? ' · ' + i.resaOpenH : '')], trip:t.id, tt:t.titre}}); });
      its.forEach(i=>(i.echeances || []).forEach((e, k)=>{ if(!e.fait && e.date) items.push({id:'ec-' + i.id + '-' + k, at:at(e.date, '09:00'), p:{k:'rappel', r:'echeance', a:[(i.titre || '') + (num(e.montant) ? ' (' + money(num(e.montant), t) + ')' : '')], trip:t.id, tt:t.titre}}); }));
    });
    // 🌙 le soir pendant le voyage, et 📅 l’anniversaire du départ des voyages passés
    if(P.kinds.soir) trips().filter(t=>!t.demo && !t.deleted && t.debut).forEach(t=>{
      const fin = t.fin || t.debut, today = isoToday();
      for(let d = t.debut > today ? t.debut : today, k = 0; d <= fin && k < 40; d = addD(d, 1), k++) items.push({id:'soir-' + t.id + '-' + d, at:at(d, '21:00'), p:{k:'rappel', r:'soir', a:[t.titre], trip:t.id, tt:t.titre}});
      if(fin < today){ const y0 = +t.debut.slice(0, 4), md = t.debut.slice(4); let y = +today.slice(0, 4); if(String(y) + md <= today) y++;
        const n = y - y0; if(n >= 1) items.push({id:'anniv-' + t.id + '-' + y, at:at(String(y) + md, '10:00'), p:{k:'rappel', r:n === 1 ? 'anniv1' : 'annivN', a:[t.titre, n], trip:t.id, tt:t.titre}}); }
    });
    const keep = items.filter(x=>x.at > now && x.at < now + 150 * 864e5).sort((a,b)=>a.at - b.at).slice(0, 50);
    if(extra) keep.unshift(extra);
    const sig = JSON.stringify(keep.map(x=>[x.id, x.at, x.p.a, x.p.sub]));
    if(!force && sig === P.planSig && now - (P.planAt || 0) < 12 * 3600e3) return;
    const kid = await pushKeyStore(code);
    const out = []; for(const x of keep) out.push({id:x.id, at:x.at, msg:b64(await seal(te.encode(JSON.stringify(x.p)), code))});
    await pushPost(code, {a:'plan', kid, items:out});
    P.planSig = extra ? '' : sig; P.planAt = now; persist();
  }
  // Toucher une notification : ouvre le bon voyage au bon endroit
  function pushOpen(href){
    let u; try { u = new URL(href, location.href); } catch(e){ return; }
    const tid = u.searchParams.get('vzt'), k = u.searchParams.get('vzk'), rr = u.searchParams.get('vzr') || ''; if(tid === null) return;
    if(/[?&]vzt=/.test(location.search)) history.replaceState(null, '', location.pathname);
    if(/^ft:/.test(tid)){ if(R[tid] && !R[tid].deleted) setTimeout(()=>{ try { feedView(tid); } catch(e){} }, 200); setTimeout(()=>syncNow('pull'), 400); return; }   // 👀 voyage suivi : son fil
    if(tid && R[tid] && !R[tid].deleted){ M.trip = tid; M.who = 'all'; }
    const tb = /^(soir|anniv)/.test(rr) ? 'souv' : {depense:'budget', resa:'prog', souv:'souv', sondage:'envies', notes:'prog', rappel:'prog'}[k] || 'prog';
    M.mode = 'prep'; M.tab = tb; persist(); applyMode(); window.scrollTo({top:0});
    if(k === 'notes') setTimeout(()=>{ try { shopSheet(); } catch(e){} }, 300);
    if(k && k !== 'rappel') setTimeout(()=>syncNow('pull'), 400);   // la nouveauté annoncée arrive tout de suite
  }
  /* ── 📅 Ce jour-là : un souvenir pris le même jour, une année précédente ── */
  function onThisDay(force){
    const today = isoToday(), md = today.slice(4), y = +today.slice(0, 4);
    if(!force && (M.otdSeen === today || document.querySelector('#v-sheet-bg, .ui-dlg, #cv-gate, #cv-film, #cv-world, #cv-feed, #cv-tj, .cv-first'))) return;
    const cand = list('souv', s=>!s.deleted && !s.demo && s.date && s.date.slice(4) === md && +s.date.slice(0, 4) < y && R[s.trip] && !R[s.trip].deleted)
      .sort((a, b)=>((b.photos||[]).length ? 1 : 0) - ((a.photos||[]).length ? 1 : 0) || b.date.localeCompare(a.date));
    if(!cand.length){ if(force) alert('Aucun souvenir pris un ' + fdate(today).replace(/^\S+\s/, '') + ' les années précédentes.'); return; }
    const s = cand[0], n = y - +s.date.slice(0, 4), t = R[s.trip], ph = (s.photos || [])[0];
    M.otdSeen = today; M.seen = M.seen || {}; M.seen['anniv:' + today] = 1; persist();
    openSheet(`<h2>📅 Ce jour-là</h2>
      <div class="otd-k">${n === 1 ? 'Il y a un an' : `Il y a ${n} ans`}</div>
      ${ph ? `<button type="button" class="otd-ph" onclick="CV.view('${s.id}',0)"><img data-ph="${esc(ph)}" alt=""></button>` : ''}
      <div class="otd-t"><b data-notr>${esc(s.titre || s.lieu || t.titre)}</b><small data-notr>${esc(t.titre)}${s.lieu ? ' · ' + esc(s.lieu) : ''}</small>${s.texte ? `<p data-notr>${esc(String(s.texte).slice(0, 220))}</p>` : ''}</div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.close();CV.go('${t.id}');CV.modeGo('bilan')">📸 Revoir ce voyage</button><button type="button" class="v-btn sec" onclick="CV.flyover('${t.id}')">🌍 Survol 3D</button></div>`);
  }
  function pushBadgeClear(){ try { pushKv('badge', 0).catch(()=>{}); if(navigator.clearAppBadge) navigator.clearAppBadge().catch(()=>{});
    if('serviceWorker' in navigator) navigator.serviceWorker.ready.then(reg=>{
      // les notifications de chaque voyage (regroupées par étiquette) : fermées depuis la page ET par le service worker
      const tags = ['vezoria', ...trips().flatMap(t=>['vz-' + t.id, 'vz-soc-' + t.id]), ...list('feedtrip').map(f=>'vz-soc-' + f.id)];
      try { (reg.active || navigator.serviceWorker.controller) && (reg.active || navigator.serviceWorker.controller).postMessage({type:'vz-clear', tags}); } catch(e){}
      return reg.getNotifications ? reg.getNotifications() : []; }).then(ns=>ns.forEach(n=>n.close())).catch(()=>{}); } catch(e){} }
  /* 🔔 Récap : ce qui est arrivé pendant que l’appli était fermée (Android n’affiche pas toujours de bandeau) */
  let recapVia = '', recapT = null;
  const recapBusy = () => document.querySelector('#v-sheet-bg, .ui-dlg, #cv-gate, #cv-film, #cv-tj, .cv-first');
  async function pushRecap(){
    if(!pushOk()) return;
    try { if(await pushKv('nokey')){ await pushKv('nokey', null); if(PU().on && Notification.permission === 'granted'){ PU().sig = ''; pushRegister(true).catch(()=>{}); } } } catch(e){}
    let box = []; try { box = (await pushKv('inbox')) || []; } catch(e){ return; }
    box = box.filter(x=>Date.now() - x.at < 7 * 864e5);
    if(!box.length) return;
    nhAdd(box);   // 🔔 gardées dans l’historique de la cloche
    // ouverte en touchant la seule notification : elle s’affiche déjà, pas besoin de récap
    const qs = u => { try { return new URL(u, location.href).search; } catch(e){ return ''; } };
    if(box.length === 1 && recapVia && qs(box[0].url) === qs(recapVia)){ recapVia = ''; nhRead(box); await pushKv('inbox', []); return; }
    recapVia = '';
    if(recapBusy()){ clearTimeout(recapT); recapT = setTimeout(pushRecap, 4000); return; }
    await pushKv('inbox', []); nhRead(box);
    pushRecapBox = box.slice().reverse();
    const lang = (window.I18N && I18N.lang) || 'fr', hm = t => { const d = new Date(t), td = new Date(); const s = d.toLocaleTimeString(lang, {hour:'2-digit', minute:'2-digit'});
      return d.toDateString() === td.toDateString() ? s : d.toLocaleDateString(lang, {weekday:'short', day:'numeric'}) + ' ' + s; };
    const by = {}; pushRecapBox.forEach((x, i)=>{ (by[x.trip || '-'] = by[x.trip || '-'] || []).push([x, i]); });
    openSheet(`<h2>🔔 Pendant ton absence</h2>`
      + Object.values(by).map(arr=>`<div class="cv-rcp-t">${esc(arr[0][0].title || 'Vezoria')}</div>`
        + arr.map(([x, i])=>`<button type="button" class="cv-rcp" onclick="CV.recapGo(${i})"><span data-notr>${esc(String(x.body || '')).replace(/\n/g, '<br>')}</span><small>${hm(x.at)}</small></button>`).join('')).join('')
      + `<div class="v-actions"><button type="button" class="v-btn" onclick="CV.close()">OK</button></div>`);
  }
  let pushRecapBox = [];
  /* 🔔 Cloche de l’accueil : historique des notifications (30 jours, sur ce téléphone seulement) ; le chiffre rouge = non lues */
  const NH_K = 'cv-nh';
  function nhGet(){ try { const a = JSON.parse(localStorage.getItem(NH_K) || '[]'); return Array.isArray(a) ? a : []; } catch(e){ return []; } }
  function nhSet(a){ try { localStorage.setItem(NH_K, JSON.stringify(a.filter(x=>Date.now() - x.at < 30 * 864e5).slice(-80))); } catch(e){} bellDraw(); }
  const nhKey = x => x.at + '|' + String(x.body || '').slice(0, 60);
  function nhAdd(items, read){ const a = nhGet(), ks = new Set(a.map(nhKey));
    (items || []).forEach(x=>{ if(!x || !x.body) return; const k = nhKey(x); if(ks.has(k)) return; ks.add(k);
      a.push({at:x.at || Date.now(), title:x.title || 'Vezoria', body:String(x.body), url:x.url || '', read:!!read}); });
    a.sort((p, q)=>p.at - q.at); nhSet(a); }
  function nhRead(items){ const ks = new Set((items || []).map(nhKey)); nhSet(nhGet().map(x=>ks.has(nhKey(x)) ? Object.assign(x, {read:true}) : x)); }
  function bellDraw(){
    const b = document.getElementById('cv-bell'); if(!b) return;
    const n = nhGet().filter(x=>!x.read).length;
    b.innerHTML = '🔔' + (n ? `<i class="cv-bell-n">${n > 9 ? '9+' : n}</i>` : '');
    b.setAttribute('aria-label', n ? 'Notifications : ' + n + ' non lue' + (n > 1 ? 's' : '') : 'Notifications');
  }
  function bellSheet(){
    const a = nhGet().sort((p, q)=>q.at - p.at); NHV = a;
    const lang = (window.I18N && I18N.lang) || 'fr', hm = t => { const d = new Date(t), td = new Date(); const s = d.toLocaleTimeString(lang, {hour:'2-digit', minute:'2-digit'});
      return d.toDateString() === td.toDateString() ? s : d.toLocaleDateString(lang, {weekday:'short', day:'numeric', month:'short'}) + ' ' + s; };
    openSheet(`<h2>🔔 Notifications</h2>`
      + (a.length ? a.map((x, i)=>`<button type="button" class="cv-rcp${x.read ? '' : ' nw'}" onclick="CV.bellGo(${i})"><span data-notr><b>${esc(x.title)}</b><br>${esc(x.body).replace(/\n/g, '<br>')}</span><small>${hm(x.at)}</small></button>`).join('')
        : `<div class="v-empty">Aucune notification pour l’instant.</div>`)
      + `<div class="v-sum-small" style="margin-top:8px">${PU().on ? 'Les notifications des 30 derniers jours restent ici, sur ce téléphone.' : 'Les notifications sont désactivées : active-les dans Plus → ⚙️ Réglages.'}</div>`
      + `<div class="v-actions">${a.length ? `<button type="button" class="v-btn sec" onclick="CV.bellClear()">🗑 Tout effacer</button>` : ''}${PU().on ? '' : `<button type="button" class="v-btn sec" onclick="CV.close();CV.plusGo('prefs')">⚙️ Réglages</button>`}<button type="button" class="v-btn" onclick="CV.close()">OK</button></div>`);
    nhSet(nhGet().map(x=>Object.assign(x, {read:true})));   // tout est lu : le chiffre rouge disparaît
    pushBadgeClear(); pushKv('inbox').then(b=>{ if(b && b.length){ nhAdd(b, true); return pushKv('inbox', []); } }).catch(()=>{});
  }
  let NHV = [];
  function bellGo(i){ const x = NHV[i]; closeSheet(); if(x && x.url) pushOpen(x.url); }
  async function bellClear(){ if(!(await uiConfirm('Effacer toutes les notifications de la cloche ?'))) return; nhSet([]); closeSheet(); }
  // notifications arrivées pendant que l’appli dormait : le chiffre rouge de la cloche se met à jour à l’ouverture
  async function bellSync(){ try { if(!pushOk()) return; const b = (await pushKv('inbox')) || []; if(b.length) nhAdd(b.filter(x=>Date.now() - x.at < 7 * 864e5)); } catch(e){} }
  function recapGo(i){ const x = pushRecapBox[i]; closeSheet(); if(x) pushOpen(x.url); }
  // appli ouverte : petit bandeau en haut, touchable
  function pushBanner(d){
    if(!d || d.test || !d.body || document.visibilityState !== 'visible') return;
    pushKv('inbox', []).catch(()=>{}); pushBadgeClear(); nhAdd([{at:Date.now(), title:d.title, body:d.body, url:d.url}], true);
    let b = document.getElementById('cv-inb'); if(!b){ b = document.createElement('button'); b.type = 'button'; b.id = 'cv-inb'; document.body.appendChild(b); }
    b.innerHTML = `<b>🔔 ${esc(d.title || 'Vezoria')}</b><span>${esc(String(d.body).split('\n')[0])}</span>`;
    b.onclick = ()=>{ b.classList.remove('show'); pushOpen(d.url); };
    requestAnimationFrame(()=>b.classList.add('show')); clearTimeout(b._t); b._t = setTimeout(()=>b.classList.remove('show'), 6000);
  }
  if('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', ev=>{ const d = ev.data || {};
    if(d.type === 'vz-open'){ recapVia = d.url; pushOpen(d.url); pushKv('inbox').then(b=>{ if(b && b.length) nhAdd(b, true); return pushKv('inbox', []); }).catch(()=>{}); }
    else if(d.type === 'vz-push'){ if(pushAck) pushAck(d); else { pushBanner(d); if(!d.test) pushPull(true); } } });
  // une notification est arrivée : on va chercher les modifications tout de suite (sans attendre la synchro de l’heure)
  let pullT = 0;
  function pushPull(now){ clearTimeout(pullT); pullT = setTimeout(()=>{ try { syncNow('pull'); } catch(e){} }, now ? 400 : 900); }
  async function pushPullIfNew(){ try { const b = await pushKv('inbox'), n = await pushKv('badge'); if((b && b.length) || n) pushPull(); } catch(e){} }
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'visible'){ pushPullIfNew(); setTimeout(pushBadgeClear, 300); bellSync(); clearTimeout(recapT); recapT = setTimeout(pushRecap, 1200); } });
  setTimeout(()=>{ if(/[?&]vzt=/.test(location.search)) recapVia = location.href; pushPullIfNew(); pushOpen(location.href); setTimeout(pushBadgeClear, 300); bellSync(); bellDraw(); setTimeout(pushRecap, 1500);
    if(PU().on){ pushRegister().catch(()=>{}); pushPlan().catch(()=>{}); } }, 3000);

  /* Ne jamais redessiner l'écran pendant que l'utilisateur touche, tape ou ouvre une liste :
     sinon le bouton ou la liste « disparaît » sous le doigt et il faut retoucher plusieurs fois. */
  var lastTouch = 0, softT = null, softWant = 0;
  ['pointerdown','touchstart','keydown','input','focusin'].forEach(ev=>document.addEventListener(ev, ()=>{ lastTouch = Date.now(); }, {capture:true, passive:true}));
  const uiBusy = () => { const a = document.activeElement; return (a && /^(SELECT|INPUT|TEXTAREA)$/.test(a.nodeName) && document.getElementById('cv-body') && document.getElementById('cv-body').contains(a)) || Date.now() - lastTouch < 1500; };
  function softRefresh(changed){
    softWant = Math.max(softWant, changed ? 2 : (M.tab==='reglages' ? 1 : 0)); if(!softWant) return;
    if(uiBusy() || sheetOpen()){ clearTimeout(softT); softT = setTimeout(()=>softRefresh(0), 1600); return; }
    const w = softWant; softWant = 0;
    if(w === 2) refresh(); else if(M.trip!==LEGACY) render();
  }
  function syncDot(){
    const el = document.getElementById('cv-sd'); if(!el) return;
    // carnet principal dans le cloud : son état · « voyage par voyage » : l’état de l’ensemble des voyages dans le cloud
    const feeds = new Set(Object.values(M.feedPub || {})), sps = (M.spaces || []).filter(sp=>!sp.mate && !feeds.has(sp.code) && Object.values(TS()).includes(sp.code));
    el.className = 'sd ' + (M.sync.on ? (M.sync.err ? 'err' : (M.dirty.length || syncing || (M.pq||[]).length) ? 'wait' : 'ok')
      : !sps.length ? 'off' : sps.some(sp=>sp.err) ? 'err' : (syncing || (M.pq||[]).length || sps.some(sp=>(sp.dirty||[]).length)) ? 'wait' : 'ok');
  }

  /* ══════════ En-tête, voyages, navigation ══════════ */
  const GROUPS = [
    {id:'jours',  icon:'🗓️', lbl:'Programme', tabs:[['prog','Jour par jour'], ['souv','📸 Souvenirs'], ['notes','📌 Notes'], ['outils','🧰 Outils']]},
    {id:'resas',  icon:'🎫', lbl:'Résas',     tabs:[['transport','✈️ Trajets'], ['hotel','🏨 Hôtels'], ['activite','🎟️ Visites'], ['divers','🧾 Divers']]},
    {id:'sous',   icon:'💸', lbl:'Budget',    tabs:[['budget','Qui paie quoi'], ['ech','📆 Échéancier']]},
    {id:'envies', icon:'✨', lbl:'Envies',    tabs:[['envies','Envies']]},
    {id:'plus',   icon:'🧳', lbl:'Plus',      tabs:[['check','✅ Checklist'], ['reglages','👥 Partage & profils'], ['prefs','⚙️ Réglages'], ['livret','📖 Livret'], ['badges','🏅 Badges']]},
  ];
  const groupOf = id => GROUPS.find(g=>g.tabs.some(t=>t[0]===id)) || GROUPS[0];
  const MOIS = (window.I18N && I18N.lang !== 'fr') ? [...Array(12).keys()].map(i=>new Intl.DateTimeFormat(I18N.locale, {month:'short'}).format(new Date(2024, i, 15))) : ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
  function tripDatesLong(t){
    if(!t || !t.debut) return '';
    const a = t.debut.split('-'), b = (t.fin||t.debut).split('-');
    if(a[0]===b[0] && a[1]===b[1]) return `${+a[2]} → ${+b[2]} ${MOIS[+a[1]-1]} ${a[0]}`;
    return `${+a[2]} ${MOIS[+a[1]-1]} → ${+b[2]} ${MOIS[+b[1]-1]} ${b[0]}`;
  }
  function countdown(t){
    if(!t || !t.debut) return '';
    const today = new Date().toISOString().slice(0,10);
    if(today < t.debut){ if(!t.demo && !t.archived && !hidden('blk:cd') && t.id === M.trip) return ''; const n = nights(today, t.debut); return `<b>J-${n}</b><span>${n>1?'avant le départ':'demain on part !'}</span>`; }
    if(!t.fin || today <= t.fin){ const k = nights(t.debut, today) + 1, tot = nights(t.debut, t.fin||t.debut) + 1; return `<b>Jour ${k}</b><span>sur ${tot}, profitez</span>`; }
    return `<b>✓</b><span>souvenirs</span>`;
  }
  /* ── 📊 Compteurs de l’en-tête : abonnés · j’aime · abonnements (calculés sur le téléphone, rien de plus sur le serveur) ── */
  function heroStats(show){
    const box = document.getElementById('cv-hstats'); if(!box) return;
    if(!show){ box.style.display = 'none'; return; }
    const me = devId(), mine = new Set(Object.keys(FT()).filter(tid=>R[tid] && !R[tid].deleted).map(ftId));
    const fw = new Set(list('follower', x=>mine.has(x.trip) && !isBlk(x) && !String(x.id).endsWith(':' + me)).map(fwKey)).size;
    const lk = list('like', l=>mine.has(l.trip) && l.on && !isBlk(l) && !String(l.id).endsWith(':' + me)).length;
    const fo = list('feedtrip', f=>TS()[f.id] && !FT()[String(f.id).replace(/^ft:/,'')] && !f.deleted).length;
    if(!mine.size && !fo && !fw && !lk){ box.style.display = 'none'; return; }   // rien de publié, rien de suivi : pas de « 0 · 0 · 0 »
    const now = {fw, lk, fo}, old = M.hStat || null;
    const fmt = n => n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (Math.round(n / 100) / 10).toString().replace('.', ',') + 'k' : String(n);
    const cell = (k, n, lbl) => {
      const up = old && n > (old[k] || 0) ? n - (old[k] || 0) : 0;
      return `<span class="hs-c${up ? ' up' : ''}"><b>${fmt(n)}</b><small>${lbl}</small>${up ? `<i class="hs-plus">+${up}</i>` : ''}</span>`;
    };
    box.innerHTML = cell('fw', fw, 'abonnés') + cell('lk', lk, 'j’aime') + cell('fo', fo, 'suivis');
    box.style.display = '';
    if(!old || old.fw !== fw || old.lk !== lk || old.fo !== fo){ M.hStat = now; try { persist(); } catch(e){} }
  }
  function renderHeader(){
    const legacy = M.trip===LEGACY, t = trip();
    const title = document.getElementById('hdr-title'), sub = document.getElementById('hdr-sub');
    const pill = document.getElementById('cv-tripname'), cd = document.getElementById('cv-count'), av = document.getElementById('cv-avs');
    if(legacy){
      title.textContent = 'Road trip Europe'; sub.textContent = 'Juillet 2026 · terminé, tout est payé ✓';
      pill.textContent = 'Archive 2026'; cd.innerHTML = '<b>✓</b><span>souvenirs</span>'; av.innerHTML = '';
      document.title = 'Carnet · 2026';
    } else if(t){
      title.textContent = t.titre || 'Voyage';
      sub.textContent = [tripDatesLong(t), t.sous||''].filter(Boolean).join(' · ');
      { const hc = document.getElementById('hdr-chips'); if(hc){ const sv = list('souv', s=>s.trip === t.id && !s.deleted), nph = sv.reduce((n, s)=>n + (s.photos||[]).length, 0);
          const ncc = new Set(sv.map(s=>s.cc).filter(Boolean)).size, nd = t.debut && t.fin ? nights(t.debut, t.fin) + 1 : 0;
          const chip = (ic, n, one, many) => n ? `<span>${ic} <b>${n.toLocaleString()}</b> <i>${n > 1 ? many : one}</i></span>` : '';
          hc.innerHTML = chip('🗓️', nd, 'jour', 'jours') + chip('📍', sv.length, 'étape', 'étapes') + chip('📸', nph, 'photo', 'photos') + chip('🌍', ncc, 'pays', 'pays'); } }
      pill.textContent = trips().length > 1 ? trips().length + ' voyages' : 'Mes voyages';
      cd.innerHTML = countdown(t); cd.style.display = cd.innerHTML ? '' : 'none';
      const vv = tv(), shown = vv.slice(0, 8);
      av.innerHTML = shown.map(id=>`<span class="cv-av" style="background:${pcol(id)}" title="${esc(pname(id))}">${esc((pname(id)[0]||'?').toUpperCase())}</span>`).join('')
        + (vv.length > 8 ? `<span class="cv-av" style="background:#444" title="${vv.length - 8} autres">+${vv.length - 8}</span>` : '')
        + `<span class="cv-av-names">${vv.length <= 3 ? vv.map(id=>esc(pname(id))).join(' & ') : vv.slice(0,2).map(id=>esc(pname(id))).join(', ') + ' et ' + (vv.length - 2) + ' autres'}</span>`;
      document.title = 'Vezoria · ' + (t.titre||'Voyage');
    } else { { const hc = document.getElementById('hdr-chips'); if(hc) hc.innerHTML = ''; } title.textContent = 'Vezoria'; sub.textContent = 'Ton premier voyage t’attend'; pill.textContent = 'Mes voyages'; cd.innerHTML = ''; av.innerHTML = ''; }
    try { heroStats(!legacy && !!t); } catch(e){}
    try { badgeCheck(); } catch(e){}
    phaseTheme();
    document.body.classList.toggle('cv-jourj', !!(t && t.debut && t.debut === isoToday()));
    const me = document.getElementById('cv-me');
    me.style.background = M.me ? pcol(M.me) : '#777';
    me.innerHTML = `${esc(M.me ? (pname(M.me)[0]||'?').toUpperCase() : '?')}<span class="sd" id="cv-sd"></span>`;
    syncDot();
  }
  /* ══════════ 🔗 Partage voyage par voyage ══════════ */
  async function tripShare(id){
    const t = R[id || M.trip]; if(!t) return;
    const code = TS()[t.id];
    if(code && spaceObj(code)) return tripShareSheet(t.id);
    if(!apiUrl()){ alert('Le partage a besoin de l’appli en ligne (adresse du serveur).'); return; }
    if(!(await uiConfirm(`Partager « ${t.titre} » avec son propre code ?\n\nSeules les personnes qui ont ce code verront CE voyage (et pas tes autres voyages).\nLes compagnons déjà synchronisés par le code principal gardent ce qu’ils ont déjà, mais ne recevront plus les nouveautés de ce voyage.`))) return;
    let c = ((await uiPrompt('Ce voyage avait déjà un code (effacé du serveur, par exemple) ? Colle-le ici pour le réutiliser : les autres téléphones le retrouveront.\nSinon laisse vide : un nouveau code sera créé.')) || '').trim().toUpperCase();
    const reuse = c.length >= 8; if(!reuse) c = genCode();
    if(!spaceObj(c)) (M.spaces = M.spaces || []).push({code:c, since:0, dirty:[], last:0, err:''});
    TS()[t.id] = c;
    persist(); tripShareSheet(t.id); photoResend(t.id);
  }
  function tripShareSheet(id){
    const t = R[id], code = TS()[id], sp = spaceObj(code) || {};
    openSheet(`<h2>🔗 ${esc(t.titre)}</h2><div class="v-sum-small" style="margin-bottom:8px">Ce voyage a son propre code : seuls ceux qui l’ont le voient. Tes autres voyages restent privés.</div>
      <div class="cv-bigcode">${esc(code)}</div>
      <div class="v-sum-small" style="margin:6px 0 10px">État : ${sp.err ? '🔴 ' + esc(sp.err) : (sp.dirty||[]).length ? '🟠 ' + sp.dirty.length + ' modif(s) en attente' : sp.last ? '🟢 À jour (' + vzWhen(sp.last) + ')' : '⏳ première synchro…'}</div>
      <button class="v-btn" onclick="CV.tripInvite('${id}')">📤 Envoyer l’invitation (adresse + code)</button>
      <button class="v-btn sec" onclick="CV.syncNow(true)">🔄 Synchroniser maintenant</button>
      <button class="v-btn sec" onclick="CV.photoResend('${id}')">📤 Tout renvoyer (voyage + photos)</button>
      <button class="v-btn sec" onclick="CV.tripNewCode('${id}')">🔑 Nouveau code (repartir à neuf)</button>
      <button class="v-btn danger" onclick="CV.tripUnshare('${id}')">Arrêter le partage de ce voyage sur ce téléphone</button>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  async function tripNewCode(id){
    const t = R[id]; if(!t) return;
    if(!(await uiConfirm('Créer un nouveau code pour « ' + t.titre + ' » ?\n\nLe voyage, ses fiches et ses photos repartent sur le serveur sous ce nouveau code. Les autres téléphones doivent ensuite le rejoindre avec le nouveau code (Mes voyages → Rejoindre un voyage partagé).'))) return;
    const old = TS()[id], c = genCode();
    (M.spaces = M.spaces || []).push({code:c, since:0, dirty:[], last:0, err:''}); TS()[id] = c;
    if(old && !Object.values(TS()).includes(old)) M.spaces = M.spaces.filter(x=>x.code !== old);
    persist(); tripShareSheet(id);
    photoResend(id).then(()=>{ const sp = spaceObj(TS()[id]); if(sp && sp.err) alert('⚠️ Le voyage n’a pas pu être envoyé sous le nouveau code : ' + sp.err + '\nRéessaie avec « Tout renvoyer » quand la connexion est bonne.'); else if(sp) { toast('✅ Voyage en ligne : le code peut être donné'); tripShareSheet(id); } });
  }
  async function tripInvite(id){
    const t = R[id], url = M.sync.url || (/^https?:/.test(location.protocol) ? location.origin + location.pathname : '');
    const text = `Rejoins notre voyage « ${t.titre} » 🧳\n${url}\nCode du voyage : ${TS()[id]}\n(Mes voyages → 🔗 Rejoindre un voyage partagé → colle le code)`;
    if(navigator.share){ try { await navigator.share({title:t.titre, text}); return; } catch(e){ return; } }
    try { await navigator.clipboard.writeText(text); toast('📋 Invitation copiée'); } catch(e){ (await uiPrompt('Copie ce texte :', text)); }
  }
  /* ══════════ 📦 Voyage partagé = extrait du carnet principal (pas de photos en double sur le serveur) ══════════
     1) un mot chiffré « ce voyage a déménagé, voici son code » est déposé dans le carnet principal
     2) les autres appareils du même carnet le lisent et rejoignent le voyage tout seuls
     3) 24 h après, quand chaque photo est bien dans le dossier du voyage (sinon elle y est recopiée), sa copie du carnet principal est effacée */
  function mvMark(){
    if(!(M.sync.on && M.sync.code)) return;
    const out = [];
    Object.entries(TS()).forEach(([tid, c])=>{ const t = R[tid], id = 'mv:' + tid, cur = R[id];
      if(!t || t.type !== 'trip' || t.deleted || t.demo || !spaceObj(c)) return;
      if(!cur || cur.deleted || cur.code !== c) out.push({id, type:'moved', tid, code:c, at:Date.now()}); });
    if(out.length) putQuiet(out);
  }
  function movedApply(){
    let n = 0;
    list('moved', m=>!m.deleted && m.tid && m.code && !TS()[m.tid] && !(M.mvSkip||{})[m.tid]).forEach(m=>{
      TS()[m.tid] = m.code; if(!spaceObj(m.code)) (M.spaces = M.spaces || []).push({code:m.code, since:0, dirty:[], last:0, err:''}); n++; });
    if(n){ persist(); setTimeout(()=>{ try { syncNow(); } catch(e){} }, 800); }
    return n;
  }
  let mvBusy = false;
  async function tripExtract(force){
    const main = M.sync.on && M.sync.code;
    if(mvBusy || !main || !photoApi() || (!force && M.mvAt && Date.now() - M.mvAt < 6 * 3600e3)) return 0;
    const todo = list('moved', m=>!m.deleted && TS()[m.tid] === m.code && spaceObj(m.code) && (M.mvDone||{})[m.tid] !== m.code && Date.now() - (m.at || m.createdAt || 0) > 864e5);
    if(!todo.length) return 0;
    mvBusy = true; M.mvAt = Date.now(); persist(); let freedN = 0;
    const listAll = async code => { const set = new Set(); let cur = '';
      do { const r = await fetch(photoApi() + '?list=1' + (cur ? '&cursor=' + encodeURIComponent(cur) : ''), {headers:{'X-Carnet-Code':await authCode(code)}}); if(!r.ok) return null;
        const j = await r.json(); if(!j || !Array.isArray(j.ids)) return null; j.ids.forEach(o=>set.add(o.i)); cur = j.cursor || ''; } while(cur);
      return set; };
    try {
      const inMain = await listAll(main); if(!inMain) return 0;
      // photo encore utilisée par une fiche du carnet principal (couverture, profil…) : on la garde
      const mainUse = new Set(); Object.values(R).forEach(r=>{ if(r && !r.deleted && !r.demo && targets(r).includes('main')) photoRefs(r).forEach(x=>mainUse.add(String(x))); });
      for(const m of todo){
        const c = m.code, sp = spaceObj(c); if(!sp || sp.err || (sp.dirty||[]).length) continue;
        const ids = new Set(); Object.values(R).forEach(r=>{ if(r && !r.deleted && (r.id === m.tid || r.trip === m.tid)) photoRefs(r).forEach(x=>ids.add(String(x))); });
        if((M.pq||[]).some(x=>ids.has(String(x).replace(/\.t$/, '')))) continue;   // des photos sont encore en route vers le voyage
        const inTrip = await listAll(c); if(!inTrip) continue;
        const del = []; let keep = 0;
        for(const id of ids){ const keepMain = mainUse.has(id);   // aussi utilisée hors du voyage : recopiée dans le voyage, mais gardée dans le carnet principal
          if(pkOf(id)){   // 🫙 dans le pot commun : le voyage la lit déjà par son lien → l'ancienne copie du carnet principal part, sans recopie
            if(!keepMain) for(const v of [id, id + '.t']){ const sm = await sid(v, main); if(inMain.has(sm)) del.push(sm); }
            continue; }
          for(const v of [id, id + '.t']){
            const sm = await sid(v, main); if(!inMain.has(sm)) continue;
            const st = await sid(v, c);
            if(!inTrip.has(st)){   // pas encore dans le dossier du voyage : on l’y recopie d’abord (jamais de photo perdue)
              try {
                const r = await fetch(photoApi() + '?id=' + encodeURIComponent(sm), {headers:{'X-Carnet-Code':await authCode(main)}}); if(!r.ok){ keep++; continue; }
                let u8 = new Uint8Array(await r.arrayBuffer()); if(E2E) u8 = await seal(await unseal(u8, main), c);
                const up = await fetch(photoApi(), {method:'POST', headers:{'X-Carnet-Code':await authCode(c), 'X-Photo-Id':st, 'Content-Type':'image/jpeg'}, body:new Blob([u8], {type:'image/jpeg'})});
                if(!up.ok){ keep++; continue; }
              } catch(e){ keep++; continue; }
            }
            if(!keepMain) del.push(sm);
          } }
        let left = keep;
        for(let i = 0; i < del.length; i += 1000){
          const part = del.slice(i, i + 1000);
          const r = await fetch(photoApi() + '?bulk=1', {method:'DELETE', headers:{'X-Carnet-Code':await authCode(main), 'Content-Type':'application/json'}, body:JSON.stringify({ids:part})});
          if(!r.ok){ left += del.length - i; break; }
          const j = await r.json(); freedN += j.deleted || 0; left += part.length - (j.deleted || 0);   // envoyées il y a moins de 3 jours : retirées au prochain passage
        }
        if(!left){ (M.mvDone = M.mvDone || {})[m.tid] = c; persist(); }
      }
    } catch(e){} finally { mvBusy = false; }
    return freedN;
  }
  // 📥 rapatrie les photos d’un voyage partagé avant de le quitter : jamais de photo perdue
  async function tripPhotosHome(tid, code){
    const main = M.sync.on && M.sync.code ? M.sync.code : '';
    const ids = new Set(); Object.values(R).forEach(r=>{ if(r && !r.deleted && !r.demo && (r.id === tid || r.trip === tid)) photoRefs(r).forEach(x=>ids.add(String(x))); });
    if(!ids.size) return {n:0, fail:0};
    let inMain = null;
    if(main){ inMain = new Set(); let cur = '';
      try { do { const r = await fetch(photoApi() + '?list=1' + (cur ? '&cursor=' + encodeURIComponent(cur) : ''), {headers:{'X-Carnet-Code':await authCode(main)}}); if(!r.ok){ inMain = null; break; }
        const j = await r.json(); (j.ids||[]).forEach(o=>inMain.add(o.i)); cur = j.cursor || ''; } while(cur); } catch(e){ inMain = null; } }
    let n = 0, fail = 0, k = 0; const tot = ids.size, v2old = [], th = await spaceHash(code);
    cryptShow('📥 Je récupère les photos du voyage… (' + tot + ')');
    for(const id of ids){ k++; if(k % 10 === 0) cryptShow('📥 Photos du voyage : ' + k + ' / ' + tot);
      const pk = pkOf(id);
      if(pk){   // 🫙 pot commun : rangée ailleurs (mon carnet, celui d'un compagnon) → rien à faire ; rangée dans le voyage → remise chez moi
        if(pk.s !== th){ n++; continue; }
        try {
          let full = null, tb = null;
          try { const o = await IDB.get(id); if(o && o.blob){ await o.blob.slice(0, 1).arrayBuffer(); full = o.blob; } } catch(e){ full = null; }
          try { const o = await IDB.get(id + '.t'); if(o && o.blob) tb = o.blob; } catch(e){}
          if(!full) full = await v2Fetch(pk, false); if(!tb) tb = await v2Fetch(pk, true);
          if(!full){ fail++; continue; }
          v2old.push({id, ref:clone(pk)});
          if(main) await v2Upload(id, full, tb, main, pk.trip);
          else { await IDB.put({id, blob:full, up:1}); if(tb) await IDB.put({id:id + '.t', blob:tb, up:1}); }
          n++;
        } catch(e){ fail++; }
        continue;
      }
      for(const v of [id, id + '.t']){
        try {
          if(main && inMain && inMain.has(await sid(v, main))) continue;                       // déjà dans le carnet principal
          let blob = null; try { const o = await IDB.get(v); if(o && o.blob){ await o.blob.slice(0, 1).arrayBuffer(); blob = o.blob; } } catch(e){ blob = null; }
          if(!blob){   // pas sur ce téléphone : on la prend dans le voyage partagé
            const r = await fetch(photoApi() + '?id=' + encodeURIComponent(await sid(v, code)), {headers:{'X-Carnet-Code':await authCode(code)}});
            if(!r.ok){ if(v === id && r.status !== 404) fail++; continue; }                     // vignette ou photo absente du serveur : rien à récupérer
            let u8 = new Uint8Array(await r.arrayBuffer()); if(E2E) u8 = await unseal(u8, code);
            blob = new Blob([u8], {type:'image/jpeg'});
            if(!main){ await IDB.put({id:v, blob, up:1}); n++; continue; }                         // sans cloud : gardée sur ce téléphone
          }
          if(main){
            const body = E2E ? new Blob([await seal(new Uint8Array(await blob.arrayBuffer()), main)], {type:'image/jpeg'}) : blob;
            const up = await fetch(photoApi(), {method:'POST', headers:{'X-Carnet-Code':await authCode(main), 'X-Photo-Id':await sid(v, main), 'Content-Type':'image/jpeg'}, body});
            if(up.ok) n++; else if(v === id) fail++;
          }
        } catch(e){ if(v === id) fail++; }
      } }
    cryptHide(fail ? '⚠️ ' + fail + ' photo(s) non récupérée(s)' : '📥 Photos du voyage récupérées');
    return {n, fail, v2old};
  }
  // 👥 présence : chaque téléphone membre d’un voyage partagé y dépose « je suis là » (1 fois par semaine au plus)
  function mbTouch(){
    const now = Date.now(), me = devId(), out = [];
    Object.entries(TS()).forEach(([tid, c])=>{ const t = R[tid]; if(!t || t.type !== 'trip' || t.deleted || t.demo || !spaceObj(c)) return;
      const id = 'mb:' + tid + ':' + me, cur = R[id];
      const via = (M.viaH||{})[tid] || 'direct', pk = M.fkey && M.fkey.pub, pid = M.me && prof(M.me) ? M.me : '', ib = pk ? inbox() : '';
      if(!cur || cur.deleted || !cur.on || now - (cur.at || 0) > 7 * 864e5 || cur.via !== via || (pk && !cur.pk) || (cur.pid || '') !== pid || (ib && cur.ib !== ib)) out.push({id, type:'member', trip:tid, dev:me, who: myName() || (M.me && prof(M.me) ? pname(M.me) : ''), at:now, on:true, via, pk, pid, ib}); });
    if(out.length) putQuiet(out);
    // je fais partie de chaque voyage partagé où je suis : on m’ajoute aux voyageurs une fois
    //   (pas si j’ai dit que je n’y pars pas, ni si on m’a retiré après m’y avoir vu)
    if(M.me && prof(M.me)){
      const seen = M.selfIn || (M.selfIn = {}), no = M.notTrav || {}, add = [], sent = M.profSent || (M.profSent = {}); let fresh = false;
      Object.entries(TS()).forEach(([tid, c])=>{ const t = R[tid]; if(!t || t.type !== 'trip' || t.deleted || t.demo || !spaceObj(c)) return;
        if(!sent[c]){ sent[c] = 1; fresh = true; }
        const v = t.voyageurs || []; if(v.includes(M.me)){ seen[tid] = 1; return; }
        if(seen[tid] || no[tid]) return; add.push(Object.assign(clone(t), {voyageurs:[...new Set([...v, M.me])]})); });
      if(add.length) putQuiet(add);
      if(fresh) markDirty(M.me);
    }
    // mon profil porte l’appareil qui l’utilise : les autres ne peuvent plus le modifier
    if(M.me && R[M.me] && R[M.me].type === 'profile' && !R[M.me].dev && list('member', x=>x.dev !== me).length) putQuiet([Object.assign(clone(R[M.me]), {dev:me})]);
  }
  const mbOthers = tid => list('member', m=>m.trip === tid && m.dev !== devId() && m.on && Date.now() - (m.at || 0) < 60 * 864e5);
  // envoie une version « pour le voyage partagé seulement » de quelques fiches, sans toucher à celles de ce téléphone
  async function spacePushOnly(sp, recs){
    const keep = recs.map(r=>R[r.id]);
    M.leaveBak = keep.filter(Boolean).map(clone); persist();   // copie de secours : si l’appli est coupée pendant l’envoi, tout est remis au démarrage
    recs.forEach(r=>{ stamp(r); R[r.id] = r; if(!sp.dirty.includes(r.id)) sp.dirty.push(r.id); });
    try { await syncSpace(sp); } finally { recs.forEach((r, k)=>{ if(keep[k]) R[keep[k].id] = Object.assign(keep[k], {updatedAt: Date.now() + 1}); else delete R[r.id]; }); delete M.leaveBak; persist(); }
  }
  setTimeout(()=>{ try { if(M.leaveBak && M.leaveBak.length){ M.leaveBak.forEach(r=>{ R[r.id] = Object.assign(r, {updatedAt: Date.now()}); markDirty(r.id); }); delete M.leaveBak; persist(); refresh(); } } catch(e){} }, 2500);
  /* ══════════ 📦 Compagnons : un « paquet de voyages » par personne ══════════
     Chaque personne invitée reçoit son propre code de paquet, qui liste les codes des voyages qu’on partage avec elle.
     Retirer un voyage de son paquet = ce voyage change de code ; les autres le reçoivent (leur paquet, ou chiffré pour eux),
     elle garde sa copie (avec toutes les photos) mais ne reçoit plus rien. */
  const PACKS = () => M.packs || (M.packs = {});
  const viaHash = (tid, P) => sid('via:' + tid, P);
  function packSheet(P){
    const pk = P ? PACKS()[P] : null, ts = myTrips().sort((a,b)=>(b.debut||'').localeCompare(a.debut||''));
    if(!ts.length){ alert('Crée d’abord un voyage.'); return; }
    if(!(M.sync.on && M.sync.code) && !(M.spaces||[]).length && !apiUrl()){ alert('Le partage a besoin de l’appli en ligne.'); return; }
    openSheet(`<h2>👥 ${pk ? 'Voyages partagés avec <span data-notr>' + esc(pk.who || '?') + '</span>' : 'Inviter un compagnon'}</h2>
      <div class="v-sum-small" style="margin-bottom:8px">Coche les voyages que cette personne voit et complète avec toi. Tu pourras en retirer un à tout moment, pour elle seulement.</div>
      ${pk ? '' : `<div class="v-f"><label>Pour qui ?</label><input class="v-in" id="pk-who" placeholder="Prénom (pour t’y retrouver)" maxlength="40"></div>`}
      ${ts.map(t=>`<label class="cv-checkline"><input type="checkbox" class="pkt" value="${t.id}"${pk ? (pk.trips.includes(t.id) ? ' checked' : '') : ''}> <span data-notr>${esc(t.titre)}</span>${t.debut ? ' <small>' + esc(tripDatesLong(t)) + '</small>' : ''}</label>`).join('')}
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.packSave('${P || ''}')">${pk ? '✅ Enregistrer' : '📤 Créer l’invitation'}</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  async function packSave(P){
    const sel = [...document.querySelectorAll('.pkt:checked')].map(i=>i.value), who = ((document.getElementById('pk-who')||{}).value || '').trim();
    if(!sel.length && !P){ alert('Coche au moins un voyage.'); return; }
    closeSheet(true);
    const isNew = !P;
    if(isNew){ P = genCode(); (M.spaces = M.spaces || []).push({code:P, since:0, dirty:[], last:0, err:''}); PACKS()[P] = {who: who || '?', trips:[], at:Date.now()}; }
    const pk = PACKS()[P]; TS()['pa:' + P] = P;
    const add = sel.filter(t=>!pk.trips.includes(t)), rem = pk.trips.filter(t=>!sel.includes(t)), out = [];
    for(const t of add){
      if(!(TS()[t] && spaceObj(TS()[t]))){ const c = genCode(); (M.spaces = M.spaces || []).push({code:c, since:0, dirty:[], last:0, err:''}); TS()[t] = c; photoResend(t); }   // le voyage part sur son propre code (extrait du carnet)
      out.push({id:'pt:' + t + '@' + P, type:'packtrip', trip:'pa:' + P, tid:t, code:TS()[t], titre:R[t].titre || ''}); pk.trips.push(t); }
    if(out.length) putQuiet(out);
    for(const t of rem) await packRemoveTrip(P, t, true);
    persist(); try { await syncNow(); } catch(e){}
    if(isNew) inviteSheet('', 'pack', P); else { toast('👥 C’est enregistré'); refresh(); }
  }
  // retirer UN voyage à UNE personne
  async function packRemoveTrip(P, t, quiet){
    const pk = PACKS()[P], old = TS()[t], oldSp = old && spaceObj(old); if(!pk) return;
    if(!quiet && !(await uiConfirm(MSGT('Ne plus partager ce voyage avec cette personne ?') + '\n\n' + (pk.who || '') + ' · ' + ((R[t]||{}).titre || '') + '\n\n' + MSGT('Elle garde sa copie (avec les photos) mais ne reçoit plus tes modifications. Les autres compagnons continuent normalement.')))) return;
    pk.trips = pk.trips.filter(x=>x !== t); persist();
    { const x = R['pt:' + t + '@' + P] || {id:'pt:' + t + '@' + P, type:'packtrip', trip:'pa:' + P, tid:t};   // retiré de SON paquet seulement
      TS()['pa:' + P] = P; putQuiet([Object.assign(clone(x), {deleted:true})]); }
    if(!old || !oldSp) return;
    cryptShow('🔑 Nouveau code pour ce voyage…');
    try {
      const c = genCode(), me = devId(), k = await fKey(), bad = await viaHash(t, P), env = [];
      // compagnons venus directement (sans paquet) : le nouveau code, chiffré pour chacun
      for(const m of list('member', y=>y.trip === t && y.on && y.dev !== me && y.pk && y.via && y.via !== bad)){
        try { const key = await fShared(k.priv, m.pk), iv = crypto.getRandomValues(new Uint8Array(12));
          const ct = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, new TextEncoder().encode(c)));
          env.push({id:'tx:' + t + ':' + m.dev, type:'tripmove', trip:'tm:' + t, tid:t, dev:m.dev, opk:k.pub, iv:b64(iv), ct:b64(ct)}); } catch(e){} }
      if(env.length) await spacePushOnly(oldSp, env);
      (M.spaces = M.spaces || []).push({code:c, since:0, dirty:[], last:0, err:''}); TS()[t] = c;
      Object.values(R).filter(r=>r && !r.demo && (r.id === t || r.trip === t) && r.type !== 'member').forEach(r=>markDirty(r.id));
      // les autres paquets qui contiennent ce voyage reçoivent le nouveau code
      const up = []; Object.entries(PACKS()).forEach(([Q, q])=>{ if(Q !== P && q.trips.includes(t)){ TS()['pa:' + Q] = Q; up.push({id:'pt:' + t + '@' + Q, type:'packtrip', trip:'pa:' + Q, tid:t, code:c, titre:(R[t]||{}).titre || ''}); } });
      if(up.length) putQuiet(up);
      // photos : recopiées vers le nouveau code (jamais perdues)
      const ids = new Set(); Object.values(R).forEach(r=>{ if(r && !r.deleted && (r.id === t || r.trip === t)) photoRefs(r).forEach(x=>ids.add(String(x))); });
      await photosCopy([...ids], old, c);
      M.spaces = M.spaces.filter(x=>x.code !== old || Object.values(TS()).includes(old)); (M.fold = M.fold || []).push({code:old, at:Date.now()});   // l’ancien code est effacé du serveur dans 2 mois
      persist(); try { await syncNow(); } catch(e){}
    } finally { cryptHide('🔑 Voyage retiré pour cette personne'); }
    if(!quiet){ toast('👥 C’est fait'); refresh(); }
  }
  async function packDel(P){
    const pk = PACKS()[P]; if(!pk) return;
    if(!(await uiConfirm(MSGT('Ne plus rien partager avec cette personne ?') + '\n\n' + (pk.who || '') + '\n\n' + MSGT('Elle garde sa copie de vos voyages mais ne reçoit plus rien.')))) return;
    for(const t of [...pk.trips]) await packRemoveTrip(P, t, true);
    try { await fetch(apiUrl(), {method:'DELETE', headers:{'X-Carnet-Code':await authCode(P)}}); } catch(e){}
    delete PACKS()[P]; delete TS()['pa:' + P]; M.spaces = (M.spaces||[]).filter(x=>x.code !== P); persist(); toast('👥 Partage arrêté'); refresh();
  }
  // copie de photos d’un code à un autre (photo du téléphone si présente, sinon celle du serveur)
  async function photosCopy(ids, from, to){
    let fail = 0;
    for(const id of ids) for(const v of [id, id + '.t']){
      try {
        let blob = null; try { const o = await IDB.get(v); if(o && o.blob){ await o.blob.slice(0, 1).arrayBuffer(); blob = o.blob; } } catch(e){ blob = null; }
        let u8;
        if(blob) u8 = new Uint8Array(await blob.arrayBuffer());
        else { const r = await fetch(photoApi() + '?id=' + encodeURIComponent(await sid(v, from)), {headers:{'X-Carnet-Code':await authCode(from)}}); if(!r.ok) continue; u8 = new Uint8Array(await r.arrayBuffer()); if(E2E) u8 = await unseal(u8, from); }
        const body = E2E ? await seal(u8, to) : u8;
        const up = await fetch(photoApi(), {method:'POST', headers:{'X-Carnet-Code':await authCode(to), 'X-Photo-Id':await sid(v, to), 'Content-Type':'image/jpeg'}, body:new Blob([body], {type:'image/jpeg'})});
        if(!up.ok && v === id) fail++;
      } catch(e){ if(v === id) fail++; }
    }
    return fail;
  }
  // compagnon : mes paquets → je rejoins les voyages listés, je suis les changements de code, je garde ma copie d’un voyage retiré
  async function packApply(){
    const mine = PACKS(), viaP = M.viaP || (M.viaP = {}), viaH = M.viaH || (M.viaH = {}); let n = 0;
    for(const r of list('packtrip', x=>TS()[x.trip] && !mine[TS()[x.trip]] && !(M.left || {})[x.tid])){
      const P = TS()[r.trip]; viaP[r.tid] = P; if(!viaH[r.tid]) viaH[r.tid] = await viaHash(r.tid, P);
      if(r.code && TS()[r.tid] !== r.code){ const prev = TS()[r.tid]; TS()[r.tid] = r.code; if(!spaceObj(r.code)) (M.spaces = M.spaces || []).push({code:r.code, since:0, dirty:[], last:0, err:''});
        if(prev && !Object.values(TS()).includes(prev)) M.spaces = (M.spaces||[]).filter(x=>x.code !== prev); n++; } }
    for(const r of Object.values(R).filter(x=>x && x.type === 'packtrip' && x.deleted && TS()[x.trip] && !mine[TS()[x.trip]])){
      const tid = r.tid || String(r.id).slice(3).split('@')[0]; if(viaP[tid] !== TS()[r.trip] || !TS()[tid]) continue;
      if(await tripLeaveGo(tid, 'keep', true)){ delete viaP[tid]; delete viaH[tid]; n++; } }
    if(n) persist();
    return n;
  }
  // compagnon venu directement : l’auteur a changé le code du voyage → je suis le nouveau
  async function tripMoveCheck(){
    const me = devId(), done = M.tmoved || (M.tmoved = {});
    for(const m of list('tripmove', x=>x.dev === me && x.opk && x.ct && TS()[x.tid] && !(M.viaP||{})[x.tid])){
      const key = m.id + ':' + m.ct.slice(0, 12); if(done[key]) continue; done[key] = 1;
      try { const k = await fKey(), sk = await fShared(k.priv, m.opk);
        const c = new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM', iv:unb64(m.iv)}, sk, unb64(m.ct)));
        if(!/^[A-Z0-9-]{8,}$/.test(c) || TS()[m.tid] === c) continue;
        const prev = TS()[m.tid]; TS()[m.tid] = c; if(!spaceObj(c)) (M.spaces = M.spaces || []).push({code:c, since:0, dirty:[], last:0, err:''});
        if(prev && !Object.values(TS()).includes(prev)) M.spaces = (M.spaces||[]).filter(x=>x.code !== prev);
        persist(); } catch(e){} }
  }
  /* ══════════ 📩 Liens entre utilisateurs + boîte aux lettres (invitations directes dans l’appli) ══════════
     Chaque téléphone qui partage a une boîte aux lettres (un petit dossier chiffré sur le serveur, son code reste dans les
     voyages partagés et chez ses abonnés). Une fois qu’on a partagé une fois avec quelqu’un, on garde le lien
     (son téléphone, sa clé publique, sa boîte) : pour un nouveau voyage, l’invitation arrive directement dans son appli,
     chiffrée pour lui seul. Il choisit de rejoindre ou non. */
  function inbox(){
    if(!M.ib){ M.ib = genCode(); persist(); }
    if(!spaceObj(M.ib)) (M.spaces = M.spaces || []).push({code:M.ib, since:0, dirty:[], last:0, err:''});
    TS()['ib:' + M.ib] = M.ib; return M.ib;
  }
  const nmKey = x => String(x || '').trim().toLowerCase();
  function linksScan(){
    const me = devId(), L = M.links || (M.links = {}), F = M.flinks || (M.flinks = {}); let ch = 0;
    list('member', m=>m.dev !== me && m.on && m.pk && m.ib).forEach(m=>{
      const pid = m.pid && prof(m.pid) ? m.pid : (profiles().find(p=>p.id !== M.me && nmKey(p.nom) && nmKey(p.nom) === nmKey(m.who)) || {}).id;
      if(!pid || pid === M.me) return; const c = L[pid];
      if(!c || (m.at || 0) >= (c.at || 0) && (c.dev !== m.dev || c.ib !== m.ib || c.pk !== m.pk)){ L[pid] = {dev:m.dev, pk:m.pk, ib:m.ib, who:m.who || '', at:m.at || 0}; ch++; } });
    const mine = new Set(Object.keys(FT()).filter(t=>R[t] && !R[t].deleted).map(ftId));   // abonnés de MES publications seulement
    const F2 = {}; fwUniq(list('follower', f=>mine.has(f.trip) && f.pk && f.ib && !isBlk(f) && fwDevOf(f) !== me && !(M.blkDev||{})[fwDevOf(f)]))
      .forEach(f=>{ F2[fwDevOf(f)] = {who:fwLabel(f) || f.who || '?', pk:f.pk, ib:f.ib, at:(F[fwDevOf(f)] || {}).at || Date.now()}; });
    if(JSON.stringify(Object.keys(F2).sort().map(d=>[d, F2[d].who, F2[d].ib])) !== JSON.stringify(Object.keys(F).sort().map(d=>[d, F[d].who, F[d].ib]))){ M.flinks = F2; ch++; }
    const gone = M.goneDone || (M.goneDone = {}), out = [];
    list('member', m=>m.dev !== me && m.on === false && m.pid && m.pid !== M.me && !gone[m.id + ':' + (m.at || 0)]).forEach(m=>{
      gone[m.id + ':' + (m.at || 0)] = 1; ch++;
      const t = R[m.trip]; if(!t || t.deleted || !(t.voyageurs || []).includes(m.pid)) return;
      if(list('member', x=>x.trip === m.trip && x.on && x.pid === m.pid && (x.at || 0) > (m.at || 0)).length) return;   // revenu entre-temps (ou encore là sur un autre téléphone)
      out.push(Object.assign(clone(t), {voyageurs:(t.voyageurs || []).filter(p=>p !== m.pid)})); });
    if(out.length){ putQuiet(out); setTimeout(()=>{ try { refresh(); } catch(e){} }, 50); }
    if(ch) persist();
  }
  // dépose une invitation chiffrée dans la boîte de quelqu’un (sans garder sa boîte dans ma synchro)
  async function ivSend(lk, msg){
    if(!lk || !lk.pk || !lk.ib || lk.ib === M.ib) return false;
    const k = await fKey(), key = await fShared(k.priv, lk.pk), iv = crypto.getRandomValues(new Uint8Array(12));
    const from = myName() || (M.me && prof(M.me) ? pname(M.me) : '');
    const ct = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, new TextEncoder().encode(JSON.stringify(Object.assign({from, dev:devId(), ib:inbox(), pid:M.me || ''}, msg)))));
    const rec = {id:'iv:' + devId() + ':' + msg.k + ':' + msg.id, type:'invite', trip:'ib:' + lk.ib, dev:lk.dev, opk:k.pub, iv:b64(iv), ct:b64(ct), at:Date.now()};
    const had = spaceObj(lk.ib), sp = had || {code:lk.ib, since:0, dirty:[], last:0, err:''};
    if(!had) (M.spaces = M.spaces || []).push(sp);
    const hadTS = TS()['ib:' + lk.ib]; TS()['ib:' + lk.ib] = lk.ib;
    try { await spacePushOnly(sp, [rec]); }
    catch(e){ sp.err = sp.err || String(e && e.message || e); }
    finally { if(!had){ M.spaces = (M.spaces||[]).filter(x=>x !== sp); Object.keys(R).forEach(id=>{ const r = R[id]; if(r && r.trip === 'ib:' + lk.ib) delete R[id]; }); }
      if(!hadTS) delete TS()['ib:' + lk.ib]; persist(); }
    if(!sp.err) ivPush(lk.ib, msg.k === 'reply' ? (msg.ok ? 'iva' : 'ivr') : msg.k === 'follow' ? 'ivf' : 'iv', msg.t || '').catch(()=>{});
    return !sp.err;
  }
  // 🔔 notification sur le téléphone de la personne (si elle a activé les notifications) — chiffrée avec le code de sa boîte
  async function ivPush(ib, s, titre){
    if(!pushApi()) return; const kk = await keys(ib), kid = kk.token.slice(0, 16);
    const p = {k:'social', who: myName() || (M.me && prof(M.me) ? pname(M.me) : ''), trip:'', tt:'Vezoria', it:[{s, x: String(titre || '').slice(0, 120)}], n:1};
    const msg = b64(await seal(te.encode(JSON.stringify(p)), ib));
    await pushPost(ib, {a:'send', kind:'social', kid, msg, tag:'iv-' + s});
  }
  // voyage en ligne sur son propre code (accord demandé une fois), prêt à être rejoint
  async function tripOnline(tid){
    const t = R[tid]; if(!t || t.demo) return false;
    if(TS()[t.id] && spaceObj(TS()[t.id])) return true;
    if(!(await uiConfirm(MSGT('Envoyer « {0} » sur le serveur ?').replace('{0}', t.titre) + '\n' + MSGT('Pour inviter tes compagnons, le voyage et ses photos sont mis en ligne, chiffrés : seuls ceux qui reçoivent l’invitation peuvent les voir.')))) return false;
    if(cloudMode() === 'none'){ M.cloud = 'trips'; }
    const c = genCode(); (M.spaces = M.spaces || []).push({code:c, since:0, dirty:[], last:0, err:''}); TS()[t.id] = c;
    Object.values(R).filter(r=>!r.demo && (r.id === t.id || r.trip === t.id)).forEach(r=>markDirty(r.id)); persist();
    try { await photoQueueAll(t.id); } catch(e){}
    try { await syncNow(); uploadQueue(); } catch(e){}
    return true;
  }
  const inTrip = (tid, pid) => { const lk = (M.links||{})[pid]; return !!(lk && list('member', m=>m.trip === tid && m.on && m.dev === lk.dev).length); };
  async function tripInviteTo(tid, pids){
    const t = R[tid]; if(!t) return;
    const L = M.links || {}, dir = pids.filter(p=>L[p] && p !== M.me && !inTrip(tid, p)), oth = pids.filter(p=>!L[p] && p !== M.me);
    if(dir.length){
      if(!(await tripOnline(tid))) return;
      let ok = [], ko = [];
      for(const p of dir){ try { (await ivSend(L[p], {k:'trip', id:tid, c:TS()[tid], t:t.titre || ''})) ? ok.push(p) : ko.push(p); } catch(e){ ko.push(p); } }
      if(ok.length){   // en attente de réponse : elle n’entre dans les voyageurs qu’en acceptant
        const pend = (M.ivPend = M.ivPend || {})[tid] = Object.assign({}, (M.ivPend || {})[tid] || {});
        ok.forEach(p=>{ pend[p] = {dev:L[p].dev, at:Date.now(), st:'wait'}; });
        const cur = R[tid]; if(cur && (cur.voyageurs || []).some(p=>ok.includes(p))) putQuiet([Object.assign(clone(cur), {voyageurs:(cur.voyageurs || []).filter(p=>!ok.includes(p))})]);
        persist(); }
      if(ok.length) toast('📩 ' + MSGT('Invitation envoyée dans l’appli :') + ' ' + ok.map(pname).join(', '));
      if(ko.length) oth.push(...ko);
      refresh();
    }
    if(oth.length) setTimeout(()=>tripInviteNow(tid), dir.length ? 1200 : 0);   // les autres : QR code ou message
  }
  // compagnons ajoutés à un voyage déjà créé : on propose l’invitation directe
  async function inviteAdded(tid, pids){
    const L = M.links || {}, dir = (pids || []).filter(p=>p !== M.me && L[p] && !inTrip(tid, p)); if(!dir.length) return;
    if(!(await uiConfirm('📩 ' + MSGT('Envoyer l’invitation à {0} directement dans son appli ?').replace('{0}', dir.map(pname).join(', '))))) return;
    tripInviteTo(tid, dir);
  }
  // abonnés : prévenir ceux qui me suivent déjà qu’un nouveau voyage est publié
  function followInviteSheet(tid){
    const F = M.flinks || {}, ds = Object.keys(F).filter(d=>!(M.blkDev||{})[d]).sort((a, b)=>nmKey(F[a].who).localeCompare(nmKey(F[b].who))), t = R[tid];
    if(!ds.length || !t) return false;
    openSheet(`<h2>📩 Prévenir mes abonnés</h2>
      <div class="v-sum-small" style="margin-bottom:8px">Ils reçoivent « ${esc(t.titre || '')} » directement dans leur appli et choisissent de le suivre.</div>
      <label class="cv-checkline"><input type="checkbox" id="fi-all" checked onchange="document.querySelectorAll('.fi-d').forEach(x=>x.checked=this.checked)"> <b>Tout le monde</b></label>
      ${ds.map(d=>`<label class="cv-checkline"><input type="checkbox" class="fi-d" value="${esc(d)}" checked> <span data-notr>${esc(F[d].who || '?')}</span></label>`).join('')}
      <div class="v-actions" style="flex-direction:column"><button type="button" class="v-btn" onclick="CV.followInviteGo('${tid}')">📩 Envoyer dans l’appli</button>
        <button type="button" class="v-btn sec" onclick="CV.close();CV.feedShareLink('${tid}')">🔗 Partager le lien à d’autres</button>
        <button type="button" class="v-btn sec" onclick="CV.close()">Plus tard</button></div>`);
    return true;
  }
  async function followInviteGo(tid){
    const F = M.flinks || {}, t = R[tid], ds = [...document.querySelectorAll('.fi-d:checked')].map(x=>x.value); closeSheet(true);
    if(!t || !FT()[tid] || !ds.length) return;
    let n = 0; for(const d of ds){ try { if(await ivSend(Object.assign({dev:d}, F[d]), {k:'follow', id:tid, c:FT()[tid], t:t.titre || ''})) n++; } catch(e){} }
    toast(n ? '📩 ' + MSGT('Abonnés prévenus :') + ' ' + n : '⚠️ ' + MSGT('Envoi impossible pour le moment'));
  }
  // invitations reçues dans ma boîte
  let ivLater = {}, ivOpen = false;
  async function inviteCheck(n){
    if(!M.ib || !M.fkey || ivOpen) return;
    const me = devId(), done = M.ivDone || (M.ivDone = {}), k = await fKey(), todo = [];
    for(const r of list('invite', x=>x.dev === me && x.ct && x.opk && TS()[x.trip] === M.ib)){
      const key = r.id + ':' + r.ct.slice(0, 12); if(done[key] || ivLater[key]) continue;
      let m = null; try { const sk = await fShared(k.priv, r.opk); m = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM', iv:unb64(r.iv)}, sk, unb64(r.ct)))); } catch(e){}
      if(m && m.k === 'reply'){ done[key] = 1; putQuiet([Object.assign(clone(r), {deleted:true})]); ivReply(m); continue; }
      if(!m || !/^[A-Z0-9-]{8,}$/.test(m.c || '')){ done[key] = 1; continue; }
      const already = m.k === 'follow' ? list('feedtrip', f=>TS()[f.id] === m.c && !f.deleted).length : Object.values(TS()).includes(m.c);
      if(already){ done[key] = 1; putQuiet([Object.assign(clone(r), {deleted:true})]); continue; }
      todo.push({r, key, m}); }
    persist(); if(!todo.length) return;
    if(document.getElementById('v-sheet-bg') || document.querySelector('.ui-dlg, #cv-gate, #cv-world, #qr-ov')){ if((n || 0) < 60) setTimeout(()=>inviteCheck((n || 0) + 1), 2000); return; }
    const {r, key, m} = todo[0]; ivOpen = true;
    const who = esc(m.from || '?'), ttl = esc(m.t || '');
    openSheet(`<h2>📩 Invitation</h2>
      <div class="sh-k" style="font-size:1.05rem;margin:4px 0 12px"><b data-notr>${who}</b> · <span>${m.k === 'follow' ? 'te propose de suivre un voyage' : 't’invite dans un voyage'}</span><div style="margin-top:6px">🧳 <b data-notr>${ttl}</b></div></div>
      <div class="v-sum-small" style="margin-bottom:10px">${m.k === 'follow' ? 'Tu verras ses photos et récits au fil des étapes.' : 'Tu le verras et le compléteras avec tes compagnons. Tes autres voyages restent privés.'}</div>
      <div class="v-actions" style="flex-direction:column"><button type="button" class="v-btn" onclick="CV.inviteAnswer('${esc(key)}',1)">${m.k === 'follow' ? '👀 Suivre' : '✅ Rejoindre'}</button>
        <button type="button" class="v-btn sec" onclick="CV.inviteAnswer('${esc(key)}',0)">Plus tard</button>
        <button type="button" class="v-btn sec" onclick="CV.inviteAnswer('${esc(key)}',-1)">✕ Refuser</button></div>`, true);
    inviteCheck.cur = {r, key, m};
  }
  // réponse à MON invitation : oui → elle arrive dans le voyage ; non → je le vois
  function ivReply(m){
    const pend = (M.ivPend || {})[m.id]; if(!pend) return;
    const pid = Object.keys(pend).find(p=>pend[p].dev === m.dev) || (m.pid && pend[m.pid] ? m.pid : ''); if(!pid) return;
    if(m.ok){ delete pend[pid];
      const t = R[m.id]; if(t && !t.deleted && !(t.voyageurs || []).includes(pid) && prof(pid)) putQuiet([Object.assign(clone(t), {voyageurs:[...(t.voyageurs || []), pid]})]);   // elle a dit oui : elle entre dans les voyageurs
      toast('✅ ' + (m.from || pname(pid)) + ' · ' + MSGT('a accepté l’invitation')); }
    else { pend[pid] = Object.assign(pend[pid], {st:'no', at:Date.now()}); toast('✕ ' + (m.from || pname(pid)) + ' · ' + MSGT('a refusé l’invitation')); }
    if(!Object.keys(pend).length) delete M.ivPend[m.id];
    persist(); refresh();
  }
  // bandeau du voyage : invitations en attente / refusées
  function pendBar(){
    const tid = M.trip, pend = (M.ivPend || {})[tid]; if(!pend) return '';
    const t = R[tid] || {}, v = t.voyageurs || [];
    Object.keys(pend).forEach(p=>{ if(v.includes(p) || inTrip(tid, p) || !prof(p)) delete pend[p]; });
    const ks = Object.keys(pend); if(!ks.length){ delete M.ivPend[tid]; return ''; }
    return `<div class="v-sum cv-pend">${ks.map(p=>`<div class="cv-pend-r"><span>${pend[p].st === 'no' ? '✕' : '⏳'} ${pchip(p)} <small>${pend[p].st === 'no' ? 'a refusé l’invitation' : 'en attente de réponse'}</small></span>
      <span>${pend[p].st === 'no' ? '' : `<button type="button" class="v-day-edit" onclick="CV.pendAgain('${tid}','${p}')">🔁 Relancer</button>`}<button type="button" class="v-day-edit" onclick="CV.pendDrop('${tid}','${p}')" title="Retirer" aria-label="Retirer">✕</button></span></div>`).join('')}</div>`;
  }
  async function pendAgain(tid, p){ const t = R[tid], lk = (M.links || {})[p]; if(!t || !lk) return;
    const ok = await ivSend(lk, {k:'trip', id:tid, c:TS()[tid], t:t.titre || ''}).catch(()=>false);
    if(ok){ M.ivPend[tid][p].at = Date.now(); persist(); toast('📩 ' + MSGT('Invitation envoyée dans l’appli :') + ' ' + pname(p)); } else toast('⚠️ ' + MSGT('Envoi impossible pour le moment')); }
  function pendDrop(tid, p){ const pend = (M.ivPend || {})[tid]; if(pend){ delete pend[p]; if(!Object.keys(pend).length) delete M.ivPend[tid]; persist(); refresh(); } }
  async function inviteAnswer(key, a){
    const cur = inviteCheck.cur; ivOpen = false; inviteCheck.cur = null; closeSheet(true);
    if(!cur || cur.key !== key) return;
    if(a === 0){ ivLater[key] = 1; return; }
    (M.ivDone = M.ivDone || {})[key] = 1; putQuiet([Object.assign(clone(cur.r), {deleted:true})]); persist();
    if(cur.m.ib && cur.r.opk && cur.m.k === 'trip') ivSend({dev:cur.m.dev, pk:cur.r.opk, ib:cur.m.ib}, {k:'reply', id:cur.m.id, ok:a === 1, t:cur.m.t || ''}).catch(()=>{});   // l’auteur sait si c’est oui ou non
    if(a === 1){ if(cur.m.k === 'follow') await followGo(cur.m.c); else await joinCodeGo(cur.m.c, t=>toast(t)); }
    setTimeout(()=>inviteCheck().catch(()=>{}), 1500);
  }
  // 🚪 quitter un voyage partagé : d’abord le choix pour SES photos (droit à l’image), puis le départ
  function tripUnshare(id, drop){
    const t = R[id]; if(!t) return; drop = drop ? 1 : 0;
    const mineT = !t.createdBy || t.createdBy === M.me, owner = t.createdBy && prof(t.createdBy) ? pname(t.createdBy) : 'quelqu’un d’autre';
    const code = TS()[id], on = code && spaceObj(code);
    const mine = on ? Object.values(R).filter(r=>r && !r.deleted && r.trip === id && r.type !== 'member' && photoRefs(r).length && r.createdBy && r.createdBy === M.me) : [];
    const nPh = mine.reduce((s, r)=>s + photoRefs(r).length, 0), others = on ? mbOthers(id) : [];
    openSheet(`<h2>${drop ? '🗑 Supprimer' : '🚪 Quitter'} « <span data-notr>${esc(t.titre)}</span> »</h2>
      <div class="v-sum-small" style="margin-bottom:10px">${drop ? (mineT && !(M.viaP || {})[id] ? 'Tes compagnons le gardent : le voyage continue pour eux. Il est retiré de ton téléphone seulement.' : `<span data-notr>${esc(owner)}</span> · <span>a créé ce voyage : il reste chez tes compagnons. Il est retiré de ton téléphone seulement.</span>`) : `Ton voyage reste sur ce téléphone avec toutes ses photos${M.sync.on && M.sync.code ? ' (et dans ton carnet en ligne)' : ''}. Tu ne recevras plus les modifications des autres.`}</div>
      ${nPh ? `<div class="sh-k" style="font-size:1.05rem;margin-bottom:6px">📸 Tes photos dans ce voyage : <b data-notr>${nPh}</b></div>
        <button type="button" class="cv-choice" onclick="CV.tripLeaveGo('${id}','keep',0,${drop})"><i>🤝</i><span><b>Les laisser aux autres</b><small>Tes compagnons gardent les souvenirs et photos que tu as ajoutés.</small></span></button>
        <button type="button" class="cv-choice" onclick="CV.tripLeaveGo('${id}','take',0,${drop})"><i>🎒</i><span><b>Partir avec mes photos</b><small>Les souvenirs et photos que tu as ajoutés sont retirés du voyage partagé (et du serveur). Tu les gardes chez toi.</small></span></button>`
      : `<button type="button" class="v-btn" onclick="CV.tripLeaveGo('${id}','keep',0,${drop})">${drop ? '🗑 Quitter et retirer de mon téléphone' : '🚪 Quitter le voyage partagé'}</button>`}
      ${on && !others.length ? `<div class="v-sum-small" style="margin-top:8px">ℹ️ Personne d’autre n’a ouvert ce voyage depuis 2 mois : tu pourras effacer son dossier du serveur.</div>` : ''}
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Annuler</button></div>`);
  }
  async function tripLeaveGo(id, mode, silent, drop){
    const code = TS()[id], sp = code && spaceObj(code); if(!silent) closeSheet(true);
    if(sp && photoApi()){
      // 1) toutes les photos du voyage reviennent (dans le carnet principal s’il est synchronisé, sinon sur ce téléphone)
      const res = await tripPhotosHome(id, code);
      if(res.fail && (silent || !(await uiConfirm(MSGT('{0} photo(s) n’ont pas pu être récupérées (pas de réseau ?).').replace('{0}', res.fail) + '\n\n' + MSGT('OK = quitter quand même (elles restent dans le voyage partagé, pas chez toi). Annuler = réessayer plus tard.'))))) return false;
      try {
        const push = [];
        // 2) « partir avec mes photos » : mes souvenirs et photos sont retirés du voyage partagé (je les garde ici)
        let gone = [];
        if(mode === 'take'){
          const mine = Object.values(R).filter(r=>r && !r.deleted && r.trip === id && r.type !== 'member' && photoRefs(r).length && r.createdBy && r.createdBy === M.me);
          mine.forEach(r=>push.push(Object.assign(clone(r), {deleted:true})));
          gone = mine.flatMap(photoRefs);
          // 🫙 pot commun : mes compagnons perdent le droit de lecture de mes photos, et les copies rangées dans le voyage partent
          gone.forEach(p=>{ const pk = R['pk:' + p]; if(pk) push.push(Object.assign(clone(pk), {deleted:true})); });
          for(const o of (res.v2old || [])) if(gone.includes(o.id)) for(const v of [o.ref.i, o.ref.it].filter(Boolean)){ try { await fetch(photoApi() + '?id=' + encodeURIComponent(v), {method:'DELETE', headers:{'X-Carnet-Code':await authCode(code)}}); } catch(e){} }
        }
        // 3) ma présence passe à « parti »
        const mb = 'mb:' + id + ':' + devId(); push.push({id:mb, type:'member', trip:id, dev:devId(), who:(R[mb] && R[mb].who) || myName() || '', at:Date.now(), on:false, pid:M.me || ''});
        // je ne suis plus dans les voyageurs chez les autres (ma copie à moi me garde)
        const t0 = R[id]; if(t0 && M.me && (t0.voyageurs || []).includes(M.me)) push.push(Object.assign(clone(t0), {voyageurs:(t0.voyageurs || []).filter(p=>p !== M.me)}));
        await spacePushOnly(sp, push);
        if(gone.length){ cryptShow('🎒 Je retire tes photos du voyage partagé…');
          for(const p of gone) for(const v of [p, p + '.t']){ try { await fetch(photoApi() + '?id=' + encodeURIComponent(await sid(v, code)), {method:'DELETE', headers:{'X-Carnet-Code':await authCode(code)}}); } catch(e){} }
          cryptHide('🎒 Tes photos sont retirées du voyage partagé'); }
        // 4) dernier à partir : le dossier du voyage ne sert plus à personne → on propose de l’effacer
        if(!silent && !mbOthers(id).length && !Object.values(FT()).includes(code) && (await uiConfirm(MSGT('Personne d’autre n’utilise ce voyage partagé depuis 2 mois.') + '\n\n' + MSGT('Effacer aussi son dossier du serveur ? (recommandé : ton voyage et ses photos restent chez toi)')))){
          const r = await fetch(apiUrl(), {method:'DELETE', headers:{'X-Carnet-Code':await authCode(code)}}); if(r.ok) toast('🗑 Dossier du voyage partagé effacé du serveur');
        }
      } catch(e){ /* sans réseau : on part quand même, rien n’est perdu chez moi */ }
    }
    delete TS()[id];
    (M.mvSkip = M.mvSkip || {})[id] = 1; if(R['mv:' + id] && !R['mv:' + id].deleted) putQuiet([Object.assign(clone(R['mv:' + id]), {deleted:true})]);   // plus de « déménagement » : les autres appareils ne le rejoignent plus d’eux-mêmes
    if(code && !Object.values(TS()).includes(code)) M.spaces = (M.spaces||[]).filter(x=>x.code!==code);
    M.pq = (M.pq||[]).filter(x=>photoCode(x) !== code);
    Object.values(R).filter(r=>r && r.type === 'member' && r.trip === id).forEach(r=>{ delete R[r.id]; });   // la présence ne part pas dans mon carnet
    if(drop){   // « supprimer » un voyage créé par un autre : retiré de ce téléphone seulement (plus relié au dossier partagé)
      (M.left = M.left || {})[id] = 1;   // un paquet de voyages ne le fait pas revenir tout seul
      Object.values(R).forEach(r=>{ if(r && r.type === 'phk' && r.trip === id) delete R[r.id]; });   // 🫙 liens des photos : oubliés ici seulement (les photos restent pour les autres)
      const t = R[id], out = Object.values(R).filter(r=>r && r.trip === id && !r.deleted); out.forEach(r=>r.deleted = true);
      if(t){ t.deleted = true; out.push(t); }
      putMany(out, '🗑 ' + MSGT('Voyage retiré de ton téléphone')); M.trip = null; applyMode(); return true;
    }
    Object.values(R).filter(r=>!r.demo && (r.id===id || r.trip===id)).forEach(r=>markDirty(r.id));
    (M.cloudAsked = M.cloudAsked || {})[id] = Date.now();   // pas de question « mettre ce nouveau voyage dans le cloud ? » pour une copie qu’on garde
    if(cloudMode() === 'trips' && !(M.sync.on && M.sync.code)) { try { cloudSpace(id); } catch(e){} }   // rangé voyage par voyage : la copie va dans SON cloud privé
    persist(); refresh(); queueSync(); toast(silent ? '📦 Un voyage n’est plus partagé avec toi : tu gardes ta copie' : '🚪 Tu as quitté le voyage partagé');
    return true;
  }
  function tripJoin(){
    const hosted = /^https?:/.test(location.protocol);
    openSheet(`<h2>🔗 Rejoindre un voyage partagé</h2><div class="v-sum-small" style="margin-bottom:8px">Colle le <b>code du voyage</b> reçu : ce voyage s’ajoute à tes voyages, sans rien partager des tiens.</div>
      ${hosted || M.sync.url ? '' : `<div class="v-f"><label>Adresse de l’appli en ligne</label><input class="v-in" id="tj-url" placeholder="https://carnet-voyage.pages.dev"></div>`}
      ${qrBtn('tj-code')}<div class="v-f"><label>Code du voyage</label><input class="v-in" id="tj-code" placeholder="XXXX-XXXX-XXXX" autocapitalize="characters" autocomplete="off"></div>
      <div id="tj-msg" class="v-sum-small"></div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.tripJoinGo()">🔗 Rejoindre</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  async function tripJoinGo(){
    const code = invCode(document.getElementById('tj-code').value), u = document.getElementById('tj-url'), msg = document.getElementById('tj-msg');
    if(code.length < 8){ msg.textContent = 'Colle le code complet (au moins 8 caractères).'; return; }
    if(u && u.value.trim()) M.sync.url = u.value.trim();
    if(code === M.sync.code){ msg.textContent = 'C’est le code de ton carnet principal : tu as déjà ces voyages.'; return; }
    if(!spaceObj(code)) (M.spaces = M.spaces || []).push({code, since:0, dirty:[], last:0, err:''});
    msg.textContent = '📡 Connexion…';
    const sp = spaceObj(code); await syncSpace(sp, true);
    if(sp.err){ msg.textContent = '⚠️ ' + sp.err; return; }
    const got = Object.entries(TS()).filter(([,c])=>c===code).map(([tid])=>R[tid]).filter(t=>t && !t.deleted);
    if(!got.length){ M.spaces = M.spaces.filter(x=>x.code!==code); persist(); msg.textContent = 'Aucun voyage trouvé avec ce code. Vérifie-le auprès de la personne qui te l’a envoyé.'; return; }
    M.spaces = (M.spaces||[]).filter(x=>x.code === code || Object.values(TS()).includes(x.code));   // ancien code mort : on l’oublie
    persist(); closeSheet(true); go(got[0].id); refresh();
    joinPick(code);
  }
  /* ---------- 🙋 Après avoir rejoint : qui es-tu, et dans quels voyages pars-tu vraiment ? (budget, dépenses, « qui doit quoi ») ---------- */
  /* ---------- 👥 Nouveau voyage : avec qui pars-tu ? Le voyage arrive chez eux (avec une notification) ---------- */
  // les personnes que je connais, et par quel carnet partagé chacune peut recevoir un voyage
  function spaceMembers(){
    const m = {};
    trips().filter(t=>!t.demo && !t.deleted).forEach(t=>{ const c = TS()[t.id] && spaceObj(TS()[t.id]) ? TS()[t.id] : (M.sync.on && M.sync.code ? 'main' : ''); if(!c) return;
      if(Object.values(FT()).includes(c)) return; (m[c] = m[c] || new Set()); (t.voyageurs || []).forEach(p=>m[c].add(p)); });
    return m;
  }
  function withWhom(tid, n){
    const t = R[tid]; if(!t || t.deleted || M.wwSeen && M.wwSeen[tid]) return;
    // une fenêtre est ouverte (ex. « Modifier le voyage ») : on attend qu’elle soit fermée (2 min au plus)
    if(document.getElementById('v-sheet-bg') || document.querySelector('.ui-dlg, #cv-gate, #cv-world')){ if((n || 0) < 80) setTimeout(()=>withWhom(tid, (n || 0) + 1), 1500); return; }
    M.wwSeen = Object.assign({}, M.wwSeen || {}, {[tid]:1}); persist();
    const me = M.me, ppl = profiles().filter(p=>p.id !== me).map(p=>p.id), v = new Set(t.voyageurs || []);
    openSheet(`<h2>👥 Avec qui pars-tu ?</h2><div class="v-sum-small" style="margin-bottom:8px">« ${esc(t.titre)} » arrive chez tes compagnons, qui reçoivent une notification. Ils pourront le compléter avec toi.</div>
      ${ppl.length ? `<div class="jp-who">${ppl.map(pid=>`<label class="jp-p"><input type="checkbox" class="ww-p" value="${pid}"${v.has(pid) ? ' checked' : ''} onchange="CV.withWhomUpd('${tid}')"> ${pchip(pid)}</label>`).join('')}</div>` : `<div class="v-sum-small">Tu n’as pas encore de compagnon dans Vezoria.</div>`}
      <div id="ww-msg" class="v-sum-small" style="margin:8px 0"></div>
      <div class="v-actions" style="flex-direction:column">${ppl.length ? `<button type="button" class="v-btn" onclick="CV.withWhomGo('${tid}')">✅ Partager avec eux</button>` : ''}
        <button type="button" class="v-btn sec" onclick="CV.close();CV.tripInviteNow('${tid}')">📤 Inviter quelqu’un de nouveau</button>
        <button type="button" class="v-btn sec" onclick="CV.close()">🧍 Je pars seul(e) / plus tard</button></div>`);
    withWhomUpd(tid);
  }
  // le meilleur carnet partagé pour ces personnes : tout le monde dedans, le moins d’autres personnes possible
  function withWhomPick(sel){
    const m = spaceMembers(), me = M.me; let best = null;
    Object.entries(m).forEach(([c, mem])=>{ if(c !== 'main' || !sel.every(p=>mem.has(p))) return;   // un voyage n’est jamais glissé dans le dossier d’un autre voyage const extra = [...mem].filter(p=>p !== me && !sel.includes(p));
      if(!best || extra.length < best.extra.length || (extra.length === best.extra.length && c === 'main')) best = {c, extra}; });
    return best;
  }
  function withWhomUpd(tid){
    const el = document.getElementById('ww-msg'); if(!el) return;
    const sel = [...document.querySelectorAll('.ww-p:checked')].map(i=>i.value); if(!sel.length){ el.textContent = ''; return; }
    const b = withWhomPick(sel);
    const L = M.links || {}, dir = sel.filter(p=>L[p]), oth = sel.filter(p=>!L[p]);
    el.innerHTML = !b ? (dir.length ? '<div>📩 ' + esc(dir.map(pname).join(', ')) + ' recevra l’invitation directement dans l’appli.</div>' : '')
        + (oth.length ? '<div>📤 ' + esc(oth.map(pname).join(', ')) + ' : pas encore relié(e) à toi, invitation par QR code ou message.</div>' : '')
      : b.extra.length ? '👀 ' + esc(b.extra.map(pname).join(', ')) + ' le verra aussi (même carnet partagé).' : '✓ Le voyage arrivera chez eux à la prochaine synchro.';
  }
  async function withWhomGo(tid){
    const t = R[tid]; if(!t) return;
    const sel = [...document.querySelectorAll('.ww-p:checked')].map(i=>i.value); if(!sel.length){ closeSheet(true); return; }
    const nt = Object.assign(clone(t), {voyageurs:[...new Set([...(t.voyageurs || []), M.me, ...sel].filter(Boolean))]});
    const b = withWhomPick(sel);
    if(!b){ put(nt, false); closeSheet(true); tripInviteTo(tid, sel); return; }   // pas de carnet commun : invitation directe (ou QR / message)
    put(nt, '👥 Voyage partagé avec ' + sel.map(pname).join(', '));
    Object.values(R).filter(r=>!r.demo && (r.id === tid || r.trip === tid)).forEach(r=>markDirty(r.id));
    persist(); closeSheet(true); queueSync(); try { photoQueueAll(tid); } catch(e){} refresh();
  }
  /* ══════════ 📷 Scanner un QR code d’invitation (caméra en direct) ══════════
     Lecture : BarcodeDetector quand le téléphone l’a (Android/Chrome), sinon jsQR (vendor/jsqr.min.js, chargé au premier scan).
     Si la caméra est refusée ou indisponible : photo du QR code à la place. Le texte lu remplit le champ puis lance l’action. */
  let qrSt = null; window.addEventListener('pagehide', ()=>qrStop());
  const QR_GO = {'ja-code':()=>joinAnyGo(), 'tj-code':()=>tripJoinGo(), 'cv-scode':()=>obJoin(), 'cv-fcode':()=>{ const n = document.getElementById('cv-fnom'); if(n && n.value.trim()) obFollow(); else if(n) n.focus(); }, 'fw-code':()=>followGo(document.getElementById('fw-code').value)};
  async function qrDecoder(){
    try { if('BarcodeDetector' in window && (await BarcodeDetector.getSupportedFormats()).includes('qr_code')){ const d = new BarcodeDetector({formats:['qr_code']}); return async src => { const r = await d.detect(src); return r[0] ? r[0].rawValue : ''; }; } } catch(e){}
    if(!window.jsQR) await new Promise((res, rej)=>{ const sc = document.createElement('script'); sc.src = (window.VZ_B || '') + 'vendor/jsqr.min.js'; sc.onload = res; sc.onerror = ()=>rej(new Error(MSGT('Lecteur de QR code indisponible (pas de réseau ?)'))); document.head.appendChild(sc); });
    const cv = document.createElement('canvas'), cx = cv.getContext('2d', {willReadFrequently:true});
    return async src => { const w0 = src.videoWidth || src.naturalWidth || src.width, h0 = src.videoHeight || src.naturalHeight || src.height; if(!w0) return '';
      const k = Math.min(1, 800 / Math.max(w0, h0)); cv.width = Math.round(w0 * k); cv.height = Math.round(h0 * k); cx.drawImage(src, 0, 0, cv.width, cv.height);
      const r = window.jsQR(cx.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height, {inversionAttempts:'attemptBoth'}); return r ? r.data : ''; };
  }
  function qrFound(id, txt){
    qrStop(); const el = document.getElementById(id); if(!el) return;
    if(id === 'fw-code' || id === 'tj-code'){ const m = txt.match(/(?:suivre|rejoindre)=([A-Za-z0-9-]{8,})/i) || txt.match(/\b([A-Z0-9]{4}(?:-[A-Z0-9]{4}){2,})\b/i); if(m) txt = m[1].toUpperCase(); }
    el.value = txt; try { navigator.vibrate && navigator.vibrate(60); } catch(e){}
    toast('✅ ' + MSGT('QR code lu')); if(QR_GO[id]) setTimeout(QR_GO[id], 250);
  }
  function qrStop(){
    const st = qrSt; qrSt = null; if(!st) return; st.off = true; clearTimeout(st.t);
    try { st.stream && st.stream.getTracks().forEach(t=>t.stop()); } catch(e){}
    const o = document.getElementById('qr-ov'); if(o) o.remove();
  }
  async function qrScan(id){
    qrStop();
    const o = document.createElement('div'); o.id = 'qr-ov'; o.className = 'qr-ov';
    o.innerHTML = `<video playsinline muted autoplay></video><div class="qr-frame"></div>
      <div class="qr-top"><span>${esc(MSGT('Vise le QR code de l’invitation'))}</span><button type="button" class="qr-x" onclick="CV.qrStop()" title="${esc(MSGT('Fermer'))}" aria-label="${esc(MSGT('Fermer'))}">✕</button></div>
      <div class="qr-msg" id="qr-msg" data-notr></div>
      <label class="v-btn sec qr-ph">🖼️ ${esc(MSGT('Lire le QR code sur une photo'))}<input type="file" accept="image/*" hidden onchange="CV.qrPhoto(this,'${id}')"></label>`;
    document.body.appendChild(o);
    const st = qrSt = {id}, msg = t => { const m = document.getElementById('qr-msg'); if(m) m.textContent = t; };
    let dec; try { dec = await qrDecoder(); } catch(e){ msg(e.message); return; }
    st.dec = dec; if(st.off) return;
    if(!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)){ msg(MSGT('La caméra en direct n’est pas disponible ici : prends le QR code en photo.')); return; }
    try { st.stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}, width:{ideal:1280}, height:{ideal:720}}, audio:false}); }
    catch(e){ msg(MSGT('Accès à la caméra refusé. Autorise l’appareil photo pour Vezoria dans les réglages du téléphone, ou prends le QR code en photo.')); return; }
    if(st.off){ st.stream.getTracks().forEach(t=>t.stop()); return; }
    const v = o.querySelector('video'); v.srcObject = st.stream; try { await v.play(); } catch(e){}
    const tick = async () => { if(st.off) return; let txt = ''; try { if(v.readyState >= 2) txt = await dec(v); } catch(e){}
      if(st.off) return; if(txt) qrFound(id, txt); else st.t = setTimeout(tick, 220); };
    tick();
  }
  async function qrPhoto(inp, id){
    const f = inp.files && inp.files[0]; if(!f) return; const m = document.getElementById('qr-msg');
    try { const dec = (qrSt && qrSt.dec) || await qrDecoder(); const img = new Image(), u = URL.createObjectURL(f);
      await new Promise((res, rej)=>{ img.onload = res; img.onerror = rej; img.src = u; }); const txt = await dec(img); URL.revokeObjectURL(u);
      if(txt) qrFound(id, txt); else if(m) m.textContent = MSGT('Aucun QR code trouvé sur cette photo.'); }
    catch(e){ if(m) m.textContent = MSGT('Aucun QR code trouvé sur cette photo.'); }
  }
  const qrBtn = id => `<button type="button" class="v-btn sec qr-btn" onclick="CV.qrScan('${id}')">📷 Scanner le QR code</button>`;
  // un seul champ pour tout : lien ou code de voyage, de carnet ou d’abonné
  function joinAny(){
    openSheet(`<h2>🔗 Rejoindre avec un code</h2>${qrBtn('ja-code')}<div class="v-sum-small" style="margin-bottom:8px">Ou colle le message, le lien ou le code reçu.</div>
      <textarea class="v-in" id="ja-code" rows="3" placeholder="XXXX-XXXX-XXXX ou le lien reçu"></textarea>
      ${navigator.clipboard && navigator.clipboard.readText ? `<button type="button" class="v-day-edit" style="margin-top:6px" onclick="CV.joinPaste()">📋 Coller</button>` : ''}
      <div id="ja-msg" class="v-sum-small" style="margin-top:6px"></div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.joinAnyGo()">🔗 Rejoindre</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  async function joinPaste(){ try { const t = await navigator.clipboard.readText(); const e = document.getElementById('ja-code'); if(e && t) e.value = t; } catch(e){ toast('Touche longuement la zone de texte → Coller'); } }
  async function joinAnyGo(){
    const raw = (document.getElementById('ja-code') || {}).value || '', msg = document.getElementById('ja-msg');
    const fm = raw.match(/suivre=([A-Za-z0-9-]{8,})/i); if(fm){ closeSheet(true); followGo(fm[1].toUpperCase()); return; }
    const cm = raw.match(/rejoindre=([A-Za-z0-9-]{8,})/i) || raw.match(/\b([A-Z0-9]{4}(?:-[A-Z0-9]{4}){2,})\b/i);
    const code = cm ? cm[1].toUpperCase() : raw.trim().toUpperCase();
    if(code.length < 8){ msg.textContent = 'Colle le code complet (au moins 8 caractères).'; return; }
    if(code === M.sync.code){ msg.textContent = 'C’est le code de ton propre carnet : tu as déjà ces voyages.'; return; }
    if(Object.values(FT()).includes(code)){ msg.textContent = 'C’est ton propre lien d’abonnés.'; return; }
    return joinCodeGo(code, t=>{ msg.textContent = t; });
  }
  async function joinCodeGo(code, say){
    const msg = {set textContent(t){ say(t); }};
    msg.textContent = '📡 Connexion…';
    if(!spaceObj(code)) (M.spaces = M.spaces || []).push({code, since:0, dirty:[], last:0, err:''});
    const sp = spaceObj(code); try { await syncSpace(sp, true); } catch(e){}
    if(sp.err){ msg.textContent = '⚠️ ' + sp.err; return; }
    { const xf = list('xfer', r=>r.trip === 'xf:' + code)[0]; if(xf){ await xferApply(xf, code); return; } }
    if(list('packtrip', r=>TS()[r.trip] === code).length){   // paquet de voyages : on rejoint chacun d’eux
      msg.textContent = '📡 Voyages partagés…';
      if(M.left) list('packtrip', r=>TS()[r.trip] === code).forEach(r=>{ delete M.left[r.tid]; });   // rejoindre exprès : les voyages quittés reviennent
      await packApply(); const codes = [...new Set(list('packtrip', r=>TS()[r.trip] === code).map(r=>r.code))];
      for(const c of codes){ try { await syncSpace(spaceObj(c), true); } catch(e){} }
      persist(); closeSheet(true); refresh(); const first = Object.keys(TS()).find(k=>codes.includes(TS()[k]) && R[k] && R[k].type === 'trip'); if(first) go(first); joinPick(codes); return; }
    const got = Object.entries(TS()).filter(([, c])=>c === code).map(([tid])=>R[tid]).filter(t=>t && !t.deleted);
    if(got.some(t=>t.type === 'trip')){ persist(); closeSheet(true); go(got.find(t=>t.type === 'trip').id); refresh(); joinPick(code); return; }
    M.spaces = (M.spaces || []).filter(x=>x.code !== code); persist();
    closeSheet(true); followGo(code);   // pas de voyage à compléter : c’est peut-être un code d’abonné
  }
  function joinPick(code){
    const codes = [].concat(code); code = codes.join(',');
    const ts = Object.entries(TS()).filter(([, c])=>codes.includes(c)).map(([tid])=>R[tid]).filter(t=>t && !t.deleted && t.type === 'trip').sort((a, b)=>(a.debut||'9').localeCompare(b.debut||'9'));
    if(!ts.length) return;
    const ppl = [...new Set(ts.flatMap(t=>t.voyageurs || []))].filter(prof), me = M.me && prof(M.me) ? M.me : '';
    const meIn = me && ppl.includes(me);
    openSheet(`<h2>🙋 Bienvenue !</h2><div class="v-sum-small" style="margin-bottom:8px">${ts.length > 1 ? ts.length + ' voyages sont maintenant sur ton téléphone.' : 'Le voyage « ' + esc(ts[0].titre) + ' » est maintenant sur ton téléphone.'}</div>
      <div class="v-f"><label>Qui es-tu ?</label><div class="jp-who">
        ${ppl.map(pid=>`<label class="jp-p"><input type="radio" name="jp-me" value="${pid}"${pid === me ? ' checked' : ''}> ${pchip(pid)}</label>`).join('')}
        ${me && !meIn ? `<label class="jp-p"><input type="radio" name="jp-me" value="${me}" checked> ${pchip(me)} <small>(ton profil)</small></label>` : ''}
        <label class="jp-p"><input type="radio" name="jp-me" value="new"${!me ? ' checked' : ''}> ✏️ Je ne suis pas dans la liste : <input class="v-in" id="jp-nom" placeholder="Ton prénom" style="flex:1;min-width:0"></label></div></div>
      <div class="v-f"><label>Dans quels voyages pars-tu vraiment ?</label><div class="v-sum-small" style="margin-bottom:4px">Tu comptes alors dans le budget, les dépenses et « qui doit quoi ». Tu vois quand même tous les voyages.</div>
        ${ts.map(t=>`<label class="cv-checkline"><input type="checkbox" class="jp-t" value="${t.id}"${(me && (t.voyageurs||[]).includes(me)) || (ts.length === 1 && !(M.notTrav||{})[t.id]) ? ' checked' : ''}> <span data-notr>${esc(t.titre)}</span>${t.debut ? ' <small>' + esc(tripDatesLong(t)) + '</small>' : ''}</label>`).join('')}</div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.joinPickSave('${esc(code)}')">✅ C’est bon</button></div>`, true);
  }
  function joinPickSave(code){
    const r = document.querySelector('input[name=jp-me]:checked'); let me = r ? r.value : '';
    if(me === 'new' || !me){ const nom = ((document.getElementById('jp-nom') || {}).value || '').trim(); if(!nom){ alert('Indique ton prénom.'); return; }
      const cols = ['#2563eb','#db2777','#16a34a','#ea580c','#7c3aed','#0891b2','#ca8a04'], p = {id:'p' + uid(), type:'profile', nom, couleur:cols[profiles().length % cols.length]}; put(p, false); me = p.id; }
    if(R[me] && R[me].type === 'profile' && R[me].dev !== devId()) putQuiet([Object.assign(clone(R[me]), {dev:devId()})]);
    M.me = me; delete M.joinAdd;
    const on = new Set([...document.querySelectorAll('.jp-t:checked')].map(i=>i.value)), out = [], codes = String(code).split(',');
    Object.entries(TS()).filter(([, c])=>codes.includes(c)).map(([tid])=>R[tid]).filter(t=>t && !t.deleted && t.type === 'trip').forEach(t=>{
      const v = new Set(t.voyageurs || []), had = v.has(me); if(on.has(t.id)){ v.add(me); if(M.notTrav) delete M.notTrav[t.id]; } else { v.delete(me); (M.notTrav = M.notTrav || {})[t.id] = 1; }
      if(had !== v.has(me)) out.push(Object.assign(clone(t), {voyageurs:[...v]})); });
    if(out.length) putMany(out, false);
    persist(); closeSheet(true); applyMode(); refresh(); queueSync(); toast('👋 Bienvenue ' + pname(me) + ' !');
  }
  function tripWho(id){
    const t = R[id];
    openSheet(`<h2>👤 Qui es-tu dans « ${esc(t.titre)} » ?</h2><div class="v-sum-small" style="margin-bottom:8px">Pour signer tes ajouts et compter ta part du budget.</div>
      <div class="cv-plist">${(t.voyageurs||[]).filter(prof).map(pid=>`<button class="cv-prow" onclick="CV.tripWhoSet('${id}','${pid}')">${pchip(pid)}<span>C’est moi</span></button>`).join('')}</div>
      <button class="v-btn sec" style="margin-top:10px" onclick="CV.tripWhoSet('${id}','')">＋ Je n’y suis pas : m’ajouter${M.me && prof(M.me) ? ' (' + esc(pname(M.me)) + ')' : ''}</button>`, true);
  }
  function tripWhoSet(id, pid){
    if(!pid && !(M.me && prof(M.me))){ M.joinAdd = id; persist(); editProfile(null); return; }
    if(pid){ M.me = pid; persist(); }
    else { const t = clone(R[id]); t.voyageurs = [...new Set([...(t.voyageurs||[]), M.me])]; put(t, '👋 Tu es ajouté au voyage'); }
    closeSheet(true); applyMode(); refresh(); queueSync();
  }
  function tripSheet(){
    const cur = M.trip;
    openSheet(`<h2>Mes voyages</h2>
      <div class="cv-triplist">${tripListHTML(cur)}
        ${!PUBLIC && !(R.t2026 && !R.t2026.deleted) ? `<button class="cv-tripcard legacy" onclick="CV.convert2026()"><span class="tt">Road trip Europe</span><span class="td">juillet 2026 · touche pour le passer au nouveau format</span></button>` : ''}
      </div>
      <button class="v-btn" onclick="CV.newTrip()">＋ Préparer un nouveau voyage</button>
      ${demoBtn()}
      <button class="v-btn sec" onclick="CV.close();CV.shareHub()">👥 Partager, inviter, suivre</button>
      ${!PUBLIC && !(R.t2025 && !R.t2025.deleted) ? `<button class="v-btn sec" onclick="CV.seedUSA2025()">📦 Ajouter l’archive USA 2025</button>` : ''}
      ${ESCALE ? `<a class="v-btn sec cv-escale" href="${ESCALE}">✈️ Chercher des vols avec Escale</a><button class="v-btn sec" onclick="CV.escaleTuto()">🎓 Tuto Escale premium</button><button class="v-btn sec" onclick="CV.radarTuto()">✦ Tuto Radar des prix</button>` : ''}
      ${trip() ? `<button class="v-btn sec" onclick="CV.editTrip('${M.trip}')">✏️ Modifier « ${esc(trip().titre)} »</button>` : ''}
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">✕ Fermer</button></div>`);
    requestAnimationFrame(tripSheetScroll); setTimeout(tripCardsPaint, 30);
  }
  function buildTabs(){
    const g = groupOf(M.tab);
    const sub = document.getElementById('tabsC');
    const vt = g.tabs.filter(t=>t[0]===M.tab || ALWAYS[t[0]] || !hidden('tab:' + t[0]));
    if(!NAV_G[g.id]) vt.length = 0;
    const subH = vt.length > 1 ? vt.map(([id,l]) => `<button class="t27${id===M.tab?' active':''}" onclick="CV.tab('${id}')">${l}</button>`).join('') : '';
    if(sub.__h !== subH){ sub.innerHTML = subH; sub.__h = subH; }
    sub.style.display = vt.length > 1 ? 'flex' : 'none';
    buildNav();
  }
  /* ---------- 🧭 UNE SEULE barre de boutons, en bas ---------- */
  const NAV_G = {resas:1, sous:1};   // seuls ces deux groupes gardent leurs petits filtres sous l'en-tête
  /* Destinations qu'on peut épingler dans la barre du bas (4 maximum + « Plus ») */
  const DEST = [
    ['prog','🗓️','Programme'], ['resas','🎫','Résas'], ['sous','💸','Budget'], ['live','📍','En cours'],
    ['souv','📸','Souvenirs & bilan'], ['notes','📌','Notes'], ['outils','🧰','Outils'], ['envies','✨','Envies'],
    ['check','✅','Checklist'], ['ech','📆','Échéancier'], ['past','🗺️','Passés'], ['reglages','👥','Partage & profils'], ['livret','📖','Livret'], ['omap','📴','Cartes hors ligne'], ['badges','🏅','Badges']];
  const DEST_DEF = ['prog','resas','sous','souv'];   // 📸 Souvenirs dans la barre ; « En cours » passe dans Plus tant que le voyage n’a pas commencé
  const NAV_LBL = {souv:'Souvenirs'};
  // 📍 voyage en cours / 🏁 voyage fini : la barre du bas montre ce qui sert à ce moment-là (la préparation ne change pas)
  const NAV_PH = {
    live:[['i:live:live','📍','Aujourd’hui'], ['i:live:souv','📸','Souvenirs'], ['i:live:budget','💶','Dépenses'], ['a:plan','🗺️','Itinéraire']],   // l’argent reste en 3e position, comme « Budget » en préparation
    past:[['i:bilan:bilan','🏁','Bilan'], ['i:bilan:souv','📸','Souvenirs']]};   // 🌍 Carte 3D et 🎬 film : déjà dans le bilan
  function navPhase(){ const t = M.trip !== LEGACY && trip(); if(!t) return ''; const ph = tripPhase(t);
    if(ph === 'live' && !hidden('mode:live')) return 'live'; if(ph === 'past' && !hidden('mode:bilan')) return 'past'; return ''; }
  const DEST_HIDE = k => (k==='live'||k==='past'||k==='bilan') ? 'mode:' + k : ['souv','notes','outils','envies','check','ech'].includes(k) ? 'tab:' + k : '';
  const destHidden = k => { const h = DEST_HIDE(k); return !!h && hidden(h); };
  const bar = () => DEST_DEF.filter(k=>!destHidden(k));                       // barre du bas (fixe)
  const pins = () => (Array.isArray(UI().pin) ? UI().pin : []).filter(k=>DEST.some(d=>d[0]===k) && !DEST_DEF.includes(k) && !destHidden(k));   // raccourcis en haut de l'écran principal
  function pinBar(){
    if(M.mode && M.mode !== 'prep') return ''; const L = pins(); if(!L.length) return '';
    return `<div class="cv-pinbar">${L.map(k=>{ const d = DEST.find(x=>x[0]===k); return `<button type="button" onclick="CV.navTo('${k}')">${d[1]} ${d[2]}</button>`; }).join('')}</div>`;
  }
  function destOn(k){
    const mode = M.mode || 'prep', grp = groupOf(M.tab).id;
    if(/^i:/.test(k)){ const [, m, x] = k.split(':'); return mode === m && ((M.inner||{})[m] || INNER[m][0][0]) === x; }
    if(/^a:/.test(k)) return false;
    if(k==='live'||k==='past'||k==='bilan') return mode === k;
    if(mode !== 'prep') return false;
    if(k==='resas'||k==='sous') return grp === k;
    return M.tab === k;
  }
  /* Barre du bas : sur Android, un toucher qui arrête un défilement « lancé » ne déclenche pas de clic (il fallait toucher 2 fois).
     On déclenche donc le bouton dès que le doigt se relève au même endroit, et on ignore le clic en double qui suit éventuellement. */
  (function navTap(){
    const nav = document.getElementById('cv-nav'); if(!nav) return;
    let st = null, ghost = null;
    nav.addEventListener('pointerdown', e=>{ const b = e.target.closest && e.target.closest('button'); st = b ? {b, x:e.clientX, y:e.clientY} : null; }, {passive:true});
    nav.addEventListener('pointercancel', ()=>{ st = null; }, {passive:true});
    nav.addEventListener('pointerup', e=>{
      const b = e.target.closest && e.target.closest('button'), s0 = st; st = null;
      if(!s0 || b !== s0.b || e.pointerType === 'mouse' || Math.hypot(e.clientX - s0.x, e.clientY - s0.y) > 14) return;
      ghost = {x:e.clientX, y:e.clientY, t:Date.now()};
      nav.querySelectorAll('button.on').forEach(x=>x.classList.remove('on')); b.classList.add('on');   // le bouton s'allume tout de suite
      requestAnimationFrame(()=>setTimeout(()=>{ b.click(); if(ghost) ghost.t = Date.now(); }, 0));
    }, {passive:true});
    // le « vrai » clic qui suit le doigt relevé tombe au même endroit : on l'ignore partout (sinon il refermerait la fenêtre « Plus » qui vient de s'ouvrir)
    document.addEventListener('click', e=>{
      if(!ghost || !e.isTrusted) return;
      if(Date.now() - ghost.t > 800){ ghost = null; return; }
      if(Math.hypot(e.clientX - ghost.x, e.clientY - ghost.y) < 30){ ghost = null; e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
  })();
  function buildNav(){
    const live = trips().some(t=>tripPhase(t)==='live');
    const ph = navPhase(), items = ph ? NAV_PH[ph].map(([k, ic, l])=>[k, ic, l, destOn(k)]) : bar().map(k=>{ const d = DEST.find(x=>x[0]===k); return [k, d[1], NAV_LBL[k] || d[2], destOn(k)]; });
    items.push(['plus','☰','Plus', !items.some(x=>x[3])]);
    const navH = items.map(([k,ic,l,on])=>`<button class="${on?'on':''}" onclick="CV.navTo('${k}')"><i>${ic}</i><span>${l}</span>${(k==='live' || k==='i:live:live') && live ? '<b class="dotlive"></b>' : ''}</button>`).join(''), navEl = document.getElementById('cv-nav');
    if(navEl.__h !== navH){ navEl.innerHTML = navH; navEl.__h = navH; }
  }
  function navTo(k){
    if(k === 'plus'){ plusSheet(); return; }
    if(/^i:/.test(k)){ const [, m, x] = k.split(':'), same = M.mode === m && ((M.inner||{})[m] || INNER[m][0][0]) === x;
      M.inner = M.inner || {}; M.inner[m] = x; if(same){ window.scrollTo({top:0, behavior:'smooth'}); return; } modeGo(m); return; }
    if(k === 'a:map'){ liveOpen(M.trip); return; }
    if(k === 'a:plan'){ planDay(isoToday()); return; }
    if(k === 'omap'){ omapSheet(); return; }
    if(k === 'a:film'){ filmOpen(); return; }
    if(k === 'a:globe'){ worldTrip(M.trip); return; }
    if(k === 'live' || k === 'past' || k === 'bilan'){ if(M.mode === k) window.scrollTo({top:0, behavior:'smooth'}); else modeGo(k); return; }
    const was = M.mode || 'prep'; M.mode = 'prep';
    if(k === 'resas' || k === 'sous'){
      // déjà sur cet onglet (ex. on revient de « En cours ») : on réaffiche tout de suite, sinon il fallait toucher 2 fois
      if(groupOf(M.tab).id === k){ persist(); applyMode(); window.scrollTo({top:0, behavior: was === 'prep' ? 'smooth' : 'auto'}); return; }
      persist(); navGo(k); return;
    }
    M.tab = k; persist(); applyMode(); window.scrollTo({top:0, behavior: was==='prep' ? 'smooth' : 'auto'});
  }
  /* ══════════ 🏅 Badges et part du monde visitée (calculés sur le téléphone) ══════════ */
  const WORLD_N = 195;   // 193 pays membres de l’ONU + 2 observateurs
  function travelStats(){
    const today = isoToday(), ts = trips().filter(t=>!t.demo && !t.deleted && t.debut && t.debut <= today);
    const ids = new Set(ts.map(t=>t.id)), ccs = new Set(); let km = 0, ph = 0, sv = 0, nights = 0, gang = 0;
    const byT = {}; Object.values(R).forEach(r=>{ if(!r || r.deleted || !ids.has(r.trip)) return; (byT[r.trip] = byT[r.trip] || []).push(r); });
    ts.forEach(t=>{
      const rs = byT[t.id] || [], pts = [];
      if((t.voyageurs || []).length >= 3) gang++;
      rs.forEach(r=>{
        if(r.type === 'souv'){ sv++; ph += (r.photos || []).length; const cc = r.cc || ccOf(r.pays); if(cc) ccs.add(cc); if(r.lat != null) pts.push({lat:+r.lat, lng:+r.lng, d:r.date || ''}); }
        else if(r.type === 'item' && r.cat === 'hotel'){ nights += bdgNights(r); const co = (M.ctry || {})[normQ(cityOf(r.titre))]; if(co && co.cc) ccs.add(co.cc); if(r.lat != null && isFinite(+r.lat)) pts.push({lat:+r.lat, lng:+r.lng, d:r.date || ''}); }
      });
      pts.sort((a, b)=>a.d.localeCompare(b.d)); for(let i = 1; i < pts.length; i++){ const d = hav(pts[i-1], pts[i]); if(d > 1) km += d; }
    });
    const me = devId(), mine = new Set(Object.keys(FT()).map(ftId));
    const fw = new Set(list('follower', x=>mine.has(x.trip) && !isBlk(x) && !String(x.id).endsWith(':' + me)).map(fwKey)).size;
    const lk = list('like', l=>mine.has(l.trip) && l.on && !isBlk(l) && !String(l.id).endsWith(':' + me)).length;
    // organisation (tous les voyages, même à venir), continents, plus long voyage
    const allT = new Set(trips().filter(t=>!t.demo && !t.deleted).map(t=>t.id));
    const resas = list('item', i=>allT.has(i.trip) && ['transport','hotel','activite'].includes(i.cat) && (i.statut === 'booked' || i.statut === 'paid')).length;
    const ckd = list('check', c=>allT.has(c.trip) && c.done).length, polls = list('poll', x=>allT.has(x.trip)).length, wishes = list('wish').length;
    const cont = new Set([...ccs].map(c=>CONT_OF[c]).filter(Boolean)).size;
    const long = ts.reduce((m, t)=>Math.max(m, t.fin ? Math.round((new Date(t.fin) - new Date(t.debut)) / 864e5) + 1 : 1), 0);
    return {trips:ts.length, ccs:[...ccs], pays:ccs.size, km:Math.round(km), photos:ph, souv:sv, nights, gang, fw, lk, resas, ckd, polls, wishes, cont, long};
  }
  // continent de chaque pays (pour les badges)
  const CONT_OF = (() => { const o = {}; Object.entries({
    eu:'AD AL AT BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GI GR HR HU IE IS IT LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SK SM UA VA XK',
    af:'DZ AO BJ BW BF BI CM CV CF TD KM CG CD CI DJ EG GQ ER ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD SZ TZ TG TN UG ZM ZW RE YT',
    as:'AF AM AZ BH BD BT BN KH CN GE HK IN ID IR IQ IL JP JO KZ KW KG LA LB MO MY MV MN MM NP KP OM PK PS PH QA SA SG KR LK SY TW TJ TH TL TR TM AE UZ VN YE',
    na:'US CA MX GT BZ HN SV NI CR PA CU DO HT JM BS BB TT PR GP MQ AG DM GD KN LC VC AW CW BM KY TC VG VI GL PM',
    sa:'AR BO BR CL CO EC GY PY PE SR UY VE GF FK', oc:'AU NZ FJ PG SB VU NC PF WS TO KI FM MH NR PW TV CK'}).forEach(([k, v])=>v.split(' ').forEach(c=>{ o[c] = k; })); return o; })();
  const bdgNights = i => { try { return nights(i.date, i.dateFin) || 0; } catch(e){ return 0; } };
  const BADGES = [
    ['v1','🧳','Premier voyage','Un premier voyage dans ton carnet','trips',1], ['v5','🎒','Globe-trotter','5 voyages','trips',5], ['v10','🏆','Grand voyageur','10 voyages','trips',10],
    ['p3','🗺️','Explorateur','3 pays visités','pays',3], ['p10','🌍','Citoyen du monde','10 pays visités','pays',10], ['p25','🧭','Aventurier','25 pays visités','pays',25], ['p50','👑','Légende','50 pays visités','pays',50],
    ['k1','🛣️','En route','1 000 km parcourus','km',1000], ['k10','✈️','Long-courrier','10 000 km parcourus','km',10000], ['k40','🌐','Le tour de la Terre','40 075 km parcourus','km',40075],
    ['f100','📸','Photographe','100 photos','photos',100], ['f1k','🎞️','Reporter','1 000 photos','photos',1000], ['s30','✍️','Conteur','30 souvenirs racontés','souv',30],
    ['n30','🛏️','Nomade','30 nuits en voyage','nights',30], ['g1','👥','La bande','Un voyage à 3 ou plus','gang',1],
    ['a1','👀','Premier abonné','Quelqu’un suit tes voyages','fw',1], ['a10','📣','Influenceur','10 abonnés','fw',10], ['l50','❤️','Coup de cœur','50 j’aime reçus','lk',50],
    ['c2','🌎','Intercontinental','2 continents visités','cont',2], ['c4','🧗','Grand explorateur','4 continents visités','cont',4], ['c6','🪐','Les six continents','6 continents visités','cont',6],
    ['d14','🗓️','Grand départ','Un voyage de 2 semaines','long',14], ['d30','🐫','Odyssée','Un voyage d’un mois','long',30],
    ['r10','📋','Organisé','10 réservations faites','resas',10], ['r50','🎼','Chef d’orchestre','50 réservations faites','resas',50],
    ['ck50','✅','Rien d’oublié','50 cases cochées dans les checklists','ckd',50], ['po1','🗳️','On vote !','Un premier sondage entre compagnons','polls',1],
    ['w5','💭','Rêveur','5 envies de voyage notées','wishes',5], ['n100','🌙','Cent nuits','100 nuits en voyage','nights',100]];
  function renderBadges(){
    const body = document.getElementById('cv-body'), S = travelStats(), pct = Math.round(S.pays / WORLD_N * 1000) / 10;
    const got = BADGES.filter(b=>S[b[4]] >= b[5]).length;
    body.innerHTML = `<div class="bdg"><div class="bdg-w"><div class="bdg-ring" style="--p:${Math.min(100, pct)}"><b>${String(pct).replace('.', ',')} %</b><small>du monde</small></div>
        <div><b class="bdg-big">${S.pays}</b><br><span>${S.pays > 1 ? `pays visités sur ${WORLD_N}` : `pays visité sur ${WORLD_N}`}</span><div class="bdg-fl">${S.ccs.slice(0, 30).map(flag).join(' ')}</div>
        <div class="v-sum-small"><span>${S.trips} voyage${S.trips > 1 ? 's' : ''}</span> · <span>${S.km.toLocaleString(NL())} km</span> · <span>${S.photos} photo${S.photos > 1 ? 's' : ''}</span></div></div></div>
      <h3 class="bdg-h">🏅 Mes badges <small>${got} / ${BADGES.length}</small></h3>
      <div class="bdg-g">${BADGES.map(b=>{ const v = S[b[4]] || 0, ok = v >= b[5], p = Math.min(100, Math.round(v / b[5] * 100));
        return `<div class="bdg-c${ok ? ' ok' : ''}"><i>${b[1]}</i><b>${b[2]}</b><small>${b[3]}</small>${ok ? '' : `<span class="bdg-p"><span style="width:${p}%"></span></span>`}</div>`; }).join('')}</div>
      <div class="v-sum-small" style="margin:12px 0 4px">Calculé sur ton téléphone à partir de tes voyages commencés (sans les voyages de démo). Les pays viennent des lieux de tes souvenirs et de tes hébergements.</div>
      <button type="button" class="v-btn sec" onclick="CV.worldMap();setTimeout(()=>CV.worldMode('pays'),1500)">🌍 Voir mes pays sur le globe</button></div>`;
  }
  let bdgT = 0;
  function badgeCheck(){
    if(Date.now() - bdgT < 30000) return; bdgT = Date.now();
    setTimeout(()=>{ try {
      const S = travelStats(), now = BADGES.filter(b=>S[b[4]] >= b[5]).map(b=>b[0]);
      if(!M.badges){ M.badges = now; persist(); return; }   // première fois : on ne fête pas tout d’un coup
      const fresh = now.filter(id=>!M.badges.includes(id));
      if(fresh.length){ M.badges = now; persist(); badgePop(BADGES.find(x=>x[0] === fresh[fresh.length - 1]), fresh.length); }
    } catch(e){} }, 1500);
  }
  // 🏅 Nouveau badge : une petite carte qui apparaît en bas (touchable → mes badges), puis s’en va
  function badgePop(b, n){
    if(!b) return; const old = document.getElementById('cv-bpop'); if(old) old.remove();
    const el = document.createElement('button'); el.type = 'button'; el.id = 'cv-bpop'; el.className = 'bdg-pop';
    el.innerHTML = `<i>${b[1]}</i><span><small>🏅 Nouveau badge</small><b>${esc(b[2])}</b><em>${esc(b[3])}</em>${n > 1 ? `<em>+ ${n - 1} autre(s)</em>` : ''}</span>`;
    el.onclick = () => { el.remove(); try { plusGo('badges'); } catch(e){} };
    document.body.appendChild(el); requestAnimationFrame(()=>el.classList.add('show'));
    setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(), 500); }, 7000);
  }
  /* ══════════ 📖 Livret : l’histoire d’un voyage entre amis (sans détails techniques) ══════════ */
  const LIVRET = [{"k": "pro", "bg": "linear-gradient(135deg,#2b1840,#6b2fa0 60%,#f0a35e)", "em": ["📖", "✨", "🧳", "🗺️", "📸"], "kick": "Prologue", "title": "Il était une fois un carnet", "story": "Avant, un voyage entre amis, c’était cinq applis, des captures d’écran perdues, un tableau de comptes que personne ne mettait à jour et des photos éparpillées dans dix conversations. Un soir, Inès a soupiré : « Il nous faudrait un seul carnet, pour tout. » Ce carnet, c’est moi : Vezoria. Laisse-moi te raconter leur voyage au Japon.", "pts": [], "btn": [["👀 Ouvrir le voyage de démo", "demo"]]}, {"k": "reve", "bg": "linear-gradient(135deg,#1e3a8a,#7c3aed 55%,#f472b6)", "em": ["✨", "🌍", "🗳️", "💭", "🏔️"], "kick": "Chapitre 1 · Le rêve", "title": "Où partir ?", "story": "Tout commence par une envie. Léo rêve du Japon, Inès hésite avec l’Islande. Chacun note ses idées, le groupe vote, et le rêve devient un vrai projet en un geste.", "pts": ["✨ Notez vos envies de voyage et votez ensemble.", "🌍 Dessinez votre itinéraire en touchant les villes sur le globe.", "💡 Trouvez l’inspiration : saison idéale, budget, idées de visites."], "btn": [["✨ Voir les envies", "envies"]]}, {"k": "prep", "bg": "linear-gradient(135deg,#0f766e,#14b8a6 55%,#fde68a)", "em": ["🗓️", "🎫", "🏨", "✅", "💶"], "kick": "Chapitre 2 · La préparation", "title": "Tout au même endroit", "story": "Les billets d’avion arrivent par e-mail, l’hôtel de Kyoto par une autre appli, le train pour Hiroshima par une troisième. Inès range tout dans le carnet : chaque jour du voyage se dessine, heure par heure.", "pts": ["🗓️ Un programme jour par jour, avec les trajets, les hôtels et les visites.", "💶 Un budget qui se calcule tout seul, et les dates de paiement à ne pas oublier.", "✅ Une checklist et un rappel quand un passeport va expirer."], "btn": [["🗓️ Voir le programme", "prep"]]}, {"k": "amis", "bg": "linear-gradient(135deg,#9a3412,#f97316 55%,#fde047)", "em": ["👥", "🤝", "🔔", "✍️", "💬"], "kick": "Chapitre 3 · Embarquer les amis", "title": "Un carnet, toute la bande", "story": "Inès envoie un simple lien dans la conversation du groupe. Léo et Anthony le touchent : ils voient le même voyage et le complètent. Pas de compte à créer, pas de mot de passe à retenir.", "pts": ["🤝 Invitez vos compagnons voyage par voyage : ils ne voient que celui-là.", "✍️ Chaque ajout est signé : on sait qui a fait quoi.", "🔔 Chacun choisit les notifications qu’il veut recevoir."], "btn": [["☁️ Choisir mon cloud", "cloud"]]}, {"k": "live", "bg": "linear-gradient(135deg,#064e3b,#10b981 55%,#a7f3d0)", "em": ["📍", "🗺️", "🚶", "🚇", "🏯"], "kick": "Chapitre 4 · Le grand départ", "title": "Le carnet passe en mode voyage", "story": "Le jour J, le carnet change de visage : il montre la journée en cours, la prochaine étape et le chemin pour y aller. Dans le métro de Tokyo, sans réseau, la carte est toujours là.", "pts": ["📍 Le programme du jour et la prochaine étape, d’un coup d’œil.", "🗺️ Des cartes qui marchent sans réseau, et les horaires des lieux à visiter.", "🚶 Le tracé de vos balades, pour revivre le chemin parcouru."], "btn": [["📍 Voir le mode En cours", "live"]]}, {"k": "comptes", "bg": "linear-gradient(135deg,#713f12,#eab308 55%,#fef9c3)", "em": ["💸", "⚖️", "🧾", "🍜", "💳"], "kick": "Chapitre 5 · Les bons comptes", "title": "Les bons comptes font les bons amis", "story": "Un dîner de ramens payé par Léo, les billets de musée par Inès, le taxi par Anthony… Le carnet fait les calculs. À la fin, chacun sait exactement qui doit combien à qui, en euros ou en yens.", "pts": ["💸 Chaque dépense notée en quelques secondes, même hors connexion.", "⚖️ Le moins de remboursements possible pour tout équilibrer.", "💬 Un petit message tout prêt pour demander un remboursement."], "btn": [["💸 Voir le budget", "budget"]]}, {"k": "souv", "bg": "linear-gradient(135deg,#831843,#ec4899 55%,#fbcfe8)", "em": ["📸", "❤️", "✍️", "🌸", "👀"], "kick": "Chapitre 6 · Les souvenirs", "title": "Chaque jour a son histoire", "story": "Le soir, à Kyoto, Inès ajoute trois photos et deux lignes sur les temples dorés. Sa grand-mère, restée en France, suit le voyage, met un cœur et laisse un mot doux.", "pts": ["📸 Photos et récits rangés jour par jour, au bon endroit.", "👀 Votre famille peut suivre le voyage, sans voir les dépenses ni les détails privés.", "❤️ Des cœurs et des commentaires, seulement de ceux que vous invitez."], "btn": [["📸 Voir les souvenirs", "souv"]]}, {"k": "retour", "bg": "linear-gradient(135deg,#1e1b4b,#4338ca 55%,#60a5fa)", "em": ["🎬", "🌍", "📕", "🎵", "🎉"], "kick": "Chapitre 7 · Le retour", "title": "Revivre le voyage", "story": "De retour à la maison, la bande se retrouve autour d’un écran. Le carnet a préparé un film du voyage, en musique, sur la route parcourue. Et sur le globe, un nouveau pays s’allume.", "pts": ["🎬 Un film du voyage, prêt à partager.", "📕 Un album et un carnet de route à imprimer.", "🌍 Un globe en 3D avec tous vos voyages, vos photos et vos pays."], "btn": [["🎬 Voir le bilan", "bilan"], ["🌍 Ouvrir le globe", "world"]]}, {"k": "secret", "bg": "linear-gradient(135deg,#111827,#374151 55%,#9ca3af)", "em": ["🔐", "☁️", "📱", "🔑", "🛡️"], "kick": "Chapitre 8 · Le secret du carnet", "title": "Tes voyages restent à toi", "story": "Le carnet a une règle d’or : ce qui est à toi reste à toi. Pas de publicité, pas de compte, pas de revente de données. Tu choisis où vont tes voyages et avec qui tu les partages.", "pts": ["🔐 Tes voyages sont protégés : seuls toi et ceux que tu invites peuvent les lire.", "☁️ Tu choisis : tout sur ton téléphone, ou une sauvegarde dans ton cloud perso.", "🗑️ Tu peux tout effacer, quand tu veux."], "btn": [["☁️ Ouvrir le cloud", "cloud"]]}, {"k": "fin", "bg": "linear-gradient(135deg,#6b2fa0,#ec4899 50%,#fbbf24)", "em": ["🌅", "🧳", "✈️", "✨", "🗺️"], "kick": "Épilogue", "title": "Et maintenant, à toi !", "story": "Inès, Léo et Anthony préparent déjà leur prochain voyage. Et toi, où partiras-tu ? Ouvre une nouvelle page du carnet : je t’accompagne.", "pts": [], "btn": [["＋ Créer mon voyage", "new"]]}];
  function renderLivret(){
    const body = document.getElementById('cv-body');
    body.innerHTML = `<div class="lv"><div class="lv-head"><h2>📖 Le livret Vezoria</h2><p>L’histoire d’un voyage entre amis, et tout ce que ton carnet sait faire.</p>
      <div class="lv-idx">${LIVRET.map(c=>`<button type="button" aria-label="${esc(c.title)}" onclick="CV.livretJump('${c.k}')">${c.em[0]}</button>`).join('')}</div></div>`
      + LIVRET.map((c, n)=>`<section class="lv-ch" id="lv-${c.k}">
        <div class="lv-scene" style="background:${c.bg}">${c.em.map((e, j)=>`<span class="lv-e lv-e${j}">${e}</span>`).join('')}<span class="lv-n">${n ? n : '✦'}</span></div>
        <div class="lv-kick">${esc(c.kick)}</div><h3>${esc(c.title)}</h3><p class="lv-story">${esc(c.story)}</p>
        ${c.pts.length ? `<ul class="lv-pts">${c.pts.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>` : ''}
        <div class="lv-btns">${c.btn.map(([l, a], j)=>`<button type="button" class="v-btn${j ? ' sec' : ''}" onclick="CV.livretTry('${a}')">${esc(l)}</button>`).join('')}</div></section>`).join('')
      + `</div>`;
  }
  function livretJump(k){ const el = document.getElementById('lv-' + k); if(el) el.scrollIntoView({behavior:'smooth', block:'start'}); }
  // « Essayer » : ouvre la fonction dans le voyage de démo de la bonne période (ou dans ton voyage)
  async function livretTry(a){
    if(a === 'cloud') return cloudSheet();
    if(a === 'world') return worldMap();
    if(a === 'new') return newTrip();
    if(a === 'demo') return demoLoad();
    const ph = {live:'live', souv:'past', bilan:'past'}[a] || 'prep';
    const t = list('trip', x=>x.demo && tripPhase(x) === ph)[0] || demoTrip() || trip() || trips()[0];
    if(!t){ await demoLoad(); if(demoTrip()) setTimeout(()=>livretTry(a), 600); return; }
    M.trip = t.id; M.who = 'all';
    if(a === 'live' || a === 'bilan'){ M.tab = 'prog'; persist(); modeGo(a); window.scrollTo({top:0}); return; }
    M.mode = 'prep'; persist();
    navTo({envies:'envies', prep:'prog', souv:'souv', budget:'sous'}[a] || 'prog');
  }
  /* ══════════ 🧭 Explorer : une ville s’ouvre en grand (photo, bonjour local, heure, météo),
     puis ce qu’il y a à voir, à faire, où manger, sortir, acheter — fiches d’un vrai guide de voyage.
     Sources libres, sans clé : Wikivoyage + Wikipédia (textes), Wikimedia Commons / Wikidata (photos),
     OpenStreetMap (position, pays), Open-Meteo (météo). Rien n’est stocké sur le serveur Vezoria. */
  const EXP_CATS = [['see','🏛️','À voir'], ['do','🎟️','À faire'], ['eat','🍜','Manger'], ['drink','🍸','Boire un verre'], ['buy','🛍️','Shopping']];
  const EXP_GRAD = {see:'linear-gradient(135deg,#6b2fa0,#ec4899)', do:'linear-gradient(135deg,#0f766e,#22d3ee)', eat:'linear-gradient(135deg,#c2410c,#fbbf24)', drink:'linear-gradient(135deg,#1e1b4b,#8b5cf6)', buy:'linear-gradient(135deg,#be185d,#f9a8d4)'};
  const EXP_HI = {fr:'Bonjour', be:'Bonjour', ch:'Grüezi · Bonjour', ca:'Hello · Bonjour', gb:'Hello', us:'Hello', ie:'Dia duit · Hello', au:'G’day', nz:'Kia ora', es:'¡Hola!', mx:'¡Hola!', ar:'¡Hola!', co:'¡Hola!', pe:'¡Hola!', cl:'¡Hola!', cu:'¡Hola!', it:'Ciao', pt:'Olá', br:'Olá', de:'Hallo', at:'Servus', nl:'Hallo', dk:'Hej', se:'Hej', no:'Hei', fi:'Moi', is:'Halló', pl:'Cześć', cz:'Ahoj', sk:'Ahoj', hu:'Szia', ro:'Bună', bg:'Здравей · Zdravei', gr:'Γειά σου · Yia sou', hr:'Bok', si:'Živjo', rs:'Здраво · Zdravo', tr:'Merhaba', ru:'Привет · Privet', ua:'Привіт · Pryvit', jp:'こんにちは · Konnichiwa', cn:'你好 · Nǐ hǎo', tw:'你好 · Nǐ hǎo', hk:'你好 · Néih hóu', kr:'안녕하세요 · Annyeong', th:'สวัสดี · Sawasdee', vn:'Xin chào', id:'Halo · Selamat', my:'Selamat datang', ph:'Kumusta', in:'नमस्ते · Namaste', np:'नमस्ते · Namaste', lk:'Ayubowan', ma:'Salam · مرحبا', tn:'Aslema · مرحبا', dz:'Salam · مرحبا', eg:'أهلاً · Ahlan', ae:'مرحبا · Marhaba', sa:'مرحبا · Marhaba', jo:'مرحبا · Marhaba', il:'שלום · Shalom', za:'Sawubona · Hello', ke:'Jambo', tz:'Jambo', sn:'Nanga def', ir:'سلام · Salam', mt:'Bonġu', cy:'Γειά · Hello', ee:'Tere', lv:'Sveiki', lt:'Labas', al:'Përshëndetje', mk:'Здраво · Zdravo', ba:'Zdravo', me:'Zdravo', ge:'გამარჯობა · Gamarjoba', am:'Բարեւ · Barev', kh:'សួស្តី · Suostei', la:'ສະບາຍດີ · Sabaidee', mm:'Mingalaba', mn:'Сайн байна уу · Sain baina uu', pk:'السلام علیکم · Salaam', bd:'নমস্কার · Nomoskar', cr:'¡Pura vida!', gt:'¡Hola!', ec:'¡Hola!', bo:'¡Hola!', uy:'¡Hola!', py:'¡Hola!', ve:'¡Hola!', do:'¡Hola!', pa:'¡Hola!'};
  const EXP_WV = ['fr','en','de','it','es','pt','nl','ru','zh','ja','tr','hi'];
  const EXP_HEAD = {
    see:/^(see|voir|à voir|a voir|que voir|sehenswürdigkeiten|da vedere|cosa vedere|qué ver|que ver|ver|o que ver|atrações|atracciones|bezienswaardigheden|zien|достопримечательности|görülecek|gör|見る|観光|观光|景点|看|देखें|दर्शनीय)/i,
    do:/^(do|faire|à faire|que faire|activités|aktivitäten|unternehmungen|cosa fare|da fare|qué hacer|que hacer|hacer|fazer|o que fazer|activiteiten|doen|чем заняться|развлечения|yapılacaklar|yap|する|遊ぶ|活动|做|करें|गतिविधियाँ)/i,
    eat:/^(eat|manger|se restaurer|restauration|küche|essen|mangiare|comer|eten|где поесть|питание|еда|yemek|ye|食べる|饮食|餐饮|吃|खाएं|भोजन)/i,
    drink:/^(drink|sortir|boire|boire un verre|nachtleben|ausgehen|bere|uscire|vita notturna|beber|salir|vida nocturna|uitgaan|drinken|ночная жизнь|бары|выпить|içmek|iç|gece hayatı|飲む|ナイトライフ|饮品|夜生活|喝|पिएं)/i,
    buy:/^(buy|acheter|achats|shopping|einkaufen|acquisti|compras|comprar|winkelen|kopen|покупки|шопинг|alışveriş|satın al|買う|ショッピング|购物|买|खरीदें|ख़रीदारी)/i };
  const EXP_TPL = {see:'see',voir:'see',do:'do',faire:'do',eat:'eat',manger:'eat',drink:'drink',sortir:'drink',boire:'drink',buy:'buy',acheter:'buy'};
  const expKeys = {n:['name','nom','nome','nombre','naam','имя','название'], d:['content','description','descrizione','descripción','descripcion','descrição','descricao','beschrijving','описание','text'],
    a:['address','adresse','indirizzo','dirección','direccion','endereço','endereco','adres','адрес'], h:['hours','horaire','horaires','orari','orario','horario','horário','openingstijden','часы'],
    p:['price','prix','prezzo','precio','preço','preco','prijs','цена','preis'], lat:['lat','latitude'], lng:['long','lon','longitude'], u:['url','website','site','sito','web'],
    img:['image','immagine','imagen','imagem','bild','foto'], wd:['wikidata'], ty:['type','tipo','typ','тип']};
  // ── petite base locale : une ville déjà explorée s’ouvre aussi sans réseau ──
  const expDb = () => new Promise((res, rej)=>{ const q = indexedDB.open('vz-exp', 1); q.onupgradeneeded = () => q.result.createObjectStore('c'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  async function expKv(k, v){ const db = await expDb(); return new Promise((res, rej)=>{ const tx = db.transaction('c', v === undefined ? 'readonly' : 'readwrite'), st = tx.objectStore('c'); const q = v === undefined ? st.get(k) : st.put(v, k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
  // ── lecture des fiches Wikivoyage (modèles {{see|…}}, {{Listing|…}}, {{vCard|…}}…) ──
  function wvTemplates(s){
    const out = []; let i = 0;
    while((i = s.indexOf('{{', i)) !== -1){
      let d = 0, j = i;
      for(; j < s.length - 1; j++){ if(s[j] === '{' && s[j+1] === '{'){ d++; j++; } else if(s[j] === '}' && s[j+1] === '}'){ d--; j++; if(!d) break; } }
      out.push([i, s.slice(i + 2, j - 1), j + 1]); i = j + 1;
    }
    return out;
  }
  function wvParams(body){
    const parts = []; let d = 0, cur = '';
    for(let i = 0; i < body.length; i++){ const c = body[i], n = body[i+1];
      if((c === '{' && n === '{') || (c === '[' && n === '[')){ d++; cur += c + n; i++; continue; }
      if((c === '}' && n === '}') || (c === ']' && n === ']')){ d--; cur += c + n; i++; continue; }
      if(c === '|' && d === 0){ parts.push(cur); cur = ''; continue; } cur += c; }
    parts.push(cur);
    const name = parts.shift().trim().toLowerCase(), p = {};
    parts.forEach(x=>{ const k = x.indexOf('='); if(k > 0) p[x.slice(0, k).trim().toLowerCase()] = x.slice(k + 1).trim(); });
    return {name, p};
  }
  const wvClean = s => String(s || '').replace(/<ref[^>]*\/>/gi, '').replace(/<ref[\s\S]*?<\/ref>/gi, '').replace(/<[^>]+>/g, '')
    .replace(/\[\[(?:file|fichier|image|datei|archivo|immagine|файл):[^\]]*\]\]/gi, '').replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1').replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/\[https?:\/\/\S+\s+([^\]]*)\]/g, '$1').replace(/\[https?:\/\/\S+\]/g, '').replace(/\{\{[^{}]*\}\}/g, '').replace(/\{\{[^{}]*\}\}/g, '').replace(/\{\{[^{}]*\}\}/g, '').replace(/'{2,}/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const expPick = (p, ks) => { for(const k of ks){ if(p[k] != null && String(p[k]).trim() !== '') return p[k]; } return ''; };
  function wvParse(text){
    const out = [], heads = []; let m; const re = /^(={2,4})\s*([^=\n]+?)\s*\1\s*$/gm;
    while((m = re.exec(text))) heads.push([m.index, m[1].length, wvClean(m[2])]);
    const catAt = pos => { let cat = null; for(const [i, lv, t] of heads){ if(i > pos) break; const k = Object.keys(EXP_HEAD).find(c=>EXP_HEAD[c].test(t)); if(lv === 2) cat = k || null; else if(k) cat = k; } return cat; };
    for(const [pos, body, end] of wvTemplates(text)){
      const {name, p} = wvParams(body); const n = wvClean(expPick(p, expKeys.n)); if(!n || n.length > 80) continue;
      const tn = EXP_TPL[name] || EXP_TPL[String(expPick(p, expKeys.ty)).toLowerCase()];
      if(!tn && !/^(listing|vcard|poi|marker|see|do|eat|drink|buy|voir|faire|manger|sortir|acheter)$/.test(name)) continue;
      const cat = tn || catAt(pos); if(!cat) continue;
      const it = {cat, n, d:wvClean(expPick(p, expKeys.d)).slice(0, 700), a:wvClean(expPick(p, expKeys.a)).slice(0, 160), h:wvClean(expPick(p, expKeys.h)).slice(0, 160), pr:wvClean(expPick(p, expKeys.p)).slice(0, 120),
        lat:parseFloat(expPick(p, expKeys.lat)), lng:parseFloat(expPick(p, expKeys.lng)), u:String(expPick(p, expKeys.u)).trim(), img:String(expPick(p, expKeys.img)).trim(), wd:(String(expPick(p, expKeys.wd)).match(/Q\d+/) || [''])[0]};
      // description écrite après la fiche, sur la même ligne (fréquent en allemand, parfois ailleurs)
      if(!it.d){ const nl = text.indexOf('\n', end), tail = wvClean(text.slice(end, nl < 0 ? undefined : nl)).replace(/^[\s.:–—-]+/, ''); if(tail.length > 15) it.d = tail.slice(0, 700); }
      if(!isFinite(it.lat)) it.lat = null; if(!isFinite(it.lng)) it.lng = null;
      if(!/^https?:\/\//.test(it.u)) it.u = '';
      out.push(it);
    }
    return out;
  }
  const expJ = (u, ms) => withTimeout(fetch(u).then(r=>{ if(!r.ok) throw new Error('http ' + r.status); return r.json(); }), ms || 12000);
  async function wvFetch(lg, city){
    const api = `https://${lg}.wikivoyage.org/w/api.php?format=json&origin=*&formatversion=2`;
    let title = '';
    const t1 = await expJ(api + '&action=query&redirects=1&titles=' + encodeURIComponent(city)).catch(()=>null);
    const pg = t1 && t1.query && t1.query.pages && t1.query.pages[0];
    if(pg && !pg.missing) title = pg.title;
    if(!title){ const s = await expJ(api + '&action=query&list=search&srlimit=1&srnamespace=0&srsearch=' + encodeURIComponent(city)).catch(()=>null); const h = s && s.query && s.query.search && s.query.search[0]; if(h) title = h.title; }
    if(!title) return null;
    const rev = async titles => { const j = await expJ(api + '&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(titles.join('|')), 15000);
      return (j.query && j.query.pages || []).map(x=>((x.revisions || [])[0] || {}).slots).filter(Boolean).map(sl=>sl.main.content || ''); };
    const main = (await rev([title]))[0] || '';
    let items = wvParse(main);
    // grandes villes : les fiches sont dans les quartiers (« Tokyo/Shinjuku »…)
    if(items.length < 12){
      const sub = await expJ(api + '&action=query&list=allpages&apnamespace=0&aplimit=12&apprefix=' + encodeURIComponent(title + '/')).catch(()=>null);
      const ts = (sub && sub.query && sub.query.allpages || []).map(x=>x.title).slice(0, 10);
      if(ts.length){ const txts = await rev(ts).catch(()=>[]); txts.forEach(t=>{ items = items.concat(wvParse(t)); }); }
    }
    const lead = wvClean((main.split(/^==/m)[0] || '').replace(/\{\{[\s\S]*?\}\}/g, '')).slice(0, 600);
    return {lg, title, items, lead};
  }
  // photos : fichier donné par la fiche, sinon l’image Wikidata (une seule requête pour toute la ville)
  const commons = (f, w) => 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(String(f).replace(/^(file|fichier|image|datei):/i, '').trim()) + '?width=' + (w || 500);
  async function expPhotos(items){
    items.forEach(it=>{ if(it.img && !/^https?:/.test(it.img)) it.ph = commons(it.img); });
    const need = items.filter(it=>!it.ph && it.wd).slice(0, 150);
    for(let i = 0; i < need.length; i += 60){
      const chunk = need.slice(i, i + 60), q = `SELECT ?i ?img WHERE { VALUES ?i { ${chunk.map(x=>'wd:' + x.wd).join(' ')} } ?i wdt:P18 ?img }`;
      try { const j = await expJ('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q), 15000);
        const map = {}; (j.results && j.results.bindings || []).forEach(b=>{ const id = b.i.value.split('/').pop(); if(!map[id]) map[id] = b.img.value; });
        chunk.forEach(x=>{ const u = map[x.wd]; if(u) x.ph = commons(decodeURIComponent(u.split('/FilePath/').pop()), 500); });
      } catch(e){}
    }
  }
  // ── tout ce qu’il faut pour une ville ──
  async function expLoad(city){
    const lang = (window.I18N && I18N.lang) || 'fr', key = 'c2:' + normQ(city) + ':' + lang;
    const old = await expKv(key).catch(()=>null);
    if(old && Date.now() - old.t < 30 * 864e5 && old.n) return old;
    const geo = await expJ(GEO + 'search?format=jsonv2&limit=1&addressdetails=1&accept-language=' + lang + '&q=' + encodeURIComponent(city), 10000).catch(()=>null);
    const g = geo && geo[0], cc = g && g.address && g.address.country_code || '', lat = g ? +g.lat : null, lng = g ? +g.lon : null;
    const wiki = async lg => { const j = await expJ(`https://${lg}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(city)}?redirect=true`, 9000); return j && j.type !== 'disambiguation' ? j : null; };
    const wvLang = EXP_WV.includes(lang) ? lang : 'en';
    const [wp, wv, wx] = await Promise.all([
      wiki(lang).catch(()=>null).then(x=>x || (lang !== 'en' ? wiki('en').catch(()=>null) : null)),
      wvFetch(wvLang, city).catch(()=>null).then(async x=>(x && x.items.length >= 8) || wvLang === 'en' ? x : ((await wvFetch('en', city).catch(()=>null)) || x)),
      lat != null ? expJ(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,is_day&timezone=auto`, 8000).catch(()=>null) : null]);
    let items = (wv && wv.items) || [];
    // pas (assez) de guide pour cette ville : les lieux connus autour (Wikipédia)
    if(items.filter(x=>x.cat === 'see').length < 4 && lat != null){
      try { const near = await seeWiki({lat, lng}); items = items.concat(near.slice(0, 30).map(p=>({cat:'see', n:p.nom, d:'', a:'', h:'', pr:'', lat:p.lat, lng:p.lng, u:'', img:'', wd:'', wk:p.wiki}))); } catch(e){}
    }
    const seen = new Set(); items = items.filter(it=>{ const k = it.cat + normQ(it.n); if(seen.has(k)) return false; seen.add(k); return true; });
    await expPhotos(items);
    const wkNeed = items.filter(it=>!it.ph && it.wk).slice(0, 40);
    if(wkNeed.length){ try { const j = await expJ('https://fr.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=640&redirects=1&format=json&formatversion=2&origin=*&titles=' + encodeURIComponent(wkNeed.map(x=>x.wk.replace(/^fr:/, '')).join('|')));
      const m = {}; (j.query && j.query.pages || []).forEach(pg=>{ if(pg.thumbnail) m[normQ(pg.title)] = pg.thumbnail.source; }); wkNeed.forEach(x=>{ const u = m[normQ(x.wk.replace(/^fr:/, ''))]; if(u) x.ph = u; }); } catch(e){} }
    // les plus parlants d’abord : avec photo et description
    items.sort((a, b)=>(!!b.ph - !!a.ph) || ((b.d || '').length > 40) - ((a.d || '').length > 40));
    const cats = {}; EXP_CATS.forEach(([k])=>{ cats[k] = items.filter(x=>x.cat === k).slice(0, 40); });
    const bad = u => !u || /montage|collage|mosai|composite|compilation|map|karte|carte|plan_|flag|drapeau|bandera|coat|blason|wappen|seal|logo|\.svg|locator|location|skyline_collage/i.test(decodeURIComponent(u));
    const heroes = [];
    if(wp && wp.wikibase_item){ try { const j = await expJ('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(`SELECT ?img WHERE { wd:${wp.wikibase_item} wdt:P18 ?img }`), 8000);
      (j.results && j.results.bindings || []).forEach(b=>{ const u = commons(decodeURIComponent(b.img.value.split('/FilePath/').pop()), 1280); if(!bad(u)) heroes.push(u); }); } catch(e){} }
    const oi = wp && wp.originalimage, th = wp && wp.thumbnail;
    const wpi = th ? th.source.replace(/\/(\d+)px-/, '/1280px-') : oi ? oi.source : '';
    if(wpi && !bad(wpi)) heroes.push(wpi);
    (cats.see || []).filter(x=>x.ph).slice(0, 3).forEach(x=>heroes.push(x.ph.replace(/width=\d+/, 'width=1280')));
    const hero = heroes[0] || '';
    const raw = ((wp && wp.extract) || (wv && wv.lead) || '').trim(), mm = raw.match(/^([\s\S]+?[.!?。])(\s+[\s\S]+?[.!?。])?(\s|$)/), intro = mm ? mm[1] + (mm[2] || '') : raw.slice(0, 300);
    const d = {t:Date.now(), city, cc, country:g && g.address ? g.address.country || '' : '', lat, lng, hero, heroes, intro, src:wv ? wv.lg : '', tz:wx && wx.timezone || '', temp:wx && wx.current ? Math.round(wx.current.temperature_2m) : null, code:wx && wx.current ? wx.current.weather_code : null, day:wx && wx.current ? wx.current.is_day : 1, cats, n:items.length};
    if(d.n) expKv(key, d).catch(()=>{});
    return d;
  }
  const expFlag = cc => cc && cc.length === 2 ? String.fromCodePoint(...cc.toUpperCase().split('').map(c=>127397 + c.charCodeAt(0))) : '🌍';
  const expWx = (c, day) => c == null ? '' : c === 0 ? (day ? '☀️' : '🌙') : c <= 2 ? (day ? '🌤️' : '🌙') : c === 3 ? '☁️' : c <= 48 ? '🌫️' : c <= 67 ? '🌧️' : c <= 77 ? '❄️' : c <= 82 ? '🌦️' : c <= 86 ? '🌨️' : '⛈️';
  let exp = null;
  function explore(hid){ const h = R[hid]; if(!h) return; exploreCity(stayCity(h), hid); }
  async function exploreCity(city, hid, day){
    city = String(city || '').trim(); if(!city) return;
    if(day) closeSheet(true);
    let ov = document.getElementById('cv-exp'); if(ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'cv-exp'; document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    const first = !((M.expSeen || (M.expSeen = {}))[normQ(city)]); M.expSeen[normQ(city)] = Date.now(); persist();
    exp = {city, hid, day: day || '', d:null};
    const letters = [...city].map((ch, i)=>`<span style="animation-delay:${(first ? 0.55 : 0.15) + i * 0.045}s">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
    ov.className = first ? 'ex-first' : '';
    ov.innerHTML = `<div class="ex-scroll" id="ex-scroll"><div class="ex-hero"><div class="ex-img" id="ex-img"></div><div class="ex-shade"></div>
        <div class="ex-tt" data-notr><div class="ex-flag" id="ex-flag">🌍</div><div class="ex-hi" id="ex-hi">&nbsp;</div><h1 class="ex-name">${letters}</h1><div class="ex-ctry" id="ex-ctry">&nbsp;</div><div class="ex-chips" id="ex-chips"></div></div>
        <div class="ex-down">⌄</div></div>
      <div class="ex-body" id="ex-body"><div class="ex-load"><span class="ex-dot"></span><span class="ex-dot"></span><span class="ex-dot"></span><div>Je prépare ta découverte…</div></div></div></div>
      <button type="button" class="ex-x" onclick="CV.expClose()" aria-label="Fermer">✕</button>
      <div class="ex-det" id="ex-det" hidden></div>`;
    try { const d = await expLoad(city); if(!exp || exp.city !== city) return; exp.d = d; expFill(); }
    catch(e){ const b = document.getElementById('ex-body'); if(b) b.innerHTML = `<div class="ex-empty">${navigator.onLine === false ? 'Hors connexion : cette ville n’a pas encore été explorée.' : 'Impossible de charger le guide pour l’instant. Réessaie dans un moment.'}</div>`; }
  }
  function expFill(){
    const d = exp.d, $ = id => document.getElementById(id); if(!$('ex-body')) return;
    const hs = (d.heroes || [d.hero]).filter(Boolean);
    const tryHero = n => { if(n >= hs.length) return; const im = new Image(); im.onload = () => { const el = $('ex-img'); if(el){ el.style.backgroundImage = `url("${hs[n]}")`; el.classList.add('on'); } }; im.onerror = () => tryHero(n + 1); im.src = hs[n]; };
    tryHero(0);
    $('ex-flag').textContent = expFlag(d.cc); $('ex-hi').textContent = EXP_HI[d.cc] || '';
    $('ex-ctry').textContent = d.country || '';
    const time = d.tz ? (()=>{ try { return new Intl.DateTimeFormat((window.I18N && I18N.locale) || 'fr-FR', {hour:'2-digit', minute:'2-digit', timeZone:d.tz}).format(new Date()); } catch(e){ return ''; } })() : '';
    $('ex-chips').innerHTML = [time ? `<span>🕒 ${time}</span>` : '', d.temp != null ? `<span>${expWx(d.code, d.day)} ${d.temp}°</span>` : ''].join('');
    const added = new Set(exp.day ? placesOf(exp.day).map(p=>normQ(p.nom)) : exp.hid ? placesOfStay(exp.hid).map(p=>normQ(p.nom)) : []);
    const secs = EXP_CATS.filter(([k])=>(d.cats[k] || []).length).map(([k, ic, lbl])=>`<section class="ex-sec"><h2><span>${ic}</span> <span>${lbl}</span> <small>${d.cats[k].length}</small></h2>
      <div class="ex-row">${d.cats[k].map((it, i)=>`<button type="button" class="ex-card" onclick="CV.exCard('${k}',${i})">
        <div class="ex-ph" style="background-image:${EXP_GRAD[k]}"><span class="ex-ic">${ic}</span>${it.ph ? `<img class="ex-pic" src="${esc(it.ph)}" alt="" loading="lazy" decoding="async" onload="this.classList.add('ok')" onerror="this.remove()">` : ''}${added.has(normQ(it.n)) ? '<i class="ex-ok">✓</i>' : ''}</div>
        <b data-notr>${esc(it.n)}</b><small data-notr>${esc(it.d || it.a || '')}</small>${it.pr || it.h ? `<em data-notr>${esc(it.pr ? '💶 ' + it.pr : '🕒 ' + it.h)}</em>` : ''}</button>`).join('')}</div></section>`).join('');
    $('ex-body').innerHTML = (d.intro ? `<p class="ex-intro" data-notr>${esc(d.intro)}</p>` : '')
      + (secs || '<div class="ex-empty">Rien trouvé pour cette ville pour l’instant.</div>')
      + (exp.hid && !exp.day ? `<button type="button" class="v-btn sec ex-more" onclick="CV.expClose();CV.discover('${exp.hid}')">🔎 Tous les lieux autour, sur la carte</button>` : '')
      + (hidden('blk:book') ? '' : `<div class="ex-bk" style="margin:14px 22px 0;justify-content:center"><span>🧳 Pour ton séjour :</span>${['booking','airbnb','gyg','viator'].map(b=>bookA(b, {city:exp.city, what:exp.city})).join('')}</div>`)
      + `<div class="ex-src">Textes : Wikivoyage et Wikipédia (CC BY-SA) · Photos : Wikimedia Commons · Météo : Open-Meteo</div>`;
    // les rubriques apparaissent en glissant
    try { const io = new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }), {root:$('ex-scroll'), threshold:.12});
      document.querySelectorAll('#cv-exp .ex-sec').forEach(s=>io.observe(s)); } catch(e){ document.querySelectorAll('#cv-exp .ex-sec').forEach(s=>s.classList.add('in')); }
  }
  function exCard(k, i){   // (avant « expOpen » : même nom que la liste des expériences à vivre, qui le remplaçait → la fiche ne s’ouvrait pas)
    const it = exp && exp.d && exp.d.cats[k] && exp.d.cats[k][i]; if(!it) return;
    const det = document.getElementById('ex-det'), ic = (EXP_CATS.find(x=>x[0] === k) || [])[1] || '📍';
    const has = exp.day ? placesOf(exp.day).some(p=>normQ(p.nom) === normQ(it.n)) : exp.hid && placesOfStay(exp.hid).some(p=>normQ(p.nom) === normQ(it.n));
    const go = it.lat != null ? `${it.lat},${it.lng}` : it.n + ', ' + exp.city;
    det.innerHTML = `<div class="ex-dbg" onclick="CV.expShut()"></div><div class="ex-dc">
      <div class="ex-dph" style="background-image:${EXP_GRAD[k]}"><span class="ex-ic">${ic}</span>${it.ph ? `<img class="ex-pic" src="${esc(it.ph.replace(/width=\d+/, 'width=960'))}" alt="" decoding="async" onload="this.classList.add('ok')" onerror="this.remove()">` : ''}<button type="button" class="ex-dx" onclick="CV.expShut()" aria-label="Retirer">✕</button></div>
      <div class="ex-dt"><h3 data-notr>${esc(it.n)}</h3>${it.d ? `<p data-notr>${esc(it.d)}</p>` : ''}
        ${it.a ? `<div class="ex-ln"><span>📍</span><span data-notr>${esc(it.a)}</span></div>` : ''}${it.h ? `<div class="ex-ln"><span>🕒</span><span data-notr>${esc(it.h)}</span></div>` : ''}${it.pr ? `<div class="ex-ln"><span>💶</span><span data-notr>${esc(it.pr)}</span></div>` : ''}
        <div class="ex-acts">${exp.hid || exp.day ? `<button type="button" class="v-btn${has ? ' sec' : ''}" onclick="CV.expAdd('${k}',${i})">${has ? '✓ Dans ton programme' : exp.day ? '＋ Ajouter à ma journée' : '＋ Ajouter à l’étape'}</button>` : ''}
          <a class="v-btn sec" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(go)}" target="_blank" rel="noopener">🧭 Y aller</a>
          ${safeUrl(it.u) ? `<a class="v-btn sec" href="${esc(safeUrl(it.u))}" target="_blank" rel="noopener">🌐 Site</a>` : ''}</div>
        ${(k==='see' || k==='do') && !hidden('blk:book') ? `<div class="ex-bk"><span>🎟️ Billets :</span>${['gyg','viator','tiqets'].map(b=>bookA(b, {what:it.n + ' ' + exp.city})).join('')}</div>` : ''}</div></div>`;
    det.hidden = false; requestAnimationFrame(()=>det.classList.add('on'));
  }
  function expShut(){ const det = document.getElementById('ex-det'); if(!det) return; det.classList.remove('on'); setTimeout(()=>{ det.hidden = true; }, 260); }
  function expAdd(k, i){
    const it = exp && exp.d && exp.d.cats[k] && exp.d.cats[k][i]; if(!it || !(exp.hid || exp.day)) return;
    const ex = (exp.day ? placesOf(exp.day) : placesOfStay(exp.hid)).find(x=>normQ(x.nom) === normQ(it.n));
    if(ex) drop(ex.id, '↩️ Retiré');
    else put({id:'pl' + uid(), type:'place', trip:M.trip, stay:exp.hid || '', date:exp.day || (R[exp.hid] && R[exp.hid].type === 'city' && R[exp.hid].date) || '', nom:it.n, adresse:it.a || '', lat:it.lat, lng:it.lng, cat:k === 'see' ? wikiCat(it.n + ' ') : 'loisir', lock:false}, '📍 ' + it.n);
    exCard(k, i);
    const sc = document.getElementById('ex-scroll'), y = sc ? sc.scrollTop : 0; expFill(); if(sc) sc.scrollTop = y;
  }
  function expClose(){ const ov = document.getElementById('cv-exp'), back = exp && exp.day; if(ov) ov.remove(); document.body.style.overflow = ''; exp = null; refresh(); if(back) setTimeout(()=>planDay(back), 60); }
  // une ligne d’explication sous chaque tuile du menu « Plus » (« Livret », « Outils »… ne disent pas tout)
  const PLUS_DESC = {souv:'Photos, récits, bilan', live:'Le voyage en direct', prog:'Jour par jour', resas:'Billets, hôtels, activités', sous:'Prévu et dépensé', notes:'Courses, mémos, documents', outils:'Change, météo, valise…',
    envies:'Idées et sondages', check:'À ne pas oublier', ech:'Paiements à venir', past:'Tes anciens voyages', reglages:'Compagnons et code',
    livret:'L’appli en images', omap:'Plans sans réseau', badges:'Tes récompenses', prefs:'Profils, partage, langue, cartes…', coffee:'Soutenir l’appli'};
  function plusSheet(){
    const ph = navPhase(), p = bar();
    // voyage en cours / fini : la barre du bas a pris d’autres boutons → la préparation (Programme, Résas, Budget) passe dans « Plus », sans doublon
    const inPrefs = k => ['reglages', 'livret', 'omap'].includes(k);   // ceux-là sont dans ⚙️ Réglages (moins de tuiles dans « Plus »)
    const ent = ph ? DEST.filter(d=>!destHidden(d[0]) && !inPrefs(d[0]) && !['souv', 'live', 'bilan'].includes(d[0]))
        .map(d=>[`CV.plusGo('${ph === 'past' && d[0] === 'sous' ? 'i:bilan:budget' : d[0]}')`, d[1], ph === 'past' && d[0] === 'sous' ? 'Budget du voyage' : d[2]])
      : DEST.filter(d=>!p.includes(d[0]) && !destHidden(d[0]) && !inPrefs(d[0]) && d[0] !== 'prog').map(d=>[`CV.plusGo('${d[0]}')`, d[1], d[2]]);
    ent.push([`CV.plusGo('prefs')`, '⚙️', 'Réglages']);
    const dsc = fn => { const k = (fn.match(/plusGo\('(?:i:bilan:)?([a-z]+)/) || [])[1] || (/coffee/.test(fn) ? 'coffee' : ''); return PLUS_DESC[k === 'budget' ? 'sous' : k] || ''; };
    // 🧹 rangé en familles repliables (une ouverte à la fois) au lieu d’une longue liste de tuiles
    { const t0 = M.trip !== LEGACY && trip(); if(t0 && tripPhase(t0) !== 'past') ent.unshift([`CV.close();CV.avantSheet()`, '🧭', MSGT('Avant de partir')]); }
    const keyOf = fn => (fn.match(/plusGo\('(?:i:bilan:)?([a-z]+)/) || [])[1] || (/avantSheet/.test(fn) ? 'avant' : '');
    const FAM = [['prep', '🧳', MSGT('Préparer'), ['avant', 'live', 'prog', 'resas', 'sous', 'budget', 'check', 'envies', 'notes', 'ech']], ['souv', '📸', MSGT('Souvenirs'), ['souv', 'past', 'badges']], ['outils', '🧰', MSGT('Outils'), ['outils', 'livret', 'omap', 'reglages']], ['prefs', '⚙️', MSGT('Réglages'), ['prefs']]];
    const tile = ([fn,ic,l]) => `<button type="button" onclick="${fn}"><i>${ic}</i><span>${l}</span>${dsc(fn) ? `<small>${dsc(fn)}</small>` : ''}</button>`;
    const used = new Set(), op = M.plusOpen || 'prep';
    const fams = FAM.map(([id, ic, l, ks])=>{ const L = ent.filter(e=>ks.includes(keyOf(e[0]))); L.forEach(e=>used.add(e)); return {id, ic, l, L}; }).filter(f=>f.L.length);
    const rest = ent.filter(e=>!used.has(e)); if(rest.length){ const f = fams.find(x=>x.id === 'outils'); if(f) f.L.push(...rest); else fams.push({id:'outils', ic:'🧰', l:MSGT('Outils'), L:rest}); }
    openSheet(`<h2>Plus</h2><div class="cv-plusg">${fams.map(f=>f.L.length === 1 ? `<button type="button" class="cv-pg1" onclick="${f.L[0][0]}"><i>${f.L[0][1]}</i><span>${f.L[0][2]}${dsc(f.L[0][0]) ? `<small>${dsc(f.L[0][0])}</small>` : ''}</span><b>›</b></button>` : `<details class="cv-pg"${f.id === op ? ' open' : ''} ontoggle="if(this.open){ M.plusOpen='${f.id}'; this.parentNode.querySelectorAll('details').forEach(d=>{ if(d!==this) d.open=false; }); }"><summary><i>${f.ic}</i><span>${esc(f.l)}</span><small>${f.L.length}</small></summary><div class="cv-plus">${f.L.map(tile).join('')}</div></details>`).join('')}</div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">✕ Fermer</button></div>`);
  }
  function coffeeGo(){ closeSheet(true); try { window.open(COFFEE_URL, '_blank', 'noopener'); } catch(e){ location.href = COFFEE_URL; } }
  function plusGo(k){ closeSheet(true); navTo(k === 'prefs' ? 'prefs' : k); }
  function navGo(gid){
    const g = GROUPS.find(x=>x.id===gid); if(!g) return;
    M.lastTab = M.lastTab || {};
    const cur = groupOf(M.tab);
    if(cur.id===gid){ window.scrollTo({top:0, behavior:'smooth'}); return; }
    M.lastTab[cur.id] = M.tab;
    const vt = visTabs(g).length ? visTabs(g) : g.tabs;
    tab(M.lastTab[gid] && vt.some(t=>t[0]===M.lastTab[gid]) ? M.lastTab[gid] : vt[0][0]);
  }
  function applyMode(){
    if(M.trip===LEGACY && R.t2026 && !R.t2026.deleted) M.trip = 't2026';
    if(M.trip!==LEGACY && !trip()){ const ts = trips(); M.trip = ts.length ? (ts.find(x=>!x.archived)||ts[0]).id : (M.trip===LEGACY ? LEGACY : null); }
    const legacy = M.trip===LEGACY;
    document.body.classList.toggle('is-legacy', legacy);
    const show = (id, v) => { const e = document.getElementById(id); if(e) e.style.display = v; };
    show('tabs26', legacy ? 'flex' : 'none'); show('app26', legacy ? 'block' : 'none'); show('exportFab', legacy ? 'flex' : 'none');
    document.getElementById('appC').style.display = legacy ? 'none' : 'block';
    document.getElementById('cv-nav').style.display = legacy ? 'none' : 'flex';
    renderHeader();
    if(!legacy){ buildTabs(); render(); }
    else document.getElementById('cv-fab').style.display = 'none';
  }
