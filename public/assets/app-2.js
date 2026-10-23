/* Vezoria — code de l’appli, partie 2/8 (chargées dans l’ordre par index.html, même portée globale) */

  /* ══════════ 👀 Voyage de démo (version grand public) ══════════ */
  const DEMO_TPL = [{"id":"__P1__","type":"profile","nom":"Léo","couleur":"#2e9e6a"},{"id":"__P2__","type":"profile","nom":"Inès","couleur":"#e8862e"},{"id":"__T__","type":"trip","titre":"Japon · 3 semaines","sous":"Tokyo → Hakone → Kyoto → Hiroshima → Osaka → Tokyo","debut":"@0","fin":"@20","voyageurs":["__P1__","__P2__","__ME__"],"objectif":3500,"createdBy":"__ME__","updatedBy":"__ME__"},{"id":"~0","type":"item","trip":"__T__","cat":"hotel","titre":"Tokyo","date":"@0","dateFin":"@5","statut":"booked","partage":"grp","qui":[],"createdBy":"__ME__","updatedBy":"__ME__","echeances":[{"id":"emutz7gp7i3a1q0","date":"@-149","montant":273.33,"fait":false},{"id":"emutz7gp76i6j51","date":"@-119","montant":273.33,"fait":false},{"id":"emutz7gp7cah962","date":"@-88","montant":273.34,"fait":false}],"nom":"Hotel Gracery Shinjuku","adresse":"","heure":"","tel":"","prix":"820","estime":"","ref":"","lien":"","payeur":"__P1__"},{"id":"~1","type":"item","trip":"__T__","cat":"hotel","titre":"Hakone","date":"@5","dateFin":"@7","statut":"paid","partage":"grp","qui":[],"createdBy":"__ME__","updatedBy":"__ME__","nom":"Ryokan Fujiya","adresse":"Miyanoshita, Hakone","heure":"15:00","prix":"540","payeur":"__P2__"},{"id":"~2","type":"item","trip":"__T__","cat":"transport","statut":"booked","partage":"pp","qui":[],"mode":"Train","titre":"Tokyo → Hakone","from":"Tokyo","to":"Hakone","date":"@5","createdBy":"__ME__","updatedBy":"__ME__","compagnie":"Odakyu Romancecar","heureDep":"09:30","heureArr":"11:00","prix":"25","payeur":"chacun"},{"id":"~3","type":"item","trip":"__T__","cat":"hotel","titre":"Kyoto","date":"@7","dateFin":"@12","statut":"booked","partage":"grp","qui":[],"createdBy":"__ME__","updatedBy":"__ME__","nom":"Machiya Gion","adresse":"Higashiyama, Kyoto","heure":"16:00","prix":"950","payeur":"__ME__"},{"id":"~4","type":"item","trip":"__T__","cat":"transport","statut":"booked","partage":"pp","qui":[],"mode":"Train","titre":"Hakone → Kyoto","from":"Hakone","to":"Kyoto","date":"@7","createdBy":"__ME__","updatedBy":"__ME__","compagnie":"Shinkansen Hikari","heureDep":"10:12","heureArr":"12:20","prix":"95","payeur":"__P1__"},{"id":"~5","type":"item","trip":"__T__","cat":"hotel","titre":"Hiroshima","date":"@12","dateFin":"@14","statut":"booked","partage":"grp","qui":[],"createdBy":"__ME__","updatedBy":"__ME__","nom":"Hotel Granvia","adresse":"Gare de Hiroshima","heure":"15:00","prix":"260","payeur":"__P1__"},{"id":"~6","type":"item","trip":"__T__","cat":"transport","statut":"paid","partage":"pp","qui":[],"mode":"Train","titre":"Kyoto → Hiroshima","from":"Kyoto","to":"Hiroshima","date":"@12","createdBy":"__ME__","updatedBy":"__ME__","compagnie":"Shinkansen Nozomi","heureDep":"09:05","heureArr":"10:45","prix":"85","payeur":"__P2__"},{"id":"~7","type":"item","trip":"__T__","cat":"hotel","titre":"Osaka","date":"@14","dateFin":"@17","statut":"todo","partage":"grp","qui":[],"createdBy":"__ME__","updatedBy":"__ME__","nom":"Cross Hotel","adresse":"Dōtonbori, Osaka","estime":"390"},{"id":"~8","type":"item","trip":"__T__","cat":"transport","statut":"todo","partage":"pp","qui":[],"mode":"Train","titre":"Hiroshima → Osaka","from":"Hiroshima","to":"Osaka","date":"@14","createdBy":"__ME__","updatedBy":"__ME__","estime":"75"},{"id":"~9","type":"item","trip":"__T__","cat":"hotel","titre":"Tokyo","date":"@17","dateFin":"@20","statut":"todo","partage":"grp","qui":[],"createdBy":"__ME__","updatedBy":"__ME__","nom":"Mitsui Garden Ginza","adresse":"Ginza, Tokyo","estime":"600"},{"id":"~10","type":"item","trip":"__T__","cat":"transport","statut":"todo","partage":"pp","qui":[],"mode":"Train","titre":"Osaka → Tokyo","from":"Osaka","to":"Tokyo","date":"@17","createdBy":"__ME__","updatedBy":"__ME__","estime":"105"},{"id":"~11","type":"item","trip":"__T__","cat":"transport","statut":"paid","partage":"pp","qui":[],"mode":"Avion","titre":"Paris → Tokyo","from":"Paris","to":"Tokyo","date":"@0","createdBy":"__ME__","updatedBy":"__ME__","compagnie":"Air France AF276","heureDep":"10:25","heureArr":"06:40","prix":"980","estime":"","ref":"","lien":"","payeur":"__ME__"},{"id":"~12","type":"item","trip":"__T__","cat":"transport","statut":"paid","partage":"pp","qui":[],"mode":"Avion","titre":"Tokyo → Paris","from":"Tokyo","to":"Paris","date":"@20","createdBy":"__ME__","updatedBy":"__ME__","compagnie":"Air France AF275","heureDep":"12:05","heureArr":"18:30","prix":"0","estime":"","payeur":"__ME__","note":"inclus dans l’aller-retour"},{"type":"day","trip":"__T__","date":"@0","titre":"Arrivée à Tokyo","plan":"","createdBy":"__ME__","updatedBy":"__ME__"},{"type":"day","trip":"__T__","date":"@1","titre":"Tokyo","plan":"Shibuya, Harajuku, Meiji-jingu","createdBy":"__ME__","updatedBy":"__ME__"},{"type":"day","trip":"__T__","date":"@2","titre":"Tokyo","plan":"teamLab le matin, Odaiba l’après-midi","createdBy":"__ME__","updatedBy":"__ME__"},{"type":"day","trip":"__T__","date":"@3","titre":"Tokyo","plan":"","createdBy":"__ME__","updatedBy":"__ME__"},{"type":"day","trip":"__T__","date":"@4","titre":"Tokyo","plan":"Asakusa, Senso-ji, Skytree au coucher du soleil","createdBy":"__ME__","updatedBy":"__ME__"},{"type":"day","trip":"__T__","date":"@5","titre":"Tokyo → Hakone","plan":"","createdBy":"__ME__","updatedBy":"__ME__"},{"type":"day","trip":"__T__","date":"@6","titre":"Hakone","plan":"Lac Ashi, Owakudani, onsen le soir","createdBy":"__ME__","updatedBy":"__ME__"},{"type":"day","trip":"__T__","date":"@7","titre":"Hakone → Kyoto","plan":"","createdBy":"__ME__","updatedBy":"__ME__"},{"type":"day","trip":"__T__","date":"@8","titre":"Kyoto","plan":"Fushimi Inari tôt le matin, Gion le soir","createdBy":"__ME__","updatedBy":"__ME__"},{"type":"day","trip":"__T__","date":"@9","titre":"Kyoto","plan":"","createdBy":"__ME__","updatedBy":"__ME__"},{"type":"day","trip":"__T__","date":"@10","titre":"Kyoto","plan":"Arashiyama, bambouseraie","createdBy":"__ME__","updatedBy":"__ME__"},{"type":"day","trip":"__T__","date":"@11","titre":"Kyoto","plan":"","createdBy":"__ME__","updatedBy":"__ME__"},{"type":"day","trip":"__T__","date":"@12","titre":"Kyoto → Hiroshima","plan":"","createdBy":"__ME__","updatedBy":"__ME__"},{"type":"day","trip":"__T__","date":"@13","titre":"Hiroshima","plan":"Miyajima, torii flottant à marée haute","createdBy":"__ME__","updatedBy":"__ME__"},{"type":"day","trip":"__T__","date":"@14","titre":"Hiroshima → Osaka","plan":"","createdBy":"__ME__","updatedBy":"__ME__"},{"type":"day","trip":"__T__","date":"@15","titre":"Osaka","plan":"","createdBy":"__ME__","updatedBy":"__ME__"},{"type":"day","trip":"__T__","date":"@16","titre":"Osaka","plan":"Dōtonbori, street food","createdBy":"__ME__","updatedBy":"__ME__"},{"type":"day","trip":"__T__","date":"@17","titre":"Osaka → Tokyo","plan":"","createdBy":"__ME__","updatedBy":"__ME__"},{"type":"day","trip":"__T__","date":"@18","titre":"Tokyo","plan":"Shimokitazawa, dernières emplettes","createdBy":"__ME__","updatedBy":"__ME__"},{"type":"day","trip":"__T__","date":"@19","titre":"Tokyo","plan":"","createdBy":"__ME__","updatedBy":"__ME__"},{"type":"day","trip":"__T__","date":"@20","titre":"Tokyo → retour","plan":"","createdBy":"__ME__","updatedBy":"__ME__"},{"id":"~13","type":"check","trip":"__T__","cat":"📋 Documents","label":"Pièce d’identité / passeport valide","done":true,"createdBy":"__ME__","updatedBy":"__ME__"},{"id":"~14","type":"check","trip":"__T__","cat":"📋 Documents","label":"Assurance voyage (rapatriement)","done":true,"createdBy":"__ME__","updatedBy":"__ME__"},{"id":"~15","type":"check","trip":"__T__","cat":"📋 Documents","label":"Carte bancaire sans frais à l’étranger + 2e carte","done":true,"createdBy":"__ME__","updatedBy":"__ME__"},{"id":"~16","type":"check","trip":"__T__","cat":"📋 Documents","label":"Copies numériques (papiers, billets, réservations)","done":true,"createdBy":"__ME__","updatedBy":"__ME__"},{"id":"~17","type":"check","trip":"__T__","cat":"🗓️ À réserver tôt","label":"Trajets aller et retour","done":true,"createdBy":"__ME__","updatedBy":"__ME__"},{"id":"~18","type":"check","trip":"__T__","cat":"🗓️ À réserver tôt","label":"Hébergements","done":false,"createdBy":"__ME__","updatedBy":"__ME__"},{"id":"~19","type":"check","trip":"__T__","cat":"🗓️ À réserver tôt","label":"Visites à créneau","done":false,"createdBy":"__ME__","updatedBy":"__ME__"},{"id":"~20","type":"check","trip":"__T__","cat":"☀️ Santé","label":"Trousse pharmacie","done":false,"createdBy":"__ME__","updatedBy":"__ME__"},{"id":"~21","type":"check","trip":"__T__","cat":"☀️ Santé","label":"Crème solaire, gourde","done":false,"createdBy":"__ME__","updatedBy":"__ME__"},{"id":"~22","type":"check","trip":"__T__","cat":"📱 Tech","label":"Chargeur + batterie externe","done":false,"createdBy":"__ME__","updatedBy":"__ME__"},{"id":"~23","type":"check","trip":"__T__","cat":"📱 Tech","label":"Cartes hors ligne","done":false,"createdBy":"__ME__","updatedBy":"__ME__"},{"id":"~24","type":"check","trip":"__T__","cat":"📱 Tech","label":"eSIM / forfait à l’étranger","done":false,"createdBy":"__ME__","updatedBy":"__ME__"},{"id":"~25","type":"item","trip":"__T__","statut":"paid","partage":"pp","qui":[],"createdBy":"__ME__","updatedBy":"__ME__","cat":"activite","titre":"teamLab Planets","date":"@2","heure":"10:00","adresse":"Toyosu, Tokyo","prix":"32","payeur":"__ME__"},{"id":"~26","type":"item","trip":"__T__","statut":"booked","partage":"pp","qui":[],"createdBy":"__ME__","updatedBy":"__ME__","cat":"activite","titre":"Musée Ghibli","date":"@3","heure":"14:00","adresse":"Mitaka, Tokyo","prix":"8","payeur":"__P2__"},{"id":"~27","type":"item","trip":"__T__","statut":"todo","partage":"pp","qui":[],"createdBy":"__ME__","updatedBy":"__ME__","cat":"activite","titre":"Croisière lac Ashi","date":"@6","adresse":"Hakone","estime":"15"},{"id":"~28","type":"item","trip":"__T__","statut":"booked","partage":"pp","qui":[],"createdBy":"__ME__","updatedBy":"__ME__","cat":"activite","titre":"Cours de cuisine japonaise","date":"@9","heure":"11:00","adresse":"Nishiki, Kyoto","prix":"75","payeur":"__P2__"},{"id":"~29","type":"item","trip":"__T__","statut":"todo","partage":"pp","qui":[],"createdBy":"__ME__","updatedBy":"__ME__","cat":"activite","titre":"Ferry pour Miyajima","date":"@13","adresse":"Port de Miyajimaguchi","estime":"5"},{"id":"~30","type":"item","trip":"__T__","statut":"paid","partage":"pp","qui":[],"createdBy":"__ME__","updatedBy":"__ME__","cat":"activite","titre":"Universal Studios Japan","date":"@15","heure":"09:00","adresse":"Osaka","prix":"85","payeur":"__P1__"},{"id":"~31","type":"item","trip":"__T__","statut":"paid","partage":"grp","qui":[],"createdBy":"__ME__","updatedBy":"__ME__","cat":"divers","titre":"Pocket Wi-Fi 3 semaines","prix":"90","payeur":"__ME__"},{"id":"~32","type":"item","trip":"__T__","statut":"paid","partage":"pp","qui":[],"createdBy":"__ME__","updatedBy":"__ME__","cat":"divers","titre":"Assurance voyage","prix":"45","payeur":"chacun"},{"id":"~33","type":"item","trip":"__T__","statut":"todo","partage":"pp","qui":[],"createdBy":"__ME__","updatedBy":"__ME__","cat":"divers","titre":"Carte Suica (recharges)","estime":"60"},{"id":"~34","type":"souv","trip":"__T__","date":"@6","titre":"Premier onsen","lieu":"Hakone","texte":"Eau à 42 °C avec vue sur la montagne. Léo a tenu 4 minutes.","photos":[],"createdBy":"__P2__","updatedBy":"__P2__"},{"id":"~35","type":"souv","trip":"__T__","date":"@8","titre":"Mille torii à l’aube","lieu":"Fushimi Inari, Kyoto","texte":"Partis à 6 h : personne sur le sentier, seulement les corbeaux.","photos":[],"createdBy":"__P2__","updatedBy":"__P2__"},{"id":"~36","type":"souv","trip":"__T__","date":"@6","titre":"Le Fuji au coucher du soleil","lieu":"Hakone","texte":"Le ciel a viré au rose juste au moment où le Fuji est sorti des nuages.","photos":[],"createdBy":"__ME__","updatedBy":"__ME__"}];
  const demoTrip = () => list('trip', t=>t.demo)[0] || null;
  /* 👀 Voyages de démo : le même Japon sous 3 angles pour tout explorer —
     à préparer (dans 6 mois) · en cours (on est au jour 7) · terminé (souvenirs, photos, bilan).
     Photos dessinées sur le téléphone, rien n'est téléchargé, rien n'est partagé. */
  const DEMO_CITY = {tokyo:[35.6812,139.7671], hakone:[35.2324,139.1069], kyoto:[35.0116,135.7681], hiroshima:[34.3853,132.4553], osaka:[34.6937,135.5023]};
  function demoPaint(kind, seed){
    const W = 960, H = 720, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    let s = seed * 9301 + 49297; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const sky = (a, b, y1) => { const gr = g.createLinearGradient(0,0,0,y1||H); gr.addColorStop(0,a); gr.addColorStop(1,b); g.fillStyle = gr; g.fillRect(0,0,W,y1||H); };
    const ground = (a, b, y0) => { const gr = g.createLinearGradient(0,y0,0,H); gr.addColorStop(0,a); gr.addColorStop(1,b); g.fillStyle = gr; g.fillRect(0,y0,W,H-y0); };
    const blossoms = (n, cx, cy, r, cols) => { for(let i=0;i<n;i++){ const a = rnd()*6.28, d = Math.sqrt(rnd())*r; g.fillStyle = cols[Math.floor(rnd()*cols.length)]; g.beginPath(); g.arc(cx+Math.cos(a)*d, cy+Math.sin(a)*d*0.7, 6+rnd()*12, 0, 6.28); g.fill(); } };
    if(kind === 'fuji'){ sky('#ff9a6b','#7b4a9c',500); g.fillStyle = '#ffe2a8'; g.beginPath(); g.arc(700,230,70,0,6.28); g.fill();
      g.fillStyle = '#463a6e'; g.beginPath(); g.moveTo(140,540); g.lineTo(480,170); g.lineTo(820,540); g.fill(); g.fillStyle = '#f4f2fb'; g.beginPath(); g.moveTo(400,260); g.lineTo(480,170); g.lineTo(560,260); g.lineTo(520,245); g.lineTo(480,275); g.lineTo(440,245); g.fill(); ground('#3b4a7a','#1f2747',500); }
    else if(kind === 'torii'){ sky('#9cd3f2','#e8f4fb',560); ground('#4f8a5d','#2d5b3a',560); g.fillStyle = '#d23a2a'; g.fillRect(300,250,46,420); g.fillRect(614,250,46,420); g.fillStyle = '#1d1414'; g.fillRect(230,190,500,44); g.fillStyle = '#d23a2a'; g.fillRect(270,262,420,36); g.fillRect(462,234,36,70); }
    else if(kind === 'sakura'){ sky('#bfe0f6','#f6f6fb',600); ground('#86b06a','#5c8a4a',600); [[220,330],[520,280],[800,340]].forEach(([x,y])=>{ g.fillStyle = '#5b3d2e'; g.fillRect(x-14,y,28,340); blossoms(420, x, y, 190, ['#f8bcd0','#f5a3bf','#ffd6e3','#eb8fb0']); }); }
    else if(kind === 'temple'){ sky('#f7c97a','#f2e6c9',520); ground('#9b8b6e','#6e624b',600); g.fillStyle = '#3a2a22'; for(let k=0;k<3;k++){ const y = 220 + k*120, w = 520 - k*110; g.beginPath(); g.moveTo(480-w/2-40,y); g.lineTo(480+w/2+40,y); g.lineTo(480+w/2,y+30); g.lineTo(480-w/2,y+30); g.fill(); g.fillStyle = '#8a3b28'; g.fillRect(480-w/2+30,y+30,w-60,90); g.fillStyle = '#3a2a22'; } g.fillRect(470,120,20,100); }
    else if(kind === 'city'){ sky('#141a3a','#2a1f5a',H); for(let i=0;i<22;i++){ const x = i*46 + rnd()*10, h = 160 + rnd()*380; g.fillStyle = `hsl(${240+rnd()*40},35%,${12+rnd()*10}%)`; g.fillRect(x,H-h,40,h);
        for(let w=0; w<h/22; w++){ if(rnd() > 0.45){ g.fillStyle = ['#ffd27a','#7ad7ff','#ff7ab6','#fff3c4'][Math.floor(rnd()*4)]; g.fillRect(x+6+(w%2)*16, H-h+10+w*20, 10, 8); } } } }
    else if(kind === 'bamboo'){ sky('#d6efc9','#9ccf8a',H); for(let i=0;i<26;i++){ const x = rnd()*W, w = 14+rnd()*16; g.fillStyle = `hsl(${95+rnd()*25},45%,${30+rnd()*20}%)`; g.fillRect(x,0,w,H); g.fillStyle = 'rgba(0,0,0,.18)'; for(let y=60;y<H;y+=90+rnd()*40) g.fillRect(x,y,w,5); } }
    else if(kind === 'ramen'){ sky('#3b2418','#1e120c',H); g.fillStyle = '#f3efe8'; g.beginPath(); g.ellipse(480,420,330,190,0,0,6.28); g.fill(); g.fillStyle = '#c9822f'; g.beginPath(); g.ellipse(480,400,290,150,0,0,6.28); g.fill();
      g.strokeStyle = '#f4d58a'; g.lineWidth = 7; for(let i=0;i<14;i++){ g.beginPath(); g.moveTo(260+i*32,330); g.bezierCurveTo(300+i*30,400,240+i*32,430,300+i*30,480); g.stroke(); }
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(600,360,52,40,0,0,6.28); g.fill(); g.fillStyle = '#f1a72b'; g.beginPath(); g.arc(600,360,24,0,6.28); g.fill(); g.fillStyle = '#2f6b2f'; g.fillRect(330,330,80,22); }
    else if(kind === 'deer'){ sky('#bfe3f3','#eef8fb',520); ground('#7fa65a','#5d7e40',520); g.fillStyle = '#9b6a3e'; g.beginPath(); g.ellipse(480,470,140,70,0,0,6.28); g.fill(); g.fillRect(380,500,22,120); g.fillRect(560,500,22,120); g.fillRect(420,500,22,120); g.fillRect(520,500,22,120);
      g.beginPath(); g.ellipse(640,370,50,40,-0.5,0,6.28); g.fill(); g.fillRect(600,380,40,90); g.fillStyle = '#f4ecd8'; for(let i=0;i<7;i++){ g.beginPath(); g.arc(400+i*28,450+(i%2)*14,6,0,6.28); g.fill(); } }
    else if(kind === 'ticket'){ // reçu / ticket de caisse (seed = montant)
      g.fillStyle = '#5b5f6b'; g.fillRect(0,0,W,H); g.save(); g.translate(W/2, H/2); g.rotate((rnd()-0.5)*0.12);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-196,-316,400,640); g.fillStyle = '#fbfaf5'; g.fillRect(-200,-320,400,640);
      g.fillStyle = '#2b2b33'; g.textAlign = 'center'; g.font = 'bold 34px sans-serif'; g.fillText(['ホテル','レストラン','チケット','HOTEL'][seed % 4], 0, -250);
      g.font = '22px monospace'; g.fillText('TOKYO · ' + String(10 + seed % 18) + '/07', 0, -212); g.textAlign = 'left';
      for(let k=0;k<8;k++){ g.fillStyle = '#9a9aa6'; g.fillRect(-160,-170+k*38,150+rnd()*90,10); g.fillRect(90,-170+k*38,70,10); }
      g.fillStyle = '#2b2b33'; g.fillRect(-160,150,320,3); g.font = 'bold 38px monospace'; g.fillText('TOTAL', -160, 205); g.textAlign = 'right'; g.fillText(String(seed) + ' €', 160, 205);
      g.textAlign = 'left'; for(let k=0;k<40;k++){ g.fillStyle = '#2b2b33'; g.fillRect(-160 + k*8, 240, (k*7 % 5) + 2, 50); } g.restore(); }
    else if(kind === 'sea'){ sky('#7cc6ef','#d9f1fb',380); g.fillStyle = '#1d76b0'; g.fillRect(0,380,W,H-380); g.fillStyle = 'rgba(255,255,255,.45)'; for(let i=0;i<60;i++){ g.fillRect(rnd()*W, 390+rnd()*320, 30+rnd()*60, 3); }
      g.fillStyle = '#d23a2a'; g.fillRect(420,250,30,240); g.fillRect(560,250,30,240); g.fillStyle = '#1d1414'; g.fillRect(380,215,250,30); g.fillStyle = '#d23a2a'; g.fillRect(400,282,210,22); }
    g.fillStyle = 'rgba(255,255,255,.07)'; for(let i=0;i<500;i++) g.fillRect(rnd()*W, rnd()*H, 1.5, 1.5);   // grain photo
    return new Promise(r=>c.toBlob(r, 'image/jpeg', 0.86));
  }
  const DEMO_PICS = {Tokyo:['city','sakura','ramen','torii'], Hakone:['fuji','temple'], Kyoto:['torii','bamboo','temple','sakura'], Hiroshima:['sea','deer'], Osaka:['city','ramen']};
  const DEMO_TXT = {Tokyo:['Shibuya de nuit, des néons partout','Les cerisiers d’Ueno en pleine floraison','Le meilleur ramen de la ville, 20 min de queue','Meiji-jingu au calme du matin'],
    Hakone:['Le Fuji enfin sorti des nuages','Onsen au coucher du soleil'], Kyoto:['Mille torii de Fushimi Inari à l’aube','La bambouseraie d’Arashiyama','Le pavillon d’or sous le soleil','Promenade sur le chemin des philosophes'],
    Hiroshima:['Le torii flottant de Miyajima à marée haute','Les daims de Miyajima nous suivent partout'], Osaka:['Dōtonbori et ses enseignes géantes','Takoyaki dans la rue']};
  /* La démo suit la devise choisie dans Réglages : ses montants (en euros à l’origine) sont convertis à un taux
     approximatif et arrondis, et ses voyages passent dans cette devise. Les vrais voyages ne sont jamais convertis. */
  const DEMO_FX = {EUR:1, USD:1.1, GBP:0.85, CHF:0.94, CAD:1.5, AUD:1.65, NZD:1.8, JPY:165, CNY:7.9, SEK:11.2, NOK:11.7, DKK:7.46, PLN:4.3, CZK:25, HUF:395, RON:5, MXN:21, BRL:6.2, MAD:10.8, TND:3.4, TRY:42, AED:4, THB:38, INR:95, ZAR:20, KRW:1550};
  function demoCur(c){
    const rate = DEMO_FX[c] || 1, nice = v => { const x = v * rate; if(rate === 1 || !x) return v; const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.abs(x))) - 2)); return Math.round(x / p) * p; };
    const cv = (o, k, b) => { if(b != null && String(b).trim() !== '') o[k] = String(nice(num(b))); };
    Object.values(R).filter(r=>r.demo).forEach(r=>{
      if(!r._eur) r._eur = {prix:r.prix, estime:r.estime, montant:r.montant, objectif:r.objectif, plafond:r.plafond, ech:(r.echeances||[]).map(e=>e.montant)};
      const b = r._eur; ['prix','estime','montant','objectif','plafond'].forEach(k=>cv(r, k, b[k])); (r.echeances||[]).forEach((e,i)=>cv(e, 'montant', b.ech[i]));
      if(r.type==='trip') r.devise = c; });
  }
  let demoBusy = false;   // deux touchers rapides : une seule préparation de la démo
  async function demoLoad(){ if(demoBusy) return; demoBusy = true; try { await demoLoad1(); } finally { demoBusy = false; } }
  async function demoLoad1(){
    if(!M.me){ alert('Indique d’abord ton prénom.'); return; }
    const ex = demoTrip(); if(ex){ closeSheet(true); M.mode = 'live'; const lv = list('trip', t=>t.demo && tripPhase(t)==='live')[0]; go((lv||ex).id); return; }
    closeSheet(true); toast('👀 Préparation des voyages de démo…');
    const now = Date.now(), today = isoToday(), p1 = 'p' + uid() + 'd1', p2 = 'p' + uid() + 'd2', all = [];
    const mk = (day0, titre) => {
      const tid = 't' + uid() + 'demo', ids = {};
      const mapId = v => v==='__T__' ? tid : v==='__ME__' ? M.me : v==='__P1__' ? p1 : v==='__P2__' ? p2 : (v[0]==='~' ? (ids[v] = ids[v] || 'i' + uid() + v.slice(1)) : v);
      const conv = v => typeof v==='string' ? (/^@-?\d+$/.test(v) ? addDays(day0, parseInt(v.slice(1))) : /^(__|~)/.test(v) ? mapId(v) : v)
        : Array.isArray(v) ? v.map(conv) : (v && typeof v==='object') ? Object.fromEntries(Object.entries(v).map(([k,x])=>[k,conv(x)])) : v;
      const recs = [];
      DEMO_TPL.forEach((t,k)=>{ if(t.type==='profile' && all.some(r=>r.id===mapId(t.id))) return; const r = conv(clone(t)); if(r.type==='day') r.id = 'day:' + tid + ':' + r.date; if(r.type==='trip') r.titre = titre;
        if(!r.createdBy) r.createdBy = M.me; if(!r.updatedBy) r.updatedBy = r.createdBy; r.createdAt = now + all.length + k; r.updatedAt = r.createdAt; r.demo = true; recs.push(r); });
      all.push(...recs); return {tid, recs, day0};
    };
    const prep = mk(addDays(today, 180), 'Japon · 3 semaines (à préparer)');
    const live = mk(addDays(today, -6), 'Japon · voyage en cours (démo)');
    const past = mk(addDays(today, -80), 'Japon · souvenirs (démo)');
    all.forEach(r=>{ R[r.id] = r; });
    const cityOn = (v, d) => { const h = v.recs.find(r=>r.type==='item' && r.cat==='hotel' && r.date <= d && (!r.dateFin || r.dateFin > d)); return h ? stayCity(h) : 'Tokyo'; };
    const coords = c => DEMO_CITY[normQ(c)] || DEMO_CITY.tokyo;
    let n = 0, photos = 0;
    const addSouv = async (v, d, i, withPh, txt) => {
      const c = cityOn(v, d), [la, lo] = coords(c), kinds = DEMO_PICS[c] || ['city'], ph = [];
      for(let k=0; k<withPh; k++){ const pid = 'ph' + uid() + 'dm' + (n++); await storePhoto(await demoPaint(kinds[(i+k) % kinds.length], i*7 + k + 3), pid); ph.push(pid); photos++; }
      const r = {id:'s' + uid() + 'dm' + i, type:'souv', trip:v.tid, date:d, titre:(DEMO_TXT[c]||['Belle journée'])[i % (DEMO_TXT[c]||[1]).length], lieu:c + ', Japon', pays:'Japon', cc:'JP',
        lat:+(la + (Math.sin(i*1.7)*0.03)).toFixed(5), lng:+(lo + (Math.cos(i*1.3)*0.04)).toFixed(5), texte: txt || '', photos:ph, createdBy: i % 3 === 0 ? p2 : i % 3 === 1 ? M.me : p1, createdAt:now+5000+i, updatedAt:now+5000+i, demo:true};
      R[r.id] = r; if(photos % 6 === 0) toast(`📸 Photos de démo : ${photos}…`);
    };
    // ── voyage terminé : un souvenir par jour, photos, steps, comptes à solder ──
    for(let i=0;i<21;i++) await addSouv(past, addDays(past.day0, i), i, i % 3 === 2 ? 2 : 1, i % 4 === 0 ? 'Une journée parfaite, on en reparlera longtemps.' : '');
    past.recs.filter(r=>r.type==='item').forEach(r=>{ r.statut = 'paid'; if(!num(r.prix) && num(r.estime)) r.prix = r.estime; });
    // justificatifs : quelques tickets et reçus déjà photographiés (Bilan › Budget)
    { const its = past.recs.filter(r=>r.type==='item' && num(r.prix) > 0 && r.cat !== 'transport').slice(0, 6);
      for(const [k, r] of its.entries()){ const rc = 'rc' + uid() + 'dmp' + k; await storePhoto(await demoPaint('ticket', Math.round(num(r.prix)) || 20 + k), rc); r.recu = rc; } }
    R['rb' + uid() + 'dm'] = {id:'rb' + uid() + 'dm', type:'remb', trip:past.tid, de:p1, a:M.me, montant:'400', date:addDays(past.day0, 25), demo:true, createdAt:now, updatedAt:now};
    // ── voyage en cours : jour 7, steps des jours passés, traces, tickets, courses, plafond, parts ──
    for(let i=0;i<6;i++) await addSouv(live, addDays(live.day0, i), i + 3, i % 2 ? 2 : 1, '');
    live.recs.filter(r=>r.type==='item' && r.date && r.date < today).forEach(r=>{ r.statut = 'paid'; if(!num(r.prix) && num(r.estime)) r.prix = r.estime; });
    for(let i=0;i<7;i++){ const d = addDays(live.day0, i), [la, lo] = coords(cityOn(live, d)), pts = [];
      for(let k=0;k<14;k++) pts.push([+(la + Math.sin(k/2 + i)*0.02 + k*0.002).toFixed(5), +(lo + Math.cos(k/3 + i)*0.025 + k*0.003).toFixed(5), now - (7-i)*864e5 + k*1800e3]);
      R['trk:' + live.tid + ':' + d] = {id:'trk:' + live.tid + ':' + d, type:'trk', trip:live.tid, date:d, pts, demo:true, createdAt:now, updatedAt:now}; }
    for(const [k, [t, px]] of [['ramen', ['Ramen Ichiran', '24']], ['city', ['Taxi retour Shinjuku', '18']]].entries()){
      const rc = 'rc' + uid() + 'dm' + k; await storePhoto(await demoPaint(t, 40 + k), rc);
      R['i' + uid() + 'dmr' + k] = {id:'i' + uid() + 'dmr' + k, type:'item', trip:live.tid, cat:'divers', titre:px[0], date:today, statut:'paid', prix:px[1], partage:'grp', payeur: k ? p1 : M.me, qui:[], recu:rc, demo:true, createdAt:now, updatedAt:now}; }
    ['Eau ×6', 'Onigiri pour le train', 'Pansements', 'Pass métro Kyoto'].forEach((l,k)=>{ R['c' + uid() + 'dmc' + k] = {id:'c' + uid() + 'dmc' + k, type:'check', trip:live.tid, cat:'🛒 Courses', label:l, done:k===2, createdBy:k%2?p1:M.me, demo:true, createdAt:now+k, updatedAt:now+k}; });
    if(!R[live.tid]) return;   // démo effacée pendant sa préparation
    Object.assign(R[live.tid], {plafond:'150', coef:{[p2]:0.5}, foyer:{[p1]:'Léo & Inès', [p2]:'Léo & Inès'}});
    // ── sondage dans les Envies ──
    R['po' + uid() + 'dm'] = {id:'po' + uid() + 'dm', type:'poll', question:'Prochain voyage : on part où ?', options:['Islande','Lisbonne','Vietnam'], votes:{[M.me]:0, [p1]:2, [p2]:0}, closed:false, demo:true, createdBy:p1, createdAt:now, updatedAt:now};
    for(const v of [prep, live, past]) Object.values(R).filter(r=>r.demo && (r.trip===v.tid || r.id===v.tid)).forEach(r=>{ r.demo = true; });
    { const dm = new Set(Object.values(R).filter(r=>r.demo).flatMap(r=>[...(r.photos||[]), r.recu].filter(Boolean))); M.pq = (M.pq||[]).filter(x=>!dm.has(String(x).replace(/\.t$/,''))); }
    demoCur(M.cur || 'EUR'); persist(); M.mode = 'live'; M.tab = 'prog'; go(live.tid);
    setTimeout(()=>alert('👀 3 voyages de démo sont prêts (rien n’est partagé) :\n\n📍 En cours : on est au jour 7 — traceur, steps, tickets, courses, plafond, parts inégales.\n🧳 Préparation : le même Japon dans 6 mois, à organiser.\n🗺️ Passés / 🏁 Bilan : le voyage terminé avec ses photos, son album et ses comptes.\n\nPasse d’un onglet à l’autre en haut de l’écran. « Supprimer la démo » efface tout.'), 300);
  }
  async function demoDel(){
    if(!(await uiConfirm('Supprimer le voyage de démo ?\n\nTes propres voyages ne sont pas touchés.'))) return;
    Object.keys(R).forEach(id=>{ if(R[id].demo) delete R[id]; });
    if(!trip()){ const t = trips()[0]; M.trip = t ? t.id : null; }
    persist(); closeSheet(true); M.tab = 'prog'; applyMode(); toast('🗑 Démo supprimée');
  }
  async function demoReset(){
    if(demoTrip() && !(await uiConfirm('Relancer le voyage de démo ?\n\nIl est remis à neuf : tes essais dans la démo sont effacés. Tes propres voyages ne sont pas touchés.'))) return;
    Object.keys(R).forEach(id=>{ if(R[id].demo) delete R[id]; });
    persist(); demoLoad();
  }
  const demoBtn = () => PUBLIC ? (demoTrip()
      ? `<button class="v-btn sec" onclick="CV.demoReset()">↺ Relancer le voyage de démo (remis à neuf)</button>
         <button class="v-btn sec" onclick="CV.demoDel()">🗑 Supprimer le voyage de démo</button>`
      : `<button class="v-btn sec" onclick="CV.demoLoad()">👀 Voir les voyages de démo (préparation, en cours, souvenirs)</button>`) : '';
  function go(id){ M.trip = id; M.who = 'all';
    persist(); applyMode(); window.scrollTo({top:0}); }
  function tab(id){
    M.tab = id; persist(); buildTabs(); render();
    const sub = document.getElementById('tabsC'), y = sub && sub.style.display!=='none' ? sub.getBoundingClientRect().top + window.scrollY : 0;
    if(window.scrollY > y && y) window.scrollTo({top:y}); else if(!y) window.scrollTo({top:0});
  }
  function refresh(){ if(M.trip===LEGACY){ renderHeader(); return; } applyMode(); }

  function phaseTheme(){ const t = M.trip !== LEGACY && trip(), ph = t ? tripPhase(t) : 'prep'; const was = document.body.className; document.body.classList.toggle('cv-ph-live', ph === 'live'); document.body.classList.toggle('cv-ph-past', ph === 'past'); if(was !== document.body.className && typeof viPhase === 'function') try { viPhase(); } catch(e){}
    // barre d'état Android (appli Google Play et Chrome) : même couleur que l'en-tête de la période
    try { const c = getComputedStyle(document.body).getPropertyValue('--navy').trim(), m = document.querySelector('meta[name="theme-color"]'); if(c && m && m.content !== c) m.content = c; } catch(e){} }
  function render(){
    phaseTheme();
    setTimeout(moments, 900); setTimeout(liveMapHydrate, 80); setTimeout(lgHydrate, 120); setTimeout(cdHydrate, 70); setTimeout(bbMapHydrate, 90); setTimeout(lnHydrate, 60); setTimeout(poem, 0); setTimeout(progMapHydrate, 120); setTimeout(()=>{ if(document.querySelector('.cv-anniv img[data-ph]:not([data-ok])')) hydrate(); }, 60);
    const body = document.getElementById('cv-body');
    const fab = document.getElementById('cv-fab');
    const t = trip();
    fab.style.display = 'none';
    if(modeRender()) return;
    if(!t && !['envies','reglages','prefs','livret','badges'].includes(M.tab)){
      // abonné qui n’a pas encore de voyage à lui : les personnes qu’il suit d’abord, chacune vers son carnet
      const fol = (()=>{ try { return followHTML(); } catch(e){ return ''; } })(); if(fol) setTimeout(()=>{ folPaint(); hydrate(); }, 40);
      body.innerHTML = (fol ? `<div class="home-fol">${fol}</div>` : '') + `<div class="v-box"><h2 class="vb-h">${fol ? 'Mes propres voyages' : 'Aucun voyage'}</h2><p>${fol ? 'Tu n’as pas encore de voyage à toi : prépare le tien quand tu veux.' : 'Crée un voyage, ou transforme une envie en voyage depuis l’onglet ✨ Envies.'}</p>
        <button class="v-btn" onclick="CV.newTrip()">＋ Nouveau voyage</button>${tutoBtn()}${demoBtn()}</div>`;
      return;
    }
    if(CATS[M.tab]) renderList(M.tab);
    else if(M.tab==='prog') renderProg();
    else if(M.tab==='notes') renderNotes();
    else if(M.tab==='budget') renderBudget();
    else if(M.tab==='ech') renderEch();
    else if(M.tab==='souv') renderSouv();
    else if(M.tab==='check') renderCheck();
    else if(M.tab==='envies') renderEnvies();
    else if(M.tab==='outils') renderOutils();
    else if(M.tab==='prefs') renderPrefs();
    else if(M.tab==='livret') renderLivret();
    else if(M.tab==='badges') renderBadges();
    else renderReglages();
    const fabs = {transport:1, hotel:1, activite:1, divers:1, notes:1, envies:1, prog:1, souv:1};
    if(fabs[M.tab] && (t || M.tab==='envies')){
      fab.style.display = 'block';
      fab.textContent = CATS[M.tab] ? '＋ ' + CATS[M.tab].one : M.tab==='envies' ? '＋ Envie' : M.tab==='souv' ? '＋ Souvenir' : '＋ Note';
    }
  }
  function add(){
    if(CATS[M.tab]) edit(null, M.tab);
    else if(M.tab==='envies') editWish(null);
    else if(M.tab==='souv') editSouv(null);
    else editNote(null, '');
  }

  /* ── Filtre « pour qui » (départs / retours séparés) ── */
  function whoBar(){
    const v = tv(); if(v.length < 2 || hidden('blk:who')) return '';
    return `<div class="v-filters cv-whobar"><span class="cv-lbl">Voir pour</span>
      <button class="v-chip${M.who==='all'?' on':''}" onclick="CV.who('all')">Tout le monde</button>
      ${v.map(id=>`<button class="v-chip cv-pc${M.who===id?' on':''}" style="--pc:${pcol(id)}" onclick="CV.who('${id}')">${esc(pname(id))}</button>`).join('')}</div>`;
  }
  function setWho(id){ M.who = id; persist(); render(); }

  /* ══════════ Listes par catégorie ══════════ */
  function priceHTML(it){
    const n = parts(it).length, pp = partage(it)==='pp';
    const per = n>1 && pp ? '<small>/pers</small>' : '';
    const tag = n>1 && chargeOf(it).mode==='egal' ? `<div class="v-ptag">${pp ? '× '+n+' = '+eur(totalOf(it)) : 'partagé · '+eur(base(it)/n)+'/pers'}</div>` : '';
    if(hasPrix(it)) return `<div class="v-price">${eur(num(it.prix))}${per}</div>${tag}`;
    if(num(it.estime)) return `<div class="v-price est">≈ ${eur(num(it.estime))}${per}</div>${tag}`;
    return '';
  }
  function subline(it){
    const bits = [];
    if(it.cat==='transport'){
      if(it.date) bits.push(fdate(it.date));
      const h = [it.heureDep, it.heureArr].filter(Boolean).join(' → '); if(h) bits.push(h);
      if(it.from || it.to) bits.push([it.from, it.to].filter(Boolean).join(' → '));
      if(it.compagnie) bits.push(it.compagnie);
    } else if(it.cat==='hotel'){
      if(it.date) bits.push(fdate(it.date) + (it.dateFin ? ' → ' + fdate(it.dateFin) : ''));
      const n = nights(it.date, it.dateFin); if(n) bits.push(n + ' nuit' + (n>1?'s':''));
      if(it.nom) bits.push(it.nom);
    } else {
      if(it.date) bits.push(fdate(it.date));
      if(it.heure) bits.push(it.heure);
    }
    if(it.ref) bits.push('Réf. ' + it.ref);
    return bits.map(esc).join(' · ');
  }
  function quiLine(it){
    if(!subset(it)) return '';
    const p = parts(it);
    return `<div class="cv-qui"><span class="ins">${p.map(ini).join('')}</span>${p.map(id=>esc(pname(id))).join(', ')} seulement</div>`;
  }
  function card(it){
    const ns = notesFor('item:'+it.id);
    const pinned = ns.filter(n=>n.pin);
    const showHint = it.hint && it.statut==='todo' && !hidden('blk:hints');
    return `<div class="v-card ${it.statut}" onclick="CV.edit('${it.id}')">
      <div class="v-card-ico">${icon(it)}</div>
      <div class="v-card-main">
        <div class="v-card-title">${esc(it.titre)}${ns.length?` <span class="cv-nbadge">📌${ns.length}</span>`:''}</div>
        <div class="v-card-sub">${subline(it)}</div>
        ${quiLine(it)}
        ${pinned.slice(0,2).map(n=>`<div class="cv-pinline" style="--pc:${pcol(n.createdBy)}">📌 ${esc(n.texte.slice(0,140))}</div>`).join('')}
        ${showHint ? `<div class="v-card-hint">💡 ${esc(it.hint)}</div>` : ''}
        ${payLine(it)}
        ${linksHTML(it)}
        ${byline(it)}
      </div>
      <div class="v-card-side">
        ${priceHTML(it)}
        <button class="v-status ${it.statut}" onclick="event.stopPropagation();CV.cycle('${it.id}')">${STATUTS[it.statut]||'À réserver'}</button>
      </div>
    </div>`;
  }
  /* Carte « Que voir ? » : un bouton par étape, ouvre la recherche des lieux à visiter */
  function discoverCard(compact){
    const t = trip(); if(!t || hidden('blk:disc')) return '';
    const seen = new Set(), key = x => normQ(cityOf(x||''));
    const st = items(i=>i.cat==='hotel').sort((a,b)=>(a.date||'').localeCompare(b.date||''))
      .filter(h=>{ const c = key(h.titre); if(!c || seen.has(c)) return false; seen.add(c); return true; });
    const cs = voirCities().filter(c=>{ const k = key(c.titre); if(!k || seen.has(k)) return false; seen.add(k); return true; });
    if(!st.length && !cs.length && t.archived) return '';
    return `<div class="cv-disc-card${compact?' compact':''}"><div class="dt">🧭 Explorer les étapes du voyage</div>
      ${compact ? '' : '<div class="dd">Les plus beaux endroits, quoi faire, où manger… Touche une ville pour partir à la découverte.</div>'}
      <div class="dc">${st.map(h=>`<button type="button" onclick="CV.explore('${h.id}')">🧭 ${esc(stayCity(h))}</button>`).join('')}${cs.map(c=>`<button type="button" class="cy" onclick="CV.explore('${c.id}')">🧭 ${esc(c.titre)}</button>`).join('')}<button type="button" class="add" onclick="CV.voirAdd()">＋ Lieu</button></div>
      ${!st.length && !cs.length ? '<div class="de">Ajoute une ville, une excursion ou un quartier (les étapes de tes hôtels apparaissent aussi ici).</div>' : ''}</div>`;
  }
  function renderList(cat){
    const all = items(i => i.cat===cat).sort(sortItems);
    const mine = all.filter(forWho);
    const f = M.filt[cat] || 'all';
    const shown = f==='all' ? mine : mine.filter(i=>i.statut===f);
    const n = mine.length, paid = mine.filter(i=>i.statut==='paid').length, booked = mine.filter(i=>i.statut==='booked').length;
    const proj = M.who==='all' ? mine.reduce((s,i)=>s+totalOf(i),0) : mine.reduce((s,i)=>s+shareOf(i,M.who),0);
    const reel = M.who==='all' ? mine.reduce((s,i)=>s+totalOf(i,'reel'),0) : mine.reduce((s,i)=>s+shareOf(i,M.who,'reel'),0);
    const nv = tv().length;
    let h = whoBar() + (cat==='activite' ? discoverCard() : '') + `<div class="v-sum">
      <div class="v-sum-row"><div class="v-sum-big">${eur(proj)}</div><div class="v-sum-small">${paid+booked}/${n} réservés · ${paid} payés</div></div>
      <div class="v-sum-small">${M.who!=='all' ? 'Part de '+esc(pname(M.who)) : nv>1 ? 'Total pour '+nv+' · soit ≈ '+eur(proj/nv)+' par personne' : 'Projection'} · réel saisi : ${eur(reel)}</div>
      <div class="v-bar"><span class="b-paid" style="width:${n?paid/n*100:0}%"></span><span class="b-booked" style="width:${n?booked/n*100:0}%"></span></div>
      ${cat==='transport' && ESCALE && !hidden('blk:escale') ? `<button type="button" class="cv-escale-tuto" style="margin:10px 0 0" onclick="CV.escaleTuto()">🎓 Tuto Escale premium</button>` : ''}
      ${cat==='transport' && ESCALE && !hidden('blk:escale') ? `<a class="cv-escale-mini" href="${ESCALE}">🛫 Chercher les meilleurs prix de vols avec <b>Escale</b> ↗${PUBLIC ? '<small>Mode soft : prix indicatifs en cache (Travelpayouts). Tarifs en direct, Booking, voitures et attractions : mode premium sur code d’accès.</small>' : ''}</a>` : ''}
    </div>
    ${['transport','hotel','activite'].includes(cat) && !hidden('blk:imp') && trip() && !trip().archived ? `<button type="button" class="cv-impbtn" onclick="CV.impSheet('${cat}')">📄 Importer une résa <small>PDF ou mail de confirmation</small></button>` : ''}
    <div class="v-filters">${[['all','Tous'],['todo','À réserver'],['booked','Réservé'],['paid','Payé']].map(([k,l])=>
      `<button class="v-chip${f===k?' on':''}" onclick="CV.filter('${cat}','${k}')">${l}</button>`).join('')}</div>`;
    if(!shown.length) h += `<div class="v-empty">Encore rien par ici.<br>Le bouton ＋ est fait pour ça.</div>`;
    h += shown.map(card).join('');
    document.getElementById('cv-body').innerHTML = h;
  }
  function filter(cat,k){ M.filt[cat] = k; persist(); render(); }
  function cycle(id){
    const it = R[id]; if(!it) return;
    it.statut = NEXT[it.statut] || 'booked';
    put(it, STATUTS[it.statut] + ' ✓'); render();
  }

  /* ══════════ Panneaux (bottom sheet) ══════════ */
  let editing = null;
  const sheetOpen = () => !!document.getElementById('v-sheet-bg');
  function field(lbl, name, val, type, extra){
    return `<div class="v-f"><label>${lbl}</label><input class="v-in" name="${name}" type="${type||'text'}" value="${esc(val)}" ${extra||''}></div>`;
  }
    /* ── Fenêtres : croix ✕ toujours visible, flèche ← vers l’écran d’avant, glisser vers le bas pour fermer ── */
  let shStack = [], shCur = '', shPend = null, shBack = false;
  const shTitle = h => ((String(h).match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [])[1] || '').replace(/<[^>]+>/g, '').trim();
  const shMenu = h => !/<form|<input|<textarea|<select/i.test(h);   // un menu (des choix) : on peut y revenir sans rien perdre
  function shNav(html, locked, prevOpen){
    if(locked){ shStack = []; shPend = null; shCur = ''; return; }
    let from = null;
    if(prevOpen) from = shCur;
    else if(shPend){ from = shPend.cur; shStack = shPend.stack; }
    else shStack = [];
    if(from && !shBack && shTitle(from) !== shTitle(html)){
      if(shMenu(from)) shStack.push(from);
      if(shStack.length > 8) shStack.shift();
    }
    shPend = null; shBack = false; shCur = html;
  }
  const shBar = locked => locked ? '' : `<div class="sh-bar">${shStack.length ? '<button type="button" class="sh-bk" aria-label="Retour" onclick="CV.sheetBack()">←</button>' : ''}<button type="button" class="sh-x" aria-label="Fermer" onclick="CV.xClose()">✕</button></div>`;
  function sheetBack(){
    const h = shStack.pop(); if(!h){ xClose(); return; }
    shBack = true; openSheet(h);
  }
  async function xClose(){
    // l’assistant de création déjà commencé : on demande avant de tout perdre
    const wt = document.getElementById('wz-titre');
    if(document.getElementById('wz') && typeof wz === 'object' && wz && (wz.step > 1 || (wz.titre || '').trim() || (wt && wt.value.trim()))){
      if(!(await uiConfirm('Abandonner la création du voyage ?'))) return;
    }
    shStack = []; closeSheet();
  }
  function shSwipe(bg){
    let y0 = null, dy = 0, sh = null;
    bg.addEventListener('touchstart', e => {
      sh = bg.querySelector('.v-sheet'); y0 = null; dy = 0;
      if(!sh || bg.dataset.locked || e.touches.length !== 1) return;
      const t = e.touches[0], r = sh.getBoundingClientRect();
      if(sh.scrollTop <= 0 && t.clientY - r.top < 64 && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) y0 = t.clientY;
    }, {passive:true});
    bg.addEventListener('touchmove', e => {
      if(y0 === null || !sh) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      sh.style.transition = 'none'; sh.style.transform = dy ? `translateY(${dy}px)` : '';
    }, {passive:true});
    bg.addEventListener('touchend', () => {
      if(y0 === null || !sh) return;
      const s = sh; y0 = null;
      if(dy > 90){ s.style.transition = 'transform .18s ease-in'; s.style.transform = 'translateY(110%)'; setTimeout(() => { if(s.isConnected){ s.style.transform = ''; xClose(); } }, 170); }
      else { s.style.transition = 'transform .2s ease-out'; s.style.transform = ''; }
      dy = 0;
    }, {passive:true});
  }
  function openSheet(html, locked){
    const prev = document.getElementById('v-sheet-bg');
    shNav(html, locked, !!(prev && !prev.dataset.locked));
    if(prev && !prev.dataset.locked === !locked){   // fenêtre déjà ouverte : on change son contenu sans rejouer l’animation (plus de flash)
      const ro = M.lock && /<form|v-actions/.test(html) && !locked;
      prev.className = 'v-sheet-bg';
      const sh = document.createElement('div'); sh.className = 'v-sheet' + (ro ? ' ro' : '') + (!locked && shStack.length ? ' has-bk' : ''); sh.style.animation = 'none';
      sh.innerHTML = `${shBar(locked)}${locked?'':'<div class="v-grab"></div>'}${ro?'<div class="cv-robanner">🔒 Lecture seule</div>':''}${html}`;
      const old = prev.querySelector('.v-sheet'), pool = imgPool(old); if(old) old.replaceWith(sh); else prev.appendChild(sh);
      imgReuse(sh, pool);
      document.body.style.overflow = 'hidden';
      if(/data-[rt]map=/.test(html)) setTimeout(hydrateMaps, 30);
      if(/data-ph=/.test(html)) setTimeout(hydrate, 30);
      return;
    }
    if(prev) prev.remove();
    const bg = document.createElement('div');
    bg.className = 'v-sheet-bg'; bg.id = 'v-sheet-bg';
    const ro = M.lock && /<form|v-actions/.test(html) && !locked;
    bg.innerHTML = `<div class="v-sheet${ro?' ro':''}${!locked && shStack.length ? ' has-bk' : ''}">${shBar(locked)}${locked?'':'<div class="v-grab"></div>'}${ro?'<div class="cv-robanner">🔒 Lecture seule</div>':''}${html}</div>`;
    if(!locked){ bg.addEventListener('click', e=>{ if(e.target===bg) xClose(); }); shSwipe(bg); }
    if(locked) bg.dataset.locked = '1';
    document.body.appendChild(bg);
    document.body.style.overflow = 'hidden';
    if(/data-[rt]map=/.test(html)) setTimeout(hydrateMaps, 30);
    if(/data-ph=/.test(html)) setTimeout(hydrate, 30);
  }
  function closeSheet(force){
    const bg = document.getElementById('v-sheet-bg');
    if(bg && bg.dataset.locked && force!==true) return;
    if(bg && !bg.dataset.locked && shCur){ const pend = shPend = {cur: shCur, stack: shStack}; setTimeout(() => { if(shPend === pend) shPend = null; }, 0); }
    shStack = []; shCur = '';
    if(bg) bg.remove();
    try { localStorage.removeItem('cv-resume'); } catch(e){}
    document.body.style.overflow = '';
    editing = null; impCtx = null;
  }
  const actions = (del) => `<div class="v-actions">
      <button type="submit" class="v-btn">Enregistrer</button>
      ${del ? `<button type="button" class="v-btn danger cv-sq" onclick="${del}" aria-label="Supprimer">🗑</button>` : ''}
      <button type="button" class="v-btn sec cv-sq" onclick="CV.close()" aria-label="Fermer">✕</button>
    </div>`;
  function segBtns(id, opts, cur, attr){
    return `<div class="v-seg v-seg2" id="${id}">${opts.map(([k,l])=>`<button type="button" class="${k===cur?'on':''}" data-v="${k}" onclick="CV.seg(this)">${l}</button>`).join('')}</div>`;
  }
  function seg(btn){ btn.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); if(document.getElementById('cv-live')) live(); }
  const segVal = id => { const b = document.querySelector('#'+id+' button.on'); return b ? b.dataset.v : null; };
  function peopleSel(id, pool, selected){
    return `<div class="cv-qsel" id="${id}">${pool.map(pid=>`<button type="button" class="${selected.includes(pid)?'on':''}" data-p="${pid}" style="--pc:${pcol(pid)}" onclick="this.classList.toggle('on');CV.live()">${esc(pname(pid))}</button>`).join('')}</div>`;
  }
  const peopleVal = id => [...document.querySelectorAll('#'+id+' button.on')].map(b=>b.dataset.p);

  /* ── Fiche trajet / hôtel / visite / dépense ── */
  function edit(id, newCat){
    let draft = null; if(id && typeof id === 'object'){ draft = id; id = null; newCat = draft.cat; }
    const src = draft ? Object.assign({id:null, type:'item', trip:M.trip, titre:'', statut:'todo', date:'', mode:'Avion', qui:[]}, draft) : id ? R[id] : {id:null, type:'item', trip:M.trip, cat:newCat, titre:'', statut:'todo', date:'', mode:'Avion', qui: M.who!=='all' ? [M.who] : []};
    if(!src) return;
    const it = clone(src); editing = it;
    const c = it.cat;
    let h = `<h2>${icon(it)} ${id ? esc(it.titre) : 'Nouveau ' + CATS[c].one}</h2>`;
    if(draft && impCtx) h += impTypeBar(c);
    if(!id && !draft && ['transport','hotel','activite'].includes(c)) h += `<button type="button" class="cv-tjbtn ed-imp" onclick="CV.impSheet('${c}')"><span>📄</span><span><b>Importer une réservation</b><small>PDF, capture d’écran, billet ou QR code : la fiche se remplit toute seule</small></span></button>`;
    if(id) h += byline(it);
    if(it.hint) h += `<div class="v-hint">💡 ${esc(it.hint)}</div>`;
    h += `<div id="cv-fbook">${bookHTML(it)}</div>`;
    h += `<form id="v-form" onsubmit="event.preventDefault();CV.saveForm()" oninput="CV.live()">`;
    h += `<div class="v-f"><label>Statut</label><div class="v-seg" id="v-seg">${Object.entries(STATUTS).map(([k,l])=>
      `<button type="button" class="${k}${it.statut===k?' on':''}" data-v="${k}" onclick="CV.seg(this)">${l}</button>`).join('')}</div></div>`;
    h += field(c==='hotel'?'Étape / ville':'Intitulé', 'titre', it.titre, 'text', 'required');
    const v = tv();
    if(v.length > 1){
      const sel = (it.qui && it.qui.length) ? it.qui : v;
      h += `<div class="v-f"><label>${c==='transport'?'Qui fait ce trajet ?':c==='hotel'?'Qui dort ici ?':'Pour qui ?'}</label>${peopleSel('cv-qui', v, sel)}
        <div class="v-sum-small" style="margin-top:4px">Décoche ceux qui ne sont pas concernés (ex. retour séparé : l’un vers Lyon, l’autre vers Bruxelles).</div></div>`;
    }
    if(c==='transport'){
      h += `<div class="v-f"><label>Mode</label><select class="v-in" name="mode">${Object.keys(MODE_ICON).map(m=>`<option${it.mode===m?' selected':''}>${m}</option>`).join('')}</select></div>`;
      h += `<div class="v-f2">${field('Départ','from',it.from)}${field('Arrivée','to',it.to)}</div>`;
      h += `<div class="v-f2">${field('Date','date',it.date,'date')}${field('Compagnie / n° vol','compagnie',it.compagnie)}</div>`;
      h += `<div class="v-f2">${field('Heure départ','heureDep',it.heureDep,'time')}${field('Heure arrivée','heureArr',it.heureArr,'time')}</div>`;
    } else if(c==='hotel'){
      h += field('Nom de l’hôtel / du bateau','nom',it.nom);
      h += `<div class="v-f2">${field('Arrivée','date',it.date,'date')}${field('Départ','dateFin',it.dateFin,'date')}</div>`;
      h += field('Adresse','adresse',it.adresse);
      h += `<div class="v-f2">${field('Check-in','heure',it.heure,'time')}${field('Téléphone','tel',it.tel,'tel')}</div>`;
    } else {
      h += `<div class="v-f2">${field('Date','date',it.date,'date')}${field('Heure / créneau','heure',it.heure,'time')}</div>`;
      h += field('Lieu / prestataire','adresse',it.adresse);
    }
    h += `<div class="v-f2">${field('Prix réel (' + CS() + ')','prix',it.prix,'text','inputmode="decimal" placeholder="à saisir"')}${field('Estimation (' + CS() + ')','estime',it.estime,'text','inputmode="decimal"')}</div>`;
    h += fxFormRow();
    h += pjBlock(it);
    if(id && it.cat==='divers') h += it.recu ? `<div class="v-f"><label>🧾 Ticket</label><button type="button" class="cv-rc" onclick="CV.rcView('${id}')"><img data-ph="${esc(it.recu)}.t" alt=""><span><b>Voir le ticket</b><small>touche pour l’agrandir</small></span></button></div>`
      : `<div class="v-f"><button type="button" class="v-day-edit" onclick="CV.rcAttach('${id}')">📷 Joindre la photo du ticket</button></div>`;
    h += `<div class="v-f"><label>Le prix saisi est</label>${segBtns('cv-part', [['pp','Par personne'],['grp','Global, partagé']], partage(it))}
      <div class="v-sum-small" style="margin-top:4px">Par personne : compté pour chaque voyageur concerné (vol, billet). Global : divisé entre eux (chambre, guide privé).</div></div>`;
    h += payForm(it);
    h += field('N° de réservation','ref',it.ref);
    h += field('Lien de ma réservation (Booking, compagnie…)','lien',it.lien,'url','placeholder="https://"');
    h += `<div id="cv-flinks">${linksHTML(it, true)}</div>`;
    if(id){
      const ns = notesFor('item:'+id);
      h += `<div class="v-f" style="margin-top:12px"><label>📌 Notes sur cet élément</label>
        ${ns.map(n=>noteCard(n,true)).join('') || '<div class="v-sum-small">Aucune note.</div>'}
        <button type="button" class="v-day-edit" onclick="CV.noteFromItem()">＋ Ajouter une note</button></div>`;
    }
    h += actions(id ? `CV.del('${id}')` : '') + `</form>`;
    openSheet(h);
    liveInit();
  }
  function readForm(){
    const it = editing; if(!it) return null;
    const fd = new FormData(document.getElementById('v-form'));
    for(const [k,v] of fd.entries()) it[k] = String(v).trim();
    it.statut = segVal('v-seg') || 'todo';
    it.partage = segVal('cv-part') || partage(it);
    if(document.getElementById('cv-qui')){
      const q = peopleVal('cv-qui');
      it.qui = (!q.length || q.length === tv().length) ? [] : q;
    }
    readPay(it);
    return it;
  }
  function saveForm(keepOpen){
    const it = readForm(); if(!it) return false;
    if(!it.titre){ alert('Donne un intitulé.'); return false; }
    if(!it.id && !keepOpen && dupOf(it).length){ dupAsk([it]); return false; }
    const isNew = !it.id; if(isNew) it.id = 'i' + uid();
    const was = R[it.id], booked = x => x && (x.statut === 'booked' || x.statut === 'paid');
    if(isNew || !sameItem(was, it)) put(it);
    if(!keepOpen && (isNew || (booked(it) && !booked(was)))) setTimeout(()=>fxFor(it), 250);   // nouveau ou tout juste réservé
    if(keepOpen) return it.id;
    closeSheet(); render(); return it.id;
  }
  function sameItem(a, b){
    if(!a || !b) return false;
    const norm = v => Array.isArray(v) ? (v.length ? JSON.stringify(v) : '') : (v && typeof v==='object') ? (Object.keys(v).length ? JSON.stringify(v) : '') : (v == null ? '' : String(v));
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for(const k of keys){
      if(k==='partage'){ if(partage(a)!==partage(b)) return false; continue; }
      if(k==='charge'){ if(JSON.stringify(chargeOf(a))!==JSON.stringify(chargeOf(b))) return false; continue; }
      if(k==='payeur'){ if((a.payeur||'chacun')!==(b.payeur||'chacun')) return false; continue; }
      if(norm(a[k]) !== norm(b[k])) return false;
    }
    return true;
  }
  function noteFromItem(){ const id = saveForm(true); if(!id) return; editNote(null, 'item:'+id); }
  async function del(id){
    const it = R[id];
    if(!it || !(await uiConfirm('Supprimer « ' + (it.titre||'') + ' » ?'))) return;
    drop(id); closeSheet(); render();
  }

  /* ══════════ Jours ══════════ */
  const openD = {};
  const dayId = d => 'day:' + M.trip + ':' + d;
  function dayInfo(d){ const r = R[dayId(d)]; return r && !r.deleted ? r : {titre:'', plan:''}; }
  function dayList(){
    const t = trip(); const s = new Set(range(t.debut, t.fin));
    list('day', r=>r.trip===M.trip).forEach(r=>s.add(r.date));
    items().forEach(i=>{ if(i.date) s.add(i.date); });
    return [...s].filter(Boolean).sort();
  }
  function itemsForDay(d){
    const own = items(i=>i.date===d && i.cat!=='hotel' && forWho(i)).sort(sortItems);
    const night = items(i=>i.cat==='hotel' && i.date && forWho(i) && (i.dateFin ? (i.date<=d && d<i.dateFin) : i.date===d));
    return {own, night};
  }
  function pinBoard(){
    const pins = list('note', n=>n.trip===M.trip && n.pin).sort((a,b)=>b.updatedAt-a.updatedAt);
    if(!pins.length || hidden('blk:pins')) return '';
    const open = M.pinOpen !== false;
    return `<div class="cv-pinboard${open?'':' closed'}"><button type="button" class="cv-pinboard-h cv-pin-tog" onclick="CV.pinToggle()" aria-expanded="${open}">📌 Épinglé <span class="n">${pins.length}</span><span class="ch">${open?'▴ replier':'▾ déplier'}</span></button>${open ? pins.map(n=>noteCard(n,true)).join('') : ''}</div>`;
  }
  function pinToggle(){ M.pinOpen = M.pinOpen === false; persist(); const y = window.scrollY; render(); window.scrollTo(0, y); }

  /* 🎌 jours fériés (Nager.Date, gratuit) et 🌅 lever / coucher du soleil (calculé ici, à l’heure locale de l’étape) */
  function sunUtc(d, lat, lng){   // équation du lever de soleil (précision ~1 min)
    const r = Math.PI / 180, J = Date.parse(d + 'T12:00:00Z') / 864e5 + 2440587.5, n = Math.round(J - 2451545 + .0008), Js = n - lng / 360;
    const Mm = (357.5291 + .98560028 * Js) % 360, C = 1.9148 * Math.sin(Mm * r) + .02 * Math.sin(2 * Mm * r) + .0003 * Math.sin(3 * Mm * r);
    const L = (Mm + C + 282.9372) % 360, Jt = 2451545 + Js + .0053 * Math.sin(Mm * r) - .0069 * Math.sin(2 * L * r), dec = Math.asin(Math.sin(L * r) * Math.sin(23.4397 * r));
    const cw = (Math.sin(-.833 * r) - Math.sin(lat * r) * Math.sin(dec)) / (Math.cos(lat * r) * Math.cos(dec));
    if(cw < -1) return {polar:'day'}; if(cw > 1) return {polar:'night'};
    const w = Math.acos(cw) / r / 360, toD = j => new Date((j - 2440587.5) * 864e5);
    return {rise:toD(Jt - w), set:toD(Jt + w)};
  }
  const stayOn = d => list('item', i=>i.trip === M.trip && i.cat === 'hotel' && i.date && i.date <= d && (i.dateFin ? d < i.dateFin : d === i.date)).sort((a, b)=>b.date.localeCompare(a.date))[0]
    || list('item', i=>i.trip === M.trip && i.cat === 'hotel' && i.dateFin === d)[0];
  function daySun(d){
    const h = stayOn(d); if(!h) return null; const k = normQ(stayCity(h)), g = R['geo:' + k], tz = (M.tz || {})[k];
    if(!g || g.lat == null || !tz) return null;
    const s = sunUtc(d, +g.lat, +g.lng); if(s.polar) return s;
    try { const f = new Intl.DateTimeFormat((window.I18N && I18N.lang) || 'fr', {timeZone:tz, hour:'2-digit', minute:'2-digit'}); return {rise:f.format(s.rise), set:f.format(s.set)}; } catch(e){ return null; }
  }
  const sunTxt = s => !s ? '' : s.polar === 'day' ? '☀️ ' + MSGT('Soleil de minuit') : s.polar === 'night' ? '🌑 ' + MSGT('Nuit polaire') : `🌅 ${s.rise} · 🌇 ${s.set}`;
  const HOL_FR = ['FR', 'BE', 'CH', 'LU', 'MC', 'CA'];
  function dayHol(d){
    const h = stayOn(d); if(!h) return null; const c = (M.ctry || {})[normQ(stayCity(h))]; if(!c || !c.cc) return null;
    const L = (M.hol || {})[c.cc + d.slice(0, 4)]; const x = L && L.find(y=>y.d === d); return x ? {cc:c.cc, n:x.n} : null;
  }
  const DX = {};
  async function dayExtras(t){
    if(!t || !t.debut) return;
    const hs = list('item', i=>i.trip === t.id && i.cat === 'hotel' && i.date), seen = new Set(), sig = hs.map(h=>h.titre + h.date + h.dateFin).join('|');
    if(DX[t.id] === sig){ hoodEnsure(t); return; } DX[t.id] = sig; let ch = 0;
    for(const x of [...new Set([...hs.map(h=>cityOf(h.titre || '')), ...hs.map(h=>h.base), ...titleCities(t)].filter(Boolean))].slice(0, 12)){
      const k = normQ(x); if(R['geo:' + k] && R['geo:' + k].lat != null && (M.ctry || {})[k]) continue; if(await cityInfo(x).catch(()=>null)) ch = 1; }
    for(const h of hs){
      const city = stayCity(h); if(!city) continue; const k = normQ(city); if(seen.has(k)) continue; seen.add(k);
      let c = (M.ctry || {})[k], g = R['geo:' + k];
      if(!c || !c.cc || !g || g.lat == null){ const o = await cityInfo(city).catch(()=>null); if(!o) continue; ch = 1; g = R['geo:' + k]; c = (M.ctry || {})[k]; }
      M.tz = M.tz || {};
      if(!M.tz[k] && g && g.lat != null){ try { const j = await expJ(`https://api.open-meteo.com/v1/forecast?latitude=${(+g.lat).toFixed(3)}&longitude=${(+g.lng).toFixed(3)}&timezone=auto&forecast_days=1&daily=sunrise`, 9000); if(j && j.timezone){ M.tz[k] = j.timezone; ch = 1; } } catch(e){} }
      M.hol = M.hol || {};
      if(c && c.cc) for(const y of new Set([h.date.slice(0, 4), (h.dateFin || h.date).slice(0, 4)])){
        const hk = c.cc + y; if(M.hol[hk]) continue;
        try { const j = await expJ(`https://date.nager.at/api/v3/PublicHolidays/${y}/${c.cc}`, 9000);
          M.hol[hk] = (Array.isArray(j) ? j : []).filter(x=>x.global !== false || !x.counties).map(x=>({d:x.date, n:HOL_FR.includes(c.cc) ? x.localName : x.name})); ch = 1;
        } catch(e){ M.hol[hk] = []; }
      }
    }
    if(ch){ const ks = Object.keys(M.hol || {}); if(ks.length > 40) delete M.hol[ks[0]]; persist(); refresh(); }
    hoodEnsure(t);
  }
  /* 🏘️ croisement visites × hébergement : le quartier le plus central par rapport à ce que tu as choisi, les visites éloignées, l’aéroport le plus pratique */
  async function revName(lat, lng, zoom){
    const wait = 1100 - (Date.now() - geoLast); if(wait > 0) await new Promise(r=>setTimeout(r, wait)); geoLast = Date.now();
    const j = await expJ(`${GEO}reverse?format=jsonv2&zoom=${zoom}&addressdetails=1&accept-language=${(window.I18N && I18N.lang) || 'fr'}&lat=${lat.toFixed(5)}&lon=${lng.toFixed(5)}`, 10000);
    const a = (j && j.address) || {};
    return zoom >= 14 ? (a.suburb || a.quarter || a.neighbourhood || a.city_district || a.borough || a.village || a.town || a.city || '') : (a.city || a.town || a.village || a.municipality || '');
  }
  const stayPlaces = (t, h) => list('place', p=>p.trip === t.id && !p.sugg && p.lat != null && p.lng != null && (p.stay === h.id || (!p.stay && p.date >= h.date && p.date < (h.dateFin || h.date))));
  const mid = a => { const b = a.slice().sort((x, y)=>x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  const HX = {};
  async function hoodEnsure(t){
    if(!t || HX[t.id]) return; HX[t.id] = 1; let ch = 0; M.hood = M.hood || {}; M.apt = M.apt || {};
    try {
      const hs = list('item', i=>i.trip === t.id && i.cat === 'hotel' && i.date).sort((a, b)=>a.date.localeCompare(b.date)); let first = null;
      for(const h of hs){
        const P = stayPlaces(t, h), sig = P.map(p=>p.id).sort().join(',') + '|' + h.titre;
        if(P.length < 2){ if(M.hood[h.id]){ delete M.hood[h.id]; ch = 1; } continue; }
        const c0 = {lat:mid(P.map(p=>+p.lat)), lng:mid(P.map(p=>+p.lng))}, main = P.filter(p=>rawKm(c0, p) <= 25), far = P.filter(p=>rawKm(c0, p) > 25);
        if(main.length < 2) continue;
        const c = {lat:main.reduce((s, p)=>s + +p.lat, 0) / main.length, lng:main.reduce((s, p)=>s + +p.lng, 0) / main.length};
        if(!first) first = c;
        const old = M.hood[h.id]; if(old && old.sig === sig) continue;
        const o = {sig, n:main.length, lat:c.lat, lng:c.lng, km:Math.round(main.reduce((s, p)=>s + rawKm(c, p), 0) / main.length * 10) / 10};
        o.name = await revName(c.lat, c.lng, 15).catch(()=>'') || '';
        const hg = R['geo:' + normQ(cityOf(h.titre || ''))]; if(hg && hg.lat != null){ const hk = main.reduce((s, p)=>s + rawKm(hg, p), 0) / main.length; if(hk > o.km + 3) o.hk = Math.round(hk); }
        if(far.length >= 2){ const fc = {lat:far.reduce((s, p)=>s + +p.lat, 0) / far.length, lng:far.reduce((s, p)=>s + +p.lng, 0) / far.length};
          o.far = {n:far.length, km:Math.round(rawKm(c, fc)), name:await revName(fc.lat, fc.lng, 10).catch(()=>'') || ''}; }
        M.hood[h.id] = o; ch = 1;
      }
      // ✈️ aéroport : autour des visites de la 1ʳᵉ étape (sinon de sa ville)
      if(!first && hs[0]){ const g = R['geo:' + normQ(stayCity(hs[0]))]; if(g && g.lat != null) first = {lat:+g.lat, lng:+g.lng}; }
      const fly = list('item', i=>i.trip === t.id && i.cat === 'transport' && /Avion/i.test(i.mode || '')).length;
      if(first && fly){ const ak = first.lat.toFixed(1) + ',' + first.lng.toFixed(1), oa = M.apt[t.id];
        if(!oa || oa.k !== ak || (!oa.iata && Date.now() - (oa.at || 0) > 36e5)){
          const q = `[out:json][timeout:20];nwr["aeroway"="aerodrome"]["iata"](around:150000,${first.lat},${first.lng});out center tags 40;`;
          const one = ep => fetch(ep, {method:'POST', body:'data=' + encodeURIComponent(q), headers:{'Content-Type':'application/x-www-form-urlencoded'}}).then(r=>{ if(!r.ok) throw new Error('osm'); return r.json(); });
          const j = await withTimeout(Promise.any(['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'].map(one)), 25000).catch(()=>null);
          const L = ((j && j.elements) || []).map(e=>{ const tg = e.tags || {}, p = {lat:e.lat ?? (e.center || {}).lat, lng:e.lon ?? (e.center || {}).lon};
              if(p.lat == null || /military/.test(tg['aerodrome:type'] || tg.military || '')) return null; const d = rawKm(first, p), big = /international|intl|internacional|internazionale|internationaal|flughafen/i.test(tg.name || '') || tg['aerodrome:type'] === 'international' || tg.aerodrome === 'international';
              return {name:tg['name:' + ((window.I18N && I18N.lang) || 'fr')] || tg.name || '', iata:tg.iata, km:Math.round(d), sc:d - (big ? 70 : 0)}; }).filter(Boolean).sort((a, b)=>a.sc - b.sc);
          if(L[0]){ M.apt[t.id] = {k:ak, name:L[0].name, iata:L[0].iata, km:L[0].km}; ch = 1; } else M.apt[t.id] = {k:ak, at:Date.now()};
        }
      }
    } finally { HX[t.id] = 0; if(ch){ persist(); refresh(); } }
  }
  function hoodHTML(h, t){
    const o = (M.hood || {})[h.id]; if(!o) return ''; const city = stayCity(h), n = Math.max(1, (t.voyageurs || []).length);
    const where = o.name && normQ(o.name) !== normQ(city) ? o.name + ', ' + city : city;
    return `<div class="ar-hood">${o.name ? `<div>🏘️ ${MSGT('Quartier conseillé pour dormir')} : <b data-notr>${esc(o.name)}</b> · ${String(o.km).replace('.', ',')} km ${MSGT('en moyenne de tes visites')} (${o.n})</div>` : ''}
      ${o.hk ? `<div>🏨 ${MSGT('Ton hébergement actuel est à')} ${o.hk} km ${MSGT('en moyenne de tes visites')}</div>` : ''}
      ${o.far ? `<div>🚆 ${o.far.n} ${MSGT('visites autour de')} <b data-notr>${esc(o.far.name || '…')}</b> (${o.far.km} km) : ${MSGT('pense au train ou à une nuit sur place.')}</div>` : ''}
      ${hidden('blk:book') ? '' : `<div class="ex-ln">${bookA('booking', {what:where, date:h.date, end:h.dateFin, n})}${bookA('airbnb', {city:where, date:h.date, end:h.dateFin, n})}</div>`}</div>`;
  }
  function aptHTML(it, t){
    const a = (M.apt || {})[t.id]; if(!a || !a.iata) return '';
    const f = list('item', i=>i.trip === t.id && i.cat === 'transport' && /Avion/i.test(i.mode || '')).sort((x, y)=>(x.date || '9').localeCompare(y.date || '9'))[0];
    if(!f || f.id !== it.id) return '';
    return `<div class="ar-hood"><div>✈️ ${MSGT('Aéroport le plus pratique')} : <b data-notr>${esc(a.name)} (${esc(a.iata)})</b> · ${a.km} km ${MSGT('de tes visites')}</div></div>`;
  }
  function tripHols(t){
    if(!t || !t.debut) return []; const out = [];
    range(t.debut, t.fin || t.debut).forEach(d=>{ const x = dayHol(d); if(x) out.push(Object.assign({d}, x)); }); return out;
  }
  function renderProg(){
    const ds = dayList();
    const arT = trip(), arOn = !!(arT && !arT.archived && tripPhase(arT) === 'prep' && !hidden('blk:prep'));
    if(arT && !arT.archived && !arT.demo && tripPhase(arT) !== 'past') setTimeout(()=>dayExtras(arT), 400);
    let h = startFil() + pinBar() + (arOn ? ariHTML() : cdHTML() + suggCard() + actBand()) + annivCard() + nextHero() + eveCard() + (arOn ? '' : prepGauge()) + liveCard() + daysBar() + quickBar() + progMap() + pendBar() + whoBar() + pinBoard() + pinnedPolls();
    const tt = trip();
    if(tt && tt.demo) h = `<div class="cv-demo-bar">👀 <b>Voyage de démo</b> : touche à tout, modifie, supprime. Il reste sur ce téléphone et n’est jamais partagé.
        <span class="cv-demo-btns"><button type="button" onclick="CV.demoReset()">↺ Recommencer</button><button type="button" onclick="CV.demoDel()">Supprimer la démo</button></span></div>` + h;
    { const di0 = tt && !tt.archived && !hidden('blk:docs') ? docIssues() : []; if(di0.length) h += `<button type="button" class="cv-docalert" onclick="CV.tlDocs()">⚠️ ${di0.length} document${di0.length>1?'s':''} de voyage à vérifier — ${esc(di0[0])}${di0.length>1?'…':''}</button>`; }
    if(tt && !tt.archived) h += discoverCard(true);
    // (encart Escale retiré du programme : accès par le bouton 🛫 Escale de l'en-tête)
    if(!ds.length) h += '<div class="v-empty">Aucun jour pour l’instant.<br><button type="button" class="v-btn" style="margin-top:10px" onclick="CV.datesSheet()">📅 Fixer les dates du voyage</button></div>';
    const canDays = ds.length && tt && !tt.archived && !M.lock;
    if(canDays) h += `<button type="button" class="cv-addday" onclick="CV.dayAdd('before')">＋ Ajouter un jour avant le J1</button>`;
    h += ds.map((d,idx)=>{
      const info = dayInfo(d);
      const {own, night} = itemsForDay(d);
      const all = [...own, ...night];
      const dn = notesFor('day:'+d);
      const open = openD[d] !== undefined ? openD[d] : true;
      const su0 = daySun(d);
      const row = i => `<div class="v-day-item" onclick="CV.edit('${i.id}')">
          <span>${icon(i)}</span>
          <span class="x">${i.cat==='hotel' ? 'Nuit : ' : ''}${esc(i.titre)}${i.exp && su0 && su0.rise && /^(mon|vol|hel)\|/.test(i.exp) ? ` <small class="v-sun">🌅 ${su0.rise}</small>` : i.exp && su0 && su0.set && /^(sun|cat|cru)\|/.test(i.exp) ? ` <small class="v-sun">🌇 ${su0.set}</small>` : ''}${i.cat==='hotel'&&i.nom ? ' — '+esc(i.nom) : ''}${i.heureDep ? ' · '+esc(i.heureDep) : (i.heure && i.cat!=='hotel' ? ' · '+esc(i.heure) : '')}
          ${subset(i) ? `<span class="cv-qui-in">${parts(i).map(ini).join('')}</span>` : ''}${notesFor('item:'+i.id).length?' <span class="cv-nbadge">📌</span>':''}</span>
          <span class="dot ${i.statut}"></span>
        </div>`;
      return `<div class="v-day" id="d-${d}">
        <div class="v-day-h" onclick="CV.toggleDay('${d}')">
          <span class="v-day-d">${PJ(idx+1)} · ${fdate(d)}${dayHol(d) ? ' · 🎌' : ''}</span>
          <span class="v-day-t">${esc(info.titre) || '—'}</span>
          <span class="v-day-dots">${dn.length?'<span class="cv-nbadge">📌'+dn.length+'</span>':''}${all.map(i=>`<i class="${i.statut}"></i>`).join('')}</span>
        </div>
        ${open ? `<div class="v-day-b">
          ${(()=>{ const ho = dayHol(d), su = daySun(d); return ho || su ? `<div class="v-day-x">${ho ? `<span class="v-hol">🎌 ${MSGT('Jour férié')} ${flag(ho.cc)} <b data-notr>${esc(ho.n)}</b> · ${MSGT('musées, banques et administrations souvent fermés ; sites et transports très fréquentés.')}</span>` : ''}${su ? `<span class="v-sun">${sunTxt(su)}</span>` : ''}</div>` : ''; })()}
          ${info.plan ? `<div class="v-day-plan">${esc(info.plan)}</div>` : ''}
          ${own.map(row).join('')}${night.map(row).join('')}
          ${dn.map(n=>noteCard(n,true)).join('')}
          ${routeHTML(d, true)}
          <div class="cv-row"><button class="v-day-edit" onclick="CV.planDay('${d}')">🗺️ Itinéraire</button><button class="v-day-edit" onclick="CV.editDay('${d}')">✏️ Programme</button>
          <button class="v-day-edit" onclick="CV.editNote(null,'day:${d}')">📌 Note</button>${canDays ? `<button class="v-day-edit cv-dmore" aria-label="Ajouter ou retirer un jour" onclick="CV.dayMenu('${d}')">⋯</button>` : ''}</div>
          ${info.updatedBy ? byline(info) : ''}
        </div>` : ''}
      </div>`;
    }).join('');
    if(canDays) h += `<button type="button" class="cv-addday" onclick="CV.dayAdd('after')">＋ Ajouter un jour à la fin</button>`;
    document.getElementById('cv-body').innerHTML = h;
  }
  function toggleDay(d){ openD[d] = !(openD[d] !== undefined ? openD[d] : true); renderProg(); }
  function editDay(d){
    const info = dayInfo(d);
    openSheet(`<h2>📅 ${fdate(d)}</h2>${byline(info)}
      <form onsubmit="event.preventDefault();CV.saveDay('${d}')">
        <div class="v-f"><label>Titre du jour</label><input class="v-in" id="v-day-titre" value="${esc(info.titre)}"></div>
        <div class="v-f"><label>Programme</label><textarea class="v-in" id="v-day-plan" style="min-height:140px">${esc(info.plan)}</textarea></div>
        ${actions('')}
      </form>`);
  }
  function saveDay(d){
    const r = Object.assign(clone(R[dayId(d)] || {}), {id:dayId(d), type:'day', trip:M.trip, date:d,
      titre: document.getElementById('v-day-titre').value.trim(), plan: document.getElementById('v-day-plan').value});
    delete r.deleted;
    put(r); closeSheet(); render();
  }

  /* ══════════ Notes épinglées ══════════ */
  const noteSort = (a,b) => (b.pin?1:0)-(a.pin?1:0) || (b.updatedAt||0)-(a.updatedAt||0);
  function notesFor(ref){ return list('note', n=>n.trip===M.trip && (n.ref||'')===ref).sort(noteSort); }
  function refLabel(ref){
    if(!ref) return '🗒️ Général';
    if(ref.startsWith('item:')){ const it = R[ref.slice(5)]; return it && !it.deleted ? icon(it)+' '+esc(it.titre) : '— élément supprimé'; }
    if(ref.startsWith('day:')){ const d = ref.slice(4), t = dayInfo(d).titre; return '📅 ' + fdate(d) + (t ? ' · ' + esc(t) : ''); }
    return '';
  }
  function noteCard(n, compact){
    return `<div class="cv-note${n.pin?' pin':''}${compact?' compact':''}" style="--pc:${pcol(n.createdBy)}">
      <div class="cv-note-h">
        ${compact ? '' : `<span class="cv-note-ref" onclick="CV.openRef('${n.ref||''}')">${refLabel(n.ref)}</span>`}
        <button class="cv-pinbtn${n.pin?' on':''}" title="Épingler" onclick="event.stopPropagation();CV.pin('${n.id}')" aria-label="Épingler">📌</button>
      </div>
      <div class="cv-note-t" onclick="CV.editNote('${n.id}')">${esc(n.texte)}</div>
      ${compact && n.ref && M.tab==='prog' && n.ref.startsWith('item:') ? `<div class="cv-note-ref s">${refLabel(n.ref)}</div>` : ''}
      ${byline(n)}
    </div>`;
  }
  function renderNotes(){
    const f = M.filt.notes || 'all';
    const all = list('note', n=>n.trip===M.trip).sort(noteSort);
    const shown = f==='pin' ? all.filter(n=>n.pin) : f==='gen' ? all.filter(n=>!n.ref) : f==='att' ? all.filter(n=>n.ref) : all;
    let h = `<div class="v-sum"><div class="v-sum-row"><div class="v-sum-big">${all.length} note${all.length>1?'s':''}</div><div class="v-sum-small">${all.filter(n=>n.pin).length} épinglée(s)</div></div>
      <div class="v-sum-small">Notes générales ou rattachées à un jour, un hôtel, un trajet… Les épinglées remontent en haut des 📅 Jours et sur les fiches.</div></div>
      <div class="v-filters">${[['all','Toutes'],['pin','📌 Épinglées'],['gen','Générales'],['att','Sur une étape']].map(([k,l])=>
        `<button class="v-chip${f===k?' on':''}" onclick="CV.filter('notes','${k}')">${l}</button>`).join('')}</div>`;
    h += shown.map(n=>noteCard(n)).join('') || '<div class="v-empty">Aucune note. Ajoute avec ＋ en bas.</div>';
    document.getElementById('cv-body').innerHTML = h;
  }
  function refOptions(cur){
    let o = `<option value="">🗒️ Générale (tout le voyage)</option>`;
    const ds = dayList();
    if(ds.length) o += `<optgroup label="Jours">${ds.map(d=>`<option value="day:${d}"${cur==='day:'+d?' selected':''}>📅 ${fdate(d)}${dayInfo(d).titre?' · '+esc(dayInfo(d).titre):''}</option>`).join('')}</optgroup>`;
    Object.keys(CATS).forEach(c=>{
      const l = items(i=>i.cat===c).sort(sortItems);
      if(l.length) o += `<optgroup label="${CATS[c].lbl}">${l.map(i=>`<option value="item:${i.id}"${cur==='item:'+i.id?' selected':''}>${icon(i)} ${esc(i.titre)}</option>`).join('')}</optgroup>`;
    });
    return o;
  }
  function editNote(id, ref){
    const n = id ? clone(R[id]) : {id:null, type:'note', trip:M.trip, ref:ref||'', texte:'', pin:true};
    if(!n) return;
    editing = n;
    openSheet(`<h2>📌 ${id ? 'Note' : 'Nouvelle note'}</h2>${byline(n)}
      <form id="v-form" onsubmit="event.preventDefault();CV.saveNote()">
        <div class="v-f"><label>Note</label><textarea class="v-in" id="cv-ntext" style="min-height:120px" placeholder="Ex. : code de la porte, rappel, adresse du resto…" required>${esc(n.texte)}</textarea></div>
        <div class="v-f"><label>Rattachée à</label><select class="v-in" id="cv-nref">${refOptions(n.ref||'')}</select></div>
        <div class="v-f"><label>Épinglée</label>${segBtns('cv-npin', [['1','📌 Oui, en haut'],['0','Non']], n.pin?'1':'0')}</div>
        ${actions(id ? `CV.delNote('${id}')` : '')}
      </form>`);
  }
  function saveNote(){
    const n = editing; if(!n) return;
    n.texte = document.getElementById('cv-ntext').value.trim();
    if(!n.texte){ alert('La note est vide.'); return; }
    n.ref = document.getElementById('cv-nref').value;
    n.pin = segVal('cv-npin') === '1';
    if(!n.id) n.id = 'n' + uid();
    put(n, '📌 Note enregistrée'); closeSheet(); render();
  }
  async function delNote(id){ if(!(await uiConfirm('Supprimer cette note ?'))) return; drop(id); closeSheet(); render(); }
  function pin(id){ const n = R[id]; if(!n) return; n.pin = !n.pin; put(n, n.pin ? '📌 Épinglée' : 'Désépinglée'); if(!sheetOpen()) render(); else { const it = editing; if(it && it.type==='item') edit(it.id); } }
  function openRef(ref){
    if(ref.startsWith('item:')) edit(ref.slice(5));
    else if(ref.startsWith('day:')){ const d = ref.slice(4); openD[d] = true; tab('prog'); setTimeout(()=>{ const el = document.getElementById('d-'+d); if(el) el.scrollIntoView({block:'start'}); window.scrollBy(0,-170); }, 30); }
  }

  /* ══════════ Budget par personne ══════════ */
  function renderBudget(){
    const t = trip(), v = tv(), all = items();
    const obj = num(t.objectif);
    const per = v.map(pid => {
      const proj = all.reduce((s,i)=>s+shareOf(i,pid),0);
      const paye = all.reduce((s,i)=>s+shareOfPaid(i,pid),0);
      const reel = all.reduce((s,i)=>s+shareOf(i,pid,'reel'),0);
      return {pid, proj, paye, reel};
    });
    const rows = Object.keys(CATS).map(c=>{
      const l = all.filter(i=>i.cat===c);
      return {c, est:l.reduce((s,i)=>s+totalOf(i,'est'),0), reel:l.reduce((s,i)=>s+totalOf(i,'reel'),0),
        proj:l.reduce((s,i)=>s+totalOf(i),0), paye:l.reduce((s,i)=>s+paidAmount(i),0)};
    });
    const tot = rows.reduce((a,r)=>({est:a.est+r.est, reel:a.reel+r.reel, proj:a.proj+r.proj, paye:a.paye+r.paye}), {est:0,reel:0,proj:0,paye:0});
    const others = profiles().filter(p=>!v.includes(p.id));
    // Écran simplifié : l'essentiel en haut, les actions en un geste, le détail dans des volets (rien n'est retiré)
    const BO = M.budOpen || (M.budOpen = {}), acc = (k, title, body) => `<details class="bu-acc" ${BO[k] ? 'open' : ''} ontoggle="CV.budTog('${k}', this.open)"><summary>${title}</summary><div class="bu-in">${body}</div></details>`;
    const pp = v.length ? tot.proj / v.length : 0, pctPaid = tot.proj ? Math.min(100, tot.paye / tot.proj * 100) : 0;
    const objLine = obj ? (pp <= obj ? `<span>🎯 Objectif ${eur(obj)} / pers. · marge ${eur(obj - pp)}</span>` : `<span class="bu-over">🎯 Objectif ${eur(obj)} / pers. · dépasse de ${eur(pp - obj)}</span>`) : '';
    const r = (ic, l, fn) => `<button type="button" onclick="${fn}"><i>${ic}</i><span>${l}</span></button>`;
    const mx = Math.max(1, ...rows.map(x=>x.proj));
    let h = `<div class="bu-hero"><div class="bu-k">💶 Budget du voyage</div>
        <div class="bu-tot">${eur(tot.proj)}</div><div class="bu-pp">${v.length > 1 ? `soit ${eur(pp)} par personne · ${v.length} voyageurs` : 'pour tout le voyage'}</div>
        <div class="bu-bar"><span style="width:${pctPaid.toFixed(1)}%"></span></div>
        <div class="bu-pay"><span>✅ Payé ${eur(tot.paye)}</span><span>⏳ Reste ${eur(tot.proj - tot.paye)}</span></div>
        <div class="bu-obj">${objLine || 'Pas encore d’objectif par personne.'} <button type="button" onclick="CV.objAsk()">${obj ? 'modifier' : 'fixer un objectif'}</button></div></div>
      <div class="cv-quick2">${r('🧾','Dépense',"CV.tlReceipt()")}${r('📷','Tickets',"CV.tlReceipts()")}${v.length > 1 ? r('💸','Rembourser',"document.getElementById('bu-eq')&&document.getElementById('bu-eq').scrollIntoView({behavior:'smooth'})") : ''}${r('⚖️','Parts',"CV.partsSheet()")}${r('💱','Convertir',"CV.fxTool()")}</div>
      ${v.length > 1 ? `<div id="bu-eq">${equilibreHTML()}</div>` : ''}
      <div class="bu-cats"><div class="bu-h">Par poste</div>${rows.filter(x=>x.proj > 0 || x.paye > 0).map(x=>`<button type="button" class="bu-cat" onclick="CV.tab('${x.c}')"><span>${CATS[x.c].icon} ${CATS[x.c].lbl}</span><b>${eur(x.proj)}</b><i><em style="width:${(x.proj / mx * 100).toFixed(1)}%"></em><u style="width:${(x.paye / mx * 100).toFixed(1)}%"></u></i></button>`).join('') || '<div class="v-sum-small">Ajoute des trajets, hébergements, visites ou dépenses : le budget se remplit tout seul.</div>'}</div>
      ${acc('ana', `📊 Analyse des dépenses <small>par poste et par jour</small>`, anaHTML())}
      ${acc('pers', `👥 Par personne <small>${v.length} voyageur${v.length>1?'s':''}</small>`, `
        <div class="v-perslist">${v.map(pid=>pchip(pid, v.length>1 ? `<button onclick="CV.removeCompanion('${pid}')" aria-label="Retirer">✕</button>` : '')).join('')}</div>
        <div class="cv-row" style="gap:6px;margin:8px 0;flex-wrap:wrap"><button class="v-chip" onclick="CV.partsSheet()">⚖️ Parts & foyers</button><button class="v-chip" onclick="CV.addCompanion()">＋ Compagnon</button></div>
        <div class="v-obj"><span>Objectif par personne</span><input class="v-in" inputmode="decimal" value="${esc(t.objectif||'')}" placeholder="—" onchange="CV.setObj(this.value)"> ${CS()}</div>
        ${per.map(p=>{
          const pct = obj ? Math.min(100, p.proj/obj*100) : 0, ok = !obj || p.proj <= obj;
          return `<div class="cv-pbud">
            <div class="cv-pbud-h">${pchip(p.pid)}<b>${eur(p.proj)}</b></div>
            ${obj ? `<div class="v-bar"><span class="b-paid" style="width:${pct}%;background:${ok?pcol(p.pid):'var(--red)'}"></span></div>` : ''}
            <div class="v-sum-small">sa part réglée ${eur(p.paye)} · reste ${eur(p.proj-p.paye)}${obj ? ` · ${ok ? 'marge '+eur(obj-p.proj) : '<b style="color:var(--red)">dépasse de '+eur(p.proj-obj)+'</b>'}` : ''}</div>
          </div>`;}).join('')}`)}
      ${acc('table', '📊 Estimé, réel et payé par poste', `<table class="v-btable">
        <thead><tr><th>Poste (total)</th><th>Estimé</th><th>Réel</th><th>Payé</th></tr></thead>
        <tbody>
          ${rows.map(r=>`<tr onclick="CV.tab('${r.c}')" style="cursor:pointer"><td>${CATS[r.c].icon} ${CATS[r.c].lbl}</td><td>${eur(r.est)}</td><td>${eur(r.reel)}</td><td>${eur(r.paye)}</td></tr>`).join('')}
          <tr class="tot"><td>Total</td><td>${eur(tot.est)}</td><td>${eur(tot.reel)}</td><td>${eur(tot.paye)}</td></tr>
        </tbody>
      </table>`)}
      ${acc('how', 'ℹ️ Comment c’est calculé', `<div class="v-sum-small" style="line-height:1.5">La projection prend le prix réel quand il est saisi, sinon l’estimation.
      Prix « par personne » : compté pour chaque voyageur concerné. Prix « global » : divisé entre les voyageurs concernés. Un trajet décoché pour quelqu’un (retour séparé) ne lui est pas compté. Dans chaque fiche, 💶 indique qui prend en charge (égal, une personne, montants) et qui a payé.
      ${v.length>1 ? 'Pense à mettre à jour les tarifs qui changent à plusieurs (chambre double, cabine de croisière).' : ''}</div>`)}`;
    document.getElementById('cv-body').innerHTML = h;
  }
  function setObj(val){ const t = trip(); t.objectif = num(val); put(t); renderBudget(); }
  async function objAsk(){ const t = trip(); const v = (await uiPrompt('Budget visé par personne (en ' + CS() + ') — vide pour aucun :', t.objectif || '')); if(v === null) return; setObj(v); }
  function budTog(k, o){ M.budOpen = M.budOpen || {}; M.budOpen[k] = !!o; persist(); }
  function addCompanion(){
    const v = tv(), others = profiles().filter(p=>!v.includes(p.id));
    openSheet(`<h2>👥 Ajouter un compagnon</h2>
      ${others.length ? `<div class="v-f"><label>Profils existants</label><div class="cv-plist">${others.map(p=>`<button class="cv-prow" onclick="CV.addToTrip('${p.id}')">${pchip(p.id)}<span>Ajouter →</span></button>`).join('')}</div></div>` : ''}
      <form onsubmit="event.preventDefault();CV.newProfile(true)">
        <div class="v-f"><label>Nouveau profil</label><input class="v-in" id="cv-pnom" placeholder="Prénom (ex. Camille)" required></div>
        <div class="v-f"><label>Couleur</label>${colorPick(nextColor())}</div>
        ${actions('')}
      </form>`);
  }
  function addToTrip(pid){
    const t = trip();
    if(tv().length >= MAXP && !tv().includes(pid)){ alert('Maximum ' + MAXP + ' voyageurs par voyage.'); return; } t.voyageurs = [...new Set([...(t.voyageurs||[]), ...tv(), pid])];
    put(t, '👥 ' + pname(pid) + ' ajouté(e)'); closeSheet(); refresh(); inviteAdded(t.id, [pid]);
  }
  async function removeCompanion(pid){
    const t = trip(); if(!(await uiConfirm('Retirer ' + pname(pid) + ' de ce voyage ? (ses fiches restent)'))) return;
    t.voyageurs = tv().filter(x=>x!==pid); if(pid === M.me) (M.notTrav = M.notTrav || {})[t.id] = 1; put(t); refresh();
  }

  /* ══════════ Checklist ══════════ */
  const BASIC_CHECK = [
    ['📋 Documents','Pièce d’identité / passeport valide'], ['📋 Documents','Assurance voyage (rapatriement)'],
    ['📋 Documents','Carte bancaire sans frais à l’étranger + 2e carte'], ['📋 Documents','Copies numériques (papiers, billets, réservations)'],
    ['🗓️ À réserver tôt','Trajets aller et retour'], ['🗓️ À réserver tôt','Hébergements'], ['🗓️ À réserver tôt','Visites à créneau'],
    ['☀️ Santé','Trousse pharmacie'], ['☀️ Santé','Crème solaire, gourde'],
    ['📱 Tech','Chargeur + batterie externe'], ['📱 Tech','Cartes hors ligne'], ['📱 Tech','eSIM / forfait à l’étranger'],
  ];
  function renderCheck(){
    const cl = list('check', c=>c.trip===M.trip).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0) || a.id.localeCompare(b.id));
    const cats = [...new Set(cl.map(i=>i.cat))];
    const done = cl.filter(i=>chkDone(i)).length, multi = tvOf(M.trip).length > 1, mine = cl.filter(i=>i.each && !(i.doneBy || {})[M.me]).length;
    let h = `${multi && cl.some(i=>i.each) ? `<div class="ck-me">🧳 ${mine ? MSGT('Ta valise') + ' : <b>' + mine + '</b> ' + MSGT('à cocher') : '✅ ' + MSGT('Ta valise est prête')}</div>` : ''}<button type="button" class="sp-card" onclick="CV.smartPack()"><i>🧳</i><span><b>Valise intelligente</b><small>Selon la météo de tes étapes et tes activités : les idées à ne pas oublier.</small></span></button><div class="v-sum"><div class="v-sum-row"><div class="v-sum-big">${done} / ${cl.length}</div><div class="v-sum-small">éléments cochés</div></div>
      <div class="v-bar"><span class="b-paid" style="width:${cl.length?done/cl.length*100:0}%"></span></div></div>`;
    cats.forEach(c=>{
      h += `<div class="v-cl-cat">${esc(c)}</div>`;
      h += cl.filter(i=>i.cat===c).map(i=>{ const me = i.each ? !!(i.doneBy || {})[M.me] : i.done; return `<div class="v-cl${chkDone(i)?' done':''}${i.each ? ' each' : ''}" onclick="CV.check('${i.id}')">
        <div class="c">${me?'✓':''}</div><div class="t">${esc(i.label)}${i.each ? `<span class="ck-who">${tvOf(M.trip).map(p=>`<i class="${(i.doneBy || {})[p] ? 'on' : ''}" style="--c:${pcol(p)}" title="${esc(pname(p))}">${esc(((pname(p)||'?')[0]||'?').toUpperCase())}</i>`).join('')}</span>` : ''}</div>${multi ? `<button type="button" class="ck-each${i.each ? ' on' : ''}" onclick="event.stopPropagation();CV.chkEach('${i.id}')" title="Chacun le sien" aria-label="Chacun le sien">👥</button>` : ''}${!i.done && !hidden('blk:book') && checkBook(i.label) ? `<button type="button" class="bk-ck" onclick="event.stopPropagation();CV.bookSheet('${i.id}',1)" aria-label="Réserver">🛒</button>` : ''}
        ${i.done && i.updatedBy && i.updatedAt>1000 ? `<span title="Coché par ${esc(pname(i.updatedBy))}">${ini(i.updatedBy)}</span>` : ''}
        <button class="del" onclick="event.stopPropagation();CV.delCheck('${i.id}')" aria-label="Retirer">✕</button></div>`; }).join('');
    });
    h += `<div class="v-cl-add"><select class="v-in" id="v-cl-cat" style="flex:0 0 40%">${cats.map(c=>`<option>${esc(c)}</option>`).join('')}<option value="__new">＋ Nouvelle catégorie…</option></select>
      <input class="v-in" id="v-cl-new" placeholder="Ajouter un élément" onkeydown="if(event.key==='Enter')CV.addCheck()">
      <button class="v-btn" style="width:auto;margin:0;padding:0 14px" onclick="CV.addCheck()" aria-label="Ajouter">＋</button></div>`;
    document.getElementById('cv-body').innerHTML = h;
  }
  /* ══════════ 📊 Analyse des dépenses ══════════ */
  const ANA = [['transport','✈️','Trajets','#6366f1'], ['hotel','🏨','Hébergements','#a855f7'], ['activite','🎟️','Visites & résas','#ec4899'],
    ['repas','🍽️','Repas','#f97316'], ['courses','🛒','Courses','#eab308'], ['local','🚕','Transports sur place','#14b8a6'], ['shop','🛍️','Shopping','#06b6d4'], ['autre','🧾','Autres','#94a3b8']];
  const nzTxt = s => ' ' + String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ') + ' ';
  function anaKey(i){
    if(i.cat !== 'divers') return i.cat;
    const s = nzTxt((i.titre || '') + ' ' + (i.notes || ''));
    if(/restau|repas|dejeuner|diner|petit dej|cafe|bar |boisson|ramen|sushi|pizza|brunch|snack|glace|boulang|bistro|brasserie|izakaya|tapas/.test(s)) return 'repas';
    if(/course|supermarch|epicerie|marche |konbini|carrefour|lidl|aldi|monoprix|spar/.test(s)) return 'courses';
    if(/taxi|uber|metro|bus |tram|ticket|pass |navette|essence|carburant|peage|parking|location velo|ferry|suica|pasmo/.test(s)) return 'local';
    if(/souvenir|shopping|cadeau|vetement|boutique|magasin/.test(s)) return 'shop';
    return 'autre';
  }
  function anaHTML(){
    const all = items(), t = trip(), v = tv(), days = dayList(), nd = Math.max(1, days.length);
    const by = {}; let tot = 0; all.forEach(i=>{ const x = totalOf(i); if(x > 0){ const k = anaKey(i); by[k] = (by[k] || 0) + x; tot += x; } });
    if(!tot) return '<div class="v-sum-small">Ajoute des dépenses pour voir l’analyse.</div>';
    // camembert (anneau)
    let a0 = 0; const R0 = 54, C = 2 * Math.PI * R0, segs = ANA.filter(c=>by[c[0]] > 0).map(c=>{ const f = by[c[0]] / tot, s = `<circle r="${R0}" cx="70" cy="70" fill="none" stroke="${c[3]}" stroke-width="22" stroke-dasharray="${(f * C).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-a0 * C).toFixed(2)}" transform="rotate(-90 70 70)"/>`; a0 += f; return s; }).join('');
    const leg = ANA.filter(c=>by[c[0]] > 0).sort((x, y)=>by[y[0]] - by[x[0]]).map(c=>`<div class="an-l"><i style="background:${c[3]}"></i><span>${c[1]} ${c[2]}</span><b>${Math.round(by[c[0]] / tot * 100)} %</b><small>${eur(by[c[0]])}</small></div>`).join('');
    // par jour (les hébergements sont étalés sur leurs nuits)
    const pd = {}; days.forEach(d=>pd[d] = 0);
    all.forEach(i=>{ const x = totalOf(i); if(!(x > 0) || !i.date) return;
      if(i.cat === 'hotel' && i.dateFin && i.dateFin > i.date){ const r = range(i.date, addD(i.dateFin, -1)); r.forEach(d=>pd[d] = (pd[d] || 0) + x / r.length); }
      else pd[i.date] = (pd[i.date] || 0) + x; });
    const pdk = Object.keys(pd).filter(d=>!t.debut || (d >= t.debut && d <= (t.fin || t.debut))).sort(), mx = Math.max(1, ...pdk.map(d=>pd[d])), today = isoToday();
    const bars = pdk.length > 1 ? `<div class="an-bars">${pdk.map(d=>`<span class="${d === today ? 'on' : ''}" title="${fshort(d)} · ${eur(pd[d])}"><i style="height:${Math.max(2, pd[d] / mx * 100).toFixed(1)}%"></i></span>`).join('')}</div><div class="an-ax"><span>${fshort(pdk[0])}</span><span>${fshort(pdk[pdk.length - 1])}</span></div>` : '';
    const top = pdk.filter(d=>pd[d] > 0).sort((x, y)=>pd[y] - pd[x]).slice(0, 3);
    const big = all.filter(i=>totalOf(i) > 0).sort((x, y)=>totalOf(y) - totalOf(x))[0];
    const per = v.length ? tot / v.length : tot, obj = num(t.objectif);
    return `<div class="an"><svg viewBox="0 0 140 140" class="an-d">${segs}<text x="70" y="66" text-anchor="middle" class="an-t1">${eur(tot)}</text><text x="70" y="84" text-anchor="middle" class="an-t2">${v.length > 1 ? eur(per) + ' / pers.' : ''}</text></svg><div class="an-leg">${leg}</div></div>
      <div class="an-k"><div><b>${eur(tot / nd)}</b><small>par jour</small></div><div><b>${eur(per / nd)}</b><small>par jour et par personne</small></div>${obj ? `<div class="${per > obj ? 'bad' : 'ok'}"><b>${eur(obj / nd)}</b><small>objectif par jour et par personne</small></div>` : ''}</div>
      ${bars ? `<div class="bu-h" style="margin-top:12px">Jour après jour</div>${bars}` : ''}
      ${top.length ? `<div class="bu-h" style="margin-top:12px">Les jours les plus chers</div>${top.map(d=>`<div class="an-r"><span>${fdate(d)}</span><b>${eur(pd[d])}</b></div>`).join('')}` : ''}
      ${big ? `<div class="an-r"><span>💎 Plus grosse dépense : ${esc(big.titre || '')}</span><b>${eur(totalOf(big))}</b></div>` : ''}`;
  }

  /* ══════════ 🧳 Valise intelligente : météo des étapes + activités prévues ══════════ */
  let spSug = [];
  async function smartPack(again){
    const t = trip(); if(!t) return;
    if(!again || !document.getElementById('sp-list')) openSheet(`<h2>🧳 Valise intelligente</h2><div class="v-sum-small" id="sp-msg">🌤️ Je regarde la météo de tes étapes et tes activités…</div><div id="sp-list"></div>`);
    const st = tlStages(); let mn = 99, mx = -99, rain = 0, rainTxt = '', meteoOk = 0;
    for(const s of st.slice(0, 8)){ try { const v = await meteoFor(s); meteoOk++; mn = Math.min(mn, v.min); mx = Math.max(mx, v.max);
      const r = v.kind === 'prev' ? (v.pluie >= 50) : (v.jp >= Math.max(2, v.n / 4)); if(r){ rain++; rainTxt = rainTxt || s.city; } } catch(e){} }
    const txt = nzTxt(items().map(i=>(i.titre || '') + ' ' + (i.notes || '') + ' ' + (i.mode || '')).join(' ') + ' ' + list('place', p=>p.trip===M.trip && !p.sugg).map(p=>p.titre || p.nom || '').join(' ') + ' ' + (t.titre || '') + ' ' + (t.sous || ''));
    const ccs = new Set(st.map(s=>((M.ctry || {})[normQ(s.city)] || {}).cc).filter(Boolean));
    const EU = /^(FR|BE|DE|ES|IT|PT|NL|LU|AT|GR|PL|CZ|SK|HU|SI|HR|RO|BG|DK|SE|FI|NO|EE|LV|LT|IS|MC|AD)$/;
    const nn = Math.max(1, dayList().length - 1), S = [];
    const add = (cat, l, why) => S.push({cat, l, why});
    // 🛂 formalités d’entrée selon les pays visités et le pays du passeport
    const from = bagFromDefault(), mine = (M.packCc || {})[t.id];
    const dest = mine != null ? [...new Set(String(mine).split(',').map(x=>ccOf(x.trim())).filter(Boolean))] : [...new Set([...ccs, ...bagCcs()])];
    const rules = dest.map(cc=>[cc, entryRules(cc, from)]), multi = dest.length > 1, nm = cc => flag(cc) + ' ' + ccName(cc);
    const pass = rules.some(([, r])=>/Passeport/i.test(r.doc) && !/ou passeport|passeport conseillé/i.test(r.doc));
    add('Documents', pass ? 'Passeport (vérifier la date d’expiration)' : 'Passeport ou carte d’identité', pass ? '🛂 ' + rules.filter(([, r])=>/Passeport/i.test(r.doc) && !/ou passeport|passeport conseillé/i.test(r.doc)).map(([c])=>nm(c)).join(', ') : '');
    rules.forEach(([cc, r])=>r.x.filter(x=>!/CEAM/.test(x)).forEach(x=>add('Formalités', x + (multi ? ' — ' + ccName(cc) : ''), '🛂 ' + nm(cc))));
    if(from === 'eu' && dest.some(c=>EU_CEAM.includes(c))) add('Documents', 'Carte européenne d’assurance maladie (CEAM)', '🇪🇺 ' + dest.filter(c=>EU_CEAM.includes(c)).map(ccName).join(', '));
    add('Documents', 'Carte bancaire et un peu de liquide', ''); add('Documents', 'Assurance voyage (numéro d’assistance)', '');
    add('Électronique', 'Chargeur de téléphone', ''); add('Électronique', 'Batterie externe', '');
    { const pl = from === 'eu' ? [...new Set(dest.map(c=>PLUG[c]).filter(Boolean))] : [];
      if(pl.length) add('Électronique', 'Adaptateur de prise (type ' + pl.join(', ') + ')', '🔌 ' + dest.filter(c=>PLUG[c]).map(nm).join(', '));
      else if(from !== 'eu' || [...ccs].some(c=>!EU.test(c))) add('Électronique', 'Adaptateur de prise', '🔌 autre type de prise sur place'); }
    add('Santé', 'Petite trousse à pharmacie', '');
    if(meteoOk){
      if(mn <= 5){ add('Vêtements', 'Manteau chaud', `🥶 jusqu’à ${mn}°`); add('Vêtements', 'Bonnet, gants et écharpe', `🥶 jusqu’à ${mn}°`); }
      else if(mn <= 13) add('Vêtements', 'Pull ou polaire', `🌬️ ${mn}° le matin`);
      if(mn <= 16) add('Vêtements', 'Veste légère', `🌥️ ${mn}° → ${mx}°`);
      if(mx >= 24){ add('Vêtements', 'Shorts et t-shirts', `☀️ jusqu’à ${mx}°`); add('Santé', 'Crème solaire', `☀️ jusqu’à ${mx}°`); add('Vêtements', 'Lunettes de soleil et casquette', `☀️ jusqu’à ${mx}°`); }
      if(mx >= 27) add('Santé', 'Anti-moustiques', `🦟 chaleur (${mx}°)`);
      if(rain){ add('Vêtements', 'Imperméable ou K-way', `☔ pluie annoncée à ${rainTxt}`); add('Vêtements', 'Parapluie pliant', `☔ pluie annoncée à ${rainTxt}`); }
    }
    if(/rando|trek|hike|montagne|sentier|volcan|glacier/.test(txt)){ add('Activités', 'Chaussures de randonnée', '🥾 randonnée prévue'); add('Activités', 'Gourde', '🥾 randonnée prévue'); add('Activités', 'Petit sac à dos', '🥾 randonnée prévue'); }
    if(/plage|beach|baignade|piscine|snorkel|plongee|lagon|crique|mer /.test(txt)){ add('Activités', 'Maillot de bain', '🏖️ plage ou piscine'); add('Activités', 'Serviette microfibre', '🏖️ plage ou piscine'); }
    if(/onsen|spa|thermes|hammam|bain/.test(txt)) add('Activités', 'Petite serviette pour les bains', '♨️ bains prévus');
    if(/ski|snowboard|neige|station/.test(txt)){ add('Activités', 'Gants et masque de ski', '⛷️ neige prévue'); add('Vêtements', 'Sous-vêtements thermiques', '⛷️ neige prévue'); }
    if(/temple|sanctuaire|shrine|mosquee|eglise|cathedrale|basilique|monastere|pagode/.test(txt)) add('Vêtements', 'Une tenue qui couvre épaules et genoux', '⛩️ lieux de culte au programme');
    if(/avion|vol |flight|aeroport/.test(txt)){ add('Voyage', 'Liquides de moins de 100 ml dans un sachet', '✈️ vol prévu'); add('Voyage', 'Coussin de voyage et bouchons d’oreilles', '✈️ vol prévu'); }
    if(/train|shinkansen|tgv|bus/.test(txt)) add('Voyage', 'En-cas pour le trajet', '🚆 trajets en train ou bus');
    if(nn >= 7) add('Vêtements', 'Lessive de voyage', `🧺 ${nn} nuits`);
    const have = new Set(list('check', c=>c.trip===M.trip).map(c=>normQ(c.label)));
    spSug = S.filter((x, i, a)=>a.findIndex(y=>y.l === x.l) === i).map(x=>Object.assign(x, {has: have.has(normQ(x.l))}));
    const msg = document.getElementById('sp-msg'), box = document.getElementById('sp-list'); if(!box) return;
    if(msg) msg.innerHTML = meteoOk ? `<span>${meteoOk > 1 ? `🌤️ Météo de ${meteoOk} étapes` : '🌤️ Météo de ton étape'}</span> <b>${mn}° → ${mx}°</b>${rain ? ' <span>☔ pluie possible</span>' : ''}<br><span>Coche ce que tu veux ajouter à ta checklist.</span>` : '<span>Pas de météo (ajoute des hébergements avec une ville et des dates). Voici l’essentiel selon ton programme :</span>';
    const cats = [...new Set(spSug.map(x=>x.cat))];
    const head = `<div class="sp-ent"><label>🛂 Ton passeport ou ta carte d’identité vient de…</label><select class="v-in" onchange="CV.packFrom(this.value)">${BAG_FROM.map(([k, l])=>`<option value="${k}"${k === from ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <label>🌍 Pays visités${dest.length > 1 ? ` <small>(${dest.length})</small>` : ''}</label>
      <div class="sp-ccs">${dest.map(cc=>`<span class="sp-cc">${flag(cc)} ${esc(ccName(cc))}<button type="button" onclick="CV.packCcDel('${cc}')" aria-label="Retirer">✕</button></span>`).join('') || '<small>Aucun pays pour l’instant.</small>'}</div>
      <select class="v-in" onchange="CV.packCcAdd(this.value)"><option value="">＋ Ajouter un pays…</option>${ISO.filter(c=>!dest.includes(c)).map(c=>[c, ccName(c)]).sort((a, b)=>a[1].localeCompare(b[1])).map(([c, n])=>`<option value="${c}">${flag(c)} ${esc(n)}</option>`).join('')}</select>
      <small>Règles générales pour un court séjour touristique. Vérifie toujours avant de partir sur diplomatie.gouv.fr (Conseils aux voyageurs) ou le site officiel du pays.</small></div>`;
    // pays pas encore connus (ville d’hébergement jamais cherchée) : on les cherche, puis on met la liste à jour une fois
    if(mine == null && !again) setTimeout(async ()=>{ let nw = 0; for(const c of bagCities()){ if((M.ctry || {})[normQ(c)] || ccOf(c)) continue; try { const r = await countryOf(c); if(r && r.cc) nw++; } catch(e){} if(!document.getElementById('sp-list')) return; } if(nw) smartPack(true); }, 50);
    box.innerHTML = head + cats.map(c=>`<div class="v-cl-cat">${esc(c)}</div>` + spSug.map((x, i)=>x.cat === c ? `<label class="sp-r${x.has ? ' has' : ''}"><input type="checkbox" data-sp="${i}" ${x.has ? 'disabled' : 'checked'}><span>${esc(x.l)}${x.why ? `<small>${esc(x.why)}</small>` : ''}${x.has ? '<small>✓ déjà dans ta checklist</small>' : ''}</span></label>` : '').join('')).join('')
      + `<div class="v-actions"><button type="button" class="v-btn" onclick="CV.smartPackAdd()">＋ Ajouter à ma checklist</button></div>`;
  }
  function packFrom(v){ M.bagFrom = v; persist(); smartPack(true); }
  function packDest(){ const t = trip(), mine = (M.packCc || {})[t.id]; return mine != null ? [...new Set(String(mine).split(',').map(x=>ccOf(x.trim())).filter(Boolean))] : [...new Set([...tlStages().map(s=>((M.ctry || {})[normQ(s.city)] || {}).cc).filter(Boolean), ...bagCcs()])]; }
  function packCcAdd(cc){ if(!cc) return; const d = packDest(); if(!d.includes(cc)) d.push(cc); packCc(d.join(',')); }
  function packCcDel(cc){ packCc(packDest().filter(c=>c !== cc).join(',')); }
  function packCc(v){ const t = trip(); if(!t) return; M.packCc = Object.assign({}, M.packCc || {}, {[t.id]: String(v || '').trim()}); persist(); smartPack(true); }
  function smartPackAdd(){
    const sel = [...document.querySelectorAll('[data-sp]:checked')].map(i=>spSug[+i.dataset.sp]).filter(x=>x && !x.has);
    const each = tvOf(M.trip).length > 1;
    sel.forEach((x, k)=>put({id:'c' + uid() + k, type:'check', trip:M.trip, cat:x.cat, label:x.l, done:false, each: each && /Vêtements|Santé|Documents|Activités/.test(x.cat) ? true : undefined, doneBy: {}}));
    closeSheet(); const MSG = x => (window.I18N && I18N.msg ? I18N.msg(x) : x); toast('🧳 ' + MSG(sel.length > 1 ? `${sel.length} éléments ajoutés` : `${sel.length} élément ajouté`)); if(M.tab === 'check') renderCheck(); else render();
  }
  function check(id){ const i = R[id]; if(!i) return;
    if(i.each && M.me){ i.doneBy = Object.assign({}, i.doneBy); if(i.doneBy[M.me]) delete i.doneBy[M.me]; else i.doneBy[M.me] = 1; i.done = chkDone(i); put(i, i.doneBy[M.me] ? '✓ ' + MSGT('Coché pour toi') : 'Décoché'); renderCheck(); return; }
    i.done = !i.done; put(i, i.done ? '✓ Coché' : 'Décoché'); renderCheck(); }
  async function delCheck(id){ const i = R[id]; if(i && (await uiConfirm('Retirer « ' + i.label + ' » ?'))){ drop(id); renderCheck(); } }
  async function addCheck(){
    const label = document.getElementById('v-cl-new').value.trim(); if(!label) return;
    let cat = document.getElementById('v-cl-cat').value;
    if(cat==='__new'){ cat = ((await uiPrompt('Nom de la nouvelle catégorie ?'))||'').trim(); if(!cat) return; }
    put({id:'c'+uid(), type:'check', trip:M.trip, cat, label, done:false}); renderCheck();
  }

  /* ══════════ Envies (fourre-tout de chacun) ══════════ */
  function wishPeople(w){ const g = w.gens || {}; const p = Object.keys(g).filter(pid => prof(pid) && ((g[pid].dep||'').trim() || (g[pid].ret||'').trim())); return p.length ? p : [w.createdBy].filter(prof); }
  function renderEnvies(){
    const f = M.envF || 'all', fp = M.envP || 'all';
    let all = list('wish');
    const counts = k => all.filter(w=>w.kind===k).length;
    let shown = all.filter(w => (f==='all' || (f==='here' ? (w.kind==='etape' && w.trip===M.trip) : w.kind===f)) && (fp==='all' || w.createdBy===fp || (w.likes||[]).includes(fp)));
    shown.sort((a,b)=>{
      const fa = a.statut==='fait'?1:0, fb = b.statut==='fait'?1:0; if(fa!==fb) return fa-fb;
      return (a.debut||'9999').localeCompare(b.debut||'9999') || (b.updatedAt||0)-(a.updatedAt||0);
    });
    const t = trip();
    let h = `<div class="v-sum"><div class="v-sum-row"><div class="v-sum-big">✨ ${all.length} envie${all.length>1?'s':''}</div><div class="v-sum-small">partagées entre vous</div></div>
      <div class="v-sum-small">Le fourre-tout de chacun : une étape à ajouter, un week-end à caler, un prochain voyage. Un week-end peut devenir un voyage en un clic.</div></div>
      <div class="v-filters">${[['all','Tout'],['weekend','🏖️ Week-ends ('+counts('weekend')+')'],['voyage','🌍 Voyages ('+counts('voyage')+')'],...(t?[['here','📍 Pour « '+esc((t.titre||'').slice(0,14))+' »']]:[]),['etape','📍 Étapes'],['idee','💡 Idées']].map(([k,l])=>
        `<button class="v-chip${f===k?' on':''}" onclick="CV.envF('${k}')">${l}</button>`).join('')}</div>
      <div class="v-filters"><span class="cv-lbl">De</span><button class="v-chip${fp==='all'?' on':''}" onclick="CV.envP('all')">Tous</button>${profiles().map(p=>`<button class="v-chip cv-pc${fp===p.id?' on':''}" style="--pc:${p.couleur}" onclick="CV.envP('${p.id}')">${esc(p.nom)}</button>`).join('')}</div>`;
    h += shown.map(wishCard).join('') || '<div class="v-empty">Aucune envie ici. Ajoute avec ＋ en bas.</div>';
    h = pollsHTML() + h;
    document.getElementById('cv-body').innerHTML = h;
  }
  function wishCard(w){
    const k = WISH[w.kind] || WISH.idee, likes = (w.likes||[]).filter(prof), liked = likes.includes(M.me);
    const tr = w.trip && R[w.trip] && !R[w.trip].deleted ? R[w.trip] : null;
    const created = w.tripCree && R[w.tripCree] && !R[w.tripCree].deleted ? R[w.tripCree] : null;
    const g = w.gens || {};
    const deps = wishPeople(w).filter(pid => g[pid] && (g[pid].dep || g[pid].ret)).map(pid =>
      `<div class="cv-dep">${ini(pid)} ${esc(pname(pid))} : ${esc(g[pid].dep||'?')} → ${esc(w.titre)}${(g[pid].ret||g[pid].dep) ? ' → ' + esc(g[pid].ret||g[pid].dep) : ''}</div>`).join('');
    return `<div class="cv-wish${w.statut==='fait'?' done':''}" style="--pc:${pcol(w.createdBy)}">
      <div onclick="CV.editWish('${w.id}')" style="cursor:pointer">
        <div class="cv-wish-k">${k.icon} ${k.lbl}${w.statut==='prevu'?' · <b>prévu</b>':w.statut==='fait'?' · ✓ fait':''}</div>
        <div class="cv-wish-t">${esc(w.titre)}</div>
        <div class="v-card-sub">${[w.debut ? (w.fin && w.fin!==w.debut ? 'du '+fdate(w.debut)+' au '+fdate(w.fin) : fdate(w.debut)) : '', w.quand||'', tr ? 'pour « '+esc(tr.titre)+' »' : '', w.hotel ? '🏨 '+esc(w.hotel) : '', num(w.budget) ? '≈ '+eur(num(w.budget))+'/pers' : ''].filter(Boolean).join(' · ')}</div>
        ${deps}
        ${w.notes ? `<div class="cv-wish-n">${esc(w.notes)}</div>` : ''}
        ${byline(w)}
      </div>
      <div class="cv-wish-a">
        <button class="cv-like${liked?' on':''}" onclick="CV.like('${w.id}')">${liked?'❤️':'🤍'} Moi aussi</button>
        <span class="ins">${likes.map(ini).join('')}</span>
        <span style="flex:1"></span>
        ${safeUrl(w.lien) ? `<a class="v-link" href="${esc(safeUrl(w.lien))}" target="_blank" rel="noopener">↗</a>` : ''}
        ${created ? `<button class="v-chip" onclick="CV.go('${created.id}')">→ Ouvrir le voyage</button>`
          : (w.kind==='weekend'||w.kind==='voyage') ? `<button class="v-chip on" onclick="CV.wishToTrip('${w.id}')">🚀 En faire un voyage</button>` : ''}
      </div>
    </div>`;
  }
  function setEnvF(k){ M.envF = k; persist(); render(); }
  function setEnvP(k){ M.envP = k; persist(); render(); }
  function like(id){
    const w = R[id]; if(!w) return;
    const l = new Set(w.likes||[]); l.has(M.me) ? l.delete(M.me) : l.add(M.me);
    w.likes = [...l]; put(w, l.has(M.me) ? '❤️' : false); render();
  }
  function editWish(id){
    const w = id ? clone(R[id]) : {id:null, type:'wish', kind: M.envF && WISH[M.envF] ? M.envF : (M.envF==='here' ? 'etape' : 'weekend'), titre:'', trip: M.envF==='here' ? M.trip : '', gens:{}, likes:[], statut:'idee'};
    if(!w) return;
    editing = w;
    const g = w.gens || {};
    const tripOpts = trips().map(t=>`<option value="${t.id}"${w.trip===t.id?' selected':''}>${esc(t.titre)}</option>`).join('');
    openSheet(`<h2>✨ ${id ? esc(w.titre) : 'Nouvelle envie'}</h2>${byline(w)}
      <form id="v-form" onsubmit="event.preventDefault();CV.saveWish()">
        <div class="v-f"><label>Type</label>${segBtns('cv-wk', [['weekend','🏖️ Week-end'],['voyage','🌍 Voyage'],['etape','📍 Étape'],['idee','💡 Idée']], w.kind)}</div>
        ${field('Destination / idée','titre',w.titre,'text','required placeholder="Ex. Palma de Majorque"')}
        <div class="v-f2">${field('Du','debut',w.debut,'date')}${field('Au','fin',w.fin,'date')}</div>
        ${field('Ou bien quand (libre)','quand',w.quand,'text','placeholder="Ex. printemps 2028, un pont de mai…"')}
        <div class="v-f"><label>Pour le voyage (si c’est une étape à ajouter)</label><select class="v-in" name="trip"><option value="">—</option>${tripOpts}</select></div>
        ${field('Hébergement envisagé','hotel',w.hotel,'text','placeholder="Nom, quartier, lien Booking…"')}
        <div class="v-f"><label>Qui part, d’où, et retour vers où ?</label>
          ${profiles().map(p=>`<div class="cv-deprow">${pchip(p.id)}
            <input class="v-in" data-dep="${p.id}" value="${esc((g[p.id]||{}).dep)}" placeholder="départ de…">
            <input class="v-in" data-ret="${p.id}" value="${esc((g[p.id]||{}).ret)}" placeholder="retour vers…"></div>`).join('')}
          <div class="v-sum-small">Laisse vide pour quelqu’un qui ne vient pas. Ex. : Camille Lyon → Lyon, Sam Bruxelles → Bruxelles.</div></div>
        ${field('Budget estimé par personne (' + CS() + ')','budget',w.budget,'text','inputmode="decimal"')}
        ${field('Lien','lien',w.lien,'url','placeholder="https://"')}
        <div class="v-f"><label>Notes</label><textarea class="v-in" name="notes">${esc(w.notes)}</textarea></div>
        <div class="v-f"><label>État</label>${segBtns('cv-ws', [['idee','💭 Idée'],['prevu','📆 Prévu'],['fait','✓ Fait']], w.statut||'idee')}</div>
        ${actions(id ? `CV.delWish('${id}')` : '')}
      </form>`);
  }
  function saveWish(){
    const w = editing; if(!w) return;
    const fd = new FormData(document.getElementById('v-form'));
    for(const [k,v] of fd.entries()) w[k] = String(v).trim();
    w.kind = segVal('cv-wk') || 'idee'; w.statut = segVal('cv-ws') || 'idee';
    if(!w.titre){ alert('Donne une destination ou une idée.'); return; }
    const g = {};
    document.querySelectorAll('[data-dep]').forEach(i=>{ const pid = i.dataset.dep, ret = document.querySelector(`[data-ret="${pid}"]`).value.trim(), dep = i.value.trim(); if(dep||ret) g[pid] = {dep, ret}; });
    w.gens = g;
    if(!w.id){ w.id = 'w' + uid(); if(!w.likes) w.likes = []; }
    put(w, '✨ Envie enregistrée'); closeSheet(); render();
  }
  async function delWish(id){ if(!(await uiConfirm('Supprimer cette envie ?'))) return; drop(id); closeSheet(); render(); }
  async function wishToTrip(id){
    const w = R[id]; if(!w) return;
    const who = [...new Set([...wishPeople(w), ...(w.likes||[]).filter(prof)])];
    if(!who.length && M.me) who.push(M.me);
    if(!(await uiConfirm(`Créer le voyage « ${w.titre} » pour ${who.map(pname).join(', ')} ?\nLes trajets aller/retour de chacun et l’hébergement seront préparés.`))) return;
    const tid = 't' + uid(), out = [];
    out.push({id:tid, type:'trip', titre:w.titre, sous:WISH[w.kind]?WISH[w.kind].lbl:'', debut:w.debut||'', fin:w.fin||w.debut||'', voyageurs:who, objectif:num(w.budget)||''});
    out.push({id:'i'+uid(), type:'item', trip:tid, cat:'hotel', titre:w.titre, nom:w.hotel||'', date:w.debut||'', dateFin:w.fin||'', statut:'todo', partage:'grp', qui:[]});
    const g = w.gens || {};
    who.forEach(pid=>{
      const dep = (g[pid]||{}).dep || '', ret = (g[pid]||{}).ret || dep;
      const solo = who.length > 1 ? [pid] : [];
      out.push({id:'i'+uid(), type:'item', trip:tid, cat:'transport', mode:'Avion', titre:(dep||'Départ')+' → '+w.titre, from:dep, to:w.titre, date:w.debut||'', statut:'todo', qui:solo, partage:'pp'});
      out.push({id:'i'+uid(), type:'item', trip:tid, cat:'transport', mode:'Avion', titre:w.titre+' → '+(ret||'Retour'), from:w.titre, to:ret, date:w.fin||'', statut:'todo', qui:solo, partage:'pp'});
    });
    if(w.notes) out.push({id:'n'+uid(), type:'note', trip:tid, ref:'', texte:w.notes, pin:true});
    BASIC_CHECK.forEach(([cat,label],i)=>out.push({id:'c'+uid()+i, type:'check', trip:tid, cat, label, done:false}));
    w.tripCree = tid; w.statut = 'prevu'; out.push(w);
    putMany(out, '🚀 Voyage créé');
    M.tab = 'prog'; go(tid);
  }

  /* ══════════ Voyages : créer / modifier / clôturer ══════════ */
  function editTrip(id){
    const t = id ? clone(R[id]) : {id:null, type:'trip', titre:'', sous:'', debut:'', fin:'', voyageurs:[M.me].filter(Boolean), objectif:''};
    editing = t;
    const pool = profiles().map(p=>p.id);
    openSheet(`<h2>🧳 ${id ? 'Modifier le voyage' : 'Nouveau voyage'}</h2>${byline(t)}
      <form id="v-form" onsubmit="event.preventDefault();CV.saveTrip()">
        ${id && TS()[id] && spaceObj(TS()[id]) ? `<button type="button" class="v-btn sec" style="margin:0 0 10px" onclick="CV.tripSyncSheet('${id}')">🔄 Synchro de ce voyage partagé</button>` : ''}
        ${field('Nom du voyage','titre',t.titre,'text','required placeholder="Ex. Week-end Palma, Été 2028…"')}
        ${field('Itinéraire / sous-titre','sous',t.sous,'text','placeholder="Ex. Rome → Malte → Athènes"')}
        <div class="v-f2">${field('Début','debut',t.debut,'date')}${field('Fin','fin',t.fin,'date')}</div>
        <div class="v-f"><label>Voyageurs</label>${peopleSel('cv-tv', pool, t.voyageurs||[])}</div>
        ${covBlock()}
        <div class="v-f"><label>Devise du voyage</label><select class="v-in" name="devise">${Object.keys(CURS).map(c=>`<option value="${c}"${c===(t.devise || (id ? 'EUR' : (M.cur || 'EUR'))) ? ' selected' : ''}>${c} · ${CURS[c]}</option>`).join('')}</select></div>
        ${field('Objectif de budget par personne (' + CS() + ')','objectif',t.objectif,'text','inputmode="decimal"')}
        ${id ? '' : `<label class="cv-checkline"><input type="checkbox" id="cv-basic" checked> Ajouter une checklist de base</label>`}
        ${actions(id ? `CV.delTrip('${id}')` : '')}
      </form>`);
    covPrev();
  }
  /* ── 🖼️ Photo de couverture : Wikipédia / Wikimedia Commons ou ma bibliothèque (fiche du voyage et assistant de création) ── */
  const covBlock = () => `<div class="v-f"><label>🖼️ Photo de couverture</label>
          <div class="cov-prev"><span class="cov-img" id="cov-img" style="--tg:${TC_GRAD.prep}"></span><small id="cov-src"></small></div>
          <div class="cov-btns"><button type="button" class="v-day-edit" onclick="CV.covWiki()">🌐 Chercher sur Wikipédia</button>
            <label class="v-day-edit">📷 Ma bibliothèque<input type="file" accept="image/*" hidden onchange="CV.covFile(this)"></label>
            <button type="button" class="v-day-edit" id="cov-del" onclick="CV.covDel()">✕ Retirer</button></div>
          <div id="cov-pick"></div></div>`;
  const covT = () => (document.getElementById('wz-cov') && wz) ? wz : editing;   // l’assistant garde ses choix dans wz, la fiche dans editing
  async function covPrev(){
    const t = covT(), im = document.getElementById('cov-img'), src = document.getElementById('cov-src'), del = document.getElementById('cov-del'); if(!t || !im) return;
    const u = await coverURL(t, true);
    im.style.backgroundImage = u ? `url("${u}")` : '';
    if(src) src.textContent = t.cover ? 'Ta photo' : t.coverWk ? 'Photo : Wikimedia Commons / Wikipédia' : u ? 'Automatique : une photo de tes souvenirs' : 'Automatique : la photo Wikipédia de la destination (vignette de Mes voyages)';
    if(del) del.style.display = t.cover || t.coverWk ? '' : 'none';
  }
  async function covFile(input){
    const f = input.files && input.files[0], editing = covT(); if(!f || !editing) return;
    const src = document.getElementById('cov-src'); if(src) src.textContent = 'Préparation…';
    try { const pid = 'ph' + uid(); await storePhoto(f, pid); editing.cover = pid; editing.coverWk = ''; persist(); }
    catch(e){ toast('Cette photo n’a pas pu être lue'); }
    input.value = ''; const pk = document.getElementById('cov-pick'); if(pk) pk.innerHTML = ''; covPrev();
  }
  function covDel(){ const editing = covT(); if(!editing) return; editing.cover = ''; editing.coverWk = ''; covPrev(); }
  async function covWiki(q){
    const t = covT(), pk = document.getElementById('cov-pick'); if(!t || !pk) return;
    if(q == null){ const f = document.getElementById('v-form'); q = (t === wz ? ((t.etapes || []).map(e=>e.ville).find(Boolean) || t.titre) : (t.id && tripPlace(t))) || (f && f.titre && f.titre.value.trim()) || t.titre || ''; }
    pk.innerHTML = `<div class="cov-q"><input class="v-in" id="cov-q" value="${esc(q)}" placeholder="Ville, monument, pays…" onkeydown="if(event.key==='Enter'){event.preventDefault();CV.covWiki(this.value)}"><button type="button" class="v-day-edit" onclick="CV.covWiki(document.getElementById('cov-q').value)" aria-label="Chercher">🔎</button></div><div class="v-sum-small">Recherche…</div>`;
    if(!q.trim()) { pk.querySelector('.v-sum-small').textContent = 'Écris une ville ou un lieu.'; return; }
    // Wikimedia n’accepte plus que des largeurs « standard » (330, 500, 960, 1280…) : vignette 330 px, couverture 960 px ou l’original s’il est plus petit
    const out = [], seen = new Set(), add = (g, f) => { if(g && !seen.has(f || g)){ seen.add(f || g); out.push({g, f:f || g}); } };
    try { const w = await wkPhoto(q, true); if(w) add(w.g, w.f); } catch(e){}
    // même chemin que l’Explorer (Special:FilePath, largeurs 500 et 960) : c’est celui qui s’affiche bien sur les téléphones
    try { const r = await (await fetch('https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=24&gsrsearch=' + encodeURIComponent(q + ' filetype:bitmap') + '&prop=imageinfo&iiprop=size|mime')).json();
      Object.values((r.query || {}).pages || {}).sort((a, b)=>(a.index||0) - (b.index||0)).forEach(p=>{ const i = (p.imageinfo || [])[0] || {};
        if(!p.title || !/jpe?g|png|webp/.test(i.mime || 'image/jpeg') || (i.width && i.width < i.height * 0.9)) return;
        add(commons(p.title, 500), commons(p.title, i.width && i.width < 960 ? i.width : 960)); }); } catch(e){}
    const box = document.getElementById('cov-pick'); if(!box) return;
    box.querySelector('.v-sum-small').outerHTML = out.length ? `<div class="cov-grid">${out.slice(0, 15).map(o=>`<button type="button" class="cov-ph" onclick="CV.covPick(this)" data-u="${esc(o.f)}"><img src="${esc(o.g)}" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></button>`).join('')}</div><div class="v-sum-small">Photos Wikimedia Commons (licences libres). Touche celle que tu veux.</div>`
      : '<div class="v-sum-small">Aucune photo trouvée (pas de réseau ?). Essaie un autre mot.</div>';
  }
  function covPick(b){ const editing = covT(); if(!editing) return; editing.coverWk = b.dataset.u; editing.cover = ''; document.getElementById('cov-pick').innerHTML = ''; covPrev(); }
  // l'image de couverture d'un voyage : ma photo › Wikipédia choisie › 1re photo de souvenir › (vignettes) photo auto de la destination
  async function coverURL(t, noAuto){
    if(t.cover){ const u = urls[t.cover + '.t'] || urls[t.cover] || await photoURL(t.cover + '.t').catch(()=>''); if(u) return u; }
    if(t.coverWk) return t.coverWk;
    const id = coverId(Object.assign({}, t, {cover:''}));
    if(id){ const u = urls[id + '.t'] || urls[id] || await photoURL(id + '.t').catch(()=>''); if(u) return u; }
    return '';
  }
  function saveTrip(){
    const t = editing; if(!t) return;
    const fd = new FormData(document.getElementById('v-form'));
    for(const [k,v] of fd.entries()) t[k] = String(v).trim();
    if(!t.titre){ alert('Donne un nom au voyage.'); return; }
    t.voyageurs = peopleVal('cv-tv'); if(!t.voyageurs.length && M.me) t.voyageurs = [M.me];
    t.objectif = t.objectif === '' ? '' : num(t.objectif);
    const isNew = !t.id;
    if(isNew) t.id = 't' + uid();
    const out = [t];
    if(isNew && document.getElementById('cv-basic') && document.getElementById('cv-basic').checked)
      BASIC_CHECK.forEach(([cat,label],i)=>out.push({id:'c'+uid()+i, type:'check', trip:t.id, cat, label, done:false}));
    const before = isNew ? [] : ((R[t.id] || {}).voyageurs || []);
    putMany(out, isNew ? '🧳 Voyage créé' : '💾 Enregistré');
    closeSheet(true);
    if(isNew){ M.tab = 'prog'; go(t.id); } else { refresh(); inviteAdded(t.id, t.voyageurs.filter(p=>!before.includes(p))); }
  }
  async function delTrip(id){
    const t = R[id]; if(!t) return;
    // voyage partagé créé par quelqu’un d’autre : on ne le supprime que chez soi (on le quitte), jamais chez les autres
    const sc = TS()[id], shared = sc && spaceObj(sc), notMine = (t.createdBy && t.createdBy !== M.me) || (!t.createdBy && (M.viaP || {})[id]);
    if(shared && (notMine || mbOthers(id).length)){   // créateur aussi : s’il reste des compagnons, le voyage continue pour eux
      tripUnshare(id, 1); return;   // même choix que « quitter » : mes photos restent ou partent avec moi
    }
    if(!(await uiConfirm('Supprimer le voyage « ' + t.titre + ' » et toutes ses fiches ? (pour tout le monde si la synchro est active)'))) return;
    const out = Object.values(R).filter(r=>r.trip===id && !r.deleted);
    out.forEach(r=>r.deleted = true); t.deleted = true;
    putMany([...out, t], '🗑 Voyage supprimé'); closeSheet(true); M.trip = null; applyMode();
  }
  async function closeTrip(){
    const t = trip(); if(!t) return;
    if(!(await uiConfirm('Clôturer « ' + t.titre + ' » : tout marquer payé et coché, et le garder en archive ?'))) return;
    const out = [];
    items().forEach(i=>{ if(i.statut!=='paid'){ i.statut='paid'; out.push(i); } });
    list('check', c=>c.trip===t.id && !c.done).forEach(c=>{ c.done = true; out.push(c); });
    t.archived = true; out.push(t);
    putMany(out, '✓ Voyage clôturé'); refresh();
  }
  function reopenTrip(){ const t = trip(); t.archived = false; put(t); refresh(); }

  /* ══════════ Profils ══════════ */
  function colorPick(sel){
    return `<input type="hidden" id="cv-pcol" value="${sel}"><div class="cv-colors">${COLORS.map(c=>`<button type="button" class="cv-sw${c===sel?' on':''}" style="background:${c}" data-c="${c}" onclick="CV.pickColor(this)" aria-label="Couleur"></button>`).join('')}
      <label class="cv-sw cv-sw-custom" title="Autre couleur">🎨<input type="color" value="${sel}" oninput="CV.pickColor(this)"></label></div>`;
  }
  function pickColor(el){
    const c = el.dataset.c || el.value;
    document.getElementById('cv-pcol').value = c;
    document.querySelectorAll('.cv-sw').forEach(s=>s.classList.remove('on'));
    (el.dataset.c ? el : el.parentNode).classList.add('on');
    if(!el.dataset.c) el.parentNode.style.background = c;
  }
  function newProfile(toTrip){
    const nom = document.getElementById('cv-pnom').value.trim(); if(!nom) return;
    if(profiles().length >= MAXP){ alert('Maximum ' + MAXP + ' compagnons dans un carnet.'); return; }
    const p = put({id:'p'+uid(), type:'profile', nom, couleur:document.getElementById('cv-pcol').value}, '👤 ' + nom + ' ajouté(e)');
    if(toTrip===true && trip()) addToTrip(p.id); else { closeSheet(); refresh(); }
    return p;
  }
  const profLocked = id => { const p = id && R[id]; return !!(p && p.type === 'profile' && id !== M.me && p.dev && p.dev !== devId()); };
  function editProfile(id){
    if(profLocked(id)){ alert(pname(id) + ' : ' + MSGT('seule cette personne peut modifier son profil (prénom, couleur, moyen de remboursement).')); return; }
    const p = id ? clone(R[id]) : {id:null, nom:'', couleur:nextColor()};
    editing = p;
    openSheet(`<h2>👤 ${id ? 'Modifier le profil' : 'Nouveau profil'}</h2>${byline(p)}
      <form onsubmit="event.preventDefault();CV.saveProfile()">
        <div class="v-f"><label>Prénom</label><input class="v-in" id="cv-pnom" value="${esc(p.nom)}" required></div>
        <div class="v-f"><label>Couleur</label>${colorPick(p.couleur)}</div>
        <div class="v-f"><label>Pour me rembourser (facultatif)</label><input class="v-in" id="cv-prb" value="${esc(p.rembours||'')}" placeholder="Ex. Lydia ou Wero au 06…, ou IBAN FR76…"></div>
        ${actions(id && id!==M.me ? `CV.delProfile('${id}')` : '')}
      </form>`);
  }
  function saveProfile(){
    const p = editing; p.nom = document.getElementById('cv-pnom').value.trim(); if(!p.nom) return;
    p.couleur = document.getElementById('cv-pcol').value; p.type = 'profile';
    const rb = document.getElementById('cv-prb'); if(rb) p.rembours = rb.value.trim();
    if(!p.id) p.id = 'p' + uid();
    if(!prof(M.me)) M.me = p.id;
    put(p); closeSheet(true);
    if(M.joinAdd && R[M.joinAdd]){ const t = clone(R[M.joinAdd]); t.voyageurs = [...new Set([...(t.voyageurs||[]), M.me])]; delete M.joinAdd; put(t, '👋 Tu es ajouté au voyage'); applyMode(); }
    refresh();
  }
  async function delProfile(id){ if(profLocked(id)){ alert(pname(id) + ' : ' + MSGT('seule cette personne peut modifier son profil (prénom, couleur, moyen de remboursement).')); return; } if(!(await uiConfirm('Supprimer le profil ' + pname(id) + ' ? Ses fiches restent.'))) return; drop(id); closeSheet(); refresh(); }
  function whoSheet(){
    openSheet(`<h2>👤 Qui utilise ce téléphone ?</h2>
      <div class="v-sum-small" style="margin-bottom:10px">Tes ajouts et modifications seront signés de ce nom, dans sa couleur.</div>
      <div class="cv-plist">${profiles().map(p=>`<button class="cv-prow${p.id===M.me?' me':''}" onclick="CV.setMe('${p.id}')">${pchip(p.id)}<span>${p.id===M.me?'✓ c’est moi':'C’est moi'}</span></button>`).join('')}</div>
      <button class="v-btn sec" style="margin-top:10px" onclick="CV.editProfile(null)">＋ Nouveau profil</button>
      ${prof(M.me) ? `<button class="v-btn sec" onclick="CV.editProfile('${M.me}')">🎨 Changer mon nom / ma couleur</button>` : ''}`, !prof(M.me));
  }
  async function setMe(id){
    if(profLocked(id) && !(await uiConfirm(MSGT('Ce profil est déjà utilisé sur un autre téléphone. C’est bien toi (nouveau téléphone) ?')))) return;
    if(profLocked(id)) putQuiet([Object.assign(clone(R[id]), {dev:devId()})]);
    M.me = id; persist(); closeSheet(true); refresh(); toast('Bonjour ' + pname(id) + ' 👋'); }

  /* ══════════ Partage & réglages ══════════ */
  function genCode(){
    const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = new Uint8Array(12); crypto.getRandomValues(r);
    return [...r].map(x=>a[x % a.length]).join('').replace(/(.{4})(?=.)/g,'$1-');
  }
  function activity(){
    return Object.values(R).filter(r=>r.updatedBy && (r.updatedAt||0) > 1000 && r.type!=='geo' && !(r.type === 'place' && r.sugg))
      .sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,30).map(r=>{
        const verb = r.deleted ? 'a supprimé' : (r.createdAt && Math.abs(r.updatedAt-r.createdAt) < 2000) ? 'a ajouté' : 'a modifié';
        const what = r.type==='item' ? icon(r)+' '+esc(r.titre) : r.type==='note' ? '📌 note « '+esc((r.texte||'').slice(0,40))+' »'
          : r.type==='wish' ? '✨ envie « '+esc(r.titre)+' »' : r.type==='trip' ? '🧳 voyage « '+esc(r.titre)+' »'
          : r.type==='day' ? '📅 programme du '+fdate(r.date) : r.type==='check' ? '✅ '+esc(r.label)+(r.done?' (coché)':'') : r.type==='profile' ? '👤 profil '+esc(r.nom) : r.type==='place' ? '📍 lieu « '+esc(r.nom)+' »' : r.type==='remb' ? '💸 remboursement de '+eur(num(r.montant)) : r.type==='souv' ? '📸 souvenir « '+esc(r.titre||r.lieu||'')+' »' : esc(r.type);
        const tr = r.trip && R[r.trip] && r.type!=='trip' ? ` <span class="cv-act-t">· ${esc(R[r.trip].titre||'')}</span>` : '';
        return `<div class="cv-act"><span class="cv-dot" style="background:${pcol(r.updatedBy)}"></span><div>${pname_c(r.updatedBy)} ${verb} ${what}${tr}<div class="cv-act-w">${vzWhen(r.updatedAt)}</div></div></div>`;
      }).join('') || '<div class="v-sum-small">Rien pour l’instant.</div>';
  }
  function renderReglages(){
    const t = trip(), s = M.sync, hosted = /^https?:/.test(location.protocol);
    let size = 0; try { size = storeIdb ? JSON.stringify(R).length : (localStorage.getItem(KEY)||'').length; } catch(e){}
    const state = !s.on ? '⚪ Désactivée' : s.err ? '🔴 ' + esc(s.err) : M.dirty.length ? '🟠 ' + M.dirty.length + ' modif(s) en attente' : '🟢 À jour' + (E2E ? ' · 🔐 chiffré' : '');
    let h = `<div class="v-box"><h3>👤 Profils</h3>
        <p>Chacun son prénom et sa couleur. Toutes les fiches indiquent qui les a ajoutées ou modifiées.</p>
        <div class="cv-plist">${profiles().map(p=>`<button class="cv-prow${p.id===M.me?' me':''}" onclick="CV.editProfile('${p.id}')">${pchip(p.id)}<span>${p.id===M.me?'moi sur ce téléphone · modifier':profLocked(p.id)?'🔒':'modifier'}</span></button>`).join('')}</div>
        <button class="v-btn sec" style="margin-top:8px" onclick="CV.editProfile(null)">＋ Ajouter un profil</button>
        ${profiles().length > 1 ? `<button class="v-btn sec" style="margin-top:8px" onclick="CV.travSheet()">🧳 Qui part dans quels voyages ?</button>` : ''}
        </div>`;
    if(PUBLIC) h += `<div class="v-box"><h3>🔐 Confidentialité</h3><p>Ton carnet est chiffré avec son code : personne d’autre que vous ne peut le lire.</p><button class="v-btn sec" onclick="CV.infoSheet()">Comment ça marche ?</button>${s.on ? `<button class="v-btn sec" onclick="CV.codeSheet()">📝 Revoir mon code</button>` : ''}</div>`;
    { const md = cloudMode(), L = md ? CLOUD_L[md] : ['☁️', 'Pas encore choisi'];
      h += `<div class="v-box"><h3>☁️ Cloud Vezoria</h3><p>Mode : <b>${L[0]} ${L[1]}</b>${md && md !== 'none' ? '<br>État : ' + state : ''}</p>
        <button class="v-btn" onclick="CV.cloudSheet()">☁️ Ouvrir le cloud</button>
        <button class="v-btn sec" onclick="CV.serverWipeSheet()">🗑 Supprimer mes données du serveur</button></div>`; }
    if(t){
      h += `<div class="v-box"><h3>🧳 Ce voyage</h3><p><b>${esc(t.titre)}</b>${t.debut?' · '+tripDates(t):''}${t.archived?' · ✓ clôturé':''}</p>
        <button class="v-btn sec" onclick="CV.editTrip('${t.id}')">✏️ Modifier (nom, dates, voyageurs)</button>
        ${t.archived ? `<button class="v-btn sec" onclick="CV.reopenTrip()">↺ Rouvrir le voyage</button>` : `<button class="v-btn sec" onclick="CV.closeTrip()">✓ Clôturer (tout payé et coché, garder la trace)</button>`}
        ${t.demo ? '' : `<button class="v-btn" onclick="CV.shareHub()">👥 Partager ce voyage</button>`}
        <button class="v-btn sec" onclick="CV.pdfSheet()">🖨️ Carnet de route à imprimer (PDF)</button>
        <button class="v-btn sec" onclick="CV.newTrip()">＋ Nouveau voyage</button></div>`;
    }
    h += `<div class="v-box"><h3>👥 Partager</h3><p>Compagnons, abonnés, voyages que tu suis, codes reçus et QR code de l’appli : tout est au même endroit.</p><button class="v-btn" onclick="CV.shareHub()">👥 Ouvrir Partager</button></div>`;
    h += `<div class="v-box"><h3>🕘 Activité récente</h3>${activity()}</div>
      ${dupGroups().length ? `<div class="v-box"><h3>👥 Profils en double</h3><p>Deux profils au même prénom ? Fusionne-les : tout passe sur celui que tu gardes, l’autre est supprimé chez tout le monde.</p><button class="v-btn sec" onclick="CV.mergeSheet()">👥 Fusionner les profils en double</button></div>` : ''}<div class="v-box"><h3>🔗 Photos ou voyages partagés qui n’arrivent plus ?</h3><p>Si un voyage partagé a été rattaché au mauvais code, ses photos et ses mises à jour ne viennent plus. L’appli retrouve le bon code de chaque voyage, sans rien effacer.</p><button class="v-btn sec" onclick="CV.linkSheet()">🔗 Réparer les liens des voyages</button></div><div class="v-box"><h3>🧹 Voyages arrivés par erreur ?</h3><p>Tu vois des voyages qui ne sont pas pour toi (par exemple tout le carnet d’un compagnon) ? Garde ceux que tu choisis, les autres sont retirés de ce téléphone seulement.</p><button class="v-btn sec" onclick="CV.hideSheet()">🧹 Choisir les voyages à garder</button></div>`;
    document.getElementById('cv-body').innerHTML = h;
    accordion();
  }
  // ⚙️ ce qui concerne l’appli elle-même (pas le partage) : affiché dans Réglages
  function appPrefsHTML(){
    const s = M.sync; let size = 0; try { size = storeIdb ? JSON.stringify(R).length : (localStorage.getItem(KEY)||'').length; } catch(e){}
    let h = '';
    if(!isInstalled()) h += `<div class="v-box">${installHTML(false)}</div>`;
    h += `${coffeeBox()}<div class="v-box"><h3>✨ Apparence</h3><div class="vz-glass-sw"><p style="margin:0">Effet verre : fond aux couleurs du voyage et cartes translucides.</p><button type="button" class="v-btn${M.glass === false ? ' sec' : ''}" style="width:auto;margin:0;flex:none" onclick="CV.glassToggle()">${M.glass === false ? 'Activer' : 'Activé ✓'}</button></div><div class="vz-glass-sw" style="margin-top:10px"><p style="margin:0">Texte plus grand, dans toute l’appli.</p><button type="button" class="v-btn${M.bigText ? '' : ' sec'}" style="width:auto;margin:0;flex:none" onclick="CV.bigToggle()">${M.bigText ? 'Activé ✓' : 'Activer'}</button></div></div>`;
    h += `<div class="v-box"><h3>🎬 Tutos</h3><p>Les 4 espaces du carnet (Préparation, En cours, Passés, Bilan), et l’essentiel pour bien commencer.</p>${tutoBtn()}${ESCALE ? `<button type="button" class="v-btn sec" onclick="CV.escaleTuto()">🎓 Tuto Escale premium</button><button type="button" class="v-btn sec" onclick="CV.radarTuto()">✦ Tuto Radar des prix (3 min)</button>` : ''}</div>`;
    h += `<div class="v-box"><h3>🔄 Mise à jour de l’appli</h3><p>Version installée : ${BUILD}. Si une nouveauté n’apparaît pas, touche le bouton : tes voyages et tes photos ne sont pas touchés.</p><button class="v-btn sec" onclick="CV.forceUpdate()">🔄 Mettre à jour maintenant</button></div><div class="v-box"><h3>📤 Voyage ou photos non arrivés ?</h3><p>Renvoie vers le serveur toutes les fiches et toutes les photos de ce téléphone, par exemple après une suppression sur le serveur. Rien n’est dupliqué.</p><button class="v-btn" onclick="CV.photoResend()">📤 Tout renvoyer</button></div>
      <div class="v-box"><h3>💾 Sauvegarde</h3>
        <p>Tout est enregistré sur ce téléphone (${Math.round(size/1024)} Ko)${s.on?' et sur le serveur':''}. L’export reste ta copie de secours, et il contient aussi l’archive 2026.</p>
        <button class="v-btn" onclick="CV.zipSheet()">💾 Sauvegarde complète ZIP (avec photos)</button>
        <button class="v-btn sec" onclick="CV.exportShare()">📤 Exporter / envoyer (.json, sans photos)</button>
        <button class="v-btn sec" onclick="CV.exportDownload()">⬇️ Télécharger le fichier</button>
        <button class="v-btn sec" onclick="CV.importPick()">📥 Importer un export ou une sauvegarde (JSON ou ZIP)</button>
        <button class="v-btn danger" onclick="CV.wipe()">Effacer ce téléphone</button>
        ${s.on ? `<button class="v-btn sec" onclick="CV.askErase()">🗑 Demander l’effacement sur le serveur</button>` : ''}
        <a class="v-btn sec" href="mentions-legales" style="display:block;text-align:center;text-decoration:none">🔒 Mentions légales et confidentialité</a></div>`;
    return h;
  }
  /* Sections repliables : on ne voit que les titres, un toucher ouvre la section (état gardé pendant la session) */
  var accOpen = {'👤 Profils':1};
  function accordion(){
    document.querySelectorAll('#cv-body > .v-box').forEach(b=>{
      const h3 = b.firstElementChild; if(!h3 || h3.tagName !== 'H3') return;
      const d = document.createElement('details'); d.className = 'v-box cv-acc';
      const key = h3.textContent.trim(); if(accOpen[key]) d.open = true;
      const sm = document.createElement('summary'); sm.innerHTML = h3.innerHTML; h3.remove();
      d.appendChild(sm); while(b.firstChild) d.appendChild(b.firstChild);
      d.addEventListener('toggle', ()=>{ if(d.open) accOpen[key] = 1; else delete accOpen[key]; });
      b.replaceWith(d);
    });
  }
  async function syncOn(codeArg){
    const urlEl = document.getElementById('cv-surl');
    const code = String(typeof codeArg === 'string' ? codeArg : ((document.getElementById('cv-scode') || {}).value || '')).trim().toUpperCase();
    if(code.length < 8){ alert('Choisis ou génère un code d’au moins 8 caractères.'); return; }
    const prev = clone(M.sync);
    M.sync.url = urlEl ? urlEl.value.trim() : M.sync.url; M.sync.code = code;
    if(!apiUrl()){ alert('Indique l’adresse de l’appli en ligne.'); M.sync = prev; return; }
    try {
      const j = await call(0, []);
      const remote = j.records.filter(r=>!r.deleted);
      const localContent = Object.values(R).filter(r=>r.type!=='profile' && !r.deleted && !r.demo);
      if(remote.length && localContent.length){
        const replace = (await uiConfirm(`Le carnet partagé contient déjà ${remote.length} fiches.\n\nOK = utiliser le carnet partagé (recommandé pour rejoindre : ce téléphone garde seulement ses profils).\nAnnuler = fusionner les deux carnets.`));
        if(replace) Object.keys(R).forEach(id=>{ if(R[id].type!=='profile') delete R[id]; });
      }
      M.dirty = [];
      mergeRemote(j.records);
      Object.values(R).forEach(r=>{ if(!j.records.some(x=>x.id===r.id)) markDirty(r.id); });
      M.sync.on = true; M.sync.since = j.now; M.sync.err = '';
      if(!remote.length) await photoQueueAll();   // serveur vide (neuf ou effacé) : les photos de ce téléphone repartent aussi
      persist();
      await syncNow();
      if(!prof(M.me)) whoSheet();
      refresh(); toast('☁️ Synchro activée');
      if(PUBLIC && prof(M.me)) setTimeout(codeSheet, 300);
    } catch(e){ M.sync = prev; persist(); alert('Connexion impossible : ' + e.message); }
  }
  async function syncOff(){ if(!(await uiConfirm('Désactiver la synchro sur ce téléphone ? Les données restent ici.'))) return; M.sync.on = false; persist(); refresh(); }
  async function shareCode(){
    const url = M.sync.url || (/^https?:/.test(location.protocol) ? location.origin + location.pathname : '');
    const text = `Rejoins mon carnet Vezoria 🧳\n${url}\nCode principal : ${M.sync.code}\n(☁️ Cloud → « Tu as déjà un code principal ? » → colle le code)`;
    if(navigator.share){ try { await navigator.share({title:'Vezoria', text}); return; } catch(e){ return; } }
    try { await navigator.clipboard.writeText(text); toast('📋 Invitation copiée'); } catch(e){ (await uiPrompt('Copie ce texte :', text)); }
  }

  /* ── Export / import ── */
  function backupObject(){
    let arch = null; try { arch = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || 'null'); } catch(e){}
    return {app:'carnet-voyage', format:2, exportedAt:new Date().toISOString(), records:R, archive2026:arch};
  }
  const fileName = () => 'carnet-voyage-' + new Date().toISOString().slice(0,10) + '.json';
  function exportDownload(){
    const blob = new Blob([JSON.stringify(backupObject(), null, 2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileName();
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
    toast('📤 Export prêt');
  }
  async function exportShare(){
    const file = new File([JSON.stringify(backupObject(), null, 2)], fileName(), {type:'application/json'});
    if(navigator.canShare && navigator.canShare({files:[file]})){ try { await navigator.share({files:[file], title:'Vezoria'}); } catch(e){} }
    else exportDownload();
  }
  async function importData(data){
    let recs = [];
    if(data && data.format === 'vezoria-modele' && Array.isArray(data.records)){
      if(!M.me){ throw new Error('Indique d’abord ton prénom.'); }
      const day0 = addDays(isoToday(), parseInt(data.debut || 0, 10) || 0), tid = 't' + uid(), ids = {}, now = Date.now();
      const mapId = v => v === '__T__' ? tid : v === '__ME__' ? M.me : (v[0] === '~' ? (ids[v] = ids[v] || 'i' + uid() + v.slice(1)) : v);
      const conv = v => typeof v === 'string' ? (/^@-?\d+$/.test(v) ? addDays(day0, parseInt(v.slice(1), 10)) : /^(__|~)/.test(v) ? mapId(v) : v)
        : Array.isArray(v) ? v.map(conv) : (v && typeof v === 'object') ? Object.fromEntries(Object.entries(v).map(([k, x])=>[k, conv(x)])) : v;
      data.records.forEach((t, k)=>{ if(!t || t.type === 'profile') return; const r = conv(JSON.parse(JSON.stringify(t)));
        if(r.type === 'day') r.id = 'day:' + tid + ':' + r.date; if(!r.id) r.id = 'i' + uid() + k;
        r.createdBy = r.createdBy || M.me; r.updatedBy = r.updatedBy || r.createdBy; r.createdAt = now + k; r.updatedAt = now + k; delete r.demo; recs.push(r); });
      M.trip = tid;
    }
    else if(data && data.format===2 && data.records) recs = Object.values(data.records);
    else {
      const v1 = data && (data.voyage2027 || (Array.isArray(data.items) ? data : null));
      if(!v1 || !Array.isArray(v1.items)) throw new Error('Ce fichier ne contient pas de carnet de voyage.');
      recs = fromV1(v1, M.me, false);
      if(R.t2027 && !R.t2027.deleted && !(await uiConfirm('Le voyage 2027 existe déjà ici. Le remplacer par celui du fichier ?'))) recs = [];
      if(recs.length) Object.values(R).forEach(r=>{ if(r.trip==='t2027' && !r.deleted){ r.deleted = true; stamp(r); markDirty(r.id); } });
      recs.forEach(r=>{ stamp(r); r.imported = true; });
    }
    let n = 0;
    recs.forEach(r=>{ if(r && r.id && (!R[r.id] || (r.updatedAt||0) >= (R[r.id].updatedAt||0))){ R[r.id] = r; markDirty(r.id); n++; } });
    return n;
  }
  function importPick(){
    const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; if(!isIOSDev) inp.accept = 'application/json,.json,.zip,application/zip,application/x-zip-compressed';
    inp.style.cssText = 'position:fixed;left:-1000px;top:0;opacity:0'; document.body.appendChild(inp);
    inp.onchange = async e => {
      const fs = [...(e.target.files || [])]; setTimeout(()=>inp.remove(), 1000); if(!fs.length) return;
      // une sauvegarde ZIP (une ou plusieurs parties) choisie ici : elle part dans la restauration ZIP
      const isZip = async x => { try { const h = new Uint8Array(await x.slice(0, 2).arrayBuffer()); return h[0] === 0x50 && h[1] === 0x4b; } catch(err){ return false; } };
      const zips = []; for(const x of fs) if(await isZip(x)) zips.push(x);
      if(zips.length){ zips.sort((a,b)=>a.name.localeCompare(b.name, 'fr', {numeric:true})); for(const z of zips) await zipRestore(z, zips.length > 1); if(zips.length > 1) alert('💾 ' + zips.length + ' parties restaurées.'); return; }
      const f = fs[0];
      const rd = new FileReader();
      rd.onload = async () => {
        let data; try { data = JSON.parse(rd.result); } catch(err){ alert('Fichier illisible : ce n’est pas un export JSON valide.'); return; }
        try {
          const n = await importData(data);
          if(data.archive2026 && (await uiConfirm('Le fichier contient aussi l’archive 2026. La restaurer ?'))) localStorage.setItem(ARCHIVE_KEY, JSON.stringify(data.archive2026));
          await persistNow(); queueSync(); alert(n + ' fiche(s) importée(s) (les plus récentes gagnent).'); location.reload();
        } catch(err){ alert(err.message); }
      };
      rd.readAsText(f);
    };
    inp.click();
  }
  const CONTACT = 'appareils.treves6g@icloud.com';   // contact de l'éditeur (aussi dans mentions-legales.html et privacy.html)
  async function askErase(){
    if(!M.sync.on){ alert('Ce carnet n’est pas synchronisé : rien n’est stocké sur le serveur.'); return; }
    if(!(await uiConfirm('Demander l’effacement de ce carnet sur le serveur ?\n\nToutes ses données en ligne seront supprimées, pour TOUS ses membres. Un e-mail va être préparé : il contient seulement l’identifiant chiffré du carnet, jamais son code.'))) return;
    const id = hex(await crypto.subtle.digest('SHA-256', te.encode('carnet-voyage:' + await authCode())));
    const body = 'Bonjour,\n\nJe demande l’effacement des données de mon carnet sur le serveur.\n\nIdentifiant du carnet : ' + id + '\n\nMerci.';
    location.href = 'mailto:' + CONTACT + '?subject=' + encodeURIComponent('Vezoria : effacement des données') + '&body=' + encodeURIComponent(body);
  }
  async function wipe(){
    if(!(await uiConfirm('Effacer le carnet de ce téléphone ? ' + (M.sync.on ? 'Les données restent sur le serveur partagé, tu pourras le rejoindre à nouveau avec le code.' : 'Sans synchro, tout sera perdu : exporte avant !')))) return;
    const w = (await uiPrompt('Pour confirmer, écris EFFACER en majuscules :', ''));
    if(w === null) return;
    if(w.trim() !== 'EFFACER'){ alert('Mot incorrect : rien n’a été effacé.'); return; }
    persistOff = true; clearTimeout(persistT);   // plus aucune écriture : sinon le carnet serait réécrit juste avant le rechargement
    localStorage.removeItem(KEY);
    try { indexedDB.deleteDatabase('carnet-photos'); } catch(e){}
    try { indexedDB.deleteDatabase('vz-carnet'); } catch(e){}
    location.reload();
  }

  /* ══════════ Reprise des données 2027 (ancien format) ══════════ */
  function fromV1(S, meId, seed){
    const tid = 't2027', out = [];
    const comp = (S.voyageurs||[]).slice(1).map((v,i)=>({id:'p'+uid()+i, type:'profile', nom:v.nom, couleur:COLORS[(i+1)%COLORS.length]}));
    out.push(...comp);
    out.push({id:tid, type:'trip', titre:'Méditerranée antique', sous:'Rome → Malte → Athènes → Égypte', debut:'2027-07-13', fin:'2027-07-31',
      voyageurs:[meId, ...comp.map(c=>c.id)].filter(Boolean), objectif:S.objectif||4000});
    (S.items||[]).forEach((it,i)=>out.push(Object.assign({}, it, {id: seed ? 's27-'+i : it.id, type:'item', trip:tid})));
    Object.entries(S.days||{}).forEach(([d,v])=>out.push({id:'day:'+tid+':'+d, type:'day', trip:tid, date:d, titre:v.titre||'', plan:v.plan||''}));
    (S.checklist||[]).forEach((c,i)=>out.push({id:'chk:'+tid+':'+(seed ? 's'+i : c.id), type:'check', trip:tid, cat:c.cat, label:c.label, done:!!c.done}));
    return out;
  }

  /* ══════════ Premier lancement ══════════ */
  function onboarding(){
    let old = null; try { old = JSON.parse(localStorage.getItem(OLD) || 'null'); } catch(e){}
    const hosted = /^https?:/.test(location.protocol);
    openSheet(`<h2>Bienvenue à bord ✈️</h2>
      <div class="v-sum-small" style="margin-bottom:12px">Ici on prépare les voyages à plusieurs. Chacun a sa couleur, et tout ce que tu ajoutes est signé de ton prénom.</div>
      ${obSetupHTML()}
      <div class="cv-seg-big">${segBtns('cv-ob', [['new','🆕 Je crée mon carnet'],['join','🔗 Je rejoins un carnet']], 'new')}</div>
      <div id="cv-ob-new">
        <div class="v-f"><label>Ton prénom</label><input class="v-in" id="cv-pnom" placeholder="Ex. Camille"></div>
        <div class="v-f"><label>Ta couleur</label>${colorPick(COLORS[0])}</div>
        ${!PUBLIC && old && Array.isArray(old.items) ? `<div class="v-hint">✅ Tes saisies du voyage 2027 (${old.items.length} fiches) seront reprises.</div>` : ''}
        <button class="v-btn" onclick="CV.obCreate()">Commencer</button>
        ${PUBLIC ? `<button class="v-btn sec" onclick="CV.obCreate('demo')">👀 Commencer avec un voyage de démo</button>
        <div class="v-sum-small" style="margin-top:6px;text-align:center">Trois voyages déjà remplis (à préparer, en cours, terminé) pour tout découvrir. Il reste sur ton téléphone et se supprime en un geste.</div>` : ''}
      </div>
      <div id="cv-ob-join" style="display:none">
        ${hosted ? '' : `<div class="v-f"><label>Adresse de l’appli en ligne</label><input class="v-in" id="cv-surl" placeholder="https://carnet-voyage.pages.dev"></div>`}
        <div class="v-f"><label>Invitation reçue (lien ou code)</label><input class="v-in" id="cv-scode" placeholder="https://… ou XXXX-XXXX-XXXX" autocapitalize="characters"></div>
        ${qrBtn('cv-scode')}<button type="button" class="v-btn sec" style="margin-bottom:8px" onclick="CV.obPaste()">📋 Coller l’invitation</button>
        <div class="v-sum-small" style="margin:-4px 0 10px">Un code de voyage reçu par message marche ici : seul ce voyage est ajouté, sans créer de carnet en ligne.</div>
        <button class="v-btn" onclick="CV.obJoin()">Rejoindre</button>
      </div>
      ${PUBLIC && !M.cguOk ? `<div class="v-sum-small cv-cgu-line" style="margin-top:12px;text-align:center" data-notr>${esc(MSGT('En continuant, tu acceptes les {0} et la {1}.')).replace('{0}', `<a href="${I18N_LEGAL()}" target="_blank" rel="noopener">${esc(MSGT('mentions légales'))}</a>`).replace('{1}', `<a href="${I18N_PRIV()}" target="_blank" rel="noopener">${esc(MSGT('politique de confidentialité'))}</a>`)}</div>` : ''}`, true);
    obSetupWire();
    document.querySelectorAll('#cv-ob button').forEach(b=>b.addEventListener('click', ()=>{
      const j = b.dataset.v==='join';
      document.getElementById('cv-ob-new').style.display = j ? 'none' : 'block';
      document.getElementById('cv-ob-join').style.display = j ? 'block' : 'none';
    }));
    if(M.joinCode) obJoinPrefill();
  }
  function obJoinPrefill(){ const jb = document.querySelector('#cv-ob button[data-v="join"]'), ci = document.getElementById('cv-scode'); if(jb) jb.click(); if(ci && M.joinCode) ci.value = M.joinCode; }
  // ✈️ premier lancement en UN écran : langue et devise (si pas encore choisies), prénom, couleur, conditions
  const I18N_LEGAL = () => (window.I18N && I18N.lang !== 'fr') ? 'legal-en.html' : 'mentions-legales';
  const I18N_PRIV = () => (window.I18N && I18N.lang !== 'fr') ? 'privacy-en.html' : 'privacy';
  function obSetupHTML(){
    if(M.setup) return '';
    const reg = ((navigator.language || '').split('-')[1] || '').toUpperCase(), guess = M.cur || REGION_CUR[reg] || 'EUR';
    const langs = window.I18N ? Object.entries(I18N.langs) : [['fr', 'Français']], cur = window.I18N ? I18N.lang : 'fr';
    return `<div class="cv-row ob-setup" style="gap:8px;margin-bottom:6px">
      <div class="v-f" style="flex:1;min-width:0"><label for="su-l">Langue</label><select class="v-in" id="su-l">${langs.map(([k,l])=>`<option value="${k}"${k===cur?' selected':''}>${l}</option>`).join('')}</select></div>
      <div class="v-f" style="flex:1;min-width:0"><label for="su-c">Devise</label><select class="v-in" id="su-c">${Object.keys(CURS).map(c=>`<option value="${c}"${c===guess?' selected':''}>${c} · ${CURS[c]}</option>`).join('')}</select></div></div>`;
  }
  function obSetupWire(){
    const l = document.getElementById('su-l'), c = document.getElementById('su-c');
    if(c) c.addEventListener('change', ()=>{ M.cur = c.value || 'EUR'; persist(); });
    if(l) l.addEventListener('change', ()=>{ if(c) M.cur = c.value || 'EUR'; persist(); if(window.I18N && l.value && l.value !== I18N.lang) I18N.set(l.value); });   // recharge dans la langue choisie, l’accueil revient tout de suite
  }
  const obAccept = () => { if(!M.cguOk) M.cguOk = new Date().toISOString(); M.infoSeen = true;
    const c = document.getElementById('su-c'); if(c) M.cur = c.value || M.cur || 'EUR'; M.setup = 1; };
  function obCreate(mode){
    const nom = document.getElementById('cv-pnom').value.trim();
    if(!nom){ alert('Indique ton prénom.'); return; }
    obAccept();
    const me = {id:'p'+uid(), type:'profile', nom, couleur:document.getElementById('cv-pcol').value};
    M.me = me.id; put(me, false);
    let old = null; try { old = JSON.parse(localStorage.getItem(OLD) || 'null'); } catch(e){}
    if(PUBLIC){
      persist(); closeSheet(true); M.trip = null; applyMode(); toast('Bienvenue ' + nom + ' 👋');
      setTimeout(()=> mode==='demo' ? demoLoad() : newTrip(), 400); return;
    }
    if(old && Array.isArray(old.items)){
      putMany(fromV1(old, me.id, false).map(r=>Object.assign(r,{imported:true})), false);
      try { if(localStorage.getItem('carnet_mode')==='2026') M.trip = LEGACY; } catch(e){}
    } else {
      fromV1(defaults(), me.id, true).forEach(r=>{ r.createdAt = r.updatedAt = 1; r.createdBy = r.updatedBy = me.id; R[r.id] = r; markDirty(r.id); });
    }
    if(M.trip !== LEGACY) M.trip = 't2027';
    persist(); closeSheet(true); applyMode(); toast('Bonjour ' + nom + ' 👋');
  }
  async function obJoin(){
    const urlEl = document.getElementById('cv-surl');
    const code = invCode(document.getElementById('cv-scode').value);
    if(code.length < 8){ alert('Colle le code reçu (au moins 8 caractères).'); return; }
    obAccept();
    if(urlEl && urlEl.value.trim()) M.sync.url = urlEl.value.trim();
    // 1) code d’un voyage partagé (le cas le plus courant : une invitation reçue) → seul ce voyage est ajouté
    try {
      if(!spaceObj(code)) (M.spaces = M.spaces || []).push({code, since:0, dirty:[], last:0, err:''});
      const sp = spaceObj(code); await syncSpace(sp, true);
      { const xf = !sp.err && list('xfer', r=>r.trip === 'xf:' + code)[0]; if(xf){ delete M.joinCode; persist(); await xferApply(xf, code); return; } }
      const got = sp.err ? [] : Object.entries(TS()).filter(([, c])=>c === code).map(([tid])=>R[tid]).filter(t=>t && !t.deleted && t.type === 'trip');
      if(got.length){ delete M.joinCode; persist(); closeSheet(true); go(got[0].id); refresh(); joinPick(code); return; }
      M.spaces = (M.spaces || []).filter(x=>x.code !== code);
    } catch(e){ M.spaces = (M.spaces || []).filter(x=>x.code !== code); }
    // 2) sinon : code du carnet complet (mes voyages sur un autre appareil)
    M.sync.code = code;
    try {
      const j = await call(0, []);
      mergeRemote(j.records);
      M.sync.on = true; M.sync.since = j.now; M.sync.err = ''; M.sync.last = Date.now(); delete M.joinCode;
      persist(); closeSheet(true);
      applyMode();
      if(!profiles().length){ editProfile(null); return; }
      whoSheet();
    } catch(e){ M.sync.on = false; persist(); alert('Connexion impossible : ' + e.message); }
  }

  /* ══════════ 💶 Qui paie quoi ══════════ */
  function payLine(it){
    const bits = [], c = chargeOf(it), py = it.payeur || 'chacun';
    if(tv().length > 1){
      if(c.mode==='seul' && parts(it).includes(c.pid)) bits.push(`💶 à la charge de ${pname_c(c.pid)}`);
      else if(c.mode==='perso') bits.push('💶 ' + parts(it).map(pid=>`${pname_c(pid)} ${eur(shareOf(it,pid))}`).join(' · '));
      if(py!=='chacun' && py!=='perso' && prof(py)) bits.push(`💳 payé par ${pname_c(py)}`);
      else if(py==='perso') bits.push('💳 payé à plusieurs');
    }
    const E = it.echeances || [];
    if(E.length){
      const f = E.filter(e=>e.fait).length, next = E.filter(e=>!e.fait && e.date).sort((a,b)=>a.date.localeCompare(b.date))[0];
      bits.push(`📆 ${f}/${E.length} échéance${E.length>1?'s':''} payée${f>1?'s':''}`);
      if(next) bits.push(`⏭ prochaine échéance : ${fshort(next.date)} (${eur(num(next.montant))})`);
    }
    return bits.length ? `<div class="cv-payline">${bits.join('<br>')}</div>` : '';
  }
  function payForm(it){
    const v = tv(), c = chargeOf(it), py = it.payeur || 'chacun';
    let h = `<div class="cv-paybox"><div class="cv-paybox-h">💶 Paiement</div>`;
    if(v.length > 1){
      h += `<div class="v-f"><label>Qui prend en charge le coût ?</label>${segBtns('cv-chg', [['egal','Égal'],['seul','Une personne'],['perso','Montants ' + CS()],['parts','Parts']], c.mode)}<div id="cv-chg-x"></div></div>`;
      h += `<div class="v-f"><label>Qui a payé / avancé l’argent ?</label>${segBtns('cv-pay', [['chacun','Chacun sa part'], ...v.map(p=>[p, esc(pname(p))]), ['perso','Montants']], py)}<div id="cv-pay-x"></div></div>`;
    }
    h += `<div class="cv-live" id="cv-live"></div>`;
    h += `<div class="v-f" style="margin-bottom:0"><label>📆 Échéancier (payer en plusieurs fois)</label><div id="cv-ech"></div>
      <div class="cv-row" style="margin-top:6px"><button type="button" class="v-day-edit" onclick="CV.echAdd()">＋ Échéance</button>
      <span class="v-sum-small">ou étaler en</span><input class="v-in cv-num" id="cv-ech-n" type="number" min="2" max="24" value="3">
      <span class="v-sum-small">fois dès</span><input class="v-in cv-month" id="cv-ech-m" type="month" value="${thisMonth()}">
      <button type="button" class="v-day-edit" onclick="CV.echSpread()">Étaler</button></div></div>`;
    return h + `</div>`;
  }
  let lastChg = null, lastPay = null;
  function liveInit(){ lastChg = lastPay = null; echRender(); live(); }
  function readPay(it){
    const cm = segVal('cv-chg');
    if(cm){
      if(cm==='egal') delete it.charge;
      else {
        const c = {mode:cm};
        if(cm==='seul'){ const b = document.querySelector('#cv-chg-x button.on'); c.pid = b ? b.dataset.p : parts(it)[0]; }
        if(cm==='perso' || cm==='parts'){ c.parts = {}; document.querySelectorAll('[data-chg]').forEach(i=>{ if(i.value.trim()!=='') c.parts[i.dataset.chg] = num(i.value); }); }
        it.charge = c;
      }
    }
    const pm = segVal('cv-pay');
    if(pm){
      if(pm==='chacun') delete it.payeur; else it.payeur = pm;
      if(pm==='perso'){ it.payes = {}; document.querySelectorAll('[data-pay]').forEach(i=>{ if(i.value.trim()!=='') it.payes[i.dataset.pay] = num(i.value); }); }
      else delete it.payes;
    }
    if(document.getElementById('cv-ech')){
      const E = readEch();
      if(E.length){ it.echeances = E; autoStatut(it); } else delete it.echeances;
    }
  }
  function autoStatut(it){
    const E = it.echeances || []; if(!E.length) return;
    const paid = E.filter(e=>e.fait).reduce((s,e)=>s+num(e.montant),0);
    if(E.every(e=>e.fait) && paid >= totalOf(it) - 0.5) it.statut = 'paid';
    else if(it.statut==='paid') it.statut = 'booked';
    else if(E.some(e=>e.fait) && it.statut==='todo') it.statut = 'booked';
  }
  function formTmp(){
    const tmp = clone(editing);
    const fd = new FormData(document.getElementById('v-form'));
    for(const [k,v] of fd.entries()) tmp[k] = String(v).trim();
    tmp.partage = segVal('cv-part') || partage(tmp);
    tmp.statut = segVal('v-seg') || tmp.statut;
    if(document.getElementById('cv-qui')){ const q = peopleVal('cv-qui'); tmp.qui = (!q.length || q.length===tv().length) ? [] : q; }
    return tmp;
  }
  function live(){
    const it = editing; if(!it || it.type!=='item' || !document.getElementById('cv-live')) return;
    const tmp = formTmp(), p = parts(tmp);
    const cm = segVal('cv-chg'), pm = segVal('cv-pay');
    const xc = document.getElementById('cv-chg-x');
    if(xc && (cm!==lastChg || xc.dataset.pp!==p.join())){
      lastChg = cm; xc.dataset.pp = p.join();
      const c = chargeOf(it), keep = {}; document.querySelectorAll('[data-chg]').forEach(i=>keep[i.dataset.chg] = i.value);
      xc.innerHTML = cm==='seul'
        ? `<div class="cv-qsel" style="margin-top:6px">${p.map(pid=>`<button type="button" class="${(c.pid && p.includes(c.pid) ? c.pid : p[0])===pid?'on':''}" data-p="${pid}" style="--pc:${pcol(pid)}" onclick="CV.one(this)">${esc(pname(pid))} paie tout</button>`).join('')}</div>`
        : cm==='perso' || cm==='parts'
        ? `<div class="cv-amts">${p.map(pid=>`<label>${pchip(pid)}<input class="v-in" data-chg="${pid}" inputmode="decimal" value="${esc(keep[pid] ?? ((c.mode===cm && c.parts||{})[pid] ?? ''))}" placeholder="${cm==='perso' ? CS() : 'parts'}"></label>`).join('')}</div><div class="v-sum-small" id="cv-chg-help">${cm==='perso' ? 'Montant exact en ' + CS() + ' pour chacun. Laisse vide : le reste est partagé entre ceux sans montant.' : 'Nombre de parts (ex. 2 et 1 : le premier paie deux fois plus).'}</div>`
        : '';
    }
    const xp = document.getElementById('cv-pay-x');
    if(xp && pm!==lastPay){
      lastPay = pm;
      xp.innerHTML = pm==='perso' ? `<div class="cv-amts">${tv().map(pid=>`<label>${pchip(pid)}<input class="v-in" data-pay="${pid}" inputmode="decimal" value="${esc((it.payes||{})[pid] ?? '')}" placeholder="${CS()}"></label>`).join('')}</div><div class="v-sum-small">Ce que chacun a réellement sorti.</div>` : '';
    }
    readPay(tmp);
    const T = totalOf(tmp);
    if(cm === 'perso'){ const hp = document.getElementById('cv-chg-help'), g = [...document.querySelectorAll('[data-chg]')].filter(i=>i.value.trim()!==''), sg = g.reduce((s,i)=>s+num(i.value),0), left = T - sg;
      if(hp) hp.innerHTML = `Saisi : <b>${eur(sg)}</b> sur ${eur(T)} · ${Math.abs(left) < 0.01 ? '✓ tout est réparti' : left > 0 ? (g.length < p.length ? 'reste ' + eur(left) + ' partagé entre ceux sans montant' : '<b style="color:#a06d00">reste ' + eur(left) + ' : partagé entre tous</b>') : '<b style="color:var(--red)">dépasse de ' + eur(-left) + '</b>'}`; }
    let h = `<div class="cv-live-t">Coût total <b>${eur(T)}</b>${p.length>1 && partage(tmp)==='pp' ? ` <span>(${eur(base(tmp))} × ${p.length})</span>` : ''}</div>`;
    if(tv().length > 1) h += `<div class="cv-live-r">${p.map(pid=>`<span>${pchip(pid)} <b>${eur(shareOf(tmp,pid))}</b></span>`).join('')}</div>`;
    const P = paidAmount(tmp);
    if(P > 0 && tv().length > 1){
      const d = tv().map(pid=>[pid, advancedBy(tmp,pid) - shareOfPaid(tmp,pid)]).filter(x=>Math.abs(x[1]) > 0.5);
      h += `<div class="cv-live-s">Réglé : ${eur(P)}${d.length ? ' · ' + d.map(([pid,x])=> `<span data-notr>${MSGT(x>0 ? '{0} a avancé {1} pour les autres' : '{0} lui doit {1}').replace(/\{(\d)\}/g, (m, i)=> i === '0' ? pname_c(pid) : esc(eur(Math.abs(x))))}</span>`).join(' · ') : ' · chacun a payé sa part'}</div>`;
    }
    const sch = (tmp.echeances||[]).reduce((s,e)=>s+num(e.montant),0);
    if(sch > 0) h += `<div class="cv-live-s">📆 ${eur(sch)} planifiés${Math.abs(sch-T) > 0.5 ? ` · <b style="color:${sch>T?'var(--red)':'#a06d00'}">${sch>T ? 'dépasse de '+eur(sch-T) : 'reste '+eur(T-sch)+' à planifier'}</b>` : ' ✓'}</div>`;
    document.getElementById('cv-live').innerHTML = h;
    const fl = document.getElementById('cv-flinks'); if(fl) fl.innerHTML = linksHTML(tmp, true);
    const fb = document.getElementById('cv-fbook'); if(fb){ const x = bookHTML(tmp); if(fb.dataset.h !== x){ fb.dataset.h = x; fb.innerHTML = x; } }
  }
  function one(btn){ btn.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); live(); }
  function equilibreHTML(){
    const bal = balances(), hasF = tv().some(p=>tFoyer(p)), SF = hasF ? settleFoyers(bal) : null, tr = hasF ? SF.tr : settle(bal), nm = hasF ? SF.lbl : pname_c;
    return `<div class="v-sum">
      <div class="v-sum-row"><div class="v-sum-big" style="font-size:1rem">⚖️ Qui doit quoi</div><div class="v-sum-small">sur ce qui est déjà réglé</div></div>
      ${bal.map(b=>`<div class="cv-bal">${pchip(b.pid)}<span>a payé ${eur(b.avance)} · sa part ${eur(b.part)}${b.verse>0.5?' · a remboursé '+eur(b.verse):''}${b.recu>0.5?' · a reçu '+eur(b.recu):''}</span><b style="color:${b.solde>0.5?'var(--green)':b.solde<-0.5?'var(--red)':'var(--gray)'}">${Math.abs(b.solde)<0.5 ? '0 ' + CS() : (b.solde>0?'+':'') + eur(b.solde)}</b></div>`).join('')}
      <div class="cv-settle">${tr.length ? tr.map(x=>`<div class="cv-settle-r"><span>➡️ ${nm(x.de)} doit <b>${eur(x.v)}</b> à ${nm(x.a)}</span><button class="v-chip on" onclick="CV.rembAdd('${x.de}','${x.a}',${x.v.toFixed(2)})">💸 Régler</button><button class="v-chip" onclick="CV.rembAsk('${x.de}','${x.a}',${x.v.toFixed(2)})">📤 Demander</button></div>`).join('') : '✓ Personne ne doit rien à personne.'}</div>
      ${rembs().length ? `<div class="cv-rbs">${rembs().map(x=>`<div class="cv-rb">💸 ${pname_c(x.de)} a remboursé <b>${eur(num(x.montant))}</b> à ${pname_c(x.a)} <span class="v-sum-small">le ${fdate(x.date)}</span><button class="cv-x" onclick="CV.rembDel('${x.id}')" aria-label="Retirer">✕</button></div>`).join('')}</div>` : ''}
    </div>`;
  }

  /* ══════════ 📆 Échéancier ══════════ */
  const thisMonth = () => new Date().toISOString().slice(0,7);
  function addMonths(ym, k){ let [y,m] = ym.split('-').map(Number); m += k; y += Math.floor((m-1)/12); m = ((m-1)%12 + 12)%12 + 1; return y + '-' + String(m).padStart(2,'0'); }
  function monthLbl(k){ if(!k || k==='—') return 'Sans date'; const [y,m] = k.split('-'); const s = new Date(+y,+m-1,1).toLocaleDateString((window.I18N ? I18N.locale : 'fr-FR'),{month:'long',year:'numeric'}); return s[0].toUpperCase() + s.slice(1); }
  function planRange(){
    const t = trip(), now = thisMonth(), tk = (t.debut||'').slice(0,7);
    const de = /^\d{4}-\d{2}$/.test(t.echDe||'') ? t.echDe : now;
    let a = /^\d{4}-\d{2}$/.test(t.echA||'') ? t.echA : (tk && tk > now ? addMonths(tk,-1) : now);
    if(a < de) a = de;
    return {de, a, custom: !!(t.echDe || t.echA)};
  }
  function planMonths(){
    const {de, a} = planRange(), out = [];
    for(let k = de; k <= a && out.length < 36; k = addMonths(k,1)) out.push(k);
    return out;
  }
  function echRange(){
    const t = trip(), de = val('ech-de'), a = val('ech-a');
    t.echDe = de; t.echA = a;
    if(!de && !a){ delete t.echDe; delete t.echA; }
    put(t, '📆 Période mise à jour'); render();
  }
  function echRangeReset(){ const t = trip(); delete t.echDe; delete t.echA; put(t, '📆 Période par défaut'); render(); }
  function echRender(){
    const el = document.getElementById('cv-ech'); if(!el || !editing) return;
    const E = editing.echeances || [];
    el.innerHTML = E.map(e=>`<div class="cv-echrow" data-id="${e.id}">
        <input class="v-in" type="date" data-e="date" value="${esc(e.date)}">
        <input class="v-in" data-e="montant" inputmode="decimal" value="${esc(e.montant)}" placeholder="${CS()}">
        <label class="cv-echok"><input type="checkbox" data-e="fait" ${e.fait?'checked':''}> payé</label>
        <button type="button" class="cv-x" onclick="CV.echDel('${e.id}')" aria-label="Retirer">✕</button></div>`).join('')
      || '<div class="v-sum-small">Aucune échéance : se paie en une fois.</div>';
  }
  function readEch(){
    return [...document.querySelectorAll('#cv-ech .cv-echrow')].map(r=>({id:r.dataset.id, date:r.querySelector('[data-e=date]').value,
      montant:num(r.querySelector('[data-e=montant]').value), fait:r.querySelector('[data-e=fait]').checked})).filter(e=>e.montant>0 || e.date);
  }
  function echAdd(){
    editing.echeances = readEch();
    const m = document.getElementById('cv-ech-m').value || thisMonth();
    editing.echeances.push({id:'e'+uid(), date:addMonths(m, editing.echeances.length)+'-05', montant:'', fait:false});
    echRender(); live();
  }
  function echDel(id){ editing.echeances = readEch().filter(e=>e.id!==id); echRender(); live(); }
  function echSpread(){
    const tmp = formTmp(), T = totalOf(tmp);
    if(!T){ alert('Indique d’abord un prix ou une estimation.'); return; }
    const n = Math.max(1, Math.min(24, parseInt(document.getElementById('cv-ech-n').value)||3));
    const m0 = document.getElementById('cv-ech-m').value || thisMonth();
    const done = readEch().filter(e=>e.fait), rest = T - done.reduce((s,e)=>s+num(e.montant),0);
    if(rest <= 0.5){ alert('Tout est déjà réglé.'); return; }
    const each = Math.floor(rest/n*100)/100, E = [...done];
    for(let i=0;i<n;i++) E.push({id:'e'+uid()+i, date:addMonths(m0,i)+'-05', montant: i===n-1 ? Math.round((rest-each*(n-1))*100)/100 : each, fait:false});
    editing.echeances = E; echRender(); live();
  }
  function unplanned(all){
    const out = [];
    all.forEach(it=>{ const s = (it.echeances||[]).reduce((a,e)=>a+num(e.montant),0), T = totalOf(it); if(it.statut!=='paid' && T - s > 0.5) out.push({it, rest:T - s}); });
    return out;
  }
  function renderEch(){
    const t = trip(), v = tv(), all = items(), now = thisMonth();
    const byM = {};
    all.forEach(it=>(it.echeances||[]).forEach(e=>{ const k = e.date ? e.date.slice(0,7) : '—'; (byM[k] = byM[k] || []).push({it, e}); }));
    const unpl = unplanned(all), unplT = unpl.reduce((s,u)=>s+u.rest,0);
    const paidT = all.reduce((s,i)=>s+paidAmount(i),0), totT = all.reduce((s,i)=>s+totalOf(i),0);
    const schedOpen = Object.values(byM).flat().filter(x=>!x.e.fait && x.it.statut!=='paid').reduce((s,x)=>s+num(x.e.montant),0);
    const months = planMonths(), nm = Math.max(1, months.length);
    const part = (it, pid, amt) => { const T = totalOf(it); return T ? amt * shareOf(it,pid) / T : 0; };
    let h = `<div class="v-tiles">
        <div class="v-tile g"><div class="a">${eur(paidT)}</div><div class="l">Déjà payé</div></div>
        <div class="v-tile r"><div class="a">${eur(totT - paidT)}</div><div class="l">Reste à payer</div></div>
        <div class="v-tile"><div class="a">${eur(schedOpen)}</div><div class="l">Planifié (à venir)</div></div>
        <div class="v-tile"><div class="a" style="color:${unplT>0.5?'#a06d00':'var(--green)'}">${eur(unplT)}</div><div class="l">Pas encore planifié</div></div>
      </div>
      <div class="v-sum"><div class="v-sum-big" style="font-size:1rem">💡 À mettre de côté chaque mois</div>
        <div class="v-sum-small" style="margin:4px 0 8px">Pour avoir tout réglé avant le départ : ${nm} mois, de ${monthLbl(months[0]||now)} à ${monthLbl(months[months.length-1]||now)}.</div>
        <div class="cv-range"><label>De<input class="v-in" type="month" id="ech-de" value="${planRange().de}" onchange="CV.echRange()"></label>
          <label>à<input class="v-in" type="month" id="ech-a" value="${planRange().a}" onchange="CV.echRange()"></label></div>
        ${planRange().custom ? `<button class="v-day-edit" style="margin-bottom:8px" onclick="CV.echRangeReset()">↺ Revenir à : ce mois-ci → veille du départ</button>` : ''}
        <div class="cv-live-r">${v.map(pid=>{ const rest = all.reduce((s,i)=>s+shareOf(i,pid)-shareOfPaid(i,pid),0); return `<span>${pchip(pid)} <b>${eur(rest/nm)}</b>/mois</span>`; }).join('')}</div>
        ${unpl.length ? `<button class="v-btn" style="margin-top:10px" onclick="CV.lisser()">⚡ Étaler automatiquement le non planifié</button>` : ''}
        ${Object.keys(byM).length ? `<button class="v-btn sec" onclick="CV.echReset()">↺ Effacer les échéances non payées</button>` : ''}
      </div>`;
    const keys = Object.keys(byM).sort((a,b)=> a==='—' ? 1 : b==='—' ? -1 : a.localeCompare(b));
    keys.forEach(k=>{
      const rows = byM[k].sort((a,b)=>(a.e.date||'').localeCompare(b.e.date||''));
      const tot = rows.reduce((s,x)=>s+num(x.e.montant),0), open = rows.filter(x=>!x.e.fait);
      const late = k!=='—' && k < now && open.length;
      h += `<div class="cv-echm${k===now?' now':''}${late?' late':''}">
        <div class="cv-echm-h"><span>${monthLbl(k)}${k===now?' · ce mois-ci':''}${late?' · ⚠️ en retard':''}</span><b>${eur(tot)}</b></div>
        ${v.length>1 ? `<div class="cv-live-r">${v.map(pid=>`<span>${pchip(pid)} ${eur(rows.reduce((s,x)=>s+part(x.it,pid,num(x.e.montant)),0))}</span>`).join('')}</div>` : ''}
        ${rows.map(x=>`<div class="cv-echi${x.e.fait?' done':''}">
          <input type="checkbox" ${x.e.fait?'checked':''} onchange="CV.echToggle('${x.it.id}','${x.e.id}')">
          <span class="x" onclick="CV.edit('${x.it.id}')">${icon(x.it)} ${esc(x.it.titre)}<small>${x.e.date ? fshort(x.e.date) : ''}</small></span>
          <b>${eur(num(x.e.montant))}</b></div>`).join('')}
      </div>`;
    });
    if(unpl.length) h += `<div class="cv-echm"><div class="cv-echm-h"><span>🕓 Pas encore planifié</span><b>${eur(unplT)}</b></div>
      ${unpl.sort((a,b)=>b.rest-a.rest).map(u=>`<div class="cv-echi"><span class="x" onclick="CV.edit('${u.it.id}')">${icon(u.it)} ${esc(u.it.titre)}<small>${STATUTS[u.it.statut]||''}</small></span><b>${eur(u.rest)}</b></div>`).join('')}</div>`;
    if(!keys.length && !unpl.length) h += '<div class="v-empty">Rien à payer pour l’instant.</div>';
    h += `<div class="v-sum-small" style="padding:0 4px;line-height:1.5">Chaque fiche peut être payée en plusieurs fois (💶 Paiement → 📆 Échéancier). Cocher une échéance la marque payée ; quand tout est coché, la fiche passe en « Payé ».</div>`;
    document.getElementById('cv-body').innerHTML = h;
  }
  function echToggle(iid, eid){
    const it = R[iid]; if(!it) return; const e = (it.echeances||[]).find(x=>x.id===eid); if(!e) return;
    e.fait = !e.fait; autoStatut(it);
    put(it, e.fait ? '✓ Échéance payée' : 'Échéance décochée'); render();
  }
  async function lisser(){
    const months = planMonths(), all = items(), unpl = unplanned(all);
    if(!unpl.length) return;
    const total = unpl.reduce((s,u)=>s+u.rest,0), target = total / months.length;
    if(!(await uiConfirm(`Répartir ${eur(total)} sur ${months.length} mois (${monthLbl(months[0])} → ${monthLbl(months[months.length-1])}), soit ≈ ${eur(target)} par mois ?\nLes grosses dépenses sont coupées en plusieurs fois. Tu pourras tout ajuster dans chaque fiche.`))) return;
    const load = Object.fromEntries(months.map(k=>[k,0]));
    all.forEach(it=>(it.echeances||[]).forEach(e=>{ const k = (e.date||'').slice(0,7); if(k in load && !e.fait) load[k] += num(e.montant); }));
    const changed = [];
    unpl.sort((a,b)=>b.rest-a.rest).forEach(({it, rest})=>{
      const pieces = rest > target*1.3 ? Math.min(months.length, Math.ceil(rest/target)) : 1;
      const each = Math.floor(rest/pieces*100)/100, used = new Set();
      it.echeances = [...(it.echeances||[])];
      for(let i=0;i<pieces;i++){
        const k = months.filter(m=>!used.has(m)).sort((a,b)=>load[a]-load[b] || a.localeCompare(b))[0]; used.add(k);
        const amt = i===pieces-1 ? Math.round((rest-each*(pieces-1))*100)/100 : each;
        it.echeances.push({id:'e'+uid()+i, date:k+'-05', montant:amt, fait:false}); load[k] += amt;
      }
      it.echeances.sort((a,b)=>(a.date||'').localeCompare(b.date||''));
      changed.push(it);
    });
    putMany(changed, '📆 Échéancier étalé'); render();
  }
  async function echReset(){
    if(!(await uiConfirm('Effacer toutes les échéances non payées de ce voyage ?'))) return;
    const changed = [];
    items(i=>(i.echeances||[]).some(e=>!e.fait)).forEach(it=>{ it.echeances = it.echeances.filter(e=>e.fait); if(!it.echeances.length) delete it.echeances; changed.push(it); });
    putMany(changed, '↺ Échéances effacées'); render();
  }

  /* ══════════ 🔗 Liens Maps / Booking / vols ══════════ */
  const cityOf = t => String(t||'').replace(/\(.*?\)/g,'').trim();
  /* 📍 la ville de l’ÉTAPE (ce qu’on visite) peut différer de celle de l’hôtel (dormir à Prévessin pour visiter Genève) :
     on garde la ville prévue à la création ou citée dans le titre du voyage si l’hôtel est à moins de 35 km */
  const titleCities = t => String((t && t.titre) || '').split(/\s*(?:,|&|\+|\/|·|→| et | and | - | – )\s*/i).map(x=>x.trim()).filter(x=>x.length > 2 && x.length < 40).slice(0, 4);
  function stayCity(h){
    if(!h) return ''; const c = cityOf(h.titre || '') || h.titre || ''; const t = R[h.trip];
    const g = R['geo:' + normQ(c)]; if(!g || g.deleted || g.lat == null) return c;
    for(const x of [h.base, ...titleCities(t)].filter(Boolean)){ if(normQ(x) === normQ(c)) return c; const g2 = R['geo:' + normQ(x)];
      if(g2 && !g2.deleted && g2.lat != null && rawKm(g, g2) < 35) return x; }
    return c;
  }
  function links(it){   // liens pratiques (itinéraire, carte, suivi du vol, ma résa) : toujours là
    const L = [], q = encodeURIComponent;
    if(it.cat==='transport'){
      if(it.from && it.to){
        L.push(['🗺️','Trajet',`https://www.google.com/maps/dir/?api=1&origin=${q(it.from)}&destination=${q(it.to)}&travelmode=transit`]);
        if(it.mode==='Avion' && ESCALE) L.push(['🛫','Escale', ESCALE]);
        if(it.mode!=='Avion') L.push(['🔎','Horaires & prix',`https://www.rome2rio.com/fr/map/${q(it.from)}/${q(it.to)}`]);
      }
      { const fn = String(it.compagnie||'').match(/\b([A-Z0-9]{2})\s?(\d{1,4})\b/); if(it.mode==='Avion' && fn) L.push(['📡','Suivre le vol',`https://www.flightradar24.com/data/flights/${(fn[1]+fn[2]).toLowerCase()}`]);
      }
    } else {
      const where = [it.nom, it.adresse || cityOf(it.titre)].filter(Boolean).join(', ');
      if(where) L.push(['📍','Maps',`https://www.google.com/maps/search/?api=1&query=${q(where)}`]);
    }
    if(safeUrl(it.lien)) L.push(['🔗','Ma réservation',safeUrl(it.lien)]);
    return L;
  }
  function linksHTML(it, big){
    const L = links(it), bk = !big && bookOn(it) ? bookGroups(it) : [];
    if(!L.length && !bk.length) return '';
    const a = ([i,l,u]) => `<a href="${esc(safeUrl(u))}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${i} ${l}</a>`;
    if(!big) return `<div class="cv-links">${L.map(a).join('')}${bk.length ? `<button type="button" class="bk-chip" onclick="event.stopPropagation();CV.bookSheet('${esc(it.id||'')}')">🛒 Réserver…</button>` : ''}</div>`;
    return `<div class="cv-links big">${L.map(a).join('')}</div>`;
  }
  // en tête de la fiche : comparer et réserver (seulement tant que c’est « à réserver »)
  function bookHTML(it){ const bk = bookOn(it) ? bookGroups(it) : []; return bk.length ? `<div class="bk-box top"><div class="bk-h">🛒 Comparer et réserver</div>${bookRows(bk)}</div>` : ''; }

  /* ══════════ 🛒 Réserver avec… : liens directs vers les sites, sans pub ni pistage ══════════
     Toutes les adresses de partenaires passent par bookUrl() : le jour d’une éventuelle affiliation,
     c’est le seul endroit à changer (lien construit dans le téléphone, rien ne passe par notre serveur). */
  const BK = {
    gflights:['✈️','Google Flights', c=>c.from && c.to ? `https://www.google.com/travel/flights?hl=${(window.I18N && I18N.lang) || 'fr'}&q=${encodeURIComponent('Flights from '+c.from+' to '+c.to+(c.date?' on '+c.date:''))}` : 'https://www.google.com/travel/flights'],
    skyscanner:['✈️','Skyscanner', ()=>'https://www.skyscanner.fr/'],
    kayak:['✈️','Kayak', ()=>'https://www.kayak.fr/flights'],
    kiwi:['✈️','Kiwi.com', ()=>'https://www.kiwi.com/fr/'],
    rome2rio:['🔎','Rome2rio', c=>c.from && c.to ? `https://www.rome2rio.com/fr/map/${encodeURIComponent(c.from)}/${encodeURIComponent(c.to)}` : 'https://www.rome2rio.com/fr/'],
    trainline:['🚆','Trainline', ()=>'https://www.thetrainline.com/fr'],
    omio:['🧭','Omio', ()=>'https://www.omio.fr/'],
    sncf:['🚄','SNCF Connect', ()=>'https://www.sncf-connect.com/'],
    flixbus:['🚌','FlixBus', ()=>'https://www.flixbus.fr/'],
    blablacar:['🚗','BlaBlaCar', c=>c.from && c.to ? `https://www.blablacar.fr/search?fn=${encodeURIComponent(c.from)}&tn=${encodeURIComponent(c.to)}${c.date ? '&db=' + c.date : ''}` : 'https://www.blablacar.fr/'],
    ferryhopper:['⛴️','Ferryhopper', ()=>'https://www.ferryhopper.com/fr/'],
    directferries:['⛴️','Direct Ferries', ()=>'https://www.directferries.fr/'],
    booking:['🛏️','Booking.com', c=>`https://www.booking.com/searchresults.fr.html?ss=${encodeURIComponent(c.what || c.city || '')}${c.date ? '&checkin=' + c.date : ''}${c.end ? '&checkout=' + c.end : ''}&group_adults=${c.n || 1}&no_rooms=1`],
    airbnb:['🏡','Airbnb', c=>c.city ? `https://www.airbnb.fr/s/${encodeURIComponent(c.city)}/homes?${c.date ? 'checkin=' + c.date + '&' : ''}${c.end ? 'checkout=' + c.end + '&' : ''}adults=${c.n || 1}` : 'https://www.airbnb.fr/'],
    hotelscom:['🏨','Hotels.com', c=>c.city ? `https://fr.hotels.com/Hotel-Search?destination=${encodeURIComponent(c.city)}${c.date ? '&startDate=' + c.date : ''}${c.end ? '&endDate=' + c.end : ''}&adults=${c.n || 1}` : 'https://fr.hotels.com/'],
    hostelworld:['🎒','Hostelworld', ()=>'https://www.hostelworld.com/'],
    agoda:['🏨','Agoda', ()=>'https://www.agoda.com/fr-fr/'],
    discovercars:['🚙','DiscoverCars', ()=>'https://www.discovercars.com/'],
    rentalcars:['🚙','Rentalcars', ()=>'https://www.rentalcars.com/fr/'],
    getaround:['🔑','Getaround', ()=>'https://fr.getaround.com/'],
    welcome:['🚐','Welcome Pickups', ()=>'https://www.welcomepickups.com/'],
    kiwitaxi:['🚕','Kiwitaxi', ()=>'https://kiwitaxi.com/'],
    gyg:['🎟️','GetYourGuide', c=>`https://www.getyourguide.fr/s/?q=${encodeURIComponent(c.what || c.city || '')}`],
    viator:['🎟️','Viator', c=>`https://www.viator.com/fr-FR/searchResults/all?text=${encodeURIComponent(c.what || c.city || '')}`],
    tiqets:['🎫','Tiqets', ()=>'https://www.tiqets.com/fr/'],
    civitatis:['🗺️','Civitatis', ()=>'https://www.civitatis.com/fr/'],
    klook:['🎡','Klook', ()=>'https://www.klook.com/fr/'],
    bkattr:['🎡','Booking.com', ()=>'https://www.booking.com/attractions/index.fr.html'],
    ticketmaster:['🎤','Ticketmaster', ()=>'https://www.ticketmaster.fr/'],
    fnac:['🎭','Fnac Spectacles', ()=>'https://www.fnacspectacles.com/'],
    fever:['✨','Fever', ()=>'https://feverup.com/fr'],
    airalo:['📶','Airalo', ()=>'https://www.airalo.com/fr'],
    holafly:['📶','Holafly', ()=>'https://esim.holafly.com/fr/'],
    yesim:['📶','Yesim', ()=>'https://yesim.app/fr/'],
    chapka:['🛡️','Chapka', ()=>'https://www.chapkadirect.fr/'],
    heymondo:['🛡️','Heymondo', ()=>'https://heymondo.fr/'],
    safetywing:['🛡️','SafetyWing', ()=>'https://safetywing.com/'],
    wise:['💳','Wise', ()=>'https://wise.com/fr/'],
    revolut:['💳','Revolut', ()=>'https://www.revolut.com/fr-FR/'],
  };
  const bookUrl = (k, c) => BK[k] ? BK[k][2](c || {}) : '';
  const bookA = (k, c) => `<a href="${esc(bookUrl(k, c))}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${BK[k][0]} ${BK[k][1]}</a>`;
  const bookRows = G => G.map(g=>`<div class="bk-g"><small>${g.t}</small><div class="cv-links">${g.k.map(k=>bookA(k, g.c)).join('')}</div></div>`).join('');
  // à réserver seulement (une fiche réservée ou payée ne propose plus rien)
  const bookOn = it => !hidden('blk:book') && it && it.type==='item' && (it.statut || 'todo')==='todo';
  function bookGroups(it){
    const city = cityOf(it.titre), n = Math.max(1, parts(it).length), G = [];
    if(it.cat==='transport'){
      const c = {from:it.from, to:it.to, date:it.date, n}, at = {city:cityOf(it.to||''), what:cityOf(it.to||''), date:it.date, n};
      const m = it.mode || '';
      if(m==='Avion'){ G.push({t:'Comparer les vols', k:['gflights','skyscanner','kayak','kiwi'], c}); if(it.to) G.push({t:'À l’arrivée', k:['welcome','kiwitaxi','discovercars','rentalcars'], c:at}); }
      else if(m==='Train') G.push({t:'Trains', k:['trainline','omio','sncf','rome2rio'], c});
      else if(m==='Bus') G.push({t:'Bus et covoiturage', k:['flixbus','blablacar','omio','rome2rio'], c});
      else if(m==='Bateau') G.push({t:'Ferries', k:['ferryhopper','directferries','rome2rio'], c});
      else if(m==='Voiture') G.push({t:'Voiture', k:['blablacar','discovercars','rentalcars','getaround'], c});
      else if(/Taxi/.test(m)) G.push({t:'Transferts', k:['welcome','kiwitaxi'], c:at});
      else G.push({t:'Comparer les trajets', k:['rome2rio','omio','trainline','gflights'], c});
    } else if(it.cat==='hotel'){
      const sc = stayCity(it) || city, hd = (M.hood || {})[it.id], hw = hd && hd.name && normQ(hd.name) !== normQ(sc) ? hd.name + ', ' + sc : sc;
      G.push({t:hd && hd.name ? `🏘️ ${MSGT('Quartier conseillé pour dormir')} : <b>${esc(hd.name)}</b> · ${String(hd.km).replace('.', ',')} km ${MSGT('en moyenne de tes visites')} (${hd.n})` : 'Hébergements', k:['booking','airbnb','hotelscom','hostelworld','agoda'], c:{city:hw, what:it.nom ? it.nom + ' ' + city : hw, date:it.date, end:it.dateFin, n}});
    } else if(it.cat==='activite'){
      if(BK_SHOW.test(nzTxt(it.titre))) G.push(BK_SHOWG);
      G.push({t:'Visites et billets', k:['gyg','viator','tiqets','bkattr','civitatis','klook'], c:{city, what:it.q || [it.titre, it.adresse ? cityOf(it.adresse.split(',').pop()) : ''].filter(Boolean).join(' ')}});
    } else {
      const g = checkBook(it.titre || ''); if(g) G.push(g);
      else if(it.cat==='divers') G.push(BK_SHOWG);   // une dépense « divers » à réserver : souvent un concert, un spectacle, un match
    }
    return G;
  }
  const BK_SHOW = /concert|spectacle|festival|theatre|opera|comedie musicale|\bshow\b|match|stade|cabaret|ballet/;
  const BK_SHOWG = {t:'Concerts et spectacles', k:['ticketmaster','fnac','fever'], c:{}};
  // ville du voyage pour la liste : la première étape encore sans hébergement, sinon la première étape
  function tripCity(){ const H = items(i=>i.cat==='hotel').sort((a,b)=>(a.date||'').localeCompare(b.date||'')); const h = H.find(i=>i.statut==='todo') || H[0]; return h ? stayCity(h) : ''; }
  function checkBook(label){
    const s = nzTxt(label), city = tripCity(), c = {city, what:city};
    if(/esim|\bsim\b|forfait|wi ?fi|internet|roaming|itinerance/.test(s)) return {t:'eSIM et internet', k:['airalo','holafly','yesim'], c};
    if(/assurance|rapatriement/.test(s) && !/maladie|ceam/.test(s)) return {t:'Assurance voyage', k:['chapka','heymondo','safetywing'], c};
    if(/carte bancaire|sans frais|devise|change /.test(s)) return {t:'Carte sans frais à l’étranger', k:['wise','revolut'], c};
    if(/hebergement|hotel|logement/.test(s)) return {t:'Hébergements', k:['booking','airbnb','hotelscom','hostelworld'], c};
    if(/trajet|billet d avion|vols? |train/.test(s)) return {t:'Trajets', k:['gflights','skyscanner','trainline','omio'], c:{}};
    if(BK_SHOW.test(s)) return BK_SHOWG;
    if(/visite|creneau|musee|activite|excursion/.test(s)) return {t:'Visites et billets', k:['gyg','viator','tiqets','bkattr','civitatis'], c};
    if(/location|voiture|permis/.test(s)) return {t:'Voiture', k:['discovercars','rentalcars','getaround'], c};
    return null;
  }
  function bookSheet(id, ck){
    let G = [];
    if(ck){ const c = R[id]; const g = c && checkBook(c.label); if(g) G = [g]; }
    else if(R[id]) G = bookGroups(R[id]);
    if(!G.length) return;
    openSheet(`<h2>🛒 Réserver avec…</h2><div class="bk-box">${bookRows(G)}</div>
      <div class="v-sum-small" style="margin:8px 2px">Tu peux masquer ces liens dans ⚙️ Réglages.</div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">✕ Fermer</button></div>`);
  }

  /* ══════════ 🗺️ Lieux du jour & itinéraire optimisé ══════════ */
  function placesOf(d){
    const r = dayInfo(d).route, idx = id => r && r.ids ? r.ids.indexOf(id) : -1;
    return list('place', p=>p.trip===M.trip && p.date===d && !p.sugg).sort((a,b)=>{ const ia = idx(a.id), ib = idx(b.id); if(ia>=0 && ib>=0) return ia-ib; if(ia>=0) return -1; if(ib>=0) return 1; return (a.createdAt||0)-(b.createdAt||0); });
  }
  function hotelsAround(d){
    const H = items(i=>i.cat==='hotel' && i.date);
    return {night: H.find(h=>h.date<=d && (h.dateFin ? d<h.dateFin : h.date===d)), prev: H.find(h=>h.dateFin===d)};
  }
  const hotelQ = h => h.adresse || [h.nom, cityOf(h.titre)].filter(Boolean).join(', ');
  function dayCity(d){ const {night, prev} = hotelsAround(d); const c = cityOf((night||prev||{}).titre || ''); if(c) return c;
    const tr = items(i=>i.cat==='transport' && i.date===d && i.to).pop(); return tr ? cityOf(tr.to.replace(/\(.*?\)/g,'').trim()) : ''; }
  async function planExplore(d){
    let city = dayCity(d);
    if(!city){ const c = await uiPrompt('Quelle ville veux-tu explorer ?', ''); if(!c || !c.trim()) return; city = c.trim(); }
    const st = hotelsAround(d).night; exploreCity(city, st ? st.id : '', d);
  }
  function pointOptions(d){
    const o = [], {night, prev} = hotelsAround(d);
    [night, prev].filter(Boolean).forEach(h=>{ if(!o.some(x=>x.k==='item:'+h.id)) o.push({k:'item:'+h.id, lbl:'🏨 '+(h.nom ? h.nom+' · ' : 'Hôtel · ')+cityOf(h.titre), q:hotelQ(h), ctx:false}); });
    items(i=>i.cat==='transport' && i.date===d).forEach(t=>{
      if(t.to) o.push({k:'to:'+t.id, lbl:(MODE_ICON[t.mode]||'🧭')+' Arrivée · '+t.to, q:t.to, ctx:true});
      if(t.from) o.push({k:'from:'+t.id, lbl:(MODE_ICON[t.mode]||'🧭')+' Départ · '+t.from, q:t.from, ctx:true});
    });
    o.push({k:'libre', lbl:'📍 Autre adresse…', ctx:true});
    return o;
  }
  function dayCfg(d){
    const i = dayInfo(d), opts = pointOptions(d), ok = k => k==='libre' || opts.some(o=>o.k===k);
    return {dep: i.dep && ok(i.dep) ? i.dep : opts[0].k, depTxt: i.depTxt||'', arr: i.arr==='boucle' || i.arr==='fin' || (i.arr && ok(i.arr)) ? i.arr : 'boucle', arrTxt: i.arrTxt||''};
  }
  const normQ = q => String(q||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim().slice(0,100);
  function coordsIn(q){ const m = String(q).match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/); return m ? {lat:+m[1], lng:+m[2]} : null; }
  let geoLast = 0;
  async function geocode(q, ctx){
    q = String(q||'').trim(); if(!q) return null;
    const c = coordsIn(q); if(c) return c;
    const full = ctx && !normQ(q).includes(normQ(ctx)) ? q + ', ' + ctx : q;
    const key = 'geo:' + normQ(full);
    if(R[key] && !R[key].deleted && R[key].lat != null) return {lat:R[key].lat, lng:R[key].lng};
    const wait = 1100 - (Date.now() - geoLast); if(wait > 0) await new Promise(r=>setTimeout(r, wait));
    geoLast = Date.now();
    let res = null;
    try { const j = await (await fetch(GEO + 'search?format=jsonv2&limit=1&accept-language=' + ((window.I18N && I18N.lang) || 'fr') + '&q=' + encodeURIComponent(full))).json(); if(j && j[0]) res = {lat:+j[0].lat, lng:+j[0].lon}; } catch(e){}
    if(!res){ try { const j = await (await fetch('https://photon.komoot.io/api/?limit=1&q=' + encodeURIComponent(full))).json(); const f = j && j.features && j.features[0]; if(f) res = {lat:f.geometry.coordinates[1], lng:f.geometry.coordinates[0]}; } catch(e){} }
    if(!res && full !== q) return geocode(q, null);
    if(res){ const g = {id:key, type:'geo', q:full, lat:res.lat, lng:res.lng}; stamp(g); R[key] = g; markDirty(key); persist(); }
    return res;
  }
  function km(a,b){
    const rad = x => x*Math.PI/180, dLa = rad(b.lat-a.lat), dLo = rad(b.lng-a.lng);
    const h = Math.sin(dLa/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLo/2)**2;
    return 2*6371*Math.asin(Math.sqrt(h)) * 1.25;   // ×1,25 : les rues ne sont pas en ligne droite
  }
  function bestOrder(start, end, pts){
    const n = pts.length; if(n < 2) return pts.map((_,i)=>i);
    let order = [], left = new Set(pts.map((_,i)=>i)), cur = start;
    while(left.size){ let b = null, bd = Infinity; left.forEach(i=>{ const d = km(cur, pts[i]); if(d < bd){ bd = d; b = i; } }); order.push(b); left.delete(b); cur = pts[b]; }
    const len = o => { let s = km(start, pts[o[0]]); for(let i=1;i<o.length;i++) s += km(pts[o[i-1]], pts[o[i]]); return s + (end ? km(pts[o[o.length-1]], end) : 0); };
    let best = len(order), improved = true, guard = 0;
    while(improved && guard++ < 300){
      improved = false;
      for(let i=0;i<n-1;i++) for(let j=i+1;j<n;j++){
        const o = [...order.slice(0,i), ...order.slice(i,j+1).reverse(), ...order.slice(j+1)], L = len(o);
        if(L < best - 1e-9){ order = o; best = L; improved = true; }
      }
    }
    return order;
  }
  function legAdvice(d, walkMax, forced){
    const walk = Math.round(d/4.5*60);
    if(forced && d <= 12) return {icon:'🚇', txt:'métro / bus (conseillé)', min:Math.round(d/20*60+10), mode:'transit', alt:`ou ${fmtMin(walk)} à pied`};
    if(d <= walkMax) return {icon:'🚶', txt:'à pied', min:walk, mode:'walking'};
    if(d <= 12) return {icon:'🚇', txt:'métro / bus', min:Math.round(d/20*60+10), mode:'transit', alt: d <= walkMax*2 ? `ou ${fmtMin(walk)} à pied` : ''};
    return {icon:'🚕', txt:'taxi / VTC ou train', min:Math.round(d/35*60+10), mode:'driving'};
  }
  const fmtMin = m => m >= 60 ? Math.floor(m/60) + ' h ' + String(m%60).padStart(2,'0') : m + ' min';
  const fmtKm = k => k < 1 ? Math.round(k*1000/10)*10 + ' m' : k.toFixed(1).replace('.',',') + ' km';
  const ll = p => (+p.lat).toFixed(6) + ',' + (+p.lng).toFixed(6);
  const dirUrl = (a, b, mode, way) => `https://www.google.com/maps/dir/?api=1&origin=${ll(a)}&destination=${ll(b)}${way && way.length ? '&waypoints=' + way.map(ll).join('%7C') : ''}&travelmode=${mode}`;
  function routeHTML(d, compact){
    const r = dayInfo(d).route, pl = placesOf(d);
    if(!pl.length) return '';
    const byId = Object.fromEntries(pl.map(p=>[p.id,p]));
    const fresh = r && r.ids && r.ids.every(id=>byId[id]) && pl.every(p=>r.ids.includes(p.id) || (r.miss||[]).includes(p.id));
    if(!fresh) return compact ? `<div class="cv-route-mini">📍 ${pl.map(p=>`<span class="cv-plk${p.sugg ? ' sg' : ''}" onclick="event.stopPropagation();CV.plInfo('${p.id}')">${p.sugg ? '💡 ' : ''}${esc(p.nom)}</span>`).join(' · ')}<div class="v-sum-small">⚡ ordre pas encore optimisé</div></div>` : '';
    const stops = [r.start, ...r.ids.map(id=>Object.assign({}, r.pts[id], {nom:byId[id].nom})), ...(r.fin ? [] : [r.end])];
    let tot = 0, walk = 0, mins = 0; const legs = [];
    for(let i=1;i<stops.length;i++){ const dk = km(stops[i-1], stops[i]), a = legAdvice(dk, r.walk||2.5, (r.tr||[]).includes(i-1)); tot += dk; if(a.mode==='walking') walk += dk; mins += a.min; legs.push({dk, a, from:stops[i-1], to:stops[i]}); }
    const way = r.ids.map(id=>r.pts[id]);
    const full = way.length <= 9 ? [dirUrl(r.start, r.end, 'walking', way)] : [dirUrl(r.start, way[8], 'walking', way.slice(0,8)), dirUrl(way[8], r.end, 'walking', way.slice(9))];
    const gm = full.map((u,i)=>`<a class="cv-gm" href="${u}" target="_blank" rel="noopener" onclick="event.stopPropagation()">🗺️ Ouvrir dans Google Maps${full.length>1?' ('+(i+1)+'/'+full.length+')':''}</a>`).join('');
    const sum = `≈ ${fmtKm(tot)} dont ${fmtKm(walk)} à pied · ${fmtMin(mins)} de trajets`;
    if(compact) return `<div class="cv-route-mini">🗺️ ${r.ids.map((id,i)=>`<b>${i+1}</b> <span class="cv-plk" onclick="event.stopPropagation();CV.plInfo('${id}')">${esc(byId[id].nom)}</span>`).join(' → ')}${r.loop?' ↩️':''}<div class="v-sum-small">${sum}</div>${gm}</div>`;
    return `<div class="cv-route">
      <div class="cv-stop s">🏁 ${esc(r.start.lbl||'Départ')}</div>
      ${legs.map((L,i)=>`<a class="cv-leg" href="${dirUrl(L.from, L.to, L.a.mode)}" target="_blank" rel="noopener">${L.a.icon} ${L.a.txt} · ${fmtKm(L.dk)} · ~${fmtMin(L.a.min)}${L.a.alt ? ' <span>('+L.a.alt+')</span>' : ''} ↗</a>
        <div class="cv-stop${i===legs.length-1?' s':''}">${i===legs.length-1 && !r.fin ? (r.loop ? '↩️ Retour · ' : '🏁 ') + esc(r.end.lbl||'Arrivée') : i===legs.length-1 ? '🏁 <b>'+(i+1)+'</b> <span class="cv-plk" onclick="event.stopPropagation();CV.plInfo(\''+r.ids[i]+'\')">'+esc(L.to.nom)+'</span>' : '<b>'+(i+1)+'</b> <span class="cv-plk" onclick="event.stopPropagation();CV.plInfo(\''+r.ids[i]+'\')">'+esc(L.to.nom)+'</span>'}</div>`).join('')}
      <div class="cv-route-sum">${sum}</div>${gm}
      <div class="cv-rmap" data-rmap="${d}"></div>
      ${(r.miss||[]).length ? `<div class="v-sum-small" style="color:var(--red)">Introuvable(s) : ${r.miss.map(id=>byId[id] ? esc(byId[id].nom) : '').filter(Boolean).join(', ')} — ajoute une adresse précise ou un lien Google Maps.</div>` : ''}
    </div>`;
  }
  let planD = null;
  function planDay(d){
    planD = d;
    const cfg = dayCfg(d), opts = pointOptions(d), pl = placesOf(d), t = trip(), city = dayCity(d);
    const sel = (id, cur, loop) => `<select class="v-in" id="${id}" onchange="CV.plCfg()">${loop ? `<option value="boucle"${cur==='boucle'?' selected':''}>↩️ Retour au point de départ (boucle)</option><option value="fin"${cur==='fin'?' selected':''}>🏁 Fin au dernier lieu visité</option>` : ''}${opts.map(o=>`<option value="${o.k}"${o.k===cur?' selected':''}>${esc(o.lbl)}</option>`).join('')}</select>`;
    openSheet(`<h2>🗺️ ${fdate(d)}${dayInfo(d).titre ? ' · ' + esc(dayInfo(d).titre) : ''}</h2>
      <div class="v-f"><label>Point de départ</label>${sel('pl-dep', cfg.dep)}
        <input class="v-in" id="pl-dept" style="margin-top:6px;${cfg.dep==='libre'?'':'display:none'}" value="${esc(cfg.depTxt)}" placeholder="Adresse, lieu ou lien Google Maps" onchange="CV.plCfg()"></div>
      <div class="v-f"><label>Arrivée</label>${sel('pl-arr', cfg.arr, true)}
        <input class="v-in" id="pl-arrt" style="margin-top:6px;${cfg.arr==='libre'?'':'display:none'}" value="${esc(cfg.arrTxt)}" placeholder="Adresse, lieu ou lien Google Maps" onchange="CV.plCfg()"></div>
      <button type="button" class="cv-tjbtn pl-exp" onclick="CV.planExplore('${d}')"><span>🧭</span><span><b>Explorer ${city ? esc(city) : 'la ville'}</b><small>Monuments, quartiers, musées, où manger : touche pour ajouter à ta journée</small></span></button>
      <div class="v-f"><label>Ce que tu veux voir (${pl.length})</label>
        <div>${pl.map((p,i)=>`<div class="cv-place"><span class="n">${i+1}</span><span class="x" role="button" onclick="CV.plInfo('${p.id}')"><u>${esc(p.nom)}</u> ⓘ${p.adresse && p.adresse!==p.nom ? `<small>${esc(p.adresse.slice(0,60))}</small>` : ''}${byline(p).replace('cv-by','cv-by s')}</span>
          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordsIn(p.adresse||'') ? ll(coordsIn(p.adresse)) : (p.adresse||p.nom) + (city ? ', ' + city : ''))}" target="_blank" rel="noopener">📍</a>
          <button type="button" class="cv-x" onclick="CV.plDel('${p.id}')" aria-label="Retirer">✕</button></div>`).join('') || '<div class="v-sum-small">Ajoute les lieux de la journée, dans n’importe quel ordre.</div>'}</div>
        <div class="cv-row" style="margin-top:6px"><input class="v-in" id="pl-new" placeholder="Ex. Colisée ; Trastevere ; Bocca della Verità" onkeydown="if(event.key==='Enter'){event.preventDefault();CV.plAdd()}">
          <button type="button" class="v-btn sec cv-sq" onclick="CV.plAdd()" aria-label="Ajouter">＋</button></div>
        <div class="v-sum-small" style="margin-top:4px">Un nom suffit${city ? ' (« ' + esc(city) + ' » est ajouté pour la recherche)' : ''}, ou une adresse, ou un lien Google Maps. Plusieurs d’un coup : sépare par « ; ».</div></div>
      ${hotelsAround(d).night ? `<div class="cv-row" style="margin-bottom:10px"><button type="button" class="v-day-edit" onclick="CV.planCity('${hotelsAround(d).night.id}')">🏙️ Organiser toute l’étape</button></div>` : ''}
      <div class="v-f"><label>Je marche jusqu’à</label><div class="cv-row"><input class="v-in cv-num" id="pl-walk" inputmode="decimal" value="${esc(t.marche||2.5)}" onchange="CV.plCfg()">
        <span class="v-sum-small">km par trajet ; au-delà : métro / bus, puis taxi</span></div></div>
      <button type="button" class="v-btn" id="pl-go" onclick="CV.plOpt()">⚡ Optimiser l’itinéraire</button>
      <div id="pl-res">${routeHTML(d, false)}</div>
      <div class="v-actions"><button type="button" class="v-btn sec" onclick="CV.close()">Fermer</button></div>`);
  }
  const val = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
  function plCfg(){
    const d = planD; if(!d) return;
    const cur = R[dayId(d)] || {};
    const nx = {dep:val('pl-dep'), depTxt:val('pl-dept'), arr:val('pl-arr'), arrTxt:val('pl-arrt')};
    document.getElementById('pl-dept').style.display = nx.dep==='libre' ? '' : 'none';
    document.getElementById('pl-arrt').style.display = nx.arr==='libre' ? '' : 'none';
    const w = num(val('pl-walk')) || 2.5, t = trip();
    if(num(t.marche||2.5) !== w){ t.marche = w; put(t, false); }
    if(['dep','depTxt','arr','arrTxt'].some(k=>(cur[k]||'') !== nx[k])){
      const info = Object.assign(clone(cur), {id:dayId(d), type:'day', trip:M.trip, date:d}, nx); delete info.deleted;
      put(info, false);
    }
  }
  function plAdd(){
    const d = planD, raw = val('pl-new'); if(!raw) return;
    const out = raw.split(/[;\n]+/).map(s=>s.trim()).filter(Boolean).map((s,i)=>{
      let nom = s; const m = s.match(/\/place\/([^/@?]+)/);
      if(/^https?:/.test(s)) nom = m ? decodeURIComponent(m[1].replace(/\+/g,' ')) : 'Lieu ' + (placesOf(d).length + i + 1);
      const st = hotelsAround(d).night;
      return {id:'pl'+uid()+i, type:'place', trip:M.trip, date:d, stay: st ? st.id : '', nom, adresse: s!==nom ? s : ''};
    });
    putMany(out, '📍 Ajouté'); planDay(d);
  }
  function plDel(id){ drop(id, false); planDay(planD); }
  async function plOpt(){
    const d = planD; plCfg();
    const cfg = dayCfg(d), pl = placesOf(d), opts = pointOptions(d), city = dayCity(d) || cityOf(trip().titre);
    if(!pl.length){ alert('Ajoute au moins un lieu.'); return; }
    const res = document.getElementById('pl-res'), btn = document.getElementById('pl-go');
    const say = m => { if(res) res.innerHTML = `<div class="cv-route-load">${m}</div>`; };
    const pt = k => { if(k==='libre') return null; return opts.find(o=>o.k===k); };
    btn.disabled = true;
    try {
      say('📡 Je localise le point de départ…');
      const o1 = pt(cfg.dep), depQ = o1 ? o1.q : cfg.depTxt;
      if(!depQ) throw new Error('Choisis un point de départ, ou saisis une adresse.');
      const start = await geocode(depQ, (!o1 || o1.ctx) ? city : null);
      if(!start) throw new Error('Point de départ introuvable : précise l’adresse, ou colle un lien Google Maps.');
      let end = start, endLbl = o1 ? o1.lbl.replace(/^\S+\s/,'') : cfg.depTxt;
      if(cfg.arr === 'fin') end = null;
      else if(cfg.arr !== 'boucle'){
        const o2 = pt(cfg.arr), arrQ = o2 ? o2.q : cfg.arrTxt;
        say('📡 Je localise l’arrivée…');
        end = arrQ ? await geocode(arrQ, (!o2 || o2.ctx) ? city : null) : null;
        if(!end) throw new Error('Arrivée introuvable : précise l’adresse.');
        endLbl = o2 ? o2.lbl.replace(/^\S+\s/,'') : cfg.arrTxt;
      }
      const pts = {}, miss = [];
      for(let i=0;i<pl.length;i++){
        say(`📡 Je localise ${i+1}/${pl.length} : ${esc(pl[i].nom)}…`);
        const c = pl[i].lat != null && pl[i].lng != null ? {lat:+pl[i].lat, lng:+pl[i].lng} : await geocode(pl[i].adresse || pl[i].nom, city);
        if(c) pts[pl[i].id] = c; else miss.push(pl[i].id);
      }
      const ok = pl.filter(p=>pts[p.id]);
      const order = bestOrder(start, end, ok.map(p=>pts[p.id]));
      const info = Object.assign(clone(R[dayId(d)] || {}), {id:dayId(d), type:'day', trip:M.trip, date:d}); delete info.deleted;
      const lastP = ok.length ? ok[order[order.length - 1]] : null;
      if(!end) end = lastP ? Object.assign({}, pts[lastP.id]) : start, endLbl = lastP ? lastP.nom : endLbl;
      info.route = {start:Object.assign({}, start, {lbl: o1 ? o1.lbl.replace(/^\S+\s/,'') : cfg.depTxt}), end:Object.assign({}, end, {lbl:endLbl}),
        loop: cfg.arr==='boucle', fin: cfg.arr==='fin', ids: order.map(i=>ok[i].id), pts, miss, walk: num(val('pl-walk')) || 2.5};
      put(info, '⚡ Itinéraire optimisé');
      planDay(d);
      const r2 = document.getElementById('pl-res'); if(r2) r2.scrollIntoView({block:'start', behavior:'smooth'});
    } catch(e){
      say(''); alert(e.message);
    }
    const b2 = document.getElementById('pl-go'); if(b2) b2.disabled = false;
  }
