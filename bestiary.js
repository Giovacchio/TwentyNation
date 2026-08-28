/* ══════════════════════════════════════════════════════════════
   Grimorio — bestiario SRD, compagni animali e forme selvatiche
   Le creature dell'SRD si consultano, si copiano nel tuo bestiario,
   si buttano nell'iniziativa e si legano alla scheda di un
   personaggio come famiglio, compagno o forma selvatica.
   ══════════════════════════════════════════════════════════════ */

const MONSTER_TYPES = ['bestia','umanoide','non morto','mostruosità','gigante','drago','folletto','melma'];
const COMPANION_KINDS = {
  wildshape: { label:'Forma selvatica', icon:'🐾', hint:'Le bestie in cui puoi trasformarti.' },
  familiar:  { label:'Famiglio',        icon:'🦉', hint:'La creatura evocata dal tuo patto o dal tuo incantesimo.' },
  companion: { label:'Compagno animale',icon:'🐺', hint:'La bestia che combatte al tuo fianco.' },
  mount:     { label:'Cavalcatura',     icon:'🐎', hint:'Destriero o creatura da monta.' },
  summon:    { label:'Evocazione',      icon:'✨', hint:'Creature evocate temporaneamente.' },
};

/* Limiti della forma selvatica del druido, per livello */
function wildShapeLimit(level){
  if (level >= 8) return { cr: 1, note: 'Fino a GS 1, con qualsiasi velocità.' };
  if (level >= 4) return { cr: 0.5, note: 'Fino a GS 1/2, senza velocità di volo.' };
  return { cr: 0.25, note: 'Fino a GS 1/4, senza velocità di volo né di nuoto.' };
}

/* ─── Consultazione del bestiario SRD ─── */
let mbFilter = { q:'', type:'all', maxCr:null, onlyBeasts:false, onlyFam:false, famExtra:[], pick:null };
function openMonsterBrowser(opts){
  mbFilter = Object.assign({ q:'', type:'all', maxCr:null, onlyBeasts:false, onlyFam:false, famExtra:[], pick:null }, opts||{});
  openModal({ render: monsterBrowserHTML });
}
function filteredMonsters(){
  let list = SRD_MONSTERS.slice();
  if (mbFilter.onlyBeasts) list = list.filter(m => m.t === 'bestia');
  if (mbFilter.onlyFam) list = list.filter(m => m.fam || (mbFilter.famExtra || []).includes(m.id));
  if (mbFilter.maxCr != null) list = list.filter(m => crValue(m.cr) <= mbFilter.maxCr);
  if (mbFilter.type !== 'all') list = list.filter(m => m.t === mbFilter.type);
  if (mbFilter.q){
    const q = norm(mbFilter.q);
    list = list.filter(m => norm(m.it).includes(q) || norm(m.n).includes(q) || norm(m.t).includes(q));
  }
  list.sort((a,b) => crValue(a.cr) - crValue(b.cr) || monsterName(a).localeCompare(monsterName(b),'it'));
  return list;
}
function monsterBrowserHTML(){
  const list = filteredMonsters();
  const picking = !!mbFilter.pick;
  const inner = `
    ${mbFilter.hint ? `<p class="muted" style="margin-bottom:12px">${escapeHtml(mbFilter.hint)}</p>` : ''}
    <div class="search-wrap">
      <span class="search-ic">🔍</span>
      <input id="mb-search" placeholder="Cerca una creatura…" value="${attr(mbFilter.q)}" oninput="mbSearch(this.value)" autocomplete="off">
    </div>
    ${(!mbFilter.onlyFam && !mbFilter.onlyBeasts) ? `<div class="filter-bar">
      <button class="filter-chip ${mbFilter.type==='all'?'active':''}" onclick="mbSet('type','all')">Tutti</button>
      ${MONSTER_TYPES.map(t=>`<button class="filter-chip ${mbFilter.type===t?'active':''}" onclick="mbSet('type','${t}')">${t}</button>`).join('')}
    </div>` : ''}
    <div class="muted" style="margin:2px 0 10px">${list.length} creatur${list.length===1?'a':'e'}</div>
    <div class="list-gap">
      ${list.map(m=>`<div class="spell-item" style="padding:10px 12px">
        <span class="spell-lvl-badge" style="background:var(--card-hi); color:var(--gold); border:1px solid var(--gold-dim); flex-direction:column; line-height:1; gap:1px" title="Grado di sfida"><span style="font-size:.5rem; opacity:.75; letter-spacing:.06em">GS</span><span style="font-size:${String(m.cr).length>2?'.6rem':'.72rem'}">${m.cr}</span></span>
        <button class="spell-item-body" style="text-align:left" onclick="viewMonster('${m.id}'${picking?`,'${mbFilter.pick}'`:''})">
          <span class="spell-item-name">${escapeHtml(monsterName(m))}</span>
          <span class="spell-item-meta">${m.sz} · ${m.t} · CA ${m.ac} · PF ${m.hp}</span>
        </button>
        <button class="spell-item-add" onclick="${picking ? `pickMonster('${m.id}')` : `addMonsterToBestiary('${m.id}')`}" aria-label="Aggiungi">✦</button>
      </div>`).join('') || emptyState('🔍','Nessuna creatura trovata.')}
    </div>`;
  return modalShell(mbFilter.title || '🐉 Bestiario SRD', inner);
}
const mbSearch = debounce((v)=>{ mbFilter.q = v; renderModalRoot({ toTop:true }); }, 220);
function mbSet(k,v){ mbFilter[k] = v; renderModalRoot({ toTop:true }); }

