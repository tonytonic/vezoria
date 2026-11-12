/* Vezoria — code de l’appli, partie 8/8 (chargées dans l’ordre par index.html, même portée globale) */

  // un voyage dans le cloud perso (privé tant qu’on n’invite personne)
  function cloudSpace(id){
    const t = R[id]; if(!t || t.demo) return false;
    if(tripInCloud(t.id)) return false;
    const c = genCode(); (M.spaces = M.spaces || []).push({code:c, since:0, dirty:[], last:0, err:''}); TS()[t.id] = c;
    Object.values(R).filter(r=>!r.demo && (r.id===t.id || r.trip===t.id)).forEach(r=>markDirty(r.id));
    persist();
    setTimeout(async ()=>{ try { await photoQueueAll(t.id); persist(); await syncNow(); uploadQueue(); refresh(); } catch(e){} }, 50);
    return true;
  }
  let cloudAskBusy = false;
  async function cloudNewTripCheck(){
    return;   // 🔁 plus de cloud « voyage par voyage » : on ne demande plus voyage par voyage
    if(cloudAskBusy || cloudMode() !== 'trips' || !M.me || document.visibilityState !== 'visible') return;
    if(document.querySelector('#v-sheet-bg, .ui-dlg, #cv-gate, #cv-film, #cv-world, #cv-tj')) return;
    const asked = M.cloudAsked || (M.cloudAsked = {}), now = Date.now();
    const t = myTrips().find(t=>!asked[t.id] && !tripInCloud(t.id) && (t.createdAt || 0) > now - 15 * 60e3 && (!t.createdBy || t.createdBy === M.me));
    if(!t) return;
    cloudAskBusy = true; asked[t.id] = now; persist();
    try {
      const T = x => (window.I18N && I18N.msg ? I18N.msg(x) : x);
      const msg = T('☁️ Mettre « {0} » dans ton cloud ?\n\nTu es en mode « voyage par voyage » : ce nouveau voyage est pour l’instant seulement sur ce téléphone.\nOK = le sauvegarder dans ton cloud (privé : rien n’est partagé).').replace('{0}', t.titre || '');
      if(await uiConfirm(msg)){ if(cloudSpace(t.id)) toast('☁️ Voyage mis dans ton cloud (privé)'); refresh(); }
    } catch(e){}
    cloudAskBusy = false;
  }
  setInterval(()=>{ try { cloudNewTripCheck(); } catch(e){} }, 4000);
  function cloudTrip(id){ if(cloudSpace(id)) toast('☁️ Voyage mis dans ton cloud (privé)'); if(!M.cloud){ M.cloud = 'trips'; persist(); } cloudSheet(); }
  async function cloudInvite(id){ (M.cloudInv = M.cloudInv || {})[id] = Date.now(); persist(); await tripInviteNow(id); }
  async function cloudShareAll(){
    if(!(await uiConfirm('Partager tout ton carnet ?\n\nLa personne recevra un code compagnon : elle verra TOUS tes voyages et pourra les compléter, sans tes droits d’administrateur (pas d’effacement, pas de gestion des accès). Tu pourras lui retirer l’accès. Pour ne partager qu’un voyage, utilise plutôt « Inviter » sur ce voyage.'))) return;
    closeSheet(true); memberInvite();
  }
  function syncSheet(){ return cloudSheet(); }
  function syncSheetOld(){
    const s = M.sync, rows = [];
    if(s.on && s.code) rows.push(`<div class="sy-r"><b>📱 Mes voyages sur tous mes appareils</b><small>${s.err ? '⚠️ ' + esc(s.err) : M.dirty.length ? '⏳ ' + M.dirty.length + ' modif(s) à envoyer' : '✓ à jour' + (s.last ? ' · ' + vzWhen(s.last) : '')}</small></div>`);
    Object.entries(TS()).forEach(([tid, c])=>{ const sp = spaceObj(c), t = R[tid]; if(!sp || !t) return;
      const kind = FT()[tid.replace(/^ft:/,'')] === c ? '👀 Mes abonnés : ' : t.type === 'feedtrip' ? '👀 Je suis : ' : '🔗 ';
      rows.push(`<div class="sy-r"><b>${kind}${esc(t.titre || '')}</b><small>${sp.err ? '⚠️ ' + esc(sp.err) : (sp.dirty||[]).length ? '⏳ ' + sp.dirty.length + ' modif(s) à envoyer' : '✓ à jour' + (sp.last ? ' · ' + vzWhen(sp.last) : '')}</small></div>`); });
    const ph = pqN() + (M.fq||[]).length, t = trip(), tc = t && !t.demo && TS()[t.id] && spaceObj(TS()[t.id]) ? TS()[t.id] : '';
    const mainBox = s.on && s.code
      ? `<div class="sy-r"><b>🔑 Mon code principal</b><small>Le même code sur ton autre téléphone ou ta tablette : tous tes voyages y arrivent.</small><div class="cv-row" style="margin-top:6px"><b class="cv-code">${esc(s.code)}</b><button type="button" class="v-btn sec" style="width:auto;margin:0 0 0 auto;padding:6px 12px" onclick="CV.copyCode()">📋 Copier</button></div></div>`
      : `<div class="sy-r"><b>📱 Tous mes voyages sur tous mes appareils</b><small>Crée ton code principal : tes voyages sont sauvegardés (chiffrés) et arrivent sur ton autre téléphone avec le même code.</small>
          <button type="button" class="v-btn" style="margin-top:8px" onclick="CV.syncMainNew()">☁️ Créer mon code principal</button>
          <div class="cv-row" style="margin-top:8px"><input class="v-in" id="sy-join" placeholder="J’ai déjà un code" autocapitalize="characters" autocomplete="off"><button type="button" class="fd-send" onclick="CV.syncMainJoin()">Utiliser</button></div></div>`;
    const tripBox = t && !t.demo
      ? (tc ? `<div class="sy-r"><b>🔗 Code du voyage « ${esc(t.titre)} »</b><small>À donner à tes compagnons : ils rejoignent seulement ce voyage.</small><div class="cv-row" style="margin-top:6px"><b class="cv-code">${esc(tc)}</b><button type="button" class="v-btn sec" style="width:auto;margin:0 0 0 auto;padding:6px 12px" onclick="CV.close();CV.tripInviteNow('${ja(t.id)}')">📤 Inviter</button></div></div>`
            : `<div class="sy-r"><b>🔗 Partager « ${esc(t.titre)} »</b><small>Crée le code de ce voyage et invite tes compagnons : ils ne voient que ce voyage, le reste reste privé.</small><button type="button" class="v-btn sec" style="margin-top:8px" onclick="CV.close();CV.tripInviteNow('${ja(t.id)}')">🔗 Créer le code et inviter</button></div>`)
      : '';
    openSheet(`<h2>☁️ Synchronisation</h2>
      <div class="v-sum-small" style="margin-bottom:10px">Tout part tout seul : à l’ouverture, après chaque modification, puis régulièrement. Hors connexion, rien n’est perdu : ça part dès que le réseau revient.</div>
      ${rows.join('') || '<div class="v-sum-small" style="margin-bottom:8px">Rien n’est en ligne pour l’instant : tes voyages restent sur ce téléphone.</div>'}
      ${mainBox}${tripBox}<button type="button" class="v-btn sec" onclick="CV.close();CV.joinAny()">🤝 Rejoindre un voyage avec un code</button>
      ${ph ? `<div class="sy-r"><b>📸 Photos</b><small>${M.pqErr ? (/^(⏸|📦)/.test(M.pqErr) ? '' : '⚠️ ') + '<span>' + esc(M.pqErr) + '</span> · ' : ''}⏳ ${ph} en attente d’envoi${(M.pq||[]).length && !(M.pq||[]).some(id=>photoCode(id)) ? ' · voyage pas encore partagé : touche 🔗 Partager' : ''}</small></div>` : ''}
      <div class="v-actions">${rows.length ? `<button type="button" class="v-btn" onclick="CV.syncNow(true);CV.close()">🔄 Synchroniser maintenant</button>` : ''}<button type="button" class="v-btn sec" onclick="CV.close();CV.tab('reglages')">⚙️ Réglages du partage</button></div>`);
  }
  setInterval(()=>{ syncPill(); try { socPill(); } catch(e){} }, 2500);

  // ---------- Inviter dans un voyage en un geste (le lien contient le code) ----------
  var INV_AFTER = null;
  // 📝 « C’est noté » (code administrateur) : si on était en train d’inviter quelqu’un, on reprend l’invitation au lieu d’ouvrir le Cloud
  function codeNoted(){ const id = INV_AFTER; INV_AFTER = null; if(id && R[id] && !R[id].deleted && M.sync.on && M.sync.code) return tripInviteNow(id); cloudSheet(); }
  async function tripInviteNow(id){
    const t = R[id || M.trip]; if(!t || t.demo) return;
    const cloud0 = M.cloud;
    if(!tripInCloud(t.id) && !(await cloudNeedAll())){ if(document.getElementById('ac-mail')) INV_AFTER = t.id; return; }   // ☁️ le carnet d’abord : le voyage partagé s’y branche (compte à créer : l’invitation reprend juste après)
    if((M.viaP || {})[t.id]){ alert(MSGT('Tu es dans ce voyage par une invitation personnelle : elle ne se transmet pas. Pour faire venir quelqu’un, demande à celui qui t’a invité.')); return; }
    {   // 👤 une invitation PAR PERSONNE : le 1er compte qui l’ouvre la garde ; la retirer change le code du voyage pour elle seule
      if(!(TS()[t.id] && spaceObj(TS()[t.id])) && !(await uiConfirm(MSGT('Envoyer « {0} » sur le serveur ?').replace('{0}', t.titre) + '\n' + MSGT('Pour inviter tes compagnons, le voyage et ses photos sont mis en ligne, chiffrés : seuls ceux qui reçoivent l’invitation peuvent les voir.')))) return;
      const who = await invWho(t); if(!who || !who.trim()) return;
      cryptShow('🔐 ' + MSGT('Invitation…'));
      let P = null; try { P = await packQuick(t.id, who.trim().slice(0, 40)); } finally { cryptHide(''); }
      if(P){ inviteSheet('', 'pack', P); refresh(); } return; }
    // pas encore en ligne : on demande d’abord la permission d’envoyer le voyage sur le serveur
    let fresh = false;
    if(!(TS()[t.id] && spaceObj(TS()[t.id]))){
      if(!(await uiConfirm('Envoyer « ' + t.titre + ' » sur le serveur ?\nPour inviter tes compagnons, le voyage et ses photos sont mis en ligne, chiffrés : seuls ceux qui reçoivent l’invitation peuvent les voir.\nAnnuler = rien ne part.'))){ M.cloud = cloud0; persist(); return; }
      const c = genCode(); (M.spaces = M.spaces || []).push({code:c, since:0, dirty:[], last:0, err:''}); TS()[t.id] = c; fresh = true; persist();
    }
    const code = TS()[t.id], url = appUrl(), link = url ? url + '#rejoindre=' + encodeURIComponent(code) : '';
    const MSG = x => (window.I18N && I18N.msg ? I18N.msg(x) : x);
    const text = MSG(`Rejoins notre voyage « ${t.titre} » sur Vezoria 🧳`) + '\n' + (link || url);
    const go = () => { if(!fresh) return; fresh = false;   // invitation envoyée : le voyage et ses photos partent maintenant
      Object.values(R).filter(r=>!r.demo && (r.id===t.id || r.trip===t.id)).forEach(r=>markDirty(r.id)); persist(); toast('🔐 Voyage mis en ligne (chiffré)…');
      setTimeout(async ()=>{ try { await photoQueueAll(t.id); persist(); await syncNow(); uploadQueue(); refresh(); } catch(e){} }, 50); };
    go(); refresh();
    inviteSheet(t.id);   // invitation guidée : QR code (la personne est à côté) ou message avec le lien ET le code
  }
  // 👥 qui invites-tu ? tes compagnons des voyages précédents et tes abonnés en un geste, ou un nouveau prénom
  let IWR = null;
  function invWho(t){
    return new Promise(res=>{
      if(IWR) try { IWR(''); } catch(e){}
      let done = false; const fin = v => { if(done) return; done = true; IWR = null; ob.disconnect(); closeSheet(true); res(v || ''); };
      IWR = fin;
      const inT = new Set(t.voyageurs || []), seen = new Set(), C = [], A = [];
      try { spPeople().forEach(x=>{ if(inT.has(x.pid)) return; const n = String(pname(x.pid) || '').trim(); if(!n || n === '?' || seen.has(normQ(n))) return; seen.add(normQ(n)); C.push({n, av:pav(x.pid, 'av-md'), sub:x.ts.slice(0, 2).map(y=>y.titre).join(' · ')}); }); } catch(e){}
      try { ab2Fws().forEach(f=>{ const n = String(ab2Nm(f) || '').trim(); if(!n || n === '?' || fwGeneric(n) || n === MSGT('Un proche') || seen.has(normQ(n))) return; seen.add(normQ(n)); A.push({n}); }); } catch(e){}
      const btn = (x, ic) => `<button type="button" class="iw-p" data-n="${esc(x.n)}">${x.av || `<i>${ic}</i>`}<span><b data-notr>${esc(x.n)}</b>${x.sub ? `<small data-notr>${esc(x.sub)}</small>` : ''}</span></button>`;
      openSheet(`<h2>👥 ${esc(MSGT('Qui invites-tu dans ce voyage ?'))}</h2>
        ${C.length ? `<div class="sh-sec">🧳 ${esc(MSGT('Tes compagnons de voyage'))}</div><div class="iw-l">${C.map(x=>btn(x, '🧳')).join('')}</div>` : ''}
        ${A.length ? `<div class="sh-sec">👀 ${esc(MSGT('Tes abonnés'))}</div><div class="iw-l">${A.map(x=>btn(x, '👀')).join('')}</div>` : ''}
        <div class="sh-sec">✍️ ${esc(MSGT(C.length || A.length ? 'Quelqu’un d’autre' : 'Son prénom'))}</div>
        <div class="cv-row"><input class="v-in" id="iw-n" maxlength="40" placeholder="${esc(MSGT('Son prénom'))}" autocomplete="off"><button type="button" class="v-btn cv-sq" id="iw-ok" aria-label="OK">OK</button></div>
        <div class="v-actions"><button type="button" class="v-btn sec" id="iw-no">${esc(MSGT('Annuler'))}</button></div>`);
      const bg = document.getElementById('v-sheet-bg');
      bg.querySelectorAll('.iw-p').forEach(b=>b.onclick = () => fin(b.dataset.n));
      const inp = document.getElementById('iw-n'), ok = () => { const v = inp.value.trim(); if(v) fin(v); else inp.focus(); };
      document.getElementById('iw-ok').onclick = ok; inp.onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); ok(); } };
      document.getElementById('iw-no').onclick = () => fin('');
      const ob = new MutationObserver(()=>{ if(!document.body.contains(bg)) fin(''); }); ob.observe(document.body, {childList:true});   // fiche fermée autrement (✕, glisser) : rien
      if(!C.length && !A.length) setTimeout(()=>{ try { inp.focus(); } catch(e){} }, 120);
    });
  }
  /* ---------- 📤 Invitation guidée : la personne est à côté (QR code) ou loin (message avec le lien et le code) ---------- */
  const invTag = titre => (myName() ? '&de=' + encodeURIComponent(String(myName()).slice(0, 30)) : '') + (titre ? '&v=' + encodeURIComponent(String(titre).slice(0, 60)) : '');   // 🎟️ « Anthony t’invite dans « Genève » » sur la page d’invitation
  const inviteText = (kind, titre, code) => { const MSG = x => (window.I18N && I18N.msg ? I18N.msg(x) : x), url = appUrl(), link = url ? url + '#rejoindre=' + encodeURIComponent(code) + invTag(kind === 'trip' || !kind ? titre : '') : '';
    // 👆 la personne n’a qu’à toucher le lien (Android : l’appli s’ouvre toute seule). Seul cas sans lien direct : l’iPhone qui a déjà l’appli → copier le message puis 📋 Coller.
    return (kind === 'pack' ? MSG('Rejoins nos voyages sur Vezoria 🧳 : à compléter ensemble') : kind === 'carnet' ? MSG('Rejoins mon carnet de voyage sur Vezoria 🧳 : tous mes voyages, à compléter ensemble') : MSG(`Rejoins notre voyage « ${titre} » sur Vezoria 🧳`))
      // 👆 comme pour les abonnés : Android → le lien ouvre l’appli et rejoint ; iPhone → Safari ne rejoint rien (page « copier l’invitation ») et on colle dans l’appli
      + '\n\n👉 ' + MSG('Touche ce lien :') + ' ' + (link || url) + '\n' + MSG('(iPhone avec Vezoria déjà installée : copie ce message, ouvre Vezoria → 👥 → Rejoindre → 📋 Coller l’invitation reçue.)') + '\n\n' + MSG('Code :') + ' ' + code; };
  function inviteSheet(tid, kind, code0){
    if(kind === 'carnet'){ closeSheet(true); memberInvite(); return; }   // 🔑 le code administrateur ne se donne plus : code compagnon
    kind = kind || 'trip'; const t = tid ? R[tid] : null, code = kind === 'pack' ? code0 : kind === 'carnet' ? M.sync.code : TS()[tid]; if(!code) return;
    const pk = kind === 'pack' ? PACKS()[code] : null;
    const url = appUrl(), link = url ? url + '#rejoindre=' + encodeURIComponent(code) : code;
    openSheet(`<h2>📤 ${pk ? 'Invitation pour <span data-notr>' + esc(pk.who || '?') + '</span>' : kind === 'carnet' ? 'Inviter dans tout mon carnet' : 'Inviter dans « ' + esc(t ? t.titre : '') + ' »'}</h2>
      ${pk ? `<div class="v-sum-small" style="margin-bottom:6px">${pk.trips.map(x=>'🧳 <span data-notr>' + esc((R[x]||{}).titre || '') + '</span>').join(' · ')}</div>` : ''}
      <div class="v-sum-small" style="margin-bottom:8px">${pk ? 'Cette personne verra et complètera ces voyages seulement. Tu pourras en retirer un à tout moment.' : kind === 'carnet' ? 'Ton compagnon verra et complètera tous tes voyages, et les voyages qu’il créera avec toi arriveront chez toi.' : 'La personne verra et complètera ce voyage seulement. Tes autres voyages restent privés.'}</div>
      <div class="iv-step"><b>📱 Elle est à côté de toi</b><span>Elle scanne ce QR code avec l’appareil photo de son téléphone. Vezoria déjà installée ? 👥 Partager → « Rejoindre » → 📷 et elle scanne ce QR code : rien à taper.</span></div>
      <div class="iv-qr">${qrSVG(link)}</div>
      <div class="cv-bigcode" data-notr>${esc(code)}</div>
      <div class="iv-step"><b>💬 Elle est loin</b><span>${esc(MSGT('Envoie-lui le message : avec Vezoria, elle le colle dans son appli ; sans Vezoria, elle touche le lien.'))}</span></div>
      <button type="button" class="v-btn" onclick="CV.inviteSend('${ja(tid || '')}','${ja(kind)}','${ja(pk ? code : '')}')">💬 Envoyer l’invitation</button>
      <button type="button" class="v-btn sec" onclick="CV.inviteCopy('${ja(code)}')">📋 Copier le code</button>
      <div class="v-sum-small" style="margin-top:8px">${kind === 'carnet' ? '🔐 Tout est chiffré : seules les personnes qui ont ce code peuvent lire ton carnet.' : '🔐 Tout est chiffré : seules les personnes qui ont ce code peuvent lire ce voyage.'}</div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  async function inviteSend(tid, kind, code0){
    if(kind === 'carnet'){ memberInvite(); return; }   // 🔑 jamais le code administrateur
    const t = tid ? R[tid] : null, code = kind === 'pack' ? code0 : TS()[tid]; if(!code) return;
    const text = inviteText(kind, t ? t.titre : '', code);
    if(navigator.share){ try { await navigator.share({title: t ? t.titre : 'Vezoria', text}); return; } catch(e){ if(e && e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(text); toast('📋 Invitation copiée : colle-la dans un message'); } catch(e){ await uiPrompt('Copie ce texte :', text); }
  }
  async function inviteCopy(code){ try { await navigator.clipboard.writeText(code); toast('📋 Code copié'); } catch(e){ await uiPrompt('Copie ce code :', code); } }
  // 📚 Tout le carnet : pour un compagnon (il complète tout) ou pour des abonnés (lecture seule, photos et récits)
  function carnetShareSheet(){
    const mainOn = !!(M.sync.on && M.sync.code), ac = M.feedAll && spaceObj(M.feedAll) ? M.feedAll : '';
    const pub = ac ? myTrips().filter(t=>grpCodeOf(t.id) === ac) : [];
    openSheet(`<h2>📚 Partager tout mon carnet</h2>
      <div class="sh-card"><div class="sh-k">👥 Avec un compagnon de voyage</div><p>Il voit et complète les voyages que tu choisis (programme, résas, budget, souvenirs). Tu pourras en retirer un à tout moment, pour lui seulement.</p>
        <button type="button" class="v-btn" onclick="CV.packSheet('')">📤 Inviter un compagnon (je choisis les voyages)</button>
        ${mainOn ? `<button type="button" class="v-btn sec" onclick="CV.close();CV.memberInvite()">💞 Tout partager avec un code compagnon (tous mes voyages)</button>` : `<div class="v-sum-small" style="margin-bottom:6px">Ton carnet n’est pas encore dans le cloud : active-le d’abord (chiffré), puis reviens ici.</div><button type="button" class="v-btn" onclick="CV.close();CV.cloudSheet()">☁️ Mettre mon carnet dans le cloud</button>`}</div>
      <div class="sh-card"><div class="sh-k">👀 Avec des abonnés (lecture seule)</div><p>Ta famille et tes amis voient uniquement les photos, les étapes, les lieux et les récits de tes voyages, avec un seul lien. Le budget, les résas, les documents et les notes ne sortent jamais. Les souvenirs « 🔒 privés » restent cachés.</p>
        ${ac ? `<div class="v-sum-small" style="margin-bottom:6px">✓ ${pub.length} voyage(s) publié(s) avec le lien du carnet.</div>` : ''}
        <button type="button" class="v-btn" onclick="CV.carnetPublishSheet()">${ac ? '👀 Choisir les voyages publiés et inviter' : '👀 Publier mon carnet pour des abonnés'}</button></div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  function carnetPublishSheet(add){ return ab2TripsSheet();
    const ac = M.feedAll && spaceObj(M.feedAll) ? M.feedAll : '', ts = myTrips();
    if(!ts.length){ alert('Crée d’abord un voyage.'); return; }
    openSheet(`<h2>👀 Mon carnet pour des abonnés</h2><div class="v-sum-small" style="margin-bottom:8px">Coche les voyages à montrer. Tes abonnés passent de l’un à l’autre avec un seul lien.<br>${esc(MSGT('Décoché : montré à personne. 🙈 : le cacher à quelqu’un en particulier.'))}</div>
      <div style="margin-bottom:6px"><button type="button" class="v-btn sec" style="width:auto;display:inline-block;margin:0 6px 0 0" onclick="document.querySelectorAll('.cpub:not(:disabled)').forEach(x=>x.checked=true)">${esc(MSGT('Tout cocher'))}</button><button type="button" class="v-btn sec" style="width:auto;display:inline-block;margin:0" onclick="document.querySelectorAll('.cpub:not(:disabled)').forEach(x=>x.checked=false)">${esc(MSGT('Tout décocher'))}</button></div>
      <style>.cpl{display:flex;align-items:center;gap:6px}.cpl label{flex:1;min-width:0}.cpl .cps{display:block;font-size:12px;opacity:.8}.cpl .cpub:not(:checked)~span .cps-on,.cpl .cpub:checked~span .cps-off{display:none}.cpl .cph{flex:none;padding:4px 9px;font-size:14px}</style>
      ${ts.map(t=>{ const own = FT()[t.id] && grpCodeOf(t.id) !== ac, nf = own ? soloFw(t.id) : 0, nh = ((FRX()[t.id] || {}).ex || []).length + (((M.preHide || {})[t.id]) || []).length;
        const st = `<small class="cps cps-on">${nh ? '🙈 ' + esc(RF('caché à {0} abonné(s)', nh)) : '👀 ' + esc(MSGT('vu par tes abonnés'))}</small><small class="cps cps-off">🔒 ${esc(MSGT('montré à personne'))}</small>`;
        return `<div class="cpl"><label class="cv-checkline"><input type="checkbox" class="cpub" value="${t.id}"${(ac && grpCodeOf(t.id) === ac) || (!ac && !own) || (add && t.id === add && !own) ? ' checked' : ''}${own && nf ? ' disabled' : ''}> <span><span data-notr>${esc(t.titre)}</span>${own ? (nf ? ` <small>(publié à part : ${nf} abonné${nf > 1 ? 's' : ''} sur son propre lien)</small>` : ' <small>(publié à part, sans abonné : coche-le pour le mettre dans le carnet)</small>') : st}</span></label>${own ? '' : `<button type="button" class="v-day-edit cph" onclick="CV.preHideSheet('${ja(t.id)}')" aria-label="${esc(MSGT('Cacher à quelqu’un'))}">🙈</button>`}</div>`; }).join('')}
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.carnetPublish()">👀 Publier et inviter</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  // abonnés d’un voyage publié à part (sur son propre lien)
  const soloFw = tid => { const c = FT()[tid]; if(!c || Object.entries(FT()).some(([k, x])=>k !== tid && x === c)) return 0; return new Set(list('follower', x=>x.trip === ftId(tid) && !x.deleted && !String(x.id).endsWith(':' + devId())).map(fwKey)).size; };
  // un voyage publié à part, sans abonné, rejoint le carnet : son ancien lien est vidé (serveur compris) puis oublié
  async function soloToCarnet(tid, c){
    const old = FT()[tid], sp = old && spaceObj(old); if(!old || old === c) return;
    const recs = Object.values(R).filter(r=>r && !r.deleted && (r.trip === ftId(tid) || r.id === ftId(tid) || r.id === 'fk:' + tid));
    if(sp){ try { await spacePushOnly(sp, recs.map(r=>Object.assign(clone(r), {deleted:true}))); } catch(e){} }
    M.spaces = (M.spaces||[]).filter(x=>x.code !== old);
    if(M.fup) delete M.fup[old]; M.fq = (M.fq||[]).filter(x=>x[0] !== old); M.fdel = (M.fdel||[]).filter(x=>x[0] !== old); M.fwipe = (M.fwipe||[]).concat([old]);   // ses vignettes d’abonnés : effacées du serveur
    if(FRX()[tid]) delete FRX()[tid];
    FT()[tid] = c; TS()[ftId(tid)] = c;
    recs.forEach(r=>markDirty(r.id));   // tout repart dans le carnet (❤️ et commentaires compris)
    persist();
  }
  // 📋 tableau unique : tous mes voyages, partagé / masqué pour les abonnés
  function abTableHTML(){
    const ts = myTrips().sort((a,b)=>(b.debut||'').localeCompare(a.debut||'')); if(!ts.length) return '';
    const ac = M.feedAll && spaceObj(M.feedAll) ? M.feedAll : '', nOn = ts.filter(t=>FT()[t.id]).length;
    return `<div class="sh-card sh-tb ab-tab" data-t="ab"><div class="sh-k">📋 Mes voyages pour les abonnés</div>
      <div class="v-sum-small" style="margin-bottom:6px">${nOn} partagé${nOn>1?'s':''} sur ${ts.length}. Touche pour partager ou masquer un voyage, pour tous tes abonnés à la fois.</div>
      <button type="button" class="v-btn" style="margin:0 0 10px" onclick="CV.carnetPublishSheet()">📚 ${esc(MSGT('Choisir plusieurs voyages d’un coup'))}</button>
      <button type="button" class="v-btn sec" style="margin:0 0 10px" onclick="CV.codesCopy()">📋 ${esc(MSGT('Copier tous mes codes'))}</button>
      ${ts.map(t=>{ const on = !!FT()[t.id], solo = on && ac && grpCodeOf(t.id) !== ac, by = !on && t.pubBy && t.pubBy !== M.me && prof(t.pubBy) ? pname(t.pubBy) : '', tc = tripCodeOf(t.id), fc = on && FT()[t.id] !== ac ? FT()[t.id] : '';
        const cl = (tc ? `<span class="ab-code" data-notr>🧳 ${esc(tc)}</span>` : '') + (fc ? `<span class="ab-code" data-notr>👀 ${esc(fc)}</span>` : '');
        if(by) return `<div class="ab-row"><span class="ab-t"><b data-notr>${esc(t.titre)}</b><small class="v-sum-small">${t.debut ? tripDates(t) : ''}</small></span><span class="ab-sw ab-by">👀 <span>Publié par</span> <b data-notr>${esc(by)}</b></span></div>`;
        return `<div class="ab-row"><span class="ab-t"><b data-notr>${esc(t.titre)}</b><small class="v-sum-small">${t.debut ? tripDates(t) : ''}${solo ? ' · lien à part' : ''}</small>${cl ? `<small class="ab-codes">${cl}</small>` : ''}</span>
          ${on && !solo ? `<button type="button" class="ab-1" title="Lien pour ce voyage seulement" aria-label="Lien pour ce voyage seulement" onclick="CV.feedShareOne('${ja(t.id)}')">🔗</button>` : ''}
          ${on ? `<button type="button" class="ab-1" title="${esc(MSGT('Cacher à quelqu’un'))}" aria-label="${esc(MSGT('Cacher à quelqu’un'))}" onclick="CV.preHideSheet('${ja(t.id)}')">🙈${((M.preHide || {})[t.id] || []).length ? '<sup>' + M.preHide[t.id].length + '</sup>' : ''}</button>` : ''}
          <button type="button" class="ab-sw${on ? ' on' : ''}" onclick="CV.carnetToggle('${ja(t.id)}')">${on ? '👀 Partagé' : '🔒 Masqué'}</button></div>`; }).join('')}
      <div class="v-sum-small" style="margin-top:6px">🔗 = un lien pour ce voyage seulement · 🙈 = cacher ce voyage à quelqu’un (même pas encore abonné) · 👁️ à côté d’un abonné = choisir ce qu’il voit</div></div>`;
  }
  // 🔑 code propre d’un voyage partagé avec des compagnons (sinon il vit dans le carnet principal)
  const tripCodeOf = tid => { const c = TS()[tid]; return c && spaceObj(c) && c !== M.sync.code ? c : ''; };
  // 📋 tous mes codes, « Nom : CODE » par ligne (à coller dans le tableau de bord pour reconnaître les dossiers)
  async function codesCopy(){
    const L = [], seen = new Set(), add = (n, c)=>{ if(c && !seen.has(c)){ seen.add(c); L.push(n + ' : ' + c); } };
    if(M.sync.on && M.sync.code) add(MSGT('Mon carnet'), M.sync.code);
    if(M.feedAll && spaceObj(M.feedAll)) add(MSGT('Abonnés'), M.feedAll);
    myTrips().sort((a,b)=>(b.debut||'').localeCompare(a.debut||'')).forEach(t=>{ const n = (t.titre || '?') + (t.debut ? ' ' + t.debut.slice(0, 4) : '');
      add(n, tripCodeOf(t.id)); if(FT()[t.id]) add(n + ' (' + MSGT('abonnés') + ')', FT()[t.id]); });
    const txt = L.join('\n'); if(!txt){ toast(MSGT('Aucun code')); return; }
    try { await navigator.clipboard.writeText(txt); toast('📋 ' + RF('{0} codes copiés', L.length)); } catch(e){ await uiPrompt(MSGT('Copie ce texte :'), txt); }
  }
  // partager ↔ masquer un voyage pour TOUS les abonnés (il entre dans le carnet ou en sort)
  function evToggle(o){ M.evOpen = !!o; persist(); }
  async function carnetToggle(tid){ return ab2TripSet(tid, !(ab2C() && FT()[tid] === ab2C()));
    const t = R[tid]; if(!t || t.demo) return;
    if(!FT()[tid] && t.pubBy && t.pubBy !== M.me && prof(t.pubBy)){ alert(MSGT('Ce voyage est déjà publié par {0} : ses abonnés le voient déjà. Un seul compagnon le publie, pour éviter les doublons.').replace('{0}', pname(t.pubBy))); return; }
    if(FT()[tid]){
      if(!(await uiConfirm(MSGT('Masquer « {0} » à tous tes abonnés ?').replace('{0}', t.titre) + '\n\n' + MSGT('Ses photos et récits disparaissent chez eux. Tu pourras le repartager quand tu veux.')))) return;
      await feedStop(tid, true); toast('🔒 ' + MSGT('Masqué pour tous tes abonnés')); refresh(); try { if(document.querySelector('.ab-tab')) shareHub(); } catch(e){}
      return;
    }
    try { await fKey(); } catch(e){}
    if(!myName()){ const n = (await uiPrompt('Ton prénom (affiché à tes abonnés) :', '')); if(!n || !n.trim()) return; M.followName = n.trim(); }
    let c = M.feedAll && spaceObj(M.feedAll) ? M.feedAll : '', first = false;
    if(!c){
      if(!(await uiConfirm('Publier ces voyages pour des abonnés ?\n\nIls verront uniquement les souvenirs : photos, titres, lieux et récits. Le programme, les réservations, le budget et les documents restent privés.'))) return;
      c = genCode(); (M.spaces = M.spaces || []).push({code:c, since:0, dirty:[], last:0, err:''}); M.feedAll = c; first = true;
    }
    FT()[tid] = c; persist(); feedBuild(tid); toast('👀 ' + MSGT('Partagé avec tes abonnés')); refresh(); try { if(document.querySelector('.ab-tab')) shareHub(); } catch(e){}
    try { await feedReconcile(); } catch(e){}
    try { await syncNow(); feedUpload(); setTimeout(()=>{ try { pushRegister(true); } catch(e){} }, 2500); } catch(e){}
    if(first) await carnetInvite(c);
  }
  // ménage : les anciens voyages « à part » sans abonné rejoignent le carnet (un seul lien pour tout)
  let soloTidyAt = 0;
  async function soloTidy(){ return;
    const c = M.feedAll && spaceObj(M.feedAll) ? M.feedAll : ''; if(!c || Date.now() - soloTidyAt < 60000) return; soloTidyAt = Date.now();
    const ts = Object.keys(FT()).filter(t=>R[t] && !R[t].deleted && grpCodeOf(t) !== c && !FRX()[t] && !soloFw(t)); if(!ts.length) return;
    for(const t of ts) await soloToCarnet(t, c);
    ts.forEach(t=>feedBuild(t)); persist();
    try { await syncNow(); feedUpload(); feedPurge(); } catch(e){}
    try { if(document.querySelector('.ab-tab')) shareHub(); } catch(e){}
  }
  async function carnetPublish(){
    try { await fKey(); } catch(e){}
    const sel = [...document.querySelectorAll('.cpub:checked')].map(i=>i.value); if(!sel.length){ alert('Coche au moins un voyage.'); return; }
    if(!myName()){ const n = (await uiPrompt('Ton prénom (affiché à tes abonnés) :', '')); if(!n || !n.trim()) return; M.followName = n.trim(); }
    let c = M.feedAll && spaceObj(M.feedAll) ? M.feedAll : '';
    if(!c){ if(!(await uiConfirm('Publier ces voyages pour des abonnés ?\n\nIls verront uniquement les souvenirs : photos, titres, lieux et récits. Le programme, les réservations, le budget et les documents restent privés.'))) return;
      c = genCode(); (M.spaces = M.spaces || []).push({code:c, since:0, dirty:[], last:0, err:''}); M.feedAll = c; }
    // voyages décochés : retirés du carnet publié (leurs publications et photos d’abonnés partent)
    for(const tid of Object.keys(FT())) if(grpCodeOf(tid) === c && !sel.includes(tid)) await feedStop(tid, true);   // aussi les voyages supprimés ou remplacés depuis
    fgAt = 0;
    feedFixAt = 0;
    for(const tid of sel) if(FT()[tid] && grpCodeOf(tid) !== c && !soloFw(tid)) await soloToCarnet(tid, c);
    sel.forEach(tid=>{ if(!FT()[tid]) FT()[tid] = c; });
    persist(); sel.forEach(tid=>feedBuild(tid)); closeSheet(true); toast('👀 Publication en cours…');
    try { await feedReconcile(); } catch(e){}
    try { await syncNow(); feedUpload(); setTimeout(()=>{ try { pushRegister(true); } catch(e){} }, 2500); } catch(e){}
    await carnetInvite(c);
  }
  // 👀 abonné : déjà Vezoria → il colle le message dans SON appli (le lien ouvrirait Safari = un autre compte sur iPhone) ; pas d’appli → le lien suffit
  const fwTail = (link, c) => { const MSG = x => (window.I18N && I18N.msg ? I18N.msg(x) : x);
    return '\n\n' + MSG('Code :') + ' ' + c + '\n\n' + MSG('Tu as Vezoria ? Copie ce message, ouvre ton appli → 👥 → Rejoindre → 📋 Coller l’invitation reçue.') + '\n' + MSG('Pas Vezoria ? Touche simplement ce lien, rien à installer :') + ' ' + link; };
  async function carnetInvite(c){
    const MSG = x => (window.I18N && I18N.msg ? I18N.msg(x) : x), link = appUrl() ? appUrl() + '#suivre=' + encodeURIComponent(c) + invTag('') : '';
    const text = MSG(`Suis mes voyages sur Vezoria ✈️ : photos et récits au fil des étapes`) + fwTail(link, c);
    fwInviteSheet(c, link, text, MSGT('Inviter des abonnés'));
  }
  // 👀 inviter un abonné : QR code (la personne est à côté de toi) + message (elle est loin)
  let FWI = null;
  function fwInviteSheet(c, link, text, title){
    FWI = {text, c}; refresh();
    openSheet(`<h2>👀 ${esc(title)}</h2>
      <div class="iv-step"><b>📱 ${esc(MSGT('Elle est à côté de toi'))}</b><span>${esc(MSGT('Elle scanne ce QR code avec l’appareil photo de son téléphone : le voyage s’ouvre directement, sans rien installer.'))}</span></div>
      <div class="iv-qr">${qrSVG(link || c)}</div>
      <div class="cv-bigcode" data-notr>${esc(c)}</div>
      <div class="iv-step"><b>💬 ${esc(MSGT('Elle est loin'))}</b><span>${esc(MSGT('Envoie-lui le message : avec Vezoria, elle le colle dans son appli ; sans Vezoria, elle touche le lien.'))}</span></div>
      <button type="button" class="v-btn" onclick="CV.fwInviteSend()">💬 ${esc(MSGT('Envoyer l’invitation'))}</button>
      <button type="button" class="v-btn sec" onclick="CV.fwInviteSend(1)">📋 ${esc(MSGT('Copier le lien'))}</button>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">${esc(MSGT('Fermer'))}</button></div>`);
  }
  async function fwInviteSend(copy){
    if(!FWI) return; const text = FWI.text;
    if(!copy && navigator.share){ try { await navigator.share({title:'Vezoria', text}); return; } catch(e){ if(e && e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(text); toast('📋 ' + MSGT('Lien abonné copié')); } catch(e){ await uiPrompt('Copie ce texte :', text); }
  }
  // lien reçu : #rejoindre=CODE (voyage partagé) ou #suivre=CODE (abonné)
  async function hashJoin(){
    const h = location.hash || ''; const m = h.match(/#(rejoindre|suivre)=([A-Z0-9-]{8,})/i); if(!m) return;
    { const g = k => { const x = h.match(new RegExp('[&#]' + k + '=([^&]*)')); try { return x ? decodeURIComponent(x[1]).slice(0, 60) : ''; } catch(e){ return ''; } };
      const de = g('de'), v = g('v'); M.invFrom = de || v ? {de, v, at:Date.now()} : null; }
    history.replaceState(null, '', location.pathname + location.search);
    const code = m[2].toUpperCase();
    // 🌐 lien de compagnon ouvert dans le NAVIGATEUR (iPhone : jamais dans l’appli de l’écran d’accueil) : on ne rejoint RIEN ici,
    //    sinon c’est ce navigateur qui prendrait l’invitation personnelle ; la page propose de la copier pour la coller dans l’appli.
    if(m[1].toLowerCase() !== 'suivre' && !isInstalled()){ const j0 = M.joinCode; M.joinCode = code; let g = false; try { g = installGate(); } catch(e){} if(g){ persist(); return; } M.joinCode = j0; }   // (accès navigateur voulu : ?web=1, localhost → comme avant)
    if(m[1].toLowerCase() !== 'suivre' && !(M.me && prof(M.me))){ M.joinCode = code; persist(); const ci = document.getElementById('cv-scode'); if(ci) obJoinPrefill(); return; }
    if(m[1].toLowerCase() === 'suivre'){ followGo(code); return; }
    if(Object.values(TS()).includes(code)){ const tid = Object.keys(TS()).find(k=>TS()[k]===code); if(R[tid]) go(tid); return; }
    if(!(await uiConfirm('Rejoindre le voyage partagé avec toi ?\n\nCode : ' + code))) return;
    joinAny(); setTimeout(()=>{ const i = document.getElementById('ja-code'); if(i){ i.value = code; joinAnyGo(); } }, 120);
  }
  window.addEventListener('hashchange', hashJoin);

  // ---------- 👀 Abonnés : le voyage en photos et récits, le reste reste privé ----------
  const FT = () => M.feedPub || (M.feedPub = {});            // voyage → code abonnés (chez l'auteur)
  const ftId = tid => 'ft:' + tid;
  const feedCode = tid => { const c = FT()[tid]; return c && spaceObj(c) ? c : null; };
  // 👥 voyage commun : chaque compagnon qui le montre à SES abonnés laisse son code de fil dans le voyage (« fc:<voyage>:<lui> »).
  //    Ses compagnons lisent sur ce fil les ❤️ et commentaires de CE voyage (rien d’autre), en sont prévenus, et y répondent.
  const mateCodes = tid => { const t = R[tid]; if(!t || t.deleted || t.type !== 'trip' || !M.me) return [];
    return [...new Set(list('feedco', r=>r.trip === tid && r.pid !== M.me && r.code && r.code !== FT()[tid]).map(r=>r.code))].filter(c=>spaceObj(c)); };
  const mateCode = tid => mateCodes(tid)[0] || null;
  const socCodes = ftid => { const tid = String(ftid).replace(/^ft:/, ''), t = R[tid];
    if(t && t.type === 'trip' && !t.deleted) return [...new Set([feedCode(tid), ...mateCodes(tid)].filter(Boolean))];
    return [TS()[ftid]].filter(Boolean); };
  const socCode = tid => feedCode(tid) || mateCode(tid);
  // ❤️💬 les fils dont je vois les réactions : les voyages que JE montre, et nos voyages communs montrés par un compagnon
  //    (Victoria aime une étape chez Anthony → Claire, compagne du voyage, la voit aussi)
  function socMineFt(){ return new Set([...Object.keys(FT()).filter(tid=>R[tid] && !R[tid].deleted), ...myTrips().filter(t=>mateCodes(t.id).length).map(t=>t.id)].map(ftId)); }
  // suivre en silence le code abonnés des voyages communs publiés par un compagnon (et l’oublier quand il n’est plus publié)
  function mateFeedSync(){   // abonnés v2 : les fils de mes compagnons, pour les ❤️ et commentaires de nos voyages communs
    const want = new Set(); let ch = 0;
    try { socWhoFix(); } catch(e){}
    // 🩹 (2026-11-09f) : un fil que je SUIS aussi en abonné jetait les ❤️ et commentaires de nos voyages communs → on le relit une fois en entier
    // 🌍 (2026-11-10) : le nom proposé « Mon prochain voyage » restait en français dans les autres langues → renommé une fois dans la langue de l’appli
    if(!M.tnFix1 && window.I18N && I18N.lang !== 'fr' && I18N.ready){ M.tnFix1 = 1; const nm = MSGT('Mon prochain voyage');
      if(nm !== 'Mon prochain voyage'){ const fx = myTrips().filter(t=>t.titre === 'Mon prochain voyage').map(t=>Object.assign(clone(t), {titre:nm})); if(fx.length) putQuiet(fx); } ch++; }
    if(!M.mtFix1){ M.mtFix1 = 1; (M.spaces || []).forEach(sp=>{ if(sp.sub) sp.since = 0; }); ch++; }
    list('feedco', r=>r.pid !== M.me && r.code && R[r.trip] && R[r.trip].type === 'trip' && !R[r.trip].deleted && ((R[r.trip].voyageurs || []).includes(M.me)) && r.code !== FT()[r.trip]).forEach(r=>want.add(r.code));
    want.forEach(c=>{ if(!spaceObj(c)){ (M.spaces = M.spaces || []).push({code:c, since:0, dirty:[], last:0, err:'', mate:1}); ch++; } });
    const keep = (M.spaces || []).filter(sp=>!sp.mate || want.has(sp.code)); if(keep.length !== (M.spaces || []).length){ M.spaces = keep; ch++; }
    if(ch){ persist(); try { pushRegister(true); } catch(e){} } return ch;
  }
  // fil d’un compagnon : seulement les ❤️, commentaires et publications de NOS voyages communs
  function ab2MateIn(recs){
    return (recs || []).filter(r=>{ if(!r || !['like','comment','feed'].includes(r.type) || !/^ft:/.test(r.trip || '')) return false;
      const tid = r.trip.slice(3), t = R[tid]; if(!(t && t.type === 'trip' && !t.deleted && (t.voyageurs || []).includes(M.me))) return false;
      return r.type !== 'feed' || !FT()[tid]; });
  }
  const devId = () => M.devId || (M.devId = 'd' + uid());
  const myName = () => (M.me && prof(M.me) ? pname(M.me) : '') || M.followName || '';
  const stripStamp = r => { const o = Object.assign({}, r); ['createdAt','createdBy','updatedAt','updatedBy'].forEach(k=>delete o[k]); return JSON.stringify(o); };
  function putQuiet(arr){ arr.forEach(r=>{ sbKeep(r); photoGone(R[r.id], r); stamp(r); R[r.id] = r; markDirty(r.id); }); if(arr.length){ persist(); queueSync(); } }
  // côté auteur : les souvenirs (non privés) deviennent des publications
  // ordre des étapes chez les abonnés : jour, puis heure dans la journée (avant : le jour seulement → photos du soir avant celles du matin)
  const fdOrd = (a, b) => (a.date || '').localeCompare(b.date || '') || ((a.ordre != null ? a.ordre : 1e4) - (b.ordre != null ? b.ordre : 1e4)) || (a.sat || a.createdAt || 0) - (b.sat || b.createdAt || 0);
  function feedBuild(tid){
    const c = feedCode(tid), t = R[tid]; if(!c || !t) return 0;
    TS()[ftId(tid)] = c; const out = [];
    // 👥 voyage commun : mes compagnons trouvent mon fil dans le voyage (pour les ❤️ et commentaires de mes abonnés)
    if(M.me && (t.voyageurs || []).length > 1 && TS()[tid] && spaceObj(TS()[tid])){ const co = {id:'fc:' + tid + ':' + M.me, type:'feedco', trip:tid, pid:M.me, code:c}; if(!R[co.id] || R[co.id].deleted || R[co.id].code !== c) out.push(co); }
    // couverture pour les abonnés : ma photo › photo Wikipédia choisie › 1re photo d’un souvenir publié (jamais d’un souvenir privé)
    const cov = t.cover || (t.coverWk ? '' : ((list('souv', x=>x.trip===tid && !x.priv && (x.photos||[]).length).sort((a,b)=>(a.date||'').localeCompare(b.date||''))[0] || {}).photos || [])[0] || '');
    const ct = (t.voyageurs || []).filter(v=>v !== M.me && (M.links || {})[v] && M.links[v].ib && M.links[v].pk).slice(0, 12).map(v=>({pid:v, nom:pname(v), dev:M.links[v].dev, pk:M.links[v].pk, ib:M.links[v].ib}));   // 🙋 les abonnés peuvent leur demander à les suivre
    const head = {id:ftId(tid), type:'feedtrip', ct, oav:myAv(), titre:t.titre || '', debut:t.debut || '', fin:t.fin || '', owner: myName() || 'Moi', team: (t.voyageurs||[]).map(v=>pname(v)).filter(n=>n && n !== '?').slice(0, 30), tids: (t.voyageurs||[]).slice(0, 30), opid: (M.me && prof(M.me)) ? M.me : undefined, pk: (M.fkey && M.fkey.pub) || undefined, cover: cov || '', coverWk: cov ? '' : (t.coverWk || ''), place: tripPlace(t) || '', link: c, blk: ((M.feedBlk||{})[tid] || []).slice(0, 200)};
    if(!R[head.id] || stripStamp(R[head.id]) !== stripStamp(head)) out.push(head);
    const keep = new Set(), first = !R[head.id] || R[head.id].deleted, fresh = [], fpWant = new Set();
    // 🫙 photo dans le pot commun : les abonnés reçoivent son droit de lecture (« fp: »), pas une copie ; sinon, l'ancienne vignette
    const feedPh = p => { const pk = pkOf(p);
      if(!pk){ feedPhotoQ(c, p); return; }
      fpWant.add(p); const fp = {id:'fp:' + p, type:'phk', trip:ftId(tid), s:pk.s, i:pk.i, it:pk.it, k:pk.k, r:pk.r};
      if(!R[fp.id] || R[fp.id].deleted || stripStamp(R[fp.id]) !== stripStamp(fp)) out.push(fp);
      const d = (M.fup || {})[c]; if(d && d[p]){ delete d[p]; (M.fdel = M.fdel || []).push([c, p]); }   // l'ancienne vignette d'abonné ne sert plus
      M.fq = (M.fq || []).filter(x=>!(x[0] === c && x[1] === p)); };
    list('souv', s=>s.trip===tid && !s.priv && ((s.photos||[]).length || (s.texte||'').trim())).forEach(s=>{
      const f = {id:'fd:' + s.id, type:'feed', trip:ftId(tid), src:s.id, by: (t.voyageurs||[]).length > 1 && s.createdBy ? pname(s.createdBy) : '', date:s.date || '', titre:s.titre || '', lieu:s.lieu || '', texte:s.texte || '', photos:(s.photos||[]).slice(0, 2000), lat:s.lat != null ? s.lat : null, lng:s.lng != null ? s.lng : null, cc:s.cc || ''}; if(s.heure) f.heure = s.heure; f.ordre = svMin(s); f.sat = s.createdAt || 0;   // ⏰ abonnés : dans l’ordre de la journée, comme chez moi
      keep.add(f.id); if(!R[f.id] || R[f.id].deleted || stripStamp(R[f.id]) !== stripStamp(f)){ if(!R[f.id] || R[f.id].deleted) fresh.push(f); out.push(f); }
      f.photos.forEach(feedPh);
    });
    if(cov) feedPh(cov);
    list('phk', x=>x.trip === ftId(tid) && /^fp:/.test(x.id) && !fpWant.has(x.id.slice(3))).forEach(x=>out.push(Object.assign(clone(x), {deleted:true})));   // photo plus publiée : plus de droit de lecture
    list('feed', f=>f.trip===ftId(tid) && !keep.has(f.id)).forEach(f=>out.push(Object.assign(clone(f), {deleted:true})));
    const people = feedTrk(tid), fkId = 'fk:' + tid;
    if(people.length){ const fk = {id:fkId, type:'feedtrk', trip:ftId(tid), people, tm:((R['tm:' + tid] || {}).m || {}), pl:lvPlanWins(tid)}; if(!R[fkId] || R[fkId].deleted || stripStamp(R[fkId]) !== stripStamp(fk)) out.push(fk); }
    else if(R[fkId] && !R[fkId].deleted) out.push(Object.assign(clone(R[fkId]), {deleted:true, people:[]}));
    putQuiet(out);
    // 🗺️ la carte 2D/3D des abonnés (si un voyageur l’a choisie) : recalculée en arrière-plan quand le programme change
    try { if(mpOn(tid)) setTimeout(()=>fmCalc(tid), 1500); else fmDel(tid); } catch(e){}
    // 🔗 voyage passé sur un autre lien (republié après une réinstallation, nouveau code…) : tout ce qui n’a pas changé y part aussi,
    // sinon le nouveau lien resterait vide (fiche du voyage, étapes, ❤️ et commentaires déjà là)
    { const B = M.fbC || (M.fbC = {}); if(B[tid] !== c){ B[tid] = c; const fid = ftId(tid); Object.values(R).forEach(r=>{ if(r && !r.deleted && (r.trip === fid || r.id === fid || r.id === fkId)) markDirty(r.id); }); persist(); } }
    // 🔔 nouvelles étapes → les abonnés qui ont l’appli sont prévenus (pas à la 1re publication : tout le voyage arriverait d’un coup)
    if(!first && fresh.length) feedNotify(tid, fresh);
    return out.length;
  }
  // regroupé : on attend 3 min après la dernière étape (le temps d’ajouter les photos), une seule notification
  let fnT = null;
  function feedNotify(tid, posts){
    const q = M.fnq || (M.fnq = {}), a = q[tid] || (q[tid] = []);
    posts.forEach(f=>{ if(!a.includes(f.id)) a.push(f.id); }); if(!M.fnqAt) M.fnqAt = Date.now(); persist();
    clearTimeout(fnT); fnT = setTimeout(feedNotifyGo, 180000);
  }
  async function feedNotifyGo(){
    clearTimeout(fnT); fnT = null; const q = M.fnq || {}; if(!Object.keys(q).length || !pushApi() || !navigator.onLine) return; delete M.fnqAt;
    for(const tid of Object.keys(q)){
      const code = feedCode(tid), t = R[tid], ids = q[tid].filter(id=>R[id] && !R[id].deleted);
      // 📸 abonnés : on attend que les photos de ces souvenirs soient en ligne (au plus ~30 min)
      if(code && (M.fq || []).some(x=>x[0] === code) && (M.fnqTry = (M.fnqTry || 0) + 1) <= 30){ M.fnqAt = M.fnqAt || Date.now(); persist(); clearTimeout(fnT); fnT = setTimeout(feedNotifyGo, 60000); return; }
      M.fnqTry = 0;
      delete q[tid]; persist();
      if(!code || !t || t.deleted || !ids.length) continue;
      try {
        const kk = await keys(code), kid = kk.token.slice(0, 16);
        const it = ids.slice(0, 5).map(id=>{ const f = R[id]; return {x:String(f.titre || f.lieu || '').slice(0, 80)}; });
        // 👥 voyage commun : c’est mon téléphone qui publie, mais le step peut être celui de Claire → son prénom dans la notification
        const by = [...new Set(ids.map(id=>{ const f = R[id], sv = f && R[f.src]; return (sv && sv.createdBy && pname(sv.createdBy)) || (f && f.by) || myName() || ''; }).filter(x=>x && x !== '?'))];
        const p = {k:'souv', f:1, who: by.length ? by.slice(0, 2).join(' & ') : (myName() || ''), trip: ftId(tid), tt: t.titre || '', it, n: ids.length};
        await pushPost(code, {a:'send', kind:'souv', kid, msg: b64(await seal(te.encode(JSON.stringify(p)), code)), tag:'fol-' + tid});
      } catch(e){}
    }
  }
  function feedPhotoQ(code, id){ M.fup = M.fup || {}; const done = M.fup[code] || (M.fup[code] = {}); if(done[id]) return; M.fq = M.fq || []; if(!M.fq.some(x=>x[0]===code && x[1]===id)) M.fq.push([code, id]); }
  let feedUp = false, feedAt = 0;
  async function feedUpload(){
    if((feedUp && Date.now() - feedAt < 240000) || !photoApi()) return;
    // ménage : les grandes photos envoyées aux abonnés par les anciennes versions sont retirées (ils n’ont plus que les vignettes)
    const olds = []; Object.entries(M.fup||{}).forEach(([code, d])=>Object.entries(d).forEach(([id, v])=>{ if(v === 1) olds.push([code, id]); }));
    if(!(M.fq||[]).length && !olds.length) return; feedUp = true; feedAt = Date.now();
    try {
      for(const [code, id] of olds.slice(0, 40)){
        try { const r = await fetch(photoApi() + '?id=' + encodeURIComponent(await sid(id, code)), {method:'DELETE', headers:{'X-Carnet-Code':await authCode(code)}}); if(r.ok || r.status === 404 || r.status === 405) M.fup[code][id] = 2; } catch(e){ break; }
      }
      // les abonnés voient d’abord les étapes récentes : on envoie leurs vignettes en premier
      const dt = {}; list('feed').forEach(f=>(f.photos||[]).forEach(p=>{ if(!(p in dt)) dt[p] = f.date || ''; }));
      const todo = [...(M.fq||[])].sort((a, b)=>(dt[b[1]] || '').localeCompare(dt[a[1]] || ''));
      let left = todo.length, stop = false; const shown = left > 6;
      if(shown) cryptShow('📤 Photos pour tes abonnés… (' + left + ')');
      const one = async ([code, id]) => {
        if(upHalt){ stop = true; return; }   // suppression du serveur en cours : on s’arrête tout de suite
        if(!Object.values(FT()).includes(code)){ M.fq = (M.fq||[]).filter(x=>x[0] !== code); return; }
        // abonnés : uniquement la vignette (≈ 30 à 50 Ko), jamais la grande photo → 2 à 3 fois moins de place sur le serveur
        let tb = null; try { const to = await idbT(id + '.t'); tb = to && to.blob; } catch(e){}
        if(!tb){ let o = null; try { o = await idbT(id); } catch(e){} if(o && o.blob) try { tb = await shrink(o.blob, 480, .74); } catch(e){} }
        if(!tb){ try { tb = await photoBlob(id + '.t'); } catch(e){} }   // photo plus sur ce téléphone : sa vignette du serveur
        if(tb){
          const body = E2E ? new Blob([await seal(new Uint8Array(await tb.arrayBuffer()), code)], {type:'image/jpeg'}) : tb;
          await admPrime(code);
          const r = await fetch(photoApi(), {method:'POST', headers:{'X-Carnet-Code':await authCode(code), 'X-Photo-Id':await sid(id + '.t', code), 'Content-Type':'image/jpeg'}, body});
          if(!r.ok && r.status !== 413){ stop = true; return; }   // réessayé à la prochaine synchro (toutes les minutes, appli ouverte)
        }
        (M.fup[code] = M.fup[code] || {})[id] = 2; M.fq = M.fq.filter(x=>!(x[0]===code && x[1]===id)); left--; feedAt = Date.now();
        if(!(left % 6)){ persist(); if(shown && left) cryptShow('📤 Photos pour tes abonnés… (' + left + ' restante' + (left > 1 ? 's' : '') + ')'); }
      };
      const worker = async () => { while(!stop && todo.length){ try { await one(todo.shift()); } catch(e){ stop = true; } } };
      await Promise.all([worker(), worker(), worker()]);
      if(shown) cryptHide(left ? '⏳ Photos des abonnés : la suite part à la prochaine synchro' : '👀 Photos envoyées à tes abonnés');
    } catch(e){} finally { feedUp = false; persist(); }
  }
  // vignettes d’un voyage dont la publication est arrêtée : effacées du serveur (4 à la fois, reprend à la prochaine synchro si coupé)
  let feedDel = false;
  async function feedPurge(){
    if(feedDel || !((M.fdel||[]).length || (M.fwipe||[]).length) || !photoApi()) return; feedDel = true;
    try {
      // dossier photos entier d'une publication arrêtée : une seule requête (serveur récent) ; sinon, photo par photo
      for(const code of [...(M.fwipe||[])]){
        try { const r = await fetch(photoApi() + '?all=1', {method:'DELETE', headers:{'X-Carnet-Code':await authCode(code)}});
          if(r.ok){ M.fwipe = M.fwipe.filter(x=>x !== code); M.fdel = (M.fdel||[]).filter(x=>x[0] !== code); persist(); }
          else if(r.status === 400 || r.status === 404 || r.status === 405){ M.fwipe = M.fwipe.filter(x=>x !== code); persist(); }
        } catch(e){ break; }
      }
      while((M.fdel||[]).length){
        const batch = M.fdel.slice(0, 4); let ok = true;
        await Promise.all(batch.map(async ([code, id])=>{ try { const r = await fetch(photoApi() + '?id=' + encodeURIComponent(await sid(id + '.t', code)), {method:'DELETE', headers:{'X-Carnet-Code':await authCode(code)}});
          if(!r.ok && r.status !== 404 && r.status !== 405) ok = false; } catch(e){ ok = false; } }));
        if(!ok) break; M.fdel = M.fdel.slice(batch.length); if(!(M.fdel.length % 40)) persist();
      }
    } finally { feedDel = false; persist(); }
  }
  // 🧹 ménage : les abonnés voient exactement les voyages publiés qui existent encore chez moi
  //   1) voyage publié puis supprimé / dédoublonné / remplacé à l’import → sa publication est retirée
  //   2) restes en ligne d’un ancien voyage (ancien identifiant) sous un de mes liens abonné → retirés aussi
  let feedFixAt = 0;
  async function feedReconcile(){
    if(Date.now() - feedFixAt < 60000 || !Object.keys(FT()).length || !list('trip').length) return 0; feedFixAt = Date.now();
    let n = 0;
    for(const tid of Object.keys(FT())){ const t = R[tid]; if(!t || t.deleted || t.demo || t.type !== 'trip'){ await feedStop(tid, true); n++; } }
    const mine = new Set(Object.values(FT())), out = [], dels = [];
    list('feedtrip', f=>mine.has(TS()[f.id]) && FT()[String(f.id).replace(/^ft:/,'')] !== TS()[f.id]).forEach(f=>{
      const c = TS()[f.id], posts = Object.values(R).filter(r=>r && !r.deleted && r.trip === f.id);
      posts.forEach(r=>{ out.push(Object.assign(clone(r), {deleted:true})); (r.photos||[]).forEach(p=>{ if(((M.fup||{})[c]||{})[p]) dels.push([c, p]); }); });
      out.push(Object.assign(clone(f), {deleted:true})); delete TS()[f.id]; n++; });
    if(out.length){ putQuiet(out); M.fdel = (M.fdel||[]).concat(dels); persist(); try { await syncNow(); } catch(e){} feedPurge(); }
    return n;
  }
  // ✍️ la clé d’auteur est prête AVANT d’envoyer ou de supprimer des photos du fil
  function feedAll(){ return admPrimeAll().catch(()=>{}).then(feedAll0); }
  function feedAll0(){ try { ab2Reset(); ab2CfgLoad(); } catch(e){} if(!M.fkey) fKey().catch(()=>{}); feedGrantAll().catch(()=>{}); feedPurge(); Object.keys(FT()).forEach(tid=>{ if(R[tid] && !R[tid].deleted) feedBuild(tid); }); if(Object.keys(M.fnq||{}).length){ if(Date.now() - (M.fnqAt || 0) > 180000) feedNotifyGo(); else if(!fnT) fnT = setTimeout(feedNotifyGo, 180000); } feedUpload(); feedReconcile().then(n=>{ if(n) refresh(); }).catch(()=>{}); oldLinkAdopt().catch(()=>{}); }
  setInterval(()=>{ if(document.visibilityState === 'visible' && Object.keys(FT()).length) feedAll(); }, 60000);
  setTimeout(feedAll, 5000);
  // 📣 iPhone : l’appli fermée ou mise en arrière-plan avant les 3 min, la notification « nouvelle étape » partait jamais → envoyée en quittant l’appli
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'hidden' && Object.keys(M.fnq||{}).length) feedNotifyGo(); });
  async function feedPublish(tid, solo){ { const t = R[tid || M.trip]; if(!t || t.demo) return; if(FT()[t.id] !== ab2C() || !ab2C()) await ab2TripSet(t.id, true); return ab2Invite(); }
    const t = R[tid || M.trip]; if(!t || t.demo) return;
    // un lien existe déjà (pour plusieurs voyages ?) : on le propose plutôt que d’en créer un nouveau
    if(!solo && !feedCode(t.id) && Object.keys(abGroups()).length) return abPick();
    try { await fKey(); } catch(e){}
    if(!myName()){ const n = (await uiPrompt('Ton prénom (affiché à tes abonnés) :', '')); if(!n || !n.trim()) return; M.followName = n.trim(); }
    if(!solo && !feedCode(t.id) && M.feedAll && spaceObj(M.feedAll)){ FT()[t.id] = M.feedAll; persist(); setTimeout(()=>{ try { pushRegister(true); } catch(e){} }, 2500); }
    if(!feedCode(t.id)){
      if(!(await uiConfirm(`Publier « ${t.titre} » pour des abonnés ?\n\nIls verront uniquement les souvenirs : photos, titres, lieux et récits. Le programme, les réservations, le budget et les documents restent privés.\nUn souvenir marqué « privé » n’est jamais publié.\nIls voient les photos en vignettes (taille réduite).\nTa position n’est jamais montrée, sauf si chaque voyageur l’active lui-même dans le suivi du voyage.\nIls pourront mettre des ❤️ et des commentaires.`))) return;
      const c = genCode(); (M.spaces = M.spaces || []).push({code:c, since:0, dirty:[], last:0, err:''}); FT()[t.id] = c; persist(); setTimeout(()=>{ try { pushRegister(true); } catch(e){} }, 2500);
    }
    feedBuild(t.id); await syncNow(); feedUpload();
    if(followInviteSheet(t.id)){ refresh(); return; }
    return feedShareLink(t.id);
  }
  // lien pour UN voyage du carnet publié : le voyage passe sur son propre code ; les abonnés du carnet le gardent (code transmis chiffré)
  async function feedShareOne(tid){ return ab2Invite();
    const t = R[tid]; if(!t || !FT()[tid]) return;
    const g = grpCodeOf(tid), shared = Object.keys(FT()).some(x=>x !== tid && grpCodeOf(x) === g && FT()[x] === FT()[tid]);
    if(shared){
      if(!(await uiConfirm(MSGT('Créer un lien pour « {0} » seulement ?').replace('{0}', t.titre) + '\n\n' + MSGT('La personne qui le reçoit ne verra que ce voyage. Tes abonnés du carnet continuent de le voir comme avant.')))) return;
      try { await feedRestrict(tid, ''); await feedGrantSync(tid); await syncNow(); feedUpload(); } catch(e){ alert(MSGT('Lien impossible pour le moment (pas de réseau ?).')); return; }
    }
    return feedShareLink(tid);
  }
  async function feedShareLink(tid){ return ab2Invite();
    const t = R[tid]; if(!t || !FT()[t.id]) return;
    const link = appUrl() ? appUrl() + '#suivre=' + encodeURIComponent(FT()[t.id]) : '';
    const MSG = x => (window.I18N && I18N.msg ? I18N.msg(x) : x);
    const text = MSG(`Suis mon voyage « ${t.titre} » sur Vezoria ✈️ : photos et récits au fil des étapes`) + fwTail(link, FT()[t.id]);
    fwInviteSheet(FT()[t.id], link, text, t.titre || MSGT('Inviter des abonnés'));
  }
  async function feedStop(tid, silent){ if(!silent && !(await uiConfirm(MSGT('Masquer ce voyage à tous tes abonnés ?')))) return; await ab2TripOff(tid); ab2CfgSave(); ab2Repaint(); return;
    const c = FT()[tid]; if(!c) return;
    if(R[tid] && M.me && R[tid].pubBy === M.me) putQuiet([Object.assign(clone(R[tid]), {pubBy:'', pubCode:''})]);
    if(FRX()[tid]){ const gr = list('feedgrant', x=>x.tid === tid); if(gr.length) putQuiet(gr.map(x=>Object.assign(clone(x), {deleted:true}))); delete FRX()[tid]; persist(); }
    if(!silent && !(await uiConfirm('Arrêter la publication ? Tes abonnés ne verront plus ce voyage.'))) return;
    const out = list('feed', f=>f.trip===ftId(tid)).map(f=>Object.assign(clone(f), {deleted:true})); if(R[ftId(tid)]) out.push(Object.assign(clone(R[ftId(tid)]), {deleted:true}));
    // carnet publié : d’autres voyages utilisent le même lien → seules les photos de CE voyage partent, le lien reste
    if(Object.entries(FT()).some(([k, x])=>k !== tid && x === c)){
      const ids = new Set(list('feed', f=>f.trip===ftId(tid)).flatMap(f=>(f.photos||[]).map(String)));
      putQuiet(out); delete FT()[tid]; delete TS()[ftId(tid)];
      M.fdel = (M.fdel||[]).concat(Object.keys((M.fup||{})[c] || {}).filter(id=>ids.has(String(id).replace(/\.t$/, ''))).map(id=>[c, id]));
      persist(); syncNow().then(()=>{ refresh(); feedPurge(); }); if(!silent) toast('👀 Publication arrêtée'); return;
    }
    putQuiet(out); syncNow().then(()=>{ delete FT()[tid]; delete TS()[ftId(tid)]; M.spaces = (M.spaces||[]).filter(x=>x.code !== c); if(M.feedAll === c) delete M.feedAll;
      M.fdel = (M.fdel||[]).concat(Object.keys((M.fup||{})[c] || {}).map(id=>[c, id])); if(M.fup) delete M.fup[c]; M.fq = (M.fq||[]).filter(x=>x[0] !== c);
      M.fwipe = (M.fwipe||[]).concat([c]);   // et on vide tout le dossier photos des abonnés sur le serveur (même les vignettes non notées)
      persist(); refresh(); feedPurge(); });
    toast('👀 Publication arrêtée');
  }
  // 🔁 publications retrouvées : un voyage suivi via ce code est en fait le mien (même voyage, publié à mon nom) → il redevient « publié par moi »
  const ownFt = ft => { const tid = String(ft.id).replace(/^ft:/, ''), t = R[tid]; if(!(t && t.type === 'trip' && !t.deleted && !t.demo && M.me)) return false;
    const me0 = String(myName() || '').trim().toLowerCase();
    if(ft.opid){ if(ft.opid === M.me) return true; const o = R[ft.opid];   // publié par mon profil, ou par mon ancien profil fusionné depuis (même prénom)
      return !!(o && o.type === 'profile' && o.deleted && me0 && String(o.nom || '').trim().toLowerCase() === me0); }
    return !!me0 && String(ft.owner || '').trim().toLowerCase() === me0; };
  function pubAdopt(code){ return 0;
    let n = 0; Object.entries(TS()).forEach(([k, c])=>{ if(c !== code || !/^ft:/.test(k)) return; const ft = R[k]; if(!ft || ft.deleted || ft.type !== 'feedtrip' || !ownFt(ft)) return;
      const tid = k.slice(3); if(FT()[tid] === code) return; FT()[tid] = code; n++; setTimeout(()=>{ try { feedBuild(tid); } catch(e){} }, 1500);
      list('follower', f=>f.trip === k && String(f.id).endsWith(':' + devId())).forEach(f=>putQuiet([Object.assign(clone(f), {deleted:true})])); });   // je ne me suis pas moi-même
    if(n && M.unfol) Object.keys(M.unfol).forEach(k=>{ if(TS()[k] === code) delete M.unfol[k]; });
    return n;
  }
  // 🔗 ancien lien abonnés encore en ligne (signalé par un abonné qui suit les deux) : je récupère ce qui y a été écrit (commentaires, ❤️, abonnés),
  // je fais passer les abonnés restés dessus sur mon lien actuel (nouveau lien chiffré pour chacun), puis l’ancien lien est vidé
  let olBusy = false;
  async function oldLinkAdopt(){ return;
    if(olBusy || !apiUrl()) return; const done = M.olDone || (M.olDone = {}), mineC = new Set(Object.values(FT()).filter(Boolean)), me = devId();
    const L = list('oldlink', x=>!x.deleted && x.code && !done[x.code] && !mineC.has(x.code) && FT()[String(x.trip).replace(/^ft:/, '')]); if(!L.length) return;
    olBusy = true;
    try { for(const code of [...new Set(L.map(x=>x.code))]){
      let j; try { j = await call(0, [], code); } catch(e){ continue; }
      done[code] = Date.now(); persist();
      const recs = (j.records || []).filter(r=>r && r.id && !r.deleted);
      const tids = [...new Set(recs.filter(r=>r.type === 'feedtrip' && FT()[String(r.id).slice(3)]).map(r=>String(r.id).slice(3)))]; if(!tids.length) continue;
      const ids = new Set(tids.map(ftId)); tids.forEach(t=>{ TS()[ftId(t)] = FT()[t]; });
      const keep = recs.filter(r=>ids.has(r.trip) && (r.type === 'comment' || r.type === 'like' || r.type === 'follower'));
      mergeRemote(keep); keep.forEach(r=>{ if(R[r.id]) markDirty(r.id); });
      const cnt = {}; tids.forEach(t=>{ cnt[FT()[t]] = (cnt[FT()[t]] || 0) + 1; }); const nc = Object.keys(cnt).sort((a, b)=>cnt[b] - cnt[a])[0];
      const byDev = {}; keep.filter(r=>r.type === 'follower').forEach(f=>{ const d = String(f.id).split(':').pop(); if(d !== me && !(M.blkDev||{})[d]) byDev[d] = (byDev[d] && byDev[d].pk) ? byDev[d] : f; });
      const withKey = Object.values(byDev).filter(f=>f.pk), noKey = Object.values(byDev).filter(f=>!f.pk), k = await fKey(), env = [], now = Date.now();
      for(const f of withKey){ const d = String(f.id).split(':').pop();
        try { const key = await fShared(k.priv, f.pk), iv = crypto.getRandomValues(new Uint8Array(12));
          const ct = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, new TextEncoder().encode(nc)));
          env.push({id:'fx:' + d, type:'feedmove', trip:ftId(tids[0]), dev:d, opk:k.pub, iv:b64(iv), ct:b64(ct), at:now, updatedAt:now}); } catch(e){} }
      // pas de fiches « supprimées » sur l’ancien lien (elles effaceraient aussi les mêmes souvenirs du lien actuel chez l’abonné) :
      // il est effacé d’un coup du serveur dans 2 mois, le temps que chacun soit passé
      try { if(env.length) await call(now, env, code); } catch(e){}
      if(!noKey.length && !(M.fold || []).some(x=>x.code === code)) (M.fold = M.fold || []).push({code, at:now});
      persist(); try { await syncNow(); } catch(e){}
      toast('🔗 ' + RF('Ancien lien abonnés retrouvé : {0} commentaire(s) récupéré(s).', keep.filter(r=>r.type === 'comment').length) + (noKey.length ? ' ' + RF('{0} abonné(s) doivent recevoir ton lien actuel.', noKey.length) : ''));
      refresh();
    } } finally { olBusy = false; }
  }
  // 📱📱 mes publications, partagées entre MES téléphones (fiche chiffrée dans le carnet principal) :
  // si un téléphone a oublié ses liens d'abonnés (réinstallation, plantage…), il les reprend chez l'autre
  let pmBusy = false;
  async function pubMapSync(){
    if(pmBusy || !(M.sync.on && M.sync.code) || !M.me) return; pmBusy = true;
    try {
      const id = 'pm:' + devId(), cur = R[id], map = Object.assign({}, FT());
      if(Object.keys(map).length && (!cur || cur.deleted || JSON.stringify(cur.map || {}) !== JSON.stringify(map))) putQuiet([{id, type:'pubmap', map, by:M.me}]);
      const want = {}; list('pubmap', r=>r.id !== id && r.by === M.me && r.map).forEach(r=>Object.entries(r.map).forEach(([tid, c])=>{ const t = R[tid]; if(t && t.type === 'trip' && !t.deleted && !FT()[tid] && c) want[tid] = c; }));
      let n = 0;
      for(const [tid, c] of Object.entries(want)){
        let sp = spaceObj(c), added = false; if(!sp){ (M.spaces = M.spaces || []).push({code:c, since:0, dirty:[], last:0, err:''}); sp = spaceObj(c); added = true; }
        try { sp.since = 0; await syncSpace(sp, true); } catch(e){}
        const ft = R[ftId(tid)];
        if(ft && !ft.deleted){ FT()[tid] = c; TS()[ftId(tid)] = c; n++; }
        else if(added){ M.spaces = M.spaces.filter(x=>x.code !== c); }   // publication arrêtée depuis : on n'y touche pas
      }
      // liens encore connus sur CE téléphone (voyages suivis qui sont en fait les miens)
      [...new Set(Object.entries(TS()).filter(([k])=>/^ft:/.test(k)).map(([, c])=>c))].forEach(c=>{ n += pubAdopt(c); });
      if(n){ persist(); toast('🔁 ' + RF('Tes abonnés sont retrouvés : {0} voyage(s).', n)); refresh(); }
    } finally { pmBusy = false; }
  }
  // côté abonné
  async function followGo(code, web){ return ab2Follow(code, web);
    code = String(code || '').trim().toUpperCase(); if(code.length < 8){ alert('Code trop court.'); return; }
    if(!myName() && !web){ const n = (await uiPrompt('Ton prénom (pour signer tes ❤️ et commentaires) :', '')); if(!n || !n.trim()) return; M.followName = n.trim(); }
    const isNew = !spaceObj(code); if(isNew) (M.spaces = M.spaces || []).push({code, since:0, dirty:[], last:0, err:''});
    // 🔁 je reviens sur ce lien (après « Ne plus suivre ») : ses voyages masqués reviennent, avant de relire le lien
    { const un = M.unfol || {}, UT = M.unfolT || {}; Object.keys(un).forEach(k=>{ if(un[k] === 1 && (TS()[k] === code || (UT[k] && UT[k].code === code))){ delete un[k]; delete UT[k]; } }); }
    toast('📡 Connexion…'); const sp = spaceObj(code); sp.since = 0; M._mateSkip = 0; await syncSpace(sp, true);
    if(sp.err && sp.net){ if(isNew){ M.spaces = M.spaces.filter(x=>x !== sp); persist(); } alert('📴 ' + netMsg()); return; }
    if(M.unfol) Object.keys(TS()).forEach(k=>{ if(TS()[k] === code) delete M.unfol[k]; });   // je suis à nouveau ce lien : ses voyages reviennent
    if(sp.err){ alert('⚠️ ' + sp.err); return; }
    const ft = Object.entries(TS()).filter(([k,c])=>c===code && R[k] && R[k].type==='feedtrip' && !R[k].deleted).map(([k])=>R[k])[0];
    if(!ft && M._mateSkip){ persist(); alert(MSGT('Tu as déjà tous ces voyages : tu les fais en compagnon. Tu verras ici les prochains voyages publiés que tu ne fais pas.')); return; }
    if(!ft){ M.spaces = M.spaces.filter(x=>x.code!==code); persist(); alert(MSGT('Aucun voyage publié avec ce code.') + '\n\n' + MSGT('Ce lien n’est peut-être plus le bon (voyage republié sur un nouveau lien). Demande à un abonné de te renvoyer le lien actuel : ⋯ sur une publication → « Renvoyer le lien ».')); if(web) webGone(); return; }
    // 🔁 c'est MON lien (j'en suis l'auteur, ce téléphone l'avait oublié) : je reprends la main au lieu de m'abonner à moi-même
    { const n = pubAdopt(code); if(n){ persist(); closeSheet(true); toast('🔁 ' + RF('Tes abonnés sont retrouvés : {0} voyage(s).', n)); syncNow(); try { shareHub(); } catch(e){} return; } }
    if(web) M.webCode = code;
    let pk; try { pk = (await fKey()).pub; } catch(e){}
    if(myName() && !(M.fwChk = M.fwChk || {})[code]){ M.fwChk[code] = 1; const r = await fwNameResolve(myName()); if(r && r.n !== myName()) (M.fwAs = M.fwAs || {})[code] = r.n; }
    const fw = {id:'fw:' + ft.id + ':' + devId(), type:'follower', pid:fwPid(), trip:ft.id, who: fwAsFor(code) || 'Un proche', pk}; if(!R[fw.id] || R[fw.id].deleted){ putQuiet([fw]); socialPush(ft.id, 'follow', ''); }   // revenu après « Ne plus suivre » : la fiche d’abonné effacée renaît (l’auteur te revoit)
    persist(); syncNow(); closeSheet(true); feedView(ft.id); toast('👀 Tu suis « ' + ft.titre + ' »');
  }
  function followSheet(){
    const fl = list('feedtrip', f=>TS()[f.id] && !FT()[f.id.replace(/^ft:/,'')]);
    openSheet(`<h2>👀 Voyages que je suis</h2>
      ${fl.map(f=>{ const n = list('feed', x=>x.trip===f.id).length; return `<button type="button" class="cv-prow" onclick="CV.feedView('${ja(f.id)}')"><span><b>${esc(f.titre)}</b><small style="display:block" class="v-sum-small">par ${esc(ftTeamTxt(f))} · ${n} étape${n>1?'s':''}</small></span><span>›</span></button>`; }).join('') || '<div class="v-sum-small" style="margin-bottom:8px">Tu ne suis aucun voyage pour l’instant.</div>'}
      <div class="v-f" style="margin-top:10px"><label>Suivre un voyage avec un code abonné</label>${qrBtn('fw-code')}<div class="cv-row"><input class="v-in" id="fw-code" placeholder="XXXX-XXXX-XXXX" autocapitalize="characters" autocomplete="off"><button type="button" class="fd-send" onclick="CV.followGo(document.getElementById('fw-code').value)">Suivre</button></div></div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  // ---------- 👥 Nouveautés sociales (❤️, 💬, abonnés, nouvelles étapes) + fenêtre « Abonnés & abonnements » ----------
  function socEvents(day){   // day : tout ce qui est arrivé ces dernières 24 h (les non vues sont marquées « nw »)
    if(M.socSeen == null){ M.socSeen = Date.now(); persist(); }
    const seen0 = M.socSeen, seen = day ? Math.min(seen0, Date.now() - 864e5) : seen0, me = devId(), nm = myName();
    const mine = new Set([...Object.keys(FT()), ...myTrips().filter(t=>mateCode(t.id)).map(t=>t.id)].map(ftId)), fol = new Set(list('feedtrip', f=>TS()[f.id] && !mine.has(f.id)).map(f=>f.id)), out = [];
    for(const r of Object.values(R)){
      if(!r || r.deleted || !r.trip || !(mine.has(r.trip) || fol.has(r.trip)) || isBlk(r)) continue;
      const t = r.updatedAt || r.createdAt || 0; if(t <= seen) continue;
      if(r.type === 'like' && r.on && mine.has(r.trip) && !r.id.endsWith(':' + me)) out.push({k:'like', r, t});
      else if(r.type === 'comment' && (r.dev ? r.dev !== me : r.who !== nm)) out.push({k:'comment', r, t});
      else if(r.type === 'follower' && mine.has(r.trip) && !r.id.endsWith(':' + me) && (r.createdAt||0) > seen) out.push({k:'follower', r, t});
      else if(r.type === 'feed' && fol.has(r.trip) && (r.createdAt||0) > seen) out.push({k:'post', r, t});
    }
    out.forEach(e=>{ e.nw = e.t > seen0; });
    return out.sort((a,b)=>b.t-a.t);
  }
  function socPill(){
    const btns = document.querySelector('.hero-btns'); if(!btns) return;
    const any = Object.keys(FT()).length || list('feedtrip', f=>TS()[f.id]).length || Object.keys(TS()).length;
    let b = document.getElementById('cv-socpill');
    if(!b){ b = document.createElement('button'); b.type = 'button'; b.id = 'cv-socpill'; b.className = 'cv-syncpill cv-socpill'; b.onclick = () => CV.shareHub(); const sp = document.getElementById('cv-syncpill'); sp ? sp.after(b) : btns.prepend(b); }
    const n = socEvents().length, h = `<span>👥</span><small>Partager</small>${n ? `<b class="cv-badge">${n > 99 ? '99+' : n}</b>` : ''}`;
    if(b.dataset.h !== h){ b.dataset.h = h; b.innerHTML = h; b.setAttribute('aria-label', n ? n + ' nouveauté(s)' : 'Partager'); }
  }
  // 📊 les 3 compteurs de l’en-tête ouvrent chacun SA partie : abonnés · j’aime et commentaires · ceux que je suis
  const hubQuick = () => `<div class="hub-q"><button type="button" class="v-btn sec" onclick="CV.joinAny()">🔗 ${esc(MSGT('J’ai reçu une invitation'))}</button><button type="button" class="v-btn sec" onclick="CV.shareHub()">📤 ${esc(MSGT('Je partage un code'))}</button></div>`;
  function socialHub(k){
    if(k === 'fw') return openSheet(`<div class="sp2" data-live="hubfw">${hubQuick()}${ab2AbHTML()}</div>`);
    if(k === 'fo'){ const h = ab2SuisHTML(); return openSheet(`<div class="sp2" data-live="hubfo">${hubQuick()}${h || `<div class="sp2-card"><div class="sp2-empty">${esc(MSGT('Tu ne suis encore personne. Quand quelqu’un t’envoie son lien d’abonné, colle-le avec « J’ai reçu une invitation ».'))}</div></div>`}</div>`); }
    if(k === 'lk') return socReacts();
    shareHub();
  }
  // ❤️💬 tout ce que les gens ont aimé ou commenté sur mes voyages : rangé par voyage, puis par étape, puis par personne
  function socReacts(){
    const me = devId(), mine = socMineFt();
    const cmp = (a, b) => String(a).localeCompare(String(b), undefined, {sensitivity:'base', numeric:true});
    const L = [...list('like', l=>mine.has(l.trip) && l.on && !isBlk(l) && !String(l.id).endsWith(':' + me)).map(l=>({k:'lk', r:l})),
               ...list('comment', c=>mine.has(c.trip) && !isBlk(c) && c.dev !== me).map(c=>({k:'cm', r:c}))];
    const T = {}; L.forEach(x=>{ const tid = String(x.r.trip).replace(/^ft:/, ''), t = R[tid] || {}, post = R[x.r.feed] || {};
      const sid = post.src || String(x.r.feed || '').replace(/^fd:/, ''), sv = R[sid] && R[sid].type === 'souv' ? R[sid] : {};   // 🧳 compagnon : la publication n’est pas chez lui, le souvenir si
      const tk = t.titre || '?', pk = post.titre || post.lieu || sv.titre || sv.lieu || (post.date || sv.date ? fdate(post.date || sv.date) : MSGT('Le voyage'));
      const TT0 = T[tk] || (T[tk] = {}), P = TT0[pk] || (TT0[pk] = {}), who = String(x.r.who || '?').replace(/^🧳\s*/, ''); if(R[sid] && !P._sid) Object.defineProperty(P, '_sid', {value:sid, enumerable:false}); (P[who] = P[who] || []).push(x); });
    const tks = Object.keys(T).sort(cmp);
    openSheet(`<div class="sp2" data-live="hublk">${hubQuick()}<h2>❤️ ${esc(MSGT('J’aime et commentaires'))}</h2>
      ${tks.length ? tks.map(tk=>`<div class="sh-sec">🧳 <span data-notr>${esc(tk)}</span></div><div class="sp2-card">${Object.keys(T[tk]).sort(cmp).map(pk=>{ const sid = T[tk][pk]._sid, go = sid ? `CV.rxGo('${ja(sid)}')` : ''; return `<div class="rx-step">${go ? `<button type="button" class="rx-go" onclick="${go}"><b data-notr>📍 ${esc(pk)}</b><span>›</span></button>` : `<b data-notr>📍 ${esc(pk)}</b>`}
        ${Object.keys(T[tk][pk]).sort(cmp).map(w=>{ const xs = T[tk][pk][w], lk = xs.some(x=>x.k === 'lk'), cms = xs.filter(x=>x.k === 'cm').sort((a, b)=>(a.r.at || 0) - (b.r.at || 0));
          return `<div class="rx-p">${go ? `<button type="button" class="rx-w" onclick="${go}">` : '<span class="rx-w">'}<b data-notr>${esc(w)}</b>${lk ? ' ❤️' : ''}${go ? '</button>' : '</span>'}${cms.map(x=>`<button type="button" class="rx-c" onclick="${go || `CV.cmMenu('${ja(x.r.id)}')`}">💬 <span data-notr>${esc(String(x.r.text || '').slice(0, 160))}</span></button>`).join('')}</div>`; }).join('')}</div>`; }).join('')}</div>`).join('')
        : `<div class="sp2-card"><div class="sp2-empty">${esc(MSGT('Pas encore de j’aime ni de commentaire sur tes voyages.'))}</div></div>`}</div>`);
  }
  // 👉 depuis « J’aime et commentaires » : le souvenir concerné, avec ses ❤️ et tout le fil de commentaires (auteur comme compagnon)
  function rxGo(sid){ if(!R[sid]) return; closeSheet(true); setTimeout(()=>souvComments(sid), 60); }
  // ➡️ Les voyages que je suis : en haut, rangés par personne (A → Z), chaque personne se déplie sur ses voyages
  function followHTML(){
    const fol = list('feedtrip', f=>TS()[f.id] && !FT()[f.id.replace(/^ft:/,'')] && !f.deleted); if(!fol.length) return '';
    const nw = {}; socEvents().forEach(e=>{ if(e.k === 'post') nw[e.r.trip] = (nw[e.r.trip]||0) + 1; });
    const G = {}; fol.forEach(f=>{ const n = String(f.owner||'').trim() || '?', k = n.toLocaleLowerCase(); (G[k] = G[k] || {n, t:[]}).t.push(f); });
    const gs = Object.values(G).sort((a,b)=>a.n.localeCompare(b.n, undefined, {sensitivity:'base', numeric:true})), many = gs.length > 3;
    const row = f => folTile(f, nw[f.id] || 0), row0 = f => { const n = list('feed', x=>x.trip===f.id && !x.deleted).length, k = nw[f.id] || 0;
      return `<div class="cv-folr"><button type="button" class="cv-prow" onclick="CV.feedView('${ja(f.id)}')"><span><b data-notr>${esc(f.titre)}</b><small class="v-sum-small" style="display:block">${f.debut ? `<span>${esc(tripDates(f))}</span> · ` : ''}<span>${n} étape${n>1?'s':''}</span></small></span>${k ? `<b class="cv-badge">${k}</b>` : ''}<span>›</span></button><button type="button" class="cv-x" title="Ne plus suivre" onclick="CV.feedUnfollow('${ja(f.id)}')" aria-label="Ne plus suivre">✕</button></div>`; };
    return folLiveHTML(fol) + `<div class="sh-sec">➡️ Les voyages que je suis</div><div class="sh-card cv-folw">
      ${gs.length > 6 ? `<input type="search" class="v-in" style="margin-bottom:8px" placeholder="🔎 Chercher une personne ou un voyage" oninput="CV.folFilter(this)">` : ''}
      <div class="sh-st" style="margin-bottom:6px"><span>👥 ${gs.length} personne${gs.length>1?'s':''}</span><span>🧳 ${fol.length} voyage${fol.length>1?'s':''}</span></div>
      ${gs.map(g=>{ g.t.sort((a,b)=>(b.debut||'').localeCompare(a.debut||'')); const k = g.t.reduce((s, f)=>s + (nw[f.id]||0), 0);
        return `<details class="cv-folg" data-q="${esc((g.n + ' ' + g.t.map(f=>f.titre).join(' ')).toLocaleLowerCase())}"${many && !k ? '' : ' open'}><summary><i data-notr>${esc((g.n.match(/\p{L}|\d/u)||['?'])[0].toUpperCase())}</i><b data-notr>${esc(g.n)}</b><small>${g.t.length} voyage${g.t.length>1?'s':''}</small>${k ? `<b class="cv-badge">${k}</b>` : ''}</summary><div class="fol-grid">${g.t.map(row).join('')}</div>${g.t.length > 1 ? `<button type="button" class="v-day-edit cv-folall" onclick="CV.feedUnfollow('${ja(g.t[0].id)}',1)">🚫 Ne plus suivre <span data-notr>${esc(g.n)}</span></button>` : ''}</details>`; }).join('')}
      <div class="v-sum-small cv-folnone" style="display:none">Personne ne correspond.</div></div>`;
  }
  // 🛰️ en haut des voyages suivis : ceux où quelqu’un partage sa position en ce moment (ou voyage en cours avec une route)
  function folLiveHTML(fol){
    try {
      const L = (fol || list('feedtrip', f=>TS()[f.id] && !FT()[f.id.replace(/^ft:/,'')] && !f.deleted)).map(f=>{ const r = feedTrkRec(f.id);
        const live = r ? r.people.filter(p=>Date.now() - fkLast(p) < LIVE_MS) : [], cur = f.debut && tripPhase(f) === 'live'; if(!live.length && !cur) return null;
        return {f, r, live, at: r ? Math.max(...r.people.map(fkLast)) : 0}; }).filter(Boolean).sort((a, b)=>b.live.length - a.live.length || b.at - a.at);
      const sig = L.map(x=>x.f.id + x.live.map(p=>p.n + fkLast(p)).join()).join('|');
      const AK = liveAllKeys(), all = AK.length >= 2 ? `<button type="button" class="lv-go lv-all on" onclick="CV.liveOpen('*all')"><span class="lv-dot"><i></i></span><span class="tx"><b>🌍 ${esc(MSGT('Tout le monde en direct'))}</b><small>${esc(RF('{0} voyage(s) en cours', AK.length))} · ${esc(MSGT('une seule carte'))}</small></span><span class="lv-ar">›</span></button>` : '';
      if(!L.length && !all) return `<div class="cv-follive" data-sg=""></div>`;
      return `<div class="cv-follive" data-sg="${esc(sig + '#' + AK.join())}"><div class="sh-sec">🛰️ En ce moment</div>${all}${L.slice(0, 6).map(x=>liveBtnHTML(x.f.id, x.live.map(p=>p.n), x.r ? x.r.people.length : 0, x.f.titre)).join('')}</div>`;
    } catch(e){ return ''; }
  }
  // la page des voyages suivis reste à jour toute seule (toutes les 30 s)
  setInterval(async ()=>{
    const el = document.querySelector('.cv-follive'); if(!el || document.visibilityState !== 'visible' || document.getElementById('cv-feed') && !document.querySelector('#cv-feed.fd-home')) return;
    try { await syncNow(); } catch(e){}
    const el2 = document.querySelector('.cv-follive'); if(!el2) return; const h = folLiveHTML();
    const t = document.createElement('div'); t.innerHTML = h; const n = t.firstElementChild; if(n && n.dataset.sg !== el2.dataset.sg) el2.replaceWith(n);
  }, 30000);
  // une vignette photo par voyage suivi : on touche la photo pour l’ouvrir
  function folTile(f, k){
    const n = list('feed', x=>x.trip===f.id && !x.deleted).length, p = !f.debut ? 'prep' : tripPhase(f);
    const img = f.cover ? `<img data-ph="${esc(f.cover)}.t" alt="">` : f.coverWk ? `<img src="${esc(f.coverWk)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : '';
    return `<div class="fol-t"><button type="button" class="fol-c" style="--tg:${TC_GRAD[p]}" data-fid="${esc(f.id)}" onclick="CV.feedView('${ja(f.id)}')"><span class="fol-im">${img}</span>
        ${k ? `<b class="cv-badge">${k}</b>` : ''}${(()=>{ const r = feedTrkRec(f.id); return r && r.people.some(p=>Date.now() - fkLast(p) < LIVE_MS) ? '<span class="fol-live"><i></i>EN DIRECT</span>' : ''; })()}<span class="fol-tx"><b data-notr>${esc(f.titre)}</b><small>${f.debut ? `<span data-notr>${esc(tripDates(f))}</span> · ` : ''}<span>${n} étape${n>1?'s':''}</span></small></span></button>
      <button type="button" class="fol-x" title="Ne plus suivre" aria-label="Ne plus suivre" onclick="CV.feedUnfollow('${ja(f.id)}')">✕</button></div>`;
  }
  // couvertures automatiques des voyages suivis (photo Wikipédia de la destination, gardée en mémoire)
  function folPaint(root){
    (root || document).querySelectorAll('.fol-c[data-fid], .sp2-tc[data-fid]').forEach(async b=>{
      const f = R[b.dataset.fid], im = b.querySelector('.fol-im') || (b.classList.contains('sp2-tc') ? b : null); if(!f || !im || im.querySelector('img') || !f.place) return;
      const C = M.tripImg || (M.tripImg = {}), c = C[f.id]; let u = '';
      if(c && c.q === f.place && (c.u || Date.now() - (c.at || 0) < 3 * 864e5)) u = c.u; else { u = await wkPhoto(f.place); C[f.id] = {q:f.place, u, at:Date.now()}; persist(); }
      if(u && !im.querySelector('img')) im.innerHTML = `<img src="${esc(u)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`;
    });
  }
  function folFilter(inp){
    const q = inp.value.trim().toLocaleLowerCase(), box = inp.closest('.cv-folw'); let n = 0;
    box.querySelectorAll('.cv-folg').forEach(d=>{ const ok = !q || d.dataset.q.includes(q); d.style.display = ok ? '' : 'none'; if(ok) n++; if(q && ok) d.open = true; });
    box.querySelector('.cv-folnone').style.display = n ? 'none' : '';
  }
  /* ══════════ 👥 Partager, en un coup d’œil (comme sur la maquette) : mes compagnons · mes abonnés · ceux que je suis ══════════ */
  const myTripsAll = () => trips().filter(t=>!t.demo && !t.deleted);
  const nq = s => String(s || '').trim().toLocaleLowerCase();
  // a-t-il accès à TOUT mon carnet (code compagnon) ? → l’identifiant du code
  const spAllId = pid => { const n = nq(pname(pid)); return Object.keys(M.memNames || {}).find(k=>nq(M.memNames[k]) === n) || ''; };
  function spPeople(){
    const by = {}; myTripsAll().forEach(t=>(t.voyageurs || []).forEach(pid=>{ if(pid !== M.me && prof(pid)) (by[pid] = by[pid] || []).push(t); }));
    return Object.entries(by).map(([pid, ts])=>({pid, ts:ts.sort((a, b)=>(b.debut || '').localeCompare(a.debut || ''))})).sort((a, b)=>b.ts.length - a.ts.length || pname(a.pid).localeCompare(pname(b.pid)));
  }
  const spCov = t => { const p = (list('souv', s=>s.trip === t.id && (s.photos || []).length)[0] || {}).photos; const ph = t.cover || (p && p[0]);
    const wk = t.coverWk || (((M.tripImg || {})[t.id] || {}).u) || '';   // 🖼️ sinon la photo Wikipédia automatique de la destination (comme sur l’accueil)
    return ph ? `<img data-ph="${esc(ph)}.t" alt="">` : wk ? `<img src="${esc(wk)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : `<i>${flag(((t.ccs || [])[0]) || '') || '🧳'}</i>`; };
  function spComp(){
    const P = spPeople(), me = M.me && prof(M.me) ? M.me : '';
    const meRow = me ? `<button type="button" class="sp-me" onclick="CV.spMe()">${pav(me, 'av-sm')}<span><b data-notr>${esc(pname(me))}</b><small>${esc(MSGT(myAv() ? 'Ma photo de profil' : 'Ajoute ta photo de profil'))}</small></span><em>✏️</em></button>` : '';
    if(!P.length) return `<div class="sp-blk">${meRow}<div class="sp-h">👥 ${esc(MSGT('Mes compagnons de voyage'))}</div><div class="v-sum-small">${esc(MSGT('Invite quelqu’un dans un voyage : il apparaîtra ici, et tu choisiras ce qu’il peut voir.'))}</div></div>`;
    const row = P.slice(0, 4).map(x=>pav(x.pid, 'av-md')).join('') + (P.length > 4 ? `<span class="av av-md av-more">+${P.length - 4}</span>` : '');
    const card = x => { const all = !!spAllId(x.pid), pid = ja(x.pid);
      return `<div class="sp-p">${pav(x.pid, 'av-lg')}<div class="sp-pb"><b data-notr>${esc(pname(x.pid))}</b><small>${esc(MSGT('Peut voir :'))}</small>
        <div class="sp-ch"><button type="button" class="${all ? 'on' : ''}" onclick="CV.spAll('${pid}')">${all ? '✓ ' : ''}${esc(MSGT('Tous mes voyages'))}</button><button type="button" class="${all ? '' : 'on'}" onclick="CV.spTrips('${pid}')">${all ? '' : '✓ '}${esc(MSGT('Voyage par voyage'))}</button></div>
        ${all ? '' : `<div class="sp-ts">${x.ts.slice(0, 6).map(t=>`<span class="sp-t"><button type="button" class="sp-tc" onclick="CV.go('${ja(t.id)}');CV.close()">${spCov(t)}<small data-notr>${esc(t.titre)}</small></button><button type="button" class="sp-tx" aria-label="${esc(MSGT('Retirer'))}" onclick="CV.spTripOff('${pid}','${ja(t.id)}')">✕</button></span>`).join('')}<button type="button" class="sp-t sp-add" onclick="CV.spTrips('${pid}')">＋<small>${esc(MSGT('Ajouter'))}</small></button></div>`}</div></div>`; };
    return `<div class="sp-blk">${meRow}<div class="sp-h">👥 ${esc(MSGT('Mes compagnons de voyage'))}</div><div class="sp-avs">${row}</div>${P.map(card).join('')}</div>`;
  }
  function spMe(){ if(M.me && prof(M.me)) editProfile(M.me); }
  // « Tous mes voyages » = un code compagnon pour tout le carnet (il complète tout) ; déjà donné → on le revoit
  async function spAll(pid){ const id = spAllId(pid); if(id && (M.memLocal || {})[id]) return memberShowId(id, pname(pid)); if(id){ toast('✓ ' + RF('{0} voit déjà tous tes voyages', pname(pid))); return; }
    if(!(await uiConfirm(RF('Donner à {0} l’accès à tous tes voyages ?\n\nTon appli crée un code compagnon pour tout ton carnet : {0} voit et complète tous tes voyages, présents et à venir. Tu peux le retirer quand tu veux.', pname(pid))))) return;
    memberInvite(pname(pid)); }
  // « Voyage par voyage » : on coche les voyages ; ceux qui sont déjà en ligne peuvent lui être envoyés tout de suite
  let spSel = null;
  function spTrips(pid){
    const T = myTripsAll().sort((a, b)=>(b.debut || '').localeCompare(a.debut || '')); spSel = {pid, on:new Set(T.filter(t=>(t.voyageurs || []).includes(pid)).map(t=>t.id))};
    openSheet(`<div class="sp-sel"><h2>${pav(pid, 'av-md')} <span data-notr>${esc(pname(pid))}</span></h2><div class="v-sum-small" style="margin-bottom:8px">${esc(MSGT('Coche les voyages qu’il fait avec toi : il les voit et les complète. Les autres restent privés.'))}</div>
      <div class="sp-grid">${T.map(t=>`<button type="button" class="sp-g${spSel.on.has(t.id) ? ' on' : ''}" data-t="${esc(t.id)}" onclick="this.classList.toggle('on')">${spCov(t)}<small data-notr>${esc(t.titre)}</small><em>✓</em></button>`).join('') || `<div class="v-sum-small">${esc(MSGT('Aucun voyage.'))}</div>`}</div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.spTripsSave()">✓ ${esc(MSGT('Enregistrer'))}</button></div></div>`);
  }
  async function spTripsSave(){
    if(!spSel) return; const pid = spSel.pid, now = new Set([...document.querySelectorAll('.sp-g.on')].map(b=>b.dataset.t)), out = [], added = [];
    const denied = [];
    myTripsAll().forEach(t=>{ const v = new Set(t.voyageurs || []), had = v.has(pid), want = now.has(t.id); if(had === want) return; if(had && !want && !canKick(t)){ denied.push(t); return; } want ? v.add(pid) : v.delete(pid); out.push(Object.assign(clone(t), {voyageurs:[...v]})); if(want) added.push(t); });
    if(out.length) putMany(out, '👥 ' + RF('Voyages de {0} mis à jour', pname(pid))); spSel = null; closeSheet(true);
    if(denied.length) alert(RF('Pas retiré de : {0}.', denied.map(t=>t.titre).join(', ')) + '\n\n' + MSGT('Seul l’admin d’un voyage peut en retirer quelqu’un.'));
    for(const t of out) if(!(t.voyageurs || []).includes(pid)) { try { await compRevoke(t.id, pid); } catch(e){} }
    // un voyage qu’il ne peut pas encore ouvrir : on propose d’envoyer l’invitation (lien du voyage)
    if(added.length && await uiConfirm(RF('Envoyer l’invitation à {0} pour {1} ?', pname(pid), added.map(t=>t.titre).join(', ')))) for(const t of added){ await tripInviteNow(t.id); }
    spCompSheet(pid);
  }
  async function spTripOff(pid, tid){ const t = R[tid]; if(!t) return;
    if(!canKick(t)) return kickDenied(t);
    if(!(await uiConfirm(RF('Retirer {0} du voyage « {1} » ?', pname(pid), t.titre) + '\n\n' + MSGT('Il ne compte plus dans les dépenses et n’a plus accès au voyage partagé : il garde une copie en lecture seule, sans pouvoir la modifier.')))) return;
    put(Object.assign(clone(t), {voyageurs:(t.voyageurs || []).filter(x=>x !== pid)}), '👥 ' + RF('{0} retiré', pname(pid)));
    await compRevoke(tid, pid); spCompSheet(pid); }
  // 🔑 retirer VRAIMENT l’accès d’un compagnon à un voyage partagé (pas seulement de la liste des voyageurs)
  async function compRevoke(tid, pid){
    const code = TS()[tid]; if(!code || !spaceObj(code) || !pid || pid === M.me) return;
    if(!canKick(R[tid])) return 'na';   // 🛡️ seul l’admin retire quelqu’un
    const ms = list('member', m=>m.trip === tid && m.pid === pid);
    if(!ms.length){   // pas de présence connue : son invitation à son prénom
      const nm = nmKey(pname(pid)), hit = Object.entries(PACKS()).find(([P, pk])=>pk.trips.includes(tid) && nmKey(pk.who) === nm);
      if(hit) return packRemoveTrip(hit[0], tid, true); return; }
    for(const [P, pk] of Object.entries(PACKS())) if(pk.trips.includes(tid) && ms.some(m=>m.via && m.via !== 'direct')){ const h = await viaHash(tid, P); if(ms.some(m=>m.via === h)) return packRemoveTrip(P, tid, true); }
    return packRemoveTrip(null, tid, true, pid);
  }
  // 👀 mes abonnés : une ligne par personne, avec ses ❤️ et ses commentaires sur tous mes voyages publiés
  function spAb(){
    const ids = new Set(Object.keys(FT()).filter(t=>R[t] && !R[t].deleted).map(ftId)); if(!ids.size) return '';
    const fw = fwUniq(list('follower', x=>ids.has(x.trip) && !isBlk(x) && !String(x.id).endsWith(':' + devId()))), N = fwNames(fw);
    const lk = d => list('like', l=>ids.has(l.trip) && l.on && devOfRec(l) === d).length, cm = d => list('comment', c=>ids.has(c.trip) && c.dev === d).length;
    return `<div class="sp-blk"><div class="sp-h">👀 ${esc(MSGT('Mes abonnés'))} <small>(${esc(MSGT('lecture seule'))})</small></div>${fw.length ? fw.map(x=>{ const d = fwDevOf(x), nm = N[x.id] || x.who || '?';
      return `<div class="sp-f">${avTag(x.av, nm, '#64748b', 'av-md')}<b data-notr>${esc(nm)}</b><span class="sp-n">❤️ ${lk(d)}</span><span class="sp-n">💬 ${cm(d)}</span><button type="button" class="sp-dots" aria-label="${esc(MSGT('Options'))}" onclick="CV.fwNickAsk('${ja(d)}')">⋯</button></div>`; }).join('')
      : `<div class="v-sum-small">${esc(MSGT('Personne pour l’instant : envoie ton lien abonné à ta famille et à tes amis.'))}</div>`}</div>`;
  }
  // ➡️ ceux que je suis : la personne, sa photo, et les 3 dernières photos de ses voyages
  function spSuis(){
    const fol = list('feedtrip', f=>TS()[f.id] && !FT()[String(f.id).replace(/^ft:/, '')] && !f.deleted); if(!fol.length) return '';
    const G = {}; fol.forEach(f=>{ const n = String(f.owner || '').trim() || '?', k = n.toLocaleLowerCase(); (G[k] = G[k] || {n, f:[]}).f.push(f); });
    return `<div class="sp-blk"><div class="sp-h">➡️ ${esc(MSGT('Mes abonnements'))} <small>(${esc(MSGT('ceux que je suis'))})</small></div>${Object.values(G).map(g=>{
      const ids = new Set(g.f.map(f=>f.id)), av = (g.f.find(f=>avOk(f.oav)) || {}).oav || '';
      const ph = list('feed', x=>ids.has(x.trip) && !x.deleted && (x.photos || []).length).sort((a, b)=>(b.date || '').localeCompare(a.date || '')).flatMap(x=>x.photos.map(p=>[p, x.trip])).slice(0, 3);
      const f0 = g.f.slice().sort((a, b)=>(b.debut || '').localeCompare(a.debut || ''))[0];
      return `<div class="sp-s"><div class="sp-sh">${avTag(av, g.n, '#0ea5e9', 'av-md')}<b data-notr>${esc(g.n)}</b><button type="button" class="sp-fol" onclick="CV.feedUnfollow('${ja(f0.id)}', true)">${esc(MSGT('Suivi(e)'))}</button></div>
        <div class="sp-ph">${ph.length ? ph.map(([p, tr])=>`<button type="button" onclick="CV.feedView('${ja(tr)}')"><img data-ph="${esc(p)}.t" alt=""></button>`).join('') : `<button type="button" class="sp-ph0" onclick="CV.feedView('${ja(f0.id)}')">${esc(MSGT('Voir ses voyages'))} ›</button>`}</div></div>`; }).join('')}</div>`;
  }
  /* ── 👥 la page « Partager » comme sur la maquette : 3 blocs, de grosses photos rondes, des boutons ronds ── */
  const SVG_EYE = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const SVG_PPL = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><circle cx="9" cy="8" r="4"/><path d="M1 21c0-4.4 3.6-7 8-7s8 2.6 8 7z"/><circle cx="17.5" cy="9" r="3"/><path d="M15.5 14.2c3.9-.3 7.5 1.8 7.5 5.8h-4.6c0-2.3-1-4.3-2.9-5.8z"/></svg>';
  const SVG_ME = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><circle cx="12" cy="7.5" r="4.5"/><path d="M3 22c0-5 4-8 9-8s9 3 9 8z"/></svg>';
  const SVG_SHARE = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>';
  const SVG_HEART = '<svg viewBox="0 0 24 24" width="26" height="26" fill="#f26b5b"><path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z"/></svg>';
  const SVG_BUBBLE = '<svg viewBox="0 0 24 24" width="26" height="26" fill="#3fb8c4"><path d="M12 3C6.5 3 2 6.6 2 11c0 2.4 1.3 4.5 3.4 6L4.5 21l4.6-2.3c.9.2 1.9.3 2.9.3 5.5 0 10-3.6 10-8s-4.5-8-10-8z"/></svg>';
  const SVG_HID = '<span class="sp2-hid"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/></svg></span>';
  // 🗺️ interrupteur « carte du voyage pour les abonnés » (voyage ouvert, déjà publié ou partagé avec des compagnons)
  async function hotelPub(){ const t = trip(); if(!t) return; const on = !t.hotelPub;
    if(on && !(await uiConfirm(MSGT('Montrer ton hôtel sur la carte de tes abonnés ? Ils verront où tu dors. Tu peux le cacher à tout moment.')))) return;
    const c = clone(t); if(on) c.hotelPub = 1; else delete c.hotelPub; put(c, false); toast(on ? '🏨 ' + MSGT('Hôtel visible des abonnés') : '🔒 ' + MSGT('Hôtel caché aux abonnés'));
    try { await fmCalc(t.id, true); syncNow(); } catch(e){} refresh(); }
  function mpBtn(){
    const t = trip(); if(!t || t.demo || !socCode(t.id)) return ''; const on = mpOn(t.id);
    const r = R['fm:' + t.id], ok = r && !r.deleted, mine = !!feedCode(t.id);
    const st = !on ? '' : !mine && !ok ? '📱 ' + MSGT('La carte part du téléphone qui a publié ce voyage : ouvre-le sur ce téléphone.') : ok ? '✓ ' + RF('Envoyée : {0} étape(s), {1} visite(s) et activité(s)', (r.c || []).filter(x=>!x[4] && !x[5]).length, (r.v || []).length + (r.a || []).length) + ' · ' + vzWhen(r.updatedAt) : '⏳ ' + MSGT('Carte en préparation : garde ce voyage ouvert quelques secondes.');
    return `<div class="cv-mpb"><button type="button" class="cv-trkpub${on ? ' on' : ''}" onclick="CV.mapPub()"><span>${on ? '🗺️' : '🔒'}</span><span><b>${esc(MSGT('Carte du voyage pour les abonnés'))} · ${esc(MSGT(on ? 'visible' : 'masquée'))}</b><small>${esc(MSGT(t.hotelPub ? '2D et 3D : étapes, trajets, visites et activités, photos des souvenirs et suivi en direct.' : '2D et 3D : étapes, trajets, visites et activités, photos des souvenirs et suivi en direct. Les hébergements restent privés.'))}</small></span></button>${on ? `<button type="button" class="cv-trkpub${t.hotelPub ? ' on' : ''}" style="margin-top:8px" onclick="CV.hotelPub()"><span>${t.hotelPub ? '🏨' : '🔒'}</span><span><b>${esc(MSGT(t.hotelPub ? 'Ton hôtel est visible des abonnés' : 'Ton hôtel est caché aux abonnés'))}</b><small>${esc(MSGT(t.hotelPub ? 'Touche pour le cacher' : 'Pour ta sécurité, les abonnés ne voient pas où tu dors · touche pour le montrer'))}</small></span></button>` : ''}${on ? `<div class="cv-mps"><small>${esc(st)}</small>${mine ? `<button type="button" onclick="CV.mapNow()">🔄 ${esc(MSGT('Mettre à jour'))}</button>` : ''}</div>` : ''}</div>`;
  }
  function spOverview(){
    const P = spPeople(), ids = new Set(Object.keys(FT()).filter(t=>R[t] && !R[t].deleted).map(ftId));
    const lvP = P.filter(x=>x.ts.some(t=>tripPhase(t) === 'live'));
    const comp = `<div class="sp2-sh"><div class="sp2-sec">${SVG_PPL}<b>${esc(MSGT('Mes compagnons de voyage'))}</b>${spLive(lvP.map(x=>pname(x.pid)))}</div>${myTripsAll().length ? `<button type="button" class="sp2-add2" onclick="CV.spCompAdd()">＋ ${esc(MSGT('Ajouter'))}</button>` : ''}</div>
      ${P.length ? `<button type="button" class="sp2-avs" onclick="CV.spCompSheet()">${P.slice(0, 4).map(x=>pav(x.pid, 'av-xl')).join('')}${P.length > 4 ? `<span class="av av-xl av-more">+${P.length - 4}</span>` : ''}</button>
        <div class="sp2-pills"><button type="button" class="soft" onclick="CV.spCompSheet()">👥 ${esc(MSGT('Qui voit quel voyage'))}</button></div>`
      : `<div class="sp2-empty">${esc(MSGT('Invite quelqu’un dans un voyage : il apparaîtra ici, et tu choisiras ce qu’il peut voir.'))}</div>${trip() && !trip().demo ? `<div class="sp2-pills"><button type="button" class="soft" onclick="CV.tripInviteNow('${ja(trip().id)}')">📤 ${esc(MSGT('Inviter quelqu’un'))}</button></div>` : ''}`}`;
    const ab = ab2AbHTML(), suis = ab2SuisHTML();   // 👀 abonnés v2
    return `<div class="sp2-top"><h2>${esc(MSGT('Partager'))}</h2><button type="button" class="sp2-share" aria-label="${esc(MSGT('Faire découvrir Vezoria'))}" onclick="CV.shareSheet()">${SVG_SHARE}</button></div>
      <div class="sp2-body"><div class="sp2-blk">${comp}</div><div class="sp2-blk">${ab}</div><div class="sp2-blk">${suis}</div></div>`;
  }
  // 🟢 combien sont en voyage en ce moment, et qui
  const spLive = names => names.length ? `<span class="sp2-live" title="${esc(names.join(', '))}">${names.length}</span><span class="sp2-livn" data-notr>🟢 ${esc(names.slice(0, 3).join(', ') + (names.length > 3 ? '…' : ''))} <i>${esc(MSGT('en voyage'))}</i></span>` : '';
  const fwAv = x => avOk(x.av) ? x.av : (fwMate(x) && R[fwMatePid(x)] && avOk(R[fwMatePid(x)].av) ? R[fwMatePid(x)].av : '');
  // 👀 un abonné : ce qu’il voit (voyage par voyage), son nom pour toi, le retirer
  function spFw(d){ return ab2FwSheet(d);
    const ids = new Set(Object.keys(FT()).filter(t=>R[t] && !R[t].deleted).map(ftId)), x = fwUniq(list('follower', f=>ids.has(f.trip) && fwDevOf(f) === d))[0]; if(!x) return;
    const nm = String(fwNames([x])[x.id] || x.who || '?').replace(/^🧳\s*/, ''), gs = [...new Set(list('follower', f=>ids.has(f.trip) && fwTwins(d).includes(fwDevOf(f))).map(f=>grpCodeOf(String(f.trip).replace(/^ft:/, ''))))].filter(Boolean);
    const lk = list('like', l=>ids.has(l.trip) && l.on && devOfRec(l) === d).length, cm = list('comment', c=>ids.has(c.trip) && c.dev === d);
    const mp = fwMatePid(x), fwT = new Set(list('follower', f=>ids.has(f.trip) && fwTwins(d).includes(fwDevOf(f))).map(f=>String(f.trip).replace(/^ft:/, '')));
    // tous les voyages de son lien : ceux qu’il voit, ceux que je lui ai masqués (grisés), ceux qu’il fait avec moi en compagnon
    const seen = [...new Set([...gs.flatMap(g=>grpTrips(g)), ...fwT])].filter(t=>R[t] && !R[t].deleted).sort((a, b)=>(R[b].debut || '').localeCompare(R[a].debut || ''));
    const stOf = t => mp && (R[t].voyageurs || []).includes(mp) ? 'comp' : ((FRX()[t] || {}).ex || []).includes(d) ? 'off' : 'on';
    const nOn = seen.filter(t=>stOf(t) === 'on').length, nOff = seen.filter(t=>stOf(t) === 'off').length, nComp = seen.filter(t=>stOf(t) === 'comp').length;
    openSheet(`<div class="sp2"><div class="sp2-top sp2-top2">${avOk(fwAv(x)) ? avTag(fwAv(x), nm, '', 'av-xl') : SVG_HID}<h2 data-notr>${esc(nm)}</h2></div><div class="sp2-body">
      <div class="sp2-blk"><div class="sp2-sec">👁️ <b>${esc(MSGT('Ce qu’il voit'))}</b></div>
        <div class="sp2-empty">👀 ${esc(RF('{0} en abonné', nOn))}${nOff ? ' · 🙈 ' + esc(RF('{0} masqué(s)', nOff)) : ''}${nComp ? ' · 🧳 ' + esc(RF('{0} en compagnon', nComp)) : ''}</div>
        <div class="sp2-ts">${seen.map(t=>{ const st = stOf(t); return `<span class="sp2-t${st === 'off' ? ' off' : ''}"><span class="sp2-tc">${spCov(R[t])}<small data-notr>${esc(R[t].titre)}</small>${st === 'off' ? `<em class="sp2-tg">🙈 ${esc(MSGT('Masqué'))}</em>` : st === 'comp' ? `<em class="sp2-tg">🧳 ${esc(MSGT('compagnon'))}</em>` : ''}</span></span>`; }).join('') || `<div class="sp2-empty">${esc(MSGT('Aucun voyage pour l’instant.'))}</div>`}</div>
        ${gs.map(g=>`<div class="sp2-pills"><button type="button" class="soft" onclick="CV.fwTripsSheet('${ja(g)}','${ja(d)}')">👁️ ${esc(MSGT('Choisir les voyages qu’il voit'))}</button></div>`).join('')}</div>
      <div class="sp2-blk"><div class="sp2-sec">💬 <b>${esc(RF('{0} ❤️ · {1} commentaire(s)', lk, cm.length))}</b></div>${cm.slice(-3).map(c=>`<div class="sp2-empty">« <span data-notr>${esc(String(c.text || '').slice(0, 140))}</span> »</div>`).join('')}</div>
      <div class="sp2-pills"><button type="button" onclick="CV.fwNickAsk('${ja(d)}')">✏️ ${esc(MSGT('Renommer'))}</button><button type="button" class="danger" onclick="CV.fwBlock('${ja(x.id)}')">🚫 ${esc(MSGT('Retirer cet abonné'))}</button></div>
      <div class="sp2-empty" style="margin-top:8px">${esc(MSGT('Retirer : il ne voit plus rien. Tes autres abonnés passent tout seuls sur un nouveau lien.'))}</div>
      <div class="sp2-pills" style="margin-top:10px"><button type="button" class="soft" onclick="CV.fwForget('${ja(d)}')">🧹 ${esc(MSGT('Effacer de la liste (appareil effacé ou plus utilisé)'))}</button></div>
      <div class="sp2-empty">${esc(MSGT('Sans changer de lien. S’il ouvre encore ton voyage, il réapparaîtra tout seul.'))}</div></div></div>`);
  }
  // 🧹 abonné fantôme (téléphone effacé, ordinateur remis à zéro) : on retire juste sa fiche d’abonné, le lien ne change pas
  async function fwForget(d){ return ab2FwDel(d);
    const out = list('follower', f=>fwDevOf(f) === d).map(f=>Object.assign(clone(f), {deleted:true})); if(!out.length) return;
    putQuiet(out); persist(); closeSheet(true); refresh(); toast('🧹 ' + MSGT('Abonné retiré de la liste'));
    try { await syncNow(); } catch(e){}
  }
  // ＋ abonnés : inviter (lien du voyage en cours, ou de tout le carnet)
  function spAbAdd(){ ab2Invite(); }
  /* 👀 ＋ abonnés : on choisit QUELS voyages partager, et on repropose d’abord les liens déjà créés (un lien peut déjà montrer plusieurs
     voyages : inutile d’en créer un nouveau, il suffit de l’envoyer ou d’y ajouter le voyage). */
  function abGroups(){
    const G = {}; Object.keys(FT()).forEach(tid=>{ const t = R[tid]; if(!t || t.deleted || t.demo) return; const c = grpCodeOf(tid) || FT()[tid]; if(!c || !spaceObj(FT()[tid])) return; (G[c] = G[c] || []).push(tid); });
    return G;
  }
  const abFans = tids => new Set(tids.flatMap(tid=>list('follower', x=>x.trip === ftId(tid) && !x.deleted && !String(x.id).endsWith(':' + devId())).map(fwKey))).size;
  function abPick(){
    const t = trip(), cur = t && !t.demo && !t.deleted ? t : null, G = abGroups();
    if(!myTripsAll().length){ alert(MSGT('Crée d’abord un voyage.')); return; }
    const codes = Object.keys(G).sort((a, b)=>(b === M.feedAll) - (a === M.feedAll) || G[b].length - G[a].length);
    const card = c => { const ts = G[c].map(x=>R[x]).filter(Boolean), nf = abFans(G[c]), multi = c === M.feedAll, inIt = cur && G[c].includes(cur.id);
      return `<div class="sp2-blk" style="margin-bottom:10px"><div class="sp2-sec">🔗 <b>${esc(multi ? MSGT('Lien de plusieurs voyages') : MSGT('Lien d’un voyage'))}</b> <small>· ${esc(RF('{0} abonné(s)', nf))}</small></div>
        <div class="v-sum-small" style="margin:4px 0 8px"><span data-notr>${ts.slice(0, 4).map(x=>'· ' + esc(x.titre)).join('<br>')}</span>${ts.length > 4 ? '<br>' + esc(RF('… et {0} autre(s) voyage(s)', ts.length - 4)) : ''}</div>
        <div class="sp2-pills"><button type="button" onclick="CV.abSend('${ja(c)}')">📤 ${esc(MSGT('Envoyer ce lien'))}</button>${multi ? `<button type="button" onclick="CV.carnetPublishSheet('${cur && !inIt ? ja(cur.id) : ''}')">${cur && !inIt ? '＋ ' + esc(RF('Ajouter « {0} »', cur.titre)) : '✏️ ' + esc(MSGT('Choisir les voyages'))}</button>` : ''}</div></div>`; };
    const solo = cur && !FT()[cur.id];
    openSheet(`<h2>👀 ${esc(MSGT('Inviter des abonnés'))}</h2>
      <div class="v-sum-small" style="margin-bottom:10px">${esc(MSGT('Tes abonnés voient seulement les souvenirs (photos, récits, lieux) des voyages que tu choisis : jamais le programme, les réservations, le budget ni les documents.'))}</div>
      ${codes.length ? `<div class="v-sum-small" style="margin:0 0 6px"><b>${esc(MSGT('Tu as déjà un lien : envoie-le, ou ajoutes-y des voyages.'))}</b></div>${codes.map(card).join('')}` : ''}
      <div class="v-sum-small" style="margin:12px 0 6px"><b>${esc(codes.length ? MSGT('Ou un nouveau lien') : MSGT('Quel lien créer ?'))}</b></div>
      ${!M.feedAll || !spaceObj(M.feedAll) ? `<button type="button" class="v-btn${codes.length ? ' sec' : ''}" onclick="CV.carnetPublishSheet()">📚 ${esc(MSGT('Un lien pour plusieurs voyages (je choisis la liste)'))}</button>` : ''}
      ${solo ? `<button type="button" class="v-btn sec" onclick="CV.close();CV.feedPublish('${ja(cur.id)}',1)">🧳 ${esc(RF('Un lien pour « {0} » seulement', cur.titre))}</button>` : ''}
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">${esc(MSGT('Fermer'))}</button></div>`);
  }
  function abSend(c){ const G = abGroups(), ts = G[c] || []; closeSheet(true); if(ts.length === 1 && c !== M.feedAll) return feedShareLink(ts[0]); return carnetInvite(c); }
  // ＋ compagnon : l’inviter dans le voyage ouvert (ou en choisir un)
  // ➕ ajouter un compagnon : on choisit d’abord CE QU’IL PARTAGE avec toi (un voyage, plusieurs, ou tout le carnet)
  function spCompAdd(){
    const t = trip(), one = t && !t.demo && myTripsAll().some(x=>x.id === t.id) ? t : null;
    const ch = (ic, b, sm, fn) => `<button type="button" class="cv-choice" onclick="CV.close();${fn}"><i>${ic}</i><span><b>${b}</b><small>${sm}</small></span></button>`;
    openSheet(`<h2>➕ ${esc(MSGT('Ajouter un compagnon'))}</h2>
      <div class="v-sum-small" style="margin-bottom:10px">${esc(MSGT('Qu’est-ce que cette personne partage avec toi ? Elle voit et complète seulement ce que tu choisis ici.'))}</div>
      ${one ? ch('🧳', esc(RF('Un seul voyage : « {0} »', one.titre)), esc(MSGT('Elle voit et complète ce voyage uniquement. Tes autres voyages restent privés.')), `CV.tripInviteNow('${ja(one.id)}')`) : ''}
      ${ch('🗂️', esc(MSGT('Plusieurs voyages, au choix')), esc(MSGT('Tu coches les voyages qu’elle fait avec toi. Les autres restent privés.')), "CV.packSheet('')")}
      ${ch('📚', esc(MSGT('Tous mes voyages (tout mon carnet)')), esc(MSGT('Elle voit et complète tous tes voyages, ceux d’aujourd’hui et ceux à venir.')), 'CV.memberInvite()')}
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">${esc(MSGT('Annuler'))}</button></div>`);
  }
  // retirer un compagnon : de tous mes voyages, et son code « tout mon carnet » s’il en a un
  async function spCompDel(pid){
    { const mine = myTripsAll().filter(t=>(t.voyageurs || []).includes(pid)); if(mine.length && !mine.some(t=>canKick(t))) return kickDenied(mine[0]); }   // 🛡️ admin d’aucun de ses voyages : on le dit tout de suite
    if(!(await uiConfirm(RF('Retirer {0} de tes compagnons ?\n\n{0} est retiré de tous tes voyages et ne compte plus dans les dépenses. S’il avait accès à tout ton carnet, cet accès est retiré.', pname(pid))))) return;
    const all0 = myTripsAll(), denied = all0.filter(t=>(t.voyageurs || []).includes(pid) && !canKick(t)), all = all0.filter(t=>canKick(t));
    if(denied.length && !all.some(t=>(t.voyageurs || []).includes(pid))){ return kickDenied(denied[0]); }
    const out = all.filter(t=>(t.voyageurs || []).includes(pid)).map(t=>Object.assign(clone(t), {voyageurs:t.voyageurs.filter(x=>x !== pid)}));
    if(out.length) putMany(out, '👥 ' + RF('{0} retiré', pname(pid)));
    cryptShow('🔑 ' + MSGT('Je coupe son accès aux voyages partagés…'));
    try { for(const t of all) { try { await compRevoke(t.id, pid); } catch(e){} } } finally { cryptHide(''); }   // 🔑 vrai retrait : il garde une copie en lecture seule
    if(denied.length) alert(RF('Pas retiré de : {0}.', denied.map(t=>t.titre).join(', ')) + '\n\n' + MSGT('Seul l’admin d’un voyage peut en retirer quelqu’un.'));
    const id = spAllId(pid); if(id){ try { const r = await memberApiCall({a:'revoke', id}, M.sync.code); if(r.ok){ if(M.memLocal) delete M.memLocal[id]; if(M.memNames) delete M.memNames[id]; persist(); } } catch(e){} }
    spCompSheet();
  }
  // 👥 « Mes compagnons de voyage » : chacun, ce qu’il peut voir, et les voyages choisis pour la personne sélectionnée
  let spFocus = '';
  function spCompSheet(focus){
    const P = spPeople(); if(focus) spFocus = focus; if(!P.some(x=>x.pid === spFocus)) spFocus = (P.find(x=>!spAllId(x.pid)) || P[0] || {}).pid || '';
    const card = x => { const all = !!spAllId(x.pid), pid = ja(x.pid);
      return `<div class="sp2-pc${x.pid === spFocus ? ' on' : ''}" onclick="CV.spCompSheet('${pid}')">${pav(x.pid, 'av-xl')}<div class="sp2-pb"><b data-notr>${esc(pname(x.pid))}</b><small>${esc(MSGT('Peut voir :'))}</small>
        <div class="sp2-chips"><button type="button" class="${all ? 'sel' : ''}" onclick="event.stopPropagation();CV.spAll('${pid}')">${all ? '✓ ' : ''}${esc(MSGT('Tous mes voyages'))}</button><button type="button" class="${all ? '' : 'sel'}" onclick="event.stopPropagation();CV.spCompSheet('${pid}')">${all ? '' : '✓ '}${esc(MSGT('Voyage par voyage'))}</button></div></div><button type="button" class="sp2-del" aria-label="${esc(MSGT('Retirer'))}" onclick="event.stopPropagation();CV.spCompDel('${pid}')">🗑</button></div>`; };
    const F = P.find(x=>x.pid === spFocus), all = F && spAllId(F.pid);
    const sel = F && !all ? `<div class="sp2-sec">🧳 <b>${esc(MSGT('Voyages sélectionnés'))}</b> <small data-notr>· ${esc(pname(F.pid))}</small></div>
      <div class="sp2-ts">${F.ts.map(t=>`<span class="sp2-t"><button type="button" class="sp2-tc" onclick="CV.go('${ja(t.id)}');CV.close()">${spCov(t)}<small data-notr>${tripAdmin(t) === F.pid ? '👑 ' : ''}${esc(t.titre)}</small></button><button type="button" class="sp2-tx" aria-label="${esc(MSGT('Retirer'))}" onclick="CV.spTripOff('${ja(F.pid)}','${ja(t.id)}')">✕</button></span>`).join('')}
        <button type="button" class="sp2-t sp2-add" onclick="CV.spTrips('${ja(F.pid)}')"><b>＋</b><small>${esc(MSGT('Ajouter un voyage'))}</small></button></div>
      ${F.ts.filter(t=>tripAdmin(t) === M.me && TS()[t.id] && (t.voyageurs || []).includes(F.pid)).map(t=>`<div class="sp2-pills" style="margin-top:6px"><button type="button" class="soft" onclick="CV.adminPass('${ja(t.id)}','${ja(F.pid)}')">👑 ${esc(RF('Lui passer l’admin de « {0} »', t.titre || ''))}</button></div>`).join('')}` : '';
    openSheet(`<div class="sp2"><div class="sp2-top"><h2>${esc(MSGT('Mes compagnons de voyage'))}</h2></div><div class="sp2-body"><div class="sp2-pills" style="margin-bottom:8px"><button type="button" class="soft" onclick="CV.spCompAdd()">＋ ${esc(MSGT('Ajouter un compagnon'))}</button></div><div class="sp2-blk">${P.map(card).join('') || `<div class="sp2-empty">${esc(MSGT('Invite quelqu’un dans un voyage : il apparaîtra ici, et tu choisiras ce qu’il peut voir.'))}</div>`}${sel}</div>
      <button type="button" class="sp2-save" onclick="CV.shareHub()">${esc(MSGT('Enregistrer'))}</button></div></div>`);
  }
  function socialHTML(cur){
    const ev = socEvents(true), mineT = Object.keys(FT()).filter(tid=>R[tid] && !R[tid].deleted), others = mineT.filter(x=>x !== cur);
    const fol = list('feedtrip', f=>TS()[f.id] && !FT()[f.id.replace(/^ft:/,'')] && !f.deleted);
    const ttl = ftid => { const ft = R[ftid]; return ft ? ft.titre : ''; };
    const evRow = e => { const r = e.r, w = esc(r.who || 'Quelqu’un');
      const txt = e.k === 'like' ? `❤️ ${w} aime ta publication` : e.k === 'comment' ? `💬 ${w} : « ${esc(String(r.text||'').slice(0, 80))} »` : e.k === 'follower' ? `👀 ${w} suit ton voyage` : `📸 Nouvelle étape : ${esc(r.titre || r.lieu || '')}`;
      return `<button type="button" class="cv-prow${e.nw ? ' sc-new' : ''}" onclick="CV.feedView('${ja(r.trip)}')"><span>${txt}<small class="v-sum-small" style="display:block">${esc(ttl(r.trip))} · ${vzWhen(e.t)}</small></span><span>›</span></button>`; };
    const fwDev = x => String(x.id).split(':').pop();   // un abonné = un appareil, même s’il a ouvert plusieurs voyages du carnet
    const nFw = new Set(mineT.flatMap(tid=>list('follower', x=>x.trip===ftId(tid) && !isBlk(x)).map(fwKey))).size;
    const byCode = {}; mineT.forEach(tid=>{ const g = grpCodeOf(tid); (byCode[g] = byCode[g] || []).push(tid); });
    const grpRow = (c, tids) => { const ids = new Set(tids.map(ftId)), fw0 = list('follower', x=>ids.has(x.trip) && !isBlk(x)), fw = fwUniq(fw0), fwN = fwNames(fw);
      const lk = list('like', l=>ids.has(l.trip) && l.on && !isBlk(l)).length, cm = list('comment', x=>ids.has(x.trip) && !isBlk(x)).length;
      tids.sort((a,b)=>(R[b].debut||'').localeCompare(R[a].debut||''));
      return `<div class="sh-card sh-tb" data-t="ab"><div class="sh-k">📚 Mon carnet publié</div><div class="v-sum-small">${tids.length} voyages avec un seul lien : tes abonnés voient tous ces voyages et passent de l’un à l’autre.</div>
        <div class="sh-st" style="margin-top:6px"><span>👀 <b>${fw.length}</b> abonné${fw.length>1?'s':''}</span><span>❤️ <b>${lk}</b></span><span>💬 <b>${cm}</b></span></div>
        <div class="v-sum-small" style="margin:6px 0">${fw.length ? fw.map(x=>{ const d = fwDev(x), nh = tids.filter(t=>((FRX()[t]||{}).ex||[]).includes(d)).length;
          return d === devId() ? `<span data-notr>${esc(x.who || '?')}</span>` : `<span class="sh-fw"><button type="button" class="sh-fwn${fwLabel(x) ? '' : ' unk'}" onclick="CV.fwNickAsk('${ja(d)}')" data-notr>${esc(fwN[x.id] || '❓ ' + MSGT('Qui est-ce ?'))}</button>${nh ? `<small>🙈${nh}</small>` : ''}<button type="button" aria-label="Ce qu’elle voit" onclick="CV.fwTripsSheet('${ja(c)}','${ja(d)}')">👁️</button><button type="button" aria-label="Bloquer" onclick="CV.fwBlock('${ja(x.id)}')">🚫</button></span>`; }).join(' ') : 'Personne pour l’instant : envoie le lien abonné.'}</div>
        ${fw.length ? `<div class="v-sum-small" style="margin-bottom:4px">👁️ = choisir les voyages que voit cette personne · 🚫 = la bloquer</div>` : ''}
        <div class="v-sum-small">Code abonné : <b class="cv-code">${esc(c)}</b></div>
        <button type="button" class="v-btn sec" style="margin-top:8px" onclick="CV.feedShareLink('${ja(tids[0])}')">🔗 Partager le lien (sans installer l’appli)</button>
        <div class="cv-row" style="gap:6px;margin-top:8px"><button type="button" class="v-btn sec" onclick="CV.feedView('${ja(ftId(tids[0]))}')">Voir</button><button type="button" class="v-btn sec" onclick="CV.carnetPublishSheet()">📤 Inviter · choisir</button><button type="button" class="v-btn sec" onclick="CV.feedReset('${ja(tids[0])}')">🔁 Nouveau lien abonné</button></div></div>`; };
    const pubRow = tid => { const t = R[tid], fw = fwUniq(list('follower', x=>x.trip===ftId(tid) && !isBlk(x))), fwN = fwNames(fw), lk = list('like', l=>l.trip===ftId(tid) && l.on && !isBlk(l)).length, cm = list('comment', c=>c.trip===ftId(tid) && !isBlk(c)).length;
      return `<div class="sh-card sh-tb" data-t="ab"><div class="sh-k">📣 ${esc(t.titre)}</div>
        <div class="sh-st"><span>👀 <b>${fw.length}</b> abonné${fw.length>1?'s':''}</span><span>❤️ <b>${lk}</b></span><span>💬 <b>${cm}</b></span></div>
        <div class="v-sum-small" style="margin:6px 0">${fw.length ? fw.map(x=>x.id.endsWith(':' + devId()) ? `<span data-notr>${esc(x.who || '?')}</span>` :  `<span class="sh-fw"><button type="button" class="sh-fwn${fwLabel(x) ? '' : ' unk'}" onclick="CV.fwNickAsk('${ja(fwDevOf(x))}')" data-notr>${esc(fwN[x.id] || '❓ ' + MSGT('Qui est-ce ?'))}</button><button type="button" aria-label="Ne plus lui montrer" onclick="CV.fwHideOne('${ja(tid)}','${ja(x.id)}')">🙈</button><button type="button" aria-label="Bloquer" onclick="CV.fwBlock('${ja(x.id)}')">🚫</button></span>`).join(' ') : 'Personne pour l’instant : envoie le lien abonné.'}</div>
        <div class="v-sum-small">Code abonné : <b class="cv-code">${esc(FT()[tid])}</b></div>
        <button type="button" class="v-btn sec" style="margin-top:8px" onclick="CV.feedShareLink('${ja(tid)}')">🔗 Partager le lien (sans installer l’appli)</button>
        <div class="cv-row" style="gap:6px;margin-top:8px"><button type="button" class="v-btn sec" onclick="CV.feedView('${ja(ftId(tid))}')">Voir</button><button type="button" class="v-btn sec" onclick="CV.feedPublish('${ja(tid)}')">📤 Inviter</button><button type="button" class="v-btn sec" onclick="CV.feedReset('${ja(tid)}')">🔁 Nouveau lien abonné</button></div></div>`; };
    const tripsAll = trips().filter(t=>!t.demo).sort((a,b)=>(b.debut||'').localeCompare(a.debut||''));
    const codeRow = t => { const c = TS()[t.id] && spaceObj(TS()[t.id]) ? TS()[t.id] : '', who = (t.voyageurs||[]).filter(prof).map(p=>esc(pname(p))).join(', ');
      return `<div class="cv-prow" style="cursor:default"><span><b>${esc(t.titre)}</b><small class="v-sum-small" style="display:block">${who || 'seul(e)'}${t.debut ? ' · ' + tripDates(t) : ''}</small></span>
        ${c ? `<button type="button" class="cv-code" style="border:0;background:none;font:inherit;font-weight:700" onclick="CV.tripShareSheet('${ja(t.id)}')">${esc(c)}</button>` : `<button type="button" class="v-btn sec" style="width:auto;padding:6px 10px;margin:0" onclick="CV.go('${ja(t.id)}');CV.shareHub()">🔗 Partager</button>`}</div>`; };
    return `
      ${ev.length ? (()=>{ const nw = ev.filter(e=>e.nw).length, open = M.evOpen !== false && (M.evOpen === true || ev.length <= 3); return `<details class="sh-card sh-tb sh-news" data-t="ab suis"${open ? ' open' : ''}><summary onclick="CV.evToggle(!this.parentNode.open)"><span class="sh-k" style="margin:0">✨ Nouveautés · 24 h</span><span class="sh-nn">${nw ? `<b class="sh-nb">${nw}</b> ` : ''}<small>${ev.length} · <span class="sh-open">Voir</span><span class="sh-close">Replier</span></small></span></summary>${ev.slice(0, 40).map(evRow).join('')}</details>`; })() : '<div class="v-sum-small sh-tb" data-t="ab suis" style="margin-bottom:10px">Rien de nouveau ces dernières 24 heures.</div>'}
      <div class="sh-st sh-tb" data-t="ab" style="margin:4px 0 12px"><span>👀 <b>${nFw}</b> abonné${nFw>1?'s':''}</span><span>➡️ <b>${fol.length}</b> voyage${fol.length>1?'s':''} suivi${fol.length>1?'s':''}</span></div>
      ${abTableHTML()}${blkHTML()}${(setTimeout(()=>soloTidy().catch(()=>{}), 400), '')}${Object.values(byCode).some(g=>g.length > 1 || g[0] !== cur) ? `<h3 class="sh-tb" data-t="ab">📣 Mes voyages publiés</h3>${(()=>{ const E = Object.entries(byCode), grp = E.filter(([c, t])=>t.length > 1), solo = E.filter(([c, t])=>t.length === 1 && t[0] !== cur).map(([c, t])=>t[0]);
        if(!grp.length || !solo.length) return E.map(([c, tids])=>tids.length > 1 ? grpRow(c, tids) : tids[0] !== cur ? pubRow(tids[0]) : '').join('');
        const empty = solo.filter(t=>!soloFw(t)).length;
        return grp.map(([c, tids])=>grpRow(c, tids)).join('') + `<details class="sh-card sh-tb sh-solo" data-t="ab"><summary><b>📣 Publiés à part, avec leur propre lien (${solo.length})</b><small class="v-sum-small" style="display:block">En dehors du carnet : chacun a son code abonné.</small></summary>
          ${empty ? `<button type="button" class="v-btn" style="margin:8px 0" onclick="CV.carnetPublishSheet()">📚 Mettre ${empty > 1 ? 'les ' + empty + ' voyages sans abonné' : 'le voyage sans abonné'} dans mon carnet</button>` : ''}${solo.map(pubRow).join('')}</details>`; })()}` : (cur ? '' : '<h3>📣 Mes voyages publiés</h3><div class="v-sum-small" style="margin-bottom:8px">Aucun voyage publié pour l’instant : dans un voyage, touche Partager puis Publier pour des abonnés.</div>')}
      ${fol.length ? '' : '<div class="sh-tb" data-t="suis"><h3>➡️ Les voyages que je suis</h3><div class="v-sum-small" style="margin-bottom:8px">Aucun pour l’instant.</div></div>'}
      ${Object.keys(PACKS()).length ? `<h3 class="sh-tb" data-t="comp">👥 Mes compagnons</h3>${Object.entries(PACKS()).map(([P, pk])=>`<div class="sh-card sh-tb" data-t="comp"><div class="sh-k">👤 <span data-notr>${esc(pk.who || '?')}</span></div>
        ${pk.trips.filter(t=>R[t] && !R[t].deleted).map(t=>`<div class="cv-prow" style="cursor:default"><span data-notr>🧳 ${esc(R[t].titre)}</span><button type="button" class="v-btn sec" style="width:auto;padding:4px 10px;margin:0" onclick="CV.packRemoveTrip('${ja(P)}','${ja(t)}')">✕ Retirer</button></div>`).join('') || '<div class="v-sum-small">Aucun voyage partagé.</div>'}
        <div class="cv-row" style="gap:6px;margin-top:8px"><button type="button" class="v-btn sec" onclick="CV.packSheet('${ja(P)}')">✏️ Choisir les voyages</button><button type="button" class="v-btn sec" onclick="CV.inviteSheet('', 'pack', '${ja(P)}')">📤 Invitation</button><button type="button" class="v-btn sec" onclick="CV.packDel('${ja(P)}')">🚫 Tout arrêter</button></div></div>`).join('')}` : ''}
      <div class="sh-card sh-tb" data-t="suis"><div class="sh-k">🔑 J’ai reçu un code</div>
        <button type="button" class="v-btn sec" onclick="CV.joinAny()">🔗 J’ai reçu un code : rejoindre un voyage</button>
        <button type="button" class="v-btn sec" onclick="CV.followSheet()">➕ Suivre un voyage avec un code</button></div>
      <div class="sh-card"><div class="sh-k">💌 Faire découvrir Vezoria</div><button type="button" class="v-btn sec" onclick="CV.shareSheet()">📤 Faire découvrir l’appli (QR code)</button></div>
      <details class="sh-more sh-tb" data-t="comp"><summary>🔑 Codes de mes voyages</summary><div class="v-sum-small" style="margin-bottom:6px">Le code d’un voyage permet à tes compagnons de le rejoindre (tout le voyage, pas seulement les photos).</div>
      ${tripsAll.map(codeRow).join('') || '<div class="v-sum-small">Aucun voyage.</div>'}
      ${M.sync.on && M.sync.code ? `<div class="v-sum-small" style="margin-top:8px">📱 Code de tous mes appareils : <b class="cv-code">${esc(M.sync.code)}</b></div>` : ''}
      ${cloudMode() === 'all' ? `<button type="button" class="cv-choice" style="margin-top:8px" onclick="CV.cloudShareAll()"><i>🌍</i><span><b>Je partage tout</b><small>Ils reçoivent un code compagnon et voient tous tes voyages, sans tes droits d’administrateur. Pour ta famille ou ton couple.</small></span></button>` : ''}</details>
      <button type="button" class="v-btn sec sh-tb" data-t="comp" style="margin-top:10px" onclick="CV.cloudSheet()">☁️ Cloud Vezoria</button>`;
  }
  // 🚫 Blocage : l'auteur bloque pour tous ses abonnés (liste blk du voyage publié), chacun peut aussi masquer quelqu'un chez lui
  const devOfRec = r => r ? (r.dev || (/^(lk|fw):/.test(r.id) ? r.id.split(':').pop() : '')) : '';
  function isBlk(r){ const d = devOfRec(r); if(!d || d === devId()) return false; if((M.blkDev||{})[d]) return true; const ft = R[r.trip]; return !!(ft && (ft.blk||[]).includes(d)); }
  const likesOf = fid => list('like', l=>l.feed===fid && l.on && !isBlk(l));
  const commentsOf = fid => list('comment', c=>c.feed===fid && !isBlk(c)).sort((a,b)=>(a.at||0)-(b.at||0));
  // « Anthony & Claire » : celui qui publie d’abord, puis ses compagnons (sans doublon)
  function ftTeam(ft){ const out = [], seen = new Set(); [ft && ft.owner, ...((ft && ft.team) || [])].forEach(n=>{ n = String(n || '').trim(); const k = n.toLowerCase(); if(n && !seen.has(k)){ seen.add(k); out.push(n); } }); return out; }
  const ftTeamTxt = ft => { const a = ftTeam(ft); return a.length ? (a.length > 4 ? a.slice(0, 4).join(', ') + ' +' + (a.length - 4) : a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' & ' + a[a.length - 1]) : '?'; };
  const isAuthorOf = ftid => !!FT()[String(ftid).replace(/^ft:/,'')] || !!mateCode(String(ftid).replace(/^ft:/,''));
  function cmMenu(cid){
    const c = R[cid]; if(!c) return; const mine = c.dev === devId(), author = isAuthorOf(c.trip), w = esc(c.who || '?');
    openSheet(`<h2>💬 ${w}</h2><div class="v-sum-small" style="margin-bottom:10px">« ${esc(String(c.text||'').slice(0, 200))} »</div>
      ${mine ? `<button type="button" class="v-btn sec" onclick="CV.cmEdit('${ja(cid)}')">✏️ Modifier mon commentaire</button>` : ''}
      ${mine || author ? `<button type="button" class="v-btn sec" onclick="CV.cmDel('${ja(cid)}')">🗑 Supprimer ce commentaire</button>` : ''}
      ${!mine ? `<button type="button" class="v-btn sec" onclick="CV.ugcReport('comment','${ja(cid)}')">🚩 Signaler ce commentaire</button>` : ''}
      ${!mine && author ? `<button type="button" class="v-btn sec" onclick="CV.userBlock('${ja(cid)}')">🚫 Bloquer ${w} (pour tous tes abonnés)</button>` : ''}
      ${!mine && !author ? `<button type="button" class="v-btn sec" onclick="CV.userHide('${ja(cid)}')">🙈 Masquer ce que publie ${w}</button>` : ''}
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  async function cmEdit(cid){ const c = R[cid]; if(!c || c.dev !== devId()) return; closeSheet(true);
    const t = await uiPrompt('Modifier ton commentaire :', c.text || ''); if(t === null) return; const v = String(t).trim().slice(0, 600); if(!v){ cmDel(cid); return; }
    if(v === c.text) return; putQuiet([Object.assign(clone(c), {text:v, edited:Date.now()})]); syncNow(); if(c.feed) feedPaint(c.feed); toast('✏️ Commentaire modifié'); }
  async function cmDel(cid){ const c = R[cid]; if(!c || !(await uiConfirm('Supprimer ce commentaire ?'))) return; const del = Object.assign(clone(c), {deleted:true}); putQuiet([del]); syncNow(); cmGoneEverywhere(R[cid] || del).catch(()=>{}); closeSheet(true); if(c.feed) feedPaint(c.feed); toast('🗑 Commentaire supprimé'); }
  // 🙈 personnes masquées sur ce téléphone (leurs ❤️ et commentaires n'apparaissent plus ici) : la liste, pour pouvoir les réafficher
  function blkHTML(){
    const D = Object.keys(M.blkDev || {}); if(!D.length) return '';
    const who = d => { const r = Object.values(R).filter(x=>x && devOfRec(x) === d && x.who).sort((a, b)=>(b.updatedAt || 0) - (a.updatedAt || 0))[0]; return r ? r.who : '?'; };
    return `<div class="sh-card sh-tb" data-t="ab"><div class="sh-k">🙈 ${esc(MSGT('Masqués sur ce téléphone'))}</div>
      <div class="v-sum-small" style="margin-bottom:6px">${esc(MSGT('Leurs ❤️ et commentaires ne s’affichent pas ici et ne te sont pas notifiés.'))}</div>
      ${D.map(d=>`<div class="cv-prow" style="cursor:default"><span data-notr>${esc(who(d))}</span><button type="button" class="v-btn sec" style="width:auto;margin:0;padding:4px 10px" onclick="CV.userUnhide('${ja(d)}')">${esc(MSGT('Réafficher'))}</button></div>`).join('')}</div>`;
  }
  function userUnhide(d){ if(M.blkDev) delete M.blkDev[d]; persist(); feedRepaintAll(); toast('👀 ' + MSGT('Réaffiché')); try { shareHub(); } catch(e){} }
  async function userHide(id){ const d = devOfRec(R[id]); if(!d) return; if(!(await uiConfirm('Masquer les commentaires et ❤️ de cette personne sur ce téléphone ?'))) return; (M.blkDev = M.blkDev || {})[d] = 1; persist(); closeSheet(true); feedRepaintAll(); toast('🙈 Masqué'); }
  async function userBlock(id){
    const r = R[id], d = devOfRec(r); if(!r || !d) return; const tid = String(r.trip).replace(/^ft:/,'');
    if(!(await uiConfirm(`Bloquer ${r.who || 'cette personne'} ?\n\nSes commentaires et ❤️ sont masqués pour tous tes abonnés, elle est retirée de la liste et ne voit plus tes souvenirs : un nouveau lien est transmis automatiquement à tes autres abonnés, pas à elle.`))) return;
    const code = FT()[tid], grp = code ? Object.keys(FT()).filter(x=>FT()[x] === code) : [tid];
    grp.forEach(x=>{ const b = (M.feedBlk = M.feedBlk || {})[x] || (M.feedBlk[x] = []); fwTwins(d).forEach(dv=>{ if(!b.includes(dv)) b.push(dv); }); });
    persist(); closeSheet(true);
    await feedRevoke(tid, d, r.who || '');
    feedRepaintAll();
  }
  // 🔑 clés personnelles (ECDH P-256) : l’auteur transmet un nouveau lien à chaque abonné, illisible pour les autres
  async function fKey(){
    if(M.fkey && M.fkey.pub && M.fkey.priv) return M.fkey;
    const kp = await crypto.subtle.generateKey({name:'ECDH', namedCurve:'P-256'}, true, ['deriveKey']);
    const [pub, priv] = await Promise.all([crypto.subtle.exportKey('jwk', kp.publicKey), crypto.subtle.exportKey('jwk', kp.privateKey)]);
    M.fkey = {pub:{kty:pub.kty, crv:pub.crv, x:pub.x, y:pub.y}, priv}; persist(); return M.fkey;
  }
  async function fShared(privJwk, pubJwk){
    const [pr, pu] = await Promise.all([crypto.subtle.importKey('jwk', privJwk, {name:'ECDH', namedCurve:'P-256'}, false, ['deriveKey']),
      crypto.subtle.importKey('jwk', pubJwk, {name:'ECDH', namedCurve:'P-256'}, false, [])]);
    return crypto.subtle.deriveKey({name:'ECDH', public:pu}, pr, {name:'AES-GCM', length:256}, false, ['encrypt', 'decrypt']);
  }
  // abonné : sa serrure (clé publique) part avec sa fiche « abonné »
  async function fwKeyTouch(){
    const me = devId(), ib = M.ib, nm = f => fwAsFor(TS()[f.trip]), mine = list('follower', f=>String(f.id).endsWith(':' + me) && (!f.pk || !f.ib || (ib && f.ib !== ib) || (nm(f) && f.who !== nm(f)) || (fwPid() && f.pid !== fwPid()) || (f.av || '') !== myAv() || Date.now() - (f.seen || 0) > 864e5) && TS()[f.trip] && !FT()[String(f.trip).replace(/^ft:/,'')]); if(!mine.length) return;
    const k = await fKey(), b = inbox(); putQuiet(mine.map(f=>{ const x = Object.assign(clone(f), {pk:k.pub, ib:b, seen:Date.now()}, fwPid() ? {pid:fwPid()} : {}, nm(f) ? {who:nm(f)} : {}); if(myAv()) x.av = myAv(); else delete x.av; return x; }));
  }
  // auteur : retirer vraiment l’accès d’un abonné = nouveau lien, transmis chiffré à chacun des autres
  async function feedRevoke(tid, dev, who){ return ab2FwDel(dev);
    const devs = fwTwins(dev), g0 = grpCodeOf(tid);   // la personne sur TOUS ses appareils (navigateur et appli)
    for(const dv of devs) for(const t of grpTrips(g0)) if(FRX()[t] && !FRX()[t].ex.includes(dv)) await feedRestrict(t, dv);   // voyages « à part » : cachés à cette personne aussi
    if(!Object.keys(FT()).some(x=>FT()[x] === g0)){ try { await syncNow(); feedUpload(); feedPurge(); } catch(e){} toast('🔑 Accès retiré'); refresh(); return; }
    const old = g0, oldSp = old && spaceObj(old); if(!old || !oldSp) return;
    const grp = Object.keys(FT()).filter(x=>FT()[x] === old), ids = new Set(grp.map(ftId)), me = devId();
    const byDev = {}; list('follower', f=>ids.has(f.trip)).forEach(f=>{ const d = String(f.id).split(':').pop(); if(!devs.includes(d) && d !== me && !(M.blkDev||{})[d]) byDev[d] = (byDev[d] && byDev[d].pk) ? byDev[d] : f; });
    const withKey = Object.values(byDev).filter(f=>f.pk), noKey = Object.values(byDev).filter(f=>!f.pk);
    cryptShow('🔑 Nouveau lien pour tes abonnés…');
    try {
      const k = await fKey(), c = genCode(), env = [];
      for(const f of withKey){ const d = String(f.id).split(':').pop();
        try { const key = await fShared(k.priv, f.pk), iv = crypto.getRandomValues(new Uint8Array(12));
          const ct = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, new TextEncoder().encode(c)));
          env.push({id:'fx:' + d, type:'feedmove', trip:ftId(grp[0]), dev:d, opk:k.pub, iv:b64(iv), ct:b64(ct), at:Date.now()}); } catch(e){} }
      // l’ancien lien ne montre plus rien : tout y est retiré, il ne reste que les nouveaux liens chiffrés
      const all = Object.values(R).filter(r=>r && !r.deleted && (ids.has(r.trip) || ids.has(r.id) || grp.some(x=>r.id === 'fk:' + x)));
      await spacePushOnly(oldSp, [...all.map(r=>Object.assign(clone(r), {deleted:true})), ...env]);
      // nouveau lien : mêmes voyages, mêmes ❤️ et commentaires (sauf ceux de la personne bloquée)
      (M.spaces = M.spaces || []).push({code:c, since:0, dirty:[], last:0, err:''});
      grp.forEach(x=>{ FT()[x] = c; TS()[ftId(x)] = c; }); if(M.feedAll === old) M.feedAll = c;
      Object.values(R).filter(r=>r && (ids.has(r.trip) || ids.has(r.id)) && devs.includes(String(r.id).split(':').pop()) && /^(fw|lk):/.test(r.id)).forEach(r=>{ r.deleted = true; });
      Object.values(R).filter(r=>r && (ids.has(r.trip) || ids.has(r.id) || grp.some(x=>r.id === 'fk:' + x))).forEach(r=>markDirty(r.id));
      M.spaces = M.spaces.filter(x=>x.code !== old); (M.fold = M.fold || []).push({code:old, at:Date.now()});   // l’ancien lien est effacé du serveur dans 2 mois
      Object.values(FRX()).forEach(x=>{ if(x.g === old){ x.g = c; x.sent = {}; } }); fgAt = 0;   // voyages « à part » : leurs codes repartent sous le nouveau lien
      if(M.fup) delete M.fup[old]; M.fq = (M.fq||[]).filter(x=>x[0] !== old); M.fdel = (M.fdel||[]).filter(x=>x[0] !== old); M.fwipe = (M.fwipe||[]).concat([old]);   // vignettes de l’ancien lien : effacées
      persist(); grp.forEach(x=>feedBuild(x));
      try { await syncNow(); feedUpload(); feedPurge(); } catch(e){}
      cryptHide('🔑 Accès retiré' + (who ? ' à ' + who : ''));
      toast(withKey.length ? `🔑 ${withKey.length} abonné(s) passent automatiquement au nouveau lien` : '🔑 Nouveau lien créé');
      if(noKey.length && (await uiConfirm(MSGT('{0} abonné(s) ont une ancienne version de l’appli et ne reçoivent pas le nouveau lien automatiquement.').replace('{0}', noKey.length) + '\n\n' + MSGT('Leur envoyer le nouveau lien maintenant (pas à la personne bloquée) ?')))) await carnetInvite(c);
    } catch(e){ cryptHide(); alert('Retrait impossible pour l’instant (réseau ?) : ' + (e.message || e)); }
    refresh();
  }
  // abonné : l’auteur a changé de lien → on passe au nouveau, sans rien demander
  async function feedMoveCheck(){ return;
    const me = devId(), done = M.fmoved || (M.fmoved = {});
    for(const m of list('feedmove', x=>x.dev === me && x.opk && x.ct && TS()[x.trip])){
      const old = TS()[m.trip], key = m.id + ':' + old; if(done[key]) continue; done[key] = 1;
      try {
        const k = await fKey(), sk = await fShared(k.priv, m.opk);
        const c = new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM', iv:unb64(m.iv)}, sk, unb64(m.ct)));
        if(!/^[A-Z0-9-]{8,}$/.test(c) || spaceObj(c)) continue;
        Object.keys(TS()).forEach(x=>{ if(TS()[x] === old) delete TS()[x]; }); M.spaces = (M.spaces||[]).filter(x=>x.code !== old);
        if(M.webCode === old) M.webCode = c;
        M.spaces.push({code:c, since:0, dirty:[], last:0, err:''}); const sp = spaceObj(c); await syncSpace(sp, true);
        list('feedtrip', f=>TS()[f.id] === c && !f.deleted).forEach(ft=>{ const id = 'fw:' + ft.id + ':' + me; if(!R[id] || R[id].deleted) putQuiet([{id, type:'follower', pid:fwPid(), trip:ft.id, who: myName() || 'Un proche', pk:k.pub}]); });
        persist(); refresh();
      } catch(e){}
    }
  }
  /* ══════════ 👁️ Abonnés : ce que voit CHAQUE personne (voyage par voyage) ══════════
     Un voyage caché à quelqu’un quitte le lien du carnet et passe sur son propre code, transmis chiffré
     (clé personnelle de chaque téléphone) à tous les autres abonnés du carnet. Ceux qui arrivent ensuite le reçoivent aussi. */
  const FRX = () => M.fRx || (M.fRx = {});                       // voyage → {g: lien du carnet, c: son code, ex: [appareils exclus], sent: {appareil: code}}
  const grpCodeOf = tid => (FRX()[tid] && FRX()[tid].g) || FT()[tid];
  const grpTrips = g => Object.keys(FT()).filter(t=>R[t] && !R[t].deleted && grpCodeOf(t) === g);
  // 👤 un abonné = une personne : son prénom (ou le nom que je lui ai donné) ; le même prénom sur deux appareils
  //    (navigateur puis appli installée) = une seule personne, la plus récente
  const fwDevOf = x => String(x.id).split(':').pop();
  const fwGeneric = n => !n || /^(un proche|someone|\?)$/i.test(String(n).trim());
  let fwmC = null, fwmT = 0;
  // un abonné est mon compagnon seulement si SON téléphone l’a dit (fiche abonné portant son identifiant de compagnon) ;
  // toutes les fiches de ce même appareil le sont aussi. Jamais deviné d’après le prénom.
  function fwMatePid(x){
    if(!x) return '';
    if(x.pid && prof(x.pid)) return x.pid;
    if(!fwmC || Date.now() - fwmT > 1500){
      fwmC = {}; fwmT = Date.now();
      list('follower', f=>!f.deleted && f.pid && prof(f.pid)).forEach(f=>{ fwmC[fwDevOf(f)] = f.pid; });
    }
    return fwmC[fwDevOf(x)] || '';
  }
  const fwMate = x => !!fwMatePid(x);
  const fwLabel = x => ((M.fwNick || {})[fwDevOf(x)]) || (fwMate(x) ? pname(fwMatePid(x)) : '') || (fwGeneric(x.who) ? '' : x.who);
  const fwRoot = d => { const seen = new Set(); while(d && !seen.has(d)){ seen.add(d); const f = list('follower', x=>fwDevOf(x) === d && x.same)[0]; if(!f || f.same === d) break; d = f.same; } return d; };
  const fwKey = x => { const n = ((M.fwNick || {})[fwDevOf(x)] || '').trim().toLowerCase(); return fwMate(x) ? 'p:' + fwMatePid(x) : n ? 'n:' + n : 'd:' + fwDevOf(x); };
  function fwUniq(arr){ const by = {}; arr.forEach(x=>{ const k = fwKey(x), c = by[k]; if(!c || (x.updatedAt || 0) > (c.updatedAt || 0)) by[k] = x; }); return Object.values(by); }
  // deux personnes différentes avec le même prénom : « Claire », « Claire (2) »
  function fwNames(arr){ const n = {}, out = {};
    profiles().forEach(p=>{ const k = String(p.nom || '').trim().toLowerCase(); if(k) n[k] = 1; });   // un abonné ne porte jamais le nom d’un compagnon
    arr.slice().sort((a, b)=>(a.createdAt || 0) - (b.createdAt || 0)).forEach(x=>{ if(fwMate(x)){ out[x.id] = '🧳 ' + pname(fwMatePid(x)); return; } const l = fwLabel(x); if(!l) return; const k = l.trim().toLowerCase(); n[k] = (n[k] || 0) + 1; out[x.id] = n[k] > 1 ? l + ' ' + n[k] : l; });
    return out; }
  // tous les appareils d’une même personne parmi mes abonnés (même prénom ou même nom donné)
  function fwTwins(d){ const mine = new Set(Object.keys(FT()).map(ftId)), all = list('follower', f=>mine.has(f.trip)), me = all.find(f=>fwDevOf(f) === d);
    if(!me) return [d]; const k = fwKey(me); return [...new Set([d, ...all.filter(f=>fwKey(f) === k).map(fwDevOf)])]; }
  async function fwNickAsk(d){
    const cur = (M.fwNick || {})[d] || '';
    const n = await uiPrompt(MSGT('Qui est-ce ? Donne-lui un nom pour t’y retrouver (toi seul le vois).'), cur); if(n === null) return;
    M.fwNick = M.fwNick || {}; if(n.trim()) M.fwNick[d] = n.trim().slice(0, 40); else delete M.fwNick[d];
    persist(); linksScan(); try { socialHub(); } catch(e){ refresh(); }
  }
  function grpFollowers(g){   // un abonné = une personne (l’appareil le plus récent), sans les bloqués ni moi
    const ids = new Set(grpTrips(g).map(ftId)), me = devId(), by = {};
    list('follower', f=>ids.has(f.trip) && !isBlk(f)).forEach(f=>{ const d = String(f.id).split(':').pop(); if(d === me || (M.blkDev||{})[d]) return; if(!by[d] || (f.pk && !by[d].pk)) by[d] = f; });
    return Object.fromEntries(fwUniq(Object.values(by)).map(f=>[fwDevOf(f), f]));
  }
  function fwTripsSheet(g, dev){
    const ts = grpTrips(g).sort((a,b)=>(R[b].debut||'').localeCompare(R[a].debut||'')), f = grpFollowers(g)[dev]; if(!f) return;
    openSheet(`<h2>👁️ Ce que voit <span data-notr>${esc(f.who || '?')}</span></h2>
      <div class="v-sum-small" style="margin-bottom:8px">Décoche un voyage pour le cacher à cette personne seulement. Tes autres abonnés le voient toujours.</div>
      ${(()=>{ const mp = fwMatePid(f); return ts.map(t=>{ const cp = mp && (R[t].voyageurs || []).includes(mp);
        return `<label class="cv-checkline"><input type="checkbox" class="fwt" value="${t}"${((FRX()[t]||{}).ex||[]).includes(dev) ? '' : ' checked'}> <span><span data-notr>${esc(R[t].titre)}</span>${cp ? ` <small class="v-sum-small">🧳 ${esc(MSGT('compagnon : il l’a déjà en entier'))}</small>` : ((FRX()[t]||{}).ex||[]).includes(dev) ? ` <small class="v-sum-small">🙈 ${esc(MSGT('Masqué'))}</small>` : ''}</span></label>`; }).join(''); })()}
      ${(()=>{ const solo = Object.keys(FT()).filter(t=>R[t] && !R[t].deleted && grpCodeOf(t) !== g).sort((a,b)=>(R[b].debut||'').localeCompare(R[a].debut||''));
        if(!solo.length) return '';
        const twins = new Set(fwTwins(dev));
        return `<div class="sh-k" style="margin-top:12px">📣 Publiés à part, avec leur propre lien</div><div class="v-sum-small" style="margin-bottom:6px">Hors du carnet : cette personne les voit seulement si elle a reçu leur lien.</div>`
          + solo.map(t=>{ const sees = list('follower', x=>x.trip === ftId(t) && !x.deleted && twins.has(fwDevOf(x))).length;
            return `<div class="cv-checkline" style="cursor:default"><span>${sees ? '✅' : '➖'}</span> <span><span data-notr>${esc(R[t].titre)}</span> <small class="v-sum-small">${sees ? 'le suit' : 'ne le suit pas'}</small></span></div>`; }).join(''); })()}
      ${(()=>{ const none = myTrips().filter(t=>!FT()[t.id]).sort((a,b)=>(b.debut||'').localeCompare(a.debut||''));
        if(!none.length) return '';
        return `<div class="sh-k" style="margin-top:12px">🔒 ${esc(MSGT('Montrés à personne'))}</div><div class="v-sum-small" style="margin-bottom:6px">${esc(MSGT('Coche un voyage pour le montrer à cette personne seulement.'))}</div>`
          + none.map(t=>`<label class="cv-checkline"><input type="checkbox" class="fwn" value="${t.id}"> <span data-notr>${esc(t.titre)}</span></label>`).join(''); })()}
      ${f.pk ? '' : `<div class="v-sum-small" style="margin-top:6px">⚠️ Cette personne a une ancienne version de l’appli : un voyage caché ne lui sera plus montré, mais un voyage remis ne lui reviendra qu’après sa mise à jour.</div>`}
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.fwTripsSave('${ja(g)}','${ja(dev)}')">✅ Enregistrer</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  async function fwTripsSave(g, dev){
    const on = new Set([...document.querySelectorAll('.fwt:checked')].map(i=>i.value)), add = [...document.querySelectorAll('.fwn:checked')].map(i=>i.value), ts = grpTrips(g); closeSheet(true);
    let hid = 0, shown = 0;
    // 🔒 un voyage montré à personne → à cette personne seulement : il rejoint le carnet, caché à tous les autres abonnés
    const others = Object.keys(grpFollowers(g)).filter(d=>d !== dev);
    for(const t of add){ if(!R[t] || FT()[t]) continue;
      FT()[t] = g; persist();
      if(others.length){ FRX()[t] = {g, c:g, ex:others.slice(), sent:{}}; await feedRestrict(t, others[0]); }
      feedBuild(t); shown++; }
    if(add.length){ for(const t of add) if(FRX()[t]) await feedGrantSync(t); setTimeout(()=>{ try { pushRegister(true); } catch(e){} }, 2500); }
    for(const t of ts){ const r = FRX()[t], ex = (r && r.ex) || [];
      if(on.has(t) && ex.includes(dev)){ r.ex = ex.filter(x=>x !== dev); persist(); shown++; }
      else if(!on.has(t) && !ex.includes(dev)){ await feedRestrict(t, dev); hid++; } }
    for(const t of ts) if(FRX()[t]) await feedGrantSync(t);
    try { await syncNow(); feedUpload(); feedPurge(); } catch(e){}
    toast(hid || shown ? '👁️ C’est enregistré' : 'Rien n’a changé'); refresh();
  }
  // cacher le voyage t à l’appareil dev : nouveau code pour ce voyage, l’ancien ne montre plus rien
  async function feedRestrict(t, dev){
    const old = FT()[t], g = grpCodeOf(t), oldSp = old && spaceObj(old); if(!old || !oldSp) return;
    const r = FRX()[t] || (FRX()[t] = {g, c:old, ex:[], sent:{}}); if(dev && !r.ex.includes(dev)) r.ex.push(dev);
    cryptShow(dev ? '👁️ Je cache ce voyage…' : '🔗 Lien du voyage…');
    try {
      const id = ftId(t), all = Object.values(R).filter(x=>x && !x.deleted && (x.trip === id || x.id === id || x.id === 'fk:' + t));
      const grants = list('feedgrant', x=>x.tid === t && (!dev || String(x.id).endsWith(':' + dev)));
      await spacePushOnly(oldSp, all.map(x=>Object.assign(clone(x), {deleted:true})));
      if(grants.length) putQuiet(grants.map(x=>Object.assign(clone(x), {deleted:true})));
      // vignettes de ce voyage sous l’ancien code : effacées
      const phs = new Set(list('feed', x=>x.trip === id).flatMap(x=>(x.photos||[]).map(String)));
      if(old === g) M.fdel = (M.fdel||[]).concat(Object.keys((M.fup||{})[old] || {}).filter(p=>phs.has(String(p).replace(/\.t$/, ''))).map(p=>[old, p]));
      else { M.fwipe = (M.fwipe||[]).concat([old]); if(M.fup) delete M.fup[old]; M.fq = (M.fq||[]).filter(x=>x[0] !== old); M.spaces = (M.spaces||[]).filter(x=>x.code !== old); (M.fold = M.fold || []).push({code:old, at:Date.now()}); }
      const c = genCode(); (M.spaces = M.spaces || []).push({code:c, since:0, dirty:[], last:0, err:''});
      FT()[t] = c; TS()[id] = c; r.c = c; r.sent = {};
      Object.values(R).filter(x=>x && (x.trip === id || x.id === id || x.id === 'fk:' + t) && !(dev && /^(fw|lk):/.test(x.id) && String(x.id).split(':').pop() === dev)).forEach(x=>markDirty(x.id));
      persist(); feedBuild(t);
    } finally { cryptHide(dev ? '👁️ Voyage caché à cette personne' : '🔗 Ce voyage a son propre lien'); }
  }
  // 🙈 cacher un voyage à quelqu'un AVANT même qu'il s'abonne, par son prénom : le voyage passe « à part » (son code est donné à chaque abonné),
  // et toute personne abonnée sous ce prénom ne reçoit jamais ce code (comme 👁️ « choisir ce qu'il voit »).
  function preHideSheet(tid){
    const t = R[tid]; if(!t) return; const L = ((M.preHide || {})[tid]) || [];
    openSheet(`<h2>🙈 ${esc(RF('Cacher « {0} » à quelqu’un', t.titre || ''))}</h2>
      <div class="v-sum-small" style="margin-bottom:8px">${esc(MSGT('Écris le prénom de la personne, même si elle ne s’est pas encore abonnée : si elle s’abonne sous ce prénom, ce voyage ne lui est jamais montré. Déjà abonnée : il disparaît de son appli.'))}</div>
      ${L.map(n=>`<div class="cv-prow" style="cursor:default"><span data-notr>🙈 ${esc(n)}</span><button type="button" class="v-btn sec" style="width:auto;margin:0;padding:4px 10px" onclick="CV.preHideDel('${ja(tid)}','${ja(n)}')" aria-label="${esc(MSGT('Retirer'))}">✕</button></div>`).join('')}
      ${(()=>{ // 👥 les prénoms déjà connus : tes abonnés et tes compagnons, à toucher plutôt qu’à retaper
        let fw = []; try { const ids = new Set(Object.keys(FT()).filter(x=>R[x] && !R[x].deleted).map(ftId)); const F = fwUniq(list('follower', x=>ids.has(x.trip) && !isBlk(x) && !String(x.id).endsWith(':' + devId()))), N = fwNames(F); fw = F.map(x=>String(N[x.id] || x.who || '').replace(/^🧳\s*/, '').trim()); } catch(e){}
        const comp = list('profile', p=>p.id !== M.me && !p.deleted).map(p=>pname(p.id));
        const seen = new Set(L.map(phName)), names = [...fw, ...comp].filter(n=>{ const k = phName(n); if(!n || !k || seen.has(k)) return false; seen.add(k); return true; });
        return names.length ? `<div class="v-sum-small" style="margin-top:10px">${esc(MSGT('Toucher un prénom :'))}</div><div class="sp2-pills" style="flex-wrap:wrap;margin-top:6px">${names.map(n=>`<button type="button" onclick="document.getElementById('ph-n').value=${esc(JSON.stringify(n))};CV.preHideAdd('${ja(tid)}')"><span data-notr>🙈 ${esc(n)}</span></button>`).join('')}</div>` : ''; })()}
      <div class="cv-row" style="margin-top:8px;gap:6px"><input class="v-in" id="ph-n" placeholder="${esc(MSGT('Prénom'))}" maxlength="40" autocomplete="off"><button type="button" class="v-btn" style="width:auto;margin:0" onclick="CV.preHideAdd('${ja(tid)}')">＋ ${esc(MSGT('Cacher'))}</button></div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">${esc(MSGT('Fermer'))}</button></div>`);
  }
  const phName = s => normQ(String(s || '').replace(/\s*\d+$/, '')).trim();
  async function preHideAdd(tid){
    const e = document.getElementById('ph-n'), n = (e && e.value || '').trim(); if(!n) return;
    const P = M.preHide || (M.preHide = {}), L = P[tid] || (P[tid] = []); if(!L.some(x=>phName(x) === phName(n))) L.push(n); persist();
    try {
      if(!FRX()[tid]) await feedRestrict(tid, '');   // le voyage passe « à part » : chaque abonné reçoit son code, sauf les prénoms cachés
      const r = FRX()[tid], nx = preHideApply(tid);
      for(const d of nx) if(r && r.sent && r.sent[d]) await feedRestrict(tid, d);   // déjà abonnée et déjà servie : nouveau code, sans elle
      await feedGrantSync(tid); await syncNow();
    } catch(err){}
    toast('🙈 ' + RF('Caché à {0}', n)); preHideSheet(tid);
  }
  function preHideDel(tid, n){ const P = M.preHide || {}; P[tid] = (P[tid] || []).filter(x=>phName(x) !== phName(n)); persist(); preHideSheet(tid); }
  function preHideApply(tid){
    const L = ((M.preHide || {})[tid] || []).map(phName).filter(Boolean), r = FRX()[tid], out = []; if(!L.length || !r) return out;
    Object.entries(grpFollowers(r.g)).forEach(([d, f])=>{ const w = phName(f.who), w1 = w.split(' ')[0]; if((L.includes(w) || L.includes(w1)) && !r.ex.includes(d)){ r.ex.push(d); out.push(d); } });
    if(out.length) persist(); return out;
  }
  // donne le code d’un voyage « à part » à chaque abonné du carnet qui a le droit de le voir (chiffré pour lui seul)
  async function feedGrantSync(t){
    const r = FRX()[t]; if(!r || !FT()[t]) return 0;
    const g = r.g; if(!spaceObj(g)) return 0;
    { const nx = preHideApply(t); const late = nx.filter(d=>r.sent && r.sent[d] === r.c); if(late.length) setTimeout(()=>{ late.reduce((p, d)=>p.then(()=>feedRestrict(t, d)), Promise.resolve()).catch(()=>{}); }, 500); }
    TS()['fa:' + g] = g; r.sent = r.sent || {};
    const k = await fKey(), fws = grpFollowers(g), out = []; let n = 0;
    for(const [d, f] of Object.entries(fws)){
      if(r.ex.includes(d) || !f.pk || r.sent[d] === r.c) continue;
      try { const key = await fShared(k.priv, f.pk), iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, new TextEncoder().encode(r.c)));
        out.push({id:'fg:' + t + ':' + d, type:'feedgrant', trip:'fa:' + g, tid:t, dev:d, opk:k.pub, iv:b64(iv), ct:b64(ct)}); r.sent[d] = r.c; n++; } catch(e){} }
    r.ex.forEach(d=>{ const x = R['fg:' + t + ':' + d]; if(x && !x.deleted) out.push(Object.assign(clone(x), {deleted:true})); });
    if(out.length){ putQuiet(out); persist(); }
    return n;
  }
  let fgAt = 0;
  async function feedGrantAll(){ return; if(Date.now() - fgAt < 60000) return; fgAt = Date.now(); for(const t of Object.keys(FRX())) { if(FT()[t]) await feedGrantSync(t).catch(()=>0); else delete FRX()[t]; } }
  // abonné : on m’a donné le code d’un voyage « à part » → je le suis, sans rien demander
  async function feedGrantCheck(){ return;
    const me = devId(), got = M.fgot || (M.fgot = {});
    for(const x of list('feedgrant', y=>y.dev === me && y.opk && y.ct && !(M.unfol||{})['ft:' + y.tid])){   // voyage que je ne suis plus : pas de retour automatique
      try {
        const k = await fKey(), sk = await fShared(k.priv, x.opk);
        const c = new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM', iv:unb64(x.iv)}, sk, unb64(x.ct)));
        if(!/^[A-Z0-9-]{8,}$/.test(c) || got[x.tid] === c && spaceObj(c)) continue;
        const prev = got[x.tid]; got[x.tid] = c;
        if(prev && prev !== c){ M.spaces = (M.spaces||[]).filter(s=>s.code !== prev); Object.keys(TS()).forEach(z=>{ if(TS()[z] === prev) delete TS()[z]; }); }
        if(!spaceObj(c)) (M.spaces = M.spaces || []).push({code:c, since:0, dirty:[], last:0, err:''});
        await syncSpace(spaceObj(c), true);
        list('feedtrip', f=>TS()[f.id] === c && !f.deleted).forEach(ft=>{ const id = 'fw:' + ft.id + ':' + me; if(!R[id] || R[id].deleted) putQuiet([{id, type:'follower', pid:fwPid(), trip:ft.id, who: myName() || 'Un proche', pk:k.pub}]); });
        persist(); refresh();
      } catch(e){}
    }
    // voyage qu’on m’a retiré : j’arrête de le suivre
    Object.entries(got).forEach(([t, c])=>{ const x = R['fg:' + t + ':' + me]; if(x && x.deleted){ M.spaces = (M.spaces||[]).filter(s=>s.code !== c); delete got[t]; persist(); } });
  }
  // 🩹 je suis ce voyage mais ma fiche d’abonné a été effacée (« Ne plus suivre » puis retour par le même lien, ou retiré de la liste
  //    par l’auteur alors que j’utilise toujours ce téléphone) : elle renaît, l’auteur me revoit dans ses abonnés
  let fwHealAt = 0;
  async function fwSelfHeal(){ return;   // abonnés v2 : un abonné retiré ne renaît plus
    if(Date.now() - fwHealAt < 110e3) return; fwHealAt = Date.now();
    try {
      const me = devId(), un = M.unfol || {}, out = [];
      const fol = list('feedtrip', f=>!f.deleted && TS()[f.id] && !FT()[String(f.id).replace(/^ft:/, '')] && !un[f.id] && spaceObj(TS()[f.id]));
      if(!fol.length) return; let pk = ''; try { pk = (await fKey()).pub; } catch(e){}
      fol.forEach(ft=>{ const id = 'fw:' + ft.id + ':' + me, cur = R[id]; if(cur && !cur.deleted) return;
        out.push({id, type:'follower', pid:fwPid(), trip:ft.id, who:fwAsFor(TS()[ft.id]) || myName() || 'Un proche', pk}); });
      if(out.length){ putQuiet(out); socialPush(out[0].trip, 'follow', ''); }
    } catch(e){}
  }
  setTimeout(fwSelfHeal, 20000); setInterval(fwSelfHeal, 5 * 60e3);

  /* ══════════ 📱 Mes appareils : qui a ouvert mon carnet avec mon code administrateur ══════════
     Chaque appareil du propriétaire laisse une fiche chiffrée « dv:<appareil> » dans le carnet (son nom : « iPhone · Safari »).
     Un appareil qui vient d’ouvrir le carnet avec le code prévient les autres (notification + message à l’ouverture), et chacun
     peut le bloquer. On ne demande PAS l’accord d’un autre appareil : celui qui a perdu son téléphone n’a plus que son code. */
  const devApi = () => { const u = apiUrl(); return u ? u.replace(/\/sync$/, '/device') : ''; };
  // l’identifiant de l’appareil accompagne les synchros et les photos : le serveur refuse un appareil bloqué
  { const f0 = window.fetch.bind(window);
    window.fetch = (u, o) => { try { const url = typeof u === 'string' ? u : (u && u.url) || '';
      if(/\/api\/(sync|photo|device|rotate|member|account|plan)\b/.test(url) && o && o.headers && !(o.headers instanceof Headers) && o.headers['X-Carnet-Code'] && !o.headers['X-Carnet-Dev']) o = Object.assign({}, o, {headers:Object.assign({}, o.headers, {'X-Carnet-Dev':devId()})}); } catch(e){}
      return f0(u, o); }; }
  function devLabel(){
    const ua = navigator.userAgent || '', pl = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iPad' : /Android/.test(ua) ? (/Mobile/.test(ua) ? MSGT('Téléphone Android') : MSGT('Tablette Android')) : /Windows/.test(ua) ? 'PC Windows' : /Macintosh/.test(ua) ? 'Mac' : /CrOS/.test(ua) ? 'Chromebook' : /Linux/.test(ua) ? 'Linux' : MSGT('Appareil');
    const br = (typeof inPlay === 'function' && inPlay()) ? MSGT('appli Google Play') : /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Chrome\//.test(ua) && !/Edg\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
    return pl + (br ? ' · ' + br : '');
  }
  const dvMine = () => 'dv:' + devId();
  const dvOwner = () => { try { return ownerOn(); } catch(e){ return false; } };
  async function devPush(label, code0){
    try { const code = code0 || M.sync.code; if(!code || !pushApi()) return; const kk = await keys(code);
      const p = {k:'device', who:myName() || '', it:[{x:label}], n:1};
      const msg = b64(await seal(te.encode(JSON.stringify(p)), code));
      await pushPost(code, {a:'send', kind:'device', kid:kk.token.slice(0, 16), msg, tag:'device-' + devId()}); } catch(e){}
  }
  let dvBusy = false;
  async function dvTick(){
    if(dvBusy || !dvOwner() || !M.sync.last) return; dvBusy = true;
    try {
      const id = dvMine(), cur = R[id], now = Date.now(), label = devLabel();
      if(!cur || cur.deleted){
        const others = list('device', d=>d.id !== id && !d.deleted).length, fresh = !!(M.sync.joinAt && now - M.sync.joinAt < 3600e3);
        putQuiet([{id, type:'device', label, first:now, last:now, fresh, by:M.me || ''}]);
        if(fresh && others) devPush(label);   // un appareil de plus sur un carnet qui en avait déjà : les autres sont prévenus
        if(!M.dvSince) M.dvSince = now;
      } else if(now - (cur.last || 0) > 864e5 || cur.label !== label) putQuiet([Object.assign(clone(cur), {last:now, label})]);
      if(!M.dvSince){ M.dvSince = now; persist(); }
      // 👀 un nouvel appareil a ouvert mon carnet depuis que celui-ci le surveille
      const K = M.dvKnown || (M.dvKnown = {});
      const nw = list('device', d=>d.id !== id && !d.deleted && !d.blocked && d.fresh && !K[d.id] && (d.first || 0) > M.dvSince - 60e3);
      list('device', d=>d.id !== id && !K[d.id] && !nw.includes(d)).forEach(d=>{ K[d.id] = 1; });
      if(nw.length && !document.getElementById('cv-moment') && !document.getElementById('v-sheet-bg')){
        const d = nw[0]; K[d.id] = 1; persist();
        momentShow(`<div class="mo-k">${MSGT('Sécurité')}</div><div class="mo-big">📱</div><h2>${MSGT('Un nouvel appareil a ouvert ton carnet')}</h2>
          <div class="mo-sub"><b data-notr>${esc(d.label || MSGT('Appareil'))}</b> · ${esc(new Date(d.first || now).toLocaleString((window.I18N && I18N.locale) || 'fr-FR', {day:'numeric', month:'long', hour:'2-digit', minute:'2-digit'}))}<br><br>${MSGT('Il a utilisé ton code administrateur. Si c’est toi (nouveau téléphone, ordinateur), tout va bien. Sinon, bloque-le : il ne pourra plus rien lire ni modifier.')}</div>
          <div class="mo-b"><button type="button" class="pri" onclick="CV.momentClose()">✓ ${MSGT('C’est moi')}</button><button type="button" onclick="CV.momentClose();CV.devBlock('${ja(d.id)}')">🚫 ${MSGT('Ce n’est pas moi : bloquer')}</button></div>`, 'eve');
      } else if(nw.length) {} else persist();
    } catch(e){} finally { dvBusy = false; }
  }
  setTimeout(dvTick, 12000); setInterval(dvTick, 60e3);
  // 📱 dès la 1re synchro réussie de cet appareil : il s’inscrit tout de suite dans « Mes appareils » (avant : jusqu’à 1 min plus tard, pendant laquelle on ne pouvait ni le voir ni le bloquer)
  function dvSoon(){ try { if(dvOwner() && M.sync.last && !(R[dvMine()] && !R[dvMine()].deleted)) setTimeout(dvTick, 600); } catch(e){} }
  async function devBlock(id, un){
    const d = R[id]; if(!d) return; const dev = String(id).replace(/^dv:/, '');
    if(!un && !(await uiConfirm(RF('Bloquer « {0} » ? Il ne pourra plus ouvrir ton carnet.', d.label || MSGT('Appareil'))))) return;
    try { const r = await fetch(devApi(), {method:'POST', headers:{'Content-Type':'application/json', 'X-Carnet-Code':await authCode(M.sync.code)}, body:JSON.stringify({a:un ? 'unblock' : 'block', dev})});
      const j = await r.json().catch(()=>({})); if(!r.ok) throw new Error(srvMsg(j.error) || ('erreur ' + r.status)); }
    catch(e){ alert(e.message); return; }
    putQuiet([Object.assign(clone(d), {blocked:!un})]); persist();
    if(!un) alert(MSGT('🚫 Appareil bloqué : il ne peut plus lire ni modifier ton carnet.') + '\n\n' + MSGT('Ton code administrateur reste le même. Si quelqu’un d’autre le connaît, change-le : 🛡️ Mes appareils → 🔑 Changer mon code administrateur.'));
    else toast('✓ ' + MSGT('Appareil débloqué'));
    devSheet();
  }
  function devSheet(){
    if(!dvOwner()){ toast(MSGT('Mets d’abord ton carnet dans le cloud.')); return; }
    const me = dvMine(), L = list('device', d=>!d.deleted).sort((a, b)=>(a.id === me ? -1 : b.id === me ? 1 : (b.last || 0) - (a.last || 0)));
    const when = t => t ? new Date(t).toLocaleDateString((window.I18N && I18N.locale) || 'fr-FR', {day:'numeric', month:'short', year:'numeric'}) : '';
    openSheet(`<h2>📱 ${esc(MSGT('Mes appareils'))}</h2>
      <div class="v-sum-small" style="margin-bottom:10px">${esc(MSGT('Les appareils qui ont ouvert ton carnet avec ton code administrateur. Quand un nouveau arrive, les autres sont prévenus. Tu peux en bloquer un à tout moment.'))}</div>
      ${L.map(d=>`<div class="cv-prow"><span><b data-notr>${esc(d.label || MSGT('Appareil'))}</b>${d.id === me ? ` · <small>${esc(MSGT('cet appareil'))}</small>` : ''}<small class="v-sum-small" style="display:block">${esc(RF('Depuis le {0} · vu le {1}', when(d.first), when(d.last)))}${d.blocked ? ' · 🚫 ' + esc(MSGT('bloqué')) : ''}</small></span>
        ${d.id === me ? '' : `<button type="button" class="v-btn sec" style="width:auto;margin:0;padding:6px 12px" onclick="CV.devBlock('${ja(d.id)}'${d.blocked ? ', 1' : ''})">${d.blocked ? esc(MSGT('Débloquer')) : '🚫 ' + esc(MSGT('Bloquer'))}</button>`}</div>`).join('') || `<div class="v-sum-small">${esc(MSGT('Aucun appareil pour l’instant.'))}</div>`}
      <div class="v-sum-small" style="margin:12px 0 4px">${esc(MSGT('Quelqu’un d’autre connaît ton code ? Change-le : l’ancien ne marchera plus pour personne.'))}</div>
      <button type="button" class="v-btn sec" style="margin-bottom:8px" onclick="CV.acctSheet()">👤 ${esc(MSGT('Mon compte'))}${(M.acctSt || {}).acct ? ' ✅' : ''}</button>
      <button type="button" class="v-btn sec" onclick="CV.rotSheet()">🔑 ${esc(MSGT('Changer mon code administrateur'))}</button>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.cloudSheet()">${esc(MSGT('Fermer'))}</button></div>`);
  }
  /* ══════════ 👤 Mon compte : une adresse e-mail vérifiée + le code administrateur (2 éléments) ══════════
     Dès que le carnet est en ligne, on propose de créer le compte. Ensuite, un NOUVEL appareil qui entre le code ne voit
     rien tant qu’il n’est pas validé : soit par un code reçu par e-mail, soit depuis un de mes appareils déjà validés.
     Les appareils déjà sur le carnet au moment de la création restent ouverts. Le serveur ne garde que l’adresse e-mail
     (jamais le code ni le contenu, chiffrés) ; supprimer le compte efface l’adresse. */
  const acctApi = () => { const u = apiUrl(); return u ? u.replace(/\/sync$/, '/account') : ''; };
  async function acctPost(body, code){
    code = code || M.sync.code; if(!code || !acctApi()) throw new Error(MSGT('Mets d’abord ton carnet dans le cloud.'));
    let r; try { r = await fetch(acctApi(), {method:'POST', headers:{'Content-Type':'application/json', 'X-Carnet-Code':await authCode(code), 'X-Carnet-Dev':devId()}, body:JSON.stringify(Object.assign({lang:(window.I18N && I18N.lang) || 'fr', lb:devLabel()}, body))}); }
    catch(e){ throw new Error(netMsg()); }
    let j = {}; try { j = await r.json(); } catch(e){}
    if(!r.ok){ const er = new Error(srvMsg(j.error) || ('erreur ' + r.status)); er.j = j; throw er; }
    return j;
  }
  const acctBox = (id, ph, t) => `<input id="${id}" class="v-in" ${t === 'otp' ? 'inputmode="numeric" autocomplete="one-time-code" maxlength="6" style="width:100%;letter-spacing:.3em;font-size:1.3rem;text-align:center"' : 'type="email" autocomplete="email" autocapitalize="off" style="width:100%"'} placeholder="${esc(ph)}">`;
  const acctVal = id => String(((document.getElementById(id) || {}).value) || '').trim();
  // ── fiche « Mon compte » (depuis ☁️ Cloud ou 📱 Mes appareils)
  async function acctSheet(){
    if(!dvOwner()){ toast(MSGT('Mets d’abord ton carnet dans le cloud.')); return; }
    openSheet(`<h2>👤 ${esc(MSGT('Mon compte'))}</h2><div class="v-sum-small">📡 ${esc(MSGT('Connexion…'))}</div>`);
    let s; try { s = await acctPost({a:'status'}); M.acctSt = {at:Date.now(), acct:s.acct}; persist(); } catch(e){ openSheet(`<h2>👤 ${esc(MSGT('Mon compte'))}</h2><div class="v-box">⚠️ ${esc(e.message)}</div><div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">${esc(MSGT('Fermer'))}</button></div>`); return; }
    if(!s.acct) return acctNew(s);
    const when = t => new Date(t).toLocaleString((window.I18N && I18N.locale) || 'fr-FR', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
    openSheet(`<h2>👤 ${esc(MSGT('Mon compte'))}</h2>
      <div class="v-box"><b>✉️ <span data-notr>${esc(s.mail)}</span></b> · ✅ ${esc(MSGT('vérifiée'))}<br><small>${esc(RF('{0} appareil(s) validé(s)', s.n))}</small></div>
      <div class="v-sum-small" style="margin:8px 0">${esc(MSGT('Pour ouvrir ton carnet sur un nouvel appareil, il faut ton code administrateur ET valider l’appareil : par un code reçu à cette adresse, ou depuis un de tes appareils déjà validés.'))}</div>
      ${(s.pend || []).length ? `<div class="cv-cl-h">⏳ ${esc(MSGT('Appareils qui attendent ta validation'))}</div>` + s.pend.map(d=>`<div class="cv-prow"><span><b data-notr>${esc(d.lb || MSGT('Appareil'))}</b><small class="v-sum-small" style="display:block">${esc(when(d.at))}</small></span>
        <span style="display:flex;gap:6px"><button type="button" class="v-btn" style="width:auto;margin:0;padding:6px 12px" onclick="CV.acctOk('${ja(d.dev)}')">✓ ${esc(MSGT('Valider'))}</button><button type="button" class="v-btn sec" style="width:auto;margin:0;padding:6px 12px" onclick="CV.acctOk('${ja(d.dev)}', 1)">✕</button></span></div>`).join('') : ''}
      <button type="button" class="v-btn sec" style="margin-top:8px" onclick="CV.acctKit()">🆘 ${esc(MSGT('Mon kit de secours'))}</button>
      <button type="button" class="v-btn sec" style="margin-top:8px" onclick="CV.acctNew()">✏️ ${esc(MSGT('Changer d’adresse e-mail'))}</button>
      ${ACCT_MAX ? `<div class="v-f" style="margin-top:8px"><label>${esc(MSGT('Nombre maximum d’appareils'))}</label><select class="v-in" onchange="CV.acctMax(this.value)">${[0,1,2,3,4,5,8,10].map(n=>`<option value="${n}"${n === (s.max || 0) ? ' selected' : ''}>${n ? n : esc(MSGT('Pas de limite'))}</option>`).join('')}</select></div>` : ''}
      <button type="button" class="v-btn sec" style="margin-top:8px;color:var(--danger,#c0392b)" onclick="CV.acctDel()">🗑️ ${esc(MSGT('Supprimer mon compte'))}</button>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">${esc(MSGT('Fermer'))}</button></div>`);
  }
  // 🔧 limite d’appareils par compte : prête côté serveur, cachée tant que ce réglage est à false
  const ACCT_MAX = false;
  function acctNew(s, code){
    const has = s && s.acct === false ? false : true; acctNew.code = code || (has ? '' : M.sync.code) || '';
    openSheet(`<h2>👤 ${esc(has ? MSGT('Changer d’adresse e-mail') : MSGT('Crée ton compte pour mettre ton carnet en ligne'))}</h2>
      ${has ? '' : `<div class="v-box"><ul style="margin:0;padding-left:18px;line-height:1.5">
        <li><b>${esc(MSGT('Obligatoire pour garder ton carnet sur le serveur : pas d’adresse e-mail, pas de carnet en ligne.'))}</b></li>
        <li>${esc(MSGT('Ton compte = ton adresse e-mail + ton code administrateur.'))}</li>
        <li>${esc(MSGT('Quelqu’un qui trouverait ton code ne pourra pas ouvrir ton carnet sur son téléphone sans ta validation.'))}</li>
        <li>${esc(MSGT('Tes appareils actuels restent ouverts, rien ne change pour eux.'))}</li>
        <li>${esc(MSGT('L’adresse sert seulement à vérifier que c’est toi : pas de publicité.'))}</li></ul></div>`}
      <div class="v-f" style="margin-top:8px"><label>${esc(MSGT('Ton adresse e-mail'))}</label>${acctBox('ac-mail', 'prenom@exemple.fr')}</div>
      <button type="button" class="v-btn" onclick="CV.acctStart()">✉️ ${esc(MSGT('Recevoir un code de vérification'))}</button>
      <div class="v-sum-small" style="margin-top:8px">${esc(MSGT('En créant ton compte, tu acceptes les conditions d’utilisation et la politique de confidentialité.'))} <a href="/privacy.html" target="_blank" rel="noopener">${esc(MSGT('Confidentialité'))}</a> · <a href="/mentions-legales.html" target="_blank" rel="noopener">${esc(MSGT('CGU'))}</a></div>
      ${has ? '' : `<div class="v-sum-small" style="margin-top:8px">${esc(MSGT('Sans compte, ton carnet reste seulement sur ce téléphone.'))}</div>`}
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.acctLater()">${esc(has ? MSGT('Annuler') : MSGT('Pas maintenant'))}</button></div>`);
  }
  function acctLater(){ M.acctAsk = Date.now(); persist(); closeSheet(); }
  async function acctStart(){
    const email = acctVal('ac-mail').toLowerCase(); if(!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)){ toast(MSGT('Adresse e-mail invalide')); return; }
    const code = acctNew.code || undefined;
    try { const j = await acctPost({a:'start', email}, code); acctOtpSheet(j.mail, 'start', j.devOtp, code); } catch(e){ alert(e.message); }
  }
  // ── saisie du code à 6 chiffres (création, changement d’adresse ou nouvel appareil)
  function acctOtpSheet(mail, why, dev, code){
    acctOtpSheet.code = code || '';
    openSheet(`<h2>✉️ ${esc(MSGT('Entre le code reçu'))}</h2>
      <div class="v-sum-small" style="margin-bottom:8px">${esc(RF('Un code à 6 chiffres vient d’être envoyé à {0}. Il est valable 15 minutes (regarde aussi dans les indésirables).', mail || ''))}</div>
      ${acctBox('ac-otp', '••••••', 'otp')}${dev ? `<div class="v-sum-small" data-notr>test : ${esc(dev)}</div>` : ''}
      <button type="button" class="v-btn" style="margin-top:8px" onclick="CV.acctVerify('${ja(why)}')">✓ ${esc(MSGT('Valider'))}</button>
      <button type="button" class="v-btn sec" style="margin-top:8px" onclick="${why === 'login' ? `CV.acctLogin()` : 'CV.acctNew()'}">↻ ${esc(MSGT('Renvoyer un code'))}</button>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">${esc(MSGT('Annuler'))}</button></div>`);
    setTimeout(()=>{ const el = document.getElementById('ac-otp'); if(el) el.focus(); }, 200);
  }
  async function acctVerify(why){
    const otp = acctVal('ac-otp').replace(/\D/g, ''); if(otp.length !== 6){ toast(MSGT('Le code a 6 chiffres')); return; }
    const code = acctOtpSheet.code || '';
    try { await acctPost({a:'verify', otp}, code || undefined); } catch(e){ alert(e.message); return; }
    M.acctSt = {at:Date.now(), acct:true}; persist();
    if(why === 'login'){ closeSheet(true); toast('✅ ' + MSGT('Appareil validé')); return acctResume(code); }
    toast('✅ ' + (why === 'start' ? MSGT('Compte créé : ton carnet est protégé') : MSGT('Adresse e-mail vérifiée')));
    if(why === 'start' && (code && code !== M.sync.code || !M.sync.on || M.sync.err)){ closeSheet(true); return acctResume(code || M.sync.code); }   // le carnet (re)part en ligne
    acctSheet();
  }
  async function acctOk(dev, no){
    if(no && !(await uiConfirm(MSGT('Refuser cet appareil ? Il ne pourra pas ouvrir ton carnet.')))) return;
    try { await acctPost({a:no ? 'deny' : 'approve', dev}); toast(no ? MSGT('Appareil refusé') : '✅ ' + MSGT('Appareil validé')); } catch(e){ alert(e.message); }
    acctSheet();
  }
  async function acctMax(n){ try { await acctPost({a:'max', n:+n || 0}); toast('✓'); } catch(e){ alert(e.message); } }
  async function acctDel(){
    if(!(await uiConfirm(MSGT('Supprimer ton compte ? Ton adresse e-mail ET ton carnet sont effacés du serveur. Tout reste sur ce téléphone, hors ligne. Les voyages partagés avec tes compagnons restent chez eux.')))) return;
    try { await mainPrime(); const r = await fetch(apiUrl(), {method:'DELETE', headers:{'X-Carnet-Code':await authCode(M.sync.code)}}); if(!r.ok){ const j = await r.json().catch(()=>({})); throw new Error(srvMsg(j.error) || ('erreur ' + r.status)); }
      await acctPost({a:'delete'}).catch(()=>{}); M.sync.on = false; M.acctSt = {at:Date.now(), acct:false}; M.acctAsk = Date.now(); persist(); toast(MSGT('Compte supprimé')); closeSheet(); } catch(e){ alert(e.message); }
  }
  // ── 🆘 kit de secours : le code administrateur à garder hors du téléphone (sans lui, rien ne peut rouvrir le carnet)
  function acctKit(){
    const c = M.sync.code; if(!c) return;
    openSheet(`<h2>🆘 ${esc(MSGT('Mon kit de secours'))}</h2>
      <div class="v-sum-small" style="margin-bottom:8px">${esc(MSGT('Téléphone perdu ou volé ? Avec ce code et ton adresse e-mail, tu retrouves tout ton carnet sur un nouvel appareil. Garde-le hors de ton téléphone : imprimé, dans un gestionnaire de mots de passe, ou envoyé à toi-même.'))}</div>
      <div class="v-box" style="text-align:center;font-size:1.25rem;letter-spacing:.08em;user-select:all" data-notr><b>${esc(c)}</b></div>
      <button type="button" class="v-btn sec" style="margin-top:8px" onclick="CV.acctKitGo('copy')">📋 ${esc(MSGT('Copier'))}</button>
      <button type="button" class="v-btn sec" style="margin-top:8px" onclick="CV.acctKitGo('file')">⬇️ ${esc(MSGT('Télécharger le kit (fichier à imprimer)'))}</button>
      <button type="button" class="v-btn sec" style="margin-top:8px" onclick="CV.codeMail()">📧 ${esc(MSGT('M’envoyer le code par e-mail'))}</button>
      <div class="v-sum-small" style="margin-top:8px">⚠️ ${esc(MSGT('Ne le donne à personne : personne chez Vezoria ne te le demandera jamais.'))}</div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">${esc(MSGT('Fermer'))}</button></div>`);
  }
  async function acctKitGo(how){
    const c = M.sync.code; if(!c) return;
    if(how === 'copy'){ try { await navigator.clipboard.writeText(c); toast('📋 ' + MSGT('Code copié')); } catch(e){ await uiPrompt(MSGT('Copie ce code :'), c); } M.codeMailed = Date.now(); persist(); return; }
    const L = [MSGT('Vezoria — mon kit de secours'), '', MSGT('Code administrateur :') + ' ' + c, '', MSGT('Pour retrouver mon carnet sur un nouvel appareil : ouvre Vezoria → « J’ai déjà Vezoria sur un autre appareil » → entre ce code, puis le code reçu par e-mail.'), '', MSGT('Ne le donne à personne : personne chez Vezoria ne te le demandera jamais.'), '', new Date().toLocaleDateString((window.I18N && I18N.locale) || 'fr-FR')];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([L.join('\r\n')], {type:'text/plain;charset=utf-8'})); a.download = 'vezoria-kit-de-secours.txt'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 3000);
    M.codeMailed = Date.now(); persist();
  }
  // ── 📧 partager en ligne (compagnons, abonnés) demande un carnet en ligne avec compte
  function acctNeedSpace(){
    if(document.getElementById('v-sheet-bg') || Date.now() - (acctNeedSpace.at || 0) < 60000) return; acctNeedSpace.at = Date.now();
    if(M.sync.on && M.sync.code) return acctNew({acct:false, must:1}, M.sync.code);
    openSheet(`<h2>📧 ${esc(MSGT('Partager en ligne demande un compte'))}</h2>
      <div class="v-sum-small" style="margin-bottom:10px">${esc(MSGT('Pour partager tes voyages (compagnons, abonnés), mets d’abord ton carnet en ligne : il faut un compte avec ton adresse e-mail. Ce que tu viens de préparer partira tout seul ensuite.'))}</div>
      <button type="button" class="v-btn" onclick="CV.cloudSheet()">☁️ ${esc(MSGT('Mettre mon carnet en ligne'))}</button>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">${esc(MSGT('Pas maintenant'))}</button></div>`);
  }
  // ── 🔒 nouvel appareil refusé par le serveur : il faut le valider (e-mail ou autre appareil)
  let acctGateAt = 0;
  function acctGateSheet(code, mail){
    code = code || M.sync.code; if(!code) return; acctGateAt = Date.now(); acctOtpSheet.code = code;
    const w0 = M.acctWait && M.acctWait.code === code ? M.acctWait : null;
    M.acctWait = {code, mail:mail || (w0 && w0.mail) || '', at:Date.now(), pushed:w0 ? w0.pushed : 0}; persist();
    if(!M.acctWait.pushed){ M.acctWait.pushed = 1; persist(); acctPost({a:'ask'}, code).catch(()=>{}); devPush(devLabel(), code); }   // mes appareils validés sont prévenus
    openSheet(`<h2>🔒 ${esc(MSGT('Nouvel appareil : vérifie que c’est toi'))}</h2>
      <div class="v-sum-small" style="margin-bottom:10px">${esc(MSGT('Ce carnet est protégé par un compte. Ton code est bon : il reste à valider cet appareil.'))}</div>
      <button type="button" class="v-btn" onclick="CV.acctLogin()">✉️ ${esc(mail ? RF('Recevoir un code à {0}', mail) : MSGT('Recevoir un code par e-mail'))}</button>
      <div class="v-sum-small" style="margin:12px 0 4px">${esc(MSGT('Ou, sur un de tes appareils déjà validés : ☁️ Cloud → 👤 Mon compte → Valider cet appareil.'))}</div>
      <button type="button" class="v-btn sec" onclick="CV.acctResume()">↻ ${esc(MSGT('C’est validé, réessayer'))}</button>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">${esc(MSGT('Plus tard'))}</button></div>`);
  }
  async function acctLogin(){
    const code = acctOtpSheet.code || (M.acctWait && M.acctWait.code) || M.sync.code;
    try { const j = await acctPost({a:'login'}, code); if(j.devOk) return acctResume(code); acctOtpSheet(j.mail, 'login', j.devOtp, code); } catch(e){ alert(e.message); }
  }
  async function acctResume(code){
    code = code || (M.acctWait && M.acctWait.code) || M.sync.code; delete M.acctWait; persist(); closeSheet(true);
    if(M.sync.on && M.sync.code === code){ M.sync.err = ''; return syncNow(true); }
    if(code === (M.rotTry || '')){ delete M.rotTry; return rotJoinCode(code); }
    await syncOn(code);
    if(M.sync.on && M.sync.code){ M.cloud = 'all'; persist(); refresh(); setTimeout(()=>profDedupe(true), 800); }
  }
  function rotJoinCode(code){ rotLost(); setTimeout(()=>{ const el = document.getElementById('rot-code'); if(el){ el.value = code; rotJoin(); } }, 100); }
  // ── 🔔 sur un appareil validé : un nouvel appareil attend → on le montre ; et une fois, on propose de créer le compte
  let acctBusy = false;
  async function acctTick(){
    if(acctBusy || !dvOwner() || !M.sync.last || M.sync.err || document.hidden) return; acctBusy = true;
    try {
      const st = M.acctSt || {}, now = Date.now();
      if(!st.acct){   // pas encore de compte : le serveur refuse la synchro (needAcct) et la fiche s’ouvre d’elle-même ; ici on vérifie juste une fois par jour
        if(!st.at || now - st.at > 864e5){ const s = await acctPost({a:'status'}); M.acctSt = {at:now, acct:s.acct}; persist(); }
        return;
      }
      const s = await acctPost({a:'status'}); M.acctSt = {at:Date.now(), acct:s.acct}; persist();
      const K = M.acctSeen || (M.acctSeen = {}), d = (s.pend || []).find(x=>!K[x.dev]);
      if(d && !document.getElementById('cv-moment') && !document.getElementById('v-sheet-bg')){
        K[d.dev] = 1; persist();
        momentShow(`<div class="mo-k">${MSGT('Sécurité')}</div><div class="mo-big">🔒</div><h2>${MSGT('Un appareil demande à ouvrir ton carnet')}</h2>
          <div class="mo-sub"><b data-notr>${esc(d.lb || MSGT('Appareil'))}</b><br><br>${MSGT('Il a ton code administrateur. Valide-le seulement si c’est toi.')}</div>
          <div class="mo-b"><button type="button" class="pri" onclick="CV.momentClose();CV.acctOk('${ja(d.dev)}')">✓ ${MSGT('C’est moi : valider')}</button><button type="button" onclick="CV.momentClose();CV.acctOk('${ja(d.dev)}', 1)">🚫 ${MSGT('Ce n’est pas moi')}</button></div>`, 'eve');
      }
    } catch(e){} finally { acctBusy = false; }
  }
  setTimeout(acctTick, 15000); setInterval(acctTick, 120e3);
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden && (M.acctSt || {}).acct) setTimeout(acctTick, 1500); });
  // 📧 le code administrateur envoyé à soi-même : sans compte, c’est le seul moyen de le retrouver plus tard
  function codeMail(){
    const c = M.sync.code; if(!c) return;
    const sub = MSGT('Mon code administrateur Vezoria (à garder)');
    const body = RF('Mon code administrateur Vezoria : {0}', c) + '\n\n' + MSGT('Garde ce message. Avec ce code, tu retrouves tout ton carnet sur un nouveau téléphone ou un ordinateur : ouvre Vezoria → « J’ai déjà Vezoria sur un autre appareil » → colle le code.') + '\n' + MSGT('Ne le transmets à personne : il ouvre tout ton carnet.') + '\n\nhttps://vezoria.pages.dev/';
    M.codeMailed = Date.now(); persist();
    location.href = 'mailto:?subject=' + encodeURIComponent(sub) + '&body=' + encodeURIComponent(body);
  }
  /* ══════════ 🔑 Changer de code administrateur ══════════
     Le carnet garde sa place sur le serveur (fiches, photos, formule payée, appareils bloqués) : seul le code qui l’ouvre change.
     1) le serveur accepte le nouveau code en plus de l’ancien (refusé à un appareil arrivé depuis moins de 24 h)
     2) ce téléphone renvoie tout le carnet chiffré avec le nouveau code (les photos qu’il n’a pas sont d’abord rapatriées)
     3) l’ancien code est retiré : plus personne ne peut s’en servir. Les autres appareils demandent le nouveau code.
     Les codes compagnon reposaient sur l’ancien code : ils sont retirés (il faut réinviter). Les liens abonnés ne changent pas. */
  const rotApi = () => { const u = apiUrl(); return u ? u.replace(/\/sync$/, '/rotate') : ''; };
  async function rotPost(code, body){
    const r = await fetch(rotApi(), {method:'POST', headers:{'Content-Type':'application/json', 'X-Carnet-Code':await authCode(code), 'X-Carnet-Dev':devId()}, body:JSON.stringify(body)});
    let j = {}; try { j = await r.json(); } catch(e){}
    if(!r.ok){ const er = new Error(j.young ? 'young' : (srvMsg(j.error) || ('erreur ' + r.status))); er.j = j; throw er; }
    return j;
  }
  const feedAdm = async (main, c) => hex(await crypto.subtle.sign('HMAC', (await keys(main)).hkey, te.encode('vz-feed-admin:' + c)));
  function rotSheet(){
    if(!dvOwner()){ toast(MSGT('Mets d’abord ton carnet dans le cloud.')); return; }
    if(M.rot && M.rot.neu) return rotRun();
    openSheet(`<h2>🔑 ${esc(MSGT('Changer mon code administrateur'))}</h2>
      <div class="v-sum-small" style="margin-bottom:10px">${esc(MSGT('À faire si quelqu’un d’autre connaît ton code (téléphone perdu, code partagé par erreur). Tu gardes tout : voyages, photos, abonnement, abonnés.'))}</div>
      <div class="v-box"><ul style="margin:0;padding-left:18px;line-height:1.5">
        <li>${esc(MSGT('Un nouveau code est créé et tout ton carnet est renvoyé, chiffré avec lui.'))}</li>
        <li>${esc(MSGT('L’ancien code ne marchera plus pour personne.'))}</li>
        <li>${esc(MSGT('Tes autres appareils te demanderont le nouveau code.'))}</li>
        <li>${esc(MSGT('Tes compagnons du carnet devront être réinvités. Tes liens abonnés ne changent pas.'))}</li></ul></div>
      <div class="v-sum-small" style="margin:8px 0">${esc(MSGT('Garde l’appli ouverte pendant le changement : quelques secondes, ou quelques minutes s’il y a beaucoup de photos.'))}</div>
      <button type="button" class="v-btn" onclick="CV.rotGo()">🔑 ${esc(MSGT('Changer mon code maintenant'))}</button>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.cloudSheet()">${esc(MSGT('Annuler'))}</button></div>`);
  }
  let rotBusy = false;
  const rotSay = (t, sub) => { const el = document.getElementById('rot-st'); if(el) el.innerHTML = `<b>${esc(t)}</b>${sub ? `<small class="v-sum-small" style="display:block">${esc(sub)}</small>` : ''}`; };
  async function rotGo(){
    if(rotBusy || !dvOwner()) return;
    if(!(await uiConfirm(MSGT('Changer ton code administrateur ? L’ancien code ne marchera plus pour personne.')))) return;
    rotBusy = true; const old = M.sync.code;
    openSheet(`<h2>🔑 ${esc(MSGT('Changer mon code administrateur'))}</h2><div id="rot-st" class="v-box" style="text-align:center"></div>`);
    try {
      rotSay(MSGT('Je récupère tout ton carnet…'));
      const j = await call(0, []); mergeRemote(j.records, true); M.sync.since = j.now;
      const onSrv = new Set(j.records.map(r=>r && r.id).filter(Boolean));
      const neu = genCode(); try { delete M.myCodes[neu]; } catch(e){}
      rotSay(MSGT('Je prépare le nouveau code…'));
      // ✍️ mes fils d’abonnés dont la clé d’auteur vient de l’ancien code : le serveur prend la nouvelle
      const fcs = [...new Set([...Object.values(FT()), ...Object.keys(M.admOk || {}), ...(M.fold || []).map(x=>x.code)].filter(Boolean))], feeds = [], fnew = {};
      for(const c of fcs){ const d0 = await feedAdm(old, c), k0 = (M.admOk || {})[c] || d0; if(k0 !== d0) continue;
        const n = await feedAdm(neu, c); feeds.push({t:await authCode(c), o:k0, n}); fnew[c] = n; }
      const sh = M.sync.sh || await spaceHash(old);
      let st; try { st = await rotPost(old, {a:'start', to:await authCode(neu), feeds}); }
      catch(e){ if(e.j && e.j.young){ const h = Math.max(1, Math.ceil((e.j.wait || 864e5) / 3600e3));
          throw new Error(RF('Cet appareil est arrivé sur ton carnet il y a moins de 24 h : par sécurité, il pourra changer le code dans {0} h. En attendant, bloque l’appareil que tu ne reconnais pas (🛡️ Mes appareils) : il ne pourra plus rien lire.', h)); }
        throw e; }
      // à partir d’ici, le nouveau code ouvre le carnet : on bascule (et on s’en souvient si l’appli se ferme en route)
      M.rot = {old, neu, at:st.at || Date.now(), ph:0};
      M.sync.sh = sh; M.sync.code = neu; M.sync.since = 0; M.codesHash = '';
      Object.entries(fnew).forEach(([c, n])=>{ (M.admOk || (M.admOk = {}))[c] = n; ADMC[c] = n; });
      ADMT && Object.keys(ADMT).forEach(k=>{ delete ADMT[k]; });
      const ids = Object.keys(R).filter(id=>{ const r = R[id]; return r && !r.demo && (onSrv.has(id) || targets(r).includes('main')); });
      M.dirty = [...new Set([...M.dirty, ...ids])];
      persist();
      await rotPhotos(old, ids);
      M.rot.ph = 1; persist();
      await rotRun(true);
    } catch(e){
      rotBusy = false;
      if(!M.rot) openSheet(`<h2>🔑 ${esc(MSGT('Changer mon code administrateur'))}</h2><div class="v-box">⚠️ ${esc(e.message || String(e))}</div>
        <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.cloudSheet()">${esc(MSGT('Fermer'))}</button></div>`);
      else rotRun();
    }
  }
  // photos rangées « à l’ancienne » (chiffrées avec l’ancien code) : ce téléphone les rapatrie s’il ne les a pas, puis les renvoie
  async function rotPhotos(old, ids){
    const ph = new Set(); ids.forEach(id=>{ const r = R[id]; if(!r || r.deleted || r.type === 'feed') return; if(!targets(r).includes('main')) return;
      [...(r.photos||[]), r.recu, r.preuve, r.cover, ...(r.pj||[]).map(p=>p && p.id)].forEach(p=>{ if(p && !pkOf(p)) ph.add(p); }); });
    M.pq = M.pq || []; let i = 0, miss = 0;
    const q = x => { if(!M.pq.includes(x)) M.pq.push(x); };
    for(const id of ph){
      i++; if(i % 5 === 1) rotSay(MSGT('Je rapatrie tes photos…'), i + ' / ' + ph.size);
      let o = null; try { o = await IDB.get(id); } catch(e){}
      if(o && o.blob){ q(id); continue; }
      let t = null; try { t = await IDB.get(id + '.t'); } catch(e){}
      try {
        const g = await v1Get(id, old);
        if(g.blob){ await IDB.put({id, blob:g.blob, up:0}); q(id); continue; }
        if(t && t.blob){ q(id + '.t'); continue; }
        const gt = await v1Get(id + '.t', old);
        if(gt.blob){ await IDB.put({id:id + '.t', blob:gt.blob, up:0}); q(id + '.t'); } else miss++;
      } catch(e){ if(t && t.blob) q(id + '.t'); else miss++; }
      if(i % 20 === 0) persist();
    }
    persist(); return miss;
  }
  // envoi de tout le carnet sous le nouveau code, puis retrait de l’ancien (reprend tout seul si l’appli a été fermée en route)
  async function rotRun(fromGo){
    const R0 = M.rot; if(!R0 || !R0.neu) { rotBusy = false; return; }
    if(!fromGo && rotBusy) return; rotBusy = true;
    if(!document.getElementById('rot-st')) openSheet(`<h2>🔑 ${esc(MSGT('Changer mon code administrateur'))}</h2><div id="rot-st" class="v-box" style="text-align:center"></div>`);
    try {
      if(!R0.ph){ await rotPhotos(R0.old, Object.keys(R).filter(id=>R[id] && !R[id].demo && targets(R[id]).includes('main'))); R0.ph = 1; persist(); }
      const mine = new Set(); Object.values(R).forEach(r=>{ if(r && !r.demo && targets(r).includes('main')) [...(r.photos||[]), r.recu, r.preuve, r.cover, ...(r.pj||[]).map(p=>p && p.id)].forEach(p=>{ if(p){ mine.add(p); mine.add(p + '.t'); } }); });
      const left = () => (M.pq || []).filter(x=>mine.has(x)).length;
      const t0 = Date.now(); let last = -1, still = 0;
      while(true){
        rotSay(MSGT('J’envoie ton carnet avec le nouveau code…'), RF('{0} fiche(s) · {1} photo(s) restantes', M.dirty.length, left()));
        await syncNow(); if(M.sync.err && !M.sync.net) throw new Error(M.sync.err);
        uploadQueue();
        await new Promise(r=>setTimeout(r, 2500));
        const n = M.dirty.length + left(); if(!n) break;
        if(n === last) still++; else still = 0; last = n;
        if(still > 40 || Date.now() - t0 > 20 * 60e3) throw new Error(MSGT('L’envoi n’avance plus (réseau ?). Le changement de code reprendra tout seul à la prochaine ouverture de l’appli.'));
      }
      rotSay(MSGT('Je retire l’ancien code…'));
      await rotPost(R0.neu, {a:'done', old:await authCode(R0.old)});
      delete M.rot; M.sync.rotOk = Date.now(); persist();
      try { pushRegister(true); } catch(e){}
      rotBusy = false; rotDone();
    } catch(e){
      rotBusy = false;
      rotSay('⚠️ ' + (e.message || String(e)), MSGT('Ton nouveau code marche déjà. Le changement se terminera tout seul à la prochaine ouverture de l’appli.'));
    }
  }
  setTimeout(()=>{ try { if(M.rot && M.rot.neu && dvOwner()) rotRun(); } catch(e){} }, 15000);
  function rotDone(){
    const sh = Object.entries(TS()).filter(([tid, c])=>R[tid] && R[tid].type === 'trip' && !R[tid].deleted && spaceObj(c) && !Object.values(FT()).includes(c));
    openSheet(`<h2>✅ ${esc(MSGT('Nouveau code administrateur'))}</h2>
      <div class="v-box" style="text-align:center"><div style="font-size:1.35em;font-weight:700;letter-spacing:.06em" data-notr>${esc(M.sync.code)}</div>
        <div class="v-sum-small" style="margin-top:6px">${esc(MSGT('L’ancien code ne marche plus. Note bien celui-ci : c’est la seule façon de retrouver ton carnet.'))}</div></div>
      <button type="button" class="v-btn" onclick="CV.codeMail()">📧 ${esc(MSGT('M’envoyer le code par e-mail'))}</button>
      <button type="button" class="v-btn sec" onclick="CV.copyCode()">📋 ${esc(MSGT('Copier'))}</button>
      <div class="v-sum-small" style="margin:10px 0">📱 ${esc(MSGT('Sur tes autres appareils, Vezoria va te demander ce nouveau code.'))}<br>👥 ${esc(MSGT('Tes compagnons du carnet doivent être réinvités (Cloud → Inviter un compagnon).'))}</div>
      ${sh.length ? `<div class="v-box"><h3>🧳 ${esc(MSGT('Voyages partagés'))}</h3><div class="v-sum-small" style="margin-bottom:6px">${esc(MSGT('Chaque voyage partagé a son propre code. Si la personne qui connaissait ton code a pu le voir, donne-lui un nouveau code (tes compagnons de voyage devront le rejoindre à nouveau).'))}</div>
        ${sh.map(([tid])=>`<button type="button" class="v-btn sec" style="margin-top:6px" onclick="CV.tripNewCode('${ja(tid)}')">🔑 <span data-notr>${esc(R[tid].titre || '')}</span></button>`).join('')}</div>` : ''}
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">${esc(MSGT('Fermer'))}</button></div>`);
  }
  // 🔑 sur un AUTRE appareil : l’ancien code a été retiré → on demande le nouveau (les données restent ici)
  let rotAsked = 0;
  function rotLost(){
    if(M.rot || Date.now() - rotAsked < 30 * 60e3) return; rotAsked = Date.now();
    openSheet(`<h2>🔑 ${esc(MSGT('Ton code administrateur a changé'))}</h2>
      <div class="v-sum-small" style="margin-bottom:10px">${esc(MSGT('Le code de ton carnet a été changé sur un autre de tes appareils. Entre le nouveau code pour continuer (tu l’as peut-être reçu par e-mail). Tout ce qui est sur ce téléphone est gardé.'))}</div>
      <input id="rot-code" class="v-in" autocomplete="off" autocapitalize="characters" placeholder="XXXX-XXXX-XXXX" style="width:100%;text-transform:uppercase">
      <button type="button" class="v-btn" style="margin-top:8px" onclick="CV.rotJoin()">✓ ${esc(MSGT('Continuer avec ce code'))}</button>
      <div class="v-sum-small" style="margin-top:10px">${esc(MSGT('Ce n’est pas toi qui as changé le code ? Quelqu’un d’autre le connaissait. Tes données restent sur ce téléphone : écris-nous à contact.vezoria@icloud.com.'))}</div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">${esc(MSGT('Plus tard'))}</button></div>`);
  }
  async function rotJoin(){
    const el = document.getElementById('rot-code'), code = String((el && el.value) || '').trim().toUpperCase();
    if(code.length < 8){ toast(MSGT('Code trop court')); return; }
    const old = M.sync.code, prev = clone(M.sync), adm0 = clone(M.admOk || {});
    try {
      // clés d’auteur de mes fils tirées de l’ancien code : elles seront retirées du nouveau
      for(const [c, k] of Object.entries(M.admOk || {})) if(k === await feedAdm(old, c)) delete M.admOk[c];
      M.sync.code = code; M.sync.since = 0; delete M.sync.sh; M.sync.err = '';
      const j = await call(0, []);
      const srv = {}; j.records.forEach(r=>{ if(r && r.id) srv[r.id] = r.updatedAt || 0; });
      mergeRemote(j.records, true); M.sync.since = j.now; M.sync.on = true; M.codesHash = '';
      Object.values(R).forEach(r=>{ if(r && !r.demo && targets(r).includes('main') && (!(r.id in srv) || (r.updatedAt || 0) > srv[r.id])) markDirty(r.id); });   // modifié ici pendant le changement : renvoyé
      Object.keys(ADMT).forEach(k=>{ delete ADMT[k]; });
      persist(); closeSheet(true); toast('✅ ' + MSGT('Carnet retrouvé avec le nouveau code'));
      await syncNow(); refresh(); try { pushRegister(true); } catch(e){}
    } catch(e){ M.sync = prev; M.admOk = adm0; persist(); if(e.needVerify){ M.rotTry = code; persist(); closeSheet(true); acctGateSheet(code, e.mail); return; } alert(e.rotated ? MSGT('Ce code a lui aussi été remplacé. Entre le code le plus récent.') : (e.message || String(e))); }
  }
  // anciens liens retirés : effacés du serveur 2 mois après (le temps que tous les abonnés soient passés au nouveau)
  async function feedOldWipe(){
    const due = (M.fold||[]).filter(x=>Date.now() - x.at > 60 * 864e5); if(!due.length || !apiUrl()) return;
    for(const x of due){ try { const r = await fetch(apiUrl(), {method:'DELETE', headers:{'X-Carnet-Code':await authCode(x.code)}}); if(r.ok || r.status === 404) M.fold = M.fold.filter(y=>y !== x); } catch(e){} }
    persist();
  }
  // voyage publié seul : ne plus le montrer à une personne, sans la bloquer (nouveau lien chiffré pour les autres)
  async function fwHideOne(tid, fwid){ { const f = R[fwid]; if(f) return ab2FwHide(fwDevOf(f), tid); return; }
    const f = R[fwid], d = devOfRec(f), t = R[tid]; if(!f || !d || !t) return;
    if(!(await uiConfirm(MSGT('Ne plus montrer ce voyage à cette personne ?') + '\n\n' + (f.who || '') + ' · ' + (t.titre || '') + '\n\n' + MSGT('Elle n’est pas bloquée : ses ❤️ et commentaires restent. Tes autres abonnés reçoivent automatiquement le nouveau lien.')))) return;
    await feedRevoke(tid, d, f.who || '');
  }
  function fwBlock(fwid){ { const f = R[fwid]; if(f && f.code && f.code === ab2C()) return ab2FwDel(fwDevOf(f)); } userBlock(fwid); setTimeout(()=>{ try { socialHub(); } catch(e){} }, 150); }
  async function feedReset(tid){
    const old = FT()[tid]; if(!old) return;
    if(FRX()[tid]) return feedReset(Object.keys(FT()).find(x=>FT()[x] === FRX()[tid].g) || tid);
    const grp = Object.keys(FT()).filter(x=>FT()[x] === old), many = grp.length > 1 || Object.values(FRX()).some(x=>x.g === old);   // carnet publié d’un coup : un seul lien pour tous ses voyages
    if(!(await uiConfirm((many ? `Créer un nouveau lien abonné pour tes ${grp.length} voyages publiés ensemble ?` : 'Créer un nouveau lien abonné ?') + '\n\nL’ancien lien ne marchera plus : plus personne ne voit tes souvenirs tant que tu n’as pas renvoyé le nouveau lien. Les ❤️ et commentaires passés sont effacés.'))) return;
    const ids = new Set(grp.map(ftId)), out = Object.values(R).filter(r=>r && !r.deleted && (ids.has(r.trip) || ids.has(r.id))).map(r=>Object.assign(clone(r), {deleted:true}));
    putQuiet(out); try { await syncNow(); } catch(e){}
    out.forEach(r=>{ delete R[r.id]; }); M.spaces = (M.spaces||[]).filter(x=>x.code !== old); grp.forEach(x=>{ delete FT()[x]; delete TS()[ftId(x)]; });
    if(M.fup) delete M.fup[old]; M.fq = (M.fq||[]).filter(x=>x[0] !== old);
    const c = genCode(); M.spaces.push({code:c, since:0, dirty:[], last:0, err:''}); grp.forEach(x=>{ FT()[x] = c; }); if(M.feedAll === old) M.feedAll = c; persist(); closeSheet(true);
    for(const t of Object.keys(FRX())) if(FRX()[t].g === old){ await feedRestrict(t, null); FRX()[t].g = c; FRX()[t].sent = {}; }   // voyages « à part » : nouveaux codes aussi
    if(!many){ await feedPublish(tid); return; }
    grp.forEach(x=>feedBuild(x)); toast('👀 Publication en cours…');
    try { await syncNow(); feedUpload(); } catch(e){}
    await carnetInvite(c);
  }
  // 🚩 Signalement : un e-mail prérempli à l'éditeur, avec le code abonné (sans lui, impossible de retrouver le carnet). Aucune photo n'est envoyée.
  async function ugcReport(kind, id){
    const r = R[id]; if(!r) return; const ft = R[r.trip] || {}, code = TS()[r.trip] || '';
    const why = (await uiPrompt('Pourquoi signales-tu ce contenu ? (contenu illicite, harcèlement, nudité, violence, autre…)', '')); if(why === null) return;
    const body = [MSGT('Signalement depuis Vezoria'), '', MSGT('Motif') + ' : ' + why, MSGT('Type') + ' : ' + (kind === 'comment' ? 'commentaire de « ' + (r.who||'?') + ' » : ' + String(r.text||'').slice(0, 300) : 'publication « ' + (r.titre || r.lieu || r.date || '') + ' »'),
      MSGT('Voyage') + ' : ' + (ft.titre || '') + ' (' + (ft.owner || '?') + ')', MSGT('Code abonné') + ' : ' + code, 'Réf. : ' + id, '', '— ' + (myName() || '')].join('\n');
    location.href = 'mailto:' + CONTACT + '?subject=' + encodeURIComponent('Vezoria : signalement') + '&body=' + encodeURIComponent(body);
    closeSheet(true); setTimeout(()=>toast('🚩 Merci : envoie le mail pour finaliser le signalement'), 400);
  }
  const MSGT = x => (window.I18N && I18N.msg ? I18N.msg(x) : x);
  function postMenu(fid){
    const f = R[fid]; if(!f) return; const ft = R[f.trip] || {};
    openSheet(`<h2>⋯ ${esc(f.titre || f.lieu || 'Publication')}</h2>
      <button type="button" class="v-btn sec" onclick="CV.ugcReport('post','${ja(fid)}')">🚩 Signaler cette publication</button>
      <button type="button" class="v-btn sec" onclick="CV.feedUnfollow('${ja(f.trip)}')">🚫 Ne plus suivre « ${esc(ft.titre || '')} »</button>
      ${TS()[f.trip] ? `<button type="button" class="v-btn sec" onclick="CV.fwLinkBack('${ja(f.trip)}')">🔗 ${esc(MSGT('Renvoyer le lien de ce voyage à son auteur'))}</button>
      <div class="v-sum-small">${esc(MSGT('Si l’auteur a perdu son lien (changement de téléphone…), il l’ouvre : l’appli lui rend ses abonnés.'))}</div>` : ''}
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  // 🔗 l'abonné renvoie le lien actuel à l'auteur (qui l'a perdu) : en l'ouvrant, l'auteur reprend la main sur ses abonnés
  async function fwLinkBack(ftid){
    const c = TS()[ftid], ft = R[ftid] || {}; if(!c) return; const link = (appUrl() || location.origin + location.pathname) + '#suivre=' + encodeURIComponent(c);
    const text = MSGT('Voici le lien de ton voyage') + ' « ' + (ft.titre || '') + ' » : ' + link;
    try { if(navigator.share){ await navigator.share({title:'Vezoria', text}); return; } } catch(e){ if(e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(link); toast('📋 ' + MSGT('Lien copié')); } catch(e){ uiPrompt(MSGT('Lien de ce voyage'), link); }
  }
  // prénom déjà pris par un autre abonné de ces voyages : c'est moi (autre téléphone / navigateur) ou une autre personne ?
  // le nom sous lequel j'apparais chez cet auteur (« Claire 2 » si « Claire » était déjà pris chez lui)
  const fwPid = () => (M.me && prof(M.me)) ? M.me : undefined;
  // je voyage déjà avec cet auteur (je suis dans l’un de ses voyages) : je garde mon prénom de compagnon
  const fwIsMate = code => !!(M.me && list('feedtrip', f=>TS()[f.id] === code && !f.deleted && (((f.tids||[]).includes(M.me)) || (f.opid && f.opid !== M.me && prof(f.opid)))).length);
  // le nom montré à l’auteur et à ses compagnons : mon prénom actuel (un ancien prénom gardé pour ce fil — profil renommé de Camille en Victoria — ne sert plus)
  const fwAsFor = code => { const me = myName(), a = fwIsMate(code) ? '' : ((M.fwAs || {})[code]) || ''; return a && (!me || normQ(a).startsWith(normQ(me))) ? a : me || a; };
  // ✏️ profil renommé : mes ❤️ et commentaires déjà envoyés prennent mon nouveau prénom (une fois par changement de nom)
  function socWhoFix(){
    const me = myName(); if(!me || M.whoFix === me) return; const d = devId(), out = [];
    list('like').concat(list('comment')).forEach(r=>{ if(!/^ft:/.test(r.trip || '') || !(r.dev === d || String(r.id).endsWith(':' + d))) return;
      const w = String(r.who || ''); if(/^🧳/.test(w)) return; const nw = fwAsFor(TS()[r.trip]); if(nw && nw !== w) out.push(Object.assign(clone(r), {who:nw})); });
    if(out.length) putQuiet(out); M.whoFix = me; persist();
  }
  async function fwNameResolve(n){
    n = String(n || '').trim().slice(0, 36); if(!n) return null;
    const me = devId(), fol = new Set(list('feedtrip', f=>TS()[f.id] && !FT()[String(f.id).replace(/^ft:/,'')]).map(f=>f.id));
    const taken = new Set(list('follower', x=>fol.has(x.trip) && !x.deleted && fwDevOf(x) !== me).map(x=>String(x.who || '').trim().toLowerCase()));
    list('feedtrip', f=>fol.has(f.id)).forEach(f=>ftTeam(f).forEach(n=>taken.add(n.toLowerCase())));
    if(!taken.has(n.toLowerCase())) return {n, same:''};
    let k = 2; while(taken.has((n + ' ' + k).toLowerCase())) k++;
    const n2 = n + ' ' + k; toast('👤 ' + MSGT('Ce prénom est déjà pris : tu apparais comme « {0} »').replace('{0}', n2));
    return {n: n2, same:''};
  }
  async function fwNameSave(form){
    const r = await fwNameResolve(((form && form.n && form.n.value) || '').trim()); if(!r) return;
    M.followName = r.n; persist(); if(form) form.remove();
    try { await fwKeyTouch(); await syncNow(); } catch(e){}
    toast('👋 ' + MSGT('Merci') + ' ' + M.followName + ' !');
  }
  async function feedUnfollow(ftid, all, back){ { const c = TS()[ftid] || Object.keys(M.subs || {}).find(k=>((M.subs[k].t || {})[ftid])); if(c) return all ? ab2Unfollow(c) : ab2SubHide(c, ftid); return; }
    const ft = R[ftid] || {}, owner = String(ft.owner || '').trim();
    const ids = all ? list('feedtrip', f=>TS()[f.id] && !FT()[String(f.id).replace(/^ft:/,'')] && String(f.owner || '').trim().toLocaleLowerCase() === owner.toLocaleLowerCase()).map(f=>f.id) : [ftid];
    if(!ids.length) return;
    if(!back && !(await uiConfirm(all ? MSGT('Ne plus suivre aucun voyage de {0} ? Ils disparaissent de ce téléphone.').replace('{0}', owner || '?') + ' (' + ids.length + ')' : MSGT('Ne plus suivre ce voyage ? Il disparaît de ce téléphone.')))) return;
    const codes = new Set(ids.map(id=>TS()[id]).filter(Boolean)), me = devId(), un = M.unfol || (M.unfol = {});
    const out = ids.map(id=>R['fw:' + id + ':' + me]).filter(x=>x && !x.deleted).map(x=>Object.assign(clone(x), {deleted:true}));   // l’auteur voit un abonné de moins
    if(out.length) putQuiet(out);
    ids.forEach(id=>{ un[id] = 1; const f = R[id]; if(f) (M.unfolT = M.unfolT || {})[id] = {titre:f.titre || '', owner:String(f.owner || '').trim(), code:TS()[id] || '', debut:f.debut || '', fin:f.fin || '', cover:f.cover || '', coverWk:f.coverWk || '', ccs:f.ccs || [], oav:avOk(f.oav) ? f.oav : ''}; });   // 🙈 masqué : on garde de quoi le remontrer
    if(!back){ closeSheet(true); feedClose(); }
    try { await syncNow(); } catch(e){}
    ids.forEach(id=>{ Object.values(R).forEach(r=>{ if(r && (r.trip === id || r.id === id)) delete R[r.id]; }); delete TS()[id]; });
    // le dossier n’est quitté que si plus aucun voyage suivi n’y est (carnet publié : un lien pour plusieurs voyages)
    codes.forEach(c=>{ if(!Object.entries(TS()).some(([k, x])=>x === c && /^ft:/.test(k))) M.spaces = (M.spaces||[]).filter(x=>x.code !== c); });
    persist(); refresh(); toast(all ? '🚫 ' + MSGT('Tu ne suis plus') + ' ' + owner : '🙈 ' + MSGT('Voyage masqué'));
    if(back) spSuisSheet(back);
  }
  // 👁️ remontrer un voyage masqué : on revient sur son lien (sans forcer les autres voyages masqués du même lien)
  async function feedRefollow(id, back){ { const c = Object.keys(M.subs || {}).find(k=>((M.subs[k].t || {})[id])); if(c) return ab2SubHide(c, id); return; }
    const m = (M.unfolT || {})[id] || {}, code = m.code || TS()[id]; if(!code){ toast('⚠️ ' + MSGT('Lien introuvable : demande-lui de te renvoyer son lien.')); return; }
    if(M.unfol) delete M.unfol[id];
    let sp = spaceObj(code); if(!sp){ (M.spaces = M.spaces || []).push({code, since:0, dirty:[], last:0, err:''}); sp = spaceObj(code); }
    toast('📡 ' + MSGT('Connexion…')); sp.since = 0;
    try { await syncSpace(sp, false); } catch(e){}
    const ft = R[id];
    if(!ft || ft.deleted || TS()[id] !== code){ if(sp.err) toast('⚠️ ' + sp.err); else toast('⚠️ ' + MSGT('Ce voyage n’est plus publié.')); if(M.unfolT) delete M.unfolT[id]; persist(); if(back) spSuisSheet(back); return; }
    if(M.unfolT) delete M.unfolT[id];
    let pk; try { pk = (await fKey()).pub; } catch(e){}
    const fw = {id:'fw:' + id + ':' + devId(), type:'follower', pid:fwPid(), trip:id, who: fwAsFor(code) || 'Un proche', pk}; putQuiet([fw]);
    persist(); syncNow(); refresh(); toast('👀 ' + MSGT('Voyage remis') + ' : ' + ft.titre);
    if(back) spSuisSheet(back);
  }
  // ➡️ une personne que je suis : tous ses voyages, je choisis ceux que je vois (les masqués peuvent revenir)
  function spSuisSheet(key){ if((M.subs || {})[key]) return ab2SubSheet(key); return shareHub();
    key = nq(key); const ow = f => nq(f.owner || '') === key || (!String(f.owner || '').trim() && key === '?') || ((f && f.team) || []).some(n=>nq(n) === key);
    const fol = list('feedtrip', f=>TS()[f.id] && !FT()[String(f.id).replace(/^ft:/, '')] && !f.deleted && ow(f));
    const un = M.unfol || {}, UT = M.unfolT || {};
    const hid = Object.keys(un).filter(id=>un[id] === 1 && !TS()[id]).map(id=>UT[id] ? Object.assign({id}, UT[id]) : (R[id] && R[id].type === 'feedtrip' && !R[id].deleted ? R[id] : null)).filter(f=>f && ow(f) && (UT[f.id] || {}).code);
    const comp = Object.keys(un).filter(id=>un[id] === 2).map(id=>R[id]).filter(f=>f && !f.deleted && ow(f) && R[String(f.id).slice(3)]);
    const all = [...fol.map(f=>[f, 'on']), ...hid.map(f=>[f, 'off']), ...comp.map(f=>[f, 'comp'])].sort((a, b)=>(b[0].debut || '').localeCompare(a[0].debut || ''));
    const nm = (fol[0] || hid[0] || comp[0] || {}).owner || key, av = ([...fol, ...hid].find(f=>avOk(f.oav)) || {}).oav || '';
    const row = ([f, st]) => { const id = ja(f.id), live = tripPhase(f) === 'live';
      const open = st === 'comp' ? `CV.go('${ja(String(f.id).slice(3))}');CV.close()` : st === 'on' ? `CV.feedView('${id}')` : '';
      return `<div class="sp2-sr${st === 'off' ? ' off' : ''}"><button type="button" class="sp2-tc" data-fid="${esc(f.id)}"${open ? ` onclick="${open}"` : ''}>${spCov(f)}</button><div class="sp2-sb"><b data-notr>${esc(f.titre || '?')}</b><small>${esc(tripDates(f))}${live ? ` · <span class="sp2-lv">● ${esc(MSGT('en voyage'))}</span>` : ''}</small>
        <small>${st === 'comp' ? '🧳 ' + esc(MSGT('Tu le fais en compagnon : tu l’as déjà en entier')) : st === 'off' ? '🙈 ' + esc(MSGT('Masqué')) : '👀 ' + esc(MSGT('Je le vois'))}</small></div>
        ${st === 'comp' ? '' : `<button type="button" class="sp2-sw${st === 'on' ? ' on' : ''}" role="switch" aria-checked="${st === 'on'}" aria-label="${esc(MSGT('Je le vois'))}" onclick="${st === 'on' ? `CV.feedUnfollow('${id}', false, '${ja(key)}')` : `CV.feedRefollow('${id}', '${ja(key)}')`}"><i></i></button>`}</div>`; };
    openSheet(`<div class="sp2"><div class="sp2-top sp2-top2">${avTag(av, nm, '#3b82f6', 'av-xl')}<h2 data-notr>${esc(nm)}</h2></div><div class="sp2-body">
      <div class="sp2-blk"><div class="sp2-sec">👁️ <b>${esc(MSGT('Ses voyages : choisis ce que tu vois'))}</b></div>
      <div class="sp2-empty">${esc(MSGT('Un voyage masqué disparaît de ce téléphone ; remets-le quand tu veux.'))}</div>
      ${all.map(row).join('') || `<div class="sp2-empty">${esc(MSGT('Aucun voyage pour l’instant.'))}</div>`}</div>
      ${fol.length ? `<div class="sp2-pills"><button type="button" class="danger" onclick="CV.feedUnfollow('${ja(fol[0].id)}', true)">🚫 ${esc(MSGT('Ne plus suivre cette personne'))}</button></div>` : ''}</div></div>`);
    setTimeout(()=>{ try { folPaint(document.getElementById('v-sheet-bg')); } catch(e){} }, 60);   // 🖼️ couvertures Wikipédia automatiques
  }
  function feedRepaintAll(){ document.querySelectorAll('.fd-post[id^="fp-"]').forEach(el=>feedPaint(el.id.slice(3))); }
  async function feedLike(fid){
    const f = R[fid]; if(!f) return; if(!myName()){ const n = (await uiPrompt('Ton prénom :', '')); if(!n) return; M.followName = n.trim(); }
    const id = 'lk:' + fid + ':' + devId(), cur = R[id];
    putQuiet([{id, type:'like', trip:f.trip, feed:fid, who:fwAsFor(TS()[f.trip]), pk:(M.fkey || {}).pub, ib:(M.fkey && M.fkey.pub) ? inbox() : '', on: !(cur && cur.on)}]); syncNow(); feedPaint(fid);
    if(!(cur && cur.on)){ fxPlay && fxHeart(); socCodes(f.trip).forEach(c=>socialPush(f.trip, 'like', f.titre || f.lieu || '', c, f.id)); }
  }
  // les autres personnes qui ont commenté cette publication (abonnés) : prévenues sur leur propre téléphone
  function replyPush(f, txt){
    try {
      const me = devId(), devs = new Set(commentsOf(f.id).map(c=>c.dev).filter(d=>d && d !== me)), ibs = new Set();
      devs.forEach(d=>{ const fw = list('follower', x=>!x.deleted && String(x.id).endsWith(':' + d) && x.ib).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0]; if(fw && fw.ib && fw.ib !== M.ib && !fwMatePid(fw)) ibs.add(fw.ib); });   // un compagnon est déjà prévenu par le lien abonnés
      [...ibs].slice(0, 8).forEach(ib=>socialPush(f.trip, 'comment', txt, ib, f.id));
    } catch(e){}
  }
  // 💬 les fils où mon commentaire est parti (gardé ICI seulement : les codes ne voyagent jamais dans les fiches)
  function cmSent(id){ try { const L = targets(R[id]).filter(c=>c !== 'main'); if(L.length){ const S = M.cmTo || (M.cmTo = {}); S[id] = [...new Set([...(S[id] || []), ...L])]; const k = Object.keys(S); if(k.length > 400) delete S[k[0]]; persist(); } } catch(e){} }
  // la suppression va aussi sur ces fils, même si je ne les suis plus (retiré d’un voyage, compagnon parti…)
  async function cmGoneEverywhere(rec){
    const now = new Set(targets(rec)), L = ((M.cmTo || {})[rec.id] || []).filter(c=>!now.has(c));
    for(const code of L){ const had = spaceObj(code), sp = had || {code, since:0, dirty:[], last:0, err:''}; if(!had) (M.spaces = M.spaces || []).push(sp);
      const t0 = TS()[rec.trip]; TS()[rec.trip] = code;
      try { await spacePushOnly(sp, [clone(rec)]); } catch(e){}
      finally { if(t0) TS()[rec.trip] = t0; else delete TS()[rec.trip]; if(!had) M.spaces = (M.spaces || []).filter(x=>x !== sp); persist(); } }
    if(M.cmTo) { delete M.cmTo[rec.id]; persist(); }
  }
  async function feedComment(fid){
    const f = R[fid], i = document.getElementById('cm-' + fid); if(!f || !i) return; const txt = i.value.trim(); if(!txt){ try { i.focus(); } catch(e){} return; }   // « Envoyer » sans texte : on place le curseur au lieu de ne rien faire
    if(!myName()){ const n = (await uiPrompt('Ton prénom :', '')); if(!n) return; M.followName = n.trim(); }
    const cmId = 'cm:' + uid(); setTimeout(()=>cmSent(cmId), 0);
    putQuiet([{id:cmId, type:'comment', trip:f.trip, feed:fid, who:fwAsFor(TS()[f.trip]), dev:devId(), pk:(M.fkey || {}).pub, ib:(M.fkey && M.fkey.pub) ? inbox() : '', text:txt.slice(0, 600), at:Date.now()}]); socCodes(f.trip).forEach(c=>socialPush(f.trip, 'comment', txt, c, f.id)); replyPush(f, txt); i.value = ''; i.blur(); syncNow(); feedPaint(fid);
  }
  function fxHeart(){ const el = document.createElement('div'); el.className = 'fx-like'; el.innerHTML = '<img src="' + (window.VZ_B || '') + 'anim/heart.webp" alt="">'; document.body.appendChild(el); setTimeout(()=>el.remove(), 1100); }
  function feedPostHTML(f){
    const lk = likesOf(f.id), mine = lk.some(l=>l.id.endsWith(':' + devId())), cm = commentsOf(f.id), open = (M.cmOpen||{})[f.id], ft = R[f.trip] || {};
    const shown = open ? cm : cm.slice(-2), hid = cm.length - shown.length;
    return `<article class="fd-post" id="fp-${f.id}" data-sg="${feedSocSig(f.id)}"><div class="fd-d">${f.by ? `<span class="fd-by">📸 <b data-notr>${esc(f.by)}</b></span> · ` : ''}${f.date ? fdate(f.date) : ''}${f.lieu ? ' · 📍 ' + esc(f.lieu) : ''}${f.cc ? ' ' + flag(f.cc) : ''}</div>
      ${f.titre ? `<h3>${esc(f.titre)}</h3>` : ''}
      ${(f.photos||[]).length ? (()=>{ const au = FT()[String(f.trip).replace(/^ft:/,'')], all = f.photos, nShow = (M.fdMore||{})[f.id] || 12, sh = all.length > nShow + 3 ? all.slice(0, nShow) : all, rest = all.length - sh.length;
        return `<div class="fd-ph${au ? '' : ' grid'}">${sh.map((p,i)=> au || phRef(p) ? `<button type="button" onclick="CV.view('${ja(f.id)}',${i})"><img data-ph="${esc(p)}.t" alt="" loading="lazy"></button>` : `<span><img data-ph="${esc(p)}.t" alt="" loading="lazy"></span>`).join('')}${rest ? `<button type="button" class="fd-more-ph" onclick="CV.feedMorePh('${ja(f.id)}')"><b>+${rest}</b><small>Voir la suite</small></button>` : ''}</div>`; })() : ''}
      ${f.texte ? `<p class="fd-t">${esc(f.texte)}</p>` : ''}
      <div class="fd-a"><button type="button" class="${mine ? 'on' : ''}" onclick="CV.feedLike('${ja(f.id)}')">${mine ? '❤️' : '🤍'} <b>${lk.length || ''}</b></button><button type="button" onclick="CV.feedCmFocus('${ja(f.id)}')">💬 <b>${cm.length || ''}</b></button>${isAuthorOf(f.trip) ? '' : `<button type="button" class="fd-more" aria-label="Signaler ou ne plus suivre" onclick="CV.postMenu('${ja(f.id)}')">⋯</button>`}</div>
      ${lk.length ? `<button type="button" class="fd-lk" onclick="CV.feedLikers('${ja(f.id)}')">${feedLikeLine(lk)}</button>` : ''}
      <div class="fd-c">${hid ? `<button type="button" class="fd-call" onclick="CV.feedTogC('${ja(f.id)}')">${cm.length === 3 ? 'Voir les 3 commentaires' : `Voir les ${cm.length} commentaires`}</button>` : ''}
        ${shown.map(c=>{ const au = c._au || (FT()[String(ft.id || '').replace(/^ft:/, '')] && c.dev === devId());   // ✍️ « auteur » : seulement si le serveur l’a reconnu (un abonné qui prend ton prénom ne l’a pas)
          return `<div class="fd-cm"><button type="button" class="fd-cmore" aria-label="Options" onclick="CV.cmMenu('${ja(c.id)}')">⋯</button><b data-notr>${esc(c.who||'?')}</b>${au ? ' <span class="fd-au">auteur</span>' : ''} <span class="fd-ctx" data-notr>${esc(c.text)}</span>
            <div class="fd-cmeta"><small>${c.at ? vzWhen(c.at) : ''}${c.edited ? ' · <span>modifié</span>' : ''}</small><button type="button" onclick="CV.feedReply('${ja(f.id)}','${ja(c.id)}')">Répondre</button></div></div>`; }).join('')}
        ${open && cm.length > 2 ? `<button type="button" class="fd-call" onclick="CV.feedTogC('${ja(f.id)}')">Réduire</button>` : ''}
        <div class="cv-row fd-cin"><input class="v-in" id="cm-${f.id}" placeholder="Écrire un commentaire…" maxlength="600" enterkeyhint="send" onkeydown="if(event.key==='Enter'&&!event.isComposing){event.preventDefault();CV.feedComment('${ja(f.id)}')}"><button type="button" class="fd-send" onclick="CV.feedComment('${ja(f.id)}')">Envoyer</button></div></div></article>`;
  }
  // signature des ❤️ et commentaires d’une publication : on ne redessine que si elle change
  function feedSocSig(fid){ return likesOf(fid).length + '.' + commentsOf(fid).map(c=>c.id.slice(-4)).join(''); }
  // « Aimé par toi, Claire et 3 autres »
  function feedLikeLine(lk){
    const me = devId(), names = [];
    lk.slice().sort((a, b)=>(b.id.endsWith(':' + me) ? 1 : 0) - (a.id.endsWith(':' + me) ? 1 : 0)).forEach(l=>{ const n = l.id.endsWith(':' + me) ? MSGT('toi') : String(l.who || '?'); if(!names.includes(n)) names.push(n); });
    const sh = names.slice(0, 2), rest = names.length - sh.length;
    return `❤️ <span>Aimé par</span> <b data-notr>${esc(sh.join(', '))}</b>${rest ? ` <span>${rest === 1 ? 'et 1 autre' : `et ${rest} autres`}</span>` : ''}`;
  }
  function feedLikers(fid){
    const f = R[fid]; if(!f) return; const lk = likesOf(fid), me = devId();
    openSheet(`<h2>❤️ ${lk.length} ${lk.length > 1 ? 'personnes aiment' : 'personne aime'}</h2>
      <div class="fd-lklist">${lk.map(l=>`<div><span>❤️</span><b data-notr>${esc(l.id.endsWith(':' + me) ? MSGT('toi') : (l.who || '?'))}</b></div>`).join('')}</div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  function feedCmFocus(fid, pre){
    const i = document.getElementById('cm-' + fid); if(!i) return;
    if(pre != null){ i.value = pre; }
    i.focus(); try { const n = i.value.length; i.setSelectionRange(n, n); } catch(e){}
    try { i.scrollIntoView({block:'center', behavior:'smooth'}); } catch(e){}
  }
  function feedReply(fid, cid){ const c = R[cid]; if(!c) return; feedCmFocus(fid, '@' + String(c.who || '').trim() + ' '); }
  // voyage ouvert : les nouveaux ❤️ et commentaires des autres arrivent seuls (toutes les 30 s, écran allumé)
  async function feedSocTick(){
    const ov = document.getElementById('cv-feed'); if(!ov || !M.feedOpen || document.visibilityState !== 'visible' || feedSocBusy) return;
    feedSocBusy = true;
    try { await syncNow(); } catch(e){} finally { feedSocBusy = false; }
    { const m = ov.querySelector('.fd-map'), sg = fkSig(M.feedOpen); if((m && m.dataset.fks !== sg) || (!m && sg)){ const h = feedMapHTML(M.feedOpen);
        if(m) m.outerHTML = h || ''; else { const l = ov.querySelector('.fd-list'); if(l) l.insertAdjacentHTML('afterbegin', h); } setTimeout(feedMapHydrate, 30); } }
    ov.querySelectorAll('.fd-post[id^="fp-"]').forEach(el=>{
      const fid = el.id.slice(3); if(!R[fid] || el.dataset.sg === feedSocSig(fid)) return;
      const i = document.getElementById('cm-' + fid); if(i && (document.activeElement === i || i.value)) return;   // on n’efface jamais un message en cours
      feedPaint(fid);
    });
  }
  let feedSocBusy = false;
  // « +N Voir la suite » : on ajoute les photos suivantes à la grille SANS redessiner la publication, et on garde la même hauteur à l’écran
  function feedMorePh(fid){
    const f = R[fid], el = document.getElementById('fp-' + fid), box = el && el.querySelector('.fd-ph'), btn = box && box.querySelector('.fd-more-ph'); if(!f) return;
    M.fdMore = M.fdMore || {}; const was = M.fdMore[fid] || 12, now = was + 60; M.fdMore[fid] = now;
    if(!box || !btn){ feedPaint(fid); return; }
    const sc = el.closest('.fd-list') || document.scrollingElement, y = sc.scrollTop;
    const au = FT()[String(f.trip).replace(/^ft:/,'')], all = f.photos || [], sh = all.length > now + 3 ? all.slice(was, now) : all.slice(was), rest = all.length - was - sh.length;
    btn.insertAdjacentHTML('beforebegin', sh.map((p, k)=> au || phRef(p) ? `<button type="button" onclick="CV.view('${ja(f.id)}',${was + k})"><img data-ph="${esc(p)}.t" alt="" loading="lazy"></button>` : `<span><img data-ph="${esc(p)}.t" alt="" loading="lazy"></span>`).join(''));
    if(rest > 0) btn.querySelector('b').textContent = '+' + rest; else btn.remove();
    try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch(e){}
    let user = false; const stop = () => { user = true; }; sc.addEventListener('touchstart', stop, {once:true, passive:true}); sc.addEventListener('wheel', stop, {once:true, passive:true});
    const keep = () => { if(!user && Math.abs(sc.scrollTop - y) > 2) sc.scrollTop = y; };   // le doigt reprend la main dès qu’il touche l’écran
    keep(); hydrate(); requestAnimationFrame(keep); setTimeout(keep, 120); setTimeout(keep, 400);
  }
  function feedPaint(fid){ const el = document.getElementById('fp-' + fid), f = R[fid] || FDV[fid]; if(el && f){ el.outerHTML = feedPostHTML(f); hydrate(); } }
  function feedTogC(fid){ M.cmOpen = M.cmOpen || {}; M.cmOpen[fid] = !M.cmOpen[fid]; feedPaint(fid); }
  // 🔗 déjà abonné par un lien commun, sans prénom : on le demande à l’ouverture (une fois par session tant qu’il manque)
  let pubAsked = false;
  async function pubNameAsk(){
    if(pubAsked || myName() || !(M.spaces || []).some(sp=>sp.pub && sp.real)) return; pubAsked = true;
    const v = await uiPrompt(MSGT('Ton prénom ? Il est obligatoire pour suivre avec un lien commun : c’est comme ça que la personne saura qui tu es.'), '');
    const n = String(v || '').trim().slice(0, 40); if(!n) return;
    M.followName = n; persist(); try { await fwKeyTouch(); await syncNow(); } catch(e){} toast('👋 ' + MSGT('Merci') + ' ' + n + ' !');
  }
  // 👤 les prénoms connus (profils, abonnés, compagnons, équipes suivies) ne sont jamais traduits : « Claire » ne devient pas « Light »
  function i18nNames(){ try { if(!window.I18N || I18N.lang === 'fr' || !I18N.setNames) return; const S = new Set();
    Object.values(R).forEach(r=>{ if(!r || r.deleted) return; const t = r.type;
      if(t === 'profile'){ if(r.nom) S.add(r.nom); } else if(t === 'follower' || t === 'comment' || t === 'like' || t === 'feedco' || t === 'member' || t === 'feed'){ if(r.who) S.add(r.who); if(r.nom) S.add(r.nom); }
      else if(t === 'feedtrip'){ try { ftTeam(r).forEach(n=>S.add(n)); } catch(e){} } });
    try { AI().forEach(x=>{ if(x && x.name) S.add(x.name); }); } catch(e){} try { Object.values(PACKS()).forEach(p=>{ if(p && p.who) S.add(p.who); }); } catch(e){}
    if(M.fwAs) Object.values(typeof M.fwAs === 'object' ? M.fwAs : {v:M.fwAs}).forEach(v=>{ if(typeof v === 'string') S.add(v); });
    I18N.setNames([...S]); } catch(e){} }
  function feedView(ftid){ i18nNames();
    setTimeout(()=>{ pubNameAsk().catch(()=>{}); }, 1200);
    const ft = R[ftid]; if(!ft) return; closeSheet(true);
    let ov = document.getElementById('cv-feed'); if(ov) ov.remove(); ov = document.createElement('div'); ov.id = 'cv-feed';
    const posts = list('feed', f=>f.trip===ftid).sort((a,b)=>fdOrd(b, a));
    const fw = FT()[String(ftid).slice(3)] ? ab2NFw(String(ftid).slice(3)) : 0;
    ov.innerHTML = `<div class="fd-top"><button type="button" class="fd-x" onclick="CV.feedClose()" aria-label="Fermer">✕</button><div><small>${esc(voyageDe(ftTeamTxt(ft)))}</small><b>${esc(ft.titre)}</b><small>${ft.debut ? tripDatesLong(ft) : ''}${fw ? ' · 👀 ' + fw + ' abonné' + (fw>1?'s':'') : ''}</small></div></div>
      ${(()=>{ const c = TS()[ftid], sib = c ? list('feedtrip', f=>TS()[f.id] === c && !f.deleted).sort((a, b)=>(b.debut||'').localeCompare(a.debut||'')) : [];
        const nAll = list('feedtrip', f=>TS()[f.id] && !FT()[f.id.replace(/^ft:/,'')] && !f.deleted).length;
        return !FT()[String(ftid).replace(/^ft:/,'')] && (sib.length > 1 || nAll > 1) ? `<button type="button" class="fd-back" onclick="CV.feedBack()"><span>←</span><b>Tous les voyages que je suis</b></button>` : ''; })()}
      ${!myName() && !FT()[String(ftid).replace(/^ft:/,'')] ? `<form class="fd-name" onsubmit="event.preventDefault();CV.fwNameSave(this)"><span>👋 Ton prénom ? <small>${ftTeam(ft).length > 1 ? `Pour que ${esc(ftTeamTxt(ft))} sachent qui suit leur voyage.` : `Pour que ${esc(ft.owner || '?')} sache qui suit son voyage.`}</small></span><div class="cv-row"><input class="v-in" name="n" maxlength="40" placeholder="Prénom" autocomplete="given-name"><button type="submit" class="fd-send">OK</button></div></form>` : ''}
      ${feedBellHTML(ftid)}
      ${(()=>{ const n = posts.reduce((a, f)=>a + (f.photos || []).length, 0); return n ? `<button type="button" class="fd-step" onclick="CV.psFeed('${ja(ftid)}')"><i>👆</i><span><b>${esc(MSGT('Voir les photos une par une'))}</b><small>${esc(RF('{0} photo(s) · glisse ou touche ▶', n))}</small></span></button>` : ''; })()}
      <div class="fd-list">${feedMapHTML(ftid)}${posts.map(feedPostHTML).join('') || '<div class="fd-empty">Pas encore d’étape publiée. Reviens bientôt !</div>'}${FT()[String(ftid).replace(/^ft:/,'')] || webFollowing() ? '' : `<div class="fd-unf"><button type="button" class="v-btn sec" onclick="CV.feedUnfollow('${ja(ftid)}')">🚫 Ne plus suivre ce voyage</button>${list('feedtrip', f=>TS()[f.id] && f.id !== ftid && String(f.owner||'').trim().toLocaleLowerCase() === String(ft.owner||'').trim().toLocaleLowerCase()).length ? `<button type="button" class="v-btn sec" onclick="CV.feedUnfollow('${ja(ftid)}',1)">🚫 Ne plus suivre <span data-notr>${esc(ft.owner || '?')}</span> (tous ses voyages)</button>` : ''}</div>`}<div class="cv-poem"><span>${esc(TT('Des souvenirs à chaque étape.'))}</span></div></div>`;
    document.body.appendChild(ov); document.body.style.overflow = 'hidden'; hydrate(); M.feedOpen = ftid; M.feedLast = ftid; feedMapHydrate();
    ov._h = posts.map(feedPostHTML).join('') + '|' + fkSig(ftid) + '|' + fmSigOf(ftid);
    // photos pas encore arrivées chez l’abonné (le voyageur les envoie encore) : on réessaie chaque minute
    if(!window._fdSoc) window._fdSoc = setInterval(feedSocTick, 30000);
    if(!window._fdRetry) window._fdRetry = setInterval(()=>{ if(!document.getElementById('cv-feed') || document.visibilityState !== 'visible') return;
      const m = document.querySelectorAll('#cv-feed img.miss'); if(!m.length) return; m.forEach(i=>{ i.classList.remove('miss'); delete i.dataset.ok; delete i.dataset.ld; }); hydrate(); }, 61000);
    if(webFollowing()) ov.insertAdjacentHTML('beforeend', webCta().replace('class="fd-cta"', 'class="fd-cta" style="position:relative;margin:0"'));
    syncNow().then(()=>{ if(M.feedOpen === ftid && document.getElementById('cv-feed')){ const y = ov.querySelector('.fd-list').scrollTop; const p2 = list('feed', f=>f.trip===ftid).sort((a,b)=>fdOrd(b, a));
      const h2 = p2.map(feedPostHTML).join('') + '|' + fkSig(ftid) + '|' + fmSigOf(ftid); if(h2 === ov._h){ hydrate(); return; } ov._h = h2; ov.querySelector('.fd-list').innerHTML = feedMapHTML(ftid) + (p2.map(feedPostHTML).join('') || '<div class="fd-empty">Pas encore d’étape publiée. Reviens bientôt !</div>'); setTimeout(feedMapHydrate, 30); ov.querySelector('.fd-list').scrollTop = y; hydrate(); } });
  }
  // 🔔 abonné avec l’appli : un bouton pour être prévenu des nouvelles étapes (sans aller dans les réglages)
  function feedBellHTML(ftid){
    if(FT()[String(ftid).replace(/^ft:/,'')] || !pushOk() || cloudMode() === 'none') return '';
    const P = PU(); if(P.on && P.kinds.suivi && Notification.permission === 'granted') return '';
    if(Notification.permission === 'denied') return '';
    return `<button type="button" class="fd-bell" onclick="CV.feedBell()"><span>🔔</span><b>Me prévenir des nouvelles étapes</b><small>Une notification à chaque nouvelle publication</small></button>`;
  }
  async function feedBell(){
    const P = PU(); P.kinds.suivi = 1; persist();
    if(P.on && Notification.permission === 'granted'){ try { await pushRegister(true); } catch(e){} toast('🔔 Notifications activées'); }
    else await pushTog(true);
    document.querySelectorAll('#cv-feed .fd-bell').forEach(b=>{ if(PU().on && Notification.permission === 'granted') b.remove(); });
  }
  const fkLast = p => { const l = (p.pts||[])[(p.pts||[]).length - 1]; return (l && l[2]) || 0; };
  function feedTrkRec(ftid){
    const tid = String(ftid).replace(/^ft:/,''), fid = 'ft:' + tid, by = {}, off = {}, base = R['fk:' + tid];
    const k = n => String(n || '?').trim().toLocaleLowerCase();
    Object.values(R).forEach(r=>{ if(!r || r.type !== 'feedtrk' || r.trip !== fid || r.id === 'fk:' + tid) return;
      if(r.deleted){ if(r.n) off[k(r.n)] = r.updatedAt || r.createdAt || ''; return; }
      (r.people||[]).forEach(p=>{ if((p.pts||[]).length && (!by[k(p.n)] || fkLast(p) >= fkLast(by[k(p.n)]))) by[k(p.n)] = Object.assign({}, p, {own:1}); }); });
    if(base && !base.deleted) (base.people||[]).forEach(p=>{ const n = k(p.n); if(!(p.pts||[]).length) return;
      if(off[n] && String(off[n]) >= String(base.updatedAt || base.createdAt || '')) return;   // il a arrêté de partager depuis
      if(!by[n] || fkLast(p) > fkLast(by[n])) by[n] = p; });
    // 🚆 les modes de transport choisis par les voyageurs et leurs trajets prévus voyagent avec la route
    let tm = {}, pl = [], at = '';
    Object.values(R).forEach(r=>{ if(r && r.type === 'feedtrk' && r.trip === fid && !r.deleted && (r.tm || r.pl) && String(r.updatedAt || '') >= at){ at = String(r.updatedAt || ''); tm = r.tm || tm; pl = r.pl || pl; } });
    const people = Object.values(by); return people.length ? {people, tm, pl} : null;
  }
  const fkSig = ftid => { const r = feedTrkRec(ftid); return r ? r.people.map(p=>p.n + fkLast(p) + (p.pts||[]).length).join('|') : ''; };
  const fmSigOf = ftid => { const r = R['fm:' + String(ftid).replace(/^ft:/, '')]; return r && !r.deleted ? String(r.updatedAt || 1) : ''; };
  const LIVE_MS = 20 * 60000;   // « en direct » : un point il y a moins de 20 min
  function feedMapHTML(ftid){
    const r = feedTrkRec(ftid), geo = list('feed', f=>f.trip===ftid && f.lat != null && f.lng != null).length, fm = R['fm:' + String(ftid).replace(/^ft:/, '')], hasM = !!(fm && !fm.deleted); if(!r && !geo && !hasM) return '';
    const live = r ? r.people.filter(p=>Date.now() - fkLast(p) < LIVE_MS) : [];
    // 🗺️ la carte du voyage en 2D ou en 3D (étapes, trajets, visites si le voyageur l’a partagée ; sinon les souvenirs et le suivi)
    const mb = `<div class="fd-mb"><span>${esc(MSGT('La carte du voyage'))}</span><button type="button" onclick="CV.fmOpen('${ja(ftid)}',0)">🗺️ 2D</button><button type="button" onclick="CV.liveOpen('${ja(ftid)}')">🛰️ 3D</button></div>`;
    return `<div class="fd-map" data-fks="${esc(fkSig(ftid))}">${mb}${liveBtnHTML(ftid, live.map(p=>p.n), r ? r.people.length : 0)}${r ? `<div class="fd-mh">🛰️ La route du voyage</div><div class="fd-mm" data-fmap="${esc(ftid)}" onclick="CV.liveOpen('${ja(ftid)}')"><div class="v-sum-small">🗺️ Carte en cours…</div></div>
      <div class="lm-l">${r.people.map(p=>{ const l = p.pts[p.pts.length-1], on = Date.now() - fkLast(p) < LIVE_MS; return `<span${on ? ' class="on"' : ''}><i style="background:${hexc(p.c, '#0ea5e9')}"></i>${p.gps ? '🛰️' : '📸'} <b data-notr>${esc(p.n || '—')}</b> <small>${on ? '<span>en direct</span> · ' : ''}<span>${l && l[2] ? vzWhen(l[2]) : ''}</span></small></span>`; }).join('')}</div>` : ''}</div>`;
  }
  async function feedMapHydrate(){
    const el = document.querySelector('[data-fmap]:not([data-ok])'); if(!el) return; el.dataset.ok = '1';
    const r = feedTrkRec(el.dataset.fmap); if(!r){ el.remove(); return; }
    const lines = r.people.map(p=>({pts:p.pts.map(x=>[x[0], x[1]]), color:hexc(p.c, '#0ea5e9')}));
    const markers = r.people.map(p=>{ const l = p.pts[p.pts.length-1]; return {lat:l[0], lng:l[1], label:((p.n || '?')[0] || '?').toUpperCase(), color:hexc(p.c, '#0ea5e9')}; });
    try { const c = await drawMap({w:640, h:360, lines, markers, maxZoom:13}); if(el.isConnected) el.innerHTML = `<img src="${c.toDataURL('image/jpeg', .86)}" alt="" style="width:100%;display:block;border-radius:14px">`; } catch(e){ el.innerHTML = ''; }
  }
  // retour à la grille des voyages suivis (dans l’appli : l’accueil ; dans le navigateur : la même grille en plein écran)
  function feedBack(){
    const ov = document.getElementById('cv-feed'); if(ov) ov.remove(); M.feedOpen = null;
    if(!(webFollowing() && !isInstalled())){ document.body.style.overflow = ''; if(!trips().length || M.tab === 'reglages') { try { render(); } catch(e){} } else { try { shareHub(); } catch(e){} } return; }
    const h = document.createElement('div'); h.id = 'cv-feed'; h.className = 'fd-home';
    h.innerHTML = `<div class="fd-top"><div><b>➡️ Les voyages que je suis</b></div></div><div class="fd-list" style="padding:12px">${followHTML()}</div>`;
    document.body.appendChild(h); document.body.style.overflow = 'hidden'; folPaint(h); hydrate();
  }
  function feedClose(){ const ov = document.getElementById('cv-feed'); if(ov) ov.remove(); document.body.style.overflow = ''; M.feedOpen = null; if(webFollowing() && !isInstalled()) webCreate(); }
  // côté auteur : ❤️ et 💬 sur ses souvenirs
  function souvTop(){
    const t = trip(); if(!t) return '';
    const seg = `<div class="cv-soin"><button type="button" class="on">📸 Souvenirs</button>${souvs().some(s=>(s.photos||[]).length) ? `<button type="button" onclick="CV.psTrip('${ja(t.id)}')">👆 Photos</button>` : ''}<button type="button" onclick="CV.modeGo('bilan')">🏁 Bilan</button><button type="button" onclick="CV.filmOpen()">🎬 Film</button><button type="button" onclick="CV.flyover()">🌍 Survol 3D</button><button type="button" onclick="CV.wrapped()">✨ Récap</button><button type="button" onclick="CV.albumSheet()">📕 Album</button></div>`;
    if(t.demo || hidden('blk:fban')) return seg;
    const fc = feedCode(t.id);
    if(!fc) return seg + `<div class="cv-fban"><span class="fb-i">👀</span><span><b>Partage tes souvenirs avec tes proches</b><small>Tes proches suivent le voyage (photos, lieux, récits), mettent des ❤️ et des commentaires. Le reste reste privé.</small></span><button type="button" onclick="CV.feedPublish('${ja(t.id)}')">Publier</button></div>`;
    const nfw = ab2NFw(t.id), nlk = list('like', l=>l.trip===ftId(t.id) && l.on && !isBlk(l)).length, ncm = list('comment', c=>c.trip===ftId(t.id) && !isBlk(c)).length;
    return seg + `<div class="cv-fban"><span class="fb-i">👀</span><span><b>${nfw} abonné${nfw>1?'s':''} · ❤️ ${nlk} · 💬 ${ncm}</b><small>Tes souvenirs sont publiés. Touche ❤️ / 💬 sous un souvenir pour lire et répondre.</small></span><button type="button" onclick="CV.feedPublish('${ja(t.id)}')">Inviter</button></div>`;
  }
  function souvSocial(s){
    if(!socCode(s.trip)) return ''; if(s.priv) return `<div class="sv-so"><small>🔒 Privé : pas visible des abonnés</small></div>`;
    const fid = 'fd:' + s.id, lk = likesOf(fid), cm = commentsOf(fid);
    return `<button type="button" class="sv-so" onclick="CV.souvComments('${ja(s.id)}')">❤️ <b>${lk.length}</b> · 💬 <b>${cm.length}</b>${lk.length ? ` <small>${lk.slice(0,3).map(l=>esc(l.who||'')).join(', ')}</small>` : ''}</button>`;
  }
  const FDV = {};   // publications reconstruites pour un compagnon qui ne publie pas lui-même (le fil reste lisible et on peut répondre)
  function souvComments(sid){
    const s = R[sid]; if(!s) return; const fid = 'fd:' + sid;
    if(!R[fid] && feedCode(s.trip)){ toast(MSGT('Publication en cours…')); feedBuild(s.trip); }
    let f = R[fid];
    if(!f){ if(!commentsOf(fid).length && !likesOf(fid).length){ toast(MSGT('Pas encore de j’aime ni de commentaire sur ce souvenir.')); syncNow(); return; }
      f = FDV[fid] = {id:fid, type:'feed', trip:ftId(s.trip), src:sid, titre:s.titre || '', lieu:s.lieu || '', date:s.date || '', cc:s.cc || '', texte:s.texte || '', by:s.createdBy && (R[s.trip] || {}).voyageurs && R[s.trip].voyageurs.length > 1 ? pname(s.createdBy) : '', photos:(s.photos || []).slice(0, 12)}; }
    openSheet(`<h2>💬 ${esc(s.titre || 'Souvenir')}</h2><div id="sc-box">${feedPostHTML(f)}</div><div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
    M.cmOpen = M.cmOpen || {}; M.cmOpen[fid] = true; feedPaint(fid);
  }

  const BUILD='2026-11-11n'; window.VZ_BUILD = BUILD;
  async function forceUpdate(){
    if(window.VZ_HOST){ location.replace(location.pathname + '?maj=' + Date.now()); return; }
    try {
      if('serviceWorker' in navigator) for(const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
      if(window.caches) for(const k of await caches.keys()) if(k !== 'share-inbox') await caches.delete(k);
    } catch(e){}
    await uiAlert('Mise à jour prête : l’appli va se relancer.');
    location.replace(location.pathname + '?maj=' + Date.now());
  }
  /* ══════════ 👀 ABONNÉS v2 (2026-11-04m) : un lien PAR ABONNÉ ══════════
     • Chaque abonné a SON lien d’invitation (« iv:<lien> » : petite fiche qui donne le code du fil, ses voyages cachés).
     • Le fil (M.feedAll) n’est jamais envoyé tel quel : un seul exemplaire des souvenirs, ❤️ et commentaires visibles de tous.
     • Retirer quelqu’un = vraie coupure : nouveau fil, chaque lien restant reçoit le nouveau code, son lien à lui est effacé.
     • Chacun ses abonnés : un voyage fait avec Claire peut être montré par chacun, sur ses propres liens.
     • Ne plus suivre = le lien quitte ce téléphone ; il ne revient que si je rouvre mon lien. */
  const AB_V = 2, AB_OLD = new Set(['feedtrip','feed','follower','feedgrant','oldlink','feedtrk','feedmap','feedmove','fwban','fwhide','abinv']);
  const ab2C = () => M.feedAll && spaceObj(M.feedAll) ? M.feedAll : '';
  const ab2Sub = c => { const S = M.subs || (M.subs = {}); return S[c] || (S[c] = {at:Date.now(), hide:{}, t:{}}); };
  const AI = () => M.abInv || (M.abInv = []);   // mes liens d’abonnés : {id, name, code, at}
  const ab2Inv = id => AI().find(x=>x.id === id);
  // ⓪ une fois par téléphone : tout l’ancien système d’abonnés s’efface (liens, fiches, voyages suivis) — les voyages partagés en compagnon ne bougent pas
  function ab2Reset(){
    if((M.ab2v || 0) >= AB_V || storeLoading || storeBroken) return 0;
    const keep = new Set([M.sync && M.sync.code, M.ib].filter(Boolean));
    Object.entries(TS()).forEach(([k, c])=>{ const r = R[k]; if(r && r.type === 'trip') keep.add(c); });
    const old = new Set([...Object.values(FT()), M.feedAll, ...AI().map(x=>x.code), ...Object.values(M.fRx || {}).flatMap(x=>[x.g, x.c]), ...Object.values(M.fgot || {})].filter(Boolean));
    Object.entries(TS()).forEach(([k, c])=>{ if(/^f[tai]:/.test(k)) old.add(c); });
    (M.spaces || []).forEach(sp=>{ if(sp.mate || sp.sub || sp.inv) old.add(sp.code); });
    keep.forEach(c=>old.delete(c));
    const past = Date.now() - 61 * 864e5;
    [...old].filter(c=>myFeedCode(c)).forEach(c=>{ (M.fold = M.fold || []).push({code:c, at:past}); M.fwipe = (M.fwipe || []).concat([c]); });   // mes anciens liens : vidés sur le serveur
    M.spaces = (M.spaces || []).filter(sp=>!old.has(sp.code));
    Object.keys(R).forEach(id=>{ const r = R[id]; if(r && (AB_OLD.has(r.type) || /^f[tai]:/.test(String(r.trip || '')) || (r.type === 'phk' && /^fp:/.test(id)))) delete R[id]; });
    M.dirty = (M.dirty || []).filter(id=>R[id]); (M.spaces || []).forEach(sp=>{ sp.dirty = (sp.dirty || []).filter(id=>R[id]); });
    Object.keys(TS()).forEach(k=>{ if(/^f[tai]:/.test(k)) delete TS()[k]; });
    M.feedPub = {}; M.fRx = {}; M.fq = []; M.fdel = M.fdel || [];
    ['feedAll','abInv','unfol','unfolT','fgot','ftAt','olSent','olDone','preHide','fbC','fwAs','fwChk','fnq','fnqAt','fmoved','feedAuto','feedAllSince','subs','subGone','fup','ab2At','webCode'].forEach(k=>delete M[k]);
    M.ab2v = AB_V; persist();
    setTimeout(()=>{ try { feedOldWipe(); feedPurge(); } catch(e){} }, 8000);
    return 1;
  }
  // 📱 mon fil, mes liens d’abonnés et mes voyages montrés, pareils sur tous mes appareils (fiche « abcfg » de mon carnet)
  function ab2CfgSave(){ const c = ab2C(); M.ab2At = Date.now(); putQuiet([{id:'abcfg', type:'abcfg', v:AB_V, code:c, inv:AI().map(x=>Object.assign({id:x.id, name:x.name, code:x.code, at:x.at}, x.pub ? {pub:1} : {}, x.closed ? {closed:1} : {})), vis:Object.keys(FT()).filter(t=>FT()[t] === c), at:M.ab2At}]); }
  function ab2Space(c, f){ if(!c) return null; if(!spaceObj(c)) (M.spaces = M.spaces || []).push(Object.assign({code:c, since:0, dirty:[], last:0, err:''}, f || {})); const sp = spaceObj(c); Object.assign(sp, f || {}); return sp; }
  function ab2CfgLoad(){
    const r = R.abcfg; if(!r || r.deleted || r.v !== AB_V || !r.at || r.at <= (M.ab2At || 0)) return 0;
    M.ab2At = r.at;
    if(r.code !== M.feedAll){ if(M.feedAll) M.spaces = (M.spaces || []).filter(x=>x.code !== M.feedAll); if(r.code){ M.feedAll = r.code; ab2Space(r.code); } else delete M.feedAll; }
    const want = new Set((r.inv || []).map(x=>x.code));
    AI().forEach(x=>{ if(!want.has(x.code)) M.spaces = (M.spaces || []).filter(s=>s.code !== x.code); });
    M.abInv = (r.inv || []).map(x=>Object.assign({}, x)); AI().forEach(x=>{ ab2Space(x.code, {inv:1}); TS()['fi:' + x.code] = x.code; });
    M.feedPub = {}; if(r.code) (r.vis || []).filter(t=>R[t] && !R[t].deleted).forEach(t=>{ FT()[t] = r.code; });
    persist(); return 1;
  }
  async function ab2Make(){
    let c = ab2C(); if(c) return c;
    c = genCode(); ab2Space(c); M.feedAll = c; persist();
    try { await admPrime(c); } catch(e){}
    return c;
  }
  async function ab2Name(){ if(myName()) return true; const n = await uiPrompt(MSGT('Ton prénom (affiché à tes abonnés) :'), ''); if(!n || !n.trim()) return false; M.followName = n.trim(); persist(); return true; }
  // 🔗 la fiche du lien d’un abonné : le code du fil (il le suit avec), son prénom, ses voyages cachés
  function ab2InvRec(x, extra){ TS()['fi:' + x.code] = x.code; const cur = R['iv:' + x.code];
    const keep = cur && !cur.deleted ? cur : {};
    const r = Object.assign({id:'iv:' + x.code, type:'abinv', trip:'fi:' + x.code, code:ab2C(), name:x.name, owner:myName() || '', oav:myAv() || '', hide:keep.hide || []}, keep.only ? {only:keep.only} : {}, x.pub ? {pub:1, ban:keep.ban || [], hd:keep.hd || {}, mv:keep.mv || {}} : {}, x.pub && (x.closed || keep.closed) ? {closed:1} : {}, extra || {});
    if(!cur || cur.deleted || stripStamp(cur) !== stripStamp(r)) putQuiet([r]); }
  // 🟢 un voyage montré / caché à tous mes abonnés
  async function ab2TripSet(tid, on){
    try { ab2Reset(); } catch(e){}   // l’ancien système part AVANT, jamais après (il effacerait ce qu’on vient de faire)
    const t = R[tid]; if(!t || t.demo) return;
    (M.feedAuto = M.feedAuto || {})[tid] = 1;   // choisi à la main : l’ajout automatique des nouveaux voyages n’y touche plus
    if(on){
      if(!(await ab2Name())) return; try { await fKey(); } catch(e){}
      const c = await ab2Make(); FT()[tid] = c; TS()[ftId(tid)] = c; persist(); feedBuild(tid); ab2CfgSave(); ab2Repaint();
      try { await syncNow(); feedUpload(); setTimeout(()=>{ try { pushRegister(true); } catch(e){} }, 2500); } catch(e){}
    } else { await ab2TripOff(tid); ab2CfgSave(); ab2Repaint(); }
  }
  async function ab2TripOff(tid, nosync){
    const c = FT()[tid]; if(!c) return; const fid = ftId(tid);
    const out = Object.values(R).filter(r=>r && !r.deleted && (r.id === fid || r.id === 'fk:' + tid || r.id === 'fm:' + tid || (r.trip === fid && r.type !== 'like' && r.type !== 'comment'))).map(r=>Object.assign(clone(r), {deleted:true}));
    const ph = new Set(list('feed', f=>f.trip === fid).flatMap(f=>(f.photos || []).map(String)));
    M.fdel = (M.fdel || []).concat(Object.keys((M.fup || {})[c] || {}).filter(id=>ph.has(String(id).replace(/\.t$/, ''))).map(id=>[c, id]));
    { const co = R['fc:' + tid + ':' + M.me]; if(co && !co.deleted) out.push(Object.assign(clone(co), {deleted:true})); }
    TS()[fid] = c; putQuiet(out); delete FT()[tid]; persist();
    if(!nosync) try { await syncNow(); feedPurge(); } catch(e){}
  }
  // ☑️ tous mes voyages montrés / montrés à personne, d’un coup (une seule synchro)
  async function ab2TripsAll(on){
    try { ab2Reset(); } catch(e){}
    const ts = myTrips(), c0 = ab2C(), todo = ts.filter(t=>on ? FT()[t.id] !== c0 || !c0 : FT()[t.id] === c0 && c0); if(!todo.length) return;
    if(!on && !(await uiConfirm(RF('Masquer {0} voyage(s) à tous tes abonnés ?', todo.length)))) return;
    const A = M.feedAuto || (M.feedAuto = {}); todo.forEach(t=>{ A[t.id] = 1; });
    if(on){ if(!(await ab2Name())) return; try { await fKey(); } catch(e){} const c = await ab2Make(); todo.forEach(t=>{ FT()[t.id] = c; TS()[ftId(t.id)] = c; }); persist(); todo.forEach(t=>{ try { feedBuild(t.id); } catch(e){} }); }
    else for(const t of todo) await ab2TripOff(t.id, true);
    ab2CfgSave(); ab2Repaint();
    try { await syncNow(); if(on){ feedUpload(); setTimeout(()=>{ try { pushRegister(true); } catch(e){} }, 2500); } else feedPurge(); } catch(e){}
  }
  // 👀 mes abonnés = mes liens ; chacun peut l’ouvrir sur plusieurs appareils (fiche « fw:<son lien>:<appareil> » sur son lien)
  const ab2InvFws = x => list('follower', f=>f.code === x.code).sort((a, b)=>(b.updatedAt || 0) - (a.updatedAt || 0));
  // 🔗 lien commun (option) : un seul lien pour plusieurs personnes. Chacune y apparaît à part ; la retirer la coupe dans l’appli
  //    (sur son téléphone), sans vraie coupure : pour ça, un lien personnel.
  const ab2Pub = () => AI().find(x=>x.pub && !x.closed);
  const ab2PubRec = () => { const x = ab2Pub(), r = x && R['iv:' + x.code]; return r && !r.deleted ? r : {}; };
  const ab2PubFws = () => { const x = ab2Pub(); if(!x) return []; const ban = new Set(ab2PubRec().ban || []), by = {};
    const mv = ab2PubRec().mv || {}; ab2InvFws(x).forEach(f=>{ const d = fwDevOf(f); if(!ban.has(d) && !mv[d] && !by[d]) by[d] = f; }); return Object.values(by); };
  // une « personne » de ma liste : un lien personnel (id) ou un abonné du lien commun (« pub:<appareil> »)
  // 🏷️ un abonné a changé son prénom (Camille → Victoria) : on garde le nom que JE lui ai donné à côté, pour savoir qui c’est
  function fwLbl(d){ if(!d) return ''; const nk = (M.fwNick || {})[d]; if(nk) return nk;
    try { const x = AI().find(y=>!y.pub && ab2InvFws(y).some(f=>fwDevOf(f) === d)); return x && x.name ? x.name : ''; } catch(e){ return ''; } }
  function fwWho(who, d){ const w = String(who || '').replace(/^🧳\s*/, '').trim(), l = fwLbl(d); if(!l) return who; if(!w) return l; return normQ(w) === normQ(l) ? w : w + ' (' + l + ')'; }
  const ab2Own = P => { const w = P && P.f ? String(P.f.who || '').replace(/^🧳\s*/, '').trim() : ''; return w && !fwGeneric(w) && normQ(w) !== normQ(P.name || '') ? w : ''; };
  function ab2P(id){
    if(String(id).startsWith('pub:')){ const d = id.slice(4), x = ab2Pub(), f = ab2PubFws().find(y=>fwDevOf(y) === d); if(!x || !f) return null;
      return {id, x, f, pub:1, devs:[d], name:ab2Nm(f), hide:new Set((ab2PubRec().hd || {})[d] || [])}; }
    const x = ab2Inv(id); if(!x || x.pub) return null; const f = ab2InvFws(x)[0];
    return {id, x, f, devs:ab2InvFws(x).map(fwDevOf), name:ab2InvNm(x), hide:ab2InvHide(x)};
  }
  // ⚠️ même personne derrière deux lignes (lien perso envoyé par erreur à quelqu’un qui me suivait déjà) : même profil ou même appareil
  const ab2Key = P => P && P.f ? (P.f.pid || fwDevOf(P.f)) : '';
  function ab2Dup(P){ const k = ab2Key(P); if(!k) return null; const L = ab2People(); const i = L.findIndex(q=>q.id === P.id);
    const o = L.find((q, j)=>j !== i && ab2Key(q) === k && (j < i || (P.x && q.x && (q.x.at || 0) < (P.x.at || 0)))); return o || null; }
  const ab2People = () => [...AI().filter(x=>!x.pub).map(x=>ab2P(x.id)), ...ab2PubFws().map(f=>ab2P('pub:' + fwDevOf(f)))].filter(Boolean);
  // 🤝 les abonnés de mes compagnons (ils ont aimé ou commenté nos voyages communs) : je peux les inviter à me suivre
  function ab2MatesFws(){
    const me = devId(), mine = new Set(ab2Fws().map(fwDevOf)), asked = M.abAsked || {}, by = {};
    [...list('comment'), ...list('like', l=>l.on)].forEach(c=>{ const tid = String(c.trip || '').replace(/^ft:/, ''), d = c.dev || devOfRec(c);
      if(!d || d === me || mine.has(d) || !c.pk || !c.ib || !mateCodes(tid).length) return;
      const w = String(c.who || '').replace(/^🧳\s*/, ''); if(!w || fwGeneric(w)) return;
      if(!by[d] || (c.updatedAt || 0) > (by[d].at || 0)) by[d] = {dev:d, who:w, pk:c.pk, ib:c.ib, at:c.updatedAt || 0, asked:!!asked[d], tid, mate:!!(M.abMate || {})[d]}; });
    return Object.values(by);
  }
  function ab2MatesFwHTML(){
    const L = ab2MatesFws(); if(!L.length) return '';
    return `<div class="sp2-sec" style="margin-top:12px">🤝 <b>${esc(MSGT('Les abonnés de mes compagnons'))}</b></div><div class="sp2-empty">${esc(MSGT('Ils suivent un compagnon et ont mis un ❤️ ou un 💬 sur un voyage commun. Les autres abonnés de tes compagnons restent privés. Invite-les à te suivre aussi, ou à rejoindre le voyage comme compagnon.'))}</div>
      ${L.map(x=>{ const t = R[x.tid];
        return `<div class="sp2-row sp2-mf"><span class="sp2-mfn"><b data-notr>${esc(x.who)}</b>${t ? `<small>❤️ <span data-notr>${esc(t.titre || '')}</span></small>` : ''}</span><span class="sp2-mfb">
          ${x.asked ? `<small class="sp2-wait">📩 ${esc(MSGT('invité'))}</small>` : `<button type="button" class="sp2-fol" onclick="CV.ab2AskFw('${ja(x.dev)}')">👀 ${esc(MSGT('Abonné'))}</button>`}
          ${x.mate ? `<small class="sp2-wait">🧳 ${esc(MSGT('invité'))}</small>` : t ? `<button type="button" class="sp2-fol" onclick="CV.ab2AskMate('${ja(x.dev)}')">🧳 ${esc(MSGT('Compagnon'))}</button>` : ''}</span></div>`; }).join('')}`;
  }
  // un lien personnel pour cette personne, envoyé dans sa boîte de l’appli (elle accepte ou refuse)
  async function ab2NewInv(name){
    await ab2Make(); const x = {id:'i' + uid(), name:String(name || '?').slice(0, 40), code:genCode(), at:Date.now()};
    AI().push(x); ab2Space(x.code, {inv:1}); persist();
    try { await admPrime(x.code); await clmPrime(x.code); } catch(e){}
    ab2InvRec(x); ab2CfgSave(); try { await syncNow(); } catch(e){} return x;
  }
  async function ab2AskFw(dev){
    const x0 = ab2MatesFws().find(y=>y.dev === dev); if(!x0) return;
    if(!(await ab2Name())) return;
    if(!ab2Vis().length){ toast('👁️ ' + MSGT('Allume d’abord les voyages à montrer')); return ab2TripsSheet(); }
    if(!(await uiConfirm(RF('Inviter {0} à te suivre ?', x0.who) + '\n\n' + MSGT('Elle reçoit l’invitation dans son appli et choisit de te suivre ou non. Elle aura son propre lien.')))) return;
    const x = await ab2NewInv(x0.who);
    const ok = await ivSend({dev:x0.dev, pk:x0.pk, ib:x0.ib}, {k:'follow', id:x.id, c:x.code, t:myName() || ''}).catch(()=>false);
    if(ok){ (M.abAsked = M.abAsked || {})[dev] = Date.now(); persist(); toast('📩 ' + MSGT('Invitation envoyée dans l’appli :') + ' ' + x0.who); }
    else toast('⚠️ ' + MSGT('Envoi impossible pour le moment'));
    ab2Repaint();
  }
  // 🧳 l’inviter comme COMPAGNON du voyage commun qu’elle a aimé : une invitation personnelle (rien que pour elle), reçue dans son appli
  async function ab2AskMate(dev){
    const x0 = ab2MatesFws().find(y=>y.dev === dev), t = x0 && R[x0.tid]; if(!x0 || !t) return;
    if(M.lock || t.ro){ toast('🔒 ' + MSGT('Mode lecture : touche le cadenas en haut pour modifier')); return; }
    if((M.viaP || {})[t.id]){ alert(MSGT('Tu es dans ce voyage par une invitation personnelle : elle ne se transmet pas. Pour faire venir quelqu’un, demande à celui qui t’a invité.')); return; }
    if(!(await uiConfirm(RF('Inviter {0} comme compagnon dans « {1} » ?', x0.who, t.titre || '') + '\n\n' + MSGT('Elle reçoit l’invitation dans son appli. Si elle accepte, elle voit et complète ce voyage (programme, réservations, budget) ; tes autres voyages restent privés.')))) return;
    cryptShow('🔐 ' + MSGT('Invitation…'));
    let P = null; try { P = await packQuick(t.id, x0.who); } catch(e){} finally { cryptHide(''); }
    const ok = P ? await ivSend({dev:x0.dev, pk:x0.pk, ib:x0.ib}, {k:'trip', id:uid(), c:P, t:t.titre || ''}).catch(()=>false) : false;
    if(ok){ (M.abMate = M.abMate || {})[dev] = Date.now(); persist(); toast('📩 ' + MSGT('Invitation envoyée dans l’appli :') + ' ' + x0.who); }
    else toast('⚠️ ' + MSGT('Envoi impossible pour le moment'));
    ab2Repaint();
  }
  // 🙋 abonné : demander à suivre un compagnon de la personne que je suis (il accepte : lien personnel, lien commun, ou refuse)
  function ab2SubMates(c){
    const S = (M.subs || {})[c]; if(!S) return []; const by = {}, mine = new Set(ab2Subs().map(([, T])=>String(T.owner || '').toLowerCase()));
    ab2SubTrips(c).forEach(f=>(f.ct || []).forEach(m=>{ if(m && m.pk && m.ib && m.nom && !mine.has(String(m.nom).toLowerCase()) && m.ib !== M.ib) by[m.dev || m.pid] = m; }));
    return Object.values(by);
  }
  async function ab2ReqFw(c, key){
    const m = ab2SubMates(c).find(y=>(y.dev || y.pid) === key); if(!m) return;
    if(!(await ab2Name())) return;
    const ok = await ivSend({dev:m.dev, pk:m.pk, ib:m.ib}, {k:'fwreq', id:uid(), c:'', t:((M.subs || {})[c] || {}).owner || ''}).catch(()=>false);
    if(ok){ (M.abReq = M.abReq || {})[key] = Date.now(); persist(); toast('🙋 ' + RF('Demande envoyée à {0}', m.nom)); ab2Repaint(); }
    else toast('⚠️ ' + MSGT('Envoi impossible pour le moment'));
  }
  // réponse à une demande reçue : 1 = son propre lien · 2 = mon lien commun · -1 = non
  async function ab2ReqAnswer(m, opk, a){
    const lk = {dev:m.dev, pk:opk, ib:m.ib}; if(!lk.ib || !lk.pk) return;
    if(a < 0){ ivSend(lk, {k:'reply', id:'fwreq', ok:false, t:''}).catch(()=>{}); return; }
    if(!(await ab2Name())) return;
    let code;
    if(a === 2){ let x = ab2Pub(); if(!x){ await ab2Make(); x = {id:'i' + uid(), name:MSGT('Lien commun'), code:genCode(), at:Date.now(), pub:1}; AI().push(x); ab2Space(x.code, {inv:1}); persist(); try { await admPrime(x.code); } catch(e){} ab2InvRec(x); ab2CfgSave(); try { await syncNow(); } catch(e){} } code = x.code; }
    else code = (await ab2NewInv(m.from || '?')).code;
    const ok = await ivSend(lk, {k:'follow', id:uid(), c:code, t:myName() || ''}).catch(()=>false);
    toast(ok ? '✅ ' + RF('{0} peut maintenant te suivre', m.from || '?') : '⚠️ ' + MSGT('Envoi impossible pour le moment'));
  }
  // 🔀 un abonné venu par le lien commun passe sur SON lien personnel, sans rien voir : son appli lit « mv » dans le lien commun et bascule seule
  async function ab2Indiv(id, quiet){
    const P = ab2P(id); if(!P || !P.pub) return null; const d = P.devs[0], nm = fwLbl(d) || P.name;
    if(!quiet && !(await uiConfirm(RF('Passer {0} sur un lien personnel ?', nm) + '\n\n' + MSGT('Son appli change de lien toute seule, sans rien lui demander ni rien lui montrer. Tu pourras ensuite le retirer pour de vrai.')))) return null;
    const x = await ab2NewInv(nm), hd = (ab2PubRec().hd || {})[d] || [];
    if(hd.length) ab2InvRec(x, {hide:hd});
    const pub = ab2Pub() || AI().find(y=>y.pub); ab2InvRec(pub, {mv:Object.assign({}, ab2PubRec().mv || {}, {[d]:x.code})});
    if(M.fwNick && M.fwNick[d]) delete M.fwNick[d]; persist(); ab2CfgSave();
    try { await syncNow(); } catch(e){}
    if(!quiet){ toast('🔀 ' + RF('{0} a maintenant son propre lien', nm)); closeSheet(true); ab2FwSheet(x.id); }
    return x; }
  // 🗑️ supprimer le lien commun : ceux qui l’ont utilisé passent d’abord sur un lien personnel (ou sont coupés), plus personne ne peut l’ouvrir
  async function ab2PubDel(){
    const x = ab2Pub(); if(!x) return; const L = ab2PubFws();
    if(!(await uiConfirm(MSGT('Supprimer le lien commun ? Plus personne ne pourra l’ouvrir.')))) return;
    const ch = L.length && (await uiConfirm(RF('{0} personne(s) suivent par ce lien. Leur donner chacune un lien personnel, sans qu’elles le remarquent ?', L.length) + '\n\n' + MSGT('OK : elles continuent de te suivre, chacune avec son lien. Annuler : elles sont retirées.'))) ? 'keep' : 'cut'; cryptShow('🗑️ ' + MSGT('Je supprime le lien commun…'));
    try {
      if(ch === 'keep') for(const f of L){ try { await ab2Indiv('pub:' + fwDevOf(f), true); } catch(e){} }
      x.closed = 1; ab2InvRec(x, {closed:1}); persist(); ab2CfgSave(); try { await syncNow(); } catch(e){}
    } finally { cryptHide('🗑️ ' + MSGT('Lien commun supprimé')); }
    closeSheet(true); shareHub(); }
  async function ab2Common(){
    if(!(M.sync.on && M.sync.code)){ acctNeedSpace.at = 0; closeSheet(true); return setTimeout(acctNeedSpace, 250); }   // 📧 lien commun = en ligne = compte
    if(!(await ab2Name())) return; try { ab2Reset(); } catch(e){}
    if(!ab2Vis().length){ toast('👁️ ' + MSGT('Allume d’abord les voyages à montrer')); return ab2TripsSheet(); }
    let x = ab2Pub();
    if(!x){ if(!(await uiConfirm(MSGT('Créer un lien commun ?') + '\n\n' + MSGT('Un seul lien pour plusieurs personnes : pratique pour un groupe. Chacune apparaît dans ta liste et tu peux la retirer, mais seulement dans l’appli. Pour pouvoir couper vraiment, préfère un lien par personne.')))) return;
      await ab2Make(); x = {id:'i' + uid(), name:MSGT('Lien commun'), code:genCode(), at:Date.now(), pub:1}; AI().push(x); ab2Space(x.code, {inv:1}); persist();
      try { await admPrime(x.code); } catch(e){} ab2InvRec(x); ab2CfgSave(); try { await syncNow(); } catch(e){} }
    ab2Send(x.id);
  }
  const ab2Devs = x => ab2InvFws(x).map(fwDevOf);
  function ab2Fws(){ return [...AI().filter(x=>!x.pub).map(x=>ab2InvFws(x)[0]).filter(Boolean), ...ab2PubFws()]; }   // une fiche (la plus récente) par abonné qui a ouvert son lien
  const ab2InvHide = x => { const r = R['iv:' + x.code], h = new Set(r && !r.deleted ? (r.hide || []) : []);
    if(r && !r.deleted && Array.isArray(r.only)){ const o = new Set(r.only); ab2Vis().map(ftId).forEach(f=>{ if(!o.has(f)) h.add(f); }); }   // « seulement ces voyages » : tout le reste est caché pour lui, y compris les voyages montrés plus tard
    return h; };
  const ab2Hid = d => { const x = AI().find(y=>ab2Devs(y).includes(d)); return x ? ab2InvHide(x) : new Set(); };
  const ab2NFw = tid => ab2People().filter(P=>P.f && !P.hide.has(ftId(tid)) && !(P.pub && (ab2PubRec().hide || []).includes(ftId(tid)))).length;   // abonnés qui voient ce voyage
  const ab2Nm = x => String(((M.fwNick || {})[fwDevOf(x)]) || (fwGeneric(x.who) ? MSGT('Un proche') : x.who) || '?').replace(/^🧳\s*/, '');
  const ab2InvNm = x => x.name || ((ab2InvFws(x)[0] || {}).who) || '?';
  const ab2Vis = () => Object.keys(FT()).filter(t=>R[t] && !R[t].deleted && FT()[t] === ab2C()).sort((a, b)=>(R[b].debut || '').localeCompare(R[a].debut || ''));
  const ab2Soc = P => { const ids = new Set(ab2Vis().map(ftId)), ds = new Set(P.devs || []); return {lk:list('like', l=>ids.has(l.trip) && l.on && ds.has(devOfRec(l))).length, cm:list('comment', c=>ids.has(c.trip) && ds.has(c.dev))}; };
  const ab2Sw = (on, js, lbl) => `<button type="button" class="sp2-sw${on ? ' on' : ''}" role="switch" aria-checked="${on}" aria-label="${esc(lbl || '')}" onclick="${js}"><i></i></button>`;
  function ab2Repaint(){ const sh = document.querySelector('#v-sheet-bg .v-sheet'), y = sh ? sh.scrollTop : 0;
    setTimeout(()=>{ const s2 = document.querySelector('#v-sheet-bg .v-sheet'); if(s2 && y) s2.scrollTop = y; }, 0);   // on reste où on était (plus de saut en haut)
    try { const s = document.querySelector('#v-sheet-bg .sp2[data-ab2]'); if(s){ const k = s.getAttribute('data-ab2'); shBack = true;
      if(k === 'trips') ab2TripsSheet(); else if(k.startsWith('fw:')) ab2FwSheet(k.slice(3)); else if(k.startsWith('sub:')) ab2SubSheet(k.slice(4)); else shareHub(); }
    else if(document.querySelector('#v-sheet-bg .sp2[data-live="hub"]')){ shBack = true; shareHub(); }
    else { const h = document.querySelector('#v-sheet-bg .sp2[data-live^="hub"]'); if(h){ shBack = true; socialHub(h.getAttribute('data-live').slice(3)); } } } catch(e){} refresh(); }
  // 👻 abonné qui n’ouvre plus rien (navigateur vidé, appli supprimée…) : rien ne prévient le serveur ; on le repère à sa dernière visite
  const ab2Ghost = f => { const t = Math.max(f.seen || 0, f.updatedAt || 0, f.at || 0); const d = t ? Math.floor((Date.now() - t) / 864e5) : 0; return d >= 14 ? d : 0; };
  // la carte « Mes abonnés » de la page Partager
  function ab2AbHTML(){
    const L = ab2People(), nv = ab2Vis().length, pub = ab2Pub();
    return `<div class="sp2-sh"><div class="sp2-sec">${SVG_EYE}<b>${esc(MSGT('Mes abonnés'))}</b> <small>(${esc(MSGT('lecture seule'))})</small></div><button type="button" class="sp2-add2" onclick="CV.ab2Invite()">＋ ${esc(MSGT('Ajouter'))}</button></div>
      ${L.length ? L.map(P=>{ const f = P.f, nm = P.name, s = ab2Soc(P), av = f && avOk(f.av) ? f.av : '';
        return `<button type="button" class="sp2-row" onclick="CV.ab2FwSheet('${ja(P.id)}')">${av ? avTag(av, nm, '', 'av-lg') : SVG_HID}<b data-notr>${esc(nm)}${ab2Own(P) ? ` <small class="sp2-own">· ${esc(RF('se fait appeler {0}', ab2Own(P)))}</small>` : ''}</b>${P.pub ? `<small class="sp2-wait" title="${esc(MSGT('lien commun'))}">🔗</small>` : ''}${(()=>{ const d = ab2Dup(P); return d ? `<small class="sp2-wait">⚠️ = <span data-notr>${esc(d.name)}</span></small>` : ''; })()}${f && ab2Ghost(f) ? `<small class="sp2-wait">👻 ${esc(RF('plus vu depuis {0} j', ab2Ghost(f)))}</small>` : ''}${f ? `<span class="sp2-ic${s.lk ? '' : ' off'}">${SVG_HEART}</span><span class="sp2-ic${s.cm.length ? '' : ' off'}">${SVG_BUBBLE}</span>` : `<small class="sp2-wait">${Object.values(R).some(r=>r && r.type === 'follower' && r.code === P.x.code && r.deleted) ? '🚪 ' + esc(MSGT('ne suit plus')) : '⏳ ' + esc(MSGT('lien pas encore ouvert'))}</small>`}<span class="sp2-dots">›</span></button>`; }).join('')
        : `<div class="sp2-empty">${esc(MSGT('Touche ＋ Ajouter : chaque personne reçoit son propre lien. Tu pourras la retirer à tout moment, sans rien changer pour les autres.'))}</div>`}
      <div class="sp2-pills"><button type="button" class="soft" onclick="CV.ab2TripsSheet()">👁️ ${esc(RF('Voyages montrés : {0}', nv))}</button><button type="button" class="soft" onclick="CV.ab2Common()">🔗 ${esc(MSGT('Lien commun'))}${pub ? ' (' + ab2PubFws().length + ')' : ''}</button></div>
      ${ab2MatesFwHTML()}${mpBtn()}`;
  }
  // 👁️ les voyages que mes abonnés voient (un interrupteur par voyage)
  function ab2TripsSheet(){
    const ts = myTrips().slice().sort((a, b)=>(b.debut || '').localeCompare(a.debut || '')), c = ab2C();
    openSheet(`<div class="sp2" data-ab2="trips"><div class="sp2-top sp2-top2"><h2>${esc(MSGT('Voyages montrés à mes abonnés'))}</h2></div><div class="sp2-body">
      <div class="sp2-blk"><div class="sp2-empty">${esc(MSGT('Tes abonnés voient seulement les souvenirs (photos, étapes, lieux, récits) des voyages allumés. Le programme, les réservations, le budget et les documents restent privés.'))}</div>
      ${ts.length > 1 ? `<div class="sp2-allr"><button type="button" onclick="CV.ab2TripsAll(true)">☑️ ${esc(MSGT('Tout cocher'))}</button><button type="button" onclick="CV.ab2TripsAll(false)">⬜ ${esc(MSGT('Tout décocher'))}</button></div>` : ''}
      ${ts.map(t=>{ const on = FT()[t.id] === c && !!c; return `<div class="sp2-sr${on ? '' : ' off'}"><span class="sp2-tc">${spCov(t)}</span><div class="sp2-sb"><b data-notr>${esc(t.titre || '?')}</b><small>${esc(tripDates(t))}</small><small>${on ? '👀 ' + esc(MSGT('Montré')) : '🔒 ' + esc(MSGT('Montré à personne'))}</small></div>${ab2Sw(on, `CV.ab2TripSet('${ja(t.id)}', ${!on})`, t.titre)}</div>`; }).join('') || `<div class="sp2-empty">${esc(MSGT('Crée d’abord un voyage.'))}</div>`}</div>
      <div class="sp2-pills"><button type="button" onclick="CV.ab2Invite()">＋ ${esc(MSGT('Inviter un abonné'))}</button></div>
    </div></div>`);
  }
  // ＋ un abonné : son prénom → son propre lien (QR code + message)
  async function ab2Invite(){
    try { ab2Reset(); } catch(e){}   // l’ancien système part AVANT, jamais après (il effacerait ce qu’on vient de faire)
    if(!(M.sync.on && M.sync.code)){ acctNeedSpace.at = 0; closeSheet(true); return setTimeout(acctNeedSpace, 250); }   // 📧 (la fenêtre Partage est fermée d’abord : sinon la question du compte ne s’ouvrait jamais) abonnés = en ligne = carnet en ligne avec compte
    if(!(await ab2Name())) return;
    if(!ab2Vis().length){ if(!myTrips().length){ alert(MSGT('Crée d’abord un voyage.')); return; } toast('👁️ ' + MSGT('Allume d’abord les voyages à montrer')); return ab2TripsSheet(); }
    const n = await uiPrompt(MSGT('Qui invites-tu ? Son prénom (toi seul le vois) :'), ''); if(!n || !n.trim()) return;
    await ab2Make(); const x = {id:'i' + uid(), name:n.trim().slice(0, 40), code:genCode(), at:Date.now()};
    AI().push(x); ab2Space(x.code, {inv:1}); persist();
    try { await admPrime(x.code); await clmPrime(x.code); } catch(e){}   // 🔒 verrouillé dès sa création : le 1er compte qui l’ouvre le garde
    ab2InvRec(x); ab2CfgSave();
    try { await syncNow(); } catch(e){}
    ab2Send(x.id);
  }
  function ab2Send(id){
    const x = ab2Inv(id); if(!x) return; if(x.pub) setTimeout(()=>{ try { const b = document.querySelector('#v-sheet-bg .v-sheet'); if(b && !b.querySelector('.ab2-pdel')){ const d = document.createElement('div'); d.className = 'sp2-pills ab2-pdel'; d.innerHTML = `<button type="button" class="danger" onclick="CV.ab2PubDel()">🗑️ ${esc(MSGT('Supprimer le lien commun'))}</button>`; b.appendChild(d); } } catch(e){} }, 60); const MSG = s => (window.I18N && I18N.msg ? I18N.msg(s) : s), link = appUrl() ? appUrl() + '#suivre=' + encodeURIComponent(x.code) + invTag('') : '';
    const text = MSG('Suis mes voyages sur Vezoria ✈️ : photos et récits au fil des étapes') + fwTail(link, x.code);
    fwInviteSheet(x.code, link, text, RF('Lien de {0}', x.name));
  }
  // 👤 un abonné : ce qu’il voit (voyage par voyage), ses ❤️ et commentaires, son lien, le renommer, le retirer
  function ab2FwSheet(id){
    const P = ab2P(id); if(!P) return shareHub();
    const f = P.f, nm = P.name, s = ab2Soc(P), H = P.hide, vis = ab2Vis(), mp = f && f.pid && prof(f.pid) ? f.pid : '';
    openSheet(`<div class="sp2" data-ab2="fw:${esc(id)}"><div class="sp2-top sp2-top2">${f && avOk(f.av) ? avTag(f.av, nm, '', 'av-xl') : SVG_HID}<h2 data-notr>${esc(nm)}</h2>${ab2Own(P) ? `<div class="sp2-empty">${esc(RF('Se fait appeler {0} dans son appli', ab2Own(P)))}</div>` : ''}</div><div class="sp2-body">
      ${f ? '' : `<div class="sp2-blk"><div class="sp2-empty">⏳ ${esc(MSGT('Son lien n’a pas encore été ouvert.'))}</div></div>`}
      ${(()=>{ const d = ab2Dup(P); return d ? `<div class="sp2-blk"><div class="sp2-empty" style="color:var(--danger,#c0392b)">⚠️ ${esc(RF('C’est la même personne que {0} : ce lien a sans doute été envoyé par erreur. Retire-le, puis crée un nouveau lien pour la bonne personne.', d.name))}</div></div>` : ''; })()}
      ${P.pub ? `<div class="sp2-blk"><div class="sp2-empty">🔗 ${esc(MSGT('Abonné par ton lien commun.'))}</div></div>` : ''}
      <div class="sp2-blk"><div class="sp2-sec">👁️ <b>${esc(MSGT('Ce qu’il voit'))}</b></div><div class="sp2-empty">${esc(MSGT('Éteins un voyage pour le cacher à cette personne seulement.'))}</div>
        ${vis.length > 1 ? `<div class="sp2-allr"><button type="button" onclick="CV.ab2FwAll('${ja(id)}', true)">☑️ ${esc(MSGT('Tout cocher'))}</button><button type="button" onclick="CV.ab2FwAll('${ja(id)}', false)">⬜ ${esc(MSGT('Tout décocher'))}</button></div>` : ''}
        ${vis.map(t=>{ const on = !H.has(ftId(t)), cp = mp && (R[t].voyageurs || []).includes(mp);
          return `<div class="sp2-sr${on ? '' : ' off'}"><span class="sp2-tc">${spCov(R[t])}</span><div class="sp2-sb"><b data-notr>${esc(R[t].titre || '?')}</b><small>${esc(tripDates(R[t]))}</small><small>${cp ? '🧳 ' + esc(MSGT('compagnon : il l’a déjà en entier')) : on ? '👀 ' + esc(MSGT('Il le voit')) : '🙈 ' + esc(MSGT('Caché pour lui'))}</small></div>${cp ? '' : ab2Sw(on, `CV.ab2FwHide('${ja(id)}','${ja(t)}')`, R[t].titre)}</div>`; }).join('') || `<div class="sp2-empty">${esc(MSGT('Aucun voyage montré pour l’instant.'))}</div>`}</div>
      ${f ? `<div class="sp2-blk"><div class="sp2-sec">💬 <b>${esc(RF('{0} ❤️ · {1} commentaire(s)', s.lk, s.cm.length))}</b></div>${s.cm.slice(-3).map(c=>`<div class="sp2-empty">« <span data-notr>${esc(String(c.text || '').slice(0, 140))}</span> »</div>`).join('')}</div>` : ''}
      <div class="sp2-pills">${P.pub ? '' : `<button type="button" class="soft" onclick="CV.ab2Send('${ja(id)}')">📤 ${esc(MSGT('Renvoyer son lien'))}</button>`}<button type="button" onclick="CV.ab2Rename('${ja(id)}')">✏️ ${esc(MSGT('Renommer'))}</button>${ab2Own(P) ? `<button type="button" onclick="CV.ab2Rename('${ja(id)}', 1)">🏷️ ${esc(RF('L’appeler {0}', ab2Own(P)))}</button>` : ''}</div>
      ${P.pub ? `<div class="sp2-pills"><button type="button" onclick="CV.ab2Indiv('${ja(id)}')">🔀 ${esc(MSGT('Passer en lien personnel (il ne le voit pas)'))}</button></div>` : ''}
      <div class="sp2-pills"><button type="button" class="danger" onclick="CV.ab2FwDel('${ja(id)}')">🚫 ${esc(MSGT('Retirer cet abonné'))}</button></div>
      <div class="sp2-empty" style="margin-top:8px">${esc(MSGT(P.pub ? 'Retiré : ses voyages suivis disparaissent de son téléphone. Comme il est venu par le lien commun, il a encore ce lien : pour couper vraiment, crée des liens personnels.' : 'Retiré : son lien ne marche plus, ses voyages suivis disparaissent de son téléphone. Tes autres abonnés ne voient aucune différence.'))}</div></div></div>`);
  }
  async function ab2Rename(id, own){ const P = ab2P(id); if(!P) return;
    if(own && ab2Own(P)){ const n = ab2Own(P); if(P.pub){ M.fwNick = M.fwNick || {}; M.fwNick[P.devs[0]] = n; persist(); ab2Repaint(); return; } P.x.name = n.slice(0, 40); persist(); ab2InvRec(P.x); ab2CfgSave(); ab2Repaint(); try { await syncNow(); } catch(e){} return; }
    if(P.pub) return fwNickAsk(P.devs[0]);
    const x = P.x, n = await uiPrompt(MSGT('Qui est-ce ? Donne-lui un nom pour t’y retrouver (toi seul le vois).'), x.name || ab2Own(P) || ''); if(!n || !n.trim()) return; x.name = n.trim().slice(0, 40); persist(); ab2InvRec(x); ab2CfgSave(); ab2Repaint(); try { await syncNow(); } catch(e){} }
  // 🩹 abonnés qui ont ouvert leur lien entre le 9 et le 11/11/2026 : les voyages que l’auteur leur cachait s’affichaient quand même
  //    (la liste restait sur le lien, sans arriver jusqu’à l’abonnement). Au démarrage, on la remet à sa place.
  setTimeout(()=>{ try { let n = 0; Object.keys(M.subs || {}).forEach(c=>{ const S = M.subs[c], iv = S && S.iv && spaceObj(S.iv); if(!iv) return;
      if(Array.isArray(iv.ah) && JSON.stringify(iv.ah) !== JSON.stringify(S.ah || [])){ S.ah = iv.ah; n++; }
      if(Array.isArray(iv.ao) && JSON.stringify(iv.ao) !== JSON.stringify(S.ao || null)){ S.ao = iv.ao; n++; }
      if(n) ab2Map(c); });
    if(n){ persist(); refresh(); } } catch(e){} }, 2500);
  function ab2SetHide(P, arr){ if(P.pub){ const hd = Object.assign({}, ab2PubRec().hd || {}); hd[P.devs[0]] = arr; ab2InvRec(P.x, {hd}); }
    else { const r = R['iv:' + P.x.code], lim = r && !r.deleted && Array.isArray(r.only); ab2InvRec(P.x, Object.assign({hide:arr}, lim ? {only:ab2Vis().map(ftId).filter(f=>!arr.includes(f))} : {})); } }
  async function ab2FwAll(id, on){ const P = ab2P(id); if(!P) return; ab2SetHide(P, on ? [] : ab2Vis().map(ftId)); ab2Repaint(); try { await syncNow(); } catch(e){} }
  async function ab2FwHide(id, tid){
    const P = ab2P(id); if(!P) return; const H = new Set(P.hide), fid = ftId(tid);
    if(H.has(fid)) H.delete(fid); else H.add(fid);
    ab2SetHide(P, [...H]); ab2Repaint();
    try { await syncNow(); } catch(e){}
  }
  // 🚫 retirer : nouveau fil, le nouveau code part dans chaque lien restant ; son lien à lui dit « retiré » puis s’efface
  async function ab2FwDel(id){
    { const P = ab2P(id); if(P && P.pub){
      if(!(await uiConfirm(RF('Retirer {0} de tes abonnés ?', P.name) + '\n\n' + MSGT('Ses voyages suivis disparaissent de son téléphone. Il a reçu le lien commun : pour couper vraiment, crée des liens personnels.')))) return;
      ab2InvRec(P.x, {ban:[...new Set([...(ab2PubRec().ban || []), P.devs[0]])]}); closeSheet(true); shareHub(); toast('🚫 ' + MSGT('Abonné retiré')); try { await syncNow(); } catch(e){} return; } }
    const x = ab2Inv(id), old = ab2C(); if(!x) return;
    if(!(await uiConfirm(RF('Retirer {0} de tes abonnés ?', ab2InvNm(x)) + '\n\n' + MSGT('Son lien ne marche plus et tes voyages disparaissent de son téléphone. Tes autres abonnés continuent sans rien faire.')))) return;
    closeSheet(true); cryptShow('🚫 ' + MSGT('Je retire cet abonné…'));
    try {
      const gone = new Set(ab2Devs(x));
      putQuiet([{id:'iv:' + x.code, type:'abinv', trip:'fi:' + x.code, gone:1, code:''}]);   // son téléphone comprend qu’il est retiré
      M.abInv = AI().filter(y=>y !== x); (M.fold = M.fold || []).push({code:x.code, at:Date.now() - 50 * 864e5});   // son lien : effacé du serveur dans 10 jours
      if(old){
        const vis = Object.keys(FT()).filter(t=>FT()[t] === old);
        Object.values(R).forEach(r=>{ if(r && (r.type === 'like' || r.type === 'comment') && /^ft:/.test(r.trip || '') && gone.has(devOfRec(r))) delete R[r.id]; });   // ses ❤️ et commentaires ne suivent pas
        delete M.feedAll; const c = await ab2Make();
        vis.forEach(t=>{ FT()[t] = c; TS()[ftId(t)] = c; });
        Object.values(R).forEach(r=>{ if(r && !r.deleted && /^ft:/.test(r.trip || r.id || '') && vis.includes(String(r.trip || r.id).slice(3))) markDirty(r.id); });   // tout repart, une fois, sur le nouveau fil
        (M.fold = M.fold || []).push({code:old, at:Date.now() - 61 * 864e5}); M.fwipe = (M.fwipe || []).concat([old]); if(M.fup) delete M.fup[old]; M.fq = (M.fq || []).filter(q=>q[0] !== old);
        M.spaces = (M.spaces || []).filter(s=>s.code !== old); Object.keys(TS()).forEach(k=>{ if(TS()[k] === old) delete TS()[k]; });
        vis.forEach(t=>{ try { feedBuild(t); } catch(e){} });
        AI().forEach(y=>ab2InvRec(y, {code:c}));   // chaque autre lien donne le nouveau fil
      }
      persist(); ab2CfgSave();
      try { await syncNow(); feedUpload(); setTimeout(()=>{ try { feedOldWipe(); feedPurge(); pushRegister(true); } catch(e){} }, 3000); } catch(e){}
      setTimeout(()=>{ M.spaces = (M.spaces || []).filter(s=>s.code !== x.code); persist(); }, 60000);
    } finally { cryptHide('🚫 ' + MSGT('Abonné retiré')); }
    shareHub();
  }
  /* ── ➡️ côté abonné ── */
  // un lien d’abonné : il donne le code du fil ; si l’auteur retire quelqu’un, le fil change et mon lien me donne le nouveau
  function ab2InIv(recs, sp){
    const me = devId(), S = (M.subs || {})[sp.of] || null, out = [];
    (recs || []).forEach(r=>{ if(!r) return;
      if(r.type === 'abinv'){ const k = sp.of && S ? S : null;
        if(r.pub && r.mv && r.mv[me]){ const nc = r.mv[me]; sp.real = r.code; if(k && k.iv !== nc) setTimeout(()=>ab2Switch(sp.code, nc, sp.of), 40); return; }   // 🔀 l’auteur m’a donné mon propre lien : je bascule sans rien dire
        if(r.deleted || r.gone || (r.pub && (r.ban || []).includes(me)) || (r.pub && r.closed)){ if(k) k.ban = 1; else sp.ban = 1; return; }
        const ahx = [...(r.hide || []), ...(r.pub ? ((r.hd || {})[me] || []) : [])];
        sp.real = r.code; sp.pub = !!r.pub; sp.ao = Array.isArray(r.only) ? r.only : null; if(k){ k.ah = ahx; k.ao = sp.ao; if(r.owner) k.owner = r.owner; if(avOk(r.oav)) k.oav = r.oav; if(r.code && r.code !== sp.of) setTimeout(()=>ab2Move(sp.code, r.code), 30); }
        sp.owner = r.owner || sp.owner; sp.oav = avOk(r.oav) ? r.oav : sp.oav; sp.ah = ahx; return; }
      if(r.type === 'follower' && !String(r.id).endsWith(':' + me)) return;
      if(r.type !== 'follower') return;
      out.push(r); });
    return out;
  }
  // 🔀 du lien commun vers mon lien personnel : même fil, mêmes réglages ; seul le lien change (rien n’est montré)
  let AB2SW = 0;
  async function ab2Switch(old, nc, c){
    if(AB2SW) return; const S = (M.subs || {})[c]; if(!S || S.gone || S.iv === nc) return; AB2SW = 1;
    try {
      const ok = await ab2Follow(nc, false, true); if(!ok) return;
      const S2 = (M.subs || {})[c] || S; S2.iv = nc;
      const mine = R['fw:' + old + ':' + devId()]; if(mine && !mine.deleted){ putQuiet([Object.assign(clone(mine), {deleted:true})]); try { const o = spaceObj(old); if(o) await syncSpace(o); } catch(e){} }
      Object.keys(R).forEach(id=>{ if(id.includes(':' + old + ':') || id === 'iv:' + old) delete R[id]; }); delete TS()['fi:' + old];
      M.spaces = (M.spaces || []).filter(x=>x.code !== old); persist();
    } catch(e){} finally { AB2SW = 0; } }
  // le fil de l’auteur a changé (il a retiré quelqu’un) : je passe sur le nouveau, sans rien perdre de mes réglages
  async function ab2Move(iv, nc){
    const ivs = spaceObj(iv); if(!ivs) return; const oc = ivs.of; if(!oc || oc === nc) return;
    const S = (M.subs || {})[oc]; if(!S) return;
    M.subs[nc] = Object.assign(S, {t:{}, at:Date.now()}); delete M.subs[oc];
    Object.keys(TS()).forEach(k=>{ if(TS()[k] === oc) delete TS()[k]; }); M.spaces = (M.spaces || []).filter(s=>s.code !== oc);
    ivs.of = nc; const sp = ab2Space(nc, {sub:1, iv}); sp.since = 0; persist();
    try { await syncSpace(sp, true); } catch(e){} refresh();
  }
  // les fiches du fil suivi : ses voyages et leurs ❤️/commentaires ; jamais les voyages que je fais moi-même
  function ab2In(recs, sp){
    const S = ab2Sub(sp.code), out = [];
    (recs || []).forEach(r=>{ if(!r) return;
      if(['follower','fwban','fwhide','abinv','abcfg','trip','profile'].includes(r.type)) return;
      const fid = r.type === 'feedtrip' ? r.id : String(r.trip || '');
      if(/^ft:/.test(fid)){ const t = R[fid.slice(3)]; if(t && t.type === 'trip' && !t.deleted && !t.demo && !t.ro){ if(r.type === 'feedtrip' && !r.deleted) (S.mt = S.mt || {})[r.id] = 1;
        // 👥 un voyage que je fais moi-même : pas de 2e copie du voyage, MAIS ses ❤️ et commentaires (Victoria aime une étape d’Anthony → Claire la voit)
        if((r.type === 'like' || r.type === 'comment') && (t.voyageurs || []).includes(M.me)) out.push(r);
        // 💬 (2026-11-10) … et la publication elle-même (si je ne publie pas ce voyage moi-même) : sans elle, Claire ne pouvait pas ouvrir les commentaires (« Publication en cours… » sans fin)
        else if(r.type === 'feed' && (t.voyageurs || []).includes(M.me) && !FT()[fid.slice(3)]) out.push(r);
        return; } }
      if(r.type === 'feedtrip'){ S.t[r.id] = r.deleted ? 0 : 1; if(!r.deleted && !S.owner && r.owner) S.owner = r.owner; if(!S.oav && avOk(r.oav)) S.oav = r.oav; }
      out.push(r); });
    return out;
  }
  // quels voyages de ce fil je vois : ni cachés par moi, ni cachés pour moi par l’auteur
  function ab2Map(c){
    const S = (M.subs || {})[c]; if(!S) return; const ah = new Set(S.ah || []), ao = S.ao ? new Set(S.ao) : null;   // ao : « seulement ces voyages » (ancien compagnon : le voyage qu’il a fait, pas ceux montrés plus tard)
    Object.keys(S.t || {}).forEach(id=>{ const r = R[id], ok = S.t[id] && r && !r.deleted && !S.hide[id] && !ah.has(id) && (!ao || ao.has(id));
      if(ok){ if(!TS()[id] || !spaceObj(TS()[id])) TS()[id] = c; } else if(TS()[id] === c) delete TS()[id]; });
    if(S.ban) setTimeout(()=>ab2Gone(c, 'ban'), 50);
  }
  const ab2IvOf = c => { const S = (M.subs || {})[c]; return S && S.iv; };
  async function ab2Follow(code, web, q){
    try { ab2Reset(); } catch(e){}   // l’ancien système part AVANT, jamais après (il effacerait ce qu’on vient de faire)
    code = String(code || '').trim().toUpperCase(); if(code.length < 8){ alert(MSGT('Code trop court.')); return; }
    if(AI().some(x=>x.code === code) || code === M.feedAll){ toast('👀 ' + MSGT('C’est ton propre lien abonnés.')); return shareHub(); }
    if(!web && !q && !(await ab2Name())) return;
    const had = (M.spaces || []).some(s=>s.code === code), iv = ab2Space(code, {ivme:1}); iv.since = 0; TS()['fi:' + code] = code;
    if(!q) toast('📡 ' + MSGT('Connexion…')); await syncSpace(iv, true);
    const drop = () => { if(!had) M.spaces = (M.spaces || []).filter(x=>x.code !== code); delete TS()['fi:' + code]; persist(); };
    if(iv.err){ drop(); alert(iv.net ? '📴 ' + netMsg() : '⚠️ ' + iv.err); return; }
    if(iv.ban){ drop(); if(!q) alert(MSGT('Ce lien a été retiré par son auteur.')); return; }
    if(!iv.real){ drop(); alert(MSGT('Aucun voyage publié avec ce code.') + '\n\n' + MSGT('Demande-lui de te renvoyer son lien abonnés actuel.')); return; }
    // 🔗 lien commun : l’auteur ne sait pas qui arrive → le prénom est obligatoire (sinon il ne verrait que « Un proche »)
    if(iv.pub && !myName()){
      let n = ''; while(!n){ const v = await uiPrompt(MSGT('Ton prénom ? Il est obligatoire pour suivre avec un lien commun : c’est comme ça que la personne saura qui tu es.'), ''); if(v === null){ drop(); return; } n = String(v).trim().slice(0, 40); }
      M.followName = n; persist(); }
    const c = iv.real, S = ab2Sub(c), prevIv = S.iv && S.iv !== code && !S.gone && spaceObj(S.iv) ? S.iv : ''; delete S.ban; delete S.gone; S.iv = prevIv || code;   // déjà abonné par un autre lien : on garde le sien
    S.ah = iv.ah || []; S.ao = iv.ao || null; if(iv.owner) S.owner = iv.owner; if(avOk(iv.oav)) S.oav = iv.oav;   // 🩹 cette ligne était passée en commentaire par erreur : les voyages cachés à cet abonné s’affichaient quand même à l’ouverture du lien
    iv.of = c; const sp = ab2Space(c, {sub:1, iv:code}); sp.since = 0; await syncSpace(sp, true);
    if(sp.err){ alert(sp.net ? '📴 ' + netMsg() : '⚠️ ' + sp.err); return; }
    if(web) M.webCode = c;
    let pk; try { pk = (await fKey()).pub; } catch(e){}
    const fts = Object.keys(S.t).filter(id=>S.t[id] && R[id] && !R[id].deleted);
    const fw = {id:'fw:' + code + ':' + devId(), type:'follower', trip:'fi:' + code, code, pid:fwPid(), who:myName() || MSGT('Un proche'), pk}; if(myAv()) fw.av = myAv();
    if(!R[fw.id] || R[fw.id].deleted){ putQuiet([fw]); if(fts[0]) try { socialPush(fts[0], 'follow', ''); } catch(e){} }
    persist(); syncNow(); if(q) return true; closeSheet(true);
    if(prevIv && !q){ alert(RF('Tu suis déjà {0} : rien ne change pour toi.', S.owner || '?') + '\n\n' + MSGT('Ce lien était sans doute destiné à quelqu’un d’autre : préviens la personne qui te l’a envoyé.')); return; }
    if(!fts.length){ alert(MSGT('Tu as déjà tous ces voyages : tu les fais en compagnon. Tu verras ici les prochains voyages publiés que tu ne fais pas.')); return shareHub(); }
    const vis = fts.filter(id=>TS()[id] === c);
    if(vis.length === 1 || (web && vis.length)) feedView(vis[0]); else shareHub();   // 🌐 sans l’appli : directement le voyage
    toast('👀 ' + RF('Tu suis {0}', S.owner || '?'));
  }
  // ne plus suivre quelqu’un (ou retiré par lui) : ses liens quittent ce téléphone, rien ne les ramène sauf rouvrir mon lien
  async function ab2Gone(c, why){
    const S = (M.subs || {})[c]; if(!S || S.gone) return; S.gone = 1; const iv = S.iv, ivs = iv && spaceObj(iv), mine = iv && R['fw:' + iv + ':' + devId()];
    if(why !== 'ban' && ivs && mine && !mine.deleted){ putQuiet([Object.assign(clone(mine), {deleted:true})]); try { await syncSpace(ivs); } catch(e){} }   // l’auteur voit que je ne suis plus là
    Object.keys(TS()).forEach(k=>{ if(TS()[k] === c || (iv && TS()[k] === iv)){ Object.values(R).forEach(r=>{ if(r && r.type !== 'trip' && (r.trip === k || r.id === k)) delete R[r.id]; }); delete TS()[k]; } });
    Object.keys(S.t || {}).forEach(id=>{ if(R[id] && R[id].type === 'feedtrip' && !TS()[id]) delete R[id]; });
    if(iv) Object.keys(R).forEach(id=>{ if(id.includes(':' + iv + ':') || id === 'iv:' + iv) delete R[id]; });
    M.spaces = (M.spaces || []).filter(x=>x.code !== c && x.code !== iv); delete M.subs[c]; if(M.webCode === c) delete M.webCode;
    persist(); try { feedClose(); } catch(e){} refresh();
    if(why === 'ban') alert(RF('{0} t’a retiré de ses abonnés : ses voyages ne sont plus sur ce téléphone.', S.owner || '?'));
    else toast('🚫 ' + RF('Tu ne suis plus {0}', S.owner || '?'));
    try { if(document.querySelector('#v-sheet-bg .sp2')){ shBack = true; shareHub(); } } catch(e){}
  }
  async function ab2Unfollow(c){
    const S = (M.subs || {})[c]; if(!S) return;
    if(!(await uiConfirm(RF('Ne plus suivre {0} ?', S.owner || '?') + '\n\n' + MSGT('Ses voyages disparaissent de ce téléphone. Il faudra rouvrir son lien pour le suivre à nouveau.')))) return;
    closeSheet(true); await ab2Gone(c, 'me');
  }
  function ab2SubAll(c, on){ const S = (M.subs || {})[c]; if(!S) return; S.hide = {}; if(!on) ab2SubTrips(c).forEach(f=>{ S.hide[f.id] = 1; }); ab2Map(c); persist(); ab2Repaint(); }
  function ab2SubHide(c, id){ const S = (M.subs || {})[c]; if(!S) return; if(S.hide[id]) delete S.hide[id]; else S.hide[id] = 1; ab2Map(c); persist(); ab2Repaint(); }
  const ab2Subs = () => Object.entries(M.subs || {}).filter(([c, S])=>!S.gone && spaceObj(c));
  const ab2SubTrips = c => { const S = (M.subs || {})[c] || {}, ah = new Set(S.ah || []), ao = S.ao ? new Set(S.ao) : null; return Object.keys(S.t || {}).filter(id=>S.t[id] && R[id] && !R[id].deleted && !ah.has(id) && (!ao || ao.has(id))).map(id=>R[id]).sort((a, b)=>(b.debut || '').localeCompare(a.debut || '')); };
  function ab2SuisHTML(){
    const L = ab2Subs(), lv = L.filter(([c])=>ab2SubTrips(c).some(f=>TS()[f.id] === c && tripPhase(f) === 'live'));
    return `<div class="sp2-sec">${SVG_ME}<b>${esc(MSGT('Mes abonnements'))}</b>${spLive(lv.map(([, S])=>S.owner || '?'))}<br><small>(${esc(MSGT('ceux que je suis'))})</small></div>
      ${L.length ? L.map(([c, S])=>{ const ts = ab2SubTrips(c), on = ts.filter(f=>TS()[f.id] && !S.hide[f.id]), nh = ts.filter(f=>S.hide[f.id]).length, fids = new Set(on.map(f=>f.id)), nm = S.owner || '?', live = on.some(f=>tripPhase(f) === 'live');
          const ph = list('feed', x=>fids.has(x.trip) && (x.photos || []).length).sort((a, b)=>(b.date || '').localeCompare(a.date || '')).flatMap(x=>x.photos.map(p=>[p, x.trip])).slice(0, 3);
          return `<div class="sp2-card sp2-cl" onclick="CV.ab2SubSheet('${ja(c)}')"><div class="sp2-ch">${avTag(avOk(S.oav) ? S.oav : '', nm, '#3b82f6', 'av-xl')}<div class="sp2-cb"><div class="sp2-ct"><b data-notr>${esc(nm)}</b>${live ? `<span class="sp2-lv">● ${esc(MSGT('en voyage'))}</span>` : ''}<button type="button" class="sp2-fol" onclick="event.stopPropagation();CV.ab2SubSheet('${ja(c)}')">${esc(MSGT('Suivi(e)'))} ›</button></div>
            <small class="sp2-cn">${esc(RF('{0} voyage(s) suivi(s)', on.length))}${nh ? ' · 🙈 ' + esc(RF('{0} masqué(s)', nh)) : ''}</small>
            <div class="sp2-ph">${ph.length ? ph.map(([p, tr])=>`<button type="button" onclick="event.stopPropagation();CV.feedView('${ja(tr)}')"><img data-ph="${esc(p)}.t" alt=""></button>`).join('') : `<button type="button" class="sp2-ph0" onclick="event.stopPropagation();CV.ab2SubSheet('${ja(c)}')">${esc(MSGT('Voir ses voyages'))} ›</button>`}</div></div></div></div>`; }).join('')
        : `<div class="sp2-empty">${esc(MSGT('Tu ne suis personne pour l’instant.'))}</div>`}
      <div class="sp2-pills"><button type="button" class="soft" onclick="CV.followSheet()">➕ ${esc(MSGT('Suivre quelqu’un avec son code'))}</button></div>`;
  }
  // ➡️ une personne que je suis : ses voyages, j’allume ceux que je veux voir
  function ab2SubSheet(c){
    const S = (M.subs || {})[c]; if(!S) return shareHub(); const ts = ab2SubTrips(c), nm = S.owner || '?', nmt = Object.keys(S.mt || {}).length;
    openSheet(`<div class="sp2" data-ab2="sub:${esc(c)}"><div class="sp2-top sp2-top2">${avTag(avOk(S.oav) ? S.oav : '', nm, '#3b82f6', 'av-xl')}<h2 data-notr>${esc(nm)}</h2></div><div class="sp2-body">
      <div class="sp2-blk"><div class="sp2-sec">👁️ <b>${esc(MSGT('Ses voyages : choisis ce que tu vois'))}</b></div>
      ${ts.length > 1 ? `<div class="sp2-allr"><button type="button" onclick="CV.ab2SubAll('${ja(c)}', true)">☑️ ${esc(MSGT('Tout cocher'))}</button><button type="button" onclick="CV.ab2SubAll('${ja(c)}', false)">⬜ ${esc(MSGT('Tout décocher'))}</button></div>` : ''}
      ${ts.map(f=>{ const on = !S.hide[f.id], live = tripPhase(f) === 'live';
        return `<div class="sp2-sr${on ? '' : ' off'}"><button type="button" class="sp2-tc"${on ? ` onclick="CV.feedView('${ja(f.id)}')"` : ''}>${spCov(f)}</button><div class="sp2-sb"><b data-notr>${esc(f.titre || '?')}</b><small>${esc(tripDates(f))}${live ? ` · <span class="sp2-lv">● ${esc(MSGT('en voyage'))}</span>` : ''}</small><small>${on && TS()[f.id] && TS()[f.id] !== c ? '👀 ' + esc(RF('Déjà suivi chez {0}', ((M.subs || {})[TS()[f.id]] || {}).owner || '?')) : on ? '👀 ' + esc(MSGT('Je le vois')) : '🙈 ' + esc(MSGT('Masqué'))}</small></div>${ab2Sw(on, `CV.ab2SubHide('${ja(c)}','${ja(f.id)}')`, f.titre)}</div>`; }).join('') || `<div class="sp2-empty">${esc(MSGT('Aucun voyage pour l’instant.'))}</div>`}
      ${nmt ? `<div class="sp2-empty">🧳 ${esc(RF('{0} voyage(s) que tu fais avec lui en compagnon : déjà en entier dans tes voyages.', nmt))}</div>` : ''}</div>
      ${(()=>{ const L = ab2SubMates(c); if(!L.length) return ''; const asked = M.abReq || {};
        return `<div class="sp2-blk"><div class="sp2-sec">🤝 <b>${esc(MSGT('Ses compagnons de voyage'))}</b></div><div class="sp2-empty">${esc(MSGT('Demande-leur de les suivre aussi : ils acceptent ou non.'))}</div>
          ${L.map(m=>{ const k = m.dev || m.pid; return `<div class="sp2-row"><b data-notr>${esc(m.nom)}</b>${asked[k] ? `<small class="sp2-wait">🙋 ${esc(MSGT('demandé'))}</small>` : `<button type="button" class="sp2-fol" onclick="CV.ab2ReqFw('${ja(c)}','${ja(k)}')">🙋 ${esc(MSGT('Demander à suivre'))}</button>`}</div>`; }).join('')}</div>`; })()}
      <div class="sp2-pills"><button type="button" class="danger" onclick="CV.ab2Unfollow('${ja(c)}')">🚫 ${esc(MSGT('Ne plus suivre cette personne'))}</button></div></div></div>`);
  }
  var APPAPI = {ab2Common, ab2AskFw, ab2ReqFw, nhWho, ab2TripsAll, ab2FwAll, ab2SubAll, ab2Invite, ab2TripsSheet, ab2TripSet, ab2Send, ab2Rename, ab2FwSheet, ab2FwHide, ab2FwDel, ab2SubSheet, ab2SubHide, ab2Unfollow, ab2Follow, vmOpen, vmClose, vmAway, vmFit, vmSouv, vmBase, mapPub, mapNow, fmOpen, fmClose, fmFit, fmBase, vmZoom, vmDays, apMode, themeSet, themeToggle, rotSheet, rotGo, rotJoin, rotLost, devBlock, devSheet, webChoiceApp, webChoiceWeb, acctSheet, acctNew, acctLater, acctStart, acctVerify, acctOk, acctMax, acctDel, acctKit, acctKitGo, acctLogin, acctResume, acctGateSheet, codeMail, profDedupe, guideLater, fwForget, spSuisSheet, feedRefollow, spFw, spAbAdd, spCompAdd, spCompDel, spCompSheet, shMoreTog, bkCopy, hoodSheet, avPick, avDel, spAll, spTrips, spTripsSave, spTripOff, spMe, stExport, scrOpen, scrClose, rtSheet, rtSet, rtTxt, rtAll, refreshNow:()=>refresh(), dfGo, dfOk, vjOpen, vjTog, vjStop, vjSave, lgSay, lgAll, lgFx, omapAuto, cdFm, chkEach, pollWin, stEdMus, stEdPh, stEdAll, stEdClose, stEdGo, annivShow, storyTrip, tripFinal, storyOpen, stClose, stRestart, wallOpen, wallClose, wallShow, pcOpen, pcPick, pcShow, pcFlip, pcClose, pcShare, pcSend, wlcPost, wlcClose, wlcShow, wzOrder, wzOrdApply, tcfOrd, tcfBack, tcfGo, tcfDep, guideGo, guideNext, guideSheet, guideStop, guideTr, guideExp, guideHotel, guideBook, guideFin, guideEdit, guideResume, guideVisits, gdMan, gdManX, gdManDay, gdManAdd, avDone, swStopRg, bkFill, bkLater, bkImp, bkMan, bkSave, bkNo, askWhoTog, trMis, prep3d, prep3dClose, p3Base, p3Fit, wzCk, suggOpen, suggKeep, suggDrop, suggGo, suggMore, expOpen, expKeep, expDrop, filTog, filFull, filSkip, finMark, startHide, bilanClose, storyTrip, feedPublish, feedShareLink, installSheet, cloudSheet, wzCountry, ariTog, ariFull, ariSkip, ariBook, ariFm, liveOpen, liveClose, liveBase, liveFit, liveFocus, liveOrbit, xferApply, fwNickAsk, fwNameSave, feedShareOne, planExplore, pendAgain, pendDrop, inviteAnswer, followInviteGo, feedShareLink, shareQr, qrScan, qrStop, qrPhoto, explore, exploreCity, expOpen, expShut, expAdd, expClose, livretTry, livretJump, abPick, abSend, todaySee, todaySeeAdd, todaySeeGo, codeKeep, cloudFeedCut, folFilter, shTab, impPickCam, tripLeaveGo, packSheet, packSave, packRemoveTrip, packDel, fwTripsSheet, fwTripsSave, fwHideOne, feedMorePh, cloudLeave, cloudSheet, cloudPick, cloudJoinMain, cloudTrip, cloudInvite, cloudShareAll, recapGo, gateCopy, obPaste, pushTog, pushKind, pushQuiet, pushTest, omapSheet, omapGo, omapOpen, omapClose, omapDel, omapFly, plInfo, tjOpen, tjClose, objAsk, budTog, syncSheet, syncMainNew, syncMainJoin, tripInviteNow, feedPublish, feedStop, followGo, followSheet, webCreate, webBack, webCopy, webCopyCode, feedLike, feedComment, feedTogC, geoToggle, carnetToggle, evToggle, glassToggle, bigToggle, cmEdit, feedLikers, feedCmFocus, feedReply, cmMenu, cmDel, userHide, userBlock, fwBlock, feedReset, ugcReport, postMenu, feedUnfollow, feedView, feedClose, souvComments, fxPlay, filmTrack, worldTrip, coverSet, flyover, flyoverRec, cineStop, cineSet, cineStep, cineSteps, cineOpen, cineGo, cinePreX, cinePhs, cinePh, prepTog, momentClose, boardShow, evePhotos, eveSave, eveSkip, annivGo, annivSkip, worldNew, worldPlan, worldPlanUndo, worldPlanStop, worldPlanGo, filmMute, nhGo, nhCopy, autoPhotoPick, autoPhotoRead, autoPhotoGo, filmOpen, filmClose, yearFilm, yearFilmGo, memberInvite, memberSend, memberRevoke, memberShowId, memberLeave, deviceAdd, giftAsk, planSheet, planBuy, planPortal, quotaLoad, _quotaNag:()=>quotaNag(), _tf:d=>transferHTML(d), trDupFix, wrapped, wrappedShare, wrappedSave, wrSet, wrTog, wrReset, wrPick, wrPickX, wrPickStep, wrPickMore, wrPickSet, wrSlotX, filmPlay, filmRestart, filmSave, setLang, pollPin, navTo, plusGo, coffeeGo, destSet, serverWipeSheet, serverWipeTrip, cloudTripOff, serverWipe, coffeeLater, photoResend, forceUpdate, setupGo, setCur};


  /* ══════════ 🧭 Pont Carnet ⇄ Vezoria (version test de Vezoria dans le carnet, même stockage) ══════════
     Le carnet et Vezoria partagent la même adresse : Vezoria est servie sous /vezoria/ et lit les mêmes voyages
     (stockage carnet_v2 + photos carnet-photos) et le même serveur (D1 + R2 du carnet, mêmes codes). */
  const VZ_SIDE = 'vezoria', VZ_MAIL = 'contact.vezoria@icloud.com';
  const VZ_ON = VZ_SIDE === 'carnet' ? /^https?:/.test(location.protocol) : !!window.VZ_HOST;
  const VZ_T = x => (window.I18N && I18N.msg ? I18N.msg(x) : x);
  const VZ_NEW = ['🔔 Des notifications quand tes compagnons ajoutent une dépense, un souvenir ou un sondage, et des rappels avant le départ.','📥 L’import de tes voyages depuis une autre appli de carnet de voyage (le fichier de données qu’elle t’envoie).','🌍 14 langues (français, anglais, espagnol, allemand, italien, portugais, néerlandais, russe, turc, arabe, hindi, chinois, japonais, coréen) et la devise de ton choix.','👀 Des abonnés : tes proches suivent le voyage (photos en vignettes et récits), mettent des ❤️ et des commentaires.','👥 Une fenêtre « Abonnés & partages », avec une pastille dès qu’il y a du nouveau.','🛰️ Ta route sur la carte pour tes abonnés, seulement si tu l’actives.','🚩 Signaler, bloquer ou masquer quelqu’un, et créer un nouveau lien abonné.','🎬 Le film du voyage en musique (11 musiques), avec la carte zoomée région par région.','📷 « Ranger mes photos » : les photos se placent toutes seules au bon jour et au bon endroit.','🗺️ Le programme et le voyage en cours sur la carte.','💱 La conversion des devises dans les dépenses et les tickets.','🎨 Des couleurs pour chaque moment : préparation, voyage en cours, souvenirs.','☁️ Une synchro plus économe, voyage par voyage, avec l’état de l’envoi en un coup d’œil.','🔐 Un chiffrement renforcé dans la version finale.','🎓 Un nouveau tuto vidéo de 3 minutes.'], VZ_OUT = ['🛫 Escale (recherche de vols, Radar des prix) : pour respecter les règles de Google Play, Escale ne sera pas dans la version finale de Vezoria. Le module fait appel à trop de services extérieurs pour être publié.'], VZ_DATA = ['Cette version test garde le stockage du carnet : même serveur, mêmes codes. Tes compagnons restés sur le carnet voient ce que tu fais dans Vezoria, et inversement.','Avant la première ouverture de Vezoria, une copie de sauvegarde de ton carnet est gardée sur ce téléphone.','📱 Vezoria sera sur Google Play (Android) et en appli web sur iPhone.'];
  const vzSrc = () => { if(VZ_SIDE === 'carnet') return PUBLIC ? 'carnet public' : 'carnet perso'; try { return (JSON.parse(localStorage.getItem('vz_host') || '{}').src === 'perso' ? 'carnet perso' : 'carnet public'); } catch(e){ return 'carnet'; } };
  if(VZ_SIDE === 'carnet') try { localStorage.setItem('vz_host', JSON.stringify({e2e: !!E2E, src: PUBLIC ? 'public' : 'perso'})); } catch(e){}
  const vzHideK = VZ_SIDE === 'carnet' ? 'vzHideC' : 'vzHideV';
  function vzBandHTML(){
    return VZ_SIDE === 'carnet'
      ? `<div class="vz-band"><span class="vz-i">🧭</span><span class="vz-t"><b>Vezoria arrive !</b><small>La nouvelle version de ce carnet, bientôt sur Google Play. Essaie-la avec tes voyages déjà remplis, puis donne ton avis.</small></span>
          <span class="vz-a"><button type="button" class="vz-go" onclick="CV.vzGo()">🧭 Essayer Vezoria</button><button type="button" onclick="CV.vzNews()">📋 Ce qui change</button><button type="button" onclick="CV.vzAvis()">⭐ Mon avis</button><button type="button" class="vz-x" onclick="CV.vzHide()" aria-label="Masquer">✕</button></span></div>`
      : `<div class="vz-band"><span class="vz-i">🧪</span><span class="vz-t"><b>Vezoria · version test</b><small>Tes voyages du carnet sont déjà là. Ce que tu changes ici apparaît aussi dans le carnet.</small></span>
          <span class="vz-a"><button type="button" class="vz-go" onclick="CV.vzGo()">↩︎ Retour au carnet</button><button type="button" onclick="CV.vzNews()">📋 Ce qui change</button><button type="button" onclick="CV.vzAvis()">⭐ Mon avis</button><button type="button" class="vz-x" onclick="CV.vzHide()" aria-label="Masquer">✕</button></span></div>`;
  }
  function vzPaint(){
    const el = document.getElementById('vz-band'); if(!el) return;
    const h = VZ_ON && !M[vzHideK] ? vzBandHTML() : ''; if(el.dataset.h !== h){ el.dataset.h = h; el.innerHTML = h; }
    // bouton « retour au carnet » dans l'en-tête : seulement si l'encart est masqué (l'en-tête est déjà plein), en petit rond
    if(VZ_SIDE === 'vezoria' && VZ_ON){
      const cur = document.getElementById('vz-back');
      if(!M[vzHideK]){ if(cur) cur.remove(); }
      else if(!cur){ const b = document.querySelector('.hero-btns'); if(b){ const a = document.createElement('a'); a.id = 'vz-back'; a.className = 'cv-lock vz-back'; a.href = '/?app=carnet'; a.textContent = '↩︎'; a.setAttribute('aria-label', 'Retour au carnet'); a.title = 'Retour au carnet'; const lk = document.getElementById('cv-lock'); lk ? lk.before(a) : b.append(a); } }
    }
  }
  function vzGo(){ try { persist(); } catch(e){} location.href = VZ_SIDE === 'carnet' ? '/vezoria/' : '/?app=carnet'; }
  function vzHide(){ M[vzHideK] = 1; persist(); vzPaint(); toast(VZ_SIDE === 'carnet' ? VZ_T('🧭 Vezoria reste accessible avec le bouton en haut') : VZ_T('↩︎ Le carnet reste accessible avec le bouton en haut')); }
  function vzNews(){
    const li = a => a.map(s=>`<li>${esc(s)}</li>`).join('');
    const back = VZ_SIDE === 'carnet' && (()=>{ try { return !!localStorage.getItem('vz_bk'); } catch(e){ return false; } })();
    openSheet(`<h2>📋 Du carnet à Vezoria</h2>
      <p class="v-sum-small">Le carnet est la première esquisse de Vezoria. C’est grâce à vos critiques sur le carnet que Vezoria avance : continuez à tester et à dire ce que vous en pensez.</p>
      <h3>✨ Nouveau dans Vezoria</h3><ul class="vz-ul">${li(VZ_NEW)}</ul>
      <h3>➖ Retiré</h3><ul class="vz-ul">${li(VZ_OUT)}</ul>
      <h3>💾 Tes données</h3><ul class="vz-ul">${li(VZ_DATA)}</ul>
      <div class="v-actions">${VZ_SIDE === 'carnet' ? `<button type="button" class="v-btn" onclick="CV.vzGo()">🧭 Essayer Vezoria</button>` : `<button type="button" class="v-btn" onclick="CV.vzGo()">↩︎ Retour au carnet</button>`}
        <button type="button" class="v-btn sec" onclick="CV.vzAvis()">⭐ Donner mon avis</button>
        ${back ? `<button type="button" class="v-btn sec" onclick="CV.vzRestore()">↩︎ Remettre le carnet comme avant Vezoria</button>` : ''}
        <button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  const VZS = {c:0, v:0};
  const vzStars = k => `<div class="vz-st" id="vzs-${k}">${[1,2,3,4,5].map(n=>`<button type="button" class="${VZS[k] >= n ? 'on' : ''}" onclick="CV.vzStar('${ja(k)}',${n})" aria-label="${n} / 5">★</button>`).join('')}</div>`;
  function vzStar(k, n){ VZS[k] = n; const el = document.getElementById('vzs-' + k); if(el) el.outerHTML = vzStars(k); }
  function vzAvis(){
    openSheet(`<h2>⭐ Ton avis</h2><p class="v-sum-small">Compare le carnet et Vezoria : tes critiques aident à construire la version finale.</p>
      <div class="v-f"><label>Ta note pour le carnet</label>${vzStars('c')}</div>
      <div class="v-f"><label>Ta note pour Vezoria</label>${vzStars('v')}</div>
      <div class="v-f"><label>Ce que tu préfères dans Vezoria</label><textarea class="v-in" id="vz-p" rows="3"></textarea></div>
      <div class="v-f"><label>Ce qui manque ou ne marche pas</label><textarea class="v-in" id="vz-m" rows="3"></textarea></div>
      <p class="v-sum-small">Ton avis part par e-mail à l’éditeur : rien n’est envoyé sans toi.</p>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.vzSend()">📨 Envoyer mon avis</button><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  function vzSend(){
    const g = id => ((document.getElementById(id) || {}).value || '').trim(), p = g('vz-p'), m = g('vz-m');
    if(!VZS.c && !VZS.v && !p && !m){ alert(VZ_T('Mets au moins une note ou un commentaire.')); return; }
    const ua = navigator.userAgent, dev = /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/i.test(ua) ? 'Android' : 'ordinateur';
    const body = ['Avis sur Vezoria (version test)', '', 'Note du carnet : ' + (VZS.c ? VZS.c + '/5' : '—'), 'Note de Vezoria : ' + (VZS.v ? VZS.v + '/5' : '—'), '',
      'Ce que je préfère dans Vezoria :', p || '—', '', 'Ce qui manque ou ne marche pas :', m || '—', '', 'Écrit depuis ' + (VZ_SIDE === 'carnet' ? 'le carnet' : 'Vezoria') + ' (' + vzSrc() + ') · ' + dev].join('\n');
    location.href = 'mailto:' + VZ_MAIL + '?subject=' + encodeURIComponent('Vezoria : mon avis (version test)') + '&body=' + encodeURIComponent(body);
    closeSheet(true); setTimeout(()=>toast(VZ_T('📨 Merci ! Envoie le mail pour finir.')), 400);
  }
  // Sauvegarde du carnet avant la toute première ouverture de Vezoria (IndexedDB, pour ne pas remplir le stockage du carnet)
  const vzDB = () => new Promise((res, rej)=>{ const q = indexedDB.open('vezoria-sauvegarde', 1); q.onupgradeneeded = () => q.result.createObjectStore('b', {keyPath:'id'}); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  async function vzBackup(){
    const raw = window.VZ_RAW0; if(!raw) return; window.VZ_RAW0 = null;
    try { const db = await vzDB(); await new Promise((res, rej)=>{ const tx = db.transaction('b', 'readwrite'); tx.objectStore('b').put({id:'carnet_v2', at:Date.now(), raw}); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); localStorage.setItem('vz_bk', String(Date.now())); } catch(e){}
  }
  async function vzRestore(){
    let o = null; try { const db = await vzDB(); o = await new Promise(res=>{ const q = db.transaction('b').objectStore('b').get('carnet_v2'); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); } catch(e){}
    if(!o || !o.raw){ alert('Aucune sauvegarde trouvée sur ce téléphone.'); return; }
    if(!(await uiConfirm(`Remettre le carnet tel qu’il était le ${new Date(o.at).toLocaleString('fr-FR')}, avant la première ouverture de Vezoria ?\n\nTout ce qui a été ajouté ou modifié depuis sur ce téléphone sera perdu (les photos restent). Ce qui est déjà sur le serveur reviendra à la prochaine synchro.`))) return;
    persistOff = true; clearTimeout(persistT);   // la sauvegarde remise ne doit pas être écrasée par le carnet en mémoire
    try { localStorage.setItem(KEY, o.raw); } catch(e){ persistOff = false; alert('Restauration impossible : ' + e.message); return; }
    location.reload();
  }
  if(VZ_SIDE === 'vezoria' && VZ_ON) setTimeout(vzBackup, 50);
  setTimeout(vzPaint, 0);
  var VZAPI = {vzGo, vzHide, vzNews, vzAvis, vzStar, vzSend, vzRestore, vzPaint};

  const RF = (t, ...a) => MSGT(t).replace(/\{(\d)\}/g, (m, k)=>a[+k] == null ? '' : a[+k]);   // phrase traduite d’un bloc, valeurs insérées
  /* ══════════ 👥 PROFILS EN DOUBLE ══════════
     Deux profils au même prénom (ex. un profil recréé par erreur) : on en garde un, toutes les fiches de l’autre
     (voyageurs, auteur, payeur, cases cochées…) passent sur celui gardé, puis le profil en trop est supprimé partout. */
  const nomKey = p => String((p && p.nom) || '').trim().toLocaleLowerCase();
  function dupGroups(){ const g = {}; profiles().forEach(p=>{ const k = nomKey(p); if(k) (g[k] = g[k] || []).push(p); }); return Object.values(g).filter(a=>a.length > 1); }
  function refCount(id){ const q = '"' + id + '"'; let n = 0; Object.values(R).forEach(r=>{ if(r && !r.deleted && r.id !== id) n += JSON.stringify(r).split(q).length - 1; }); return n; }
  function mergeSheet(){
    const G = dupGroups();
    if(!G.length){ uiAlert(MSGT('Aucun profil en double.')); return; }
    openSheet(`<h2>👥 ${esc(MSGT('Profils en double'))}</h2>
      <div class="v-sum-small" style="margin-bottom:10px">${esc(MSGT('Choisis le profil à garder : tout ce qui est au nom de l’autre passe sur lui, puis le profil en trop est supprimé, chez tout le monde.'))}</div>
      ${G.map((g, i)=>{ const c = g.map(p=>[p, refCount(p.id)]).sort((a, b)=>(b[1] - a[1]) || ((a[0].createdAt || 0) - (b[0].createdAt || 0)));
        return `<div class="v-box" style="margin:0 0 10px">${c.map(([p, n], j)=>`<label class="cv-checkline"><input type="radio" name="mg-${i}" class="mg-k" data-g="${i}" value="${esc(p.id)}"${j === 0 ? ' checked' : ''}> ${pchip(p.id)} <small data-notr>${n} · ${esc(fdate(new Date(p.createdAt || 0).toISOString().slice(0, 10)) || '')}${p.id === M.me ? ' · ✓' : ''}</small></label>`).join('')}</div>`; }).join('')}
      <div id="mg-msg" class="v-sum-small" style="margin:6px 0" data-notr></div>
      <div class="v-actions"><button type="button" class="v-btn" id="mg-go" onclick="CV.mergeGo()">👥 ${esc(MSGT('Fusionner'))}</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  async function mergeGo(){
    const G = dupGroups(), map = {};
    G.forEach((g, i)=>{ const k = (document.querySelector('.mg-k[data-g="' + i + '"]:checked') || {}).value; if(!k) return; g.forEach(p=>{ if(p.id !== k) map[p.id] = k; }); });
    const drops = Object.keys(map); if(!drops.length) return;
    if(!(await uiConfirm(RF('{0} profil(s) en trop vont être fusionnés puis supprimés. Continuer ?', drops.length)))) return;
    const btn = document.getElementById('mg-go'); if(btn) btn.disabled = true;
    try {
      if(map[M.me]) M.me = map[M.me];
      if(map[M.who]) M.who = map[M.who];
      const flat = a => a.every(x=>x === null || typeof x !== 'object') ? [...new Set(a)] : a;
      const sw = v => typeof v === 'string' ? (map[v] || v) : Array.isArray(v) ? flat(v.map(sw)) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x])=>[map[k] || k, sw(x)])) : v;
      const out = [];
      Object.values(R).forEach(r=>{
        if(!r || !r.id || r.demo || map[r.id] || /^ft:/.test(r.trip || '') || r.type === 'feedtrip' || !targets(r).length) return;
        const before = JSON.stringify(r), c = sw(clone(r)); if(JSON.stringify(c) !== before) out.push(c); });
      if(R[M.me] && R[M.me].dev !== devId()) out.push(Object.assign(clone(R[M.me]), {dev:devId()}));
      for(let i = 0; i < out.length; i += 400){ const m = document.getElementById('mg-msg'); if(m) m.textContent = '👥 ' + RF('Fiches mises à jour : {0}/{1}', Math.min(i + 400, out.length), out.length); putQuiet(out.slice(i, i + 400)); await new Promise(r=>setTimeout(r, 0)); }
      // le profil en trop est effacé partout où il était (carnet principal + chaque voyage partagé)
      const feeds = new Set(Object.values(FT()));
      drops.forEach(d=>{ const t = Object.assign(clone(R[d]), {deleted:true}); stamp(t); R[d] = t;
        if(M.sync.on && M.sync.code && !M.dirty.includes(d)) M.dirty.push(d);
        (M.spaces || []).forEach(sp=>{ if(sp.mate || feeds.has(sp.code)) return; sp.dirty = sp.dirty || []; if(!sp.dirty.includes(d)) sp.dirty.push(d); }); });
      persist(); closeSheet(true); refresh();
      toast('✅ ' + RF('{0} fiche(s) mises à jour, profil en trop supprimé.', out.length));
      try { await syncNow(true); } catch(e){}
    } catch(e){ const m = document.getElementById('mg-msg'); if(m) m.textContent = '⚠️ ' + (e.message || e); if(btn) btn.disabled = false; }
  }
  /* ══════════ 🧹 VOYAGES ARRIVÉS PAR ERREUR ══════════
     Ce téléphone a reçu des voyages qui ne sont pas pour lui (carnet entier rejoint au lieu d’un voyage).
     On coche ceux à garder ; les autres sont retirés de CE téléphone seulement : rien n’est envoyé au serveur,
     rien ne disparaît chez les autres, et ils ne reviennent pas à la synchro suivante. Réversible. */
  function hideSheet(){
    const L = trips().filter(t=>!t.demo && !t.deleted).sort((a, b)=>(b.debut || '').localeCompare(a.debut || ''));
    const nH = Object.keys(M.hide || {}).length;
    openSheet(`<h2>🧹 ${esc(MSGT('Voyages arrivés par erreur'))}</h2>
      <div class="v-sum-small" style="margin-bottom:8px">${esc(MSGT('Coche les voyages à GARDER sur ce téléphone. Les autres sont retirés d’ici seulement : rien n’est effacé chez les autres ni sur le serveur.'))}</div>
      <div id="hd-l">${L.map(t=>`<label class="cv-checkline"><input type="checkbox" class="hd-k" value="${esc(t.id)}"> <span data-notr>${esc(t.titre || '')}</span> <small>${esc(fdate(t.debut || '') || '')}</small></label>`).join('')}</div>
      <div id="hd-msg" class="v-sum-small" style="margin:8px 0" data-notr></div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.hideGo()">🧹 ${esc(MSGT('Retirer les autres'))}</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>
      ${nH ? `<button type="button" class="v-btn sec" style="margin-top:10px" onclick="CV.hideUndo()">↩️ ${esc(RF('Faire revenir les {0} voyage(s) retirés', nH))}</button>` : ''}`);
  }
  async function hideGo(){
    const keep = new Set([...document.querySelectorAll('.hd-k:checked')].map(x=>x.value));
    const drop = trips().filter(t=>!t.demo && !t.deleted && !keep.has(t.id));
    if(!keep.size){ uiAlert(MSGT('Coche au moins un voyage à garder.')); return; }
    if(!drop.length){ closeSheet(true); return; }
    if(!(await uiConfirm(RF('{0} voyage(s) gardés, {1} retirés de ce téléphone seulement. Rien n’est effacé chez les autres. Continuer ?', keep.size, drop.length)))) return;
    // je ne pars pas dans ces voyages : je suis retiré(e) de leurs voyageurs, chez tout le monde (avant de les retirer d’ici)
    const Q = M.hideQ || (M.hideQ = []);
    drop.forEach(t=>{ if(!M.me || !(t.voyageurs || []).includes(M.me)) return;
      const code = TS()[t.id] && spaceObj(TS()[t.id]) ? TS()[t.id] : (M.sync.on && M.sync.code ? M.sync.code : null); if(!code) return;
      const n = Object.assign(clone(t), {voyageurs:(t.voyageurs || []).filter(p=>p !== M.me)}); stamp(n); Q.push([code, n]); });
    const H = M.hide || (M.hide = {}), Lf = M.left || (M.left = {}), S = M.mvSkip || (M.mvSkip = {}), ids = new Set(drop.map(t=>t.id));
    ids.forEach(t=>{ H[t] = TS()[t] || 1; Lf[t] = 1; S[t] = 1; delete TS()[t]; });
    Object.keys(R).forEach(id=>{ const r = R[id]; if(r && (ids.has(r.id) || ids.has(r.trip) || (r.type === 'moved' && ids.has(r.tid)))) delete R[id]; });
    M.dirty = M.dirty.filter(id=>R[id]); (M.spaces || []).forEach(sp=>{ sp.dirty = (sp.dirty || []).filter(id=>R[id]); });
    const used = new Set([...Object.values(TS()), ...Object.values(FT())]);
    M.spaces = (M.spaces || []).filter(sp=>sp.mate || used.has(sp.code));
    if((M.pq || []).length){ const refs = new Set(); Object.values(R).forEach(r=>{ if(r) photoRefs(r).forEach(p=>refs.add(String(p))); }); M.pq = M.pq.filter(x=>refs.has(String(x).replace(/\.t$/, ''))); }
    if(M.trip && ids.has(M.trip)) M.trip = null;
    persist(); closeSheet(true); applyMode(); refresh();
    toast('🧹 ' + RF('{0} voyage(s) retirés de ce téléphone', ids.size));
    hideFlush();
  }
  // envoi des « je ne pars pas » (réessayé à chaque synchro tant que le réseau manque)
  let hfBusy = false;
  async function hideFlush(){
    if(hfBusy || !(M.hideQ || []).length) return; hfBusy = true;
    try {
      const by = {}; M.hideQ.forEach(([c, r])=>{ (by[c] = by[c] || []).push(r); });
      for(const [c, recs] of Object.entries(by)){ try { await call(Date.now(), recs, c); M.hideQ = M.hideQ.filter(x=>x[0] !== c); persist(); } catch(e){} }
    } finally { hfBusy = false; }
  }
  async function hideUndo(){
    const H = M.hide || {}, n = Object.keys(H).length; if(!n) return;
    if(!(await uiConfirm(RF('Faire revenir les {0} voyage(s) retirés ?', n)))) return;
    Object.entries(H).forEach(([t, c])=>{ if(M.left) delete M.left[t]; if(M.mvSkip) delete M.mvSkip[t];
      if(typeof c === 'string'){ TS()[t] = c; if(!spaceObj(c)) (M.spaces = M.spaces || []).push({code:c, since:0, dirty:[], last:0, err:''}); } });
    M.hide = {}; M.sync.since = 0; (M.spaces || []).forEach(sp=>{ sp.since = 0; });
    persist(); closeSheet(true); toast('↩️ …');
    try { await syncNow(true); } catch(e){} refresh();
  }
  /* ══════════ 🫙 POT COMMUN : réglage, rangement des anciennes photos, ménage des anciennes copies ══════════ */
  // carnet où est rangée l'ancienne copie d'une photo (comme photoCode, mais d'après sa fiche : sans reparcourir tout le carnet pour chaque photo)
  const potCode = x => { if(!x || x.demo) return null; const t = targets(x)[0]; return t === 'main' ? (M.sync.on && M.sync.code ? M.sync.code : null) : t; };
  function potStats(){
    const own = {}, ref = {};
    Object.values(R).forEach(x=>{ if(!x || x.deleted || x.demo || x.type === 'feed' || x.type === 'phk') return; const rs = photoRefs(x);
      rs.forEach(p=>{ if(!ref[p]) ref[p] = x; }); [...rs, x.cover].forEach(p=>{ if(p && !own[p]) own[p] = x; }); });
    let inPot = 0, old = 0, mate = 0, lo = 0; const pend = new Set(M.pq || []), code = {};
    Object.keys(own).forEach(p=>{ const k = pkOf(p); if(k){ inPot++; if(k.lo) lo++; return; } if(pend.has(p)) return;
      const c = code[p] = ref[p] ? potCode(ref[p]) : photoCode(p); if(c){ if(potMate(own[p])) mate++; else old++; } });
    return {own, inPot, old, mate, code, lo};
  }
  // photo d'une fiche créée par un compagnon : c'est SON téléphone qui la range (une seule fois, jamais en double)
  // (même prénom = moi : un ancien profil fusionné, ou ce téléphone resté sur l'ancien profil)
  const potMate = x => { if(!(x && x.createdBy && M.me && x.createdBy !== M.me)) return false;
    const nm = id => String((R[id] || {}).nom || '').trim().toLowerCase(), a = nm(x.createdBy), b = nm(M.me);
    return !(a && b && a === b); };
  const potLine = st => `🫙 ${MSGT('Dans le pot')} : ${st.inPot} · ${MSGT('à l’ancienne')} : ${st.old}` + (st.lo ? ' · ' + RF('{0} en petite taille', st.lo) : '') + (st.mate ? ' · ' + RF('{0} photo(s) de tes compagnons : à ranger depuis leur téléphone.', st.mate) : '');
  const gcLine = () => { const L = M.v1gc || []; return L.length ? '🧹 ' + RF('Anciennes copies à effacer : {0} (contrôlées : {1})', L.length, L.filter(g=>g[3] === 1).length) : ''; };
  function potBox(){
    const st = potStats();
    return `<div class="v-box" id="pot-box"><h3>🫙 ${esc(MSGT('Pot commun des photos (bêta)'))}</h3>
      <p>${esc(MSGT('Chaque photo est rangée une seule fois sur le serveur et partagée par un lien secret : tes compagnons et tes abonnés voient la vraie photo, en grand, sans copie en plus.'))}</p>
      <div class="vz-glass-sw"><p style="margin:0">${esc(MSGT('Nouvelles photos dans le pot commun'))}</p><button type="button" class="v-btn${potOn() ? '' : ' sec'}" style="width:auto;margin:0;flex:none" onclick="CV.potToggle()">${potOn() ? esc(MSGT('Activé')) + ' ✓' : esc(MSGT('Activer'))}</button></div>
      <div class="v-sum-small" style="margin-top:8px" id="pot-st" data-notr>${esc(potLine(st))}</div>
      <div class="v-sum-small" style="margin-top:4px" id="pot-gc" data-notr>${esc(gcLine())}</div>
      ${potOn() && (st.old || st.lo) ? `<button type="button" class="v-btn sec" style="margin-top:8px" id="pot-go" onclick="CV.potMigrate()"${potBusy ? ' disabled' : ''}>🫙 ${esc(st.old ? RF('Ranger mes {0} anciennes photos dans le pot commun', st.old) : RF('Remettre en grand les {0} photos en petite taille', st.lo))}</button>
      <div class="v-sum-small" style="margin-top:6px">${esc(MSGT('Garde l’appli ouverte pendant le rangement. Si elle se ferme, réappuie : il reprend où il s’était arrêté.'))}</div>` : ''}
      <div id="pot-msg" class="v-sum-small" style="margin-top:6px" data-notr>${esc(potSaid)}</div>
      ${(()=>{ const E = Object.entries(M.potMiss || {}).sort((a, b)=>b[1] - a[1]); if(!E.length) return '';
        return `<details class="pot-miss"><summary>🔎 ${esc(MSGT('Introuvables, par voyage'))} (${E.reduce((a, x)=>a + x[1], 0)})</summary>${E.map(([k, n])=>{ const t = R[k];
          return `<div><span data-notr>${esc(t && !t.deleted ? (t.titre || '?') : '?')}</span> · ${n}${!t || t.deleted ? ' · ' + esc(MSGT('voyage supprimé')) : (M.hide || {})[k] ? ' · ' + esc(MSGT('voyage retiré de ce téléphone')) : ''}</div>`; }).join('')}</details>`; })()}
      <div class="v-sum-small" style="margin-top:6px">${esc(MSGT('Tes compagnons doivent avoir la dernière version de l’appli pour voir ces photos.'))}</div></div>`;
  }
  function potToggle(){ M.pot = !potOn(); persist(); toast(M.pot ? '🫙 ' + MSGT('Pot commun activé') : MSGT('Pot commun désactivé')); potRedraw(); }
  const potRedraw = () => { const b = document.getElementById('pot-box'); if(b) b.outerHTML = potBox(); };
  let potBusy = false, potSaid = '', potWl = null;
  // écran gardé allumé pendant le rangement (sinon l'iPhone se verrouille et met l'appli en pause)
  async function potWake(on){
    try {
      if(!on){ const w = potWl; potWl = null; if(w) await w.release(); return; }
      if(!potWl && navigator.wakeLock && document.visibilityState === 'visible'){ potWl = await navigator.wakeLock.request('screen'); potWl.addEventListener('release', ()=>{ potWl = null; }); }
    } catch(e){ potWl = null; }
  }
  document.addEventListener('visibilitychange', ()=>{ if(potBusy && document.visibilityState === 'visible') potWake(true); });
  // 🔎 où est l'ancienne copie d'une photo ? Elle peut être restée dans un autre carnet (carnet principal, ancien voyage partagé…).
  // On demande au serveur, carnet par carnet, la taille de la photo (40 photos par demande). Les carnets d'abonnés sont exclus (vignettes).
  async function potLocate(pids, say){
    const feeds = new Set(Object.values(FT())), codes = [...new Set([M.sync.on && M.sync.code, ...(M.spaces || []).filter(sp=>!feeds.has(sp.code)).map(sp=>sp.code),
      ...Object.entries(TS()).filter(([k, c])=>!/^ft:/.test(k) && !feeds.has(c)).map(([, c])=>c)].filter(Boolean))];
    const out = {};
    for(let i = 0; i < pids.length; i += 40){
      if(say) say('🔎 ' + RF('Je cherche les photos sur le serveur… {0}/{1}', Math.min(i + 40, pids.length), pids.length));
      const part = pids.slice(i, i + 40);
      for(const c of codes){
        const need = part.filter(p=>!(out[p] && out[p].full)); if(!need.length) break;
        const ids = [], m = {}; for(const p of need){ m[p] = [await sid(p, c), await sid(p + '.t', c)]; ids.push(...m[p]); }
        let sz = null; try { const r = await fetch(photoApi() + '?sizes=' + ids.map(encodeURIComponent).join(','), {headers:{'X-Carnet-Code':await authCode(c)}}); if(r.ok) sz = ((await r.json()) || {}).sizes || {}; } catch(e){}
        if(!sz) continue;
        need.forEach(p=>{ const [a, b] = m[p]; if(sz[a]) out[p] = {full:c}; else if(sz[b] && !out[p]) out[p] = {thumb:c}; });
      }
    }
    return out;
  }
  // rangement automatique, en arrière-plan : par petits paquets (au plus 1 fois toutes les 10 min), sans rien demander
  async function potAuto(){
    if(potBusy || !potOn() || !photoApi() || !(M.sync && M.sync.on) || document.visibilityState !== 'visible') return;
    if(Date.now() - (M.potAutoAt || 0) < 6e5) return; M.potAutoAt = Date.now();
    const st = potStats(); if(!st.old && !st.lo) return;
    try { await potMigrate({auto:true, max:120}); } catch(e){}
  }
  async function potMigrate(opt){
    opt = opt && typeof opt === 'object' ? opt : {};
    if(potBusy || !photoApi()) return; potBusy = true;
    const say = t => { potSaid = t; const e = document.getElementById('pot-msg'); if(e) e.textContent = t; };
    const stats = () => { const e = document.getElementById('pot-st'); if(e) e.textContent = potLine(potStats()); };
    { const b = document.getElementById('pot-go'); if(b) b.disabled = true; }
    const {own, code: cs} = potStats(), pend = new Set(M.pq || []);
    let todo = Object.keys(own).filter(p=>!pkOf(p) && !pend.has(p) && cs[p] && !potMate(own[p]));
    if(opt.max) todo = todo.slice(0, opt.max);
    const OFF = MSGT('Réseau coupé : rangement en pause. Réappuie quand le réseau revient, il reprendra où il s’était arrêté.');
    let done = 0, fail = 0, net = 0, stop = '', small = 0, miss = 0, up = 0; const missBy = {};
    if(!opt.auto) await potWake(true);
    try {
      // photos pas sur ce téléphone : on repère d'abord où le serveur les garde
      const away = []; for(const p of todo){ let o = null; try { o = await IDB.get(p); } catch(e){} if(!(o && o.blob)) away.push(p); }
      const loc = away.length ? await potLocate(away, say) : {};
      for(let i = 0; i < todo.length; i++){
        const pid = todo[i], code = cs[pid], ow = own[pid]; if(!code || pkOf(pid)) continue;
        if(!(i % 3)) say('🫙 ' + RF('Photos rangées : {0}/{1}', i, todo.length));
        if(navigator.onLine === false){ stop = OFF; break; }
        try {
          const L = loc[pid] || {}, from = L.full || L.thumb || code;
          let full = await potFull(pid, from, ow), lo = false;   // jamais la vignette s'il existe une grande photo
          if(full && !L.full && from === (L.thumb || '')) lo = true;
          if(!full){ let o = null; try { o = await IDB.get(pid + '.t'); } catch(e){} if(o && o.blob){ full = o.blob; lo = true; } }
          if(!full){ miss++; const k = ow.type === 'trip' ? ow.id : (ow.trip || '?'); missBy[k] = (missBy[k] || 0) + 1; continue; }
          let tb = null; try { const o = await IDB.get(pid + '.t'); if(o && o.blob) tb = o.blob; } catch(e){}
          if(!tb) try { tb = await shrink(full, 480, 0.74); } catch(e){}
          const pk = await v2Upload(pid, full, tb, code, ow.type === 'trip' ? ow.id : ow.trip || '');
          if(lo && pk){ putQuiet([Object.assign(clone(pk), {lo:1})]); small++; }   // petite taille seulement : un téléphone qui a la grande photo la remettra
          if(L.full || L.thumb) potGcAdd(L.full || L.thumb, pid); else potGcAdd(code, pid);
          done++; net = 0;
          if(!(done % 10)){ persist(); stats(); }
        } catch(e){
          fail++;
          if(e && (e.st === 429 || e.st === 507)){ stop = '⚠️ ' + e.message; break; }
          if(++net >= 4){ stop = OFF; break; }   // plusieurs échecs de suite : réseau coupé ou appli mise en pause
        }
      }
      // ⬆️ rangées en petite taille, mais CE téléphone a la grande photo : on la remet à la place (mêmes liens, rien ne change pour les autres)
      if(!stop) for(const r of Object.values(R).filter(x=>x && x.type === 'phk' && x.lo && !x.deleted)){
        const pid = r.id.slice(3); let o = null; try { o = await IDB.get(pid); } catch(e){} if(!(o && o.blob)) continue;
        const c = await codeOfHash(r.s); if(!c) continue;
        try { await v2Upload(pid, await cloudBlob(o.blob, own[pid], pid), null, c, r.trip, r); const n = clone(R[r.id]); delete n.lo; putQuiet([n]); up++; } catch(e){ break; }
      }
      if(!stop) M.potMiss = missBy;
      Object.keys(FT()).forEach(tid=>{ try { feedBuild(tid); } catch(e){} });   // 👀 abonnés : les photos rangées passent en grand (liens du pot), sans copie
      persist();
      say((stop ? stop + ' ' : '✅ ') + RF('{0} photo(s) rangées dans le pot commun.', done)
        + (small ? ' ' + RF('{0} en petite taille seulement : la grande photo n’est plus sur le serveur (un téléphone qui l’a encore la remettra).', small) : '')
        + (up ? ' ⬆️ ' + RF('{0} remise(s) en grand.', up) : '')
        + (miss ? ' ' + RF('{0} introuvable(s) : ni sur ce téléphone ni sur le serveur. Essaie depuis ton autre téléphone.', miss) : '')
        + (fail && !stop ? ' ⚠️ ' + RF('{0} non rangée(s), réessaie plus tard.', fail) : ''));
      try { await syncNow(true); } catch(e){}
    } finally { potBusy = false; await potWake(false); potRedraw(); }
  }
  // 🔍 contrôle avant ménage : la photo du pot doit peser comme l'ancienne copie du serveur.
  // Trop légère (vignette prise faute de réseau) ou trop lourde (original du téléphone) : on la remplace par l'ancienne copie, à l'identique.
  async function potCheck(){
    { const main = M.sync.on && M.sync.code;   // rangées avec la 23w : on ajoute la copie du carnet principal (une fois)
      if(main && !M.v1gcM){ const L = M.v1gc || [], has = new Set(L.filter(g=>g[0] === main).map(g=>g[1]));
        L.filter(g=>g[0] !== main && !has.has(g[1])).forEach(g=>{ L.push([main, g[1], g[2]]); has.add(g[1]); }); M.v1gcM = 1; persist(); } }
    const L = (M.v1gc || []).filter(g=>!g[3]); if(!L.length) return;
    for(let i = 0; i < L.length; i += 40){
      const part = L.slice(i, i + 40), want = {}, info = new Map(), ask = (c, id)=>{ (want[c] = want[c] || new Set()).add(id); };
      for(const g of part){ const pk = pkOf(g[1]); if(!pk || isDirty(pk.id)) continue;
        const c2 = pk.s === await spaceHash(g[0]) ? g[0] : await codeOfHash(pk.s);
        if(!c2){ M.v1gc = M.v1gc.filter(x=>x !== g); continue; }   // rangée dans un carnet que ce téléphone ne connaît pas : l'ancienne copie est gardée
        const v1 = await sid(g[1], g[0]); ask(g[0], v1); ask(c2, pk.i); info.set(g, [v1, pk.i, c2]); }
      const sz = {};
      for(const [c, set] of Object.entries(want)){
        const r = await fetch(photoApi() + '?sizes=' + [...set].map(encodeURIComponent).join(','), {headers:{'X-Carnet-Code':await authCode(c)}});
        if(!r.ok) return;   // serveur pas encore à jour, réseau… : rien n'est effacé, on réessaiera
        sz[c] = ((await r.json()) || {}).sizes || {};
      }
      for(const [g, [v1, v2, c2]] of info){
        const a = (sz[g[0]] || {})[v1] || 0, b = (sz[c2] || {})[v2] || 0;
        if(a && !(b && b >= a * 0.8 && b <= a * 1.3)){
          const o = await v1Get(g[1], g[0]);   // réseau coupé : erreur → on s'arrête, on réessaiera
          if(o.blob){ const pk = pkOf(g[1]); await v2Upload(g[1], o.blob, null, c2, pk.trip, pk); }
        }
        g[3] = 1;
      }
      persist(); { const e = document.getElementById('pot-gc'); if(e) e.textContent = gcLine(); }
    }
  }
  // anciennes copies (avant le pot commun) : effacées 24 h après le rangement, une fois contrôlées
  let gcBusy = false;
  async function potGc(){
    if(gcBusy || !photoApi()) return; gcBusy = true;
    try {
      // photo retirée par quelqu'un d'autre (compagnon) : si elle est rangée dans un de MES carnets, je l'efface du serveur
      const live = new Set(Object.values(R).filter(r=>r && !r.deleted && r.type !== 'feed').flatMap(photoRefs));
      for(const r of Object.values(R).filter(x=>x && x.type === 'phk' && x.deleted && x.s && !x.gc && /^pk:/.test(x.id))){
        const pid = r.id.slice(3); if(live.has(pid) || pkOf(pid)) continue;
        if(!(await codeOfHash(r.s))){ r.gc = 1; continue; }
        try { if(await v2Del(r)) r.gc = 1; } catch(e){ break; }
      }
      try { await potCheck(); } catch(e){}
      let n = 0;
      for(const g of [...(M.v1gc || [])]){
        const [code, pid, at, ok1] = g; if(ok1 !== 1 || Date.now() - at < 864e5) continue;
        const pk = pkOf(pid); if(!pk || isDirty(pk.id)) continue;
        let ok = true;
        for(const v of [pid, pid + '.t']){ try { const r = await fetch(photoApi() + '?id=' + encodeURIComponent(await sid(v, code)), {method:'DELETE', headers:{'X-Carnet-Code':await authCode(code)}}); if(!r.ok && r.status !== 404 && r.status !== 405) ok = false; } catch(e){ ok = false; } }
        if(!ok) break;
        M.v1gc = M.v1gc.filter(x=>x !== g); if(!(++n % 20)){ persist(); const e = document.getElementById('pot-gc'); if(e) e.textContent = gcLine(); }
      }
      if(n){ persist(); const e = document.getElementById('pot-gc'); if(e) e.textContent = gcLine(); }
    } finally { gcBusy = false; }
  }
  /* ══════════ 🧳 QUI PART DANS QUELS VOYAGES ══════════
     Une personne, tous les voyages : on coche ceux où elle part vraiment (budget, dépenses, « qui doit quoi »). */
  function travSheet(pid){
    const P = profiles(); pid = pid && prof(pid) ? pid : (P.find(p=>p.id !== M.me) || P[0] || {}).id; if(!pid) return;
    const L = trips().filter(t=>!t.demo && !t.deleted).sort((a, b)=>(b.debut || '').localeCompare(a.debut || ''));
    openSheet(`<h2>🧳 ${esc(MSGT('Qui part dans quels voyages ?'))}</h2>
      <div class="cv-plist" style="margin-bottom:10px">${P.map(p=>`<button type="button" class="cv-prow${p.id === pid ? ' me' : ''}" onclick="CV.travSheet('${ja(p.id)}')">${pchip(p.id)}<span>${p.id === pid ? '✓' : ''}</span></button>`).join('')}</div>
      <div class="v-sum-small" style="margin-bottom:8px">${esc(RF('Coche les voyages où {0} part vraiment. Les autres voyages ne changent pas, seule la liste des voyageurs est modifiée.', pname(pid)))}</div>
      <div style="margin-bottom:6px"><button type="button" class="v-btn sec" style="width:auto;display:inline-block;margin:0 6px 0 0" onclick="document.querySelectorAll('.tv-k').forEach(x=>x.checked=true)">${esc(MSGT('Tout cocher'))}</button><button type="button" class="v-btn sec" style="width:auto;display:inline-block;margin:0" onclick="document.querySelectorAll('.tv-k').forEach(x=>x.checked=false)">${esc(MSGT('Tout décocher'))}</button></div>
      <div>${L.map(t=>`<label class="cv-checkline"><input type="checkbox" class="tv-k" value="${esc(t.id)}"${(t.voyageurs || []).includes(pid) ? ' checked' : ''}> <span data-notr>${esc(t.titre || '')}</span> <small>${esc(fdate(t.debut || '') || '')}</small></label>`).join('')}</div>
      <div class="v-actions"><button type="button" class="v-btn" onclick="CV.travSave('${ja(pid)}')">✅ ${esc(MSGT('Enregistrer'))}</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  function travSave(pid){
    const on = new Set([...document.querySelectorAll('.tv-k:checked')].map(x=>x.value)), out = [];
    trips().filter(t=>!t.demo && !t.deleted).forEach(t=>{ const v = new Set(t.voyageurs || []), had = v.has(pid);
      if(on.has(t.id)) v.add(pid); else v.delete(pid);
      if(had !== v.has(pid)) out.push(Object.assign(clone(t), {voyageurs:[...v]})); });
    if(out.length) putMany(out, false);
    closeSheet(true); refresh(); toast('✅ ' + RF('{0} voyage(s) modifié(s)', out.length));
  }
  /* ══════════ 🔗 RÉPARER LES LIENS DES VOYAGES ══════════
     Un voyage partagé vit sous SON code (fiches + photos). S’il a été rattaché à un autre code (carnet entier rejoint,
     code principal collé…), ses photos ne sont plus trouvées. On reprend tous les codes connus de ce téléphone
     (codes rejoints, « voyage déménagé », paquets), on regarde sous lesquels chaque voyage existe vraiment et où sont
     ses photos, puis on le rattache au bon. Rien n’est effacé, nulle part. */
  async function linkSheet(){
    openSheet(`<h2>🔗 ${esc(MSGT('Réparer les liens des voyages'))}</h2>
      <div class="v-sum-small" style="margin-bottom:10px">${esc(MSGT('Pour des voyages partagés dont les photos ou les mises à jour n’arrivent plus. L’appli retrouve le bon code de chaque voyage. Rien n’est effacé.'))}</div>
      <div id="lk-msg" class="v-sum-small" style="margin:6px 0" data-notr></div><div id="lk-res" data-notr></div>
      <div class="v-actions"><button type="button" class="v-btn" id="lk-go" onclick="CV.linkGo()">🔗 ${esc(MSGT('Réparer'))}</button><button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button></div>`);
  }
  async function linkGo(){
    const msg = document.getElementById('lk-msg'), res = document.getElementById('lk-res'), btn = document.getElementById('lk-go');
    const say = t => { if(msg) msg.textContent = t; };
    if(btn) btn.disabled = true;
    try {
      const main = M.sync.on && M.sync.code ? M.sync.code : '';
      const feeds = new Set([...Object.values(FT()), ...list('feedtrip').map(f=>TS()[f.id])].filter(Boolean));
      const cand = new Set([main, ...(M.spaces || []).map(x=>x.code), ...list('moved', m=>m.code).map(m=>m.code), ...list('packtrip', m=>m.code).map(m=>m.code)].filter(c=>c && !feeds.has(c)));
      // 1) sous quels codes chaque voyage existe-t-il vraiment ?
      const where = {}, size = {}; let k = 0;
      for(const c of cand){ k++; say('📡 ' + RF('Lecture des codes : {0}/{1}', k, cand.size));
        let recs = []; try { recs = (await call(0, [], c)).records || []; } catch(e){ continue; }
        const ts = recs.filter(r=>r && r.type === 'trip' && !r.deleted).map(r=>r.id); size[c] = ts.length;
        ts.forEach(t=>{ (where[t] = where[t] || []).push(c); }); }
      // 2) pour chaque voyage présent sous plusieurs codes : celui où ses photos sont vraiment
      const probe = async (pid, c) => { try { const r = await fetch(photoApi() + '?id=' + encodeURIComponent(await sid(pid + '.t', c)), {headers:{'X-Carnet-Code':await authCode(c)}}); return r.ok; } catch(e){ return false; } };
      const out = []; let n = 0;
      const myT = trips().filter(t=>!t.demo);
      for(const t of myT){
        n++; say('🔎 ' + RF('Voyage {0}/{1} : {2}', n, myT.length, t.titre || ''));
        const cs = where[t.id] || []; if(!cs.length) continue;
        const cur = TS()[t.id] || main;
        const pids = [...new Set(Object.values(R).filter(r=>r && !r.deleted && (r.trip === t.id || r.id === t.id)).flatMap(photoRefs))].slice(0, 3);
        let best = null;
        if(cs.length === 1) best = cs[0];
        else {
          const score = {}; for(const c of cs){ score[c] = 0; for(const p of pids) if(await probe(p, c)) score[c]++; }
          best = cs.slice().sort((a, b)=>(score[b] - score[a]) || ((size[a] || 0) - (size[b] || 0)))[0];   // le plus de photos trouvées, sinon le code le plus « petit » (propre au voyage)
        }
        if(best && best !== cur){ out.push([t, cur, best]); }
      }
      // 3) rattacher et relire (sans rien effacer)
      out.forEach(([t, , c])=>{ if(c === main) delete TS()[t.id]; else { TS()[t.id] = c; if(!spaceObj(c)) (M.spaces = M.spaces || []).push({code:c, since:0, dirty:[], last:0, err:''}); } });
      const touched = new Set(out.map(x=>x[2])); for(const c of touched){ const sp = spaceObj(c); if(sp){ sp.since = 0; try { await syncSpace(sp); } catch(e){} } }
      persist(); refresh();
      if(res) res.innerHTML = out.length ? out.map(([t, a, b])=>`<div class="v-sum-small">✅ <b>${esc(t.titre || '')}</b> : ${esc(a || '—')} → ${esc(b)}</div>`).join('') : '';
      say(out.length ? '✅ ' + RF('{0} voyage(s) rattaché(s) à leur bon code. Les photos reviennent au fur et à mesure.', out.length) : '✅ ' + MSGT('Tous les voyages sont déjà sur leur bon code.'));
      try { syncNow(true); } catch(e){}
    } catch(e){ say('⚠️ ' + (e.message || e)); }
    if(btn) btn.disabled = false;
  }
  // 📱 (2026-11-10) Barre du bas au milieu de l’écran à l’ouverture (iPhone, réseau lent) : Safari calcule parfois une hauteur d’écran
  //    trop petite au démarrage, et tout ce qui est « collé en bas » se retrouve au milieu. On vérifie, et si la barre flotte,
  //    on oblige Safari à recalculer ; si ça ne suffit pas, on la recolle en bas nous-mêmes jusqu’au prochain vrai changement de taille.
  (function navGuard(){
    let raf = 0, tries = 0;
    const bottomOf = () => { const v = window.visualViewport; return Math.max(window.innerHeight || 0, v ? v.height + v.offsetTop : 0, document.documentElement.clientHeight || 0); };
    function check(){ raf = 0;
      const n = document.querySelector('.cv-nav'); if(!n || !n.getClientRects().length || getComputedStyle(n).position !== 'fixed') return;
      if(document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;   // clavier ouvert : on ne touche à rien
      n.style.transform = '';
      const gap = bottomOf() - n.getBoundingClientRect().bottom;
      if(gap <= 48) { tries = 0; return; }   // normal : ~10 px au-dessus du bas (+ la zone de la barre d’accueil)
      if(tries++ < 2){ const y = window.scrollY; n.style.position = 'absolute'; void n.offsetHeight; n.style.position = ''; window.scrollTo(window.scrollX, y + 1); window.scrollTo(window.scrollX, y); return later(250); }
      n.style.transform = 'translateY(' + Math.round(gap - 12) + 'px)';   // dernier recours
    }
    const later = ms => setTimeout(()=>{ if(!raf) raf = requestAnimationFrame(check); }, ms || 0);
    const soon = () => { tries = 0; later(0); };
    ['load', 'pageshow', 'resize', 'orientationchange', 'online', 'focus'].forEach(e=>window.addEventListener(e, soon, {passive:true}));
    document.addEventListener('visibilitychange', ()=>{ if(!document.hidden){ soon(); later(600); } });
    if(window.visualViewport) visualViewport.addEventListener('resize', soon, {passive:true});
    window.addEventListener('scroll', ()=>{ if(!raf) raf = requestAnimationFrame(check); }, {passive:true});
    [300, 1200, 3000, 6000].forEach(later);
  })();
  var RECAPI = {i18nNames, adminPass, codeNoted, joinPickBusy, userUnhide, preHideSheet, preHideAdd, preHideDel, fwInviteSend, pubMapSync, fwLinkBack, psGo, psClose, psFeed, wallStep, psTrip, rgOpen, rgClose, rgSet, rgLater, rgDrop, rgUndo, rgAll, rgAuto, rgRedo, potToggle, potMigrate, pdfPart, suggRedo, swReset, nowOpen, nowMark, nowPlan, nowPlanOk, rainSwap, rainNo, hotelPub, ab2Indiv, ab2PubDel, stEditSave, stEditHint, gdNotedOk, plkOpen, plkPaste, plkGo, plkAdd, exCard, expMore, suggList, swGo, swUndo, swChip, swAll, swClose, ariCity, ariCitySave, hideFlush, travSheet, travSave, mergeSheet, mergeGo, hideSheet, hideGo, hideUndo, linkSheet, linkGo, ab2AskMate, swGateMore, swGateNext, swEndMore, gdHoods, gdHoodHotel, gdFromHotel, pgOpen, pgClose, pgD3, pgBase, pgFit, pgVote, pgMode, pgCardX, pgInfo, pgEdit, pgAct, pgActDel, pgHot, pgHotel, pgLeg, pgList, pgGo, pgDecide, rxGo};

  const api = {souvResend, obMagic, souvSplit, liveMe, demoPhase, plSkip, nhStep, plVu, nearCheck, pinOpen, pinOk, pinClose, pinFly, feedBell, tripSyncSheet, tripPullAll, tripPushAll, feedBack, covWiki, covFile, covDel, covPick, bookSheet, packCcAdd, packCcDel, init, installNow, installSheet, infoSheet, infoOk, codeSheet, copyCode, discover, discF, discQ, discAdd, planCity, cityMove, cityLock, cityDel, cityOpt, toggleLock, pdfSheet, pdfMake, pdfClose, mySheet, go, tab, navGo, tripSheet, seedUSA2025, convert2026, editSouv, saveSouv, delSouv, souvAddPhotos, souvDelPhoto, view, viewGo, viewClose, rembAdd, rembDel, who:setWho, filter, cycle, edit, seg, saveForm, noteFromItem, del, close:closeSheet, xClose, onThisDay, smartPack, smartPackAdd, sheetBack, add,
    toggleDay, dayAll, avantSheet, swCityGo, toolOpen, ckTog, ariCityPos, ariShiftHint, ariCityGuess, progV, stTog, segStat, trFix, carFix, buTier, buAll, buPrices, buSpN, buSpSave, buPaid, soOpen, soMove, soN, soAuto, soSave, soDel, soRev, soEven, inspDatesTouch, livePhoto, demoPick, demoGo, stMove, stDel, stRename, editDay, saveDay, editNote, saveNote, delNote, pin, openRef,
    setObj, addCompanion, addToTrip, removeCompanion, check, delCheck, addCheck,
    envF:setEnvF, envP:setEnvP, like, editWish, saveWish, delWish, wishToTrip,
    editTrip, saveTrip, delTrip, closeTrip, reopenTrip,
    live, one, echAdd, echDel, echSpread, echToggle, lisser, echReset, echRange, echRangeReset,
    roDrop, trkExport, planDay, plCfg, plAdd, plDel, plOpt, wizard, radarTuto, rcOpen, rbSheet, rbPhoto, rbSave, zipSavePart, zipCancel, innerGo, inspDeal, inspFly, inspNearGo, inspOpen, compN, compDel, compAdd, compTog, compCreate, inspBack, inspMore, inspFav, inspSurprise, inspVote, inspCityGo, gateInstall, partsSheet, partsSave, discInfo, discBack, newTrip, blankTrip, psImport, psFile, inspire, inspireDemo, inspireGo, inspireCreate, zipSheet, zipExport, zipImport, worldFly, worldStep, worldStory, cfSegGo, trkToggle, modeGo, bilanClose, albumSheet, albCover, albumGo, tripShare, tripShareSheet, tripInvite, tripNewCode, tripUnshare, tripJoin, tripJoinGo, tripWho, tripWhoSet, impSheet, impPick, jrSheet, jrTog, jrAll, worldMap, worldMode, worldOpen, worldClose, pjAdd, pjDel, pjOpen, cfSheet, cfGo, tlCo2, hereNow, tlStats, tlKml, tlFill, tlFillGo, rcView, rcAttach, tlIcsGo, capSet, shopSheet, shopAdd, shopTick, shopClear, rembAsk, pollNew, pollSave, pollVote, pollClose, pollDel, pdfRoute, pdfJournal, pdfShare, pdfOpen, pkgPick, pkgApply, hydrateMaps, renderOutils, tlDay, tlIcs, fxTool, fxFill, tlMeteo, tlReceipt, tlRcPhoto, tlRcOcr, tlRcSave, rcFx, socialHub, trkPub, tlReceipts, tlMap, tlBags, tlBagsGo, tlDocs, tlDocEdit, tlDocSave, tlDocDel, tlJournal, pkgSheet, pkgExport, pkgImport, pinToggle, shareSheet, shareLink, askErase, tutoSheet, escaleTuto, demoLoad, demoDel, demoReset, wzGo, wzDates, wzEt, wzSum, wzTpl, wzCreate,
    pickColor, newProfile, editProfile, saveProfile, delProfile, whoSheet, setMe,
    bellSheet, bellGo, bellClear, rateGo, packFrom, packCc, inviteSheet, inviteSend, inviteCopy, carnetShareSheet, carnetPublishSheet, carnetPublish, joinPick, joinPickSave, withWhom, withWhomUpd, withWhomGo, joinAny, joinPaste, joinAnyGo, dupSheet, dupTripsGo, photoSweep, spaceSheet, spaceFree, bagEntryUpd, impPickShot, impPickPass, impPass,
    genCode, syncOn, syncOff, syncNow, shareCode, exportShare, exportDownload, importPick, wipe, obCreate, obJoin, obFollow, codesCopy,
    _R:()=>R, _M:()=>M, ...VZAPI, ...RECAPI, ...NEWAPI, ...APPAPI, impBack:()=>impSheet(impCat)};
  // En mode lecture, toutes les actions qui modifient sont bloquées
  const MUT = ['seedUSA2025','convert2026','saveSouv','delSouv','souvAddPhotos','souvDelPhoto','rembAdd','rembDel',
    'cycle','saveForm','noteFromItem','del','add','saveDay','saveNote','delNote','pin','setObj','addCompanion','addToTrip','removeCompanion',
    'check','delCheck','addCheck','like','saveWish','delWish','wishToTrip','saveTrip','delTrip','closeTrip','reopenTrip',
    'echAdd','echDel','echSpread','echToggle','lisser','echReset','echRange','echRangeReset','plCfg','plAdd','plDel','plOpt',
    'wizard','wzCreate','discAdd','cityMove','cityLock','cityDel','cityOpt','newProfile','saveProfile','delProfile','importPick','wipe','editSouv','autoPhotoPick','autoPhotoGo','coverSet','eveSave','worldPlanGo','worldNew'];
  // partage, abonnés, compagnons : tout ce qui retire, bloque, coupe ou efface est aussi bloqué en mode lecture
  const SHAREMUT = ['ab2Common','ab2AskFw','ab2TripsAll','ab2FwAll','ab2SubAll','ab2TripSet','ab2Rename','ab2FwHide','ab2FwDel','ab2SubHide','ab2Unfollow','feedStop','feedReset','feedPublish','carnetPublish','feedShareOne','fwBlock','fwHideOne','fwTripsSave','userBlock','userHide','cmDel','feedUnfollow',
    'packSave','packRemoveTrip','packDel','tripLeaveGo','tripUnshare','tripNewCode','serverWipeTrip','serverWipeSheet','cloudLeave','cloudTripOff','cloudFeedCut','syncOff',
    'demoDel','demoReset','pendDrop','pendAgain','expAdd','tripInviteNow','withWhomGo','followInviteGo','pjDel','pollDel','tlDocDel','shopClear','spaceFree','photoSweep'];
  [...MUT, ...NEWMUT, ...SHAREMUT, 'serverWipe'].forEach(n=>{ const f = api[n]; if(!f) return; api[n] = (...a) => {
    if(M.lock && !(n==='editSouv' && a[0]) && !(n==='delTrip' && R[a[0]] && R[a[0]].ro)){ toast('🔒 Mode lecture : touche le cadenas en haut pour modifier'); return; }
    return f(...a); }; });
  const CV = api;

CV.init();
window.__vzReady = true;   // l’appli a démarré : le filet de sécurité ne s’affichera pas
requestAnimationFrame(function(){ requestAnimationFrame(function(){ window.__vzSplashOff && window.__vzSplashOff(); }); });


