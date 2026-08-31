/* ══════════════════════════════════════════════════════════════
   Grimorio — armi, armature ed equipaggiamento dell'SRD 5.1
   Contenuto sotto Open Gaming License 1.0a, in italiano.
   I pesi sono in kg e i costi in monete d'oro (mo), come nel
   resto dell'app.
   ══════════════════════════════════════════════════════════════ */

/* Proprietà delle armi, spiegate una volta sola */
const WEAPON_PROPS = {
  accurata:   'Puoi usare Destrezza al posto di Forza per il tiro per colpire e i danni.',
  leggera:    'Adatta al combattimento con due armi.',
  pesante:    'Le creature Piccole hanno svantaggio ad attaccare con quest\'arma.',
  versatile:  'Impugnata a due mani infligge il dado di danno maggiore.',
  'a distanza':'Si usa a distanza; fra parentesi la gittata normale e quella massima.',
  lancio:     'Puoi lanciarla per fare un attacco a distanza.',
  ricarica:   'Puoi tirare solo un colpo per azione, indipendentemente dagli attacchi.',
  munizioni:  'Serve munizionamento; recuperi metà dei proiettili dopo lo scontro.',
  'due mani': 'Richiede due mani.',
  portata:    'Aggiunge 1,5 m alla tua portata quando attacchi.',
  speciale:   'Ha una regola tutta sua.',
};

/* d = dado dei danni, dt = tipo di danno, p = proprietà,
   c = costo in mo, w = peso in kg, cat = semplice|guerra,
   r = mischia|distanza */
