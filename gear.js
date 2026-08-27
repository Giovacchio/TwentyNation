/* ══════════════════════════════════════════════════════════════
   Grimorio — negozio e tabelle dell'equipaggiamento
   Scegli l'arma vera invece di scrivertela: finisce nello zaino
   col peso giusto e, se vuoi, diventa una riga d'attacco già
   calcolata. Le armature ti dicono che Classe Armatura ti danno.
   ══════════════════════════════════════════════════════════════ */

let gearFilter = { q:'', tab:'armi', k:'all', charId:null };
function openGear(charId, tab){
  gearFilter = { q:'', tab: tab || 'armi', k:'all', charId: charId || null };
  openModal({ render: gearHTML });
}
const gearSearch = debounce((v)=>{ gearFilter.q = v; renderModalRoot({ toTop:true }); }, 220);
function gearSet(k,v){ gearFilter[k] = v; renderModalRoot({ toTop:true }); }

function gearList(){
  const q = norm(gearFilter.q);
  const match = (x, extra) => !q || norm(gearName(x)).includes(q) || (x.n && norm(x.n).includes(q)) || (extra && norm(extra).includes(q));
  if (gearFilter.tab === 'armi'){
    let l = SRD_WEAPONS.filter(w => match(w, w.dt + ' ' + (w.p||[]).join(' ')));
    if (gearFilter.k !== 'all') l = l.filter(w => gearFilter.k === 'semplice' || gearFilter.k === 'guerra' ? w.cat === gearFilter.k : w.r === gearFilter.k);
    return l;
  }
  if (gearFilter.tab === 'armature'){
    let l = SRD_ARMORS.filter(a => match(a, a.cat));
    if (gearFilter.k !== 'all') l = l.filter(a => a.cat === gearFilter.k);
    return l;
  }
  let l = SRD_GEAR.filter(g => match(g, g.k + ' ' + (g.d||'')));
  if (gearFilter.k !== 'all') l = l.filter(g => g.k === gearFilter.k);
  return l;
}

function gearHTML(){
  const c = gearFilter.charId ? charById(gearFilter.charId) : null;
  const list = gearList();
  const tab = gearFilter.tab;
  const filters = tab === 'armi' ? ['semplice','guerra','mischia','distanza']
                : tab === 'armature' ? ['leggera','media','pesante','scudo']
                : GEAR_KINDS;
  const inner = `
    ${c ? `<p class="muted" style="margin-bottom:12px">Quello che scegli finisce nello zaino di ${escapeHtml(c.name||'questo personaggio')}, col peso già dentro.</p>` : ''}
    <div class="segmented" style="margin-bottom:12px">
      <button class="${tab==='armi'?'active':''}" onclick="gearTab('armi')">⚔️ Armi</button>
      <button class="${tab==='armature'?'active':''}" onclick="gearTab('armature')">🛡️ Armature</button>
      <button class="${tab==='roba'?'active':''}" onclick="gearTab('roba')">🎒 Attrezzatura</button>
    </div>
    <div class="search-wrap">
      <span class="search-ic">🔍</span>
      <input id="gear-search" placeholder="Cerca…" value="${attr(gearFilter.q)}" oninput="gearSearch(this.value)" autocomplete="off">
    </div>
    <div class="filter-bar">
      <button class="filter-chip ${gearFilter.k==='all'?'active':''}" onclick="gearSet('k','all')">Tutto</button>
      ${filters.map(f=>`<button class="filter-chip ${gearFilter.k===f?'active':''}" onclick="gearSet('k','${f}')">${f}</button>`).join('')}
    </div>
    <div class="muted" style="margin:2px 0 10px">${list.length} voc${list.length===1?'e':'i'}</div>
    <div class="list-gap">
      ${list.map(x => tab==='armi' ? weaponRowHTML(x, c) : (tab==='armature' ? armorRowHTML(x, c) : gearRowHTML(x, c))).join('')
        || emptyState('🔍','Niente con questi filtri.')}
    </div>
    <div class="spell-source-note">Tabelle dal System Reference Document 5.1 di Wizards of the Coast, licenza Open Gaming License 1.0a.</div>`;
  return modalShell('🎒 Equipaggiamento', inner);
}
function gearTab(t){ gearFilter.tab = t; gearFilter.k = 'all'; renderModalRoot({ toTop:true }); }

