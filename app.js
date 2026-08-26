/* ══════════════════════════════════════════════════════════════
   GRIMORIO — app.js
   Compagno per D&D: party, incantesimi, inventario, background
   e strumenti da master. Dati sincronizzati su Firebase.
   ══════════════════════════════════════════════════════════════ */

/* ─── 1. CONFIGURAZIONE FIREBASE ───────────────────────────────
   Sostituisci questi valori con quelli del TUO progetto Firebase:
   Firebase Console → ⚙️ Impostazioni progetto → Generali →
   Le tue app → SDK setup and configuration
*/
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAAcGjbm9NgQNo6wWLX8CErCmCUh7WTQsQ",
  authDomain: "twentynation-1abd4.firebaseapp.com",
  projectId: "twentynation-1abd4",
  storageBucket: "twentynation-1abd4.firebasestorage.app",
  messagingSenderId: "305259728353",
  appId: "1:305259728353:web:ad9cc0d2737f4be889d6a0"
};

let db, auth, currentUser = null;

(function initFirebase() {
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
  } catch (e) {
    if (e.code !== 'app/duplicate-app') console.error('Firebase init error:', e);
  }
  db = firebase.firestore();
  auth = firebase.auth();
})();

/* ─── 2. DATI DI REGOLE ───────────────────────────────────────
   Nomi di abilità/skill e tabelle numeriche: regole generiche di
   sistema, non testo protetto. Gli incantesimi (nomi+testo) sono
   nel file spells-data.js, contenuto SRD 5.1 su licenza OGL 1.0a,
   perciò restano in inglese (lingua ufficiale della licenza).
*/
const ABILITIES = [
  { key: "str", label: "Forza", abbr: "FOR" },
  { key: "dex", label: "Destrezza", abbr: "DES" },
  { key: "con", label: "Costituzione", abbr: "COS" },
  { key: "int", label: "Intelligenza", abbr: "INT" },
  { key: "wis", label: "Saggezza", abbr: "SAG" },
  { key: "cha", label: "Carisma", abbr: "CAR" },
];

const SKILLS = [
  { key: "acrobatics", label: "Acrobazia", ability: "dex" },
  { key: "animalHandling", label: "Addestrare Animali", ability: "wis" },
  { key: "arcana", label: "Arcano", ability: "int" },
  { key: "athletics", label: "Atletica", ability: "str" },
  { key: "deception", label: "Inganno", ability: "cha" },
  { key: "history", label: "Storia", ability: "int" },
  { key: "insight", label: "Intuizione", ability: "wis" },
  { key: "intimidation", label: "Intimidire", ability: "cha" },
  { key: "investigation", label: "Investigare", ability: "int" },
  { key: "medicine", label: "Medicina", ability: "wis" },
  { key: "nature", label: "Natura", ability: "int" },
  { key: "perception", label: "Percezione", ability: "wis" },
  { key: "performance", label: "Intrattenere", ability: "cha" },
  { key: "persuasion", label: "Persuasione", ability: "cha" },
  { key: "religion", label: "Religione", ability: "int" },
  { key: "sleightOfHand", label: "Rapidità di Mano", ability: "dex" },
  { key: "stealth", label: "Furtività", ability: "dex" },
  { key: "survival", label: "Sopravvivenza", ability: "wis" },
];

const CLASSES_IT = {
  "Artificer": "Artificiere", "Barbarian": "Barbaro", "Bard": "Bardo", "Cleric": "Chierico", "Druid": "Druido",
  "Fighter": "Guerriero", "Monk": "Monaco", "Paladin": "Paladino", "Ranger": "Ranger",
  "Rogue": "Ladro", "Sorcerer": "Stregone", "Warlock": "Warlock", "Wizard": "Mago"
};
const CLASS_LIST_IT = Object.values(CLASSES_IT).sort((a,b)=>a.localeCompare(b,'it'));
const GRIMOIRE_CLASSES = ['Artificer','Bard','Cleric','Druid','Paladin','Ranger','Sorcerer','Warlock','Wizard'];
const CLASS_TO_CASTER = {
  "Barbaro": "none", "Bardo": "full", "Chierico": "full", "Druido": "full",
  "Guerriero": "none", "Monaco": "third", "Paladino": "half", "Ranger": "half",
  "Ladro": "none", "Stregone": "full", "Warlock": "pact", "Mago": "full", "Artificiere": "full"
};
const CLASS_TO_SPELL_ABILITY = {
  "Bardo": "cha", "Chierico": "wis", "Druido": "wis", "Monaco": "wis",
  "Paladino": "cha", "Ranger": "wis", "Stregone": "cha", "Warlock": "cha",
  "Mago": "int", "Artificiere": "int"
};
function applyClassDefaults(d){
  if (!d || !d.classField) return;
  if (CLASS_TO_CASTER[d.classField] !== undefined) d.casterType = CLASS_TO_CASTER[d.classField];
  if (CLASS_TO_SPELL_ABILITY[d.classField]) d.spellAbility = CLASS_TO_SPELL_ABILITY[d.classField];
}
function schoolIt(en){ return SCHOOLS_IT[en] || en; }

const SCHOOLS_IT = {
  "Abjuration": "Abiurazione", "Conjuration": "Convocazione", "Divination": "Divinazione",
  "Enchantment": "Ammaliamento", "Evocation": "Evocazione", "Illusion": "Illusione",
  "Necromancy": "Necromanzia", "Transmutation": "Trasmutazione"
};

const CASTER_TYPES = [
  { key: "none", label: "Nessuno" },
  { key: "full", label: "Pieno" },
  { key: "half", label: "Metà" },
  { key: "third", label: "Un terzo" },
  { key: "pact", label: "Warlock (Patto)" },
];
const CASTER_TYPE_LABEL = Object.fromEntries(CASTER_TYPES.map(c=>[c.key,c.label]));

// Tabelle progressione slot incantesimo (regole standard SRD, per livello personaggio)
const SLOTS_FULL = {1:[2],2:[3],3:[4,2],4:[4,3],5:[4,3,2],6:[4,3,3],7:[4,3,3,1],8:[4,3,3,2],9:[4,3,3,3,1],10:[4,3,3,3,2],11:[4,3,3,3,2,1],12:[4,3,3,3,2,1],13:[4,3,3,3,2,1,1],14:[4,3,3,3,2,1,1],15:[4,3,3,3,2,1,1,1],16:[4,3,3,3,2,1,1,1],17:[4,3,3,3,2,1,1,1,1],18:[4,3,3,3,3,1,1,1,1],19:[4,3,3,3,3,2,1,1,1],20:[4,3,3,3,3,2,2,1,1]};
const SLOTS_HALF = {1:[],2:[2],3:[3],4:[3],5:[4,2],6:[4,2],7:[4,3],8:[4,3],9:[4,3,2],10:[4,3,2],11:[4,3,3],12:[4,3,3],13:[4,3,3,1],14:[4,3,3,1],15:[4,3,3,2],16:[4,3,3,2],17:[4,3,3,3,1],18:[4,3,3,3,1],19:[4,3,3,3,2],20:[4,3,3,3,2]};
const SLOTS_THIRD = {1:[],2:[],3:[2],4:[3],5:[3],6:[3],7:[4,2],8:[4,2],9:[4,2],10:[4,3],11:[4,3],12:[4,3],13:[4,3,2],14:[4,3,2],15:[4,3,2],16:[4,3,3],17:[4,3,3],18:[4,3,3],19:[4,3,3,1],20:[4,3,3,1]};
const SLOTS_PACT_COUNT = {1:1,2:2,3:2,4:2,5:2,6:2,7:2,8:2,9:2,10:2,11:3,12:3,13:3,14:3,15:3,16:3,17:4,18:4,19:4,20:4};
const SLOTS_PACT_LEVEL = {1:1,2:1,3:2,4:2,5:3,6:3,7:4,8:4,9:5,10:5,11:5,12:5,13:5,14:5,15:5,16:5,17:5,18:5,19:5,20:5};

function slotsForCharacter(casterType, level){
  level = clamp(level||1, 1, 20);
  if (casterType === 'full') return SLOTS_FULL[level].slice();
  if (casterType === 'half') return SLOTS_HALF[level].slice();
  if (casterType === 'third') return SLOTS_THIRD[level].slice();
  if (casterType === 'pact') { const arr=[]; arr[SLOTS_PACT_LEVEL[level]-1]=SLOTS_PACT_COUNT[level]; return arr.map(x=>x||0); }
  return [];
}

const BACKGROUND_PRESETS = ["Accolito","Criminale","Eroe del Popolo","Artigiano di Gilda","Eremita","Nobile","Forestiero","Sapiente","Marinaio","Soldato","Ciarlatano","Intrattenitore"];
const AVATAR_GLYPHS = ["⚔️","🛡️","🏹","🔮","🐉","🦉","🌙","⚜️","🕯️","🪄","🦇","🌿","👑","💀","🔥","❄️"];
const DICE_TYPES = [4,6,8,10,12,20,100];