const SRD_WEAPONS = [
  /* ── Armi semplici da mischia ── */
  {id:'club',n:'Club',it:'Clava',cat:'semplice',r:'mischia',d:'1d4',dt:'contundenti',c:0.1,w:1,p:['leggera']},
  {id:'dagger',n:'Dagger',it:'Pugnale',cat:'semplice',r:'mischia',d:'1d4',dt:'perforanti',c:2,w:0.5,p:['accurata','leggera','lancio (6/18 m)']},
  {id:'greatclub',n:'Greatclub',it:'Randello',cat:'semplice',r:'mischia',d:'1d8',dt:'contundenti',c:0.2,w:5,p:['due mani']},
  {id:'handaxe',n:'Handaxe',it:'Ascia',cat:'semplice',r:'mischia',d:'1d6',dt:'taglienti',c:5,w:1,p:['leggera','lancio (6/18 m)']},
  {id:'javelin',n:'Javelin',it:'Giavellotto',cat:'semplice',r:'mischia',d:'1d6',dt:'perforanti',c:0.5,w:1,p:['lancio (9/36 m)']},
  {id:'light-hammer',n:'Light Hammer',it:'Martello Leggero',cat:'semplice',r:'mischia',d:'1d4',dt:'contundenti',c:2,w:1,p:['leggera','lancio (6/18 m)']},
  {id:'mace',n:'Mace',it:'Mazza',cat:'semplice',r:'mischia',d:'1d6',dt:'contundenti',c:5,w:2,p:[]},
  {id:'quarterstaff',n:'Quarterstaff',it:'Bastone Ferrato',cat:'semplice',r:'mischia',d:'1d6',dt:'contundenti',c:0.2,w:2,p:['versatile (1d8)']},
  {id:'sickle',n:'Sickle',it:'Falcetto',cat:'semplice',r:'mischia',d:'1d4',dt:'taglienti',c:1,w:1,p:['leggera']},
  {id:'spear',n:'Spear',it:'Lancia',cat:'semplice',r:'mischia',d:'1d6',dt:'perforanti',c:1,w:1.5,p:['lancio (6/18 m)','versatile (1d8)']},
  /* ── Armi semplici a distanza ── */
  {id:'light-crossbow',n:'Light Crossbow',it:'Balestra Leggera',cat:'semplice',r:'distanza',d:'1d8',dt:'perforanti',c:25,w:2.5,p:['munizioni (24/96 m)','ricarica','due mani']},
  {id:'dart',n:'Dart',it:'Dardo',cat:'semplice',r:'distanza',d:'1d4',dt:'perforanti',c:0.05,w:0.1,p:['accurata','lancio (6/18 m)']},
  {id:'shortbow',n:'Shortbow',it:'Arco Corto',cat:'semplice',r:'distanza',d:'1d6',dt:'perforanti',c:25,w:1,p:['munizioni (24/96 m)','due mani']},
  {id:'sling',n:'Sling',it:'Fionda',cat:'semplice',r:'distanza',d:'1d4',dt:'contundenti',c:0.1,w:0,p:['munizioni (9/36 m)']},
  /* ── Armi da guerra da mischia ── */
  {id:'battleaxe',n:'Battleaxe',it:'Ascia da Battaglia',cat:'guerra',r:'mischia',d:'1d8',dt:'taglienti',c:10,w:2,p:['versatile (1d10)']},
  {id:'flail',n:'Flail',it:'Mazzafrusto',cat:'guerra',r:'mischia',d:'1d8',dt:'contundenti',c:10,w:1,p:[]},
  {id:'glaive',n:'Glaive',it:'Falcione',cat:'guerra',r:'mischia',d:'1d10',dt:'taglienti',c:20,w:3,p:['pesante','portata','due mani']},
  {id:'greataxe',n:'Greataxe',it:'Ascia Bipenne',cat:'guerra',r:'mischia',d:'1d12',dt:'taglienti',c:30,w:3.5,p:['pesante','due mani']},
  {id:'greatsword',n:'Greatsword',it:'Spadone',cat:'guerra',r:'mischia',d:'2d6',dt:'taglienti',c:50,w:3,p:['pesante','due mani']},
  {id:'halberd',n:'Halberd',it:'Alabarda',cat:'guerra',r:'mischia',d:'1d10',dt:'taglienti',c:20,w:3,p:['pesante','portata','due mani']},
  {id:'lance',n:'Lance',it:'Lancia da Cavaliere',cat:'guerra',r:'mischia',d:'1d12',dt:'perforanti',c:10,w:3,p:['portata','speciale']},
  {id:'longsword',n:'Longsword',it:'Spada Lunga',cat:'guerra',r:'mischia',d:'1d8',dt:'taglienti',c:15,w:1.5,p:['versatile (1d10)']},
  {id:'maul',n:'Maul',it:'Maglio',cat:'guerra',r:'mischia',d:'2d6',dt:'contundenti',c:10,w:5,p:['pesante','due mani']},
  {id:'morningstar',n:'Morningstar',it:'Stella del Mattino',cat:'guerra',r:'mischia',d:'1d8',dt:'perforanti',c:15,w:2,p:[]},
  {id:'pike',n:'Pike',it:'Picca',cat:'guerra',r:'mischia',d:'1d10',dt:'perforanti',c:5,w:9,p:['pesante','portata','due mani']},
  {id:'rapier',n:'Rapier',it:'Stocco',cat:'guerra',r:'mischia',d:'1d8',dt:'perforanti',c:25,w:1,p:['accurata']},
  {id:'scimitar',n:'Scimitar',it:'Scimitarra',cat:'guerra',r:'mischia',d:'1d6',dt:'taglienti',c:25,w:1.5,p:['accurata','leggera']},
  {id:'shortsword',n:'Shortsword',it:'Spada Corta',cat:'guerra',r:'mischia',d:'1d6',dt:'perforanti',c:10,w:1,p:['accurata','leggera']},
  {id:'trident',n:'Trident',it:'Tridente',cat:'guerra',r:'mischia',d:'1d6',dt:'perforanti',c:5,w:2,p:['lancio (6/18 m)','versatile (1d8)']},
  {id:'war-pick',n:'War Pick',it:'Piccone da Guerra',cat:'guerra',r:'mischia',d:'1d8',dt:'perforanti',c:5,w:1,p:[]},
  {id:'warhammer',n:'Warhammer',it:'Martello da Guerra',cat:'guerra',r:'mischia',d:'1d8',dt:'contundenti',c:15,w:1,p:['versatile (1d10)']},
  {id:'whip',n:'Whip',it:'Frusta',cat:'guerra',r:'mischia',d:'1d4',dt:'taglienti',c:2,w:1.5,p:['accurata','portata']},
  /* ── Armi da guerra a distanza ── */
  {id:'blowgun',n:'Blowgun',it:'Cerbottana',cat:'guerra',r:'distanza',d:'1',dt:'perforanti',c:10,w:0.5,p:['munizioni (7,5/30 m)','ricarica']},
  {id:'hand-crossbow',n:'Hand Crossbow',it:'Balestra a Mano',cat:'guerra',r:'distanza',d:'1d6',dt:'perforanti',c:75,w:1.5,p:['munizioni (9/36 m)','leggera','ricarica']},
  {id:'heavy-crossbow',n:'Heavy Crossbow',it:'Balestra Pesante',cat:'guerra',r:'distanza',d:'1d10',dt:'perforanti',c:50,w:9,p:['munizioni (30/120 m)','pesante','ricarica','due mani']},
  {id:'longbow',n:'Longbow',it:'Arco Lungo',cat:'guerra',r:'distanza',d:'1d8',dt:'perforanti',c:50,w:1,p:['munizioni (45/180 m)','pesante','due mani']},
  {id:'net',n:'Net',it:'Rete',cat:'guerra',r:'distanza',d:'—',dt:'—',c:1,w:1.5,p:['speciale','lancio (1,5/4,5 m)']},
];

