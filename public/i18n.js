/* Carnet de voyage — traduction de l'interface.
   L'appli est écrite en français ; ce fichier traduit à l'affichage tout texte d'interface connu
   (dictionnaire lang/xx.js), sans toucher aux fiches des utilisateurs ni aux données enregistrées.
   Langue : choix enregistré (Réglages → Langue), sinon celle du téléphone, sinon l'anglais. */
(function(){
  var LANGS = {fr:'Français', en:'English', es:'Español', de:'Deutsch', it:'Italiano', pt:'Português', nl:'Nederlands'};
  var LOC = {fr:'fr-FR', en:'en-GB', es:'es-ES', de:'de-DE', it:'it-IT', pt:'pt-BR', nl:'nl-NL'};
  var saved = null; try { saved = localStorage.getItem('cv-lang'); } catch(e){}
  var nav = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'fr']).map(function(l){ return String(l).slice(0,2).toLowerCase(); });
  var lang = saved && LANGS[saved] ? saved : (nav.filter(function(l){ return LANGS[l]; })[0] || 'en');
  var I = window.I18N = {lang: lang, locale: LOC[lang], langs: LANGS, ready: lang === 'fr',
    set: function(l){ try { localStorage.setItem('cv-lang', l); } catch(e){} location.reload(); },
    tr: function(s){ return s; }, msg: function(s){ return s; }, load: load};
  document.documentElement.lang = lang;
  if(lang === 'fr') return;

  var EXACT = new Map(), RAW = new Map(), PAT = new Map(), WILD = [], memo = new Map();
  var flat = function(s){ return String(s).replace(/\s+/g, ' ').trim(); };
  var rawN = function(s){ return String(s).replace(/[ \t ]+/g, ' ').split('\n').map(function(l){ return l.trim(); }).join('\n').trim(); };
  var esc = function(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  function load(d){
    Object.keys(d).forEach(function(k){
      var v = d[k]; if(typeof v !== 'string' || !v) return;
      if(/\{\d+\}/.test(k)){
        var parts = flat(k).split(/\{(\d+)\}/), re = '^', order = [];
        for(var i = 0; i < parts.length; i++){ if(i % 2) { re += '([\\s\\S]*?)'; order.push(+parts[i]); } else re += esc(parts[i]); }
        var p = {re: new RegExp(re + '$'), order: order, v: flat(v)}, head = parts[0];
        if(head.length >= 3){ var key = head.slice(0, 3); if(!PAT.has(key)) PAT.set(key, []); PAT.get(key).push(p); } else WILD.push(p);
      } else { EXACT.set(flat(k), flat(v)); if(/\n/.test(k)) RAW.set(rawN(k), rawN(v)); }
    });
    I.ready = true; memo.clear();
    if(document.documentElement) walkAll(document.documentElement);
  }
  // une valeur insérée dans une phrase peut elle-même être un texte connu (« hébergement », « 3 jours · »)
  function sub(x, depth){
    if(!x || depth > 1 || !/[A-Za-zÀ-ÿ]/.test(x)) return x;
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(x), c = flat(m[2]); if(!c) return x;
    var r = EXACT.has(c) ? EXACT.get(c) : viaPattern(c, depth + 1);
    return r == null ? x : m[1] + r + m[3];
  }
  function viaPattern(core, depth){
    depth = depth || 0;
    var lists = [PAT.get(core.slice(0, 3)) || [], WILD];
    for(var j = 0; j < lists.length; j++) for(var i = 0; i < lists[j].length; i++){
      var p = lists[j][i], m = p.re.exec(core); if(!m) continue;
      var vals = {}; p.order.forEach(function(n, k){ vals[n] = sub(m[k + 1], depth); });
      // {1|nuit|nuits} : forme au singulier si la valeur est vide, sinon au pluriel (accords « s » du français)
      return p.v.replace(/\{(\d+)(?:\|([^|}]*)\|([^}]*))?\}/g, function(_, n, one, many){
        if(one != null) return (vals[n] == null || vals[n] === '') ? one : many;
        return vals[n] != null ? vals[n] : ''; });
    }
    return null;
  }
  function look(core){
    if(memo.has(core)) return memo.get(core);
    var r = EXACT.has(core) ? EXACT.get(core) : (/[A-Za-zÀ-ÿ]/.test(core) ? viaPattern(core) : null);
    if(r == null){   // « ＋ hébergement », « 📍 Lieu » : symbole devant un texte connu
      var pm = /^([^A-Za-zÀ-ÿ0-9]+?\s*)([A-Za-zÀ-ÿ][\s\S]*)$/.exec(core);
      if(pm){ var rest = EXACT.has(pm[2]) ? EXACT.get(pm[2]) : viaPattern(pm[2]); if(rest != null) r = pm[1] + rest; }
    }
    if(memo.size > 5000) memo.clear();
    memo.set(core, r); return r;
  }
  function tr(s){
    if(!s || !I.ready) return s;
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), core = flat(m[2]); if(!core) return s;
    var r = look(core); return r == null ? s : m[1] + r + m[3];
  }
  function msg(s){
    if(s == null || !I.ready) return s; s = String(s);
    var n = rawN(s); if(RAW.has(n)) return RAW.get(n);
    var r = look(flat(s)); if(r != null) return r;
    return s.split('\n').map(function(l){ return tr(l); }).join('\n');
  }
  I.tr = tr; I.msg = msg;

  var SKIP = {SCRIPT:1, STYLE:1, TEXTAREA:1, CODE:1, PRE:1};
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  function doText(t){
    var v = t.nodeValue; if(!v || t.__t === v) return;
    var p = t.parentNode; if(!p || SKIP[p.nodeName] || p.isContentEditable || (p.closest && p.closest('[data-notr]'))){ t.__t = v; return; }
    var r = tr(v);
    if(r !== v){ if(p.nodeName === 'OPTION' && !p.hasAttribute('value')) p.setAttribute('value', p.textContent); t.nodeValue = r; }
    t.__t = t.nodeValue;
  }
  function doAttrs(el){
    for(var i = 0; i < ATTRS.length; i++){ var a = el.getAttribute(ATTRS[i]); if(a){ var r = tr(a); if(r !== a) el.setAttribute(ATTRS[i], r); } }
    if(el.nodeName === 'A'){ var h = el.getAttribute('href'); if(h === 'mentions-legales.html') el.setAttribute('href', 'legal-en.html'); else if(h === 'privacy.html') el.setAttribute('href', 'privacy-en.html'); }
    if(el.nodeName === 'INPUT' && /^(button|submit)$/i.test(el.type) && el.value){ var r2 = tr(el.value); if(r2 !== el.value) el.value = r2; }
  }
  function walkAll(root){
    if(root.nodeType === 3){ doText(root); return; }
    if(root.nodeType !== 1 || SKIP[root.nodeName]) return;
    doAttrs(root);
    var w = document.createTreeWalker(root, 5 /* éléments + textes */), n;
    while((n = w.nextNode())){ if(n.nodeType === 3) doText(n); else if(!SKIP[n.nodeName]) doAttrs(n); }
  }
  var mo = new MutationObserver(function(list){
    if(!I.ready) return;
    for(var i = 0; i < list.length; i++){
      var r = list[i];
      if(r.type === 'childList') for(var j = 0; j < r.addedNodes.length; j++) walkAll(r.addedNodes[j]);
      else if(r.type === 'characterData') doText(r.target);
      else if(r.type === 'attributes' && r.target.nodeType === 1) doAttrs(r.target);
    }
  });
  mo.observe(document.documentElement, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS});
  // messages (alerte, confirmation, saisie)
  var A = window.alert, C = window.confirm, Pr = window.prompt;
  window.alert = function(m){ return A.call(window, msg(m)); };
  window.confirm = function(m){ return C.call(window, msg(m)); };
  window.prompt = function(m, d){ return Pr.call(window, msg(m), d); };
  // dictionnaire de la langue (chargé avant l'appli)
  document.write('<script src="lang/' + lang + '.js"><\/script>');
})();
