/* ══════════════════════════════════════════════════════════════════
   SISTEMI DI GIOCO
   ------------------------------------------------------------------
   L'app è nata per D&D 5e. Da qui in poi può ospitare altri sistemi —
   Star Wars 5e per primo — e la regola è una sola: DUE MONDI SEPARATI.
   Cambiando sistema non vedi niente dell'altro. Non «filtrato»:
   proprio assente.

   Come, senza riscrivere l'app: i dati di ogni sistema stanno in
   cassetti diversi, e in memoria c'è solo il cassetto aperto.
     · in locale  → un'unica chiave, dentro { sistemi: { dnd5e:{…}, sw5e:{…} } }
     · su Firebase→ collezioni con un prefisso: `sw5e__characters`
   Le regole di sicurezza pubblicate hanno già un jolly che copre
   qualunque collezione nuova: NON vanno toccate.

   Perché i cassetti e non un campo «sistema» su ogni scheda: con il
   campo, ogni singolo punto dell'app che legge una lista dovrebbe
   ricordarsi di filtrare — duecento punti, e basta dimenticarne uno
   per vedere un mago in mezzo ai Jedi. Col cassetto non c'è niente da
   ricordare: quello che non è caricato non si può mostrare.

   ── SUL CONTENUTO ──
   Qui non arriva NIENTE di Star Wars 5e. È un lavoro fatto da fan,
   costruito sopra l'SRD, ma sopra ci sono i nomi e i testi di
   Lucasfilm e la scrittura di chi l'ha fatto: non è roba nostra da
   ridistribuire. L'app fornisce la macchina; il materiale lo porta
   dentro chi lo possiede, nel proprio account.
   ══════════════════════════════════════════════════════════════════ */

const SISTEMI = [
  { id: 'dnd5e', nome: 'D&D 5e',        sotto: 'Dungeons & Dragons, quinta edizione', icona: 'dado',
    conContenuti: true },
  { id: 'sw5e',  nome: 'Star Wars 5e',  sotto: 'La conversione fan del d20 nella galassia', icona: 'incantesimo',
    conContenuti: false },
];
const SISTEMA_BASE = 'dnd5e';
const LS_SISTEMA = 'grimorio-sistema';

function sistemaValido(id){ return SISTEMI.some(s => s.id === id) ? id : SISTEMA_BASE; }
function sistemaAttivo(){ return SISTEMI.find(s => s.id === state.sistema) || SISTEMI[0]; }
function sistemaDi(id){ return SISTEMI.find(s => s.id === id) || SISTEMI[0]; }

/* Il nome della collezione su Firebase. Il sistema di partenza tiene i
   nomi di sempre: gli archivi che esistono già non si toccano. */
function colDi(nome){
  return state.sistema === SISTEMA_BASE ? nome : state.sistema + '__' + nome;
}
/* Lo stesso per le chiavi locali che non stanno nell'archivio (la
   campagna, per ora). */
function chiaveDi(chiave){
  return state.sistema === SISTEMA_BASE ? chiave : chiave + '::' + state.sistema;
}

/* Un cassetto vuoto: tutte le collezioni, nessuna voce. */
function cassettoVuoto(){
  const c = {};
  COLLEZIONI.forEach(k => { c[k] = []; });
  return c;
}

/* ── Le tabelle di regole, sistema per sistema ──
   D&D porta le sue (SRD). Gli altri sistemi partono vuoti e si
   riempiono con quello che importi: è l'unica strada onesta. */
function razzeBase(){ return state.sistema === SISTEMA_BASE ? (typeof RACES !== 'undefined' ? RACES : []) : []; }
function classiBase(){ return state.sistema === SISTEMA_BASE ? (typeof CLASSES_FULL !== 'undefined' ? CLASSES_FULL : []) : []; }
function backgroundBase(){ return state.sistema === SISTEMA_BASE ? (typeof BACKGROUNDS_FULL !== 'undefined' ? BACKGROUNDS_FULL : []) : []; }
function incantesimiBase(){ return state.sistema === SISTEMA_BASE ? (typeof SRD_SPELLS !== 'undefined' ? SRD_SPELLS : []) : []; }
function mostriBase(){ return state.sistema === SISTEMA_BASE ? (typeof SRD_MONSTERS !== 'undefined' ? SRD_MONSTERS : []) : []; }

