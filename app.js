/* ══════════════════════════════════════════════════════════════
   GRIMORIO — app.js  ·  v3.2
   Compagno per D&D: party, incantesimi, inventario, background,
   tiri di dado e strumenti da master. Dati sincronizzati su Firebase
   con cache locale (l'app funziona anche completamente offline).
   ══════════════════════════════════════════════════════════════ */

const APP_VERSION = '7.3';

/* ─── 1. CONFIGURAZIONE FIREBASE ─────────────────────────────── */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAAcGjbm9NgQNo6wWLX8CErCmCUh7WTQsQ",
  authDomain: "twentynation-1abd4.firebaseapp.com",
  projectId: "twentynation-1abd4",
  storageBucket: "twentynation-1abd4.firebasestorage.app",
  messagingSenderId: "305259728353",
  appId: "1:305259728353:web:ad9cc0d2737f4be889d6a0"
};

let db = null, auth = null, currentUser = null, firebaseReady = false;

// L'inizializzazione non deve MAI bloccare l'avvio: se gli script Firebase
// non si caricano (offline, rete bloccata, blocco tracker) l'app parte lo stesso
// in modalità locale invece di restare sul caricamento all'infinito.
function initFirebase(){
  if (typeof firebase === 'undefined' || !firebase.initializeApp) return false;
  try { firebase.initializeApp(FIREBASE_CONFIG); }
  catch(e){ if (e.code !== 'app/duplicate-app'){ console.error('Firebase init error:', e); return false; } }
  try { db = firebase.firestore(); auth = firebase.auth(); }
  catch(e){ console.error('Firebase services error:', e); return false; }
  return true;
}

/* ─── 2. DATI DI REGOLE ───────────────────────────────────────
   Nomi di caratteristiche/abilità e tabelle numeriche: regole generiche
   di sistema. Gli incantesimi (nomi + testo) sono in spells-data.js,
   contenuto SRD 5.1 su licenza OGL 1.0a (lingua originale inglese).
*/
const ABILITIES = [
  { key: "str", label: "Forza", abbr: "FOR" },
  { key: "dex", label: "Destrezza", abbr: "DES" },
  { key: "con", label: "Costituzione", abbr: "COS" },
  { key: "int", label: "Intelligenza", abbr: "INT" },
  { key: "wis", label: "Saggezza", abbr: "SAG" },
  { key: "cha", label: "Carisma", abbr: "CAR" },
];
const ABILITY_BY_KEY = Object.fromEntries(ABILITIES.map(a=>[a.key,a]));

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
const CLASS_TO_HIT_DIE = {
  "Barbaro": 12, "Guerriero": 10, "Paladino": 10, "Ranger": 10,
  "Bardo": 8, "Chierico": 8, "Druido": 8, "Monaco": 8, "Ladro": 8, "Warlock": 8, "Artificiere": 8,
  "Mago": 6, "Stregone": 6
};
const CLASS_TO_SAVES = {
  "Barbaro": ["str","con"], "Bardo": ["dex","cha"], "Chierico": ["wis","cha"], "Druido": ["int","wis"],
  "Guerriero": ["str","con"], "Monaco": ["str","dex"], "Paladino": ["wis","cha"], "Ranger": ["str","dex"],
  "Ladro": ["dex","int"], "Stregone": ["con","cha"], "Warlock": ["wis","cha"], "Mago": ["int","wis"],
  "Artificiere": ["con","int"]
};

/* Nomi italiani delle scuole. Attenzione ai due che si scambiano:
   Conjuration è «Evocazione» ed Evocation è «Invocazione». Prima questo
   elenco diceva «Convocazione»/«Evocazione» mentre il lettore dei PDF
   usava quelli giusti: gli stessi incantesimi finivano in due scuole
   diverse a seconda di come erano entrati. */
const SCHOOLS_IT = {
  "Abjuration": "Abiurazione", "Conjuration": "Evocazione", "Divination": "Divinazione",
  "Enchantment": "Ammaliamento", "Evocation": "Invocazione", "Illusion": "Illusione",
  "Necromancy": "Necromanzia", "Transmutation": "Trasmutazione"
};
/* Diciture vecchie o alternative che devono continuare a essere capite. */
const SCHOOLS_ALIAS = { "convocazione":"Evocazione", "conjuration":"Evocazione", "evocation":"Invocazione" };
function schoolIt(en){ return SCHOOLS_IT[en] || en || ''; }

/* Nomi in italiano (da spells-it.js). Il testo delle descrizioni resta
   in inglese: è quello ufficiale su licenza OGL. */
const HAS_SPELLS_IT = (typeof SPELLS_IT !== 'undefined');
function spellItName(sp){ return (sp && sp.id && HAS_SPELLS_IT && SPELLS_IT[sp.id]) || ''; }
function spellName(sp){
  if (!sp) return '';
  if (state.spellLang === 'en') return sp.name || '';
  return spellItName(sp) || sp.name || '';
}
// Il nome nell'altra lingua, quando è diverso (mostrato in piccolo).
function spellAltName(sp){
  const it = spellItName(sp);
  if (!it || !sp.name) return '';
  return state.spellLang === 'en' ? it : sp.name;
}
function toggleSpellLang(){
  state.spellLang = state.spellLang === 'en' ? 'it' : 'en';
  localStorage.setItem('grimorio-spell-lang', state.spellLang);
  render();
}
// Classi di un incantesimo, tenendo conto delle tue modifiche
// (es. marcare un incantesimo SRD come "Artificiere").
function spellClasses(sp){
  if (!sp) return [];
  if ((sp.source || 'srd') === 'srd'){
    const o = state.spellTags.find(t => t.id === sp.id);
    if (o && Array.isArray(o.classes)) return o.classes;
  }
  return sp.classes || [];
}
function isSpellTagged(sp){ return (sp.source||'srd')==='srd' && state.spellTags.some(t=>t.id===sp.id); }
function setSpellClasses(spellId, classes, baseClasses){
  const same = classes.length === (baseClasses||[]).length && classes.every(c=>(baseClasses||[]).includes(c));
  const idx = state.spellTags.findIndex(t=>t.id===spellId);
  if (same){
    if (idx>=0){ state.spellTags.splice(idx,1); fsDelete('spellTags', spellId); saveLocal(); }
    return;
  }
  const obj = { id: spellId, classes: classes.slice() };
  if (idx>=0) state.spellTags[idx] = obj; else state.spellTags.push(obj);
  fsSet('spellTags', obj);
}

const CASTER_TYPES = [
  { key: "none", label: "Nessuno" },
  { key: "full", label: "Pieno" },
  { key: "half", label: "Metà" },
  { key: "third", label: "Un terzo" },
  { key: "pact", label: "Warlock (Patto)" },
];

// Tabelle progressione slot incantesimo (SRD, per livello personaggio)
const SLOTS_FULL = {1:[2],2:[3],3:[4,2],4:[4,3],5:[4,3,2],6:[4,3,3],7:[4,3,3,1],8:[4,3,3,2],9:[4,3,3,3,1],10:[4,3,3,3,2],11:[4,3,3,3,2,1],12:[4,3,3,3,2,1],13:[4,3,3,3,2,1,1],14:[4,3,3,3,2,1,1],15:[4,3,3,3,2,1,1,1],16:[4,3,3,3,2,1,1,1],17:[4,3,3,3,2,1,1,1,1],18:[4,3,3,3,3,1,1,1,1],19:[4,3,3,3,3,2,1,1,1],20:[4,3,3,3,3,2,2,1,1]};
const SLOTS_HALF = {1:[],2:[2],3:[3],4:[3],5:[4,2],6:[4,2],7:[4,3],8:[4,3],9:[4,3,2],10:[4,3,2],11:[4,3,3],12:[4,3,3],13:[4,3,3,1],14:[4,3,3,1],15:[4,3,3,2],16:[4,3,3,2],17:[4,3,3,3,1],18:[4,3,3,3,1],19:[4,3,3,3,2],20:[4,3,3,3,2]};
const SLOTS_THIRD = {1:[],2:[],3:[2],4:[3],5:[3],6:[3],7:[4,2],8:[4,2],9:[4,2],10:[4,3],11:[4,3],12:[4,3],13:[4,3,2],14:[4,3,2],15:[4,3,2],16:[4,3,3],17:[4,3,3],18:[4,3,3],19:[4,3,3,1],20:[4,3,3,1]};
const SLOTS_PACT_COUNT = {1:1,2:2,3:2,4:2,5:2,6:2,7:2,8:2,9:2,10:2,11:3,12:3,13:3,14:3,15:3,16:3,17:4,18:4,19:4,20:4};
const SLOTS_PACT_LEVEL = {1:1,2:1,3:2,4:2,5:3,6:3,7:4,8:4,9:5,10:5,11:5,12:5,13:5,14:5,15:5,16:5,17:5,18:5,19:5,20:5};

function slotsForCharacter(casterType, level){
  level = clamp(Number(level)||1, 1, 20);
  if (casterType === 'full') return (SLOTS_FULL[level]||[]).slice();
  if (casterType === 'half') return (SLOTS_HALF[level]||[]).slice();
  if (casterType === 'third') return (SLOTS_THIRD[level]||[]).slice();
  if (casterType === 'pact'){ const arr = []; arr[SLOTS_PACT_LEVEL[level]-1] = SLOTS_PACT_COUNT[level]; return Array.from(arr, x=>x||0); }
  return [];
}
function applyClassDefaults(d, force){
  if (!d || !d.classField) return;
  if (CLASS_TO_CASTER[d.classField] !== undefined) d.casterType = CLASS_TO_CASTER[d.classField];
  if (CLASS_TO_SPELL_ABILITY[d.classField]) d.spellAbility = CLASS_TO_SPELL_ABILITY[d.classField];
  if (CLASS_TO_HIT_DIE[d.classField]) d.hitDie = CLASS_TO_HIT_DIE[d.classField];
  if (force && CLASS_TO_SAVES[d.classField] && !(d.saveProf||[]).length) d.saveProf = CLASS_TO_SAVES[d.classField].slice();
}

/* I background stanno in un posto solo: rules-data.js. Prima ce n'era
   una copia qui e le due liste erano andate per conto loro — mancava
   il Monello e due nomi erano scritti diversamente, così l'import dal
   PDF non li riconosceva. Ora si legge sempre l'elenco vero, e ci
   finiscono dentro anche i background che ti sei scritto tu. */
function backgroundNames(){
  if (typeof allBackgrounds === 'function'){
    try { return allBackgrounds().map(b => b.name); } catch(e){}
  }
  if (typeof BACKGROUNDS_FULL !== 'undefined') return BACKGROUNDS_FULL.map(b => b.name);
  return [];
}
const AVATAR_GLYPHS = ["⚔️","🛡️","🏹","🔮","🐉","🦉","🌙","⚜️","🕯️","🪄","🦇","🌿","👑","💀","🔥","❄️","🗡️","🎻","🐺","⚗️"];
const DICE_TYPES = [4,6,8,10,12,20,100];
const COINS = [
  {key:'pp', label:'MP', title:'Platino'},
  {key:'gp', label:'MO', title:'Oro'},
  {key:'ep', label:'ME', title:'Elettro'},
  {key:'sp', label:'MA', title:'Argento'},
  {key:'cp', label:'MR', title:'Rame'},
];

/* ─── 3. UTILITÀ ─── */
const $ = (sel, ctx) => (ctx||document).querySelector(sel);
const $$ = (sel, ctx) => Array.from((ctx||document).querySelectorAll(sel));
const uid = () => 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n)||0));
const mod = (score) => Math.floor(((Number(score)||10) - 10) / 2);
const modStr = (score) => signStr(mod(score));
const signStr = (n) => { n = Number(n)||0; return (n >= 0 ? '+' : '') + n; };
const profBonus = (level) => Math.ceil(clamp(level,1,20) / 4) + 1;
const escapeHtml = (s) => (s==null?'':String(s)).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attr = (s) => escapeHtml(s).replace(/\n/g,' ');
/* Testo dentro un gestore inline (onclick="fn('…')"): prima gli escape
   JavaScript, poi quelli HTML. Il browser decodifica l'HTML prima di
   eseguire il JS, quindi senza questo un apostrofo nel nome — "Piaga
   d'Insetti", "Soffio dell'Alba" — spezza il codice e il tasto non fa
   niente. */
const jsStr = (s) => escapeHtml(String(s == null ? '' : s)
  .replace(/\\/g, '\\\\')
  .replace(/'/g, "\\'")
  .replace(/\r?\n/g, '\\n'));
function debounce(fn, ms){
  let t;
  const f = (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); };
  // Chi ridisegna tutto deve poter annullare quello che è ancora in coda,
  // altrimenti un valore vecchio arriva dopo e sfasa la schermata.
  f.annulla = () => clearTimeout(t);
  return f;
}

/* Vibrazione: un buffetto sul telefono quando succede qualcosa di grosso.
   Si può spegnere dalle Opzioni, e sui computer non fa nulla. */
function buzz(pattern){
  try {
    if (state.haptics === false) return;
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch(e){}
}

/* Schermo sempre acceso: durante una sessione il telefono non si spegne
   mentre guardi la scheda. Si riattiva da solo se torni sull'app. */
let wakeLock = null;
async function applyWakeLock(){
  try {
    if (state.keepAwake && !wakeLock && navigator.wakeLock){
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!state.keepAwake && wakeLock){
      await wakeLock.release(); wakeLock = null;
    }
  } catch(e){ /* batteria bassa o permesso negato: pazienza */ }
}
function toggleKeepAwake(){
  state.keepAwake = !state.keepAwake;
  localStorage.setItem('grimorio-awake', state.keepAwake ? '1' : '0');
  applyWakeLock(); render();
  toast(state.keepAwake ? '☀️ Lo schermo resta acceso' : '🌙 Lo schermo si spegne come al solito');
}
function toggleHaptics(){
  state.haptics = !state.haptics;
  localStorage.setItem('grimorio-haptics', state.haptics ? '1' : '0');
  render(); if (state.haptics) buzz(30);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') applyWakeLock(); });
function rollDie(sides){
  sides = Math.max(2, Math.floor(sides)||2);
  if (window.crypto && window.crypto.getRandomValues){
    const buf = new Uint32Array(1);
    const limit = Math.floor(4294967296 / sides) * sides;
    let v; do { window.crypto.getRandomValues(buf); v = buf[0]; } while (v >= limit);
    return 1 + (v % sides);
  }
  return 1 + Math.floor(Math.random()*sides);
}
function toast(msg){
  $$('.toast').forEach(t=>t.remove());
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role','status');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2600);
}
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
function formatComponents(comp, mat){
  if (!comp) return '—';
  const letters = String(comp).replace(/[^VSM]/gi,'').toUpperCase().split('');
  const out = letters.length ? letters.join(', ') : String(comp);
  return out + (mat ? ' (' + mat + ')' : '');
}
// confronto "morbido": minuscole, senza accenti e apostrofi
function norm(s){
  return (s==null?'':String(s)).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[’']/g,"'").trim();
}
function levelLabel(l){ return l === 0 ? 'Trucchetto' : l + '° livello'; }
function pluralize(n, one, many){ return n === 1 ? one : many; }
function scrollTop(){ window.scrollTo({top:0, behavior:'auto'}); }

/* ─── Ritratto ───────────────────────────────────────────────────
   Se c'è una foto la si mostra dentro il sigillo, altrimenti resta
   il simbolo. L'immagine viene ridotta a 480px sul lato lungo —
   intera, non ritagliata — e salvata insieme al personaggio, quindi
   si sincronizza su tutti i dispositivi. Nella pastiglia tonda la
   ritaglia il CSS; sulla carta grande del party si vede tutta.
*/
function avatarHTML(e, size, extra){
  const s = size || 54;
  const cls = 'seal' + (extra ? ' ' + extra : '');
  if (e && e.portrait){
    return `<span class="${cls} portrait" style="width:${s}px;height:${s}px"><img src="${attr(e.portrait)}" alt=""></span>`;
  }
  return `<span class="${cls}" style="width:${s}px;height:${s}px;font-size:${Math.round(s*0.44)}px">${(e && e.avatar) || '⚔️'}</span>`;
}
/* Il ritratto si conserva intero. Prima veniva ritagliato a quadrato
   dal centro appena caricato: nella pastiglia tonda non si notava, ma
   l'immagine originale era persa per sempre — e chi carica il disegno
   del suo personaggio vuole vederlo tutto, non la sua faccia ritagliata.
   Adesso si riduce e basta, tenendo le proporzioni; a ritagliare, dove
   serve un cerchio, ci pensa il CSS, che non distrugge niente. */
function resizeImageFile(file, max){
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          /* Due tetti, non uno. Il lato lungo tiene l'immagine nitida
             sulla carta grande; l'area totale impedisce che un ritratto
             molto allungato pesi il doppio di uno quadrato — con la
             memoria del telefono già impegnata dal bestiario, un
             ritratto da 90 KB per personaggio si sente. */
          const AREA_MAX = 190000;   // ~440×430, o 355×535 in verticale
          let scala = Math.min(1, max / Math.max(img.width, img.height));
          const area = img.width * img.height * scala * scala;
          if (area > AREA_MAX) scala *= Math.sqrt(AREA_MAX / area);
          const w = Math.max(1, Math.round(img.width * scala));
          const h = Math.max(1, Math.round(img.height * scala));
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          const ctx = cv.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(cv.toDataURL('image/jpeg', 0.8));
        } catch(e){ reject(e); }
      };
      img.onerror = () => reject(new Error('immagine non leggibile'));
      img.src = fr.result;
    };
    fr.onerror = () => reject(new Error('lettura non riuscita'));
    fr.readAsDataURL(file);
  });
}
function choosePortrait(onDone){
  // L'input resta nel documento (nascosto): staccato dal DOM alcuni
  // browser non aprono affatto la finestra di scelta file.
  let input = document.getElementById('portrait-file-input');
  if (!input){
    input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.id = 'portrait-file-input';
    input.style.display = 'none';
    document.body.appendChild(input);
  }
  input.value = '';
  input.onchange = async () => {
    const f = input.files && input.files[0];
    if (!f) return;
    if (f.size > 20*1024*1024){ toast('⚠️ Immagine troppo grande (oltre 20 MB)'); return; }
    try {
      const url = await resizeImageFile(f, 480);
      onDone(url);
    } catch(e){ console.error(e); toast('⚠️ Non sono riuscito a leggere l\'immagine'); }
  };
  input.click();
}
function setDraftPortrait(url){ if (draftChar){ draftChar.portrait = url; renderModalRoot(); } }
function setNpcPortrait(url){ if (draftNpc){ draftNpc.portrait = url; renderModalRoot(); } }
function setCharPortrait(charId, url){
  const c = charById(charId); if (!c) return;
  c.portrait = url;
  scheduleSave('characters', c); render();
  toast(url ? '📷 Ritratto aggiornato' : 'Ritratto rimosso');
}

/* ─── 4. STATO GLOBALE ─── */
const state = {
  view: 'party',
  theme: localStorage.getItem('grimorio-theme') || 'dark',
  characters: [], npcs: [], customSpells: [], spellTags: [], homebrew: [], journal: [],
  campaign: null, sharedSpells: [], sharedHomebrew: [],
  spellLang: localStorage.getItem('grimorio-spell-lang') || 'it',
  haptics: localStorage.getItem('grimorio-haptics') !== '0',
  keepAwake: localStorage.getItem('grimorio-awake') === '1',
  search: { open: false, q: '' },
  updateReady: false,
  activeCharId: null,
  sheetTab: 'overview',
  dmTab: 'bestiary',
  grimoireMode: 'browse',
  grimoirePickFor: null,
  grimoireFilter: { q: '', level: 'all', clas: 'all' },
  knownFilter: 'all',
  bestiarioQ: '', bestiarioGs: '', combatCercaQ: '',
  hbQ: '', hbKind: '',
  combat: { list: [], round: 1, turn: 0 },
  diceHistory: [],
  rollMode: 'normal',
  modal: null,
  authReady: false,
  offlineMode: false,
};
document.documentElement.setAttribute('data-theme', state.theme);

/* ─── 5. PERSISTENZA ─── */
const LS_KEY = 'grimorio-data-v1';
/* A quale account appartiene la copia locale. Serve a non mostrare i
   personaggi di uno all'altro quando due persone usano lo stesso
   telefono, e a non caricare la roba di uno nell'account dell'altro. */
const LS_UID = 'grimorio-uid';
const cassettoDi = (uid) => LS_KEY + '--' + uid;
const SS_COMBAT = 'grimorio-combat-v1';
const SS_DICE = 'grimorio-dice-v1';
const __saveTimers = {};
let __saveStatus = 'idle', __saveStatusTimer = null;

function setSaveStatus(status){
  __saveStatus = status;
  updateSaveStatusEl();
  clearTimeout(__saveStatusTimer);
  if (status === 'saved' || status === 'offline'){
    __saveStatusTimer = setTimeout(()=>{ __saveStatus = 'idle'; updateSaveStatusEl(); }, 2200);
  }
}
function updateSaveStatusEl(){
  let el = document.getElementById('save-status');
  // Senza account lo dice già il banner in cima: niente pillola doppia.
  if (__saveStatus === 'idle' || !currentUser){ if (el) el.remove(); return; }
  if (!el){ el = document.createElement('div'); el.id = 'save-status'; document.body.appendChild(el); }
  el.className = 'save-status ' + __saveStatus;
  el.textContent = ({ saving: '⏳ Salvataggio…', saved: '✓ Sincronizzato', offline: '📴 Solo locale' })[__saveStatus] || '';
}

function loadLocal(){
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    state.characters = (data.characters || []).map(safeMigrate).filter(Boolean);
    state.npcs = data.npcs || [];
    bestiarioScorda();
    state.customSpells = data.customSpells || [];
    state.spellTags = data.spellTags || [];
    state.homebrew = data.homebrew || [];
    state.journal = data.journal || [];
  } catch(e){ console.warn('Cache locale non leggibile', e); }
}
/* Salvataggio locale «a raffica». Aggiungendo 3000 mostri il vecchio
   saveLocal veniva chiamato tre volte per creatura e ogni volta
   riscriveva l'intero archivio: novemila serializzazioni da un megabyte,
   con l'app bloccata per minuti. Adesso le chiamate ravvicinate si
   fondono in una sola scrittura, e chi ha bisogno della certezza che sia
   finita usa saveLocalOra(). */
let __salvaLocaleTimer = null;
let __ultimoPesoLocale = 0;

function pacchettoLocale(){
  return JSON.stringify({
    characters: state.characters, npcs: state.npcs,
    customSpells: state.customSpells, spellTags: state.spellTags, homebrew: state.homebrew,
    journal: state.journal
  });
}
/* Scrive davvero, subito. Torna false se la memoria del telefono è piena:
   chi sta aggiungendo tanta roba insieme se ne accorge e torna indietro
   invece di lasciare in giro mezza importazione. */
function saveLocalOra(){
  clearTimeout(__salvaLocaleTimer); __salvaLocaleTimer = null;
  try {
    const testo = pacchettoLocale();
    localStorage.setItem(LS_KEY, testo);
    __ultimoPesoLocale = testo.length;
    return true;
  } catch(e){
    console.warn('Impossibile salvare in locale', e);
    toast('⚠️ Memoria del dispositivo piena: libera spazio');
    return false;
  }
}
/* Il salvataggio resta immediato. Rimandarlo anche solo di qualche
   centesimo sembrava un guadagno, ma apre una crepa: chi cambia account
   legge l'archivio subito dopo aver toccato lo stato, e si porterebbe
   via la versione di prima. Il vero peso non era mai il salvataggio in
   sé, era chiamarlo tremila volte di fila: quello lo risolve fsSetMany,
   che salva una volta per tutto il gruppo. */
function saveLocal(){ return saveLocalOra(); }
/* Quanto pesa adesso l'archivio locale, per la schermata «salute dei dati». */
function pesoArchivioLocale(){
  try { return (localStorage.getItem(LS_KEY) || '').length; }
  catch(e){ return __ultimoPesoLocale; }
}
/* Chiudendo la pagina un salvataggio in attesa andrebbe perso. */
function chiudiInSicurezza(){ if (__salvaLocaleTimer) saveLocalOra(); }
window.addEventListener('pagehide', chiudiInSicurezza);
window.addEventListener('beforeunload', chiudiInSicurezza);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') chiudiInSicurezza(); });
function loadSession(){
  try {
    const c = sessionStorage.getItem(SS_COMBAT);
    if (c){ const parsed = JSON.parse(c); if (parsed && Array.isArray(parsed.list)) state.combat = parsed; }
    const d = sessionStorage.getItem(SS_DICE);
    if (d){ const parsed = JSON.parse(d); if (Array.isArray(parsed)) state.diceHistory = parsed; }
  } catch(e){ console.warn('Sessione non leggibile', e); }
}
function saveSession(){
  try {
    sessionStorage.setItem(SS_COMBAT, JSON.stringify(state.combat));
    sessionStorage.setItem(SS_DICE, JSON.stringify(state.diceHistory.slice(0,30)));
  } catch(e){ /* sessione piena: non è un problema bloccante */ }
}

/* Quello che il server ci ha mostrato l'ultima volta, per collezione.
   Serve a distinguere «cancellato altrove» da «questo aggiornamento non
   me l'ha portato»: si toglie solo ciò che c'ERA e adesso non c'è più. */
const LS_VISTI = 'grimorio-visti';
let __vistiSulServer = {};
function caricaVisti(){
  try {
    const d = JSON.parse(localStorage.getItem(LS_VISTI) || '{}');
    Object.keys(d).forEach(k => { if (Array.isArray(d[k])) __vistiSulServer[k] = new Set(d[k]); });
  } catch(e){ __vistiSulServer = {}; }
}
function salvaVisti(){
  try {
    const d = {};
    Object.keys(__vistiSulServer).forEach(k => { d[k] = [...__vistiSulServer[k]]; });
    localStorage.setItem(LS_VISTI, JSON.stringify(d));
  } catch(e){ /* non è un problema bloccante */ }
}
function dimenticaVisti(){
  __vistiSulServer = {};
  try { localStorage.removeItem(LS_VISTI); } catch(e){}
}
let __frenoAvvisato = false;

/* `completo` dice che lo snapshot arriva davvero dal server (non dalla
   cache locale di Firestore): solo allora l'assenza può voler dire
   «cancellato», e comunque solo se prima l'avevamo visto presente. */
function mergeCollection(localArr, remoteArr, collection, completo){
  const byId = {};
  remoteArr.forEach(r => { byId[r.id] = r; });
  const visti = __vistiSulServer[collection];
  const daTogliere = [];

  (localArr||[]).forEach(l => {
    const pendingKey = collection + ':' + l.id;
    if (__saveTimers[pendingKey]) { byId[l.id] = l; return; }
    const r = byId[l.id];
    if (!r) {
      // Si toglie solo ciò che il server ci aveva già mostrato e adesso non
      // ha più: è stato cancellato da un altro dispositivo. Un aggiornamento
      // che semplicemente non lo contiene non è una prova di niente.
      if (completo && l.syncedAt && visti && visti.has(l.id)){ daTogliere.push(l); return; }
      byId[l.id] = l; return;
    }
    const lt = l.updatedAt || l.createdAt || 0;
    const rt = r.updatedAt || r.createdAt || 0;
    byId[l.id] = lt > rt ? l : r;
  });

  /* Freno di sicurezza: nessun aggiornamento può spazzare via mezza
     collezione. Se lo chiede, non gli si crede e si tiene tutto: un dato
     che riappare è un fastidio, un dato distrutto è un disastro. */
  if (daTogliere.length){
    const totale = (localArr||[]).length;
    const troppi = daTogliere.length >= Math.max(5, Math.ceil(totale * 0.5));
    if (troppi){
      daTogliere.forEach(l => { byId[l.id] = l; });
      console.warn('Aggiornamento sospetto ignorato su ' + collection + ': voleva togliere ' +
                   daTogliere.length + ' voci su ' + totale);
      if (!__frenoAvvisato){
        __frenoAvvisato = true;
        setTimeout(() => toast('🛡️ Ho ignorato un aggiornamento che avrebbe cancellato molte cose'), 800);
      }
    }
  }

  if (completo){
    __vistiSulServer[collection] = new Set(remoteArr.map(r => r.id));
    salvaVisti();
  }
  return Object.values(byId);
}

// Evita che una sincronizzazione in arrivo interrompa una digitazione in corso.
function renderIfSafe(){
  const ae = document.activeElement;
  if (ae && ['INPUT','TEXTAREA','SELECT'].includes(ae.tagName) && document.body.contains(ae)) return;
  if (state.modal) return;
  render();
}

let unsubscribers = [];
function attachFirestore(uidUser){
  detachFirestore();
  const base = db.collection('users').doc(uidUser);
  const primaVolta = {};
  const wire = (name, mapper) => {
    unsubscribers.push(base.collection(name).onSnapshot(snap => {
      const remote = snap.docs.map(d => ({...daNuvola(d.data()), id: d.id}));
      const completo = !(snap.metadata && snap.metadata.fromCache);
      state[name] = mergeCollection(state[name], mapper ? remote.map(mapper) : remote, name, completo);
      if (name === 'npcs') bestiarioScorda();
      saveLocal(); setSaveStatus('saved'); renderIfSafe();
      if (!primaVolta[name]){ primaVolta[name] = true; uploadUnsynced(name, remote); }
    }, err => { console.error('Errore sync ' + name, err); }));
  };
  wire('characters', safeMigrate);
  wire('npcs');
  wire('customSpells');
  wire('spellTags');
  wire('homebrew');
  wire('journal');
}
/* Quello che hai creato mentre non eri collegato (o mentre la rete era
   giù) vive solo su questo dispositivo: al primo collegamento lo
   spediamo. Sale SOLO ciò che non è mai arrivato sul server — cioè
   senza `syncedAt` — altrimenti faremmo resuscitare quello che hai
   cancellato da un altro telefono. */
async function uploadUnsynced(name, remote){
  if (!currentUser || !firebaseReady) return;
  const suServer = {};
  (remote||[]).forEach(r => { suServer[r.id] = r; });
  const orfani = (state[name] || []).filter(x => {
    if (!x || !x.id || x.syncedAt) return false;
    const r = suServer[x.id];
    if (!r) return true;                        // mai arrivato: va caricato
    // c'è già, ma la copia locale è più recente: è una modifica fatta
    // da scollegati e va portata su
    return (x.updatedAt || 0) > (r.updatedAt || 0);
  });
  if (!orfani.length) return;
  setSaveStatus('saving');
  try {
    for (let i = 0; i < orfani.length; i += 400){
      const lotto = orfani.slice(i, i + 400);
      const batch = db.batch();
      const bollo = Date.now();
      lotto.forEach(o => {
        o.updatedAt = o.updatedAt || bollo;
        const payload = perNuvola(JSON.parse(JSON.stringify(o)));
        payload.syncedAt = bollo;
        batch.set(userCol(name).doc(o.id), payload, { merge: true });
      });
      await batch.commit();
      lotto.forEach(o => { o.syncedAt = bollo; }); // marcati solo ora
    }
    saveLocal(); setSaveStatus('saved');
    const n = orfani.length;
    toast('☁️ ' + n + (n === 1 ? ' modifica fatta offline è ora sul tuo account' : ' modifiche fatte offline sono ora sul tuo account'));
  } catch(e){
    console.error('Risalita non riuscita per ' + name, e);
    setSaveStatus('offline'); // restano senza bollo: riproveremo al prossimo collegamento
  }
}
function detachFirestore(){ unsubscribers.forEach(u => { try{ u(); }catch(e){} }); unsubscribers = []; }

function userCol(collection){ return db.collection('users').doc(currentUser.uid).collection(collection); }

/* ─── Confezionamento per Firestore ───
   Firestore NON accetta un array dentro un altro array. I privilegi di
   una sottoclasse sono {3:[["Nome","testo"],…]} e i tratti di una razza
   sono [["Nome","testo"],…]: entrambi array di array. Ogni salvataggio
   delle tue aggiunte veniva quindi rifiutato in silenzio — restavano
   solo sul telefono e non arrivavano né all'account né al tavolo.
   Qui l'array interno viaggia dentro un oggetto, e torna com'era. */
function perNuvola(v){
  if (Array.isArray(v)) return v.map(x => Array.isArray(x) ? { __a: perNuvola(x) } : perNuvola(x));
  if (v && typeof v === 'object'){
    const o = {}; Object.keys(v).forEach(k => { o[k] = perNuvola(v[k]); }); return o;
  }
  return v;
}
function daNuvola(v){
  if (Array.isArray(v)) return v.map(x =>
    (x && typeof x === 'object' && Array.isArray(x.__a)) ? daNuvola(x.__a) : daNuvola(x));
  if (v && typeof v === 'object'){
    const o = {}; Object.keys(v).forEach(k => { o[k] = daNuvola(v[k]); }); return o;
  }
  return v;
}
/* Usata dalle prove: dice se è rimasto un array dentro un array. */
function haArrayAnnidati(v){
  if (Array.isArray(v)) return v.some(x => Array.isArray(x) || haArrayAnnidati(x));
  if (v && typeof v === 'object') return Object.keys(v).some(k => haArrayAnnidati(v[k]));
  return false;
}

