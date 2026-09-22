/* TwentyNation — caricare le suppliche che l'SRD non ha
   ═══════════════════════════════════════════════════════════════
   L'app di serie porta solo le suppliche del System Reference
   Document. Se il tuo manuale ne ha altre, le carichi qui da un PDF o
   incollando il testo: restano nel TUO account e, se vuoi, le condividi
   col tuo tavolo. Non finiscono nell'app e non le vede nessun altro.

   Leggendo il testo l'app prova a capire COSA FA ogni supplica e ti
   propone l'effetto già compilato. Sbagliando propone, non rompe: prima
   di salvare vedi tutto e correggi. */

let suppDraft = null;   // { per, voci:[{nome,testo,req,effetti,tenere}] }

function apriImportSuppliche(charId){
  suppDraft = { per: charId, voci: [], testoGrezzo: '' };
  openModal({ render: importSupplicheHTML });
}
function importSupplicheHTML(){
  const d = suppDraft || { voci: [] };
  const tenute = d.voci.filter(v => v.tenere).length;
  return modalShell('⇪ Carica altre suppliche', `
    ${!d.voci.length ? `
      <p class="muted" style="font-size:.84rem; margin-bottom:12px">
        Da un PDF o incollando il testo. Una supplica per blocco: il nome sulla sua riga,
        e sotto la descrizione. I prerequisiti fra parentesi vengono letti da soli.
      </p>
      <input type="file" id="supp-file" accept="application/pdf,.pdf,.txt,.md,text/plain" style="display:none"
             onchange="suppUsaFile(this)">
      <button class="btn btn-primary btn-block" onclick="document.getElementById('supp-file').click()">${ic('foglio')} Scegli un PDF o un testo</button>
      <div class="divider"><span class="flourish">❧</span><span>oppure incolla</span></div>
      <div class="field">
        <textarea id="supp-testo" rows="7" placeholder="Nome della supplica&#10;Prerequisito: 5° livello, patto della lama&#10;Quello che fa…"
                  oninput="suppDraft.testoGrezzo=this.value"></textarea>
      </div>
      <button class="btn btn-gold btn-block" onclick="suppLeggiTesto()">Leggi il testo</button>
    ` : `
      <div class="card" style="margin-bottom:10px">
        <div class="row-between"><span>Trovate</span><b>${d.voci.length}</b></div>
        <div class="row-between" style="margin-top:4px"><span>Da tenere</span><b>${tenute}</b></div>
      </div>
      <p class="muted" style="font-size:.76rem; margin-bottom:10px">
        Controlla quello che ho capito. L'effetto proposto lo puoi cambiare con ⚙.
      </p>
      ${d.voci.map((v, i) => `<div class="attack-row" style="display:block; margin-bottom:8px; ${v.tenere?'':'opacity:.5'}">
        <div class="row-between" style="margin-bottom:4px">
          <b>${escapeHtml(v.nome)}</b>
          <span style="display:flex; gap:6px">
            <button class="btn btn-sm btn-ghost" onclick="suppEffetto(${i})">⚙</button>
            <button class="btn btn-sm ${v.tenere?'btn-gold':'btn-ghost'}" onclick="suppTieni(${i})">${v.tenere?'Tengo':'Salto'}</button>
          </span>
        </div>
        ${v.req && (v.req.livello || v.req.patto || v.req.trucchetto) ? `<div class="muted" style="font-size:.71rem">Richiede: ${escapeHtml(descriviReq(v.req))}</div>` : ''}
        <div class="muted" style="font-size:.75rem; margin-top:3px">${escapeHtml((v.testo||'').slice(0,190))}${(v.testo||'').length>190?'…':''}</div>
        <div class="muted" style="font-size:.71rem; margin-top:4px; color:var(--gold-dim)">
          ⚙ ${escapeHtml(descriviEffetti(v.effetti))}
        </div>
      </div>`).join('')}
      <button class="btn btn-primary btn-block" onclick="suppSalva()">Aggiungi ${tenute} ${tenute===1?'supplica':'suppliche'}</button>
      <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="suppDraft.voci=[]; renderModalRoot()">Ricomincia</button>
    `}
    <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="closeModal()">Chiudi</button>
  `);
}
function descriviReq(req){
  const p = [];
  if (req.livello) p.push(req.livello + '° livello');
  if (req.patto) p.push({chain:'patto della catena',blade:'patto della lama',tome:'patto del tomo'}[req.patto] || req.patto);
  if (req.trucchetto){ const s = spellByRef({id:req.trucchetto,source:'srd'}); p.push(s ? spellName(s) : req.trucchetto); }
  return p.join(', ');
}
function descriviEffetti(eff){
  if (!eff || !eff.length) return 'nessun effetto automatico — solo il testo in scheda';
  return eff.map(e => {
    if (e.tipo === 'incantesimo'){
      const s = spellByRef({id:e.id,source:'srd'});
      return (s ? spellName(s) : e.id) + ' ' + ({volonta:'a volontà',riposoLungo:'1 per riposo lungo',riposoBreve:'1 per riposo breve'}[e.quando]||e.quando);
    }
    if (e.tipo === 'danno')      return '+' + (e.agg==='cha'?'Carisma':e.agg) + ' ai danni';
    if (e.tipo === 'gittata')    return 'gittata ' + e.metri + ' m';
    if (e.tipo === 'raggi')      return 'spinge di ' + e.spinta + ' m';
    if (e.tipo === 'competenza') return 'competenza in ' + (e.abilita||[]).length + ' abilità';
    if (e.tipo === 'senso')      return e.testo;
    return e.testo || e.tipo;
  }).join(' · ');
}
function suppTieni(i){ suppDraft.voci[i].tenere = !suppDraft.voci[i].tenere; renderModalRoot(); }