/* ac = formula: numero base; dex = 'full' | 'max2' | 'none'
   str = requisito di Forza; stealth = svantaggio a Furtività */
const SRD_ARMORS = [
  {id:'padded',n:'Padded',it:'Imbottita',cat:'leggera',ac:11,dex:'full',c:5,w:4,str:0,stealth:true},
  {id:'leather',n:'Leather',it:'Cuoio',cat:'leggera',ac:11,dex:'full',c:10,w:5,str:0,stealth:false},
  {id:'studded-leather',n:'Studded Leather',it:'Cuoio Borchiato',cat:'leggera',ac:12,dex:'full',c:45,w:6.5,str:0,stealth:false},
  {id:'hide',n:'Hide',it:'Pelle',cat:'media',ac:12,dex:'max2',c:10,w:6,str:0,stealth:false},
  {id:'chain-shirt',n:'Chain Shirt',it:'Giaco di Maglia',cat:'media',ac:13,dex:'max2',c:50,w:10,str:0,stealth:false},
  {id:'scale-mail',n:'Scale Mail',it:'Corazza di Squame',cat:'media',ac:14,dex:'max2',c:50,w:22.5,str:0,stealth:true},
  {id:'breastplate',n:'Breastplate',it:'Corazza di Piastre',cat:'media',ac:14,dex:'max2',c:400,w:10,str:0,stealth:false},
  {id:'half-plate',n:'Half Plate',it:'Mezza Armatura',cat:'media',ac:15,dex:'max2',c:750,w:20,str:0,stealth:true},
  {id:'ring-mail',n:'Ring Mail',it:'Corazza ad Anelli',cat:'pesante',ac:14,dex:'none',c:30,w:20,str:0,stealth:true},
  {id:'chain-mail',n:'Chain Mail',it:'Cotta di Maglia',cat:'pesante',ac:16,dex:'none',c:75,w:27.5,str:13,stealth:true},
  {id:'splint',n:'Splint',it:'Corazza a Strisce',cat:'pesante',ac:17,dex:'none',c:200,w:30,str:15,stealth:true},
  {id:'plate',n:'Plate',it:'Armatura Completa',cat:'pesante',ac:18,dex:'none',c:1500,w:32.5,str:15,stealth:true},
  {id:'shield',n:'Shield',it:'Scudo',cat:'scudo',ac:2,dex:'none',c:10,w:3,str:0,stealth:false},
];

