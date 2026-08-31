/* TwentyNation — Compagni della campagna
   ────────────────────────────────────────────────────────────────
   Le schede degli altri giocatori del tavolo, in SOLA LETTURA e in
   una sezione tutta loro. Non si mescolano mai ai tuoi personaggi:
   quello è successo una volta per sbaglio ed era una fuga di dati,
   non una funzione.

   Chi decide è il giocatore, sempre. Nessuna scheda arriva al tavolo
   se non l'hai acceso tu, e scegli anche QUANTO far vedere:

   · «l'essenziale» — nome, ritratto, classe e livello, PF, CA,
     percezione passiva, velocità, condizioni ed effetti attivi.
     Quello che serve al master per far andare avanti un combattimento.
   · «tutto» — in più caratteristiche, tiri salvezza, abilità in cui sei
     competente, attacchi, slot e dadi vita.

   Cosa NON parte mai, con nessuna delle due: note, diario, storia e
   background scritti, inventario e monete. Sono cose tue, e per il
   gioco non servono a nessuno.
   ──────────────────────────────────────────────────────────────── */

const PARTY_DETTAGLI = {
  essenziale: { label:'L\'essenziale', desc:'Nome, ritratto, classe e livello, PF, CA, percezione passiva, velocità, condizioni ed effetti.' },
  tutto:      { label:'Tutto',         desc:'In più: caratteristiche, tiri salvezza, abilità competenti, attacchi, slot e dadi vita.' },
};
/* Il ritratto e' l'unica cosa pesante che passa: un documento su
   Firestore non puo' superare il megabyte, e una foto grande piu' il
   resto della scheda ci arriva vicino. Sopra questa soglia si manda la
   scheda senza foto invece di far fallire tutto l'invio. */
const PARTY_FOTO_MAX = 200000;

function partyDoc(){
  const id = state.campaign && state.campaign.id;
  if (!id || !currentUser || !firebaseReady) return null;
  return db.collection('campaigns').doc(id).collection('party');
}
/* La tua scheda condivisa, se c'e' */
function pgCondiviso(charId){
  return (state.sharedParty || []).find(p => p.id === charId && p.sharedBy === (currentUser && currentUser.uid)) || null;
}
function dettaglioDi(charId){
  const p = pgCondiviso(charId);
  return p ? (p.dettaglio || 'essenziale') : null;
}
/* Le schede DEGLI ALTRI: la tua la vedi gia' sopra, fra i tuoi. */
function compagniDelTavolo(){
  const mio = currentUser && currentUser.uid;
  return (state.sharedParty || []).filter(p => p.sharedBy !== mio);
}

/* ─── L'istantanea che parte ─── */
function istantaneaPg(c, dettaglio){
  const mod = (v) => Math.floor(((Number(v)||10) - 10) / 2);
  const foto = (c.portrait && String(c.portrait).length <= PARTY_FOTO_MAX) ? c.portrait : null;
  const base = {
    id: c.id,
    dettaglio: dettaglio === 'tutto' ? 'tutto' : 'essenziale',
    nome: c.name || 'Senza nome',
    avatar: c.avatar || '🎭',
    portrait: foto,
    classe: c.classField || '',
    sottoclasse: (typeof sottoclasseDi === 'function' && sottoclasseDi(c)) ? sottoclasseDi(c).name : '',
    classe2: c.class2 || '', livello2: Number(c.level2) || 0,
    livello: c.level || 1,
    razza: c.race || '',
    pf: { current: getPath(c,'hp.current',0), max: getPath(c,'hp.max',0), temp: getPath(c,'hp.temp',0) },
    ca: c.ac || 10,
    velocita: c.speed || 9,
    percezionePassiva: (typeof passivePerception === 'function') ? passivePerception(c) : null,
    condizioni: (c.conditions || []).slice(),
    effetti: (c.effetti || []).map(e => ({ nome: e.nome, round: (e.round != null ? e.round : null), durata: e.durata || '' })),
    concentrazione: (c.concentration && c.concentration.on) ? (c.concentration.spell || 'sì') : '',
    sfinimento: c.exhaustion || 0,
    ispirazione: !!c.inspiration,
    aggiornatoIl: Date.now(),
  };
  if (base.dettaglio !== 'tutto') return base;

  const SK = (typeof SKILLS !== 'undefined') ? SKILLS : [];
  base.caratteristiche = Object.assign({}, c.abilities || {});
  base.tiriSalvezza = (c.saveProf || []).slice();
  base.abilita = (c.skillProf || []).slice();
  base.esperto = (c.skillExpert || []).slice();
  base.competenza = (typeof profBonus === 'function') ? profBonus(c.level || 1) : null;
  base.attacchi = (c.attacks || []).map(a => ({ nome: a.name || '', colpire: a.bonus || '', danni: a.damage || '', note: a.notes || '' }));
  base.dadoVita = c.hitDie || 8;
  base.dadiVitaUsati = c.hitDiceUsed || 0;
  base.slot = (typeof slotsFor === 'function') ? (slotsFor(c) || []) : [];
  base.slotUsati = Object.assign({}, c.slotsUsed || {});
  base.pattoUsati = c.pactUsed || 0;
  return base;
}

