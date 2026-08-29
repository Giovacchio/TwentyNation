/* ══════════════════════════════════════════════════════════════
   Grimorio — contenuti tuoi (sottoclassi, razze, background)
   Quello che non è nell'SRD lo aggiungi tu, dai manuali che
   possiedi: a mano, incollando il testo o estraendolo da un PDF.
   Resta sul tuo account e compare nella creazione guidata
   accanto ai contenuti di serie.
   ══════════════════════════════════════════════════════════════ */

let hbReturnToBuilder = false;
// Aggiunta al volo mentre stai creando un personaggio: si torna al builder.
function hbFromBuilder(kind, classId){
  hbReturnToBuilder = true;
  editHomebrew(null, kind);
  if (classId) hbDraft.classId = classId;
  renderModalRoot();
}
const HB_KINDS = {
  subclass:   { label:'Sottoclasse', icon:'⚔️' },
  race:       { label:'Razza',       icon:'🧝' },
  background: { label:'Background',  icon:'📜' },
};

function homebrewOf(kind){
  const miei = (state.homebrew||[]).filter(h => h.kind === kind);
  const nomi = new Set(miei.map(h => norm(h.name||'')));
  // le aggiunte messe in comune dal tavolo, senza doppiare le tue
  const dalTavolo = (state.sharedHomebrew||[])
    .filter(h => h.kind === kind && !nomi.has(norm(h.name||'')))
    .map(h => ({...h, fromCampaign:true}));
  return miei.concat(dalTavolo);
}

/* Elenchi completi = contenuti di serie + i tuoi */
function allRaces(){
  return RACES.concat(homebrewOf('race').map(h => ({
    id: h.id, name: h.name, speed: h.speed || 9, size: h.size || 'Media',
    bonus: h.bonus || {}, languages: (h.languages || 'Comune').split(/\s*,\s*/).filter(Boolean),
    traits: (h.traits || []).map(t => ({ name: t[0], desc: t[1] })),
    grantSkills: h.grantSkills || [], subraces: [], homebrew: true, source: h.source || '',
    fromCampaign: !!h.fromCampaign, sharedByName: h.sharedByName || ''
  })));
}
function raceById(id){ return allRaces().find(r => r.id === id); }
function allBackgrounds(){
  return BACKGROUNDS_FULL.concat(homebrewOf('background').map(h => ({
    id: h.id, name: h.name, skills: h.skills || [], languages: h.langCount || 0,
    tools: h.tools || '—', feature: h.feature || '', desc: h.desc || '',
    equipment: h.equipment || '', homebrew: true, source: h.source || '',
    fromCampaign: !!h.fromCampaign, sharedByName: h.sharedByName || ''
  })));
}
function subclassesFor(classId){
  const base = (CLASS_BY_ID[classId] ? CLASS_BY_ID[classId].subclasses : []) || [];
  return base.concat(homebrewOf('subclass').filter(h => h.classId === classId).map(h => ({
    id: h.id, name: h.name, features: h.features || {}, homebrew: true, source: h.source || '',
    meccaniche: h.meccaniche || null,
    fromCampaign: !!h.fromCampaign, sharedByName: h.sharedByName || ''
  })));
}

/* ─── Salvataggio ─── */
function saveHomebrew(obj){
  obj.updatedAt = Date.now();
  const i = (state.homebrew || []).findIndex(h => h.id === obj.id);
  if (i >= 0) state.homebrew[i] = obj; else state.homebrew.push(obj);
  saveLocal();
  fsSet('homebrew', obj);
}
function deleteHomebrew(id){
  if (typeof nelCestino === 'function') nelCestino('homebrew', (state.homebrew||[]).find(h => h.id === id));
  state.homebrew = (state.homebrew || []).filter(h => h.id !== id);
  fsDelete('homebrew', id);
  saveLocal(); render();
}

/* ─── Schermata di gestione ─── */
function openHomebrew(){
  state.hbQ = ''; state.hbKind = '';
  listaAzzera('hb-lista');
  openModal({ render: homebrewListHTML });
}
/* Con un manuale intero caricato qui dentro ci sono centinaia di voci:
   si cercano e si filtrano per tipo, e escono un blocco per volta. */