/* ─── Leggere una TABELLA ─────────────────────────────────────────
   Le raccolte di suppliche girano quasi sempre come foglio di calcolo
   esportato in PDF: colonne Nome / Livello / Prerequisiti / Descrizione.
   Letto riga per riga come fosse prosa viene fuori una poltiglia — la
   descrizione di una finisce attaccata al nome della successiva. Qui le
   colonne si riconoscono dall'intestazione e si tengono separate, e una
   descrizione che va a capo resta attaccata alla SUA riga. */
const SUPP_COLONNE = {
  nome:    /^(name|nome|invocation|supplica|suppliche)$/i,
  livello: /^(level|livello|lvl|warlock level)$/i,
  req:     /^(requirements?|prerequisites?|prerequisit[oi]|richiede)$/i,
  testo:   /^(description|descrizione|effect|effetto|testo)$/i,
  breve:   /^(short descriptor|riassunto|sintesi)$/i,
  /* colonne che non si usano, ma vanno RICONOSCIUTE: se no il loro testo
     («Passive», «PHB 110») finisce nella colonna accanto, dentro ai
     prerequisiti o in coda alla descrizione */
  azione:  /^(action economy|action|azione|tipo)$/i,
  ricarica:/^(recharge|ricarica|usi)$/i,
  fonte:   /^(source|fonte|book|libro|manuale)$/i,
};
/* I pezzi di pdf.js raggruppati per riga, con la loro posizione. */
function pezziPerRiga(tc){
  const items = tc.items
    .map(i => ({ t: String(i.str||'').trim(), x: Math.round(i.transform[4]), y: Math.round(i.transform[5]) }))
    .filter(i => i.t);
  const righe = new Map();
  items.forEach(i => { if (!righe.has(i.y)) righe.set(i.y, []); righe.get(i.y).push(i); });
  return [...righe.entries()].sort((a,b) => b[0] - a[0])
    .map(([y, ps]) => ({ y, celle: ps.sort((a,b) => a.x - b.x) }));
}
/* Cerca l'intestazione e ne ricava dove comincia ogni colonna. */
function trovaIntestazione(righe){
  for (const r of righe){
    const mappa = {};
    r.celle.forEach(c => {
      Object.keys(SUPP_COLONNE).forEach(k => { if (SUPP_COLONNE[k].test(c.t)) mappa[k] = c.x; });
    });
    if (mappa.nome != null && (mappa.testo != null || mappa.breve != null)) return { y: r.y, mappa };
  }
  return null;
}
/* A quale colonna appartiene un pezzo, data la sua x. */
function colonnaDi(x, confini){
  let scelta = null;
  confini.forEach(c => { if (x >= c.x - 6 && (scelta === null || c.x > scelta.x)) scelta = c; });
  return scelta ? scelta.k : null;
}
/* Da una tabella alle voci. Torna [] se non è una tabella.
   Accetta le righe di una pagina sola (il formato di prima) oppure un
   elenco di PAGINE, ognuna coi suoi pezzi { t, x, y } alle coordinate
   esatte. Le pagine vanno tenute separate: la y ricomincia da capo a
   ogni pagina, e mescolandole la riga 400 di pagina 2 finiva accanto
   alla riga 400 di pagina 1. */