/* ─── Accendere, spegnere, aggiornare ─── */
async function condividiPg(charId, dettaglio){
  const coll = partyDoc();
  const c = charById(charId);
  if (!coll || !c){ toast('Serve essere in una campagna e collegati'); return; }
  const payload = istantaneaPg(c, dettaglio);
  payload.sharedBy = currentUser.uid;
  payload.sharedByName = (typeof myName === 'function') ? myName() : 'Un giocatore';
  payload.sharedAt = Date.now();
  try {
    setSaveStatus('saving');
    await coll.doc(c.id).set(typeof perNuvola === 'function' ? perNuvola(payload) : payload, { merge: false });
    setSaveStatus('saved');
    toast('⚔️ ' + (c.name || 'La scheda') + ' è al tavolo (' + PARTY_DETTAGLI[payload.dettaglio].label.toLowerCase() + ')');
    closeModal(); render();
  } catch(e){
    console.error('Condivisione scheda non riuscita', e);
    setSaveStatus('idle');
    toast('⚠️ Non sono riuscito a metterla al tavolo');
  }
}
async function ritiraPg(charId){
  const coll = partyDoc();
  if (!coll) return;
  try {
    await coll.doc(charId).delete();
    toast('La scheda non è più al tavolo');
    closeModal(); render();
  } catch(e){ console.error(e); toast('⚠️ Non sono riuscito a ritirarla'); }
}
/* Quando la scheda cambia (PF, condizioni, effetti) la copia al tavolo
   va rinfrescata — ma senza una scrittura per ogni tocco del «−1». */
const __partyTimer = {};
function aggiornaPgCondiviso(charId){
  if (!partyDoc()) return;
  const d = dettaglioDi(charId);
  if (!d) return;                       // non condiviso: niente da fare
  clearTimeout(__partyTimer[charId]);
  __partyTimer[charId] = setTimeout(() => { condividiPgSilenzioso(charId, d); }, 1500);
}
async function condividiPgSilenzioso(charId, dettaglio){
  const coll = partyDoc(); const c = charById(charId);
  if (!coll || !c) return;
  const payload = istantaneaPg(c, dettaglio);
  payload.sharedBy = currentUser.uid;
  payload.sharedByName = (typeof myName === 'function') ? myName() : 'Un giocatore';
  payload.sharedAt = Date.now();
  try { await coll.doc(c.id).set(typeof perNuvola === 'function' ? perNuvola(payload) : payload, { merge: false }); }
  catch(e){ console.warn('Aggiornamento scheda al tavolo non riuscito', e); }
}
/* Cancellando un personaggio, sparisce anche dal tavolo. */
function ritiraPgSeCondiviso(charId){
  if (dettaglioDi(charId)) { const coll = partyDoc(); if (coll) coll.doc(charId).delete().catch(()=>{}); }
}