function costLabel(c){
  if (c == null) return '';
  if (c >= 1) return (Math.round(c*100)/100).toString().replace('.',',') + ' mo';
  if (c >= 0.1) return Math.round(c*10) + ' ma';
  return Math.round(c*100) + ' mr';
}
function weightLabel(w){ return w ? String(w).replace('.',',') + ' kg' : '—'; }

function weaponRowHTML(w, c){
  const ab = c ? weaponAbility(w, c) : null;
  const bonus = c ? (ab.m + (proficientWith(w,c) ? profBonus(c.level) : 0)) : null;
  return `<div class="gear-row">
    <button class="gear-main" onclick="viewGear('arma','${w.id}')">
      <div class="gear-name">${escapeHtml(gearName(w))}</div>
      <div class="gear-meta">${w.d} ${w.dt} · ${w.cat} ${w.r}${(w.p||[]).length?' · '+(w.p||[]).join(', '):''}</div>
      <div class="gear-cost">${costLabel(w.c)} · ${weightLabel(w.w)}</div>
    </button>
    ${c ? `<div class="gear-actions">
      <span class="gear-bonus" title="Tiro per colpire con questo personaggio">${signStr(bonus)}</span>
      <button class="btn-icon" style="width:34px;height:34px" title="Nello zaino" onclick="buyGear('${c.id}','arma','${w.id}')">✦</button>
      <button class="btn-icon" style="width:34px;height:34px" title="Aggiungi agli attacchi" onclick="weaponToAttack('${c.id}','${w.id}')">⚔️</button>
    </div>` : `<span class="gear-cost-only">${costLabel(w.c)}</span>`}
  </div>`;
}
function armorRowHTML(a, c){
  const dex = c ? mod(getPath(c,'abilities.dex',10)) : 0;
  const ac = armorAC(a, dex);
  return `<div class="gear-row">
    <button class="gear-main" onclick="viewGear('armatura','${a.id}')">
      <div class="gear-name">${escapeHtml(gearName(a))}</div>
      <div class="gear-meta">${a.cat==='scudo' ? ('+'+a.ac+' alla CA') : ('CA ' + a.ac + (a.dex==='full'?' + Des':(a.dex==='max2'?' + Des (max 2)':'')))}${a.str?(' · Forza '+a.str):''}${a.stealth?' · svantaggio a Furtività':''}</div>
      <div class="gear-cost">${costLabel(a.c)} · ${weightLabel(a.w)}</div>
    </button>
    ${c ? `<div class="gear-actions">
      <span class="gear-bonus" title="La CA che ti darebbe">${a.cat==='scudo' ? ('+'+a.ac) : ac}</span>
      <button class="btn-icon" style="width:34px;height:34px" title="Nello zaino" onclick="buyGear('${c.id}','armatura','${a.id}')">✦</button>
      <button class="btn-icon" style="width:34px;height:34px" title="Indossala e aggiorna la CA" onclick="wearArmor('${c.id}','${a.id}')">🛡️</button>
    </div>` : `<span class="gear-cost-only">${costLabel(a.c)}</span>`}
  </div>`;
}
function gearRowHTML(g, c){
  return `<div class="gear-row">
    <button class="gear-main" onclick="viewGear('roba','${g.id}')">
      <div class="gear-name">${escapeHtml(gearName(g))}</div>
      <div class="gear-meta">${g.k}${g.d?' · '+escapeHtml(g.d):''}</div>
      <div class="gear-cost">${costLabel(g.c)} · ${weightLabel(g.w)}</div>
    </button>
    ${c ? `<div class="gear-actions">
      <button class="btn-icon" style="width:34px;height:34px" title="Nello zaino" onclick="buyGear('${c.id}','roba','${g.id}')">✦</button>
    </div>` : `<span class="gear-cost-only">${costLabel(g.c)}</span>`}
  </div>`;
}

