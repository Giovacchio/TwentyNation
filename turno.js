/* TwentyNation — Il tuo turno
   Una schermata sola con tutto quello che puoi fare adesso: azione,
   azione bonus, reazione, movimento, e le risorse da spendere. Serve a
   non dover aprire la scheda intera mentre il tavolo aspetta te. */

/* Le azioni di base, con il promemoria in una riga. Sono regole SRD. */
const AZIONI_BASE = [
  ['🗡️','Attacco','Un attacco con arma (più di uno se la classe te lo concede).'],
  ['✨','Lanciare un incantesimo','Se il tempo di lancio è 1 azione.'],
  ['🏃','Scatto','Raddoppi il movimento per questo turno.'],
  ['↩️','Disimpegno','Il tuo movimento non provoca attacchi di opportunità.'],
  ['🛡️','Schivata','Chi ti attacca ha svantaggio; hai vantaggio ai TS su Destrezza.'],
  ['🤝','Aiuto','Dai vantaggio a un alleato sulla sua prossima prova o attacco.'],
  ['🫥','Nascondersi','Prova di Furtività per non farti trovare.'],
  ['⏳','Preparare','Scegli un innesco e l\'azione che farai quando scatta (usa la reazione).'],
  ['🔍','Cercare','Cerchi qualcosa: Percezione o Indagare.'],
  ['🎒','Usare un oggetto','Interagire con un secondo oggetto, o usarne uno che richiede l\'azione.'],
];
const BONUS_BASE = [
  ['🗡️','Attacco con l\'arma secondaria','Se combatti con due armi leggere e hai già attaccato.'],
];
const REAZIONI_BASE = [
  ['⚔️','Attacco di opportunità','Quando un nemico esce dalla tua portata senza disimpegnarsi.'],
];

function turnoTempo(sp){
  const t = norm(sp && (sp.cast || '') || '');
  if (/bonus/.test(t)) return 'bonus';
  if (/reaz|reaction/.test(t)) return 'reazione';
  if (/^1 azione|^azione|^1 action|^action/.test(t)) return 'azione';
  return 'altro';
}
/* Gli incantesimi del personaggio divisi per quando si lanciano. */
function incantesimiDelTurno(c){
  const fuori = { azione:[], bonus:[], reazione:[] };
  (c.knownSpells || []).forEach(ref => {
    const sp = spellByRef(ref); if (!sp) return;
    const preparato = !sp.level || (c.preparedSpells || []).some(x => x.id === ref.id && x.source === ref.source);
    if (!preparato && sp.level) return;      // i non preparati non li puoi lanciare
    const q = turnoTempo(sp);
    if (fuori[q]) fuori[q].push({ ref, sp });
  });
  return fuori;
}