function suppDaTabella(ingresso){
  if (!Array.isArray(ingresso) || !ingresso.length) return [];
  const aPagine = Array.isArray(ingresso[0]);
  const pagine = aPagine ? ingresso
    : [ingresso.flatMap(r => r.celle.map(c => ({ t: c.t, x: c.x, y: r.y })))];
  let intest = null;
  const voci = [];
  pagine.forEach(pezzi => {
    const righe = suppRighe(pezzi);
    const qui = trovaIntestazione(righe);
    if (qui) intest = qui;
    if (!intest) return;
    const sotto = qui ? qui.y : Infinity;
    suppTabellaPagina(pezzi.filter(p => p.y < sotto - 2), intest).forEach(v => voci.push(v));
  });
  return voci.filter(v => v.nome && v.testo.trim().length > 15)
             .map(v => ({ ...v, testo: v.testo.replace(/\s+/g,' ').trim() }));
}
/* I pezzi raggruppati per riga (stessa y a meno di un paio di punti). */
function suppRighe(pezzi){
  const ord = pezzi.slice().sort((a,b) => (b.y - a.y) || (a.x - b.x));
  const righe = [];
  ord.forEach(p => {
    const r = righe[righe.length-1];
    if (r && Math.abs(r.y - p.y) <= 2) r.celle.push(p);
    else righe.push({ y: p.y, celle: [p] });
  });
  righe.forEach(r => r.celle.sort((a,b) => a.x - b.x));
  return righe;
}
/* Una pagina di tabella. Nei fogli di calcolo esportati in PDF il testo
   di ogni cella sta CENTRATO in verticale nella sua riga: il nome e' una
   riga sola a meta' altezza, la descrizione va a capo sopra e sotto.
   Leggere riga per riga attaccava l'inizio di una descrizione alla voce
   di sopra. Qui il nome fa da perno, e a ogni perno va il pezzo di
   descrizione che gli sta centrato intorno. */
