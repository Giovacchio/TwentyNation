/* ══════════════════════════════════════════════════════════════
   Grimorio — creazione guidata del personaggio
   Un passo alla volta: razza, classe e livello, sottoclasse,
   background, competenze, caratteristiche, incantesimi.
   Alla fine costruisce una scheda completa e già calcolata.
   ══════════════════════════════════════════════════════════════ */

let bld = null;

const POINT_COSTS = { 8:0, 9:1, 10:2, 11:3, 12:4, 13:5, 14:7, 15:9 };
const STANDARD_ARRAY = [15,14,13,12,10,8];

function openBuilder(){
  bld = {
    step: 0,
    raceId: null, subraceId: null, raceBonusPick: [], raceSkills: [],
    classId: null, level: 1, subclassId: null, classSkills: [],
    bgId: null,
    method: 'pointbuy',
    base: { str:8, dex:8, con:8, int:8, wis:8, cha:8 },
    rolled: null,
    cantrips: [], spells: [],
    spellFilter: '',
    gear: {}, gearOn: true, weaponPick: {},
    name: '', sex: '', portrait: null, avatar: AVATAR_GLYPHS[Math.floor(Math.random()*AVATAR_GLYPHS.length)]
  };
  openModal({ render: builderHTML });
}
function bldSet(patch){ Object.assign(bld, patch); renderModalRoot(); }
function bldGoto(step){ bld.step = clamp(step, 0, BUILDER_STEPS.length-1); renderModalRoot({ toTop:true }); }

const BUILDER_STEPS = [
  { key:'race',    title:'Razza',           render:()=>stepRace() },
  { key:'class',   title:'Classe',          render:()=>stepClass() },
  { key:'sub',     title:'Sottoclasse',     render:()=>stepSubclass(),  skip:()=>{ const c = CLASS_BY_ID[bld.classId]; return !c || bld.level < c.subclassLevel; } },
  { key:'bg',      title:'Background',      render:()=>stepBackground() },
  { key:'ability', title:'Caratteristiche', render:()=>stepAbilities() },
  { key:'spells',  title:'Incantesimi',     render:()=>stepSpells(),    skip:()=>{ const c = CLASS_BY_ID[bld.classId]; return !c || c.caster === 'none'; } },
  { key:'gear',    title:'Equipaggiamento', render:()=>stepGear(),      skip:()=>!bld.classId || !CLASS_KITS[bld.classId] },
  { key:'done',    title:'Riepilogo',       render:()=>stepSummary() },
];
function nextVisible(from, dir){
  let i = from + dir;
  while (i > 0 && i < BUILDER_STEPS.length-1 && BUILDER_STEPS[i].skip && BUILDER_STEPS[i].skip()) i += dir;
  return clamp(i, 0, BUILDER_STEPS.length-1);
}
function bldNext(){ bldGoto(nextVisible(bld.step, 1)); }
function bldBack(){ bldGoto(nextVisible(bld.step, -1)); }

function builderHTML(){
  const s = BUILDER_STEPS[bld.step];
  const visible = BUILDER_STEPS.filter(x => !(x.skip && x.skip()));
  const pos = visible.indexOf(s) + 1;
  const inner = `
    <div class="bld-progress">
      ${visible.map((x,i)=>`<span class="bld-dot ${x===s?'on':''} ${i < pos-1 ?'done':''}"></span>`).join('')}
    </div>
    <div class="bld-steptitle">Passo ${pos} di ${visible.length} · ${s.title}</div>
    ${s.render()}
  `;
  return modalShell('✦ Crea personaggio', inner);
}
function bldNav(canGo, label){
  return `<div class="btn-row" style="margin-top:18px">
    ${bld.step > 0 ? `<button class="btn btn-ghost" onclick="bldBack()">← Indietro</button>` : `<button class="btn btn-ghost" onclick="closeModal()">Annulla</button>`}
    <button class="btn btn-primary" ${canGo?'':'disabled'} onclick="${bld.step === BUILDER_STEPS.length-1 ? 'finishBuilder()' : 'bldNext()'}">${label || 'Avanti →'}</button>
  </div>`;
}

