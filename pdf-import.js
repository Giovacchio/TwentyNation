/* ══════════════════════════════════════════════════════════════
   Grimorio — lettore di schede PDF compilabili
   Legge i campi modulo di una scheda del personaggio (formato
   italiano "CS", scheda ufficiale in inglese e simili) e ne ricava
   un personaggio completo: caratteristiche, competenze, attacchi,
   equipaggiamento, incantesimi, background e note.
   Tutto avviene sul dispositivo: il PDF non viene caricato da nessuna parte.
   ══════════════════════════════════════════════════════════════ */

const PDFLIB_URL = './vendor/pdf-lib.min.js';
let __pdfLibPromise = null;
function loadPdfLib(){
  if (typeof PDFLib !== 'undefined') return Promise.resolve(PDFLib);
  if (__pdfLibPromise) return __pdfLibPromise;
  __pdfLibPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PDFLIB_URL;
    s.onload = () => (typeof PDFLib !== 'undefined') ? resolve(PDFLib) : reject(new Error('lettore non disponibile'));
    s.onerror = () => { __pdfLibPromise = null; reject(new Error('impossibile caricare il lettore PDF')); };
    document.head.appendChild(s);
  });
  return __pdfLibPromise;
}

/* ─── Lettura dei campi ─── */
async function readPdfFields(arrayBuffer){
  const lib = await loadPdfLib();
  const doc = await lib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  const pageByTag = {};
  pages.forEach((p, i) => { try { pageByTag[p.ref.tag] = i; } catch(e){} });

  const out = [];
  const form = doc.getForm();
  form.getFields().forEach(f => {
    let name = '';
    try { name = f.getName(); } catch(e){ return; }
    // Niente controlli su constructor.name: nel file compresso i nomi
    // delle classi sono accorciati. Si va di instanceof (con ripiego).
    let value = '', checked = false;
    try {
      if (lib.PDFTextField && f instanceof lib.PDFTextField) value = f.getText() || '';
      else if (lib.PDFCheckBox && f instanceof lib.PDFCheckBox) checked = f.isChecked();
      else if (lib.PDFDropdown && f instanceof lib.PDFDropdown) value = (f.getSelected() || []).join(', ');
      else if (lib.PDFOptionList && f instanceof lib.PDFOptionList) value = (f.getSelected() || []).join(', ');
      else if (lib.PDFRadioGroup && f instanceof lib.PDFRadioGroup) value = f.getSelected() || '';
      else if (typeof f.getText === 'function') value = f.getText() || '';
      else if (typeof f.isChecked === 'function') checked = f.isChecked();
    } catch(e){}
    let page = 0, x = 0, y = 0;
    try {
      const w = f.acroField.getWidgets()[0];
      if (w){
        const r = w.getRectangle();
        x = Math.round(r.x); y = Math.round(r.y);
        const pref = w.P && w.P();
        if (pref && pageByTag[pref.tag] != null) page = pageByTag[pref.tag];
      }
    } catch(e){}
    out.push({ name, value: String(value||'').trim(), checked, page, x, y });
  });
  return out;
}

/* ─── Utilità di lettura ─── */
function fieldIndex(fields){
  const idx = {};
  fields.forEach(f => {
    const k = norm(f.name).replace(/\s+/g, ' ');
    if (!idx[k]) idx[k] = f;
  });
  return idx;
}
function pickField(idx, names){
  for (const n of names){
    const f = idx[norm(n).replace(/\s+/g,' ')];
    if (f && f.value) return f.value;
  }
  return '';
}
function pickChecked(idx, names){
  return names.some(n => { const f = idx[norm(n).replace(/\s+/g,' ')]; return f && f.checked; });
}
function firstNumber(s){
  const m = String(s||'').match(/-?\d+/);
  return m ? parseInt(m[0]) : null;
}
// "40+16" → 56, "8" → 8, "1d8" → null
function sumExpression(s){
  const t = String(s||'').replace(/\s+/g,'');
  if (!t || /d/i.test(t)) return firstNumber(t);
  if (!/^-?\d+([+-]\d+)*$/.test(t)) return firstNumber(t);
  let total = 0;
  (t.match(/[+-]?\d+/g) || []).forEach(n => { total += parseInt(n); });
  return total;
}
const ABBR_TO_ABILITY = {
  car:'cha', cha:'cha', carisma:'cha', charisma:'cha',
  sag:'wis', wis:'wis', saggezza:'wis', wisdom:'wis',
  int:'int', intelligenza:'int', intelligence:'int',
  cos:'con', con:'con', costituzione:'con', constitution:'con',
  des:'dex', dex:'dex', destrezza:'dex', dexterity:'dex',
  for:'str', str:'str', forza:'str', strength:'str'
};
const SKILL_CODES = {
  ACRO:'acrobatics', ANIM:'animalHandling', ARC:'arcana', ATH:'athletics', DEC:'deception',
  HIST:'history', INS:'insight', INTI:'intimidation', INV:'investigation', MED:'medicine',
  NAT:'nature', PERC:'perception', PERF:'performance', PERS:'persuasion', REL:'religion',
  SLE:'sleightOfHand', STLTH:'stealth', SURV:'survival'
};

