/* ══════════════════════════════════════════════════════════════════
   IL MATERIALE — un posto solo per metterlo dentro e per toglierlo
   ------------------------------------------------------------------
   Prima ogni tipo di materiale aveva la sua porta, e stavano tutte in
   posti diversi: gli incantesimi in Opzioni sotto «Incantesimi», le
   suppliche in fondo a «Contenuti tuoi», le creature nel Tavolo, le
   schede PDF sotto «Backup», i manuali dentro la gestione dei contenuti.
   Chi cercava «dove si carica una cosa» doveva sapere in anticipo che
   cosa stava caricando e in quale angolo dell'app viveva.

   Qui c'è un elenco solo, diviso per TIPO di cosa: si apre, si legge
   cosa accetta ognuno e quanti ne hai già, si tocca. Le vecchie porte
   restano dove hanno senso (nel Grimorio importi incantesimi, nel Party
   una scheda): quelle sono scorciatoie, questo è l'indice.
   ══════════════════════════════════════════════════════════════════ */

function quanteSuppliche_(){ return (state.suppliche || []).length; }
function quantiHomebrewDi(kind){ return (state.homebrew || []).filter(h => h.kind === kind).length; }

/* Le voci: cosa aggiungi, cosa accetta, quanti ne hai, dove porta. */
function VOCI_MATERIALE(){
  const hb = (state.homebrew || []).length;
  return [
    { id:'scheda', icona:'foglio', nome:'Una scheda personaggio',
      che:'PDF compilabile — ne esce un personaggio intero',
      quanti: (state.characters||[]).length, unita:['personaggio','personaggi'],
      vai: () => openPdfImport() },

    { id:'manuale', icona:'libro', nome:'Razze, sottoclassi e background',
      che:'il PDF o il testo di un manuale tuo: le riconosce e te le fa scegliere',
      quanti: hb, unita:['voce','voci'],
      dettaglio: hb ? [['razza','razze', quantiHomebrewDi('race')],
                       ['sottoclasse','sottoclassi', quantiHomebrewDi('subclass')],
                       ['background','background', quantiHomebrewDi('background')]]
                      .filter(x => x[2]).map(x => x[2] + ' ' + pluralize(x[2], x[0], x[1])).join(' · ') : '',
      vai: () => openHomebrewBulk() },

    { id:'incantesimi', icona:'incantesimo', nome:'Incantesimi',
      che:'PDF, JSON o testo incollato — finiscono nel Grimorio',
      quanti: (state.customSpells||[]).length, unita:['tuo','tuoi'],
      vai: () => openSpellImport() },

    { id:'suppliche', icona:'candela', nome:'Suppliche occulte',
      che:'quelle del warlock, dal manuale che possiedi',
      quanti: quanteSuppliche_(), unita:['supplica','suppliche'],
      vai: () => apriImportSuppliche(null) },

    { id:'creature', icona:'zampa', nome:'Creature per il bestiario',
      che:'PDF, testo o JSON di una raccolta di mostri',
      quanti: (state.npcs||[]).length, unita:['creatura','creature'],
      vai: () => openMostriPdf() },

    { id:'backup', icona:'salva', nome:'Un backup di TwentyNation',
      che:'il file .json esportato da qui: rimette dentro tutto',
      quanti: 0, unita:['',''],
      vai: () => triggerImport() },
  ];
}

function apriCentroMateriale(){
  openModal({ render: centroMaterialeHTML });
}
function centroMaterialeHTML(){
  const voci = VOCI_MATERIALE();
  const riga = (v) => `
    <button class="mat-riga" onclick="matVai('${v.id}')">
      <span class="seal">${ic(v.icona)}</span>
      <span class="mat-corpo">
        <span class="mat-nome">${escapeHtml(v.nome)}</span>
        <span class="mat-che">${escapeHtml(v.che)}</span>
        ${v.quanti ? `<span class="mat-conta">ne hai ${v.quanti} ${escapeHtml(pluralize(v.quanti, v.unita[0], v.unita[1]))}${
          v.dettaglio ? ' — ' + escapeHtml(v.dettaglio) : ''}</span>` : ''}
      </span>
      <span class="char-card-chevron">›</span>
    </button>`;
  const inner = `
    <div class="modal-body">
      <p class="muted" style="font-size:.82rem; margin-bottom:14px">
        Scegli <b>che cosa</b> stai aggiungendo: ognuno ha il suo lettore, e finisce al posto giusto.
        Se non sai che file hai in mano, l'ultima voce lo capisce da sola.
      </p>
      <div class="list-gap">${voci.map(riga).join('')}</div>
      <div class="divider"><span class="flourish">❧</span><span>oppure</span></div>
      <button class="btn btn-ghost btn-block" onclick="closeModal(); apriTogliMateriale()">${ic('cestino')} Togli del materiale</button>
      <div class="spell-source-note">Carica solo materiale di cui hai i diritti: i tuoi appunti, il tuo homebrew, o archivi con licenza aperta. Quello che aggiungi resta nel tuo account.</div>
    </div>`;
  return modalShell(ic('piu') + ' Aggiungi materiale', inner);
}
function matVai(id){
  const v = VOCI_MATERIALE().find(x => x.id === id);
  if (!v) return;
  /* `modalReplace` e non `openModal`: si sostituisce questa schermata con
     quella del lettore, così chiudendo si torna da dove si era partiti
     invece di ritrovarsi l'indice sotto. */
  closeModal();
  setTimeout(() => { try { v.vai(); } catch(e){ console.warn('Lettore non disponibile', e); toast('⚠ Non riesco ad aprire questo lettore'); } }, 60);
}