function hbCerca(v){ state.hbQ = v; listaAzzera('hb-lista'); renderModalRoot(); }
function hbFiltraTipo(k){ state.hbKind = (state.hbKind === k ? '' : k); listaAzzera('hb-lista'); renderModalRoot(); }
function hbOrdinati(){
  return (state.homebrew || []).slice()
    .sort((a,b)=> (a.kind||'').localeCompare(b.kind||'') || (a.name||'').localeCompare(b.name||'', 'it'));
}
function hbFiltrati(){
  let l = hbOrdinati();
  if (state.hbKind) l = l.filter(h => h.kind === state.hbKind);
  const q = (state.hbQ || '').trim();
  if (q){
    const nq = norm(q);
    l = l.filter(h => norm(h.name || '').includes(nq)
      || norm(h.source || '').includes(nq)
      || norm(((CLASS_BY_ID[h.classId]||{}).name) || '').includes(nq));
  }
  return l;
}
function hbRigaHTML(h){
  return `<div class="attack-row">
    <button class="attack-main" onclick="editHomebrew('${h.id}')">
      <div class="attack-name">${HB_KINDS[h.kind]?HB_KINDS[h.kind].icon:''} ${escapeHtml(h.name)}</div>
      <div class="muted" style="font-size:.72rem">${HB_KINDS[h.kind]?HB_KINDS[h.kind].label:h.kind}${h.classId?' · '+escapeHtml((CLASS_BY_ID[h.classId]||{}).name||''):''}${h.source?' · '+escapeHtml(h.source):''}${(typeof riassuntoMeccaniche==='function' && riassuntoMeccaniche(h))?' · ⚙️ '+escapeHtml(riassuntoMeccaniche(h)):''}</div>
    </button>
    ${h.kind==='subclass' ? `<button class="btn-icon" style="width:36px;height:36px;font-size:.8rem" title="Effetti sul gioco" onclick="openMeccaniche('${jsStr(h.id)}')">⚙️</button>` : ''}
    ${(typeof campaignReady === 'function' && campaignReady()) ? (()=>{
      const giaSu = (state.sharedHomebrew||[]).some(x => x.id === h.id);
      return `<button class="btn-icon" style="width:36px;height:36px;font-size:.8rem;${giaSu?'border-color:var(--gold); color:var(--gold)':''}"
        title="${giaSu?'Ritira dalla campagna':'Condividi con la campagna'}"
        onclick="${giaSu?`unshareFromCampaign('homebrew','${h.id}')`:`shareOneHomebrew('${h.id}')`}">⚔️</button>`;
    })() : ''}
    <button class="btn-icon" style="width:36px;height:36px;font-size:.8rem" onclick="confirmDeleteHomebrew('${h.id}')" aria-label="Elimina">✕</button>
  </div>`;
}
function homebrewListHTML(){
  const tutti = hbOrdinati();
  const visti = hbFiltrati();
  const molti = tutti.length > LISTA_PASSO;
  const conta = {};
  tutti.forEach(h => { conta[h.kind] = (conta[h.kind]||0) + 1; });
  const inner = `
    <p class="muted" style="margin-bottom:14px">
      Qui aggiungi sottoclassi, razze e background che non sono nell'SRD, presi dai manuali che possiedi o inventati al tuo tavolo.
      Compaiono nella creazione guidata insieme a quelli di serie e restano legati al tuo account.
    </p>
    <div class="btn-row" style="margin-bottom:14px">
      ${Object.keys(HB_KINDS).map(k=>`<button class="btn btn-ghost btn-sm" onclick="editHomebrew(null,'${k}')">${HB_KINDS[k].icon} ${HB_KINDS[k].label}</button>`).join('')}
    </div>
    ${molti ? `
      <div class="row-between" style="margin-bottom:8px"><b style="font-size:.86rem">📚 Le tue voci</b><span class="muted" style="font-size:.75rem">${tutti.length} in tutto</span></div>
      ${cercaLista('hb-cerca', state.hbQ, 'hbCerca', 'Cerca per nome, classe o libro…')}
      <div class="filtro-riga">
        <button class="chip ${state.hbKind?'':'active'}" onclick="hbFiltraTipo('')">Tutte</button>
        ${Object.keys(HB_KINDS).filter(k=>conta[k]).map(k=>`<button class="chip ${state.hbKind===k?'active':''}" onclick="hbFiltraTipo('${k}')">${HB_KINDS[k].icon} ${HB_KINDS[k].label} (${conta[k]})</button>`).join('')}
      </div>` : ''}
    ${tutti.length
      ? (visti.length
          ? bloccoLista('hb-lista', visti, hbRigaHTML, { modale:true, nome:'voci' })
          : `<div class="lista-vuota">Nessuna voce con questi filtri.</div>`)
      : emptyState('📚','Non hai ancora contenuti tuoi. Aggiungine uno con i pulsanti qui sopra.')}
    <button class="btn btn-gold btn-block" style="margin-top:14px" onclick="openHomebrewBulk()">📖 Leggi dal tuo manuale</button>
    ${tutti.length ? `<button class="btn btn-ghost btn-block btn-sm" style="margin-top:10px" onclick="openTraduzione()">🇮🇹 Traduci i nomi in italiano</button>` : ''}
    ${(tutti.length && typeof campaignReady === 'function' && campaignReady() && daCondividere()) ? `<button class="btn btn-gold btn-block btn-sm" style="margin-top:10px" onclick="condividiTutto()">⚔️ Condividi tutto col tavolo (${daCondividere()})</button>` : ''}
    ${tutti.length ? `<div class="btn-row" style="margin-top:10px">
      <button class="btn btn-ghost btn-sm" onclick="exportHomebrew()">⤓ Esporta</button>
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('hb-import-file').click()">⤒ Importa file</button>
    </div>` : `<button class="btn btn-ghost btn-block btn-sm" style="margin-top:10px" onclick="document.getElementById('hb-import-file').click()">⤒ Importa da file</button>`}
    <input type="file" id="hb-import-file" accept="application/json,.json,application/pdf,.pdf,.txt,text/plain,.md" style="display:none" onchange="importHomebrewFile(this)">
    <div class="spell-source-note">Il Grimorio non contiene materiale dei manuali: quello che scrivi qui resta tuo e non viene condiviso con nessuno.</div>`;
  return modalShell('📚 Contenuti tuoi', inner);
}
function confirmDeleteHomebrew(id){
  const h = (state.homebrew||[]).find(x=>x.id===id);
  confirmDialog('Eliminare ' + (h?h.name:'questo contenuto') + '?', 'I personaggi già creati non cambiano: perdi solo la voce nella creazione guidata.', () => { deleteHomebrew(id); openHomebrew(); }, 'Elimina');
}