/* ─── Scheda della voce ─── */
function viewGear(kind, id){
  const x = kind==='arma' ? WEAPON_BY_ID[id] : (kind==='armatura' ? ARMOR_BY_ID[id] : GEAR_BY_ID[id]);
  if (!x) return;
  const c = gearFilter.charId ? charById(gearFilter.charId) : null;
  const props = (x.p||[]).map(p => {
    const base = String(p).split(' (')[0];
    return `<div style="margin-bottom:6px"><b style="font-size:.83rem">${escapeHtml(p)}</b>${WEAPON_PROPS[base]?`<div class="muted" style="font-size:.76rem">${escapeHtml(WEAPON_PROPS[base])}</div>`:''}</div>`;
  }).join('');
  openModal({ render: () => modalShell(escapeHtml(gearName(x)), `
    <div class="muted" style="font-style:italic; margin-bottom:12px">${kind==='arma'?(x.cat+' '+x.r):(kind==='armatura'?('armatura '+x.cat):x.k)}${x.n && state.spellLang!=='en'?' · '+escapeHtml(x.n):''}</div>
    <div class="card" style="margin-bottom:12px">
      ${kind==='arma' ? `<div class="row-between" style="margin-bottom:6px"><span class="muted">Danni</span><b>${x.d} ${x.dt}</b></div>` : ''}
      ${kind==='armatura' ? `<div class="row-between" style="margin-bottom:6px"><span class="muted">Classe Armatura</span><b>${x.cat==='scudo'?('+'+x.ac):(x.ac + (x.dex==='full'?' + Des':(x.dex==='max2'?' + Des (max 2)':'')))}</b></div>` : ''}
      ${kind==='armatura' && x.str ? `<div class="row-between" style="margin-bottom:6px"><span class="muted">Forza richiesta</span><b>${x.str}</b></div>` : ''}
      ${kind==='armatura' && x.stealth ? `<div class="row-between" style="margin-bottom:6px"><span class="muted">Furtività</span><b style="color:var(--warn)">svantaggio</b></div>` : ''}
      <div class="row-between" style="margin-bottom:6px"><span class="muted">Costo</span><b>${costLabel(x.c)}</b></div>
      <div class="row-between"><span class="muted">Peso</span><b>${weightLabel(x.w)}</b></div>
    </div>
    ${x.d && kind==='roba' ? `<p class="muted" style="font-size:.85rem; margin-bottom:12px">${escapeHtml(x.d)}</p>` : ''}
    ${props ? `<div class="divider"><span class="flourish">❧</span><span>Proprietà</span></div>${props}` : ''}
    ${c ? `<div class="list-gap" style="margin-top:16px">
      <button class="btn btn-primary btn-block" onclick="buyGear('${c.id}','${kind}','${x.id}')">✦ Nello zaino</button>
      ${kind==='arma' ? `<button class="btn btn-gold btn-block" onclick="weaponToAttack('${c.id}','${x.id}')">⚔️ Aggiungi agli attacchi</button>` : ''}
      ${kind==='armatura' ? `<button class="btn btn-gold btn-block" onclick="wearArmor('${c.id}','${x.id}')">🛡️ Indossala e aggiorna la CA</button>` : ''}
    </div>` : ''}
    <div class="spell-source-note">System Reference Document 5.1, Open Gaming License 1.0a.</div>`) });
}