/* ─── 1. RAZZA ─── */
function stepRace(){
  const race = raceById(bld.raceId);
  const sub = race && race.subraces.find(s => s.id === bld.subraceId);
  const needSub = race && race.subraces.length && !sub;
  const needBonus = race && race.bonusChoice && bld.raceBonusPick.length < race.bonusChoice.count;
  const needSkills = race && race.skillChoice && bld.raceSkills.length < race.skillChoice;
  return `
    <div class="chip-row" style="margin-bottom:14px">
      ${allRaces().map(r=>`<button class="chip ${bld.raceId===r.id?'active':''}" onclick="pickRace('${r.id}')">${escapeHtml(r.name)}${r.notSrd?' *':''}${r.fromCampaign?' ⚔️':(r.homebrew?' ✦':'')}</button>`).join('')}
    </div>
    ${race ? `
      <div class="card" style="margin-bottom:12px">
        <div class="card-title">${escapeHtml(race.name)}</div>
        <div class="row-between" style="margin-bottom:6px"><span class="muted">Velocità</span><b>${race.speed} m</b></div>
        <div class="row-between" style="margin-bottom:6px"><span class="muted">Taglia</span><b>${race.size}</b></div>
        <div class="row-between" style="margin-bottom:10px"><span class="muted">Lingue</span><b style="text-align:right">${race.languages.join(', ')}</b></div>
        ${bonusLine(race.bonus)}
        <div class="list-gap" style="margin-top:10px">
          ${race.traits.map(t=>`<div><b style="font-size:.84rem">${escapeHtml(t.name)}</b><div class="muted" style="font-size:.78rem">${escapeHtml(t.desc)}</div></div>`).join('')}
        </div>
      </div>
      ${race.subraces.length ? `
        <div class="field"><label>Sottorazza</label>
          <div class="chip-row">${race.subraces.map(sr=>`<button class="chip ${bld.subraceId===sr.id?'active':''}" onclick="bldSet({subraceId:'${sr.id}'})">${sr.name}</button>`).join('')}</div>
        </div>
        ${sub ? `<div class="card" style="margin-bottom:12px">
          ${bonusLine(sub.bonus)}
          ${sub.traits.map(t=>`<div style="margin-top:8px"><b style="font-size:.84rem">${escapeHtml(t.name)}</b><div class="muted" style="font-size:.78rem">${escapeHtml(t.desc)}</div></div>`).join('')}
        </div>` : ''}
      ` : ''}
      ${race.bonusChoice ? `
        <div class="field"><label>+${race.bonusChoice.amount} a ${race.bonusChoice.count} caratteristiche a scelta</label>
          <div class="chip-row">${ABILITIES.filter(a=>!(race.bonusChoice.exclude||[]).includes(a.key)).map(a=>`
            <button class="chip ${bld.raceBonusPick.includes(a.key)?'active':''}" onclick="toggleRaceBonus('${a.key}')">${a.label}</button>`).join('')}</div>
          <div class="field-hint">${bld.raceBonusPick.length}/${race.bonusChoice.count} scelte</div>
        </div>` : ''}
      ${race.skillChoice ? `
        <div class="field"><label>Competenza in ${race.skillChoice} abilità a scelta</label>
          <div class="chip-row">${SKILLS.map(sk=>`
            <button class="chip ${bld.raceSkills.includes(sk.key)?'active':''}" onclick="toggleRaceSkill('${sk.key}')">${sk.label}</button>`).join('')}</div>
          <div class="field-hint">${bld.raceSkills.length}/${race.skillChoice} scelte</div>
        </div>` : ''}
      ${race.notSrd ? `<div class="spell-source-note">* Variante non compresa nell'SRD: le meccaniche sono riassunte, il talento va scritto a mano.</div>` : ''}
    ` : `<p class="muted">Scegli una razza per vedere cosa comporta.</p>`}
    <button class="btn btn-ghost btn-block btn-sm" style="margin-top:12px" onclick="hbFromBuilder('race')">📚 Aggiungi una razza tua</button>
    <button class="btn btn-ghost btn-block btn-sm" style="margin-top:8px" onclick="openHomebrewBulk()">📖 Leggile tutte dal tuo manuale</button>
    ${bldNav(!!race && !needSub && !needBonus && !needSkills)}
  `;
}
function bonusLine(b){
  const parts = ABILITIES.filter(a=>b && b[a.key]).map(a=>`${a.abbr} +${b[a.key]}`);
  return parts.length ? `<div class="chip-row">${parts.map(p=>`<span class="badge gold">${p}</span>`).join('')}</div>` : '';
}
function pickRace(id){
  bld.raceId = id; bld.subraceId = null; bld.raceBonusPick = []; bld.raceSkills = [];
  const r = raceById(id);
  if (r && r.subraces.length === 1) bld.subraceId = r.subraces[0].id;
  renderModalRoot();
}
function toggleRaceBonus(key){
  const r = raceById(bld.raceId);
  const i = bld.raceBonusPick.indexOf(key);
  if (i >= 0) bld.raceBonusPick.splice(i,1);
  else if (bld.raceBonusPick.length < r.bonusChoice.count) bld.raceBonusPick.push(key);
  renderModalRoot();
}
function toggleRaceSkill(key){
  const r = raceById(bld.raceId);
  const i = bld.raceSkills.indexOf(key);
  if (i >= 0) bld.raceSkills.splice(i,1);
  else if (bld.raceSkills.length < r.skillChoice) bld.raceSkills.push(key);
  renderModalRoot();
}

/* ─── 2. CLASSE E LIVELLO ─── */
function stepClass(){
  const c = CLASS_BY_ID[bld.classId];
  const list = c ? (c.skills === 'any' ? SKILLS.map(s=>s.key) : c.skills) : [];
  const need = c ? bld.classSkills.length < c.skillCount : true;
  return `
    <div class="chip-row" style="margin-bottom:14px">
      ${CLASSES_FULL.map(cl=>`<button class="chip ${bld.classId===cl.id?'active':''}" onclick="pickClass('${cl.id}')">${cl.name}</button>`).join('')}
    </div>
    ${c ? `
      <div class="field"><label>Livello</label>
        <div class="hp-controls">
          <button class="stepper-btn" onclick="setBldLevel(${bld.level-1})">−</button>
          <input type="number" inputmode="numeric" min="1" max="20" value="${bld.level}" oninput="setBldLevel(this.value)">
          <button class="stepper-btn" onclick="setBldLevel(${bld.level+1})">+</button>
        </div>
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="row-between" style="margin-bottom:6px"><span class="muted">Dado vita</span><b>d${c.hitDie}</b></div>
        <div class="row-between" style="margin-bottom:6px"><span class="muted">Tiri salvezza</span><b>${c.saves.map(k=>ABILITY_BY_KEY[k].label).join(', ')}</b></div>
        <div class="row-between" style="margin-bottom:6px"><span class="muted">Armature</span><b style="text-align:right;font-size:.8rem">${escapeHtml(c.armor)}</b></div>
        <div class="row-between" style="margin-bottom:6px"><span class="muted">Armi</span><b style="text-align:right;font-size:.8rem">${escapeHtml(c.weapons)}</b></div>
        ${c.tools!=='—'?`<div class="row-between"><span class="muted">Strumenti</span><b style="text-align:right;font-size:.8rem">${escapeHtml(c.tools)}</b></div>`:''}
      </div>
      <div class="field">
        <label>Scegli ${c.skillCount} abilità${c.skills==='any'?' (qualsiasi)':''}</label>
        <div class="chip-row">
          ${list.map(k=>{ const sk = SKILLS.find(x=>x.key===k); return `<button class="chip ${bld.classSkills.includes(k)?'active':''}" onclick="toggleClassSkill('${k}')">${sk.label}</button>`; }).join('')}
        </div>
        <div class="field-hint">${bld.classSkills.length}/${c.skillCount} scelte</div>
      </div>
      <div class="divider"><span class="flourish">❧</span><span>Privilegi fino al ${bld.level}° livello</span></div>
      <div class="list-gap">${featuresUpTo(c, bld.level).map(f=>`
        <div class="card" style="padding:10px 13px">
          <div class="row-between"><b style="font-size:.85rem">${escapeHtml(f[0])}</b><span class="badge">${f[2]}°</span></div>
          <div class="muted" style="font-size:.77rem; margin-top:3px">${escapeHtml(f[1])}</div>
        </div>`).join('')}
      </div>
      ${asiNote(c, bld.level)}
    ` : `<p class="muted">Scegli una classe.</p>`}
    ${bldNav(!!c && !need)}
  `;
}
function featuresUpTo(c, level){
  const out = [];
  for (let l = 1; l <= level; l++) (c.features[l]||[]).forEach(f => out.push([f[0], f[1], l]));
  return out;
}
function asiNote(c, level){
  const n = c.asi.filter(l => l <= level).length;
  if (!n) return '';
  return `<div class="card" style="margin-top:10px; border-color:var(--gold-dim)">
    <b style="font-size:.85rem">${n} aumento${n>1?'i':''} dei punteggi di caratteristica</b>
    <div class="muted" style="font-size:.78rem">Ai livelli ${c.asi.filter(l=>l<=level).join(', ')}. Puoi distribuire ${n*2} punti (o prendere un talento): applicali nel passo delle caratteristiche.</div>
  </div>`;
}
function pickClass(id){
  bld.classId = id; bld.classSkills = []; bld.subclassId = null;
  const c = CLASS_BY_ID[id];
  const subs = subclassesFor(id);
  if (subs.length === 1) bld.subclassId = subs[0].id;
  bld.cantrips = []; bld.spells = [];
  renderModalRoot();
}
function setBldLevel(v){ bld.level = clamp(parseInt(v)||1, 1, 20); renderModalRoot(); }
function toggleClassSkill(key){
  const c = CLASS_BY_ID[bld.classId];
  const i = bld.classSkills.indexOf(key);
  if (i >= 0) bld.classSkills.splice(i,1);
  else if (bld.classSkills.length < c.skillCount) bld.classSkills.push(key);
  renderModalRoot();
}

