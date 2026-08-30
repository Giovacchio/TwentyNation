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

/* CHI PREPARA E CHI NO.
   Qui c'era un errore vero: la schermata mostrava soltanto gli
   incantesimi segnati come preparati, per tutti. Ma bardo, stregone,
   warlock e ranger non preparano niente — lanciano quello che
   conoscono, e basta. A loro la schermata restava vuota proprio nel
   momento in cui serve. Preparano solo chierico, druido e paladino
   (che conoscono tutta la lista) e il mago (che ha il libro). */
function preparaIncantesimi(c){
  const cl = (typeof CLASS_BY_ID !== 'undefined' && c.classId) ? CLASS_BY_ID[c.classId] : null;
  if (cl && cl.spellType) return cl.spellType === 'prepared' || cl.spellType === 'book';
  if (c.casterType === 'pact') return false;              // il warlock non prepara
  // Scheda senza classe collegata (importata da PDF, scritta a mano):
  // non si indovina. Meglio mostrarli tutti che nascondere quello che
  // il personaggio sa fare davvero.
  return false;
}
/* Gli incantesimi del personaggio divisi per quando si lanciano. */
function incantesimiDelTurno(c){
  const fuori = { azione:[], bonus:[], reazione:[], altro:[] };
  const prepara = preparaIncantesimi(c);
  const segnati = (c.preparedSpells || []);
  // Un preparatore che non ha ancora segnato niente non deve ritrovarsi
  // lo schermo vuoto: si mostrano tutti e glielo si dice.
  const filtra = prepara && segnati.length > 0;
  (c.knownSpells || []).forEach(ref => {
    const sp = spellByRef(ref); if (!sp) return;
    if (filtra && sp.level && !segnati.includes(ref.id)) return;
    const q = turnoTempo(sp);
    (fuori[q] || fuori.altro).push({ ref, sp });
  });
  const perLivello = (a,b) => (a.sp.level||0)-(b.sp.level||0) || spellName(a.sp).localeCompare(spellName(b.sp),'it');
  Object.keys(fuori).forEach(k => fuori[k].sort(perLivello));
  fuori.__daPreparare = prepara && !segnati.length;
  return fuori;
}
/* Quale slot si può usare per un incantesimo di livello N: il suo, o il
   primo più alto disponibile. È il modo in cui si lancia davvero. */
function slotUsabile(c, livello){
  const slots = (typeof slotsFor === 'function') ? (slotsFor(c) || []) : [];
  for (let l = livello; l <= slots.length; l++){
    const tot = slots[l-1] || 0;
    if (tot && ((c.slotsUsed||{})[l] || 0) < tot) return l;
  }
  return 0;
}

/* ─── L'economia del turno ───────────────────────────────────────
   Azione, azione bonus e reazione si spendono una volta per turno: è
   la cosa che al tavolo si dimentica più spesso. Qui si segnano da
   sole quando lanci o attacchi, e si azzerano col tasto «Nuovo turno».
   Vive in memoria: è roba di trenta secondi, non da salvare. */
let turnoUsate = { azione:false, bonus:false, reazione:false, chi:null };
function turnoAzzera(charId, silenzioso){
  turnoUsate = { azione:false, bonus:false, reazione:false, chi: charId || null };
  if (!silenzioso){ renderModalRoot(); toast('↻ Nuovo turno'); }
}
function turnoSegna(quando){
  if (turnoUsate[quando] === false) turnoUsate[quando] = true;
}
function turnoUsa(quando){
  turnoUsate[quando] = !turnoUsate[quando];
  renderModalRoot();
}
/* Le azioni di base sono dieci righe di regolamento: utili da
   ricordare, ma se stanno sempre aperte spingono in fondo allo schermo
   proprio le cose che questo personaggio sa fare. Restano chiuse quando
   hai qualcos'altro in quella parte del turno, aperte quando no. */
let turnoAperte = {};
function turnoApriBase(quando){
  turnoAperte[quando] = !turnoAperte[quando];
  renderModalRoot();
}

