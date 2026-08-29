/* ══════════════════════════════════════════════════════════════
   Grimorio — salita di livello guidata
   Ti dice cosa guadagni, tira (o fa la media) dei punti ferita,
   ti fa scegliere la sottoclasse quando tocca e scrive i nuovi
   privilegi sulla scheda. Le scelte restano tue: l'app fa i conti.
   ══════════════════════════════════════════════════════════════ */

let lvup = null; /* { charId, from, to, classId, subclassId, hpMode, hpRoll } */

function levelUpClassId(c){
  if (c.builder && c.builder.classId && CLASS_BY_ID[c.builder.classId]) return c.builder.classId;
  const byName = CLASSES_FULL.find(cl => cl.name.toLowerCase() === String(c.classField||'').trim().toLowerCase());
  return byName ? byName.id : null;
}

function openLevelUp(charId){
  const c = charById(charId); if (!c) return;
  if ((c.level||1) >= 20){ toast('👑 Sei già al 20° livello'); return; }
  const classId = levelUpClassId(c);
  if (!classId){ openLevelUpClassPicker(charId); return; }
  lvup = {
    charId, from: c.level||1, to: (c.level||1) + 1, classId,
    subclassId: (c.builder && c.builder.subclassId) || null,
    hpMode: 'avg', hpRoll: null, subQ: ''
  };
  listaAzzera('lv-sub');
  openModal({ render: levelUpHTML });
}

/* Se la scheda è stata scritta a mano o importata da PDF non sappiamo la classe: la chiediamo una volta sola. */
function openLevelUpClassPicker(charId){
  const c = charById(charId); if (!c) return;
  openModal({ render: () => modalShell('📈 Che classe sali?', `
    <p class="muted" style="margin-bottom:12px">Questa scheda non è stata creata col builder, quindi non so a quale classe agganciare i privilegi. Scegline una: la ricordo per le prossime volte.</p>
    <div class="list-gap">
      ${CLASSES_FULL.map(cl=>`<button class="attack-row" style="width:100%; text-align:left" onclick="setLevelUpClass('${charId}','${cl.id}')">
        <span class="attack-main"><span class="attack-name">${cl.name}</span>
        <span class="muted" style="font-size:.74rem; display:block">Dado vita d${cl.hitDie} · ${cl.subclassLabel} al ${cl.subclassLevel}°</span></span>
      </button>`).join('')}
    </div>`) });
}
function setLevelUpClass(charId, classId){
  const c = charById(charId); if (!c) return;
  c.builder = Object.assign({}, c.builder, { classId });
  scheduleSave('characters', c);
  closeModal();
  openLevelUp(charId);
}

/* ─── Cosa si guadagna ─── */
function levelUpGains(){
  const c = charById(lvup.charId);
  const cl = CLASS_BY_ID[lvup.classId];
  const sc = lvup.subclassId ? subclassesFor(cl.id).find(s => s.id === lvup.subclassId) : null;
  const lv = lvup.to;

  const feats = (cl.features[lv] || []).map(f => [f[0], f[1], cl.name]);
  if (sc) (sc.features[lv] || []).forEach(f => feats.push([f[0], f[1], sc.name]));

  const abMod = mod(getPath(c, 'abilities.' + (c.spellAbility || cl.spellAbility || 'int'), 10));
  const before = {
    prof: profBonus(lvup.from),
    slots: slotsForCharacter(c.casterType || cl.caster, lvup.from),
    cantrips: (CANTRIPS_KNOWN[cl.id] || [])[lvup.from - 1] || 0,
    known: SPELLS_KNOWN[cl.id] ? (SPELLS_KNOWN[cl.id][lvup.from - 1] || 0) : 0,
    prepared: preparedCount(cl.id, lvup.from, abMod),
  };
  const after = {
    prof: profBonus(lv),
    slots: slotsForCharacter(c.casterType || cl.caster, lv),
    cantrips: (CANTRIPS_KNOWN[cl.id] || [])[lv - 1] || 0,
    known: SPELLS_KNOWN[cl.id] ? (SPELLS_KNOWN[cl.id][lv - 1] || 0) : 0,
    prepared: preparedCount(cl.id, lv, abMod),
  };

  const conMod = mod(getPath(c, 'abilities.con', 10));
  const hitDie = c.hitDie || cl.hitDie;
  const avgGain = Math.max(1, Math.floor(hitDie / 2) + 1 + conMod);
  const rollGain = lvup.hpRoll != null ? Math.max(1, lvup.hpRoll + conMod) : null;

  return { c, cl, sc, lv, feats, before, after, conMod, hitDie, avgGain, rollGain,
    needsSubclass: !lvup.subclassId && lv >= cl.subclassLevel && subclassesFor(cl.id).length > 0,
    isAsi: cl.asi.includes(lv) };
}