/* ─── La finestrella per decidere ─── */
function apriCondividiPg(charId){
  const c = charById(charId); if (!c) return;
  if (!state.campaign || !state.campaign.id){ toast('Prima entra in una campagna'); return; }
  if (!currentUser){ toast('Serve il collegamento all\'account'); return; }
  const attuale = dettaglioDi(charId);
  openModal({ render: () => modalShell('⚔️ ' + (c.name||'Scheda') + ' al tavolo', `
    <p class="muted" style="font-size:.84rem; margin-bottom:12px">
      Decidi tu se e quanto far vedere agli altri di «${escapeHtml(state.campaign.name || 'questa campagna')}».
      Note, diario, storia, inventario e monete non partono mai.
    </p>
    ${Object.keys(PARTY_DETTAGLI).map(k => `
      <button class="attack-row" style="width:100%; text-align:left; margin-bottom:8px; ${attuale===k?'border-color:var(--gold)':''}"
              onclick="condividiPg('${c.id}','${k}')">
        <span class="attack-main">
          <span class="attack-name">${PARTY_DETTAGLI[k].label}${attuale===k?' ✓':''}</span>
          <span class="muted" style="font-size:.74rem">${PARTY_DETTAGLI[k].desc}</span>
        </span>
      </button>`).join('')}
    ${attuale ? `<button class="btn btn-ghost btn-block" style="margin-top:6px" onclick="ritiraPg('${c.id}')">Togli dal tavolo</button>` : ''}
    <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="closeModal()">Chiudi</button>
  `) });
}

