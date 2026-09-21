/* TwentyNation — cestino e salute dei dati
   Niente di quello che elimini sparisce davvero per trenta giorni:
   resta qui, su questo dispositivo, e si rimette a posto con un tocco.
   La seconda parte dice a colpo d'occhio cosa è al sicuro sull'account
   e cosa esiste solo qui. */

const CESTINO_KEY = 'grimorio-cestino';
const CESTINO_GIORNI = 30;
const CESTINO_MAX = 200;

const CESTINO_TIPI = {
  characters:  { label:'Personaggio', icona:'🎭' },
  npcs:        { label:'PNG',         icona:'🐉' },
  customSpells:{ label:'Incantesimo', icona:'📖' },
  homebrew:    { label:'Aggiunta',    icona:'📚' },
  journal:     { label:'Voce del diario', icona:'📓' },
};

let cestino = [];
function caricaCestino(){
  try { cestino = JSON.parse(localStorage.getItem(CESTINO_KEY) || '[]') || []; }
  catch(e){ cestino = []; }
  const limite = Date.now() - CESTINO_GIORNI * 24 * 3600 * 1000;
  const prima = cestino.length;
  cestino = cestino.filter(v => v && v.at && v.at > limite);
  if (cestino.length !== prima) salvaCestino();
}
function salvaCestino(){
  try { localStorage.setItem(CESTINO_KEY, JSON.stringify(cestino.slice(0, CESTINO_MAX))); return true; }
  catch(e){ console.warn('Cestino non salvabile', e); return false; }
}
/* Chiamata PRIMA di togliere qualcosa: conserva una copia. */
function nelCestino(collezione, obj){
  if (!obj || !obj.id) return;
  try {
    const copia = JSON.parse(JSON.stringify(obj));
    // il ritratto è un'immagine intera dentro il testo: nel cestino
    // riempirebbe la memoria del telefono e farebbe fallire i salvataggi
    const senzaRitratto = !!copia.portrait;
    delete copia.portrait;
    cestino.unshift({
      chiave: uid(), id: obj.id, collezione, at: Date.now(), senzaRitratto,
      nome: obj.name || obj.titolo || obj.title || '(senza nome)',
      copia,
    });
    cestino = cestino.slice(0, CESTINO_MAX);
    if (!salvaCestino()){
      // niente spazio: meglio dirlo che promettere un recupero che non c'è
      cestino.shift();
      toast('⚠ Memoria piena: non ho potuto conservare la copia');
    }
  } catch(e){ console.warn('Non riesco a conservare la copia', e); }
}
/* I due pulsanti passavano `v.id`, ma qui si cerca per `v.chiave` — e la
   chiave c'e' sempre, quindi il confronto non andava mai a buon fine e il
   tasto sembrava morto. La chiave e' separata dall'id apposta: lo stesso
   oggetto puo' finire nel cestino piu' di una volta, quindi l'id non
   basta a distinguere le voci. E se una voce non si trova lo si dice,
   invece di non fare niente in silenzio. */
function ripristinaDalCestino(chiave){
  const i = cestino.findIndex(v => (v.chiave || v.id) === chiave);
  if (i < 0){ toast('⚠ Non trovo più questa voce nel cestino'); renderModalRoot(); return; }
  const v = cestino[i];
  const coll = v.collezione;
  state[coll] = state[coll] || [];
  if (state[coll].some(x => x && x.id === v.id)){
    toast('C\'è già qualcosa con questo identificativo');
    return;
  }
  let obj = JSON.parse(JSON.stringify(v.copia));
  delete obj.syncedAt;                 // deve risalire come cosa nuova
  obj.updatedAt = Date.now();
  /* Una copia messa nel cestino da una versione vecchia dell'app torna
     su con la forma di allora: va normalizzata come si fa con quella di
     un backup, se no la scheda si apre e si rompe. */
  if (coll === 'characters' && typeof safeMigrate === 'function'){
    const m = safeMigrate(obj);
    if (!m){ toast('⚠ Questa copia è illeggibile, non riesco a rimetterla a posto'); return; }
    obj = m;
  }
  state[coll].push(obj);
  cestino.splice(i, 1); salvaCestino();
  saveLocal();
  if (typeof fsSet === 'function') fsSet(coll, obj);
  renderModalRoot(); render();
  toast('↩︎ «' + (v.nome || '') + '» è tornato al suo posto');
}
function buttaDefinitivamente(chiave){
  const v = cestino.find(x => (x.chiave || x.id) === chiave);
  if (!v){ toast('⚠ Non trovo più questa voce nel cestino'); renderModalRoot(); return; }
  confirmDialog('Eliminare per sempre?',
    '«' + ((v && v.nome) || '') + '» non sarà più recuperabile.',
    () => {
      cestino = cestino.filter(x => (x.chiave || x.id) !== chiave);
      salvaCestino(); renderModalRoot();
      toast('Eliminato definitivamente');
    }, 'Elimina');
}
function svuotaCestino(){
  if (!cestino.length) return;
  const n = cestino.length;
  confirmDialog('Svuotare il cestino?',
    n + (n===1?' cosa non sarà più recuperabile.':' cose non saranno più recuperabili.'),
    () => { cestino = []; salvaCestino(); renderModalRoot(); toast('Cestino svuotato'); }, 'Svuota');
}
function quantoNelCestino(){ return cestino.length; }

