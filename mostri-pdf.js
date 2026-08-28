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

function openMostriPdf(){
  mpStato = { busy:false, trovati:null, scelti:new Set(), pag:0, tot:0, file:0, file_n:0 };
  openModal({ render: mostriPdfHTML });
}
function mostriPdfHTML(){
  const s = mpStato || {};
  if (!s.trovati) return modalShell('🐉 Leggi i mostri dal tuo manuale', `
    <p class="muted" style="margin-bottom:14px">
      Carica un PDF o un file di testo con i <b>blocchi statistica</b>: l'app cerca nome, taglia,
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
    <input type="file" id="mp-file" multiple accept=".txt,text/plain,application/pdf,.pdf,.md" style="display:none" onchange="mpFile(this)">
    <div class="field" style="margin-top:12px">
      <label>…oppure incolla qui</label>
      <textarea id="mp-testo" style="min-height:120px; font-family:var(--font-ui); font-size:.8rem" placeholder="Incolla il blocco statistica di un mostro."></textarea>
    </div>
    <div class="spell-source-note">Carica solo materiale di cui hai i diritti: i tuoi appunti o i manuali che possiedi. Resta sul tuo account.</div>`);

  const n = s.scelti.size;
  const riga = (m) => {
    const on = s.scelti.has(m.id);
    return `<button class="attack-row" style="width:100%; text-align:left; ${on?'border-color:var(--gold)':''}" onclick="mpToggle('${jsStr(m.id)}')">
      <span style="flex-shrink:0; margin-right:10px; font-size:1.05rem">${on?'☑️':'⬜'}</span>
      <span class="attack-main">
        <span class="attack-name">🐉 ${escapeHtml(m.it)}</span>
        <span class="muted" style="font-size:.73rem; display:block">${escapeHtml(m.sz)} ${escapeHtml(m.t)} · GS ${escapeHtml(m.cr)} · CA ${m.ac} · ${m.hp} PF${m.act.length?' · '+m.act.length+' azioni':''}</span>
      </span>
    </button>`;
  };
  return modalShell('🐉 Cosa ho trovato', `
    <div class="card" style="margin-bottom:12px">
      <div class="row-between"><span class="muted">Riconosciuti</span><b>${s.trovati.length}</b></div>
      <div class="row-between" style="margin-top:4px"><span class="muted">Selezionati</span><b style="color:var(--gold)">${n}</b></div>
    </div>
    ${s.trovati.length ? `<div class="chip-row" style="margin-bottom:8px">
      <button class="chip" onclick="mpTutti(true)">Scegli tutti</button>
      <button class="chip" onclick="mpTutti(false)">Nessuno</button>
    </div>
    <div class="list-gap">${s.trovati.slice(0,200).map(riga).join('')}</div>
    ${s.trovati.length>200?`<p class="muted" style="font-size:.73rem; margin-top:8px">…e altri ${s.trovati.length-200}: usa «Scegli tutti».</p>`:''}`
    : emptyState('🤔','Non ho riconosciuto nessun blocco statistica. Serve il formato standard, con CA e punti ferita.')}
    <div class="btn-row" style="margin-top:14px">
      <button class="btn btn-ghost" onclick="openMostriPdf()">← Ricomincia</button>
      <button class="btn btn-primary" ${n?'':'disabled'} onclick="mpConferma()">Aggiungi ${n||''}</button>
    </div>
    <div class="muted" style="font-size:.73rem; margin-top:10px">Quello che l'app riconosce è una bozza: apri ogni mostro dal bestiario e sistemalo se serve.</div>`);
}
function mpToggle(id){ if (mpStato.scelti.has(id)) mpStato.scelti.delete(id); else mpStato.scelti.add(id); renderModalRoot(); }
function mpTutti(on){ mpStato.trovati.forEach(m => on ? mpStato.scelti.add(m.id) : mpStato.scelti.delete(m.id)); renderModalRoot(); }
function mpAnalizza(testo){
  if (!String(testo||'').trim()){ mpStato.busy = false; renderModalRoot(); toast('Non c’è niente da leggere'); return; }
  const trovati = mpScan(testo);
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
  state.npcs = state.npcs || [];
  scelti.forEach(m => {
    const v = Object.assign({}, m, { name: m.it, updatedAt: Date.now() });
    state.npcs.push(v);
    fsSet('npcs', v);
  });
  saveLocal();
  mpStato = null;
  closeModal(); render();
  toast('🐉 ' + scelti.length + (scelti.length===1?' mostro nel bestiario':' mostri nel bestiario'));
}