/* ─── La sezione in prima pagina ─── */
function compagniCampagnaHTML(){
  if (!state.campaign || !state.campaign.id) return '';
  const altri = compagniDelTavolo();
  if (!altri.length) return '';
  return `
    <div class="divider"><span class="flourish">❧</span><span>Compagni della campagna</span></div>
    <div class="muted" style="font-size:.72rem; text-align:center; margin:-4px 0 10px">
      Schede degli altri giocatori, in sola lettura. Le vedi perché le hanno messe loro al tavolo.
    </div>
    <div class="list-gap">
      ${altri.map(p => {
        const pf = p.pf || {};
        const perc = pf.max ? Math.max(0, Math.min(100, Math.round((pf.current/pf.max)*100))) : 0;
        const marchi = []
          .concat((p.condizioni||[]).length ? ['🩸 ' + p.condizioni.length] : [])
          .concat(p.concentrazione ? ['🌀'] : [])
          .concat((p.effetti||[]).length ? ['⏳ ' + p.effetti.length] : []);
        return `<button class="attack-row compagno-riga" onclick="apriCompagno('${jsStr(p.id)}')">
          <span class="compagno-faccia">${p.portrait
            ? `<img src="${attr(p.portrait)}" alt="">`
            : `<span>${p.avatar || '🎭'}</span>`}</span>
          <span class="attack-main">
            <span class="attack-name">${escapeHtml(p.nome || 'Senza nome')}</span>
            <span class="muted" style="font-size:.72rem">${escapeHtml([p.classe, p.livello ? 'Lv ' + p.livello : '', p.razza].filter(Boolean).join(' · '))}</span>
            <span class="compagno-barra"><i style="width:${perc}%"></i></span>
          </span>
          <span class="compagno-numeri">
            <b>${pf.current != null ? pf.current : '?'}<span class="muted">/${pf.max||'?'}</span></b>
            <span class="muted">CA ${p.ca != null ? p.ca : '—'}</span>
            ${marchi.length ? `<span class="compagno-marchi">${marchi.join(' ')}</span>` : ''}
          </span>
        </button>`;
      }).join('')}
    </div>`;
}
function apriCompagno(id){
  const p = (state.sharedParty || []).find(x => x.id === id);
  if (!p) return;
  const SK = (typeof SKILLS !== 'undefined') ? SKILLS : [];
  const mod = (v) => { const m = Math.floor(((Number(v)||10) - 10) / 2); return (m>=0?'+':'') + m; };
  const nomeAb = (k) => { const s = SK.find(x=>x.key===k); return s ? s.label : k; };
  const pf = p.pf || {};
  const riga = (etichetta, valore) => valore ? `<div class="row-between" style="margin-bottom:5px"><span class="muted">${escapeHtml(etichetta)}</span><b>${escapeHtml(String(valore))}</b></div>` : '';
  openModal({ render: () => modalShell((p.avatar||'🎭') + ' ' + (p.nome||'Compagno'), `
    <div class="muted" style="font-size:.73rem; margin-bottom:10px">
      ${escapeHtml([p.classe + (p.sottoclasse?' ('+p.sottoclasse+')':''), p.classe2 ? p.classe2 + ' ' + p.livello2 : '',
        'Lv ' + (p.livello||1), p.razza].filter(Boolean).join(' · '))}
      · al tavolo da ${escapeHtml(p.sharedByName || 'un giocatore')}
    </div>
    <div class="card" style="margin-bottom:10px">
      ${riga('Punti ferita', (pf.current != null ? pf.current : '?') + ' / ' + (pf.max || '?') + (pf.temp ? ' (+' + pf.temp + ' temp.)' : ''))}
      ${riga('Classe armatura', p.ca)}
      ${riga('Velocità', p.velocita ? p.velocita + ' m' : '')}
      ${riga('Percezione passiva', p.percezionePassiva)}
      ${p.sfinimento ? riga('Sfinimento', 'livello ' + p.sfinimento) : ''}
      ${p.ispirazione ? riga('Ispirazione', 'sì') : ''}
      ${riga('Concentrato su', p.concentrazione)}
      ${(p.condizioni||[]).length ? riga('Condizioni', p.condizioni.map(k =>
        (typeof CONDITION_BY_ID !== 'undefined' && CONDITION_BY_ID[k]) ? CONDITION_BY_ID[k].name : k).join(', ')) : ''}
      ${(p.effetti||[]).length ? riga('Effetti', p.effetti.map(e =>
        e.nome + (e.round != null ? ' (' + e.round + ' round)' : (e.durata ? ' (' + e.durata + ')' : ''))).join(', ')) : ''}
    </div>
    ${p.dettaglio === 'tutto' ? `
      <div class="divider"><span class="flourish">❧</span><span>Caratteristiche</span></div>
      <div class="chip-row" style="justify-content:center">
        ${Object.keys(p.caratteristiche||{}).map(k =>
          `<span class="chip">${escapeHtml(k.toUpperCase())} ${p.caratteristiche[k]} <b>${mod(p.caratteristiche[k])}</b></span>`).join('')}
      </div>
      ${(p.tiriSalvezza||[]).length ? `<div class="muted" style="font-size:.76rem; margin-top:8px">
        <b>TS competenti:</b> ${escapeHtml(p.tiriSalvezza.map(k=>k.toUpperCase()).join(', '))}</div>` : ''}
      ${(p.abilita||[]).length ? `<div class="muted" style="font-size:.76rem; margin-top:4px">
        <b>Abilità:</b> ${escapeHtml(p.abilita.map(nomeAb).join(', '))}</div>` : ''}
      ${(p.attacchi||[]).length ? `
        <div class="divider"><span class="flourish">❧</span><span>Attacchi</span></div>
        ${p.attacchi.map(a => `<div class="attack-row promemoria" style="margin-bottom:6px">
          <span class="attack-main"><span class="attack-name">${escapeHtml(a.nome||'')}</span>
          <span class="muted" style="font-size:.74rem">${escapeHtml([a.colpire, a.danni, a.note].filter(Boolean).join(' · '))}</span></span>
        </div>`).join('')}` : ''}
      ${(p.slot||[]).length ? `<div class="muted" style="font-size:.76rem; margin-top:10px">
        <b>Slot:</b> ${p.slot.map((n,i)=> (i+1) + '°: ' + Math.max(0, n - ((p.slotUsati||{})[i+1]||0)) + '/' + n).join('  ·  ')}</div>` : ''}
      ${p.dadoVita ? `<div class="muted" style="font-size:.76rem; margin-top:4px">
        <b>Dadi vita:</b> d${p.dadoVita} · ${Math.max(0,(p.livello||1)-(p.dadiVitaUsati||0))} rimasti</div>` : ''}
    ` : `<div class="muted" style="font-size:.75rem; text-align:center">
        ${escapeHtml(p.sharedByName || 'Chi l\'ha messa')} ha scelto di mostrare solo l'essenziale.</div>`}
    <div class="muted" style="font-size:.68rem; text-align:center; margin-top:12px">
      Aggiornata ${p.aggiornatoIl ? new Date(p.aggiornatoIl).toLocaleString('it-IT') : '—'}. Sola lettura.
    </div>
    <button class="btn btn-ghost btn-block" style="margin-top:10px" onclick="closeModal()">Chiudi</button>
  `) });
}
