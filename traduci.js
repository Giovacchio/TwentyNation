/* Grimorio — traduzione dei nomi
   Rinomina in italiano quello che hai importato dai tuoi manuali: nomi di
   sottoclassi e razze, nomi dei tratti e dei privilegi, lingue e taglie.
   Lavora solo sulle ETICHETTE: il testo delle regole resta come sta nel tuo
   manuale, l'app non lo tocca.
   Ogni voce conserva il nome originale, così si torna indietro quando si vuole. */

/* Vocabolario: termini che tornano identici in tutti i manuali. */
const TRAD_TERMINI = {
  // stirpi e sottotipi
  'dwarf':'Nano', 'elf':'Elfo', 'halfling':'Halfling', 'human':'Umano',
  'gnome':'Gnomo', 'dragonborn':'Dragonide', 'tiefling':'Tiefling',
  'half-elf':'Mezzelfo', 'half-orc':'Mezzorco', 'orc':'Orco',
  'aasimar':'Aasimar', 'genasi':'Genasi', 'goliath':'Golia', 'firbolg':'Firbolg',
  'kenku':'Kenku', 'lizardfolk':'Uomo Lucertola', 'tabaxi':'Tabaxi', 'triton':'Tritone',
  'bugbear':'Bugbear', 'goblin':'Goblin', 'hobgoblin':'Hobgoblin', 'kobold':'Coboldo', 'minotaur':'Minotauro', 'shifter':'Metamorfo',
  'aarakocra':'Aarakocra', 'drow':'Drow', 'eladrin':'Eladrin', 'changeling':'Mutaforma',
  'shadar-kai':'Shadar-kai', 'duergar':'Duergar', 'svirfneblin':'Svirfneblin',
  'yuan-ti pureblood':'Yuan-ti Purosangue', 'warforged':'Forgiato',
  // qualificatori di stirpe
  'hill':'delle Colline', 'mountain':'delle Montagne', 'high':'Alto',
  'wood':'dei Boschi', 'forest':'delle Foreste', 'rock':'delle Rocce',
  'deep':'delle Profondità', 'sea':'del Mare', 'air':'dell’Aria', 'earth':'della Terra',
  'fire':'del Fuoco', 'water':'dell’Acqua', 'gray':'Grigio', 'grey':'Grigio',
  'lightfoot':'Piedelesto', 'stout':'Tozzo', 'avariel':'Avariel',
  'protector':'Protettore', 'scourge':'Flagello', 'fallen':'Caduto',
  'infernal':'Infernale', 'abyssal':'Abissale', 'shadow':'dell’Ombra',
  // tratti ricorrenti
  'darkvision':'Scurovisione', 'superior darkvision':'Scurovisione Superiore',
  'dwarven resilience':'Resilienza Nanica', 'dwarven combat training':'Addestramento al Combattimento Nanico',
  'dwarven armor training':'Addestramento alle Armature Naniche', 'dwarven toughness':'Tempra Nanica',
  'stonecunning':'Astuzia della Pietra', 'stone cunning':'Astuzia della Pietra',
  'tool proficiency':'Competenza negli Strumenti', 'fey ancestry':'Ascendenza Fatata',
  'keen senses':'Sensi Acuti', 'trance':'Trance', 'elf weapon training':'Addestramento alle Armi Elfiche',
  'cantrip':'Trucchetto', 'extra language':'Lingua Aggiuntiva', 'mask of the wild':'Maschera Selvatica',
  'fleet of foot':'Piede Veloce', 'sunlight sensitivity':'Sensibilità alla Luce Solare',
  'drow magic':'Magia Drow', 'drow weapon training':'Addestramento alle Armi Drow',
  'lucky':'Fortunato', 'brave':'Coraggioso', 'halfling nimbleness':'Agilità Halfling',
  'naturally stealthy':'Furtivo per Natura', 'stout resilience':'Resilienza Tozza',
  'draconic ancestry':'Ascendenza Draconica', 'breath weapon':'Arma del Soffio',
  'damage resistance':'Resistenza al Danno', 'gnome cunning':'Astuzia Gnomesca',
  'artificer’s lore':'Sapienza dell’Artefice', 'artificer\'s lore':'Sapienza dell’Artefice',
  'tinker':'Armeggiare', 'speak with small beasts':'Parlare con le Piccole Bestie',
  'natural illusionist':'Illusionista Naturale', 'skill versatility':'Versatilità nelle Abilità',
  'menacing':'Minaccioso', 'relentless endurance':'Tenacia Implacabile',
  'savage attacks':'Attacchi Selvaggi', 'hellish resistance':'Resistenza Infernale',
  'infernal legacy':'Retaggio Infernale', 'celestial resistance':'Resistenza Celestiale',
  'healing hands':'Mani Guaritrici', 'light bearer':'Portatore di Luce',
  'powerful build':'Corporatura Possente', 'stone’s endurance':'Tempra della Pietra',
  'mountain born':'Nato fra le Montagne', 'natural athlete':'Atleta Naturale',
  'amphibious':'Anfibio', 'cat’s claws':'Artigli Felini', 'cat’s talent':'Talento Felino',
  'nimble escape':'Fuga Agile', 'fury of the small':'Furia dei Piccoli',
  'saving face':'Salvare la Faccia', 'pack tactics':'Tattiche di Branco',
  'grovel, cower and beg':'Strisciare, Rannicchiarsi e Implorare',
  'ability scores':'Punteggi di Caratteristica', 'ability score increase':'Aumento dei Punteggi di Caratteristica',
  'age':'Età', 'size':'Taglia', 'speed':'Velocità', 'alignment':'Allineamento',
  'languages':'Lingue', 'language':'Lingua', 'skill proficiencies':'Competenze nelle Abilità',
  'tool proficiencies':'Competenza negli Strumenti', 'equipment':'Equipaggiamento',
  'feature':'Privilegio', 'proficiencies':'Competenze',
  // lingue
  'common':'Comune', 'dwarvish':'Nanico', 'elvish':'Elfico', 'giant':'Gigante',
  'gnomish':'Gnomesco', 'orcish':'Orchesco', 'abyssal':'Abissale',
  'celestial':'Celestiale', 'draconic':'Draconico', 'deep speech':'Linguaggio Profondo',
  'primordial':'Primordiale', 'sylvan':'Silvano', 'undercommon':'Comune Sotterraneo',
  'auran':'Auran', 'aquan':'Aquan', 'ignan':'Ignan', 'terran':'Terran',
  'thieves’ cant':'Gergo Ladresco', 'druidic':'Druidico',
};