/* Equipaggiamento comune: k = categoria */
const SRD_GEAR = [
  {id:'abacus',it:'Abaco',k:'attrezzatura',c:2,w:1},
  {id:'acid',it:'Acido (fiala)',k:'attrezzatura',c:25,w:0.5,d:'2d6 danni da acido'},
  {id:'alchemist-fire',it:'Fuoco dell\'alchimista (fiasca)',k:'attrezzatura',c:50,w:0.5,d:'1d4 danni da fuoco a inizio turno finché non si spegne'},
  {id:'arrows',it:'Frecce (20)',k:'munizioni',c:1,w:0.5},
  {id:'blowgun-needles',it:'Aghi da cerbottana (50)',k:'munizioni',c:1,w:0.5},
  {id:'crossbow-bolts',it:'Quadrelli da balestra (20)',k:'munizioni',c:1,w:0.75},
  {id:'sling-bullets',it:'Proiettili da fionda (20)',k:'munizioni',c:0.04,w:0.75},
  {id:'antitoxin',it:'Antitossina (fiala)',k:'attrezzatura',c:50,w:0,d:'Vantaggio ai TS contro il veleno per 1 ora'},
  {id:'backpack',it:'Zaino',k:'attrezzatura',c:2,w:2.5},
  {id:'ball-bearings',it:'Palline di metallo (sacchetto da 1000)',k:'attrezzatura',c:1,w:1},
  {id:'bedroll',it:'Sacco a pelo',k:'attrezzatura',c:1,w:3.5},
  {id:'bell',it:'Campanello',k:'attrezzatura',c:1,w:0},
  {id:'blanket',it:'Coperta',k:'attrezzatura',c:0.5,w:1.5},
  {id:'block-tackle',it:'Paranco',k:'attrezzatura',c:1,w:2.5},
  {id:'book',it:'Libro',k:'attrezzatura',c:25,w:2.5},
  {id:'glass-bottle',it:'Bottiglia di vetro',k:'attrezzatura',c:2,w:1},
  {id:'bucket',it:'Secchio',k:'attrezzatura',c:0.05,w:1},
  {id:'caltrops',it:'Triboli (sacchetto da 20)',k:'attrezzatura',c:1,w:1},
  {id:'candle',it:'Candela',k:'attrezzatura',c:0.01,w:0},
  {id:'chain',it:'Catena (3 m)',k:'attrezzatura',c:5,w:5},
  {id:'chalk',it:'Gesso',k:'attrezzatura',c:0.01,w:0},
  {id:'chest',it:'Baule',k:'attrezzatura',c:5,w:12.5},
  {id:'climbers-kit',it:'Kit da scalatore',k:'attrezzatura',c:25,w:6},
  {id:'clothes-common',it:'Abiti comuni',k:'attrezzatura',c:0.5,w:1.5},
  {id:'clothes-costume',it:'Costume',k:'attrezzatura',c:5,w:2},
  {id:'clothes-fine',it:'Abiti raffinati',k:'attrezzatura',c:15,w:3},
  {id:'clothes-travelers',it:'Abiti da viaggio',k:'attrezzatura',c:2,w:2},
  {id:'component-pouch',it:'Sacca di componenti',k:'focus',c:25,w:1},
  {id:'crowbar',it:'Piede di porco',k:'attrezzatura',c:2,w:2.5},
  {id:'fishing-tackle',it:'Attrezzatura da pesca',k:'attrezzatura',c:1,w:2},
  {id:'flask',it:'Fiasca',k:'attrezzatura',c:0.02,w:0.5},
  {id:'grappling-hook',it:'Rampino',k:'attrezzatura',c:2,w:2},
  {id:'hammer',it:'Martello',k:'attrezzatura',c:1,w:1.5},
  {id:'sledgehammer',it:'Mazza da fabbro',k:'attrezzatura',c:2,w:5},
  {id:'healers-kit',it:'Kit da guaritore',k:'attrezzatura',c:5,w:1.5,d:'10 usi: stabilizza una creatura morente senza tirare'},
  {id:'holy-symbol',it:'Simbolo sacro',k:'focus',c:5,w:0.5},
  {id:'holy-water',it:'Acqua santa (fiala)',k:'attrezzatura',c:25,w:0.5,d:'2d6 danni radiosi a immondi e non morti'},
  {id:'hourglass',it:'Clessidra',k:'attrezzatura',c:25,w:0.5},
  {id:'hunting-trap',it:'Trappola da caccia',k:'attrezzatura',c:5,w:12.5},
  {id:'ink',it:'Boccetta d\'inchiostro',k:'attrezzatura',c:10,w:0},
  {id:'ink-pen',it:'Penna d\'oca',k:'attrezzatura',c:0.02,w:0},
  {id:'jug',it:'Brocca',k:'attrezzatura',c:0.02,w:2},
  {id:'ladder',it:'Scala (3 m)',k:'attrezzatura',c:0.1,w:12.5},
  {id:'lamp',it:'Lampada',k:'attrezzatura',c:0.5,w:0.5},
  {id:'lantern-bullseye',it:'Lanterna cieca',k:'attrezzatura',c:10,w:1},
  {id:'lantern-hooded',it:'Lanterna schermata',k:'attrezzatura',c:5,w:1},
  {id:'lock',it:'Lucchetto',k:'attrezzatura',c:10,w:0.5},
  {id:'magnifying-glass',it:'Lente d\'ingrandimento',k:'attrezzatura',c:100,w:0},
  {id:'manacles',it:'Manette',k:'attrezzatura',c:2,w:3},
  {id:'mess-kit',it:'Gavetta',k:'attrezzatura',c:0.2,w:0.5},
  {id:'mirror',it:'Specchietto d\'acciaio',k:'attrezzatura',c:5,w:0.25},
  {id:'oil',it:'Olio (fiasca)',k:'attrezzatura',c:0.1,w:0.5},
  {id:'paper',it:'Carta (foglio)',k:'attrezzatura',c:0.2,w:0},
  {id:'parchment',it:'Pergamena (foglio)',k:'attrezzatura',c:0.1,w:0},
  {id:'perfume',it:'Profumo (fiala)',k:'attrezzatura',c:5,w:0},
  {id:'pick-miners',it:'Piccone da minatore',k:'attrezzatura',c:2,w:5},
  {id:'piton',it:'Pitone',k:'attrezzatura',c:0.05,w:0.25},
  {id:'poison-basic',it:'Veleno base (fiala)',k:'attrezzatura',c:100,w:0,d:'TS Cos CD 10 o 1d4 danni da veleno'},
  {id:'pole',it:'Palo (3 m)',k:'attrezzatura',c:0.05,w:3.5},
  {id:'pot-iron',it:'Pentola di ferro',k:'attrezzatura',c:2,w:5},
  {id:'potion-healing-gear',it:'Pozione di guarigione',k:'attrezzatura',c:50,w:0.25,d:'Recuperi 2d4+2 PF'},
  {id:'pouch',it:'Borsa',k:'attrezzatura',c:0.5,w:0.5},
  {id:'quiver',it:'Faretra',k:'attrezzatura',c:1,w:0.5},
  {id:'ram-portable',it:'Ariete portatile',k:'attrezzatura',c:4,w:17.5},
  {id:'rations',it:'Razioni (1 giorno)',k:'attrezzatura',c:0.5,w:0.9},
  {id:'robes',it:'Vesti',k:'attrezzatura',c:1,w:2},
  {id:'rope-hemp',it:'Corda di canapa (15 m)',k:'attrezzatura',c:1,w:4.5},
  {id:'rope-silk',it:'Corda di seta (15 m)',k:'attrezzatura',c:10,w:2.5},
  {id:'sack',it:'Sacco',k:'attrezzatura',c:0.01,w:0.25},
  {id:'scale-merchants',it:'Bilancia da mercante',k:'attrezzatura',c:5,w:1.5},
  {id:'sealing-wax',it:'Cera per sigilli',k:'attrezzatura',c:0.5,w:0},
  {id:'shovel',it:'Pala',k:'attrezzatura',c:2,w:2.5},
  {id:'signal-whistle',it:'Fischietto',k:'attrezzatura',c:0.05,w:0},
  {id:'signet-ring',it:'Anello con sigillo',k:'attrezzatura',c:5,w:0},
  {id:'soap',it:'Sapone',k:'attrezzatura',c:0.02,w:0},
  {id:'spellbook',it:'Libro degli incantesimi',k:'focus',c:50,w:1.5},
  {id:'spikes-iron',it:'Chiodi di ferro (10)',k:'attrezzatura',c:1,w:2.5},
  {id:'spyglass',it:'Cannocchiale',k:'attrezzatura',c:1000,w:0.5},
  {id:'tent',it:'Tenda (2 persone)',k:'attrezzatura',c:2,w:10},
  {id:'tinderbox',it:'Acciarino ed esca',k:'attrezzatura',c:0.5,w:0.5},
  {id:'torch',it:'Torcia',k:'attrezzatura',c:0.01,w:0.5},
  {id:'vial',it:'Fiala',k:'attrezzatura',c:1,w:0},
  {id:'waterskin',it:'Otre',k:'attrezzatura',c:0.2,w:2.5},
  {id:'whetstone',it:'Cote',k:'attrezzatura',c:0.01,w:0.5},
  {id:'arcane-focus',it:'Focus arcano',k:'focus',c:10,w:1},
  {id:'druidic-focus',it:'Focus druidico',k:'focus',c:1,w:1.5},
  /* ── Attrezzi ── */
  {id:'alchemists-supplies',it:'Forniture da alchimista',k:'attrezzi',c:50,w:4},
  {id:'brewers-supplies',it:'Forniture da birraio',k:'attrezzi',c:20,w:4.5},
  {id:'calligraphers-supplies',it:'Forniture da calligrafo',k:'attrezzi',c:10,w:2.5},
  {id:'carpenters-tools',it:'Attrezzi da carpentiere',k:'attrezzi',c:8,w:3},
  {id:'cartographers-tools',it:'Attrezzi da cartografo',k:'attrezzi',c:15,w:3},
  {id:'cobblers-tools',it:'Attrezzi da calzolaio',k:'attrezzi',c:5,w:2.5},
  {id:'cooks-utensils',it:'Utensili da cuoco',k:'attrezzi',c:1,w:4},
  {id:'glassblowers-tools',it:'Attrezzi da vetraio',k:'attrezzi',c:30,w:2.5},
  {id:'jewelers-tools',it:'Attrezzi da gioielliere',k:'attrezzi',c:25,w:1},
  {id:'leatherworkers-tools',it:'Attrezzi da conciatore',k:'attrezzi',c:5,w:2.5},
  {id:'masons-tools',it:'Attrezzi da muratore',k:'attrezzi',c:10,w:4},
  {id:'painters-supplies',it:'Forniture da pittore',k:'attrezzi',c:10,w:2.5},
  {id:'potters-tools',it:'Attrezzi da vasaio',k:'attrezzi',c:10,w:1.5},
  {id:'smiths-tools',it:'Attrezzi da fabbro',k:'attrezzi',c:20,w:4},
  {id:'tinkers-tools',it:'Attrezzi da stagnino',k:'attrezzi',c:50,w:5},
  {id:'weavers-tools',it:'Attrezzi da tessitore',k:'attrezzi',c:1,w:2.5},
  {id:'woodcarvers-tools',it:'Attrezzi da intagliatore',k:'attrezzi',c:1,w:2.5},
  {id:'disguise-kit',it:'Kit per travestimenti',k:'attrezzi',c:25,w:1.5},
  {id:'forgery-kit',it:'Kit da falsario',k:'attrezzi',c:15,w:2.5},
  {id:'herbalism-kit',it:'Kit da erborista',k:'attrezzi',c:5,w:1.5},
  {id:'navigators-tools',it:'Strumenti da navigatore',k:'attrezzi',c:25,w:1},
  {id:'poisoners-kit',it:'Kit da avvelenatore',k:'attrezzi',c:50,w:1},
  {id:'thieves-tools',it:'Arnesi da scasso',k:'attrezzi',c:25,w:0.5},
  {id:'dice-set',it:'Set di dadi',k:'attrezzi',c:0.1,w:0},
  {id:'playing-cards',it:'Mazzo di carte',k:'attrezzi',c:0.5,w:0},
  {id:'lute',it:'Liuto',k:'strumento',c:35,w:1},
  {id:'flute',it:'Flauto',k:'strumento',c:2,w:0.5},
  {id:'drum',it:'Tamburo',k:'strumento',c:6,w:1.5},
  {id:'horn',it:'Corno',k:'strumento',c:3,w:1},
  {id:'lyre',it:'Lira',k:'strumento',c:30,w:1},
  {id:'bagpipes',it:'Cornamusa',k:'strumento',c:30,w:3},
  {id:'viol',it:'Viola',k:'strumento',c:30,w:0.5},
  /* ── Cavalcature e veicoli ── */
  {id:'horse-riding',it:'Cavallo da sella',k:'cavalcatura',c:75,w:0,d:'Velocità 18 m, capacità di carico 216 kg'},
  {id:'horse-draft',it:'Cavallo da tiro',k:'cavalcatura',c:50,w:0,d:'Velocità 12 m, capacità di carico 240 kg'},
  {id:'warhorse',it:'Destriero da guerra',k:'cavalcatura',c:400,w:0,d:'Velocità 18 m, capacità di carico 240 kg'},
  {id:'pony',it:'Pony',k:'cavalcatura',c:30,w:0,d:'Velocità 12 m, capacità di carico 102 kg'},
  {id:'mule',it:'Mulo',k:'cavalcatura',c:8,w:0,d:'Velocità 12 m, capacità di carico 204 kg'},
  {id:'camel',it:'Cammello',k:'cavalcatura',c:50,w:0,d:'Velocità 15 m, capacità di carico 216 kg'},
  {id:'mastiff',it:'Mastino',k:'cavalcatura',c:25,w:0,d:'Velocità 12 m, capacità di carico 78 kg'},
  {id:'saddle-riding',it:'Sella da equitazione',k:'cavalcatura',c:10,w:12.5},
  {id:'saddle-exotic',it:'Sella esotica',k:'cavalcatura',c:60,w:20},
  {id:'barding',it:'Barda',k:'cavalcatura',c:0,w:0,d:'Costa 4 volte l\'armatura corrispondente e pesa il doppio'},
  {id:'cart',it:'Carretto',k:'cavalcatura',c:15,w:100},
  {id:'wagon',it:'Carro',k:'cavalcatura',c:35,w:200},
  {id:'rowboat',it:'Barca a remi',k:'cavalcatura',c:50,w:50},
];

