/* Vezoria — code de l’appli, partie 4/8 (chargées dans l’ordre par index.html, même portée globale) */

  const fxFormRow = () => `<div class="cv-fx"><span>💱</span><input class="v-in" id="fx-a" inputmode="decimal" placeholder="Montant en devise"><select class="v-in" id="fx-c">${fxOpts(M.fxLast||'USD')}</select><button type="button" class="v-btn sec" onclick="CV.fxFill()" aria-label="Convertir">→ ${CS()}</button></div><div class="v-sum-small" id="fx-n" style="margin:-4px 0 8px"></div>`;

  /* ---------- 🌤️ Météo ---------- */
  function tlStages(){
    const seen = []; items(i=>i.cat==='hotel' && i.date).sort((a,b)=>a.date.localeCompare(b.date)).forEach(h=>{
      const c = stayCity(h); if(!c) return;
      const last = seen[seen.length-1];
      if(last && normQ(last.city) === normQ(c)) last.fin = h.dateFin || last.fin; else seen.push({city:c, debut:h.date, fin:h.dateFin || h.date, h});
    });
    return seen;
  }
  async function meteoFor(st){
    const key = 'mt:' + normQ(st.city) + ':' + st.debut + ':' + st.fin; M.meteo = M.meteo || {};
    const hit = M.meteo[key]; if(hit && Date.now() - hit.t < 6*3600e3) return hit.v;
    const c = await geocode(st.city, null); if(!c) throw new Error('ville introuvable');
    const days = (new Date(st.debut) - new Date(isoToday())) / 864e5;
    let v;
    if(days >= -1 && days <= 14){
      const end = st.fin > st.debut ? st.fin : st.debut;
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto&start_date=${st.debut}&end_date=${end}`);
      const j = await r.json(); const d = j.daily || {};
      v = {kind:'prev', max:Math.round(Math.max(...d.temperature_2m_max)), min:Math.round(Math.min(...d.temperature_2m_min)), pluie:Math.max(...(d.precipitation_probability_max||[0])), code:(d.weathercode||[])[0]};
    } else {
      const y = new Date().getFullYear() - (st.debut.slice(5) > isoToday().slice(5) ? 1 : 0);
      const shift = s => (y + s.slice(4));
      const r = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${c.lat}&longitude=${c.lng}&start_date=${shift(st.debut)}&end_date=${shift(st.fin > st.debut ? st.fin : st.debut)}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`);
      const j = await r.json(); const d = j.daily || {}; const mx = d.temperature_2m_max||[], mn = d.temperature_2m_min||[];
      if(!mx.length) throw new Error('pas de données');
      const avg = a => Math.round(a.reduce((s,x)=>s+(x||0),0)/a.length);
      v = {kind:'clim', year:y, max:avg(mx), min:avg(mn), jp:(d.precipitation_sum||[]).filter(x=>x>=1).length, n:mx.length};
    }
    M.meteo[key] = {t:Date.now(), v}; persist(); return v;
  }
  const meteoIcon = v => v.max >= 28 ? '☀️' : v.max >= 18 ? '🌤️' : v.max >= 8 ? '🌥️' : '❄️';
  async function tlMeteo(){
    const st = tlStages(); if(!st.length){ alert('Ajoute des hébergements (avec ville et dates) pour voir la météo des étapes.'); return; }
    openSheet(`<h2>🌤️ Météo des étapes</h2><div id="mt-list">${st.map((s,i)=>`<div class="cv-dayi" id="mt-${i}"><b>${esc(s.city)}</b> · ${fshort(s.debut)} → ${fshort(s.fin)}<div class="v-sum-small">…</div></div>`).join('')}</div>
      <div class="v-sum-small" style="margin-top:8px">Données Open-Meteo. Prévisions jusqu’à 14 jours ; au-delà, relevés de l’an dernier aux mêmes dates.</div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
    for(let i=0;i<st.length;i++){
      const el = document.querySelector('#mt-' + i + ' .v-sum-small'); if(!el) return;
      try { const v = await meteoFor(st[i]);
        el.innerHTML = v.kind === 'prev' ? `${meteoIcon(v)} <b>${v.min}° → ${v.max}°</b> · risque de pluie jusqu’à ${v.pluie} % <i>(prévisions)</i>`
          : `${meteoIcon(v)} <b>${v.min}° → ${v.max}°</b> en moyenne · ${v.jp} jour${v.jp>1?'s':''} de pluie sur ${v.n} <i>(relevés ${v.year})</i>`;
      } catch(e){ el.textContent = '⚠️ indisponible (' + e.message + ')'; }
    }
  }

  /* ---------- 🧾 Tickets et reçus ---------- */
  let rcpt = null;
  function tlReceipt(){
    rcpt = {photo:null, blob:null};
    const v = tv();
    openSheet(`<h2>🧾 Ticket ou reçu</h2>
      <button type="button" class="v-btn sec" onclick="CV.tlRcPhoto(true)">📸 Prendre la photo du ticket</button><button type="button" class="v-btn sec" onclick="CV.tlRcPhoto(false)">🖼️ Choisir dans mes photos</button>
      <div id="rc-prev" class="v-sum-small" style="margin:8px 0"></div>
      <form id="v-form" onsubmit="event.preventDefault();CV.tlRcSave()">
        ${field('Quoi ?','titre','','text','placeholder="Ex. Dîner à Trastevere" required')}
        <div class="cv-fx"><input class="v-in" name="montant" id="rc-m" inputmode="decimal" placeholder="Montant" required oninput="CV.rcFx()"><select class="v-in" id="rc-c" onchange="CV.rcFx()"><option>${curCode()}</option>${fxOpts(M.fxLast||'')}</select><button type="button" class="v-btn sec" id="rc-cv" onclick="CV.rcFx(1)">Convertir</button></div><div class="v-sum-small" id="rc-fx" style="margin:-4px 0 8px"></div>
        <div class="v-f"><label>Payé par</label><select class="v-in" id="rc-p">${v.map(p=>`<option value="${p}"${p===M.me?' selected':''}>${esc(pname(p))}</option>`).join('')}</select></div>
        <div class="v-f"><label>Partagé entre</label><select class="v-in" id="rc-s"><option value="all">Tout le monde (parts égales)</option>${v.map(p=>`<option value="${p}">${esc(pname(p))} seul(e)</option>`).join('')}</select></div>
        ${actions('')}
      </form>`);
  }
  let rcFxT = null;
  async function rcFx(apply){   // conversion en direct : « 25 USD ≈ 22,73 € » ; 💱 remplace le montant par sa valeur convertie
    const m = num((document.getElementById('rc-m')||{}).value), sel = document.getElementById('rc-c'), out = document.getElementById('rc-fx'); if(!sel || !out) return;
    const cur = sel.value, h = curCode();
    if(cur === h){ out.textContent = apply ? 'Choisis la devise du ticket dans la liste, puis touche Convertir.' : (rcpt && rcpt.fxNote ? '💱 ' + rcpt.fxNote : ''); return; }
    if(!m){ out.textContent = apply ? 'Saisis d’abord le montant.' : ''; return; }
    clearTimeout(rcFxT);
    const go = async () => { try { const e = Math.round(await fxToEur(m, cur) * 100) / 100; M.fxLast = cur; persist();
      const note = m.toLocaleString((window.I18N ? I18N.locale : 'fr-FR')) + ' ' + cur;
      if(apply){ document.getElementById('rc-m').value = String(e).replace('.', ','); sel.value = h; if(rcpt) rcpt.fxNote = note; out.textContent = '💱 ' + note + ' = ' + eur(e); }
      else out.textContent = note + ' ≈ ' + eur(e) + ' · touche Convertir'; } catch(e){ out.textContent = '⚠️ ' + e.message; } };
    if(apply) go(); else rcFxT = setTimeout(go, 300);
  }
  function tlRcPhoto(cam){
    tlPickFile('image/*', async f => {
      rcpt.blob = f; const pv = document.getElementById('rc-prev');
      pv.innerHTML = `<img src="${URL.createObjectURL(f)}" style="max-width:100%;max-height:180px;border-radius:10px;display:block;margin-bottom:6px"><button type="button" class="v-btn sec" onclick="CV.tlRcOcr()">🔍 Lire le montant automatiquement</button><span id="rc-ocr"></span>`;
    }, cam !== false);
  }
  async function tlRcOcr(){
    const o = document.getElementById('rc-ocr'); if(!rcpt || !rcpt.blob) return;
    o.textContent = ' ⏳ Lecture du ticket… (la 1re fois, l’outil se télécharge : ~15 s)';
    try {
      await ocrLib();
      const small = await shrink(rcpt.blob, 1600, 0.85);
      const {data} = await Tesseract.recognize(small, 'fra+eng', OCR_OPT());
      const txt = (data && data.text) || '';
      const nums = l => (l.match(/\d{1,5}(?:[ .]\d{3})*[.,]\d{2}\b/g) || []).map(x=>parseFloat(x.replace(/[ .](?=\d{3}\b)/g,'').replace(',', '.')));
      let val = null;
      txt.split('\n').some(l => { if(/total|à payer|a payer|montant|net|amount|importe|totale/i.test(l)){ const n = nums(l); if(n.length){ val = Math.max(...n); return true; } } return false; });
      if(val == null){ const all = nums(txt); if(all.length) val = Math.max(...all); }
      if(val == null) throw new Error('aucun montant reconnu');
      document.getElementById('rc-m').value = String(val).replace('.', ',');
      o.textContent = ' ✓ ' + val.toLocaleString((window.I18N ? I18N.locale : 'fr-FR')) + ' lu — vérifie avant d’enregistrer.';
    } catch(e){ o.textContent = ' ⚠️ ' + e.message + ' : saisis le montant à la main.'; }
  }
  async function tlRcSave(){
    const f = document.getElementById('v-form'), titre = f.titre.value.trim(); let m = num(f.montant.value); const cur = document.getElementById('rc-c').value;
    if(!titre || !m) return;
    let note = (rcpt && rcpt.fxNote) || '';
    if(cur !== curCode()){ try { const e = await fxToEur(m, cur); note = m.toLocaleString((window.I18N ? I18N.locale : 'fr-FR')) + ' ' + cur; m = Math.round(e*100)/100; } catch(e){ alert(e.message); return; } }
    const payeur = document.getElementById('rc-p').value, share = document.getElementById('rc-s').value;
    const it = {id:'i'+uid(), type:'item', trip:M.trip, cat:'divers', titre, date:isoToday(), statut:'paid', prix:String(m), partage:'grp', payeur, qui: share==='all' ? [] : [share], note};
    if(rcpt && rcpt.blob){ const pid = 'rc' + uid(); try { await storePhoto(rcpt.blob, pid); it.recu = pid; } catch(e){} }
    put(it, '🧾 Dépense ajoutée' + (note ? ' (' + note + ')' : '')); closeSheet(true); refresh(); uploadQueue(); capWarn();
  }
  function tlReceipts(){
    const l = items(i=>i.recu).sort((a,b)=>(b.date||'').localeCompare(a.date||'') || (b.createdAt||0)-(a.createdAt||0));
    openSheet(`<h2>🗂️ Mes tickets</h2><div class="v-sum-small" style="margin-bottom:8px">${l.length} ticket${l.length>1?'s':''} · touche une photo pour l’agrandir.</div>
      <div class="cv-rcl">${l.map(it=>`<button type="button" class="cv-rc" onclick="CV.rcView('${it.id}')"><img data-ph="${esc(it.recu)}.t" alt=""><span><b>${esc(it.titre)}</b><small>${it.date ? fshort(it.date) + ' · ' : ''}${eur(num(it.prix))}${it.note ? ' · ' + esc(it.note) : ''}${it.payeur && it.payeur !== 'chacun' ? ' · payé par ' + esc(pname(it.payeur)) : ''}</small></span></button>`).join('') || '<div class="v-sum-small">Aucun ticket.</div>'}</div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.tlReceipt()">🧾 Ajouter un ticket</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
    hydrate();
  }
  function rcView(id){
    const it = R[id]; if(!it || !it.recu) return;
    openSheet(`<h2>🧾 ${esc(it.titre)}</h2><div class="v-sum-small" style="margin-bottom:8px">${it.date ? fdate(it.date) + ' · ' : ''}<b>${eur(num(it.prix))}</b>${it.note ? ' (' + esc(it.note) + ')' : ''}</div>
      <img data-ph="${esc(it.recu)}" alt="Ticket" style="width:100%;border-radius:12px;display:block;background:#eee;min-height:120px">
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.tlReceipts()">← Mes tickets</button><button type="button" class="v-btn sec" onclick="CV.edit('${id}')">✏️ Dépense</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
    hydrate();
  }
  async function rcAttach(id){
    tlPickFile('image/*', async f => { const pid = 'rc' + uid(); try { await storePhoto(f, pid); } catch(e){ alert('Photo impossible à enregistrer.'); return; }
      const it = clone(R[id]); it.recu = pid; put(it, '🧾 Ticket ajouté'); uploadQueue(); rcView(id); }, true);
  }
  /* ---------- 🗺️ Carte du voyage ---------- */
  function geoCached(city){ const r = R['geo:' + normQ(city)]; return r && !r.deleted && r.lat != null ? {lat:r.lat, lng:r.lng} : null; }
  function tripMapSVG(pts){
    if(pts.length < 1) return '';
    const W = 600, H = 300, pad = 34, lat0 = pts.reduce((s,p)=>s+p.lat,0)/pts.length, kx = Math.cos(lat0*Math.PI/180);
    const X = pts.map(p=>p.lng*kx), Y = pts.map(p=>-p.lat), mnX = Math.min(...X), mxX = Math.max(...X), mnY = Math.min(...Y), mxY = Math.max(...Y);
    const sc = Math.min((W-2*pad)/Math.max(mxX-mnX,1e-3), (H-2*pad)/Math.max(mxY-mnY,1e-3)), ox = (W-(mxX-mnX)*sc)/2, oy = (H-(mxY-mnY)*sc)/2;
    const P = pts.map((_,i)=>[Math.round(((X[i]-mnX)*sc+ox)*10)/10, Math.round(((Y[i]-mnY)*sc+oy)*10)/10]);
    let tot = 0; for(let i=1;i<pts.length;i++) tot += km(pts[i-1], pts[i]);
    let g = `<rect width="${W}" height="${H}" rx="12" fill="#f4f1fb"/>`;
    for(let x=0;x<=W;x+=60) g += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#e7e0f3"/>`; for(let y=0;y<=H;y+=60) g += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#e7e0f3"/>`;
    g += `<polyline points="${P.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#7C3AED" stroke-width="3" stroke-dasharray="7 5" stroke-linecap="round"/>`;
    P.forEach(([a,b],i)=>{ const right = a < W - 140;
      g += `<circle cx="${a}" cy="${b}" r="12" fill="#2A1238"/><text x="${a}" y="${b+4.5}" font-size="12" font-weight="700" fill="#fff" text-anchor="middle" font-family="sans-serif">${i+1}</text>
        <text x="${right ? a+16 : a-16}" y="${b+4}" font-size="13" font-weight="700" fill="#2A1238" text-anchor="${right?'start':'end'}" font-family="sans-serif" paint-order="stroke" stroke="#f4f1fb" stroke-width="4">${esc(pts[i].lbl)}</text>`; });
    return `<figure class="pr-map"><svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Carte du voyage">${g}</svg>
      <figcaption>🗺️ ${pts.length} étape${pts.length>1?'s':''} · ≈ ${Math.round(tot).toLocaleString((window.I18N ? I18N.locale : 'fr-FR'))} km à vol d’oiseau entre les étapes</figcaption></figure>`;
  }
  function tripMapCached(){
    const st = tlStages(); if(st.length < 2) return '';
    const pts = st.map(s=>{ const c = geoCached(s.city); return c ? {lat:c.lat, lng:c.lng, lbl:s.city} : null; });
    return pts.every(Boolean) ? tripMapSVG(pts) : '';
  }
  function tlMap(){
    if(!tlStages().length){ alert('Ajoute des hébergements avec leur ville pour dessiner la carte.'); return; }
    openSheet(`<h2>🗺️ Carte du voyage</h2><div data-tmap="1"></div><div class="v-sum-small">Fond de carte © contributeurs OpenStreetMap. Elle est aussi ajoutée au carnet de route PDF.</div><div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  /* ---------- 🧳 Bagages ---------- */
  /* ---------- 🛂 Formalités d’entrée selon le pays et le passeport (règles générales, à vérifier avant le départ) ---------- */
  const SCH = 'AT BE BG CH CZ DE DK EE ES FI FR GR HR HU IS IT LI LT LU LV MT NL NO PL PT RO SE SI SK'.split(' ');
  const EUX = 'IE CY MC SM VA AD'.split(' ');   // UE hors Schengen et micro-États : carte d’identité aussi
  const ID_OK = 'AL BA ME MK RS TR GE MD XK FO GI'.split(' ');   // carte d’identité acceptée pour beaucoup d’Européens
  const EU_CEAM = 'AT BE BG CH CY CZ DE DK EE ES FI FR GR HR HU IE IS IT LI LT LU LV MT NL NO PL PT RO SE SI SK'.split(' ');
  const PLUG = {GB:'G',IE:'G',MT:'G',CY:'G',HK:'G',SG:'G',MY:'G',AE:'G',QA:'G',KE:'G',US:'A/B',CA:'A/B',MX:'A/B',JP:'A/B',CO:'A/B',CU:'A/B',DO:'A/B',PH:'A/B',TW:'A/B',
    AU:'I',NZ:'I',CN:'I/A',AR:'I',FJ:'I',CH:'J',LI:'J',IT:'L',BR:'N',IN:'D/M',ZA:'M/N',IL:'H',TH:'A/B/O',LK:'D/G',NP:'D',MV:'G',MU:'G',SC:'G',JM:'A/B',CR:'A/B',PE:'A/C',EC:'A/B',VN:'A/C',ID:'C/F'};
  const BAG_FROM = [['eu','🇪🇺 UE · Schengen · Suisse'],['gb','🇬🇧 Royaume-Uni'],['us','🇺🇸 États-Unis'],['ca','🇨🇦 Canada'],['other','🌍 Autre pays']];
  function entryRules(cc, from){
    const inEU = SCH.includes(cc) || EUX.includes(cc), out = {doc:'', x:[]};
    const X = {US:'ESTA (en ligne, au moins 72 h avant le départ)', CA:'AVE / eTA du Canada si tu arrives en avion (en ligne)', GB:'Autorisation ETA du Royaume-Uni (en ligne, avant le départ)',
      AU:'Autorisation eVisitor ou ETA pour l’Australie (en ligne)', NZ:'NZeTA pour la Nouvelle-Zélande (en ligne)', IN:'e-Visa indien (en ligne)', EG:'Visa pour l’Égypte (e-Visa en ligne ou à l’arrivée)',
      IL:'ETA-IL pour Israël (en ligne)', LK:'ETA pour le Sri Lanka (en ligne)', KH:'Visa pour le Cambodge (e-Visa ou à l’arrivée)', LA:'Visa pour le Laos (e-Visa ou à l’arrivée)', NP:'Visa pour le Népal (en ligne ou à l’arrivée)',
      KE:'eTA pour le Kenya (en ligne)', TZ:'Visa pour la Tanzanie (e-Visa en ligne)', CU:'Carte de tourisme / e-Visa pour Cuba', TH:'Carte d’arrivée numérique TDAC (en ligne, dans les 3 jours avant l’arrivée)',
      KR:'K-ETA pour la Corée du Sud : vérifie si elle est exigée à tes dates', CN:'Chine : vérifie que l’exemption de visa court séjour s’applique à tes dates', JP:'Visit Japan Web pour les formalités d’arrivée (conseillé)',
      ID:'Visa à l’arrivée (e-VOA) pour l’Indonésie, + taxe touristique à Bali', TR:'', MA:'', TN:''};
    if(from === 'eu'){
      if(inEU){ out.doc = 'Carte d’identité ou passeport en cours de validité'; if(EU_CEAM.includes(cc)) out.x.push('Carte européenne d’assurance maladie (CEAM)'); return out; }
      if(ID_OK.includes(cc)){ out.doc = 'Carte d’identité acceptée pour beaucoup d’Européens (passeport conseillé)'; return out; }
      out.doc = cc === 'GB' ? 'Passeport (la carte d’identité ne suffit plus)' : cc === 'US' ? 'Passeport électronique (biométrique)' : 'Passeport (souvent valable 6 mois après le retour)';
      if(X[cc]) out.x.push(X[cc]); else if(X[cc] === undefined) out.x.push('Vérifie s’il faut un visa (fiche « Conseils aux voyageurs » du pays)');
      return out;
    }
    // passeport britannique, américain, canadien ou autre
    if(inEU){ out.doc = 'Passeport (valable au moins 3 mois après la sortie de l’espace Schengen)';
      out.x.push('Enregistrement biométrique EES à la frontière (prévois du temps)', 'ETIAS : vérifie s’il est déjà exigé à tes dates');
      if(from === 'other') out.x.push('Vérifie s’il faut un visa Schengen pour ta nationalité'); return out; }
    out.doc = 'Passeport (souvent valable 6 mois après le retour)';
    const home = {gb:'GB', us:'US', ca:'CA'}[from];
    if(cc === home) { out.doc = 'Passeport ou pièce d’identité de ton pays'; return out; }
    if(from === 'us' && cc === 'CA' || from === 'ca' && cc === 'US') { out.doc = 'Passeport (ou carte NEXUS / permis Enhanced)'; return out; }
    if(from !== 'other' && X[cc] && !(from === 'gb' && cc === 'GB')) out.x.push(X[cc]);
    else out.x.push('Vérifie s’il faut un visa pour ta nationalité');
    return out;
  }
  // pays du voyage : hébergements, souvenirs, trajets, titre (le nom du pays est cherché une fois puis gardé)
  function bagCities(){
    const t = trip(), cs = new Set();
    items(i=>i.cat==='hotel').forEach(h=>{ const c = stayCity(h); if(c) cs.add(c); });
    // la ville de départ (premier trajet) n’est pas une destination : le retour y ramène
    const tr = items(i=>i.cat==='transport').sort((a, b)=>(a.date||'').localeCompare(b.date||'')), home = tr[0] && tr[0].from ? normQ(cityOf(tr[0].from)) : '';
    tr.forEach(i=>{ const c = i.to && cityOf(i.to); if(c && normQ(c) !== home) cs.add(c); });
    if(t && t.titre && ccOf(t.titre)) cs.add(t.titre);
    return [...cs].filter(c=>normQ(c) !== home).slice(0, 12);
  }
  function bagCcs(){
    const t = trip(), out = new Set();
    bagCities().forEach(c=>{ const k = (M.ctry || {})[normQ(c)]; if(k && k.cc) out.add(k.cc); const d = ccOf(c); if(d) out.add(d); });
    souvs().forEach(s=>{ const cc = s.cc || ccOf(s.pays); if(cc) out.add(cc); });
    const home = (M.bagHome || '').toUpperCase(); if(home) out.delete(home);   // le pays de départ n’est pas une destination
    return [...out];
  }
  const ccName = cc => { try { return new Intl.DisplayNames([(window.I18N && I18N.lang) || 'fr'], {type:'region'}).of(cc); } catch(e){ return cc; } };
  function bagFromDefault(){ return M.bagFrom || (/^(fr|de|es|it|pt|nl)/.test(((window.I18N && I18N.lang) || navigator.language || 'fr')) ? 'eu' : 'other'); }
  function bagEntryHtml(){
    const from = (document.getElementById('bg-from') || {}).value || bagFromDefault();
    const txt = ((document.getElementById('bg-cc') || {}).value || '').split(',').map(x=>x.trim()).filter(Boolean);
    const ccs = [...new Set(txt.map(ccOf).filter(Boolean))];
    if(!ccs.length) return `<div class="v-sum-small">Indique les pays visités pour voir les papiers à prévoir.</div>`;
    return ccs.map(cc=>{ const r = entryRules(cc, from); return `<div class="bg-ent"><b>${flag(cc)} ${esc(ccName(cc))}</b><span><i>🪪</i> ${esc(r.doc)}</span>${r.x.map(x=>`<span><i>📝</i> ${esc(x)}</span>`).join('')}${PLUG[cc] && from === 'eu' ? `<span><i>🔌</i> Prise de type ${esc(PLUG[cc])} : adaptateur</span>` : ''}</div>`; }).join('')
      + `<div class="v-sum-small" style="margin-top:6px">Règles générales pour un court séjour touristique. Vérifie toujours avant de partir sur diplomatie.gouv.fr (Conseils aux voyageurs) ou le site officiel du pays.</div>`;
  }
  function bagEntryUpd(){ const e = document.getElementById('bg-ent'); if(e) e.innerHTML = bagEntryHtml(); try { M.bagFrom = document.getElementById('bg-from').value; persist(); } catch(x){} }
  async function bagCcFill(){
    const inp = document.getElementById('bg-cc'); if(!inp || inp.dataset.edited) return;
    const names = () => bagCcs().map(ccName).join(', ');
    inp.value = names(); bagEntryUpd();
    for(const c of bagCities()){ if((M.ctry || {})[normQ(c)] || ccOf(c)) continue; try { await countryOf(c); } catch(e){} if(!document.getElementById('bg-cc') || inp.dataset.edited) return; inp.value = names(); bagEntryUpd(); }
  }
  function tlBags(){
    const t = trip(), v = tv(), n = Math.max(1, nights(t.debut, t.fin || t.debut)), from = bagFromDefault();
    openSheet(`<h2>🧳 Liste de bagages</h2><div class="v-sum-small" style="margin-bottom:8px">${n} nuit${n>1?'s':''}. La liste s’ajoute à la ✅ Checklist, cochable par chacun.</div>
      <div class="v-f"><label>Pour qui ?</label><select class="v-in" id="bg-who"><option value="">Tout le monde (une liste commune)</option>${v.map(p=>`<option value="${p}">${esc(pname(p))}</option>`).join('')}<option value="each">Une liste par voyageur</option></select></div>
      <div class="v-f"><label>🛂 Ton passeport ou ta carte d’identité vient de…</label><select class="v-in" id="bg-from" onchange="CV.bagEntryUpd()">${BAG_FROM.map(([k,l])=>`<option value="${k}"${k===from?' selected':''}>${l}</option>`).join('')}</select></div>
      <div class="v-f"><label>Pays visités</label><input class="v-in" id="bg-cc" placeholder="Ex. Italie, Malte" oninput="this.dataset.edited=1;CV.bagEntryUpd()"></div>
      <div id="bg-ent" class="bg-ents"></div>
      <div class="v-f"><label>Climat</label><select class="v-in" id="bg-cl"><option value="auto">Automatique (météo des étapes)</option><option value="chaud">Chaud</option><option value="doux">Tempéré</option><option value="froid">Froid</option></select></div>
      <div class="v-f"><label>Activités</label>${[['plage','🏖️ Plage / piscine'],['rando','🥾 Randonnée'],['ville','🏙️ Ville & soirées'],['sport','⛷️ Sport / ski'],['pro','💼 Travail'],['enfant','👶 Avec enfants']].map(([k,l])=>`<label class="cv-checkline"><input type="checkbox" id="bg-${k}"${k==='ville'?' checked':''}> ${l}</label>`).join('')}</div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.tlBagsGo()">🧳 Ajouter à la checklist</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
    bagCcFill();
  }
  async function tlBagsGo(){
    const t = trip(), n = Math.max(1, nights(t.debut, t.fin || t.debut)), q = k => Math.min(n + 1, k);
    const on = k => { const e = document.getElementById('bg-' + k); return e && e.checked; };
    let cl = document.getElementById('bg-cl').value; const who = document.getElementById('bg-who').value;
    const from = (document.getElementById('bg-from') || {}).value || 'eu', ccs = [...new Set(((document.getElementById('bg-cc') || {}).value || '').split(',').map(x=>ccOf(x.trim())).filter(Boolean))];
    M.bagFrom = from;
    if(cl === 'auto'){ cl = 'doux'; try { const st = tlStages(); if(st.length){ const vs = []; for(const s of st.slice(0,4)) vs.push(await meteoFor(s)); const mx = Math.max(...vs.map(v=>v.max)), mn = Math.min(...vs.map(v=>v.min)); cl = mx >= 25 ? 'chaud' : mn <= 5 ? 'froid' : 'doux'; } } catch(e){} }
    // papiers et prises selon les pays : remplacent les lignes génériques
    const ent = [], plugs = new Set(); let needPass = false;
    ccs.forEach(cc=>{ const r = entryRules(cc, from); if(/Passeport/i.test(r.doc) && !/ou passeport|passeport conseillé/i.test(r.doc)) needPass = true;
      r.x.filter(x=>!/CEAM/.test(x)).forEach(x=>ent.push(['🛂 Formalités', x + (ccs.length > 1 ? ' — ' + ccName(cc) : '')])); if(from === 'eu' && PLUG[cc]) plugs.add(PLUG[cc]); });
    const papers = !ccs.length ? 'Pièce d’identité / passeport' : needPass ? 'Passeport (vérifier la date d’expiration)' : 'Carte d’identité ou passeport';
    const plugLine = !ccs.length || from !== 'eu' ? 'Adaptateur de prise' : plugs.size ? 'Adaptateur de prise (type ' + [...plugs].join(', ') + ')' : '';
    const L = [['🧳 Vêtements', `Sous-vêtements ×${q(8)}`], ['🧳 Vêtements', `Chaussettes ×${q(8)}`], ['🧳 Vêtements', `Tee-shirts / hauts ×${q(7)}`], ['🧳 Vêtements', `Pantalons / jupes ×${Math.min(4, Math.ceil(n/3)+1)}`],
      ['🧳 Vêtements', 'Pyjama'], ['🧳 Vêtements', 'Chaussures confortables'], ['🧴 Toilette', 'Trousse de toilette (brosse à dents, dentifrice, déodorant)'], ['🧴 Toilette', 'Médicaments personnels + ordonnances'],
      ['🔌 Tech', 'Chargeurs + batterie externe'], ...(plugLine ? [['🔌 Tech', plugLine]] : []), ['📄 Papiers', papers], ['📄 Papiers', 'Carte bancaire + un peu d’espèces'], ...ent];
    if(ccs.some(cc=>EU_CEAM.includes(cc)) && from === 'eu') L.push(['📄 Papiers', 'Carte européenne d’assurance maladie (CEAM)']);
    if(ccs.some(cc=>!SCH.includes(cc) && !EUX.includes(cc))) L.push(['📄 Papiers', 'Assurance voyage (frais médicaux à l’étranger)']);
    const owners = who === 'each' ? tv() : [who];
    const out = [];
    owners.forEach(pid => L.forEach(([cat,label],i) => out.push({id:'c'+uid()+i, type:'check', trip:M.trip, cat: pid ? cat + ' · ' + pname(pid) : cat, label, done:false})));
    putMany(out, '🧳 ' + out.length + ' élément(s) ajoutés à la checklist'); closeSheet(true); M.tab = 'check'; refresh();
  }

  /* ---------- 🛂 Documents de voyage ---------- */
  const DOC_KINDS = ['Passeport','Carte d’identité','Visa / ESTA / eVisa','Permis de conduire','Assurance voyage','Carte européenne d’assurance maladie','Vaccination','Autre'];
  const docsOf = pid => list('doc', d=>d.pid===pid).sort((a,b)=>(a.expire||'').localeCompare(b.expire||''));
  function docIssues(){
    const t = trip(); if(!t || !t.fin) return [];
    const out = [], fin = t.fin, plus6 = (()=>{ const d = new Date(fin); d.setMonth(d.getMonth()+6); return d.toISOString().slice(0,10); })();
    tv().forEach(pid=>docsOf(pid).forEach(d=>{
      if(!d.expire) return;
      if(d.expire < fin) out.push(`${d.kind} de ${pname(pid)} expiré avant le retour (${fdate(d.expire)})`);
      else if(d.kind === 'Passeport' && d.expire < plus6) out.push(`passeport de ${pname(pid)} valable moins de 6 mois après le retour`);
    }));
    return out;
  }
  /* ══════════ 🧭 Avant de partir : tout ce qui dépend des pays visités, rangé par thème (une rubrique ouverte à la fois) ══════════
     Règles générales et ordres de grandeur : chaque rubrique renvoie vers la source officielle à vérifier. */
  const EURO_CC = 'AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK MC SM VA AD ME XK GP MQ RE GF YT PM BL MF'.split(' ');
  const CUR2 = {VN:'VND', ID:'IDR', SG:'SGD', MY:'MYR', PH:'PHP', EG:'EGP', IS:'ISK', HK:'HKD', TW:'TWD', AR:'ARS', PE:'PEN', CO:'COP', CL:'CLP', IL:'ILS', JO:'JOD', LK:'LKR', NP:'NPR', MV:'MVR', MU:'MUR', DO:'DOP', KE:'KES', TZ:'TZS', PF:'XPF', NC:'XPF', SN:'XOF', CR:'CRC', QA:'QAR', KH:'KHR', LA:'LAK'};
  const SOS = {US:'911', CA:'911', MX:'911', AR:'911', GB:'999 · 112', HK:'999', JP:'110 police · 119 ambulance et pompiers', KR:'112 police · 119 ambulance et pompiers', CN:'110 police · 120 ambulance · 119 pompiers', TW:'110 police · 119 ambulance et pompiers',
    SG:'999 police · 995 ambulance', AU:'000', NZ:'111', IN:'112', TH:'191 police · 1669 ambulance · 1155 police touristique', TR:'112', EG:'122 police · 123 ambulance', ZA:'10111 police · 10177 ambulance', BR:'190 police · 192 ambulance · 193 pompiers', MA:'19 police · 15 ambulance'};
  const TIP = {US:'15 à 20 % au restaurant, c’est l’usage', CA:'15 à 20 % au restaurant, c’est l’usage', JP:'Pas de pourboire : ça peut même gêner', KR:'Pas d’usage de pourboire', CN:'Pas d’usage de pourboire', GB:'Souvent 10 à 12,5 % déjà inclus (« service charge ») : vérifie l’addition'};
  const TZ = {JP:'Asia/Tokyo', CN:'Asia/Shanghai', KR:'Asia/Seoul', TW:'Asia/Taipei', HK:'Asia/Hong_Kong', TH:'Asia/Bangkok', VN:'Asia/Ho_Chi_Minh', KH:'Asia/Phnom_Penh', LA:'Asia/Vientiane', SG:'Asia/Singapore', MY:'Asia/Kuala_Lumpur', PH:'Asia/Manila', ID:'Asia/Jakarta', IN:'Asia/Kolkata', LK:'Asia/Colombo', NP:'Asia/Kathmandu', MV:'Indian/Maldives', AE:'Asia/Dubai', QA:'Asia/Qatar', JO:'Asia/Amman', IL:'Asia/Jerusalem', TR:'Europe/Istanbul', EG:'Africa/Cairo', MA:'Africa/Casablanca', TN:'Africa/Tunis', SN:'Africa/Dakar', KE:'Africa/Nairobi', TZ:'Africa/Dar_es_Salaam', ZA:'Africa/Johannesburg', MU:'Indian/Mauritius', RE:'Indian/Reunion',
    GB:'Europe/London', IE:'Europe/Dublin', PT:'Europe/Lisbon', IS:'Atlantic/Reykjavik', GR:'Europe/Athens', FI:'Europe/Helsinki', US:'America/New_York', CA:'America/Toronto', MX:'America/Mexico_City', CU:'America/Havana', DO:'America/Santo_Domingo', CR:'America/Costa_Rica', CO:'America/Bogota', PE:'America/Lima', CL:'America/Santiago', AR:'America/Argentina/Buenos_Aires', BR:'America/Sao_Paulo', GP:'America/Guadeloupe', MQ:'America/Martinique', PF:'Pacific/Tahiti', NC:'Pacific/Noumea', AU:'Australia/Sydney', NZ:'Pacific/Auckland'};
  const TZ_MULTI = {US:'New York', CA:'Toronto', AU:'Sydney', BR:'São Paulo', MX:'Mexico', ID:'Jakarta'};
  function tzOff(tz, d){ try { const p = new Intl.DateTimeFormat('en-US', {timeZone:tz, timeZoneName:'shortOffset'}).formatToParts(d).find(x=>x.type === 'timeZoneName'); const m = /GMT([+-]\d+)(?::(\d+))?/.exec(p ? p.value : ''); return m ? +m[1] + (m[2] ? Math.sign(+m[1] || 1) * +m[2] / 60 : 0) : (p && p.value === 'GMT' ? 0 : null); } catch(e){ return null; } }
  function avantData(){
    const t = trip(), from = bagFromDefault(), ccs = bagCcs(), d0 = t && t.debut ? new Date(t.debut + 'T12:00:00') : new Date(), here = -d0.getTimezoneOffset() / 60;
    const nm = cc => `${flag(cc)} ${esc(ccName(cc))}`, li = (ic, h) => `<div class="av-li"><i>${ic}</i><span>${h}</span></div>`;
    const S = [];
    // 🛂 papiers
    { const di = docIssues(); const rows = ccs.map(cc=>{ const r = entryRules(cc, from); return li('🪪', `<b>${nm(cc)}</b> · ${esc(r.doc)}`) + r.x.filter(x=>!/CEAM/.test(x)).map(x=>li('📝', esc(x))).join(''); }).join('');
      S.push({k:'pap', ic:'🛂', t:MSGT('Papiers et entrée'), warn:di.length, h:(di.length ? di.map(x=>li('⚠️', `<b>${esc(x)}</b>`)).join('') : '') + (rows || li('📍', esc(MSGT('Ajoute les villes du voyage pour voir les papiers de chaque pays.')))) + `<button type="button" class="ar-more" onclick="CV.tlDocs()">🪪 ${MSGT('Mes documents (dates d’expiration)')}</button>`}); }
    // ❤️ santé
    { const eu = ccs.length && ccs.every(cc=>EU_CEAM.includes(cc)), out = ccs.some(cc=>!EU_CEAM.includes(cc));
      S.push({k:'san', ic:'❤️', t:MSGT('Santé et assurance'), h:(eu && from === 'eu' ? li('💳', esc(MSGT('Carte européenne d’assurance maladie (CEAM), une par personne'))) : '') + (out ? li('🛡️', esc(MSGT('Assurance voyage qui couvre les frais médicaux et le rapatriement (vérifie celle de ta carte bancaire)'))) : '')
        + li('💉', esc(MSGT('Vaccins : vérifie ceux conseillés pour ce pays 4 à 6 semaines avant le départ (médecin ou centre de vaccinations internationales)'))) + li('🩹', esc(MSGT('Trousse : tes médicaments et ordonnances, de quoi soigner les petits bobos')))}); }
    // 💶 argent
    { const rows = ccs.map(cc=>{ const c = EURO_CC.includes(cc) ? 'EUR' : REGION_CUR[cc] || CUR2[cc]; let n = c; try { n = c ? new Intl.DisplayNames([(window.I18N && I18N.lang) || 'fr'], {type:'currency'}).of(c) + ' (' + c + ')' : ''; } catch(e){}
        return li('💱', `<b>${nm(cc)}</b> · ${c ? esc(n) : esc(MSGT('monnaie à vérifier'))}`) + (TIP[cc] ? li('🍽️', esc(MSGT(TIP[cc]))) : ''); }).join('');
      S.push({k:'arg', ic:'💶', t:MSGT('Argent sur place'), h:rows + li('💳', esc(MSGT('Préviens ta banque si besoin, garde une 2e carte rangée à part et un peu d’espèces')))}); }
    // 📱 téléphone et prises
    { const pl = [...new Set(ccs.map(cc=>PLUG[cc]).filter(Boolean))], eu = ccs.length && ccs.every(cc=>EU_CEAM.includes(cc));
      S.push({k:'tel', ic:'📱', t:MSGT('Téléphone et prises'), h:(pl.length && from === 'eu' ? li('🔌', esc(MSGT('Adaptateur de prise')) + ' : type ' + esc(pl.join(', '))) : '') + li('📶', esc(MSGT(eu ? 'Itinérance en Europe au prix de ton forfait : vérifie auprès de ton opérateur' : 'Hors Europe, l’itinérance coûte cher : eSIM locale ou forfait international')))
        + li('🗺️', esc(MSGT('Télécharge les cartes hors ligne de tes villes et garde tes billets dans l’appli')))}); }
    // 🌙 décalage horaire
    { const rows = []; let mx = 0; ccs.forEach(cc=>{ const tz = TZ[cc]; if(!tz) return; const o = tzOff(tz, d0); if(o == null) return; const df = Math.round((o - here) * 2) / 2; mx = Math.max(mx, Math.abs(df));
        rows.push(li('🕐', `<b>${nm(cc)}</b>${TZ_MULTI[cc] ? ' (' + esc(TZ_MULTI[cc]) + ')' : ''} · ${df === 0 ? esc(MSGT('même heure que chez toi')) : (df > 0 ? '+' : '') + String(df).replace('.5', ' h 30').replace(/^([+-]?\d+)$/, '$1 h')}`)); });
      if(rows.length) S.push({k:'tz', ic:'🌙', t:MSGT('Décalage horaire'), h:rows.join('') + (mx >= 3 ? li('😴', esc(MSGT('3 jours avant, décale ton coucher d’une heure par jour dans le sens du voyage ; sur place, vis tout de suite à l’heure locale et prends la lumière du matin'))) : '')}); }
    // 🚨 urgences
    { const rows = ccs.map(cc=>li('🚨', `<b>${nm(cc)}</b> · ${esc(SOS[cc] || (EU_CEAM.includes(cc) || EURO_CC.includes(cc) ? '112' : MSGT('112 marche depuis un mobile dans beaucoup de pays : vérifie le numéro local')))}`)).join('');
      S.push({k:'sos', ic:'🚨', t:MSGT('Urgences'), h:rows + (from === 'eu' && ((window.I18N && I18N.lang) || 'fr') === 'fr' ? li('🏛️', esc(MSGT('Inscris ton voyage sur Ariane (diplomatie.gouv.fr) : tu reçois les alertes et on peut te joindre en cas de crise'))) : '') + li('📴', esc(MSGT('Note ces numéros et l’adresse de ton hôtel quelque part hors ligne')))}); }
    // 🧳 valise
    { const ck = list('check', c=>c.trip === M.trip), d = ck.filter(c=>c.done).length;
      S.push({k:'val', ic:'🧳', t:MSGT('Valise'), n: ck.length ? d + ' / ' + ck.length : '', h:ck.length ? `<button type="button" class="ar-go" onclick="CV.close();CV.tab('check')">🧳 ${MSGT('Ouvrir ma checklist')} (${d}/${ck.length})</button>` : `<button type="button" class="ar-go" onclick="CV.tlBags()">🧳 ${MSGT('Préparer ma liste de bagages')}</button>`}); }
    return {S, ccs};
  }
  function avantSheet(open){
    const t = trip(); if(!t) return; const {S, ccs} = avantData(), op = open || (M.avOpen || {})[t.id] || S[0].k;
    openSheet(`<h2>🧭 ${esc(MSGT('Avant de partir'))}</h2><div class="v-sum-small" style="margin-bottom:10px">${ccs.length ? ccs.map(cc=>flag(cc) + ' <span data-notr>' + esc(ccName(cc)) + '</span>').join(' · ') : esc(MSGT('Ajoute les villes du voyage pour personnaliser cette liste.'))}</div>
      <div class="av-list">${S.map(x=>`<div class="av-s${x.k === op ? ' open' : ''}"><button type="button" class="av-h" onclick="CV.avantSheet('${x.k === op ? '-' : x.k}')"><i>${x.ic}</i><span>${esc(x.t)}</span>${x.warn ? `<em class="bad">${x.warn}</em>` : x.n ? `<em>${esc(x.n)}</em>` : ''}<b>${x.k === op ? '▴' : '▾'}</b></button>${x.k === op ? `<div class="av-b">${x.h}</div>` : ''}</div>`).join('')}</div>
      <div class="v-sum-small" style="margin-top:10px">${esc(MSGT('Règles générales pour un court séjour touristique : vérifie toujours avant de partir sur diplomatie.gouv.fr (Conseils aux voyageurs) ou le site officiel du pays.'))}</div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">${esc(MSGT('Fermer'))}</button></div>`);
    if(open){ (M.avOpen = M.avOpen || {})[t.id] = open; persist(); }
    // pays pas encore connus : on les cherche, puis on rafraîchit
    if(!ccs.length && bagCities().length) (async ()=>{ for(const c of bagCities()){ if(!(M.ctry || {})[normQ(c)] && !ccOf(c)) { try { await countryOf(c); } catch(e){} } } if(bagCcs().length && document.querySelector('.av-list')) avantSheet(open); })();
  }
  function tlDocs(){
    const v = tv(), di = docIssues();
    openSheet(`<h2>🛂 Documents de voyage</h2>
      ${di.length ? `<div class="cv-warnline" style="margin-bottom:8px">⚠️ ${di.map(esc).join('<br>⚠️ ')}</div>` : ''}
      ${v.map(pid=>`<div class="cv-dayc"><h3>${esc(pname(pid))}</h3>${docsOf(pid).map(d=>`<div class="cv-dayi"><b>${esc(d.kind)}</b>${d.expire ? ' · expire le ' + fdate(d.expire) : ''}${d.num ? ' · n° ' + esc(d.num) : ''}${d.note ? '<div class="v-sum-small">' + esc(d.note) + '</div>' : ''}
        <button type="button" class="v-day-edit" onclick="CV.tlDocEdit('${pid}','${d.id}')">modifier</button></div>`).join('') || '<div class="v-sum-small">Aucun document.</div>'}
        <button type="button" class="v-day-edit" onclick="CV.tlDocEdit('${pid}','')">＋ Ajouter un document</button></div>`).join('')}
      <div class="v-sum-small" style="margin-top:8px">Règle courante : passeport valable au moins 6 mois après le retour pour de nombreux pays hors UE. Vérifie toujours sur diplomatie.gouv.fr (fiches Conseils aux voyageurs).${E2E ? '' : ' <b>Version perso</b> : le numéro est facultatif et, si tu l’indiques, il est stocké en clair sur le serveur de synchro.'}</div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  function tlDocEdit(pid, id){
    const d = id ? R[id] : {kind:'Passeport', expire:'', num:'', note:''};
    openSheet(`<h2>🛂 ${esc(pname(pid))}</h2><form id="v-form" onsubmit="event.preventDefault();CV.tlDocSave('${pid}','${id}')">
      <div class="v-f"><label>Document</label><select class="v-in" name="kind">${DOC_KINDS.map(k=>`<option${k===d.kind?' selected':''}>${k}</option>`).join('')}</select></div>
      ${field('Date d’expiration','expire',d.expire,'date')}
      ${field('Numéro (facultatif)','num',d.num,'text','autocomplete="off"')}
      ${field('Note','note',d.note,'text','placeholder="Ex. ESTA validé, n° de contrat d’assurance…"')}
      <div class="v-actions"><button class="v-btn" type="submit">Enregistrer</button>${id ? `<button type="button" class="v-btn sec cv-sq" onclick="CV.tlDocDel('${id}','${pid}')" aria-label="Supprimer">🗑</button>` : ''}<button type="button" class="v-btn sec cv-sq" onclick="CV.tlDocs()" aria-label="Fermer">✕</button></div></form>`);
  }
  function tlDocSave(pid, id){
    const f = document.getElementById('v-form');
    put(Object.assign(id ? clone(R[id]) : {id:'d'+uid(), type:'doc', pid}, {kind:f.kind.value, expire:f.expire.value, num:f.num.value.trim(), note:f.note.value.trim()}), '🛂 Document enregistré');
    tlDocs();
  }
  async function tlDocDel(id, pid){ if(!(await uiConfirm('Supprimer ce document ?'))) return; const d = clone(R[id]); d.deleted = true; put(d, '🗑 Supprimé'); tlDocs(); }

  /* ---------- 📖 Journal de voyage ---------- */
  function tlJournal(){
    const t = trip(); if(!t) return;
    const ds = tlDays(), all = souvs(), v = tv(), tot = items().reduce((s,i)=>s+totalOf(i),0), nph = all.reduce((s,x)=>s+(x.photos||[]).length,0);
    let d = `<header class="pr-cover"><div class="pr-kicker">Journal de voyage</div><h1>${esc(t.titre)}</h1><p class="pr-dates">${tripDatesLong(t)}</p>${t.sous ? `<p class="pr-route">${esc(t.sous)}</p>` : ''}<p class="pr-who">${v.map(pname).map(esc).join(' · ')}</p></header>`;
    d += tripMapCached();
    ds.forEach((day, i)=>{
      const sv = all.filter(s=>s.date===day), info = dayInfo(day);
      if(!sv.length && !info.plan) return;
      d += `<section class="pr-day jr-day"><h3><span>${PJ(i+1)}</span>${longDate(day)}${info.titre ? ' — ' + esc(info.titre) : ''}</h3>${info.plan ? `<p class="pr-plan">${esc(info.plan)}</p>` : ''}
        ${sv.map(s=>`<div class="jr-s"><h4>${esc(s.titre||'')}</h4>${s.lieu ? `<p class="pr-small">📍 ${esc(s.lieu)}</p>` : ''}${s.texte ? `<p>${esc(s.texte).replace(/\n/g,'<br>')}</p>` : ''}
          ${(s.photos||[]).length ? `<div class="jr-ph">${s.photos.slice(0,6).map(p=>`<img data-ph="${esc(p)}" alt="">`).join('')}</div>` : ''}</div>`).join('')}</section>`;
    });
    const off = all.filter(s=>!ds.includes(s.date));
    if(off.length) d += `<section class="pr-day jr-day"><h3>Autres souvenirs</h3>${off.map(s=>`<div class="jr-s"><h4>${esc(s.titre||'')}</h4>${s.texte ? `<p>${esc(s.texte)}</p>` : ''}${(s.photos||[]).length ? `<div class="jr-ph">${s.photos.slice(0,6).map(p=>`<img data-ph="${esc(p)}" alt="">`).join('')}</div>` : ''}</div>`).join('')}</section>`;
    d += `<section class="pr-day"><h3>Le voyage en chiffres</h3><p>${ds.length} jours · ${tlStages().length} étapes · ${all.length} souvenirs · ${nph} photos · ${eur(tot)} au total${v.length>1 ? ' (' + eur(tot/v.length) + ' par personne)' : ''}</p></section>`;
    d += `<footer class="pr-foot">Journal créé le ${new Date().toLocaleDateString((window.I18N ? I18N.locale : 'fr-FR'), {day:'numeric', month:'long', year:'numeric'})} · Vezoria</footer>`;
    let ov = document.getElementById('cv-print'); if(!ov){ ov = document.createElement('div'); ov.id = 'cv-print'; document.body.appendChild(ov); }
    ov.innerHTML = `<div class="pr-bar"><button onclick="window.print()">🖨️ Imprimer / PDF</button><button class="x" onclick="CV.pdfClose()">✕ Fermer</button></div><div class="pr-doc jr-doc">${d}</div>`;
    ov.style.display = 'block'; document.body.classList.add('printing'); closeSheet(true);
    hydrate();
  }

  /* ---------- 📦 Paquets sans serveur ---------- */
  async function pkgKey(pass, salt){
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass.trim()), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:200000, hash:'SHA-256'}, base, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
  }


  function pkgImport(){ tlPickFile('.carnet,application/octet-stream,application/json,text/plain', f => pkgOpen(f)); }
  /* ---------- 📦 Fusion intelligente des paquets ----------
     Chaque fiche (vol, hôtel, note, dépense, souvenir…) porte sa date de modification.
     M.pkgBase garde, pour chaque fiche, la version connue au dernier échange (envoi ou réception).
     À la réception :
       • fiche nouvelle chez l'autre          → ajoutée
       • modifiée seulement chez l'autre      → mise à jour
       • modifiée seulement chez moi          → gardée telle quelle
       • modifiée des deux côtés (conflit)    → fusion champ par champ (la plus récente, complétée par
                                                ce que l'autre a rempli et que la récente a laissé vide,
                                                photos réunies), ou choix « la mienne / la sienne ».
     Rien n'est effacé, sauf ce que l'autre a explicitement supprimé (et que tu n'as pas retouché depuis). */
  function pkgSnap(){ M.pkgBase = M.pkgBase || {}; Object.values(R).forEach(r=>{ if(r && r.id && !r.demo) M.pkgBase[r.id] = r.updatedAt || 0; }); }
  const SKIP_F = ['updatedAt','updatedBy','createdAt','createdBy'];
  function pkgFuse(mine, theirs){
    const newer = (theirs.updatedAt||0) >= (mine.updatedAt||0) ? theirs : mine, older = newer === theirs ? mine : theirs;
    const out = clone(newer);
    Object.keys(older).forEach(k=>{
      if(SKIP_F.includes(k) || k === 'deleted') return;
      const a = out[k], b = older[k];
      if((a == null || a === '' || (Array.isArray(a) && !a.length)) && b != null && b !== '') out[k] = clone(b);
      else if(k === 'photos' && Array.isArray(a) && Array.isArray(b)) out[k] = [...new Set([...a, ...b])];
    });
    if(mine.deleted !== theirs.deleted) out.deleted = newer.deleted;
    out.updatedAt = Math.max(mine.updatedAt||0, theirs.updatedAt||0) + 1;
    return out;
  }
  const sameRec = (a, b) => { const s = r => JSON.stringify(Object.keys(r).filter(k=>!SKIP_F.includes(k)).sort().map(k=>[k, r[k]])); return s(a) === s(b); };
  const recLabel = r => (r.type==='item' ? icon(r) + ' ' + (r.titre||'') : r.type==='note' ? '📌 ' + (r.texte||'').slice(0,40) : r.type==='souv' ? '📸 ' + (r.titre||'souvenir') : r.type==='trip' ? '🧭 ' + (r.titre||'voyage') : r.type==='day' ? '🗓️ ' + (r.titre || r.date || 'jour') : r.type==='check' ? '✅ ' + (r.label||'') : r.type==='profile' ? '👤 ' + (r.nom||'') : r.type==='doc' ? '🛂 ' + (r.kind||'') : r.type) + (r.deleted ? ' (supprimé)' : '');
  let pkgPending = null;
  async function pkgOpenV1(f){
    let o; try { o = JSON.parse(await f.text()); } catch(e){ alert('Ce fichier n’est pas un paquet du carnet.'); return; }
    if(!o || !o.carnetPaquet){ alert('Ce fichier n’est pas un paquet du carnet.'); return; }
    const pass = (await uiPrompt('Phrase du groupe :', M.pkgPass || '')); if(pass === null) return;
    let data;
    try { const plain = await crypto.subtle.decrypt({name:'AES-GCM', iv:tlB64.dec(o.iv)}, await pkgKey(pass, tlB64.dec(o.salt)), tlB64.dec(o.data)); data = JSON.parse(new TextDecoder().decode(plain)); }
    catch(e){ alert('Phrase incorrecte : impossible d’ouvrir ce paquet.'); return; }
    M.pkgPass = pass.trim();
    return pkgMerge(data, data.photos || {});
  }
  function pkgMerge(data, photos){
    M.pkgBase = M.pkgBase || {};
    const add = [], upd = [], keep = [], conf = [];
    (data.records||[]).forEach(r=>{
      if(!r || !r.id || r.demo) return;
      const cur = R[r.id], base = M.pkgBase[r.id] || 0;
      if(!cur) return add.push(r);
      if(cur.deleted && !r.deleted){ add.push(Object.assign({}, r, {updatedAt: Date.now()})); return; }
      if(sameRec(cur, r)) return;
      const iChanged = (cur.updatedAt||0) > base, theyChanged = (r.updatedAt||0) > base;
      if(theyChanged && !iChanged) upd.push(r);
      else if(iChanged && !theyChanged) keep.push(r);
      else if((r.updatedAt||0) === (cur.updatedAt||0)) keep.push(r);
      else conf.push({mine:cur, theirs:r, pick:'fuse'});
    });
    pkgPending = {data, photos, add, upd, keep, conf};
    if(!conf.length) return pkgApply();
    openSheet(`<h2>📦 Paquet de ${esc(data.from || 'ton ami')}</h2>
      <div class="v-sum-small" style="margin-bottom:8px">${add.length} nouvelle(s) fiche(s) · ${upd.length} mise(s) à jour · ${keep.length} gardée(s) chez toi.<br>
      <b>${conf.length} fiche(s) modifiée(s) des deux côtés</b> : choisis pour chacune. « Fusionner » garde la version la plus récente et la complète avec ce que l’autre avait rempli.</div>
      ${conf.map((c,i)=>`<div class="cv-dayi"><b>${esc(recLabel(c.mine))}</b><div class="v-sum-small">chez toi : ${new Date(c.mine.updatedAt||0).toLocaleString((window.I18N ? I18N.locale : 'fr-FR'))} · chez ${esc(data.from||'lui')} : ${new Date(c.theirs.updatedAt||0).toLocaleString((window.I18N ? I18N.locale : 'fr-FR'))}</div>
        <select class="v-in" onchange="CV.pkgPick(${i}, this.value)"><option value="fuse">🔀 Fusionner (recommandé)</option><option value="mine">✋ Garder la mienne</option><option value="theirs">📥 Prendre la sienne</option></select></div>`).join('')}
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.pkgApply()">✅ Appliquer</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  function pkgPick(i, v){ if(pkgPending && pkgPending.conf[i]) pkgPending.conf[i].pick = v; }
  async function pkgApply(){
    const P = pkgPending; if(!P) return; pkgPending = null;
    const touch = r => { R[r.id] = r; markDirty(r.id); };
    P.add.forEach(touch); P.upd.forEach(touch);
    let nf = 0; P.conf.forEach(c=>{ if(c.pick === 'theirs') touch(c.theirs); else if(c.pick === 'fuse'){ touch(pkgFuse(c.mine, c.theirs)); nf++; } });
    let np = 0;
    for(const [id, s] of Object.entries(P.photos||{})){
      try { const ex = await IDB.get(id); if(ex && ex.blob) continue; await IDB.put({id, blob:new Blob([typeof s === 'function' ? await s() : tlB64.dec(s)], {type:'image/jpeg'}), up:0}); np++; M.pq = M.pq || []; if(!M.pq.includes(id)) M.pq.push(id); } catch(e){}
    }
    pkgSnap();
    if(!M.trip || !R[M.trip]){ const tt = trips()[0]; if(tt) M.trip = tt.id; }
    persist(); closeSheet(true); refresh(); queueSync(); uploadQueue();
    alert(`📥 Paquet de ${P.data.from || 'quelqu’un'} fusionné :\n• ${P.add.length} fiche(s) ajoutée(s)\n• ${P.upd.length} mise(s) à jour\n• ${P.keep.length} gardée(s) telles quelles chez toi\n• ${P.conf.length} conflit(s) réglé(s)${nf ? ' (' + nf + ' fusionnée(s))' : ''}\n• ${np} photo(s) ajoutée(s)\n\nRien de ce que tu avais saisi n’a été perdu.`);
  }
  const pkgBox = () => `<div class="v-box"><h3>📦 Sans serveur : paquets à échanger</h3>
    <p>Pour ceux qui ne veulent pas passer par la synchro en ligne : après tes modifications, envoie un <b>paquet chiffré</b> dans votre conversation de groupe ; les autres le reçoivent et tout se fusionne. Rien ne passe par le serveur de l’appli.</p>
    <button class="v-btn" onclick="CV.pkgSheet()">📤 Envoyer un paquet</button><button class="v-btn sec" onclick="CV.pkgImport()">📥 Recevoir un paquet</button>
    ${M.pkgLast ? `<div class="v-sum-small" style="margin-top:6px">Dernier paquet envoyé le ${new Date(M.pkgLast).toLocaleString((window.I18N ? I18N.locale : 'fr-FR'))}.</div>` : ''}
    <div class="v-sum-small" style="margin-top:6px">Les deux modes cohabitent : un membre synchronisé peut aussi recevoir un paquet, il sera ensuite partagé avec les autres via la synchro.</div></div>`;

  /* ══════════════════════════════════════════════════════════════════════════
     🗺️ CARTES « type Google Maps » (fond de carte CARTO / OpenStreetMap)
     + 📄 PDF généré sur le téléphone (pdf-lib) : un vrai fichier, bien cadré,
       à enregistrer, imprimer ou envoyer depuis le menu Partager.
     ══════════════════════════════════════════════════════════════════════════ */
  // Fonds de carte gratuits, sans clé : Esri (données OpenStreetMap, attribution affichée). Plus de tile.openstreetmap.org (usage réservé).
  const TILES = [{k:'light', by:'© Esri · © OpenStreetMap'}, {k:'street', by:'© Esri · © OpenStreetMap'}];
  const tileImg = {}; let tileBy = TILES[0].by;
  function loadOne(src){ return new Promise(res=>{ const im = new Image(); im.crossOrigin = 'anonymous'; let done = false; const end = v => { if(!done){ done = true; res(v); } };
    im.onload = ()=>end(im); im.onerror = ()=>end(null); im.src = src; setTimeout(()=>end(null), 8000); }); }
  function loadTile(z,x,y){
    const k = z+'/'+x+'/'+y; if(tileImg[k]) return tileImg[k];
    return tileImg[k] = (async()=>{ for(const t of TILES){ const im = await Promise.race([esriTile(t.k, z, x, y), new Promise(r=>setTimeout(()=>r(null), 8000))]); if(im){ tileBy = t.by; return im; } } return null; })();
  }
  const lon2x = (lng,z) => (lng+180)/360*Math.pow(2,z)*256;
  const lat2y = (lat,z) => { const r = lat*Math.PI/180; return (1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*Math.pow(2,z)*256; };
  // Dessine une carte : fond de carte + tracé + repères. Renvoie un <canvas> (fond uni si hors ligne).
  async function drawMap(o){
    const W = o.w || 640, H = o.h || 380, S = 2, pad = o.pad || 46;
    const all = [...(o.markers||[]), ...((o.line||[]).map(p=>({lat:p[0], lng:p[1]}))), ...((o.lines||[]).flatMap(l=>l.pts.map(p=>({lat:p[0], lng:p[1]}))))].filter(p=>p && p.lat != null && p.lng != null);
    const c = document.createElement('canvas'); c.width = W*S; c.height = H*S; const g = c.getContext('2d'); g.scale(S,S);
    g.fillStyle = '#eef0f3'; g.fillRect(0,0,W,H);
    if(!all.length) return c;
    let z = 17;
    const mnLat = Math.min(...all.map(p=>p.lat)), mxLat = Math.max(...all.map(p=>p.lat)), mnLng = Math.min(...all.map(p=>p.lng)), mxLng = Math.max(...all.map(p=>p.lng));
    for(; z > 1; z--){ if(lon2x(mxLng,z)-lon2x(mnLng,z) <= W-2*pad && lat2y(mnLat,z)-lat2y(mxLat,z) <= H-2*pad) break; }
    if(o.maxZoom) z = Math.min(z, o.maxZoom);
    const cx = (lon2x(mnLng,z)+lon2x(mxLng,z))/2, cy = (lat2y(mnLat,z)+lat2y(mxLat,z))/2, x0 = cx - W/2, y0 = cy - H/2;
    const P = p => [lon2x(p.lng,z)-x0, lat2y(p.lat,z)-y0];
    let tilesOk = 0;
    if(o.tiles !== false){
      const n = Math.pow(2,z), jobs = [];
      for(let tx = Math.floor(x0/256); tx <= Math.floor((x0+W)/256); tx++) for(let ty = Math.floor(y0/256); ty <= Math.floor((y0+H)/256); ty++){
        if(ty < 0 || ty >= n) continue; const wx = ((tx % n) + n) % n;
        jobs.push(loadTile(z,wx,ty).then(im=>{ if(im){ g.drawImage(im, tx*256-x0, ty*256-y0, 256, 256); tilesOk++; } }));
      }
      await Promise.all(jobs);
    }
    if(!tilesOk){ g.strokeStyle = '#dde1e7'; g.lineWidth = 1; for(let x=0;x<W;x+=40){ g.beginPath(); g.moveTo(x,0); g.lineTo(x,H); g.stroke(); } for(let y=0;y<H;y+=40){ g.beginPath(); g.moveTo(0,y); g.lineTo(W,y); g.stroke(); } }
    const line = (o.line||[]).map(p=>P({lat:p[0], lng:p[1]}));
    if(line.length > 1){
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 8; g.setLineDash(o.dashed ? [12,9] : []); g.beginPath(); line.forEach(([a,b],i)=> i ? g.lineTo(a,b) : g.moveTo(a,b)); g.stroke();
      g.strokeStyle = o.color || '#4f46e5'; g.lineWidth = 4.5; g.beginPath(); line.forEach(([a,b],i)=> i ? g.lineTo(a,b) : g.moveTo(a,b)); g.stroke(); g.setLineDash([]);
    }
    (o.lines||[]).forEach(l=>{ const L = l.pts.map(p=>P({lat:p[0], lng:p[1]})); if(L.length < 2) return; g.lineJoin = 'round'; g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 7; g.beginPath(); L.forEach(([a,b],i)=> i ? g.lineTo(a,b) : g.moveTo(a,b)); g.stroke();
      g.strokeStyle = l.color || '#0ea5e9'; g.lineWidth = 4; g.beginPath(); L.forEach(([a,b],i)=> i ? g.lineTo(a,b) : g.moveTo(a,b)); g.stroke(); });
    if(o.round) (o.markers||[]).forEach(m=>{   // repères ronds numérotés, nom dans une pastille blanche
      const [a,b] = P(m); g.fillStyle = m.color || '#7C3AED'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(a, b, m.label === '•' ? 5 : 11, 0, 7); g.fill(); g.stroke();
      if(m.label !== '•'){ g.fillStyle = '#fff'; g.font = 'bold 11px -apple-system,Helvetica,Arial,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(m.label), a, b + .5); g.textBaseline = 'alphabetic'; }
      if(m.name){ g.font = '600 12px -apple-system,Helvetica,Arial,sans-serif'; const w = g.measureText(m.name).width + 12; g.fillStyle = 'rgba(255,255,255,.94)'; g.beginPath(); g.roundRect ? g.roundRect(a + 14, b - 10, w, 20, 10) : g.rect(a + 14, b - 10, w, 20); g.fill(); g.fillStyle = '#1f2937'; g.textAlign = 'left'; g.fillText(m.name, a + 20, b + 4); }
    });
    if(!o.round) (o.markers||[]).forEach(m=>{
      const [a,b] = P(m), home = m.kind === 'home';
      g.fillStyle = home ? '#111827' : (m.color || '#dc2626'); g.strokeStyle = '#fff'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(a, b); g.bezierCurveTo(a-12, b-14, a-12, b-30, a, b-30); g.bezierCurveTo(a+12, b-30, a+12, b-14, a, b); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.font = 'bold 12px -apple-system,Helvetica,Arial,sans-serif'; g.textAlign = 'center'; g.fillText(m.label != null ? String(m.label) : '', a, b-17);
      if(m.name){ g.font = '600 12px -apple-system,Helvetica,Arial,sans-serif'; g.textAlign = 'left'; g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.95)'; g.strokeText(m.name, a+13, b-12); g.fillStyle = '#111827'; g.fillText(m.name, a+13, b-12); }
    });
    g.font = '10px -apple-system,Helvetica,Arial,sans-serif'; g.textAlign = 'right'; const at = tilesOk ? tileBy : 'Carte hors ligne (fond indisponible)';
    g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(W - g.measureText(at).width - 12, H-16, g.measureText(at).width + 12, 16); g.fillStyle = '#374151'; g.fillText(at, W-6, H-4);
    return c;
  }
  // Tracé à pied par les rues (serveur public FOSSGIS / OSRM), mis en cache dans la fiche du jour ; sinon lignes droites.
  async function walkLine(stops){
    const pts = stops.filter(p=>p && p.lat != null);
    if(pts.length < 2) return pts.map(p=>[p.lat,p.lng]);
    try {
      const u = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot/' + pts.map(p=>(+p.lng).toFixed(5)+','+(+p.lat).toFixed(5)).join(';') + '?overview=full&geometries=geojson';
      const r = await withTimeout(fetch(u), 12000); const j = await r.json();
      const co = j && j.routes && j.routes[0] && j.routes[0].geometry.coordinates;
      if(co && co.length > 1){ const step = Math.max(1, Math.ceil(co.length/400)); return co.filter((_,i)=>i%step===0 || i===co.length-1).map(c=>[+c[1].toFixed(5), +c[0].toFixed(5)]); }
    } catch(e){}
    return pts.map(p=>[p.lat,p.lng]);
  }
  async function dayMapCanvas(d, w, h){
    const info = dayInfo(d), r = info.route; if(!r || !r.ids || !r.ids.length) return null;
    const pl = placesOf(d), byId = Object.fromEntries(pl.map(p=>[p.id,p]));
    const stops = [r.start, ...r.ids.map(id=>r.pts[id]), r.loop ? r.start : r.end].filter(p=>p && p.lat != null);
    let line = r.geom;
    const sig = stops.map(p=>(+p.lat).toFixed(4)+','+(+p.lng).toFixed(4)).join(';');
    if(!line || r.geomSig !== sig){ line = await walkLine(stops);
      if(line.length > stops.length){ const rec = clone(R[dayId(d)]); if(rec && rec.route){ rec.route.geom = line; rec.route.geomSig = sig; R[rec.id] = rec; stamp(rec); markDirty(rec.id); persist(); } } }
    const markers = [Object.assign({kind:'home', label:'D'}, r.start)];
    r.ids.forEach((id,i)=>{ const p = r.pts[id]; if(p) markers.push({lat:p.lat, lng:p.lng, label:i+1, name: byId[id] ? byId[id].nom : ''}); });
    if(!r.loop && r.end && r.end.lat != null) markers.push(Object.assign({kind:'home', label:'A'}, r.end));
    return drawMap({w, h, line, markers});
  }
  async function tripMapCanvas(w, h, pretty){
    const st = tlStages(); if(!st.length) return null;
    try { await stagesGeoFix(st.map(s=>s.city)); } catch(e){}
    const pts = []; for(const s of st){ const c = geoCached(s.city) || await geocode(s.city, null).catch(()=>null); if(c) pts.push({lat:c.lat, lng:c.lng, name:s.city}); }
    if(!pts.length) return null;
    const steps = geoSouvs(M.trip).map(s=>({lat:s.lat, lng:s.lng, label:'•', color:'#16a34a'}));
    const col = (getComputedStyle(document.body).getPropertyValue('--sun2') || '').trim() || '#7C3AED';
    if(pretty) return drawMap({w, h, round:true, line: pts.map(p=>[p.lat,p.lng]), dashed:true, color:col, maxZoom:11, pad:56, markers: [...steps.map(s=>Object.assign({}, s, {label:'•', color:'#94a3b8'})), ...pts.map((p,i)=>Object.assign({label:i+1, color:col}, p))]});
    return drawMap({w, h, line: pts.map(p=>[p.lat,p.lng]), dashed:true, color:'#7C3AED', maxZoom:12, markers: [...pts.map((p,i)=>Object.assign({label:i+1, color:'#7C3AED'}, p)), ...steps]});
  }
  async function hydrateMaps(){
    for(const el of [...document.querySelectorAll('[data-rmap]:not([data-ok]),[data-tmap]:not([data-ok])')]){
      el.dataset.ok = '1'; el.innerHTML = '<div class="v-sum-small">🗺️ Carte en cours…</div>';
      const mk = 'mapimg:' + (el.dataset.rmap || ('trip-' + M.trip));
      try { const c = el.dataset.rmap ? await dayMapCanvas(el.dataset.rmap, 640, 380) : await tripMapCanvas(640, 400);
        if(c){ const u = c.toDataURL('image/jpeg', .86); el.innerHTML = `<img src="${u}" alt="Carte" style="width:100%;border-radius:12px;display:block">`;
          if(navigator.onLine !== false) c.toBlob(b=>{ if(b) IDB.put({id:mk, blob:b, up:1}).catch(()=>{}); }, 'image/jpeg', .86); }
        else el.innerHTML = ''; }
      catch(e){ el.innerHTML = ''; }
      if(navigator.onLine === false){ const b = await photoBlob(mk).catch(()=>null); if(b) el.innerHTML = `<img src="${URL.createObjectURL(b)}" alt="Carte" style="width:100%;border-radius:12px;display:block"><div class="v-sum-small">Carte enregistrée (hors ligne)</div>`; }
    }
  }

  /* ---------- 📄 Moteur PDF ---------- */
  async function loadPdfLib(){
    if(window.PDFLib) return pdfUni(window.PDFLib);
    await new Promise((res, rej)=>{ const s = document.createElement('script'); s.src = (window.VZ_B || '') + 'vendor/pdf-lib.min.js'; s.onload = res; s.onerror = ()=>rej(new Error('Outil PDF introuvable (vendor/pdf-lib.min.js).')); document.head.appendChild(s); });
    return pdfUni(window.PDFLib);
  }
  const WIN = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
  const pdf1 = s => pdfTxt(String(s == null ? '' : s).replace(/\s*[\r\n]+\s*/g, ' '));   // texte sur une seule ligne
  function pdfTxt(s){
    s = String(s == null ? '' : s);
    if(window.I18N && I18N.lang !== 'fr' && I18N.msg) s = String(I18N.msg(s));   // le PDF parle la langue de l’appli
    return s.replace(/[\u202F\u2009\u00A0]/g, ' ').replace(/→|➜|⟶/g, '->').replace(/←/g, '<-').replace(/≈/g, PDF_ENV()).replace(/[✓✔☑]/g, 'x').replace(/☐/g, 'o').replace(/[‐‑]/g,'-').replace(/ /g,' ').replace(/[\u2028\u2029]/g,' ')
      .replace(PDF_EMO, '').split('').filter(ch => ch === '\n' || (ch.charCodeAt(0) >= 32 && (ch.charCodeAt(0) < 127 || ch.charCodeAt(0) >= 160))).join('').replace(/[ \t]{2,}/g,' ').trim().replace(/€ ?/g, '€\u00A0 ');   // espace sûre après €, certains lecteurs PDF la mangent
  }
  // découpe en lignes ; un mot trop long (chinois, japonais… écrits sans espaces) se coupe entre deux caractères
  function pdfWrap(s, font, size, w){
    const out = [], fit = t => font.widthOfTextAtSize(t, size) <= w;
    pdfTxt(s).split('\n').forEach(par=>{ let line = '';
      par.split(' ').forEach(word=>{ const t = line ? line + ' ' + word : word;
        if(fit(t)){ line = t; return; }
        if(line && fit(word)){ out.push(line); line = word; return; }
        let cur = line ? line + ' ' : ''; for(const ch of Array.from(word)){ if(!cur.trim() || fit(cur + ch)) cur += ch; else { out.push(cur.trim()); cur = ch; } } line = cur; });
      out.push(line); });
    return out;
  }
  /* Écritures hors alphabet latin (中文, 日本語, 한국어, العربية, हिन्दी, русский, Türkçe…) : les polices standard d’un PDF
     ne les connaissent pas. Chaque ligne concernée est dessinée avec les polices du téléphone (qui savent lier l’arabe et
     le devanagari) dans une image nette à fond transparent (4 px par point), posée exactement à la place du texte.
     Le texte latin courant reste du vrai texte PDF, comme avant. */
  const PDF_EMO = /[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE0E}\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;
  const PDF_RTL = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
  const PDF_ENV = () => (window.I18N && I18N.lang !== 'fr') ? '~' : 'env. ';
  const pdfSafe = t => { for(const ch of String(t)){ const c = ch.charCodeAt(0); if(ch !== '\n' && !((c >= 32 && c < 127) || (c >= 160 && c <= 255)) && !WIN.includes(ch)) return false; } return true; };
  function pdfUni(L){
    if(L.__uni) return L; L.__uni = true;
    const S = 4, cv = document.createElement('canvas'), cx = cv.getContext('2d'), wm = new Map(), docs = new WeakMap(), lg = (window.I18N && I18N.lang) || 'fr';
    const cjk = {zh:'"PingFang SC","Noto Sans SC","Noto Sans CJK SC","Microsoft YaHei",', ja:'"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Noto Sans CJK JP","Yu Gothic",', ko:'"Apple SD Gothic Neo","Noto Sans KR","Noto Sans CJK KR","Malgun Gothic",'}[lg] || '';
    const css = (f, px) => { const n = String((f && f.name) || '');
      return (/Italic|Oblique/.test(n) ? 'italic ' : '') + (/Bold/.test(n) ? '700 ' : '400 ') + px + 'px ' + (/Times|Courier/.test(n)
        ? '"Times New Roman",Georgia,' + cjk + '"Songti SC","Noto Serif","Noto Naskh Arabic","Noto Serif Devanagari",serif'
        : '-apple-system,"Helvetica Neue",Helvetica,Arial,' + cjk + '"Noto Sans","Noto Sans Arabic","Noto Sans Devanagari",sans-serif'); };
    const width = (f, t, size) => { const fo = css(f, 100), k = fo + '|' + t; let w = wm.get(k);
      if(w == null){ cx.font = fo; cx.direction = PDF_RTL.test(t) ? 'rtl' : 'ltr'; w = cx.measureText(t).width / 100; if(wm.size > 30000) wm.clear(); wm.set(k, w); }
      return w * size; };
    const rgbOf = c => !c ? [0,0,0] : c.type === 'RGB' ? [c.red, c.green, c.blue] : c.type === 'Grayscale' ? [c.gray, c.gray, c.gray]
      : c.type === 'CMYK' ? [(1-c.cyan)*(1-c.key), (1-c.magenta)*(1-c.key), (1-c.yellow)*(1-c.key)] : [0,0,0];
    function img(doc, f, t, size, col){
      let cache = docs.get(doc); if(!cache){ cache = new Map(); docs.set(doc, cache); }
      const rgb = rgbOf(col), key = css(f, size) + '|' + rgb.join(',') + '|' + t; let im = cache.get(key);
      if(im) return im;
      const pad = Math.ceil(size * S * .3), W = Math.max(1, Math.ceil(width(f, t, size) * S) + 2 * pad), H = Math.ceil(size * S * 1.8), base = Math.round(size * S * 1.3), rtl = PDF_RTL.test(t);
      cv.width = W; cv.height = H; cx.clearRect(0, 0, W, H); cx.font = css(f, size * S); cx.fillStyle = '#000'; cx.textBaseline = 'alphabetic';
      cx.direction = rtl ? 'rtl' : 'ltr'; cx.textAlign = rtl ? 'right' : 'left'; cx.fillText(t, rtl ? W - pad : pad, base);
      const px = cx.getImageData(0, 0, W, H).data, a = new Uint8Array(W * H), c3 = new Uint8Array(W * H * 3), r = Math.round(rgb[0]*255), g = Math.round(rgb[1]*255), b = Math.round(rgb[2]*255);
      for(let i = 0, j = 0; i < a.length; i++, j += 3){ a[i] = px[i*4 + 3]; c3[j] = r; c3[j+1] = g; c3[j+2] = b; }
      const X = doc.context, sm = X.register(X.flateStream(a, {Type:'XObject', Subtype:'Image', Width:W, Height:H, ColorSpace:'DeviceGray', BitsPerComponent:8}));
      const ref = X.register(X.flateStream(c3, {Type:'XObject', Subtype:'Image', Width:W, Height:H, ColorSpace:'DeviceRGB', BitsPerComponent:8, SMask:sm}));
      im = {ref, w:W/S, h:H/S, dx:pad/S, dy:(H - base)/S}; cache.set(key, im); return im;
    }
    const ow = L.PDFFont.prototype.widthOfTextAtSize, od = L.PDFPage.prototype.drawText;
    L.PDFFont.prototype.widthOfTextAtSize = function(t, size){ return pdfSafe(t) ? ow.call(this, t, size) : width(this, String(t), size); };
    L.PDFPage.prototype.drawText = function(t, o){
      o = o || {}; t = String(t == null ? '' : t); if(pdfSafe(t)) return od.call(this, t, o);
      const size = o.size || 24, lh = o.lineHeight || size * 1.2;
      t.split('\n').forEach((l, i) => { if(!l.trim()) return; const im = img(this.doc, o.font, l, size, o.color), nm = this.node.newXObject('Tx', im.ref);
        this.pushOperators(L.pushGraphicsState(), L.concatTransformationMatrix(im.w, 0, 0, im.h, (o.x || 0) - im.dx, (o.y || 0) - i * lh - im.dy), L.drawObject(nm), L.popGraphicsState()); });
    };
    return L;
  }
  async function newPdf(title){
    const L = await loadPdfLib();
    const pdf = await L.PDFDocument.create(); pdf.setTitle(pdfTxt(title)); pdf.setCreator('Vezoria'); pdf.setProducer('Vezoria');
    const D = {L, pdf, rtl: !!(window.I18N && I18N.rtl), F:{r: await pdf.embedFont(L.StandardFonts.Helvetica), b: await pdf.embedFont(L.StandardFonts.HelveticaBold), i: await pdf.embedFont(L.StandardFonts.HelveticaOblique)},
      W:595.28, H:841.89, M:42, page:null, y:0, n:0, C:{ink:L.rgb(.13,.07,.2), mut:L.rgb(.42,.38,.46), acc:L.rgb(.49,.23,.93), line:L.rgb(.88,.85,.9), soft:L.rgb(.96,.94,.99), white:L.rgb(1,1,1)}};
    D.add = () => { D.page = pdf.addPage([D.W, D.H]); D.y = D.H - D.M; D.n++; const t = pdfTxt(title); D.page.drawText(t, {x:D.ax(t, D.F.r, 7.5, D.M), y:18, size:7.5, font:D.F.r, color:D.C.mut}); D.page.drawText(String(D.n), {x:D.rtl ? D.M : D.W-D.M-10, y:18, size:7.5, font:D.F.r, color:D.C.mut}); };
    D.need = h => { if(!D.page || D.y - h < D.M + 14) D.add(); };
    D.wrap = (s, font, size, w) => pdfWrap(s, font, size, w);
    D.ax = (t, font, size, x) => D.rtl ? D.W - x - font.widthOfTextAtSize(t, size) : x;   // en arabe, chaque texte part de la droite
    D.text = (s, o={}) => { const size = o.size || 10, font = o.font || D.F.r, x = D.M + (o.indent||0), w = (o.w || (D.W - 2*D.M)) - (o.indent||0), lh = size * (o.lh || 1.35);
      D.wrap(s, font, size, w).forEach(l=>{ D.need(lh); D.page.drawText(l, {x:D.ax(l, font, size, x), y:D.y - size, size, font, color:o.color || D.C.ink}); D.y -= lh; }); if(o.gap) D.y -= o.gap; };
    D.h1 = s => { D.need(40); D.page.drawRectangle({x:D.M, y:D.y-26, width:D.W-2*D.M, height:26, color:D.C.acc}); const t = pdfTxt(s); D.page.drawText(t, {x:D.ax(t, D.F.b, 13, D.M+10), y:D.y-18, size:13, font:D.F.b, color:D.C.white}); D.y -= 36; };
    D.h2 = (s, right) => { D.need(28); D.page.drawRectangle({x:D.M, y:D.y-20, width:D.W-2*D.M, height:20, color:D.C.soft}); const t0 = pdfTxt(s); D.page.drawText(t0, {x:D.ax(t0, D.F.b, 11, D.M+8), y:D.y-14, size:11, font:D.F.b, color:D.C.ink}); if(right){ const t = pdfTxt(right), w = D.F.r.widthOfTextAtSize(t, 9); D.page.drawText(t, {x:D.ax(t, D.F.r, 9, D.W-D.M-8-w), y:D.y-14, size:9, font:D.F.r, color:D.C.mut}); } D.y -= 26; };
    D.rule = () => { D.need(8); D.page.drawLine({start:{x:D.M, y:D.y-3}, end:{x:D.W-D.M, y:D.y-3}, thickness:.6, color:D.C.line}); D.y -= 8; };
    D.img = async (canvas, maxH) => { if(!canvas) return; const bytes = new Uint8Array(await (await new Promise(r=>canvas.toBlob(r, 'image/jpeg', .85))).arrayBuffer()); const im = await pdf.embedJpg(bytes);
      let w = D.W - 2*D.M, h = w * canvas.height / canvas.width; if(maxH && h > maxH){ h = maxH; w = h * canvas.width / canvas.height; } D.need(h + 8); D.page.drawImage(im, {x:D.M + (D.W-2*D.M-w)/2, y:D.y-h, width:w, height:h}); D.y -= h + 8; };
    D.photo = async (blob, x, w, h) => { try { const im = await pdf.embedJpg(new Uint8Array(await blob.arrayBuffer())); const r = Math.min(w/im.width, h/im.height), dw = im.width*r, dh = im.height*r; D.page.drawImage(im, {x:x+(w-dw)/2, y:D.y-h+(h-dh)/2, width:dw, height:dh}); } catch(e){} };
    D.table = (cols, head, rows) => { const tw = D.W - 2*D.M, ws = cols.map(c=>c*tw), size = 8.6, lh = size*1.3;
      const row = (cells, bold, fill) => { const lines = cells.map((c,i)=>D.wrap(c, bold ? D.F.b : D.F.r, size, ws[i]-8)); const h = Math.max(...lines.map(l=>l.length))*lh + 6; D.need(h);
        if(fill) D.page.drawRectangle({x:D.M, y:D.y-h, width:tw, height:h, color:fill});
        let x = D.M; lines.forEach((ls,i)=>{ ls.forEach((l,k)=>D.page.drawText(l, {x:D.ax(l, bold ? D.F.b : D.F.r, size, x+4), y:D.y-4-size-k*lh, size, font: bold ? D.F.b : D.F.r, color:D.C.ink})); x += ws[i]; });
        D.page.drawLine({start:{x:D.M, y:D.y-h}, end:{x:D.M+tw, y:D.y-h}, thickness:.5, color:D.C.line}); D.y -= h; };
      row(head, true, D.C.soft); rows.forEach(r=>row(r)); D.y -= 8; };
    D.lines = n => { for(let i=0;i<n;i++){ D.need(18); D.page.drawLine({start:{x:D.M, y:D.y-15}, end:{x:D.W-D.M, y:D.y-15}, thickness:.4, color:D.C.line, dashArray:[2,3]}); D.y -= 18; } };
    D.cover = (kicker, t, sub, who) => { D.add(); D.page.drawRectangle({x:0, y:D.H-230, width:D.W, height:230, color:D.L.rgb(.16,.07,.22)});
      const kk = pdfTxt(kicker).toUpperCase(); D.page.drawText(kk, {x:D.ax(kk, D.F.b, 10, D.M), y:D.H-70, size:10, font:D.F.b, color:D.L.rgb(.98,.75,.55)});
      let y = D.H-104; D.wrap(t, D.F.b, 30, D.W-2*D.M).forEach(l=>{ D.page.drawText(l, {x:D.ax(l, D.F.b, 30, D.M), y, size:30, font:D.F.b, color:D.C.white}); y -= 34; });
      D.wrap(sub, D.F.r, 12, D.W-2*D.M).forEach(l=>{ D.page.drawText(l, {x:D.ax(l, D.F.r, 12, D.M), y:y-4, size:12, font:D.F.r, color:D.L.rgb(.93,.88,.97)}); y -= 16; });
      if(who){ const ww = pdfTxt(who); D.page.drawText(ww, {x:D.ax(ww, D.F.r, 10.5, D.M), y:D.H-218, size:10.5, font:D.F.r, color:D.L.rgb(.93,.88,.97)}); } D.y = D.H - 250; };
    D.save = async name => { const bytes = await pdf.save(); return new File([bytes], name, {type:'application/pdf'}); };
    return D;
  }
  const PT = s => (window.I18N && I18N.tr ? I18N.tr(s) : s);   // morceaux d’une ligne composée, traduits un par un
  const PJ = n => (window.I18N && I18N.lang !== 'fr') ? PT('Jour ' + n) : 'J' + n;   // « J3 » → « Day 3 », « 第 3 天 »…
  const kindLbl = it => PT(it.cat==='transport' ? (it.mode || 'Trajet') : it.cat==='hotel' ? 'Hôtel' : it.cat==='activite' ? 'Visite' : 'Divers');
  const stTxt = it => PT(it.statut==='paid' ? '[payé]' : it.statut==='booked' ? '[réservé]' : '[à réserver]');
  let lastPdf = null;
  function pdfReady(file){
    lastPdf = file;
    openSheet(`<h2>📄 PDF prêt</h2><div class="v-sum-small" style="margin-bottom:10px"><b>${esc(file.name)}</b> · ${Math.max(1, Math.round(file.size/1024))} Ko. Touche « Enregistrer / imprimer » puis choisis <b>Enregistrer dans Fichiers</b>, <b>Imprimer</b> ou une appli (WhatsApp, Mail…).</div>
      <button type="button" class="v-btn" onclick="CV.pdfShare()">📤 Enregistrer / imprimer / envoyer</button>
      <button type="button" class="v-btn sec" onclick="CV.pdfOpen()">👁️ Ouvrir le PDF</button>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  async function pdfShare(){ if(lastPdf) await tlShareFile(lastPdf, lastPdf.name, lastPdf.name); }
  function pdfOpen(){ if(!lastPdf) return; const u = URL.createObjectURL(lastPdf); const w = window.open(u, '_blank'); if(!w) location.href = u; }
  function pdfBusy(msg){ openSheet(`<h2>📄 PDF</h2><div class="cv-route-load" id="pdf-msg">${esc(msg)}</div>`); }
  const pdfSay = m => { const e = document.getElementById('pdf-msg'); if(e) e.textContent = m; };
  const pdfName = (kind, t) => kind + '-' + (t.titre||'voyage').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') + '.pdf';

  // 🖨️ une seule partie du voyage, depuis « Finaliser » : 1 itinéraire · 2 réservations · 3 budget et répartition · 4 récap des étapes
  const PR_PARTS = {iti:{prog:1, maps:1, lines:0, t:'Itinéraire'}, resa:{hotel:1, transport:1, activite:1, t:'Réservations'}, budget:{budget:1, budgetX:1, t:'Budget et répartition'}, recap:{recap:1, t:'Récap des étapes'}};
  function pdfPart(k){ const P = PR_PARTS[k]; if(P) pdfRoute(P); }
  async function pdfRoute(opt){
    const t = trip(); if(!t) return;
    const on = k => { if(opt) return !!opt[k]; const e = document.getElementById('pr-'+k); return e ? e.checked : false; };
    const whoSel = (!opt && (document.getElementById('pr-who') || {}).value) || 'all', lines = on('lines'), maps = on('maps');
    const sec = Object.fromEntries([...PR_SECTIONS.map(([k])=>k), 'recap', 'budgetX'].map(k=>[k, on(k)]));
    pdfBusy('Préparation du carnet de route…');
    try {
      const keepWho = M.who; M.who = whoSel; const its = items(forWho);
      const D = await newPdf((opt ? PT(opt.t) : 'Carnet de route') + ' · ' + t.titre);
      D.cover(opt ? PT(opt.t) : 'Carnet de route', t.titre, [tripDatesLong(t), t.sous||''].filter(Boolean).join(' · '), whoSel==='all' ? tv().map(pname).join(' · ') : pname(whoSel));
      if(maps){ pdfSay('Carte du voyage…'); D.text('Le voyage en un coup d’œil', {font:D.F.b, size:12, gap:4}); await D.img(await tripMapCanvas(700, 470), 360); }
      if(sec.recap){   // ④ en une page : où l’on dort, combien de nuits, comment on arrive
        D.add(); D.h1(PT('Récap des étapes'));
        const st = tlStages(), trs = its.filter(i=>i.cat === 'transport');
        D.table([.22,.26,.1,.24,.18], [PT('Étape'), PT('Dates'), PT('Nuits'), PT('Hébergement'), PT('Arrivée')], st.map(x=>{
          const h = x.h || {}, tr = trs.find(r=>r.date === x.debut && normQ(r.to || '').includes(normQ(x.city).slice(0, 5)));
          return [x.city, fdate(x.debut) + ' -> ' + fdate(x.fin), String(nights(x.debut, x.fin || x.debut)), [h.nom, stTxt(h)].filter(Boolean).join(' · '), tr ? (tr.mode || '') + (tr.heureArr ? ' ' + tr.heureArr : '') : '']; }));
        D.text(PT('Total') + ' : ' + st.length + ' ' + PT('étapes') + ' · ' + nights(t.debut || (st[0] || {}).debut, t.fin || (st[st.length - 1] || {}).fin) + ' ' + PT('nuits'), {size:9.5, color:D.C.mut});
      }
      if(sec.prog){
        D.add(); D.h1('Programme jour par jour');
        const ds = dayList();
        for(let i=0;i<ds.length;i++){
          const day = ds[i], info = dayInfo(day), {own, night} = itemsForDay(day), pl = placesOf(day);
          pdfSay(`Jour ${i+1} / ${ds.length}…`);
          D.h2(`${PJ(i+1)} · ${longDate(day)}${info.titre ? ' - ' + PT(info.titre) : ''}`);
          if(info.plan) D.text(info.plan, {font:D.F.i, size:9.5, color:D.C.mut, gap:2});
          own.forEach(it=>D.text(`${it.heureDep || it.heure || ''}${it.heureArr ? ' -> ' + it.heureArr : ''}  ${kindLbl(it)} : ${PT(it.titre)}${[PT(it.compagnie || ''), it.ref ? PT('Réf.') + ' ' + it.ref : '', PT(it.adresse || ''), it.tel].filter(Boolean).map(x=>' · ' + x).join('')}  ${stTxt(it)}`, {size:9.5, indent:6}));
          night.forEach(it=>D.text(`Nuit : ${it.nom || it.titre}${[it.adresse, it.tel, it.ref ? PT('Réf.') + ' ' + it.ref : ''].filter(Boolean).map(x=>' · ' + x).join('')}  ${stTxt(it)}`, {size:9.5, indent:6}));
          if(pl.length) D.text('À voir : ' + pl.map((p,k)=>`${k+1}. ${p.nom}`).join('  '), {size:9.5, indent:6});
          const nts = notesFor('day:'+day); nts.forEach(n=>D.text('Note : ' + n.texte, {size:9, indent:6, color:D.C.mut}));
          if(maps && info.route && (info.route.ids||[]).length){ pdfSay(`Jour ${i+1} : carte de l’itinéraire…`); await D.img(await dayMapCanvas(day, 700, 400), 300); }
          if(lines) D.lines(3);
          D.y -= 6;
        }
      }
      const tab = (cat, title, cols, head, row) => { const l = its.filter(i=>i.cat===cat).sort(sortItems); if(!l.length) return; D.need(80); D.h1(title); D.table(cols, head, l.map(row)); };
      if(sec.hotel) tab('hotel', 'Hébergements', [.17,.17,.22,.26,.1,.08], ['Ville','Dates','Hôtel','Adresse & tél.','Réf.','État'],
        it=>[it.titre, fshort(it.date) + (it.dateFin ? ' -> ' + fshort(it.dateFin) : ''), it.nom||'', [it.adresse, it.tel].filter(Boolean).join(' · '), it.ref||'', stTxt(it)]);
      if(sec.transport) tab('transport', 'Trajets', [.16,.14,.28,.2,.12,.1], ['Date','Horaires','Trajet','Compagnie','Réf.','État'],
        it=>[it.date ? fdate(it.date) : '', (it.heureDep||'') + (it.heureArr ? ' -> ' + it.heureArr : ''), it.titre, it.compagnie||'', it.ref||'', stTxt(it)]);
      if(sec.activite) tab('activite', 'Visites & réservations', [.16,.1,.3,.24,.1,.1], ['Date','Heure','Visite','Lieu','Réf.','État'],
        it=>[it.date ? fdate(it.date) : '', it.heure||'', it.titre, it.adresse||'', it.ref||'', stTxt(it)]);
      if(sec.notes){ const ns = list('note', n=>n.trip===M.trip).sort(noteSort); if(ns.length){ D.need(80); D.h1('Notes'); ns.forEach(n=>{ D.text(refLabel(n.ref).replace(/<[^>]+>/g,''), {font:D.F.b, size:9.5}); D.text(n.texte, {size:9.5, gap:5}); }); } }
      if(sec.budget){ const all = items(), v = whoSel==='all' ? tv() : [whoSel]; D.need(80); D.h1('Budget');
        D.table([.4,.2,.2,.2], ['Voyageur','Sa part','Déjà réglé','Reste'], v.map(pid=>{ const pr = all.reduce((s,i)=>s+shareOf(i,pid),0), pa = all.reduce((s,i)=>s+shareOfPaid(i,pid),0); return [pname(pid), eur(pr), eur(pa), eur(pr-pa)]; }));
        if(whoSel==='all') D.text('Total du voyage : ' + eur(all.reduce((s,i)=>s+totalOf(i),0)) + '. Montants réels quand ils sont saisis, sinon estimations.', {size:9, color:D.C.mut});
        if(sec.budgetX){   // ③ la répartition : par poste, puis qui doit quoi
          const tot = all.reduce((s,i)=>s+totalOf(i),0) || 1, cats = [['transport','Trajets'], ['hotel','Hébergements'], ['activite','Visites & résas'], ['divers','Divers']];
          D.y -= 6; D.h2(PT('Par poste'));
          D.table([.4,.3,.3], [PT('Poste'), PT('Montant'), '%'], cats.map(([c, l])=>{ const v = all.filter(i=>i.cat === c).reduce((s,i)=>s+totalOf(i),0); return [PT(l), eur(v), Math.round(v / tot * 100) + ' %']; }).filter(r=>r[1] !== eur(0)));
          const tr = settle(balances());
          D.y -= 6; D.h2(PT('Qui doit quoi'));
          if(tr.length) tr.forEach(x=>D.text(`${pname(x.de)} -> ${pname(x.a)} : ${eur(x.v)}`, {size:10, indent:6})); else D.text(PT('Tout le monde est à jour.'), {size:10, indent:6});
        } }
      if(sec.check){ const cl = list('check', c=>c.trip===M.trip).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)); if(cl.length){ D.need(80); D.h1('Checklist');
        [...new Set(cl.map(c=>c.cat))].forEach(cat=>{ D.text(cat, {font:D.F.b, size:10}); cl.filter(x=>x.cat===cat).forEach(x=>D.text((x.done ? '[x] ' : '[  ] ') + PT(x.label), {size:9.5, indent:8})); D.y -= 4; }); } }
      M.who = keepWho;
      pdfReady(await D.save(pdfName(opt ? ({iti:'itineraire', resa:'reservations', budget:'budget', recap:'recap-etapes'})[Object.keys(PR_PARTS).find(k=>PR_PARTS[k] === opt)] || 'carnet' : 'carnet-de-route', t)));
    } catch(e){ pdfSay('⚠️ ' + e.message); }
  }
  async function pdfJournal(){
    const t = trip(); if(!t) return;
    pdfBusy('Préparation du journal…');
    try {
      const ds = dayList(), all = souvs(), v = tv(), tot = items().reduce((s,i)=>s+totalOf(i),0), nph = all.reduce((s,x)=>s+(x.photos||[]).length,0);
      const D = await newPdf('Journal · ' + t.titre);
      D.cover('Journal de voyage', t.titre, [tripDatesLong(t), t.sous||''].filter(Boolean).join(' · '), v.map(pname).join(' · '));
      pdfSay('Carte du voyage…'); await D.img(await tripMapCanvas(700, 470), 380);
      D.text(`${ds.length} jours · ${tlStages().length} étapes · ${all.length} souvenirs · ${nph} photos · ${eur(tot)} au total${v.length>1 ? ' (' + eur(tot/v.length) + ' par personne)' : ''}`, {size:10, color:D.C.mut});
      const daysWith = ds.map((day,i)=>({day, i, sv: all.filter(s=>s.date===day), info: dayInfo(day)})).filter(x=>x.sv.length || x.info.plan);
      if(daysWith.length) D.add();
      for(const x of daysWith){
        pdfSay(`Jour ${x.i+1}…`);
        D.h2(`${PJ(x.i+1)} · ${longDate(x.day)}${x.info.titre ? ' - ' + PT(x.info.titre) : ''}`);
        if(x.info.plan) D.text(x.info.plan, {font:D.F.i, size:9.5, color:D.C.mut, gap:3});
        for(const s of x.sv){
          D.text(s.titre || 'Souvenir', {font:D.F.b, size:11}); if(s.lieu) D.text(s.lieu, {size:9, color:D.C.mut}); if(s.texte) D.text(s.texte, {size:10, gap:4});
          const ph = (s.photos||[]).filter(p=>!(M.jrOff||{})[p]);
          for(let k=0;k<ph.length;k+=3){
            const cw = (D.W - 2*D.M - 16)/3, chh = cw*0.75; D.need(chh + 6);
            for(let j=0;j<3 && k+j<ph.length;j++){ const b = await photoBlob(ph[k+j]) || await photoBlob(ph[k+j] + '.t'); if(b) await D.photo(b, D.M + j*(cw+8), cw, chh); }
            D.y -= chh + 6;
          }
          D.y -= 6;
        }
      }
      pdfReady(await D.save(pdfName('journal', t)));
    } catch(e){ pdfSay('⚠️ ' + e.message); }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     ✈️ VOYAGE EN COURS · 💶 PLAFOND DU JOUR · 🛒 COURSES · 💸 REMBOURSEMENTS · 🗳️ SONDAGES
     ══════════════════════════════════════════════════════════════════════════ */
  const hhmm = ms => { const m = Math.max(0, Math.round(ms/60000)), d = Math.floor(m/1440), h = Math.floor((m%1440)/60), mm = m%60; return (d ? d + ' j ' : '') + (h || d ? h + ' h ' : '') + String(mm).padStart(d||h ? 2 : 1,'0') + ' min'; };
  function nextMoves(){
    const now = Date.now();
    return items(i=>i.date && (i.cat==='transport' || i.cat==='activite' || i.cat==='hotel')).map(it=>{
      const tm = it.cat==='transport' ? it.heureDep : it.heure;
      const at = new Date(it.date + 'T' + (tm || (it.cat==='hotel' ? '15:00' : '09:00')) + ':00').getTime();
      let end = 0; if(it.cat==='transport' && it.heureArr){ end = new Date(it.date + 'T' + it.heureArr + ':00').getTime(); if(end < at) end += 864e5; }
      return {it, at, end, timed: !!tm, on: !!end && at <= now && now < end};
    }).filter(x=>x.on || x.at >= now - 2*60000).sort((a,b)=>(b.on - a.on) || a.at - b.at);
  }
  const spentOn = d => items(i=>i.date===d && i.cat==='divers').reduce((s,i)=>s+totalOf(i),0);
  function liveCard(){
    const t = trip(); if(!t || !t.debut || t.archived) return '';
    const td = isoToday(), fin = t.fin || t.debut, ds = dayList();
    const nx = nextMoves()[0];
    if(td < t.debut){
      const ms = new Date(t.debut + 'T00:00:00') - Date.now(); if(ms > 3*864e5) return '';
      return `<div class="cv-live"><div class="lk">✈️ Départ imminent</div><div class="lt">${nx ? `${icon(nx.it)} ${esc(nx.it.titre)} dans <b>${hhmm(nx.at - Date.now())}</b>` : 'Le voyage commence dans ' + hhmm(ms)}</div>
        <div class="lb"><button type="button" onclick="CV.tlDay()">📴 Fiche du jour</button><button type="button" onclick="CV.tab('check')">✅ Checklist</button></div></div>`;
    }
    if(td > fin){
      const ago = (Date.now() - new Date(fin + 'T23:59:00')) / 864e5; if(ago > 30) return '';
      const tr = settle(balances());
      return `<div class="cv-live done"><div class="lk">🏡 De retour à la maison</div><div class="lt">Quel voyage ! ${tr.length ? `Il reste ${tr.length} remboursement${tr.length>1?'s':''} entre vous, et c’est bouclé.` : 'Tout est réglé entre vous. 🎉'}</div>
        <div class="lb"><button type="button" onclick="CV.tab('budget')">💸 Bilan et remboursements</button><button type="button" onclick="CV.filmOpen()">🎬 Film du voyage</button><button type="button" onclick="CV.flyover()">🌍 Survol 3D du voyage</button><button type="button" onclick="CV.wrapped()">✨ Récap story à partager</button><button type="button" onclick="CV.jrSheet()">📖 Journal</button></div></div>`;
    }
    const k = ds.indexOf(td), info = dayInfo(td), spent = spentOn(td), cap = num(t.plafond);
    const bar = cap ? `<div class="lcap${spent > cap ? ' over' : ''}"><span style="width:${Math.min(100, spent/cap*100)}%"></span></div>` : '';
    return `<div class="cv-live"><div class="lk">📍 Jour ${k+1} du voyage${info.titre ? ' · ' + esc(info.titre) : ''}</div>
      <div class="lt">${nx && nx.on ? `En route : ${icon(nx.it)} <b>${esc(nx.it.titre)}</b> · arrivée à ${esc(nx.it.heureArr)}, dans <b>${hhmm(nx.end - Date.now())}</b>` : nx ? `Prochain : ${icon(nx.it)} <b>${esc(nx.it.titre)}</b>${nx.timed ? ` à ${esc(nx.it.cat==='transport' ? nx.it.heureDep : nx.it.heure)}` : ''}${nx.it.date !== td ? ' (' + fshort(nx.it.date) + ')' : ''} · dans <b>${hhmm(nx.at - Date.now())}</b>` : 'Plus rien de prévu : profite !'}</div>
      <div class="lsp">💶 Dépenses du jour : <b>${eur(spent)}</b>${cap ? ` / ${eur(cap)}${spent > cap ? ' · <b class="red">plafond dépassé de ' + eur(spent - cap) + '</b>' : ' · reste ' + eur(cap - spent)}` : ''} <button type="button" class="lmini" onclick="CV.capSet()">${cap ? 'modifier' : 'fixer un plafond'}</button></div>${bar}
      <div class="lb"><button type="button" onclick="CV.tlDay()">📴 Fiche du jour</button><button type="button" onclick="CV.tlReceipt()">🧾 Dépense</button><button type="button" onclick="CV.shopSheet()">🛒 Courses</button></div></div>`;
  }
  async function capSet(){
    const t = trip(); const v = (await uiPrompt(MSGT('Plafond de dépenses sur place, par jour, pour tout le groupe (en {0}) — vide pour aucun :').replace('{0}', CS()), t.plafond || ''));
    if(v === null) return; t.plafond = v.trim() ? String(num(v)) : ''; put(t, t.plafond ? '💶 Plafond : ' + eur(num(t.plafond)) + ' / jour' : 'Plafond retiré'); refresh();
  }
  function capWarn(){ const t = trip(); if(!t || !num(t.plafond)) return; const s = spentOn(isoToday()); if(s > num(t.plafond)) setTimeout(()=>alert(`⚠️ Plafond du jour dépassé : ${eur(s)} dépensés pour ${eur(num(t.plafond))} prévus.`), 400); }

  /* ---------- 🛒 Liste de courses partagée (dans la checklist, catégorie « 🛒 Courses ») ---------- */
  const SHOP = '🛒 Courses';
  function shopSheet(){
    const l = list('check', c=>c.trip===M.trip && c.cat===SHOP).sort((a,b)=>(a.done-b.done) || (a.createdAt||0)-(b.createdAt||0));
    openSheet(`<h2>🛒 Liste de courses</h2><div class="v-sum-small" style="margin-bottom:8px">Partagée avec le groupe : chacun ajoute et coche (pique-nique, apéro, pharmacie…).</div>
      <form onsubmit="event.preventDefault();CV.shopAdd()"><div class="cv-fx"><input class="v-in" id="sh-new" placeholder="Ex. pain, fromage, eau ×6" autocomplete="off"><button class="v-btn" type="submit" aria-label="Ajouter">＋</button></div></form>
      <div id="sh-list">${l.map(c=>`<label class="cv-checkline cv-shop${c.done?' done':''}"><input type="checkbox"${c.done?' checked':''} onchange="CV.shopTick('${c.id}')"> ${esc(c.label)}${c.createdBy ? ` <span class="v-sum-small">· ${esc(pname(c.createdBy))}</span>` : ''}</label>`).join('') || '<div class="v-sum-small">Liste vide.</div>'}</div>
      <div class="v-actions">${l.some(c=>c.done) ? `<button type="button" class="v-btn sec" onclick="CV.shopClear()">🧹 Retirer les cochés</button>` : ''}<button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  function shopAdd(){ const i = document.getElementById('sh-new'); const v = (i.value||'').trim(); if(!v) return; v.split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean).forEach((x,k)=>put({id:'c'+uid()+k, type:'check', trip:M.trip, cat:SHOP, label:x, done:false})); shopSheet(); }
  function shopTick(id){ const c = clone(R[id]); c.done = !c.done; put(c); }
  function shopClear(){ const out = list('check', c=>c.trip===M.trip && c.cat===SHOP && c.done).map(c=>Object.assign(clone(c), {deleted:true})); if(out.length) putMany(out, '🧹 ' + out.length + ' retiré(s)'); shopSheet(); }

  /* ---------- 💸 Demander / envoyer un remboursement ---------- */
  async function rembAsk(de, a, v){
    const t = trip(), pa = prof(a) || {}, how = (pa.rembours || '').trim();
    const txt = `Bonjour ${pname(de)} ! Pour « ${t ? t.titre : 'le voyage'} », d’après le carnet tu dois ${eur(v)} à ${pname(a)}.`
      + (how ? `\nPour rembourser : ${how}` : '') + `\nMerci ! 🙏`;
    const go = async () => { try { if(navigator.share){ await navigator.share({text:txt}); return; } } catch(e){ if(e && e.name === 'AbortError') return; }
      try { await navigator.clipboard.writeText(txt); toast('📋 Message copié'); } catch(e){ (await uiPrompt('Copie ce message :', txt)); } };
    if(!how && a === M.me && (await uiConfirm('Tu n’as pas encore indiqué comment on te rembourse (Lydia, Wero, numéro, IBAN…). L’ajouter maintenant dans ton profil ?'))){ editProfile(a); return; }
    go();
  }

  /* ---------- 🗳️ Sondages (dans les Envies) ---------- */
  const polls = () => list('poll').sort((a,b)=>(a.closed?1:0)-(b.closed?1:0) || (b.createdAt||0)-(a.createdAt||0));
  function pollCard(p, onHome){
    const votes = p.votes || {}, n = Object.keys(votes).length, mine = votes[M.me];
    const cnt = p.options.map((_,i)=>Object.values(votes).filter(v=>v===i).length), best = Math.max(0, ...cnt);
    const kk = {activite:'🎟️ Activité', resto:'🍽️ Restaurant', hotel:'🏨 Hébergement'}[p.kind] || '', nV = (R[p.trip] && (R[p.trip].voyageurs || []).length) || 0, wi = pollBest(p);
    return `<div class="cv-poll${p.closed?' closed':''}${p.kind ? ' kind' : ''}">${kk ? `<div class="po-k">${kk}${p.date ? ' · ' + fdate(p.date) : ''}${nV ? ` · ${n}/${nV} ${MSGT('ont voté')}` : ''}</div>` : ''}<div class="pq"><b>${esc(p.question)}</b> <span class="v-sum-small">· ${n} vote${n>1?'s':''}${p.closed?' · clos':''}</span></div>
      ${p.options.map((o,i)=>`<button type="button" class="po${mine===i?' me':''}${p.closed && cnt[i]===best && best ? ' win' : ''}" ${p.closed?'disabled':''} onclick="CV.pollVote('${p.id}',${i})"><span class="pb" style="width:${n ? cnt[i]/n*100 : 0}%"></span><span class="pl">${esc(o)}</span><span class="pc">${cnt[i]}${n ? ' · ' + Math.round(cnt[i]/n*100) + ' %' : ''}</span></button>`).join('')}
      <div class="v-sum-small">${Object.entries(votes).map(([pid,v])=>esc(pname(pid)) + ' → ' + esc(p.options[v]||'?')).join(' · ')}</div>
      ${p.kind ? (p.added ? `<div class="po-win">🏆 « ${esc(p.added)} » ${MSGT('est au programme')}</div>` : wi >= 0 ? `<button type="button" class="po-add" onclick="CV.pollWin('${p.id}')">🏆 ${MSGT('Valider')} « ${esc(p.options[wi])} » → ${MSGT('programme')}</button>` : '') : ''}
      <div class="cv-row"><button type="button" class="v-day-edit" onclick="CV.pollPin('${p.id}')">${p.pin ? '📌 Désépingler' : '📌 Épingler sur l’accueil'}</button>${!onHome && p.createdBy === M.me ? `<button type="button" class="v-day-edit" onclick="CV.pollClose('${p.id}')">${p.closed ? '↺ Rouvrir' : '🔒 Clore'}</button><button type="button" class="v-day-edit" onclick="CV.pollDel('${p.id}')" aria-label="Supprimer">🗑</button>` : ''}</div></div>`;
  }
  function pollsHTML(){
    const ps = polls();
    return `<div class="v-box cv-polls"><div class="cv-row" style="justify-content:space-between;align-items:center"><h3 style="margin:0">🗳️ Sondages</h3><button type="button" class="v-day-edit" onclick="CV.pollNew()">＋ Sondage</button></div>
      ${ps.length ? ps.map(p=>pollCard(p, false)).join('')
        : '<div class="v-sum-small">Une question pour le groupe ? « Rome ou Lisbonne ? », « Resto japonais ou italien ce soir ? »… Chacun vote avec son profil.</div>'}</div>`;
  }
  /* Sondages épinglés : visibles et votables directement sur l'accueil (Programme) */
  function pinnedPolls(){
    const ps = polls().filter(p=>p.pin); if(!ps.length) return '';
    return `<div class="v-box cv-polls cv-polls-home"><h3 style="margin:0 0 6px">🗳️ Sondage du groupe</h3>${ps.map(p=>pollCard(p, true)).join('')}</div>`;
  }
  function pollPin(id){ const p = clone(R[id]); p.pin = !p.pin; put(p, p.pin ? '📌 Sondage épinglé sur l’accueil' : '📌 Sondage désépinglé'); toast(p.pin ? '📌 Épinglé sur l’accueil' : '📌 Désépinglé'); refresh(); }
  function pollNew(){
    openSheet(`<h2>🗳️ Nouveau sondage</h2><form id="v-form" onsubmit="event.preventDefault();CV.pollSave()">
      <div class="v-f"><label>Pour</label><select class="v-in" name="kind" onchange="this.form.querySelector('.pl-dt').style.display=this.value?'':'none'"><option value="">❓ Une question libre</option>${trip() ? `<option value="activite">🎟️ Une activité ou une visite</option><option value="resto">🍽️ Un restaurant</option><option value="hotel">🏨 Un hébergement</option>` : ''}</select></div>
      ${field('Question','q','','text','placeholder="Ex. Où partir en mai ?" required')}
      <div class="v-f pl-dt" style="display:none"><label>Le jour (facultatif)</label><input class="v-in" type="date" name="date"></div>
      <div class="v-f"><label>Choix (un par ligne, 2 à 8)</label><textarea class="v-in" name="opts" rows="4" placeholder="Rome&#10;Lisbonne&#10;Séville"></textarea></div>
      ${actions('')}</form>`);
  }
  function pollSave(){
    const f = document.getElementById('v-form'), q = f.q.value.trim(), o = f.opts.value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,8);
    if(!q || o.length < 2){ alert('Une question et au moins 2 choix.'); return; }
    const kind = f.kind ? f.kind.value : '', t = trip();
    put(Object.assign({id:'po'+uid(), type:'poll', question:q, options:o, votes:{}, closed:false}, kind && t ? {kind, trip:t.id, date:(f.date && f.date.value) || '', pin:true} : {}), '🗳️ ' + (kind ? MSGT('Vote lancé : chacun choisit') : 'Sondage créé')); closeSheet(true); refresh();
  }
  function pollVote(id, i){ if(!M.me) return; const p = clone(R[id]); p.votes = Object.assign({}, p.votes); if(p.votes[M.me] === i) delete p.votes[M.me]; else p.votes[M.me] = i; put(p); refresh(); }
  function pollClose(id){ const p = clone(R[id]); p.closed = !p.closed; put(p); refresh(); if(p.closed && p.kind && !p.added) setTimeout(()=>pollWin(id, true), 200); }
  function pollBest(p){ const votes = p.votes || {}, cnt = p.options.map((_, i)=>Object.values(votes).filter(v=>v === i).length), mx = Math.max(0, ...cnt); return mx ? cnt.indexOf(mx) : -1; }
  async function pollWin(id, ask){
    const p = clone(R[id]); if(!p || !p.kind || p.added) return; const w = pollBest(p); if(w < 0) return;
    const nm = p.options[w];
    if(ask && !(await uiConfirm('🏆 « ' + nm + ' » gagne le vote !\n\n' + MSGT('Ajouter au programme du voyage ?')))) return;
    const t = R[p.trip]; if(!t) return;
    const cat = p.kind === 'hotel' ? 'hotel' : 'activite';
    put({id:'i' + uid(), type:'item', trip:t.id, cat, titre:(p.kind === 'resto' ? '🍽️ ' : '') + nm, date:p.date || '', statut:'todo', notes:'🗳️ ' + MSGT('Choisi par le groupe') + ' : ' + p.question}, '🏆 « ' + nm + ' » ' + MSGT('ajouté au programme'));
    p.added = nm; p.closed = true; put(p); pollFx(); refresh();
  }
  function pollFx(){ const b = document.createElement('div'); b.className = 'wlc-conf po-fx'; b.innerHTML = Array.from({length:30}, (_, i)=>`<i style="left:${Math.random() * 100}%;animation-delay:${(Math.random() * .8).toFixed(2)}s;animation-duration:${(2.2 + Math.random() * 1.6).toFixed(2)}s;background:${['#fbbf24','#f472b6','#60a5fa','#34d399','#a78bfa'][i % 5]}"></i>`).join(''); document.body.appendChild(b); setTimeout(()=>b.remove(), 4200); }
  async function pollDel(id){ if(!(await uiConfirm('Supprimer ce sondage ?'))) return; const p = clone(R[id]); p.deleted = true; put(p, '🗑 Sondage supprimé'); refresh(); }

  /* ══════════════════════════════════════════════════════════════════════════
     🎫 BILLETS JOINTS · 📋 CONFIRMATION COLLÉE · 🌍 CO2 & CONSEILS · 📍 JE SUIS ICI · 📊 STATS
     🗺️ EXPORT KML · 🪄 REMPLIR MES JOURNÉES   (tout est gratuit, sans clé)
     ══════════════════════════════════════════════════════════════════════════ */
  /* ---------- 🎫 Billets, QR codes, PDF joints à n'importe quelle fiche ---------- */
  const pjOf = it => (it && it.pj) || [];
  function pjListHTML(it){
    const l = pjOf(it);
    return l.length ? `<div class="cv-pjl">${l.map((p,i)=>`<span class="cv-pj"><button type="button" onclick="CV.pjOpen('${esc(p.id)}','${p.t}')">${p.t==='img' ? `<img data-ph="${esc(p.id)}.t" alt="">` : '<span class="pdf">PDF</span>'}<small>${esc(p.n||'billet')}</small></button><button type="button" class="x" onclick="CV.pjDel(${i})" aria-label="Retirer">✕</button></span>`).join('')}</div>` : '<div class="v-sum-small">Aucun billet joint.</div>';
  }
  const pjBlock = it => `<div class="v-f"><label>🎫 Billets, cartes d’embarquement, PDF</label><div id="pj-box">${pjListHTML(it)}</div>
    <button type="button" class="v-day-edit" onclick="CV.pjAdd(true)">📸 Photographier le billet ou le QR code</button><button type="button" class="v-day-edit" onclick="CV.pjAdd()">📎 Joindre (capture d’écran ou PDF)</button>
    <div class="v-sum-small">Gardés dans le téléphone : lisibles sans réseau. Les photos sont aussi partagées avec le groupe ; les PDF restent sur ce téléphone.</div></div>`;
  function pjRefresh(){ const b = document.getElementById('pj-box'); if(b && editing){ b.innerHTML = pjListHTML(editing); hydrate(); } }
  function pjSave(pj){
    if(!editing) return; editing.pj = pj;
    if(editing.id && R[editing.id]){ const r = clone(R[editing.id]); r.pj = pj; put(r); }
    pjRefresh();
  }
  function pjAdd(cam){
    tlPickFile(cam ? 'image/*' : 'image/*,application/pdf', async f => {
      const id = 'pj' + uid(), isPdf = /pdf/i.test(f.type) || /\.pdf$/i.test(f.name||'');
      try { if(isPdf) await IDB.put({id, blob:f, up:1}); else { await storePhoto(f, id); uploadQueue(); } }
      catch(e){ alert('Fichier impossible à enregistrer.'); return; }
      pjSave([...pjOf(editing), {id, t: isPdf ? 'pdf' : 'img', n: (f.name || (isPdf ? 'billet.pdf' : 'billet')).replace(/\.[a-z0-9]+$/i,'').slice(0,40)}]);
    }, !!cam);
  }
  async function pjDel(i){ if(!(await uiConfirm('Retirer ce document de la fiche ?'))) return; const l = pjOf(editing).slice(); l.splice(i,1); pjSave(l); }
  async function pjOpen(id, t){
    if(t === 'pdf'){ const b = await photoBlob(id); if(!b){ alert('Ce PDF n’est pas sur ce téléphone (les PDF ne sont pas partagés).'); return; } const u = URL.createObjectURL(b); const w = window.open(u, '_blank'); if(!w) location.href = u; return; }
    let ov = document.getElementById('cv-pjv'); if(!ov){ ov = document.createElement('div'); ov.id = 'cv-pjv'; document.body.appendChild(ov); }
    ov.innerHTML = `<button type="button" onclick="this.parentNode.remove()">✕ Fermer</button><img data-ph="${esc(id)}" alt="Billet">`; hydrate();
  }
  const pjChips = it => pjOf(it).length ? `<div class="cv-dayl">${pjOf(it).map(p=>`<a href="javascript:void 0" onclick="CV.pjOpen('${esc(p.id)}','${p.t}')">🎫 ${esc(p.n||'billet')}</a>`).join(' ')}</div>` : '';

  /* ---------- 📋 Coller une confirmation de réservation ---------- */
  const MOIS_FR = {janv:1,jan:1,janvier:1,fevr:2,fev:2,feb:2,fevrier:2,mars:3,mar:3,march:3,avr:4,avril:4,apr:4,april:4,mai:5,may:5,juin:6,jun:6,june:6,juil:7,juillet:7,jul:7,july:7,aout:8,aug:8,august:8,sept:9,sep:9,septembre:9,september:9,oct:10,octobre:10,october:10,nov:11,novembre:11,november:11,dec:12,decembre:12,december:12};
  function cfDates(txt){
    const out = [], n = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\./g,'');
    let m; const re1 = /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/g;
    while((m = re1.exec(txt))){ let y = +m[3]; if(y < 100) y += 2000; out.push({i:m.index, d:`${y}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`}); }
    const re2 = /\b(\d{4})-(\d{2})-(\d{2})\b/g; while((m = re2.exec(txt))) out.push({i:m.index, d:m[0]});
    const re3 = /\b(\d{1,2})(?:er)?\s+([a-zA-Zéèûôàç]{3,10})\.?\s+(\d{4})\b/g;
    while((m = re3.exec(txt))){ const mo = MOIS_FR[n(m[2])]; if(mo) out.push({i:m.index, d:`${m[3]}-${String(mo).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`}); }
    const re4 = /\b([a-zA-Z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/g;
    while((m = re4.exec(txt))){ const mo = MOIS_FR[n(m[1])]; if(mo) out.push({i:m.index, d:`${m[3]}-${String(mo).padStart(2,'0')}-${String(+m[2]).padStart(2,'0')}`}); }
    return out.filter(x=>!isNaN(new Date(x.d))).sort((a,b)=>a.i-b.i).map(x=>x.d);
  }
  function cfParse(txt, force){
    const T = txt.replace(/\r/g,''), low = T.toLowerCase();
    const r = {kind:'autre'};
    const ref = T.match(/(?:PNR|r[ée]f[ée]rence(?: de r[ée]servation| du dossier)?|num[ée]ro de (?:r[ée]servation|confirmation|dossier)|booking (?:reference|ref|number)|confirmation(?: number| code|)|code de r[ée]servation|dossier)\s*[:#nN°º.]*\s*([A-Z0-9]{5,12})\b/i);
    if(ref) r.ref = ref[1].toUpperCase();
    const fl = T.match(/\b(?:vol|flight|flug)\s*[:#nN°º]*\s*([A-Z0-9]{2})\s?(\d{1,4})\b/i) || T.match(/\b((?:[A-Z]{2}|[A-Z]\d|\d[A-Z]))\s?(\d{2,4})\b(?=[^\n]{0,40}(?:\d{1,2}[:h]\d{2}|départ|depart|departure))/);
    const iata = [...T.matchAll(/\(([A-Z]{3})\)/g)].map(m=>m[1]);
    const times = [...T.matchAll(/\b([01]?\d|2[0-3])[:h]([0-5]\d)\b/g)].map(m=>m[1].padStart(2,'0') + ':' + m[2]);
    const dates0 = cfDates(T), fut = dates0.filter(d=>d >= isoToday()), dates = fut.length ? fut : dates0;
    const K = cfKind(T, force || impCat);
    let kind = force === 'hotel' ? 'hotel' : force === 'activite' ? 'act' : force === 'transport' ? K.tr : K.kind;
    if(!force && fl && (kind === 'train' || kind === 'bus') && K.s.vol > 0) kind = 'vol';
    if(kind === 'vol'){
      r.kind = 'vol'; if(fl) r.flight = (fl[1] + fl[2]).toUpperCase();
      const ap = [...T.matchAll(/([A-ZÀ-Ý][A-Za-zÀ-ÿ'’-]+(?:[ -][A-Za-zÀ-ÿ'’-]+){0,4})\s*\(([A-Z]{3})\)/g)].map(m=>m[1].trim().split(/\s+/)[0]);
      if(ap.length >= 2){ r.from = ap[0]; r.to = ap[1]; } else if(iata.length >= 2){ r.from = iata[0]; r.to = iata[1]; }
      const fr = T.match(/(?:de|from|départ de)\s+([A-ZÉ][\wéèêàç' -]{2,30}?)\s+(?:à|to|vers|->|→)\s+([A-ZÉ][\wéèêàç' -]{2,30})/);
      if(fr && !r.from){ r.from = fr[1].trim(); r.to = fr[2].trim(); }
    } else if(kind === 'hotel'){
      r.kind = 'hotel';
      const hn = T.match(/(?:h[oô]tel|hotel|établissement|propriété|property)\s*[:\-]?\s*([^\n]{3,60})/i); if(hn) r.nom = hn[1].trim().replace(/^[:\-\s]+/,'');
      const ad = T.match(/(?:adresse|address)\s*[:\-]?\s*([^\n]{6,90})/i); if(ad) r.adresse = ad[1].trim();
    } else if(kind === 'train' || kind === 'bus' || kind === 'ferry'){
      r.kind = kind;
      const fr = T.match(/([A-ZÉ][\wéèêàç' -]{2,30}?)\s*(?:->|→|›|>|à|to)\s*([A-ZÉ][\wéèêàç' -]{2,30})/); if(fr){ r.from = fr[1].trim(); r.to = fr[2].trim(); }
    } else actParse(T, r);
    r.date = dates[0] || ''; r.dateFin = dates.length > 1 && r.kind === 'hotel' ? dates[1] : '';
    r.heure = times[0] || ''; r.heureArr = r.kind !== 'hotel' ? (times[1] || '') : '';
    const co = T.match(/\b(Air France|KLM|Transavia|easyJet|Ryanair|Vueling|Volotea|Lufthansa|ITA Airways|Iberia|TAP|British Airways|Emirates|Qatar Airways|Turkish Airlines|Aegean|Air Malta|Wizz Air|EgyptAir|Royal Air Maroc|SNCF|OUIGO|TGV INOUI|Trenitalia|Italo|Renfe|Eurostar|FlixBus|BlaBlaCar)\b/i);
    if(co) r.compagnie = co[1] + (r.flight ? ' ' + r.flight : ''); else if(r.flight) r.compagnie = r.flight;
    if(r.kind === 'ferry' && !co){ const fc = T.match(/\b(Brittany Ferries|Corsica Ferries|Corsica Linea|La Méridionale|Moby|Grimaldi|Minoan|Blue Star|Virtu Ferries|GNV|DFDS|P&O|Irish Ferries|Stena Line|Balearia|Trasmed|Tirrenia|Anek|Seajets)\b/i); if(fc) r.compagnie = fc[1]; }
    const px = T.match(/(?:total|montant|prix|price|amount|à payer)[^\n\d]{0,25}(\d[\d\s.,]*\d)\s*(?:€|eur)/i) || T.match(/(\d[\d\s.,]*[.,]\d{2})\s*(?:€|eur)\b/i);
    if(px) r.prix = px[1].replace(/\s/g,'').replace(/\.(?=\d{3}\b)/g,'').replace(',', '.');
    return r;
  }
  function cfSheet(){
    openSheet(`<h2>📋 Coller une confirmation</h2><div class="v-sum-small" style="margin-bottom:8px">Copie le texte de l’e-mail de réservation (vol, hôtel, train, bus…) et colle-le ici : l’appli repère la date, les horaires, la référence, la compagnie et le prix. Tu vérifies avant d’enregistrer. Rien n’est envoyé sur Internet.</div>
      <textarea class="v-in" id="cf-txt" rows="8" placeholder="Colle ici le texte de la confirmation…"></textarea>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.cfGo()">🔍 Analyser</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  function cfGo(){
    const txt = (document.getElementById('cf-txt')||{}).value || ''; if(txt.trim().length < 20){ alert('Colle le texte complet de la confirmation.'); return; }
    cfImport(txt);
  }

  /* ---------- 🌍 Empreinte carbone et conseils de réservation ---------- */
  // Facteurs d'ordre de grandeur (kg CO2e par passager et par km), inspirés des moyennes ADEME / Base Carbone.
  const CO2F = d => ({Avion: d < 1000 ? 0.23 : d < 3500 ? 0.18 : 0.15, Train: 0.03, Bus: 0.03, Voiture: 0.11, Ferry: 0.12, Bateau: 0.12}); 
  async function tlCo2(){
    const tr = items(i=>i.cat==='transport' && i.from && i.to).sort(sortItems);
    if(!tr.length){ alert('Ajoute des trajets avec un départ et une arrivée.'); return; }
    openSheet(`<h2>🌍 Empreinte et conseils</h2><div id="co2-box" class="cv-route-load">📡 Calcul des distances…</div><div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
    let tot = 0, rows = '', tips = '';
    for(const it of tr){
      const a = await geocode(it.from, null).catch(()=>null), b = await geocode(it.to, null).catch(()=>null);
      if(!a || !b){ rows += `<div class="cv-dayi"><b>${icon(it)} ${esc(it.titre)}</b><div class="v-sum-small">ville introuvable</div></div>`; continue; }
      const d = km(a, b) * (it.mode === 'Avion' ? 1.08 : 1.25), mode = it.mode || 'Train', f = (CO2F(d)[mode] != null ? CO2F(d)[mode] : 0.1), kg = d * f; tot += kg;
      rows += `<div class="cv-dayi"><b>${icon(it)} ${esc(it.titre)}</b><div class="v-sum-small">≈ ${Math.round(d).toLocaleString((window.I18N ? I18N.locale : 'fr-FR'))} km · <b>≈ ${Math.round(kg).toLocaleString((window.I18N ? I18N.locale : 'fr-FR'))} kg CO2e</b> par personne${mode==='Avion' && d < 800 ? ' · en train ce serait env. ' + Math.round(d*0.03) + ' kg' : ''}</div></div>`;
      if(it.mode === 'Avion' && it.statut === 'todo' && it.date){
        const w = (new Date(it.date) - new Date(isoToday())) / (7*864e5), lg = d > 3500;
        const ideal = lg ? [8, 24] : [4, 12];
        tips += `<div class="cv-dayi"><b>✈️ ${esc(it.titre)}</b> · départ dans ${Math.max(0, Math.round(w))} semaine(s)<div class="v-sum-small">${w > ideal[1] ? `⏳ Un peu tôt : la fenêtre la plus souvent favorable est ${ideal[0]}–${ideal[1]} semaines avant. Compare plusieurs dates sur les sites des compagnies.` : w >= ideal[0] ? `✅ Bonne période pour réserver (${ideal[0]}–${ideal[1]} semaines avant). Compare les prix sur les sites des compagnies.` : `⚠️ Départ proche : les prix montent souvent. Compare vite (dates voisines, aéroports proches).`}</div></div>`;
      }
    }
    const b = document.getElementById('co2-box'); if(!b) return;
    b.className = ''; b.innerHTML = `<div class="v-sum" style="margin:0 0 8px"><div class="v-sum-big">≈ ${Math.round(tot).toLocaleString((window.I18N ? I18N.locale : 'fr-FR'))} kg CO2e</div><div class="v-sum-small">par personne pour les trajets du voyage · repère : un aller-retour Paris–New York ≈ 1 t ; un Français émet ≈ 9 t par an</div></div>
      ${rows}${tips ? '<h3 style="margin:14px 0 4px">Quand réserver ?</h3>' + tips : ''}
      <div class="v-sum-small" style="margin-top:8px">Ordres de grandeur (distance à vol d’oiseau corrigée × facteurs moyens type ADEME), pas un calcul certifié. Conseils de réservation = tendances générales, pas une prédiction de prix.</div>`;
  }

  /* ---------- 📍 Je suis ici · 📊 Mes stats ---------- */
  async function countryOf(city){
    M.ctry = M.ctry || {}; const k = normQ(city); if(M.ctry[k]) return M.ctry[k];
    const wait = 1100 - (Date.now() - geoLast); if(wait > 0) await new Promise(r=>setTimeout(r, wait)); geoLast = Date.now();
    try { const j = await (await fetch(GEO + 'search?format=jsonv2&limit=1&addressdetails=1&accept-language=' + ((window.I18N && I18N.lang) || 'fr') + '&q=' + encodeURIComponent(city))).json();
      const a = j && j[0] && j[0].address; if(a && a.country){ M.ctry[k] = {pays:a.country, cc:(a.country_code||'').toUpperCase()}; persist(); return M.ctry[k]; } } catch(e){}
    return null;
  }
  const flag = cc => cc && cc.length === 2 ? String.fromCodePoint(...[...cc].map(c=>127397 + c.charCodeAt(0))) : '🌍';
  const frCountry = (cc, fb) => { try { return new Intl.DisplayNames([window.I18N ? I18N.lang : 'fr'], {type:'region'}).of(cc) || fb || cc; } catch(e){ return fb || cc; } };
  async function tlStats(){
    openSheet(`<h2>📊 Mes stats de voyage</h2><div id="stt" class="cv-route-load">📡 Je compte…</div><div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
    const ts = trips(), now = isoToday(); let nights = 0, kmTot = 0, nSteps = 0; const countries = {}, cities = new Set();
    for(const t of ts){
      if(t.debut) nights += Math.max(0, nights_(t.debut, t.fin || t.debut));
      const hs = list('item', i=>i.trip===t.id && i.cat==='hotel' && i.date && !i.deleted).sort((a,b)=>a.date.localeCompare(b.date));
      let prev = null;
      for(const h of hs){ const c = stayCity(h); if(!c) continue; cities.add(normQ(c));
        const g = geoCached(c) || await geocode(c, null).catch(()=>null); if(g && prev) kmTot += km(prev, g); if(g) prev = g;
        if(t.debut && t.debut <= now){ const co = await countryOf(c); const cc = co && (co.cc || ccOf(co.pays)); if(cc) countries[cc] = {cc, pays:frCountry(cc, co.pays)}; } }
      geoSouvs(t.id).forEach(s=>{ nSteps++; const cc = s.cc || ccOf(s.pays); if(cc) countries[cc] = {cc, pays:frCountry(cc, s.pays)}; });
    }
    const el = document.getElementById('stt'); if(!el) return;
    const cs = Object.values(countries);
    el.className = ''; el.innerHTML = `<div class="cv-stats"><div><b>${ts.length}</b><span>voyage${ts.length>1?'s':''}</span></div><div><b>${nights}</b><span>nuits</span></div><div><b>${Math.round(kmTot).toLocaleString((window.I18N ? I18N.locale : 'fr-FR'))}</b><span>km entre étapes</span></div><div><b>${cities.size}</b><span>villes</span></div><div><b>${cs.length}</b><span>pays visités</span></div><div><b>${nSteps}</b><span>steps 📍</span></div></div>
      <div class="cv-flags">${cs.map(c=>`<span>${flag(c.cc)} ${esc(c.pays)}</span>`).join('') || '<span class="v-sum-small">Les pays apparaissent une fois les voyages commencés (ou avec « 📍 Je suis ici »).</span>'}</div>
      <div class="v-sum-small" style="margin-top:8px">Pays comptés pour les voyages commencés, d’après les villes des hébergements et tes « Je suis ici ». Distances à vol d’oiseau entre étapes.</div>`;
  }
  const nights_ = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);

  /* ---------- 🗺️ Export KML (Google My Maps, Organic Maps hors ligne, Google Earth…) ---------- */
  function kmlEsc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  async function tlKml(){
    const t = trip(); if(!t) return;
    toast('🗺️ Préparation de l’export…');
    const pm = [], st = tlStages(), line = []; try { await stagesGeoFix(st.map(s=>s.city)); } catch(e){}
    for(const s of st){ const g = geoCached(s.city) || await geocode(s.city, null).catch(()=>null); if(g){ line.push(g); pm.push(`<Placemark><name>${kmlEsc('🏨 ' + s.city)}</name><description>${kmlEsc(fshort(s.debut) + ' → ' + fshort(s.fin) + (s.h && s.h.nom ? ' · ' + s.h.nom : ''))}</description><styleUrl>#etape</styleUrl><Point><coordinates>${g.lng},${g.lat}</coordinates></Point></Placemark>`); } }
    if(line.length > 1) pm.push(`<Placemark><name>Itinéraire du voyage</name><styleUrl>#trace</styleUrl><LineString><tessellate>1</tessellate><coordinates>${line.map(g=>g.lng+','+g.lat).join(' ')}</coordinates></LineString></Placemark>`);
    dayList().forEach((d,i)=>{ const pl = placesOf(d).filter(p=>p.lat != null), r = dayInfo(d).route;
      pl.forEach((p,k)=>pm.push(`<Placemark><name>${kmlEsc(PJ(i+1) + '.' + (k+1) + ' ' + p.nom)}</name><styleUrl>#lieu</styleUrl><Point><coordinates>${p.lng},${p.lat}</coordinates></Point></Placemark>`));
      if(r && r.geom && r.geom.length > 1) pm.push(`<Placemark><name>${kmlEsc(PJ(i+1) + ' · ' + PT('à pied'))}</name><styleUrl>#pied</styleUrl><LineString><coordinates>${r.geom.map(p=>p[1]+','+p[0]).join(' ')}</coordinates></LineString></Placemark>`); });
    geoSouvs(M.trip).forEach(s=>pm.push(`<Placemark><name>${kmlEsc('📍 ' + (s.lieu || 'Je suis ici') + ' · ' + fshort(s.date))}</name><description>${kmlEsc(s.note||'')}</description><styleUrl>#ici</styleUrl><Point><coordinates>${s.lng},${s.lat}</coordinates></Point></Placemark>`));
    if(!pm.length){ alert('Rien à exporter : ajoute des hébergements avec leur ville ou des lieux à voir.'); return; }
    const kml = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${kmlEsc(t.titre)}</name>
<Style id="etape"><IconStyle><color>ffed3a7c</color></IconStyle></Style><Style id="lieu"><IconStyle><color>ff2626dc</color></IconStyle></Style><Style id="ici"><IconStyle><color>ff4ac716</color></IconStyle></Style>
<Style id="trace"><LineStyle><color>ffed3a7c</color><width>4</width></LineStyle></Style><Style id="pied"><LineStyle><color>ffe5464f</color><width>3</width></LineStyle></Style>
${pm.join('\n')}</Document></kml>`;
    tlShareFile(new Blob([kml], {type:'application/vnd.google-earth.kml+xml'}), pdfName('itineraire', t).replace(/\.pdf$/,'.kml'), 'Itinéraire ' + t.titre);
  }

  /* ---------- 🪄 Remplir mes journées (lieux les plus connus, répartis sur les jours libres) ---------- */
  async function placesFor(city){
    const key = normQ(city); M.poiCache = M.poiCache || {};
    const hit = M.poiCache[key]; if(hit && hit.v === 2 && Date.now() - hit.t < DISC_TTL && hit.list.length && (hit.wd || Date.now() - hit.t < 864e5)) return hit.list;
    const c = await withTimeout(geocode(city, null), 10000).catch(()=>null); if(!c) return [];
    const res = await Promise.allSettled([seeWiki(c), seeApi(c), seeOverpass(c), seeWD(c)].map(p=>withTimeout(p, 10000)));
    const seen = new Set(), all = res.filter(r=>r.status==='fulfilled').flatMap(r=>r.value||[]);
    const list_ = all.filter(p=>p.nom && p.lat != null && !/^\d+$/.test(p.nom)).sort((x,y)=>y.score-x.score).filter(p=>{ const k = normQ(p.nom); if(seen.has(k)) return false; seen.add(k); return true; }).slice(0,150);
    if(list_.length){ M.poiCache[key] = {t:Date.now(), list:list_, wd: all.some(p=>p.sl), v:2}; persist(); }
    return list_;
  }
  /* ---------- 💡 Suggestions : 4 incontournables par jour, à trier quand on veut ---------- */
  const SUGG_N = 4;
  // recherche en cours (en mémoire seulement : si l’appli est fermée pendant la recherche, rien ne reste bloqué)
  let SG = null;
  const sgName = (tid, nom) => { const L = ((M.suggNo || {})[tid] || []).concat(list('place', p=>p.trip === tid).map(p=>p.nom)); return new Set(L.map(normQ)).has(normQ(nom)); };

  /* 🎟️ EXPÉRIENCES À VIVRE : 3 ou 4 activités phares par destination (croisière, montgolfière, plongée…), réservables chez nos partenaires.
     Ailleurs : visite guidée, gastronomie, cuisine et excursion de la ville, qui ouvrent les vraies offres du coin. */
  const EXT = {"cru": ["🛳️", "Croisière", "cruise"], "bat": ["⛵", "Sortie en bateau", "boat tour"], "cat": ["⛵", "Catamaran", "catamaran"], "fel": ["⛵", "Felouque", "felucca"], "gon": ["🛶", "Gondole", "gondola"], "kay": ["🛶", "Kayak", "kayak"], "raf": ["🛶", "Rafting", "rafting"], "plo": ["🤿", "Plongée", "scuba diving"], "sno": ["🤿", "Snorkeling", "snorkeling"], "tor": ["🐢", "Nager avec les tortues", "turtles"], "req": ["🦈", "Raies et requins", "sharks"], "dau": ["🐬", "Dauphins", "dolphins"], "bal": ["🐋", "Observation des baleines", "whale watching"], "sur": ["🏄", "Cours de surf", "surf lesson"], "par": ["🪂", "Saut en parachute", "skydiving"], "pp": ["🪂", "Parapente", "paragliding"], "mon": ["🎈", "Montgolfière", "hot air balloon"], "hel": ["🚁", "Survol en hélicoptère", "helicopter tour"], "hyd": ["🛩️", "Hydravion", "seaplane"], "ran": ["🥾", "Randonnée guidée", "hiking tour"], "vol": ["🌋", "Volcan", "volcano tour"], "gla": ["🧊", "Glacier", "glacier"], "can": ["🧗", "Canyoning", "canyoning"], "tyr": ["🧗", "Tyrolienne", "zipline"], "gro": ["🦇", "Grottes", "cave tour"], "saf": ["🦁", "Safari", "safari"], "jun": ["🌴", "Jungle et forêt", "rainforest tour"], "jee": ["🚙", "Excursion en 4x4", "jeep tour"], "qua": ["🏍️", "Quad et buggy", "quad"], "cha": ["🐪", "Balade à dos de chameau", "camel ride"], "che": ["🐎", "Balade à cheval", "horse riding"], "vel": ["🚲", "Balade à vélo", "bike tour"], "tra": ["🚂", "Train panoramique", "scenic train"], "cui": ["👩‍🍳", "Cours de cuisine", "cooking class"], "foo": ["🍜", "Visite gastronomique", "food tour"], "vin": ["🍷", "Dégustation de vins", "wine tasting"], "bie": ["🍺", "Dégustation de bières", "beer tasting"], "whi": ["🥃", "Distillerie de whisky", "whisky tasting"], "rhu": ["🥃", "Distillerie de rhum", "rum distillery"], "the": ["🍵", "Thé", "tea"], "caf": ["☕", "Plantation de café", "coffee tour"], "gui": ["🏛️", "Visite guidée", "guided tour"], "cop": ["🎟️", "Billet coupe-file", "tickets"], "nui": ["🌙", "Sortie de nuit", "night tour"], "spe": ["🎭", "Spectacle", "show"], "ham": ["🧖", "Hammam", "hammam"], "thm": ["♨️", "Bains thermaux", "thermal baths"], "aur": ["🌌", "Aurores boréales", "northern lights"], "chi": ["🐕", "Chiens de traîneau", "husky sledding"], "mot": ["🛷", "Motoneige", "snowmobile"], "ski": ["⛷️", "Ski", "ski"], "ile": ["🏝️", "Excursion dans les îles", "island hopping"], "exc": ["🚌", "Excursion à la journée", "day trip"], "sun": ["🌅", "Coucher de soleil", "sunset tour"]};
  const EXPD = "Lisbonne=tra|Tram 28|Lisbon tram 28 tour;foo;bat|Tage|Lisbon Tagus sunset cruise\nSintra=gui|Palais de Pena|Sintra Pena Palace tour\nPorto=vin|Caves de porto|Porto wine cellar tasting;cru|Douro|Douro river cruise\nLagos=kay|Ponta da Piedade|Ponta da Piedade kayak;bat|Grotte de Benagil|Benagil cave boat tour\nTavira=bat|Ria Formosa|Ria Formosa boat tour\nPonta Delgada=bal;jee|Sete Cidades|Sete Cidades jeep tour\nFurnas=thm|Terra Nostra|Furnas thermal baths\nPico=ran|Mont Pico|Mount Pico hike\nFunchal=ran|Levadas|Madeira levada walk;dau;pp\nSéville=spe|Flamenco|Seville flamenco show;cop|Alcazar|Seville Alcazar skip the line;foo|Tapas|Seville tapas tour\nCordoue=cop|Mosquée-cathédrale|Cordoba Mezquita tour\nGrenade=cop|Alhambra|Alhambra tickets guided tour\nBarcelone=cop|Sagrada Família|Sagrada Familia skip the line;foo|Tapas|Barcelona tapas tour;cat|Coucher de soleil|Barcelona sunset catamaran;exc|Montserrat|Montserrat day trip\nMadrid=cop|Musée du Prado|Prado museum tour;foo|Tapas|Madrid tapas tour;spe|Flamenco|Madrid flamenco show\nTolède=gui|Tolède|Toledo day trip from Madrid\nPalma=cat|Baie de Palma|Palma catamaran;kay|Calanques|Mallorca sea kayak;tra|Train de Sóller|Soller train\nPuerto de la Cruz=vol|Teide|Teide volcano tour stargazing\nLos Gigantes=bal|Los Gigantes|Los Gigantes whale watching;kay|Falaises|Los Gigantes kayak\nSaint-Sébastien=foo|Pintxos|San Sebastian pintxos tour;sur\nBilbao=cop|Musée Guggenheim|Guggenheim Bilbao\nRome=cop|Colisée|Colosseum skip the line;cop|Vatican|Vatican museums skip the line;foo|Trastevere|Rome Trastevere food tour;cui|Pâtes fraîches|Rome pasta cooking class\nFlorence=cop|Galerie des Offices|Uffizi skip the line;cui|Florence|Florence cooking class\nSienne=vin|Chianti|Chianti wine tour\nVal d’Orcia=vin|Montalcino|Val d'Orcia wine tour\nVenise=gon|Grand Canal|Venice gondola ride;cop|Basilique Saint-Marc|St Mark's Basilica skip the line;ile|Murano & Burano|Murano Burano boat tour\nBari=foo|Bari Vecchia|Bari street food tour\nPolignano a Mare=bat|Grottes marines|Polignano boat tour caves\nAlberobello=gui|Trulli|Alberobello trulli tour\nLecce=cui|Orecchiette|Puglia cooking class\nPalerme=foo|Marchés de Palerme|Palermo street food tour\nTaormine=vol|Etna|Etna tour;sno|Isola Bella|Taormina boat snorkeling\nSyracuse=bat|Ortygie|Ortigia boat tour\nNaples=foo|Pizza napolitaine|Naples pizza tour;exc|Pompéi|Pompeii tour;vol|Vésuve|Vesuvius tour\nSorrente=bat|Capri|Capri boat tour\nPositano=bat|Côte amalfitaine|Amalfi coast boat tour\nCortina d’Ampezzo=ran|Tre Cime di Lavaredo|Tre Cime hike;pp|Dolomites|Dolomites paragliding\nVal Gardena=ran|Seceda|Seceda hike\nCagliari=bat|Villasimius|Sardinia boat tour Villasimius\nCosta Smeralda=ile|Archipel de la Maddalena|La Maddalena boat tour\nAlghero=gro|Grotte de Neptune|Neptune's grotto Alghero\nAjaccio=bat|Calanques de Piana & Scandola|Scandola boat tour\nBonifacio=bat|Falaises & îles Lavezzi|Bonifacio boat tour\nPorto-Vecchio=can|Bavella|Bavella canyoning\nCalvi=plo|Revellata|Calvi diving\nCrozon=kay|Presqu’île de Crozon|Crozon kayak\nOuessant=vel|Ouessant|Ouessant bike\nQuimper=bat|Odet|Odet boat cruise\nAvignon=gui|Palais des Papes|Palais des Papes tour;exc|Pont du Gard|Pont du Gard tour\nLuberon=gui|Villages perchés & lavande|Luberon lavender tour\nAix-en-Provence=vin|Côtes de Provence|Provence wine tasting\nStrasbourg=bat|Batorama|Strasbourg boat cruise\nColmar=vin|Route des vins d’Alsace|Alsace wine route tour\nAmsterdam=bat|Canaux|Amsterdam canal cruise;cop|Musée Van Gogh|Van Gogh museum;vel|Amsterdam|Amsterdam bike tour;exc|Moulins de Zaanse Schans|Zaanse Schans tour\nLondres=cop|Tour de Londres|Tower of London;gui|Harry Potter Studio|Warner Bros Studio Tour London;spe|West End|London musical;exc|Stonehenge|Stonehenge tour\nÉdimbourg=nui|Fantômes de la vieille ville|Edinburgh ghost tour;whi|Whisky|Edinburgh whisky tasting\nHighlands=cru|Loch Ness|Loch Ness cruise;tra|Train de Harry Potter|Jacobite steam train\nÎle de Skye=exc|Île de Skye|Isle of Skye tour\nDublin=bie|Guinness Storehouse|Guinness Storehouse;whi|Whiskey irlandais|Dublin whiskey tour\nGalway=exc|Falaises de Moher|Cliffs of Moher tour\nKillarney=vel|Anneau du Kerry|Ring of Kerry tour\nBerlin=gui|Mur de Berlin|Berlin Wall tour;bat|Spree|Spree river cruise;nui|Clubs & street art|Berlin street art tour;exc|Potsdam|Potsdam day trip\nPrague=gui|Château de Prague|Prague castle tour;bat|Vltava|Vltava river cruise;bie|Brasseries tchèques|Prague beer tour;exc|Kutná Hora|Kutna Hora day trip\nVienne=spe|Concert classique|Vienna classical concert;cop|Château de Schönbrunn|Schonbrunn skip the line\nBudapest=thm|Széchenyi|Szechenyi baths;cru|Danube by night|Budapest Danube night cruise\nSplit=ile|Hvar & îles Pakleni|Split island hopping;raf|Cetina|Cetina rafting\nHvar=bat|Grotte bleue|Blue cave tour\nDubrovnik=kay|Remparts|Dubrovnik sea kayak;gui|Game of Thrones|Dubrovnik Game of Thrones tour\nLjubljana=exc|Grottes de Postojna|Postojna cave tour\nBled=bat|Île de Bled|Lake Bled pletna boat;can|Bled|Bled canyoning\nPiran=bat|Golfe de Piran|Piran boat\nAthènes=cop|Acropole|Acropolis skip the line;foo|Athènes|Athens food tour;exc|Cap Sounion|Cape Sounion sunset tour\nNaxos=bat|Petites Cyclades|Naxos boat trip\nSantorin=cat|Caldeira|Santorini catamaran sunset cruise;vin|Santorin|Santorini wine tour\nMilos=bat|Kleftiko|Milos Kleftiko boat tour\nHéraklion=gui|Palais de Knossos|Knossos tour\nRéthymnon=bat|Balos & Gramvoussa|Balos boat\nLa Canée=ran|Gorges de Samaria|Samaria gorge hike\nLa Valette=gui|La Valette|Valletta walking tour;bat|Lagon bleu|Comino Blue Lagoon boat\nGozo=plo|Gozo|Gozo diving;jee|Gozo|Gozo jeep tour\nIstanbul=cru|Bosphore|Bosphorus cruise;cop|Sainte-Sophie|Hagia Sophia tour;ham|Hammam|Istanbul hammam;foo|Istanbul|Istanbul food tour\nGöreme=mon|Cappadoce|Cappadocia hot air balloon;qua|Vallées|Cappadocia ATV;che|Vallées|Cappadocia horse riding\nMarrakech=foo|Jemaa el-Fna|Marrakech food tour;ham|Hammam|Marrakech hammam;cui|Cuisine marocaine|Marrakech cooking class\nImlil (Atlas)=ran|Haut Atlas|Atlas mountains trek\nAgafay=qua|Désert d’Agafay|Agafay quad;cha|Agafay|Agafay camel ride\nFès=gui|Médina de Fès|Fes medina tour\nMerzouga=cha|Erg Chebbi|Merzouga camel trek;jee|Erg Chebbi|Merzouga 4x4\nOuarzazate=gui|Aït-Ben-Haddou|Ait Ben Haddou tour\nLe Caire=gui|Pyramides de Gizeh|Giza pyramids tour;cha|Pyramides|Giza camel ride;spe|Son et lumière|Giza sound and light show\nLouxor=mon|Louxor|Luxor hot air balloon;cru|Nil|Nile cruise Luxor Aswan;gui|Vallée des Rois|Valley of the Kings tour\nAssouan=fel|Nil|Aswan felucca;exc|Abou Simbel|Abu Simbel tour\nAmman=gui|Jerash|Jerash tour\nPétra=nui|Petra by Night|Petra by night\nWadi Rum=jee|Wadi Rum|Wadi Rum jeep tour;cha|Wadi Rum|Wadi Rum camel\nAqaba=sno|Mer Rouge|Aqaba snorkeling\nReykjavik=aur|Reykjavik|Reykjavik northern lights;exc|Cercle d’or|Golden Circle tour;thm|Blue Lagoon|Blue Lagoon;bal|Reykjavik|Reykjavik whale watching\nVík=gla|Sólheimajökull|Solheimajokull glacier hike\nHöfn=bat|Jökulsárlón|Jokulsarlon boat tour\nAkureyri=bal|Húsavík|Husavik whale watching\nBergen=cru|Fjords|Bergen fjord cruise\nFlåm=tra|Flåmsbana|Flam railway;kay|Nærøyfjord|Naeroyfjord kayak\nGeiranger=cru|Geirangerfjord|Geirangerfjord cruise\nÅlesund=bat|Ålesund|Alesund boat\nRovaniemi=chi|Laponie|Rovaniemi husky safari;aur|Rovaniemi|Rovaniemi northern lights;mot|Laponie|Rovaniemi snowmobile;gui|Village du Père Noël|Santa Claus Village\nSaariselkä=aur|Saariselkä|Saariselka aurora\nNew York=hel|Manhattan|New York helicopter tour;cop|Empire State Building|Empire State Building tickets;spe|Broadway|Broadway show;bat|Statue de la Liberté|Statue of Liberty cruise\nLas Vegas=spe|Las Vegas|Las Vegas show;hel|Grand Canyon|Grand Canyon helicopter from Las Vegas\nGrand Canyon=hel|Grand Canyon|Grand Canyon helicopter\nMonument Valley=jee|Monument Valley|Monument Valley jeep tour\nSan Francisco=gui|Alcatraz|Alcatraz tour;vel|Golden Gate|Golden Gate bike tour\nMontréal=foo|Montréal|Montreal food tour\nQuébec=gui|Vieux-Québec|Quebec City walking tour\nTadoussac=bal|Saint-Laurent|Tadoussac whale watching\nTokyo=foo|Shinjuku|Tokyo food tour;spe|Sumo|Tokyo sumo;exc|Mont Fuji|Mount Fuji day trip\nHakone=bat|Lac Ashi|Lake Ashi cruise\nKyoto=the|Cérémonie du thé|Kyoto tea ceremony;gui|Geishas de Gion|Kyoto Gion tour\nHiroshima=exc|Miyajima|Miyajima tour\nOsaka=foo|Dotonbori|Osaka street food tour;exc|Nara|Nara day trip\nBangkok=bat|Klongs|Bangkok canal tour;foo|Street food|Bangkok street food tour;exc|Marché flottant|Damnoen Saduak floating market\nChiang Mai=cui|Cuisine thaïe|Chiang Mai cooking class;gui|Sanctuaire d’éléphants|Chiang Mai elephant sanctuary\nKrabi=ile|Îles Phi Phi|Phi Phi islands tour;kay|Ao Thalane|Krabi kayak\nKoh Lanta=plo|Koh Haa|Koh Lanta diving\nHanoï=foo|Vieux quartier|Hanoi street food tour\nBaie d’Halong=cru|Baie d’Halong|Halong Bay cruise;kay|Baie d’Halong|Halong Bay kayak\nHội An=cui|Cuisine vietnamienne|Hoi An cooking class;vel|Rizières|Hoi An bike tour\nHô Chi Minh-Ville=exc|Delta du Mékong|Mekong Delta tour;gui|Tunnels de Cu Chi|Cu Chi tunnels\nUbud=ran|Mont Batur|Mount Batur sunrise trek;raf|Ayung|Ubud rafting;cui|Cuisine balinaise|Bali cooking class\nNusa Penida=sno|Raies manta|Nusa Penida manta snorkeling\nUluwatu=spe|Danse Kecak|Uluwatu Kecak dance;sur\nSigiriya=saf|Minneriya|Minneriya safari\nKandy=spe|Danses kandyennes|Kandy cultural show\nElla=tra|Kandy–Ella|Kandy Ella train\nMirissa=bal|Mirissa|Mirissa whale watching\nSaint-Gilles=par|Saint-Gilles|Reunion skydiving;pp|Saint-Leu|Reunion paragliding;dau|Saint-Gilles|Reunion dolphin\nCilaos=can|Cilaos|Cilaos canyoning;hel|Cirques|Reunion helicopter\nMafate=ran|Mafate|Mafate hike\nSaint-Pierre=vol|Piton de la Fournaise|Piton de la Fournaise\nSainte-Anne@GP=par|Grande-Terre|Guadeloupe skydiving;cat|Lagon|Guadeloupe catamaran;kay|Mangrove|Guadeloupe mangrove kayak\nDeshaies=plo|Réserve Cousteau|Reserve Cousteau diving;ran|Soufrière|La Soufriere hike\nMarie-Galante=rhu|Marie-Galante|Marie-Galante rum\nLa Fortuna=tyr|Arenal|Arenal zipline;vol|Arenal|Arenal volcano hike\nMonteverde=jun|Ponts suspendus|Monteverde hanging bridges;nui|Forêt de nuit|Monteverde night walk\nManuel Antonio=gui|Parc Manuel Antonio|Manuel Antonio guided tour;cat|Manuel Antonio|Manuel Antonio catamaran\nTortuguero=bat|Canaux de Tortuguero|Tortuguero canal tour\nMérida=gui|Uxmal|Uxmal tour\nValladolid=gui|Chichén Itzá|Chichen Itza tour;sno|Cenotes|cenote swim Valladolid\nTulum=sno|Cenotes|Tulum cenotes snorkeling;tor|Akumal|Akumal turtles\nBacalar=kay|Lagune aux sept couleurs|Bacalar kayak\nSal=sur|Kitesurf|Sal kitesurf;tor|Sal|Sal turtle\nSanto Antão=ran|Santo Antão|Santo Antao hike\nParis=cru|Seine|Seine river cruise;cop|Tour Eiffel|Eiffel Tower skip the line;cop|Louvre|Louvre guided tour;spe|Cabaret|Paris cabaret show;exc|Versailles|Versailles tour\nNice=bat|Baie des Anges|Nice boat tour;foo|Vieux-Nice|Nice food tour\nAntibes=sno|Cap d’Antibes|Antibes snorkeling\nBayeux=gui|Plages du Débarquement|D-Day beaches tour\nÉtretat=kay|Falaises d’Étretat|Etretat kayak\nMont-Saint-Michel=ran|Baie du Mont-Saint-Michel|Mont Saint Michel bay walk\nBiarritz=sur\nSaint-Jean-de-Luz=tra|Train de la Rhune|La Rhune train\nEspelette=foo|Pays basque|Basque food tour\nAnnecy=pp|Lac d’Annecy|Annecy paragliding;bat|Lac d’Annecy|Lake Annecy cruise\nChamonix=gui|Aiguille du Midi|Aiguille du Midi;tra|Mer de Glace|Mer de Glace train\nTours=gui|Chambord & Chenonceau|Loire castles tour\nAmboise=mon|Val de Loire|Loire Valley balloon;vin|Vouvray|Vouvray wine tasting\nBordeaux=vin|Médoc|Medoc wine tour;cop|Cité du Vin|Cite du Vin\nSaint-Émilion=vin|Saint-Émilion|Saint-Emilion wine tasting\nArcachon=bat|Banc d’Arguin|Arcachon boat;foo|Huîtres|Arcachon oyster tasting\nLyon=foo|Bouchons lyonnais|Lyon food tour;gui|Traboules|Lyon traboules tour\nSarlat-la-Canéda=gro|Lascaux IV|Lascaux tour;kay|Dordogne|Dordogne canoe\nRocamadour=gro|Gouffre de Padirac|Padirac\nMarseille=bat|Calanques|Calanques boat tour;foo|Marseille|Marseille food tour\nCassis=kay|Calanques|Calanques kayak\nGavarnie=ran|Cirque de Gavarnie|Gavarnie hike\nCauterets=thm|Cauterets|Cauterets spa\nLe Mont-Dore=pp|Puy de Dôme|Puy de Dome paragliding\nClermont-Ferrand=gui|Vulcania|Vulcania\nLa Rochelle=bat|Fort Boyard|Fort Boyard boat\nÎle de Ré=vel|Île de Ré|Ile de Re bike\nLes Trois-Îlets=cat|Baie de Fort-de-France|Martinique catamaran;dau|Martinique|Martinique dolphins\nSaint-Pierre@MQ=ran|Montagne Pelée|Montagne Pelee hike\nPapeete=jee|Tahiti|Tahiti 4x4 tour\nMoorea=req|Lagon de Moorea|Moorea snorkeling rays sharks;bal|Moorea|Moorea whale watching\nBora-Bora=sno|Lagon de Bora-Bora|Bora Bora lagoon tour;jee|Bora-Bora|Bora Bora 4x4\nNouméa=bat|Îlot Amédée|Amedee island\nÎle des Pins=sno|Piscine naturelle|Ile des Pins\nBourail=sur|Roche Percée|Bourail surf\nValence=foo|Paella|Valencia paella cooking class;vel|Valence|Valencia bike tour\nIbiza=cat|Formentera|Formentera boat;sun|Café del Mar|Ibiza sunset\nLanzarote=jee|Timanfaya|Timanfaya tour\nFuerteventura=sur|Corralejo|Fuerteventura surf\nSaint-Jacques-de-Compostelle=gui|Cathédrale|Santiago de Compostela tour\nVigo=bat|Îles Cíes|Cies islands\nCangas de Onís=kay|Sella|Sella canoe;ran|Picos de Europa|Picos de Europa hike\nPinhão=cru|Douro|Douro cruise Pinhao;vin|Quintas du Douro|Douro wine tasting\nÉvora=vin|Alentejo|Alentejo wine tour\nMonsaraz=mon|Alqueva|Alentejo balloon\nComporta=che|Plage de Comporta|Comporta horse riding\nCôme=bat|Lac de Côme|Lake Como boat tour;hyd|Lac de Côme|Lake Como seaplane\nBellagio=kay|Bellagio|Bellagio kayak\nStresa=bat|Îles Borromées|Borromean islands\nMonterosso al Mare=bat|Cinque Terre|Cinque Terre boat tour;ran|Sentier Azur|Cinque Terre hike\nManarola=vin|Cinque Terre|Cinque Terre wine\nBologne=foo|Bologne|Bologna food tour;cui|Tortellini|Bologna pasta class\nParme=foo|Parmesan & jambon|Parma food tour\nModène=gui|Ferrari|Maranello Ferrari museum\nMilan=cop|La Cène|Last Supper tickets;cop|Duomo|Milan Duomo rooftop\nPérouse=foo|Chocolat de Pérouse|Perugia chocolate\nAssise=gui|Basilique Saint-François|Assisi tour\nOrvieto=vin|Orvieto|Orvieto wine tasting\nMellieħa=bat|Comino|Comino boat\nCorfou=bat|Corfou|Corfu boat tour\nCéphalonie=bat|Melissani|Melissani cave\nNauplie=gui|Mycènes & Épidaure|Mycenae Epidaurus tour\nOlympie=gui|Olympie antique|Olympia tour\nMonemvasia=gui|Monemvasia|Monemvasia\nThessalonique=foo|Thessalonique|Thessaloniki food tour\nKalambaka=gui|Monastères des Météores|Meteora tour;sun|Météores|Meteora sunset tour\nRhodes=gui|Vieille ville de Rhodes|Rhodes old town tour;ile|Symi|Symi boat trip\nLindos=bat|Lindos|Lindos boat\nPaphos=bat|Lagon bleu d’Akamas|Akamas blue lagoon\nLimassol=vin|Commandaria|Cyprus wine tour\nTroodos=jee|Troodos|Troodos jeep\nBruxelles=foo|Chocolat & bière|Brussels chocolate beer tour\nBruges=bat|Canaux de Bruges|Bruges canal boat;bie|Bruges|Bruges beer tasting\nGand=bat|Gand|Ghent boat\nCopenhague=bat|Canaux|Copenhagen canal tour;vel|Copenhague|Copenhagen bike tour;foo|Smørrebrød|Copenhagen food tour\nStockholm=ile|Archipel|Stockholm archipelago cruise;cop|Musée Vasa|Vasa museum\nVilnius=gui|Vilnius|Vilnius walking tour\nRiga=foo|Marché central|Riga food tour\nTallinn=gui|Vieille ville|Tallinn old town tour\nLucerne=bat|Lac des Quatre-Cantons|Lake Lucerne cruise;gui|Mont Pilate|Mount Pilatus\nInterlaken=par|Interlaken|Interlaken skydiving;pp|Interlaken|Interlaken paragliding;gui|Jungfraujoch|Jungfraujoch\nZermatt=tra|Glacier Express|Glacier Express;gui|Gornergrat|Gornergrat\nMunich=bie|Brasseries bavaroises|Munich beer tour;exc|Neuschwanstein|Neuschwanstein tour\nFüssen=cop|Neuschwanstein|Neuschwanstein tickets\nBerchtesgaden=gui|Nid d’Aigle|Eagle's Nest tour;bat|Königssee|Konigssee boat\nSalzbourg=gui|Sound of Music|Sound of Music tour;spe|Concert Mozart|Salzburg Mozart concert\nHallstatt=bat|Lac de Hallstatt|Hallstatt boat;gro|Mine de sel|Hallstatt salt mine\nInnsbruck=gui|Nordkette|Nordkette\nSt Ives=bat|St Ives|St Ives seal boat\nFalmouth=bat|Falmouth|Falmouth boat\nSnowdonia=tra|Snowdon|Snowdon mountain railway;tyr|Zip World|Zip World\nConwy=gui|Château de Conwy|Conwy castle\nPembrokeshire=kay|Pembrokeshire|Pembrokeshire coasteering\nSvolvær=aur|Lofoten|Lofoten northern lights;bat|Trollfjord|Trollfjord boat\nReine=kay|Reine|Reine kayak\nCracovie=exc|Auschwitz-Birkenau|Auschwitz tour;gro|Mine de sel de Wieliczka|Wieliczka salt mine\nBrașov=gui|Château de Bran|Bran castle tour\nSighișoara=gui|Sighișoara|Sighisoara\nSibiu=foo|Sibiu|Sibiu food\nSofia=exc|Monastère de Rila|Rila monastery tour\nPlovdiv=gui|Plovdiv|Plovdiv walking tour\nVarna=bat|Varna|Varna boat\nKotor=bat|Bouches de Kotor|Bay of Kotor boat tour;ran|Forteresse de Kotor|Kotor fortress hike\nBudva=bat|Budva|Budva boat\nŽabljak=raf|Tara|Tara rafting\nTirana=gui|Bunk’Art|Bunk'Art Tirana\nBerat=gui|Berat|Berat\nKsamil=bat|Ksamil|Ksamil boat;gui|Butrint|Butrint tour\nGjirokastër=gui|Gjirokastër|Gjirokaster\nSarajevo=gui|Sarajevo|Sarajevo war tour\nMostar=gui|Stari Most|Mostar tour\nOhrid=bat|Lac d’Ohrid|Lake Ohrid boat\nSkopje=exc|Canyon de Matka|Matka canyon\nBelgrade=bat|Danube & Save|Belgrade river cruise;foo|Belgrade|Belgrade food tour\nNovi Sad=vin|Fruška Gora|Fruska Gora wine\nTbilissi=thm|Bains sulfureux|Tbilisi sulfur baths;foo|Tbilissi|Tbilisi food tour\nKazbegi=jee|Gergeti|Kazbegi jeep\nTelavi=vin|Kakhétie|Kakheti wine tour\nErevan=vin|Brandy arménien|Yerevan brandy;exc|Garni & Geghard|Garni Geghard tour\nDilijan=ran|Dilijan|Dilijan hike\nFethiye=pp|Ölüdeniz|Oludeniz paragliding;bat|Fethiye|Fethiye boat trip\nKaş=plo|Kaş|Kas diving;kay|Kekova|Kekova kayak\nAntalya=raf|Köprülü|Koprulu rafting;bat|Antalya|Antalya boat\nDjerba=qua|Djerba|Djerba quad;cha|Djerba|Djerba camel\nTozeur=jee|Oasis de montagne|Tozeur 4x4 tour\nTunis=gui|Carthage & Sidi Bou Saïd|Carthage Sidi Bou Said tour\nEssaouira=che|Plage d’Essaouira|Essaouira horse riding;sur|Essaouira|Essaouira kitesurf\nAgadir=qua|Dunes d’Agadir|Agadir quad\nTaghazout=sur|Taghazout|Taghazout surf\nHurghada=plo|Mer Rouge|Hurghada diving;sno|Giftun|Giftun island snorkeling;qua|Désert|Hurghada quad\nMarsa Alam=sno|Dugongs & tortues|Marsa Alam snorkeling;dau|Samadai|Marsa Alam dolphin house\nMascate=dau|Mascate|Muscat dolphin watching;sno|Îles Daymaniyat|Daymaniyat snorkeling\nNizwa=gui|Fort de Nizwa|Nizwa tour\nWahiba Sands=jee|Wahiba Sands|Wahiba Sands 4x4;cha|Wahiba Sands|Wahiba camel\nSour=tor|Ras al-Jinz|Ras al Jinz turtles\nDubaï=jee|Safari dans le désert|Dubai desert safari;cop|Burj Khalifa|Burj Khalifa tickets;par|Palm Jumeirah|Skydive Dubai;cru|Dhow|Dubai dhow cruise\nAbou Dabi=gui|Grande Mosquée|Sheikh Zayed Mosque tour\nTachkent=gui|Tachkent|Tashkent tour\nSamarcande=gui|Registan|Samarkand tour\nBoukhara=gui|Boukhara|Bukhara walking tour\nKhiva=gui|Itchan Kala|Khiva tour\nDelhi=foo|Vieux Delhi|Old Delhi food tour\nAgra=gui|Taj Mahal|Taj Mahal sunrise tour\nJaipur=mon|Jaipur|Jaipur hot air balloon;gui|Fort d’Amber|Amber Fort tour;cui|Cuisine indienne|Jaipur cooking class\nUdaipur=bat|Lac Pichola|Lake Pichola boat\nJodhpur=tyr|Fort de Mehrangarh|Mehrangarh zipline\nKochi=spe|Kathakali|Kochi Kathakali\nMunnar=the|Munnar|Munnar tea plantation\nAlleppey=cru|Backwaters|Alleppey houseboat\nVarkala=sur|Varkala|Varkala surf\nKatmandou=hel|Everest|Everest helicopter tour;gui|Vallée de Katmandou|Kathmandu tour\nPokhara=pp|Pokhara|Pokhara paragliding;ran|Annapurna|Annapurna trek\nChitwan=saf|Chitwan|Chitwan safari\nMalé=plo|Maldives|Maldives diving;hyd|Atolls|Maldives seaplane\nMaafushi=sno|Requins-baleines|Maldives whale shark snorkeling;dau|Maafushi|Maafushi dolphin\nEl Nido=ile|Tours A à D|El Nido island hopping;kay|Lagons|El Nido kayak\nCoron=plo|Épaves|Coron wreck diving;ile|Coron|Coron island hopping\nPuerto Princesa=bat|Rivière souterraine|Puerto Princesa underground river\nKuala Lumpur=gui|Tours Petronas & Batu Caves|Batu Caves Petronas tour;foo|Kuala Lumpur|Kuala Lumpur food tour\nPenang=foo|Street food de George Town|Penang food tour\nKota Kinabalu=ran|Mont Kinabalu|Kinabalu climb;ile|Îles|Kota Kinabalu island hopping\nSepilok=gui|Orangs-outans|Sepilok orangutan\nSingapour=gui|Gardens by the Bay|Gardens by the Bay;nui|Night Safari|Singapore Night Safari;foo|Hawker centres|Singapore food tour\nSiem Reap=gui|Angkor au lever du soleil|Angkor sunrise tour;spe|Phare cirque|Phare circus Siem Reap;vel|Angkor|Angkor bike tour\nPhnom Penh=gui|Phnom Penh|Phnom Penh tour\nKampot=bat|Rivière de Kampot|Kampot river cruise\nLuang Prabang=gui|Chutes de Kuang Si|Kuang Si falls tour;cui|Cuisine laotienne|Luang Prabang cooking class\nVang Vieng=mon|Vang Vieng|Vang Vieng balloon;kay|Nam Song|Vang Vieng kayak tubing\n4000 îles=kay|Mékong|4000 islands kayak\nKoh Phi Phi=sno|Maya Bay|Phi Phi snorkeling\nPai=can|Pai|Pai canyon\nChiang Rai=gui|Temple Blanc|Chiang Rai white temple tour\nGili Air=sno|Tortues|Gili snorkeling turtles\nKuta Lombok=sur|Kuta Lombok|Lombok surf\nYogyakarta=gui|Borobudur au lever du soleil|Borobudur sunrise;gui|Prambanan|Prambanan\nMont Bromo=jee|Mont Bromo|Bromo sunrise jeep\nIjen=vol|Flammes bleues d’Ijen|Ijen blue fire\nSéoul=gui|DMZ|DMZ tour;cui|Cuisine coréenne|Seoul cooking class;foo|Séoul|Seoul food tour\nGyeongju=gui|Gyeongju|Gyeongju tour\nBusan=foo|Marché Jagalchi|Busan food tour\nTaipei=foo|Marchés de nuit|Taipei night market tour;exc|Jiufen|Jiufen day trip\nGorges de Taroko=exc|Taroko|Taroko gorge tour\nTainan=foo|Tainan|Tainan food\nPékin=gui|Grande Muraille|Great Wall Mutianyu tour;spe|Kung-fu|Beijing kung fu show\nXi’an=gui|Armée de terre cuite|Terracotta warriors tour\nShanghai=cru|Huangpu|Huangpu river cruise\nHong Kong=gui|Victoria Peak|Victoria Peak;bat|Baie Victoria|Hong Kong harbour cruise;foo|Hong Kong|Hong Kong food tour\nMacao=gui|Macao|Macau tour\nSapporo=foo|Sapporo|Sapporo food;ski|Niseko|Niseko ski\nFurano=gui|Champs de lavande|Furano tour\nOkinawa=sno|Grotte bleue|Okinawa blue cave snorkeling\nOulan-Bator=exc|Parc de Terelj|Terelj tour\nDésert de Gobi=cha|Khongoryn Els|Gobi camel\nSydney=gui|Opéra de Sydney|Sydney Opera House tour;bat|Port de Sydney|Sydney harbour cruise;sur|Bondi|Bondi surf lesson\nBrisbane=ile|Moreton Island|Moreton island tour\nCairns=plo|Grande Barrière de corail|Great Barrier Reef diving;jun|Daintree|Daintree tour\nAuckland=bat|Hauraki|Auckland harbour cruise;gui|Hobbiton|Hobbiton tour\nRotorua=spe|Village maori|Rotorua Maori show;thm|Rotorua|Rotorua geothermal\nQueenstown=par|Queenstown|Queenstown skydive;cru|Milford Sound|Milford Sound cruise;raf|Shotover|Shotover jet\nChristchurch=bal|Kaikoura|Kaikoura whale watching\nMiami=bat|Biscayne Bay|Miami boat tour;foo|Little Havana|Little Havana food tour\nKey West=sno|Key West|Key West snorkeling;sun|Key West|Key West sunset cruise\nOrlando=cop|Parcs Disney & Universal|Orlando theme park tickets;gui|Kennedy Space Center|Kennedy Space Center\nYosemite=gui|Yosemite|Yosemite tour\nBig Sur=exc|Big Sur|Big Sur tour\nLos Angeles=gui|Studios Hollywood|Warner Bros studio tour;cop|Universal Studios|Universal Studios Hollywood\nOahu=gui|Pearl Harbor|Pearl Harbor tour;sur|Waikiki|Waikiki surf lesson;spe|Luau|Oahu luau\nMaui=sno|Molokini|Molokini snorkeling;bal|Maui|Maui whale watching\nBig Island=vol|Kīlauea|Kilauea tour;plo|Raies manta de nuit|Kona manta night dive\nLa Nouvelle-Orléans=spe|Jazz|New Orleans jazz;bat|Bayou|New Orleans swamp tour;foo|Cuisine créole|New Orleans food tour\nLafayette=bat|Bassin de l’Atchafalaya|Atchafalaya swamp tour\nBanff=gui|Gondole de Banff|Banff gondola;cru|Lac Minnewanka|Lake Minnewanka cruise\nJasper=gla|Champ de glace Columbia|Columbia icefield\nVancouver=hyd|Vancouver|Vancouver seaplane;gui|Capilano|Capilano suspension bridge\nVictoria=bal|Victoria|Victoria whale watching\nTofino=sur|Tofino|Tofino surf;bal|Tofino|Tofino whale watching\nMexico=gui|Teotihuacán|Teotihuacan tour;mon|Teotihuacán|Teotihuacan balloon;foo|Mexico|Mexico City food tour;spe|Lucha libre|Lucha libre Mexico\nPuebla=gui|Cholula|Cholula tour\nOaxaca=foo|Mezcal|Oaxaca mezcal tour;gui|Hierve el Agua|Hierve el Agua tour\nLa Havane=gui|Voitures américaines|Havana classic car tour;spe|Salsa|Havana salsa class\nViñales=che|Viñales|Vinales horse riding\nTrinidad=che|Valle de los Ingenios|Trinidad horse riding\nVaradero=cat|Cayo Blanco|Varadero catamaran\nPunta Cana=cat|Isla Saona|Saona island tour;jee|Punta Cana|Punta Cana buggy\nSamaná=bal|Samaná|Samana whale watching\nAntigua=vol|Volcan Pacaya|Pacaya volcano hike;caf|Antigua|Antigua coffee tour\nLac Atitlán=bat|Villages du lac|Lake Atitlan boat tour\nFlores=gui|Tikal|Tikal tour\nPanama=gui|Canal de Panama|Panama Canal tour\nBoquete=caf|Boquete|Boquete coffee tour\nBocas del Toro=sno|Bocas del Toro|Bocas del Toro snorkeling\nSan Blas=ile|Archipel de San Blas|San Blas islands tour\nLima=foo|Ceviche|Lima food tour;cui|Cuisine péruvienne|Lima cooking class\nCuzco=ran|Montagne arc-en-ciel|Rainbow Mountain tour;gui|Cuzco|Cusco city tour\nVallée sacrée=qua|Moray & Maras|Sacred Valley ATV\nAguas Calientes=gui|Machu Picchu|Machu Picchu guided tour\nArequipa=ran|Canyon de Colca|Colca canyon tour\nLa Paz=vel|Route de la Mort|Death Road bike\nUyuni=jee|Salar d’Uyuni|Uyuni salt flat tour\nSucre=gui|Sucre|Sucre tour\nSantiago=vin|Maipo|Santiago wine tour\nSan Pedro de Atacama=jee|Geysers del Tatio|El Tatio geysers;nui|Observation des étoiles|Atacama stargazing\nPuerto Natales=ran|Torres del Paine|Torres del Paine tour\nValparaíso=gui|Street art|Valparaiso street art tour\nBuenos Aires=spe|Tango|Buenos Aires tango show;foo|Asado|Buenos Aires food tour\nIguazú=bat|Chutes d’Iguazú|Iguazu falls boat\nSalta=jee|Quebrada de Humahuaca|Humahuaca tour\nMendoza=vin|Malbec|Mendoza wine tour\nRio de Janeiro=gui|Christ Rédempteur & Pain de Sucre|Christ the Redeemer Sugarloaf tour;pp|Pedra Bonita|Rio hang gliding;foo|Favelas|Rio favela tour\nParaty=bat|Baie de Paraty|Paraty boat\nIguaçu=hel|Chutes d’Iguaçu|Iguazu helicopter\nSalvador=spe|Capoeira|Salvador capoeira\nBogotá=gui|Musée de l’Or|Bogota tour\nMedellín=gui|Comuna 13|Comuna 13 tour;pp|Medellín|Medellin paragliding\nSalento=caf|Salento|Salento coffee tour;ran|Vallée de Cocora|Cocora valley hike\nCarthagène=ile|Islas del Rosario|Rosario islands tour\nQuito=gui|Mitad del Mundo|Mitad del Mundo tour\nBaños=tyr|Baños|Banos canyoning zipline\nGalápagos=sno|Galápagos|Galapagos snorkeling;cru|Galápagos|Galapagos cruise\nArusha=exc|Kilimandjaro|Kilimanjaro trek\nSerengeti=mon|Serengeti|Serengeti balloon safari;saf|Serengeti|Serengeti safari\nNgorongoro=saf|Cratère du Ngorongoro|Ngorongoro safari\nZanzibar=gui|Stone Town & épices|Zanzibar spice tour;sno|Mnemba|Mnemba snorkeling;dau|Kizimkazi|Zanzibar dolphins\nNairobi=gui|Girafes & éléphanteaux|Nairobi giraffe centre tour\nMasai Mara=saf|Masai Mara|Masai Mara safari;mon|Masai Mara|Masai Mara balloon\nAmboseli=saf|Amboseli|Amboseli safari\nDiani=sno|Wasini|Wasini snorkeling;par|Diani|Diani skydiving\nLe Cap=gui|Table Mountain|Table Mountain tour;exc|Cap de Bonne-Espérance|Cape Peninsula tour;req|Requins blancs|Cape Town shark cage diving\nStellenbosch=vin|Stellenbosch|Stellenbosch wine tour\nRoute des Jardins=bal|Hermanus|Hermanus whale watching\nKruger=saf|Kruger|Kruger safari\nWindhoek=gui|Windhoek|Windhoek tour\nSossusvlei=mon|Sossusvlei|Sossusvlei balloon;jee|Dunes|Sossusvlei tour\nSwakopmund=qua|Dunes de Swakopmund|Swakopmund quad;par|Swakopmund|Swakopmund skydiving\nEtosha=saf|Etosha|Etosha safari\nAntananarivo=gui|Antananarivo|Antananarivo tour\nAndasibe=nui|Lémuriens|Andasibe night walk\nMorondava=sun|Allée des Baobabs|Avenue of the Baobabs tour\nNosy Be=bal|Nosy Be|Nosy Be whale shark;ile|Nosy Iranja|Nosy Iranja tour\nGrand Baie=cat|Île aux Cerfs|Mauritius catamaran;sno|Grand Baie|Mauritius snorkeling\nLe Morne=dau|Tamarin|Mauritius dolphins;hel|Cascade sous-marine|Mauritius helicopter\nChamarel=rhu|Chamarel|Chamarel rum distillery\nMahé=sno|Parc marin Sainte-Anne|Seychelles snorkeling\nPraslin=gui|Vallée de Mai|Vallee de Mai tour\nLa Digue=vel|La Digue|La Digue bike\nDakar=exc|Lac Rose|Lac Rose tour\nÎle de Gorée=gui|Gorée|Goree island tour\nSaint-Louis=bat|Langue de Barbarie|Langue de Barbarie\nSaly=saf|Réserve de Bandia|Bandia reserve safari\nVictoria Falls=hel|Chutes Victoria|Victoria Falls helicopter;raf|Zambèze|Zambezi rafting;cru|Zambèze au coucher du soleil|Zambezi sunset cruise\nChobe=saf|Chobe|Chobe safari\nDelta de l’Okavango=bat|Mokoro|Okavango mokoro\nMindelo=spe|Musique capverdienne|Mindelo music\nTanger=gui|Tanger|Tangier tour\nChefchaouen=gui|Chefchaouen|Chefchaouen tour\nKiruna=aur|Kiruna|Kiruna northern lights;chi|Kiruna|Kiruna dog sledding;gui|Icehotel|Icehotel\nAbisko=aur|Abisko|Abisko aurora\nParos=cat|Antiparos|Paros boat trip\nHué=gui|Cité impériale|Hue imperial city tour\nĐà Nẵng=gui|Pont d’Or|Ba Na Hills Golden Bridge\nNinh Bình=bat|Tam Cốc|Tam Coc boat\nSa Pa=ran|Rizières en terrasses|Sapa trek\nSpringdale=ran|Zion|Zion hike\nBryce Canyon=ran|Bryce Canyon|Bryce canyon tour\nMoab=jee|Arches|Moab jeep tour\nEl Calafate=gla|Perito Moreno|Perito Moreno glacier trek\nEl Chaltén=ran|Fitz Roy|Fitz Roy hike\nUshuaïa=cru|Canal Beagle|Beagle Channel cruise\nLas Palmas=bat|Las Palmas|Gran Canaria boat\nMaspalomas=cha|Dunes de Maspalomas|Maspalomas camel;dau|Maspalomas|Gran Canaria dolphin\nSainte-Anne@MQ=cat|Les Salines|Martinique catamaran;kay|Mangrove|Martinique kayak\nStrasbourg=foo|Winstubs|Strasbourg food tour\nLyon=bat|Saône & Rhône|Lyon river cruise\nLuchon=pp|Luchon|Luchon paragliding\nClermont-Ferrand=ran|Puy de Dôme|Puy de Dome hike\nLa Rochelle=gui|Aquarium de La Rochelle|La Rochelle aquarium\nValence=gui|Cité des Arts et des Sciences|City of Arts and Sciences Valencia\nSanta Eulària des Riu=kay|Santa Eulària|Ibiza kayak snorkeling\nLanzarote=plo|Lanzarote|Lanzarote diving\nLa Corogne=gui|Tour d’Hercule|A Coruna tour\nSantillana del Mar=gro|Grotte d’Altamira|Altamira cave\nMilan=exc|Lac de Côme|Lake Como day trip from Milan\nCorfou=bat|Paleokastritsa|Paleokastritsa boat\nStockholm=gui|Gamla Stan|Stockholm walking tour\nSt Ives=sur|St Ives|Cornwall surf lesson\nCracovie=foo|Kazimierz|Krakow food tour\nSarajevo=foo|Sarajevo|Sarajevo food tour\nMostar=exc|Chutes de Kravica|Kravice waterfalls\nOhrid=kay|Lac d’Ohrid|Ohrid kayak\nGili Air=plo|Gili|Gili diving\nKharkhorin=che|Vallée de l’Orkhon|Mongolia horse trek\nMindelo=ran|São Vicente|Monte Verde hike\nTanger=exc|Cap Spartel & grottes d’Hercule|Tangier Hercules caves\nNaxos=gui|Naxos|Naxos tour\nMontréal=gui|Mont Royal|Montreal walking tour;bat|Vieux-Port|Montreal river cruise";
  let EXPM = null;
  function expMap(){
    if(EXPM) return EXPM; EXPM = {};
    EXPD.split('\n').forEach(l=>{ const i = l.indexOf('='); if(i < 0) return; const [c, cc] = l.slice(0, i).split('@'), k = normQ(c) + (cc ? '@' + cc : '');
      l.slice(i + 1).split(';').forEach(x=>{ const [t, p, q] = x.split('|'); if(!EXT[t]) return; (EXPM[k] = EXPM[k] || []).push({t, p:p || c, q:q || ((p || c) + ' ' + EXT[t][2])}); }); });
    return EXPM;
  }
  const EXP_GEN = ['gui', 'foo', 'cui', 'exc'];
  /* 🔎 villes sans liste : la rubrique « Faire » de Wikivoyage + ce que recense OpenStreetMap autour (clubs de plongée, écoles de surf, loueurs de kayak…) */
  EXT.act = ['🎯', 'À faire', 'things to do'];
  const EXP_KW = [[/plong|diving|scuba|tauch|buceo|immersion/i,'plo'],[/snorkel|palme|masque et tuba/i,'sno'],[/kite|surf/i,'sur'],[/kayak|canoë|canoe|paddle|pirogue/i,'kay'],[/raft/i,'raf'],
    [/parachut|skydiv/i,'par'],[/parapente|paraglid|deltaplane/i,'pp'],[/montgolf|balloon/i,'mon'],[/hélicopt|helicopt/i,'hel'],[/baleine|whale/i,'bal'],[/dauphin|dolphin/i,'dau'],[/tortue|turtle/i,'tor'],
    [/croisi|cruise|bateau|boat|voilier|catamaran|sail|excursion en mer/i,'bat'],[/safari|wildlife|faune|réserve naturelle|parc national|national park/i,'saf'],[/randonn|hike|hiking|trek|sentier|trail/i,'ran'],
    [/cheval|horse|équitation|equitation/i,'che'],[/chameau|dromadaire|camel/i,'cha'],[/quad|buggy|atv/i,'qua'],[/4x4|jeep/i,'jee'],[/vélo|velo|bike|bicycl|cycl/i,'vel'],[/cours de cuisine|cooking/i,'cui'],
    [/dégustation|wine|vignoble|winery|domaine viticole|vin /i,'vin'],[/brasserie|brewery|beer|bière/i,'bie'],[/rhum|rum /i,'rhu'],[/hammam/i,'ham'],[/thermal|thermes|onsen|sources chaudes|hot spring|spa/i,'thm'],
    [/grotte|caverne|gouffre|cave /i,'gro'],[/volcan|volcano/i,'vol'],[/tyrolienne|zip.?line|accrobranche/i,'tyr'],[/canyon/i,'can'],[/ski|snowboard/i,'ski'],[/aurore|aurora/i,'aur'],
    [/spectacle|show|concert|théâtre|theatre|opéra|opera|danse|dance|cabaret|flamenco|tango/i,'spe'],[/marché|market|souk|bazar/i,'foo'],[/visite guidée|guided tour|walking tour/i,'gui']];
  const expKw = txt => { const x = EXP_KW.find(([re])=>re.test(txt)); return x ? x[1] : ''; };
  const EXP_OSM = [['plo','nwr["shop"="scuba_diving"]',30000],['plo','nwr["amenity"="dive_centre"]',30000],['sur','nwr["sport"~"surfing|kitesurfing"]',20000],['kay','nwr["rental"~"kayak|canoe"]',20000],
    ['bat','nwr["leisure"="marina"]',10000],['che','nwr["leisure"="horse_riding"]',20000],['pp','nwr["sport"~"free_flying|paragliding"]',30000],['tyr','nwr["aerialway"="zip_line"]',30000],
    ['gro','nwr["natural"="cave_entrance"]["tourism"]',40000],['vol','nwr["natural"="volcano"]["name"]',60000],['thm','nwr["natural"="hot_spring"]',40000],['ham','nwr["amenity"="public_bath"]',8000],
    ['vin','nwr["craft"="winery"]',25000],['ran','nwr["natural"="peak"]["name"]',25000,6]];
  const EXPA = {};   // recherches en cours
  async function expAuto(city, force){
    const k = normQ(city); M.expAuto = M.expAuto || {}; const old = M.expAuto[k];
    if((old && !force && Date.now() - old.t < 30 * 864e5) || EXPA[k]) return; EXPA[k] = 1;
    const o = {t:Date.now(), wv:[], osm:[], v:2};
    try {
      const g = await cityInfo(city).catch(()=>null);
      const lang = (window.I18N && I18N.lang) || 'fr', lg = EXP_WV.includes(lang) ? lang : 'en';
      const wvp = (async()=>{ let x = await withTimeout(wvFetch(lg, city), 20000).catch(()=>null); if((!x || x.items.filter(i=>i.cat === 'do').length < 2) && lg !== 'en') x = (await withTimeout(wvFetch('en', city), 20000).catch(()=>null)) || x; return x; })();
      const osmp = g ? (async()=>{ const q = '[out:json][timeout:20];' + EXP_OSM.map(([, f, r])=>`${f}(around:${r},${g.lat},${g.lng});out count;`).join('');
        const one = ep => fetch(ep, {method:'POST', body:'data=' + encodeURIComponent(q), headers:{'Content-Type':'application/x-www-form-urlencoded'}}).then(r=>{ if(!r.ok) throw new Error('osm'); return r.json(); });
        const j = await withTimeout(Promise.any(['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'].map(one)), 25000);
        return (j.elements || []).map(e=>+((e.tags || {}).total || 0)); })().catch(()=>null) : null;
      const [wv, cnt] = await Promise.all([wvp, osmp]);
      if(wv) o.wv = wv.items.filter(i=>i.cat === 'do' && i.n && normQ(i.n) !== k).map(i=>({n:i.n, t:expKw(i.n + ' ' + (i.d || ''))}))
        .sort((a, b)=>(b.t ? 1 : 0) - (a.t ? 1 : 0)).slice(0, 30);   // jusqu’à 30 : « Plus d’expériences » en montre davantage
      if(cnt) EXP_OSM.forEach(([t, , , min], i)=>{ if((cnt[i] || 0) >= (min || 1) && !o.osm.includes(t)) o.osm.push(t); });
      if(!wv && !cnt) o.t = Date.now() - 29 * 864e5;   // pas de réseau : on réessaiera bientôt
    } finally {
      delete EXPA[k]; M.expAuto[k] = o; const ks = Object.keys(M.expAuto); if(ks.length > 80) delete M.expAuto[ks[0]]; persist();
      if(document.querySelector('#v-sheet-bg .ex-r')) expOpen(); refresh();
    }
  }
  function expGen(city){
    const a = (M.expAuto || {})[normQ(city)], out = [], seen = new Set(), lim = 7 + (((M.expMore || {})[normQ(city)]) || 0);
    const add = (t, p, q, src) => { const key = t + '|' + normQ(p); if(seen.has(key) || out.length >= lim) return; seen.add(key); out.push({t, p, q, src}); };
    if(a){ a.wv.forEach(w=>add(w.t || 'act', w.n, w.n + ' ' + city, 'wv')); a.osm.forEach(t=>{ if(!out.some(e=>e.t === t)) add(t, city, city + ' ' + EXT[t][2], 'osm'); }); }
    EXP_GEN.forEach(t=>{ if(out.length < 4 || !a) add(t, city, city + ' ' + EXT[t][2]); });
    return out;
  }
  function expFor(city, cc){
    const m = expMap(), k = normQ(city);
    let L = (cc && m[k + '@' + cc]) || m[k];
    if(!L){ const alt = Object.keys(m).find(x=>x.startsWith(k + '@')); if(alt) L = m[alt]; }
    const gen = !L;
    if(gen){ L = expGen(city); if(!(M.expAuto || {})[normQ(city)]) setTimeout(()=>expAuto(city), 0); }
    else if(((M.expMore || {})[k]) > 0){   // liste choisie + « Plus d’expériences » : les idées trouvées en ligne s’ajoutent derrière
      if(!(M.expAuto || {})[k]) setTimeout(()=>expAuto(city), 0);
      L = L.concat(expGen(city).filter(e=>!L.some(x=>x.t === e.t && normQ(x.p) === normQ(e.p))).slice(0, M.expMore[k]));
    }
    return L.map(e=>Object.assign({key:e.t + '|' + normQ(e.p), gen, ic:EXT[e.t][0], l:EXT[e.t][1]}, e));
  }
  const expLabel = e => MSGT(e.l) + ' · ' + e.p;
  const expKept = tid => new Set(list('item', i=>i.trip === tid && i.exp).map(i=>i.exp));
  function expTrip(t){
    if(!t) return []; const no = new Set(((M.expNo || {})[t.id]) || []), kept = expKept(t.id), seen = new Set(), out = [];
    list('item', i=>i.trip === t.id && i.cat === 'hotel' && i.date).sort((a, b)=>a.date.localeCompare(b.date)).forEach(h=>{
      const city = stayCity(h); if(!city || seen.has(normQ(city))) return; seen.add(normQ(city));
      const cc = ((M.ctry || {})[normQ(city)] || {}).cc;
      const L = expFor(city, cc).filter(e=>!no.has(e.key) && !kept.has(e.key)); if(L.length) out.push({h, city, L});
    });
    return out;
  }
  const expCount = t => expTrip(t).reduce((a, g)=>a + g.L.length, 0);
  const expLinks = e => hidden('blk:book') ? '' : `<span class="ex-ln">${['gyg','viator'].map(b=>bookA(b, {what:e.q})).join('')}</span>`;
  function expOpen(){
    const t = trip(); if(!t) return; const G = expTrip(t);
    if(!G.length){ openSheet(`<h2>🎟️ ${MSGT('Expériences à vivre')}</h2><div class="v-sum-small" style="margin-bottom:10px">${MSGT('Tout est trié pour l’instant.')}</div>
      <button type="button" class="v-btn" onclick="CV.expMore()">＋ ${MSGT('Plus d’expériences')}</button><div class="v-actions"><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`); return; }
    const y = (document.querySelector('#v-sheet-bg .v-sheet') || {}).scrollTop || 0;
    openSheet(`<h2>🎟️ ${MSGT('Expériences à vivre')}</h2><div class="v-sum-small" style="margin-bottom:10px">${MSGT('Les activités qui font la réputation de chaque étape. ✓ pour les mettre au programme (à réserver), ✕ pour les écarter.')}</div>
      ${G.map(g=>`<div class="sg-d"><div class="sg-dh">📍 <span data-notr>${esc(g.city)}</span>${g.L[0].gen ? ` · <small>${EXPA[normQ(g.city)] ? '📡 ' + MSGT('Je cherche les activités de la ville…') : MSGT('idées de la ville')}</small>` : ''}</div>
        ${g.L.map(e=>`<div class="sg-r ex-r"><span class="sg-i">${e.ic}</span><span class="sg-n"><b class="ex-t">${esc(MSGT(e.l))}</b><span data-notr>${esc(e.p)}</span>${expLinks(e)}</span>
          <button type="button" class="sg-ok" aria-label="${MSGT('Garder')}" onclick="CV.expKeep('${g.h.id}','${esc(e.key)}')">✓</button><button type="button" class="sg-no" aria-label="${MSGT('Retirer')}" onclick="CV.expDrop('${esc(e.key)}')">✕</button></div>`).join('')}</div>`).join('')}
      ${G.some(g=>g.L.some(e=>e.src)) ? `<div class="v-sum-small" style="margin:4px 0 8px">${MSGT('Sources : Wikivoyage (CC BY-SA), OpenStreetMap')}</div>` : ''}
      <button type="button" class="v-btn sec" style="margin:4px 0 8px" onclick="CV.expMore()">＋ ${MSGT('Plus d’expériences')}</button>
      <div class="v-actions"><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
    const sh = document.querySelector('#v-sheet-bg .v-sheet'); if(sh) sh.scrollTop = y;
  }
  // ＋ Plus d’expériences : 6 idées de plus par ville (Wikivoyage « Faire », OpenStreetMap), comme « Nouvelles suggestions » pour les visites
  async function expMore(){
    const t = trip(); if(!t) return; const before = expCount(t); M.expMore = M.expMore || {};
    const cities = [...new Set(list('item', i=>i.trip === t.id && i.cat === 'hotel' && i.date).map(stayCity).filter(Boolean))];
    cities.forEach(c=>{ const k = normQ(c); M.expMore[k] = (M.expMore[k] || 0) + 6; }); persist();
    const old = cities.filter(c=>{ const a = (M.expAuto || {})[normQ(c)]; return !a || a.v !== 2; });
    if(old.length){ toast('📡 ' + MSGT('Je cherche les activités de la ville…')); await Promise.all(old.map(c=>expAuto(c, true).catch(()=>{}))); }
    const n = expCount(t) - before; toast(n > 0 ? '🎟️ ' + RF('{0} nouvelles expériences', n) : '✓ ' + MSGT('Pas d’autre idée pour l’instant.'));
    expOpen(); refresh();
  }
  // une activité payante au programme : jour provisoire (le 1er jour libre de l'étape), rangée ensuite à l'étape ② « Ranger dans les jours »
  function expPut(t, h, e){
    const city = stayCity(h), days = h.dateFin ? range(h.date, h.dateFin).slice(0, -1) : [h.date];
    const busy = d => list('item', i=>i.trip === t.id && i.cat === 'activite' && i.date === d).length;
    const d = days.slice(days.length > 1 ? 1 : 0).find(x=>!busy(x)) || days.find(x=>!busy(x)) || days[days.length > 1 ? 1 : 0];
    const id = 'i' + uid(); putQuiet([{id, type:'item', trip:t.id, cat:'activite', titre:expLabel(e), date:d || '', heure:'', adresse:city, statut:'todo', partage:'grp', qui:[], exp:e.key, q:e.q, pick:1}]); return id;
  }
  function expKeep(hid, key){
    const t = trip(), h = R[hid]; if(!t || !h) return;
    const city = stayCity(h), cc = ((M.ctry || {})[normQ(city)] || {}).cc, e = expFor(city, cc).find(x=>x.key === key); if(!e) return;
    expPut(t, h, e); toast('🎟️ ' + MSGT('Au programme, à réserver')); expOpen(); refresh();
  }
  function expDrop(key){ const t = trip(); if(!t) return; M.expNo = M.expNo || {}; const nl = M.expNo[t.id] = M.expNo[t.id] || []; if(!nl.includes(key)) nl.push(key); persist(); expOpen(); refresh(); }
  async function suggFill(tid, more){
    if(SG && SG.tid === tid) return;
    const hs = list('item', i=>i.trip === tid && i.cat === 'hotel' && i.date).sort((a,b)=>a.date.localeCompare(b.date));
    if(!hs.length){ toast('🏨 ' + MSGT('Ajoute d’abord une étape (une ville où dormir).')); return; }
    if(M.suggRun) delete M.suggRun;
    const nOf = d => list('place', p=>p.trip === tid && p.date === d).length;
    SG = {tid, i:0, n:hs.length, city:'', got:0, more:!!more};
    if(M.trip === tid){ M.tab = 'prog'; M.ariOpen = M.ariOpen || {}; M.ariOpen[tid] = 'faire'; }
    toast('💡 ' + MSGT(more ? 'Je cherche de nouvelles suggestions…' : 'Je cherche les incontournables…')); refresh();
    const exDay = {}, t0 = R[tid] || {};
    // 🚌 1ʳᵉ recherche : les grands sites du pays (UNESCO) à plus de 25 km d’une étape mais à moins de 330 km = une journée d’excursion
    if(!more){ SG.city = MSGT('les grands sites du pays'); refresh();
      try { await withTimeout((async()=>{
        try { await stagesGeoFix(hs.map(stayCity)); } catch(e){}
        const geo = {}; for(const h of hs){ const c = stayCity(h); geo[h.id] = await geocode(c, null).catch(()=>null); }
        const ccs = new Set((t0.ccs || []).filter(Boolean));
        for(const h of hs){ const c = stayCity(h); const k = (M.ctry || {})[normQ(c)]; if(k && k.cc) ccs.add(k.cc); else { const o = await cityInfo(c).catch(()=>null); if(o && o.cc) ccs.add(o.cc); } }
        const sites = []; for(const cc of ccs){ const cd = await ctryData(cc).catch(()=>null); if(cd) sites.push(...cd.sites); }
        sites.sort((a, b)=>b.sl - a.sl);
        const used = {}, out = [];
        for(const st of sites){
          if(sgName(tid, st.nom)) continue;
          let best = null, bd = 1e9; hs.forEach(h=>{ const g = geo[h.id]; if(!g) return; const d = km(g, st); if(d < bd){ bd = d; best = h; } });
          if(!best || bd < 25 || bd > 330) continue;
          const days = (best.dateFin ? range(best.date, best.dateFin).slice(0, -1) : []).filter(d=>!nOf(d)); if(days.length < 2) continue;
          const n = used[best.id] || 0, d = days[1 + n * 2]; if(!d || n >= Math.floor(days.length / 2)) continue;
          used[best.id] = n + 1; exDay[d] = 1;
          out.push({id:'pl' + uid() + 'x' + n, type:'place', trip:tid, stay:best.id, date:d, nom:st.nom, adresse:'', lat:st.lat, lng:st.lng, cat:'monu', lock:false, sugg:true, exc:Math.round(bd)});
        }
        if(out.length){ putQuiet(out); SG.got += out.filter(r=>r.type === 'place').length; }
      })(), 25000); } catch(e){}
    }
    // 🏛️ puis ville par ville : les résultats s’affichent dès qu’une ville est prête
    let miss = 0;
    for(const h of hs){
      const city = stayCity(h); if(!city) continue;
      SG.i++; SG.city = city; refresh();
      const days = (h.dateFin ? range(h.date, h.dateFin).slice(0, -1) : [h.date]).filter(d=>!exDay[d] && !list('place', p=>p.trip === tid && p.date === d && p.exc).length); if(!days.length) continue;
      let cand = []; try { cand = await placesFor(city); } catch(e){}
      cand = cand.filter(p=>normQ(p.nom) !== normQ(city) && !sgName(tid, p.nom)); if(!cand.length){ miss++; continue; }
      const out = []; let k = 0;
      const nDay = d => d === h.date ? 2 : SUGG_N;   // jour d’arrivée (trajet) : 2 idées, sinon 4
      if(!more){ days.filter(d=>!nOf(d)).forEach(d=>{ for(let j = 0; j < nDay(d) && k < cand.length; j++, k++){ const p = cand[k];
          out.push({id:'pl' + uid() + k + j, type:'place', trip:tid, stay:h.id, date:d, nom:p.nom, adresse:'', lat:p.lat, lng:p.lng, cat:p.cat, lock:false, sugg:true, wiki:p.wiki || ''}); } }); }
      else {   // ➕ nouvelles idées : 2 de plus par jour, d’abord sur les journées les moins remplies
        const ds = days.slice().sort((a, b)=>nOf(a) - nOf(b)), cnt = {};
        for(let r = 0; r < 2; r++) ds.forEach(d=>{ if(k >= cand.length) return; const p = cand[k++]; cnt[d] = (cnt[d] || 0) + 1;
          out.push({id:'pl' + uid() + k + r, type:'place', trip:tid, stay:h.id, date:d, nom:p.nom, adresse:'', lat:p.lat, lng:p.lng, cat:p.cat, lock:false, sugg:true, wiki:p.wiki || ''}); });
      }
      if(out.length){ putQuiet(out); SG.got += out.length; }
      refresh();
    }
    const got = SG.got; SG = null;
    if(got){ M.suggDone = M.suggDone || {}; M.suggDone[tid] = 1; persist(); toast('💡 ' + got + ' ' + MSGT(more ? 'nouvelles suggestions' : 'suggestions à choisir')); }
    else toast(miss ? '📡 ' + MSGT('Pas de réseau pour trouver les incontournables : réessaie dans un instant.') : '✓ ' + MSGT('Pas d’autre idée pour l’instant : tu as déjà les lieux les plus connus.'));
    if(M.trip === tid) refresh();
  }
  function suggMore(){ const t = trip(); if(t){ closeSheet(true); suggFill(t.id, true); } }
  const sgRun = t => SG && SG.tid === t.id ? `💡 ${MSGT(SG.more ? 'Je cherche de nouvelles suggestions…' : 'Je cherche les incontournables…')}<small class="sg-pr">${esc(SG.city)}${SG.n ? ` · ${Math.min(SG.i, SG.n)}/${SG.n}` : ''}${SG.got ? ` · ${SG.got} ${MSGT('trouvées')}` : ''}</small>` : '';
  function suggCard(){
    const t = trip(); if(!t || t.archived || t.demo || M.lock || tripPhase(t) === 'past') return '';
    if(SG && SG.tid === t.id) return `<div class="sg-c run"><i>💡</i><div><b>${sgRun(t)}</b></div></div>`;
    const L = list('place', p=>p.trip === t.id && p.sugg), xn = expCount(t);
    if(!L.length){
      if(xn && ((M.suggDone || {})[t.id] || list('place', p=>p.trip === t.id).length)) return `<button type="button" class="sg-c" onclick="CV.expOpen()"><i>🎟️</i><div><b>${xn} ${MSGT('expériences à vivre')}</b><small>${MSGT('Croisières, excursions, plongée… à réserver chez nos partenaires')}</small></div><span class="sg-go">${MSGT('Voir')} ›</span></button>`;
      const hs = list('item', i=>i.trip === t.id && i.cat === 'hotel' && i.date && stayCity(i));
      if(!hs.length || (M.suggDone || {})[t.id] || list('place', p=>p.trip === t.id).length) return '';
      return `<button type="button" class="sg-c" onclick="CV.suggGo()"><i>💡</i><div><b>${MSGT('Remplir mon programme avec les incontournables')}</b><small>${MSGT('4 lieux par jour dans chaque ville, et les excursions à ne pas manquer. Tu gardes ce que tu veux.')}</small></div><span class="sg-go">${MSGT('Go')} ›</span></button>`;
    }
    return `<button type="button" class="sg-c" onclick="CV.suggOpen()"><i>💡</i><div><b>${L.length} ${MSGT('suggestions à choisir')}</b><small>${MSGT('Ajoute celles qui te plaisent à ton programme')}${xn ? ' · 🎟️ ' + xn + ' ' + MSGT('expériences à vivre') : ''}</small></div><span class="sg-go">${MSGT('Trier')} ›</span></button>`;
  }
  function suggList(){
    swClose(true); const t = trip(); if(!t) return; const L = list('place', p=>p.trip === t.id && p.sugg);
    if(!L.length){ if(expCount(t)) return expOpen(); closeSheet(true); refresh(); return; }
    const by = {}, xn = expCount(t); L.forEach(p=>(by[p.date] = by[p.date] || []).push(p)); const ds = dayList();
    const y = (document.querySelector('#v-sheet-bg .v-sheet') || {}).scrollTop || 0;
    openSheet(`<h2>💡 ${MSGT('Suggestions')}</h2><div class="v-sum-small" style="margin-bottom:10px">${MSGT('Les lieux les plus connus de chaque ville, proposés jour par jour. ✓ pour les ajouter à ton programme, ✕ pour les écarter. Rien n’est ajouté sans ton accord.')}</div>${xn ? `<button type="button" class="ar-go" style="margin:0 0 10px" onclick="CV.expOpen()">🎟️ ${MSGT('Expériences à vivre')} (${xn})</button>` : ''}
      ${Object.keys(by).sort().map(d=>`<div class="sg-d"><div class="sg-dh">${PJ(ds.indexOf(d) + 1)} · ${fdate(d)}${dayInfo(d).titre ? ' · <span data-notr>' + esc(dayInfo(d).titre) + '</span>' : ''}</div>
        ${by[d].map(p=>`<div class="sg-r"><span class="sg-i">${(POI_CATS[p.cat] || {icon:'📍'}).icon}</span><span class="sg-n" role="button" onclick="CV.plInfo('${p.id}',false,'sugg')"><span data-notr>${esc(p.nom)}</span>${p.exc ? `<small class="sg-x">🚌 ${MSGT('Excursion à la journée')} · ${p.exc} km</small>` : ''}</span>
          <button type="button" class="sg-ok" aria-label="${MSGT('Garder')}" onclick="CV.suggKeep('${p.id}')">✓</button><button type="button" class="sg-no" aria-label="${MSGT('Retirer')}" onclick="CV.suggDrop('${p.id}')">✕</button></div>`).join('')}</div>`).join('')}
      <button type="button" class="v-btn sec" style="margin:4px 0 8px" onclick="CV.suggMore()">＋ ${MSGT('Nouvelles suggestions')}</button>
      <button type="button" class="v-btn sec" style="margin:0 0 8px" onclick="CV.suggRedo()">🔄 ${MSGT('Refaire les suggestions')}</button>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.suggKeep('*')">✓ ${MSGT('Tout ajouter')}</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
    const sh = document.querySelector('#v-sheet-bg .v-sheet'); if(sh) sh.scrollTop = y;
  }
  function suggKeep(id){
    const t = trip(); if(!t) return;
    const L = id === '*' ? list('place', p=>p.trip === t.id && p.sugg) : [R[id]].filter(Boolean);
    L.forEach(p=>{ const c = clone(p); delete c.sugg; c.kept = Date.now(); c.pick = 1; putQuiet([c]);
      const di = p.exc && R['day:' + p.trip + ':' + p.date]; if(di && !di.deleted && !String(di.titre || '').includes(p.nom)) putQuiet([Object.assign(clone(di), {titre:(di.titre ? di.titre + ' · ' : '') + '🚌 ' + p.nom})]); });
    if(id === '*'){ toast('✓ ' + L.length + ' ' + MSGT('lieux ajoutés au programme')); closeSheet(true); refresh(); return; }
    toast('✓ ' + MSGT('Ajouté au programme'));
    if(document.getElementById('cv-sw')) swRender(); else suggList(); refresh();
  }
  function suggGo(){ const t = trip(); if(t) suggFill(t.id); }
  /* 💡 CHOISIR MES VISITES, une carte à la fois (comme Tinder) : grande photo, quelques lignes de Wikipédia,
     glisser à droite = au programme, à gauche = écarté (ou les boutons ✕ ✓). ↩️ annule le dernier choix. */
  let SW = null; const SWC = {};
  // ① choisir, VILLE PAR VILLE : les visites suggérées puis les activités payantes de la ville (pas de jour à choisir ici : c'est l'étape ②)
  function suggOpen(){
    const t = trip(); if(!t) return;
    const st = tlStages(), si = c => { const k = st.findIndex(x=>normQ(x.city) === normQ(c)); return k < 0 ? 99 : k; };
    const L = list('place', p=>p.trip === t.id && p.sugg).map(p=>({id:p.id, c:swCity(p), d:p.date || '9', x:p.exc ? 1 : 0}));
    const EX = {}; expTrip(t).forEach(g=>g.L.forEach(e=>{ const id = 'ex|' + g.h.id + '|' + e.key; EX[id] = {h:g.h, e, city:g.city}; L.push({id, c:g.city, d:'~', x:2}); }));
    if(!L.length){ closeSheet(true); refresh(); return; }
    L.sort((a, b)=>si(a.c) - si(b.c) || a.x - b.x || a.d.localeCompare(b.d));
    closeSheet(true); SW = {tid:t.id, ids:L.map(x=>x.id), i:0, hist:[], kept:0, EX, exDone:new Set()}; swRender();
  }
  const swPend = id => /^ex\|/.test(id) ? !!(SW && SW.EX && SW.EX[id] && !SW.exDone.has(id)) : !!(R[id] && R[id].sugg && !R[id].deleted);
  const swRec = id => /^ex\|/.test(id) ? Object.assign({id, ex:1, nom:SW.EX[id].e.p, city:SW.EX[id].city}, SW.EX[id]) : R[id];
  const swCityOf = r => r && r.ex ? r.city : swCity(r);
  const swCity = p => { const h = p.stay && R[p.stay]; return (h && (h.type === 'city' ? h.titre : stayCity(h))) || (p.date && dayCity(p.date)) || ''; };
  const swSim = (a, b) => { a = normQ(a); b = normQ(b); if(!a || !b) return 0; if(a === b) return 1; if(a.includes(b) || b.includes(a)) return .85;
    const A = new Set(a.split(/[^a-z0-9]+/).filter(w=>w.length > 2)), B = b.split(/[^a-z0-9]+/).filter(w=>w.length > 2); if(!A.size || !B.length) return 0;
    return B.filter(w=>A.has(w)).length / Math.max(A.size, B.length); };
  async function swInfo(p){
    const key = normQ(p.nom + '|' + (p.ex ? p.city : swCity(p))); if(SWC[key]) return SWC[key];
    const lg0 = (window.I18N && I18N.lang) || 'fr', out = {img:'', ex:'', url:''};
    const W = (lg, qs) => withTimeout(fetch(`https://${lg}.wikipedia.org/w/api.php?${qs}&format=json&formatversion=2&origin=*`).then(r=>r.json()), 9000);
    const page = async (lg, title) => { const j = await W(lg, `action=query&titles=${encodeURIComponent(title)}&prop=pageimages|extracts|description&piprop=thumbnail&pithumbsize=900&exintro=1&explaintext=1&exsentences=3&redirects=1`);
      const pg = ((j.query || {}).pages || [])[0]; if(!pg || pg.missing) return false;
      if(/peinture|tableau|painting|gemälde|dipinto|pintura|sculpture|statue/i.test(pg.description || '')) return false;   // une œuvre, pas un lieu
      out.img = (pg.thumbnail || {}).source || ''; out.ex = (pg.extract || '').trim(); out.url = `https://${lg}.wikipedia.org/wiki/${encodeURIComponent(String(pg.title).replace(/ /g, '_'))}`; return !!(out.img || out.ex); };
    try {
      const w = p.wiki && wkParse(p.wiki); if(w && await page(w.lang, w.title)) return (SWC[key] = out);
      for(const lg of [...new Set([lg0, 'fr', 'en'])]){
        if(p.lat != null){   // l'article dont le sujet est À CET ENDROIT et porte ce nom (pas un tableau qui le représente)
          const j = await W(lg, `action=query&list=geosearch&gscoord=${(+p.lat).toFixed(5)}|${(+p.lng).toFixed(5)}&gsradius=600&gslimit=20`);
          const best = ((j.query || {}).geosearch || []).map(g=>[g, swSim(g.title, p.nom)]).sort((a, b)=>b[1] - a[1])[0];
          if(best && best[1] >= .5 && await page(lg, best[0].title)) return (SWC[key] = out);
        }
        const j = await W(lg, `action=query&list=search&srsearch=${encodeURIComponent(p.nom + ' ' + (p.ex ? p.city : swCity(p)))}&srlimit=3`);
        for(const r of ((j.query || {}).search || [])) if(swSim(r.title, p.nom) >= .5 && await page(lg, r.title)) return (SWC[key] = out);
      }
    } catch(e){}
    return (SWC[key] = out);
  }
  function swCard(p, top){
    const ic = p.ex ? p.e.ic : (POI_CATS[p.cat] || {icon:'📍'}).icon, c = swCityOf(p);
    return `<div class="sw-card${top ? ' top' : ''}" data-id="${esc(p.id)}">
      <div class="sw-ph"><span class="sw-ic">${ic}</span><img class="sw-img" alt="" decoding="async"></div><div class="sw-shade"></div>
      <i class="sw-tag yes">${esc(MSGT('Je garde'))}</i><i class="sw-tag no">${esc(MSGT('Non merci'))}</i>
      <div class="sw-tx"><small>${c ? '📍 <span data-notr>' + esc(c) + '</span>' : ''}</small>
        ${p.ex ? `<em class="sw-pay">🎟️ ${esc(MSGT(p.e.l))} · ${esc(MSGT('activité à réserver'))}</em>` : ''}
        <b data-notr>${esc(p.nom)}</b>${p.exc ? `<em>🚌 ${MSGT('Excursion à la journée')} · ${p.exc} km</em>` : ''}<p class="sw-ex" data-notr></p><a class="sw-wk" target="_blank" rel="noopener" hidden>📖 Wikipédia</a></div></div>`;
  }
  function swFill(el, p){
    swInfo(p).then(x=>{ if(!el.isConnected) return; const im = el.querySelector('.sw-img');
      if(x.img){ im.onload = () => im.classList.add('ok'); im.src = x.img; }
      if(x.ex) el.querySelector('.sw-ex').textContent = x.ex;
      if(x.url){ const a = el.querySelector('.sw-wk'); a.href = x.url; a.hidden = false; } });
  }
  function swRender(){
    if(!SW) return; const t = R[SW.tid]; if(!t){ swClose(); return; }
    while(SW.i < SW.ids.length && !swPend(SW.ids[SW.i])) SW.i++;
    let ov = document.getElementById('cv-sw');
    if(!ov){ ov = document.createElement('div'); ov.id = 'cv-sw'; document.body.appendChild(ov); document.body.style.overflow = 'hidden'; }
    const left = SW.ids.slice(SW.i).filter(swPend), total = SW.ids.length, done = total - left.length, c0 = left.length ? swCityOf(swRec(left[0])) : '';
    const head = `<div class="sw-head"><button type="button" class="sw-x" onclick="CV.swClose()" aria-label="${esc(MSGT('Fermer'))}">✕</button>
      <div class="sw-ttl"><b>① ${esc(MSGT('Choisir mes visites'))}</b><small>${Math.min(done + 1, total)}/${total}</small> <small class="sw-kept">· ✓ ${SW.kept}</small><small class="sw-city">${c0 ? '📍 <span data-notr>' + esc(c0) + '</span>' : ''}</small></div>
      <button type="button" class="sw-list" onclick="CV.suggList()" aria-label="${esc(MSGT('Voir en liste'))}">☰</button></div>
      <div class="sw-bar"><span style="width:${total ? done / total * 100 : 100}%"></span></div>`;
    if(!left.length){
      const xn = expCount(t);
      const pk = rgItems(t).length;
      ov.innerHTML = head + `<div class="sw-end"><div class="sw-end-i">✨</div><h2>${esc(MSGT('Tout est trié !'))}</h2><p>${esc(RF('{0} lieu(x) ajouté(s) à ton programme.', SW.kept))}</p>
        ${pk ? `<button type="button" class="v-btn" onclick="CV.swClose(1);CV.rgOpen()">② ${esc(MSGT('Ranger mes visites dans les jours'))} (${pk})</button>` : ''}
        <button type="button" class="v-btn${pk ? ' sec' : ''}" onclick="CV.swClose();CV.suggMore()">＋ ${esc(MSGT('Nouvelles suggestions'))}</button>
        <button type="button" class="v-btn sec" onclick="CV.suggRedo()">🔄 ${esc(MSGT('Refaire les suggestions'))}</button>
        <button type="button" class="v-btn sec" onclick="CV.swClose();CV.expOpen()">🎟️ ${esc(MSGT('Expériences à vivre'))}${xn ? ' (' + xn + ')' : ''}</button>
        ${SW.hist.length ? `<button type="button" class="v-btn sec" onclick="CV.swUndo()">↩️ ${esc(MSGT('Annuler le dernier choix'))}</button>` : ''}
        <button type="button" class="v-btn sec" onclick="CV.swClose()">${esc(MSGT('Fermer'))}</button></div>`;
      return;
    }
    const top = swRec(left[0]), nx = left[1] && swRec(left[1]);
    ov.innerHTML = head + `<div class="sw-stack">${nx ? swCard(nx, false) : ''}${swCard(top, true)}</div>
      <div class="sw-acts"><button type="button" class="sw-b undo" onclick="CV.swUndo()" ${SW.hist.length ? '' : 'disabled'} aria-label="${esc(MSGT('Annuler le dernier choix'))}">↩️</button>
        <button type="button" class="sw-b no" onclick="CV.swGo(0)" aria-label="${esc(MSGT('Écarter'))}">✕</button>
        <button type="button" class="sw-b yes" onclick="CV.swGo(1)" aria-label="${esc(MSGT('Ajouter au programme'))}">✓</button>
        <button type="button" class="sw-b all" onclick="CV.swAll()" aria-label="${esc(MSGT('Tout ajouter'))}">⏩</button></div>
      <div class="sw-hint">${esc(MSGT('Glisse à droite pour garder, à gauche pour écarter'))}</div>`;
    ov.querySelectorAll('.sw-card').forEach(el=>swFill(el, swRec(el.dataset.id)));
    swPre(left); swDrag(ov.querySelector('.sw-card.top'));
  }
  const swLeft = () => SW ? SW.ids.slice(SW.i).filter(swPend) : [];
  function swPre(left){ left.slice(2, 5).forEach(id=>{ const r = swRec(id); if(r) swInfo(r).then(x=>{ if(x.img) (new Image()).src = x.img; }); }); }   // les suivantes se préparent
  // carte suivante sans tout redessiner : celle de derrière passe devant (déjà chargée), une nouvelle se glisse derrière
  function swNext(){
    const ov = document.getElementById('cv-sw'), st = ov && ov.querySelector('.sw-stack'); if(!st) return swRender();
    const left = swLeft(); if(!left.length) return swRender();
    st.querySelectorAll('.sw-card.top').forEach(x=>x.remove());
    let topEl = st.querySelector('.sw-card'); if(!topEl || topEl.dataset.id !== left[0]) return swRender();
    topEl.classList.add('top'); swDrag(topEl);
    if(left[1] && swRec(left[1])){ const r = swRec(left[1]); st.insertAdjacentHTML('afterbegin', swCard(r, false)); swFill(st.firstElementChild, r); }
    const total = SW.ids.length, done = total - left.length;
    const sm = ov.querySelector('.sw-ttl small'); if(sm) sm.textContent = Math.min(done + 1, total) + '/' + total;
    const bar = ov.querySelector('.sw-bar span'); if(bar) bar.style.width = (total ? done / total * 100 : 100) + '%';
    const ub = ov.querySelector('.sw-b.undo'); if(ub) ub.disabled = !SW.hist.length;
    const kp = ov.querySelector('.sw-kept'); if(kp) kp.textContent = '· ✓ ' + SW.kept;
    const sc = ov.querySelector('.sw-city'), c0 = swCityOf(swRec(left[0])); if(sc && sc.textContent.replace(/^📍\s*/, '') !== c0){ sc.innerHTML = c0 ? '📍 <span data-notr>' + esc(c0) + '</span>' : ''; sc.classList.remove('pop'); void sc.offsetWidth; sc.classList.add('pop'); }
    swPre(left);
  }
  function swDrag(el){
    if(!el) return; let x0 = 0, y0 = 0, dx = 0, on = false;
    el.addEventListener('pointerdown', e=>{ if(e.target.closest('a')) return; on = true; x0 = e.clientX; y0 = e.clientY; dx = 0; el.style.transition = 'none'; try { el.setPointerCapture(e.pointerId); } catch(_){} });
    el.addEventListener('pointermove', e=>{ if(!on) return; dx = e.clientX - x0; const dy = e.clientY - y0; if(Math.abs(dx) < 6){ dx = 0; return; }
      el.style.transform = `translate(${dx}px,${dy * .1}px) rotate(${dx / 22}deg)`; el.style.setProperty('--yes', Math.max(0, Math.min(1, dx / 90))); el.style.setProperty('--no', Math.max(0, Math.min(1, -dx / 90))); });
    const end = () => { if(!on) return; on = false; el.style.transition = '';
      if(Math.abs(dx) > 90) swGo(dx > 0 ? 1 : 0); else { el.style.transform = ''; el.style.setProperty('--yes', 0); el.style.setProperty('--no', 0); } };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
  let swBusy = false;
  function swGo(keep){
    if(!SW || swBusy) return; swBusy = true; setTimeout(()=>{ swBusy = false; }, 340); const el = document.querySelector('#cv-sw .sw-card.top'); if(!el) return;
    if(/^ex\|/.test(el.dataset.id)) return swGoEx(el, keep);
    const p = R[el.dataset.id]; if(!p) return;
    const before = clone(p), di = R['day:' + p.trip + ':' + p.date], dayBefore = di ? clone(di) : null;
    if(keep){ const c = clone(p); delete c.sugg; c.kept = Date.now(); c.pick = 1; putQuiet([c]); SW.kept++;
      if(p.exc && di && !di.deleted && !String(di.titre || '').includes(p.nom)) putQuiet([Object.assign(clone(di), {titre:(di.titre ? di.titre + ' · ' : '') + '🚌 ' + p.nom})]); }
    else { M.suggNo = M.suggNo || {}; const nl = M.suggNo[p.trip] = M.suggNo[p.trip] || []; if(!nl.includes(p.nom)) nl.push(p.nom); if(nl.length > 300) nl.shift(); const c = clone(p); c.deleted = true; putQuiet([c]); }
    SW.hist.push({id:p.id, keep, before, dayBefore});
    try { persistNow(); } catch(e){}   // enregistré tout de suite : on peut s’arrêter à tout moment, rien n’est perdu
    if(keep) toast('✓ ' + p.nom + ' · ' + MSGT('Ajouté au programme'));
    el.style.transition = 'transform .32s ease, opacity .32s ease'; el.style.transform = `translate(${keep ? 140 : -140}%, -4%) rotate(${keep ? 22 : -22}deg)`; el.style.opacity = '0';
    el.style.setProperty(keep ? '--yes' : '--no', 1);
    setTimeout(swNext, 300);
  }
  // activité payante : gardée = au programme (jour provisoire, rangée à l'étape ②) ; écartée = plus proposée
  function swGoEx(el, keep){
    const id = el.dataset.id, x = SW.EX[id]; if(!x) return; const t = R[SW.tid];
    let made = null;
    if(keep){ made = expPut(t, x.h, x.e); SW.kept++; toast('🎟️ ' + x.e.p + ' · ' + MSGT('Ajouté au programme')); }
    else { M.expNo = M.expNo || {}; const nl = M.expNo[t.id] = M.expNo[t.id] || []; if(!nl.includes(x.e.key)) nl.push(x.e.key); }
    SW.exDone.add(id); SW.hist.push({id, ex:1, keep, made, key:x.e.key, tid:t.id});
    try { persistNow(); } catch(e){}
    el.style.transition = 'transform .32s ease, opacity .32s ease'; el.style.transform = `translate(${keep ? 140 : -140}%, -4%) rotate(${keep ? 22 : -22}deg)`; el.style.opacity = '0';
    el.style.setProperty(keep ? '--yes' : '--no', 1);
    setTimeout(swNext, 300);
  }
  function swUndo(){
    if(!SW || !SW.hist.length || swBusy) return; const h = SW.hist.pop();
    if(h.ex){ SW.exDone.delete(h.id);
      if(h.keep){ SW.kept = Math.max(0, SW.kept - 1); if(h.made && R[h.made]) putQuiet([Object.assign(clone(R[h.made]), {deleted:true})]); }
      else { const nl = ((M.expNo || {})[h.tid]) || []; const i = nl.indexOf(h.key); if(i >= 0) nl.splice(i, 1); persist(); }
      const at = SW.ids.indexOf(h.id); if(at >= 0) SW.i = Math.min(SW.i, at); swRender(); return; }
    const r = Object.assign(clone(h.before), {sugg:true}); delete r.deleted; delete r.kept; putQuiet([r]);
    if(h.keep){ SW.kept = Math.max(0, SW.kept - 1); if(h.dayBefore && R[h.dayBefore.id] && R[h.dayBefore.id].titre !== h.dayBefore.titre) putQuiet([Object.assign(clone(R[h.dayBefore.id]), {titre:h.dayBefore.titre || ''})]); }
    else { const nl = ((M.suggNo || {})[h.before.trip]) || []; const i = nl.indexOf(h.before.nom); if(i >= 0) nl.splice(i, 1); persist(); }
    const at = SW.ids.indexOf(h.id); if(at >= 0) SW.i = Math.min(SW.i, at);
    swRender();
  }
  async function swAll(){
    if(!SW) return; const n = SW.ids.filter(id=>!/^ex\|/.test(id) && R[id] && R[id].sugg && !R[id].deleted).length; if(!n) return;
    if(!(await uiConfirm(RF('Ajouter les {0} lieux restants à ton programme ?', n)))) return;
    SW.kept += n; suggKeep('*'); swRender();
  }
  async function suggRedo(){
    const t = trip(); if(!t) return; const L = list('place', p=>p.trip === t.id && p.sugg);
    if(!(await uiConfirm(RF('Refaire les suggestions ? Les {0} lieux pas encore choisis sont remplacés par une nouvelle recherche. Ceux que tu as gardés restent.', L.length)))) return;
    const out = L.map(p=>Object.assign(clone(p), {deleted:true})); if(out.length) putQuiet(out);
    list('item', i=>i.trip === t.id && i.cat === 'hotel').forEach(h=>{ const c = stayCity(h); if(c && M.poiCache) delete M.poiCache[normQ(c)]; });
    if(M.suggDone) delete M.suggDone[t.id]; persist(); swClose(true); closeSheet(true); suggFill(t.id);
  }
  function swClose(quiet){ const ov = document.getElementById('cv-sw'); if(ov) ov.remove(); if(ov || !quiet) document.body.style.overflow = ''; SW = null; if(!quiet) refresh(); }
  /* ② RANGER MES VISITES DANS LES JOURS : seulement les visites et activités choisies, dans l'ordre du trajet
     (de proche en proche depuis l'hôtel, pour voir le plus de choses chaque jour sans allers-retours).
     Chaque carte propose le jour conseillé (jours de trajet allégés) : on la fait glisser sur un jour, ou on touche le jour. */
  /* 🔒 JOURS DE FERMETURE (horaires OpenStreetMap « opening_hours », lus par ohDay) : un musée fermé le lundi n'est pas conseillé un lundi. */
  const ohDayName = d => { try { return new Date(2024, 0, 7 + d).toLocaleDateString((window.I18N && I18N.locale) || 'fr-FR', {weekday:'long'}); } catch(e){ return OH_D[d]; } };
  const ohWd = d => new Date(d + 'T12:00:00').getDay();
  const ohOf = x => (x && x.info && x.info.oh) || ((M.oh || {})[x && x.id] || {}).oh || '';
  const ohShut = (x, d) => { const oh = ohOf(x); if(!oh || !d) return false; const r = ohDay(oh, d); return Array.isArray(r) && !r.length; };
  async function ohFetch(items){
    M.oh = M.oh || {}; const need = items.filter(x=>x && x.lat != null && !(x.info && x.info.oh) && !(M.oh[x.id] && Date.now() - M.oh[x.id].t < 30 * 864e5)).slice(0, 60); if(!need.length) return false;
    const q = '[out:json][timeout:25];(' + need.map(x=>`nwr["opening_hours"]["name"](around:250,${(+x.lat).toFixed(5)},${(+x.lng).toFixed(5)});`).join('') + ');out center tags 400;';
    const one = ep => fetch(ep, {method:'POST', body:'data=' + encodeURIComponent(q), headers:{'Content-Type':'application/x-www-form-urlencoded'}}).then(r=>{ if(!r.ok) throw new Error('osm'); return r.json(); });
    const j = await withTimeout(Promise.any(['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'].map(one)), 30000).catch(()=>null); if(!j) return false;
    const E = (j.elements || []).map(e=>({n:(e.tags || {}).name || '', oh:(e.tags || {}).opening_hours || '', lat:e.lat ?? (e.center || {}).lat, lng:e.lon ?? (e.center || {}).lon})).filter(e=>e.lat != null);
    need.forEach(x=>{ const c = E.map(e=>[e, swSim(e.n, x.nom || '')]).filter(z=>z[1] >= .5 && rawKm(z[0], x) < .4).sort((a, b)=>b[1] - a[1])[0];
      M.oh[x.id] = {t:Date.now(), oh:c ? c[0].oh : ''}; });
    persist(); return true;
  }
  let RG = null;
  function rgItems(t){ return t ? [...list('place', p=>p.trip === t.id && p.pick && !p.sugg), ...list('item', i=>i.trip === t.id && i.cat === 'activite' && i.pick)] : []; }
  const rgH = s => { const m = String(s || '').match(/(\d{1,2})[:h](\d{2})?/); return m ? +m[1] + (+(m[2] || 0)) / 60 : null; };
  const rgNom = x => x.type === 'place' ? x.nom : (x.titre || '');
  // poids dans la journée (4 = journée pleine) : excursions et îles = la journée, spectacle / coucher de soleil = le soir, le reste ≈ une demi-journée
  const RG_FULL = /^(exc|ile|saf|gla|vol|jun|cru|tra|ski)$/, RG_EVE = /^(nui|spe|sun|aur)$/;
  const rgT = x => String(x.exp || '').split('|')[0];
  const rgW = x => x.type === 'place' ? (x.exc ? 4 : 1) : RG_FULL.test(rgT(x)) ? 4 : RG_EVE.test(rgT(x)) ? .5 : 1.5;
  const rgStages = t => { const S = tlStages(); return S.length ? S : [{city:'', debut:t.debut, fin:t.fin || t.debut, h:null}]; };
  function rgDays(t){
    const S = rgStages(t), ds = range(t.debut, t.fin || t.debut), out = {};
    ds.forEach(d=>{
      let k = S.findIndex(s=>s.debut <= d && d < s.fin); if(k < 0) k = d < (S[0] || {}).debut ? 0 : S.length - 1;
      const st = S[k] || null, tr = list('item', i=>i.trip === t.id && i.cat === 'transport' && i.date === d);
      let cap = 4;
      if(tr.length){   // trajet ce jour-là : on garde le temps libre avant le départ et après l'arrivée (9 h – 20 h)
        let busy = []; tr.forEach(x=>{ const a = rgH(x.heureDep || x.heure), b = rgH(x.heureArr); const pre = /Avion/i.test(x.mode || '') ? 2 : 1;
          if(a != null || b != null) busy.push([a != null ? a - pre : 9, b != null ? (b < (a || 0) ? 24 : b) + 1 : 20]); });
        if(busy.length){ let free = 0; for(let h = 9; h < 20; h += .5) if(!busy.some(([u, v])=>h >= u && h < v)) free += .5; cap = Math.max(0, Math.min(4, Math.floor(free / 2.5))); }
        else cap = 2;
      } else if(d === t.debut || (st && d === st.debut && k > 0)) cap = 2;
      else if(d === (t.fin || t.debut) && ds.length > 1) cap = 1;
      out[d] = {d, k, st, tr, cap, first:d === t.debut, last:d === (t.fin || t.debut) && ds.length > 1};
    });
    return out;
  }
  const rgLoad = (t, d, skip) => list('place', p=>p.trip === t.id && p.date === d && !p.sugg && !p.pick && p.id !== skip).reduce((a, p)=>a + rgW(p), 0)
    + list('item', i=>i.trip === t.id && i.cat === 'activite' && i.date === d && !i.pick && i.id !== skip).length * 1.5;
  function rgStage(x, D, S){
    const c = x.type === 'place' ? swCity(x) : (x.adresse || ''); let k = S.findIndex(s=>normQ(s.city) === normQ(c));
    if(k < 0 && x.date && D[x.date]) k = D[x.date].k; return Math.max(0, k);
  }
  // l'ordre du trajet : de proche en proche depuis l'hôtel de l'étape, puis rangé jour après jour selon la place libre
  function rgPlan(t){
    const D = rgDays(t), S = rgStages(t), all = rgItems(t).filter(x=>!(RG && RG.later.has(x.id))), later = rgItems(t).filter(x=>RG && RG.later.has(x.id)).sort((a, b)=>RG.later.get(a.id) - RG.later.get(b.id));
    const used = {}; Object.keys(D).forEach(d=>{ used[d] = rgLoad(t, d); });
    const out = [];
    S.forEach((st, k)=>{
      const days = Object.values(D).filter(x=>x.k === k).map(x=>x.d); if(!days.length) return;
      const mine = all.filter(x=>rgStage(x, D, S) === k); if(!mine.length) return;
      // départ du trajet : l'hôtel (s'il a une adresse), sinon le centre de la ville
      const hh = list('item', i=>i.trip === t.id && i.cat === 'hotel' && i.lat != null && normQ(stayCity(i)) === normQ(st.city))[0];
      const g = hh || R['geo:' + normQ(st.city)], geo = mine.filter(x=>x.lat != null), rest = mine.filter(x=>x.lat == null);
      let cur = g && g.lat != null ? {lat:+g.lat, lng:+g.lng} : geo.length ? {lat:geo.reduce((a, x)=>a + +x.lat, 0) / geo.length, lng:geo.reduce((a, x)=>a + +x.lng, 0) / geo.length} : null;
      const exc = mine.filter(x=>rgW(x) >= 4), pts = geo.filter(x=>rgW(x) < 4), nop = rest.filter(x=>rgW(x) < 4);
      // excursion à la journée : un jour entier libre, plutôt au milieu de l'étape
      exc.forEach(x=>{ const mid = days.slice().sort((a, b)=>Math.abs(days.indexOf(a) - days.length / 2) - Math.abs(days.indexOf(b) - days.length / 2));
        const d = mid.find(d=>D[d].cap >= 4 && !used[d] && !ohShut(x, d)) || mid.find(d=>!used[d] && !ohShut(x, d)) || mid.find(d=>!ohShut(x, d)) || mid[0]; used[d] = (used[d] || 0) + 4; out.push({x, d}); });
      // 🧭 un quartier par jour : les visites sont regroupées par proximité (comme des grappes), une grappe = une journée,
      // en tenant compte de la place libre de chaque jour et des visites déjà prévues ce jour-là (elles attirent les visites voisines).
      // Les jours de trajet gardent les visites proches de l'hôtel.
      const slots = days.filter(d=>D[d].cap - used[d] > 0), free = d => D[d].cap - used[d], C = {}, fixed = {}, got = {};
      slots.forEach(d=>{ const A = list('place', p=>p.trip === t.id && p.date === d && !p.sugg && !p.pick && p.lat != null);
        if(A.length){ C[d] = {lat:A.reduce((a, p)=>a + +p.lat, 0) / A.length, lng:A.reduce((a, p)=>a + +p.lng, 0) / A.length}; fixed[d] = A; }
        else if(D[d].cap < 4 && cur){ C[d] = cur; fixed[d] = []; } });
      // les autres jours : graines les plus éloignées les unes des autres (une par quartier)
      slots.filter(d=>!C[d]).forEach(d=>{ let best = null, bd = -1; pts.forEach(x=>{ const ds = Object.values(C), m = ds.length ? Math.min(...ds.map(c=>km(c, x))) : (cur ? km(cur, x) : 0); if(m > bd){ bd = m; best = x; } });
        if(best) C[d] = {lat:+best.lat, lng:+best.lng}; });
      const act = slots.filter(d=>C[d]);
      for(let it = 0; it < 6 && act.length; it++){
        const rem = {}; act.forEach(d=>{ rem[d] = free(d); }); Object.keys(got).forEach(k=>delete got[k]);
        const dist = (d, x) => km(C[d], x) + (D[d].cap < 4 ? 2 : 0);   // les vraies journées d'abord : un jour de trajet ne prend que ce qui est tout près
        const order = pts.map(x=>{ const ds = act.map(d=>dist(d, x)).sort((a, b)=>a - b); return [x, (ds[1] == null ? 0 : ds[1]) - ds[0]]; }).sort((a, b)=>b[1] - a[1]).map(z=>z[0]);
        order.forEach(x=>{ const w = rgW(x), ok = act.filter(d=>!ohShut(x, d)).filter(d=>rem[d] >= w || (rem[d] > 0 && w > 1 && D[d].cap >= 4)).sort((a, b)=>dist(a, x) - dist(b, x)); if(!ok.length) return;
          got[x.id] = ok[0]; rem[ok[0]] -= w; });
        act.forEach(d=>{ if(D[d].cap < 4 && !(fixed[d] || []).length) return;   // jour de trajet : reste centré sur l'hôtel
          const M2 = [...(fixed[d] || []), ...pts.filter(x=>got[x.id] === d)]; if(M2.length) C[d] = {lat:M2.reduce((a, p)=>a + +p.lat, 0) / M2.length, lng:M2.reduce((a, p)=>a + +p.lng, 0) / M2.length}; });
      }
      const least = () => days.slice().sort((a, b)=>(used[a] - D[a].cap) - (used[b] - D[b].cap) || D[b].cap - D[a].cap)[0];   // tout est plein : le jour le moins chargé (plutôt une vraie journée qu'un jour de trajet)
      const byDay = {};
      const leastFor = x => days.filter(d=>!ohShut(x, d)).sort((a, b)=>(used[a] - D[a].cap) - (used[b] - D[b].cap) || D[b].cap - D[a].cap)[0] || least();
      pts.forEach(x=>{ const d = got[x.id] || leastFor(x); used[d] = (used[d] || 0) + rgW(x); (byDay[d] = byDay[d] || []).push(x); });
      // activités sans adresse précise : sur les jours qui ont encore le plus de place
      nop.forEach(x=>{ const d = days.slice().sort((a, b)=>(free(b) - free(a)) || (D[b].cap - D[a].cap))[0]; used[d] = (used[d] || 0) + rgW(x); (byDay[d] = byDay[d] || []).push(x); });
      // dans chaque journée : de proche en proche depuis l'hôtel
      days.forEach(d=>{ const L = byDay[d]; if(!L) return; let c = cur; const pool = L.filter(x=>x.lat != null), seq = [];
        while(pool.length){ let bi = 0, bd = 1e9; pool.forEach((x, i)=>{ const dd = c ? km(c, x) : 0; if(dd < bd){ bd = dd; bi = i; } }); c = pool[bi]; seq.push(pool.splice(bi, 1)[0]); }
        [...seq, ...L.filter(x=>x.lat == null)].forEach(x=>out.push({x, d})); });
    });
    out.sort((a, b)=>a.d.localeCompare(b.d));   // jour après jour (l'ordre dans la journée est gardé)
    later.forEach(x=>{ const c = Object.values(D); const d = x.date && D[x.date] ? x.date : (c[0] || {}).d; out.push({x, d, later:1}); });
    return {D, S, out};
  }
  function rgTips(t, x, d, D){
    const o = D[d] || {}, T = [];
    if(o.tr && o.tr.length){ const r = o.tr[0]; T.push(`${icon(r)} ${MSGT('Jour de trajet')}${r.heureDep || r.heureArr ? ' (' + [r.heureDep || r.heure, r.heureArr].filter(Boolean).join(' → ') + ')' : ''} : ${MSGT('journée allégée')}`); }
    else if(o.first) T.push('🛬 ' + MSGT('Premier jour : journée allégée'));
    else if(o.last) T.push('🧳 ' + MSGT('Dernier jour : garde du temps pour le retour'));
    else if(o.st && d === o.st.debut) T.push('🚆 ' + MSGT('Jour d’arrivée dans la ville : journée allégée'));
    if(rgW(x) >= 4) T.push('🚌 ' + MSGT('Excursion : prévois la journée entière'));
    else if(x.type === 'item' && RG_EVE.test(rgT(x))) T.push('🌙 ' + MSGT('En soirée : après les visites de la journée'));
    if(x.lat != null){ const nb = list('place', p=>p.trip === t.id && p.date === d && !p.sugg && !p.pick && p.lat != null && p.id !== x.id).map(p=>[p, km(p, x)]).sort((a, b)=>a[1] - b[1])[0];
      if(nb && nb[1] < 4) T.push('📍 ' + RF('À {0} de {1}, prévu ce jour-là', nb[1] < 1 ? Math.round(nb[1] * 1000 / 50) * 50 + ' m' : nb[1].toFixed(1) + ' km', nb[0].nom)); }
    if(ohOf(x)){ const wk = [...Array(7)].map((_, i)=>{ const dt = new Date(d + 'T12:00:00'); dt.setDate(dt.getDate() + i); return dt.toISOString().slice(0, 10); }).filter(z=>ohShut(x, z));
      if(wk.length && wk.length < 7) T.push('🔒 ' + RF('Fermé : {0}', wk.map(z=>ohDayName(ohWd(z))).join(', '))); }
    if(x.type === 'item') T.push('🎟️ ' + MSGT('Activité payante : vérifie les horaires avant de réserver'));
    if(rgLoad(t, d, x.id) >= (o.cap || 4)) T.push('⚠️ ' + MSGT('Journée déjà bien remplie'));
    return T;
  }
  function rgOpen(){
    const t = trip(); if(!t) return; if(!t.debut){ toast('📅 ' + MSGT('Choisis d’abord les dates du voyage.')); return; } closeSheet(true);
    RG = {tid:t.id, hist:[], later:new Map(), lc:0, all:false, n0:rgItems(t).length, done:0}; rgRender();
    ohFetch(rgItems(t).filter(x=>x.type === 'place')).then(ch=>{ if(ch && RG && RG.tid === t.id) rgRender(); }).catch(()=>{});   // jours de fermeture : arrivent en arrière-plan
  }
  function rgClose(){ const ov = document.getElementById('cv-rg'); if(ov) ov.remove(); document.body.style.overflow = ''; RG = null; refresh(); }
  function rgRender(){
    if(!RG) return; const t = R[RG.tid]; if(!t){ rgClose(); return; }
    let ov = document.getElementById('cv-rg');
    if(!ov){ ov = document.createElement('div'); ov.id = 'cv-rg'; ov.className = 'cv-sw-like'; document.body.appendChild(ov); document.body.style.overflow = 'hidden'; }
    const P = rgPlan(t), ds = dayList(), left = P.out.length, total = Math.max(RG.n0, RG.done + left);
    const head = `<div class="sw-head"><button type="button" class="sw-x" onclick="CV.rgClose()" aria-label="${esc(MSGT('Fermer'))}">✕</button>
      <div class="sw-ttl"><b>② ${esc(MSGT('Ranger mes visites dans les jours'))}</b><small>${Math.min(RG.done + 1, total)}/${total}</small></div><span></span></div>
      <div class="sw-bar"><span style="width:${total ? RG.done / total * 100 : 100}%"></span></div>`;
    if(!left){
      ov.innerHTML = head + `<div class="sw-end rg-end"><div class="sw-end-i">🗓️</div><h2>${esc(MSGT('Tout est rangé !'))}</h2><p>${esc(MSGT('Chaque journée suit l’ordre du trajet, de proche en proche. Tu peux encore tout déplacer dans le programme.'))}</p>
        <div class="rg-hood"><b>🏨 ${esc(MSGT('Où dormir ? Le quartier au centre de tes visites'))}</b><div id="rg-hood">${rgHoods(t) || esc(MSGT('Ajoute au moins 2 visites par ville pour avoir un conseil.'))}</div>
          <small>${esc(MSGT('Rien n’est figé : si tu choisis un hôtel ailleurs, mets son adresse dans l’hébergement puis « Réorganiser depuis mon hôtel ». Les journées repartiront de là.'))}</small></div>
        <button type="button" class="v-btn" onclick="CV.rgClose();CV.tab('prog')">📅 ${esc(MSGT('Voir mon programme'))}</button>
        ${RG.hist.length ? `<button type="button" class="v-btn sec" onclick="CV.rgUndo()">↩️ ${esc(MSGT('Annuler le dernier choix'))}</button>` : ''}
        <button type="button" class="v-btn sec" onclick="CV.rgClose()">${esc(MSGT('Fermer'))}</button></div>`;
      return;
    }
    const cur = P.out[0], x = cur.x, sug = cur.d, D = P.D, st = (D[sug] || {}).st, city = x.type === 'place' ? swCity(x) : (x.adresse || '');
    const info = x.type === 'place' ? x : {nom:rgNom(x).replace(/^.*?·\s*/, ''), ex:1, city, id:x.id};
    const dayB = d => { const o = D[d] || {}, k = ds.indexOf(d), l = rgLoad(t, d, x.id), dots = '●'.repeat(Math.min(4, Math.ceil(l))) + '○'.repeat(Math.max(0, Math.min(4, o.cap || 0) - Math.min(4, Math.ceil(l))));
      return `<button type="button" class="rg-day${d === sug ? ' sug' : ''}${l >= (o.cap || 4) ? ' full' : ''}${ohShut(x, d) ? ' shut' : ''}" data-d="${d}" onclick="CV.rgSet('${d}')"><b>${k >= 0 ? PJ(k + 1) : ''}</b><small>${ohShut(x, d) ? '🔒 ' : ''}${esc(fshort(d))}</small>${o.tr && o.tr.length ? `<i>${icon(o.tr[0])}</i>` : ''}<em>${dots || '·'}</em>${d === sug ? `<u>${esc(MSGT('conseillé'))}</u>` : ''}</button>`; };
    const near = Object.values(D).filter(o=>o.k === (D[sug] || {}).k).map(o=>o.d), days = RG.all ? Object.keys(D).sort() : near;
    ov.innerHTML = head + `<div class="rg-city">📍 <span data-notr>${esc(city || (st && st.city) || '')}</span></div>
      <div class="sw-stack rg-stack"><div class="sw-card top rg-card" data-id="${esc(x.id)}">
        <div class="sw-ph"><span class="sw-ic">${x.type === 'place' ? (POI_CATS[x.cat] || {icon:'📍'}).icon : '🎟️'}</span><img class="sw-img" alt="" decoding="async"></div><div class="sw-shade"></div>
        <i class="sw-tag no">${esc(MSGT('Plus tard'))}</i>
        <div class="sw-tx"><small>${esc(MSGT('Conseillé'))} : ${ds.indexOf(sug) >= 0 ? PJ(ds.indexOf(sug) + 1) + ' · ' : ''}${esc(fdate(sug))}</small><b data-notr>${esc(rgNom(x))}</b>
          <div class="rg-tips">${rgTips(t, x, sug, D).map(s=>`<span>${esc(s)}</span>`).join('')}</div></div></div></div>
      <div class="rg-hint">👆 ${esc(MSGT('Fais glisser la carte sur un jour'))}</div>
      <div class="rg-days">${days.map(dayB).join('')}<button type="button" class="rg-day rg-more" onclick="CV.rgAll()"><b>📅</b><small>${esc(MSGT(RG.all ? 'Moins de jours' : 'Autre jour'))}</small></button></div>
      <div class="sw-acts rg-acts"><button type="button" class="sw-b undo" onclick="CV.rgUndo()" ${RG.hist.length ? '' : 'disabled'} aria-label="${esc(MSGT('Annuler le dernier choix'))}">↩️</button>
        <button type="button" class="sw-b no" onclick="CV.rgDrop()" aria-label="${esc(MSGT('Retirer du programme'))}">🗑️</button>
        <button type="button" class="rg-ok" onclick="CV.rgSet('${sug}')">✓ ${esc(MSGT('Jour conseillé'))}</button>
        <button type="button" class="sw-b all" onclick="CV.rgLater()" aria-label="${esc(MSGT('Plus tard'))}">⏭️</button></div>
      ${left > 1 ? `<button type="button" class="rg-auto" onclick="CV.rgAuto()">⚡ ${esc(RF('Tout ranger comme conseillé ({0})', left))}</button>` : ''}`;
    const el = ov.querySelector('.rg-card'); swFill(el, info); rgDrag(el);
    const sg = ov.querySelector('.rg-day.sug'); if(sg) try { sg.scrollIntoView({inline:'center', block:'nearest'}); } catch(e){}
    P.out.slice(1, 4).forEach(o=>{ const r = o.x.type === 'place' ? o.x : {nom:rgNom(o.x).replace(/^.*?·\s*/, ''), ex:1, city:o.x.adresse || ''}; swInfo(r).then(z=>{ if(z.img) (new Image()).src = z.img; }); });
  }
  function rgDrag(el){
    let x0 = 0, y0 = 0, dx = 0, dy = 0, on = false, over = null;
    const hit = (x, y) => { const b = document.elementsFromPoint(x, y).find(e=>e.classList && e.classList.contains('rg-day') && !e.classList.contains('rg-more')); return b || null; };
    el.addEventListener('pointerdown', e=>{ if(e.target.closest('a')) return; on = true; x0 = e.clientX; y0 = e.clientY; dx = dy = 0; el.style.transition = 'none'; try { el.setPointerCapture(e.pointerId); } catch(_){} });
    el.addEventListener('pointermove', e=>{ if(!on) return; dx = e.clientX - x0; dy = e.clientY - y0; if(Math.abs(dx) + Math.abs(dy) < 8) return;
      const sc = dy > 60 ? Math.max(.42, 1 - (dy - 60) / 400) : 1;
      el.style.transform = `translate(${dx}px,${dy}px) rotate(${dx / 30}deg) scale(${sc})`; el.style.setProperty('--no', dy < 40 ? Math.max(0, Math.min(1, -dx / 110)) : 0);
      const b = hit(e.clientX, e.clientY); if(b !== over){ if(over) over.classList.remove('hov'); over = b; if(b){ b.classList.add('hov'); try { navigator.vibrate && navigator.vibrate(8); } catch(_){} } } });
    const end = () => { if(!on) return; on = false; el.style.transition = '';
      if(over){ const d = over.dataset.d; over.classList.remove('hov'); over = null; el.style.transition = 'transform .25s ease, opacity .25s ease'; el.style.opacity = '0'; el.style.transform += ' scale(.2)'; setTimeout(()=>rgSet(d), 200); return; }
      if(dx < -110 && Math.abs(dy) < 80){ el.style.transition = 'transform .3s ease, opacity .3s ease'; el.style.transform = 'translate(-140%,-4%) rotate(-22deg)'; el.style.opacity = '0'; setTimeout(rgLater, 260); return; }
      el.style.transform = ''; el.style.setProperty('--no', 0); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
  let rgBusy = false;
  function rgSet(d){
    if(!RG || rgBusy) return; const t = R[RG.tid]; const P = rgPlan(t), cur = P.out[0]; if(!cur || !d) return;
    rgBusy = true; setTimeout(()=>{ rgBusy = false; }, 250);
    const x = cur.x, before = clone(x), c = clone(x), o = P.D[d] || {}; c.date = d; delete c.pick;
    if(x.type === 'place' && o.st && o.st.h) c.stay = o.st.h.id;
    const di = x.exc && R['day:' + x.trip + ':' + d], dayBefore = di ? clone(di) : null;
    putQuiet([c]); if(di && !di.deleted && !String(di.titre || '').includes(x.nom)) putQuiet([Object.assign(clone(di), {titre:(di.titre ? di.titre + ' · ' : '') + '🚌 ' + x.nom})]);
    RG.later.delete(x.id); RG.hist.push({before, dayBefore}); RG.done++;
    try { persistNow(); } catch(e){}
    const ds = dayList(), k = ds.indexOf(d), city = x.type === 'place' ? swCity(x) : (x.adresse || '');
    const away = o.st && city && normQ(o.st.city) !== normQ(city);
    toast(ohShut(x, d) ? '🔒 ' + RF('Attention : fermé le {0}', ohDayName(ohWd(d))) : (away ? '⚠️ ' + RF('Ce jour-là tu es à {0}', o.st.city) : '✓ ' + rgNom(x) + ' → ' + (k >= 0 ? PJ(k + 1) + ' · ' : '') + fshort(d)));
    rgRender();
  }
  function rgLater(){ if(!RG) return; const t = R[RG.tid], cur = rgPlan(t).out[0]; if(!cur) return; RG.later.set(cur.x.id, ++RG.lc); rgRender(); }
  async function rgDrop(){
    if(!RG) return; const t = R[RG.tid], cur = rgPlan(t).out[0]; if(!cur) return; const x = cur.x;
    if(!(await uiConfirm(RF('Retirer « {0} » du programme ?', rgNom(x))))) return;
    RG.hist.push({before:clone(x)}); putQuiet([Object.assign(clone(x), {deleted:true})]); RG.done++;
    if(x.type === 'place'){ M.suggNo = M.suggNo || {}; const nl = M.suggNo[x.trip] = M.suggNo[x.trip] || []; if(!nl.includes(x.nom)) nl.push(x.nom); }
    else if(x.exp){ M.expNo = M.expNo || {}; const nl = M.expNo[x.trip] = M.expNo[x.trip] || []; if(!nl.includes(x.exp)) nl.push(x.exp); }
    try { persistNow(); } catch(e){} rgRender();
  }
  function rgUndo(){
    if(!RG || !RG.hist.length) return; const h = RG.hist.pop(); const r = clone(h.before); delete r.deleted; r.pick = 1; putQuiet([r]);
    if(h.dayBefore && R[h.dayBefore.id]) putQuiet([Object.assign(clone(R[h.dayBefore.id]), {titre:h.dayBefore.titre || ''})]);
    RG.done = Math.max(0, RG.done - 1); rgRender();
  }
  function rgAll(){ if(!RG) return; RG.all = !RG.all; rgRender(); }
  // ⚡ tout le reste au jour conseillé, d'un coup (on peut encore tout déplacer ensuite)
  async function rgAuto(){
    if(!RG) return; const t = R[RG.tid], P = rgPlan(t); if(!P.out.length) return;
    if(!(await uiConfirm(RF('Ranger les {0} visites restantes au jour conseillé ?', P.out.length)))) return;
    const out = []; P.out.forEach(({x, d})=>{ const c = clone(x), o = P.D[d] || {}; c.date = d; delete c.pick; if(x.type === 'place' && o.st && o.st.h) c.stay = o.st.h.id; out.push(c); RG.hist.push({before:clone(x)}); });
    putQuiet(out); RG.done += out.length; RG.later.clear(); try { persistNow(); } catch(e){} rgRender();
  }
  // 🏨 hôtel choisi (ou changé) : toutes les visites de l'étape repartent de lui — les lieux verrouillés 🔒 ne bougent pas
  async function rgRedo(){
    const t = trip(); if(!t) return;
    const L = [...list('place', p=>p.trip === t.id && !p.sugg && !p.pick && !p.lock && p.date), ...list('item', i=>i.trip === t.id && i.cat === 'activite' && i.exp && !i.pick && !okB(i))];
    if(!L.length){ toast(MSGT('Rien à réorganiser pour l’instant.')); return; }
    if(!(await uiConfirm(RF('Réorganiser tes {0} visites à partir de ton hôtel ? Tu valides chaque journée, rien n’est changé sans toi.', L.length)))) return;
    putQuiet(L.map(x=>Object.assign(clone(x), {pick:1}))); rgOpen();
  }
  // 🏨 où dormir : on « triangule » les visites. Ville par ville (grappes de visites à moins de 25 km : un voyage dans 10 pays = 10 conseils),
  // le quartier au centre des visites, plus 1 ou 2 autres quartiers quand les visites forment plusieurs groupes dans la ville.
  const RGN = {};
  const rgLink = (P, r) => { const G = P.map(p=>[p]); let ch = true;   // grappes : deux visites à moins de r km sont dans la même
    while(ch){ ch = false; for(let i = 0; i < G.length && !ch; i++) for(let j = i + 1; j < G.length && !ch; j++) if(G[i].some(a=>G[j].some(b=>rawKm(a, b) <= r))){ G[i] = G[i].concat(G[j]); G.splice(j, 1); ch = true; } }
    return G.sort((a, b)=>b.length - a.length); };
  const rgMid = P => ({lat:P.reduce((a, p)=>a + +p.lat, 0) / P.length, lng:P.reduce((a, p)=>a + +p.lng, 0) / P.length});
  function rgName(c, z, t){ const key = z + ':' + c.lat.toFixed(3) + ',' + c.lng.toFixed(3);
    if(RGN[key] === undefined){ RGN[key] = ''; revName(c.lat, c.lng, z).then(x=>{ RGN[key] = x || ''; const e = document.getElementById('rg-hood'); if(e && x) e.innerHTML = rgHoods(t); }).catch(()=>{}); }
    return RGN[key]; }
  function rgHoods(t){
    const D = rgDays(t), S = rgStages(t), n = Math.max(1, (t.voyageurs || []).length), out = [];
    const all = list('place', p=>p.trip === t.id && !p.sugg && !p.pick && !p.exc && p.lat != null && p.lng != null);
    S.forEach((st, k)=>{
      const days = new Set(Object.values(D).filter(o=>o.k === k).map(o=>o.d)), h = st.h || {};
      const towns = rgLink(all.filter(p=>days.has(p.date)), 25).filter(g=>g.length >= 2);
      towns.forEach((g, gi)=>{
        const c = rgMid(g), avg = Math.round(g.reduce((a, p)=>a + rawKm(c, p), 0) / g.length * 10) / 10;
        const city = towns.length === 1 && st.city ? st.city : (rgName(c, 10, t) || st.city || '');
        const opt = [{c, n:g.length, avg, main:1}];
        // autres quartiers possibles : le centre des visites d'une même journée (une journée = un quartier)
        const byD = {}; g.forEach(p=>{ (byD[p.date] = byD[p.date] || []).push(p); });
        Object.values(byD).filter(q=>q.length >= 2).sort((a, b)=>b.length - a.length).forEach(q=>{ const cq = rgMid(q); if(opt.length < 3 && opt.every(o=>rawKm(o.c, cq) > 1.2)) opt.push({c:cq, n:q.length}); });
        const line = o => { const nr = g.slice().sort((a, b)=>rawKm(o.c, a) - rawKm(o.c, b))[0], nm = rgName(o.c, 15, t), where = nm && normQ(nm) !== normQ(city) ? nm + ', ' + city : city;
          const map = `https://www.google.com/maps/search/${encodeURIComponent(MSGT('hôtels'))}/@${o.c.lat.toFixed(5)},${o.c.lng.toFixed(5)},15z`;
          return `<div class="rg-o${o.main ? ' main' : ''}">🏘️ ${o.main ? MSGT('Quartier conseillé pour dormir') : MSGT('Autre quartier possible')} : <b data-notr>${esc(nm || MSGT('près de') + ' ' + nr.nom)}</b>
            · ${o.main ? `${String(o.avg).replace('.', ',')} km ${MSGT('en moyenne de tes visites')} (${o.n})` : RF('{0} visites à deux pas', o.n)}
            <div class="ex-ln"><a href="${esc(map)}" target="_blank" rel="noopener">🗺️ ${MSGT('Hôtels autour')}</a>${hidden('blk:book') ? '' : bookA('booking', {what:where, date:h.date, end:st.fin || h.dateFin, n}) + (o.main ? bookA('airbnb', {city:where, date:h.date, end:st.fin || h.dateFin, n}) : '')}</div></div>`; };
        out.push(`<div class="rg-h1"><b>📍 <span data-notr>${esc(city || '…')}</span></b>${opt.map(line).join('')}</div>`);
      });
    });
    return out.join('');
  }

  function suggDrop(id){ const p = R[id]; if(!p) return; M.suggNo = M.suggNo || {}; const nl = M.suggNo[p.trip] = M.suggNo[p.trip] || []; if(!nl.includes(p.nom)) nl.push(p.nom); if(nl.length > 300) nl.shift(); p.deleted = true; putQuiet([p]); if(document.getElementById('cv-sw')) swRender(); else suggList(); refresh(); }
  function tlFill(){
    const st = items(i=>i.cat==='hotel' && i.date).sort((a,b)=>a.date.localeCompare(b.date));
    if(!st.length){ alert('Ajoute d’abord les hébergements (une ville par étape).'); return; }
    openSheet(`<h2>🪄 Remplir mes journées</h2><div class="v-sum-small" style="margin-bottom:8px">Pour chaque étape, l’appli choisit les lieux les plus connus (Wikipédia, OpenStreetMap) et les répartit sur les jours, sans toucher à ce que tu as déjà prévu. Tu ajustes ensuite dans « Organiser l’étape ».</div>
      <div class="v-f"><label>Lieux par jour</label><select class="v-in" id="fl-n"><option value="2">2 (tranquille)</option><option value="3" selected>3 (équilibré)</option><option value="4">4 (intense)</option></select></div>
      <label class="cv-checkline"><input type="checkbox" id="fl-mus"> Inclure les musées</label>
      <div id="fl-msg" class="v-sum-small" style="margin:6px 0"></div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.tlFillGo()">🪄 Remplir</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  async function tlFillGo(){
    const per = +document.getElementById('fl-n').value, mus = document.getElementById('fl-mus').checked, msg = m => { const e = document.getElementById('fl-msg'); if(e) e.textContent = m; };
    const st = items(i=>i.cat==='hotel' && i.date).sort((a,b)=>a.date.localeCompare(b.date));
    let added = 0; const out = [];
    for(const h of st){
      const city = stayCity(h); if(!city) continue; msg('📡 ' + city + '…');
      const days = stayDays(h).slice(0, h.dateFin ? -1 : undefined);
      const have = placesOfStay(h.id), names = new Set(have.map(p=>normQ(p.nom)));
      const free = days.filter(d=>placesOf(d).length === 0 && !(dayInfo(d).plan||'').trim()).slice(0, 12);
      if(!free.length) continue;
      const cand = (await placesFor(city)).filter(p=>!names.has(normQ(p.nom)) && (mus || p.cat !== 'musee'));
      let k = 0; free.forEach(d=>{ for(let j=0;j<per && k<cand.length;j++,k++){ const p = cand[k]; out.push({id:'pl'+uid()+k+j, type:'place', trip:M.trip, stay:h.id, date:d, nom:p.nom, adresse:'', lat:p.lat, lng:p.lng, cat:p.cat, lock:false}); added++; } });
    }
    if(!out.length){ msg('Rien à ajouter : tes journées sont déjà remplies, ou aucun lieu trouvé.'); return; }
    putMany(out, '🪄 ' + added + ' lieu(x) ajouté(s)'); closeSheet(true); M.tab = 'prog'; refresh();
    setTimeout(()=>alert(`🪄 ${added} lieux répartis sur tes journées libres.\nPour chaque jour : « Itinéraire » optimise l’ordre de visite et trace le parcours à pied.`), 300);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     ⚡ ACCÈS RAPIDE · 📍 STEPS GÉOLOCALISÉS · 📄 IMPORT PDF / CAPTURE
     📖 CHOIX DES PHOTOS DU JOURNAL · 🌍 CARTE DU MONDE 3D
     ══════════════════════════════════════════════════════════════════════════ */
  function quickBar(){
    const t = trip(); if(!t || t.archived) return '';
    if(hidden('blk:quick')) return tripPhase(t)==='live' ? trkHTML() : '';
    // 🧹 en préparation : pas de raccourcis en doublon (Hôtels, Trajets, Visites et Importer sont dans « Résas », « Je suis ici » sert pendant le voyage)
    if(tripPhase(t)==='prep') return '';
    const r = (ic, l, fn) => `<button type="button" onclick="${fn}"><i>${ic}</i><span>${l}</span></button>`;
    return (tripPhase(t)==='live' ? trkHTML() : '') + `<div class="cv-quick2">${r('🏨','Hôtels',"CV.tab('hotel')")}${r('✈️','Trajets',"CV.tab('transport')")}${r('🎟️','Activités',"CV.tab('activite')")}${r('📄','Importer',"CV.impSheet()")}${r('📍','Je suis ici',"CV.hereNow()")}</div>`;
  }

  /* ---------- 📍 Step géolocalisé = souvenir avec position (photos + récit) ---------- */
  async function hereNow(){
    if(!navigator.geolocation){ alert('Localisation indisponible sur ce téléphone.'); return; }
    toast('📍 Localisation…');
    navigator.geolocation.getCurrentPosition(async pos => {
      const lat = +pos.coords.latitude.toFixed(5), lng = +pos.coords.longitude.toFixed(5);
      let lieu = '', pays = '', cc = '';
      try { const j = await (await fetch(`${GEO}reverse?format=jsonv2&zoom=10&accept-language=${((window.I18N && I18N.lang) || 'fr')}&lat=${lat}&lon=${lng}`)).json();
        const a = (j && j.address) || {}; lieu = a.city || a.town || a.village || a.municipality || a.county || ''; pays = a.country || ''; cc = (a.country_code || '').toUpperCase(); } catch(e){}
      editSouv(null);
      Object.assign(editing, {lat, lng, pays, cc, step:1});
      const f = document.getElementById('v-form'); if(f){ if(f.titre) f.titre.value = lieu || 'Step'; if(f.lieu) f.lieu.value = [lieu, pays].filter(Boolean).join(', '); }
      const h2 = document.querySelector('.v-sheet h2'); if(h2) h2.insertAdjacentHTML('afterend', `<div class="cv-here">${flag(cc)} <b>${esc(lieu || 'Position enregistrée')}</b>${pays ? ', ' + esc(pays) : ''} · ${new Date().toLocaleTimeString((window.I18N ? I18N.locale : 'fr-FR'),{hour:'2-digit',minute:'2-digit'})}<small>Ajoute des photos et un petit récit, comme un step Polarsteps. Il apparaît sur la carte du monde et dans le journal.</small></div>`);
    }, err => alert('Position introuvable (' + (err && err.message || 'refusée') + '). Autorise la localisation pour l’appli dans les réglages du téléphone.'), {enableHighAccuracy:true, timeout:15000, maximumAge:60000});
  }
  const geoSouvs = (tripId) => [...list('souv', s=>s.lat != null && (!tripId || s.trip===tripId)), ...list('step', s=>s.lat != null && (!tripId || s.trip===tripId))];

  /* ---------- 📄 Importer une réservation : PDF, capture d'écran, photo ou texte ---------- */
  function impSheet(cat){
    impCat = ['transport','hotel','activite'].includes(cat) ? cat : '';
    const what = {transport:'du trajet', hotel:'de l’hébergement', activite:'de la visite ou de l’activité'}[impCat] || '';
    openSheet(`<h2>📄 Importer une réservation</h2>
      <div class="v-sum-small" style="margin-bottom:10px">Le <b>PDF</b> ou le <b>mail</b> de confirmation ${what || '(hôtel, vol, train, bus, ferry, visite, activité…)'} : l’appli le lit <b>sur ton téléphone</b>, reconnaît le type de réservation, crée la fiche (ou les vols d’un aller-retour) et te laisse vérifier.</div>
      <button type="button" class="v-btn" onclick="CV.impPick()">📄 Choisir le PDF de la réservation</button>
      <button type="button" class="v-btn sec" onclick="CV.impPickCam()">📸 Photographier un billet papier</button><button type="button" class="v-btn sec" onclick="CV.impPickShot()">🖼️ Une capture d’écran (appli, mail, Wallet)</button>
      <button type="button" class="v-btn sec" onclick="CV.impPickPass()">🎫 Une carte Wallet (.pkpass)</button>
      <button type="button" class="v-btn sec" onclick="CV.impMail()">✉️ Coller le texte du mail</button>
      <button type="button" class="v-btn sec" onclick="CV.impPickAny()">📨 Choisir un mail enregistré (.eml)</button>
      <div class="v-sum-small" style="margin-top:10px"><b>Depuis Mail sur iPhone :</b> touche la pièce jointe PDF → Partager → <i>Enregistrer dans Fichiers</i>, puis choisis-la ici. Pas de PDF ? Copie le texte du mail et touche « Coller le texte du mail ».<br><b>Sur Android :</b> depuis Gmail ou Booking, Partager → <i>Vezoria</i> (appli installée) : l’import démarre tout seul.<br>Si une fiche existe déjà aux mêmes dates (hôtel ou trajet), l’appli te demande : <b>conserver</b> les deux ou <b>remplacer</b>.</div>
      <div id="imp-msg" class="v-sum-small" style="margin-top:8px"></div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  const impSay = m => { const e = document.getElementById('imp-msg'); if(e) e.textContent = m; else toast(m); };
  function impPick(){ tlPickFile('application/pdf,.pdf', f => impFile(f)); }
  async function pdfText(file){
    const lib = await import(new URL('vendor/pdf.min.mjs', location.href).href);
    lib.GlobalWorkerOptions.workerSrc = new URL('vendor/pdf.worker.min.mjs', location.href).href;
    const doc = await lib.getDocument({data: new Uint8Array(await file.arrayBuffer())}).promise;
    let out = '';
    for(let p=1; p<=Math.min(doc.numPages, 6); p++){
      const tc = await (await doc.getPage(p)).getTextContent(); let lastY = null, line = '';
      for(const it of tc.items){ const y = Math.round(it.transform[5]); if(lastY !== null && Math.abs(y - lastY) > 2){ out += line.trim() + '\n'; line = ''; } line += it.str + (it.hasEOL ? '\n' : ' '); lastY = y; }
      out += line.trim() + '\n';
    }
    return out;
  }
  // 🧾 lecture des tickets : Tesseract 5.1.1 copié dans vendor/tesseract (version figée, rien ne part chez jsDelivr, marche hors ligne
  //    une fois les fichiers en mémoire du téléphone) · moteur + français + anglais ≈ 7,6 Mo, téléchargés seulement au 1er ticket lu
  const OCR_DIR = () => new URL((window.VZ_B || '') + 'vendor/tesseract/', location.href).href;
  const OCR_OPT = () => ({workerPath: OCR_DIR() + 'worker.min.js', corePath: OCR_DIR(), langPath: OCR_DIR(), gzip: true});
  function ocrLib(){
    if(window.Tesseract) return Promise.resolve();
    return new Promise((res, rej)=>{ const s = document.createElement('script'); s.src = OCR_DIR() + 'tesseract.min.js'; s.onload = res; s.onerror = ()=>rej(new Error('outil de lecture indisponible')); document.head.appendChild(s); });
  }
  async function ocrText(file){
    await ocrLib();
    const small = await ocrPrep(file); const {data} = await Tesseract.recognize(small, 'fra+eng', OCR_OPT()); return (data && data.text) || '';
  }
  // capture d’écran : niveaux de gris + contraste, et agrandie si l’écran est petit (meilleure lecture des petits caractères)
  async function ocrPrep(file){
    try {
      const bm = await decodeImg(file), k = Math.min(2.2, Math.max(1, 1600 / Math.min(bm.width, bm.height))) * Math.min(1, 2600 / Math.max(bm.width, bm.height));
      const c = document.createElement('canvas'); c.width = Math.round(bm.width * k); c.height = Math.round(bm.height * k);
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(bm, 0, 0, c.width, c.height);
      const im = g.getImageData(0, 0, c.width, c.height), d = im.data; let sum = 0;
      for(let i = 0; i < d.length; i += 4) sum += d[i] * .299 + d[i+1] * .587 + d[i+2] * .114;
      const dark = sum / (d.length / 4) < 110;   // mode sombre (texte clair sur fond foncé) : on inverse
      for(let i = 0; i < d.length; i += 4){ let y = d[i] * .299 + d[i+1] * .587 + d[i+2] * .114; if(dark) y = 255 - y; y = Math.max(0, Math.min(255, (y - 128) * 1.35 + 128)); d[i] = d[i+1] = d[i+2] = y; }
      g.putImageData(im, 0, 0);
      return await new Promise(r => c.toBlob(r, 'image/png'));
    } catch(e){ return await shrink(file, 2000, 0.9); }
  }
  // erreurs fréquentes de lecture sur les captures (heures « 14h05 », « O » pour « 0 » dans les heures et les numéros de vol)
  const cfOcrFix = t => String(t || '').replace(/(\d{1,2})\s?[hH]\s?(\d{2})\b/g, '$1:$2').replace(/\b([0-2]?\d)[:.]([0-5])[oO]\b/g, '$1:$20').replace(/\b([A-Z]{2})\s?[oO](\d{2,3})\b/g, '$10$2').replace(/[|¦]/g, ' ');

  /* ---------- ✈️ Carte d’embarquement (capture d’écran Wallet, appli de la compagnie, PDF) : lecture dédiée ---------- */
  const IATA = (() => { const o = {}; ('CDG Paris|ORY Paris|BVA Paris-Beauvais|NTE Nantes|BES Brest|RNS Rennes|LYS Lyon|MRS Marseille|NCE Nice|BOD Bordeaux|TLS Toulouse|LIL Lille|SXB Strasbourg|MPL Montpellier|BIQ Biarritz|GNB Grenoble|MLH Bâle-Mulhouse|BSL Bâle-Mulhouse|LRT Lorient|QIP Quimper|UIP Quimper|CFE Clermont-Ferrand|PUF Pau|AJA Ajaccio|BIA Bastia|FSC Figari|CLY Calvi|TLN Toulon|PGF Perpignan|GVA Genève|ZRH Zurich|BRU Bruxelles|CRL Charleroi|LUX Luxembourg|AMS Amsterdam|EIN Eindhoven|RTM Rotterdam|LHR Londres|LGW Londres|STN Londres|LTN Londres|LCY Londres|SEN Londres|MAN Manchester|BHX Birmingham|BRS Bristol|EDI Édimbourg|GLA Glasgow|BFS Belfast|DUB Dublin|SNN Shannon|ORK Cork|MAD Madrid|BCN Barcelone|AGP Malaga|PMI Palma|SVQ Séville|VLC Valence|ALC Alicante|IBZ Ibiza|MAH Minorque|BIO Bilbao|SCQ Saint-Jacques-de-Compostelle|TFS Tenerife|TFN Tenerife|LPA Las Palmas|ACE Lanzarote|FUE Fuerteventura|LIS Lisbonne|OPO Porto|FAO Faro|FNC Funchal|PDL Ponta Delgada|FCO Rome|CIA Rome|MXP Milan|LIN Milan|BGY Bergame|VCE Venise|TSF Trévise|NAP Naples|FLR Florence|PSA Pise|BLQ Bologne|TRN Turin|VRN Vérone|CTA Catane|PMO Palerme|BRI Bari|BDS Brindisi|CAG Cagliari|OLB Olbia|AHO Alghero|MLA Malte|ATH Athènes|JTR Santorin|JMK Mykonos|HER Héraklion|CHQ La Canée|RHO Rhodes|CFU Corfou|SKG Thessalonique|KGS Kos|ZTH Zante|IST Istanbul|SAW Istanbul|AYT Antalya|ADB Izmir|DLM Dalaman|BJV Bodrum|BER Berlin|MUC Munich|FRA Francfort|DUS Düsseldorf|HAM Hambourg|CGN Cologne|STR Stuttgart|VIE Vienne|SZG Salzbourg|INN Innsbruck|PRG Prague|BUD Budapest|WAW Varsovie|KRK Cracovie|GDN Gdansk|CPH Copenhague|ARN Stockholm|GOT Göteborg|OSL Oslo|BGO Bergen|TOS Tromsø|HEL Helsinki|RVN Rovaniemi|KEF Reykjavik|RIX Riga|TLL Tallinn|VNO Vilnius|DBV Dubrovnik|SPU Split|ZAD Zadar|PUY Pula|ZAG Zagreb|LJU Ljubljana|OTP Bucarest|SOF Sofia|TIA Tirana|TGD Podgorica|TIV Tivat|BEG Belgrade|SKP Skopje|LCA Larnaca|PFO Paphos|RAK Marrakech|CMN Casablanca|AGA Agadir|FEZ Fès|RBA Rabat|TNG Tanger|ESU Essaouira|OUD Oujda|TUN Tunis|DJE Djerba|MIR Monastir|NBE Enfidha|ALG Alger|ORN Oran|CAI Le Caire|HRG Hurghada|SSH Charm el-Cheikh|RMF Marsa Alam|LXR Louxor|ASW Assouan|TLV Tel Aviv|AMM Amman|AQJ Aqaba|DXB Dubaï|DOH Doha|AUH Abu Dhabi|MCT Mascate|JFK New York|EWR New York|LGA New York|BOS Boston|IAD Washington|MIA Miami|MCO Orlando|LAX Los Angeles|SFO San Francisco|LAS Las Vegas|SEA Seattle|ORD Chicago|ATL Atlanta|DFW Dallas|YUL Montréal|YYZ Toronto|YVR Vancouver|YQB Québec|CUN Cancún|MEX Mexico|PTP Pointe-à-Pitre|FDF Fort-de-France|RUN La Réunion|CAY Cayenne|PPT Papeete|NOU Nouméa|NRT Tokyo|HND Tokyo|KIX Osaka|ICN Séoul|PEK Pékin|PVG Shanghai|HKG Hong Kong|TPE Taipei|BKK Bangkok|HKT Phuket|CNX Chiang Mai|USM Koh Samui|SGN Hô Chi Minh-Ville|HAN Hanoï|DAD Da Nang|REP Siem Reap|PNH Phnom Penh|DPS Bali|CGK Jakarta|SIN Singapour|KUL Kuala Lumpur|MNL Manille|DEL Delhi|BOM Bombay|GOI Goa|CMB Colombo|MLE Malé|MRU Maurice|SEZ Seychelles|SYD Sydney|MEL Melbourne|AKL Auckland|GRU São Paulo|GIG Rio de Janeiro|EZE Buenos Aires|LIM Lima|CUZ Cuzco|BOG Bogota|SCL Santiago|SJO San José|HAV La Havane|PUJ Punta Cana|SDQ Saint-Domingue|SID Sal|RAI Praia|BVC Boa Vista|DSS Dakar|ABJ Abidjan|NBO Nairobi|ZNZ Zanzibar|JRO Kilimandjaro|JNB Johannesburg|CPT Le Cap|TNR Antananarivo|NOS Nosy Be').split('|').forEach(x=>{ o[x.slice(0, 3)] = x.slice(4); }); return o; })();
  const AIRL = {EZY:'easyJet', EZS:'easyJet', U2:'easyJet', DS:'easyJet', FR:'Ryanair', RYR:'Ryanair', AF:'Air France', AFR:'Air France', KL:'KLM', LH:'Lufthansa', BA:'British Airways', VY:'Vueling', TO:'Transavia', HV:'Transavia', V7:'Volotea', W6:'Wizz Air', W4:'Wizz Air', IB:'Iberia', UX:'Air Europa', TP:'TAP Air Portugal', AZ:'ITA Airways', LX:'Swiss', SN:'Brussels Airlines', OS:'Austrian', SK:'SAS', AY:'Finnair', DY:'Norwegian', D8:'Norwegian', EI:'Aer Lingus', TK:'Turkish Airlines', PC:'Pegasus', EK:'Emirates', QR:'Qatar Airways', EY:'Etihad', SE:'XL Airways', SS:'Corsair', TX:'Air Caraïbes', BF:'French Bee', A5:'HOP!', XK:'Air Corsica', DL:'Delta', UA:'United', AA:'American Airlines', AC:'Air Canada', TS:'Air Transat', AT:'Royal Air Maroc', TU:'Tunisair', MS:'EgyptAir', LY:'El Al', BT:'airBaltic', FI:'Icelandair', LO:'LOT', OU:'Croatia Airlines', A3:'Aegean', JU:'Air Serbia', X3:'TUIfly', BY:'TUI', LS:'Jet2', ZB:'Air Albania', QS:'Smartwings'};
  const BP_STOP = new Set('MR MRS MS MME MLE THE AND FOR NOM BDG BAG SEQ PNR REF NON OUI YES DEP ARR ETA ETD GMT UTC VIA TER ZONE GATE SEAT DATE FROM TO JAN FEB MAR APR MAY JUN JUL AUG SEP SEPT OCT NOV DEC JANV FEV FEVR MARS AVR MAI JUIN JUIL AOUT DEC CHD INF ADT ECO EUR USD CHF GBP'.split(' '));
  function bpCode(tok){   // code d’aéroport, même mal lu (« NITE » pour « NTE »)
    tok = String(tok || '').toUpperCase().replace(/[^A-Z]/g, ''); if(BP_STOP.has(tok)) return '';
    if(tok.length === 3 && IATA[tok]) return tok;
    if(tok.length === 4) for(let i = 0; i < 4; i++){ const t = tok.slice(0, i) + tok.slice(i + 1); if(IATA[t]) return t; }
    return tok.length === 3 ? tok : '';
  }
  // barre d’état du téléphone en haut de la capture (« 08:24 … 100 ») : ce n’est pas l’heure du trajet
  const stripStatus = T => { const L = String(T || '').split('\n'); let k = 0;
    while(k < Math.min(3, L.length) && (!L[k].trim() || /^\W*\d{1,2}[:.h]\d{2}\b[^A-Za-zÀ-ÿ]{0,25}$/.test(L[k].trim()) || (/^\W*\d{1,2}[:.h]\d{2}\b/.test(L[k].trim()) && L[k].trim().length < 32 && !/\p{L}{4,}/u.test(L[k])) || /^[^A-Za-zÀ-ÿ0-9]{0,6}(\d{1,3}\s?%?)?[^A-Za-zÀ-ÿ0-9]{0,6}$/.test(L[k].trim()))) k++;
    return L.slice(k).join('\n'); };
  function boardingParse(T){
    let L = cfPre(stripStatus(T)).split('\n').map(l=>l.trim()).filter(Boolean);
    const up = L.map(l=>l.toUpperCase());
    // deux codes d’aéroport côte à côte (ou sur deux lignes), connus de préférence
    let from = '', to = '', ci = -1;
    for(let i = 0; i < up.length && !to; i++){
      const toks = up[i].split(/[\s→>✈\-–—]+/).filter(Boolean), cs = toks.map(bpCode).filter(Boolean);
      const known = cs.filter(c=>IATA[c]);
      if(toks.length <= 4 && cs.length >= 2 && (known.length >= 1)){ from = cs[0]; to = cs[1]; ci = i; }
    }
    if(!from){ for(let i = 0; i + 1 < up.length && !to; i++){ const a = bpCode(up[i]), b = bpCode(up[i + 1]); if(a && b && IATA[a] && IATA[b] && up[i].length <= 5 && up[i+1].length <= 5){ from = a; to = b; ci = i; } } }
    // dernier recours : les deux premiers codes d’aéroport connus du haut de la carte, dans l’ordre
    if(!from){ const seen = []; for(let i = 0; i < Math.min(up.length, 14) && seen.length < 2; i++) up[i].split(/[^A-Z]+/).forEach(w=>{ const c = w.length === 3 && IATA[w] && !BP_STOP.has(w) ? w : ''; if(c && !seen.includes(c) && seen.length < 2){ seen.push(c); if(ci < 0) ci = i; } });
      if(seen.length === 2){ from = seen[0]; to = seen[1]; } }
    const flightRe = /\b(?:[A-Z]{3}|[A-Z]{2}|[A-Z]\d|\d[A-Z])\s?\d{1,4}\b/;
    const isLbl = re => up.findIndex(l=>re.test(l));
    const fli = isLbl(/\b(FLIGHT|VOL|FLUG|VUELO|VOLO|VOO)\b/);
    let flight = '';
    for(const i of [fli, fli + 1].filter(i=>i >= 0 && i < up.length)){ const m = up[i].replace(/\b(FLIGHT|VOL|FLUG|VUELO|VOLO|VOO|DATE)\b/g, ' ').match(flightRe); if(m && !/^\d{1,2}:\d{2}/.test(m[0])){ flight = m[0].replace(/\s/g, ''); break; } }
    if(!flight){ for(const l of up){ const m = l.match(/\b(?:[A-Z]{3}|[A-Z]{2}|[A-Z]\d|\d[A-Z])\s?\d{2,4}\b/); if(m && !/\d[A-K]$/.test(m[0]) && !BP_STOP.has(m[0].replace(/[\s\d]/g, ''))){ flight = m[0].replace(/\s/g, ''); break; } } }
    const looks = /BOARDING|EMBARQUEMENT|GATE|PORTE|SEAT|SI[EÈ]GE|FLIGHT|\bVOL\b|PASSENGER|PASSAGER|BORDKARTE|TARJETA DE EMBARQUE/.test(up.join(' '));
    if(!(from && to && (flight || looks))) return null;
    // fin de la première carte (une autre carte Wallet peut dépasser en bas de la capture)
    const endAt = (() => { for(let i = Math.max(ci, fli) + 1; i < up.length; i++){ if(i > ci + 1 && up[i] !== up[fli] && /\b(?:[A-Z]{2,3}|[A-Z]\d|\d[A-Z])\d{2,4}\/\d{1,2}[A-ZÉÈÛ]{3}/.test(up[i])) return i; } return up.length; })();
    L = L.slice(0, endAt); const U = up.slice(0, endAt), all = U.join('\n');
    // date : « 08 NOV », « 08NOV », « 8 nov. 2026 », « 08/11/2026 »
    let date = '';
    const dm = all.match(/\b(\d{1,2})\s?([A-ZÉÛ]{3,5})\.?\s?(20\d{2})?\b/g) || [];
    for(const x of dm){ const m = x.match(/(\d{1,2})\s?([A-ZÉÛ]{3,5})\.?\s?(20\d{2})?/); const k = m[2].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); const mo = MOIS_FR[k] || MOIS_FR[k.slice(0, 3)]; if(mo && +m[1] >= 1 && +m[1] <= 31){ date = m[3] ? `${m[3]}-${String(mo).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}` : yearFor(T, mo, +m[1]); break; } }
    if(!date){ const m = all.match(/\b(\d{1,2})[\/.](\d{1,2})[\/.](20\d{2}|\d{2})\b/); if(m){ const y = m[3].length === 2 ? '20' + m[3] : m[3]; date = `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`; } }
    // heures : rangées sous leurs titres (« GATE CLOSES · DEPARTS · … » puis « 12:15 · 12:45 · … »)
    let dep = '', arr = '', board = '';
    for(let i = 1; i < U.length && !dep; i++){
      const tm = U[i].match(/\b\d{1,2}:\d{2}\b/g); if(!tm) continue;
      const LBL = /GATE CLOSES|GATE CLOSE|BOARDING|BOARDS|EMBARQUEMENT|FIN D.EMBARQUEMENT|PORTE FERME\w*|DEPARTS|DEPARTURE|D[ÉE]PART|ABFLUG|SALIDA|\bDEP\b|ARRIVES|ARRIVAL|ARRIV[ÉE]E|ANKUNFT|LLEGADA|\bARR\b/g;
      const kindOf = w => /GATE|BOARD|EMBARQ|PORTE/.test(w) ? 'b' : /ARR|ANK|LLEG/.test(w) ? 'a' : 'd';
      if(LBL.test(U[i])){ LBL.lastIndex = 0;   // titres et heures sur la même ligne : chaque heure prend le titre qui la précède
        const labs = []; U[i].replace(LBL, (w, p)=>{ labs.push([p, kindOf(w)]); return w; }); let k = 0;
        U[i].replace(/\b\d{1,2}:\d{2}\b/g, (t, p)=>{ const l = labs.filter(x=>x[0] < p).pop(); const kd = l ? l[1] : 'd'; if(kd === 'd' && !dep) dep = t; else if(kd === 'a' && !arr) arr = t; else if(kd === 'b' && !board) board = t; return t; });
        if(dep) break; continue; }
      LBL.lastIndex = 0;
      const lab = U[i - 1], kinds = [];
      lab.replace(/GATE CLOSES|GATE CLOSE|BOARDING|BOARDS|EMBARQUEMENT|FIN D.EMBARQUEMENT|PORTE FERME\w*|DEPARTS|DEPARTURE|D[ÉE]PART|ABFLUG|SALIDA|\bDEP\b|ARRIVES|ARRIVAL|ARRIV[ÉE]E|ANKUNFT|LLEGADA|\bARR\b/g, (w, p)=>{ kinds.push([p, /GATE|BOARD|EMBARQ|PORTE/.test(w) ? 'b' : /ARR|ANK|LLEG/.test(w) ? 'a' : 'd']); return w; });
      kinds.sort((x, y)=>x[0] - y[0]);
      if(kinds.length){ tm.forEach((t, k)=>{ const kd = (kinds[k] || [])[1]; if(kd === 'd' && !dep) dep = t; else if(kd === 'a' && !arr) arr = t; else if(kd === 'b' && !board) board = t; }); }
      else if(tm.length >= 2){ dep = tm[0]; arr = tm[1]; } else dep = tm[0];
    }
    if(!dep){ const tm = all.match(/\b\d{1,2}:\d{2}\b/g) || []; if(tm.length) dep = tm[tm.length > 1 ? 1 : 0]; }
    const seatL = U.findIndex(l=>/\b(SEAT|SI[EÈ]GE|PLACE|SITZ|ASIENTO|POSTO)\b/.test(l));
    let seat = ''; for(const i of [seatL, seatL + 1].filter(i=>i >= 0 && i < U.length)){ const m = U[i].match(/\b\d{1,2}[A-K]\b/); if(m){ seat = m[0]; break; } }
    let ref = ''; { const i = U.findIndex(l=>/\b(BOOKING|PNR|R[ÉE]SERVATION|CONFIRMATION|BUCHUNG|LOCALIZADOR|DOSSIER)\b/.test(l));
      const pick = l => (l.match(/\b(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{5,8}\b/g) || []).find(x=>x !== flight && !/^\d{1,2}[A-K]$/.test(x));
      if(i >= 0) ref = pick(U[i].replace(/.*?(BOOKING|PNR|R[ÉE]SERVATION|CONFIRMATION|BUCHUNG|LOCALIZADOR|DOSSIER)\S*/, '')) || pick(U[i + 1] || '') || '';
      if(!ref) for(let k = U.length - 1; k > ci; k--){ const x = pick(U[k]); if(x && x.replace(/\s/g, '') !== flight){ ref = x; break; } } }
    const pi = U.findIndex(l=>/\b(PASSENGER|PASSAGER|NAME|NOM|PASAJERO|PASSAGIER)\b/.test(l));
    const pax = pi >= 0 && U[pi + 1] ? L[pi + 1].replace(/\b\d{1,2}[A-K]\b/, '').trim() : '';
    const pre = (flight.match(/^[A-Z]{3}|^[A-Z0-9]{2}/) || [''])[0], al = AIRL[pre] || AIRL[pre.slice(0, 2)] || (all.match(/EASYJET|RYANAIR|AIR FRANCE|VUELING|TRANSAVIA|VOLOTEA|WIZZ|LUFTHANSA|KLM|IBERIA|BRITISH AIRWAYS|SWISS|TAP|CORSAIR|AIR CARA[IÏ]BES|FRENCH BEE/) || [''])[0].toLowerCase().replace(/(^|\s)\w/g, c=>c.toUpperCase()).replace('Easyjet', 'easyJet');
    const city = c => IATA[c] ? IATA[c] + ' (' + c + ')' : c;
    return {from:city(from), to:city(to), date, heure:dep, heureArr:arr, board, flight, compagnie:[al, flight].filter(Boolean).join(' '), seat, ref, pax};
  }

  /* ---------- 🎫 Carte Apple Wallet (.pkpass) : billet d’avion, de train, de bus, de bateau, d’événement ---------- */
  async function impPass(file){
    try {
      impSay('🎫 Lecture de la carte Wallet…');
      const z = await zipRead(file), get = async n => { const v = z[n]; return typeof v === 'function' ? await v() : v; };
      const raw = await get('pass.json'); if(!raw) throw new Error('ce fichier n’est pas une carte Wallet');
      const P = JSON.parse(new TextDecoder().decode(raw).replace(/^\uFEFF/, ''));
      // textes traduits du billet (fr, sinon en) : « label » et « value » peuvent être des clés
      let loc = {}; for(const lg of ['fr', 'en']){ const b = await get(lg + '.lproj/pass.strings'); if(b){ const tx = (b[0] === 0xFF || b[0] === 0xFE) ? new TextDecoder('utf-16le').decode(b) : new TextDecoder().decode(b);
        tx.replace(/"((?:[^"\\]|\\.)*)"\s*=\s*"((?:[^"\\]|\\.)*)"\s*;/g, (_, k, v) => { if(!(k in loc)) loc[k] = v.replace(/\\n/g, '\n').replace(/\\"/g, '"'); return ''; }); } }
      const L = x => x == null ? '' : String(loc[x] != null ? loc[x] : x);
      const kind = ['boardingPass', 'eventTicket', 'coupon', 'storeCard', 'generic'].find(k=>P[k]) || 'generic', S = P[kind] || {};
      const F = [...(S.headerFields||[]), ...(S.primaryFields||[]), ...(S.secondaryFields||[]), ...(S.auxiliaryFields||[]), ...(S.backFields||[])]
        .map(f=>({k:String(f.key||'').toLowerCase(), l:L(f.label), v:L(f.value), d:f.dateStyle || f.timeStyle}));
      const fv = re => { const f = F.find(x=>re.test(x.k) || re.test(x.l)); return f ? f.v : ''; };
      const iso = v => { const m = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(String(v||'')); return m ? {d:m[1], t:m[2] || ''} : null; };
      // la date locale du départ : champ daté du billet, sinon « relevantDate »
      const dt = (F.map(f=>f.d ? iso(f.v) : null).find(Boolean)) || iso(P.relevantDate) || iso(P.expirationDate) || {d:'', t:''};
      const ref = fv(/conf|pnr|book|record|r[ée]f|reserv|dossier|locator/i), seat = fv(/seat|si[eè]ge|place/i), gate = fv(/gate|porte/i), cl = fv(/class|classe|cabin|voiture|coach/i);
      const note = ['Carte Wallet : ' + (P.organizationName || ''), seat && 'Place : ' + seat, cl && 'Classe / voiture : ' + cl, gate && 'Porte : ' + gate,
        ...F.filter(f=>f.v && f.v.length < 80 && !/seat|gate|conf|pnr|book|class/i.test(f.k)).slice(0, 8).map(f=>(f.l ? f.l + ' : ' : '') + f.v)].filter(Boolean).join('\n');
      // le code-barres du billet (QR) devient une image du billet, lisible hors ligne dans la fiche du jour
      const bc = (P.barcodes && P.barcodes[0]) || P.barcode; let pj;
      if(bc && bc.message && /QR/i.test(bc.format || '')){
        try { const id = 'pj' + uid(), svg = qrSVG(bc.message), img = new Image();
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg width="900" height="900" '));
          await img.decode(); const c = document.createElement('canvas'); c.width = c.height = 900; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 900, 900); g.drawImage(img, 0, 0, 900, 900);
          await storePhoto(await new Promise(r => c.toBlob(r, 'image/png')), id); uploadQueue(); pj = [{id, t:'img', n:'Billet Wallet'}]; } catch(e){}
      }
      const base = {type:'item', trip:M.trip, date:dt.d, ref, statut:'booked', note: note + (bc && bc.message && !pj ? '\nCode du billet : ' + bc.message : '')};
      let d;
      if(kind === 'boardingPass'){
        const tt = String(S.transitType || ''), mode = /Air/.test(tt) ? 'Avion' : /Bus/.test(tt) ? 'Bus' : /Boat/.test(tt) ? 'Bateau' : 'Train';
        const pf = S.primaryFields || [], o = pf[0] || {}, a = pf[1] || {};
        const place = f => { const l = L(f.label), v = L(f.value); return l && v && l !== v && !/^(from|to|de|à|vers|départ|arrivée|origin|destination)$/i.test(l) ? l + ' (' + v + ')' : v || l; };
        const from = place(o), to = place(a), flight = fv(/flight|vol|train|bus|num|service/i);
        d = Object.assign(base, {cat:'transport', mode, from, to, titre: from && to ? from + ' → ' + to : (mode === 'Avion' ? 'Vol' : 'Trajet'),
          heureDep: dt.t || fv(/depart|boarding|embarq|départ/i).match(/\d{1,2}:\d{2}/)?.[0] || '', heureArr: (fv(/arriv/i).match(/\d{1,2}:\d{2}/) || [''])[0],
          compagnie: [P.organizationName, flight].filter(Boolean).join(' ')});
      } else if(kind === 'eventTicket'){
        const ev = fv(/event|[ée]v[ée]nement|show|spectacle|match/i) || P.description || P.logoText || P.organizationName || 'Événement';
        d = Object.assign(base, {cat:'activite', titre: ev, heure: dt.t, adresse: fv(/venue|lieu|location|adresse|salle|stade/i), lat: P.locations && P.locations[0] ? P.locations[0].latitude : undefined, lng: P.locations && P.locations[0] ? P.locations[0].longitude : undefined});
      } else {
        // carte « générique » : le texte passe par la lecture habituelle des réservations (hôtel, location…)
        const txt = [P.organizationName, P.description, P.logoText, dt.d && 'Date : ' + dt.d, ...F.map(f=>(f.l ? f.l + ' : ' : '') + f.v)].filter(Boolean).join('\n');
        closeSheet(true); cfImport(txt, pj); return;
      }
      if(pj) d.pj = pj;
      closeSheet(true); edit(d); toast('🎫 Fiche créée depuis Wallet — vérifie puis Enregistrer');
    } catch(e){ impSay('⚠️ ' + (e.message || e)); }
  }
  function impPickPass(){ tlPickFile(isIOSDev ? '' : '.pkpass,application/vnd.apple.pkpass,application/octet-stream', f => impPass(f)); }
  function impPickShot(){ tlPickFile('image/*', f => impFile(f)); }
  function impPickCam(){ tlPickFile('image/*', f => impFile(f), true); }
  async function impFile(file, extraText){
    const isPdf = /pdf/i.test(file.type) || /\.pdf$/i.test(file.name||''), isImg = /^image\//i.test(file.type) || /\.(png|jpe?g|heic|heif|webp)$/i.test(file.name||'');
    if(/\.pkpass$/i.test(file.name||'') || /pkpass/i.test(file.type)) return impPass(file);
    if(!isPdf && !isImg){ impSay('⚠️ Choisis le PDF, la capture d’écran ou la carte Wallet (.pkpass) de la réservation.'); return; }
    try {
      impSay(isPdf ? '📄 Lecture du PDF…' : '🔍 Lecture de la capture… (la 1re fois l’outil se télécharge, ~15 s)');
      const txt = (isPdf ? await pdfText(file) : cfOcrFix(await ocrText(file))) + (extraText ? '\n' + extraText : '');
      if(txt.replace(/\s/g,'').length < 30) throw new Error(isPdf ? 'ce PDF ne contient pas de texte lisible (c’est peut-être une image) : essaie une capture d’écran' : 'aucun texte reconnu');
      const id = 'pj' + uid();
      if(isPdf) await IDB.put({id, blob:file, up:1}); else { await storePhoto(file, id); uploadQueue(); }
      closeSheet(true);
      const pj = [{id, t: isPdf ? 'pdf' : 'img', n: (file.name || (isPdf ? 'reservation' : 'capture')).replace(/\.[a-z0-9]+$/i,'').slice(0,40)}];
      // carte d’embarquement (capture Wallet ou appli de la compagnie) : lecture dédiée, la capture devient le billet de la fiche
      const many = isPdf ? [] : multiCards(txt);
      if(many.length >= 2){ const ref = cfRef(txt, pj);
        cfPending = many.map(bp=>({type:'item', trip:M.trip, cat:'transport', mode:'Avion', from:bp.from, to:bp.to, titre:bp.from + ' → ' + bp.to, date:bp.date, heureDep:bp.heure, heureArr:bp.heureArr, compagnie:bp.compagnie, ref:bp.ref || ref, statut:'booked', pj:clone(pj),
          note:[bp.seat && 'Place : ' + bp.seat, bp.board && 'Embarquement / fermeture de la porte : ' + bp.board, bp.pax && 'Passager : ' + bp.pax].filter(Boolean).join('\n')}));
        impCtx = {raw:txt, pj}; cfSegSheet(); return; }
      const bp = isPdf ? null : boardingParse(txt);
      if(!isPdf && !bp){ closeSheet(true); cfImport(stripStatus(txt), pj); return; }
      if(bp){ pj[0].n = 'Carte d’embarquement';
        edit({type:'item', trip:M.trip, cat:'transport', mode:'Avion', from:bp.from, to:bp.to, titre:bp.from + ' → ' + bp.to, date:bp.date, heureDep:bp.heure, heureArr:bp.heureArr, compagnie:bp.compagnie, ref:bp.ref, statut:'booked', pj,
          note:[bp.seat && 'Place : ' + bp.seat, bp.board && 'Embarquement / fermeture de la porte : ' + bp.board, bp.pax && 'Passager : ' + bp.pax].filter(Boolean).join('\n')});
        toast('✈️ Carte d’embarquement lue — vérifie puis Enregistrer'); return; }
      cfImport(txt, pj);
    } catch(e){ impSay('⚠️ ' + e.message); }
  }
  // Prétraitement commun (espaces, heures « 14 : 00 », montants « 144 , 30 »)
  const cfPre = T => String(T||'').replace(/\u00a0|\u202f/g,' ').replace(/[ \t]+/g,' ').replace(/(\d)\s*:\s*(\d{2})\b/g,'$1:$2').replace(/(\d)\s+([.,])\s*(\d)/g,'$1$2$3');
  function yearFor(T, mo, d){
    const today = new Date(isoToday() + 'T12:00:00'), ys = [...T.matchAll(/\b(20\d{2})\b/g)].map(m=>+m[1]).filter(y=>y >= today.getFullYear());
    let y = ys.length ? Math.min(...ys) : today.getFullYear();
    if(new Date(y, mo-1, d) < today && !ys.length) y++;
    return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  function bookingParse(T){
    const L = T.split('\n').map(l=>l.trim()).filter(Boolean), r = {kind:'hotel'};
    const ref = T.match(/NUM[ÉE]RO DE CONFIRMATION\s*:\s*([\d.\s]{6,24})/i); if(ref) r.ref = ref[1].replace(/\D/g,'');
    const pin = T.match(/CODE (?:CONFIDENTIEL|PIN)\s*:\s*(\d{3,8})/i);
    const ia = L.findIndex(l=>/^Adresse\s*:/i.test(l)); if(ia > 0) r.nom = L[ia-1].replace(/^(?:h[oô]tel|[ée]tablissement|propri[ée]t[ée]|property)\s*:\s*/i,'');
    if(ia >= 0){ const it = L.findIndex((l,i)=>i>ia && /^(?:T[ée]l[ée]phone|arriv|d[ée]part|check|\d+ nuit|num[ée]ro|total|prix|montant|chambre)/i.test(l)); r.adresse = L.slice(ia, it > ia ? it : ia+4).join(' ').replace(/^Adresse\s*:\s*/i,'').replace(/\s+/g,' ').replace(/(\p{L}) ([^\x00-\x7F]) (\p{L})/gu,'$1$2$3').replace(/(^|\s)([^\x00-\x7F]) (\p{Ll})/gu,'$1$2$3').replace(/\s*:\s*/g,':').replace(/NO:/g,'No ').trim(); }
    const tel = T.match(/T[ée]l[ée]phone\s*:\s*(\+?[\d][\d\s().-]{6,20}\d)/i); if(tel) r.tel = tel[1].trim();
    const gps = T.match(/N\s*0*(\d{1,2})°\s*([\d.]+)\s*,?\s*([EW])\s*0*(\d{1,3})°\s*([\d.]+)/);
    if(gps){ r.lat = +(+gps[1] + +gps[2]/60).toFixed(5); r.lng = +((+gps[4] + +gps[5]/60) * (gps[3]==='W' ? -1 : 1)).toFixed(5); }
    const n = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const blk = lab => { const i = L.findIndex(l=>n(l).startsWith(lab)); if(i < 0) return null; const sl = L.slice(i, i+7).join(' ');
      const m = sl.match(/(\d{1,2})\s+([A-Za-zÀ-ÿ]+)/); const tm = [...sl.matchAll(/(\d{1,2}:\d{2})/g)].map(x=>x[1]);
      return m && MOIS_FR[n(m[2]).replace(/\./g,'')] ? {d: yearFor(T, MOIS_FR[n(m[2])], +m[1]), t: tm} : null; };
    const a = blk('arrivee'), d = blk('depart');
    if(a){ r.date = a.d; r.heure = a.t[0] || ''; } if(d) r.dateFin = d.d;
    const am = [...T.matchAll(/€ ?(\d[\d .]*(?:,\d{1,2})?)|(\d[\d .]*,\d{2}) ?€/g)].map(m=>parseFloat((m[1]||m[2]).replace(/\s|\.(?=\d{3})/g,'').replace(',', '.'))).filter(x=>!isNaN(x));
    if(am.length) r.prix = String(Math.max(...am));
    if(r.adresse){ const parts = r.adresse.split(','); if(parts.length >= 2) r.ville = parts[parts.length-2].replace(/\b\d{3,}\b/g,'').trim(); }
    r.note = 'Booking.com' + (pin ? ' · code confidentiel ' + pin[1] : '');
    return r;
  }
  function bookingParse2(T){
    const L = T.split('\n').map(l=>l.trim()).filter(Boolean), r = {kind:'hotel'};
    const n = x => x.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\./g,'');
    const g = (re, i) => { const m = T.match(re); return m ? m[i||1] : ''; };
    r.ref = g(/Confirmation\s*:\s*(\d{6,12})/i);
    const pin = g(/Code confidentiel\s*:\s*(\d{3,8})/i);
    r.nom = g(/L['’]\s*[ée]tablissement\s+(.+?)\s+vous attend/i).trim();
    if(!r.nom){ const dup = L.find((l,i)=>l.length < 70 && /^[A-ZÀ-Ý]/.test(l) && L.indexOf(l) !== i && !/:/.test(l)); if(dup) r.nom = dup; }
    r.ville = g(/r[ée]servation [àa]\s+(.+?)\s+est\s+confirm/i).trim();
    const dt = lab => { const m = T.match(new RegExp(lab + '\\s+\\p{L}+\\.?\\s+(\\d{1,2})\\s+(\\p{L}+)\\.?\\s+(\\d{4})(?:\\s*\\((\\d{1,2})\\s*[h:]\\s*(\\d{2})?)?', 'iu'));
      if(!m) return null; const mo = MOIS_FR[n(m[2])]; if(!mo) return null;
      return {d: `${m[3]}-${String(mo).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`, t: m[4] ? m[4].padStart(2,'0') + ':' + (m[5] || '00') : ''}; };
    const a = dt('Arriv[ée]e'), d = dt('D[ée]part');
    if(a){ r.date = a.d; r.heure = a.t; } if(d) r.dateFin = d.d;
    const ia = L.findIndex(l=>/^Situation g[ée]ographique/i.test(l));
    if(ia >= 0){ const parts = [L[ia].replace(/^Situation g[ée]ographique\s*/i,'')];
      for(let k=ia+1; k<Math.min(L.length, ia+3); k++){ if(/^(?:T[ée]l[ée]phone|Autre|Arriv|D[ée]part|Votre|Vous|Frais|Conditions)/i.test(L[k])) break; parts.push(L[k]); }
      r.adresse = parts.join(' ').replace(/\s+/g,' ').replace(/\s*º\s*/g,'º ').replace(/\s+,/g,',').trim(); }
    r.tel = g(/T[ée]l[ée]phone\s*(\+?\d[\d\s().-]{6,20}\d)/i).trim();
    const pr = g(/Montant total\s*€\s*(\d[\d .]*(?:,\d{1,2})?)/i); if(pr) r.prix = pr.replace(/\s|\.(?=\d{3})/g,'').replace(',', '.');
    const room = g(/Votre r[ée]servation\s+(\d+ nuits?,?[^\n]{0,60})/i).trim();
    const free = g(/annuler GRATUITEMENT jusqu['’]au\s+(\d{1,2} \p{L}+ \d{4})/iu);
    r.note = ['Booking.com', pin ? 'code confidentiel ' + pin : '', room, free ? 'annulation gratuite jusqu’au ' + free : ''].filter(Boolean).join(' · ');
    return r;
  }
  /* 🏨 Écran de réservation d’hébergement (appli Booking, Airbnb, Hotels.com, Expedia, mail…) :
     nom au-dessus des dates, adresse sous « Adresse … », heure d’arrivée « à partir de 14:00 », téléphone « Appeler le … » */
  function hotelFix(T, r){
    const L = T.split('\n').map(l=>l.trim()).filter(Boolean);
    const stop = l => /voir plus|see more|paiement|payment|carte|card|modifier|change|itin[ée]raire|directions|conditions|contacter|contact|message|appeler|call|booking\.com|airbnb|expedia|hotels\.com|r[ée]servation|booking|confirm/i.test(l);
    const noise = l => (l.match(/\p{L}/gu) || []).length < 4;
    const nz = x => x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\./g,'');
    const dms = l => [...l.matchAll(/\b(\d{1,2})\s+([A-Za-zÀ-ÿ]{3,10})\.?/g)].map(m=>({d:+m[1], mo:MOIS_FR[nz(m[2])]})).filter(x=>x.mo);
    const hi = L.findIndex(l=>/arriv|check[- ]?in/i.test(l) && /d[ée]part|check[- ]?out/i.test(l));   // en-tête de deux colonnes
    if(hi >= 0){
      if(!r.date || !r.dateFin){ const dl = L.slice(hi + 1, hi + 4).find(l=>dms(l).length >= 2); if(dl){ const [a, b] = dms(dl); r.date = r.date || yearFor(T, a.mo, a.d); r.dateFin = r.dateFin || yearFor(T, b.mo, b.d); if(r.dateFin < r.date) r.dateFin = yearFor(T, b.mo, b.d).replace(/^\d{4}/, y=>+y + 1); } }
      const tl = L.slice(hi + 1, hi + 5).find(l=>(l.match(/\b\d{1,2}[:h]\d{2}\b/g) || []).length >= 2);
      if(tl){ const tt = tl.match(/\b\d{1,2}[:h]\d{2}\b/g).map(x=>x.replace('h', ':').padStart(5, '0')); r.heure = tt[0]; r.note = [r.note && r.note !== 'Créée depuis un document importé' ? r.note : '', 'Départ avant ' + tt[1]].filter(Boolean).join(' · '); r._hcol = 1; }
    }
    // dates du séjour (« ven. 6 nov. 2026 - dim. 8 nov. 2026 », « 6–8 nov. », « Arrivée … »)
    let di = L.findIndex(l=>cfDates(l).length && (/\s[-–—]\s|\bau\b|\bto\b|→/.test(l) || /arriv|check/i.test(l)));
    if(di < 0) di = hi;
    if(di > 0){ const nm = [];
      for(let k = di - 1; k >= Math.max(0, di - 5); k--){ const l = L[k]; if(stop(l)) break; if(noise(l) || /^\d/.test(l)) continue; nm.unshift(l); if(nm.length >= 2) break; }
      const n = nm.join(' ').replace(/\s+/g,' ').trim(); if(n.length >= 4 && n.length <= 90) r.nom = n; }
    // adresse
    const ai = L.findIndex(l=>/^\W{0,3}\s*(?:adresse|address|emplacement|location)\b/i.test(l));
    if(ai >= 0){ const first = L[ai].replace(/^.*?\b(?:adresse|address|emplacement|location)\b(?:\s+(?:de\s+l['’ ]?\s*[ée]tablissement|du logement|de la propri[ée]t[ée]|of the property|de l['’ ]?h[ôo]tel))?\s*:?\s*/i,'').trim(), parts = first ? [first] : [];
      for(let k = ai + 1; k < Math.min(L.length, ai + 4); k++){ if(stop(L[k]) || /t[ée]l[ée]phone|phone|^\W*(?:arriv|d[ée]part|check)/i.test(L[k])) break; parts.push(L[k]);
        if(/\b(?:france|belgique|belgium|suisse|switzerland|schweiz|espa[ñn]a|spain|espagne|ital(?:ia|y|ie)|portugal|deutschland|germany|allemagne|royaume-uni|united kingdom|uk|usa|united states|[ée]tats-unis|nederland|netherlands|pays-bas|gr[èe]ce|greece|malta|malte|[ée]gypte|egypt)\b/i.test(L[k])) break; }
      const ad = parts.join(' ').split(/\s+/).filter(w=>!/^[^\p{L}\d]+$/u.test(w) && !/^[^(]*\)$/.test(w)).join(' ').replace(/\s+,/g,',').trim();
      if(/\d/.test(ad) && ad.length >= 8) r.adresse = ad; }
    // ville : « 01280 Prévessin-Moëns » dans l’adresse
    const cv = (r.adresse || '').match(/\b\d{4,5}(?:-\d{3,4})?\s+([\p{L}][\p{L}'’ -]{1,40}?)(?:,|$|\s+(?:France|Belgique|Suisse|Cedex))/u); if(cv) r.ville = cv[1].trim();
    // heures d'arrivée / de départ
    const hm = re => { const m = T.match(re); return m ? m[1].replace('h', ':').replace(/^(\d):/, '0$1:') : ''; };
    const hin = hm(/(?:arriv[ée]e|check[- ]?in|enregistrement)[^\n]{0,30}?\b(\d{1,2}[:h]\d{2})\b/i), hout = hm(/(?:d[ée]part|check[- ]?out|lib[ée]ration)[^\n]{0,30}?\b(\d{1,2}[:h]\d{2})\b/i);
    if(hin && !r._hcol) r.heure = hin;
    if(hout && !r._hcol) r.note = [r.note && r.note !== 'Créée depuis un document importé' ? r.note : '', 'Départ avant ' + hout].filter(Boolean).join(' · ');
    // téléphone
    const tl = T.match(/(?:t[ée]l[ée]phone|t[ée]l\.?|appeler(?:\s+le)?|call|phone)\s*:?\s*(\+?\d[\d\s.()-]{7,18}\d)/i) || T.match(/(\+\d{2}[\d\s.]{8,14}\d)/);
    if(tl) r.tel = tl[1].replace(/\s+/g, ' ').trim();
    delete r._hcol; return r;
  }
