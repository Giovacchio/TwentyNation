/* TwentyNation — leggere i mostri dai tuoi manuali
   Riconosce i blocchi statistica nel formato standard di D&D 5e:
   nome, riga «taglia tipo, allineamento», CA, PF, velocità, i sei
   punteggi, sensi, lingue, grado sfida, tratti e azioni.
   I mostri che entrano restano tuoi, come le altre aggiunte. */

const MP_TAGLIE = { tiny:'Minuscola', small:'Piccola', medium:'Media', large:'Grande', huge:'Enorme', gargantuan:'Mastodontica',
  minuscola:'Minuscola', piccola:'Piccola', media:'Media', grande:'Grande', enorme:'Enorme', mastodontica:'Mastodontica' };
const MP_TIPI = { aberration:'aberrazione', beast:'bestia', celestial:'celestiale', construct:'costrutto', dragon:'drago',
  elemental:'elementale', fey:'fatato', fiend:'immondo', giant:'gigante', humanoid:'umanoide', monstrosity:'mostruosità',
  ooze:'melma', plant:'pianta', undead:'non morto',
  aberrazione:'aberrazione', bestia:'bestia', celestiale:'celestiale', costrutto:'costrutto', drago:'drago',
  elementale:'elementale', fatato:'fatato', immondo:'immondo', gigante:'gigante', umanoide:'umanoide',
  mostruosità:'mostruosità', melma:'melma', pianta:'pianta', 'non morto':'non morto' };

/* «Medium humanoid (any race), lawful evil» → taglia e tipo */
function mpRigaTipo(riga){
  const t = String(riga||'').toLowerCase();
  const m = /^\s*(tiny|small|medium|large|huge|gargantuan|minuscola|piccola|media|grande|enorme|mastodontica)\s+([a-zàèéìòù ]+?)\s*(?:\(|,|$)/.exec(t);
  if (!m) return null;
  const tipo = MP_TIPI[m[2].trim()] || MP_TIPI[m[2].trim().split(' ')[0]];
  if (!tipo) return null;
  return { sz: MP_TAGLIE[m[1]], t: tipo };
}
/* Il PRIMO numero della riga: «45 (6d10 + 12)» è 45, non 4561012. */
function mpNumero(v){
  const m = /-?\d+/.exec(String(v||''));
  return m ? parseInt(m[0],10) : null;
}
/* «30 ft., fly 60 ft.» → «9 m, volare 18 m» */
function mpVelocita(v){
  return String(v||'').replace(/(\d+)\s*(?:ft\.?|feet|piedi)/gi, (_,n) => {
    const m = Math.round(Number(n) * 0.3 * 2) / 2;
    return String(m).replace('.', ',') + ' m';
  }).replace(/\bfly\b/gi,'volare').replace(/\bswim\b/gi,'nuotare').replace(/\bclimb\b/gi,'scalare')
    .replace(/\bburrow\b/gi,'scavare').replace(/\bhover\b/gi,'fluttuare').trim();
}
function mpGradoSfida(v){
  const m = /(\d+\/\d+|\d+)/.exec(String(v||''));
  return m ? m[1] : '0';
}



/* ─── Cataloghi con le statistiche dentro «properties» ───
   Alcune raccolte tengono nome e descrizione in chiaro e tutto il resto
   dentro un oggetto «properties», con tratti e azioni in JSON annidato.
   In quei cataloghi la maggior parte delle voci è solo una scheda di
   presentazione senza statistiche: quelle non servono a giocare. */
function mpDaCatalogo(m){
  const p = m && m.properties;
  if (!p || typeof p !== 'object') return null;
  if (p.AC == null && p.HP == null) return null;      // niente statistiche

  const num = (v) => { const x = /-?\d+/.exec(String(v==null?'':v)); return x ? parseInt(x[0],10) : null; };
  const dentro = (v) => {
    // «data-Traits» e «data-Actions» sono JSON dentro una stringa
    if (Array.isArray(v)) return v;
    if (typeof v !== 'string' || !v.trim()) return [];
    try { const d = JSON.parse(v); return Array.isArray(d) ? d : []; } catch(e){ return []; }
  };
  const coppie = (v, conColpo) => dentro(v).map(x => {
    const nome = String(x.Name || x.name || '').trim();
    let testo = String(x.Desc || x.desc || '').trim();
    if (conColpo && x['Hit Bonus']){
      const colpo = '+' + String(x['Hit Bonus']).replace(/^\+/,'');
      const danno = [x.Damage, x['Damage Type']].filter(Boolean).join(' ');
      return [nome, colpo, danno, testo.slice(0,300)];
    }
    return [nome, testo.slice(0,400)];
  }).filter(x => x[0]);

  const hd = (/\(([^)]*d[^)]*)\)/.exec(String(p.HP||'')) || [])[1] || '';
  let cr = p['Challenge Rating'];
  if (typeof cr === 'number') cr = cr === 0.5 ? '1/2' : cr === 0.25 ? '1/4' : cr === 0.125 ? '1/8' : String(cr);
  else cr = mpGradoSfida(cr);

  return {
    id: uid(), n: String(m.name||''), it: String(m.name||''),
    sz: MP_TAGLIE[String(p.Size||'').toLowerCase()] || 'Media',
    t: MP_TIPI[String(p.Type||'').toLowerCase().split(/[ ,(]/)[0]] || 'bestia',
    ac: p['data-AcNum'] != null ? num(p['data-AcNum']) : num(p.AC),
    hp: p['data-HpNum'] != null ? num(p['data-HpNum']) : num(p.HP),
    hd, sp: mpVelocita(p.Speed || ''),
    ab: [p.STR, p.DEX, p.CON, p.INT, p.WIS, p.CHA].map(v => { const n = num(v); return n == null ? 10 : n; }),
    sen: String(p.Senses || ''), lang: String(p.Languages || ''), cr,
    tr: coppie(p['data-Traits'], false).slice(0,10),
    act: coppie(p['data-Actions'], true).slice(0,10),
    fonte: [m.book, m.publisher].filter(Boolean).join(' · '),
    homebrew: true,
  };
}