function openTurno(charId){
  const c = charById(charId || state.activeCharId); if (!c) return;
  state.turnoChar = c.id;
  openModal({ render: () => turnoHTML() });
}
function turnoHTML(){
  const c = charById(state.turnoChar); if (!c) return '';
  const cur = getPath(c,'hp.current',0), max = getPath(c,'hp.max',0), temp = getPath(c,'hp.temp',0);
  const pct = hpPctFor(c);
  const attive = (c.conditions || []).map(id => CONDITION_BY_ID[id]).filter(Boolean);
  const sp = incantesimiDelTurno(c);
  const vel = c.speed || 9;

  const voce = (icona, nome, sotto, azione) => `
    <button class="attack-row" style="width:100%; text-align:left" ${azione?`onclick="${azione}"`:'style="width:100%; text-align:left"'}>
      <span style="flex-shrink:0; margin-right:11px; font-size:1.15rem">${icona}</span>
      <span class="attack-main">
        <span class="attack-name">${escapeHtml(nome)}</span>
        ${sotto?`<span class="muted" style="font-size:.73rem; display:block">${escapeHtml(sotto)}</span>`:''}
      </span>
    </button>`;

  const rigaIncantesimo = (x) => `
    <div class="attack-row">
      <button class="attack-main" onclick="viewSpellDetail('${jsStr(x.ref.id)}','${jsStr(x.ref.source||'srd')}','${c.id}')">
        <div class="attack-name">✨ ${escapeHtml(spellName(x.sp))}</div>
        <div class="muted" style="font-size:.72rem">${x.sp.level ? x.sp.level+'° livello' : 'trucchetto'}${x.sp.conc?' · concentrazione':''}</div>
      </button>
      ${x.sp.level ? `<button class="attack-btn" title="Spendi uno slot" onclick="turnoSpendiSlot('${c.id}',${x.sp.level})">slot</button>` : ''}
    </div>`;

  const sezione = (titolo, contenuto) => contenuto
    ? `<div class="divider"><span class="flourish">❧</span><span>${titolo}</span></div><div class="list-gap">${contenuto}</div>` : '';

  const slots = (typeof slotsFor === 'function') ? slotsFor(c) : null;
  const rigaSlot = slots ? Object.keys(slots).filter(l => /^[1-9]$/.test(l) && slots[l] > 0).map(l => {
    const tot = slots[l], usati = (c.slotsUsed||{})[l] || 0;
    return `<button class="chip" onclick="turnoSpendiSlot('${c.id}',${l})" style="min-height:40px">
      ${l}° <b style="color:${usati>=tot?'var(--ink-soft)':'var(--gold)'}">${tot-usati}/${tot}</b></button>`;
  }).join('') : '';

  const risorse = (c.resources || []).map(r => {
    const tot = Number(r.total)||0, left = clamp(r.left==null?tot:r.left, 0, Math.max(tot,99));
    return `<button class="chip" onclick="turnoSpendiRisorsa('${c.id}','${jsStr(r.id)}')" style="min-height:40px">
      ${escapeHtml(r.name||'Risorsa')} <b style="color:${left?'var(--gold)':'var(--ink-soft)'}">${left}/${tot}</b></button>`;
  }).join('');

  const inner = `
    <div class="card" style="margin-bottom:12px">
      <div class="row-between" style="align-items:flex-start">
        <div>
          <div class="attack-name" style="font-size:1.05rem">${escapeHtml(c.name||'')}</div>
          <div class="muted" style="font-size:.74rem">CA ${c.ac ?? 10} · Iniziativa ${signStr(Number(c.initiative)||0)} · ${vel} m</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--font-display); font-size:1.35rem; color:${pct<=25?'var(--garnet-bright)':'var(--gold)'}">${cur}<span class="muted" style="font-size:.7rem">/${max}</span></div>
          ${temp?`<div class="muted" style="font-size:.7rem">+${temp} temp</div>`:''}
        </div>
      </div>
      <div class="hp-mini" style="margin-top:8px"><div class="hp-mini-fill ${pct<=25?'low':''}" style="width:${pct}%"></div></div>
      <div class="btn-row" style="margin-top:10px">
        <button class="btn btn-ghost btn-sm" onclick="bumpHP('${c.id}',-1); renderModalRoot()">−1</button>
        <button class="btn btn-ghost btn-sm" onclick="bumpHP('${c.id}',-5); renderModalRoot()">−5</button>
        <button class="btn btn-ghost btn-sm" onclick="bumpHP('${c.id}',1); renderModalRoot()">+1</button>
        <button class="btn btn-ghost btn-sm" onclick="bumpHP('${c.id}',5); renderModalRoot()">+5</button>
      </div>
    </div>

    ${c.concentration ? `<div class="card" style="margin-bottom:12px; border-color:var(--arcane)">
      <div class="row-between">
        <div><b style="font-size:.86rem">🌀 Concentrazione</b>
          <div class="muted" style="font-size:.74rem">${escapeHtml(c.concentration)}</div></div>
        <button class="btn btn-ghost btn-sm" onclick="turnoInterrompiConc('${c.id}')">Interrompi</button>
      </div>
    </div>` : ''}

    <div class="chip-row" style="margin-bottom:4px">
      ${attive.map(x=>`<button class="chip active" onclick="toggleCondition('${c.id}','${x.id}'); renderModalRoot()">${x.icon} ${escapeHtml(x.name)} ✕</button>`).join('')}
      <button class="chip" onclick="closeModal(); openConditionPicker('${c.id}')">＋ condizione</button>
    </div>

    ${sezione('Azione',
      (c.attacks||[]).map((a,i)=>`<div class="attack-row">
        <div class="attack-main" style="pointer-events:none">
          <div class="attack-name">🗡️ ${escapeHtml(a.name||'Attacco')}</div>
          ${a.notes?`<div class="muted" style="font-size:.7rem">${escapeHtml(a.notes)}</div>`:''}
        </div>
        ${a.atk!=='' && a.atk!=null ? `<button class="attack-btn" title="Tira per colpire" onclick="rollAttack('${c.id}',${i})">${escapeHtml(signStr(parseInt(a.atk)||0))}</button>`:''}
        ${a.dmg ? `<button class="attack-btn dmg" title="Tira i danni" onclick="rollDamage('${c.id}',${i})">${escapeHtml(a.dmg)}</button>`:''}
      </div>`).join('')
      + sp.azione.map(rigaIncantesimo).join('')
      + AZIONI_BASE.map(([i,n,d])=>voce(i,n,d,'')).join(''))}

    ${sezione('Azione bonus',
      sp.bonus.map(rigaIncantesimo).join('') + BONUS_BASE.map(([i,n,d])=>voce(i,n,d,'')).join(''))}

    ${sezione('Reazione',
      sp.reazione.map(rigaIncantesimo).join('') + REAZIONI_BASE.map(([i,n,d])=>voce(i,n,d,'')).join(''))}

    ${(rigaSlot || risorse) ? `<div class="divider"><span class="flourish">❧</span><span>Da spendere</span></div>
      ${rigaSlot?`<div class="chip-row" style="margin-bottom:8px">${rigaSlot}</div>`:''}
      ${risorse?`<div class="chip-row">${risorse}</div>`:''}` : ''}

    <div class="btn-row" style="margin-top:14px">
      <button class="btn btn-ghost" onclick="closeModal(); openSheet('${c.id}')">Apri la scheda</button>
      <button class="btn btn-primary" onclick="closeModal()">Fatto</button>
    </div>`;
  return modalShell('⚔️ Il tuo turno', inner);
}