/* ─── Editor ─── */
let hbDraft = null;
function editHomebrew(id, kind){
  const ex = id ? (state.homebrew||[]).find(h => h.id === id) : null;
  hbDraft = ex ? JSON.parse(JSON.stringify(ex)) : {
    id: uid(), kind: kind || 'subclass', name: '', source: '', classId: 'fighter',
    features: {}, traits: [], bonus: {}, speed: 9, size: 'Media', languages: 'Comune',
    skills: [], tools: '', langCount: 0, feature: '', desc: '', equipment: '', grantSkills: []
  };
  openModal({ render: homebrewEditorHTML, after: () => { const el = document.getElementById('hb-name'); if (el && !id) el.focus(); } });
}
function hbSet(k, v){ hbDraft[k] = v; renderModalRoot(); }
function homebrewEditorHTML(){
  const d = hbDraft;
  const K = HB_KINDS[d.kind];
  const inner = `
    <div class="field"><label>Nome</label><input id="hb-name" value="${attr(d.name)}" placeholder="${d.kind==='subclass'?'Es. Lama Occulta':(d.kind==='race'?'Es. Aasimar':'Es. Investigatore')}" oninput="hbDraft.name=this.value"></div>
    <div class="form-row">
      <div class="field"><label>Fonte (facoltativa)</label><input value="${attr(d.source)}" placeholder="Es. Xanathar's, homebrew" oninput="hbDraft.source=this.value"></div>
      ${d.kind==='subclass' ? `<div class="field"><label>Classe</label>
        <select onchange="hbSet('classId', this.value)">
          ${CLASSES_FULL.map(c=>`<option value="${c.id}" ${d.classId===c.id?'selected':''}>${c.name}</option>`).join('')}
        </select></div>` : ''}
    </div>

    <div class="btn-row" style="margin:4px 0 14px">
      <button class="btn btn-ghost btn-sm" onclick="openHbText()">📋 Incolla il testo</button>
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('hb-pdf-file').click()">📄 Da PDF</button>
    </div>
    <input type="file" id="hb-pdf-file" accept="application/pdf,.pdf" style="display:none" onchange="hbReadPdf(this)">

    ${d.kind==='race' ? raceEditorFields(d) : ''}
    ${d.kind==='background' ? bgEditorFields(d) : ''}
    ${d.kind!=='background' ? featureEditor(d) : ''}

    <button class="btn btn-primary btn-block" style="margin-top:14px" onclick="saveHomebrewDraft()">Salva ${K.label.toLowerCase()}</button>
    ${hbReturnToBuilder ? `<button class="btn btn-ghost btn-block" style="margin-top:10px" onclick="hbBackToBuilder()">← Torna alla creazione</button>` : ''}`;
  return modalShell(K.icon + ' ' + (d.name ? escapeHtml(d.name) : 'Nuov' + (d.kind==='race'?'a':'o') + ' ' + K.label.toLowerCase()), inner);
}
function raceEditorFields(d){
  return `
    <div class="form-row-3">
      <div class="field"><label>Velocità (m)</label><input type="number" inputmode="numeric" value="${d.speed}" oninput="hbDraft.speed=parseFloat(this.value)||9"></div>
      <div class="field"><label>Taglia</label>
        <select onchange="hbDraft.size=this.value"><option ${d.size==='Piccola'?'selected':''}>Piccola</option><option ${d.size==='Media'?'selected':''}>Media</option></select>
      </div>
      <div class="field"><label>Lingue</label><input value="${attr(d.languages)}" placeholder="Comune, …" oninput="hbDraft.languages=this.value"></div>
    </div>
    <div class="field"><label>Bonus alle caratteristiche</label>
      <div class="form-row-3">
        ${ABILITIES.map(a=>`<div style="text-align:center">
          <div class="muted" style="font-size:.62rem; font-weight:800; letter-spacing:.06em">${a.abbr}</div>
          <input type="number" inputmode="numeric" min="0" max="4" value="${(d.bonus||{})[a.key]||0}" style="width:100%; text-align:center; padding:7px; border-radius:9px; border:1px solid var(--line); background:var(--bg-1); font-family:var(--font-ui); font-weight:700"
            oninput="hbDraft.bonus=hbDraft.bonus||{}; hbDraft.bonus['${a.key}']=clamp(parseInt(this.value)||0,0,4)">
        </div>`).join('')}
      </div>
    </div>
    <div class="field"><label>Competenze concesse</label>
      <div class="chip-row">${SKILLS.map(s=>`<button class="chip ${(d.grantSkills||[]).includes(s.key)?'active':''}" onclick="hbToggleGrant('${s.key}')">${s.label}</button>`).join('')}</div>
    </div>`;
}
function hbToggleGrant(key){
  hbDraft.grantSkills = hbDraft.grantSkills || [];
  const i = hbDraft.grantSkills.indexOf(key);
  if (i>=0) hbDraft.grantSkills.splice(i,1); else hbDraft.grantSkills.push(key);
  renderModalRoot();
}
function bgEditorFields(d){
  return `
    <div class="field"><label>Due competenze di abilità</label>
      <div class="chip-row">${SKILLS.map(s=>`<button class="chip ${(d.skills||[]).includes(s.key)?'active':''}" onclick="hbToggleBgSkill('${s.key}')">${s.label}</button>`).join('')}</div>
      <div class="field-hint">${(d.skills||[]).length}/2</div>
    </div>
    <div class="form-row">
      <div class="field"><label>Strumenti</label><input value="${attr(d.tools)}" placeholder="Es. arnesi da scasso" oninput="hbDraft.tools=this.value"></div>
      <div class="field"><label>Lingue extra</label><input type="number" inputmode="numeric" min="0" max="3" value="${d.langCount||0}" oninput="hbDraft.langCount=clamp(parseInt(this.value)||0,0,3)"></div>
    </div>
    <div class="field"><label>Privilegio</label><input value="${attr(d.feature)}" placeholder="Es. Occhio dell'investigatore" oninput="hbDraft.feature=this.value"></div>
    <div class="field"><label>Descrizione</label><textarea placeholder="Cosa ti permette di fare" oninput="hbDraft.desc=this.value">${escapeHtml(d.desc||'')}</textarea></div>
    <div class="field"><label>Equipaggiamento iniziale</label><input value="${attr(d.equipment)}" oninput="hbDraft.equipment=this.value"></div>`;
}
function hbToggleBgSkill(key){
  hbDraft.skills = hbDraft.skills || [];
  const i = hbDraft.skills.indexOf(key);
  if (i>=0) hbDraft.skills.splice(i,1);
  else if (hbDraft.skills.length < 2) hbDraft.skills.push(key);
  renderModalRoot();
}
/* Privilegi: per le sottoclassi hanno un livello, per le razze no */
function featureEditor(d){
  const rows = d.kind === 'subclass' ? featureRowsFromMap(d.features) : (d.traits||[]).map((t,i)=>({ i, level:null, name:t[0], desc:t[1] }));
  return `
    <div class="divider"><span class="flourish">❧</span><span>${d.kind==='subclass'?'Privilegi':'Tratti'}</span></div>
    <div class="list-gap">
      ${rows.map((r,i)=>`<div class="card" style="padding:11px 13px">
        <div class="form-row" style="margin-bottom:6px">
          ${d.kind==='subclass'?`<div class="field" style="max-width:82px; margin:0"><label>Livello</label>
            <input type="number" inputmode="numeric" min="1" max="20" value="${r.level}" oninput="hbEditFeature(${i},'level',this.value)"></div>`:''}
          <div class="field" style="margin:0"><label>Nome</label><input value="${attr(r.name)}" oninput="hbEditFeature(${i},'name',this.value)"></div>
        </div>
        <div class="field" style="margin:0"><label>Descrizione</label><textarea style="min-height:56px" oninput="hbEditFeature(${i},'desc',this.value)">${escapeHtml(r.desc)}</textarea></div>
        <button class="btn btn-ghost btn-sm btn-block" style="margin-top:8px" onclick="hbRemoveFeature(${i})">Togli</button>
      </div>`).join('')}
    </div>
    <button class="btn btn-ghost btn-block btn-sm" style="margin-top:10px" onclick="hbAddFeature()">✦ Aggiungi ${d.kind==='subclass'?'privilegio':'tratto'}</button>`;
}
function featureRowsFromMap(map){
  const out = [];
  Object.keys(map||{}).sort((a,b)=>a-b).forEach(lv => (map[lv]||[]).forEach(f => out.push({ level:Number(lv), name:f[0], desc:f[1] })));
  return out;
}
function hbRows(){
  return hbDraft.kind === 'subclass' ? featureRowsFromMap(hbDraft.features) : (hbDraft.traits||[]).map(t=>({level:null,name:t[0],desc:t[1]}));
}
function hbWriteRows(rows){
  if (hbDraft.kind === 'subclass'){
    const map = {};
    rows.forEach(r => { const lv = clamp(r.level||1,1,20); (map[lv] = map[lv] || []).push([r.name, r.desc]); });
    hbDraft.features = map;
  } else {
    hbDraft.traits = rows.map(r => [r.name, r.desc]);
  }
}
function hbEditFeature(i, field, val){
  const rows = hbRows();
  if (!rows[i]) return;
  rows[i][field] = field === 'level' ? clamp(parseInt(val)||1,1,20) : val;
  hbWriteRows(rows);
  if (field === 'level') renderModalRoot();
}
function hbAddFeature(){
  const rows = hbRows();
  rows.push({ level: hbDraft.kind==='subclass' ? 3 : null, name:'', desc:'' });
  hbWriteRows(rows); renderModalRoot();
}
function hbRemoveFeature(i){
  const rows = hbRows(); rows.splice(i,1); hbWriteRows(rows); renderModalRoot();
}
function saveHomebrewDraft(){
  if (!hbDraft.name.trim()){ toast('Dai un nome'); return; }
  if (hbDraft.kind === 'background' && (hbDraft.skills||[]).length !== 2){ toast('Scegli due competenze di abilità'); return; }
  saveHomebrew(hbDraft);
  const name = hbDraft.name;
  const appenaCreato = hbDraft.id;
  const proponi = (typeof campaignReady === 'function') && campaignReady();
  if (hbReturnToBuilder){
    // preseleziona quello appena creato e torna dov'eri
    if (hbDraft.kind === 'subclass') bld.subclassId = hbDraft.id;
    else if (hbDraft.kind === 'background') bld.bgId = hbDraft.id;
    else if (hbDraft.kind === 'race') pickRace(hbDraft.id);
    hbBackToBuilder();
    toast('📚 ' + name + ' aggiunto e selezionato');
    if (proponi) chiediSeCondividere(appenaCreato, name);
    return;
  }
  closeModal(); render();
  toast('📚 ' + name + ' salvato');
  if (proponi) chiediSeCondividere(appenaCreato, name);
  else openHomebrew();
}
function hbBackToBuilder(){
  hbReturnToBuilder = false;
  openModal({ render: builderHTML });
}