/* Schemi dei nomi di sottoclasse: «Path of the Berserker» → «Cammino del
   Berserker». Il gruppo catturato resta com'è se non lo conosciamo. */
const TRAD_SCHEMI = [
  [/^path of the (.+)$/i,    'Cammino'],
  [/^path of (.+)$/i,        'Cammino'],
  [/^college of the (.+)$/i, 'Collegio'],
  [/^college of (.+)$/i,     'Collegio'],
  [/^circle of the (.+)$/i,  'Circolo'],
  [/^circle of (.+)$/i,      'Circolo'],
  [/^way of the (.+)$/i,     'Via'],
  [/^way of (.+)$/i,         'Via'],
  [/^oath of the (.+)$/i,    'Giuramento'],
  [/^oath of (.+)$/i,        'Giuramento'],
  [/^forbidden school of (.+)$/i, 'Scuola Proibita'],
  [/^school of the (.+)$/i,  'Scuola'],
  [/^school of (.+)$/i,      'Scuola'],
  [/^order of the (.+)$/i,   'Ordine'],
  [/^order of (.+)$/i,       'Ordine'],
  [/^patron of the (.+)$/i,  'Patrono'],
  [/^patron of (.+)$/i,      'Patrono'],
  [/^(.+) domain$/i,         'Dominio'],
  [/^(.+) bloodline$/i,      'Discendenza'],
  [/^(.+) sorcery$/i,        'Stregoneria'],
  [/^(.+) archetype$/i,      'Archetipo'],
];
/* Preposizione di scorta quando la parola interna non ne porta una sua.
   «Via» vuole «del», «Scuola» vuole «di»: dipende dal prefisso. */
const TRAD_PREP = { 'Scuola Proibita':'di', 'Cammino':'del', 'Collegio':'del', 'Circolo':'del', 'Via':'del',
  'Giuramento':'del', 'Scuola':'di', 'Ordine':'del', 'Patrono':'del',
  'Dominio':'della', 'Discendenza':'', 'Stregoneria':'', 'Archetipo':'' };
