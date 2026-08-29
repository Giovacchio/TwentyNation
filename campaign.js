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

  /* Uscire dalla campagna è una cosa seria: non la si fa perché un
     aggiornamento è arrivato vuoto o dalla cache. Si esce solo se il
     server lo conferma due volte di fila. */
  let sospetti = 0;
  campUnsub.push(base.onSnapshot(snap => {
    const daCache = !!(snap.metadata && snap.metadata.fromCache);
    const d = snap.data ? snap.data() : null;
    const fuori = !d || !d.members || !d.members[currentUser.uid];
    if (fuori){
      if (daCache) return;                       // la cache non fa testo
      if (++sospetti < 2) return;                // una volta sola non basta
      leaveCampaignLocal(!d ? 'La campagna non esiste più.' : 'Non fai più parte di questa campagna.');
      return;
    }
    sospetti = 0;
    state.campaign = Object.assign({}, state.campaign, {
      id, name: d.name || 'Campagna', ownerUid: d.ownerUid,
      code: d.code, members: d.members || {},
      role: d.ownerUid === currentUser.uid ? 'master' : 'giocatore',
    });
    saveCampaignLocal(); renderIfSafe();
  }, err => {
    console.error('Campagna non leggibile', err);
    // «permesso negato» è una prova vera: non sei più dei loro.
    if (err && /permission|insufficient/i.test(err.code || err.message || '')){
      leaveCampaignLocal('Non fai più parte di questa campagna.');
    }
  }));

  const wireShared = (name, key) => {
    campUnsub.push(base.collection(name).onSnapshot(snap => {
      state[key] = snap.docs.map(x => ({
        ...(typeof daNuvola === 'function' ? daNuvola(x.data()) : x.data()), id: x.id }));
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
        const payload = (typeof perNuvola === 'function')
          ? perNuvola(JSON.parse(JSON.stringify(x)))
          : JSON.parse(JSON.stringify(x));
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
    __ultimoErroreTavolo = {
      quando: new Date().toLocaleTimeString('it-IT'),
      codice: (e && e.code) || '—',
      messaggio: (e && e.message) || String(e),
      cosa: kind, quante: lista.length,
    };
    toast('⚠️ Il server ha rifiutato: ' + spiegaErroreTavolo(__ultimoErroreTavolo));
    return 0;
  }
}
/* L'errore va detto in italiano, e deve dire cosa fare. */
let __ultimoErroreTavolo = null;
function spiegaErroreTavolo(e){
  const t = ((e && (e.code || '')) + ' ' + (e && e.message || '')).toLowerCase();
  if (/nested|invalid data|invalid-argument|unsupported field/.test(t))
    return 'la forma dei dati (aggiorna l\'app: serve la 5.8 o più)';
  if (/permission|insufficient/.test(t)) return 'permessi negati (regole Firestore)';
  if (/unauthenticated/.test(t)) return 'non risulti collegato';
  if (/quota|resource-exhausted/.test(t)) return 'limite del piano Firebase raggiunto';
  if (/unavailable|network|deadline/.test(t)) return 'connessione assente';
  if (/too large|maximum/.test(t)) return 'una voce è troppo grande';
  return (e && e.codice) || (e && e.code) || 'errore sconosciuto';
}

/* ─── Diagnostica: prova a scrivere UNA cosa e dice esattamente com'è andata ───
   Serve quando «non è andato niente» e non si capisce perché. */
async function provaCondivisione(){
  if (!campaignReady()){ toast('Prima entra in una campagna'); return; }
  const righe = [];
  const base = db.collection('campaigns').doc(state.campaign.id).collection('homebrew');
  const idProva = '__prova-' + Date.now();

  const prova = async (nome, payload) => {
    try {
      await base.doc(idProva).set(payload, { merge: true });
      righe.push(['✅ ' + nome, 'accettata']);
      try { await base.doc(idProva).delete(); } catch(e){}
      return true;
    } catch(e){
      righe.push(['❌ ' + nome, ((e && e.code) || '') + ' — ' + ((e && e.message) || String(e)).slice(0, 160)]);
      return false;
    }
  };

  const comune = { sharedBy: currentUser.uid, sharedByName: myName(), sharedAt: Date.now() };
  await prova('voce semplice', Object.assign({ id: idProva, kind: 'subclass', name: 'Prova' }, comune));
  await prova('con array dentro array (la forma vecchia)',
    Object.assign({ id: idProva, kind: 'subclass', name: 'Prova',
      features: { 3: [['Nome', 'testo']] } }, comune));
  await prova('confezionata come fa ora l\'app',
    Object.assign(perNuvola({ id: idProva, kind: 'subclass', name: 'Prova',
      features: { 3: [['Nome', 'testo']] } }), comune));

  const vera = (state.homebrew || []).find(x => x && x.kind !== 'background');
  if (vera) await prova('una tua aggiunta vera («' + (vera.name || '') + '»)',
    Object.assign(perNuvola(JSON.parse(JSON.stringify(vera))), comune));

  openModal({ render: () => modalShell('🩺 Prova di condivisione', `
    <p class="muted" style="margin-bottom:14px">Ho provato a scrivere sul tavolo quattro cose diverse, una per volta. Quella che fallisce dice dov'è il problema.</p>
    <div class="list-gap">${righe.map(([a, b]) => `<div class="attack-row" style="display:block">
      <div class="attack-name" style="font-size:.85rem">${escapeHtml(a)}</div>
      <div class="muted" style="font-size:.72rem; word-break:break-word">${escapeHtml(b)}</div>
    </div>`).join('')}</div>
    <div class="card" style="margin-top:12px">
      <div class="row-between"><span class="muted">Versione dell'app</span><b>${typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?'}</b></div>
      <div class="row-between" style="margin-top:4px"><span class="muted">Tue aggiunte</span><b>${(state.homebrew||[]).length}</b></div>
      <div class="row-between" style="margin-top:4px"><span class="muted">Già sul tavolo</span><b>${(state.sharedHomebrew||[]).length}</b></div>
    </div>
    <button class="btn btn-ghost btn-block btn-sm" style="margin-top:12px" onclick="copiaProvaCondivisione(${JSON.stringify(JSON.stringify(righe)).replace(/"/g,'&quot;')})">📋 Copia il risultato</button>
    <button class="btn btn-primary btn-block" style="margin-top:8px" onclick="closeModal()">Chiudi</button>`) });
}
function copiaProvaCondivisione(json){
  const txt = 'TwentyNation ' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?') + '\n' +
    JSON.parse(json).map(r => r.join(': ')).join('\n');
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(()=>toast('Copiato')).catch(()=>toast('Non riesco a copiare'));
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

    ${(() => { const n = daCondividere(); return `
      <div class="card" style="margin-bottom:12px">
        <div class="card-title">Le tue cose</div>
        <p class="muted" style="margin:6px 0 10px; font-size:.8rem">
          ${n ? ('Hai <b>' + n + '</b> fra incantesimi e aggiunte che il tavolo non vede ancora.')
              : 'Il tavolo vede già tutto quello che hai.'}
        </p>
        <button class="btn btn-gold btn-block" ${n?'':'disabled'} onclick="condividiTutto()">⚔️ Condividi tutto${n?' ('+n+')':''}</button>
        <div class="btn-row" style="margin-top:8px">
          <button class="btn btn-ghost btn-sm" onclick="openCondivisione()">Scegli cosa</button>
          <button class="btn btn-ghost btn-sm" onclick="ritiraTutto()">Ritira tutto</button>
        </div>
        <button class="btn btn-ghost btn-block btn-sm" style="margin-top:8px" onclick="provaCondivisione()">🩺 Non funziona? Provalo</button>
      </div>`; })()}

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

    ${nHb ? `<div class="divider"><span class="flourish">❧</span><span>Aggiunte condivise</span></div>
      <div class="list-gap">${(state.sharedHomebrew||[]).map(h=>{
        const k = (typeof HB_KINDS !== 'undefined' && HB_KINDS[h.kind]) ? HB_KINDS[h.kind] : null;
        const cls = h.classId && typeof CLASS_BY_ID !== 'undefined' && CLASS_BY_ID[h.classId] ? CLASS_BY_ID[h.classId].name : '';
        return `<div class="attack-row">
          <div class="attack-main" style="pointer-events:none">
            <div class="attack-name">${k?k.icon:'📚'} ${escapeHtml(h.name||'')}</div>
            <div class="muted" style="font-size:.72rem">${k?k.label:h.kind}${cls?' · '+escapeHtml(cls):''} · da ${escapeHtml(h.sharedByName||'qualcuno')}</div>
          </div>
          ${canUnshare(h) ? `<button class="attack-btn" style="min-width:44px" title="Ritira" onclick="unshareFromCampaign('homebrew','${jsStr(h.id)}')">✕</button>` : ''}
        </div>`;
      }).join('')}</div>` : `
      <div class="card" style="margin-top:14px">
        <div class="muted" style="font-size:.8rem">Nessun archetipo, razza o background in comune. Li metti dal tasto ⚔️ in <b>Opzioni → Contenuti tuoi</b>, oppure appena ne crei uno dalla creazione guidata.</div>
      </div>`}

    <button class="btn btn-danger btn-block" style="margin-top:16px" onclick="confirmLeaveCampaign()">Esci dalla campagna</button>`);
}
function copyInvite(){
  const c = state.campaign; if (!c) return;
  const txt = c.code || '';
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(()=>toast('📋 Codice copiato: ' + txt), ()=>toast('Codice: ' + txt));
  } else toast('Codice: ' + txt);
}

/* ═══════════════════════════════════════════════════════════════
   Metti in comune col tavolo — in un colpo solo
   Prima ogni incantesimo e ogni aggiunta andavano condivisi uno per
   uno con il tasto ⚔️: con un manuale intero importato erano centinaia
   di tocchi. Qui si vede tutto insieme e si manda in blocco.
   ═══════════════════════════════════════════════════════════════ */

/* Le tue cose, quelle che puoi mettere in comune (non quelle che
   arrivano già dal tavolo). */
function mieCose(){
  const miei = (state.homebrew || []).filter(x => x && x.id && !x.fromCampaign);
  const spells = (state.customSpells || []).filter(x => x && x.id);
  return { spells, homebrew: miei };
}
function giaSuTavolo(kind, id){
  const lista = kind === 'spells' ? (state.sharedSpells || []) : (state.sharedHomebrew || []);
  return lista.some(x => x && x.id === id);
}
/* Quante cose tue non sono ancora sul tavolo. */
function daCondividere(){
  const m = mieCose();
  return m.spells.filter(x => !giaSuTavolo('spells', x.id)).length
       + m.homebrew.filter(x => !giaSuTavolo('homebrew', x.id)).length;
}

/* Il clic solo: manda tutto quello che manca. */
function condividiTutto(){
  if (!campaignReady()){ toast('Prima entra in una campagna'); return; }
  listaAzzeraTutte('cond:');
  const m = mieCose();
  const sp = m.spells.filter(x => !giaSuTavolo('spells', x.id));
  const hb = m.homebrew.filter(x => !giaSuTavolo('homebrew', x.id));
  const n = sp.length + hb.length;
  if (!n){ toast('È già tutto in comune col tavolo'); return; }
  const pezzi = [];
  if (sp.length) pezzi.push(sp.length + (sp.length===1?' incantesimo':' incantesimi'));
  if (hb.length) pezzi.push(hb.length + (hb.length===1?' aggiunta':' aggiunte'));
  confirmDialog('Mettere tutto in comune?',
    'Vanno sul tavolo «' + (state.campaign.name || 'la campagna') + '» ' + pezzi.join(' e ') +
    '. Li vedranno i membri, e puoi ritirarli quando vuoi.',
    async () => {
      let fatti = 0;
      if (sp.length) fatti += await shareToCampaign('spells', sp);
      if (hb.length) fatti += await shareToCampaign('homebrew', hb);
      renderModalRoot(); render();
      toast(fatti ? ('⚔️ ' + fatti + (fatti===1?' cosa in comune col tavolo':' cose in comune col tavolo')) : '⚠️ Non è andato niente — apri «Non funziona? Provalo»');
    }, 'Condividi ' + n);
}

/* Ritira in blocco tutto quello che hai messo tu. */
function ritiraTutto(){
  if (!campaignReady()) return;
  const sp = (state.sharedSpells || []).filter(canUnshare);
  const hb = (state.sharedHomebrew || []).filter(canUnshare);
  const n = sp.length + hb.length;
  if (!n){ toast('Non c\'è niente che tu possa ritirare'); return; }
  confirmDialog('Ritirare tutto dal tavolo?',
    n + (n===1?' cosa smetterà':' cose smetteranno') + ' di essere visibile ai membri. Le tue copie restano tue e non si toccano.',
    async () => {
      for (const x of sp) await unshareFromCampaign('spells', x.id);
      for (const x of hb) await unshareFromCampaign('homebrew', x.id);
      renderModalRoot(); render();
      toast('↩︎ Ritirate ' + n);
    }, 'Ritira ' + n);
}

/* ─── La schermata a scelta multipla ─── */
let condScelti = null;

function openCondivisione(){
  if (!campaignReady()){ toast('Prima entra in una campagna'); return; }
  const m = mieCose();
  // parte già spuntato quello che non è ancora sul tavolo: il caso normale
  condScelti = new Set();
  m.spells.forEach(x => { if (!giaSuTavolo('spells', x.id)) condScelti.add('spells:'+x.id); });
  m.homebrew.forEach(x => { if (!giaSuTavolo('homebrew', x.id)) condScelti.add('homebrew:'+x.id); });
  openModal({ render: () => condivisioneHTML() });
}
function condToggle(chiave){
  if (!condScelti) return;
  if (condScelti.has(chiave)) condScelti.delete(chiave); else condScelti.add(chiave);
  renderModalRoot();
}
function condTutti(kind, on){
  const m = mieCose();
  const lista = kind === 'spells' ? m.spells : m.homebrew;
  lista.forEach(x => {
    if (giaSuTavolo(kind, x.id)) return;          // già su: non si tocca
    const k = kind + ':' + x.id;
    if (on) condScelti.add(k); else condScelti.delete(k);
  });
  renderModalRoot();
}
function condivisioneHTML(){
  const m = mieCose();
  const c = state.campaign || {};
  const riga = (kind, x, nome, sotto) => {
    const su = giaSuTavolo(kind, x.id);
    const k = kind + ':' + x.id;
    const on = condScelti.has(k);
    return `<button class="attack-row" style="width:100%; text-align:left; ${on?'border-color:var(--gold)':''}"
        ${su ? 'disabled style="opacity:.55; width:100%; text-align:left"' : `onclick="condToggle('${jsStr(k)}')"`}>
      <span style="flex-shrink:0; margin-right:10px; font-size:1.05rem">${su ? '⚔️' : (on ? '☑️' : '⬜')}</span>
      <span class="attack-main">
        <span class="attack-name">${escapeHtml(nome)}</span>
        <span class="muted" style="font-size:.73rem; display:block">${escapeHtml(sotto)}${su ? ' · già sul tavolo' : ''}</span>
      </span>
    </button>`;
  };
  const sezione = (kind, titolo, lista, nomeDi, sottoDi) => {
    if (!lista.length) return '';
    const mancanti = lista.filter(x => !giaSuTavolo(kind, x.id)).length;
    return `<div class="divider"><span class="flourish">❧</span><span>${titolo} (${lista.length})</span></div>
      ${mancanti ? `<div class="chip-row" style="margin-bottom:8px">
        <button class="chip" onclick="condTutti('${kind}',true)">Scegli tutti</button>
        <button class="chip" onclick="condTutti('${kind}',false)">Nessuno</button>
      </div>` : '<p class="muted" style="font-size:.75rem; margin-bottom:8px">Sono già tutti sul tavolo.</p>'}
      ${bloccoLista('cond:'+kind, lista, x => riga(kind, x, nomeDi(x), sottoDi(x)), { modale:true, nome:'voci' })}`;
  };
  const n = condScelti ? condScelti.size : 0;
  const nomeSp = (x) => (typeof spellName === 'function' ? spellName(x) : (x.name||''));
  const sottoSp = (x) => (x.level ? x.level + '° livello' : 'trucchetto') + (x.school ? ' · ' + x.school : '');
  const sottoHb = (x) => {
    const k = (typeof HB_KINDS !== 'undefined' && HB_KINDS[x.kind]) ? HB_KINDS[x.kind].label : x.kind;
    const cl = x.classId && typeof CLASS_BY_ID !== 'undefined' && CLASS_BY_ID[x.classId] ? CLASS_BY_ID[x.classId].name : '';
    return k + (cl ? ' · ' + cl : '');
  };
  return modalShell('⚔️ Metti in comune', `
    <p class="muted" style="margin-bottom:14px">
      Quello che scegli lo vedono i membri di <b>${escapeHtml(c.name||'la campagna')}</b> nel grimorio
      e nella creazione guidata. Le tue copie restano tue: ritiri quando vuoi.
    </p>
    ${sezione('homebrew','Sottoclassi, razze e background', m.homebrew, x=>x.name||'', sottoHb)}
    ${sezione('spells','Incantesimi tuoi', m.spells, nomeSp, sottoSp)}
    ${(!m.homebrew.length && !m.spells.length) ? emptyState('📭','Non hai ancora niente di tuo da mettere in comune. Importa qualcosa dai tuoi manuali e torna qui.') : ''}
    <div class="btn-row" style="margin-top:14px">
      <button class="btn btn-ghost" onclick="closeModal()">Chiudi</button>
      <button class="btn btn-primary" ${n?'':'disabled'} onclick="condividiScelti()">Condividi ${n||''}</button>
    </div>`);
}
async function condividiScelti(){
  if (!campaignReady() || !condScelti || !condScelti.size) return;
  const m = mieCose();
  const sp = m.spells.filter(x => condScelti.has('spells:'+x.id) && !giaSuTavolo('spells', x.id));
  const hb = m.homebrew.filter(x => condScelti.has('homebrew:'+x.id) && !giaSuTavolo('homebrew', x.id));
  let fatti = 0;
  if (sp.length) fatti += await shareToCampaign('spells', sp);
  if (hb.length) fatti += await shareToCampaign('homebrew', hb);
  condScelti = null;
  closeModal(); render();
  toast(fatti ? ('⚔️ ' + fatti + (fatti===1?' cosa in comune col tavolo':' cose in comune col tavolo')) : '⚠️ Non è andato niente — apri «Non funziona? Provalo»');
}