function turnoSpendiSlot(charId, livello){
  const c = charById(charId); if (!c) return;
  c.slotsUsed = c.slotsUsed || {};
  const slots = (typeof slotsFor === 'function') ? slotsFor(c) : {};
  const tot = (slots && slots[livello]) || 0;
  const usati = c.slotsUsed[livello] || 0;
  if (usati >= tot){ toast('Niente più slot di ' + livello + '° livello'); return; }
  c.slotsUsed[livello] = usati + 1;
  scheduleSave('characters', c);
  renderModalRoot(); render();
  toast('✦ Speso uno slot di ' + livello + '° — ne restano ' + (tot - usati - 1));
}
function turnoSpendiRisorsa(charId, idRisorsa){
  const c = charById(charId); if (!c) return;
  const r = (c.resources||[]).find(x => x.id === idRisorsa); if (!r) return;
  const tot = Number(r.total)||0;
  const left = clamp(r.left==null?tot:r.left, 0, Math.max(tot,99));
  if (left <= 0){ toast('«' + (r.name||'') + '» è esaurita'); return; }
  r.left = left - 1;
  scheduleSave('characters', c);
  renderModalRoot(); render();
}
function turnoInterrompiConc(charId){
  const c = charById(charId); if (!c) return;
  c.concentration = null;
  scheduleSave('characters', c);
  renderModalRoot(); render();
  toast('Concentrazione interrotta');
}