function openCestino(){ openModal({ render: cestinoHTML }); }
function cestinoHTML(){
  const giorniRimasti = (at) => Math.max(0, CESTINO_GIORNI - Math.floor((Date.now()-at)/(24*3600*1000)));
  const inner = `
    <p class="muted" style="margin-bottom:14px">
      Quello che elimini resta qui <b>${CESTINO_GIORNI} giorni</b> prima di sparire davvero.
      Il cestino sta <b>su questo dispositivo</b>: non occupa spazio sul tuo account e non lo vede nessun altro.
    </p>
    ${cestino.length ? `
    <div class="row-between" style="margin-bottom:10px; gap:10px">
      <span class="muted" style="font-size:.8rem"><b>${cestino.length}</b> ${cestino.length===1?'cosa':'cose'} nel cestino</span>
      <button class="btn btn-sm btn-ghost" style="min-width:auto; padding:7px 12px; color:var(--garnet-bright); border-color:var(--garnet-bright)"
              onclick="svuotaCestino()">${ic('cestino')} Svuota tutto</button>
    </div>
    <div class="list-gap">${cestino.map(v => {
      const k = CESTINO_TIPI[v.collezione] || { label:v.collezione, icona:'🗑' };
      const g = giorniRimasti(v.at);
      return `<div class="attack-row">
        <div class="attack-main" style="pointer-events:none">
          <div class="attack-name">${k.icona} ${escapeHtml(v.nome)}</div>
          <div class="muted" style="font-size:.72rem">${k.label} · ancora ${g} ${g===1?'giorno':'giorni'}${v.senzaRitratto?' · senza ritratto':''}</div>
        </div>
        <button class="btn btn-sm btn-gold" style="min-width:auto; padding:7px 11px" onclick="ripristinaDalCestino('${jsStr(v.chiave || v.id)}')">Ripristina</button>
        <button class="btn-icon" style="width:36px;height:36px;font-size:.8rem" title="Elimina per sempre" onclick="buttaDefinitivamente('${jsStr(v.chiave || v.id)}')">✕</button>
      </div>`;
    }).join('')}</div>
    <button class="btn btn-ghost btn-block btn-sm" style="margin-top:12px; color:var(--garnet-bright)" onclick="svuotaCestino()">${ic('cestino')} Svuota tutto il cestino</button>`
    : emptyState(ic('cestino'),'Il cestino è vuoto. Quello che elimini finisce qui, e da qui si recupera.')}`;
  return modalShell('🗑 Cestino', inner);
}

/* ─── Salute dei dati ─── */
function saluteDati(){
  const righe = [];
  Object.keys(CESTINO_TIPI).forEach(coll => {
    const lista = state[coll] || [];
    if (!lista.length) return;
    const suAccount = lista.filter(x => x && x.syncedAt).length;
    righe.push({ coll, label: CESTINO_TIPI[coll].label, icona: CESTINO_TIPI[coll].icona,
                 totale: lista.length, suAccount, soloQui: lista.length - suAccount });
  });
  return righe;
}
function openSaluteDati(){ openModal({ render: saluteHTML }); }