/* Parole che compaiono dentro i nomi delle sottoclassi. */
const TRAD_PAROLE = {
  'berserker':'del Berserker', 'totem warrior':'del Guerriero Totemico',
  'ancestral guardian':'Guardiano Ancestrale', 'storm herald':'Araldo della Tempesta',
  'zealot':'Fanatico', 'battlerager':'Furente', 'juggarnaut':'del Juggernaut', 'juggernaut':'del Juggernaut',
  'lore':'del Sapere', 'valor':'del Valore', 'swords':'delle Spade', 'satire':'della Satira',
  'glamour':'dell’Incanto', 'whispers':'dei Sussurri', 'maestro':'del Maestro',
  'knowledge':'della Conoscenza', 'life':'della Vita', 'light':'della Luce',
  'nature':'della Natura', 'tempest':'della Tempesta', 'trickery':'dell’Inganno',
  'war':'della Guerra', 'forge':'della Forgia', 'grave':'della Tomba',
  'protection':'della Protezione', 'arcane':'Arcano', 'blood':'del Sangue',
  'land':'della Terra', 'moon':'della Luna', 'dreams':'dei Sogni',
  'shepherd':'del Pastore', 'shepard':'del Pastore', 'twilight':'del Crepuscolo',
  'spores':'delle Spore', 'stars':'degli Astri', 'wildfire':'del Fuoco Selvaggio',
  'champion':'Campione', 'battle master':'Maestro di Battaglia', 'eldritch knight':'Cavaliere Mistico',
  'purple dragon knight':'Cavaliere del Drago Purpureo', 'arcane archer':'Arciere Arcano',
  'cavalier':'Cavaliere', 'samurai':'Samurai', 'scout':'Esploratore', 'brute':'Bruto',
  'knight':'Cavaliere', 'sharpshooter':'Tiratore Scelto', 'gunslinger':'Pistolero',
  'monster hunter':'Cacciatore di Mostri', 'alchemist':'Alchimista', 'gunsmith':'Armaiolo',
  'open hand':'della Mano Aperta', 'shadow':'dell’Ombra', 'four elements':'dei Quattro Elementi',
  'long death':'della Lunga Morte', 'sun soul':'dell’Anima Solare', 'drunken master':'del Maestro Ubriaco',
  'kensai':'del Kensei', 'kensei':'del Kensei', 'cobalt soul':'dell’Anima di Cobalto',
  'tranquility':'della Tranquillità',
  'devotion':'della Devozione', 'ancients':'degli Antichi', 'vengeance':'della Vendetta',
  'conquest':'della Conquista', 'redemption':'della Redenzione', 'crown':'della Corona',
  'treachery':'del Tradimento',
  'hunter':'Cacciatore', 'beastmaster':'Signore delle Bestie', 'beast master':'Signore delle Bestie',
  'gloom stalker':'Cacciatore Tenebroso', 'horizon walker':'Viandante dell’Orizzonte',
  'monster slayer':'Sterminatore di Mostri', 'primeval guardian':'Guardiano Primevo',
  'assassin':'Assassino', 'thief':'Ladro', 'arcane trickster':'Furfante Arcano',
  'mastermind':'Mente Superiore', 'swashbuckler':'Spadaccino', 'inquisitive':'Inquisitore',
  'draconic bloddline':'Draconica', 'draconic':'Draconica', 'divine soul':'Anima Divina',
  'wild magic':'Magia Selvaggia', 'storm':'della Tempesta', 'phoenix':'della Fenice',
  'pyromancer':'Piromante', 'runechild':'Figlio delle Rune', 'invention':'dell’Invenzione', 'artificery':'dell’Artificio', 'lore mastery':'della Padronanza del Sapere', 'stone':'della Pietra',
  'shadow magic':'Magia d’Ombra', 'sea':'del Mare',
  'abjuration':'Abiurazione', 'conjuration':'Evocazione', 'divination':'Divinazione',
  'enchantment':'Ammaliamento', 'evocation':'Invocazione', 'illusion':'Illusione',
  'necromancy':'Necromanzia', 'transmutation':'Trasmutazione', 'bladesinging':'Canto di Lama',
  'war magic':'Magia da Guerra',
  'fiend':'dell’Immondo', 'archfey':'dell’Arcifata', 'great old one':'del Grande Antico',
  'hexblade':'della Lama Malefica', 'celestial':'del Celestiale', 'undying':'del Non Morente',
  'seeker':'del Cercatore', 'raven queen':'della Regina Corvo',
  'ghostslayer':'dello Sterminatore di Spettri', 'lycan':'del Licantropo', 'mutant':'del Mutante',
  'avatar':'dell’Avatar', 'awakened':'del Risvegliato', 'immortal':'dell’Immortale',
  'nomad':'del Nomade', 'soul knife':'della Lama d’Anima', 'wu jen':'del Wu Jen',
};
/* Qualificatori che in italiano vanno PRIMA della stirpe: «Alto Elfo».
   Tutti gli altri seguono: «Nano Grigio», «Elfo del Mare». */