/* ─── Alias di nomi italiani ricorrenti ───
   Il nome scritto a mano sulla scheda spesso non coincide con la
   traduzione che usa il Grimorio: qui le varianti più comuni.
*/
const SPELL_NAME_ALIASES = {
  'ristorazione minore':'lesser-restoration', 'ristoro inferiore':'lesser-restoration',
  'ristorazione maggiore':'greater-restoration', 'ristorazione superiore':'greater-restoration',
  'rinascita':'revivify', 'rianima':'revivify',
  'esilio':'banishment', 'bandimento':'banishment', 'esiliare':'banishment',
  'controincantesimo':'counterspell',
  'colpo occulto':'eldritch-blast', 'dardo occulto':'eldritch-blast', 'raffica occulta':'eldritch-blast',
  'individuazione magia':'detect-magic', 'rilevare magia':'detect-magic',
  'parola di guarigione':'healing-word', 'parola di cura':'healing-word',
  'invisibilita maggiore':'greater-invisibility',
  'scudo di fede':'shield-of-faith',
  'saetta':'lightning-bolt', 'fulmine':'lightning-bolt',
  'accelerare':'haste', 'rallentare':'slow', 'volo':'fly',
  'dissolvere magie':'dispel-magic', 'dissolvi magia':'dispel-magic',
  'camuffarsi':'disguise-self',
  'passo nebbioso':'misty-step',
  'raggio infuocato':'scorching-ray',
  'ondata tonante':'thunderwave',
  'proiettile magico':'magic-missile', 'dardi incantati':'magic-missile',
  'mani infuocate':'burning-hands',
  'ammaliare persona':'charm-person', 'ammaliare persone':'charm-person', 'charme':'charm-person',
  'comprendere i linguaggi':'comprehend-languages', 'comprendere linguaggi':'comprehend-languages',
  'immobilizzare persone':'hold-person', 'immobilizzare mostri':'hold-monster',
  'passare senza tracce':'pass-without-trace',
  'vedere invisibile':'see-invisibility', 'vedere l invisibile':'see-invisibility',
  'stabilizzare':'spare-the-dying', 'stabilizzare i morenti':'spare-the-dying',
  'scherno crudele':'vicious-mockery',
  'polimorfismo':'polymorph', 'metamorfosi superiore':'true-polymorph',
  'randello incantato':'shillelagh',
  'sacra fiamma':'sacred-flame',
  'creare acqua':'create-or-destroy-water',
  'individuare il magico':'detect-magic',
  'evoca animali':'conjure-animals', 'evoca elementale':'conjure-elemental',
  'muro di fiamme':'wall-of-fire',
  'nube maleodorante':'stinking-cloud',
  'globo di invulnerabilita':'globe-of-invulnerability'
};

