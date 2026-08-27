/* ══════════════════════════════════════════════════════════════
   Grimorio — campagna condivisa
   Un tavolo: il master e i suoi giocatori. Quello che uno mette
   nella campagna lo vedono gli altri membri, e nessun altro.
   I dati personali restano dove stanno: qui c'è solo ciò che
   scegli di mettere in comune.

   Struttura su Firestore:
     campaigns/{id}                     → nome, proprietario, membri, codice
     campaigns/{id}/spells/{spellId}    → incantesimi condivisi
     campaigns/{id}/homebrew/{hbId}     → sottoclassi, razze, background
   Chi non è nell'elenco dei membri non legge niente: lo impongono
   le regole in firestore.rules, non solo questo codice.
   ══════════════════════════════════════════════════════════════ */

/* Codice d'invito leggibile: niente lettere che si confondono */
const INVITE_ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY3479';
function makeInviteCode(){
  let s = '';
  const buf = new Uint32Array(8);
  (window.crypto || {}).getRandomValues ? window.crypto.getRandomValues(buf) : buf.fill(Math.floor(Math.random()*1e9));
  for (let i = 0; i < 8; i++) s += INVITE_ALPHABET[buf[i] % INVITE_ALPHABET.length];
  return s.slice(0,4) + '-' + s.slice(4);
}
function normCode(v){ return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }

let campUnsub = [];
function detachCampaign(){ campUnsub.forEach(u=>{ try{u();}catch(e){} }); campUnsub = []; }

/* ─── Aggancio ─── */
function attachCampaign(){
  detachCampaign();
  state.sharedSpells = []; state.sharedHomebrew = [];
  const id = state.campaign && state.campaign.id;
  if (!id || !currentUser || !firebaseReady) return;
  const base = db.collection('campaigns').doc(id);

  campUnsub.push(base.onSnapshot(snap => {
    const d = snap.data ? snap.data() : null;
    if (!d){ // la campagna non c'è più, o non sei più dei nostri
      leaveCampaignLocal('La campagna non esiste più.');
      return;
    }
    if (!d.members || !d.members[currentUser.uid]){
      leaveCampaignLocal('Non fai più parte di questa campagna.');
      return;
    }
    state.campaign = Object.assign({}, state.campaign, {
      id, name: d.name || 'Campagna', ownerUid: d.ownerUid,
      code: d.code, members: d.members || {},
      role: d.ownerUid === currentUser.uid ? 'master' : 'giocatore',
    });
    saveCampaignLocal(); renderIfSafe();
  }, err => console.error('Campagna non leggibile', err)));

  const wireShared = (name, key) => {
    campUnsub.push(base.collection(name).onSnapshot(snap => {
      state[key] = snap.docs.map(x => ({ ...x.data(), id: x.id }));
      renderIfSafe();
    }, err => console.error('Condivisi non leggibili: ' + name, err)));
  };
  wireShared('spells', 'sharedSpells');
  wireShared('homebrew', 'sharedHomebrew');
}
function saveCampaignLocal(){
  try { localStorage.setItem('grimorio-campaign', JSON.stringify(state.campaign || null)); } catch(e){}
}
function loadCampaignLocal(){
  try { state.campaign = JSON.parse(localStorage.getItem('grimorio-campaign') || 'null'); } catch(e){ state.campaign = null; }
}
function leaveCampaignLocal(msg){
  detachCampaign();
  state.campaign = null; state.sharedSpells = []; state.sharedHomebrew = [];
  saveCampaignLocal(); render();
  if (msg) toast('⚠️ ' + msg);
}