/* Quanto spazio resta. I browser danno all'incirca 5 MB per sito
   all'archivio locale: con tremila creature nel bestiario si arriva a
   due, e conviene vederlo prima di riempirlo, non dopo. */
const SPAZIO_STIMATO = 5 * 1024 * 1024;
function spazioLocale(){
  let usati = 0;
  try {
    // il conto vero è su tutto il sito, non solo sull'archivio principale:
    // ci sono anche cestino, cassetti di altri account e cache varie
    for (let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      usati += (k.length + (localStorage.getItem(k) || '').length) * 2;
    }
  } catch(e){ usati = (typeof pesoArchivioLocale === 'function' ? pesoArchivioLocale() : 0) * 2; }
  const perc = Math.min(100, Math.round(100 * usati / SPAZIO_STIMATO));
  return { usati, perc, mb: (usati / 1048576).toFixed(1) };
}
/* ─── Chi si mangia lo spazio ───
   Il totale da solo non serve: «4,3 MB su 5» non dice cosa togliere.
   Qui si guarda dentro, collezione per collezione e chiave per chiave,
   e si mette in fila il piu' pesante per primo. Due sorprendono sempre:
   il CESTINO (tiene 30 giorni tutto quello che hai cancellato) e gli
   ARCHIVI DI ALTRI ACCOUNT, messi da parte a un cambio account e mai
   piu' toccati da nessuno. */
function pesoTesto(x){
  try { return (typeof x === 'string' ? x : JSON.stringify(x) || '').length * 2; }
  catch(e){ return 0; }
}
const SPAZIO_ETICHETTE = { characters:'Personaggi', npcs:'Bestiario', customSpells:'Incantesimi tuoi',
  spellTags:'Etichette incantesimi', homebrew:'Contenuti tuoi', journal:'Diario',
  suppliche:'Suppliche', incontri:'Incontri' };