function bigrams(s){
  const out = [];
  for (let i=0;i<s.length-1;i++) out.push(s.slice(i,i+2));
  return out;
}
function diceSimilarity(a, b){
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = bigrams(a), B = bigrams(b);
  if (!A.length || !B.length) return 0;
  const counts = {};
  A.forEach(g => counts[g] = (counts[g]||0)+1);
  let hits = 0;
  B.forEach(g => { if (counts[g] > 0){ counts[g]--; hits++; } });
  return (2*hits) / (A.length + B.length);
}
// Riconosce l'incantesimo scritto a mano e separa il "resto" (le tue note).
function matchSpellText(text){
  const raw = String(text||'').trim();
  if (!raw) return null;
  const t = norm(raw);
  /* Prima cercava solo nell'SRD: chi aveva già importato i suoi
     incantesimi dai manuali se li vedeva rientrare in copia a ogni
     scheda letta, e quelli fuori SRD non venivano mai riconosciuti.
     allSpells() mette per primi i tuoi, poi quelli del tavolo, poi
     l'SRD — quindi a parità di nome vince la tua versione. */
  const spells = (typeof allSpells === 'function')
    ? allSpells()
    : ((typeof SRD_SPELLS !== 'undefined') ? SRD_SPELLS : []);
  let best = null;

  for (const sp of spells){
    const cands = [norm(spellItName(sp)), norm(sp.name)].filter(Boolean);
    for (const cand of cands){
      if (t === cand) return { sp, rest:'', how:'esatto' };
      if (t.startsWith(cand) && /^[\s:,.;\-–(]/.test(raw.slice(cand.length) || ' ')){
        const score = cand.length;
        if (!best || score > best.score) best = { sp, rest: raw.slice(cand.length).replace(/^[\s:,.;\-–]+/,'').trim(), how:'nome', score };
      }
    }
  }
  if (best) return best;

  // alias noti
  const words = t.split(/[\s:,;.]+/).filter(Boolean);
  for (let n = Math.min(4, words.length); n >= 1; n--){
    const head = words.slice(0,n).join(' ');
    const id = SPELL_NAME_ALIASES[head];
    if (id){
      const sp = spells.find(s => s.id === id);
      if (sp) return { sp, rest: raw.split(/\s+/).slice(n).join(' ').replace(/^[\s:,.;\-–]+/,'').trim(), how:'variante' };
    }
  }

  // somiglianza sulle prime parole
  let fuzzy = null;
  for (let n = Math.min(4, words.length); n >= 1; n--){
    const head = words.slice(0,n).join(' ');
    if (head.length < 4) continue;
    for (const sp of spells){
      for (const cand of [norm(spellItName(sp)), norm(sp.name)]){
        if (!cand) continue;
        const sim = diceSimilarity(head, cand);
        if (sim >= 0.74 && (!fuzzy || sim > fuzzy.sim)){
          fuzzy = { sp, rest: raw.split(/\s+/).slice(n).join(' ').trim(), how:'somiglianza', sim };
        }
      }
    }
    if (fuzzy) break;
  }
  return fuzzy;
}

/* ─── Analisi della scheda ─── */
function analyzeSheet(fields){
  const idx = fieldIndex(fields);
  const warn = [];
  // Quello che l'app ha riconosciuto fra le TUE cose: non è un avviso,
  // è una buona notizia, e va detta a parte.
  const info = [];
  let __razzaLetta = null, __bgLetto = null;
  const c = newCharacter();

  // ── anagrafica ──
  c.name = pickField(idx, ['CharacterName','CharacterName 2','Nome','Nome personaggio']) || 'Senza nome';
  c.playerName = pickField(idx, ['PlayerName','Giocatore']);
  c.race = pickField(idx, ['Race ','Race','Razza']);
  /* La razza era solo una scritta: ora si cerca fra quelle di serie
     E fra le tue, così velocità, lingue e tratti arrivano da soli e la
     scheda resta legata alla voce anche se poi la rinomini. */
  if (c.race && typeof trovaRazza === 'function'){
    const rz = trovaRazza(c.race);
    if (rz){
      c.raceId = rz.razza.id;
      c.race = rz.sotto ? rz.sotto.name : rz.razza.name;
      __razzaLetta = rz;
      if (rz.razza.homebrew) info.push('Razza «' + rz.razza.name + '» riconosciuta fra i tuoi contenuti.');
    } else warn.push('Razza "' + c.race + '" non è fra quelle note: resta scritta così com\'è. Se ce l\'hai fra i tuoi contenuti, controlla che il nome coincida.');
  }
  // molte schede scrivono "NB", "-" o una nota al posto del numero
  const xpRaw = pickField(idx, ['XP','EXP','Punti esperienza','Esperienza']);
  const xpNum = parseInt(String(xpRaw||'').replace(/[.\s]/g,'').replace(/[^\d]/g,''), 10);
  c.xp = (Number.isFinite(xpNum) && xpNum > 0) ? String(xpNum) : '';

  const classLevelRaw = pickField(idx, ['ClassLevel','Class','Classe','Classe e livello']);
  const bgRaw = pickField(idx, ['Background','Backgroud','Retroscena']);
  const alignRaw = pickField(idx, ['Alignment','Allineamento']);
  const hdTotalRaw = pickField(idx, ['HDTotal','HD Total','HDTotal2']);
  const profRaw = pickField(idx, ['ProfBonus','Bonus di competenza']);

  // livello: dal campo classe, dai dadi vita, dal bonus di competenza,
  // oppure da un campo "background" che contiene solo un numero (capita).
  let level = firstNumber(classLevelRaw);
  if (!level || level > 20) level = firstNumber(hdTotalRaw);
  if (!level && /^\s*\d+\s*$/.test(bgRaw)) level = parseInt(bgRaw);
  if (!level && profRaw){
    const p = firstNumber(profRaw);
    if (p >= 2 && p <= 6) level = (p-2)*4 + 1;
  }
  c.level = clamp(level || 1, 1, 20);

  // classe
  const classText = String(classLevelRaw||'').replace(/\d+/g,' ').replace(/livello|level|lv\.?/gi,' ').trim();
  const cls = classFromAny(classText) || classFromAny(classText.split(/[\s/,]+/)[0]);
  if (cls) c.classField = CLASSES_IT[cls] || cls;
  else if (classText) { c.classField = classText; warn.push('Classe "'+classText+'" non riconosciuta: impostala a mano.'); }
  /* La classe come identificativo, non solo come scritta: senza questo
     l'app non sa che sei un druido, e gli effetti ⚙️ delle sottoclassi
     (forma selvatica del Cerchio della Luna, famigli del Patto della
     Catena) non si accendono su un personaggio importato. */
  if (cls && typeof CLASS_BY_ID !== 'undefined' && CLASS_BY_ID[cls.toLowerCase()]) c.classId = cls.toLowerCase();

  // background / allineamento (alcune schede li invertono)
  let background = /^\s*\d+\s*$/.test(bgRaw) ? '' : bgRaw;
  let alignment = alignRaw;
  // alcune schede invertono i due campi
  if (!background && alignment && matchBackground(alignment)){ background = alignment; alignment = ''; }
  // "Urchin", "monello", "Folk hero"… tutti finiscono sul nome giusto
  const bgHit = matchBackground(background);
  if (bgHit) background = bgHit;
  else if (background) warn.push('Background "' + background + '" non è fra quelli noti: resta scritto così com\'è. Se ce l\'hai fra i tuoi contenuti, controlla che il nome coincida.');
  c.background = background; c.alignment = alignment;
  /* Anche il background resta legato alla sua voce, e se è uno dei tuoi
     lo si dice: è la prova che il manuale caricato sta servendo. */
  if (background && typeof allBackgrounds === 'function'){
    const bgv = allBackgrounds().find(b => norm(b.name) === norm(background));
    if (bgv){
      c.bgId = bgv.id;
      if (bgv.homebrew) info.push('Background «' + bgv.name + '» riconosciuto fra i tuoi contenuti.');
      __bgLetto = bgv;
    }
  }

  // sesso: le schede lo scrivono in mille modi
  c.sex = matchSex(pickField(idx, ['Sesso','Sex','Gender','Genere']));

  // ── caratteristiche ──
  ABILITIES.forEach(a => {
    const code = a.key.toUpperCase();
    const v = firstNumber(pickField(idx, [code, a.label]));
    if (v != null) c.abilities[a.key] = clamp(v, 1, 30);
  });
  // tiri salvezza competenti
  ABILITIES.forEach(a => {
    const code = a.key.toUpperCase();
    if (pickChecked(idx, [code+'prof', 'ST '+a.label, code+'save'])) c.saveProf.push(a.key);
  });
  // abilità: competenza ed esperienza
  Object.keys(SKILL_CODES).forEach(code => {
    const key = SKILL_CODES[code];
    if (pickChecked(idx, [code+'PE'])) c.skillExpert.push(key);
    else if (pickChecked(idx, [code+'P'])) c.skillProf.push(key);
  });

  // ── combattimento ──
  const ac = firstNumber(pickField(idx, ['AC','CA','Classe Armatura']));
  if (ac != null) c.ac = clamp(ac, 0, 40);
  const init = firstNumber(pickField(idx, ['Initiative','Iniziativa']));
  c.initiative = init != null ? init : mod(c.abilities.dex);
  const speed = firstNumber(pickField(idx, ['Speed','Velocita','Velocità']));
  if (speed != null) c.speed = speed;
  c.senses = pickField(idx, ['Vision','Sensi','Senses']);

  const hpMax = sumExpression(pickField(idx, ['HPMax','PF Massimi','HP Max']));
  if (hpMax) c.hp.max = clamp(hpMax, 1, 9999);
  const hpCur = sumExpression(pickField(idx, ['HPCurrent','PF Attuali']));
  c.hp.current = hpCur != null && hpCur !== 0 ? clamp(hpCur, 0, c.hp.max) : c.hp.max;
  const hpTemp = firstNumber(pickField(idx, ['HPTemp','PF Temporanei']));
  if (hpTemp) c.hp.temp = clamp(hpTemp, 0, 999);

  const hdRaw = pickField(idx, ['HD','Dado Vita','HitDice']);
  const hdMatch = /d\s*(\d+)/i.exec(hdRaw);
  let die = hdMatch ? parseInt(hdMatch[1]) : firstNumber(hdRaw);
  if (![6,8,10,12].includes(die)) die = CLASS_TO_HIT_DIE[c.classField] || 8;
  c.hitDie = die;
  const hdLeft = firstNumber(pickField(idx, ['HDLeft','Dadi vita rimasti']));
  if (hdLeft != null && hdLeft <= c.level) c.hitDiceUsed = clamp(c.level - hdLeft, 0, 20);

  c.inspiration = pickChecked(idx, ['insp1','Inspiration','Ispirazione']);
  const exh = firstNumber(pickField(idx, ['Exhaustion','Sfinimento']));
  if (exh) c.exhaustion = clamp(exh, 0, 6);

  // ── monete ──
  [['cp','CP'],['sp','SP'],['ep','EP'],['gp','GP'],['pp','PP']].forEach(([k, code]) => {
    const v = firstNumber(pickField(idx, [code]));
    if (v) c.coins[k] = clamp(v, 0, 999999);
  });

  // ── competenze e note ──
  c.languages = [pickField(idx,['Languages 1','ProficienciesLang','Linguaggi']), pickField(idx,['Languages 2'])].filter(Boolean).join(', ');
  c.tools = ['TOOLS 1','TOOLS 2','TOOLS 3','Strumenti'].map(n=>pickField(idx,[n])).filter(Boolean).join(', ');
  c.armor = pickField(idx, ['Armor','Armatura']);
  if (pickChecked(idx, ['StealthDisv']) && c.armor) c.armor += ' (svantaggio a Furtività)';
  const profBits = [];
  if (pickChecked(idx, ['ArmorLight'])) profBits.push('armature leggere');
  if (pickChecked(idx, ['ArmorMed'])) profBits.push('armature medie');
  if (pickChecked(idx, ['ArmorHea'])) profBits.push('armature pesanti');
  if (pickChecked(idx, ['Shield','Shields'])) profBits.push('scudi');
  if (pickChecked(idx, ['WpnSim'])) profBits.push('armi semplici');
  if (pickChecked(idx, ['WpnMar'])) profBits.push('armi da guerra');
  ['WpnOth 1','WpnOth 2','WEAPONStype 1','WEAPONStype 2'].forEach(n => { const v = pickField(idx,[n]); if (v) profBits.push(v); });
  c.profOther = profBits.join(', ');
  const capRaw = pickField(idx, ['PesoTrasportabile','PesoMassimo','Capacita']);
  c.carryCapacity = (parseFloat(String(capRaw).replace(',','.')) > 0) ? capRaw : '';
  // se la soglia scritta non è un numero, la ricaviamo dal livello
  const nxRaw = pickField(idx, ['Nex_XP','NextLevel','Prossimo livello']);
  const nxNum = parseInt(String(nxRaw||'').replace(/[.\s]/g,'').replace(/[^\d]/g,''), 10);
  if (Number.isFinite(nxNum) && nxNum > 0) c.xpNext = String(nxNum);
  else { const t = (typeof xpForNextLevel === 'function') ? xpForNextLevel(c.level) : null; c.xpNext = t != null ? String(t) : ''; }
  // Secondo dado vita solo se è davvero diverso: molte schede ripetono
  // lo stesso valore nella seconda riga anche senza multiclasse.
  const hd2raw = pickField(idx, ['HD2']);
  const hd2m = /d\s*(\d+)/i.exec(hd2raw);
  const hd2n = hd2m ? parseInt(hd2m[1]) : firstNumber(hd2raw);
  if ([6,8,10,12].includes(hd2n) && hd2n !== c.hitDie) c.hitDie2 = hd2n;
  c.feats = pickField(idx, ['Talenti1','Talenti','Feats']);
  c.notesRace = pickField(idx, ['Testo2']);
  c.features = pickField(idx, ['Testo3','Features and Traits','Privilegi']);
  c.notesExtra = pickField(idx, ['Testo6','Note']);

  /* La sottoclasse sulle schede non ha quasi mai un campo suo: sta fra
     parentesi accanto alla classe, o dentro i privilegi. Si cerca in
     entrambi, fra quelle di serie e fra le tue. */
  if (typeof trovaSottoclasse === 'function'){
    const campoSub = pickField(idx, ['Sottoclasse','Subclass','Archetipo','Archetype','Specializzazione']);
    const dove = [campoSub, classLevelRaw, c.features, c.notesExtra].filter(Boolean);
    for (const testo of dove){
      const t = trovaSottoclasse(testo, c.classId || null);
      if (t){
        c.subclassId = t.sotto.id;
        if (!c.classId) c.classId = t.classId;
        const eff = (typeof riassuntoMeccaniche === 'function') ? riassuntoMeccaniche(t.sotto) : '';
        info.push((t.sotto.homebrew ? 'Sottoclasse «' : 'Sottoclasse «') + t.sotto.name + '» riconosciuta' +
                  (t.sotto.homebrew ? ' fra i tuoi contenuti' : '') +
                  (eff ? ' — cambia le regole: ' + eff : '') + '.');
        break;
      }
    }
    if (!c.subclassId && c.classId && subclassesFor(c.classId).length){
      warn.push('Non ho capito quale ' + ((CLASS_BY_ID[c.classId]||{}).subclassLabel || 'sottoclasse').toLowerCase() +
                ' hai: sceglila dalla scheda, in Storia. Serve perché gli effetti sulle regole si accendano.');
    }
  }

  /* ── Suppliche occulte ──────────────────────────────────────────
     Su una scheda da warlock stanno scritte fra i privilegi o nelle
     note, una per riga o separate da virgole. Si cercano per nome fra
     quelle SRD E fra quelle che hai caricato tu: il nome può essere
     scritto in italiano o in inglese, e vale lo stesso. */
  if (typeof tutteLeSuppliche === 'function'){
    const dove = [c.features, c.notesExtra, c.notesRace,
                  pickField(idx, ['Suppliche','Invocations','Eldritch Invocations','Supplica'])]
      .filter(Boolean).join('\n');
    if (dove){
      const testo = norm(dove);
      const prese = [];
      tutteLeSuppliche().forEach(s => {
        const nomi = [s.nome, s.en].filter(Boolean).map(norm).filter(x => x.length > 5);
        if (nomi.some(x => testo.includes(x)) && !prese.includes(s.id)) prese.push(s.id);
      });
      if (prese.length){
        c.suppliche = prese;
        const mie = prese.map(id => tutteLeSuppliche().find(x => x.id === id)).filter(x => x && x.fonte !== 'srd');
        info.push(prese.length + (prese.length === 1 ? ' supplica riconosciuta' : ' suppliche riconosciute') +
                  (mie.length ? ' (' + mie.length + ' fra le tue)' : '') + '.');
      } else if (/warlock|stregone del patto/i.test(c.classField || '')){
        warn.push('Non ho trovato suppliche scritte in questa scheda: aggiungile dalla scheda Magie.');
      }
    }
  }

  // ── personalità e legami ──
  c.traits = pickField(idx, ['Tratti car','PersonalityTraits ','PersonalityTraits','Tratti']);
  c.ideals = pickField(idx, ['Ideali1','Ideals','Ideali']);
  c.bonds = pickField(idx, ['LEgami1','Bonds','Legami']);
  c.flaws = pickField(idx, ['DIfetti1','Flaws','Difetti']);
  c.enemies = pickField(idx, ['Nemici1','Nemici']);
  c.allies = pickField(idx, ['Alleati','Allies','Allies and Organizations']);
  c.faction = pickField(idx, ['Fazione','FactionName','Faction']);
  c.symbol = pickField(idx, ['SymbolNAME','Simbolo']);
  c.backstory = pickField(idx, ['Backstory','Storia','CharacterBackstory']);

  // ── aspetto ──
  c.appearance = {
    age: pickField(idx, ['AGE','Age','Eta','Età']),
    height: pickField(idx, ['HEIGHT','Height','Altezza']),
    weight: pickField(idx, ['WEIGHT','Weight','Peso']),
    eyes: pickField(idx, ['EYES','Eyes','Occhi']),
    skin: pickField(idx, ['SKIN','Skin','Pelle']),
    hair: pickField(idx, ['HAIR','Hair','Capelli']),
    text: pickField(idx, ['AppearanceText','Appearance','Aspetto'])
  };

  // ── attacchi ──
  for (let i = 1; i <= 6; i++){
    const name = pickField(idx, [i===1 ? 'Wpn Name' : 'Wpn Name '+i, 'Arma '+i]);
    if (!name) continue;
    c.attacks.push({
      name,
      atk: pickField(idx, ['Wpn'+i+' AtkBonus', 'Wpn'+i+' AtkBonus ', 'Wpn'+i+'AtkBonus']),
      dmg: pickField(idx, ['Wpn'+i+' Damage', 'Wpn'+i+' Damage ', 'Wpn'+i+'Damage']),
      notes: ''
    });
  }

  // ── risorse con usi limitati ──
  for (let i = 1; i <= 6; i++){
    const name = pickField(idx, ['Limited Feat '+i]);
    if (!name) continue;
    const total = firstNumber(pickField(idx, ['FeatTot '+i])) || 1;
    const left = firstNumber(pickField(idx, ['FeatLeft '+i]));
    const rec = pickChecked(idx, ['RecoverySR '+i]) ? 'sr' : (pickChecked(idx, ['RecoveryDN '+i]) ? 'dn' : 'lr');
    c.resources.push({ name, total: clamp(total,0,99), left: left != null ? clamp(left,0,total) : total, recovery: rec });
  }

  // ── equipaggiamento (con il peso, se la scheda lo riporta) ──
  const addItem = (line, opts) => {
    if (!line) return;
    let name = line, qty = 1;
    const m = /^(\d+)\s*[x×]\s*(.+)$/i.exec(line) || /^(.+?)\s*[x×]\s*(\d+)$/i.exec(line);
    if (m && /^\d+$/.test(m[1])){ qty = clamp(parseInt(m[1]),1,9999); name = m[2].trim(); }
    else if (m){ qty = clamp(parseInt(m[2]),1,9999); name = m[1].trim(); }
    c.inventory.push(Object.assign({ name, qty, weight:'', notes:'', equipped:false, attuned:false }, opts||{}));
  };
  fields.forEach(f => {
    const m = /^eq\s*(\d+)$/i.exec(f.name.trim());
    if (!m || !f.value) return;
    const w = pickField(idx, ['Peso' + m[1]]);
    addItem(f.value, { weight: (w && /\d/.test(w)) ? w.replace(/[^\d.,]/g,'') : '' });
  });
  const eqText = pickField(idx, ['Equipment','Equipaggiamento']);
  if (eqText) eqText.split(/\n+/).forEach(l => addItem(l.trim()));
  for (let i = 1; i <= 6; i++){
    const v = pickField(idx, ['Consum '+i]);
    if (!v) continue;
    const left = firstNumber(pickField(idx, ['ConsumLeft '+i]));
    addItem(v, { qty: (left && left > 0) ? clamp(left,1,9999) : 1, notes: 'consumabile' });
  }
  for (let i = 1; i <= 3; i++){
    const v = pickField(idx, ['Ammo '+i]);
    if (!v) continue;
    const left = firstNumber(pickField(idx, ['AmmoLeft '+i]));
    addItem(v, { qty: (left && left > 0) ? clamp(left,1,9999) : 1, notes: 'munizioni' });
  }
  for (let i = 1; i <= 3; i++){
    const v = pickField(idx, ['AttunedMagic '+i]);
    if (v) addItem(v, { attuned: true, notes: 'oggetto magico' });
  }

  // ── magia ──
  const abilityRaw = pickField(idx, ['SpellcastingAbility 2','SpellcastingAbility','Caratteristica']);
  const ab = ABBR_TO_ABILITY[norm(abilityRaw).slice(0,12)] || ABBR_TO_ABILITY[norm(abilityRaw).slice(0,3)];
  if (ab) c.spellAbility = ab;
  else if (CLASS_TO_SPELL_ABILITY[c.classField]) c.spellAbility = CLASS_TO_SPELL_ABILITY[c.classField];
  c.casterType = CLASS_TO_CASTER[c.classField] !== undefined ? CLASS_TO_CASTER[c.classField] : 'none';

  const spellResult = extractSpells(fields, idx, c);
  if (spellResult.slotsOverride) c.slotsOverride = spellResult.slotsOverride;
  if (spellResult.slotsUsed) c.slotsUsed = spellResult.slotsUsed;
  if (c.casterType === 'none' && (spellResult.entries.length)) c.casterType = 'full';

  // Se un numero scritto sulla scheda non coincide con quello calcolato,
  // lo segnalo invece di far finta di niente.
  const diffs = [];
  Object.keys(SKILL_CODES).forEach(code => {
    const sheet = firstNumber(pickField(idx, [code]));
    if (sheet == null) return;
    const s = SKILLS.find(x => x.key === SKILL_CODES[code]);
    const calc = skillMod(c, s);
    if (sheet !== calc) diffs.push(s.label + ' ' + signStr(sheet) + ' (calcolo ' + signStr(calc) + ')');
  });
  ABILITIES.forEach(ab => {
    const sheet = firstNumber(pickField(idx, ['ST ' + ab.label, 'ST ' + ab.abbr]));
    if (sheet == null) return;
    const calc = saveMod(c, ab.key);
    if (sheet !== calc) diffs.push('TS ' + ab.label + ' ' + signStr(sheet) + ' (calcolo ' + signStr(calc) + ')');
  });
  const passive = firstNumber(pickField(idx, ['Passive','Percezione passiva']));
  if (passive != null && passive !== passivePerception(c)) diffs.push('Percezione passiva ' + passive + ' (calcolo ' + passivePerception(c) + ')');
  if (diffs.length) warn.push('Valori diversi da quelli calcolati, di solito bonus da talenti o oggetti: ' + diffs.slice(0,6).join(' · ') + (diffs.length>6 ? ' …' : ''));

  /* I buchi lasciati dalla scheda li riempie quello che hai caricato tu.
     Solo i buchi: se sulla scheda c'è scritto un numero, quello vince —
     è il tuo personaggio, non il manuale, ad avere l'ultima parola. */
  if (__razzaLetta){
    const r = __razzaLetta.razza, sr = __razzaLetta.sotto;
    if (!c.speed || c.speed === 9) c.speed = r.speed || c.speed;
    if (!c.languages && (r.languages||[]).length) c.languages = r.languages.join(', ');
    if (!String(c.notesRace||'').trim()){
      const tr = (r.traits||[]).concat((sr && sr.traits) || []);
      if (tr.length) c.notesRace = tr.map(t => t.name + ': ' + t.desc).join('\n');
    }
    // le competenze concesse dalla razza, se la scheda non le aveva spuntate
    (r.grantSkills || []).forEach(k => { if (!c.skillProf.includes(k) && !c.skillExpert.includes(k)) c.skillProf.push(k); });
  }
  if (__bgLetto){
    const b = __bgLetto;
    if (!c.tools && b.tools && b.tools !== '—') c.tools = b.tools;
    (b.skills || []).forEach(k => { if (!c.skillProf.includes(k) && !c.skillExpert.includes(k)) c.skillProf.push(k); });
    if (b.feature && !norm(String(c.notesExtra||'')).includes(norm(b.feature))){
      c.notesExtra = [c.notesExtra, b.feature + ' (' + b.name + ')' + (b.desc ? ': ' + b.desc : '')].filter(Boolean).join('\n\n');
    }
  }
  return { character: c, spells: spellResult.entries, warnings: warn, riconosciute: info, fieldsFilled: fields.filter(f=>f.value||f.checked).length };
}

/* ─── Incantesimi: usa la posizione dei riquadri per capire il livello ─── */
function extractSpells(fields, idx, c){
  const isSpellBox = (n) => /^0\s*\d+$/.test(n) || /^\d+_\d+$/.test(n) || /^spell name\s*\d+$/i.test(n) || /^spells\s*\d+$/i.test(n);
  const boxes = fields.filter(f => isSpellBox(f.name.trim()) && f.value);
  if (!boxes.length) return { entries: [], slotsOverride: null };

  const spellPage = boxes.map(b=>b.page).sort((a,b)=>a-b)[Math.floor(boxes.length/2)];
  const headers = fields.filter(f => /^slotstotal\s*\d+$/i.test(f.name.trim()) && f.page === spellPage);

  // colonne: raggruppa per x vicine
  const colOf = (f) => Math.round(f.x / 90);
  headers.sort((a,b) => colOf(a) - colOf(b) || b.y - a.y);
  const levelOfHeader = {};
  headers.forEach((h, i) => { levelOfHeader[h.name] = i + 1; });

  const slotsOverride = {}, slotsUsed = {};
  let anySlot = false, anyUsed = false;
  const remaining = fields.filter(f => /^slotsremaining\s*\d+$/i.test(f.name.trim()) && f.page === spellPage);
  headers.forEach(h => {
    const n = firstNumber(h.value);
    const lvl = levelOfHeader[h.name];
    if (n && lvl <= 9){
      slotsOverride[lvl] = clamp(n, 0, 9); anySlot = true;
      // gli slot rimasti stanno sulla stessa riga, poco più a destra
      const rem = remaining.find(r => Math.abs(r.y - h.y) <= 8 && r.x > h.x);
      const rv = rem ? firstNumber(rem.value) : null;
      if (rv != null && rv < n){ slotsUsed[lvl] = clamp(n - rv, 0, n); anyUsed = true; }
    }
  });

  const entries = [];
  const sorted = boxes.slice().sort((a,b) => (a.page-b.page) || (colOf(a)-colOf(b)) || (b.y - a.y));
  sorted.forEach(box => {
    const name = box.name.trim();
    let level = null;
    if (/^0\s*\d+$/.test(name)) level = 0;
    else {
      // il livello è quello dell'intestazione più vicina sopra, nella stessa colonna
      // L'intestazione e le caselle della stessa colonna non sono allineate
      // allo stesso pixel: il confronto per fascia arrotondata mancava sempre
      // il bersaglio. Si prende la più vicina in orizzontale entro 90 punti.
      let bestH = null;
      headers.forEach(h => {
        if (Math.abs(h.x - box.x) > 90 || h.y < box.y) return;
        if (!bestH) { bestH = h; return; }
        const dNuovo = Math.abs(h.x - box.x), dVecchio = Math.abs(bestH.x - box.x);
        // a parità di colonna vince quella che sta più in basso (più vicina)
        if (dNuovo < dVecchio - 20 || (Math.abs(dNuovo - dVecchio) <= 20 && h.y < bestH.y)) bestH = h;
      });
      if (bestH) level = levelOfHeader[bestH.name];
    }
    const text = box.value.trim();
    // le righe che iniziano con un trattino continuano quella precedente
    if (/^[-–—]/.test(text) && entries.length){
      const prev = entries[entries.length-1];
      prev.note = (prev.note ? prev.note + ' · ' : '') + text.replace(/^[-–—\s]+/,'');
      return;
    }
    const match = matchSpellText(text);
    entries.push({
      box,
      text,
      level: level != null ? level : (match ? match.sp.level : 1),
      match: match ? { id: match.sp.id, name: spellName(match.sp), level: match.sp.level,
                       how: match.how, source: match.sp.source || 'srd' } : null,
      note: match ? (match.rest || '') : ''
    });
  });
  // caselle "preparato" accanto a ogni riga (le righe di continuazione non
  // creano una voce, quindi si va per riquadro e non per indice)
  const checks = fields.filter(f => f.checked && f.page === spellPage);
  entries.forEach(e => {
    const b = e.box;
    e.prepared = !!checks.find(k => Math.abs(k.y - b.y) <= 7 && k.x < b.x && (b.x - k.x) < 60);
    delete e.box;
  });

  return { entries, slotsOverride: anySlot ? slotsOverride : null, slotsUsed: anyUsed ? slotsUsed : null };
}

/* ─── Interfaccia: scelta file → anteprima → creazione ─── */
let pendingSheet = null;

function openPdfImport(){
  pendingSheet = null;
  openModal({ render: () => pdfImportHTML() });
}
function pdfImportHTML(){
  if (pendingSheet === 'loading'){
    return `<div class="overlay center"><div class="sheet-modal frame" style="text-align:center; padding:34px 20px;">
      <div class="rune-load" style="margin:0 auto 16px"></div>
      <div class="section-title">Sto leggendo la scheda…</div>
      <p class="muted">Il PDF resta sul tuo dispositivo.</p>
    </div></div>`;
  }
  if (pendingSheet) return pdfPreviewHTML();
  const inner = `
    <p class="muted" style="margin-bottom:14px">
      Scegli una <b>scheda del personaggio in PDF compilabile</b> (quella con i campi da riempire).
      Leggo caratteristiche, competenze, attacchi, equipaggiamento, incantesimi, background e note,
      e ne creo un personaggio nel Grimorio.
    </p>
    <button class="btn btn-gold btn-block" onclick="document.getElementById('sheet-pdf-file').click()">📄 Scegli il PDF</button>
    <input type="file" id="sheet-pdf-file" accept="application/pdf,.pdf" style="display:none" onchange="handleSheetPdf(this)">
    <div class="spell-source-note">
      Funziona con le schede compilabili in italiano (formato "CS") e con quella ufficiale in inglese.
      Se un PDF è una scansione o un'immagine non contiene campi da leggere: in quel caso i dati vanno inseriti a mano.
    </div>`;
  return modalShell('⇪ Importa scheda PDF', inner);
}
function handleSheetPdf(input){
  const file = input.files && input.files[0];
  input.value = '';
  useSheetPdf(file);
}
/* Legge una scheda già scelta altrove (per esempio dal tasto «Importa»
   delle opzioni, che accetta qualsiasi tipo di file). */
function useSheetPdf(file){
  if (!file) return;
  if (file.size > 40 * 1024 * 1024){ toast('⚠️ PDF troppo grande (oltre 40 MB)'); return; }
  pendingSheet = 'loading';
  renderModalRoot();
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const fields = await readPdfFields(reader.result);
      if (!fields.length){
        pendingSheet = null; renderModalRoot();
        toast('⚠️ Questo PDF non ha campi compilabili da leggere');
        return;
      }
      pendingSheet = analyzeSheet(fields);
      renderModalRoot();
    } catch(e){
      console.error(e);
      pendingSheet = null; renderModalRoot();
      // I messaggi della libreria sono incomprensibili: si traducono.
      const tech = /instance of|Failed to parse|Invalid PDF|No PDF header|Cannot read/i.test(e.message || '');
      toast(tech
        ? '⚠️ Questo file non è un PDF valido, oppure è una scansione senza campi compilabili'
        : '⚠️ Non sono riuscito a leggere il PDF: ' + e.message);
    }
  };
  reader.onerror = () => { pendingSheet = null; renderModalRoot(); toast('⚠️ Impossibile leggere il file'); };
  reader.readAsArrayBuffer(file);
}
function pdfPreviewHTML(){
  const p = pendingSheet, c = p.character;
  const matched = p.spells.filter(s=>s.match).length;
  const line = (l, v) => v ? `<div class="row-between" style="margin-bottom:5px"><span class="muted">${l}</span><b style="text-align:right">${escapeHtml(String(v))}</b></div>` : '';
  const inner = `
    <div class="card" style="margin-bottom:12px">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px">
        <div class="seal" style="width:52px;height:52px;font-size:1.5rem">${c.avatar}</div>
        <div style="min-width:0">
          <div class="char-card-name">${escapeHtml(c.name)}</div>
          <div class="char-card-sub">${escapeHtml(c.classField||'—')} · Lv ${c.level}${c.race?' · '+escapeHtml(c.race):''}</div>
        </div>
      </div>
      <div class="ability-grid" style="grid-template-columns:repeat(6,1fr); gap:5px; margin-bottom:12px">
        ${ABILITIES.map(a=>`<div class="ability-seal" style="padding:7px 2px">
          <div class="lbl" style="font-size:.55rem">${a.abbr}</div>
          <div class="mod" style="font-size:1rem; margin-top:3px">${c.abilities[a.key]}</div>
          <div class="score">${modStr(c.abilities[a.key])}</div>
        </div>`).join('')}
      </div>
      ${line('Punti ferita', c.hp.max ? (c.hp.current + ' / ' + c.hp.max) : '')}
      ${line('CA · Iniziativa · Velocità', c.ac + ' · ' + signStr(c.initiative) + ' · ' + c.speed + ' m')}
      ${line('Competenze', (c.skillProf.length + c.skillExpert.length) + ' abilità' + (c.skillExpert.length?' (di cui '+c.skillExpert.length+' esperte)':'') + ' · ' + c.saveProf.length + ' TS')}
      ${line('Attacchi', c.attacks.length || '')}
      ${line('Equipaggiamento', c.inventory.length ? c.inventory.length + ' oggetti' : '')}
      ${line('Risorse', c.resources.length || '')}
      ${line('Monete', COINS.map(co=>c.coins[co.key]?c.coins[co.key]+' '+co.label:'').filter(Boolean).join(' · '))}
      ${line('Background', c.background)}
      ${line('Sottoclasse', (()=>{ if(!c.subclassId||!c.classId) return '';
        const sc = subclassesFor(c.classId).find(x=>x.id===c.subclassId);
        return sc ? sc.name + (sc.homebrew?' ✦':'') : ''; })())}
      ${line('Sesso', sexLabel(c.sex))}
      ${line('Esperienza', c.xp)}
      ${line('Fazione', c.faction)}
    </div>

    ${p.spells.length ? `
      <div class="row-between" style="margin-bottom:8px">
        <div class="card-title" style="margin:0">Incantesimi</div>
        <span class="badge gold">${matched}/${p.spells.length} riconosciuti</span>
      </div>
      <div class="list-gap" style="margin-bottom:14px; max-height:260px; overflow:auto">
        ${p.spells.map((s,i)=>`<div class="spell-item" style="padding:9px 11px">
          <span class="spell-lvl-badge" style="width:28px;height:28px;font-size:.75rem">${s.match?(s.match.level===0?'C':s.match.level):(s.level===0?'C':s.level)}</span>
          <span class="spell-item-body">
            <span class="spell-item-name">${escapeHtml(s.match ? s.match.name : s.text)}</span>
            <span class="spell-item-meta">${s.match
              ? (s.match.how === 'somiglianza' ? '≈ da verificare · ' : '✓ ')
                + (s.match.source === 'custom' ? '<b style="color:var(--gold)">dai tuoi</b> · '
                   : s.match.source === 'shared' ? '<b style="color:var(--gold)">dal tavolo</b> · ' : '')
                + escapeHtml(s.text)
              : 'nuovo incantesimo personalizzato'}</span>
          </span>
        </div>`).join('')}
      </div>` : ''}

    ${(p.riconosciute && p.riconosciute.length) ? `<div class="card" style="margin-bottom:12px; border-color:var(--gold)">
      <div class="card-title" style="margin-bottom:6px">📚 Dalle tue cose</div>
      ${p.riconosciute.map(w=>`<div class="muted" style="font-size:.78rem">✓ ${escapeHtml(w)}</div>`).join('')}
    </div>` : ''}

    ${p.warnings.length ? `<div class="card" style="margin-bottom:12px; border-color:var(--warn)">
      ${p.warnings.map(w=>`<div class="muted" style="font-size:.78rem">⚠️ ${escapeHtml(w)}</div>`).join('')}
    </div>` : ''}

    <button class="btn btn-primary btn-block" onclick="confirmSheetImport()">✦ Crea ${escapeHtml(c.name)}</button>
    <button class="btn btn-ghost btn-block" style="margin-top:10px" onclick="pendingSheet=null; renderModalRoot()">← Scegli un altro file</button>
    <div class="spell-source-note">Letti ${p.fieldsFilled} campi compilati. Dopo l'importazione puoi correggere tutto dalla scheda.</div>`;
  return modalShell('Anteprima scheda', inner);
}
function confirmSheetImport(){
  const p = pendingSheet;
  if (!p) return;
  const c = p.character;
  c.spellNotes = c.spellNotes || {};
  const newCustom = [];

  p.spells.forEach(s => {
    const note = (s.note || '').trim();
    if (s.match){
      const orig = s.match.source || 'srd';
      if (!c.knownSpells.some(k => k.id === s.match.id && k.source === orig)) c.knownSpells.push({ id: s.match.id, source: orig });
      if (note) c.spellNotes[s.match.id] = note;
      if (s.prepared && s.match.level > 0 && !c.preparedSpells.includes(s.match.id)) c.preparedSpells.push(s.match.id);
    } else {
      // "Hex +1d6 necrotico per colpo" → nome "Hex", il resto va nella descrizione
      let firstLine = s.text.split(/[:.\n]/)[0].trim();
      const cut = firstLine.replace(/\s*[+\-–(]\s*\d.*$/, '').replace(/\s*\d+d\d+.*$/i, '').trim();
      if (cut.length >= 3) firstLine = cut;
      firstLine = firstLine.slice(0, 60) || 'Incantesimo';
      let id = 'imp-' + slugify(firstLine);
      let n = 2;
      while (state.customSpells.some(x => x.id === id) || newCustom.some(x => x.id === id)) id = 'imp-' + slugify(firstLine) + '-' + (n++);
      newCustom.push({
        id, name: firstLine, level: clamp(s.level||0, 0, 9), school: '',
        cast: '', range: '', comp: '', mat: '', dur: '', conc: /conc/i.test(s.text), ritual: false,
        classes: c.classField && Object.keys(CLASSES_IT).find(k=>CLASSES_IT[k]===c.classField) ? [Object.keys(CLASSES_IT).find(k=>CLASSES_IT[k]===c.classField)] : [],
        desc: s.text + (s.note ? '\n' + s.note : ''),
        imported: true, createdAt: Date.now()
      });
      c.knownSpells.push({ id, source: 'custom' });
    }
  });

  newCustom.forEach(sp => { state.customSpells.push(sp); });
  state.characters.push(c);
  saveLocal();
  fsSet('characters', c);
  if (newCustom.length) bulkSaveSpells(newCustom);
  if (!currentUser) state.offlineMode = true;
  pendingSheet = null;
  closeModal();
  openSheet(c.id);
  toast('✦ ' + c.name + ' importato dalla scheda');
}