/* ─── Elenchi in JSON ───
   Le raccolte SRD che si trovano in rete usano due o tre forme ricorrenti.
   Le si riconosce e si portano al modello dell'app, senza pretendere che
   siano fatte tutte allo stesso modo. */
function mpDaJson(testo){
  let dati;
  try { dati = JSON.parse(testo); } catch(e){ return null; }
  // può essere un elenco, o un oggetto che lo contiene
  let lista = Array.isArray(dati) ? dati : null;
  if (!lista && dati && typeof dati === 'object'){
    for (const k of ['monsters','results','data','creatures','records']){
      if (Array.isArray(dati[k])){ lista = dati[k]; break; }
    }
    if (!lista && dati.name) lista = [dati];        // un mostro solo
  }
  if (!Array.isArray(lista) || !lista.length) return null;

  const num = (v) => { const m = /-?\d+(?:[.,]\d+)?/.exec(String(v==null?'':v)); return m ? Number(m[0].replace(',','.')) : null; };
  const testoDi = (v) => typeof v === 'string' ? v : (v && v.desc) || '';
  const primoDi = (o, chiavi) => { for (const k of chiavi) if (o[k] != null && o[k] !== '') return o[k]; return null; };

  const fuori = [];
  let senzaStatistiche = 0;
  lista.forEach(m => {
    if (!m || typeof m !== 'object' || !m.name) return;

    // forma «catalogo»: tutto dentro properties
    if (m.properties && typeof m.properties === 'object'){
      const c = mpDaCatalogo(m);
      if (c) fuori.push(c); else senzaStatistiche++;
      return;
    }

    // taglia e tipo: campi propri, oppure la riga «Medium humanoid, neutral»
    let sz = MP_TAGLIE[String(primoDi(m,['size'])||'').toLowerCase()] || '';
    let t  = MP_TIPI[String(primoDi(m,['type'])||'').toLowerCase().split(/[ ,(]/)[0]] || '';
    if ((!sz || !t) && m.meta){
      const r = mpRigaTipo(m.meta);
      if (r){ sz = sz || r.sz; t = t || r.t; }
    }

    // classe armatura: numero, stringa, oppure elenco di oggetti
    let ac = primoDi(m, ['armor_class','Armor Class','ac']);
    if (Array.isArray(ac)) ac = ac.length ? (ac[0].value != null ? ac[0].value : num(ac[0])) : null;
    ac = num(ac);

    const hp = num(primoDi(m, ['hit_points','Hit Points','hp']));
    let hd = String(primoDi(m, ['hit_dice','hitDice']) || '');
    if (!hd){ const mm = /\(([^)]*d[^)]*)\)/.exec(String(primoDi(m,['Hit Points','hit_points'])||'')); if (mm) hd = mm[1]; }

    // velocità: stringa, oppure oggetto {walk, fly, …}
    let sp = primoDi(m, ['speed','Speed']);
    if (sp && typeof sp === 'object'){
      const nomi = { walk:'', fly:'volare', swim:'nuotare', climb:'scalare', burrow:'scavare', hover:'fluttuare' };
      sp = Object.keys(sp).filter(k => sp[k] && k !== 'hover')
        // alcune raccolte scrivono «30», altre «30 ft.»: senza unità sono piedi
        .map(k => (nomi[k] ? nomi[k] + ' ' : '') + (typeof sp[k] === 'number' ? sp[k] + ' ft.' : sp[k]))
        .join(', ');
    }
    sp = mpVelocita(sp || '');

    const ab = [
      num(primoDi(m,['strength','STR','str'])), num(primoDi(m,['dexterity','DEX','dex'])),
      num(primoDi(m,['constitution','CON','con'])), num(primoDi(m,['intelligence','INT','int'])),
      num(primoDi(m,['wisdom','WIS','wis'])), num(primoDi(m,['charisma','CHA','cha'])),
    ].map(v => v == null ? 10 : v);

    let cr = primoDi(m, ['challenge_rating','Challenge','cr','challenge']);
    if (typeof cr === 'number'){
      cr = cr === 0.5 ? '1/2' : cr === 0.25 ? '1/4' : cr === 0.125 ? '1/8' : String(cr);
    } else cr = mpGradoSfida(cr);

    const coppie = (v) => {
      if (Array.isArray(v)) return v.filter(x=>x && (x.name||x.desc)).map(x => [String(x.name||'').trim(), String(x.desc||'').trim().slice(0,400)]);
      if (typeof v === 'string'){
        // Alcune raccolte tengono tratti e azioni in HTML: si toglie il
        // markup e ogni paragrafo diventa una riga.
        const piano = v
          .replace(/<\/(p|div|li)>/gi, '\n')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&rsquo;/g, "'");
        return piano.split(/\n+/).map(r => {
          const mm = /^\s*([^.]{2,48})\.\s+(.+)$/.exec(r.trim());
          return mm ? [mm[1].trim(), mm[2].trim().slice(0,400)] : null;
        }).filter(Boolean);
      }
      return [];
    };
    const tr  = coppie(primoDi(m, ['special_abilities','Traits','traits'])).slice(0,10);
    const act = coppie(primoDi(m, ['actions','Actions'])).slice(0,10).map(x => [x[0], '', x[1], '']);

    if (ac == null && hp == null) return;    // non è un mostro

    fuori.push({ id: uid(), n: String(m.name), it: String(m.name),
      sz: sz || 'Media', t: t || 'bestia', ac: ac == null ? 10 : ac, hp: hp == null ? 1 : hp, hd,
      sp: sp || '9 m', ab,
      sen: testoDi(primoDi(m,['senses','Senses'])) || '',
      lang: testoDi(primoDi(m,['languages','Languages'])) || '',
      cr, tr, act,
      fonte: String(primoDi(m, ['document__title','source','book']) || ''),
      homebrew: true });
  });
  mpSenzaStatistiche = senzaStatistiche;
  return fuori.length ? fuori : (senzaStatistiche ? [] : null);
}
let mpSenzaStatistiche = 0;

