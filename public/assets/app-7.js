/* Vezoria — code de l’appli, partie 7/8 (chargées dans l’ordre par index.html, même portée globale) */


  /* ══════════ 🧵 Fil d’Ariane de la préparation : Où et quand → Que faire → Réserver → Finaliser ══════════ */
  const okB = i => i.statut === 'booked' || i.statut === 'paid';
  function ariData(t){
    const hs = items(i=>i.cat === 'hotel' && i.date).sort((a, b)=>a.date.localeCompare(b.date));
    const trs = items(i=>i.cat === 'transport').sort((a, b)=>(a.date || '9').localeCompare(b.date || '9'));
    const pl = list('place', p=>p.trip === t.id), sg = pl.filter(p=>p.sugg), sk = (M.ariSkip || {})[t.id] || {};
    const xs = items(i=>i.cat === 'activite' && i.exp);
    const rs = [...hs, ...trs, ...xs].sort((a, b)=>(a.date || '9').localeCompare(b.date || '9') || (a.cat === 'transport' ? -1 : 1));
    const di = (()=>{ try { return docIssues(); } catch(e){ return []; } })();
    let fm = []; try { const from = bagFromDefault(), dest = [...new Set([...tlStages().map(x=>((M.ctry || {})[normQ(x.city)] || {}).cc).filter(Boolean), ...bagCcs()])], dn = (M.fmDone || {})[t.id] || {};
      dest.forEach(cc=>entryRules(cc, from).x.filter(x=>!/CEAM/.test(x)).forEach(x=>fm.push({l:x, done:!!dn[x]}))); } catch(e){}
    const ck = list('check', c=>c.trip === t.id), ckd = ck.filter(c=>chkDone(c)).length;
    const nd = t.debut ? Math.max(1, nights(t.debut, t.fin || t.debut)) : 0;
    const S = [
      {k:'ou', ic:'📍', l:'Où et quand', ok: !!t.debut && hs.length > 0, f: (t.debut ? .5 : 0) + (hs.length ? .5 : 0)},
      {k:'faire', ic:'🎟️', l:'Que faire', ok: (pl.length > 0 && !sg.length) || !!sk.faire || (nd > 0 && pl.length - sg.length >= nd), f: sk.faire ? 1 : nd ? Math.min(1, (pl.length - sg.length) / nd) : pl.length ? (pl.length - sg.length) / pl.length : 0},   // 1 lieu gardé par jour suffit : les suggestions pas triées ne comptent pas contre toi
      {k:'resa', ic:'🛏️', l:'Réserver', ok: rs.length > 0 && rs.every(okB), f: rs.length ? rs.filter(okB).length / rs.length : 0, w:2},
      {k:'fin', ic:'✅', l:'Finaliser', ok: !di.length && fm.every(x=>x.done) && (!ck.length || ckd === ck.length), f: (()=>{ const p = []; if(ck.length) p.push(ckd / ck.length); if(fm.length) p.push(fm.filter(x=>x.done).length / fm.length); if(di.length) p.push(0); return p.length ? p.reduce((a, b)=>a + b, 0) / p.length : 1; })(), w:1}
    ];
    return {hs, trs, pl, sg, rs, di, fm, ck, ckd, S};
  }
  function ariLink(it, t){
    if(hidden('blk:book')) return '';
    const n = Math.max(1, (t.voyageurs || []).length), c = cityOf(it.titre || '') || it.titre || '';
    let k = null, ctx = {};
    if(it.cat === 'hotel'){ k = 'booking'; const sc = stayCity(it) || c, hd = (M.hood || {})[it.id]; ctx = {what:hd && hd.name && normQ(hd.name) !== normQ(sc) ? hd.name + ', ' + sc : sc, date:it.date, end:it.dateFin, n}; }
    else if(it.cat === 'activite'){ k = 'gyg'; ctx = {what:it.q || it.titre}; }
    else if(/Avion/i.test(it.mode || '')){ k = 'gflights'; ctx = {from:it.from || '', to:it.to || '', date:it.date || ''}; }
    else if(/Ferry|Bateau/i.test(it.mode || '')) k = 'directferries';
    else if(!/Voiture|Moto|Vélo|Pied/i.test(it.mode || '')){ k = 'rome2rio'; ctx = {from:it.from || '', to:it.to || ''}; }
    return k && BK[k] ? `<a class="ar-bk" href="${esc(bookUrl(k, ctx))}" target="_blank"${bookRel(k)} onclick="event.stopPropagation()">${MSGT('Réserver')} · ${BK[k][1]}</a>` : '';
  }
  const ARI_ANIM = {};
  function ariHTML(){
    const t = trip(); if(!t || t.archived || tripPhase(t) !== 'prep' || hidden('blk:prep')) return '';
    const D = ariData(t), S = D.S, done = S.filter(x=>x.ok).length, pct = Math.round(S.reduce((a, x)=>a + (x.ok ? 1 : x.f) * (x.w || 1), 0) / S.reduce((a, x)=>a + (x.w || 1), 0) * 100);   // réserver compte double
    const cur = S.find(x=>!x.ok), op = SG && SG.tid === t.id ? 'faire' : ((M.ariOpen || {})[t.id]) || (cur && cur.k);
    const compact = !(SG && SG.tid === t.id) && !(M.ariFull || {})[t.id] && !((M.ariOpen || {})[t.id] && (M.ariOpen || {})[t.id] !== '-'), nx = compact ? ariNext(t, D, cur) : null;
    const lv = pct >= 100 ? ['✅','Prêt à partir'] : pct >= 75 ? ['🎒','Presque prêt'] : pct >= 45 ? ['🧩','En préparation'] : pct >= 15 ? ['✏️','Esquisse'] : ['💭','Rêve'];
    const A = [26, 92], B = [180, -4], C = [334, 92], path = `M${A} Q${B} ${C}`, tp = Math.max(.02, pct / 100), anim = ARI_ANIM[t.id] !== pct; ARI_ANIM[t.id] = pct;   // ✈️ l’avion ne repart que si l’avancement change
    const q = u => [(1-u)*(1-u)*A[0] + 2*(1-u)*u*B[0] + u*u*C[0], (1-u)*(1-u)*A[1] + 2*(1-u)*u*B[1] + u*u*C[1]];
    const co = D.hs[0] ? (M.ctry || {})[normQ(stayCity(D.hs[0]))] : null, fd = d => d ? fshort(d) : '';
    const body = k => {
      if(k === 'ou'){   // ① les pays, les villes et les dates (pas les hôtels : ils se réservent à l’étape ③)
        const st = tlStages(), ccs = [...new Set(st.map(x=>((M.ctry || {})[normQ(x.city)] || {}).cc).filter(Boolean))];
        if(st.some(x=>!(M.ctry || {})[normQ(x.city)])) setTimeout(ariCtry, 300);
        return `<div class="ar-ou">${t.debut ? `<b>${fdate(t.debut)} → ${fdate(t.fin || t.debut)}</b> <button type="button" class="ar-more" onclick="CV.datesSheet()">📅 ${MSGT('Modifier')}</button>` : `<button type="button" class="ar-go" onclick="CV.datesSheet()">📅 ${MSGT('Choisir les dates')}</button>`}
          ${(()=>{ const H = tripHols(t); return H.length ? `<div class="ar-hol">🎌 ${H.length} ${MSGT('jour(s) férié(s) pendant ton voyage')} : ${H.slice(0, 3).map(x=>`${fshort(x.d)} ${flag(x.cc)} <span data-notr>${esc(x.n)}</span>`).join(' · ')}${H.length > 3 ? ' …' : ''}</div>` : ''; })()}
          ${ccs.length ? `<div class="ar-st">🌍 ${ccs.map(cc=>`${flag(cc)} <span data-notr>${esc(ccName(cc))}</span>`).join(' · ')}</div>` : ''}
          ${st.length ? `<div class="ar-st">${st.map(x=>`📍 <span data-notr>${esc(x.city)}</span> <small>${fd(x.debut)} → ${fd(x.fin)} · ${nights(x.debut, x.fin || x.debut)} ${MSGT('nuits')}</small>`).join('<br>')}</div>` : ''}
          <button type="button" class="ar-go" onclick="CV.ariCity()">📍 ${MSGT(st.length ? 'Ajouter une ville' : 'Ajouter les villes du voyage')}</button></div>`;
      }
      if(k === 'faire'){   // ① choisir (swipe ville par ville, visites + activités payantes) → ② ranger dans les jours (ordre du trajet)
        const xn = expCount(t), pk = rgItems(t).length, nA = D.sg.length + xn;
        const more = `<button type="button" class="ar-more" onclick="CV.suggMore()">＋ ${MSGT('Nouvelles suggestions')}</button>`;
        const subA = `<button type="button" class="ar-sub${nA ? ' cur' : ' ok'}" onclick="CV.suggOpen()"${nA ? '' : ' disabled'}><i>${nA ? '①' : '✓'}</i><span><b>${MSGT('Choisir mes visites')}</b><small>${nA ? RF('{0} idées à trier, ville par ville', nA) : MSGT('Tout est trié')}</small></span></button>`;
        const subB = `<button type="button" class="ar-sub${pk ? (nA ? '' : ' cur') : ' ok'}" onclick="CV.rgOpen()"${pk ? '' : ' disabled'}><i>${pk ? '②' : '✓'}</i><span><b>${MSGT('Ranger mes visites dans les jours')}</b><small>${pk ? RF('{0} à placer, dans l’ordre du trajet', pk) : MSGT('Rien à ranger pour l’instant')}</small></span></button>`;
        if(SG && SG.tid === t.id) return `<div class="ar-run">${sgRun(t)}</div>${D.sg.length ? `<div class="ar-subs">${subA}</div>` : ''}`;   // dans son cadre (sinon texte blanc sur fond blanc)
        if(!D.pl.length && !nA && !pk) return `<div class="ar-p">${MSGT('Les lieux à voir et les excursions, jour par jour.')}</div>${D.hs.length ? `<button type="button" class="ar-go" onclick="CV.suggGo()">💡 ${MSGT('Me proposer les incontournables (4 par jour)')}</button>` : ''}<button type="button" class="ar-sk" onclick="CV.ariSkip('faire')">${MSGT('Passer cette étape')}</button>`;
        const redo = !pk && D.pl.length - D.sg.length > 1 ? `<button type="button" class="ar-more" onclick="CV.rgRedo()">🏨 ${MSGT('Réorganiser depuis mon hôtel')}</button>` : '';
        return `<div class="ar-p">✓ ${D.pl.length - D.sg.length} ${MSGT('lieux au programme')}</div><div class="ar-subs">${subA}${subB}</div>${more}${redo}${D.sg.length && !((M.ariSkip || {})[t.id] || {}).faire ? `<button type="button" class="ar-sk" onclick="CV.ariSkip('faire')">${MSGT('C’est bon, j’ai assez de visites')}</button>` : ''}`;
      }
      if(k === 'resa'){
        if(!D.rs.length) return `<div class="ar-p">${MSGT('Ajoute d’abord tes étapes : les nuits et les trajets apparaîtront ici.')}</div>`;
        return `<div class="ar-rs">${D.rs.map(it=>`<div class="ar-r${okB(it) ? ' ok' : ''}" role="button" onclick="CV.edit('${ja(it.id)}')"><i>${okB(it) ? '✓' : it.cat === 'hotel' ? '🛏️' : icon(it)}</i>
          <span><b data-notr>${esc(it.cat === 'hotel' ? (cityOf(it.titre) || it.titre) : it.titre)}</b><small>${it.cat === 'hotel' ? `${fd(it.date)} → ${fd(it.dateFin)} · ${nights(it.date, it.dateFin || it.date)} ${MSGT('nuits')}` : fd(it.date)}</small></span>
          ${okB(it) ? '' : `<div class="ar-ra">${ariLink(it, t)}<button type="button" onclick="event.stopPropagation();CV.ariBook('${ja(it.id)}')">${MSGT('C’est réservé')}</button></div>`}</div>` + (okB(it) ? '' : it.cat === 'hotel' ? hoodHTML(it, t) : it.cat === 'transport' ? aptHTML(it, t) : '')).join('')}</div>`;
      }
      const rows = [
        `<button type="button" class="ar-f" onclick="CV.avantSheet()"><i>🧭</i><span>${MSGT('Avant de partir')}</span><small>${MSGT('papiers, santé, argent, urgences')}</small></button>`,
        ...D.di.map(x=>`<button type="button" class="ar-f bad" onclick="CV.tlDocs()"><i>⚠️</i><span>${esc(x)}</span></button>`),
        ...D.fm.map(x=>`<button type="button" class="ar-f${x.done ? ' ok' : ''}" data-fm="${esc(x.l)}" onclick="CV.ariFm(this)"><i>${x.done ? '✅' : '🛂'}</i><span>${esc(x.l)}</span></button>`),
        `<button type="button" class="ar-f${D.ck.length && D.ckd === D.ck.length ? ' ok' : ''}" onclick="CV.tab('check')"><i>🧳</i><span>${MSGT('Valise et checklist')}</span><small>${D.ck.length ? D.ckd + '/' + D.ck.length : ''}</small></button>`,
        `<button type="button" class="ar-f" onclick="CV.socialHub()"><i>👥</i><span>${MSGT('Compagnons et abonnés')}</span><small>${(t.voyageurs || []).filter(prof).length}</small></button>`,
        `<div class="ar-pr"><b>🖨️ ${MSGT('Imprimer ou exporter (PDF)')}</b><div>${[['iti','🗺️','Itinéraire'], ['resa','🎫','Réservations'], ['budget','💶','Budget et répartition'], ['recap','📋','Récap des étapes']].map(([k, ic, l], i)=>`<button type="button" onclick="CV.pdfPart('${ja(k)}')"><small>${i + 1}</small>${ic} ${MSGT(l)}</button>`).join('')}</div></div>`];
      return `<div class="ar-fs">${rows.join('')}</div>${cdIns(t)}`;
    };
    const ms = t.debut ? cdLeft(t) : 0, cdOn = !!t.debut && !t.demo && ms > -864e5 && ms <= 400 * 864e5 && !hidden('blk:cd');
    const dj = t.debut ? Math.max(0, nights(isoToday(), t.debut)) : 0, dest = cdDest(t), dco = (M.ctry || {})[normQ(dest)] || co;
    return `<div class="cv-prep2 ar${cdOn ? ' ar-cd' : ''}${anim ? '' : ' still'}"${cdOn ? ` id="cd" data-at="${Date.now() + ms}" data-city="${esc(dest)}"` : ''}>
      ${cdOn ? `<div class="ar-top"><span>${dj === 0 ? '🧳 ' + MSGT('C’est aujourd’hui !') : dj === 1 ? '✈️ ' + MSGT('Départ demain') : '⏳ ' + MSGT('Départ dans')}</span><span class="cd-wx" id="cd-wx"></span></div>
      <div class="ar-j"><b>${dj === 0 ? MSGT('Jour J') : 'J-' + dj}</b><span class="cd-dest">${dco && dco.cc ? flag(dco.cc) + ' ' : '📍 '}<span data-notr>${esc(dest)}</span></span></div>
      <div class="cd-clock ar-clock" id="cd-clock">${cdClock(ms)}</div>` : ''}
      <div class="p2-top ar-lv"><div><div class="p2-k">${MSGT('Ta préparation')}</div><div class="p2-l">${lv[0]} ${MSGT(lv[1])}</div></div><div class="p2-pct"><b>${pct}</b><small>%</small></div></div>
      ${compact ? `<div class="ar-seg">${S.map(x=>`<button type="button" class="${x.ok ? 'ok' : cur && cur.k === x.k ? 'cur' : ''}" onclick="CV.ariTog('${ja(x.k)}')"><i style="--f:${x.ok ? 100 : Math.round(x.f * 100)}%"></i><span>${MSGT(x.l)}${x.ok ? ' ✓' : ''}</span></button>`).join('')}</div>
      ${nx ? `<div class="ar-nx"><div class="ar-nk">${MSGT('Ta prochaine étape')}</div><button type="button" class="ar-sub cur" onclick="${nx.fn}"><i>${nx.ic}</i><span><b>${nx.b}</b><small>${nx.s}</small></span></button></div>` : `<div class="p2-msg">✨ ${MSGT('Tout est prêt, il ne reste qu’à partir !')}</div>`}
      <button type="button" class="ar-all" onclick="CV.ariFull(1)">${MSGT('Voir les 4 étapes en détail')} ▾</button></div>` : `
      <svg class="p2-svg" viewBox="0 0 360 112" aria-hidden="true">
        <path d="${path}" class="p2-base"/><path d="${path}" class="p2-prog" pathLength="100" style="--p:${pct}"/>
        ${S.map((x, i)=>{ const [cx, cy] = q((i + 1) / (S.length + 1)); return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${x.ok ? 6 : 4.5}" class="${x.ok ? 'on' : ''}" style="animation-delay:${(i * .12).toFixed(2)}s"/>`; }).join('')}
        <text x="${A[0]}" y="${A[1] + 18}" text-anchor="middle" class="p2-end">🏠</text><text x="${C[0]}" y="${C[1] + 18}" text-anchor="middle" class="p2-end">${co && co.cc ? flag(co.cc) : '📍'}</text>
        <g class="p2-plane"><text x="-12" y="8" font-size="24" transform="rotate(45)">✈️</text>
          <animateMotion dur="${anim ? '1.8s' : '0.001s'}" fill="freeze" keyPoints="${anim ? 0 : tp.toFixed(3)};${tp.toFixed(3)}" keyTimes="0;1" calcMode="spline" keySplines=".2 .7 .2 1" rotate="auto" path="${path}"/></g>
      </svg>
      <div class="ar-steps">${S.map((x, i)=>{ const o = op === x.k, st = x.ok ? 'ok' : cur && cur.k === x.k ? 'cur' : 'next';
        return `<div class="ar-s ${st}${o ? ' open' : ''}"><button type="button" class="ar-h" onclick="CV.ariTog('${ja(x.k)}')"><i>${x.ok ? '✓' : i + 1}</i><span>${x.ic} ${MSGT(x.l)}</span><small>${x.ok ? '' : Math.round(x.f * 100) + ' %'}</small><em>${o ? '▾' : '▸'}</em></button>
          ${o ? `<div class="ar-b">${body(x.k)}</div>` : ''}</div>`; }).join('')}</div>
      ${cur ? '' : `<div class="p2-msg">✨ ${MSGT('Tout est prêt, il ne reste qu’à partir !')}</div>`}
      <button type="button" class="ar-all" onclick="CV.ariFull(0)">${MSGT('Réduire')} ▴</button></div>`}`;
  }
  // 🧹 la carte de préparation : repliée sur « ta prochaine étape » (une seule action) ; le détail des 4 étapes à la demande
  function ariNext(t, D, cur){
    if(!cur) return null; const n = (D.sg || []).length + expCount(t), pk = rgItems(t).length;
    if(cur.k === 'ou'){ if(!t.debut) return {ic:'📅', b:MSGT('Choisir les dates'), s:MSGT('Le départ et le retour'), fn:'CV.datesSheet()'};
      return {ic:'📍', b:MSGT('Ajouter les villes du voyage'), s:MSGT('Où tu dors, et combien de nuits'), fn:'CV.ariCity()'}; }
    if(cur.k === 'faire'){ if(n) return {ic:'💡', b:MSGT('Choisir mes visites'), s:RF('{0} idées à trier, ville par ville', n), fn:'CV.suggOpen()'};
      if(pk) return {ic:'🗓️', b:MSGT('Ranger mes visites dans les jours'), s:RF('{0} à placer, dans l’ordre du trajet', pk), fn:'CV.rgOpen()'};
      if(D.hs.length) return {ic:'💡', b:MSGT('Me proposer les incontournables (4 par jour)'), s:MSGT('Les lieux à voir et les excursions, jour par jour.'), fn:'CV.suggGo()'};
      return {ic:'🧩', b:MSGT('Que faire'), s:MSGT('Les lieux à voir et les excursions, jour par jour.'), fn:"CV.ariTog('faire')"}; }
    if(cur.k === 'resa'){ const it = (D.rs || []).find(x=>!okB(x)), left = (D.rs || []).filter(x=>!okB(x)).length;
      if(it) return {ic:it.cat === 'hotel' ? '🛏️' : icon(it), b:MSGT('Réserver') + ' : ' + esc(it.cat === 'hotel' ? (cityOf(it.titre) || it.titre) : it.titre), s:(it.date ? fshort(it.date) + ' · ' : '') + RF('{0} à réserver', left), fn:"CV.ariTog('resa')"}; }
    if(cur.k === 'fin') return {ic:'🧭', b:MSGT('Avant de partir'), s:MSGT('Papiers, valise et derniers détails'), fn:'CV.avantSheet()'};
    return {ic:cur.ic, b:MSGT(cur.l), s:Math.round(cur.f * 100) + ' %', fn:`CV.ariTog('${ja(cur.k)}')`};
  }
  function ariFull(on){ const t = trip(); if(!t) return; M.ariFull = M.ariFull || {}; if(on) M.ariFull[t.id] = 1; else { delete M.ariFull[t.id]; if(M.ariOpen) delete M.ariOpen[t.id]; } persist(); const y = window.scrollY; render(); window.scrollTo(0, y); }
  // ① ajouter une ville : le nom, l’arrivée et le nombre de nuits (l’hébergement « à réserver » est créé, il se réserve à l’étape ③)
  function ariCity(){
    const t = trip(); if(!t) return; const st = tlStages(), last = st[st.length - 1];
    const d0 = last ? (last.fin || last.debut) : (t.debut || isoToday());
    openSheet(`<h2>📍 ${esc(MSGT('Ajouter une ville'))}</h2><div class="v-sum-small" style="margin-bottom:10px">${esc(MSGT('Une ville où tu dors, avec tes dates. L’hôtel se réserve plus tard, à l’étape « Réserver ».'))}</div>
      <form id="ac-f" onsubmit="event.preventDefault();CV.ariCitySave()">
        <div class="v-f"><label>${esc(MSGT('Ville'))}</label><input class="v-in" id="ac-v" data-place autocomplete="off" required placeholder="${esc(MSGT('Ex. Rome, Lisbonne, Tokyo'))}" oninput="CV.ariCityGuess()"></div>
        ${st.length ? `<div class="v-f"><label>${esc(MSGT('Où dans l’itinéraire ?'))}</label><select class="v-in" id="ac-pos" onchange="this.dataset.touched=1;CV.ariCityPos(this)">
          <option value="0" data-d="${esc(st[0].debut)}">${esc(MSGT('Au début'))} · ${esc(MSGT('avant'))} ${esc(st[0].city)}</option>
          ${st.map((x, i)=>`<option value="${i + 1}" data-d="${esc(x.fin)}"${i === st.length - 1 ? ' selected' : ''}>${esc(MSGT('Après'))} ${esc(x.city)} (${fshort(x.debut)} → ${fshort(x.fin)})</option>`).join('')}</select>
          <div class="ac-guess" id="ac-guess"></div><div class="v-sum-small" id="ac-shift" style="margin-top:4px"></div></div>` : ''}
        ${st.length && t.fin ? `<div class="v-f"><label>${esc(MSGT('Les dates du voyage'))}</label><div class="v-seg v-seg2" id="ac-mode">
          <button type="button" data-v="keep" class="on" onclick="CV.seg(this);CV.ariShiftHint()">🔁 ${esc(MSGT('Garder mes dates'))}</button><button type="button" data-v="add" onclick="CV.seg(this);CV.ariShiftHint()">📅 ${esc(MSGT('Rallonger le voyage'))}</button></div>
          <div class="v-sum-small" id="ac-mode-h" style="margin-top:6px"></div></div>` : ''}
        <div class="cv-row" style="gap:8px"><div class="v-f" id="ac-d-w" style="flex:1;min-width:0"><label>${esc(MSGT('Arrivée'))}</label><input class="v-in" type="date" id="ac-d" value="${esc(d0)}" required></div>
          <div class="v-f" style="flex:1;min-width:0"><label>${esc(MSGT('Nuits'))}</label><input class="v-in" type="number" id="ac-n" min="1" max="90" value="2" inputmode="numeric" required oninput="CV.ariShiftHint()"></div></div>
        <div class="v-actions"><button type="submit" class="v-btn">＋ ${esc(MSGT('Ajouter'))}</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>
      </form>`);
    setTimeout(()=>{ const i = document.getElementById('ac-v'); if(i) i.focus(); ariShiftHint(); }, 60);
  }
  function ariCitySave(){
    const t = trip(); if(!t) return;
    const v = (document.getElementById('ac-v').value || '').trim(), d = document.getElementById('ac-d').value, n = Math.max(1, Math.min(90, Math.round(num(document.getElementById('ac-n').value)) || 1));
    if(!v || !d) return; const f = addDays(d, n), out = [];
    const ps = document.getElementById('ac-pos'), st = tlStages(), mid = ps && +ps.value < st.length, md = document.getElementById('ac-mode');
    if(md && (md.querySelector('button.on') || {}).dataset.v === 'keep'){   // 🔁 mêmes dates : la ville s’insère, les autres étapes rétrécissent
      const kp = acKeep(ps ? +ps.value : st.length, n); if(kp){
        const L = kp.L; L.splice(ps ? +ps.value : L.length, 0, {k:'new', city:v, span:n, span0:0, g:0, hids:[], nw:1});
        SO = Object.assign(kp.B, {L}); closeSheet(true); soSave('📍 ' + v + ' · ' + MSGT('mêmes dates de voyage')); setTimeout(ariCtry, 300); return; } }
    // 📍 ville insérée au milieu : tout ce qui vient après (étapes, trajets, visites, journées) se décale de n nuits
    if(mid){ shiftFrom(d, n, out); }
    out.push({id:'i' + uid(), type:'item', trip:t.id, cat:'hotel', titre:v, base:v, date:d, dateFin:f, statut:'todo', partage:'grp', qui:[]});
    const nt = clone(t); let ch = false; if(mid && nt.fin){ nt.fin = addD(nt.fin, n); ch = true; } if(!nt.debut || d < nt.debut){ nt.debut = d; ch = true; } if(!nt.fin || f > nt.fin){ nt.fin = f; ch = true; } if(ch) out.push(nt);
    putMany(out, '📍 ' + v + (mid ? ' · ' + RF('la suite est décalée de {0} nuit(s)', n) : '')); try { trChain(); } catch(e){} closeSheet(true); const y = window.scrollY; render(); window.scrollTo(0, y); setTimeout(ariCtry, 300);
  }
  // 🧭 la nouvelle ville est placée là où elle allonge le moins le trajet (Bologne : entre Milan et Venise), tant qu’on n’a pas choisi soi-même
  let acgT = 0, acgN = 0;
  function ariCityGuess(){ clearTimeout(acgT); acgT = setTimeout(ariCityGuessGo, 700); }
  async function ariCityGuessGo(){
    const inp = document.getElementById('ac-v'), sel = document.getElementById('ac-pos'), g = document.getElementById('ac-guess'); if(!inp || !sel || !g) return;
    const v = inp.value.trim(), st = tlStages(), my = ++acgN; if(v.length < 3 || !st.length){ g.textContent = ''; return; }
    try {
      const co = (M.ctry || {})[normQ(st[0].city)], ctx = co && co.cc && typeof ccName === 'function' ? ccName(co.cc) : '';
      const P = []; for(const x of st){ const c = geoCached(x.city) || await geocode(x.city, ctx); if(!c) return; P.push(c); } if(my !== acgN) return;
      const p = await acgPoint(v, P); if(!p || my !== acgN) return;
      // très loin de toutes les étapes (Paris pour un voyage en Roumanie) : sans doute la ville de départ ou de retour, pas une étape « sur le chemin »
      const near = Math.min(...P.map(x=>km(x, p)));
      if(near > 1000){ g.innerHTML = `📍 ${esc(RF('{0} est loin de tes autres étapes (≈ {1} km).', v, Math.round(near / 100) * 100))} ${esc(MSGT('Si c’est ta ville de départ ou de retour, pas besoin de l’ajouter ici : mets-la dans le trajet aller ou retour.'))}`;
        if(!sel.dataset.touched){ sel.value = String(st.length); ariCityPos(sel); } return; }
      let best = st.length, bc = Infinity;
      for(let k = 0; k <= st.length; k++){ const a = P[k - 1], b = P[k]; const c = (a ? km(a, p) : 0) + (b ? km(p, b) : 0) - (a && b ? km(a, b) : 0); if(c < bc - 1){ bc = c; best = k; } }
      const lbl = best === 0 ? RF('avant {0}', st[0].city) : best === st.length ? RF('après {0}, à la fin', st[st.length - 1].city) : RF('entre {0} et {1}', st[best - 1].city, st[best].city);
      g.innerHTML = `💡 ${esc(MSGT('Sur ton chemin'))} : <b>${esc(lbl)}</b>${sel.dataset.touched && +sel.value !== best ? ` <button type="button" class="ac-guess-b" onclick="(s=>{s.value='${ja(best)}';delete s.dataset.touched;CV.ariCityPos(s)})(document.getElementById('ac-pos'))">${esc(MSGT('Placer ici'))}</button>` : ''}`;
      if(!sel.dataset.touched){ sel.value = String(best); ariCityPos(sel); }
    } catch(e){}
  }
  // la ville tapée : la plus connue de ce nom (Paris = Paris, France), sauf si une ville presque aussi connue est près du voyage (Sorrente en Italie, pas aux États-Unis)
  async function acgPoint(q, P){
    try {
      const j = await (await fetch(GEO + 'search?format=jsonv2&limit=6&accept-language=' + ((window.I18N && I18N.lang) || 'fr') + '&q=' + encodeURIComponent(q))).json();
      const C = (Array.isArray(j) ? j : []).filter(x=>x && x.lat && !/^(highway|railway|shop|amenity|building|tourism)$/.test(x.class || x.category || '')).map(x=>({lat:+x.lat, lng:+x.lon, imp:+x.importance || 0}));
      if(C.length){ const top = C.reduce((a, b)=>b.imp > a.imp ? b : a), near = x => Math.min(...P.map(y=>km(x, y)));
        if(near(top) <= 1500) return top;
        const alt = C.filter(x=>x !== top && near(x) <= 1500 && x.imp >= top.imp * .6).sort((a, b)=>b.imp - a.imp)[0];
        return alt || top; }
    } catch(e){}
    return geocode(q, null);
  }
  function ariCityPos(sel){ const o = sel.options[sel.selectedIndex], d = o && o.dataset.d, e = document.getElementById('ac-d'); if(d && e) e.value = d; ariShiftHint(); }
  function ariShiftHint(){
    const ps = document.getElementById('ac-pos'), h = document.getElementById('ac-shift'), mh = document.getElementById('ac-mode-h'), md = document.getElementById('ac-mode');
    const st = tlStages(), n = Math.max(1, Math.min(90, Math.round(num((document.getElementById('ac-n') || {}).value)) || 1)), pos = ps ? +ps.value : st.length, mid = pos < st.length;
    if(md){   // 🔁 garder les dates : la nouvelle ville prend des nuits aux étapes les plus longues
      const kp = acKeep(pos, n), kb = md.querySelector('[data-v=keep]');
      if(!kp){ kb.disabled = true; if(kb.classList.contains('on')){ kb.classList.remove('on'); md.querySelector('[data-v=add]').classList.add('on'); } } else kb.disabled = false;
      const keep = !!(kp && kb.classList.contains('on')), dw = document.getElementById('ac-d-w'); if(dw) dw.style.display = keep ? 'none' : '';
      const t = trip();
      if(mh) mh.textContent = keep ? RF('Ton retour reste le {0}. On prend {1} nuit(s) à : {2}.', fdate(t.fin), n, kp.cuts.map(c=>c.city + ' (' + c.from + ' → ' + c.to + ')').join(', '))
        : kp ? RF('Le voyage s’allonge de {0} nuit(s) : retour le {1}.', n, fdate(addD(t.fin, n))) : RF('Pas assez de nuits ailleurs pour garder tes dates : le voyage s’allonge de {0} nuit(s), retour le {1}.', n, fdate(addD(t.fin, n)));
      if(keep){ if(h) h.textContent = ''; return; }
    }
    if(h) h.textContent = mid ? RF('Les étapes suivantes ({0}…) sont décalées d’autant de nuits, avec leurs trajets et leurs visites.', st[pos].city) : ''; }
  // les nuits retirées pour garder les dates : une à une, à l’étape qui en a le plus (jamais moins d’une nuit d’hôtel)
  function acKeep(pos, n){
    const t = trip(), B = t && soBuild(t); if(!B) return null; const L = B.L.map(x=>Object.assign({}, x)), cuts = {};
    for(let i = 0; i < n; i++){ const x = L.filter(x=>x.span - x.g > 1).sort((a, b)=>b.span - a.span)[0]; if(!x) return null; x.span--; cuts[x.k] = x; }
    return {B, L, cuts:Object.values(cuts).map(x=>({k:x.k, city:x.city, from:x.span0, to:x.span}))};
  }
  // décale de « n » jours tout ce qui commence à partir du jour « d » (une étape qui finit ce jour-là ne bouge pas)
  function shiftFrom(d, n, out){
    const t = trip(); if(!t) return out; const sh = x => addD(x, n);
    Object.values(R).filter(r=>r && !r.deleted && r.trip === t.id).forEach(r=>{
      if((r.type === 'item' || r.type === 'place' || r.type === 'city') && r.date && r.date >= d){ if(r.type === 'item' && r.cat === 'divers' && r.recu) return; const c = clone(r); c.date = sh(r.date); if(r.dateFin) c.dateFin = sh(r.dateFin); out.push(c); }
      else if(r.type === 'note' && r.ref && r.ref.startsWith('day:') && r.ref.slice(4) >= d){ const c = clone(r); c.ref = 'day:' + sh(r.ref.slice(4)); out.push(c); }
    });
    const days = Object.values(R).filter(r=>r && !r.deleted && r.trip === t.id && r.type === 'day' && r.date >= d);
    const tg = days.map(r=>{ const c = clone(r); delete c.deleted; c.date = sh(r.date); c.id = dayId(c.date); return c; }), ids = new Set(tg.map(x=>x.id));
    days.forEach(r=>{ if(!ids.has(r.id)){ const c = clone(r); c.deleted = true; out.push(c); } }); out.push(...tg);
    return out;
  }
  let acBusy = false;
  async function ariCtry(){   // le pays de chaque ville (une seule fois, gardé en mémoire), pour afficher les pays du voyage
    if(acBusy) return; acBusy = true; let n = 0;
    try { for(const x of tlStages()){ if(!(M.ctry || {})[normQ(x.city)]){ const c = await countryOf(x.city); if(c) n++; } } } catch(e){}
    acBusy = false; if(n){ const y = window.scrollY; render(); window.scrollTo(0, y); }
  }
  function ariTog(k){ const t = trip(); if(!t) return; M.ariOpen = M.ariOpen || {}; M.ariOpen[t.id] = M.ariOpen[t.id] === k ? '-' : k; (M.ariFull = M.ariFull || {})[t.id] = 1; persist(); const y = window.scrollY; render(); window.scrollTo(0, y); }
  function ariSkip(k){ const t = trip(); if(!t) return; M.ariSkip = M.ariSkip || {}; (M.ariSkip[t.id] = M.ariSkip[t.id] || {})[k] = 1; if(M.ariOpen) delete M.ariOpen[t.id]; persist(); const y = window.scrollY; render(); window.scrollTo(0, y); }
  function ariBook(id){ const it = R[id]; if(!it) return; const c = clone(it); c.statut = 'booked'; put(c, '✓ ' + MSGT('Noté comme réservé')); const y = window.scrollY; render(); window.scrollTo(0, y); }
  function ariFm(b){ cdFm(b); const y = window.scrollY; setTimeout(()=>{ render(); window.scrollTo(0, y); }, 250); }

  /* ══════════ 🧵 Fils d’Ariane : même carte pour chaque moment (en cours, voyage fini, compagnons, premiers pas) ══════════ */
  function filCard(o){
    const S = o.steps.filter(Boolean), done = S.filter(x=>x.ok).length, w = x => x.w || 1;
    const pct = o.pct != null ? o.pct : Math.round(S.reduce((a, x)=>a + (x.ok ? 1 : (x.f || 0)) * w(x), 0) / Math.max(1, S.reduce((a, x)=>a + w(x), 0)) * 100);
    const cur = S.find(x=>!x.ok), st = (M.filOpen || {})[o.key], op = st === '-' ? '' : st || (o.defClosed ? '' : cur && cur.k);
    // 🧹 replié par défaut : la barre d’avancement + la prochaine étape (avec ses boutons) ; toutes les étapes à la demande
    if(st === undefined && !((M.filFull || {})[o.key])) return `<div class="cv-prep2 ar fil ${o.cls || ''}">
      ${o.top || ''}
      <div class="p2-top ar-lv"><div><div class="p2-k">${o.kick}</div><div class="p2-l">${o.title}</div></div><div class="p2-pct"><b>${o.pctTxt || pct}</b><small>${o.pctTxt ? '' : '%'}</small></div></div>
      <div class="fil-bar"><i style="width:${Math.max(3, pct)}%"></i></div>
      ${cur && !o.defClosed ? `<div class="ar-nx"><div class="ar-nk">${MSGT('Ta prochaine étape')} · ${done + 1}/${S.length}</div><div class="ar-s cur open"><div class="ar-h fil-nh"><i>${S.indexOf(cur) + 1}</i><span>${cur.ic} ${cur.l}</span><small>${cur.n || ''}</small></div><div class="ar-b">${cur.body()}${cur.skip ? `<button type="button" class="ar-sk" onclick="CV.filSkip('${ja(o.key)}','${ja(cur.k)}')">${MSGT('Passer cette étape')}</button>` : ''}</div></div></div>`
        : cur ? '' : `<div class="p2-msg">${o.doneMsg || ''}</div>`}
      <button type="button" class="ar-all" onclick="CV.filFull('${ja(o.key)}',1)">${RF('Voir les {0} étapes', S.length)} ▾</button>${o.foot || ''}</div>`;
    return `<div class="cv-prep2 ar fil ${o.cls || ''}">
      ${o.top || ''}
      <div class="p2-top ar-lv"><div><div class="p2-k">${o.kick}</div><div class="p2-l">${o.title}</div></div><div class="p2-pct"><b>${o.pctTxt || pct}</b><small>${o.pctTxt ? '' : '%'}</small></div></div>
      <div class="fil-bar"><i style="width:${Math.max(3, pct)}%"></i></div>
      <div class="ar-steps">${S.map((x, i)=>{ const isO = op === x.k, sc = x.ok ? 'ok' : cur && cur.k === x.k ? 'cur' : 'next';
        return `<div class="ar-s ${sc}${isO ? ' open' : ''}"><button type="button" class="ar-h" onclick="CV.filTog('${ja(o.key)}','${ja(x.k)}')"><i>${x.ok ? '✓' : i + 1}</i><span>${x.ic} ${x.l}</span><small>${x.ok ? '' : x.n || ''}</small><em>${isO ? '▾' : '▸'}</em></button>
          ${isO ? `<div class="ar-b">${x.body()}${!x.ok && x.skip ? `<button type="button" class="ar-sk" onclick="CV.filSkip('${ja(o.key)}','${ja(x.k)}')">${MSGT('Passer cette étape')}</button>` : ''}</div>` : ''}</div>`; }).join('')}</div>
      ${cur ? '' : `<div class="p2-msg">${o.doneMsg || ''}</div>`}
      <button type="button" class="ar-all" onclick="CV.filFull('${ja(o.key)}',0)">${MSGT('Réduire')} ▴</button>${o.foot || ''}</div>`;
  }
  function filFull(key, on){ M.filFull = M.filFull || {}; if(on) M.filFull[key] = 1; else { delete M.filFull[key]; if(M.filOpen) delete M.filOpen[key]; } persist(); const y = window.scrollY; render(); window.scrollTo(0, y); if(key.startsWith('soc:') && document.getElementById('v-sheet-bg')) shareHub(); }
  const filSk = (key, k) => !!(((M.filSk || {})[key] || {})[k]);
  function filTog(key, k){ M.filOpen = M.filOpen || {}; M.filOpen[key] = M.filOpen[key] === k ? '-' : k; persist(); const y = window.scrollY; render(); window.scrollTo(0, y); const sh = document.getElementById('v-sheet-bg'); if(sh && key.startsWith('soc:')) shareHub(); }
  function filSkip(key, k){ M.filSk = M.filSk || {}; (M.filSk[key] = M.filSk[key] || {})[k] = 1; if(M.filOpen) delete M.filOpen[key]; persist(); const y = window.scrollY; render(); window.scrollTo(0, y); if(key.startsWith('soc:') && document.getElementById('v-sheet-bg')) shareHub(); }
  const fbtn = (fn, txt, sec) => `<button type="button" class="${sec ? 'ar-more' : 'ar-go'}" onclick="${fn}">${txt}</button>`;

  /* 📍 EN COURS : la journée en 4 gestes (aujourd’hui, raconter, dépenses, demain) */
  function liveFil(t){
    const td = isoToday(), ds = dayList(), k = ds.indexOf(td), tm = ds[k + 1], key = 'lv:' + t.id + ':' + td;
    const {own, night} = itemsForDay(td), pl = placesOf(td), sgT = list('place', p=>p.trip === t.id && p.date === td && p.sugg);
    const sv = list('souv', s=>s.trip === t.id && s.date === td), dep = items(i=>i.cat === 'divers' && i.date === td), depT = dep.reduce((a, i)=>a + totalOf(i), 0);
    const tmA = tm ? itemsForDay(tm) : {own:[], night:[]}, tmTodo = tm ? [...tmA.own, ...tmA.night].filter(i=>!okB(i)) : [];
    const city = dayCity(td) || cityOf(t.titre || '') || '';
    const steps = [
      {k:'jour', ic:'📍', l:MSGT('Ta journée'), ok: pl.length > 0 || own.length > 0 || filSk(key, 'jour'), f: pl.length || own.length ? 1 : 0, skip:true, n: pl.length ? pl.length + ' ' + MSGT('lieux') : '',
        body: ()=>`${[...own, ...night].map(it=>`<div class="ar-r" role="button" onclick="CV.edit('${ja(it.id)}')"><i>${icon(it)}</i><span><b data-notr>${esc(it.titre)}</b><small>${esc(it.heureDep || it.heure || '')}</small></span></div>`).join('')}
          ${pl.length ? fbtn(`CV.planDay('${ja(td)}')`, `🗺️ ${MSGT('Itinéraire du jour')} (${pl.length} ${MSGT('lieux')})`) : ''}
          ${sgT.length ? fbtn('CV.suggOpen()', `💡 ${MSGT('Choisir mes visites')} (${sgT.length})`, pl.length) : !pl.length ? fbtn('CV.suggMore()', `💡 ${MSGT('Que voir aujourd’hui ?')}`) : ''}`},
      {k:'souv', ic:'📸', l:MSGT('Raconter ta journée'), ok: sv.length > 0 || filSk(key, 'souv'), skip:true, n: sv.length ? '' : MSGT('pas encore de souvenir'),
        body: ()=>`<div class="ar-p">${sv.length ? `✓ ${sv.length} ${MSGT('souvenir(s) aujourd’hui')}` : MSGT('Une photo et deux lignes : ta famille suit le voyage, et le film se construit tout seul.')}</div>${fbtn('CV.editSouv(null)', `📸 ${MSGT('Ajouter un souvenir')}`)}${fbtn('CV.hereNow()', `📍 ${MSGT('Step ici')}`, 1)}`},
      {k:'dep', ic:'💶', l:MSGT('Dépenses du jour'), ok: dep.length > 0 || filSk(key, 'dep'), skip:true, n: dep.length ? eur(depT) : '',
        body: ()=>`<div class="ar-p">${dep.length ? `${dep.length} ${MSGT('dépense(s)')} · <b>${eur(depT)}</b>` : MSGT('Note les dépenses au fur et à mesure : les comptes entre vous se font tout seuls.')}</div>${fbtn('CV.tlReceipt()', `🧾 ${MSGT('Ajouter une dépense')}`)}`},
      tm ? {k:'dem', ic:'🌙', l:MSGT('Préparer demain'), ok: !tmTodo.length, n: tmTodo.length ? tmTodo.length + ' ' + MSGT('à réserver') : '',
        body: ()=>`<div class="ar-p"><b>${fdate(tm)}</b>${dayInfo(tm).titre ? ' · <span data-notr>' + esc(dayInfo(tm).titre) + '</span>' : ''}</div>
          ${tmTodo.map(it=>`<div class="ar-r" role="button" onclick="CV.edit('${ja(it.id)}')"><i>${it.cat === 'hotel' ? '🛏️' : icon(it)}</i><span><b data-notr>${esc(it.cat === 'hotel' ? (cityOf(it.titre) || it.titre) : it.titre)}</b></span><div class="ar-ra">${ariLink(it, t)}<button type="button" onclick="event.stopPropagation();CV.ariBook('${ja(it.id)}')">${MSGT('C’est réservé')}</button></div></div>`).join('')}
          ${!tmTodo.length ? `<div class="ar-p">✓ ${MSGT('Tout est réservé pour demain')}</div>` : ''}${fbtn(`CV.planDay('${ja(tm)}')`, `🗺️ ${MSGT('Itinéraire de demain')}`, 1)}`} : null
    ];
    return filCard({key, kick:MSGT('Ta journée'), title:`${MSGT('Jour')} ${k + 1}/${ds.length}${city ? ' · <span data-notr>' + esc(city) + '</span>' : ''}`, steps, doneMsg:'✨ ' + MSGT('Belle journée ! Tout est noté.')});
  }

  /* 🏁 VOYAGE FINI : boucler le voyage (comptes, souvenirs, notes, partager, ranger) */
  function finFil(t){
    const key = 'fin:' + t.id, tr = settle(balances()), sv = souvs(), daysNo = dayList().filter(d=>!sv.some(s=>s.date === d));
    const its = list('item', i=>i.trip === t.id && (i.cat === 'hotel' || i.cat === 'activite')), nr = its.filter(i=>R[rtId(i.id)]).length, rated = !!R[rtId(t.id)];
    const shared = !!((M.finShared || {})[t.id]);
    const steps = [
      {k:'comptes', ic:'💸', l:MSGT('Les comptes'), ok: !tr.length, n: tr.length ? tr.length + ' ' + MSGT('remboursement(s)') : '',
        body: ()=>`${tr.map(x=>`<div class="ar-f"><i>💸</i><span><span data-notr>${esc(pname(x.de))}</span> → <span data-notr>${esc(pname(x.a))}</span> : <b>${eur(x.v)}</b></span></div>`).join('')}${fbtn(`CV.innerGo('budget')`, `💸 ${MSGT('Régler / demander')}`)}`},
      {k:'souv', ic:'📸', l:MSGT('Les souvenirs'), ok: !daysNo.length || filSk(key, 'souv'), skip:true, f: dayList().length ? 1 - daysNo.length / dayList().length : 1, n: daysNo.length ? daysNo.length + ' ' + MSGT('jour(s) sans souvenir') : '',
        body: ()=>`<div class="ar-p">${daysNo.length ? `${MSGT('Jours sans souvenir')} : ${daysNo.slice(0, 8).map(fshort).join(' · ')}` : ''}</div>${fbtn('CV.editSouv(null)', `📸 ${MSGT('Ajouter un souvenir')}`)}`},
      {k:'notes', ic:'⭐', l:MSGT('Noter tes adresses'), ok: (rated && (!its.length || nr === its.length)) || filSk(key, 'notes'), skip:true, f: (rated ? .5 : 0) + (its.length ? nr / its.length * .5 : .5), n: its.length ? nr + '/' + its.length : '',
        body: ()=>`<div class="ar-p">${MSGT('Note le voyage, les hôtels et les visites : tu retrouveras tes meilleures adresses pour la prochaine fois.')}</div>${fbtn(`CV.rtSheet('${ja(t.id)}')`, `⭐ ${MSGT('Noter')}`)}`},
      {k:'part', ic:'🎬', l:MSGT('Revivre et partager'), ok: shared || filSk(key, 'part'), skip:true,
        body: ()=>`${fbtn(`CV.finMark('${ja(t.id)}');CV.storyTrip('${ja(t.id)}','home')`, `✨ ${MSGT('La story du voyage')}`)}${fbtn(`CV.finMark('${ja(t.id)}');CV.filmOpen()`, `🎬 ${MSGT('Le film du voyage')}`, 1)}${fbtn(`CV.finMark('${ja(t.id)}');CV.albumSheet()`, `📕 ${MSGT('L’album photo (PDF)')}`, 1)}`},
      {k:'ranger', ic:'📦', l:MSGT('Ranger dans tes souvenirs'), ok: !!t.archived,
        body: ()=>`<div class="ar-p">${MSGT('Le voyage rejoint tes voyages passés, avec sa carte et ses statistiques. Tu peux toujours le rouvrir.')}</div>${fbtn('CV.bilanClose()', `📦 ${MSGT('Ranger le voyage')}`)}`}
    ];
    return filCard({key, kick:MSGT('Boucler ton voyage'), title:`🏁 <span data-notr>${esc(t.titre)}</span>`, steps, doneMsg:'✨ ' + MSGT('Voyage bouclé : il est rangé dans tes souvenirs.')});
  }
  function finMark(tid){ M.finShared = M.finShared || {}; M.finShared[tid] = 1; persist(); }

  /* 👥 COMPAGNONS ET ABONNÉS : voyager ensemble, puis faire suivre la famille */
  function socFil(t){
    if(!t || t.demo) return '';
    const key = 'soc:' + t.id, code = TS()[t.id], sp = code ? spaceObj(code) : null, v = (t.voyageurs || []).filter(prof), fc = feedCode(t.id);
    const grpT = fc ? Object.keys(FT()).filter(x=>FT()[x] === fc && R[x] && !R[x].deleted) : [], gIds = new Set(grpT.map(ftId));
    const nfw = fc ? new Set(list('follower', x=>gIds.has(x.trip) && !isBlk(x)).map(fwKey)).size : 0;
    const steps = [
      {k:'comp', ic:'👥', l:MSGT('Tes compagnons de voyage'), ok: v.length > 1 || filSk(key, 'comp'), skip:true, n: v.length + ' ' + MSGT('voyageur(s)'),
        body: ()=>`<div class="ar-p">${MSGT('Ils voient tout le voyage et le complètent avec toi : programme, résas, budget, souvenirs.')}</div><div class="fil-chips">${v.map(pid=>pchip(pid)).join('')}</div>${fbtn(`CV.close();CV.tripInviteNow('${ja(t.id)}')`, `📤 ${MSGT('Inviter un compagnon')}`)}`},
      {k:'cloud', ic:'☁️', l:MSGT('Voyage en ligne et à jour'), ok: !!(sp && !sp.err && !(sp.dirty || []).length && sp.last), n: sp && sp.err ? '⚠️' : '',
        body: ()=>`<div class="ar-p">${sp ? (sp.err ? '⚠️ ' + esc(sp.err) : (sp.dirty || []).length ? '⏳ ' + MSGT('envoi en cours') : '✓ ' + MSGT('En ligne et chiffré')) : MSGT('Le voyage est mis en ligne (chiffré) dès que tu invites quelqu’un.')}</div>${sp ? fbtn('CV.syncNow(true)', `🔄 ${MSGT('Synchroniser maintenant')}`, 1) : fbtn(`CV.close();CV.tripInviteNow('${ja(t.id)}')`, `📤 ${MSGT('Inviter un compagnon')}`)}`},
      {k:'pub', ic:'👀', l:MSGT('Ouvrir le voyage à ta famille'), ok: !!fc || filSk(key, 'pub'), skip:true,
        body: ()=>`<div class="ar-p">${MSGT('Tes proches suivent le voyage comme un carnet de bord : seulement les photos, les lieux et les récits. Le reste reste privé.')}</div>${fbtn(`CV.feedPublish('${ja(t.id)}')`, `👀 ${MSGT('Publier pour mes abonnés')}`)}`},
      {k:'ab', ic:'💌', l:MSGT('Inviter tes abonnés'), ok: nfw > 0 || filSk(key, 'ab'), skip:true, n: fc ? nfw + ' ' + MSGT('abonné(s)') : '',
        body: ()=>`<div class="ar-p">${MSGT('Un simple lien : il s’ouvre sans rien installer.')}</div>${fc ? fbtn(`CV.feedShareLink('${ja(t.id)}')`, `💌 ${MSGT('Envoyer le lien abonné')}`) : `<div class="ar-p">${MSGT('Publie d’abord le voyage (étape précédente).')}</div>`}`}
    ];
    return filCard({key, kick:MSGT('Ton équipe de voyage'), title:`👥 <span data-notr>${esc(t.titre)}</span>`, steps, cls:'fil-soc', doneMsg:'✨ ' + MSGT('Tout le monde est à bord !')});
  }

  /* 👋 PREMIERS PAS : ce qu’il faut pour bien démarrer, puis la carte disparaît */
  function startFil(){
    if(M.startHide) return '';
    const key = 'start', real = trips().filter(x=>!x.demo && !x.deleted), me = M.me && prof(M.me);
    const steps = [
      {k:'prof', ic:'👤', l:MSGT('Ton profil'), ok: !!me, body: ()=>fbtn(`CV.editProfile('${ja(M.me || '')}')`, `👤 ${MSGT('Mon prénom et ma couleur')}`)},
      {k:'trip', ic:'🧳', l:MSGT('Ton premier voyage'), ok: real.length > 0,
        body: ()=>`<div class="ar-p">${MSGT('Tu sais où tu vas, ou tu cherches une idée : l’appli te guide dans les deux cas.')}</div>${fbtn('CV.newTrip()', `🧳 ${MSGT('Créer un voyage')}`)}`},
      {k:'comp', ic:'👥', l:MSGT('Tes compagnons'), ok: real.some(x=>(x.voyageurs || []).filter(prof).length > 1) || filSk(key, 'comp'), skip:true,
        body: ()=>real.length ? fbtn(`CV.tripInviteNow('${ja((trip() && !trip().demo ? trip() : real[0]).id)}')`, `📤 ${MSGT('Inviter un compagnon')}`) : `<div class="ar-p">${MSGT('Crée d’abord ton voyage.')}</div>`},
      {k:'inst', ic:'📲', l:MSGT('L’appli sur ton écran d’accueil'), ok: isInstalled() || filSk(key, 'inst'), skip:true, body: ()=>fbtn('CV.installSheet()', `📲 ${MSGT('Comment installer')}`)},
      {k:'cloud', ic:'☁️', l:MSGT('Cloud ou hors ligne : à toi de choisir'), ok: !!(M.sync && M.sync.on) || M.cloud === 'none' || Object.keys(TS()).length > 0 || filSk(key, 'cloud'), skip:true,
        body: ()=>`<div class="ar-p">${MSGT('☁️ Cloud : tes voyages sont sauvegardés (chiffrés) et te suivent sur tous tes appareils, partage et notifications compris. 📱 Hors ligne : rien sur nos serveurs et aucune limite de photos, tu partages par paquets.')}</div>${fbtn('CV.cloudPick(\'all\')', `☁️ ${MSGT('Tout mon carnet dans le cloud')}`)}${fbtn('CV.cloudPick(\'none\')', `📱 ${MSGT('Hors ligne, sans limite')}`, 1)}`}
    ];
    if(steps.every(x=>x.ok)) return '';
    const nOk = steps.filter(x=>x.ok).length;
    return filCard({key, kick:MSGT('Premiers pas'), title:`👋 ${me ? '<span data-notr>' + esc(me.nom) + '</span>' : MSGT('Bienvenue')}`, pctTxt: nOk + '/' + steps.length, pct: Math.round(nOk / steps.length * 100), steps, cls:'fil-start', defClosed: real.length > 0,
      foot:`<button type="button" class="fil-hide" onclick="CV.startHide()">${MSGT('Masquer ce guide')}</button>`});
  }
  function startHide(){ M.startHide = 1; persist(); refresh(); toast(MSGT('Guide masqué : tu peux le retrouver dans Plus → Réglages.')); }

  /* ---------- Fin du voyage : « Quel voyage ! » ---------- */
  function tripRecap(t){
    const geo = [...geoSouvs(t.id).map(s=>({lat:+s.lat, lng:+s.lng, d:s.date||'', cc:s.cc||''}))].sort((a,b)=>a.d.localeCompare(b.d));
    let dist = 0; const trk = list('trk', r=>r.trip===t.id).flatMap(r=>r.pts).sort((a,b)=>(a[2]||0)-(b[2]||0));
    const line = trk.length > 1 ? trk.map(p=>({lat:p[0], lng:p[1]})) : geo; for(let i=1;i<line.length;i++) dist += hav(line[i-1], line[i]);
    const sv = list('souv', s=>s.trip===t.id), nph = sv.reduce((a,s)=>a+(s.photos||[]).length, 0), ccs = [...new Set(geo.map(g=>g.cc).filter(Boolean))];
    const days = t.debut ? nights(t.debut, t.fin || t.debut) + 1 : 0;
    return {days, km:Math.round(dist), ccs, nph, nsv:sv.length};
  }
  function bilanHero(t){
    const r = tripRecap(t), chip = (ic, n, l) => n ? `<span><b>${ic} ${Number(n).toLocaleString(NL())}</b><small>${l}</small></span>` : '';
    return `<div class="cv-bhero"><div class="bh-k">🏡 Quel voyage !</div><h2>${esc(t.titre)}</h2><div class="bh-d">${tripDatesLong(t)}</div>
      <div class="bh-c">${chip('🗓️', r.days, r.days > 1 ? 'jours' : 'jour')}${chip('🛣️', r.km, 'km')}${chip('🌍', r.ccs.length, r.ccs.length > 1 ? 'pays' : 'pays')}${chip('📸', r.nph, r.nph > 1 ? 'photos' : 'photo')}</div>
      ${r.ccs.length ? `<div class="bh-f">${r.ccs.slice(0, 10).map(flag).join(' ')}</div>` : ''}
      <div class="bh-b"><button type="button" class="pri" onclick="CV.filmOpen()">🎬 Revivre en film</button><button type="button" onclick="CV.albumSheet()">📕 Album</button><button type="button" onclick="CV.worldTrip('${ja(t.id)}')">🌍 Sur le globe</button></div></div>`;
  }
  function momentHome(t){
    if(souvs().length || list('trk', x=>x.trip === t.id).length){ storyTrip(t.id, 'home'); return; }
    const r = tripRecap(t);
    momentShow(`<div class="mo-k">Bon retour !</div><div class="mo-big">🏡</div><h2>${esc(t.titre)}</h2><div class="mo-sub">${tripDatesLong(t)}</div>
      <div class="mo-w">${r.days ? `<div><small>Jours</small><b>${r.days}</b></div>` : ''}${r.km ? `<div><small>km</small><b>${r.km.toLocaleString(NL())}</b></div>` : ''}${r.ccs.length ? `<div><small>Pays</small><b>${r.ccs.map(flag).join(' ')}</b></div>` : ''}${r.nph ? `<div><small>Photos</small><b>${r.nph}</b></div>` : ''}</div>
      <div class="mo-b"><button type="button" class="pri" onclick="CV.momentClose();CV.filmOpen()">🎬 Revivre en film</button><button type="button" onclick="CV.momentClose();CV.modeGo('bilan')">🏁 Le bilan</button></div>`, 'home');
  }

  /* ---------- Suivi GPS : où sont les autres (carte du voyage en cours) ---------- */
  function trkByWho(tid, withPhotos){
    const by = {}; list('trk', r=>r.trip===tid && !r.deleted && (r.pts||[]).length).forEach(r=>{ const w = r.who || r.id.split(':')[3] || ''; (by[w] = by[w] || []).push(...r.pts); });
    // les photos géolocalisées complètent la route quand l’appli était fermée (téléphone en poche)
    if(withPhotos) list('souv', x=>x.trip===tid && !x.deleted && (x.pts||[]).length && geoOn(tid, x.createdBy || '')).forEach(x=>{ const w = x.createdBy || ''; (by[w] = by[w] || []).push(...x.pts.filter(p=>p[2]).map(p=>[p[0], p[1], p[2]])); });
    Object.values(by).forEach(a=>a.sort((x,y)=>(x[2]||0)-(y[2]||0))); return by;
  }
  function liveMapCard(){
    const t = trip(); if(!t || tripPhase(t) !== 'live' || hidden('blk:lmap')) return '';
    const by = trkByWho(t.id, true), ws = Object.keys(by); if(!ws.length) return '';
    const live = ws.filter(w=>{ const l = by[w][by[w].length-1]; return l[2] && Date.now() - l[2] < LIVE_MS; }).map(w=>w ? pname(w) : '—');
    return `<div class="cv-lmap">${liveBtnHTML(t.id, live, ws.length)}<div class="lm-h">🛰️ Où on en est</div><div class="lm-map" data-lmap="${t.id}" onclick="CV.liveOpen('${ja(t.id)}')"><div class="v-sum-small">🗺️ Carte en cours…</div></div>
      <div class="lm-l">${ws.map(w=>{ const l = by[w][by[w].length-1], on = l[2] && Date.now() - l[2] < LIVE_MS, kmd = liveKmDay(by[w]); return `<span${on ? ' class="on"' : ''}><i style="background:${w ? pcol(w) : '#0ea5e9'}"></i>${trkRec(t.id, isoToday(), w) && (trkRec(t.id, isoToday(), w).who || '') === w ? '🛰️' : '📸'} <b data-notr>${esc(w ? pname(w) : '—')}</b> <small>${on ? '<span>en direct</span> · ' : ''}<span>${l[2] ? vzWhen(l[2]) : ''}</span>${kmd >= 0.1 ? ' · <span>' + fmtKm(kmd) + ' aujourd’hui</span>' : ''}</small></span>`; }).join('')}</div>
      <button type="button" class="v-btn sec" onclick="CV.worldTrip('${ja(t.id)}')">🌍 Voir sur la carte du monde</button></div>`;
  }







  /* ══════════ 🎬 Vidéo de la story · 🗺️ carte à gratter · ⭐ notes et avis ══════════ */
  // la story rejouée image par image dans une vidéo verticale (1080×1920) avec sa musique
  async function stExport(){
    if(!ST) return; stPause(true);
    const c0 = document.createElement('canvas'); if(!c0.captureStream || typeof MediaRecorder === 'undefined'){ alert(MSGT('Ce téléphone ne sait pas créer la vidéo ici. Fais plutôt une capture d’écran vidéo pendant la story.')); return; }
    const slides = ST.slides.map(x=>Object.assign({}, x, {d: x.d || 3500})), title = ST.title || '', sub = ST.sub || '', key = ST.opt && ST.opt.key, cfg = key ? stCfg(key) : {};
    const W = 1080, H = 1920, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const ov = document.createElement('div'); ov.className = 'vx'; ov.innerHTML = `<div class="vx-in"><b>🎬 ${MSGT('Création de la vidéo')}</b><div class="vx-pv"></div><div class="vx-bar"><i id="vx-i"></i></div><small id="vx-t">${MSGT('Préparation des photos…')}</small><button type="button" id="vx-x">${MSGT('Annuler')}</button></div>`;
    ST.ov.appendChild(ov); const pv = ov.querySelector('.vx-pv'); cv.className = 'vx-cv'; pv.appendChild(cv);
    let stop = false; ov.querySelector('#vx-x').onclick = e => { e.stopPropagation(); stop = true; };
    // images (grandes photos), cartes
    const img = async u => new Promise(r=>{ if(!u) return r(null); const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = u; });
    for(const sl of slides){ if(stop) break;
      if(sl.p) sl.im = await img(await phURL(sl.p)); if(sl.ph) sl.im = await img(await phURL(sl.ph));
      if(sl.k === 'top') sl.ims = await Promise.all(sl.top.map(async x=>img(await phURL(x.p))));
      if(sl.k === 'map'){ try { sl.im = await drawMap({w:900, h:1100, lines:sl.lines, markers:sl.mk, maxZoom:15}); } catch(e){} } }
    if(stop){ ov.remove(); return; }
    try { await document.fonts.load('80px Caveat'); } catch(e){}
    // musique → dans la vidéo
    let aud = null, ac = null, dest = null;
    if(cfg.mus !== 'off'){ try { const k = (cfg.mus != null ? +cfg.mus : (M.filmTrack || 0)) % TRACKS.length; aud = new Audio(TRACKS[k]); aud.loop = true; aud.crossOrigin = 'anonymous';
      const AC = window.AudioContext || window.webkitAudioContext; ac = new AC(); const src = ac.createMediaElementSource(aud), g = ac.createGain(); g.gain.value = .9; src.connect(g); g.connect(ac.destination); dest = ac.createMediaStreamDestination(); g.connect(dest); } catch(e){ aud = null; } }
    const stream = cv.captureStream(30); if(dest) dest.stream.getAudioTracks().forEach(tr=>stream.addTrack(tr));
    const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'], mime = types.find(t=>MediaRecorder.isTypeSupported(t)) || '';
    let rec; try { rec = new MediaRecorder(stream, mime ? {mimeType:mime, videoBitsPerSecond:6000000} : {}); } catch(e){ alert('⚠️ ' + e.message); ov.remove(); return; }
    const chunks = []; rec.ondataavailable = e => { if(e.data && e.data.size) chunks.push(e.data); };
    const total = slides.reduce((a, x)=>a + x.d, 0), fs = (n, w) => c.font = `${w === 'serif' ? 800 : (w || 700)} ${n}px ${w === 'serif' ? 'Georgia, serif' : 'system-ui, -apple-system, sans-serif'}`;
    const cover = (im, z, ox, oy) => { if(!im) return; const sc = Math.max(W / im.width, H / im.height) * z, w = im.width * sc, h = im.height * sc; c.drawImage(im, (W - w) / 2 + ox, (H - h) / 2 + oy, w, h); };
    const contain = (im) => { if(!im) return; const sc = Math.min(W / im.width, H / im.height), w = im.width * sc, h = im.height * sc; c.drawImage(im, (W - w) / 2, (H - h) / 2, w, h); };
    const grad = (a, b) => { const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, W, H); };
    const shade = () => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(.25, 'rgba(0,0,0,0)'); g.addColorStop(.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.75)'); c.fillStyle = g; c.fillRect(0, 0, W, H); };
    const txt = (t, x, y, n, w, al, mw) => { fs(n, w); c.textAlign = al || 'center'; c.fillStyle = '#fff'; c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 16; let s2 = String(t || ''); if(mw) while(c.measureText(s2).width > mw && s2.length > 3) s2 = s2.slice(0, -2) + '…'; c.fillText(s2, x, y); c.shadowBlur = 0; };
    const wrap = (t, x, y, n, w, mw, lh, max) => { fs(n, w); const L = []; let l = ''; String(t || '').split(/\s+/).forEach(wd=>{ const tt = l ? l + ' ' + wd : wd; if(c.measureText(tt).width > mw){ L.push(l); l = wd; } else l = tt; }); if(l) L.push(l); L.slice(0, max || 6).forEach((ln, i)=>txt(ln, x, y + i * lh, n, w, 'left')); };
    function frame(t){
      let acc = 0, i = 0; while(i < slides.length - 1 && t > acc + slides[i].d){ acc += slides[i].d; i++; }
      const sl = slides[i], p = Math.min(1, (t - acc) / sl.d), e = 1 - Math.pow(1 - Math.min(1, p * 2.2), 3);
      c.globalAlpha = 1; c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
      const kz = 1.02 + .12 * (i % 2 ? p : 1 - p), kx = (i % 3 - 1) * 30 * p;
      if(sl.k === 'ph' || sl.k === 'intro' || sl.k === 'home' || sl.k === 'tintro'){
        if(sl.im){ c.save(); c.filter = 'blur(40px) brightness(.55)'; cover(sl.im, 1.2, 0, 0); c.restore(); if(sl.k === 'ph'){ c.save(); c.translate(W / 2, H / 2); c.scale(kz, kz); c.translate(-W / 2 + kx, -H / 2); contain(sl.im); c.restore(); } else cover(sl.im, kz, kx, 0); }
        else grad('#7c3aed', '#0f172a');
        shade();
        if(sl.k === 'ph'){ const x = sl.s || {}; c.globalAlpha = e; if(sl.first !== false){ wrap(x.titre || x.lieu || '', 70, H - 330, 72, 'serif', W - 140, 82, 2); if(x.lieu && x.lieu !== x.titre) txt('📍 ' + x.lieu, 70, H - 150, 40, 500, 'left', W - 140); if(sl.who) txt('📸 ' + sl.who, 70, H - 95, 36, 500, 'left'); } }
        else { c.globalAlpha = e; if(sl.k === 'home') txt('🏡', 90, H - 560, 120, 400, 'left'); txt(String(sl.k === 'home' ? TT('Bon retour !') : sl.k === 'tintro' ? TT('Le film du voyage') : (sl.j > 0 ? TT('Jour') + ' ' + sl.j : '')).toUpperCase(), 80, H - 420, 40, 800, 'left');
          wrap(sl.k === 'intro' ? fdate(sl.date) : sl.title, 80, H - 330, 100, 'serif', W - 160, 108, 2); txt(sl.k === 'intro' ? (sl.place ? '📍 ' + sl.place : '') : sl.dates || '', 80, H - 110, 44, 500, 'left', W - 160); }
      } else if(sl.k === 'chap'){ grad(['#0ea5e9','#14b8a6','#f59e0b','#fb7185','#a855f7'][(sl.j || 0) % 5], '#0f172a'); c.globalAlpha = e;
        txt((TT('Jour') + ' ' + sl.j).toUpperCase(), W / 2, H / 2 - 160, 48, 800); txt(fdate(sl.date), W / 2, H / 2, 120, 'serif'); if(sl.place) txt('📍 ' + sl.place, W / 2, H / 2 + 110, 48, 500, 'center', W - 120);
      } else if(sl.k === 'stats' || sl.k === 'tstats'){ grad('#0ea5e9', '#312e81'); c.globalAlpha = 1;
        const r = sl.r, it = sl.k === 'tstats' ? [['🗓️', r.days, TT('jours')], [r.km ? '🛣️' : '📍', r.km || r.nsv, r.km ? 'km' : TT('souvenirs')], ['📸', r.nph, TT('photos')], [r.ccs.length ? '🌍' : '❤️', r.ccs.length || sl.lk || 0, r.ccs.length ? TT('pays') : TT('j’aime')]]
          : [['🚶', +(sl.km || 0).toFixed(1), TT('km parcourus')], ['📸', sl.nph, TT('photos')], ['📍', sl.ns, TT('souvenirs')], ['💶', Math.round(sl.dep || 0), TT('dépensés')]];
        txt(String(sl.k === 'tstats' ? TT('Le voyage en chiffres') : TT('Ta journée en chiffres')).toUpperCase(), W / 2, 420, 44, 800);
        it.forEach(([ic, v, l], k)=>{ const x = k % 2 ? W * .73 : W * .27, y = 700 + Math.floor(k / 2) * 420, q = Math.max(0, Math.min(1, (p * 1.6 - k * .12))), n = v * (1 - Math.pow(1 - q, 3));
          c.fillStyle = 'rgba(255,255,255,.14)'; c.beginPath(); c.roundRect ? c.roundRect(x - 220, y - 150, 440, 360, 40) : c.rect(x - 220, y - 150, 440, 360); c.fill();
          txt(ic, x, y - 30, 80, 400); txt(Number.isInteger(v) ? Math.round(n).toLocaleString(NL()) : n.toFixed(1).replace('.', ','), x, y + 100, 110, 800); txt(l, x, y + 170, 38, 500); });
      } else if(sl.k === 'map'){ grad('#14b8a6', '#0b1220'); c.globalAlpha = 1; txt(String(sl.ttl ? TT(sl.ttl) : TT('La route du jour')).toUpperCase(), W / 2, 330, 44, 800);
        if(sl.im){ const w = 900, h = sl.im.height / sl.im.width * 900, rv = Math.min(1, p * 1.5); c.save(); c.beginPath(); c.rect(90, 420, w * rv, h); c.clip(); c.drawImage(sl.im, 90, 420, w, h); c.restore(); }
      } else if(sl.k === 'txt'){ grad('#f59e0b', '#1e1b4b'); c.globalAlpha = e; const x = sl.s || {}; wrap(x.titre || '', 90, 640, 80, 'serif', W - 180, 90, 2); fs(64, 500); c.font = '500 70px Caveat, cursive'; wrap('« ' + String(x.texte || '').slice(0, 300) + ' »', 90, 900, 70, 500, W - 180, 84, 8);
      } else if(sl.k === 'rx'){ grad('#fb7185', '#1e1b4b'); c.globalAlpha = 1; txt(String(TT('Tes proches ont suivi')).toUpperCase(), W / 2, 520, 44, 800);
        for(let k = 0; k < 10; k++){ const q = (p * 1.4 + k * .1) % 1; c.globalAlpha = 1 - q; txt('❤️', 160 + k * 85, 900 - q * 300, 70, 400); } c.globalAlpha = 1;
        txt(sl.lk.length + ' ❤️ · ' + sl.cm.length + ' 💬', W / 2, 1050, 96, 800); sl.cm.slice(0, 3).forEach((m, k)=>{ c.globalAlpha = Math.max(0, Math.min(1, p * 3 - k * .5)); txt('« ' + String(m.text || '').slice(0, 50) + ' »', W / 2, 1220 + k * 110, 44, 500, 'center', W - 120); txt(m.who || '', W / 2, 1270 + k * 110, 32, 700); });
      } else if(sl.k === 'top'){ grad('#fb7185', '#831843'); c.globalAlpha = 1; txt(String(TT('Les plus aimées')).toUpperCase(), W / 2, 420, 44, 800);
        (sl.ims || []).forEach((im, k)=>{ const pos = [[W / 2, 1000, 420], [W * .2, 1080, 300], [W * .8, 1080, 300]][k]; if(!pos || !im) return; const q = Math.max(0, Math.min(1, p * 2 - k * .25)), w = pos[2], h = w * 4 / 3; c.globalAlpha = q;
          c.save(); c.translate(pos[0], pos[1]); c.fillStyle = '#fff'; c.fillRect(-w / 2 - 10, -h / 2 - 10, w + 20, h + 20); const sc = Math.max(w / im.width, h / im.height); c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.clip(); c.drawImage(im, -im.width * sc / 2, -im.height * sc / 2, im.width * sc, im.height * sc); c.restore();
          txt(['🥇','🥈','🥉'][k] + ' ' + sl.top[k].n + ' ❤️', pos[0], pos[1] + h / 2 + 80, 48, 800); });
      } else if(sl.k === 'trophy'){ grad('#f59e0b', '#7c3aed'); c.globalAlpha = 1; txt(String(TT('Ton trophée')).toUpperCase(), W / 2, 560, 44, 800); const q = Math.min(1, p * 2.5); c.save(); c.translate(W / 2, 860); c.scale(q, q); txt(sl.tr[0].i, 0, 80, 260, 400); c.restore(); c.globalAlpha = e; txt(TT(sl.tr[0].t), W / 2, 1180, 96, 'serif'); txt(TT(sl.tr[0].d), W / 2, 1270, 48, 500);
      } else { grad('#7c3aed', '#0f172a'); c.globalAlpha = e; txt('🧳', W / 2, H / 2 - 220, 160, 400); wrap(TT('Merci pour ce voyage'), 120, H / 2, 90, 'serif', W - 240, 100, 2); txt(title, W / 2, H / 2 + 260, 48, 600, 'center', W - 120); }
      c.globalAlpha = 1; fs(34, 700); c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,.75)'; c.fillText('Vezoria', W / 2, H - 40);
      // barres de progression façon story
      const n = slides.length, gw = (W - 80 - (n - 1) * 8) / n; for(let k = 0; k < n; k++){ c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(40 + k * (gw + 8), 40, gw, 7); c.fillStyle = '#fff'; c.fillRect(40 + k * (gw + 8), 40, gw * (k < i ? 1 : k === i ? p : 0), 7); }
      txt(title, 50, 120, 40, 800, 'left', W - 100); txt(sub, 50, 170, 32, 500, 'left', W - 100);
    }
    if(ac && ac.state === 'suspended') try { await ac.resume(); } catch(e){}
    if(aud) try { aud.currentTime = 0; await aud.play(); } catch(e){}
    rec.start(500); const t0 = performance.now(), bar = document.getElementById('vx-i'), lab = document.getElementById('vx-t');
    await new Promise(res=>{ const loop = () => { if(stop){ res(); return; } const t = performance.now() - t0; frame(Math.min(t, total)); if(bar) bar.style.width = Math.min(100, t / total * 100) + '%'; if(lab) lab.textContent = '🔴 ' + MSGT('Enregistrement') + ' · ' + Math.max(0, Math.ceil((total - t) / 1000)) + ' s'; if(t >= total + 400) res(); else requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
    try { if(aud) aud.pause(); } catch(e){}
    await new Promise(r=>{ rec.onstop = r; try { rec.stop(); } catch(e){ r(); } });
    try { if(ac) ac.close(); } catch(e){}
    ov.remove(); if(stop) return;
    const type = rec.mimeType || mime || 'video/webm', ext = /mp4/.test(type) ? 'mp4' : 'webm', blob = new Blob(chunks, {type});
    const name = 'story-' + String(title || 'vezoria').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.' + ext, file = new File([blob], name, {type});
    try { if(navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file], title:name}); return; } } catch(e){ if(e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(()=>{ a.remove(); URL.revokeObjectURL(a.href); }, 5000);
    toast('🎬 ' + MSGT('Vidéo enregistrée'));
  }

  // 🗺️ carte du monde à gratter
  let NE = null;
  // contours des pays (Natural Earth 1:110m, domaine public) : copie allégée dans vendor/ (version figée, marche hors ligne)
  async function neFetch(){
    try { const r = await fetch((window.VZ_B || '') + 'vendor/ne-countries.json'); if(r.ok) return await r.json(); } catch(e){}
    return (await fetch('https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/ne_110m_admin_0_countries.geojson')).json();
  }
  async function neLoad(){ if(NE) return NE; if(wm && wm.ne) return (NE = wm.ne); NE = await neFetch(); return NE; }
  const neCc = f => { const p = f.properties || {}; return p.ISO_A2_EH && p.ISO_A2_EH !== '-99' ? p.ISO_A2_EH : p.ISO_A2; };
  function visited(){
    const out = {}, td = isoToday(), add = (cc, t) => { if(!cc || cc.length !== 2) return; cc = cc.toUpperCase(); const o = out[cc] = out[cc] || {trips:[], d:'9'}; if(t && !o.trips.includes(t.titre)) o.trips.push(t.titre); if(t && t.debut && t.debut < o.d) o.d = t.debut; };
    trips().filter(t=>!t.demo && !t.deleted && t.debut && t.debut <= td).forEach(t=>{
      list('souv', x=>x.trip === t.id).forEach(x=>add(x.cc || (x.pays ? ccOf(x.pays) : ''), t));
      list('item', i=>i.trip === t.id && i.cat === 'hotel').forEach(i=>{ const k = (M.ctry || {})[normQ(stayCity(i))]; if(k) add(k.cc, t); }); });
    return out;
  }
  const SCR_COL = ['#f43f5e','#f97316','#eab308','#22c55e','#14b8a6','#0ea5e9','#6366f1','#a855f7','#ec4899','#84cc16'];
  async function scrOpen(){
    const ov = document.createElement('div'); ov.id = 'cv-scr'; ov.className = 'scr';
    ov.innerHTML = `<div class="scr-top"><button type="button" onclick="CV.scrClose()" aria-label="Fermer">✕</button><div><b>🗺️ ${MSGT('Ma carte à gratter')}</b><small id="scr-sub">…</small></div></div>
      <div class="scr-map"><canvas id="scr-c"></canvas></div><div class="scr-st" id="scr-st"></div><div class="scr-h" id="scr-h"></div><div class="scr-cards" id="scr-cards"><div class="v-sum-small" style="color:#fff">🌍 ${MSGT('Chargement de la carte…')}</div></div>`;
    document.body.appendChild(ov); document.body.style.overflow = 'hidden'; requestAnimationFrame(()=>ov.classList.add('on'));
    try { await neLoad(); } catch(e){ document.getElementById('scr-cards').innerHTML = '<div class="v-sum-small" style="color:#fff">⚠️ ' + MSGT('Carte indisponible (connexion ?)') + '</div>'; return; }
    scrPaint();
  }
  function scrClose(){ const o = document.getElementById('cv-scr'); if(o) o.remove(); document.body.style.overflow = ''; }
  function scrPaint(){
    const V = visited(), done = M.scr || (M.scr = {}), cv = document.getElementById('scr-c'); if(!cv || !NE) return;
    const box = cv.parentNode, W = box.clientWidth, H = Math.round(W * .52), dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
    const c = cv.getContext('2d'); c.scale(dpr, dpr);
    const X = lon => (lon + 180) / 360 * W, Y = lat => (84 - lat) / 142 * H;
    c.fillStyle = '#0b1530'; c.fillRect(0, 0, W, H);
    const foil = c.createLinearGradient(0, 0, W, H); foil.addColorStop(0, '#b8892e'); foil.addColorStop(.35, '#f4d58d'); foil.addColorStop(.55, '#c99a3c'); foil.addColorStop(.8, '#f7e0a3'); foil.addColorStop(1, '#a87b26');
    const cont = new Set(); let ci = 0;
    NE.features.forEach(f=>{ const cc = neCc(f), v = V[cc], rev = v && done[cc]; if(v && f.properties && f.properties.CONTINENT) cont.add(f.properties.CONTINENT);
      const g = f.geometry; if(!g) return; const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
      c.beginPath(); polys.forEach(pl=>pl.forEach(ring=>{ ring.forEach(([lo, la], k)=>{ const x = X(lo), y = Y(la); if(k) c.lineTo(x, y); else c.moveTo(x, y); }); c.closePath(); }));
      c.fillStyle = rev ? SCR_COL[(ci++) % SCR_COL.length] : foil; c.fill(); c.strokeStyle = rev ? 'rgba(255,255,255,.9)' : 'rgba(90,60,10,.45)'; c.lineWidth = rev ? 1 : .5; c.stroke();
      if(v && !rev){ c.save(); c.shadowColor = '#fff7cc'; c.shadowBlur = 10; c.strokeStyle = '#fffbe6'; c.lineWidth = 1.4; c.stroke(); c.restore(); } });
    const ks = Object.keys(V), nRev = ks.filter(k=>done[k]).length, todo = ks.filter(k=>!done[k]);
    document.getElementById('scr-sub').textContent = nRev + ' ' + MSGT('pays grattés') + ' · ' + Math.round(nRev / 195 * 100) + ' % ' + MSGT('du monde');
    const life = trips().filter(t=>!t.demo && !t.deleted && t.debut && t.debut <= isoToday()), km = life.reduce((a, t)=>a + (tripRecap(t).km || 0), 0), days = life.reduce((a, t)=>a + (tripRecap(t).days || 0), 0);
    document.getElementById('scr-st').innerHTML = `<span><b>${ks.length}</b>${MSGT('pays')}</span><span><b>${cont.size}</b>${MSGT('continents')}</span><span><b>${life.length}</b>${MSGT('voyages')}</span><span><b>${days}</b>${MSGT('jours')}</span><span><b>${km.toLocaleString(NL())}</b>km</span>`;
    document.getElementById('scr-h').innerHTML = todo.length ? `✨ ${todo.length} ${MSGT('pays à gratter : frotte les cartes dorées avec ton doigt')}` : ks.length ? `🎉 ${MSGT('Tous tes pays sont grattés !')} ${ks.map(k=>flag(k)).join(' ')}` : MSGT('Tes pays visités apparaîtront ici après tes voyages.');
    const cards = document.getElementById('scr-cards');
    cards.innerHTML = todo.map(k=>`<div class="scr-cd" data-cc="${k}"><div class="scr-u"><i>${flag(k)}</i><b data-notr>${esc(ccName(k))}</b><small data-notr>${esc(V[k].trips.slice(0, 2).join(' · '))}</small></div><canvas></canvas></div>`).join('')
      + ks.filter(k=>done[k]).sort((a, b)=>(V[a].d || '').localeCompare(V[b].d || '')).map(k=>`<div class="scr-cd ok"><div class="scr-u"><i>${flag(k)}</i><b data-notr>${esc(ccName(k))}</b><small data-notr>${esc(V[k].trips.slice(0, 2).join(' · '))}</small></div></div>`).join('');
    cards.querySelectorAll('.scr-cd:not(.ok)').forEach(scrCard);
  }
  function scrCard(el){
    const cv = el.querySelector('canvas'), W = el.clientWidth, H = el.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; const c = cv.getContext('2d'); c.scale(dpr, dpr);
    const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#b8892e'); g.addColorStop(.3, '#f6dc9a'); g.addColorStop(.5, '#c9993b'); g.addColorStop(.75, '#f9e7b4'); g.addColorStop(1, '#a37722'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    for(let k = 0; k < 60; k++){ c.fillStyle = 'rgba(255,255,255,' + (Math.random() * .25) + ')'; c.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    c.fillStyle = 'rgba(90,60,10,.7)'; c.font = '800 15px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText('✨ ' + MSGT('Gratte-moi'), W / 2, H / 2 + 5);
    c.globalCompositeOperation = 'destination-out';
    let down = false, n = 0;
    const at = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const scratch = e => { if(!down) return; e.preventDefault(); const [x, y] = at(e); c.beginPath(); c.arc(x, y, 22, 0, Math.PI * 2); c.fill(); if(++n % 6 === 0) check(); };
    const check = () => { const d = c.getImageData(0, 0, cv.width, cv.height).data; let clr = 0, tot = 0; for(let i = 3; i < d.length; i += 64){ tot++; if(d[i] < 40) clr++; } if(clr / tot > .5) win(); };
    const win = () => { if(el.classList.contains('ok')) return; el.classList.add('ok'); cv.style.opacity = 0; M.scr = M.scr || {}; M.scr[el.dataset.cc] = Date.now(); persist(); try { pollFx(); navigator.vibrate && navigator.vibrate(40); } catch(e){} toast('✨ ' + flag(el.dataset.cc) + ' ' + ccName(el.dataset.cc) + ' ' + MSGT('gratté !')); setTimeout(scrPaint, 900); };
    cv.addEventListener('pointerdown', e=>{ down = true; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); scratch(e); });
    cv.addEventListener('pointermove', scratch); ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev=>cv.addEventListener(ev, ()=>{ down = false; }));
  }

  // ⭐ notes et avis : chacun note le voyage, les hébergements et les activités (mémo pour la prochaine fois)
  const rtId = (k) => 'rt:' + k + ':' + (M.me || 'moi');
  const rtOf = k => list('rate', r=>r.key === k);
  const rtAvg = k => { const L = rtOf(k).filter(r=>r.stars); return L.length ? L.reduce((a, r)=>a + r.stars, 0) / L.length : 0; };
  const stars = (n, big) => `<span class="rt-s${big ? ' big' : ''}">${[1,2,3,4,5].map(i=>`<i class="${i <= Math.round(n) ? 'on' : ''}">★</i>`).join('')}</span>`;
  function rtCard(t){
    if(!t || tripPhase(t) === 'prep') return '';
    const mine = R[rtId(t.id)], avg = rtAvg(t.id), n = rtOf(t.id).length, its = list('item', i=>i.trip === t.id && (i.cat === 'hotel' || i.cat === 'activite')), nr = its.filter(i=>R[rtId(i.id)]).length;
    const best = its.map(i=>({i, a:rtAvg(i.id)})).filter(x=>x.a).sort((a, b)=>b.a - a.a)[0];
    return `<button type="button" class="rt-c" onclick="CV.rtSheet('${ja(t.id)}')"><div><b>⭐ ${mine ? MSGT('Ta note du voyage') : MSGT('Note ce voyage')}</b>${n ? `<span>${stars(avg, 1)} <small>${avg.toFixed(1).replace('.', ',')} · ${n} ${MSGT('avis')}</small></span>` : `<small>${MSGT('Le voyage, les hôtels, les visites : ce que tu as adoré (ou pas)')}</small>`}</div>
      ${best ? `<small class="rt-best">💖 ${MSGT('Coup de cœur')} : <span data-notr>${esc(best.i.titre || '')}</span> ${best.a.toFixed(1).replace('.', ',')}★</small>` : its.length ? `<small class="rt-best">${nr}/${its.length} ${MSGT('adresses notées')}</small>` : ''}</button>`;
  }
  function rtSheet(tid){
    const t = R[tid]; if(!t) return; const its = list('item', i=>i.trip === tid && (i.cat === 'hotel' || i.cat === 'activite')).sort((a, b)=>(a.date || '').localeCompare(b.date || ''));
    const row = (k, ic, lab, sub) => { const r = R[rtId(k)] || {}, others = rtOf(k).filter(x=>x.who !== (M.me || 'moi') && (x.stars || x.txt));
      return `<div class="rt-r" data-k="${k}"><div class="rt-h"><span>${ic} <b data-notr>${esc(lab)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="rt-in">${[1,2,3,4,5].map(i=>`<button type="button" class="${i <= (r.stars || 0) ? 'on' : ''}" onclick="CV.rtSet('${ja(k)}',${i},'${ja(tid)}')" aria-label="Étoile">★</button>`).join('')}</span></div>
        <input class="v-in rt-tx" placeholder="${esc(MSGT('Un mot, un conseil (facultatif)'))}" value="${esc(r.txt || '')}" onchange="CV.rtTxt('${ja(k)}',this.value,'${ja(tid)}')">
        ${others.length ? `<div class="rt-o">${others.map(x=>`<span><b data-notr>${esc(pname(x.who) || '')}</b> ${'★'.repeat(x.stars || 0)}${x.txt ? ' · <i data-notr>' + esc(x.txt) + '</i>' : ''}</span>`).join('')}</div>` : ''}</div>`; };
    openSheet(`<h2>⭐ ${MSGT('Notes et avis')}</h2><div class="v-sum-small" style="margin-bottom:8px">${MSGT('Chacun note de son côté. Tes notes te serviront de conseils pour un prochain voyage.')}</div>
      ${row(tid, '🧳', t.titre || '', MSGT('Le voyage dans son ensemble'))}
      ${its.length ? `<div class="rt-sec">🏨 ${MSGT('Hébergements')} & 🎟️ ${MSGT('visites')}</div>` + its.map(i=>row(i.id, i.cat === 'hotel' ? '🏨' : '🎟️', i.titre || '', [i.date ? fdate(i.date) : '', i.cat === 'hotel' ? stayCity(i) : ''].filter(Boolean).join(' · '))).join('') : ''}
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.close();CV.refreshNow()">✓ ${MSGT('Terminé')}</button><button type="button" class="v-btn sec" onclick="CV.rtAll()">📒 ${MSGT('Mes adresses notées')}</button></div>`);
  }
  function rtSave(k, patch, tid){ const id = rtId(k), r = R[id] && !R[id].deleted ? clone(R[id]) : {id, type:'rate', trip:tid, key:k, who:M.me || 'moi'}; Object.assign(r, patch); put(r); }
  function rtSet(k, n, tid){ const cur = (R[rtId(k)] || {}).stars; rtSave(k, {stars: cur === n ? 0 : n}, tid); document.querySelectorAll(`.rt-r[data-k="${k}"] .rt-in button`).forEach((b, i)=>b.classList.toggle('on', i < (cur === n ? 0 : n))); if(n === 5 && cur !== 5) toast('💖 ' + MSGT('Coup de cœur noté')); }
  function rtTxt(k, v, tid){ rtSave(k, {txt:String(v || '').slice(0, 200)}, tid); toast('✓ ' + MSGT('Avis enregistré')); }
  function rtAll(){
    const L = list('rate', r=>r.who === (M.me || 'moi') && r.stars && R[r.key] && R[r.key].type === 'item').map(r=>({r, i:R[r.key], t:R[r.trip]})).sort((a, b)=>b.r.stars - a.r.stars);
    const G = {}; L.forEach(x=>{ const c = cityOf(x.i.titre || '') || (x.t && x.t.titre) || '—'; (G[c] = G[c] || []).push(x); });
    openSheet(`<h2>📒 ${MSGT('Mes adresses notées')}</h2><div class="v-sum-small" style="margin-bottom:8px">${MSGT('Tes hôtels et visites, des mieux notés aux moins bien : à garder pour la prochaine fois.')}</div>
      ${L.length ? Object.entries(G).map(([c, xs])=>`<div class="rt-sec">📍 <span data-notr>${esc(c)}</span></div>${xs.map(x=>`<div class="rt-l"><span>${x.i.cat === 'hotel' ? '🏨' : '🎟️'} <b data-notr>${esc(x.i.titre || '')}</b><small data-notr>${esc(x.t ? x.t.titre : '')}${x.r.txt ? ' · ' + esc(x.r.txt) : ''}</small></span>${stars(x.r.stars)}</div>`).join('')}`).join('') : `<div class="v-sum-small">${MSGT('Note les hôtels et visites de tes voyages finis : ils apparaîtront ici.')}</div>`}
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">${MSGT('Fermer')}</button></div>`);
  }
  /* ══════════ 🎯 Défis du jour · 🎙️ journal vocal · 📴 hors ligne malin · 🗣️ phrases et devises ══════════ */
  const DEFIS = [
    ['🍜','Goûte une spécialité locale'], ['🌅','Photo au coucher (ou au lever) du soleil'], ['🗣️','Dis « merci » dans la langue du pays'], ['🏞️','Trouve le plus beau point de vue'],
    ['🤳','Selfie de groupe devant un monument'], ['🎨','Photographie un street art'], ['🧃','Goûte une boisson locale'], ['💬','Discute avec un habitant'],
    ['🧺','Flâne dans un marché'], ['🐾','Photographie un animal'], ['🚪','Trouve une porte ou une façade colorée'], ['🍽️','Mange là où mangent les gens du coin'],
    ['💧','Une photo avec un reflet dans l’eau'], ['🗺️','Visite un lieu qui n’est pas dans les guides'], ['🚋','Prends un transport que tu n’as jamais pris'], ['🎁','Trouve un petit souvenir à moins de 5 €'],
    ['🍰','Goûte un dessert typique'], ['🎶','Écoute de la musique jouée en vrai'], ['📸','Une photo de chaque compagnon'], ['🌳','Fais une pause dans un parc ou un jardin'],
    ['auto:km','🚶','Marche 10 km dans la journée'], ['auto:sv','📍','Ajoute 5 souvenirs dans la journée'], ['auto:ph','🖼️','Prends 20 photos dans la journée']];
  function dfToday(t, d){
    let h = 0; const k = t.id + d; for(let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
    const idx = [], n = DEFIS.length; while(idx.length < 3){ h = (h * 1103515245 + 12345) >>> 0; const j = h % n; if(!idx.includes(j)) idx.push(j); }
    return idx.map(i=>{ const x = DEFIS[i]; return x.length === 3 ? {k:i, auto:x[0].slice(5), ic:x[1], l:x[2]} : {k:i, ic:x[0], l:x[1]}; });
  }
  const dfId = (tid, d, k) => 'df:' + tid + ':' + d + ':' + k;
  function dfDoneBy(t, d, x){
    const r = R[dfId(t.id, d, x.k)], by = Object.assign({}, (r && !r.deleted && r.by) || {});
    if(x.auto){ (t.voyageurs || []).forEach(p=>{ const sv = list('souv', s=>s.trip === t.id && s.date === d && s.createdBy === p);
      if(x.auto === 'km' && liveKmDay((trkByWho(t.id, false)[p]) || []) >= 10) by[p] = by[p] || 1;
      if(x.auto === 'sv' && sv.length >= 5) by[p] = by[p] || 1;
      if(x.auto === 'ph' && sv.reduce((a, s)=>a + (s.photos||[]).length, 0) >= 20) by[p] = by[p] || 1; }); }
    return by;
  }
  function dfScore(t){ const sc = {}; list('defi', r=>r.trip === t.id).forEach(r=>Object.keys(r.by || {}).forEach(p=>sc[p] = (sc[p] || 0) + 1)); return sc; }
  function dfHTML(t){
    if(!t || hidden('blk:defi')) return ''; const d = isoToday(), L = dfToday(t, d), V = (t.voyageurs || []).filter(p=>prof(p)), sc = dfScore(t);
    const mine = L.filter(x=>dfDoneBy(t, d, x)[M.me]).length;
    return `<div class="df"><div class="df-h"><b>🎯 Défis du jour</b><small>${mine}/3 ${MSGT('réussis')}</small></div>
      <div class="df-l">${L.map(x=>{ const by = dfDoneBy(t, d, x), me = !!by[M.me]; return `<button type="button" class="df-c${me ? ' ok' : ''}" onclick="CV.dfGo(${x.k})"><i>${x.ic}</i><span>${esc(x.l)}</span>${x.auto ? '<small>⚡ auto</small>' : ''}<em>${V.filter(p=>by[p]).map(p=>`<u style="--c:${pcol(p)}">${esc(((pname(p)||'?')[0]||'?').toUpperCase())}</u>`).join('')}</em>${me ? '<b>✓</b>' : ''}</button>`; }).join('')}</div>
      ${V.length > 1 && Object.keys(sc).length ? `<div class="df-sc">🏅 ${V.filter(p=>sc[p]).sort((a, b)=>sc[b] - sc[a]).map((p, i)=>`<span>${i === 0 ? '👑 ' : ''}<span data-notr>${esc(pname(p))}</span> ${sc[p]}</span>`).join(' · ')}</div>` : ''}</div>`;
  }
  async function dfGo(k){
    const t = trip(); if(!t) return; const d = isoToday(), x = dfToday(t, d).find(y=>y.k === k); if(!x) return;
    const id = dfId(t.id, d, k), r = R[id] && !R[id].deleted ? clone(R[id]) : {id, type:'defi', trip:t.id, date:d, k, by:{}};
    if(x.auto && !r.by[M.me] && !dfDoneBy(t, d, x)[M.me]){ toast('⚡ ' + MSGT('Ce défi se valide tout seul')); return; }
    if(r.by[M.me]){ if(!(await uiConfirm(MSGT('Annuler ce défi ?')))) return; delete r.by[M.me]; put(r); refresh(); return; }
    openSheet(`<h2>${x.ic} ${esc(x.l)}</h2><div class="v-sum-small" style="margin-bottom:10px">${MSGT('Défi réussi ? Ajoute une photo pour le garder en souvenir (et le montrer aux abonnés).')}</div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.dfOk(${k},1)">📸 ${MSGT('Réussi, avec une photo')}</button><button type="button" class="v-btn sec" onclick="CV.dfOk(${k},0)">✓ ${MSGT('Réussi')}</button></div>`);
  }
  function dfOk(k, photo){
    const t = trip(); if(!t) return; const d = isoToday(), x = dfToday(t, d).find(y=>y.k === k), id = dfId(t.id, d, k);
    const r = R[id] && !R[id].deleted ? clone(R[id]) : {id, type:'defi', trip:t.id, date:d, k, by:{}}; r.by = Object.assign({}, r.by, {[M.me]:Date.now()});
    put(r, '🎯 ' + MSGT('Défi réussi !')); closeSheet(true); try { pollFx(); } catch(e){}
    if(photo){ setTimeout(()=>{ editSouv(null); setTimeout(()=>{ const f = document.getElementById('v-form'); if(f && f.titre) f.titre.value = '🎯 ' + TT(x.l); }, 120); }, 300); } else refresh();
  }

  // 🎙️ journal vocal : on parle, c’est écrit, ça devient un souvenir
  let VJ = null;
  function vjBtn(t){ if(!t || hidden('blk:vj')) return ''; return `<button type="button" class="vj-b" onclick="CV.vjOpen()"><span class="vj-mic">🎙️</span><span><b>${MSGT('Raconte ta journée')}</b><small>${MSGT('Parle, c’est écrit tout seul et rangé dans tes souvenirs')}</small></span></button>`; }
  function vjOpen(){
    vjStop(true); const t = trip(); if(!t) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const ov = document.createElement('div'); ov.id = 'cv-vj'; ov.className = 'vj';
    ov.innerHTML = `<div class="vj-top"><b>🎙️ ${MSGT('Journal du jour')}</b><button type="button" onclick="CV.vjStop()" aria-label="Fermer">✕</button></div>
      <div class="vj-orb" id="vj-orb" onclick="CV.vjTog()"><span></span><span></span><span></span><i>🎙️</i></div><div class="vj-st" id="vj-st">${SR ? MSGT('Touche le micro et raconte') : MSGT('Dictée vocale : utilise le micro de ton clavier')}</div>
      <textarea class="vj-tx" id="vj-tx" placeholder="${esc(MSGT('Ce matin, on a…'))}"></textarea>
      <div class="vj-b2"><button type="button" class="pri" onclick="CV.vjSave()">📍 ${MSGT('Garder en souvenir')}</button><button type="button" onclick="CV.vjStop()">${MSGT('Annuler')}</button></div>`;
    document.body.appendChild(ov); requestAnimationFrame(()=>ov.classList.add('on'));
    VJ = {SR, rec:null, on:false, base:''};
    if(!SR) setTimeout(()=>{ const x = document.getElementById('vj-tx'); if(x) x.focus(); }, 300);
  }
  function vjTog(){
    if(!VJ) return; if(!VJ.SR){ const x = document.getElementById('vj-tx'); if(x) x.focus(); return; }
    if(VJ.on){ try { VJ.rec.stop(); } catch(e){} return; }
    const rec = new VJ.SR(); VJ.rec = rec; rec.lang = (window.I18N && I18N.locale) || 'fr-FR'; rec.continuous = true; rec.interimResults = true;
    const tx = document.getElementById('vj-tx'); VJ.base = tx.value ? tx.value.trim() + ' ' : '';
    rec.onresult = e => { let fin = '', tmp = ''; for(let i = 0; i < e.results.length; i++){ const r = e.results[i]; if(r.isFinal) fin += r[0].transcript; else tmp += r[0].transcript; } tx.value = (VJ.base + fin + tmp).replace(/\s+/g, ' '); tx.scrollTop = tx.scrollHeight; };
    rec.onend = () => { if(!VJ) return; VJ.on = false; VJ.base = tx.value ? tx.value.trim() + ' ' : ''; const o = document.getElementById('vj-orb'); if(o) o.classList.remove('on'); const st = document.getElementById('vj-st'); if(st) st.textContent = MSGT('Touche pour continuer'); };
    rec.onerror = e => { const st = document.getElementById('vj-st'); if(st) st.textContent = e.error === 'not-allowed' ? MSGT('Autorise le micro pour l’appli') : MSGT('Dictée vocale : utilise le micro de ton clavier'); };
    try { rec.start(); VJ.on = true; const o = document.getElementById('vj-orb'); if(o) o.classList.add('on'); const st = document.getElementById('vj-st'); if(st) st.textContent = MSGT('Je t’écoute…'); } catch(e){}
  }
  function vjStop(quiet){ if(VJ && VJ.rec) try { VJ.rec.abort(); } catch(e){} VJ = null; const o = document.getElementById('cv-vj'); if(o) o.remove(); }
  function vjSave(){
    const t = trip(), tx = (document.getElementById('vj-tx') || {}).value || ''; if(!t) return; if(!tx.trim()){ alert(MSGT('Raconte d’abord quelque chose 🙂')); return; }
    const k = dayList().indexOf(isoToday()), l = lnLast(t.id), g = l ? LN.geo[lnGK(l)] : null;
    put({id:'s' + uid(), type:'souv', trip:t.id, date:isoToday(), titre:'🎙️ ' + MSGT('Journal') + (k >= 0 ? ' · J' + (k + 1) : ''), lieu: g ? [g.city, g.country].filter(Boolean).join(', ') : '', lat: l ? l[0] : null, lng: l ? l[1] : null, cc: g ? g.cc : '', texte: tx.trim(), photos:[]}, '🎙️ ' + MSGT('Journal enregistré'));
    vjStop(); refresh();
  }

  // 📴 hors ligne malin : les cartes du voyage se téléchargent toutes seules en Wi-Fi, et un bandeau quand le réseau tombe
  async function omapAuto(){
    try {
      const t = trip(); if(!t || t.demo || !t.debut || M.omAuto === false) return; const ph = tripPhase(t), soon = ph === 'prep' && nights(isoToday(), t.debut) <= 3;
      if(!(ph === 'live' || soon) || !navigator.onLine) return;
      const c = navigator.connection; if(c && (c.saveData || (c.type && c.type !== 'wifi' && c.type !== 'ethernet' && c.type !== 'unknown'))) return;
      const have = OM()[t.id]; if(have && Date.now() - have.at < 3 * 864e5) return;
      if(M.omTry && Date.now() - M.omTry < 6 * 3600e3) return; M.omTry = Date.now(); persist();
      const ok = await omapGo(true); if(ok) toast('📴 ' + MSGT('Cartes du voyage prêtes hors ligne'));
    } catch(e){}
  }
  setTimeout(omapAuto, 15000); document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'visible') setTimeout(omapAuto, 8000); });
  window.addEventListener('offline', ()=>{ try { refresh(); } catch(e){} }); window.addEventListener('online', ()=>{ try { refresh(); } catch(e){} });
  function offBand(t){
    if(!t) return ''; const have = OM()[t.id];
    if(!navigator.onLine) return `<div class="off-b on"><b>📴 ${MSGT('Pas de réseau')}</b><small>${MSGT('Tout ton voyage reste là')}</small><div><button type="button" onclick="CV.tlDay()">📄 ${MSGT('Fiche du jour')}</button>${have ? `<button type="button" onclick="CV.omapOpen()">🗺️ ${MSGT('Carte hors ligne')}</button>` : ''}</div></div>`;
    return have ? `<button type="button" class="off-b ok" onclick="CV.omapSheet()">📴 ${MSGT('Prêt hors ligne')} · ${MSGT('cartes, billets, fiche du jour')} ✓</button>`
      : `<button type="button" class="off-b" onclick="CV.omapSheet()">📥 ${MSGT('Télécharge les cartes pour le hors ligne')}</button>`;
  }

  // 🗣️ phrase du jour et 💱 monnaie du pays où l’on est
  const SAY2 = {   // combien ?, l’addition, toilettes, excusez-moi, délicieux
    pt:['Quanto custa?','A conta, por favor','Onde fica a casa de banho?','Com licença','Está delicioso!'], ptbr:['Quanto custa?','A conta, por favor','Onde fica o banheiro?','Com licença','Está delicioso!'],
    es:['¿Cuánto cuesta?','La cuenta, por favor','¿Dónde está el baño?','Disculpe','¡Está delicioso!'], it:['Quanto costa?','Il conto, per favore','Dov’è il bagno?','Mi scusi','È buonissimo!'],
    de:['Wie viel kostet das?','Die Rechnung, bitte','Wo ist die Toilette?','Entschuldigung','Das ist lecker!'], nl:['Hoeveel kost het?','De rekening, alstublieft','Waar is het toilet?','Pardon','Heerlijk!'],
    en:['How much is it?','The bill, please','Where is the toilet?','Excuse me','It’s delicious!'], enus:['How much is it?','The check, please','Where is the restroom?','Excuse me','It’s delicious!'],
    el:['Póso kánei? (Πόσο κάνει;)','To logariasmó, parakaló (Τον λογαριασμό, παρακαλώ)','Poú eínai i toualéta? (Πού είναι η τουαλέτα;)','Signómi (Συγγνώμη)','Eínai nóstimo! (Είναι νόστιμο!)'],
    tr:['Ne kadar?','Hesap, lütfen','Tuvalet nerede?','Affedersiniz','Çok lezzetli!'], hr:['Koliko košta?','Račun, molim','Gdje je WC?','Oprostite','Ukusno je!'],
    cs:['Kolik to stojí?','Zaplatím, prosím','Kde je toaleta?','Promiňte','Je to výborné!'], pl:['Ile to kosztuje?','Poproszę rachunek','Gdzie jest toaleta?','Przepraszam','Pyszne!'],
    hu:['Mennyibe kerül?','A számlát, kérem','Hol van a mosdó?','Elnézést','Nagyon finom!'], sv:['Vad kostar det?','Notan, tack','Var är toaletten?','Ursäkta','Det är jättegott!'],
    no:['Hva koster det?','Regningen, takk','Hvor er toalettet?','Unnskyld','Det smaker godt!'], da:['Hvad koster det?','Regningen, tak','Hvor er toilettet?','Undskyld','Det smager godt!'],
    ja:['Ikura desu ka? (いくらですか)','Okaikei onegaishimasu (お会計お願いします)','Toire wa doko desu ka? (トイレはどこですか)','Sumimasen (すみません)','Oishii! (おいしい)'],
    zh:['Duōshǎo qián? (多少钱？)','Mǎidān (买单)','Xǐshǒujiān zài nǎr? (洗手间在哪儿？)','Duìbuqǐ (对不起)','Hǎo chī! (好吃！)'],
    ko:['Eolmayeyo? (얼마예요?)','Gyesanseo juseyo (계산서 주세요)','Hwajangsiri eodiyeyo? (화장실이 어디예요?)','Sillyehamnida (실례합니다)','Masisseoyo! (맛있어요!)'],
    th:['Tao rai? (เท่าไร)','Check bin (เช็คบิล)','Hong nam yoo tee nai? (ห้องน้ำอยู่ที่ไหน)','Kho thot (ขอโทษ)','Aroi! (อร่อย)'],
    vi:['Bao nhiêu tiền?','Tính tiền','Nhà vệ sinh ở đâu?','Xin lỗi','Ngon quá!'], id:['Berapa harganya?','Minta bon','Di mana toilet?','Permisi','Enak sekali!']};
  const LG_CC = {PT:'pt',BR:'ptbr',ES:'es',MX:'es',AR:'es',IT:'it',DE:'de',AT:'de',NL:'nl',GB:'en',IE:'en',AU:'en',NZ:'en',US:'enus',CA:'enus',GR:'el',TR:'tr',HR:'hr',CZ:'cs',PL:'pl',HU:'hu',SE:'sv',NO:'no',DK:'da',JP:'ja',CN:'zh',KR:'ko',TH:'th',VN:'vi',ID:'id'};
  const TTS_LG = {pt:'pt-PT',ptbr:'pt-BR',es:'es-ES',it:'it-IT',de:'de-DE',nl:'nl-NL',en:'en-GB',enus:'en-US',el:'el-GR',tr:'tr-TR',hr:'hr-HR',cs:'cs-CZ',pl:'pl-PL',hu:'hu-HU',sv:'sv-SE',no:'nb-NO',da:'da-DK',ja:'ja-JP',zh:'zh-CN',ko:'ko-KR',th:'th-TH',vi:'vi-VN',id:'id-ID'};
  const LG_LAB = ['Bonjour','Merci','S’il te plaît','Au revoir','Santé !','Combien ça coûte ?','L’addition, s’il te plaît','Où sont les toilettes ?','Excuse-moi','C’est délicieux !'];
  function lgCC(t){
    try { const l = lnLast(t.id), g = l ? LN.geo[lnGK(l)] : null; if(g && g.cc) return g.cc; } catch(e){}
    try { const h = itemsForDay(isoToday()).night[0], c = h ? (M.ctry || {})[normQ(stayCity(h))] : null; if(c && c.cc) return c.cc; } catch(e){}
    try { const st = tlStages().find(x=>x.debut <= isoToday() && x.fin >= isoToday()), c = st ? (M.ctry || {})[normQ(st.city)] : null; if(c && c.cc) return c.cc; } catch(e){}
    return '';
  }
  function lgList(cc){ const a = SAY[cc] || [], b = SAY2[LG_CC[cc]] || []; return a.concat(b).map((p, i)=>({p, l:LG_LAB[i]})).filter(x=>x.p); }
  const lgNative = p => { const m = /\(([^)]+)\)/.exec(p); return (m ? m[1] : p.split(' / ')[0]).trim(); };
  function lgHTML(t){
    if(!t || hidden('blk:lang')) return ''; const cc = lgCC(t); if(!cc) return '';
    const mine = (window.I18N && I18N.lang) || 'fr', L = lgList(cc), cur = EURO.includes(cc) ? 'EUR' : REGION_CUR[cc] || '', h = curCode();
    const sameLang = (SAY_LANG[cc] || '') === mine, sameCur = !cur || cur === h; if((sameLang || !L.length) && sameCur) return '';
    const di = dayList().indexOf(isoToday()), x = L.length ? L[Math.max(0, di) % L.length] : null;
    return `<div class="lg" data-cc="${cc}" data-cur="${cur}">
      ${!sameLang && x ? `<div class="lg-p"><div class="lg-k">🗣️ ${MSGT('Phrase du jour')} · ${flag(cc)}</div><div class="lg-w"><b data-notr>${esc(x.p)}</b><button type="button" onclick="CV.lgSay('${ja(cc)}',${L.indexOf(x)})" aria-label="Écouter">🔊</button></div><small>${esc(x.l)}</small>
        <button type="button" class="lg-all" onclick="CV.lgAll('${ja(cc)}')">📖 ${MSGT('Toutes les phrases utiles')}</button></div>` : ''}
      ${!sameCur ? `<div class="lg-fx"><div class="lg-k">💱 ${MSGT('Monnaie')} : ${cur} ${CURS[cur] && CURS[cur] !== cur ? '(' + CURS[cur] + ')' : ''}</div><div class="lg-r" id="lg-r">…</div>
        <div class="lg-cv"><input class="v-in" id="lg-a" inputmode="decimal" placeholder="1000" oninput="CV.lgFx()"><span>${cur}</span><b id="lg-o">=</b></div>
        ${hidden('blk:book') || !bkOnce('fx:' + t.id + ':' + cur) ? '' : `<a class="lg-lk" href="${esc(bookUrl('wise'))}" target="_blank"${bookRel('wise')}>💳 ${MSGT('Payer sur place sans frais de change')} · Wise</a>`}</div>` : ''}</div>`;
  }
  async function lgHydrate(){ const e = document.querySelector('.lg[data-cur]'); if(!e || !e.dataset.cur || e.dataset.cur === curCode()) return; try { const one = await fxToEur(1, e.dataset.cur), r = document.getElementById('lg-r'); if(r) r.innerHTML = `1 ${esc(curCode())} = <b>${(1 / one).toLocaleString((window.I18N ? I18N.locale : 'fr-FR'), {maximumFractionDigits:2})} ${esc(e.dataset.cur)}</b> · 100 ${esc(e.dataset.cur)} = <b>${eur(100 * one)}</b>`; } catch(x){ const r = document.getElementById('lg-r'); if(r) r.textContent = '⚠️ ' + MSGT('Taux indisponible hors ligne'); } }
  async function lgFx(){ const e = document.querySelector('.lg[data-cur]'), a = num((document.getElementById('lg-a') || {}).value), o = document.getElementById('lg-o'); if(!e || !o) return; if(!a){ o.textContent = '='; return; } try { o.textContent = '= ' + eur(await fxToEur(a, e.dataset.cur)); } catch(x){ o.textContent = '⚠️'; } }
  function lgSay(cc, i){ const x = lgList(cc)[i]; if(!x) return; try { const u = new SpeechSynthesisUtterance(lgNative(x.p)); u.lang = TTS_LG[LG_CC[cc]] || ''; u.rate = .85; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch(e){ toast('🔇 ' + MSGT('Lecture vocale indisponible')); } }
  function lgAll(cc){ const L = lgList(cc);
    openSheet(`<h2>🗣️ ${flag(cc)} ${MSGT('Phrases utiles')}</h2><div class="lg-tab">${L.map((x, i)=>`<button type="button" onclick="CV.lgSay('${ja(cc)}',${i})"><small>${esc(x.l)}</small><b data-notr>${esc(x.p)}</b><i>🔊</i></button>`).join('')}</div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">${MSGT('Fermer')}</button></div>`); }
  /* ══════════ ⏳ Compte à rebours vivant · 🗳️ votes de groupe · 🧳 valise de chacun ══════════ */
  function cdLeft(t){ return new Date(t.debut + 'T' + ((items(i=>i.cat === 'transport' && i.date === t.debut).sort((a, b)=>String(a.heureDep||'').localeCompare(String(b.heureDep||'')))[0] || {}).heureDep || '08:00') + ':00').getTime() - Date.now(); }
  function cdDest(t){ const st = (()=>{ try { return tlStages(); } catch(e){ return []; } })(); return st[0] ? st[0].city : cityOf(t.titre || '') || t.titre || ''; }
  function cdTodo(t){
    const out = [];
    try { prepSteps().filter(x=>!x.ok && !x.opt).forEach(x=>out.push({ic:'⬜', l:x.l + (x.n ? ' (' + x.n + ')' : ''), fn:x.fn})); } catch(e){}
    try { docIssues().forEach(x=>out.push({ic:'⚠️', l:x, fn:'CV.tlDocs()', bad:1})); } catch(e){}
    try { const from = bagFromDefault(), dest = [...new Set([...tlStages().map(x=>((M.ctry || {})[normQ(x.city)] || {}).cc).filter(Boolean), ...bagCcs()])], dn = (M.fmDone || {})[t.id] || {};
      dest.forEach(cc=>entryRules(cc, from).x.filter(x=>!/CEAM/.test(x)).forEach(x=>out.push({ic: dn[x] ? '✅' : '🛂', l:x, done:!!dn[x], fm:x}))); } catch(e){}
    return out;
  }
  function cdHTML(){
    const t = trip(); if(!t || !t.debut || t.archived || t.demo || tripPhase(t) !== 'prep' || hidden('blk:cd')) return '';
    const ms = cdLeft(t); if(ms > 400 * 864e5) return '';
    const dj = Math.max(0, nights(isoToday(), t.debut)), dest = cdDest(t), co = (M.ctry || {})[normQ(dest)];
    const todo = cdTodo(t), left = todo.filter(x=>!x.done), ck = list('check', c=>c.trip === t.id), ckd = ck.filter(c=>chkDone(c)).length;
    return `<div class="cd" id="cd" data-at="${Date.now() + ms}" data-city="${esc(dest)}">
      <div class="cd-top"><span>${dj === 0 ? '🧳 C’est aujourd’hui !' : dj === 1 ? '✈️ Départ demain' : '⏳ Départ dans'}</span><span class="cd-wx" id="cd-wx"></span></div>
      <div class="cd-j"><b>${dj === 0 ? 'Jour J' : 'J-' + dj}</b><span class="cd-dest">${co && co.cc ? flag(co.cc) + ' ' : '📍 '}<span data-notr>${esc(dest)}</span></span></div>
      <div class="cd-clock" id="cd-clock">${cdClock(ms)}</div>${hidden('blk:prep') ? `
      <div class="cd-todo"><div class="cd-th"><b>${left.length ? 'Avant de partir' : '✨ Tout est prêt !'}</b>${ck.length ? `<button type="button" onclick="CV.tab('check')">🧳 Valise ${ckd}/${ck.length}</button>` : ''}</div>
        ${todo.slice(0, 6).map(x=>`<button type="button" class="cd-t${x.done ? ' ok' : ''}${x.bad ? ' bad' : ''}" onclick="${x.fm ? `CV.cdFm(this)` : x.fn}" ${x.fm ? `data-fm="${esc(x.fm)}"` : ''}><i>${x.ic}</i><span>${esc(x.l)}</span></button>`).join('')}
        ${todo.length > 6 ? `<small>+ ${todo.length - 6} autre${todo.length - 6 > 1 ? 's' : ''}</small>` : ''}${cdIns(t)}</div>` : ''}</div>`;
  }
  function bkOnce(key){   // le lien s’affiche le premier jour où il est utile, puis plus jamais pour ce voyage
    const o = M.bkOnce || (M.bkOnce = {}), d = isoToday();
    if(o[key] && o[key] !== d) return false;
    if(!o[key]){ o[key] = d; try { persist(); } catch(e){} } return true;
  }
  const roamFree = cc => (EU_CEAM.includes(cc) && cc !== 'CH') || ['RE','GP','MQ','GF','YT','MF'].includes(cc);   // itinérance gratuite (UE et EEE)
  function cdIns(t){
    if(hidden('blk:book')) return '';
    let far = false; try { const tc = ccOf(String(t.titre || '').split(/[·,(–-]/)[0].trim()); far = [...packDest(), tc].filter(Boolean).some(cc=>!roamFree(cc)); } catch(e){}
    if(!far) return ''; const ok0 = list('check', c=>c.trip === t.id && /assurance/i.test(c.label || '') && chkDone(c)).length; if(ok0 || !bkOnce('ins:' + t.id)) return '';
    const k = ((window.I18N && I18N.lang) || 'fr') === 'fr' ? 'chapka' : 'safetywing';   // assureur français pour les francophones
    return `<a class="cd-lk" href="${esc(bookUrl(k))}" target="_blank"${bookRel(k)}>🛡️ ${MSGT('Assurance voyage hors Europe')} · ${BK[k][1]}</a>`;
  }
  function cdClock(ms){ const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60, two = n => String(n).padStart(2, '0');
    return `<span><b>${d}</b><small>jours</small></span><span><b>${two(h)}</b><small>heures</small></span><span><b>${two(m)}</b><small>min</small></span><span><b>${two(x)}</b><small>s</small></span>`; }
  setInterval(()=>{ const c = document.getElementById('cd'); if(!c || document.visibilityState !== 'visible') return; const k = document.getElementById('cd-clock'); if(k) k.innerHTML = cdClock(+c.dataset.at - Date.now()); }, 1000);
  // 📸 photo du compte à rebours : la ville, sinon le pays, sinon le titre du voyage, sinon la couverture du voyage.
  // Chaque photo candidate est essayée tour à tour (une image Wikimedia peut refuser de s'afficher) ; celle qui marche est gardée pour ce voyage.
  // 🖼️ photo déjà chargée sur cet écran : remise tout de suite (pas de nouveau chargement ni de fondu) quand la carte est redessinée
  let CDBG = null;
  function cdBgTag(){ const t = trip(); return CDBG && t && CDBG.tid === t.id ? `<div class="cd-bg ok still" id="cd-bg" style="background-image:url(&quot;${esc(CDBG.u)}&quot;)"></div>` : '<div class="cd-bg" id="cd-bg"></div>'; }
  async function cdPhoto(t, city){
    const bg = document.getElementById('cd-bg'); if(!bg) return;   // (plus de photo de la ville dans la carte : l’en-tête porte la photo d’ambiance)
    if(bg.classList.contains('still') && CDBG && CDBG.tid === t.id) return;
    const show = u => new Promise(res=>{ const im = new Image(); im.referrerPolicy = 'no-referrer'; im.onload = () => { if(!im.naturalWidth) return res(false); bg.style.backgroundImage = `url("${u}")`; bg.classList.add('ok'); CDBG = {tid:t.id, u}; res(true); }; im.onerror = () => res(false); im.src = u; });
    M.cdImg = M.cdImg || {}; const keep = M.cdImg[t.id];
    if(keep && keep.c === city && await show(keep.u)) return;
    const co = (M.ctry || {})[normQ(city)], cc = (co && co.cc) || (t.ccs || [])[0] || '';
    const names = [...new Set([city, cc && typeof ccName === 'function' ? ccName(cc) : '', String(t.titre || '').replace(/[^\p{L}\s'’-]/gu, ' ').replace(/\s+/g, ' ').trim()].filter(Boolean).map(x=>x.trim()))];
    const tried = new Set();
    for(const n of names){
      const d = await expLoad(n).catch(()=>null); if(!d) continue;
      for(const u of [d.hero, ...(d.heroes || [])].filter(Boolean)){ if(tried.has(u)) continue; tried.add(u); if(!document.getElementById('cd-bg')) return;
        if(await show(u)){ M.cdImg[t.id] = {c:city, u}; persist(); return; } }
    }
    if(t.cover) try { const u = await photoURL(t.cover); if(u) await show(u); } catch(e){}
  }
  async function cdHydrate(){
    const c = document.getElementById('cd'); if(!c || c.dataset.ok) return; c.dataset.ok = '1'; const t = trip(); if(!t) return;
    try { await cdPhoto(t, c.dataset.city); } catch(e){}
    try { const st = tlStages()[0]; if(st && nights(isoToday(), st.debut) <= 14){ const v = await meteoFor(st), w = document.getElementById('cd-wx'); if(w && v) w.textContent = meteoIcon(v) + ' ' + v.min + '° → ' + v.max + '°'; } } catch(e){}
  }
  function cdFm(b){ const t = trip(); if(!t) return; const k = b.dataset.fm; M.fmDone = M.fmDone || {}; const d = M.fmDone[t.id] = M.fmDone[t.id] || {}; if(d[k]) delete d[k]; else d[k] = 1; persist();
    b.classList.toggle('ok', !!d[k]); const i = b.querySelector('i'); if(i) i.textContent = d[k] ? '✅' : '🛂'; if(d[k]) toast('✅ ' + MSGT('Noté comme fait')); }

  // 🧳 valise de chacun : une ligne « pour chacun », chaque voyageur coche la sienne
  const chkDone = c => c.each ? tvOf(c.trip).every(p=>(c.doneBy || {})[p]) : !!c.done;
  function tvOf(tid){ const t = R[tid]; return ((t && t.voyageurs) || []).filter(p=>prof(p)); }
  function chkEach(id){ const i = clone(R[id]); if(!i) return; i.each = !i.each; if(i.each){ i.doneBy = i.doneBy || {}; if(i.done && M.me) i.doneBy[M.me] = 1; } i.done = chkDone(i); put(i, i.each ? '👥 ' + MSGT('Chacun coche le sien') : '👤 ' + MSGT('Une seule fois pour le groupe')); renderCheck(); }
  /* ══════════ 🏁 Voyage fini : story du voyage entier, trophées, bilan en grand, « il y a un an » ══════════ */
  function tripLikes(tid){ const by = {}; list('like', l=>l.trip === 'ft:' + tid && l.on).forEach(l=>{ by[l.feed] = (by[l.feed] || 0) + 1; }); return by; }
  function tripTop(tid, n){
    const lk = tripLikes(tid), S = list('souv', x=>x.trip === tid && (x.photos||[]).length);
    const L = S.map(x=>({p:x.photos[0], s:x, n:lk['fd:' + x.id] || 0})).filter(x=>x.n > 0).sort((a, b)=>b.n - a.n);
    if(L.length >= n) return L.slice(0, n);
    const used = new Set(L.map(x=>x.p)), rest = S.flatMap(x=>(x.photos||[]).map(p=>({p, s:x, n:0}))).filter(x=>!used.has(x.p));
    const st = Math.max(1, Math.floor(rest.length / Math.max(1, n - L.length)));
    return L.concat(rest.filter((x, i)=>i % st === 0)).slice(0, n);
  }
  function tripTrophies(t){
    const r = tripRecap(t), nv = (t.voyageurs||[]).length, lk = Object.values(tripLikes(t.id)).reduce((a, b)=>a + b, 0), T = [];
    if(r.km >= 5000) T.push({i:'✈️', t:'Globe-trotter', d:r.km.toLocaleString(NL()) + ' km parcourus'});
    if(r.ccs.length >= 3) T.push({i:'🌍', t:'Explorateur', d:r.ccs.length + ' pays traversés'});
    if(r.nph >= 200) T.push({i:'📸', t:'Paparazzi', d:r.nph + ' photos'});
    if(lk >= 20) T.push({i:'❤️', t:'Star des abonnés', d:lk + ' j’aime'});
    if(r.days >= 14) T.push({i:'🧭', t:'Grand voyage', d:r.days + ' jours sur la route'});
    if(nv >= 3) T.push({i:'👨‍👩‍👧', t:'Tribu en vadrouille', d:nv + ' voyageurs'});
    if(r.km >= 500 && r.km < 5000) T.push({i:'🛣️', t:'Bourlingueur', d:r.km.toLocaleString(NL()) + ' km'});
    if(!T.length) T.push({i:'🧳', t:'Beau voyage', d:r.days + ' jour' + (r.days > 1 ? 's' : '') + ' de souvenirs'});
    return T;
  }
  function tripLines(tid){
    const by = trkByWho(tid, false), lines = Object.entries(by).filter(([, p])=>p.length > 1).map(([w, p])=>({pts:p.filter((x, i)=>i % Math.max(1, Math.ceil(p.length / 600)) === 0).map(x=>[x[0], x[1]]), color: w ? pcol(w) : '#0ea5e9'}));
    const geo = list('souv', x=>x.trip === tid && x.lat != null && x.lng != null).sort((a, b)=>(a.date||'').localeCompare(b.date||''));
    if(!lines.length && geo.length > 1) lines.push({pts:geo.map(x=>[+x.lat, +x.lng]), color:'#f43f5e'});
    return {lines, mk: geo.filter((x, i)=>i % Math.max(1, Math.ceil(geo.length / 25)) === 0).map((x, i)=>({lat:+x.lat, lng:+x.lng, label:'•', color:'#f43f5e'}))};
  }
  function storyTrip(tid, mode){
    tid = tid || M.trip; const t = R[tid]; if(!t) return;
    if(M.trip !== tid){ try { go(tid); } catch(e){} }
    const r = tripRecap(t), all = list('souv', x=>x.trip === tid).sort((a, b)=>(a.date||'').localeCompare(b.date||'') || (a.ordre||0) - (b.ordre||0));
    if(!all.length){ alert('Ajoute des souvenirs pour créer la story du voyage.'); return; }
    const ds = dayList(), days = [...new Set(all.filter(x=>x.date).map(x=>x.date))].sort(), lk = Object.values(tripLikes(tid)).reduce((a, b)=>a + b, 0);
    const cov = (coverId && coverId(t)) || (all.find(x=>(x.photos||[]).length) || {photos:[]}).photos[0];
    const slides = [{k: mode === 'home' ? 'home' : 'tintro', d:4600, ph:cov, title:t.titre || '', dates:tripDatesLong(t), flags:r.ccs.slice(0, 8).map(flag).join(' ')},
      {k:'tstats', d:5400, r, lk}];
    const tl = tripLines(tid); if(tl.lines.length || tl.mk.length > 1) slides.push({k:'map', d:5400, lines:tl.lines, mk:tl.mk, ttl:'Le voyage'});
    const per = days.length > 12 ? 1 : days.length > 6 ? 2 : 3, key = 't:' + tid, cfg = stCfg(key), cands = all.flatMap(x=>(x.photos||[]).map(p=>({p, s:x})));
    days.forEach(d=>{ const S = all.filter(x=>x.date === d), k = ds.indexOf(d), pl = [...new Set(S.map(x=>String(x.lieu || '').split(',')[0].trim()).filter(Boolean))];
      slides.push({k:'chap', d:2600, date:d, j:k >= 0 ? k + 1 : '', place:pl.slice(0, 2).join(' · '), title:dayInfo(d).titre || ''});
      const P = S.flatMap(x=>(x.photos||[]).map(p=>({p, s:x}))); const st = Math.max(1, Math.ceil(P.length / per));
      (cfg.ph ? P.filter(x=>cfg.ph.includes(x.p)) : P.filter((x, i)=>i % st === 0).slice(0, per)).forEach((x, i)=>slides.push({k:'ph', d:3800, p:x.p, s:x.s, first:i === 0, who:(t.voyageurs||[]).length > 1 && x.s.createdBy ? pname(x.s.createdBy) : ''})); });
    const top = tripTop(tid, 3).filter(x=>x.n > 0); if(top.length >= 2) slides.push({k:'top', d:5200, top});
    slides.push({k:'trophy', d:5200, tr:tripTrophies(t)});
    slides.push({k:'tend', d:0, tid, title:t.titre || '', pub: !!socCode(tid)});
    stPlay(slides, t.titre || '', tripDatesLong(t), {key, cands, re:()=>storyTrip(tid)});
  }
  // 💌 l’épisode final : un dernier souvenir pour les abonnés (résumé + les plus belles photos)
  function tripFinal(tid){
    const t = R[tid]; if(!t) return; const r = tripRecap(t), top = tripTop(tid, 6);
    const txt = [r.days + ' ' + (r.days > 1 ? MSGT('jours') : MSGT('jour')), r.km ? r.km.toLocaleString(NL()) + ' km' : '', r.ccs.length ? r.ccs.map(flag).join(' ') : '', r.nph + ' photos'].filter(Boolean).join(' · ') + '\n\n' + MSGT('Merci de nous avoir suivis !') + ' ❤️';
    put({id:'s' + uid(), type:'souv', trip:tid, date:t.fin || isoToday(), titre:'🏁 ' + MSGT('Fin du voyage'), lieu:'', texte:txt, photos:top.map(x=>x.p)}, '💌 ' + MSGT('Épisode final envoyé'));
    try { if(feedCode(tid)) feedBuild(tid); } catch(e){}
    refresh();
  }
  function bilanBig(t){
    if(!t || tripPhase(t) === 'prep') return '';
    const all = list('souv', x=>x.trip === t.id), nph = all.reduce((a, x)=>a + (x.photos||[]).length, 0); if(!all.length) return '';
    const top = tripTop(t.id, 5), lk = tripLikes(t.id), tr = tripTrophies(t);
    const score = {}; all.forEach(x=>{ if(!x.date) return; score[x.date] = (score[x.date] || 0) + (x.photos||[]).length + 3 * (lk['fd:' + x.id] || 0); });
    const best = Object.entries(score).sort((a, b)=>b[1] - a[1])[0], bd = best && best[0], bS = bd ? all.filter(x=>x.date === bd) : [], bph = bS.flatMap(x=>x.photos || []), k = bd ? dayList().indexOf(bd) : -1;
    const tl = tripLines(t.id);
    return `<div class="bb">
      ${rtCard(t)}
      <div class="bb-tro">${tr.slice(0, 4).map((x, i)=>`<div class="bb-t" style="--i:${i}"><i>${x.i}</i><b>${esc(x.t)}</b><small>${esc(x.d)}</small></div>`).join('')}</div>
      <button type="button" class="bb-story" onclick="CV.storyTrip('${ja(t.id)}')"><span class="bb-pl">▶</span><span><b>La story du voyage</b><small>${nph} photos · en musique · un chapitre par jour</small></span></button>
      <div class="bb-car" aria-label="${esc(MSGT('Souvenirs du voyage'))}">
        ${bd ? `<div class="bb-sl"><div class="bb-best"><div class="bb-bi">${bph.slice(0, 3).map((p, i)=>`<img data-ph="${esc(p)}.t" alt="" style="--i:${i}">`).join('')}</div><div class="bb-bt"><small>⭐ Le meilleur jour</small><b>${k >= 0 ? PJ(k + 1) + ' · ' : ''}${esc(fdate(bd))}</b><span>${esc(dayInfo(bd).titre || [...new Set(bS.map(x=>String(x.lieu || '').split(',')[0].trim()).filter(Boolean))].join(' · '))}</span><button type="button" onclick="CV.storyOpen('${ja(bd)}')">▶ Revivre ce jour</button></div></div></div>` : ''}
        ${top.length ? `<div class="bb-sl bb-slp"><div class="bb-sec"><b>❤️ ${top.some(x=>x.n) ? 'Les plus aimées' : 'Quelques pépites'}</b></div><div class="bb-top">${top.map((x, i)=>`<button type="button" class="bb-ph${i === 0 ? ' big' : ''}" style="--i:${i}" onclick="CV.view('${ja(x.s.id)}',${(x.s.photos||[]).indexOf(x.p)})"><img data-ph="${esc(x.p)}.t" alt="">${x.n ? `<b>${x.n} ❤️</b>` : ''}</button>`).join('')}</div></div>` : ''}
        ${tl.lines.length || tl.mk.length > 1 ? `<div class="bb-sl"><div class="bb-map"><div class="bb-mh"><b>🗺️ Tout le voyage</b><button type="button" onclick="CV.flyover('${ja(t.id)}')">🎥 Survol 3D</button></div><div class="bb-mm" data-bmap="${t.id}"><div class="v-sum-small">🗺️ Carte en cours…</div></div></div></div>` : ''}
      </div>
      <button type="button" class="bb-scr" onclick="CV.scrOpen()"><span>🗺️</span><span><b>${MSGT('Ma carte du monde à gratter')}</b><small>${MSGT('Gratte les pays que tu as visités')}</small></span><i>✨</i></button>
    </div>`;
  }
  async function bbMapHydrate(){
    const el = document.querySelector('[data-bmap]:not([data-ok])'); if(!el) return; el.dataset.ok = '1';
    const tl = tripLines(el.dataset.bmap);
    try { const c = await drawMap({w:720, h:460, lines:tl.lines, markers:tl.mk, maxZoom:12}); if(el.isConnected) el.innerHTML = `<img src="${c.toDataURL('image/jpeg', .86)}" alt="">`; } catch(e){ el.closest('.bb-map') && el.closest('.bb-map').remove(); }
  }
  // 📅 « Il y a un an » en plein écran
  async function annivShow(a){
    const t = R[a.trip], n = +isoToday().slice(0, 4) - +a.date.slice(0, 4), S = list('souv', x=>x.trip === a.trip && x.date === a.date), P = S.flatMap(x=>x.photos || []).slice(0, 4);
    const ov = document.createElement('div'); ov.id = 'cv-wlc'; ov.className = 'wlc an1';
    ov.innerHTML = `<div class="wlc-bg" id="wlc-bg"></div><div class="wlc-shade"></div>
      <div class="wlc-in"><div class="an-ph">${P.map((p, i)=>`<img data-ph="${esc(p)}.t" alt="" style="--i:${i}">`).join('')}</div><small class="wlc-k">${n > 1 ? 'Il y a ' + n + ' ans aujourd’hui' : 'Il y a un an aujourd’hui'}</small>
        <h1 data-notr>${esc(a.titre || a.lieu || (t && t.titre) || '')}</h1><p><span data-notr>${esc(t ? t.titre : '')}</span>${a.lieu ? ' · <span data-notr>' + esc(String(a.lieu).split(',')[0]) + '</span>' : ''}</p>
        <div class="wlc-b"><button type="button" class="pri" onclick="CV.wlcClose();CV.go('${ja(a.trip)}');CV.storyOpen('${ja(a.date)}')">▶ Revivre cette journée</button><button type="button" onclick="CV.wlcClose();CV.storyTrip('${ja(a.trip)}')">🎞️ Tout le voyage</button><button type="button" onclick="CV.wlcClose()">Plus tard</button></div></div>`;
    document.body.appendChild(ov); hydrate(); requestAnimationFrame(()=>ov.classList.add('on'));
    try { const u = await phURL(P[0]); const bg = document.getElementById('wlc-bg'); if(bg && u){ bg.style.backgroundImage = `url("${u}")`; bg.classList.add('ok'); } } catch(e){}
  }
  /* ══════════ 🎞️ Story du jour · 🧱 Mur de photos · 💌 Carte postale ══════════ */
  const PHU = {};
  async function phURL(id){ if(PHU[id]) return PHU[id]; try { const b = await photoBlob(id); if(b){ PHU[id] = URL.createObjectURL(b); return PHU[id]; } } catch(e){} return ''; }
  function studioHTML(all, nph){
    const t = trip(); if(!t || !all.length) return '';
    const days = [...new Set(all.filter(x=>x.date).map(x=>x.date))].sort(), last = days[days.length - 1], td = isoToday(), d = days.includes(td) ? td : last;
    return `<div class="sto"><button type="button" class="sto-b s1" onclick="CV.storyOpen('${ja(d || '')}')"><i>▶</i><b>Story${d === td ? ' du jour' : ''}</b><small>${d ? fdate(d) : ''}</small></button>
      <button type="button" class="sto-b s2" onclick="CV.wallOpen()"><i>🧱</i><b>Mur de photos</b><small>${nph} photo${nph > 1 ? 's' : ''}</small></button>
      <button type="button" class="sto-b s3" onclick="CV.pcOpen()"><i>💌</i><b>Carte postale</b><small>à envoyer</small></button></div>`;
  }
  function storyTodayHTML(t){
    const td = isoToday(), sv = list('souv', x=>x.trip === t.id && x.date === td); if(!sv.length) return '';
    const ph = sv.flatMap(x=>x.photos || []).slice(0, 4);
    return `<button type="button" class="st-today" onclick="CV.storyOpen('${ja(td)}')"><span class="st-stack">${ph.map((p, i)=>`<img data-ph="${esc(p)}.t" alt="" style="--i:${i}">`).join('') || '<i>📍</i>'}</span><span class="tx"><b>▶ Ta journée en story</b><small>${sv.length} souvenir${sv.length > 1 ? 's' : ''} · ${sv.reduce((a, x)=>a + (x.photos||[]).length, 0)} photos · en musique</small></span></button>`;
  }
  // ---------- lecteur façon Instagram (sert aussi au diaporama) ----------
  let ST = null;
  async function storyOpen(date){
    const t = trip(); if(!t) return;
    const all = list('souv', x=>x.trip === t.id);
    if(!date){ const ds = [...new Set(all.filter(x=>x.date).map(x=>x.date))].sort(); date = ds.includes(isoToday()) ? isoToday() : ds[ds.length - 1]; }
    const S = all.filter(x=>x.date === date).sort((a, b)=>(a.ordre||0) - (b.ordre||0) || (a.createdAt||0) - (b.createdAt||0));
    if(!S.length){ alert('Pas encore de souvenir ce jour-là.'); return; }
    const ds = dayList(), k = ds.indexOf(date), slides = [], multi = (t.voyageurs||[]).length > 1;
    const key = 'd:' + t.id + ':' + date, cfg = stCfg(key), cands = S.flatMap(x=>(x.photos||[]).map(p=>({p, s:x})));
    const phs = S.flatMap(x=>(x.photos||[]).slice(0, 4).map(p=>({s:x, p})));
    const step = Math.max(1, Math.ceil(phs.length / 14));
    // les chiffres de la journée
    const d0 = new Date(date + 'T00:00:00').getTime(), d1 = d0 + 864e5;
    const by = trkByWho(t.id, false), lines = [], kmT = Object.values(by).reduce((a, p)=>{ const q = p.filter(x=>x[2] >= d0 && x[2] < d1); let k2 = 0; for(let i = 1; i < q.length; i++) k2 += km({lat:q[i-1][0], lng:q[i-1][1]}, {lat:q[i][0], lng:q[i][1]}); return Math.max(a, k2); }, 0);
    Object.entries(by).forEach(([w, p])=>{ const q = p.filter(x=>x[2] >= d0 && x[2] < d1); if(q.length > 1) lines.push({pts:q.map(x=>[x[0], x[1]]), color: w ? pcol(w) : '#0ea5e9'}); });
    const geo = S.filter(x=>x.lat != null && x.lng != null);
    const places = [...new Set(S.map(x=>String(x.lieu || '').split(',')[0].trim()).filter(Boolean))];
    const dep = list('item', i=>i.trip === t.id && i.cat === 'divers' && i.date === date).reduce((a, i)=>a + totalOf(i), 0);
    const nph = S.reduce((a, x)=>a + (x.photos||[]).length, 0);
    slides.push({k:'intro', d:4200, ph: phs[0] && phs[0].p, date, j:k + 1, place: places[0] || '', title: dayInfo(date).titre || ''});
    slides.push({k:'stats', d:5200, km:kmT, nph, ns:S.length, dep, np:places.length, places});
    if(lines.length || geo.length > 1) slides.push({k:'map', d:5200, lines, mk: geo.map((x, i)=>({lat:+x.lat, lng:+x.lng, label:String(i + 1), color:'#f43f5e'}))});
    S.forEach(x=>{ const P = cfg.ph ? (x.photos||[]).filter(p=>cfg.ph.includes(p)) : (x.photos||[]).slice(0, 4).filter((p, i)=>phs.findIndex(q=>q.p === p) % step === 0);
      if(P.length) P.forEach((p, i)=>slides.push({k:'ph', d:4600, p, s:x, first:i === 0, who: multi && x.createdBy ? pname(x.createdBy) : ''}));
      else if(!(x.photos||[]).length && ((x.texte||'').trim() || x.titre)) slides.push({k:'txt', d:6000, s:x, who: multi && x.createdBy ? pname(x.createdBy) : ''}); });
    const fids = S.map(x=>'fd:' + x.id), lk = list('like', l=>fids.includes(l.feed) && l.on), cm = list('comment', c=>fids.includes(c.feed)).sort((a, b)=>(b.at||0) - (a.at||0));
    if(lk.length || cm.length) slides.push({k:'rx', d:5600, lk, cm});
    const nx = ds[k + 1];
    slides.push({k:'end', d:0, nx, nxt: nx ? dayInfo(nx).titre || '' : '', date});
    stPlay(slides, (t.titre || ''), (k >= 0 ? PJ(k + 1) + ' · ' : '') + fdate(date), {key, cands, re:()=>storyOpen(date)});
  }
  async function wallShow(){   // diaporama de tout le voyage (depuis le mur)
    const t = trip(); if(!t) return; const L = wallList(); if(!L.length) return;
    const key = 'w:' + t.id, cfg = stCfg(key), st = Math.max(1, Math.ceil(L.length / 60)), use = cfg.ph ? L.filter(x=>cfg.ph.includes(x.p)) : L.filter((x, i)=>i % st === 0);
    stPlay(use.map(x=>({k:'ph', d:4200, p:x.p, s:x.s, first:true, who:''})).concat([{k:'end', d:0, show:1}]), t.titre || '', '🧱 ' + use.length + ' photos', {key, cands:L, re:wallShow});
  }
  function stCfg(k){ return Object.assign({}, (M.stCfg || {})[k] || {}); }
  function stPlay(slides, title, sub, opt){
    stClose(true); opt = opt || {}; const cfg = opt.key ? stCfg(opt.key) : {};
    const ov = document.createElement('div'); ov.id = 'cv-story'; ov.className = 'st';
    ov.innerHTML = `<div class="st-bars">${slides.map(()=>'<i><b></b></i>').join('')}</div>
      <div class="st-top"><div><b data-notr>${esc(title)}</b><small>${esc(sub)}</small></div>${opt.key ? '<button type="button" class="st-ed" id="st-ed" aria-label="Personnaliser">✏️</button><button type="button" class="st-ed" id="st-vid" aria-label="Vidéo">🎬</button>' : ''}<button type="button" class="st-snd" id="st-snd" aria-label="Son">${M.filmMute || cfg.mus === 'off' ? '🔇' : '🔊'}</button><button type="button" class="st-x" aria-label="Fermer">✕</button></div>
      <div class="st-stage" id="st-stage"></div><div class="st-tap l"></div><div class="st-tap r"></div>`;
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    ST = {slides, i:-1, t:0, left:0, paused:false, ov, aud:null, opt, title, sub};
    if(opt.key){ ov.querySelector('#st-ed').onclick = e => { e.stopPropagation(); stEdit(); }; ov.querySelector('#st-vid').onclick = e => { e.stopPropagation(); stExport(); }; }
    ov.querySelector('.st-x').onclick = e => { e.stopPropagation(); stClose(); };
    ov.querySelector('#st-snd').onclick = e => { e.stopPropagation(); if(ST && ST.aud && ST.aud.paused && !M.filmMute){ ST.aud.volume = .7; ST.aud.play().catch(()=>{}); return; } M.filmMute = !M.filmMute; persist(); e.currentTarget.textContent = M.filmMute ? '🔇' : '🔊'; if(ST && ST.aud){ if(M.filmMute) ST.aud.pause(); else ST.aud.play().catch(()=>{}); } };
    let down = 0, held = false;
    const L = ov.querySelector('.st-tap.l'), Rr = ov.querySelector('.st-tap.r');
    [L, Rr].forEach(el=>{ el.addEventListener('pointerdown', ()=>{ down = Date.now(); held = false; setTimeout(()=>{ if(down && Date.now() - down >= 280){ held = true; stPause(true); } }, 300); });
      el.addEventListener('pointerup', ()=>{ const was = held; down = 0; if(was){ stPause(false); return; } if(el === L) stGo(ST.i - 1); else stGo(ST.i + 1); }); });
    // musique (même morceaux libres de droits que le film)
    if(cfg.mus !== 'off') try { const k = (cfg.mus != null ? +cfg.mus : (M.filmTrack || 0)) % TRACKS.length, a = new Audio(TRACKS[k]); a.loop = true; a.volume = 0; a.setAttribute('playsinline', ''); ST.aud = a;
      if(!M.filmMute){ a.play().then(()=>{ let v = 0; const f = setInterval(()=>{ v = Math.min(.7, v + .05); a.volume = v; if(v >= .7) clearInterval(f); }, 120); }).catch(()=>{}); } } catch(e){}
    slides.forEach(x=>{ if(x.p) phURL(x.p); }); stGo(0);
  }
  function stClose(quiet){
    if(!ST){ const o = document.getElementById('cv-story'); if(o) o.remove(); return; }
    clearTimeout(ST.t); try { if(ST.aud){ ST.aud.pause(); ST.aud.src = ''; } } catch(e){}
    ST.ov.remove(); ST = null; if(!quiet && !document.getElementById('cv-wall') && !document.getElementById('cv-feed')) document.body.style.overflow = '';
  }
  function stPause(p){
    if(!ST || ST.paused === p) return; ST.paused = p; const sl = ST.slides[ST.i]; if(!sl || !sl.d) return;
    const bar = ST.ov.querySelectorAll('.st-bars i b')[ST.i];
    if(p){ clearTimeout(ST.t); ST.left = Math.max(300, ST.end - Date.now()); const w = getComputedStyle(bar).width; bar.style.transition = 'none'; bar.style.width = w; ST.ov.classList.add('paused'); }
    else { ST.ov.classList.remove('paused'); bar.style.transition = `width ${ST.left}ms linear`; bar.style.width = '100%'; ST.end = Date.now() + ST.left; ST.t = setTimeout(()=>stGo(ST.i + 1), ST.left); }
  }
  async function stGo(i){
    if(!ST) return; const n = ST.slides.length; if(i < 0) i = 0; if(i >= n){ return; }
    clearTimeout(ST.t); ST.i = i; ST.paused = false; ST.ov.classList.remove('paused');
    const bars = ST.ov.querySelectorAll('.st-bars i b');
    bars.forEach((b, k)=>{ b.style.transition = 'none'; b.style.width = k < i ? '100%' : '0%'; });
    const sl = ST.slides[i], st = document.getElementById('st-stage'); if(!st) return;
    const el = document.createElement('div'); el.className = 'st-sl'; el.innerHTML = await stHTML(sl); if(!ST || ST.i !== i) return;
    st.querySelectorAll('.st-sl').forEach(o=>{ o.classList.add('out'); setTimeout(()=>o.remove(), 700); });
    st.appendChild(el); requestAnimationFrame(()=>el.classList.add('in')); hydrate();
    stAfter(sl, el);
    if(sl.d){ void bars[i].offsetWidth; bars[i].style.transition = `width ${sl.d}ms linear`; bars[i].style.width = '100%'; ST.end = Date.now() + sl.d; ST.t = setTimeout(()=>stGo(i + 1), sl.d); }
    else bars[i].style.width = '100%';
    const nx = ST.slides[i + 1]; if(nx && nx.p) phURL(nx.p);
  }
  async function stHTML(sl){
    const kb = 'kb' + (1 + Math.floor(Math.random() * 4));
    if(sl.k === 'intro'){ const u = sl.ph ? await phURL(sl.ph) : '';
      return `${u ? `<div class="st-bg ${kb}" style="background-image:url('${u}')"></div>` : '<div class="st-bg st-grad"></div>'}<div class="st-shade"></div>
        <div class="st-c st-intro"><small>${sl.j > 0 ? 'Jour ' + sl.j : ''}</small><h2>${esc(fdate(sl.date))}</h2>${sl.place ? `<p>📍 <span data-notr>${esc(sl.place)}</span></p>` : ''}${sl.title ? `<p class="st-tt">${esc(sl.title)}</p>` : ''}</div>`; }
    if(sl.k === 'stats'){ const box = (ic, v, l, dec) => `<div class="st-n"><i>${ic}</i><b data-cnt="${v}" data-d="${dec||0}">0</b><small>${l}</small></div>`;
      return `<div class="st-bg st-grad g2"></div><div class="st-c st-stats"><small>Ta journée en chiffres</small><div class="st-ns">${sl.km >= 0.1 ? box('🚶', +sl.km.toFixed(1), 'km parcourus', 1) : ''}${box('📸', sl.nph, sl.nph > 1 ? 'photos' : 'photo')}${box('📍', sl.ns, sl.ns > 1 ? 'souvenirs' : 'souvenir')}${sl.dep ? box('💶', Math.round(sl.dep), 'dépensés') : ''}</div>
        ${sl.places.length ? `<p class="st-pl">${sl.places.slice(0, 5).map(p=>`<span data-notr>${esc(p)}</span>`).join(' → ')}</p>` : ''}</div>`; }
    if(sl.k === 'map'){ let img = ''; try { const c = await drawMap({w:720, h:900, lines:sl.lines, markers:sl.mk, maxZoom:15}); img = c.toDataURL('image/jpeg', .85); } catch(e){}
      return `<div class="st-bg st-grad g3"></div><div class="st-c st-map"><small>${sl.ttl ? esc(sl.ttl) : 'La route du jour'}</small>${img ? `<div class="st-mimg"><img src="${img}" alt=""></div>` : '<p>🗺️</p>'}</div>`; }
    if(sl.k === 'ph'){ const u = await phURL(sl.p), x = sl.s || {};
      return `<div class="st-bg ${kb}" style="background-image:url('${u}')"></div><div class="st-blur" style="background-image:url('${u}')"></div><img class="st-img ${kb}" src="${u}" alt=""><div class="st-shade b"></div>
        ${sl.first !== false ? `<div class="st-cap"><b data-notr>${esc(x.titre || x.lieu || '')}</b>${x.lieu && x.lieu !== x.titre ? `<small>📍 <span data-notr>${esc(x.lieu)}</span></small>` : ''}${sl.who ? `<small>📸 <span data-notr>${esc(sl.who)}</span></small>` : ''}${x.texte && sl.first ? `<p data-notr>${esc(String(x.texte).slice(0, 160))}</p>` : ''}</div>` : ''}`; }
    if(sl.k === 'txt'){ const x = sl.s;
      return `<div class="st-bg st-grad g4"></div><div class="st-c st-txt"><b data-notr>${esc(x.titre || '')}</b>${x.lieu ? `<small>📍 <span data-notr>${esc(x.lieu)}</span></small>` : ''}${x.texte ? `<p data-notr>« ${esc(String(x.texte).slice(0, 320))} »</p>` : ''}${sl.who ? `<small>— <span data-notr>${esc(sl.who)}</span></small>` : ''}</div>`; }
    if(sl.k === 'rx'){ const who = [...new Set(sl.lk.map(l=>l.who).filter(Boolean))];
      return `<div class="st-bg st-grad g5"></div><div class="st-c st-rx"><small>Tes proches ont suivi</small><div class="st-hearts">${Array.from({length:Math.min(12, Math.max(4, sl.lk.length))}, (_, i)=>`<i style="--i:${i}">❤️</i>`).join('')}</div>
        <h3>${sl.lk.length} ❤️ · ${sl.cm.length} 💬</h3>${who.length ? `<p data-notr>${esc(who.slice(0, 5).join(', '))}${who.length > 5 ? '…' : ''}</p>` : ''}
        ${sl.cm.slice(0, 3).map((c, i)=>`<div class="st-cm" style="--i:${i}"><b data-notr>${esc(c.who || '')}</b><span data-notr>${esc(String(c.text || '').slice(0, 110))}</span></div>`).join('')}</div>`; }
    if(sl.k === 'home' || sl.k === 'tintro'){ const u = sl.ph ? await phURL(sl.ph) : '';
      return `${u ? `<div class="st-bg ${kb}" style="background-image:url('${u}')"></div>` : '<div class="st-bg st-grad g6"></div>'}<div class="st-shade"></div>
        <div class="st-c st-intro">${sl.k === 'home' ? '<div class="st-home">🏡</div><small>Bon retour !</small>' : '<small>Le film du voyage</small>'}<h2 data-notr>${esc(sl.title)}</h2><p>${esc(sl.dates)}</p>${sl.flags ? `<p class="st-fl">${sl.flags}</p>` : ''}</div>`; }
    if(sl.k === 'tstats'){ const box = (ic, v, l, dec) => `<div class="st-n"><i>${ic}</i><b data-cnt="${v}" data-d="${dec||0}">0</b><small>${l}</small></div>`;
      return `<div class="st-bg st-grad g2"></div><div class="st-c st-stats"><small>Le voyage en chiffres</small><div class="st-ns">${box('🗓️', sl.r.days, sl.r.days > 1 ? 'jours' : 'jour')}${sl.r.km ? box('🛣️', sl.r.km, 'km') : box('📍', sl.r.nsv, 'souvenirs')}${box('📸', sl.r.nph, 'photos')}${sl.r.ccs.length ? box('🌍', sl.r.ccs.length, 'pays') : box('❤️', sl.lk, 'j’aime')}</div>${sl.r.ccs.length ? `<p class="st-fl">${sl.r.ccs.map(flag).join(' ')}</p>` : ''}</div>`; }
    if(sl.k === 'chap') return `<div class="st-bg st-grad g${2 + (sl.j % 5)}"></div><div class="st-c st-chap"><small>Jour ${sl.j}</small><h2>${esc(fdate(sl.date))}</h2>${sl.place ? `<p>📍 <span data-notr>${esc(sl.place)}</span></p>` : ''}${sl.title ? `<p class="st-tt">${esc(sl.title)}</p>` : ''}</div>`;
    if(sl.k === 'top'){ const U = await Promise.all(sl.top.map(x=>phURL(x.p)));
      return `<div class="st-bg st-grad g5"></div><div class="st-c st-top3"><small>Les plus aimées</small><div class="st-pod">${sl.top.map((x, i)=>`<div class="st-pd p${i}" style="--i:${i}"><img src="${U[i]}" alt=""><b>${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} ${x.n} ❤️</b></div>`).join('')}</div></div>`; }
    if(sl.k === 'trophy') return `<div class="st-bg st-grad g6"></div><div class="st-c st-trophy"><small>Ton trophée</small><div class="st-cup">${sl.tr[0].i}</div><h2>${esc(sl.tr[0].t)}</h2><p>${esc(sl.tr[0].d)}</p>${sl.tr.length > 1 ? `<div class="st-mini">${sl.tr.slice(1, 4).map(x=>`<span>${x.i} ${esc(x.t)}</span>`).join('')}</div>` : ''}</div>`;
    if(sl.k === 'tend') return `<div class="st-bg st-grad g6"></div><div class="st-c st-end"><small>Fin</small><h2>Merci pour ce voyage</h2><p data-notr>${esc(sl.title)}</p>
        <div class="st-eb"><button type="button" onclick="CV.stRestart()">↺ Revoir</button><button type="button" onclick="CV.stExport()">🎬 Exporter en vidéo</button>${sl.pub ? `<button type="button" onclick="CV.stClose();CV.tripFinal('${ja(sl.tid)}')">💌 Envoyer l’épisode final aux abonnés</button>` : ''}<button type="button" onclick="CV.stClose();CV.go('${ja(sl.tid)}');CV.modeGo('bilan')">🏁 Le bilan</button><button type="button" onclick="CV.stClose()">Fermer</button></div></div>`;
    if(sl.k === 'end'){
      if(sl.show) return `<div class="st-bg st-grad g6"></div><div class="st-c st-end"><h2>Fin du diaporama</h2><div class="st-eb"><button type="button" onclick="CV.stRestart()">↺ Revoir</button><button type="button" onclick="CV.stClose()">Fermer</button></div></div>`;
      return `<div class="st-bg st-grad g6"></div><div class="st-c st-end"><small>${sl.nx ? 'Demain' : 'Et voilà'}</small><h2>${sl.nx ? esc(fdate(sl.nx)) : 'Quelle journée !'}</h2>${sl.nxt ? `<p>${esc(sl.nxt)}</p>` : ''}
        <div class="st-eb"><button type="button" onclick="CV.stRestart()">↺ Revoir</button><button type="button" onclick="CV.stExport()">🎬 Exporter en vidéo</button><button type="button" onclick="CV.stClose();CV.pcOpen()">💌 Carte postale</button><button type="button" onclick="CV.stClose();CV.wrapped()">✨ Récap à partager</button><button type="button" onclick="CV.stClose()">Fermer</button></div></div>`; }
    return '';
  }
  function stAfter(sl, el){
    el.querySelectorAll('[data-cnt]').forEach((b, k)=>{ const to = +b.dataset.cnt, d = +b.dataset.d || 0, t0 = performance.now() + k * 180; const f = now => { const q = Math.max(0, Math.min(1, (now - t0) / 1300)), e = 1 - Math.pow(1 - q, 3); b.textContent = (to * e).toFixed(d).replace('.', ','); if(q < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); });
  }
  function stRestart(){ if(ST) stGo(0); }
  // ✏️ choisir les photos et la musique de CETTE story (gardé pour la prochaine fois)
  function stEdit(){
    if(!ST || !ST.opt.key) return; stPause(true);
    const o = ST.opt, cfg = stCfg(o.key), sel = new Set(cfg.ph || ST.slides.filter(x=>x.k === 'ph').map(x=>x.p)), cur = cfg.mus != null ? String(cfg.mus) : String((M.filmTrack || 0) % TRACKS.length);
    ST.ed = {sel, mus:cur};
    const box = document.createElement('div'); box.className = 'st-edp'; box.id = 'st-edp';
    box.innerHTML = `<div class="st-edh"><b>✏️ Personnaliser la story</b><button type="button" onclick="CV.stEdClose()" aria-label="Fermer">✕</button></div>
      <div class="st-eds">🎵 Musique</div><div class="st-mus">${['off', ...TRACKS.map((_, i)=>String(i))].map(k=>`<button type="button" data-m="${k}" class="${k === cur ? 'on' : ''}" onclick="CV.stEdMus('${ja(k)}')">${k === 'off' ? '🔇 Sans musique' : '🎵 ' + esc(TRACK_N[+k] || 'Musique ' + (+k + 1))}</button>`).join('')}</div>
      <div class="st-eds">📸 Photos <small id="st-edn">${sel.size} / ${o.cands.length}</small><span><button type="button" onclick="CV.stEdAll(1)">Tout</button><button type="button" onclick="CV.stEdAll(0)">Rien</button><button type="button" onclick="CV.stEdAll(2)">Auto</button></span></div>
      <div class="st-edg">${o.cands.map(x=>`<button type="button" class="${sel.has(x.p) ? 'on' : ''}" data-p="${esc(x.p)}" onclick="CV.stEdPh(this)"><img data-ph="${esc(x.p)}.t" alt="" loading="lazy"><i>✓</i></button>`).join('')}</div>
      <button type="button" class="st-edgo" onclick="CV.stEdGo()">▶ Relancer la story</button>`;
    ST.ov.appendChild(box); hydrate(); requestAnimationFrame(()=>box.classList.add('on'));
  }
  function stEdMus(k){
    if(!ST || !ST.ed) return; ST.ed.mus = k; document.querySelectorAll('#st-edp .st-mus button').forEach(b=>b.classList.toggle('on', b.dataset.m === k));
    try { if(ST.aud){ ST.aud.pause(); } if(k === 'off'){ return; } const a = ST.aud || new Audio(); a.src = TRACKS[+k]; a.loop = true; a.volume = .6; ST.aud = a; a.play().catch(()=>{}); } catch(e){}
  }
  function stEdPh(b){ if(!ST || !ST.ed) return; const p = b.dataset.p; if(ST.ed.sel.has(p)) ST.ed.sel.delete(p); else ST.ed.sel.add(p); b.classList.toggle('on', ST.ed.sel.has(p)); const n = document.getElementById('st-edn'); if(n) n.textContent = ST.ed.sel.size + ' / ' + ST.opt.cands.length; }
  function stEdAll(m){
    if(!ST || !ST.ed) return; if(m === 2){ ST.ed.auto = true; ST.ed.sel = new Set(); } else { ST.ed.auto = false; ST.ed.sel = new Set(m ? ST.opt.cands.map(x=>x.p) : []); }
    document.querySelectorAll('#st-edp .st-edg button').forEach(b=>b.classList.toggle('on', ST.ed.sel.has(b.dataset.p))); const n = document.getElementById('st-edn'); if(n) n.textContent = (m === 2 ? 'auto' : ST.ed.sel.size + ' / ' + ST.opt.cands.length);
  }
  function stEdClose(){ const b = document.getElementById('st-edp'); if(b) b.remove(); if(ST){ if(ST.aud && ST.aud.src && ST.ed && ST.ed.mus !== 'off' && !M.filmMute) ST.aud.play().catch(()=>{}); stPause(false); } }
  function stEdGo(){
    if(!ST || !ST.ed) return; const o = ST.opt, ed = ST.ed;
    if(!ed.auto && !ed.sel.size){ alert(MSGT('Choisis au moins une photo.')); return; }
    M.stCfg = M.stCfg || {}; M.stCfg[o.key] = {mus: ed.mus === 'off' ? 'off' : +ed.mus, ph: ed.auto ? undefined : o.cands.map(x=>x.p).filter(p=>ed.sel.has(p))};
    if(ed.mus !== 'off'){ M.filmMute = false; }
    persist(); const re = o.re; stClose(true); setTimeout(re, 50);
  }

  // ---------- 🧱 Mur de photos ----------
  function wallList(){ return souvs().flatMap(x=>(x.photos||[]).map((p, i)=>({p, i, s:x}))); }
  let wlWho = null;
  // 👆 les photos du mur, dans le même ordre (jour par jour), pour les voir une par une
  function wallFlat(useWho){
    const L = wallList().filter(x=>!useWho || !wlWho || x.s.createdBy === wlWho), G = {}; L.forEach(x=>{ const k = x.s.date || '—'; (G[k] = G[k] || []).push(x); });
    return Object.keys(G).sort().flatMap(d=>G[d].map(x=>({p:x.p, sid:x.s.id, i:x.i, d:x.s.date || '', lieu:x.s.lieu || '', t:x.s.titre || '', by:x.s.createdBy && people1() ? pname(x.s.createdBy) : ''})));
  }
  const people1 = () => new Set(wallList().map(x=>x.s.createdBy).filter(Boolean)).size > 1;
  function wallStep(){ const L = wallFlat(true); if(L.length) psOpen(L, 0); }
  // 👆 toutes les photos d’un voyage en plein écran (glisser) : depuis « Passés » ou le haut du bilan, sans quitter la page
  function psTrip(tid){
    const sv = list('souv', s=>s.trip === tid && (s.photos||[]).length).sort((a, b)=>(a.date||'').localeCompare(b.date||'') || (a.ordre||0)-(b.ordre||0));
    if(!sv.length){ alert('Pas encore de photo dans ce voyage.'); return; }
    const many = new Set(sv.map(s=>s.createdBy).filter(Boolean)).size > 1;
    psOpen(sv.flatMap(s=>s.photos.map((p, i)=>({p, sid:s.id, i, d:s.date || '', lieu:s.lieu || '', t:s.titre || '', by:many && s.createdBy ? pname(s.createdBy) : ''}))), 0);
  }
  function wallOpen(who){
    const t = trip(); if(!t) return; const L0 = wallList(); if(!L0.length){ alert('Pas encore de photo dans ce voyage.'); return; } wlWho = who || null;
    let ov = document.getElementById('cv-wall'); if(ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'cv-wall'; document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    const people = [...new Set(L0.map(x=>x.s.createdBy).filter(Boolean))], L = who ? L0.filter(x=>x.s.createdBy === who) : L0, ds = dayList();
    const G = {}; L.forEach(x=>{ const k = x.s.date || '—'; (G[k] = G[k] || []).push(x); });
    let n = 0;
    ov.innerHTML = `<div class="wl-top"><button type="button" class="wl-x" onclick="CV.wallClose()" aria-label="Fermer">✕</button><div><b data-notr>${esc(t.titre || '')}</b><small>🧱 ${L.length} photo${L.length > 1 ? 's' : ''}</small></div><div class="wl-acts"><button type="button" class="wl-play wl-step" onclick="CV.wallStep()">👆 ${esc(MSGT('Une par une'))}</button><button type="button" class="wl-play" onclick="CV.wallShow()">▶ Diaporama</button></div></div>
      ${people.length > 1 ? `<div class="wl-chips"><button type="button" class="${who ? '' : 'on'}" onclick="CV.wallOpen()">Tout le monde</button>${people.map(p=>`<button type="button" class="${who === p ? 'on' : ''}" style="--c:${pcol(p)}" onclick="CV.wallOpen('${ja(p)}')"><i></i><span data-notr>${esc(pname(p))}</span></button>`).join('')}</div>` : ''}
      <div class="wl-body">${Object.keys(G).sort().map(d=>{ const k = ds.indexOf(d), pl = [...new Set(G[d].map(x=>String(x.s.lieu || '').split(',')[0].trim()).filter(Boolean))];
        return `<section><h3>${k >= 0 ? PJ(k + 1) + ' · ' : ''}${d !== '—' ? esc(fdate(d)) : 'Sans date'}${pl.length ? ` <small data-notr>${esc(pl.slice(0, 3).join(' · '))}</small>` : ''}${d !== '—' ? `<button type="button" onclick="CV.storyOpen('${ja(d)}')" aria-label="Lecture">▶</button>` : ''}</h3>
          <div class="wl-grid">${G[d].map((x, j)=>{ n++; const nG = G[d].length, big = nG === 1 ? ' w3' : nG === 2 ? ' t2' : j % 7 === 0 ? ' w2' : j % 5 === 3 ? ' t2' : ''; return `<button type="button" class="wl-i${big}" style="--r:${(Math.random() * 6 - 3).toFixed(1)}deg" onclick="CV.view('${ja(x.s.id)}',${x.i})"><img data-ph="${esc(x.p)}.t" alt="" loading="lazy"></button>`; }).join('')}</div></section>`; }).join('')}</div>`;
    hydrate();
    const io = new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }), {root:ov.querySelector('.wl-body'), rootMargin:'60px'});
    ov.querySelectorAll('.wl-i').forEach((b, k)=>{ b.style.transitionDelay = (k % 6) * 60 + 'ms'; io.observe(b); });
    requestAnimationFrame(()=>ov.classList.add('on'));
  }
  function wallClose(){ const o = document.getElementById('cv-wall'); if(o) o.remove(); if(!document.getElementById('cv-feed')) document.body.style.overflow = ''; }

  // ---------- 💌 Carte postale ----------
  let PC = null;
  function pcOpen(sid){
    const t = trip(); if(!t) return; const L = wallList(); if(!L.length){ alert('Ajoute d’abord une photo dans tes souvenirs.'); return; }
    const pick = sid ? L.find(x=>x.s.id === sid) || L[L.length - 1] : L[L.length - 1];
    setTimeout(()=>{ const d = document.querySelector('.pc-more'); if(d) d.addEventListener('toggle', ()=>hydrate()); }, 50);
    PC = {p:pick.p, s:pick.s};
    openSheet(`<h2>💌 Carte postale</h2><div class="v-sum-small" style="margin-bottom:8px">Choisis une photo, écris un mot : ta carte part en image sur WhatsApp, Messages, e-mail…</div>
      ${(()=>{ const btn = x => `<button type="button" class="${x.p === PC.p ? 'on' : ''}" data-p="${esc(x.p)}" data-s="${x.s.id}" onclick="CV.pcPick(this)"><img data-ph="${esc(x.p)}.t" alt="" loading="lazy"></button>`;
        const mine = sid ? L.filter(x=>x.s.id === sid) : [], rest = L.filter(x=>!sid || x.s.id !== sid).reverse();
        return (mine.length ? `<div class="pc-lbl">📍 <span data-notr>${esc(mine[0].s.titre || mine[0].s.lieu || '')}</span> · ${mine.length} photo${mine.length > 1 ? 's' : ''}</div><div class="pc-pick">${mine.map(btn).join('')}</div>` : '')
          + (rest.length ? (mine.length ? `<details class="pc-more"><summary>🖼️ <span>Toutes les autres photos du voyage (${rest.length})</span></summary><div class="pc-pick grid">${rest.map(btn).join('')}</div></details>` : `<div class="pc-pick grid">${rest.map(btn).join('')}</div>`) : ''); })()}
      <div class="v-f"><label>Ton mot</label><textarea class="v-in" id="pc-msg" rows="4" maxlength="400" placeholder="Il fait beau, on a marché toute la journée, on pense à vous…"></textarea></div>
      <div class="v-f"><label>Signé</label><input class="v-in" id="pc-sig" maxlength="40" value="${esc(myName() || '')}"></div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.pcShow()">💌 Voir ma carte</button><button type="button" class="v-btn sec" onclick="CV.close()">Annuler</button></div>`);
    hydrate();
  }
  function pcPick(b){ document.querySelectorAll('.pc-pick button').forEach(x=>x.classList.toggle('on', x === b)); PC.p = b.dataset.p; PC.s = R[b.dataset.s] || PC.s; }
  const pcCity = s => (String((s && s.lieu) || '').split(',')[0].trim()) || (s && s.titre) || (trip() || {}).titre || '';
  async function pcShow(){
    if(!PC) return; PC.msg = (document.getElementById('pc-msg') || {}).value || ''; PC.sig = (document.getElementById('pc-sig') || {}).value || myName() || '';
    closeSheet(true);
    const u = await phURL(PC.p), s = PC.s || {}, city = pcCity(s), d = s.date || isoToday(), cc = s.cc || '';
    const pm = (city.toLocaleUpperCase() + ' · ' + new Date(d + 'T12:00:00').toLocaleDateString((window.I18N ? I18N.locale : 'fr-FR'), {day:'numeric', month:'short', year:'numeric'}).toLocaleUpperCase());
    PC.city = city; PC.pm = pm; PC.cc = cc;
    const ov = document.createElement('div'); ov.id = 'cv-pc'; ov.className = 'pc';
    ov.innerHTML = `<div class="pc-scene"><div class="pc-card" id="pc-card" onclick="CV.pcFlip()">
        <div class="pc-f"><img src="${u}" alt=""><div class="pc-big"><small>Bons baisers de</small><b data-notr>${esc(city)}</b></div></div>
        <div class="pc-b"><div class="pc-msg" data-notr>${esc(PC.msg || '…')}<em>${esc(PC.sig)}</em></div><div class="pc-r"><div class="pc-stamp"><span>${flag(cc)}</span><small>VEZORIA</small></div><div class="pc-post"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54"/><circle cx="60" cy="60" r="44"/><path d="M0 52h120M0 60h120M0 68h120" /></svg><span data-notr>${esc(pm)}</span></div><div class="pc-to">À vous tous ❤️</div></div></div>
      </div></div>
      <div class="pc-btns"><button type="button" onclick="CV.pcFlip()">🔄 Retourner</button><button type="button" class="pri" onclick="CV.pcShare()">📤 Partager l’image</button><button type="button" onclick="CV.pcClose()" aria-label="Fermer">✕</button></div>`;
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    requestAnimationFrame(()=>ov.classList.add('on'));
    setTimeout(()=>{ const c = document.getElementById('pc-card'); if(c) c.classList.add('flip'); }, 2200);
  }
  function pcFlip(){ const c = document.getElementById('pc-card'); if(c) c.classList.toggle('flip'); }
  function pcClose(){ const o = document.getElementById('cv-pc'); if(o) o.remove(); document.body.style.overflow = ''; }
  async function pcImage(){
    try { await document.fonts.load('64px Caveat'); } catch(e){}
    const W = 1200, H = 800, G = 40, cv = document.createElement('canvas'); cv.width = W; cv.height = H * 2 + G; const c = cv.getContext('2d');
    c.fillStyle = '#f3ede2'; c.fillRect(0, 0, cv.width, cv.height);
    // recto
    const u = await phURL(PC.p); const im = await new Promise(r=>{ const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = u; });
    c.save(); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
    if(im){ const sc = Math.max((W - 48) / im.width, (H - 48) / im.height), w = im.width * sc, h = im.height * sc; c.beginPath(); c.rect(24, 24, W - 48, H - 48); c.clip(); c.drawImage(im, 24 + (W - 48 - w) / 2, 24 + (H - 48 - h) / 2, w, h); }
    c.restore();
    const gr = c.createLinearGradient(0, H * .45, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.55)'); c.fillStyle = gr; c.fillRect(24, 24, W - 48, H - 48);
    c.fillStyle = '#fff'; c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 18; c.font = '500 54px Caveat, cursive'; c.fillText(TT('Bons baisers de'), 70, H - 175);
    c.font = '900 118px Georgia, serif'; let fs = 118; while(c.measureText(PC.city.toLocaleUpperCase()).width > W - 140 && fs > 50){ fs -= 6; c.font = `900 ${fs}px Georgia, serif`; } c.fillText(PC.city.toLocaleUpperCase(), 66, H - 70); c.shadowBlur = 0;
    // verso
    const y0 = H + G; c.fillStyle = '#fbf6ec'; c.fillRect(0, y0, W, H); c.strokeStyle = '#d8ccb8'; c.lineWidth = 2; c.beginPath(); c.moveTo(W * .6, y0 + 60); c.lineTo(W * .6, y0 + H - 60); c.stroke();
    c.fillStyle = '#2b2440'; c.font = '500 46px Caveat, cursive';
    const words = String(PC.msg || '').split(/\s+/); let line = '', yy = y0 + 110; const mw = W * .6 - 110;
    for(const w of words){ const tl = line ? line + ' ' + w : w; if(c.measureText(tl).width > mw){ c.fillText(line, 60, yy); yy += 58; line = w; if(yy > y0 + H - 150) break; } else line = tl; }
    if(line && yy <= y0 + H - 150) c.fillText(line, 60, yy);
    c.font = '600 50px Caveat, cursive'; c.fillText(PC.sig || '', 60, y0 + H - 80);
    c.strokeStyle = '#c62828'; c.setLineDash([10, 6]); c.lineWidth = 4; c.strokeRect(W - 250, y0 + 60, 180, 220); c.setLineDash([]);
    c.font = '110px serif'; c.textAlign = 'center'; c.fillText(flag(PC.cc), W - 160, y0 + 200); c.font = '700 22px sans-serif'; c.fillStyle = '#c62828'; c.fillText('VEZORIA', W - 160, y0 + 262);
    c.strokeStyle = 'rgba(40,40,80,.55)'; c.lineWidth = 3; c.beginPath(); c.arc(W - 400, y0 + 250, 100, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(W - 400, y0 + 250, 82, 0, Math.PI * 2); c.stroke();
    c.fillStyle = 'rgba(40,40,80,.75)'; c.font = '700 19px sans-serif'; const pmA = PC.pm.split(' · '); c.fillText(pmA[0].slice(0, 16), W - 400, y0 + 240); c.fillText((pmA[1] || '').slice(0, 18), W - 400, y0 + 268); c.textAlign = 'left';
    c.strokeStyle = '#d8ccb8'; c.lineWidth = 2; [420, 500, 580].forEach(y=>{ c.beginPath(); c.moveTo(W * .6 + 40, y0 + y); c.lineTo(W - 60, y0 + y); c.stroke(); });
    c.fillStyle = '#2b2440'; c.font = '500 42px Caveat, cursive'; c.fillText(TT('À vous tous ❤️'), W * .6 + 50, y0 + 485);
    return new Promise(r=>cv.toBlob(b=>r(b), 'image/jpeg', .9));
  }
  async function pcShare(){
    toast('💌 ' + MSGT('Préparation de la carte…'));
    const b = await pcImage(); if(!b) return; const f = new File([b], 'carte-postale-' + normQ(PC.city || 'vezoria').replace(/\s+/g, '-') + '.jpg', {type:'image/jpeg'});
    try { if(navigator.canShare && navigator.canShare({files:[f]})){ await navigator.share({files:[f], title:TT('Carte postale')}); return; } } catch(e){ if(e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = f.name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function pcSend(){
    const t = trip(); if(!t || !PC) return; const s = PC.s || {};
    put({id:'s' + uid(), type:'souv', trip:t.id, date:isoToday(), titre:'💌 ' + MSGT('Carte postale de') + ' ' + PC.city, lieu:s.lieu || PC.city, lat:s.lat != null ? s.lat : null, lng:s.lng != null ? s.lng : null, cc:s.cc || '', pays:s.pays || '', texte:(PC.msg || '') + (PC.sig ? '\n— ' + PC.sig : ''), photos:[PC.p]}, '💌 ' + MSGT('Carte postale envoyée'));
    try { if(feedCode(t.id)) feedBuild(t.id); } catch(e){}
    pcClose(); refresh();
  }
  /* ══════════ 📍 « Aujourd’hui » vivant : la carte qui tourne, la ville, la météo, les compteurs du jour, ce que font les autres ══════════ */
  const LN = {box:null, map:null, key:'', mk:{}, geo:{}, wx:{}, prev:{}, tk:0, tkI:0, raf:0};
  const wxIcon = (c, day) => c == null ? '' : c === 0 ? (day === 0 ? '🌙' : '☀️') : c <= 2 ? (day === 0 ? '🌙' : '🌤️') : c === 3 ? '☁️' : c <= 48 ? '🌫️' : c <= 57 ? '🌦️' : c <= 67 ? '🌧️' : c <= 77 ? '❄️' : c <= 82 ? '🌧️' : c <= 86 ? '🌨️' : '⛈️';
  function lnLast(tid){   // la dernière position connue : la mienne d’abord, sinon celle d’un compagnon
    const by = trkByWho(tid, true), mine = by[M.me || ''] || [], all = Object.values(by).map(p=>p[p.length-1]).filter(Boolean).sort((a, b)=>(b[2]||0) - (a[2]||0));
    return mine.length ? mine[mine.length-1] : all[0] || null;
  }
  function lnStats(t){
    const td = isoToday(), by = trkByWho(t.id, true), kmMe = liveKmDay(by[M.me || ''] || []);
    const sv = list('souv', x=>x.trip === t.id && x.date === td), ph = sv.reduce((a, x)=>a + (x.photos||[]).length, 0);
    const dep = items(i=>i.cat === 'divers' && i.date === td).reduce((a, i)=>a + totalOf(i), 0);
    const ft = 'ft:' + t.id, d0 = new Date(); d0.setHours(0,0,0,0);
    const rx = list('like', l=>l.trip === ft && l.on && (l.updatedAt||0) >= +d0).length + list('comment', c=>c.trip === ft && (c.at||0) >= +d0).length;
    return {km:kmMe, ph, dep, rx, sv:sv.length};
  }
  function lnEvents(t){
    const me = M.me || '', d0 = new Date(); d0.setHours(0,0,0,0); const ft = 'ft:' + t.id, ev = [], td = isoToday();
    list('souv', x=>x.trip === t.id && (x.createdAt||0) >= +d0 && x.createdBy && x.createdBy !== me).forEach(x=>ev.push({at:x.createdAt, c:pcol(x.createdBy), ic:(x.photos||[]).length ? '📸' : '📍', w:pname(x.createdBy), tx:'a ajouté « ' + (x.titre || x.lieu || '…') + ' »' + ((x.photos||[]).length > 1 ? ' · ' + x.photos.length + ' photos' : '')}));
    items(i=>i.cat === 'divers' && i.date === td && i.createdBy && i.createdBy !== me && (i.createdAt||0) >= +d0).forEach(i=>ev.push({at:i.createdAt, c:pcol(i.createdBy), ic:'💶', w:pname(i.createdBy), tx:(i.titre || 'dépense') + ' · ' + eur(totalOf(i))}));
    list('like', l=>l.trip === ft && l.on && (l.updatedAt||0) >= +d0 && !String(l.id).endsWith(':' + devId())).forEach(l=>{ const f = R[l.feed] || {}; ev.push({at:l.updatedAt, c:'#e11d48', ic:'❤️', w:l.who || 'Un abonné', tx:'aime « ' + (f.titre || f.lieu || 'ta photo') + ' »'}); });
    list('comment', c=>c.trip === ft && (c.at||0) >= +d0 && c.dev !== devId()).forEach(c=>ev.push({at:c.at, c:'#7c3aed', ic:'💬', w:c.who || 'Un abonné', tx:'« ' + String(c.text || '').slice(0, 70) + ' »'}));
    Object.entries(trkByWho(t.id, false)).forEach(([w, p])=>{ if(!w || w === me || !p.length) return; const l = p[p.length-1]; if(l[2] && Date.now() - l[2] < LIVE_MS) ev.push({at:l[2], c:pcol(w), ic:'🛰️', w:pname(w), tx:'est en route', x:fmtKm(liveKmDay(p)) + ' aujourd’hui'}); });
    return ev.sort((a, b)=>(b.at||0) - (a.at||0)).slice(0, 10);
  }
  function lnHTML(t){
    if(!t || hidden('blk:lnow')) return '';
    const k = dayList().indexOf(isoToday()), n = dayList().length, st = lnStats(t), ev = lnEvents(t), l = lnLast(t.id), g = l ? LN.geo[lnGK(l)] : null, w = l ? LN.wx[lnGK(l)] : null;
    const stat = (ic, v, u, key, dec) => `<div class="ln-s"><i>${ic}</i><b data-ln="${key}" data-v="${v}" data-d="${dec||0}">${(LN.prev[key] != null ? LN.prev[key] : v).toFixed(dec||0).replace('.', ',')}</b><small>${u}</small></div>`;
    return `<div class="ln${l ? '' : ' nomap'}" id="ln">
      <div class="ln-map" id="ln-slot" onclick="CV.liveOpen('${ja(t.id)}')"></div><div class="ln-shade"></div>
      <div class="ln-top"><span class="ln-badge"><i></i>EN DIRECT · ${PJ(k + 1)}/${n}</span><span class="ln-wx" id="ln-wx">${w ? wxIcon(w.c, w.d) + ' ' + w.t + '°' : ''}</span></div>
      <div class="ln-place"><b id="ln-city" data-notr>${esc(g ? g.city : (t.titre || ''))}</b><small><span id="ln-clock">${lnClock(w)}</span>${g && g.cc ? ' · ' + flag(g.cc) + ' <span data-notr>' + esc(g.country || '') + '</span>' : ''}</small></div>
      <button type="button" class="ln-go" onclick="CV.liveOpen('${ja(t.id)}')">🛰️ Carte live</button>
      <div class="ln-stats">${stat('🚶', +st.km.toFixed(1), 'km aujourd’hui', 'km', 1)}${stat('📸', st.ph, st.ph > 1 ? 'photos' : 'photo', 'ph')}${stat('💶', Math.round(st.dep), ((t.devise || M.cur || 'EUR') === 'EUR' ? '€ ' : (t.devise || M.cur) + ' ') + MSGT('dépensés'), 'dep')}${stat('❤️', st.rx, st.rx > 1 ? 'réactions' : 'réaction', 'rx')}</div>
      <div class="ln-tick" id="ln-tick">${ev.length ? ev.map((e, i)=>`<div class="ln-e${i === 0 ? ' on' : ''}" style="--c:${esc(e.c)}"><i>${e.ic}</i><span><b data-notr>${esc(e.w)}</b> <span>${esc(e.tx)}</span>${e.x ? ' · <span>' + esc(e.x) + '</span>' : ''}</span><small>${vzWhen(e.at)}</small></div>`).join('') : `<div class="ln-e on calm"><i>✨</i><span>Tout est calme… un souvenir pour réveiller tes abonnés ?</span><button type="button" onclick="CV.hereNow()">📍 Step ici</button></div>`}</div>
    </div>`;
  }
  const lnGK = p => (+p[0]).toFixed(2) + ',' + (+p[1]).toFixed(2);
  function lnClock(w){ try { return new Date().toLocaleTimeString((window.I18N ? I18N.locale : 'fr-FR'), Object.assign({hour:'2-digit', minute:'2-digit'}, w && w.tz ? {timeZone:w.tz} : {})) + (w && w.tz && w.tz !== Intl.DateTimeFormat().resolvedOptions().timeZone ? ' heure locale' : ''); } catch(e){ return ''; } }
  async function lnHydrate(){
    const el = document.getElementById('ln'); if(!el) return; const t = trip(); if(!t) return;
    // chiffres qui défilent jusqu’à leur nouvelle valeur
    el.querySelectorAll('[data-ln]').forEach(b=>{ const k = b.dataset.ln, to = +b.dataset.v, d = +b.dataset.d || 0, fr = LN.prev[k] != null ? LN.prev[k] : 0; LN.prev[k] = to; if(fr === to){ b.textContent = to.toFixed(d).replace('.', ','); return; }
      const t0 = performance.now(), dur = 1100; const st = now => { const q = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - q, 3); b.textContent = (fr + (to - fr) * e).toFixed(d).replace('.', ','); if(q < 1) requestAnimationFrame(st); else if(fr !== 0) { b.parentNode.classList.add('bump'); setTimeout(()=>b.parentNode.classList.remove('bump'), 700); } }; requestAnimationFrame(st); });
    // fil de ce que font les autres : un évènement à la fois
    clearInterval(LN.tk); const E = el.querySelectorAll('.ln-e'); if(E.length > 1){ LN.tkI = 0; LN.tk = setInterval(()=>{ const L = document.querySelectorAll('#ln-tick .ln-e'); if(!L.length){ clearInterval(LN.tk); return; } L[LN.tkI % L.length].classList.remove('on'); LN.tkI++; L[LN.tkI % L.length].classList.add('on'); }, 4200); }
    const l = lnLast(t.id); if(!l) return;
    lnMap(t.id);
    // ville et météo de l’endroit où on est
    const gk = lnGK(l);
    if(!LN.geo[gk]){ try { const j = await (await fetch(`${GEO}reverse?format=jsonv2&zoom=10&accept-language=${((window.I18N && I18N.lang) || 'fr')}&lat=${l[0]}&lon=${l[1]}`)).json(); const a = (j && j.address) || {};
        LN.geo[gk] = {city:a.city || a.town || a.village || a.municipality || a.county || '', country:a.country || '', cc:(a.country_code || '').toUpperCase()}; } catch(e){} }
    if(!LN.wx[gk] || Date.now() - LN.wx[gk].at > 15 * 60000){ try { const j = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${l[0]}&longitude=${l[1]}&current=temperature_2m,weather_code,is_day&timezone=auto`)).json();
        if(j && j.current) LN.wx[gk] = {t:Math.round(j.current.temperature_2m), c:j.current.weather_code, d:j.current.is_day, tz:j.timezone || '', at:Date.now()}; } catch(e){} }
    const g = LN.geo[gk], w = LN.wx[gk], c = document.getElementById('ln-city'), x = document.getElementById('ln-wx');
    if(c && g && g.city && c.textContent !== g.city){ c.textContent = g.city; const sm = c.nextElementSibling; if(sm) sm.innerHTML = `<span id="ln-clock">${lnClock(w)}</span>${g.cc ? ' · ' + flag(g.cc) + ' <span data-notr>' + esc(g.country) + '</span>' : ''}`; }
    if(x && w) x.textContent = wxIcon(w.c, w.d) + ' ' + w.t + '°';
    const ck = document.getElementById('ln-clock'); if(ck) ck.textContent = lnClock(w);
  }
  setInterval(()=>{ const ck = document.getElementById('ln-clock'), l = trip() && lnLast(M.trip); if(ck && l) ck.textContent = lnClock(LN.wx[lnGK(l)]); }, 30000);
  // la petite carte : créée une seule fois, déplacée d’un écran à l’autre (pas de rechargement à chaque affichage)
  async function lnMap(tid){
    const slot = document.getElementById('ln-slot'); if(!slot) return;
    try {
      if(!LN.box){ LN.box = document.createElement('div'); LN.box.className = 'ln-box'; }
      slot.appendChild(LN.box);
      if(!window.maplibregl){ await loadCss((window.VZ_B || '') + 'vendor/maplibre-gl.css'); await loadJs((window.VZ_B || '') + 'vendor/maplibre-gl.js'); }
      const D = liveData(tid), pts = D.people.map(p=>p.pts[p.pts.length-1]).filter(Boolean); if(!pts.length) return;
      const ctr = [pts.reduce((a, p)=>a + p[1], 0) / pts.length, pts.reduce((a, p)=>a + p[0], 0) / pts.length];
      if(!LN.map || LN.key !== tid){
        try { if(LN.map) LN.map.remove(); } catch(e){} LN.mk = {}; LN.key = tid;
        LN.map = new maplibregl.Map({container:LN.box, interactive:false, attributionControl:false, center:ctr, zoom:14.2, pitch:58, bearing:-20, fadeDuration:0, pixelRatio:Math.min(2, window.devicePixelRatio || 1),
          style:{version:8, sources:{sat:Object.assign(esriML('sat'), {maxzoom:18})}, layers:[{id:'bg', type:'background', paint:{'background-color':'#12324a'}}, {id:'sat', type:'raster', source:'sat'}]}});
        const go = () => { if(!LN.map) return; lnLines(D); lnFit(pts, true); };
        LN.map.on('style.load', go); LN.map.on('load', go); lnFit(pts, true);
        const spin = () => { LN.raf = requestAnimationFrame(spin); if(!LN.map || !LN.box.isConnected || document.visibilityState !== 'visible') return; try { LN.map.setBearing((LN.map.getBearing() + 0.06) % 360); } catch(e){} };
        cancelAnimationFrame(LN.raf); LN.raf = requestAnimationFrame(spin);
      } else { try { LN.map.resize(); lnFit(pts, false); if(LN.map.isStyleLoaded()) lnLines(D); } catch(e){} }
      const keep = new Set();
      D.people.forEach(p=>{ const l = p.pts[p.pts.length-1]; if(!l) return; keep.add(p.n); const on = l[2] && Date.now() - l[2] < LIVE_MS;
        let m = LN.mk[p.n]; if(!m){ const e = document.createElement('div'); e.className = 'ln-pin'; m = LN.mk[p.n] = new maplibregl.Marker({element:e, anchor:'center', opacity:'1', opacityWhenCovered:'1'}).setLngLat([l[1], l[0]]).addTo(LN.map); }
        const e = m.getElement(); e.style.setProperty('--c', p.c); e.classList.toggle('on', !!on); e.innerHTML = `<span class="lv-ring"></span><span>${esc(((p.n||'?')[0]||'?').toUpperCase())}</span>`; m.setLngLat([l[1], l[0]]); });
      Object.keys(LN.mk).forEach(k=>{ if(!keep.has(k)){ LN.mk[k].remove(); delete LN.mk[k]; } });
    } catch(e){}
  }
  function lnFit(pts, now){   // tout le monde dans le cadre, vu de biais
    if(!LN.map) return; try {
      if(pts.length < 2){ LN.map.easeTo({center:[pts[0][1], pts[0][0]], zoom:14.5, pitch:58, duration: now ? 0 : 1200}); return; }
      const b = new maplibregl.LngLatBounds(); pts.forEach(p=>b.extend([p[1], p[0]]));
      LN.map.fitBounds(b, {padding:{top:110, bottom:150, left:60, right:60}, maxZoom:15.5, pitch:58, bearing:LN.map.getBearing(), duration: now ? 0 : 1200});
    } catch(e){} }
  function lnLines(D){
    const map = LN.map; if(!map) return;
    D.people.forEach((p, i)=>{ const id = 'ln' + i, gj = {type:'Feature', properties:{}, geometry: p.pts.length > 1 ? {type:'LineString', coordinates:p.pts.slice(-300).map(x=>[x[1], x[0]])} : {type:'Point', coordinates:[p.pts[0][1], p.pts[0][0]]}};
      if(map.getSource(id)) map.getSource(id).setData(gj); else { map.addSource(id, {type:'geojson', data:gj}); map.addLayer({id:id + 'g', type:'line', source:id, paint:{'line-color':p.c, 'line-width':9, 'line-blur':6, 'line-opacity':.5}}); map.addLayer({id, type:'line', source:id, layout:{'line-cap':'round', 'line-join':'round'}, paint:{'line-color':p.c, 'line-width':3.5}}); } });
  }

  /* ══════════ 🎉 « Bienvenue à … » : le GPS voit qu’on arrive dans une nouvelle ville (ou un nouveau pays) ══════════ */
  let wlcBusy = false;
  async function wlcCheck(lat, lng){
    try {
      const t = trip(); if(!t || tripPhase(t) !== 'live' || wlcBusy || hidden('blk:wlc')) return;
      M.wlc = M.wlc || {}; const W = M.wlc[t.id] = M.wlc[t.id] || {cities:[], ccs:[], lat:null, lng:null, at:0};
      if(W.lat != null && km({lat:W.lat, lng:W.lng}, {lat, lng}) < 3 && Date.now() - W.at < 6 * 3600e3) return;
      if(Date.now() - W.at < 8 * 60000) return;
      wlcBusy = true; W.lat = lat; W.lng = lng; W.at = Date.now(); persist();
      const j = await (await fetch(`${GEO}reverse?format=jsonv2&zoom=10&accept-language=${((window.I18N && I18N.lang) || 'fr')}&lat=${lat}&lon=${lng}`)).json();
      const a = (j && j.address) || {}, city = a.city || a.town || a.village || a.municipality || '', cc = (a.country_code || '').toUpperCase(), country = a.country || '';
      if(!city){ wlcBusy = false; return; }
      const k = normQ(city), first = !W.cities.length, newC = !!cc && !W.ccs.includes(cc);
      if(W.cities.includes(k)){ wlcBusy = false; return; }
      W.cities.push(k); if(cc && newC) W.ccs.push(cc); M.seen = M.seen || {}; if(M.seen['hi:' + t.id + ':' + k]){ persist(); wlcBusy = false; return; } M.seen['hi:' + t.id + ':' + k] = 1; persist();
      // 1re ville vue : on fête seulement si c’est une étape prévue (sinon c’est souvent la ville de départ)
      const planned = (()=>{ try { return tlStages().some(x=>normQ(x.city || '').includes(k) || k.includes(normQ(x.city || '') || '§')); } catch(e){ return false; } })();
      if(first && !planned){ wlcBusy = false; return; }
      wlcShow({city, cc, country, newC: newC && W.ccs.length > 1, nC: W.ccs.length, nV: W.cities.length, lat, lng});
    } catch(e){} wlcBusy = false;
  }
  async function wlcShow(o){
    if(document.getElementById('cv-wlc')) return;
    const ov = document.createElement('div'); ov.id = 'cv-wlc'; ov.className = 'wlc';
    const conf = Array.from({length:26}, (_, i)=>`<i style="left:${Math.random() * 100}%;animation-delay:${(Math.random() * 1.6).toFixed(2)}s;animation-duration:${(2.6 + Math.random() * 2).toFixed(2)}s;background:${['#fbbf24','#f472b6','#60a5fa','#34d399','#f87171','#ffffff'][i % 6]};transform:rotate(${Math.round(Math.random() * 360)}deg)"></i>`).join('');
    const ord = n => n === 1 ? '1er' : n + 'e';
    ov.innerHTML = `<div class="wlc-bg" id="wlc-bg"></div><div class="wlc-shade"></div><div class="wlc-conf">${conf}</div>
      <div class="wlc-in"><div class="wlc-flag">${flag(o.cc)}</div><small class="wlc-k">${o.newC ? 'Nouveau pays !' : 'Bienvenue à'}</small>
        <h1 data-notr>${[...o.city].map((c, i)=>`<span style="animation-delay:${(0.35 + i * 0.05).toFixed(2)}s">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('')}</h1>
        <p><span data-notr>${esc(o.country)}</span>${o.newC ? ' · <b>' + ord(o.nC) + ' pays du voyage</b>' : ''}</p><p class="wlc-m" id="wlc-m"></p>
        ${o.newC && o.cc && !roamFree(o.cc) && !hidden('blk:book') && bkOnce('esim:' + M.trip) ? `<a class="wlc-lk" href="${esc(bookUrl('airalo', {cc:o.cc}))}" target="_blank"${bookRel('airalo')}>📶 ${MSGT('Internet sur place sans frais d’itinérance')} · Airalo</a>` : ''}
        <div class="wlc-b"><button type="button" class="pri" onclick="CV.wlcPost()">💌 Prévenir tout le monde</button><button type="button" onclick="CV.wlcClose();CV.hereNow()">📸 Souvenir ici</button><button type="button" onclick="CV.wlcClose()">Plus tard</button></div></div>`;
    ov._o = o; document.body.appendChild(ov); requestAnimationFrame(()=>ov.classList.add('on'));
    try { navigator.vibrate && navigator.vibrate([60, 40, 120]); } catch(e){}
    try { const d = await expLoad(o.city); const bg = document.getElementById('wlc-bg'); if(bg && d && d.hero){ const im = new Image(); im.referrerPolicy = 'no-referrer'; im.onload = () => { bg.style.backgroundImage = `url("${d.hero}")`; bg.classList.add('ok'); }; im.src = d.hero; }
      const m = document.getElementById('wlc-m'); if(m && d) m.textContent = [d.temp != null ? wxIcon(d.code, 1) + ' ' + d.temp + '°' : '', d.tz ? new Date().toLocaleTimeString((window.I18N ? I18N.locale : 'fr-FR'), {hour:'2-digit', minute:'2-digit', timeZone:d.tz}) : ''].filter(Boolean).join(' · '); } catch(e){}
  }
  function wlcClose(){ const o = document.getElementById('cv-wlc'); if(o){ o.classList.remove('on'); setTimeout(()=>o.remove(), 400); } }
  function wlcPost(){
    const ov = document.getElementById('cv-wlc'), o = ov && ov._o, t = trip(); if(!o || !t) return;
    put({id:'s' + uid(), type:'souv', trip:t.id, date:isoToday(), titre:(o.newC ? flag(o.cc) + ' ' : '📍 ') + MSGT('Arrivée à') + ' ' + o.city, lieu:[o.city, o.country].filter(Boolean).join(', '), lat:o.lat, lng:o.lng, cc:o.cc, pays:o.country, texte:'', photos:[]}, '💌 ' + MSGT('Tes compagnons et tes abonnés sont prévenus'));
    try { if(feedCode(t.id)) feedBuild(t.id); } catch(e){}
    wlcClose(); refresh();
  }

  /* ══════════ ❤️ Réactions en direct : un ❤️ ou un 💬 d’un abonné s’envole sur l’écran du voyageur ══════════ */
  function rxMine(){ const ids = new Set(); myTrips().forEach(t=>{ if(socCode(t.id) || FT()[t.id]) ids.add('ft:' + t.id); }); return ids; }
  function rxTick(){
    try {
      if(document.visibilityState !== 'visible' || document.getElementById('cv-wlc')) return;
      const mine = rxMine(); if(!mine.size) return; const dv = devId(), lim = Date.now() - 6 * 3600e3;
      const L = list('like', l=>mine.has(l.trip) && l.on && !String(l.id).endsWith(':' + dv)).map(l=>({id:l.id + ':' + (l.updatedAt||0), at:l.updatedAt || 0, k:'lk', w:l.who, f:l.feed}))
        .concat(list('comment', c=>mine.has(c.trip) && c.dev !== dv).map(c=>({id:c.id, at:c.at || 0, k:'cm', w:c.who, f:c.feed, tx:c.text})));
      if(!M.rxSeen){ M.rxSeen = {}; L.forEach(x=>M.rxSeen[x.id] = 1); persist(); return; }
      const nw = L.filter(x=>!M.rxSeen[x.id]); if(!nw.length) return;
      nw.forEach(x=>M.rxSeen[x.id] = 1); const ks = Object.keys(M.rxSeen); if(ks.length > 600) ks.slice(0, ks.length - 600).forEach(k=>delete M.rxSeen[k]); persist();
      nw.filter(x=>x.at > lim).sort((a, b)=>a.at - b.at).slice(-3).forEach((x, i)=>setTimeout(()=>rxShow(x), i * 1800));
    } catch(e){}
  }
  setInterval(rxTick, 4000);
  function rxShow(x){
    const f = R[x.f] || {}, ph = (f.photos||[])[0];
    // une pluie de cœurs (ou de bulles)
    const box = document.createElement('div'); box.className = 'rx-fly';
    box.innerHTML = Array.from({length: x.k === 'lk' ? 12 : 6}, ()=>`<i style="left:${(55 + Math.random() * 38).toFixed(1)}%;--dx:${Math.round(Math.random() * 120 - 60)}px;animation-delay:${(Math.random() * .7).toFixed(2)}s;font-size:${(18 + Math.random() * 18).toFixed(0)}px">${x.k === 'lk' ? ['❤️','💖','💕','❤️'][Math.floor(Math.random() * 4)] : '💬'}</i>`).join('');
    document.body.appendChild(box); setTimeout(()=>box.remove(), 3600);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'rx-pill';
    b.innerHTML = `${ph ? `<img data-ph="${esc(ph)}.t" alt="">` : `<i>${x.k === 'lk' ? '❤️' : '💬'}</i>`}<span><b data-notr>${esc(x.w || 'Un abonné')}</b> <span>${x.k === 'lk' ? 'aime' : 'a commenté'}</span> <q data-notr>${esc(f.titre || f.lieu || '')}</q>${x.tx ? `<small data-notr>« ${esc(String(x.tx).slice(0, 90))} »</small>` : ''}</span>`;
    b.onclick = () => { b.remove(); try { feedView(f.trip || x.f); } catch(e){} };
    document.body.appendChild(b); hydrate(); requestAnimationFrame(()=>b.classList.add('on'));
    try { navigator.vibrate && navigator.vibrate(30); } catch(e){}
    setTimeout(()=>{ b.classList.remove('on'); setTimeout(()=>b.remove(), 500); }, 5200);
  }
  /* ══════════ 🛰️ Carte 3D en direct : où est chacun, sa route qui se dessine, ses photos — mise à jour toute seule ══════════
     key = id du voyage (compagnon : les traces du voyage) ou « ft:… » (abonné : ce que chaque voyageur a accepté de montrer) */
  let LV = null, lvSoonT = 0;
  function liveKmDay(pts){ const d0 = new Date(); d0.setHours(0,0,0,0); let k = 0, a = null; (pts||[]).forEach(p=>{ if((p[2]||0) < +d0) return; if(a) k += km({lat:a[0], lng:a[1]}, {lat:p[0], lng:p[1]}); a = p; }); return k; }
  function liveBtnHTML(key, live, n, title){
    return `<button type="button" class="lv-go${live.length ? ' on' : ''}" onclick="CV.liveOpen('${ja(key)}')"><span class="lv-dot"><i></i></span><span class="tx"><b>${live.length ? 'Suivre en direct sur la carte 3D' : 'La carte 3D du voyage'}</b>${title ? `<small class="lv-tt" data-notr>${esc(title)}</small>` : ''}<small>${live.length ? '<span data-notr>' + esc(live.slice(0, 4).join(', ')) + '</span>' + (live.length > 4 ? ' +' + (live.length - 4) : '') + ' · position mise à jour toute seule' : n ? 'La route de chacun, ses photos, sa dernière position' : 'Les photos du voyage sur la carte'}</small></span><span class="lv-ar">›</span></button>`;
  }
  function liveData(key){
    if(/^ft:/.test(key)){ const r = feedTrkRec(key), ft = R[key] || {};
      return {title: ft.titre || '', sub: 'Voyage de ' + ftTeamTxt(ft), people: r ? r.people.map(p=>({n:p.n || '—', c:p.c || '#0ea5e9', pts:p.pts || [], gps:!!p.gps})) : [],
        ph: list('feed', f=>f.trip===key && f.lat != null && f.lng != null).map(f=>({id:f.id, lat:+f.lat, lng:+f.lng, ph:(f.photos||[])[0] || '', t:f.titre || f.lieu || '', by:f.by || '', d:f.date || ''}))}; }
    const t = R[key] || {}, by = trkByWho(key, true);
    return {title: t.titre || '', sub: (t.voyageurs||[]).length > 1 ? (t.voyageurs||[]).map(v=>pname(v)).filter(n=>n && n !== '?').join(' · ') : '',
      people: Object.entries(by).filter(([, p])=>p.length).map(([w, pts])=>({n: w ? pname(w) : '—', c: w ? pcol(w) : '#0ea5e9', pts, gps: trkHas(key, w), me: w === (M.me || '')})),
      ph: list('souv', x=>x.trip===key && x.lat != null && x.lng != null && geoOn(key, x.createdBy || '')).map(x=>({id:x.id, lat:+x.lat, lng:+x.lng, ph:(x.photos||[])[0] || '', t:x.titre || x.lieu || '', by: x.createdBy && (t.voyageurs||[]).length > 1 ? pname(x.createdBy) : '', d:x.date || ''}))};
  }
  const lvSig = D => JSON.stringify([D.people.map(p=>[p.n, p.c, p.pts.length, p.pts[p.pts.length-1]]), D.ph.map(p=>p.id + p.ph)]);
  async function liveOpen(key){
    if(!key) return; liveClose(true); closeSheet(true);
    const ov = document.createElement('div'); ov.id = 'cv-lmap'; document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    const D = liveData(key);
    ov.innerHTML = `<div id="lv-map"></div>
      <div class="lv-top"><button type="button" class="lv-x" onclick="CV.liveClose()" aria-label="Fermer">✕</button>
        <div class="lv-t"><span class="lv-badge"><i></i>EN DIRECT</span><b data-notr>${esc(D.title)}</b><small><span>${esc(D.sub)}</span><span id="lv-up"></span></small></div></div>
      <div class="lv-tools"><button type="button" data-b="sat" class="on" onclick="CV.liveBase('sat')" aria-label="Satellite">🛰️</button><button type="button" data-b="plan" onclick="CV.liveBase('plan')" aria-label="Plan">🗺️</button><button type="button" onclick="CV.liveFit()" aria-label="Tout le monde">🎯</button><button type="button" id="lv-orb" class="on" onclick="CV.liveOrbit()" aria-label="Tourner">🎥</button></div>
      <div class="lv-msg" id="lv-msg">🌍 Chargement de la carte 3D…</div>
      <div class="lv-people" id="lv-people"></div>`;
    LV = {key, map:null, mk:{}, phm:{}, sig:'', orbit:true, focus:null, prog:0, t0:Date.now(), seen:Date.now(), n:0, sweep:0};
    const me = LV;
    try {
      await loadCss((window.VZ_B || '') + 'vendor/maplibre-gl.css');
      if(!window.maplibregl) await loadJs((window.VZ_B || '') + 'vendor/maplibre-gl.js');
      if(LV !== me) return;
      const style = {version:8,
        sources:{
          sat:Object.assign(esriML('sat'), {maxzoom:18, attribution:'Esri, Maxar'}),
          dem:{type:'raster-dem', tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], tileSize:256, maxzoom:14, encoding:'terrarium', attribution:'Mapzen terrain'}},
        layers:[{id:'bg', type:'background', paint:{'background-color':'#0b1a3a'}},
          {id:'sat', type:'raster', source:'sat'}],
        sky:{'sky-color':'#7fb3ff', 'horizon-color':'#e8f1ff', 'fog-color':'#ffffff', 'sky-horizon-blend':0.5, 'horizon-fog-blend':0.6, 'fog-ground-blend':0.6, 'atmosphere-blend':0}};
      try {   // noms des villes et bâtiments en relief (OpenFreeMap, libre et sans clé)
        const lib = await withTimeout(fetch('https://tiles.openfreemap.org/styles/liberty').then(r=>r.json()), 5000);
        const vs = Object.entries(lib.sources||{}).find(([,v])=>v.type==='vector');
        if(lib.glyphs && vs){ style.glyphs = lib.glyphs; style.sources.ofm = vs[1];
          style.layers.push({id:'ofm-b-bg', type:'background', layout:{visibility:'none'}, paint:{'background-color':'#f8f4f0'}}, ...ofmBase(lib, vs[0], 0, true));   // 🗺️ « Plan » : OpenFreeMap
          const lang = (l => /^(ar|hi)$/.test(l) ? 'en' : l)((window.I18N && I18N.lang) || 'fr');
          style.layers.push({id:'b3d', type:'fill-extrusion', source:'ofm', 'source-layer':'building', minzoom:14.5,
            paint:{'fill-extrusion-color':'#f4efe6', 'fill-extrusion-height':['coalesce',['get','render_height'],8], 'fill-extrusion-base':['coalesce',['get','render_min_height'],0], 'fill-extrusion-opacity':['interpolate',['linear'],['zoom'],14.5,0,15.5,.8]}});
          (lib.layers||[]).filter(l=>l.source===vs[0] && l.type==='symbol' && l['source-layer']==='place' && /country|city|town|village|suburb|state|capital/.test(l.id)).forEach(l=>{ const x = JSON.parse(JSON.stringify(l)); x.source = 'ofm';
            x.layout = Object.assign({}, x.layout, {'text-field':['coalesce',['get','name:' + lang],['get','name:latin'],['get','name']]});
            x.paint = Object.assign({}, x.paint, {'text-color':'#ffffff', 'text-halo-color':'rgba(10,20,50,.85)', 'text-halo-width':1.4}); style.layers.push(x); });
        }
      } catch(e){}
      if(LV !== me) return;
      const map = new maplibregl.Map({container:'lv-map', style, center:[2.35, 46.6], zoom:4, pitch:55, bearing:-20, maxPitch:75, maxZoom:18,
        pixelRatio:Math.min(2, window.devicePixelRatio || 1), maxTileCacheSize:80, fadeDuration:0, attributionControl:{compact:true}});
      LV.map = map;
      const off = () => { if(LV){ LV.orbit = false; const b = document.getElementById('lv-orb'); if(b) b.classList.remove('on'); } };
      ['pointerdown','touchstart','wheel'].forEach(ev=>map.getContainer().addEventListener(ev, off, {passive:true}));
      let ok = false; const go = ()=>{   // dès que le style est prêt (sans attendre toutes les images : réseau lent en voyage)
        if(LV !== me || ok) return; ok = true;
        try { map.setTerrain({source:'dem', exaggeration:1.4}); } catch(e){}
        { const m = document.getElementById('lv-msg'); if(m) m.hidden = true; }
        liveDraw(true); liveFit(true);
        LV.iv = setInterval(liveTick, 25000); LV.up = setInterval(liveUp, 5000); liveUp();
        LV.raf = requestAnimationFrame(liveAnim);
      };
      map.on('style.load', go); map.on('load', go); map.on('error', ()=>{});
    } catch(e){ const m = document.getElementById('lv-msg'); if(m) m.textContent = '⚠️ ' + (e.message || 'Carte indisponible'); }
  }
  function liveClose(quiet){
    if(!LV) { const o = document.getElementById('cv-lmap'); if(o) o.remove(); return; }
    clearInterval(LV.iv); clearInterval(LV.up); cancelAnimationFrame(LV.raf); clearTimeout(lvSoonT);
    try { if(LV.map) LV.map.remove(); } catch(e){}
    LV = null; const o = document.getElementById('cv-lmap'); if(o) o.remove();
    if(!quiet && !document.getElementById('cv-feed') && !document.getElementById('cv-tj')) document.body.style.overflow = '';
  }
  function liveSoon(){ clearTimeout(lvSoonT); lvSoonT = setTimeout(()=>{ if(LV) liveDraw(false); }, 600); }
  async function liveTick(){
    if(!LV || document.visibilityState !== 'visible' || LV.busy) return; LV.busy = true;
    try { await syncNow(); } catch(e){} finally { if(LV) LV.busy = false; }
    if(LV){ LV.seen = Date.now(); liveDraw(false); liveUp(); }
  }
  function liveUp(){
    const e = document.getElementById('lv-up'); if(!e || !LV) return; const s = Math.round((Date.now() - LV.seen) / 1000);
    e.textContent = (e.previousSibling && e.previousSibling.textContent ? ' · ' : '') + (s < 8 ? 'à jour' : 'actualisé il y a ' + s + ' s');
    document.querySelectorAll('#lv-people [data-at]').forEach(x=>{ const at = +x.dataset.at; x.style.color = at && Date.now() - at < LIVE_MS ? '' : '#6b7280'; x.innerHTML = at ? (Date.now() - at < LIVE_MS ? '● <span>en direct</span> · ' : '') + '<span>' + vzWhen(at) + '</span>' : ''; });
  }
  function liveBase(b){
    if(!LV || !LV.map) return; const map = LV.map, P = (map.getStyle().layers || []).filter(l=>/^ofm-b-/.test(l.id)).map(l=>l.id);
    if(b === 'plan' && !P.length){ toast('🗺️ Plan indisponible hors connexion'); return; }
    try { map.setLayoutProperty('sat', 'visibility', b === 'sat' ? 'visible' : 'none'); } catch(e){}
    P.forEach(id=>{ try { map.setLayoutProperty(id, 'visibility', b === 'plan' ? 'visible' : 'none'); } catch(e){} });
    document.querySelectorAll('#cv-lmap .lv-tools [data-b]').forEach(x=>x.classList.toggle('on', x.dataset.b === b));
  }
  function liveOrbit(){ if(!LV) return; LV.orbit = !LV.orbit; const b = document.getElementById('lv-orb'); if(b) b.classList.toggle('on', LV.orbit); }
  function liveFit(first){
    if(!LV || !LV.map) return; const D = LV.D || liveData(LV.key); LV.focus = null;
    const pts = [].concat(...D.people.map(p=>p.pts.map(x=>[x[1], x[0]])), D.ph.map(p=>[p.lng, p.lat]));
    const m = document.getElementById('lv-msg');
    if(!pts.length){ if(m){ m.hidden = false; m.innerHTML = '🛰️ Personne ne partage encore sa position.<br><small>Dès qu’un voyageur active le suivi GPS (ou partage un souvenir avec son lieu), il apparaît ici.</small>'; } return; }
    if(m) m.hidden = true;
    // on cadre surtout les dernières positions : c’est « où ils sont maintenant » qui compte
    const last = D.people.map(p=>p.pts[p.pts.length-1]).filter(Boolean).map(x=>[x[1], x[0]]);
    const use = last.length ? last.concat(D.people.flatMap(p=>p.pts.slice(-12).map(x=>[x[1], x[0]]))) : pts;
    const b = new maplibregl.LngLatBounds(); use.forEach(p=>b.extend(p));
    try { LV.map.fitBounds(b, {padding:{top:120, bottom:170, left:50, right:60}, maxZoom:15.5, pitch:58, bearing:LV.map.getBearing(), duration:first ? 2800 : 1400, essential:true}); } catch(e){}
  }
  function liveFocus(i){
    if(!LV || !LV.map || !LV.D) return; const p = LV.D.people[+i]; if(!p) return; const l = p.pts[p.pts.length-1];
    LV.focus = p.n; LV.map.flyTo({center:[l[1], l[0]], zoom:16, pitch:65, bearing:(LV.map.getBearing() + 40) % 360, duration:2200, essential:true});
    document.querySelectorAll('#lv-people .lv-p').forEach((x, k)=>x.classList.toggle('on', k === +i));
  }
  function liveDraw(first){
    if(!LV || !LV.map || !LV.map.isStyleLoaded || !LV.map.getStyle()) return;
    const map = LV.map, D = liveData(LV.key), sig = lvSig(D); if(!first && sig === LV.sig) return;
    const grew = !first && LV.D && D.people.some(p=>{ const o = LV.D.people.find(q=>q.n === p.n); return !o || p.pts.length > o.pts.length; });
    LV.sig = sig; LV.D = D;
    // routes : un calque par voyageur, à sa couleur (le trait se dessine à l’ouverture, puis une lueur le parcourt)
    D.people.forEach((p, i)=>{ const src = 'lv-r' + i, gj = {type:'Feature', properties:{}, geometry: p.pts.length > 1 ? {type:'LineString', coordinates:p.pts.map(x=>[x[1], x[0]])} : {type:'Point', coordinates:[p.pts[0][1], p.pts[0][0]]}};
      if(map.getSource(src)) map.getSource(src).setData(gj);
      else { map.addSource(src, {type:'geojson', data:gj, lineMetrics:true});
        map.addLayer({id:src + 'g', type:'line', source:src, layout:{'line-cap':'round', 'line-join':'round'}, paint:{'line-color':p.c, 'line-width':12, 'line-blur':8, 'line-opacity':.45}});
        map.addLayer({id:src + 'l', type:'line', source:src, layout:{'line-cap':'round', 'line-join':'round'}, paint:{'line-width':4.5, 'line-gradient':lvGrad(p.c, first ? 0.001 : 1, -1)}}); } });
    for(let i = D.people.length; map.getSource('lv-r' + i); i++){ ['g','l'].forEach(s=>{ if(map.getLayer('lv-r' + i + s)) map.removeLayer('lv-r' + i + s); }); map.removeSource('lv-r' + i); }
    if(first) LV.prog = 0;
    // chacun : un médaillon à sa couleur qui pulse s’il est en direct
    const keep = new Set();
    D.people.forEach((p, i)=>{ const l = p.pts[p.pts.length-1], on = l[2] && Date.now() - l[2] < LIVE_MS, k = p.n; keep.add(k);
      let m = LV.mk[k];
      if(!m){ const el = document.createElement('div'); el.className = 'lv-pin'; el.onclick = ev => { ev.stopPropagation(); liveFocus(LV.D.people.findIndex(q=>q.n === k)); };
        m = LV.mk[k] = {el, mk:new maplibregl.Marker({element:el, anchor:'bottom', opacity:'1', opacityWhenCovered:'1'}).setLngLat([l[1], l[0]]).addTo(map), at:[l[1], l[0]]}; }
      m.el.style.setProperty('--c', p.c); m.el.classList.toggle('on', !!on);
      m.el.innerHTML = `<span class="lv-ring"></span><span class="lv-av">${esc(((p.n || '?')[0] || '?').toUpperCase())}</span><span class="lv-nm"><b data-notr>${esc(p.n)}</b><small>${p.gps ? '🛰️' : '📸'} ${l[2] ? vzWhen(l[2]) : ''}</small></span>`;
      liveMove(m, [l[1], l[0]]); });
    Object.keys(LV.mk).forEach(k=>{ if(!keep.has(k)){ LV.mk[k].mk.remove(); delete LV.mk[k]; } });
    // photos : vignettes posées sur la carte, touchées → elles s’agrandissent
    const pk = new Set();
    D.ph.forEach(x=>{ pk.add(x.id); if(LV.phm[x.id]) return; const el = document.createElement('button'); el.type = 'button'; el.className = 'lv-ph';
      el.innerHTML = `${x.ph ? `<img data-ph="${esc(x.ph)}.t" alt="">` : '<i>📍</i>'}<span><b data-notr>${esc(x.t)}</b><small>${x.by ? '📸 <span data-notr>' + esc(x.by) + '</span> · ' : ''}${x.d ? fdate(x.d) : ''}</small></span>`;
      el.onclick = ev => { ev.stopPropagation(); const was = el.classList.contains('big'); document.querySelectorAll('#cv-lmap .lv-ph.big').forEach(b=>b.classList.remove('big')); if(!was){ el.classList.add('big'); LV.orbit = false; LV.map.easeTo({center:[x.lng, x.lat], duration:900}); } };
      LV.phm[x.id] = new maplibregl.Marker({element:el, anchor:'bottom', opacity:'1', opacityWhenCovered:'1'}).setLngLat([x.lng, x.lat]).addTo(map); });
    Object.keys(LV.phm).forEach(k=>{ if(!pk.has(k)){ LV.phm[k].remove(); delete LV.phm[k]; } });
    hydrate();
    // bandeau du bas : chacun, sa dernière position, ses km du jour
    const pe = document.getElementById('lv-people');
    if(pe) pe.innerHTML = D.people.map((p, i)=>{ const l = p.pts[p.pts.length-1], kd = liveKmDay(p.pts);
      return `<button type="button" class="lv-p${LV.focus === p.n ? ' on' : ''}" style="--c:${esc(p.c)}" onclick="CV.liveFocus(${i})"><span class="lv-av">${esc(((p.n || '?')[0] || '?').toUpperCase())}</span><span class="tx"><b data-notr>${esc(p.n)}${p.me ? ' (moi)' : ''}</b><small data-at="${l[2] || 0}"></small>${kd >= 0.1 ? `<small>${p.gps ? '🛰️' : '📸'} ${fmtKm(kd)} aujourd’hui</small>` : `<small>${p.gps ? '🛰️ Suivi GPS' : '📸 Lieu des souvenirs'}</small>`}</span></button>`; }).join('')
      + (D.ph.length ? `<span class="lv-p lv-pc"><span class="lv-av">📸</span><span class="tx"><b>${D.ph.length}</b><small>souvenir${D.ph.length > 1 ? 's' : ''} sur la carte</small></span></span>` : '');
    liveUp();
    if(first) return;
    if(LV.focus){ const i = D.people.findIndex(p=>p.n === LV.focus); if(i >= 0){ const l = D.people[i].pts[D.people[i].pts.length-1]; map.easeTo({center:[l[1], l[0]], duration:1500}); } }
    else if(grew && LV.orbit) liveFit();
    if(grew) LV.sweep = 0;
  }
  // glissement du médaillon vers sa nouvelle position (au lieu d’un saut)
  function liveMove(m, to){
    const fr = m.at || to; m.at = to; if(Math.abs(fr[0] - to[0]) + Math.abs(fr[1] - to[1]) < 1e-7){ m.mk.setLngLat(to); return; }
    const t0 = performance.now(), d = 1600; const st = now => { const k = Math.min(1, (now - t0) / d), e = k < .5 ? 2*k*k : 1 - Math.pow(-2*k + 2, 2) / 2;
      try { m.mk.setLngLat([fr[0] + (to[0] - fr[0]) * e, fr[1] + (to[1] - fr[1]) * e]); } catch(x){} if(k < 1) requestAnimationFrame(st); }; requestAnimationFrame(st);
  }
  // trait : couleur jusqu’à « p », transparent après ; « s » = position de la lueur blanche qui parcourt la route
  function lvGrad(c, p, s){
    p = Math.max(0.001, Math.min(1, p));
    const st = [0, c];
    if(s > 0.03 && s < p - 0.01){ const a = Math.max(0.0005, s - 0.06); if(a > 0.0005) st.push(a, c); st.push(s, '#ffffff', Math.min(p - 0.0004, s + 0.01), c); }
    if(p < 1){ st.push(p, c, Math.min(1, p + 0.0003), 'rgba(0,0,0,0)'); if(p + 0.0003 < 1) st.push(1, 'rgba(0,0,0,0)'); }
    else st.push(1, c);
    const out = ['interpolate', ['linear'], ['line-progress']]; for(let i = 0; i < st.length; i += 2) if(i === 0 || st[i] > out[out.length - 2]) out.push(st[i], st[i+1]);
    return out;
  }
  function liveAnim(now){
    if(!LV || !LV.map) return; const map = LV.map, D = LV.D;
    LV.raf = requestAnimationFrame(liveAnim);
    if(document.visibilityState !== 'visible' || !D) return;
    if(LV.last && now - LV.last < 50) return; const dt = LV.last ? now - LV.last : 16; LV.last = now;
    try {
      if(LV.prog < 1){ LV.prog = Math.min(1, LV.prog + dt / 3000); D.people.forEach((p, i)=>{ if(map.getLayer('lv-r' + i + 'l')) map.setPaintProperty('lv-r' + i + 'l', 'line-gradient', lvGrad(p.c, LV.prog, -1)); }); }
      else { LV.sweep = (LV.sweep + dt / 4200) % 1.6; const s = LV.sweep <= 1 ? LV.sweep : -1;
        if(s > 0 || LV.swOn){ LV.swOn = s > 0; D.people.forEach((p, i)=>{ if(map.getLayer('lv-r' + i + 'l')) map.setPaintProperty('lv-r' + i + 'l', 'line-gradient', lvGrad(p.c, 1, s)); }); } }
      if(LV.orbit && !map.isMoving() && LV.prog >= 1) map.setBearing((map.getBearing() + dt * 0.0025) % 360);
    } catch(e){}
  }
  const LMAP = {};
  async function liveMapHydrate(){
    const el = document.querySelector('[data-lmap]:not([data-ok])'); if(!el) return; el.dataset.ok = '1';
    const by = trkByWho(el.dataset.lmap, true), E = Object.entries(by); if(!E.length){ el.innerHTML = ''; return; }
    const lines = E.map(([w, pts])=>({pts: pts.map(p=>[p[0], p[1]]), color: w ? pcol(w) : '#0ea5e9'}));
    const markers = E.map(([w, pts])=>{ const l = pts[pts.length-1]; return {lat:l[0], lng:l[1], label:((w ? pname(w) : '?')[0] || '?').toUpperCase(), color: w ? pcol(w) : '#0ea5e9'}; });
    const lk = JSON.stringify([lines.map(l=>[l.color, l.pts.length, l.pts[0], l.pts[l.pts.length-1]]), markers.map(m=>[m.label, m.color])]);
    if(LMAP[lk]){ el.innerHTML = `<img src="${LMAP[lk]}" alt="" style="width:100%;display:block;border-radius:14px">`; return; }
    try { const c = await drawMap({w:640, h:360, lines, markers, maxZoom:15}); LMAP[lk] = c.toDataURL('image/jpeg', .86); if(el.isConnected) el.innerHTML = `<img src="${LMAP[lk]}" alt="" style="width:100%;display:block;border-radius:14px">`; } catch(e){ el.innerHTML = ''; }
  }

  /* ---------- 🎨 Icônes maison : chaque emoji connu est remplacé par son dessin (icons/<nom>.webp) ----------
     Même rendu sur iPhone et Android. Le texte reste dans « alt » (copier-coller, lecteurs d'écran). */
  const VI = {"✈️": "airplane", "✈": "airplane", "🛫": "airplane-departure", "🛫️": "airplane-departure", "🚆": "train", "🚆️": "train", "🚄": "high-speed-train", "🚄️": "high-speed-train", "🚇": "metro", "🚇️": "metro", "🚌": "bus", "🚌️": "bus", "🚐": "minibus", "🚐️": "minibus", "🚗": "automobile", "🚗️": "automobile", "🚕": "taxi", "🚕️": "taxi", "⛴️": "ferry", "⛴": "ferry", "⛵": "sailboat", "⛵️": "sailboat", "🛣️": "motorway", "🛣": "motorway", "🚶": "person-walking", "🚶️": "person-walking", "🚀": "rocket", "🚀️": "rocket", "🧭": "compass", "🧭️": "compass", "🛰️": "satellite", "🛰": "satellite", "📡": "satellite-antenna", "📡️": "satellite-antenna", "🏨": "hotel", "🏨️": "hotel", "🛏️": "bed", "🛏": "bed", "🧸": "teddy-bear", "🧸️": "teddy-bear", "💤": "zzz", "💤️": "zzz", "🌙": "crescent-moon", "🌙️": "crescent-moon", "🏡": "house-with-garden", "🏡️": "house-with-garden", "🏠": "house", "🏠️": "house", "📍": "round-pushpin", "📍️": "round-pushpin", "📌": "pushpin", "📌️": "pushpin", "🗺️": "world-map", "🗺": "world-map", "🌍": "globe-showing-europe-africa", "🌍️": "globe-showing-europe-africa", "🌐": "globe-with-meridians", "🌐️": "globe-with-meridians", "🏙️": "cityscape", "🏙": "cityscape", "🏖️": "beach-with-umbrella", "🏖": "beach-with-umbrella", "🏛️": "classical-building", "🏛": "classical-building", "⛪": "church", "⛪️": "church", "🏔️": "snow-capped-mountain", "🏔": "snow-capped-mountain", "🌅": "sunrise", "🌅️": "sunrise", "🎡": "ferris-wheel", "🎡️": "ferris-wheel", "🏺": "amphora", "🏺️": "amphora", "🐘": "elephant", "🐘️": "elephant", "🌳": "deciduous-tree", "🌳️": "deciduous-tree", "🌿": "herb", "🌿️": "herb", "🌱": "seedling", "🌱️": "seedling", "🌊": "water-wave", "🌊️": "water-wave", "🎫": "ticket", "🎫️": "ticket", "🎟️": "admission-tickets", "🎟": "admission-tickets", "📄": "page-facing-up", "📄️": "page-facing-up", "🧾": "receipt", "🧾️": "receipt", "🛂": "passport-control", "🛂️": "passport-control", "🪪": "identification-card", "🪪️": "identification-card", "📋": "clipboard", "📋️": "clipboard", "📎": "paperclip", "📎️": "paperclip", "🗂️": "card-index-dividers", "🗂": "card-index-dividers", "📂": "open-file-folder", "📂️": "open-file-folder", "🗒️": "spiral-notepad", "🗒": "spiral-notepad", "📝": "memo", "📝️": "memo", "✉️": "envelope", "✉": "envelope", "📨": "incoming-envelope", "📨️": "incoming-envelope", "📥": "inbox-tray", "📥️": "inbox-tray", "📤": "outbox-tray", "📤️": "outbox-tray", "📲": "mobile-phone-with-arrow", "📲️": "mobile-phone-with-arrow", "🖨️": "printer", "🖨": "printer", "💶": "euro-banknote", "💶️": "euro-banknote", "💸": "money-with-wings", "💸️": "money-with-wings", "💱": "currency-exchange", "💱️": "currency-exchange", "💳": "credit-card", "💳️": "credit-card", "💰": "money-bag", "💰️": "money-bag", "⚖️": "balance-scale", "⚖": "balance-scale", "🛒": "shopping-cart", "🛒️": "shopping-cart", "📊": "bar-chart", "📊️": "bar-chart", "📸": "camera-with-flash", "📸️": "camera-with-flash", "📷": "camera", "📷️": "camera", "🖼️": "framed-picture", "🖼": "framed-picture", "🎬": "clapper-board", "🎬️": "clapper-board", "📖": "open-book", "📖️": "open-book", "📕": "closed-book", "📕️": "closed-book", "🎵": "musical-note", "🎵️": "musical-note", "🔇": "muted-speaker", "🔇️": "muted-speaker", "🔊": "speaker-high-volume", "🔊️": "speaker-high-volume", "✍️": "writing-hand", "✍": "writing-hand", "💭": "thought-balloon", "💭️": "thought-balloon", "🎨": "artist-palette", "🎨️": "artist-palette", "✨": "sparkles", "✨️": "sparkles", "🪄": "magic-wand", "🪄️": "magic-wand", "💡": "light-bulb", "💡️": "light-bulb", "🎉": "party-popper", "🎉️": "party-popper", "🎁": "wrapped-gift", "🎁️": "wrapped-gift", "❤️": "red-heart", "❤": "red-heart", "🤍": "white-heart", "🤍️": "white-heart", "💕": "two-hearts", "💕️": "two-hearts", "💖": "sparkling-heart", "💖️": "sparkling-heart", "🏁": "chequered-flag", "🏁️": "chequered-flag", "🎯": "bullseye", "🎯️": "bullseye", "🎓": "graduation-cap", "🎓️": "graduation-cap", "🙏": "folded-hands", "🙏️": "folded-hands", "👋": "waving-hand", "👋️": "waving-hand", "✋": "raised-hand", "✋️": "raised-hand", "👀": "eyes", "👀️": "eyes", "🙈": "see-no-evil-monkey", "🙈️": "see-no-evil-monkey", "👤": "bust-in-silhouette", "👤️": "bust-in-silhouette", "👥": "busts-in-silhouette", "👥️": "busts-in-silhouette", "👪": "family", "👪️": "family", "👶": "baby", "👶️": "baby", "🗳️": "ballot-box-with-ballot", "🗳": "ballot-box-with-ballot", "🔗": "link", "🔗️": "link", "☀️": "sun", "☀": "sun", "🌤️": "sun-behind-small-cloud", "🌤": "sun-behind-small-cloud", "🌥️": "sun-behind-large-cloud", "🌥": "sun-behind-large-cloud", "☁️": "cloud", "☁": "cloud", "❄️": "snowflake", "❄": "snowflake", "🌡️": "thermometer", "🌡": "thermometer", "⛷️": "skier", "⛷": "skier", "🥾": "hiking-boot", "🥾️": "hiking-boot", "🧗": "person-climbing", "🧗️": "person-climbing", "🧘": "person-in-lotus-position", "🧘️": "person-in-lotus-position", "🍝": "spaghetti", "🍝️": "spaghetti", "☕": "hot-beverage", "☕️": "hot-beverage", "🎲": "game-die", "🎲️": "game-die", "🧩": "puzzle-piece", "🧩️": "puzzle-piece", "🧴": "lotion-bottle", "🧴️": "lotion-bottle", "🎒": "backpack", "🎒️": "backpack", "💼": "briefcase", "💼️": "briefcase", "🧳": "luggage", "🧳️": "luggage", "📅": "calendar", "📅️": "calendar", "🗓️": "spiral-calendar", "🗓": "spiral-calendar", "📆": "tear-off-calendar", "📆️": "tear-off-calendar", "✅": "check-mark-button", "✅️": "check-mark-button", "⚠️": "warning", "⚠": "warning", "🗑": "wastebasket", "🗑️": "wastebasket", "💾": "floppy-disk", "💾️": "floppy-disk", "📦": "package", "📦️": "package", "🔎": "magnifying-glass-tilted-right", "🔎️": "magnifying-glass-tilted-right", "🔍": "magnifying-glass-tilted-left", "🔍️": "magnifying-glass-tilted-left", "⚡": "high-voltage", "⚡️": "high-voltage", "✏️": "pencil", "✏": "pencil", "🔒": "locked", "🔒️": "locked", "🔓": "unlocked", "🔓️": "unlocked", "🔐": "locked-with-key", "🔐️": "locked-with-key", "🔑": "key", "🔑️": "key", "⏳": "hourglass-not-done", "⏳️": "hourglass-not-done", "⏱️": "stopwatch", "⏱": "stopwatch", "🕘": "nine-o-clock", "🕘️": "nine-o-clock", "🕓": "four-o-clock", "🕓️": "four-o-clock", "⚙️": "gear", "⚙": "gear", "📴": "mobile-phone-off", "📴️": "mobile-phone-off", "📱": "mobile-phone", "📱️": "mobile-phone", "☎": "telephone", "☎️": "telephone", "📞": "telephone-receiver", "📞️": "telephone-receiver", "🔔": "bell", "🔔️": "bell", "🔌": "electric-plug", "🔌️": "electric-plug", "🧰": "toolbox", "🧰️": "toolbox", "🛠️": "hammer-and-wrench", "🛠": "hammer-and-wrench", "🧹": "broom", "🧹️": "broom", "🔴": "red-circle", "🔴️": "red-circle", "🟠": "orange-circle", "🟠️": "orange-circle", "🟢": "green-circle", "🟢️": "green-circle", "👁️": "eye", "👁": "eye", "🏳️": "white-flag", "🏳": "white-flag"};
  const VI_KEYS = Object.keys(VI).sort((a,b)=>b.length - a.length).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const VI_RE = new RegExp(VI_KEYS.join('|'), 'g'), VI_TEST = new RegExp(VI_KEYS.join('|'));
  const VI_DIR = () => (window.VZ_B || '') + (document.body.classList.contains('cv-ph-live') ? 'icons-live/' : document.body.classList.contains('cv-ph-past') ? 'icons-past/' : 'icons/');
  function viPhase(){ const d = VI_DIR(); document.querySelectorAll('img.vi').forEach(i=>{ const n = i.src.split('/').pop(); if(!i.src.endsWith('/' + d + n)) i.src = d + n; }); }
  const VI_SKIP = /^(SCRIPT|STYLE|TEXTAREA|OPTION|SELECT|TITLE|INPUT|CODE|PRE)$/;
  function viWalk(root){
    if(!root || M.noVi) return;
    if(root.nodeType === 3) root = root.parentNode; if(!root || root.nodeType !== 1 || VI_SKIP.test(root.nodeName) || (root.closest && root.closest('[data-novi]'))) return;
    const w = document.createTreeWalker(root, 4, {acceptNode: n => { const p = n.parentNode; if(!p || VI_SKIP.test(p.nodeName) || p.isContentEditable || p.namespaceURI === 'http://www.w3.org/2000/svg' || (p.closest && p.closest('[data-novi],svg'))) return 2; return VI_TEST.test(n.nodeValue) ? 1 : 2; }});
    const L = []; while(w.nextNode()) L.push(w.currentNode);
    L.forEach(n => {
      const t = n.nodeValue, f = document.createDocumentFragment(); let last = 0;
      t.replace(VI_RE, (m, i) => { if(i > last) f.appendChild(document.createTextNode(t.slice(last, i)));
        const im = document.createElement('img'); im.className = 'vi'; im.alt = m; im.src = VI_DIR() + VI[m] + '.webp'; im.draggable = false; f.appendChild(im); last = i + m.length; return m; });
      if(last < t.length) f.appendChild(document.createTextNode(t.slice(last)));
      if(n.parentNode) n.parentNode.replaceChild(f, n);
    });
  }
  { let viQ = new Set(), viT = 0;
    const flush = () => { viT = 0; const q = [...viQ]; viQ.clear(); q.forEach(n => { if(n.isConnected) viWalk(n); }); };
    new MutationObserver(list => { for(const r of list){ if(r.type === 'characterData') viQ.add(r.target); else r.addedNodes.forEach(n => { if(n.nodeType === 1 || n.nodeType === 3) viQ.add(n); }); }
      flush(); }).observe(document.body, {childList:true, subtree:true, characterData:true});
    setTimeout(() => viWalk(document.body), 50); }

  /* ---------- 🎬 Petites animations (un avion qui décolle, un nounours qui va au lit…) ----------
     Chaque scène utilise une image anim/<nom>.webp si elle existe (dessins maison), sinon un emoji. */
  const FX_IMG = {}, FX_EMO = {plane:'✈️', train:'🚄', bus:'🚌', car:'🚗', boat:'⛴️', bear:'🧸', bed:'🛏️', moon:'🌙', zzz:'💤', cloud:'☁️', ticket:'🎟️', camera:'📸', suitcase:'🧳', star:'✨', heart:'💖'};
  // anim/list.json (facultatif) liste les dessins disponibles, ex. ["plane","bear","bed"] : une seule requête au démarrage
  setTimeout(()=>{ fetch('anim/list.json', {cache:'no-cache'}).then(r=>r.ok ? r.json() : []).then(l=>{ (Array.isArray(l) ? l : []).forEach(k=>{ const im = new Image(); im.onload = () => { FX_IMG[k] = im.src; }; im.src = (window.VZ_B || '') + 'anim/' + k + '.webp'; }); }).catch(()=>{}); }, 4000);
  const fxEl = k => FX_IMG[k] ? `<img class="fx-i fx-i-${k}" src="${FX_IMG[k]}" alt="">` : `<span class="fx-e" data-novi>${FX_EMO[k]}</span>`;
  function fxPlay(kind, label){
    try { if(M.noFx || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return; } catch(e){}
    const old = document.getElementById('cv-anim'); if(old) old.remove();
    const el = document.createElement('div'); el.id = 'cv-anim'; el.className = 'cv-anim fx-' + kind;
    const L = label ? `<div class="fx-lab">${esc(label)}</div>` : '';
    const scenes = {
      plane: `<div class="fx-sky"></div><div class="fx-runway"></div><div class="fx-cl c1">${fxEl('cloud')}</div><div class="fx-cl c2">${fxEl('cloud')}</div><div class="fx-mover">${fxEl('plane')}</div>${L}`,
      train: `<div class="fx-lines"></div><div class="fx-rail"></div><div class="fx-mover">${fxEl('train')}</div>${L}`,
      bus: `<div class="fx-lines"></div><div class="fx-road"></div><div class="fx-mover">${fxEl('bus')}</div>${L}`,
      car: `<div class="fx-lines"></div><div class="fx-road"></div><div class="fx-mover">${fxEl('car')}</div>${L}`,
      boat: `<div class="fx-sea"></div><div class="fx-mover">${fxEl('boat')}</div>${L}`,
      hotel: `<div class="fx-night"></div><div class="fx-moon">${fxEl('moon')}</div><div class="fx-bed">${fxEl('bed')}</div><div class="fx-bear">${fxEl('bear')}</div><div class="fx-blanket"></div><div class="fx-z">${fxEl('zzz')}</div>${L}`,
      ticket: `<div class="fx-pop">${fxEl('ticket')}</div><div class="fx-stamp">✓</div>${L}`,
      souvenir: `<div class="fx-flash"></div><div class="fx-pop">${fxEl('camera')}</div>${L}`,
      trip: `<div class="fx-burst">${Array.from({length:14}, (_, i)=>`<i style="--a:${i * 360 / 14}deg;--d:${(i % 3) * .08}s">${fxEl('star')}</i>`).join('')}</div><div class="fx-pop">${fxEl('suitcase')}</div>${L}`
    };
    el.innerHTML = scenes[kind] || scenes.ticket; if(FX_IMG.bed) el.classList.add('fx-img');
    document.body.appendChild(el);
    setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>el.remove(), 450); }, kind === 'hotel' ? 2600 : 2000);
  }
  function fxFor(it){
    if(!it) return;
    if(it.cat === 'transport'){ const m = String(it.mode || ''); fxPlay(/Avion/i.test(m) ? 'plane' : /Train|Métro|Tram/i.test(m) ? 'train' : /Bateau|Ferry/i.test(m) ? 'boat' : /Bus|Car\b/i.test(m) ? 'bus' : 'car', /Avion/i.test(m) ? 'Bon vol !' : 'Bonne route !'); }
    else if(it.cat === 'hotel') fxPlay('hotel', 'Bonne nuit !');
    else if(it.cat === 'activite') fxPlay('ticket', 'C’est réservé !');
  }

  /* ---------- 🌅 Où tu en es : le voyage en 5 actes (rêve → esquisse → plan → voyage → souvenirs) ---------- */
  const ACTS = [
    {n:1, t:'Le rêve', s:'Tu imagines ta prochaine aventure.', d:'Tu choisis une destination, une période et une ambiance qui te fait vibrer.', p:'Tout commence par une idée…'},
    {n:2, t:'L’esquisse', s:'Ton voyage prend forme.', d:'Tu découvres des hébergements, des trajets, des activités, et tu ajustes l’itinéraire à ton image.', p:'Tu explores, tu choisis, tu construis.'},
    {n:3, t:'Le plan', s:'Tout est organisé.', d:'Ton itinéraire est prêt : chaque jour, les lieux, les horaires, les réservations. Rien n’est laissé au hasard.', p:'Ton itinéraire, jour par jour.'},
    {n:4, t:'Le voyage', s:'Tu vis chaque instant.', d:'Tu découvres, tu profites, tu prends des photos. L’appli t’accompagne tout au long du chemin.', p:'Des souvenirs à chaque étape.'},
    {n:5, t:'Les souvenirs', s:'Tu revis, tu partages, tu gardes.', d:'Ton voyage devient un carnet vivant : photos, notes, émotions, et même les bons plans pour la prochaine fois.', p:'Parce que les plus beaux voyages se vivent deux fois.'}
  ];
  function actOf(t){
    if(!t) return ACTS[0]; const ph = tripPhase(t);
    if(ph === 'past' || t.archived) return ACTS[4]; if(ph === 'live') return ACTS[3];
    if(!t.debut || !items().length) return ACTS[0];
    const S = prepSteps().filter(s=>!s.opt || s.ok), pct = S.filter(s=>s.ok).length / S.length;
    return pct >= .7 ? ACTS[2] : ACTS[1];
  }
  function actBand(){
    const t = trip(); if(!t || hidden('blk:act')) return '';
    const a = actOf(t);
    return `<div class="cv-actb"><div class="ac-path">${ACTS.map(x=>`<span class="${x.n < a.n ? 'past' : x.n === a.n ? 'on' : ''}" title="${x.t}">${x.n}</span>`).join('<i></i>')}</div>
      <div class="ac-h"><span class="ac-n">${a.n}</span><b>${a.t}</b></div><div class="ac-s">${a.s}</div><div class="ac-d">${a.d}</div></div>`;
  }
  // une phrase écrite à la main au pied de l'écran
  const POEM_TAB = {souv:'Des souvenirs à chaque étape.', budget:'Chaque dépense raconte un bout du voyage.', check:'Une valise bien faite, un esprit léger.', notes:'Les petites idées font les grands voyages.', envies:'Tout commence par une idée…'};
  function poem(){
    const body = document.getElementById('cv-body'); if(!body || body.querySelector('.cv-poem') || hidden('blk:poem')) return;
    const t = trip(); if(!t) return;
    const txt = (M.mode === 'prep' || !M.mode) && POEM_TAB[M.tab] ? POEM_TAB[M.tab] : M.mode === 'bilan' ? ACTS[4].p : M.mode === 'past' ? ACTS[4].p : actOf(t).p;
    body.insertAdjacentHTML('beforeend', `<div class="cv-poem"><span>${esc(TT(txt))}</span><svg viewBox="0 0 60 22" aria-hidden="true"><path d="M2 14c10 0 14-8 22-8 6 0 6 6 2 8-5 3-9-3-5-7 4-3 10 1 9 6 0 3-3 4-5 3M34 13c6 0 12-4 24-3"/></svg></div>`);
  }
  /* ---------- 🗺️ Mon itinéraire : la route sur une carte classique ---------- */
  const PMAP = {};
  function progMap(){
    const t = trip(); if(!t || hidden('blk:pmap')) return ''; const st = tlStages(); if(!st.length) return '';
    const key = M.trip + '|' + st.map(s=>s.city).join('>');
    return `<div class="cv-pmap"><div class="pm-h"><b>Mon itinéraire</b><small>${st.map(s=>esc(s.city)).join(' → ')}</small></div>
      <button type="button" class="pm-m" data-pmap="${esc(key)}" onclick="CV.tlMap()" aria-label="Agrandir la carte">${PMAP[key] ? `<img src="${PMAP[key]}" alt="">` : '<span class="v-sum-small">🗺️ Carte en cours…</span>'}</button></div>`;
  }
  const PMAP_BUSY = {};
  async function progMapHydrate(){
    const el = document.querySelector('.cv-pmap [data-pmap]'); if(!el || el.querySelector('img:not(.vi)')) return;
    const key = el.dataset.pmap; if(PMAP_BUSY[key]) return; PMAP_BUSY[key] = 1;
    const paint = h => document.querySelectorAll(`.cv-pmap [data-pmap="${CSS.escape(key)}"]`).forEach(e=>{ e.innerHTML = h; });
    try { const c = await withTimeout(tripMapCanvas(640, 300, true), 25000);
      if(c){ PMAP[key] = c.toDataURL('image/jpeg', .88); paint(`<img src="${PMAP[key]}" alt="">`); } else paint('<span class="v-sum-small">🗺️ Villes introuvables sur la carte</span>'); }
    catch(e){ paint('<span class="v-sum-small">🗺️ Carte indisponible pour l’instant (connexion ?)</span>'); }
    finally { delete PMAP_BUSY[key]; }
  }


  /* ======================================================================
     ☁️ Synchro simplifiée · 🔗 invitations par lien · 👀 abonnés (photos + récits, ❤️ et 💬)
     ====================================================================== */
  const appUrl = () => M.sync.url || (/^https?:/.test(location.protocol) ? location.origin + location.pathname : '');
  // ---------- État de synchro unique (pastille dans l'en-tête) ----------
  function syncState(){
    const sps = (M.spaces||[]), any = (M.sync.on && M.sync.code) || sps.length;
    if(!any) return 'off';
    if(M.sync.err || sps.some(x=>x.err)) return navigator.onLine === false ? 'offline' : 'err';
    const mainOn = !!(M.sync.on && M.sync.code), pqLive = Math.max(0, (M.pq||[]).length - (M.pqWait||0));   // en attente d’un carnet en ligne ≠ en cours d’envoi
    if(syncing || (mainOn && M.dirty.length) || sps.some(x=>(x.dirty||[]).length)) return 'wait';
    if(pqLive || (M.fq||[]).length) return 'ph';   // tes modifications sont parties ; seules des photos sont encore en route
    return 'ok';
  }
  function syncPill(){
    let b = document.getElementById('cv-syncpill');
    // version test ouverte depuis un carnet : pas de voyant (le carnet n'en a pas, la synchro passe par le serveur du carnet)
    if(window.VZ_HOST){ if(b) b.remove(); return; }
    const btns = document.querySelector('.hero-btns'); if(!btns) return;
    if(!b){ b = document.createElement('button'); b.type = 'button'; b.id = 'cv-syncpill'; b.className = 'cv-syncpill'; b.onclick = () => CV.cloudSheet(); btns.prepend(b); }
    const st = syncState(), L = {ok:['☁️','À jour'], wait:['⏳','Envoi…'], ph:['📷', RF('{0} photos', pqN() + (M.fq||[]).length)], err:['⚠️','Souci'], offline:['📴','Hors ligne'], off:['☁️','Local']};
    const md = cloudMode(); if(st === 'off') L.off = md === 'none' ? ['📱','Sans cloud'] : ['☁️','Cloud']; if(md === 'none' && st === 'ok') L.ok = ['📱','Sans cloud'];
    b.className = 'cv-syncpill ' + st + (md ? '' : ' new'); b.innerHTML = `<span>${L[st][0]}</span><small>${L[st][1]}</small>`; b.setAttribute('aria-label', 'Cloud Vezoria : ' + L[st][1]);
  }
  async function syncMainNew(){
    if(!(await uiConfirm('Créer ton code principal ?\n\nTous tes voyages seront sauvegardés sur le serveur, chiffrés sur ce téléphone : personne d’autre ne peut les lire. Garde bien ce code : c’est lui qui ouvre ton carnet sur un autre appareil.'))) return;
    closeSheet(true); await syncOn(genCode());
  }
  async function syncMainJoin(){
    const v = ((document.getElementById('sy-join') || {}).value || '').trim().toUpperCase();
    if(v.length < 8){ alert('Code trop court (au moins 8 caractères).'); return; }
    closeSheet(true); await syncOn(v);
  }
  /* ══════════ ☁️ Cloud Vezoria : un seul bouton en haut, trois choix simples ══════════
     1. Tout mon carnet dans le cloud (code principal)   2. Voyage par voyage (jamais la totalité)
     3. Sans cloud : tout reste ici, partage par paquets chiffrés envoyés soi-même.
     Choisir un cloud ne partage RIEN : le partage avec les amis est une étape à part (tout / au choix). */
  const myTrips = () => trips().filter(t=>t && !t.demo && !t.deleted && t.type === 'trip');
  const tripInCloud = id => !!(TS()[id] && spaceObj(TS()[id]));
  const cloudMode = () => M.cloud || (M.sync.on && M.sync.code ? 'all' : myTrips().some(t=>tripInCloud(t.id)) ? 'trips' : '');
  const CLOUD_L = {all:['☁️', 'Tout mon carnet dans le cloud'], trips:['🧳', 'Voyage par voyage'], none:['📱', 'Sans cloud']};
  function cloudState(sp){ return sp.err ? '⚠️ ' + esc(sp.err) : (sp.dirty||[]).length ? '⏳ ' + sp.dirty.length + ' modif(s) à envoyer' : '✓ à jour' + (sp.last ? ' · ' + vzWhen(sp.last) : ''); }
  function cloudSheet(view){
    const mode = cloudMode(), choose = view === 'choose' || !mode;
    if(choose){
      openSheet(`<h2>☁️ Cloud Vezoria</h2>
        <div class="v-sum-small" style="margin-bottom:12px">Où gardes-tu tes voyages ?<br><b>À cette étape, rien n’est partagé avec tes compagnons.</b><br>C’est ton cloud perso, chiffré sur ce téléphone : personne d’autre ne peut le lire, pas même nous.</div>
        <button type="button" class="cv-choice${mode === 'all' ? ' on' : ''}" onclick="CV.cloudPick('all')"><i>☁️</i><span><b>Tout mon carnet dans le cloud</b><small>Tes voyages sont sauvegardés et te suivent sur tous tes appareils. Partage avec tes compagnons et tes abonnés, notifications. <span>${esc(RF('{0} de photos offerts, voyages partagés compris.', fmtB(((M.quota && M.quota.free) || 7e8))))}</span></small></span></button>
        <button type="button" class="cv-choice cv-off${mode === 'none' ? ' on' : ''}" onclick="CV.cloudPick('none')"><i>📱</i><span><em class="cv-offb">∞ ${MSGT('Sans limite · 100 % privé')}</em><b>Sans cloud</b><small>Rien sur nos serveurs et aucune limite de photos : tout reste sur ton téléphone ou ton ordinateur. Tu partages par paquets chiffrés que tu envoies toi-même. Pas d’abonnés ni de notifications entre amis, et pense à ta sauvegarde ZIP.</small></span></button>
        ${cloudCompare()}
        <div class="sy-r" style="margin-top:6px"><b>🔑 Tu as déjà un code ?</b><small>Ton code administrateur (celui de ton autre appareil : tout ton carnet arrive ici) ou un code compagnon reçu d’un proche.</small>
          <div class="cv-row" style="margin-top:6px"><input class="v-in" id="sy-join" placeholder="XXXX-XXXX-XXXX" autocapitalize="characters" autocomplete="off"><button type="button" class="fd-send" onclick="CV.cloudJoinMain()">Utiliser</button></div>${qrBtn('sy-join')}</div>
        <button type="button" class="v-btn sec" onclick="CV.close();CV.joinAny()">🤝 J’ai reçu une invitation dans un voyage</button>
        <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">${mode ? 'Annuler' : 'Plus tard'}</button></div>`);
      return;
    }
    const [ic, lab] = CLOUD_L[mode], s = M.sync, ph = pqN() + (M.fq||[]).length;
    let h = `<h2>☁️ Cloud Vezoria</h2>
      <div class="cv-cl-mode"><span>${ic}</span><b>${lab}</b><button type="button" class="cv-cl-ch" onclick="CV.cloudSheet('choose')">Changer</button></div>
      ${(()=>{ const pend = [...(s.on && s.code ? M.dirty.map(id=>[id, '']) : []), ...(M.spaces||[]).flatMap(x=>(x.dirty||[]).map(id=>[id, x.code]))], dn = pend.length, last = Math.max(s.last || 0, ...(M.spaces||[]).map(x=>x.last || 0));
        return `<div class="cv-cl-st">${dn ? `<details><summary>📝 ${RF('{0} modification(s) à envoyer', dn)}${last ? ' · ' + vzWhen(last) : ''}</summary><div class="cv-cl-pd">${pend.slice(0, 25).map(([id, c])=>{ const r = R[id]; return `<div>${r ? esc(r.type) + ' · <span data-notr>' + esc(String(r.titre || r.nom || r.texte || r.id).slice(0, 40)) + '</span>' : '<i>' + esc(MSGT('fiche introuvable')) + '</i> ' + esc(String(id).slice(0, 24))}${c ? ' <small>' + esc(c.slice(0, 4)) + '…</small>' : ''}</div>`; }).join('')}</div></details>` : `<div>📝 ${MSGT('Tes modifications sont envoyées')}${last ? ' · ' + vzWhen(last) : ''}</div>`}${ph ? `<div>📷 ${RF('{0} photo(s) en route : elles partent en arrière-plan, appli ouverte.', ph)}</div>` : ''}${M.pqErr ? `<div class="err">${esc(M.pqErr)}</div>` : ''}
          <button type="button" class="v-btn sec" onclick="CV.syncNow(true)">🔄 ${MSGT('Synchroniser maintenant')}</button></div>`; })()}`;
    if(mode === 'all'){
      h += `<div class="sy-r"><b>🔑 Mon code administrateur</b><small>${s.on && s.code ? cloudState(s) : ''}</small>
          <div class="cv-row" style="margin-top:6px"><b class="cv-code">${esc(s.code || '')}</b><button type="button" class="v-btn sec" style="width:auto;margin:0 0 0 auto;padding:6px 12px" onclick="CV.copyCode()">📋 Copier</button></div>
          <small>Garde-le bien et ne le donne à personne : c’est lui qui ouvre TON compte sur un autre appareil (carnet, voyages partagés et suivis).</small>
          ${ownerOn() ? `<button type="button" class="v-btn sec" style="margin-top:8px" onclick="CV.deviceAdd()">📱 Ajouter un de mes appareils (QR code)</button>` : ''}</div>`;
      h += quotaBox();
      if(ownerOn()) h += `<div class="cv-cl-h">👥 Compagnons de tout mon carnet</div><div class="v-sum-small" style="margin-bottom:6px">Un code compagnon ouvre ton carnet (voir, ajouter, modifier) sans tes droits d’administrateur : pas d’effacement, pas de gestion des accès.</div>
        <div id="cv-mem"><div class="v-sum-small">…</div></div><button type="button" class="v-btn sec" style="margin-top:6px" onclick="CV.memberInvite()">➕ Créer un code compagnon</button>`;
    }
    if(memberSpaces().length) h += `<div class="cv-cl-h">👥 Carnets où je suis compagnon</div>` + memberSpaces().map(x=>{ const g = (M.memberGrant || {})[x.code] || {};
      return `<div class="cv-cl-t"><span><b data-notr>${esc(g.by || '👤')}</b><small>${x.err ? '⚠️ ' + esc(x.err) : '☁️ ' + cloudState(x)}</small></span><button type="button" class="v-btn sec" onclick="CV.memberLeave('${ja(x.code)}')">Quitter</button></div>`; }).join('');
    if(mode === 'trips'){
      const ts = myTrips();
      h += `<div class="sh-note">🔁 ${MSGT('Le cloud « voyage par voyage » s’arrête : passe à tout ton carnet, tes voyages en ligne s’y rattachent.')}<button type="button" class="v-btn" style="margin-top:8px" onclick="CV.cloudPick('all')">☁️ ${MSGT('Mettre tout mon carnet dans le cloud')}</button></div>`;
      h += `<div class="cv-cl-h">Mes voyages dans le cloud</div>`
        + (ts.map(t=>{ const c = TS()[t.id], sp = c && spaceObj(c);
            return `<div class="cv-cl-t"><span><b>${esc(t.titre || '')}</b><small>${sp ? '☁️ ' + cloudState(sp) : 'Seulement sur ce téléphone'}</small></span>`
              + (sp ? `<button type="button" class="v-btn sec" onclick="CV.cloudTripOff('${ja(t.id)}')">Retirer du cloud</button>` : `<button type="button" class="v-btn sec" onclick="CV.cloudTrip('${ja(t.id)}')">☁️ Mettre dans le cloud</button>`) + `</div>`; }).join('')
          || '<div class="v-sum-small">Aucun voyage pour l’instant : crée-en un, puis reviens ici.</div>');
    }
    if(mode === 'none'){
      h += `<div class="v-sum-small" style="margin:4px 0 10px">Tout reste sur ce téléphone. Pour partager avec ton cercle, envoie un paquet chiffré (un fichier) par ta messagerie : tes amis l’ouvrent avec la phrase secrète que tu leur donnes.<br><br>Tes rappels personnels arrivent quand même ; les notifications entre amis demandent le cloud.</div>
        <div class="cv-row"><button type="button" class="v-btn" onclick="CV.close();CV.pkgSheet()">📤 Envoyer un paquet</button><button type="button" class="v-btn sec" onclick="CV.close();CV.pkgImport()">📥 Recevoir un paquet</button></div>
        ${M.pkgLast ? `<div class="v-sum-small" style="margin-top:6px">${(window.I18N && I18N.msg ? I18N.msg('Dernier paquet envoyé : {0}') : 'Dernier paquet envoyé : {0}').replace('{0}', vzWhen(M.pkgLast))}</div>` : ''}`;
      if(myFeeds().length) h += `<div class="sy-r" style="margin-top:8px"><b>👀 ${myFeeds().length} voyage(s) encore publié(s) pour des abonnés</b><small>Ils y ont toujours accès, même aux voyages terminés.</small><button type="button" class="v-btn sec" style="margin-top:6px" onclick="CV.cloudFeedCut()">🚫 Couper l’accès de mes abonnés</button></div>`;
      const left = !!s.code || myTrips().some(t=>tripInCloud(t.id));
      if(left) h += `<div class="v-sum-small" style="margin-top:8px">ℹ️ Des voyages sont encore sur le serveur (partages en cours).</div><button type="button" class="v-btn sec" style="margin-top:6px" onclick="CV.close();CV.serverWipeSheet()">🗑 Supprimer mes données du serveur</button>`;
    } else {
      h += `<div class="sh-note">👥 Inviter tes compagnons, publier pour des abonnés, rejoindre un voyage : tout se fait dans « Partager ».<button type="button" class="v-btn sec" style="margin-top:8px" onclick="CV.close();CV.shareHub()">👥 Ouvrir Partager</button></div>`;
    }
    if(ph && mode !== 'none') h += `<div class="v-sum-small" style="margin-top:6px">📸 ${ph} photo(s) en attente d’envoi</div>`;   // modèle traduit « 📸 {0} photo(s) en attente d’envoi »
    h += `<div class="v-actions">${mode !== 'none' ? `<button type="button" class="v-btn" onclick="CV.syncNow(true);CV.close()">🔄 Synchroniser maintenant</button>` : ''}<button type="button" class="v-btn sec" onclick="CV.close()">OK</button></div>`;
    openSheet(h); if(mode === 'all' && ownerOn()) setTimeout(memberListLoad, 50);
    if(mode === 'all' && M.sync.on && M.sync.code) setTimeout(()=>{ quotaLoad(!M.quota || Date.now() - (M.quota.at || 0) > 60000); }, 80);
  }
  async function cloudPick(m){
    const s = M.sync, mainOn = !!(s.on && s.code), anyTrip = myTrips().some(t=>tripInCloud(t.id));
    if(m === 'all'){
      // carnet gardé dans le cloud lors d’un départ : on le reprend avec le même code (rien à régénérer)
      if(!mainOn && s.code){
        if(await uiConfirm('Reprendre ton carnet gardé dans le cloud ?\n\nOK = le reprendre avec ton ancien code : ce que tu as ajouté entre-temps sur ce téléphone y est envoyé.\nAnnuler = créer un nouveau code.')){ closeSheet(true); await cloudResume(); return; }
      }
      if(!mainOn){
        if(!(await uiConfirm('Mettre tout ton carnet dans le cloud ?\n\nTous tes voyages seront sauvegardés, chiffrés sur ce téléphone : personne d’autre ne peut les lire. Rien n’est partagé avec tes amis tant que tu ne le décides pas.'))) return;
        closeSheet(true); await syncOn(genCode());
        if(!(M.sync.on && M.sync.code)) return;
      }
      M.cloud = 'all'; persist(); cloudSheet(); refresh(); return;
    }
    // quitter « tout mon carnet » : on demande ce que devient la copie dans le cloud
    if((m === 'trips' || m === 'none') && mainOn){ cloudLeaveSheet(m); return; }
    if(m === 'trips'){ cloudPick('all'); return; }   // 🔁 plus de « voyage par voyage »
    if(m === 'none'){
      if(anyTrip && !(await uiConfirm('Passer en « sans cloud » ?\n\nLes voyages déjà partagés continuent pour tes compagnons ; pour les retirer du serveur : Réglages → Supprimer mes données du serveur.'))) return;
      M.cloud = 'none'; persist(); if(!cloudFeedAsk()) cloudSheet(); refresh(); return;
    }
  }
  function cloudLeaveSheet(m){
    openSheet(`<h2>☁️ Et ton carnet dans le cloud ?</h2>
      <div class="v-sum-small" style="margin-bottom:12px">Ce téléphone n’enverra plus tout le carnet. Que fait-on de la copie déjà dans le cloud ?</div>
      <button type="button" class="cv-choice" onclick="CV.cloudLeave('${ja(m)}','wipe')"><i>🗑</i><span><b>L’effacer du cloud</b><small>Fiches et photos supprimées du serveur, pour de bon. Ce qui est sur ce téléphone reste ici.</small></span></button>
      <button type="button" class="cv-choice" onclick="CV.cloudLeave('${ja(m)}','keep')"><i>🗄️</i><span><b>La garder dans le cloud</b><small>Elle reste en sécurité (chiffrée), sans mise à jour. Tu pourras l’effacer plus tard dans Réglages.</small></span></button>
      <div class="v-sum-small" style="margin-top:6px">⚠️ Si tu l’effaces, tes compagnons (codes compagnon) perdent aussi l’accès au carnet.</div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.cloudSheet('choose')">Annuler</button></div>`);
  }
  async function cloudLeave(m, how){
    const s = M.sync;
    if(how === 'wipe'){
      if(!(await uiConfirm('Effacer définitivement ton carnet du cloud ?\n\nCette action ne peut pas être annulée. Ce qui est sur ce téléphone reste ici.'))) return;
      try {
        const r = await fetch(apiUrl(), {method:'DELETE', headers:{'X-Carnet-Code':await authCode(s.code)}});
        let j = {}; try { j = await r.json(); } catch(e){}
        if(!r.ok) throw new Error(j.error || ('erreur ' + r.status));
        { const owner = {}; Object.values(R).forEach(x=>{ if(!x || x.type === 'feed') return; [...(x.photos||[]), x.recu, x.preuve, x.cover, ...(x.pj||[]).map(p=>p && p.id)].forEach(p=>{ if(p && !owner[p]) owner[p] = x; }); });
          M.pq = (M.pq||[]).filter(id=>{ const r = owner[String(id).replace(/\.t$/,'')]; return r && targets(r)[0] !== 'main'; }); }
        M.pgone = (M.pgone||[]).filter(g=>g.code !== s.code); toast('🗑 Carnet effacé du cloud');
      } catch(e){ alert('Effacement impossible : ' + e.message + '\nRien n’a changé : réessaie quand tu as du réseau.'); return; }
      s.since = 0; M.dirty = []; s.code = '';
    }
    s.on = false; M.cloud = m; persist(); if(!(m === 'none' && cloudFeedAsk())) cloudSheet(); refresh();
  }
  // ── abonnés : ce ne sont pas des compagnons de voyage → en quittant le cloud, on propose de leur couper l’accès ──
  const myFeeds = () => myTrips().filter(t=>feedCode(t.id));
  function cloudFeedAsk(){
    const fs = myFeeds(); if(!fs.length) return false;
    openSheet(`<h2>👀 Et tes abonnés ?</h2>
      <div class="v-sum-small" style="margin-bottom:10px">Ces voyages sont publiés pour des abonnés (famille, amis qui te suivent). Ils ne sont pas tes compagnons de voyage : tu peux leur couper l’accès, y compris aux voyages terminés.</div>
      ${fs.map(t=>`<div class="cv-cl-t"><span><b>${esc(t.titre || '')}</b><small>👀 Publié pour des abonnés</small></span></div>`).join('')}
      <button type="button" class="v-btn danger" style="margin-top:8px" onclick="CV.cloudFeedCut()">🚫 Couper l’accès de mes abonnés</button>
      <div class="v-sum-small" style="margin-top:6px">Les publications disparaissent de leur appli à leur prochaine ouverture, et les photos publiées sont retirées du serveur. Tes compagnons de voyage, eux, ne sont pas concernés.</div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.cloudSheet()">Garder les publications</button></div>`);
    return true;
  }
  function feedCut(tid){
    const c = FT()[tid]; if(!c) return;
    const out = list('feed', f=>f.trip===ftId(tid)).map(f=>Object.assign(clone(f), {deleted:true})); if(R[ftId(tid)]) out.push(Object.assign(clone(R[ftId(tid)]), {deleted:true}));
    putQuiet(out);
    return c;
  }
  async function cloudFeedCut(){
    const fs = myFeeds(); if(!fs.length){ cloudSheet(); return; }
    if(!(await uiConfirm('Couper l’accès de tous tes abonnés ?\n\nIls ne verront plus aucun de ces voyages, même terminés.'))) return;
    const done = fs.map(t=>[t.id, feedCut(t.id)]).filter(x=>x[1]);
    try { await syncNow(); } catch(e){}
    done.forEach(([tid, c])=>{ delete FT()[tid]; delete TS()[ftId(tid)]; M.spaces = (M.spaces||[]).filter(x=>x.code !== c); });
    persist(); toast('🚫 Accès des abonnés coupé'); cloudSheet(); refresh();
  }
  async function cloudResume(){
    const s = M.sync;
    try {
      const j = await call(0, [], s.code);
      mergeRemote(j.records, true);
      M.dirty = []; Object.values(R).filter(r=>!r.demo).forEach(r=>markDirty(r.id));
      s.on = true; s.since = j.now; s.err = ''; M.cloud = 'all';
      if(!j.records.filter(r=>!r.deleted).length) await photoQueueAll();
      persist(); toast('☁️ Carnet repris dans le cloud'); await syncNow(); refresh(); cloudSheet();
    } catch(e){ alert('Reprise impossible : ' + e.message); }
  }
  async function cloudJoinMain(){
    const v = ((document.getElementById('sy-join') || {}).value || '').trim().toUpperCase();
    if(v.length < 8){ alert('Colle ton code administrateur ou ton code compagnon.'); return; }
    try { if(await memberTry(v)) { closeSheet(true); return; } } catch(e){}   // 👥 c’était un code compagnon
    closeSheet(true); await syncOn(v);
    if(M.sync.on && M.sync.code){ M.cloud = 'all'; persist(); refresh(); }
  }

  /* ══════════ 🔑 Code administrateur · 👥 code compagnon · 📱 mon compte sur tous mes appareils ══════════
     • Code administrateur (= code principal) : TON compte. Il ne se partage plus. Sur un autre appareil, il ramène TOUT :
       le carnet, et aussi les codes des voyages partagés à part, suivis, publiés (fiche « vz:codes », chiffrée avec une clé
       tirée du seul code administrateur : un compagnon la reçoit mais ne peut pas la lire).
     • Code compagnon : pour une personne. Il ouvre ton carnet (voir, ajouter, modifier) sans tes droits : il ne peut ni
       effacer le carnet du serveur, ni créer ou retirer d’autres compagnons, ni lire tes autres codes. Tu peux lui retirer
       l’accès à tout moment (le serveur refuse alors ses synchros). Chez lui, ton carnet est un dossier partagé de plus :
       son propre carnet reste à lui. */
  const memberApi = () => { const u = apiUrl(); return u ? u.replace(/\/sync$/, '/member') : ''; };
  const memberSpaces = () => (M.spaces || []).filter(x=>/^M:/.test(x.code));
  const memberOk = () => E2E && !window.VZ_HOST;
  async function pbkBits(code, salt){ const base = await crypto.subtle.importKey('raw', te.encode(code), 'PBKDF2', false, ['deriveBits']); return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2', salt:te.encode(salt), iterations:200000, hash:'SHA-256'}, base, 256)); }
  async function aesRaw(bits){ return crypto.subtle.importKey('raw', bits, 'AES-GCM', false, ['encrypt','decrypt']); }
  async function boxSeal(key, obj){ const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, te.encode(JSON.stringify(obj)))), o = new Uint8Array(12 + ct.length); o.set(iv); o.set(ct, 12); return b64(o); }
  async function boxOpen(key, s){ const u8 = unb64(s); return JSON.parse(td.decode(new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM', iv:u8.slice(0, 12)}, key, u8.slice(12))))); }
  const normCode = c => String(c || '').trim().toUpperCase().replace(/^M:/, '');
  async function memberApiCall(body, code){
    const h = {'Content-Type':'application/json'}; if(code) h['X-Carnet-Code'] = await authCode(code);
    const r = await fetch(memberApi(), {method:'POST', headers:h, body:JSON.stringify(body)});
    let j = {}; try { j = await r.json(); } catch(e){}
    return {ok:r.ok, status:r.status, j};
  }
  // ── 🔑 la liste de mes codes, chiffrée avec mon code administrateur ──
  let OWK = {c:'', k:null};
  async function ownerKey(){ const c = M.sync.code; if(OWK.c !== c){ OWK = {c, k: await aesRaw(await pbkBits(c, 'carnet-voyage/owner/v1'))}; } return OWK.k; }
  const ownerOn = () => memberOk() && !!(M.sync.on && M.sync.code) && !/^M:/.test(M.sync.code);
  function codesSnap(){
    return {ts:TS(), sp:(M.spaces || []).map(x=>x.code), fp:FT(), pk:PACKS(), ib:M.ib || '', mg:M.memberGrant || {}, ml:M.memLocal || {}, hide:M.hide || {}, my:Object.keys(M.myCodes || {}).filter(c=>spaceObj(c)).sort()};
  }
  const codesOf = s => [...new Set([...Object.values(s.ts || {}), ...(s.sp || []), ...Object.values(s.fp || {}), ...Object.keys(s.pk || {}), s.ib].filter(Boolean))];
  let codesBusy = false;
  async function codesPublish(){
    if(codesBusy || !ownerOn()) return;
    codesBusy = true;
    try {
      await codesAdopt();   // d’abord ce que mes autres appareils ont publié (sinon on écraserait leurs codes)
      const snap = codesSnap(), now = codesOf(snap), h = hex(await crypto.subtle.digest('SHA-256', te.encode(JSON.stringify(snap)))).slice(0, 24);
      const cur = R['vz:codes']; let cOk = !!(cur && cur.box && !cur.deleted);
      if(cOk && h === M.codesHash) return;
      const gone = new Set(M.codesGone || []); (M.codesList || []).forEach(c=>{ if(!now.includes(c)) gone.add(c); }); now.forEach(c=>gone.delete(c));
      M.codesGone = [...gone].slice(-300); M.codesList = now;
      const r = {id:'vz:codes', type:'ownercodes', box: await boxSeal(await ownerKey(), Object.assign({}, snap, {gone:M.codesGone})), updatedAt:Date.now()};
      R[r.id] = r; markDirty(r.id); M.codesHash = h; M.codesSeen = r.updatedAt; persist();
    } finally { codesBusy = false; }
  }
  async function codesAdopt(){
    const r = R['vz:codes']; if(!ownerOn() || !r || !r.box || r.deleted || (r.updatedAt || 0) <= (M.codesSeen || 0)) return 0;
    let d; try { d = await boxOpen(await ownerKey(), r.box); } catch(e){ M.codesHash = ''; return 0; }   // illisible (abîmée) : ce téléphone republiera la sienne
    M.codesSeen = r.updatedAt; let n = 0;
    const gone = new Set(d.gone || []);
    // quittés sur un autre de mes appareils : retirés ici aussi
    Object.keys(TS()).forEach(k=>{ if(gone.has(TS()[k])){ delete TS()[k]; n++; } });
    M.spaces = (M.spaces || []).filter(x=>!gone.has(x.code));
    Object.keys(FT()).forEach(k=>{ if(gone.has(FT()[k])) delete FT()[k]; });
    Object.keys(PACKS()).forEach(k=>{ if(gone.has(k)) delete PACKS()[k]; });
    // connus sur un autre de mes appareils : ajoutés ici
    Object.entries(d.mg || {}).forEach(([c, g])=>{ if(!gone.has(c) && !(M.memberGrant || {})[c]) (M.memberGrant || (M.memberGrant = {}))[c] = g; });
    Object.entries(d.ml || {}).forEach(([k, v])=>{ if(!(M.memLocal || {})[k]) (M.memLocal || (M.memLocal = {}))[k] = v; });
    (d.my || []).forEach(c=>{ if(!gone.has(c)) (M.myCodes || (M.myCodes = {}))[c] = 1; });   // 🌿 codes créés sur un autre de mes appareils (voyages à brancher sur mon carnet)
    (d.sp || []).forEach(c=>{ if(!gone.has(c) && !spaceObj(c) && (!/^M:/.test(c) || (M.memberGrant || {})[c])){ M.spaces.push({code:c, since:0, dirty:[], last:0, err:''}); n++; } });
    Object.entries(d.ts || {}).forEach(([k, c])=>{ if(!gone.has(c) && !TS()[k] && spaceObj(c)){ TS()[k] = c; n++; } });
    Object.entries(d.fp || {}).forEach(([k, c])=>{ if(!gone.has(c) && !FT()[k]) FT()[k] = c; });
    Object.entries(d.pk || {}).forEach(([k, v])=>{ if(!gone.has(k) && !PACKS()[k]) PACKS()[k] = v; });
    if(d.ib && !M.ib) M.ib = d.ib;
    Object.entries(d.hide || {}).forEach(([k, v])=>{ if(!(M.hide || {})[k]) (M.hide || (M.hide = {}))[k] = v; });
    M.codesGone = [...new Set([...(M.codesGone || []), ...gone])].slice(-300);
    M.codesHash = ''; persist();   // la liste réunie repart au prochain passage
    return n;
  }
  // ── 👥 côté compagnon : un code reçu est-il un code compagnon ? (sinon on continue comme avant) ──
  async function memberTry(raw){
    const code = normCode(raw); if(!memberOk() || !/^[A-Z0-9]{4}(-[A-Z0-9]{4}){2,}$/.test(code) || !memberApi()) return false;
    const mc = 'M:' + code;
    if(spaceObj(mc)){ toast('👥 ' + MSGT('Tu es déjà compagnon de ce carnet.')); return true; }
    const mt = hex(await pbkBits(code, 'carnet-voyage/member/v1'));
    const r = await memberApiCall({a:'grant', mt}); if(!r.ok || !r.j.grant) return false;
    let g; try { g = await boxOpen(await aesRaw(await pbkBits(code, 'carnet-voyage/member-key/v1')), r.j.grant); } catch(e){ return false; }
    return memberJoin(mc, Object.assign({mt}, g));
  }
  async function memberJoin(mc, g){
    const who = g.by || MSGT('quelqu’un');
    if(!(await uiConfirm(RF('Rejoindre le carnet de {0} en compagnon ?\n\nTu verras ses voyages et pourras les compléter. Ton propre carnet reste à toi, séparé.', who)))) return true;
    (M.memberGrant || (M.memberGrant = {}))[mc] = {k:g.k, h:g.h, mt:g.mt, by:g.by || '', n:g.n || '', at:Date.now()};
    if(!spaceObj(mc)) (M.spaces = M.spaces || []).push({code:mc, since:0, dirty:[], last:0, err:''});
    persist(); toast('👥 ' + RF('Carnet de {0} : synchronisation…', who));
    try { await syncSpace(spaceObj(mc), true); } catch(e){}
    persist(); refresh();
    const sp = spaceObj(mc); if(sp && sp.err) alert(sp.err); else toast('✅ ' + RF('Tu es compagnon du carnet de {0}', who));
    return true;
  }
  async function memberLeave(mc){
    const g = (M.memberGrant || {})[mc] || {}, who = g.by || MSGT('ce carnet');
    if(!(await uiConfirm(RF('Quitter le carnet de {0} ?\n\nSes voyages disparaissent de ce téléphone. Rien n’est effacé chez lui.', who)))) return;
    try { await memberApiCall({a:'leave'}, mc); } catch(e){}
    Object.keys(TS()).forEach(tid=>{ if(TS()[tid] === mc){ delete TS()[tid]; (M.hide || (M.hide = {}))[tid] = 1;
      Object.keys(R).forEach(id=>{ const x = R[id]; if(x && (x.id === tid || x.trip === tid)) delete R[id]; }); } });
    M.spaces = (M.spaces || []).filter(x=>x.code !== mc); delete (M.memberGrant || {})[mc]; delete ck[mc];
    if(trip() == null){ const t0 = trips()[0]; if(t0) M.trip = t0.id; }
    persist(); refresh(); toast('👋 ' + MSGT('Carnet quitté')); cloudSheet();
  }
  // nouveau voyage créé par un compagnon : dans quel carnet le ranger ?
  async function memberPlaceAsk(){
    const ms = memberSpaces().filter(x=>!x.err); if(!ms.length) return '';
    const g = (M.memberGrant || {})[ms[0].code] || {};
    return (await uiConfirm(RF('Ranger ce nouveau voyage dans le carnet partagé de {0} ?\n\nOK = carnet partagé (vous le voyez tous les deux).\nAnnuler = seulement dans ton carnet.', g.by || MSGT('ton compagnon')))) ? ms[0].code : '';
  }
  // ── 👥 côté propriétaire : créer, lister, retirer les codes compagnon ──
  async function memberInvite(){
    if(!ownerOn() || !memberApi()){ alert(MSGT('Il faut d’abord mettre tout ton carnet dans le cloud (☁️ Cloud → « Tout mon carnet »).')); return; }
    const raw = await uiPrompt(MSGT('Pour qui est ce code compagnon ? (prénom)'), ''); if(raw === null) return;
    const label = String(raw || '').trim().slice(0, 40);
    toast('🔐 ' + MSGT('Création du code compagnon…'));
    try {
      const C = genCode(), mt = hex(await pbkBits(C, 'carnet-voyage/member/v1')), kc = await aesRaw(await pbkBits(C, 'carnet-voyage/member-key/v1'));
      const [k, h] = await Promise.all([pbkBits(M.sync.code, 'carnet-voyage/e2e/v1'), pbkBits(M.sync.code, 'carnet-voyage/ids/v1')]);   // la clé du carnet, pas le code
      const grant = await boxSeal(kc, {k:b64(k), h:b64(h), by:myName(), n:label});
      const lbl = label ? 'e1:' + await boxSeal(await ownerKey(), label) : '';   // 🔒 le prénom part chiffré : seul le propriétaire le relit
      const r = await memberApiCall({a:'add', mt, grant, label:lbl}, M.sync.code);
      if(!r.ok) throw new Error(r.j.error || ('erreur ' + r.status));
      (M.memLocal || (M.memLocal = {}))[r.j.id] = C; persist(); try { await codesPublish(); } catch(e){}
      memberShow(C, label);
    } catch(e){ alert(RF('Code compagnon impossible à créer : {0}', e.message)); }
  }
  function memberShow(C, label){
    openSheet(`<h2>👥 ${MSGT('Code compagnon')}</h2><div class="v-sum-small" style="margin-bottom:8px">${label ? `<b data-notr>${esc(label)}</b> · ` : ''}${MSGT('Il ouvre ton carnet : voir, ajouter, modifier. Pas d’effacement, pas de gestion des accès. Tu peux le retirer quand tu veux.')}</div>
      <div class="cv-qrcode" style="display:flex;justify-content:center;margin:8px 0">${qrSVG(C)}</div>
      <div class="cv-row" style="justify-content:center"><b class="cv-code" data-notr>${esc(C)}</b></div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.memberSend('${ja(C)}')">📤 ${MSGT('Envoyer l’invitation')}</button><button type="button" class="v-btn sec" onclick="CV.cloudSheet()">${MSGT('Fermer')}</button></div>`);
  }
  async function memberSend(C){
    const url = M.sync.url || (/^https?:/.test(location.protocol) ? location.origin + location.pathname : '');
    const text = RF('Rejoins mon carnet Vezoria en compagnon 🧳\n{0}\nCode compagnon : {1}\n(☁️ Cloud → « Tu as déjà un code ? » → colle le code)', url, C);
    if(navigator.share){ try { await navigator.share({title:'Vezoria', text}); return; } catch(e){ return; } }
    try { await navigator.clipboard.writeText(text); toast('📋 ' + MSGT('Invitation copiée')); } catch(e){ await uiPrompt(MSGT('Copie ce texte :'), text); }
  }
  async function memberListLoad(){
    const el = document.getElementById('cv-mem'); if(!el || !ownerOn()) return;
    try {
      const r = await memberApiCall({a:'list'}, M.sync.code); if(!r.ok) throw new Error(r.j.error || r.status);
      const L = r.j.members || [];
      for(const m of L) if(/^e1:/.test(m.label || '')) { try { m.label = String(await boxOpen(await ownerKey(), m.label.slice(3))); } catch(e){ m.label = '👤'; } }
      el.innerHTML = L.length ? L.map(m=>`<div class="cv-cl-t"><span><b data-notr>${esc(m.label || '👤')}</b><small>${m.last ? MSGT('vu') + ' ' + vzWhen(m.last) : MSGT('pas encore utilisé')}</small></span>`
        + `${(M.memLocal || {})[m.id] ? `<button type="button" class="v-btn sec" onclick="CV.memberShowId('${ja(m.id)}','${ja(m.label || '')}')">${MSGT('Code')}</button>` : ''}<button type="button" class="v-btn sec" onclick="CV.memberRevoke('${ja(m.id)}','${ja(m.label || '')}')">${MSGT('Retirer l’accès')}</button></div>`).join('')
        : `<div class="v-sum-small">${MSGT('Aucun compagnon pour l’instant.')}</div>`;
    } catch(e){ el.innerHTML = `<div class="v-sum-small">⚠️ ${esc(e.message || String(e))}</div>`; }
  }
  function memberShowId(id, label){ const C = (M.memLocal || {})[id]; if(C) memberShow(C, label); }
  async function memberRevoke(id, label){
    if(!(await uiConfirm(RF('Retirer l’accès de {0} ?\n\nSon appli ne pourra plus synchroniser ton carnet. Ce qu’il a déjà vu reste sur son téléphone.', label || MSGT('ce compagnon'))))) return;
    try { const r = await memberApiCall({a:'revoke', id}, M.sync.code); if(!r.ok) throw new Error(r.j.error || r.status);
      if(M.memLocal) delete M.memLocal[id]; persist(); toast('🚫 ' + MSGT('Accès retiré')); memberListLoad(); } catch(e){ alert(e.message); }
  }
  // ── 📱 ajouter un de MES appareils : le code administrateur en QR code (jamais à donner à quelqu’un d’autre) ──
  function deviceAdd(){
    if(!ownerOn()) return;
    openSheet(`<h2>📱 ${MSGT('Ajouter un de mes appareils')}</h2><div class="v-sum-small" style="margin-bottom:8px">${MSGT('Sur ton autre téléphone ou ton ordinateur (appli installée) : ☁️ Cloud → « Tu as déjà un code ? » → 📷 Scanner. Tout ton carnet arrive, avec tes voyages partagés et suivis.')}</div>
      <div style="display:flex;justify-content:center;margin:8px 0">${qrSVG(M.sync.code)}</div>
      <div class="cv-row" style="justify-content:center"><b class="cv-code" data-notr>${esc(M.sync.code)}</b></div>
      <div class="v-sum-small" style="margin-top:8px">⚠️ ${MSGT('C’est ton code administrateur : il donne tous les droits. Ne le donne à personne. Pour un compagnon, crée plutôt un code compagnon.')}</div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.cloudSheet()">${MSGT('Fermer')}</button></div>`);
  }

  /* ══════════ 🫙 Place photos du carnet · 🌿 voyages branchés · 🎁 code cadeau · 💳 formules ══════════
     • Un carnet (code administrateur) = un seul pot de photos. Les voyages partagés, paquets et publications créés
       depuis ce carnet ont leur propre code, mais sont « branchés » dessus : leurs photos (celles des compagnons aussi)
       comptent dans la place de MON carnet. Le serveur n’additionne que des tailles de fichiers chiffrés.
     • Place dépassée (fin d’abonnement…) : plus de nouvel envoi, tout reste visible 6 mois ; ensuite le serveur garde
       les photos les plus récentes dans la place permise. L’appli prévient à temps (Sauvegarde ZIP).
     • Abonnements : prêts mais fermés tant que le serveur ne les ouvre pas (PAY_ON). Jamais de paiement web dans l’appli Android. */
  const planApi = () => { const u = apiUrl(); return u ? u.replace(/\/sync$/, '/plan') : ''; };
  async function planCall(body, code){
    const r = await fetch(planApi(), {method:'POST', headers:{'Content-Type':'application/json', 'X-Carnet-Code':await authCode(code)}, body:JSON.stringify(body)});
    let j = {}; try { j = await r.json(); } catch(e){}
    return {ok:r.ok, status:r.status, j};
  }
  // ☁️ / 📱 les deux choix côte à côte : ce que chacun apporte, d’un coup d’œil
  function cloudCompare(){
    const free = fmtB((M.quota && M.quota.free) || 7e8), Y = '✅', N = '—';
    const rows = [[MSGT('Photos'), RF('{0} offerts', free), '∞ ' + MSGT('sans limite')], [MSGT('Sur nos serveurs'), MSGT('chiffré'), N + ' ' + MSGT('rien')],
      [MSGT('Tous tes appareils'), Y, N], [MSGT('Compagnons'), Y + ' ' + MSGT('en direct'), '📦 ' + MSGT('par paquets')], [MSGT('Abonnés'), Y, N], [MSGT('Notifications entre amis'), Y, N], [MSGT('Sauvegarde'), MSGT('automatique'), '💾 ZIP']];
    return `<details class="cv-cmp"><summary>⚖️ ${MSGT('Comparer cloud et hors ligne')}</summary><table><thead><tr><th></th><th>☁️ ${MSGT('Cloud')}</th><th>📱 ${MSGT('Hors ligne')}</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table></details>`;
  }
  const PH_B = 466000;   // repère d’affichage : 700 Mo ≈ 1 500 photos (une photo ≈ 285 Ko + sa vignette, avec de la marge)
  const fmtB = b => b >= 1e9 ? String(Math.round(b / 1e8) / 10).replace('.', ',') + ' Go' : Math.max(0, Math.round(b / 1e6)) + ' Mo';
  const phN = b => { const n = Math.max(0, Math.floor(b / PH_B)); return (n >= 1000 ? Math.floor(n / 100) * 100 : n).toLocaleString((window.I18N && I18N.locale) || 'fr-FR'); };
  const dLong = ms => new Date(ms).toLocaleDateString((window.I18N && I18N.locale) || 'fr-FR', {day:'numeric', month:'long', year:'numeric'});
  const inPlay = () => { try { return isPlay(); } catch(e){ return false; } };   // appli Android (Google Play) : jamais de paiement web (règle Google)
  const PRICE = {plus:{year:'7,99 €', month:'0,99 €'}, max:{year:'14,99 €', month:'1,99 €'}};
  // codes que j’ai créés : mes voyages partagés, paquets et publications (jamais un voyage rejoint chez quelqu’un d’autre)
  function myBranchCodes(){
    const main = M.sync.code, my = M.myCodes || {}, out = new Set();
    (M.spaces || []).forEach(x=>{ if(my[x.code]) out.add(x.code); });
    Object.entries(TS()).forEach(([tid, c])=>{ const t = R[tid]; if(t && t.type === 'trip' && !t.demo && tripAdmin(t) === M.me) out.add(c); });
    Object.values(FT()).forEach(c=>out.add(c)); Object.keys(PACKS()).forEach(c=>out.add(c)); if(M.feedAll) out.add(M.feedAll);
    return [...out].filter(c=>c && c !== main && !/^M:/.test(c) && spaceObj(c));
  }
  /* 👑 l’admin d’un voyage partagé = son créateur, ou le compagnon à qui il l’a passé en partant (adminBy) : ses photos comptent chez lui */
  const tripAdmin = t => t ? (t.adminBy || t.createdBy || '') : '';
  function adminNext(tid){
    const t = R[tid]; if(!t) return []; const act = new Set(mbOthers(tid).map(m=>m.pid).filter(Boolean));
    const v = (t.voyageurs || []).filter(p=>p && p !== M.me && prof(p)); return [...v.filter(p=>act.has(p)), ...v.filter(p=>!act.has(p))];
  }
  async function adminRelease(code){
    try { if(ownerOn() && planApi()) await planCall({a:'unlink', kids:[await authCode(code)]}, M.sync.code); } catch(e){}
    if(M.linked) delete M.linked[code]; if(M.quota) M.quota.at = 0; persist();
  }
  let brBusy = false;
  async function branchSync(){
    try { const N = M.admNote || (M.admNote = {});   // on vient de me passer un voyage : je le dis une fois
      Object.entries(TS()).forEach(([tid, c])=>{ const t = R[tid]; if(!t || t.type !== 'trip' || N[tid] || t.adminBy !== M.me || t.createdBy === M.me || !spaceObj(c)) return;
        N[tid] = 1; persist(); toast('👑 ' + RF(ownerOn() ? 'Tu es maintenant l’admin du voyage « {0} » : ses photos comptent dans ta place.' : 'Tu es maintenant l’admin du voyage « {0} ». Mets ton carnet dans le cloud pour que ses photos comptent chez toi.', t.titre || '')); }); } catch(e){}
    if(brBusy || !ownerOn() || !planApi()) return 0;
    const L = M.linked || (M.linked = {}), T = M.linkTry || (M.linkTry = {}), now = Date.now();
    const todo = myBranchCodes().filter(c=>!L[c] && !(T[c] && now - T[c] < 6 * 3600e3)).slice(0, 40); if(!todo.length) return 0;   // déjà branché ailleurs : on réessaie dans 6 h (voyage qu’on vient de me passer)
    brBusy = true;
    try {
      const kids = []; for(const c of todo) kids.push(await authCode(c));
      const r = await planCall({a:'link', kids}, M.sync.code);
      if(r.ok){ const res = r.j.res || {}; todo.forEach((c, i)=>{ const v = res[kids[i].slice(0, 12)]; if(v === 'ok' || v === 'self' || !r.j.res){ L[c] = now; delete T[c]; } else T[c] = now; }); if(M.quota) M.quota.at = 0; persist(); return todo.length; }
    } catch(e){} finally { brBusy = false; }
    return 0;
  }
  async function quotaLoad(force){
    const code = M.sync.on && M.sync.code ? M.sync.code : ''; if(!code || !planApi() || !memberOk()) return null;
    const ttl = M.quota && M.quota.used >= M.quota.quota * 0.9 ? 120000 : 6 * 3600e3;   // presque plein : relu toutes les 2 min (un cadeau ou un paiement compte tout de suite)
    if(!force && M.quota && Date.now() - (M.quota.at || 0) < ttl) return M.quota;
    try { const r = await planCall({a:'status'}, code); if(r.ok){ M.quota = Object.assign({}, r.j, {at:Date.now()}); persist(); quotaPaint(); } } catch(e){}
    return M.quota;
  }
  const planName = q => q && q.active ? ({plus:'Plus', max:'Max', unlimited:MSGT('Illimité')}[q.plan] || q.plan) : MSGT('Gratuit');
  function quotaBox(){
    const q = M.quota;
    if(!q) return `<div class="sy-r" id="cv-quota"><b>📦 ${MSGT('Place photos')}</b><small>…</small></div>`;
    const unl = q.active && q.plan === 'unlimited', pct = unl ? 4 : Math.min(100, Math.round(q.used / Math.max(1, q.quota) * 100)), over = q.used > q.quota;
    const pay = q.pay && !inPlay() && q.owner;
    let h = `<div class="sy-r cv-quota${over ? ' over' : pct >= 90 ? ' near' : ''}" id="cv-quota"><b>📦 ${MSGT('Place photos')} · ${esc(planName(q))}</b>
      <div class="cv-qbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${Math.max(2, pct)}%"></i></div>
      <small>${unl ? RF('{0} utilisés · sans limite', fmtB(q.used)) : RF('{0} utilisés sur {1}', fmtB(q.used), fmtB(q.quota)) + (over ? '' : ' · ' + RF('≈ {0} photos encore possibles', phN(q.quota - q.used)))}${q.active && q.until ? ' · ' + RF('jusqu’au {0}', dLong(q.until)) : ''}</small>`;
    if(q.branch) h += `<small>${MSGT('Ce carnet est branché sur celui de son créateur : ses photos comptent chez lui.')}</small>`;
    if(over) h += `<div class="cv-qwarn">⚠️ ${q.graceEnd ? RF('Place dépassée : plus de nouvel envoi de photos. Tout reste visible jusqu’au {0}. Ensuite, on garde les photos les plus récentes dans ta place : enregistre les autres chez toi (Sauvegarde ZIP).', dLong(q.graceEnd)) : MSGT('Place dépassée : plus de nouvel envoi de photos.')}</div>`;
    else h += `<small>${MSGT('Tes voyages partagés comptent ici, photos de tes compagnons comprises. Les vignettes comptent à peine. En mode sans cloud, aucune limite : tout reste sur ton téléphone.')}</small>`;
    if(q.owner) h += `<div class="cv-row" style="margin-top:8px;flex-wrap:wrap;gap:6px"><button type="button" class="v-btn sec" style="flex:1;margin:0" onclick="CV.giftAsk()">🎁 ${MSGT('J’ai un code cadeau')}</button>`
      + (pay ? `<button type="button" class="v-btn" style="flex:1;margin:0" onclick="CV.planSheet()">⬆️ ${MSGT('Agrandir ma place')}</button>` : '')
      + (pay && q.src === 'stripe' ? `<button type="button" class="v-btn sec" style="flex:1;margin:0" onclick="CV.planPortal()">${MSGT('Gérer mon abonnement')}</button>` : '') + `</div>`;
    if(over && q.owner) h += `<button type="button" class="v-btn sec" style="margin-top:6px" onclick="CV.close();CV.zipSheet()">💾 ${MSGT('Sauvegarde ZIP')}</button>`;
    if((over || pct >= 90) && q.owner) h += `<button type="button" class="v-btn sec" style="margin-top:6px" onclick="CV.cloudPick('none')">📱 ${MSGT('Passer en hors ligne : aucune limite de photos')}</button>`;
    return h + `</div>`;
  }
  function quotaPaint(){ const el = document.getElementById('cv-quota'); if(el) el.outerHTML = quotaBox(); }
  async function giftAsk(){
    if(!ownerOn()){ alert(MSGT('Il faut d’abord mettre tout ton carnet dans le cloud (☁️ Cloud → « Tout mon carnet »).')); return; }
    const v = await uiPrompt(MSGT('Ton code cadeau'), ''); if(v === null || !String(v).trim()) return;
    try {
      const r = await planCall({a:'redeem', gift:String(v).trim()}, M.sync.code);
      if(!r.ok) throw new Error(r.j.error || ('erreur ' + r.status));
      M.quotaNag = {}; M.pqFull = {}; M.pqErr = ''; toast('🎁 ' + MSGT('Cadeau activé : ta place photos est agrandie')); setTimeout(()=>{ try { uploadQueue(); } catch(e){} }, 500); await quotaLoad(true); cloudSheet();
    } catch(e){ alert(e.message); }
  }
  function planSheet(){
    const q = M.quota || {}, P = q.plans || {};
    const row = (p, per) => `<button type="button" class="cv-choice" onclick="CV.planBuy('${ja(p)}','${ja(per)}')"><i>${p === 'max' ? '🚀' : '➕'}</i><span><b>${p === 'max' ? 'Max' : 'Plus'} · ${fmtB(P[p] || 0)} · ${PRICE[p][per]} ${per === 'year' ? MSGT('par an') : MSGT('par mois')}</b><small>${RF('≈ {0} photos', phN(P[p] || 0))}</small></span></button>`;
    openSheet(`<h2>⬆️ ${MSGT('Agrandir ma place photos')}</h2>
      <div class="v-sum-small" style="margin-bottom:10px">${MSGT('Pour tout ton carnet, voyages partagés compris : tes compagnons en profitent aussi. Sans engagement : à l’arrêt, tout reste visible 6 mois.')}</div>
      ${row('plus', 'year')}${row('max', 'year')}${row('plus', 'month')}${row('max', 'month')}
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.cloudSheet()">${MSGT('Fermer')}</button></div>`);
  }
  async function planBuy(plan, period){
    try { const r = await planCall({a:'checkout', plan, period, back:location.href}, M.sync.code); if(!r.ok || !r.j.url) throw new Error(r.j.error || ('erreur ' + r.status)); location.href = r.j.url; }
    catch(e){ alert(e.message); }
  }
  async function planPortal(){
    try { const r = await planCall({a:'portal', back:location.href}, M.sync.code); if(!r.ok || !r.j.url) throw new Error(r.j.error || ('erreur ' + r.status)); location.href = r.j.url; }
    catch(e){ alert(e.message); }
  }
  // retour du paiement : #abonnement=ok
  setTimeout(()=>{ try { const m = /abonnement=(ok|annule)/.exec(location.hash); if(!m) return; history.replaceState(null, '', location.pathname + location.search);
    if(m[1] === 'ok'){ toast('✅ ' + MSGT('Merci ! Ta place photos est agrandie.')); setTimeout(()=>{ quotaLoad(true).then(()=>{ try { cloudSheet(); } catch(e){} }); }, 2500); } } catch(e){} }, 1500);
  /* ⚠️ prévenir : carnet presque plein (une fois par mois), place dépassée (au début, 30 jours et 7 jours avant l’effacement) */
  function quotaNag(){
    const q = M.quota; if(!q || !q.owner || document.getElementById('v-sheet-bg') || document.getElementById('cv-moment')) return false;
    const now = Date.now(), N = M.quotaNag || (M.quotaNag = {});
    if(q.used > q.quota && q.graceEnd){
      const left = q.graceEnd - now, st = left <= 7 * 864e5 ? 3 : left <= 30 * 864e5 ? 2 : 1;
      if(N.s === q.overSince && (N.st || 0) >= st) return false;
      N.s = q.overSince; N.st = st; persist();
      momentShow(`<div class="mo-k">${MSGT('Place photos')}</div><div class="mo-big">📦</div><h2>${st === 1 ? MSGT('Ta place photos est dépassée') : RF('Plus que {0} jours pour enregistrer tes photos', Math.max(1, Math.ceil(left / 864e5)))}</h2>
        <div class="mo-sub">${RF('Tes photos restent toutes visibles jusqu’au {0}, mais tu ne peux plus en envoyer de nouvelles. Après cette date, on garde les photos les plus récentes dans ta place ({1}) et les plus anciennes sont effacées du serveur.', dLong(q.graceEnd), fmtB(q.quota))}<br><br>${MSGT('Enregistre-les dès maintenant sur ton téléphone ou ton ordinateur (Sauvegarde ZIP).')}</div>
        <div class="mo-b"><button type="button" class="pri" onclick="CV.momentClose();CV.zipSheet()">💾 ${MSGT('Sauvegarde ZIP')}</button>${q.pay && !inPlay() ? `<button type="button" onclick="CV.momentClose();CV.planSheet()">⬆️ ${MSGT('Agrandir ma place')}</button>` : ''}<button type="button" onclick="CV.momentClose();CV.cloudSheet('choose')">📱 ${MSGT('Hors ligne, sans limite')}</button><button type="button" onclick="CV.momentClose()">${MSGT('Plus tard')}</button></div>`, 'eve');
      return true;
    }
    if(!(q.active && q.plan === 'unlimited') && q.used >= q.quota * 0.9 && q.used <= q.quota && now - (N.near || 0) > 30 * 864e5){
      N.near = now; persist();
      momentShow(`<div class="mo-k">${MSGT('Place photos')}</div><div class="mo-big">📦</div><h2>${MSGT('Ton carnet est presque plein')}</h2>
        <div class="mo-sub">${RF('{0} utilisés sur {1}.', fmtB(q.used), fmtB(q.quota))} ${MSGT('Une fois plein, tes nouvelles photos restent sur ton téléphone sans partir dans le cloud.')}</div>
        <div class="mo-b">${q.pay && !inPlay() ? `<button type="button" class="pri" onclick="CV.momentClose();CV.planSheet()">⬆️ ${MSGT('Agrandir ma place')}</button>` : ''}<button type="button" onclick="CV.momentClose();CV.cloudSheet()">☁️ ${MSGT('Voir ma place')}</button><button type="button" onclick="CV.momentClose();CV.cloudSheet('choose')">📱 ${MSGT('Hors ligne, sans limite')}</button><button type="button" onclick="CV.momentClose()">${MSGT('Plus tard')}</button></div>`, 'eve');
      return true;
    }
    return false;
  }
  /* 🔁 le cloud « voyage par voyage » n’existe plus : une fois, on propose de passer à « tout mon carnet » (ses voyages en ligne s’y branchent) */
  async function cloudTripsMigrate(){
    if(M.cloud !== 'trips' || M.migTrips || (M.sync.on && M.sync.code) || !memberOk()) return false;
    if(document.getElementById('v-sheet-bg') || document.getElementById('cv-moment') || document.querySelector('.ui-dlg')) return false;
    M.migTrips = Date.now(); persist();
    if(!(await uiConfirm(MSGT('☁️ Le cloud change : c’est maintenant tout ton carnet ou rien.\n\nTes voyages déjà en ligne restent en ligne. En mettant tout ton carnet dans le cloud, ils s’y rattachent et tu reçois ton code administrateur pour retrouver tout ton compte sur un autre appareil.\n\nOK = mettre tout mon carnet dans le cloud (chiffré).\nAnnuler = garder comme maintenant.')))) return true;
    await syncOn(genCode()); if(M.sync.on && M.sync.code){ M.cloud = 'all'; persist(); refresh(); }
    return true;
  }
  // inviter dans un voyage demande que le carnet soit dans le cloud (le voyage s’y branche, ses photos y comptent)
  async function cloudNeedAll(){
    if(M.sync.on && M.sync.code) return true;
    if(!memberOk()) return true;   // version test ouverte depuis un carnet : comme avant
    if(!(await uiConfirm(MSGT('Pour inviter quelqu’un, ton carnet doit être dans le cloud (chiffré : personne d’autre ne peut le lire).\n\nLe voyage partagé s’y rattache et ses photos, celles de tes compagnons aussi, comptent dans ta place.\n\nOK = mettre mon carnet dans le cloud.\nAnnuler = envoyer plutôt un paquet chiffré.')))){ pkgSheet(); return false; }
    syncOn.quiet = true; try { await syncOn(genCode()); } finally { syncOn.quiet = false; }
    if(!(M.sync.on && M.sync.code)) return false;
    M.cloud = 'all'; persist(); toast('☁️ ' + MSGT('Ton carnet est dans le cloud. Ton code administrateur est dans ☁️ Cloud.'));
    return true;
  }

  /* ══════════ 🧳 Programme par étapes : une carte par ville, les trajets entre deux, et « Réorganiser » (glisser + nuits) ══════════ */
  const STO = {};   // étape ouverte, par voyage
  function progStOn(ds){ const t = trip(); return !!(t && M.progV !== 'jours' && (ds || dayList()).length > 1 && tlStages().length >= 1); }
  function progV(v){ M.progV = v; persist(); const y = window.scrollY; render(); window.scrollTo(0, y); }
  function progViewBar(ds){
    const t = trip(); if(!t || !tlStages().length || (ds || []).length < 2) return ''; const on = progStOn(ds);
    return `<div class="etp-vbar" role="tablist"><button type="button" role="tab" aria-selected="${on}" class="${on ? 'on' : ''}" onclick="CV.progV('etapes')">🧳 ${MSGT('Étapes')}</button><button type="button" role="tab" aria-selected="${!on}" class="${on ? '' : 'on'}" onclick="CV.progV('jours')">📅 ${MSGT('Jours')}</button><button type="button" onclick="CV.tlMap()">🗺️ ${MSGT('Carte')}</button></div>`;
  }
  function stRanges(){ const st = tlStages(); return st.map((x, i)=>({city:x.city, h:x.h, debut:x.debut, fin:x.fin, end:st[i + 1] ? st[i + 1].debut : x.fin})); }
  function stChipTxt(d, city){
    const info = dayInfo(d), same = x => city && normQ(String(x || '').replace(/\(.*?\)/g, '').trim()) === normQ(city); if(info.titre && !same(info.titre)) return info.titre; const p = String(info.plan || '').split('\n')[0].trim(); if(p && !same(p)) return p.slice(0, 40);
    const {own} = itemsForDay(d), a = own.find(i=>i.cat !== 'hotel' && i.cat !== 'divers'); if(a && !same(a.titre)) return a.titre || '';
    const pl = placesOf(d)[0]; return pl && !same(pl.nom) ? pl.nom || '' : '';
  }
  function progStages(ds){
    if(!progStOn(ds)) return ''; const t = trip(), S = stRanges(), live = tripPhase(t) === 'live', td = isoToday();
    const canE = !t.archived && !M.lock, idxOf = d => ds.indexOf(d) + 1;
    let op = STO[t.id]; if(op === undefined && live){ const c = S.find(x=>td >= x.debut && td < x.end); op = c ? c.h.id : ''; }
    const inSt = d => S.some(x=>d >= x.debut && d < x.end);
    const loose = L => L.map(d=>dayHTML(d, ds.indexOf(d))).join('');
    let h = loose(ds.filter(d=>d < S[0].debut)); const trSeen = new Set();
    S.forEach((x, i)=>{
      const days = ds.filter(d=>d >= x.debut && d < x.end), n = nights(x.debut, x.end), open = op === x.h.id;
      const hs = items(it=>it.cat === 'hotel' && it.date && it.date >= x.debut && it.date < x.end), bk = hs.length && hs.every(okB), pd = bk && hs.every(it=>it.statut === 'paid');
      const hl = bk ? (hs.map(it=>it.nom).filter(Boolean).join(' · ') || MSGT('Hébergement réservé')) : MSGT('Hébergement à réserver');
      let chips = ''; if(!open){
        const C = []; let free = [];
        const flush = () => { if(!free.length) return; C.push(`<span class="etp-chip free">${free.length === days.length && days.length > 1 ? RF('{0} jours libres', free.length) : free.length > 1 ? `${PJ(idxOf(free[0]))}–${idxOf(free[free.length - 1])} ${MSGT('libres')}` : `${PJ(idxOf(free[0]))} ${MSGT('libre')}`}</span>`); free = []; };
        days.forEach(d=>{ const c = stChipTxt(d, x.city); if(c){ flush(); C.push(`<span class="etp-chip">${PJ(idxOf(d))} <span data-notr>${esc(c)}</span></span>`); } else free.push(d); }); flush();
        const nFree = days.filter(d=>!stChipTxt(d, x.city)).length;
        chips = `<div class="etp-chips">${C.slice(0, 5).join('')}${C.length > 5 ? `<span class="etp-chip free">+${C.length - 5}</span>` : ''}${canE && n >= 5 && nFree >= 4 ? `<button type="button" class="etp-chip tip" onclick="event.stopPropagation();CV.ariCity()">💡 ${MSGT('C’est long : ajouter une ville ?')}</button>` : ''}</div>`;
      }
      h += `<div class="etp-card${open ? ' open' : ''}" id="etp-${x.h.id}">
        <button type="button" class="etp-h" onclick="CV.stTog('${ja(x.h.id)}')" aria-expanded="${open}"><span class="etp-c" data-notr>${esc(x.city)}</span><span class="etp-n">${n} ${MSGT(n > 1 ? 'nuits' : 'nuit')}</span>
          <span class="etp-d">${fshort(x.debut)} → ${fshort(x.end)} · <i class="etp-dot${pd ? ' ok' : bk ? ' bk' : ''}" title="${esc(MSGT(pd ? 'Payé' : bk ? 'Réservé' : 'À réserver'))}"></i><span data-notr>${esc(hl)}</span></span><em aria-hidden="true">${open ? '▴' : '▾'}</em></button>
        ${open ? `<div class="etp-b">${hs.map(it=>`<button type="button" class="etp-hotel" onclick="CV.edit('${ja(it.id)}')"><i>🛏️</i><span><b data-notr>${esc(it.nom || cityOf(it.titre) || it.titre)}</b><small>${MSGT(it.statut === 'paid' ? 'Payé' : okB(it) ? 'Réservé' : 'À réserver')} · ${fshort(it.date)} → ${fshort(it.dateFin || it.date)}</small></span><em>›</em></button>`).join('')}${(()=>{ DAY_NOCITY = x.city; try { return loose(days); } finally { DAY_NOCITY = false; } })()}</div>` : chips}</div>`;
      const nx = S[i + 1]; if(nx){
        const lo = x.fin > x.debut ? x.fin : addD(x.debut, 1);   // hôtel sans date de fin (ou fin avant l’arrivée) : on ne remonte pas à tout le voyage
        const tr = items(it=>it.cat === 'transport' && it.date && it.date >= lo && it.date <= nx.debut && !trSeen.has(it.id)).sort((a, b)=>(a.date + (a.heureDep || '')).localeCompare(b.date + (b.heureDep || ''))); tr.forEach(it=>trSeen.add(it.id));
        h += `<div class="etp-link">${tr.length ? tr.map(it=>`<button type="button" onclick="CV.edit('${ja(it.id)}')">${icon(it)} <span data-notr>${esc(it.from && it.to ? cityOf(it.from) + ' → ' + cityOf(it.to) : it.titre)}</span> · ${fshort(it.date)}${it.heureDep ? ' ' + esc(it.heureDep) : ''}<b class="${it.statut === 'paid' ? 'ok' : okB(it) ? 'bk' : ''}">${MSGT(it.statut === 'paid' ? 'payé' : okB(it) ? 'réservé' : 'à réserver')}</b></button>`).join('')
          : `<span>↓ <span data-notr>${esc(x.city)} → ${esc(nx.city)}</span> · ${fshort(nx.debut)}</span>`}</div>`;
      }
    });
    h += loose(ds.filter(d=>!inSt(d) && d >= S[0].debut));
    let trBad = 0; try { trBad = canE ? trChain(true).length : 0; } catch(e){}
    if(trBad) h += `<button type="button" class="etp-fix" onclick="CV.trFix()">🔧 ${RF('{0} trajet(s) pas dans l’ordre des étapes : les remettre', trBad)}</button>`;
    if(canE) h += `<div class="etp-foot">${S.length > 1 ? `<button type="button" class="etp-reorg" onclick="CV.soOpen()">⇅ ${MSGT('Réorganiser les étapes')}</button>` : ''}<button type="button" class="etp-add" onclick="CV.ariCity()">＋ ${MSGT('Ajouter une ville')}</button></div>`;
    return h;
  }
  function stTog(id){ const t = trip(); if(!t) return; STO[t.id] = STO[t.id] === id ? '' : id; renderProg();
    setTimeout(()=>{ const e = document.getElementById('etp-' + id); if(e){ const r = e.getBoundingClientRect(); if(r.top < 70 || r.top > innerHeight * .6) window.scrollTo({top: window.scrollY + r.top - 80, behavior:'smooth'}); } }, 30); }

  /* 🚆 Les trajets suivent l’ordre des étapes : aller (maison → 1ʳᵉ ville), un trajet entre chaque étape, retour (dernière ville → maison).
     Un trajet réservé n’est jamais modifié ; un trajet devenu inutile (pas réservé, sans prix) est retiré. */
  function trChain(dry){
    const t = trip(); if(!t) return []; const S = stRanges(); if(!S.length) return [];
    const K = x => normQ(cityOf(String(x || '').replace(/\(.*?\)/g, '')).trim()), cities = new Set(S.map(x=>K(x.city))), isC = x => cities.has(K(x));
    const T = items(i=>i.cat === 'transport'), out = [], used = new Set(), end = S[S.length - 1].end;
    const set = (it, o) => { if(okB(it)) { used.add(it.id); return; } const c = Object.assign(clone(it), o); if(['date', 'from', 'to', 'titre'].some(k=>(c[k] || '') !== (it[k] || ''))) out.push(c); used.add(it.id); };
    // l’aller : le 1ᵉʳ trajet qui arrive d’ailleurs (pas « Naples → Malte » au milieu du voyage)
    const cand = T.filter(i=>i.from && !isC(i.from) && isC(i.to)), d0 = cand.reduce((m, i)=>!m || (i.date || '9') < m ? (i.date || '9') : m, ''), outs = cand.filter(i=>(i.date || '9') === d0), homes = new Set(outs.map(i=>K(i.from)));
    const rets = T.filter(i=>!outs.includes(i) && isC(i.from) && i.to && !isC(i.to) && homes.has(K(i.to)));
    outs.forEach(i=>set(i, {to:S[0].city, titre:i.from + ' → ' + S[0].city, date:S[0].debut}));
    rets.forEach(i=>set(i, {from:S[S.length - 1].city, titre:S[S.length - 1].city + ' → ' + i.to, date:end}));
    const mid = T.filter(i=>!used.has(i.id) && isC(i.from) && isC(i.to) && K(i.from) !== K(i.to)), todo = [];
    for(let k = 0; k + 1 < S.length; k++){ const a = S[k], b = S[k + 1], it = mid.find(i=>!used.has(i.id) && K(i.from) === K(a.city) && K(i.to) === K(b.city));
      if(it) set(it, {date:b.debut}); else todo.push([a, b, k]); }
    todo.forEach(([a, b, k])=>{   // étapes déplacées : on reprend un trajet devenu orphelin (pas réservé), sinon on en crée un, sauf si un autre chemin y mène déjà
      const orph = mid.filter(i=>!used.has(i.id) && !okB(i)), it = orph.find(i=>K(i.to) === K(b.city)) || orph.find(i=>K(i.from) === K(a.city)) || orph[0];
      if(it) set(it, {from:a.city, to:b.city, titre:a.city + ' → ' + b.city, date:b.debut});
      else if(!T.some(i=>!mid.includes(i) && !outs.includes(i) && !rets.includes(i) && K(i.to) === K(b.city))) out.push({id:'i' + uid() + 'tc' + k, type:'item', trip:t.id, cat:'transport', mode:'Train', titre:a.city + ' → ' + b.city, from:a.city, to:b.city, date:b.debut, statut:'todo', partage:'pp', qui:[]}); });
    mid.filter(i=>!used.has(i.id) && !okB(i) && !num(i.prix) && !num(i.estime)).forEach(i=>{ const c = clone(i); c.deleted = true; out.push(c); });
    if(!dry && out.length) putQuiet(out);
    return out;
  }
  function trFix(){ const n = trChain().length; toast(n ? '🚆 ' + RF('{0} trajet(s) remis dans l’ordre des étapes', n) : '✓ ' + MSGT('Les trajets sont déjà dans l’ordre')); const y = window.scrollY; render(); window.scrollTo(0, y); }

  /* ⇅ Réorganiser : on glisse les villes, on change les nuits ; à l’enregistrement, tout suit (hôtels, trajets, visites, journées, notes) */
  let SO = null;
  function soOpen(){ const t = trip(); if(!t || t.archived || M.lock) return; const B = soBuild(t); if(!B) return; SO = B; soDraw(); }
  function soBuild(t){
    const S = stRanges(); if(!S.length) return null;
    return {tid:t.id, start:S[0].debut, oldEnd:S[S.length - 1].end, L:S.map((x, i)=>{ const span = Math.max(1, nights(x.debut, x.end));
      const hs = items(it=>it.cat === 'hotel' && it.date && it.date >= x.debut && it.date < x.end).sort((a, b)=>a.date.localeCompare(b.date));
      return {k:i, city:x.city, d0:x.debut, e0:x.end, span0:span, span, g:Math.max(0, span - (x.fin > x.debut ? nights(x.debut, x.fin) : span)), hids:hs.map(h=>h.id), bk:hs.some(okB)}; })};
  }
  function soPlan(){ let c = SO.start; return SO.L.map(x=>{ const d = c; c = addD(c, x.span); return {x, d, e:c}; }); }
  function soDraw(){
    if(!SO) return; const P = soPlan(), tot0 = SO.L.reduce((a, x)=>a + x.span0, 0), tot = SO.L.reduce((a, x)=>a + x.span, 0), moved = SO.L.some((x, i)=>x.k !== i);
    const warn = P.filter(p=>p.x.bk && (p.d !== p.x.d0 || p.x.span !== p.x.span0)).map(p=>p.x.city);
    const html = `<h2>⇅ ${esc(MSGT('Réorganiser les étapes'))}</h2><div class="v-sum-small" style="margin-bottom:10px">${esc(MSGT('Glisse une ville par ⋮⋮ pour changer l’ordre. Les dates, les trajets et les jours suivent tout seuls.'))}</div>
      <div class="so-list" id="so-list">${P.map((p, i)=>`<div class="so-row" data-i="${i}"><span class="so-hd" aria-label="${esc(MSGT('Déplacer'))}" data-i="${i}">⋮⋮</span>
        <span class="so-c"><b data-notr>${esc(p.x.city)}</b><small>${fshort(p.d)} → ${fshort(p.e)}${p.d !== p.x.d0 ? ' ·' + ' <i>' + esc(MSGT('nouvelles dates')) + '</i>' : ''}</small></span>
        <span class="so-ud"><button type="button" aria-label="${esc(MSGT('Monter'))}" onclick="CV.soMove(${i},-1)"${i ? '' : ' disabled'}>▲</button><button type="button" aria-label="${esc(MSGT('Descendre'))}" onclick="CV.soMove(${i},1)"${i < P.length - 1 ? '' : ' disabled'}>▼</button></span>
        <span class="so-st"><button type="button" aria-label="${esc(MSGT('Une nuit de moins'))}" onclick="CV.soN(${i},-1)"${p.x.span > 1 ? '' : ' disabled'}>−</button><b>${p.x.span}&nbsp;${esc(MSGT(p.x.span > 1 ? 'nuits' : 'nuit'))}</b><button type="button" aria-label="${esc(MSGT('Une nuit de plus'))}" onclick="CV.soN(${i},1)">＋</button></span></div>`).join('')}</div>
      <div class="so-note${tot !== tot0 ? ' ch' : ''}">${tot === tot0 ? esc(RF('Total : {0} nuits, comme avant.', tot)) : esc(RF('Total : {0} nuits ({1}). Le retour passe au {2}.', tot, (tot > tot0 ? '+' : '') + (tot - tot0), fdate(addD(SO.oldEnd, tot - tot0))))}</div>
      ${moved ? `<div class="so-warn">🚆 ${esc(MSGT('L’ordre change : vérifie ensuite les trajets entre les villes.'))}</div>` : ''}
      ${warn.length ? `<div class="so-warn">🛏️ ${esc(RF('Déjà réservé à {0} : pense à modifier ta réservation.', warn.join(', ')))}</div>` : ''}
      <button type="button" class="so-auto" onclick="CV.soAuto()" id="so-auto"${SO.L.length > 2 ? '' : ' disabled'}>🧭 ${esc(MSGT('Ordre le plus court automatiquement'))}</button>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.soSave()">✓ ${esc(MSGT('Enregistrer'))}</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`;
    openSheet(html); soDrag();
  }
  function soMove(i, d){ if(!SO) return; const j = i + d; if(j < 0 || j >= SO.L.length) return; const L = SO.L; [L[i], L[j]] = [L[j], L[i]]; soDraw(); }
  function soN(i, d){ if(!SO) return; const x = SO.L[i]; x.span = Math.max(1, Math.min(90, x.span + d)); if(x.span - x.g < 1) x.span = x.g + 1; soDraw(); }
  function soDrag(){
    const box = document.getElementById('so-list'); if(!box) return;
    box.querySelectorAll('.so-hd').forEach(hd=>{
      hd.addEventListener('pointerdown', e=>{
        e.preventDefault(); e.stopPropagation(); const row = hd.closest('.so-row'), rows = [...box.querySelectorAll('.so-row')], from = +hd.dataset.i;
        const y0 = e.clientY, mids = rows.map(r=>{ const b = r.getBoundingClientRect(); return b.top + b.height / 2; }), hgt = row.getBoundingClientRect().height + 8; let to = from;
        row.classList.add('drag'); try { hd.setPointerCapture(e.pointerId); } catch(x){}
        const mv = ev=>{ const dy = ev.clientY - y0; row.style.transform = `translateY(${dy}px) rotate(-1deg)`; const y = mids[from] + dy;
          to = mids.filter((m, k)=>k !== from && m < y).length; rows.forEach((r, k)=>{ if(k === from) return; const sh = from < to ? (k > from && k <= to ? -hgt : 0) : (k >= to && k < from ? hgt : 0); r.style.transform = sh ? `translateY(${sh}px)` : ''; }); };
        const up = ()=>{ hd.removeEventListener('pointermove', mv); hd.removeEventListener('pointerup', up); hd.removeEventListener('pointercancel', up);
          if(to !== from){ const [x] = SO.L.splice(from, 1); SO.L.splice(to, 0, x); } soDraw(); };
        hd.addEventListener('pointermove', mv); hd.addEventListener('pointerup', up); hd.addEventListener('pointercancel', up);
      });
      hd.addEventListener('touchstart', e=>e.stopPropagation(), {passive:true});
    });
  }
  // 🧭 l’ordre qui fait le moins de kilomètres (la première ville ne bouge pas : c’est souvent là qu’on arrive)
  async function soAuto(){
    if(!SO || SO.L.length < 3) return; const b = document.getElementById('so-auto'); if(b){ b.disabled = true; b.textContent = '🧭 …'; }
    try {
      const co = (M.ctry || {})[normQ(SO.L[0].city)], ctx = co && co.cc && typeof ccName === 'function' ? ccName(co.cc) : '';
      const P = []; for(const x of SO.L){ const c = geoCached(x.city) || await geocode(x.city, ctx); if(!c){ toast('📍 ' + RF('{0} introuvable sur la carte', x.city)); soDraw(); return; } P.push(c); }
      const n = P.length, D = P.map(a=>P.map(c=>km(a, c))), len = o => o.reduce((s, k, i)=>i ? s + D[o[i - 1]][k] : 0, 0);
      let best = [...Array(n).keys()];
      if(n <= 8){ const rest = best.slice(1), perm = (a, l = 0)=>{ if(l === a.length){ const o = [0, ...a]; if(len(o) < len(best) - .5) best = o; return; } for(let i = l; i < a.length; i++){ [a[l], a[i]] = [a[i], a[l]]; perm(a, l + 1); [a[l], a[i]] = [a[i], a[l]]; } }; perm(rest); }
      else { let ok = true; while(ok){ ok = false; for(let i = 1; i < n - 1; i++) for(let j = i + 1; j < n; j++){ const o = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)]; if(len(o) < len(best) - .5){ best = o; ok = true; } } } }
      const before = Math.round(len([...Array(n).keys()])), after = Math.round(len(best));
      SO.L = best.map(k=>SO.L[k]); toast(after < before ? '🧭 ' + RF('{0} km de moins sur la route', before - after) : '🧭 ' + MSGT('Ton ordre est déjà le plus court'));
    } catch(e){ toast('📍 ' + MSGT('Carte indisponible pour l’instant')); }
    soDraw();
  }
  function soSave(msg){
    const t = R[(SO || {}).tid]; if(!SO || !t) return; const P = soPlan(), tot0 = SO.L.reduce((a, x)=>a + x.span0, 0), tot = SO.L.reduce((a, x)=>a + x.span, 0), dl = tot - tot0;
    if(P.every((p, i)=>p.x.k === i && p.x.span === p.x.span0)){ closeSheet(); SO = null; return; }
    const map = x => { if(!x || x < SO.start) return x; const p = P.find(q=>x >= q.x.d0 && x < q.x.e0); if(p) return addD(p.d, Math.min(dDiff(p.x.d0, x), p.x.span - 1)); return x >= SO.oldEnd ? addD(x, dl) : x; };
    const out = [], hset = new Set(SO.L.flatMap(x=>x.hids));
    P.filter(p=>p.x.nw).forEach(p=>out.push({id:'i' + uid(), type:'item', trip:t.id, cat:'hotel', titre:p.x.city, base:p.x.city, date:p.d, dateFin:addD(p.d, p.x.span), statut:'todo', partage:'grp', qui:[]}));   // 📍 la ville ajoutée
    P.forEach(p=>{ const he = addD(p.d, p.x.span - p.x.g);   // fin des nuits d’hôtel de l’étape
      p.x.hids.forEach((id, j)=>{ const h0 = R[id]; if(!h0) return; const h = clone(h0); h.date = map(h0.date); h.dateFin = h0.dateFin ? addD(map(addD(h0.dateFin, -1)), 1) : h.date;
        if(j === p.x.hids.length - 1 && p.x.span !== p.x.span0) h.dateFin = he;
        if(h.date >= he){ if(!okB(h0)){ h.deleted = true; out.push(h); return; } h.date = addD(he, -1); }
        if(h.dateFin > he) h.dateFin = he; out.push(h); }); });
    Object.values(R).filter(r=>r && !r.deleted && r.trip === t.id).forEach(r=>{
      if((r.type === 'item' || r.type === 'place' || r.type === 'city') && r.date && !hset.has(r.id)){ if(r.type === 'item' && r.cat === 'divers' && r.recu) return;
        if(r.type === 'item' && r.cat === 'transport' && r.date === SO.start) return;   // le vol aller reste le premier jour
        const nd = map(r.date), nf = r.dateFin ? map(r.dateFin) : null; if(nd === r.date && nf === (r.dateFin || null)) return; const c = clone(r); c.date = nd; if(nf) c.dateFin = nf; out.push(c); }
      else if(r.type === 'note' && r.ref && r.ref.startsWith('day:')){ const od = r.ref.slice(4), nd = map(od); if(nd !== od){ const c = clone(r); c.ref = 'day:' + nd; out.push(c); } }
    });
    const days = Object.values(R).filter(r=>r && !r.deleted && r.trip === t.id && r.type === 'day'), NW = {};
    days.forEach(r=>{ const nd = map(r.date), id = dayId(nd); const c = NW[id] ? NW[id] : Object.assign(clone(r), {date:nd, id});
      if(NW[id]){ if(!c.titre) c.titre = r.titre; if(r.plan) c.plan = [c.plan, r.plan].filter(Boolean).join('\n'); } delete c.deleted; NW[id] = c; });
    const chg = days.some(r=>map(r.date) !== r.date);
    if(chg){ days.forEach(r=>{ if(!NW[r.id]){ const c = clone(r); c.deleted = true; out.push(c); } }); out.push(...Object.values(NW)); }
    const nt = clone(t); let tc = false; if(nt.fin && nt.fin >= SO.oldEnd && dl){ nt.fin = addD(nt.fin, dl); tc = true; } if(tc) out.push(nt);
    SO = null; putMany(out, msg || '⇅ ' + MSGT('Étapes réorganisées') + (dl ? ' · ' + RF('retour le {0}', fdate(nt.fin)) : '')); closeSheet(true); try { trChain(); } catch(e){} Object.keys(openD).forEach(k=>delete openD[k]); const y = window.scrollY; render(); window.scrollTo(0, y);
  }

  /* ══════════ 💶 Budget pas à pas : ① objectif ② chiffrer ③ sur place ④ payer à temps ══════════ */
  // coût de la vie, par rapport à la France (ordre de grandeur, pour proposer un objectif — tout reste modifiable)
  const BU_IDX = {RO:.5, BG:.5, AL:.5, MK:.5, RS:.55, BA:.5, ME:.6, MD:.45, UA:.45, GE:.5, AM:.5, TR:.55, MA:.5, TN:.5, EG:.45, IN:.35, NP:.35, LK:.4, VN:.4, TH:.5, KH:.4, LA:.4, ID:.45, PH:.5, MY:.5, MX:.6, GT:.55, CO:.5, PE:.5, BO:.4, EC:.55, AR:.55, BR:.6, CU:.6, KE:.6, TZ:.65, ZA:.6, MG:.45, SN:.6, JO:.75, CN:.65, LV:.7, LT:.7, EE:.8, PL:.65, CZ:.75, SK:.7, HU:.7, HR:.85, SI:.85, PT:.8, GR:.8, ES:.85, CY:.85, MT:.85, IT:.95, FR:1, BE:1.05, DE:1, AT:1.05, NL:1.1, LU:1.15, IE:1.15, GB:1.15, SE:1.1, FI:1.1, DK:1.25, NO:1.35, IS:1.45, CH:1.45, US:1.25, CA:1.1, AU:1.1, NZ:1.1, JP:.95, KR:.85, TW:.75, HK:1.1, SG:1.15, AE:1.1, IL:1.2, QA:1.1, MV:1.3, PF:1.4, CR:.85};
  const BU_TIER = [['malin','🎒','Malin','auberges, trains, cuisine locale', 75], ['confort','🏨','Confort','hôtels 3★, quelques visites guidées', 140], ['plaisir','✨','Plaisir','beaux hôtels, bonnes tables', 240]];
  const BU_SP = [['repas','🍽️','Repas', 30], ['transp','🚌','Transports locaux', 5], ['extra','☕','Extras, souvenirs', 10]];
  function buNights(t){ return t.debut ? Math.max(1, nights(t.debut, t.fin || t.debut)) : Math.max(1, dayList().length - 1); }
  function buIdx(){ const S = tlStages(); let w = 0, s = 0; S.forEach(x=>{ const c = ((M.ctry || {})[normQ(x.city)] || {}).cc, n = Math.max(1, nights(x.debut, x.fin)); if(c){ s += (BU_IDX[c] || 1) * n; w += n; } }); return w ? s / w : 1; }
  const buRate = t => (typeof DEMO_FX === 'object' && DEMO_FX[(t && t.devise) || M.cur || 'EUR']) || 1;
  const buNice = x => { if(!x) return 0; const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.abs(x))) - 1)); return Math.round(x / p) * p; };
  function buSp(t){ const o = t.surplace || {}; return BU_SP.reduce((a, [k, , , d])=>a + (o[k] != null ? num(o[k]) : 0), 0); }
  // le sur-place prévu, moins ce qui a déjà été dépensé sur place (pas de double compte pendant le voyage)
  function buSpLeft(t){ if(!t || !t.surplace) return 0; const all = buSp(t) * (dayList().length || buNights(t)) * Math.max(1, tv().length);
    const spent = items(i=>i.cat === 'divers').reduce((s, i)=>s + totalOf(i), 0); return Math.max(0, all - spent); }
  const buHas = i => hasPrix(i) || num(i.estime) > 0;
  const buPlanned = () => items(i=>['hotel', 'transport', 'activite'].includes(i.cat)).sort((a, b)=>(a.date || '9').localeCompare(b.date || '9') || ({transport:0, hotel:1, activite:2}[a.cat] - {transport:0, hotel:1, activite:2}[b.cat]));
  const buNoPrice = () => items(i=>['hotel', 'transport', 'activite'].includes(i.cat) && !hasPrix(i) && !num(i.estime)).sort((a, b)=>(a.date || '9').localeCompare(b.date || '9') || ({transport:0, hotel:1, activite:2}[a.cat] - {transport:0, hotel:1, activite:2}[b.cat]));   // dans l’ordre du voyage : trajet d’arrivée, puis hôtel, puis visites
  const buToPay = () => items(i=>i.statut === 'booked' && totalOf(i) > paidAmount(i) + .5).sort((a, b)=>(buNextEch(a) || {date:a.date || '9'}).date.localeCompare((buNextEch(b) || {date:b.date || '9'}).date));
  const buNextEch = it => (it.echeances || []).filter(e=>!e.fait).sort((a, b)=>(a.date || '9').localeCompare(b.date || '9'))[0];
  function buFil(t){
    if(!t || t.archived || tripPhase(t) !== 'prep' || M.lock) return '';
    const key = 'bu:' + t.id, nN = buNights(t), idx = buIdx(), rate = buRate(t), np = buNoPrice(), pay = buToPay(), todo = items(i=>i.statut === 'todo' && ['hotel', 'transport', 'activite'].includes(i.cat)).length;
    const ppl = Math.max(1, tv().length), spD = t.surplace ? buSp(t) : 0, sp0 = t.surplace || {}, spDraft = M.buSp && M.buSp[t.id] || {};
    const spV = k => spDraft[k] != null ? spDraft[k] : sp0[k] != null ? num(sp0[k]) : Math.round(BU_SP.find(x=>x[0] === k)[3] * Math.max(.4, idx));
    const steps = [
      {k:'obj', ic:'🎯', l:MSGT('Combien veux-tu dépenser ?'), ok: num(t.objectif) > 0 || filSk(key, 'obj'), skip:true, n: num(t.objectif) ? eur(num(t.objectif)) + ' / ' + MSGT('pers.') : '',
        body: ()=>`<div class="ar-p">${RF('Choisis un style de voyage : on calcule pour {0} nuits, par personne, hors vols. Tout reste modifiable.', nN)}</div>
          <div class="bu-tiers">${BU_TIER.map(([k, ic, l, d, per])=>{ const v = buNice(per * idx * nN * rate); return `<button type="button" onclick="CV.buTier(${v})"><i>${ic}</i><span><b>${MSGT(l)}</b><small>${MSGT(d)}</small></span><em>≈ ${eur(v)}<small>/ ${MSGT('pers.')}</small></em></button>`; }).join('')}</div>
          <div class="bu-own"><span>${MSGT('ou mon montant')}</span><input class="v-in" id="bu-obj" inputmode="decimal" placeholder="—" value="${esc(t.objectif || '')}"><button type="button" class="ar-go" onclick="CV.buTier(document.getElementById('bu-obj').value)">OK</button></div>`},
      {k:'prix', ic:'🧾', l:MSGT('Mets un prix sur ce qui est prévu'), ok: !np.length || filSk(key, 'prix'), skip:true, f: (()=>{ const a = items(i=>['hotel', 'transport', 'activite'].includes(i.cat)).length; return a ? 1 - np.length / a : 0; })(), n: np.length ? RF('{0} sans prix', np.length) : '',
        body: ()=>{   // toutes les résas prévues, dans l’ordre du voyage : le prix déjà saisi dans la fiche s’affiche, il se modifie ici ou là-bas
          const all = buPlanned(), tot = all.reduce((x, i)=>x + totalOf(i), 0), L = M.buAll || all.length <= 10 ? all : [...all.filter(i=>!buHas(i)), ...all.filter(buHas)].slice(0, 8);
          return `<div class="ar-p">${np.length ? RF('{0} fiches n’ont pas encore de prix. Un ordre d’idée suffit, tu corrigeras plus tard.', np.length) : MSGT('Tout ce qui est prévu a un prix.')} ${RF('{0} chiffrées sur {1} · {2} au total.', all.length - np.length, all.length, eur(tot))}</div>
          ${L.map(it=>{ const v = hasPrix(it) ? it.prix : it.estime || '', st = it.statut === 'paid' ? '✓ ' + MSGT('Payé') : okB(it) ? MSGT('Réservé') : '';
            return `<div class="bu-np${buHas(it) ? ' ok' : ''}"><i role="button" onclick="CV.edit('${ja(it.id)}')">${it.cat === 'hotel' ? '🛏️' : icon(it)}</i><span role="button" onclick="CV.edit('${ja(it.id)}')"><b data-notr>${esc(it.cat === 'hotel' ? MSGT('Hôtel') + ' · ' + (cityOf(it.titre) || it.titre) : it.titre)}</b><small>${it.cat === 'hotel' ? RF('{0} nuits · prix total du séjour', nights(it.date, it.dateFin || it.date)) : MSGT(partage(it) === 'pp' ? 'par personne' : 'pour le groupe')}${it.date ? ' · ' + fshort(it.date) : ''}${st ? ' · ' + st : ''}${buHas(it) && !hasPrix(it) ? ' · ' + MSGT('estimé') : ''}</small></span><input class="v-in" inputmode="decimal" data-bu="${it.id}" data-k="${hasPrix(it) ? 'prix' : 'estime'}" data-v0="${esc(v)}" value="${esc(String(v).replace('.', ','))}" placeholder="${esc(CS())}"></div>`; }).join('')}
          ${all.length > L.length ? `<button type="button" class="ar-more" onclick="CV.buAll()">＋ ${RF('{0} autre(s)', all.length - L.length)}</button>` : ''}
          <button type="button" class="ar-go" onclick="CV.buPrices()">✓ ${MSGT('Enregistrer ces prix')}</button>
          ${fbtn(`CV.navTo('resas')`, `🎫 ${MSGT('Voir les réservations')}`, 1)}`; }},
      {k:'sp', ic:'🍝', l:MSGT('Prévois le sur-place'), ok: !!t.surplace || filSk(key, 'sp'), skip:true, n: t.surplace ? eur(spD) + ' / ' + MSGT('jour') : '',
        body: ()=>{ const d = BU_SP.reduce((a, [k])=>a + spV(k), 0), days = dayList().length || nN;
          return `<div class="ar-p">${MSGT('Repas, cafés, bus, petits achats : ce qu’on oublie toujours. Par personne et par jour.')}</div>
          ${BU_SP.map(([k, ic, l])=>`<div class="bu-sp"><span>${ic} ${MSGT(l)}</span><span class="so-st"><button type="button" onclick="CV.buSpN('${ja(k)}',-1)" aria-label="${esc(MSGT('Moins'))}">−</button><b>${eur(spV(k))}</b><button type="button" onclick="CV.buSpN('${ja(k)}',1)" aria-label="${esc(MSGT('Plus'))}">＋</button></span></div>`).join('')}
          <div class="bu-sum"><b>${eur(d)} / ${MSGT('jour')} / ${MSGT('pers.')}</b> × ${days} ${MSGT('jours')}${ppl > 1 ? ' × ' + ppl : ''} = <b>${eur(d * days * ppl)}</b><small>${MSGT('Pendant le voyage, ce montant devient ton plafond du jour.')}</small></div>
          <button type="button" class="ar-go" onclick="CV.buSpSave()">✓ ${MSGT(t.surplace ? 'Mettre à jour' : 'Ajouter au budget')}</button>`; }},
      {k:'pay', ic:'💳', l:MSGT('Payer à temps'), ok: !pay.length && !todo, n: pay.length ? RF('{0} à régler', pay.length) : todo ? RF('{0} à réserver', todo) : '',
        body: ()=>`${pay.length ? pay.slice(0, 5).map(it=>{ const e = buNextEch(it); return `<div class="ar-r" role="button" onclick="CV.edit('${ja(it.id)}')"><i>${it.cat === 'hotel' ? '🛏️' : icon(it)}</i><span><b data-notr>${esc(it.cat === 'hotel' ? (it.nom || cityOf(it.titre) || it.titre) : it.titre)}</b><small>${e ? `${MSGT('Prochaine échéance')} : ${eur(num(e.montant))}${e.date ? ' · ' + fshort(e.date) : ''}` : `${MSGT('Reste à payer')} : ${eur(totalOf(it) - paidAmount(it))}`}</small></span><div class="ar-ra"><button type="button" onclick="event.stopPropagation();CV.buPaid('${ja(it.id)}')">${MSGT('C’est payé')}</button></div></div>`; }).join('')
            : `<div class="ar-p">${todo ? RF('Rien à payer pour l’instant : {0} réservation(s) à faire d’abord.', todo) : '✓ ' + MSGT('Tout est payé.')}</div>`}
          ${pay.length ? `<div class="ar-p">${MSGT('Ajoute les acomptes dans chaque fiche (💶 Paiement → Échéancier) : l’appli te rappelle la veille.')}</div>` : ''}${todo ? fbtn(`CV.navTo('resas')`, `🎫 ${MSGT('Voir les réservations')}`, 1) : ''}`}
    ];
    return filCard({key, kick:MSGT('Ton budget pas à pas'), title:num(t.objectif) ? `🎯 ${eur(num(t.objectif))} / ${MSGT('pers.')}` : `💶 ${MSGT('Budget du voyage')}`, steps, doneMsg:'✨ ' + MSGT('Budget bouclé : tout est prévu et payé.')});
  }
  function buRe(){ const y = window.scrollY; renderBudget(); window.scrollTo(0, y); }
  function buTier(v){ const t = trip(); if(!t) return; const n = num(v); if(!(n > 0)) return; const c = clone(t); c.objectif = String(Math.round(n)); put(c, '🎯 ' + MSGT('Objectif enregistré')); buRe(); }
  function buAll(){ M.buAll = 1; buRe(); }
  function buPrices(){ const out = [];
    document.querySelectorAll('[data-bu]').forEach(i=>{ const it = R[i.dataset.bu], k = i.dataset.k || 'estime', raw = i.value.trim(), v = num(raw); if(!it || raw === String(i.dataset.v0 || '').replace('.', ',') || raw === String(i.dataset.v0 || '')) return;
      if(raw === '' ? !(it[k] != null && String(it[k]).trim() !== '') : !(v > 0) || v === num(it[k])) return;
      const c = clone(it); c[k] = raw === '' ? '' : String(v); out.push(c); });
    if(!out.length){ toast(MSGT('Rien n’a changé')); return; } putMany(out, '🧾 ' + RF('{0} prix enregistré(s)', out.length)); M.buAll = 0; buRe(); }
  function buSpN(k, d){ const t = trip(); if(!t) return; M.buSp = M.buSp || {}; const o = M.buSp[t.id] = M.buSp[t.id] || {};
    const cur = o[k] != null ? o[k] : t.surplace && t.surplace[k] != null ? num(t.surplace[k]) : Math.round(BU_SP.find(x=>x[0] === k)[3] * Math.max(.4, buIdx()));
    const st = cur >= 50 ? 10 : 5; o[k] = Math.max(0, Math.round((cur + d * st) / st) * st); buRe(); }
  function buSpSave(){ const t = trip(); if(!t) return; const o = (M.buSp || {})[t.id] || {}, c = clone(t), idx = buIdx();
    c.surplace = Object.fromEntries(BU_SP.map(([k, , , d])=>[k, String(o[k] != null ? o[k] : t.surplace && t.surplace[k] != null ? num(t.surplace[k]) : Math.round(d * Math.max(.4, idx)))]));
    const day = BU_SP.reduce((a, [k])=>a + num(c.surplace[k]), 0); if(!num(c.plafond)) c.plafond = String(day * Math.max(1, tv().length));   // le plafond du jour, pour tout le groupe
    if(M.buSp) delete M.buSp[t.id]; put(c, '🍝 ' + MSGT('Sur-place ajouté au budget')); buRe(); }
  function buPaid(id){ const it = R[id]; if(!it) return; const c = clone(it); c.statut = 'paid'; if(Array.isArray(c.echeances)) c.echeances = c.echeances.map(e=>Object.assign({}, e, {fait:true})); put(c, '✓ ' + MSGT('Payé')); buRe(); }