/* ─── 3. UTILITÀ ─── */
const $ = (sel, ctx) => (ctx||document).querySelector(sel);
const $$ = (sel, ctx) => Array.from((ctx||document).querySelectorAll(sel));
const uid = () => 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const mod = (score) => Math.floor(((Number(score)||10) - 10) / 2);
const modStr = (score) => { const m = mod(score); return (m >= 0 ? '+' : '') + m; };
const signStr = (n) => { n = Number(n)||0; return (n >= 0 ? '+' : '') + n; };
const profBonus = (level) => Math.ceil((Number(level)||1) / 4) + 1;
const escapeHtml = (s) => (s==null?'':String(s)).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
function toast(msg){
  $$('.toast').forEach(t=>t.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2600);
}
function rollDie(sides){ return 1 + Math.floor(Math.random()*sides); }
function setPath(obj, path, value){
  const parts = path.split('.');
  let o = obj;
  for (let i=0;i<parts.length-1;i++){ if (o[parts[i]] == null || typeof o[parts[i]] !== 'object') o[parts[i]] = {}; o = o[parts[i]]; }
  o[parts[parts.length-1]] = value;
}
function getPath(obj, path, def){
  const parts = path.split('.');
  let o = obj;
  for (const p of parts){ if (o == null) return def; o = o[p]; }
  return o == null ? def : o;
}
function initials(name){
  return (name||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?';
}

/* ─── 4. STATO GLOBALE ─── */
const state = {
  view: 'party',              // party | grimoire | dm | settings | sheet
  theme: localStorage.getItem('grimorio-theme') || 'light',
  characters: [],
  npcs: [],
  customSpells: [],
  encounters: [],
  activeCharId: null,
  sheetTab: 'overview',       // overview | inventory | spells | background
  grimoireMode: 'browse',     // browse | pick (scelta rapida da aggiungere a un personaggio)
  grimoireFilter: { q: '', level: 'all', clas: 'all' },
  combat: { list: [], round: 1, turn: 0 },
  modal: null,                // descrittore della sheet-modal attiva
  booted: false,
  authReady: false,
  offlineMode: false,
};

document.documentElement.setAttribute('data-theme', state.theme);

/* ─── 5. PERSISTENZA — cache locale + sync Firebase ─────────────
   Avvio istantaneo da localStorage (funziona anche offline), poi
   collegamento in tempo reale a Firestore che tiene tutto sincronizzato
   tra i dispositivi collegati allo stesso account.
*/
const LS_KEY = 'grimorio-data-v1';
const SS_COMBAT = 'grimorio-combat-v1';
const SS_DICE = 'grimorio-dice-v1';
const __saveTimers = {};

let __saveStatus = 'idle';
let __saveStatusTimer = null;
function setSaveStatus(status){
  __saveStatus = status;
  const el = document.getElementById('save-status-bar');
  if (el) el.outerHTML = saveStatusHTML();
  if (status === 'saved') {
    clearTimeout(__saveStatusTimer);
    __saveStatusTimer = setTimeout(()=>{ __saveStatus = 'idle'; const e = document.getElementById('save-status-bar'); if (e) e.outerHTML = saveStatusHTML(); }, 2200);
  }
}
function saveStatusHTML(){
  if (__saveStatus === 'idle') return '';
  const labels = { saving: '⏳ Salvataggio…', saved: '✓ Sincronizzato', offline: '📴 Solo locale' };
  return `<div id="save-status-bar" class="save-status ${__saveStatus}">${labels[__saveStatus]||''}</div>`;
}
function offlineBannerHTML(){
  if (currentUser) return '';
  return `<div class="offline-banner">📴 Modalità locale — <button onclick="signIn()">Accedi con Google</button> per sincronizzare su tutti i dispositivi.</div>`;
}
function themeToggleBtn(){ return `<button class="btn-icon" onclick="toggleTheme()" aria-label="Cambia tema">${state.theme==='dark'?'🌙':'☀️'}</button>`; }

function loadSession(){
  try {
    const c = sessionStorage.getItem(SS_COMBAT);
    if (c) state.combat = JSON.parse(c);
    const d = sessionStorage.getItem(SS_DICE);
    if (d) state.diceHistory = JSON.parse(d);
  } catch(e){ console.warn('Sessione non leggibile', e); }
}
function saveSession(){
  try {
    sessionStorage.setItem(SS_COMBAT, JSON.stringify(state.combat));
    sessionStorage.setItem(SS_DICE, JSON.stringify(state.diceHistory || []));
  } catch(e){ console.warn('Impossibile salvare sessione', e); }
}

function mergeCollection(localArr, remoteArr, collection){
  const byId = {};
  remoteArr.forEach(r => { byId[r.id] = r; });
  (localArr||[]).forEach(l => {
    const r = byId[l.id];
    const pendingKey = collection + ':' + l.id;
    if (__saveTimers[pendingKey]) { byId[l.id] = l; return; }
    if (!r) { byId[l.id] = l; return; }
    const lt = l.updatedAt || l.createdAt || 0;
    const rt = r.updatedAt || r.createdAt || 0;
    byId[l.id] = lt >= rt ? l : r;
  });
  return Object.values(byId);
}

function loadLocal(){
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    state.characters = data.characters || [];
    state.npcs = data.npcs || [];
    state.customSpells = data.customSpells || [];
    state.encounters = data.encounters || [];
  } catch(e){ console.warn('Cache locale non leggibile', e); }
}
function saveLocal(){
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      characters: state.characters, npcs: state.npcs,
      customSpells: state.customSpells, encounters: state.encounters
    }));
  } catch(e){ console.warn('Impossibile salvare in locale', e); }
}

// Evita che una sincronizzazione in arrivo interrompa una digitazione in corso:
// se l'utente ha il focus su un campo di testo, salta il redraw completo.
function renderIfSafe(){
  const ae = document.activeElement;
  const typing = ae && ['INPUT','TEXTAREA','SELECT'].includes(ae.tagName) && document.body.contains(ae);
  if (typing) return;
  render();
}

let unsubscribers = [];
function attachFirestore(uidUser){
  unsubscribers.forEach(u=>u());
  unsubscribers = [];
  const base = db.collection('users').doc(uidUser);

  unsubscribers.push(base.collection('characters').onSnapshot(snap=>{
    const remote = snap.docs.map(d=>({...d.data(), id:d.id}));
    state.characters = mergeCollection(state.characters, remote, 'characters');
    saveLocal(); setSaveStatus('saved'); renderIfSafe();
  }, err=>{ console.error('Errore sync personaggi', err); toast('⚠️ Sync personaggi non riuscita'); }));

  unsubscribers.push(base.collection('npcs').onSnapshot(snap=>{
    const remote = snap.docs.map(d=>({...d.data(), id:d.id}));
    state.npcs = mergeCollection(state.npcs, remote, 'npcs');
    saveLocal(); setSaveStatus('saved'); renderIfSafe();
  }, err=>console.error('Errore sync PNG', err)));

  unsubscribers.push(base.collection('customSpells').onSnapshot(snap=>{
    const remote = snap.docs.map(d=>({...d.data(), id:d.id}));
    state.customSpells = mergeCollection(state.customSpells, remote, 'customSpells');
    saveLocal(); setSaveStatus('saved'); renderIfSafe();
  }, err=>console.error('Errore sync incantesimi personalizzati', err)));

  unsubscribers.push(base.collection('encounters').onSnapshot(snap=>{
    const remote = snap.docs.map(d=>({...d.data(), id:d.id}));
    state.encounters = mergeCollection(state.encounters, remote, 'encounters');
    saveLocal(); setSaveStatus('saved'); renderIfSafe();
  }, err=>console.error('Errore sync incontri', err)));
}

function userCol(collection){ return db.collection('users').doc(currentUser.uid).collection(collection); }

async function fsSet(collection, obj){
  const id = obj.id || uid();
  obj.id = id;
  obj.updatedAt = Date.now();
  saveLocal();
  if (!currentUser) { setSaveStatus('offline'); return id; }
  const payload = {...obj};
  try {
    await userCol(collection).doc(id).set(payload, {merge:true});
    setSaveStatus('saved');
  } catch(e){
    console.error('Errore salvataggio', e);
    setSaveStatus('offline');
    toast('⚠️ Salvataggio non riuscito, controlla la connessione');
  }
  return id;
}
async function fsDelete(collection, id){
  saveLocal();
  if (!currentUser) return;
  try { await userCol(collection).doc(id).delete(); }
  catch(e){ console.error('Errore eliminazione', e); toast('⚠️ Eliminazione non riuscita'); }
}
// Un timer di debounce per ogni oggetto (non uno globale condiviso): così modificare
// due personaggi/PNG diversi entro 600ms non fa "perdere" il salvataggio del primo.
function scheduleSave(collection, obj){
  saveLocal();
  setSaveStatus(currentUser ? 'saving' : 'offline');
  const key = collection + ':' + obj.id;
  clearTimeout(__saveTimers[key]);
  __saveTimers[key] = setTimeout(() => {
    delete __saveTimers[key];
    fsSet(collection, obj);
  }, 600);
}

/* ─── 6. AUTENTICAZIONE (Google Sign-In) ─── */
function isMobileAuth(){ return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent); }
function signIn(){
  const provider = new firebase.auth.GoogleAuthProvider();
  const signInMethod = isMobileAuth() ? auth.signInWithRedirect.bind(auth) : auth.signInWithPopup.bind(auth);
  signInMethod(provider).catch(err=>{
    console.error(err);
    const msgs = {
      "auth/unauthorized-domain": "Dominio non autorizzato. In Firebase Console → Authentication → Settings → Authorized domains aggiungi: " + location.hostname,
      "auth/operation-not-allowed": "Accesso Google non attivo. In Firebase Console → Authentication → Sign-in method abilita Google.",
      "auth/popup-blocked": "Il browser ha bloccato il popup: consenti i popup per questo sito e riprova.",
      "auth/configuration-not-found": "Configurazione Firebase mancante o errata: controlla FIREBASE_CONFIG in app.js.",
      "auth/cancelled-popup-request": null, "auth/popup-closed-by-user": null,
    };
    const m = msgs[err.code];
    if (m !== null) toast(m || ("Errore accesso: " + err.message));
  });
}
function signOutUser(){ auth.signOut(); }

auth.getRedirectResult().catch(err=>{
  if (err && err.code !== 'auth/no-auth-event') console.error('Redirect auth error:', err);
});

auth.onAuthStateChanged(u=>{
  currentUser = u;
  state.authReady = true;
  if (u) {
    state.offlineMode = false;
    attachFirestore(u.uid);
  } else {
    unsubscribers.forEach(x=>x()); unsubscribers = [];
  }
  render();
});

/* ─── 7. MODELLO PERSONAGGIO ─── */
function newCharacter(){
  return {
    id: uid(),
    name: '', race: '', classField: '', level: 1, background: '', alignment: '',
    avatar: AVATAR_GLYPHS[Math.floor(Math.random()*AVATAR_GLYPHS.length)],
    abilities: { str:10, dex:10, con:10, int:10, wis:10, cha:10 },
    skillProf: [], saveProf: [],
    hp: { current: 10, max: 10, temp: 0 },
    ac: 10, initiative: 0, speed: 9, hitDice: '1d8',
    casterType: 'none', spellAbility: 'int',
    slotsUsed: {},
    knownSpells: [],
    inventory: [],
    traits: '', ideals: '', bonds: '', flaws: '', backstory: '', features: '',
    createdAt: Date.now(),
  };
}

/* ─── 8. FRAMEWORK DI RENDER + NAVIGAZIONE ─── */
function goView(v){ state.view = v; state.activeCharId = null; render(); window.scrollTo({top:0}); }
function openSheet(id){ state.view = 'sheet'; state.activeCharId = id; state.sheetTab = 'overview'; render(); window.scrollTo({top:0}); }

