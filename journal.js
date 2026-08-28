/* ══════════════════════════════════════════════════════════════
   Grimorio — diario di campagna
   Una voce per sessione: cosa è successo, chi c'era, i nomi da
   ricordare. Si scrive in fretta durante la partita e si rilegge
   prima della prossima. Sincronizzato come il resto.
   ══════════════════════════════════════════════════════════════ */

const JOURNAL_TAGS = [
  { id:'trama',    label:'Trama',      icon:'🗺️' },
  { id:'png',      label:'PNG',        icon:'👤' },
  { id:'luogo',    label:'Luogo',      icon:'🏰' },
  { id:'bottino',  label:'Bottino',    icon:'💰' },
  { id:'missione', label:'Missione',   icon:'📜' },
  { id:'combattimento', label:'Scontro', icon:'⚔️' },
  { id:'idea',     label:'Da chiarire', icon:'❓' },
];
const JTAG_BY_ID = Object.fromEntries(JOURNAL_TAGS.map(t=>[t.id,t]));

function todayISO(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function prettyDate(iso){
  if (!iso) return '';
  const p = String(iso).split('-');
  if (p.length !== 3) return iso;
  const mesi = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  const m = parseInt(p[1],10) - 1;
  return parseInt(p[2],10) + ' ' + (mesi[m] || '') + ' ' + p[0];
}
function newJournalEntry(){
  const nums = (state.journal||[]).map(e => e.session || 0);
  return {
    id: uid(), session: (nums.length ? Math.max(...nums) : 0) + 1,
    date: todayISO(), title: '', text: '', tags: [], charIds: [],
    createdAt: Date.now(),
  };
}
function journalSorted(){
  return (state.journal || []).slice().sort((a,b) =>
    String(b.date||'').localeCompare(String(a.date||'')) || (b.session||0) - (a.session||0) || (b.createdAt||0) - (a.createdAt||0));
}

/* ─── Elenco ─── */
let jFilter = { q:'', tag:'all' };
function setJFilter(k, v){ jFilter[k] = v; render(); }
const jSearch = debounce((v) => { jFilter.q = v; render();
  const el = document.getElementById('j-search'); if (el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 220);

function filteredJournal(){
  let list = journalSorted();
  if (jFilter.tag !== 'all') list = list.filter(e => (e.tags||[]).includes(jFilter.tag));
  if (jFilter.q){
    const q = norm(jFilter.q);
    list = list.filter(e => norm(e.title||'').includes(q) || norm(e.text||'').includes(q));
  }
  return list;
}

function renderJournal(){
  const list = filteredJournal();
  const tot = (state.journal||[]).length;
  return `
    <button class="btn btn-primary btn-block" style="margin-bottom:14px" onclick="openJournalEntry()">✦ Nuova voce di diario</button>
    ${tot ? `
      <div class="search-wrap">
        <span class="search-ic">🔍</span>
        <input id="j-search" placeholder="Cerca nel diario…" value="${attr(jFilter.q)}" oninput="jSearch(this.value)" autocomplete="off">
      </div>
      <div class="filter-bar">
        <button class="filter-chip ${jFilter.tag==='all'?'active':''}" onclick="setJFilter('tag','all')">Tutte (${tot})</button>
        ${JOURNAL_TAGS.map(t=>{
          const n = (state.journal||[]).filter(e=>(e.tags||[]).includes(t.id)).length;
          return n ? `<button class="filter-chip ${jFilter.tag===t.id?'active':''}" onclick="setJFilter('tag','${t.id}')">${t.icon} ${t.label} (${n})</button>` : '';
        }).join('')}
      </div>` : ''}
    ${list.length ? `<div class="stagger list-gap">${list.map(journalCardHTML).join('')}</div>`
      : (tot ? emptyState('🔍','Nessuna voce con questi filtri.')
             : emptyState('📓','Il diario è vuoto. Scrivi due righe a fine sessione: fra un mese saranno oro.'))}
    ${tot ? `<button class="btn btn-ghost btn-block" style="margin-top:14px" onclick="exportJournal()">⤓ Esporta il diario</button>` : ''}
  `;
}

function journalCardHTML(e){
  const chars = (e.charIds||[]).map(id => charById(id)).filter(Boolean);
  const preview = String(e.text||'').replace(/\s+/g,' ').trim().slice(0, 150);
  return `<button class="card journal-card" style="width:100%; text-align:left" onclick="openJournalEntry('${e.id}')">
    <div class="row-between" style="align-items:flex-start; gap:10px">
      <div style="min-width:0; flex:1">
        <div style="font-family:var(--font-head); font-size:1.02rem; color:var(--gold)">${escapeHtml(e.title || 'Sessione ' + (e.session||'?'))}</div>
        <div class="muted" style="font-size:.73rem; margin-top:2px">${e.session?('Sessione '+e.session+' · '):''}${escapeHtml(prettyDate(e.date))}</div>
      </div>
      ${(e.tags||[]).length ? `<div style="flex-shrink:0; font-size:.95rem">${(e.tags||[]).map(t=>JTAG_BY_ID[t]?JTAG_BY_ID[t].icon:'').join(' ')}</div>` : ''}
    </div>
    ${preview ? `<div class="muted" style="font-size:.8rem; margin-top:8px; line-height:1.5">${escapeHtml(preview)}${String(e.text||'').length>150?'…':''}</div>` : ''}
    ${chars.length ? `<div class="chip-row" style="margin-top:9px">${chars.map(c=>`<span class="chip" style="pointer-events:none">${escapeHtml(c.name||'?')}</span>`).join('')}</div>` : ''}
  </button>`;
}

/* ─── Scrittura ─── */
let draftEntry = null;
function openJournalEntry(id){
  const existing = id ? (state.journal||[]).find(e => e.id === id) : null;
  draftEntry = existing ? JSON.parse(JSON.stringify(existing)) : newJournalEntry();
  openModal({ render: journalFormHTML, after: () => {
    const el = document.getElementById('j-text');
    if (el) fitTextarea(el);
  }});
}
function journalFormHTML(){
  const d = draftEntry;
  const isEdit = (state.journal||[]).some(e => e.id === d.id);
  const inner = `
    <div class="two-col">
      <div class="field"><label>Sessione n°</label>
        <input type="number" inputmode="numeric" value="${attr(d.session||'')}" oninput="draftEntry.session=parseInt(this.value)||0"></div>
      <div class="field"><label>Data</label>
        <input type="date" value="${attr(d.date||'')}" oninput="draftEntry.date=this.value"></div>
    </div>
    <div class="field"><label>Titolo</label>
      <input value="${attr(d.title||'')}" placeholder="Es. La cripta sotto il mulino" oninput="draftEntry.title=this.value"></div>

    <div class="field"><label>Cosa è successo</label>
      <textarea id="j-text" rows="8" placeholder="Due righe bastano: dove siete arrivati, chi avete incontrato, cosa vi siete presi e cosa è rimasto in sospeso." oninput="draftEntry.text=this.value; fitTextarea(this)">${escapeHtml(d.text||'')}</textarea></div>

    <div class="divider"><span class="flourish">❧</span><span>Etichette</span></div>
    <div class="chip-row">
      ${JOURNAL_TAGS.map(t=>`<button class="chip ${(d.tags||[]).includes(t.id)?'active':''}" onclick="toggleEntryTag('${t.id}')">${t.icon} ${t.label}</button>`).join('')}
    </div>

    ${state.characters.length ? `
      <div class="divider"><span class="flourish">❧</span><span>Chi c'era</span></div>
      <div class="chip-row">
        ${state.characters.map(c=>`<button class="chip ${(d.charIds||[]).includes(c.id)?'active':''}" onclick="toggleEntryChar('${c.id}')">${escapeHtml(c.name||'Senza nome')}</button>`).join('')}
      </div>` : ''}

    <div class="btn-row" style="margin-top:18px">
      ${isEdit ? `<button class="btn btn-danger" onclick="deleteJournalEntry('${d.id}')">Elimina</button>` : ''}
      <button class="btn btn-primary" onclick="saveJournalEntry()">${isEdit ? 'Salva' : 'Aggiungi al diario'}</button>
    </div>`;
  return modalShell(isEdit ? '📓 Voce di diario' : '📓 Nuova voce', inner);
}
function toggleEntryTag(t){
  draftEntry.tags = draftEntry.tags || [];
  const i = draftEntry.tags.indexOf(t);
  if (i >= 0) draftEntry.tags.splice(i,1); else draftEntry.tags.push(t);
  renderModalRoot();
}
function toggleEntryChar(id){
  draftEntry.charIds = draftEntry.charIds || [];
  const i = draftEntry.charIds.indexOf(id);
  if (i >= 0) draftEntry.charIds.splice(i,1); else draftEntry.charIds.push(id);
  renderModalRoot();
}
function saveJournalEntry(){
  const d = draftEntry;
  if (!String(d.title||'').trim() && !String(d.text||'').trim()){
    toast('Scrivi almeno un titolo o due righe'); return;
  }
  state.journal = state.journal || [];
  const i = state.journal.findIndex(e => e.id === d.id);
  if (i >= 0) state.journal[i] = d; else state.journal.push(d);
  scheduleSave('journal', d);
  draftEntry = null;
  closeModal(); render();
  toast('📓 Voce salvata');
}
function deleteJournalEntry(id){
  confirmDialog('Eliminare questa voce?', 'Sparisce dal diario su tutti i tuoi dispositivi. Resta nel cestino per 30 giorni.', () => {
    if (typeof nelCestino === 'function') nelCestino('journal', (state.journal||[]).find(e => e.id === id));
    state.journal = (state.journal||[]).filter(e => e.id !== id);
    fsDelete('journal', id);
    saveLocal();
    draftEntry = null;
    closeModal(); render();
    toast('Voce eliminata');
  }, 'Elimina');
}

/* ─── Esportazione: un testo leggibile, da incollare dove si vuole ─── */
function exportJournal(){
  const list = journalSorted().slice().reverse();
  if (!list.length){ toast('Il diario è vuoto'); return; }
  const lines = ['DIARIO DI CAMPAGNA', '='.repeat(40), ''];
  list.forEach(e => {
    lines.push((e.session ? 'Sessione ' + e.session + ' — ' : '') + (e.title || 'Senza titolo'));
    lines.push(prettyDate(e.date));
    const chars = (e.charIds||[]).map(id => charById(id)).filter(Boolean).map(c => c.name);
    if (chars.length) lines.push('Presenti: ' + chars.join(', '));
    if ((e.tags||[]).length) lines.push('Etichette: ' + (e.tags||[]).map(t => JTAG_BY_ID[t] ? JTAG_BY_ID[t].label : t).join(', '));
    lines.push('');
    if (e.text) lines.push(e.text);
    lines.push('', '-'.repeat(40), '');
  });
  const blob = new Blob([lines.join('\n')], { type:'text/plain;charset=utf-8' });
  const name = 'diario-di-campagna-' + todayISO() + '.txt';
  if (typeof downloadBlob === 'function') downloadBlob(blob, name);
  else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 4000);
  }
  toast('⤓ Diario esportato');
}
