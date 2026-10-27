/* Vezoria — code de l’appli, partie 3/8 (chargées dans l’ordre par index.html, même portée globale) */


  /* ══════════ 🧭 Assistant « nouveau voyage » ══════════ */
  let wz = null;
  function addDays(iso, n){ const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10); }
  const WZ_STEPS = ['Le voyage', 'Dates', 'Étapes', 'Départs & retours', 'Modèle & création'];
  function wizard(){
    wz = {step:1, titre:'', voyageurs:[M.me].filter(Boolean), objectif:'', debut:'', nuits:7,
      etapes:[{ville:'', nuits:7, mode:'Avion'}], gens:{}, modeRetour:'Avion', tpl:'', copyCheck:true, copyDivers:false};
    wzRender();
  }
  function wzRead(){
    const g = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
    if(!document.getElementById('wz')) return;
    if(wz.step===1){ wz.titre = g('wz-titre'); wz.voyageurs = peopleVal('wz-tv'); wz.objectif = g('wz-obj'); }
    if(wz.step===2){ wz.debut = g('wz-debut'); wz.nuits = Math.max(1, parseInt(g('wz-nuits'))||1); }
    if(wz.step===3) wz.etapes = [...document.querySelectorAll('.wz-et')].map((r, i)=>{ const o = wz.etapes[i] || {}, ville = r.querySelector('[data-k=ville]').value.trim(), mode = r.querySelector('[data-k=mode]').value;
      return {ville, nuits:Math.max(0, parseInt(r.querySelector('[data-k=nuits]').value)||0), mode, mm: !!o.mm || (o.ville === ville && o.mode && mode !== o.mode), ...(o.nw ? {nw:1} : {})}; });
    if(wz.step===4){ const gg = {}; document.querySelectorAll('[data-wdep]').forEach(i=>{ const pid = i.dataset.wdep, q = a => document.querySelector(`[${a}="${pid}"]`);
      gg[pid] = {dep:i.value.trim(), ret:q('data-wret').value.trim(), mDep:q('data-wmdep').value, mRet:q('data-wmret').value}; }); wz.gens = gg; }
    if(wz.step===5){ const sgc = document.getElementById('wz-sg'); if(sgc) wz.sugg = sgc.checked; wz.tpl = g('wz-tpl'); const cc = document.getElementById('wz-cc'), cd = document.getElementById('wz-cd'); wz.copyCheck = cc ? cc.checked : true; wz.copyDivers = cd ? cd.checked : false; }
  }
  function wzGo(n){
    wzRead();
    if(n > wz.step){
      if(wz.step===1 && !wz.titre){ alert('Donne un nom au voyage.'); return; }
      if(wz.step===1 && !wz.voyageurs.length){ alert('Choisis au moins un voyageur.'); return; }
      if(wz.step===2 && !wz.debut){ alert('Choisis la date de départ.'); return; }
      if(wz.step===2 && wz.etapes.length===1) wz.etapes[0].nuits = wz.nuits;
      if(wz.step===3 && !wz.etapes.some(e=>e.ville)){ alert('Ajoute au moins une étape (une ville).'); return; }
      if(wz.step===3){ wz.etapes = wz.etapes.filter(e=>e.ville); if(wz.etapes.some(e=>!e.nuits) && wz.etapes.length <= wz.nuits) wzNights(); wzModes(); }
    }
    wz.step = n; wzRender();
  }
  function wzDates(src){
    const deb = val('wz-debut'), n = document.getElementById('wz-nuits'), f = document.getElementById('wz-fin');
    if(src==='f' && deb && f.value) n.value = Math.max(1, nights(deb, f.value));
    else if(deb) f.value = addDays(deb, Math.max(1, parseInt(n.value)||1));
    const k = parseInt(n.value)||0, lbl = document.getElementById('wz-dur');
    if(lbl) lbl.textContent = deb ? `${k} nuit${k>1?'s':''} · ${k+1} jours, du ${fdate(deb)} au ${fdate(addDays(deb,k))}` : '';
  }
  function wzEt(action, i){
    wzRead();
    if(action==='add') wz.etapes.push({ville:'', nuits:Math.max(0, wz.nuits - wz.etapes.reduce((s,e)=>s+e.nuits,0)), mode:'Train', nw:1});   // nw : placée sur le chemin dès qu’elle est située
    if(action==='del') wz.etapes.splice(i,1);
    if(action==='up' && i > 0){ [wz.etapes[i-1], wz.etapes[i]] = [wz.etapes[i], wz.etapes[i-1]]; delete wz.etapes[i-1].nw; delete wz.etapes[i].nw; }
    if(action==='even') wzNights();
    if(!wz.etapes.length) wz.etapes.push({ville:'', nuits:wz.nuits, mode:'Avion'});
    wzRender();
  }
  /* 🧭 itinéraire à plusieurs villes (un ou plusieurs pays) : situer, ordonner, répartir, choisir le transport */
  const rawKm = (a, b) => { const r = x => x * Math.PI / 180, dLa = r(b.lat - a.lat), dLo = r(b.lng - a.lng), h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)); };
  async function cityInfo(city){   // coordonnées + pays d’une ville, en une seule question à OpenStreetMap (gardé en mémoire)
    const k = normQ(city); M.ctry = M.ctry || {}; const g = R['geo:' + k];
    if(g && !g.deleted && g.lat != null && M.ctry[k] && M.ctry[k].cc) return {lat:g.lat, lng:g.lng, cc:M.ctry[k].cc};
    const wait = 1100 - (Date.now() - geoLast); if(wait > 0) await new Promise(r=>setTimeout(r, wait)); geoLast = Date.now();
    try { const j = await (await withTimeout(fetch(GEO + 'search?format=jsonv2&limit=1&addressdetails=1&accept-language=' + ((window.I18N && I18N.lang) || 'fr') + '&q=' + encodeURIComponent(city)), 10000)).json();
      const x = j && j[0]; if(!x) return null; const o = {lat:+x.lat, lng:+x.lon, cc:((x.address || {}).country_code || '').toUpperCase()};
      const geo = {id:'geo:' + k, type:'geo', q:city, lat:o.lat, lng:o.lng}; stamp(geo); R[geo.id] = geo; markDirty(geo.id);
      if(o.cc) M.ctry[k] = {pays:(x.address || {}).country || '', cc:o.cc}; persist(); return o; } catch(e){ return null; }
  }
  async function wzLocate(){
    if(!wz) return; wz.geo = wz.geo || {}; const L = wz.etapes.filter(e=>e.ville && !wz.geo[normQ(e.ville)]); if(!L.length) return true;
    const box = () => document.getElementById('wz-loc'); let i = 0;
    for(const e of L){ i++; const b = box(); if(b) b.innerHTML = `<div class="ar-run wz-run">📍 ${MSGT('Je situe les villes…')} <small class="sg-pr">${esc(e.ville)} · ${i}/${L.length}</small></div>`;
      const o = await cityInfo(e.ville); if(!wz) return; wz.geo[normQ(e.ville)] = o || {miss:1}; }
    const b = box(); if(b) b.innerHTML = ''; return true;
  }
  // 🧭 une ville ajoutée avec « ＋ Étape » va là où elle allonge le moins le trajet (Bologne entre Milan et Venise) ; les autres gardent leur ordre
  function wzPlace(){
    const E = wz.etapes; let moved = '';
    E.filter(e=>e.nw && e.ville && wzPt(e)).forEach(e=>{ delete e.nw;
      const O = E.filter(x=>x !== e), K = O.map((x, i)=>[i, wzPt(x)]).filter(x=>x[1]); if(K.length < 2) return;
      const p = wzPt(e); let best = O.length, bc = Infinity;
      for(let j = 0; j <= K.length; j++){ const a = K[j - 1], b = K[j], c = (a ? rawKm(a[1], p) : 0) + (b ? rawKm(p, b[1]) : 0) - (a && b ? rawKm(a[1], b[1]) : 0);
        if(c < bc - 1){ bc = c; best = b ? b[0] : O.length; } }
      if(best === O.length && E.indexOf(e) === E.length - 1) return;
      O.splice(best, 0, e); wz.etapes = O; moved = e.ville + ' : ' + (best === 0 ? RF('avant {0}', O[1].ville) : best === O.length - 1 ? RF('après {0}, à la fin', O[best - 1].ville) : RF('entre {0} et {1}', O[best - 1].ville, O[best + 1].ville)); });
    if(moved) toast('🧭 ' + moved);
    return !!moved;
  }
  const wzPt = e => { const g = wz && wz.geo && wz.geo[normQ(e.ville || '')]; return g && !g.miss ? g : null; };
  function wzModes(){   // le moyen de transport selon la distance (sauf si tu l’as choisi toi-même)
    const E = wz.etapes;
    for(let i = 1; i < E.length; i++){ const a = wzPt(E[i - 1]), b = wzPt(E[i]); if(!a || !b || E[i].mm) continue;
      const d = rawKm(a, b); E[i].km = Math.round(d); E[i].mode = d < 650 ? (a.cc && b.cc && a.cc !== b.cc && d > 450 ? 'Avion' : 'Train') : 'Avion'; }
    const cc = [...new Set(E.map(e=>(wzPt(e) || {}).cc).filter(Boolean))]; if(cc.length) wz.ccs = cc;
  }
  function wzNights(){   // au moins 1 nuit partout, 2 si le voyage le permet ; le reste aux villes où l’on dort déjà le plus longtemps (grandes villes en tête)
    const E = wz.etapes.filter(e=>e.ville), n = E.length; if(!n) return; const tot = wz.nuits;
    const base = tot >= n * 2 ? 2 : 1; E.forEach(e=>e.nuits = base); let left = tot - base * n, j = 0;
    while(left > 0 && j < 500){ E[j % n].nuits++; left--; j++; }
    while(left < 0 && j < 500){ const k = E.reduce((a, e, i)=>e.nuits > E[a].nuits ? i : a, 0); if(E[k].nuits <= 1) break; E[k].nuits--; left++; j++; }
  }
  async function wzOrder(){
    wzRead(); const btn = document.getElementById('wz-ord'); if(btn) btn.disabled = true;
    await wzLocate(); if(!wz) return;
    const E = wz.etapes.filter(e=>e.ville), K = E.filter(wzPt), rest = E.filter(e=>!wzPt(e)); if(K.length < 3){ wzModes(); wzRender(); return; }
    // le plus proche à chaque fois depuis la 1ʳᵉ ville, puis on décroise les trajets (2-opt)
    const ord = [K[0]], todo = K.slice(1); while(todo.length){ const l = wzPt(ord[ord.length - 1]); todo.sort((a, b)=>rawKm(l, wzPt(a)) - rawKm(l, wzPt(b))); ord.push(todo.shift()); }
    const len = A => A.reduce((s, e, i)=>i ? s + rawKm(wzPt(A[i - 1]), wzPt(e)) : 0, 0); let best = len(ord), imp = true, g = 0;
    while(imp && g < 60){ imp = false; g++; for(let i = 1; i < ord.length - 1; i++) for(let k = i + 1; k < ord.length; k++){ const c = ord.slice(0, i).concat(ord.slice(i, k + 1).reverse(), ord.slice(k + 1)), l2 = len(c); if(l2 < best - 1){ ord.splice(0, ord.length, ...c); best = l2; imp = true; } } }
    const before = len(K); wz.etapes = ord.concat(rest); wzModes(); wzRender();
    toast('🧭 ' + MSGT('Itinéraire ordonné') + (before - best > 20 ? ' · −' + Math.round(before - best).toLocaleString() + ' km' : ''));
  }
  async function wzCheck(){   // après un changement de villes : on situe, on choisit les transports, on affiche la saison de chaque pays
    if(!wz || wz.step !== 3 || wz.chk) return; wz.chk = 1; let mv = false;
    try { await wzLocate(); if(!wz) return; mv = wzPlace(); wzModes();
      const mo = wz.debut ? +wz.debut.slice(5, 7) : 0, seen = {}, out = [];
      for(const e of wz.etapes){ const p = wzPt(e); if(!p || !p.cc || seen[p.cc]) continue; seen[p.cc] = 1;
        const se = await ctrySeason(p.cc, e.ville).catch(()=>null); if(se) out.push({cc:p.cc, se}); if(out.length >= 10) break; }
      wz.seas = out;
    } finally { if(wz){ wz.chk = 0; if(wz.step === 3){ if(mv) wzRender(); else wzSoft(); } } }
  }
  function wzInfo(){
    const se = (wz.seas || []).length > 1 ? `<div class="wz-seas">${wz.seas.map(x=>`<div class="wz-sl"><b>${flag(x.cc)} ${esc(frCountry(x.cc))}</b>${seasonLine(x.se, wz.debut ? +wz.debut.slice(5, 7) : 0)}</div>`).join('')}</div>` : '';
    const km = wz.etapes.some((e, i)=>i && e.km) ? `<div class="v-sum-small" style="margin-top:6px">${wz.etapes.map((e, i)=>i && e.km ? `${MODE_ICON[e.mode] || ''} ${e.km.toLocaleString()} km` : '').filter(Boolean).join(' · ')}</div>` : '';
    return se + km;
  }
  function wzSoft(){   // mise à jour sans tout redessiner (on ne vole pas le clavier pendant la saisie)
    document.querySelectorAll('.wz-et').forEach((r, i)=>{ const e = wz.etapes[i], sel = r.querySelector('[data-k=mode]'); if(e && sel && sel.value !== e.mode) sel.value = e.mode; });
    const w = document.getElementById('wz-warn'); if(w) w.innerHTML = wzWarn(); const f = document.getElementById('wz-info'); if(f) f.innerHTML = wzInfo();
  }
  function wzCk(){ wzRead(); wzCheck(); }
  function wzWarn(){
    const E = wz.etapes.filter(e=>e.ville), n = E.length, tot = wz.nuits, z = E.filter(e=>!e.nuits).length;
    const w = [];
    if(n >= 4 && n > tot / 1.6) w.push(`⚠️ ${n} ${MSGT('villes en')} ${tot} ${MSGT('nuits')} : ${MSGT('un trajet presque chaque jour. Retire quelques villes ou ajoute des nuits pour profiter.')}`);
    if(z) w.push(`⚠️ ${z} ${MSGT('étape(s) à 0 nuit')} : ${MSGT('touche « Répartir les nuits ».')}`);
    const fly = E.filter((e, i)=>i && e.mode === 'Avion').length; if(n > 1 && fly) w.push(`✈️ ${fly} ${MSGT('vol(s) entre les étapes, choisis selon la distance')}`);
    return w.map(x=>`<div class="wz-w">${x}</div>`).join('');
  }
  function wzCtryGuess(){
    const cands = [...wz.etapes.map(e=>e.ville), wz.titre].filter(Boolean);
    for(const t of cands){
      const w = t.split(/[\s·,–\-\/]+/).filter(Boolean);
      for(let a = 0; a < w.length; a++) for(let b = Math.min(w.length, a + 3); b > a; b--){ const cc = ccOf(w.slice(a, b).join(' ')); if(cc && cc.length === 2 && cc !== 'FR' && frCountry(cc) !== cc) return {cc, from:t}; }
    }
    return null;
  }
  function wzCtryBox(){
    const el = document.getElementById('wz-ctry'); if(!el || !wz) return;
    const g = wzCtryGuess(); if(!g || wz.ctryOk === g.cc || wz.etapes.filter(e=>e.ville && normQ(e.ville) !== normQ(g.from)).length > 0){ el.innerHTML = ''; return; }
    el.innerHTML = `<button type="button" class="sg-c" onclick="CV.wzCountry('${ja(g.cc)}')"><i>${flag(g.cc)}</i><div><b>${esc(frCountry(g.cc))} : ${MSGT('je te propose les étapes')}</b><small>${MSGT('Les villes à voir et les nuits dans chacune, pour')} ${wz.nuits} ${MSGT('nuits')}. ${MSGT('Tu pourras tout modifier.')}</small></div><span class="sg-go">${MSGT('Proposer')} ›</span></button>`;
  }
  async function wzCountry(cc){
    wzRead(); const el = document.getElementById('wz-ctry'); if(el) el.innerHTML = `<div class="sg-c run"><i>${flag(cc)}</i><div><b>${MSGT('Je prépare l’itinéraire…')}</b><small>${MSGT('Wikidata et les destinations de l’appli')}</small></div></div>`;
    const it = await ctryItin(cc, wz.nuits).catch(()=>null);
    if(!wz || wz.step !== 3) return;
    if(!it || !it.stops.length){ if(el) el.innerHTML = `<div class="v-sum-small">⚠️ ${MSGT('Pas d’itinéraire trouvé pour ce pays (réseau ?) : écris les villes toi-même.')}</div>`; return; }
    const m0 = (wz.etapes[0] || {}).mode || 'Avion';
    wz.etapes = it.stops.map((e, i)=>({ville:e[0], nuits:e[1], mode: i === 0 ? m0 : 'Train'}));
    setTimeout(wzCheck, 50);
    wz.ctryOk = cc; wz.ccs = [...new Set([...(wz.ccs || []), cc])]; wz.far = it.far || [];
    wz.sea = await ctrySeason(cc, it.stops[0] && it.stops[0][0]).catch(()=>null);
    if(wz && wz.step === 3) wzRender();
  }
  function wzSum(){
    wzRead(); wzCtryBox(); const ww = document.getElementById('wz-warn'); if(ww) ww.innerHTML = wzWarn();
 const s = wz.etapes.reduce((a,e)=>a+e.nuits,0), el = document.getElementById('wz-sum');
    if(el){ el.textContent = `${s} / ${wz.nuits} nuits réparties` + (s!==wz.nuits ? (s < wz.nuits ? ` · il en reste ${wz.nuits-s}` : ` · ${s-wz.nuits} de trop (le retour sera décalé)`) : ' ✓'); el.style.color = s===wz.nuits ? 'var(--green)' : '#a06d00'; }
  }
  function wzPlan(){
    let cur = wz.debut;
    const st = wz.etapes.filter(e=>e.ville).map(e=>{ const o = Object.assign({}, e, {debut:cur, fin:addDays(cur, e.nuits)}); cur = o.fin; return o; });
    return {st, fin:cur};
  }
  function wzRender(){
    const s = wz.step, modes = cur => Object.keys(MODE_ICON).map(m=>`<option${m===cur?' selected':''}>${m}</option>`).join('');
    let h = `<div id="wz"><h2>🧭 Nouveau voyage</h2>
      <div class="wz-steps">${WZ_STEPS.map((l,i)=>`<span class="${i+1===s?'on':i+1<s?'done':''}" title="${l}">${i+1<s?'✓':i+1}</span>`).join('<i></i>')}</div>
      <div class="wz-title">${WZ_STEPS[s-1]}</div>`;
    if(s===1){
      h += `<div class="v-f"><label>Nom du voyage</label><input class="v-in" id="wz-titre" value="${esc(wz.titre)}" placeholder="Ex. Été 2028 en Scandinavie, Week-end Palma…"></div>
        <div class="v-f"><label>Qui part ?</label>${peopleSel('wz-tv', profiles().map(p=>p.id), wz.voyageurs)}
          <div class="v-sum-small" style="margin-top:4px">Il manque quelqu’un ? Ajoute son profil dans ⚙️ Partage, ou plus tard dans 💰 Budget.</div></div>
        <div class="v-f"><label>Budget visé par personne (facultatif)</label><input class="v-in" id="wz-obj" inputmode="decimal" value="${esc(wz.objectif)}" placeholder="${CS()}"></div>`;
    }
    if(s===2){
      h += `<div class="v-f2"><div class="v-f"><label>Départ le</label><input class="v-in" type="date" id="wz-debut" value="${esc(wz.debut)}" oninput="CV.wzDates('d')"></div>
          <div class="v-f"><label>Retour le</label><input class="v-in" type="date" id="wz-fin" oninput="CV.wzDates('f')"></div></div>
        <div class="v-f"><label>Combien de nuits ?</label><div class="cv-row"><input class="v-in cv-num" type="number" min="1" max="90" id="wz-nuits" value="${wz.nuits}" oninput="CV.wzDates('n')">
          <span class="v-sum-small" id="wz-dur"></span></div></div>
        <div class="cv-row">${[2,3,7,14,19,21].map(n=>`<button type="button" class="v-chip" onclick="document.getElementById('wz-nuits').value=${n};CV.wzDates('n')">${n===2?'Week-end (2)':n+' nuits'}</button>`).join('')}</div>`;
    }
    if(s===3){
      h += `<div id="wz-ctry"></div>${wz.ctryOk ? `<div class="v-sum-small wz-ok">✓ ${MSGT('Itinéraire proposé pour')} ${esc(frCountry(wz.ctryOk))}${(wz.far || []).length ? ' · ' + MSGT('À ne pas manquer aussi (ajoute une étape si tu veux) :') + ' <span data-notr>' + wz.far.map(esc).join(', ') + '</span>' : ''}</div>${seasonLine(wz.sea, wz.debut ? +wz.debut.slice(5, 7) : 0)}` : ''}
        <div class="v-sum-small" style="margin-bottom:8px">Une ligne par ville où vous dormez. Le mode, c’est comment vous y arrivez depuis l’étape d’avant (pour la 1ʳᵉ, chacun choisit le sien à l’étape suivante).</div>
        <div oninput="CV.wzSum()">${wz.etapes.map((e,i)=>`<div class="wz-et"><span class="n">${i+1}</span>
          <input class="v-in" data-k="ville" data-place autocomplete="off" value="${esc(e.ville)}" placeholder="Ville" onchange="CV.wzCk()">
          <input class="v-in cv-num" data-k="nuits" type="number" min="0" value="${e.nuits}"><span class="v-sum-small">nuit${e.nuits>1?'s':''}</span>
          <select class="v-in" data-k="mode">${modes(e.mode)}</select>
          <span class="wz-btns">${i>0?`<button type="button" class="cv-x" onclick="CV.wzEt('up',${i})" title="Monter" aria-label="Monter">↑</button>`:''}<button type="button" class="cv-x" onclick="CV.wzEt('del',${i})" aria-label="Retirer">✕</button></span></div>`).join('')}</div>
        <div id="wz-sum" class="v-sum-small" style="margin:6px 0;font-weight:700"></div>
        <div class="cv-row" style="flex-wrap:wrap;gap:6px"><button type="button" class="v-day-edit" onclick="CV.wzEt('add')">＋ Étape</button><button type="button" class="v-day-edit" onclick="CV.wzEt('even')">⚖️ Répartir les nuits</button>${wz.etapes.filter(e=>e.ville).length >= 3 ? `<button type="button" class="v-day-edit" id="wz-ord" onclick="CV.wzOrder()">🧭 ${MSGT('Ordonner mon itinéraire')}</button>` : ''}</div>
        <div id="wz-loc"></div><div id="wz-warn">${wzWarn()}</div><div id="wz-info">${wzInfo()}</div>`;
    }
    if(s===4){
      const plan = wzPlan(), first = plan.st[0] ? plan.st[0].ville : '…', last = plan.st.length ? plan.st[plan.st.length-1].ville : '…';
      const m0 = (plan.st[0] || {}).mode || 'Avion';
      h += `<div class="v-sum-small" style="margin-bottom:8px">D’où part chacun vers ${esc(first)}, comment, et où rentre-t-il après ${esc(last)} ? Chacun son trajet : l’un en voiture, l’autre en train ou en avion.</div>
        ${wz.voyageurs.map(pid=>{ const g = wz.gens[pid] || {}; return `<div class="wz-pp">${pchip(pid)}
          <div class="wz-pl"><span>🛫 Aller</span><input class="v-in" data-wdep="${pid}" data-place autocomplete="off" value="${esc(g.dep)}" placeholder="départ de…"><select class="v-in" data-wmdep="${pid}">${modes(g.mDep || m0)}</select></div>
          <div class="wz-pl"><span>🏠 Retour</span><input class="v-in" data-wret="${pid}" data-place autocomplete="off" value="${esc(g.ret)}" placeholder="retour vers…"><select class="v-in" data-wmret="${pid}">${modes(g.mRet || g.mDep || wz.modeRetour || m0)}</select></div></div>`; }).join('')}`;
    }
    if(s===5){
      const {st, fin} = wzPlan(), nt = nights(wz.debut, fin);
      h += `<div class="wz-recap"><b>${esc(wz.titre)}</b> · ${wz.voyageurs.map(pid=>pchip(pid)).join(' ')}
        <div class="v-sum-small">${fdate(wz.debut)} → ${fdate(fin)} · ${nt} nuits${nt!==wz.nuits ? ' (au lieu de '+wz.nuits+' prévues : les étapes font foi)' : ''}</div>
        <ol>${st.map(e=>`<li>${MODE_ICON[e.mode]||''} <b>${esc(e.ville)}</b> · ${e.nuits} nuit${e.nuits>1?'s':''} <span class="v-sum-small">${fshort(e.debut)} → ${fshort(e.fin)}</span></li>`).join('')}</ol></div>
        <div class="v-f"><label>Reprendre la configuration d’un voyage (vierge)</label><select class="v-in" id="wz-tpl" onchange="CV.wzTpl()"><option value="">— Checklist de base —</option>${trips().map(t=>`<option value="${t.id}"${wz.tpl===t.id?' selected':''}>${esc(t.titre)}</option>`).join('')}</select></div>
        <div id="wz-tplx">${wzTplOpts()}</div>
        <label class="cv-checkline wz-sg"><input type="checkbox" id="wz-sg" ${wz.sugg === false ? '' : 'checked'}> 💡 ${MSGT('Me proposer les incontournables de chaque ville (4 par jour) et les excursions à ne pas manquer : je choisirai ceux à ajouter')}</label>
        <div id="wz-cov">${covBlock()}</div>
        <div class="v-hint">Seront créés : le programme jour par jour, un hébergement par étape, les trajets entre étapes et les allers-retours de chacun, sans prix (à remplir).</div>`;
    }
    h += `<div class="v-actions">${s>1 ? `<button type="button" class="v-btn sec cv-sq" onclick="CV.wzGo(${s-1})" aria-label="Revenir en arrière">←</button>` : ''}
      ${s<5 ? `<button type="button" class="v-btn" onclick="CV.wzGo(${s+1})">Suivant →</button>` : `<button type="button" class="v-btn" onclick="CV.wzCreate()">🚀 Créer le voyage</button>`}
      <button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div></div>`;
    openSheet(h);
    if(s===2) wzDates(wz.debut ? 'n' : 'd');
    if(s===3){ wzSum(); if(wz.etapes.some(e=>e.ville && !(wz.geo || {})[normQ(e.ville)])) setTimeout(wzCheck, 300); }
    if(s===5) covPrev();
  }
  function wzTplOpts(){
    const id = wz.tpl; if(!id || !R[id]) return '';
    const nc = list('check', c=>c.trip===id).length, nd = list('item', i=>i.trip===id && i.cat==='divers').length;
    return `<label class="cv-checkline"><input type="checkbox" id="wz-cc" ${wz.copyCheck?'checked':''}> Sa checklist, tout décoché (${nc})</label>
      <label class="cv-checkline"><input type="checkbox" id="wz-cd" ${wz.copyDivers?'checked':''}> Ses lignes 🧾 Divers, sans montants (${nd})</label>`;
  }
  function wzTpl(){ wz.tpl = val('wz-tpl'); document.getElementById('wz-tplx').innerHTML = wzTplOpts(); }
  function wzCreate(){
    wzRead();
    const {st, fin} = wzPlan(); if(!st.length){ alert('Ajoute au moins une étape.'); return; }
    const tid = 't' + uid(), out = [], v = wz.voyageurs, days = {};
    const day = (date, titre) => { days[date] = {id:'day:'+tid+':'+date, type:'day', trip:tid, date, titre, plan:''}; };
    const T = (o, k) => out.push(Object.assign({id:'i'+uid()+k, type:'item', trip:tid, cat:'transport', statut:'todo', partage:'pp', qui:[]}, o));
    out.push({id:tid, type:'trip', titre:wz.titre, sous:st.map(e=>e.ville).join(' → '), debut:wz.debut, fin, voyageurs:v, objectif: wz.objectif==='' ? '' : num(wz.objectif), cover:wz.cover || '', coverWk:wz.coverWk || '', ccs: wz.ccs || undefined});
    st.forEach((e,i)=>{
      if(e.nuits > 0) out.push({id:'i'+uid()+'h'+i, type:'item', trip:tid, cat:'hotel', titre:e.ville, base:e.ville, date:e.debut, dateFin:e.fin, statut:'todo', partage:'grp', qui:[]});
      const arrive = i===0 ? 'Arrivée à ' + e.ville : st[i-1].ville + ' → ' + e.ville;
      day(e.debut, arrive);
      range(addDays(e.debut,1), addDays(e.fin,-1)).forEach(dd=>day(dd, e.ville));
      if(i > 0) T({mode:e.mode, titre:st[i-1].ville+' → '+e.ville, from:st[i-1].ville, to:e.ville, date:e.debut}, 'e'+i);
    });
    const last = st[st.length-1];
    day(fin, (days[fin] && days[fin].titre && fin===last.debut ? days[fin].titre + ' · ' : last.ville + ' → ') + 'retour');
    // un trajet aller et un trajet retour par groupe (même ville ET même moyen de transport)
    const group = key => { const m = new Map(); v.forEach(pid=>{ const g = wz.gens[pid] || {}; const c = key==='dep' ? (g.dep||'') : (g.ret||g.dep||''), md = key==='dep' ? (g.mDep || st[0].mode) : (g.mRet || g.mDep || wz.modeRetour || st[0].mode), kk = c + '|' + md;
      if(!m.has(kk)) m.set(kk, {c, md, pids:[]}); m.get(kk).pids.push(pid); }); return m; };
    let k = 0;
    group('dep').forEach(({c, md, pids})=>T({mode:md, titre:(c||'Départ')+' → '+st[0].ville, from:c, to:st[0].ville, date:wz.debut, qui: pids.length===v.length ? [] : pids}, 'a'+(k++)));
    group('ret').forEach(({c, md, pids})=>T({mode:md, titre:last.ville+' → '+(c||'Retour'), from:last.ville, to:c, date:fin, qui: pids.length===v.length ? [] : pids}, 'r'+(k++)));
    out.push(...Object.values(days));
    const tpl = wz.tpl && R[wz.tpl];
    if(tpl && wz.copyCheck) list('check', c=>c.trip===tpl.id).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)).forEach((c,i)=>out.push({id:'c'+uid()+i, type:'check', trip:tid, cat:c.cat, label:c.label, done:false}));
    else BASIC_CHECK.forEach(([cat,label],i)=>out.push({id:'c'+uid()+i, type:'check', trip:tid, cat, label, done:false}));
    if(tpl && wz.copyDivers) list('item', i=>i.trip===tpl.id && i.cat==='divers').forEach((x,i)=>out.push({id:'i'+uid()+'d'+i, type:'item', trip:tid, cat:'divers', titre:x.titre, hint:x.hint||'', partage:x.partage, statut:'todo', qui:[]}));
    if(wzCreate.place === undefined && memberSpaces().some(x=>!x.err)){ memberPlaceAsk().then(c=>{ wzCreate.place = c || ''; try { wzCreate(); } finally { wzCreate.place = undefined; } }); return; }   // 👥 compagnon : carnet partagé ou le sien
    if(wzCreate.place && spaceObj(wzCreate.place)) TS()[tid] = wzCreate.place;
    putMany(out, '🚀 Voyage créé'); closeSheet(true); M.mode = 'prep'; M.tab = 'prog'; go(tid); setTimeout(()=>fxPlay('trip', 'Le rêve commence !'), 300);
    if(wz.sugg !== false) setTimeout(()=>suggFill(tid), 200);   // 💡 4 incontournables par jour + excursions, à trier dans l’étape « Que faire »
  }

  function seedUSA2025(){}
  function convert2026(){}

  /* ══════════ 📸 Souvenirs : étapes, textes, photos ══════════ */
  // Photos : stockées sur le téléphone (IndexedDB) et envoyées sur le serveur (D1) quand la synchro est active.
  const IDB = (() => {
    let dbp = null;
    const db = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open('carnet-photos', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('p', {keyPath:'id'});
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }));
    const op = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => {
      const tx = d.transaction('p', mode), rq = fn(tx.objectStore('p'));
      tx.oncomplete = () => res(rq ? rq.result : undefined); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); }); };
    return { get: id => op('readonly', s => s.get(id)), put: o => op('readwrite', s => s.put(o)), del: id => op('readwrite', s => s.delete(id)), keys: () => op('readonly', s => s.getAllKeys()) };
  })();
  const urls = {};
  const photoApi = () => { const u = apiUrl(); return u ? u.replace(/\/sync$/, '/photo') : ''; };
  // à quel carnet appartient une photo ? (celui de la fiche qui la contient)
  function photoCode(id){
    const base = String(id).replace(/\.t$/,'');
    const has = x => x && ((x.photos||[]).includes(base) || x.recu===base || x.preuve===base || (x.pj||[]).some(p=>p.id===base));
    const r = Object.values(R).find(x=>has(x) && x.type !== 'feed') || Object.values(R).find(has);
    if(r && r.demo) return null;   // les photos de démo restent sur le téléphone
    const t = targets(r)[0];
    return t === 'main' ? (M.sync.on && M.sync.code ? M.sync.code : null) : t;
  }
  /* ══════════ 🫙 POT COMMUN : chaque photo rangée UNE fois, lue par tous ceux qui y ont droit ══════════
     Une photo « v2 » est chiffrée avec SA propre clé, puis envoyée une seule fois dans le carnet où elle vit.
     La fiche « pk:<photo> » (chiffrée avec le reste du carnet) garde : où elle est (s), ses noms sur le serveur (i, it),
     sa clé (k) et son droit de lecture (r). Les compagnons reçoivent « pk: » avec le voyage ; les abonnés reçoivent
     une copie « fp:<photo> » avec la publication → ils voient la VRAIE photo, en grand, sans aucune copie sur le serveur.
     Le serveur ne garde que l'empreinte du droit de lecture : il ne voit ni la photo ni le carnet. */
  const potOn = () => M.pot !== false;   // 🫙 pot commun : pour tout le monde par défaut (rangement automatique des anciennes photos)
  const b64u = u8 => b64(u8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const shk = {};
  async function spaceHash(code){ if(!code) return ''; if(shk[code]) return shk[code]; return shk[code] = hex(await crypto.subtle.digest('SHA-256', te.encode('carnet-voyage:' + await authCode(code)))); }
  const pkOf = id => { const r = R['pk:' + String(id).replace(/\.t$/, '')]; return r && !r.deleted && r.s && r.k ? r : null; };
  const phRef = id => { const b = String(id).replace(/\.t$/, ''); return pkOf(b) || (()=>{ const f = R['fp:' + b]; return f && !f.deleted && f.s && f.k ? f : null; })(); };
  const capOf = async rk => hex(await crypto.subtle.digest('SHA-256', te.encode('vz-cap:' + rk)));
  async function v2Seal(bytes, kb){ const key = await crypto.subtle.importKey('raw', unb64(kb), 'AES-GCM', false, ['encrypt']), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, bytes)), out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return out; }
  async function v2Open(u8, kb){ const key = await crypto.subtle.importKey('raw', unb64(kb), 'AES-GCM', false, ['decrypt']); return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM', iv:u8.slice(0, 12)}, key, u8.slice(12))); }
  async function v2Fetch(ref, thumb){
    const id = thumb ? (ref.it || ref.i) : ref.i; if(!id || !photoApi()) return null;
    const r = await fetch(photoApi() + '?s=' + ref.s + '&id=' + encodeURIComponent(id) + '&rk=' + encodeURIComponent(ref.r)); if(!r.ok) return null;
    return new Blob([await v2Open(new Uint8Array(await r.arrayBuffer()), ref.k)], {type:'image/jpeg'});
  }
  async function v2Put(code, id, blob, kb, rh){
    const r = await fetch(photoApi(), {method:'POST', headers:{'X-Carnet-Code':await authCode(code), 'X-Photo-Id':id, 'X-Photo-Cap':rh, 'Content-Type':'image/jpeg'}, body:new Blob([await v2Seal(new Uint8Array(await blob.arrayBuffer()), kb)], {type:'image/jpeg'})});
    if(!r.ok){ let j = {}; try { j = (await r.json()) || {}; } catch(e){} const er = new Error((j.error ? j.error + ' ' : '') + '(' + r.status + ')'); er.st = r.status; er.j = j; er.code = code; throw er; }
  }
  // envoi d'une photo dans le pot commun (une fois) + sa fiche « pk: » ; ref : la remettre au même endroit (serveur vidé, « Tout renvoyer »)
  async function v2Upload(pid, full, thumb, code, trip, ref){
    const k = ref ? ref.k : b64(crypto.getRandomValues(new Uint8Array(32))), rk = ref ? ref.r : b64u(crypto.getRandomValues(new Uint8Array(18))), rh = await capOf(rk);
    const base = ref ? ref.i : 'p' + hex(crypto.getRandomValues(new Uint8Array(16)));
    await v2Put(code, base, full, k, rh);
    if(thumb) await v2Put(code, base + '-t', thumb, k, rh);
    if(ref) return ref;
    const pk = {id:'pk:' + pid, type:'phk', trip:trip || '', s:await spaceHash(code), i:base, it:thumb ? base + '-t' : '', k, r:rk, by:M.me || ''};
    putQuiet([pk]); return R[pk.id];
  }
  // anciennes copies à effacer (24 h après, une fois contrôlées) : celle du carnet de la photo, et celle du carnet principal
  // (l'ancien partage recopiait la photo dans chaque voyage partagé : la copie d'origine restait dans le carnet principal)
  function potGcAdd(code, pid){ const t = Date.now(), L = M.v1gc = M.v1gc || [], main = M.sync.on && M.sync.code;
    L.push([code, pid, t]); if(main && main !== code) L.push([main, pid, t]); }
  // codes que ce téléphone connaît, par empreinte (pour effacer une photo du pot commun rangée dans un de MES carnets)
  async function codeOfHash(h){ const cs = [M.sync.on && M.sync.code, ...(M.spaces || []).map(x=>x.code)].filter(Boolean); for(const c of cs) if(await spaceHash(c) === h) return c; return ''; }
  async function v2Del(ref){ const c = await codeOfHash(ref.s); if(!c || !photoApi()) return false;
    for(const id of [ref.i, ref.it].filter(Boolean)){ const r = await fetch(photoApi() + '?id=' + encodeURIComponent(id), {method:'DELETE', headers:{'X-Carnet-Code':await authCode(c)}}); if(!r.ok && r.status !== 404) return false; }
    return true; }
  // copie « à l'ancienne » telle qu'elle est sur le serveur, SANS repli sur la vignette ni copie sur le téléphone :
  // {blob} trouvée · {miss:1} absente du serveur (404) · erreur levée si le réseau ou le serveur flanche (on réessaiera)
  async function v1Get(id, code){
    const r = await fetch(photoApi() + '?id=' + encodeURIComponent(await sid(id, code)), {headers:{'X-Carnet-Code':await authCode(code)}});
    if(r.status === 404) return {miss:1};
    if(!r.ok){ const er = new Error('(' + r.status + ')'); er.st = r.status; throw er; }
    let b = await r.blob(); if(E2E) b = new Blob([await unseal(new Uint8Array(await b.arrayBuffer()), code)], {type:'image/jpeg'});
    return {blob:b};
  }
  // version envoyée sur le serveur : photos de souvenirs allégées (1080 px), et jamais plus de 1,7 Mo
  async function cloudBlob(blob, ow, id){
    let ub = blob;
    if(ow && (ow.photos || []).includes(id)) ub = await cloudCopy(ub);
    if(ub.size > 1700000){ for(const [mx, q] of [[2048,0.8],[1800,0.7],[1500,0.62],[1200,0.55]]){ try { ub = await shrink(blob, mx, q); } catch(e){ break; } if(ub.size <= 1700000) break; } }
    return ub;
  }
  // 🫙 la grande photo à ranger dans le pot : l'original du téléphone (même allègement qu'à l'envoi), sinon la copie du serveur.
  // Vignette seulement si le serveur n'a jamais eu la grande photo. null = rien trouvé ; erreur = réseau (à réessayer).
  async function potFull(pid, code, ow){
    let o = null; try { o = await IDB.get(pid); } catch(e){}
    if(o && o.blob){ try { await o.blob.slice(0, 1).arrayBuffer(); return await cloudBlob(o.blob, ow, pid); } catch(e){} }
    const a = await v1Get(pid, code); if(a.blob) return a.blob;
    const t = await v1Get(pid + '.t', code); return t.blob || null;
  }
  async function photoBlob(id){
    if(/\.t$/.test(id)){
      try { const o = await IDB.get(id); if(o && o.blob){ try { await o.blob.slice(0, 1).arrayBuffer(); return o.blob; } catch(e){} } } catch(e){}
      { const ref = phRef(id); if(ref) try { const b = await v2Fetch(ref, true); if(b){ try { await IDB.put({id, blob:b, up:1}); } catch(e){} return b; } } catch(e){} }   // 🫙 pot commun
      const tc = photoCode(id);   // vignette déjà sur le serveur (≈ 30 Ko) : on la prend, sans télécharger la grande photo
      if(tc && photoApi()){
        try {
          const r = await fetch(photoApi() + '?id=' + encodeURIComponent(await sid(id, tc)), {headers:{'X-Carnet-Code':await authCode(tc)}});
          if(r.ok){ let b = await r.blob(); if(E2E) b = new Blob([await unseal(new Uint8Array(await b.arrayBuffer()), tc)], {type:'image/jpeg'});
            try { await IDB.put({id, blob:b, up:1}); } catch(e){} return b; }
        } catch(e){}
      }
      const full = await photoBlob(id.slice(0, -2)); if(!full) return null;
      try { const th = await shrink(full, 480, 0.74); try { await IDB.put({id, blob:th, up:1}); } catch(e){} return th; } catch(e){ return full; }
    }
    try { const o = await IDB.get(id); if(o && o.blob){ try { await o.blob.slice(0, 1).arrayBuffer(); return o.blob; } catch(e){ /* fichier perdu par Safari : on le reprend sur le serveur */ } } } catch(e){}
    { const ref = phRef(id); if(ref) try { const b = await v2Fetch(ref, false); if(b){ try { await IDB.put({id, blob:b, up:1}); } catch(e){} return b; } } catch(e){} }   // 🫙 pot commun : la vraie photo, en grand
    const code = photoCode(id);
    const thumbOnly = async () => {   // photo reçue sans grand format (paquet « vignettes ») : on se contente de la vignette
      try { const o = await IDB.get(id + '.t'); if(o && o.blob) return o.blob; } catch(e){}
      if(!code || !photoApi()) return null;
      try { const r = await fetch(photoApi() + '?id=' + encodeURIComponent(await sid(id + '.t', code)), {headers:{'X-Carnet-Code':await authCode(code)}});
        if(!r.ok) return null; let b = await r.blob(); if(E2E) b = new Blob([await unseal(new Uint8Array(await b.arrayBuffer()), code)], {type:'image/jpeg'});
        try { await IDB.put({id:id + '.t', blob:b, up:1}); } catch(e){} return b; } catch(e){ return null; }
    };
    if(!code || !photoApi()) return thumbOnly();
    try {
      const r = await fetch(photoApi() + '?id=' + encodeURIComponent(await sid(id, code)), {headers:{'X-Carnet-Code':await authCode(code)}});
      if(!r.ok) return thumbOnly();
      let b = await r.blob();
      if(E2E) b = new Blob([await unseal(new Uint8Array(await b.arrayBuffer()), code)], {type:'image/jpeg'});
      try { await IDB.put({id, blob:b, up:1}); } catch(e){}
      return b;
    } catch(e){ return thumbOnly(); }
  }
  const phMiss = {};   // photo introuvable (pas encore envoyée) : on ne la redemande qu’après une minute
  async function photoURL(id){
    if(urls[id]) return urls[id];
    if(phMiss[id] && Date.now() - phMiss[id] < 60000) return null;
    let b = await photoBlob(id); if(b) b = await sniffImg(b); if(!b){ phMiss[id] = Date.now(); return null; }
    delete phMiss[id];
    return urls[id] = URL.createObjectURL(b);
  }
  let hydrating = false;
  // Redessin sans clignotement : les images déjà affichées sont gardées (déplacées) au lieu d’être recréées puis redécodées
  function imgPool(root){ const p = {}; if(root) root.querySelectorAll('img[data-ph][data-ok]').forEach(i=>{ if(i.complete && i.naturalWidth) (p[i.dataset.ph] = p[i.dataset.ph] || []).push(i); }); return p; }
  function imgReuse(root, p){
    if(!root) return;
    root.querySelectorAll('img[data-ph]').forEach(n=>{ const o = (p[n.dataset.ph] || []).shift(); if(!o) return;
      [...o.attributes].forEach(a=>{ if(!n.hasAttribute(a.name) && a.name !== 'src' && a.name !== 'data-ok') o.removeAttribute(a.name); });
      [...n.attributes].forEach(a=>{ if(a.name !== 'src') o.setAttribute(a.name, a.value); });
      o.dataset.ok = '1'; n.replaceWith(o); });
  }
  async function hydrate(){
    // déjà en mémoire : tout de suite, sans attendre (évite le clignotement quand une page est redessinée)
    document.querySelectorAll('img[data-ph]:not([data-ok])').forEach(img=>{ const u = urls[img.dataset.ph]; if(u){ img.src = u; img.dataset.ok = '1'; } });
    if(hydrating) return; hydrating = true;
    try {
      for(let guard = 0; guard < 5000; guard++){
        const all = [...document.querySelectorAll('img[data-ph]:not([data-ok]):not([data-ld])')]; if(!all.length) break;
        const vh = window.innerHeight || 800, near = img => { const r = img.getBoundingClientRect(); return (r.width || r.height) && r.bottom > -vh * .5 && r.top < vh * 1.8; };
        const vis = all.filter(near), batch = (vis.length ? vis : all).slice(0, 4);   // celles à l’écran d’abord
        batch.forEach(i=>{ i.dataset.ld = '1'; });
        await Promise.all(batch.map(async img => {
          const id = img.dataset.ph, u = await photoURL(id);
          // la page a pu être redessinée pendant le téléchargement : on remplit aussi les nouvelles images de la même photo
          [img, ...document.querySelectorAll('img[data-ph]:not([data-ok])')].filter(x=>x.dataset.ph === id).forEach(x=>{ x.dataset.ok = '1'; if(u) x.src = u; else x.classList.add('miss'); });
        }));
      }
    } finally { hydrating = false; }
  }
  async function sniffImg(blob){
    try { const h = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
      const t = h[0]===0xFF && h[1]===0xD8 ? 'image/jpeg' : h[0]===0x89 && h[1]===0x50 ? 'image/png' : (h[8]===0x57 && h[9]===0x45 && h[10]===0x42 && h[11]===0x50) ? 'image/webp' : (h[4]===0x66 && h[5]===0x74 && h[6]===0x79 && h[7]===0x70) ? 'image/heic' : '';
      return t && t !== blob.type ? new Blob([blob], {type:t}) : blob; } catch(e){ return blob; }
  }
  async function decodeImg(blob){
    blob = await sniffImg(blob);
    try { return await createImageBitmap(blob); } catch(e){}
    const u = URL.createObjectURL(blob);
    try { const im = new Image(); im.decoding = 'async'; im.src = u; await im.decode(); return im; } finally { setTimeout(()=>URL.revokeObjectURL(u), 1000); }
  }
  async function shrink(blob, max, q){
    const bmp = await decodeImg(blob);
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width*s); c.height = Math.round(bmp.height*s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); if(bmp.close) bmp.close();
    const w = await new Promise(r => c.toBlob(r, 'image/webp', Math.max(0.5, q - 0.04)));
    if(w && w.type === 'image/webp' && w.size) return w;
    return new Promise(r => c.toBlob(r, 'image/jpeg', q));
  }
  // Une photo = deux versions : grande (1280 px) et vignette (420 px, id + '.t')
  // copie pour le serveur : 1080 px sur le petit côté (1920 max sur le grand), WebP 80 % (sinon JPEG 80 %) ; l’original reste ici
  async function cloudCopy(blob){
    try {
      const bmp = await decodeImg(blob), W = bmp.width, H = bmp.height, s = Math.min(1, 1080 / Math.min(W, H), 1920 / Math.max(W, H));
      const c = document.createElement('canvas'); c.width = Math.round(W * s); c.height = Math.round(H * s);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); if(bmp.close) bmp.close();
      let out = await new Promise(r => c.toBlob(r, 'image/webp', 0.76));   // ≈ 15 % plus léger, même rendu sur un écran de téléphone
      if(!(out && out.type === 'image/webp' && out.size)) out = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.74));   // iPhone (pas de WebP) : ≈ 25 % plus léger
      return out && out.size && out.size < blob.size ? out : blob;
    } catch(e){ return blob; }
  }
  /* ---------- 📱 Place sur le téléphone : stockage protégé + libérer la place des grandes photos déjà sur le serveur ---------- */
  async function spaceSheet(){
    let used = 0, quota = 0, kept = false;
    try { const e = await navigator.storage.estimate(); used = e.usage || 0; quota = e.quota || 0; } catch(e){}
    try { kept = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false; } catch(e){}
    if(!kept){ try { kept = navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false; } catch(e){} }
    const mo = b => b >= 1e9 ? (Math.round(b / 1e8) / 10).toString().replace('.', ',') + ' Go' : Math.round(b / 1e6) + ' Mo';
    const past = trips().filter(t=>!t.demo && tripPhase(t) === 'past').length;
    openSheet(`<h2>📱 Place sur ce téléphone</h2>
      <div class="v-box" style="margin:0 0 10px"><div>💾 Utilisé par Vezoria : <b>${used ? mo(used) : '?'}</b></div>${quota ? `<div class="v-sum-small">Place disponible pour l’appli : ${mo(quota)}</div>` : ''}
        <div style="margin-top:6px">${kept ? '🔒 Stockage protégé : le téléphone ne fera pas de ménage dans tes voyages et tes photos.' : '⚠️ Stockage non protégé : si le téléphone manque de place, il peut effacer les données de l’appli.'}</div></div>
      ${kept ? '' : `<div class="v-sum-small" style="margin-bottom:10px">${isIOSDev ? 'Sur iPhone : ajoute Vezoria à l’écran d’accueil (Safari → Partager → « Sur l’écran d’accueil ») et ouvre-la de là. Garde aussi une 💾 sauvegarde complète de temps en temps.' : 'Installe Vezoria (Google Play ou « Installer l’appli ») et ouvre-la souvent : Android protège alors son stockage. Garde aussi une 💾 sauvegarde complète de temps en temps.'}</div>`}
      <h3 style="margin:8px 0 4px">🧹 Libérer de la place</h3>
      <div class="v-sum-small">Pour les voyages terminés (${past}), les grandes photos déjà envoyées sur le serveur sont retirées de ce téléphone. Les vignettes restent : la grille et le film s’affichent toujours, et la grande photo revient du serveur, en version allégée, quand tu l’ouvres (il faut du réseau). Les photos pas encore envoyées ne sont jamais touchées.</div>
      <div id="sp-msg" class="v-sum-small" style="margin-top:6px"></div>
      <div class="v-actions"><button type="button" class="v-btn" id="sp-go" onclick="CV.spaceFree()"${past ? '' : ' disabled'}>🧹 Libérer de la place</button></div>
      <h3 style="margin:14px 0 4px">🔁 Doublons et photos inutiles</h3>
      <div class="v-sum-small">Un voyage importé deux fois, des souvenirs remplacés : l’appli retrouve les copies en trop et les photos qui ne servent plus à rien, sur ce téléphone et sur le serveur.</div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.dupSheet()">🔁 Chercher les doublons</button><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  /* ---------- 🔁 Doublons : voyages importés deux fois, puis ménage des photos qui ne servent plus ---------- */
  let DUPG = [];
  function dupGroups(){
    const g = {};
    trips().filter(t=>!t.demo && !t.deleted).forEach(t=>{ const k = t.src === 'polarsteps' && t.psId ? 'ps:' + t.psId : 't:' + normQ(t.titre || '') + '|' + (t.debut || '') + '|' + (t.fin || ''); (g[k] = g[k] || []).push(t); });
    const n = t => Object.values(R).filter(r=>r && !r.deleted && r.trip === t.id && r.type !== 'souv').length;
    return Object.values(g).filter(a=>a.length > 1).map(a=>a.slice().sort((x, y)=>(TS()[y.id] || FT()[y.id] ? 1 : 0) - (TS()[x.id] || FT()[x.id] ? 1 : 0) || n(y) - n(x) || (x.createdAt || 0) - (y.createdAt || 0)));
  }
  function dupSheet(){
    DUPG = dupGroups();
    const sv = t => list('souv', s=>s.trip === t.id), nph = t => sv(t).reduce((k, s)=>k + (s.photos || []).length, 0), fd = t => t.createdAt ? new Date(t.createdAt).toLocaleDateString((window.I18N ? I18N.locale : 'fr-FR')) : '?';
    openSheet(`<h2>🔁 Doublons</h2>
      ${DUPG.length ? `<div class="v-sum-small" style="margin-bottom:8px">Ces voyages existent en plusieurs exemplaires. On garde celui qui est partagé ou le plus complet, les copies en trop sont supprimées (leurs photos aussi, si elles ne servent pas ailleurs).</div>`
        + DUPG.map((a, i)=>`<label class="cv-checkline dup-g"><input type="checkbox" id="dup-${i}" checked><span><b data-notr>${esc(a[0].titre)}</b> ×${a.length}<small>On garde : créé le ${fd(a[0])} · ${sv(a[0]).length} souvenirs · ${nph(a[0])} photos</small><small>À supprimer : ${a.slice(1).map(t=>`créé le ${fd(t)} · ${sv(t).length} souvenirs · ${nph(t)} photos`).join(' / ')}</small></span></label>`).join('')
        + `<div class="v-actions"><button type="button" class="v-btn" onclick="CV.dupTripsGo()">🗑 Supprimer les copies cochées</button></div>`
        : `<div class="v-empty">Aucun voyage en double. 👍</div><div class="v-sum-small">Les photos en trop d’un voyage importé deux fois avec « Remplacer » se nettoient juste en dessous.</div>`}
      <h3 style="margin:14px 0 4px">🧹 Photos qui ne servent plus</h3>
      <div class="v-sum-small">Photos de souvenirs supprimés ou remplacés, restées sur ce téléphone ou sur le serveur. L’appli synchronise d’abord, puis ne retire que les photos qui ne sont dans aucune fiche. Sur le serveur, seules celles envoyées il y a plus de 3 jours partent (le temps que tous les téléphones aient synchronisé).</div>
      <div id="dup-msg" class="v-sum-small" style="margin-top:6px"></div>
      <div class="v-actions"><button type="button" class="v-btn" id="dup-ph" onclick="CV.photoSweep()">🧹 Faire le ménage des photos</button><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  async function dupTripsGo(){
    const del = DUPG.filter((a, i)=>{ const c = document.getElementById('dup-' + i); return c && c.checked; }).flatMap(a=>a.slice(1));
    if(!del.length) return;
    if(!(await uiConfirm('Supprimer ' + del.length + ' copie(s) de voyage, avec leurs fiches ? (pour tout le monde si la synchro est active)'))) return;
    const out = [];
    del.forEach(t=>{ Object.values(R).filter(r=>r && r.trip === t.id && !r.deleted).forEach(r=>out.push(Object.assign(clone(r), {deleted:true}))); out.push(Object.assign(clone(t), {deleted:true})); });
    putMany(out, '🗑 ' + del.length + ' copie(s) supprimée(s)');
    if(del.some(t=>t.id === M.trip)){ M.trip = (DUPG.find(a=>a.slice(1).some(t=>t.id === M.trip)) || [])[0]?.id || null; persist(); }
    dupSheet(); refresh();
  }
  async function photoSweep(){
    const say = m => { const e = document.getElementById('dup-msg'); if(e) e.textContent = m; }, btn = document.getElementById('dup-ph');
    if(btn) btn.disabled = true;
    try {
      // 1. synchroniser : on doit connaître toutes les fiches (celles des compagnons aussi) avant de juger qu’une photo ne sert plus
      if(M.sync.on || (M.spaces || []).length){ say('🔄 Synchronisation…'); try { await syncNow(true); } catch(e){} try { await photoPurge(); } catch(e){} }
      const liveRecs = Object.values(R).filter(r=>r && !r.deleted), live = new Set(liveRecs.flatMap(photoRefs)), pend = new Set((M.pq || []).map(x=>String(x).replace(/\.t$/, '')));
      // une photo citée n’importe où (couverture, avatar…) est gardée : tous les identifiants présents dans les fiches et les réglages
      const cited = new Set(); (JSON.stringify(liveRecs) + JSON.stringify(Object.assign({}, M, {pq:null, pgone:null, fdel:null}))).replace(/"([\w.-]{6,80})"/g, (_, x)=>{ cited.add(x); return ''; });
      // 2. ce téléphone
      say('📱 Ménage sur ce téléphone…');
      let nLoc = 0, frLoc = 0;
      for(const k of (await IDB.keys()) || []){
        const b = String(k).replace(/\.t$/, ''); if(live.has(b) || pend.has(b) || cited.has(b)) continue;
        try { const o = await IDB.get(k); frLoc += (o && o.blob && o.blob.size) || 0; await IDB.del(k); nLoc++; if(urls[k]){ try { URL.revokeObjectURL(urls[k]); } catch(e){} delete urls[k]; } } catch(e){}
      }
      // 3. le serveur : chaque carnet de ce téléphone (code principal + voyages partagés avec leur propre code)
      const codes = [...new Set([M.sync.on && M.sync.code, ...Object.values(TS()).filter(c=>spaceObj(c))].filter(Boolean))];
      // carnet de chaque photo (même règle que pour l’envoi), calculé une seule fois
      const phCode = new Map(); [...liveRecs.filter(r=>r.type !== 'feed'), ...liveRecs.filter(r=>r.type === 'feed')].forEach(r=>{ if(r.demo) return; const t = targets(r)[0], c = t === 'main' ? (M.sync.on && M.sync.code ? M.sync.code : null) : t;
        photoRefs(r).forEach(id=>{ if(!phCode.has(id)) phCode.set(id, c); }); });
      let nSrv = 0, frSrv = 0, skip = 0;
      for(const code of codes){
        say('☁️ Ménage sur le serveur…');
        const want = new Set();
        for(const [id, c] of phCode) if(c === code){ want.add(await sid(id, code)); want.add(await sid(id + '.t', code)); }
        let cursor = '', extra = [];
        do {
          const r = await fetch(photoApi() + '?list=1' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''), {headers:{'X-Carnet-Code':await authCode(code)}});
          if(!r.ok){ skip++; extra = null; break; }
          const j = await r.json(); if(!j || !Array.isArray(j.ids)){ skip++; extra = null; break; }   // serveur ancien (version test dans un carnet) : on passe
          j.ids.forEach(o=>{ if(!want.has(o.i)) extra.push(o.i); }); cursor = j.cursor || '';
        } while(cursor);
        if(!extra) continue;
        for(let i = 0; i < extra.length; i += 1000){
          const r = await fetch(photoApi() + '?bulk=1', {method:'DELETE', headers:{'X-Carnet-Code':await authCode(code), 'Content-Type':'application/json'}, body:JSON.stringify({ids:extra.slice(i, i + 1000)})});
          if(r.ok){ const j = await r.json(); nSrv += j.deleted || 0; frSrv += j.freed || 0; }
          say('☁️ ' + nSrv + ' photo(s) retirée(s) du serveur…');
        }
      }
      const mo = b => Math.round(b / 1e6);
      say('✅ Ce téléphone : ' + nLoc + ' fichier(s), ' + mo(frLoc) + ' Mo · Serveur : ' + nSrv + ' fichier(s), ' + mo(frSrv) + ' Mo.' + (skip ? ' (Serveur non nettoyé pour ' + skip + ' carnet(s) : mise à jour du serveur nécessaire.)' : ''));
    } catch(e){ say('⚠️ ' + (e.message || e)); }
    if(btn) btn.disabled = false;
  }
  async function spaceFree(){
    const say = m => { const e = document.getElementById('sp-msg'); if(e) e.textContent = m; }, btn = document.getElementById('sp-go');
    if(!(await uiConfirm('Retirer de ce téléphone les grandes photos des voyages terminés déjà sur le serveur ? Les vignettes restent, et chaque grande photo revient quand tu l’ouvres.'))) return;
    if(btn) btn.disabled = true;
    const pend = new Set(M.pq || []), ids = [];
    trips().filter(t=>!t.demo && tripPhase(t) === 'past').forEach(t=>list('souv', x=>x.trip === t.id).forEach(x=>(x.photos || []).forEach(p=>{ if(!pend.has(p) && photoCode(p)) ids.push(p); })));
    let n = 0, freed = 0;
    for(let i = 0; i < ids.length; i++){
      const id = ids[i];
      try { const o = await IDB.get(id); if(!(o && o.blob && o.up)) continue;
        const th = await IDB.get(id + '.t'); if(!(th && th.blob)) continue;   // jamais sans vignette
        freed += o.blob.size || 0; await IDB.del(id); if(urls[id]){ try { URL.revokeObjectURL(urls[id]); } catch(e){} delete urls[id]; } n++; } catch(e){}
      if(!(i % 40)) say('🧹 ' + (i + 1) + ' / ' + ids.length + '…');
    }
    say(n ? '✅ ' + n + ' grande(s) photo(s) retirée(s) de ce téléphone · ' + Math.round(freed / 1e6) + ' Mo libérés.' : 'Rien à libérer pour le moment (photos pas encore envoyées, ou déjà libérées).');
    if(btn) btn.disabled = false;
  }
  async function storePhoto(blob, id){
    const full = await shrink(blob, 2048, 0.88), thumb = await shrink(blob, 480, 0.74);
    await IDB.put({id, blob:full, up:0}); await IDB.put({id:id+'.t', blob:thumb, up:1});
    urls[id+'.t'] = URL.createObjectURL(thumb);
    M.pq = M.pq || []; M.pq.push(id);   // seule la grande photo part sur le serveur : la vignette est refaite sur chaque téléphone
  }
  const pqN = () => (M.pq||[]).length;
  let uploading = false, upHalt = false, upAt = 0, upGen = 0;   // upAt : dernier progrès ; upGen : un envoi bloqué est remplacé par le suivant   // upHalt : on arrête les envois (suppression du serveur en cours)
  const idbT = id => withTimeout(IDB.get(id), 20000);   // Safari : une lecture de la base peut ne jamais répondre
  async function uploadQueue(){
    if(uploading && Date.now() - upAt < 240000) return;
    if(!(M.pq||[]).length || !photoApi()) return;
    if(M.pqPause && Date.now() < M.pqPause) return;   // pause de sécurité ou serveur plein : on réessaie plus tard
    if(!(M.sync.on && M.sync.code) && !(M.spaces||[]).length){ M.pqWait = (M.pq||[]).length; return; }
    uploading = true; upAt = Date.now(); const gen = ++upGen; let upErr = '', waiting = 0, stop = false;
    if((M.fq||[]).length){ try { await feedUpload(); } catch(e){} }   // les vignettes des abonnés passent avant les grandes photos
    // photo → code du carnet, calculé une seule fois (rapide même avec des milliers de photos)
    const owner = {}, dead = new Set(); Object.values(R).forEach(x=>{ if(!x || x.type === 'feed') return; [...(x.photos||[]), x.recu, x.preuve, x.cover, ...(x.pj||[]).map(p=>p && p.id)].forEach(p=>{ if(!p) return; if(x.deleted) dead.add(p); else if(!owner[p]) owner[p] = x; }); });
    // photos de fiches supprimées (ex. souvenirs remplacés par un nouvel import) : elles ne partent plus et quittent la file
    { const n0 = M.pq.length; M.pq = M.pq.filter(id=>{ const b = String(id).replace(/\.t$/, ''); return owner[b] || !dead.has(b); }); if(M.pq.length !== n0) persist(); }
    const codeOf = id => { const base = String(id).replace(/\.t$/,''), r = owner[base]; if(!r) return photoCode(id); if(r.demo) return null; const t = targets(r)[0]; return t === 'main' ? (M.sync.on && M.sync.code ? M.sync.code : null) : t; };
    // seules les photos des voyages en ligne partent ; les autres attendent sur le téléphone, sans être comptées
    M.pqFull = M.pqFull || {}; Object.keys(M.pqFull).forEach(c=>{ if(Date.now() > M.pqFull[c]) delete M.pqFull[c]; });
    const isFull = id => { const c = codeOf(id); return !!(c && M.pqFull[c]); };
    const todo = M.pq.filter(id=>codeOf(id) && !isFull(id)); waiting = M.pq.length - todo.length; let left = todo.length;
    if(!left){ M.pqWait = waiting; if(gen === upGen) uploading = false; syncDot(); return; }
    cryptShow('🔐 Chiffrement des photos… (' + left + ')');
    const send = async (blob, pid, code) => { const body = E2E ? new Blob([await seal(new Uint8Array(await blob.arrayBuffer()), code)], {type:'image/jpeg'}) : blob;
      const r = await fetch(photoApi(), {method:'POST', headers:{'X-Carnet-Code':await authCode(code), 'X-Photo-Id':await sid(pid, code), 'Content-Type':'image/jpeg'}, body});
      if(!r.ok && r.status !== 413){ let j = {}; try { j = (await r.json()) || {}; } catch(e){}
        const er = new Error((j.error ? j.error + ' ' : '') + '(' + r.status + ')'); er.st = r.status; er.j = j; er.code = code; throw er; } };
    const one = async id => {
      const code = codeOf(id); if(!code) return;          // voyage repassé hors ligne entre-temps : la photo reste sur le téléphone
      let o = null; try { o = await idbT(id); } catch(e){ if(/délai/.test(e && e.message || '')) throw e; }   // base qui ne répond pas : on réessaiera, la photo ne quitte pas la file
      const pk = pkOf(id);
      // 🫙 déjà dans le pot commun : rien à recopier (voyage partagé, publié…) ; seulement remise en place si son carnet a été vidé
      if(pk && !/\.t$/.test(id)){
        if(o && o.blob && pk.s === await spaceHash(code)){ let tb = null; try { const to = await idbT(id + '.t'); tb = to && to.blob; } catch(e){} await v2Upload(id, await cloudBlob(o.blob, owner[id], id), tb, code, pk.trip, pk); }
        M.pq = M.pq.filter(x=>x!==id); syncDot(); left--; return;
      }
      if(/\.t$/.test(id)){   // vignette seule (paquet sans grand format) : envoyée telle quelle ; sinon elle part avec sa grande photo
        let big = null; try { big = await idbT(id.slice(0, -2)); } catch(e){}
        if(o && o.blob && !(big && big.blob)) await send(o.blob, id, code);
      } else if(o && o.blob){
        // photos de souvenirs : copie légère façon Instagram (tickets et pièces jointes : intacts) ; plus lourde que la limite du serveur (1,9 Mo) : réduite
        const ub = await cloudBlob(o.blob, owner[id], id);
        if(potOn()){   // 🫙 pot commun : photo + vignette chiffrées avec leur propre clé, rangées une seule fois
          let tb = null; try { const to = await idbT(id + '.t'); tb = to && to.blob; } catch(e){}
          if(!tb) try { tb = await shrink(ub, 480, 0.74); } catch(e){}
          const ow = owner[id]; await v2Upload(id, ub, tb, code, ow ? (ow.type === 'trip' ? ow.id : ow.trip || '') : '');
          if(o.up) potGcAdd(code, id);   // déjà envoyée à l'ancienne : l'ancienne copie partira dans 24 h, une fois contrôlée
        } else {
        await send(ub, id, code);
        try {   // + vignette légère (≈ 30 Ko) pour que l’autre téléphone affiche vite la grille
          let tb = null; try { const to = await idbT(id + '.t'); tb = to && to.blob; } catch(e){}
          if(!tb) tb = await shrink(ub, 480, 0.74);
          await send(tb, id + '.t', code);
        } catch(e){}
        }
        try { await IDB.put({id, blob:new Blob([await o.blob.arrayBuffer()], {type:o.blob.type || 'image/jpeg'}), up:1}); } catch(e){}   // copie : Safari perd le fichier si on réenregistre le même objet
      }
      M.pq = M.pq.filter(x=>x!==id); syncDot();
      left--; if(left && !(left % 3)){ persist(); cryptShow('🔐 Chiffrement des photos… (' + left + ' restante' + (left > 1 ? 's' : '') + ')'); }
    };
    let upSt = 0, upJ = null;
    const worker = async () => { while(!stop && !upHalt && gen === upGen && todo.length){ const id = todo.shift(); if(isFull(id)){ waiting++; continue; }
      try { await one(id); upAt = Date.now(); } catch(e){
        // place de CE carnet pleine : ses photos restent sur le téléphone, celles des autres voyages continuent de partir
        if(e && e.st === 507 && e.code && /carnet/i.test(e.j && e.j.error || '')){ M.pqFull[e.code] = Date.now() + (e.j && e.j.full ? 600000 : 3600000); if(M.quota) M.quota.at = 0; waiting++; if(!upErr || upSt !== 507){ upErr = e.message; upSt = 507; upJ = e.j; } continue; }
        if(!upErr || upSt === 507){ upErr = (e && e.message) || String(e); upSt = e && e.st || 0; upJ = e && e.j; } stop = true; } } };
    try { await Promise.all([worker(), worker(), worker()]); }   // 3 envois en même temps : bien plus rapide sur mobile
    catch(e){ upErr = 'réseau : ' + (e && e.message || e); }
    if(/Failed to fetch|NetworkError|Load failed/i.test(upErr)) upErr = 'réseau : ' + upErr;
    // messages clairs : pause de sécurité (trop d’envois d’un coup) ou place du serveur pleine
    if(upSt === 429){ const min = Math.max(1, Math.round(((upJ && upJ.retry) || 600) / 60)); M.pqPause = Date.now() + min * 60000;
      upErr = '⏸️ Pause de sécurité : beaucoup de photos envoyées d’un coup. L’envoi reprend tout seul dans ' + min + ' min.'; }
    else if(upSt === 507){ const go = upJ && upJ.max ? Math.round(upJ.max / 1e8) / 10 : 0;
      upErr = upJ && upJ.branch ? '📦 ' + MSGT('La place photos du carnet de l’organisateur du voyage est pleine : tes photos restent sur ce téléphone, rien n’est perdu.')
        : /carnet/i.test(upJ && upJ.error || '') ? (go ? '📦 Place photos de ce carnet pleine sur le serveur (' + String(go).replace('.', ',') + ' Go) : les photos restantes restent sur ce téléphone, rien n’est perdu.' : '📦 Place photos de ce carnet pleine sur le serveur : les photos restantes restent sur ce téléphone, rien n’est perdu.')
        : '📦 Le serveur photos est plein pour le moment : les photos restantes restent sur ce téléphone, rien n’est perdu.';
      if(!/carnet/i.test(upJ && upJ.error || '')) M.pqPause = Date.now() + 3600000; }
    M.pqWait = waiting; M.pqErr = upErr || ''; persist();
    cryptHide(upErr ? (upSt === 429 || upSt === 507 ? upErr : '⚠️ Photos non envoyées : ' + upErr) : left ? '' : '🔒 Photos chiffrées et envoyées');
    if(gen === upGen) uploading = false; syncDot();
    photoPurge();
  }

  const souvs = () => list('souv', s=>s.trip===M.trip).sort((a,b)=>(a.date||'').localeCompare(b.date||'') || (a.ordre||0)-(b.ordre||0));
  function renderSouv(){
    const all = souvs(), nph = all.reduce((s,x)=>s+(x.photos||[]).length,0);
    let h = souvTop() + studioHTML(all, nph) + `<div class="v-sum"><div class="v-sum-row"><div class="v-sum-big">📸 ${all.length} souvenir${all.length>1?'s':''}</div><div class="v-sum-small">${nph} photo${nph>1?'s':''}</div></div>
      <div class="v-sum-small">Les étapes, les récits et les photos du voyage. Ajoute tes propres souvenirs avec leurs photos.</div>
      <div class="cv-row" style="margin-top:10px"><button class="v-day-edit" onclick="CV.editSouv(null)">＋ Souvenir</button><button class="v-day-edit" onclick="CV.autoPhotoPick()">✨ Ranger mes photos</button>${nph || all.length ? `<button class="v-day-edit" onclick="CV.filmOpen()">🎬 Film du voyage</button>` : ''}</div>
      ${(M.pq||[]).length && M.sync.on ? `<div class="v-sum-small" style="margin-top:6px">${E2E ? '🔐' : '☁️'} ${pqN()} photo(s) en cours ${E2E ? 'de chiffrement et d’envoi' : 'd’envoi'}…</div>` : ''}
      ${!M.sync.on && nph ? `<div class="v-sum-small" style="margin-top:6px">Les photos restent sur ce téléphone tant que la synchro n’est pas activée.</div>` : ''}</div>`;
    if(!all.length) h += `<div class="v-empty">Encore aucun souvenir pour ce voyage.</div>`;
    const dsl = dayList(); let lastG = null;
    const grpOf = s => { const i = dsl.indexOf(s.date); return i >= 0 ? `${PJ(i+1)} · ${fdate(s.date)}|${dayInfo(s.date).titre||''}` : s.date ? `${fdate(s.date)}|hors programme` : 'Sans date|'; };
    h += all.map(s=>{
      const g = grpOf(s), gh = g !== lastG ? (lastG = g, `<div class="cv-souv-grp">📅 ${esc(g.split('|')[0])}${g.split('|')[1] ? ` <small>${esc(g.split('|')[1])}</small>` : ''}${s.date ? `<button type="button" class="st-dbtn" onclick="CV.storyOpen('${ja(s.date)}')">▶ Story</button>` : ''}</div>`) : '';
      const ph = s.photos || [], more = ph.length - 9;
      return gh + `<div class="cv-souv">
        <div class="cv-souv-h"><span class="v-day-d">${s.date ? fdate(s.date) : '—'}</span><div><div class="cv-souv-t">${esc(s.titre||s.lieu||'Souvenir')}</div>
          ${s.lieu || s.pays ? `<div class="v-sum-small">📍 ${esc(lieuPays(s.lieu, s.pays))}</div>` : ''}</div>
          ${(s.photos||[]).length ? `<button class="cv-x cv-pcb" onclick="CV.pcOpen('${ja(s.id)}')" aria-label="Carte postale" title="Carte postale">💌</button>` : ''}<button class="cv-x" onclick="CV.editSouv('${ja(s.id)}')" aria-label="Modifier">✏️</button>${/^💌/.test(s.titre || '') ? `<button class="cv-x" onclick="CV.delSouv('${ja(s.id)}')" aria-label="Supprimer la carte postale" title="Supprimer">🗑</button>` : ''}</div>
        ${s.texte ? `<div class="cv-souv-txt" onclick="this.classList.toggle('open')">${esc(s.texte)}</div>` : ''}${souvSocial(s)}
        ${ph.length ? `<div class="cv-grid">${ph.slice(0,9).map((p,i)=>`<button class="cv-th" onclick="CV.view('${ja(s.id)}',${i})" aria-label="Photo"><img data-ph="${esc(p)}.t" alt="">${i===8 && more>0 ? `<span>+${more}</span>` : ''}</button>`).join('')}</div>` : ''}
        ${byline(s)}
      </div>`;
    }).join('');
    document.getElementById('cv-body').innerHTML = h;
    hydrate();
  }
  function souvDaySel(s){
    const ds = dayList(); if(!ds.length) return '';
    const has = ds.includes(s.date);
    return `<div class="v-f"><label>📅 Étape du voyage (jour par jour)</label>
      <select class="v-in" onchange="if(this.value){const f=document.querySelector('#v-form [name=date]'); if(f) f.value=this.value;}">
        <option value="">${has ? '— autre date —' : '— choisir le jour —'}</option>
        ${ds.map((d,i)=>`<option value="${d}"${d===s.date?' selected':''}>${PJ(i+1)} · ${fdate(d)}${dayInfo(d).titre ? ' · ' + esc(dayInfo(d).titre) : ''}</option>`).join('')}
      </select><div class="v-sum-small" style="margin-top:4px">Le souvenir et ses photos sont classés sous ce jour.</div></div>`;
  }
  function editSouv(id){
    const s = id ? clone(R[id]) : {id:null, type:'souv', trip:M.trip, date:new Date().toISOString().slice(0,10), titre:'', lieu:'', texte:'', photos:[]};
    editing = s;
    openSheet(`<h2>📸 ${id ? esc(s.titre||'Souvenir') : 'Nouveau souvenir'}</h2>${byline(s)}
      <form id="v-form" onsubmit="event.preventDefault();CV.saveSouv()">
        ${souvDaySel(s)}
        ${field('Titre','titre',s.titre,'text','placeholder="Ex. Coucher de soleil sur le Golden Gate"')}
        <div class="v-f2">${field('Date','date',s.date,'date')}${field('Lieu','lieu',s.lieu,'text','data-place autocomplete="off" placeholder="Ville, endroit"')}</div>
        <div class="v-f"><label>Récit</label><textarea class="v-in" name="texte" style="min-height:120px">${esc(s.texte)}</textarea></div>
        <div class="v-f"><label>Photos (${(s.photos||[]).length})</label>
          <div class="cv-grid" id="sv-grid">${(s.photos||[]).map((p,i)=>`<div class="cv-th"><img data-ph="${esc(p)}.t" alt=""><button type="button" class="cv-thx" onclick="CV.souvDelPhoto(${i})" aria-label="Retirer">✕</button></div>`).join('')}</div>
          <div class="cv-row cv-phrow"><label class="v-btn cv-addph">📸 Prendre une photo<input type="file" accept="image/*" capture="environment" onchange="CV.souvAddPhotos(this)"></label><label class="v-btn sec cv-addph">🖼️ Mes photos<input type="file" accept="image/*" multiple onchange="CV.souvAddPhotos(this)"></label></div>
          <div class="v-sum-small" id="sv-prog"></div></div>
        ${feedCode(s.trip) ? `<label class="cv-checkline" style="margin:4px 0 10px"><input type="checkbox" name="priv"${s.priv ? ' checked' : ''}> 🔒 Privé : ne pas montrer à mes abonnés</label>` : ''}
        ${actions(id ? `CV.delSouv('${ja(id)}')` : '')}
      </form>`);
    hydrate();
  }
  function readSouv(){
    const s = editing, fd = new FormData(document.getElementById('v-form'));
    for(const [k,v] of fd.entries()) s[k] = String(v).trim();
    { const pv = document.querySelector('#v-form [name=priv]'); if(pv) s.priv = pv.checked; }
    return s;
  }
  async function souvAddPhotos(input){
    const files = [...(input.files||[])]; if(!files.length) return;
    const s = readSouv(), prog = document.getElementById('sv-prog');
    s.photos = s.photos || [];
    const isNew = !s.id, dateWas = s.date; let firstDate = '';
    for(let i=0;i<files.length;i++){
      if(prog) prog.textContent = `Préparation ${i+1}/${files.length}…`;
      try { const ex = await exifOf(files[i]).catch(()=>({})), pid = 'ph' + uid() + i; await storePhoto(files[i], pid); s.photos.push(pid); photoGeoInto(s, ex, pid); if(!ex.guess && !firstDate) firstDate = ex.date; }
      catch(e){ if(prog) prog.textContent = 'Une photo n’a pas pu être lue (format non pris en charge ?)'; }
    }
    persist();
    if(prog) prog.textContent = '';
    { const f = document.getElementById('v-form');
      if(f && isNew && firstDate && f.date && (!f.date.value || f.date.value === new Date().toISOString().slice(0,10))){ f.date.value = firstDate; s.date = firstDate; }
      if(f && s.lat != null && f.lieu && !f.lieu.value.trim()){ revGeo(s.lat, s.lng).then(g=>{ if(!g || !g.city) return; if(f.lieu && !f.lieu.value.trim()) f.lieu.value = [g.city, g.pays].filter(Boolean).join(', '); if(f.titre && !f.titre.value.trim()) f.titre.value = g.city; s.pays = g.pays; s.cc = g.cc; }); } }
    document.getElementById('sv-grid').innerHTML = s.photos.map((p,i)=>`<div class="cv-th"><img data-ph="${esc(p)}.t" alt=""><button type="button" class="cv-thx" onclick="CV.souvDelPhoto(${i})" aria-label="Retirer">✕</button></div>`).join('');
    input.value = '';
    hydrate();
  }
  function souvDelPhoto(i){
    const s = readSouv(); s.photos.splice(i,1);
    document.getElementById('sv-grid').innerHTML = s.photos.map((p,j)=>`<div class="cv-th"><img data-ph="${esc(p)}.t" alt=""><button type="button" class="cv-thx" onclick="CV.souvDelPhoto(${j})" aria-label="Retirer">✕</button></div>`).join('');
    hydrate();
  }
  function saveSouv(){
    const s = readSouv();
    if(!s.titre && !s.texte && !(s.photos||[]).length){ alert('Ajoute au moins un titre, un récit ou une photo.'); return; }
    if(!s.id) s.id = 'sv' + uid();
    const svNew = !R[s.id]; put(s, '📸 Souvenir enregistré'); if(feedCode(s.trip)) setTimeout(feedAll, 400); closeSheet(); render(); uploadQueue(); if(svNew) setTimeout(()=>fxPlay('souvenir', 'Souvenir gardé !'), 250);
  }
  async function delSouv(id){ if(!(await uiConfirm('Supprimer ce souvenir ?'))) return; const tid = R[id] && R[id].trip; drop(id); try { if(tid && feedCode(tid)) feedBuild(tid); } catch(e){} closeSheet(); render(); }   // retiré aussi tout de suite de la publication abonnés (carte postale comprise)

  // Visionneuse plein écran
  let vw = null;
  async function view(sid, i){
    const s = R[sid]; if(!s || !(s.photos||[]).length) return;
    if(psFrom(sid, i)) return;   // 👆 souvenirs et voyages suivis : toutes les photos du voyage, une par une
    vw = {ph:s.photos, i, sid};
    let el = document.getElementById('cv-viewer');
    if(!el){
      el = document.createElement('div'); el.id = 'cv-viewer';
      el.innerHTML = `<img id="cv-vimg" alt=""><button class="vx" onclick="CV.viewClose()" aria-label="Fermer">✕</button><button class="vp" onclick="CV.viewGo(-1)" aria-label="Précédent">‹</button><button class="vn" onclick="CV.viewGo(1)" aria-label="Suivant">›</button><div class="vc" id="cv-vc"></div>`;
      let x0 = null;
      el.addEventListener('touchstart', e=>{ x0 = e.touches[0].clientX; }, {passive:true});
      el.addEventListener('touchend', e=>{ if(x0===null) return; const dx = e.changedTouches[0].clientX - x0; if(Math.abs(dx) > 50) viewGo(dx < 0 ? 1 : -1); x0 = null; });
      document.body.appendChild(el);
    }
    el.style.display = 'flex'; document.body.style.overflow = 'hidden';
    viewShow();
  }
  async function viewShow(){
    const img = document.getElementById('cv-vimg'), id = vw.ph[vw.i];
    const vc = document.getElementById('cv-vc'), cnt = `${vw.i+1} / ${vw.ph.length}`;
    vc.textContent = cnt + (urls[id] ? '' : ' ⏳');
    img.src = urls[id] || urls[id+'.t'] || '';       // la vignette s'affiche tout de suite, la grande photo la remplace
    if(!urls[id]){
      let u = await photoURL(id); if(!u){ await new Promise(r => setTimeout(r, 1500)); if(vw && vw.ph[vw.i]===id) u = await photoURL(id); }
      if(u && vw && vw.ph[vw.i]===id) img.src = u;
    }
    if(vw && vw.ph[vw.i]===id){ vc.textContent = cnt;
      [1, -1].forEach(d => { const n = vw.ph[(vw.i + d + vw.ph.length) % vw.ph.length]; if(n && n !== id) photoURL(n); }); }   // les voisines se chargent d'avance
  }
  function viewGo(d){ if(!vw) return; vw.i = (vw.i + d + vw.ph.length) % vw.ph.length; viewShow(); }
  function viewClose(){ const el = document.getElementById('cv-viewer'); if(el) el.style.display = 'none'; document.body.style.overflow = ''; vw = null; }

  /* 👆 PHOTOS UNE PAR UNE (comme Tinder) : toutes les photos du voyage, une grande carte à la fois.
     Glisser à gauche = la suivante, à droite = la précédente ; toucher à droite / à gauche fait pareil ;
     gros boutons ◀ ▶ en bas (pensé aussi pour les grands-parents). Sert au voyageur ET aux abonnés. */
  let PS = null;
  // toutes les photos du voyage dans l'ordre du mur (jour par jour) — ou d'un voyage suivi (abonné), dans l'ordre des étapes
  function psList(sid){
    const s = R[sid]; if(!s) return null;
    if(s.type === 'feed'){
      const posts = list('feed', f=>f.trip === s.trip && !f.deleted).sort((a, b)=>(a.date || '').localeCompare(b.date || '') || (a.createdAt || 0) - (b.createdAt || 0));
      return posts.flatMap(f=>(f.photos || []).map((p, i)=>({p, sid:f.id, i, d:f.date || '', lieu:f.lieu || '', t:f.titre || '', by:f.by || ''})));
    }
    if(s.type === 'souv' && s.trip === M.trip && typeof wallFlat === 'function') return wallFlat(!!document.getElementById('cv-wall'));
    return null;
  }
  function psFrom(sid, i){ const L = psList(sid); if(!L || !L.length) return false; const k = L.findIndex(x=>x.sid === sid && x.i === i); psOpen(L, Math.max(0, k)); return true; }
  function psFeed(ftid){ const f = list('feed', x=>x.trip === ftid && !x.deleted && (x.photos || []).length)[0]; if(f) psFrom(f.id, 0); }
  function psOpen(L, i){
    PS = {L, i, end:false}; let ov = document.getElementById('cv-ps');
    if(!ov){ ov = document.createElement('div'); ov.id = 'cv-ps'; document.body.appendChild(ov); }
    document.body.style.overflow = 'hidden';
    ov.innerHTML = `<div class="ps-top"><button type="button" class="ps-x" onclick="CV.psClose()" aria-label="${esc(MSGT('Fermer'))}">✕</button><div class="ps-h"><b id="ps-d"></b><small id="ps-n"></small></div></div>
      <div class="ps-bar"><span id="ps-bar"></span></div>
      <div class="ps-stack" id="ps-stack"></div>
      <div class="ps-cap" id="ps-cap"></div>
      <div class="ps-acts"><button type="button" class="ps-b" onclick="CV.psGo(-1)"><i>◀</i><small>${esc(MSGT('Précédente'))}</small></button><button type="button" class="ps-b nx" onclick="CV.psGo(1)"><small>${esc(MSGT('Suivante'))}</small><i>▶</i></button></div>`;
    psShow(0);
  }
  function psCard(){
    const el = document.createElement('div'); el.className = 'ps-card';
    if(PS.end){ el.classList.add('ps-endc'); el.innerHTML = `<div class="ps-end"><div>✨</div><h2>${esc(MSGT('Fin des photos'))}</h2><p>${esc(RF('{0} photo(s)', PS.L.length))}</p>
      <button type="button" class="v-btn" onclick="CV.psGo(0, true)">↺ ${esc(MSGT('Revoir depuis le début'))}</button><button type="button" class="v-btn sec" onclick="CV.psClose()">${esc(MSGT('Fermer'))}</button></div>`; return el; }
    const x = PS.L[PS.i]; el.innerHTML = `<img alt="" decoding="async">`; const img = el.firstChild;
    img.src = urls[x.p] || urls[x.p + '.t'] || '';
    (async()=>{ if(!img.src){ const u = await photoURL(x.p + '.t'); if(u && !urls[x.p] && img.isConnected) img.src = u; }
      const u = await photoURL(x.p); if(u && img.isConnected) img.src = u; })();
    return el;
  }
  function psShow(dir){
    if(!PS) return; const st = document.getElementById('ps-stack'); if(!st) return;
    const old = st.querySelector('.ps-card.top');
    if(old){ old.classList.remove('top'); old.style.transition = 'transform .32s ease, opacity .32s ease'; old.style.transform = `translate(${dir > 0 ? -130 : 130}%, -3%) rotate(${dir > 0 ? -16 : 16}deg)`; old.style.opacity = '0'; setTimeout(()=>old.remove(), 330); }
    const el = psCard(); el.classList.add('top', dir < 0 ? 'in-l' : dir > 0 ? 'in-b' : 'in-0'); st.appendChild(el); requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.remove('in-l', 'in-b', 'in-0')));
    if(!PS.end) psDrag(el);
    const x = PS.L[PS.i], ds = typeof dayList === 'function' && x && (R[x.sid] || {}).trip === M.trip ? dayList() : [], k = x ? ds.indexOf(x.d) : -1;
    document.getElementById('ps-d').textContent = PS.end ? '' : (k >= 0 ? PJ(k + 1) + ' · ' : '') + (x.d ? fdate(x.d) : '');
    document.getElementById('ps-n').textContent = PS.end ? '' : (PS.i + 1) + ' / ' + PS.L.length;
    document.getElementById('ps-bar').style.width = (PS.end ? 100 : (PS.i + 1) / PS.L.length * 100) + '%';
    const cap = document.getElementById('ps-cap');
    cap.innerHTML = PS.end || !x ? '' : `${x.t ? `<b data-notr>${esc(x.t)}</b>` : ''}${x.lieu ? `<span data-notr>📍 ${esc(String(x.lieu).split(',')[0])}</span>` : ''}${x.by ? `<span data-notr>📸 ${esc(x.by)}</span>` : ''}`;
    if(!PS.end) [1, -1, 2].forEach(d=>{ const n = PS.L[PS.i + d]; if(n) photoURL(n.p); });
  }
  let psBusy = false;
  function psGo(d, restart){
    if(!PS || psBusy) return; psBusy = true; setTimeout(()=>{ psBusy = false; }, 260);
    if(restart){ PS.end = false; PS.i = 0; psShow(1); return; }
    if(PS.end){ if(d < 0){ PS.end = false; psShow(-1); } return; }
    if(d > 0 && PS.i >= PS.L.length - 1){ PS.end = true; psShow(1); return; }
    if(d < 0 && PS.i <= 0){ const t = document.querySelector('#ps-stack .ps-card.top'); if(t){ t.classList.add('nudge'); setTimeout(()=>t.classList.remove('nudge'), 300); } return; }
    PS.i += d > 0 ? 1 : -1; psShow(d);
  }
  function psDrag(el){
    let x0 = 0, y0 = 0, dx = 0, on = false, moved = false;
    el.addEventListener('pointerdown', e=>{ on = true; moved = false; x0 = e.clientX; y0 = e.clientY; dx = 0; el.style.transition = 'none'; try { el.setPointerCapture(e.pointerId); } catch(_){} });
    el.addEventListener('pointermove', e=>{ if(!on) return; dx = e.clientX - x0; const dy = e.clientY - y0; if(Math.abs(dx) < 8 && Math.abs(dy) < 8) return; moved = true;
      el.style.transform = `translate(${dx}px,${dy * .15}px) rotate(${dx / 24}deg)`; });
    const end = e => { if(!on) return; on = false; el.style.transition = '';
      if(!moved){ const r = el.getBoundingClientRect(); psGo(e && e.clientX < r.left + r.width * .35 ? -1 : 1); return; }   // toucher : à droite la suivante, à gauche la précédente
      if(Math.abs(dx) > 70){ psGo(dx < 0 ? 1 : -1); if(el.classList.contains('top')) el.style.transform = ''; return; }
      el.style.transform = ''; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', ()=>{ on = false; el.style.transition = ''; el.style.transform = ''; });
  }
  function psClose(){ const ov = document.getElementById('cv-ps'); if(ov) ov.remove(); PS = null; if(!document.getElementById('cv-feed') && !document.getElementById('cv-wall')) document.body.style.overflow = ''; }
  document.addEventListener('keydown', e=>{ if(!PS) return; if(e.key === 'ArrowRight') psGo(1); else if(e.key === 'ArrowLeft') psGo(-1); else if(e.key === 'Escape') psClose(); });

  /* ── Lecteur de ZIP (sauvegarde complète) ── */
  let zipLib = null;
  function loadZip(){
    if(zipLib) return zipLib;
    const srcs = [(window.VZ_B || '') + 'vendor/zip-native.min.js', 'https://cdn.jsdelivr.net/npm/@zip.js/zip.js@2.23.0/dist/zip-native.min.js'];
    zipLib = new Promise((res, rej) => {
      const tryOne = i => {
        if(i >= srcs.length){ zipLib = null; rej(new Error('Impossible de charger le lecteur de ZIP (connexion internet nécessaire).')); return; }
        const sc = document.createElement('script'); sc.src = srcs[i]; if(i > 0){ sc.integrity = 'sha384-/Gsui5/9uiFs7nM9vaRn0nVfC+t4B3CsVTunUoxwxoeIxvQz4jiE7DQV8b8YVLYm'; sc.crossOrigin = 'anonymous'; }   // 🛡️ copie de secours : refusée si elle a été modifiée
        sc.onload = () => { try { window.zip.configure({useWebWorkers:false}); } catch(e){} res(window.zip); };
        sc.onerror = () => { sc.remove(); tryOne(i+1); };
        document.head.appendChild(sc);
      };
      tryOne(0);
    });
    return zipLib;
  }

  /* ══════════ Démarrage ══════════ */
  let setupCont = null;
  function setupSheet(cont){
    setupCont = cont;
    const reg = ((navigator.language || '').split('-')[1] || '').toUpperCase(), guess = REGION_CUR[reg] || 'EUR';
    const langs = window.I18N ? Object.entries(I18N.langs) : [['fr', 'Français']], cur = window.I18N ? I18N.lang : 'fr';
    openSheet(`<h2>👋 Bienvenue sur Vezoria</h2>
      <p class="v-sum-small">Choisis ta langue et ta devise. Tu pourras les changer plus tard dans Plus → ⚙️ Réglages.</p>
      <div class="v-f"><label for="su-l">Langue</label><select class="v-in" id="su-l">${langs.map(([k,l])=>`<option value="${k}"${k===cur?' selected':''}>${l}</option>`).join('')}</select></div>
      <div class="v-f"><label for="su-c">Devise</label><select class="v-in" id="su-c">${Object.keys(CURS).map(c=>`<option value="${c}"${c===guess?' selected':''}>${c} · ${CURS[c]}</option>`).join('')}</select></div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.setupGo()">Commencer</button></div>`, true);
  }
  function setupGo(){
    const l = (document.getElementById('su-l') || {}).value, c = (document.getElementById('su-c') || {}).value || 'EUR';
    M.cur = c; M.setup = 1; persist();
    if(window.I18N && l && l !== I18N.lang){ I18N.set(l); return; }   // recharge l'appli dans la langue choisie
    closeSheet(true); const k = setupCont; setupCont = null; if(k) k();
  }
  async function setCur(c){
    if(!CURS[c]) return; M.cur = c;
    if(demoTrip()) demoCur(c);   // la démo change de devise avec le réglage
    persist(); toast('💱 ' + c);
    const t = trip();   // le voyage ouvert (un vrai) garde sa devise, sauf si on le demande
    if(t && !t.demo && (t.devise || 'EUR') !== c && await uiConfirm(`Passer aussi le voyage « ${t.titre} » en ${c} ?\n\nLes montants déjà saisis ne sont pas convertis : seul le symbole de la devise change.`)){ t.devise = c; put(t, '💱 ' + c); }
    render();
  }
  function init(){
    setTimeout(shareInbox, 600); setTimeout(hashJoin, 1200);
    try { const hq = document.getElementById('cv-hero-qr'); if(hq) hq.innerHTML = qrSVG(APP_URL(), 'q') + '<span>💌 Vezoria</span>'; } catch(e){}
    loadStore();
    if(storeIdb){ storeLoading = true; loadStoreIdb().finally(()=>{ storeLoading = false; init2(); }); return; }
    init2();
    if(STORE_IDB && !storeIdb && Object.keys(R).length) setTimeout(persistNow, 1500);   // carnet existant : transféré dans la base au premier lancement
  }
  // 📲 raccourcis de l’icône (appui long) : « Ajouter une dépense », « Je suis ici », « Nouveau souvenir »
  function shortcutGo(){
    let go = ''; try { go = new URLSearchParams(location.search).get('go') || ''; } catch(e){}
    if(!go) return; try { const u = new URL(location.href); u.searchParams.delete('go'); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch(e){}
    if(!M.me || !prof(M.me) || document.getElementById('v-sheet-bg')) return;
    const t = trips().find(x=>tripPhase(x) === 'live' && !x.deleted) || trip(); if(!t){ toast('🧳 ' + MSGT('Crée d’abord un voyage')); return; }
    if(M.trip !== t.id) go2(t.id);
    if(go === 'depense') tlReceipt(); else if(go === 'ici') hereNow(); else if(go === 'souvenir'){ M.tab = 'souv'; editSouv(null); }
  }
  function go2(id){ try { go(id); } catch(e){} }
  function init2(){
    if(window.VZ_HOST && M.trip === LEGACY) M.trip = R.t2026 && !R.t2026.deleted ? 't2026' : null;
    document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ if(vw) viewClose(); else closeSheet(); } if(vw && e.key==='ArrowRight') viewGo(1); if(vw && e.key==='ArrowLeft') viewGo(-1); });
    document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible' && (M.dirty.length || Date.now() - lastSyncAt > AUTO_SYNC)) syncNow(); });
    window.addEventListener('online', ()=>syncNow());
    // synchro automatique toutes les heures quand l'appli est à l'écran (+ à chaque modification, à l'ouverture et au retour du réseau)
    (function poll(){ setTimeout(()=>{ if(document.visibilityState==='visible' && !sheetOpen()) syncNow(); poll(); }, pollGap); })();
    bootOffline();
    if(webFollowBoot()) return;
    if(installGate()) return;
    applyMode(); applyLock(); countInstall();
    // (rappel de sauvegarde : voir protectNag, lancé avec les « moments » de l’ouverture)
    const boot2 = () => {
      if(!M.me || !prof(M.me)){ if(M.sync.on && profiles().length) whoSheet(); else onboarding(); }
      else setTimeout(resumeLoad, 300);
    };
    if(!M.setup && M.me && prof(M.me)) setupSheet(boot2); else boot2();
    setTimeout(shortcutGo, 1400);
    setTimeout(()=>{ try { if(M.me) onThisDay(); } catch(e){} }, 6000);
    syncNow();
  }

  /* ══════════ 🏙️ Étape (ville) : découvrir les lieux + itinéraire sur plusieurs jours ══════════ */
  const POI_CATS = {
    monu: {lbl:'Monuments', icon:'🏛️'}, relig: {lbl:'Églises & lieux saints', icon:'⛪'}, vue: {lbl:'Points de vue', icon:'🌅'},
    parc: {lbl:'Parcs & jardins', icon:'🌳'}, musee: {lbl:'Musées', icon:'🖼️'}, loisir: {lbl:'Loisirs', icon:'🎡'},
  };
  const stayDays = h => h && h.date ? range(h.date, h.dateFin || h.date) : (h && h.type==='city' && trip() ? dayList() : []);
  const stays = () => items(i=>i.cat==='hotel' && i.date).sort(sortItems);
  function placesOfStay(hid){
    if(R[hid] && R[hid].type==='city') return list('place', p=>p.trip===M.trip && p.stay===hid && !p.sugg);
    const h = R[hid], ds = stayDays(h).slice(0, -1).concat(h && !h.dateFin ? [h.date] : []);
    return list('place', p=>p.trip===M.trip && !p.sugg && (p.stay===hid || (!p.stay && ds.includes(p.date))));
  }
  const poiCat = t => {
    if(/^(museum|gallery)$/.test(t.tourism||'')) return 'musee';
    if(t.tourism==='viewpoint') return 'vue';
    if(/^(theme_park|zoo|aquarium)$/.test(t.tourism||'')) return 'loisir';
    if(/^(park|garden)$/.test(t.leisure||'')) return 'parc';
    if(t.amenity==='place_of_worship' || /^(church|cathedral|basilica|monastery)$/.test(t.historic||t.building||'')) return 'relig';
    return 'monu';
  };
  const poiScore = t => (t.wikidata?5:0) + (t.wikipedia?3:0) + (t.heritage?2:0) + (t.tourism==='attraction'?2:0) + (t.historic?1:0) + (t['name:fr']?1:0);
  let disc = null;
  // Lieux à voir : cache par ville (30 jours), puis l'API /api/seewhat (cache serveur 24 h)
  // en course avec OpenStreetMap (Overpass) interrogé sur 2 serveurs en parallèle.
  const DISC_TTL = 30*864e5;
  const seeCat = c => /Musée|Galerie/i.test(c) ? 'musee' : /Point de vue/i.test(c) ? 'vue' : /Zoo|Aquarium|Parc d|Loisir|attraction/i.test(c) ? 'loisir'
    : /Parc|Jardin|Nature|Plage|Site naturel/i.test(c) ? 'parc' : /Église|Cathédrale|Temple|Sanctuaire|Religi|Monastère/i.test(c) ? 'relig' : 'monu';
  function withTimeout(pr, ms){ return Promise.race([pr, new Promise((_,rej)=>setTimeout(()=>rej(new Error('délai dépassé')), ms))]); }
  async function seeApi(c){
    const r = await fetch(`${/^https?:/.test(location.protocol) ? '' : 'https://vezoria.pages.dev'}/api/seewhat?lat=${c.lat}&lng=${c.lng}&radius=7000`); if(!r.ok) throw new Error('api');
    const j = await r.json(); const pl = (j && j.places) || []; if(!pl.length) throw new Error('vide');
    return pl.map(p=>({nom:p.name, cat:seeCat(p.cat||''), score:(p.wiki?5:0) + (p.site?1:0), lat:p.lat, lng:p.lng, wiki:p.wiki||''}));
  }
  // Wikipédia : lieux qui ont un article, autour d'un point (rapide, sans clé, CORS ouvert)
  const wikiCat = t => /Musée|Museo|Galerie|Pinacoth/i.test(t) ? 'musee' : /Mirador|Belvédère|Point de vue|Tour |Torre/i.test(t) ? 'vue'
    : /Parc |Parque|Jardin|Jardín|Bois |Plage|Lac /i.test(t) ? 'parc' : /Église|Iglesia|Cathédrale|Catedral|Basilique|Basílica|Chapelle|Temple|Mosquée|Synagogue|Monastère|Couvent|Abbaye|Sanctuaire/i.test(t) ? 'relig'
    : /Zoo|Aquarium|Stade|Estadio|Arène|Plaza de toros/i.test(t) ? 'loisir' : 'monu';
  /* 🌐 Wikidata (libre, sans clé) : la célébrité d’un lieu = le nombre de langues où Wikipédia en parle */
  const WD_EP = 'https://query.wikidata.org/sparql?format=json&query=';
  const wdLang = () => { const l = (window.I18N && I18N.lang) || 'fr'; return [...new Set([l, 'fr', 'en'])].join(','); };
  async function wdq(q, ms){
    const r = await withTimeout(fetch(WD_EP + encodeURIComponent(q)), ms || 15000); if(!r.ok) throw new Error('wikidata');
    return (((await r.json()).results || {}).bindings || []);
  }
  const wdPt = b => { const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec((b.co || {}).value || ''); return m ? {lng:+m[1], lat:+m[2]} : null; };
  const wdRows = L => { const seen = new Set(); return L.map(b=>{ const p = wdPt(b), nom = (b.l || {}).value || '', sl = +((b.sl || {}).value || 0), id = ((b.it || {}).value || '').split('/').pop();
      return p && nom && !/^Q\d+$/.test(nom) ? {id, nom, lat:p.lat, lng:p.lng, sl} : null; }).filter(x=>x && !seen.has(x.id) && seen.add(x.id)); };
  // musées, sites archéologiques, monuments, lieux de culte, palais, châteaux, parcs, places, marchés, pyramides… ou tout lieu classé (patrimoine)
  const WD_ART = 'wd:Q3305213 wd:Q860861 wd:Q179700 wd:Q838948 wd:Q93184 wd:Q11060274 wd:Q125191 wd:Q87167 wd:Q134194 wd:Q133067 wd:Q144860 wd:Q184296 wd:Q2342494 wd:Q1278452 wd:Q15727816';   // tableau, sculpture, statue, œuvre, dessin, estampe, photo, manuscrit, fresque, mosaïque, retable, tapisserie, objet de collection, polyptyque, peinture murale
  const WD_KINDS = 'wd:Q570116 wd:Q33506 wd:Q839954 wd:Q4989906 wd:Q24398318 wd:Q16560 wd:Q23413 wd:Q22698 wd:Q174782 wd:Q37654 wd:Q12516 wd:Q2319498 wd:Q1081138 wd:Q44539 wd:Q57821 wd:Q1107656 wd:Q12280 wd:Q35509 wd:Q8502 wd:Q34038 wd:Q40080';
  async function seeWD(c){
    const q = `SELECT DISTINCT ?it ?l ?co ?sl WHERE {
      SERVICE wikibase:around { ?it wdt:P625 ?co. bd:serviceParam wikibase:center "Point(${(+c.lng).toFixed(5)} ${(+c.lat).toFixed(5)})"^^geo:wktLiteral. bd:serviceParam wikibase:radius "20". }
      ?it wikibase:sitelinks ?sl. FILTER(?sl >= 8)
      { ?it wdt:P1435 ?h. } UNION { ?it wdt:P31/wdt:P279* ?k. VALUES ?k { ${WD_KINDS} } }
      FILTER NOT EXISTS { ?it wdt:P195 ?col. }   # 🖼️ pas les œuvres d’un musée (tableaux, statues… classés monuments historiques)
      MINUS { ?it wdt:P31 ?art. VALUES ?art { ${WD_ART} } }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "${wdLang()}". ?it rdfs:label ?l. }
    } ORDER BY DESC(?sl) LIMIT 60`;
    return wdRows(await wdq(q)).map(x=>({nom:x.nom, cat:wikiCat(x.nom + ' '), score:14 + Math.log2(x.sl), lat:x.lat, lng:x.lng, wiki:'', sl:x.sl}));
  }
  /* 🌡️ Climat de n’importe quel point du globe : NASA POWER (domaine public, sans clé) — température max. moyenne et pluie, mois par mois */
  const MO3 = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  async function climOf(p){
    if(!p || p.lat == null) return null;
    const k = (+p.lat).toFixed(1) + ',' + (+p.lng).toFixed(1); M.clim = M.clim || {}; if(M.clim[k]) return M.clim[k];
    const u = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M_MAX,PRECTOTCORR&community=RE&longitude=${(+p.lng).toFixed(3)}&latitude=${(+p.lat).toFixed(3)}&format=JSON`;
    const r = await withTimeout(fetch(u), 12000); if(!r.ok) throw new Error('climat');
    const pp = (((await r.json()).properties || {}).parameter) || {}, T = pp.T2M_MAX || {}, W = pp.PRECTOTCORR || {};
    const t = MO3.map(m=>Math.round(+T[m])), w = MO3.map((m, i)=>Math.round(+W[m] * [31,28,31,30,31,30,31,31,30,31,30,31][i]));
    if(t.some(x=>!isFinite(x) || x < -90)) throw new Error('climat');
    const o = {t, w: w.map(x=>isFinite(x) ? x : 0)}; M.clim[k] = o; const ks = Object.keys(M.clim); if(ks.length > 60) delete M.clim[ks[0]]; persist(); return o;
  }
  // meilleurs mois : ni trop froid ni trop chaud (18 à 31 °C l’après-midi), pas la saison des pluies ; sinon les 4 mois les plus agréables
  function bestOf(c){
    if(!c) return []; const sc = c.t.map((t, i)=>Math.abs(t - 26) + Math.max(0, (c.w[i] - 90) / 25));
    const ok = c.t.map((t, i)=>i).filter(i=>c.t[i] >= 18 && c.t[i] <= 31 && c.w[i] < 150);
    return (ok.length ? ok : sc.map((v, i)=>[v, i]).sort((a, b)=>a[0] - b[0]).slice(0, 4).map(x=>x[1])).map(i=>i + 1).sort((a, b)=>a - b);
  }
  // la saison pour un pays : données de l’appli si la destination est connue, sinon NASA POWER sur sa ville principale
  async function ctrySeason(cc, city){
    const D = DESTS.find(d=>d[2] === cc && (!city || normQ(d[0]).includes(normQ(city)) || (d[9] || []).some(e=>normQ(e[0]) === normQ(city)))) || DESTS.find(d=>d[2] === cc);
    if(D) return {t:D[12], best:D[6], src:'app'};
    let p = city ? await geocode(city, frCountry(cc)).catch(()=>null) : null;
    if(!p){ const cd = await ctryData(cc).catch(()=>null); p = cd && cd.cities[0]; }
    const c = await climOf(p).catch(()=>null); return c ? {t:c.t, w:c.w, best:bestOf(c), src:'nasa'} : null;
  }
  function seasonLine(se, mo){
    if(!se) return ''; let MS; try { const f = new Intl.DateTimeFormat((window.I18N && I18N.lang) || 'fr', {month:'short'}); MS = [...Array(12)].map((_, i)=>f.format(new Date(2026, i, 15))); } catch(e){ MS = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.']; }
    const good = !mo || se.best.includes(mo), t = mo ? se.t[mo - 1] : null;
    return `<div class="wz-sea${good ? '' : ' bad'}" data-notr>🌡️ ${mo ? `${MS[mo - 1]} ≈ ${t} °C · ` : ''}${MSGT('Meilleure période')} : ${se.best.map(m=>MS[m - 1]).join(', ')}${good ? '' : ' · ⚠️ ' + MSGT(t >= 33 ? 'très chaud à cette période' : t <= 5 ? 'très froid à cette période' : 'hors saison idéale (pluie ou fraîcheur)')}${se.src === 'nasa' ? ' <small>(NASA POWER)</small>' : ''}</div>`;
  }
  // un pays : ses villes les plus connues et ses sites du patrimoine mondial (UNESCO), gardés 30 jours
  async function ctryData(cc){
    cc = String(cc || '').toUpperCase(); if(!/^[A-Z]{2}$/.test(cc)) return null;
    M.ctryD = M.ctryD || {}; const hit = M.ctryD[cc]; if(hit && Date.now() - hit.t < DISC_TTL && (hit.cities.length || hit.sites.length)) return hit;
    const L = wdLang(), K = `?k wdt:P297 "${cc}".`;
    const qc = `SELECT DISTINCT ?it ?l ?co ?sl WHERE { ${K} ?it wdt:P17 ?k; wdt:P31/wdt:P279? ?t; wdt:P625 ?co; wikibase:sitelinks ?sl. VALUES ?t { wd:Q515 wd:Q3957 wd:Q1549591 wd:Q5119 wd:Q200250 wd:Q1637706 }
      FILTER(?sl >= 25) SERVICE wikibase:label { bd:serviceParam wikibase:language "${L}". ?it rdfs:label ?l. } } ORDER BY DESC(?sl) LIMIT 30`;
    const qs = `SELECT DISTINCT ?it ?l ?co ?sl WHERE { ?it wdt:P1435 wd:Q9259; wdt:P17 ?k; wdt:P625 ?co; wikibase:sitelinks ?sl. ${K}
      SERVICE wikibase:label { bd:serviceParam wikibase:language "${L}". ?it rdfs:label ?l. } } ORDER BY DESC(?sl) LIMIT 25`;
    const [a, b] = await Promise.allSettled([wdq(qc, 20000), wdq(qs, 20000)]);
    const o = {t:Date.now(), cities: a.status === 'fulfilled' ? wdRows(a.value) : [], sites: b.status === 'fulfilled' ? wdRows(b.value) : []};
    if(o.cities.length || o.sites.length){ M.ctryD[cc] = o; const ks = Object.keys(M.ctryD); if(ks.length > 20) delete M.ctryD[ks[0]]; persist(); }
    return o;
  }
  // un itinéraire pour un pays : celui des destinations de l’appli s’il existe, sinon ses villes les plus connues (une ville tous les 3 nuits environ)
  async function ctryItin(cc, nightsTot){
    const DS = DESTS.filter(d=>d[2] === cc), D = DS.find(d=>normQ(d[0]) === normQ(frCountry(cc))) || DS.sort((a, b)=>b[9].length - a[9].length)[0], n = Math.max(1, nightsTot || 7);
    let base = D ? D[9].map(e=>[e[0], e[1]]) : null, far = [];
    const cd = await ctryData(cc).catch(()=>null);
    if(!base){
      const L = (cd && cd.cities) || []; if(!L.length) return null;
      const k = Math.max(1, Math.min(5, Math.round(n / 3))), pick = [];
      for(const c of L){ if(pick.length >= k) break; if(pick.some(p=>km(p, c) < 60)) continue; pick.push(c); }
      const ord = [pick.shift()]; while(pick.length){ const last = ord[ord.length - 1]; pick.sort((x, y)=>km(last, x) - km(last, y)); ord.push(pick.shift()); }
      base = ord.map(c=>[c.nom, 1]);
    }
    // nuits : on garde les proportions de l’itinéraire type, ramenées au nombre de nuits du voyage
    while(base.length > n) base.pop();
    const tot = base.reduce((s, e)=>s + e[1], 0); let out = base.map(e=>[e[0], Math.max(1, Math.round(e[1] * n / tot))]);
    let d = n - out.reduce((s, e)=>s + e[1], 0), i = 0;
    while(d !== 0 && i < 200){ const j = i % out.length; if(d > 0){ out[j][1]++; d--; } else if(out[j][1] > 1){ out[j][1]--; d++; } i++; }
    if(cd && cd.sites.length){ const pts = await Promise.all(out.map(e=>geocode(e[0], frCountry(cc)).catch(()=>null)));
      far = cd.sites.filter(s=>pts.every(p=>!p || km(p, s) > 330)).slice(0, 4).map(s=>s.nom); }
    return {cc, stops:out, far, src: D ? 'app' : 'wikidata'};
  }
  async function seeWiki(c){
    const u = `https://fr.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${c.lat}%7C${c.lng}&gsradius=10000&gslimit=150&format=json&origin=*`;
    const r = await fetch(u); if(!r.ok) throw new Error('wiki');
    const g = ((await r.json()).query || {}).geosearch || []; if(!g.length) throw new Error('vide');
    return g.filter(x=>!/^(Liste |Gare |Station |Métro|Ligne |Arrondissement|Quartier|District|Barrio|Rue |Avenue |Calle |Ambassade|Consulat|Hôpital|École|Lycée|Collège|Université|Ministère|Siège|Bataille)/i.test(x.title) && !/\(métro|\(station|\(gare/i.test(x.title))
      .map(x=>({nom: x.title.replace(/ \([^)]*\)$/,''), cat: wikiCat(x.title + ' '), score: 4.5 - Math.min(x.dist, 10000)/4000, lat: x.lat, lng: x.lon, wiki: 'fr:' + x.title}));
  }
  async function seeOverpass(c){
    const a = `(around:4500,${c.lat},${c.lng})`;
    const q = `[out:json][timeout:15];(
      nw["tourism"~"^(attraction|museum|viewpoint|gallery|zoo|theme_park|aquarium)$"]["name"]${a};
      nw["historic"~"^(monument|castle|ruins|archaeological_site|memorial|fort|city_gate|palace|church|cathedral|tower|monastery)$"]["name"]${a};
      nw["amenity"="place_of_worship"]["wikidata"]${a};
      nw["leisure"~"^(park|garden)$"]["wikidata"]${a};
    );out center tags 250;`;
    const one = ep => fetch(ep, {method:'POST', body:'data=' + encodeURIComponent(q), headers:{'Content-Type':'application/x-www-form-urlencoded'}})
      .then(r=>{ if(!r.ok) throw new Error('osm'); return r.json(); });
    const j = await Promise.any(['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'].map(one));
    return (j.elements||[]).map(e=>{ const t = e.tags || {};
      return {nom: t['name:fr'] || t.name, cat: poiCat(t), score: poiScore(t), lat: e.lat ?? (e.center||{}).lat, lng: e.lon ?? (e.center||{}).lon, wiki: t.wikipedia || ''}; });
  }
  async function discover(hid){
    const h = R[hid]; if(!h) return;
    const city = stayCity(h), key = normQ(city);
    disc = {hid, city, list:[], f: M.poiF || {musee:false}, q:''};
    M.poiCache = M.poiCache || {};
    const hit = M.poiCache[key];
    if(hit && Date.now() - hit.t < DISC_TTL && hit.list.length && (hit.wd || Date.now() - hit.t < 864e5)){ disc.list = hit.list; discRender(); return; }
    openSheet(`<h2>🔎 À voir à ${esc(city)}</h2><div class="cv-route-load" id="ds-msg">📡 Je cherche les lieux autour de ${esc(city)}…<br><small>La première recherche d’une ville prend quelques secondes, les suivantes sont immédiates.</small></div>`);
    try {
      const c = await withTimeout(geocode(city, null), 10000).catch(()=>null);
      if(!c) throw new Error('Ville introuvable : vérifie le nom de l’étape (fiche hôtel).');
      // 3 sources en parallèle : Wikipédia (très rapide), le serveur (cache 24 h), OpenStreetMap.
      // On affiche dès la première réponse, puis on complète quand les autres arrivent.
      let got = [], ok = 0;
      const finalize = arr => { const seen = new Set();
        return arr.filter(p=>p.nom && p.lat != null && !/^\d+$/.test(p.nom))
          .sort((x,y)=>y.score-x.score)
          .filter(p=>{ const k = normQ(p.nom); if(seen.has(k)) return false; seen.add(k); return true; })
          .slice(0, 150); };
      await new Promise(done => {
        let left = 4;
        [seeWiki(c), seeApi(c), seeOverpass(c), seeWD(c)].forEach(pr => withTimeout(pr, 22000).then(list => {
          if(!list || !list.length) return;
          got = got.concat(list); ok++;
          if(!disc || disc.hid !== hid) return;
          disc.list = finalize(got);
          M.poiCache[key] = {t: Date.now(), list: disc.list, wd: got.some(p=>p.sl)}; const ks = Object.keys(M.poiCache); if(ks.length > 30) delete M.poiCache[ks[0]]; persist();
          discRender(); done();
        }).catch(()=>{}).finally(()=>{ if(--left === 0) done(); }));
      });
      if(!ok) throw new Error('Aucun service de lieux ne répond pour l’instant (Wikipédia, OpenStreetMap). Vérifie ta connexion et réessaie dans un instant.');
    } catch(e){ const m = document.getElementById('ds-msg'); if(m) m.textContent = '⚠️ ' + e.message; }
  }
  function discRender(){
    const shY = (document.querySelector('#v-sheet-bg .v-sheet') || {}).scrollTop || 0, keepY = disc && disc.keepY != null ? disc.keepY : (disc && disc.rendered ? shY : 0); if(disc){ disc.keepY = null; disc.rendered = 1; }
    const d = disc; if(!d) return;
    const mine = new Set(placesOfStay(d.hid).map(p=>normQ(p.nom)));
    const shown = d.list.filter(p => d.f[p.cat] !== false && (!d.q || normQ(p.nom).includes(normQ(d.q))));
    openSheet(`<h2>🔎 À voir à ${esc(d.city)}</h2>
      <div class="v-sum-small" style="margin-bottom:8px">${d.list.length} lieux trouvés (Wikipédia, OpenStreetMap), les plus connus en premier. Touche une photo ou un nom pour voir le lieu, ＋ pour l’ajouter à l’étape.</div>
      <div class="v-filters" style="flex-wrap:wrap">${Object.entries(POI_CATS).map(([k,c])=>`<button class="v-chip${d.f[k]!==false?' on':''}" onclick="CV.discF('${ja(k)}')">${c.icon} ${c.lbl}</button>`).join('')}</div>
      <input class="v-in" id="ds-q" placeholder="Rechercher un lieu…" value="${esc(d.q)}" oninput="CV.discQ(this.value)">
      <div id="ds-list" style="margin-top:8px">${shown.map(p=>{ const i = d.list.indexOf(p), has = mine.has(normQ(p.nom));
        return `<div class="cv-poi"><button type="button" class="cv-pth" onclick="CV.discInfo(${i})">${p.wiki ? `<img data-wk="${esc(p.wiki)}" alt="">` : ''}<span class="ic">${POI_CATS[p.cat].icon}</span></button><span class="x" onclick="CV.discInfo(${i})"><b>${esc(p.nom)}</b>${p.score>=5?' <span class="star">★</span>':''}<small>${POI_CATS[p.cat].lbl}</small></span>
          <a href="https://www.google.com/maps/search/?api=1&query=${p.lat.toFixed(6)},${p.lng.toFixed(6)}" target="_blank" rel="noopener">📍</a>
          <button class="cv-x${has?' ok':''}" onclick="CV.discAdd(${i})">${has?'✓':'＋'}</button></div>`; }).join('') || '<div class="v-empty">Aucun lieu avec ces filtres.</div>'}</div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.planCity('${ja(d.hid)}')">🏙️ Organiser l’étape</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
    const q = document.getElementById('ds-q'); if(q && d.q){ q.focus(); q.setSelectionRange(d.q.length, d.q.length); }
    { const sh = document.querySelector('#v-sheet-bg .v-sheet'); if(sh && keepY) sh.scrollTop = keepY; }
    setTimeout(discThumbs, 30);
  }
  function discF(k){ disc.f[k] = disc.f[k]===false; M.poiF = disc.f; persist(); discRender(); }
  let discT = null;
  function discQ(v){ disc.q = v; clearTimeout(discT); discT = setTimeout(discRender, 350); }
  function discAdd(i){
    const p = disc.list[i]; if(!p) return;
    const ex = placesOfStay(disc.hid).find(x=>normQ(x.nom)===normQ(p.nom));
    if(ex){ drop(ex.id, '↩️ Retiré'); }
    else put({id:'pl'+uid(), type:'place', trip:M.trip, stay:disc.hid, date:(R[disc.hid] && R[disc.hid].type==='city' && R[disc.hid].date) || '', nom:p.nom, adresse:'', lat:p.lat, lng:p.lng, cat:p.cat, lock:false}, '📍 ' + p.nom);
    const sc = document.querySelector('#v-sheet-bg .v-sheet'), y = sc ? sc.scrollTop : 0;
    discRender();
    const sc2 = document.querySelector('#v-sheet-bg .v-sheet'); if(sc2) sc2.scrollTop = y;
  }

  /* ── Organiser l’étape : jours, verrous, optimisation ── */
  let cityH = null;
  function planCity(hid){
    const h = R[hid]; if(!h) return;
    cityH = hid;
    const t = trip(), ds = stayDays(h), pl = placesOfStay(hid);
    const sel = new Set(h.planJours && h.planJours.length ? h.planJours : (ds.length > 1 ? ds.slice(0,-1) : ds));
    const byDay = d => pl.filter(p=>p.date===d).sort((a,b)=>(a.ordre||0)-(b.ordre||0));
    const unplaced = pl.filter(p=>!p.date || !ds.includes(p.date));
    const row = p => `<div class="cv-place"><span class="x">${POI_CATS[p.cat] ? POI_CATS[p.cat].icon + ' ' : ''}${esc(p.nom)}</span>
        <select class="v-in cv-daysel" onchange="CV.cityMove('${ja(p.id)}', this.value)"><option value="">à placer</option>${ds.map(d=>`<option value="${d}"${p.date===d?' selected':''}>${fdate(d)}</option>`).join('')}</select>
        <button class="cv-x cv-lk${p.lock?' on':''}" title="Verrouiller ce jour" onclick="CV.cityLock('${ja(p.id)}')">${p.lock?'🔒':'🔓'}</button>
        <button class="cv-x" onclick="CV.cityDel('${ja(p.id)}')" aria-label="Retirer">✕</button></div>`;
    openSheet(`<h2>🏙️ ${esc(stayCity(h))}</h2>
      <div class="v-sum-small" style="margin-bottom:10px">${h.date ? fdate(h.date) + ' → ' + fdate(h.dateFin||h.date) + ' · ' : ''}${pl.length} lieu(x). Place les lieux toi-même ou laisse l’optimisation répartir. 🔒 = ce lieu reste sur ce jour.</div>
      <button class="v-btn sec" onclick="CV.discover('${ja(hid)}')">🔎 Découvrir les lieux à visiter</button>
      ${unplaced.length ? `<div class="cv-cday"><b>À placer</b>${unplaced.map(row).join('')}</div>` : ''}
      ${ds.map(d=>`<div class="cv-cday"><b>${fdate(d)}${dayInfo(d).titre ? ' · ' + esc(dayInfo(d).titre) : ''}</b>${byDay(d).map(row).join('') || '<div class="v-sum-small">—</div>'}</div>`).join('')}
      <div class="cv-paybox" style="margin-top:12px"><div class="cv-paybox-h">⚡ Optimisation</div>
        <label class="cv-checkline"><input type="checkbox" id="cy-spread" ${h.planEtaler===false?'':'checked'}> Répartir les lieux sur les jours (sinon : chaque lieu garde son jour, seul l’ordre change)</label>
        <div class="v-f"><label>Jours à remplir</label><div class="cv-qsel" id="cy-days">${ds.map(d=>`<button type="button" class="${sel.has(d)?'on':''}" data-p="${d}" style="--pc:var(--navy)" onclick="this.classList.toggle('on')">${fdate(d)}</button>`).join('')}</div></div>
        <div class="v-f2"><div class="v-f"><label>Chaque jour, je pars de</label><select class="v-in" id="cy-dep" onchange="document.getElementById('cy-dept').style.display=this.value==='libre'?'':'none'">
            <option value="hotel"${h.planDep!=='libre'?' selected':''}>🏨 L’hôtel</option><option value="libre"${h.planDep==='libre'?' selected':''}>📍 Une autre adresse</option></select>
            <input class="v-in" id="cy-dept" style="margin-top:6px;${h.planDep==='libre'?'':'display:none'}" value="${esc(h.planDepTxt||'')}" placeholder="Adresse ou lien Google Maps"></div>
          <div class="v-f"><label>Et je finis</label><select class="v-in" id="cy-arr" onchange="document.getElementById('cy-arrt').style.display=this.value==='libre'?'':'none'">
            <option value="boucle"${!h.planArr||h.planArr==='boucle'?' selected':''}>↩️ Retour à l’hôtel</option><option value="fin"${h.planArr==='fin'?' selected':''}>🏁 Au dernier lieu visité</option><option value="libre"${h.planArr==='libre'?' selected':''}>📍 À une autre adresse</option></select>
            <input class="v-in" id="cy-arrt" style="margin-top:6px;${h.planArr==='libre'?'':'display:none'}" value="${esc(h.planArrTxt||'')}" placeholder="Adresse ou lien Google Maps"></div></div>
        <label class="cv-checkline"><input type="checkbox" id="cy-tr" ${h.planTr===false?'':'checked'}> Jour d’arrivée ou de départ : partir de la gare / l’aéroport, ou y finir</label>
        <div class="v-f2"><div class="v-f"><label>À pied par trajet (km)</label><input class="v-in" id="cy-walk" inputmode="decimal" value="${esc(t.marche||2.5)}"></div>
          <div class="v-f"><label>À pied par jour (km)</label><input class="v-in" id="cy-day" inputmode="decimal" value="${esc(t.marcheJour||25)}"></div></div>
        <button class="v-btn" id="cy-go" onclick="CV.cityOpt()">⚡ Optimiser l’étape</button>
        <div id="cy-res">${cityResHTML(hid)}</div>
      </div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  function cityMove(id, d){ const p = R[id]; if(!p) return; p.date = d; if(!d) p.lock = false; p.stay = p.stay || cityH; put(p, false); render(); planCity(cityH); }
  function cityLock(id){ const p = R[id]; if(!p) return; if(!p.date){ alert('Choisis d’abord un jour pour ce lieu.'); return; } p.lock = !p.lock; put(p, p.lock ? '🔒 Gardé le ' + fdate(p.date) : '🔓 Libre'); planCity(cityH); }
  function cityDel(id){ drop(id, false); render(); planCity(cityH); }
  function cityResHTML(hid){
    const h = R[hid]; if(!h || !h.planRes) return '';
    return `<div class="cv-cres">${h.planRes.map(r=>`<div class="cv-cres-d"><b>${fdate(r.d)}</b> · ${r.n} lieu(x) · ${fmtKm(r.km)} dont ${fmtKm(r.walk)} à pied · ~${fmtMin(r.min)}
      ${r.tips.length ? `<ul>${r.tips.map(x=>`<li>${x}</li>`).join('')}</ul>` : '<div class="v-sum-small">✓ Journée équilibrée.</div>'}</div>`).join('')}
      <div class="v-sum-small">Le détail de chaque journée (ordre, trajets, Google Maps) est dans 📅 Jour par jour → 🗺️ Itinéraire.</div></div>`;
  }
  function kmeansDays(P, k, lockIdx){
    // P : points {lat,lng,lk} · lk = index du jour verrouillé ou -1
    const C = Array.from({length:k}, (_, j) => { const L = P.filter(p=>p.lk===j); return L.length ? {lat:L.reduce((s,p)=>s+p.lat,0)/L.length, lng:L.reduce((s,p)=>s+p.lng,0)/L.length} : null; });
    const free = P.filter(p=>p.lk<0);
    for(let j=0;j<k;j++) if(!C[j]){
      const have = C.filter(Boolean); let best = null, bd = -1;
      (free.length ? free : P).forEach(p=>{ const d = have.length ? Math.min(...have.map(c=>km(c,p))) : km(P[0], p); if(d > bd){ bd = d; best = p; } });
      C[j] = best ? {lat:best.lat, lng:best.lng} : {lat:P[0].lat, lng:P[0].lng};
    }
    const asg = P.map(p=>p.lk>=0 ? p.lk : 0);
    for(let it=0; it<20; it++){
      P.forEach((p,i)=>{ if(p.lk<0){ let b = 0, bd = Infinity; C.forEach((c,j)=>{ const d = km(c,p); if(d < bd){ bd = d; b = j; } }); asg[i] = b; } });
      C.forEach((c,j)=>{ const m = P.filter((p,i)=>asg[i]===j); if(m.length){ c.lat = m.reduce((s,p)=>s+p.lat,0)/m.length; c.lng = m.reduce((s,p)=>s+p.lng,0)/m.length; } });
    }
    const cap = Math.ceil(P.length / k) + 1;
    for(let guard=0; guard<200; guard++){
      const cnt = C.map((_,j)=>asg.filter(a=>a===j).length), over = cnt.findIndex(n=>n>cap);
      if(over < 0) break;
      let mv = -1, md = -1; P.forEach((p,i)=>{ if(asg[i]===over && p.lk<0){ const d = km(C[over], p); if(d > md){ md = d; mv = i; } } });
      if(mv < 0) break;
      let to = -1, td = Infinity; C.forEach((c,j)=>{ if(j!==over && cnt[j] < cap){ const d = km(c, P[mv]); if(d < td){ td = d; to = j; } } });
      if(to < 0) break; asg[mv] = to;
    }
    return asg;
  }
  async function cityOpt(){
    const hid = cityH, h = R[hid]; if(!h) return;
    const days = peopleVal('cy-days'), spread = document.getElementById('cy-spread').checked;
    const walk = num(val('cy-walk')) || 2.5, walkDay = num(val('cy-day')) || 25;
    if(!days.length){ alert('Choisis au moins un jour.'); return; }
    const t = trip(); t.marche = walk; t.marcheJour = walkDay; put(t, false);
    const depM = val('cy-dep') || 'hotel', depT = val('cy-dept'), arrM = val('cy-arr') || 'boucle', arrT = val('cy-arrt'), useTr = !!(document.getElementById('cy-tr') || {}).checked;
    if(depM === 'libre' && !depT){ alert('Indique l’adresse de départ.'); return; }
    if(arrM === 'libre' && !arrT){ alert('Indique l’adresse d’arrivée.'); return; }
    Object.assign(h, {planJours:days, planEtaler:spread, planDep:depM, planDepTxt:depT, planArr:arrM, planArrTxt:arrT, planTr:useTr}); put(h, false);
    const res = document.getElementById('cy-res'), btn = document.getElementById('cy-go');
    const say = m => { if(res) res.innerHTML = `<div class="cv-route-load">${m}</div>`; };
    btn.disabled = true;
    try {
      const city = stayCity(h);
      say('📡 Je localise l’hôtel…');
      const home = await geocode(hotelQ(h), null) || await geocode(city, null);
      if(!home) throw new Error('Hôtel introuvable : ajoute son adresse dans la fiche.');
      const hLbl = (h.nom ? h.nom + ' · ' : 'Hôtel · ') + city;
      let dep0 = {pt:home, lbl:hLbl, k:'item:' + hid}, arr0 = arrM === 'fin' ? null : {pt:home, lbl:hLbl, k:'item:' + hid};
      if(depM === 'libre'){ say('📡 Je localise le point de départ…'); const g = await geocode(depT, city); if(!g) throw new Error('Point de départ introuvable : précise l’adresse.'); dep0 = {pt:g, lbl:depT, k:'libre', txt:depT}; }
      if(arrM === 'libre'){ say('📡 Je localise l’arrivée…'); const g = await geocode(arrT, city); if(!g) throw new Error('Arrivée introuvable : précise l’adresse.'); arr0 = {pt:g, lbl:arrT, k:'libre', txt:arrT}; }
      // jour d’arrivée / de départ : gare ou aéroport
      const trAt = {};
      const sd = stayDays(h), isCity = x => { const a = normQ(cityOf(String(x||'').replace(/\(.*?\)/g,''))), b = normQ(city); return !!a && !!b && (a.includes(b) || b.includes(a)); };
      if(useTr) for(const d of days){ const ts = items(i=>i.cat==='transport' && i.date===d);
        let tin = ts.find(t=>t.to && isCity(t.to)), tout = ts.find(t=>t.from && isCity(t.from) && t !== tin);
        if(!tin && !tout && ts.length === 1){ if(d === sd[0]) tin = ts[0].to ? ts[0] : null; else tout = ts[0].from ? ts[0] : null; }
        if(tin){ say('📡 Je localise ' + esc(tin.to) + '…'); const g = await geocode(tin.to, null); if(g) (trAt[d] = trAt[d] || {}).dep = {pt:g, lbl:tin.to, k:'to:' + tin.id}; }
        if(tout){ say('📡 Je localise ' + esc(tout.from) + '…'); const g = await geocode(tout.from, null); if(g) (trAt[d] = trAt[d] || {}).arr = {pt:g, lbl:tout.from, k:'from:' + tout.id}; } }
      const pl = placesOfStay(hid), pts = {}, miss = [];
      for(let i=0;i<pl.length;i++){
        const p = pl[i];
        if(p.lat != null && p.lng != null){ pts[p.id] = {lat:+p.lat, lng:+p.lng}; continue; }
        say(`📡 Je localise ${i+1}/${pl.length} : ${esc(p.nom)}…`);
        const c = await geocode(p.adresse || p.nom, city); if(c) pts[p.id] = c; else miss.push(p);
      }
      const ok = pl.filter(p=>pts[p.id]);
      let asg;
      if(spread){
        const P = ok.map(p=>Object.assign({lk: p.lock && days.includes(p.date) ? days.indexOf(p.date) : -1}, pts[p.id]));
        asg = ok.length ? kmeansDays(P, days.length) : [];
      } else {
        const cnt = days.map(()=>0);
        asg = ok.map(p=>{ let j = days.indexOf(p.date); if(j < 0){ j = cnt.indexOf(Math.min(...cnt)); } cnt[j]++; return j; });
      }
      const out = [], resume = [];
      days.forEach((d, j)=>{
        const mine = ok.filter((p,i)=>asg[i]===j);
        const A = (trAt[d] || {}).dep || dep0, B = (trAt[d] || {}).arr || arr0, start = A.pt, end = B ? B.pt : null;
        const order = bestOrder(start, end, mine.map(p=>pts[p.id]));
        const ids = order.map(i=>mine[i].id);
        ids.forEach((id, k)=>{ const p = R[id]; if(p.date!==d || p.ordre!==k || p.stay!==hid){ p.date = d; p.ordre = k; p.stay = hid; out.push(p); } });
        // trajets, marche, conseils
        const stops = [start, ...ids.map(id=>pts[id]), ...(end ? [end] : [])];
        const legs = []; for(let i=1;i<stops.length;i++) legs.push({i:i-1, dk:km(stops[i-1], stops[i])});
        const tr = [];
        let walkKm = legs.reduce((s,l)=>s+(l.dk<=walk?l.dk:0),0);
        const tips = [];
        if(walkKm > walkDay){
          const cand = legs.filter(l=>l.dk<=walk).sort((a,b)=>b.dk-a.dk), names = [];
          for(const l of cand){ if(walkKm <= walkDay) break; tr.push(l.i); walkKm -= l.dk;
            const a = l.i===0 ? A.lbl : R[ids[l.i-1]].nom, b = l.i>=ids.length ? (B ? B.lbl : '') : R[ids[l.i]].nom; names.push(`${esc(a)} → ${esc(b)} (${fmtKm(l.dk)})`); }
          tips.push(`🚇 Plus de ${fmtKm(walkDay)} à pied : prends le métro, le bus ou le tram pour ${names.join(', ')}.`);
        }
        const longLeg = legs.filter(l=>l.dk>12);
        if(longLeg.length) tips.push(`🚆 ${longLeg.length} trajet(s) de plus de 12 km : train ou VTC conseillé.`);
        const visit = ids.reduce((s,id)=>s+(R[id].cat==='musee'?120:R[id].cat==='loisir'?240:60),0);
        const move = legs.reduce((s,l)=>s+legAdvice(l.dk, walk, tr.includes(l.i)).min,0);
        if(visit + move > 11*60){
          const far = ids.filter(id=>!R[id].lock).sort((a,b)=>km(home,pts[b])-km(home,pts[a]))[0];
          tips.push(`⏱️ Journée chargée (~${fmtMin(visit+move)} avec les visites)${far ? ` : déplace « ${esc(R[far].nom)} » sur un jour plus léger` : ''}.`);
        }
        if(!ids.length) tips.push('🌿 Journée libre (ou jour de trajet).');
        const tot = legs.reduce((s,l)=>s+l.dk,0);
        resume.push({d, n:ids.length, km:tot, walk:walkKm, min:visit+move, tips});
        const info = Object.assign(clone(R[dayId(d)] || {}), {id:dayId(d), type:'day', trip:M.trip, date:d}); delete info.deleted;
        if(!info.titre) info.titre = city;
        // l’itinéraire du jour reprend ce choix (et on peut le changer jour par jour)
        info.dep = A.k; info.depTxt = A.txt || ''; const loop = !!B && B.k === A.k && B.pt === A.pt;
        info.arr = !B ? 'fin' : loop ? 'boucle' : B.k; info.arrTxt = B && B.txt || '';
        const last = ids.length ? ids[ids.length - 1] : null, endP = B ? B.pt : last ? pts[last] : start;
        info.route = {start:Object.assign({}, start, {lbl:A.lbl}), end:Object.assign({}, endP, {lbl: B ? B.lbl : last ? R[last].nom : A.lbl}), loop, fin:!B, ids, pts:Object.fromEntries(ids.map(id=>[id, pts[id]])), miss:[], walk, tr};
        out.push(info);
      });
      h.planRes = resume; out.push(h);
      putMany(out, '⚡ Étape optimisée');
      render(); planCity(hid);
      const r2 = document.getElementById('cy-res'); if(r2) r2.scrollIntoView({block:'start', behavior:'smooth'});
      if(miss.length) alert('Introuvable(s) : ' + miss.map(p=>p.nom).join(', ') + '. Ajoute une adresse précise ou un lien Google Maps.');
    } catch(e){ say(''); alert(e.message); }
    const b2 = document.getElementById('cy-go'); if(b2) b2.disabled = false;
  }

  /* ══════════ 🖨️ Carnet de route à imprimer (PDF) ══════════ */
  const PR_SECTIONS = [['prog','Programme jour par jour'], ['hotel','Hébergements'], ['transport','Trajets'], ['activite','Visites & réservations'],
    ['notes','Notes'], ['budget','Budget par personne'], ['check','Checklist à cocher']];
  function pdfSheet(){
    const t = trip(); if(!t){ alert('Ouvre d’abord un voyage.'); return; }
    const v = tv();
    openSheet(`<h2>🖨️ Carnet de route</h2>
      <div class="v-sum-small" style="margin-bottom:10px">Une version papier de « ${esc(t.titre)} » à emporter. Sur iPhone, l’aperçu s’ouvre : touche <b>Imprimer</b>, ou partage-le en PDF (pince l’aperçu pour l’agrandir, puis Partager → Enregistrer dans Fichiers).</div>
      <div class="v-f"><label>Ce qu’on met dedans</label>${PR_SECTIONS.map(([k,l])=>`<label class="cv-checkline"><input type="checkbox" id="pr-${k}" checked> ${l}</label>`).join('')}</div>
      ${v.length > 1 ? `<div class="v-f"><label>Carnet de</label><select class="v-in" id="pr-who"><option value="all">Tout le monde</option>${v.map(p=>`<option value="${p}">${esc(pname(p))} (seulement ses trajets et sa part)</option>`).join('')}</select></div>` : ''}
      <label class="cv-checkline"><input type="checkbox" id="pr-maps" checked> Cartes (voyage + itinéraires du jour, fond de carte)</label>
      <label class="cv-checkline"><input type="checkbox" id="pr-lines" checked> Lignes vides pour écrire chaque jour</label>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.pdfRoute()">📄 Créer le PDF</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  // Tracé de l'itinéraire d'un jour (SVG, sans service extérieur) : départ, visites numérotées, arrivée
  function routeSVG(r){
    if(!r || !r.pts) return '';
    const ids = (r.ids||[]).filter(id=>r.pts[id] && r.pts[id].lat != null);
    if(!ids.length) return '';
    const ok = p => p && p.lat != null && p.lng != null;
    const seq = [];
    if(ok(r.start)) seq.push({p:r.start, k:'D'});
    ids.forEach((id,i)=>seq.push({p:r.pts[id], k:String(i+1)}));
    const fin = r.loop ? r.start : r.end; if(ok(fin)) seq.push({p:fin, k: r.loop ? '' : 'A'});
    const lat0 = seq.reduce((s,x)=>s + +x.p.lat, 0) / seq.length, kx = Math.cos(lat0*Math.PI/180);
    const X = seq.map(x=>+x.p.lng*kx), Y = seq.map(x=>-x.p.lat);
    const W = 600, H = 260, pad = 28;
    const minX = Math.min(...X), maxX = Math.max(...X), minY = Math.min(...Y), maxY = Math.max(...Y);
    const sc = Math.min((W-2*pad)/Math.max(maxX-minX, 1e-4), (H-2*pad)/Math.max(maxY-minY, 1e-4));
    const ox = (W - (maxX-minX)*sc)/2, oy = (H - (maxY-minY)*sc)/2;
    const P = i => [(X[i]-minX)*sc + ox, (Y[i]-minY)*sc + oy].map(v=>Math.round(v*10)/10);
    const pts = seq.map((_,i)=>P(i));
    let dist = 0; for(let i=1;i<seq.length;i++) dist += km(seq[i-1].p, seq[i].p);
    // échelle : longueur « ronde » proche de 1/5 de la largeur
    const pxKm = sc / 111.32, target = W/5/pxKm, nice = [0.1,0.2,0.5,1,2,5,10,20,50,100,200,500].find(v=>v >= target*0.6) || 500, bar = nice*pxKm;
    let g = `<rect width="${W}" height="${H}" rx="10" fill="#faf7f2"/>`;
    for(let x=0;x<=W;x+=50) g += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#eee6dc" stroke-width="1"/>`;
    for(let y=0;y<=H;y+=50) g += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#eee6dc" stroke-width="1"/>`;
    g += `<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#7C3AED" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="${r.loop ? '0' : '0'}"/>`;
    seq.forEach((x,i)=>{
      if(!x.k) return;
      const [a,b] = pts[i], end = x.k==='D' || x.k==='A';
      g += end ? `<rect x="${a-11}" y="${b-11}" width="22" height="22" rx="5" fill="#2A1238"/><text x="${a}" y="${b+4.5}" font-size="12" font-weight="700" fill="#fff" text-anchor="middle" font-family="sans-serif">${x.k==='D' && r.loop ? '🏨' : x.k}</text>`
        : `<circle cx="${a}" cy="${b}" r="11" fill="#fff" stroke="#7C3AED" stroke-width="2.5"/><text x="${a}" y="${b+4.5}" font-size="12" font-weight="700" fill="#4C1D95" text-anchor="middle" font-family="sans-serif">${x.k}</text>`;
    });
    g += `<line x1="${W-pad-bar}" y1="${H-14}" x2="${W-pad}" y2="${H-14}" stroke="#2A1238" stroke-width="2"/><text x="${W-pad-bar/2}" y="${H-19}" font-size="11" fill="#2A1238" text-anchor="middle" font-family="sans-serif">${nice < 1 ? nice*1000 + ' m' : nice + ' km'}</text>`;
    const st = r.start && r.start.lbl ? esc(r.start.lbl) : 'départ', en = r.loop ? 'retour au départ' : (r.end && r.end.lbl ? esc(r.end.lbl) : 'arrivée');
    return `<figure class="pr-map"><svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Carte de l’itinéraire">${g}</svg>
      <figcaption>🗺️ Itinéraire : <b>D</b> ${st} → ${ids.length} visite${ids.length>1?'s':''} → ${r.loop ? '🏨 ' + en : '<b>A</b> ' + en} · ≈ ${dist < 10 ? dist.toFixed(1) : Math.round(dist)} km à vol d’oiseau</figcaption></figure>`;
  }
  const longDate = iso => { if(!iso) return ''; const p = iso.split('-'); const s = new Date(+p[0], +p[1]-1, +p[2]).toLocaleDateString((window.I18N ? I18N.locale : 'fr-FR'), {weekday:'long', day:'numeric', month:'long'}); return s[0].toUpperCase() + s.slice(1); };
  function pdfMake(){
    const t = trip(); if(!t) return;
    const on = k => { const e = document.getElementById('pr-'+k); return e ? e.checked : false; };
    const whoSel = (document.getElementById('pr-who') || {}).value || 'all';
    const lines = on('lines');
    const keepWho = M.who; M.who = whoSel;
    const its = items(forWho);
    const st = it => it.statut==='paid' ? '☑ payé' : it.statut==='booked' ? '☑ réservé' : '☐ à réserver';
    const det = it => [it.cat==='transport' && (it.from||it.to) ? [it.from, it.to].filter(Boolean).join(' → ') : '', it.compagnie, it.nom && it.cat==='hotel' ? it.nom : '',
      it.adresse, it.tel ? '☎ ' + it.tel : '', it.ref ? 'Réf. ' + it.ref : ''].filter(Boolean).map(esc).join(' · ');
    const who = it => subset(it) ? ' <i>(' + parts(it).map(pname).map(esc).join(', ') + ')</i>' : '';
    const ttl = whoSel==='all' ? tv().map(pname).map(esc).join(' & ') : esc(pname(whoSel));
    let d = `<header class="pr-cover"><div class="pr-kicker">Carnet de route</div><h1>${esc(t.titre)}</h1>
      <p class="pr-dates">${tripDatesLong(t)}</p>${t.sous ? `<p class="pr-route">${esc(t.sous)}</p>` : ''}<p class="pr-who">${ttl}</p></header>`;
    d += tripMapCached();
    if(on('prog')){
      d += `<h2 class="pr-h">Programme jour par jour</h2>`;
      dayList().forEach((day, i)=>{
        const info = dayInfo(day), {own, night} = itemsForDay(day);
        const pl = placesOf(day), dn = notesFor('day:'+day);
        const notesIt = [...own, ...night].flatMap(it=>notesFor('item:'+it.id).map(n=>`<b>${esc(it.titre)}</b> : ${esc(n.texte)}`));
        d += `<section class="pr-day"><h3><span>${PJ(i+1)}</span>${longDate(day)}${info.titre ? ' — ' + esc(info.titre) : ''}</h3>
          ${info.plan ? `<p class="pr-plan">${esc(info.plan)}</p>` : ''}
          ${own.length || night.length ? `<table class="pr-t">${own.map(it=>`<tr><td class="ic">${icon(it)}</td><td class="tm">${esc(it.heureDep || it.heure || '')}${it.heureArr ? '<br>→ ' + esc(it.heureArr) : ''}</td><td><b>${esc(it.titre)}</b>${who(it)}<br><small>${det(it)}</small></td><td class="stt">${st(it)}</td></tr>`).join('')}
            ${night.map(it=>`<tr><td class="ic">🏨</td><td class="tm">${it.date===day && it.heure ? esc(it.heure) : 'nuit'}</td><td><b>${esc(it.nom || it.titre)}</b>${who(it)}<br><small>${det(it)}</small></td><td class="stt">${st(it)}</td></tr>`).join('')}</table>` : ''}
          ${pl.length ? `<p class="pr-pl"><b>À voir :</b> ${pl.map((p,k)=>`${k+1}. ${esc(p.nom)}`).join(' · ')}</p>` : ''}
          ${info.route ? routeSVG(info.route) : ''}
          ${dn.length || notesIt.length ? `<div class="pr-notes">${dn.map(n=>'📌 ' + esc(n.texte)).concat(notesIt.map(x=>'📌 ' + x)).join('<br>')}</div>` : ''}
          ${lines ? '<div class="pr-lines"><i></i><i></i><i></i></div>' : ''}
        </section>`;
      });
    }
    const table = (cat, head, row) => { const l = its.filter(i=>i.cat===cat).sort(sortItems); return l.length ? `<table class="pr-tab"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${l.map(row).join('')}</tbody></table>` : '<p class="pr-empty">—</p>'; };
    if(on('hotel')) d += `<h2 class="pr-h pr-break">Hébergements</h2>` + table('hotel', ['Ville','Dates','Hôtel','Adresse & tél.','Réf.','État'],
      it=>`<tr><td><b>${esc(it.titre)}</b></td><td>${fshort(it.date)}${it.dateFin ? ' → ' + fshort(it.dateFin) : ''}<br><small>${nights(it.date, it.dateFin) ? nights(it.date, it.dateFin) + ' nuit(s)' : ''}${it.heure ? ' · arrivée ' + esc(it.heure) : ''}</small></td><td>${esc(it.nom||'')}</td><td>${esc(it.adresse||'')}${it.tel ? '<br>☎ ' + esc(it.tel) : ''}</td><td>${esc(it.ref||'')}</td><td>${st(it)}</td></tr>`);
    if(on('transport')) d += `<h2 class="pr-h">Trajets</h2>` + table('transport', ['Date','Horaires','Trajet','Compagnie','Réf.','État'],
      it=>`<tr><td>${it.date ? fdate(it.date) : ''}</td><td>${esc(it.heureDep||'')}${it.heureArr ? ' → ' + esc(it.heureArr) : ''}</td><td>${icon(it)} <b>${esc(it.titre)}</b>${who(it)}${it.from||it.to ? `<br><small>${esc([it.from, it.to].filter(Boolean).join(' → '))}</small>` : ''}</td><td>${esc(it.compagnie||'')}</td><td>${esc(it.ref||'')}</td><td>${st(it)}</td></tr>`);
    if(on('activite')) d += `<h2 class="pr-h">Visites & réservations</h2>` + table('activite', ['Date','Heure','Visite','Lieu','Réf.','État'],
      it=>`<tr><td>${it.date ? fdate(it.date) : ''}</td><td>${esc(it.heure||'')}</td><td><b>${esc(it.titre)}</b>${who(it)}</td><td>${esc(it.adresse||'')}</td><td>${esc(it.ref||'')}</td><td>${st(it)}</td></tr>`);
    if(on('notes')){
      const ns = list('note', n=>n.trip===M.trip).sort(noteSort);
      if(ns.length) d += `<h2 class="pr-h">Notes</h2><div class="pr-nl">${ns.map(n=>`<p><b>${n.pin ? '📌 ' : ''}${refLabel(n.ref)}</b><br>${esc(n.texte).replace(/\n/g,'<br>')}</p>`).join('')}</div>`;
    }
    if(on('budget')){
      const all = items(), v = whoSel==='all' ? tv() : [whoSel];
      d += `<h2 class="pr-h">Budget</h2><table class="pr-tab"><thead><tr><th>Voyageur</th><th>Sa part</th><th>Déjà réglé</th><th>Reste</th></tr></thead><tbody>${v.map(pid=>{
        const pr = all.reduce((s,i)=>s+shareOf(i,pid),0), pa = all.reduce((s,i)=>s+shareOfPaid(i,pid),0);
        return `<tr><td><b>${esc(pname(pid))}</b></td><td>${eur(pr)}</td><td>${eur(pa)}</td><td>${eur(pr-pa)}</td></tr>`; }).join('')}</tbody></table>
        <p class="pr-small">Montants réels quand ils sont saisis, sinon estimations. ${whoSel==='all' ? 'Total du voyage : ' + eur(all.reduce((s,i)=>s+totalOf(i),0)) + '.' : ''}</p>`;
    }
    if(on('check')){
      const cl = list('check', c=>c.trip===M.trip).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
      const cats = [...new Set(cl.map(c=>c.cat))];
      if(cl.length) d += `<h2 class="pr-h">Checklist</h2><div class="pr-check">${cats.map(c=>`<div><h4>${esc(c)}</h4>${cl.filter(x=>x.cat===c).map(x=>`<p>${x.done ? '☑' : '☐'} ${esc(x.label)}</p>`).join('')}</div>`).join('')}</div>`;
    }
    d += `<footer class="pr-foot">Imprimé le ${new Date().toLocaleDateString((window.I18N ? I18N.locale : 'fr-FR'), {day:'numeric', month:'long', year:'numeric'})} · Vezoria</footer>`;
    M.who = keepWho;
    let ov = document.getElementById('cv-print');
    if(!ov){ ov = document.createElement('div'); ov.id = 'cv-print'; document.body.appendChild(ov); }
    ov.innerHTML = `<div class="pr-bar"><button onclick="window.print()">🖨️ Imprimer / PDF</button><button class="x" onclick="CV.pdfClose()">✕ Fermer</button></div><div class="pr-doc">${d}</div>`;
    ov.style.display = 'block'; document.body.classList.add('printing');
    closeSheet(true);
    setTimeout(()=>{ try { window.print(); } catch(e){} }, 500);
  }
  function pdfClose(){ const ov = document.getElementById('cv-print'); if(ov){ ov.style.display = 'none'; ov.innerHTML = ''; } document.body.classList.remove('printing'); }

  /* ══════════ 👤 Téléphone personnel : profil fixe, accès caché pour le dev ══════════ */
  function mySheet(){
    if(!prof(M.me)){ whoSheet(); return; }
    openSheet(`<h2>👤 Mon profil</h2>
      <div style="margin-bottom:12px">${pchip(M.me)}</div>
      <div class="v-sum-small" style="margin-bottom:12px">Ce téléphone est le tien : tout ce que tu ajoutes est signé ${esc(pname(M.me))}.</div>
      <button class="v-btn sec" onclick="CV.editProfile('${ja(M.me)}')">🎨 Changer mon nom / ma couleur</button>
      <button class="v-btn sec" style="margin-top:10px" onclick="CV.cloudSheet()">☁️ Cloud Vezoria</button>
      <div class="v-sum-small" style="margin-top:10px">Synchro : ${!M.sync.on ? 'désactivée' : M.sync.err ? '🔴 ' + esc(M.sync.err) : (M.dirty.length || (M.pq||[]).length) ? '🟠 envoi en cours' : '🟢 à jour'}${M.sync.on ? ' · automatique toutes les heures' : ''}</div>`);
  }
  let tapN = 0, tapT = 0;
  function secretTap(e){
    if(e.target.closest('button, a, input, select')) return;
    const now = Date.now(); if(now - tapT > 2500) tapN = 0;
    tapT = now; tapN++;
    if(tapN >= 5){ tapN = 0; toast('🛠️ Accès développeur'); setTimeout(()=>whoSheet(), 200); }
  }

  /* ══════════ 🔐 Fonctionnement & confidentialité (version publique) ══════════ */
  const TUTO = (window.VZ_B || '') + 'tuto.mp4';
  const tutoBtn = (cls) => `<button type="button" class="v-btn ${cls||'sec'}" onclick="CV.tutoSheet()">🎬 Voir le tuto vidéo du carnet (3 min)</button><button type="button" class="v-btn sec" onclick="CV.close();CV.navTo('livret')">📖 Le livret : tout ce que fait Vezoria</button>`;
  function tutoSheet(){
    openSheet(`<h2>🎬 Tuto vidéo</h2>
      <div class="v-sum-small" style="margin-bottom:10px">Les 4 espaces sur les voyages de démo : 🧳 Préparation (programme, résas, budget, envies, checklist, outils), 📍 En cours (journée, dépenses, souvenirs), 🗺️ Passés (album, carte, stats) et 🏁 Bilan (à vérifier, qui doit quoi, remboursements, justificatifs).</div>
      <div class="cv-tuto"><video src="${TUTO}" controls playsinline preload="metadata"></video></div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  function escaleTuto(){
    openSheet(`<h2>🎓 Escale en mode premium</h2>
      <div class="cv-tuto" style="margin-bottom:8px"><video src="escale-tuto.mp4" controls playsinline preload="metadata"></video></div>
      <div class="v-sum-small" style="margin-bottom:10px">🎬 La vidéo (3 min) montre tout le parcours sur un voyage fictif Paris → Tokyo : menu, passage en premium, dates, calendrier de prix, prix live, hôtels, voiture, activités, puis la saisie dans le carnet. Le détail écrit est juste en dessous.</div>
      <div class="cv-info">
      <p>Escale cherche les vols les moins chers. En <b>mode soft</b> (par défaut), les prix viennent d’un cache gratuit : ce sont des <b>prix indicatifs</b>. Le <b>mode premium</b> interroge les sources en direct.</p>
      ${new Date() <= new Date('2026-12-31T23:59:59') ? '<p class="cv-warn">🎁 <b>Jusqu’au 31 décembre 2026, le premium est offert à tous</b> : rien à faire, tout est déjà débloqué. À partir du 1er janvier, il faudra la phrase d’accès ci-dessous.</p>' : ''}
      <h3>1. Passer en premium</h3>
      <p>Ouvre Escale, puis touche le bouton <b>« ◐ Mode SOFT · appuyer pour PREMIUM »</b> sous le titre (ou menu <b>☰ → Réglages → Changer de mode</b>). Saisis la phrase d’accès : l’appli se recharge et affiche <b>« ● Mode PREMIUM »</b>.</p>
      <p>La <b>phrase d’accès</b> au premium t’est donnée par la personne qui t’a invité sur l’appli. Elle ne se trouve pas dans le carnet.</p>
      <h3>2. Ce que le premium débloque</h3>
      <p>⚡ <b>Prix réel pour tes dates</b> : le bouton ⚡ sur une destination, ou « ⚡ Prix live » dans son calendrier.<br>
      🏨 <b>Hôtels</b> avec photos, notes et prix (Booking).<br>
      🚗 <b>Voiture de location</b> à l’arrivée.<br>
      🎟️ <b>Activités</b> à réserver sur place.<br>
      🛫 <b>Départs voisins</b> : dans le calendrier d’un mois, le prix depuis les aéroports proches de chez toi.</p>
      <h3>3. Trouver le bon vol</h3>
      <p>Choisis ton aéroport de départ et tes dates (ou « N’importe où »). Touche une destination : le <b>calendrier couleur</b> montre chaque jour, du moins cher (vert) au plus cher (rouge). Un jour vert entouré = vol direct. Puis touche <b>⚡</b> pour le prix réel du jour choisi.</p>
      <h3>4. Revenir au carnet</h3>
      <p>Réserve chez la compagnie, puis dans le carnet : <b>Résas → Trajets</b>, ouvre le vol et remplis la compagnie, les horaires, le prix et le lien de réservation. Le budget et « qui doit quoi » se mettent à jour tout seuls.</p>
      <p class="cv-warn">💡 Le premium utilise des services payants à quota : garde-le pour tes vraies dates, et repasse en soft pour flâner.</p>
      </div>
      <div class="v-actions">${ESCALE ? `<a class="v-btn" href="${ESCALE}" style="text-align:center;text-decoration:none">✈️ Ouvrir Escale</a>` : ''}<button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  /* ══════════ 📤 Partager l'appli à un ami (lien + QR code, généré sur le téléphone) ══════════ */
  /* QRCode for JavaScript — Copyright (c) 2009 Kazuhiko Arase — MIT license (http://www.opensource.org/licenses/mit-license.php).
     « QR Code » est une marque déposée de DENSO WAVE INCORPORATED. Regroupé pour le Vezoria. */
  var CVQR=(function(){var M={};function require(n){return M[n.replace('./','')];}
  M['QRMode']=(function(){var module={exports:{}};var exports=module.exports;
  module.exports = {
      MODE_NUMBER :       1 << 0,
      MODE_ALPHA_NUM :    1 << 1,
      MODE_8BIT_BYTE :    1 << 2,
      MODE_KANJI :        1 << 3
  };
  
  return module.exports;})();
  M['QRMath']=(function(){var module={exports:{}};var exports=module.exports;
  var QRMath = {
  
  	glog : function(n) {
  	
  		if (n < 1) {
  			throw new Error("glog(" + n + ")");
  		}
  		
  		return QRMath.LOG_TABLE[n];
  	},
  	
  	gexp : function(n) {
  	
  		while (n < 0) {
  			n += 255;
  		}
  	
  		while (n >= 256) {
  			n -= 255;
  		}
  	
  		return QRMath.EXP_TABLE[n];
  	},
  	
  	EXP_TABLE : new Array(256),
  	
  	LOG_TABLE : new Array(256)
  
  };
  	
  for (var i = 0; i < 8; i++) {
  	QRMath.EXP_TABLE[i] = 1 << i;
  }
  for (var i = 8; i < 256; i++) {
  	QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4]
  		^ QRMath.EXP_TABLE[i - 5]
  		^ QRMath.EXP_TABLE[i - 6]
  		^ QRMath.EXP_TABLE[i - 8];
  }
  for (var i = 0; i < 255; i++) {
  	QRMath.LOG_TABLE[QRMath.EXP_TABLE[i] ] = i;
  }
  
  module.exports = QRMath;
  
  return module.exports;})();
  M['QRMaskPattern']=(function(){var module={exports:{}};var exports=module.exports;
  module.exports = {
  	PATTERN000 : 0,
  	PATTERN001 : 1,
  	PATTERN010 : 2,
  	PATTERN011 : 3,
  	PATTERN100 : 4,
  	PATTERN101 : 5,
  	PATTERN110 : 6,
  	PATTERN111 : 7
  };
  
  return module.exports;})();
  M['QRErrorCorrectLevel']=(function(){var module={exports:{}};var exports=module.exports;
  module.exports = {
  	L : 1,
  	M : 0,
  	Q : 3,
  	H : 2
  };
  
  
  return module.exports;})();
  M['QRPolynomial']=(function(){var module={exports:{}};var exports=module.exports;
  var QRMath = require('./QRMath');
  
  function QRPolynomial(num, shift) {
  	if (num.length === undefined) {
  		throw new Error(num.length + "/" + shift);
  	}
  
  	var offset = 0;
  
  	while (offset < num.length && num[offset] === 0) {
  		offset++;
  	}
  
  	this.num = new Array(num.length - offset + shift);
  	for (var i = 0; i < num.length - offset; i++) {
  		this.num[i] = num[i + offset];
  	}
  }
  
  QRPolynomial.prototype = {
  
  	get : function(index) {
  		return this.num[index];
  	},
  	
  	getLength : function() {
  		return this.num.length;
  	},
  	
  	multiply : function(e) {
  	
  		var num = new Array(this.getLength() + e.getLength() - 1);
  	
  		for (var i = 0; i < this.getLength(); i++) {
  			for (var j = 0; j < e.getLength(); j++) {
  				num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i) ) + QRMath.glog(e.get(j) ) );
  			}
  		}
  	
  		return new QRPolynomial(num, 0);
  	},
  	
  	mod : function(e) {
  	
  		if (this.getLength() - e.getLength() < 0) {
  			return this;
  		}
  	
  		var ratio = QRMath.glog(this.get(0) ) - QRMath.glog(e.get(0) );
  	
  		var num = new Array(this.getLength() );
  		
  		for (var i = 0; i < this.getLength(); i++) {
  			num[i] = this.get(i);
  		}
  		
  		for (var x = 0; x < e.getLength(); x++) {
  			num[x] ^= QRMath.gexp(QRMath.glog(e.get(x) ) + ratio);
  		}
  	
  		// recursive call
  		return new QRPolynomial(num, 0).mod(e);
  	}
  };
  
  module.exports = QRPolynomial;
  
  return module.exports;})();
  M['QR8bitByte']=(function(){var module={exports:{}};var exports=module.exports;
  var QRMode = require('./QRMode');
  
  function QR8bitByte(data) {
  	this.mode = QRMode.MODE_8BIT_BYTE;
  	this.data = data;
  }
  
  QR8bitByte.prototype = {
  
  	getLength : function() {
  		return this.data.length;
  	},
  	
  	write : function(buffer) {
  		for (var i = 0; i < this.data.length; i++) {
  			// not JIS ...
  			buffer.put(this.data.charCodeAt(i), 8);
  		}
  	}
  };
  
  module.exports = QR8bitByte;
  
  return module.exports;})();
  M['QRBitBuffer']=(function(){var module={exports:{}};var exports=module.exports;
  function QRBitBuffer() {
  	this.buffer = [];
  	this.length = 0;
  }
  
  QRBitBuffer.prototype = {
  
  	get : function(index) {
  		var bufIndex = Math.floor(index / 8);
  		return ( (this.buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
  	},
  	
  	put : function(num, length) {
  		for (var i = 0; i < length; i++) {
  			this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
  		}
  	},
  	
  	getLengthInBits : function() {
  		return this.length;
  	},
  	
  	putBit : function(bit) {
  	
  		var bufIndex = Math.floor(this.length / 8);
  		if (this.buffer.length <= bufIndex) {
  			this.buffer.push(0);
  		}
  	
  		if (bit) {
  			this.buffer[bufIndex] |= (0x80 >>> (this.length % 8) );
  		}
  	
  		this.length++;
  	}
  };
  
  module.exports = QRBitBuffer;
  
  return module.exports;})();
  M['QRRSBlock']=(function(){var module={exports:{}};var exports=module.exports;
  var QRErrorCorrectLevel = require('./QRErrorCorrectLevel');
  
  function QRRSBlock(totalCount, dataCount) {
  	this.totalCount = totalCount;
  	this.dataCount  = dataCount;
  }
  
  QRRSBlock.RS_BLOCK_TABLE = [
  
  	// L
  	// M
  	// Q
  	// H
  
  	// 1
  	[1, 26, 19],
  	[1, 26, 16],
  	[1, 26, 13],
  	[1, 26, 9],
  	
  	// 2
  	[1, 44, 34],
  	[1, 44, 28],
  	[1, 44, 22],
  	[1, 44, 16],
  
  	// 3
  	[1, 70, 55],
  	[1, 70, 44],
  	[2, 35, 17],
  	[2, 35, 13],
  
  	// 4		
  	[1, 100, 80],
  	[2, 50, 32],
  	[2, 50, 24],
  	[4, 25, 9],
  	
  	// 5
  	[1, 134, 108],
  	[2, 67, 43],
  	[2, 33, 15, 2, 34, 16],
  	[2, 33, 11, 2, 34, 12],
  	
  	// 6
  	[2, 86, 68],
  	[4, 43, 27],
  	[4, 43, 19],
  	[4, 43, 15],
  	
  	// 7		
  	[2, 98, 78],
  	[4, 49, 31],
  	[2, 32, 14, 4, 33, 15],
  	[4, 39, 13, 1, 40, 14],
  	
  	// 8
  	[2, 121, 97],
  	[2, 60, 38, 2, 61, 39],
  	[4, 40, 18, 2, 41, 19],
  	[4, 40, 14, 2, 41, 15],
  	
  	// 9
  	[2, 146, 116],
  	[3, 58, 36, 2, 59, 37],
  	[4, 36, 16, 4, 37, 17],
  	[4, 36, 12, 4, 37, 13],
  	
  	// 10		
  	[2, 86, 68, 2, 87, 69],
  	[4, 69, 43, 1, 70, 44],
  	[6, 43, 19, 2, 44, 20],
  	[6, 43, 15, 2, 44, 16],
  
  	// 11
  	[4, 101, 81],
  	[1, 80, 50, 4, 81, 51],
  	[4, 50, 22, 4, 51, 23],
  	[3, 36, 12, 8, 37, 13],
  
  	// 12
  	[2, 116, 92, 2, 117, 93],
  	[6, 58, 36, 2, 59, 37],
  	[4, 46, 20, 6, 47, 21],
  	[7, 42, 14, 4, 43, 15],
  
  	// 13
  	[4, 133, 107],
  	[8, 59, 37, 1, 60, 38],
  	[8, 44, 20, 4, 45, 21],
  	[12, 33, 11, 4, 34, 12],
  
  	// 14
  	[3, 145, 115, 1, 146, 116],
  	[4, 64, 40, 5, 65, 41],
  	[11, 36, 16, 5, 37, 17],
  	[11, 36, 12, 5, 37, 13],
  
  	// 15
  	[5, 109, 87, 1, 110, 88],
  	[5, 65, 41, 5, 66, 42],
  	[5, 54, 24, 7, 55, 25],
  	[11, 36, 12],
  
  	// 16
  	[5, 122, 98, 1, 123, 99],
  	[7, 73, 45, 3, 74, 46],
  	[15, 43, 19, 2, 44, 20],
  	[3, 45, 15, 13, 46, 16],
  
  	// 17
  	[1, 135, 107, 5, 136, 108],
  	[10, 74, 46, 1, 75, 47],
  	[1, 50, 22, 15, 51, 23],
  	[2, 42, 14, 17, 43, 15],
  
  	// 18
  	[5, 150, 120, 1, 151, 121],
  	[9, 69, 43, 4, 70, 44],
  	[17, 50, 22, 1, 51, 23],
  	[2, 42, 14, 19, 43, 15],
  
  	// 19
  	[3, 141, 113, 4, 142, 114],
  	[3, 70, 44, 11, 71, 45],
  	[17, 47, 21, 4, 48, 22],
  	[9, 39, 13, 16, 40, 14],
  
  	// 20
  	[3, 135, 107, 5, 136, 108],
  	[3, 67, 41, 13, 68, 42],
  	[15, 54, 24, 5, 55, 25],
  	[15, 43, 15, 10, 44, 16],
  
  	// 21
  	[4, 144, 116, 4, 145, 117],
  	[17, 68, 42],
  	[17, 50, 22, 6, 51, 23],
  	[19, 46, 16, 6, 47, 17],
  
  	// 22
  	[2, 139, 111, 7, 140, 112],
  	[17, 74, 46],
  	[7, 54, 24, 16, 55, 25],
  	[34, 37, 13],
  
  	// 23
  	[4, 151, 121, 5, 152, 122],
  	[4, 75, 47, 14, 76, 48],
  	[11, 54, 24, 14, 55, 25],
  	[16, 45, 15, 14, 46, 16],
  
  	// 24
  	[6, 147, 117, 4, 148, 118],
  	[6, 73, 45, 14, 74, 46],
  	[11, 54, 24, 16, 55, 25],
  	[30, 46, 16, 2, 47, 17],
  
  	// 25
  	[8, 132, 106, 4, 133, 107],
  	[8, 75, 47, 13, 76, 48],
  	[7, 54, 24, 22, 55, 25],
  	[22, 45, 15, 13, 46, 16],
  
  	// 26
  	[10, 142, 114, 2, 143, 115],
  	[19, 74, 46, 4, 75, 47],
  	[28, 50, 22, 6, 51, 23],
  	[33, 46, 16, 4, 47, 17],
  
  	// 27
  	[8, 152, 122, 4, 153, 123],
  	[22, 73, 45, 3, 74, 46],
  	[8, 53, 23, 26, 54, 24],
  	[12, 45, 15, 28, 46, 16],
  
  	// 28
  	[3, 147, 117, 10, 148, 118],
  	[3, 73, 45, 23, 74, 46],
  	[4, 54, 24, 31, 55, 25],
  	[11, 45, 15, 31, 46, 16],
  
  	// 29
  	[7, 146, 116, 7, 147, 117],
  	[21, 73, 45, 7, 74, 46],
  	[1, 53, 23, 37, 54, 24],
  	[19, 45, 15, 26, 46, 16],
  
  	// 30
  	[5, 145, 115, 10, 146, 116],
  	[19, 75, 47, 10, 76, 48],
  	[15, 54, 24, 25, 55, 25],
  	[23, 45, 15, 25, 46, 16],
  
  	// 31
  	[13, 145, 115, 3, 146, 116],
  	[2, 74, 46, 29, 75, 47],
  	[42, 54, 24, 1, 55, 25],
  	[23, 45, 15, 28, 46, 16],
  
  	// 32
  	[17, 145, 115],
  	[10, 74, 46, 23, 75, 47],
  	[10, 54, 24, 35, 55, 25],
  	[19, 45, 15, 35, 46, 16],
  
  	// 33
  	[17, 145, 115, 1, 146, 116],
  	[14, 74, 46, 21, 75, 47],
  	[29, 54, 24, 19, 55, 25],
  	[11, 45, 15, 46, 46, 16],
  
  	// 34
  	[13, 145, 115, 6, 146, 116],
  	[14, 74, 46, 23, 75, 47],
  	[44, 54, 24, 7, 55, 25],
  	[59, 46, 16, 1, 47, 17],
  
  	// 35
  	[12, 151, 121, 7, 152, 122],
  	[12, 75, 47, 26, 76, 48],
  	[39, 54, 24, 14, 55, 25],
  	[22, 45, 15, 41, 46, 16],
  
  	// 36
  	[6, 151, 121, 14, 152, 122],
  	[6, 75, 47, 34, 76, 48],
  	[46, 54, 24, 10, 55, 25],
  	[2, 45, 15, 64, 46, 16],
  
  	// 37
  	[17, 152, 122, 4, 153, 123],
  	[29, 74, 46, 14, 75, 47],
  	[49, 54, 24, 10, 55, 25],
  	[24, 45, 15, 46, 46, 16],
  
  	// 38
  	[4, 152, 122, 18, 153, 123],
  	[13, 74, 46, 32, 75, 47],
  	[48, 54, 24, 14, 55, 25],
  	[42, 45, 15, 32, 46, 16],
  
  	// 39
  	[20, 147, 117, 4, 148, 118],
  	[40, 75, 47, 7, 76, 48],
  	[43, 54, 24, 22, 55, 25],
  	[10, 45, 15, 67, 46, 16],
  
  	// 40
  	[19, 148, 118, 6, 149, 119],
  	[18, 75, 47, 31, 76, 48],
  	[34, 54, 24, 34, 55, 25],
  	[20, 45, 15, 61, 46, 16]
  ];
  
  QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
  	
  	var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
  	
  	if (rsBlock === undefined) {
  		throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
  	}
  
  	var length = rsBlock.length / 3;
  	
  	var list = [];
  	
  	for (var i = 0; i < length; i++) {
  
  		var count = rsBlock[i * 3 + 0];
  		var totalCount = rsBlock[i * 3 + 1];
  		var dataCount  = rsBlock[i * 3 + 2];
  
  		for (var j = 0; j < count; j++) {
  			list.push(new QRRSBlock(totalCount, dataCount) );	
  		}
  	}
  	
  	return list;
  };
  
  QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {
  
  	switch(errorCorrectLevel) {
  	case QRErrorCorrectLevel.L :
  		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
  	case QRErrorCorrectLevel.M :
  		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
  	case QRErrorCorrectLevel.Q :
  		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
  	case QRErrorCorrectLevel.H :
  		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
  	default :
  		return undefined;
  	}
  };
  
  module.exports = QRRSBlock;
  
  return module.exports;})();
  M['QRUtil']=(function(){var module={exports:{}};var exports=module.exports;
  var QRMode = require('./QRMode');
  var QRPolynomial = require('./QRPolynomial');
  var QRMath = require('./QRMath');
  var QRMaskPattern = require('./QRMaskPattern');
  
  var QRUtil = {
  
      PATTERN_POSITION_TABLE : [
          [],
          [6, 18],
          [6, 22],
          [6, 26],
          [6, 30],
          [6, 34],
          [6, 22, 38],
          [6, 24, 42],
          [6, 26, 46],
          [6, 28, 50],
          [6, 30, 54],        
          [6, 32, 58],
          [6, 34, 62],
          [6, 26, 46, 66],
          [6, 26, 48, 70],
          [6, 26, 50, 74],
          [6, 30, 54, 78],
          [6, 30, 56, 82],
          [6, 30, 58, 86],
          [6, 34, 62, 90],
          [6, 28, 50, 72, 94],
          [6, 26, 50, 74, 98],
          [6, 30, 54, 78, 102],
          [6, 28, 54, 80, 106],
          [6, 32, 58, 84, 110],
          [6, 30, 58, 86, 114],
          [6, 34, 62, 90, 118],
          [6, 26, 50, 74, 98, 122],
          [6, 30, 54, 78, 102, 126],
          [6, 26, 52, 78, 104, 130],
          [6, 30, 56, 82, 108, 134],
          [6, 34, 60, 86, 112, 138],
          [6, 30, 58, 86, 114, 142],
          [6, 34, 62, 90, 118, 146],
          [6, 30, 54, 78, 102, 126, 150],
          [6, 24, 50, 76, 102, 128, 154],
          [6, 28, 54, 80, 106, 132, 158],
          [6, 32, 58, 84, 110, 136, 162],
          [6, 26, 54, 82, 110, 138, 166],
          [6, 30, 58, 86, 114, 142, 170]
      ],
  
      G15 : (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
      G18 : (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
      G15_MASK : (1 << 14) | (1 << 12) | (1 << 10)    | (1 << 4) | (1 << 1),
  
      getBCHTypeInfo : function(data) {
          var d = data << 10;
          while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
              d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) ) );    
          }
          return ( (data << 10) | d) ^ QRUtil.G15_MASK;
      },
  
      getBCHTypeNumber : function(data) {
          var d = data << 12;
          while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
              d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) ) );    
          }
          return (data << 12) | d;
      },
  
      getBCHDigit : function(data) {
  
          var digit = 0;
  
          while (data !== 0) {
              digit++;
              data >>>= 1;
          }
  
          return digit;
      },
  
      getPatternPosition : function(typeNumber) {
          return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
      },
  
      getMask : function(maskPattern, i, j) {
          
          switch (maskPattern) {
              
          case QRMaskPattern.PATTERN000 : return (i + j) % 2 === 0;
          case QRMaskPattern.PATTERN001 : return i % 2 === 0;
          case QRMaskPattern.PATTERN010 : return j % 3 === 0;
          case QRMaskPattern.PATTERN011 : return (i + j) % 3 === 0;
          case QRMaskPattern.PATTERN100 : return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 === 0;
          case QRMaskPattern.PATTERN101 : return (i * j) % 2 + (i * j) % 3 === 0;
          case QRMaskPattern.PATTERN110 : return ( (i * j) % 2 + (i * j) % 3) % 2 === 0;
          case QRMaskPattern.PATTERN111 : return ( (i * j) % 3 + (i + j) % 2) % 2 === 0;
  
          default :
              throw new Error("bad maskPattern:" + maskPattern);
          }
      },
  
      getErrorCorrectPolynomial : function(errorCorrectLength) {
  
          var a = new QRPolynomial([1], 0);
  
          for (var i = 0; i < errorCorrectLength; i++) {
              a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0) );
          }
  
          return a;
      },
  
      getLengthInBits : function(mode, type) {
  
          if (1 <= type && type < 10) {
  
              // 1 - 9
  
              switch(mode) {
              case QRMode.MODE_NUMBER     : return 10;
              case QRMode.MODE_ALPHA_NUM  : return 9;
              case QRMode.MODE_8BIT_BYTE  : return 8;
              case QRMode.MODE_KANJI      : return 8;
              default :
                  throw new Error("mode:" + mode);
              }
  
          } else if (type < 27) {
  
              // 10 - 26
  
              switch(mode) {
              case QRMode.MODE_NUMBER     : return 12;
              case QRMode.MODE_ALPHA_NUM  : return 11;
              case QRMode.MODE_8BIT_BYTE  : return 16;
              case QRMode.MODE_KANJI      : return 10;
              default :
                  throw new Error("mode:" + mode);
              }
  
          } else if (type < 41) {
  
              // 27 - 40
  
              switch(mode) {
              case QRMode.MODE_NUMBER     : return 14;
              case QRMode.MODE_ALPHA_NUM  : return 13;
              case QRMode.MODE_8BIT_BYTE  : return 16;
              case QRMode.MODE_KANJI      : return 12;
              default :
                  throw new Error("mode:" + mode);
              }
  
          } else {
              throw new Error("type:" + type);
          }
      },
  
      getLostPoint : function(qrCode) {
          
          var moduleCount = qrCode.getModuleCount();
          var lostPoint = 0;
          var row = 0; 
          var col = 0;
  
          
          // LEVEL1
          
          for (row = 0; row < moduleCount; row++) {
  
              for (col = 0; col < moduleCount; col++) {
  
                  var sameCount = 0;
                  var dark = qrCode.isDark(row, col);
  
                  for (var r = -1; r <= 1; r++) {
  
                      if (row + r < 0 || moduleCount <= row + r) {
                          continue;
                      }
  
                      for (var c = -1; c <= 1; c++) {
  
                          if (col + c < 0 || moduleCount <= col + c) {
                              continue;
                          }
  
                          if (r === 0 && c === 0) {
                              continue;
                          }
  
                          if (dark === qrCode.isDark(row + r, col + c) ) {
                              sameCount++;
                          }
                      }
                  }
  
                  if (sameCount > 5) {
                      lostPoint += (3 + sameCount - 5);
                  }
              }
          }
  
          // LEVEL2
  
          for (row = 0; row < moduleCount - 1; row++) {
              for (col = 0; col < moduleCount - 1; col++) {
                  var count = 0;
                  if (qrCode.isDark(row,     col    ) ) count++;
                  if (qrCode.isDark(row + 1, col    ) ) count++;
                  if (qrCode.isDark(row,     col + 1) ) count++;
                  if (qrCode.isDark(row + 1, col + 1) ) count++;
                  if (count === 0 || count === 4) {
                      lostPoint += 3;
                  }
              }
          }
  
          // LEVEL3
  
          for (row = 0; row < moduleCount; row++) {
              for (col = 0; col < moduleCount - 6; col++) {
                  if (qrCode.isDark(row, col) && 
                          !qrCode.isDark(row, col + 1) && 
                           qrCode.isDark(row, col + 2) && 
                           qrCode.isDark(row, col + 3) && 
                           qrCode.isDark(row, col + 4) && 
                          !qrCode.isDark(row, col + 5) && 
                           qrCode.isDark(row, col + 6) ) {
                      lostPoint += 40;
                  }
              }
          }
  
          for (col = 0; col < moduleCount; col++) {
              for (row = 0; row < moduleCount - 6; row++) {
                  if (qrCode.isDark(row, col) &&
                          !qrCode.isDark(row + 1, col) &&
                           qrCode.isDark(row + 2, col) &&
                           qrCode.isDark(row + 3, col) &&
                           qrCode.isDark(row + 4, col) &&
                          !qrCode.isDark(row + 5, col) &&
                           qrCode.isDark(row + 6, col) ) {
                      lostPoint += 40;
                  }
              }
          }
  
          // LEVEL4
          
          var darkCount = 0;
  
          for (col = 0; col < moduleCount; col++) {
              for (row = 0; row < moduleCount; row++) {
                  if (qrCode.isDark(row, col) ) {
                      darkCount++;
                  }
              }
          }
          
          var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
          lostPoint += ratio * 10;
  
          return lostPoint;       
      }
  
  };
  
  module.exports = QRUtil;
  
  return module.exports;})();
  M['index']=(function(){var module={exports:{}};var exports=module.exports;
  //---------------------------------------------------------------------
  // QRCode for JavaScript
  //
  // Copyright (c) 2009 Kazuhiko Arase
  //
  // URL: http://www.d-project.com/
  //
  // Licensed under the MIT license:
  //   http://www.opensource.org/licenses/mit-license.php
  //
  // The word "QR Code" is registered trademark of 
  // DENSO WAVE INCORPORATED
  //   http://www.denso-wave.com/qrcode/faqpatent-e.html
  //
  //---------------------------------------------------------------------
  // Modified to work in node for this project (and some refactoring)
  //---------------------------------------------------------------------
  
  var QR8bitByte = require('./QR8bitByte');
  var QRUtil = require('./QRUtil');
  var QRPolynomial = require('./QRPolynomial');
  var QRRSBlock = require('./QRRSBlock');
  var QRBitBuffer = require('./QRBitBuffer');
  
  function QRCode(typeNumber, errorCorrectLevel) {
  	this.typeNumber = typeNumber;
  	this.errorCorrectLevel = errorCorrectLevel;
  	this.modules = null;
  	this.moduleCount = 0;
  	this.dataCache = null;
  	this.dataList = [];
  }
  
  QRCode.prototype = {
  	
  	addData : function(data) {
  		var newData = new QR8bitByte(data);
  		this.dataList.push(newData);
  		this.dataCache = null;
  	},
  	
  	isDark : function(row, col) {
  		if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
  			throw new Error(row + "," + col);
  		}
  		return this.modules[row][col];
  	},
  
  	getModuleCount : function() {
  		return this.moduleCount;
  	},
  	
  	make : function() {
  		// Calculate automatically typeNumber if provided is < 1
  		if (this.typeNumber < 1 ){
  			var typeNumber = 1;
  			for (typeNumber = 1; typeNumber < 40; typeNumber++) {
  				var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);
  
  				var buffer = new QRBitBuffer();
  				var totalDataCount = 0;
  				for (var i = 0; i < rsBlocks.length; i++) {
  					totalDataCount += rsBlocks[i].dataCount;
  				}
  
  				for (var x = 0; x < this.dataList.length; x++) {
  					var data = this.dataList[x];
  					buffer.put(data.mode, 4);
  					buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
  					data.write(buffer);
  				}
  				if (buffer.getLengthInBits() <= totalDataCount * 8)
  					break;
  			}
  			this.typeNumber = typeNumber;
  		}
  		this.makeImpl(false, this.getBestMaskPattern() );
  	},
  	
  	makeImpl : function(test, maskPattern) {
  		
  		this.moduleCount = this.typeNumber * 4 + 17;
  		this.modules = new Array(this.moduleCount);
  		
  		for (var row = 0; row < this.moduleCount; row++) {
  			
  			this.modules[row] = new Array(this.moduleCount);
  			
  			for (var col = 0; col < this.moduleCount; col++) {
  				this.modules[row][col] = null;//(col + row) % 3;
  			}
  		}
  	
  		this.setupPositionProbePattern(0, 0);
  		this.setupPositionProbePattern(this.moduleCount - 7, 0);
  		this.setupPositionProbePattern(0, this.moduleCount - 7);
  		this.setupPositionAdjustPattern();
  		this.setupTimingPattern();
  		this.setupTypeInfo(test, maskPattern);
  		
  		if (this.typeNumber >= 7) {
  			this.setupTypeNumber(test);
  		}
  	
  		if (this.dataCache === null) {
  			this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
  		}
  	
  		this.mapData(this.dataCache, maskPattern);
  	},
  
  	setupPositionProbePattern : function(row, col)  {
  		
  		for (var r = -1; r <= 7; r++) {
  			
  			if (row + r <= -1 || this.moduleCount <= row + r) continue;
  			
  			for (var c = -1; c <= 7; c++) {
  				
  				if (col + c <= -1 || this.moduleCount <= col + c) continue;
  				
  				if ( (0 <= r && r <= 6 && (c === 0 || c === 6) ) || 
                       (0 <= c && c <= 6 && (r === 0 || r === 6) ) || 
                       (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
  					this.modules[row + r][col + c] = true;
  				} else {
  					this.modules[row + r][col + c] = false;
  				}
  			}		
  		}		
  	},
  	
  	getBestMaskPattern : function() {
  	
  		var minLostPoint = 0;
  		var pattern = 0;
  	
  		for (var i = 0; i < 8; i++) {
  			
  			this.makeImpl(true, i);
  	
  			var lostPoint = QRUtil.getLostPoint(this);
  	
  			if (i === 0 || minLostPoint >  lostPoint) {
  				minLostPoint = lostPoint;
  				pattern = i;
  			}
  		}
  	
  		return pattern;
  	},
  	
  	createMovieClip : function(target_mc, instance_name, depth) {
  	
  		var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
  		var cs = 1;
  	
  		this.make();
  
  		for (var row = 0; row < this.modules.length; row++) {
  			
  			var y = row * cs;
  			
  			for (var col = 0; col < this.modules[row].length; col++) {
  	
  				var x = col * cs;
  				var dark = this.modules[row][col];
  			
  				if (dark) {
  					qr_mc.beginFill(0, 100);
  					qr_mc.moveTo(x, y);
  					qr_mc.lineTo(x + cs, y);
  					qr_mc.lineTo(x + cs, y + cs);
  					qr_mc.lineTo(x, y + cs);
  					qr_mc.endFill();
  				}
  			}
  		}
  		
  		return qr_mc;
  	},
  
  	setupTimingPattern : function() {
  		
  		for (var r = 8; r < this.moduleCount - 8; r++) {
  			if (this.modules[r][6] !== null) {
  				continue;
  			}
  			this.modules[r][6] = (r % 2 === 0);
  		}
  	
  		for (var c = 8; c < this.moduleCount - 8; c++) {
  			if (this.modules[6][c] !== null) {
  				continue;
  			}
  			this.modules[6][c] = (c % 2 === 0);
  		}
  	},
  	
  	setupPositionAdjustPattern : function() {
  	
  		var pos = QRUtil.getPatternPosition(this.typeNumber);
  		
  		for (var i = 0; i < pos.length; i++) {
  		
  			for (var j = 0; j < pos.length; j++) {
  			
  				var row = pos[i];
  				var col = pos[j];
  				
  				if (this.modules[row][col] !== null) {
  					continue;
  				}
  				
  				for (var r = -2; r <= 2; r++) {
  				
  					for (var c = -2; c <= 2; c++) {
  					
  						if (Math.abs(r) === 2 || 
                              Math.abs(c) === 2 ||
                              (r === 0 && c === 0) ) {
  							this.modules[row + r][col + c] = true;
  						} else {
  							this.modules[row + r][col + c] = false;
  						}
  					}
  				}
  			}
  		}
  	},
  	
  	setupTypeNumber : function(test) {
  	
  		var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
          var mod;
  	
  		for (var i = 0; i < 18; i++) {
  			mod = (!test && ( (bits >> i) & 1) === 1);
  			this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
  		}
  	
  		for (var x = 0; x < 18; x++) {
  			mod = (!test && ( (bits >> x) & 1) === 1);
  			this.modules[x % 3 + this.moduleCount - 8 - 3][Math.floor(x / 3)] = mod;
  		}
  	},
  	
  	setupTypeInfo : function(test, maskPattern) {
  	
  		var data = (this.errorCorrectLevel << 3) | maskPattern;
  		var bits = QRUtil.getBCHTypeInfo(data);
          var mod;
  	
  		// vertical		
  		for (var v = 0; v < 15; v++) {
  	
  			mod = (!test && ( (bits >> v) & 1) === 1);
  	
  			if (v < 6) {
  				this.modules[v][8] = mod;
  			} else if (v < 8) {
  				this.modules[v + 1][8] = mod;
  			} else {
  				this.modules[this.moduleCount - 15 + v][8] = mod;
  			}
  		}
  	
  		// horizontal
  		for (var h = 0; h < 15; h++) {
  	
  			mod = (!test && ( (bits >> h) & 1) === 1);
  			
  			if (h < 8) {
  				this.modules[8][this.moduleCount - h - 1] = mod;
  			} else if (h < 9) {
  				this.modules[8][15 - h - 1 + 1] = mod;
  			} else {
  				this.modules[8][15 - h - 1] = mod;
  			}
  		}
  	
  		// fixed module
  		this.modules[this.moduleCount - 8][8] = (!test);
  	
  	},
  	
  	mapData : function(data, maskPattern) {
  		
  		var inc = -1;
  		var row = this.moduleCount - 1;
  		var bitIndex = 7;
  		var byteIndex = 0;
  		
  		for (var col = this.moduleCount - 1; col > 0; col -= 2) {
  	
  			if (col === 6) col--;
  	
  			while (true) {
  	
  				for (var c = 0; c < 2; c++) {
  					
  					if (this.modules[row][col - c] === null) {
  						
  						var dark = false;
  	
  						if (byteIndex < data.length) {
  							dark = ( ( (data[byteIndex] >>> bitIndex) & 1) === 1);
  						}
  	
  						var mask = QRUtil.getMask(maskPattern, row, col - c);
  	
  						if (mask) {
  							dark = !dark;
  						}
  						
  						this.modules[row][col - c] = dark;
  						bitIndex--;
  	
  						if (bitIndex === -1) {
  							byteIndex++;
  							bitIndex = 7;
  						}
  					}
  				}
  								
  				row += inc;
  	
  				if (row < 0 || this.moduleCount <= row) {
  					row -= inc;
  					inc = -inc;
  					break;
  				}
  			}
  		}
  		
  	}
  
  };
  
  QRCode.PAD0 = 0xEC;
  QRCode.PAD1 = 0x11;
  
  QRCode.createData = function(typeNumber, errorCorrectLevel, dataList) {
  	
  	var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
  	
  	var buffer = new QRBitBuffer();
  	
  	for (var i = 0; i < dataList.length; i++) {
  		var data = dataList[i];
  		buffer.put(data.mode, 4);
  		buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
  		data.write(buffer);
  	}
  
  	// calc num max data.
  	var totalDataCount = 0;
  	for (var x = 0; x < rsBlocks.length; x++) {
  		totalDataCount += rsBlocks[x].dataCount;
  	}
  
  	if (buffer.getLengthInBits() > totalDataCount * 8) {
  		throw new Error("code length overflow. (" + 
              buffer.getLengthInBits() + 
              ">" +  
              totalDataCount * 8 + 
              ")");
  	}
  
  	// end code
  	if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
  		buffer.put(0, 4);
  	}
  
  	// padding
  	while (buffer.getLengthInBits() % 8 !== 0) {
  		buffer.putBit(false);
  	}
  
  	// padding
  	while (true) {
  		
  		if (buffer.getLengthInBits() >= totalDataCount * 8) {
  			break;
  		}
  		buffer.put(QRCode.PAD0, 8);
  		
  		if (buffer.getLengthInBits() >= totalDataCount * 8) {
  			break;
  		}
  		buffer.put(QRCode.PAD1, 8);
  	}
  
  	return QRCode.createBytes(buffer, rsBlocks);
  };
  
  QRCode.createBytes = function(buffer, rsBlocks) {
  
  	var offset = 0;
  	
  	var maxDcCount = 0;
  	var maxEcCount = 0;
  	
  	var dcdata = new Array(rsBlocks.length);
  	var ecdata = new Array(rsBlocks.length);
  	
  	for (var r = 0; r < rsBlocks.length; r++) {
  
  		var dcCount = rsBlocks[r].dataCount;
  		var ecCount = rsBlocks[r].totalCount - dcCount;
  
  		maxDcCount = Math.max(maxDcCount, dcCount);
  		maxEcCount = Math.max(maxEcCount, ecCount);
  		
  		dcdata[r] = new Array(dcCount);
  		
  		for (var i = 0; i < dcdata[r].length; i++) {
  			dcdata[r][i] = 0xff & buffer.buffer[i + offset];
  		}
  		offset += dcCount;
  		
  		var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
  		var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
  
  		var modPoly = rawPoly.mod(rsPoly);
  		ecdata[r] = new Array(rsPoly.getLength() - 1);
  		for (var x = 0; x < ecdata[r].length; x++) {
              var modIndex = x + modPoly.getLength() - ecdata[r].length;
  			ecdata[r][x] = (modIndex >= 0)? modPoly.get(modIndex) : 0;
  		}
  
  	}
  	
  	var totalCodeCount = 0;
  	for (var y = 0; y < rsBlocks.length; y++) {
  		totalCodeCount += rsBlocks[y].totalCount;
  	}
  
  	var data = new Array(totalCodeCount);
  	var index = 0;
  
  	for (var z = 0; z < maxDcCount; z++) {
  		for (var s = 0; s < rsBlocks.length; s++) {
  			if (z < dcdata[s].length) {
  				data[index++] = dcdata[s][z];
  			}
  		}
  	}
  
  	for (var xx = 0; xx < maxEcCount; xx++) {
  		for (var t = 0; t < rsBlocks.length; t++) {
  			if (xx < ecdata[t].length) {
  				data[index++] = ecdata[t][xx];
  			}
  		}
  	}
  
  	return data;
  
  };
  
  module.exports = QRCode;
  
  return module.exports;})();
  return {make:function(text){var q=new M['index'](-1,M['QRErrorCorrectLevel'].M);q.addData(text);q.make();var n=q.getModuleCount(),a=[];for(var r=0;r<n;r++){var row=[];for(var c=0;c<n;c++)row.push(q.isDark(r,c));a.push(row);}return a;}};})();
  const PLAY_URL = 'https://play.google.com/store/apps/details?id=fr.vezoria.app';
  const APP_URL = () => /Android/i.test(navigator.userAgent || '') ? PLAY_URL : window.VZ_HOST ? 'https://vezoria.pages.dev/' : location.origin + '/';
  function qrSVG(text, cls){
    const m = CVQR.make(text), n = m.length, q = 2; let d = '';
    for(let r=0;r<n;r++) for(let c=0;c<n;c++) if(m[r][c]) d += `M${c+q} ${r+q}h1v1h-1z`;
    return `<svg class="${cls||'cv-share-qr'}" viewBox="0 0 ${n+2*q} ${n+2*q}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" role="img" aria-label="QR code de l’appli"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#2A1238"/></svg>`;
  }
  const WEB_URL = () => window.VZ_HOST ? 'https://vezoria.pages.dev/' : location.origin + '/';
  function shareSheet(){
    // deux boutons : chacun ouvre son QR code (l’appli web pour iPhone, la fiche Google Play pour Android)
    openSheet(`<h2>📤 Partager l’appli à un ami</h2>
      <div class="v-sum-small" style="margin-bottom:8px;text-align:center">Choisis le téléphone de ton ami : il scanne le code avec son appareil photo.</div>
      <div class="cv-qrsw"><button type="button" class="v-btn sec" data-k="ios" onclick="CV.shareQr('ios')">📱 iPhone</button><button type="button" class="v-btn sec" data-k="and" onclick="CV.shareQr('and')">🤖 Android</button></div>
      <div id="cv-qrbox" class="cv-qrbox" hidden></div>
      <button type="button" class="v-btn" onclick="CV.shareLink()">📤 Envoyer les liens</button>
      <div class="v-sum-small" style="margin-top:10px"><span>Ce lien donne l’appli, <b>pas ton carnet</b>.</span> <span>Pour voyager ensemble sur le même carnet, envoie aussi ton</span> <b>code de partage</b> (Plus → Partage &amp; profils).</div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  function shareQr(k){
    const box = document.getElementById('cv-qrbox'); if(!box) return;
    const same = !box.hidden && box.dataset.k === k;
    document.querySelectorAll('.cv-qrsw button').forEach(b=>b.classList.toggle('on', !same && b.dataset.k === k));
    if(same){ box.hidden = true; box.dataset.k = ''; return; }
    box.dataset.k = k; box.hidden = false;
    box.innerHTML = k === 'ios' ? `<b>📱 iPhone</b>${qrSVG(WEB_URL())}<small>Safari → « Partager » → « Sur l’écran d’accueil »</small>` : `<b>🤖 Android</b>${qrSVG(PLAY_URL)}<small>Google Play</small>`;
  }
  async function shareLink(){
    const base = 'Je t’invite sur Vezoria : on prépare nos voyages à plusieurs (programme, budget, souvenirs), et tout est chiffré.';
    const text = (window.I18N && I18N.msg ? I18N.msg(base) : base) + '\n📱 iPhone : ' + WEB_URL() + '\n🤖 Android : ' + PLAY_URL;
    try { if(navigator.share){ await navigator.share({title:'Vezoria', text}); return; } } catch(e){ if(e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); toast('🔗 Lien copié'); } catch(e){ (await uiPrompt('Copie ce lien :', text)); }
  }
  /* ══════════════════════════════════════════════════════════════════════════
     🧰 OUTILS DU VOYAGE (5 octobre 2026)
     Fiche du jour · rappels calendrier · devises · météo · tickets · carte ·
     bagages · documents · journal · paquets sans serveur
     Tout se fait sur le téléphone ; les seuls appels réseau sont des services
     publics gratuits (taux de change, météo, lecture de ticket) — jamais vers l'éditeur.
     ══════════════════════════════════════════════════════════════════════════ */
  const tlDays = () => { const t = trip(); return t && t.debut ? dayList() : []; };
  const isoToday = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
  async function tlShareFile(blob, name, title){
    try {
      const f = new File([blob], name, {type: blob.type || 'application/octet-stream'});
      if(navigator.canShare && navigator.canShare({files:[f]})){ await navigator.share({files:[f], title: title || name}); return; }
    } catch(e){ if(e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function tlPickFile(accept, cb, capture){
    // iOS ne déclenche « change » que si le champ fait partie de la page
    const i = document.createElement('input'); i.type = 'file'; if(!(isIOSDev && !/image|video/.test(accept))) i.accept = accept;   // iPhone : sans filtre, sinon les .carnet / .pkpass / .ics restent grisés dans Fichiers
    if(capture) i.setAttribute('capture', 'environment');
    i.style.cssText = 'position:fixed;left:-1000px;top:0;width:1px;height:1px;opacity:0';
    document.body.appendChild(i);
    i.addEventListener('change', () => { const f = i.files && i.files[0]; setTimeout(()=>i.remove(), 1000); if(f) cb(f); });
    i.click();
  }
  const tlB64 = { enc: buf => { const u = new Uint8Array(buf); let s = ''; for(let i=0;i<u.length;i+=0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i+0x8000)); return btoa(s); },
                dec: str => { const s = atob(str), u = new Uint8Array(s.length); for(let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return u; } };

  /* ---------- Onglet « 🧰 Outils » ---------- */
  function renderOutils(){
    const t = trip(), di = docIssues(), nRec = items(i=>i.recu).length;
    // 🧹 une grille de tuiles : chaque outil s’ouvre seul (description + boutons) au lieu d’une longue page
    TOOLS = []; const box = (ic, ti, p, btn) => { const i = TOOLS.push({ic, ti, p, btn}) - 1, warn = /cv-warnline/.test(p);
      return `<button type="button" class="cv-tile cv-tooltile${warn ? ' warn' : ''}" onclick="CV.toolOpen(${i})"><i>${ic}</i><span>${ti}</span>${warn ? '<b>!</b>' : ''}</button>`; };
    let h = `<div class="v-sum"><div class="v-sum-row"><div class="v-sum-big">🧰 Outils du voyage</div></div>
      <div class="v-sum-small">Tout fonctionne sur ton téléphone. Rien n’est envoyé à l’éditeur de l’appli.</div></div><div class="cv-tiles cv-tools">`;
    h += box('📄','Importer une réservation','Le PDF de la réservation (Booking, compagnie, SNCF…) : la fiche se crée toute seule, avec le PDF joint comme billet.', `<button class="v-btn" onclick="CV.impSheet()">📄 Importer une réservation</button>`);
    h += box('🌍','Carte du monde 3D','Ton globe à toi : tous tes voyages, tes steps 📍 et les pays visités. Zoome et fais tourner la Terre du bout des doigts.', `<button class="v-btn sec" onclick="CV.worldMap()">🌍 Ouvrir la carte du monde</button>`);
    h += box('📶','Cartes hors ligne','Rues, lieux à voir, hôtels et ta position sur une carte zoomable, même sans réseau ni données à l’étranger. À télécharger en Wi-Fi avant de partir.', `<button class="v-btn sec" onclick="CV.omapSheet()">🗺️ Cartes hors ligne</button>`);
    h += box('🪄','Remplir mes journées','Les lieux les plus connus de chaque étape, répartis sur tes jours libres (sans toucher à ce qui est déjà prévu).', `<button class="v-btn sec" onclick="CV.tlFill()">🪄 Remplir mes journées</button>`);
    h += box('📍','Steps : je suis ici','Pendant le voyage, enregistre où tu es avec des photos et un récit. Le step se range dans les Souvenirs, apparaît sur les cartes et dans le journal.', `<button class="v-btn sec" onclick="CV.hereNow()">📍 Je suis ici</button><button class="v-btn sec" onclick="CV.tlStats()">📊 Mes stats (pays, km, nuits)</button>`);
    h += box('🌍','Empreinte carbone et conseils','CO2 estimé de chaque trajet, comparaison avec le train, et le bon moment pour réserver les vols encore à réserver.', `<button class="v-btn sec" onclick="CV.tlCo2()">🌍 Calculer</button>`);
    h += box('🗺️','Exporter l’itinéraire','Étapes, lieux à voir et tracés à pied dans un fichier KML : à ouvrir dans Google My Maps, Google Earth ou <b>Organic Maps</b> (cartes hors ligne gratuites).', `<button class="v-btn sec" onclick="CV.tlKml()">🗺️ Exporter (KML)</button>`);
    h += box('📴','Fiche du jour','Billets, horaires, adresses, téléphones et références d’aujourd’hui et de demain, sur une seule page lisible même sans réseau.',
      `<button class="v-btn" onclick="CV.tlDay()">📴 Ouvrir la fiche du jour</button>`);
    h += box('🔔','Rappels dans le calendrier','Échéances de paiement, enregistrement des vols (24 h avant), arrivées à l’hôtel : ajoutés en un geste au calendrier de ton téléphone, avec alertes. Pour les notifications de l’appli : Plus → ⚙️ Réglages → 🔔 Notifications.',
      `<button class="v-btn sec" onclick="CV.tlIcs()">📅 Rappels dans mon calendrier</button>`);
    h += box('💱','Convertisseur de devises','Saisis un montant en monnaie locale, l’appli le convertit dans la devise du voyage (aussi dans chaque fiche, sous « Prix réel »).',
      `<div class="cv-fx"><input class="v-in" id="fxo-a" inputmode="decimal" placeholder="Montant"><select class="v-in" id="fxo-c">${fxOpts(M.fxLast||'USD')}</select><button type="button" class="v-btn sec" onclick="CV.fxTool()">= ${CS()}</button></div><div class="v-sum-small" id="fxo-r"></div>`);
    h += box('🌤️','Météo des étapes','Prévisions si le départ est proche, sinon le temps qu’il faisait l’an dernier aux mêmes dates.',
      `<button class="v-btn sec" onclick="CV.tlMeteo()">🌤️ Voir la météo</button>`);
    h += box('🧾','Ticket ou reçu','Prends l’addition en photo, l’appli essaie de lire le montant et crée la dépense pour le « qui doit quoi ».' + (nRec ? ` <b>${nRec} reçu${nRec>1?'s':''}</b> enregistré${nRec>1?'s':''}.` : ''),
      `<button class="v-btn" onclick="CV.tlReceipt()">🧾 Ajouter un ticket</button>${nRec ? `<button class="v-btn sec" onclick="CV.tlReceipts()">🗂️ Mes tickets (${nRec})</button>` : ''}`);
    h += box('🛒','Liste de courses','Partagée avec le groupe : pique-nique, apéro, pharmacie… chacun ajoute et coche.', `<button class="v-btn sec" onclick="CV.shopSheet()">🛒 Ouvrir la liste</button>`);
    h += box('💶','Plafond de dépenses','Fixe un budget par jour sur place : l’accueil du voyage affiche ce qui est dépensé aujourd’hui et prévient en cas de dépassement.' + (num(trip().plafond) ? ` Actuel : <b>${eur(num(trip().plafond))} / jour</b>.` : ''), `<button class="v-btn sec" onclick="CV.capSet()">💶 ${num(trip().plafond) ? 'Modifier' : 'Fixer'} le plafond</button>`);
    h += box('🗺️','Carte du voyage','Toutes les étapes reliées dans l’ordre, avec les distances. Elle s’ajoute aussi au carnet de route PDF.',
      `<button class="v-btn sec" onclick="CV.tlMap()">🗺️ Voir la carte</button>`);
    h += box('🧳','Liste de bagages','Générée selon la durée, la météo et vos activités, pour tout le monde ou pour un voyageur. Elle s’ajoute à la checklist.',
      `<button class="v-btn sec" onclick="CV.tlBags()">🧳 Préparer la liste</button>`);
    h += box('🛂','Documents de voyage', di.length ? `<span class="cv-warnline">⚠️ ${di.length} document${di.length>1?'s':''} à vérifier : ${di.map(x=>esc(x)).join(' · ')}</span>` : 'Passeports, cartes d’identité, visas, assurances : dates d’expiration et alertes avant le départ.',
      `<button class="v-btn sec" onclick="CV.tlDocs()">🛂 Gérer les documents</button>`);
    h += box('📖','Journal de voyage','Un album à imprimer ou garder en PDF : la carte, chaque jour avec ses souvenirs et ses photos, et le bilan.',
      `<button class="v-btn sec" onclick="CV.jrSheet()">📖 Créer le journal (PDF)</button>`);
    h += box('📦','Partager sans serveur','Pour ceux qui ne veulent pas de la synchro en ligne : un fichier chiffré à s’envoyer (WhatsApp, Messages, AirDrop…). Voir Partage &amp; profils.',
      `<button class="v-btn sec" onclick="CV.pkgSheet()">📤 Envoyer un paquet</button><button class="v-btn sec" onclick="CV.pkgImport()">📥 Recevoir un paquet</button>`);
    h += `</div>`;
    document.getElementById('cv-body').innerHTML = h;
  }
  let TOOLS = [];
  function toolOpen(i){ const x = TOOLS[i]; if(!x) return;
    openSheet(`<h2>${x.ic} ${x.ti}</h2><p class="v-sum-small" style="font-size:.92rem;line-height:1.5;margin:0 0 12px">${x.p}</p><div class="cv-toolb">${x.btn}</div><div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">${esc(MSGT('Fermer'))}</button></div>`); }

  /* ══════════ 🗺️ Cartes hors ligne ══════════
     Carte zoomable des villes du voyage (fond OpenFreeMap, libre et sans clé), téléchargée à l’avance
     sur le téléphone : rues, lieux, hôtels et ta position, même sans réseau. Les morceaux de carte sont
     rangés par le service worker (cache « vz-maps »), à part de l’appli : une mise à jour ne les efface pas. */
  const OFM = 'https://tiles.openfreemap.org/styles/liberty';
  const OM = () => M.omap || (M.omap = {});
  const OMZ = [[0, 9, 40], [10, 11, 25], [12, 13, 10], [14, 14, 6]];   // [zoom min, zoom max, rayon en km]
  async function omapPoints(){
    const t = trip(); if(!t) return [];
    const st = tlStages(), out = []; try { await stagesGeoFix(st.map(s=>s.city)); } catch(e){}
    for(const s of st){
      const c = await geocode(s.city, null).catch(()=>null); if(!c) continue;
      const h = s.h && (s.h.adresse || s.h.nom) ? await geocode(s.h.adresse || s.h.nom, s.city).catch(()=>null) : null;
      const same = out.find(o=>normQ(o.city) === normQ(s.city)), hn = s.h ? (s.h.nom || s.h.titre || '') : '';
      if(same){ if(hn && !same.hotel.includes(hn)) same.hotel = [same.hotel, hn].filter(Boolean).join(' · '); if(h) (same.more = same.more || []).push({h, hotel:hn}); continue; }   // même ville plusieurs fois (aller et retour)
      out.push({city:s.city, lat:c.lat, lng:c.lng, h, hotel:hn});
    }
    if(!out.length){ const c = await geocode(cityOf(t.titre) || t.titre, null).catch(()=>null); if(c) out.push({city:cityOf(t.titre) || t.titre, lat:c.lat, lng:c.lng}); }
    return out;
  }
  const omapTiles = (lat, lng) => { const out = [];
    OMZ.forEach(([z0, z1, r])=>{ for(let z = z0; z <= z1; z++){ const dLat = r / 111, dLng = r / (111 * Math.cos(lat * Math.PI / 180));
      const x0 = Math.floor(lon2x(lng - dLng, z) / 256), x1 = Math.floor(lon2x(lng + dLng, z) / 256), y0 = Math.floor(lat2y(lat + dLat, z) / 256), y1 = Math.floor(lat2y(lat - dLat, z) / 256), n = Math.pow(2, z);
      for(let x = x0; x <= x1; x++) for(let y = Math.max(0, y0); y <= Math.min(n - 1, y1); y++) out.push([z, ((x % n) + n) % n, y]); } });
    return out; };
  async function omapSheet(){
    const t = trip(); if(!t) return;
    openSheet(`<h2>🗺️ Cartes hors ligne</h2><div class="cv-route-load" id="om-box">📡 Recherche des étapes…</div>`);
    const pts = await omapPoints(), box = document.getElementById('om-box'); if(!box) return; box.className = '';
    const have = OM()[t.id], est = pts.reduce((s, p)=>s + omapTiles(p.lat, p.lng).length, 0);
    let used = ''; try { const e = await navigator.storage.estimate(); if(e && e.usage) used = Math.round(e.usage / 1048576) + ' Mo'; } catch(e){}
    box.innerHTML = `<div class="v-sum-small" style="margin-bottom:8px">Rues, lieux à voir, hôtels et ta position, même sans réseau ni données à l’étranger. À télécharger en Wi-Fi avant le départ.</div>
      ${pts.length ? `<div class="v-box" style="margin:0 0 10px">${pts.map(p=>`<div>📍 <b>${esc(p.city)}</b>${p.hotel ? ` <small>· ${esc(p.hotel)}</small>` : ''}</div>`).join('')}</div>
      <div class="v-sum-small">≈ ${est} morceaux de carte · ≈ ${Math.max(1, Math.round(est * 0.035))} Mo${used ? ' · place utilisée par l’appli : ' + used : ''}</div>` : '<div class="v-sum-small">Ajoute d’abord les hébergements du voyage (une ville par étape).</div>'}
      ${have ? `<div class="v-sum-small" style="margin-top:6px">✅ Téléchargées le ${new Date(have.at).toLocaleDateString((window.I18N ? I18N.locale : 'fr-FR'))} (${have.n} morceaux).</div>` : ''}
      <div id="om-prog" class="v-sum-small" style="margin-top:8px"></div>
      <div class="v-actions">${pts.length ? `<button type="button" class="v-btn" id="om-go" onclick="CV.omapGo()">📥 ${have ? 'Mettre à jour' : 'Télécharger'} les cartes</button>` : ''}<button type="button" class="v-btn sec" onclick="CV.omapOpen()">🗺️ Ouvrir la carte</button>${have ? `<button type="button" class="v-btn sec" onclick="CV.omapDel()">🗑 Effacer les cartes</button>` : ''}<button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`;
  }
  async function omapGo(quiet){
    const t = trip(); if(!t) return; const btn = document.getElementById('om-go'), prog = document.getElementById('om-prog');
    const say = m => { const e = document.getElementById('om-prog'); if(e && !quiet) e.textContent = m; };
    if(btn) btn.disabled = true;
    try {
      try { if(navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch(e){}
      say('📡 Préparation…');
      const cache = await caches.open('vz-maps'), get = async u => { const r = await fetch(u, {mode:'cors'}); if(!r.ok) throw new Error(r.status); await cache.put(u, r.clone()); return r; };
      const style = await (await get(OFM)).json(), tpl = {}, urls = new Set();
      for(const [k, s] of Object.entries(style.sources || {})){
        let tiles = s.tiles, mx = s.maxzoom;
        if(s.url){ const j = await (await get(s.url)).json(); tiles = j.tiles; mx = j.maxzoom; }
        if(tiles && tiles[0]) tpl[k] = {t:tiles[0], mx:Math.min(14, mx == null ? 14 : mx), type:s.type};
      }
      const pts = await omapPoints();
      pts.forEach(p=>omapTiles(p.lat, p.lng).forEach(([z, x, y])=>Object.values(tpl).forEach(s=>{ if(z <= s.mx) urls.add(s.t.replace('{z}', z).replace('{x}', x).replace('{y}', y)); })));
      if(style.sprite){ const sp = Array.isArray(style.sprite) ? style.sprite.map(x=>x.url) : [style.sprite]; sp.forEach(b=>['.json', '.png', '@2x.json', '@2x.png'].forEach(e=>urls.add(b + e))); }
      if(style.glyphs){ const fonts = new Set(); (style.layers || []).forEach(l=>{ const f = l.layout && l.layout['text-font']; if(Array.isArray(f) && typeof f[0] === 'string') fonts.add(f.join(',')); });
        fonts.forEach(f=>['0-255', '256-511', '512-767', '768-1023', '1024-1279', '8192-8447'].forEach(r=>urls.add(style.glyphs.replace('{fontstack}', encodeURIComponent(f)).replace('{range}', r)))); }
      [(window.VZ_B || '') + 'vendor/maplibre-gl.js', (window.VZ_B || '') + 'vendor/maplibre-gl.css'].forEach(u=>fetch(u).catch(()=>{}));
      const list = [...urls]; let done = 0, fail = 0, i = 0;
      const worker = async () => { while(i < list.length){ const u = list[i++]; try { if(!(await cache.match(u))) await get(u); } catch(e){ fail++; } done++; if(done % 20 === 0 || done === list.length) say(`📥 ${done} / ${list.length}`); } };
      await Promise.all([1, 2, 3, 4, 5, 6].map(worker));
      OM()[t.id] = {at:Date.now(), n:list.length - fail, tpl, style:OFM}; persist();
      say(fail ? `⚠️ ${fail} morceaux non téléchargés (réseau ?). Réessaie en Wi-Fi.` : '✅ Cartes prêtes : elles marchent maintenant sans réseau.');
      if(quiet) return !fail; setTimeout(omapSheet, fail ? 2500 : 1200);
    } catch(e){ say('⚠️ ' + (e.message || e)); if(btn) btn.disabled = false; if(quiet) return false; }
  }
  async function omapDel(){
    if(!(await uiConfirm('Effacer les cartes hors ligne de ce téléphone ?'))) return;
    try { await caches.delete('vz-maps'); } catch(e){} M.omap = {}; persist(); toast('🗑 Cartes effacées'); omapSheet();
  }
  let OMV = null;
  async function omapOpen(){
    const t = trip(); if(!t) return; closeSheet(true);
    let ov = document.getElementById('cv-omap'); if(!ov){ ov = document.createElement('div'); ov.id = 'cv-omap'; document.body.appendChild(ov); }
    ov.innerHTML = `<div id="om-map"></div><button type="button" class="om-x" onclick="CV.omapClose()" aria-label="Fermer">✕</button><div class="om-info" id="om-info">🗺️ Chargement de la carte…</div>`;
    ov.style.display = 'block'; document.body.style.overflow = 'hidden';
    try {
      await loadCss((window.VZ_B || '') + 'vendor/maplibre-gl.css');
      if(!window.maplibregl) await loadJs((window.VZ_B || '') + 'vendor/maplibre-gl.js');
      const style = await withTimeout(fetch(OFM).then(r=>r.json()), 8000);
      const saved = OM()[t.id];
      if(saved && saved.tpl) Object.entries(saved.tpl).forEach(([k, s])=>{ const src = style.sources[k]; if(src){ delete src.url; src.tiles = [s.t]; src.maxzoom = s.mx; } });   // mêmes morceaux que ceux téléchargés
      const lang = (l => /^(ar|hi)$/.test(l) ? 'en' : l)((window.I18N && I18N.lang) || 'fr');
      (style.layers || []).forEach(l=>{ if(l.type === 'symbol' && l.layout && l.layout['text-field']) l.layout['text-field'] = ['coalesce', ['get', 'name:' + lang], ['get', 'name:latin'], ['get', 'name']]; });
      const pts = await omapPoints(), first = pts[0] || {lat:48.85, lng:2.35};
      const map = new maplibregl.Map({container:'om-map', style, center:[first.lng, first.lat], zoom:12.5, maxZoom:18, attributionControl:{compact:true}, pixelRatio:Math.min(2, window.devicePixelRatio || 1)});
      OMV = map;
      map.addControl(new maplibregl.NavigationControl({showCompass:true}), 'top-right');
      map.addControl(new maplibregl.GeolocateControl({positionOptions:{enableHighAccuracy:true}, trackUserLocation:true, showUserLocation:true}), 'top-right');
      const mk = (lng, lat, html, cls) => { const el = document.createElement('div'); el.className = 'om-mk ' + (cls || ''); el.innerHTML = html; new maplibregl.Marker({element:el}).setLngLat([lng, lat]).addTo(map); return el; };
      pts.forEach(p=>[{h:p.h, hotel:p.hotel}].concat(p.more || []).forEach(x=>{ if(x.h) mk(x.h.lng, x.h.lat, '🏨', 'h').title = x.hotel; }));
      list('place', p=>p.trip === t.id && !p.deleted && !p.sugg && p.lat != null).forEach(p=>{ const el = mk(p.lng, p.lat, '📍', 'p'); el.title = p.nom; el.onclick = ev => { ev.stopPropagation(); omapClose(); plInfo(p.id); }; });
      const info = document.getElementById('om-info');
      if(info) info.innerHTML = pts.length > 1 ? pts.map((p, i)=>`<button type="button" onclick="CV.omapFly(${i})">${esc(p.city)}</button>`).join('') : `<span>${navigator.onLine === false ? (OM()[t.id] ? '📴 Carte hors ligne' : '📴 Pas de réseau : télécharge les cartes avant le départ (Outils).') : ''}</span>`;
      OMV.pts = pts;
    } catch(e){ const info = document.getElementById('om-info'); if(info) info.textContent = '⚠️ Carte indisponible : ' + (e.message || e); }
  }
  function omapFly(i){ if(OMV && OMV.pts && OMV.pts[i]) OMV.flyTo({center:[OMV.pts[i].lng, OMV.pts[i].lat], zoom:13}); }
  function omapClose(){ const ov = document.getElementById('cv-omap'); if(ov){ ov.style.display = 'none'; ov.innerHTML = ''; } try { if(OMV) OMV.remove(); } catch(e){} OMV = null; document.body.style.overflow = ''; }
  /* ══════════ 📍 Fiche d’un lieu : photo, résumé, horaires du jour prévu, accès ══════════
     Sources libres et sans clé : OpenStreetMap (horaires, site, téléphone, accessibilité) et Wikipédia (résumé, photo),
     dans la langue de l’appli. Ce qui est trouvé est gardé dans la fiche du lieu : disponible hors ligne et pour tout le groupe. */
  const OH_D = ['Mo','Tu','We','Th','Fr','Sa','Su'], OH_M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // horaires OpenStreetMap (« Mo-Fr 09:00-18:00; Sa 10:00-17:00; Su off ») → plages du jour donné ; null = inconnu
  function ohDay(oh, iso){
    if(!oh) return null; oh = String(oh).trim(); if(oh === '24/7') return ['00:00-24:00'];
    const dt = new Date(iso + 'T12:00:00'), wd = (dt.getDay() + 6) % 7, mo = dt.getMonth();
    let res = null, any = false;
    for(let rule of oh.split(';').map(s=>s.trim()).filter(Boolean)){
      rule = rule.replace(/\s*"[^"]*"\s*/g, ' ').trim();
      if(/^PH\b|^SH\b/.test(rule)) continue;
      // mois (« Apr-Oct ») en tête de règle
      const mm = rule.match(/^((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))?(?:,(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))?)*)\s*:?\s*/);
      if(mm){ const ok = mm[1].split(',').some(p=>{ const [a, b] = p.split('-').map(x=>OH_M.indexOf(x)); return b == null ? mo === a : a <= b ? mo >= a && mo <= b : mo >= a || mo <= b; }); rule = rule.slice(mm[0].length); if(!ok) continue;
        const dd = rule.match(/^(\d{1,2})(?:-(\d{1,2}))?(?=\s|$)/);   // « Dec 25 off » : un jour précis du mois
        if(dd){ const a = +dd[1], b = dd[2] ? +dd[2] : a, dn = dt.getDate(); if(dn < a || dn > b) continue; rule = rule.slice(dd[0].length).trim(); any = true; if(/^(off|closed)\b/i.test(rule)){ res = []; continue; } const tr = rule.match(/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\+?/g); if(tr) res = tr.map(x=>x.replace(/\s/g, '')); continue; } }
      const dm = rule.match(/^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?(?:\[[^\]]*\])?(?:,(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?(?:\[[^\]]*\])?)*)\s*/);
      let hit = true;
      if(dm){ hit = dm[1].replace(/\[[^\]]*\]/g, '').split(',').some(p=>{ const [a, b] = p.split('-').map(x=>OH_D.indexOf(x)); return b == null ? wd === a : a <= b ? wd >= a && wd <= b : wd >= a || wd <= b; }); rule = rule.slice(dm[0].length); }
      else if(!/^\d/.test(rule) && !/^(off|closed)$/i.test(rule)) continue;   // forme inconnue : ignorée
      if(!hit) continue;
      any = true;
      if(/^(off|closed)\b/i.test(rule)){ res = []; continue; }
      const tr = rule.match(/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\+?/g); if(tr) res = tr.map(x=>x.replace(/\s/g, ''));
    }
    return any ? (res || []) : null;
  }
  const ohNow = (ranges, hm) => (ranges || []).some(r=>{ const [a, b] = r.replace('+', '').split('-'); return hm >= a.padStart(5, '0') && hm < (b === '24:00' ? '24:00' : b.padStart(5, '0')); });
  async function placeLookup(p, city){
    const lang = (window.I18N && I18N.lang) || 'fr', info = {ts:Date.now()};
    // 1) OpenStreetMap : la fiche du lieu, avec ses étiquettes (horaires, site, téléphone…)
    try {
      let q = `${GEO}search?format=jsonv2&extratags=1&limit=1&accept-language=${lang}&q=` + encodeURIComponent(p.nom + (city && !normQ(p.nom).includes(normQ(city)) ? ', ' + city : ''));
      if(p.lat != null) q += `&viewbox=${p.lng - 0.03},${p.lat + 0.03},${p.lng + 0.03},${p.lat - 0.03}&bounded=1`;
      const j = await withTimeout(fetch(q).then(r=>r.json()), 9000), o = j && j[0];
      if(o){ const x = o.extratags || {};
        Object.assign(info, {oh:x.opening_hours || '', web:x.website || x['contact:website'] || x.url || '', tel:x.phone || x['contact:phone'] || '', wc:x.wheelchair || '', fee:x.fee || '', wiki:x.wikipedia || '', lat:+o.lat, lng:+o.lon}); }
    } catch(e){}
    // 2) Wikipédia : résumé et photo, dans la langue de l’appli si l’article existe, sinon en anglais
    try {
      let w = info.wiki ? wkParse(info.wiki) : null, data = null;
      const one = async (lg, title) => { const j = await withTimeout(fetch(`https://${lg}.wikipedia.org/w/api.php?action=query&prop=pageimages|extracts|langlinks&piprop=thumbnail&pithumbsize=640&exintro=1&explaintext=1&exsentences=4&lllang=${lang}&redirects=1&format=json&origin=*&titles=` + encodeURIComponent(title)).then(r=>r.json()), 9000); return Object.values((j.query||{}).pages||{})[0]; };
      if(!w){ const s = await withTimeout(fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json&origin=*&srsearch=` + encodeURIComponent(p.nom + ' ' + (city || ''))).then(r=>r.json()), 9000);
        const hit = ((s.query||{}).search||[])[0]; if(hit) w = {lang, title:hit.title}; }
      if(w){ data = await one(w.lang, w.title);
        const ll = data && (data.langlinks || [])[0]; if(w.lang !== lang && ll && ll['*']){ const d2 = await one(lang, ll['*']).catch(()=>null); if(d2 && d2.extract){ data = Object.assign(d2, {thumbnail: d2.thumbnail || data.thumbnail}); w = {lang, title:ll['*']}; } } }
      if(data && data.extract){ info.txt = data.extract.slice(0, 700); info.wl = w.lang; info.wt = data.title || w.title; }
      if(data && data.thumbnail) info.img = data.thumbnail.source;
    } catch(e){}
    return info;
  }
  async function plInfo(id, refresh, from){
    const p = R[id]; if(!p) return;
    const d = p.date || '', city = (d && dayCity(d)) || cityOf((trip() || {}).titre || '');
    // venu de la liste des suggestions : on y revient, et on peut ajouter ou écarter le lieu d’ici
    const sg = from === 'sugg' || (p.sugg && !planD);
    const back = sg ? `<button type="button" class="v-btn sec" onclick="CV.suggOpen()">← ${MSGT('Suggestions')}</button>` : planD ? `<button type="button" class="v-btn sec" onclick="CV.planDay('${ja(planD)}')">← ${esc(fdate(planD))}</button>` : '';
    const act = sg && p.sugg ? `<div class="pi-sg"><button type="button" class="v-btn" onclick="CV.suggKeep('${ja(id)}')">✓ ${MSGT('Ajouter au programme')}</button><button type="button" class="v-btn sec" onclick="CV.suggDrop('${ja(id)}')">✕ ${MSGT('Écarter')}</button></div>` : '';
    openSheet(`<h2>📍 ${esc(p.nom)}</h2>${p.exc ? `<div class="v-sum-small">🚌 ${MSGT('Excursion à la journée')} · ${p.exc} km</div>` : ''}<div id="pi-box" class="cv-route-load">📖 Recherche des informations…</div>${act}
      <div class="v-actions">${back}<button type="button" class="v-btn sec cv-sq" onclick="${sg ? 'CV.suggOpen()' : 'CV.close()'}" aria-label="Fermer">✕</button></div>`);
    let info = p.info;
    if(!info || refresh || Date.now() - (info.ts || 0) > 30 * 864e5){
      if(navigator.onLine !== false){ const got = await placeLookup(p, city);
        if(got.oh || got.txt || got.web || got.img){ info = got; const c = clone(R[id]); c.info = got; if(c.lat == null && got.lat){ c.lat = got.lat; c.lng = got.lng; } put(c, false); } else if(!info) info = got; }
    }
    const box = document.getElementById('pi-box'); if(!box || !R[id]) return; box.className = '';
    const P = R[id], I = info || {}, L = (window.I18N && I18N.locale) || 'fr-FR';
    // horaires du jour prévu (ou d’aujourd’hui)
    const day = d || isoToday(), rg = ohDay(I.oh, day), dayLbl = d ? fdate(d) : 'Aujourd’hui';
    let hours = '';
    if(I.oh){
      const today = rg == null ? '' : rg.length ? rg.join(', ') : 'Fermé';
      const now = !d || d === isoToday() ? (rg && rg.length ? (ohNow(rg, new Date().toTimeString().slice(0, 5)) ? ' · 🟢 Ouvert maintenant' : ' · 🔴 Fermé maintenant') : '') : '';
      const base = new Date(day + 'T12:00:00'), mon = addD(day, -((base.getDay() + 6) % 7));
      const week = [...Array(7).keys()].map(i=>{ const di = addD(mon, i), r = ohDay(I.oh, di); return `<tr${di === day ? ' class="on"' : ''}><td>${new Intl.DateTimeFormat(L, {weekday:'short'}).format(new Date(di + 'T12:00:00'))}</td><td>${r == null ? '?' : r.length ? r.join(', ') : 'Fermé'}</td></tr>`; }).join('');
      hours = `<div class="pi-oh"><b>🕘 ${esc(dayLbl)} : ${esc(today || '?')}${now}</b><table>${week}</table><small>${esc(I.oh)}</small></div>`;
    }
    // accès à pied depuis l’hôtel du jour
    let walk = '';
    try { const h = d ? items(i=>i.cat === 'hotel' && i.date && i.date <= d && (!i.dateFin || i.dateFin > d))[0] : null;
      if(h && P.lat != null){ const hc = await geocode(h.adresse || h.nom || h.titre, city).catch(()=>null);
        if(hc && km(hc, P) > 0.05){ const dk = km(hc, P) * 1.25, min = Math.round(dk / 4.5 * 60);
          walk = `<div class="pi-walk">🚶 ${fmtKm(dk)} · ≈ ${fmtMin(min)} à pied depuis l’hôtel <small>(${esc(h.nom || h.titre)})</small></div>`; } } } catch(e){}
    const q = P.lat != null ? P.lat + ',' + P.lng : (P.adresse || P.nom) + (city ? ', ' + city : '');
    const wurl = I.wt ? `https://${I.wl}.wikipedia.org/wiki/${encodeURIComponent(I.wt.replace(/ /g, '_'))}` : '';
    box.innerHTML = (I.img ? `<img class="wk-img" src="${esc(I.img)}" alt="">` : '')
      + (I.txt ? `<p class="wk-tx">${esc(I.txt)}</p>` : '')
      + hours + walk
      + (I.wc === 'yes' ? `<div class="v-sum-small">♿ Accessible en fauteuil roulant</div>` : I.wc === 'limited' ? `<div class="v-sum-small">♿ Accès en fauteuil limité</div>` : '')
      + (I.fee === 'no' ? `<div class="v-sum-small">🆓 Entrée gratuite</div>` : '')
      + (!I.oh && !I.txt ? `<div class="v-sum-small">Pas d’horaires ni de description trouvés pour ce lieu.</div>` : '')
      + `<div class="cv-row" style="gap:6px;flex-wrap:wrap;margin-top:8px">
          <a class="v-day-edit" href="https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${encodeURIComponent(q)}" target="_blank" rel="noopener">🧭 Itinéraire</a>
          ${safeUrl(I.web) ? `<a class="v-day-edit" href="${esc(safeUrl(I.web))}" target="_blank" rel="noopener">🌐 Site officiel</a>` : ''}
          ${I.tel ? `<a class="v-day-edit" href="tel:${esc(I.tel.split(';')[0].replace(/[^\d+]/g, ''))}">📞 Appeler</a>` : ''}
          ${wurl ? `<a class="v-day-edit" href="${wurl}" target="_blank" rel="noopener">📖 Wikipédia</a>` : ''}
          <button type="button" class="v-day-edit" onclick="CV.plInfo('${ja(id)}', true)">🔄 Actualiser</button></div>`
      + `<div class="v-sum-small" style="margin-top:8px">Infos : OpenStreetMap${I.txt ? ' et Wikipédia (CC BY-SA)' : ''}. Horaires à confirmer sur place ou sur le site du lieu. ${I.ts ? 'Mises à jour le ' + new Date(I.ts).toLocaleDateString(L) + ', disponibles hors ligne.' : ''}</div>`;
  }

  /* ---------- 📴 Fiche du jour ---------- */
  function tlDay(){
    const ds = tlDays(); if(!ds.length){ alert('Ajoute d’abord les dates du voyage.'); return; }
    const td = isoToday(); let i = ds.indexOf(td); if(i < 0) i = td < ds[0] ? 0 : ds.length - 1;
    const show = ds.slice(i, i+2);
    const tel = s => s ? `<a href="tel:${esc(String(s).replace(/[^+\d]/g,''))}">☎ ${esc(s)}</a>` : '';
    const map = s => s ? `<a href="https://maps.apple.com/?q=${encodeURIComponent(s)}">📍 ${esc(s)}</a>` : '';
    let h = `<h2>📴 Fiche du jour</h2><div class="v-sum-small" style="margin-bottom:8px">Enregistrée dans ton téléphone : elle s’ouvre même sans réseau. Astuce : fais une capture d’écran avant de partir.</div>`;
    show.forEach(d=>{
      const k = ds.indexOf(d), info = dayInfo(d), {own, night} = itemsForDay(d);
      h += `<div class="cv-dayc"><h3>${PJ(k+1)} · ${longDate(d)}${info.titre ? ' — ' + esc(info.titre) : ''}</h3>`;
      if(info.plan) h += `<p class="v-sum-small">${esc(info.plan)}</p>`;
      [...own, ...night].forEach(it=>{
        h += `<div class="cv-dayi"><b>${icon(it)} ${esc(it.titre)}</b>${it.heureDep||it.heure ? ` · ${esc(it.heureDep||it.heure)}${it.heureArr ? ' → ' + esc(it.heureArr) : ''}` : ''}
          <div>${[it.compagnie, it.nom && it.cat==='hotel' ? it.nom : '', it.ref ? 'Réf. <b>' + esc(it.ref) + '</b>' : ''].filter(Boolean).map(x=>x.startsWith('Réf.') ? x : esc(x)).join(' · ')}</div>
          <div class="cv-dayl">${map(it.adresse)} ${tel(it.tel)} ${safeUrl(it.lien) ? `<a href="${esc(safeUrl(it.lien))}" target="_blank" rel="noopener">🔗 réservation</a>` : ''}</div>${pjChips(it)}</div>`;
      });
      const pl = placesOf(d); if(pl.length) h += `<div class="v-sum-small">À voir : ${pl.map((p,n)=>`${n+1}. ${esc(p.nom)}`).join(' · ')}</div>`;
      if(!own.length && !night.length && !pl.length) h += `<div class="v-sum-small">Rien de prévu.</div>`;
      h += `</div>`;
    });
    h += `<div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`;
    openSheet(h); hydrate();
  }

  /* ---------- 🔔 Rappels dans le calendrier (même mécanisme que le menu de SimulHeures) ----------
     Pas de notification de l'appli : les rappels vont dans le calendrier du téléphone.
     • iPhone (Safari / appli installée) : l'appli ouvre une vraie adresse « rappels.ics » fabriquée
       sur le téléphone par le service worker → Calendrier s'ouvre et propose « Ajouter tout ».
     • Sinon, ou en secours : le fichier .ics est envoyé par le menu Partager (Mail, Fichiers…). */
  const ICS_KINDS = [['ech','💶 Échéances de paiement (la veille)'], ['chk','🛫 Enregistrement en ligne (24 h avant le vol)'], ['vol','✈️ Vols et trajets (alerte 3 h avant)'], ['htl','🏨 Arrivées à l’hôtel'], ['act','🎟️ Visites et réservations à heure fixe']];
  const rpIsIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function tlIcsBuild(on){
    const t = trip(), ev = [], z = n => String(n).padStart(2,'0'), dt = iso => iso.replace(/-/g,'');
    const stampNow = new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z');
    const esc2 = s => String(s||'').replace(/\\/g,'\\\\').replace(/[,;]/g, m=>'\\' + m).replace(/\n/g,'\\n');
    const add = (uid, sum, start, allDay, desc, alarm) => ev.push(['BEGIN:VEVENT', 'UID:' + uid + '@carnet-voyage', 'DTSTAMP:' + stampNow,
      allDay ? 'DTSTART;VALUE=DATE:' + start : 'DTSTART:' + start, allDay ? '' : 'DURATION:PT30M', 'SUMMARY:' + esc2(sum), desc ? 'DESCRIPTION:' + esc2(desc) : '',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc2(sum), 'TRIGGER:' + (alarm || '-PT2H'), 'END:VALARM', 'END:VEVENT'].filter(Boolean).join('\r\n'));
    items().forEach(it=>{
      if(on.ech) (it.echeances||[]).forEach((e,k)=>{ if(e.fait || !e.date) return; const d = e.date.length === 7 ? e.date + '-05' : e.date;
        add('ech-' + it.id + '-' + k, '💶 ' + (it.titre||'Paiement') + ' : ' + eur(num(e.montant)), dt(d), true, t.titre, '-P1D'); });
      if(it.cat==='transport' && it.date && it.heureDep){
        if(on.chk && it.mode==='Avion'){ const d = new Date(it.date + 'T' + it.heureDep + ':00'); d.setDate(d.getDate() - 1);
          add('chk-' + it.id, '🛫 Enregistrement en ligne : ' + it.titre + (it.compagnie ? ' (' + it.compagnie + ')' : ''), d.getFullYear() + z(d.getMonth()+1) + z(d.getDate()) + 'T' + z(d.getHours()) + z(d.getMinutes()) + '00', false, it.ref ? 'Réf. ' + it.ref : '', '-PT0M'); }
        if(on.vol) add('vol-' + it.id, icon(it) + ' ' + it.titre + (it.compagnie ? ' · ' + it.compagnie : ''), dt(it.date) + 'T' + it.heureDep.replace(':','') + '00', false, [it.ref ? 'Réf. ' + it.ref : '', it.adresse].filter(Boolean).join(' · '), '-PT3H');
      }
      if(on.htl && it.cat==='hotel' && it.date) add('htl-' + it.id, '🏨 Arrivée : ' + (it.nom || it.titre), it.heure ? dt(it.date) + 'T' + it.heure.replace(':','') + '00' : dt(it.date), !it.heure, [it.adresse, it.ref ? 'Réf. ' + it.ref : ''].filter(Boolean).join(' · '), it.heure ? '-PT2H' : '-PT9H');
      if(on.act && it.cat==='activite' && it.date && it.heure) add('act-' + it.id, '🎟️ ' + it.titre, dt(it.date) + 'T' + it.heure.replace(':','') + '00', false, it.adresse || '', '-PT1H');
    });
    return {n: ev.length, txt: ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Vezoria//Rappels//FR','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:' + esc2(t.titre), ...ev, 'END:VCALENDAR'].join('\r\n')};
  }
  function tlIcs(){
    const t = trip(); if(!t) return;
    const on = M.icsOn || {ech:1, chk:1, vol:1, htl:1, act:1};
    openSheet(`<h2>📅 Rappels dans mon calendrier</h2>
      <div class="v-sum-small" style="margin-bottom:8px">Tes rappels vont dans le calendrier de ton téléphone. Tu les modifies ou les supprimes là-bas, comme tes autres rendez-vous.</div>
      <div class="v-f">${ICS_KINDS.map(([k,l])=>`<label class="cv-checkline"><input type="checkbox" id="ics-${k}"${on[k]?' checked':''}> ${l}</label>`).join('')}</div>
      <div id="ics-msg" class="v-sum-small" style="margin:6px 0"></div>
      <button type="button" class="v-btn" onclick="CV.tlIcsGo()">📅 Ajouter à mon calendrier</button>
      <button type="button" class="v-btn sec" id="ics-share" style="${rpIsIOS() ? 'display:none' : ''}" onclick="CV.tlIcsGo(true)">📤 Envoyer le fichier (Mail, Fichiers…)</button>
      <div class="v-sum-small" style="text-align:center;margin-top:6px">Pour arrêter un rappel, supprime-le dans ton calendrier.</div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  const icsMsg = (m, ok) => { const e = document.getElementById('ics-msg'); if(e){ e.innerHTML = m; e.style.color = ok ? '#15803d' : '#b45309'; } };
  const rpB64 = txt => btoa(unescape(encodeURIComponent(txt))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  function tlIcsGo(share){
    const on = {}; ICS_KINDS.forEach(([k])=>{ const e = document.getElementById('ics-' + k); on[k] = e && e.checked ? 1 : 0; });
    M.icsOn = on; persist();
    const r = tlIcsBuild(on);
    if(!r.n){ icsMsg('Rien à rappeler : coche au moins un type, ou ajoute des dates, des horaires ou un échéancier à tes fiches.'); return; }
    const t = trip(), fn = 'rappels-' + (t.titre||'voyage').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') + '.ics';
    const iosOther = rpIsIOS() && /CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent || '');   // Chrome, Firefox… sur iPhone n'ouvrent pas Calendrier
    if(rpIsIOS() && !iosOther && !share){
      const sh = document.getElementById('ics-share'); if(sh) sh.style.display = 'block';
      if(!(navigator.serviceWorker && navigator.serviceWorker.controller)){ icsMsg('Ouverture directe pas encore prête (l’appli doit avoir été ouverte une fois avec du réseau). Utilise « Envoyer le fichier » → Mail vers toi, puis touche le fichier.'); return; }
      icsMsg(`Ouverture de Calendrier… touche <b>« Ajouter tout »</b> (${r.n} rappel${r.n>1?'s':''}).`, true);
      location.href = 'rappels.ics?c=' + rpB64(r.txt);
      return;
    }
    const f = new File([r.txt], fn, {type:'text/calendar'});
    if(navigator.share && navigator.canShare && navigator.canShare({files:[f]})){
      navigator.share({files:[f], title:'Rappels ' + (t.titre||'')}).then(()=>icsMsg(`${r.n} rappel(s) prêt(s). Choisis Calendrier ou ton agenda pour les ajouter.`, true))
        .catch(e=>{ if(e && e.name === 'AbortError') icsMsg('Ajout annulé.'); else tlShareFile(f, fn); });
      return;
    }
    tlShareFile(f, fn); icsMsg(`${r.n} rappel(s) prêt(s) : ouvre le fichier ${esc(fn)} pour les ajouter à ton calendrier.`, true);
  }

  /* ---------- 💱 Devises ---------- */
  const FX_LIST = ['USD','GBP','CHF','JPY','MAD','EGP','TND','TRY','THB','CAD','AUD','NZD','SEK','NOK','DKK','ISK','CZK','HUF','PLN','RON','BGN','MXN','BRL','ARS','CNY','HKD','KRW','INR','IDR','VND','PHP','SGD','MYR','AED','QAR','ILS','JOD','ZAR','KES','XOF','XPF'];
  const fxOpts = sel => ['EUR'].concat(FX_LIST).filter(c=>c!==curCode()).map(c=>`<option${c===sel?' selected':''}>${c}</option>`).join('');
  async function fxRates(){
    if(M.fx && Date.now() - M.fx.t < 12*3600e3) return M.fx.rates;
    let rates = null;
    try { const r = await fetch('https://open.er-api.com/v6/latest/EUR'); const j = await r.json(); if(j && j.rates) rates = j.rates; } catch(e){}
    if(!rates) try { const r = await fetch('https://api.frankfurter.app/latest?from=EUR'); const j = await r.json(); if(j && j.rates) rates = Object.assign({EUR:1}, j.rates); } catch(e){}
    if(rates){ M.fx = {t:Date.now(), rates}; persist(); return rates; }
    if(M.fx) return M.fx.rates;   // hors ligne : derniers taux connus
    throw new Error('Taux de change indisponibles (pas de réseau ?).');
  }
  async function fxToEur(amount, cur){ const r = Object.assign({EUR:1}, await fxRates()), h = curCode(); if(!r[cur] || !r[h]) throw new Error('Devise non disponible : ' + (r[cur] ? h : cur)); return amount / r[cur] * r[h]; }
  async function fxTool(){
    if(!document.getElementById('fxo-a')){   // appelé hors de l’onglet Outils (Budget, moment « arrivée ») : petite fenêtre de conversion
      openSheet(`<h2>💱 Convertir</h2><div class="v-sum-small" style="margin-bottom:8px">Saisis un montant en monnaie locale : il est converti dans la devise du voyage, au taux du jour.</div>
        <div class="cv-fx"><input class="v-in" id="fxo-a" inputmode="decimal" placeholder="Montant" oninput="CV.fxTool()"><select class="v-in" id="fxo-c" onchange="CV.fxTool()">${fxOpts(M.fxLast||'USD')}</select><button type="button" class="v-btn sec" onclick="CV.fxTool()">= ${CS()}</button></div>
        <div class="v-sum-small" id="fxo-r" style="font-size:1rem;margin-top:6px"></div>
        <div class="v-actions"><button type="button" class="v-btn" onclick="CV.tlReceipt()">🧾 En faire une dépense</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
      setTimeout(()=>{ const i = document.getElementById('fxo-a'); if(i) i.focus(); }, 60); return;
    }
    const a = num((document.getElementById('fxo-a')||{}).value), c = (document.getElementById('fxo-c')||{}).value, out = document.getElementById('fxo-r');
    if(!a){ out.textContent = 'Saisis un montant.'; return; }
    try { const e = await fxToEur(a, c); M.fxLast = c; persist(); out.innerHTML = `<b>${a.toLocaleString((window.I18N ? I18N.locale : 'fr-FR'))} ${c} = ${eur(e)}</b> · taux du ${new Date(M.fx.t).toLocaleDateString((window.I18N ? I18N.locale : 'fr-FR'))}`; }
    catch(e){ out.textContent = '⚠️ ' + e.message; }
  }
  async function fxFill(){
    const a = num((document.getElementById('fx-a')||{}).value), c = (document.getElementById('fx-c')||{}).value, f = document.querySelector('#v-form [name=prix]');
    if(!a || !f) return;
    try { const e = await fxToEur(a, c); M.fxLast = c; persist(); f.value = String(Math.round(e*100)/100).replace('.', ','); f.dispatchEvent(new Event('input', {bubbles:true}));
      const n = document.getElementById('fx-n'); if(n) n.textContent = `${a.toLocaleString((window.I18N ? I18N.locale : 'fr-FR'))} ${c} ≈ ${eur(e)} (taux du ${new Date(M.fx.t).toLocaleDateString((window.I18N ? I18N.locale : 'fr-FR'))})`; }
    catch(e){ alert(e.message); }
  }