function toggleTheme(){
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('grimorio-theme', state.theme);
  document.documentElement.setAttribute('data-theme', state.theme);
  render();
}

function loaderHTML(){ return `<div id="loader"><div class="spinner"></div><p>Il Grimorio si sta aprendo…</p></div>`; }

function authScreenHTML(){
  const hasLocal = state.characters.length || state.npcs.length || state.customSpells.length;
  return `<div class="auth-screen">
    <div class="seal">📖</div>
    <h1 class="display">Grimorio</h1>
    <p>Personaggi, incantesimi, inventario, background e strumenti da master: la tua compagnia sempre a portata di mano, sincronizzata su tutti i dispositivi.</p>
    <button class="google-btn" onclick="signIn()">
      <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.9v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.04l3.07-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.96l3.07 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
      Accedi con Google
    </button>
    ${hasLocal ? `<button class="btn btn-ghost btn-block" onclick="continueOffline()">Continua in locale (${state.characters.length} personagg${state.characters.length===1?'io':'i'})</button>` : ''}
    <p style="font-size:.72rem; opacity:.7;">${hasLocal ? 'In locale i dati restano su questo dispositivo. Accedi per sincronizzare.' : 'I dati restano legati al tuo account Google e sincronizzati tra i dispositivi collegati.'}</p>
  </div>`;
}
function continueOffline(){ state.offlineMode = true; render(); }

function bottomNavHTML(){
  const items = [
    {v:'party', ic:'🎭', label:'Party'},
    {v:'grimoire', ic:'📖', label:'Grimorio'},
    {v:'dm', ic:'⚔️', label:'Tavolo'},
    {v:'settings', ic:'⚙️', label:'Opzioni'},
  ];
  return `<div class="bottomnav"><div class="bottomnav-inner">
    ${items.map(i=>`<button class="nav-btn ${state.view===i.v?'active':''}" onclick="goView('${i.v}')"><span class="ic">${i.ic}</span>${i.label}</button>`).join('')}
  </div></div>`;
}

function fabHTML(){ return `<button class="fab" onclick="openDiceRoller()" aria-label="Tira i dadi">🎲</button>`; }

function emptyState(icon, text){ return `<div class="empty-state"><div class="ic">${icon}</div><p>${escapeHtml(text)}</p></div>`; }

function render(){
  const app = $('#app');
  if (!state.authReady) { app.innerHTML = loaderHTML(); return; }
  if (!currentUser && !state.offlineMode && !state.characters.length && !state.npcs.length) {
    app.innerHTML = authScreenHTML();
    return;
  }

  let body;
  if (state.view === 'sheet' && state.characters.find(c=>c.id===state.activeCharId)) body = renderCharacterSheet();
  else if (state.view === 'grimoire') body = renderGrimoire();
  else if (state.view === 'dm') body = renderDM();
  else if (state.view === 'settings') body = renderSettings();
  else { state.view = 'party'; body = renderParty(); }

  app.innerHTML = offlineBannerHTML() + saveStatusHTML() + body + (state.view === 'sheet' ? '' : bottomNavHTML()) + fabHTML();
}

/* ─── 9. VISTA PARTY ─── */
function renderParty(){
  const chars = state.characters;
  return `
    <div class="screen">
      <div class="brand-row">
        <div class="brand-mark">
          <div class="seal seal-mini" style="font-size:1.05rem;">📖</div>
          <div class="topbar-title brand">Grimorio</div>
        </div>
        ${themeToggleBtn()}
      </div>
      ${chars.length ? `<div class="stagger list-gap">${chars.map(charCardHTML).join('')}</div>` : emptyState('🎭','Nessun personaggio ancora. Crea il tuo primo eroe per iniziare l\'avventura.')}
      <button class="btn btn-primary btn-block" style="margin-top:14px" onclick="openCharacterForm()">+ Nuovo personaggio</button>
    </div>
  `;
}
function charCardHTML(c){
  const hpMax = getPath(c,'hp.max',1)||1;
  const hpPct = clamp(100*(getPath(c,'hp.current',0)/hpMax), 0, 100);
  return `
    <div class="char-card" onclick="openSheet('${c.id}')">
      <div class="seal" style="font-size:1.5rem;">${c.avatar||'⚔️'}</div>
      <div class="char-card-body">
        <div class="char-card-name">${escapeHtml(c.name||'Senza nome')}</div>
        <div class="char-card-sub">${escapeHtml(c.classField||'Avventuriero')} · Lv ${c.level||1}${c.race?(' · '+escapeHtml(c.race)):''}</div>
        <div class="hp-mini"><div class="hp-mini-fill" style="width:${hpPct}%"></div></div>
      </div>
      <div class="char-card-chevron">›</div>
    </div>
  `;
}

/* ─── 10. MODALI GENERICHE (overlay riutilizzabili) ─── */
function ensureModalRoot(){
  let root = document.getElementById('modal-root');
  if (!root) { root = document.createElement('div'); root.id = 'modal-root'; document.body.appendChild(root); }
  return root;
}
function renderModalRoot(){
  const root = ensureModalRoot();
  if (!state.modal) { root.innerHTML = ''; return; }
  root.innerHTML = state.modal.render();
  if (state.modal.after) state.modal.after();
}
function openModal(descriptor){ state.modal = descriptor; renderModalRoot(); }
function closeModal(){ state.modal = null; renderModalRoot(); }

let __confirmAction = null;
function confirmDialog(title, body, action){
  __confirmAction = action;
  openModal({ render: () => `
    <div class="overlay center" onclick="if(event.target===this) closeModal()">
      <div class="sheet-modal" style="padding:22px 18px; border-radius:20px;">
        <div class="section-title">${escapeHtml(title)}</div>
        <p class="muted" style="margin-bottom:18px;">${escapeHtml(body)}</p>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-ghost" style="flex:1" onclick="closeModal()">Annulla</button>
          <button class="btn" style="flex:1; background:var(--garnet); color:#fff8ec;" onclick="__confirmAction && __confirmAction(); closeModal();">Conferma</button>
        </div>
      </div>
    </div>` });
}