function openTurno(charId){
  const c = charById(charId || state.activeCharId); if (!c) return;
  state.turnoChar = c.id;
  if (turnoUsate.chi !== c.id) turnoAzzera(c.id, true);
  openModal({ render: () => turnoHTML() });
}
function turnoHTML(){
  const c = charById(state.turnoChar); if (!c) return '';
  const cur = getPath(c,'hp.current',0), max = getPath(c,'hp.max',0), temp = getPath(c,'hp.temp',0);
  const pct = hpPctFor(c);
  const attive = (c.conditions || []).map(id => CONDITION_BY_ID[id]).filter(Boolean);
  const sp = incantesimiDelTurno(c);
  const vel = c.speed || 9;
  const aTerra = max > 0 && cur <= 0;

  const voce = (icona, nome, sotto, azione) => {
    const dentro = `
      <span style="flex-shrink:0; margin-right:11px; font-size:1.15rem">${icona}</span>
      <span class="attack-main">
        <span class="attack-name">${escapeHtml(nome)}</span>
        ${sotto?`<span class="muted" style="font-size:.73rem; display:block">${escapeHtml(sotto)}</span>`:''}
      </span>`;
    return azione
      ? `<button class="attack-row" style="width:100%; text-align:left" onclick="${azione}">${dentro}</button>`
      : `<div class="attack-row promemoria">${dentro}</div>`;
  };

  /* La riga di un incantesimo. Il tasto «Lancia» fa il mestiere per
     intero: spende lo slot giusto (anche a livello più alto se quello
     suo è finito), accende la concentrazione se serve e segna l'azione
     come usata. Prima c'era un tastino «slot» che spendeva e basta. */
  const rigaIncantesimo = (quando) => (x) => {
    const liv = x.sp.level || 0;
    const usabile = liv ? slotUsabile(c, liv) : 0;
    const spento = liv && !usabile;
    const conc = !!x.sp.conc;
    const giaConc = conc && c.concentration;
    return `<div class="attack-row ${spento?'promemoria':''}">
      <button class="attack-main" onclick="viewSpellDetail('${jsStr(x.ref.id)}','${jsStr(x.ref.source||'srd')}','${c.id}')">
        <div class="attack-name">${liv?'✨':'🔹'} ${escapeHtml(spellName(x.sp))}${conc?' <span class="muted" style="font-size:.7rem">🌀</span>':''}</div>
        <div class="muted" style="font-size:.72rem">${liv ? liv+'° livello' : 'trucchetto'}${
          spento ? ' · <b style="color:var(--warn)">niente slot</b>'
                 : (usabile && usabile !== liv ? ' · con uno slot di '+usabile+'°' : '')}${
          giaConc ? ' · sostituisce «'+escapeHtml((c.concentration.name)||'')+'»' : ''}</div>
      </button>
      <button class="attack-btn" ${spento?'disabled':''} title="Lancia"
        onclick="turnoLancia('${c.id}','${jsStr(x.ref.id)}','${jsStr(x.ref.source||'srd')}','${quando}')">Lancia</button>
    </div>`;
  };

  const azSotto = (typeof azioniDi === 'function') ? azioniDi(c) : [];
  const extra = (quando) => azSotto.filter(a => (a.quando||'bonus') === quando)
    .map(a => voce('⚙️', a.nome || '', a.testo || '', '')).join('');

  /* Ogni sezione dice se quella parte del turno l'hai già spesa, e la
     si può segnare a mano per quello che l'app non sa. */
  const sezione = (chiave, titolo, contenuto) => {
    if (!contenuto) return '';
    const usata = chiave && turnoUsate[chiave];
    return `<div class="turno-testa">
        <div class="divider" style="flex:1; margin:0"><span class="flourish">❧</span><span>${titolo}</span></div>
        ${chiave ? `<button class="chip ${usata?'active':''}" style="flex-shrink:0" onclick="turnoUsa('${chiave}')">${usata?'✓ usata':'libera'}</button>` : ''}
      </div>
      <div class="list-gap ${usata?'turno-spenta':''}">${contenuto}</div>`;
  };

  const slots = (typeof slotsFor === 'function') ? (slotsFor(c) || []) : [];
  const rigaSlot = slots.map((tot, i) => {
    const liv = i + 1;
    if (!tot) return '';
    const usati = (c.slotsUsed||{})[liv] || 0;
    return `<button class="chip" onclick="turnoSpendiSlot('${c.id}',${liv})" style="min-height:40px">
      ${liv}° <b style="color:${usati>=tot?'var(--ink-soft)':'var(--gold)'}">${tot-usati}/${tot}</b></button>`;
  }).join('');

  const risorse = (c.resources || []).map((r, i) => {
    const tot = Number(r.total)||0, left = clamp(r.left==null?tot:r.left, 0, Math.max(tot,99));
    return `<button class="chip" onclick="turnoSpendiRisorsa('${c.id}',${i})" style="min-height:40px">
      ${escapeHtml(r.name||'Risorsa')} <b style="color:${left?'var(--gold)':'var(--ink-soft)'}">${left}/${tot}</b></button>`;
  }).join('');

  /* Prima quello che sa fare lui, poi — richiuse — le azioni che
     chiunque può fare. Se non ha niente di suo restano aperte, o la
     sezione sembrerebbe vuota. */
  const tue = (quando, mie, base) => {
    const aperto = turnoAperte[quando] === undefined ? !mie : turnoAperte[quando];
    const righe = base.map(([i,n,d])=>voce(i,n,d,'')).join('');
    if (!mie) return righe;
    return mie + `<button class="chip" style="margin-top:6px" onclick="turnoApriBase('${quando}')">${aperto?'▴ nascondi':'▾ le altre azioni possibili ('+base.length+')'}</button>`
      + (aperto ? `<div class="list-gap" style="margin-top:6px">${righe}</div>` : '');
  };

  const attacchi = (c.attacks||[]).map((a,i)=>`<div class="attack-row">
      <div class="attack-main" style="pointer-events:none">
        <div class="attack-name">🗡️ ${escapeHtml(a.name||'Attacco')}</div>
        ${a.notes?`<div class="muted" style="font-size:.7rem">${escapeHtml(a.notes)}</div>`:''}
      </div>
      ${a.atk!=='' && a.atk!=null ? `<button class="attack-btn" title="Tira per colpire" onclick="turnoSegna('azione'); rollAttack('${c.id}',${i})">${escapeHtml(signStr(parseInt(a.atk)||0))}</button>`:''}
      ${a.dmg ? `<button class="attack-btn dmg" title="Tira i danni" onclick="rollDamage('${c.id}',${i})">${escapeHtml(a.dmg)}</button>`:''}
    </div>`).join('');

  const inner = `
    <div class="card" style="margin-bottom:10px">
      <div class="row-between" style="align-items:flex-start">
        <div>
          <div class="attack-name" style="font-size:1.05rem">${escapeHtml(c.name||'')}</div>
          <div class="muted" style="font-size:.74rem">CA ${c.ac ?? 10} · Iniziativa ${signStr(Number(c.initiative)||0)}${
            (c.casterType && c.casterType!=='none') ? ' · CD ' + (8 + spellcastingMod(c)) : ''}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--font-display); font-size:1.35rem; color:${pct<=25?'var(--garnet-bright)':'var(--gold)'}">${cur}<span class="muted" style="font-size:.7rem">/${max}</span></div>
          ${temp?`<div class="muted" style="font-size:.7rem">+${temp} temp</div>`:''}
        </div>
      </div>
      <div class="hp-mini" style="margin-top:8px"><div class="hp-mini-fill ${pct<=25?'low':''}" style="width:${pct}%"></div></div>
      <div class="btn-row" style="margin-top:10px">
        <button class="btn btn-ghost btn-sm" onclick="turnoDanno('${c.id}',1)">−1</button>
        <button class="btn btn-ghost btn-sm" onclick="turnoDanno('${c.id}',5)">−5</button>
        <button class="btn btn-ghost btn-sm" onclick="bumpHP('${c.id}',1); renderModalRoot()">+1</button>
        <button class="btn btn-ghost btn-sm" onclick="bumpHP('${c.id}',5); renderModalRoot()">+5</button>
      </div>
    </div>

    <div class="turno-barra">
      <button class="btn btn-ghost btn-sm" onclick="turnoAzzera('${c.id}')">↻ Nuovo turno</button>
      <span class="muted" style="font-size:.74rem">🏃 ${vel} m · scatto ${vel*2} m</span>
    </div>

    ${aTerra ? `<div class="card" style="margin:10px 0; border-color:var(--garnet-bright)">
      <div class="card-title" style="color:var(--garnet-bright)">💀 Sei a terra</div>
      <p class="muted" style="font-size:.8rem; margin:6px 0 10px">A 0 punti ferita il tuo turno è un tiro salvezza contro morte. 10 o più è un successo.</p>
      <div class="row-between" style="margin-bottom:8px">
        <span class="muted" style="font-size:.78rem">Successi</span>
        <span>${[0,1,2].map(i=>`<button class="ds-dot win ${i < (c.deathSaves&&c.deathSaves.win||0) ? 'on':''}" onclick="toggleDeathSave('${c.id}','win',${i}); renderModalRoot()"></button>`).join('')}</span>
      </div>
      <div class="row-between" style="margin-bottom:10px">
        <span class="muted" style="font-size:.78rem">Fallimenti</span>
        <span>${[0,1,2].map(i=>`<button class="ds-dot fail ${i < (c.deathSaves&&c.deathSaves.fail||0) ? 'on':''}" onclick="toggleDeathSave('${c.id}','fail',${i}); renderModalRoot()"></button>`).join('')}</span>
      </div>
      <button class="btn btn-gold btn-block" onclick="rollDeathSave('${c.id}')">🎲 Tira il tiro salvezza</button>
    </div>` : ''}

    ${c.concentration ? `<div class="card" style="margin:10px 0; border-color:var(--arcane)">
      <div class="row-between">
        <div><b style="font-size:.86rem">🌀 Concentrazione</b>
          <div class="muted" style="font-size:.74rem">${escapeHtml((c.concentration && c.concentration.name) || String(c.concentration||''))}</div></div>
        <div class="btn-row" style="flex-shrink:0">
          <button class="btn btn-ghost btn-sm" onclick="turnoTsConcentrazione('${c.id}')">TS ${signStr(saveMod(c,'con'))}</button>
          <button class="btn btn-ghost btn-sm" onclick="turnoInterrompiConc('${c.id}')">Interrompi</button>
        </div>
      </div>
    </div>` : ''}

    <div class="chip-row" style="margin:10px 0 4px">
      ${attive.map(x=>`<button class="chip active" onclick="toggleCondition('${c.id}','${x.id}'); renderModalRoot()">${x.icon} ${escapeHtml(x.name)} ✕</button>`).join('')}
      <button class="chip" onclick="closeModal(); openConditionPicker('${c.id}')">＋ condizione</button>
    </div>

    ${sp.__daPreparare ? `<div class="card" style="margin:10px 0; border-color:var(--warn)">
      <div class="muted" style="font-size:.78rem">⚠️ Da ${escapeHtml((CLASS_BY_ID[c.classId]||{}).name || 'questa classe')} tieni preparati solo alcuni incantesimi, ma non ne hai ancora segnato nessuno. Per ora li vedi tutti: segnali con la stella nella scheda Magie.</div>
    </div>` : ''}

    ${sezione('azione', 'Azione', tue('azione', attacchi + sp.azione.map(rigaIncantesimo('azione')).join('') + extra('azione'), AZIONI_BASE))}

    ${sezione('bonus', 'Azione bonus', tue('bonus', sp.bonus.map(rigaIncantesimo('bonus')).join('') + extra('bonus'), BONUS_BASE))}

    ${sezione('reazione', 'Reazione', tue('reazione', sp.reazione.map(rigaIncantesimo('reazione')).join('') + extra('reazione'), REAZIONI_BASE))}

    ${sezione(null, 'Fuori dal turno',
      sp.altro.map(rigaIncantesimo('')).join(''))}

    ${(rigaSlot || risorse) ? `<div class="divider"><span class="flourish">❧</span><span>Da spendere</span></div>
      ${rigaSlot?`<div class="chip-row" style="margin-bottom:8px">${rigaSlot}</div>`:''}
      ${risorse?`<div class="chip-row">${risorse}</div>`:''}` : ''}

    <div class="btn-row" style="margin-top:14px">
      <button class="btn btn-ghost" onclick="closeModal(); openSheet('${c.id}')">Apri la scheda</button>
      <button class="btn btn-primary" onclick="closeModal()">Fatto</button>
    </div>`;
  return modalShell('⚔️ Il tuo turno', inner);
}