let __avvisoRifiuto = false;
async function fsSet(collection, obj){
  obj.id = obj.id || uid();
  obj.updatedAt = Date.now();
  // subito su questo dispositivo, prima ancora di provare la rete: se la
  // chiamata resta appesa o fallisce, la modifica è comunque già al sicuro
  saveLocal();
  if (!currentUser || !firebaseReady){
    // Da scollegati il bollo «già sul server» non vale più: la modifica
    // dev'essere ricaricata al prossimo collegamento, o resta solo qui.
    delete obj.syncedAt;
    saveLocal();   // senza il bollo: va ricaricato al prossimo collegamento
    setSaveStatus('offline');
    return obj.id;
  }
  try {
    const payload = perNuvola(JSON.parse(JSON.stringify(obj)));
    payload.syncedAt = Date.now();
    await userCol(collection).doc(obj.id).set(payload, {merge:true});
    // solo ora sappiamo che è arrivato davvero: marcarlo prima avrebbe
    // fatto credere sincronizzato un salvataggio fallito, e non sarebbe
    // più risalito al collegamento successivo
    obj.syncedAt = payload.syncedAt;
    setSaveStatus('saved');
    saveLocal();   // con il bollo «sincronizzato» addosso
  } catch(e){
    console.error('Errore salvataggio', e);
    setSaveStatus('offline');
    // Un rifiuto del server non è un problema di rete: va detto, o si
    // continua a credere che sia tutto al sicuro quando non lo è.
    const codice = (e && (e.code || e.message)) || '';
    if (/invalid|nested|argument|permission/i.test(codice) && !__avvisoRifiuto){
      __avvisoRifiuto = true;
      toast('⚠️ Il server ha rifiutato un salvataggio: apri Opzioni → Diagnostica accesso');
    }
    // il bollo non è stato messo: la copia locale deve dirlo, o al
    // prossimo collegamento questa modifica non risale
    saveLocal();
  }
  return obj.id;
}
/* Cancellare tremila voci una alla volta è la stessa fila di prima al
   contrario: anche le eliminazioni vanno a pacchetti. */
async function fsDeleteMany(collection, ids){
  const lista = (ids || []).filter(Boolean);
  if (!lista.length) return;
  saveLocalOra();
  if (!currentUser || !firebaseReady) return;
  setSaveStatus('saving');
  try {
    for (let i = 0; i < lista.length; i += FS_BLOCCO){
      const pacco = db.batch();
      lista.slice(i, i + FS_BLOCCO).forEach(id => pacco.delete(userCol(collection).doc(id)));
      await pacco.commit();
    }
    // quello che è stato tolto dal server non va più considerato «visto»,
    // o al prossimo aggiornamento sembrerebbe cancellato altrove
    if (__vistiSulServer[collection]){
      lista.forEach(id => __vistiSulServer[collection].delete(id));
      salvaVisti();
    }
    setSaveStatus('saved');
  } catch(e){
    console.error('Eliminazione in blocco non riuscita', e);
    setSaveStatus('offline');
    toast('⚠️ Alcune eliminazioni non sono arrivate al tuo account');
  }
}
async function fsDelete(collection, id){
  saveLocal();
  if (!currentUser || !firebaseReady) return;
  try { await userCol(collection).doc(id).delete(); }
  catch(e){ console.error('Errore eliminazione', e); toast('⚠️ Eliminazione non sincronizzata'); }
}

/* Salvataggio in blocco. Aggiungendo tanta roba insieme (un bestiario
   intero, un manuale di sottoclassi) la vecchia strada era una chiamata
   di rete per oggetto, in fila: tremila andate e ritorni dal telefono,
   più di mezz'ora con l'app ferma. Firestore accetta pacchetti da 500
   scritture: qui se ne mandano 400 per volta, con l'avanzamento a
   schermo, e l'archivio locale si riscrive una volta sola alla fine. */
const FS_BLOCCO = 400;
async function fsSetMany(collection, oggetti, avanzamento){
  const lista = (oggetti || []).filter(Boolean);
  if (!lista.length) return 0;
  const ora = Date.now();
  lista.forEach(o => { o.id = o.id || uid(); o.updatedAt = o.updatedAt || ora; });

  // prima la copia locale: anche se la rete non c'è, la roba è tua e resta
  if (!saveLocalOra()) return -1;

  if (!currentUser || !firebaseReady){
    lista.forEach(o => { delete o.syncedAt; });
    saveLocalOra(); setSaveStatus('offline');
    return lista.length;
  }
  setSaveStatus('saving');
  let fatti = 0;
  try {
    for (let i = 0; i < lista.length; i += FS_BLOCCO){
      const fetta = lista.slice(i, i + FS_BLOCCO);
      const pacco = db.batch();
      const bollo = Date.now();
      fetta.forEach(o => {
        const payload = perNuvola(JSON.parse(JSON.stringify(o)));
        payload.syncedAt = bollo;
        pacco.set(userCol(collection).doc(o.id), payload, { merge: true });
      });
      await pacco.commit();
      // solo adesso si sa che sono arrivati davvero
      fetta.forEach(o => { o.syncedAt = bollo; });
      fatti += fetta.length;
      if (typeof avanzamento === 'function') avanzamento(fatti, lista.length);
    }
    setSaveStatus('saved');
  } catch(e){
    console.error('Errore salvataggio in blocco', e);
    setSaveStatus('offline');
    const codice = (e && (e.code || e.message)) || '';
    if (/invalid|nested|argument|permission/i.test(codice) && !__avvisoRifiuto){
      __avvisoRifiuto = true;
      toast('⚠️ Il server ha rifiutato un salvataggio: apri Opzioni → Diagnostica accesso');
    } else if (fatti < lista.length){
      toast('📴 ' + fatti + ' di ' + lista.length + ' sincronizzati: il resto sale al prossimo collegamento');
    }
  }
  saveLocalOra();
  return lista.length;
}
// Un timer di debounce per ogni oggetto: modificare due schede diverse
// entro 600ms non fa "perdere" il salvataggio della prima.
function scheduleSave(collection, obj){
  saveLocal();
  setSaveStatus(currentUser ? 'saving' : 'offline');
  const key = collection + ':' + obj.id;
  clearTimeout(__saveTimers[key]);
  __saveTimers[key] = setTimeout(() => { delete __saveTimers[key]; fsSet(collection, obj); }, 600);
}
// Salva subito tutto ciò che è in attesa (es. quando l'app va in background)
function flushPendingSaves(){
  Object.keys(__saveTimers).forEach(key => {
    clearTimeout(__saveTimers[key]); delete __saveTimers[key];
    const [collection, id] = key.split(':');
    const list = state[collection] || [];
    const obj = list.find(o => o.id === id);
    if (obj) fsSet(collection, obj);
  });
  saveLocal(); saveSession();
}

/* ─── 6. AUTENTICAZIONE ──────────────────────────────────────────
   Nota sul perché di questa complicazione: l'app è servita da un dominio
   (es. github.io) diverso da quello di Firebase (…firebaseapp.com).
   Il vecchio flusso "signInWithRedirect" appoggia il passaggio a uno
   storage di terze parti che Safari e i Chrome recenti bloccano: da
   telefono il rimbalzo torna indietro senza utente e sembra che il tasto
   non faccia niente. Quindi: prima si prova la finestra popup (che non
   dipende da quello storage) e solo se fallisce si ripiega sul redirect.
*/
let __lastAuthError = null;
const AUTH_MSGS = {
  "auth/unauthorized-domain": () => "Dominio non autorizzato: aggiungi " + location.hostname + " in Firebase Console → Authentication → Settings → Authorized domains.",
  "auth/operation-not-allowed": () => "Accesso Google non attivo: abilitalo in Firebase Console → Authentication → Sign-in method.",
  "auth/popup-blocked": () => "Il browser ha bloccato la finestra di accesso: consenti i popup e riprova.",
  "auth/configuration-not-found": () => "Configurazione Firebase mancante o errata.",
  "auth/network-request-failed": () => "Nessuna connessione: puoi continuare in locale, la sincronizzazione arriverà dopo.",
  "auth/web-storage-unsupported": () => "Questo browser blocca l'archiviazione dei dati: disattiva la navigazione privata o il blocco dei cookie.",
  "auth/too-many-requests": () => "Troppi tentativi: riprova fra qualche minuto.",
};
// Errori che indicano "la finestra popup qui non si può usare": si ripiega.
const POPUP_FALLBACK = [
  'auth/popup-blocked', 'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported', 'auth/internal-error', 'auth/timeout'
];
const SILENT_AUTH = ['auth/cancelled-popup-request', 'auth/popup-closed-by-user', 'auth/user-cancelled'];

function isStandalonePWA(){
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
}
// I browser dentro altre app (Instagram, Facebook, TikTok…) vengono
// rifiutati da Google stesso: meglio dirlo subito invece di far fallire.
function isInAppBrowser(){
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|Snapchat|Pinterest|Twitter|WhatsApp|MicroMessenger/i.test(navigator.userAgent || '');
}
function storageOk(){
  try { localStorage.setItem('__t','1'); localStorage.removeItem('__t'); return true; } catch(e){ return false; }
}
function noteAuthError(err){
  __lastAuthError = { code: (err && err.code) || 'sconosciuto', message: (err && err.message) || String(err), at: new Date().toLocaleTimeString('it-IT') };
  console.error('Errore accesso:', err);
  const f = AUTH_MSGS[__lastAuthError.code];
  toast(f ? f() : ('Accesso non riuscito (' + __lastAuthError.code + ')'));
}

/* Entrando con un account diverso da quello della copia locale, la copia
   di prima non va persa: si mette in un cassetto suo e torna fuori
   quando quella persona rientra. Chi entra la prima volta si porta
   dietro quello che aveva creato da scollegato: è suo. */
function cambiaCassetto(uid){
  let precedente = null;
  try { precedente = localStorage.getItem(LS_UID); } catch(e){ return; }
  if (precedente === uid) return;             // stesso account: niente da fare

  if (precedente){
    // metti da parte quello che c'è, è di qualcun altro
    try {
      const attuale = localStorage.getItem(LS_KEY);
      if (attuale) localStorage.setItem(cassettoDi(precedente), attuale);
    } catch(e){ console.warn('Non riesco a mettere da parte i dati precedenti', e); }

    // riprendi il cassetto di chi sta entrando, se ne ha uno
    let suo = null;
    try { suo = localStorage.getItem(cassettoDi(uid)); } catch(e){}
    ['characters','npcs','customSpells','spellTags','homebrew','journal']
      .forEach(k => { state[k] = []; });
    bestiarioScorda();
    if (suo){
      try {
        const d = JSON.parse(suo);
        ['characters','npcs','customSpells','spellTags','homebrew','journal']
          .forEach(k => { if (Array.isArray(d[k])) state[k] = d[k]; });
        bestiarioScorda();
        localStorage.removeItem(cassettoDi(uid));
      } catch(e){ console.warn('Cassetto illeggibile', e); }
    }
    try { localStorage.setItem(LS_KEY, JSON.stringify({
      characters: state.characters, npcs: state.npcs, customSpells: state.customSpells,
      spellTags: state.spellTags, homebrew: state.homebrew, journal: state.journal })); } catch(e){}
    setTimeout(() => toast('👤 Account cambiato: rivedi le tue cose fra un istante'), 600);
  }
  // niente uid prima d'ora: quello che c'è l'hai creato tu da scollegato,
  // resta dov'è e sale sull'account con il primo collegamento.
  try { localStorage.setItem(LS_UID, uid); } catch(e){}
  if (precedente) dimenticaVisti();
}

function signIn(forceMethod){
  if (!firebaseReady){ toast('Connessione a Firebase non disponibile'); return; }
  if (isInAppBrowser()){ openInAppBrowserHelp(); return; }
  if (!storageOk()){ toast('Il browser sta bloccando l\'archiviazione: esci dalla navigazione privata e riprova'); return; }

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  // Nell'app installata la finestra popup spesso non ha dove aprirsi e
  // torna indietro senza niente: lì si parte direttamente dal
  // reindirizzamento, che è l'unico che regge.
  const predefinito = isStandalonePWA() ? 'redirect' : 'popup';
  const preferred = forceMethod || localStorage.getItem('grimorio-auth-method') || predefinito;
  if (preferred === 'redirect') return startRedirect(provider);

  // Da qui in poi niente attese: la chiamata deve restare dentro il gesto.
  __authAttempt = { method: 'popup', at: Date.now() };
  auth.signInWithPopup(provider).then(() => {
    __authAttempt = null;
    localStorage.setItem('grimorio-auth-method', 'popup');
    toast('✓ Accesso effettuato');
  }).catch(err => {
    const elapsed = __authAttempt ? (Date.now() - __authAttempt.at) : 99999;
    __authAttempt = null;
    const code = err && err.code;
    if (SILENT_AUTH.includes(code)){
      // Chiusa in meno di due secondi e mezzo non l'hai chiusa tu: è il
      // browser che ha interrotto il passaggio. In quel caso si riprova
      // col reindirizzamento; se invece hai annullato, silenzio.
      if (code === 'auth/popup-closed-by-user' && elapsed < 2500){
        toast('La finestra si è chiusa da sola: provo con il reindirizzamento…');
        return startRedirect(provider);
      }
      return;
    }
    if (POPUP_FALLBACK.includes(code)){
      toast('Provo con il reindirizzamento…');
      return startRedirect(provider);
    }
    noteAuthError(err);
  });
}
let __authAttempt = null;
function startRedirect(provider){
  try { sessionStorage.setItem('grimorio-auth-pending', String(Date.now())); } catch(e){}
  localStorage.setItem('grimorio-auth-method', 'redirect');
  return auth.signInWithRedirect(provider).catch(err => {
    try { sessionStorage.removeItem('grimorio-auth-pending'); } catch(e){}
    noteAuthError(err);
  });
}
// Al rientro dal reindirizzamento: se torna senza utente il motivo è
// quasi sempre il blocco dello storage di terze parti.
function handleRedirectResult(){
  if (!auth || !auth.getRedirectResult) return;
  auth.getRedirectResult().then(res => {
    let pending = null;
    try { pending = sessionStorage.getItem('grimorio-auth-pending'); sessionStorage.removeItem('grimorio-auth-pending'); } catch(e){}
    if (res && res.user){ toast('✓ Accesso effettuato'); return; }
    if (pending){
      __lastAuthError = { code: 'redirect-senza-utente', message: 'Il reindirizzamento è tornato senza account: di solito è il blocco dei cookie di terze parti.', at: new Date().toLocaleTimeString('it-IT') };
      localStorage.setItem('grimorio-auth-method', 'popup');
      setTimeout(() => toast('Accesso non completato: apri Opzioni → Diagnostica accesso'), 900);
    }
  }).catch(err => {
    try { sessionStorage.removeItem('grimorio-auth-pending'); } catch(e){}
    if (err && err.code !== 'auth/no-auth-event') noteAuthError(err);
  });
}
function openInAppBrowserHelp(){
  const inner = `
    <p class="muted" style="margin-bottom:14px">Stai usando TwentyNation dentro il browser interno di un'altra app (Instagram, Facebook, TikTok…). Google non consente l'accesso da qui: è una restrizione loro, non dell'app.</p>
    <p class="muted" style="margin-bottom:14px"><b>Come fare:</b> tocca il menu <b>⋯</b> in alto e scegli <b>Apri in Chrome</b> (Android) o <b>Apri in Safari</b> (iPhone). Da lì l'accesso funziona, e puoi anche aggiungere TwentyNation alla schermata Home.</p>
    <button class="btn btn-ghost btn-block" onclick="copyAppLink()">Copia il link dell'app</button>
    <button class="btn btn-primary btn-block" style="margin-top:10px" onclick="closeModal()">Ho capito</button>`;
  openModal({ render: () => modalShell('Apri nel browser', inner) });
}
function copyAppLink(){
  const url = location.href.split('?')[0];
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(()=>toast('🔗 Link copiato')).catch(()=>toast(url));
  } else toast(url);
}

/* Pannello diagnostico: serve a capire in un colpo d'occhio perché
   l'accesso non va, senza dover indovinare. */
function openAuthDiagnostics(){
  openModal({ render: () => authDiagnosticsHTML() });
}
function authDiagnosticsHTML(){
  const rows = [
    ['Versione app', APP_VERSION],
    ['Stato', currentUser ? '✓ collegato come ' + (currentUser.email || currentUser.displayName || 'account Google') : '📴 non collegato'],
    ['Dominio', location.hostname || '(file locale)'],
    ['Dominio Firebase', FIREBASE_CONFIG.authDomain],
    ['Modalità', isStandalonePWA() ? 'app installata' : 'browser'],
    ['Browser dentro un\'altra app', isInAppBrowser() ? '⚠️ sì' : 'no'],
    ['Cookie', navigator.cookieEnabled ? 'ok' : '⚠️ bloccati'],
    ['Archiviazione locale', storageOk() ? 'ok' : '⚠️ bloccata'],
    ['Libreria Firebase', firebaseReady ? 'caricata' : '⚠️ non caricata'],
    ['Metodo in uso', (localStorage.getItem('grimorio-auth-method') || 'popup') === 'redirect' ? 'reindirizzamento' : 'finestra popup'],
  ];
  if (__lastAuthError) rows.push(['Ultimo errore', __lastAuthError.code + ' (' + __lastAuthError.at + ')']);
  const inner = `
    <div class="card" style="margin-bottom:14px">
      ${rows.map(([k,v]) => `<div class="row-between" style="margin-bottom:7px; gap:12px">
        <span class="muted" style="flex-shrink:0">${escapeHtml(k)}</span>
        <b style="text-align:right; font-size:.8rem; word-break:break-word">${escapeHtml(String(v))}</b>
      </div>`).join('')}
    </div>
    ${__lastAuthError ? `<div class="card" style="margin-bottom:14px; border-color:var(--warn)">
      <div class="muted" style="font-size:.78rem">${escapeHtml(__lastAuthError.message)}</div>
    </div>` : ''}
    <div class="list-gap">
      <button class="btn btn-primary btn-block" onclick="closeModal(); signIn('popup')">Accedi con la finestra popup</button>
      <button class="btn btn-ghost btn-block" onclick="closeModal(); signIn('redirect')">Accedi con il reindirizzamento</button>
      <button class="btn btn-ghost btn-block" onclick="copyDiagnostics()">Copia questi dati</button>
      <button class="btn btn-ghost btn-block" onclick="forceAppUpdate()">🔄 Forza aggiornamento dell'app</button>
    </div>
    <div class="spell-source-note">
      Se l'accesso non riesce da telefono: prova prima la finestra popup; se il browser la blocca, usa il reindirizzamento.
      Se torni indietro senza risultare collegato, disattiva il blocco dei cookie di terze parti per questo sito
      (iPhone: Impostazioni → Safari → "Impedisci tracciamento tra siti" disattivato) oppure apri TwentyNation nel browser invece che dall'icona installata.
    </div>`;
  return modalShell('🔐 Diagnostica accesso', inner);
}
function copyDiagnostics(){
  const txt = [
    'TwentyNation ' + APP_VERSION,
    'dominio: ' + location.hostname,
    'authDomain: ' + FIREBASE_CONFIG.authDomain,
    'standalone: ' + isStandalonePWA(),
    'in-app: ' + isInAppBrowser(),
    'cookie: ' + navigator.cookieEnabled,
    'storage: ' + storageOk(),
    'firebase: ' + firebaseReady,
    'metodo: ' + (localStorage.getItem('grimorio-auth-method') || 'popup'),
    'errore: ' + (__lastAuthError ? __lastAuthError.code + ' — ' + __lastAuthError.message : 'nessuno'),
    'ua: ' + navigator.userAgent
  ].join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(()=>toast('📋 Diagnostica copiata')).catch(()=>console.log(txt));
  } else { console.log(txt); toast('Diagnostica scritta nella console'); }
}
function signOutUser(){ if (auth) auth.signOut(); }

/* Svuota la cache e ricarica: serve quando il telefono continua a usare
   una versione vecchia dell'app anche dopo un aggiornamento. */
async function forceAppUpdate(){
  toast('Scarico la versione aggiornata…');
  try {
    if ('serviceWorker' in navigator){
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if (window.caches){
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch(e){ console.warn('Pulizia cache non riuscita', e); }
  setTimeout(() => location.reload(true), 600);
}

/* La rotella del mouse sopra un elemento fisso (barra laterale, sfondo
   della finestra) non muove nulla: la si gira sul contenitore giusto. */
/* Il dado galleggiante sta comodo finché leggi, ma nelle liste lunghe
   resta piantato sopra la colonna dei tasti di destra. Quindi: scorri
   in giù e si toglie, ti fermi o risali e torna. */
function installFabAutoHide(){
  let last = window.scrollY, ticking = false, idle = null;
  const fab = () => document.querySelector('.fab');
  const set = (hide) => { const f = fab(); if (f) f.classList.toggle('tucked', hide); };
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const giu = y > last + 6, su = y < last - 6;
      if (giu && y > 120) set(true);
      else if (su) set(false);
      last = y;
      clearTimeout(idle);
      idle = setTimeout(() => set(false), 900); // fermo il pollice, torna
      ticking = false;
    });
  }, { passive: true });
}

function installWheelForwarding(){
  window.addEventListener('wheel', (e) => {
    const nav = e.target.closest && e.target.closest('.bottomnav');
    if (nav){ window.scrollBy({ top: e.deltaY, behavior: 'auto' }); e.preventDefault(); return; }
    const overlay = e.target.closest && e.target.closest('.overlay');
    if (overlay && !(e.target.closest('.sheet-modal'))){
      const box = overlay.querySelector('.sheet-modal');
      if (box){ box.scrollTop += e.deltaY; e.preventDefault(); }
    }
  }, { passive: false });
}

/* ─── 7. MODELLO PERSONAGGIO ─── */
function newCharacter(){
  return {
    id: uid(),
    name: '', race: '', classField: '', level: 1, background: '', alignment: '',
    playerName: '', xp: '', xpNext: '', sex: '', portrait: null,
    avatar: AVATAR_GLYPHS[Math.floor(Math.random()*AVATAR_GLYPHS.length)],
    abilities: { str:10, dex:10, con:10, int:10, wis:10, cha:10 },
    skillProf: [], skillExpert: [], saveProf: [],
    hp: { current: 10, max: 10, temp: 0 },
    ac: 10, initiative: 0, speed: 9,
    hitDie: 8, hitDiceUsed: 0,
    deathSaves: { win: 0, fail: 0 },
    classId: '', subclassId: '',
    // Il legame con le tue razze e i tuoi background, non solo il nome
    // scritto: serve perché la scheda sappia da dove vengono tratti,
    // velocità e privilegi anche dopo che li hai rinominati.
    raceId: '', bgId: '',
    casterType: 'none', spellAbility: 'int',
    slotsUsed: {}, knownSpells: [], preparedSpells: [], concentration: null, spellNotes: {},
    inventory: [], coins: { pp:0, gp:0, ep:0, sp:0, cp:0 },
    attacks: [], resources: [], companions: [], activeForm: null, conditions: [],
    armor: '', senses: '', languages: '', tools: '', feats: '', profOther: '',
    hitDie2: 0, hitDiceUsed2: 0, carryCapacity: '',
    inspiration: false, exhaustion: 0,
    appearance: { age:'', height:'', weight:'', eyes:'', skin:'', hair:'', text:'' },
    faction: '', symbol: '', allies: '', enemies: '',
    traits: '', ideals: '', bonds: '', flaws: '', backstory: '', features: '',
    notesRace: '', notesExtra: '',
    slotsOverride: null,
    createdAt: Date.now(),
  };
}
// Se una scheda è malformata non deve far fallire il caricamento di tutte
// le altre: si isola il danno e si tiene comunque il personaggio.
function safeMigrate(c){
  try { return migrateCharacter(c); }
  catch(e){ console.error('Scheda non normalizzabile', c && c.id, e); return c || null; }
}
// Porta le schede vecchie al nuovo modello senza perdere nulla.
// Riporta un valore a un numero sensato: i backup scritti a mano o
// arrivati da altre fonti possono contenere testo dove serve un numero,
// e senza questo la scheda finisce per mostrare "NaN".
function toNum(v, def, min, max){
  const n = typeof v === 'string' ? parseFloat(v.replace(',','.')) : Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.round(n)));
}
function migrateCharacter(c){
  if (!c || typeof c !== 'object') return c;
  c.abilities = c.abilities || { str:10, dex:10, con:10, int:10, wis:10, cha:10 };
  ['str','dex','con','int','wis','cha'].forEach(k => { c.abilities[k] = toNum(c.abilities[k], 10, 1, 30); });
  c.hp = (c.hp && typeof c.hp === 'object') ? c.hp : { current: 10, max: 10, temp: 0 };
  c.hp.max = toNum(c.hp.max, 10, 1, 9999);
  c.hp.current = toNum(c.hp.current, c.hp.max, 0, c.hp.max);
  c.hp.temp = toNum(c.hp.temp, 0, 0, 999);
  c.ac = toNum(c.ac, 10, 0, 40);
  c.speed = toNum(c.speed, 9, 0, 999);
  c.initiative = toNum(c.initiative, Math.floor((c.abilities.dex - 10)/2), -20, 20);
  c.skillProf = c.skillProf || []; c.saveProf = c.saveProf || []; c.skillExpert = c.skillExpert || [];
  c.attacks = c.attacks || []; c.resources = c.resources || [];
  c.companions = c.companions || []; c.conditions = c.conditions || [];
  if (c.activeForm === undefined) c.activeForm = null;
  c.appearance = Object.assign({ age:'', height:'', weight:'', eyes:'', skin:'', hair:'', text:'' }, c.appearance || {});
  ['playerName','xp','xpNext','sex','armor','senses','languages','tools','feats','profOther','faction','symbol','allies','enemies','notesRace','notesExtra','carryCapacity']
    .forEach(k => { if (c[k] == null) c[k] = ''; });
  if (c.portrait === undefined) c.portrait = null;
  c.hitDie2 = Number(c.hitDie2) || 0; c.hitDiceUsed2 = Number(c.hitDiceUsed2) || 0;
  if (c.inspiration == null) c.inspiration = false;
  c.exhaustion = clamp(c.exhaustion || 0, 0, 6);
  if (c.slotsOverride === undefined) c.slotsOverride = null;
  c.knownSpells = c.knownSpells || []; c.preparedSpells = c.preparedSpells || [];
  c.spellNotes = c.spellNotes || {};
  c.inventory = Array.isArray(c.inventory) ? c.inventory : [];
  c.inventory.forEach(it => { if (it.weight == null) it.weight = ''; if (it.attuned == null) it.attuned = false; });
  c.slotsUsed = c.slotsUsed || {};
  c.coins = Object.assign({ pp:0, gp:0, ep:0, sp:0, cp:0 }, c.coins || {});
  c.deathSaves = Object.assign({ win:0, fail:0 }, c.deathSaves || {});
  if (c.concentration === undefined) c.concentration = null;
  if (!c.hitDie){
    const parsed = /d(\d+)/i.exec(c.hitDice || '');
    c.hitDie = parsed ? Number(parsed[1]) : (CLASS_TO_HIT_DIE[c.classField] || 8);
  }
  c.hitDiceUsed = clamp(c.hitDiceUsed || 0, 0, 20);
  c.level = clamp(c.level || 1, 1, 20);
  return c;
}

/* ─── 8. CALCOLI DERIVATI ─── */
function skillMod(c, s){
  const base = mod(getPath(c,'abilities.'+s.ability,10));
  const p = profBonus(c.level);
  if ((c.skillExpert||[]).includes(s.key)) return base + p*2;
  return base + ((c.skillProf||[]).includes(s.key) ? p : 0);
}
function skillLevel(c, key){
  if ((c.skillExpert||[]).includes(key)) return 2;
  return (c.skillProf||[]).includes(key) ? 1 : 0;
}
function saveMod(c, abilityKey){ return mod(getPath(c,'abilities.'+abilityKey,10)) + ((c.saveProf||[]).includes(abilityKey) ? profBonus(c.level) : 0); }
function hpPctFor(c){ const max = getPath(c,'hp.max',1)||1; return clamp(100*getPath(c,'hp.current',0)/max, 0, 100); }
function spellcastingMod(c){ return mod(getPath(c,'abilities.'+(c.spellAbility||'int'),10)) + profBonus(c.level); }
function charById(id){ return state.characters.find(x=>x.id===id); }
function hitDiceLeft(c){ return clamp((c.level||1) - (c.hitDiceUsed||0), 0, 20); }
function passivePerception(c){ return 10 + skillMod(c, SKILLS.find(s=>s.key==='perception')); }

/* ─── 9. NAVIGAZIONE + RENDER ─── */
let __modalDepth = 0, __ignorePop = false, __pendingClose = false, __needsRepush = false, __lastRenderKey = '';

function navSnapshot(){
  return { view: state.view, activeCharId: state.activeCharId, sheetTab: state.sheetTab,
           dmTab: state.dmTab, grimoireMode: state.grimoireMode, grimoirePickFor: state.grimoirePickFor };
}
function pushNav(){
  // Se una chiusura di finestra è ancora in volo, il suo back() sta per
  // arrivare: aggiungere una voce adesso la farebbe mangiare a lui e la
  // cronologia resterebbe corta. Meglio sostituire quella corrente.
  try {
    if (__pendingClose) history.replaceState(navSnapshot(), '');
    else history.pushState(navSnapshot(), '');
  } catch(e){}
}
function replaceNav(){ try { history.replaceState(navSnapshot(), ''); } catch(e){} }
function applyNav(s){
  state.view = s.view || 'party';
  state.activeCharId = s.activeCharId || null;
  state.sheetTab = s.sheetTab || 'overview';
  state.dmTab = s.dmTab || 'bestiary';
  state.grimoireMode = s.grimoireMode || 'browse';
  state.grimoirePickFor = s.grimoirePickFor || null;
  render();
}
window.addEventListener('popstate', (e) => {
  if (__ignorePop){
    __ignorePop = false; __pendingClose = false;
    if (__needsRepush && state.modal){ __needsRepush = false; pushModalEntry(); }
    else __needsRepush = false;
    return;
  }
  __pendingClose = false; __needsRepush = false;
  if (state.modal){ closeModal(true); return; }
  if (e.state && e.state.view) applyNav(e.state);
  else { state.view = 'party'; state.activeCharId = null; render(); }
});

function goView(v){
  if (state.grimoireMode === 'pick' && v !== 'grimoire'){ state.grimoireMode = 'browse'; state.grimoirePickFor = null; }
  state.view = v; state.activeCharId = null;
  pushNav(); render(); scrollTop();
}
function openSheet(id){
  state.view = 'sheet'; state.activeCharId = id; state.sheetTab = 'overview';
  suggerisciScorrimento();
  state.knownFilter = 'all';
  pushNav(); render(); scrollTop();
}
function setSheetTab(tab){ state.sheetTab = tab; replaceNav(); render(); scrollTop(); }

/* ─── Scorrimento laterale fra le sezioni della scheda ───
   Sul telefono passare da Zaino a Magie voleva dire mirare un
   pulsante piccolo in cima: col dito è immediato. */
const SHEET_TABS_ORDINE = ['overview','inventory','spells','background','notes'];
function sheetTabsDisponibili(c){
  const conMagie = c && ((c.casterType && c.casterType !== 'none') || (c.knownSpells||[]).length > 0);
  return SHEET_TABS_ORDINE.filter(t => t !== 'spells' || conMagie);
}
/* verso: +1 verso destra (sezione successiva), -1 indietro */
function scorriScheda(verso){
  const c = charById(state.activeCharId); if (!c) return false;
  const tabs = sheetTabsDisponibili(c);
  const i = tabs.indexOf(state.sheetTab);
  const j = i + verso;
  if (i < 0 || j < 0 || j >= tabs.length) return false;
  state.sheetTab = tabs[j];
  __scorrimentoDa = verso > 0 ? 'destra' : 'sinistra';
  replaceNav(); render(); scrollTop();
  return true;
}
let __scorrimentoDa = null;
/* Chiamata dopo ogni disegno: fa entrare la sezione dal lato giusto
   e porta in vista il nome della sezione nella barra. */
function animaScorrimento(){
  const body = document.getElementById('sheet-tab-body');
  if (body && __scorrimentoDa){
    body.classList.add(__scorrimentoDa === 'destra' ? 'entra-da-destra' : 'entra-da-sinistra');
  }
  __scorrimentoDa = null;
  const att = document.querySelector('.segmented button.active');
  if (att && att.scrollIntoView) att.scrollIntoView({ block:'nearest', inline:'center' });
}
/* Un elemento che scorre in orizzontale per conto suo (una tabella larga,
   la barra delle sezioni) si tiene il gesto: non deve cambiare pagina. */
function scorreInOrizzontale(el){
  for (let n = el; n && n !== document.body; n = n.parentElement){
    if (!(n instanceof Element)) continue;
    if (n.scrollWidth > n.clientWidth + 4){
      const ov = getComputedStyle(n).overflowX;
      if (ov === 'auto' || ov === 'scroll') return true;
    }
  }
  return false;
}
function installSheetSwipe(){
  let x0 = 0, y0 = 0, attivo = false;
  const app = document.getElementById('app') || document.body;
  app.addEventListener('touchstart', (e) => {
    attivo = false;
    if (state.view !== 'sheet' || state.modal) return;
    if (!e.touches || e.touches.length !== 1) return;
    const t = e.target;
    if (t && t.closest && t.closest('input,textarea,select,.segmented')) return;
    if (t instanceof Element && scorreInOrizzontale(t)) return;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; attivo = true;
  }, { passive: true });
  app.addEventListener('touchend', (e) => {
    if (!attivo) return;
    attivo = false;
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - x0, dy = t.clientY - y0;
    // deve essere netto e orizzontale, o rubiamo lo scorrimento verticale
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.7) return;
    if (scorriScheda(dx < 0 ? 1 : -1) && typeof buzz === 'function') buzz(8);
  }, { passive: true });
}
/* Il suggerimento si dà una volta sola, alla prima scheda aperta. */
function suggerisciScorrimento(){
  try {
    if (localStorage.getItem('grimorio-hint-swipe')) return;
    if (!('ontouchstart' in window)) return;
    localStorage.setItem('grimorio-hint-swipe','1');
    setTimeout(() => toast('💡 Scorri col dito fra le sezioni'), 1400);
  } catch(e){}
}
function setDmTab(tab){ state.dmTab = tab; replaceNav(); render(); }