/* ─── 3. SOTTOCLASSE ─── */
function stepSubclass(){
  const c = CLASS_BY_ID[bld.classId];
  const subs = subclassesFor(c.id);
  const sc = subs.find(s => s.id === bld.subclassId);
  const srd = subs.filter(x => !x.homebrew);
  const mine = subs.filter(x => x.homebrew);

  /* Ogni archetipo si vede già aperto, con i privilegi che dà fino
     al tuo livello: scegli sapendo cosa prendi, senza aprire nulla. */
  const cardFor = (x) => {
    const on = bld.subclassId === x.id;
    const feats = featuresUpTo(x, bld.level);
    return `<button class="card sub-card ${on?'on':''}" style="width:100%; text-align:left" onclick="bldSet({subclassId:'${x.id}'})">
      <div class="row-between" style="align-items:center">
        <b style="font-family:var(--font-head); font-size:1rem; color:${on?'var(--gold)':'var(--ink)'}">${escapeHtml(x.name)}${x.fromCampaign?' ⚔️':(x.homebrew?' ✦':'')}</b>
        <span class="badge">${on ? 'scelto' : 'scegli'}</span>
      </div>
      ${feats.length ? `<div class="list-gap" style="margin-top:9px">${feats.map(f=>`
        <div>
          <div class="row-between"><b style="font-size:.83rem">${escapeHtml(f[0])}</b><span class="muted" style="font-size:.72rem">${f[2]}° liv.</span></div>
          <div class="muted" style="font-size:.77rem; margin-top:2px">${escapeHtml(f[1])}</div>
        </div>`).join('')}</div>`
        : `<div class="muted" style="font-size:.77rem; margin-top:6px">I suoi privilegi arrivano dopo il ${bld.level}° livello.</div>`}
    </button>`;
  };

  return `
    <p class="muted" style="margin-bottom:6px"><b>${escapeHtml(c.subclassLabel)}</b> — si sceglie al ${c.subclassLevel}° livello.</p>
    <div class="card" style="margin-bottom:14px; border-color:var(--gold-dim); padding:11px 13px">
      <div class="muted" style="font-size:.78rem; line-height:1.55">Nell'app c'è ${srd.length === 1 ? "l'unico archetipo" : 'solo quello'} che la licenza libera (SRD) permette di includere: uno per classe. Gli altri sono materiale dei manuali, quindi te li aggiungi tu dal tuo libro — bastano un nome e i privilegi per livello, e poi restano lì per sempre.</div>
      <button class="btn btn-gold btn-block btn-sm" style="margin-top:10px" onclick="hbFromBuilder('subclass','${c.id}')">✦ Crea il tuo ${escapeHtml(c.subclassLabel.toLowerCase())}</button>
      <button class="btn btn-ghost btn-block btn-sm" style="margin-top:8px" onclick="openHomebrewBulk()">📖 Leggili tutti dal tuo manuale</button>
    </div>

    <div class="list-gap">
      ${srd.map(cardFor).join('')}
      ${mine.length ? `<div class="divider"><span class="flourish">❧</span><span>${mine.some(x=>x.fromCampaign)?'I tuoi e quelli del tavolo':'I tuoi'}</span></div>${mine.map(cardFor).join('')}
        <div class="muted" style="font-size:.72rem; text-align:center">✦ tuoi · ⚔️ condivisi nella campagna</div>` : ''}
    </div>

    <button class="card sub-card ${bld.subclassId==='none'?'on':''}" style="width:100%; text-align:left; margin-top:10px" onclick="bldSet({subclassId:'none'})">
      <div class="row-between" style="align-items:center">
        <b style="font-size:.9rem">Decido dopo</b>
        <span class="badge">${bld.subclassId==='none' ? 'scelto' : 'scegli'}</span>
      </div>
      <div class="muted" style="font-size:.77rem; margin-top:4px">Vai avanti così: potrai sceglierlo quando sali di livello, oppure scriverlo a mano nella scheda.</div>
    </button>

    ${bldNav(!!bld.subclassId)}
  `;
}