/* Trova i blocchi statistica dentro il testo di un PDF. */
function mpScan(testo){
  const righe = String(testo||'').split(/\r?\n/).map(r => r.replace(/\s+/g,' ').trim());
  const trovati = [];
  for (let i = 0; i < righe.length; i++){
    const tipo = mpRigaTipo(righe[i]);
    if (!tipo) continue;
    // il nome è la riga non vuota subito sopra
    let j = i - 1;
    while (j >= 0 && !righe[j]) j--;
    const nome = j >= 0 ? righe[j] : '';
    if (!nome || nome.length > 60 || /^\d/.test(nome)) continue;

    // il corpo arriva fino al prossimo blocco o a 90 righe
    const corpo = [];
    for (let k = i + 1; k < righe.length && corpo.length < 90; k++){
      if (mpRigaTipo(righe[k]) && righe[k-1]) break;
      corpo.push(righe[k]);
    }
    const testoCorpo = corpo.join('\n');
    const campo = (rx) => { const m = rx.exec(testoCorpo); return m ? m[1].trim() : ''; };

    const ac  = mpNumero(campo(/^(?:armor class|classe armatura)\s*:?\s*(.+)$/im));
    const hp  = mpNumero(campo(/^(?:hit points|punti ferita)\s*:?\s*(.+)$/im));
    const hd  = (/^(?:hit points|punti ferita)\s*:?\s*.*?\(([^)]+)\)/im.exec(testoCorpo) || [])[1] || '';
    const sp  = mpVelocita(campo(/^(?:speed|velocit[àa])\s*:?\s*(.+)$/im));
    if (ac == null || hp == null) continue;      // senza queste non è un blocco statistica

    // i sei punteggi: una riga con sei numeri, spesso seguiti dal modificatore fra parentesi
    let ab = null;
    for (const r of corpo){
      const nums = r.match(/\b(\d{1,2})\s*\([-+]?\d+\)/g);
      if (nums && nums.length >= 6){ ab = nums.slice(0,6).map(x => parseInt(x,10)); break; }
      const soli = r.match(/^\s*(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s*$/);
      if (soli){ ab = soli.slice(1,7).map(Number); break; }
    }
    if (!ab){
      // a volte stanno su sei righe di fila
      const idx = corpo.findIndex(r => /^(str|for)\b/i.test(r));
      if (idx >= 0){
        const cand = corpo.slice(idx, idx+12).map(r => mpNumero(r)).filter(n => n != null && n >= 1 && n <= 30);
        if (cand.length >= 6) ab = cand.slice(0,6);
      }
    }
    if (!ab) ab = [10,10,10,10,10,10];

    const sen  = campo(/^(?:senses|sensi)\s*:?\s*(.+)$/im);
    const lang = campo(/^(?:languages|lingue)\s*:?\s*(.+)$/im);
    const cr   = mpGradoSfida(campo(/^(?:challenge|grado di sfida|grado sfida)\s*:?\s*(.+)$/im));

    // tratti e azioni: «Nome. Testo» prima e dopo l'intestazione «Actions»
    const iAz = corpo.findIndex(r => /^(actions|azioni)\s*$/i.test(r));
    const raccogli = (righeBlocco) => {
      const fuori = [];
      righeBlocco.forEach(r => {
        const m = /^([A-ZÀ-Ý][^.]{2,48})\.\s+(.{10,})$/.exec(r);
        if (m) fuori.push([m[1].trim(), m[2].trim().slice(0,400)]);
        else if (fuori.length && r && !/^(actions|azioni|reactions|reazioni)\s*$/i.test(r))
          fuori[fuori.length-1][1] = (fuori[fuori.length-1][1] + ' ' + r).slice(0,400);
      });
      return fuori.slice(0,10);
    };
    const dopoStat = corpo.findIndex(r => /^(?:challenge|grado di sfida|grado sfida)/i.test(r));
    const tr  = raccogli(corpo.slice(dopoStat >= 0 ? dopoStat+1 : 0, iAz >= 0 ? iAz : corpo.length));
    const act = iAz >= 0 ? raccogli(corpo.slice(iAz+1)).map(x => [x[0], '', x[1], '']) : [];

    trovati.push({ id: uid(), n: nome, it: nome, sz: tipo.sz, t: tipo.t, ac, hp, hd, sp: sp || '9 m',
                   ab, sen, lang, cr, tr, act, homebrew: true });
    i += Math.max(1, corpo.length - 1);
  }
  return trovati;
}