/* ── Il cambio ──
   Si salva quello che c'è, si stacca la sincronia, si apre l'altro
   cassetto, si riattacca. È la stessa manovra del cambio account, che
   l'app sa già fare: la differenza è che qui i due cassetti sono tuoi
   tutti e due. */
function setSistema(id, silenzioso){
  const nuovo = sistemaValido(id);
  if (nuovo === state.sistema) return;
  if (typeof saveLocalOra === 'function') saveLocalOra();
  if (typeof detachFirestore === 'function') detachFirestore();
  if (typeof campaignScorda === 'function') campaignScorda();

  state.sistema = nuovo;
  try { localStorage.setItem(LS_SISTEMA, nuovo); } catch(e){}
  apriCassetto(nuovo);

  /* Quello che riguarda la partita in corso non attraversa i mondi. */
  state.activeCharId = null;
  state.combat = { list: [], round: 1, turn: 0 };
  state.view = 'party';
  state.sheetTab = 'overview';
  state.grimoireMode = 'browse'; state.grimoirePickFor = null;
  state.grimoireFilter = { q:'', level:'all', clas:'all', tratto:'all' };
  state.grimoireFiltriAperti = false;
  if (typeof bestiarioScorda === 'function') bestiarioScorda();
  if (typeof dimenticaVisti === 'function') dimenticaVisti();
  if (typeof campaignCarica === 'function') campaignCarica();
  if (typeof currentUser !== 'undefined' && currentUser && typeof attachFirestore === 'function'){
    attachFirestore(currentUser.uid);
  }
  if (typeof closeModalAll === 'function') closeModalAll();
  if (typeof replaceNav === 'function') replaceNav();
  render();
  if (typeof scrollTop === 'function') scrollTop();
  if (!silenzioso && typeof toast === 'function') toast('Sei su ' + sistemaDi(nuovo).nome);
}

/* ── La schermata che lo cambia ── */
function apriSistemi(){
  openModal({ render: () => modalShell('Sistema di gioco', `
    <div class="modal-body">
      <p class="muted" style="font-size:.82rem; margin-bottom:12px">
        Ogni sistema ha le sue cose: personaggi, contenuti tuoi, diario, tavolo.
        Cambiando sistema l'altro non sparisce — resta dov'è, e lo ritrovi tornando indietro.
      </p>
      <div class="list-gap">
        ${SISTEMI.map(s => `
          <button class="sistema-card ${state.sistema===s.id?'attivo':''}" onclick="scegliSistema('${s.id}')">
            <span class="seal">${ic(s.icona)}</span>
            <span class="sc-corpo">
              <span class="sc-nome">${escapeHtml(s.nome)}${state.sistema===s.id?' <span class="badge gold">attivo</span>':''}</span>
              <span class="sc-sotto">${escapeHtml(s.sotto)}</span>
              <span class="sc-conta">${escapeHtml(quanteCoseIn(s.id))}</span>
            </span>
            <span class="sc-coda">${state.sistema===s.id ? ic('spunta') : '›'}</span>
          </button>`).join('')}
      </div>
      ${!sistemaAttivo().conContenuti ? `<p class="muted" style="font-size:.78rem; margin-top:14px">
        ${ic('info')} I sistemi diversi da D&D partono vuoti: l'app non può distribuire
        materiale di altri. Le specie, le classi e i poteri li porti tu, con il lettore
        dei manuali o scrivendoli a mano — restano nel tuo account.</p>` : ''}
    </div>`) });
}
function scegliSistema(id){
  if (id === state.sistema){ closeModal(); return; }
  closeModalAll();
  setSistema(id);
}
/* Quanta roba c'è dall'altra parte, senza aprirla. */
function quanteCoseIn(id){
  if (id === state.sistema){
    const n = (state.characters||[]).length;
    return n ? n + ' ' + pluralize(n, 'personaggio', 'personaggi') : 'ancora vuoto';
  }
  try {
    const c = (leggiArchivio().sistemi || {})[id];
    if (!c) return 'mai aperto';
    const n = (c.characters||[]).length;
    return n ? n + ' ' + pluralize(n, 'personaggio', 'personaggi') : 'ancora vuoto';
  } catch(e){ return ''; }
}