function toggleTheme(){
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('grimorio-theme', state.theme);
  document.documentElement.setAttribute('data-theme', state.theme);
  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta) meta.setAttribute('content', state.theme === 'dark' ? '#140f1e' : '#f6ead0');
  render();
}

function loaderHTML(){ return `<div id="loader"><div class="rune-load"></div><p>TwentyNation si sta aprendo…</p></div>`; }
function emptyState(icon, text){ return `<div class="empty-state"><div class="ic">${icon}</div><p>${escapeHtml(text)}</p></div>`; }
function themeToggleBtn(){ return `<button class="btn-icon" onclick="toggleTheme()" aria-label="Cambia tema" title="Cambia tema">${state.theme==='dark'?'🌙':'☀️'}</button>`; }

function offlineBannerHTML(){
  if (currentUser) return '';
  if (!firebaseReady) return `<div class="offline-banner">📴 Modalità locale — i dati restano qui.</div>`;
  return `<div class="offline-banner">📴 Modalità locale — <button onclick="signIn()">accedi</button> per sincronizzare.</div>`;
}

function authScreenHTML(){
  return `<div class="auth-screen">
    <div class="seal glow portrait"><img src="./icon-maskable-512.png" alt="TwentyNation" width="512" height="512"></div>
    <h1>TwentyNation</h1>
    <p>Personaggi, incantesimi, inventario, background e strumenti da master: la tua compagnia sempre a portata di mano, sincronizzata su tutti i dispositivi.</p>
    <button class="google-btn" onclick="signIn()">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.9v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.04l3.07-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.96l3.07 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
      Accedi con Google
    </button>
    <button class="btn btn-ghost" onclick="continueOffline()">Continua senza account</button>
    <button class="btn btn-ghost btn-sm" onclick="openAuthDiagnostics()">L'accesso non funziona?</button>
    <p style="font-size:.72rem; opacity:.75;">Senza account i dati restano solo su questo dispositivo: potrai accedere in seguito e verranno sincronizzati.</p>
  </div>`;
}
function continueOffline(){ state.offlineMode = true; localStorage.setItem('grimorio-offline','1'); render(); }

function bottomNavHTML(){
  const items = [
    {v:'party', ic:'🎭', label:'Party'},
    {v:'grimoire', ic:'📖', label:'Grimorio'},
    {v:'dm', ic:'⚔️', label:'Tavolo'},
    {v:'settings', ic:'⚙️', label:'Opzioni'},
  ];
  const active = state.view === 'sheet' ? 'party' : state.view;
  return `<nav class="bottomnav"><div class="bottomnav-inner">
    ${items.map(i=>`<button class="nav-btn ${active===i.v?'active':''}" onclick="goView('${i.v}')" aria-label="${i.label}"><span class="ic">${i.ic}</span>${i.label}</button>`).join('')}
  </div></nav>`;
}
function fabHTML(){ return `<button class="fab" onclick="openDiceRoller()" aria-label="Tira i dadi" title="Tira i dadi">🎲</button>`; }

// Le note lunghe (privilegi, tratti, storia) non devono stare in una
// finestrella da tre righe: l'area di testo si adatta al contenuto.
function fitTextarea(el){
  if (!el || el.tagName !== 'TEXTAREA') return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight + 2, 1200) + 'px';
}
function fitAllTextareas(){ $$('#app textarea').forEach(fitTextarea); }
document.addEventListener('input', (e) => { if (e.target && e.target.tagName === 'TEXTAREA') fitTextarea(e.target); });

function render(){
  const app = $('#app');
  if (!app) return;
  if (!state.authReady){ app.innerHTML = loaderHTML(); return; }
  if (!currentUser && !state.offlineMode && !state.characters.length && !state.npcs.length){
    app.innerHTML = authScreenHTML();
    return;
  }
  const y = window.scrollY;
  const key = [state.view, state.activeCharId||'', state.sheetTab, state.dmTab].join('|');
  const changed = key !== __lastRenderKey;
  __lastRenderKey = key;

  let body;
  if (state.view === 'sheet' && charById(state.activeCharId)) body = renderCharacterSheet();
  else if (state.view === 'grimoire') body = renderGrimoire();
  else if (state.view === 'dm') body = renderDM();
  else if (state.view === 'settings') body = renderSettings();
  else { state.view = 'party'; body = renderParty(); }

  app.innerHTML = updateBannerHTML() + offlineBannerHTML()
    + `<div class="screen${changed ? ' anim-in' : ''}">${body}</div>`
    + bottomNavHTML() + fabHTML();
  updateSaveStatusEl();
  fitAllTextareas();
  animaScorrimento();
  if (!changed) window.scrollTo(0, y);
}

/* ─── 10. MODALI ─── */
function ensureModalRoot(){
  let root = document.getElementById('modal-root');
  if (!root){ root = document.createElement('div'); root.id = 'modal-root'; document.body.appendChild(root); }
  return root;
}
/* Ridisegnare un modale significa rifare tutto l'HTML: senza
   accorgimenti la finestra tornerebbe in cima a ogni tocco e il
   cursore uscirebbe dal campo in cui stai scrivendo. Qui ci
   segniamo dove eravamo e ci rimettiamo esattamente lì. */
function modalScrollBox(){ return document.querySelector('#modal-root .sheet-modal'); }
function renderModalRoot(opts){
  const root = ensureModalRoot();
  if (!state.modal){ root.innerHTML = ''; document.body.style.overflow = ''; return; }

  const box = modalScrollBox();
  const keepTop = (opts && opts.toTop) ? 0 : (box ? box.scrollTop : 0);
  const ae = document.activeElement;
  const keepId = (ae && ae.id && root.contains(ae) && /^(INPUT|TEXTAREA)$/.test(ae.tagName)) ? ae.id : null;
  const keepSel = keepId ? [ae.selectionStart, ae.selectionEnd] : null;

  root.innerHTML = state.modal.render();
  document.body.style.overflow = 'hidden';

  const nb = modalScrollBox();
  if (nb && keepTop) nb.scrollTop = keepTop;
  if (keepId){
    const el = document.getElementById(keepId);
    if (el){
      el.focus({ preventScroll: true });
      try { if (keepSel && keepSel[0] != null) el.setSelectionRange(keepSel[0], keepSel[1]); } catch(e){}
    }
  }
  if (state.modal.after) state.modal.after();
}
/* La chiusura di una finestra fa un history.back(), che arriva un
   attimo dopo. Se nel frattempo se ne apre un'altra (succede: chiudi
   e l'app te ne propone subito una) e questa spingesse un'altra voce
   di cronologia, il back in arrivo la mangerebbe e il tasto Indietro
   del telefono ti butterebbe fuori dall'app. Quindi: se una chiusura
   è ancora in volo, la nuova finestra riusa la voce che c'è già. */
function pushModalEntry(){
  __modalDepth = 1;
  try { history.pushState(Object.assign(navSnapshot(), {modal:true}), ''); } catch(e){}
}
function openModal(descriptor){
  // Se la chiusura precedente non è ancora atterrata, la sua voce di
  // cronologia sta per sparire: ce la riprendiamo appena il back arriva,
  // altrimenti il tasto Indietro del telefono uscirebbe dall'app.
  if (__pendingClose) __needsRepush = true;
  else if (__modalDepth === 0) pushModalEntry();
  state.modal = descriptor;
  renderModalRoot({ toTop:true }); // una finestra nuova parte sempre dall'alto
}
function closeModal(fromPop){
  if (!state.modal && !__modalDepth) return;
  state.modal = null;
  renderModalRoot();
  if (fromPop){ __modalDepth = 0; __pendingClose = false; __needsRepush = false; return; }
  if (__modalDepth || __needsRepush){
    __modalDepth = 0; __needsRepush = false; __ignorePop = true; __pendingClose = true;
    try { history.back(); } catch(e){}
  }
}
document.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape' && state.modal){ closeModal(); return; }
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target||{}).tagName||'') || (e.target||{}).isContentEditable;
  if (typing || state.modal) return;
  if (e.key === '/' || ((e.ctrlKey||e.metaKey) && e.key.toLowerCase() === 'k')){ e.preventDefault(); openGlobalSearch(); }
});

let __confirmAction = null;
function infoDialog(title, body){
  openModal({ render: () => `
    <div class="overlay center" onclick="if(event.target===this) closeModal()">
      <div class="sheet-modal frame" style="max-width:420px">
        <h3 style="font-family:var(--font-head); color:var(--gold); margin-bottom:8px">${escapeHtml(title)}</h3>
        <p class="muted" style="font-size:.86rem">${escapeHtml(body)}</p>
        <button class="btn btn-block" style="margin-top:14px" onclick="closeModal()">Chiudi</button>
      </div>
    </div>` });
}
function confirmDialog(title, body, action, confirmLabel){
  __confirmAction = action;
  openModal({ render: () => `
    <div class="overlay center" onclick="if(event.target===this) closeModal()">
      <div class="sheet-modal frame" style="padding:24px 20px;">
        <div class="section-title">${escapeHtml(title)}</div>
        <p class="muted" style="margin-bottom:20px;">${escapeHtml(body)}</p>
        <div class="btn-row">
          <button class="btn btn-ghost" onclick="closeModal()">Annulla</button>
          <button class="btn btn-primary" onclick="runConfirm()">${escapeHtml(confirmLabel||'Conferma')}</button>
        </div>
      </div>
    </div>` });
}
function runConfirm(){ const a = __confirmAction; __confirmAction = null; closeModal(); if (a) a(); }

function modalShell(title, inner, opts){
  opts = opts || {};
  return `<div class="overlay${opts.center?' center':''}" onclick="if(event.target===this) closeModal()">
    <div class="sheet-modal">
      <div class="sheet-modal-handle"></div>
      <div class="sheet-modal-head">
        <div class="sheet-modal-title">${title}</div>
        <button class="btn-icon" onclick="closeModal()" aria-label="Chiudi">✕</button>
      </div>
      ${inner}
    </div>
  </div>`;
}

/* ─── 11. VISTA PARTY ─── */
function renderParty(){
  const chars = state.characters.slice().sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  return `
    <div class="hero">
      <div class="hero-actions">
        <button class="btn-icon" onclick="openGlobalSearch()" aria-label="Cerca ovunque" title="Cerca ovunque">🔍</button>
        ${themeToggleBtn()}
      </div>
      <h1>TwentyNation</h1>
      <div class="rule">❖</div>
      <div class="sub">La tua compagnia</div>
    </div>
    ${chars.length
      ? `<div class="stagger list-gap party-grid">${chars.map(charCardHTML).join('')}</div>`
      : emptyState('🎭','Nessun personaggio ancora. Crea il tuo primo eroe e comincia l\'avventura.')}
    ${chars.length ? `<button class="btn btn-gold btn-block" style="margin-top:14px" onclick="openTurno('${chars[0].id}')">⚔️ Il tuo turno</button>` : ''}
    <button class="btn btn-primary btn-block" style="margin-top:${chars.length?'10px':'16px'}" onclick="openBuilder()">✦ Crea personaggio guidato</button>
    <div class="btn-row" style="margin-top:10px">
      <button class="btn btn-ghost btn-sm" onclick="openCharacterForm()">✎ Scheda vuota</button>
      <button class="btn btn-ghost btn-sm" onclick="openPdfImport()">⇪ Importa PDF</button>
    </div>
    ${campaignCardHTML()}
  `;
}
/* Il tavolo si raggiunge dalla prima schermata: è la cosa che si apre
   più spesso quando si gioca in gruppo. */
function campaignCardHTML(){
  const c = state.campaign;
  if (c && c.id){
    const membri = Object.keys(c.members || {}).length;
    const daMettere = (typeof daCondividere === 'function') ? daCondividere() : 0;
    return `<div class="card" style="margin-top:16px; border-color:var(--gold-dim)">
      <button class="attack-row" style="width:100%; text-align:left; background:none; border:0; padding:0"
              onclick="openCampaign()">
        <span style="flex-shrink:0; margin-right:11px; font-size:1.2rem">⚔️</span>
        <span class="attack-main">
          <span class="attack-name">${escapeHtml(c.name || 'La tua campagna')}</span>
          <span class="muted" style="font-size:.73rem; display:block">
            ${c.role === 'master' ? 'sei il master' : 'sei un giocatore'} · ${membri} ${membri===1?'membro':'membri'}${daMettere?' · '+daMettere+' da condividere':''}
          </span>
        </span>
        <span class="muted" style="flex-shrink:0">›</span>
      </button>
    </div>`;
  }
  return `<button class="btn btn-ghost btn-block btn-sm" style="margin-top:16px" onclick="openCampaign()">⚔️ Entra in una campagna</button>`;
}
/* La carta del personaggio nella schermata iniziale. È la prima cosa
   che si vede aprendo l'app, e per mesi è stata una riga con una
   pastiglia da 56 pixel: il ritratto che avevi caricato si intravedeva
   appena. Adesso il ritratto è la carta — intero, non ritagliato — e
   toccarla in qualunque punto apre la scheda. */
function charCardHTML(c){
  const pct = hpPctFor(c);
  const pf = (c.hp && c.hp.max) ? ((c.hp.current ?? 0) + ' / ' + c.hp.max) : '';
  const sotto = [escapeHtml(c.classField || 'Avventuriero') + ' · Lv ' + (c.level || 1),
                 c.race ? escapeHtml(c.race) : ''].filter(Boolean).join(' · ');
  // due segni che in gioco contano, leggibili senza aprire nulla
  const segni = [];
  if (c.concentration) segni.push('<span class="hero-card-segno" title="Sta concentrando">🌀</span>');
  if ((c.conditions || []).length) segni.push('<span class="hero-card-segno" title="' +
    attr((c.conditions||[]).map(x => (typeof x === 'string' ? x : x.name || '')).filter(Boolean).join(', ')) +
    '">⚠️ ' + c.conditions.length + '</span>');
  if (c.activeForm) segni.push('<span class="hero-card-segno" title="In forma selvatica">🐾</span>');

  return `
    <button class="hero-card" onclick="openSheet('${c.id}')" aria-label="Apri la scheda di ${attr(c.name||'questo personaggio')}">
      <div class="hero-card-ritratto">
        ${c.portrait
          ? `<img class="hero-card-sfondo" src="${attr(c.portrait)}" alt="" aria-hidden="true">
             <img class="hero-card-img" src="${attr(c.portrait)}" alt="">`
          : `<div class="hero-card-glifo">${escapeHtml(c.avatar || '⚔️')}</div>`}
        <div class="hero-card-velo"></div>
        ${segni.length ? `<div class="hero-card-segni">${segni.join('')}</div>` : ''}
        <div class="hero-card-livello">LIV ${c.level || 1}</div>
        <div class="hero-card-testo">
          <div class="hero-card-nome">${escapeHtml(c.name || 'Senza nome')}</div>
          <div class="hero-card-sotto">${sotto}</div>
        </div>
      </div>
      <div class="hero-card-pf">
        <div class="hp-mini"><div class="hp-mini-fill ${pct<=25?'low':''}" style="width:${pct}%"></div></div>
        ${pf ? `<span class="hero-card-pf-num">${pf} PF</span>` : ''}
      </div>
    </button>
  `;
}

