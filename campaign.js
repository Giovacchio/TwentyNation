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
  state.sharedSpells = []; state.sharedHomebrew = []; state.sharedNpcs = [];
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
  wireShared('npcs', 'sharedNpcs');   // il bestiario del tavolo
}
function saveCampaignLocal(){
  try { localStorage.setItem('grimorio-campaign', JSON.stringify(state.campaign || null)); } catch(e){}
}
function loadCampaignLocal(){
  try { state.campaign = JSON.parse(localStorage.getItem('grimorio-campaign') || 'null'); } catch(e){ state.campaign = null; }
}
function leaveCampaignLocal(msg){
  detachCampaign();
  state.campaign = null; state.sharedSpells = []; state.sharedHomebrew = []; state.sharedNpcs = [];
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
  const coll = condCollezione(kind);
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
  const coll = condCollezione(kind);
  try {
    await db.collection('campaigns').doc(state.campaign.id).collection(coll).doc(id).delete();
    toast('Ritirato dalla campagna');
  } catch(e){ console.error(e); toast('⚠️ Non sono riuscito a ritirarlo'); }
}
/* Ritirare centinaia di voci una per una è la stessa fila della
   condivisione al contrario: anche qui si va a pacchetti. */
async function ritiraMolti(kind, ids){
  if (!campaignReady() || !ids || !ids.length) return 0;
  const base = db.collection('campaigns').doc(state.campaign.id).collection(condCollezione(kind));
  let fatti = 0;
  try {
    for (let i = 0; i < ids.length; i += 400){
      const pacco = db.batch();
      ids.slice(i, i+400).forEach(id => pacco.delete(base.doc(id)));
      await pacco.commit();
      fatti += Math.min(400, ids.length - i);
    }
  } catch(e){ console.error('Ritiro in blocco non riuscito', e); toast('⚠️ Non sono riuscito a ritirare tutto'); }
  return fatti;
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
  const nSp = (state.sharedSpells||[]).length, nHb = (state.sharedHomebrew||[]).length,
        nNp = (state.sharedNpcs||[]).length;
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
      <button class="combat-stat tappable" onclick="closeModal(); goView('dm'); setDmTab('bestiary')"><div class="v">${nNp}</div><div class="l">Creature</div></button>
    </div>
    <div class="muted" style="font-size:.73rem; text-align:center; margin:-4px 0 12px">${membri.length} ${membri.length===1?'membro':'membri'} al tavolo</div>

    ${(() => { const n = daCondividere(); return `
      <div class="card" style="margin-bottom:12px">
        <div class="card-title">Le tue cose</div>
        <p class="muted" style="margin:6px 0 10px; font-size:.8rem">
          ${n ? ('Hai <b>' + n + '</b> fra incantesimi, aggiunte e creature che il tavolo non vede ancora.')
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

    ${nNp ? `<div class="divider"><span class="flourish">❧</span><span>Creature condivise (${nNp})</span></div>
      <div class="list-gap">${(state.sharedNpcs||[]).slice(0,40).map(np=>`<div class="attack-row">
        <button class="attack-main" onclick="closeModal(); apriMostroCondiviso('${jsStr(np.id)}')">
          <div class="attack-name">${escapeHtml(np.avatar||'🐉')} ${escapeHtml(np.name||'')}</div>
          <div class="muted" style="font-size:.72rem">${escapeHtml(np.type||'')}${np.ac!=null?' · CA '+np.ac:''} · da ${escapeHtml(np.sharedByName||'qualcuno')}</div>
        </button>
        ${canUnshare(np) ? `<button class="attack-btn" style="min-width:44px" title="Ritira" onclick="unshareFromCampaign('npcs','${jsStr(np.id)}')">✕</button>` : ''}
      </div>`).join('')}${nNp>40?`<div class="muted" style="font-size:.73rem; text-align:center">…e altre ${nNp-40}: le trovi nel bestiario del Tavolo.</div>`:''}</div>` : ''}

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

/* Le tre cose che si mettono in comune. Tenerle in un elenco solo
   evita quello che è successo con i mostri: aggiunta la collezione, ma
   dimenticata in metà delle funzioni che la dovevano trattare. */
const COND_TIPI = [
  { kind:'spells',   condivisi:'sharedSpells',   etichetta:'incantesimo', plurale:'incantesimi' },
  { kind:'homebrew', condivisi:'sharedHomebrew', etichetta:'aggiunta',    plurale:'aggiunte' },
  { kind:'npcs',     condivisi:'sharedNpcs',     etichetta:'creatura',    plurale:'creature' },
];
function condCollezione(kind){
  return COND_TIPI.some(t => t.kind === kind) ? kind : 'homebrew';
}
/* Le tue cose, quelle che puoi mettere in comune (non quelle che
   arrivano già dal tavolo). */
function mieCose(){
  const miei = (state.homebrew || []).filter(x => x && x.id && !x.fromCampaign);
  const spells = (state.customSpells || []).filter(x => x && x.id);
  const npcs = (state.npcs || []).filter(x => x && x.id && !x.fromCampaign);
  return { spells, homebrew: miei, npcs };
}
function giaSuTavolo(kind, id){
  const t = COND_TIPI.find(x => x.kind === kind) || COND_TIPI[1];
  return (state[t.condivisi] || []).some(x => x && x.id === id);
}
/* Quante cose tue non sono ancora sul tavolo. */
function daCondividere(){
  const m = mieCose();
  return COND_TIPI.reduce((n, t) => n + (m[t.kind] || []).filter(x => !giaSuTavolo(t.kind, x.id)).length, 0);
}

/* Il clic solo: manda tutto quello che manca. */
function condividiTutto(){
  if (!campaignReady()){ toast('Prima entra in una campagna'); return; }
  listaAzzeraTutte('cond:');
  const m = mieCose();
  const da = {};
  COND_TIPI.forEach(t => { da[t.kind] = (m[t.kind] || []).filter(x => !giaSuTavolo(t.kind, x.id)); });
  const n = COND_TIPI.reduce((k, t) => k + da[t.kind].length, 0);
  if (!n){ toast('È già tutto in comune col tavolo'); return; }
  const pezzi = COND_TIPI.filter(t => da[t.kind].length)
    .map(t => da[t.kind].length + ' ' + (da[t.kind].length===1 ? t.etichetta : t.plurale));
  /* Il bestiario è l'unica cosa che può essere enorme: con qualche
     migliaio di creature ogni membro se le scaricherebbe tutte. Va detto
     prima, non scoperto dopo. */
  const tanteBestie = da.npcs.length > 300
    ? ' ⚠️ Sono tante creature: le scaricherà ogni membro del tavolo. Se ti servono solo alcune, usa «Scegli cosa».'
    : '';
  confirmDialog('Mettere tutto in comune?',
    'Vanno sul tavolo «' + (state.campaign.name || 'la campagna') + '» ' + pezzi.join(', ') +
    '. Li vedranno i membri, e puoi ritirarli quando vuoi.' + tanteBestie,
    async () => {
      let fatti = 0;
      for (const t of COND_TIPI){ if (da[t.kind].length) fatti += await shareToCampaign(t.kind, da[t.kind]); }
      renderModalRoot(); render();
      toast(fatti ? ('⚔️ ' + fatti + (fatti===1?' cosa in comune col tavolo':' cose in comune col tavolo')) : '⚠️ Non è andato niente — apri «Non funziona? Provalo»');
    }, 'Condividi ' + n);
}

/* Ritira in blocco tutto quello che hai messo tu. */
function ritiraTutto(){
  if (!campaignReady()) return;
  const mie = {};
  COND_TIPI.forEach(t => { mie[t.kind] = (state[t.condivisi] || []).filter(canUnshare); });
  const n = COND_TIPI.reduce((k, t) => k + mie[t.kind].length, 0);
  if (!n){ toast('Non c\'è niente che tu possa ritirare'); return; }
  confirmDialog('Ritirare tutto dal tavolo?',
    n + (n===1?' cosa smetterà':' cose smetteranno') + ' di essere visibile ai membri. Le tue copie restano tue e non si toccano.',
    async () => {
      for (const t of COND_TIPI){
        const ids = mie[t.kind].map(x => x.id);
        if (typeof ritiraMolti === 'function') await ritiraMolti(t.kind, ids);
        else for (const id of ids) await unshareFromCampaign(t.kind, id);
      }
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
  /* Le creature no: un bestiario importato ne ha migliaia, e spuntarle
     tutte per conto suo vorrebbe dire far scaricare a ogni membro del
     tavolo un archivio intero che magari non ha chiesto. Si scelgono. */
  listaAzzeraTutte('cond:');
  openModal({ render: () => condivisioneHTML() });
}
function condToggle(chiave){
  if (!condScelti) return;
  if (condScelti.has(chiave)) condScelti.delete(chiave); else condScelti.add(chiave);
  renderModalRoot();
}
function condTutti(kind, on){
  const m = mieCose();
  const lista = m[kind] || [];
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
  const sottoNpc = (x) => [x.type || '', (x.ac!=null?'CA '+x.ac:''), (x.hpMax?x.hpMax+' PF':'')].filter(Boolean).join(' · ');
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
    ${sezione('npcs','PNG e mostri tuoi', m.npcs, x=>x.name||'', sottoNpc)}
    ${(!m.homebrew.length && !m.spells.length && !m.npcs.length) ? emptyState('📭','Non hai ancora niente di tuo da mettere in comune. Importa qualcosa dai tuoi manuali e torna qui.') : ''}
    <div class="btn-row" style="margin-top:14px">
      <button class="btn btn-ghost" onclick="closeModal()">Chiudi</button>
      <button class="btn btn-primary" ${n?'':'disabled'} onclick="condividiScelti()">Condividi ${n||''}</button>
    </div>`);
}
async function condividiScelti(){
  if (!campaignReady() || !condScelti || !condScelti.size) return;
  const m = mieCose();
  let fatti = 0;
  for (const t of COND_TIPI){
    const scelti = (m[t.kind] || []).filter(x => condScelti.has(t.kind+':'+x.id) && !giaSuTavolo(t.kind, x.id));
    if (scelti.length) fatti += await shareToCampaign(t.kind, scelti);
  }
  condScelti = null;
  closeModal(); render();
  toast(fatti ? ('⚔️ ' + fatti + (fatti===1?' cosa in comune col tavolo':' cose in comune col tavolo')) : '⚠️ Non è andato niente — apri «Non funziona? Provalo»');
}

/* ═══════════════════════════════════════════════════════════════
   LE CREATURE DEL TAVOLO — v7.3
   Un mostro messo in comune si guarda e, se serve, si copia nel
   proprio bestiario: da lì in poi è tuo e lo modifichi come vuoi.
   Non si modifica quello del tavolo, perché è di chi ce l'ha messo.
   ═══════════════════════════════════════════════════════════════ */
function apriMostroCondiviso(id){
  const n = (state.sharedNpcs || []).find(x => x && x.id === id);
  if (!n){ toast('Questa creatura non è più sul tavolo'); return; }
  const giaMio = (state.npcs || []).some(x => x.id === id || norm(x.name||'') === norm(n.name||''));
  openModal({ render: () => modalShell('⚔️ ' + (n.name || 'Creatura'), `
    <div class="muted" style="font-style:italic; margin-bottom:10px">
      ${escapeHtml(n.type || '')} · messa in comune da ${escapeHtml(n.sharedByName || 'un membro del tavolo')}
    </div>
    ${n.portrait ? `<div class="comp-ritratto"><img src="${attr(n.portrait)}" alt=""></div>` : ''}
    <div class="combat-grid" style="margin-bottom:12px">
      <div class="combat-stat"><div class="v">${n.ac ?? 10}</div><div class="l">CA</div></div>
      <div class="combat-stat"><div class="v">${n.hpMax ?? 0}</div><div class="l">PF</div></div>
      <div class="combat-stat"><div class="v">${n.speed ?? 9}</div><div class="l">Velocità (m)</div></div>
    </div>
    ${n.notes ? `<div class="card" style="margin-bottom:12px"><div class="muted" style="font-size:.82rem; white-space:pre-wrap; line-height:1.6">${escapeHtml(n.notes)}</div></div>` : ''}
    ${giaMio ? `<div class="muted" style="font-size:.78rem; margin-bottom:10px">Ne hai già una tua con questo nome.</div>` : ''}
    <button class="btn btn-primary btn-block" onclick="copiaMostroDalTavolo('${jsStr(n.id)}')">✦ Copia nel tuo bestiario</button>
    ${(typeof addToCombat === 'function') ? `<button class="btn btn-gold btn-block btn-sm" style="margin-top:8px" onclick="copiaMostroDalTavolo('${jsStr(n.id)}', true)">⚔️ Copia e metti all'iniziativa</button>` : ''}
    ${canUnshare(n) ? `<button class="btn btn-ghost btn-block btn-sm" style="margin-top:8px" onclick="closeModal(); unshareFromCampaign('npcs','${jsStr(n.id)}')">↩︎ Ritira dal tavolo</button>` : ''}
    <div class="spell-source-note">Quella sul tavolo resta di chi ce l'ha messa: la copia che prendi è tua e la modifichi come vuoi.</div>`) });
}
function copiaMostroDalTavolo(id, anchePerCombattere){
  const n = (state.sharedNpcs || []).find(x => x && x.id === id);
  if (!n) return;
  const copia = Object.assign({}, n, { id: uid(), createdAt: Date.now(), updatedAt: Date.now() });
  // i bolli della condivisione non hanno senso su una copia tua
  delete copia.sharedBy; delete copia.sharedByName; delete copia.sharedAt; delete copia.syncedAt;
  state.npcs = state.npcs || [];
  state.npcs.push(copia);
  if (typeof bestiarioScorda === 'function') bestiarioScorda();
  fsSet('npcs', copia);
  closeModal(); render();
  if (anchePerCombattere && typeof addToCombat === 'function'){
    addToCombat(copia.id, 'npc');
    toast('⚔️ ' + copia.name + ' è nel tuo bestiario e all\'iniziativa');
  } else toast('🐉 ' + copia.name + ' è nel tuo bestiario');
}
/* Condividere quello che il bestiario sta mostrando: con i filtri
   attivi è il modo naturale di mandare al tavolo solo lo scontro di
   stasera invece di tutto l'archivio. */
function condividiMostrati(){
  if (!campaignReady()){ toast('Prima entra in una campagna'); return; }
  const lista = (typeof bestiarioFiltrato === 'function' ? bestiarioFiltrato() : [])
    .filter(n => !n.__dalTavolo && !giaSuTavolo('npcs', n.id));
  if (!lista.length){ toast('Il tavolo le vede già tutte'); return; }
  confirmDialog('Condividere ' + lista.length + (lista.length===1?' creatura?':' creature?'),
    'Le vedranno i membri di «' + escapeHtml(state.campaign.name || 'la campagna') + '» nel loro bestiario.' +
    (lista.length > 300 ? ' ⚠️ Sono tante: le scaricherà ognuno di loro.' : '') +
    ' Puoi ritirarle quando vuoi.',
    async () => {
      const n = await shareToCampaign('npcs', lista);
      render();
      toast(n ? ('⚔️ ' + n + (n===1?' creatura sul tavolo':' creature sul tavolo')) : '⚠️ Non è andato niente — apri «Non funziona? Provalo»');
    }, 'Condividi ' + lista.length);
}
/* Una creatura sola, dalla sua scheda. */
async function shareOneNpc(id){
  const n = (state.npcs||[]).find(x => x.id === id);
  if (!n) return;
  const fatti = await shareToCampaign('npcs', [n]);
  if (fatti) toast('⚔️ ' + (n.name||'La creatura') + ' è ora del tavolo');
  renderModalRoot(); render();
}
