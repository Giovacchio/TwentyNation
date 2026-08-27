/* ══════════════════════════════════════════════════════════════
   Grimorio — sfogliatore degli oggetti magici
   Si consultano, si mettono nello zaino e si sintonizzano.
   La sintonizzazione è quella vera: massimo tre per personaggio,
   e l'app te lo ricorda invece di lasciartelo sbagliare.
   ══════════════════════════════════════════════════════════════ */

const ATTUNEMENT_MAX = 3;

/* ─── Consultazione ─── */
let miFilter = { q:'', type:'all', rarity:'all', attOnly:false, pickFor:null };
function openMagicItems(opts){
  miFilter = Object.assign({ q:'', type:'all', rarity:'all', attOnly:false, pickFor:null }, opts||{});
  openModal({ render: magicItemsHTML });
}
function filteredMagicItems(){
  let list = SRD_MAGIC_ITEMS.slice();
  if (miFilter.type !== 'all') list = list.filter(m => m.t === miFilter.type);
  if (miFilter.rarity !== 'all') list = list.filter(m => m.r === miFilter.rarity);
  if (miFilter.attOnly) list = list.filter(miNeedsAttunement);
  if (miFilter.q){
    const q = norm(miFilter.q);
    list = list.filter(m => norm(m.it).includes(q) || norm(m.n).includes(q) || norm(m.t).includes(q) || norm(m.d).includes(q));
  }
  list.sort((a,b) => (MI_RARITY_ORDER[a.r] ?? 9) - (MI_RARITY_ORDER[b.r] ?? 9) || miName(a).localeCompare(miName(b),'it'));
  return list;
}
function miRarityClass(r){
  return 'mi-' + String(r).replace(/\s+/g,'-');
}
function magicItemsHTML(){
  const list = filteredMagicItems();
  const picking = !!miFilter.pickFor;
  const inner = `
    ${picking ? `<p class="muted" style="margin-bottom:12px">Scegli un oggetto: finisce nello zaino di ${escapeHtml((charById(miFilter.pickFor)||{}).name || 'questo personaggio')}.</p>` : ''}
    <div class="search-wrap">
      <span class="search-ic">🔍</span>
      <input id="mi-search" placeholder="Cerca fra gli oggetti magici…" value="${attr(miFilter.q)}" oninput="miSearch(this.value)" autocomplete="off">
    </div>
    <div class="filter-bar">
      <button class="filter-chip ${miFilter.type==='all'?'active':''}" onclick="miSet('type','all')">Tutti</button>
      ${MI_TYPES.map(t=>`<button class="filter-chip ${miFilter.type===t?'active':''}" onclick="miSet('type','${t}')">${t}</button>`).join('')}
    </div>
    <div class="filter-bar">
      <button class="filter-chip ${miFilter.rarity==='all'?'active':''}" onclick="miSet('rarity','all')">Ogni rarità</button>
      ${MI_RARITIES.map(r=>`<button class="filter-chip ${miFilter.rarity===r?'active':''}" onclick="miSet('rarity','${r}')">${r}</button>`).join('')}
      <button class="filter-chip ${miFilter.attOnly?'active':''}" onclick="miSet('attOnly',${!miFilter.attOnly})">⚡ sintonizzazione</button>
    </div>
    <div class="muted" style="margin:2px 0 10px">${list.length} oggett${list.length===1?'o':'i'}</div>
    <div class="list-gap">
      ${list.map(m=>`<div class="spell-item" style="padding:10px 12px">
        <span class="mi-badge ${miRarityClass(m.r)}" title="${escapeHtml(m.r)}">${miTypeIcon(m.t)}</span>
        <button class="spell-item-body" style="text-align:left" onclick="viewMagicItem('${m.id}')">
          <span class="spell-item-name">${escapeHtml(miName(m))}${miNeedsAttunement(m)?' <span style="color:var(--gold)">⚡</span>':''}</span>
          <span class="spell-item-meta">${m.t} · ${m.r}${m.ch?(' · '+m.ch+' cariche'):''}</span>
        </button>
        <button class="spell-item-add" onclick="${picking ? `addMagicItemToChar('${miFilter.pickFor}','${m.id}')` : `pickCharForMagicItem('${m.id}')`}" aria-label="Metti nello zaino">✦</button>
      </div>`).join('') || emptyState('🔍','Nessun oggetto con questi filtri.')}
    </div>
    <div class="spell-source-note">Oggetti dal System Reference Document 5.1 di Wizards of the Coast, licenza Open Gaming License 1.0a.</div>`;
  return modalShell('💍 Oggetti magici', inner);
}
const miSearch = debounce((v)=>{ miFilter.q = v; renderModalRoot({ toTop:true }); }, 220);
function miSet(k,v){ miFilter[k] = v; renderModalRoot({ toTop:true }); }
function miTypeIcon(t){
  return ({ arma:'⚔️', armatura:'🛡️', scudo:'🛡️', anello:'💍', bacchetta:'🪄', bastone:'🦯',
            verga:'🔱', pozione:'🧪', pergamena:'📜', meraviglioso:'✨' })[t] || '✨';
}