/* ─── Togliere ───
   Stessa idea: un elenco solo, con quanti ne hai e cosa succede. Tutto
   passa dal cestino a 30 giorni, tranne dove è scritto il contrario. */
function apriTogliMateriale(){
  openModal({ render: togliMaterialeHTML });
}
function togliMaterialeHTML(){
  const n = {
    razze: quantiHomebrewDi('race'),
    sottoclassi: quantiHomebrewDi('subclass'),
    background: quantiHomebrewDi('background'),
    suppliche: quanteSuppliche_(),
    incantesimi: (state.customSpells||[]).filter(s => s.imported).length,
    creature: (state.npcs||[]).length,
  };
  const riga = (etichetta, quanti, azione, nota) => quanti ? `
    <button class="mat-riga" onclick="${azione}">
      <span class="mat-corpo">
        <span class="mat-nome">${escapeHtml(etichetta)} <span class="badge">${quanti}</span></span>
        ${nota ? `<span class="mat-che">${escapeHtml(nota)}</span>` : ''}
      </span>
      <span style="color:var(--garnet-bright)">${ic('cestino')}</span>
    </button>` : '';
  const niente = !Object.values(n).some(Boolean);
  const inner = `
    <div class="modal-body">
      <p class="muted" style="font-size:.82rem; margin-bottom:14px">
        Quello che togli finisce nel <b>cestino</b> e per 30 giorni si può rimettere a posto.
        I personaggi già creati non cambiano: perdono solo il collegamento alla voce.
      </p>
      ${niente ? `<div class="lista-vuota">Non hai materiale tuo da togliere.</div>` : `
        <div class="list-gap">
          ${riga('Razze tue', n.razze, "closeModal(); confirmSvuotaHomebrew('race')")}
          ${riga('Sottoclassi tue', n.sottoclassi, "closeModal(); confirmSvuotaHomebrew('subclass')")}
          ${riga('Background tuoi', n.background, "closeModal(); confirmSvuotaHomebrew('background')")}
          ${riga('Suppliche occulte', n.suppliche, "closeModal(); confirmSvuotaSuppliche()")}
          ${riga('Incantesimi importati', n.incantesimi, "closeModal(); confirmClearImported()", 'solo quelli importati: quelli scritti da te restano')}
          ${riga('Creature del bestiario', n.creature, "closeModal(); confirmSvuotaBestiario()")}
        </div>
        <button class="btn btn-danger btn-block" style="margin-top:14px" onclick="closeModal(); confirmSvuotaHomebrew('')">
          ${ic('cestino')} Togli tutti i contenuti tuoi (${n.razze + n.sottoclassi + n.background})</button>`}
      <div class="divider"><span class="flourish">❧</span><span>ripensamenti</span></div>
      <button class="btn btn-ghost btn-block" onclick="closeModal(); openCestino()">
        ${ic('cestino')} Apri il cestino${(typeof quantoNelCestino==='function' && quantoNelCestino()) ? ' (' + quantoNelCestino() + ')' : ''}</button>
    </div>`;
  return modalShell(ic('cestino') + ' Togli materiale', inner);
}

/* Le suppliche non avevano NESSUNA strada per essere tolte: si
   caricavano e restavano lì per sempre. */
function confirmSvuotaSuppliche(){
  const q = quanteSuppliche_();
  if (!q){ toast('Non ne hai'); return; }
  confirmDialog('Togliere ' + q + ' ' + pluralize(q,'supplica','suppliche') + '?',
    'Finiscono nel cestino e per 30 giorni puoi rimetterle a posto. I warlock già creati tengono quelle che hanno in scheda.',
    () => svuotaSuppliche(), 'Togli tutte');
}
async function svuotaSuppliche(){
  const lista = (state.suppliche || []).slice();
  if (!lista.length) return;
  if (typeof nelCestino === 'function') lista.forEach(s => nelCestino('suppliche', s));
  state.suppliche = [];
  saveLocalOra();
  if (typeof fsDeleteMany === 'function') await fsDeleteMany('suppliche', lista.map(s => s.id));
  render();
  toast(lista.length + ' ' + pluralize(lista.length,'supplica tolta','suppliche tolte') + ' · sono nel cestino');
}

/* Anche il bestiario: c'era la cancellazione a selezione, non quella
   «togli tutto» — con trecento creature importate per sbaglio era una
   serata di lavoro. */
function confirmSvuotaBestiario(){
  const lista = (state.npcs || []).filter(n => !n.__dalTavolo);
  if (!lista.length){ toast('Il bestiario è vuoto'); return; }
  confirmDialog('Togliere ' + lista.length + ' ' + pluralize(lista.length,'creatura','creature') + '?',
    'Finiscono nel cestino e per 30 giorni puoi rimetterle a posto. Quelle messe dagli altri al tavolo non si toccano.',
    () => svuotaBestiario(), 'Togli tutte');
}
async function svuotaBestiario(){
  const lista = (state.npcs || []).filter(n => !n.__dalTavolo);
  if (!lista.length) return;
  const ids = lista.map(n => n.id);
  if (typeof nelCestino === 'function') lista.forEach(n => nelCestino('npcs', n));
  const tolti = new Set(ids);
  state.npcs = (state.npcs || []).filter(n => !tolti.has(n.id));
  if (typeof bestiarioScorda === 'function') bestiarioScorda();
  saveLocalOra();
  if (typeof fsDeleteMany === 'function') await fsDeleteMany('npcs', ids);
  render();
  toast(ids.length + ' ' + pluralize(ids.length,'creatura tolta','creature tolte') + ' · sono nel cestino');
}