function suppTabellaPagina(pezzi, intest){
  const confini = Object.keys(intest.mappa).map(k => ({ k, x: intest.mappa[k] })).sort((a,b) => a.x - b.x);
  const perCol = {};
  pezzi.forEach(p => {
    const k = colonnaDi(p.x, confini); if (!k) return;
    (perCol[k] = perCol[k] || []).push(p);
  });
  const linee = (lista) => suppRighe(lista || []).map(r => ({ y: r.y, t: r.celle.map(c => c.t).join(' ').trim() })).filter(l => l.t);
  const col = {};
  Object.keys(perCol).forEach(k => { col[k] = linee(perCol[k]); });
  if (!col.nome || !col.nome.length) return [];

  // l'interlinea tipica, per capire dove finisce una cella e comincia l'altra
  const salti = [];
  Object.values(col).forEach(ls => { for (let i = 1; i < ls.length; i++) salti.push(ls[i-1].y - ls[i].y); });
  const piccoli = salti.filter(g => g > 3 && g < 16).sort((a,b) => a - b);
  const passo = piccoli.length ? piccoli[Math.floor(piccoli.length / 3)] : 9;
  const soglia = passo * 1.18;
  const blocchi = (ls) => {
    const out = [];
    ls.forEach(l => {
      const b = out[out.length-1];
      if (b && b.fondo - l.y <= soglia){ b.t += ' ' + l.t; b.fondo = l.y; }
      else out.push({ cima: l.y, fondo: l.y, t: l.t });
    });
    out.forEach(b => { b.y = (b.cima + b.fondo) / 2; });
    return out;
  };
  const perni = blocchi(col.nome);
  const righe = perni.map(p => ({ perno: p.y, nome: p.t, per: {} }));
  const vicino = (y) => { let m = null; righe.forEach(r => { if (!m || Math.abs(r.perno - y) < Math.abs(m.perno - y)) m = r; }); return m; };

  /* La descrizione: si scorre dall'alto, e per ogni riga della tabella si
     prendono le linee che la tengono centrata sul suo nome. Cosi' anche un
     paragrafo vuoto DENTRO una cella non la spezza in due. */
  const lunga = col.testo ? 'testo' : (col.breve ? 'breve' : null);
  /* Non tutti i fogli centrano: se le celle della descrizione cominciano
     all'altezza del nome, la tabella e' allineata in alto, e ogni blocco
     va al nome che gli sta in cima. */
  const blocchiLunghi = lunga ? blocchi(col[lunga]) : [];
  const inCima = blocchiLunghi.filter(b => righe.some(r => Math.abs(r.perno - b.cima) <= 2.5)).length;
  const allineaAlto = blocchiLunghi.length > 0 && inCima >= blocchiLunghi.length * 0.6;
  const vicinoA = (y) => allineaAlto
    ? righe.filter(r => r.perno >= y - 2.5).sort((a, b) => a.perno - b.perno)[0] || vicino(y)
    : vicino(y);
  /* allineata in alto: una riga della tabella va dal suo nome fino al nome
     dopo, quindi ogni LINEA sta con il nome che ha sopra (anche quando
     l'interlinea e' la stessa dentro e fra le celle) */
  if (lunga && allineaAlto){
    col[lunga].forEach(l => { const r = vicinoA(l.y); if (r) r.per[lunga] = (r.per[lunga] ? r.per[lunga] + ' ' : '') + l.t; });
  } else if (lunga){
    const ls = col[lunga];
    let p = 0;
    righe.forEach((r, i) => {
      if (p >= ls.length) return;
      const restanti = righe.length - i - 1;
      if (!restanti){ r.per[lunga] = ls.slice(p).map(l => l.t).join(' '); p = ls.length; return; }
      let meglio = null;
      for (let k = 1; p + k <= ls.length - restanti && k <= 40; k++){
        const centro = (ls[p].y + ls[p+k-1].y) / 2;
        const dopo = ls[p+k] ? ls[p+k-1].y - ls[p+k].y : 99;
        const costo = Math.abs(centro - r.perno) + (dopo <= soglia ? 4 : 0);
        if (!meglio || costo < meglio.costo) meglio = { k, costo };
        if (centro < r.perno - 40) break;
      }
      if (!meglio) return;
      // una cella vuota: la prima linea libera e' molto piu' in basso del perno
      if (ls[p].y < r.perno - passo * 3 && Math.abs(ls[p].y - r.perno) > Math.abs(ls[p].y - righe[i+1].perno)) return;
      r.per[lunga] = ls.slice(p, p + meglio.k).map(l => l.t).join(' ');
      p += meglio.k;
    });
  }
  // le colonne corte (livello, requisiti, riassunto, fonte): ogni blocco al nome piu' vicino
  Object.keys(col).forEach(k => {
    if (k === 'nome' || k === lunga) return;
    blocchi(col[k]).forEach(b => { const r = allineaAlto ? vicinoA(b.cima) : vicino(b.y); if (r) r.per[k] = (r.per[k] ? r.per[k] + ' ' : '') + b.t; });
  });
  return righe.map(r => {
    const liv = String(r.per.livello || '').trim();
    const livTesto = /^\d+$/.test(liv) ? liv + ' livello' : liv;
    return { nome: r.nome.trim(), prereqGrezzo: [livTesto, r.per.req].filter(Boolean).join(', '),
             testo: r.per.testo || r.per.breve || '' };
  });
}

/* ─── Leggere ─────────────────────────────────────────────────────
   Un blocco per supplica: la prima riga è il nome, il resto è il testo.
   Si riconosce il nome perché è corto, senza punto finale, e quello che
   segue è una descrizione. */
/* ─── Spezzare le voci sapendo com'e' IMPAGINATA la pagina ───────
   Il testo nudo costringe a indovinare quale riga sia un nome: corta,
   senza punto finale, in maiuscola. Funziona finche' non incontri un
   nome lungo o una riga di testo breve. Le righe di `pdfRighe` portano
   con se' il corpo del carattere e la colonna: nei manuali il nome di
   una voce e' scritto piu' GRANDE del testo, e quello e' un segnale che
   non si sbaglia. L'euristica sul testo resta come ripiego per i PDF
   che usano un corpo solo. */