const WEAPON_BY_ID = Object.fromEntries(SRD_WEAPONS.map(w=>[w.id,w]));
const ARMOR_BY_ID = Object.fromEntries(SRD_ARMORS.map(a=>[a.id,a]));
const GEAR_BY_ID = Object.fromEntries(SRD_GEAR.map(g=>[g.id,g]));
const GEAR_KINDS = ['attrezzatura','attrezzi','strumento','munizioni','focus','cavalcatura'];

/* ─── Dal nome scritto a mano alla voce di tabella ───────────────
   I pacchetti iniziali delle classi sono scritti in italiano corrente
   («Armatura di cuoio», «Due pugnali», «Torce»), le tabelle SRD hanno
   il nome secco e singolare («Cuoio», «Pugnale», «Torcia»). Finche' il
   confronto era fatto sul nome nudo, meta' del pacchetto non si
   riconosceva: il ladro partiva con CA 9 perche' la sua armatura di
   cuoio non veniva vista, e il paladino non aveva NESSUNA riga
   d'attacco perche' «Giavellotti» non e' «Giavellotto». Qui i due
   mondi si parlano. */
const GEAR_ALIAS = {
  // armature
  'armatura di cuoio':'leather', 'cuoio':'leather',
  'armatura di cuoio borchiato':'studded-leather',
  'armatura di squame':'scale-mail', 'corazza di squame':'scale-mail',
  'scudo di legno':'shield',
  'cotta di maglia':'chain-mail',
  // armi al plurale o con l'articolo
  'due pugnali':'dagger', 'pugnali':'dagger',
  'giavellotti':'javelin',
  'dardi':'dart',
  'due asce':'handaxe', 'asce':'handaxe', 'ascia':'handaxe',
  'due spade corte':'shortsword', 'spade corte':'shortsword',
  // munizioni
  'frecce':'arrows', 'freccia':'arrows',
  'quadrelli':'crossbow-bolts', 'quadrello':'crossbow-bolts',
  'proiettili da fionda':'sling-bullets',
  // roba comune al plurale
  'torce':'torch', 'pitoni':'piton', 'candele':'candle',
  "fiasche d'olio":'oil', "fiasca d'olio":'oil',
  'palline di metallo':'ball-bearings',
  'carta':'paper', 'pergamena':'parchment',
  'profumo':'perfume', 'costumi':'clothes-costume', 'costume':'clothes-costume',
  'vesti cerimoniali':'robes', 'abiti raffinati':'clothes-fine',
  'libro di sapienza':'book',
  'corda di seta (3 m)':'rope-silk',
  'razioni (1 giorno)':'rations',
  'strumento musicale a scelta':'lute',
};
/* Cerca una voce nelle tabelle: prima per nome esatto, poi per alias.
   Torna { tipo, obj } oppure null se e' roba senza voce (le cose
   narrative dei pacchetti: turibolo, scatola per elemosine…). */