function dettaglioSpazio(){
  const voci = [];
  const agg = (etichetta, byte, nota, azione) => { if (byte > 0) voci.push({ etichetta, byte, nota: nota||'', azione: azione||'' }); };
  let archivio = null;
  try { archivio = (typeof leggiArchivio === 'function') ? leggiArchivio() : null; } catch(e){}
  const sistemi = (archivio && archivio.sistemi) || {};
  const piuDiUno = Object.keys(sistemi).length > 1;
  Object.keys(sistemi).forEach(id => {
    const c = sistemi[id] || {};
    const suff = piuDiUno ? ' · ' + ((typeof sistemaDi === 'function') ? sistemaDi(id).nome : id) : '';
    (typeof COLLEZIONI !== 'undefined' ? COLLEZIONI : Object.keys(c)).forEach(k => {
      const arr = Array.isArray(c[k]) ? c[k] : [];
      if (!arr.length) return;
      const byte = pesoTesto(arr);
      if (k === 'characters'){
        /* I ritratti sono foto dentro al testo: contarli a parte, se no
           «Personaggi: 1,2 MB» sembra assurdo e non si capisce perche'. */
        const conFoto = arr.filter(x => x && x.portrait);
        const ritratti = conFoto.reduce((a,x) => a + pesoTesto(x.portrait), 0);
        agg('Personaggi' + suff, byte - ritratti, arr.length + ' ' + pluralize(arr.length,'scheda','schede'));
        agg('Ritratti dei personaggi' + suff, ritratti, conFoto.length + ' foto', 'ritratti');
      } else {
        agg((SPAZIO_ETICHETTE[k] || k) + suff, byte, arr.length + ' ' + pluralize(arr.length,'voce','voci'),
            k === 'npcs' ? 'bestiario' : (k === 'homebrew' ? 'contenuti' : ''));
      }
    });
  });
  let cest = 0, altri = 0, altriN = 0, resto = 0;
  const KA = (typeof LS_KEY !== 'undefined') ? LS_KEY : 'grimorio-data-v1';
  try {
    for (let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      const peso = (k.length + (localStorage.getItem(k) || '').length) * 2;
      if (k === CESTINO_KEY) cest += peso;
      else if (k === KA) { /* gia' contato voce per voce qui sopra */ }
      else if (k.indexOf(KA + '--') === 0){ altri += peso; altriN++; }
      else resto += peso;
    }
  } catch(e){}
  const nC = (typeof quantoNelCestino === 'function') ? quantoNelCestino() : 0;
  agg('Cestino', cest, nC + ' ' + pluralize(nC,'cosa buttata','cose buttate') + ' · si tengono 30 giorni', 'cestino');
  agg('Archivi di altri account', altri,
      altriN + ' ' + pluralize(altriN,'archivio messo da parte','archivi messi da parte'), 'altriaccount');
  agg('Impostazioni e cache', resto, '');
  voci.sort((a,b) => b.byte - a.byte);
  return voci;
}
function kbMb(byte){
  return byte >= 1048576 ? (byte/1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(byte/1024)) + ' KB';
}
function confirmViaAltriAccount(){
  const KA = (typeof LS_KEY !== 'undefined') ? LS_KEY : 'grimorio-data-v1';
  const chiavi = [];
  try { for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i);
    if (k.indexOf(KA + '--') === 0) chiavi.push(k); } } catch(e){}
  if (!chiavi.length){ toast('Non ce ne sono'); return; }
  confirmDialog('Togliere ' + chiavi.length + ' ' + pluralize(chiavi.length,'archivio','archivi') + ' di altri account?',
    'Sono copie messe da parte quando su questo dispositivo si e\' cambiato account. Chi le ha create le ritrova sul proprio account: qui non servono, e da qui non si recuperano.',
    () => { chiavi.forEach(k => { try { localStorage.removeItem(k); } catch(e){} });
            render(); toast('Spazio liberato'); openSaluteDati(); }, 'Togli');
}
function confirmViaRitratti(){
  const con = (state.characters || []).filter(c => c && c.portrait);
  if (!con.length){ toast('Nessun ritratto da togliere'); return; }
  confirmDialog('Togliere ' + con.length + ' ' + pluralize(con.length,'ritratto','ritratti') + '?',
    'Le schede restano intere: sparisce solo la foto e torna il simbolo. Le foto originali le hai ancora tu.',
    () => {
      con.forEach(c => { c.portrait = ''; if (typeof scheduleSave === 'function') scheduleSave('characters', c); });
      if (typeof saveLocalOra === 'function') saveLocalOra();
      render(); toast(con.length + ' ' + pluralize(con.length,'ritratto tolto','ritratti tolti'));
      openSaluteDati();
    }, 'Togli le foto');
}
function spazioAzione(quale){
  if (quale === 'cestino'){ closeModal(); svuotaCestino(); return; }
  if (quale === 'altriaccount'){ confirmViaAltriAccount(); return; }
  if (quale === 'ritratti'){ closeModal(); confirmViaRitratti(); return; }
  if (quale === 'contenuti' && typeof confirmSvuotaHomebrew === 'function'){ closeModal(); confirmSvuotaHomebrew(''); return; }
  if (quale === 'bestiario' && typeof confirmSvuotaBestiario === 'function'){ closeModal(); confirmSvuotaBestiario(); return; }
}
function spazioHTML(){
  const sp = spazioLocale();
  const colore = sp.perc >= 85 ? 'var(--danger, var(--warn))' : sp.perc >= 60 ? 'var(--warn)' : 'var(--gold)';
  return `<div class="card" style="margin-bottom:12px">
    <div class="row-between"><b style="font-size:.86rem">${ic('salva')} Spazio sul dispositivo</b><b style="color:${colore}">${sp.mb} MB</b></div>
    <div class="barra" style="margin-top:10px"><div class="barra-piena" style="width:${Math.max(2,sp.perc)}%; background:${colore}"></div></div>
    <p class="muted" style="margin-top:8px; font-size:.76rem">
      ${sp.perc >= 85
        ? 'Sei quasi al limite: le prossime aggiunte potrebbero non entrare. Qui sotto c\'è cosa occupa cosa, dal più pesante.'
        : sp.perc >= 60
          ? 'Ancora spazio, ma non tantissimo. Qui sotto c\'è cosa occupa cosa.'
          : 'Spazio in abbondanza.'}
    </p>
    ${(()=>{ const voci = dettaglioSpazio(); if (!voci.length) return '';
      return `<div class="divider" style="margin:14px 0 10px"><span class="flourish">❧</span><span>Cosa occupa cosa</span></div>
        <div class="list-gap">${voci.map(v => `
          <div class="spazio-riga">
            <span class="spazio-corpo">
              <span class="spazio-nome">${escapeHtml(v.etichetta)}</span>
              ${v.nota ? `<span class="spazio-nota">${escapeHtml(v.nota)}</span>` : ''}
            </span>
            <span class="spazio-peso">${kbMb(v.byte)}</span>
            ${v.azione ? `<button class="btn-icon" style="width:34px;height:34px;font-size:.78rem" title="Libera questo spazio" onclick="spazioAzione('${v.azione}')">${ic('cestino')}</button>` : ''}
          </div>`).join('')}</div>`; })()}
  </div>`;
}
function saluteHTML(){
  const righe = saluteDati();
  const soloQui = righe.reduce((a,r)=>a+r.soloQui, 0);
  const collegato = (typeof currentUser !== 'undefined') && !!currentUser;
  const inner = `
    <div class="card" style="margin-bottom:12px; ${soloQui?'border-color:var(--warn)':'border-color:var(--good)'}">
      <div class="card-title">${!collegato ? ic('offline') + ' Non sei collegato'
        : soloQui ? ic('avviso') + ' Qualcosa non è ancora salito' : '✅ È tutto sul tuo account'}</div>
      <p class="muted" style="margin-top:6px; font-size:.8rem">
        ${!collegato
          ? 'Senza account tutto vive solo su questo dispositivo: se lo perdi o svuoti i dati del browser, non si recupera. Collegati con Google per metterlo al sicuro.'
          : soloQui ? ('Ci sono <b>' + soloQui + '</b> cose che esistono solo qui. Di solito salgono da sole appena c’è connessione: se restano, esporta un backup e dimmelo.')
                    : 'Ogni cosa ha una copia sul tuo account: la ritrovi da qualsiasi dispositivo.'}
      </p>
    </div>
    ${spazioHTML()}
    ${righe.length ? `<div class="list-gap">${righe.map(r => `
      <div class="attack-row">
        <div class="attack-main" style="pointer-events:none">
          <div class="attack-name">${r.icona} ${r.label}</div>
          <div class="muted" style="font-size:.72rem">${r.totale} in tutto · ${r.suAccount} sull'account${r.soloQui?' · <b style="color:var(--warn)">'+r.soloQui+' solo qui</b>':''}</div>
        </div>
      </div>`).join('')}</div>` : emptyState(ic('vuoto'),'Non hai ancora niente da mettere al sicuro.')}
    ${(()=>{ if (typeof quandoUltimoBackup !== 'function') return '';
      const g = giorniDaBackup(), serve = (typeof serveUnBackup === 'function') && serveUnBackup();
      return `<div class="card" style="margin-top:12px; ${serve?'border-color:var(--warn)':''}">
        <div class="row-between"><b style="font-size:.86rem">${ic('salva')} Ultimo backup</b>
          <b style="color:${serve?'var(--warn)':'var(--good)'}">${escapeHtml(quandoUltimoBackup())}</b></div>
        <p class="muted" style="margin-top:6px; font-size:.76rem">
          ${g === null
            ? 'Non ne hai mai esportato uno. È l\'unica copia che resta tua anche senza account e senza questo dispositivo.'
            : (serve ? 'È passato più di un mese. Un backup costa due tocchi e ti evita la giornata storta.'
                     : 'Sei a posto. Rifallo quando aggiungi qualcosa di importante.')}
        </p>
      </div>`; })()}
    <div class="btn-row" style="margin-top:14px">
      <button class="btn btn-gold" onclick="closeModalAll(); exportData()">${ic('scarica')} Esporta un backup</button>
      <button class="btn btn-ghost" onclick="closeModalAll(); openCestino()">${ic('cestino')} Cestino${quantoNelCestino()?' ('+quantoNelCestino()+')':''}</button>
    </div>
    <div class="spell-source-note">Un backup esportato è l'unica copia che resta tua anche senza account e senza questo dispositivo. Vale la pena farlo ogni tanto.</div>`;
  return modalShell('🩺 Salute dei dati', inner);
}
