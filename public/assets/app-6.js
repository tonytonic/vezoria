/* Vezoria — code de l’appli, partie 6/8 (chargées dans l’ordre par index.html, même portée globale) */


  /* ══════════ 📲 Appli à installer obligatoirement (écran d'accueil) + compteur anonyme ══════════ */
  function installGate(){
    if(window.VZ_HOST || isInstalled() || !/^https?:/.test(location.protocol) || /^(localhost|127\.)/.test(location.hostname) || /[?&]web=1/.test(location.search)) return false;
    let g = document.getElementById('cv-gate'); if(!g){ g = document.createElement('div'); g.id = 'cv-gate'; document.body.appendChild(g); }
    gateRender(); return true;
  }
  function gateRender(){
    const g = document.getElementById('cv-gate'); if(!g) return;
    const ua = navigator.userAgent, ios = isIOS(), iosOther = ios && /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua), android = /Android/i.test(ua);
    // chaque étape = une phrase entière (traduite d’un bloc : bon ordre des mots dans toutes les langues), l’icône à part
    const li = (t, k) => `<li><span>${t}</span>${k ? ` <span class="gk">${k}</span>` : ''}</li>`;
    const steps = ios ? (iosOther ? li('Ouvre cette page dans Safari : sur iPhone, seul Safari sait installer une appli web.') + li('Puis suis les étapes ci-dessous.') : '')
        + li('Touche « Partager » en bas de Safari.', '⬆︎') + li('Choisis « Sur l’écran d’accueil ».', '＋') + li('Touche « Ajouter », puis ouvre Vezoria depuis ton écran d’accueil.')
      : android ? li('Ouvre cette page dans Chrome, pas depuis WhatsApp, Messenger ou Gmail (menu ⋮ → « Ouvrir dans Chrome »).')
          + li(installEvt ? 'Touche le bouton ci-dessous.' : 'Touche le menu ⋮ de Chrome, puis « Installer l’application » (ou « Ajouter à l’écran d’accueil »).')
          + li('Ouvre Vezoria depuis ton écran d’accueil, ou glisse vers le haut pour la trouver dans tes applis.')
          + `</ol><p class="gw"><span>⚠️ Icône introuvable (Honor, Huawei, Xiaomi…) ? Autorise Chrome à créer des raccourcis : Paramètres → Applications → Chrome → Autorisations → « Créer des raccourcis sur l’écran d’accueil », puis réinstalle.</span> <span>Sur Honor, glisse vers le bas au milieu de l’écran et tape « Vezoria » pour la chercher.</span></p><ol class="gs" style="display:none">`
      : li(installEvt ? 'Clique sur le bouton ci-dessous.' : 'Dans Chrome ou Edge : l’icône « Installer » à droite de la barre d’adresse. Dans Safari (Mac) : menu Fichier → Ajouter au Dock.') + li('Ouvre Vezoria depuis tes applications.');
    g.innerHTML = `<div class="gt"><img src="icon-192.png" alt="" class="gi"><h1>Vezoria</h1>
      <p><span>Pour garder tes voyages sur ton téléphone, fonctionner sans réseau et protéger tes données, l’appli s’utilise installée sur ton écran d’accueil.</span> <b>C’est gratuit et ça prend 10 secondes.</b></p>
      ${/[#&]rejoindre=/i.test(location.hash) || M.joinCode ? `<div class="gv"><b>🎟️ Tu es invité(e) dans un voyage</b><b class="cv-code" data-notr>${esc(((location.hash.match(/rejoindre=([A-Za-z0-9-]{8,})/i) || [])[1] || M.joinCode || '').toUpperCase())}</b><p>Pour le rejoindre après l’installation : touche « Copier l’invitation », installe l’appli, puis dans Vezoria touche « Coller l’invitation ».</p><button type="button" class="v-btn sec" id="gv-copy" onclick="CV.gateCopy()">📋 Copier l’invitation</button></div>` : ''}
      <ol class="gs">${steps}</ol>
      ${installEvt ? `<button type="button" class="v-btn" onclick="CV.gateInstall()">📲 Installer l’appli</button>` : ''}
      ${webFollowing() ? `<div class="gb"><button type="button" onclick="CV.webBack()">← Revenir au voyage que je suis</button><button type="button" id="gw-copy" onclick="CV.webCopy()">📋 Copier mon lien de passage (à coller dans l’appli installée)</button></div>` : ''}
      <p class="gm">Aucune inscription, aucune publicité. <a href="mentions-legales">Mentions légales</a> · <a href="privacy">Confidentialité</a></p></div>`;
  }
  // l’appli installée sur iPhone ne voit pas le lien ouvert dans Safari : l’invitation passe par le presse-papiers
  async function gateCopy(){ const b = document.getElementById('gv-copy'); try { await navigator.clipboard.writeText(location.href); if(b) b.textContent = '📋 Invitation copiée'; } catch(e){ await uiPrompt('Copie ce texte :', location.href); } }
  const invCode = s => { const m = String(s || '').match(/rejoindre=([A-Za-z0-9-]{8,})/i); return (m ? m[1] : String(s || '').trim()).toUpperCase(); };
  async function obPaste(){
    let t = ''; try { t = await navigator.clipboard.readText(); } catch(e){}
    const c = /rejoindre=|^[A-Z0-9]{4}-[A-Z0-9]{4}/i.test(t || '') ? invCode(t) : '';
    const i = document.getElementById('cv-scode'); if(c && i){ i.value = c; return; }
    alert('Aucune invitation trouvée dans le presse-papiers : colle-la dans le champ.');
  }
  async function gateInstall(){ if(!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch(e){} installEvt = null; gateRender(); }
  window.addEventListener('beforeinstallprompt', ()=>setTimeout(gateRender, 50));
  window.addEventListener('appinstalled', ()=>{ const g = document.getElementById('cv-gate'); if(g) g.innerHTML = '<div class="gt"><h1>✅ Appli installée</h1><p>Ouvre maintenant <b>Vezoria</b> depuis ton écran d’accueil' + (/Android/i.test(navigator.userAgent) ? ', ou glisse vers le haut et cherche « Vezoria » dans tes applis.</p><p class="gw">⚠️ Icône introuvable (Honor, Huawei, Xiaomi…) ? Autorise Chrome à créer des raccourcis : <b>Paramètres → Applications → Chrome → Autorisations → « Créer des raccourcis sur l’écran d’accueil »</b>, puis réinstalle. Sur Honor, glisse vers le bas au milieu de l’écran et tape « Vezoria » pour la chercher.</p>' : '.</p>') + '</div>'; });
  function countInstall(){
    if(window.VZ_HOST || !isInstalled() || M.instSent || !/^https?:/.test(location.protocol)) return;
    M.instId = M.instId || (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 32);
    const plat = isIOS() ? 'ios' : /Android/i.test(navigator.userAgent) ? 'android' : 'desktop';
    fetch(location.origin + '/api/installs', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:M.instId, plat})})
      .then(r=>{ if(r.ok){ M.instSent = 1; persist(); } }).catch(()=>{});
  }

  /* ══════════ 📕 Album « magazine » : montages variés (pleine page, collages, polaroïds) ══════════ */
  async function albumMagazine(ctx, photos, mode, recits){
    const {pdf, L, page, W, H, Mg, th, C, F, embed, getPg} = ctx;
    const ds = dayList(), told = new Set();
    const head = ps => { const s0 = ps[0] && ps[0].s; if(!s0 || !s0.date) return; const k = ds.indexOf(s0.date), t = pdf1((k >= 0 ? pdf1('Jour ' + (k+1)) + '  ·  ' : '') + longDate(s0.date)); getPg().drawText(t, {x:W/2 - F.i.widthOfTextAtSize(t, 10)/2, y:H - 30, size:10, font:F.i, color:C(th.acc)}); };
    const rad = d => d * Math.PI / 180;
    // dessine une image recadrée dans un cadre (x,y,w,h), avec rotation éventuelle autour du centre
    const put = (im, x, y, w, h, rot) => {
      const pg = getPg(), cx = x + w/2, cy = y + h/2, a = rad(rot||0), cs = Math.cos(a), sn = Math.sin(a);
      const r = Math.max(w/im.width, h/im.height), dw = im.width*r, dh = im.height*r;
      pg.pushOperators(L.pushGraphicsState(), L.concatTransformationMatrix(cs, sn, -sn, cs, cx, cy), L.rectangle(-w/2, -h/2, w, h), L.clip(), L.endPath());
      pg.drawImage(im, {x:-dw/2, y:-dh/2, width:dw, height:dh}); pg.pushOperators(L.popGraphicsState());
    };
    const polaroid = (im, x, y, w, h, rot, cap) => {
      const pg = getPg(), cx = x + w/2, cy = y + h/2, a = rad(rot), cs = Math.cos(a), sn = Math.sin(a), b = w*0.06, bb = w*0.2;
      pg.pushOperators(L.pushGraphicsState(), L.concatTransformationMatrix(cs, sn, -sn, cs, cx, cy));
      pg.drawRectangle({x:-w/2 - b + 3, y:-h/2 - bb - 3, width:w + 2*b, height:h + b + bb, color:L.rgb(0,0,0), opacity:0.18});
      pg.drawRectangle({x:-w/2 - b, y:-h/2 - bb, width:w + 2*b, height:h + b + bb, color:L.rgb(1,1,0.98)});
      pg.pushOperators(L.pushGraphicsState(), L.rectangle(-w/2, -h/2, w, h), L.clip(), L.endPath());
      const r = Math.max(w/im.width, h/im.height); pg.drawImage(im, {x:-im.width*r/2, y:-im.height*r/2, width:im.width*r, height:im.height*r});
      pg.pushOperators(L.popGraphicsState());
      if(cap){ const t = pdf1(cap).slice(0, 38); pg.drawText(t, {x:-F.i.widthOfTextAtSize(t, 11)/2, y:-h/2 - bb*0.62, size:11, font:F.i, color:L.rgb(.25,.22,.3)}); }
      pg.pushOperators(L.popGraphicsState());
    };
    const caption = (txt, y, col) => { const pg = getPg(), t = pdf1(txt).slice(0, 80); if(t) pg.drawText(t, {x:W/2 - F.i.widthOfTextAtSize(t, 12)/2, y, size:12, font:F.i, color:col || C(th.ink)}); };
    const band = (txt, sub) => { const pg = getPg(); pg.drawRectangle({x:0, y:0, width:W, height:120, color:L.rgb(0,0,0), opacity:0.42});
      const t = pdf1(txt).slice(0, 48); pg.drawText(t, {x:Mg, y:62, size:24, font:F.b, color:L.rgb(1,1,1)}); if(sub) pg.drawText(pdf1(sub).slice(0, 70), {x:Mg, y:38, size:12, font:F.i, color:L.rgb(.95,.92,.85)}); };
    const T = [
      { n:1, draw:async (ps)=>{ const im = await embed(ps[0].p); if(!im) return; put(im, 0, 0, W, H); band(ps[0].s.titre || ps[0].s.lieu || '', [ps[0].s.lieu, ps[0].s.date ? longDate(ps[0].s.date) : ''].filter(Boolean).join(' · ')); } },
      { n:3, draw:async (ps)=>{ const g = 10, iw = W - 2*Mg, ih = H - 2*Mg - 30, big = iw*0.62; const ims = await Promise.all(ps.map(x=>embed(x.p)));
          if(ims[0]) put(ims[0], Mg, Mg + 20, big - g/2, ih); if(ims[1]) put(ims[1], Mg + big + g/2, Mg + 20 + ih/2 + g/2, iw - big - g/2, ih/2 - g/2); if(ims[2]) put(ims[2], Mg + big + g/2, Mg + 20, iw - big - g/2, ih/2 - g/2); } },
      { n:3, draw:async (ps)=>{ const ims = await Promise.all(ps.map(x=>embed(x.p))), w = 210, h = 170;
          [[Mg + 10, H - Mg - h - 70, -6], [W - Mg - w - 10, H/2 - h/2 + 10, 5], [Mg + 40, Mg + 80, -2]].forEach(([x,y,r],k)=>{ if(ims[k]) polaroid(ims[k], x, y, w, h, r, ps[k].s.titre || ps[k].s.lieu); }); } },
      { n:4, draw:async (ps)=>{ const g = 8, iw = W - 2*Mg, ih = H - 2*Mg - 30, ims = await Promise.all(ps.map(x=>embed(x.p)));
          const cells = [[0, .55, .58, .45], [.6, .55, .4, .45], [0, 0, .4, .53], [.42, 0, .58, .53]];
          cells.forEach(([cx,cy,cw,ch],k)=>{ if(ims[k]) put(ims[k], Mg + cx*iw, Mg + 20 + cy*ih, cw*iw - (cx+cw < 1 ? g/2 : 0), ch*ih - (cy+ch < 1 ? g/2 : 0)); }); } },
      { n:2, draw:async (ps)=>{ const ims = await Promise.all(ps.map(x=>embed(x.p))), iw = W - 2*Mg, ih = (H - 2*Mg - 80)/2;
          if(ims[0]) put(ims[0], Mg, H - Mg - ih, iw, ih); caption(ps[0].s.titre || '', H - Mg - ih - 22); if(ims[1]) put(ims[1], Mg, Mg + 30, iw, ih); if(ps[1]) caption(ps[1].s.titre || '', Mg + 10); } },
      { n:3, draw:async (ps)=>{ const ims = await Promise.all(ps.map(x=>embed(x.p))), sw = (W - 2*Mg - 16)/3, sh = sw*1.45, y = H/2 - sh/2 + 40;
          ims.forEach((im,k)=>{ if(im) put(im, Mg + k*(sw + 8), y, sw, sh); }); const t = ps.map(x=>x.s.titre).filter(Boolean)[0] || ''; caption(t, y - 30, C(th.acc)); } },
    ];
    // page « récit » : une photo et le texte du souvenir
    const story = async x => { const im = await embed(x.p); const iw = W - 2*Mg, ih = H*0.52; if(im) put(im, Mg, H - Mg - 20 - ih, iw, ih);
      const pg = getPg(); let y = H - Mg - 20 - ih - 40; const t = pdf1(x.s.titre || x.s.lieu || ''); pg.drawText(t, {x:W/2 - F.b.widthOfTextAtSize(t, 20)/2, y, size:20, font:F.b, color:C(th.acc)}); y -= 30;
      for(const l of pdfWrap(pdf1(x.s.texte), F.r, 12.5, iw - 40)){ if(y < Mg + 30) break; pg.drawText(l, {x:I18N.rtl ? W - Mg - 20 - F.r.widthOfTextAtSize(l, 12.5) : Mg + 20, y, size:12.5, font:F.r, color:C(th.ink)}); y -= 19; } };
    const TT = mode === 'polaroid' ? [T[2]] : T;
    let k = 0, ti = 0;
    while(k < photos.length){
      const x0 = photos[k];
      if(recits && x0.s.texte && x0.s.texte.length > 30 && !told.has(x0.s.id)){ told.add(x0.s.id); page(); await story(x0); head([x0]); k++; continue; }
      let t = TT[ti % TT.length]; ti++;
      if(photos.length - k < t.n && mode !== 'polaroid') t = T.find(x=>x.n <= photos.length - k) || T[0];
      const ps = photos.slice(k, k + t.n); page(); await t.draw(ps); if(t !== T[0]) head(ps); k += t.n;
    }
  }

  /* ══════════ 💡 Propositions enrichies par des API gratuites + composition du voyage ══════════
     • Prix réels des vols depuis ta ville : API Escale (Travelpayouts, cache des recherches récentes)
     • Météo réelle du mois : Open-Meteo (relevés de l'an dernier aux mêmes dates)
     • « Bons plans » : destinations les moins chères depuis ta ville, hors liste
     • Composer : villes proches (Wikidata), lieux à voir (Wikipédia), photos et résumés */
  const ESC_API = '';   // version appli : pas de prix de vols (aucune API commerciale)
  const DIATA = {'Lisbonne & Porto':'LIS','Algarve':'FAO','Açores':'PDL','Madère':'FNC','Andalousie':'SVQ','Barcelone':'BCN','Madrid & Tolède':'MAD','Majorque':'PMI','Tenerife':'TCI','Pays basque espagnol':'BIO',
    'Rome':'ROM','Florence & Toscane':'FLR','Venise':'VCE','Pouilles':'BRI','Sicile':'PMO','Naples & côte amalfitaine':'NAP','Dolomites':'VRN','Sardaigne':'CAG','Corse':'AJA','Provence':'MRS','Amsterdam':'AMS','Londres':'LON',
    'Écosse':'EDI','Irlande':'DUB','Berlin':'BER','Prague':'PRG','Vienne & Budapest':'VIE','Croatie (Split & Dubrovnik)':'SPU','Slovénie':'LJU','Athènes & Cyclades':'ATH','Crète':'HER','Malte':'MLA','Istanbul':'IST',
    'Cappadoce':'NAV','Marrakech & Atlas':'RAK','Fès & désert marocain':'FEZ','Égypte (Nil)':'LXR','Jordanie':'AMM','Islande':'REK','Fjords de Norvège':'BGO','Laponie finlandaise':'RVN','New York':'NYC','Ouest américain':'LAS',
    'Québec':'YMQ','Japon':'TYO','Thaïlande':'BKK','Vietnam':'HAN','Bali':'DPS','Sri Lanka':'CMB','La Réunion':'RUN','Guadeloupe':'PTP','Costa Rica':'SJO','Mexique (Yucatán)':'CUN','Cap-Vert':'SID'};
  const DEP_IATA = {Paris:'PAR', Nantes:'NTE', Brest:'BES', Rennes:'RNS', Lyon:'LYS', Marseille:'MRS', Nice:'NCE', Bordeaux:'BOD', Toulouse:'TLS', Lille:'LIL', Strasbourg:'SXB', Montpellier:'MPL', Bruxelles:'BRU', 'Genève':'GVA'};
  const inspLive = {prices:null, temps:{}, names:null, key:''};
  function depIata(S){ if(DEP_IATA[S.dep]) return DEP_IATA[S.dep]; if(/^[A-Z]{3}$/.test(S.iata||'')) return S.iata;
    if(!S.depLL) return ''; let best = null, bd = 1e9; Object.entries(DEPS).forEach(([k,d])=>{ const x = km({lat:S.depLL[0], lng:S.depLL[1]}, {lat:d[0], lng:d[1]}); if(x < bd){ bd = x; best = k; } }); return bd <= 250 ? DEP_IATA[best] : ''; }
  const monthKey = S => { const now = new Date(); let m = +S.mois || (now.getMonth() + 2); let y = now.getFullYear(); if(m > 12){ m -= 12; y++; } if(m < now.getMonth() + 1) y++; return `${y}-${String(m).padStart(2,'0')}`; };
  async function inspEnrich(){
    const S = M.insp; if(!S) return; const key = S.dep + '|' + monthKey(S);
    const tasks = [];
    if(inspLive.key !== key){ inspLive.key = key; inspLive.prices = null;
      const org = ESC_API && depIata(S); if(org) tasks.push(fetch(`${ESC_API}/api/anywhere?origin=${org}&month=${monthKey(S)}`).then(r=>r.json()).then(j=>{ inspLive.prices = {}; (j.results||[]).forEach(o=>{ if(!(o.destination in inspLive.prices)) inspLive.prices[o.destination] = o; }); }).catch(()=>{ inspLive.prices = {}; })); }
    if(!inspLive.names && ESC_API) tasks.push(fetch(`${ESC_API}/api/cities`).then(r=>r.json()).then(j=>{ inspLive.names = j && typeof j === 'object' ? (j.names || j) : {}; }).catch(()=>{ inspLive.names = {}; }));
    // météo réelle du mois pour les cartes affichées
    const ym = monthKey(S), yy = +ym.slice(0,4) - 1, mm = ym.slice(5);
    const shown = [...document.querySelectorAll('.cv-idea[data-i]')].map(e=>+e.dataset.i).filter(i=>DESTS[i]);
    shown.forEach(i=>{ const d = DESTS[i], k = i + '|' + mm; if(inspLive.temps[k] != null) return;
      const end = new Date(yy, +mm, 0).getDate();
      tasks.push(fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${d[3]}&longitude=${d[4]}&start_date=${yy}-${mm}-01&end_date=${yy}-${mm}-${end}&daily=temperature_2m_max,precipitation_sum&timezone=auto`).then(r=>r.json()).then(j=>{
        const t = (j.daily||{}).temperature_2m_max || [], pr = (j.daily||{}).precipitation_sum || [];
        if(t.length) inspLive.temps[k] = {t:Math.round(t.reduce((a,b)=>a+(b||0),0)/t.length), pluie:pr.filter(x=>x >= 1).length, y:yy}; }).catch(()=>{})); });
    await Promise.all(tasks);
    inspPaint();
  }
  function inspPaint(){
    const S = M.insp; if(!S) return; const mm = monthKey(S).slice(5), nb = Math.min(6, +S.nb || 1);
    document.querySelectorAll('.cv-idea[data-i]').forEach(el=>{
      const i = +el.dataset.i, d = DESTS[i]; if(!d) return;
      const w = inspLive.temps[i + '|' + mm], tEl = el.querySelector('[data-k="t"]');
      if(w && tEl) tEl.innerHTML = `🌡️ ${w.t} °C · ${w.pluie} j de pluie <small>(relevé ${w.y})</small>`;
      const pr = inspLive.prices && inspLive.prices[DIATA[d[0]]], pEl = el.querySelector('[data-k="p"]');
      if(pr && pEl){ pEl.innerHTML = `✈️ <b>dès ${eur(pr.price)}</b> A/R${pr.transfers ? ' · ' + pr.transfers + ' escale' + (pr.transfers > 1 ? 's' : '') : ' · direct'} <small>(vu récemment)</small>`; pEl.classList.add('live');
        const x = inspRes.find(r=>r.i === i); if(x){ const est = pr.price + x.stay, b = el.querySelector('[data-k="b"]'); if(b) b.innerHTML = `Vol ≈ ${eur(pr.price)} (réel) · sur place ≈ ${eur(x.stay)} · <b>total groupe ≈ ${eur(est * nb)}</b>`;
          const e2 = el.querySelector('[data-k="e"]'); if(e2) e2.textContent = `💶 ≈ ${eur(est)} / pers.`; x.live = pr.price; } }
    });
    // bons plans : les destinations les moins chères depuis ta ville, absentes de la liste
    const bp = document.getElementById('insp-bp'); if(!bp || !inspLive.prices) return;
    const known = new Set(Object.values(DIATA)), budT = num(S.budget) ? num(S.budget) * 0.45 : 400;
    const deals = Object.values(inspLive.prices).filter(o=>!known.has(o.destination) && o.price <= budT && inspLive.names && inspLive.names[o.destination]).slice(0, 8);
    bp.innerHTML = deals.length ? `<h3 style="margin:14px 0 6px">✈️ Bons plans depuis ${esc(S.dep === 'autre' ? S.depTxt : S.dep)} <small class="v-sum-small">(${MOIS_L[+monthKey(S).slice(5)-1]})</small></h3><div class="cv-deals">${deals.map(o=>`<button type="button" class="cv-deal" onclick="CV.inspDeal('${esc(o.destination)}')"><b>${esc(inspLive.names[o.destination])}</b><span>dès ${eur(o.price)}</span><small>${o.transfers ? o.transfers + ' escale(s)' : 'direct'}</small></button>`).join('')}</div>` : '';
  }
  async function inspDeal(code){
    const nm = (inspLive.names || {})[code] || code; toast('📡 ' + nm + '…');
    const g = await geocode(nm, null).catch(()=>null); if(!g){ alert('Ville introuvable.'); return; }
    const pr = (inspLive.prices || {})[code], S = M.insp || {}, days = +(S.duree||7);
    // proposition « à la volée » construite à partir des API
    const d = [nm, '', '', g.lat, g.lng, 'ville culture', [], 90, [3, Math.max(4, days)], [[nm, Math.max(1, days-1)]], 'Bon plan trouvé dans les prix récents : vérifie le tarif du jour avec Escale.', 'P', Array(12).fill(20), nm];
    const i = DESTS.push(d) - 1; DIATA[nm] = code;
    inspRes.unshift({i, d, nom:nm, pays:'', cc:'', tip:d[10], visa:'P', wk:nm, tags:['ville'], best:[], dur:d[8], sc:0, est:(pr ? pr.price : 0) + 90*Math.max(1,days-1), trans:pr ? pr.price : 0, stay:90*Math.max(1,days-1), h:0, ground:false, escale:false, mo:+monthKey(S).slice(5), tmp:'?', why:['✈️ bon plan dès ' + eur(pr ? pr.price : 0)], warn:[], itin:d[9]});
    inspOpen(i);
  }

  /* ---------- 🧩 Composer le voyage à partir d'une proposition ---------- */
  let comp = null;
  async function wdNear(lat, lng, km_){
    const q = `SELECT ?c ?cLabel ?img ?coord ?n WHERE { SERVICE wikibase:around { ?c wdt:P625 ?coord. bd:serviceParam wikibase:center "Point(${lng} ${lat})"^^geo:wktLiteral. bd:serviceParam wikibase:radius "${km_}". }
      VALUES ?t { wd:Q515 wd:Q1549591 wd:Q5119 wd:Q3957 wd:Q15284 wd:Q1637706 } ?c wdt:P31 ?t. ?c wikibase:sitelinks ?n. FILTER(?n > 25) OPTIONAL { ?c wdt:P18 ?img }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". } } ORDER BY DESC(?n) LIMIT 18`;
    const j = await (await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q), {headers:{Accept:'application/sparql-results+json'}})).json();
    const seen = new Set();
    return (j.results && j.results.bindings || []).map(b=>{ const m = (b.coord.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/) || []);
      return {c:b.cLabel.value, lng:+m[1], lat:+m[2], img:b.img ? b.img.value.replace(/^http:/,'https:') + '?width=240' : '', n:+b.n.value}; })
      .filter(x=>!/^Q\d+$/.test(x.c) && !seen.has(normQ(x.c)) && seen.add(normQ(x.c)));
  }
  async function inspOpen(i){
    const x = inspRes.find(r=>r.i === i); if(!x) return; const S = M.insp || {}, days = +(S.duree||7);
    comp = {i, x, nights:Math.max(1, days-1), stops:inspItin(x, days, S.rythme).map(([c,n])=>({c, n, lat:null, lng:null})), sel:{}, places:{}, near:null};
    compRender();
    const [la, lo] = [x.d[3], x.d[4]];
    // résumé (Wikivoyage, sinon Wikipédia)
    (async()=>{ for(const host of ['fr.wikivoyage.org','fr.wikipedia.org']){ try { const j = await (await fetch(`https://${host}/w/api.php?action=query&prop=extracts|pageimages&exintro=1&explaintext=1&exsentences=4&piprop=thumbnail&pithumbsize=800&redirects=1&format=json&origin=*&titles=` + encodeURIComponent(x.wk))).json();
        const pg = Object.values((j.query||{}).pages||{})[0]; if(pg && pg.extract){ const h = esc(pg.extract) + ` <small>(${host.includes('voyage') ? 'Wikivoyage' : 'Wikipédia'}, CC BY-SA)</small>`; if(comp && comp.i === i){ comp.sum = h; if(pg.thumbnail) comp.img = pg.thumbnail.source; }
          const e = document.getElementById('cp-sum'); if(e) e.innerHTML = h;
          if(pg.thumbnail){ const im = document.getElementById('cp-img'); if(im){ im.src = pg.thumbnail.source; im.parentNode.classList.add('has'); } } return; } } catch(e){} } })();
    // positions des étapes, puis lieux à voir
    for(const s of comp.stops){ if(!comp || comp.i !== i) return; const g = s.c === x.d[9][0][0] && x.d[3] ? null : await geocode(s.c + (x.pays ? ', ' + x.pays : ''), null).catch(()=>null);
      s.lat = g ? g.lat : la; s.lng = g ? g.lng : lo; compPlaces(s); }
    // villes proches (Wikidata)
    try { comp.near = await wdNear(la, lo, days > 9 ? 280 : 160); } catch(e){ comp.near = []; }
    if(comp && comp.i === i) compNear();
  }
  function compRender(){
    const c = comp, x = c.x, used = c.stops.reduce((s,a)=>s+a.n,0);
    openSheet(`<h2>${flag(x.cc)} ${esc(x.nom)}</h2>
      <div class="cp-hero"><img id="cp-img" alt=""></div>
      <p id="cp-sum" class="wk-tx">📖 Chargement de la présentation…</p>
      ${x.globe ? `<div class="cp-facts">${x.known && x.best.length ? `<span>📅 Meilleure période : ${x.best.map(m=>MOIS[m-1]).join(', ')}</span>` : ''}${x.known ? `<span>🌡️ ${x.tmp} °C en ${MOIS_L[x.mo-1]}</span>` : ''}<span>💶 ≈ ${eur(x.d[7])} / jour / pers. sur place</span><span>${VISA[x.visa] || ''}</span>${x.tip ? `<span class="tip">💡 ${esc(x.tip)}</span>` : ''}</div>` : ''}
      <h3>🗺️ Mes étapes <small class="v-sum-small">${used} / ${c.nights} nuit${c.nights>1?'s':''}</small></h3>
      <div id="cp-stops">${c.stops.map((s,k)=>`<div class="cp-stop"><b>${k+1}. ${esc(s.c)}</b><span class="cp-n"><button type="button" onclick="CV.compN(${k},-1)" aria-label="Enlever">−</button>${s.n} n.<button type="button" onclick="CV.compN(${k},1)" aria-label="Ajouter">＋</button></span>${c.stops.length > 1 ? `<button type="button" class="cv-x" onclick="CV.compDel(${k})" aria-label="Retirer">✕</button>` : ''}</div>`).join('')}</div>
      ${used !== c.nights ? `<div class="v-sum-small" style="color:#a16207">${used < c.nights ? 'Il reste ' + (c.nights-used) + ' nuit(s) à placer' : 'Tu dépasses de ' + (used-c.nights) + ' nuit(s) : le voyage sera rallongé'}.</div>` : ''}
      <h3>➕ Ajouter une étape <small class="v-sum-small">villes à proximité</small></h3><div id="cp-near" class="cp-near">${c.near ? '' : '<div class="v-sum-small">📡 Recherche des villes proches…</div>'}</div>
      <h3>🔎 À voir <small class="v-sum-small">coche ce qui te tente</small></h3>
      <div id="cp-places">${c.stops.map((s,k)=>`<div class="cp-pl" id="cp-pl-${k}"><b>${esc(s.c)}</b><div class="cp-grid">${(c.places[s.c]||null) ? '' : '<div class="v-sum-small">📡 Recherche…</div>'}</div></div>`).join('')}</div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.compCreate()">🧳 Créer mon voyage (${c.stops.length} étape${c.stops.length>1?'s':''}, ${Object.values(c.sel).reduce((s,a)=>s+a.length,0)} lieu${Object.values(c.sel).reduce((s,a)=>s+a.length,0)>1?'x':''})</button><button type="button" class="v-btn sec cv-sq" onclick="CV.inspBack()" aria-label="Revenir en arrière">←</button></div>`);
    const im = document.getElementById('cp-img'); if(c.img && im){ im.src = c.img; im.parentNode.classList.add('has'); }
    if(c.sum){ const e = document.getElementById('cp-sum'); if(e) e.innerHTML = c.sum; }
    if(c.near) compNear(); c.stops.forEach(s=>{ if(c.places[s.c]) compPlacesPaint(s); });
  }
  function compNear(){
    const el = document.getElementById('cp-near'); if(!el || !comp) return; const have = new Set(comp.stops.map(s=>normQ(s.c)));
    const l = (comp.near||[]).filter(n=>!have.has(normQ(n.c))).slice(0, 12);
    el.innerHTML = l.length ? l.map(n=>`<button type="button" class="cp-city" onclick="CV.compAdd('${esc(n.c).replace(/'/g,'&#39;')}',${n.lat},${n.lng})">${n.img ? `<img src="${esc(n.img)}" alt="" loading="lazy">` : '<i>🏙️</i>'}<span>${esc(n.c)}</span><small>＋ ajouter</small></button>`).join('') : '<div class="v-sum-small">Pas d’autre ville proposée.</div>';
  }
  async function compPlaces(s){
    if(!comp) return; try { const l = await seeWiki({lat:s.lat, lng:s.lng}); comp.places[s.c] = l.filter(p=>normQ(p.nom) !== normQ(s.c)).slice(0, 9); } catch(e){ comp.places[s.c] = []; }
    await wkThumbs(comp.places[s.c]); compPlacesPaint(s);
  }
  function compPlacesPaint(s){
    const k = comp.stops.indexOf(s), el = document.querySelector(`#cp-pl-${k} .cp-grid`); if(!el) return;
    const l = comp.places[s.c] || [], sel = new Set((comp.sel[s.c]||[]).map(p=>p.nom));
    el.innerHTML = l.length ? l.map((p,j)=>{ const w = wkParse(p.wiki), u = w && wkCache[w.lang+':'+w.title];
      return `<button type="button" class="cp-place${sel.has(p.nom)?' on':''}" onclick="CV.compTog(${k},${j})">${u ? `<img src="${esc(u)}" alt="" loading="lazy">` : `<i>${(POI_CATS[p.cat]||{icon:'📍'}).icon}</i>`}<span>${esc(p.nom)}</span><em>${sel.has(p.nom) ? '✓' : '＋'}</em></button>`; }).join('') : '<div class="v-sum-small">Aucun lieu trouvé (réseau ?).</div>';
  }
  function compTog(k, j){ const s = comp.stops[k], p = (comp.places[s.c]||[])[j]; if(!p) return; const L = comp.sel[s.c] = comp.sel[s.c] || []; const at = L.findIndex(x=>x.nom===p.nom); at >= 0 ? L.splice(at,1) : L.push(p); compPlacesPaint(s); compFoot(); }
  function compFoot(){ const b = document.querySelector('#v-sheet-bg .v-actions .v-btn'); if(b){ const n = Object.values(comp.sel).reduce((s,a)=>s+a.length,0); b.textContent = `🧳 Créer mon voyage (${comp.stops.length} étape${comp.stops.length>1?'s':''}, ${n} lieu${n>1?'x':''})`; } }
  function compN(k, d){ const s = comp.stops[k]; s.n = Math.max(1, s.n + d); const y = (document.querySelector('#v-sheet-bg .v-sheet')||{}).scrollTop; compRender(); const sh = document.querySelector('#v-sheet-bg .v-sheet'); if(sh) sh.scrollTop = y; }
  function compDel(k){ const s = comp.stops.splice(k,1)[0]; delete comp.sel[s.c]; const y = (document.querySelector('#v-sheet-bg .v-sheet')||{}).scrollTop; compRender(); const sh = document.querySelector('#v-sheet-bg .v-sheet'); if(sh) sh.scrollTop = y; }
  function compAdd(c, lat, lng){
    const s = {c, n:1, lat, lng}; const big = comp.stops.reduce((a,b)=>b.n > a.n ? b : a, comp.stops[0]); if(big && big.n > 2) big.n--;   // on prend une nuit à l'étape la plus longue
    comp.stops.push(s); const y = (document.querySelector('#v-sheet-bg .v-sheet')||{}).scrollTop; compRender(); const sh = document.querySelector('#v-sheet-bg .v-sheet'); if(sh) sh.scrollTop = y; compPlaces(s); toast('➕ ' + c);
  }
  function inspBack(){ comp = null; inspShow(inspN); }
  function compCreate(){ if(!comp) return; const c = comp; inspireCreate(c.i, {stops:c.stops.map(s=>[s.c, s.n]), sel:c.sel}); comp = null; }

  /* ══════════ 🧭 Chaque espace garde SON voyage + onglets internes (En cours / Bilan) ══════════ */
  const INNER = {live:[['live','📍 Aujourd’hui'],['souv','📸 Souvenirs'],['budget','💶 Dépenses']], bilan:[['bilan','🏁 Bilan'],['budget','💶 Budget'],['ech','📅 Échéancier'],['souv','📸 Souvenirs']]};
  function innerGo(k){ M.inner = M.inner || {}; M.inner[M.mode] = k; persist(); render(); window.scrollTo({top:0}); }
  function innerBar(){ const L = INNER[M.mode]; if(!L) return ''; if(navPhase() && navPhase() === (M.mode === 'bilan' ? 'past' : M.mode)) return '';   /* déjà dans la barre du bas */ const cur = (M.inner||{})[M.mode] || L[0][0];
    return `<div class="tabs cv-sub cv-inner">${L.map(([k,l])=>`<button type="button" class="${cur===k?'on':''}" onclick="CV.innerGo('${k}')">${l}</button>`).join('')}</div>`; }
  function innerRender(){
    const L = INNER[M.mode]; if(!L || !trip()) return false; const cur = (M.inner||{})[M.mode] || L[0][0];   // plus de voyage ouvert (démo effacée…) : écran normal
    if(cur === L[0][0]) return false;
    const fn = {budget: M.mode === 'bilan' ? bilanBudgetRender : renderBudget, ech:renderEch, souv:renderSouv}[cur]; if(!fn) return false;
    const keep = M.tab; M.tab = cur; try { fn(); } finally { M.tab = keep; }
    const body = document.getElementById('cv-body'); body.insertAdjacentHTML('afterbegin', innerBar() + (cur === 'budget' && M.mode !== 'bilan' ? bilanSplit() : ''));
    if(cur === 'souv'){ const f = document.getElementById('cv-fab'); if(f){ f.style.display = ''; } }
    hydrate(); return true;
  }
  // Dépenses prévues (réservées avant le départ) / sur place (pendant le voyage) / dépassement par rapport aux estimations
  function bilanSplit(){
    const t = trip(); if(!t || !t.debut) return '';
    const all = items(), during = i => i.cat === 'divers' && i.date && i.date >= t.debut && (!t.fin || i.date <= t.fin);
    const prev = all.filter(i=>!during(i)).reduce((s,i)=>s+totalOf(i),0), sur = all.filter(during).reduce((s,i)=>s+totalOf(i),0);
    const est = all.reduce((s,i)=>s+num(i.estime)*(partage(i)==='pp' ? Math.max(1, parts(i).length) : 1),0), reel = all.filter(i=>num(i.prix)).reduce((s,i)=>s+totalOf(i),0);
    const mx = Math.max(1, prev, sur);
    return `<div class="v-box"><h3>💶 Prévu ou sur place ?</h3>
      <div class="cv-bbar"><span>🧳 Prévu avant le départ</span><i style="width:${prev/mx*100}%"></i><b>${eur(prev)}</b></div>
      <div class="cv-bbar"><span>📍 Dépensé sur place</span><i style="width:${sur/mx*100}%;background:linear-gradient(90deg,#fbbf24,#f97316)"></i><b>${eur(sur)}</b></div>
      ${est ? `<p class="v-sum-small">Estimations de départ : ${eur(est)} · montants réels saisis : ${eur(reel)}${reel > est ? ' · <b style="color:#b45309">dépassement ' + eur(reel - est) + '</b>' : ''}.</p>` : ''}
      ${num(t.plafond) ? `<p class="v-sum-small">Plafond sur place : ${eur(num(t.plafond))} / jour.</p>` : ''}</div>`;
  }

  /* ══════════ 📦 Paquet : un voyage choisi, photos en fichiers séparés (plus de plantage) ══════════ */
  function pkgSheet(){
    const ts = trips().filter(t=>!t.demo);
    openSheet(`<h2>📦 Envoyer un paquet</h2>
      <div class="v-sum-small" style="margin-bottom:8px">Choisis le ou les voyages à envoyer : l’autre personne ne reçoit <b>que ceux-là</b>, chiffrés avec la phrase du groupe.</div>
      <div class="v-f">${ts.map(t=>`<label class="cv-checkline"><input type="checkbox" class="pk-t" value="${t.id}"${t.id===M.trip?' checked':''}> ${esc(t.titre)} <small class="v-sum-small">${tripDatesLong(t)}</small></label>`).join('') || '<div class="v-sum-small">Aucun voyage.</div>'}</div>
      <div class="v-f"><label>Phrase du groupe (la même pour tous)</label><input class="v-in" id="pk-pass" type="text" autocomplete="off" value="${esc(M.pkgPass||'')}" placeholder="Ex. ciel-orange-rome-2027"></div>
      <label class="cv-checkline"><input type="checkbox" id="pk-ph" checked> Photos (vignettes, légères)</label>
      <label class="cv-checkline"><input type="checkbox" id="pk-full"> Photos en grand format (fichier plus lourd)</label>
      <div id="pk-msg" class="v-sum-small"></div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.pkgExport()">📤 Créer et envoyer</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  async function pkgExport(){
    const msg = m => { const e = document.getElementById('pk-msg'); if(e) e.textContent = m; };
    const pass = (document.getElementById('pk-pass')||{}).value || ''; if(pass.trim().length < 6){ alert('Choisis une phrase d’au moins 6 caractères, la même pour tout le groupe.'); return; }
    const sel = new Set([...document.querySelectorAll('.pk-t:checked')].map(i=>i.value)); if(!sel.size){ alert('Choisis au moins un voyage.'); return; }
    M.pkgPass = pass.trim(); persist();
    const withPh = document.getElementById('pk-ph').checked, full = document.getElementById('pk-full').checked;
    try {
      const pids = new Set(); [...sel].forEach(id=>(R[id].voyageurs||[]).forEach(p=>pids.add(p)));
      const recs = Object.values(R).filter(r=>!r.demo && (sel.has(r.id) || sel.has(r.trip) || (r.type==='profile' && pids.has(r.id))));
      const salt = crypto.getRandomValues(new Uint8Array(16)), key = await pkgKey(pass, salt), te_ = new TextEncoder();
      const enc = async u8 => { const iv = crypto.getRandomValues(new Uint8Array(12)), c = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, u8)); const o = new Uint8Array(12 + c.length); o.set(iv); o.set(c, 12); return o; };
      const files = [{name:'paquet.bin', data: await enc(te_.encode(JSON.stringify({app:'carnet-voyage', v:2, t:Date.now(), from:M.me ? pname(M.me) : '', records:recs})))}];
      if(withPh){ const ids = new Set(); recs.forEach(r=>{ (r.photos||[]).forEach(p=>ids.add(p)); if(r.recu) ids.add(r.recu); });
        let k = 0; for(const id of ids){ k++; if(k % 10 === 0) msg(`📸 ${k} / ${ids.size}…`);
          for(const v of full ? [id + '.t', id] : [id + '.t']){ const b = await photoBlob(v).catch(()=>null); if(b) files.push({name:'p/' + v, data: await enc(new Uint8Array(await b.arrayBuffer()))}); } } }
      files.unshift({name:'carnet-paquet.json', data:te_.encode(JSON.stringify({carnetPaquet:2, salt:tlB64.enc(salt)}))});
      msg('📦 Assemblage…'); const zip = await zipBuild(files);
      const name = `paquet-${isoToday()}-${(M.me ? pname(M.me) : 'moi').toLowerCase().replace(/[^\w]+/g,'')}.carnet`;
      closeSheet(true); await tlShareFile(new File([zip], name, {type:'application/octet-stream'}), name, 'Paquet Vezoria');
      M.pkgLast = Date.now(); pkgSnap(); persist(); toast(`📦 Paquet prêt (${(zip.size/1048576).toFixed(1)} Mo)`);
    } catch(e){ msg('⚠️ ' + e.message); }
  }
  async function pkgOpen(f){
    const head = new Uint8Array(await f.slice(0, 4).arrayBuffer());
    if(!(head[0] === 0x50 && head[1] === 0x4b)) return pkgOpenV1(f);       // ancien format (JSON)
    const z = await zipRead(f), get = async n => { const v = z[n]; return typeof v === 'function' ? await v() : v; };
    const hd = JSON.parse(new TextDecoder().decode(await get('carnet-paquet.json')));
    const pass = (await uiPrompt('Phrase du groupe :', M.pkgPass || '')); if(pass === null) return;
    const key = await pkgKey(pass, tlB64.dec(hd.salt)), dec = async u8 => new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM', iv:u8.slice(0,12)}, key, u8.slice(12)));
    let data; try { data = JSON.parse(new TextDecoder().decode(await dec(await get('paquet.bin')))); } catch(e){ alert('Phrase incorrecte : impossible d’ouvrir ce paquet.'); return; }
    M.pkgPass = pass.trim();
    const photos = {}; for(const k of Object.keys(z).filter(k=>k.startsWith('p/'))) photos[k.slice(2)] = async () => dec(await get(k));
    return pkgMerge(data, photos);
  }

  function backupNag(){
    const real = Object.values(R).filter(r=>!r.demo && r.type!=='profile').length; if(real < 10) return;
    const last = Math.max(M.zipLast || 0, M.zipAsk || 0); if(Date.now() - last < 30*864e5) return;
    if(document.getElementById('v-sheet-bg')) return;   // pas par-dessus une autre fenêtre
    M.zipAsk = Date.now(); persist();
    openSheet(`<h2>💾 Petite sauvegarde ?</h2><div class="v-sum-small" style="margin-bottom:10px">${M.zipLast ? 'Ta dernière sauvegarde complète date du ' + new Date(M.zipLast).toLocaleDateString((window.I18N ? I18N.locale : 'fr-FR')) : 'Tu n’as encore jamais fait de sauvegarde complète'}. Une fois par mois, garde une copie de tout ton carnet (photos comprises) dans Fichiers, iCloud ou Drive : si tu perds ou changes de téléphone, tu retrouves tout.</div>
      <button type="button" class="v-btn" onclick="CV.zipSheet()">💾 Faire ma sauvegarde</button><div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Plus tard (dans un mois)</button></div>`);
  }
  /* ══════════ 🏁 Bilan › Budget : qui rembourse qui, quand, comment, avec les justificatifs ══════════ */
  const MOYENS = ['Lydia','Wero','Virement','Espèces','PayPal','Paylib','Revolut','Chèque','Autre'];
  function bilanBudgetRender(){
    const t = trip(), all = items(), v = tv(), tot = all.reduce((s,i)=>s+totalOf(i),0), bal = balances();
    const hasF = v.some(p=>tFoyer(p)), SF = hasF ? settleFoyers(bal) : null, tr = hasF ? SF.tr : settle(bal), nm = hasF ? SF.lbl : pname_c, rb = rembs();
    const pay = it => v.filter(p=>advancedBy(it,p) > 0.01).map(p=>`${pname_c(p)} ${eur(advancedBy(it,p))}`).join(' + ') || '<i>personne</i>';
    const pour = it => { const l = v.filter(p=>shareOf(it,p) > 0.01); return l.length === v.length ? 'tout le monde' : l.map(p=>`${pname_c(p)} ${eur(shareOf(it,p))}`).join(', '); };
    const just = it => { const ph = it.recu || ((it.pj||[]).find(x=>x.t==='img')||{}).id, pdf = (it.pj||[]).find(x=>x.t==='pdf');
      return ph ? `<button type="button" class="bb-j" onclick="CV.rcOpen('${esc(it.id)}','${esc(ph)}')"><img data-ph="${esc(ph)}.t" alt=""></button>` : pdf ? `<button type="button" class="bb-j pdf" onclick="CV.pjOpen('${esc(pdf.id)}','pdf')">PDF</button>` : `<button type="button" class="bb-j none" onclick="CV.edit('${esc(it.id)}')" title="Joindre un justificatif" aria-label="Joindre un justificatif">📎</button>`; };
    const exp = all.filter(i=>totalOf(i) > 0).sort((a,b)=>(a.date||'9').localeCompare(b.date||'9'));
    const noJ = exp.filter(i=>!i.recu && !(i.pj||[]).length).length;
    let h = `<div class="v-sum"><div class="v-sum-row"><div class="v-sum-big">${eur(tot)}</div><div class="v-sum-small">${v.length > 1 ? eur(tot / v.length) + ' / personne en moyenne' : ''}</div></div>
      <div class="bb-state ${tr.length ? 'wait' : 'ok'}">${tr.length ? `⏳ ${tr.length} remboursement${tr.length>1?'s':''} à faire` : '✅ Comptes soldés entre vous'}${rb.length ? ` · ${rb.length} déjà noté${rb.length>1?'s':''}` : ''}</div></div>`;
    h += bilanSplit();
    h += `<div class="v-box"><h3>💸 Qui doit quoi à qui</h3>${tr.length ? tr.map(x=>`<div class="bb-tr"><span>${nm(x.de)} doit <b>${eur(x.v)}</b> à ${nm(x.a)}${(prof(x.a)||{}).rembours ? `<small>💳 ${esc(prof(x.a).rembours)}</small>` : ''}</span>
        <span class="bb-bt"><button type="button" onclick="CV.rbSheet('${x.de}','${x.a}',${x.v.toFixed(2)})">✅ Réglé</button><button type="button" onclick="CV.rembAsk('${x.de}','${x.a}',${x.v.toFixed(2)})">📤 Demander</button></span></div>`).join('')
        : '<p class="v-sum-small">Personne ne doit rien à personne. 🎉</p>'}
      <p class="v-sum-small">Calcul : ce que chacun a avancé − sa part de chaque dépense ± les remboursements déjà notés. ${hasF ? 'Calculé entre foyers.' : ''} Répartitions réglables dans ⚖️ Parts & foyers et dans chaque fiche (Paiement).</p>
      <button type="button" class="v-day-edit" onclick="CV.partsSheet()">⚖️ Parts & foyers</button></div>`;
    h += `<div class="v-box"><h3>✅ Remboursements notés</h3>${rb.length ? rb.map(x=>`<div class="bb-rb"><span><b>${fshort(x.date||isoToday())}</b> · ${pname_c(x.de)} → ${pname_c(x.a)} <b>${eur(num(x.montant))}</b>${x.moyen ? ` · ${esc(x.moyen)}` : ''}${x.note ? `<small>${esc(x.note)}</small>` : ''}</span>
        ${x.preuve ? `<button type="button" class="bb-j" onclick="CV.pjOpen('${esc(x.preuve)}','img')"><img data-ph="${esc(x.preuve)}.t" alt=""></button>` : ''}<button type="button" class="cv-x" onclick="CV.rembDel('${x.id}')" aria-label="Supprimer">✕</button></div>`).join('') : '<p class="v-sum-small">Aucun pour l’instant : touche « ✅ Réglé » quand quelqu’un rembourse.</p>'}
      <button type="button" class="v-day-edit" onclick="CV.rbSheet('','',0)">＋ Noter un remboursement</button></div>`;
    h += `<div class="v-box"><h3>👤 Par personne</h3><div class="bb-tab"><div class="hd"><span></span><span>A avancé</span><span>Sa part</span><span>Remb.</span><span>Solde</span></div>
      ${bal.map(b=>`<div><span>${pname_c(b.pid)}</span><span>${eur(b.avance)}</span><span>${eur(b.part)}</span><span>${b.verse || b.recu ? (b.verse ? '−' + eur(b.verse) : '') + (b.recu ? ' +' + eur(b.recu) : '') : '—'}</span><span class="${b.solde > 0.5 ? 'pos' : b.solde < -0.5 ? 'neg' : ''}">${b.solde > 0.5 ? '+' : ''}${eur(b.solde)}</span></div>`).join('')}</div>
      <p class="v-sum-small">Solde positif : on lui doit de l’argent · négatif : il doit rembourser.</p></div>`;
    h += `<div class="v-box"><h3>🧾 Dépenses et justificatifs</h3><p class="v-sum-small">${exp.length} dépense${exp.length>1?'s':''}${noJ ? ` · <b>${noJ} sans justificatif</b> (touche 📎 pour en joindre un)` : ' · toutes justifiées'}</p>
      ${exp.map(it=>`<div class="bb-ex">${just(it)}<button type="button" class="bb-ex-t" onclick="CV.edit('${it.id}')"><b>${icon(it)} ${esc(it.titre)}</b><small>${it.date ? fshort(it.date) + ' · ' : ''}payé par ${pay(it)}</small><small>pour ${pour(it)}</small></button><span class="bb-m">${eur(totalOf(it))}<small>${it.statut==='paid' ? 'payé' : it.statut==='booked' ? 'réservé' : 'prévu'}</small></span></div>`).join('') || '<p class="v-sum-small">Aucune dépense.</p>'}</div>`;
    document.getElementById('cv-body').innerHTML = h;
  }
  function rcOpen(itemId, ph){ const it = R[itemId]; if(it && it.recu === ph) return rcView(itemId); pjOpen(ph, 'img'); }
  let rbProof = null;
  function rbSheet(de, a, v){
    const p = tv(); rbProof = null;
    const sel = (id, cur) => `<select class="v-in" id="${id}">${p.map(x=>`<option value="${x}"${x===cur?' selected':''}>${esc(pname(x))}</option>`).join('')}</select>`;
    openSheet(`<h2>✅ Noter un remboursement</h2>
      <div class="v-f2"><div class="v-f"><label>Qui rembourse ?</label>${sel('rb-de', de || p[0])}</div><div class="v-f"><label>À qui ?</label>${sel('rb-a', a || p[1] || p[0])}</div></div>
      <div class="v-f2"><div class="v-f"><label>Montant (${CS()})</label><input class="v-in" id="rb-m" inputmode="decimal" value="${v ? String(Math.round(v*100)/100).replace('.', ',') : ''}"></div><div class="v-f"><label>Quand ?</label><input class="v-in" id="rb-d" type="date" value="${isoToday()}"></div></div>
      <div class="v-f"><label>Comment ?</label><select class="v-in" id="rb-mo">${MOYENS.map(m=>`<option>${m}</option>`).join('')}</select></div>
      <div class="v-f"><label>Note (facultatif)</label><input class="v-in" id="rb-n" placeholder="Ex. solde du voyage, réf. du virement…"></div>
      <button type="button" class="v-day-edit" onclick="CV.rbPhoto()">📷 Joindre une preuve (capture du virement…)</button><span id="rb-pv" class="v-sum-small"></span>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.rbSave()">✅ Enregistrer</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  function rbPhoto(){ tlPickFile('image/*', async f => { const id = 'rbp' + uid(); try { await storePhoto(f, id); rbProof = id; uploadQueue(); const e = document.getElementById('rb-pv'); if(e) e.textContent = ' ✓ preuve jointe'; } catch(e){ alert('Photo impossible à enregistrer.'); } }); }
  function rbSave(){
    const g = id => document.getElementById(id).value, de = g('rb-de'), a = g('rb-a'), m = num(g('rb-m'));
    if(de === a){ alert('Choisis deux personnes différentes.'); return; } if(!(m > 0)){ alert('Montant invalide.'); return; }
    put({id:'rb'+uid(), type:'remb', trip:M.trip, de, a, montant:m, date:g('rb-d') || isoToday(), moyen:g('rb-mo'), note:g('rb-n').trim(), preuve:rbProof || ''}, '💸 Remboursement noté');
    rbProof = null; closeSheet(true); render();
  }

  function radarTuto(){
    openSheet(`<h2>✦ Le Radar des prix (Escale)</h2>
      <div class="cv-tuto" style="margin-bottom:8px"><video src="escale/radar-tuto.mp4" poster="escale/radar-tuto.jpg" controls playsinline preload="metadata"></video></div>
      <div class="cv-info">
      <p>Le Radar surveille le prix des vols <b>pour toi</b> et te montre les baisses à chaque ouverture d’Escale.</p>
      <h3>1. Choisir son aéroport</h3><p>Dans Escale, étape <b>1 · Départ</b> : touche ton aéroport. Les modèles du Radar s’activent.</p>
      <h3>2. Créer une zone</h3><p>Ouvre <b>✦ Radar</b> et choisis un modèle : week-ends pas chers, vacances d’été, 3 prochains mois, ponts et jours fériés, ou <b>sur mesure</b>.</p>
      <h3>3. Lire les résultats</h3><p>Destination, prix, dates, direct ou escale. Filtre par prix, ☆ pour épingler, ⚡ pour le prix réel, puis liens Skyscanner, Kayak, Booking… déjà remplis.</p>
      <h3>4. Réglages ⚙</h3><p>🎯 seuil cible, 📌 dates prioritaires, ★ destinations surveillées, 🔁 suivi automatique, et chaque zone modifiable (mois, jours, semaines paires/impaires, direct, ponts).</p>
      <h3>5. À chaque ouverture</h3><p>« Ce qui a baissé depuis ta dernière visite » en tête, et un bandeau 🎯 si un vol passe sous ta cible.</p>
      </div>
      <div class="v-actions">${ESCALE ? `<a class="v-btn" href="${ESCALE}">✈️ Ouvrir Escale</a>` : ''}<button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  /* ══════════ ↩️ Reprise : Android recharge parfois l'appli quand on passe sur une autre (Chrome…).
     On garde l'écran en cours (idées, composition, assistant) et on le rouvre au même endroit. ══════════ */
  const RESUME_K = 'cv-resume';
  function inspFormRead(){
    const g = id => (document.getElementById(id)||{}).value;
    return Object.assign({}, M.insp, {dep:g('in-dep'), mois:g('in-mois'), duree:g('in-duree'), nb:g('in-nb'), budget:g('in-budget'), style:g('in-style'), vol:g('in-vol'), climat:g('in-climat'), qui:g('in-qui'), rythme:g('in-rythme'),
      depTxt:(g('in-deptxt')||'').trim(), iata:(g('in-iata')||'').trim().toUpperCase(), cni:!!(document.getElementById('in-cni')||{}).checked, tags:[...document.querySelectorAll('[data-tag].on')].map(b=>b.dataset.tag)});
  }
  function resumeSave(){
    try {
      const bg = document.getElementById('v-sheet-bg'), sh = bg && bg.querySelector('.v-sheet');
      let o = null;
      if(bg && document.getElementById('in-dep')) o = {v:'inspForm', S:inspFormRead()};
      else if(bg && comp && document.getElementById('cp-stops')) o = {v:'comp', c:{i:comp.i, x:comp.x, nights:comp.nights, stops:comp.stops, sel:comp.sel, places:comp.places, near:comp.near, img:comp.img||'', sum:comp.sum||''}};
      else if(bg && M.insp && inspRes.length && document.querySelector('#v-sheet-bg .cv-idea')) o = {v:'insp', n:inspN};
      else if(bg && wz && document.getElementById('wz')){ try { wzRead(); } catch(e){} o = {v:'wz', wz}; }
      if(o){ o.y = sh ? sh.scrollTop : 0; o.t = Date.now(); localStorage.setItem(RESUME_K, JSON.stringify(o)); }
      else localStorage.removeItem(RESUME_K);
    } catch(e){}
  }
  function resumeLoad(){
    let o = null; try { o = JSON.parse(localStorage.getItem(RESUME_K) || 'null'); } catch(e){}
    if(!o || Date.now() - (o.t||0) > 24*3600e3 || document.getElementById('v-sheet-bg')) return;
    try {
      if(o.v === 'inspForm') inspire(o.S);
      else if(o.v === 'insp'){ if(!M.insp) return; inspRes = inspCalc(M.insp); inspN = o.n || 8; inspShow(inspN); }
      else if(o.v === 'comp'){
        if(!M.insp || !o.c || !o.c.x) return; inspRes = inspCalc(M.insp);
        const x = o.c.x; if(!DESTS[x.i] || DESTS[x.i][0] !== x.d[0]){ x.i = DESTS.push(x.d) - 1; }
        if(!inspRes.some(r=>r.i === x.i)) inspRes.unshift(x);
        comp = Object.assign({}, o.c, {i:x.i, x}); compRender();
        const i = comp.i;
        comp.stops.forEach(s=>{ if(!comp.places[s.c] && s.lat != null) compPlaces(s); });
        if(!comp.near) wdNear(x.d[3], x.d[4], (+(M.insp.duree||7)) > 9 ? 280 : 160).then(n=>{ if(comp && comp.i === i){ comp.near = n; compNear(); } }).catch(()=>{ if(comp) comp.near = []; });
      }
      else if(o.v === 'wz' && o.wz){ wz = o.wz; wzRender(); }
      else return;
      setTimeout(()=>{ const sh = document.querySelector('#v-sheet-bg .v-sheet'); if(sh) sh.scrollTop = o.y || 0; }, 350);
      toast('↩️ On reprend là où tu en étais');
    } catch(e){ localStorage.removeItem(RESUME_K); }
  }
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'hidden') resumeSave(); });
  window.addEventListener('pagehide', resumeSave);
  function infoHTML(){
    return `<div class="cv-info">
      <p style="text-align:center;margin:6px 0 10px"><a href="mentions-legales">🔒 Mentions légales</a> · <a href="privacy">Confidentialité</a></p>
      ${installHTML(false)}
      <h3>🔐 Vos données restent à vous</h3>
      <p>Vos voyages, notes, dépenses et photos sont <b>chiffrés sur votre téléphone</b>, avec le code de votre carnet, avant d’être envoyés sur le serveur.</p>
      <p>Le serveur et la personne qui l’héberge ne voient que des données illisibles. <b>Ils ne peuvent rien lire, rien modifier et rien récupérer à votre place.</b> Le code lui-même n’est jamais envoyé.</p>
      <h3>📝 Gardez précieusement votre code</h3>
      <p>Le code de partage (ex. <b class="cv-code">ABCD-EFGH-JKLM</b>) est la <b>seule clé</b> de votre carnet. Notez-le dans un endroit sûr : Notes, gestionnaire de mots de passe, message à vos proches.</p>
      <p class="cv-warn">⚠️ Code perdu = carnet perdu sur le serveur. Personne, pas même l’administrateur, ne peut le retrouver ou le réinitialiser. Pensez aussi à faire un export de temps en temps (Plus → Partage & profils).</p>
      <p>Ne donnez le code qu’aux personnes avec qui vous voyagez : avec lui, on peut lire et modifier tout le carnet.</p>
      ${ESCALE ? `<h3>✈️ Recherche de vols (Escale)</h3>
      <p>Par défaut, Escale fonctionne en <b>mode soft</b> : les prix viennent de l’historique en cache de Travelpayouts. Ce sont des <b>prix indicatifs, pas des tarifs en temps réel</b> : vérifiez toujours le prix final chez la compagnie.</p>
      <p>Le <b>mode premium</b> (tarifs de vols en direct, réservations Booking, location de voiture, attractions) demande un <b>code d’accès</b>. Demandez-le à la personne qui vous a partagé l’appli.</p>` : ''}
    </div>`;
  }
  function infoSheet(first){
    openSheet(`<h2>${first ? 'Avant de commencer' : 'Comment ça marche'}</h2>
      ${first ? `<div class="v-sum-small" style="margin-bottom:10px">Lis ces quelques lignes et accepte les conditions pour accéder à l’appli.</div>` : ''}${infoHTML()}
      <div class="v-actions" style="flex-direction:column;align-items:stretch">${first ? `<div class="v-sum-small cv-cgu-line">En continuant, tu acceptes les mentions légales et la politique de confidentialité (liens en haut), et tu gardes précieusement le code de ton carnet.</div>` : ''}<button type="button" class="v-btn" onclick="CV.infoOk(${first?'true':'false'})">${first ? 'J’accepte et je continue' : 'Fermer'}</button></div>`, !!first);
    if(first){ const bg = document.getElementById('v-sheet-bg'); if(bg) bg.classList.add('cv-first'); }
  }
  function infoOk(first){
    if(first){
      const a = document.getElementById('if-cgu'), c = document.getElementById('if-ok');
      if(a && !a.checked){ alert('Pour utiliser l’appli, accepte les mentions légales et la politique de confidentialité.'); return; }
      if(c && !c.checked){ alert('Coche la case pour confirmer que tu garderas ton code.'); return; }
      M.cguOk = new Date().toISOString();
    }
    M.infoSeen = true; persist(); closeSheet(true);
    if(!M.me || !prof(M.me)){ if(M.sync.on && profiles().length) whoSheet(); else onboarding(); }
  }
  function codeSheet(){
    openSheet(`<h2>📝 Note bien ton code</h2>
      <div class="cv-bigcode">${esc(M.sync.code)}</div>
      <p class="cv-warn">C’est la seule clé de ton carnet : sans lui, personne ne pourra le récupérer, même pas l’administrateur.</p>
      <button class="v-btn" onclick="CV.copyCode()">📋 Copier le code</button>
      <button class="v-btn sec" onclick="CV.codeKeep()">📤 Me l’envoyer pour le garder (notes, e-mail…)</button>
      <div class="v-sum-small" style="margin-top:6px">Ne le donne qu’à toi-même : il ouvre tout ton carnet. Pour inviter des amis, utilise ☁️ Cloud → Partager avec mes amis.</div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close();CV.cloudSheet()">C’est noté</button></div>`);
  }
  async function codeKeep(){
    const MSG = x => (window.I18N && I18N.msg ? I18N.msg(x) : x);
    const text = MSG('Mon code principal Vezoria (à garder pour moi, ne pas partager) :') + '\n' + M.sync.code;
    if(navigator.share){ try { await navigator.share({title:'Vezoria', text}); return; } catch(e){ return; } }
    copyCode();
  }
  async function copyCode(){ try { await navigator.clipboard.writeText(M.sync.code); toast('📋 Code copié'); } catch(e){ (await uiPrompt('Copie ton code :', M.sync.code)); } }

  /* ══════════ 📲 Installation sur l'écran d'accueil + hors ligne ══════════ */
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
  const isInstalled = () => window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints > 1);
  function installHTML(short){
    if(isInstalled()) return `<div class="cv-inst ok">✅ <b>Appli installée.</b> Tes données restent sur ce téléphone, et l’appli marche même sans réseau.</div>`;
    const ios = isIOS(), and = /Android/i.test(navigator.userAgent), desk = !ios && !and;   // seulement les consignes du téléphone utilisé
    return `<div class="cv-inst">
      <b>📲 Installe d’abord l’appli sur ton écran d’accueil</b>
      <p>Ouverte dans le navigateur, l’appli peut voir ses données effacées si tu ne l’utilises pas pendant quelques jours (Safari le fait après 7 jours). Installée, elle garde tout dans ton téléphone, s’ouvre en plein écran et marche hors ligne.</p>
      ${ios || desk ? `<div class="cv-inst-os${ios?' on':''}"><b>iPhone</b> : dans <b>Safari</b>, touche <b>Partager</b> (carré avec flèche ⬆️) → <b>« Sur l’écran d’accueil »</b> → <b>Ajouter</b>.</div>` : ''}
      ${!ios ? `<div class="cv-inst-os${and?' on':''}"><b>Android</b> : dans <b>Chrome</b>, menu <b>⋮</b> → <b>« Installer l’application »</b> (ou « Ajouter à l’écran d’accueil »). L’appli s’appelle <b>Vezoria</b> : si elle n’est pas sur l’écran d’accueil, glisse vers le haut pour la trouver dans tes applis.<small class="cv-inst-tip">⚠️ Icône introuvable (Honor, Huawei, Xiaomi…) ? Autorise Chrome à créer des raccourcis : <b>Paramètres → Applications → Chrome → Autorisations → « Créer des raccourcis sur l’écran d’accueil »</b>, puis réinstalle. Sur Honor, glisse vers le bas au milieu de l’écran et tape « Vezoria » pour la chercher.</small></div>` : ''}
      ${installEvt ? `<button type="button" class="v-btn" onclick="CV.installNow()">📲 Installer maintenant</button>` : ''}
      ${short ? '' : `<p class="cv-warn">Ensuite, ouvre toujours l’appli depuis son icône. Le navigateur et l’appli installée ne partagent pas leurs données : crée ou rejoins ton carnet depuis l’icône.</p>`}
    </div>`;
  }
  async function installNow(){ if(!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch(e){} installEvt = null; render(); }
  function installSheet(){ openSheet(`<h2>📲 Installer l’appli</h2>${installHTML(false)}<div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`); }
  function bootOffline(){
    if(!window.VZ_HOST && 'serviceWorker' in navigator && /^https?:/.test(location.protocol)){
      const had = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.register('sw.js').then(reg => { try { reg.update(); document.addEventListener('visibilitychange', () => { if(!document.hidden) reg.update().catch(()=>{}); }); } catch(e){} }).catch(()=>{});
      // une nouvelle version vient de prendre la main : juste à l’ouverture, on recharge sans rien dire ;
      // ensuite, on le propose (« Nouvelle version · toucher pour recharger ») pour ne jamais couper ce qu’on fait
      const t0 = Date.now();
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if(!had) return;
        let rl = ''; try { rl = sessionStorage.getItem('cv-rl') || ''; } catch(e){}
        if(Date.now() - t0 < 4000 && !document.getElementById('v-sheet-bg') && !rl){ try { sessionStorage.setItem('cv-rl', '1'); } catch(e){} location.reload(); return; }
        if(document.getElementById('vz-upd')) return;
        const b = document.createElement('button'); b.type = 'button'; b.id = 'vz-upd'; b.className = 'vz-upd';
        b.innerHTML = '✨ <span>' + esc(MSGT('Nouvelle version · toucher pour recharger')) + '</span>';
        b.onclick = () => { try { persist(); } catch(e){} location.reload(); };
        document.body.appendChild(b);
      });
    }
    try { if(navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch(e){}
  }

  /* ══════════ 🔒 Mode lecture / modification (propre à ce téléphone) ══════════ */
  function applyLock(){
    document.body.classList.toggle('locked', !!M.lock);
    document.body.classList.toggle('vz-glass', M.glass !== false);
    document.documentElement.classList.toggle('vz-big', !!M.bigText);   // 🔠 « Texte plus grand » : tout ce qui est en rem grandit de 12,5 %
    const b = document.getElementById('cv-lock');
    if(b){ b.textContent = M.lock ? '🔒' : '✏️'; b.setAttribute('aria-label', M.lock ? 'Mode lecture : toucher pour modifier' : 'Mode modification : toucher pour verrouiller'); b.classList.toggle('on', !!M.lock); }
  }
  function bigToggle(){ M.bigText = !M.bigText; persist(); applyLock(); toast(M.bigText ? '🔠 ' + MSGT('Texte plus grand') : MSGT('Texte normal')); try { render(); } catch(e){ refresh(); } }
  function glassToggle(){ M.glass = M.glass === false; persist(); applyLock(); toast(M.glass ? '✨ ' + MSGT('Effet verre activé') : MSGT('Effet verre désactivé')); try { render(); } catch(e){ refresh(); } }
  function toggleLock(){
    M.lock = !M.lock; persist(); applyLock();
    toast(M.lock ? '🔒 Mode lecture : rien ne peut être modifié' : '✏️ Mode modification');
    if(M.trip !== LEGACY) render();
  }
  /* ══════════════════════════════════════════════════════════════════════════
     ⚙️ RÉGLAGES (onglets et encarts masquables) · 📅 JOURS ± ET DATES · 🔗 PARTAGE DU VOYAGE
     🔎 LIEUX AJOUTÉS DANS « QUE VOIR » · ✉️ IMPORT DU MAIL · ⚖️ DOUBLONS (CONSERVER / REMPLACER)
     ══════════════════════════════════════════════════════════════════════════ */
  function addD(iso, n){ const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10); }
  function dDiff(a, b){ return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5); }

  /* ---------- ⚙️ Réglages : chacun garde seulement ce qui lui sert (propre à ce téléphone) ---------- */
  function UI(){ M.ui = M.ui || {}; M.ui.hide = M.ui.hide || {}; return M.ui; }
  function hidden(k){ return !!UI().hide[k]; }
  var ALWAYS = {reglages:1, prefs:1};
  function visTabs(g){ return g.tabs.filter(t=>ALWAYS[t[0]] || !hidden('tab:' + t[0])); }
  function visGroups(cur){ return GROUPS.filter(g=>visTabs(g).length || (cur && g.id===cur.id)); }
  var PREF_BLOCKS = [
    ['blk:days', '📅 Barre « dates du voyage · Partager » (Jour par jour)'],
    ['blk:quick', '⚡ Raccourcis « Je suis ici · Importer · Carte »'],
    ['blk:disc', '🔎 Encart « Que voir pendant le voyage ? »'],
    ['blk:pins', '📌 Notes épinglées en haut du programme'],
    ['blk:docs', '🛂 Alerte « documents de voyage à vérifier »'],
    ['blk:who', '👥 Filtre « Voir pour » (une seule personne)'],
    ['blk:imp', '📄 Bouton « Importer une résa » dans Trajets, Hôtels, Visites'],
    ['blk:hints', '💡 Conseils sur les fiches à réserver'],
    ['blk:book', '🛒 Liens « Réserver avec… » (sites de réservation)'],
  ];
  var PRESET_SIMPLE = ['tab:outils','tab:ech','tab:divers','tab:notes','tab:envies','mode:past','blk:docs','blk:who','blk:hints','blk:escale','blk:pins'];
  function renderPrefs(){
    const tg = (k, l, lock) => `<label class="cv-checkline cv-pref${lock?' lock':''}"><input type="checkbox" ${hidden(k)?'':'checked'} ${lock?'disabled':''} onchange="CV.prefTog('${k}', this.checked)"> <span>${l}</span></label>`;
    const nh = Object.keys(UI().hide).length;
    let h = `<div class="v-sum"><div class="v-sum-row"><div class="v-sum-big">⚙️ Réglages</div><div class="v-sum-small">${nh ? nh + ' élément' + (nh>1?'s':'') + ' masqué' + (nh>1?'s':'') : 'tout est affiché'}</div></div>
        <div class="v-sum-small">Garde seulement ce qui te sert : décoche un onglet ou un encart pour le masquer. Rien n’est effacé, et ce réglage ne concerne que ce téléphone (tes compagnons choisissent les leurs).</div>
        <div class="cv-row" style="gap:6px;margin-top:10px"><button type="button" class="v-day-edit" onclick="CV.prefPreset('simple')">🌱 Version simple</button><button type="button" class="v-day-edit" onclick="CV.prefPreset('all')">✨ Tout afficher</button></div></div>`;
    // ce qui était dans « Plus » et relève des réglages : un accès direct en haut
    h += `<div class="cv-tiles cv-prefgo">${[['reglages','👥','Partage & profils'], ['omap','📴','Cartes hors ligne'], ['livret','📖','Livret']].map(([k, ic, l])=>`<button type="button" class="cv-tile" onclick="CV.plusGo('${k}')"><i>${ic}</i><span>${l}</span></button>`).join('')}${coffeeOn() ? `<button type="button" class="cv-tile" onclick="CV.coffeeGo()"><i>☕</i><span>Offrir un café</span></button>` : ''}</div>`;
    if(window.I18N) h += `<div class="v-box"><h3>🌐 Langue</h3><select class="v-in" aria-label="Langue" onchange="CV.setLang(this.value, this)">${Object.entries(I18N.langs).map(([k,l])=>`<option value="${k}"${k===I18N.lang?' selected':''}>${l}</option>`).join('')}</select><div class="v-sum-small" style="margin-top:6px">Tes fiches restent dans la langue où tu les as écrites.</div></div>`;
    h += `<div class="v-box"><h3>💱 Devise</h3><select class="v-in" aria-label="Devise" onchange="CV.setCur(this.value)">${Object.keys(CURS).map(c=>`<option value="${c}"${c===(M.cur||'EUR')?' selected':''}>${c} · ${CURS[c]}</option>`).join('')}</select><div class="v-sum-small" style="margin-top:6px">Devise proposée pour les nouveaux voyages. Un voyage déjà créé garde la sienne : change-la en modifiant le voyage.</div></div>`;
    h += pushBox();
    h += `<div class="v-box"><h3>📱 Place sur ce téléphone</h3><div class="v-sum-small">Protège tes photos contre le ménage automatique du téléphone, et libère de la place sans rien perdre.</div><button type="button" class="v-day-edit" style="margin-top:8px" onclick="CV.spaceSheet()">📱 Voir la place utilisée</button></div>`;
    { const pn = pins();
      h += `<div class="v-box"><h3>📌 Mes raccourcis</h3><div class="v-sum-small" style="margin-bottom:8px">Épingle un écran pour qu’il apparaisse en haut de l’écran principal. Sans rien d’épinglé, cette barre n’apparaît pas. La barre du bas reste la même.</div>
        ${DEST.filter(d=>!['prog','resas','sous'].includes(d[0])).map(([k,ic,l])=>{ const bark = k === 'live', st = destHidden(k) ? 'hide' : bark ? 'bar' : pn.includes(k) ? 'pin' : 'plus', canHide = !!DEST_HIDE(k);
          return `<div class="cv-pinrow"><span>${ic} ${l}</span><select class="v-in" aria-label="${l}" onchange="CV.destSet('${k}', this.value)">${bark ? `<option value="bar"${st==='bar'?' selected':''}>📍 Dans la barre du bas</option>` : `<option value="pin"${st==='pin'?' selected':''}>📌 Épinglé en haut</option><option value="plus"${st==='plus'?' selected':''}>☰ Dans « Plus »</option>`}${canHide ? `<option value="hide"${st==='hide'?' selected':''}>🙈 Masqué</option>` : ''}</select></div>`; }).join('')}</div>`; }
    h += `<div class="v-box"><h3>🗂️ Onglets</h3>${GROUPS.map(g=>{ const tl = g.tabs.filter(([id])=>!DEST.some(d=>d[0]===id) && id!=='prog' && id!=='prefs' && id!=='reglages'); return tl.length ? `<div class="cv-prefg"><b>${g.icon} ${g.lbl}</b>${tl.map(([id,l])=>tg('tab:' + id, l, ALWAYS[id])).join('')}</div>` : ''; }).join('')}
        <div class="v-sum-small">Ce sont les petits filtres sous l’en-tête de Résas et de Budget.</div></div>`;
    h += `<div class="v-box"><h3>🧩 Encarts et boutons</h3>${PREF_BLOCKS.map(([k,l])=>tg(k, l)).join('')}</div>`;
    h += appPrefsHTML();   // apparence, tutos, mise à jour, sauvegarde… (avant dans « Partage & profils »)
    document.getElementById('cv-body').innerHTML = h;
    foldBoxes(document.getElementById('cv-body'), 'prefs');
  }
  // 🧹 chaque encart « titre + contenu » devient une rubrique repliable (une ouverte à la fois, la dernière est retenue)
  function foldBoxes(root, key){
    if(!root) return; const op = (M.foldOpen || {})[key];
    [...root.children].filter(b=>b.classList && b.classList.contains('v-box') && b.firstElementChild && /^H[23]$/.test(b.firstElementChild.tagName)).forEach((b, i)=>{
      const h = b.firstElementChild, t = h.textContent.trim(), d = document.createElement('details'); d.className = 'cv-fold cv-pfold';
      const sm = document.createElement('summary'); sm.innerHTML = h.innerHTML; d.appendChild(sm); h.remove();
      const inner = document.createElement('div'); inner.className = 'fold-in'; while(b.firstChild) inner.appendChild(b.firstChild); d.appendChild(inner);
      if(op === t) d.open = true;
      d.addEventListener('toggle', ()=>{ if(!d.open) return; (M.foldOpen = M.foldOpen || {})[key] = t; persist(); root.querySelectorAll('details.cv-pfold').forEach(x=>{ if(x !== d) x.open = false; }); });
      b.replaceWith(d); });
  }
  function prefFix(){
    if(M.mode && M.mode !== 'prep' && hidden('mode:' + M.mode)) M.mode = 'prep';
    if(hidden('blk:who')) M.who = 'all';
  }
  function prefTog(k, on){
    const u = UI(); if(on) delete u.hide[k]; else u.hide[k] = 1;
    prefFix(); persist(); modeBar(); buildTabs(); toast(on ? '👁️ Affiché' : '🙈 Masqué');
    const s = document.querySelector('.cv-pref input[onchange*="' + k + '"]'); if(s) s.checked = on;
    const n = document.querySelector('#cv-body .v-sum-row .v-sum-small'), nh = Object.keys(u.hide).length; if(n) n.textContent = nh ? nh + ' élément' + (nh>1?'s':'') + ' masqué' + (nh>1?'s':'') : 'tout est affiché';
  }
  function setLang(l, el){
    if(el) el.disabled = true; try { persist(); } catch(e){}
    toast('⏳ …');
    setTimeout(()=>I18N.set(l), 80);
  }
  function destSet(k, v){
    const u = UI(); let pn = pins().filter(x=>x!==k); const h = DEST_HIDE(k);
    if(v === 'hide' && h) u.hide[h] = 1; else if(h) delete u.hide[h];
    if(v === 'pin') pn.push(k);
    u.pin = pn; prefFix(); persist(); buildNav(); renderPrefs();
    toast(v === 'pin' ? '📌 Épinglé en haut de l’écran principal' : v === 'hide' ? '🙈 Masqué' : v === 'bar' ? '📍 Dans la barre du bas' : '☰ Rangé dans « Plus »');
  }
  function prefPreset(p){
    UI().hide = {}; UI().pin = []; if(p === 'simple') PRESET_SIMPLE.forEach(k=>UI().hide[k] = 1);
    prefFix(); persist(); applyMode(); toast(p === 'simple' ? '🌱 Version simple' : '✨ Tout est affiché');
  }

  /* ---------- 📅 Jour par jour : dates du voyage, ajouter / retirer des jours ---------- */
  function daysBar(){
    const t = trip(); if(!t || hidden('blk:days')) return '';
    const n = dayList().length;
    return `<div class="cv-daysbar"><button type="button" class="cv-db-dates" onclick="CV.datesSheet()"><i>📅</i><span><b>${t.debut ? esc(tripDatesLong(t)) : 'Dates à fixer'}</b><small>${n ? n + ' jour' + (n>1?'s':'') + ' · ' : ''}modifier les dates</small></span></button>
      <button type="button" class="cv-db-share" onclick="CV.shareHub()">👥 Partager</button></div>`;
  }
  function datesSheet(){
    const t = trip(); if(!t) return;
    openSheet(`<h2>📅 Dates du voyage</h2><div class="v-sum-small" style="margin-bottom:10px">Change le début ou la fin. Si tu décales le début, tout le programme peut suivre (fiches, journées, lieux) : le J1 reste le J1.</div>
      <form id="v-form" onsubmit="event.preventDefault();CV.datesSave()">
        <div class="v-f2">${field('Début','debut',t.debut,'date')}${field('Fin','fin',t.fin,'date')}</div>
        ${t.debut ? `<label class="cv-checkline"><input type="checkbox" id="dt-shift" checked> Décaler tout le programme avec la date de début</label>` : ''}
        <div class="v-sum-small" style="margin:6px 0 4px">Ajouter ou retirer un jour précis : bouton <b>⋯</b> de la journée dans « Jour par jour ».</div>
        ${actions('')}
      </form>`);
  }
  function datesSave(){
    const t = clone(trip()); if(!t) return;
    const f = document.getElementById('v-form'), deb = f.debut.value, sh = document.getElementById('dt-shift');
    let fin = f.fin.value;
    const delta = (sh && sh.checked && t.debut && deb && deb !== t.debut) ? dDiff(t.debut, deb) : 0;
    if(delta && t.fin && fin === t.fin) fin = addD(t.fin, delta);   // fin inchangée : la durée est gardée
    if(deb && fin && fin < deb){ alert('La fin doit être après le début.'); return; }
    if(deb && fin && dDiff(deb, fin) > 89){ alert('90 jours maximum par voyage.'); return; }
    const out = [];
    if(delta) shiftAfter('0000-00-00', delta, out);
    t.debut = deb; t.fin = fin || deb;
    out.push(t);
    putMany(out, delta ? '📅 Programme décalé de ' + (delta > 0 ? '+' : '') + delta + ' j' : '📅 Dates enregistrées');
    closeSheet(true); refresh();
    const outside = t.debut ? items(i=>i.date && (i.date < t.debut || (t.fin && i.date > t.fin))) : [];
    if(outside.length) setTimeout(()=>alert(`📅 ${outside.length} fiche(s) restent en dehors des nouvelles dates (${outside.slice(0,3).map(i=>i.titre).join(', ')}${outside.length>3?'…':''}) : leurs journées restent affichées. Change leur date ou retire-les.`), 250);
  }
  // Décale de « delta » jours tout ce qui est daté APRÈS « pivot » dans le voyage (fiches, journées, lieux, notes du jour)
  function shiftAfter(pivot, delta, out){
    const sh = x => (x && x > pivot) ? addD(x, delta) : x;
    const recs = Object.values(R).filter(r=>!r.deleted && r.trip===M.trip);
    recs.forEach(r=>{
      if(r.type==='item'){
        if(r.cat==='divers' && r.recu) return;   // dépense réelle avec ticket : sa date est la vraie
        const nd = sh(r.date), nf = sh(r.dateFin);
        if(nd !== r.date || nf !== r.dateFin){ const c = clone(r); c.date = nd; if(r.dateFin) c.dateFin = nf; out.push(c); }
      } else if(r.type==='place' || r.type==='city'){
        const nd = sh(r.date), nf = sh(r.dateFin);
        if(nd !== r.date || nf !== r.dateFin){ const c = clone(r); c.date = nd; if(r.dateFin) c.dateFin = nf; out.push(c); }
      } else if(r.type==='note' && r.ref && r.ref.startsWith('day:')){
        const d = r.ref.slice(4); if(d > pivot){ const c = clone(r); c.ref = 'day:' + addD(d, delta); out.push(c); }
      }
    });
    // Les journées (titre, programme) ont la date dans leur identifiant : on les recrée à la bonne date
    const days = recs.filter(r=>r.type==='day' && r.date > pivot);
    const targets = days.map(r=>{ const c = clone(r); delete c.deleted; c.date = addD(r.date, delta); c.id = dayId(c.date); return c; });
    const tIds = new Set(targets.map(x=>x.id));
    days.forEach(r=>{ if(!tIds.has(r.id)){ const c = clone(r); c.deleted = true; out.push(c); } });
    out.push(...targets);
    return out;
  }
  function tripBounds(t){
    if(t.debut) return t;
    const ds = dayList(); if(ds.length){ t.debut = ds[0]; t.fin = ds[ds.length-1]; }
    return t;
  }
  function dayMenu(d){
    const ds = dayList(), k = ds.indexOf(d);
    const t = trip(), ed = !!(t && !t.archived && !M.lock);
    openSheet(`<h2>📅 ${PJ(k+1)} · ${fdate(d)}</h2>
      <button type="button" class="v-btn sec" onclick="CV.close();CV.planDay('${d}')">🗺️ Itinéraire de la journée</button>
      <button type="button" class="v-btn sec" onclick="CV.editDay('${d}')">✏️ Titre et programme du jour</button>
      <button type="button" class="v-btn sec" onclick="CV.close();CV.editNote(null,'day:${d}')">📌 Note épinglée</button>
      ${ed ? `<div class="v-sum-small" style="margin:12px 0 8px">Ajouter ou retirer un jour : les journées suivantes se décalent avec leurs fiches, leur programme et leurs lieux.</div>
      <button type="button" class="v-btn sec" onclick="CV.dayIns('${d}',0)">＋ Insérer un jour avant</button>
      <button type="button" class="v-btn sec" onclick="CV.dayIns('${d}',1)">＋ Insérer un jour après</button>
      <button type="button" class="v-btn sec" onclick="CV.datesSheet()">📅 Changer les dates du voyage</button>
      <button type="button" class="v-btn danger" onclick="CV.dayDelAsk('${d}')">🗑 Retirer ce jour</button>` : ''}
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  function dayIns(d, after){
    const t = tripBounds(clone(trip())); if(!t) return;
    if(!t.debut){ alert('Fixe d’abord les dates du voyage.'); return; }
    if(dDiff(t.debut, t.fin || t.debut) >= 89){ alert('90 jours maximum par voyage.'); return; }
    const out = [];
    if(!after && d <= t.debut){ t.debut = addD(t.debut, -1); }
    else if(after && t.fin && d >= t.fin){ t.fin = addD(t.fin, 1); }
    else { shiftAfter(after ? d : addD(d, -1), 1, out); t.fin = addD(t.fin || t.debut, 1); }
    out.push(t); putMany(out, '＋ Jour ajouté'); closeSheet(true); refresh();
    const nd = after ? addD(d, 1) : (d <= trip().debut ? trip().debut : d);
    setTimeout(()=>{ const e = document.getElementById('d-' + nd); if(e){ e.scrollIntoView({block:'center', behavior:'smooth'}); e.classList.add('cv-flash'); } }, 80);
  }
  function dayAdd(where){
    const t = trip(); if(!t) return;
    if(!t.debut){ datesSheet(); return; }
    dayIns(where === 'before' ? t.debut : (t.fin || t.debut), where === 'before' ? 0 : 1);
  }
  function dayContent(d){
    const N = addD(d, 1);
    const its = items(i=>i.date===d && (i.cat!=='hotel' || !i.dateFin || i.dateFin <= N));
    const pl = list('place', p=>p.trip===M.trip && p.date===d && !p.sugg);
    const info = R[dayId(d)] && !R[dayId(d)].deleted && (R[dayId(d)].titre || R[dayId(d)].plan) ? R[dayId(d)] : null;
    return {its, pl, info};
  }
  async function dayDelAsk(d){
    const t = tripBounds(clone(trip())); if(!t) return;
    if(t.debut && t.fin && t.debut === t.fin){ alert('C’est le seul jour du voyage : change plutôt les dates.'); return; }
    const c = dayContent(d), n = c.its.length + c.pl.length + (c.info ? 1 : 0);
    if(!n){ if((await uiConfirm('Retirer le ' + fdate(d) + ' du voyage ?'))) dayDel(d, 'drop'); return; }
    const first = t.debut && d <= t.debut;
    openSheet(`<h2>🗑 Retirer le ${fdate(d)}</h2><div class="v-sum-small" style="margin-bottom:8px">Ce jour contient :</div>
      <div class="cv-dup">${c.its.map(i=>`<div class="od">${icon(i)} <b>${esc(i.titre)}</b> <small>${STATUTS[i.statut]||''}</small></div>`).join('')}${c.pl.length ? `<div class="od">📍 ${c.pl.length} lieu(x) à visiter</div>` : ''}${c.info ? `<div class="od">✏️ Programme : ${esc(c.info.titre || c.info.plan.slice(0,60))}</div>` : ''}</div>
      <button type="button" class="v-btn" onclick="CV.dayDel('${d}','keep')">↪️ Retirer le jour, garder tout (déplacé au ${first ? 'lendemain' : 'jour d’avant'})</button>
      <button type="button" class="v-btn danger" onclick="CV.dayDel('${d}','drop')">🗑 Retirer le jour et ce qu’il contient</button>
      <div class="v-sum-small" style="margin-top:6px">Les notes du jour sont toujours gardées (déplacées). Les lieux ne sont jamais supprimés : ils repassent « à placer ».</div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Annuler</button></div>`);
  }
  function dayDel(d, mode){
    const t = tripBounds(clone(trip())); if(!t) return;
    const out = [], P = addD(d, -1), N = addD(d, 1);
    const first = !!t.debut && d <= t.debut, last = !first && !!t.fin && d >= t.fin;
    const nb = first ? N : P, c = dayContent(d);
    // 1) ce que contenait le jour
    c.its.forEach(i=>{ const x = clone(i);
      if(mode === 'drop') x.deleted = true;
      else { x.date = nb; if(x.cat==='hotel' && x.dateFin) x.dateFin = addD(nb, 1); }
      out.push(x); });
    c.pl.forEach(p=>{ const x = clone(p); x.date = mode === 'drop' ? '' : nb; if(mode === 'drop') x.lock = false; out.push(x); });
    list('note', n=>n.trip===M.trip && n.ref==='day:' + d).forEach(n=>{ const x = clone(n); x.ref = 'day:' + nb; out.push(x); });
    const dr = R[dayId(d)];
    if(dr && !dr.deleted){
      if(mode === 'keep' && (dr.titre || dr.plan)){ const nr = clone(R[dayId(nb)] && !R[dayId(nb)].deleted ? R[dayId(nb)] : {id:dayId(nb), type:'day', trip:M.trip, date:nb, titre:'', plan:''});
        nr.titre = nr.titre || dr.titre; nr.plan = [nr.plan, dr.plan].filter(Boolean).join('\n'); delete nr.deleted; out.push(nr); }
      const x = clone(dr); x.deleted = true; out.push(x);
    }
    // 2) les hôtels qui couvraient ce jour perdent une nuit
    const skip = new Set(c.its.map(i=>i.id));
    items(i=>i.cat==='hotel' && i.date && !skip.has(i.id)).forEach(h=>{
      const f = h.dateFin || addD(h.date, 1);
      if(first && h.date === d && f > N){ const x = clone(h); x.date = N; out.push(x); }
      else if(last && f > d && h.date < d){ const x = clone(h); x.dateFin = d; out.push(x); }
    });
    // 3) on resserre
    if(first) t.debut = N;
    else if(last) t.fin = P;
    else {
      // les fiches / lieux / notes déjà modifiés ci-dessus ne doivent pas être décalés une 2e fois
      const tmp = []; shiftAfter(d, -1, tmp);
      const done = new Map(out.map(x=>[x.id, x]));
      tmp.forEach(x=>{ if(x.type==='day'){ out.push(x); return; } if(!done.has(x.id)) out.push(x); });
      t.fin = addD(t.fin || t.debut, -1);
    }
    out.push(t);
    putMany(out, '🗑 Jour retiré'); closeSheet(true); refresh();
  }

  /* ---------- 🔗 Partager le voyage (compagnon, amis) ---------- */
  // 🗂️ Partager en 3 onglets : Compagnons · Abonnés · Je suis (le dernier choisi revient la fois suivante)
  function shTabNow(){
    if(['comp', 'ab', 'suis'].includes(M.shTab)) return M.shTab;
    const fol = list('feedtrip', f=>TS()[f.id] && !FT()[String(f.id).replace(/^ft:/,'')] && !f.deleted).length;
    return !myTrips().length && fol ? 'suis' : 'comp';
  }
  function shTabsBar(){
    const ev = socEvents(), nAb = ev.filter(e=>e.k !== 'post').length, nSuis = ev.filter(e=>e.k === 'post').length, on = shTabNow();
    const b = (k, ic, lb, n) => `<button type="button" role="tab" class="sh-tab${on === k ? ' on' : ''}" data-k="${k}" aria-selected="${on === k}" onclick="CV.shTab('${k}')">${ic} <span>${lb}</span>${n ? `<b class="cv-badge">${n > 99 ? '99+' : n}</b>` : ''}</button>`;
    return `<div class="sh-tabs" role="tablist">${b('comp', '👥', 'Compagnons', 0)}${b('ab', '👀', 'Abonnés', nAb)}${b('suis', '➡️', 'Je suis', nSuis)}</div>`;
  }
  function shTab(k){
    M.shTab = k; persist(); const hub = document.querySelector('.sh-hub'); if(!hub) return;
    // sans flash : la fenêtre garde sa hauteur (elle ne se replie pas puis se redéplie) et les onglets restent à leur place à l'écran
    const sh = document.querySelector('#v-sheet-bg .v-sheet'), bar = hub.querySelector('.sh-tabs'), y0 = bar ? bar.getBoundingClientRect().top : 0;
    if(sh) sh.style.minHeight = Math.max(parseFloat(sh.style.minHeight) || 0, sh.offsetHeight) + 'px';
    hub.dataset.on = k; hub.querySelectorAll('.sh-tab').forEach(x=>{ const o = x.dataset.k === k; x.classList.toggle('on', o); x.setAttribute('aria-selected', o); });
    if(sh && bar){ const dy = bar.getBoundingClientRect().top - y0; if(dy) sh.scrollTop += dy; }
  }
  function shareHub(){
    const t0 = trip(), t = t0 && !t0.demo ? t0 : null;
    let h = `<h2>👥 Partager</h2>` + (t0 && !t0.demo && !hidden('blk:prep') ? socFil(t0) : '') + shTabsBar() + `<div class="sh-tb" data-t="suis">` + followHTML() + `</div>`; setTimeout(()=>{ folPaint(); hydrate(); }, 60);
    if(t){
      const code = TS()[t.id], on = code && spaceObj(code), sp = on ? spaceObj(code) : null, v = (t.voyageurs||[]).filter(prof), fc = feedCode(t.id);
      const grpT = fc ? Object.keys(FT()).filter(x=>FT()[x] === fc && R[x] && !R[x].deleted) : [], gIds = new Set(grpT.map(ftId));   // carnet publié d’un coup : les abonnés voient tous ces voyages
      const nfw = fc ? new Set(list('follower', x=>gIds.has(x.trip) && !isBlk(x)).map(fwKey)).size : 0, nlk = fc ? list('like', l=>l.trip===ftId(t.id) && l.on && !isBlk(l)).length : 0, ncm = fc ? list('comment', c=>c.trip===ftId(t.id) && !isBlk(c)).length : 0;
      h += `<div class="sh-sec sh-tb" data-t="comp" data-notr>🧳 ${esc(t.titre)}</div>
      <div class="sh-card sh-tb" data-t="comp"><div class="sh-k">👥 Voyager ensemble</div><p>Tes compagnons voient tout le voyage et le complètent avec toi : programme, résas, budget, souvenirs. Chaque ajout est signé.</p>
        <div class="cv-row" style="gap:6px;flex-wrap:wrap;margin:6px 0 10px">${v.map(pid=>pchip(pid)).join('') || '<span class="v-sum-small">Personne d’autre pour l’instant</span>'}</div>
        <button type="button" class="v-btn" onclick="CV.tripInviteNow('${t.id}')">📤 Inviter quelqu’un dans ce voyage</button>
        <div class="v-sum-small" style="margin-top:6px">${on ? `☁️ En ligne et chiffré · ${sp.err ? '⚠️ ' + esc(sp.err) : (sp.dirty||[]).length ? '⏳ envoi en cours' : '✓ à jour'}` : 'Un seul geste : le voyage est mis en ligne (chiffré) et tu envoies le lien par message. Tes autres voyages restent privés.'}</div>
        <div class="sh-links">${on ? `<button type="button" onclick="CV.tripShareSheet('${t.id}')">🔑 Code du voyage et état du partage</button>` : `<button type="button" onclick="CV.tripShare('${t.id}')">🔑 Réutiliser un ancien code de voyage</button>`}<button type="button" onclick="CV.editTrip('${t.id}')">👥 Choisir les voyageurs</button></div></div>
      <div class="sh-card sh-tb" data-t="none" hidden><div class="sh-k">👀 Abonnés</div><p>Ta famille et tes amis suivent le voyage comme un carnet de bord : uniquement les photos, les lieux et les récits. Ils mettent des ❤️ et des commentaires. Le reste reste privé.</p>
        ${fc ? `${grpT.length > 1 ? `<div class="v-sum-small" style="margin-bottom:6px">📚 Publié avec tout ton carnet : ${grpT.length} voyages, un seul lien.</div>` : ''}<div class="sh-st"><span>👀 <b>${nfw}</b> abonné${nfw>1?'s':''}</span><span>❤️ <b>${nlk}</b></span><span>💬 <b>${ncm}</b></span></div>
          <button type="button" class="v-btn" onclick="CV.feedPublish('${t.id}')">📤 Inviter des abonnés</button>
          <div class="sh-links"><button type="button" onclick="CV.feedView('${ftId(t.id)}')">👀 Voir comme un abonné</button><button type="button" onclick="CV.feedStop('${t.id}')">Arrêter la publication</button></div>`
        : `<button type="button" class="v-btn" onclick="CV.feedPublish('${t.id}')">👀 Publier pour des abonnés</button>`}</div>`;
    } else if(t0 && t0.demo) h += `<div class="v-sum-small" style="margin-bottom:10px">C’est le voyage de démo : crée ton propre voyage (Mes voyages → ＋) pour le partager.</div>`;
    h += `<div class="sh-sec sh-tb" data-t="comp">📚 Tout mon carnet</div><div class="sh-card sh-tb" data-t="comp"><p>Partager tous tes voyages d’un coup : avec un compagnon (il complète tout), ou avec des abonnés en lecture seule (photos et récits).</p>
      <button type="button" class="v-btn sec" onclick="CV.carnetShareSheet()">📚 Partager tout mon carnet</button></div>
      <div class="sh-sec sh-tb" data-t="comp">🔗 On t’a invité ?</div><div class="sh-card sh-tb" data-t="comp"><p>Un code ou un lien reçu par message : colle-le ici pour rejoindre un voyage, un carnet, ou suivre un voyage.</p>
      <button type="button" class="v-btn sec" onclick="CV.joinAny()">🔗 Rejoindre avec un code</button></div>`;
    h += socialHTML(t ? t.id : '');
    h += `<div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`;
    openSheet(`<div class="sh-hub" data-on="${shTabNow()}">` + h + `</div>`); { const sh = document.querySelector('#v-sheet-bg .v-sheet'); if(sh) sh.scrollTop = 0; }
    M.socSeen = Date.now(); persist(); setTimeout(socPill, 50);
  }

  /* ---------- 🔎 « Que voir » : lieux ajoutés à la main (ville sans hôtel, excursion…) ---------- */
  var voirCities = () => list('city', c=>c.trip===M.trip).sort((a,b)=>(a.date||'9').localeCompare(b.date||'9') || (a.createdAt||0)-(b.createdAt||0));
  function voirAdd(){
    const ds = trip() ? dayList() : [], cs = voirCities();
    openSheet(`<h2>📍 Ajouter un lieu à voir</h2><div class="v-sum-small" style="margin-bottom:10px">Une ville sans hôtel, une excursion, un quartier, un parc… L’appli cherche ce qu’il y a à voir autour, comme pour les étapes.</div>
      <form id="v-form" onsubmit="event.preventDefault();CV.voirSave()">
        ${field('Ville ou lieu','titre','','text','required placeholder="Ex. Annecy, Montmartre, Chamonix, Lac de Côme"')}
        ${ds.length ? `<div class="v-f"><label>Pour quel jour ? (facultatif)</label><select class="v-in" name="date"><option value="">Pas de jour précis</option>${ds.map((d,k)=>`<option value="${d}">${PJ(k+1)} · ${fdate(d)}</option>`).join('')}</select></div>` : ''}
        <div class="v-actions"><button type="submit" class="v-btn">🧭 Ajouter et explorer</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>
      </form>
      ${cs.length ? `<div class="v-f" style="margin-top:12px"><label>Lieux déjà ajoutés</label>${cs.map(c=>`<div class="cv-place"><span class="x">📍 ${esc(c.titre)}${c.date ? ' <small>· ' + fdate(c.date) + '</small>' : ''}</span><button type="button" class="cv-x" onclick="CV.discover('${c.id}')" aria-label="Chercher">🔎</button><button type="button" class="cv-x" onclick="CV.voirDel('${c.id}')" aria-label="Retirer">✕</button></div>`).join('')}</div>` : ''}`);
    setTimeout(()=>{ const i = document.querySelector('#v-form [name=titre]'); if(i) i.focus(); }, 60);
  }
  function voirSave(){
    const f = document.getElementById('v-form'), titre = (f.titre.value || '').trim(); if(!titre) return;
    const d = f.date ? f.date.value : '';
    const r = put({id:'cy' + uid(), type:'city', trip:M.trip, titre, date:d, dateFin:''}, '📍 ' + titre + ' ajouté');
    closeSheet(true); render(); explore(r.id);   // le lieu est ajouté : l’Explorer démarre tout de suite
  }
  async function voirDel(id){
    const c = R[id]; if(!c || !(await uiConfirm('Retirer « ' + c.titre + ' » de « Que voir » ?\nLes lieux déjà placés dans tes journées restent.'))) return;
    drop(id, '↩️ Retiré'); render(); voirAdd();
  }

  /* ---------- ✉️ Importer le mail de réservation (coller le texte, ou fichier .eml) ---------- */
  var impCat = '', impCtx = null;
  function impMail(){
    openSheet(`<h2>✉️ Coller le mail de réservation</h2>
      <div class="v-sum-small" style="margin-bottom:8px">Ouvre le mail de confirmation (hôtel, vol, train, bus, visite…), touche longuement le texte → <b>Tout sélectionner</b> → <b>Copier</b>, puis colle-le ici. L’appli reconnaît le type et remplit la fiche ; tu vérifies avant d’enregistrer. Rien n’est envoyé sur Internet.</div>
      <textarea class="v-in" id="cf-txt" rows="9" placeholder="Colle ici le texte du mail…"></textarea>
      ${navigator.clipboard && navigator.clipboard.readText ? `<button type="button" class="v-day-edit" style="margin-top:6px" onclick="CV.impPaste()">📋 Coller depuis le presse-papiers</button>` : ''}
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.impMailGo()">🔍 Lire le mail</button><button type="button" class="v-btn sec cv-sq" onclick="CV.impBack()" aria-label="Revenir en arrière">↩️</button></div>`);
  }
  async function impPaste(){ try { const t = await navigator.clipboard.readText(); const e = document.getElementById('cf-txt'); if(e && t) e.value = t; if(!t) toast('Presse-papiers vide'); } catch(e){ toast('Touche longuement la zone de texte → Coller'); } }
  function impMailGo(){
    const txt = (document.getElementById('cf-txt')||{}).value || '';
    if(txt.replace(/\s/g,'').length < 30){ alert('Colle le texte complet du mail de réservation.'); return; }
    closeSheet(true); cfImport(txt);
  }
  function impPickAny(){ tlPickFile('application/pdf,.pdf,.eml,message/rfc822,text/plain,.txt,text/html,.html,.htm', f => impAny(f)); }
  async function impAny(file, extra){
    const nm = file.name || '';
    if(/pdf/i.test(file.type) || /\.pdf$/i.test(nm)) return impFile(file, extra);
    if(/\.pkpass$/i.test(nm) || /pkpass/i.test(file.type)) return impPass(file);
    if(/^image\//i.test(file.type) || /\.(png|jpe?g|heic|heif|webp)$/i.test(nm)) return impFile(file, extra);
    if(/rfc822|text\/|octet-stream/i.test(file.type || 'text/') || /\.(eml|txt|html?|msg)$/i.test(nm)){
      try {
        const raw = await file.text(), m = mimeParse(raw);
        const text = [extra, m.subject, m.text].filter(Boolean).join('\n');
        if(m.pdfs.length) return impFile(m.pdfs[0], text);
        if(text.replace(/\s/g,'').length < 30) throw new Error('mail vide ou illisible');
        closeSheet(true); cfImport(text);
      } catch(e){ impSay('⚠️ ' + (e.message || e)); }
      return;
    }
    impSay('⚠️ Choisis le PDF ou le mail (.eml) de la réservation.');
  }
  function ewDec(s){ return String(s||'').replace(/=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g, (_, cs, enc, txt) => {
    try { const b = enc.toUpperCase()==='B' ? Uint8Array.from(atob(txt), c=>c.charCodeAt(0)) : qpBytes(txt.replace(/_/g,' ')); return new TextDecoder(cs).decode(b); } catch(e){ return txt; } }).replace(/\?=\s+=\?/g,''); }
  function qpBytes(s){
    s = s.replace(/=\r?\n/g,''); const out = [], enc = new TextEncoder();
    for(let i=0; i<s.length; i++){
      if(s[i]==='=' && /^[0-9A-Fa-f]{2}$/.test(s.substr(i+1,2))){ out.push(parseInt(s.substr(i+1,2),16)); i += 2; }
      else { const c = s.charCodeAt(i); if(c < 128) out.push(c); else enc.encode(s[i]).forEach(b=>out.push(b)); }
    }
    return new Uint8Array(out);
  }
  function htmlText(h){
    const d = new DOMParser().parseFromString(String(h).replace(/<(br|\/p|\/div|\/tr|\/td|\/th|\/h\d|\/li|\/table)\b[^>]*>/gi, '$&\n'), 'text/html');
    d.querySelectorAll('style,script,head,title').forEach(e=>e.remove());
    return (d.body ? d.body.textContent : '').replace(/[ \t ​]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{2,}/g,'\n');
  }
  function mimeParse(raw){
    const res = {subject:'', text:'', pdfs:[]};
    raw = String(raw).replace(/\r\n/g,'\n');
    if(!/^[\w-]+:\s/m.test(raw.slice(0, 2000)) || !/\n\n/.test(raw)){ res.text = /<html|<body|<div|<table/i.test(raw) ? htmlText(raw) : raw; return res; }
    const walk = (part, depth) => {
      const i = part.indexOf('\n\n'), head = (i < 0 ? part : part.slice(0, i)).replace(/\n[ \t]+/g,' '), body = i < 0 ? '' : part.slice(i+2);
      const hv = n => ((head.match(new RegExp('^' + n + ':\\s*([^\\n]+)', 'im'))||[])[1] || '');
      if(!depth && !res.subject) res.subject = ewDec(hv('subject'));
      const ct = hv('content-type') || 'text/plain', te = (hv('content-transfer-encoding').match(/[\w-]+/)||[''])[0].toLowerCase();
      const cs = ((ct.match(/charset="?([^";\s]+)/i)||[])[1] || 'utf-8').toLowerCase();
      if(/multipart\//i.test(ct)){
        const b = (ct.match(/boundary="?([^";]+)"?/i)||[])[1]; if(!b || depth > 5) return;
        body.split('--' + b).slice(1).forEach(p=>{ if(/^--/.test(p)) return; walk(p.replace(/^\n/,''), depth + 1); });
        return;
      }
      const bytes = () => te === 'base64' ? Uint8Array.from(atob(body.replace(/\s+/g,'')), c=>c.charCodeAt(0)) : te === 'quoted-printable' ? qpBytes(body) : null;
      const name = ewDec((hv('content-disposition').match(/filename\*?="?([^";]+)/i)||[])[1] || (ct.match(/name="?([^";]+)/i)||[])[1] || '');
      if(/application\/pdf/i.test(ct) || /\.pdf$/i.test(name)){ try { res.pdfs.push(new File([bytes() || new TextEncoder().encode(body)], name || 'reservation.pdf', {type:'application/pdf'})); } catch(e){} return; }
      if(!/^text\//i.test(ct)) return;
      let txt; try { const b = bytes(); txt = b ? new TextDecoder(cs).decode(b) : body; } catch(e){ txt = body; }
      if(/text\/html/i.test(ct)){ if(!res.plain) res.html = (res.html || '') + '\n' + htmlText(txt); }
      else { res.plain = (res.plain || '') + '\n' + txt; }
    };
    walk(raw, 0);
    res.text = (res.plain && res.plain.replace(/\s/g,'').length > 80 ? res.plain : (res.html || res.plain || '')).trim();
    return res;
  }

  /* ---------- 🧭 Quel type de réservation ? (hôtel, trajet, visite) ---------- */
  function cfKind(T, hint){
    const low = String(T).toLowerCase(), c = re => (low.match(re) || []).length;
    const s = {
      vol: c(/embarquement|boarding|\bvols?\b|\bflights?\b|a[ée]roport|airport|bagage en soute|terminal \d|\bgate\b|compagnie a[ée]rienne|airline|e-?ticket|\bpnr\b|cabin bag|bagage cabine/g) * 2
        + (String(T).match(/\([A-Z]{3}\)/g) || []).length + (/carte d.embarquement|boarding pass|enregistrement en ligne|online check-?in/.test(low) ? 4 : 0),
      hotel: c(/h[oô]tel|check-?in|check-?out|\bnuit[ée]?e?s?\b|\bnights?\b|chambre|\brooms?\b|h[ée]bergement|logement|appartement|g[îi]te|auberge|hostel|petit[- ]d[ée]jeuner|breakfast|\bs[ée]jour\b|propri[ée]t[ée]|voyageurs? adultes?/g) * 2
        + (/booking\.com|airbnb|hotels\.com|expedia|abritel|vrbo|accor|marriott|hilton|ibis|novotel|logis/.test(low) ? 4 : 0),
      train: c(/\btrains?\b|sncf|\btgv\b|ouigo|inoui|\bter\b|intercit|trenitalia|frecciarossa|\bitalo\b|renfe|\bave\b|deutsche bahn|\bdb\b|\bice\b|eurostar|thalys|lyria|\bgare\b|\bvoiture \d|\bwagon\b|\bcoach \d|railjet|\bsbb\b|\bcff\b|[öo]bb|trainline/g) * 2,
      bus: c(/\bbus\b|flixbus|blablacar|autocar|ouibus|\balsa\b|\bktel\b|eurolines|navette|shuttle/g) * 2,
      ferry: c(/ferry|ferries|travers[ée]e|\bbateau\b|\bport de\b|brittany ferries|corsica|moby|grimaldi|minoan|blue star|virtu|\bpont \d|cabine/g) * 2,
      act: c(/\bbillets?\b|\btickets?\b|\bentr[ée]es?\b|\bvisites?\b|\btours?\b|excursion|activit[ée]|mus[ée]e|museum|concert|spectacle|\bmatch\b|point de rencontre|meeting point|cr[ée]neau|time slot|participants?|coupe-file|skip the line|d[ée]gustation|\batelier\b|parc d.attractions|guid[ée]e?\b|audioguide/g) * 2
        + (/getyourguide|civitatis|viator|tiqets|klook|musement|fever|ticketmaster|fnac spectacles|headout|ticketone|disneyland|parc ast[ée]rix|puy du fou/.test(low) ? 6 : 0),
    };
    if(hint === 'hotel') s.hotel += 3; else if(hint === 'activite') s.act += 3; else if(hint === 'transport'){ s.vol += 2; s.train += 2; s.bus += 1; s.ferry += 1; }
    const tr = ['vol','train','bus','ferry'].sort((a,b)=>s[b]-s[a])[0];
    const best = Object.keys(s).sort((a,b)=>s[b]-s[a])[0];
    return {kind: s[best] ? best : (hint === 'hotel' ? 'hotel' : hint === 'transport' ? 'train' : 'act'), tr: s[tr] ? tr : 'train', s};
  }
  function actParse(T, r){
    const L = T.split('\n').map(l=>l.trim()).filter(Boolean);
    const bad = /@|https?:|www\.|^(bonjour|hello|hi|cher|ch[èe]re|merci|votre|your|r[ée]f|date|heure|total|prix|montant|adresse|t[ée]l|commande|order|num[ée]ro)\b/i;
    const lab = T.match(/(?:activit[ée]|excursion|visite|billet|produit|product|exp[ée]rience|[ée]v[ée]nement|event|tour)\s*[:\-–]\s*([^\n]{4,90})/i);
    const kw = /(visite|billet|entr[ée]e|\btour\b|excursion|mus[ée]e|museum|croisi[èe]re|concert|spectacle|ticket|\bpass\b|journ[ée]e|guid[ée]e|d[ée]gustation|atelier|parc|ch[âa]teau|palais|cath[ée]drale|basilique|colis[ée]e|vatican|acropole|pyramide|cours de)/i;
    r.titre = (lab ? lab[1] : (L.find(l=>l.length >= 8 && l.length <= 90 && !bad.test(l) && kw.test(l)) || '')).replace(/\s+/g,' ').trim();
    const mp = T.match(/(?:point de rencontre|meeting point|lieu(?: de rendez-vous)?|adresse|address)\s*[:\-–]\s*([^\n]{5,110})/i); if(mp) r.adresse = mp[1].trim();
    const pv = T.match(/\b(GetYourGuide|Civitatis|Viator|Tiqets|Klook|Musement|Fever|Ticketmaster|Fnac Spectacles|Headout|TicketOne|Disneyland|Puy du Fou)\b/i); if(pv) r.compagnie = pv[1];
    return r;
  }
  function impTypeBar(cat){
    if(!impCtx) return '';
    const b = (k, l) => `<button type="button" class="${cat===k?'on':''}" onclick="CV.impRetype('${k}')">${l}</button>`;
    return `<div class="cv-imptype"><span>📄 Lu comme</span><div class="v-seg v-seg2">${b('hotel','🏨 Hôtel')}${b('transport','🚆 Trajet')}${b('activite','🎟️ Visite')}</div><small>Pas le bon type ? Touche le bon : la fiche se refait.</small></div>`;
  }
  function impRetype(cat){ const c = impCtx; if(!c) return; cfImport(c.raw, c.pj, cat); }

  /* ---------- ⚖️ Même dates qu’un autre hôtel ou trajet : conserver ou remplacer ? ---------- */
  var endH = h => h.dateFin && h.dateFin > h.date ? h.dateFin : addD(h.date, 1);
  var whoOverlap = (a, b) => { const pa = parts(a), pb = parts(b); return pa.some(x=>pb.includes(x)); };
  var tmin = s => /^\d{1,2}:\d{2}/.test(s||'') ? (+s.split(':')[0]) * 60 + (+s.split(':')[1].slice(0,2)) : null;
  function trOverlap(a, b){
    if(a.date !== b.date) return false;
    const n = s => (normQ(cityOf(s||'')).split(' ')[0] || '');
    if((n(a.from) && n(a.from)===n(b.from)) || (n(a.to) && n(a.to)===n(b.to))) return true;
    const a1 = tmin(a.heureDep), a2 = tmin(a.heureArr), b1 = tmin(b.heureDep), b2 = tmin(b.heureArr);
    if(a1 != null && b1 != null) return a1 < (b2 != null && b2 > b1 ? b2 : b1 + 60) && b1 < (a2 != null && a2 > a1 ? a2 : a1 + 60);
    return b.statut === 'todo' && !b.ref && (!b.from || !b.to);
  }
  function dupOf(it){
    if(!it || !it.date || !['hotel','transport'].includes(it.cat)) return [];
    return items(o=>o.id !== it.id && o.cat === it.cat && o.date && whoOverlap(o, it) && (it.cat === 'hotel' ? (o.date < endH(it) && it.date < endH(o)) : trOverlap(it, o)));
  }
  var dupP = null;
  function dupAsk(arr, after){
    const pairs = arr.map(n=>({n, old:dupOf(n)})).filter(x=>x.old.length);
    dupP = {list:arr, after};
    const one = pairs.length === 1 && pairs[0].old.length === 1;
    openSheet(`<h2>⚖️ Déjà prévu à ces dates</h2><div class="v-sum-small" style="margin-bottom:10px">${arr.length > 1 ? 'Certaines fiches importées tombent' : 'Cette fiche tombe'} sur les mêmes dates ${one ? 'qu’une fiche existante' : 'que d’autres fiches'} :</div>
      ${pairs.map(x=>`<div class="cv-dup"><div class="nw">🆕 ${icon(x.n)} <b>${esc(x.n.titre)}</b><small>${subline(x.n)}</small></div>${x.old.map(o=>`<div class="od">📌 ${icon(o)} <b>${esc(o.titre)}</b> <em class="v-status ${o.statut}">${STATUTS[o.statut]||''}</em><small>${subline(o)}</small></div>`).join('')}</div>`).join('')}
      <button type="button" class="v-btn" onclick="CV.dupGo('replace')">🔁 Remplacer ${one ? 'l’ancienne fiche' : 'les anciennes fiches'}</button>
      <div class="v-sum-small" style="margin:-2px 0 8px">L’ancienne est supprimée ; ses notes, ses lieux à visiter et son estimation passent sur la nouvelle.</div>
      <button type="button" class="v-btn sec" onclick="CV.dupGo('keep')">➕ Conserver les deux</button>
      ${arr.length === 1 ? `<button type="button" class="v-btn sec" onclick="CV.dupBack()">↩️ Revenir à la fiche</button>` : ''}
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.dupCancel()">Annuler</button></div>`, true);
  }
  function dupGo(mode){
    const P = dupP; if(!P) return; dupP = null;
    const out = [], done = new Set();
    P.list.forEach((n,k)=>{ if(!n.id) n.id = 'i' + uid() + k; });
    if(mode === 'replace') P.list.forEach(n=>dupOf(n).forEach(o=>{
      if(done.has(o.id)) return; done.add(o.id);
      if(!String(n.estime ?? '').trim() && num(o.estime)) n.estime = o.estime;
      if(!(n.qui||[]).length && (o.qui||[]).length) n.qui = clone(o.qui);
      if(!n.hint && o.hint) n.hint = o.hint;
      list('place', p=>p.stay === o.id).forEach(p=>{ const c = clone(p); c.stay = n.id; out.push(c); });
      list('note', x=>x.ref === 'item:' + o.id).forEach(x=>{ const c = clone(x); c.ref = 'item:' + n.id; out.push(c); });
      const d = clone(o); d.deleted = true; out.push(d);
    }));
    out.push(...P.list);
    putMany(out, mode === 'replace' ? '🔁 Remplacé' : '➕ Les deux sont gardés');
    impCtx = null; closeSheet(true);
    if(P.after) P.after(); else render();
  }
  function dupBack(){ const P = dupP, c = impCtx; dupP = null; closeSheet(true); impCtx = c; if(P && P.list[0]) edit(P.list[0]); }
  function dupCancel(){ dupP = null; impCtx = null; closeSheet(true); }

  /* ---------- 🗂️ « Mes voyages » : s’ouvre au niveau des voyages en cours / à venir ---------- */
  function tripSheetScroll(){
    const sh = document.querySelector('#v-sheet-bg .v-sheet'); if(!sh) return;
    const cards = [...sh.querySelectorAll('.cv-tripcard[data-ph]')]; if(cards.length < 4) return;
    const cur = sh.querySelector('.cv-tripcard.on[data-ph="live"], .cv-tripcard.on[data-ph="prep"]');
    const tgt = cur || sh.querySelector('.cv-tripcard[data-ph="live"]') || sh.querySelector('.cv-tripcard[data-ph="prep"]') || cards[cards.length - 1];
    const hd = tgt.previousElementSibling && tgt.previousElementSibling.classList.contains('cv-triph') ? tgt.previousElementSibling : tgt;
    sh.scrollTop += hd.getBoundingClientRect().top - sh.getBoundingClientRect().top - 70;
  }
  /* Une vignette photo par voyage : photo de couverture, sinon la photo Wikipédia de la destination */
  const TC_GRAD = {prep:'linear-gradient(135deg,#2b1840,#6b2fa0 60%,#f0a35e)', live:'linear-gradient(135deg,#0f766e,#22c55e 70%,#fde68a)', past:'linear-gradient(135deg,#1e1b4b,#475569 70%,#94a3b8)'};
  const TC_BADGE = {prep:'À venir', live:'En cours', past:'Passé'};
  function tripCard(t, p, on){
    const loc = (window.I18N && I18N.locale) || 'fr-FR', d0 = t.debut ? new Date(t.debut + 'T12:00') : null;
    const nd = t.debut ? nights(t.debut, t.fin || t.debut) + 1 : 0;
    const st = new Set(list('item', i=>i.trip===t.id && i.cat==='hotel').map(h=>normQ(stayCity(h))).filter(Boolean)).size;
    const ini3 = (t.voyageurs||[]).filter(prof);
    return `<button class="cv-tripcard tc tc-${p}${on ? ' on' : ''}" data-ph="${p}" data-tid="${t.id}" style="--tg:${TC_GRAD[p]}" onclick="CV.close();CV.go('${t.id}')">
        <span class="tc-pic"><span class="tc-img"></span></span>
        <span class="tc-b"><span class="tt" data-notr>${esc(t.titre)}</span>
          <span class="td">${tripDatesLong(t) || 'dates à fixer'}</span>
          <span class="tc-st">${nd ? `<span>🗓️ <b data-notr>${nd}</b> <i>${nd > 1 ? 'jours' : 'jour'}</i></span>` : ''}${st ? `<span>📍 <b data-notr>${st}</b> <i>${st > 1 ? 'étapes' : 'étape'}</i></span>` : ''}${TS()[t.id] ? '<span>🔗</span>' : ''}</span>
          ${ini3.length ? `<span class="ins">${ini3.map(ini).join('')}</span>` : ''}</span>
        <span class="tc-stamp"><span>${t.archived ? '✓ clôturé' : TC_BADGE[p]}</span>${d0 ? `<small data-notr>${esc(new Intl.DateTimeFormat(loc, {month:'short'}).format(d0).replace('.', ''))} ${d0.getFullYear()}</small>` : ''}</span></button>`;
  }
  // la destination à illustrer : 1re étape, sinon 1re arrivée, sinon le sous-titre ou le titre du voyage
  function tripPlace(t){
    const H = list('item', i=>i.trip===t.id && i.cat==='hotel' && i.titre).sort((a, b)=>(a.date||'').localeCompare(b.date||''));
    if(H.length) return cityOf(H[0].titre);
    const T = list('item', i=>i.trip===t.id && i.cat==='transport' && i.to).sort((a, b)=>(a.date||'').localeCompare(b.date||''));
    if(T.length) return cityOf(T[0].to);
    return String(t.sous || t.titre || '').split(/[→\/·,|–-]/)[0].trim();
  }
  async function wkPhoto(q, both){
    for(const lg of ['fr', 'en']){
      try { const r = await fetch(`https://${lg}.wikipedia.org/api/rest_v1/page/summary/` + encodeURIComponent(q.replace(/ /g, '_'))); if(!r.ok) continue;
        const j = await r.json(); if(j.type === 'disambiguation') continue;
        const th = j.thumbnail && j.thumbnail.source, oi = j.originalimage || {}; if(!th && !oi.source) continue;
        // largeurs standard Wikimedia seulement (960 px), ou l’original s’il est plus petit
        const f = oi.source && oi.width && oi.width <= 960 ? oi.source : th ? th.replace(/([\/-])\d+px-/, '$1960px-') : oi.source;
        return both ? {g:th ? th.replace(/([\/-])\d+px-/, '$1500px-') : f, f} : f; } catch(e){}
    }
    return both ? null : '';
  }
  function tripCardsPaint(){
    document.querySelectorAll('.cv-tripcard.tc[data-tid]').forEach(async el=>{
      const t = R[el.dataset.tid], im = el.querySelector('.tc-img'); if(!t || !im) return;
      const show = u => { if(!u) return; const i = new Image(); i.onload = () => { im.style.backgroundImage = `url("${u}")`; im.classList.add('ok'); }; i.src = u; };
      { const u = await coverURL(t); if(u){ show(u); return; } }
      const q = tripPlace(t); if(!q) return;
      const C = M.tripImg || (M.tripImg = {}), c = C[t.id];
      if(c && c.q === q && !/\/800px-/.test(c.u || '') && (c.u || Date.now() - (c.at || 0) < 3 * 864e5)){ show(c.u); return; }   // sans photo trouvée : on réessaie 3 jours plus tard (hors ligne, etc.)
      const u = await wkPhoto(q); C[t.id] = {q, u, at:Date.now()}; persist(); show(u);
    });
  }
  function tripListHTML(cur){
    const ts = trips(), ph = t => tripPhase(t), lbl = {past:'🗺️ Passés', live:'📍 En cours', prep:'🧳 À venir'};
    let last = '', h = '';
    const many = ts.length >= 4;
    ts.forEach(t=>{
      const p = !t.debut ? 'prep' : ph(t);
      if(many && p !== last){ h += `<div class="cv-triph">${lbl[p]}</div>`; last = p; }
      const act = !t.demo;   // 2 raccourcis par voyage : abonnés (lecture seule) · compagnon (voyage complet)
      h += `<div class="cv-tripw">${tripCard(t, p, t.id===cur)}
        ${act ? `<div class="cv-tripact"><button type="button" class="${FT()[t.id] ? 'on' : ''}" onclick="CV.carnetToggle('${t.id}').then(()=>CV.tripSheet && document.querySelector('.cv-tripw') && CV.tripSheet())">${FT()[t.id] ? '👀 Partagé aux abonnés' : '🔒 Masqué aux abonnés'}</button><button type="button" onclick="CV.close();CV.tripInviteNow('${t.id}')">👥 Ajouter un compagnon</button></div>` : ''}</div>`;
    });
    return h;
  }

  var NEWAPI = {renderPrefs, prefTog, prefPreset, datesSheet, datesSave, dayMenu, dayIns, dayAdd, dayDelAsk, dayDel, shareHub,
    voirAdd, voirSave, voirDel, impMail, impPaste, impMailGo, impPickAny, impRetype, dupGo, dupBack, dupCancel};
  var NEWMUT = ['datesSave','dayIns','dayAdd','dayDel','dayDelAsk','voirSave','voirDel','dupGo','dupTripsGo','impMailGo','impPickAny','impRetype'];



  /* ══════════════════════════════════════════════════════════════════════════
     📦 VERSION APPLI (Google Play) : serveur économe, suppression des données, soutien
     ══════════════════════════════════════════════════════════════════════════ */
  // Lien « Buy me a coffee » (ou autre) : affiché seulement sur le site, jamais dans l'appli Google Play
  // ☕ Ton lien de soutien (Buy Me a Coffee). Vide = aucun bouton. Jamais affiché dans l'appli Google Play.
  var COFFEE_URL = 'https://buymeacoffee.com/tonytonic';
  function isPlay(){
    // Seulement sur Android : un iPhone (ou un ordinateur) n'est jamais « l'appli Google Play », même s'il a ouvert un lien ?src=play
    try {
      if(!/Android/i.test(navigator.userAgent || '')){ localStorage.removeItem('cv-play'); return false; }
      if(/[?&]src=play\b/.test(location.search) || document.referrer.startsWith('android-app://')) localStorage.setItem('cv-play', '1');
      return localStorage.getItem('cv-play') === '1';
    } catch(e){ return false; }
  }
  isPlay();
  /* ⭐ Noter l’appli : seulement dans l’appli Google Play, après une vraie utilisation (5 jours différents, 1 voyage), jamais pendant une saisie.
     « Plus tard » : redemandé dans 30 jours ; « Non merci » ou « Noter » : plus jamais. */
  function rateTick(){
    try {
      if(!isPlay() || M.webFollow) return;
      const k = 'cv-rate', o = JSON.parse(localStorage.getItem(k) || '{}'), d = isoToday();
      if(o.st === 'no' || o.st === 'done') return;
      o.days = o.days || []; if(!o.days.includes(d)){ o.days.push(d); o.days = o.days.slice(-10); }
      localStorage.setItem(k, JSON.stringify(o));
      if(o.days.length < 5 || (o.later && Date.now() < o.later) || !trips().some(t=>!t.demo)) return;
      setTimeout(()=>{ if(document.querySelector('#v-sheet-bg, .ui-dlg, #cv-gate, #cv-film, #cv-tj, .cv-first, #cv-world') || document.visibilityState !== 'visible') return;
        openSheet(`<h2>⭐ Vezoria te plaît ?</h2>
          <div class="v-sum-small" style="margin:4px 0 12px">Une note sur Google Play aide d’autres voyageurs à trouver l’appli, et m’encourage à continuer à l’améliorer. Ça prend 30 secondes. Merci 🙏</div>
          <div class="v-actions" style="flex-direction:column"><button type="button" class="v-btn" onclick="CV.rateGo('done')">⭐ Noter sur Google Play</button>
          <button type="button" class="v-btn sec" onclick="CV.rateGo('later')">Plus tard</button><button type="button" class="v-btn sec" onclick="CV.rateGo('no')">Non merci</button></div>`);
      }, 9000);
    } catch(e){}
  }
  function rateGo(how){
    try { const o = JSON.parse(localStorage.getItem('cv-rate') || '{}');
      if(how === 'later'){ o.later = Date.now() + 30 * 864e5; } else o.st = how;
      localStorage.setItem('cv-rate', JSON.stringify(o)); } catch(e){}
    closeSheet();
    if(how === 'done') window.open(PLAY_URL, '_blank');
  }
  setTimeout(rateTick, 5000);
  // Les photos sorties d'une fiche ou d'une fiche supprimée sont aussi effacées du serveur
  function photoRefs(r){ return r ? [...(r.photos||[]), r.recu, r.preuve, ...((r.pj||[]).map(p=>p && p.id))].filter(Boolean) : []; }
  function photoGone(prev, next){
    if(!prev || prev.demo) return;
    const keep = new Set(next && !next.deleted ? photoRefs(next) : []);
    const gone = photoRefs(prev).filter(p=>!keep.has(p)); if(!gone.length) return;
    const t = targets(prev)[0], code = t === 'main' ? (M.sync.on && M.sync.code ? M.sync.code : null) : t;
    if(!code) return;
    M.pgone = M.pgone || [];
    gone.forEach(id=>{ if(!M.pgone.some(x=>x.id===id)) M.pgone.push({id, code}); });
  }
  async function photoPurge(){
    if(!(M.pgone||[]).length || !photoApi()){ try { await potGc(); } catch(e){} return; }
    const live = new Set(Object.values(R).filter(r=>r && !r.deleted && r.type !== 'feed').flatMap(photoRefs));   // (une publication pour abonnés n'est qu'une copie : elle ne garde pas la photo en vie)
    for(const g of [...M.pgone]){
      if(live.has(g.id)){ M.pgone = M.pgone.filter(x=>x!==g); continue; }
      const pk = R['pk:' + g.id];
      if(pk && !pk.deleted && pk.s){   // 🫙 photo du pot commun : effacée là où elle est rangée (si c'est un de mes carnets), et son droit de lecture retiré
        try { await v2Del(pk); } catch(e){ break; }
        putQuiet([Object.assign(clone(pk), {deleted:true})]);
        M.pgone = M.pgone.filter(x=>x!==g); persist(); continue;
      }
      try {
        let ok = true;
        for(const id of [g.id, g.id + '.t']){
          const r = await fetch(photoApi() + '?id=' + encodeURIComponent(await sid(id, g.code)), {method:'DELETE', headers:{'X-Carnet-Code':await authCode(g.code)}});
          if(!r.ok && r.status !== 404 && r.status !== 405) ok = false;   // 405 : serveur sans suppression (version test dans le carnet)
        }
        if(!ok) break;
      } catch(e){ break; }
      M.pgone = M.pgone.filter(x=>x!==g); persist();
    }
    try { await potGc(); } catch(e){}   // 🫙 anciennes copies des photos rangées dans le pot commun
  }
  // Fiche supprimée : on n'envoie au serveur que le strict nécessaire (le reste reste sur le téléphone)
  function slim(r){ return r && r.deleted ? Object.assign({id:r.id, type:r.type, trip:r.trip, deleted:true, createdAt:r.createdAt, createdBy:r.createdBy, updatedAt:r.updatedAt, updatedBy:r.updatedBy},
    r.type === 'phk' && r.s ? {s:r.s, i:r.i, it:r.it} : {}) : r; }   // 🫙 photo retirée du pot commun : son emplacement reste connu, pour que le téléphone qui l'a rangée l'efface (jamais la clé)
  // Photos : WebP si le téléphone sait le faire (≈ 30 % plus léger), sinon JPEG
  async function jpgBytes(b){
    const u8 = new Uint8Array(await b.arrayBuffer());
    if(u8[0] === 0xFF && u8[1] === 0xD8) return u8;
    const bmp = await createImageBitmap(b), c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    c.getContext('2d').drawImage(bmp, 0, 0); if(bmp.close) bmp.close();
    return new Uint8Array(await (await new Promise(r=>c.toBlob(r, 'image/jpeg', 0.9))).arrayBuffer());
  }
  // Supprimer le carnet du serveur (exigé par Google Play) : fiches + photos, pour tout le monde
  function cloudTripOff(tid){
    const t = R[tid]; if(!t) return;
    openSheet(`<h2>☁️ Retirer « ${esc(t.titre)} » du cloud</h2>
      <div class="v-sum-small" style="margin-bottom:12px">Ce qui est sur ce téléphone reste ici dans les deux cas.</div>
      <button type="button" class="cv-choice" onclick="CV.close();CV.serverWipeTrip('${tid}')"><i>🗑</i><span><b>L’effacer du serveur</b><small>Fiches et photos supprimées du serveur, pour tout le monde (compagnons et abonnés n’y ont plus accès).</small></span></button>
      <button type="button" class="cv-choice" onclick="CV.close();CV.tripUnshare('${tid}')"><i>📱</i><span><b>Le garder seulement sur ce téléphone</b><small>Ce téléphone arrête de le synchroniser. Tes compagnons gardent leur copie en ligne.</small></span></button>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.cloudSheet()">Annuler</button></div>`);
  }
  function serverWipeSheet(){
    const s = M.sync;
    // mes voyages qui ont quelque chose sur le serveur : le voyage partagé (compagnons) et/ou la publication (abonnés)
    const rows = trips().filter(t=>t && !t.deleted && t.type === 'trip' && !t.demo).map(t=>{
      const tc = TS()[t.id] && spaceObj(TS()[t.id]) ? TS()[t.id] : '', fc = FT()[t.id] || ''; return {t, tc, fc}; }).filter(x=>x.tc || x.fc);
    openSheet(`<h2>🗑 Supprimer mes données du serveur</h2>
      <div class="v-sum-small" style="margin-bottom:10px">Efface du serveur toutes les fiches et photos du carnet choisi, <b>pour toutes les personnes qui ont son code</b>. Ce qui est sur ce téléphone reste ici (fais d’abord une sauvegarde ZIP si tu veux garder une copie).</div>
      ${s.code ? `<button type="button" class="v-btn danger" onclick="CV.serverWipe('')">🗑 Carnet principal (${esc(s.code.slice(0,4))}…)</button>` : ''}
      ${rows.map(x=>`<button type="button" class="v-btn danger sw-row" onclick="CV.serverWipeTrip('${x.t.id}')"><span data-notr>🗑 « ${esc(x.t.titre)} »</span><small>${x.tc && x.fc ? 'Voyage partagé + abonnés' : x.fc ? 'Abonnés' : 'Voyage partagé'}</small></button>`).join('')}
      ${!s.code && !rows.length ? '<div class="v-sum-small">Rien n’est enregistré sur le serveur depuis ce téléphone : tes données sont seulement ici. « Effacer ce téléphone » (Sauvegarde) les supprime.</div>' : ''}
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Annuler</button></div>`);
  }
  // photos encore à envoyer : on garde celles des autres carnets, on retire celles des codes effacés
  function pqWithout(codes){
    const owner = {}; Object.values(R).forEach(x=>{ if(!x || x.type === 'feed') return; [...(x.photos||[]), x.recu, x.preuve, x.cover, ...(x.pj||[]).map(p=>p && p.id)].forEach(p=>{ if(p && !owner[p]) owner[p] = x; }); });
    return (M.pq||[]).filter(id=>{ const r = owner[String(id).replace(/\.t$/,'')]; if(!r) return false; const t = targets(r)[0], c = t === 'main' ? M.sync.code : t; return !codes.has(c); });
  }
  async function serverWipeTrip(tid){
    const t = R[tid]; if(!t) return;
    const tc = TS()[tid] && spaceObj(TS()[tid]) ? TS()[tid] : '', fc = FT()[tid] || '', codes = new Set([tc, fc].filter(Boolean));
    if(!codes.size){ serverWipeSheet(); return; }
    if(!(await uiConfirm('Supprimer « ' + t.titre + ' » du serveur, pour tout le monde ?\nCompagnons et abonnés n’y auront plus accès. Ce qui est sur ce téléphone reste ici.\nCette action ne peut pas être annulée.'))) return;
    // d’abord on arrête les envois en cours (sinon des photos arriveraient encore après la suppression)
    upHalt = true; for(let k = 0; k < 150 && (uploading || feedUp); k++) await new Promise(r=>setTimeout(r, 200));
    let nR = 0, nP = 0;
    try {
      for(const code of codes){
        const r = await fetch(apiUrl(), {method:'DELETE', headers:{'X-Carnet-Code':await authCode(code)}});
        let j = {}; try { j = await r.json(); } catch(e){}
        if(!r.ok) throw new Error(j.error || ('erreur ' + r.status));
        nR += j.records || 0; nP += j.photos || 0;
      }
      // le téléphone oublie ces codes : le voyage redevient « seulement sur ce téléphone » et n’est plus proposé ici
      M.pq = pqWithout(codes);
      if(tc) delete TS()[tid];
      if(fc){ delete FT()[tid]; delete TS()[ftId(tid)];
        Object.values(R).forEach(r=>{ if(r && (r.trip === ftId(tid) || r.id === ftId(tid) || r.id === 'fk:' + tid)) delete R[r.id]; });
        if(M.fup) delete M.fup[fc]; M.fq = (M.fq||[]).filter(x=>x[0] !== fc); M.fdel = (M.fdel||[]).filter(x=>x[0] !== fc); }
      M.spaces = (M.spaces||[]).filter(x=>!codes.has(x.code)); M.pgone = (M.pgone||[]).filter(g=>!codes.has(g.code));
      if(M.cloudInv) delete M.cloudInv[tid];
      persist(); closeSheet(true); refresh();
      alert('🗑 Supprimé du serveur : ' + nR + ' fiche(s) et ' + nP + ' photo(s).\nLe voyage reste sur ce téléphone, sans partage.');
    } catch(e){ alert('Suppression impossible : ' + e.message); }
    finally { upHalt = false; }
  }
  async function serverWipe(code){
    const main = !code; code = code || M.sync.code; if(!code) return;
    // 🫙 photos du pot commun rangées dans ce carnet et vues par des compagnons ou des abonnés : elles disparaîtront pour eux aussi
    let shared = 0; try { const h = await spaceHash(code); shared = list('phk', r=>/^pk:/.test(r.id) && r.s === h && r.trip && ((TS()[r.trip] && TS()[r.trip] !== code) || FT()[r.trip])).length; } catch(e){}
    if(!(await uiConfirm('Supprimer définitivement ce carnet du serveur, pour tout le monde ?\nCette action ne peut pas être annulée.' + (shared ? '\n\n🫙 ' + MSGT('{0} photo(s) rangées dans ce carnet sont aussi vues par tes compagnons ou tes abonnés : elles disparaîtront pour eux aussi.').replace('{0}', shared) : '')))) return;
    // d’abord on arrête les envois en cours (sinon des photos arriveraient encore après la suppression)
    upHalt = true; for(let k = 0; k < 150 && (uploading || feedUp); k++) await new Promise(r=>setTimeout(r, 200));
    // la file d’attente des autres voyages est gardée ; seules les photos de ce carnet en sortent
    const owner = {}; Object.values(R).forEach(x=>{ if(!x || x.type === 'feed') return; [...(x.photos||[]), x.recu, x.preuve, x.cover, ...(x.pj||[]).map(p=>p && p.id)].forEach(p=>{ if(p && !owner[p]) owner[p] = x; }); });
    const codeOfPh = id => { const r = owner[String(id).replace(/\.t$/,'')]; if(!r) return null; const t = targets(r)[0]; return t === 'main' ? M.sync.code : t; };
    const pqKeep = (M.pq||[]).filter(id=>codeOfPh(id) !== code);
    try {
      const r = await fetch(apiUrl(), {method:'DELETE', headers:{'X-Carnet-Code':await authCode(code)}});
      let j = {}; try { j = await r.json(); } catch(e){}
      if(!r.ok) throw new Error(j.error || ('erreur ' + r.status));
      const keep = (await uiConfirm('🗑 Supprimé du serveur : ' + (j.records||0) + ' fiche(s) et ' + (j.photos||0) + ' photo(s).\nTes données restent sur ce téléphone.\n\nGarder le code sur ce téléphone ?\nOK = je garde le code : tu pourras tout renvoyer plus tard avec le même code (bouton « Tout renvoyer »).\nAnnuler = j’oublie ce code ici.'));
      if(keep){ if(main){ M.sync.since = 0; M.dirty = []; } else { const sp = spaceObj(code); if(sp){ sp.since = 0; sp.dirty = []; } } }
      else if(main){ M.sync.on = false; M.sync.since = 0; M.dirty = []; }
      else { Object.keys(TS()).forEach(tid=>{ if(TS()[tid] === code) delete TS()[tid]; }); M.spaces = (M.spaces||[]).filter(x=>x.code !== code); }
      M.pq = pqKeep; M.pgone = (M.pgone||[]).filter(g=>g.code !== code); persist(); closeSheet(true); refresh();
      if(keep) alert('Le code est gardé. Pour tout remettre sur le serveur : ' + (main ? 'Réglages' : 'Mes voyages → le voyage → code') + ' → « Tout renvoyer ».');
    } catch(e){ alert('Suppression impossible : ' + e.message); }
    finally { upHalt = false; }
  }
  const coffeeOn = () => !!COFFEE_URL && !/TON_PSEUDO/.test(COFFEE_URL) && !isPlay();
  function coffeeBox(){
    if(!coffeeOn()) return '';
    return `<div class="v-box"><h3>☕ Soutenir l’appli</h3><p>L’appli est gratuite, sans pub et sans compte. Si elle te rend service, un café aide à payer le serveur.</p><a class="v-btn cv-bmc" href="${esc(COFFEE_URL)}" target="_blank" rel="noopener">☕ Offrir un café</a></div>`;
  }
  // Au bon moment : dans le Bilan d'un voyage terminé (pas plus d'une fois tous les 60 jours si « Plus tard »)
  function coffeeBilan(t){
    if(!coffeeOn() || !t || (tripPhase(t) !== 'past' && !t.archived)) return '';
    if(M.coffeeLater && Date.now() - M.coffeeLater < 60 * 864e5) return '';
    return `<div class="v-box cv-coffee"><h3>☕ Ce voyage s’est bien passé ?</h3><p>L’appli est gratuite, sans pub et sans compte. Si elle t’a rendu service, un café aide à payer le serveur.</p>
      <a class="v-btn cv-bmc" href="${esc(COFFEE_URL)}" target="_blank" rel="noopener" onclick="CV.coffeeLater()">☕ Offrir un café</a>
      <button type="button" class="v-btn sec" onclick="CV.coffeeLater(true)">Plus tard</button></div>`;
  }
  function coffeeLater(rerender){ M.coffeeLater = Date.now(); persist(); if(rerender === true) render(); }
  async function photoQueueAll(only){
    const inScope = r => r && r.id && !r.demo && (!only || r.id === only || r.trip === only);
    const ids = new Set(); Object.values(R).forEach(r=>{ if(!inScope(r)) return; (r.photos||[]).forEach(x=>ids.add(x)); [r.recu, r.preuve].forEach(x=>x && ids.add(x)); (r.pj||[]).forEach(p=>p && p.id && ids.add(p.id)); });
    M.pq = M.pq || []; let n = 0;
    for(const id of ids){ let o = null; try { o = await IDB.get(id); } catch(e){} if(o && o.blob){ if(!M.pq.includes(id)){ M.pq.push(id); n++; } continue; }
      let t = null; try { t = await IDB.get(id + '.t'); } catch(e){} if(t && t.blob && !M.pq.includes(id + '.t')){ M.pq.push(id + '.t'); n++; } }
    return n;
  }
  async function photoResend(only){
    // 1) toutes les fiches (voyage, souvenirs, dépenses…) repartent vers leur carnet (principal ou code du voyage), depuis le début
    // only = id d’un voyage : on ne renvoie que ce voyage (et son code)
    const inScope = r => r && r.id && !r.demo && (!only || r.id === only || r.trip === only);
    let nr = 0;
    if(only){ const sp = spaceObj(TS()[only]); if(sp) sp.since = 0; }
    else { if(M.sync) M.sync.since = 0; (M.spaces||[]).forEach(sp=>{ sp.since = 0; }); }
    Object.values(R).forEach(r=>{ if(inScope(r)){ markDirty(r.id); nr++; } });
    // 2) toutes les photos présentes sur ce téléphone repartent aussi
    const ids = new Set();
    Object.values(R).forEach(r=>{ if(!inScope(r)) return; (r.photos||[]).forEach(x=>ids.add(x)); (r.pj||[]).forEach(p=>p && p.id && ids.add(p.id)); [r.recu, r.preuve].forEach(x=>x && ids.add(x)); });
    M.pq = M.pq || []; let n = 0;
    for(const id of ids){
      let o = null; try { o = await IDB.get(id); } catch(e){}
      if(o && o.blob){ if(!M.pq.includes(id)){ M.pq.push(id); n++; } continue; }
      let t = null; try { t = await IDB.get(id + '.t'); } catch(e){} if(t && t.blob && !M.pq.includes(id + '.t')){ M.pq.push(id + '.t'); n++; }
    }
    persist();
    alert(nr + ' fiche(s) et ' + n + ' photo(s) remises en file d’envoi.');
    await syncNow(true);
    uploadQueue();
  }
  /* ======================================================================
     ✨ WHAOU : prochaine étape · rangement auto des photos · film du voyage
     ====================================================================== */
  const TT = s => (window.I18N && I18N.tr ? I18N.tr(s) : s), NL = () => (window.I18N && I18N.locale) || 'fr-FR';
  const hav = (a, b) => { const r = x => x*Math.PI/180, dLa = r(b.lat-a.lat), dLo = r(b.lng-a.lng);
    return 2*6371*Math.asin(Math.sqrt(Math.sin(dLa/2)**2 + Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLo/2)**2)); };

  /* ---------- 1) Carte « Prochaine étape » ---------- */
  function nextHero(){
    const t = trip(); if(!t || t.archived || t.demo && false) return '';
    const L = nextMoves(); const nx = L[0]; if(!nx) return '';
    if(nx.at - Date.now() > 10*864e5) return '';
    const it = nx.it, td = isoToday(), tm = it.cat==='transport' ? it.heureDep : it.heure;
    const day = it.date === td ? 'Aujourd’hui' : it.date === new Date(Date.now()+864e5).toISOString().slice(0,10) ? 'Demain' : fdate(it.date);
    const sub = it.cat==='transport' ? [it.from && it.to ? it.from + ' → ' + it.to : '', it.compagnie, it.heureArr ? 'arrivée ' + it.heureArr : ''].filter(Boolean).join(' · ')
      : it.cat==='hotel' ? [it.nom, it.adresse].filter(Boolean).join(' · ') : [it.adresse, it.lieu].filter(Boolean).join(' · ');
    const pj = (it.pj||[])[0], more = L.slice(1, 3);
    const b = (ic, l, fn) => `<button type="button" onclick="${fn}"><i>${ic}</i>${l}</button>`;
    const enr = nx.on, pc = enr ? Math.round(100 * (Date.now() - nx.at) / Math.max(1, nx.end - nx.at)) : 0;
    return `<div class="cv-hero${enr ? ' enr' : ''}" id="cv-hero" data-at="${enr ? nx.end : nx.at}" data-on="${enr ? 1 : 0}">
      <div class="hk">${enr ? '🚀 En route' : 'Prochaine étape'}</div>
      <div class="ht"><span class="hi">${icon(it)}</span><div><b>${esc(it.titre)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div></div>
      ${enr ? `<div class="hc"><span id="cv-hero-cd">${hhmm(nx.end - Date.now())}</span><small>avant l’arrivée · ${esc(it.heureArr)}</small></div><div class="hpr"><i style="width:${pc}%"></i><b style="left:${pc}%">${icon(it)}</b></div>`
        : `<div class="hc"><span id="cv-hero-cd">${hhmm(nx.at - Date.now())}</span><small>${day}${nx.timed ? ' · ' + esc(tm) : it.cat==='hotel' ? ' · arrivée à l’hôtel' : ''}</small></div>`}
      ${it.ref ? `<button type="button" class="href" onclick="CV.nhCopy('${esc(it.ref)}')">Réf. <b>${esc(it.ref)}</b> <i>⧉</i></button>` : ''}
      <div class="hb">${it.cat==='transport' && it.mode==='Avion' && nx.at - Date.now() < 36*3600e3 ? b('🛫','Embarquement',`CV.boardShow('${it.id}')`) : ''}${b('🧭','Y aller',`CV.nhGo('${it.id}')`)}${pj ? b('🎫','Billet',`CV.pjOpen('${esc(pj.id)}','${esc(pj.t||'img')}')`) : ''}${it.tel ? b('📞','Appeler',`location.href='tel:${esc(String(it.tel).replace(/[^+\d]/g,''))}'`) : ''}${b('✏️','Fiche',`CV.edit('${it.id}')`)}</div>
      ${more.length ? `<div class="hn">Ensuite : ${more.map(m=>`${icon(m.it)} ${esc(m.it.titre)} <small>${m.it.date === td ? '' : fshort(m.it.date) + ' '}${esc((m.it.cat==='transport' ? m.it.heureDep : m.it.heure) || '')}</small>`).join(' &nbsp;·&nbsp; ')}</div>` : ''}</div>`;
  }
  function nhGo(id){
    const it = R[id]; if(!it) return; const q = encodeURIComponent;
    let u;
    if(it.cat==='transport'){ const pt = String(it.from||'') + (it.mode==='Avion' ? ' aéroport' : /Train/i.test(it.mode||'') ? ' gare' : ''); u = `https://www.google.com/maps/dir/?api=1&destination=${q(pt)}`; }
    else if(it.cat==='hotel') u = `https://www.google.com/maps/dir/?api=1&destination=${q([it.nom, it.adresse || it.titre].filter(Boolean).join(' '))}`;
    else u = `https://www.google.com/maps/dir/?api=1&destination=${q(it.adresse || [it.titre, it.lieu].filter(Boolean).join(' '))}`;
    window.open(u, '_blank', 'noopener');
  }
  async function nhCopy(txt){ try { await navigator.clipboard.writeText(txt); toast('📋 Référence copiée'); } catch(e){ (await uiPrompt('Référence :', txt)); } }
  setInterval(() => { const h = document.getElementById('cv-hero'); if(!h) return; const at = +h.dataset.at, e = document.getElementById('cv-hero-cd');
    if(Date.now() >= at || (h.dataset.on !== '1' && (nextMoves()[0] || {}).on)){ const nh = nextHero(), d = document.createElement('div'); d.innerHTML = nh; if(d.firstElementChild) h.replaceWith(d.firstElementChild); else h.remove(); hydrate(); return; }   // l’heure est passée : l’étape suivante prend la place
    if(e) e.textContent = hhmm(at - Date.now());
    const pr = h.querySelector('.hpr'); if(pr){ const nx = nextMoves()[0]; if(nx && nx.on){ const pc = Math.round(100 * (Date.now() - nx.at) / Math.max(1, nx.end - nx.at)); pr.querySelector('i').style.width = pc + '%'; pr.querySelector('b').style.left = pc + '%'; } } }, 15000);
  const heroCss = document.createElement('style'); heroCss.textContent = `.cv-hero .hpr{position:relative;height:8px;border-radius:99px;background:rgba(255,255,255,.22);margin:10px 4px 18px}.cv-hero .hpr i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:linear-gradient(90deg,#fde68a,#fff);transition:width 1s}.cv-hero .hpr b{position:absolute;top:50%;transform:translate(-50%,-50%);font-size:1.3rem;transition:left 1s;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))}.cv-hero.enr .hk{color:#fde68a}`; document.head.appendChild(heroCss);

  /* ---------- 2) Ranger mes photos automatiquement (EXIF → souvenirs) ---------- */
  async function exifOf(file){
    const out = {};
    const scan = async (blob) => {
      const v = new DataView(await blob.arrayBuffer()), n = v.byteLength;
      for(let o=0; o<n-14; o++){
        if(v.getUint32(o) !== 0x45786966 || v.getUint16(o+4) !== 0) continue;   // « Exif\0\0 » (JPEG et HEIC)
        const t = o + 6, bo = v.getUint16(t); if(bo !== 0x4949 && bo !== 0x4D4D) continue;
        const le = bo === 0x4949, g16 = p => v.getUint16(p, le), g32 = p => v.getUint32(p, le);
        const ok = p => p >= 0 && p + 2 <= n;
        const ifd = off => { const r = {}; if(!ok(t+off)) return r; const c0 = g16(t+off); for(let i=0;i<c0 && i<400;i++){ const e = t+off+2+i*12; if(!ok(e+12)) break; const tag = g16(e), ty = g16(e+2), c = g32(e+4), sz = ([0,1,1,2,4,8,1,1,2,4,8][ty]||1)*c; r[tag] = {ty, c, p: sz > 4 ? t + g32(e+8) : e+8}; } return r; };
        const str = e => { let s = ''; for(let i=0;i<e.c-1 && e.p+i<n;i++) s += String.fromCharCode(v.getUint8(e.p+i)); return s; };
        const rat = (e, i) => { const p = e.p+i*8; if(p+8 > n) return 0; const d = g32(p+4); return d ? g32(p)/d : 0; };
        try {
          const i0 = ifd(g32(t+4)), ex = i0[0x8769] ? ifd(g32(i0[0x8769].p)) : {};
          const ds = ex[0x9003] ? str(ex[0x9003]) : i0[0x0132] ? str(i0[0x0132]) : '';
          const mm = ds.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/); if(mm){ out.date = `${mm[1]}-${mm[2]}-${mm[3]}`; out.time = `${mm[4]}:${mm[5]}`; }
          if(i0[0x8825]){ const g = ifd(g32(i0[0x8825].p));
            if(g[2] && g[4]){ let la = rat(g[2],0) + rat(g[2],1)/60 + rat(g[2],2)/3600, lo = rat(g[4],0) + rat(g[4],1)/60 + rat(g[4],2)/3600;
              if(g[1] && str(g[1]).startsWith('S')) la = -la; if(g[3] && str(g[3]).startsWith('W')) lo = -lo;
              if(isFinite(la) && isFinite(lo) && (la || lo)){ out.lat = +la.toFixed(5); out.lng = +lo.toFixed(5); } } }
        } catch(e){}
        return true;
      }
      return false;
    };
    try { if(!(await scan(file.slice(0, 393216))) && file.size > 393216) await scan(file.slice(Math.max(0, file.size - 393216))); } catch(e){}
    if(!out.date){ const d = new Date(file.lastModified || Date.now()); out.date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; out.time = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); out.guess = 1; }
    return out;
  }
  const geoCacheR = {};
  async function revGeo(lat, lng){
    const key = (+lat).toFixed(2) + ',' + (+lng).toFixed(2); if(geoCacheR[key]) return geoCacheR[key];
    try { const j = await (await fetch(`${GEO}reverse?format=jsonv2&zoom=10&accept-language=${((window.I18N && I18N.lang) || 'fr')}&lat=${lat}&lon=${lng}`)).json();
      const a = (j && j.address) || {}; return geoCacheR[key] = {city: a.city || a.town || a.village || a.municipality || a.county || '', pays: a.country || '', cc: (a.country_code || '').toUpperCase()}; } catch(e){ return {}; }
  }
  const exTs = ex => Date.parse((ex.date || isoToday()) + 'T' + (ex.time || '12:00') + ':00') || Date.now();
  // une photo ajoutée garde l'endroit où elle a été prise : le souvenir trouve son lieu, et l'itinéraire se dessine même sans « Je suis ici »
  async function photoGeoInto(s, ex, pid){
    if(!ex || ex.lat == null) return; s.pts = s.pts || []; s.pts.push([ex.lat, ex.lng, exTs(ex), pid]);
    if(s.lat == null){ s.lat = ex.lat; s.lng = ex.lng; }
  }
  let AP = null;
  function autoPhotoPick(){
    if(!trip()){ alert('Ouvre d’abord un voyage.'); return; }
    openSheet(`<h2>✨ Ranger mes photos</h2><div class="v-sum-small" style="margin-bottom:10px">Choisis toutes les photos du voyage d’un coup. L’appli lit leur date et leur lieu, les groupe par jour et par endroit, et te propose les souvenirs déjà prêts.</div>
      <label class="v-btn cv-addph" style="display:block;text-align:center">📷 Choisir les photos<input type="file" accept="image/heic,image/heif,image/jpeg,image/png,image/webp" multiple onchange="CV.autoPhotoRead(this)"></label>
      <div class="v-sum-small" id="ap-msg" style="margin-top:8px"></div>
      <div class="v-actions"><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  async function autoPhotoRead(input){
    const files = [...(input.files||[])].filter(f=>/^image\//.test(f.type) || /\.(jpe?g|heic|heif|png|webp)$/i.test(f.name)); if(!files.length) return;
    const msg = document.getElementById('ap-msg'); const say = s => { if(msg) msg.textContent = s; };
    say(`Lecture des dates et lieux… 0/${files.length}`); await new Promise(r => setTimeout(r, 30));
    const info = [];
    for(let i=0;i<files.length;i++){ if(i%10===0) say(`Lecture des dates et lieux… ${i}/${files.length}`); info.push(Object.assign({f:files[i]}, await exifOf(files[i]))); }
    info.sort((a,b)=>(a.date + (a.time||'')).localeCompare(b.date + (b.time||'')));
    const groups = [];
    info.forEach(p => {
      const g = groups[groups.length-1];
      const near = g && g.date === p.date && (!p.lat || !g.lat || hav(g, p) < 40);
      if(near){ g.ph.push(p); if(p.lat && !g.lat){ g.lat = p.lat; g.lng = p.lng; } }
      else groups.push({date:p.date, lat:p.lat, lng:p.lng, ph:[p], titre:'', lieu:'', pays:'', cc:''});
    });
    // lieux : un seul appel par groupe (1 par seconde, politesse envers le service gratuit)
    const cache = {}; let n = 0;
    for(const g of groups){
      n++; say(`Recherche des lieux… ${n}/${groups.length}`);
      if(!g.lat) continue;
      const key = g.lat.toFixed(1) + ',' + g.lng.toFixed(1);
      if(!cache[key]){
        try { const j = await (await fetch(`${GEO}reverse?format=jsonv2&zoom=10&accept-language=${((window.I18N && I18N.lang) || 'fr')}&lat=${g.lat}&lon=${g.lng}`)).json();
          const a = (j && j.address) || {}; cache[key] = {city: a.city || a.town || a.village || a.municipality || a.county || '', pays: a.country || '', cc: (a.country_code || '').toUpperCase()}; } catch(e){ cache[key] = {}; }
        await new Promise(r => setTimeout(r, 1100));
      }
      Object.assign(g, {lieu: [cache[key].city, cache[key].pays].filter(Boolean).join(', '), pays: cache[key].pays || '', cc: cache[key].cc || ''}); g.titre = g.city = cache[key].city || '';
    }
    groups.forEach(g => { if(!g.titre) g.titre = TT('Journée du ' + fdate(g.date)); });
    const t = trip(); AP = {groups, t};
    apRender();
  }
  function apRender(){
    const t = AP.t, out = d => t.debut && (d < t.debut || (t.fin && d > t.fin)), nAll = AP.groups.reduce((s,g)=>s+g.ph.length,0);
    openSheet(`<h2>✨ ${AP.groups.length} souvenir${AP.groups.length>1?'s':''} proposé${AP.groups.length>1?'s':''}</h2>
      <div class="v-sum-small" style="margin-bottom:8px">${nAll} photo(s) rangées par jour et par lieu. Corrige les titres si tu veux, décoche ce que tu ne veux pas.</div>
      <div class="ap-list">${AP.groups.map((g,i)=>`<div class="ap-row"><label class="cv-checkline"><input type="checkbox" id="ap-${i}" checked></label>
        <div class="ap-b"><div class="ap-d"><span>${fdate(g.date)}</span> · <span>${g.ph.length} photo${g.ph.length>1?'s':''}</span>${g.cc ? ' · ' + flag(g.cc) : ''}${out(g.date) ? ' · <span class="ap-w">hors dates du voyage</span>' : ''}${g.ph.some(p=>p.guess) ? ' · <span>date estimée</span>' : ''}</div>
        <input class="v-in" id="ap-t-${i}" value="${esc(g.titre)}">
        <div class="ap-th">${g.ph.slice(0,5).map(p=>`<img src="${URL.createObjectURL(p.f)}" alt="" loading="lazy">`).join('')}</div></div></div>`).join('')}</div>
      <div class="v-sum-small" id="ap-msg2"></div>
      <div class="v-actions"><button type="button" class="v-btn" id="ap-go" onclick="CV.autoPhotoGo()">✅ Créer les souvenirs</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  async function autoPhotoGo(){
    if(!AP) return; const btn = document.getElementById('ap-go'), msg = document.getElementById('ap-msg2'); if(btn) btn.disabled = true;
    const total = AP.groups.reduce((s,g,i)=> s + ((document.getElementById('ap-' + i)||{}).checked ? g.ph.length : 0), 0); let done = 0, bad = 0; const made = [];
    for(let i=0;i<AP.groups.length;i++){
      const g = AP.groups[i]; if(!(document.getElementById('ap-' + i)||{}).checked) continue;
      const ids = [];
      for(const p of g.ph){ done++; if(msg) msg.textContent = `Préparation des photos… ${done}/${total}`;
        try { const pid = 'ph' + uid() + done; await storePhoto(p.f, pid); ids.push(pid); if(p.lat != null) (g.pts = g.pts || []).push([p.lat, p.lng, exTs(p), pid]); } catch(e){ bad++; } }
      if(!ids.length) continue;
      const s = {id:'sv' + uid() + i, type:'souv', trip:AP.t.id, date:g.date, titre:(document.getElementById('ap-t-' + i).value || '').trim() || g.titre, lieu: g.pays ? (g.city || '') : g.lieu, texte:'', photos:ids};
      if(g.lat){ s.lat = g.lat; s.lng = g.lng; s.pays = g.pays; s.cc = g.cc; } if(g.pts) s.pts = g.pts;
      made.push(s);
    }
    AP = null;
    if(made.length) putMany(made, '✨ ' + made.length + ' souvenir(s) créé(s)');
    closeSheet(true); render(); uploadQueue();
    if(bad) setTimeout(() => alert(bad + ' photo(s) n’ont pas pu être lues (format non pris en charge ?).'), 300);
  }

  /* ---------- 3) Le film du voyage ---------- */
  const filmEase = x => x < .5 ? 2*x*x : 1 - Math.pow(-2*x + 2, 2) / 2;
  const FW = 720, FH = 1280;
  let FM = null;
  /* ══════════ ✨ Récap story : une image verticale du voyage à partager (format story 1080 × 1920) ══════════ */
  let wrBlob = null, wrD = null, wrBm = {}, wrMapC = {}, wrTm = null, wrN = 0, wrOpen = false, wrUrl = '';
  const WR_TH = {
    violet:{o:'20,8,45', a:'#1a0b3d', b:'#6b2fa0', acc:'#ffd28a', ln:'#ffe2a8', pin:'#ff3b6b'},
    nuit:{o:'3,8,22', a:'#020617', b:'#1e3a8a', acc:'#93c5fd', ln:'#e0f0ff', pin:'#3b82f6'},
    ocean:{o:'2,36,50', a:'#042f3e', b:'#0e7490', acc:'#5eead4', ln:'#ccfbf1', pin:'#0d9488'},
    sunset:{o:'56,12,28', a:'#4a0d24', b:'#ea580c', acc:'#fdba74', ln:'#ffedd5', pin:'#f43f5e'},
    foret:{o:'6,30,18', a:'#052e16', b:'#15803d', acc:'#bef264', ln:'#ecfccb', pin:'#16a34a'}};
  const WR_THN = {violet:'Violet', nuit:'Nuit', ocean:'Océan', sunset:'Coucher de soleil', foret:'Forêt'};
  const WR_ST = [['days','🗓️','jours','un jour'], ['dist','🛣️','km','km'], ['ccs','🌍','pays','un pays'], ['nph','📸','photos','une photo'], ['nights','🛏️','nuits','une nuit'], ['steps','📍','étapes','une étape']];
  const WR_STN = {days:'Jours', dist:'Kilomètres', ccs:'Pays', nph:'Photos', nights:'Nuits', steps:'Étapes'};
  const WR_MAP = {
    dark:['dark', 16, '© Esri · © OpenStreetMap'], light:['light', 16, '© Esri · © OpenStreetMap'],
    plan:['street', 18, '© Esri · © OpenStreetMap'], sat:['sat', 17, '© Esri, Maxar']};
  function wrOpt(){
    const t = trip() || {}, st0 = {days:1, dist:1, ccs:1, nph:1, nights:1, steps:1};
    const o = Object.assign({map:'dark', frame:'all', theme:'violet', bg:'', title:'', sub:'', flags:1, strip:1}, (M.wrOpt || {})[t.id] || {});
    o.st = Object.assign({}, st0, o.st || {}); return o;
  }
  function wrSaveO(o){ const t = trip(); if(!t) return; M.wrOpt = Object.assign({}, M.wrOpt || {}, {[t.id]: o}); try { persist(); } catch(e){} }
  async function wrPhoto(id){
    if(!id) return null; if(wrBm[id] !== undefined) return wrBm[id];
    try { const b = await photoBlob(id); wrBm[id] = b ? await decodeImg(b) : null; } catch(e){ wrBm[id] = null; }
    return wrBm[id];
  }
  function wrCands(){ const t = trip(), ids = (wrD ? wrD.pick : []).map(p=>p.id), cov = t && coverId(t); if(cov && !ids.includes(cov)) ids.unshift(cov); return ids; }
  // une vraie carte (tuiles libres, sans clé) cadrée sur le trajet, à la taille exacte du cadre de l’image
  async function wrMap(P, pw, ph, style){
    const key = style + '|' + pw + 'x' + ph + '|' + P.map(p=>p.lat.toFixed(2) + ',' + p.lng.toFixed(2)).join(';');
    if(wrMapC[key] !== undefined) return wrMapC[key];
    const S = WR_MAP[style] || WR_MAP.dark, K = 1080 / FW, W = Math.round(pw * K), H = Math.round(ph * K), padX = 70 * K, padY = 64 * K;
    const W2 = z => 256 * Math.pow(2, z), wx = (lng, z) => (lng + 180) / 360 * W2(z);
    const wy = (lat, z) => { const r = Math.max(-85, Math.min(85, lat)) * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * W2(z); };
    let z = Math.min(13, S[1]); for(; z > 1; z--){ const xs = P.map(p=>wx(p.lng, z)), ys = P.map(p=>wy(p.lat, z)); if(Math.max(...xs) - Math.min(...xs) <= W - 2 * padX && Math.max(...ys) - Math.min(...ys) <= H - 2 * padY) break; }
    const xs = P.map(p=>wx(p.lng, z)), ys = P.map(p=>wy(p.lat, z));
    const left = (Math.max(...xs) + Math.min(...xs)) / 2 - W / 2, top = (Math.max(...ys) + Math.min(...ys)) / 2 - H / 2, n = Math.pow(2, z), jobs = [];
    const SRC = [S[0], WR_MAP.plan[0]];
    const get = async (x, y) => { for(let k = 0; k < SRC.length; k++){ const bmp = await esriTile(SRC[k], z, ((x % n) + n) % n, y); if(bmp) return {bmp, alt: k > 0}; } return null; };
    for(let ty = Math.floor(top / 256); ty <= Math.floor((top + H) / 256); ty++){ if(ty < 0 || ty >= n) continue;
      for(let tx = Math.floor(left / 256); tx <= Math.floor((left + W) / 256); tx++) jobs.push(get(tx, ty).then(t => t && Object.assign(t, {dx: tx * 256 - left, dy: ty * 256 - top}))); }
    const tiles = (await Promise.race([Promise.all(jobs), new Promise(r => setTimeout(() => r(null), 9000))])) || [];
    const ok = tiles.filter(Boolean);
    if(!jobs.length || ok.length < jobs.length * 0.6){ ok.forEach(t=>{ try { t.bmp.close(); } catch(e){} }); return (wrMapC[key] = null); }
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    c.fillStyle = style === 'light' || style === 'plan' ? '#e8eaee' : '#0b1026'; c.fillRect(0, 0, W, H);
    ok.forEach(t => { c.drawImage(t.bmp, t.dx, t.dy, 256, 256); try { t.bmp.close(); } catch(e){} });
    const alt = ok.some(t=>t.alt);
    return (wrMapC[key] = {img: cv, X: lng => (wx(lng, z) - left) / K, Y: lat => (wy(lat, z) - top) / K, attr: alt ? '© Esri · © OpenStreetMap' : S[2], light: style === 'light' || style === 'plan' || (alt && style !== 'sat')});
  }
  async function wrapped(){
    const t = trip(); if(!t){ alert('Ouvre d’abord un voyage.'); return; }
    Object.values(wrBm).forEach(b=>{ try { b && b.close && b.close(); } catch(e){} }); wrBm = {}; wrMapC = {}; wrBlob = null; wrD = null; wrPk = null;
    openSheet(`<h2>✨ Ton récap à partager</h2><div class="v-sum-small" style="margin-bottom:8px">Au format story : Instagram, WhatsApp, Facebook… Tes proches voient ton voyage en un coup d’œil.</div>
      <div class="wr-box"><img class="wr-img" id="wr-img" alt=""><div class="wr-wait" id="wr-wait">✨ Création de ton récap…</div></div>
      <div id="wr-opt"></div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.wrappedShare()">📤 Partager</button><button type="button" class="v-btn sec" onclick="CV.wrappedSave()">💾 Enregistrer</button></div>`);
    wrD = await filmData();
    wrOptDraw(); await wrRender();
  }
  let wrPk = null;   // sélecteur de photo ouvert : {slot:'bg' | 0 | 1 | 2, step, n}
  function wrStrip(o, bgId){
    const sp = (o.sp || []).slice(0, 3), used = new Set([bgId, ...sp].filter(Boolean)), auto = wrCands().filter(x=>!used.has(x));
    return [0, 1, 2].map(k => sp[k] || auto.shift() || null);
  }
  function wrPickHTML(){
    const S = souvs().filter(s=>(s.photos || []).length), st = wrPk.step;
    const L = st ? ((S.find(s=>s.id === st) || {}).photos || []) : S.flatMap(s=>s.photos), shown = L.slice(0, wrPk.n), tot = S.reduce((n, s)=>n + s.photos.length, 0);
    return `<div class="wr-pick" id="wr-pick"><div class="wr-pk-h"><b>${wrPk.slot === 'bg' ? 'Choisis la photo de fond' : `Choisis la photo ${wrPk.slot + 1} du bas`}</b><button type="button" onclick="CV.wrPickX()" aria-label="Fermer">✕</button></div>
      <select class="cp-in" onchange="CV.wrPickStep(this.value)"><option value="">Toutes les étapes · ${tot}</option>${S.map(s=>`<option value="${esc(s.id)}"${s.id === st ? ' selected' : ''} data-notr>${esc(((s.date ? fdate(s.date) + ' · ' : '') + (s.titre || s.lieu || '')).slice(0, 60))} (${s.photos.length})</option>`).join('')}</select>
      <div class="wr-grid">${shown.map(id=>`<button type="button" onclick="CV.wrPickSet('${esc(id)}')"><img data-ph="${esc(id)}" alt="" loading="lazy"></button>`).join('')}</div>
      ${L.length > shown.length ? `<button type="button" class="cp-ch wr-pk-more" onclick="CV.wrPickMore()">Plus de photos (${L.length - shown.length})</button>` : ''}</div>`;
  }
  function wrPick(slot){ wrPk = {slot, step:'', n:48}; wrOpen = true; wrOptDraw(); setTimeout(()=>{ const p = document.getElementById('wr-pick'); if(p) p.scrollIntoView({block:'start', behavior:'smooth'}); }, 60); }
  function wrPickX(){ wrPk = null; wrOptDraw(); }
  function wrPickStep(v){ if(!wrPk) return; wrPk.step = v; wrPk.n = 48; wrOptDraw(); }
  function wrPickMore(){ if(!wrPk) return; wrPk.n += 48; wrOptDraw(); }
  function wrPickSet(id){
    if(!wrPk) return; const o = wrOpt();
    if(wrPk.slot === 'bg') o.bg = id; else { o.sp = (o.sp || []).slice(); while(o.sp.length < 3) o.sp.push(null); o.sp[wrPk.slot] = id; o.strip = 1; }
    wrSaveO(o); wrPk = null; wrOptDraw(); wrLater(100);
    const b = document.querySelector('.wr-box'); if(b) b.scrollIntoView({block:'start', behavior:'smooth'});
  }
  function wrSlotX(k){ const o = wrOpt(); o.sp = (o.sp || []).slice(); o.sp[k] = null; wrSaveO(o); wrOptDraw(); wrLater(100); }
  function wrOptDraw(){
    const el = document.getElementById('wr-opt'), t = trip(); if(!el || !t || !wrD) return;
    const o = wrOpt(), cands = wrCands(), bgId = o.bg === 'none' ? 'none' : (o.bg || cands[0] || 'none');
    if(bgId !== 'none' && !cands.includes(bgId)) cands.unshift(bgId);
    const strip = wrStrip(o, bgId === 'none' ? null : bgId);
    const ch = (k, v, lbl) => `<button type="button" class="cp-ch${String(o[k]) === String(v) ? ' on' : ''}" data-k="${k}" data-v="${v}" onclick="CV.wrSet(this)">${lbl}</button>`;
    const tg = (k, on, lbl) => `<button type="button" class="cp-ch cp-tg${on ? ' on' : ''}" data-k="${k}" onclick="CV.wrSet(this)">${on ? '✓ ' : ''}${lbl}</button>`;
    const zones = wrD.pts.length >= 2 ? filmZones(wrD.pts).filter(z=>z.length >= 2).length : 0;
    el.innerHTML = `<details class="wr-opt"${wrOpen ? ' open' : ''} ontoggle="CV.wrTog(this.open)"><summary>⚙️ Personnaliser</summary>
      <label class="cp-l">Titre</label><input class="cp-in" data-k="title" maxlength="60" value="${esc(o.title)}" placeholder="${esc(t.titre || '')}" oninput="CV.wrSet(this)">
      <label class="cp-l">Sous-titre</label><input class="cp-in" data-k="sub" maxlength="70" value="${esc(o.sub)}" placeholder="${esc(t.debut ? tripDatesLong(t) : '')}" oninput="CV.wrSet(this)">
      <label class="cp-l">Photo de fond</label><div class="wr-phs"><button type="button" class="wr-ph wr-none${bgId === 'none' ? ' on' : ''}" data-k="bg" data-v="none" onclick="CV.wrSet(this)">🎨<small>Couleurs</small></button><button type="button" class="wr-ph wr-more" onclick="CV.wrPick('bg')">＋<small>Toutes</small></button>${cands.map(id=>`<button type="button" class="wr-ph${bgId === id ? ' on' : ''}" data-k="bg" data-v="${esc(id)}" onclick="CV.wrSet(this)"><img data-ph="${esc(id)}" alt=""></button>`).join('')}</div>
      <label class="cp-l">Photos du bas</label><div class="wr-slots${o.strip ? '' : ' off'}">${strip.map((id, k)=>`<div class="wr-slot"><button type="button" class="wr-ph" onclick="CV.wrPick(${k})">${id ? `<img data-ph="${esc(id)}" alt="">` : '＋'}<small>Changer</small></button>${(o.sp || [])[k] ? `<button type="button" class="wr-sx" onclick="CV.wrSlotX(${k})" aria-label="Automatique">✕</button>` : ''}</div>`).join('')}</div>
      ${wrPk ? wrPickHTML() : ''}
      <label class="cp-l">Couleurs</label><div class="cp-row">${Object.entries(WR_TH).map(([k, h])=>`<button type="button" class="cp-ch cp-th${o.theme === k ? ' on' : ''}" data-k="theme" data-v="${k}" onclick="CV.wrSet(this)"><i style="background:linear-gradient(135deg,${h.a},${h.b})"></i>${WR_THN[k]}</button>`).join('')}</div>
      <label class="cp-l">Carte</label><div class="cp-row">${ch('map', 'dark', '🌑 Sombre')}${ch('map', 'plan', '🗺️ Plan')}${ch('map', 'sat', '🛰️ Satellite')}${ch('map', 'light', '☁️ Claire')}${ch('map', 'none', '✏️ Trajet seul')}</div>
      ${zones > 1 ? `<label class="cp-l">Cadrage de la carte</label><div class="cp-row">${ch('frame', 'all', '🌍 Tout le voyage')}${ch('frame', 'main', '🎯 La destination')}</div>` : ''}
      <label class="cp-l">Chiffres</label><div class="cp-row">${WR_ST.map(s=>tg('st.' + s[0], o.st[s[0]], WR_STN[s[0]])).join('')}</div>
      <label class="cp-l">Autour</label><div class="cp-row">${tg('flags', o.flags, 'Drapeaux')}${tg('strip', o.strip, 'Photos en bas')}</div>
      <button type="button" class="cp-reset" onclick="CV.wrReset()">↺ Réglages d’origine</button></details>`;
    hydrate();
  }
  function wrLater(ms){ clearTimeout(wrTm); const w8 = document.getElementById('wr-wait'); if(w8) w8.hidden = false; wrTm = setTimeout(wrRender, ms); }
  function wrSet(el){
    const o = wrOpt(), k = el.dataset.k, v = el.dataset.v;
    if(el.tagName === 'INPUT'){ o[k] = el.value.trim(); wrSaveO(o); wrLater(700); return; }
    if(k.startsWith('st.')){ const s = k.slice(3); o.st[s] = o.st[s] ? 0 : 1; }
    else if(v === undefined) o[k] = o[k] ? 0 : 1;
    else o[k] = v;
    wrSaveO(o); wrOptDraw(); wrLater(150);
  }
  function wrTog(on){ wrOpen = !!on; }
  function wrReset(){ const t = trip(); if(!t) return; M.wrOpt = Object.assign({}, M.wrOpt || {}); delete M.wrOpt[t.id]; try { persist(); } catch(e){} wrOptDraw(); wrLater(50); }
  async function wrRender(){
    const t = trip(), img = document.getElementById('wr-img'); if(!t || !wrD || !img) return;
    const my = ++wrN, D = wrD, o = wrOpt(), th = WR_TH[o.theme] || WR_TH.violet;
    const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1920;
    const c = cv.getContext('2d'); c.scale(1080 / FW, 1920 / FH); c.textAlign = 'center';
    const cands = wrCands(), bgId = o.bg === 'none' ? null : (o.bg || cands[0] || null);
    const bg = await wrPhoto(bgId);
    const stripB = []; if(o.strip) for(const id of wrStrip(o, bgId)){ if(!id) continue; const b = await wrPhoto(id); if(b) stripB.push(b); }
    if(my !== wrN) return;
    const rr = (x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };
    // fond : la photo choisie, voilée aux couleurs du thème (ou un dégradé)
    fBg(c, th.a, th.b);
    if(bg){ fCover(c, bg, 0, 0, FW, FH, 1.08, 0, 0); const g = c.createLinearGradient(0, 0, 0, FH); g.addColorStop(0, `rgba(${th.o},.74)`); g.addColorStop(.45, `rgba(${th.o},.56)`); g.addColorStop(1, `rgba(${th.o},.93)`); c.fillStyle = g; c.fillRect(0, 0, FW, FH); }
    // titre
    c.fillStyle = 'rgba(255,255,255,.85)'; fz(c, 22, 800); c.fillText(TT('✈  MON VOYAGE'), FW/2, 92);
    c.fillStyle = '#fff'; fz(c, 52, 800); const tl = fLines(c, o.title || TT(String(t.titre || '')), FW - 90).slice(0, 2); tl.forEach((l, i)=>c.fillText(l, FW/2, 160 + i * 58));
    let y = 160 + tl.length * 58; c.fillStyle = 'rgba(255,255,255,.82)'; fz(c, 24, 500);
    const sub = o.sub || (t.debut ? tripDatesLong(t) : ''); if(sub) c.fillText(sub, FW/2, y); y += 34;
    // place restante pour la carte, selon ce qui est affiché en dessous
    const T = WR_ST.filter(s=>o.st[s[0]]).map(s=>{ const v = s[0] === 'dist' ? Math.round(D.dist) : s[0] === 'ccs' ? D.ccs.length : s[0] === 'steps' ? D.pts.length : D[s[0]] || 0;
      return [s[1], v, filmUnit(s[2], v) || (v === 1 ? TT(s[3]).replace(/^\S+\s+/, '') : TT(s[2]))]; }).filter(x => x[1] > 0);
    const cw = (FW - 80 - 2 * 14) / 3, chh = 100, statsH = T.length ? Math.ceil(T.length / 3) * (chh + 14) + 6 : 0;
    const flagsH = o.flags && D.ccs.length ? 52 : 0, stripH = stripB.length ? 184 : 0;
    const px = 40, py = y, pw = FW - 80, ph = Math.max(250, Math.min(780, FH - 112 - y - 26 - statsH - flagsH - stripH));
    // la carte et le trajet
    let F = D.pts; if(o.frame === 'main' && F.length >= 2){ const zs = filmZones(F).filter(z=>z.length >= 2).sort((a, b)=>b.length - a.length); if(zs[0]) F = zs[0]; }
    const m = o.map !== 'none' && F.length >= 2 ? await wrMap(F, pw, ph, o.map).catch(()=>null) : null;
    if(my !== wrN) return;
    c.save(); rr(px, py, pw, ph, 30); c.fillStyle = 'rgba(255,255,255,.08)'; c.fill(); c.clip();
    const P = D.pts;
    if(P.length >= 2){
      let X, Y;
      if(m){ c.drawImage(m.img, px, py, pw, ph); if(!m.light){ c.fillStyle = `rgba(${th.o},.18)`; c.fillRect(px, py, pw, ph); }
        X = v => px + m.X(v); Y = v => py + m.Y(v); }
      else {
        const my2 = v => Math.log(Math.tan(Math.PI/4 + Math.max(-80, Math.min(80, v)) * Math.PI/360));
        const lo = F.map(p=>p.lng), la = F.map(p=>my2(p.lat)), x0 = Math.min(...lo), x1 = Math.max(...lo), y0 = Math.min(...la), y1 = Math.max(...la);
        const sx = (pw - 90) / ((x1 - x0) * Math.PI/180 || 1e-3), sy = (ph - 90) / ((y1 - y0) || 1e-3), s = Math.min(sx, sy);
        const ox = px + (pw - (x1 - x0) * Math.PI/180 * s) / 2, oy = py + (ph - (y1 - y0) * s) / 2;
        X = v => ox + (v - x0) * Math.PI/180 * s; Y = v => oy + (y1 - my2(v)) * s;
      }
      c.lineCap = 'round'; c.lineJoin = 'round';
      const path = () => { c.beginPath(); P.forEach((p, i)=> i ? c.lineTo(X(p.lng), Y(p.lat)) : c.moveTo(X(p.lng), Y(p.lat))); };
      if(m){ path(); c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 10; c.stroke(); }
      path(); c.shadowColor = th.acc; c.shadowBlur = m && m.light ? 0 : 22; c.strokeStyle = m && m.light ? th.pin : th.ln; c.lineWidth = 6; c.stroke(); c.shadowBlur = 0;
      P.forEach((p, i)=>{ const end = i === 0 || i === P.length - 1; c.beginPath(); c.arc(X(p.lng), Y(p.lat), end ? 11 : 6, 0, Math.PI * 2); c.fillStyle = end ? th.pin : '#fff'; c.fill(); c.lineWidth = 3; c.strokeStyle = end ? '#fff' : th.pin; c.stroke(); });
      const lbl = (p, up) => { if(!p.name) return; fz(c, 20, 800); const tx = TT(p.name), wd = c.measureText(tx).width, lx = Math.max(px + wd/2 + 16, Math.min(px + pw - wd/2 - 16, X(p.lng))), ly = Math.max(py + 30, Math.min(py + ph - 14, Y(p.lat) + (up ? -18 : 34)));
        c.fillStyle = 'rgba(0,0,0,.5)'; rr(lx - wd/2 - 10, ly - 21, wd + 20, 30, 15); c.fill(); c.fillStyle = '#fff'; c.fillText(tx, lx, ly); };
      const first = F.find(p=>p.name) || F[0], last = [...F].reverse().find(p=>p.name);
      lbl(first, true); if(last && last !== first && last.name !== first.name) lbl(last, false);
      if(m){ c.textAlign = 'right'; fz(c, 10, 600); c.fillStyle = m.light ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.55)'; c.fillText(m.attr, px + pw - 14, py + ph - 10); c.textAlign = 'center'; }
    } else if(bg || stripB[0]) fCover(c, stripB[0] || bg, px, py, pw, ph, 1.05, 0, 0);
    else { fz(c, 120, 400); c.fillStyle = '#fff'; c.fillText('🌍', FW/2, py + ph/2 + 40); }
    c.restore(); y = py + ph + 26;
    // les chiffres
    T.forEach((x, i)=>{ const inRow = Math.min(3, T.length - Math.floor(i / 3) * 3), cx = 40 + (3 - inRow) * (cw + 14) / 2 + (i % 3) * (cw + 14), cy = y + Math.floor(i / 3) * (chh + 14);
      rr(cx, cy, cw, chh, 22); c.fillStyle = 'rgba(255,255,255,.12)'; c.fill();
      fz(c, 24, 400); c.fillStyle = '#fff'; c.fillText(x[0], cx + cw/2, cy + 30);
      fz(c, 36, 800); c.fillStyle = th.acc; c.fillText(Math.round(x[1]).toLocaleString(NL()), cx + cw/2, cy + 68);
      fz(c, 17, 600); c.fillStyle = 'rgba(255,255,255,.78)'; c.fillText(x[2], cx + cw/2, cy + 90); });
    y += statsH;
    if(flagsH){ fz(c, 34, 400); c.fillStyle = '#fff'; c.fillText(D.ccs.slice(0, 8).map(flag).join(' '), FW/2, y + 30); y += flagsH; }
    // les photos du bas
    if(stripB.length){ const sw = (FW - 80 - (stripB.length - 1) * 12) / stripB.length, sh = Math.min(170, FH - 108 - y);
      if(sh > 60) stripB.forEach((b, i)=>{ const sx2 = 40 + i * (sw + 12); c.save(); rr(sx2, y, sw, sh, 18); c.clip(); fCover(c, b, sx2, y, sw, sh, 1, 0, 0); c.restore(); }); }
    // signature
    c.fillStyle = 'rgba(255,255,255,.9)'; fz(c, 22, 800); c.fillText('Vezoria', FW/2, FH - 52);
    c.fillStyle = 'rgba(255,255,255,.65)'; fz(c, 16, 500); c.fillText(TT('Mon carnet de voyage'), FW/2, FH - 28);
    const blob = await new Promise(r=>cv.toBlob(r, 'image/jpeg', .9));
    if(my !== wrN) return;
    if(!blob){ alert('Impossible de créer l’image sur ce téléphone.'); return; }
    wrBlob = blob; if(wrUrl) URL.revokeObjectURL(wrUrl); wrUrl = URL.createObjectURL(blob);
    const im = document.getElementById('wr-img'); if(im) im.src = wrUrl;
    const w8 = document.getElementById('wr-wait'); if(w8) w8.hidden = true;
  }
  const wrName = () => 'recap-' + String((trip() || {}).titre || 'voyage').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.jpg';
  async function wrappedShare(){
    if(!wrBlob) return; const file = new File([wrBlob], wrName(), {type:'image/jpeg'});
    try { if(navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file]}); return; } } catch(e){ if(e && e.name === 'AbortError') return; }
    wrappedSave();
  }
  function wrappedSave(){ if(!wrBlob) return; const a = document.createElement('a'); a.href = URL.createObjectURL(wrBlob); a.download = wrName(); document.body.appendChild(a); a.click(); setTimeout(()=>{ a.remove(); URL.revokeObjectURL(a.href); }, 5000); }
  async function filmData(){
    const t = trip(), sv = souvs(), all = items();
    const geo = [...geoSouvs(M.trip), ...all.filter(i=>i.cat==='hotel' && i.lat != null && i.date).map(i=>({lat:i.lat, lng:i.lng, date:i.date, titre:i.titre, lieu:i.titre}))]
      .filter(p=>isFinite(+p.lat) && isFinite(+p.lng)).map(p=>({lat:+p.lat, lng:+p.lng, date:p.date||'', name:String(p.lieu || p.titre || '').split(',')[0].trim(), cc:p.cc||''})).sort((a,b)=>a.date.localeCompare(b.date));
    const pts = []; geo.forEach(p => { const l = pts[pts.length-1]; if(!l || hav(l, p) > 8) pts.push(Object.assign({}, p, {name: l && l.name === p.name ? '' : p.name})); });
    let dist = 0; for(let i=1;i<pts.length;i++) dist += hav(pts[i-1], pts[i]);
    const ds = dayList(), days = ds.length || 1, nn = all.filter(i=>i.cat==='hotel').reduce((s,i)=>s + nights(i.date, i.dateFin), 0);
    const ccs = [...new Set(geo.map(p=>p.cc).filter(Boolean))];
    const tot = all.reduce((s,i)=>s + totalOf(i), 0), v = tv(), byCat = {}; all.forEach(i=>{ byCat[i.cat] = (byCat[i.cat]||0) + totalOf(i); });
    const phAll = sv.flatMap(s => (s.photos||[]).map(p => ({id:p, cap:s.titre || s.lieu || '', date:s.date})));
    const pick = []; const N = Math.min(12, phAll.length); for(let i=0;i<N;i++) pick.push(phAll[Math.floor(i * phAll.length / N)]);
    return {t, pts, dist, days, nights:nn, ccs, tot, per: v.length ? tot / v.length : tot, perDay: tot / days, cats:Object.entries(byCat).filter(([,x])=>x>0).sort((a,b)=>b[1]-a[1]).slice(0,4), nph: phAll.length, pick, cur: CS()};
  }
  // Fond de carte du film : vraies tuiles (sombres), dessinées une fois dans une image hors écran
  async function filmTileMap(P, maxZ){
    if(P.length < 2) return null;
    const W2 = z => 256 * Math.pow(2, z), wx = (lng, z) => (lng + 180) / 360 * W2(z);
    const wy = (lat, z) => { const r = Math.max(-85, Math.min(85, lat)) * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * W2(z); };
    let z = maxZ || 12; for(; z > 1; z--){ const xs = P.map(p=>wx(p.lng, z)), ys = P.map(p=>wy(p.lat, z)); if(Math.max(...xs) - Math.min(...xs) <= FW - 180 && Math.max(...ys) - Math.min(...ys) <= 640) break; }
    const xs = P.map(p=>wx(p.lng, z)), ys = P.map(p=>wy(p.lat, z));
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2, left = cx - FW/2, top = cy - 700;
    const n = Math.pow(2, z), jobs = [];
    // fond sombre Esri (gratuit, sans clé), sinon le plan Esri assombri
    const SRC = ['dark', 'street'];
    const get = async (x, y) => { for(let k=0;k<SRC.length;k++){ const bmp = await esriTile(SRC[k], z, ((x % n) + n) % n, y); if(bmp) return {bmp, dark: k === 0}; } return null; };
    for(let ty = Math.floor(top/256); ty <= Math.floor((top + FH)/256); ty++){ if(ty < 0 || ty >= n) continue;
      for(let tx = Math.floor(left/256); tx <= Math.floor((left + FW)/256); tx++) jobs.push(get(tx, ty).then(t => t && Object.assign(t, {dx: tx*256 - left, dy: ty*256 - top}))); }
    const tiles = (await Promise.race([Promise.all(jobs), new Promise(r => setTimeout(() => r(null), 9000))])) || [];
    const ok = tiles.filter(Boolean); if(ok.length < jobs.length * 0.6) return null;
    const cv = document.createElement('canvas'); cv.width = FW; cv.height = FH; const c = cv.getContext('2d');
    c.fillStyle = '#0b1026'; c.fillRect(0, 0, FW, FH); ok.forEach(t => { c.drawImage(t.bmp, t.dx, t.dy, 256, 256); try { t.bmp.close(); } catch(e){} });
    if(!ok[0].dark){ c.globalCompositeOperation = 'multiply'; c.fillStyle = '#3b3a7a'; c.fillRect(0, 0, FW, FH); c.globalCompositeOperation = 'source-over'; }
    const g = c.createLinearGradient(0, 0, 0, FH); g.addColorStop(0, 'rgba(8,10,40,.85)'); g.addColorStop(.22, 'rgba(8,10,40,.15)'); g.addColorStop(.8, 'rgba(8,10,40,.15)'); g.addColorStop(1, 'rgba(8,10,40,.8)'); c.fillStyle = g; c.fillRect(0, 0, FW, FH);
    return {img: cv, X: lng => wx(lng, z) - left, Y: lat => wy(lat, z) - top, attr: '© Esri · © OpenStreetMap'};
  }
  // Régions du voyage (ex. Bretagne → USA) : une région = des étapes reliées par moins de 3 500 km (un océan les sépare).
  // Si le voyage couvre plusieurs régions éloignées, le film montre d’abord la vue d’ensemble, puis zoome sur chacune.
  function filmZones(P){
    const zs = []; let cur = null;
    P.forEach(p=>{ const z = zs.find(z=>z.some(q=>hav(q, p) < 3500)); if(z){ z.push(p); cur = z; } else { cur = [p]; zs.push(cur); } });
    return zs;
  }
  async function filmMapPrep(D){
    if(D.pts.length < 2) return;
    const zs = filmZones(D.pts);
    D.zones = [];
    if(zs.length > 1){
      const jobs = zs.filter(z=>z.length >= 2).sort((a,b)=>b.length - a.length).slice(0, 3).map(async z=>{
        const P = z.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||'')), m = await filmTileMap(P, 11).catch(()=>null);
        const nm = [...new Set(P.map(p=>p.name).filter(Boolean))], dist = P.reduce((s, p, i)=> i ? s + hav(P[i-1], p) : 0, 0);
        return {P, map:m, title: nm.length > 1 ? nm[0] + ' → ' + nm[nm.length-1] : (nm[0] || ''), dist, t0: P[0].date || ''};
      });
      D.zones = (await Promise.all(jobs)).filter(Boolean).sort((a,b)=>a.t0.localeCompare(b.t0));
    }
    D.map = await filmTileMap(D.pts);
  }
  async function filmOpen(){
    const t = trip(); if(!t){ alert('Ouvre d’abord un voyage.'); return; }
    filmAudioInit(); toast('🎬 Préparation du film…');
    const D = await filmData();
    D.imgs = []; await filmMapPrep(D).catch(()=>{});
    for(const p of D.pick){ try { const b = await photoBlob(p.id); if(b) D.imgs.push({bmp: await decodeImg(b), cap:p.cap, date:p.date}); } catch(e){} }
    if(!D.imgs.length && !D.pts.length){ alert('Il n’y a encore rien à raconter : ajoute des souvenirs avec des photos et des lieux.'); return; }
    D.scenes = [{k:'title', d:4}];
    if(D.pts.length >= 2) D.scenes.push({k:'map', d:(D.zones||[]).length ? 3.5 : 5.5});
    (D.zones||[]).forEach(z => D.scenes.push({k:'map', d:5, P:z.P, m:z.map, title:z.title, dist:z.dist, zoom:true}));
    D.scenes.push({k:'stats', d:5});
    if(D.imgs.length) D.scenes.push({k:'photos', d:D.imgs.length * 1.5});
    D.scenes.push({k:'end', d:3.5});
    let acc = 0; D.scenes.forEach(s => { s.t0 = acc; acc += s.d; }); D.total = acc;
    FM = {D, t0:0, pos:0, playing:true, raf:0, rec:null};
    let el = document.getElementById('cv-film'); if(el) el.remove();
    el = document.createElement('div'); el.id = 'cv-film';
    el.innerHTML = `<canvas id="cv-film-c" width="${FW}" height="${FH}"></canvas>
      <div class="fb"><button type="button" onclick="CV.filmPlay()" id="cv-film-pp" aria-label="Pause">⏸</button><button type="button" onclick="CV.filmRestart()" aria-label="Recommencer">↺</button><button type="button" id="cv-film-snd" onclick="CV.filmMute()">${M.filmMute ? '🔇' : '🔊'}</button><button type="button" id="cv-film-trk" onclick="CV.filmTrack()">🎵 ${(M.filmTrack || 0) % 3 + 1}</button><button type="button" class="fs" onclick="CV.filmSave()" id="cv-film-save">💾 Enregistrer la vidéo</button><button type="button" onclick="CV.filmClose()" aria-label="Fermer">✕</button></div>
      <div class="fm" id="cv-film-msg"></div>`;
    document.body.appendChild(el); document.body.style.overflow = 'hidden';
    filmAudioStart(); filmLoop(performance.now());
  }
  function filmClose(){ if(!FM) return; filmAudioStop(); cancelAnimationFrame(FM.raf); if(FM.rec){ try { FM.rec.stop(); } catch(e){} } (FM.D.imgs||[]).forEach(i=>{ try { i.bmp.close && i.bmp.close(); } catch(e){} }); FM = null; const el = document.getElementById('cv-film'); if(el) el.remove(); document.body.style.overflow = ''; }
  function filmPlay(){ if(!FM) return; FM.playing = !FM.playing; document.getElementById('cv-film-pp').textContent = FM.playing ? '⏸' : '▶'; if(FM.playing){ FM.last = performance.now(); if(FA){ if(FA.ac && FA.ac.state === 'suspended') FA.ac.resume(); const pr = FA.el.play(); if(pr && pr.catch) pr.catch(()=>{}); } } else if(FA) FA.el.pause(); }
  function filmRestart(){ if(!FM) return; filmAudioStart(); FM.pos = 0; FM.playing = true; FM.last = performance.now(); document.getElementById('cv-film-pp').textContent = '⏸'; }
  function filmLoop(now){
    if(!FM) return; const c = document.getElementById('cv-film-c'); if(!c) return;
    if(FM.last == null) FM.last = now;
    if(FM.playing){ FM.pos += (now - FM.last) / 1000; if(FM.pos >= FM.D.total){ if(FM.rec){ FM.pos = FM.D.total - 0.001; filmStopRec(); } else { FM.pos = FM.D.total; FM.playing = false; document.getElementById('cv-film-pp').textContent = '↺'; FM.endHold = true; filmAudioStop(); } } }
    if(FA && FM.playing && !FM.fadeOut && FM.pos > FM.D.total - 2.6){ FM.fadeOut = 1; filmVol(0, 2.4); }
    FM.last = now; filmDraw(c.getContext('2d'), FM.pos);
    FM.raf = requestAnimationFrame(filmLoop);
  }
  const fz = (c, size, w) => { c.font = `${w||700} ${size}px -apple-system, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif`; };
  // lignes d’au plus maxW ; un mot trop long (chinois, japonais… sans espaces) se coupe entre deux caractères
  function fLines(c, text, maxW){
    const out = [], fit = t => c.measureText(t).width <= maxW; let line = '';
    String(text).split(/\s+/).filter(Boolean).forEach(w => { const t = line ? line + ' ' + w : w;
      if(fit(t)){ line = t; return; }
      if(line && fit(w)){ out.push(line); line = w; return; }
      let cur = line ? line + ' ' : ''; for(const ch of Array.from(w)){ if(!cur.trim() || fit(cur + ch)) cur += ch; else { out.push(cur.trim()); cur = ch; } } line = cur; });
    if(line) out.push(line); return out;
  }
  function fWrap(c, text, x, y, maxW, lh, maxLines){
    const ls = fLines(c, text, maxW).slice(0, maxLines || 99); ls.forEach((l, i) => c.fillText(l, x, y + i*lh)); return ls.length;
  }
  function fCover(c, img, x, y, w, h, z, px, py){
    const s = Math.max(w / img.width, h / img.height) * z, dw = img.width * s, dh = img.height * s;
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.drawImage(img, x + (w - dw)/2 + px * (dw - w)/2, y + (h - dh)/2 + py * (dh - h)/2, dw, dh); c.restore();
  }
  function fBg(c, a, b){ const g = c.createLinearGradient(0, 0, FW * .4, FH); g.addColorStop(0, a || '#0f0a2e'); g.addColorStop(1, b || '#3b1a7a'); c.fillStyle = g; c.fillRect(0, 0, FW, FH); }
  function filmDraw(c, T){
    const D = FM.D; let sc = D.scenes.find(s => T >= s.t0 && T < s.t0 + s.d) || D.scenes[D.scenes.length-1];
    const p = Math.min(1, Math.max(0, (T - sc.t0) / sc.d)), fade = Math.min(1, (T - sc.t0) / .35, (sc.t0 + sc.d - T) / .35 + .0001);
    c.save(); c.clearRect(0, 0, FW, FH); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    FS[sc.k](c, p, D, sc);
    // fondu entre scènes
    if(fade < 1){ c.fillStyle = `rgba(8,5,30,${1 - Math.max(0, fade)})`; c.fillRect(0, 0, FW, FH); }
    c.restore();
  }
  // nom d’unité accordé au nombre (langues où « un jour » moins « un » ne donne pas le singulier)
  const FILM_U = {
    ru: {jours:{one:'день', few:'дня', many:'дней'}, nuits:{one:'ночь', few:'ночи', many:'ночей'}, pays:{one:'страна', few:'страны', many:'стран'}, photos:{one:'фото', few:'фото', many:'фото'}},
    ar: {jours:{one:'يوم', two:'يومان', few:'أيام', many:'يومًا', other:'يوم'}, nuits:{one:'ليلة', two:'ليلتان', few:'ليالٍ', many:'ليلة', other:'ليلة'},
         pays:{one:'بلد', two:'بلدان', few:'بلدان', many:'بلدًا', other:'بلد'}, photos:{one:'صورة', two:'صورتان', few:'صور', many:'صورة', other:'صورة'}},
    hi: {jours:{one:'दिन', other:'दिन'}, nuits:{one:'रात', other:'रातें'}, pays:{one:'देश', other:'देश'}, photos:{one:'फ़ोटो', other:'फ़ोटो'}},
    tr: {jours:{other:'gün'}, nuits:{other:'gece'}, pays:{other:'ülke'}, photos:{other:'fotoğraf'}},
    zh: {jours:{other:'天'}, nuits:{other:'晚'}, pays:{other:'个国家'}, photos:{other:'张照片'}},
    ja: {jours:{other:'日'}, nuits:{other:'泊'}, pays:{other:'か国'}, photos:{other:'枚の写真'}},
    ko: {jours:{other:'일'}, nuits:{other:'박'}, pays:{other:'개국'}, photos:{other:'장의 사진'}}};
  function filmUnit(k, n){
    const u = (FILM_U[(window.I18N && I18N.lang) || 'fr'] || {})[k]; if(!u) return '';
    let cat = 'other'; try { cat = new Intl.PluralRules((window.I18N && I18N.locale) || 'fr-FR').select(n); } catch(e){}
    return u[cat] || u.other || u.many || u.one;
  }
  const FS = {
    title(c, p, D){
      fBg(c); const im = (D.imgs[0] || {}).bmp; if(im){ fCover(c, im, 0, 0, FW, FH, 1.08 + p * .12, p * .3 - .15, 0); }
      const g = c.createLinearGradient(0, 0, 0, FH); g.addColorStop(0, 'rgba(10,6,40,.55)'); g.addColorStop(.55, 'rgba(10,6,40,.35)'); g.addColorStop(1, 'rgba(10,6,40,.85)'); c.fillStyle = g; c.fillRect(0, 0, FW, FH);
      const a = filmEase(Math.min(1, p * 2.2)); c.globalAlpha = a; c.fillStyle = '#fff'; fz(c, 30, 600); c.fillText(TT('✈  MON VOYAGE'), FW/2, 430 - (1-a) * 30);
      fz(c, 84, 800); const lines = fLines(c, TT(String(D.t.titre || '')), FW - 100);
      lines.slice(0, 3).forEach((l, i) => c.fillText(l, FW/2, 560 + i * 96 - (1-a) * 40)); c.globalAlpha = a * .9; fz(c, 34, 500);
      c.fillText(D.t.debut ? tripDatesLong(D.t) : '', FW/2, 560 + Math.min(3, lines.length) * 96 + 40); c.globalAlpha = 1;
    },
    map(c, p, D0, sc){
      const D = sc && sc.zoom ? {map:sc.m, dist:sc.dist} : D0;
      fBg(c, '#07123a', '#1d1b5e'); const P = sc && sc.P ? sc.P : D0.pts, la = P.map(x=>x.lat), lo = P.map(x=>x.lng);
      if(D.map){ const zz = 1.06 - p * .06; c.save(); c.translate(FW/2, 700); c.scale(zz, zz); c.translate(-FW/2, -700); c.drawImage(D.map.img, 0, 0); c.restore(); }
      const my = y => Math.log(Math.tan(Math.PI/4 + Math.max(-80, Math.min(80, y)) * Math.PI/360));
      let x0 = Math.min(...lo), x1 = Math.max(...lo), y0 = my(Math.min(...la)), y1 = my(Math.max(...la)); const dx0 = x1 - x0 || 1, dy0 = (y1 - y0) || .02;
      const bx = FW - 160, by = 760, sx = bx / (dx0 * Math.PI/180), sy = by / dy0, s = Math.min(sx, sy);
      const ox = (FW - dx0 * Math.PI/180 * s) / 2, oy = 330 + (by - dy0 * s) / 2;
      const zz = D.map ? 1.06 - p * .06 : 1, X = D.map ? lng => FW/2 + (D.map.X(lng) - FW/2) * zz : lng => ox + (lng - x0) * Math.PI/180 * s, Y = D.map ? lat => 700 + (D.map.Y(lat) - 700) * zz : lat => oy + (y1 - my(lat)) * s;
      if(!D.map){ c.strokeStyle = 'rgba(255,255,255,.06)'; c.lineWidth = 1; for(let i=0;i<=12;i++){ c.beginPath(); c.moveTo(i * FW/12, 0); c.lineTo(i * FW/12, FH); c.stroke(); } for(let i=0;i<=20;i++){ c.beginPath(); c.moveTo(0, i * FH/20); c.lineTo(FW, i * FH/20); c.stroke(); } }
      else { c.fillStyle = 'rgba(255,255,255,.55)'; fz(c, 16, 500); c.textAlign = 'right'; c.fillText(D.map.attr, FW - 16, FH - 16); c.textAlign = 'center'; }
      c.fillStyle = '#fff'; fz(c, 46, 800); { const tt = sc && sc.zoom ? (sc.title || '').split(' → ').map(TT).join(' → ') : TT('Ta route'); if(c.measureText(tt).width > FW - 70) fz(c, 32, 800); c.fillText(tt, FW/2, 170); } c.fillStyle = 'rgba(255,255,255,.7)'; fz(c, 28, 500); c.fillText(D.dist >= 1 ? TT('≈ ' + Math.round(D.dist).toLocaleString(NL()) + ' km parcourus') : '', FW/2, 218);
      const seg = P.length - 1, q = filmEase(Math.min(1, p / .85)) * seg, full = Math.floor(q);
      c.lineCap = 'round'; c.lineJoin = 'round'; c.shadowColor = '#a78bfa'; c.shadowBlur = 18; c.strokeStyle = '#a78bfa'; c.lineWidth = 6; c.beginPath(); c.moveTo(X(P[0].lng), Y(P[0].lat));
      for(let i=1;i<=Math.min(full, seg);i++) c.lineTo(X(P[i].lng), Y(P[i].lat));
      let hx = X(P[Math.min(full, seg)].lng), hy = Y(P[Math.min(full, seg)].lat);
      if(full < seg){ const f = q - full, a = P[full], b = P[full+1]; hx = X(a.lng) + (X(b.lng) - X(a.lng)) * f; hy = Y(a.lat) + (Y(b.lat) - Y(a.lat)) * f; c.lineTo(hx, hy); }
      c.stroke(); c.shadowBlur = 0;
      const placed = [];
      P.forEach((pt, i) => { if(i > q + .001) return; const x = X(pt.lng), y = Y(pt.lat), age = Math.min(1, (q - i) * 2 + .001);
        c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 10 * filmEase(age), 0, 7); c.fill(); c.strokeStyle = 'rgba(167,139,250,.9)'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 10 + 12 * (1 - age), 0, 7); c.stroke();
        const ly = y + (i % 2 ? 34 : -16), free = pt.name && !placed.some(b => Math.abs(b[0] - x) < 150 && Math.abs(b[1] - ly) < 34);
        if(free) placed.push([x, ly]);
        if(free && placed.length <= 10){ c.globalAlpha = age; c.fillStyle = '#fff'; fz(c, 26, 700); c.shadowColor = 'rgba(0,0,0,.9)'; c.shadowBlur = 8; c.textAlign = x > FW/2 ? 'right' : 'left'; c.fillText(TT(pt.name), x + (x > FW/2 ? -20 : 20), y + (i % 2 ? 34 : -16)); c.shadowBlur = 0; c.textAlign = 'center'; c.globalAlpha = 1; } });
      c.fillStyle = '#fbbf24'; c.shadowColor = '#fbbf24'; c.shadowBlur = 24; c.beginPath(); c.arc(hx, hy, 9, 0, 7); c.fill(); c.shadowBlur = 0;
    },
    stats(c, p, D){
      fBg(c, '#1a0b3d', '#5b21b6'); c.fillStyle = '#fff'; fz(c, 46, 800); c.fillText(TT('En chiffres'), FW/2, 190);
      const T = [['🗓️', D.days, 'jours', 'un jour'], ['🛏️', D.nights, 'nuits', 'une nuit'], ['🛣️', Math.round(D.dist), 'km', 'km'], ['🌍', D.ccs.length, 'pays', 'un pays'], ['📸', D.nph, 'photos', 'une photo']].map(x => [x[0], x[1], filmUnit(x[2], x[1]) || (x[1] === 1 ? TT(x[3]).replace(/^\S+\s+/, '') : TT(x[2]))]).filter(x => x[1] > 0);
      T.forEach((x, i) => { const st = .08 + i * .13, a = filmEase(Math.max(0, Math.min(1, (p - st) / .2))), cy = 330 + i * 160;
        c.globalAlpha = a; c.fillStyle = 'rgba(255,255,255,.1)'; c.beginPath(); c.roundRect ? c.roundRect(70 + (1-a) * 120, cy - 70, FW - 140, 130, 28) : c.rect(70, cy - 70, FW - 140, 130); c.fill();
        fz(c, 56, 800); c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(x[0], 110 + (1-a) * 120, cy + 18);
        fz(c, 74, 800); c.fillText(Math.round(x[1] * a).toLocaleString(NL()), 200 + (1-a) * 120, cy + 26); const w = c.measureText(Math.round(x[1] * a).toLocaleString(NL())).width;
        fz(c, 34, 500); c.fillStyle = 'rgba(255,255,255,.75)'; c.fillText(x[2], 215 + w + (1-a) * 120, cy + 26); c.textAlign = 'center'; c.globalAlpha = 1; });
      if(D.ccs.length){ fz(c, 54, 400); c.fillStyle = '#fff'; c.globalAlpha = filmEase(Math.max(0, (p - .75) / .2)); c.fillText(D.ccs.slice(0, 8).map(flag).join(' '), FW/2, 1190); c.globalAlpha = 1; }
    },
    photos(c, p, D, sc){
      fBg(c, '#000', '#000'); const n = D.imgs.length, per = 1 / n, i = Math.min(n - 1, Math.floor(p / per)), lp = (p - i * per) / per, im = D.imgs[i];
      const dir = i % 2 ? -1 : 1; fCover(c, im.bmp, 0, 0, FW, FH, 1.05 + lp * .1, dir * (lp - .5) * .5, 0);
      const g = c.createLinearGradient(0, FH - 380, 0, FH); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.8)'); c.fillStyle = g; c.fillRect(0, FH - 380, FW, 380);
      const a = Math.min(1, lp * 4, (1 - lp) * 6 + .0001); c.globalAlpha = Math.max(0, a); c.fillStyle = '#fff'; fz(c, 46, 800); c.textAlign = 'left'; { const cl = fLines(c, TT(im.cap || ''), FW - 112).slice(0, 2); if(I18N.rtl) c.textAlign = 'right';   // légende sur 2 lignes : elle monte au lieu de chevaucher la date
        cl.forEach((l, k) => c.fillText(l, I18N.rtl ? FW - 56 : 56, FH - 130 - (cl.length - 1 - k) * 54)); c.textAlign = 'left'; }
      fz(c, 28, 500); c.fillStyle = 'rgba(255,255,255,.8)'; if(I18N.rtl) c.textAlign = 'right'; c.fillText(im.date ? fdate(im.date) : '', I18N.rtl ? FW - 56 : 56, FH - 60); c.textAlign = 'center'; c.globalAlpha = 1;
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(56, 56, FW - 112, 4); c.fillStyle = '#fff'; c.fillRect(56, 56, (FW - 112) * p, 4);
    },
    spend(c, p, D){
      fBg(c, '#06231f', '#0f766e'); c.fillStyle = '#fff'; fz(c, 46, 800); c.fillText(TT('Ce que ça a coûté'), FW/2, 190);
      const a = filmEase(Math.min(1, p * 2)); fz(c, 110, 800); c.fillText(Math.round(D.tot * a).toLocaleString(NL()) + ' ' + D.cur, FW/2, 400);
      fz(c, 32, 500); c.fillStyle = 'rgba(255,255,255,.8)'; c.fillText(TT(`${Math.round(D.perDay).toLocaleString(NL())} ${D.cur} par jour`) + (D.per !== D.tot ? ' · ' + TT(`${Math.round(D.per).toLocaleString(NL())} ${D.cur} par personne`) : ''), FW/2, 460);
      const mx = Math.max(1, ...D.cats.map(x=>x[1]));
      D.cats.forEach(([k, x], i) => { const y = 600 + i * 130, w = (FW - 200) * (x / mx) * filmEase(Math.max(0, Math.min(1, (p - .25 - i * .1) / .3)));
        c.textAlign = 'left'; fz(c, 32, 600); c.fillStyle = '#fff'; c.fillText((CATS[k] ? CATS[k].icon + ' ' + TT(CATS[k].lbl) : k), 100, y);
        c.fillStyle = 'rgba(255,255,255,.15)'; c.fillRect(100, y + 18, FW - 200, 26); c.fillStyle = '#5eead4'; c.fillRect(100, y + 18, w, 26);
        c.textAlign = 'right'; fz(c, 28, 600); c.fillStyle = 'rgba(255,255,255,.85)'; c.fillText(Math.round(x).toLocaleString(NL()) + ' ' + D.cur, FW - 100, y); c.textAlign = 'center'; });
    },
    end(c, p, D){
      fBg(c); const a = filmEase(Math.min(1, p * 2)); c.globalAlpha = a; c.fillStyle = '#fff'; fz(c, 120, 800); c.fillText('🧳', FW/2, 560 - (1-a) * 30);
      fz(c, 64, 800); { const t = TT('À la prochaine !'), w = c.measureText(t).width; if(w > FW - 60) fz(c, Math.floor(64 * (FW - 60) / w), 800); c.fillText(t, FW/2, 700); } fz(c, 34, 500); c.fillStyle = 'rgba(255,255,255,.75)'; c.fillText(TT(String(D.t.titre || '')), FW/2, 770);
      fz(c, 30, 700); c.fillStyle = '#c4b5fd'; c.fillText(TT('Fait avec Vezoria'), FW/2, 1160); c.globalAlpha = 1;
    }
  };
  async function filmSave(){
    if(!FM) return; const c = document.getElementById('cv-film-c'), msg = document.getElementById('cv-film-msg');
    if(!c.captureStream || typeof MediaRecorder === 'undefined'){ alert('Ce navigateur ne sait pas enregistrer la vidéo. Fais plutôt une capture d’écran vidéo du téléphone pendant la lecture.'); return; }
    const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']; const mime = types.find(t => MediaRecorder.isTypeSupported(t)) || '';
    const stream = c.captureStream(30), chunks = []; let rec; filmAudioStart(); try { if(FA && FA.dest && FA.on) FA.dest.stream.getAudioTracks().forEach(tr=>stream.addTrack(tr)); } catch(e){}
    try { rec = new MediaRecorder(stream, mime ? {mimeType:mime, videoBitsPerSecond:5000000} : {}); } catch(e){ alert('Enregistrement impossible : ' + e.message); return; }
    rec.ondataavailable = e => { if(e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = async () => {
      const type = rec.mimeType || mime || 'video/webm', ext = /mp4/.test(type) ? 'mp4' : 'webm', blob = new Blob(chunks, {type});
      const name = 'film-' + String(FM && FM.D.t.titre || 'voyage').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') + '.' + ext;
      if(FM){ FM.rec = null; if(msg) msg.textContent = ''; const b = document.getElementById('cv-film-save'); if(b) b.disabled = false; }
      const file = new File([blob], name, {type});
      try { if(navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file], title:name}); return; } } catch(e){ if(e && e.name === 'AbortError') return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 5000);
    };
    FM.rec = rec; FM.chunks = chunks; document.getElementById('cv-film-save').disabled = true; if(msg) msg.textContent = '🔴 Enregistrement… ne quitte pas l’écran (' + Math.round(FM.D.total) + ' s)';
    FM.pos = 0; FM.playing = true; FM.last = performance.now(); document.getElementById('cv-film-pp').textContent = '⏸'; rec.start(500);
  }
  function filmStopRec(){ if(FM && FM.rec){ filmAudioStop(); const r = FM.rec; setTimeout(() => { try { r.stop(); } catch(e){} }, 400); FM.playing = false; } }

  /* ======================================================================
     ✨ VOYAGE EN 5 ACTES : couverture · préparation · jour J · bienvenue · soir · anniversaire · globe
     ====================================================================== */
  /* ---------- Rêver : couverture vivante (photo du voyage dans l'en-tête) ---------- */
  function coverId(t){
    if(!t) return ''; if(t.cover) return t.cover;
    const s = list('souv', x=>x.trip===t.id && (x.photos||[]).length).sort((a,b)=>(a.date||'').localeCompare(b.date||''))[0];
    return s ? s.photos[0] : '';
  }
  let coverCur = '';
  async function coverPaint(t){
    const hero = document.querySelector('.header .hero'); if(!hero) return;
    let el = document.getElementById('cv-cover');
    const id = (t && !t.cover && t.coverWk) ? 'wk:' + t.coverWk : coverId(t);
    if(!id){ if(el) el.remove(); hero.classList.remove('has-cover'); coverCur = ''; return; }
    if(id === coverCur && el) return; coverCur = id;
    if(!el){ el = document.createElement('div'); el.id = 'cv-cover'; hero.prepend(el); }
    if(id.startsWith('wk:')){ const i = new Image(); i.onload = () => { if(coverCur === id){ el.style.backgroundImage = `url("${t.coverWk}")`; hero.classList.add('has-cover'); } }; i.src = t.coverWk; return; }
    const u = urls[id] || urls[id + '.t'] || await photoURL(id + '.t');
    if(coverCur !== id) return;
    if(u){ el.style.backgroundImage = `url("${u}")`; hero.classList.add('has-cover'); }
    photoURL(id).then(full=>{ if(full && coverCur === id) el.style.backgroundImage = `url("${full}")`; }).catch(()=>{});
  }
  function coverSet(){
    if(!vw || !vw.sid) return; const s = R[vw.sid], id = vw.ph[vw.i]; if(!s || !R[s.trip]) return;
    const t = clone(R[s.trip]); t.cover = id; put(t, '🖼️ Photo de couverture du voyage'); coverCur = ''; renderHeader();
  }

  /* ---------- Préparer : niveau de préparation ---------- */
  function prepSteps(){
    const t = trip(); if(!t) return [];
    const all = items(), ok = i => i.statut === 'booked' || i.statut === 'paid';
    const tr = all.filter(i=>i.cat==='transport'), ho = all.filter(i=>i.cat==='hotel');
    const ns = t.debut && t.fin ? range(t.debut, t.fin).slice(0, -1) : [];
    const covered = ns.filter(d=>ho.some(h=>h.date && h.date <= d && (h.dateFin ? d < h.dateFin : h.date === d))).length;
    const ck = list('check', c=>c.trip===t.id), ckd = ck.filter(c=>c.done).length;
    const di = (() => { try { return docIssues(); } catch(e){ return []; } })();
    return [
      {k:'dates', l:'Dates du voyage', ok:!!t.debut, fn:'CV.datesSheet()'},
      {k:'aller', l:'Trajet aller réservé', ok:tr.some(i=>ok(i) && (!t.debut || i.date === t.debut || i.date < t.debut)) || tr.some(ok), fn:`CV.tab('transport')`},
      {k:'nuits', l: ns.length ? 'Nuits réservées' : 'Hébergement', ok: ns.length ? covered === ns.length && ho.every(h=>ok(h) || !h.date) : ho.some(ok), n: ns.length ? covered + '/' + ns.length : '', fn:`CV.tab('hotel')`},
      {k:'retour', l:'Trajet retour réservé', ok: !t.fin || tr.some(i=>ok(i) && i.date && i.date >= t.fin), fn:`CV.tab('transport')`},
      {k:'budget', l:'Budget fixé', ok:!!num(t.objectif), opt:true, fn:`CV.editTrip('${t.id}')`},   // facultatif : ne compte que s’il est fixé
      {k:'docs', l:'Documents vérifiés', ok:!di.length, fn:'CV.tlDocs()'},
      {k:'check', l:'Checklist', ok: ck.length > 0 && ckd === ck.length, n: ck.length ? ckd + '/' + ck.length : '', fn:`CV.tab('check')`}
    ];
  }
  function prepTog(){ M.prepOpen = !M.prepOpen; persist(); const y = window.scrollY; render(); window.scrollTo(0, y); }

  /* ---------- Moments : « Demain, tu pars » et « Bienvenue à … » (une seule fois chacun) ---------- */
  const SAY = {   // bonjour, merci, s'il te plaît, au revoir, santé
    PT:['Olá','Obrigado / Obrigada','Por favor','Adeus','Saúde!'], BR:['Olá','Obrigado / Obrigada','Por favor','Tchau','Saúde!'],
    ES:['Hola','Gracias','Por favor','Adiós','¡Salud!'], MX:['Hola','Gracias','Por favor','Adiós','¡Salud!'], AR:['Hola','Gracias','Por favor','Chau','¡Salud!'],
    IT:['Ciao / Buongiorno','Grazie','Per favore','Arrivederci','Salute!'], DE:['Hallo / Guten Tag','Danke','Bitte','Tschüss','Prost!'], AT:['Grüß Gott','Danke','Bitte','Servus','Prost!'],
    NL:['Hallo','Dank je wel','Alsjeblieft','Doei','Proost!'], GB:['Hello','Thank you','Please','Goodbye','Cheers!'], IE:['Hello / Dia dhuit','Thank you','Please','Goodbye','Sláinte!'],
    US:['Hi','Thank you','Please','Bye','Cheers!'], CA:['Hello / Bonjour','Thank you','Please','Bye','Cheers!'], AU:['G’day','Thanks','Please','See ya','Cheers!'],
    GR:['Yásou (Γειά σου)','Efcharistó (Ευχαριστώ)','Parakaló (Παρακαλώ)','Andío (Αντίο)','Yámas! (Γεια μας)'], MT:['Bonġu','Grazzi','Jekk jogħġbok','Saħħa','Saħħa!'],
    TR:['Merhaba','Teşekkürler','Lütfen','Hoşça kal','Şerefe!'], HR:['Bok / Dobar dan','Hvala','Molim','Doviđenja','Živjeli!'], CZ:['Ahoj / Dobrý den','Děkuji','Prosím','Na shledanou','Na zdraví!'],
    PL:['Cześć / Dzień dobry','Dziękuję','Proszę','Do widzenia','Na zdrowie!'], HU:['Szia / Jó napot','Köszönöm','Kérem','Viszlát','Egészségedre!'], RO:['Salut / Bună ziua','Mulțumesc','Vă rog','La revedere','Noroc!'],
    SE:['Hej','Tack','Snälla','Hej då','Skål!'], NO:['Hei','Takk','Vær så snill','Ha det','Skål!'], DK:['Hej','Tak','Vær så venlig','Farvel','Skål!'], FI:['Moi / Hei','Kiitos','Ole hyvä','Näkemiin','Kippis!'], IS:['Halló / Góðan dag','Takk','Gjörðu svo vel','Bless','Skál!'],
    MA:['Salam','Choukran','Afak','Bslama','Bsaha!'], EG:['Salam / Ahlan','Shukran','Min fadlak','Ma’a salama','Fi sihhitak!'], TN:['Aslema','Yaïchek','Brabbi','Bslama','Bsaha!'],
    JP:['Konnichiwa (こんにちは)','Arigatō (ありがとう)','Onegaishimasu (お願いします)','Sayōnara (さようなら)','Kanpai! (乾杯)'], TH:['Sawasdee (สวัสดี)','Khop khun (ขอบคุณ)','Karuna (กรุณา)','Laa gon (ลาก่อน)','Chon kaew! (ชนแก้ว)'],
    CN:['Nǐ hǎo (你好)','Xièxie (谢谢)','Qǐng (请)','Zàijiàn (再见)','Gānbēi! (干杯)'], KR:['Annyeonghaseyo (안녕하세요)','Gamsahamnida (감사합니다)','Juseyo (주세요)','Annyeonghi gaseyo (안녕히 가세요)','Geonbae! (건배)'],
    VN:['Xin chào','Cảm ơn','Làm ơn','Tạm biệt','Một, hai, ba, dzô!'], ID:['Halo / Selamat pagi','Terima kasih','Tolong','Sampai jumpa','Bersulang!'], IN:['Namaste (नमस्ते)','Dhanyavaad (धन्यवाद)','Kripya (कृपया)','Phir milenge (फिर मिलेंगे)','Cheers!']
  };
  const SAY_LANG = {PT:'pt',BR:'pt',ES:'es',MX:'es',AR:'es',IT:'it',DE:'de',AT:'de',NL:'nl',GB:'en',IE:'en',US:'en',CA:'en',AU:'en',FR:'fr',BE:'fr',LU:'fr',MC:'fr'};
  const EURO = 'AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK MC SM VA AD ME XK'.split(' ');
  let momentDone = false;
  async function moments(){
    if(momentDone || document.getElementById('cv-moment') || document.getElementById('v-sheet-bg')) return;
    { const td = isoToday(); M.seen = M.seen || {};
      if(!M.seen['annivM:' + td] && !hidden('blk:anniv')){ const md = td.slice(5), y = +td.slice(0, 4);
        const a = list('souv', x=>x.date && x.date.slice(5) === md && +x.date.slice(0, 4) < y && (x.photos||[]).length && R[x.trip] && !R[x.trip].deleted && !R[x.trip].demo).sort((p, q)=>q.date.localeCompare(p.date))[0];
        if(a){ momentDone = true; M.seen['annivM:' + td] = 1; persist(); annivShow(a); return; } } }
    const t = trip(); if(!t || !t.debut || t.demo) return;
    const td = isoToday(), tm = new Date(Date.now() + 864e5).toISOString().slice(0,10); M.seen = M.seen || {};
    // la veille (ou le matin du départ) : « Demain, tu pars »
    if(!t.archived && (t.debut === tm || (t.debut === td && new Date().getHours() < 11)) && !M.seen['eve:' + t.id]){
      momentDone = true; M.seen['eve:' + t.id] = 1; persist(); momentEve(t, t.debut === tm); return;
    }
    // retour : « Bon retour ! » (dans les 3 semaines qui suivent la fin)
    if(tripPhase(t) === 'past' && t.fin && nights(t.fin, td) <= 21 && !M.seen['home:' + t.id]){ momentDone = true; M.seen['home:' + t.id] = 1; persist(); momentHome(t); return; }
    // pendant le voyage : « Bienvenue à … » quand la ville de la nuit change
    if(tripPhase(t) !== 'live') return;
    const {night} = itemsForDay(td), h = night[0], city = h ? stayCity(h) : '';
    if(!city || M.seen['hi:' + t.id + ':' + normQ(city)] || (M.wlc && M.wlc[t.id] && M.wlc[t.id].cities.includes(normQ(city)))) return;
    momentDone = true; M.seen['hi:' + t.id + ':' + normQ(city)] = 1; persist();
    const c = await countryOf(city).catch(()=>null);
    momentHello(t, h, city, c);
  }
  function momentShow(html, theme){
    const el = document.createElement('div'); el.id = 'cv-moment'; el.className = 'cv-moment ' + (theme || '');
    el.innerHTML = `<div class="mo-card">${html}<button type="button" class="mo-x" onclick="CV.momentClose()" aria-label="Fermer">✕</button></div>`;
    document.body.appendChild(el); requestAnimationFrame(()=>el.classList.add('in'));
  }
  function momentClose(){ momentDone = false; const el = document.getElementById('cv-moment'); if(!el) return; el.classList.remove('in'); setTimeout(()=>el.remove(), 350); }
  function momentEve(t, tomorrow){
    const nx = nextMoves().find(x=>x.it.cat==='transport') || nextMoves()[0];
    const ck = list('check', c=>c.trip===t.id), left = ck.filter(c=>!c.done).length, di = (() => { try { return docIssues(); } catch(e){ return []; } })();
    momentShow(`<div class="mo-k">${tomorrow ? 'Demain, tu pars' : 'C’est le grand jour'}</div><div class="mo-big">🧳</div><h2>${esc(t.titre)}</h2>
      ${nx ? `<div class="mo-l">${icon(nx.it)} <b>${esc(nx.it.titre)}</b>${nx.timed ? ' · ' + esc(nx.it.cat==='transport' ? nx.it.heureDep : nx.it.heure) : ''}</div>` : ''}
      <div class="mo-chk"><span class="${left ? '' : 'ok'}">${left ? '○' : '✓'} ${left ? left + ' chose(s) à cocher dans la checklist' : 'Checklist terminée'}</span>
        <span class="${di.length ? '' : 'ok'}">${di.length ? '⚠️ ' + di.length + ' document(s) à vérifier' : '✓ Documents en ordre'}</span></div>
      <div class="mo-b">${left ? `<button type="button" onclick="CV.momentClose();CV.tab('check')">✅ Checklist</button>` : ''}<button type="button" onclick="CV.momentClose();CV.tlDay()">📴 Fiche du jour</button><button type="button" class="pri" onclick="CV.momentClose()">Bon voyage !</button></div>`, 'eve');
  }
  function momentHello(t, h, city, c){
    const cc = c && c.cc || '', words = SAY[cc], mine = (window.I18N && I18N.lang) || 'fr';
    const cur = cc ? (EURO.includes(cc) ? 'EUR' : REGION_CUR[cc] || '') : '';
    const lab = ['Bonjour','Merci','S’il te plaît','Au revoir','Santé !'];
    momentShow(`<div class="mo-k">Bienvenue à</div><div class="mo-big">${flag(cc)}</div><h2>${esc(city)}</h2>${c && c.pays ? `<div class="mo-sub">${esc(c.pays)}</div>` : ''}
      ${words && SAY_LANG[cc] !== mine ? `<div class="mo-w">${words.map((w,i)=>`<div><small>${lab[i]}</small><b>${esc(w)}</b></div>`).join('')}</div>` : ''}
      ${cur && cur !== curCode() ? `<div class="mo-l">💱 Monnaie : <b>${cur} ${CURS[cur] && CURS[cur] !== cur ? '(' + CURS[cur] + ')' : ''}</b></div>` : ''}
      <div class="mo-l">🛏️ Ce soir : <b>${esc(h.nom || h.titre)}</b>${h.adresse ? `<small>${esc(h.adresse)}</small>` : ''}</div>
      <div class="mo-b"><button type="button" onclick="CV.momentClose();CV.nhGo('${h.id}')">🧭 Aller à l’hôtel</button>${cur && cur !== curCode() ? `<button type="button" onclick="CV.momentClose();CV.fxTool()">💱 Convertir</button>` : ''}<button type="button" class="pri" onclick="CV.momentClose()">C’est parti !</button></div>`, 'hello');
  }

  /* ---------- Jour J : carte d'embarquement ---------- */
  function boardShow(id){
    const it = R[id]; if(!it) return;
    const IATA = {'londres gatwick':'LGW','gatwick':'LGW','heathrow':'LHR','stansted':'STN','luton':'LTN','nantes':'NTE','brest':'BES','quimper':'UIP','paris orly':'ORY','orly':'ORY','beauvais':'BVA','paris':'CDG','geneve':'GVA','lisbonne':'LIS','porto':'OPO','rome':'FCO','naples':'NAP','malte':'MLA','la valette':'MLA','athenes':'ATH','le caire':'CAI','bruxelles':'BRU','charleroi':'CRL','barcelone':'BCN','madrid':'MAD','lyon':'LYS','marseille':'MRS','nice':'NCE','bordeaux':'BOD','toulouse':'TLS','amsterdam':'AMS','berlin':'BER','dublin':'DUB','reykjavik':'KEF','venise':'VCE','milan':'MXP','bale':'BSL','mulhouse':'MLH','londres':'LON','new york':'JFK','montreal':'YUL','marrakech':'RAK','istanbul':'IST','prague':'PRG','vienne':'VIE','budapest':'BUD','cracovie':'KRK','seville':'SVQ','malaga':'AGP','palma':'PMI','faro':'FAO','edimbourg':'EDI','copenhague':'CPH','oslo':'OSL','stockholm':'ARN','helsinki':'HEL','munich':'MUC','francfort':'FRA','zurich':'ZRH','florence':'FLR','bologne':'BLQ','catane':'CTA','palerme':'PMO','ajaccio':'AJA','bastia':'BIA'};
    const code = s => { const m = String(s||'').match(/\(([A-Z]{3})\)/); if(m) return m[1]; const n = String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z ]/g,' ').replace(/\s+/g,' ').trim(); const hit = Object.keys(IATA).find(x=>n.includes(x)); return hit ? IATA[hit] : String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase() || '—'; };
    const fl = (String(it.compagnie||'').match(/\b([A-Z0-9]{2,3}\s?\d{2,4})\b/) || [])[1] || '';
    const seat = (String(it.note||'').match(/si[èe]ge\s*:?\s*([0-9]{1,2}[A-K])/i) || [])[1] || '';
    const pj = (it.pj||[])[0];
    momentShow(`<div class="bp"><div class="bp-h"><span>${esc(String(it.compagnie||'').replace(fl,'').trim() || 'Embarquement')}</span><b>${esc(fl)}</b></div>
      <div class="bp-r"><div><b>${esc(code(it.from))}</b><small>${esc(cityOf(it.from||''))}</small></div><span class="bp-pl">✈</span><div><b>${esc(code(it.to))}</b><small>${esc(cityOf(it.to||''))}</small></div></div>
      <div class="bp-g"><div><small>Date</small><b>${it.date ? fshort(it.date) : '—'}</b></div><div><small>Départ</small><b>${esc(it.heureDep||'—')}</b></div><div><small>Arrivée</small><b>${esc(it.heureArr||'—')}</b></div><div><small>Siège</small><b>${esc(seat||'—')}</b></div></div>
      <div class="bp-cut"></div>
      <div class="bp-ref"><small>Réservation</small><b>${esc(it.ref||'—')}</b></div>
      <div class="mo-b">${pj ? `<button type="button" class="pri" onclick="CV.momentClose();CV.pjOpen('${esc(pj.id)}','${esc(pj.t||'img')}')">🎫 Ouvrir le billet</button>` : ''}${it.ref ? `<button type="button" onclick="CV.nhCopy('${esc(it.ref)}')">⧉ Copier la réf.</button>` : ''}<button type="button" onclick="CV.momentClose();CV.nhGo('${it.id}')">🧭 Aller à l’aéroport</button></div></div>`, 'board');
  }

  /* ---------- Vivre : « Ta journée en 30 secondes » (le soir, pendant le voyage) ---------- */
  function eveCard(){
    const t = trip(); if(!t || t.archived || tripPhase(t) !== 'live' || hidden('blk:eve')) return '';
    const td = isoToday(), hr = new Date().getHours(); if(hr < 18 && !M.eveForce) return '';
    const sv = list('souv', s=>s.trip===t.id && s.date===td && s.day30);
    if(sv.length || (M.seen && M.seen['day30:' + t.id + ':' + td])) return '';
    const k = dayList().indexOf(td);
    return `<div class="cv-eve"><div class="ev-k">🌙 Ta journée en 30 secondes</div><div class="ev-t">${PJ(k+1)} · ${fdate(td)}</div>
      <textarea class="v-in" id="ev-txt" rows="2" placeholder="Une phrase sur ta journée…"></textarea>
      <div class="ev-ph" id="ev-ph"></div>
      <div class="ev-b"><label class="ev-add">📸 Prendre une photo<input type="file" accept="image/*" capture="environment" onchange="CV.evePhotos(this)"></label><label class="ev-add">🖼️ Photos du jour<input type="file" accept="image/*" multiple onchange="CV.evePhotos(this)"></label><button type="button" class="pri" onclick="CV.eveSave()">✨ Garder ce souvenir</button><button type="button" class="ev-no" onclick="CV.eveSkip()">Pas ce soir</button></div></div>`;
  }
  let evePh = [];
  async function evePhotos(input){
    const box = document.getElementById('ev-ph'); const fs = [...(input.files||[])];
    for(const f of fs){ evePh.push(f); if(box) box.insertAdjacentHTML('beforeend', `<img src="${URL.createObjectURL(f)}" alt="">`); }
    input.value = '';
  }
  async function eveSave(){
    const t = trip(); if(!t) return; const td = isoToday(), txt = (document.getElementById('ev-txt')||{}).value || '';
    if(!txt.trim() && !evePh.length){ alert('Écris une phrase ou ajoute une photo.'); return; }
    toast('✨ Souvenir en cours…');
    const ids = [], geo = []; for(let i=0;i<evePh.length;i++){ try { const ex = await exifOf(evePh[i]).catch(()=>({})), pid = 'ph' + uid() + i; await storePhoto(evePh[i], pid); ids.push(pid); if(ex.lat != null) geo.push([ex.lat, ex.lng, exTs(ex), pid]); } catch(e){} }
    evePh = [];
    const {night} = itemsForDay(td), city = night[0] ? cityOf(night[0].titre) : '';
    const ex = list('souv', s=>s.trip===t.id && s.date===td).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];
    const s = ex ? clone(ex) : {id:'sv' + uid(), type:'souv', trip:t.id, date:td, titre: city || PJ(dayList().indexOf(td) + 1), lieu: city, texte:'', photos:[]};
    s.texte = [s.texte, txt.trim()].filter(Boolean).join('\n\n'); s.photos = [...(s.photos||[]), ...ids]; s.day30 = 1; if(geo.length){ s.pts = [...(s.pts||[]), ...geo]; if(s.lat == null){ s.lat = geo[0][0]; s.lng = geo[0][1]; } }
    put(s, '🌙 Journée gardée en souvenir'); render(); uploadQueue();
  }
  function eveSkip(){ M.seen = M.seen || {}; M.seen['day30:' + M.trip + ':' + isoToday()] = 1; persist(); render(); }

  /* ---------- Revivre : « Il y a un an aujourd'hui » ---------- */
  function annivCard(){
    if(hidden('blk:anniv')) return '';
    const td = isoToday(), md = td.slice(5), y = +td.slice(0,4);
    if(M.seen && M.seen['anniv:' + td]) return '';
    const s = list('souv', x=>x.date && x.date.slice(5) === md && +x.date.slice(0,4) < y && (x.photos||[]).length && R[x.trip] && !R[x.trip].deleted).sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(!s) return '';
    const n = y - +s.date.slice(0,4), t = R[s.trip];
    return `<div class="cv-anniv"><button type="button" class="an-m" onclick="CV.annivGo('${s.id}')"><img data-ph="${esc(s.photos[0])}.t" alt=""><span><small>${n > 1 ? 'Il y a ' + n + ' ans aujourd’hui' : 'Il y a un an aujourd’hui'}</small><b>${esc(s.titre || s.lieu || t.titre)}</b><small>${esc(t.titre)}</small></span></button><button type="button" class="an-x" onclick="CV.annivSkip()" aria-label="Fermer">✕</button></div>`;
  }
  function annivGo(sid){ const s = R[sid]; if(!s) return; go(s.trip); setTimeout(()=>{ view(sid, 0); }, 300); }
  function annivSkip(){ M.seen = M.seen || {}; M.seen['anniv:' + isoToday()] = 1; persist(); render(); }

  /* ---------- Rêver : créer un voyage en touchant le globe ---------- */
  let wantPlan = false, wantFly = null;
  function worldTrip(id){ if(wm && wm.map && wm.data){ worldMap(); setTimeout(()=>worldFly(id), 400); } else { wantFly = id; worldMap(); } }
  function worldNew(){ closeSheet(true); if(wm && wm.map && wm.map.loaded && wm.map.loaded()){ worldMap(); setTimeout(worldPlan, 300); } else { wantPlan = true; worldMap(); } }
  async function worldPlan(){
    if(!wm || !wm.map){ toast('🌍 Le globe se charge…'); return; }
    wm.plan = wm.plan || []; wm.spin = false; stopStory();
    document.getElementById('cv-world').classList.add('wm-planning');
    if(!wm.planOn){ wm.planOn = true; wm.map.on('click', worldPick); }
    worldPlanUI();
  }
  async function worldPick(e){
    if(!wm || !document.getElementById('cv-world').classList.contains('wm-planning')) return;
    const {lng, lat} = e.lngLat; let city = '', cc = '', pays = '';
    try { const j = await (await fetch(`${GEO}reverse?format=jsonv2&zoom=10&accept-language=${((window.I18N && I18N.lang) || 'fr')}&lat=${lat}&lon=${lng}`)).json();
      const a = (j && j.address) || {}; city = a.city || a.town || a.village || a.municipality || a.county || a.state || ''; pays = a.country || ''; cc = (a.country_code || '').toUpperCase(); } catch(e){}
    if(!city){ toast('🌊 Pas de ville ici : touche la terre ferme'); return; }
    wm.plan.push({city, pays, cc, lat:+lat.toFixed(4), lng:+lng.toFixed(4)});
    const el = document.createElement('div'); el.className = 'wm-plan-pin'; el.textContent = wm.plan.length;
    (wm.planM = wm.planM || []).push(new maplibregl.Marker({element:el}).setLngLat([lng, lat]).addTo(wm.map));
    worldPlanLine(); worldPlanUI();
  }
  function worldPlanLine(){
    const map = wm.map, P = wm.plan, coords = [];
    for(let i=1;i<P.length;i++){ const a = P[i-1], b = P[i]; for(let k=0;k<=24;k++){ const f = k/24; coords.push([a.lng + (b.lng - a.lng) * f, a.lat + (b.lat - a.lat) * f]); } }
    const data = {type:'Feature', geometry:{type:'LineString', coordinates: coords.length ? coords : [[P[0].lng, P[0].lat],[P[0].lng, P[0].lat]]}};
    if(map.getSource('plan')) map.getSource('plan').setData(data);
    else { map.addSource('plan', {type:'geojson', data}); map.addLayer({id:'plan-glow', type:'line', source:'plan', paint:{'line-color':'#fbbf24', 'line-width':10, 'line-opacity':.3, 'line-blur':6}}); map.addLayer({id:'plan', type:'line', source:'plan', paint:{'line-color':'#fde68a', 'line-width':3, 'line-dasharray':[2,1.5]}}); }
  }
  function worldPlanUI(){
    let b = document.getElementById('wm-plan'); const ov = document.getElementById('cv-world'); if(!ov) return;
    if(!b){ b = document.createElement('div'); b.id = 'wm-plan'; ov.appendChild(b); }
    const P = wm.plan || [];
    b.innerHTML = `<div class="wp-h">✨ Touche le globe pour poser les villes de ton voyage, dans l’ordre.</div><div class="wp-c">${P.map((p,i)=>`<span>${flag(p.cc)} ${esc(p.city)}</span>`).join('<i>→</i>') || '<em>Aucune ville pour l’instant</em>'}</div>
      <div class="wp-b"><button type="button" onclick="CV.worldPlanUndo()"${P.length ? '' : ' disabled'} aria-label="Annuler">↶</button><button type="button" onclick="CV.worldPlanStop()">Annuler</button><button type="button" class="pri" onclick="CV.worldPlanGo()"${P.length ? '' : ' disabled'}>✨ Créer ce voyage</button></div>`;
  }
  function worldPlanUndo(){ if(!wm || !wm.plan || !wm.plan.length) return; wm.plan.pop(); const m = wm.planM.pop(); if(m) m.remove(); if(wm.plan.length) worldPlanLine(); else { ['plan','plan-glow'].forEach(l=>{ try { wm.map.removeLayer(l); } catch(e){} }); try { wm.map.removeSource('plan'); } catch(e){} } worldPlanUI(); }
  function worldPlanStop(){ if(!wm) return; while(wm.plan && wm.plan.length) worldPlanUndo(); const b = document.getElementById('wm-plan'); if(b) b.remove(); const ov = document.getElementById('cv-world'); if(ov) ov.classList.remove('wm-planning'); wmInfo(''); }
  async function worldPlanGo(){
    const P = (wm && wm.plan || []).slice(); if(!P.length) return;
    let cl = null;
    const n = x => normQ(x || '');
    // on reconnaît les villes connues de l'appli : météo, meilleure saison, budget sur place, conseils, formalités
    const match = P.map(p => DESTS.find(d => n(d[0]).split(/[^a-z0-9]+/).includes(n(p.city)) || (d[9]||[]).some(e=>n(e[0])===n(p.city))));
    const m0 = match.find(Boolean);
    const itin = P.map((p,i)=>{ const m = match[i], e = m && (m[9]||[]).find(e=>n(e[0])===n(p.city)); return [p.city, e ? e[1] : (P.length === 1 ? 4 : 2)]; });
    const nights = itin.reduce((s,a)=>s+a[1],0);
    const nm = P.length === 1 ? P[0].city : P.length === 2 ? P[0].city + ' & ' + P[1].city : P[0].city + ' → ' + P[P.length-1].city;
    const eu = EURO.includes(P[0].cc) || ['FR','CH','NO','IS','LI'].includes(P[0].cc);
    const d = [nm, P[0].pays, P[0].cc, P[0].lat, P[0].lng, m0 ? m0[5] : 'ville culture', m0 ? m0[6] : [5,6,9], m0 ? m0[7] : 90, [Math.max(2, nights - 2), nights + 3], itin,
      m0 ? m0[10] : 'Itinéraire dessiné sur le globe : règle les nuits, choisis les lieux à voir, puis crée le voyage.', m0 ? m0[11] : (eu ? 'UE' : 'P'), m0 ? m0[12] : Array(12).fill(20), m0 ? m0[13] : P[0].city];
    if(!m0){ toast('🌡️ ' + MSGT('Je regarde le climat…')); cl = await climOf(P[0]).catch(()=>null); if(cl){ d[12] = cl.t; d[6] = bestOf(cl); } }
    const i = DESTS.push(d) - 1, now = new Date().getMonth() + 1, best = d[6], mo = best.find(m=>m > now) || best[0] || now;
    M.insp = Object.assign({}, M.insp || {}, {duree: nights + 1, rythme: 'intense'}); persist();
    inspRes.unshift({i, d, nom:nm, pays:P[0].pays, cc:P[0].cc, tip:d[10], visa:d[11], wk:d[13], tags:d[5].split(' '), best, dur:d[8], sc:0, est:d[7]*nights, trans:0, stay:d[7]*nights, h:0, ground:false, escale:false, mo, tmp:d[12][mo-1], why:[], warn:[], itin, globe:1, known:!!m0 || !!cl});
    worldPlanStop(); worldClose(); M.mode = 'prep';
    inspOpen(i);   // même écran que « Je ne sais pas où aller » : présentation, étapes et nuits, lieux à voir, villes proches, puis création (dates, budget, trajets)
  }

  /* ---------- Musique du film : 3 morceaux libres de droits (Pixabay), choisis par l'utilisateur ---------- */
  // 11 morceaux libres de droits (Pixabay) ; le nom s'affiche quand on change de musique
  const TRACK_N = ['Techno', 'Techno 2', 'Électro énergique', 'Électro swing', 'Celtique EDM', 'Été festif', 'Électro house', 'Rock motivation', 'Phonk', 'Techno intense', 'Techno puissante'];
  const TRACKS = TRACK_N.map((_, i) => 'music/vezoria-' + (i + 1) + '.mp3');
  let FA = null;
  function filmAudioInit(){   // dans le geste (toucher) : sinon l'iPhone refuse le son
    try {
      if(!FA){
        const el = new Audio(); el.preload = 'auto'; el.loop = true; el.setAttribute('playsinline', ''); FA = {el, on: !M.filmMute, k: (M.filmTrack || 0) % TRACKS.length};
        const AC = window.AudioContext || window.webkitAudioContext;
        if(AC){ try { const ac = new AC(), src = ac.createMediaElementSource(el), g = ac.createGain(); g.gain.value = 0; src.connect(g); g.connect(ac.destination);
          FA.ac = ac; FA.g = g; if(ac.createMediaStreamDestination){ FA.dest = ac.createMediaStreamDestination(); g.connect(FA.dest); } } catch(e){} }
        el.src = TRACKS[FA.k];
      }
      if(FA.ac && FA.ac.state === 'suspended') FA.ac.resume();
      const pr = FA.el.play(); if(pr && pr.then) pr.then(()=>{ if((!FM || !FM.playing) && !ciMusOn) FA.el.pause(); }).catch(()=>{});
    } catch(e){ FA = null; }
  }
  function filmVol(v, t){
    if(!FA) return; const on = FA.on ? v : 0;
    if(FA.g){ const now = FA.ac.currentTime; FA.g.gain.cancelScheduledValues(now); FA.g.gain.setValueAtTime(FA.g.gain.value, now); FA.g.gain.linearRampToValueAtTime(on, now + (t || .01)); }
    else FA.el.volume = Math.max(0, Math.min(1, on));
  }
  function filmAudioStart(){
    if(!FA) filmAudioInit(); if(!FA) return; if(FM) FM.fadeOut = 0;
    try { FA.el.currentTime = 0; } catch(e){} filmVol(0, .01);
    if(FA.ac && FA.ac.state === 'suspended') FA.ac.resume();
    const pr = FA.el.play(); if(pr && pr.catch) pr.catch(()=>{}); filmVol(.9, 1.2);
  }
  function filmAudioStop(){ if(!FA) return; filmVol(0, .8); setTimeout(()=>{ if(FA && (!FM || !FM.playing) && !ciMusOn) FA.el.pause(); }, 900); }
  function filmMute(){ M.filmMute = !M.filmMute; persist(); if(FA){ FA.on = !M.filmMute; filmVol(.9, .2); } const b = document.getElementById('cv-film-snd'); if(b) b.textContent = M.filmMute ? '🔇' : '🔊'; }
  function filmTrack(){
    M.filmTrack = ((M.filmTrack || 0) + 1) % TRACKS.length; persist();
    if(FA){ FA.k = M.filmTrack; FA.el.src = TRACKS[FA.k]; if(FM && FM.playing){ const pr = FA.el.play(); if(pr && pr.catch) pr.catch(()=>{}); try { FA.el.currentTime = FM.pos; } catch(e){} filmVol(.9, .3); } }
    const b = document.getElementById('cv-film-trk'); if(b) b.textContent = '🎵 ' + (M.filmTrack + 1); toast('🎵 ' + (M.filmTrack + 1) + ' / ' + TRACKS.length + ' · ' + TT(TRACK_N[M.filmTrack]));
  }

  /* ---------- Niveau de préparation : la route jusqu'au décollage ---------- */
  function prepGauge(){
    const t = trip(); if(!t || t.archived || tripPhase(t) !== 'prep' || hidden('blk:prep')) return '';
    const SA = prepSteps(), S = SA.filter(s=>!s.opt || s.ok), done = S.filter(s=>s.ok).length, pct = Math.round(done / S.length * 100), nxt = S.find(s=>!s.ok), open = !!M.prepOpen;
    const lv = pct >= 100 ? ['✅','Prêt à partir'] : pct >= 75 ? ['🎒','Presque prêt'] : pct >= 45 ? ['🧩','En préparation'] : pct >= 15 ? ['✏️','Esquisse'] : ['💭','Rêve'];
    const A = [26, 92], B = [180, -4], C = [334, 92], path = `M${A} Q${B} ${C}`;
    const q = u => [(1-u)*(1-u)*A[0] + 2*(1-u)*u*B[0] + u*u*C[0], (1-u)*(1-u)*A[1] + 2*(1-u)*u*B[1] + u*u*C[1]];
    const h0 = items(i=>i.cat==='hotel' && i.date).sort((a,b)=>a.date.localeCompare(b.date))[0], co = h0 ? (M.ctry||{})[normQ(cityOf(h0.titre))] : null;
    const jd = t.debut ? nights(isoToday(), t.debut) : 0, tp = Math.max(.02, pct / 100);
    return `<div class="cv-prep2${open ? ' open' : ''}">
      <div class="p2-top"><div><div class="p2-k">Niveau de préparation</div><div class="p2-l">${lv[0]} ${lv[1]}</div></div><div class="p2-pct"><b>${pct}</b><small>%</small></div></div>
      <svg class="p2-svg" viewBox="0 0 360 112" aria-hidden="true">
        <path d="${path}" class="p2-base"/><path d="${path}" class="p2-prog" pathLength="100" style="--p:${pct}"/>
        ${S.map((s,i)=>{ const [x,y] = q(i / (S.length - 1)); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i < done ? 6 : 4.5}" class="${i < done ? 'on' : ''}" style="animation-delay:${(i * .12).toFixed(2)}s"/>`; }).join('')}
        <text x="${A[0]}" y="${A[1] + 18}" text-anchor="middle" class="p2-end">🏠</text><text x="${C[0]}" y="${C[1] + 18}" text-anchor="middle" class="p2-end">${co && co.cc ? flag(co.cc) : '📍'}</text>
        <g class="p2-plane"><text x="-12" y="8" font-size="24" transform="rotate(45)">✈️</text>
          <animateMotion dur="1.8s" fill="freeze" keyPoints="0;${tp.toFixed(3)}" keyTimes="0;1" calcMode="spline" keySplines=".2 .7 .2 1" rotate="auto" path="${path}"/></g>
      </svg>
      <div class="p2-msg">${nxt ? `${S.length - done} étape(s) avant le décollage${jd > 0 ? ` · J-${jd}` : ''}` : 'Tout est prêt, il ne reste qu’à partir !'}</div>
      ${nxt ? `<button type="button" class="p2-next" onclick="${nxt.fn}"><span>Prochaine étape :</span> <b>${nxt.l}</b><i>→</i></button>` : ''}
      <button type="button" class="p2-tog" onclick="CV.prepTog()">${open ? 'Masquer les étapes' : 'Voir les étapes'}</button>
      ${open ? `<div class="p2-list">${SA.map(s=>`<button type="button" class="${s.ok ? 'ok' : ''}" onclick="${s.fn}"><i>${s.ok ? '✓' : '○'}</i><span>${s.l}</span>${s.n ? `<small>${s.n}</small>` : s.opt && !s.ok ? `<small>facultatif</small>` : ''}</button>`).join('')}</div>` : ''}</div>`;
  }