/* ─── Blocco delle statistiche ─── */
function viewMonster(id, pickKind, companionRef){
  const m = MONSTER_BY_ID[id];
  if (!m) return;
  openModal({ render: () => monsterSheetHTML(m, pickKind, companionRef) });
}
function monsterSheetHTML(m, pickKind, companionRef){
  const comp = companionRef ? findCompanion(companionRef) : null;
  const abRow = ABILITIES.map((a,i)=>`<div class="ability-seal" style="padding:7px 2px">
      <div class="lbl" style="font-size:.55rem">${a.abbr}</div>
      <div class="mod" style="font-size:.95rem; margin-top:2px">${m.ab[i]}</div>
      <div class="score">${modStr(m.ab[i])}</div>
    </div>`).join('');
  const inner = `
    <div class="muted" style="font-style:italic; margin-bottom:10px">${m.sz} · ${m.t} · GS ${m.cr}${state.spellLang==='en'?'':' · '+escapeHtml(m.n)}</div>
    ${comp ? companionHpBlock(comp) : ''}
    <div class="combat-grid" style="margin-bottom:10px">
      <div class="combat-stat"><div class="v">${m.ac}</div><div class="l">CA</div></div>
      <div class="combat-stat"><div class="v">${m.hp}</div><div class="l">PF (${m.hd})</div></div>
      <button class="combat-stat tappable" onclick="rollMonsterHp('${m.id}')"><div class="v">🎲</div><div class="l">Tira i PF</div></button>
    </div>
    <div class="ability-grid" style="grid-template-columns:repeat(6,1fr); gap:5px; margin-bottom:12px">${abRow}</div>
    <div class="card" style="margin-bottom:12px">
      <div class="row-between" style="margin-bottom:6px"><span class="muted">Velocità</span><b style="text-align:right">${escapeHtml(m.sp)}</b></div>
      ${m.sk ? `<div class="row-between" style="margin-bottom:6px"><span class="muted">Abilità</span><b style="text-align:right;font-size:.8rem">${Object.keys(m.sk).map(k=>{const s=SKILLS.find(x=>x.key===k); return (s?s.label:k)+' '+signStr(m.sk[k]);}).join(', ')}</b></div>` : ''}
      ${m.sen ? `<div class="row-between"><span class="muted">Sensi</span><b style="text-align:right;font-size:.8rem">${escapeHtml(m.sen)}</b></div>` : ''}
    </div>
    ${(m.tr||[]).length ? `<div class="divider"><span class="flourish">❧</span><span>Tratti</span></div>
      <div class="list-gap">${m.tr.map(t=>`<div class="card" style="padding:10px 13px">
        <b style="font-size:.85rem">${escapeHtml(t[0])}</b>
        <div class="muted" style="font-size:.78rem; margin-top:3px">${escapeHtml(t[1])}</div></div>`).join('')}</div>` : ''}
    ${(m.act||[]).length ? `<div class="divider"><span class="flourish">❧</span><span>Azioni</span></div>
      <div class="list-gap">${m.act.map((a,i)=>`<div class="attack-row">
        <div class="attack-main" style="pointer-events:none">
          <div class="attack-name">${escapeHtml(a[0])}</div>
          ${a[3]?`<div class="muted" style="font-size:.72rem">${escapeHtml(a[3])}</div>`:''}
        </div>
        ${a[1] && a[1]!=='—' ? `<button class="attack-btn" onclick="rollMonsterAttack('${m.id}',${i})">${escapeHtml(a[1])}</button>` : ''}
        ${a[2] && a[2]!=='—' ? `<button class="attack-btn dmg" onclick="rollMonsterDamage('${m.id}',${i})">${escapeHtml(a[2].split(' ')[0])}</button>` : ''}
      </div>`).join('')}</div>` : ''}
    <div class="list-gap" style="margin-top:16px">
      ${pickKind ? `<button class="btn btn-primary btn-block" onclick="pickMonster('${m.id}')">✦ Scegli questa creatura</button>` : ''}
      ${comp ? `<button class="btn btn-danger btn-block" onclick="removeCompanion('${comp.charId}','${comp.c.cid}')">Togli dalla scheda</button>` : ''}
      ${!pickKind && !comp ? `<div class="btn-row">
        <button class="btn btn-primary" onclick="addMonsterToBestiary('${m.id}')">Al bestiario</button>
        <button class="btn btn-gold" onclick="addMonsterToCombat('${m.id}')">All'iniziativa</button>
      </div>` : ''}
    </div>
    <div class="spell-source-note">Statistiche dal System Reference Document 5.1 di Wizards of the Coast, licenza Open Gaming License 1.0a.</div>`;
  return modalShell(escapeHtml(monsterName(m)), inner);
}
function rollMonsterHp(id){
  const m = MONSTER_BY_ID[id];
  const res = rollDiceExpression(m.hd);
  toast('🎲 ' + monsterName(m) + ': ' + Math.max(1,res.total) + ' PF — ' + res.parts.join(' '));
}
function rollMonsterAttack(id, i){
  const m = MONSTER_BY_ID[id];
  const a = m.act[i];
  performD20(monsterName(m) + ' · ' + a[0], parseInt(a[1]) || 0, 'normal', { t:'plain' });
}
function rollMonsterDamage(id, i){
  const m = MONSTER_BY_ID[id];
  const a = m.act[i];
  const res = rollDiceExpression(a[2]);
  if (!res.parts.length){ toast('Danni non riconosciuti'); return; }
  state.diceHistory.unshift({ label: monsterName(m) + ' · ' + a[0], total: res.total, detail: res.parts.join(' ') });
  saveSession();
  toast('🎲 ' + res.total + ' danni — ' + res.parts.join(' '));
}
function monsterToNpc(m){
  return { id: uid(), name: monsterName(m), type: m.sz + ' ' + m.t + ', GS ' + m.cr, avatar: monsterAvatar(m),
    ac: m.ac, hpMax: m.hp, hpCurrent: m.hp, speed: parseFloat(m.sp) || 9,
    notes: [(m.tr||[]).map(t=>t[0]+': '+t[1]).join('\n'), (m.act||[]).map(a=>a[0]+' '+a[1]+' · '+a[2]+(a[3]?' · '+a[3]:'')).join('\n')].filter(Boolean).join('\n\n'),
    srdId: m.id, createdAt: Date.now() };
}
function monsterAvatar(m){
  const byType = { bestia:'🐺', umanoide:'🗡️', 'non morto':'💀', mostruosità:'🐲', gigante:'🪓', drago:'🐉', folletto:'🧚', melma:'🟢' };
  return byType[m.t] || '🐉';
}
function addMonsterToBestiary(id){
  const m = MONSTER_BY_ID[id];
  const npc = monsterToNpc(m);
  state.npcs.push(npc);
  fsSet('npcs', npc);
  if (!currentUser) state.offlineMode = true;
  render();
  toast('🐉 ' + npc.name + ' nel tuo bestiario');
}
function addMonsterToCombat(id){
  const m = MONSTER_BY_ID[id];
  const dex = mod(m.ab[1]);
  const hpRoll = rollDiceExpression(m.hd);
  const hp = Math.max(1, hpRoll.total || m.hp);
  state.combat.list.push({ refId:null, kind:'monster', srdId:m.id, name: uniqueCombatName(monsterName(m)),
    avatar: monsterAvatar(m), init: rollDie(20) + dex, hp, hpMax: hp });
  sortCombat(); saveSession();
  state.view = 'dm'; state.dmTab = 'initiative';
  closeModal(); render();
  toast('⚔️ ' + monsterName(m) + ' in campo con ' + hp + ' PF');
}