/* ─── Creare, entrare, uscire ─── */
function myName(){
  return (currentUser && (currentUser.displayName || currentUser.email)) || 'Avventuriero';
}
async function createCampaign(nome){
  if (!currentUser || !firebaseReady){ toast('Serve il collegamento all\'account'); return; }
  const name = String(nome||'').trim() || 'La mia campagna';
  const code = makeInviteCode();
  const id = uid();
  try {
    await db.collection('campaigns').doc(id).set({
      name, code, ownerUid: currentUser.uid, createdAt: Date.now(),
      members: { [currentUser.uid]: { name: myName(), role: 'master', joinedAt: Date.now() } },
    });
    // il registro dei codici: chi ha il codice trova la campagna senza
    // poter leggere quelle degli altri
    await db.collection('inviteCodes').doc(normCode(code)).set({
      campaignId: id, ownerUid: currentUser.uid, createdAt: Date.now(),
    });
    state.campaign = { id, name, code, ownerUid: currentUser.uid, role: 'master', members: {} };
    saveCampaignLocal(); attachCampaign();
    closeModal(); render();
    toast('⚔️ Campagna creata — codice ' + code);
  } catch(e){ console.error(e); toast('⚠️ Non sono riuscito a creare la campagna'); }
}
async function joinCampaign(codice){
  if (!currentUser || !firebaseReady){ toast('Serve il collegamento all\'account'); return; }
  const code = normCode(codice);
  if (code.length < 6){ toast('Il codice non sembra completo'); return; }
  const bello = code.slice(0,4) + '-' + code.slice(4);
  toast('Cerco la campagna…');
  try {
    // prima il registro: dal codice si ricava quale campagna è
    const reg = await db.collection('inviteCodes').doc(code).get();
    const dati = reg && (reg.exists ? reg.data() : (reg.data && reg.data()));
    if (!dati || !dati.campaignId){ toast('⚠️ Nessuna campagna con questo codice'); return; }
    const cid = dati.campaignId;
    // ci si iscrive: solo dopo si è autorizzati a leggere il resto
    await db.collection('campaigns').doc(cid).set({
      members: { [currentUser.uid]: { name: myName(), role: 'giocatore', joinedAt: Date.now() } }
    }, { merge: true });
    let nome = 'campagna', owner = null;
    try {
      const snap = await db.collection('campaigns').doc(cid).get();
      const d = snap && (snap.exists ? snap.data() : (snap.data && snap.data()));
      if (d){ nome = d.name || nome; owner = d.ownerUid; }
    } catch(e){ /* il resto arriva col primo aggiornamento */ }
    state.campaign = { id: cid, name: nome, code: bello, ownerUid: owner, role: 'giocatore', members: {} };
    saveCampaignLocal(); attachCampaign();
    closeModal(); render();
    toast('⚔️ Sei entrato in «' + nome + '»');
  } catch(e){ console.error(e); toast('⚠️ Non sono riuscito a entrare'); }
}
function confirmLeaveCampaign(){
  const c = state.campaign; if (!c) return;
  const master = c.ownerUid === currentUser.uid;
  confirmDialog(master ? 'Uscire dalla tua campagna?' : 'Uscire dalla campagna?',
    master
      ? 'Sei il master: uscendo la campagna resta, ma nessuno potrà più gestirne i membri. Quello che hai condiviso resta agli altri finché non lo ritiri.'
      : 'Smetterai di vedere gli incantesimi e le aggiunte condivise. I tuoi personaggi e i tuoi contenuti personali restano intatti.',
    () => leaveCampaign(), 'Esci');
}
async function leaveCampaign(){
  const c = state.campaign;
  if (!c){ closeModal(); return; }
  try {
    if (currentUser && firebaseReady && typeof firebase !== 'undefined' && firebase.firestore){
      await db.collection('campaigns').doc(c.id).set({
        members: { [currentUser.uid]: firebase.firestore.FieldValue.delete() }
      }, { merge: true });
    }
  } catch(e){ console.warn('Uscita non registrata sul server', e); }
  leaveCampaignLocal();
  closeModal();
  toast('Sei uscito dalla campagna');
}

/* ─── Mettere e ritirare roba dalla campagna ─── */
function campaignReady(){ return !!(state.campaign && state.campaign.id && currentUser && firebaseReady); }

async function shareToCampaign(kind, items){
  if (!campaignReady()){ toast('Prima entra in una campagna'); return 0; }
  const coll = kind === 'spells' ? 'spells' : 'homebrew';
  const base = db.collection('campaigns').doc(state.campaign.id).collection(coll);
  const lista = Array.isArray(items) ? items : [items];
  if (!lista.length) return 0;
  setSaveStatus('saving');
  try {
    for (let i = 0; i < lista.length; i += 400){
      const batch = db.batch();
      lista.slice(i, i+400).forEach(x => {
        const payload = JSON.parse(JSON.stringify(x));
        payload.sharedBy = currentUser.uid;
        payload.sharedByName = myName();
        payload.sharedAt = Date.now();
        batch.set(base.doc(x.id), payload, { merge: true });
      });
      await batch.commit();
    }
    setSaveStatus('saved');
    return lista.length;
  } catch(e){
    console.error('Condivisione non riuscita', e);
    setSaveStatus('offline');
    toast('⚠️ Non sono riuscito a condividere');
    return 0;
  }
}
async function unshareFromCampaign(kind, id){
  if (!campaignReady()) return;
  const coll = kind === 'spells' ? 'spells' : 'homebrew';
  try {
    await db.collection('campaigns').doc(state.campaign.id).collection(coll).doc(id).delete();
    toast('Ritirato dalla campagna');
  } catch(e){ console.error(e); toast('⚠️ Non sono riuscito a ritirarlo'); }
}
/* Puoi ritirare solo quello che hai messo tu — o qualunque cosa, se sei il master */
function canUnshare(x){
  if (!campaignReady() || !x) return false;
  return x.sharedBy === currentUser.uid || state.campaign.ownerUid === currentUser.uid;
}