const TRAD_PRIMA = new Set(['high','deep']);

/* Traduce un nome. Se non riconosce niente lo lascia com'è. */
function traduciNome(nome){
  const grezzo = String(nome||'').trim();
  if (!grezzo) return grezzo;
  // «Gray Dwarf [Duergar]»: la coda fra parentesi si mette da parte e si rimette
  const coda = /\s*([\[(].*)$/.exec(grezzo);
  const originale = coda ? grezzo.slice(0, coda.index).trim() : grezzo;
  const rimetti = (x) => coda ? (x + ' ' + coda[1].trim()) : x;
  const chiave = originale.toLowerCase();

  // un cambio di sole maiuscole non è una traduzione: si lascia stare
  const uguale = (x) => x.toLowerCase() === chiave;
  if (TRAD_TERMINI[chiave]) return uguale(TRAD_TERMINI[chiave]) ? grezzo : rimetti(TRAD_TERMINI[chiave]);
  if (TRAD_PAROLE[chiave]){
    const t = senzaArticolo(TRAD_PAROLE[chiave]);
    return uguale(t) ? grezzo : rimetti(t);
  }

  // «Hill Dwarf», «Air Genasi»: qualificatore + stirpe
  const due = /^([A-Za-z'’-]+)\s+([A-Za-z'’-]+)$/.exec(originale);
  if (due){
    const kq = due[1].toLowerCase(), kb = due[2].toLowerCase();
    const q = TRAD_TERMINI[kq], b = TRAD_TERMINI[kb];
    if (q && b) return rimetti(TRAD_PRIMA.has(kq) ? (q + ' ' + b) : (b + ' ' + q));
  }
  // schemi «Path of the X» → «Cammino del X»
  for (const [rx, prefisso] of TRAD_SCHEMI){
    const m = rx.exec(originale);
    if (!m) continue;
    let dentro = traduciParte(m[1]);
    // se la parola tradotta non porta già la sua preposizione, gliela diamo noi
    if (!/^(del|dello|della|dell’|dell'|dei|degli|delle|di|d’|d')\b/i.test(dentro)){
      const prep = TRAD_PREP[prefisso];
      if (prep) dentro = prep + ' ' + dentro;
    }
    return rimetti((prefisso + ' ' + dentro).replace(/\s+/g,' ').trim());
  }
  const parte = traduciParte(originale);
  const finale = senzaArticolo(parte) || originale;
  // un cambio di sole maiuscole non è una traduzione
  if (finale.toLowerCase() === originale.toLowerCase()) return grezzo;
  return rimetti(finale);
}
/* «del Sapere» → «Sapere», quando la parola sta da sola. */
function senzaArticolo(t){
  return String(t||'').replace(/^(del|dello|della|dell’|dell'|dei|degli|delle|di|d’|d')\s*/i,'').trim();
}
/* Traduce il pezzo interno di un nome, parola per parola se serve. */
function traduciParte(testo){
  const t = String(testo||'').trim();
  const k = t.toLowerCase();
  if (TRAD_PAROLE[k]) return TRAD_PAROLE[k];
  if (TRAD_TERMINI[k]) return TRAD_TERMINI[k];
  // Parola per parola solo se le riconosciamo TUTTE: una traduzione a metà
  // («Forbidden School of del Sangue Magic») è peggio dell'originale.
  const parole = t.split(/\s+/);
  if (parole.length > 1){
    const tradotte = [];
    for (const p of parole){
      const pk = p.toLowerCase().replace(/[^a-z'’-]/g,'');
      const v = TRAD_PAROLE[pk] || TRAD_TERMINI[pk];
      if (!v) return t;
      tradotte.push(senzaArticolo(v));
    }
    return tradotte.join(' ');
  }
  return t;
}
/* «Common and Dwarvish» → «Comune e Nanico» */
function traduciLingue(testo){
  const t = String(testo||'').trim();
  if (!t) return t;
  return t.split(/\s*(?:,|\band\b|\be\b)\s*/i)
    .map(x => x.trim()).filter(Boolean)
    .map(x => TRAD_TERMINI[x.toLowerCase()] || x)
    .join(', ')
    .replace(/, ([^,]+)$/, ' e $1');
}

/* ─── La schermata ─── */
let tradAnteprima = null;

function openTraduzione(){
  const voci = (state.homebrew || []).filter(x => x && x.name);
  if (!voci.length){ toast('Non hai ancora contenuti tuoi da tradurre'); return; }
  const cambi = [];
  voci.forEach(v => {
    const nuovo = traduciNome(v.name);
    if (nuovo && nuovo !== v.name) cambi.push({ id: v.id, kind: v.kind, da: v.name, a: nuovo });
  });
  tradAnteprima = { cambi, totale: voci.length };
  openModal({ render: () => tradHTML() });
}
function tradHTML(){
  const a = tradAnteprima || { cambi: [], totale: 0 };
  const daAnnullare = (state.homebrew||[]).filter(x => x && x.nameEn).length;
  const riga = (c) => `<div class="attack-row" style="display:block">
      <div class="muted" style="font-size:.72rem">${HB_KINDS[c.kind]?HB_KINDS[c.kind].icon:''} ${escapeHtml(c.da)}</div>
      <div class="attack-name" style="color:var(--gold)">${escapeHtml(c.a)}</div>
    </div>`;
  const inner = `
    <p class="muted" style="margin-bottom:14px">
      Rinomino in italiano <b>i nomi</b> di quello che hai importato: sottoclassi, razze,
      tratti, privilegi e lingue. <b>Il testo delle regole non viene toccato</b>: resta
      come sta nel tuo manuale.
    </p>
    <div class="card" style="margin-bottom:12px">
      <div class="row-between"><span class="muted">Voci tue</span><b>${a.totale}</b></div>
      <div class="row-between" style="margin-top:4px"><span class="muted">Da rinominare</span><b style="color:var(--gold)">${a.cambi.length}</b></div>
    </div>
    ${a.cambi.length ? `<div class="divider"><span class="flourish">❧</span><span>Anteprima</span></div>
      <div class="list-gap">${a.cambi.slice(0,40).map(riga).join('')}</div>
      ${a.cambi.length>40?`<p class="muted" style="font-size:.75rem; margin-top:8px">…e altre ${a.cambi.length-40}.</p>`:''}`
      : emptyState('🇮🇹','Non c\'è niente da rinominare: i nomi sono già in italiano, o non li riconosco.')}
    <div class="btn-row" style="margin-top:14px">
      <button class="btn btn-ghost" onclick="closeModal()">Lascia stare</button>
      <button class="btn btn-primary" ${a.cambi.length?'':'disabled'} onclick="applicaTraduzione()">Traduci ${a.cambi.length||''}</button>
    </div>
    ${daAnnullare ? `<button class="btn btn-ghost btn-block btn-sm" style="margin-top:10px" onclick="annullaTraduzione()">↩︎ Rimetti i nomi originali (${daAnnullare})</button>` : ''}
    <div class="spell-source-note">I nomi originali restano salvati: puoi tornare indietro quando vuoi.</div>`;
  return modalShell('🇮🇹 Traduci i nomi', inner);
}
function applicaTraduzione(){
  let n = 0;
  (state.homebrew||[]).forEach(v => {
    if (!v || !v.name) return;
    let toccato = false;
    const nuovo = traduciNome(v.name);
    if (nuovo && nuovo !== v.name){
      if (!v.nameEn) v.nameEn = v.name;   // il primo originale è quello buono
      v.name = nuovo; toccato = true; n++;
    }
    (v.traits||[]).forEach(t => {
      const tn = traduciNome(t[0]);
      if (tn && tn !== t[0]){ t[0] = tn; toccato = true; }
    });
    Object.keys(v.features||{}).forEach(lv => {
      (v.features[lv]||[]).forEach(f => {
        const fn = traduciNome(f[0]);
        if (fn && fn !== f[0]){ f[0] = fn; toccato = true; }
      });
    });
    if (v.languages){
      const lg = traduciLingue(v.languages);
      if (lg && lg !== v.languages){ v.languages = lg; toccato = true; }
    }
    if (v.feature){
      const pf = traduciNome(v.feature);
      if (pf && pf !== v.feature){ v.feature = pf; toccato = true; }
    }
    if (toccato) scheduleSave('homebrew', v);
  });
  tradAnteprima = null;
  closeModal(); render();
  toast(n ? ('🇮🇹 ' + n + (n===1?' nome tradotto':' nomi tradotti')) : 'Non c\'era niente da rinominare');
}
function annullaTraduzione(){
  let n = 0;
  (state.homebrew||[]).forEach(v => {
    if (!v || !v.nameEn) return;
    v.name = v.nameEn; delete v.nameEn; n++;
    scheduleSave('homebrew', v);
  });
  tradAnteprima = null;
  closeModal(); render();
  toast(n ? ('↩︎ ' + n + (n===1?' nome rimesso com\'era':' nomi rimessi com\'erano')) : 'Niente da rimettere');
}