/* ─── Riconoscimento del testo ───────────────────────────────────
   Trasforma un blocco di testo (incollato o estratto da un PDF)
   nell'elenco dei privilegi. È un aiuto, non un miracolo: quello che
   ricava resta modificabile prima di salvare.
*/
function detectLevel(s){
  const m = String(s).match(/(\d+)\s*[°ºa]?\s*livello/i) || String(s).match(/livello\s+(\d+)/i) || String(s).match(/\b(\d+)\s*(?:st|nd|rd|th)\s+level\b/i);
  return m ? clamp(parseInt(m[1]), 1, 20) : null;
}
function looksLikeHeading(line){
  const t = line.trim();
  if (!t || t.length > 70) return false;
  if (/[.;:!?]$/.test(t)) return false;
  if (!/^[A-ZÀÈÉÌÒÙ«"']/.test(t)) return false;
  const words = t.split(/\s+/);
  return words.length <= 8;
}
function parseFeatureText(text, kind){
  const raw = String(text || '').replace(/\r/g,'').replace(/[ \t]+/g,' ');
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length);
  const rows = [];
  let cur = null;
  const push = () => { if (cur && (cur.name || cur.desc)) rows.push(cur); };

  lines.forEach(line => {
    // "Nome del privilegio. A partire dal 3° livello, ..."
    const inline = line.match(/^([A-ZÀÈÉÌÒÙ][^.]{2,58})\.\s+([A-ZÀÈÉÌÒÙ].+)$/);
    if (looksLikeHeading(line)){
      push();
      cur = { level: null, name: line.replace(/\s*\.$/,''), desc: '' };
      return;
    }
    if (inline && (!cur || cur.desc.length > 40)){
      push();
      cur = { level: detectLevel(inline[2]), name: inline[1].trim(), desc: inline[2].trim() };
      return;
    }
    if (!cur) cur = { level: null, name: '', desc: '' };
    cur.desc = (cur.desc ? cur.desc + ' ' : '') + line;
    if (cur.level == null) cur.level = detectLevel(line);
  });
  push();

  return rows
    .filter(r => (r.name && r.name.length > 1) || r.desc.length > 30)
    .map(r => ({
      level: r.level || (kind === 'subclass' ? 3 : null),
      name: (r.name || r.desc.split(/[.,;]/)[0] || 'Privilegio').slice(0, 60).trim(),
      desc: r.desc.trim()
    }))
    .slice(0, 30);
}

/* ─── Incolla il testo ─── */
let hbPendingText = '';
function openHbText(prefill){
  hbPendingText = prefill || '';
  openModal({ render: () => hbTextHTML(), after: () => { const el = document.getElementById('hb-text'); if (el && !prefill) el.focus(); } });
}
function hbTextHTML(){
  const rows = hbPendingText ? parseFeatureText(hbPendingText, hbDraft.kind) : [];
  const inner = `
    <p class="muted" style="margin-bottom:12px">Incolla il testo della ${HB_KINDS[hbDraft.kind].label.toLowerCase()} — dal tuo PDF, da un tuo documento, da quello che hai scritto tu. Provo a dividerlo in ${hbDraft.kind==='subclass'?'privilegi con il loro livello':'tratti'}; poi correggi quello che serve.</p>
    <div class="field">
      <textarea id="hb-text" style="min-height:150px; font-size:.84rem" placeholder="Esempio:&#10;Nome del privilegio&#10;A partire dal 3° livello, puoi…&#10;&#10;Altro privilegio&#10;Al 7° livello…" oninput="hbTextChanged(this.value)">${escapeHtml(hbPendingText)}</textarea>
    </div>
    ${hbPendingText ? `
      <div class="card" style="margin-bottom:12px">
        <div class="row-between"><span class="muted">Riconosciuti</span><b>${rows.length} ${hbDraft.kind==='subclass'?'privilegi':'tratti'}</b></div>
      </div>
      <div class="list-gap" style="max-height:230px; overflow:auto; margin-bottom:12px">
        ${rows.map(r=>`<div class="card" style="padding:9px 12px">
          <div class="row-between"><b style="font-size:.84rem">${escapeHtml(r.name)}</b>${r.level?`<span class="badge">${r.level}°</span>`:''}</div>
          <div class="muted" style="font-size:.74rem; margin-top:3px">${escapeHtml(r.desc.slice(0,140))}${r.desc.length>140?'…':''}</div>
        </div>`).join('') || '<p class="muted">Non sono riuscito a dividerlo: puoi comunque inserirlo a mano.</p>'}
      </div>
      <button class="btn btn-primary btn-block" ${rows.length?'':'disabled'} onclick="applyParsedText()">Usa questi ${rows.length}</button>
    ` : ''}
    <button class="btn btn-ghost btn-block" style="margin-top:10px" onclick="reopenHbEditor()">← Torna al modulo</button>`;
  return modalShell('📋 Testo → privilegi', inner);
}
const hbTextChanged = debounce((v)=>{ hbPendingText = v; renderModalRoot(); const el = document.getElementById('hb-text'); if (el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 400);
function applyParsedText(){
  const rows = parseFeatureText(hbPendingText, hbDraft.kind);
  const existing = hbRows();
  hbWriteRows(existing.concat(rows));
  hbPendingText = '';
  reopenHbEditor();
  toast('✓ ' + rows.length + ' voci aggiunte');
}
function reopenHbEditor(){ openModal({ render: homebrewEditorHTML }); }

/* ─── Lettura di un PDF ─── */
let __pdfjsPromise = null;
function loadPdfJs(){
  if (typeof pdfjsLib !== 'undefined') return Promise.resolve(pdfjsLib);
  if (__pdfjsPromise) return __pdfjsPromise;
  __pdfjsPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = './vendor/pdf.min.js';
    s.onload = () => {
      if (typeof pdfjsLib === 'undefined') return reject(new Error('lettore non disponibile'));
      pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.min.js';
      resolve(pdfjsLib);
    };
    s.onerror = () => { __pdfjsPromise = null; reject(new Error('impossibile caricare il lettore PDF')); };
    document.head.appendChild(s);
  });
  return __pdfjsPromise;
}
// Ricostruisce gli a capo dalle coordinate: senza, il testo estratto
// diventa un unico blocco e non si capisce più dove finisce un privilegio.
async function extractPdfText(buffer, from, to){
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const first = clamp(from||1, 1, doc.numPages);
  const last = clamp(to||doc.numPages, first, doc.numPages);
  const out = [];
  for (let p = first; p <= last; p++){
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    let txt = '', lastY = null;
    tc.items.forEach(it => {
      const y = it.transform ? it.transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) txt += '\n';
      txt += it.str;
      lastY = y;
    });
    out.push(txt);
  }
  try { doc.destroy(); } catch(e){}
  return { text: out.join('\n\n'), pages: doc.numPages };
}
let hbPdfBuffer = null;
function hbReadPdf(input){
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    hbPdfBuffer = reader.result;
    openModal({ render: () => `<div class="overlay center"><div class="sheet-modal frame" style="text-align:center; padding:34px 20px;">
      <div class="rune-load" style="margin:0 auto 16px"></div>
      <div class="section-title">Leggo il PDF…</div>
      <p class="muted">Resta tutto sul tuo dispositivo.</p></div></div>` });
    try {
      const res = await extractPdfText(hbPdfBuffer, 1, 3);
      hbPdfPages = res.pages;
      openHbPdfRange(res.text);
    } catch(e){
      console.error(e);
      reopenHbEditor();
      toast('⚠️ Non sono riuscito a leggere il testo: se il PDF è una scansione non contiene testo da estrarre');
    }
  };
  reader.onerror = () => toast('⚠️ Impossibile leggere il file');
  reader.readAsArrayBuffer(file);
}
let hbPdfPages = 1, hbPdfFrom = 1, hbPdfTo = 3;
function openHbPdfRange(text){
  hbPendingText = text;
  openModal({ render: () => {
    const inner = `
      <p class="muted" style="margin-bottom:12px">Il PDF ha ${hbPdfPages} pagine. Ho letto le prime ${Math.min(3,hbPdfPages)}: se la ${HB_KINDS[hbDraft.kind].label.toLowerCase()} sta altrove, cambia l'intervallo e rileggi.</p>
      <div class="form-row">
        <div class="field"><label>Da pagina</label><input type="number" inputmode="numeric" min="1" max="${hbPdfPages}" value="${hbPdfFrom}" oninput="hbPdfFrom=clamp(parseInt(this.value)||1,1,${hbPdfPages})"></div>
        <div class="field"><label>A pagina</label><input type="number" inputmode="numeric" min="1" max="${hbPdfPages}" value="${hbPdfTo}" oninput="hbPdfTo=clamp(parseInt(this.value)||1,1,${hbPdfPages})"></div>
      </div>
      <button class="btn btn-gold btn-block" onclick="hbRereadPdf()">↻ Rileggi queste pagine</button>
      <div class="divider"><span class="flourish">❧</span><span>Testo estratto</span></div>
      <div class="field"><textarea style="min-height:160px; font-size:.8rem" oninput="hbPendingText=this.value">${escapeHtml(hbPendingText.slice(0,20000))}</textarea></div>
      <button class="btn btn-primary btn-block" onclick="openHbText(hbPendingText)">Analizza questo testo →</button>
      <button class="btn btn-ghost btn-block" style="margin-top:10px" onclick="reopenHbEditor()">← Torna al modulo</button>`;
    return modalShell('📄 Testo dal PDF', inner);
  }});
}
async function hbRereadPdf(){
  if (!hbPdfBuffer) return;
  try {
    const res = await extractPdfText(hbPdfBuffer, hbPdfFrom, hbPdfTo);
    openHbPdfRange(res.text);
    toast('✓ Pagine ' + hbPdfFrom + '–' + hbPdfTo);
  } catch(e){ toast('⚠️ Lettura non riuscita'); }
}