/* Lanciare per davvero: slot giusto, concentrazione, azione segnata. */
function turnoLancia(charId, spellId, source, quando){
  const c = charById(charId); if (!c) return;
  const sp = (typeof spellByRef === 'function') ? spellByRef({ id: spellId, source: source }) : null;
  if (!sp){ toast('Incantesimo non trovato'); return; }
  const liv = sp.level || 0;
  if (liv){
    const usabile = slotUsabile(c, liv);
    if (!usabile){ toast('Non hai più slot per lanciarlo'); return; }
    c.slotsUsed = c.slotsUsed || {};
    c.slotsUsed[usabile] = (c.slotsUsed[usabile] || 0) + 1;
    if (usabile !== liv) toast('✨ ' + spellName(sp) + ' con uno slot di ' + usabile + '°');
    else toast('✨ ' + spellName(sp) + ' · slot di ' + liv + '° speso');
  } else toast('🔹 ' + spellName(sp));
  if (sp.conc) c.concentration = { name: spellName(sp) };
  if (quando && turnoUsate[quando] !== undefined) turnoUsate[quando] = true;
  scheduleSave('characters', c);
  renderModalRoot(); render();
}
/* Il tiro salvezza per non perdere la concentrazione: CD 10, o metà dei
   danni subiti se è di più. È la regola che al tavolo salta sempre. */