function gearTrova(nome){
  const n = norm(nome);
  const perNome = (arr) => arr.find(x => norm(gearName(x)) === n || norm(x.it || '') === n);
  let w = perNome(SRD_WEAPONS); if (w) return { tipo:'arma', obj:w };
  let a = perNome(SRD_ARMORS);  if (a) return { tipo:'armatura', obj:a };
  let g = perNome(SRD_GEAR);    if (g) return { tipo:'roba', obj:g };
  const id = GEAR_ALIAS[n];
  if (!id) return null;
  w = SRD_WEAPONS.find(x => x.id === id); if (w) return { tipo:'arma', obj:w };
  a = SRD_ARMORS.find(x => x.id === id);  if (a) return { tipo:'armatura', obj:a };
  g = SRD_GEAR.find(x => x.id === id);    if (g) return { tipo:'roba', obj:g };
  return null;
}
function gearArma(nome){ const r = gearTrova(nome); return (r && r.tipo === 'arma') ? r.obj : null; }
function gearArmatura(nome){ const r = gearTrova(nome); return (r && r.tipo === 'armatura') ? r.obj : null; }

function gearName(x){ return (typeof state !== 'undefined' && state.spellLang === 'en' && x.n) ? x.n : (x.it || x.n); }

/* La CA che ti dà un'armatura, tenendo conto della Destrezza */
function armorAC(armor, dexMod){
  if (!armor) return null;
  if (armor.dex === 'full') return armor.ac + dexMod;
  if (armor.dex === 'max2') return armor.ac + Math.min(dexMod, 2);
  return armor.ac;
}
/* Un'arma è accurata? Allora usa la caratteristica migliore */
function weaponAbility(w, c){
  const str = mod(getPath(c,'abilities.str',10));
  const dex = mod(getPath(c,'abilities.dex',10));
  const finesse = (w.p||[]).some(p => /accurata/.test(p));
  if (w.r === 'distanza') return { key:'dex', m:dex };
  if (finesse) return dex >= str ? { key:'dex', m:dex } : { key:'str', m:str };
  return { key:'str', m:str };
}
/* Sei competente con quest'arma? Lo deduciamo da quello che c'è scritto sulla scheda */
function proficientWith(w, c){
  const txt = norm((c.profOther || '') + ' ' + (c.armor || ''));
  if (!txt) return true; // se non sappiamo nulla, non penalizziamo
  if (w.cat === 'semplice' && /armi semplici|semplici/.test(txt)) return true;
  if (w.cat === 'guerra' && /armi da guerra|da guerra/.test(txt)) return true;
  return norm(txt).includes(norm(gearName(w)));
}