/* ─── Esporta e importa ─── */
function exportHomebrew(){
  if (!(state.homebrew||[]).length){ toast('Non hai contenuti da esportare'); return; }
  downloadJSON({ app:'grimorio', type:'homebrew', version: APP_VERSION, homebrew: state.homebrew }, 'grimorio-contenuti');
  toast('⤓ Esportati');
}
function importHomebrewFile(input){
  // Anche qui: se non è un JSON è un manuale, e va al lettore.
  const f = input.files && input.files[0];
  if (f && !(/json/i.test(f.type||'') || /\.json$/i.test(f.name||''))){
    input.value = '';
    openHomebrewBulk();
    if (typeof hbBulkUsaFile === 'function') hbBulkUsaFile([f]);
    return;
  }
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try { data = JSON.parse(reader.result); } catch(e){ toast('⚠️ File non valido'); return; }
    const list = Array.isArray(data) ? data : (data.homebrew || []);
    if (!Array.isArray(list) || !list.length){ toast('⚠️ Nessun contenuto trovato nel file'); return; }
    let n = 0;
    list.forEach(h => {
      if (!h || !h.name || !HB_KINDS[h.kind]) return;
      h.id = h.id || uid();
      saveHomebrew(h); n++;
    });
    render(); openHomebrew();
    toast('⤒ ' + n + ' contenuti importati');
  };
  reader.readAsText(file);
}


/* Condivide una singola aggiunta col tavolo */
async function shareOneHomebrew(id){
  const h = (state.homebrew||[]).find(x => x.id === id);
  if (!h) return;
  const n = await shareToCampaign('homebrew', [h]);
  if (n) toast('⚔️ ' + h.name + ' è ora del tavolo');
  renderModalRoot();
}


/* Appena crei un'aggiunta, se sei a un tavolo l'app ti chiede se
   metterla in comune: è il momento in cui ci pensi davvero. */
function chiediSeCondividere(id, nome){
  const camp = state.campaign;
  if (!camp) return;
  setTimeout(() => {
    confirmDialog('Condividere con il tavolo?',
      '«' + nome + '» resta comunque tuo. Condividendolo lo vedranno anche gli altri membri di «' + (camp.name||'la campagna') + '» nella loro creazione guidata.',
      () => { shareOneHomebrew(id); closeModal(); }, 'Condividi');
  }, 700);
}