function turnoTsConcentrazione(charId, danni){
  const c = charById(charId); if (!c) return;
  const cd = Math.max(10, Math.floor((Number(danni)||0) / 2));
  performD20('Concentrazione (CD ' + cd + ')', saveMod(c, 'con'), 'normal', {t:'save', c:charId, k:'con'});
}
/* I danni presi dalla schermata del turno ricordano il tiro salvezza. */
function turnoDanno(charId, quanti){
  const c = charById(charId); if (!c) return;
  const concentrava = !!c.concentration;
  bumpHP(charId, -Math.abs(quanti));
  renderModalRoot();
  if (concentrava && charById(charId).concentration){
    const cd = Math.max(10, Math.floor(Math.abs(quanti) / 2));
    setTimeout(() => toast('🌀 Tiro salvezza su Costituzione, CD ' + cd + ', o perdi la concentrazione'), 250);
  }
}

function turnoSpendiSlot(charId, livello){
  const c = charById(charId); if (!c) return;
  c.slotsUsed = c.slotsUsed || {};
  const slots = (typeof slotsFor === 'function') ? (slotsFor(c) || []) : [];
  const tot = slots[livello - 1] || 0;       // l'array parte da 0, i livelli da 1
  const usati = c.slotsUsed[livello] || 0;
  if (usati >= tot){ toast('Niente più slot di ' + livello + '° livello'); return; }
  c.slotsUsed[livello] = usati + 1;
  scheduleSave('characters', c);
  renderModalRoot(); render();
  toast('✦ Speso uno slot di ' + livello + '° — ne restano ' + (tot - usati - 1));
}
function turnoSpendiRisorsa(charId, i){
  const c = charById(charId); if (!c) return;
  const r = (c.resources||[])[i]; if (!r) return;
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