/* ─── La schermata ─── */
let mpStato = null;
const MP_LIMITE = 400;   // oltre questo numero la memoria del telefono soffre

function openMostriPdf(){
  mpStato = { busy:false, trovati:null, scelti:new Set(), pag:0, tot:0, file:0, file_n:0, q:'', gs:'' };
  openModal({ render: mostriPdfHTML });
}
function mostriPdfHTML(){
  const s = mpStato || {};
  if (!s.trovati) return modalShell('🐉 Leggi i mostri dal tuo manuale', `
    <p class="muted" style="margin-bottom:14px">
      Carica un <b>elenco in JSON</b> (le raccolte SRD che si trovano in rete) oppure un PDF o un file di testo con i <b>blocchi statistica</b>: l'app cerca nome, taglia,
      tipo, CA, punti ferita, velocità, punteggi, sensi, lingue, grado sfida, tratti e azioni.
      Quello che entra finisce nel tuo bestiario e diventa scegliibile come <b>forma selvatica,
      famiglio o compagno</b>.
    </p>
    <div class="btn-row">
      <button class="btn btn-gold" ${s.busy?'disabled':''} onclick="document.getElementById('mp-file').click()">📂 ${s.busy
        ? ((s.file_n>1?'File '+s.file+' di '+s.file_n+' · ':'') + (s.tot?'pagina '+s.pag+' di '+s.tot+'…':'leggo…'))
        : 'Scegli i file'}</button>
      <button class="btn btn-ghost" ${s.busy?'disabled':''} onclick="mpDaCasella()">Analizza il testo</button>
    </div>
    ${s.busy ? `<p class="muted" style="font-size:.75rem; margin-top:8px">Un bestiario intero richiede qualche minuto: tieni l'app aperta.</p>` : ''}
    <input type="file" id="mp-file" multiple accept=".txt,text/plain,application/pdf,.pdf,.md,.json,application/json" style="display:none" onchange="mpFile(this)">
    <div class="field" style="margin-top:12px">
      <label>…oppure incolla qui</label>
      <textarea id="mp-testo" style="min-height:120px; font-family:var(--font-ui); font-size:.8rem" placeholder="Incolla il blocco statistica di un mostro."></textarea>
    </div>
    <div class="spell-source-note">Carica solo materiale di cui hai i diritti: i tuoi appunti o i manuali che possiedi. Resta sul tuo account.</div>`);

  const n = s.scelti.size;
  const visibili = mpFiltrati();
  const gsPresenti = [...new Set((s.trovati||[]).map(m => String(m.cr)))]
    .sort((a,b) => crValue(a) - crValue(b));
  const riga = (m) => {
    const on = s.scelti.has(m.id);
    return `<button class="attack-row" style="width:100%; text-align:left; ${on?'border-color:var(--gold)':''}" onclick="mpToggle('${jsStr(m.id)}')">
      <span style="flex-shrink:0; margin-right:10px; font-size:1.05rem">${on?'☑️':'⬜'}</span>
      <span class="attack-main">
        <span class="attack-name">🐉 ${escapeHtml(m.it)}</span>
        <span class="muted" style="font-size:.73rem; display:block">${escapeHtml(m.sz)} ${escapeHtml(m.t)} · GS ${escapeHtml(m.cr)} · CA ${m.ac} · ${m.hp} PF${m.act.length?' · '+m.act.length+' azioni':''}${m.fonte?' · '+escapeHtml(m.fonte):''}</span>
      </span>
    </button>`;
  };
  return modalShell('🐉 Cosa ho trovato', `
    <div class="card" style="margin-bottom:12px">
      <div class="row-between"><span class="muted">Riconosciuti</span><b>${s.trovati.length}</b></div>
      <div class="row-between" style="margin-top:4px"><span class="muted">Selezionati</span><b style="color:var(--gold)">${n}</b></div>
    </div>
    ${mpSenzaStatistiche ? `<div class="card" style="margin-bottom:12px; border-color:var(--warn)">
      <b style="font-size:.86rem">⚠️ ${mpSenzaStatistiche} voci senza statistiche</b>
      <p class="muted" style="margin-top:6px; font-size:.79rem">In questo file hanno solo nome, descrizione e qualche etichetta:
      niente CA, punti ferita o azioni. Non si possono giocare, quindi le ho lasciate fuori.</p>
    </div>` : ''}
    ${s.trovati.length ? `
    <div class="field" style="margin-bottom:8px">
      <input id="mp-cerca" value="${attr(s.q)}" placeholder="Cerca per nome, tipo o libro…" oninput="mpCerca(this.value)" autocomplete="off">
    </div>
    ${gsPresenti.length > 1 ? `<div class="chip-row" style="margin-bottom:8px">
      <button class="chip ${s.gs?'':'active'}" onclick="mpFiltraGs('')">Tutti i GS</button>
      ${gsPresenti.slice(0,14).map(g=>`<button class="chip ${s.gs===g?'active':''}" onclick="mpFiltraGs('${jsStr(g)}')">GS ${escapeHtml(g)}</button>`).join('')}
    </div>` : ''}
    <div class="chip-row" style="margin-bottom:8px">
      <button class="chip" onclick="mpTutti(true)">Scegli i ${visibili.length} mostrati</button>
      <button class="chip" onclick="mpTutti(false)">Nessuno</button>
    </div>
    <div class="list-gap">${visibili.slice(0,200).map(riga).join('')}</div>
    ${visibili.length>200?`<p class="muted" style="font-size:.73rem; margin-top:8px">…e altri ${visibili.length-200}. Restringi con la ricerca, oppure «Scegli i ${visibili.length} mostrati» li prende tutti.</p>`:''}`
    : emptyState('🤔', mpSenzaStatistiche
        ? 'Nessuna voce di questo file ha le statistiche: è un catalogo di nomi e descrizioni, non un bestiario giocabile.'
        : 'Non ho riconosciuto nessun blocco statistica. Serve il formato standard, con CA e punti ferita.')}
    <div class="btn-row" style="margin-top:14px">
      <button class="btn btn-ghost" onclick="openMostriPdf()">← Ricomincia</button>
      <button class="btn btn-primary" ${n?'':'disabled'} onclick="mpConferma()">Aggiungi ${n||''}</button>
    </div>
    <div class="muted" style="font-size:.73rem; margin-top:10px">Quello che l'app riconosce è una bozza: apri ogni mostro dal bestiario e sistemalo se serve.</div>`);
}
function mpToggle(id){ if (mpStato.scelti.has(id)) mpStato.scelti.delete(id); else mpStato.scelti.add(id); renderModalRoot(); }
/* «tutti» vale su quello che stai vedendo, non sull'intero catalogo */
function mpTutti(on){ mpFiltrati().forEach(m => on ? mpStato.scelti.add(m.id) : mpStato.scelti.delete(m.id)); renderModalRoot(); }
function mpCerca(v){ mpStato.q = v; renderModalRoot(); }
function mpFiltraGs(v){ mpStato.gs = v; renderModalRoot(); }
function mpFiltrati(){
  let l = mpStato.trovati || [];
  if (mpStato.q){
    const q = norm(mpStato.q);
    l = l.filter(m => norm(m.it).includes(q) || norm(m.t).includes(q) || norm(m.fonte||'').includes(q));
  }
  if (mpStato.gs) l = l.filter(m => String(m.cr) === mpStato.gs);
  return l;
}
function mpAnalizza(testo){
  if (!String(testo||'').trim()){ mpStato.busy = false; renderModalRoot(); toast('Non c’è niente da leggere'); return; }
  // un elenco in JSON si riconosce subito; altrimenti si cercano i blocchi
  const trovati = mpDaJson(testo) || mpScan(testo);
  mpStato.trovati = trovati; mpStato.busy = false;
  mpStato.scelti = new Set(trovati.map(m => m.id));
  renderModalRoot({ toTop:true });
  toast(trovati.length ? ('Ho riconosciuto ' + trovati.length + ' mostri') : '⚠️ Nessun blocco statistica riconosciuto');
}
function mpDaCasella(){ const el = document.getElementById('mp-testo'); mpAnalizza(el ? el.value : ''); }
async function mpFile(input){
  const files = Array.from(input.files || []); input.value = '';
  if (!files.length) return;
  mpStato.busy = true; mpStato.file_n = files.length; mpStato.pag = 0; mpStato.tot = 0;
  renderModalRoot();
  const testi = [];
  for (let i = 0; i < files.length; i++){
    const f = files[i];
    mpStato.file = i+1; mpStato.pag = 0; mpStato.tot = 0; renderModalRoot();
    try {
      if (/pdf/i.test(f.type||'') || /\.pdf$/i.test(f.name||'')){
        const buf = await f.arrayBuffer();
        let ultimo = 0;
        const { text } = await extractPdfColumns(buf, 1, 0, (fatte, totali) => {
          mpStato.pag = fatte; mpStato.tot = totali;
          const ora = Date.now(); if (ora - ultimo > 500){ ultimo = ora; renderModalRoot(); }
        });
        testi.push(text);
      } else testi.push(await f.text());
    } catch(e){ console.error(e); toast('⚠️ Non riesco a leggere «' + (f.name||'il file') + '»'); }
  }
  if (!testi.length){ mpStato.busy = false; renderModalRoot(); return; }
  mpAnalizza(testi.join('\n\n'));
}
function mpConferma(){
  const scelti = mpStato.trovati.filter(m => mpStato.scelti.has(m.id));
  if (!scelti.length) return;
  if (scelti.length > MP_LIMITE){
    confirmDialog('Sono davvero tanti',
      scelti.length + ' mostri insieme riempiono la memoria del telefono e rallentano l\'app. ' +
      'Ne aggiungo i primi ' + MP_LIMITE + ': per gli altri restringi con la ricerca e ripeti.',
      () => mpAggiungi(scelti.slice(0, MP_LIMITE)), 'Aggiungi ' + MP_LIMITE);
    return;
  }
  mpAggiungi(scelti);
}
function mpAggiungi(scelti){
  state.npcs = state.npcs || [];
  scelti.forEach(m => {
    // il bestiario usa hpMax/hpCurrent/speed/type: passando i campi grezzi
    // i mostri entravano con 0 PF e senza tipo
    const v = (typeof monsterToNpc === 'function')
      ? Object.assign(monsterToNpc(m), { id: uid(), updatedAt: Date.now() })
      : { id: uid(), name: m.it, type: m.sz + ' ' + m.t + ', GS ' + m.cr, avatar: '🐉',
          ac: m.ac, hpMax: m.hp, hpCurrent: m.hp, speed: parseFloat(m.sp) || 9,
          notes: '', createdAt: Date.now(), updatedAt: Date.now() };
    state.npcs.push(v);
    fsSet('npcs', v);
  });
  saveLocal();
  mpStato = null;
  closeModal(); render();
  toast('🐉 ' + scelti.length + (scelti.length===1?' mostro nel bestiario':' mostri nel bestiario'));
}