/* ─── Schermata ─── */
function openCampaign(){
  if (!currentUser){ toast('Collegati con Google per usare le campagne'); return; }
  openModal({ render: campaignHTML });
}
let campDraft = { nome:'', codice:'' };
function campaignHTML(){
  const c = state.campaign;
  if (!c) return modalShell('⚔️ Campagna', `
    <p class="muted" style="margin-bottom:14px">
      Una campagna è il tuo tavolo: tu, i tuoi giocatori e il master.
      Gli incantesimi e le aggiunte che ci metti dentro li vedono <b>solo i membri</b>.
      I tuoi personaggi restano privati in ogni caso.
    </p>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Crea un tavolo</div>
      <div class="field" style="margin-top:8px"><label>Nome della campagna</label>
        <input id="camp-name" value="${attr(campDraft.nome)}" placeholder="Es. La Cripta di Mezzanotte" oninput="campDraft.nome=this.value"></div>
      <button class="btn btn-primary btn-block" onclick="createCampaign(document.getElementById('camp-name').value)">⚔️ Crea la campagna</button>
    </div>
    <div class="divider"><span class="flourish">❧</span><span>oppure</span></div>
    <div class="card">
      <div class="card-title">Entra con un codice</div>
      <div class="field" style="margin-top:8px"><label>Codice d'invito</label>
        <input id="camp-code" value="${attr(campDraft.codice)}" placeholder="ABCD-1234" autocapitalize="characters" oninput="campDraft.codice=this.value"></div>
      <button class="btn btn-gold btn-block" onclick="joinCampaign(document.getElementById('camp-code').value)">Entra</button>
    </div>
    <div class="spell-source-note">Condividi solo materiale di cui hai i diritti: i tuoi appunti, il tuo homebrew, o i manuali che possedete al tavolo. La campagna non è pubblica.</div>`);

  const membri = Object.entries(c.members || {});
  const nSp = (state.sharedSpells||[]).length, nHb = (state.sharedHomebrew||[]).length;
  return modalShell('⚔️ ' + escapeHtml(c.name || 'Campagna'), `
    <div class="card" style="margin-bottom:12px; border-color:var(--gold-dim)">
      <div class="row-between" style="margin-bottom:6px"><span class="muted">Sei</span><b>${c.role === 'master' ? 'il master' : 'un giocatore'}</b></div>
      <div class="row-between"><span class="muted">Codice d'invito</span><b style="font-family:var(--font-ui); letter-spacing:.1em">${escapeHtml(c.code||'—')}</b></div>
      <button class="btn btn-ghost btn-block btn-sm" style="margin-top:10px" onclick="copyInvite()">📋 Copia il codice</button>
    </div>

    <div class="divider"><span class="flourish">❧</span><span>In comune</span></div>
    <div class="combat-grid">
      <button class="combat-stat tappable" onclick="closeModal(); goView('grimoire')"><div class="v">${nSp}</div><div class="l">Incantesimi</div></button>
      <div class="combat-stat"><div class="v">${nHb}</div><div class="l">Aggiunte</div></div>
      <div class="combat-stat"><div class="v">${membri.length}</div><div class="l">Membri</div></div>
    </div>

    <div class="divider"><span class="flourish">❧</span><span>Al tavolo</span></div>
    <div class="list-gap">
      ${membri.map(([uidM, m])=>`<div class="attack-row">
        <div class="attack-main" style="pointer-events:none">
          <div class="attack-name">${escapeHtml(m.name || 'Avventuriero')}${uidM===currentUser.uid?' · tu':''}</div>
          <div class="muted" style="font-size:.73rem">${uidM===c.ownerUid?'master':'giocatore'}</div>
        </div>
      </div>`).join('') || '<div class="muted" style="text-align:center">Nessuno ancora.</div>'}
    </div>

    ${nSp ? `<div class="divider"><span class="flourish">❧</span><span>Incantesimi condivisi</span></div>
      <div class="list-gap">${(state.sharedSpells||[]).slice(0,40).map(sp=>`<div class="spell-item" style="padding:9px 11px">
        <button class="spell-item-body" style="text-align:left" onclick="viewSpellDetail('${jsStr(sp.id)}','shared')">
          <span class="spell-item-name">${escapeHtml(spellName(sp))}</span>
          <span class="spell-item-meta">${sp.level ? sp.level+'° livello' : 'trucchetto'} · da ${escapeHtml(sp.sharedByName||'qualcuno')}</span>
        </button>
        ${canUnshare(sp) ? `<button class="spell-item-add" title="Ritira" onclick="unshareFromCampaign('spells','${jsStr(sp.id)}')">✕</button>` : ''}
      </div>`).join('')}</div>` : ''}

    <button class="btn btn-danger btn-block" style="margin-top:16px" onclick="confirmLeaveCampaign()">Esci dalla campagna</button>`);
}
function copyInvite(){
  const c = state.campaign; if (!c) return;
  const txt = c.code || '';
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(()=>toast('📋 Codice copiato: ' + txt), ()=>toast('Codice: ' + txt));
  } else toast('Codice: ' + txt);
}