/* ─── Nello zaino ─── */
function buyGear(charId, kind, id){
  const c = charById(charId); if (!c) return;
  const x = kind==='arma' ? WEAPON_BY_ID[id] : (kind==='armatura' ? ARMOR_BY_ID[id] : GEAR_BY_ID[id]);
  if (!x) return;
  const notes = kind==='arma' ? (x.d + ' ' + x.dt + ((x.p||[]).length ? ' · ' + (x.p||[]).join(', ') : ''))
              : kind==='armatura' ? (x.cat==='scudo' ? '+' + x.ac + ' alla CA' : ('CA ' + x.ac + (x.dex==='full'?' + Des':(x.dex==='max2'?' + Des (max 2)':'')) + (x.stealth?' · svantaggio a Furtività':'')))
              : (x.d || x.k);
  c.inventory = c.inventory || [];
  const same = c.inventory.find(i => i.gearId === x.id);
  if (same) same.qty = (same.qty||1) + 1;
  else c.inventory.push({ name: gearName(x), qty:1, weight: x.w ? String(x.w) : '', attuned:false, equipped:false, notes, gearId: x.id });
  scheduleSave('characters', c);
  renderModalRoot(); render();
  toast('🎒 ' + gearName(x) + ' nello zaino');
}

/* ─── L'arma diventa una riga d'attacco già calcolata ─── */
function weaponToAttack(charId, weaponId){
  const c = charById(charId), w = WEAPON_BY_ID[weaponId];
  if (!c || !w) return;
  const ab = weaponAbility(w, c);
  const prof = proficientWith(w, c) ? profBonus(c.level) : 0;
  const dmgBonus = ab.m;
  c.attacks = c.attacks || [];
  c.attacks.push({
    name: gearName(w),
    atk: String(ab.m + prof),
    dmg: w.d + (dmgBonus ? (dmgBonus > 0 ? '+' + dmgBonus : String(dmgBonus)) : ''),
    notes: [w.dt, (w.p||[]).join(', ')].filter(Boolean).join(' · '),
    gearId: w.id,
  });
  // se non ce l'ha già, finisce anche nello zaino
  if (!(c.inventory||[]).some(i => i.gearId === w.id)) buyGear(charId, 'arma', weaponId);
  else { scheduleSave('characters', c); renderModalRoot(); render(); }
  toast('⚔️ ' + gearName(w) + ' fra gli attacchi (' + signStr(ab.m + prof) + ')');
}

/* ─── Indossare un'armatura ─── */
function wearArmor(charId, armorId){
  const c = charById(charId), a = ARMOR_BY_ID[armorId];
  if (!c || !a) return;
  const dex = mod(getPath(c,'abilities.dex',10));
  const shieldOn = (c.inventory||[]).some(i => i.gearId === 'shield' && i.equipped);

  if (a.cat === 'scudo'){
    c.ac = (c.ac || 10) + a.ac;
  } else {
    c.ac = armorAC(a, dex) + (shieldOn ? 2 : 0);
    c.armor = gearName(a) + (a.stealth ? ' (svantaggio a Furtività)' : '');
  }
  // togli il segno di indossato dalle altre armature, mettilo su questa
  c.inventory = c.inventory || [];
  if (!c.inventory.some(i => i.gearId === a.id)) buyGear(charId, 'armatura', armorId);
  c.inventory.forEach(i => {
    if (i.gearId && ARMOR_BY_ID[i.gearId] && ARMOR_BY_ID[i.gearId].cat !== 'scudo' && a.cat !== 'scudo') i.equipped = false;
    if (i.gearId === a.id) i.equipped = true;
  });
  if (a.str && getPath(c,'abilities.str',10) < a.str){
    toast('🛡️ CA ' + c.ac + ' — attenzione: serve Forza ' + a.str + ', altrimenti −3 m di velocità');
  } else {
    toast('🛡️ ' + gearName(a) + ' indossata — CA ' + c.ac);
  }
  scheduleSave('characters', c);
  closeModal(); render();
}