/* ─── Compagni legati alla scheda ─── */
function findCompanion(ref){
  const [charId, cid] = String(ref).split('|');
  const c = charById(charId);
  if (!c) return null;
  const comp = (c.companions||[]).find(x => x.cid === cid);
  return comp ? { charId, c: comp, char: c } : null;
}
function companionHpBlock(found){
  const comp = found.c;
  const pct = comp.hp && comp.hp.max ? clamp(100*comp.hp.current/comp.hp.max, 0, 100) : 0;
  return `<div class="hp-block" style="margin-bottom:12px">
    <div class="hp-block-top">
      <div><span class="hp-num">${comp.hp.current}</span> <span class="hp-max">/ ${comp.hp.max} PF</span></div>
      <span class="badge">${COMPANION_KINDS[comp.kind]?COMPANION_KINDS[comp.kind].label:''}</span>
    </div>
    <div class="hp-bar-lg"><div class="hp-bar-lg-fill ${pct<=25?'low':''}" style="width:${pct}%"></div></div>
    <div class="hp-controls">
      <button class="stepper-btn" onclick="bumpCompanionHp('${found.charId}','${comp.cid}',-5)">−5</button>
      <button class="stepper-btn" onclick="bumpCompanionHp('${found.charId}','${comp.cid}',-1)">−</button>
      <button class="stepper-btn big" onclick="bumpCompanionHp('${found.charId}','${comp.cid}',999)">Cura tutto</button>
      <button class="stepper-btn" onclick="bumpCompanionHp('${found.charId}','${comp.cid}',1)">+</button>
      <button class="stepper-btn" onclick="bumpCompanionHp('${found.charId}','${comp.cid}',5)">+5</button>
    </div>
  </div>`;
}
function bumpCompanionHp(charId, cid, delta){
  const c = charById(charId); if (!c) return;
  const comp = (c.companions||[]).find(x => x.cid === cid); if (!comp) return;
  comp.hp.current = delta === 999 ? comp.hp.max : clamp(comp.hp.current + delta, 0, comp.hp.max);
  scheduleSave('characters', c);
  renderModalRoot(); render();
}
function addCompanion(charId, kind){
  const c = charById(charId); if (!c) return;
  const opts = { pick: charId + '|' + kind, title: COMPANION_KINDS[kind].icon + ' ' + COMPANION_KINDS[kind].label, hint: COMPANION_KINDS[kind].hint };
  if (kind === 'familiar') opts.onlyFam = true;
  if (kind === 'wildshape'){
    const lim = (typeof limiteForma === 'function') ? limiteForma(c) : wildShapeLimit(c.level);
    opts.onlyBeasts = true; opts.maxCr = lim.cr;
    opts.hint = 'Druido di ' + c.level + '° livello' + (lim.da ? ' · ' + lim.da : '') + ': ' + lim.note;
  }
  if (kind === 'familiar' && typeof famigliDi === 'function'){
    const f = famigliDi(c);
    if (f.qualsiasiBestia){ opts.onlyFam = false; opts.onlyBeasts = true; opts.maxCr = f.gsMax != null ? f.gsMax : 1; }
    else if (f.extra.length) opts.famExtra = f.extra;
    if (f.da) opts.hint = COMPANION_KINDS.familiar.hint + ' Con ' + f.da + ' puoi sceglierne altri.';
  }
  if (kind === 'companion' || kind === 'mount') opts.onlyBeasts = true;
  openMonsterBrowser(opts);
}
function pickMonster(monsterId){
  const [charId, kind] = String(mbFilter.pick || '').split('|');
  const c = charById(charId); const m = MONSTER_BY_ID[monsterId];
  if (!c || !m) return;
  c.companions = c.companions || [];
  c.companions.push({ cid: uid(), monsterId, kind, name: monsterName(m), hp: { current: m.hp, max: m.hp }, notes: '' });
  scheduleSave('characters', c);
  closeModal(); render();
  toast(COMPANION_KINDS[kind].icon + ' ' + monsterName(m) + ' aggiunto alla scheda');
}
function removeCompanion(charId, cid){
  const c = charById(charId); if (!c) return;
  c.companions = (c.companions||[]).filter(x => x.cid !== cid);
  if (c.activeForm === cid) c.activeForm = null;
  scheduleSave('characters', c);
  closeModal(); render();
}
function openCompanion(charId, cid){
  const c = charById(charId); if (!c) return;
  const comp = (c.companions||[]).find(x => x.cid === cid); if (!comp) return;
  viewMonster(comp.monsterId, null, charId + '|' + cid);
}
/* Trasformazione del druido: i PF della bestia diventano i tuoi finché dura */
function toggleWildShape(charId, cid){
  const c = charById(charId); if (!c) return;
  if (c.activeForm === cid){
    c.activeForm = null;
    scheduleSave('characters', c); render();
    toast('↩️ Sei tornato alla tua forma');
    return;
  }
  const comp = (c.companions||[]).find(x => x.cid === cid); if (!comp) return;
  const m = MONSTER_BY_ID[comp.monsterId];
  comp.hp = { current: m ? m.hp : comp.hp.max, max: m ? m.hp : comp.hp.max };
  c.activeForm = cid;
  scheduleSave('characters', c); render();
  toast('🐾 Ti trasformi in ' + comp.name);
}
/* Le statistiche che servono al tavolo, senza aprire nulla:
   CA, PF, velocità, caratteristiche, sensi, tratti e attacchi
   già tirabili. Chi è in forma resta sempre aperto. */