/* ─── 11. CREAZIONE / MODIFICA PERSONAGGIO ─── */
let draftChar = null;
function openCharacterForm(existingId){
  const c = existingId ? state.characters.find(x=>x.id===existingId) : null;
  draftChar = c ? JSON.parse(JSON.stringify(c)) : newCharacter();
  openModal({ render: () => characterFormHTML(!!c) });
}
function characterFormHTML(isEdit){
  const d = draftChar;
  return `
  <div class="overlay" onclick="if(event.target===this) closeModal()">
    <div class="sheet-modal">
      <div class="sheet-modal-handle"></div>
      <div class="sheet-modal-head">
        <div class="sheet-modal-title">${isEdit?'Modifica personaggio':'Nuovo personaggio'}</div>
        <button class="btn-icon" onclick="closeModal()">✕</button>
      </div>
      <div class="field">
        <label>Nome</label>
        <input value="${escapeHtml(d.name)}" placeholder="Es. Elyndra Nightwhisper" oninput="draftChar.name=this.value">
      </div>
      <div class="form-row">
        <div class="field"><label>Razza</label><input value="${escapeHtml(d.race)}" placeholder="Es. Elfo" oninput="draftChar.race=this.value"></div>
        <div class="field"><label>Classe</label>
          <select onchange="draftChar.classField=this.value; applyClassDefaults(draftChar); renderModalRoot()">
            <option value="">—</option>
            ${CLASS_LIST_IT.map(cl=>`<option value="${cl}" ${d.classField===cl?'selected':''}>${cl}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="field"><label>Livello</label><input type="number" min="1" max="20" value="${d.level||1}" oninput="draftChar.level=clamp(parseInt(this.value)||1,1,20)"></div>
        <div class="field"><label>Allineamento</label><input value="${escapeHtml(d.alignment||'')}" placeholder="Es. Neutrale Buono" oninput="draftChar.alignment=this.value"></div>
      </div>
      <div class="field">
        <label>Background</label>
        <div class="chip-row" style="margin-bottom:8px;">
          ${BACKGROUND_PRESETS.slice(0,6).map(b=>`<button type="button" class="chip ${d.background===b?'active':''}" onclick="draftChar.background='${b}'; renderModalRoot()">${b}</button>`).join('')}
        </div>
        <input value="${escapeHtml(d.background||'')}" placeholder="Es. Eremita" oninput="draftChar.background=this.value">
      </div>
      <div class="form-row">
        <div class="field"><label>PF massimi</label><input type="number" min="1" value="${getPath(d,'hp.max',10)}" oninput="draftChar.hp=draftChar.hp||{}; draftChar.hp.max=clamp(parseInt(this.value)||1,1,9999); if(!draftChar.hp.current) draftChar.hp.current=draftChar.hp.max"></div>
        <div class="field"><label>Tipo incantatore</label>
          <select onchange="draftChar.casterType=this.value">
            ${CASTER_TYPES.map(ct=>`<option value="${ct.key}" ${(d.casterType||'none')===ct.key?'selected':''}>${ct.label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field">
        <label>Simbolo</label>
        <div class="chip-row">
          ${AVATAR_GLYPHS.map(g=>`<button class="chip ${d.avatar===g?'active':''}" style="font-size:1.05rem;padding:7px 11px;" onclick="draftChar.avatar='${g}'; renderModalRoot()">${g}</button>`).join('')}
        </div>
      </div>
      <button class="btn btn-primary btn-block" style="margin-top:6px" onclick="saveCharacterDraft(${isEdit})">${isEdit?'Salva modifiche':'Crea personaggio'}</button>
      ${isEdit?`<button class="btn btn-danger btn-block" style="margin-top:8px" onclick="closeModal(); confirmDeleteCharacter('${d.id}')">Elimina personaggio</button>`:''}
    </div>
  </div>`;
}
function saveCharacterDraft(isEdit){
  if (!draftChar.name || !draftChar.name.trim()){ toast('Dai un nome al personaggio prima di continuare'); return; }
  draftChar.hp = draftChar.hp || { current: 10, max: 10, temp: 0 };
  if (!draftChar.hp.current) draftChar.hp.current = draftChar.hp.max || 10;
  if (!isEdit && !draftChar.classField) applyClassDefaults(draftChar);
  const idx = state.characters.findIndex(c=>c.id===draftChar.id);
  if (idx>=0) state.characters[idx] = draftChar; else state.characters.push(draftChar);
  if (!currentUser) state.offlineMode = true;
  fsSet('characters', draftChar);
  saveLocal();
  const newId = draftChar.id;
  closeModal();
  if (!isEdit) openSheet(newId); else render();
}
function confirmDeleteCharacter(id){
  const c = state.characters.find(x=>x.id===id);
  confirmDialog('Eliminare ' + (c?c.name:'questo personaggio') + '?', 'Il personaggio e i suoi dati andranno persi permanentemente.', () => doDeleteCharacter(id));
}
function doDeleteCharacter(id){
  state.characters = state.characters.filter(c=>c.id!==id);
  if (currentUser) fsDelete('characters', id);
  saveLocal();
  if (state.activeCharId === id) { state.view='party'; state.activeCharId=null; }
  render();
  toast('Personaggio eliminato');
}

/* ─── 12. CALCOLI DERIVATI PERSONAGGIO ─── */
function skillMod(c, s){ return mod(getPath(c,'abilities.'+s.ability,10)) + ((c.skillProf||[]).includes(s.key) ? profBonus(c.level) : 0); }
function saveMod(c, abilityKey){ return mod(getPath(c,'abilities.'+abilityKey,10)) + ((c.saveProf||[]).includes(abilityKey) ? profBonus(c.level) : 0); }
function hpPctFor(c){ const max = getPath(c,'hp.max',1)||1; return clamp(100*getPath(c,'hp.current',0)/max, 0, 100); }
function spellcastingMod(c){ return mod(getPath(c,'abilities.'+(c.spellAbility||'int'),10)) + profBonus(c.level); }

function updateCharField(id, path, value){
  const c = state.characters.find(x=>x.id===id);
  if (!c) return;
  setPath(c, path, value);
  scheduleSave('characters', c);
  saveLocal();
}

function updateAbility(charId, key, value){
  const c = state.characters.find(x=>x.id===charId);
  if (!c) return;
  const score = clamp(parseInt(value)||10, 1, 30);
  setPath(c, 'abilities.'+key, score);
  const modEl = document.getElementById('mod-'+key); if (modEl) modEl.textContent = modStr(score);
  if (key === 'dex') {
    c.initiative = mod(score);
    const initEl = document.getElementById('cs-init'); if (initEl) initEl.value = c.initiative;
  }
  SKILLS.filter(s=>s.ability===key).forEach(s=>{
    const el = document.getElementById('skmod-'+s.key);
    if (el) el.textContent = signStr(skillMod(c, s));
  });
  const saveEl = document.getElementById('savemod-'+key);
  if (saveEl) saveEl.textContent = signStr(saveMod(c, key));
  scheduleSave('characters', c);
  saveLocal();
}

function toggleSkillProf(id, key){
  const c = state.characters.find(x=>x.id===id); if (!c) return;
  c.skillProf = c.skillProf||[];
  const i = c.skillProf.indexOf(key);
  if (i>=0) c.skillProf.splice(i,1); else c.skillProf.push(key);
  scheduleSave('characters', c); saveLocal(); render();
}
function toggleSaveProf(id, key){
  const c = state.characters.find(x=>x.id===id); if (!c) return;
  c.saveProf = c.saveProf||[];
  const i = c.saveProf.indexOf(key);
  if (i>=0) c.saveProf.splice(i,1); else c.saveProf.push(key);
  scheduleSave('characters', c); saveLocal(); render();
}

function bumpHP(id, delta){
  const c = state.characters.find(x=>x.id===id); if (!c) return;
  const max = getPath(c,'hp.max',0);
  let cur = clamp(getPath(c,'hp.current',0) + delta, 0, max);
  setPath(c,'hp.current',cur);
  refreshHPDisplay(c);
  scheduleSave('characters', c); saveLocal();
}
function setHP(id, val){
  const c = state.characters.find(x=>x.id===id); if (!c) return;
  setPath(c,'hp.current', clamp(parseInt(val)||0, 0, 9999));
  refreshHPDisplay(c, false);
  scheduleSave('characters', c); saveLocal();
}
function setHPMax(id, val){
  const c = state.characters.find(x=>x.id===id); if (!c) return;
  setPath(c,'hp.max', clamp(parseInt(val)||0, 0, 9999));
  refreshHPDisplay(c, false);
  scheduleSave('characters', c); saveLocal();
}
function refreshHPDisplay(c, updateInput){
  if (updateInput === undefined) updateInput = true;
  const cur = getPath(c,'hp.current',0), max = getPath(c,'hp.max',0);
  const numEl = document.getElementById('hp-current'); if (numEl) numEl.textContent = cur;
  const maxEl = document.getElementById('hp-max-lbl'); if (maxEl) maxEl.textContent = '/ ' + max + ' PF';
  const fillEl = document.getElementById('hp-bar-fill'); if (fillEl) fillEl.style.width = hpPctFor(c) + '%';
  if (updateInput) { const inputEl = document.getElementById('hp-current-input'); if (inputEl) inputEl.value = cur; }
}

/* ─── 13. SCHEDA PERSONAGGIO — shell + tab ─── */
function setSheetTab(tab){ state.sheetTab = tab; render(); window.scrollTo({top:0}); }

function renderCharacterSheet(){
  const c = state.characters.find(x=>x.id===state.activeCharId);
  if (!c) { state.view = 'party'; return renderParty(); }
  let tabContent;
  if (state.sheetTab === 'inventory') tabContent = renderSheetInventory(c);
  else if (state.sheetTab === 'spells') tabContent = renderSheetSpells(c);
  else if (state.sheetTab === 'background') tabContent = renderSheetBackground(c);
  else tabContent = renderSheetOverview(c);

  return `
    <div class="screen">
      <div class="topbar">
        <button class="topbar-back" onclick="goView('party')">←</button>
        <div style="flex:1; min-width:0;">
          <div class="topbar-title">${escapeHtml(c.name||'Senza nome')}</div>
          <div class="topbar-sub">${escapeHtml(c.classField||'Avventuriero')} · Lv ${c.level||1}${c.race?(' · '+escapeHtml(c.race)):''}</div>
        </div>
        <div class="topbar-actions"><button class="btn-icon" onclick="openCharacterForm('${c.id}')">✎</button></div>
      </div>
      <div class="segmented" style="margin:14px 0;">
        <button class="${state.sheetTab==='overview'?'active':''}" onclick="setSheetTab('overview')">Panoramica</button>
        <button class="${state.sheetTab==='inventory'?'active':''}" onclick="setSheetTab('inventory')">Zaino</button>
        <button class="${state.sheetTab==='spells'?'active':''}" onclick="setSheetTab('spells')">Incantesimi</button>
        <button class="${state.sheetTab==='background'?'active':''}" onclick="setSheetTab('background')">Background</button>
      </div>
      ${tabContent}
    </div>
  `;
}

function renderSheetOverview(c){
  return `
    <div class="ability-grid">
      ${ABILITIES.map(a => `
        <div class="ability-seal">
          <div class="lbl">${a.abbr}</div>
          <div class="seal"><div class="mod" id="mod-${a.key}">${modStr(getPath(c,'abilities.'+a.key,10))}</div></div>
          <input type="number" class="score" value="${getPath(c,'abilities.'+a.key,10)}" min="1" max="30" oninput="updateAbility('${c.id}','${a.key}', this.value)">
        </div>`).join('')}
    </div>

    <div class="combat-grid">
      <div class="combat-stat"><input type="number" class="v" value="${c.ac??10}" oninput="updateCharField('${c.id}','ac',parseInt(this.value)||0)"><div class="l">CA</div></div>
      <div class="combat-stat"><input type="number" class="v" id="cs-init" value="${c.initiative ?? mod(getPath(c,'abilities.dex',10))}" oninput="updateCharField('${c.id}','initiative',parseInt(this.value)||0)"><div class="l">Iniziativa</div></div>
      <div class="combat-stat"><input type="number" class="v" value="${c.speed??9}" oninput="updateCharField('${c.id}','speed',parseInt(this.value)||0)"><div class="l">Velocità (m)</div></div>
    </div>

    <div class="hp-block">
      <div class="hp-block-top">
        <div><span class="hp-num" id="hp-current">${getPath(c,'hp.current',0)}</span> <span class="hp-max" id="hp-max-lbl">/ ${getPath(c,'hp.max',0)} PF</span></div>
        <span class="badge gold">Dado Vita</span>
      </div>
      <div class="hp-bar-lg"><div class="hp-bar-lg-fill" id="hp-bar-fill" style="width:${hpPctFor(c)}%"></div></div>
      <div class="hp-controls">
        <button class="stepper-btn" onclick="bumpHP('${c.id}',-1)">−</button>
        <input type="number" id="hp-current-input" value="${getPath(c,'hp.current',0)}" oninput="setHP('${c.id}', this.value)">
        <button class="stepper-btn" onclick="bumpHP('${c.id}',1)">+</button>
      </div>
      <div class="temp-hp-row">
        <span>PF temp.</span> <input type="number" value="${getPath(c,'hp.temp',0)}" oninput="updateCharField('${c.id}','hp.temp',parseInt(this.value)||0)">
        <span>PF massimi</span> <input type="number" value="${getPath(c,'hp.max',0)}" oninput="setHPMax('${c.id}', this.value)">
        <span>Dado Vita</span> <input type="text" style="width:56px" value="${escapeHtml(c.hitDice||'')}" placeholder="1d8" oninput="updateCharField('${c.id}','hitDice',this.value)">
      </div>
    </div>

    <div class="divider"><span class="flourish">❧</span><span>Tiri Salvezza</span></div>
    <div class="card"><div class="skills-list">
      ${ABILITIES.map(a=>`<div class="save-row">
        <button class="skill-dot ${(c.saveProf||[]).includes(a.key)?'on':''}" onclick="toggleSaveProf('${c.id}','${a.key}')"></button>
        <div class="skill-name">${a.label}</div>
        <div class="skill-mod" id="savemod-${a.key}">${signStr(saveMod(c,a.key))}</div>
      </div>`).join('')}
    </div></div>

    <div class="divider"><span class="flourish">❧</span><span>Abilità</span></div>
    <div class="card"><div class="skills-list">
      ${SKILLS.map(s=>`<div class="skill-row">
        <button class="skill-dot ${(c.skillProf||[]).includes(s.key)?'on':''}" onclick="toggleSkillProf('${c.id}','${s.key}')"></button>
        <div class="skill-name">${s.label}</div>
        <div class="skill-ability">${ABILITIES.find(a=>a.key===s.ability).abbr}</div>
        <div class="skill-mod" id="skmod-${s.key}">${signStr(skillMod(c,s))}</div>
      </div>`).join('')}
    </div></div>

    <div class="divider"><span class="flourish">❧</span><span>Talenti & Caratteristiche</span></div>
    <div class="field"><textarea placeholder="Talenti, caratteristiche di classe, tratti razziali…" oninput="updateCharField('${c.id}','features',this.value)">${escapeHtml(c.features||'')}</textarea></div>
  `;
}

/* ─── 14. SCHEDA — Zaino ─── */
function renderSheetInventory(c){
  const items = c.inventory||[];
  return `
    <div class="section-title">Zaino & Equipaggiamento</div>
    ${items.length ? items.map((it,i)=>invItemHTML(c,it,i)).join('') : emptyState('🎒','Zaino vuoto. Aggiungi armi, armature e oggetti.')}
    <button class="btn btn-primary btn-block" style="margin-top:14px;" onclick="addInventoryItem('${c.id}')">+ Aggiungi oggetto</button>
  `;
}
function invItemHTML(c, it, i){
  return `<div class="inv-item" onclick="editInventoryItem('${c.id}',${i})" style="cursor:pointer;">
    <button class="equip-toggle ${it.equipped?'on':''}" title="Indossato/impugnato" onclick="event.stopPropagation(); toggleEquip('${c.id}',${i})">${it.equipped?'✓':''}</button>
    <div class="inv-item-name ${it.equipped?'equipped':''}">${escapeHtml(it.name)}${it.notes?`<div class="muted" style="font-size:.72rem;margin-top:2px;">${escapeHtml(it.notes)}</div>`:''}</div>
    <div class="inv-qty">×${it.qty||1}</div>
    <button class="btn-icon" style="width:30px;height:30px;font-size:.8rem;" onclick="event.stopPropagation(); removeInventoryItem('${c.id}',${i})">✕</button>
  </div>`;
}
function addInventoryItem(charId){
  openModal({ render: () => `
    <div class="overlay" onclick="if(event.target===this) closeModal()">
      <div class="sheet-modal">
        <div class="sheet-modal-handle"></div>
        <div class="sheet-modal-head"><div class="sheet-modal-title">Nuovo oggetto</div><button class="btn-icon" onclick="closeModal()">✕</button></div>
        <div class="field"><label>Nome</label><input id="inv-name" placeholder="Es. Spada corta"></div>
        <div class="form-row">
          <div class="field"><label>Quantità</label><input id="inv-qty" type="number" min="1" value="1"></div>
          <div class="field"><label>Note</label><input id="inv-notes" placeholder="Peso, dettagli… (facoltativo)"></div>
        </div>
        <button class="btn btn-primary btn-block" onclick="confirmAddInventory('${charId}')">Aggiungi allo zaino</button>
      </div>
    </div>`, after: () => { const el = document.getElementById('inv-name'); if (el) el.focus(); } });
}
function confirmAddInventory(charId){
  const nameEl = document.getElementById('inv-name');
  const name = nameEl.value.trim();
  if (!name){ toast('Dai un nome all\'oggetto'); return; }
  const qty = parseInt(document.getElementById('inv-qty').value)||1;
  const notes = document.getElementById('inv-notes').value.trim();
  const c = state.characters.find(x=>x.id===charId);
  c.inventory = c.inventory||[];
  c.inventory.push({name, qty, notes, equipped:false});
  scheduleSave('characters', c); saveLocal();
  closeModal(); render();
}
function toggleEquip(charId, i){
  const c = state.characters.find(x=>x.id===charId);
  c.inventory[i].equipped = !c.inventory[i].equipped;
  scheduleSave('characters', c); saveLocal(); render();
}
function removeInventoryItem(charId, i){
  const c = state.characters.find(x=>x.id===charId);
  c.inventory.splice(i,1);
  scheduleSave('characters', c); saveLocal(); render();
}
function editInventoryItem(charId, i){
  const c = state.characters.find(x=>x.id===charId);
  const it = (c.inventory||[])[i];
  if (!it) return;
  openModal({ render: () => `
    <div class="overlay" onclick="if(event.target===this) closeModal()">
      <div class="sheet-modal">
        <div class="sheet-modal-handle"></div>
        <div class="sheet-modal-head"><div class="sheet-modal-title">Modifica oggetto</div><button class="btn-icon" onclick="closeModal()">✕</button></div>
        <div class="field"><label>Nome</label><input id="inv-edit-name" value="${escapeHtml(it.name)}"></div>
        <div class="form-row">
          <div class="field"><label>Quantità</label><input id="inv-edit-qty" type="number" min="1" value="${it.qty||1}"></div>
          <div class="field"><label>Note</label><input id="inv-edit-notes" value="${escapeHtml(it.notes||'')}"></div>
        </div>
        <button class="btn btn-primary btn-block" onclick="confirmEditInventory('${charId}',${i})">Salva modifiche</button>
      </div>
    </div>` });
}
function confirmEditInventory(charId, i){
  const c = state.characters.find(x=>x.id===charId);
  const name = document.getElementById('inv-edit-name').value.trim();
  if (!name){ toast('Dai un nome all\'oggetto'); return; }
  c.inventory[i].name = name;
  c.inventory[i].qty = parseInt(document.getElementById('inv-edit-qty').value)||1;
  c.inventory[i].notes = document.getElementById('inv-edit-notes').value.trim();
  scheduleSave('characters', c); saveLocal();
  closeModal(); render();
}

/* ─── 15. SCHEDA — Incantesimi ─── */
function spellByRef(ref){
  if (ref.source === 'custom') return state.customSpells.find(s=>s.id===ref.id);
  return SRD_SPELLS.find(s=>s.id===ref.id);
}
function renderSheetSpells(c){
  const slots = slotsForCharacter(c.casterType, c.level);
  const used = c.slotsUsed || {};
  const known = c.knownSpells || [];
  const isCaster = c.casterType && c.casterType !== 'none';
  return `
    <div class="card" style="margin-bottom:14px;">
      <div class="form-row" style="margin-bottom:0;">
        <div class="field" style="margin-bottom:0;"><label>Tipo Incantatore</label>
          <select onchange="updateCasterType('${c.id}', this.value)">
            ${CASTER_TYPES.map(ct=>`<option value="${ct.key}" ${c.casterType===ct.key?'selected':''}>${ct.label}</option>`).join('')}
          </select>
        </div>
        <div class="field" style="margin-bottom:0;"><label>Caratteristica</label>
          <select onchange="updateCharField('${c.id}','spellAbility',this.value); render();">
            ${['int','wis','cha'].map(k=>`<option value="${k}" ${(c.spellAbility||'int')===k?'selected':''}>${ABILITIES.find(a=>a.key===k).label}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    ${isCaster ? `
      <div class="combat-grid" style="margin-bottom:14px;">
        <div class="combat-stat"><div class="v">${8+spellcastingMod(c)}</div><div class="l">CD Incantesimo</div></div>
        <div class="combat-stat"><div class="v">${signStr(spellcastingMod(c))}</div><div class="l">Att. Incantesimo</div></div>
        <div class="combat-stat"><div class="v">${profBonus(c.level)}</div><div class="l">Bon. Competenza</div></div>
      </div>
      <div class="slot-tracker">
        <div class="slot-tracker-head">
          <div class="section-title" style="margin:0;">Slot Incantesimo</div>
          <button class="btn btn-sm btn-ghost" onclick="longRest('${c.id}')">🌙 Riposo lungo</button>
        </div>
        ${slots.map((count,i)=>{
          if (!count) return '';
          const lvl = i+1, usedCount = used[lvl]||0;
          return `<div class="slot-row">
            <div class="slot-level-label">${lvl}°</div>
            <div class="slot-runes">${Array.from({length:count}).map((_,ri)=>`<button class="rune ${ri<usedCount?'spent':''}" onclick="toggleSlot('${c.id}',${lvl},${ri})"></button>`).join('')}</div>
          </div>`;
        }).join('')}
      </div>
    ` : `<div class="empty-state" style="padding:26px 20px;"><div class="ic">🪄</div><p>Nessun incantesimo per ora. Se il personaggio lancia magie, imposta il tipo incantatore sopra.</p></div>`}

    <div class="divider"><span class="flourish">❧</span><span>Incantesimi Conosciuti</span></div>
    ${known.length ? known.map(k => knownSpellRow(c, k)).join('') : emptyState('📜','Nessun incantesimo ancora: aggiungine dal Grimorio.')}
    <button class="btn btn-primary btn-block" style="margin-top:14px;" onclick="pickSpellForCharacter('${c.id}')">+ Aggiungi dal Grimorio</button>
  `;
}
function knownSpellRow(c, ref){
  const sp = spellByRef(ref);
  if (!sp) return '';
  return `<div class="spell-item" onclick="viewSpellDetail('${sp.id}','${ref.source}')">
    <div class="spell-lvl-badge">${sp.level===0?'C':sp.level}</div>
    <div class="spell-item-body">
      <div class="spell-item-name">${escapeHtml(sp.name)}</div>
      <div class="spell-item-meta">${escapeHtml(schoolIt(sp.school||''))}${ref.source==='custom'?' · personalizzato':''}</div>
    </div>
    <button class="spell-item-add" style="color:var(--garnet);" onclick="event.stopPropagation(); removeKnownSpell('${c.id}','${sp.id}','${ref.source}')">✕</button>
  </div>`;
}
function toggleSlot(charId, level, idx){
  const c = state.characters.find(x=>x.id===charId);
  c.slotsUsed = c.slotsUsed || {};
  const cur = c.slotsUsed[level]||0;
  c.slotsUsed[level] = idx < cur ? idx : idx+1;
  scheduleSave('characters', c); saveLocal(); render();
}
function longRest(charId){
  const c = state.characters.find(x=>x.id===charId);
  c.slotsUsed = {};
  scheduleSave('characters', c); saveLocal(); render();
  toast('🌙 Riposo lungo effettuato: slot ripristinati');
}
function updateCasterType(charId, val){
  const c = state.characters.find(x=>x.id===charId);
  c.casterType = val;
  scheduleSave('characters', c); saveLocal(); render();
}
function pickSpellForCharacter(charId){
  state.grimoireMode = 'pick';
  state.grimoirePickFor = charId;
  goView('grimoire');
}
function addKnownSpell(charId, spellId, source){
  const c = state.characters.find(x=>x.id===charId);
  c.knownSpells = c.knownSpells||[];
  if (c.knownSpells.some(k=>k.id===spellId && k.source===source)) { toast('Incantesimo già presente'); return; }
  c.knownSpells.push({id:spellId, source});
  scheduleSave('characters', c); saveLocal();
  toast('✨ Incantesimo aggiunto');
  render();
}
function removeKnownSpell(charId, spellId, source){
  const c = state.characters.find(x=>x.id===charId);
  c.knownSpells = (c.knownSpells||[]).filter(k=>!(k.id===spellId && k.source===source));
  scheduleSave('characters', c); saveLocal(); render();
}

/* ─── 16. SCHEDA — Background ─── */
function renderSheetBackground(c){
  return `
    <div class="field">
      <label>Background</label>
      <div class="chip-row" style="margin-bottom:8px;">
        ${BACKGROUND_PRESETS.map(b=>`<button class="chip ${c.background===b?'active':''}" onclick="setBackgroundPreset('${c.id}','${b}')">${b}</button>`).join('')}
      </div>
      <input value="${escapeHtml(c.background||'')}" placeholder="…oppure scrivi il tuo" oninput="updateCharField('${c.id}','background',this.value)">
    </div>

    <div class="divider"><span class="flourish">❧</span><span>Personalità</span></div>
    <div class="trait-grid">
      <div class="field"><label>Tratti Personalità</label><textarea oninput="updateCharField('${c.id}','traits',this.value)">${escapeHtml(c.traits||'')}</textarea></div>
      <div class="field"><label>Ideali</label><textarea oninput="updateCharField('${c.id}','ideals',this.value)">${escapeHtml(c.ideals||'')}</textarea></div>
      <div class="field"><label>Legami</label><textarea oninput="updateCharField('${c.id}','bonds',this.value)">${escapeHtml(c.bonds||'')}</textarea></div>
      <div class="field"><label>Difetti</label><textarea oninput="updateCharField('${c.id}','flaws',this.value)">${escapeHtml(c.flaws||'')}</textarea></div>
    </div>

    <div class="divider"><span class="flourish">❧</span><span>Storia</span></div>
    <div class="field"><textarea style="min-height:180px;" placeholder="Da dove viene questo personaggio? Cosa lo spinge all'avventura?" oninput="updateCharField('${c.id}','backstory',this.value)">${escapeHtml(c.backstory||'')}</textarea></div>
  `;
}
function setBackgroundPreset(charId, val){
  updateCharField(charId, 'background', val);
  render();
}

/* ─── 17. GRIMORIO — compendio incantesimi ─── */
function renderGrimoire(){
  const picking = state.grimoireMode === 'pick';
  const pickChar = picking ? state.characters.find(c=>c.id===state.grimoirePickFor) : null;
  const f = state.grimoireFilter;
  return `
    <div class="screen">
      ${picking ? `
        <div class="topbar">
          <button class="topbar-back" onclick="cancelPickSpell()">←</button>
          <div style="flex:1;min-width:0;"><div class="topbar-title">Aggiungi a ${escapeHtml(pickChar?pickChar.name:'')}</div><div class="topbar-sub">Tocca un incantesimo per aggiungerlo</div></div>
          <button class="btn btn-sm btn-primary" onclick="cancelPickSpell()">Fatto</button>
        </div>
      ` : `<div class="brand-row"><div class="topbar-title brand">Grimorio</div>${themeToggleBtn()}</div>`}
      <div class="search-wrap">
        <span class="search-ic">🔍</span>
        <input id="grimoire-search-input" placeholder="Cerca un incantesimo…" value="${escapeHtml(f.q)}" oninput="setGrimoireSearch(this.value)">
      </div>
      <div class="filter-bar">
        <button class="filter-chip ${f.level==='all'?'active':''}" onclick="setGrimoireFilter('level','all')">Tutti</button>
        <button class="filter-chip ${f.level==='0'?'active':''}" onclick="setGrimoireFilter('level','0')">Trucchetti</button>
        ${[1,2,3,4,5,6,7,8,9].map(l=>`<button class="filter-chip ${f.level===String(l)?'active':''}" onclick="setGrimoireFilter('level','${l}')">${l}°</button>`).join('')}
      </div>
      <div class="filter-bar">
        <button class="filter-chip ${f.clas==='all'?'active':''}" onclick="setGrimoireFilter('clas','all')">Tutte le classi</button>
        ${GRIMOIRE_CLASSES.map(en=>`<button class="filter-chip ${f.clas===en?'active':''}" onclick="setGrimoireFilter('clas','${en}')">${CLASSES_IT[en]||en}</button>`).join('')}
      </div>
      <div id="grimoire-results">${grimoireResultsHTML()}</div>
      ${!picking ? `<button class="btn btn-primary btn-block" style="margin-top:14px;" onclick="openCustomSpellForm()">+ Incantesimo personalizzato</button>` : ''}
    </div>
  `;
}
function grimoireResultsHTML(){
  const f = state.grimoireFilter;
  const picking = state.grimoireMode === 'pick';
  const pickChar = picking ? state.characters.find(c=>c.id===state.grimoirePickFor) : null;
  let all = state.customSpells.map(s=>({...s, source:'custom'})).concat(SRD_SPELLS.map(s=>({...s, source:'srd'})));
  if (f.q) {
    const q = f.q.toLowerCase();
    all = all.filter(s => {
      const school = (schoolIt(s.school||'')).toLowerCase();
      return s.name.toLowerCase().includes(q) || school.includes(q);
    });
  }
  if (f.level !== 'all') all = all.filter(s => String(s.level) === f.level);
  if (f.clas !== 'all') all = all.filter(s => (s.classes||[]).includes(f.clas));
  const countLine = `<div class="muted" style="margin:2px 0 10px;">${all.length} incantesim${all.length===1?'o':'i'}</div>`;
  if (!all.length) return countLine + emptyState('🔍','Nessun incantesimo trovato con questi filtri.');
  const CAP = 350; // sopra il massimo teorico (319 SRD + personalizzati): il tetto è solo una rete di sicurezza, non un limite attivo
  const capped = all.slice(0,CAP);
  const capNote = all.length>CAP ? `<div class="muted" style="text-align:center;padding:14px;">Primi ${CAP} risultati — affina la ricerca per trovarne altri.</div>` : '';
  return countLine + capped.map(s=>grimoireItemHTML(s, picking, pickChar)).join('') + capNote;
}
function grimoireItemHTML(s, picking, pickChar){
  const already = picking && pickChar && (pickChar.knownSpells||[]).some(k=>k.id===s.id && k.source===s.source);
  const classesIt = (s.classes||[]).map(en=>CLASSES_IT[en]||en).join(', ');
  const action = picking ? `addKnownSpellFromGrimoire('${s.id}','${s.source}')` : `viewSpellDetail('${s.id}','${s.source}')`;
  return `<div class="spell-item" onclick="${action}">
    <div class="spell-lvl-badge">${s.level===0?'C':s.level}</div>
    <div class="spell-item-body">
      <div class="spell-item-name">${escapeHtml(s.name)}</div>
      <div class="spell-item-meta">${escapeHtml(schoolIt(s.school||''))}${classesIt?(' · '+escapeHtml(classesIt)):''}${s.source==='custom'?' · personalizzato':''}</div>
    </div>
    ${picking ? `<div class="spell-item-add ${already?'added':''}">${already?'✓':'+'}</div>` : `<div class="char-card-chevron">›</div>`}
  </div>`;
}
const setGrimoireSearch = debounce((val) => {
  state.grimoireFilter.q = val;
  const el = document.getElementById('grimoire-results');
  if (el) el.innerHTML = grimoireResultsHTML();
}, 150);
function setGrimoireFilter(key, val){ state.grimoireFilter[key] = val; render(); }
function cancelPickSpell(){
  const charId = state.grimoirePickFor;
  state.grimoireMode = 'browse'; state.grimoirePickFor = null;
  state.view = 'sheet'; state.activeCharId = charId; state.sheetTab = 'spells';
  render(); window.scrollTo({top:0});
}
function addKnownSpellFromGrimoire(spellId, source){ addKnownSpell(state.grimoirePickFor, spellId, source); }

function viewSpellDetail(id, source){
  const sp = source==='custom' ? state.customSpells.find(s=>s.id===id) : SRD_SPELLS.find(s=>s.id===id);
  if (!sp) return;
  openModal({ render: () => spellDetailHTML(sp, source) });
}
function spellDetailHTML(sp, source){
  const classesIt = (sp.classes||[]).map(en=>CLASSES_IT[en]||en);
  const descParas = (sp.desc||'').split(/\n+/).filter(Boolean);
  return `
  <div class="overlay" onclick="if(event.target===this) closeModal()">
    <div class="sheet-modal">
      <div class="sheet-modal-handle"></div>
      <div class="spell-detail-head">
        <div class="spell-detail-name">${escapeHtml(sp.name)}</div>
        <div class="muted" style="font-style:italic;">${sp.level===0?'Trucchetto':(sp.level+'° livello')} · ${escapeHtml(schoolIt(sp.school||''))}${sp.ritual?' (rituale)':''}</div>
      </div>
      <div class="spell-detail-tags">
        ${sp.conc?'<span class="badge garnet">Concentrazione</span>':''}
        ${classesIt.map(c=>`<span class="badge">${escapeHtml(c)}</span>`).join('')}
        ${source==='custom'?'<span class="badge gold">Personalizzato</span>':''}
      </div>
      <div class="spell-detail-grid">
        <div><b>Tempo di lancio</b><span>${escapeHtml(sp.cast||'—')}</span></div>
        <div><b>Gittata</b><span>${escapeHtml(sp.range||'—')}</span></div>
        <div><b>Componenti</b><span>${escapeHtml(sp.comp||'—')}${sp.mat?(' — '+escapeHtml(sp.mat)):''}</span></div>
        <div><b>Durata</b><span>${escapeHtml(sp.dur||'—')}</span></div>
      </div>
      <div class="spell-detail-desc">${descParas.map(p=>`<p>${escapeHtml(p)}</p>`).join('')}</div>
      ${sp.higher?`<div class="spell-detail-desc"><b>Ai livelli superiori. </b>${escapeHtml(sp.higher)}</div>`:''}
      ${source==='srd' ? `<div class="spell-source-note">Testo del System Reference Document 5.1 di Wizards of the Coast, su licenza Open Gaming License 1.0a — lingua originale inglese.</div>` : ''}
      <div style="display:flex; gap:10px; margin-top:16px;">
        ${source==='custom' ? `<button class="btn btn-danger" style="flex:1;" onclick="closeModal(); confirmDeleteCustomSpell('${sp.id}')">Elimina</button>` : ''}
        <button class="btn btn-ghost" style="flex:1;" onclick="closeModal()">Chiudi</button>
      </div>
    </div>
  </div>`;
}

let draftSpell = null;
function openCustomSpellForm(){
  draftSpell = { id: uid(), name:'', level:0, school:'', cast:'1 azione', range:'', comp:'V, S', mat:'', dur:'', conc:false, ritual:false, classes:[], desc:'', higher:'' };
  openModal({ render: () => customSpellFormHTML() });
}
function toggleDraftSpellClass(en){
  draftSpell.classes = draftSpell.classes || [];
  const i = draftSpell.classes.indexOf(en);
  if (i>=0) draftSpell.classes.splice(i,1); else draftSpell.classes.push(en);
  renderModalRoot();
}
function customSpellFormHTML(){
  const d = draftSpell;
  return `
  <div class="overlay" onclick="if(event.target===this) closeModal()">
    <div class="sheet-modal">
      <div class="sheet-modal-handle"></div>
      <div class="sheet-modal-head"><div class="sheet-modal-title">Incantesimo personalizzato</div><button class="btn-icon" onclick="closeModal()">✕</button></div>
      <div class="field"><label>Nome</label><input value="${escapeHtml(d.name)}" oninput="draftSpell.name=this.value"></div>
      <div class="form-row">
        <div class="field"><label>Livello</label>
          <select oninput="draftSpell.level=parseInt(this.value)">
            <option value="0" ${d.level===0?'selected':''}>Trucchetto</option>
            ${[1,2,3,4,5,6,7,8,9].map(l=>`<option value="${l}" ${d.level===l?'selected':''}>${l}°</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Scuola</label>
          <select oninput="draftSpell.school=this.value">
            <option value="">—</option>
            ${Object.values(SCHOOLS_IT).map(s=>`<option value="${s}" ${d.school===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="field"><label>Tempo di lancio</label><input value="${escapeHtml(d.cast)}" oninput="draftSpell.cast=this.value"></div>
        <div class="field"><label>Gittata</label><input value="${escapeHtml(d.range)}" placeholder="Es. 18 metri" oninput="draftSpell.range=this.value"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Componenti</label><input value="${escapeHtml(d.comp)}" placeholder="Es. V, S, M" oninput="draftSpell.comp=this.value"></div>
        <div class="field"><label>Durata</label><input value="${escapeHtml(d.dur)}" placeholder="Es. Istantanea" oninput="draftSpell.dur=this.value"></div>
      </div>
      <div class="field"><label>Descrizione</label><textarea style="min-height:120px;" oninput="draftSpell.desc=this.value">${escapeHtml(d.desc)}</textarea></div>
      <div class="field">
        <label>Classi</label>
        <div class="chip-row">
          ${['Bard','Cleric','Druid','Paladin','Ranger','Sorcerer','Warlock','Wizard'].map(en=>`<button class="chip ${(d.classes||[]).includes(en)?'active':''}" onclick="toggleDraftSpellClass('${en}')">${CLASSES_IT[en]}</button>`).join('')}
        </div>
      </div>
      <div class="chip-row" style="margin-bottom:14px;">
        <button class="chip ${d.conc?'active':''}" onclick="draftSpell.conc=!draftSpell.conc; renderModalRoot()">Concentrazione</button>
        <button class="chip ${d.ritual?'active':''}" onclick="draftSpell.ritual=!draftSpell.ritual; renderModalRoot()">Rituale</button>
      </div>
      <button class="btn btn-primary btn-block" onclick="saveCustomSpell()">Salva incantesimo</button>
    </div>
  </div>`;
}
function saveCustomSpell(){
  if (!draftSpell.name.trim()){ toast('Dai un nome all\'incantesimo'); return; }
  state.customSpells.push(draftSpell);
  fsSet('customSpells', draftSpell);
  saveLocal();
  closeModal(); render();
  toast('📜 Incantesimo salvato');
}
function confirmDeleteCustomSpell(id){
  confirmDialog('Eliminare questo incantesimo?', 'Verrà rimosso anche dai personaggi che lo conoscono.', () => {
    state.customSpells = state.customSpells.filter(s=>s.id!==id);
    fsDelete('customSpells', id);
    state.characters.forEach(c=>{
      const before = (c.knownSpells||[]).length;
      c.knownSpells = (c.knownSpells||[]).filter(k=>!(k.id===id && k.source==='custom'));
      if (c.knownSpells.length !== before) fsSet('characters', c);
    });
    saveLocal(); render();
    toast('Incantesimo eliminato');
  });
}

/* ─── 18. TAVOLO DEL MASTER — bestiario + iniziativa ─── */
function newNPC(){ return { id: uid(), name:'', type:'', avatar:'🐉', ac:10, hpMax:10, hpCurrent:null, speed:9, notes:'', createdAt: Date.now() }; }

function renderDM(){
  return `
    <div class="screen">
      <div class="brand-row"><div class="topbar-title brand">Tavolo del Master</div>${themeToggleBtn()}</div>
      <div class="segmented" style="margin-bottom:14px;">
        <button class="${state.dmTab!=='initiative'?'active':''}" onclick="setDmTab('bestiario')">Bestiario</button>
        <button class="${state.dmTab==='initiative'?'active':''}" onclick="setDmTab('initiative')">Iniziativa</button>
      </div>
      ${state.dmTab==='initiative' ? renderInitiativeTracker() : renderBestiary()}
    </div>
  `;
}
function setDmTab(tab){ state.dmTab = tab; render(); }

function renderBestiary(){
  const npcs = state.npcs;
  return `
    ${npcs.length ? `<div class="stagger list-gap">${npcs.map(npcCardHTML).join('')}</div>` : emptyState('🐉','Nessun PNG o mostro ancora. Aggiungi qui nemici e alleati per le tue sessioni.')}
    <button class="btn btn-primary btn-block" style="margin-top:14px;" onclick="openNpcForm()">+ Nuovo PNG / Mostro</button>
  `;
}
function npcCardHTML(n){
  return `<div class="npc-card card" onclick="openNpcForm('${n.id}')" style="cursor:pointer;">
    <div class="seal">${n.avatar||'🐉'}</div>
    <div class="char-card-body">
      <div class="char-card-name">${escapeHtml(n.name||'Senza nome')}</div>
      <div class="char-card-sub">${n.type?escapeHtml(n.type)+' · ':''}CA ${n.ac??10} · PF ${n.hpCurrent??n.hpMax??0}/${n.hpMax??0}</div>
    </div>
    <div class="char-card-chevron">›</div>
  </div>`;
}
let draftNpc = null;
function openNpcForm(existingId){
  const n = existingId ? state.npcs.find(x=>x.id===existingId) : null;
  draftNpc = n ? JSON.parse(JSON.stringify(n)) : newNPC();
  openModal({ render: () => npcFormHTML(!!n) });
}
function npcFormHTML(isEdit){
  const d = draftNpc;
  return `
  <div class="overlay" onclick="if(event.target===this) closeModal()">
    <div class="sheet-modal">
      <div class="sheet-modal-handle"></div>
      <div class="sheet-modal-head"><div class="sheet-modal-title">${isEdit?'Modifica':'Nuovo'} PNG / Mostro</div><button class="btn-icon" onclick="closeModal()">✕</button></div>
      <div class="field"><label>Nome</label><input value="${escapeHtml(d.name)}" placeholder="Es. Capo Goblin" oninput="draftNpc.name=this.value"></div>
      <div class="form-row">
        <div class="field"><label>Tipo / GS</label><input value="${escapeHtml(d.type)}" placeholder="Es. Umanoide, GS 1" oninput="draftNpc.type=this.value"></div>
        <div class="field"><label>Simbolo</label>
          <select oninput="draftNpc.avatar=this.value">
            ${AVATAR_GLYPHS.map(g=>`<option value="${g}" ${d.avatar===g?'selected':''}>${g}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row-3">
        <div class="field"><label>CA</label><input type="number" value="${d.ac??10}" oninput="draftNpc.ac=parseInt(this.value)||0"></div>
        <div class="field"><label>PF Max</label><input type="number" value="${d.hpMax??10}" oninput="draftNpc.hpMax=parseInt(this.value)||0"></div>
        <div class="field"><label>Velocità</label><input type="number" value="${d.speed??9}" oninput="draftNpc.speed=parseInt(this.value)||0"></div>
      </div>
      ${isEdit ? `<div class="field"><label>PF Attuali</label><input type="number" value="${d.hpCurrent??d.hpMax??10}" oninput="draftNpc.hpCurrent=parseInt(this.value)||0"></div>` : ''}
      <div class="field"><label>Azioni / Note</label><textarea style="min-height:100px;" placeholder="Attacchi, abilità speciali, tattiche…" oninput="draftNpc.notes=this.value">${escapeHtml(d.notes)}</textarea></div>
      <button class="btn btn-primary btn-block" onclick="saveNpcDraft()">${isEdit?'Salva modifiche':'Aggiungi al bestiario'}</button>
      ${isEdit?`<button class="btn btn-gold btn-block" style="margin-top:8px;" onclick="addNpcToInitiative('${d.id}')">⚔️ Aggiungi all'iniziativa</button>`:''}
      ${isEdit?`<button class="btn btn-danger btn-block" style="margin-top:8px;" onclick="closeModal(); confirmDeleteNpc('${d.id}')">Elimina</button>`:''}
    </div>
  </div>`;
}
function saveNpcDraft(){
  if (!draftNpc.name.trim()){ toast('Dai un nome al PNG'); return; }
  draftNpc.hpCurrent = draftNpc.hpCurrent ?? draftNpc.hpMax;
  const idx = state.npcs.findIndex(n=>n.id===draftNpc.id);
  if (idx>=0) state.npcs[idx]=draftNpc; else state.npcs.push(draftNpc);
  if (!currentUser) state.offlineMode = true;
  fsSet('npcs', draftNpc);
  saveLocal();
  closeModal(); render();
}
function addNpcToInitiative(npcId){
  closeModal();
  state.dmTab = 'initiative';
  addToCombat(npcId, 'npc');
}
function confirmDeleteNpc(id){
  const n = state.npcs.find(x=>x.id===id);
  confirmDialog('Eliminare ' + (n?n.name:'questo PNG') + '?', 'Questa azione non può essere annullata.', () => {
    state.npcs = state.npcs.filter(x=>x.id!==id);
    if (currentUser) fsDelete('npcs', id);
    saveLocal(); render();
  });
}

/* ─── Tracciatore Iniziativa (sessione locale) ─── */
function renderInitiativeTracker(){
  const combat = state.combat;
  const list = combat.list;
  return `
    ${list.length ? `
      <div class="row-between" style="margin-bottom:10px;">
        <div class="section-title" style="margin:0;">Round ${combat.round}</div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-sm btn-gold" onclick="nextTurn()">Turno succ. →</button>
          <button class="btn btn-sm btn-danger" onclick="confirmResetCombat()">Fine</button>
        </div>
      </div>
      ${list.map((cb,i)=>initRowHTML(cb,i,i===combat.turn)).join('')}
    ` : emptyState('⚔️','Nessun combattimento attivo. Aggiungi combattenti qui sotto per iniziare.')}

    <div class="divider"><span class="flourish">❧</span><span>Aggiungi Combattente</span></div>
    <div class="card">
      ${(state.characters.length||state.npcs.length) ? `<div class="chip-row" style="margin-bottom:12px;">
        ${state.characters.map(c=>`<button class="chip" onclick="addToCombat('${c.id}','pc')">${c.avatar||'⚔️'} ${escapeHtml(c.name)}</button>`).join('')}
        ${state.npcs.map(n=>`<button class="chip" onclick="addToCombat('${n.id}','npc')">${n.avatar||'🐉'} ${escapeHtml(n.name)}</button>`).join('')}
      </div>` : ''}
      <div style="display:flex; gap:8px;">
        <input id="quick-combatant-name" placeholder="Nome combattente rapido" style="flex:1; padding:11px 13px; border-radius:10px; border:1.5px solid var(--card-border); background:var(--card); font-family:'Lora',serif;">
        <button class="btn btn-gold" onclick="addQuickCombatant()">+ Aggiungi</button>
      </div>
    </div>
  `;
}
function initRowHTML(cb, i, isCurrent){
  return `<div class="init-row ${isCurrent?'current-turn':''}">
    <div class="init-badge">${cb.init}</div>
    <div style="flex:1; min-width:0;">
      <div class="init-name">${cb.avatar?cb.avatar+' ':''}${escapeHtml(cb.name)}</div>
      <div class="init-hp">${cb.hp!=null ? ('PF ' + cb.hp + (cb.hpMax?('/'+cb.hpMax):'')) : '—'}</div>
    </div>
    <div class="init-actions">
      ${cb.hp!=null ? `<button class="stepper-btn" style="width:32px;height:32px;font-size:.9rem;" onclick="bumpCombatHP(${i},-1)">−</button>
      <button class="stepper-btn" style="width:32px;height:32px;font-size:.9rem;" onclick="bumpCombatHP(${i},1)">+</button>` : ''}
      <button class="btn-icon" style="width:32px;height:32px;font-size:.75rem;" onclick="removeFromCombat(${i})">✕</button>
    </div>
  </div>`;
}
function uniqueCombatName(base){
  const count = state.combat.list.filter(c => c.name === base || (c.name||'').startsWith(base + ' #')).length;
  if (count === 0) return base;
  if (count === 1) {
    const first = state.combat.list.find(c => c.name === base);
    if (first) first.name = base + ' #1';
  }
  return base + ' #' + (count + 1);
}
function addToCombat(refId, kind){
  const src = kind==='pc' ? state.characters.find(c=>c.id===refId) : state.npcs.find(n=>n.id===refId);
  if (!src) return;
  const dexMod = kind==='pc' ? mod(getPath(src,'abilities.dex',10)) : 0;
  const init = rollDie(20) + (kind==='pc' ? (src.initiative ?? dexMod) : dexMod);
  state.combat.list.push({
    refId, kind, name: uniqueCombatName(src.name), avatar: src.avatar, init,
    hp: kind==='pc' ? getPath(src,'hp.current',0) : (src.hpCurrent ?? src.hpMax ?? 0),
    hpMax: kind==='pc' ? getPath(src,'hp.max',0) : (src.hpMax ?? 0),
  });
  sortCombat(); render();
}
function addQuickCombatant(){
  const el = document.getElementById('quick-combatant-name');
  const name = el.value.trim();
  if (!name) { toast('Dai un nome al combattente'); return; }
  state.combat.list.push({ refId:null, kind:'quick', name: uniqueCombatName(name), avatar:'❔', init: rollDie(20), hp:null, hpMax:null });
  sortCombat(); render();
}
function sortCombat(){ state.combat.list.sort((a,b)=>b.init-a.init); }
function bumpCombatHP(i, delta){
  const cb = state.combat.list[i]; if (!cb || cb.hp==null) return;
  cb.hp = clamp(cb.hp+delta, 0, cb.hpMax || 9999);
  render();
}
function removeFromCombat(i){
  state.combat.list.splice(i,1);
  if (state.combat.turn >= state.combat.list.length) state.combat.turn = 0;
  render();
}
function nextTurn(){
  state.combat.turn++;
  if (state.combat.turn >= state.combat.list.length) { state.combat.turn = 0; state.combat.round++; }
  render();
}
function confirmResetCombat(){
  confirmDialog('Terminare il combattimento?', 'La lista dei combattenti verrà svuotata.', () => {
    state.combat = { list: [], round: 1, turn: 0 };
    render();
  });
}

/* ─── 19. IMPOSTAZIONI ─── */
function renderSettings(){
  return `
    <div class="screen">
      <div class="brand-row"><div class="topbar-title brand">Opzioni</div></div>

      <div class="card" style="display:flex; align-items:center; gap:12px;">
        <div class="seal" style="width:46px;height:46px;font-size:1.2rem;">👤</div>
        <div style="flex:1; min-width:0; overflow:hidden;">
          <div style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(currentUser?currentUser.displayName||'':'')}</div>
          <div class="muted" style="font-size:.78rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(currentUser?currentUser.email||'':'')}</div>
        </div>
      </div>
      <button class="btn btn-danger btn-block" style="margin-top:10px;" onclick="confirmSignOut()">Esci dall'account</button>

      <div class="divider"><span class="flourish">❧</span><span>Aspetto</span></div>
      <button class="theme-switch" style="width:100%;" onclick="toggleTheme()">
        <div class="track"><div class="knob"></div></div>
        <div style="flex:1; text-align:left; font-weight:700;">Tema ${state.theme==='dark'?'Notturno 🌙':'Diurno ☀️'}</div>
      </button>

      <div class="divider"><span class="flourish">❧</span><span>Informazioni</span></div>
      <div class="card muted" style="font-size:.82rem; line-height:1.7;">
        Personaggi: ${state.characters.length} · Bestiario: ${state.npcs.length} · Incantesimi personalizzati: ${state.customSpells.length}<br><br>
        I dati sono legati al tuo account Google e sincronizzati automaticamente su Firebase tra tutti i dispositivi collegati. Gli incantesimi base vengono dal System Reference Document 5.1 di Wizards of the Coast (licenza Open Gaming License 1.0a).
      </div>
    </div>
  `;
}
function confirmSignOut(){
  confirmDialog('Uscire dall\'account?', 'Potrai accedere di nuovo in qualsiasi momento con lo stesso account Google.', () => signOutUser());
}

/* ─── 20. TIRA DADI (accessibile ovunque) ─── */
function openDiceRoller(){
  state.diceHistory = state.diceHistory || [];
  openModal({ render: () => diceRollerHTML() });
}
function diceRollerHTML(){
  const hist = state.diceHistory || [];
  return `
  <div class="overlay" onclick="if(event.target===this) closeModal()">
    <div class="sheet-modal" style="max-height:82vh;">
      <div class="sheet-modal-handle"></div>
      <div class="sheet-modal-head"><div class="sheet-modal-title">🎲 Tira i Dadi</div><button class="btn-icon" onclick="closeModal()">✕</button></div>
      <div class="chip-row" style="margin-bottom:16px;">
        ${DICE_TYPES.map(d=>`<button class="chip" style="font-size:.85rem;padding:10px 16px;" onclick="doRoll(1,${d},0)">d${d}</button>`).join('')}
      </div>
      <div class="form-row">
        <div class="field"><label>N. dadi</label><input id="dice-count" type="number" min="1" value="1"></div>
        <div class="field"><label>Facce</label><input id="dice-sides" type="number" min="2" value="20"></div>
        <div class="field"><label>Modif.</label><input id="dice-mod" type="number" value="0"></div>
      </div>
      <button class="btn btn-primary btn-block" onclick="doRollCustom()">Tira</button>
      ${hist.length ? `
        <div class="divider"><span class="flourish">❧</span><span>Cronologia</span></div>
        <div class="list-gap">${hist.slice(0,8).map(h=>`<div class="card" style="padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
          <span class="muted" style="font-size:.8rem;">${escapeHtml(h.label)}</span>
          <span style="font-family:'Cinzel',serif; font-weight:700; font-size:1.25rem; color:var(--garnet);">${h.total}</span>
        </div>`).join('')}</div>
      ` : ''}
    </div>
  </div>`;
}
function doRoll(count, sides, bonus){
  const rolls = Array.from({length:count}, ()=>rollDie(sides));
  const total = rolls.reduce((a,b)=>a+b,0) + bonus;
  state.diceHistory = state.diceHistory || [];
  state.diceHistory.unshift({ label: `${count}d${sides}${bonus?signStr(bonus):''} → [${rolls.join(', ')}]`, total });
  renderModalRoot();
}
function doRollCustom(){
  const count = clamp(parseInt(document.getElementById('dice-count').value)||1, 1, 100);
  const sides = clamp(parseInt(document.getElementById('dice-sides').value)||20, 2, 1000);
  const bonus = parseInt(document.getElementById('dice-mod').value)||0;
  doRoll(count, sides, bonus);
}

/* ─── 21. SERVICE WORKER + AVVIO ─── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('Service worker non registrato:', err));
  });
}

loadLocal();
render();