/* ─── 12. CREAZIONE / MODIFICA PERSONAGGIO ─── */
let draftChar = null;
function openCharacterForm(existingId){
  const c = existingId ? charById(existingId) : null;
  draftChar = c ? JSON.parse(JSON.stringify(c)) : newCharacter();
  openModal({ render: () => characterFormHTML(!!c), after: () => { if (!c){ const el = document.getElementById('cf-name'); if (el) el.focus(); } } });
}
function pickDraftClass(val){
  draftChar.classField = val;
  applyClassDefaults(draftChar, true);
  renderModalRoot();
}
function characterFormHTML(isEdit){
  const d = draftChar;
  const inner = `
      <div class="field">
        <label>Nome</label>
        <input id="cf-name" value="${attr(d.name)}" placeholder="Es. Elyndra Sussurronotte" oninput="draftChar.name=this.value">
      </div>
      <div class="form-row">
        <div class="field"><label>Razza</label><input value="${attr(d.race)}" placeholder="Es. Elfo" oninput="draftChar.race=this.value"></div>
        <div class="field"><label>Classe</label>
          <select onchange="pickDraftClass(this.value)">
            <option value="">—</option>
            ${CLASS_LIST_IT.map(cl=>`<option value="${cl}" ${d.classField===cl?'selected':''}>${cl}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="field"><label>Livello</label><input type="number" inputmode="numeric" min="1" max="20" value="${d.level||1}" oninput="draftChar.level=clamp(parseInt(this.value)||1,1,20)"></div>
        <div class="field"><label>Allineamento</label><input value="${attr(d.alignment||'')}" placeholder="Es. Neutrale Buono" oninput="draftChar.alignment=this.value"></div>
      </div>
      <div class="field">
        <label>Sesso</label>
        <div class="chip-row">
          ${SEXES.map(x=>`<button type="button" class="chip ${d.sex===x.id?'active':''}" onclick="draftChar.sex = draftChar.sex==='${x.id}' ? '' : '${x.id}'; renderModalRoot()">${x.label}</button>`).join('')}
        </div>
      </div>
      <div class="field">
        <label>Background</label>
        <div class="chip-row" style="margin-bottom:8px;">
          ${backgroundNames().map(b=>`<button type="button" class="chip ${d.background===b?'active':''}" onclick="draftChar.background='${jsStr(b)}'; renderModalRoot()">${escapeHtml(b)}</button>`).join('')}
        </div>
        <input value="${attr(d.background||'')}" placeholder="…oppure scrivi il tuo" oninput="draftChar.background=this.value">
      </div>
      <div class="form-row-3">
        <div class="field"><label>PF max</label><input type="number" inputmode="numeric" min="1" value="${getPath(d,'hp.max',10)}" oninput="draftChar.hp=draftChar.hp||{}; draftChar.hp.max=clamp(parseInt(this.value)||1,1,9999); if(!draftChar.hp.current||draftChar.hp.current>draftChar.hp.max) draftChar.hp.current=draftChar.hp.max"></div>
        <div class="field"><label>CA</label><input type="number" inputmode="numeric" value="${d.ac??10}" oninput="draftChar.ac=clamp(parseInt(this.value)||0,0,40)"></div>
        <div class="field"><label>Dado Vita</label>
          <select onchange="draftChar.hitDie=parseInt(this.value)">
            ${[6,8,10,12].map(hd=>`<option value="${hd}" ${(d.hitDie||8)===hd?'selected':''}>d${hd}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="field"><label>Tipo incantatore</label>
          <select onchange="draftChar.casterType=this.value">
            ${CASTER_TYPES.map(ct=>`<option value="${ct.key}" ${(d.casterType||'none')===ct.key?'selected':''}>${ct.label}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Caratteristica magia</label>
          <select onchange="draftChar.spellAbility=this.value">
            ${['int','wis','cha'].map(k=>`<option value="${k}" ${(d.spellAbility||'int')===k?'selected':''}>${ABILITY_BY_KEY[k].label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field">
        <label>Ritratto</label>
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
          ${avatarHTML(d, 64)}
          <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
            <button class="btn btn-ghost btn-sm" onclick="choosePortrait(setDraftPortrait)">📷 ${d.portrait?'Cambia foto':'Carica una foto'}</button>
            ${d.portrait?`<button class="btn btn-ghost btn-sm" onclick="setDraftPortrait(null)">Togli la foto</button>`:''}
          </div>
        </div>
        <div class="field-hint" style="margin-bottom:8px">Senza foto viene usato il simbolo scelto qui sotto.</div>
        <div class="chip-row">
          ${AVATAR_GLYPHS.map(g=>`<button class="chip ${d.avatar===g?'active':''}" style="font-size:1.1rem;padding:8px 12px;${d.portrait?'opacity:.75;':''}" onclick="draftChar.avatar='${jsStr(g)}'; renderModalRoot()" aria-label="Simbolo ${g}">${g}</button>`).join('')}
        </div>
      </div>
      <button class="btn btn-primary btn-block" style="margin-top:6px" onclick="saveCharacterDraft(${isEdit})">${isEdit?'Salva modifiche':'Crea personaggio'}</button>
      ${isEdit?`<div class="btn-row" style="margin-top:10px">
          <button class="btn btn-ghost" onclick="duplicateCharacter('${d.id}')">⧉ Duplica</button>
          <button class="btn btn-danger" onclick="confirmDeleteCharacter('${d.id}')">Elimina</button>
        </div>`:''}`;
  return modalShell(isEdit?'Modifica personaggio':'Nuovo personaggio', inner);
}
function saveCharacterDraft(isEdit){
  if (!draftChar.name || !draftChar.name.trim()){ toast('Dai un nome al personaggio prima di continuare'); return; }
  draftChar.hp = draftChar.hp || { current: 10, max: 10, temp: 0 };
  if (!draftChar.hp.current) draftChar.hp.current = draftChar.hp.max || 10;
  draftChar.hp.current = clamp(draftChar.hp.current, 0, draftChar.hp.max || 9999);
  migrateCharacter(draftChar);
  const idx = state.characters.findIndex(c=>c.id===draftChar.id);
  if (idx>=0) state.characters[idx] = draftChar; else state.characters.push(draftChar);
  if (!currentUser) state.offlineMode = true;
  fsSet('characters', draftChar);
  const newId = draftChar.id;
  closeModal();
  if (!isEdit) openSheet(newId); else render();
  toast(isEdit ? '✓ Modifiche salvate' : '✦ Personaggio creato');
}
function duplicateCharacter(id){
  const c = charById(id); if (!c) return;
  const copy = JSON.parse(JSON.stringify(c));
  copy.id = uid(); copy.createdAt = Date.now();
  copy.name = (c.name||'Senza nome') + ' (copia)';
  state.characters.push(copy);
  fsSet('characters', copy);
  closeModal(); render();
  toast('⧉ Copia creata');
}
function confirmDeleteCharacter(id){
  const c = charById(id);
  confirmDialog('Eliminare ' + (c?c.name:'questo personaggio') + '?', 'La scheda e tutti i suoi dati andranno persi definitivamente.', () => doDeleteCharacter(id), 'Elimina');
}
function doDeleteCharacter(id){
  const c = state.characters.find(x=>x.id===id);
  if (typeof nelCestino === 'function') nelCestino('characters', c);
  state.characters = state.characters.filter(c=>c.id!==id);
  fsDelete('characters', id);
  saveLocal();
  if (state.activeCharId === id){ state.view='party'; state.activeCharId=null; replaceNav(); }
  render();
  toast('Personaggio eliminato');
}

/* ─── 13. MODIFICHE AI CAMPI ─── */
function updateCharField(id, path, value){
  const c = charById(id); if (!c) return;
  setPath(c, path, value);
  scheduleSave('characters', c);
}
function updateAbility(charId, key, value){
  const c = charById(charId); if (!c) return;
  const score = clamp(parseInt(value)||10, 1, 30);
  const modPrec = key === 'dex' ? mod(getPath(c,'abilities.dex',10)) : null;
  setPath(c, 'abilities.'+key, score);
  if (key === 'dex') c.__dexModPrec = modPrec;
  refreshDerived(c, key);
  scheduleSave('characters', c);
}
// Aggiorna solo i numeri che cambiano, senza ridisegnare la pagina
// (così la tastiera resta aperta e non si perde la posizione).
function refreshDerived(c, key){
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  if (key){
    set('mod-'+key, modStr(getPath(c,'abilities.'+key,10)));
    set('savemod-'+key, signStr(saveMod(c,key)));
    SKILLS.filter(s=>s.ability===key).forEach(s=> set('skmod-'+s.key, signStr(skillMod(c,s))));
    if (key === 'dex'){
      // Sposta l'iniziativa della differenza invece di riscriverla: chi ha
      // Attento o simili si ritrovava il bonus cancellato senza avviso.
      const nuovo = mod(getPath(c,'abilities.dex',10));
      const vecchio = Number.isFinite(c.__dexModPrec) ? c.__dexModPrec : null;
      const attuale = Number(c.initiative);
      c.initiative = (vecchio !== null && Number.isFinite(attuale))
        ? attuale + (nuovo - vecchio)   // sposta, non riscrive
        : nuovo;
      delete c.__dexModPrec;
      const initEl = document.getElementById('cs-init'); if (initEl && document.activeElement !== initEl) initEl.value = c.initiative;
    }
    if (key === 'wis') set('passive-perc', passivePerception(c));
  } else {
    ABILITIES.forEach(a => { set('mod-'+a.key, modStr(getPath(c,'abilities.'+a.key,10))); set('savemod-'+a.key, signStr(saveMod(c,a.key))); });
    SKILLS.forEach(s => set('skmod-'+s.key, signStr(skillMod(c,s))));
    set('passive-perc', passivePerception(c));
  }
}
// niente → competente → esperto (doppia competenza) → niente
function toggleSkillProf(id, key, btn){
  const c = charById(id); if (!c) return;
  c.skillProf = c.skillProf||[]; c.skillExpert = c.skillExpert||[];
  const lvl = skillLevel(c, key);
  const drop = (arr) => { const i = arr.indexOf(key); if (i>=0) arr.splice(i,1); };
  drop(c.skillProf); drop(c.skillExpert);
  if (lvl === 0) c.skillProf.push(key);
  else if (lvl === 1) c.skillExpert.push(key);
  if (btn){
    const nl = skillLevel(c, key);
    btn.classList.toggle('on', nl > 0);
    btn.classList.toggle('expert', nl === 2);
    btn.title = nl === 2 ? 'Esperto (competenza doppia)' : (nl === 1 ? 'Competente' : 'Non competente');
  }
  const s = SKILLS.find(x=>x.key===key);
  const el = document.getElementById('skmod-'+key); if (el) el.textContent = signStr(skillMod(c,s));
  const pp = document.getElementById('passive-perc'); if (pp) pp.textContent = passivePerception(c);
  scheduleSave('characters', c);
}
function toggleSaveProf(id, key, btn){
  const c = charById(id); if (!c) return;
  c.saveProf = c.saveProf||[];
  const i = c.saveProf.indexOf(key);
  if (i>=0) c.saveProf.splice(i,1); else c.saveProf.push(key);
  if (btn) btn.classList.toggle('on', c.saveProf.includes(key));
  const el = document.getElementById('savemod-'+key); if (el) el.textContent = signStr(saveMod(c,key));
  scheduleSave('characters', c);
}

/* ─── PUNTI FERITA ─── */
function bumpHP(id, delta){
  const c = charById(id); if (!c) return;
  const max = getPath(c,'hp.max',0);
  if (delta < 0){
    // I PF temporanei assorbono per primi, come da regolamento.
    let dmg = -delta;
    const temp = Number(c.hp.temp)||0;
    if (temp > 0){ const absorbed = Math.min(temp, dmg); c.hp.temp = temp - absorbed; dmg -= absorbed; }
    if (dmg > 0) setPath(c,'hp.current', clamp(getPath(c,'hp.current',0) - dmg, 0, max));
  } else {
    setPath(c,'hp.current', clamp(getPath(c,'hp.current',0) + delta, 0, max));
  }
  if (getPath(c,'hp.current',0) > 0) c.deathSaves = { win:0, fail:0 };
  else if (c.concentration) c.concentration = null;  // svenire interrompe la concentrazione
  scheduleSave('characters', c);
  render();
}
function setHP(id, val){
  const c = charById(id); if (!c) return;
  // campo svuotato per riscrivere: si aspetta, non si azzerano i PF
  if (String(val).trim() === '') return;
  setPath(c,'hp.current', clamp(parseInt(val)||0, 0, getPath(c,'hp.max',9999)));
  refreshHPDisplay(c, false);
  scheduleSave('characters', c);
}
function setHPMax(id, val){
  const c = charById(id); if (!c) return;
  const max = clamp(parseInt(val)||1, 1, 9999);
  setPath(c,'hp.max', max);
  if (getPath(c,'hp.current',0) > max) setPath(c,'hp.current', max);
  refreshHPDisplay(c, true);
  scheduleSave('characters', c);
}
function refreshHPDisplay(c, updateInput){
  const cur = getPath(c,'hp.current',0), max = getPath(c,'hp.max',0);
  const numEl = document.getElementById('hp-current'); if (numEl) numEl.textContent = cur;
  const maxEl = document.getElementById('hp-max-lbl'); if (maxEl) maxEl.textContent = '/ ' + max + ' PF';
  const fillEl = document.getElementById('hp-bar-fill');
  if (fillEl){ const pct = hpPctFor(c); fillEl.style.width = pct + '%'; fillEl.classList.toggle('low', pct <= 25); }
  if (updateInput){ const i = document.getElementById('hp-current-input'); if (i && document.activeElement !== i) i.value = cur; }
}
function toggleDeathSave(id, kind, idx){
  const c = charById(id); if (!c) return;
  c.deathSaves = c.deathSaves || {win:0, fail:0};
  const cur = c.deathSaves[kind] || 0;
  c.deathSaves[kind] = idx < cur ? idx : idx + 1;
  scheduleSave('characters', c);
  render();
  if (c.deathSaves.win >= 3) toast('✓ Stabilizzato!');
  if (c.deathSaves.fail >= 3) toast('💀 Tiri salvezza contro morte falliti');
}

/* ─── 14. SCHEDA PERSONAGGIO ─── */
function renderCharacterSheet(){
  const c = charById(state.activeCharId);
  if (!c){ state.view = 'party'; return renderParty(); }
  let tab;
  const showSpells = (c.casterType && c.casterType !== 'none') || (c.knownSpells||[]).length > 0;
  if (state.sheetTab === 'spells' && !showSpells) state.sheetTab = 'overview';
  if (state.sheetTab === 'inventory') tab = renderSheetInventory(c);
  else if (state.sheetTab === 'spells') tab = renderSheetSpells(c);
  else if (state.sheetTab === 'background') tab = renderSheetBackground(c);
  else if (state.sheetTab === 'notes') tab = renderSheetNotes(c);
  else tab = renderSheetOverview(c);

  return `
    <div class="topbar">
      <button class="topbar-back" onclick="goView('party')" aria-label="Torna al party">←</button>
      <button onclick="choosePortrait(u=>setCharPortrait('${c.id}',u))" title="Tocca per cambiare il ritratto" style="flex-shrink:0">${avatarHTML(c, 42)}</button>
      <button style="flex:1; min-width:0; text-align:left; background:none; border:0; padding:0; color:inherit; cursor:pointer" onclick="openCharSwitcher()" title="Cambia personaggio">
        <div class="topbar-title">${escapeHtml(c.name||'Senza nome')}${state.characters.length>1?' <span style="opacity:.5; font-size:.7em">▾</span>':''}</div>
        <div class="topbar-sub">${escapeHtml(c.classField||'Avventuriero')} · Lv ${c.level||1}${c.race?(' · '+escapeHtml(c.race)):''}</div>
      </button>
      <div class="topbar-actions">
        <button class="btn-icon" onclick="openTurno('${c.id}')" aria-label="Il tuo turno" title="Il tuo turno">⚔️</button>
        <button class="btn-icon" onclick="openRestModal('${c.id}')" aria-label="Riposo" title="Riposo">🏕️</button>
        <button class="btn-icon" onclick="openSheetMenu('${c.id}')" aria-label="Altre azioni" title="Altre azioni">⋯</button>
      </div>
    </div>
    ${activeFormBanner(c)}
    <div class="segmented" style="margin:14px 0;">
      <button class="${state.sheetTab==='overview'?'active':''}" onclick="setSheetTab('overview')">Panoramica</button>
      <button class="${state.sheetTab==='inventory'?'active':''}" onclick="setSheetTab('inventory')">Zaino</button>
      ${showSpells?`<button class="${state.sheetTab==='spells'?'active':''}" onclick="setSheetTab('spells')">Magie</button>`:''}
      <button class="${state.sheetTab==='background'?'active':''}" onclick="setSheetTab('background')">Storia</button>
      <button class="${state.sheetTab==='notes'?'active':''}" onclick="setSheetTab('notes')">Note</button>
    </div>
    <div id="sheet-tab-body">${tab}</div>
  `;
}

function renderSheetOverview(c){
  const cur = getPath(c,'hp.current',0), max = getPath(c,'hp.max',0), pct = hpPctFor(c);
  const dying = cur <= 0;
  return `
  <div class="desk-2">
    <div>
      <div class="ability-grid">
        ${ABILITIES.map(a => `
          <div class="ability-seal">
            <div class="lbl">${a.abbr}</div>
            <button class="seal" style="width:58px;height:58px;" onclick="rollAbility('${c.id}','${a.key}')" title="Tira prova di ${a.label}">
              <div class="mod" id="mod-${a.key}">${modStr(getPath(c,'abilities.'+a.key,10))}</div>
            </button>
            <input type="number" inputmode="numeric" value="${getPath(c,'abilities.'+a.key,10)}" min="1" max="30"
                   aria-label="Punteggio ${a.label}" oninput="updateAbility('${c.id}','${a.key}', this.value)">
          </div>`).join('')}
      </div>

      <div class="combat-grid">
        <div class="combat-stat"><input type="number" inputmode="numeric" class="v" value="${c.ac??10}" aria-label="Classe Armatura" oninput="updateCharField('${c.id}','ac',parseInt(this.value)||0)"><div class="l">CA</div></div>
        <div class="combat-stat"><input type="number" inputmode="numeric" class="v" id="cs-init" value="${c.initiative ?? mod(getPath(c,'abilities.dex',10))}" aria-label="Iniziativa" oninput="updateCharField('${c.id}','initiative',parseInt(this.value)||0)"><div class="l">Iniziativa</div></div>
        <button class="combat-stat tappable" onclick="rollInitiative('${c.id}')"><div class="v">🎲</div><div class="l">Tira iniziativa</div></button>
      </div>
      <div class="combat-grid">
        <div class="combat-stat"><input type="number" inputmode="numeric" class="v" value="${c.speed??9}" aria-label="Velocità" oninput="updateCharField('${c.id}','speed',parseInt(this.value)||0)"><div class="l">Velocità (m)</div></div>
        <div class="combat-stat"><div class="v" id="passive-perc">${passivePerception(c)}</div><div class="l">Percez. pass.</div></div>
        <div class="combat-stat"><div class="v">${hitDiceLeft(c)}<span style="font-size:.8rem">d${c.hitDie||8}</span></div><div class="l">Dadi vita</div></div>
      </div>
      ${xpBarHTML(c)}
      <div class="combat-grid">
        <div class="combat-stat"><div class="v">${signStr(profBonus(c.level))}</div><div class="l">Competenza</div></div>
        <div class="combat-stat"><div class="v">${signStr(saveMod(c,'con'))}</div><div class="l">TS Cost.</div></div>
        <div class="combat-stat"><div class="v">${c.casterType && c.casterType!=='none' ? (8 + spellcastingMod(c)) : signStr(skillMod(c, SKILLS.find(s=>s.key==='perception')))}</div><div class="l">${c.casterType && c.casterType!=='none' ? 'CD incantesimi' : 'Percezione'}</div></div>
      </div>

      <div class="hp-block" style="margin-top:10px">
        <div class="hp-block-top">
          <div><span class="hp-num" id="hp-current">${cur}</span> <span class="hp-max" id="hp-max-lbl">/ ${max} PF</span></div>
          ${getPath(c,'hp.temp',0) ? `<span class="badge arcane">+${getPath(c,'hp.temp',0)} temp.</span>` : ''}
        </div>
        <div class="hp-bar-lg"><div class="hp-bar-lg-fill ${pct<=25?'low':''}" id="hp-bar-fill" style="width:${pct}%"></div></div>
        <div class="hp-controls">
          <button class="stepper-btn" onclick="bumpHP('${c.id}',-5)" aria-label="-5 PF">−5</button>
          <button class="stepper-btn" onclick="bumpHP('${c.id}',-1)" aria-label="-1 PF">−</button>
          <input type="number" inputmode="numeric" id="hp-current-input" value="${cur}" aria-label="PF attuali" oninput="setHP('${c.id}', this.value)">
          <button class="stepper-btn" onclick="bumpHP('${c.id}',1)" aria-label="+1 PF">+</button>
          <button class="stepper-btn" onclick="bumpHP('${c.id}',5)" aria-label="+5 PF">+5</button>
        </div>
        <div class="mini-fields">
          <div class="mini-field"><label>PF max</label><input type="number" inputmode="numeric" value="${max}" oninput="setHPMax('${c.id}', this.value)"></div>
          <div class="mini-field"><label>PF temp.</label><input type="number" inputmode="numeric" value="${getPath(c,'hp.temp',0)}" oninput="updateCharField('${c.id}','hp.temp',clamp(parseInt(this.value)||0,0,999))"></div>
          <div class="mini-field"><label>Dado vita</label><input type="text" value="d${c.hitDie||8}" readonly style="opacity:.7"></div>
        </div>
        ${dying ? `
        <div class="death-saves">
          <div class="ds-group">
            <span class="ds-label" style="color:var(--good)">Successi</span>
            ${[0,1,2].map(i=>`<button class="ds-dot win ${i < (c.deathSaves.win||0) ? 'on':''}" onclick="toggleDeathSave('${c.id}','win',${i})" aria-label="Successo ${i+1}"></button>`).join('')}
          </div>
          <div class="ds-group">
            ${[0,1,2].map(i=>`<button class="ds-dot fail ${i < (c.deathSaves.fail||0) ? 'on':''}" onclick="toggleDeathSave('${c.id}','fail',${i})" aria-label="Fallimento ${i+1}"></button>`).join('')}
            <span class="ds-label" style="color:var(--garnet-bright)">Fallimenti</span>
          </div>
        </div>
        <button class="btn btn-ghost btn-block btn-sm" style="margin-top:10px" onclick="rollDeathSave('${c.id}')">💀 Tiro salvezza contro morte</button>
        ` : ''}
        <div class="btn-row" style="margin-top:12px">
          <button class="btn btn-ghost btn-sm" onclick="openRestModal('${c.id}','short')">☀️ Riposo breve</button>
          <button class="btn btn-ghost btn-sm" onclick="openRestModal('${c.id}','long')">🌙 Riposo lungo</button>
        </div>
      </div>

      <div class="status-row">
        <button class="status-chip ${c.inspiration?'on':''}" onclick="toggleInspiration('${c.id}')" title="Ispirazione">✨ Ispirazione</button>
        <button class="status-chip ${c.exhaustion?'warn':''}" onclick="bumpExhaustion('${c.id}')" title="Tocca per aumentare, tieni a 0 per azzerare">💀 Sfinimento ${c.exhaustion||0}</button>
      </div>
      ${conditionsRowHTML(c)}
      ${c.senses ? `<div class="card" style="margin-top:10px"><div class="card-title">👁️ Sensi</div><div class="muted">${escapeHtml(c.senses)}</div></div>` : ''}

      <div class="divider"><span class="flourish">❧</span><span>Attacchi</span></div>
      <div class="list-gap">
        ${(c.attacks||[]).length ? c.attacks.map((atk,i)=>attackRowHTML(c,atk,i)).join('') : `<div class="muted" style="text-align:center;padding:10px">Nessun attacco. Aggiungi armi o trucchetti offensivi per tirarli con un tocco.</div>`}
        <button class="btn btn-ghost btn-block btn-sm" onclick="editAttack('${c.id}',-1)">✦ Aggiungi attacco</button>
        ${weaponPickerButton(c)}
      </div>

      ${(c.resources||[]).length ? `
      <div class="divider"><span class="flourish">❧</span><span>Risorse</span></div>
      <div class="list-gap">${c.resources.map((r,i)=>resourceRowHTML(c,r,i)).join('')}</div>` : ''}
      <button class="btn btn-ghost btn-block btn-sm" style="margin-top:10px" onclick="editResource('${c.id}',-1)">✦ Aggiungi risorsa</button>
      ${companionsBlockHTML(c)}
    </div>

    <div>
      <div class="divider"><span class="flourish">❧</span><span>Tiri Salvezza</span></div>
      <div class="card"><div class="skills-list">
        ${ABILITIES.map(a=>`<div class="save-row">
          <button class="skill-dot ${(c.saveProf||[]).includes(a.key)?'on':''}" onclick="toggleSaveProf('${c.id}','${a.key}', this)" aria-label="Competenza ${a.label}"></button>
          <button class="skill-tap" onclick="rollSave('${c.id}','${a.key}')">
            <span class="skill-name">${a.label}</span>
            <span class="skill-mod" id="savemod-${a.key}">${signStr(saveMod(c,a.key))}</span>
          </button>
        </div>`).join('')}
      </div></div>

      <div class="divider"><span class="flourish">❧</span><span>Abilità</span></div>
      <div class="card"><div class="skills-list">
        ${SKILLS.map(s=>`<div class="skill-row">
          <button class="skill-dot ${skillLevel(c,s.key)?'on':''} ${skillLevel(c,s.key)===2?'expert':''}" onclick="toggleSkillProf('${c.id}','${s.key}', this)" title="${skillLevel(c,s.key)===2?'Esperto (competenza doppia)':(skillLevel(c,s.key)===1?'Competente':'Non competente')}" aria-label="Competenza ${s.label}"></button>
          <button class="skill-tap" onclick="rollSkill('${c.id}','${s.key}')">
            <span class="skill-name">${s.label}</span>
            <span class="skill-ability">${ABILITY_BY_KEY[s.ability].abbr}</span>
            <span class="skill-mod" id="skmod-${s.key}">${signStr(skillMod(c,s))}</span>
          </button>
        </div>`).join('')}
      </div></div>
      <div class="roll-hint">Tocca il nome di un'abilità o il sigillo di una caratteristica per tirare il d20.</div>

      <div class="roll-hint" style="margin-top:14px">Talenti, linguaggi e privilegi sono nella scheda <b>Note</b>.</div>
    </div>
  </div>`;
}

/* ─── Attacchi ─── */
function attackRowHTML(c, atk, i){
  return `<div class="attack-row">
    <button class="attack-main" onclick="editAttack('${c.id}',${i})">
      <div class="attack-name">${escapeHtml(atk.name||'Attacco')}</div>
      ${atk.notes?`<div class="muted" style="font-size:.7rem">${escapeHtml(atk.notes)}</div>`:''}
    </button>
    ${atk.atk!=='' && atk.atk!=null ? `<button class="attack-btn" onclick="rollAttack('${c.id}',${i})" title="Tira per colpire">${escapeHtml(signStr(parseInt(atk.atk)||0))}</button>` : ''}
    ${atk.dmg ? `<button class="attack-btn dmg" onclick="rollDamage('${c.id}',${i})" title="Tira i danni">${escapeHtml(atk.dmg)}</button>` : ''}
  </div>`;
}
function editAttack(charId, i){
  const c = charById(charId); if (!c) return;
  const atk = i>=0 ? c.attacks[i] : { name:'', atk:'', dmg:'', notes:'' };
  if (!atk) return;
  const inner = `
    <div class="field"><label>Nome</label><input id="atk-name" value="${attr(atk.name)}" placeholder="Es. Pugnale rituale"></div>
    <div class="form-row">
      <div class="field"><label>Bonus per colpire</label><input id="atk-bonus" inputmode="numeric" value="${attr(atk.atk)}" placeholder="+5"></div>
      <div class="field"><label>Danni</label><input id="atk-dmg" value="${attr(atk.dmg)}" placeholder="1d4+2"></div>
    </div>
    <div class="chip-row" style="margin:-4px 0 12px">
      <span class="muted" style="font-size:.72rem; align-self:center">Bonus rapido:</span>
      ${[['str','Forza'],['dex','Destrezza']].map(([k,l])=>{
        const b = mod(getPath(c,'abilities.'+k,10)) + profBonus(c.level);
        return `<button class="chip" onclick="document.getElementById('atk-bonus').value='${signStr(b)}'; document.getElementById('atk-dmg').value=document.getElementById('atk-dmg').value||'1d8${signStr(mod(getPath(c,'abilities.'+k,10)))}'">${l} ${signStr(b)}</button>`;
      }).join('')}
      ${(c.casterType && c.casterType!=='none') ? `<button class="chip" onclick="document.getElementById('atk-bonus').value='${signStr(spellcastingMod(c))}'">Magia ${signStr(spellcastingMod(c))}</button>` : ''}
    </div>
    <div class="field"><label>Note</label><input id="atk-notes" value="${attr(atk.notes||'')}" placeholder="Tipo di danno, gittata, proprietà…"></div>
    <button class="btn btn-primary btn-block" onclick="saveAttack('${charId}',${i})">${i>=0?'Salva':'Aggiungi'}</button>
    ${i>=0?`<button class="btn btn-danger btn-block" style="margin-top:10px" onclick="removeAttack('${charId}',${i})">Elimina</button>`:''}`;
  openModal({ render: () => modalShell(i>=0?'Modifica attacco':'Nuovo attacco', inner), after: () => { const el=document.getElementById('atk-name'); if(el&&i<0) el.focus(); } });
}
function saveAttack(charId, i){
  const c = charById(charId); if (!c) return;
  const name = (document.getElementById('atk-name').value||'').trim();
  if (!name){ toast('Dai un nome all\'attacco'); return; }
  const obj = {
    name,
    atk: (document.getElementById('atk-bonus').value||'').trim(),
    dmg: (document.getElementById('atk-dmg').value||'').trim(),
    notes: (document.getElementById('atk-notes').value||'').trim()
  };
  c.attacks = c.attacks || [];
  if (i>=0) c.attacks[i] = obj; else c.attacks.push(obj);
  scheduleSave('characters', c);
  closeModal(); render();
}
function removeAttack(charId, i){
  const c = charById(charId); if (!c) return;
  c.attacks.splice(i,1);
  scheduleSave('characters', c);
  closeModal(); render();
}
function rollAttack(charId, i){
  const c = charById(charId); if (!c) return;
  const atk = c.attacks[i]; if (!atk) return;
  performD20('Attacco: ' + atk.name, parseInt(atk.atk)||0, 'normal', {t:'attack', c:charId, k:i});
}
function rollDamage(charId, i, crit){
  const c = charById(charId); if (!c) return;
  const atk = c.attacks[i]; if (!atk) return;
  const res = rollDiceExpression(atk.dmg, crit);
  if (!res.parts.length){ toast('Danni non riconosciuti: usa un formato come 1d8+3'); return; }
  state.diceHistory.unshift({ label: (crit?'Critico: ':'Danni: ') + atk.name, total: res.total, detail: res.parts.join(' ') });
  state.diceHistory = state.diceHistory.slice(0,30);
  saveSession();
  openModal({ render: () => `
    <div class="overlay center" onclick="if(event.target===this) closeModal()">
      <div class="sheet-modal frame" style="text-align:center;">
        <div class="roll-card">
          <div class="roll-label">${crit?'Critico · ':''}Danni · ${escapeHtml(atk.name)}</div>
          <div class="roll-total" style="margin:14px 0 6px">${res.total}</div>
          <div class="roll-detail">${escapeHtml(res.parts.join('  '))}</div>
        </div>
        <div class="btn-row" style="margin-top:16px">
          <button class="btn btn-ghost btn-sm" onclick="rollDamage('${charId}',${i},true)">✦ Critico</button>
          <button class="btn btn-ghost btn-sm" onclick="rollDamage('${charId}',${i})">↻ Ritira</button>
        </div>
        <button class="btn btn-primary btn-block" style="margin-top:10px" onclick="closeModal()">Chiudi</button>
      </div>
    </div>` });
}
// Legge espressioni tipo "1d8+3", "2d6 + 1d4 - 1"; con crit raddoppia i dadi.
function rollDiceExpression(expr, crit){
  const src = String(expr||'').toLowerCase();
  const m = src.match(/[+-]?\s*(?:\d*d\d+|\d+)(?:\s*[+-]\s*(?:\d*d\d+|\d+))*/);
  const parts = []; let total = 0;
  if (!m) return { total, parts };
  const re = /([+-]?)\s*(\d*)d(\d+)|([+-]?)\s*(\d+)/g;
  let t;
  while ((t = re.exec(m[0].replace(/\s+/g,'')))){
    if (t[3]){
      const sign = t[1]==='-' ? -1 : 1;
      let n = clamp(parseInt(t[2]||'1'),1,100);
      if (crit) n *= 2;
      const sides = clamp(parseInt(t[3]),2,1000);
      const rolls = Array.from({length:n}, ()=>rollDie(sides));
      total += sign * rolls.reduce((x,y)=>x+y,0);
      parts.push(`${n}d${sides} [${rolls.join(', ')}]`);
    } else if (t[5] != null){
      const sign = t[4]==='-' ? -1 : 1;
      total += sign * parseInt(t[5]);
      parts.push((sign<0?'−':'+') + t[5]);
    }
  }
  return { total, parts };
}

/* ─── Risorse (usi limitati) ─── */
const RECOVERY_LABEL = { sr: 'riposo breve', lr: 'riposo lungo', dn: 'alba' };
function resourceRowHTML(c, r, i){
  const total = Number(r.total)||0, left = clamp(r.left==null?total:r.left, 0, Math.max(total,99));
  return `<div class="attack-row">
    <button class="attack-main" onclick="editResource('${c.id}',${i})">
      <div class="attack-name">${escapeHtml(r.name||'Risorsa')}</div>
      <div class="muted" style="font-size:.7rem">Recupero: ${RECOVERY_LABEL[r.recovery]||'—'}</div>
    </button>
    <button class="stepper-btn" style="width:34px;height:34px;font-size:.9rem" onclick="bumpResource('${c.id}',${i},-1)">−</button>
    <span class="inv-qty">${left}/${total||'—'}</span>
    <button class="stepper-btn" style="width:34px;height:34px;font-size:.9rem" onclick="bumpResource('${c.id}',${i},1)">+</button>
  </div>`;
}
function bumpResource(charId, i, d){
  const c = charById(charId); if (!c) return;
  const r = c.resources[i]; if (!r) return;
  const total = Number(r.total)||0;
  r.left = clamp((r.left==null?total:r.left) + d, 0, total||99);
  scheduleSave('characters', c); render();
}
function editResource(charId, i){
  const c = charById(charId); if (!c) return;
  const r = i>=0 ? c.resources[i] : { name:'', total:1, left:1, recovery:'lr' };
  if (!r) return;
  const inner = `
    <div class="field"><label>Nome</label><input id="res-name" value="${attr(r.name)}" placeholder="Es. Luce di cura"></div>
    <div class="form-row">
      <div class="field"><label>Usi totali</label><input id="res-total" type="number" inputmode="numeric" min="0" max="99" value="${Number(r.total)||0}"></div>
      <div class="field"><label>Recupero</label>
        <select id="res-rec">
          <option value="lr" ${r.recovery==='lr'?'selected':''}>Riposo lungo</option>
          <option value="sr" ${r.recovery==='sr'?'selected':''}>Riposo breve</option>
          <option value="dn" ${r.recovery==='dn'?'selected':''}>All'alba</option>
        </select>
      </div>
    </div>
    <button class="btn btn-primary btn-block" onclick="saveResource('${charId}',${i})">${i>=0?'Salva':'Aggiungi'}</button>
    ${i>=0?`<button class="btn btn-danger btn-block" style="margin-top:10px" onclick="removeResource('${charId}',${i})">Elimina</button>`:''}`;
  openModal({ render: () => modalShell(i>=0?'Modifica risorsa':'Nuova risorsa', inner) });
}
function saveResource(charId, i){
  const c = charById(charId); if (!c) return;
  const name = (document.getElementById('res-name').value||'').trim();
  if (!name){ toast('Dai un nome alla risorsa'); return; }
  const total = clamp(parseInt(document.getElementById('res-total').value)||0, 0, 99);
  const recovery = document.getElementById('res-rec').value;
  const obj = { name, total, left: i>=0 ? clamp(c.resources[i].left==null?total:c.resources[i].left,0,total) : total, recovery };
  c.resources = c.resources || [];
  if (i>=0) c.resources[i] = obj; else c.resources.push(obj);
  scheduleSave('characters', c);
  closeModal(); render();
}
function removeResource(charId, i){
  const c = charById(charId); if (!c) return;
  c.resources.splice(i,1);
  scheduleSave('characters', c);
  closeModal(); render();
}
/* ─── Barra dell'esperienza ───
   Quanto manca al livello dopo, con le soglie dell'SRD. Chi gioca a
   traguardi non deve vedersela sempre davanti: resta discreta finché
   non ci metti dei punti. */
function xpNum(c){ const n = parseInt(String(c.xp||'').replace(/[^\d-]/g,''), 10); return Number.isFinite(n) && n > 0 ? n : 0; }
function fmtXp(n){ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

function xpBarHTML(c){
  const xp = xpNum(c);
  const lv = c.level || 1;
  const next = xpForNextLevel(lv);
  const floorXp = xpForLevel(lv);

  if (!xp && !c.xpNext){
    return `<button class="xp-empty" onclick="openXpDialog('${c.id}')">
      <span>✦ Segna i punti esperienza</span>
      <span class="muted" style="font-size:.72rem">Se giocate a traguardi, lascia pure stare.</span>
    </button>`;
  }
  if (next == null){
    return `<div class="xp-block done">
      <div class="row-between"><b style="font-size:.82rem">👑 20° livello</b>
        <button class="btn btn-ghost btn-sm" onclick="openXpDialog('${c.id}')">${fmtXp(xp)} px</button></div>
    </div>`;
  }

  const span = Math.max(1, next - floorXp);
  const done = clamp(xp - floorXp, 0, span);
  const pct = clamp(100 * done / span, 0, 100);
  const missing = Math.max(0, next - xp);
  const ready = xp >= next;

  return `<div class="xp-block ${ready?'ready':''}">
    <div class="row-between" style="align-items:baseline">
      <div><b style="font-size:.82rem">${fmtXp(xp)}</b><span class="muted" style="font-size:.74rem"> / ${fmtXp(next)} px</span></div>
      <button class="btn btn-ghost btn-sm" onclick="openXpDialog('${c.id}')">＋ Esperienza</button>
    </div>
    <div class="xp-bar"><div class="xp-fill" style="width:${pct}%"></div></div>
    ${ready
      ? `<button class="btn btn-gold btn-block btn-sm" style="margin-top:8px" onclick="openLevelUp('${c.id}')">📈 Puoi salire al ${lv+1}° livello</button>`
      : `<div class="muted" style="font-size:.73rem; margin-top:5px">Mancano <b>${fmtXp(missing)}</b> punti al ${lv+1}° livello.</div>`}
  </div>`;
}

let xpDraft = 0;
function openXpDialog(charId){
  const c = charById(charId); if (!c) return;
  xpDraft = 0;
  openModal({ render: () => xpDialogHTML(charId), after: () => {
    const el = document.getElementById('xp-total'); if (el && !el.value) el.value = xpNum(c) || '';
  }});
}
function xpDialogHTML(charId){
  const c = charById(charId); if (!c) return '';
  const xp = xpNum(c);
  const nuovo = Math.max(0, xp + xpDraft);
  const lvDovuto = levelFromXp(nuovo);
  const quick = [25, 50, 100, 250, 500, 1000];
  return modalShell('✦ Punti esperienza', `
    <div class="field"><label>Totale attuale</label>
      <input id="xp-total" type="number" inputmode="numeric" value="${attr(xp || '')}" placeholder="0" oninput="xpSetTotal('${c.id}', this.value)"></div>

    <div class="divider"><span class="flourish">❧</span><span>Aggiungi al volo</span></div>
    <div class="chip-row" style="justify-content:center">
      ${quick.map(q=>`<button class="chip" onclick="xpBump(${q})">+${q}</button>`).join('')}
      ${xpDraft ? `<button class="chip" style="border-color:var(--garnet)" onclick="xpBump(-99999999)">Azzera l'aggiunta</button>` : ''}
    </div>
    ${xpDraft ? `<div class="card" style="margin-top:12px; text-align:center; border-color:var(--gold-dim)">
      <div class="muted" style="font-size:.76rem">In arrivo</div>
      <div style="font-family:var(--font-head); font-size:1.5rem; color:var(--gold)">+${fmtXp(xpDraft)}</div>
      <div class="muted" style="font-size:.78rem">Totale: <b>${fmtXp(nuovo)}</b> punti</div>
    </div>` : ''}

    ${lvDovuto > (c.level||1) ? `<div class="card" style="margin-top:12px; border-color:var(--good)">
      <div class="muted" style="font-size:.8rem">Con ${fmtXp(nuovo)} punti saresti di <b>${lvDovuto}° livello</b> (ora sei ${c.level}°). Dopo aver salvato ti porto alla salita.</div>
    </div>` : ''}

    <div class="btn-row" style="margin-top:16px">
      <button class="btn btn-ghost" onclick="closeModal()">Annulla</button>
      <button class="btn btn-primary" onclick="saveXp('${c.id}')">Salva</button>
    </div>`);
}
function xpBump(n){
  xpDraft = n === -99999999 ? 0 : Math.max(-99999999, xpDraft + n);
  renderModalRoot();
}
function xpSetTotal(charId, v){
  const c = charById(charId); if (!c) return;
  c.xp = String(Math.max(0, parseInt(String(v).replace(/[^\d]/g,''), 10) || 0) || '');
  scheduleSave('characters', c);
}
function saveXp(charId){
  const c = charById(charId); if (!c) return;
  const totale = Math.max(0, xpNum(c) + xpDraft);
  c.xp = String(totale);
  const next = xpForNextLevel(c.level || 1);
  c.xpNext = next != null ? String(next) : '';
  scheduleSave('characters', c);
  const dovuto = levelFromXp(totale);
  xpDraft = 0;
  closeModal(); render();
  if (dovuto > (c.level||1)){
    toast('✦ ' + fmtXp(totale) + ' punti — puoi salire di livello');
    setTimeout(() => openLevelUp(c.id), 600);
  } else {
    toast('✦ ' + fmtXp(totale) + ' punti esperienza');
  }
}

/* Dalla lista degli attacchi si può pescare direttamente un'arma vera */
function weaponPickerButton(c){
  return `<button class="btn btn-ghost btn-block btn-sm" style="margin-top:8px" onclick="openGear('${c.id}','armi')">⚔️ Scegli un'arma dalle tabelle</button>`;
}

function conditionsRowHTML(c){
  const active = (c.conditions||[]).map(id => CONDITION_BY_ID[id]).filter(Boolean);
  return `<div class="chip-row" style="margin-top:10px; align-items:center">
    ${active.map(cond=>`<button class="chip active" style="background:var(--garnet); border-color:var(--garnet-bright)" onclick="toggleCondition('${c.id}','${cond.id}')" title="${attr(cond.desc)}">${cond.icon} ${cond.name} ✕</button>`).join('')}
    <button class="chip" onclick="openConditionPicker('${c.id}')">＋ Condizione</button>
  </div>`;
}
function openConditionPicker(charId){
  const c = charById(charId); if (!c) return;
  const inner = `
    <p class="muted" style="margin-bottom:12px">Tocca una condizione per applicarla o toglierla. Tieni premuto il nome per rileggere cosa comporta.</p>
    <div class="list-gap">
      ${CONDITIONS.map(cond=>{
        const on = (c.conditions||[]).includes(cond.id);
        return `<button class="attack-row" style="width:100%; text-align:left; ${on?'border-color:var(--garnet)':''}" onclick="toggleCondition('${charId}','${cond.id}', true)">
          <span class="attack-main">
            <span class="attack-name">${cond.icon} ${cond.name}${on?' ✓':''}</span>
            <span class="muted" style="font-size:.74rem; display:block">${escapeHtml(cond.desc)}</span>
          </span>
        </button>`;
      }).join('')}
    </div>
    ${(c.conditions||[]).length ? `<button class="btn btn-ghost btn-block" style="margin-top:12px" onclick="clearConditions('${charId}')">Togli tutte</button>` : ''}`;
  openModal({ render: () => modalShell('🎭 Condizioni', inner) });
}
function toggleCondition(charId, condId, keepOpen){
  const c = charById(charId); if (!c) return;
  if (!CONDITION_BY_ID[condId]) return;
  c.conditions = (c.conditions || []).filter(id => CONDITION_BY_ID[id]);
  const i = c.conditions.indexOf(condId);
  if (i >= 0) c.conditions.splice(i,1); else c.conditions.push(condId);
  scheduleSave('characters', c);
  render();
  if (keepOpen) openConditionPicker(charId);
}
function clearConditions(charId){
  const c = charById(charId); if (!c) return;
  c.conditions = [];
  scheduleSave('characters', c);
  closeModal(); render();
}
function activeFormBanner(c){
  if (!c.activeForm) return '';
  const comp = (c.companions||[]).find(x => x.cid === c.activeForm);
  if (!comp) return '';
  const m = (typeof MONSTER_BY_ID !== 'undefined') ? MONSTER_BY_ID[comp.monsterId] : null;
  const pct = comp.hp.max ? clamp(100*comp.hp.current/comp.hp.max,0,100) : 0;
  return `<div class="conc-banner" style="border-color:var(--good); background:rgba(89,168,125,.14); flex-wrap:wrap">
    ${comp.portrait
      ? `<span class="comp-sigillo con-foto" style="width:32px;height:32px;flex-shrink:0"><img src="${attr(comp.portrait)}" alt=""></span>`
      : `<span style="font-size:1.1rem">🐾</span>`}
    <span class="t" style="flex:1 1 120px">Forma di ${escapeHtml(comp.name)} · ${m?`CA ${m.ac} · `:''}${comp.hp.current}/${comp.hp.max} PF</span>
    <button class="btn btn-sm btn-ghost" onclick="openCompanion('${c.id}','${comp.cid}')">Scheda</button>
    <button class="btn btn-sm btn-ghost" onclick="toggleWildShape('${c.id}','${comp.cid}')">Torna normale</button>
    <div class="hp-mini" style="width:100%; margin-top:6px"><div class="hp-mini-fill ${pct<=25?'low':''}" style="width:${pct}%"></div></div>
  </div>`;
}
function toggleInspiration(charId){
  const c = charById(charId); if (!c) return;
  c.inspiration = !c.inspiration;
  scheduleSave('characters', c); render();
}
function bumpExhaustion(charId){
  const c = charById(charId); if (!c) return;
  c.exhaustion = ((c.exhaustion||0) + 1) % 7;
  scheduleSave('characters', c); render();
}

/* ─── Scheda Note ─── */
function renderSheetNotes(c){
  const f = (label, key, ph, big) => `<div class="field"><label>${label}</label>${big
    ? `<textarea style="min-height:${big}px" placeholder="${ph}" oninput="updateCharField('${c.id}','${key}',this.value)">${escapeHtml(c[key]||'')}</textarea>`
    : `<input value="${attr(c[key]||'')}" placeholder="${ph}" oninput="updateCharField('${c.id}','${key}',this.value)">`}</div>`;
  // i campi che spesso contengono elenchi lunghi sono aree di testo
  const fl = (label, key, ph) => f(label, key, ph, 46);
  return `
    <div class="desk-2">
      <div>
        <div class="card-title">Competenze</div>
        ${fl('Linguaggi','languages','Es. Comune, Elfico')}
        ${fl('Strumenti e competenze','tools','Es. Kit da erborista, armi semplici')}
        ${f('Armatura indossata','armor','Es. Vesti rinforzate')}
        ${fl('Armature e armi','profOther','Es. Armature leggere, armi semplici')}
        ${f('Sensi','senses','Es. Scurovisione 18 m')}
        ${f('Capacità di carico (kg)','carryCapacity','Vuoto = Forza × 7,5')}
        <div class="divider"><span class="flourish">❧</span><span>Talenti</span></div>
        ${f('Talenti','feats','Es. Resiliente (Costituzione)','90')}
      </div>
      <div>
        <div class="divider"><span class="flourish">❧</span><span>Privilegi</span></div>
        ${f('Privilegi di classe e capacità','features','Privilegi, invocazioni, canalizzare divinità…','220')}
        ${f('Razza e background','notesRace','Bonus di razza e background','110')}
        ${f('Altre note','notesExtra','Famigli, compagni, promemoria…','160')}
        <div class="divider"><span class="flourish">❧</span><span>Progressione</span></div>
        <div class="form-row">
          <div class="field"><label>Punti esperienza</label><input value="${attr(c.xp||'')}" oninput="updateCharField('${c.id}','xp',this.value)"></div>
          <div class="field"><label>Al prossimo livello</label><input value="${attr(c.xpNext||'')}" oninput="updateCharField('${c.id}','xpNext',this.value)"></div>
        </div>
        <div class="field"><label>Giocatore</label><input value="${attr(c.playerName||'')}" oninput="updateCharField('${c.id}','playerName',this.value)"></div>
      </div>
    </div>`;
}

/* ─── 15. TIRI RAPIDI ─── */
function setRollMode(m){ state.rollMode = m; }
function rollAbility(charId, key){
  const c = charById(charId); if (!c) return;
  performD20('Prova di ' + ABILITY_BY_KEY[key].label, mod(getPath(c,'abilities.'+key,10)), 'normal', {t:'ability', c:charId, k:key});
}
function rollSkill(charId, key){
  const c = charById(charId); if (!c) return;
  const s = SKILLS.find(x=>x.key===key);
  performD20(s.label, skillMod(c, s), 'normal', {t:'skill', c:charId, k:key});
}
function rollSave(charId, key){
  const c = charById(charId); if (!c) return;
  performD20('TS ' + ABILITY_BY_KEY[key].label, saveMod(c, key), 'normal', {t:'save', c:charId, k:key});
}
function rollInitiative(charId){
  const c = charById(charId); if (!c) return;
  performD20('Iniziativa', c.initiative ?? mod(getPath(c,'abilities.dex',10)), 'normal', {t:'init', c:charId});
}
function rollSpellAttack(charId){
  const c = charById(charId); if (!c) return;
  performD20('Attacco con incantesimo', spellcastingMod(c), 'normal', {t:'spellatk', c:charId});
}
function rollDeathSave(charId){
  const nat = rollDie(20);
  const c = charById(charId);
  let extra = '';
  if (c){
    c.deathSaves = c.deathSaves || {win:0,fail:0};
    if (nat === 20){ setPath(c,'hp.current', Math.max(1, getPath(c,'hp.current',0))); c.deathSaves = {win:0,fail:0}; extra = 'Naturale 20: torni cosciente con 1 PF!'; }
    else if (nat === 1){ c.deathSaves.fail = clamp(c.deathSaves.fail + 2, 0, 3); extra = 'Naturale 1: due fallimenti.'; }
    else if (nat >= 10){ c.deathSaves.win = clamp(c.deathSaves.win + 1, 0, 3); extra = 'Successo.'; }
    else { c.deathSaves.fail = clamp(c.deathSaves.fail + 1, 0, 3); extra = 'Fallimento.'; }
    scheduleSave('characters', c);
  }
  showRollResult({ label: 'TS contro morte', nat, modifier: 0, total: nat, mode: 'normal', extra, repeat: {t:'death', c:charId} });
  render();
}
function performD20(label, modifier, mode, repeat){
  const a = rollDie(20), b = rollDie(20);
  let nat = a, other = null;
  if (mode === 'adv'){ nat = Math.max(a,b); other = Math.min(a,b); }
  else if (mode === 'dis'){ nat = Math.min(a,b); other = Math.max(a,b); }
  showRollResult({ label, nat, other, modifier, mode, total: nat + modifier, repeat });
}
function repeatRoll(mode){
  const r = state.lastRoll;
  if (!r || !r.repeat) return;
  const rp = r.repeat;
  const c = charById(rp.c);
  let m = 0, label = r.label;
  if (!c && rp.t !== 'plain') { closeModal(); return; }
  if (rp.t === 'ability') m = mod(getPath(c,'abilities.'+rp.k,10));
  else if (rp.t === 'skill') m = skillMod(c, SKILLS.find(x=>x.key===rp.k));
  else if (rp.t === 'save') m = saveMod(c, rp.k);
  else if (rp.t === 'init') m = c.initiative ?? mod(getPath(c,'abilities.dex',10));
  else if (rp.t === 'spellatk') m = spellcastingMod(c);
  else if (rp.t === 'attack'){ const at = (c.attacks||[])[rp.k]; m = at ? (parseInt(at.atk)||0) : 0; }
  else if (rp.t === 'death'){ rollDeathSave(rp.c); return; }
  else m = r.modifier || 0;
  performD20(label, m, mode, rp);
}
function showRollResult(r){
  state.lastRoll = r;
  const crit = r.nat === 20, fumble = r.nat === 1;
  if (crit) buzz([0, 30, 50, 30, 50, 90]);
  else if (fumble) buzz([0, 140]);
  else buzz(14);
  state.diceHistory.unshift({ label: r.label, total: r.total, detail: `d20 ${r.nat}${r.modifier ? ' ' + signStr(r.modifier) : ''}` });
  state.diceHistory = state.diceHistory.slice(0,30);
  saveSession();
  const modeLabel = r.mode === 'adv' ? 'con vantaggio' : (r.mode === 'dis' ? 'con svantaggio' : '');
  openModal({ render: () => `
    <div class="overlay center" onclick="if(event.target===this) closeModal()">
      <div class="sheet-modal frame" style="text-align:center;">
        <div class="roll-card">
          <div class="roll-label">${escapeHtml(r.label)}${modeLabel ? ' · ' + modeLabel : ''}</div>
          <div class="roll-die-wrap ${crit?'crit':''} ${fumble?'fumble':''}"><div class="roll-die ${crit?'crit':''} ${fumble?'fumble':''}">${r.nat}</div></div>
          <div class="roll-total">${r.total}</div>
          <div class="roll-detail">d20 (${r.nat})${r.other!=null?` · scartato ${r.other}`:''}${r.modifier?` ${signStr(r.modifier)}`:''}</div>
          ${crit?'<div class="roll-verdict crit">✦ Critico! ✦</div>':''}
          ${fumble?'<div class="roll-verdict fumble">Fallimento critico</div>':''}
          ${r.extra?`<div class="roll-verdict">${escapeHtml(r.extra)}</div>`:''}
        </div>
        ${r.repeat ? `<div class="btn-row" style="margin-top:16px">
          <button class="btn btn-ghost btn-sm" onclick="repeatRoll('adv')">▲ Vantaggio</button>
          <button class="btn btn-ghost btn-sm" onclick="repeatRoll('normal')">↻ Ritira</button>
          <button class="btn btn-ghost btn-sm" onclick="repeatRoll('dis')">▼ Svantaggio</button>
        </div>` : ''}
        <button class="btn btn-primary btn-block" style="margin-top:10px" onclick="closeModal()">Chiudi</button>
      </div>
    </div>` });
}

/* ─── 16. RIPOSI ─── */
function openRestModal(charId, focus){
  const c = charById(charId); if (!c) return;
  openModal({ render: () => restModalHTML(charId) });
}
function restModalHTML(charId){
  const c = charById(charId); if (!c) return '';
  const left = hitDiceLeft(c);
  const conMod = mod(getPath(c,'abilities.con',10));
  const srCount = (c.resources||[]).filter(r => r.recovery === 'sr').length;
  const inner = `
    <div class="card" style="margin-bottom:12px">
      <div class="card-title">☀️ Riposo breve</div>
      <p class="muted" style="margin-bottom:12px">Puoi spendere i dadi vita per curarti: ogni dado tira <b>d${c.hitDie||8} ${signStr(conMod)}</b> (Costituzione).</p>
      <div class="row-between" style="margin-bottom:12px">
        <span class="muted">Dadi vita disponibili</span>
        <span class="badge gold">${left} / ${c.level||1}</span>
      </div>
      ${left ? `<div class="btn-row">
        <button class="btn btn-gold" onclick="spendHitDice('${charId}',1)">Spendi 1 dado d${c.hitDie||8}</button>
        ${left>1?`<button class="btn btn-ghost" onclick="spendHitDice('${charId}',${left})">Tutti (${left})</button>`:''}
      </div>` : `<p class="muted">Nessun dado vita rimasto: serve un riposo lungo.</p>`}
      ${c.hitDie2 ? `<div class="row-between" style="margin-top:12px">
        <span class="muted">Seconda classe: d${c.hitDie2}</span>
        <button class="btn btn-sm btn-gold" onclick="spendHitDice('${charId}',1,2)">Spendi 1 dado d${c.hitDie2}</button>
      </div>` : ''}
      ${(srCount || c.casterType==='pact') ? `
        <button class="btn btn-gold btn-block" style="margin-top:10px" onclick="concludiRiposoBreve('${charId}')">✓ Concludi il riposo breve</button>
        <p class="muted" style="font-size:.73rem; margin-top:6px">Ricarica ${[
          srCount ? (srCount===1?'la risorsa che torna col riposo breve':'le '+srCount+' risorse che tornano col riposo breve') : '',
          c.casterType==='pact' ? 'gli slot del Patto' : ''
        ].filter(Boolean).join(' e ')}, anche se non hai speso dadi vita.</p>` : ''}
    </div>
    <div class="card">
      <div class="card-title">🌙 Riposo lungo</div>
      <p class="muted" style="margin-bottom:12px">Ripristina tutti i PF, azzera i PF temporanei e gli slot incantesimo, recupera metà dei dadi vita e cancella i tiri contro morte.</p>
      <button class="btn btn-primary btn-block" onclick="longRest('${charId}')">Effettua riposo lungo</button>
    </div>`;
  return modalShell('🏕️ Riposo', inner);
}
function spendHitDice(charId, n, which){
  const c = charById(charId); if (!c) return;
  const die = which === 2 ? (c.hitDie2||8) : (c.hitDie||8);
  const avail = which === 2 ? clamp((c.level||1) - (c.hitDiceUsed2||0), 0, 20) : hitDiceLeft(c);
  n = clamp(n, 0, avail);
  if (!n) return;
  const conMod = mod(getPath(c,'abilities.con',10));
  const rolls = [];
  let healed = 0;
  for (let i=0;i<n;i++){ const r = rollDie(die); rolls.push(r); healed += Math.max(0, r + conMod); }
  if (which === 2) c.hitDiceUsed2 = (c.hitDiceUsed2||0) + n;
  else c.hitDiceUsed = (c.hitDiceUsed||0) + n;
  const max = getPath(c,'hp.max',0);
  const before = getPath(c,'hp.current',0);
  setPath(c,'hp.current', clamp(before + healed, 0, max));
  const real = getPath(c,'hp.current',0) - before;
  if (getPath(c,'hp.current',0) > 0) c.deathSaves = { win:0, fail:0 };
  scheduleSave('characters', c);
  closeModal(); render();
  toast(`☀️ +${real} PF — ${n}d${die} [${rolls.join(', ')}] ${signStr(conMod)} per dado`);
}
/* Ricarica quello che torna con un riposo breve. Vale anche senza dadi
   vita da spendere: il riposo lo fai comunque. */
function concludiRiposoBreve(charId){
  const c = charById(charId); if (!c) return;
  let n = 0;
  (c.resources||[]).forEach(r => {
    if (r.recovery !== 'sr') return;
    const pieno = Number(r.total)||0;
    if ((Number(r.left)||0) !== pieno) n++;
    r.left = pieno;
  });
  // Il warlock riprende gli slot del Patto a ogni riposo breve.
  if (c.casterType === 'pact'){
    if (Object.values(c.slotsUsed||{}).some(v => (Number(v)||0) > 0)) n++;
    c.slotsUsed = {};
  }
  scheduleSave('characters', c);
  closeModal(); render();
  toast(n ? ('☀️ Riposo breve: ' + n + (n===1?' risorsa recuperata':' risorse recuperate'))
          : '☀️ Riposo breve: non c\'era niente da recuperare');
}
function restorePactSlots(charId){
  const c = charById(charId); if (!c) return;
  c.slotsUsed = {};
  scheduleSave('characters', c);
  closeModal(); render();
  toast('✦ Slot del Patto recuperati');
}
function longRest(charId){
  const c = charById(charId); if (!c) return;
  const max = getPath(c,'hp.max',0);
  setPath(c,'hp.current', max);
  setPath(c,'hp.temp', 0);
  c.slotsUsed = {};
  c.deathSaves = { win:0, fail:0 };
  c.concentration = null;
  const back = Math.max(1, Math.floor((c.level||1)/2));
  c.hitDiceUsed = clamp((c.hitDiceUsed||0) - back, 0, 20);
  c.hitDiceUsed2 = clamp((c.hitDiceUsed2||0) - back, 0, 20);
  (c.resources||[]).forEach(r => { r.left = Number(r.total)||0; });
  scheduleSave('characters', c);
  closeModal(); render();
  toast('🌙 Riposo lungo: PF e slot ripristinati');
}

/* ─── 17. ZAINO ─── */
function totalWeight(c){
  return (c.inventory||[]).reduce((sum, it) => sum + ((parseFloat(String(it.weight).replace(',','.'))||0) * (it.qty||1)), 0);
}
function renderSheetInventory(c){
  const items = c.inventory||[];
  const coins = c.coins || {};
  const w = totalWeight(c);
  const cap = parseFloat(String(c.carryCapacity).replace(',','.')) || (getPath(c,'abilities.str',10) * 7.5);
  return `
    <div class="card" style="margin-bottom:12px">
      <div class="card-title">💰 Borsa</div>
      <div class="coin-grid">
        ${COINS.map(co=>`<div class="coin ${co.key}">
          <label title="${co.title}">${co.label}</label>
          <input type="number" inputmode="numeric" min="0" value="${coins[co.key]||0}" aria-label="${co.title}"
                 oninput="updateCharField('${c.id}','coins.${co.key}',clamp(parseInt(this.value)||0,0,999999))">
        </div>`).join('')}
      </div>
    </div>
    <div class="divider"><span class="flourish">❧</span><span>Equipaggiamento</span></div>
    ${w > 0 ? `<div class="card" style="margin-bottom:10px; padding:11px 14px">
      <div class="row-between" style="margin-bottom:6px"><span class="muted">Peso trasportato</span><b>${w.toFixed(1).replace('.0','')} / ${Math.round(cap)} kg</b></div>
      <div class="hp-bar-lg" style="height:8px;margin:0"><div class="hp-bar-lg-fill ${w>cap?'low':''}" style="width:${clamp(100*w/cap,0,100)}%; background:${w>cap?'':'linear-gradient(90deg,var(--gold-dim),var(--gold))'}"></div></div>
      ${w>cap?`<div class="muted" style="font-size:.72rem;margin-top:6px;color:var(--warn)">Sei sovraccarico: velocità ridotta.</div>`:''}
    </div>` : ''}
    ${attunedCount(c) ? attunementRowHTML(c) : ''}
    <div class="list-gap">
      ${items.length ? items.map((it,i)=>invItemHTML(c,it,i)).join('') : emptyState('🎒','Zaino vuoto. Aggiungi armi, armature e oggetti.')}
    </div>
    <div class="btn-row" style="margin-top:14px">
      <button class="btn btn-primary" onclick="addInventoryItem('${c.id}')">✦ A mano</button>
      <button class="btn btn-gold" onclick="openGear('${c.id}')">🎒 Equipaggiamento</button>
    </div>
    <button class="btn btn-ghost btn-block" style="margin-top:10px" onclick="openMagicItems({pickFor:'${c.id}'})">💍 Oggetti magici</button>
  `;
}
function invItemHTML(c, it, i){
  const magic = it.magicId && typeof MAGIC_ITEM_BY_ID !== 'undefined' ? MAGIC_ITEM_BY_ID[it.magicId] : null;
  const needsAtt = magic ? miNeedsAttunement(magic) : it.attuned;
  const sub = [it.notes, it.weight ? it.weight + ' kg' : ''].filter(Boolean).join(' · ');
  return `<div class="inv-item ${magic?'magic':''}">
    <button class="equip-toggle ${it.equipped?'on':''}" title="Indossato / impugnato" onclick="toggleEquip('${c.id}',${i}, this)">${it.equipped?'✓':'○'}</button>
    <button class="inv-item-main" onclick="editInventoryItem('${c.id}',${i})">
      <div class="inv-item-name ${it.equipped?'equipped':''}">${escapeHtml(it.name)}</div>
      ${sub?`<div class="muted" style="font-size:.72rem;margin-top:2px;">${escapeHtml(sub)}</div>`:''}
    </button>
    ${needsAtt ? `<button class="attune-toggle ${it.attuned?'on':''}" title="${it.attuned?'Sintonizzato':'Sintonizzati'}" onclick="toggleAttune('${c.id}',${i})">⚡</button>` : ''}
    ${magic ? `<button class="btn-icon" style="width:36px;height:36px;font-size:.85rem;" onclick="viewMagicItem('${magic.id}','${c.id}')" aria-label="Cosa fa">?</button>` : ''}
    <span class="inv-qty">×${it.qty||1}</span>
  </div>`;
}
function addInventoryItem(charId){
  const inner = `
    <div class="field"><label>Nome</label><input id="inv-name" placeholder="Es. Spada corta"></div>
    <div class="form-row-3">
      <div class="field"><label>Quantità</label><input id="inv-qty" type="number" inputmode="numeric" min="1" value="1"></div>
      <div class="field"><label>Peso (kg)</label><input id="inv-weight" inputmode="decimal" placeholder="—"></div>
      <div class="field"><label>Sintonia</label>
        <select id="inv-attuned"><option value="">No</option><option value="1">Sì</option></select>
      </div>
    </div>
    <div class="field"><label>Note</label><input id="inv-notes" placeholder="Danni, proprietà, dettagli…"></div>
    <button class="btn btn-primary btn-block" onclick="confirmAddInventory('${charId}')">Aggiungi allo zaino</button>`;
  openModal({ render: () => modalShell('Nuovo oggetto', inner), after: () => { const el = document.getElementById('inv-name'); if (el) el.focus(); } });
}
function confirmAddInventory(charId){
  const c = charById(charId); if (!c) return;
  const nameEl = document.getElementById('inv-name'); if (!nameEl) return;
  const name = nameEl.value.trim();
  if (!name){ toast('Dai un nome all\'oggetto'); nameEl.focus(); return; }
  c.inventory = c.inventory||[];
  c.inventory.push({
    name,
    qty: clamp(parseInt((document.getElementById('inv-qty')||{}).value)||1, 1, 9999),
    weight: ((document.getElementById('inv-weight')||{}).value||'').trim(),
    attuned: !!((document.getElementById('inv-attuned')||{}).value),
    notes: ((document.getElementById('inv-notes')||{}).value||'').trim(),
    equipped: false
  });
  scheduleSave('characters', c);
  closeModal(); render();
}
function toggleEquip(charId, i, btn){
  const c = charById(charId); if (!c || !c.inventory[i]) return;
  c.inventory[i].equipped = !c.inventory[i].equipped;
  if (btn){ btn.classList.toggle('on', c.inventory[i].equipped); btn.textContent = c.inventory[i].equipped ? '✓' : '○';
    const nameEl = btn.parentElement.querySelector('.inv-item-name'); if (nameEl) nameEl.classList.toggle('equipped', c.inventory[i].equipped); }
  scheduleSave('characters', c);
}
function removeInventoryItem(charId, i){
  const c = charById(charId); if (!c || !c.inventory[i]) return;
  const name = c.inventory[i].name;
  confirmDialog('Rimuovere ' + name + '?', 'L\'oggetto verrà tolto dallo zaino.', () => {
    c.inventory.splice(i,1);
    scheduleSave('characters', c); render();
  }, 'Rimuovi');
}
function editInventoryItem(charId, i){
  const c = charById(charId);
  const it = c && (c.inventory||[])[i];
  if (!it) return;
  const inner = `
    <div class="field"><label>Nome</label><input id="inv-edit-name" value="${attr(it.name)}"></div>
    <div class="form-row-3">
      <div class="field"><label>Quantità</label><input id="inv-edit-qty" type="number" inputmode="numeric" min="1" value="${it.qty||1}"></div>
      <div class="field"><label>Peso (kg)</label><input id="inv-edit-weight" inputmode="decimal" value="${attr(it.weight||'')}"></div>
      <div class="field"><label>Sintonia</label>
        <select id="inv-edit-attuned"><option value="" ${!it.attuned?'selected':''}>No</option><option value="1" ${it.attuned?'selected':''}>Sì</option></select>
      </div>
    </div>
    <div class="field"><label>Note</label><input id="inv-edit-notes" value="${attr(it.notes||'')}"></div>
    <div class="btn-row" style="margin-top:14px">
      <button class="btn btn-danger" onclick="removeInventoryItem('${charId}',${i})">Elimina</button>
      <button class="btn btn-primary" onclick="confirmEditInventory('${charId}',${i})">Salva</button>
    </div>`;
  openModal({ render: () => modalShell('Modifica oggetto', inner) });
}
function confirmEditInventory(charId, i){
  const c = charById(charId); if (!c || !c.inventory[i]) return;
  const name = (document.getElementById('inv-edit-name').value||'').trim();
  if (!name){ toast('Dai un nome all\'oggetto'); return; }
  c.inventory[i].name = name;
  c.inventory[i].qty = clamp(parseInt(document.getElementById('inv-edit-qty').value)||1, 1, 9999);
  c.inventory[i].weight = (document.getElementById('inv-edit-weight').value||'').trim();
  c.inventory[i].attuned = !!document.getElementById('inv-edit-attuned').value;
  c.inventory[i].notes = (document.getElementById('inv-edit-notes').value||'').trim();
  scheduleSave('characters', c);
  closeModal(); render();
}

/* ─── 18. MAGIE ─── */
function spellByRef(ref){
  if (!ref) return null;
  if (ref.source === 'custom') return state.customSpells.find(s=>s.id===ref.id);
  if (ref.source === 'shared') return (state.sharedSpells||[]).find(s=>s.id===ref.id);
  return (typeof SRD_SPELLS !== 'undefined' ? SRD_SPELLS : []).find(s=>s.id===ref.id)
      || (state.sharedSpells||[]).find(s=>s.id===ref.id);
}
function slotsFor(c){
  if (c.slotsOverride){
    const arr = [];
    for (let i=1;i<=9;i++) arr[i-1] = clamp(c.slotsOverride[i]||0, 0, 9);
    if (arr.some(n=>n)) return arr;
  }
  return slotsForCharacter(c.casterType, c.level);
}
function renderSheetSpells(c){
  const slots = slotsFor(c);
  const used = c.slotsUsed || {};
  const isCaster = c.casterType && c.casterType !== 'none';
  let known = (c.knownSpells||[]).map(k => ({ ref:k, sp: spellByRef(k) })).filter(x => x.sp);
  known.sort((a,b) => (a.sp.level - b.sp.level) || spellName(a.sp).localeCompare(spellName(b.sp), 'it'));
  const prepared = c.preparedSpells || [];
  if (state.knownFilter === 'prepared') known = known.filter(x => prepared.includes(x.sp.id) || x.sp.level === 0);

  return `
    ${c.concentration ? `<div class="conc-banner">
      <span style="font-size:1.1rem">🌀</span>
      <span class="t">Concentrazione: ${escapeHtml(c.concentration.name)}</span>
      <button class="btn btn-sm btn-ghost" onclick="clearConcentration('${c.id}')">Interrompi</button>
    </div>` : ''}

    <div class="card" style="margin-bottom:12px;">
      <div class="form-row" style="margin-bottom:0;">
        <div class="field" style="margin-bottom:0;"><label>Tipo incantatore</label>
          <select onchange="updateCasterType('${c.id}', this.value)">
            ${CASTER_TYPES.map(ct=>`<option value="${ct.key}" ${(c.casterType||'none')===ct.key?'selected':''}>${ct.label}</option>`).join('')}
          </select>
        </div>
        <div class="field" style="margin-bottom:0;"><label>Caratteristica</label>
          <select onchange="updateCharField('${c.id}','spellAbility',this.value); render();">
            ${['int','wis','cha'].map(k=>`<option value="${k}" ${(c.spellAbility||'int')===k?'selected':''}>${ABILITY_BY_KEY[k].label}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    ${isCaster ? `
      <div class="combat-grid">
        <div class="combat-stat"><div class="v">${8+spellcastingMod(c)}</div><div class="l">CD magia</div></div>
        <button class="combat-stat tappable" onclick="rollSpellAttack('${c.id}')"><div class="v">${signStr(spellcastingMod(c))}</div><div class="l">Attacco 🎲</div></button>
        <div class="combat-stat"><div class="v">${signStr(profBonus(c.level))}</div><div class="l">Competenza</div></div>
      </div>
      <div class="slot-tracker">
        <div class="slot-tracker-head">
          <div class="section-title" style="margin:0;">Slot incantesimo${c.slotsOverride?' ·<span class="badge" style="margin-left:6px">personalizzati</span>':''}</div>
          <div style="display:flex; gap:6px;">
            ${c.slotsOverride?`<button class="btn btn-sm btn-ghost" onclick="clearSlotsOverride('${c.id}')" title="Torna alla tabella automatica">↺ Auto</button>`:''}
            <button class="btn btn-sm btn-ghost" onclick="openRestModal('${c.id}')">🏕️ Riposo</button>
          </div>
        </div>
        ${slots.some(n=>n) ? slots.map((count,i)=>{
          if (!count) return '';
          const lvl = i+1, usedCount = clamp(used[lvl]||0, 0, count);
          return `<div class="slot-row">
            <div class="slot-level-label">${lvl}°</div>
            <div class="slot-runes">${Array.from({length:count}).map((_,ri)=>`<button class="rune ${ri<usedCount?'spent':''}" onclick="toggleSlot('${c.id}',${lvl},${ri})" aria-label="Slot ${lvl}° livello">${ri<usedCount?'':'✦'}</button>`).join('')}</div>
          </div>`;
        }).join('') : `<p class="muted">Nessuno slot a questo livello.</p>`}
      </div>
    ` : `<div class="empty-state" style="padding:26px 20px;"><div class="ic">🪄</div><p>Questo personaggio non lancia incantesimi. Se invece è un incantatore, imposta il tipo qui sopra.</p></div>`}

    <div class="divider"><span class="flourish">❧</span><span>Incantesimi conosciuti</span></div>
    <div class="filter-bar">
      <button class="filter-chip ${state.knownFilter==='all'?'active':''}" onclick="setKnownFilter('all')">Tutti (${(c.knownSpells||[]).length})</button>
      <button class="filter-chip ${state.knownFilter==='prepared'?'active':''}" id="chip-prepared" onclick="setKnownFilter('prepared')">★ Preparati (${prepared.length})</button>
    </div>
    <div class="spell-grid list-gap">
      ${known.length ? known.map(x => knownSpellRow(c, x.ref, x.sp)).join('') : emptyState('📜', state.knownFilter==='prepared' ? 'Nessun incantesimo preparato: tocca la stella per prepararne uno.' : 'Nessun incantesimo: aggiungine dal Grimorio.')}
    </div>
    <button class="btn btn-primary btn-block" style="margin-top:14px;" onclick="pickSpellForCharacter('${c.id}')">✦ Aggiungi dal Grimorio</button>
  `;
}
function setKnownFilter(f){ state.knownFilter = f; render(); }
function clearSlotsOverride(charId){
  const c = charById(charId); if (!c) return;
  c.slotsOverride = null;
  scheduleSave('characters', c); render();
  toast('↺ Slot ricalcolati da classe e livello');
}
function knownSpellRow(c, ref, sp){
  const isPrep = (c.preparedSpells||[]).includes(sp.id);
  return `<div class="spell-item">
    <div class="spell-lvl-badge">${sp.level===0?'C':sp.level}</div>
    <button class="spell-item-body" style="text-align:left" onclick="viewSpellDetail('${sp.id}','${ref.source}','${c.id}')">
      <div class="spell-item-name">${escapeHtml(spellName(sp))}</div>
      <div class="spell-item-meta">${(c.spellNotes||{})[sp.id]
        ? '📌 ' + escapeHtml(c.spellNotes[sp.id])
        : [spellAltName(sp), schoolIt(sp.school||''), sp.conc?'concentrazione':'', ref.source==='custom'?'personalizzato':'']
            .filter(Boolean).map(escapeHtml).join(' · ')}</div>
    </button>
    ${sp.level>0?`<button class="prep-star ${isPrep?'on':''}" onclick="togglePrepared('${c.id}','${sp.id}', this)" title="Preparato" aria-label="Preparato">★</button>`:''}
    <button class="spell-item-add" style="color:var(--garnet-bright)" onclick="removeKnownSpell('${c.id}','${sp.id}','${ref.source}')" aria-label="Rimuovi">✕</button>
  </div>`;
}
function togglePrepared(charId, spellId, btn){
  const c = charById(charId); if (!c) return;
  c.preparedSpells = c.preparedSpells || [];
  const i = c.preparedSpells.indexOf(spellId);
  if (i>=0) c.preparedSpells.splice(i,1); else c.preparedSpells.push(spellId);
  if (btn) btn.classList.toggle('on', c.preparedSpells.includes(spellId));
  const chip = document.getElementById('chip-prepared');
  if (chip) chip.textContent = '★ Preparati (' + c.preparedSpells.length + ')';
  scheduleSave('characters', c);
}
function toggleSlot(charId, level, idx){
  const c = charById(charId); if (!c) return;
  c.slotsUsed = c.slotsUsed || {};
  const cur = c.slotsUsed[level]||0;
  c.slotsUsed[level] = idx < cur ? idx : idx+1;
  scheduleSave('characters', c); render();
}
function updateCasterType(charId, val){
  const c = charById(charId); if (!c) return;
  c.casterType = val;
  scheduleSave('characters', c); render();
}
function setConcentration(charId, name){
  const c = charById(charId); if (!c) return;
  c.concentration = { name };
  scheduleSave('characters', c);
  closeModal(); render();
  toast('🌀 Concentrazione su ' + name);
}
function clearConcentration(charId){
  const c = charById(charId); if (!c) return;
  c.concentration = null;
  scheduleSave('characters', c); render();
}
function pickSpellForCharacter(charId){
  state.grimoireMode = 'pick';
  state.grimoirePickFor = charId;
  state.view = 'grimoire';
  pushNav(); render(); scrollTop();
}
function addKnownSpell(charId, spellId, source){
  const c = charById(charId); if (!c) return false;
  c.knownSpells = c.knownSpells||[];
  if (c.knownSpells.some(k=>k.id===spellId && k.source===source)){
    c.knownSpells = c.knownSpells.filter(k=>!(k.id===spellId && k.source===source));
    scheduleSave('characters', c);
    return false;
  }
  c.knownSpells.push({id:spellId, source});
  scheduleSave('characters', c);
  return true;
}
function removeKnownSpell(charId, spellId, source){
  const c = charById(charId); if (!c) return;
  c.knownSpells = (c.knownSpells||[]).filter(k=>!(k.id===spellId && k.source===source));
  c.preparedSpells = (c.preparedSpells||[]).filter(id=>id!==spellId);
  scheduleSave('characters', c); render();
}

/* La sottoclasse va scelta anche sulle schede fatte a mano o importate:
   senza, l'app non sa che sei un druido della luna e la forma selvatica
   resta quella di serie. */
function sottoclasseSceltaHTML(c){
  const cl = (typeof classeDi === 'function') ? classeDi(c) : null;
  if (!cl) return '';
  const subs = subclassesFor(cl.id) || [];
  if (!subs.length) return '';
  const attuale = subs.find(s => s.id === c.subclassId);
  const m = (typeof meccanicheDi === 'function') ? meccanicheDi(c) : null;
  return `<div class="field" style="margin-top:12px">
    <label>${escapeHtml(cl.subclassLabel || 'Sottoclasse')}</label>
    <select onchange="impostaSottoclasse('${c.id}', this.value)">
      <option value="">— nessuna —</option>
      ${subs.map(s=>`<option value="${attr(s.id)}" ${c.subclassId===s.id?'selected':''}>${escapeHtml(s.name)}${s.fromCampaign?' · dal tavolo':''}</option>`).join('')}
    </select>
    ${attuale && m ? `<div class="muted" style="font-size:.73rem; margin-top:6px">⚙️ Cambia le regole: ${escapeHtml((typeof riassuntoMeccaniche==='function'?riassuntoMeccaniche({meccaniche:m}):'') || 'sì')}</div>` : ''}
  </div>`;
}
function impostaSottoclasse(charId, id){
  const c = charById(charId); if (!c) return;
  c.subclassId = id || '';
  const cl = (typeof classeDi === 'function') ? classeDi(c) : null;
  if (cl && !c.classId) c.classId = cl.id;
  scheduleSave('characters', c); render();
  const sc = (typeof sottoclasseDi === 'function') ? sottoclasseDi(c) : null;
  if (sc) toast('⚔️ ' + sc.name);
}

/* ─── 19. STORIA / BACKGROUND ─── */
function renderSheetBackground(c){
  return `
    <div class="field">
      <label>Background</label>
      <div class="chip-row" style="margin-bottom:8px;">
        ${backgroundNames().map(b=>`<button class="chip ${c.background===b?'active':''}" onclick="setBackgroundPreset('${c.id}','${jsStr(b)}')">${escapeHtml(b)}</button>`).join('')}
      </div>
      <input value="${attr(c.background||'')}" placeholder="…oppure scrivi il tuo" oninput="updateCharField('${c.id}','background',this.value)">
    </div>
    ${sottoclasseSceltaHTML(c)}
    ${(typeof donoPattoHTML === 'function') ? donoPattoHTML(c) : ''}

    <div class="divider"><span class="flourish">❧</span><span>Personalità</span></div>
    <div class="trait-grid">
      <div class="field"><label>Tratti</label><textarea placeholder="Come si comporta?" oninput="updateCharField('${c.id}','traits',this.value)">${escapeHtml(c.traits||'')}</textarea></div>
      <div class="field"><label>Ideali</label><textarea placeholder="In cosa crede?" oninput="updateCharField('${c.id}','ideals',this.value)">${escapeHtml(c.ideals||'')}</textarea></div>
      <div class="field"><label>Legami</label><textarea placeholder="A chi o cosa tiene?" oninput="updateCharField('${c.id}','bonds',this.value)">${escapeHtml(c.bonds||'')}</textarea></div>
      <div class="field"><label>Difetti</label><textarea placeholder="Qual è la sua debolezza?" oninput="updateCharField('${c.id}','flaws',this.value)">${escapeHtml(c.flaws||'')}</textarea></div>
    </div>

    <div class="divider"><span class="flourish">❧</span><span>Aspetto</span></div>
    <div class="field">
      <label>Sesso</label>
      <div class="chip-row">
        ${SEXES.map(x=>{ const nv = c.sex === x.id ? '' : x.id;
          return `<button class="chip ${c.sex===x.id?'active':''}" onclick="updateCharField('${c.id}','sex','${nv}'); render()">${x.label}</button>`; }).join('')}
      </div>
    </div>
    <div class="form-row-3">
      <div class="field"><label>Età</label><input value="${attr(getPath(c,'appearance.age',''))}" oninput="updateCharField('${c.id}','appearance.age',this.value)"></div>
      <div class="field"><label>Altezza</label><input value="${attr(getPath(c,'appearance.height',''))}" oninput="updateCharField('${c.id}','appearance.height',this.value)"></div>
      <div class="field"><label>Peso</label><input value="${attr(getPath(c,'appearance.weight',''))}" oninput="updateCharField('${c.id}','appearance.weight',this.value)"></div>
    </div>
    <div class="form-row-3">
      <div class="field"><label>Occhi</label><input value="${attr(getPath(c,'appearance.eyes',''))}" oninput="updateCharField('${c.id}','appearance.eyes',this.value)"></div>
      <div class="field"><label>Pelle</label><input value="${attr(getPath(c,'appearance.skin',''))}" oninput="updateCharField('${c.id}','appearance.skin',this.value)"></div>
      <div class="field"><label>Capelli</label><input value="${attr(getPath(c,'appearance.hair',''))}" oninput="updateCharField('${c.id}','appearance.hair',this.value)"></div>
    </div>
    <div class="field"><label>Descrizione</label><textarea placeholder="Com'è fatto? Come si veste?" oninput="updateCharField('${c.id}','appearance.text',this.value)">${escapeHtml(getPath(c,'appearance.text',''))}</textarea></div>

    <div class="divider"><span class="flourish">❧</span><span>Legami nel mondo</span></div>
    <div class="form-row">
      <div class="field"><label>Fazione</label><input value="${attr(c.faction||'')}" placeholder="Es. Custodi dell'Alba" oninput="updateCharField('${c.id}','faction',this.value)"></div>
      <div class="field"><label>Divinità / Simbolo</label><input value="${attr(c.symbol||'')}" placeholder="Es. Lathander" oninput="updateCharField('${c.id}','symbol',this.value)"></div>
    </div>
    <div class="form-row">
      <div class="field"><label>Alleati</label><input value="${attr(c.allies||'')}" oninput="updateCharField('${c.id}','allies',this.value)"></div>
      <div class="field"><label>Nemici</label><input value="${attr(c.enemies||'')}" oninput="updateCharField('${c.id}','enemies',this.value)"></div>
    </div>

    <div class="divider"><span class="flourish">❧</span><span>Storia</span></div>
    <div class="field"><textarea style="min-height:220px;" placeholder="Da dove viene questo personaggio? Cosa lo spinge all'avventura?" oninput="updateCharField('${c.id}','backstory',this.value)">${escapeHtml(c.backstory||'')}</textarea></div>
  `;
}
function setBackgroundPreset(charId, val){ updateCharField(charId, 'background', val); render(); }

/* ─── 20. GRIMORIO — compendio incantesimi ─── */
function allSpells(){
  const custom = state.customSpells.map(s=>({...s, source:'custom'}));
  // quelli messi in comune dal tavolo, saltando i doppioni coi tuoi
  const miei = new Set(state.customSpells.map(s=>norm(s.name)));
  const condivisi = (state.sharedSpells||[])
    .filter(s => !miei.has(norm(s.name)))
    .map(s=>({...s, source:'shared'}));
  const srd = (typeof SRD_SPELLS !== 'undefined' ? SRD_SPELLS : []).map(s=>({...s, source:'srd'}));
  return custom.concat(condivisi, srd);
}
function renderGrimoire(){
  const picking = state.grimoireMode === 'pick';
  const pickChar = picking ? charById(state.grimoirePickFor) : null;
  if (picking && !pickChar){ state.grimoireMode = 'browse'; state.grimoirePickFor = null; }
  const f = state.grimoireFilter;
  return `
    ${picking && pickChar ? `
      <div class="topbar">
        <button class="topbar-back" onclick="cancelPickSpell()" aria-label="Torna alla scheda">←</button>
        <div style="flex:1;min-width:0;">
          <div class="topbar-title">Aggiungi a ${escapeHtml(pickChar.name)}</div>
          <div class="topbar-sub">Tocca ✦ per aggiungere</div>
        </div>
        <button class="btn btn-sm btn-primary" onclick="cancelPickSpell()">Fatto</button>
      </div>
    ` : `<div class="hero" style="padding:16px;">
        <div class="hero-actions">
          <button class="btn-icon" onclick="toggleSpellLang()" aria-label="Lingua dei nomi" title="Nomi in italiano o in inglese">${state.spellLang==='it'?'🇮🇹':'🇬🇧'}</button>
          ${themeToggleBtn()}
        </div>
        <h1 style="font-size:1.5rem">Grimorio</h1>
        <div class="sub">${allSpells().length} incantesimi</div>
      </div>`}
    <div class="search-wrap">
      <span class="search-ic">🔍</span>
      <input id="grimoire-search-input" placeholder="Cerca per nome o scuola…" value="${attr(f.q)}" oninput="setGrimoireSearch(this.value)" autocomplete="off">
      ${f.q ? `<button class="search-clear" onclick="clearGrimoireSearch()" aria-label="Cancella">✕</button>` : ''}
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
    ${!picking ? `<div class="btn-row" style="margin-top:14px;">
      <button class="btn btn-primary" onclick="openCustomSpellForm()">✦ Nuovo</button>
      <button class="btn btn-ghost" onclick="openSpellImport()">⤒ Importa</button>
    </div>` : ''}
  `;
}
function filteredSpells(){
  const f = state.grimoireFilter;
  let all = allSpells();
  if (f.q){
    const q = norm(f.q);
    // cerca sia nel nome italiano sia in quello inglese, sia nella scuola
    all = all.filter(s => norm(s.name).includes(q) || norm(spellItName(s)).includes(q) || norm(schoolIt(s.school||'')).includes(q));
  }
  if (f.level !== 'all') all = all.filter(s => String(s.level) === f.level);
  if (f.clas !== 'all') all = all.filter(s => spellClasses(s).includes(f.clas));
  all.sort((a,b)=> (a.level-b.level) || spellName(a).localeCompare(spellName(b), 'it'));
  return all;
}
function grimoireResultsHTML(){
  const picking = state.grimoireMode === 'pick';
  const pickChar = picking ? charById(state.grimoirePickFor) : null;
  const all = filteredSpells();
  const countLine = `<div class="muted" style="margin:2px 0 10px;">${all.length} ${pluralize(all.length,'incantesimo','incantesimi')}</div>`;
  if (!all.length){
    const f = state.grimoireFilter;
    if (f.clas !== 'all' && !f.q){
      const nome = CLASSES_IT[f.clas] || f.clas;
      return countLine + `<div class="empty-state">
        <div class="ic">🏷️</div>
        <p>Nessun incantesimo dell'SRD è marcato <b>${escapeHtml(nome)}</b>${f.clas==='Artificer'?": la lista dell'Artificiere non fa parte dell'SRD":''}.</p>
        <div class="list-gap" style="margin-top:16px; text-align:left">
          <button class="btn btn-ghost btn-block btn-sm" onclick="setGrimoireFilter('clas','all')">Togli il filtro</button>
          <button class="btn btn-ghost btn-block btn-sm" onclick="openSpellImport()">⤒ Importa una lista da file</button>
        </div>
        <p style="margin-top:14px; font-size:.78rem; opacity:.8">Puoi anche aprire un incantesimo qualsiasi e usare <b>🏷️ Liste di classe</b> per aggiungerlo a questa classe.</p>
      </div>`;
    }
    return countLine + emptyState('🔍','Nessun incantesimo trovato con questi filtri.');
  }
  return countLine + `<div class="spell-grid list-gap">` + all.map(s=>grimoireItemHTML(s, picking, pickChar)).join('') + `</div>`;
}
function grimoireItemHTML(s, picking, pickChar){
  const already = picking && pickChar && (pickChar.knownSpells||[]).some(k=>k.id===s.id && k.source===s.source);
  const classesIt = spellClasses(s).map(en=>CLASSES_IT[en]||en).join(', ');
  const alt = spellAltName(s);
  return `<div class="spell-item" id="sp-row-${s.source}-${s.id}">
    <div class="spell-lvl-badge">${s.level===0?'C':s.level}</div>
    <button class="spell-item-body" style="text-align:left" onclick="viewSpellDetail('${s.id}','${s.source}'${picking?`,'${pickChar.id}'`:''})">
      <div class="spell-item-name">${escapeHtml(spellName(s))}</div>
      <div class="spell-item-meta">${alt?escapeHtml(alt)+' · ':''}${escapeHtml(schoolIt(s.school||''))}${classesIt?(' · '+escapeHtml(classesIt)):''}${s.source==='custom'?' · personalizzato':''}</div>
    </button>
    ${picking
      ? `<button class="spell-item-add ${already?'added':''}" id="sp-add-${s.source}-${s.id}" onclick="toggleSpellFromGrimoire('${s.id}','${s.source}')" aria-label="Aggiungi">${already?'✓':'✦'}</button>`
      : `<span class="char-card-chevron">›</span>`}
  </div>`;
}
const setGrimoireSearch = debounce((val) => {
  state.grimoireFilter.q = val;
  const el = document.getElementById('grimoire-results');
  if (el) el.innerHTML = grimoireResultsHTML();
}, 180);
function clearGrimoireSearch(){ setGrimoireSearch.annulla(); state.grimoireFilter.q = ''; render(); }
function setGrimoireFilter(key, val){
  setGrimoireSearch.annulla();
  // Se c'è del testo appena digitato lo si prende ora, prima di ridisegnare.
  const box = document.getElementById('grimoire-search-input');
  if (box) state.grimoireFilter.q = box.value;
  state.grimoireFilter[key] = val;
  render();
}
function cancelPickSpell(){
  const charId = state.grimoirePickFor;
  state.grimoireMode = 'browse'; state.grimoirePickFor = null;
  state.view = 'sheet'; state.activeCharId = charId; state.sheetTab = 'spells';
  replaceNav(); render(); scrollTop();
}
// Aggiunge/toglie senza ridisegnare la lista: resti dove sei nello scorrimento.
function toggleSpellFromGrimoire(spellId, source){
  const charId = state.grimoirePickFor;
  const added = addKnownSpell(charId, spellId, source);
  const btn = document.getElementById('sp-add-' + source + '-' + spellId);
  if (btn){ btn.classList.toggle('added', added); btn.textContent = added ? '✓' : '✦'; }
  toast(added ? '✨ Aggiunto alla scheda' : 'Rimosso dalla scheda');
}

function viewSpellDetail(id, source, charId){
  const sp = spellByRef({ id, source });
  if (!sp) return;
  openModal({ render: () => spellDetailHTML(sp, source, charId) });
}
/* Un incantesimo tuo si può mettere in comune col tavolo (e ritirare) */
function spellShareRow(sp, source){
  if (typeof campaignReady !== 'function' || !campaignReady()) return '';
  if (source === 'srd') return '';
  const su = (state.sharedSpells||[]).some(x => x.id === sp.id);
  if (source === 'shared'){
    const puo = typeof canUnshare === 'function' && canUnshare((state.sharedSpells||[]).find(x=>x.id===sp.id));
    return `<div class="card" style="margin-top:12px; border-color:var(--gold-dim); padding:10px 13px">
      <div class="muted" style="font-size:.78rem">⚔️ Condiviso nella campagna${sp.sharedByName?' da '+escapeHtml(sp.sharedByName):''}.</div>
      ${puo ? `<button class="btn btn-ghost btn-block btn-sm" style="margin-top:8px" onclick="unshareFromCampaign('spells','${jsStr(sp.id)}'); closeModal();">Ritira dalla campagna</button>` : ''}
    </div>`;
  }
  return `<button class="btn ${su?'btn-ghost':'btn-gold'} btn-block btn-sm" style="margin-top:10px"
    onclick="${su ? `unshareFromCampaign('spells','${jsStr(sp.id)}')` : `shareOneSpell('${jsStr(sp.id)}')`}">
    ⚔️ ${su ? 'Ritira dalla campagna' : 'Condividi con la campagna'}</button>`;
}
async function shareOneSpell(id){
  const sp = state.customSpells.find(x => x.id === id);
  if (!sp) return;
  const n = await shareToCampaign('spells', [sp]);
  if (n) toast('⚔️ ' + sp.name + ' è ora del tavolo');
  renderModalRoot();
}

function spellDetailHTML(sp, source, charId){
  const c = charId ? charById(charId) : null;
  const has = c && (c.knownSpells||[]).some(k=>k.id===sp.id && k.source===source);
  const spClasses = spellClasses(sp);
  const classesIt = spClasses.map(en=>CLASSES_IT[en]||en);
  const alt = spellAltName(sp);
  const descParas = (sp.desc||'').split(/\n+/).filter(Boolean);
  const inner = `
      <div style="margin-bottom:6px">
        <div class="spell-detail-name">${escapeHtml(spellName(sp))}</div>
        ${alt?`<div class="muted" style="font-size:.8rem">${escapeHtml(alt)}</div>`:''}
        <div class="muted" style="font-style:italic;">${levelLabel(sp.level)} · ${escapeHtml(schoolIt(sp.school||''))}${sp.ritual?' · rituale':''}</div>
      </div>
      <div class="spell-detail-tags">
        ${sp.conc?'<span class="badge garnet">Concentrazione</span>':''}
        ${sp.ritual?'<span class="badge">Rituale</span>':''}
        ${sp.dmg?`<span class="badge arcane">${escapeHtml(sp.dmg)}</span>`:''}
        ${classesIt.map(x=>`<span class="badge">${escapeHtml(x)}</span>`).join('')}
        ${source==='custom'?'<span class="badge gold">Personalizzato</span>':''}
      </div>
      <div class="spell-detail-grid">
        <div><b>Tempo di lancio</b><span>${escapeHtml(sp.cast||'—')}</span></div>
        <div><b>Gittata</b><span>${escapeHtml(sp.range||'—')}</span></div>
        <div><b>Componenti</b><span>${escapeHtml(formatComponents(sp.comp, sp.mat))}</span></div>
        <div><b>Durata</b><span>${escapeHtml(sp.dur||'—')}</span></div>
      </div>
      <div class="spell-detail-desc">${descParas.map(p=>`<p>${escapeHtml(p)}</p>`).join('')}</div>
      ${sp.higher?`<div class="spell-detail-desc" style="margin-top:10px"><p><b>Ai livelli superiori. </b>${escapeHtml(sp.higher)}</p></div>`:''}
      ${source==='srd' ? `<div class="spell-source-note">Testo del System Reference Document 5.1 di Wizards of the Coast, su licenza Open Gaming License 1.0a — lingua originale inglese.</div>` : ''}
      <div class="list-gap" style="margin-top:16px;">
        ${c ? `<button class="btn ${has?'btn-ghost':'btn-primary'} btn-block" onclick="toggleSpellFromDetail('${sp.id}','${source}','${c.id}')">${has?'✓ Nella scheda — togli':'✦ Aggiungi a '+escapeHtml(c.name)}</button>` : ''}
        ${c && sp.conc ? `<button class="btn btn-arcane btn-block" onclick="setConcentration('${c.id}','${jsStr(spellName(sp))}')">🌀 Concentrati su questo</button>` : ''}
        <button class="btn btn-ghost btn-block" onclick="openSpellClassEditor('${sp.id}','${source}')">🏷️ Liste di classe${isSpellTagged(sp)?' (modificate)':''}</button>
        ${source==='custom' ? `<div class="btn-row">
          <button class="btn btn-ghost" onclick="editCustomSpell('${sp.id}')">✎ Modifica</button>
          <button class="btn btn-danger" onclick="confirmDeleteCustomSpell('${sp.id}')">Elimina</button>
        </div>` : ''}
        ${spellShareRow(sp, source)}
      </div>`;
  return modalShell(levelLabel(sp.level), inner);
}
function toggleSpellFromDetail(spellId, source, charId){
  const added = addKnownSpell(charId, spellId, source);
  toast(added ? '✨ Aggiunto alla scheda' : 'Rimosso dalla scheda');
  closeModal(); render();
}

let draftSpell = null, draftSpellEdit = false;

function blankCustomSpell(){
  return { id: uid(), name:'', level:0, school:'', cast:'1 azione', range:'', comp:'V, S', mat:'', dur:'Istantanea',
           conc:false, ritual:false, classes:[], desc:'', higher:'', createdAt: Date.now() };
}
function openCustomSpellForm(){
  draftSpell = blankCustomSpell(); draftSpellEdit = false;
  openModal({ render: () => customSpellFormHTML(), after: focusSpellName });
}
function editCustomSpell(id){
  const sp = state.customSpells.find(s=>s.id===id);
  if (!sp) return;
  draftSpell = JSON.parse(JSON.stringify(sp)); draftSpellEdit = true;
  openModal({ render: () => customSpellFormHTML() });
}
// Parte da un incantesimo esistente (SRD o tuo) e ne crea una variante:
// il modo più rapido per aggiungere quelli che non sono nell'SRD.
function copySpellAsCustom(id, source){
  const sp = spellByRef({ id, source });
  if (!sp) return;
  draftSpell = {
    id: uid(), name: spellName(sp) + ' (variante)', level: sp.level||0, school: schoolIt(sp.school||''),
    cast: sp.cast||'', range: sp.range||'', comp: sp.comp||'', mat: sp.mat||'', dur: sp.dur||'',
    conc: !!sp.conc, ritual: !!sp.ritual, classes: (spellClasses(sp)||[]).slice(),
    desc: sp.desc||'', higher: sp.higher||'', createdAt: Date.now()
  };
  draftSpellEdit = false;
  openModal({ render: () => customSpellFormHTML(), after: focusSpellName });
}
function openCopyPicker(){
  const inner = `
    <p class="muted" style="margin-bottom:12px">Scegli un incantesimo simile: campi e formattazione vengono precompilati, poi cambi quello che serve.</p>
    <div class="search-wrap">
      <span class="search-ic">🔍</span>
      <input id="copy-search" placeholder="Cerca un incantesimo da cui partire…" oninput="renderCopyResults(this.value)" autocomplete="off">
    </div>
    <div id="copy-results" class="list-gap">${copyResultsHTML('')}</div>`;
  openModal({ render: () => modalShell('Crea da un esistente', inner), after: () => { const el=document.getElementById('copy-search'); if(el) el.focus(); } });
}
function copyResultsHTML(q){
  q = norm(q);
  let all = allSpells();
  if (q) all = all.filter(s => norm(s.name).includes(q) || norm(spellItName(s)).includes(q));
  else all = all.slice(0, 12);
  all = all.slice(0, 40);
  if (!all.length) return emptyState('🔍','Nessun incantesimo trovato.');
  return all.map(s=>`<button class="spell-item" style="width:100%" onclick="copySpellAsCustom('${s.id}','${s.source}')">
    <span class="spell-lvl-badge">${s.level===0?'C':s.level}</span>
    <span class="spell-item-body">
      <span class="spell-item-name">${escapeHtml(spellName(s))}</span>
      <span class="spell-item-meta">${escapeHtml(schoolIt(s.school||''))}</span>
    </span>
    <span class="char-card-chevron">›</span>
  </button>`).join('');
}
const renderCopyResults = debounce((q)=>{ const el = document.getElementById('copy-results'); if (el) el.innerHTML = copyResultsHTML(q); }, 150);
function focusSpellName(){ const el = document.getElementById('cs-name'); if (el) el.focus(); }

function toggleDraftSpellClass(en){
  draftSpell.classes = draftSpell.classes || [];
  const i = draftSpell.classes.indexOf(en);
  if (i>=0) draftSpell.classes.splice(i,1); else draftSpell.classes.push(en);
  renderModalRoot();
}
function setDraftSpellField(field, val){ draftSpell[field] = val; renderModalRoot(); }

const QUICK_CAST = ['1 azione','1 azione bonus','1 reazione','1 minuto','10 minuti','1 ora'];
const QUICK_RANGE = ['Personale','Contatto','9 metri','18 metri','36 metri','Vista'];
const QUICK_DUR = ['Istantanea','1 round','1 minuto','10 minuti','1 ora','8 ore','Finché dissolto'];
function quickChips(field, values, current){
  return `<div class="chip-row" style="margin-top:6px">${values.map(v=>
    `<button type="button" class="chip ${current===v?'active':''}" style="font-size:.68rem;padding:6px 10px" onclick="setDraftSpellField('${field}','${jsStr(v)}')">${v}</button>`
  ).join('')}</div>`;
}
function customSpellFormHTML(){
  const d = draftSpell;
  const inner = `
      ${!draftSpellEdit ? `<button class="btn btn-ghost btn-block btn-sm" style="margin-bottom:14px" onclick="openCopyPicker()">⧉ Parti da un incantesimo esistente</button>` : ''}
      <div class="field"><label>Nome</label><input id="cs-name" value="${attr(d.name)}" placeholder="Es. Fiamma di Vhalgor" oninput="draftSpell.name=this.value"></div>
      <div class="form-row">
        <div class="field"><label>Livello</label>
          <select onchange="draftSpell.level=parseInt(this.value)">
            <option value="0" ${d.level===0?'selected':''}>Trucchetto</option>
            ${[1,2,3,4,5,6,7,8,9].map(l=>`<option value="${l}" ${d.level===l?'selected':''}>${l}°</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Scuola</label>
          <select onchange="draftSpell.school=this.value">
            <option value="">—</option>
            ${Object.values(SCHOOLS_IT).map(s=>`<option value="${s}" ${d.school===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field"><label>Tempo di lancio</label>
        <input value="${attr(d.cast)}" oninput="draftSpell.cast=this.value">
        ${quickChips('cast', QUICK_CAST, d.cast)}
      </div>
      <div class="field"><label>Gittata</label>
        <input value="${attr(d.range)}" placeholder="Es. 18 metri" oninput="draftSpell.range=this.value">
        ${quickChips('range', QUICK_RANGE, d.range)}
      </div>
      <div class="field"><label>Durata</label>
        <input value="${attr(d.dur)}" placeholder="Es. Istantanea" oninput="draftSpell.dur=this.value">
        ${quickChips('dur', QUICK_DUR, d.dur)}
      </div>
      <div class="form-row">
        <div class="field"><label>Componenti</label><input value="${attr(d.comp)}" placeholder="Es. V, S, M" oninput="draftSpell.comp=this.value"></div>
        <div class="field"><label>Materiali</label><input value="${attr(d.mat||'')}" placeholder="Facoltativo" oninput="draftSpell.mat=this.value"></div>
      </div>
      <div class="field"><label>Descrizione</label><textarea style="min-height:140px;" placeholder="Effetto dell'incantesimo…" oninput="draftSpell.desc=this.value">${escapeHtml(d.desc)}</textarea></div>
      <div class="field"><label>Ai livelli superiori</label><textarea style="min-height:70px;" oninput="draftSpell.higher=this.value">${escapeHtml(d.higher||'')}</textarea></div>
      <div class="field">
        <label>Liste di classe</label>
        <div class="chip-row">
          ${GRIMOIRE_CLASSES.map(en=>`<button class="chip ${(d.classes||[]).includes(en)?'active':''}" onclick="toggleDraftSpellClass('${en}')">${CLASSES_IT[en]}</button>`).join('')}
        </div>
      </div>
      <div class="chip-row" style="margin-bottom:14px;">
        <button class="chip ${d.conc?'active':''}" onclick="draftSpell.conc=!draftSpell.conc; renderModalRoot()">Concentrazione</button>
        <button class="chip ${d.ritual?'active':''}" onclick="draftSpell.ritual=!draftSpell.ritual; renderModalRoot()">Rituale</button>
      </div>
      <button class="btn btn-primary btn-block" onclick="saveCustomSpell(false)">${draftSpellEdit?'Salva modifiche':'Salva incantesimo'}</button>
      ${!draftSpellEdit ? `<button class="btn btn-ghost btn-block" style="margin-top:10px" onclick="saveCustomSpell(true)">Salva e creane un altro</button>` : ''}`;
  return modalShell(draftSpellEdit ? 'Modifica incantesimo' : 'Incantesimo personalizzato', inner);
}
function saveCustomSpell(andAnother){
  if (!draftSpell.name.trim()){ toast('Dai un nome all\'incantesimo'); return; }
  const idx = state.customSpells.findIndex(s=>s.id===draftSpell.id);
  if (idx>=0) state.customSpells[idx] = draftSpell; else state.customSpells.push(draftSpell);
  fsSet('customSpells', draftSpell);
  const wasEdit = draftSpellEdit;
  if (andAnother){
    const keep = { level: draftSpell.level, school: draftSpell.school, classes: (draftSpell.classes||[]).slice(), cast: draftSpell.cast };
    draftSpell = Object.assign(blankCustomSpell(), keep);
    draftSpellEdit = false;
    renderModalRoot(); focusSpellName();
    toast('📜 Salvato — scrivi il prossimo');
    return;
  }
  closeModal(); render();
  toast(wasEdit ? '✓ Incantesimo aggiornato' : '📜 Incantesimo salvato');
}

/* ─── Liste di classe modificabili ───────────────────────────────
   Serve soprattutto per l'Artificiere, che non compare in nessun
   incantesimo dell'SRD: qui puoi marcare gli incantesimi che nella
   tua campagna appartengono a una certa classe.
*/
let draftTagClasses = null, draftTagSpell = null;
function openSpellClassEditor(spellId, source){
  const sp = spellByRef({ id: spellId, source });
  if (!sp) return;
  draftTagSpell = { id: spellId, source, base: (sp.classes||[]).slice(), sp };
  draftTagClasses = spellClasses(Object.assign({}, sp, {source})).slice();
  openModal({ render: () => spellClassEditorHTML() });
}
function toggleTagClass(en){
  const i = draftTagClasses.indexOf(en);
  if (i>=0) draftTagClasses.splice(i,1); else draftTagClasses.push(en);
  renderModalRoot();
}
function spellClassEditorHTML(){
  const t = draftTagSpell;
  const inner = `
    <p class="muted" style="margin-bottom:14px">In quali liste di classe compare <b>${escapeHtml(spellName(t.sp))}</b>? La modifica vale solo per te ed è sincronizzata sul tuo account.</p>
    <div class="chip-row" style="margin-bottom:16px">
      ${GRIMOIRE_CLASSES.concat(['Barbarian','Fighter','Monk','Rogue']).map(en=>`<button class="chip ${draftTagClasses.includes(en)?'active':''}" onclick="toggleTagClass('${en}')">${CLASSES_IT[en]||en}</button>`).join('')}
    </div>
    <button class="btn btn-primary btn-block" onclick="saveSpellClasses()">Salva</button>
    ${isSpellTagged({id:t.id, source:t.source}) ? `<button class="btn btn-ghost btn-block" style="margin-top:10px" onclick="resetSpellClasses()">Ripristina l'originale</button>` : ''}`;
  return modalShell('🏷️ Liste di classe', inner);
}
function saveSpellClasses(){
  if (draftTagSpell.source === 'custom'){
    const sp = state.customSpells.find(s=>s.id===draftTagSpell.id);
    if (sp){ sp.classes = draftTagClasses.slice(); fsSet('customSpells', sp); }
  } else {
    setSpellClasses(draftTagSpell.id, draftTagClasses, draftTagSpell.base);
  }
  closeModal(); render();
  toast('🏷️ Liste aggiornate');
}
function resetSpellClasses(){
  setSpellClasses(draftTagSpell.id, draftTagSpell.base, draftTagSpell.base);
  closeModal(); render();
  toast('Ripristinato');
}

function confirmDeleteCustomSpell(id){
  confirmDialog('Eliminare questo incantesimo?', 'Verrà rimosso anche dalle schede dei personaggi che lo conoscono.', () => {
    if (typeof nelCestino === 'function') nelCestino('customSpells', state.customSpells.find(s=>s.id===id));
    state.customSpells = state.customSpells.filter(s=>s.id!==id);
    fsDelete('customSpells', id);
    state.characters.forEach(c=>{
      const before = (c.knownSpells||[]).length;
      c.knownSpells = (c.knownSpells||[]).filter(k=>!(k.id===id && k.source==='custom'));
      if (c.knownSpells.length !== before) fsSet('characters', c);
    });
    saveLocal(); render();
    toast('Incantesimo eliminato');
  }, 'Elimina');
}

/* ─── 21. TAVOLO DEL MASTER ─── */
function newNPC(){ return { id: uid(), name:'', type:'', avatar:'🐉', portrait:null, ac:10, hpMax:10, hpCurrent:null, speed:9, notes:'', createdAt: Date.now() }; }

function renderDM(){
  return `
    <div class="hero" style="padding:16px;">
      <div class="hero-actions">${themeToggleBtn()}</div>
      <h1 style="font-size:1.5rem">Tavolo del Master</h1>
      <div class="sub">Bestiario, iniziativa e diario</div>
    </div>
    <div class="segmented" style="margin-bottom:14px;">
      <button class="${state.dmTab==='bestiary'||!state.dmTab?'active':''}" onclick="setDmTab('bestiary')">🐉 Bestiario</button>
      <button class="${state.dmTab==='initiative'?'active':''}" onclick="setDmTab('initiative')">⚔️ Iniziativa${state.combat.list.length?' ('+state.combat.list.length+')':''}</button>
      <button class="${state.dmTab==='journal'?'active':''}" onclick="setDmTab('journal')">📓 Diario${(state.journal||[]).length?' ('+(state.journal||[]).length+')':''}</button>
    </div>
    ${state.dmTab==='initiative' ? renderInitiativeTracker() : (state.dmTab==='journal' ? renderJournal() : renderBestiary())}
  `;
}
/* Con tremila creature dentro, l'elenco intero non si disegna: si cerca.
   La ricerca lavora su tutte, il grado sfida si filtra al volo e le
   schede escono un blocco per volta. L'ordinamento si fa una volta e si
   tiene da parte: rifare tremila localeCompare a ogni tocco era metà
   della lentezza. */
let __bestiarioOrdinato = null, __bestiarioFirma = '';
function bestiarioOrdinato(){
  /* Le creature del tavolo stanno nello stesso elenco delle tue: al
     momento di preparare uno scontro non interessa da dove vengono,
     interessa averle sotto mano. Quelle che hai già non si ripetono. */
  const dalTavolo = (state.sharedNpcs || []);
  const firma = state.npcs.length + ':' + dalTavolo.length + ':' +
    (state.npcs.length ? (state.npcs[state.npcs.length-1].id || '') : '');
  if (__bestiarioOrdinato && __bestiarioFirma === firma) return __bestiarioOrdinato;
  const miei = new Set(state.npcs.map(n => n.id));
  const ospiti = dalTavolo.filter(n => n && n.id && !miei.has(n.id))
    .map(n => Object.assign({}, n, { __dalTavolo: true }));
  __bestiarioOrdinato = state.npcs.concat(ospiti)
    .sort((a,b)=>(a.name||'').localeCompare(b.name||'', 'it'));
  __bestiarioFirma = firma;
  return __bestiarioOrdinato;
}
function bestiarioScorda(){ __bestiarioOrdinato = null; __bestiarioFirma = ''; }
function combatCerca(v){ state.combatCercaQ = v; render(); }
function bestiarioCerca(v){ state.bestiarioQ = v; listaAzzera('bestiario'); render(); }
function bestiarioFiltraGs(v){ state.bestiarioGs = v; listaAzzera('bestiario'); render(); }
/* Il grado sfida sta dentro «type» come «Grande drago, GS 8». */
function npcGs(n){
  const m = /GS\s+([0-9/]+)/i.exec(n.type || '');
  return m ? m[1] : '';
}
function bestiarioFiltrato(){
  let l = bestiarioOrdinato();
  const q = (state.bestiarioQ || '').trim();
  if (q){
    const nq = norm(q);
    l = l.filter(n => norm(n.name || '').includes(nq) || norm(n.type || '').includes(nq));
  }
  if (state.bestiarioGs) l = l.filter(n => npcGs(n) === state.bestiarioGs);
  return l;
}
function renderBestiary(){
  const tutti = bestiarioOrdinato();
  const visti = bestiarioFiltrato();
  const tanti = tutti.length > LISTA_PASSO;
  const gsPresenti = tanti
    ? [...new Set(tutti.map(npcGs).filter(Boolean))].sort((a,b)=> (typeof crValue==='function' ? crValue(a)-crValue(b) : 0))
    : [];
  return `
    <button class="btn btn-ghost btn-block" style="margin-bottom:10px" onclick="openGear()">🎒 Armi, armature ed equipaggiamento</button>
    <button class="btn btn-ghost btn-block" style="margin-bottom:10px" onclick="openMagicItems()">💍 Oggetti magici SRD (${typeof SRD_MAGIC_ITEMS!=='undefined'?SRD_MAGIC_ITEMS.length:0})</button>
    <button class="btn btn-gold btn-block" style="margin-bottom:10px" onclick="openMonsterBrowser()">🐉 Sfoglia il bestiario SRD (${typeof SRD_MONSTERS!=='undefined'?SRD_MONSTERS.length:0} creature)</button>
    <button class="btn btn-ghost btn-block btn-sm" style="margin-bottom:14px" onclick="openMostriPdf()">📖 Leggi i mostri dal tuo manuale</button>
    ${tanti ? `
      <div class="row-between" style="margin-bottom:8px"><b style="font-size:.86rem">🐉 Il tuo bestiario</b><span class="muted" style="font-size:.75rem">${tutti.length} creature</span></div>
      ${cercaLista('bestiario-cerca', state.bestiarioQ, 'bestiarioCerca', 'Cerca per nome o tipo…')}
      ${gsPresenti.length > 1 ? `<div class="filtro-riga">
        <button class="chip ${state.bestiarioGs?'':'active'}" onclick="bestiarioFiltraGs('')">Tutti i GS</button>
        ${gsPresenti.map(g=>`<button class="chip ${state.bestiarioGs===g?'active':''}" onclick="bestiarioFiltraGs('${jsStr(g)}')">GS ${escapeHtml(g)}</button>`).join('')}
      </div>` : ''}` : ''}
    ${tutti.length
      ? (visti.length
          ? bloccoLista('bestiario', visti, npcCardHTML, { classe:'stagger list-gap party-grid', nome:'creature' })
            + ((typeof campaignReady === 'function' && campaignReady())
                ? (()=>{ const daDare = visti.filter(n => !n.__dalTavolo && !giaSuTavolo('npcs', n.id)).length;
                    return daDare ? `<button class="btn btn-gold btn-block btn-sm" style="margin-top:10px" onclick="condividiMostrati()">⚔️ Condividi col tavolo ${(state.bestiarioQ||state.bestiarioGs) ? 'le ' + daDare + ' mostrate' : '(' + daDare + ')'}</button>` : ''; })()
                : '')
            + (tanti ? `<button class="btn btn-ghost btn-block btn-sm" style="margin-top:10px; color:var(--warn)" onclick="confermaEliminaMostrati()">🗑️ Elimina ${(state.bestiarioQ||state.bestiarioGs) ? 'le ' + visti.length + ' mostrate' : 'tutto il bestiario (' + visti.length + ')'}</button>` : '')
          : `<div class="lista-vuota">Nessuna creatura con questi filtri.</div>`)
      : emptyState('🐉','Nessun PNG o mostro tuo. Puoi partire dal bestiario SRD qui sopra, oppure crearne uno da zero.')}
    <button class="btn btn-primary btn-block" style="margin-top:14px;" onclick="openNpcForm()">✦ Nuovo PNG / Mostro</button>
  `;
}

/* Con tremila creature dentro, toglierne un pugno una per volta non è
   una cosa che si può chiedere a nessuno: da qui si eliminano tutte
   quelle che la ricerca sta mostrando. Il cestino tiene le prime
   duecento, il resto se ne va davvero: dirlo prima è l'unico modo
   onesto di offrire un pulsante così. */
const CANC_IN_CESTINO = 200;
function confermaEliminaMostrati(){
  const lista = bestiarioFiltrato();
  if (!lista.length) return;
  const filtrato = !!((state.bestiarioQ||'').trim() || state.bestiarioGs);
  const recuperabili = Math.min(lista.length, CANC_IN_CESTINO);
  confirmDialog(
    'Eliminare ' + lista.length + (lista.length===1?' creatura?':' creature?'),
    (filtrato ? 'Sono quelle che stai vedendo adesso, con i filtri attivi. ' : 'Sono tutte quelle del tuo bestiario. ') +
    (lista.length > CANC_IN_CESTINO
      ? ('Le prime ' + recuperabili + ' finiscono nel cestino e le puoi rimettere a posto entro 30 giorni; le altre ' +
         (lista.length - recuperabili) + ' spariscono davvero.')
      : 'Finiscono nel cestino: puoi rimetterle a posto entro 30 giorni.'),
    () => eliminaMostrati(lista), 'Elimina ' + lista.length);
}
async function eliminaMostrati(lista){
  const ids = new Set(lista.map(n => n.id));
  if (typeof nelCestino === 'function'){
    lista.slice(0, CANC_IN_CESTINO).forEach(n => { try { nelCestino('npcs', n); } catch(e){} });
  }
  state.npcs = state.npcs.filter(n => !ids.has(n.id));
  bestiarioScorda();
  state.bestiarioQ = ''; state.bestiarioGs = '';
  listaAzzera('bestiario');
  saveLocalOra();
  render();
  toast('🗑️ ' + ids.size + (ids.size===1?' creatura eliminata':' creature eliminate'));
  // il server dopo: la schermata non deve aspettare la rete
  if (typeof fsDeleteMany === 'function') await fsDeleteMany('npcs', [...ids]);
  else for (const id of ids) await fsDelete('npcs', id);
}
function npcCardHTML(n){
  if (n.__dalTavolo) return `<button class="char-card npc-card" style="border-color:var(--gold-dim)" onclick="apriMostroCondiviso('${jsStr(n.id)}')">
    ${avatarHTML(n, 46)}
    <div class="char-card-body">
      <div class="char-card-name">${escapeHtml(n.name||'Senza nome')} <span style="color:var(--gold)">⚔️</span></div>
      <div class="char-card-sub">${n.type?escapeHtml(n.type)+' · ':''}CA ${n.ac??10} · PF ${n.hpMax??0} · da ${escapeHtml(n.sharedByName||'un membro')}</div>
    </div>
    <div class="char-card-chevron">›</div>
  </button>`;
  return `<button class="char-card npc-card" onclick="openNpcForm('${n.id}')">
    ${avatarHTML(n, 46)}
    <div class="char-card-body">
      <div class="char-card-name">${escapeHtml(n.name||'Senza nome')}</div>
      <div class="char-card-sub">${n.type?escapeHtml(n.type)+' · ':''}CA ${n.ac??10} · PF ${n.hpCurrent??n.hpMax??0}/${n.hpMax??0}</div>
    </div>
    <div class="char-card-chevron">›</div>
  </button>`;
}
let draftNpc = null;
function openNpcForm(existingId){
  const n = existingId ? state.npcs.find(x=>x.id===existingId) : null;
  draftNpc = n ? JSON.parse(JSON.stringify(n)) : newNPC();
  openModal({ render: () => npcFormHTML(!!n), after: () => { if(!n){ const el = document.getElementById('npc-name'); if (el) el.focus(); } } });
}
function npcFormHTML(isEdit){
  const d = draftNpc;
  const inner = `
      <div class="field"><label>Nome</label><input id="npc-name" value="${attr(d.name)}" placeholder="Es. Capo Goblin" oninput="draftNpc.name=this.value"></div>
      <div class="form-row">
        <div class="field"><label>Tipo / GS</label><input value="${attr(d.type)}" placeholder="Es. Umanoide, GS 1" oninput="draftNpc.type=this.value"></div>
        <div class="field"><label>Simbolo</label>
          <select onchange="draftNpc.avatar=this.value">
            ${AVATAR_GLYPHS.map(g=>`<option value="${g}" ${d.avatar===g?'selected':''}>${g}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row-3">
        <div class="field"><label>CA</label><input type="number" inputmode="numeric" value="${d.ac??10}" oninput="draftNpc.ac=parseInt(this.value)||0"></div>
        <div class="field"><label>PF max</label><input type="number" inputmode="numeric" value="${d.hpMax??10}" oninput="draftNpc.hpMax=parseInt(this.value)||0"></div>
        <div class="field"><label>Velocità</label><input type="number" inputmode="numeric" value="${d.speed??9}" oninput="draftNpc.speed=parseInt(this.value)||0"></div>
      </div>
      ${isEdit ? `<div class="field"><label>PF attuali</label><input type="number" inputmode="numeric" value="${d.hpCurrent??d.hpMax??10}" oninput="draftNpc.hpCurrent=parseInt(this.value)||0"></div>` : ''}
      <div class="field">
        <label>Ritratto</label>
        <div style="display:flex; align-items:center; gap:12px;">
          ${avatarHTML(d, 56)}
          <button class="btn btn-ghost btn-sm" onclick="choosePortrait(setNpcPortrait)">📷 ${d.portrait?'Cambia':'Carica'}</button>
          ${d.portrait?`<button class="btn btn-ghost btn-sm" onclick="setNpcPortrait(null)">Togli</button>`:''}
        </div>
      </div>
      <div class="field"><label>Azioni / Note</label><textarea style="min-height:110px;" placeholder="Attacchi, abilità speciali, tattiche…" oninput="draftNpc.notes=this.value">${escapeHtml(d.notes)}</textarea></div>
      <button class="btn btn-primary btn-block" onclick="saveNpcDraft()">${isEdit?'Salva modifiche':'Aggiungi al bestiario'}</button>
      ${isEdit?`<button class="btn btn-gold btn-block" style="margin-top:10px;" onclick="addNpcToInitiative('${d.id}')">⚔️ Aggiungi all'iniziativa</button>
      ${(typeof campaignReady === 'function' && campaignReady()) ? (()=>{
        const su = giaSuTavolo('npcs', d.id);
        return `<button class="btn btn-ghost btn-block btn-sm" style="margin-top:10px;${su?'color:var(--gold); border-color:var(--gold-dim)':''}"
          onclick="${su ? `unshareFromCampaign('npcs','${jsStr(d.id)}')` : `shareOneNpc('${jsStr(d.id)}')`}">
          ⚔️ ${su ? 'Ritira dal tavolo' : 'Condividi con la campagna'}</button>`; })() : ''}
      <div class="btn-row" style="margin-top:10px">
        <button class="btn btn-ghost" onclick="duplicateNpc('${d.id}')">⧉ Duplica</button>
        <button class="btn btn-danger" onclick="confirmDeleteNpc('${d.id}')">Elimina</button>
      </div>`:''}`;
  return modalShell((isEdit?'Modifica':'Nuovo') + ' PNG / Mostro', inner);
}
function saveNpcDraft(){
  if (!draftNpc.name.trim()){ toast('Dai un nome al PNG'); return; }
  if (draftNpc.hpCurrent == null) draftNpc.hpCurrent = draftNpc.hpMax;
  const idx = state.npcs.findIndex(n=>n.id===draftNpc.id);
  if (idx>=0) state.npcs[idx]=draftNpc; else state.npcs.push(draftNpc);
  bestiarioScorda();
  if (!currentUser) state.offlineMode = true;
  fsSet('npcs', draftNpc);
  closeModal(); render();
}
function duplicateNpc(id){
  const n = state.npcs.find(x=>x.id===id); if (!n) return;
  const copy = JSON.parse(JSON.stringify(n));
  copy.id = uid(); copy.createdAt = Date.now(); copy.name = n.name + ' (copia)';
  state.npcs.push(copy); bestiarioScorda(); fsSet('npcs', copy);
  closeModal(); render(); toast('⧉ Copia creata');
}
function addNpcToInitiative(npcId){
  closeModal();
  state.dmTab = 'initiative';
  addToCombat(npcId, 'npc');
}
function confirmDeleteNpc(id){
  const n = state.npcs.find(x=>x.id===id);
  confirmDialog('Eliminare ' + (n?n.name:'questo PNG') + '?', 'Finisce nel cestino: puoi rimetterlo a posto entro 30 giorni.', () => {
    if (typeof nelCestino === 'function') nelCestino('npcs', n);
    state.npcs = state.npcs.filter(x=>x.id!==id); bestiarioScorda();
    fsDelete('npcs', id);
    saveLocal(); render();
  }, 'Elimina');
}

/* ─── Iniziativa (salvata per la sessione) ─── */
function renderInitiativeTracker(){
  const { list, round, turn } = state.combat;
  return `
    ${list.length ? `
      <div class="card" style="margin-bottom:12px">
        <div class="row-between">
          <div>
            <div class="section-title" style="margin:0;">Round ${round}</div>
            <div class="muted" style="font-size:.74rem">Turno di ${escapeHtml((list[turn]||{}).name||'—')}</div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-sm btn-ghost" onclick="prevTurn()" aria-label="Turno precedente">←</button>
            <button class="btn btn-sm btn-gold" onclick="nextTurn()">Turno →</button>
          </div>
        </div>
      </div>
      <div class="list-gap">${list.map((cb,i)=>initRowHTML(cb,i,i===turn)).join('')}</div>
      <button class="btn btn-danger btn-block" style="margin-top:12px" onclick="confirmResetCombat()">Termina combattimento</button>
    ` : emptyState('⚔️','Nessun combattimento attivo. Aggiungi i combattenti qui sotto: l\'iniziativa viene tirata automaticamente.')}

    <div class="divider"><span class="flourish">❧</span><span>Aggiungi combattente</span></div>
    <div class="card">
      ${(state.characters.length||state.npcs.length) ? (()=>{
        /* Con un bestiario grosso questa era una fila di tremila pulsanti:
           adesso i personaggi restano sempre, le creature si cercano. */
        const q = (state.combatCercaQ||'').trim();
        const molti = state.npcs.length > 24;
        let mostri = state.npcs;
        if (molti){
          const nq = norm(q);
          mostri = q ? state.npcs.filter(n => norm(n.name||'').includes(nq) || norm(n.type||'').includes(nq)) : [];
        }
        return `${molti ? cercaLista('combat-cerca', q, 'combatCerca', 'Cerca fra le ' + state.npcs.length + ' creature del bestiario\u2026') : ''}
        <div class="chip-row" style="margin-bottom:12px;">
          ${state.characters.map(c=>`<button class="chip" onclick="addToCombat('${c.id}','pc')">${c.avatar||'⚔️'} ${escapeHtml(c.name)}</button>`).join('')}
          ${mostri.slice(0,40).map(n=>`<button class="chip" onclick="addToCombat('${n.id}','npc')">${n.avatar||'🐉'} ${escapeHtml(n.name)}</button>`).join('')}
        </div>
        ${molti && q && !mostri.length ? `<div class="lista-vuota">Nessuna creatura con questo nome.</div>` : ''}
        ${mostri.length > 40 ? `<div class="muted" style="font-size:.72rem; margin:-6px 0 12px">…e altre ${mostri.length-40}: restringi la ricerca.</div>` : ''}`;
      })() : ''}
      <div style="display:flex; gap:8px;">
        <input id="quick-combatant-name" placeholder="Nome rapido…" onkeydown="if(event.key==='Enter') addQuickCombatant()"
               style="flex:1; padding:12px 13px; border-radius:11px; border:1px solid var(--line); background:var(--bg-1); font-family:var(--font-body); min-width:0;">
        <button class="btn btn-gold" onclick="addQuickCombatant()">✦</button>
      </div>
      ${state.characters.length ? `<button class="btn btn-ghost btn-block btn-sm" style="margin-top:10px" onclick="addAllPartyToCombat()">Aggiungi tutto il party</button>` : ''}
    </div>
  `;
}
function initRowHTML(cb, i, isCurrent){
  const down = cb.hp != null && cb.hp <= 0;
  return `<div class="init-row ${isCurrent?'current-turn':''} ${down?'down':''}">
    <button class="init-badge" onclick="editCombatInit(${i})" title="Modifica iniziativa">${cb.init}</button>
    <div style="flex:1; min-width:0;">
      <div class="init-name">${cb.avatar?cb.avatar+' ':''}${escapeHtml(cb.name)}${down?' 💀':''}</div>
      <div class="init-hp">${cb.hp!=null ? ('PF ' + cb.hp + (cb.hpMax?('/'+cb.hpMax):'')) : (cb.kind==='quick'?'—':'')}</div>
    </div>
    <div class="init-actions">
      ${cb.hp!=null ? `<button class="stepper-btn" style="width:34px;height:34px;font-size:.9rem;" onclick="bumpCombatHP(${i},-1)" aria-label="-1 PF">−</button>
      <button class="stepper-btn" style="width:34px;height:34px;font-size:.9rem;" onclick="bumpCombatHP(${i},1)" aria-label="+1 PF">+</button>` : ''}
      <button class="btn-icon" style="width:34px;height:34px;font-size:.75rem;" onclick="removeFromCombat(${i})" aria-label="Rimuovi">✕</button>
    </div>
  </div>`;
}
function uniqueCombatName(base){
  base = base || 'Combattente';
  const same = state.combat.list.filter(c => c.name === base || (c.name||'').startsWith(base + ' #'));
  if (!same.length) return base;
  const first = state.combat.list.find(c => c.name === base);
  if (first) first.name = base + ' #1';
  return base + ' #' + (same.length + 1);
}
function addToCombat(refId, kind){
  const src = kind==='pc' ? charById(refId) : state.npcs.find(n=>n.id===refId);
  if (!src) return;
  const dexMod = kind==='pc' ? mod(getPath(src,'abilities.dex',10)) : 0;
  const init = rollDie(20) + (kind==='pc' ? (src.initiative ?? dexMod) : dexMod);
  state.combat.list.push({
    refId, kind, name: uniqueCombatName(src.name), avatar: src.avatar, init,
    hp: kind==='pc' ? getPath(src,'hp.current',0) : (src.hpCurrent ?? src.hpMax ?? 0),
    hpMax: kind==='pc' ? getPath(src,'hp.max',0) : (src.hpMax ?? 0),
  });
  sortCombat(); saveSession(); render();
}
function addAllPartyToCombat(){
  state.characters.forEach(c => {
    if (!state.combat.list.some(x => x.refId === c.id)) addToCombat(c.id, 'pc');
  });
}
function addQuickCombatant(){
  const el = document.getElementById('quick-combatant-name');
  if (!el) return;
  const name = el.value.trim();
  if (!name){ toast('Scrivi un nome'); el.focus(); return; }
  state.combat.list.push({ refId:null, kind:'quick', name: uniqueCombatName(name), avatar:'❔', init: rollDie(20), hp:null, hpMax:null });
  el.value = '';
  sortCombat(); saveSession(); render();
}
function editCombatInit(i){
  const cb = state.combat.list[i]; if (!cb) return;
  const inner = `
    <div class="field"><label>Iniziativa di ${escapeHtml(cb.name)}</label><input id="init-val" type="number" inputmode="numeric" value="${cb.init}"></div>
    ${cb.hp!=null?`<div class="form-row">
      <div class="field"><label>PF attuali</label><input id="init-hp" type="number" inputmode="numeric" value="${cb.hp}"></div>
      <div class="field"><label>PF max</label><input id="init-hpmax" type="number" inputmode="numeric" value="${cb.hpMax||0}"></div>
    </div>`:''}
    <button class="btn btn-primary btn-block" onclick="saveCombatInit(${i})">Salva</button>`;
  openModal({ render: () => modalShell('Modifica combattente', inner) });
}
function saveCombatInit(i){
  const cb = state.combat.list[i]; if (!cb) return;
  cb.init = parseInt((document.getElementById('init-val')||{}).value) || 0;
  const hpEl = document.getElementById('init-hp');
  if (hpEl){
    cb.hpMax = clamp(parseInt((document.getElementById('init-hpmax')||{}).value)||0, 0, 9999);
    cb.hp = clamp(parseInt(hpEl.value)||0, 0, cb.hpMax || 9999);
  }
  sortCombat(); saveSession(); closeModal(); render();
}
function sortCombat(){
  const current = state.combat.list[state.combat.turn];
  state.combat.list.sort((a,b)=>b.init-a.init);
  if (current){ const idx = state.combat.list.indexOf(current); if (idx>=0) state.combat.turn = idx; }
}
function bumpCombatHP(i, delta){
  const cb = state.combat.list[i]; if (!cb || cb.hp==null) return;
  cb.hp = clamp(cb.hp+delta, 0, cb.hpMax || 9999);
  // Se è un personaggio del party, aggiorna anche la sua scheda.
  if (cb.kind === 'pc'){
    const c = charById(cb.refId);
    if (c){ setPath(c,'hp.current', clamp(cb.hp, 0, getPath(c,'hp.max',9999))); scheduleSave('characters', c); }
  } else if (cb.kind === 'npc'){
    const n = state.npcs.find(x=>x.id===cb.refId);
    if (n){ n.hpCurrent = cb.hp; scheduleSave('npcs', n); }
  }
  saveSession(); render();
}
function removeFromCombat(i){
  state.combat.list.splice(i,1);
  if (state.combat.turn >= state.combat.list.length) state.combat.turn = 0;
  saveSession(); render();
}
function nextTurn(){
  if (!state.combat.list.length) return;
  state.combat.turn++;
  if (state.combat.turn >= state.combat.list.length){ state.combat.turn = 0; state.combat.round++; }
  saveSession(); render();
}
function prevTurn(){
  if (!state.combat.list.length) return;
  state.combat.turn--;
  if (state.combat.turn < 0){ state.combat.turn = state.combat.list.length - 1; state.combat.round = Math.max(1, state.combat.round - 1); }
  saveSession(); render();
}
function confirmResetCombat(){
  confirmDialog('Terminare il combattimento?', 'La lista dei combattenti verrà svuotata.', () => {
    state.combat = { list: [], round: 1, turn: 0 };
    saveSession(); render();
  }, 'Termina');
}

/* ─── 22. OPZIONI ─── */
function renderSettings(){
  const nChars = state.characters.length, nNpcs = state.npcs.length, nSpells = state.customSpells.length;
  return `
    <div class="hero" style="padding:16px;">
      <h1 style="font-size:1.5rem">Opzioni</h1>
      <div class="sub">Account, aspetto e backup</div>
    </div>

    <div class="divider"><span class="flourish">❧</span><span>Account</span></div>
    ${currentUser ? `
      <div class="card" style="display:flex; align-items:center; gap:12px;">
        <div class="seal" style="width:48px;height:48px;font-size:1.2rem;">👤</div>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(currentUser.displayName||'Avventuriero')}</div>
          <div class="muted" style="font-size:.76rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(currentUser.email||'')}</div>
        </div>
        <span class="badge gold">Sync</span>
      </div>
      <div class="btn-row" style="margin-top:10px;">
        <button class="btn btn-ghost" onclick="openAuthDiagnostics()">🔐 Diagnostica</button>
        <button class="btn btn-danger" onclick="confirmSignOut()">Esci</button>
      </div>
    ` : `
      <div class="card">
        <div class="card-title">📴 Modalità locale</div>
        <p class="muted" style="margin-bottom:12px">I dati sono salvati solo su questo dispositivo. Accedi con Google per ritrovarli su telefono e computer.</p>
        ${firebaseReady ? `<button class="btn btn-primary btn-block" onclick="signIn()">Accedi con Google</button>
        <button class="btn btn-ghost btn-block btn-sm" style="margin-top:10px" onclick="openAuthDiagnostics()">L'accesso non funziona?</button>` : `<p class="muted">Connessione ai server non disponibile in questo momento.</p>`}
      </div>
    `}

    <div class="divider"><span class="flourish">❧</span><span>Aspetto</span></div>
    <button class="switch-row" onclick="toggleTheme()">
      <div class="track"><div class="knob"></div></div>
      <div style="flex:1; text-align:left; font-weight:700; font-family:var(--font-ui)">Tema ${state.theme==='dark'?'Mezzanotte 🌙':'Pergamena ☀️'}</div>
    </button>

    <div class="divider"><span class="flourish">❧</span><span>Durante la sessione</span></div>
    <button class="switch-row" onclick="toggleKeepAwake()">
      <div class="track"><div class="knob" style="${state.keepAwake?'transform:translateX(21px)':''}"></div></div>
      <div style="flex:1; text-align:left; font-family:var(--font-ui)">
        <b>Schermo sempre acceso</b>
        <div class="muted" style="font-size:.74rem; font-weight:600">Il telefono non si spegne mentre hai l'app aperta.</div>
      </div>
    </button>
    <button class="switch-row" style="margin-top:8px" onclick="toggleHaptics()">
      <div class="track"><div class="knob" style="${state.haptics?'transform:translateX(21px)':''}"></div></div>
      <div style="flex:1; text-align:left; font-family:var(--font-ui)">
        <b>Vibrazione sui tiri</b>
        <div class="muted" style="font-size:.74rem; font-weight:600">Un colpetto sui 20 naturali e sui fallimenti critici.</div>
      </div>
    </button>

    <div class="divider"><span class="flourish">❧</span><span>Incantesimi</span></div>
    <button class="switch-row" onclick="toggleSpellLang()">
      <div class="track"><div class="knob" style="${state.spellLang==='it'?'transform:translateX(21px)':''}"></div></div>
      <div style="flex:1; text-align:left; font-weight:700; font-family:var(--font-ui)">Nomi ${state.spellLang==='it'?'in italiano 🇮🇹':'in inglese 🇬🇧'}</div>
    </button>
    <div class="card" style="margin-top:10px">
      <p class="muted" style="margin-bottom:12px">Nel compendio ci sono ${(typeof SRD_SPELLS!=='undefined'?SRD_SPELLS.length:0)} incantesimi SRD e ${state.customSpells.length} tuoi. Puoi aggiungerne quanti vuoi da un file JSON.</p>
      <div class="btn-row">
        <button class="btn btn-gold" onclick="openSpellImport()">⤒ Importa</button>
        <button class="btn btn-ghost" onclick="exportCustomSpells()">⤓ Esporta i tuoi</button>
      </div>
      ${state.customSpells.some(s=>s.imported) ? `<button class="btn btn-danger btn-block btn-sm" style="margin-top:10px" onclick="confirmClearImported()">Rimuovi gli incantesimi importati</button>` : ''}
    </div>

    <div class="divider"><span class="flourish">❧</span><span>Campagna</span></div>
    <div class="card">
      ${state.campaign
        ? `<div class="row-between" style="margin-bottom:8px"><span class="muted">Sei in</span><b>${escapeHtml(state.campaign.name||'una campagna')}</b></div>
           <div class="row-between" style="margin-bottom:10px"><span class="muted">In comune</span><b>${(state.sharedSpells||[]).length} incantesimi · ${(state.sharedHomebrew||[]).length} aggiunte</b></div>`
        : `<p class="muted" style="margin-bottom:10px">Un tavolo condiviso con i tuoi giocatori: quello che ci metti dentro lo vedono solo i membri. I personaggi restano privati.</p>`}
      <button class="btn ${state.campaign?'btn-ghost':'btn-gold'} btn-block" onclick="openCampaign()">⚔️ ${state.campaign?'Gestisci la campagna':'Crea o entra in una campagna'}</button>
    </div>

    <div class="divider"><span class="flourish">❧</span><span>Contenuti tuoi</span></div>
    <div class="card">
      <p class="muted" style="margin-bottom:12px">Sottoclassi, razze e background che non sono nell'SRD: li aggiungi tu dai manuali che possiedi e compaiono nella creazione guidata.${(state.homebrew||[]).length ? ' Ne hai <b>'+state.homebrew.length+'</b>.' : ''}</p>
      <button class="btn btn-gold btn-block" onclick="openHomebrew()">📚 Gestisci i tuoi contenuti</button>
    </div>

    <div class="divider"><span class="flourish">❧</span><span>I tuoi dati</span></div>
    <div class="card" style="margin-bottom:12px">
      <p class="muted" style="margin-bottom:12px">Cosa è al sicuro sul tuo account e cosa esiste solo qui. Quello che elimini resta recuperabile per 30 giorni.</p>
      <div class="btn-row">
        <button class="btn btn-gold" onclick="openSaluteDati()">🩺 Salute dei dati</button>
        <button class="btn btn-ghost" onclick="openCestino()">🗑️ Cestino${(typeof quantoNelCestino==='function' && quantoNelCestino())?' ('+quantoNelCestino()+')':''}</button>
      </div>
    </div>

    <div class="divider"><span class="flourish">❧</span><span>Backup</span></div>
    <div class="card">
      <p class="muted" style="margin-bottom:12px">Salva una copia di tutto (personaggi, bestiario, incantesimi personalizzati) in un file sul dispositivo, da reimportare quando vuoi.</p>
      <div class="btn-row">
        <button class="btn btn-gold" onclick="exportData()">⤓ Esporta</button>
        <button class="btn btn-ghost" onclick="triggerImport()">⤒ Importa</button>
      </div>
      <p class="muted" style="font-size:.75rem; margin-top:10px">«Importa» accetta anche una <b>scheda PDF compilabile</b> e i <b>PDF o file di testo dei tuoi manuali</b>: capisco da solo di che file si tratta.</p>
      <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="openPdfImport()">⇪ Importa una scheda PDF compilabile</button>
      <input type="file" id="import-file" accept="application/json,.json,application/pdf,.pdf,.txt,text/plain,.md" style="display:none" onchange="handleImportFile(this)">
    </div>

    <div class="divider"><span class="flourish">❧</span><span>Informazioni</span></div>
    <div class="card muted" style="font-size:.8rem;">
      <div class="row-between" style="margin-bottom:6px"><span>Personaggi</span><b>${nChars}</b></div>
      <div class="row-between" style="margin-bottom:6px"><span>Bestiario</span><b>${nNpcs}</b></div>
      <div class="row-between" style="margin-bottom:6px"><span>Incantesimi personalizzati</span><b>${nSpells}</b></div>
      <div class="row-between" style="margin-bottom:12px"><span>Versione</span><b>${APP_VERSION}</b></div>
      Gli incantesimi base provengono dal System Reference Document 5.1 di Wizards of the Coast (licenza Open Gaming License 1.0a), in lingua originale inglese.
    </div>
  `;
}
function confirmSignOut(){
  confirmDialog('Uscire dall\'account?', 'I dati restano al sicuro nel cloud: potrai rientrare quando vuoi con lo stesso account Google.', () => signOutUser(), 'Esci');
}

/* ─── BACKUP ─── */
function downloadJSON(payload, basename){
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  const stamp = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  a.href = url; a.download = basename + '-' + stamp + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 4000);
}
function exportData(){
  try {
    downloadJSON({
      app: 'grimorio', version: APP_VERSION, exportedAt: new Date().toISOString(),
      characters: state.characters, npcs: state.npcs,
      customSpells: state.customSpells, spellTags: state.spellTags, homebrew: state.homebrew,
      journal: state.journal
    }, 'grimorio-backup');
    toast('⤓ Backup esportato');
  } catch(e){ console.error(e); toast('⚠️ Esportazione non riuscita'); }
}
function exportCustomSpells(){
  if (!state.customSpells.length){ toast('Non hai ancora incantesimi tuoi'); return; }
  downloadJSON({ app:'grimorio', type:'spells', version: APP_VERSION, spells: state.customSpells }, 'grimorio-incantesimi');
  toast('⤓ Incantesimi esportati');
}
function triggerImport(){ const el = document.getElementById('import-file'); if (el) el.click(); }
/* Il tasto «Importa» accetta qualsiasi cosa l'app sappia leggere e sceglie
   da sé la strada: backup JSON, scheda PDF compilabile, oppure manuale
   (PDF o testo) da cui pescare sottoclassi, razze e background. */
function handleImportFile(input){
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  const nome = file.name || '';
  const isPdf  = /pdf/i.test(file.type||'') || /\.pdf$/i.test(nome);
  const isJson = /json/i.test(file.type||'') || /\.json$/i.test(nome);
  const isTesto = /\.(txt|md)$/i.test(nome) || /^text\/(plain|markdown)$/i.test(file.type||'');

  if (isPdf){ instradaPdf(file); return; }
  if (isTesto && typeof hbBulkUsaFile === 'function'){
    openHomebrewBulk(); hbBulkUsaFile([file]); return;
  }
  if (!isJson && !isTesto){ toast('⚠️ Non so leggere questo tipo di file'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try { data = JSON.parse(reader.result); }
    catch(e){ toast('⚠️ File non valido'); return; }
    if (data && data.type === 'spells' && Array.isArray(data.spells)){
      openSpellImport(); analyzeSpellImport(JSON.stringify(data)); return;
    }
    if (!data || (!Array.isArray(data.characters) && !Array.isArray(data.npcs) && !Array.isArray(data.customSpells))){
      toast('⚠️ Questo file non è un backup di TwentyNation'); return;
    }
    const nc = (data.characters||[]).length, nn = (data.npcs||[]).length, ns = (data.customSpells||[]).length;
    confirmDialog('Importare il backup?',
      `Contiene ${nc} ${pluralize(nc,'personaggio','personaggi')}, ${nn} PNG e ${ns} ${pluralize(ns,'incantesimo','incantesimi')} personalizzati. Le voci con lo stesso identificativo verranno aggiornate, il resto viene aggiunto.`,
      () => doImport(data), 'Importa');
  };
  reader.onerror = () => toast('⚠️ Impossibile leggere il file');
  reader.readAsText(file);
}
/* Una scheda compilabile ha i campi del modulo; un manuale no. Lo si
   capisce provando a leggerli, senza chiedere niente all'utente. */
async function instradaPdf(file){
  if (typeof readPdfFields !== 'function'){ toast('⚠️ Non so leggere questo tipo di file'); return; }
  toast('Sto guardando che PDF è…');
  let campi = [];
  try {
    const buf = await file.arrayBuffer();
    campi = await readPdfFields(buf);
  } catch(e){
    console.warn('PDF senza campi leggibili', e);
    campi = [];
  }
  if (campi.length && typeof useSheetPdf === 'function'){
    openPdfImport(); useSheetPdf(file); return;
  }
  if (typeof hbBulkUsaFile === 'function'){
    openHomebrewBulk(); hbBulkUsaFile([file]); return;
  }
  toast('⚠️ Questo PDF non ha campi compilabili da leggere');
}
function doImport(data){
  const mergeIn = (key, arr, mapper) => {
    if (!Array.isArray(arr)) return 0;
    let n = 0;
    arr.forEach(item => {
      if (!item || !item.id) return;
      const obj = mapper ? mapper(item) : item;
      const idx = state[key].findIndex(x => x.id === obj.id);
      if (idx >= 0) state[key][idx] = obj; else state[key].push(obj);
      fsSet(key, obj);
      n++;
    });
    return n;
  };
  const a = mergeIn('characters', data.characters, migrateCharacter);
  const b = mergeIn('npcs', data.npcs);
  const c = mergeIn('customSpells', data.customSpells || data.spells);
  mergeIn('spellTags', data.spellTags);
  mergeIn('homebrew', data.homebrew);
  const d = mergeIn('journal', data.journal);
  saveLocal();
  state.offlineMode = true;
  render();
  toast(`⤒ Importati: ${a} personaggi, ${b} PNG, ${c} incantesimi${d?`, ${d} voci di diario`:''}`);
}

/* ─── 23. TIRA DADI ─── */
function openDiceRoller(){ openModal({ render: () => diceRollerHTML() }); }
function diceRollerHTML(){
  const hist = state.diceHistory || [];
  const inner = `
      <div class="chip-row" style="margin-bottom:16px;">
        ${DICE_TYPES.map(d=>`<button class="chip" style="font-size:.9rem;padding:11px 17px;" onclick="doRoll(1,${d},0)">d${d}</button>`).join('')}
      </div>
      <div class="form-row-3">
        <div class="field"><label>N. dadi</label><input id="dice-count" type="number" inputmode="numeric" min="1" max="100" value="1"></div>
        <div class="field"><label>Facce</label><input id="dice-sides" type="number" inputmode="numeric" min="2" max="1000" value="20"></div>
        <div class="field"><label>Modif.</label><input id="dice-mod" type="number" inputmode="numeric" value="0"></div>
      </div>
      <button class="btn btn-primary btn-block" onclick="doRollCustom()">🎲 Tira</button>
      ${hist.length ? `
        <div class="divider"><span class="flourish">❧</span><span>Cronologia</span></div>
        <div class="list-gap">${hist.slice(0,10).map(h=>`<div class="hist-item">
          <span class="l">${escapeHtml(h.label)}${h.detail?' · '+escapeHtml(h.detail):''}</span>
          <span class="t">${h.total}</span>
        </div>`).join('')}</div>
        <button class="btn btn-ghost btn-block btn-sm" style="margin-top:10px" onclick="clearDiceHistory()">Svuota cronologia</button>
      ` : ''}`;
  return modalShell('🎲 Tira i dadi', inner);
}
function clearDiceHistory(){ state.diceHistory = []; saveSession(); renderModalRoot(); }
function doRoll(count, sides, bonus){
  count = clamp(count,1,100); sides = clamp(sides,2,1000); bonus = Number(bonus)||0;
  const rolls = Array.from({length:count}, ()=>rollDie(sides));
  const sum = rolls.reduce((a,b)=>a+b,0);
  const total = sum + bonus;
  const label = `${count}d${sides}${bonus?signStr(bonus):''}`;
  state.diceHistory.unshift({ label, total, detail: `[${rolls.join(', ')}]` });
  state.diceHistory = state.diceHistory.slice(0,30);
  saveSession();
  if (count === 1 && sides === 20){
    showRollResult({ label, nat: rolls[0], modifier: bonus, total, mode:'normal', repeat: {t:'plain'} });
    return;
  }
  openModal({ render: () => `
    <div class="overlay center" onclick="if(event.target===this) closeModal()">
      <div class="sheet-modal frame" style="text-align:center;">
        <div class="roll-card">
          <div class="roll-label">${escapeHtml(label)}</div>
          <div class="roll-total" style="margin:14px 0 6px">${total}</div>
          <div class="roll-detail">[${rolls.join(', ')}]${bonus?` ${signStr(bonus)}`:''}</div>
        </div>
        <div class="btn-row" style="margin-top:16px">
          <button class="btn btn-ghost" onclick="doRoll(${count},${sides},${bonus})">↻ Ritira</button>
          <button class="btn btn-primary" onclick="openDiceRoller()">Chiudi</button>
        </div>
      </div>
    </div>` });
}
function doRollCustom(){
  const count = clamp(parseInt((document.getElementById('dice-count')||{}).value)||1, 1, 100);
  const sides = clamp(parseInt((document.getElementById('dice-sides')||{}).value)||20, 2, 1000);
  const bonus = parseInt((document.getElementById('dice-mod')||{}).value)||0;
  doRoll(count, sides, bonus);
}

/* ─── 24. IMPORTAZIONE DI MASSA DEGLI INCANTESIMI ────────────────
   Accetta un file (o un testo incollato) in JSON e riconosce da solo
   i formati più diffusi: quello di TwentyNation, quello di Open5e
   (v1 e v2) e quello di 5e-bits/5e-database. Gli incantesimi entrano
   fra i tuoi "personalizzati", quindi sono sincronizzati sull'account
   e modificabili come tutti gli altri.
*/
const CLASS_ALIASES = (() => {
  const m = {};
  Object.keys(CLASSES_IT).forEach(en => {
    m[norm(en)] = en;
    m[norm(CLASSES_IT[en])] = en;
  });
  m['artificiere'] = 'Artificer'; m['artefice'] = 'Artificer';
  m['mago'] = 'Wizard'; m['stregone'] = 'Sorcerer'; m['guerriero'] = 'Fighter';
  return m;
})();
function classFromAny(v){
  if (!v) return null;
  const s = typeof v === 'object' ? (v.name || v.key || v.index || '') : String(v);
  return CLASS_ALIASES[norm(s)] || null;
}
function schoolFromAny(v){
  if (!v) return '';
  const s = typeof v === 'object' ? (v.name || v.key || v.index || '') : String(v);
  const en = Object.keys(SCHOOLS_IT).find(k => norm(k) === norm(s));
  if (en) return SCHOOLS_IT[en];
  if (SCHOOLS_ALIAS[norm(s)]) return SCHOOLS_ALIAS[norm(s)];
  const it = Object.values(SCHOOLS_IT).find(k => norm(k) === norm(s));
  return it || s;
}
function truthy(v){
  if (typeof v === 'boolean') return v;
  if (v == null) return false;
  return /^(true|yes|si|sì|1|y)$/i.test(String(v).trim());
}
function joinText(v){
  if (v == null) return '';
  if (Array.isArray(v)) return v.filter(x=>typeof x === 'string').join('\n');
  if (typeof v === 'object') return '';
  return String(v);
}
function slugify(s){
  return norm(s).replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60) || 'spell';
}
function mapImportedSpell(s){
  if (!s || typeof s !== 'object') return null;
  const name = String(s.name || s.nome || s.title || '').trim();
  if (!name) return null;

  let level = s.level != null ? s.level : (s.level_int != null ? s.level_int : s.livello);
  if (typeof level === 'object') level = 0;
  if (typeof level === 'string') level = /cantrip|trucchetto|0/i.test(level) && !/1|2|3|4|5|6|7|8|9/.test(level.replace(/0/g,'')) ? 0 : (parseInt(level) || 0);
  level = clamp(level, 0, 9);

  let cast = s.cast || s.casting_time || s.castingTime || s.tempo || '';
  if (typeof cast === 'object') cast = '';
  let range = s.range_text || s.range || s.gittata || '';
  if (typeof range === 'number') range = range + ' ft';
  if (typeof range === 'object') range = '';
  let dur = s.dur || s.duration || s.durata || '';
  if (typeof dur === 'object') dur = '';

  let comp = s.comp != null ? s.comp : s.components;
  if (Array.isArray(comp)) comp = comp.join(', ');
  if (comp == null && (s.verbal != null || s.somatic != null || s.material != null)){
    comp = [truthy(s.verbal) && 'V', truthy(s.somatic) && 'S', truthy(s.material) && 'M'].filter(Boolean).join(', ');
  }
  if (typeof comp !== 'string') comp = '';

  let mat = s.mat || s.material_specified || s.materials || '';
  if (typeof s.material === 'string' && !mat) mat = s.material;
  if (typeof mat !== 'string') mat = '';

  let classes = s.classes || s.dnd_class || s.class || s.classi || s.spell_lists || [];
  if (typeof classes === 'string') classes = classes.split(/[,;/]+/);
  if (!Array.isArray(classes)) classes = [];
  classes = classes.map(classFromAny).filter(Boolean);
  classes = classes.filter((c,i) => classes.indexOf(c) === i);

  return {
    id: 'imp-' + slugify(name),
    name,
    level,
    school: schoolFromAny(s.school || s.scuola),
    cast: String(cast).trim(),
    range: String(range).trim(),
    comp: comp.trim(),
    mat: String(mat).trim(),
    dur: String(dur).trim(),
    conc: truthy(s.conc != null ? s.conc : s.concentration) || /concentraz|concentration/i.test(String(dur)),
    ritual: truthy(s.ritual != null ? s.ritual : s.can_be_cast_as_ritual),
    classes,
    desc: joinText(s.desc || s.description || s.descrizione).trim(),
    higher: joinText(s.higher || s.higher_level || s.at_higher_levels).trim(),
    imported: true,
    createdAt: Date.now()
  };
}
function normalizeImportedSpells(raw){
  let arr = null;
  if (Array.isArray(raw)) arr = raw;
  else if (raw && typeof raw === 'object'){
    arr = raw.spells || raw.results || raw.customSpells || raw.data || raw.incantesimi || null;
    if (!Array.isArray(arr)){
      const vals = Object.values(raw).filter(v => v && typeof v === 'object' && (v.name || v.nome));
      arr = vals.length ? vals : null;
    }
  }
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = {};
  arr.forEach(item => {
    const sp = mapImportedSpell(item);
    if (!sp) return;
    if (seen[sp.id]) return;
    seen[sp.id] = 1;
    out.push(sp);
  });
  return out;
}

let pendingImport = null;
function openSpellImport(){
  pendingImport = null;
  openModal({ render: () => spellImportHTML() });
}
function spellImportHTML(){
  if (pendingImport) return spellImportPreviewHTML();
  const inner = `
    <p class="muted" style="margin-bottom:14px">
      Scegli un file — va bene sia un <b>PDF</b> di incantesimi sia un <b>.json</b> — oppure incolla il testo qui sotto.
      Vengono riconosciuti da soli i formati di TwentyNation, di Open5e e di 5e-database.
      Gli incantesimi finiscono fra i tuoi personalizzati: restano modificabili e si sincronizzano sull'account.
    </p>
    <div class="btn-row">
      <button class="btn btn-gold" onclick="document.getElementById('spell-import-file').click()">📂 Scegli un file</button>
      <button class="btn btn-gold" onclick="openSpellPdfImport()">📄 Da un PDF</button>
    </div>
    <input type="file" id="spell-import-file" accept="application/json,.json,.txt,application/pdf,.pdf" style="display:none" onchange="handleSpellImportFile(this)">
    <div class="divider"><span class="flourish">❧</span><span>oppure incolla</span></div>
    <div class="field">
      <textarea id="spell-import-text" style="min-height:130px; font-family:var(--font-ui); font-size:.8rem" placeholder='[{"name":"Hex","level":1,"school":"Enchantment","cast":"1 azione bonus","range":"27 metri","comp":"V, S, M","dur":"Concentrazione, 1 ora","classes":["Warlock"],"desc":"..."}]'></textarea>
      <div class="field-hint">Basta un elenco di oggetti con almeno <b>name</b>; tutto il resto è facoltativo.</div>
    </div>
    <button class="btn btn-primary btn-block" onclick="analyzeSpellImport()">Analizza</button>
    <div class="spell-source-note">Carica solo materiale di cui hai i diritti: i tuoi appunti, il tuo homebrew o archivi con licenza aperta (SRD, OGL, Creative Commons).</div>`;
  return modalShell('⤒ Importa incantesimi', inner);
}
function spellImportPreviewHTML(){
  const p = pendingImport;
  const inner = `
    <div class="card" style="margin-bottom:14px">
      <div class="row-between" style="margin-bottom:6px"><span class="muted">Trovati nel file</span><b>${p.all.length}</b></div>
      <div class="row-between" style="margin-bottom:6px"><span class="muted">Nuovi</span><b style="color:var(--good)">${p.fresh.length}</b></div>
      <div class="row-between" style="margin-bottom:6px"><span class="muted">Già tuoi (verranno aggiornati)</span><b>${p.dupCustom.length}</b></div>
      <div class="row-between"><span class="muted">Già presenti nell'SRD</span><b>${p.dupSrd.length}</b></div>
    </div>
    <button class="switch-row" style="margin-bottom:14px" onclick="toggleImportSkipSrd()">
      <div class="track"><div class="knob" style="${pendingImport.skipSrd?'transform:translateX(21px)':''}"></div></div>
      <div style="flex:1; text-align:left; font-weight:700; font-family:var(--font-ui); font-size:.84rem">Salta quelli già presenti nell'SRD</div>
    </button>
    ${(typeof campaignReady === 'function' && campaignReady()) ? `
      <button class="switch-row" style="margin-bottom:14px" onclick="toggleImportShare()">
        <div class="track"><div class="knob" style="${pendingImport.shareToCamp?'transform:translateX(21px)':''}"></div></div>
        <div style="flex:1; text-align:left; font-family:var(--font-ui)">
          <b style="font-size:.84rem">Condividi con «${escapeHtml(state.campaign.name||'la campagna')}»</b>
          <div class="muted" style="font-size:.73rem; font-weight:600">Li vedranno i membri del tuo tavolo. Restano comunque anche fra i tuoi.</div>
        </div>
      </button>` : ''}
    <div class="muted" style="margin-bottom:8px">Anteprima:</div>
    <div class="list-gap" style="margin-bottom:16px">
      ${p.toImport.slice(0,6).map(s=>`<div class="spell-item">
        <span class="spell-lvl-badge">${s.level===0?'C':s.level}</span>
        <span class="spell-item-body">
          <span class="spell-item-name">${escapeHtml(s.name)}</span>
          <span class="spell-item-meta">${escapeHtml(s.school||'—')}${s.classes.length?' · '+escapeHtml(s.classes.map(c=>CLASSES_IT[c]||c).join(', ')):''}</span>
        </span>
      </div>`).join('') || emptyState('🤔','Non c\'è niente da importare con queste impostazioni.')}
      ${p.toImport.length>6?`<div class="muted" style="text-align:center">…e altri ${p.toImport.length-6}</div>`:''}
    </div>
    <button class="btn btn-primary btn-block" ${p.toImport.length?'':'disabled'} onclick="confirmSpellImport()">Importa ${p.toImport.length} incantesim${p.toImport.length===1?'o':'i'}</button>
    <button class="btn btn-ghost btn-block" style="margin-top:10px" onclick="pendingImport=null; renderModalRoot()">← Indietro</button>`;
  return modalShell('⤒ Anteprima importazione', inner);
}
function handleSpellImportFile(input){
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  // Se è un PDF lo passiamo al lettore apposta: chi sceglie il file
  // non deve preoccuparsi di aver premuto il pulsante giusto.
  const isPdf = /pdf/i.test(file.type || '') || /\.pdf$/i.test(file.name || '');
  if (isPdf){
    if (typeof spellPdfUseFile === 'function') spellPdfUseFile(file);
    else toast('⚠️ Lettore PDF non disponibile: aggiorna l\'app');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => analyzeSpellImport(reader.result);
  reader.onerror = () => toast('⚠️ Impossibile leggere il file');
  reader.readAsText(file);
}
function analyzeSpellImport(text){
  if (text == null){
    const el = document.getElementById('spell-import-text');
    text = el ? el.value : '';
  }
  if (!String(text).trim()){ toast('Incolla il testo o scegli un file'); return; }
  let data;
  try { data = JSON.parse(text); }
  catch(e){ toast('⚠️ Il testo non è JSON valido'); return; }
  const all = normalizeImportedSpells(data);
  if (!all.length){ toast('⚠️ Nessun incantesimo riconosciuto nel file'); return; }
  const srdNames = new Set((typeof SRD_SPELLS!=='undefined'?SRD_SPELLS:[]).map(s=>norm(s.name)));
  const customNames = new Set(state.customSpells.map(s=>norm(s.name)));
  pendingImport = {
    all,
    skipSrd: true,
    shareToCamp: false,
    dupSrd: all.filter(s=>srdNames.has(norm(s.name))),
    dupCustom: all.filter(s=>customNames.has(norm(s.name))),
    fresh: all.filter(s=>!srdNames.has(norm(s.name)) && !customNames.has(norm(s.name))),
    toImport: []
  };
  recomputeImport();
  renderModalRoot();
}
function toggleImportShare(){
  if (!pendingImport) return;
  pendingImport.shareToCamp = !pendingImport.shareToCamp;
  renderModalRoot();
}
function recomputeImport(){
  const p = pendingImport;
  const srdNames = new Set((typeof SRD_SPELLS!=='undefined'?SRD_SPELLS:[]).map(s=>norm(s.name)));
  p.toImport = p.skipSrd ? p.all.filter(s=>!srdNames.has(norm(s.name))) : p.all.slice();
}
function toggleImportSkipSrd(){ pendingImport.skipSrd = !pendingImport.skipSrd; recomputeImport(); renderModalRoot(); }
async function confirmSpellImport(){
  const list = pendingImport.toImport;
  if (!list.length) return;
  // Riusa l'id di un incantesimo già presente con lo stesso nome: reimportare
  // lo stesso file aggiorna invece di creare doppioni.
  const byName = {};
  state.customSpells.forEach(s => { byName[norm(s.name)] = s; });
  const saved = [];
  list.forEach(sp => {
    const existing = byName[norm(sp.name)];
    if (existing){
      sp.id = existing.id;
      const i = state.customSpells.findIndex(s=>s.id===existing.id);
      state.customSpells[i] = sp;
    } else {
      let id = sp.id, n = 2;
      while (state.customSpells.some(s=>s.id===id)) id = sp.id + '-' + (n++);
      sp.id = id;
      state.customSpells.push(sp);
    }
    saved.push(sp);
  });
  saveLocal();
  closeModal();
  state.offlineMode = state.offlineMode || !currentUser;
  render();
  toast(`⤒ ${saved.length} incantesim${saved.length===1?'o':'i'} nel Grimorio`);
  const condividi = pendingImport && pendingImport.shareToCamp;
  await bulkSaveSpells(saved);
  if (condividi && typeof shareToCampaign === 'function'){
    const n = await shareToCampaign('spells', saved);
    if (n) toast('⚔️ ' + n + ' anche nella campagna');
  }
  pendingImport = null;
}
async function bulkSaveSpells(list){
  if (!currentUser || !firebaseReady){ setSaveStatus('offline'); return; }
  setSaveStatus('saving');
  try {
    for (let i=0; i<list.length; i+=400){
      const batch = db.batch();
      list.slice(i, i+400).forEach(sp => {
        const payload = JSON.parse(JSON.stringify(sp));
        payload.updatedAt = Date.now();
        payload.syncedAt = payload.updatedAt;
        batch.set(userCol('customSpells').doc(sp.id), payload, {merge:true});
      });
      await batch.commit();
      list.slice(i, i+400).forEach(sp => { sp.syncedAt = Date.now(); });
    }
    setSaveStatus('saved');
  } catch(e){
    console.error('Errore importazione', e);
    setSaveStatus('offline');
    toast('⚠️ Salvati in locale: sincronizzazione non riuscita');
  }
}
function confirmClearImported(){
  const n = state.customSpells.filter(s=>s.imported).length;
  if (!n){ toast('Nessun incantesimo importato da rimuovere'); return; }
  confirmDialog('Rimuovere gli incantesimi importati?', `Verranno eliminati ${n} incantesimi arrivati da un file (quelli scritti a mano restano). Verranno tolti anche dalle schede.`, () => {
    const ids = state.customSpells.filter(s=>s.imported).map(s=>s.id);
    state.customSpells = state.customSpells.filter(s=>!s.imported);
    ids.forEach(id => fsDelete('customSpells', id));
    state.characters.forEach(c => {
      const before = (c.knownSpells||[]).length;
      c.knownSpells = (c.knownSpells||[]).filter(k => !(k.source==='custom' && ids.includes(k.id)));
      if (c.knownSpells.length !== before) fsSet('characters', c);
    });
    saveLocal(); render();
    toast('Incantesimi importati rimossi');
  }, 'Rimuovi');
}

/* ─── 24. EFFETTI AMBIENTE ─── */
function spawnEmbers(){
  const box = document.getElementById('embers');
  if (!box) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const n = window.innerWidth < 700 ? 8 : 14;
  let html = '';
  for (let i=0;i<n;i++){
    const left = Math.random()*100;
    const dur = 14 + Math.random()*16;
    const delay = Math.random()*24;
    const size = 2 + Math.random()*2.4;
    html += `<i style="left:${left.toFixed(1)}%;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;animation-duration:${dur.toFixed(1)}s;animation-delay:-${delay.toFixed(1)}s"></i>`;
  }
  box.innerHTML = html;
}

/* ─── 25. SERVICE WORKER + AVVIO ─── */
/* Un'app installata sul telefono può restare ferma a una versione
   vecchia per giorni: il browser ricontrolla il service worker solo
   quando gli pare. Quindi lo chiediamo noi, all'avvio e ogni volta che
   l'app torna in primo piano, e quando la versione nuova è pronta lo
   diciamo con una striscia che resta lì finché non si tocca. */
let __swReg = null;
function registerSW(){
  if (!('serviceWorker' in navigator)) return;
  const watch = (reg) => {
    const nw = reg.installing || reg.waiting;
    if (!nw) return;
    if (nw.state === 'installed' && navigator.serviceWorker.controller) markUpdateReady();
    nw.addEventListener('statechange', () => {
      if (nw.state === 'installed' && navigator.serviceWorker.controller) markUpdateReady();
    });
  };
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      __swReg = reg;
      if (reg.waiting && navigator.serviceWorker.controller) markUpdateReady();
      reg.addEventListener('updatefound', () => watch(reg));
      checkForUpdate();
    }).catch(err => console.warn('Service worker non registrato:', err));
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
}
let __lastUpdateCheck = 0;
function checkForUpdate(){
  if (!__swReg) return;
  const now = Date.now();
  if (now - __lastUpdateCheck < 60000) return; // non più di una volta al minuto
  __lastUpdateCheck = now;
  try { __swReg.update(); } catch(e){}
}
function markUpdateReady(){
  if (state.updateReady) return;
  state.updateReady = true;
  render();
}
function updateBannerHTML(){
  if (!state.updateReady) return '';
  return `<div class="update-banner">
    <span>✨ C'è una versione nuova di TwentyNation.</span>
    <button class="btn btn-sm btn-gold" onclick="forceAppUpdate()">Aggiorna ora</button>
  </div>`;
}

// Scorciatoie dell'icona dell'app (tieni premuta l'icona sul telefono).
function handleLaunchShortcut(){
  let a = null;
  try { a = new URLSearchParams(location.search).get('a'); } catch(e){ return; }
  if (!a) return;
  if (a === 'dice') openDiceRoller();
  else if (a === 'grimoire' || a === 'dm' || a === 'settings'){ state.view = a === 'grimoire' ? 'grimoire' : a; replaceNav(); render(); }
}

function boot(){
  loadLocal();
  caricaVisti();
  if (typeof caricaCestino === 'function') caricaCestino();
  loadSession();
  if (typeof loadCampaignLocal === 'function') loadCampaignLocal();
  spawnEmbers();
  installWheelForwarding();
  installFabAutoHide();
  applyWakeLock();
  if (localStorage.getItem('grimorio-offline') === '1') state.offlineMode = true;
  replaceNav();

  firebaseReady = initFirebase();
  if (firebaseReady){
    try {
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .catch(e => console.warn('Persistenza non impostabile', e));
    } catch(e){ console.warn('Persistenza non impostabile', e); }
    handleRedirectResult();
    auth.onAuthStateChanged(u => {
      currentUser = u;
      state.authReady = true;
      if (u){
        state.offlineMode = false;
        localStorage.removeItem('grimorio-offline');
        cambiaCassetto(u.uid);
        attachFirestore(u.uid);
        if (typeof attachCampaign === 'function') attachCampaign();
      }
      else detachFirestore();
      render();
    });
    // Rete di sicurezza: se Firebase non risponde entro 6s si parte comunque in locale.
    setTimeout(() => { if (!state.authReady){ state.authReady = true; render(); } }, 6000);
  } else {
    state.authReady = true;
    render();
  }
  render();
  registerSW();
  handleLaunchShortcut();

  // Salvataggio immediato quando l'app va in background (chiusura app da telefono).
  installSheetSwipe();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushPendingSaves(); });
  window.addEventListener('pagehide', flushPendingSaves);
  window.addEventListener('online', () => { if (currentUser) setSaveStatus('saved'); });
}

/* I file sono caricati con «defer»: quando app.js finisce, quelli dopo
   (campaign.js, homebrew.js, traduci.js…) NON sono ancora stati eseguiti e
   le loro funzioni non esistono. Partire subito significava saltare il
   ripristino della campagna a ogni avvio. Si aspetta che ci siano tutti. */
let __avviato = false;
function avvia(){ if (__avviato) return; __avviato = true; boot(); }
if (document.readyState === 'complete') avvia();
else {
  document.addEventListener('DOMContentLoaded', avvia, { once: true });
  window.addEventListener('load', avvia, { once: true });   // rete di sicurezza
}

/* ══════════════════════════════════════════════════════════════
   Cambio rapido di personaggio e ricerca globale
   ══════════════════════════════════════════════════════════════ */

/* Dal nome nella barra della scheda: salti su un altro personaggio
   senza tornare al party. Comodo quando ne gestisci più di uno. */
/* Le azioni che non servono a ogni turno stanno in un menù:
   così in cima alla scheda restano il nome e il riposo, e su
   telefono il livello non finisce tagliato. */
function openSheetMenu(charId){
  const c = charById(charId); if (!c) return;
  const item = (icon, label, sub, action) => `<button class="attack-row" style="width:100%; text-align:left" onclick="closeModal(); ${action}">
    <span style="flex-shrink:0; margin-right:11px; font-size:1.15rem">${icon}</span>
    <span class="attack-main">
      <span class="attack-name">${label}</span>
      <span class="muted" style="font-size:.74rem; display:block">${sub}</span>
    </span>
  </button>`;
  openModal({ render: () => modalShell('⋯ ' + escapeHtml(c.name || 'Scheda'), `
    <div class="list-gap">
      ${item('🏕️', 'Riposo', 'Breve o lungo, con i dadi vita e le risorse', `openRestModal('${c.id}')`)}
      ${(c.level||1) < 20 ? item('📈', 'Sali di livello', 'Dal ' + (c.level||1) + '° al ' + ((c.level||1)+1) + '°, con privilegi e punti ferita', `openLevelUp('${c.id}')`) : ''}
      ${item('📄', 'Esporta in PDF', 'Un foglio da stampare o da mandare al master', `exportCharacterPdf('${c.id}')`)}
      ${item('✎', 'Modifica la scheda', 'Nome, caratteristiche, competenze, tutto il resto', `openCharacterForm('${c.id}')`)}
      ${item('🖼️', 'Cambia ritratto', 'Una foto o un disegno al posto del simbolo', `choosePortrait(u=>setCharPortrait('${c.id}',u))`)}
      ${state.characters.length > 1 ? item('🎭', 'Cambia personaggio', 'Salta su un\'altra scheda senza tornare al party', `openCharSwitcher()`) : ''}
    </div>`) });
}
function openCharSwitcher(){
  if (state.characters.length <= 1){ openCharacterForm(state.activeCharId); return; }
  openModal({ render: () => modalShell('🎭 Cambia personaggio', `
    <div class="list-gap">
      ${state.characters.map(c=>`<button class="attack-row" style="width:100%; text-align:left; ${c.id===state.activeCharId?'border-color:var(--gold)':''}" onclick="switchChar('${c.id}')">
        <span style="flex-shrink:0; margin-right:10px">${avatarHTML(c, 34)}</span>
        <span class="attack-main">
          <span class="attack-name">${escapeHtml(c.name||'Senza nome')}${c.id===state.activeCharId?' ✓':''}</span>
          <span class="muted" style="font-size:.74rem; display:block">${escapeHtml(c.classField||'Avventuriero')} · Lv ${c.level||1} · ${getPath(c,'hp.current',0)}/${getPath(c,'hp.max',0)} PF</span>
        </span>
      </button>`).join('')}
    </div>
    <button class="btn btn-ghost btn-block" style="margin-top:12px" onclick="closeModal(); goView('party')">Torna al party</button>`) });
}
function switchChar(id){
  closeModal();
  if (id === state.activeCharId) return;
  state.activeCharId = id; state.sheetTab = 'overview'; state.knownFilter = 'all';
  render(); scrollTop();
}

/* Ricerca globale: un solo campo per personaggi, incantesimi,
   creature, PNG, condizioni e aggiunte personali. */
function openGlobalSearch(){
  state.search = { open: true, q: '' };
  openModal({ render: globalSearchHTML, after: () => {
    const el = document.getElementById('gs-input');
    if (el && document.activeElement !== el) el.focus();
  }});
}
function globalSearchResults(q){
  const n = norm(q);
  if (n.length < 2) return [];
  const out = [];
  const push = (kind, icon, label, sub, action) => out.push({ kind, icon, label, sub, action });

  state.characters.forEach(c => {
    if (norm(c.name||'').includes(n) || norm(c.classField||'').includes(n) || norm(c.race||'').includes(n))
      push('Personaggi', '🎭', c.name || 'Senza nome', `${c.classField||'Avventuriero'} · Lv ${c.level||1}`,
        `closeModal(); openSheet('${c.id}')`);
  });

  allSpells().forEach(sp => {
    if (norm(spellName(sp)).includes(n) || norm(sp.name||'').includes(n))
      push('Incantesimi', '📖', spellName(sp), (sp.level ? sp.level + '° livello' : 'Trucchetto') + ' · ' + (sp.school || ''),
        `closeModal(); viewSpellDetail('${jsStr(sp.id)}','${sp.source}')`);
  });

  if (typeof SRD_MONSTERS !== 'undefined') SRD_MONSTERS.forEach(m => {
    if (norm(monsterName(m)).includes(n) || norm(m.n).includes(n))
      push('Bestiario SRD', '🐉', monsterName(m), `${m.sz} · ${m.t} · GS ${m.cr}`, `closeModal(); viewMonster('${m.id}')`);
  });

  state.npcs.forEach(p => {
    if (norm(p.name||'').includes(n) || norm(p.type||'').includes(n))
      push('I tuoi PNG', '👤', p.name || 'Senza nome', p.type || '', `closeModal(); openNpcForm('${p.id}')`);
  });

  if (typeof CONDITIONS !== 'undefined') CONDITIONS.forEach(cd => {
    if (norm(cd.name).includes(n))
      push('Condizioni', cd.icon, cd.name, cd.desc, `closeModal(); infoDialog('${jsStr(cd.icon + ' ' + cd.name)}','${jsStr(cd.desc)}')`);
  });

  if (typeof SRD_WEAPONS !== 'undefined'){
    SRD_WEAPONS.forEach(w => { if (norm(gearName(w)).includes(n) || norm(w.n).includes(n))
      push('Armi', '⚔️', gearName(w), w.d + ' ' + w.dt + ' · ' + w.cat, `closeModal(); viewGear('arma','${w.id}')`); });
    SRD_ARMORS.forEach(a => { if (norm(gearName(a)).includes(n) || norm(a.n).includes(n))
      push('Armature', '🛡️', gearName(a), 'CA ' + a.ac + ' · ' + a.cat, `closeModal(); viewGear('armatura','${a.id}')`); });
    SRD_GEAR.forEach(g => { if (norm(gearName(g)).includes(n))
      push('Equipaggiamento', '🎒', gearName(g), g.k + ' · ' + costLabel(g.c), `closeModal(); viewGear('roba','${g.id}')`); });
  }

  if (typeof SRD_MAGIC_ITEMS !== 'undefined') SRD_MAGIC_ITEMS.forEach(m => {
    if (norm(m.it).includes(n) || norm(m.n).includes(n))
      push('Oggetti magici', miTypeIcon(m.t), miName(m), m.t + ' · ' + m.r, `closeModal(); viewMagicItem('${m.id}')`);
  });

  (state.journal || []).forEach(e => {
    if (norm(e.title||'').includes(n) || norm(e.text||'').includes(n))
      push('Diario', '📓', e.title || ('Sessione ' + (e.session||'?')),
        (e.session?('Sessione '+e.session+' · '):'') + (typeof prettyDate==='function'?prettyDate(e.date):e.date),
        `closeModal(); goView('dm'); setDmTab('journal'); openJournalEntry('${e.id}')`);
  });

  (state.homebrew || []).forEach(h => {
    if (norm(h.name||'').includes(n))
      push('Aggiunte personali', '✍️', h.name, (HB_KINDS[h.kind] ? HB_KINDS[h.kind].label : ''), `closeModal(); goView('settings')`);
  });

  return out.slice(0, 60);
}
function globalSearchHTML(){
  const q = state.search.q;
  const res = globalSearchResults(q);
  const groups = {};
  res.forEach(r => { (groups[r.kind] = groups[r.kind] || []).push(r); });

  const inner = `
    <div class="search-wrap">
      <span class="search-ic">🔍</span>
      <input id="gs-input" placeholder="Cerca ovunque: nomi, incantesimi, creature…" value="${attr(q)}" oninput="gsType(this.value)" autocomplete="off">
    </div>
    ${norm(q).length < 2
      ? `<div class="muted" style="text-align:center; padding:22px 10px">Scrivi almeno due lettere. Cerco tra i tuoi personaggi, tutti gli incantesimi, il bestiario, i tuoi PNG, le condizioni e le tue aggiunte.</div>`
      : (res.length
        ? Object.keys(groups).map(k => `
            <div class="divider"><span class="flourish">❧</span><span>${k}</span></div>
            <div class="list-gap">
              ${groups[k].map(r=>`<button class="attack-row" style="width:100%; text-align:left" onclick="${r.action}">
                <span style="flex-shrink:0; margin-right:9px; font-size:1.1rem">${r.icon}</span>
                <span class="attack-main">
                  <span class="attack-name">${escapeHtml(r.label)}</span>
                  ${r.sub ? `<span class="muted" style="font-size:.74rem; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${escapeHtml(r.sub)}</span>` : ''}
                </span>
              </button>`).join('')}
            </div>`).join('')
        : emptyState('🔍', 'Niente che somigli a «' + escapeHtml(q) + '».'))}`;
  return modalShell('🔍 Cerca', inner);
}
const gsType = debounce((v) => { state.search.q = v; renderModalRoot({ toTop:true }); }, 200);