let expandedComp = {};
function toggleCompanionDetails(cid){
  expandedComp[cid] = !expandedComp[cid];
  render();
}
function compStatLine(m){
  if (!m) return '';
  return ABILITIES.map((a,i)=>`<div class="comp-ab">
    <span class="k">${a.abbr}</span>
    <span class="n">${m.ab[i]}</span>
    <span class="muted">${modStr(m.ab[i])}</span>
  </div>`).join('');
}
function companionDetailHTML(c, comp, m){
  if (!m) return '<div class="muted" style="font-size:.76rem; padding:8px 2px">Creatura non trovata nel bestiario.</div>';
  return `
    <div class="comp-details">
      <div class="comp-stats">${compStatLine(m)}</div>
      <div class="muted" style="font-size:.74rem; margin-top:6px">
        Velocità ${escapeHtml(m.sp)}${m.sen?' · '+escapeHtml(m.sen):''}${m.sk?' · '+Object.keys(m.sk).map(k=>{const sk=SKILLS.find(x=>x.key===k); return (sk?sk.label:k)+' '+signStr(m.sk[k]);}).join(', '):''}
      </div>
      ${(m.tr||[]).length ? `<div class="comp-sub">Tratti</div>
        ${m.tr.map(t=>`<div style="margin-bottom:5px"><b style="font-size:.78rem">${escapeHtml(t[0])}</b><span class="muted" style="font-size:.75rem"> — ${escapeHtml(t[1])}</span></div>`).join('')}` : ''}
      ${(m.act||[]).length ? `<div class="comp-sub">Azioni</div>
        <div class="list-gap">${m.act.map((a,i)=>`<div class="attack-row" style="padding:7px 9px">
          <div class="attack-main" style="pointer-events:none">
            <div class="attack-name" style="font-size:.82rem">${escapeHtml(a[0])}</div>
            ${a[3]?`<div class="muted" style="font-size:.7rem">${escapeHtml(a[3])}</div>`:''}
          </div>
          ${a[1] && a[1]!=='—' ? `<button class="attack-btn" style="min-width:46px" onclick="event.stopPropagation(); rollMonsterAttack('${m.id}',${i})">${escapeHtml(a[1])}</button>` : ''}
          ${a[2] && a[2]!=='—' ? `<button class="attack-btn dmg" style="min-width:52px" onclick="event.stopPropagation(); rollMonsterDamage('${m.id}',${i})">${escapeHtml(a[2].split(' ')[0])}</button>` : ''}
        </div>`).join('')}</div>` : ''}
      <div class="btn-row" style="margin-top:10px">
        <button class="btn btn-ghost btn-sm" onclick="openCompanion('${c.id}','${comp.cid}')">Scheda intera</button>
        <button class="btn btn-ghost btn-sm" onclick="bumpCompanionHp('${c.id}','${comp.cid}',999)">Cura tutto</button>
      </div>
    </div>`;
}