/* ─── 4. BACKGROUND ─── */
function stepBackground(){
  const bg = allBackgrounds().find(b => b.id === bld.bgId);
  return `
    <div class="chip-row" style="margin-bottom:14px">
      ${allBackgrounds().map(b=>`<button class="chip ${bld.bgId===b.id?'active':''}" onclick="bldSet({bgId:'${b.id}'})">${escapeHtml(b.name)}${b.fromCampaign?' ⚔️':(b.homebrew?' ✦':'')}</button>`).join('')}
    </div>
    <button class="btn btn-ghost btn-block btn-sm" style="margin-bottom:12px" onclick="hbFromBuilder('background')">📚 Aggiungi un background tuo</button>
    <button class="btn btn-ghost btn-block btn-sm" style="margin-bottom:12px" onclick="openHomebrewBulk()">📖 Leggili tutti dal tuo manuale</button>
    ${bg && bg.skills.some(k => bld.classSkills.includes(k) || bld.raceSkills.includes(k)) ? `
      <div class="card" style="margin-bottom:12px; border-color:var(--warn)">
        <div class="muted" style="font-size:.8rem">⚠️ ${escapeHtml(bg.skills.filter(k => bld.classSkills.includes(k) || bld.raceSkills.includes(k)).map(k=>SKILLS.find(s=>s.key===k).label).join(' e '))} l'hai già presa dalla classe o dalla razza: una competenza doppia non serve a nulla. Torna indietro e cambia la scelta della classe, oppure chiedi al master di sostituirla.</div>
      </div>` : ''}
    ${bg ? `
      <div class="card">
        <div class="card-title">${escapeHtml(bg.name)}</div>
        <div class="row-between" style="margin-bottom:6px"><span class="muted">Abilità</span><b>${bg.skills.map(k=>SKILLS.find(s=>s.key===k).label).join(', ')}</b></div>
        <div class="row-between" style="margin-bottom:6px"><span class="muted">Strumenti</span><b style="text-align:right;font-size:.8rem">${escapeHtml(bg.tools)}</b></div>
        ${bg.languages?`<div class="row-between" style="margin-bottom:6px"><span class="muted">Lingue</span><b>${bg.languages} a scelta</b></div>`:''}
        <div style="margin-top:10px"><b style="font-size:.85rem">${escapeHtml(bg.feature)}</b>
        <div class="muted" style="font-size:.78rem">${escapeHtml(bg.desc)}</div></div>
        <div class="muted" style="font-size:.76rem; margin-top:10px"><b>Equipaggiamento:</b> ${escapeHtml(bg.equipment)}</div>
      </div>` : `<p class="muted">Il background dà due competenze e un tratto narrativo.</p>`}
    ${bldNav(!!bg)}
  `;
}

/* ─── 5. CARATTERISTICHE ─── */
function racialBonusMap(){
  const map = { str:0, dex:0, con:0, int:0, wis:0, cha:0 };
  const r = raceById(bld.raceId);
  if (!r) return map;
  Object.keys(r.bonus||{}).forEach(k => map[k] += r.bonus[k]);
  const sub = (r.subraces||[]).find(s => s.id === bld.subraceId);
  if (sub) Object.keys(sub.bonus||{}).forEach(k => map[k] += sub.bonus[k]);
  if (r.bonusChoice) bld.raceBonusPick.forEach(k => map[k] += r.bonusChoice.amount);
  return map;
}
function finalAbilities(){
  const bonus = racialBonusMap();
  const out = {};
  ABILITIES.forEach(a => { out[a.key] = clamp((bld.base[a.key]||8) + bonus[a.key], 1, 30); });
  return out;
}
function pointsSpent(){
  return ABILITIES.reduce((n,a) => n + (POINT_COSTS[bld.base[a.key]] != null ? POINT_COSTS[bld.base[a.key]] : 0), 0);
}
function stepAbilities(){
  const bonus = racialBonusMap();
  const fin = finalAbilities();
  const spent = pointsSpent();
  const c = CLASS_BY_ID[bld.classId];
  const asiCount = c ? c.asi.filter(l => l <= bld.level).length : 0;
  return `
    <div class="segmented" style="margin-bottom:14px">
      ${[['pointbuy','Acquisto punti'],['array','Array standard'],['roll','Tiro dei dadi'],['manual','A mano']].map(([k,l])=>
        `<button class="${bld.method===k?'active':''}" onclick="setBldMethod('${k}')">${l}</button>`).join('')}
    </div>
    ${bld.method==='pointbuy' ? `<div class="card" style="margin-bottom:12px; ${spent>27?'border-color:var(--garnet)':''}">
      <div class="row-between"><span class="muted">Punti spesi</span><b style="${spent>27?'color:var(--garnet-bright)':''}">${spent} / 27</b></div>
      <div class="muted" style="font-size:.74rem; margin-top:6px">Da 8 a 15. I valori alti costano di più: 14 costa 7 punti, 15 ne costa 9.</div>
    </div>` : ''}
    ${bld.method==='array' ? `<div class="card" style="margin-bottom:12px"><div class="muted" style="font-size:.8rem">Assegna 15, 14, 13, 12, 10 e 8 alle sei caratteristiche: ognuno una volta sola.</div></div>` : ''}
    ${bld.method==='roll' ? `<div class="card" style="margin-bottom:12px">
      <button class="btn btn-gold btn-block btn-sm" onclick="rollAbilityScores()">🎲 Tira 6 volte 4d6 (scarta il più basso)</button>
      ${bld.rolled ? `<div class="chip-row" style="margin-top:10px">${bld.rolled.map(v=>`<span class="badge gold">${v}</span>`).join('')}</div>
      <div class="muted" style="font-size:.74rem; margin-top:6px">Assegna questi valori qui sotto.</div>` : ''}
    </div>` : ''}

    <div class="list-gap">
      ${ABILITIES.map(a=>`
        <div class="attack-row">
          <div class="attack-main" style="pointer-events:none">
            <div class="attack-name">${a.label}</div>
            <div class="muted" style="font-size:.72rem">${bonus[a.key]?('base + '+bonus[a.key]+' dalla razza'):'nessun bonus razziale'}</div>
          </div>
          ${abilityControl(a.key)}
          <div style="text-align:right; min-width:56px">
            <div style="font-family:var(--font-head); font-size:1.15rem; color:var(--gold)">${fin[a.key]}</div>
            <div class="muted" style="font-size:.7rem">${modStr(fin[a.key])}</div>
          </div>
        </div>`).join('')}
    </div>
    ${asiCount ? `<div class="card" style="margin-top:12px; border-color:var(--gold-dim)">
      <b style="font-size:.85rem">Hai ${asiCount*2} punti da aumenti di caratteristica</b>
      <div class="muted" style="font-size:.78rem">Al ${c.asi.filter(l=>l<=bld.level).join('°, ')}° livello. Aggiungili pure qui sopra con "A mano", oppure lasciali e prendi dei talenti.</div>
    </div>` : ''}
    ${bldNav(bld.method!=='pointbuy' || spent<=27)}
  `;
}
function abilityControl(key){
  const v = bld.base[key] || 8;
  if (bld.method === 'array' || bld.method === 'roll'){
    const pool = bld.method === 'array' ? STANDARD_ARRAY : (bld.rolled || []);
    const used = ABILITIES.filter(a=>a.key!==key).map(a=>bld.base[a.key]);
    const opts = [];
    const counts = {};
    pool.forEach(p => counts[p] = (counts[p]||0)+1);
    used.forEach(u => { if (counts[u]) counts[u]--; });
    Object.keys(counts).sort((a,b)=>b-a).forEach(p => { if (counts[p] > 0) opts.push(Number(p)); });
    if (!opts.includes(v) && pool.includes(v)) opts.unshift(v);
    return `<select style="width:78px; padding:8px; border-radius:9px; border:1px solid var(--line); background:var(--bg-1); font-family:var(--font-ui); font-weight:700"
      onchange="setBase('${key}', this.value)">
      <option value="">—</option>
      ${opts.map(o=>`<option value="${o}" ${v===o?'selected':''}>${o}</option>`).join('')}
    </select>`;
  }
  const min = bld.method === 'pointbuy' ? 8 : 1;
  const max = bld.method === 'pointbuy' ? 15 : 20;
  return `<div style="display:flex; align-items:center; gap:5px">
    <button class="stepper-btn" style="width:32px;height:32px;font-size:1rem" onclick="setBase('${key}', ${v-1})">−</button>
    <input type="number" inputmode="numeric" min="${min}" max="${max}" value="${v}" style="width:52px; text-align:center; padding:7px; border-radius:9px; border:1px solid var(--line); background:var(--bg-1); font-family:var(--font-ui); font-weight:700"
      oninput="setBase('${key}', this.value)">
    <button class="stepper-btn" style="width:32px;height:32px;font-size:1rem" onclick="setBase('${key}', ${v+1})">+</button>
  </div>`;
}
function setBase(key, val){
  const min = bld.method === 'pointbuy' ? 8 : 1;
  const max = bld.method === 'pointbuy' ? 15 : 20;
  bld.base[key] = val === '' ? min : clamp(parseInt(val)||min, min, max);
  renderModalRoot();
}
function setBldMethod(m){
  bld.method = m;
  const def = m === 'pointbuy' ? 8 : (m === 'manual' ? 10 : 8);
  ABILITIES.forEach(a => bld.base[a.key] = def);
  if (m === 'array') ABILITIES.forEach((a,i) => bld.base[a.key] = STANDARD_ARRAY[i]);
  renderModalRoot();
}
function rollAbilityScores(){
  const set = [];
  for (let i=0;i<6;i++){
    const dice = [rollDie(6), rollDie(6), rollDie(6), rollDie(6)].sort((a,b)=>b-a);
    set.push(dice[0]+dice[1]+dice[2]);
  }
  bld.rolled = set.sort((a,b)=>b-a);
  ABILITIES.forEach((a,i) => bld.base[a.key] = set[i]);
  renderModalRoot();
  toast('🎲 ' + set.join(', '));
}