function levelUpHTML(){
  const g = levelUpGains();
  const newSlots = g.after.slots.map((n,i)=>({ lvl:i+1, n, was: g.before.slots[i]||0 })).filter(x => x.n > x.was);
  const hpGain = lvup.hpMode === 'roll' ? (g.rollGain != null ? g.rollGain : null) : g.avgGain;

  const inner = `
    <div class="card" style="text-align:center; border-color:var(--gold-dim); margin-bottom:14px">
      <div class="muted" style="font-size:.75rem; letter-spacing:.1em; text-transform:uppercase">${escapeHtml(g.c.name)} · ${escapeHtml(g.cl.name)}</div>
      <div style="font-family:var(--font-head); font-size:1.7rem; color:var(--gold); margin-top:4px">${lvup.from}° → ${lvup.to}°</div>
      ${g.after.prof > g.before.prof ? `<div class="badge" style="margin-top:6px">Bonus di competenza +${g.after.prof}</div>` : ''}
    </div>

    <div class="divider"><span class="flourish">❧</span><span>Punti ferita</span></div>
    <div class="chip-row" style="justify-content:center; margin-bottom:10px">
      <button class="chip ${lvup.hpMode==='avg'?'active':''}" onclick="lvSetHpMode('avg')">Media fissa (+${g.avgGain})</button>
      <button class="chip ${lvup.hpMode==='roll'?'active':''}" onclick="lvSetHpMode('roll')">Tira il d${g.hitDie}</button>
    </div>
    ${lvup.hpMode === 'roll' ? `<div style="text-align:center; margin-bottom:12px">
      <button class="btn btn-ghost" onclick="lvRollHp()">🎲 ${g.rollGain != null ? 'Ritira' : 'Tira'} d${g.hitDie}</button>
      ${g.rollGain != null ? `<div style="margin-top:8px; font-family:var(--font-head); font-size:1.3rem; color:var(--gold)">+${g.rollGain} PF <span class="muted" style="font-size:.8rem">(${lvup.hpRoll} ${g.conMod>=0?'+':''}${g.conMod} COS)</span></div>` : ''}
    </div>` : `<div class="muted" style="text-align:center; margin-bottom:12px">${Math.floor(g.hitDie/2)+1} fissi ${g.conMod>=0?'+':''}${g.conMod} di Costituzione. Il dado vita in più lo hai anche per i riposi brevi.</div>`}

    ${g.needsSubclass ? `
      <div class="divider"><span class="flourish">❧</span><span>${escapeHtml(g.cl.subclassLabel)}</span></div>
      <p class="muted" style="margin-bottom:10px">Al ${g.cl.subclassLevel}° livello scegli la tua strada. Se la tua non c'è, creala tra le aggiunte personali.</p>
      ${(()=>{
        const tutte = subclassesFor(g.cl.id);
        const q = (lvup.subQ || '').trim();
        const viste = q ? tutte.filter(s => norm(s.name||'').includes(norm(q))) : tutte;
        const riga = (s) => `<button class="attack-row" style="width:100%; text-align:left; ${lvup.subclassId===s.id?'border-color:var(--gold)':''}" onclick="lvPickSubclass('${jsStr(s.id)}')">
          <span class="attack-main"><span class="attack-name">${escapeHtml(s.name)}${lvup.subclassId===s.id?' ✓':''}</span></span>
        </button>`;
        return `${tutte.length > 12 ? cercaLista('lv-sub-cerca', q, 'lvCercaSub', 'Cerca fra ' + tutte.length + ' archetipi…') : ''}
        <div style="margin-bottom:12px">${viste.length
          ? bloccoLista('lv-sub', viste, riga, { modale:true, nome:'archetipi' })
          : `<div class="lista-vuota">Nessun archetipo con questo nome.</div>`}</div>`;
      })()}` : ''}

    <div class="divider"><span class="flourish">❧</span><span>Cosa guadagni</span></div>
    ${g.feats.length ? `<div class="list-gap">${g.feats.map(f=>`
      <div class="card" style="padding:11px 13px">
        <b style="font-size:.88rem; color:var(--gold)">${escapeHtml(f[0])}</b>
        <div class="muted" style="font-size:.79rem; margin-top:3px">${escapeHtml(f[1])}</div>
      </div>`).join('')}</div>`
    : `<div class="muted" style="text-align:center; padding:6px 0">Nessun privilegio nuovo a questo livello${g.isAsi?'':' — solo PF e dado vita'}.</div>`}

    ${g.isAsi ? `<div class="card" style="margin-top:10px; border-color:var(--gold-dim)">
      <b style="font-size:.86rem">Aumento dei punteggi di caratteristica</b>
      <div class="muted" style="font-size:.78rem; margin-top:3px">2 punti da distribuire (max +1 a due caratteristiche diverse, o +2 a una), oppure un talento. Li applichi tu nella scheda dopo la salita: l'app non tocca i punteggi.</div>
    </div>` : ''}

    ${newSlots.length ? `<div class="card" style="margin-top:10px">
      <b style="font-size:.86rem">Slot incantesimo</b>
      <div class="muted" style="font-size:.78rem; margin-top:3px">${newSlots.map(s=>`${s.lvl}° livello: ${s.was} → ${s.n}`).join(' · ')}</div>
    </div>` : ''}
    ${(g.after.cantrips > g.before.cantrips || g.after.known > g.before.known || g.after.prepared > g.before.prepared) ? `
      <div class="card" style="margin-top:10px">
        <b style="font-size:.86rem">Incantesimi da scegliere</b>
        <div class="muted" style="font-size:.78rem; margin-top:3px">
          ${g.after.cantrips > g.before.cantrips ? `${g.after.cantrips - g.before.cantrips} trucchetto in più (totale ${g.after.cantrips}).<br>` : ''}
          ${g.after.known > g.before.known ? `${g.after.known - g.before.known} incantesimo conosciuto in più (totale ${g.after.known}).<br>` : ''}
          ${g.after.prepared > g.before.prepared ? `Ora ne prepari ${g.after.prepared} invece di ${g.before.prepared}.` : ''}
        </div>
        <div class="muted" style="font-size:.75rem; margin-top:6px">Dopo la salita ti porto nel grimorio per sceglierli.</div>
      </div>` : ''}

    <button class="btn btn-block" style="margin-top:16px" ${lvup.hpMode==='roll' && g.rollGain==null ? 'disabled' : ''} onclick="confirmLevelUp()">
      ${g.needsSubclass && !lvup.subclassId ? 'Scegli prima la sottoclasse' : `Sali al ${lvup.to}° livello${hpGain!=null?` (+${hpGain} PF)`:''}`}
    </button>`;
  return modalShell('📈 Salita di livello', inner);
}