function companionsBlockHTML(c){
  const list = c.companions || [];
  const isDruid = /druido/i.test(c.classField||'');
  const kinds = Object.keys(COMPANION_KINDS).filter(k => k !== 'wildshape' || isDruid);
  return `
    <div class="divider"><span class="flourish">❧</span><span>Compagni e forme</span></div>
    ${list.length ? `<div class="list-gap">${list.map(comp=>{
      const m = MONSTER_BY_ID[comp.monsterId];
      const pct = comp.hp && comp.hp.max ? clamp(100*comp.hp.current/comp.hp.max,0,100) : 0;
      const active = c.activeForm === comp.cid;
      const open = active || !!expandedComp[comp.cid];
      const kind = COMPANION_KINDS[comp.kind];
      return `<div class="comp-card ${active?'active':''}">
        <div class="comp-head">
          <button class="comp-title" onclick="toggleCompanionDetails('${comp.cid}')">
            <div class="attack-name">${kind?kind.icon:'🐾'} ${escapeHtml(comp.name)}${active?' · in forma':''} <span class="muted" style="font-size:.72rem">${open?'▴':'▾'}</span></div>
            <div class="muted" style="font-size:.72rem; margin-top:2px">${kind?kind.label:''}${m?(' · CA '+m.ac+' · GS '+m.cr+' · '+m.sz+' '+m.t):''}</div>
          </button>
          ${comp.kind==='wildshape' ? `<button class="attack-btn" style="min-width:46px" onclick="toggleWildShape('${c.id}','${comp.cid}')" title="${active?'Torna normale':'Trasformati'}">${active?'↩️':'🐾'}</button>` : ''}
        </div>
        <div class="comp-hp">
          <button class="stepper-btn sm" onclick="bumpCompanionHp('${c.id}','${comp.cid}',-5)">−5</button>
          <button class="stepper-btn sm" onclick="bumpCompanionHp('${c.id}','${comp.cid}',-1)">−</button>
          <div class="comp-hp-mid">
            <div style="font-size:.8rem"><b>${comp.hp.current}</b><span class="muted"> / ${comp.hp.max} PF</span></div>
            <div class="hp-mini" style="margin-top:4px"><div class="hp-mini-fill ${pct<=25?'low':''}" style="width:${pct}%"></div></div>
          </div>
          <button class="stepper-btn sm" onclick="bumpCompanionHp('${c.id}','${comp.cid}',1)">+</button>
          <button class="stepper-btn sm" onclick="bumpCompanionHp('${c.id}','${comp.cid}',5)">+5</button>
        </div>
        ${open ? companionDetailHTML(c, comp, m) : ''}
      </div>`;
    }).join('')}</div>` : `<div class="muted" style="text-align:center;padding:8px 10px">Famigli, compagni animali e forme selvatiche: li prendi dal bestiario e li tieni qui, con statistiche, attacchi e punti ferita sotto mano.</div>`}
    <div class="chip-row" style="margin-top:10px; justify-content:center">
      ${kinds.map(k=>`<button class="chip" onclick="addCompanion('${c.id}','${k}')">${COMPANION_KINDS[k].icon} ${COMPANION_KINDS[k].label}</button>`).join('')}
    </div>`;
}