/* ─── Scheda dell'oggetto ─── */
function viewMagicItem(id, charId){
  const m = MAGIC_ITEM_BY_ID[id]; if (!m) return;
  openModal({ render: () => magicItemSheetHTML(m, charId) });
}
function magicItemSheetHTML(m, charId){
  const c = charId ? charById(charId) : null;
  return modalShell(miTypeIcon(m.t) + ' ' + escapeHtml(miName(m)), `
    <div class="muted" style="font-style:italic; margin-bottom:12px">${m.t} · ${m.r}${state.spellLang==='en'?'':' · '+escapeHtml(m.n)}</div>
    ${miNeedsAttunement(m) ? `<div class="card" style="margin-bottom:12px; border-color:var(--gold-dim); padding:9px 12px">
      <div style="font-size:.82rem"><b style="color:var(--gold)">⚡ ${escapeHtml(miAttunementLabel(m))}</b></div>
      <div class="muted" style="font-size:.75rem; margin-top:3px">Serve un riposo breve passato a concentrarsi sull'oggetto. Puoi averne al massimo ${ATTUNEMENT_MAX} sintonizzati insieme.</div>
    </div>` : ''}
    ${m.ch ? `<div class="row-between" style="margin-bottom:10px"><span class="muted">Cariche</span><b>${m.ch}</b></div>` : ''}
    <p style="font-size:.9rem; line-height:1.65">${escapeHtml(m.d)}</p>
    <div class="list-gap" style="margin-top:16px">
      ${c ? `<button class="btn btn-primary btn-block" onclick="addMagicItemToChar('${c.id}','${m.id}')">✦ Nello zaino di ${escapeHtml(c.name||'questo personaggio')}</button>`
          : `<button class="btn btn-primary btn-block" onclick="pickCharForMagicItem('${m.id}')">✦ Mettilo nello zaino</button>`}
    </div>
    <div class="spell-source-note">System Reference Document 5.1, Open Gaming License 1.0a.</div>`);
}

/* ─── Nello zaino ─── */
function pickCharForMagicItem(itemId){
  if (!state.characters.length){ toast('Prima crea un personaggio'); return; }
  if (state.characters.length === 1){ addMagicItemToChar(state.characters[0].id, itemId); return; }
  const m = MAGIC_ITEM_BY_ID[itemId];
  openModal({ render: () => modalShell('A chi lo dai?', `
    <p class="muted" style="margin-bottom:12px">${escapeHtml(miName(m))} finisce nello zaino di…</p>
    <div class="list-gap">
      ${state.characters.map(c=>`<button class="attack-row" style="width:100%; text-align:left" onclick="addMagicItemToChar('${c.id}','${itemId}')">
        <span style="flex-shrink:0; margin-right:10px">${avatarHTML(c, 34)}</span>
        <span class="attack-main">
          <span class="attack-name">${escapeHtml(c.name||'Senza nome')}</span>
          <span class="muted" style="font-size:.74rem; display:block">${escapeHtml(c.classField||'Avventuriero')} · Lv ${c.level||1} · ${attunedCount(c)}/${ATTUNEMENT_MAX} sintonizzati</span>
        </span>
      </button>`).join('')}
    </div>`) });
}
function attunedCount(c){ return (c.inventory||[]).filter(i => i.attuned).length; }
function addMagicItemToChar(charId, itemId){
  const c = charById(charId), m = MAGIC_ITEM_BY_ID[itemId];
  if (!c || !m) return;
  c.inventory = c.inventory || [];
  c.inventory.push({
    name: miName(m), qty: 1, weight: '', attuned: false, equipped: false,
    notes: [m.r, miNeedsAttunement(m) ? miAttunementLabel(m) : '', m.ch ? (m.ch + ' cariche') : ''].filter(Boolean).join(' · '),
    magicId: m.id,
  });
  scheduleSave('characters', c);
  closeModal(); render();
  toast('💍 ' + miName(m) + ' nello zaino di ' + (c.name || 'lui'));
}

/* ─── Sintonizzazione ─── */
function toggleAttune(charId, i){
  const c = charById(charId); if (!c) return;
  const it = (c.inventory||[])[i]; if (!it) return;
  if (!it.attuned && attunedCount(c) >= ATTUNEMENT_MAX){
    const already = (c.inventory||[]).filter(x => x.attuned).map(x => x.name).join(', ');
    confirmDialog('Sei già a ' + ATTUNEMENT_MAX + ' oggetti sintonizzati',
      'Hai sintonizzato: ' + already + '. Per legarti a ' + it.name + ' devi prima staccarti da uno degli altri.',
      () => { closeModal(); }, 'Ho capito');
    return;
  }
  it.attuned = !it.attuned;
  scheduleSave('characters', c);
  render();
  toast(it.attuned ? ('⚡ Sintonizzato con ' + it.name) : ('Sintonizzazione con ' + it.name + ' interrotta'));
}
/* Riga di riepilogo in cima allo zaino */
function attunementRowHTML(c){
  const n = attunedCount(c);
  const list = (c.inventory||[]).filter(x => x.attuned);
  return `<div class="card" style="margin-bottom:10px; padding:10px 13px; ${n>ATTUNEMENT_MAX?'border-color:var(--warn)':''}">
    <div class="row-between">
      <span class="muted" style="font-size:.8rem">⚡ Sintonizzazione</span>
      <b style="font-size:.85rem; color:${n>=ATTUNEMENT_MAX?'var(--gold)':'var(--ink)'}">${n} / ${ATTUNEMENT_MAX}</b>
    </div>
    ${list.length ? `<div class="muted" style="font-size:.74rem; margin-top:5px">${list.map(x=>escapeHtml(x.name)).join(' · ')}</div>` : ''}
  </div>`;
}
