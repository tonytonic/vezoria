/* Vezoria — code de l’appli, partie 5/8 (chargées dans l’ordre par index.html, même portée globale) */

  // 🚆 billet affiché dans une appli (SNCF Connect, Trainline, Ouigo, FlixBus…) : « 10:04 Quimper » … « 14:52 Paris Montparnasse »
  function tripFix(T, r){
    const L = T.split('\n').map(l=>l.trim()).filter(Boolean);
    const st = L.map(l=>l.match(/^(\d{1,2}[:h]\d{2})\s+([A-ZÀ-Ý][\p{L}'’ .()-]{1,45})$/u)).filter(Boolean).filter(m=>!/^(?:voiture|place|coach|seat|quai|platform|dur[ée]e|duration)/i.test(m[2]));
    if(st.length >= 2){ const a = st[0], b = st[st.length - 1];
      if(!r.from) r.from = a[2].trim(); if(!r.to) r.to = b[2].trim();
      if(!r.heure) r.heure = a[1].replace('h', ':').padStart(5, '0'); if(!r.heureArr) r.heureArr = b[1].replace('h', ':').padStart(5, '0'); }
    const tn = T.match(/\b(TGV(?: INOUI)?|OUIGO|TER|Intercit[ée]s|Eurostar|Thalys|Lyria|ICE|Frecciarossa|Italo|AVE|FlixBus|BlaBlaCar Bus)\s*(?:n°\s*)?(\d{2,5})\b/i);
    if(tn && (!r.compagnie || !/\d/.test(r.compagnie))) r.compagnie = (tn[1] + ' ' + tn[2]).trim();
    const seat = T.match(/voiture\s*(\d{1,3})[^\n]{0,12}?place\s*(\d{1,3})/i) || T.match(/coach\s*(\d{1,3})[^\n]{0,12}?seat\s*(\d{1,3}[A-Z]?)/i);
    if(seat) r.note = [r.note, 'Voiture ' + seat[1] + ' · place ' + seat[2]].filter(Boolean).join(' · ');
    return r;
  }
  function cfDraft(raw, force){
    const T = cfPre(raw);
    const r = ((!force || force === 'hotel') && /NUM[ÉE]RO DE CONFIRMATION/i.test(T) && /ARRIV[ÉE]E/i.test(T)) ? bookingParse(T)
      : ((!force || force === 'hotel') && /Confirmation\s*:\s*\d{6,}/i.test(T) && /Arriv[ée]e\s+\p{L}+\.?\s+\d{1,2}\s+\p{L}+\.?\s+\d{4}/iu.test(T) && /D[ée]part\s+\p{L}+\.?\s+\d{1,2}\s+\p{L}+/iu.test(T)) ? bookingParse2(T) : cfParse(T, force);
    if(r.kind === 'hotel' && !/NUM[ÉE]RO DE CONFIRMATION/i.test(T)) hotelFix(T, r);
    if(/^(?:train|bus|ferry|vol)$/.test(r.kind || '')) tripFix(T, r);
    if(r.kind === 'hotel') return {cat:'hotel', type:'item', trip:M.trip, titre: r.ville || cityOf(r.adresse ? r.adresse.split(',').slice(-2,-1)[0] || '' : '').replace(/\b\d{3,}\b/g,'').trim() || 'Hébergement',
      nom:r.nom||'', adresse:r.adresse||'', tel:r.tel||'', date:r.date||'', dateFin:r.dateFin||'', heure:r.heure||'', ref:r.ref||'', prix:r.prix||'', partage:'grp', statut:'booked', lat:r.lat, lng:r.lng, note:r.note || 'Créée depuis un document importé'};
    if(r.kind === 'autre') return {cat:'activite', type:'item', trip:M.trip, titre: r.titre || (r.compagnie ? 'Activité ' + r.compagnie : 'Visite / activité'), date:r.date||'', heure:r.heure||'', adresse:r.adresse||'', ref:r.ref||'', prix:r.prix||'', statut: r.prix ? 'paid' : 'booked', note:(r.compagnie ? r.compagnie + ' · ' : '') + 'Créée depuis un document importé'};
    const mode = r.kind==='vol' ? 'Avion' : r.kind==='bus' ? 'Bus' : r.kind==='ferry' ? 'Bateau' : 'Train';
    return {cat:'transport', type:'item', trip:M.trip, mode, from:r.from||'', to:r.to||'', titre:(r.from && r.to) ? r.from + ' → ' + r.to : (r.kind==='vol' ? 'Vol' : r.kind==='ferry' ? 'Traversée' : 'Trajet'),
      date:r.date||'', heureDep:r.heure||'', heureArr:r.heureArr||'', compagnie:r.compagnie||'', ref:r.ref||'', prix:r.prix||'', statut: r.prix ? 'paid' : 'booked', note:r.note || 'Créée depuis un document importé'};
  }
  // Partage Android (« Partager → Vezoria ») : le service worker a rangé le fichier ou le texte
  async function shareInbox(){
    if(!/[?&]partage=1/.test(location.search)) return;
    history.replaceState(null, '', location.pathname);
    try {
      const c = await caches.open('share-inbox'), keys = await c.keys(); let file = null, text = '';
      for(const k of keys){ const res = await c.match(k); if(/\/share\/file/.test(k.url)){ const b = await res.blob(); file = new File([b], decodeURIComponent((k.url.split('name=')[1]||'document')), {type:b.type}); } else if(/\/share\/text/.test(k.url)) text = await res.text(); await c.delete(k); }
      if(!trip()){ alert('Crée ou ouvre d’abord un voyage, puis partage à nouveau la réservation.'); return; }
      if(file) impAny(file, text); else if(text) cfImport(text);
    } catch(e){}
  }

  /* ---------- 📖 Journal : choisir les photos ---------- */
  function jrSheet(){
    const t = trip(); if(!t) return;
    const all = souvs().filter(s=>(s.photos||[]).length).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    const off = M.jrOff = M.jrOff || {}, nAll = all.reduce((n,s)=>n+s.photos.length,0), nOn = all.reduce((n,s)=>n+s.photos.filter(p=>!off[p]).length,0);
    openSheet(`<h2>📖 Journal de voyage</h2><div class="v-sum-small" style="margin-bottom:8px">Touche une photo pour l’enlever ou la remettre dans le PDF. <b id="jr-n">${nOn}</b> / ${nAll} photo(s) choisie(s).</div>
      <div class="cv-row" style="gap:6px;margin-bottom:8px"><button type="button" class="v-day-edit" onclick="CV.jrAll(true)">✅ Tout ajouter</button><button type="button" class="v-day-edit" onclick="CV.jrAll(false)">⬜ Tout retirer</button></div>
      <div id="jr-list">${all.map(s=>`<div class="jr-sv"><b>${esc(s.titre||'Souvenir')}</b> <small>${s.date ? fshort(s.date) : ''}</small><div class="jr-grid">${s.photos.map(p=>`<button type="button" class="jr-ph${off[p]?' off':''}" data-p="${esc(p)}" onclick="CV.jrTog(this)"><img data-ph="${esc(p)}.t" alt=""><span>✓</span></button>`).join('')}</div></div>`).join('') || '<div class="v-sum-small">Pas encore de photos dans les souvenirs : le journal contiendra les textes et la carte.</div>'}</div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.pdfJournal()">📖 Créer le PDF</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
    hydrate();
  }
  function jrCount(){ const n = document.querySelectorAll('.jr-ph:not(.off)').length, e = document.getElementById('jr-n'); if(e) e.textContent = n; }
  function jrTog(b){ const p = b.dataset.p; M.jrOff = M.jrOff || {}; if(M.jrOff[p]) delete M.jrOff[p]; else M.jrOff[p] = 1; b.classList.toggle('off', !!M.jrOff[p]); persist(); jrCount(); }
  function jrAll(on){ M.jrOff = M.jrOff || {}; document.querySelectorAll('.jr-ph').forEach(b=>{ if(on) delete M.jrOff[b.dataset.p]; else M.jrOff[b.dataset.p] = 1; b.classList.toggle('off', !on); }); persist(); jrCount(); }

  /* ---------- 🌍 Carte du monde 3D (globe interactif : zoom, rotation, voyages, pays, steps) ---------- */

  /* ---------- ✈️ Plusieurs vols dans une même confirmation (aller-retour, escales) ---------- */
  const AIRLINES = {EZY:'easyJet',EZS:'easyJet Switzerland',EZE:'easyJet Europe',U2:'easyJet',EJU:'easyJet',AFR:'Air France',AF:'Air France',TVF:'Transavia',TO:'Transavia',HV:'Transavia',RYR:'Ryanair',FR:'Ryanair',VLG:'Vueling',VY:'Vueling',V7:'Volotea',VOE:'Volotea',
    LH:'Lufthansa',DLH:'Lufthansa',KL:'KLM',KLM:'KLM',BA:'British Airways',BAW:'British Airways',IB:'Iberia',TP:'TAP Air Portugal',AZ:'ITA Airways',ITY:'ITA Airways',EK:'Emirates',QR:'Qatar Airways',TK:'Turkish Airlines',
    A3:'Aegean',KM:'KM Malta Airlines',W6:'Wizz Air',W4:'Wizz Air',MS:'EgyptAir',AT:'Royal Air Maroc',SN:'Brussels Airlines',LX:'Swiss',OS:'Austrian',SK:'SAS',AY:'Finnair',DY:'Norwegian',BT:'airBaltic',LS:'Jet2',EW:'Eurowings',DE:'Condor',SS:'Corsair',TX:'Air Caraïbes',UX:'Air Europa',PC:'Pegasus',XQ:'SunExpress'};
  function cfSegA(raw){ /* mail d'enregistrement : « EZS1348 / Nantes   Genève / Fri 06 Nov   Fri 06 Nov / 21:00   22:20 » */
    const L = String(raw||'').replace(/\r/g,'').replace(/ | /g,' ').split('\n').map(l=>l.replace(/\t+/g,'   ').trim()).filter(Boolean), out = [];
    const two = l => l.split(/\s{2,}/).map(x=>x.trim()).filter(Boolean);
    L.forEach((l,i)=>{
      const m = l.match(/^([A-Z]{3}|[A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{2,4})(?:\s+[A-Z0-9]{2,3}\s?\d{2,4})*$/); if(!m || /^\d{4}$/.test(l)) return;
      const blk = L.slice(i+1, i+9); let route = null, dts = null, tms = null;
      blk.forEach(x=>{ const p = two(x);
        if(!route && p.length === 2 && p.every(y=>/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’. -]{1,40}$/.test(y)) && !/^(?:D[ée]part|Arriv|T\d|Terminal)/i.test(p[0])) route = p;
        else if(!dts && p.length === 2 && p.every(y=>/\d{1,2}\s+[A-Za-zéû]{3,9}\.?/.test(y))) dts = p;
        else if(!tms && p.length === 2 && p.every(y=>/^\d{1,2}:\d{2}$/.test(y))) tms = p; });
      if(!route || !dts || !tms) return;
      const ds = cfDates(dts[0] + ' ' + new Date().getFullYear()); let d = ds[0] || '';
      const mm = dts[0].match(/(\d{1,2})\s+([A-Za-zéû]+)/); if(mm){ const mo = MOIS_FR[mm[2].normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\./g,'')]; if(mo) d = yearFor(raw, mo, +mm[1]); }
      const code = (m[1] + m[2]).toUpperCase();
      out.push({kind:'vol', code, from:route[0], to:route[1], date:d, heure:tms[0].padStart(5,'0'), heureArr:tms[1].padStart(5,'0'), compagnie:(AIRLINES[m[1]] ? AIRLINES[m[1]] + ' ' : '') + code, note:''});
    });
    return out;
  }
  function cfSegB(raw){ /* réservation : « Nantes à Londres (Terminal / Nord) » puis « Départ : ven. 02 juil. 2027 22:10 » */
    const L = cfPre(raw).split('\n').map(l=>l.replace(/\t+/g,' ').trim()).filter(Boolean), out = [];
    const clean = s => s.replace(/\(.*?\)/g,'').replace(/\(.*$/,'').replace(/\b(?:Terminal|Aéroport|Airport)\b.*$/i,'').replace(/\s+/g,' ').trim();
    const dl = L.map((l,i)=>/^D[ée]part\s*:/i.test(l) && cfDates(l).length ? i : -1).filter(i=>i>=0);
    dl.forEach(i=>{
      /* route : jusqu'à 3 lignes avant, recollées (« …(Terminal » + « Nord) ») */
      let route = null;
      for(let k=1; k<=3 && !route; k++){
        const txt = L.slice(Math.max(0, i-k), i).join(' ').replace(/\s+/g,' ');
        const m = txt.match(/(?:^|\s)([A-ZÀ-Ý][^:]{1,45}?)\s+(?:à|to)\s+([A-ZÀ-Ý][^:]{1,50})$/);
        if(m && !/paiement|carte|\d{2}\/\d{2}/i.test(txt)) route = [m[1], m[2]];
      }
      const ar = L.slice(i+1, i+3).find(l=>/^Arriv[ée]e\s*:/i.test(l)) || '';
      const tm = l => (l.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g) || []).pop() || '';
      /* code vol : « EZY844 » + « 6 » placés avant l'intitulé */
      let code = '';
      const prevD = dl[dl.indexOf(i)-1] || -1;
      for(let k=i-1; k>=Math.max(0, prevD+1, i-16) && !code; k--){ const m = L[k].match(/^([A-Z]{3}|[A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{2,4})$/); if(m){ code = m[1] + m[2]; if(/^\d$/.test(L[k+1]||'') && m[2].length === 3) code += L[k+1]; } }
      const pre = code.match(/^([A-Z]{3}|[A-Z]{2}|[A-Z]\d|\d[A-Z])/);
      out.push({kind:'vol', code, from: route ? clean(route[0]) : '', to: route ? clean(route[1]) : '', date: cfDates(L[i])[0], heure: tm(L[i]), heureArr: tm(ar),
        compagnie:(pre && AIRLINES[pre[1]] ? AIRLINES[pre[1]] + ' ' : '') + code, note:''});
    });
    return out;
  }
  function cfSegments(raw){
    const A = cfSegA(raw); if(A.length) return A;
    const B = cfSegB(raw); if(B.length && B.some(s=>s.from && s.to)) return B;
    return cfSegments0(raw);
  }
  function cfSegments0(raw){
    const T = cfPre(raw), L = T.split('\n').map(l=>l.replace(/\t+/g,' ').trim()).filter(Boolean), segs = [];
    const isCode = l => l.length < 45 && /^(?:vol\s*:?\s*)?([A-Z]{3}|[A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{2,4})\b/.test(l) && !/^\d{4}$/.test(l);
    const idx = L.map((l,i)=>isCode(l) ? i : -1).filter(i=>i>=0);
    idx.forEach((ci, k)=>{
      const end = k+1 < idx.length ? idx[k+1] : L.length, blk = L.slice(ci, end);
      const m = L[ci].match(/^(?:vol\s*:?\s*)?([A-Z]{3}|[A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{2,4})/);
      let from = '', to = '';
      for(let j=ci-1; j>=Math.max(0, ci-4); j--){ const r = L[j].match(/^(.+?)\s+(?:à|a|to|→|->|–|—)\s+(.+)$/i); if(r && !/^\d/.test(r[1]) && !/:/.test(L[j])){ from = r[1]; to = r[2]; break; } }
      const clean = s => s.replace(/\(.*?\)/g,'').replace(/\b(?:Terminal|Aéroport|Airport|T\d)\b.*$/i,'').trim();
      const line = re => blk.find(l=>re.test(l)) || '';
      const dep = line(/^(?:d[ée]part|departure|departs?)\b/i), arr = line(/^(?:arriv[ée]e|arrival|arrives?)\b/i);
      const tm = l => (l.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/) || [])[0] || '';
      const d = cfDates(dep)[0] || cfDates(blk.join('\n'))[0] || '';
      const notes = blk.filter(l=>/si[èe]ge|seat|bagage|baggage|comptoir|enregistrement|check-?in|porte|gate|embarquement|boarding/i.test(l) && !/^ajouter|^changer/i.test(l)).slice(0,6);
      segs.push({kind:'vol', code:(m[1]+m[2]).toUpperCase(), from:clean(from), to:clean(to), date:d, heure:tm(dep), heureArr:tm(arr), compagnie:(AIRLINES[m[1]] ? AIRLINES[m[1]] + ' ' : '') + (m[1]+m[2]).toUpperCase(), note:notes.join(' · ')});
    });
    return segs.filter(s=>s.date || s.from);
  }
  function cfRef(raw, pj){
    const T = cfPre(raw), ok = c => /\d/.test(c) && /[A-Z]/.test(c);
    for(const m of T.matchAll(/(?:r[ée]f[ée]rence|reference|booking|r[ée]servation|PNR|code)\W{0,25}([A-Z0-9]{6,8})\b/gi)){ if(ok(m[1]) && m[1] === m[1].toUpperCase()) return m[1]; }
    for(const m of ((pj && pj[0] && pj[0].n) || '').matchAll(/(?:^|[-_ ])([A-Z0-9]{6,8})(?=$|[-_ ])/g)) if(ok(m[1])) return m[1];
    return '';
  }
  function cfImport(raw, pj, force){
    impCtx = {raw, pj};
    const segs = (!force || force === 'transport') ? cfSegments(raw) : [], ref = cfRef(raw, pj);
    if(segs.length >= 2){
      cfPending = segs.map(s=>({type:'item', trip:M.trip, cat:'transport', mode:'Avion', from:s.from, to:s.to, titre:(s.from && s.to) ? s.from + ' → ' + s.to : 'Vol ' + s.code,
        date:s.date, heureDep:s.heure, heureArr:s.heureArr, compagnie:s.compagnie, ref, statut:'booked', note:s.note, pj: pj ? clone(pj) : undefined}));
      cfSegSheet(); return;
    }
    const d = cfDraft(raw, force);
    if(segs.length === 1 && d.cat === 'transport'){ const s = segs[0]; Object.assign(d, {from:d.from||s.from, to:d.to||s.to, date:d.date||s.date, heureDep:d.heureDep||s.heure, heureArr:d.heureArr||s.heureArr, compagnie:s.compagnie, note:s.note||d.note});
      if(d.from && d.to) d.titre = d.from + ' → ' + d.to; if(!d.ref) d.ref = ref; if(!d.prix){ const pr = cfPre(raw).match(/(\d[\d ]*[,.]\d{2})\s*€|€\s*(\d[\d ]*[,.]\d{2})/); if(pr && /paiement|payment|total/i.test(cfPre(raw))) d.prix = (pr[1]||pr[2]).replace(/\s/g,'').replace(',', '.'); } }
    if(pj) d.pj = pj;
    edit(d); toast('📄 Fiche créée — vérifie puis Enregistrer');
  }
  let cfPending = null;
  function cfSegSheet(){
    openSheet(`<h2>✈️ ${cfPending.length} vols trouvés</h2><div class="v-sum-small" style="margin-bottom:8px">Aller-retour ou escales : une fiche par vol. Décoche ceux à ne pas créer.</div>
      ${cfPending.map((it,i)=>`<label class="cv-checkline cv-seg"><input type="checkbox" id="cfs-${i}" checked> <span><b>${esc(it.titre)}</b><small>${it.date ? fdate(it.date) : 'date ?'} · ${esc(it.heureDep||'?')} → ${esc(it.heureArr||'?')} · ${esc(it.compagnie||'')}${it.note ? '<br>' + esc(it.note) : ''}</small></span></label>`).join('')}
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.cfSegGo()">✅ Créer les vols</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  // plusieurs cartes de vol sur une même capture (appli de la compagnie : aller + retour l’un sous l’autre)
  function multiCards(T){
    const L = cfPre(stripStatus(T)).split('\n').map(l=>l.trim()).filter(Boolean), up = L.map(l=>l.toUpperCase());
    const pairs = up.map((l, i)=>{ const cs = l.split(/[^A-Z]+/).filter(w=>w.length === 3 && IATA[w] && !BP_STOP.has(w)); return cs.length >= 2 && l.length <= 48 ? i : -1; }).filter(i=>i >= 0);
    if(pairs.length < 2) return [];
    const head = i => i > 0 && (cfDates(L[i-1]).length || /\b\d{1,2}\s+[A-ZÉÛ]{3,5}\.?/.test(up[i-1]) || /\b(?:[A-Z]{2,3}|[A-Z]\d|\d[A-Z])\s?\d{2,4}\b/.test(up[i-1]));
    const starts = pairs.map(i=>head(i) ? i - 1 : i);
    const out = [];
    starts.forEach((st, k)=>{ const blk = L.slice(st, k + 1 < starts.length ? starts[k+1] : L.length).join('\n'); const bp = boardingParse(blk); if(bp && bp.from && bp.to) out.push(bp); });
    return out.length >= 2 ? out : [];
  }
  function cfSegGo(){
    const out = (cfPending||[]).filter((_,i)=>{ const c = document.getElementById('cfs-' + i); return c && c.checked; }).map((it,k)=>Object.assign({id:'i'+uid()+k}, it));
    if(!out.length) return;
    const after = () => { M.mode = 'prep'; tab('transport'); };
    cfPending = null;
    if(out.some(n=>dupOf(n).length)){ dupAsk(out, after); return; }
    putMany(out, '✈️ ' + out.length + ' vol(s) créé(s)'); impCtx = null; closeSheet(true); after();
  }

  /* ---------- 🛰️ Traceur de voyage (avec les limites d'une appli web) ---------- */
  let trkWatch = null, trkLastSave = 0, trkBuf = null;
  const trkOn = () => !!(M.trk && M.trk.on);
  // le suivi n'existe que pendant le voyage : du premier au dernier jour (dates obligatoires)
  const trkWin = t => { const td = isoToday(); if(!t || !t.debut || !t.fin) return 'nodate'; if(td < t.debut) return 'before'; if(td > t.fin) return 'after'; return 'ok'; };
  // voyage fini (ou supprimé) : le suivi se coupe tout seul, même si l'appli a été oubliée ouverte
  function trkAutoOff(){
    if(!trkOn()) return false; const t = R[M.trk.trip];
    if(t && !t.deleted && trkWin(t) === 'ok') return false;
    M.trk.on = false; trkStop(); persist();
    toast(t && !t.deleted && trkWin(t) === 'after' ? '🛰️ ' + MSGT('Voyage terminé : le suivi GPS s’est coupé tout seul') : '🛰️ ' + MSGT('Suivi GPS coupé'));
    try { refresh(); } catch(e){}
    return true;
  }
  // 📍 lieu de mes souvenirs sur la carte du voyage (point à mon nom) : chacun choisit, oui par défaut
  const gpId = (tid, who) => 'gp:' + tid + ':' + (who || M.me || 'moi');
  const geoOn = (tid, who) => { const r = R[gpId(tid, who)]; return !(r && !r.deleted && r.on === false); };
  function geoToggle(){
    const t = trip(); if(!t) return; const on = !geoOn(t.id);
    put({id:gpId(t.id), type:'geopref', trip:t.id, who:M.me || '', on}, on ? '📍 ' + MSGT('Le lieu de tes souvenirs apparaît sur la carte') : '🔒 ' + MSGT('Le lieu de tes souvenirs n’apparaît plus sur la carte'));
    if(feedCode(t.id)) feedBuild(t.id); fkMine(t.id); syncNow(); refresh();
  }
  const trkRec = (tid, d, who) => (who && R['trk:' + tid + ':' + d + ':' + who]) || R['trk:' + tid + ':' + d];
  // 👀 Chaque voyageur choisit s’il montre sa route aux abonnés (désactivé par défaut)
  const tpId = (tid, who) => 'tp:' + tid + ':' + (who || M.me || 'moi');
  const trkPubOn = (tid, who) => { const r = R[tpId(tid, who)]; return !!(r && !r.deleted && r.on); };
  async function trkPub(){
    const t = trip(); if(!t) return; const on = !trkPubOn(t.id);
    if(on && !(await uiConfirm('Montrer ta position aux abonnés de ce voyage ?\n\nIls verront sur une carte, à ton nom : le trajet enregistré par le suivi s’il est actif, sinon le lieu de tes souvenirs (précision ≈ 100 m), avec l’heure.\nTu peux arrêter quand tu veux : la carte disparaît chez eux à la synchro suivante.\nTes compagnons choisissent chacun pour eux.'))) return;
    put({id:tpId(t.id), type:'trkpub', trip:t.id, who:M.me || '', on}, on ? '👀 Route visible des abonnés' : '🔒 Route masquée aux abonnés');
    if(feedCode(t.id)) feedBuild(t.id); fkMine(t.id); syncNow(); refresh();
  }
  function feedTrk(tid){   // la route des voyageurs qui l’ont accepté, allégée (≤ 300 points, ≈ 100 m)
    const by = trkByWho(tid, true), people = [];
    Object.entries(by).forEach(([w, pts])=>{ if(!trkPubOn(tid, w) || !pts.length) return;
      const step = Math.max(1, Math.ceil(pts.length / 300)), P = pts.filter((_, i)=>i % step === 0 || i === pts.length - 1).map(p=>[+(+p[0]).toFixed(3), +(+p[1]).toFixed(3), p[2] || 0]);
      people.push({n: w ? pname(w) : '', c: w ? pcol(w) : '#0ea5e9', pts:P, gps: trkHas(tid, w) ? 1 : 0}); });
    return people;
  }
  const trkHas = (tid, w) => list('trk', r=>r.trip===tid && (r.pts||[]).length && (r.who || r.id.split(':')[3] || '') === (w || '')).length > 0;
  // 🛰️ ma route en direct chez les abonnés : écrite par MON téléphone (je publie le voyage ou je suis compagnon),
  // dès qu’un point GPS est enregistré, sans attendre que celui qui a publié le voyage ouvre son appli
  function fkMine(tid){
    try {
      const t = R[tid]; if(!t || t.deleted || t.type !== 'trip' || !socCode(tid)) return;
      const me = M.me || '', id = 'fk:' + tid + ':' + (me || 'moi'), cur = R[id];
      if(!trkPubOn(tid, me)){ if(cur && !cur.deleted) putQuiet([{id, type:'feedtrk', trip:ftId(tid), who:me, n: me ? pname(me) : '', people:[], deleted:true}]); return; }
      const pts = trkByWho(tid, true)[me] || []; if(!pts.length) return;
      const step = Math.max(1, Math.ceil(pts.length / 400)), P = pts.filter((_, i)=>i % step === 0 || i === pts.length - 1).map(p=>[+(+p[0]).toFixed(3), +(+p[1]).toFixed(3), p[2] || 0]);
      const rec = {id, type:'feedtrk', trip:ftId(tid), who:me, people:[{n: me ? pname(me) : (myName() || ''), c: me ? pcol(me) : '#0ea5e9', pts:P, gps: trkHas(tid, me) ? 1 : 0}]};
      if(cur && !cur.deleted && stripStamp(cur) === stripStamp(rec)) return;
      putQuiet([rec]);
    } catch(e){}
  }
  function fkLive(){ try { trips().forEach(t=>{ if(t && !t.deleted && tripPhase(t) === 'live' && socCode(t.id)) fkMine(t.id); }); } catch(e){} }
  function trkHTML(){
    const t = trip(); if(!t) return '';
    { const w = trkWin(t); if(w !== 'ok') return w === 'after' ? '' : `<div class="cv-trk"><span class="dot"></span><span class="tx"><b>Suivi GPS</b><small>${w === 'nodate' ? 'Ajoute les dates du voyage : le suivi est proposé seulement pendant le voyage.' : 'Proposé du ' + fdate(t.debut) + ' au ' + fdate(t.fin) + ', puis coupé automatiquement.'}</small></span></div>`; }
    const on = trkOn() && M.trk.trip === t.id, today = trkRec(t.id, isoToday(), M.me), n = today ? today.pts.length : 0;
    if(on && socCode(t.id) && !R[tpId(t.id)] && !(M.tpAsk||{})[t.id]){ M.tpAsk = Object.assign({}, M.tpAsk, {[t.id]:1}); persist(); setTimeout(()=>{ try { if(!R[tpId(t.id)]) trkPub(); } catch(e){} }, 900); }
    let km_ = 0; if(today) for(let i=1;i<today.pts.length;i++) km_ += km({lat:today.pts[i-1][0], lng:today.pts[i-1][1]}, {lat:today.pts[i][0], lng:today.pts[i][1]});
    return `<div class="cv-trk${on?' on':''}"><span class="dot"></span><span class="tx"><b>${on ? 'Voyage suivi' : 'Suivi arrêté'}</b><small>${on ? `${n} point${n>1?'s':''} aujourd’hui · ${km_ < 10 ? km_.toFixed(1) : Math.round(km_)} km · enregistre ta route quand l’appli est ouverte · coupé seul après le ${fdate(t.fin)}` : 'Chacun l’active ou le coupe quand il veut. Coupé seul après le ' + fdate(t.fin) + '.'}</small></span>
      <button type="button" onclick="CV.trkToggle()">${on ? 'Arrêter' : 'Activer'}</button></div><details class="cv-fold cv-trkx"><summary>${MSGT('Position et confidentialité')} <small>${[on ? '🛰️' : '', socCode(t.id) && trkPubOn(t.id) ? '👀' : '', geoOn(t.id) ? '📍' : '🔒'].filter(Boolean).join(' ')}</small></summary>${on ? `<button type="button" class="cv-tjbtn" onclick="CV.tjOpen()"><span>🚗</span><span><b>Mode trajet</b><small>Écran allumé, GPS précis : pour une route, un train, une rando</small></span></button>` : ''}${socCode(t.id) ? `<button type="button" class="cv-trkpub${trkPubOn(t.id) ? ' on' : ''}" onclick="CV.trkPub()"><span>${trkPubOn(t.id) ? '👀' : '🔒'}</span><span><b>${trkPubOn(t.id) ? 'Ta position est visible des abonnés' : 'Ta position est cachée aux abonnés'}</b><small>${trkPubOn(t.id) ? 'Touche pour la cacher' : 'Ta route si le suivi est actif, sinon le lieu de tes souvenirs'}</small></span></button>` : ''}<button type="button" class="cv-trkpub${geoOn(t.id) ? ' on' : ''}" onclick="CV.geoToggle()"><span>${geoOn(t.id) ? '📍' : '🔒'}</span><span><b>${geoOn(t.id) ? 'Le lieu de tes souvenirs est sur la carte' : 'Le lieu de tes souvenirs est caché'}</b><small>${geoOn(t.id) ? 'Un point à ton nom quand tu partages un souvenir · touche pour le cacher' : 'Touche pour le montrer à tes compagnons'}</small></span></button></details>`;
  }
  async function trkToggle(){
    const t = trip(); if(!t) return;
    if(trkOn() && M.trk.trip === t.id){ M.trk.on = false; trkStop(); persist(); toast('⏸️ Suivi arrêté'); refresh(); return; }
    if(!navigator.geolocation){ alert('Localisation indisponible sur ce téléphone.'); return; }
    { const w = trkWin(t); if(w !== 'ok'){ alert(w === 'nodate' ? 'Ajoute d’abord les dates du voyage : le suivi GPS ne fonctionne que pendant le voyage.' : w === 'before' ? 'Le suivi GPS sera proposé à partir du premier jour du voyage.' : 'Ce voyage est terminé : le suivi GPS n’est plus proposé.'); return; } }
    if(!M.trkSeen && !(await uiConfirm('Activer le suivi du voyage ?\n\n• Ta position est enregistrée environ tous les 300 m, seulement quand l’appli est ouverte (une appli web ne peut pas suivre en arrière-plan, téléphone en poche).\n• Un point est aussi ajouté à chaque ouverture de l’appli.\n• La route est partagée uniquement avec les personnes de CE voyage.\n• Tu peux l’arrêter à tout moment.'))) return;
    M.trkSeen = 1; M.trk = {on:true, trip:t.id, since:Date.now()}; persist(); trkStart(); toast('🛰️ Suivi activé'); refresh();
    if(socCode(t.id) && !trkPubOn(t.id)) setTimeout(()=>{ try { trkPub(); } catch(e){} }, 500);
  }
  function trkAdd(pos){
    if(!trkOn() || trkAutoOff()) return; const t = R[M.trk.trip]; if(!t || t.deleted) return;
    const c = pos.coords, ts = Math.min(Date.now(), pos.timestamp || Date.now()), drive = !!TJ;
    if(TJ){ TJ.acc = c.accuracy; TJ.sp = (c.speed != null && c.speed >= 0) ? c.speed * 3.6 : TJ.sp; TJ.fix = Date.now(); }
    if(c.accuracy && c.accuracy > (drive ? 80 : 500)) return;                                                   // position trop imprécise
    const p = [+c.latitude.toFixed(5), +c.longitude.toFixed(5), ts], d = isoToday(), id = 'trk:' + t.id + ':' + d + ':' + (M.me || 'moi');   // une trace par personne : deux téléphones ne s'écrasent plus
    const r = trkBuf && trkBuf.id === id ? trkBuf : (R[id] ? clone(R[id]) : {id, type:'trk', trip:t.id, date:d, who:M.me || '', pts:[]});
    const last = r.pts[r.pts.length - 1];
    if(last){
      const dk = km({lat:last[0], lng:last[1]}, {lat:p[0], lng:p[1]}), dh = Math.max(1000, ts - (last[2] || 0)) / 3600e3;
      if(dk < (drive ? 0.05 : 0.3) && ts - (last[2] || 0) < (drive ? 3 : 15) * 60000) return;   // trop près du point précédent
      if(dk / dh > 950 && dh < 0.5) return;                                                     // saut impossible (> 950 km/h) : erreur de localisation
      if(TJ){ TJ.km += dk; if(c.speed == null) TJ.sp = dk / dh; }
    }
    r.pts.push(p); trkBuf = r; wlcCheck(p[0], p[1]);
    if(Date.now() - trkLastSave > (drive ? 60000 : 5 * 60000) || r.pts.length === 1){ trkLastSave = Date.now(); put(r, false); trkBuf = null; fkMine(t.id); }
    if(LV && LV.key === t.id) liveSoon();
    const el = document.querySelector('.cv-trk small'); if(el && M.tab==='prog') el.textContent = r.pts.length + ' point(s) aujourd’hui';
  }
  /* 🚗 Mode trajet : écran maintenu allumé (Wake Lock), GPS précis, un point tous les 50 m environ.
     Une appli web ne peut pas suivre téléphone en poche ; pour une route en voiture, un trajet en train ou une
     rando, ce mode garde l’appli au premier plan. Écran noir : très peu de batterie sur les écrans OLED. */
  let TJ = null;
  async function tjLock(){ try { if(TJ && 'wakeLock' in navigator && document.visibilityState === 'visible'){ TJ.lock = await navigator.wakeLock.request('screen'); TJ.noLock = 0; } else if(TJ && !('wakeLock' in navigator)) TJ.noLock = 1; } catch(e){ if(TJ) TJ.noLock = 1; } }
  async function tjOpen(){
    const t = trip(); if(!t || TJ) return;
    if(!(trkOn() && M.trk.trip === t.id)){ await trkToggle(); if(!(trkOn() && M.trk.trip === t.id)) return; }
    TJ = {t0:Date.now(), km:0, sp:null, acc:null, dim:false, fix:0};
    if(trkWatch !== null){ navigator.geolocation.clearWatch(trkWatch); trkWatch = null; } trkStart();
    const ov = document.createElement('div'); ov.id = 'cv-tj'; ov.className = 'cv-tj'; ov.onclick = () => { if(TJ){ TJ.dim = !TJ.dim; tjDraw(); } };
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    await tjLock(); tjDraw(); TJ.iv = setInterval(tjDraw, 1000);
  }
  function tjDraw(){
    const ov = document.getElementById('cv-tj'); if(!ov || !TJ) return;
    const s = Math.floor((Date.now() - TJ.t0) / 1000), two = n => String(n).padStart(2, '0');
    ov.classList.toggle('dim', TJ.dim);
    ov.innerHTML = `<div class="tj-top"><b>🚗 Mode trajet</b><small>${TJ.noLock ? '⚠️ Ce téléphone ne peut pas garder l’écran allumé : désactive la mise en veille automatique le temps du trajet.' : '🔆 Écran maintenu allumé'}</small></div>
      <div class="tj-big"><b>${TJ.km < 10 ? TJ.km.toFixed(2) : TJ.km.toFixed(1)}</b><span>km</span></div>
      <div class="tj-row"><div><small>Durée</small><b>${Math.floor(s / 3600)}:${two(Math.floor(s % 3600 / 60))}:${two(s % 60)}</b></div><div><small>Vitesse</small><b>${TJ.sp == null ? '—' : Math.round(TJ.sp) + ' km/h'}</b></div><div><small>Précision</small><b>${TJ.acc == null ? '…' : '± ' + Math.round(TJ.acc) + ' m'}</b></div></div>
      ${TJ.fix && Date.now() - TJ.fix > 120000 ? `<p class="tj-warn">📡 Pas de position depuis ${Math.round((Date.now() - TJ.fix) / 60000)} min</p>` : ''}
      <p>Garde Vezoria ouverte au premier plan, téléphone branché de préférence : ta route s’enregistre tous les 50 m environ. Touche l’écran pour l’assombrir.</p>
      <button type="button" class="tj-end" onclick="event.stopPropagation();CV.tjClose()">⏹ Terminer le mode trajet</button>`;
  }
  function tjClose(){
    if(!TJ) return; clearInterval(TJ.iv); try { if(TJ.lock) TJ.lock.release(); } catch(e){}
    const k = TJ.km; TJ = null; trkFlush();
    const ov = document.getElementById('cv-tj'); if(ov) ov.remove(); document.body.style.overflow = '';
    if(trkWatch !== null){ navigator.geolocation.clearWatch(trkWatch); trkWatch = null; } trkStart();
    toast('🚗 ' + fmtKm(k)); refresh();
  }
  setInterval(trkAutoOff, 3600e3);
  function wlcOpen(){ try { const t = trip(); if(!t || tripPhase(t) !== 'live' || trkOn() || !navigator.geolocation || !navigator.permissions) return;
    navigator.permissions.query({name:'geolocation'}).then(st=>{ if(st.state === 'granted') navigator.geolocation.getCurrentPosition(p=>wlcCheck(+p.coords.latitude.toFixed(5), +p.coords.longitude.toFixed(5)), ()=>{}, {maximumAge:600000, timeout:20000}); }).catch(()=>{}); } catch(e){} }
  setTimeout(wlcOpen, 6000); document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'visible') setTimeout(wlcOpen, 2500); });
  function trkFlush(){ if(trkBuf){ const tid = trkBuf.trip; put(trkBuf, false); trkBuf = null; trkLastSave = Date.now(); fkMine(tid); } }
  function trkStart(){
    if(!trkOn() || trkAutoOff() || trkWatch !== null || !navigator.geolocation) return;
    trkWatch = navigator.geolocation.watchPosition(trkAdd, ()=>{}, TJ ? {enableHighAccuracy:true, maximumAge:5000, timeout:30000} : {enableHighAccuracy:false, maximumAge:120000, timeout:60000});
  }
  function trkStop(){ if(trkWatch !== null){ navigator.geolocation.clearWatch(trkWatch); trkWatch = null; } trkFlush(); }
  document.addEventListener('visibilitychange', ()=>{
    if(document.visibilityState === 'hidden'){ trkFlush(); if(trkWatch !== null){ navigator.geolocation.clearWatch(trkWatch); trkWatch = null; } }
    else if(trkOn() && !trkAutoOff()){ navigator.geolocation.getCurrentPosition(trkAdd, ()=>{}, {enableHighAccuracy:!!TJ, maximumAge:TJ ? 5000 : 300000, timeout:30000}); trkStart(); if(TJ) tjLock(); }
  });
  setTimeout(()=>{ if(trkOn() && !trkAutoOff()){ trkStart(); navigator.geolocation && navigator.geolocation.getCurrentPosition(trkAdd, ()=>{}, {enableHighAccuracy:false, maximumAge:300000, timeout:30000}); } }, 2500);

  /* ---------- 🏳️ Pays → drapeau (noms français / anglais / codes) ---------- */
  const ISO = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
  let ccMap = null;
  function ccOf(name){
    if(!name) return ''; if(/^[A-Z]{2}$/.test(name)) return name;
    if(!ccMap){ ccMap = {}; try { const fr = new Intl.DisplayNames(['fr'], {type:'region'}), en = new Intl.DisplayNames(['en'], {type:'region'}); ISO.forEach(c=>{ [fr.of(c), en.of(c)].forEach(n=>{ if(n) ccMap[normQ(n)] = c; }); }); } catch(e){}
      Object.assign(ccMap, {[normQ('USA')]:'US', [normQ('Etats-Unis')]:'US', [normQ('UK')]:'GB', [normQ('Angleterre')]:'GB', [normQ('Ecosse')]:'GB', [normQ('Turquie')]:'TR', [normQ('Türkiye')]:'TR', [normQ('Tchequie')]:'CZ'}); }
    return ccMap[normQ(name)] || '';
  }

  /* ---------- 🧭 Quatre espaces : Préparation · En cours · Passés · Bilan ---------- */
  const tripPhase = t => { const td = isoToday(); if(!t || !t.debut) return 'prep'; if(t.debut > td) return 'prep'; if(!t.fin || t.fin >= td) return 'live'; return 'past'; };
  const MODES = [['prep','🧳','Préparation'], ['live','📍','En cours'], ['past','🗺️','Passés'], ['bilan','🏁','Bilan']];
  function modeBar(){
    let el = document.getElementById('cv-modes');
    if(!el){ el = document.createElement('div'); el.id = 'cv-modes'; el.className = 'cv-modes'; const tc = document.getElementById('tabsC'); tc.parentNode.insertBefore(el, tc); }
    const live = trips().some(t=>tripPhase(t)==='live');
    el.style.display = MODES.some(([k])=>k!=='prep' && !hidden('mode:' + k)) ? '' : 'none';
    el.innerHTML = MODES.filter(([k])=>k==='prep' || !hidden('mode:' + k)).map(([k,ic,l])=>`<button type="button" class="${(M.mode||'prep')===k?'on':''}" onclick="CV.modeGo('${k}')"><i>${ic}</i><span>${l}</span>${k==='live' && live ? '<b class="dotlive"></b>' : ''}</button>`).join('');
  }
  function modeGo(k){
    // les 4 onglets montrent tous LE MÊME voyage (celui choisi dans « Mes voyages ») ; seul l'angle de vue change
    M.mode = k;
    if(!trip()){ const t = trips()[0]; if(t) M.trip = t.id; }
    if(k === 'prep' && !groupOf(M.tab)) M.tab = 'prog';
    persist(); applyMode(); window.scrollTo({top:0});
  }

  function modeRender(){
    if(M.mode && M.mode !== 'prep' && hidden('mode:' + M.mode)) M.mode = 'prep';
    const k = M.mode || 'prep', tc = document.getElementById('tabsC'), nav = document.getElementById('cv-nav');
    modeBar();
    const special = k !== 'prep';
    if(tc) tc.style.display = special || !tc.innerHTML.trim() ? 'none' : ''; if(nav) nav.style.display = 'flex';
    if(!special) return false;
    document.getElementById('cv-fab').style.display = 'none';
    const body = document.getElementById('cv-body');
    if(innerRender()) return true;
    body.innerHTML = (INNER[k] ? innerBar() : '') + (k === 'live' ? liveHTML() : k === 'past' ? pastHTML() : bilanHTML());
    hydrate(); return true;
  }
  function liveHTML(){
    const t = trip(), live = t && tripPhase(t) === 'live';
    if(!live){ const ph = t ? tripPhase(t) : 'prep', lv = trips().find(x=>tripPhase(x)==='live');
      return `<div class="v-box"><h3>📍 ${t ? esc(t.titre) : 'Aucun voyage'}</h3><p>${!t ? 'Crée un voyage pour commencer.' : ph === 'prep' ? (t.debut ? `Ce voyage commence le <b>${fdate(t.debut)}</b> : cet espace s’allumera le jour J (fiche du jour, steps, traceur, dépenses).` : 'Ajoute des dates à ce voyage : cet espace s’allumera le jour J.') : `Ce voyage est terminé depuis le ${fdate(t.fin || t.debut)} : retrouve-le dans 🏁 Bilan.`}</p>
        ${lv && lv.id !== (t||{}).id ? `<button class="v-btn" onclick="CV.go('${lv.id}')">📍 Ouvrir le voyage en cours : ${esc(lv.titre)}</button>` : ''}</div>`; }
    const k = dayList().indexOf(isoToday()), info = dayInfo(isoToday()), {own, night} = itemsForDay(isoToday());
    const tile = (ic, l, fn) => `<button type="button" class="cv-tile" onclick="${fn}"><i>${ic}</i><span>${l}</span></button>`;
    const lvF = !hidden('blk:prep');
    return `${offBand(t)}${lnHTML(t)}${lvF ? liveFil(t) : actBand()}${annivCard()}${nextHero()}${trkHTML()}${liveMapCard()}${lvF ? '' : liveCard()}
      <div class="cv-tiles">${tile('📍','Step ici','CV.hereNow()')}${tile('🧾','Dépense','CV.tlReceipt()')}${tile('📴','Fiche du jour','CV.tlDay()')}${tile('🌤️','Météo','CV.tlMeteo()')}</div>
      <details class="cv-fold cv-tmore"><summary>${MSGT('Plus d’outils')} <small>${MSGT('Courses, carte, importer, papiers')}</small></summary><div class="cv-tiles">${tile('🛒','Courses','CV.shopSheet()')}${tile('🌍','Carte','CV.worldMap()')}${tile('📄','Importer','CV.impSheet()')}${tile('🛂','Papiers','CV.tlDocs()')}</div></details>
      ${lvF ? '<div hidden>' : ''}<div class="v-box"><h3>Aujourd’hui · J${k+1}${info.titre ? ' · ' + esc(info.titre) : ''}</h3>${info.plan ? `<p>${esc(info.plan)}</p>` : ''}
        ${[...own, ...night].map(it=>`<button type="button" class="cv-prow" onclick="CV.edit('${it.id}')"><span>${icon(it)} <b>${esc(it.titre)}</b></span><span>${esc(it.heureDep||it.heure||'')}</span></button>`).join('') || '<div class="v-sum-small">Rien de réservé aujourd’hui.</div>'}
        ${placesOf(isoToday()).length ? `<button class="v-btn sec" onclick="CV.planDay('${isoToday()}')">🗺️ Itinéraire du jour (${placesOf(isoToday()).length} lieux)</button>` : ''}</div>${lvF ? '</div>' : ''}
      <button class="v-btn sec" onclick="CV.innerGo('souv')">📸 Voir les souvenirs</button>
      <div class="lv-more">${storyTodayHTML(t)}${eveCard()}${(()=>{ const d = dfHTML(t); return d ? `<details class="cv-fold"><summary>🎯 ${MSGT('Défis du jour')}${(()=>{ const m = /(\d+)\s*\/\s*(\d+)/.exec(d.replace(/<[^>]+>/g, ' ')); return m ? ` <small>${m[1]}/${m[2]}</small>` : ''; })()}</summary>${d}</details>` : ''; })()}${vjBtn(t)}${lgHTML(t)}</div>`;
  }
  function pastHTML(){
    const ps = trips().filter(t=>tripPhase(t)==='past').sort((a,b)=>(b.debut||'').localeCompare(a.debut||''));
    const card = t => { const sv = list('souv', s=>s.trip===t.id), ph = (sv.find(s=>(s.photos||[]).length) || {}).photos, n = sv.reduce((a,s)=>a+(s.photos||[]).length,0);
      return `<div class="cv-past"><div class="cov">${ph ? `<img data-ph="${esc(ph[0])}.t" alt="">` : '<span>🧳</span>'}</div><div class="bd"><b>${esc(t.titre)}</b><small>${tripDatesLong(t)}</small><small>${sv.length} souvenir${sv.length>1?'s':''} · ${n} photo${n>1?'s':''}</small>
        <div class="bt"><button type="button" onclick="CV.go('${t.id}');CV.modeGo('bilan')">🏁 Bilan</button><button type="button" onclick="CV.go('${t.id}');CV.albumSheet()">📕 Album</button><button type="button" onclick="CV.go('${t.id}');CV.modeGo('bilan');CV.innerGo('souv')" aria-label="Photo">📸</button></div></div></div>`; };
    return `<div class="v-sum"><div class="v-sum-row"><div class="v-sum-big">🗺️ ${ps.length} voyage${ps.length>1?'s':''} passé${ps.length>1?'s':''}</div></div>
      <div class="cv-row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><button class="v-day-edit" onclick="CV.worldMap()">🌍 Carte du monde</button><button class="v-day-edit" onclick="CV.scrOpen()">✨ Carte à gratter</button><button class="v-day-edit" onclick="CV.rtAll()">⭐ Mes adresses notées</button><button class="v-day-edit" onclick="CV.tlStats()">📊 Mes stats</button><button class="v-day-edit" onclick="CV.zipSheet()">💾 Sauvegarde ZIP</button></div></div>
      ${ps.map(card).join('') || '<div class="v-box"><p>Tes voyages terminés apparaîtront ici, avec leurs photos, leur bilan et leur album.</p></div>'}`;
  }
  function bilanHTML(){
    const t = trip(); if(!t) return '<div class="v-box"><p>Aucun voyage.</p></div>';
    const all = items(), tot = all.reduce((s,i)=>s+totalOf(i),0), v = tv(), tr = settle(balances()), sv = souvs(), nph = sv.reduce((a,s)=>a+(s.photos||[]).length,0);
    const unpaid = all.filter(i=>(i.echeances||[]).some(e=>!e.fait)), todo = all.filter(i=>i.statut==='todo' && totalOf(i) > 0);
    const daysNo = dayList().filter(d=>!sv.some(s=>s.date===d));
    const byCat = {}; all.forEach(i=>{ byCat[i.cat] = (byCat[i.cat]||0) + totalOf(i); }); const mx = Math.max(1, ...Object.values(byCat));
    const chk = (ok, l, extra) => `<div class="cv-bchk${ok?' ok':''}"><i>${ok ? '✓' : '!'}</i><span>${l}${extra ? '<small>' + extra + '</small>' : ''}</span></div>`;
    const pick = trips().filter(x=>tripPhase(x)!=='prep');
    // (plus de case « Bilan · voyage » avec sa liste déroulante : le choix du voyage se fait en haut à gauche, comme partout)
    return `${hidden('blk:prep') ? actBand() : finFil(t)}${bilanHero(t, tot, sv, nph)}${bilanBig(t)}
      ${hidden('blk:prep') ? '' : '<div hidden>'}<div class="v-box"><h3>🧾 Pour boucler le voyage</h3>
        ${chk(!tr.length, tr.length ? `${tr.length} remboursement${tr.length>1?'s':''} à faire` : 'Comptes soldés entre vous', tr.map(x=>`${esc(pname(x.de))} → ${esc(pname(x.a))} : ${eur(x.v)}`).join('<br>'))}
        ${chk(!unpaid.length, unpaid.length ? `${unpaid.length} échéance(s) non cochée(s)` : 'Échéancier à jour')}
        ${chk(!todo.length, todo.length ? `${todo.length} fiche(s) encore « à réserver »` : 'Toutes les fiches sont réservées ou payées', todo.slice(0,4).map(i=>esc(i.titre)).join(' · '))}
        ${chk(!daysNo.length, daysNo.length ? `${daysNo.length} jour(s) sans souvenir` : 'Chaque jour a son souvenir', daysNo.slice(0,6).map(fshort).join(' · '))}
        ${chk(!!t.archived, t.archived ? 'Rangé dans tes souvenirs' : 'Pas encore rangé dans tes souvenirs')}
        <div class="cv-row" style="gap:6px;flex-wrap:wrap;margin-top:8px">${tr.length ? `<button class="v-day-edit" onclick="CV.innerGo('budget')">💸 Régler / demander</button>` : ''}${daysNo.length ? `<button class="v-day-edit" onclick="CV.editSouv(null)">📸 Ajouter un souvenir</button>` : ''}${!t.archived ? `<button class="v-day-edit" onclick="CV.bilanClose()">📦 Ranger dans mes souvenirs</button>` : ''}</div></div>
      ${hidden('blk:prep') ? '' : '</div>'}${(()=>{ const bs = bilanSplit(); return bs ? `<details class="cv-fold cv-bfold"><summary>⚖️ ${MSGT('Prévu ou sur place ?')}</summary>${bs}</details>` : ''; })()}
      <details class="cv-fold cv-bfold"><summary>💶 ${MSGT('Dépenses')} <small>${eur(tot)}${v.length > 1 ? ' · ' + eur(tot/v.length) + ' / pers.' : ''}</small></summary><div class="v-box bb-grow" style="margin:0"><p><b>${eur(tot)}</b> au total${v.length > 1 ? ` · ${eur(tot/v.length)} par personne` : ''}${t.objectif ? ` · budget visé ${eur(t.objectif)} / pers.` : ''}</p>
        ${Object.entries(byCat).filter(([,x])=>x>0).sort((a,b)=>b[1]-a[1]).map(([c,x])=>`<div class="cv-bbar"><span>${CATS[c] ? CATS[c].icon + ' ' + CATS[c].lbl : c}</span><i style="width:${x/mx*100}%"></i><b>${eur(x)}</b></div>`).join('')}</div></details>
      <details class="cv-fold cv-bfold"><summary>📸 ${MSGT('Souvenirs')} <small>${sv.length} · ${nph} 📷</small></summary><div class="v-box" style="margin:0">
        <button class="v-btn" onclick="CV.filmOpen()">🎬 Film du voyage</button><button class="v-btn sec" onclick="CV.albumSheet()">📕 Créer l’album photo (PDF)</button><button class="v-btn sec" onclick="CV.jrSheet()">📖 Journal simple (PDF)</button><button class="v-btn sec" onclick="CV.worldMap()">🌍 Revoir sur la carte du monde</button></div></details>${coffeeBilan(t)}`;
  }
  function bilanClose(){ const t = clone(trip()); t.archived = true; put(t, '📦 Voyage rangé dans tes souvenirs'); refresh(); }

  /* ---------- 📕 Album photo PDF « glamour », entièrement paramétrable ---------- */
  const ALB_THEMES = {
    nuit:   {lbl:'Nuit étoilée', bg:[.07,.06,.13], ink:[.96,.93,.88], acc:[.83,.67,.36], soft:[.14,.12,.22]},
    ivoire: {lbl:'Ivoire',       bg:[.98,.96,.92], ink:[.13,.11,.1],  acc:[.55,.38,.2],  soft:[.93,.9,.84]},
    ocean:  {lbl:'Océan',        bg:[.95,.98,.99], ink:[.05,.18,.27], acc:[.0,.5,.6],    soft:[.86,.94,.96]},
    terra:  {lbl:'Terracotta',   bg:[.98,.94,.89], ink:[.24,.12,.08], acc:[.75,.33,.18], soft:[.94,.86,.78]},
  };
  function albumSheet(){
    const t = trip(); if(!t) return;
    const A = M.album = Object.assign({titre:t.titre, sous:tripDatesLong(t), theme:'nuit', serif:1, lay:'magazine', carte:1, chiffres:1, recits:1, jours:1, cover:''}, M.album && M.album.trip===t.id ? M.album : {trip:t.id, titre:t.titre, sous:tripDatesLong(t)});
    A.trip = t.id;
    const phs = souvs().flatMap(s=>(s.photos||[]).filter(p=>!(M.jrOff||{})[p]));
    const opt = (n, v, l) => `<option value="${v}"${A[n]==v?' selected':''}>${l}</option>`;
    const ck = (n, l) => `<label class="cv-checkline"><input type="checkbox" id="al-${n}"${A[n]?' checked':''}> ${l}</label>`;
    openSheet(`<h2>📕 Album photo</h2><div class="v-sum-small" style="margin-bottom:8px">Un beau livre en PDF, à garder, partager ou faire imprimer. Tout se règle :</div>
      ${field('Titre','al_titre',A.titre)}${field('Sous-titre','al_sous',A.sous)}
      <div class="v-f2"><div class="v-f"><label>Ambiance</label><select class="v-in" id="al-theme">${Object.entries(ALB_THEMES).map(([k,x])=>opt('theme',k,x.lbl)).join('')}</select></div>
        <div class="v-f"><label>Écriture</label><select class="v-in" id="al-serif">${opt('serif',1,'Élégante (serif)')}${opt('serif',0,'Moderne')}</select></div></div>
      <div class="v-f"><label>Mise en page des photos</label><select class="v-in" id="al-lay">${opt('lay','magazine','✨ Magazine : montages variés (pleine page, collages, polaroïds)')}${opt('lay','polaroid','📸 Polaroïds éparpillés')}${opt('lay','grande','Une grande photo par page')}${opt('lay','duo','Deux photos par page')}${opt('lay','mosa','Mosaïque de 4')}</select></div>
      <div class="v-f"><label>Photo de couverture</label><div class="jr-grid" id="al-cov">${phs.slice(0,24).map((p,i)=>`<button type="button" class="jr-ph${(A.cover||phs[0])===p?'':' off'}" data-p="${esc(p)}" onclick="CV.albCover(this)"><img data-ph="${esc(p)}.t" alt=""><span>★</span></button>`).join('') || '<div class="v-sum-small">Pas encore de photos.</div>'}</div></div>
      <div class="v-f"><label>Contenu</label>${ck('carte','🗺️ Carte du voyage')}${ck('chiffres','✨ Le voyage en chiffres')}${ck('jours','📅 Un chapitre par jour')}${ck('recits','✍️ Les récits des souvenirs')}</div>
      <button type="button" class="v-day-edit" onclick="CV.jrSheet()">🖼️ Choisir les photos (${phs.length} retenue${phs.length>1?'s':''})</button>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.albumGo()">📕 Créer l’album</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
    hydrate();
  }
  function albCover(b){ document.querySelectorAll('#al-cov .jr-ph').forEach(x=>x.classList.add('off')); b.classList.remove('off'); M.album.cover = b.dataset.p; persist(); }
  async function albumGo(){
    const A = M.album, g = id => document.getElementById(id);
    Object.assign(A, {titre:(document.querySelector('[name=al_titre]')||{}).value || A.titre, sous:(document.querySelector('[name=al_sous]')||{}).value || '', theme:g('al-theme').value, serif:+g('al-serif').value, lay:g('al-lay').value,
      carte:g('al-carte').checked?1:0, chiffres:g('al-chiffres').checked?1:0, jours:g('al-jours').checked?1:0, recits:g('al-recits').checked?1:0}); persist();
    pdfBusy('Mise en page de l’album…');
    try {
      const L = await loadPdfLib(), th = ALB_THEMES[A.theme] || ALB_THEMES.nuit, C = a => L.rgb(a[0], a[1], a[2]), t = trip();
      const pdf = await L.PDFDocument.create(); pdf.setTitle(A.titre); pdf.setCreator('Vezoria');
      const F = A.serif ? {r: await pdf.embedFont(L.StandardFonts.TimesRoman), b: await pdf.embedFont(L.StandardFonts.TimesRomanBold), i: await pdf.embedFont(L.StandardFonts.TimesRomanItalic)}
                        : {r: await pdf.embedFont(L.StandardFonts.Helvetica), b: await pdf.embedFont(L.StandardFonts.HelveticaBold), i: await pdf.embedFont(L.StandardFonts.HelveticaOblique)};
      const W = 595.28, H = 841.89, Mg = 46; let pg = null, y = 0, n = 0;
      const page = () => { pg = pdf.addPage([W, H]); n++; pg.drawRectangle({x:0, y:0, width:W, height:H, color:C(th.bg)}); y = H - Mg;
        if(n > 1){ const f = pdf1(A.titre) + '  ·  ' + n; pg.drawText(f, {x:W/2 - F.i.widthOfTextAtSize(f, 8)/2, y:22, size:8, font:F.i, color:C(th.acc)}); } };
      const wrap = pdfWrap;
      const center = (s, f, sz, yy, col) => { const tx = pdf1(s); pg.drawText(tx, {x:W/2 - f.widthOfTextAtSize(tx, sz)/2, y:yy, size:sz, font:f, color:col || C(th.ink)}); };
      const para = (s, f, sz, col, w) => { w = w || W - 2*Mg; wrap(s, f, sz, w).forEach(l=>{ if(y < Mg + sz*1.5) page(); pg.drawText(l, {x:(W - w)/2, y:y - sz, size:sz, font:f, color:col || C(th.ink)}); y -= sz*1.45; }); };
      const emb = new Map(), embed = async id => { if(emb.has(id)) return emb.get(id); const b = await photoBlob(id) || await photoBlob(id + '.t'); let im = null; if(b){ try { im = await pdf.embedJpg(await jpgBytes(b)); } catch(e){} } emb.set(id, im); return im; };
      const getPg = () => pg;
      const cover = (im, x, yy, w, h) => { const r = Math.max(w/im.width, h/im.height), dw = im.width*r, dh = im.height*r;
        pg.pushOperators(L.pushGraphicsState(), L.rectangle(x, yy, w, h), L.clip(), L.endPath());
        pg.drawImage(im, {x:x + (w-dw)/2, y:yy + (h-dh)/2, width:dw, height:dh}); pg.pushOperators(L.popGraphicsState()); };
      const frame = (im, x, yy, w, h) => { pg.drawRectangle({x:x-4, y:yy-4, width:w+8, height:h+8, color:C(th.soft)}); cover(im, x, yy, w, h); };
      const sv = souvs(), photos = sv.flatMap(s=>(s.photos||[]).filter(p=>!(M.jrOff||{})[p]).map(p=>({p, s})));
      // 1. couverture
      page(); const cv = await embed(A.cover || (photos[0] && photos[0].p));
      if(cv){ cover(cv, 0, 0, W, H); pg.drawRectangle({x:0, y:0, width:W, height:300, color:L.rgb(0,0,0), opacity:0.45}); }
      const tc = cv ? L.rgb(1,1,1) : C(th.ink);
      wrap(A.titre, F.b, 40, W - 2*Mg).forEach((l,i,a)=>center(l, F.b, 40, 170 + (a.length-1-i)*46, tc));
      if(A.sous) center(A.sous, F.i, 15, 136, cv ? L.rgb(.95,.9,.8) : C(th.acc));
      center(tv().map(pname).join('  ·  '), F.r, 11, 104, cv ? L.rgb(.95,.95,.95) : C(th.ink));
      pg.drawLine({start:{x:W/2-40, y:92}, end:{x:W/2+40, y:92}, thickness:1, color:cv ? L.rgb(1,1,1) : C(th.acc)});
      // 2. carte + chiffres
      if(A.carte || A.chiffres){ page(); center('Le voyage', F.b, 26, y - 20); y -= 60;
        if(A.carte){ pdfSay('Carte du voyage…'); const c = await tripMapCanvas(700, 470); if(c){ const im = await pdf.embedJpg(new Uint8Array(await (await new Promise(r=>c.toBlob(r,'image/jpeg',.88))).arrayBuffer())); const w = W - 2*Mg, h = w*c.height/c.width; frame(im, Mg, y - h, w, h); y -= h + 30; } }
        if(A.chiffres){ const st = [[dayList().length,'jours'], [tlStages().length,'étapes'], [sv.length,'souvenirs'], [photos.length,'photos']], cw = (W - 2*Mg)/4;
          st.forEach(([v,l0],i)=>{ const x = Mg + i*cw + cw/2, vs = String(v), l = pdf1(l0); pg.drawText(vs, {x:x - F.b.widthOfTextAtSize(vs, 30)/2, y:y - 34, size:30, font:F.b, color:C(th.acc)}); pg.drawText(l, {x:x - F.i.widthOfTextAtSize(l, 11)/2, y:y - 52, size:11, font:F.i, color:C(th.ink)}); });
          y -= 80; } }
      // 3. chapitres / photos
      if(A.lay === 'magazine' || A.lay === 'polaroid'){
        pdfSay('Montage des pages…');
        await albumMagazine({pdf, L, page, W, H, Mg, th, C, F, embed, getPg}, photos.slice().sort((a,b)=>(a.s.date||'').localeCompare(b.s.date||'')), A.lay, A.recits);
        page(); y = H/2 + 40; center('Fin', F.b, 30, y, C(th.acc)); center('Album créé avec Vezoria · ' + new Date().toLocaleDateString((window.I18N ? I18N.locale : 'fr-FR'), {month:'long', year:'numeric'}), F.i, 11, y - 34);
        pdfReady(new File([await pdf.save()], pdfName('album', t), {type:'application/pdf'})); return;
      }
      const groups = A.jours ? dayList().map((d,i)=>({titre:`Jour ${i+1}`, sub:longDate(d) + (dayInfo(d).titre ? ' · ' + dayInfo(d).titre : ''), sv: sv.filter(s=>s.date===d)})).filter(g=>g.sv.length) : [{titre:'', sub:'', sv}];
      const per = A.lay === 'grande' ? 1 : A.lay === 'duo' ? 2 : A.lay === 'mosa' ? 4 : 1;
      for(const gp of groups){
        pdfSay(gp.titre ? gp.titre + '…' : 'Photos…');
        if(gp.titre){ page(); y -= 120; center(gp.titre, F.b, 34, y, C(th.acc)); y -= 30; center(gp.sub, F.i, 14, y); y -= 26; pg.drawLine({start:{x:W/2-30, y}, end:{x:W/2+30, y}, thickness:1, color:C(th.acc)}); y -= 30;
          if(A.recits) gp.sv.forEach(s=>{ if(s.titre) { if(y < 120) page(); center(s.titre, F.b, 15, y - 15); y -= 26; } if(s.texte) para(s.texte, F.r, 11.5, null, W - 2*Mg - 40); y -= 10; }); }
        const ps = gp.sv.flatMap(s=>(s.photos||[]).filter(p=>!(M.jrOff||{})[p]).map(p=>({p, s})));
        if(A.lay === 'magazine' || A.lay === 'polaroid'){ await albumMagazine({pdf, L, page, W, H, Mg, th, C, F, embed, getPg}, ps, A.lay); continue; }
        for(let k=0; k<ps.length; k+=per){
          page(); const box = {x:Mg, y:Mg + 20, w:W - 2*Mg, h:H - 2*Mg - 30};
          const cells = per === 1 ? [[0,0,1,1]] : per === 2 ? [[0,.51,1,.49],[0,0,1,.49]] : [[0,.51,.49,.49],[.51,.51,.49,.49],[0,0,.49,.49],[.51,0,.49,.49]];
          for(let j=0; j<per && k+j<ps.length; j++){ const im = await embed(ps[k+j].p); if(!im) continue; const [cx,cy,cw,ch] = cells[j];
            frame(im, box.x + cx*box.w, box.y + cy*box.h + (per===1 ? 26 : 0), cw*box.w, ch*box.h - (per===1 ? 26 : 0));
            if(per === 1 && (ps[k+j].s.titre || ps[k+j].s.lieu)) center([ps[k+j].s.titre, ps[k+j].s.lieu].filter(Boolean).map(pdf1).join(' · '), F.i, 12, box.y + 2); }
        }
      }
      // 4. fin
      page(); y = H/2 + 40; center('Fin', F.b, 30, y, C(th.acc)); center('Album créé avec Vezoria · ' + new Date().toLocaleDateString((window.I18N ? I18N.locale : 'fr-FR'), {month:'long', year:'numeric'}), F.i, 11, y - 34);
      pdfReady(new File([await pdf.save()], pdfName('album', t), {type:'application/pdf'}));
    } catch(e){ pdfSay('⚠️ ' + e.message); }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     💾 SAUVEGARDE COMPLÈTE EN ZIP (données + photos + billets), comme l'export Polarsteps
     ══════════════════════════════════════════════════════════════════════════ */
  const CRC_T = (()=>{ const t = new Uint32Array(256); for(let n=0;n<256;n++){ let c = n; for(let k=0;k<8;k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u8 => { let c = 0xFFFFFFFF; for(let i=0;i<u8.length;i++) c = CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  // ZIP « stocké » : les JPEG/PDF sont déjà compressés, on les range tels quels (rapide, sans bibliothèque)
  async function zipBuild(files){
    const parts = [], central = []; let off = 0;
    const dosT = d => ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF, dosD = d => (((d.getFullYear() - 1980) << 9) | ((d.getMonth()+1) << 5) | d.getDate()) & 0xFFFF;
    const now = new Date();
    for(const f of files){
      const name = new TextEncoder().encode(f.name); let data = f.data; if(!data && f.blob) data = new Uint8Array(await f.blob.arrayBuffer()); const crc = crc32(data), part = f.blob || data;
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, dosT(now), true); lh.setUint16(12, dosD(now), true); const len = data.length; lh.setUint32(14, crc, true); lh.setUint32(18, len, true); lh.setUint32(22, len, true);
      lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(lh.buffer, name, part); data = null;
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, dosT(now), true); ch.setUint16(14, dosD(now), true); ch.setUint32(16, crc, true); ch.setUint32(20, len, true); ch.setUint32(24, len, true);
      ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
      central.push(ch.buffer, name);
      off += 30 + name.length + (f.blob ? f.blob.size : f.data.length);
    }
    const csize = central.reduce((s,b)=>s + b.byteLength, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csize, true); end.setUint32(16, off, true);
    return new Blob([...parts, ...central, end.buffer], {type:'application/zip'});
  }
  // Lecture d’un ZIP par morceaux (sans charger tout le fichier en mémoire : les grosses sauvegardes passent aussi sur iPhone)
  async function zipRead(blob){
    const rd = async (a, b) => new Uint8Array(await blob.slice(a, b).arrayBuffer());
    const tailN = Math.min(blob.size, 65557), tail = await rd(blob.size - tailN, blob.size), tv = new DataView(tail.buffer);
    let e = tail.length - 22; while(e >= 0 && tv.getUint32(e, true) !== 0x06054b50) e--; if(e < 0) throw new Error('fichier ZIP illisible');
    const n = tv.getUint16(e + 10, true), cdSize = tv.getUint32(e + 12, true), cdOff = tv.getUint32(e + 16, true), out = {};
    const cd = await rd(cdOff, cdOff + cdSize), dv = new DataView(cd.buffer); let p = 0;
    for(let i = 0; i < n && p + 46 <= cd.length; i++){
      const meth = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(cd.subarray(p + 46, p + 46 + nl));
      if(meth === 0 || meth === 8) out[name] = async () => {
        const lh = await rd(lo, lo + 30), lv = new DataView(lh.buffer), ds = lo + 30 + lv.getUint16(26, true) + lv.getUint16(28, true), part = blob.slice(ds, ds + csz);
        return meth === 0 ? new Uint8Array(await part.arrayBuffer()) : new Uint8Array(await new Response(part.stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      };
      p += 46 + nl + el + cl;
    }
    return out;
  }
  function zipSheet(){
    const nRec = Object.values(R).filter(r=>!r.demo).length;
    openSheet(`<h2>💾 Sauvegarde complète</h2>
      <div class="v-sum-small" style="margin-bottom:8px">Tout ton carnet dans <b>un seul fichier ZIP</b> : voyages, fiches, souvenirs, steps, traces, profils, <b>photos</b> et <b>billets PDF</b>. À garder dans Fichiers / iCloud / Drive, ou pour passer sur un nouveau téléphone.</div>
      <label class="cv-checkline"><input type="checkbox" id="zp-ph" checked> Inclure les photos</label>
      <label class="cv-checkline"><input type="checkbox" id="zp-thumb"> Vignettes seulement (fichier bien plus léger)</label>
      <label class="cv-checkline"><input type="checkbox" id="zp-pdf" checked> Inclure les billets PDF</label>
      <label class="cv-checkline"><input type="checkbox" id="zp-codes"> Inclure mes codes de partage (pour tout retrouver sur un nouveau téléphone — garde alors le fichier en lieu sûr)</label>
      <div id="zp-msg" class="v-sum-small" style="margin:6px 0">${nRec} fiche(s).</div>
      <button type="button" class="v-btn" onclick="CV.zipExport()">📦 Créer la sauvegarde ZIP</button>
      <button type="button" class="v-btn sec" onclick="CV.zipImport()">📥 Restaurer une sauvegarde ZIP</button>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  let zipJob = null;
  async function zipExport(){
    const msg = m => { const e = document.getElementById('zp-msg'); if(e) e.textContent = m; };
    const withPh = document.getElementById('zp-ph').checked, withPdf = document.getElementById('zp-pdf').checked, withCodes = document.getElementById('zp-codes').checked, thumb = (document.getElementById('zp-thumb')||{}).checked;
    const recs = Object.values(R).filter(r=>!r.demo), te_ = new TextEncoder(), ids = new Set(), pdfs = new Set();
    // photos des fiches supprimées (souvenirs remplacés…) : pas dans la sauvegarde
    recs.filter(r=>!r.deleted).forEach(r=>{ (r.photos||[]).forEach(p=>ids.add(p)); if(r.recu) ids.add(r.recu); if(r.preuve) ids.add(r.preuve); (r.pj||[]).forEach(p=>(p.t==='pdf' ? pdfs : ids).add(p.id)); });
    const entries = [];
    if(withPh) ids.forEach(id=>(thumb ? [id + '.t'] : [id, id + '.t']).forEach(v=>entries.push({name:'photos/' + v + '.jpg', id:v})));
    if(withPdf) pdfs.forEach(id=>entries.push({name:'docs/' + id + '.pdf', id}));
    const meta = {me:M.me, trip:M.trip, ...(withCodes ? {sync:{url:M.sync.url, code:M.sync.code, on:M.sync.on}, spaces:(M.spaces||[]).map(x=>({code:x.code})), tripSpace:M.tripSpace||{}} : {})};
    zipJob = {entries, i:0, part:1, ok:0, skip:0, per: thumb ? 1 : 2, nph: (withPh ? ids.size : 0) + (withPdf ? pdfs.size : 0), stamp:isoToday(), head:[
      {name:'LISEZMOI.txt', data:te_.encode(`Sauvegarde Vezoria du ${new Date().toLocaleString((window.I18N ? I18N.locale : 'fr-FR'))}\n${recs.length} fiches.\nRestaurer : Partage & profils → 💾 Sauvegarde complète → Restaurer (choisis toutes les parties d’un coup ou l’une après l’autre).\n`)},
      {name:'carnet.json', data:te_.encode(JSON.stringify({app:'carnet-voyage', format:3, exportedAt:new Date().toISOString(), meta, records:recs}))}]};
    msg('📦 Préparation…'); zipNext();
  }
  async function zipNext(){
    const J = zipJob; if(!J) return; const LIMIT = 120 * 1048576, files = J.part === 1 ? J.head.slice() : [{name:'partie.txt', data:new TextEncoder().encode('Vezoria — partie ' + J.part)}];
    let size = 0; const msg = m => { const e = document.getElementById('zp-msg'); if(e) e.textContent = m; else toast(m); };
    while(J.i < J.entries.length && size < LIMIT){
      const en = J.entries[J.i++]; if(J.i % 15 === 0) msg(`📸 Photos : ${Math.ceil(J.i / J.per)} / ${J.nph}…`);
      try { const b = await photoBlob(en.id); if(!b){ J.skip++; continue; } const u8 = new Uint8Array(await b.arrayBuffer()); files.push({name:en.name, data:u8}); size += u8.length; J.ok++; }
      catch(e){ J.skip++; }
    }
    const zip = await zipBuild(files), last = J.i >= J.entries.length, name = `carnet-sauvegarde-${J.stamp}${J.part > 1 || !last ? '-partie' + J.part : ''}.zip`;
    J.file = new File([zip], name, {type:'application/zip'});
    openSheet(`<h2>💾 Sauvegarde ${last && J.part === 1 ? 'prête' : '— partie ' + J.part}</h2>
      <div class="v-sum-small" style="margin-bottom:10px"><b>${esc(name)}</b> · ${(zip.size/1048576).toFixed(1)} Mo${J.skip ? ` · ${J.skip} fichier(s) introuvable(s) ignoré(s)` : ''}.<br>${last ? 'C’est la dernière partie.' : 'Il reste des photos : enregistre cette partie, la suivante se prépare ensuite.'}</div>
      <button type="button" class="v-btn" onclick="CV.zipSavePart()">💾 Enregistrer ${last && J.part === 1 ? 'la sauvegarde' : 'la partie ' + J.part}</button>
      <div id="zp-msg" class="v-sum-small" style="margin-top:6px"></div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.zipCancel()">Arrêter</button></div>`, true);
  }
  async function zipSavePart(){
    const J = zipJob; if(!J || !J.file) return;
    await tlShareFile(J.file, J.file.name, 'Sauvegarde Vezoria'); J.file = null;
    if(J.i < J.entries.length){ J.part++; const e = document.getElementById('zp-msg'); if(e) e.textContent = '📦 Préparation de la partie ' + J.part + '…'; zipNext(); }
    else { M.zipLast = Date.now(); persist(); zipJob = null; closeSheet(true); toast(`💾 Sauvegarde terminée (${J.part} partie${J.part>1?'s':''}, ${J.ok} fichiers)`); }
  }
  function zipCancel(){ zipJob = null; closeSheet(true); }
  function zipImport(){
    const i = document.createElement('input'); i.type = 'file'; i.multiple = true; if(!isIOSDev) i.accept = '.zip,application/zip,application/x-zip-compressed';   // iPhone : sans filtre, sinon les ZIP enregistrés dans Fichiers restent grisés
    i.style.cssText = 'position:fixed;left:-1000px;top:0;opacity:0'; document.body.appendChild(i);
    i.addEventListener('change', async () => { const fs = [...(i.files||[])].sort((a,b)=>a.name.localeCompare(b.name, 'fr', {numeric:true})); setTimeout(()=>i.remove(), 1000); for(const f of fs) await zipRestore(f, fs.length > 1); if(fs.length > 1) alert('💾 ' + fs.length + ' parties restaurées.'); });
    i.click();
  }
  async function zipRestore(f, multi){
    const msg = m => { const e = document.getElementById('zp-msg'); if(e) e.textContent = m; else toast(m); };
    try {
      msg('📂 Lecture de la sauvegarde…');
      const z = await zipRead(f), get = async n => { const v = z[n]; return typeof v === 'function' ? await v() : v; };
      const main = await get('carnet.json');
      if(!main){ if(!z['partie.txt']) throw new Error('ce ZIP n’est pas une sauvegarde du carnet'); let nf = 0;
        for(const k of Object.keys(z).filter(k=>/^(photos|docs)\//.test(k))){ const id = k.replace(/^(photos|docs)\//,'').replace(/\.(jpg|pdf)$/,''); const ex = await IDB.get(id).catch(()=>null); if(ex && ex.blob) continue; const u8 = await get(k); if(u8){ await IDB.put({id, blob:new Blob([u8], {type: k.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'}), up:0}); nf++; } }
        toast('📸 ' + nf + ' photo(s) restaurée(s) depuis ' + f.name); refresh(); return; }
      const data = JSON.parse(new TextDecoder().decode(main)); if(data.app !== 'carnet-voyage') throw new Error('ce ZIP n’est pas une sauvegarde du carnet');
      const replace = Object.values(R).some(r=>!r.demo && r.type!=='profile') && (await uiConfirm(`Sauvegarde du ${new Date(data.exportedAt).toLocaleString((window.I18N ? I18N.locale : 'fr-FR'))} : ${data.records.length} fiches.\n\nOK = REMPLACER tout le carnet de ce téléphone par la sauvegarde.\nAnnuler = FUSIONNER (garder les deux ; la version la plus récente de chaque fiche gagne).`));
      if(replace) Object.keys(R).forEach(id=>{ if(!R[id].demo) delete R[id]; });
      let n = 0; data.records.forEach(r=>{ if(!r || !r.id) return; const cur = R[r.id]; if(cur && cur.deleted && !r.deleted){ r = Object.assign({}, r, {updatedAt: Date.now()}); R[r.id] = r; markDirty(r.id); n++; return; } if(!cur || (r.updatedAt||0) >= (cur.updatedAt||0)){ R[r.id] = r; markDirty(r.id); n++; } });
      let nf = 0, nh = 0; const names = Object.keys(z).filter(k=>/^(photos|docs)\//.test(k));
      for(const k of names){ const id = k.replace(/^(photos|docs)\//,'').replace(/\.(jpg|pdf)$/,''); const ex = await IDB.get(id).catch(()=>null); if(ex && ex.blob){ nh++; continue; }
        const u8 = await get(k); if(!u8) continue; await IDB.put({id, blob:new Blob([u8], {type: k.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'}), up:0}); nf++;
        if(!k.endsWith('.pdf')){ M.pq = M.pq || []; if(!M.pq.includes(id)) M.pq.push(id); }
        if(nf % 20 === 0) msg(`📸 ${nf} / ${names.length} fichiers…`); }
      const mt = data.meta || {};
      if(mt.me && R[mt.me] && (!M.me || replace)) M.me = mt.me;
      if(mt.sync && mt.sync.code && (!M.sync.code || replace) && (await uiConfirm('La sauvegarde contient tes codes de partage. Les réactiver sur ce téléphone ?'))){
        M.sync.url = mt.sync.url || M.sync.url; M.sync.code = mt.sync.code; M.sync.on = !!mt.sync.on; M.sync.since = 0;
        M.spaces = (mt.spaces||[]).map(x=>({code:x.code, since:0, dirty:[], last:0, err:''})); M.tripSpace = mt.tripSpace || {};
      }
      if(!M.trip || !R[M.trip]){ const t = trips()[0]; if(t) M.trip = t.id; }
      persist(); closeSheet(true); applyMode(); queueSync(); uploadQueue();
      const MSG = x => (window.I18N && I18N.msg ? I18N.msg(x) : x);
      const why = (!n && !nf ? '\n\n' + MSG('Rien de nouveau : tout ce que contient ce fichier est déjà sur ce téléphone.') : '') + (nh ? '\n' + MSG(`${nh} photo(s) déjà sur ce téléphone, gardées telles quelles.`) : '');
      if(multi) toast(`💾 ${n} fiche(s), ${nf} photo(s)`); else alert(MSG(`💾 Sauvegarde restaurée : ${n} fiche(s), ${nf} photo(s)/PDF.`) + why);
    } catch(e){ msg('⚠️ ' + e.message); if(!document.getElementById('zp-msg')) alert('Import impossible : ' + (e.message || e)); }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     🌍 CARTE DU MONDE « WAOUH » : globe étoilé qui tourne, pays visités colorés,
     carrousel des voyages, vol jusqu'au voyage choisi, frise des steps, « ▶ Revivre le voyage »
     ══════════════════════════════════════════════════════════════════════════ */
  let wm = null;
  var wmFont = ['Noto Sans Bold'];
  function loadCss(href){ return new Promise(res=>{ if(document.querySelector(`link[href="${href}"]`)) return res(); const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.onload = res; l.onerror = res; document.head.appendChild(l); }); }
  function loadJs(src){ return new Promise((res, rej)=>{ const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = ()=>rej(new Error('carte 3D indisponible (pas de réseau ?)')); document.head.appendChild(s); }); }
  const wmInfo = h => { const i = document.getElementById('wm-info'); if(i) i.innerHTML = h; };
  async function worldMap(){
    let ov = document.getElementById('cv-world');
    if(wm && wm.map && ov && ov.innerHTML){ ov.style.display = 'block'; document.body.style.overflow = 'hidden'; try { wm.map.resize(); } catch(e){} worldRefresh(); return; }
    if(!ov){ ov = document.createElement('div'); ov.id = 'cv-world'; document.body.appendChild(ov); }
    ov.innerHTML = `<div class="wm-stars"></div><div id="wm-map"></div>
      <div class="wm-top"><button type="button" class="wm-x" onclick="CV.worldClose()" aria-label="Fermer">✕</button>
        <div class="wm-seg"><button type="button" class="on" data-m="trips" onclick="CV.worldMode('trips')">🧳 Voyages</button><button type="button" data-m="photos" onclick="CV.worldMode('photos')">📸 Photos</button><button type="button" data-m="pays" onclick="CV.worldMode('pays')">🏳️ Pays</button></div><button type="button" class="wm-new" onclick="CV.worldPlan()">✨ Nouveau</button></div>
      <div class="wm-chips" id="wm-chips"></div>
      <div class="wm-story" id="wm-story" hidden></div>
      <div class="wm-bottom"><div class="wm-info" id="wm-info">🌍 Chargement du globe…</div><div class="wm-car" id="wm-car"></div></div>`;
    ov.style.display = 'block'; document.body.style.overflow = 'hidden';
    try {
      await loadCss((window.VZ_B || '') + 'vendor/maplibre-gl.css');
      if(!window.maplibregl) await loadJs((window.VZ_B || '') + 'vendor/maplibre-gl.js');
      // Globe : NASA Blue Marble (domaine public), plan OpenFreeMap en zoom proche, noms et frontières OpenFreeMap (libre, sans clé)
      const style = {version:8, projection:{type:'globe'},
        sources:{
          sat:{type:'raster', tiles:['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'], tileSize:256, maxzoom:8, attribution:'NASA Blue Marble (GIBS)'}},
        layers:[{id:'sat', type:'raster', source:'sat', paint:{'raster-saturation':0.1, 'raster-contrast':0.06}}],
        sky:{'sky-color':'#0b1a3a', 'horizon-color':'#5fa8ff', 'fog-color':'#0b1a3a', 'sky-horizon-blend':0.6, 'horizon-fog-blend':0.4, 'fog-ground-blend':0.2, 'atmosphere-blend':['interpolate',['linear'],['zoom'],0,1,5,1,7,0]}};
      wmFont = ['Noto Sans Bold'];
      try {
        const lib = await withTimeout(fetch('https://tiles.openfreemap.org/styles/liberty').then(r=>r.json()), 6000);
        const vs = Object.entries(lib.sources||{}).find(([,v])=>v.type==='vector');
        if(lib.glyphs && vs){
          style.glyphs = lib.glyphs; style.sources.ofm = vs[1]; style.layers.push(...ofmBase(lib, vs[0], 7));
          const lang = (l => /^(ar|hi)$/.test(l) ? 'en' : l)((window.I18N && I18N.lang) || 'fr');   // la carte 3D ne sait pas dessiner l’arabe ni le hindi : noms en anglais
          const keep = (lib.layers||[]).filter(l=>l.source===vs[0] && ((l.type==='symbol' && l['source-layer']==='place' && /country|city|town|state|capital/.test(l.id)) || (l.type==='line' && l['source-layer']==='boundary')));
          keep.forEach(l=>{ const x = JSON.parse(JSON.stringify(l)); x.source = 'ofm';
            if(x.type==='symbol'){ if(!/country|state/.test(x.id)) x.maxzoom = Math.min(x.maxzoom || 24, 8.5);
              x.layout = Object.assign({}, x.layout, {'text-field':['coalesce',['get','name:' + lang],['get','name:latin'],['get','name']]});
              if(x.layout['text-font']) wmFont = x.layout['text-font'];
              x.paint = Object.assign({}, x.paint, {'text-color':'#ffffff', 'text-halo-color':'rgba(10,20,50,.85)', 'text-halo-width':1.4}); }
            else x.paint = Object.assign({}, x.paint, {'line-color':'rgba(255,255,255,.55)'});
            style.layers.push(x); });
        }
      } catch(e){ /* pas de noms : le globe reste utilisable */ }
      const map = new maplibregl.Map({container:'wm-map', style, center:[8, 38], zoom:1.6, pitch:0, attributionControl:{compact:true}, maxPitch:60, maxZoom:14,
        pixelRatio:Math.min(2, window.devicePixelRatio || 1), maxTileCacheSize:80, fadeDuration:0, refreshExpiredTiles:false,
        interactive:true, dragPan:true, dragRotate:true, scrollZoom:true, touchZoomRotate:true, touchPitch:true, doubleClickZoom:true, keyboard:true, cooperativeGestures:false});
      map.addControl(new maplibregl.NavigationControl({visualizePitch:true}), 'top-right');
      wm = {map, markers:[], mode:'trips', spin:true, sel:null, play:null};
      document.getElementById('cv-world').classList.add('wm-wait');
      map.on('load', async ()=>{
        try { await worldData(); worldMode('trips'); worldCarousel(); } finally { const o = document.getElementById('cv-world'); if(o) o.classList.remove('wm-wait'); }
        if(wantPlan){ wantPlan = false; setTimeout(worldPlan, 300); }
        else { const f = wantFly || ((trip() && tripPhase(trip()) === 'live') ? M.trip : null); wantFly = null; if(f) setTimeout(()=>worldFly(f), 600); }
        spinGlobe();
      });
    } catch(e){ wmInfo('⚠️ ' + esc(e.message)); }
  }
  function spinGlobe(){
    if(!wm) return; const map = wm.map, el = map.getContainer();
    // l'utilisateur touche la carte : on arrête simplement la rotation (sans bloquer ses gestes)
    const off = () => { if(wm) wm.spin = false; };
    ['pointerdown','touchstart','wheel'].forEach(ev=>el.addEventListener(ev, off, {passive:true}));
    ['dragstart','zoomstart','rotatestart','pitchstart'].forEach(ev=>map.on(ev, e=>{ if(e && e.originalEvent) off(); }));
    const step = () => { if(!wm || !wm.spin || map.getZoom() > 3.2 || map.isMoving()) return; const c = map.getCenter(); c.lng -= 5; map.easeTo({center:c, duration:1000, easing:n=>n}); };
    map.on('moveend', ()=>{ if(wm && wm.spin) step(); }); step();
  }
  function worldCarousel(){
    const c = document.getElementById('wm-car'); if(!c || !wm) return;
    c.innerHTML = wm.data.trips.map(t=>`<button type="button" class="wm-card${wm.sel===t.id?' on':''}" data-id="${t.id}" onclick="CV.worldFly('${t.id}')"><span class="im">${t.photo ? `<img data-ph="${esc(t.photo)}.t" alt="">` : '<i>🧳</i>'}</span><span class="tx"><b>${esc(t.titre)}</b><small>${esc(t.dates)}</small><small>${t.steps.length} step${t.steps.length>1?'s':''} · ${Math.round(t.km).toLocaleString((window.I18N ? I18N.locale : 'fr-FR'))} km${t.phase==='live' ? ' · <em>en cours</em>' : ''}</small></span></button>`).join('') || '<div class="wm-empty">Ajoute des hébergements ou des steps 📍 pour voir tes voyages ici.</div>';
    hydrate();
  }
  function bounds(pts){ const b = new maplibregl.LngLatBounds(); pts.forEach(p=>b.extend([p.lng, p.lat])); return b; }
  function worldFly(id){
    if(!wm || !wm.data || !wm.map.getLayer('routes')) return; const t = wm.data.trips.find(x=>x.id===id); if(!t) return;
    { const ov = document.getElementById('cv-world'); if(!ov || ov.style.display === 'none' || !ov.offsetWidth) return; }   // globe refermé entre-temps : pas de vol (MapLibre plantait sur une carte cachée)
    wm.spin = false; wm.sel = id; stopStory();
    document.querySelectorAll('.wm-card').forEach(b=>b.classList.toggle('on', b.dataset.id===id));
    const card = document.querySelector(`.wm-card[data-id="${id}"]`), car = document.getElementById('wm-car');
    if(card && car) car.scrollTo({left:Math.max(0, card.offsetLeft - (car.clientWidth - card.offsetWidth) / 2), behavior:'smooth'});
    { const o = document.getElementById('cv-world'); if(o){ o.scrollLeft = 0; o.scrollTop = 0; } }
    try { wm.map.setPaintProperty('routes', 'line-opacity', ['case',['==',['get','id'],id],1,0.25]); wm.map.setPaintProperty('routes-glow', 'line-opacity', ['case',['==',['get','id'],id],0.7,0.1]); wm.map.setPaintProperty('routes', 'line-width', ['case',['==',['get','id'],id],3.6,2]); } catch(e){}
    const b = bounds(t.pts), single = t.pts.length < 2;
    if(single) wm.map.flyTo({center:[t.pts[0].lng, t.pts[0].lat], zoom:8, pitch:35, bearing:-15, duration:2600, essential:true});
    else wm.map.fitBounds(b, {padding:{top:110, bottom:230, left:40, right:40}, pitch:30, bearing:-10, duration:2600, maxZoom:9});
    wmInfo(`<b>${esc(t.titre)}</b> · ${esc(t.dates)}${t.steps.length ? `<div class="wm-tl"><button type="button" class="wm-play" onclick="CV.worldStory('${id}')">▶ Revivre le voyage</button><button type="button" class="wm-play" onclick="CV.flyover('${id}')">🎥 Survol 3D</button><input type="range" min="0" max="${t.steps.length-1}" value="0" oninput="CV.worldStep('${id}', this.value)" aria-label="Frise des steps"></div>` : '<br><small>Ajoute des steps 📍 pour la frise et « Revivre le voyage ».</small>'}<button type="button" class="wm-open" onclick="CV.worldOpen('${id}')">Ouvrir ce voyage</button>`);
  }
  function stepCard(s){
    const box = document.getElementById('wm-story'); if(!box) return;
    box.hidden = false;
    box.innerHTML = `<button type="button" class="wm-sx" onclick="this.parentNode.hidden=true" aria-label="Fermer">✕</button>${s.ph ? `<button type="button" class="wm-sph" onclick="CV.view('${s.id}',0)"><img data-ph="${esc(s.ph)}" alt="">${s.n > 1 ? `<span>+${s.n-1}</span>` : ''}</button>` : ''}
      <div class="wm-stx"><b>${flag(s.cc)} ${esc(s.titre)}</b><small>${s.date ? fdate(s.date) : ''}${s.lieu && s.lieu !== s.titre ? ' · ' + esc(s.lieu) : ''}</small>${s.texte ? `<p>${esc(s.texte.slice(0,180))}${s.texte.length > 180 ? '…' : ''}</p>` : ''}</div>`;
    hydrate();
  }
  function worldStep(id, i){
    const t = wm && wm.data.trips.find(x=>x.id===id); if(!t) return; const s = t.steps[+i]; if(!s) return;
    wm.map.flyTo({center:[s.lng, s.lat], zoom:Math.max(7, Math.min(10, wm.map.getZoom())), pitch:40, bearing:(+i * 37) % 360 - 30, duration:1800, essential:true});
    stepCard(s);
  }
  /* ══════════ 🌍 Survol 3D : la caméra suit le trajet, les photos apparaissent à chaque étape ══════════ */
  let CI = null;
  const ciWait = ms => new Promise(r=>setTimeout(r, ms * ciSp));
  const ciBrg = (a, b) => { const r = Math.PI / 180, y = Math.sin((b.lng - a.lng) * r) * Math.cos(b.lat * r), x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lng - a.lng) * r); return Math.atan2(y, x) / r; };
  const ciZoom = d => d < 25 ? 11 : d < 120 ? 9.5 : d < 500 ? 8 : d < 1500 ? 6.5 : 5;
  async function flyover(id, rec, go){
    id = id || M.trip; if(!R[id]) return;
    if(ciOpt().mus !== 'off') try { filmAudioInit(); } catch(e){}   // dans le geste : sinon l’iPhone refuse le son
    cineStop();
    closeSheet(true); worldTrip(id);
    for(let k = 0; k < 160 && !(wm && wm.data && wm.data.trips && wm.map); k++) await ciWait(250);
    if(!wm || !wm.data){ alert('Le globe n’a pas pu se charger. Vérifie ta connexion et réessaie.'); return; }
    const t = wm.data.trips.find(x=>x.id===id);
    let seq = t ? (t.steps.length >= 2 ? t.steps : t.pts) : [];
    seq = seq.filter((p, i) => i === 0 || Math.abs(p.lat - seq[i-1].lat) + Math.abs(p.lng - seq[i-1].lng) > 0.001).map(s=>Object.assign({}, s));
    if(!seq.length){ alert('Pour le survol, ajoute des souvenirs avec un lieu ou des hébergements avec une ville.'); return; }
    const mine = (M.cineSteps || {})[id]; let pick = null;
    if(mine && mine.length){ const S = new Set(mine); pick = seq.filter(s=>S.has(ciKey(s))); if(!pick.length) pick = null; }
    pick = pick || ciAuto(seq);
    await ciPhotos(seq);
    const tt = Object.assign({}, t, {titre: ((M.cineTitle || {})[id]) || t.titre});
    if(go) return cineStart(tt, pick, !!rec, ciOpt());
    cinePre(t, seq, pick);
  }
  function flyoverRec(id){ flyover(id, true, 1); }
  /* ── 🌍 Survol 3D : réglages (vitesse, fond de carte, couleur, textes, étapes) ── */
  let ciSp = 1, ciLH = [], ciLR = [], CP = null;
  const CI_DEF = {sp:'n', map:'mix', col:'or', intro:1, cap:1, ph:1, names:1, end:1, sig:1, mus:'1'};
  // 🎵 musique du survol : mêmes morceaux libres de droits que le film
  let ciPrevT = null, ciMusOn = false;   // ciMusOn : la musique du survol joue (personne ne doit la mettre en pause)
  function ciMusic(o, on){
    if(!o || o.mus === 'off'){ if(FA && !(FM && FM.playing)) filmAudioStop(); return; }
    if(on) ciMusOn = true;
    if(!FA) filmAudioInit(); if(!FA) return;
    if(FA.ac && FA.ac.state === 'suspended') try { FA.ac.resume(); } catch(e){}
    const k = Math.max(0, (+o.mus || 1) - 1) % TRACKS.length;
    if(FA.k !== k || !FA.el.src){ FA.k = k; FA.el.src = TRACKS[k]; }
    if(on){ FA.on = true; filmAudioStart(); }
  }
  function ciMusicOff(){ clearTimeout(ciPrevT); ciMusOn = false; if(FA && !(FM && FM.playing)){ filmAudioStop(); setTimeout(()=>{ if(FA) FA.on = !M.filmMute; }, 1000); } }

  const CI_SP = {l:1.45, n:1, r:.62};
  const CI_COL = {or:['#ffd28a','#ffe2a8'], rose:['#ff4f8b','#ffc2d6'], cyan:['#38bdf8','#d4f1ff'], blanc:['#ffffff','#ffffff'], vert:['#4ade80','#d9fbe5']};
  const CI_BASE = {
    sat:{k:'sat', mz:18, from:3},
    sombre:{k:'dark', mz:16, from:0}};
  const ciOpt = () => Object.assign({}, CI_DEF, M.cineOpt || {});
  const ciKey = s => (+s.lat).toFixed(3) + ',' + (+s.lng).toFixed(3) + ',' + (s.date || '');
  const ciCred = o => ({sat:'Esri, Maxar · NASA · © OpenStreetMap', plan:'OpenFreeMap · © OpenMapTiles · © OpenStreetMap', sombre:'Esri · © OpenStreetMap'})[o.map] || 'NASA · OpenFreeMap · © OpenStreetMap';
  function ciAuto(seq){   // au-delà de 15 étapes : les plus belles, celles avec photo en priorité, dans l’ordre du voyage
    if(seq.length <= 15) return seq.slice();
    const keep = new Set([0, seq.length - 1]); const withPh = seq.map((s, i)=>[s, i]).filter(([s])=>s.ph).map(([, i])=>i);
    const pool = withPh.length >= 13 ? withPh : seq.map((s, i)=>i); const st = pool.length / 13; for(let k = 0; k < 13; k++) keep.add(pool[Math.floor(k * st)]);
    return [...keep].sort((a, b)=>a - b).map(i=>seq[i]);
  }
  // le fond de carte choisi (et les noms des villes) s’applique au globe, puis tout redevient comme avant à la fin
  function ciLook(o){
    if(!wm || !wm.map) return; const map = wm.map; ciLookOff();
    try {
      const b = CI_BASE[o.map];
      if(b){
        map.addSource('ci-base', Object.assign(esriML(b.k), {maxzoom:b.mz}));
        const first = (map.getStyle().layers || []).find(l=>l.type !== 'raster' && l.type !== 'background' && l.type !== 'sky');
        map.addLayer({id:'ci-base', type:'raster', source:'ci-base', minzoom:b.from, paint: b.from ? {'raster-opacity':['interpolate',['linear'],['zoom'],b.from,0,b.from + 2,1]} : {}}, first && first.id);
        (map.getStyle().layers || []).filter(l=>/^ofm-b-/.test(l.id) && (map.getLayoutProperty(l.id, 'visibility') || 'visible') === 'visible').forEach(l=>{ map.setLayoutProperty(l.id, 'visibility', 'none'); ciLH.push(l.id); });
      } else if(o.map === 'plan'){   // plan OpenFreeMap dès le zoom 0, puis retour au fondu habituel
        (map.getStyle().layers || []).filter(l=>/^ofm-b-/.test(l.id) && l.metadata && l.metadata.vzOp).forEach(l=>{
          map.setLayerZoomRange(l.id, l.metadata.vzMin || 0, 24); map.setPaintProperty(l.id, l.metadata.vzOp, l.metadata.vzOrig); ciLR.push(l); });
      }
      if(!o.names) (map.getStyle().layers || []).filter(l=>l.source === 'ofm' && l.type === 'symbol' && (map.getLayoutProperty(l.id, 'visibility') || 'visible') === 'visible')
        .forEach(l=>{ map.setLayoutProperty(l.id, 'visibility', 'none'); ciLH.push(l.id); });
    } catch(e){}
  }
  function ciLookOff(){
    if(!wm || !wm.map){ ciLH = []; ciLR = []; return; } const map = wm.map;
    try { if(map.getLayer('ci-base')) map.removeLayer('ci-base'); if(map.getSource('ci-base')) map.removeSource('ci-base'); } catch(e){}
    ciLH.forEach(l=>{ try { if(map.getLayer(l)) map.setLayoutProperty(l, 'visibility', 'visible'); } catch(e){} }); ciLH = [];
    ciLR.forEach(l=>{ try { if(map.getLayer(l.id)){ map.setLayerZoomRange(l.id, l.minzoom || 0, l.maxzoom || 24); map.setPaintProperty(l.id, l.metadata.vzOp, l.paint[l.metadata.vzOp]); } } catch(e){} }); ciLR = [];
  }
  // photo de chaque étape : celle choisie, sinon la première qui n’est pas déjà montrée à l’étape d’avant (même fichier = même taille)
  const ciSig = async id => { try { const o = await IDB.get(id); return o && o.blob ? o.blob.size + '|' + o.blob.type : 'i' + id; } catch(e){ return 'i' + id; } };
  async function ciPhotos(seq){
    const mine = M.cinePh || {}, seen = new Set();
    for(const s of seq){ const r = R[s.id], L = (r && r.photos) || []; if(!L.length) continue;
      if(mine[s.id] && L.includes(mine[s.id])){ s.ph = mine[s.id]; seen.add(await ciSig(s.ph)); continue; }
      for(const id of L.slice(0, 8)){ const g = await ciSig(id); if(!seen.has(g)){ s.ph = id; seen.add(g); break; } } }
  }
  function cinePhs(i){ if(!CP) return; CP.phOpen = CP.phOpen === i ? null : i; cinePreDraw(); }
  function cinePh(i, id){
    if(!CP) return; const s = CP.all[i]; if(!s) return; s.ph = id;
    M.cinePh = Object.assign({}, M.cinePh || {}, {[s.id]: id});
    CP.sel.add(ciKey(s)); M.cineSteps = Object.assign({}, M.cineSteps || {}, {[CP.t.id]: [...CP.sel]});
    try { persist(); } catch(e){}
    CP.phOpen = null; cinePreDraw();
  }
  function cinePre(t, all, pick){
    const w = document.getElementById('cv-world'); if(!w) return;
    stopStory(); wm.spin = false; w.classList.add('wm-cine');
    CP = {t, all, sel:new Set(pick.map(ciKey)), o:ciOpt(), title:((M.cineTitle || {})[t.id]) || t.titre || '', open:false};
    try { wm.map.flyTo({center:[pick[0].lng, pick[0].lat], zoom:2.3, pitch:0, bearing:0, duration:1600, essential:true}); } catch(e){}
    ciLook(CP.o);
    const ov = document.createElement('div'); ov.id = 'wm-cpre'; w.appendChild(ov);
    cinePreDraw();
  }
  function ciDur(){
    const o = CP.o, n = CP.all.filter(s=>CP.sel.has(ciKey(s))); let s = (o.intro ? 1.8 : .4) + 4.2 + 6.2;
    n.forEach((x, i)=>{ s += (x.ph && o.ph ? 2.9 : o.cap ? 1.7 : .5); const nx = n[i + 1]; if(nx) s += km(x, nx) > 800 ? 3.6 : 2.6; });
    s = Math.round(s * (CI_SP[o.sp] || 1)); return s < 60 ? `≈ ${s} s` : `≈ ${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`;
  }
  function cinePreDraw(){
    const el = document.getElementById('wm-cpre'); if(!el || !CP) return;
    const o = CP.o, n = CP.all.filter(s=>CP.sel.has(ciKey(s))).length, keepY = (el.querySelector('.cp-card') || {}).scrollTop || 0;
    const pool = imgPool(el), stripX = el.dataset.pho === String(CP.phOpen) ? ((el.querySelector('.cp-phs>div') || {}).scrollLeft || 0) : 0, again = !!el.querySelector('.cp-card');
    const ch = (k, v, lbl) => `<button type="button" class="cp-ch${String(o[k]) === String(v) ? ' on' : ''}" data-k="${k}" data-v="${v}" onclick="CV.cineSet(this)">${lbl}</button>`;
    const tg = (k, lbl) => `<button type="button" class="cp-ch cp-tg${o[k] ? ' on' : ''}" data-k="${k}" onclick="CV.cineSet(this)">${o[k] ? '✓ ' : ''}${lbl}</button>`;
    const sw = Object.entries(CI_COL).map(([k, c])=>`<button type="button" class="cp-sw${o.col === k ? ' on' : ''}" data-k="col" data-v="${k}" onclick="CV.cineSet(this)" style="background:${c[0]}" aria-label="${k}"></button>`).join('');
    const steps = CP.all.map((s, i)=>{ const on = CP.sel.has(ciKey(s)), nm = s.titre || s.city || s.lieu || '📍', L = ((R[s.id] || {}).photos) || [];
      const row = `<div class="cp-st${on ? ' on' : ''}"><button type="button" class="cp-tk" data-i="${i}" onclick="CV.cineStep(this)" aria-label="✓"><span class="cp-ck">${on ? '✓' : ''}</span></button>`
        + (s.ph ? `<button type="button" class="cp-th${CP.phOpen === i ? ' open' : ''}" onclick="CV.cinePhs(${i})"><img data-ph="${esc(s.ph)}.t" alt="">${L.length > 1 ? `<em>${L.length}</em>` : ''}</button>` : '<i>📍</i>')
        + `<button type="button" class="cp-tk cp-nm" data-i="${i}" onclick="CV.cineStep(this)"><b data-notr>${s.cc ? flag(s.cc) + ' ' : ''}${esc(nm)}</b>${s.date ? `<small data-notr>${esc(fdate(s.date))}</small>` : ''}</button></div>`;
      const strip = CP.phOpen === i && L.length ? `<div class="cp-phs"><small>Photo de cette étape dans le survol</small><div>${L.slice(0, 80).map(id=>`<button type="button" class="${id === s.ph ? 'on' : ''}" onclick="CV.cinePh(${i},'${esc(id)}')"><img data-ph="${esc(id)}.t" alt=""></button>`).join('')}</div></div>` : '';
      return row + strip; }).join('');
    el.innerHTML = `<div class="cp-card">
      <button type="button" class="ci-x cp-x" onclick="CV.cinePreX()" aria-label="Fermer">✕</button>
      <small class="cp-k">🌍 Survol 3D</small><b class="cp-t" id="cp-t" data-notr>${esc(CP.title || CP.t.titre)}</b>
      <div class="cp-sum"><span>${n} étape${n > 1 ? 's' : ''}</span> · <span>${ciDur()}</span></div>
      <div class="cp-opt"${CP.open ? '' : ' hidden'}>
        <label class="cp-l">Titre</label><input class="cp-in" data-k="title" maxlength="60" value="${esc(CP.title)}" placeholder="${esc(CP.t.titre)}" oninput="CV.cineSet(this)">
        <label class="cp-l">Vitesse</label><div class="cp-row">${ch('sp', 'l', '🐢 Lente')}${ch('sp', 'n', 'Normale')}${ch('sp', 'r', '⚡ Rapide')}</div>
        <label class="cp-l">Carte</label><div class="cp-row">${ch('map', 'mix', '🌍 Globe')}${ch('map', 'sat', '🛰️ Satellite')}${ch('map', 'plan', '🗺️ Plan')}${ch('map', 'sombre', '🌑 Sombre')}</div>
        <label class="cp-l">Couleur du trajet</label><div class="cp-row">${sw}</div>
        <label class="cp-l">Musique</label><div class="cp-row cp-mus">${ch('mus', 'off', '🔇 Sans')}${TRACK_N.map((n, k)=>ch('mus', String(k + 1), '🎵 ' + n)).join('')}</div>
        <label class="cp-l">Afficher</label><div class="cp-row">${tg('intro', 'Titre au début')}${tg('cap', 'Légendes des étapes')}${tg('ph', 'Photos')}${tg('names', 'Noms des villes')}${tg('end', 'Bilan à la fin')}${tg('sig', 'Signature Vezoria')}</div>
        <label class="cp-l">Étapes <span class="cp-n">${n} / ${CP.all.length}</span></label>
        <div class="cp-row"><button type="button" class="cp-ch" onclick="CV.cineSteps('all')">Toutes</button><button type="button" class="cp-ch" onclick="CV.cineSteps('auto')">✨ Les plus belles</button><button type="button" class="cp-ch" onclick="CV.cineSteps('ph')">📷 Avec photo</button></div>
        <div class="cp-steps">${steps}</div>
      </div>
      <div class="ci-btns"><button type="button" onclick="CV.cineGo(0)">▶ Lancer le survol</button>${cineCanRec() ? `<button type="button" onclick="CV.cineGo(1)">⏺ Enregistrer la vidéo</button>` : ''}
        <button type="button" onclick="CV.cineOpen()">${CP.open ? '✓ Fermer les réglages' : '⚙️ Personnaliser'}</button></div></div>`;
    imgReuse(el, pool); el.dataset.pho = String(CP.phOpen);
    const cd = el.querySelector('.cp-card'); if(cd){ if(again) cd.style.animation = 'none'; cd.scrollTop = keepY; }
    const sx = el.querySelector('.cp-phs>div'); if(sx && stripX) sx.scrollLeft = stripX;
    const mo = el.querySelector('.cp-mus .on'); if(mo) mo.parentNode.scrollLeft = Math.max(0, mo.offsetLeft - 40);
    hydrate();
  }
  function ciSave(){
    if(!CP) return; const id = CP.t.id;
    M.cineOpt = Object.assign({}, CP.o);
    M.cineTitle = Object.assign({}, M.cineTitle || {}); if(CP.title && CP.title !== CP.t.titre) M.cineTitle[id] = CP.title; else delete M.cineTitle[id];
    try { persist(); } catch(e){}
  }
  function cineSet(el){
    if(!CP) return; const k = el.dataset.k, v = el.dataset.v;
    if(k === 'title'){ CP.title = el.value.trim(); const b = document.getElementById('cp-t'); if(b) b.textContent = CP.title || CP.t.titre; ciSave(); return; }
    if(v === undefined) CP.o[k] = CP.o[k] ? 0 : 1; else CP.o[k] = v;
    if(k === 'map' || k === 'names') ciLook(CP.o);
    if(k === 'mus'){ clearTimeout(ciPrevT); if(v === 'off') ciMusicOff(); else { ciMusic(CP.o, true); ciPrevT = setTimeout(ciMusicOff, 8000); } }   // écoute de 8 s
    ciSave();
    const row = el.closest('.cp-row');
    if(row && v !== undefined){ row.querySelectorAll('[data-k="' + k + '"]').forEach(b=>b.classList.toggle('on', b.dataset.v === String(v))); cineSum(); return; }
    if(row && v === undefined){ el.classList.toggle('on', !!CP.o[k]); el.textContent = (CP.o[k] ? '✓ ' : '') + el.textContent.replace(/^✓ /, ''); cineSum(); return; }
    cinePreDraw();
  }
  function cineStep(el){
    if(!CP) return; const s = CP.all[+el.dataset.i]; if(!s) return; const k = ciKey(s);
    if(CP.sel.has(k)) CP.sel.delete(k); else CP.sel.add(k);
    M.cineSteps = Object.assign({}, M.cineSteps || {}, {[CP.t.id]: [...CP.sel]}); try { persist(); } catch(e){}
    const row = el.closest('.cp-st'); if(row){ const on = CP.sel.has(k); row.classList.toggle('on', on); const ck = row.querySelector('.cp-ck'); if(ck) ck.textContent = on ? '✓' : ''; cineSum(); return; }
    cinePreDraw();
  }
  // le résumé (nombre d’étapes, durée) seul, sans redessiner la carte
  function cineSum(){
    const el = document.getElementById('wm-cpre'); if(!el || !CP) return; const n = CP.all.filter(s=>CP.sel.has(ciKey(s))).length;
    const sm = el.querySelector('.cp-sum'); if(sm) sm.innerHTML = `<span>${n} étape${n > 1 ? 's' : ''}</span> · <span>${ciDur()}</span>`;
    const cn = el.querySelector('.cp-n'); if(cn) cn.textContent = n + ' / ' + CP.all.length;
  }
  function cineSteps(how){
    if(!CP) return;
    const L = how === 'all' ? CP.all : how === 'ph' ? CP.all.filter(s=>s.ph) : ciAuto(CP.all);
    if(!L.length){ alert('Aucune étape avec photo dans ce voyage.'); return; }
    CP.sel = new Set(L.map(ciKey));
    M.cineSteps = Object.assign({}, M.cineSteps || {}); if(how === 'auto') delete M.cineSteps[CP.t.id]; else M.cineSteps[CP.t.id] = [...CP.sel];
    try { persist(); } catch(e){}
    cinePreDraw();
  }
  function cineOpen(){ if(!CP) return; CP.open = !CP.open; cinePreDraw(); }
  function cineGo(rec){
    if(!CP) return; const seq = CP.all.filter(s=>CP.sel.has(ciKey(s)));
    if(!seq.length){ alert('Choisis au moins une étape.'); return; }
    ciSave(); const t = Object.assign({}, CP.t, {titre: CP.title || CP.t.titre}), o = CP.o;
    CP = null; const p = document.getElementById('wm-cpre'); if(p) p.remove();
    cineStart(t, seq, !!rec, o);
  }
  function cinePreX(){
    CP = null; const p = document.getElementById('wm-cpre'); if(p) p.remove();
    if(!CI){ ciLookOff(); const w = document.getElementById('cv-world'); if(w) w.classList.remove('wm-cine'); }
  }
  function cineGrab(){ if(!CI || !CI.snap) return; try { const c = wm.map.getCanvas(), x = CI.snap.getContext('2d'); x.drawImage(c, 0, 0, CI.snap.width, CI.snap.height); } catch(e){} }
  function cineStop(){
    ciSp = 1; ciLookOff(); ciMusicOff(); CP = null; const pp = document.getElementById('wm-cpre'); if(pp) pp.remove();
    if(!CI){ const w0 = document.getElementById('cv-world'); if(w0) w0.classList.remove('wm-cine'); return; } const ci = CI; ci.stop = true; CI = null;
    if(ci.raf) cancelAnimationFrame(ci.raf); if(ci.lineRaf) cancelAnimationFrame(ci.lineRaf);
    if(ci.rec && ci.rec.state !== 'inactive'){ ci.cancel = true; try { ci.rec.stop(); } catch(e){} }
    const o = document.getElementById('wm-cine'); if(o) o.remove();
    const w = document.getElementById('cv-world'); if(w) w.classList.remove('wm-cine');
    if(wm && wm.map){ try { (ci.hid || []).forEach(l=>{ if(wm.map.getLayer(l)) wm.map.setLayoutProperty(l, 'visibility', 'visible'); }); } catch(e){} try { wm.map.off('render', cineGrab); ['ci-glow','ci-line','ci-dot'].forEach(l=>{ if(wm.map.getLayer(l)) wm.map.removeLayer(l); }); ['ci-line','ci-dot'].forEach(s=>{ if(wm.map.getSource(s)) wm.map.removeSource(s); }); } catch(e){} }
  }
  function ciFly(o){
    o = Object.assign({}, o, {duration:(o.duration || 2000) * ciSp});
    return new Promise(res=>{ if(!CI || CI.stop || !wm) return res(); let done = false; const fin = () => { if(!done){ done = true; res(); } };
      wm.map.once('moveend', fin); setTimeout(fin, (o.duration || 2000) + 1200); wm.map.flyTo(Object.assign({essential:true}, o)); });
  }
  function ciSet(coords, dot){
    try { const s = wm.map.getSource('ci-line'); if(s) s.setData({type:'Feature', properties:{}, geometry:{type:'LineString', coordinates:coords.length > 1 ? coords : [coords[0], coords[0]]}});
      const d = wm.map.getSource('ci-dot'); if(d && dot) d.setData({type:'Feature', properties:{}, geometry:{type:'Point', coordinates:dot}}); } catch(e){}
  }
  function ciDraw(from, to, ms){
    ms *= ciSp;
    return new Promise(res=>{ const t0 = performance.now(), base = CI.coords.slice();
      const step = now => { if(!CI || CI.stop) return res(); const k = Math.min(1, (now - t0) / ms), e = k < .5 ? 2*k*k : 1 - Math.pow(-2*k + 2, 2) / 2;
        const p = [from.lng + (to.lng - from.lng) * e, from.lat + (to.lat - from.lat) * e]; ciSet(base.concat([p]), p);
        if(k < 1) CI.lineRaf = requestAnimationFrame(step); else { CI.coords = base.concat([[to.lng, to.lat]]); res(); } };
      CI.lineRaf = requestAnimationFrame(step); });
  }
  function ciCap(html, data){
    const c = document.getElementById('ci-cap'); if(!c) return;
    c.classList.remove('in'); void c.offsetWidth; c.innerHTML = html; if(html) c.classList.add('in'); hydrate();
    if(CI) CI.cap = data || null;
  }
  async function cineStart(t, seq, rec, o){
    const w = document.getElementById('cv-world'); if(!w) return;
    o = Object.assign({}, CI_DEF, o || ciOpt()); ciSp = CI_SP[o.sp] || 1;
    clearTimeout(ciPrevT); if(o.mus !== 'off') ciMusic(o, true); else ciMusicOff();
    stopStory(); wm.spin = false; w.classList.add('wm-cine'); ciLook(o);
    const ov = document.createElement('div'); ov.id = 'wm-cine'; if(!o.cap) ov.className = 'no-cap';
    ov.innerHTML = `<div class="ci-bar"><button type="button" class="ci-x" onclick="CV.cineStop()" aria-label="Fermer">✕</button><span class="ci-rec" id="ci-rec"></span></div>
      <div class="ci-title${o.intro ? '' : ' out'}" id="ci-title"><small>🌍 Survol 3D</small><b data-notr>${esc(t.titre)}</b><span>${esc(t.dates || '')}</span></div>
      <div class="ci-cap" id="ci-cap"></div><div class="ci-end" id="ci-end" hidden></div>`;
    w.appendChild(ov);
    CI = {id:t.id, t, seq, o, coords:[], stop:false, cap:null, title:o.intro ? {t:t.titre, d:t.dates || ''} : null, bmps:{}, cred:ciCred(o)};
    const map = wm.map;
    try {
      ['ci-glow','ci-line','ci-dot'].forEach(l=>{ if(map.getLayer(l)) map.removeLayer(l); }); ['ci-line','ci-dot'].forEach(s=>{ if(map.getSource(s)) map.removeSource(s); });
      map.addSource('ci-line', {type:'geojson', data:{type:'Feature', properties:{}, geometry:{type:'LineString', coordinates:[[seq[0].lng, seq[0].lat],[seq[0].lng, seq[0].lat]]}}});
      map.addSource('ci-dot', {type:'geojson', data:{type:'Feature', properties:{}, geometry:{type:'Point', coordinates:[seq[0].lng, seq[0].lat]}}});
      map.addLayer({id:'ci-glow', type:'line', source:'ci-line', layout:{'line-cap':'round','line-join':'round'}, paint:{'line-color':(CI_COL[o.col] || CI_COL.or)[0],'line-width':12,'line-opacity':.35,'line-blur':8}});
      map.addLayer({id:'ci-line', type:'line', source:'ci-line', layout:{'line-cap':'round','line-join':'round'}, paint:{'line-color':(CI_COL[o.col] || CI_COL.or)[1],'line-width':4}});
      map.addLayer({id:'ci-dot', type:'circle', source:'ci-dot', paint:{'circle-radius':8,'circle-color':'#ffffff','circle-stroke-color':'#ff3b6b','circle-stroke-width':4}});
      // pendant le survol, seuls le trajet en cours et le globe restent visibles
      CI.hid = (map.getStyle().layers || []).filter(l=>l.source && l.source !== 'ofm' && !/^ci-/.test(l.id) && /^(line|circle|symbol|heatmap|fill)$/.test(l.type) && (map.getLayoutProperty(l.id, 'visibility') || 'visible') === 'visible').map(l=>l.id);
      CI.hid.forEach(l=>map.setLayoutProperty(l, 'visibility', 'none'));
    } catch(e){}
    if(rec && !(await cineRecStart())) rec = false;
    // 1. depuis l’espace jusqu’à la première étape
    map.jumpTo({center:[seq[0].lng, seq[0].lat], zoom:1.4, pitch:0, bearing:0});
    await ciWait(o.intro ? 1800 : 400); if(!CI || CI.stop) return;
    const tt = document.getElementById('ci-title'); if(tt) tt.classList.add('out'); if(CI) CI.title = null;
    await ciFly({center:[seq[0].lng, seq[0].lat], zoom:ciZoom(seq.length > 1 ? km(seq[0], seq[1]) : 50), pitch:60, bearing:-20, duration:4200, curve:1.6});
    CI && (CI.coords = [[seq[0].lng, seq[0].lat]]);
    // 2. étape par étape
    for(let i = 0; i < seq.length; i++){
      if(!CI || CI.stop) return;
      const s = seq[i], ph = o.ph ? (s.ph || null) : null;
      const bmp = ph && rec ? await photoBlob(ph).then(b=>b ? decodeImg(b) : null).catch(()=>null) : null;
      const ttl = s.titre || s.city || s.lieu || '', sub = [s.date ? fdate(s.date) : '', s.lieu && s.lieu !== ttl ? s.lieu : ''].filter(Boolean).join(' · ');
      ciCap(`${ph ? `<div class="ci-ph"><img data-ph="${esc(ph)}" alt=""></div>` : ''}<div class="ci-tx"><span class="ci-n">${i + 1} / ${seq.length}</span><b data-notr>${s.cc ? flag(s.cc) + ' ' : ''}${esc(ttl)}</b>${sub ? `<small data-notr>${esc(sub)}</small>` : ''}${s.texte ? `<p data-notr>${esc(String(s.texte).slice(0, 140))}${s.texte.length > 140 ? '…' : ''}</p>` : ''}</div>`, {t:ttl, s:sub, bmp, n:(i + 1) + ' / ' + seq.length});
      await ciWait(ph ? 2900 : o.cap ? 1700 : 500); if(!CI || CI.stop) return;
      const nx = seq[i + 1]; if(!nx) break;
      ciCap('', null);
      const d = km(s, nx);
      await Promise.all([ciDraw(s, nx, d > 800 ? 3600 : 2600), ciFly({center:[nx.lng, nx.lat], zoom:ciZoom(d), pitch:d > 800 ? 35 : 58, bearing:ciBrg(s, nx), duration:d > 800 ? 3600 : 2600, curve:d > 800 ? 1.8 : 1.1})]);
    }
    // 3. vue d’ensemble + bilan
    if(!CI || CI.stop) return;
    ciCap('', null);
    try { const line = t.line && t.line.length > 1 ? t.line : seq.map(p=>[p.lng, p.lat]); let mn = [180, 90], mx = [-180, -90]; line.forEach(([x, y])=>{ mn = [Math.min(mn[0], x), Math.min(mn[1], y)]; mx = [Math.max(mx[0], x), Math.max(mx[1], y)]; });
      if(seq.length > 1) map.fitBounds([mn, mx], {padding:{top:120, bottom:260, left:50, right:50}, pitch:30, bearing:0, duration:3000, maxZoom:9}); } catch(e){}
    await ciWait(3200); if(!CI || CI.stop) return;
    const pays = new Set(seq.map(s=>s.cc).filter(Boolean)).size, kmT = Math.round(t.km || 0);
    const MSG = x => (window.I18N && I18N.msg ? I18N.msg(x) : x);
    const parts = [kmT ? kmT.toLocaleString('fr-FR') + ' km' : '', seq.length + ' étape' + (seq.length > 1 ? 's' : ''), pays ? pays + ' pays' : ''].filter(Boolean);
    const stats = parts.map(x=>`<i>${esc(x)}</i>`).join(' · ');
    if(CI){ CI.end = o.end ? {t:t.titre, s:parts.map(MSG).join(' · ')} : null; CI.fin = true; }
    const e = document.getElementById('ci-end');
    if(e){ e.hidden = false; e.innerHTML = `${o.end ? `<b data-notr>${esc(t.titre)}</b><span>${stats}</span>` : ''}
      <div class="ci-btns"><button type="button" onclick="CV.flyover('${t.id}',0,1)">↺ Revoir</button>${cineCanRec() ? `<button type="button" onclick="CV.flyoverRec('${t.id}')">⏺ Enregistrer la vidéo</button>` : ''}<button type="button" onclick="CV.flyover('${t.id}')">⚙️ Personnaliser</button><button type="button" onclick="CV.cineStop()">🌍 Rester sur le globe</button></div><small class="ci-cred" data-notr>${esc(ciCred(o))}</small>`; }
    if(rec) setTimeout(cineRecEnd, 3500);
    setTimeout(()=>{ if(CI && CI.fin) ciMusicOff(); }, rec ? 3300 : 5000);
  }
  const cineCanRec = () => !!(document.createElement('canvas').captureStream && typeof MediaRecorder !== 'undefined');
  async function cineRecStart(){
    if(!cineCanRec()){ alert('Ce téléphone ne sait pas enregistrer la vidéo. Fais plutôt une capture vidéo de l’écran pendant le survol.'); return false; }
    const W = 720, H = 1280, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const mc = wm.map.getCanvas(), snap = document.createElement('canvas'); snap.width = mc.width; snap.height = mc.height;
    CI.snap = snap; wm.map.on('render', cineGrab); wm.map.triggerRepaint();
    const x = cv.getContext('2d');
    const wrap = (txt, maxW) => { const words = String(txt).split(/\s+/), out = []; let l = ''; words.forEach(w=>{ const t2 = l ? l + ' ' + w : w; if(x.measureText(t2).width > maxW && l){ out.push(l); l = w; } else l = t2; }); if(l) out.push(l); return out.slice(0, 3); };
    const draw = () => {
      if(!CI || CI.stop) return;
      const sc = Math.max(W / snap.width, H / snap.height), dw = snap.width * sc, dh = snap.height * sc;
      x.fillStyle = '#02040a'; x.fillRect(0, 0, W, H); x.drawImage(snap, (W - dw) / 2, (H - dh) / 2, dw, dh);
      const g = x.createLinearGradient(0, H * .55, 0, H); g.addColorStop(0, 'rgba(2,4,10,0)'); g.addColorStop(1, 'rgba(2,4,10,.85)'); x.fillStyle = g; x.fillRect(0, H * .55, W, H * .45);
      x.textAlign = 'center'; x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 12;
      if(CI.title){ x.font = 'italic 600 58px Georgia, serif'; wrap(CI.title.t, W - 100).forEach((l, i)=>x.fillText(l, W / 2, H * .42 + i * 66)); x.font = '600 30px system-ui, sans-serif'; x.fillText(CI.title.d, W / 2, H * .42 + 120); }
      const c = CI.cap;
      if(c){ let y = H - 120;
        if(c.bmp){ const bw = W - 120, bh = Math.min(560, bw * c.bmp.height / c.bmp.width), by = H - 300 - bh; x.save(); x.beginPath(); x.roundRect ? x.roundRect(60, by, bw, bh, 28) : x.rect(60, by, bw, bh); x.clip(); const s2 = Math.max(bw / c.bmp.width, bh / c.bmp.height); x.drawImage(c.bmp, 60 + (bw - c.bmp.width * s2) / 2, by + (bh - c.bmp.height * s2) / 2, c.bmp.width * s2, c.bmp.height * s2); x.restore(); }
        if(CI.o.cap){ x.font = '700 26px system-ui, sans-serif'; x.fillStyle = 'rgba(255,255,255,.75)'; x.fillText(c.n || '', W / 2, y - 120);
        x.fillStyle = '#fff'; x.font = '800 46px system-ui, sans-serif'; wrap(c.t, W - 100).slice(0, 2).forEach((l, i)=>x.fillText(l, W / 2, y - 66 + i * 52));
        if(c.s){ x.font = '500 28px system-ui, sans-serif'; x.fillStyle = 'rgba(255,255,255,.85)'; x.fillText(c.s, W / 2, y + 40); } } }
      if(CI.end){ x.font = 'italic 600 54px Georgia, serif'; x.fillStyle = '#fff'; wrap(CI.end.t, W - 100).forEach((l, i)=>x.fillText(l, W / 2, H - 260 + i * 60)); x.font = '700 32px system-ui, sans-serif'; x.fillStyle = '#ffd28a'; x.fillText(CI.end.s, W / 2, H - 120); }
      x.shadowBlur = 0; if(CI.o.sig){ x.font = '700 24px system-ui, sans-serif'; x.fillStyle = 'rgba(255,255,255,.8)'; x.fillText('Vezoria', W / 2, H - 40); }
      if(CI.fin){ x.font = '500 14px system-ui, sans-serif'; x.fillStyle = 'rgba(255,255,255,.5)'; x.fillText(CI.cred, W / 2, H - 14); }
      CI.raf = requestAnimationFrame(draw);
    };
    draw();
    const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'], mime = types.find(t => MediaRecorder.isTypeSupported(t)) || '';
    let rec; try { const stm = cv.captureStream(30); try { if(CI.o.mus !== 'off' && FA && FA.dest) FA.dest.stream.getAudioTracks().forEach(t=>stm.addTrack(t)); } catch(e){}
    rec = new MediaRecorder(stm, mime ? {mimeType:mime, videoBitsPerSecond:5000000} : {}); } catch(e){ alert('Enregistrement impossible : ' + e.message); return false; }
    const chunks = [], ci = CI, name = 'survol-' + String(ci.t.titre || 'voyage').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    rec.ondataavailable = e => { if(e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = async () => {
      if(ci.cancel) return;
      const type = rec.mimeType || mime || 'video/webm', blob = new Blob(chunks, {type}), file = new File([blob], name + (/mp4/.test(type) ? '.mp4' : '.webm'), {type});
      const m = document.getElementById('ci-rec'); if(m) m.textContent = '✅ Vidéo prête';
      try { if(navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file], title:ci.t.titre}); return; } } catch(e){ if(e && e.name === 'AbortError') return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); setTimeout(()=>{ a.remove(); URL.revokeObjectURL(a.href); }, 5000);
    };
    CI.rec = rec; rec.start(500);
    const m = document.getElementById('ci-rec'); if(m) m.textContent = '🔴 Enregistrement… reste sur cet écran';
    return true;
  }
  function cineRecEnd(){ if(!CI || !CI.rec || CI.rec.state === 'inactive') return; try { CI.rec.stop(); } catch(e){} if(CI.raf) cancelAnimationFrame(CI.raf); try { wm.map.off('render', cineGrab); } catch(e){} }
  function stopStory(){ if(wm && wm.play){ clearTimeout(wm.play); wm.play = null; } const b = document.querySelector('.wm-play'); if(b) b.textContent = '▶ Revivre le voyage'; }
  function worldStory(id){
    if(!wm) return; if(wm.play){ stopStory(); return; }
    const t = wm.data.trips.find(x=>x.id===id); if(!t || !t.steps.length) return;
    const btn = document.querySelector('.wm-play'); if(btn) btn.textContent = '⏸ Pause';
    let i = 0; const r = document.querySelector('.wm-tl input');
    wm.play = -1;
    const next = () => { if(!wm || !wm.play) return; if(i >= t.steps.length){ stopStory(); worldFly(id); return; }
      if(r) r.value = i; worldStep(id, i); i++; wm.play = setTimeout(next, 3600); };
    next();
  }
  const yieldUI = () => new Promise(r=>setTimeout(r, 0));
  let wmTried = null, wmBusy = false;
  const thin = (c, max) => { if(c.length <= max) return c; const st = c.length / max, out = []; for(let i=0;i<c.length;i+=st) out.push(c[Math.floor(i)]); out.push(c[c.length-1]); return out; };
  async function worldData(){
    const map = wm.map, ts = trips(), data = {trips:[], steps:[], pays:{}, photos:[]}, missing = new Set();
    const nm = {}; try { const dn = new Intl.DisplayNames(['fr'], {type:'region'}); data.dn = c => { try { return dn.of(c); } catch(e){ return c; } }; } catch(e){ data.dn = c => c; }
    const addPays = (cc, pays, lat, lng) => { const k = cc || ccOf(pays); if(!k || data.pays[k]) return; data.pays[k] = {cc:k, pays: pays || data.dn(k), lat, lng}; };
    // index des souvenirs / steps / traces par voyage (un seul passage sur toutes les fiches)
    const byTrip = {}; let k = 0;
    for(const r of Object.values(R)){
      if(++k % 2000 === 0) await yieldUI();
      if(!r || r.deleted || !r.trip) continue;
      const b = byTrip[r.trip] || (byTrip[r.trip] = {h:[], s:[], trk:[]});
      if(r.type==='item' && r.cat==='hotel' && r.date) b.h.push(r); else if(r.type==='souv' || r.type==='step') b.s.push(r); else if(r.type==='trk') b.trk.push(r);
    }
    for(const t of ts){
      await yieldUI();
      const b = byTrip[t.id] || {h:[], s:[], trk:[]}, pts = [];
      b.h.sort((x,y)=>x.date.localeCompare(y.date)).forEach(h=>{ const c = stayCity(h); if(!c) return;
        const g = h.lat != null ? {lat:h.lat, lng:h.lng} : geoCached(c); if(!g){ missing.add(c); return; }
        pts.push({lat:g.lat, lng:g.lng, city:c}); const co = (M.ctry||{})[normQ(c)]; if(co && t.debut && t.debut <= isoToday()) addPays(co.cc, co.pays, g.lat, g.lng); });
      const steps = [];
      b.s.sort((x,y)=>(x.date||'').localeCompare(y.date||'') || (x.ordre||0)-(y.ordre||0) || (x.heure||'').localeCompare(y.heure||'')).forEach(s=>{
        let lat = s.lat, lng = s.lng; if(lat == null && s.lieu){ const g = geoCached(s.lieu); if(g){ lat = g.lat; lng = g.lng; } } if(lat == null) return;
        const o = {id:s.id, lat:+lat, lng:+lng, titre:s.titre||s.lieu||'Step', lieu:s.lieu||'', date:s.date, ph:(s.photos||[])[0] || null, n:(s.photos||[]).length, texte:s.texte||'', trip:t.id, cc:s.cc || ccOf(s.pays)};
        steps.push(o); data.steps.push(o); addPays(o.cc, s.pays, o.lat, o.lng); if(o.ph) data.photos.push(o); });
      const trk = b.trk.flatMap(r=>r.pts).sort((x,y)=>(x[2]||0)-(y[2]||0)).map(p=>[p[1], p[0]]);
      const phl = b.s.flatMap(s=>s.pts||[]).sort((x,y)=>x[2]-y[2]).map(p=>[p[1], p[0]]);
      const line = thin(trk.length > 1 ? trk : phl.length > 1 ? phl : steps.length > 1 ? steps.map(s=>[s.lng, s.lat]) : pts.map(p=>[p.lng, p.lat]), 400);
      const all = [...pts, ...steps]; if(!all.length) continue;
      let dist = 0; for(let i=1;i<line.length;i++) dist += km({lat:line[i-1][1], lng:line[i-1][0]}, {lat:line[i][1], lng:line[i][0]});
      data.trips.push({id:t.id, titre:t.titre, dates:tripDatesLong(t), debut:t.debut||'', pts:all, line, steps, photo:(steps.find(s=>s.ph)||{}).ph || null, trk:trk.length > 1, km:dist, phase:tripPhase(t)});
    }
    data.trips.sort((a,b)=>(b.debut||'').localeCompare(a.debut||''));
    wm.data = data;
    const routesFC = () => ({type:'FeatureCollection', features:wm.data.trips.filter(t=>t.line.length > 1).map(t=>({type:'Feature', properties:{id:t.id, trk:t.trk?1:0}, geometry:{type:'LineString', coordinates:t.line}}))});
    map.addSource('routes', {type:'geojson', data:routesFC(), tolerance:0.6});
    map.addLayer({id:'routes-glow', type:'line', source:'routes', layout:{'line-join':'round','line-cap':'round'}, paint:{'line-color':['case',['==',['get','trk'],1],'#fbbf24','#c4b5fd'], 'line-width':8, 'line-blur':5, 'line-opacity':0.4}});
    map.addLayer({id:'routes', type:'line', source:'routes', layout:{'line-join':'round','line-cap':'round'}, paint:{'line-color':['case',['==',['get','trk'],1],'#fde68a','#ffffff'], 'line-width':2.2, 'line-opacity':0.95}});
    map.addSource('steps', {type:'geojson', data:{type:'FeatureCollection', features:data.steps.map(s=>({type:'Feature', properties:{id:s.id}, geometry:{type:'Point', coordinates:[s.lng, s.lat]}}))}});
    map.addLayer({id:'steps', type:'circle', source:'steps', minzoom:2.5, paint:{'circle-radius':['interpolate',['linear'],['zoom'],2.5,2,6,4.5,10,6.5], 'circle-color':'#ffffff', 'circle-stroke-color':'#e11d48', 'circle-stroke-width':2}});
    const stepById = id => wm.data.steps.find(x=>x.id===id) || wm.data.photos.find(x=>x.id===id);
    const first = !wm.h; wm.h = 1;
    if(first) map.on('click', 'steps', e=>{ const s = stepById(e.features[0].properties.id); if(s) stepCard(s); });
    // photos regroupées par la carte elle-même (rapide même avec des milliers de photos)
    map.addSource('photos', {type:'geojson', cluster:true, clusterRadius:55, clusterMaxZoom:13, data:{type:'FeatureCollection', features:data.photos.map(p=>({type:'Feature', properties:{id:p.id, n:p.n}, geometry:{type:'Point', coordinates:[p.lng, p.lat]}}))}});
    map.addLayer({id:'ph-cluster', type:'circle', source:'photos', filter:['has','point_count'], layout:{visibility:'none'},
      paint:{'circle-color':'#e11d48', 'circle-opacity':0.85, 'circle-stroke-color':'#fff', 'circle-stroke-width':2.5, 'circle-radius':['step',['get','point_count'],14,10,18,50,24,200,30]}});
    map.addLayer({id:'ph-count', type:'symbol', source:'photos', filter:['has','point_count'], layout:{visibility:'none', 'text-field':['get','point_count_abbreviated'], 'text-font':wmFont || ['Open Sans Bold'], 'text-size':12, 'text-allow-overlap':true}, paint:{'text-color':'#fff'}});
    map.addLayer({id:'ph-point', type:'circle', source:'photos', filter:['!',['has','point_count']], layout:{visibility:'none'}, paint:{'circle-radius':6, 'circle-color':'#fff', 'circle-stroke-color':'#e11d48', 'circle-stroke-width':2}});
    if(first) map.on('click', 'ph-cluster', async e=>{ const f = e.features[0]; try { const z = await map.getSource('photos').getClusterExpansionZoom(f.properties.cluster_id); map.easeTo({center:f.geometry.coordinates, zoom:z + 0.5, duration:900}); } catch(err){ map.easeTo({center:f.geometry.coordinates, zoom:map.getZoom() + 2}); } });
    if(first) map.on('click', 'ph-point', e=>{ const s = stepById(e.features[0].properties.id); if(s) stepCard(s); });
    if(first) map.on('moveend', ()=>{ if(wm && wm.mode === 'photos') photoThumbs(); });
    // pays visités colorés
    paysFill();
    worldChips();
    wmInfo('Touche un voyage ci-dessous pour t’y envoler ✨');
    // arrière-plan : placer les villes manquantes (1 par seconde, règle d'OpenStreetMap), puis rafraîchir
    wmTried = wmTried || new Set(); const todo = [...missing].filter(c=>!wmTried.has(c)).slice(0, 40);
    if(todo.length && !wmBusy) setTimeout(async ()=>{
      wmBusy = true; let found = 0;
      for(const c of todo){ if(!wm) break; wmTried.add(c); const g = await geocode(c, null).catch(()=>null); if(g){ found++; await countryOf(c).catch(()=>null); } }
      wmBusy = false; if(found && wm) worldRefresh();
    }, 1500);
  }
  function worldChips(){
    const d = wm.data, totKm = d.trips.reduce((s,t)=>s+t.km,0), el = document.getElementById('wm-chips'); if(!el) return;
    el.innerHTML = `<span>🧳 <b>${d.trips.length}</b> voyages</span><span>🏳️ <b>${Object.keys(d.pays).length}</b> pays</span><span>📍 <b>${d.steps.length}</b> steps</span><span>📸 <b>${d.photos.reduce((s,p)=>s+p.n,0).toLocaleString((window.I18N ? I18N.locale : 'fr-FR'))}</b> photos</span><span>✈️ <b>${Math.round(totKm).toLocaleString((window.I18N ? I18N.locale : 'fr-FR'))}</b> km</span>`;
  }
  async function paysFill(){
    try {
      const codes = Object.keys(wm.data.pays); if(!codes.length || !wm) return;
      if(!wm.ne) wm.ne = await neFetch();
      const gj = {type:'FeatureCollection', features:wm.ne.features.filter(f=>{ const p = f.properties || {}, c = p.ISO_A2_EH && p.ISO_A2_EH !== '-99' ? p.ISO_A2_EH : p.ISO_A2; return codes.includes(c); })};
      const src = wm.map.getSource('pays');
      if(src) src.setData(gj);
      else { wm.map.addSource('pays', {type:'geojson', data:gj});
        wm.map.addLayer({id:'pays-fill', type:'fill', source:'pays', paint:{'fill-color':'#e11d48', 'fill-opacity':0.3}}, 'routes-glow');
        wm.map.addLayer({id:'pays-line', type:'line', source:'pays', paint:{'line-color':'#fb7185', 'line-width':1.3, 'line-opacity':0.9}}, 'routes-glow'); }
    } catch(e){}
  }
  let wmRefT = null;
  function worldRefresh(){
    clearTimeout(wmRefT);
    wmRefT = setTimeout(async ()=>{ if(!wm) return; const keep = {mode:wm.mode, sel:wm.sel};
      ['ph-count','ph-point','ph-cluster','steps','routes','routes-glow','pays-line','pays-fill'].forEach(l=>{ try { if(wm.map.getLayer(l)) wm.map.removeLayer(l); } catch(e){} });
      ['photos','steps','routes','pays'].forEach(s=>{ try { if(wm.map.getSource(s)) wm.map.removeSource(s); } catch(e){} });
      await worldData(); worldCarousel(); worldMode(keep.mode); }, 400);
  }
  const thumbM = new Map();
  function photoThumbs(){
    if(!wm) return; const map = wm.map;
    const feats = map.getZoom() < 3 ? [] : map.queryRenderedFeatures({layers:['ph-point']}).slice(0, 40), keep = new Set();
    feats.forEach(f=>{ const id = f.properties.id; keep.add(id); if(thumbM.has(id)) return; const p = wm.data.photos.find(x=>x.id===id); if(!p) return;
      const el = document.createElement('button'); el.type = 'button'; el.className = 'wm-photo'; el.innerHTML = `<img alt="">${p.n > 1 ? `<span>${p.n}</span>` : ''}`;
      photoURL(p.ph + '.t').then(u=>{ if(u) el.querySelector('img').src = u; }).catch(()=>{});
      el.onclick = ev => { ev.stopPropagation(); wm.spin = false; map.flyTo({center:[p.lng, p.lat], zoom:Math.max(10, map.getZoom()), pitch:50, duration:1400}); stepCard(p); };
      thumbM.set(id, new maplibregl.Marker({element:el}).setLngLat([p.lng, p.lat]).addTo(map)); });
    for(const [id, mk] of thumbM){ if(!keep.has(id)){ mk.remove(); thumbM.delete(id); } }
  }
  async function worldMode(m){
    if(!wm || !wm.data) return; wm.mode = m;
    document.querySelectorAll('.wm-seg button').forEach(b=>b.classList.toggle('on', b.dataset.m === m));
    wm.markers.forEach(x=>x.remove()); wm.markers = []; for(const [, mk] of thumbM) mk.remove(); thumbM.clear();
    const vis = (l, v) => { try { if(wm.map.getLayer(l)) wm.map.setLayoutProperty(l, 'visibility', v ? 'visible' : 'none'); } catch(e){} };
    vis('routes', m !== 'pays'); vis('routes-glow', m !== 'pays'); vis('steps', m === 'trips'); ['ph-cluster','ph-count','ph-point'].forEach(l=>vis(l, m === 'photos'));
    const add = (el, ll, anchor) => wm.markers.push(new maplibregl.Marker({element:el, anchor:anchor||'center'}).setLngLat(ll).addTo(wm.map));
    if(m === 'trips'){
      for(const t of wm.data.trips){ const p0 = t.steps[0] || t.pts[0];
        const el = document.createElement('button'); el.type = 'button'; el.className = 'wm-pin' + (t.phase==='live' ? ' live' : '');
        el.innerHTML = `<span class="ph">${t.photo ? `<img alt="" loading="lazy">` : '🧳'}</span><span class="n">${t.steps.length || t.pts.length}</span>`;
        if(t.photo) photoURL(t.photo + '.t').then(u=>{ if(u) el.querySelector('img').src = u; }).catch(()=>{});
        el.onclick = ev => { ev.stopPropagation(); worldFly(t.id); };
        add(el, [p0.lng, p0.lat], 'bottom'); }
    } else if(m === 'photos'){
      photoThumbs();
      wmInfo(`📸 <b>${wm.data.photos.reduce((s,p)=>s+p.n,0).toLocaleString((window.I18N ? I18N.locale : 'fr-FR'))}</b> photos sur ${wm.data.photos.length} lieux — touche une bulle pour zoomer, une vignette pour voir les photos`);
    } else {
      Object.values(wm.data.pays).forEach(c=>{ const el = document.createElement('div'); el.className = 'wm-flag'; el.textContent = flag(c.cc); el.title = c.pays || ''; add(el, [c.lng, c.lat]); });
      wmInfo(`🏳️ <b>${Object.keys(wm.data.pays).length} pays</b><div class="wm-flags">${Object.values(wm.data.pays).map(c=>`<span>${flag(c.cc)} ${esc(c.pays||'')}</span>`).join('') || 'Commence un voyage ou ajoute un step 📍'}</div>`);
      wm.spin = false; wm.map.easeTo({zoom:1.6, pitch:0, bearing:0, duration:1800});
    }
  }
  function worldOpen(id){ worldClose(); go(id); M.mode = tripPhase(R[id]) === 'past' ? 'bilan' : tripPhase(R[id]); persist(); applyMode(); }
  function worldClose(){ stopStory(); cineStop(); const ov = document.getElementById('cv-world'); if(wm) wm.spin = false; if(ov) ov.style.display = 'none'; document.body.style.overflow = ''; }   // la carte reste prête pour la prochaine ouverture

  /* ══════════════════════════════════════════════════════════════════════════
     ⚖️ PARTS INÉGALES & FOYERS · 🔎 LIEUX ILLUSTRÉS (Wikipédia) · 🧭 NOUVEAU VOYAGE : 3 FAÇONS
     ══════════════════════════════════════════════════════════════════════════ */
  /* ---------- ⚖️ Parts du voyage (enfant, couple, invité…) et foyers ---------- */
  const tCoef = pid => { const t = trip(); const c = t && t.coef && t.coef[pid]; return c == null || c === '' ? 1 : Math.max(0, num(c)); };
  const tFoyer = pid => { const t = trip(); return (t && t.foyer && t.foyer[pid]) || ''; };
  function partsSheet(){
    const t = trip(), v = tv();
    openSheet(`<h2>⚖️ Parts et foyers</h2>
      <div class="v-sum-small" style="margin-bottom:10px">Par défaut, chaque dépense « partagée » se divise à parts égales. Ici, tu règles pour tout le voyage :<br>
      • <b>Part</b> : 1 = une part normale, 0,5 = un enfant ou quelqu’un qui ne profite qu’à moitié, 2 = un couple compté ensemble…<br>
      • <b>Foyer</b> : même nom pour ceux qui partagent un porte-monnaie (ex. « Anthony & Claire ») : « qui doit quoi » se calcule alors entre foyers.<br>
      Une fiche peut toujours avoir sa propre répartition (Paiement → Montants).</div>
      ${v.map(pid=>`<div class="cv-prt">${pchip(pid)}<label>Part <input class="v-in" inputmode="decimal" data-coef="${pid}" value="${esc(String((t.coef||{})[pid] ?? 1)).replace('.', ',')}"></label><label>Foyer <input class="v-in" data-foyer="${pid}" value="${esc((t.foyer||{})[pid]||'')}" placeholder="—"></label></div>`).join('')}
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.partsSave()">Enregistrer</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  function partsSave(){
    const t = clone(trip()); t.coef = {}; t.foyer = {};
    document.querySelectorAll('[data-coef]').forEach(i=>{ const v = num(i.value); if(i.value.trim() !== '' && v !== 1) t.coef[i.dataset.coef] = v; });
    document.querySelectorAll('[data-foyer]').forEach(i=>{ const v = i.value.trim(); if(v) t.foyer[i.dataset.foyer] = v; });
    put(t, '⚖️ Répartition enregistrée'); closeSheet(true); refresh();
  }
  // « qui doit quoi » entre foyers : on additionne les soldes des membres d'un même foyer
  function settleFoyers(bal){
    const g = {}; bal.forEach(b=>{ const f = tFoyer(b.pid) || b.pid; (g[f] = g[f] || {pid:b.pid, solde:0, mem:[]}); g[f].solde += b.solde; g[f].mem.push(b.pid); });
    const tr = settle(Object.values(g));
    const lbl = pid => { const f = tFoyer(pid); return f ? '👪 ' + esc(f) : pname_c(pid); };
    return {tr, lbl};
  }

  /* ---------- 🔎 Lieux à voir illustrés : vignette + fiche Wikipédia au toucher ---------- */
  const wkCache = {};
  const wkParse = w => { if(!w) return null; let m = String(w).match(/^https?:\/\/(\w+)\.wikipedia\.org\/wiki\/(.+)$/); if(m) return {lang:m[1], title:decodeURIComponent(m[2]).replace(/_/g,' ')};
    m = String(w).match(/^(\w{2,3}):(.+)$/); return m ? {lang:m[1], title:m[2]} : {lang:'fr', title:String(w)}; };
  async function wkThumbs(list){
    const by = {}; list.forEach(p=>{ const w = wkParse(p.wiki); if(w && !((w.lang+':'+w.title) in wkCache)) (by[w.lang] = by[w.lang] || []).push(w.title); });
    for(const [lang, titles] of Object.entries(by)){
      for(let i=0;i<titles.length;i+=50){
        const chunk = titles.slice(i, i+50);
        try { const j = await (await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=200&redirects=1&format=json&origin=*&titles=` + encodeURIComponent(chunk.join('|')))).json();
          const red = {}; ((j.query||{}).redirects||[]).concat((j.query||{}).normalized||[]).forEach(r=>red[r.to] = r.from);
          chunk.forEach(t=>wkCache[lang+':'+t] = '');
          Object.values((j.query||{}).pages||{}).forEach(pg=>{ const u = pg.thumbnail && pg.thumbnail.source; if(u){ wkCache[lang+':'+pg.title] = u; if(red[pg.title]) wkCache[lang+':'+red[pg.title]] = u; const r2 = red[red[pg.title]]; if(r2) wkCache[lang+':'+r2] = u; } });
        } catch(e){}
      }
    }
  }
  async function discThumbs(){
    if(!disc) return;
    const imgs = [...document.querySelectorAll('#ds-list img[data-wk]')]; if(!imgs.length) return;
    await wkThumbs(imgs.map(i=>({wiki:i.dataset.wk})));
    imgs.forEach(i=>{ const w = wkParse(i.dataset.wk), u = w && wkCache[w.lang+':'+w.title]; if(u){ i.src = u; i.parentNode.classList.add('has'); } });
  }
  async function discInfo(i){
    const p = disc && disc.list[i]; if(!p) return;
    disc.keepY = (document.querySelector('#v-sheet-bg .v-sheet') || {}).scrollTop || 0;
    const mine = placesOfStay(disc.hid).some(x=>normQ(x.nom)===normQ(p.nom));
    openSheet(`<h2>${POI_CATS[p.cat].icon} ${esc(p.nom)}</h2><div id="wk-box" class="cv-route-load">📖 Recherche sur Wikipédia…</div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.discAdd(${i})">${mine ? '↩️ Retirer de l’itinéraire' : '＋ Ajouter à l’itinéraire'}</button><button type="button" class="v-btn sec" onclick="CV.discBack()">← Liste</button></div>`);
    let w = wkParse(p.wiki), data = null;
    try {
      if(!w){ const s = await (await fetch(`https://fr.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json&origin=*&srsearch=` + encodeURIComponent(p.nom + ' ' + disc.city))).json();
        const hit = ((s.query||{}).search||[])[0]; if(hit) w = {lang:'fr', title:hit.title}; }
      if(w){ const j = await (await fetch(`https://${w.lang}.wikipedia.org/w/api.php?action=query&prop=pageimages|extracts&piprop=thumbnail&pithumbsize=640&exintro=1&explaintext=1&exsentences=5&redirects=1&format=json&origin=*&titles=` + encodeURIComponent(w.title))).json();
        data = Object.values((j.query||{}).pages||{})[0]; }
    } catch(e){}
    const b = document.getElementById('wk-box'); if(!b) return; b.className = '';
    const url = w ? `https://${w.lang}.wikipedia.org/wiki/${encodeURIComponent((data && data.title || w.title).replace(/ /g,'_'))}` : '';
    b.innerHTML = (data && data.thumbnail ? `<img class="wk-img" src="${esc(data.thumbnail.source)}" alt="">` : '')
      + (data && data.extract ? `<p class="wk-tx">${esc(data.extract)}</p>` : '<p class="v-sum-small">Pas de fiche Wikipédia trouvée pour ce lieu.</p>')
      + `<div class="cv-row" style="gap:6px;flex-wrap:wrap">${url ? `<a class="v-day-edit" href="${url}" target="_blank" rel="noopener">📖 Lire sur Wikipédia</a>` : ''}<a class="v-day-edit" href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(p.nom + ' ' + disc.city)}" target="_blank" rel="noopener">🖼️ Plus de photos</a><a class="v-day-edit" href="https://www.google.com/maps/search/?api=1&query=${p.lat.toFixed(6)},${p.lng.toFixed(6)}" target="_blank" rel="noopener">📍 Plan</a></div>`
      + (data && data.extract ? `<div class="v-sum-small" style="margin-top:6px">Texte : Wikipédia (CC BY-SA).</div>` : '');
  }
  function discBack(){ const y = disc && disc.keepY; discRender(); const sh = document.querySelector('#v-sheet-bg .v-sheet'); if(sh && y) sh.scrollTop = y; }

  /* ---------- 🧭 Nouveau voyage : je sais où / je ne sais pas encore / voyage vierge ---------- */
  function newTrip(){
    openSheet(`<h2>🧳 Nouveau voyage</h2><div class="v-sum-small" style="margin-bottom:10px">Comment veux-tu commencer ?</div>
      <button type="button" class="cv-choice" onclick="CV.close();CV.wizard()"><i>🧭</i><span><b>Je sais où je vais</b><small>L’assistant crée le programme, les hébergements et les trajets en 5 étapes.</small></span></button>
      <button type="button" class="cv-choice" onclick="CV.worldNew()"><i>🌍</i><span><b>Je le dessine sur le globe</b><small>Touche les villes sur la Terre, dans l’ordre : la route se trace et le voyage est créé.</small></span></button>
      <button type="button" class="cv-choice" onclick="CV.inspire()"><i>💡</i><span><b>Je ne sais pas encore où aller</b><small>Quelques questions, et l’appli te propose des destinations adaptées avec ses conseils.</small></span></button>
      <button type="button" class="cv-choice" onclick="CV.blankTrip()"><i>📄</i><span><b>Voyage vierge</b><small>Juste un nom : tu remplis tout toi-même, à ton rythme.</small></span></button>
      <button type="button" class="cv-choice" onclick="CV.close();CV.joinAny()"><i>🔗</i><span><b>Je rejoins le voyage ou le carnet d’un ami</b><small>Tu as reçu un code ou un lien : colle-le, le voyage (ou tous ses voyages) arrive sur ton téléphone.</small></span></button>
      <button type="button" class="cv-choice" onclick="CV.psImport()"><i>📥</i><span><b>J’importe mes voyages Polarsteps</b><small>Tes étapes, récits et photos, à partir du fichier de données que Polarsteps t’envoie.</small></span></button>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Annuler</button></div>`);
  }
  /* ══════════ 📥 Import Polarsteps : l’utilisateur reprend SES données (fichier d’export de Polarsteps) ══════════ */
  /* ── 📥 Import Polarsteps en arrière-plan : pastille d’avancement visible partout dans l’appli ── */
  let PSRUN = null;
  function psPill(html, done){
    let p = document.getElementById('ps-pill');
    if(!html){ if(p) p.remove(); return; }
    if(!p){ p = document.createElement('button'); p.id = 'ps-pill'; p.type = 'button'; document.body.appendChild(p); }
    p.className = 'ps-pill' + (done ? ' done' : ''); p.innerHTML = html;
    p.onclick = done ? () => { psPill(''); if(typeof done === 'string' && R[done]){ go(done); M.mode = 'bilan'; persist(); applyMode(); } } : () => psImport();
  }
  async function psLock(on){
    try { if(on && navigator.wakeLock && !PSRUN.lock) PSRUN.lock = await navigator.wakeLock.request('screen');
      if(!on && PSRUN && PSRUN.lock){ await PSRUN.lock.release(); PSRUN.lock = null; } } catch(e){}
  }
  function psImport(){
    openSheet(`<h2>📥 Importer mes voyages Polarsteps</h2>
      <ol class="ps-how"><li>Dans Polarsteps : Profil → Paramètres → Télécharger mes données. Tu reçois un fichier ZIP par e-mail.</li><li>Choisis ce fichier ici (ou le fichier trip.json d’un voyage).</li></ol>
      <div class="v-sum-small" style="margin:8px 0">Tes étapes, lieux, récits et photos deviennent des souvenirs Vezoria. Tout se passe sur ton téléphone : le fichier n’est envoyé nulle part. Vezoria n’est pas lié à Polarsteps.</div>
      <label class="cv-checkline"><input type="checkbox" id="ps-all"> Importer toutes les photos (sinon 3 par étape : plus léger pour ton téléphone)</label>
      <div id="ps-msg" class="ps-msg">${PSRUN && PSRUN.m ? esc(PSRUN.m) : ''}</div>
      <div class="ps-bgnote">⏳ L’import se fait en arrière-plan : une fois le fichier choisi, tu peux fermer cette fenêtre et continuer à utiliser Vezoria. Garde juste l’appli ouverte, une pastille en bas t’indique où il en est.</div>
      <div class="v-actions"><label class="v-btn ps-pick">📂 Choisir le fichier<input type="file"${isIOSDev ? '' : ' accept=".zip,.json,application/zip,application/json"'} hidden onchange="CV.psFile(this)"></label></div>`);
  }
  const psIso = ts => { const n = +ts; if(!n) return ''; try { return new Date(n > 1e12 ? n : n * 1000).toISOString().slice(0, 10); } catch(e){ return ''; } };
  // voyage déjà importé ? même identifiant Polarsteps, ou (anciens imports) même nom et même date de départ
  function psFind(j){
    const id = String(j.id || ''), nm = String(j.name || j.title || 'Voyage Polarsteps').slice(0, 120), d = psIso(j.start_date);
    return trips().find(t=>t && !t.deleted && t.type === 'trip' && t.src === 'polarsteps' && ((id && t.psId === id) || (!t.psId && t.titre === nm && (!d || !t.debut || t.debut === d)))) || null;
  }
  function psAsk(name){
    return new Promise(res=>{
      const ov = document.createElement('div'); ov.className = 'ui-dlg'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
      ov.innerHTML = `<div class="ui-box ps-ask"><div class="ui-msg"><b data-notr>« ${esc(name)} »</b><br><span>est déjà dans tes voyages.</span></div>
        <button type="button" class="v-btn" data-v="replace">🔄 Remplacer</button>
        <small>Les souvenirs importés sont remplacés. Le reste du voyage (programme, budget, compagnons, abonnés) est gardé.</small>
        <button type="button" class="v-btn sec" data-v="both">➕ Garder les deux</button>
        <button type="button" class="v-btn sec" data-v="skip">Ne pas importer ce voyage</button>
        <label class="cv-checkline"><input type="checkbox" class="ps-same"> Même choix pour les voyages suivants</label></div>`;
      ov.querySelectorAll('[data-v]').forEach(b=>{ b.onclick = () => { const same = ov.querySelector('.ps-same').checked; ov.remove(); res({v:b.dataset.v, same}); }; });
      document.body.appendChild(ov);
    });
  }
  async function psFile(input){
    const f = input.files && input.files[0]; if(!f) return; input.value = '';
    if(PSRUN){ alert('Un import Polarsteps est déjà en cours.'); return; }
    const all = !!(document.getElementById('ps-all') || {}).checked;
    PSRUN = {m:''}; psLock(true);
    const msg = m => { if(PSRUN) PSRUN.m = m; const e = document.getElementById('ps-msg'); if(e) e.textContent = m;
      if(m) psPill(`<i class="ps-spin"></i><span>📥 Import Polarsteps</span><span class="ps-st">${esc(m)}</span>`); };
    let rd = null;
    msg('📦 Lecture du fichier…'); toast('📥 Import lancé : tu peux continuer à utiliser l’appli');
    try {
      const list_ = [];
      if(/\.json$/i.test(f.name) || f.type === 'application/json') list_.push({j:JSON.parse(await f.text()), base:'', ents:null, z:null});
      else {
        msg('📦 Lecture du fichier…'); const z = await loadZip(); rd = new z.ZipReader(new z.BlobReader(f)); const ents = await rd.getEntries();
        for(const e of ents.filter(e=>!e.directory && /(^|\/)trip\.json$/i.test(e.filename))){ try { list_.push({j:JSON.parse(await e.getData(new z.TextWriter())), base:e.filename.replace(/trip\.json$/i, ''), ents, z}); } catch(err){} }
      }
      if(!list_.length) throw new Error('aucun voyage Polarsteps trouvé dans ce fichier (il faut le ZIP de Polarsteps ou un fichier trip.json).');
      let nS = 0, nP = 0, last = '';
      let same = null;   // « Même choix pour les voyages suivants »
      for(let k = 0; k < list_.length; k++){
        const old = psFind(list_[k].j || {}); let how = 'new';
        if(old){ if(same) how = same; else { const a = await psAsk(old.titre); how = a.v; if(a.same) same = a.v; } }
        if(how === 'skip') continue;
        msg(`🧳 Voyage ${k + 1} / ${list_.length}…`); const r = await psOne(list_[k], all, msg, how === 'replace' ? old : null); nS += r.s; nP += r.p; last = r.tid; }
      if(!last){ psPill(''); const el = document.getElementById('ps-msg'); if(el) el.textContent = ''; toast('Rien de nouveau importé'); return; }
      const done = `✅ ${list_.length} voyage${list_.length > 1 ? 's' : ''} importé${list_.length > 1 ? 's' : ''} : ${nS} étapes, ${nP} photos.`;
      if(document.getElementById('ps-msg')){   // toujours devant la fenêtre d’import : on ouvre directement le voyage
        psPill(''); closeSheet(true);
        if(last){ go(last); M.mode = 'bilan'; persist(); applyMode(); }
        setTimeout(()=>alert(done), 300);
      } else {   // parti faire autre chose : on ne le dérange pas, la pastille propose d’ouvrir le voyage
        psPill(`<span>✅ Import terminé</span><b>Voir</b>`, last || true);
      }
      uploadQueue();
    } catch(e){ psPill(''); const el = document.getElementById('ps-msg'); if(el) el.textContent = ''; alert('Import impossible : ' + e.message); }
    finally { try { rd && rd.close(); } catch(e){} await psLock(false); PSRUN = null; }
  }
  async function psOne(tr, all, msg, old){
    const j = tr.j || {}, steps = (j.all_steps || j.steps || []).slice().sort((a, b)=>(+a.start_time || 0) - (+b.start_time || 0));
    const tid = old ? old.id : 't' + uid(), debut = psIso(j.start_date) || psIso((steps[0] || {}).start_time), fin = psIso(j.end_date) || psIso((steps[steps.length - 1] || {}).start_time) || debut;
    const head = {id:tid, type:'trip', titre:String(j.name || j.title || 'Voyage Polarsteps').slice(0, 120), sous:String(j.summary || '').slice(0, 160), debut, fin, voyageurs:M.me ? [M.me] : [], objectif:'', src:'polarsteps', psId:String(j.id || '')};
    // remplacer : même voyage (compagnons, abonnés, budget… gardés), seuls ses souvenirs importés repartent de zéro
    const out = [old ? Object.assign(clone(old), {titre:head.titre, sous:head.sous || old.sous || '', debut:debut || old.debut, fin:fin || old.fin, src:'polarsteps', psId:head.psId}) : head];
    // identifiants stables : réimporter le même ZIP ne crée ni nouveau souvenir ni nouvelle photo (pas de doublon sur le téléphone ni sur le serveur)
    const psH = async x => 'ps' + hex(await crypto.subtle.digest('SHA-256', te.encode(x))).slice(0, 20);
    const keep = new Set(); let p = 0;
    const photos = tr.ents ? tr.ents.filter(e=>!e.directory && e.filename.startsWith(tr.base) && /\.(jpe?g|png|webp)$/i.test(e.filename) && /\/photos?\//i.test(e.filename)) : [];
    for(let i = 0; i < steps.length; i++){
      const s = steps[i] || {}, L = s.location || {}, key = String(s.id || ''), slug = String(s.slug || '');
      const lat = L.lat != null ? +L.lat : s.lat != null ? +s.lat : null, lng = L.lon != null ? +L.lon : L.lng != null ? +L.lng : s.lon != null ? +s.lon : null;
      const svId = await psH('sv|' + tid + '|' + (key || slug || i) + '|' + (s.start_time || '')); keep.add(svId);
      const sv = {id:svId, type:'souv', trip:tid, date:psIso(s.start_time) || debut, titre:String(s.display_name || s.name || L.name || ('Étape ' + (i + 1))).slice(0, 120),
        lieu:[L.name, L.detail].filter(Boolean).join(', ').slice(0, 160), texte:String(s.description || '').slice(0, 20000), photos:[], cc:String(L.country_code || '').toUpperCase().slice(0, 2), pays:L.country || '', src:'polarsteps'};
      if(lat != null && isFinite(lat) && lng != null && isFinite(lng)){ sv.lat = lat; sv.lng = lng; }
      let ph = photos.filter(e=>e.filename.split('/').some(g=>(key && (g === key || g.endsWith('_' + key))) || (!key && slug && g.startsWith(slug + '_'))));
      if(!all) ph = ph.slice(0, 3);
      for(const e of ph){ try {
        const pid = await psH('ph|' + head.psId + '|' + e.filename.split('/').slice(-3).join('/') + '|' + (e.uncompressedSize || ''));
        let have = null; try { have = await IDB.get(pid + '.t'); } catch(x){}
        if(!(have && have.blob)){ const b = await e.getData(new tr.z.BlobWriter(/\.png$/i.test(e.filename) ? 'image/png' : 'image/jpeg')); await storePhoto(b, pid); }   // déjà là : rien à refaire ni à renvoyer
        if(!sv.photos.includes(pid)) sv.photos.push(pid); p++; if(p % 3 === 0) msg(`📸 ${p} photos…`); } catch(err){} }
      const prev = R[svId]; if(prev && !prev.deleted) Object.assign(sv, {createdAt:prev.createdAt, createdBy:prev.createdBy, priv:prev.priv});
      out.push(sv);
    }
    // remplacer : les anciens souvenirs importés absents du nouveau ZIP sont retirés (et leurs photos du serveur)
    if(old) list('souv', s=>s.trip === tid && !s.deleted && !keep.has(s.id) && (s.src === 'polarsteps' || !old.psId)).forEach(s=>out.push(Object.assign(clone(s), {deleted:true})));
    putMany(out, '📥 Voyage importé');
    return {tid, s:steps.length, p};
  }
  async function blankTrip(){
    const n = (await uiPrompt('Nom du voyage :', 'Mon prochain voyage')); if(n === null) return;
    const tid = 't' + uid();
    put({id:tid, type:'trip', titre:n.trim() || 'Mon prochain voyage', sous:'', debut:'', fin:'', voyageurs:M.me ? [M.me] : [], objectif:''}, '📄 Voyage vierge créé');
    closeSheet(true); M.mode = 'prep'; M.tab = 'prog'; go(tid);
    setTimeout(()=>CV.editTrip && CV.editTrip(tid), 300);
  }
  /* ══════════ 💡 « Je ne sais pas où aller » — moteur de propositions ══════════
     Destinations avec coordonnées, températures moyennes (max) mois par mois, meilleures périodes,
     budget sur place, durée idéale, itinéraire type, formalités. Ordres de grandeur, à vérifier
     (prix réels avec Escale, formalités sur diplomatie.gouv.fr). */
  // [nom, pays, cc, lat, lng, tags, meilleurs mois, €/jour/pers (confort), [durée min,max], itinéraire [[ville,nuits]], conseil, formalités, temp. max °C (jan→déc), article Wikipédia]
  const DESTS = [
    ['Lisbonne & Porto','Portugal','PT',38.72,-9.14,'ville culture gastronomie mer plage',[3,4,5,6,9,10],90,[4,8],[['Lisbonne',3],['Sintra',1],['Porto',3]],'Tramway 28 tôt le matin, coucher de soleil aux miradouros, Sintra en excursion.','UE',[15,16,18,20,22,26,28,28,27,23,18,15],'Lisbonne'],
    ['Algarve','Portugal','PT',37.02,-7.93,'plage mer détente nature',[5,6,7,9,10],95,[5,8],[['Lagos',3],['Tavira',3]],'Grottes de Benagil en kayak, falaises de Ponta da Piedade.','UE',[16,17,19,21,24,27,30,30,28,24,20,17],'Algarve'],
    ['Açores','Portugal','PT',37.74,-25.67,'nature randonnée mer aventure',[5,6,7,8,9],90,[7,10],[['Ponta Delgada',4],['Furnas',1],['Pico',3]],'Louer une voiture ; météo changeante, prévoir des couches.','UE',[17,16,17,18,20,22,25,26,25,22,19,18],'Açores'],
    ['Madère','Portugal','PT',32.65,-16.91,'nature randonnée mer',[3,4,5,6,9,10,11],90,[6,8],[['Funchal',6]],'Levadas à pied, Pico do Arieiro au lever du soleil.','UE',[20,20,20,21,22,24,26,27,27,25,23,21],'Madère'],
    ['Andalousie','Espagne','ES',37.39,-5.98,'ville culture histoire gastronomie',[3,4,5,10,11],90,[5,8],[['Séville',3],['Cordoue',1],['Grenade',2]],'Alhambra à réserver longtemps à l’avance ; éviter juillet-août (40 °C).','UE',[16,18,22,23,27,33,36,36,32,26,20,16],'Andalousie'],
    ['Barcelone','Espagne','ES',41.39,2.17,'ville plage culture fête',[4,5,6,9,10],110,[3,5],[['Barcelone',4]],'Sagrada Família réservée en ligne ; quartier de Gràcia le soir.','UE',[14,15,17,19,22,26,29,29,26,22,17,14],'Barcelone'],
    ['Madrid & Tolède','Espagne','ES',40.42,-3.70,'ville culture musées gastronomie fête',[4,5,6,9,10],100,[3,5],[['Madrid',3],['Tolède',1]],'Prado gratuit en fin de journée ; tapas à La Latina.','UE',[10,12,16,18,22,28,32,31,26,19,13,10],'Madrid'],
    ['Majorque','Espagne','ES',39.57,2.65,'plage détente nature mer',[5,6,9,10],110,[5,8],[['Palma',2],['Sóller',2],['Cala d’Or',3]],'Criques de l’est hors juillet-août ; Serra de Tramuntana à pied.','UE',[15,15,17,19,23,27,30,31,27,23,19,16],'Majorque'],
    ['Tenerife','Espagne','ES',28.29,-16.63,'plage nature randonnée détente',[1,2,3,4,10,11,12],90,[5,8],[['Puerto de la Cruz',3],['Los Gigantes',3]],'Le soleil d’hiver à 4 h de vol : Teide au lever du jour.','UE',[21,21,22,23,24,26,28,29,28,26,24,22],'Tenerife'],
    ['Pays basque espagnol','Espagne','ES',43.32,-1.98,'gastronomie ville plage',[5,6,7,8,9],110,[3,5],[['Saint-Sébastien',3],['Bilbao',1]],'Pintxos dans la vieille ville, musée Guggenheim à Bilbao.','UE',[12,13,15,16,19,22,24,25,23,20,15,13],'Saint-Sébastien'],
    ['Rome','Italie','IT',41.90,12.50,'ville culture histoire gastronomie romantique',[3,4,5,9,10,11],120,[4,6],[['Rome',4]],'Colisée et Vatican réservés ; Trastevere le soir.','UE',[12,13,16,19,24,28,31,31,27,22,17,13],'Rome'],
    ['Florence & Toscane','Italie','IT',43.77,11.26,'culture gastronomie vin nature ville romantique',[4,5,6,9,10],120,[5,8],[['Florence',3],['Sienne',2],['Val d’Orcia',2]],'Offices réservés ; collines du Val d’Orcia en voiture.','UE',[11,13,16,19,24,29,32,32,27,21,15,11],'Toscane'],
    ['Venise','Italie','IT',45.44,12.32,'ville culture romantique',[4,5,6,9,10],140,[2,4],[['Venise',3]],'Se perdre dans Cannaregio, Burano en vaporetto.','UE',[7,9,13,17,22,26,28,28,24,18,12,8],'Venise'],
    ['Pouilles','Italie','IT',41.12,16.87,'mer gastronomie détente culture plage',[5,6,9,10],100,[7,10],[['Bari',2],['Polignano a Mare',2],['Alberobello',1],['Lecce',3]],'Voiture indispensable ; trulli d’Alberobello tôt le matin.','UE',[13,13,15,18,23,27,30,30,26,22,17,14],'Pouilles'],
    ['Sicile','Italie','IT',38.12,13.36,'mer culture gastronomie nature plage',[4,5,6,9,10],100,[8,12],[['Palerme',3],['Cefalù',1],['Taormine',2],['Syracuse',3]],'Etna en excursion, marchés de Palerme, cannoli partout.','UE',[15,15,17,20,24,28,31,31,28,24,20,16],'Sicile'],
    ['Naples & côte amalfitaine','Italie','IT',40.63,14.60,'mer culture gastronomie romantique',[5,6,9,10],140,[5,8],[['Naples',2],['Sorrente',2],['Positano',2]],'Pompéi tôt ; bateaux entre les villages de la côte.','UE',[13,14,16,19,23,27,30,30,27,22,18,14],'Côte amalfitaine'],
    ['Dolomites','Italie','IT',46.41,11.84,'montagne randonnée nature',[6,7,8,9],130,[5,8],[['Cortina d’Ampezzo',3],['Val Gardena',3]],'Refuges à réserver tôt ; Tre Cime et lac de Braies.','UE',[3,5,9,13,17,21,24,23,19,14,7,3],'Dolomites'],
    ['Sardaigne','Italie','IT',40.12,9.01,'plage mer nature détente',[6,7,9],120,[7,10],[['Cagliari',2],['Costa Smeralda',3],['Alghero',2]],'Eaux turquoise ; éviter la mi-août (monde, prix).','UE',[14,15,17,19,23,28,31,31,28,23,19,15],'Sardaigne'],
    ['Corse','France','FR',42.04,9.01,'mer nature randonnée plage',[5,6,9],110,[7,10],[['Ajaccio',2],['Bonifacio',2],['Porto-Vecchio',2],['Calvi',2]],'Voiture indispensable ; calanques de Piana au coucher du soleil.','FR',[13,14,16,18,22,26,29,29,26,22,17,14],'Corse'],
    ['Bretagne (Finistère)','France','FR',48.10,-4.10,'mer nature randonnée gastronomie',[5,6,7,8,9],90,[3,7],[['Crozon',3],['Ouessant',1],['Quimper',2]],'Presqu’île de Crozon, Ouessant, crêpes et fruits de mer.','FR',[10,10,12,14,17,20,21,22,20,16,13,10],'Finistère'],
    ['Provence','France','FR',43.95,4.80,'culture gastronomie nature vin',[5,6,9,10],110,[4,7],[['Avignon',2],['Luberon',2],['Aix-en-Provence',2]],'Lavande fin juin – mi-juillet ; marchés provençaux le matin.','FR',[11,13,16,19,23,28,31,30,26,21,15,11],'Provence'],
    ['Alsace','France','FR',48.08,7.36,'gastronomie vin culture noel',[5,6,9,12],100,[3,5],[['Strasbourg',2],['Colmar',2]],'Marchés de Noël en décembre ; route des vins à vélo.','FR',[4,6,11,16,20,24,26,25,21,15,9,5],'Alsace'],
    ['Amsterdam','Pays-Bas','NL',52.37,4.90,'ville culture musées fête',[4,5,6,9],140,[3,4],[['Amsterdam',3]],'Vélo partout ; Rijksmuseum réservé ; tulipes en avril.','UE',[6,7,10,14,17,20,22,22,19,15,10,7],'Amsterdam'],
    ['Londres','Royaume-Uni','GB',51.51,-0.13,'ville culture musées fête shopping',[4,5,6,7,9,12],160,[3,5],[['Londres',4]],'Musées gratuits ; paiement sans contact dans le métro.','E',[8,9,12,15,18,21,24,23,20,16,11,8],'Londres'],
    ['Écosse','Royaume-Uni','GB',56.49,-4.20,'nature randonnée château montagne',[5,6,7,8,9],120,[7,10],[['Édimbourg',2],['Highlands',2],['Île de Skye',3]],'Highlands en voiture ; anti-moustique pour les midges.','E',[7,7,9,12,15,17,19,19,16,13,9,7],'Écosse'],
    ['Irlande','Irlande','IE',53.35,-6.26,'nature randonnée fête ville',[5,6,7,8,9],120,[7,10],[['Dublin',2],['Galway',2],['Killarney',2]],'Falaises de Moher, Ring of Kerry, pubs à musique live.','UE',[8,8,10,13,15,18,20,19,17,14,10,8],'Irlande (pays)'],
    ['Berlin','Allemagne','DE',52.52,13.40,'ville culture histoire fête',[5,6,7,8,9],100,[3,4],[['Berlin',4]],'East Side Gallery, île aux Musées, vie nocturne.','UE',[3,5,9,15,19,23,25,25,20,14,8,4],'Berlin'],
    ['Prague','Tchéquie','CZ',50.08,14.44,'ville culture histoire fête noel',[4,5,6,9,10,12],80,[3,4],[['Prague',3]],'Château tôt le matin ; marché de Noël en décembre.','UE',[2,4,9,14,19,22,24,24,19,13,7,3],'Prague'],
    ['Vienne & Budapest','Autriche','AT',48.21,16.37,'ville culture musique bains',[4,5,6,9,10,12],100,[5,7],[['Vienne',3],['Budapest',3]],'Train direct entre les deux ; bains Széchenyi à Budapest.','UE',[3,5,10,16,21,24,27,26,21,15,8,4],'Vienne (Autriche)'],
    ['Croatie (Split & Dubrovnik)','Croatie','HR',43.51,16.44,'mer plage culture bateau',[5,6,9,10],110,[7,10],[['Split',3],['Hvar',2],['Dubrovnik',3]],'Ferries entre les îles ; Dubrovnik tôt, avant les croisiéristes.','UE',[11,12,14,18,23,27,30,30,26,21,16,12],'Dalmatie'],
    ['Slovénie','Slovénie','SI',46.06,14.51,'nature randonnée lac montagne',[5,6,7,8,9],90,[5,8],[['Ljubljana',2],['Bled',2],['Piran',2]],'Lac de Bled au lever du jour, gorges de Vintgar.','UE',[3,6,11,16,21,25,27,27,22,16,9,4],'Slovénie'],
    ['Athènes & Cyclades','Grèce','GR',37.98,23.73,'mer plage histoire détente romantique',[5,6,9,10],100,[8,12],[['Athènes',2],['Naxos',3],['Santorin',2],['Milos',3]],'Acropole à l’ouverture ; ferries à réserver en été.','UE',[14,15,17,21,26,31,34,34,29,24,19,15],'Cyclades'],
    ['Crète','Grèce','GR',35.24,24.81,'plage nature randonnée gastronomie',[5,6,9,10],85,[7,10],[['Héraklion',2],['Réthymnon',2],['La Canée',3]],'Gorges de Samaria, plages de Balos et Elafonissi.','UE',[16,16,18,21,25,29,31,31,28,25,21,18],'Crète'],
    ['Malte','Malte','MT',35.90,14.51,'mer histoire plongée',[4,5,6,9,10,11],90,[4,6],[['La Valette',3],['Gozo',2]],'Blue Lagoon tôt le matin ; Mdina au crépuscule.','UE',[16,16,18,20,24,29,32,32,29,25,21,18],'Malte'],
    ['Istanbul','Turquie','TR',41.01,28.98,'ville culture histoire gastronomie',[4,5,9,10,11],70,[4,5],[['Istanbul',4]],'Bosphore en ferry public ; marchés de Kadıköy côté asiatique.','P',[9,10,12,17,22,27,29,29,25,20,15,11],'Istanbul'],
    ['Cappadoce','Turquie','TR',38.64,34.83,'nature aventure',[4,5,6,9,10],80,[3,4],[['Göreme',3]],'Montgolfière à réserver ; nuit en hôtel troglodyte.','P',[4,6,11,17,21,26,30,30,26,19,12,6],'Cappadoce'],
    ['Marrakech & Atlas','Maroc','MA',31.63,-8.00,'ville culture désert gastronomie',[3,4,5,10,11],60,[4,7],[['Marrakech',3],['Imlil (Atlas)',1],['Agafay',1]],'Riad dans la médina ; nuit sous tente dans le désert d’Agafay.','P',[19,20,23,26,29,33,37,37,32,28,23,20],'Marrakech'],
    ['Fès & désert marocain','Maroc','MA',34.03,-5.00,'désert aventure culture',[3,4,10,11],60,[7,10],[['Fès',2],['Merzouga',2],['Gorges du Todra',1],['Ouarzazate',2]],'Bivouac dans les dunes de l’Erg Chebbi.','P',[16,18,21,23,27,32,36,36,31,26,21,17],'Merzouga'],
    ['Égypte (Nil)','Égypte','EG',25.69,32.64,'histoire culture désert croisière',[10,11,12,1,2,3],70,[8,12],[['Le Caire',3],['Louxor',3],['Assouan',2]],'Croisière Louxor–Assouan ; éviter l’été, très chaud.','V',[23,25,29,34,38,40,40,40,38,34,28,24],'Louxor'],
    ['Jordanie','Jordanie','JO',30.33,35.44,'désert histoire aventure',[3,4,5,10,11],90,[6,9],[['Amman',1],['Pétra',2],['Wadi Rum',1],['Aqaba',2]],'Jordan Pass (visa + Pétra) ; nuit étoilée au Wadi Rum.','V',[13,15,19,24,29,32,33,33,31,27,20,15],'Pétra'],
    ['Islande','Islande','IS',64.15,-21.94,'nature aventure aurores randonnée',[6,7,8,9,2,3],180,[8,12],[['Reykjavik',2],['Vík',2],['Höfn',2],['Akureyri',2]],'Route 1 en van ; aurores de septembre à mars.','UE',[2,3,3,6,10,12,14,14,11,7,4,3],'Islande'],
    ['Fjords de Norvège','Norvège','NO',60.39,5.32,'nature randonnée bateau montagne',[6,7,8],170,[7,10],[['Bergen',2],['Flåm',2],['Geiranger',2],['Ålesund',2]],'Train de Flåm, Preikestolen, croisière sur le Geirangerfjord.','UE',[3,4,6,10,14,17,19,19,15,11,7,4],'Fjords de Norvège'],
    ['Laponie finlandaise','Finlande','FI',66.50,25.73,'neige aurores aventure nature noel',[12,1,2,3],160,[4,7],[['Rovaniemi',3],['Saariselkä',2]],'Chiens de traîneau, aurores, village du père Noël.','UE',[-9,-8,-3,3,10,17,20,17,11,3,-3,-7],'Laponie finlandaise'],
    ['New York','États-Unis','US',40.71,-74.01,'ville culture shopping fête musées',[4,5,6,9,10,12],220,[5,7],[['New York',6]],'ESTA avant de partir ; Brooklyn Bridge au lever du soleil.','E',[4,6,10,17,22,27,29,29,25,18,12,6],'New York'],
    ['Ouest américain','États-Unis','US',36.17,-115.14,'nature roadtrip parcs aventure',[5,6,9,10],170,[14,21],[['Las Vegas',2],['Grand Canyon',2],['Monument Valley',1],['Bryce Canyon',1],['Zion',2],['San Francisco',3]],'Pass « America the Beautiful » ; réserver les parcs tôt.','E',[14,17,21,25,31,38,41,40,35,27,19,14],'Grand Canyon'],
    ['Québec','Canada','CA',46.81,-71.21,'nature ville randonnée',[6,7,8,9,10],130,[10,14],[['Montréal',3],['Québec',3],['Tadoussac',2],['Charlevoix',2]],'AVE obligatoire ; baleines à Tadoussac, couleurs d’automne fin septembre.','E',[-8,-6,0,8,17,22,25,24,18,11,3,-4],'Québec (ville)'],
    ['Japon','Japon','JP',35.68,139.76,'culture gastronomie ville nature',[3,4,5,10,11],130,[14,21],[['Tokyo',4],['Hakone',1],['Kyoto',4],['Hiroshima',2],['Osaka',2]],'Cerisiers fin mars-avril ; pass régionaux plutôt que JR Pass national.','P',[10,10,14,19,23,26,30,31,27,22,17,12],'Japon'],
    ['Thaïlande','Thaïlande','TH',13.76,100.50,'plage culture gastronomie détente',[11,12,1,2,3],50,[14,21],[['Bangkok',3],['Chiang Mai',3],['Krabi',4],['Koh Lanta',4]],'Côté mer d’Andaman en hiver ; temples de Chiang Mai.','P',[32,33,34,35,34,33,32,32,32,31,31,31],'Thaïlande'],
    ['Vietnam','Vietnam','VN',21.03,105.85,'culture gastronomie nature aventure',[2,3,4,10,11],45,[14,21],[['Hanoï',3],['Baie d’Halong',2],['Hội An',3],['Hô Chi Minh-Ville',3]],'Du nord au sud ; baie d’Halong en croisière de 2 jours.','P',[20,21,24,28,32,33,33,32,31,29,26,22],'Viêt Nam'],
    ['Bali','Indonésie','ID',-8.51,115.26,'plage détente nature culture',[5,6,7,8,9],55,[10,15],[['Ubud',4],['Nusa Penida',2],['Uluwatu',3]],'Rizières d’Ubud, temples au coucher du soleil.','V',[31,31,31,32,31,30,30,30,31,32,32,31],'Bali'],
    ['Sri Lanka','Sri Lanka','LK',7.29,80.63,'culture nature plage faune',[1,2,3,12],50,[12,16],[['Sigiriya',2],['Kandy',2],['Ella',2],['Mirissa',3]],'Train Kandy–Ella, safari à Yala, baleines à Mirissa.','V',[30,31,32,32,31,30,30,30,30,30,30,30],'Sri Lanka'],
    ['La Réunion','France','RE',-21.12,55.53,'nature randonnée volcan plage',[5,6,7,8,9,10,11],90,[12,16],[['Saint-Gilles',3],['Cilaos',2],['Mafate',2],['Saint-Pierre',3]],'Cirque de Mafate à pied ; Piton de la Fournaise.','FR',[30,30,30,29,27,26,25,25,26,27,28,29],'La Réunion'],
    ['Guadeloupe','France','GP',16.25,-61.58,'plage nature plongée détente',[12,1,2,3,4,5],100,[10,14],[['Sainte-Anne',4],['Deshaies',3],['Marie-Galante',2]],'Basse-Terre pour la nature, Marie-Galante pour les plages.','FR',[29,29,29,30,31,31,31,32,32,31,30,29],'Guadeloupe'],
    ['Costa Rica','Costa Rica','CR',9.93,-84.08,'nature aventure faune plage',[12,1,2,3,4],90,[14,18],[['La Fortuna',3],['Monteverde',2],['Manuel Antonio',3],['Tortuguero',2]],'Saison sèche de décembre à avril ; volcan Arenal.','P',[27,28,29,29,28,27,27,27,27,27,26,26],'Costa Rica'],
    ['Mexique (Yucatán)','Mexique','MX',20.63,-87.08,'plage culture histoire plongée',[11,12,1,2,3,4],75,[12,15],[['Mérida',3],['Valladolid',2],['Tulum',3],['Bacalar',2]],'Cenotes, Chichén Itzá à l’ouverture.','P',[28,29,31,33,34,33,33,33,32,31,29,28],'Yucatán'],
    ['Cap-Vert','Cap-Vert','CV',16.60,-22.90,'plage détente randonnée',[11,12,1,2,3,4,5,6],70,[7,10],[['Sal',3],['Santo Antão',3]],'Plage à Sal, randonnées spectaculaires à Santo Antão.','E',[25,25,26,26,27,27,28,29,30,29,28,26],'Cap-Vert'],
    /* ── 120 destinations ajoutées le 21 octobre 2026 ── */
    ["Paris", "France", "FR", 48.857, 2.352, "ville culture musées gastronomie romantique fête", [4, 5, 6, 9, 10], 150, [3, 6], [["Paris", 4]], "Musées en nocturne, pique-nique au bord de la Seine, Montmartre tôt le matin.", "FR", [8, 9, 13, 16, 20, 23, 26, 25, 21, 16, 11, 8], "Paris"],
    ["Côte d’Azur", "France", "FR", 43.703, 7.266, "plage mer ville culture romantique", [5, 6, 9, 10], 140, [4, 8], [["Nice", 4], ["Antibes", 2]], "Vieux-Nice et marché du cours Saleya, sentier du littoral du cap d’Antibes, Èze au coucher du soleil.", "FR", [13, 14, 16, 18, 22, 25, 28, 28, 25, 21, 17, 14], "Côte d’Azur"],
    ["Normandie", "France", "FR", 49.183, -0.37, "histoire nature mer gastronomie", [5, 6, 7, 8, 9], 100, [4, 7], [["Bayeux", 2], ["Étretat", 2], ["Mont-Saint-Michel", 1]], "Plages du Débarquement, falaises d’Étretat à marée basse, traversée de la baie avec un guide.", "FR", [8, 8, 11, 14, 17, 20, 22, 22, 20, 16, 11, 8], "Normandie"],
    ["Pays basque français", "France", "FR", 43.483, -1.559, "plage gastronomie nature mer", [5, 6, 7, 8, 9], 120, [4, 7], [["Biarritz", 3], ["Saint-Jean-de-Luz", 2], ["Espelette", 1]], "Surf à la Côte des Basques, train de la Rhune, pintxos de l’autre côté à Saint-Sébastien.", "FR", [12, 13, 15, 16, 19, 22, 24, 24, 23, 20, 15, 13], "Pays basque"],
    ["Annecy & Chamonix", "France", "FR", 45.899, 6.129, "montagne lac randonnée nature", [6, 7, 8, 9, 12, 1, 2], 130, [4, 7], [["Annecy", 3], ["Chamonix", 3]], "Baignade dans le lac, Aiguille du Midi par grand beau, réserver les refuges tôt.", "FR", [5, 7, 12, 16, 20, 24, 27, 26, 22, 16, 10, 6], "Annecy"],
    ["Châteaux de la Loire", "France", "FR", 47.394, 0.685, "château histoire culture vin", [4, 5, 6, 9, 10], 110, [3, 6], [["Tours", 2], ["Amboise", 2], ["Blois", 1]], "Chambord à vélo, Chenonceau à l’ouverture, dégustation à Vouvray.", "FR", [8, 9, 13, 16, 20, 23, 26, 26, 22, 17, 11, 8], "Château de Chambord"],
    ["Bordeaux & vignobles", "France", "FR", 44.838, -0.579, "vin gastronomie ville culture", [5, 6, 9, 10], 120, [3, 6], [["Bordeaux", 3], ["Saint-Émilion", 1], ["Arcachon", 2]], "Miroir d’eau au coucher du soleil, Saint-Émilion à vélo, dune du Pilat tôt le matin.", "FR", [10, 12, 15, 17, 21, 24, 27, 27, 24, 19, 14, 11], "Bordeaux"],
    ["Lyon", "France", "FR", 45.764, 4.836, "ville gastronomie culture", [4, 5, 6, 9, 10, 12], 110, [2, 4], [["Lyon", 3]], "Traboules du Vieux-Lyon, déjeuner en bouchon, Fête des Lumières début décembre.", "FR", [7, 9, 14, 17, 21, 25, 28, 27, 23, 17, 11, 7], "Lyon"],
    ["Périgord & Dordogne", "France", "FR", 44.89, 1.216, "histoire gastronomie nature château", [5, 6, 7, 8, 9], 100, [4, 7], [["Sarlat-la-Canéda", 3], ["Rocamadour", 1], ["Bergerac", 2]], "Canoë sur la Dordogne, grotte de Lascaux IV, marché de Sarlat le samedi.", "FR", [9, 11, 15, 17, 21, 25, 28, 28, 24, 19, 13, 10], "Sarlat-la-Canéda"],
    ["Marseille & calanques", "France", "FR", 43.297, 5.381, "mer ville plage randonnée", [5, 6, 9, 10], 110, [3, 5], [["Marseille", 3], ["Cassis", 1]], "Calanque de Sugiton à pied (réservation l’été), Mucem, bouillabaisse au Vallon des Auffes.", "FR", [12, 13, 16, 19, 23, 27, 30, 30, 26, 21, 16, 13], "Calanques"],
    ["Pyrénées", "France", "FR", 42.853, 0.143, "montagne randonnée nature lac", [6, 7, 8, 9], 90, [5, 8], [["Cauterets", 3], ["Gavarnie", 2], ["Luchon", 2]], "Cirque de Gavarnie, lacs de Cauterets, ascension du pic du Midi pour le coucher du soleil.", "FR", [6, 7, 10, 12, 16, 20, 23, 23, 20, 15, 9, 7], "Cirque de Gavarnie"],
    ["Auvergne", "France", "FR", 45.772, 3.087, "nature volcan randonnée gastronomie", [5, 6, 7, 8, 9], 90, [4, 7], [["Clermont-Ferrand", 2], ["Le Mont-Dore", 3]], "Puy de Dôme par le chemin des muletiers, lac Pavin, fromages AOP à la ferme.", "FR", [7, 9, 13, 15, 19, 23, 26, 26, 22, 17, 11, 8], "Chaîne des Puys"],
    ["La Rochelle & île de Ré", "France", "FR", 46.16, -1.151, "mer plage vélo gastronomie", [5, 6, 7, 8, 9], 110, [3, 6], [["La Rochelle", 2], ["Île de Ré", 3]], "Île de Ré à vélo, huîtres à Ars-en-Ré, tours du Vieux-Port au coucher du soleil.", "FR", [9, 10, 14, 16, 19, 23, 25, 25, 23, 19, 13, 10], "Île de Ré"],
    ["Martinique", "France", "MQ", 14.641, -61.024, "plage nature randonnée plongée", [12, 1, 2, 3, 4], 110, [7, 14], [["Les Trois-Îlets", 4], ["Sainte-Anne", 4], ["Saint-Pierre", 2]], "Montagne Pelée à l’aube, tortues aux Anses-d’Arlet, distilleries de rhum agricole.", "FR", [28, 28, 29, 29, 30, 31, 31, 31, 31, 31, 30, 29], "Martinique"],
    ["Polynésie française", "France", "PF", -17.535, -149.569, "plage plongée romantique détente nature", [5, 6, 7, 8, 9, 10], 220, [10, 16], [["Papeete", 2], ["Moorea", 4], ["Bora-Bora", 4]], "Raies et requins dans le lagon de Moorea, pension de famille plutôt que palace, ferry pour Moorea.", "FR", [31, 31, 31, 30, 29, 28, 27, 27, 28, 29, 30, 30], "Polynésie française"],
    ["Nouvelle-Calédonie", "France", "NC", -22.276, 166.458, "plage plongée nature randonnée", [9, 10, 11, 4, 5], 150, [10, 16], [["Nouméa", 3], ["Île des Pins", 3], ["Bourail", 3]], "Piscine naturelle d’Oro à l’île des Pins, lagon classé à l’UNESCO, roulottes de Nouméa.", "FR", [30, 30, 29, 28, 26, 24, 23, 23, 25, 26, 28, 29], "Nouvelle-Calédonie"],
    ["Valence", "Espagne", "ES", 39.47, -0.376, "ville plage gastronomie culture", [4, 5, 6, 9, 10], 95, [3, 5], [["Valence", 4]], "Paella à La Albufera, Cité des arts et des sciences, jardin du Turia à vélo.", "UE", [17, 18, 20, 22, 25, 28, 31, 31, 29, 25, 20, 17], "Valence (Espagne)"],
    ["Ibiza", "Espagne", "ES", 38.908, 1.433, "fête plage mer détente", [5, 6, 7, 8, 9], 140, [4, 7], [["Ibiza", 4], ["Santa Eulària des Riu", 2]], "Coucher de soleil à Cala d’Hort, Dalt Vila, îlot d’Es Vedrà en bateau.", "UE", [15, 16, 18, 20, 24, 28, 31, 31, 28, 24, 19, 16], "Ibiza"],
    ["Lanzarote & Fuerteventura", "Espagne", "ES", 28.963, -13.548, "plage volcan nature détente", [3, 4, 5, 6, 9, 10, 11], 100, [5, 10], [["Lanzarote", 4], ["Fuerteventura", 3]], "Parc de Timanfaya, œuvres de César Manrique, dunes de Corralejo.", "UE", [21, 22, 23, 24, 25, 26, 28, 29, 28, 27, 24, 22], "Lanzarote"],
    ["Galice", "Espagne", "ES", 42.88, -8.546, "nature gastronomie randonnée mer", [5, 6, 7, 8, 9], 90, [5, 8], [["Saint-Jacques-de-Compostelle", 2], ["La Corogne", 2], ["Vigo", 2]], "Fruits de mer au marché, îles Cíes (permis à réserver), fin du chemin de Saint-Jacques.", "UE", [12, 13, 15, 16, 19, 22, 25, 25, 23, 19, 15, 12], "Saint-Jacques-de-Compostelle"],
    ["Asturies & Cantabrie", "Espagne", "ES", 43.361, -5.849, "nature randonnée montagne plage gastronomie", [6, 7, 8, 9], 90, [5, 8], [["Oviedo", 2], ["Cangas de Onís", 2], ["Santillana del Mar", 2]], "Lacs de Covadonga, Picos de Europa, cidre servi de haut dans les sidrerías.", "UE", [13, 14, 15, 16, 19, 21, 23, 24, 22, 19, 15, 14], "Pics d’Europe"],
    ["Séville & Cordoue", "Espagne", "ES", 37.389, -5.984, "ville culture histoire fête romantique", [3, 4, 5, 10, 11], 90, [3, 6], [["Séville", 3], ["Cordoue", 2]], "Alcazar réservé à l’avance, flamenco à Triana, mosquée-cathédrale de Cordoue tôt le matin.", "UE", [16, 18, 22, 24, 28, 33, 36, 36, 32, 26, 20, 16], "Séville"],
    ["Porto & vallée du Douro", "Portugal", "PT", 41.158, -8.629, "vin ville gastronomie nature", [4, 5, 6, 9, 10], 85, [3, 6], [["Porto", 3], ["Pinhão", 2]], "Caves de Vila Nova de Gaia, train du Douro, croisière sur le fleuve en saison des vendanges.", "UE", [14, 15, 17, 19, 21, 24, 26, 26, 25, 21, 17, 14], "Vallée du Douro"],
    ["Alentejo", "Portugal", "PT", 38.571, -7.909, "gastronomie vin histoire détente", [4, 5, 6, 9, 10], 80, [4, 7], [["Évora", 2], ["Monsaraz", 2], ["Comporta", 2]], "Évora et sa chapelle des Os, villages blancs perchés, plages sauvages de Comporta.", "UE", [14, 16, 19, 21, 25, 30, 33, 33, 29, 24, 18, 15], "Évora"],
    ["Lacs italiens", "Italie", "IT", 45.81, 9.086, "lac romantique nature culture", [4, 5, 6, 9, 10], 130, [4, 7], [["Côme", 3], ["Bellagio", 2], ["Stresa", 2]], "Bateau entre les villages du lac de Côme, îles Borromées, villa del Balbianello.", "UE", [7, 10, 14, 18, 22, 26, 29, 28, 24, 18, 12, 8], "Lac de Côme"],
    ["Cinque Terre", "Italie", "IT", 44.128, 9.711, "mer randonnée romantique gastronomie", [4, 5, 6, 9, 10], 130, [3, 5], [["Monterosso al Mare", 2], ["Manarola", 2]], "Sentier azur entre les villages (carte Cinque Terre), focaccia et pesto, Portovenere en bateau.", "UE", [12, 13, 15, 18, 21, 25, 28, 28, 25, 21, 16, 13], "Cinque Terre"],
    ["Bologne & Émilie-Romagne", "Italie", "IT", 44.494, 11.343, "gastronomie ville culture", [4, 5, 6, 9, 10], 110, [3, 6], [["Bologne", 3], ["Parme", 1], ["Modène", 1]], "Atelier pâtes fraîches, Parmigiano chez le producteur, acetaia de vinaigre balsamique à Modène.", "UE", [6, 9, 14, 18, 23, 27, 30, 30, 25, 19, 12, 7], "Bologne"],
    ["Milan", "Italie", "IT", 45.464, 9.19, "ville culture shopping gastronomie", [4, 5, 6, 9, 10], 140, [2, 4], [["Milan", 3]], "La Cène de Léonard (réserver des semaines avant), toits du Duomo, aperitivo sur les Navigli.", "UE", [6, 9, 14, 18, 23, 27, 30, 29, 24, 18, 11, 6], "Milan"],
    ["Ombrie", "Italie", "IT", 43.112, 12.389, "culture nature gastronomie histoire", [4, 5, 6, 9, 10], 100, [4, 7], [["Pérouse", 2], ["Assise", 2], ["Orvieto", 1]], "Basilique d’Assise, truffe noire de Norcia, villages perchés sans les foules de Toscane.", "UE", [9, 11, 14, 18, 23, 27, 31, 31, 26, 20, 14, 10], "Ombrie"],
    ["Malte & Gozo", "Malte", "MT", 36.044, 14.251, "mer plongée histoire", [4, 5, 6, 9, 10], 90, [4, 7], [["Gozo", 3], ["Mellieħa", 2]], "Ferry pour Gozo, Blue Lagoon de Comino tôt le matin, plongée sur épaves.", "UE", [16, 16, 18, 20, 24, 28, 31, 32, 29, 26, 21, 18], "Gozo"],
    ["Corfou & îles Ioniennes", "Grèce", "GR", 39.624, 19.922, "plage mer détente nature", [5, 6, 7, 9, 10], 90, [5, 10], [["Corfou", 4], ["Céphalonie", 3]], "Vieille ville vénitienne de Corfou, plage de Myrtos, grottes de Melissani.", "UE", [14, 15, 17, 20, 24, 29, 32, 32, 28, 24, 19, 16], "Corfou"],
    ["Péloponnèse", "Grèce", "GR", 37.567, 22.8, "histoire plage nature culture", [4, 5, 6, 9, 10], 80, [5, 9], [["Nauplie", 3], ["Olympie", 1], ["Monemvasia", 2]], "Mycènes et Épidaure, Nauplie en soirée, village fortifié de Monemvasia.", "UE", [14, 15, 17, 21, 25, 30, 33, 33, 29, 24, 19, 15], "Péloponnèse"],
    ["Météores & Grèce du Nord", "Grèce", "GR", 40.64, 22.944, "histoire culture nature", [4, 5, 6, 9, 10], 75, [4, 7], [["Thessalonique", 2], ["Kalambaka", 2]], "Monastères des Météores au lever du soleil, cuisine de rue de Thessalonique, mont Olympe.", "UE", [10, 12, 15, 20, 25, 30, 32, 32, 28, 22, 16, 11], "Météores"],
    ["Rhodes & Dodécanèse", "Grèce", "GR", 36.434, 28.217, "plage mer histoire détente", [5, 6, 7, 9, 10], 90, [5, 9], [["Rhodes", 3], ["Lindos", 2], ["Symi", 1]], "Vieille ville médiévale de Rhodes, acropole de Lindos, excursion à Symi.", "UE", [16, 16, 18, 21, 25, 29, 31, 32, 29, 25, 21, 17], "Rhodes"],
    ["Chypre", "Chypre", "CY", 34.707, 33.022, "plage histoire randonnée mer", [4, 5, 6, 9, 10, 11], 90, [5, 9], [["Paphos", 3], ["Limassol", 2], ["Troodos", 1]], "Mosaïques de Paphos, villages du Troodos, rocher d’Aphrodite.", "UE", [17, 17, 19, 23, 27, 31, 33, 34, 31, 28, 23, 19], "Chypre (pays)"],
    ["Bruxelles & Bruges", "Belgique", "BE", 51.209, 3.225, "ville culture gastronomie histoire", [4, 5, 6, 9, 12], 110, [2, 4], [["Bruxelles", 2], ["Bruges", 1], ["Gand", 1]], "Grand-Place illuminée, canaux de Bruges en bateau, frites et bières trappistes.", "UE", [6, 7, 11, 15, 19, 22, 24, 23, 20, 15, 10, 6], "Bruges"],
    ["Copenhague", "Danemark", "DK", 55.676, 12.568, "ville culture gastronomie vélo", [5, 6, 7, 8, 9], 170, [2, 4], [["Copenhague", 3]], "Vélo partout, Nyhavn, jardins de Tivoli, baignade dans le port l’été.", "UE", [3, 3, 6, 11, 16, 19, 22, 21, 17, 12, 7, 4], "Copenhague"],
    ["Stockholm", "Suède", "SE", 59.329, 18.069, "ville culture mer musées", [5, 6, 7, 8, 9], 160, [3, 5], [["Stockholm", 4]], "Gamla stan, musée Vasa, bateau dans l’archipel.", "UE", [1, 1, 4, 10, 16, 21, 23, 22, 17, 10, 5, 2], "Stockholm"],
    ["Pays baltes", "Lettonie", "LV", 56.946, 24.105, "ville culture histoire nature", [5, 6, 7, 8, 9, 12], 80, [5, 9], [["Vilnius", 2], ["Riga", 3], ["Tallinn", 2]], "Bus entre les trois capitales, Art nouveau de Riga, vieille ville de Tallinn.", "UE", [-2, -1, 3, 11, 17, 21, 23, 22, 17, 10, 4, 0], "Riga"],
    ["Suisse (Alpes)", "Suisse", "CH", 46.02, 7.749, "montagne randonnée lac train nature", [6, 7, 8, 9, 12, 1, 2], 230, [5, 8], [["Lucerne", 2], ["Interlaken", 2], ["Zermatt", 2]], "Swiss Travel Pass, Cervin depuis Zermatt, Glacier Express pour le trajet.", "UE", [3, 5, 10, 14, 18, 22, 24, 23, 19, 14, 8, 4], "Zermatt"],
    ["Bavière", "Allemagne", "DE", 48.137, 11.576, "ville château montagne gastronomie noel", [5, 6, 7, 9, 12], 120, [4, 7], [["Munich", 3], ["Füssen", 1], ["Berchtesgaden", 2]], "Château de Neuschwanstein à réserver, Oktoberfest fin septembre, lac Königssee.", "UE", [3, 5, 10, 14, 19, 22, 24, 24, 20, 14, 8, 4], "Château de Neuschwanstein"],
    ["Salzbourg & Tyrol", "Autriche", "AT", 47.809, 13.055, "montagne musique ville lac", [6, 7, 8, 9, 12, 1, 2], 120, [4, 7], [["Salzbourg", 2], ["Hallstatt", 1], ["Innsbruck", 2]], "Hallstatt tôt le matin, marchés de Noël, Innsbruck et la Nordkette en téléphérique.", "UE", [3, 5, 10, 14, 19, 22, 24, 24, 20, 14, 8, 4], "Hallstatt"],
    ["Cornouailles", "Royaume-Uni", "GB", 50.266, -5.052, "mer nature randonnée plage", [5, 6, 7, 8, 9], 140, [4, 7], [["St Ives", 3], ["Falmouth", 2]], "Sentier côtier du Sud-Ouest, Minack Theatre, cream tea.", "E", [9, 9, 11, 13, 16, 18, 20, 20, 18, 15, 12, 10], "Cornouailles"],
    ["Pays de Galles", "Royaume-Uni", "GB", 53.068, -4.076, "nature randonnée château montagne", [5, 6, 7, 8, 9], 110, [4, 7], [["Snowdonia", 3], ["Conwy", 1], ["Pembrokeshire", 2]], "Snowdon par le train ou à pied, châteaux d’Édouard Ier, côte du Pembrokeshire.", "E", [7, 7, 9, 12, 15, 17, 19, 19, 17, 14, 10, 8], "Parc national de Snowdonia"],
    ["Lofoten", "Norvège", "NO", 68.209, 13.608, "nature randonnée aurores mer bateau", [6, 7, 8, 2, 3], 170, [5, 8], [["Svolvær", 3], ["Reine", 3]], "Rorbuer de pêcheurs, randonnée du Reinebringen, aurores de septembre à mars.", "UE", [1, 1, 2, 5, 9, 12, 15, 15, 11, 7, 3, 1], "Lofoten"],
    ["Cracovie", "Pologne", "PL", 50.065, 19.945, "ville histoire culture", [5, 6, 7, 8, 9, 12], 70, [3, 5], [["Cracovie", 4]], "Place du Marché, quartier de Kazimierz, Auschwitz-Birkenau et mine de sel de Wieliczka à réserver.", "UE", [1, 3, 8, 14, 19, 22, 24, 24, 19, 13, 7, 2], "Cracovie"],
    ["Transylvanie", "Roumanie", "RO", 45.657, 25.601, "château histoire nature montagne", [5, 6, 7, 8, 9], 60, [5, 8], [["Brașov", 3], ["Sighișoara", 1], ["Sibiu", 2]], "Château de Bran, citadelle de Sighișoara, route Transfăgărășan l’été.", "UE", [1, 4, 9, 15, 20, 23, 25, 25, 20, 14, 7, 2], "Transylvanie"],
    ["Bulgarie", "Bulgarie", "BG", 42.698, 23.322, "histoire montagne plage culture", [5, 6, 7, 8, 9], 55, [5, 9], [["Sofia", 2], ["Plovdiv", 2], ["Varna", 3]], "Monastère de Rila, vieille ville de Plovdiv, plages de la mer Noire.", "UE", [3, 6, 11, 16, 21, 25, 28, 28, 23, 17, 10, 5], "Monastère de Rila"],
    ["Monténégro", "Monténégro", "ME", 42.424, 18.771, "mer nature montagne plage", [5, 6, 7, 9, 10], 75, [5, 8], [["Kotor", 3], ["Budva", 2], ["Žabljak", 2]], "Bouches de Kotor depuis les remparts, parc du Durmitor, plage de Sveti Stefan.", "UE", [12, 13, 15, 19, 23, 27, 30, 30, 26, 21, 16, 13], "Kotor"],
    ["Albanie", "Albanie", "AL", 39.875, 20.005, "plage histoire montagne nature", [5, 6, 9, 10], 55, [6, 10], [["Tirana", 1], ["Berat", 2], ["Ksamil", 3], ["Gjirokastër", 1]], "Riviera albanaise hors juillet-août, villes ottomanes de Berat et Gjirokastër, site de Butrint.", "UE", [12, 14, 17, 20, 25, 29, 32, 32, 28, 23, 17, 13], "Berat"],
    ["Bosnie-Herzégovine", "Bosnie-Herzégovine", "BA", 43.338, 17.815, "histoire culture nature", [5, 6, 9, 10], 50, [3, 6], [["Sarajevo", 2], ["Mostar", 2]], "Pont de Mostar et ses plongeurs, baščaršija de Sarajevo, cascades de Kravice.", "UE", [4, 7, 12, 17, 22, 26, 29, 29, 24, 18, 11, 6], "Mostar"],
    ["Lac d’Ohrid", "Macédoine du Nord", "MK", 41.117, 20.802, "lac histoire nature détente", [5, 6, 7, 8, 9], 50, [3, 6], [["Ohrid", 3], ["Skopje", 1]], "Église Saint-Jean-de-Kaneo au coucher du soleil, baignade dans le lac, monastère de Saint-Naum.", "UE", [5, 8, 12, 17, 22, 26, 29, 29, 24, 18, 11, 6], "Lac d’Ohrid"],
    ["Belgrade & Novi Sad", "Serbie", "RS", 44.787, 20.457, "ville fête histoire", [4, 5, 6, 9, 10], 55, [3, 5], [["Belgrade", 3], ["Novi Sad", 1]], "Forteresse de Kalemegdan, péniches-clubs sur le Danube, festival EXIT à Novi Sad en juillet.", "UE", [4, 7, 12, 18, 23, 26, 29, 29, 24, 18, 11, 5], "Belgrade"],
    ["Géorgie", "Géorgie", "GE", 41.716, 44.783, "montagne gastronomie vin randonnée culture", [5, 6, 7, 8, 9, 10], 60, [7, 12], [["Tbilissi", 3], ["Kazbegi", 2], ["Telavi", 2]], "Église de Gergeti face au Kazbek, vins de Kakhétie en jarre, bains de soufre de Tbilissi.", "P", [7, 9, 14, 19, 24, 28, 31, 31, 26, 20, 13, 8], "Tbilissi"],
    ["Arménie", "Arménie", "AM", 40.177, 44.513, "histoire culture montagne", [5, 6, 9, 10], 55, [5, 8], [["Erevan", 3], ["Dilijan", 2]], "Monastères de Geghard et Tatev (téléphérique), lac Sevan, vue sur l’Ararat depuis Khor Virap.", "P", [2, 5, 12, 19, 24, 30, 34, 34, 29, 21, 12, 4], "Erevan"],
    ["Côte turquoise", "Turquie", "TR", 36.622, 29.116, "plage mer histoire bateau", [5, 6, 9, 10], 70, [6, 10], [["Fethiye", 3], ["Kaş", 3], ["Antalya", 2]], "Lagon d’Ölüdeniz, voie lycienne à pied, cité engloutie de Kekova en bateau.", "P", [15, 16, 19, 22, 27, 32, 35, 35, 31, 26, 20, 16], "Ölüdeniz"],
    ["Tunisie", "Tunisie", "TN", 33.807, 10.845, "plage désert histoire détente", [4, 5, 6, 9, 10], 60, [6, 10], [["Djerba", 3], ["Tozeur", 2], ["Tunis", 2]], "Médina de Tunis et Sidi Bou Saïd, amphithéâtre d’El Jem, oasis et désert autour de Tozeur.", "P", [16, 17, 20, 23, 27, 31, 34, 34, 31, 27, 22, 17], "Djerba"],
    ["Côte atlantique marocaine", "Maroc", "MA", 31.508, -9.77, "plage mer détente culture", [4, 5, 6, 9, 10], 60, [5, 8], [["Essaouira", 3], ["Agadir", 2], ["Taghazout", 2]], "Port et remparts d’Essaouira, surf à Taghazout, vallée du Paradis.", "P", [19, 20, 21, 21, 22, 23, 24, 24, 24, 24, 22, 20], "Essaouira"],
    ["Égypte (mer Rouge)", "Égypte", "EG", 27.257, 33.812, "plage plongée désert détente", [3, 4, 5, 10, 11], 60, [6, 10], [["Hurghada", 4], ["Marsa Alam", 3]], "Récifs de Marsa Alam (dugongs, tortues), excursion à Louxor dans la journée.", "V", [22, 23, 25, 29, 33, 35, 36, 36, 34, 31, 27, 23], "Marsa Alam"],
    ["Oman", "Oman", "OM", 23.588, 58.383, "désert nature mer aventure", [11, 12, 1, 2, 3], 120, [7, 10], [["Mascate", 2], ["Nizwa", 2], ["Wahiba Sands", 1], ["Sour", 2]], "Wadi Shab à pied et à la nage, fort de Nizwa, nuit au désert de Wahiba.", "P", [25, 26, 29, 34, 39, 40, 38, 36, 36, 34, 30, 27], "Oman"],
    ["Dubaï & Abou Dabi", "Émirats arabes unis", "AE", 25.205, 55.271, "ville shopping plage désert", [11, 12, 1, 2, 3], 180, [4, 7], [["Dubaï", 4], ["Abou Dabi", 1]], "Burj Khalifa au coucher du soleil, souks de Deira, Louvre Abou Dabi et grande mosquée.", "P", [24, 25, 29, 33, 38, 40, 41, 41, 39, 35, 30, 26], "Dubaï"],
    ["Ouzbékistan", "Ouzbékistan", "UZ", 39.655, 66.975, "histoire culture désert", [4, 5, 9, 10], 60, [7, 12], [["Tachkent", 1], ["Samarcande", 3], ["Boukhara", 3], ["Khiva", 2]], "Train rapide Afrosiyob entre les villes, Registan de Samarcande la nuit, médersa de Boukhara.", "P", [6, 9, 15, 22, 28, 34, 36, 34, 29, 21, 13, 8], "Samarcande"],
    ["Rajasthan", "Inde", "IN", 26.912, 75.787, "culture histoire désert couleurs", [10, 11, 12, 1, 2, 3], 60, [10, 16], [["Delhi", 2], ["Agra", 1], ["Jaipur", 3], ["Udaipur", 3], ["Jodhpur", 2]], "Taj Mahal au lever du soleil, forts de Jaipur et Jodhpur, palais flottant d’Udaipur.", "V", [22, 25, 31, 37, 40, 39, 34, 32, 33, 33, 29, 24], "Jaipur"],
    ["Kerala", "Inde", "IN", 9.931, 76.267, "nature détente culture plage", [11, 12, 1, 2, 3], 55, [8, 14], [["Kochi", 2], ["Munnar", 2], ["Alleppey", 2], ["Varkala", 3]], "Nuit sur un houseboat dans les backwaters, plantations de thé de Munnar, ayurveda.", "V", [31, 32, 33, 33, 32, 29, 28, 28, 29, 30, 30, 31], "Kerala"],
    ["Népal", "Népal", "NP", 27.717, 85.324, "montagne randonnée culture aventure", [10, 11, 3, 4], 45, [10, 18], [["Katmandou", 3], ["Pokhara", 3], ["Chitwan", 2]], "Trek de l’Annapurna ou du camp de base de l’Everest, places royales de la vallée, safari à Chitwan.", "V", [19, 21, 25, 28, 29, 29, 28, 28, 28, 27, 23, 20], "Katmandou"],
    ["Maldives", "Maldives", "MV", 3.202, 73.221, "plage plongée romantique détente", [11, 12, 1, 2, 3, 4], 200, [6, 10], [["Malé", 1], ["Maafushi", 6]], "Guesthouses sur les îles locales pour le budget, raies manta et requins-baleines, banc de sable.", "P", [30, 31, 31, 32, 31, 31, 30, 30, 30, 30, 30, 30], "Maldives"],
    ["Philippines (Palawan)", "Philippines", "PH", 11.194, 119.411, "plage plongée nature aventure", [12, 1, 2, 3, 4, 5], 60, [10, 16], [["El Nido", 4], ["Coron", 3], ["Puerto Princesa", 2]], "Island hopping à El Nido, épaves de Coron, rivière souterraine de Puerto Princesa.", "P", [30, 31, 32, 33, 33, 32, 31, 31, 31, 31, 31, 30], "El Nido"],
    ["Malaisie & Bornéo", "Malaisie", "MY", 3.139, 101.687, "nature ville faune plage gastronomie", [3, 4, 5, 6, 7, 8], 60, [10, 16], [["Kuala Lumpur", 3], ["Penang", 2], ["Kota Kinabalu", 2], ["Sepilok", 2]], "Street food de Penang, orangs-outans de Sepilok, ascension du Kinabalu.", "P", [32, 33, 33, 33, 33, 32, 32, 32, 32, 32, 32, 31], "Bornéo"],
    ["Singapour", "Singapour", "SG", 1.352, 103.82, "ville gastronomie shopping", [2, 3, 4, 5, 6, 7, 8], 170, [3, 5], [["Singapour", 4]], "Hawker centres pour manger, Gardens by the Bay le soir, quartier de Little India.", "P", [30, 31, 32, 32, 32, 31, 31, 31, 31, 31, 31, 30], "Singapour"],
    ["Cambodge", "Cambodge", "KH", 13.412, 103.867, "histoire culture nature", [11, 12, 1, 2, 3], 45, [7, 12], [["Siem Reap", 3], ["Phnom Penh", 2], ["Kampot", 2]], "Temples d’Angkor sur 3 jours, à vélo ou en tuk-tuk, poivre de Kampot.", "V", [32, 33, 35, 36, 35, 34, 33, 32, 32, 31, 31, 31], "Angkor"],
    ["Laos", "Laos", "LA", 19.889, 102.135, "nature culture détente aventure", [11, 12, 1, 2, 3], 40, [8, 14], [["Luang Prabang", 3], ["Vang Vieng", 2], ["Vientiane", 1], ["4000 îles", 3]], "Procession des moines à Luang Prabang, cascades de Kuang Si, 4000 îles du Mékong.", "V", [28, 31, 33, 34, 33, 32, 31, 31, 31, 30, 29, 27], "Luang Prabang"],
    ["Thaïlande (îles du Sud)", "Thaïlande", "TH", 7.88, 98.392, "plage plongée fête détente", [12, 1, 2, 3, 4], 60, [8, 14], [["Krabi", 4], ["Koh Lanta", 3], ["Koh Phi Phi", 2]], "Côté Andaman de décembre à avril, kayak dans les mangroves, Railay en long-tail.", "P", [32, 33, 33, 34, 32, 31, 31, 31, 30, 30, 31, 31], "Krabi"],
    ["Chiang Mai & nord de la Thaïlande", "Thaïlande", "TH", 18.788, 98.985, "culture nature gastronomie aventure", [11, 12, 1, 2], 45, [6, 10], [["Chiang Mai", 4], ["Pai", 2], ["Chiang Rai", 2]], "Temples de Chiang Mai, sanctuaire d’éléphants éthique, temple blanc de Chiang Rai.", "P", [29, 32, 35, 36, 34, 32, 31, 31, 31, 31, 30, 28], "Chiang Mai"],
    ["Lombok & îles Gili", "Indonésie", "ID", -8.651, 116.324, "plage plongée nature randonnée", [5, 6, 7, 8, 9], 50, [6, 10], [["Gili Air", 3], ["Kuta Lombok", 3]], "Tortues autour des Gili, ascension du Rinjani, plages désertes du sud de Lombok.", "V", [30, 30, 31, 31, 31, 30, 30, 31, 31, 32, 31, 30], "Îles Gili"],
    ["Java", "Indonésie", "ID", -7.795, 110.369, "culture volcan nature histoire", [5, 6, 7, 8, 9], 45, [7, 12], [["Yogyakarta", 3], ["Mont Bromo", 1], ["Ijen", 1]], "Borobudur et Prambanan au lever du soleil, volcan Bromo à l’aube, flammes bleues de l’Ijen.", "V", [30, 30, 31, 31, 31, 31, 31, 31, 32, 32, 31, 30], "Borobudur"],
    ["Corée du Sud", "Corée du Sud", "KR", 37.567, 126.978, "ville culture gastronomie nature", [4, 5, 9, 10, 11], 120, [7, 12], [["Séoul", 4], ["Gyeongju", 2], ["Busan", 2]], "Palais de Séoul en hanbok, temples de Gyeongju, marché aux poissons de Busan.", "E", [2, 5, 11, 18, 23, 27, 29, 30, 26, 20, 12, 4], "Séoul"],
    ["Taïwan", "Taïwan", "TW", 25.033, 121.565, "ville gastronomie nature randonnée", [3, 4, 5, 10, 11], 90, [7, 12], [["Taipei", 3], ["Gorges de Taroko", 2], ["Tainan", 2]], "Marchés de nuit de Taipei, gorges de Taroko, lac du Soleil et de la Lune.", "P", [19, 19, 22, 26, 29, 32, 34, 34, 31, 27, 24, 20], "Taipei"],
    ["Chine", "Chine", "CN", 39.904, 116.407, "histoire culture ville gastronomie", [4, 5, 9, 10], 100, [10, 16], [["Pékin", 4], ["Xi’an", 2], ["Shanghai", 3]], "Grande Muraille à Mutianyu, armée de terre cuite de Xi’an, train rapide entre les villes.", "P", [2, 6, 13, 21, 27, 31, 32, 30, 26, 19, 10, 4], "Grande Muraille"],
    ["Hong Kong & Macao", "Hong Kong", "HK", 22.32, 114.169, "ville gastronomie shopping nature", [10, 11, 12, 3, 4], 150, [3, 6], [["Hong Kong", 4], ["Macao", 1]], "Victoria Peak, ferry Star, randonnée Dragon’s Back, dim sum le matin.", "P", [19, 19, 22, 25, 29, 31, 32, 32, 31, 28, 24, 20], "Hong Kong"],
    ["Japon (Hokkaido & Okinawa)", "Japon", "JP", 43.064, 141.347, "nature neige plage gastronomie", [1, 2, 6, 7, 8, 9], 130, [7, 12], [["Sapporo", 3], ["Furano", 2], ["Okinawa", 4]], "Poudreuse et festival de la neige de Sapporo en février, lavande de Furano en juillet, plages d’Okinawa.", "P", [-1, 0, 4, 11, 17, 21, 25, 26, 22, 16, 8, 2], "Hokkaidō"],
    ["Mongolie", "Mongolie", "MN", 47.886, 106.906, "nature aventure désert culture", [6, 7, 8], 80, [10, 16], [["Oulan-Bator", 2], ["Désert de Gobi", 4], ["Kharkhorin", 2]], "Nuits en yourte chez l’habitant, festival du Naadam en juillet, dunes de Khongoryn Els.", "V", [-16, -11, -1, 9, 17, 22, 24, 22, 16, 7, -5, -13], "Désert de Gobi"],
    ["Australie (côte est)", "Australie", "AU", -33.869, 151.209, "ville plage nature plongée roadtrip", [9, 10, 11, 3, 4, 5], 170, [14, 21], [["Sydney", 4], ["Brisbane", 2], ["Cairns", 4]], "Opéra de Sydney et plages de Bondi, Grande Barrière de corail depuis Cairns, forêt de Daintree.", "E", [26, 26, 25, 23, 20, 18, 17, 18, 20, 22, 24, 25], "Sydney"],
    ["Nouvelle-Zélande", "Nouvelle-Zélande", "NZ", -36.848, 174.763, "nature randonnée aventure roadtrip montagne", [11, 12, 1, 2, 3, 4], 150, [14, 21], [["Auckland", 2], ["Rotorua", 2], ["Queenstown", 4], ["Christchurch", 2]], "Van ou voiture, Milford Sound, randonnée du Tongariro, réserver les Great Walks.", "E", [24, 24, 23, 21, 18, 16, 15, 15, 17, 18, 20, 22], "Milford Sound"],
    ["Floride", "États-Unis", "US", 25.762, -80.192, "plage ville parcs roadtrip", [11, 12, 1, 2, 3, 4], 180, [7, 14], [["Miami", 3], ["Key West", 2], ["Orlando", 3]], "Art déco de South Beach, route des Keys, Everglades en hydroglisseur, parcs d’Orlando.", "E", [24, 25, 26, 28, 30, 32, 33, 33, 32, 29, 27, 25], "Miami"],
    ["Californie", "États-Unis", "US", 37.775, -122.419, "roadtrip nature ville plage", [4, 5, 6, 9, 10], 190, [10, 16], [["San Francisco", 3], ["Yosemite", 2], ["Big Sur", 1], ["Los Angeles", 3]], "Highway 1 par Big Sur, Yosemite au printemps pour les cascades, Golden Gate à vélo.", "E", [14, 16, 17, 18, 19, 21, 22, 22, 23, 21, 17, 14], "Big Sur"],
    ["Hawaï", "États-Unis", "US", 20.798, -156.332, "plage volcan nature plongée romantique", [4, 5, 6, 9, 10], 220, [10, 14], [["Oahu", 3], ["Maui", 4], ["Big Island", 3]], "Route de Hana à Maui, lever du soleil au Haleakalā, volcans de Big Island.", "E", [27, 27, 27, 28, 29, 30, 31, 31, 31, 30, 29, 27], "Hawaï"],
    ["Louisiane", "États-Unis", "US", 29.951, -90.071, "musique gastronomie fête culture", [3, 4, 5, 10, 11], 170, [5, 8], [["La Nouvelle-Orléans", 4], ["Lafayette", 2]], "Jazz sur Frenchmen Street, bayous en bateau, cuisine cajun et créole.", "E", [17, 19, 23, 26, 30, 32, 33, 33, 31, 27, 22, 18], "La Nouvelle-Orléans"],
    ["Rocheuses canadiennes", "Canada", "CA", 51.178, -115.571, "nature montagne randonnée lac faune", [6, 7, 8, 9], 160, [7, 12], [["Calgary", 1], ["Banff", 3], ["Jasper", 3]], "Lacs Louise et Moraine tôt le matin (navettes), Icefields Parkway, ours et wapitis.", "E", [-4, -2, 3, 9, 14, 18, 22, 21, 16, 9, 1, -4], "Parc national de Banff"],
    ["Vancouver & île de Vancouver", "Canada", "CA", 49.283, -123.121, "nature ville mer faune", [5, 6, 7, 8, 9], 150, [7, 12], [["Vancouver", 3], ["Victoria", 2], ["Tofino", 3]], "Stanley Park à vélo, baleines et ours depuis Tofino, ferry vers l’île.", "E", [7, 8, 11, 14, 17, 20, 23, 23, 19, 14, 9, 7], "Tofino"],
    ["Mexico & Oaxaca", "Mexique", "MX", 19.433, -99.133, "culture gastronomie histoire ville", [10, 11, 12, 1, 2, 3, 4], 70, [8, 12], [["Mexico", 4], ["Puebla", 1], ["Oaxaca", 3]], "Teotihuacán au lever du soleil, musée d’anthropologie, mole et mezcal à Oaxaca, Fête des morts début novembre.", "P", [21, 23, 26, 27, 27, 25, 24, 24, 23, 22, 22, 21], "Oaxaca de Juárez"],
    ["Cuba", "Cuba", "CU", 23.113, -82.366, "culture musique plage histoire", [11, 12, 1, 2, 3, 4], 70, [10, 14], [["La Havane", 3], ["Viñales", 2], ["Trinidad", 3], ["Varadero", 2]], "Casas particulares, vieille Havane en voiture américaine, vallée de Viñales à cheval. Prévoir des espèces.", "V", [26, 27, 28, 29, 30, 31, 32, 32, 31, 29, 28, 27], "La Havane"],
    ["République dominicaine", "République dominicaine", "DO", 18.582, -68.405, "plage détente nature", [12, 1, 2, 3, 4], 90, [7, 12], [["Punta Cana", 4], ["Samaná", 3]], "Baleines à bosse de Samaná en février, plage de Playa Rincón, île Saona.", "P", [29, 29, 30, 30, 31, 31, 32, 32, 32, 31, 30, 29], "Samaná"],
    ["Guatemala", "Guatemala", "GT", 14.557, -90.733, "culture volcan histoire nature", [11, 12, 1, 2, 3, 4], 50, [10, 14], [["Antigua", 3], ["Lac Atitlán", 3], ["Flores", 2]], "Antigua et ses volcans, villages du lac Atitlán, cité maya de Tikal à l’aube.", "P", [23, 25, 26, 27, 26, 24, 24, 24, 24, 23, 23, 23], "Antigua Guatemala"],
    ["Panama", "Panama", "PA", 8.983, -79.517, "nature plage ville plongée", [1, 2, 3, 4], 90, [8, 12], [["Panama", 2], ["Boquete", 2], ["Bocas del Toro", 3], ["San Blas", 2]], "Écluses de Miraflores, café de Boquete, îles de San Blas chez les Guna.", "P", [31, 32, 32, 32, 31, 30, 30, 30, 29, 29, 29, 30], "Bocas del Toro"],
    ["Pérou", "Pérou", "PE", -13.532, -71.968, "histoire montagne randonnée culture aventure", [5, 6, 7, 8, 9], 70, [12, 18], [["Lima", 2], ["Cuzco", 3], ["Vallée sacrée", 2], ["Aguas Calientes", 1], ["Arequipa", 2]], "Machu Picchu à réserver des mois à l’avance, s’acclimater à Cuzco avant le trek, lac Titicaca.", "P", [20, 20, 20, 21, 21, 21, 20, 21, 22, 22, 22, 21], "Machu Picchu"],
    ["Bolivie", "Bolivie", "BO", -20.134, -67.489, "aventure désert montagne nature", [5, 6, 7, 8, 9, 10], 50, [10, 16], [["La Paz", 2], ["Uyuni", 3], ["Sucre", 2]], "Salar d’Uyuni en 4x4 sur 3 jours, téléphériques de La Paz, attention à l’altitude.", "P", [17, 17, 17, 16, 14, 13, 13, 14, 15, 17, 18, 18], "Salar d’Uyuni"],
    ["Chili", "Chili", "CL", -22.909, -68.2, "désert montagne nature aventure randonnée", [10, 11, 12, 1, 2, 3], 100, [12, 18], [["Santiago", 2], ["San Pedro de Atacama", 3], ["Puerto Natales", 3], ["Valparaíso", 1]], "Désert d’Atacama et ses lagunes, Torres del Paine (réserver les refuges), murs peints de Valparaíso.", "P", [25, 25, 24, 23, 21, 20, 20, 21, 22, 23, 24, 25], "San Pedro de Atacama"],
    ["Argentine", "Argentine", "AR", -34.604, -58.382, "nature ville montagne gastronomie", [10, 11, 12, 1, 2, 3], 90, [14, 21], [["Buenos Aires", 4], ["Iguazú", 2], ["Salta", 3], ["Mendoza", 3]], "Tango à San Telmo, chutes d’Iguazú des deux côtés, Quebrada de Humahuaca, vignobles de Mendoza.", "P", [30, 29, 26, 23, 19, 16, 15, 17, 19, 22, 25, 28], "Chutes d’Iguazú"],
    ["Brésil", "Brésil", "BR", -22.907, -43.173, "plage ville nature fête", [4, 5, 6, 9, 10], 90, [12, 18], [["Rio de Janeiro", 4], ["Paraty", 2], ["Iguaçu", 2], ["Salvador", 3]], "Pain de Sucre au coucher du soleil, Paraty et ses îles, carnaval en février.", "P", [30, 30, 29, 28, 26, 25, 25, 26, 25, 26, 27, 29], "Rio de Janeiro"],
    ["Colombie", "Colombie", "CO", 6.244, -75.581, "culture nature plage ville", [12, 1, 2, 3, 7, 8], 60, [12, 18], [["Bogotá", 2], ["Medellín", 3], ["Salento", 2], ["Carthagène", 3]], "Vallée de Cocora et ses palmiers de cire, Comuna 13 à Medellín, remparts de Carthagène.", "P", [19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19], "Carthagène des Indes"],
    ["Équateur & Galápagos", "Équateur", "EC", -0.953, -90.966, "nature faune plongée volcan aventure", [12, 1, 2, 3, 4, 5, 6], 130, [10, 16], [["Quito", 2], ["Baños", 2], ["Galápagos", 6]], "Îles Galápagos en croisière ou depuis Santa Cruz, volcan Cotopaxi, téléphérique de Quito.", "P", [29, 30, 30, 30, 28, 26, 25, 25, 26, 26, 27, 28], "Îles Galápagos"],
    ["Tanzanie & Zanzibar", "Tanzanie", "TZ", -2.333, 34.833, "faune safari plage aventure", [6, 7, 8, 9, 10, 1, 2], 180, [10, 14], [["Arusha", 1], ["Serengeti", 3], ["Ngorongoro", 1], ["Zanzibar", 4]], "Grande migration dans le Serengeti (juillet à octobre), cratère du Ngorongoro, Stone Town et plages de Zanzibar.", "V", [28, 29, 28, 27, 26, 25, 25, 26, 27, 28, 28, 28], "Parc national du Serengeti"],
    ["Kenya", "Kenya", "KE", -1.406, 35.009, "faune safari aventure plage", [7, 8, 9, 10, 1, 2], 170, [8, 12], [["Nairobi", 1], ["Masai Mara", 3], ["Amboseli", 2], ["Diani", 3]], "Traversée de la rivière Mara en août, éléphants face au Kilimandjaro à Amboseli, plage de Diani.", "E", [26, 27, 27, 25, 24, 23, 22, 23, 25, 26, 25, 25], "Réserve nationale du Masai Mara"],
    ["Afrique du Sud", "Afrique du Sud", "ZA", -33.925, 18.424, "nature faune vin roadtrip ville", [3, 4, 5, 9, 10, 11], 100, [12, 18], [["Le Cap", 4], ["Stellenbosch", 2], ["Route des Jardins", 3], ["Kruger", 3]], "Table Mountain par beau temps, route des Jardins, safari autonome dans le Kruger.", "P", [26, 27, 25, 23, 20, 18, 18, 18, 19, 21, 24, 25], "Montagne de la Table"],
    ["Namibie", "Namibie", "NA", -24.727, 15.284, "désert faune roadtrip aventure", [5, 6, 7, 8, 9, 10], 120, [12, 18], [["Windhoek", 1], ["Sossusvlei", 2], ["Swakopmund", 2], ["Etosha", 3]], "Dunes de Sossusvlei au lever du soleil, Etosha en saison sèche, 4x4 conseillé.", "V", [30, 29, 28, 26, 23, 20, 20, 23, 26, 29, 29, 30], "Sossusvlei"],
    ["Madagascar", "Madagascar", "MG", -18.879, 47.508, "nature faune plage aventure", [4, 5, 6, 7, 8, 9, 10, 11], 60, [12, 18], [["Antananarivo", 1], ["Andasibe", 2], ["Morondava", 2], ["Nosy Be", 4]], "Lémuriens d’Andasibe, allée des Baobabs au coucher du soleil, plages de Nosy Be.", "V", [26, 26, 26, 25, 23, 21, 20, 21, 23, 26, 27, 27], "Allée des Baobabs"],
    ["Île Maurice", "Maurice", "MU", -20.348, 57.552, "plage détente plongée nature romantique", [4, 5, 6, 9, 10, 11, 12], 120, [7, 12], [["Grand Baie", 3], ["Le Morne", 3], ["Chamarel", 1]], "Lagon du Morne, terre des sept couleurs de Chamarel, dauphins de Tamarin tôt le matin.", "P", [30, 30, 30, 29, 27, 26, 25, 25, 26, 27, 28, 29], "Le Morne Brabant"],
    ["Seychelles", "Seychelles", "SC", -4.68, 55.492, "plage romantique plongée détente nature", [4, 5, 10, 11], 200, [7, 12], [["Mahé", 3], ["Praslin", 3], ["La Digue", 2]], "Anse Source d’Argent à La Digue, vallée de Mai à Praslin, guesthouses plutôt que resorts.", "E", [30, 30, 31, 31, 30, 29, 28, 28, 29, 29, 30, 30], "La Digue"],
    ["Sénégal", "Sénégal", "SN", 14.716, -17.467, "culture plage nature musique", [11, 12, 1, 2, 3, 4, 5], 60, [8, 12], [["Dakar", 2], ["Île de Gorée", 1], ["Saint-Louis", 2], ["Saly", 3]], "Île de Gorée, Saint-Louis et sa langue de Barbarie, lac Rose, delta du Saloum en pirogue.", "P", [25, 25, 25, 24, 25, 28, 29, 30, 30, 30, 29, 27], "Saint-Louis (Sénégal)"],
    ["Chutes Victoria & Botswana", "Zimbabwe", "ZW", -17.924, 25.856, "faune safari nature aventure", [5, 6, 7, 8, 9, 10], 180, [8, 12], [["Victoria Falls", 2], ["Chobe", 2], ["Delta de l’Okavango", 3]], "Chutes en avril-mai pour le débit, éléphants de Chobe en bateau, mokoro dans le delta de l’Okavango.", "V", [29, 29, 29, 29, 27, 24, 25, 28, 32, 33, 32, 30], "Chutes Victoria"],
    ["Cap-Vert (Santo Antão & São Vicente)", "Cap-Vert", "CV", 16.891, -24.981, "randonnée musique nature plage", [11, 12, 1, 2, 3, 4, 5, 6], 65, [8, 12], [["Mindelo", 3], ["Santo Antão", 4]], "Randonnées vertigineuses de Santo Antão, morna et bars de Mindelo, ferry entre les îles.", "E", [25, 25, 25, 25, 26, 26, 27, 28, 29, 29, 28, 26], "Santo Antão"],
    ["Maroc (Chefchaouen & Nord)", "Maroc", "MA", 35.171, -5.27, "culture nature randonnée ville", [4, 5, 6, 9, 10], 55, [5, 8], [["Tanger", 2], ["Chefchaouen", 3]], "Ruelles bleues de Chefchaouen tôt le matin, cascades d’Akchour, médina de Tanger.", "P", [16, 17, 19, 21, 24, 28, 31, 32, 29, 24, 19, 16], "Chefchaouen"],
    ["Laponie suédoise", "Suède", "SE", 67.856, 20.225, "neige aurores aventure nature", [12, 1, 2, 3], 180, [4, 7], [["Kiruna", 2], ["Abisko", 3]], "Aurores à Abisko (ciel souvent clair), traîneau à chiens, Icehotel de Jukkasjärvi.", "UE", [-11, -10, -6, 0, 6, 13, 16, 14, 8, 1, -6, -9], "Abisko"],
    ["Naxos & Paros", "Grèce", "GR", 37.103, 25.376, "plage mer détente gastronomie", [5, 6, 9, 10], 85, [5, 9], [["Naxos", 3], ["Paros", 3]], "Cyclades plus calmes que Santorin, villages de Naxos en voiture, Naoussa le soir.", "UE", [14, 14, 16, 19, 23, 27, 28, 28, 26, 22, 19, 16], "Naxos"],
    ["Vietnam (centre)", "Vietnam", "VN", 15.88, 108.335, "culture plage gastronomie histoire", [2, 3, 4, 5], 45, [6, 10], [["Hué", 2], ["Hội An", 3], ["Đà Nẵng", 2]], "Col des Nuages à moto, Hội An aux lanternes, cité impériale de Hué.", "P", [25, 26, 29, 31, 33, 34, 34, 34, 31, 29, 27, 25], "Hội An"],
    ["Baie d’Halong & nord du Vietnam", "Vietnam", "VN", 20.91, 107.184, "nature culture randonnée bateau", [3, 4, 5, 9, 10, 11], 45, [6, 10], [["Hanoï", 3], ["Ninh Bình", 2], ["Baie d’Halong", 1], ["Sa Pa", 2]], "Nuit sur une jonque dans la baie de Lan Ha (plus calme), rizières de Sa Pa, vieux quartier de Hanoï.", "P", [19, 20, 23, 28, 32, 33, 33, 32, 31, 29, 25, 22], "Baie d’Along"],
    ["Montréal", "Canada", "CA", 45.502, -73.567, "ville culture gastronomie fête", [5, 6, 7, 8, 9, 10], 130, [3, 6], [["Montréal", 4]], "Mont Royal, Vieux-Montréal, festivals d’été (jazz, Juste pour rire), poutine et bagels.", "E", [-5, -3, 2, 11, 19, 24, 26, 25, 20, 13, 6, -2], "Montréal"],
    ["Parcs de l’Utah", "États-Unis", "US", 37.298, -113.026, "nature randonnée roadtrip désert", [4, 5, 9, 10], 170, [7, 12], [["Springdale", 3], ["Bryce Canyon", 1], ["Moab", 3]], "Angels Landing (permis), Bryce au lever du soleil, Delicate Arch au coucher du soleil.", "E", [11, 14, 19, 23, 29, 35, 38, 37, 32, 24, 16, 11], "Parc national de Zion"],
    ["Patagonie", "Argentine", "AR", -50.338, -72.264, "nature montagne randonnée aventure", [11, 12, 1, 2, 3], 120, [8, 12], [["El Calafate", 3], ["El Chaltén", 3], ["Ushuaïa", 2]], "Perito Moreno, randonnée au Fitz Roy depuis El Chaltén, canal de Beagle à Ushuaïa.", "P", [19, 19, 16, 13, 8, 5, 5, 7, 10, 13, 16, 18], "El Chaltén"],
    ["Canaries (Gran Canaria)", "Espagne", "ES", 27.958, -15.596, "plage nature randonnée détente", [1, 2, 3, 4, 5, 9, 10, 11, 12], 90, [5, 8], [["Las Palmas", 3], ["Maspalomas", 3]], "Dunes de Maspalomas, Roque Nublo, plage de Las Canteras en ville.", "UE", [21, 21, 22, 23, 24, 25, 26, 27, 27, 26, 24, 22], "Gran Canaria"]
  ];
  const DEPS = {Paris:[48.86,2.35,1], Nantes:[47.22,-1.55,0], Brest:[48.39,-4.49,0], Rennes:[48.11,-1.68,0], Lyon:[45.76,4.84,1], Marseille:[43.30,5.37,1], Nice:[43.70,7.27,1], Bordeaux:[44.84,-0.58,0], Toulouse:[43.60,1.44,0], Lille:[50.63,3.06,0], Strasbourg:[48.57,7.75,0], Montpellier:[43.61,3.88,0], Bruxelles:[50.85,4.35,1], 'Genève':[46.20,6.15,1]};
  const VISA = {UE:'🪪 Carte d’identité suffit', FR:'🇫🇷 Comme en France', P:'🛂 Passeport', E:'🛂 Passeport + autorisation en ligne (ESTA, AVE, ETA…)', V:'🛂 Passeport + visa (souvent en ligne ou à l’arrivée)'};
  const INSP_TAGS = [['plage','🏖️ Plage'],['ville','🏙️ Ville'],['culture','🏛️ Culture'],['nature','🌿 Nature'],['randonnée','🥾 Rando'],['gastronomie','🍝 Gastronomie'],['aventure','🧗 Aventure'],['détente','🧘 Détente'],['fête','🎉 Fête'],['mer','⛵ Mer'],['montagne','🏔️ Montagne'],['histoire','🏺 Histoire'],['romantique','💕 Romantique'],['faune','🐘 Animaux'],['neige','❄️ Neige'],['roadtrip','🚐 Road-trip']];
  const MOIS_L = (window.I18N && I18N.lang !== 'fr') ? [...Array(12).keys()].map(i=>new Intl.DateTimeFormat(I18N.locale, {month:'long'}).format(new Date(2024, i, 15))) : ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  function inspire(sample){
    const S = sample || M.insp || {};
    const v = (k, d) => S[k] != null && S[k] !== '' ? S[k] : d;
    const sel = (id, opts, cur) => `<select class="v-in" id="${id}">${opts.map(([val,l])=>`<option value="${val}"${String(cur)===String(val)?' selected':''}>${l}</option>`).join('')}</select>`;
    setTimeout(()=>{ const d = document.getElementById('in-dep'); if(d) d.onchange = () => { document.getElementById('in-other').style.display = d.value === 'autre' ? '' : 'none'; }; }, 50);
    openSheet(`<h2>💡 Où partir ?</h2><div class="v-sum-small" style="margin-bottom:8px">Réponds en 30 secondes : l’appli compare ${DESTS.length} destinations (météo du mois, temps de trajet depuis chez toi, budget, formalités) et te propose les meilleures, avec un itinéraire type.</div>
      <div class="v-f2"><div class="v-f"><label>Départ de</label>${sel('in-dep', [...Object.keys(DEPS).map(k=>[k,k]), ['autre','✏️ Autre ville…']], v('dep','Nantes'))}</div>
        <div class="v-f"><label>Quand ?</label>${sel('in-mois', [['','Je suis flexible'], ...MOIS_L.map((m,i)=>[i+1, m])], v('mois',''))}</div></div>
      <div class="v-f2"><div class="v-f"><label>Combien de jours ?</label>${sel('in-duree', [['3','Week-end (2–3 j)'],['5','4–5 jours'],['7','1 semaine'],['10','10 jours'],['14','2 semaines'],['21','3 semaines et +']], v('duree','7'))}</div>
        <div class="v-f"><label>Combien de voyageurs ?</label>${sel('in-nb', [['1','1'],['2','2'],['3','3'],['4','4'],['5','5'],['6','6 et +']], v('nb','2'))}</div></div>
      <div class="v-f2"><div class="v-f"><label>Budget total par personne</label><input class="v-in" id="in-budget" inputmode="numeric" value="${esc(v('budget','1200'))}" placeholder="${CS()}, transport compris"></div>
        <div class="v-f"><label>Style</label>${sel('in-style', [['eco','Économique'],['confort','Confort'],['luxe','Petit luxe']], v('style','confort'))}</div></div>
      <div class="v-f2"><div class="v-f"><label>Trajet au maximum</label>${sel('in-vol', [['2','2 h'],['4','4 h'],['8','8 h'],['99','Peu importe']], v('vol','4'))}</div>
        <div class="v-f"><label>Climat souhaité</label>${sel('in-climat', [['','Peu importe'],['chaud','Chaud (26 °C et +)'],['doux','Doux (18–25 °C)'],['frais','Frais (< 18 °C)']], v('climat',''))}</div></div>
      <div class="v-f2"><div class="v-f"><label>Avec qui ?</label>${sel('in-qui', [['solo','Seul(e)'],['couple','En couple'],['amis','Entre amis'],['famille','En famille']], v('qui','couple'))}</div>
        <div class="v-f"><label>Rythme</label>${sel('in-rythme', [['calme','Tranquille'],['equil','Équilibré'],['intense','J’en veux plein']], v('rythme','equil'))}</div></div>
      <div class="v-f2" id="in-other" style="${v('dep','Nantes')==='autre' ? '' : 'display:none'}"><div class="v-f"><label>Ta ville de départ</label><input class="v-in" id="in-deptxt" value="${esc(v('depTxt',''))}" placeholder="Ex. Plougastel, Genève, Montréal…"></div>
        <div class="v-f"><label>Aéroport (code, facultatif)</label><input class="v-in" id="in-iata" value="${esc(v('iata',''))}" placeholder="Ex. BES, GVA, YUL" maxlength="3" autocapitalize="characters"></div></div>
      <label class="cv-checkline"><input type="checkbox" id="in-cni"${S.cni?' checked':''}> Uniquement avec la carte d’identité (pas de passeport)</label>
      <div class="v-f"><label>Envies (plusieurs choix)</label><div class="v-filters" style="flex-wrap:wrap">${INSP_TAGS.map(([k,l])=>`<button type="button" class="v-chip${(S.tags||[]).includes(k)?' on':''}" data-tag="${k}" onclick="this.classList.toggle('on')">${l}</button>`).join('')}</div></div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.inspireGo()">✨ Me proposer des destinations</button><button type="button" class="v-btn sec" onclick="CV.inspireDemo()">👀 Exemple</button></div>`);
  }
  function inspireDemo(){ inspire({dep:'Nantes', mois:'5', duree:'7', nb:'2', budget:'1100', style:'confort', vol:'4', climat:'chaud', qui:'couple', rythme:'equil', tags:['mer','gastronomie','culture']}); }
  function inspCalc(S){
    const dep = DEPS[S.dep] || (S.depLL ? [S.depLL[0], S.depLL[1], 0] : DEPS.Nantes), days = +S.duree, bud = num(S.budget), maxH = +S.vol, sty = {eco:0.7, confort:1, luxe:1.8}[S.style] || 1, now = new Date();
    return DESTS.map((d, i)=>{
      const [nom, pays, cc, la, lo, tg, best, perDay, dur, itin, tip, visa, temps, wk] = d, tags = tg.split(' ');
      const km_ = km({lat:dep[0], lng:dep[1]}, {lat:la, lng:lo}), ground = cc === 'FR' && km_ < 900 && !['RE','GP'].includes(cc);
      const escale = !dep[2] && km_ > 2500, h = ground ? km_ / 85 : km_ / 780 + 0.7 + (escale ? 2.5 : 0);
      const trans = ground ? Math.round(km_ * 0.24) : km_ < 1000 ? 140 : km_ < 2000 ? 210 : km_ < 3500 ? 320 : km_ < 6000 ? 560 : km_ < 9000 ? 780 : 980;
      const mo = +S.mois || (best.find(m=>m > now.getMonth()+1) || best[0]), tmp = temps[mo-1];
      const stay = Math.round(perDay * sty * Math.max(1, days - 1)), est = trans + (escale ? 80 : 0) + stay;
      let sc = 0; const why = [], warn = [];
      const hit = (S.tags||[]).filter(t=>tags.includes(t)); sc += Math.min(hit.length, 4) * 3;
      if(best.includes(mo)){ sc += 4; why.push(`📅 ${MOIS_L[mo-1]} : très bonne période`); } else { sc -= 3; warn.push(`${MOIS_L[mo-1]} n’est pas la meilleure saison`); }
      const cl = tmp >= 26 ? 'chaud' : tmp >= 18 ? 'doux' : 'frais';
      if(S.climat){ if(cl === S.climat){ sc += 3; } else { sc -= 3; warn.push(`${tmp} °C en moyenne (${cl})`); } }
      if(h > maxH){ sc -= 8; warn.push(`trajet ≈ ${hhm(h)}`); }
      if(bud){ if(est <= bud){ sc += 3; } else if(est <= bud * 1.15){ warn.push('budget un peu juste'); } else { sc -= 4; warn.push(`budget ≈ ${eur(est)}`); } }
      if(days >= dur[0] && days <= dur[1] + 3) sc += 2; else if(days < dur[0] * 0.6){ sc -= 4; warn.push(`idéal ${dur[0]}–${dur[1]} jours`); }
      if(S.cni && !['UE','FR'].includes(visa)){ sc -= 10; warn.push('passeport nécessaire'); }
      if(S.qui === 'famille'){ if(tags.includes('plage')) sc += 1; if(tags.includes('fête')) sc -= 2; }
      if(S.qui === 'couple' && tags.includes('romantique')) sc += 2;
      if(S.qui === 'amis' && tags.includes('fête')) sc += 2;
      if(hit.length) why.unshift('✔︎ ' + hit.join(', '));
      return {i, d, nom, pays, cc, tip, visa, wk, tags, best, dur, sc, est, trans, stay, h, ground, escale, mo, tmp, why, warn, itin, tb: -Math.abs(tmp - 25) - h / 10};
    }).sort((a,b)=>b.sc-a.sc || b.tb-a.tb);   // à score égal : le climat le plus agréable ce mois-là et le trajet le plus court
  }
  const hhm = h => { const H = Math.floor(h), m = Math.round((h - H) * 6) * 10; return m === 60 ? (H+1) + ' h' : H + ' h' + (m ? String(m).padStart(2,'0') : ''); };
  function inspItin(x, days, rythme){
    let st = x.itin.map(([c,n])=>[c,n]); const nights = Math.max(1, days - 1);
    const maxStops = rythme === 'calme' ? Math.max(1, Math.ceil(nights / 5)) : rythme === 'intense' ? st.length : Math.max(1, Math.ceil(nights / 3));
    st = st.slice(0, Math.max(1, maxStops));
    const tot = st.reduce((s,a)=>s+a[1],0);
    st = st.map(([c,n])=>[c, Math.max(1, Math.round(n * nights / tot))]);
    let diff = nights - st.reduce((s,a)=>s+a[1],0); let k = 0; while(diff !== 0 && k < 50){ const j = k % st.length; if(diff > 0){ st[j][1]++; diff--; } else if(st[j][1] > 1){ st[j][1]--; diff++; } k++; }
    while(st.length > 1 && st.reduce((s,a)=>s+a[1],0) > nights){ st.pop(); }
    return st;
  }
  let inspRes = [];
  async function inspireGo(){
    const g = id => (document.getElementById(id)||{}).value;
    if(g('in-dep') === 'autre'){ const t = (g('in-deptxt')||'').trim(); if(!t){ alert('Indique ta ville de départ.'); return; }
      if(!M.insp || M.insp.depTxt !== t || !M.insp.depLL){ toast('📡 Je situe ' + t + '…'); const gg = await geocode(t, null).catch(()=>null); if(!gg){ alert('Ville introuvable : essaie avec le pays (ex. « Plougastel, France »).'); return; } M.insp = Object.assign({}, M.insp, {depTxt:t, depLL:[gg.lat, gg.lng]}); } }
    const S = M.insp = Object.assign({}, M.insp, {dep:g('in-dep'), mois:g('in-mois'), duree:g('in-duree'), nb:g('in-nb'), budget:g('in-budget'), style:g('in-style'), vol:g('in-vol'), climat:g('in-climat'), qui:g('in-qui'), rythme:g('in-rythme'),
      depTxt:(g('in-deptxt')||'').trim(), iata:(g('in-iata')||'').trim().toUpperCase(), cni:(document.getElementById('in-cni')||{}).checked, tags:[...document.querySelectorAll('[data-tag].on')].map(b=>b.dataset.tag)}); persist();
    inspRes = inspCalc(S); inspShow(8);
  }
  function inspShow(n, focus){
    const S = M.insp, days = +S.duree, nb = Math.min(6, +S.nb || 1), fav = new Set(M.inspFav || []);
    const bud = num(S.budget), maxH = +S.vol;
    const ok = x => (!bud || (x.live != null ? x.live + x.stay : x.est) <= bud * 1.12) && (maxH >= 99 || x.h <= maxH * 1.25) && (!S.cni || ['UE','FR'].includes(x.visa));
    const fit = inspRes.filter(ok), over = inspRes.filter(x=>!ok(x));
    const top = fit.slice(0, n), mx = Math.max(1, inspRes[0].sc), mn = inspRes[inspRes.length - 1].sc;
    const tight = fit.length < 3 ? `<div class="cv-warnline" style="margin-bottom:8px">${fit.length ? 'Peu d’idées' : 'Aucune idée'} ne rentre dans tes réponses (${bud ? eur(bud) + ' / pers., ' : ''}${maxH < 99 ? maxH + ' h de trajet max' : ''}${S.cni ? ', carte d’identité' : ''}). Pour plus de choix : style « Économique », moins de jours, un trajet un peu plus long ou un budget plus grand.${over.length ? '<br>Les plus proches de tes critères :' : ''}</div>` + over.filter(x=>(!S.cni || ['UE','FR'].includes(x.visa))).sort((a,b)=>a.est-b.est).slice(0, 3 - Math.min(3, fit.length)).map(x=>`<button type="button" class="cv-prow" onclick="CV.inspOpen(${x.i})"><span>${flag(x.cc)} <b>${esc(x.nom)}</b></span><span>≈ ${eur(x.est)} · ${hhm(x.h)}</span></button>`).join('') : '';
    const pct = x => Math.max(5, Math.min(99, Math.round((x.sc - mn) / (mx - mn || 1) * 100)));
    openSheet(`<h2>✨ Mes idées de voyage</h2><div class="v-sum-small" style="margin-bottom:8px">Depuis <b>${esc(S.dep === 'autre' ? S.depTxt : S.dep)}</b>, ${days} jours, ${nb} voyageur${nb>1?'s':''}. Budgets et temps de trajet = ordres de grandeur ; prix réels avec Escale, formalités sur diplomatie.gouv.fr.</div>
      ${tight}${top.map(x=>`<div class="cv-idea${focus===x.i?' focus':''}" id="idea-${x.i}" data-i="${x.i}"><div class="im"><img data-wk="fr:${esc(x.wk)}" alt=""><span class="pc">${pct(x)} %</span><button type="button" class="fav${fav.has(x.nom)?' on':''}" onclick="CV.inspFav(${x.i}, this)" aria-label="Garder">${fav.has(x.nom)?'❤️':'🤍'}</button></div>
        <div class="hd"><b>${flag(x.cc)} ${esc(x.nom)}</b><small>${esc(x.pays)} · idéal ${x.dur[0]}–${x.dur[1]} j</small></div>
        <div class="chips"><span data-k="t">🌡️ ${x.tmp} °C en ${MOIS_L[x.mo-1]}</span><span>${x.ground ? '🚗' : '✈️'} ≈ ${hhm(x.h)}${x.escale ? ' (escale probable)' : ''}</span><span data-k="p" class="${x.ground ? 'hide' : ''}">✈️ prix réel…</span><span data-k="e">💶 ≈ ${eur(x.est)} / pers.</span><span>${VISA[x.visa]}</span></div>
        ${x.why.length ? `<div class="why">${x.why.map(esc).join(' · ')}</div>` : ''}${x.warn.length ? `<div class="warn">⚠️ ${x.warn.map(esc).join(' · ')}</div>` : ''}
        <div class="iti">🗺️ ${inspItin(x, days, S.rythme).map(([c,n])=>`${esc(c)} <small>${n} n.</small>`).join(' → ')}</div>
        <div class="bud" data-k="b">Trajet ≈ ${eur(x.trans + (x.escale ? 80 : 0))} · sur place ≈ ${eur(x.stay)} · <b>total groupe ≈ ${eur(x.est * nb)}</b></div>
        <p>💡 ${esc(x.tip)}</p>
        <div class="cv-row" style="gap:6px;flex-wrap:wrap"><button type="button" class="v-day-edit cp-go" onclick="CV.inspOpen(${x.i})">🧩 Explorer & composer</button><button type="button" class="v-day-edit" onclick="CV.inspireCreate(${x.i})">🧳 Créer tel quel</button>${ESCALE ? `<a class="v-day-edit" href="${ESCALE}">✈️ Prix réels</a>` : hidden('blk:book') ? '' : `<a class="v-day-edit" href="${esc(bookUrl('gflights', {from:S.dep === 'autre' ? S.depTxt : S.dep, to:x.nom}))}" target="_blank" rel="noopener">✈️ Vols</a><a class="v-day-edit" href="${esc(bookUrl('booking', {city:x.nom, n:nb}))}" target="_blank" rel="noopener">🛏️ Hébergements</a>`}<a class="v-day-edit" href="https://fr.wikipedia.org/wiki/${encodeURIComponent(x.wk.replace(/ /g,'_'))}" target="_blank" rel="noopener">📖 Découvrir</a></div></div>`).join('')}
      ${n < 16 && fit.length > n ? `<button type="button" class="v-btn sec" onclick="CV.inspMore()">Voir d’autres idées</button>` : ''}<div id="insp-bp"></div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.inspSurprise()">🎲 Surprends-moi</button>${fav.size >= 2 ? `<button type="button" class="v-btn" onclick="CV.inspVote()">🗳️ Faire voter (${fav.size})</button>` : ''}<button type="button" class="v-btn sec" onclick="CV.inspire()">← Réponses</button></div>`);
    setTimeout(async ()=>{ const imgs = [...document.querySelectorAll('.cv-idea img[data-wk]')];
      imgs.forEach(async i=>{ const w = wkParse(i.dataset.wk); if(!w) return; const k = 'sum:' + w.title;
        try { if(!(k in wkCache)){ const j = await (await fetch('https://fr.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(w.title.replace(/ /g,'_')))).json(); wkCache[k] = (j.originalimage && j.thumbnail && j.thumbnail.source) || (j.thumbnail && j.thumbnail.source) || ''; }
          if(wkCache[k]){ i.src = wkCache[k].replace(/\/\d+px-/, '/500px-'); i.onload = () => i.parentNode.classList.add('has'); } } catch(e){} });
      if(focus != null){ const e = document.getElementById('idea-' + focus); if(e) e.scrollIntoView({behavior:'smooth', block:'start'}); }
      inspPaint(); inspEnrich(); }, 30);
  }
  let inspN = 8;
  function inspMore(){ inspN = 16; inspShow(16); }
  function inspFav(i, b){ const nm = DESTS[i][0]; const f = new Set(M.inspFav || []); f.has(nm) ? f.delete(nm) : f.add(nm); M.inspFav = [...f].slice(-8); persist(); b.classList.toggle('on', f.has(nm)); b.textContent = f.has(nm) ? '❤️' : '🤍'; toast(f.has(nm) ? '❤️ Gardé pour le vote' : 'Retiré'); }
  function inspSurprise(){ const pool = inspRes.slice(0, 12), x = pool[Math.floor(Math.random() * pool.length)]; if(!inspRes.slice(0, inspN).includes(x)) inspShow(16, x.i); else inspShow(inspN, x.i); toast('🎲 ' + x.nom + ' !'); }
  function inspVote(){
    const f = (M.inspFav || []).slice(0, 8); if(f.length < 2) return;
    put({id:'po'+uid(), type:'poll', question:'Où partir ' + (M.insp && M.insp.mois ? 'en ' + MOIS_L[M.insp.mois-1] : 'pour le prochain voyage') + ' ?', options:f, votes:{}, closed:false}, '🗳️ Sondage créé dans les Envies');
    M.inspFav = []; persist(); closeSheet(true); M.mode = 'prep'; tab('envies');
  }
  function inspireCreate(i, custom){
    const x = inspRes.find(r=>r.i === i) || inspCalc(M.insp || {}).find(r=>r.i === i); if(!x) return;
    const S = M.insp || {}, days = +(S.duree || 7), st = custom ? custom.stops : inspItin(x, days, S.rythme), now = new Date();
    let y = now.getFullYear(); const mo = x.mo; if(mo < now.getMonth() + 1 || (mo === now.getMonth() + 1 && now.getDate() > 10)) y++;
    let debut = `${y}-${String(mo).padStart(2,'0')}-01`; const dow = new Date(debut + 'T12:00:00').getDay(); debut = addDays(debut, (6 - dow + 7) % 7);   // premier samedi
    const tid = 't' + uid(), out = [], v = M.me ? [M.me] : [];
    let cur = debut; const stops = st.map(([c,n])=>{ const s = {c, n, d:cur, f:addDays(cur, n)}; cur = s.f; return s; }), fin = cur;
    out.push({id:tid, type:'trip', ccs:[x.d[2]].filter(Boolean), titre:x.nom + ' · ' + (days >= 7 ? Math.round(days/7) + ' semaine' + (days >= 14 ? 's' : '') : days + ' jours'), sous:stops.map(s=>s.c).join(' → '), debut, fin, voyageurs:v, objectif:num(S.budget)||''});
    const mode = x.ground ? 'Voiture' : 'Avion';
    out.push({id:'i'+uid()+'a', type:'item', trip:tid, cat:'transport', mode, titre:((S.dep === 'autre' ? S.depTxt : S.dep)||'Départ') + ' → ' + stops[0].c, from:(S.dep === 'autre' ? S.depTxt : S.dep)||'', to:stops[0].c, date:debut, statut:'todo', partage:'pp', qui:[], estime:String(Math.round((x.trans + (x.escale ? 80 : 0))/2))});
    stops.forEach((s,k)=>{
      const hid = 'i'+uid()+'h'+k; out.push({id:hid, type:'item', trip:tid, cat:'hotel', titre:s.c, base:s.c, date:s.d, dateFin:s.f, statut:'todo', partage:'grp', qui:[]});
      const pls = custom && custom.sel && custom.sel[s.c] || [], dd = range(s.d, s.f).slice(0, Math.max(1, s.n)), per = Math.max(1, Math.ceil(pls.length / dd.length));
      pls.forEach((p,j)=>out.push({id:'pl'+uid()+k+'_'+j, type:'place', trip:tid, stay:hid, date:dd[Math.min(dd.length-1, Math.floor(j/per))], nom:p.nom, adresse:'', lat:p.lat, lng:p.lng, cat:p.cat, lock:false}));
      out.push({id:'day:'+tid+':'+s.d, type:'day', trip:tid, date:s.d, titre: k === 0 ? 'Arrivée à ' + s.c : stops[k-1].c + ' → ' + s.c, plan:''});
      range(addDays(s.d,1), addDays(s.f,-1)).forEach(dd=>out.push({id:'day:'+tid+':'+dd, type:'day', trip:tid, date:dd, titre:s.c, plan:''}));
      if(k > 0) out.push({id:'i'+uid()+'t'+k, type:'item', trip:tid, cat:'transport', mode:'Train', titre:stops[k-1].c + ' → ' + s.c, from:stops[k-1].c, to:s.c, date:s.d, statut:'todo', partage:'pp', qui:[]});
    });
    out.push({id:'i'+uid()+'r', type:'item', trip:tid, cat:'transport', mode, titre:stops[stops.length-1].c + ' → ' + ((S.dep === 'autre' ? S.depTxt : S.dep)||'retour'), from:stops[stops.length-1].c, to:(S.dep === 'autre' ? S.depTxt : S.dep)||'', date:fin, statut:'todo', partage:'pp', qui:[], estime:String(Math.round((x.trans + (x.escale ? 80 : 0))/2))});
    out.push({id:'day:'+tid+':'+fin, type:'day', trip:tid, date:fin, titre:stops[stops.length-1].c + ' → retour', plan:''});
    putMany(out, '🧳 Voyage créé : ' + x.nom); setTimeout(()=>fxPlay('trip', 'Le rêve commence !'), 600);
    closeSheet(true); M.mode = 'prep'; M.tab = 'prog'; go(tid);
    const auto = !custom || !Object.values(custom.sel || {}).some(a=>a && a.length);
    if(auto) setTimeout(()=>suggFill(tid), 150);
    setTimeout(()=>alert(`🧳 « ${x.nom} » est prêt, du ${fdate(debut)} au ${fdate(fin)} :\n${stops.map(s=>'• ' + s.c + ' (' + s.n + ' nuit' + (s.n>1?'s':'') + ')').join('\n')}\n\n` + (auto ? MSGT('💡 Je cherche les incontournables de chaque ville (4 par jour) : tu les retrouveras dans « Que faire » pour choisir ceux à ajouter à ton programme.') : MSGT('Tout est modifiable. Ensuite : 🔎 « Que voir » à chaque étape, 🪄 « Remplir mes journées ».'))), 300);
  }


  /* ── 👀 Suivre sans installer : un proche ouvre le lien abonné dans son navigateur et voit le voyage tout de suite ── */
  const webFollowing = () => document.body.classList.contains('vz-webf');
  function webFollowBoot(){
    if(isInstalled() || !/^https?:/.test(location.protocol)) return false;
    const m = decodeURIComponent(location.hash || '').match(/#suivre=([A-Z0-9-]{8,})/i);
    const fl = list('feedtrip', f=>TS()[f.id] && !FT()[String(f.id).replace(/^ft:/,'')] && !f.deleted);
    if(!m && !(M.webFollow && fl.length)) return false;
    M.webFollow = true; persist(); document.body.classList.add('vz-webf');
    try { applyMode(); applyLock(); } catch(e){}
    if(m){ history.replaceState(null, '', location.pathname + location.search); followGo(m[1].toUpperCase(), true); }
    else { feedView(fl[0].id); setTimeout(webCheck, 800); }
    return true;
  }
  // le voyage suivi a été retiré par son auteur : plus d'aperçu, retour à la page d'installation classique
  async function webCheck(){
    const codes = [...new Set(list('feedtrip', f=>TS()[f.id] && !FT()[String(f.id).replace(/^ft:/,'')]).map(f=>TS()[f.id]))];
    for(const c of codes){ const sp = spaceObj(c); if(sp) try { await syncSpace(sp, true); } catch(e){} }
    const alive = list('feedtrip', f=>TS()[f.id] && !FT()[String(f.id).replace(/^ft:/,'')] && !f.deleted);
    if(!alive.length){ webGone(); return; }
    if(M.feedOpen && !alive.some(f=>f.id === M.feedOpen)) feedView(alive[0].id);
  }
  function webGone(){
    M.webFollow = false; persist(); document.body.classList.remove('vz-webf');
    const ov = document.getElementById('cv-feed'); if(ov) ov.remove(); document.body.style.overflow = ''; M.feedOpen = null;
    if(!isInstalled()) installGate();
  }
  function webCta(){
    if(!webFollowing()) return '';
    const c = M.webCode || (list('feedtrip', f=>TS()[f.id] && !f.deleted).map(f=>TS()[f.id]))[0] || '';
    return `<div class="fd-cta"><span><b>Toi aussi, raconte tes voyages</b><small>Carnet de voyage gratuit, sans compte, sans publicité.</small></span><button type="button" onclick="CV.webCreate()">✨ Créer mon carnet</button></div>`
      + (c ? `<div class="fd-wcode"><span><b>📲 Passer à l’appli sans rien perdre</b><small>Installe Vezoria, puis colle ce code dans l’appli (à l’accueil « J’ai reçu une invitation », ou 👥 → « Rejoindre avec un code ») : tu retrouves tes voyages suivis, sous ton nom, sans compter deux fois.</small></span><b class="cv-code" id="gw-xcode">${M.xfer && M.xfer.c ? esc(M.xfer.c) : '••••-••••-••••'}</b><button type="button" id="gw-copy2" onclick="CV.webCopyCode()">📋 Copier mon code de passage</button></div>` : '');
  }
  function webCreate(){
    let g = document.getElementById('cv-gate'); if(!g){ g = document.createElement('div'); g.id = 'cv-gate'; document.body.appendChild(g); }
    gateRender();
  }
  function webBack(){ const g = document.getElementById('cv-gate'); if(g) g.remove(); const fl = list('feedtrip', f=>TS()[f.id] && !FT()[String(f.id).replace(/^ft:/,'')] && !f.deleted); if(fl.length && !document.getElementById('cv-feed')) feedView((fl.find(f=>f.id===M.feedLast) || fl[0]).id); }
  async function webCopyCode(){
    const b = document.getElementById('gw-copy2'); let c = '';
    try { c = await xferCode(); } catch(e){ alert(MSGT('Code impossible pour le moment (pas de réseau ?).')); return; }
    const el = document.getElementById('gw-xcode'); if(el) el.textContent = c;
    try { await navigator.clipboard.writeText(c); if(b) b.textContent = '📋 ' + MSGT('Code copié'); } catch(e){ await uiPrompt('Copie ce code :', c); }
  }
  /* 📲 Passage navigateur → appli : un code secret, valable une seule fois, dépose dans un petit dossier chiffré
     « qui je suis » (mon appareil, mon nom chez chaque auteur, les voyages que je suis). L’appli qui le colle reprend
     ces abonnements sous le même nom et retire l’ancien abonné du navigateur : pas de doublon, et personne d’autre
     ne peut se faire passer pour moi (il faudrait ce code, qui n’existe que sur mon téléphone). */
  async function xferCode(){
    const codes = [...new Set(list('feedtrip', f=>TS()[f.id] && !FT()[String(f.id).replace(/^ft:/,'')] && !f.deleted).map(f=>TS()[f.id]))].sort();
    const sig = codes.join(',') + '|' + myName() + '|' + JSON.stringify(M.fwAs || {});
    if(M.xfer && M.xfer.c && M.xfer.sig === sig && Date.now() - M.xfer.at < 30 * 864e5) return M.xfer.c;
    const c = genCode(), rec = {id:'xf:' + devId(), type:'xfer', trip:'xf:' + c, dev:devId(), who:myName() || '', as:M.fwAs || {}, codes, at:Date.now()};
    const sp = {code:c, since:0, dirty:[], last:0, err:''}; (M.spaces = M.spaces || []).push(sp); TS()['xf:' + c] = c;
    try { await spacePushOnly(sp, [rec]); }
    finally { M.spaces = M.spaces.filter(x=>x !== sp); delete TS()['xf:' + c]; delete R[rec.id]; persist(); }
    if(sp.err) throw new Error(sp.err);
    M.xfer = {c, sig, at:Date.now()}; persist(); return c;
  }
  // côté appli : le code de passage collé → mes abonnements du navigateur arrivent ici, l'ancien abonné s'efface
  async function xferApply(x, code){
    closeSheet(true); cryptShow('📲 ' + MSGT('Je récupère les voyages que tu suis…'));
    try {
      if(x.who && !M.followName) M.followName = x.who;
      M.fwAs = Object.assign(M.fwAs || {}, x.as || {}); M.fwChk = M.fwChk || {};
      const k = await fKey(), ib = inbox();
      for(const c of x.codes || []){
        M.fwChk[c] = 1; if(!M.fwAs[c] && x.who) M.fwAs[c] = x.who;
        if(M.unfol) Object.keys(M.unfol).forEach(id=>{ if(TS()[id] === c) delete M.unfol[id]; });
        if(!spaceObj(c)) (M.spaces = M.spaces || []).push({code:c, since:0, dirty:[], last:0, err:''});
        const sp = spaceObj(c); sp.since = 0; try { await syncSpace(sp, true); } catch(e){}
        const old = list('follower', f=>fwDevOf(f) === x.dev && TS()[f.trip] === c);
        const mine = list('feedtrip', f=>TS()[f.id] === c && !f.deleted).map(ft=>({id:'fw:' + ft.id + ':' + devId(), type:'follower', pid:fwPid(), trip:ft.id, who:fwAsFor(c) || 'Un proche', pk:k.pub, ib}));
        putQuiet([...old.map(f=>Object.assign(clone(f), {deleted:true})), ...mine]);
      }
      const sp0 = spaceObj(code); if(sp0){ try { await spacePushOnly(sp0, [Object.assign(clone(x), {deleted:true})]); } catch(e){} }   // le code ne sert qu’une fois
      M.spaces = (M.spaces || []).filter(z=>z.code !== code); delete R[x.id]; persist();
      try { await syncNow(); } catch(e){}
    } finally { cryptHide('✅ ' + MSGT('Tes voyages suivis sont dans l’appli')); }
    refresh();
  }
  async function webCopy(){
    let c = ''; try { c = await xferCode(); } catch(e){ alert(MSGT('Code impossible pour le moment (pas de réseau ?).')); return; }
    const txt = (typeof appUrl === 'function' && appUrl() ? appUrl() : location.origin + '/') + '#rejoindre=' + c;
    const b = document.getElementById('gw-copy');
    try { await navigator.clipboard.writeText(txt); if(b) b.textContent = '📋 Lien copié'; } catch(e){ await uiPrompt('Copie ce texte :', txt); }
  }