function suppSpezzaRighe(righe){
  if (!righe || !righe.length) return [];
  const corpo = corpoDelTesto(righe);
  const grande = (r) => (r.dim || 10) >= corpo + 0.6;   // titolo per come e' scritto
  /* Se la pagina distingue davvero i titoli col corpo del carattere, ci
     si fida SOLO di quello. Tenere acceso anche il ripiego sul testo
     faceva danni: «Ottieni competenza nell'abilita' Furtivita' e puoi»
     e' corta, comincia in maiuscolo e non finisce con un punto — cioe'
     somiglia a un nome, e si prendeva il posto della voce vera. Il
     ripiego serve ai PDF scritti con un corpo solo. */
  const quanteGrandi = righe.filter(grande).length;
  const tipografiaAffidabile = quanteGrandi >= 2 && quanteGrandi <= righe.length * 0.6;
  const voci = [];
  let corrente = null;
  const chiudi = () => { if (corrente && corrente.testo.trim()) voci.push(corrente); corrente = null; };

  righe.forEach(r => {
    const t = r.t.trim();
    if (!t) return;
    // i prerequisiti vanno controllati PRIMA: cominciano in maiuscolo e
    // sono corti, quindi somigliano a un nome
    const pre = /^(prerequisit[oi]|prerequisite)s?\s*[:.]?\s*(.+)$/i.exec(t);
    if (pre && corrente){
      corrente.prereqGrezzo = (corrente.prereqGrezzo ? corrente.prereqGrezzo + ', ' : '') + pre[2];
      return;
    }
    const parentesi = /^(.{3,60}?)\s*\(([^)]{3,90})\)\s*$/.exec(t);
    const nudoBreve = t.length <= 60 && !/[.:;]$/.test(t) && /^[A-ZÀ-Ú0-9]/.test(t) && t.split(/\s+/).length <= 7;
    const eTitolo = tipografiaAffidabile
      ? (grande(r) && t.length <= 80 && !/[.;]$/.test(t))
      : (!!parentesi || nudoBreve);
    if (eTitolo){
      chiudi();
      corrente = { nome: (parentesi ? parentesi[1] : t).trim(),
                   prereqGrezzo: parentesi ? parentesi[2] : '', testo: '' };
      return;
    }
    if (!corrente) return;
    /* una riga che finisce senza punto continua in quella dopo: si
       riattacca con uno spazio, non con un a capo */
    corrente.testo += (corrente.testo ? ' ' : '') + t;
  });
  chiudi();
  return voci
    .map(v => ({ ...v, testo: v.testo.replace(/\s+/g, ' ').trim() }))
    .filter(v => v.nome && v.testo.length > 12);
}
function suppSpezza(testo){
  const righe = String(testo || '').replace(/\r/g,'').split('\n').map(r => r.trim());
  const voci = [];
  let corrente = null;
  righe.forEach(r => {
    if (!r) return;
    /* «Prerequisito: 7° livello» è corto e comincia in maiuscolo: senza
       questo controllo PRIMA, veniva scambiato per il nome della
       supplica successiva e il prerequisito andava perso. */
    const pre = /^(prerequisit[oi]|prerequisite)s?\s*[:.]?\s*(.+)$/i.exec(r);
    if (pre && corrente){
      corrente.prereqGrezzo = (corrente.prereqGrezzo ? corrente.prereqGrezzo + ', ' : '') + pre[2];
      return;
    }
    const paretesi = /^(.{3,60}?)\s*\(([^)]{3,90})\)\s*$/.exec(r);
    const nudoBreve = r.length <= 60 && !/[.:;]$/.test(r) && /^[A-ZÀ-Ú]/.test(r) && r.split(/\s+/).length <= 7;
    if (paretesi || nudoBreve){
      if (corrente && corrente.testo.trim()) voci.push(corrente);
      corrente = { nome: (paretesi ? paretesi[1] : r).trim(),
                   prereqGrezzo: paretesi ? paretesi[2] : '', testo: '' };
      return;
    }
    if (!corrente) return;
    corrente.testo += (corrente.testo ? ' ' : '') + r;
  });
  if (corrente && corrente.testo.trim()) voci.push(corrente);
  return voci;
}
/* I prerequisiti scritti a parole diventano condizioni vere. */
function leggiPrereq(grezzo){
  const t = norm(grezzo || '');
  const req = {};
  const lv = /(\d+)\s*(°|o|th|st|nd|rd)?\s*(livello|level)/.exec(t);
  if (lv) req.livello = Number(lv[1]);
  if (/catena|chain/.test(t)) req.patto = 'chain';
  else if (/lama|blade/.test(t)) req.patto = 'blade';
  else if (/tomo|tome|libro/.test(t)) req.patto = 'tome';
  if (/raggio occulto|eldritch blast/.test(t)) req.trucchetto = 'eldritch-blast';
  return req;
}
/* Il pezzo che conta: capire cosa FA, dal testo. */
function proponiEffetti(testo){
  const t = norm(testo || '');
  const eff = [];
  /* «puoi lanciare X a volontà» / «una volta per riposo lungo» */
  const quando = /a volonta|at will/.test(t) ? 'volonta'
    : /riposo lungo|long rest/.test(t) ? 'riposoLungo'
    : /riposo breve|short rest/.test(t) ? 'riposoBreve' : null;
  if (quando && typeof SRD_SPELLS !== 'undefined'){
    /* si cerca il nome di un incantesimo dentro la frase, il più lungo
       che combacia: «armatura magica» prima di «armatura» */
    /* in DUE lingue: le raccolte che girano sono quasi sempre in
       inglese, e cercando solo il nome italiano non si riconosceva nulla */
    const trovati = SRD_SPELLS
      .flatMap(s => [norm(spellName(s)), norm(s.name || '')]
        .filter((n, i, a) => n && a.indexOf(n) === i)
        .map(n => ({ s, n })))
      .filter(x => x.n.length > 4 && t.includes(x.n))
      .sort((a,b) => b.n.length - a.n.length);
    if (trovati.length){
      const e = { tipo:'incantesimo', id: trovati[0].s.id, quando };
      if (/su di te|su te stesso|on yourself|on you/.test(t)) e.soloSuDiTe = true;
      eff.push(e);
    }
  }
  /* «aggiungi il modificatore di Carisma ai danni» */
  if (/(aggiung|add).{0,40}(carisma|charisma).{0,30}(danni|damage)/.test(t)
      || /(danni|damage).{0,30}(carisma|charisma)/.test(t)){
    const e = { tipo:'danno', a:'eldritch-blast', agg:'cha' };
    if (/arma del patto|pact weapon/.test(t)) e.a = 'arma-del-patto';
    const td = /(necrotici|necrotic)/.test(t) ? 'necrotici' : '';
    if (td) e.tipoDanno = td;
    eff.push(e);
  }
  /* gittata */
  /* i testi inglesi parlano in PIEDI: 300 feet non sono 300 metri */
  const inMetri = (n, u) => /feet|foot|ft|piedi/.test(u) ? Math.round(n * 0.3 * 2) / 2 : n;
  const g = /(gittata|range).{0,60}?(\d{2,3})\s*(metri|m\b|feet|foot|ft\b|piedi)/.exec(t);
  if (g) eff.push({ tipo:'gittata', a:'eldritch-blast', metri: inMetri(Number(g[2]), g[3]) });
  /* spinta */
  const sp = /(spinger|push).{0,40}?(\d{1,3})\s*(metri|m\b|feet|foot|ft\b|piedi)/.exec(t);
  if (sp) eff.push({ tipo:'raggi', a:'eldritch-blast', spinta: inMetri(Number(sp[2]), sp[3]) });
  /* competenze */
  if (typeof SKILLS !== 'undefined' && /competenz|proficien/.test(t)){
    const EN = { deception:'deception', persuasion:'persuasion', intimidation:'intimidation',
      perception:'perception', stealth:'stealth', arcana:'arcana', investigation:'investigation',
      insight:'insight', nature:'nature', religion:'religion', survival:'survival',
      athletics:'athletics', acrobatics:'acrobatics', history:'history', medicine:'medicine',
      performance:'performance', sleightOfHand:'sleight of hand', animalHandling:'animal handling' };
    const ab = SKILLS.filter(s => t.includes(norm(s.label)) || (EN[s.key] && t.includes(EN[s.key]))).map(s => s.key);
    if (ab.length) eff.push({ tipo:'competenza', abilita: ab });
  }
  /* sensi */
  if (/scurovision|darkvision|vedi nell|see in (the )?dark|vedere l'invisibil|see invisib/.test(t))
    eff.push({ tipo:'senso', testo: 'Vista particolare — controlla il testo' });

  if (!eff.length) eff.push({ tipo:'nota', testo:'' });
  return eff;
}
function suppLeggiTesto(){
  const el = document.getElementById('supp-testo');
  const testo = (el && el.value) || suppDraft.testoGrezzo || '';
  if (!testo.trim()){ toast('Incolla il testo, o scegli un file'); return; }
  suppAnalizza(testo);
}
function suppAnalizza(testo){
  const grezze = suppSpezza(testo);
  if (!grezze.length){ toast('⚠ Non ho riconosciuto nessuna supplica in questo testo'); return; }
  suppApplica(grezze, 'testo');
}
function suppApplica(grezze, come){
  const gia = new Set(tutteLeSuppliche().map(s => norm(s.nome)));
  suppDraft.voci = grezze.map(v => ({
    nome: v.nome,
    testo: v.testo,
    req: leggiPrereq(v.prereqGrezzo + ' ' + v.testo.slice(0, 120)),
    effetti: proponiEffetti(v.testo),
    tenere: !gia.has(norm(v.nome)),
  }));
  const doppie = suppDraft.voci.filter(v => !v.tenere).length;
  toast('Trovate ' + suppDraft.voci.length + (come === 'tabella' ? ' (tabella)' : '') + (doppie ? ' · ' + doppie + ' le hai già' : ''));
  renderModalRoot();
}
async function suppUsaFile(input){
  const f = input.files && input.files[0];
  input.value = '';
  if (!f) return;
  try {
    if (/\.pdf$/i.test(f.name) || /pdf/i.test(f.type||'')){
      toast('Leggo il PDF…');
      const buf = await f.arrayBuffer();
      /* La tabella si riconosce dalle coordinate, quindi serve ancora la
         lettura per righe grezze; la prosa passa dal lettore che CONTA
         le colonne, se no su un manuale a due colonne le voci di
         sinistra e di destra si incollano fra loro. */
      const lib = await loadPdfJs();
      const pdf = await lib.getDocument({ data: new Uint8Array(bufferCopia(buf)) }).promise;
      const pagine = [];
      for (let i = 1; i <= pdf.numPages; i++){
        const tc = await (await pdf.getPage(i)).getTextContent();
        pagine.push(tc.items.map(it => ({ t: String(it.str||'').trim(), x: it.transform[4], y: it.transform[5] })).filter(it => it.t));
      }
      try { pdf.destroy(); } catch(e){}
      const daTab = suppDaTabella(pagine);
      if (daTab.length){ suppApplica(daTab, 'tabella'); return; }

      const { righe } = await pdfRighe(buf);
      suppApplica(suppSpezzaRighe(righe), 'prosa');
    } else {
      suppAnalizza(await f.text());
    }
  } catch(e){
    console.error('Lettura suppliche non riuscita', e);
    toast('⚠ Non sono riuscito a leggere il file');
  }
}
/* ARCHIVIATA: raggruppava i pezzi per coordinata Y su TUTTA la pagina,
   quindi su un manuale a due colonne incollava la riga di sinistra con
   quella di destra — ed e' cosi' che uscivano nomi come «Sguardo del
   Nulla Passo di Cenere». Adesso si usa pdfRighe(), che le colonne le
   conta. La lascio scritta qui come promemoria di cosa NON rifare. */
function suppSalva(){
  const tenute = suppDraft.voci.filter(v => v.tenere);
  if (!tenute.length){ toast('Non ne hai segnata nessuna da tenere'); return; }
  state.suppliche = state.suppliche || [];
  const nuove = tenute.map(v => ({
    id: 'supp-' + uid(),
    nome: v.nome, testo: v.testo,
    req: v.req && Object.keys(v.req).length ? v.req : null,
    effetti: (v.effetti || []).filter(e => e.tipo !== 'nota' || e.testo),
    mia: true, createdAt: Date.now(), updatedAt: Date.now(),
  }));
  nuove.forEach(s => state.suppliche.push(s));
  saveLocalOra();
  if (typeof fsSetMany === 'function') fsSetMany('suppliche', nuove);
  toast('🕯 ' + nuove.length + ' ' + (nuove.length===1?'supplica aggiunta':'suppliche aggiunte'));
  const per = suppDraft.per;
  suppDraft = null;
  if (per) apriSuppliche(per); else closeModal();
}

/* ─── L'ingranaggio: correggere l'effetto proposto ───────────────── */
let suppEffPer = null;
function suppEffetto(i){
  suppEffPer = i;
  openModal({ render: () => suppEffettoHTML(i) });
}
function suppEffettoHTML(i){
  const v = suppDraft.voci[i];
  const e = (v.effetti && v.effetti[0]) || { tipo:'nota', testo:'' };
  const TIPI = [
    ['incantesimo','Ti dà un incantesimo'],
    ['danno','Aggiunge una caratteristica ai danni'],
    ['gittata','Cambia la gittata'],
    ['raggi','Spinge il bersaglio'],
    ['competenza','Dà competenza in abilità'],
    ['senso','Ti fa vedere qualcosa'],
    ['nota','Solo un promemoria in scheda'],
  ];
  return modalShell('⚙ ' + v.nome, `
    <div class="field"><label>Che tipo di effetto è</label>
      <select onchange="suppEffTipo(${i}, this.value)">
        ${TIPI.map(([k,l])=>`<option value="${k}" ${e.tipo===k?'selected':''}>${l}</option>`).join('')}
      </select>
    </div>
    ${e.tipo === 'incantesimo' ? `
      <div class="field"><label>Quale incantesimo</label>
        <input value="${attr(e.id||'')}" placeholder="es. mage-armor"
               oninput="suppEffCampo(${i},'id',this.value)">
        <div class="muted" style="font-size:.72rem; margin-top:4px">
          ${(()=>{ const s = spellByRef({id:e.id,source:'srd'}); return s ? '✓ ' + escapeHtml(spellName(s)) : '⚠ nessun incantesimo con questo nome'; })()}
        </div>
      </div>
      <div class="field"><label>Quando puoi lanciarlo</label>
        <select onchange="suppEffCampo(${i},'quando',this.value)">
          <option value="volonta" ${e.quando==='volonta'?'selected':''}>A volontà</option>
          <option value="riposoLungo" ${e.quando==='riposoLungo'?'selected':''}>Una volta per riposo lungo</option>
          <option value="riposoBreve" ${e.quando==='riposoBreve'?'selected':''}>Una volta per riposo breve</option>
        </select>
      </div>` : ''}
    ${e.tipo === 'danno' ? `
      <div class="field"><label>Cosa colpisce</label>
        <select onchange="suppEffCampo(${i},'a',this.value)">
          <option value="eldritch-blast" ${e.a==='eldritch-blast'?'selected':''}>Raggio occulto</option>
          <option value="arma-del-patto" ${e.a==='arma-del-patto'?'selected':''}>Arma del patto</option>
        </select>
      </div>` : ''}
    ${e.tipo === 'gittata' ? `<div class="field"><label>Metri</label>
      <input type="number" value="${attr(e.metri||90)}" oninput="suppEffCampo(${i},'metri',Number(this.value))"></div>` : ''}
    ${e.tipo === 'raggi' ? `<div class="field"><label>Spinta in metri</label>
      <input type="number" value="${attr(e.spinta||3)}" oninput="suppEffCampo(${i},'spinta',Number(this.value))"></div>` : ''}
    ${e.tipo === 'competenza' ? `<div class="field"><label>Abilità</label>
      <div class="chip-row">${SKILLS.map(s=>`<button class="chip ${(e.abilita||[]).includes(s.key)?'active':''}"
        onclick="suppEffAbilita(${i},'${s.key}')">${escapeHtml(s.label)}</button>`).join('')}</div></div>` : ''}
    ${(e.tipo === 'senso' || e.tipo === 'nota') ? `<div class="field"><label>Cosa scrivo in scheda</label>
      <input value="${attr(e.testo||'')}" oninput="suppEffCampo(${i},'testo',this.value)"></div>` : ''}
    <button class="btn btn-primary btn-block" style="margin-top:10px" onclick="closeModal()">Fatto</button>
  `);
}
function suppEffTipo(i, tipo){
  const v = suppDraft.voci[i];
  const base = { tipo };
  if (tipo === 'incantesimo'){ base.id = ''; base.quando = 'volonta'; }
  if (tipo === 'danno'){ base.a = 'eldritch-blast'; base.agg = 'cha'; }
  if (tipo === 'gittata') base.metri = 90;
  if (tipo === 'raggi') base.spinta = 3;
  if (tipo === 'competenza') base.abilita = [];
  if (tipo === 'senso' || tipo === 'nota') base.testo = '';
  v.effetti = [base];
  renderModalRoot();
}
function suppEffCampo(i, campo, valore){
  const e = suppDraft.voci[i].effetti[0];
  e[campo] = valore;
  if (campo === 'id') renderModalRoot();
}
function suppEffAbilita(i, key){
  const e = suppDraft.voci[i].effetti[0];
  e.abilita = e.abilita || [];
  const j = e.abilita.indexOf(key);
  if (j >= 0) e.abilita.splice(j,1); else e.abilita.push(key);
  renderModalRoot();
}