/* ─── 6. INCANTESIMI ─── */
function spellBudget(){
  const c = CLASS_BY_ID[bld.classId];
  if (!c || c.caster === 'none') return null;
  const lv = bld.level;
  const cantrips = (CANTRIPS_KNOWN[c.id] || [])[lv-1] || 0;
  let spells = 0, label = 'conosciuti';
  if (SPELLS_KNOWN[c.id]) spells = SPELLS_KNOWN[c.id][lv-1] || 0;
  else if (c.spellType === 'book'){ spells = 6 + (lv-1)*2; label = 'nel libro'; }
  else if (c.spellType === 'prepared'){
    const abMod = mod(finalAbilities()[c.spellAbility]);
    spells = preparedCount(c.id, lv, abMod); label = 'preparati';
  }
  return { cantrips, spells, label };
}
function maxSpellLevel(){
  const c = CLASS_BY_ID[bld.classId];
  const slots = slotsForCharacter(c.caster, bld.level);
  let max = 0;
  slots.forEach((n,i) => { if (n) max = i+1; });
  return max;
}
function stepSpells(){
  const c = CLASS_BY_ID[bld.classId];
  const budget = spellBudget();
  const maxLv = maxSpellLevel();
  const enName = Object.keys(CLASSES_IT).find(k => CLASSES_IT[k] === c.name) || c.name;
  const q = norm(bld.spellFilter);
  let list = allSpells().filter(s => spellClasses(s).includes(enName));
  list = list.filter(s => s.level === 0 ? budget.cantrips > 0 : s.level <= maxLv);
  if (q) list = list.filter(s => norm(s.name).includes(q) || norm(spellItName(s)).includes(q));
  list.sort((a,b)=> a.level-b.level || spellName(a).localeCompare(spellName(b),'it'));
  const cantripList = list.filter(s=>s.level===0), spellList = list.filter(s=>s.level>0);
  return `
    <div class="card" style="margin-bottom:12px">
      <div class="row-between" style="margin-bottom:6px"><span class="muted">Trucchetti</span><b style="${bld.cantrips.length>budget.cantrips?'color:var(--garnet-bright)':''}">${bld.cantrips.length} / ${budget.cantrips}</b></div>
      <div class="row-between" style="margin-bottom:6px"><span class="muted">Incantesimi ${budget.label}</span><b style="${bld.spells.length>budget.spells?'color:var(--garnet-bright)':''}">${bld.spells.length} / ${budget.spells}</b></div>
      <div class="row-between"><span class="muted">Livello massimo</span><b>${maxLv?maxLv+'°':'—'}</b></div>
      <div class="muted" style="font-size:.74rem; margin-top:8px">${c.spellType==='prepared'
        ? 'Da chierico, druido o paladino conosci tutta la lista: qui scegli quelli che tieni preparati oggi. Puoi cambiarli a ogni riposo lungo.'
        : (c.spellType==='book' ? 'Questi finiscono nel tuo libro degli incantesimi.' : 'Questi sono gli incantesimi che conosci in modo permanente.')}</div>
    </div>
    <div class="search-wrap">
      <span class="search-ic">🔍</span>
      <input placeholder="Filtra per nome…" value="${attr(bld.spellFilter)}" oninput="bldFilterSpells(this.value)">
    </div>
    ${budget.cantrips ? `<div class="divider"><span class="flourish">❧</span><span>Trucchetti</span></div>
    <div class="list-gap">${cantripList.map(s=>bldSpellRow(s,true)).join('') || '<p class="muted">Nessun trucchetto trovato.</p>'}</div>` : ''}
    <div class="divider"><span class="flourish">❧</span><span>Incantesimi</span></div>
    <div class="list-gap">${spellList.map(s=>bldSpellRow(s,false)).join('') || '<p class="muted">Nessun incantesimo trovato.</p>'}</div>
    ${bldNav(bld.cantrips.length<=budget.cantrips && bld.spells.length<=budget.spells)}
  `;
}
function bldSpellRow(s, isCantrip){
  const arr = isCantrip ? bld.cantrips : bld.spells;
  const on = arr.some(x => x.id === s.id && x.source === s.source);
  return `<div class="spell-item" style="padding:9px 11px">
    <button class="spell-item-body" style="text-align:left" onclick="viewSpellDetail('${s.id}','${s.source}')">
      <span class="spell-item-name">${escapeHtml(spellName(s))}</span>
      <span class="spell-item-meta">${s.level===0?'Trucchetto':s.level+'° livello'} · ${escapeHtml(schoolIt(s.school||''))}${s.conc?' · conc.':''}</span>
    </button>
    <button class="spell-item-add ${on?'added':''}" onclick="toggleBldSpell('${s.id}','${s.source}',${isCantrip})">${on?'✓':'✦'}</button>
  </div>`;
}
function toggleBldSpell(id, source, isCantrip){
  const arr = isCantrip ? bld.cantrips : bld.spells;
  const i = arr.findIndex(x => x.id === id && x.source === source);
  if (i >= 0) arr.splice(i,1); else arr.push({ id, source });
  renderModalRoot();
}
const bldFilterSpells = debounce((v)=>{ bld.spellFilter = v; renderModalRoot(); const el = document.querySelector('.search-wrap input'); if (el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 250);

/* ─── 7. RIEPILOGO E CREAZIONE ─── */
function buildCharacterFromBuilder(){
  const c = CLASS_BY_ID[bld.classId];
  const race = raceById(bld.raceId);
  const sub = race && (race.subraces||[]).find(s => s.id === bld.subraceId);
  const bg = allBackgrounds().find(b => b.id === bld.bgId);
  const sc = subclassesFor(c.id).find(s => s.id === bld.subclassId);
  const ab = finalAbilities();
  const conMod = mod(ab.con);

  // PF: massimo al 1° livello, media arrotondata per eccesso agli altri
  const avg = Math.floor(c.hitDie/2) + 1;
  let hpMax = c.hitDie + conMod + (bld.level - 1) * (avg + conMod);
  if (bld.subraceId === 'hill-dwarf') hpMax += bld.level;
  hpMax = Math.max(1, hpMax);

  const ch = newCharacter();
  ch.name = bld.name.trim() || 'Senza nome';
  ch.sex = bld.sex || '';
  ch.avatar = bld.avatar;
  ch.portrait = bld.portrait;
  ch.race = race ? (sub ? sub.name : race.name) : '';
  ch.classField = c.name;
  ch.level = bld.level;
  ch.background = bg ? bg.name : '';
  ch.abilities = ab;
  ch.hp = { current: hpMax, max: hpMax, temp: 0 };
  ch.hitDie = c.hitDie;
  ch.ac = 10 + mod(ab.dex);
  // se il pacchetto include un'armatura, la CA la calcoliamo davvero
  if (bld.gearOn && typeof SRD_ARMORS !== 'undefined'){
    const names = gearItems().map(x => norm(x.name));
    const worn = SRD_ARMORS.filter(a => a.cat !== 'scudo').find(a => names.includes(norm(gearName(a))));
    const shield = SRD_ARMORS.find(a => a.cat === 'scudo' && names.includes(norm(gearName(a))));
    if (worn){
      ch.ac = armorAC(worn, mod(ab.dex));
      ch.armor = gearName(worn) + (worn.stealth ? ' (svantaggio a Furtività)' : '');
    }
    if (shield) ch.ac += shield.ac;
  }
  ch.initiative = mod(ab.dex);
  ch.speed = race ? race.speed : 9;
  ch.saveProf = c.saves.slice();

  const skills = new Set([...(race && race.grantSkills || []), ...bld.raceSkills, ...bld.classSkills, ...(bg ? bg.skills : [])]);
  ch.skillProf = [...skills];

  ch.casterType = c.caster;
  ch.spellAbility = c.spellAbility || 'int';
  ch.knownSpells = [...bld.cantrips, ...bld.spells];
  if (c.spellType === 'prepared') ch.preparedSpells = bld.spells.map(s => s.id);

  // privilegi, tratti e competenze in testo
  const feats = featuresUpTo(c, bld.level).map(f => `${f[2]}° ${f[0]}: ${f[1]}`);
  if (sc) featuresUpTo(sc, bld.level).forEach(f => feats.push(`${f[2]}° [${sc.name}] ${f[0]}: ${f[1]}`));
  const asiLevels = c.asi.filter(l => l <= bld.level);
  if (asiLevels.length) feats.push(`Aumenti dei punteggi di caratteristica ai livelli ${asiLevels.join(', ')} (${asiLevels.length*2} punti o talenti)`);
  ch.features = feats.join('\n\n');

  const traits = [];
  if (race) race.traits.forEach(t => traits.push(`${t.name}: ${t.desc}`));
  if (sub) (sub.traits||[]).forEach(t => traits.push(`${t.name}: ${t.desc}`));
  if (bg) traits.push(`${bg.feature} (${bg.name}): ${bg.desc}`);
  ch.notesRace = traits.join('\n');
  ch.notesExtra = [
    sc ? ('Sottoclasse: ' + sc.name) : '',
    bg ? ('Equipaggiamento iniziale del background: ' + bg.equipment) : ''
  ].filter(Boolean).join('\n\n');

  ch.languages = race ? race.languages.join(', ') + (bg && bg.languages ? ` · +${bg.languages} dal background` : '') : '';
  ch.tools = [c.tools !== '—' ? c.tools : '', bg && bg.tools !== '—' ? bg.tools : ''].filter(Boolean).join(' · ');
  ch.profOther = [c.armor !== 'Nessuna' ? c.armor : '', c.weapons].filter(Boolean).join(' · ');


  // Le armi che hai scelto diventano subito righe d'attacco calcolate.
  // I pacchetti scrivono "Cotta di maglia", le tabelle "Cotta di Maglia":
  // il confronto va fatto senza badare a maiuscole e accenti.
  if (bld.gearOn && typeof WEAPON_BY_ID !== 'undefined'){
    const seen = new Set();
    gearItems().forEach(it => {
      const w = SRD_WEAPONS.find(x => norm(gearName(x)) === norm(it.name));
      if (!w || seen.has(w.id)) return;
      seen.add(w.id);
      const abm = (w.r === 'distanza' || (w.p||[]).some(p=>/accurata/.test(p)))
        ? Math.max(mod(ab.dex), (w.r === 'distanza' ? -99 : mod(ab.str)))
        : mod(ab.str);
      const prof = profBonus(bld.level);
      ch.attacks.push({
        name: it.name, atk: String(abm + prof),
        dmg: w.d + (abm ? (abm > 0 ? '+' + abm : String(abm)) : ''),
        notes: [w.dt, (w.p||[]).join(', ')].filter(Boolean).join(' · '),
        gearId: w.id,
      });
    });
  }

  // Zaino di partenza
  ch.inventory = gearItems().map(it => ({
    name: it.name, qty: it.qty,
    weight: it.weight ? String(it.weight) : '',
    attuned: false, notes: '', equipped: false
  }));
  if (bld.gearOn && bg && bg.equipment)
    ch.inventory.push({ name: 'Equipaggiamento da ' + bg.name, qty: 1, weight: '', attuned: false, notes: bg.equipment, equipped: false });

  ch.builder = { raceId: bld.raceId, subraceId: bld.subraceId, classId: bld.classId, subclassId: bld.subclassId, bgId: bld.bgId };
  return ch;
}
function stepSummary(){
  const c = CLASS_BY_ID[bld.classId];
  const preview = buildCharacterFromBuilder();
  const budget = spellBudget();
  return `
    <div class="field"><label>Nome del personaggio</label>
      <input id="bld-name" value="${attr(bld.name)}" placeholder="Es. Elyndra Sussurronotte" oninput="bld.name=this.value">
    </div>
    <div class="field"><label>Sesso</label>
      <div class="chip-row">
        ${SEXES.map(x=>`<button class="chip ${bld.sex===x.id?'active':''}" onclick="bldSet({sex: bld.sex==='${x.id}' ? '' : '${x.id}'})">${x.label}</button>`).join('')}
      </div>
    </div>
    <div class="field"><label>Ritratto</label>
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
        ${avatarHTML(bld, 64)}
        <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
          <button class="btn btn-ghost btn-sm" onclick="choosePortrait(u=>bldSet({portrait:u}))">📷 ${bld.portrait?'Cambia foto':'Carica una foto'}</button>
          ${bld.portrait?`<button class="btn btn-ghost btn-sm" onclick="bldSet({portrait:null})">Togli la foto</button>`:''}
        </div>
      </div>
      <div class="chip-row">
        ${AVATAR_GLYPHS.slice(0,10).map(g=>`<button class="chip ${bld.avatar===g&&!bld.portrait?'active':''}" style="font-size:1.05rem;padding:7px 11px" onclick="bldSet({avatar:'${jsStr(g)}'})">${g}</button>`).join('')}
      </div>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="row-between" style="margin-bottom:6px"><span class="muted">Personaggio</span><b style="text-align:right">${escapeHtml(preview.race)} ${escapeHtml(preview.classField)} ${preview.level}°</b></div>
      <div class="row-between" style="margin-bottom:6px"><span class="muted">Background</span><b>${escapeHtml(preview.background||'—')}</b></div>
      <div class="row-between" style="margin-bottom:10px"><span class="muted">PF · CA · Iniziativa</span><b>${preview.hp.max} · ${preview.ac} · ${signStr(preview.initiative)}</b></div>
      <div class="ability-grid" style="grid-template-columns:repeat(6,1fr); gap:5px; margin:0">
        ${ABILITIES.map(a=>`<div class="ability-seal" style="padding:7px 2px">
          <div class="lbl" style="font-size:.55rem">${a.abbr}</div>
          <div class="mod" style="font-size:1rem; margin-top:3px">${preview.abilities[a.key]}</div>
          <div class="score">${modStr(preview.abilities[a.key])}</div>
        </div>`).join('')}
      </div>
      <div class="row-between" style="margin-top:10px"><span class="muted">Competenze</span><b>${preview.skillProf.length} abilità</b></div>
      <div class="muted" style="font-size:.76rem; margin-top:4px">${preview.skillProf.map(k=>SKILLS.find(s=>s.key===k).label).join(', ') || '—'}</div>
      ${budget ? `<div class="row-between" style="margin-top:10px"><span class="muted">Incantesimi</span><b>${bld.cantrips.length} trucchetti · ${bld.spells.length} ${budget.label}</b></div>` : ''}
    </div>
    <div class="muted" style="font-size:.78rem; margin-bottom:6px">Privilegi, tratti razziali e competenze finiscono nella scheda <b>Note</b>. Potrai correggere tutto dopo.</div>
    ${bldNav(true, '✦ Crea il personaggio')}
  `;
}
function finishBuilder(){
  const el = document.getElementById('bld-name');
  if (el) bld.name = el.value;
  if (!bld.name.trim()){ toast('Dai un nome al personaggio'); if (el) el.focus(); return; }
  const ch = buildCharacterFromBuilder();
  state.characters.push(ch);
  saveLocal();
  fsSet('characters', ch);
  if (!currentUser) state.offlineMode = true;
  closeModal();
  openSheet(ch.id);
  toast('✦ ' + ch.name + ' è pronto');
}

/* ─── Passo: equipaggiamento iniziale ───
   Le classi dell'SRD partono con alcune scelte fisse e altre a bivio.
   Qui scegli, e il contenuto finisce dritto nello zaino della scheda. */
function stepGear(){
  const kit = CLASS_KITS[bld.classId];
  const cl = CLASS_BY_ID[bld.classId];
  const bg = allBackgrounds().find(b => b.id === bld.bgId);
  if (!kit) return '';

  return `
    <button class="switch-row" onclick="bldToggleGear()">
      <div class="track"><div class="knob" style="${bld.gearOn?'transform:translateX(21px)':''}"></div></div>
      <div style="flex:1; text-align:left; font-family:var(--font-ui)">
        <b>Parti con l'equipaggiamento della classe</b>
        <div class="muted" style="font-size:.74rem; font-weight:600">Se il tuo master usa l'oro iniziale, spegnilo e compri tu.</div>
      </div>
    </button>

    ${bld.gearOn ? `
      ${kit.fixed && kit.fixed.length ? `
        <div class="divider"><span class="flourish">❧</span><span>Hai comunque</span></div>
        <div class="muted" style="font-size:.82rem; line-height:1.6">${kit.fixed.map(it=>escapeHtml(it[0] + (it[1]>1?` ×${it[1]}`:''))).join(' · ')}</div>` : ''}

      ${kit.groups.map((g, gi) => {
        const chosen = bld.gear[gi] != null ? bld.gear[gi] : 0;
        return `
        <div class="divider"><span class="flourish">❧</span><span>${escapeHtml(g.label)}</span></div>
        <div class="list-gap">
          ${g.opts.map((o, oi)=>`<button class="attack-row" style="width:100%; text-align:left; ${chosen===oi?'border-color:var(--gold)':''}" onclick="bldPickGear(${gi},${oi})">
            <span class="attack-main">
              <span class="attack-name">${escapeHtml(o.n)}${chosen===oi?' ✓':''}</span>
              ${(()=>{ const d = o.items.map(it=>it[0]+(it[1]>1?` ×${it[1]}`:'')).slice(0,5).join(', ') + (o.items.length>5?'…':'');
                       // niente sottotitolo se ripete il titolo, anche quando
                       // questo ha una precisazione fra parentesi
                       const pulito = (t) => norm(String(t).replace(/\([^)]*\)/g,''));
                       return pulito(d) === pulito(o.n) ? '' : `<span class="muted" style="font-size:.73rem; display:block">${escapeHtml(d)}</span>`; })()}
            </span>
          </button>`).join('')}
        </div>`;
      }).join('')}

      ${bg ? `<div class="divider"><span class="flourish">❧</span><span>Dal background</span></div>
        <div class="muted" style="font-size:.82rem; line-height:1.6">${escapeHtml(bg.equipment)}</div>
        <div class="muted" style="font-size:.75rem; margin-top:6px">Lo metto come una voce sola nello zaino: dividilo pure a mano dopo.</div>` : ''}

      <div class="card" style="margin-top:14px; border-color:var(--gold-dim)">
        <div class="row-between"><span>Oggetti nello zaino</span><b>${gearItems().length}</b></div>
        <div class="row-between" style="margin-top:4px"><span>Peso totale</span><b>${gearWeight().toFixed(1).replace('.0','')} kg</b></div>
      </div>
      ${(()=>{ const ph = gearPlaceholders(); if (!ph.length) return '';
        return `<div class="divider"><span class="flourish">❧</span><span>Quali armi?</span></div>
          ${ph.map(p=>{
            const list = (typeof SRD_WEAPONS !== 'undefined') ? SRD_WEAPONS.filter(w=>w.cat===p.cat) : [];
            const sel = pickedWeapon(p.key);
            return `<div class="field">
              <label>${escapeHtml(p.label)}${p.qty>1?` ×${p.qty}`:''}</label>
              <div class="chip-row">
                ${list.map(w=>`<button class="chip ${sel&&sel.id===w.id?'active':''}" onclick="bldPickWeapon('${p.key}','${w.id}')">${escapeHtml(gearName(w))} <span class="muted">${w.d}</span></button>`).join('')}
              </div>
            </div>`;
          }).join('')}`;
      })()}
    ` : `<div class="muted" style="text-align:center; padding:22px 10px">Parti con lo zaino vuoto. Il tuo master ti dirà quanto oro hai.</div>`}
    ${bldNav(true)}`;
}
function bldToggleGear(){ bld.gearOn = !bld.gearOn; renderModalRoot(); }
function bldPickGear(gi, oi){ bld.gear[gi] = oi; renderModalRoot(); }

/* I pacchetti dell'SRD dicono "un'arma da guerra a scelta": qui la
   scegli davvero, e nello zaino ci finisce l'arma vera col suo peso. */
function gearPlaceholders(){
  const kit = CLASS_KITS[bld.classId];
  if (!kit || !bld.gearOn) return [];
  const rows = (kit.fixed || []).slice();
  kit.groups.forEach((g, gi) => {
    const o = g.opts[bld.gear[gi] != null ? bld.gear[gi] : 0];
    if (o) o.items.forEach(it => rows.push(it));
  });
  return rows.filter(r => /a scelta/i.test(r[0])).map((r, i) => ({
    key: 'p' + i, label: r[0], qty: r[1],
    cat: /guerra/i.test(r[0]) ? 'guerra' : 'semplice',
  }));
}
function bldPickWeapon(key, id){ bld.weaponPick[key] = id; renderModalRoot(); }
function pickedWeapon(key){
  const id = bld.weaponPick[key];
  return (id && typeof WEAPON_BY_ID !== 'undefined') ? WEAPON_BY_ID[id] : null;
}

/* Somma tutto: fisso + scelte, accorpando i doppioni */
function gearItems(){
  const kit = CLASS_KITS[bld.classId];
  if (!kit || !bld.gearOn) return [];
  const rows = (kit.fixed || []).slice();
  kit.groups.forEach((g, gi) => {
    const o = g.opts[bld.gear[gi] != null ? bld.gear[gi] : 0];
    if (o) o.items.forEach(it => rows.push(it));
  });
  // i segnaposto diventano l'arma che hai scelto
  let pi = 0;
  const resolved = rows.map(([name, qty, w]) => {
    if (!/a scelta/i.test(name)) return [name, qty, w];
    const pick = pickedWeapon('p' + (pi++));
    return pick ? [gearName(pick), qty, pick.w] : [name, qty, w];
  });
  const map = new Map();
  resolved.forEach(([name, qty, w]) => {
    const prev = map.get(name);
    if (prev) prev.qty += qty; else map.set(name, { name, qty, weight: w });
  });
  return [...map.values()];
}
function gearWeight(){ return gearItems().reduce((t, it) => t + (it.weight||0) * (it.qty||1), 0); }