function lvSetHpMode(m){ lvup.hpMode = m; renderModalRoot(); }
function lvRollHp(){
  const g = levelUpGains();
  lvup.hpRoll = rollDie(g.hitDie);
  renderModalRoot();
}
function lvCercaSub(v){ lvup.subQ = v; listaAzzera('lv-sub'); renderModalRoot(); }
function lvPickSubclass(id){ lvup.subclassId = (lvup.subclassId === id ? null : id); renderModalRoot(); }

function confirmLevelUp(){
  const g = levelUpGains();
  if (g.needsSubclass && !lvup.subclassId){ toast('Scegli prima la ' + g.cl.subclassLabel.toLowerCase()); return; }
  const gain = lvup.hpMode === 'roll' ? g.rollGain : g.avgGain;
  if (gain == null){ toast('Tira il dado vita'); return; }

  const c = g.c;
  c.level = lvup.to;
  c.hp = c.hp || { current:0, max:0, temp:0 };
  c.hp.max = (c.hp.max || 0) + gain;
  c.hp.current = (c.hp.current || 0) + gain;
  c.hitDie = c.hitDie || g.cl.hitDie;
  if (!c.casterType || c.casterType === 'none') c.casterType = g.cl.caster;
  if (!c.spellAbility && g.cl.spellAbility) c.spellAbility = g.cl.spellAbility;

  const lines = g.feats.map(f => `${lvup.to}° ${f[2] !== g.cl.name ? '[' + f[2] + '] ' : ''}${f[0]}: ${f[1]}`);
  if (g.isAsi) lines.push(`${lvup.to}° Aumento dei punteggi di caratteristica: 2 punti o un talento (da applicare)`);
  if (lines.length) c.features = [c.features || '', lines.join('\n\n')].filter(Boolean).join('\n\n');

  c.builder = Object.assign({}, c.builder, { classId: lvup.classId, subclassId: lvup.subclassId || (c.builder && c.builder.subclassId) || null });
  if (g.sc && !new RegExp('Sottoclasse: ' + g.sc.name).test(c.notesExtra || ''))
    c.notesExtra = [c.notesExtra || '', 'Sottoclasse: ' + g.sc.name].filter(Boolean).join('\n\n');

  scheduleSave('characters', c);
  const wantsSpells = g.after.cantrips > g.before.cantrips || g.after.known > g.before.known;
  closeModal(); render();
  toast(`📈 ${c.name} è di ${c.level}° livello (+${gain} PF)`);
  celebrate();
  if (wantsSpells) setTimeout(() => { state.sheetTab = 'spells'; render(); }, 900);
  lvup = null;
}

/* Piccola pioggia di scintille: la salita di livello merita una festa */
function celebrate(){
  const host = document.getElementById('embers') || document.body;
  for (let i = 0; i < 22; i++){
    const s = document.createElement('div');
    s.className = 'lv-spark';
    s.style.left = (10 + Math.random()*80) + 'vw';
    s.style.animationDelay = (Math.random()*0.45) + 's';
    s.style.setProperty('--dx', (Math.random()*70 - 35) + 'px');
    host.appendChild(s);
    setTimeout(() => s.remove(), 2200);
  }
  buzz([12, 40, 12, 40, 24]);
}
