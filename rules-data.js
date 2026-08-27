/* ══════════════════════════════════════════════════════════════
   Grimorio — dati di regole per la creazione dei personaggi
   Razze, classi, sottoclassi e background della 5ª edizione.
   I testi sono riassunti scritti per il Grimorio: descrivono le
   meccaniche (che non sono protette da copyright) senza riprodurre
   il testo dei manuali. Servono a ricordarti cosa fa una scelta,
   non a sostituire il manuale.
   ══════════════════════════════════════════════════════════════ */

/* ─── RAZZE ─── */
const RACES = [
  { id:'human', name:'Umano', speed:9, size:'Media',
    bonus:{ str:1, dex:1, con:1, int:1, wis:1, cha:1 },
    languages:['Comune','una lingua a scelta'],
    traits:[{name:'Versatilità', desc:'+1 a tutte e sei le caratteristiche.'}],
    subraces:[] },
  { id:'human-variant', name:'Umano variante', speed:9, size:'Media', notSrd:true,
    bonus:{}, bonusChoice:{ count:2, amount:1 },
    languages:['Comune','una lingua a scelta'],
    traits:[
      {name:'Adattabilità', desc:'+1 a due caratteristiche a tua scelta.'},
      {name:'Abilità', desc:'Competenza in un\'abilità a tua scelta.'},
      {name:'Talento', desc:'Un talento a tua scelta (scrivilo nella scheda Note).'}
    ],
    skillChoice:1, subraces:[] },
  { id:'dwarf', name:'Nano', speed:7.5, size:'Media',
    bonus:{ con:2 },
    languages:['Comune','Nanico'],
    traits:[
      {name:'Scurovisione', desc:'Vedi al buio fino a 18 metri come se fosse penombra.'},
      {name:'Resilienza nanica', desc:'Vantaggio ai TS contro il veleno e resistenza ai danni da veleno.'},
      {name:'Addestramento nanico', desc:'Competenza con ascia da battaglia, ascia da mano, martello leggero e da guerra.'},
      {name:'Competenza con strumenti', desc:'Un set fra arnesi da fabbro, birraio o muratore.'},
      {name:'Affinità con la pietra', desc:'Competenza raddoppiata alle prove di Storia sui lavori in pietra.'}
    ],
    subraces:[
      { id:'hill-dwarf', name:'Nano delle colline', bonus:{ wis:1 },
        traits:[{name:'Tenacia nanica', desc:'+1 punto ferita massimo per ogni livello.'}] }
    ] },
  { id:'elf', name:'Elfo', speed:9, size:'Media',
    bonus:{ dex:2 },
    languages:['Comune','Elfico'],
    traits:[
      {name:'Scurovisione', desc:'Vedi al buio fino a 18 metri come se fosse penombra.'},
      {name:'Sensi acuti', desc:'Competenza in Percezione.'},
      {name:'Retaggio fatato', desc:'Vantaggio contro l\'essere affascinato; la magia non ti fa addormentare.'},
      {name:'Trance', desc:'Ti bastano 4 ore di meditazione al posto di 8 di sonno.'}
    ],
    grantSkills:['perception'],
    subraces:[
      { id:'high-elf', name:'Alto elfo', bonus:{ int:1 },
        traits:[
          {name:'Addestramento elfico', desc:'Competenza con spada lunga, spada corta, arco corto e arco lungo.'},
          {name:'Trucchetto', desc:'Conosci un trucchetto da mago, con Intelligenza.'},
          {name:'Lingua aggiuntiva', desc:'Conosci una lingua in più a tua scelta.'}
        ] }
    ] },
  { id:'halfling', name:'Halfling', speed:7.5, size:'Piccola',
    bonus:{ dex:2 },
    languages:['Comune','Halfling'],
    traits:[
      {name:'Fortunato', desc:'Quando ottieni 1 su un d20 per attacco, prova o TS, ritira il dado.'},
      {name:'Coraggioso', desc:'Vantaggio ai TS contro l\'essere spaventato.'},
      {name:'Agilità halfling', desc:'Puoi attraversare lo spazio di creature più grandi di te.'}
    ],
    subraces:[
      { id:'lightfoot', name:'Piedelesto', bonus:{ cha:1 },
        traits:[{name:'Furtivo per natura', desc:'Puoi nasconderti dietro una creatura più grande di te.'}] }
    ] },
  { id:'dragonborn', name:'Dragonide', speed:9, size:'Media',
    bonus:{ str:2, cha:1 },
    languages:['Comune','Draconico'],
    traits:[
      {name:'Antenato draconico', desc:'Scegli un tipo di drago: determina il tuo soffio e la resistenza.'},
      {name:'Soffio', desc:'Azione: cono o linea di danni, TS per dimezzare. Si ricarica con un riposo.'},
      {name:'Resistenza al danno', desc:'Resistenza al tipo di danno del tuo antenato.'}
    ],
    subraces:[] },
  { id:'gnome', name:'Gnomo', speed:7.5, size:'Piccola',
    bonus:{ int:2 },
    languages:['Comune','Gnomesco'],
    traits:[
      {name:'Scurovisione', desc:'Vedi al buio fino a 18 metri come se fosse penombra.'},
      {name:'Astuzia gnomesca', desc:'Vantaggio ai TS su Intelligenza, Saggezza e Carisma contro la magia.'}
    ],
    subraces:[
      { id:'rock-gnome', name:'Gnomo delle rocce', bonus:{ con:1 },
        traits:[
          {name:'Sapienza artigiana', desc:'Competenza raddoppiata su Storia riguardo a oggetti magici e congegni.'},
          {name:'Armeggiare', desc:'Competenza con gli arnesi da inventore: puoi costruire piccoli congegni.'}
        ] }
    ] },
  { id:'half-elf', name:'Mezzelfo', speed:9, size:'Media',
    bonus:{ cha:2 }, bonusChoice:{ count:2, amount:1, exclude:['cha'] },
    languages:['Comune','Elfico','una lingua a scelta'],
    traits:[
      {name:'Scurovisione', desc:'Vedi al buio fino a 18 metri come se fosse penombra.'},
      {name:'Retaggio fatato', desc:'Vantaggio contro l\'essere affascinato; la magia non ti fa addormentare.'},
      {name:'Versatilità', desc:'Competenza in due abilità a tua scelta.'}
    ],
    skillChoice:2, subraces:[] },
  { id:'half-orc', name:'Mezzorco', speed:9, size:'Media',
    bonus:{ str:2, con:1 },
    languages:['Comune','Orchesco'],
    traits:[
      {name:'Scurovisione', desc:'Vedi al buio fino a 18 metri come se fosse penombra.'},
      {name:'Minaccia implacabile', desc:'Competenza in Intimidire.'},
      {name:'Tenace', desc:'Quando scendi a 0 PF, resti invece a 1 PF (una volta per riposo lungo).'},
      {name:'Attacchi selvaggi', desc:'Sui colpi critici in mischia tiri un dado dei danni in più.'}
    ],
    grantSkills:['intimidation'], subraces:[] },
  { id:'tiefling', name:'Tiefling', speed:9, size:'Media',
    bonus:{ int:1, cha:2 },
    languages:['Comune','Infernale'],
    traits:[
      {name:'Scurovisione', desc:'Vedi al buio fino a 18 metri come se fosse penombra.'},
      {name:'Resistenza infernale', desc:'Resistenza ai danni da fuoco.'},
      {name:'Retaggio infernale', desc:'Trucchetto Taumaturgia; a livello 3 Rimprovero infernale, a 5 Oscurità, con Carisma.'}
    ],
    subraces:[] },
];

/* ─── BACKGROUND ─── */
const BACKGROUNDS_FULL = [
  { id:'acolyte', name:'Accolito', skills:['insight','religion'], languages:2, tools:'—',
    feature:'Rifugio dei fedeli', desc:'Tu e i tuoi compagni potete ricevere ospitalità gratuita nei templi della tua fede.',
    equipment:'Simbolo sacro, libro delle preghiere, 5 bastoncini d\'incenso, abito cerimoniale, abiti comuni, 15 mo' },
  { id:'charlatan', name:'Ciarlatano', skills:['deception','sleightOfHand'], languages:0, tools:'Kit da falsario, kit per travestimenti',
    feature:'Identità fasulla', desc:'Hai una seconda identità documentata e sai imitare la scrittura altrui.',
    equipment:'Abiti raffinati, kit per travestimenti, attrezzi da truffa, 15 mo' },
  { id:'criminal', name:'Criminale', skills:['deception','stealth'], languages:0, tools:'Un set da gioco, arnesi da scasso',
    feature:'Contatto criminale', desc:'Conosci un intermediario affidabile che ti mette in contatto con la malavita.',
    equipment:'Piede di porco, abiti scuri con cappuccio, 15 mo' },
  { id:'entertainer', name:'Intrattenitore', skills:['acrobatics','performance'], languages:0, tools:'Kit per travestimenti, uno strumento musicale',
    feature:'Richiesta a gran voce', desc:'Trovi sempre un posto dove esibirti, e in cambio vitto e alloggio.',
    equipment:'Uno strumento musicale, il dono di un ammiratore, costume, 15 mo' },
  { id:'folk-hero', name:'Eroe del popolo', skills:['animalHandling','survival'], languages:0, tools:'Un set da artigiano, veicoli terrestri',
    feature:'Ospitalità rustica', desc:'La gente comune ti nasconde e ti aiuta, se non rischia troppo.',
    equipment:'Set da artigiano, pala, pentola di ferro, abiti comuni, 10 mo' },
  { id:'guild-artisan', name:'Artigiano di gilda', skills:['insight','persuasion'], languages:1, tools:'Un set da artigiano',
    feature:'Appartenenza alla gilda', desc:'La gilda ti garantisce alloggio, aiuto legale e contatti nelle città.',
    equipment:'Set da artigiano, lettera di presentazione, abiti da viaggio, 15 mo' },
  { id:'hermit', name:'Eremita', skills:['medicine','religion'], languages:1, tools:'Kit da erborista',
    feature:'Scoperta', desc:'Nel tuo isolamento hai scoperto qualcosa di importante: un segreto, un luogo, una verità.',
    equipment:'Astuccio con appunti, coperta, abiti comuni, kit da erborista, 5 mo' },
  { id:'noble', name:'Nobile', skills:['history','persuasion'], languages:1, tools:'Un set da gioco',
    feature:'Posizione privilegiata', desc:'La gente ti tratta con riguardo e sei ricevuto dagli altri nobili.',
    equipment:'Abiti raffinati, anello con sigillo, pergamena del casato, 25 mo' },
  { id:'outlander', name:'Forestiero', skills:['athletics','survival'], languages:1, tools:'Uno strumento musicale',
    feature:'Viaggiatore', desc:'Ricordi la geografia dei luoghi che attraversi e trovi cibo e acqua per il gruppo.',
    equipment:'Bastone, trappola da caccia, trofeo di una bestia, abiti da viaggio, 10 mo' },
  { id:'sage', name:'Sapiente', skills:['arcana','history'], languages:2, tools:'—',
    feature:'Ricercatore', desc:'Se non conosci una risposta, sai dove e da chi si può ottenere.',
    equipment:'Boccetta d\'inchiostro, penna, coltellino, lettera di un collega, abiti comuni, 10 mo' },
  { id:'sailor', name:'Marinaio', skills:['athletics','perception'], languages:0, tools:'Strumenti da navigatore, veicoli acquatici',
    feature:'Passaggio in nave', desc:'Puoi ottenere un passaggio gratuito per te e i compagni, ricambiando con del lavoro.',
    equipment:'Manopola, corda di seta da 15 m, portafortuna, abiti comuni, 10 mo' },
  { id:'soldier', name:'Soldato', skills:['athletics','intimidation'], languages:0, tools:'Un set da gioco, veicoli terrestri',
    feature:'Grado militare', desc:'I soldati leali alla tua vecchia organizzazione riconoscono la tua autorità.',
    equipment:'Insegna di grado, trofeo di guerra, set da gioco, abiti comuni, 10 mo' },
  { id:'urchin', name:'Monello', skills:['sleightOfHand','stealth'], languages:0, tools:'Kit per travestimenti, arnesi da scasso',
    feature:'Segreti della città', desc:'In città ti muovi al doppio della velocità normale lungo scorciatoie che solo tu conosci.',
    equipment:'Coltellino, mappa della città, topolino, ricordo dei genitori, abiti comuni, 10 mo' },
];

/* ─── TABELLE DEGLI INCANTESIMI ───
   Trucchetti e incantesimi conosciuti per livello di personaggio.
*/
const CANTRIPS_KNOWN = {
  bard:      [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
  cleric:    [3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5],
  druid:     [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
  sorcerer:  [4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6],
  warlock:   [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
  wizard:    [3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5],
};
const SPELLS_KNOWN = {
  bard:     [4,5,6,7,8,9,10,11,12,14,15,15,16,18,19,19,20,22,22,22],
  sorcerer: [2,3,4,5,6,7,8,9,10,11,12,12,13,13,14,14,15,15,15,15],
  warlock:  [2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15],
  ranger:   [0,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11],
};
// Chi prepara gli incantesimi: quanti ne può preparare al giorno.
// Regola: modificatore + livello (metà livello per paladino e artificiere),
// con un minimo di uno. Il minimo si applica al totale, non al modificatore.
function preparedCount(classId, level, abilityMod){
  let n = 0;
  if (classId === 'wizard' || classId === 'cleric' || classId === 'druid') n = abilityMod + level;
  else if (classId === 'paladin' || classId === 'artificer') n = abilityMod + Math.floor(level/2);
  else return 0;
  return Math.max(1, n);
}

/* ─── CLASSI ───
   features: privilegi ottenuti a ogni livello, come [nome, descrizione breve].
   asi: livelli in cui ottieni un aumento dei punteggi di caratteristica.
*/
const CLASSES_FULL = [
{ id:'barbarian', name:'Barbaro', hitDie:12, saves:['str','con'],
  skillCount:2, skills:['animalHandling','athletics','intimidation','nature','perception','survival'],
  armor:'Armature leggere e medie, scudi', weapons:'Armi semplici e da guerra', tools:'—',
  caster:'none', asi:[4,8,12,16,19], subclassLevel:3, subclassLabel:'Cammino primordiale',
  features:{
    1:[['Ira','Azione bonus: bonus ai danni in mischia, vantaggio alle prove e ai TS di Forza, resistenza a contundenti, perforanti e taglienti. Alcuni usi per riposo lungo.'],
       ['Difesa senza armatura','Senza armatura la tua CA è 10 + modificatore di Destrezza + modificatore di Costituzione.']],
    2:[['Attacco temerario','Vantaggio agli attacchi in mischia con Forza, ma tutti hanno vantaggio contro di te fino al tuo turno.'],
       ['Percezione del pericolo','Vantaggio ai TS su Destrezza contro gli effetti che puoi vedere.']],
    5:[['Attacco extra','Attacchi due volte quando compi l\'azione di Attacco.'],['Movimento veloce','+3 metri di velocità senza armatura pesante.']],
    7:[['Istinto ferino','Vantaggio ai tiri di iniziativa; puoi agire di sorpresa se entri subito in ira.']],
    9:[['Critico brutale','Su un critico in mischia tiri un dado dei danni aggiuntivo.']],
    11:[['Ira implacabile','Se scendi a 0 PF durante l\'ira puoi restare a 1 PF con un TS su Costituzione.']],
    13:[['Critico brutale (2 dadi)','Due dadi dei danni aggiuntivi sui critici in mischia.']],
    15:[['Ira persistente','La tua ira finisce solo se sei privo di sensi o se decidi tu.']],
    17:[['Critico brutale (3 dadi)','Tre dadi dei danni aggiuntivi sui critici in mischia.']],
    18:[['Forza indomabile','Se il risultato di una prova di Forza è inferiore al tuo punteggio di Forza, usa il punteggio.']],
    20:[['Campione primordiale','Forza e Costituzione aumentano di 4, fino a un massimo di 24.']]
  },
  subclasses:[{ id:'berserker', name:'Cammino del Berserker', features:{
    3:[['Frenesia','Durante l\'ira puoi attaccare con un\'arma come azione bonus a ogni turno, al prezzo di un livello di sfinimento.']],
    6:[['Ira folle','Non puoi essere affascinato o spaventato mentre sei in ira.']],
    10:[['Presenza intimidatoria','Azione: spaventi una creatura con un TS su Saggezza contro la tua CD.']],
    14:[['Rappresaglia','Reazione: attacchi in mischia chi ti ha ferito.']]
  }}]
},
{ id:'bard', name:'Bardo', hitDie:8, saves:['dex','cha'],
  skillCount:3, skills:'any',
  armor:'Armature leggere', weapons:'Armi semplici, balestre a mano, spade corte e lunghe, stocchi', tools:'Tre strumenti musicali a scelta',
  caster:'full', spellAbility:'cha', spellType:'known', asi:[4,8,12,16,19], subclassLevel:3, subclassLabel:'Collegio bardico',
  features:{
    1:[['Ispirazione bardica (d6)','Azione bonus: dai a un alleato un dado da aggiungere a una prova, un attacco o un TS.'],
       ['Incantesimi','Lanci incantesimi da bardo usando il Carisma.']],
    2:[['Tuttofare','Aggiungi metà del bonus di competenza alle prove in cui non sei competente.'],
       ['Canzone di riposo (d6)','Durante un riposo breve chi ti ascolta recupera PF extra.']],
    3:[['Competenza','Competenza raddoppiata in due abilità a tua scelta.']],
    5:[['Ispirazione bardica (d8)','Il dado sale a d8.'],['Fonte di ispirazione','Recuperi gli usi di Ispirazione con un riposo breve.']],
    6:[['Contro-fascino','Azione: tu e gli alleati vicini ottenete vantaggio contro l\'essere affascinati o spaventati.']],
    9:[['Canzone di riposo (d8)','Il dado di cura sale a d8.']],
    10:[['Ispirazione bardica (d10)','Il dado sale a d10.'],['Segreti magici','Impari due incantesimi da qualsiasi lista.'],['Competenza','Altre due abilità con competenza raddoppiata.']],
    13:[['Canzone di riposo (d10)','Il dado di cura sale a d10.']],
    14:[['Segreti magici','Altri due incantesimi da qualsiasi lista.']],
    15:[['Ispirazione bardica (d12)','Il dado sale a d12.']],
    17:[['Canzone di riposo (d12)','Il dado di cura sale a d12.']],
    18:[['Segreti magici','Altri due incantesimi da qualsiasi lista.']],
    20:[['Ispirazione superiore','Recuperi un uso di Ispirazione quando tiri l\'iniziativa senza averne.']]
  },
  subclasses:[{ id:'lore', name:'Collegio del Sapere', features:{
    3:[['Competenze bonus','Competenza in tre abilità a tua scelta.'],['Parole taglienti','Reazione: spendi un\'Ispirazione per sottrarre il dado a un attacco o a una prova nemica.']],
    6:[['Segreti magici aggiuntivi','Impari due incantesimi da qualsiasi lista, in anticipo.']],
    14:[['Abilità impareggiabile','Puoi spendere un\'Ispirazione per aggiungere il dado a una tua prova di caratteristica.']]
  }}]
},
{ id:'cleric', name:'Chierico', hitDie:8, saves:['wis','cha'],
  skillCount:2, skills:['history','insight','medicine','persuasion','religion'],
  armor:'Armature leggere e medie, scudi', weapons:'Armi semplici', tools:'—',
  caster:'full', spellAbility:'wis', spellType:'prepared', asi:[4,8,12,16,19], subclassLevel:1, subclassLabel:'Dominio divino',
  features:{
    1:[['Incantesimi','Prepari incantesimi da chierico usando la Saggezza.'],['Dominio divino','Scegli il dominio della tua divinità.']],
    2:[['Incanalare divinità','Un uso per riposo breve o lungo, fra Scacciare non morti e i poteri del dominio.']],
    5:[['Distruggere non morti (GS 1/2)','I non morti deboli che scacci vengono distrutti.']],
    6:[['Incanalare divinità (2 usi)','Due usi fra un riposo e l\'altro.']],
    8:[['Distruggere non morti (GS 1)','Soglia di distruzione più alta.']],
    10:[['Intervento divino','Puoi invocare l\'aiuto della tua divinità: riesce con una probabilità pari al tuo livello.']],
    11:[['Distruggere non morti (GS 2)','Soglia di distruzione più alta.']],
    14:[['Distruggere non morti (GS 3)','Soglia di distruzione più alta.']],
    17:[['Distruggere non morti (GS 4)','Soglia di distruzione più alta.']],
    18:[['Incanalare divinità (3 usi)','Tre usi fra un riposo e l\'altro.']],
    20:[['Intervento divino migliorato','L\'intervento divino riesce automaticamente.']]
  },
  subclasses:[{ id:'life', name:'Dominio della Vita', features:{
    1:[['Competenza bonus','Competenza con le armature pesanti.'],['Discepolo della vita','Le tue cure ripristinano 2 + livello dell\'incantesimo PF in più.']],
    2:[['Incanalare divinità: Preservare la vita','Distribuisci cinque volte il tuo livello in PF fra le creature vicine.']],
    6:[['Guaritore benedetto','Quando curi qualcun altro, recuperi anche tu 2 + livello dell\'incantesimo PF.']],
    8:[['Colpo divino','Una volta per turno aggiungi 1d8 danni radiosi a un attacco con arma.']],
    17:[['Guarigione suprema','Le tue cure ripristinano sempre il massimo dei dadi.']]
  }}]
},
{ id:'druid', name:'Druido', hitDie:8, saves:['int','wis'],
  skillCount:2, skills:['arcana','animalHandling','insight','medicine','nature','perception','religion','survival'],
  armor:'Armature leggere e medie, scudi (non di metallo)', weapons:'Clave, pugnali, dardi, giavellotti, mazze, bastoni ferrati, scimitarre, falcetti, fionde, lance', tools:'Kit da erborista',
  caster:'full', spellAbility:'wis', spellType:'prepared', asi:[4,8,12,16,19], subclassLevel:2, subclassLabel:'Circolo druidico',
  features:{
    1:[['Druidico','Conosci la lingua segreta dei druidi.'],['Incantesimi','Prepari incantesimi da druido usando la Saggezza.']],
    2:[['Forma selvatica','Azione: ti trasformi in una bestia che hai già visto, due volte per riposo.'],['Circolo druidico','Scegli il tuo circolo.']],
    18:[['Incantesimi senza tempo','Puoi lanciare alcuni incantesimi senza componenti verbali o somatiche.'],['Forme bestiali','La forma selvatica diventa illimitata.']],
    20:[['Arcidruido','Forma selvatica illimitata e incantesimi senza componenti materiali non costose.']]
  },
  subclasses:[{ id:'land', name:'Circolo della Terra', features:{
    2:[['Trucchetto bonus','Impari un trucchetto da druido in più.'],['Ricreazione naturale','Con un riposo breve recuperi slot pari a metà del tuo livello.']],
    3:[['Incantesimi del circolo','Incantesimi aggiuntivi legati al terreno che hai scelto, sempre preparati.']],
    6:[['Falcata terrestre','Il terreno difficile magico non ti rallenta e resisti agli incantesimi che ostacolano il movimento.']],
    10:[['Difesa naturale','Immune a veleno e malattie, non hai bisogno di cibo o aria e non puoi essere affascinato o spaventato dai folletti.']],
    14:[['Santuario della natura','Le bestie e i vegetali devono superare un TS per attaccarti.']]
  }}]
},
{ id:'fighter', name:'Guerriero', hitDie:10, saves:['str','con'],
  skillCount:2, skills:['acrobatics','animalHandling','athletics','history','insight','intimidation','perception','survival'],
  armor:'Tutte le armature, scudi', weapons:'Armi semplici e da guerra', tools:'—',
  caster:'none', asi:[4,6,8,12,14,16,19], subclassLevel:3, subclassLabel:'Archetipo marziale',
  features:{
    1:[['Stile di combattimento','Scegli uno stile: arcieria, difesa, duellare, combattere con due armi, protezione, armi grandi.'],
       ['Recuperare energie','Azione bonus: recuperi 1d10 + livello PF, una volta per riposo.']],
    2:[['Azione impetuosa','Un\'azione aggiuntiva nel tuo turno, una volta per riposo.']],
    5:[['Attacco extra','Attacchi due volte quando compi l\'azione di Attacco.']],
    9:[['Indomito','Puoi ripetere un tiro salvezza fallito, una volta per riposo lungo.']],
    11:[['Attacco extra (2)','Attacchi tre volte.']],
    13:[['Indomito (2 usi)','Due ripetizioni per riposo lungo.']],
    17:[['Azione impetuosa (2 usi)','Due usi per riposo.'],['Indomito (3 usi)','Tre ripetizioni per riposo lungo.']],
    20:[['Attacco extra (3)','Attacchi quattro volte.']]
  },
  subclasses:[{ id:'champion', name:'Campione', features:{
    3:[['Critico migliorato','Metti a segno un critico con 19 o 20.']],
    7:[['Atleta straordinario','Metà competenza alle prove fisiche e salti in lungo più ampi.']],
    10:[['Stile di combattimento aggiuntivo','Un secondo stile di combattimento.']],
    15:[['Critico superiore','Critico con 18, 19 o 20.']],
    18:[['Sopravvissuto','All\'inizio del turno recuperi PF se sei sotto metà dei tuoi punti ferita.']]
  }}]
},
{ id:'monk', name:'Monaco', hitDie:8, saves:['str','dex'],
  skillCount:2, skills:['acrobatics','athletics','history','insight','religion','stealth'],
  armor:'Nessuna', weapons:'Armi semplici, spade corte', tools:'Un set da artigiano o uno strumento musicale',
  caster:'none', asi:[4,8,12,16,19], subclassLevel:3, subclassLabel:'Tradizione monastica',
  features:{
    1:[['Difesa senza armatura','Senza armatura né scudo la tua CA è 10 + Destrezza + Saggezza.'],
       ['Arti marziali','Colpi senza armi e armi da monaco usano la Destrezza e infliggono un dado crescente; colpo bonus dopo l\'attacco.']],
    2:[['Ki','Punti ki pari al tuo livello: Raffica di colpi, Difesa paziente, Passo del vento.'],['Movimento senza armatura','+3 metri di velocità senza armatura.']],
    3:[['Deviare i proiettili','Reazione: riduci i danni degli attacchi a distanza e puoi rilanciare il proiettile.']],
    4:[['Caduta lenta','Reazione: riduci i danni da caduta di cinque volte il tuo livello.']],
    5:[['Attacco extra','Attacchi due volte.'],['Colpo stordente','1 ki: la creatura colpita deve superare un TS su Costituzione o resta stordita.']],
    6:[['Colpi di ki potenziati','I tuoi colpi senza armi contano come magici.']],
    7:[['Evasione','Nessun danno sui TS su Destrezza riusciti, metà se falliti.'],['Quiete mentale','Ti liberi da affascinato e spaventato con un\'azione.']],
    10:[['Purezza del corpo','Immune a veleno e malattie.']],
    13:[['Lingua del sole e della luna','Comprendi e ti fai capire da qualsiasi creatura che parli una lingua.']],
    14:[['Anima di diamante','Competenza in tutti i tiri salvezza; puoi ripeterne uno spendendo 1 ki.']],
    15:[['Corpo senza tempo','Non invecchi e non hai bisogno di cibo o acqua.']],
    18:[['Corpo vuoto','4 ki per diventare invisibile e resistente a tutto tranne la forza; 8 ki per proiezione astrale.']],
    20:[['Perfezione interiore','Recuperi 4 punti ki quando tiri l\'iniziativa senza averne.']]
  },
  subclasses:[{ id:'open-hand', name:'Via della Mano Aperta', features:{
    3:[['Tecnica della mano aperta','Con la Raffica di colpi puoi far cadere prono, spingere o impedire reazioni.']],
    6:[['Guarigione totale','Azione: recuperi PF pari a tre volte il tuo livello, una volta per riposo lungo.']],
    11:[['Tranquillità','Alla fine di un riposo lungo sei protetto come da un incantesimo di santuario.']],
    17:[['Palmo vibrante','3 ki: colpo che può ridurre a 0 PF una creatura entro alcuni giorni.']]
  }}]
},
{ id:'paladin', name:'Paladino', hitDie:10, saves:['wis','cha'],
  skillCount:2, skills:['athletics','insight','intimidation','medicine','persuasion','religion'],
  armor:'Tutte le armature, scudi', weapons:'Armi semplici e da guerra', tools:'—',
  caster:'half', spellAbility:'cha', spellType:'prepared', asi:[4,8,12,16,19], subclassLevel:3, subclassLabel:'Giuramento sacro',
  features:{
    1:[['Percezione divina','Azione: individui celestiali, immondi e non morti entro 18 metri.'],
       ['Imposizione delle mani','Riserva di cure pari a cinque volte il tuo livello, distribuibile a contatto.']],
    2:[['Stile di combattimento','Scegli uno stile di combattimento.'],['Incantesimi','Prepari incantesimi da paladino usando il Carisma.'],
       ['Punizione divina','Spendi uno slot per aggiungere 2d8 danni radiosi a un colpo in mischia (+1d8 per livello di slot).']],
    3:[['Salute divina','Sei immune alle malattie.'],['Giuramento sacro','Pronunci il tuo giuramento e ottieni i suoi incantesimi.']],
    5:[['Attacco extra','Attacchi due volte.']],
    6:[['Aura di protezione','Tu e gli alleati entro 3 metri aggiungete il modificatore di Carisma ai TS.']],
    10:[['Aura di coraggio','Tu e gli alleati vicini non potete essere spaventati.']],
    11:[['Punizione divina migliorata','I colpi in mischia infliggono 1d8 danni radiosi in più.']],
    14:[['Tocco purificatore','Puoi annullare incantesimi su di te o su altri, alcune volte per riposo lungo.']],
    18:[['Aure migliorate','Le tue aure arrivano a 9 metri.']]
  },
  subclasses:[{ id:'devotion', name:'Giuramento di Devozione', features:{
    3:[['Incanalare divinità: Arma sacra','Aggiungi il Carisma agli attacchi con un\'arma, che diventa magica e luminosa.'],
       ['Incanalare divinità: Scacciare l\'empio','Immondi e non morti vicini devono fuggire da te.']],
    7:[['Aura di devozione','Tu e gli alleati vicini non potete essere affascinati.']],
    15:[['Purezza di spirito','Sei sempre sotto gli effetti di protezione dal bene e dal male.']],
    20:[['Nimbo sacro','Emani luce solare e danneggi chi inizia il turno vicino a te; vantaggio contro gli incantesimi di immondi e non morti.']]
  }}]
},
{ id:'ranger', name:'Ranger', hitDie:10, saves:['str','dex'],
  skillCount:3, skills:['animalHandling','athletics','insight','investigation','nature','perception','stealth','survival'],
  armor:'Armature leggere e medie, scudi', weapons:'Armi semplici e da guerra', tools:'—',
  caster:'half', spellAbility:'wis', spellType:'known', asi:[4,8,12,16,19], subclassLevel:3, subclassLabel:'Archetipo del ranger',
  features:{
    1:[['Nemico prescelto','Scegli un tipo di creatura: vantaggio a seguirne le tracce e a ricordarne le informazioni.'],
       ['Esploratore naturale','Scegli un tipo di terreno: ti muovi e ti orienti in modo eccellente.']],
    2:[['Stile di combattimento','Scegli uno stile di combattimento.'],['Incantesimi','Conosci incantesimi da ranger, con la Saggezza.']],
    3:[['Consapevolezza primordiale','Puoi spendere uno slot per percepire i tipi di creature nei dintorni.'],['Archetipo del ranger','Scegli il tuo archetipo.']],
    5:[['Attacco extra','Attacchi due volte.']],
    8:[['Camminata nella terra','Il terreno difficile non magico non ti rallenta.']],
    10:[['Nascondersi in piena vista','Con un minuto di preparazione ottieni +10 a nasconderti restando immobile.']],
    14:[['Sparire','Azione bonus: ti nascondi; non puoi essere trovato tramite tracce non magiche.']],
    18:[['Sensi ferini','Percepisci le creature invisibili entro 9 metri.']],
    20:[['Nemico giurato','Le prove contro il tuo nemico prescelto sono infallibili e infliggi danni extra.']]
  },
  subclasses:[{ id:'hunter', name:'Cacciatore', features:{
    3:[['Preda del cacciatore','Scegli: Uccisore di colossi, Distruttore di giganti o Sterminatore di orde.']],
    7:[['Tattiche di difesa','Scegli: Difesa dalle bestie, Attacco multiplo o Riflessi sfuggenti.']],
    11:[['Attacchi multipli','Scegli: Raffica o Turbine di acciaio.']],
    15:[['Superiorità difensiva','Scegli: Schivare, Fuggire o Attaccare come reazione quando sei mancato.']]
  }}]
},
{ id:'rogue', name:'Ladro', hitDie:8, saves:['dex','int'],
  skillCount:4, skills:['acrobatics','athletics','deception','insight','intimidation','investigation','perception','performance','persuasion','sleightOfHand','stealth'],
  armor:'Armature leggere', weapons:'Armi semplici, balestre a mano, spade lunghe, stocchi, spade corte', tools:'Arnesi da scasso',
  caster:'none', asi:[4,8,10,12,16,19], subclassLevel:3, subclassLabel:'Archetipo ladresco',
  features:{
    1:[['Attacco furtivo (1d6)','Danni extra una volta per turno se hai vantaggio o un alleato è adiacente al bersaglio.'],
       ['Competenza','Competenza raddoppiata in due abilità (o arnesi da scasso).'],
       ['Gergo dei ladri','Un codice segreto compreso solo dai criminali.']],
    2:[['Azione astuta','Azione bonus per Scattare, Disimpegnarsi o Nascondersi.']],
    3:[['Archetipo ladresco','Scegli la tua specializzazione.']],
    5:[['Schivata prodigiosa','Reazione: dimezzi i danni di un attacco che ti colpisce.']],
    6:[['Competenza','Altre due abilità con competenza raddoppiata.']],
    7:[['Elusione','Nessun danno sui TS su Destrezza riusciti, metà se falliti.']],
    11:[['Talento affidabile','Su ogni prova in cui sei competente, i risultati sotto 10 contano come 10.']],
    14:[['Percezione cieca','Percepisci le creature nascoste o invisibili entro 3 metri.']],
    15:[['Mente sfuggente','Competenza nei TS su Saggezza.']],
    18:[['Inafferrabile','Nessuno ha mai vantaggio negli attacchi contro di te se non sei incapacitato.']],
    20:[['Colpo di fortuna','Trasformi un fallimento in successo, una volta per riposo lungo.']]
  },
  subclasses:[{ id:'thief', name:'Ladro', features:{
    3:[['Mani veloci','Con l\'Azione astuta puoi anche rubare, usare oggetti o scassinare.'],
       ['Lavoro in secondo piano','Ti arrampichi e ti muovi in città con più efficacia.']],
    9:[['Scalatore straordinario','Ti arrampichi senza dimezzare la velocità e salti più lontano dopo una rincorsa.']],
    13:[['Usare oggetti magici','Ignori tutti i requisiti di classe, razza e livello degli oggetti magici.']],
    17:[['Riflessi da ladro','Due turni nel primo round di combattimento.']]
  }}]
},
{ id:'sorcerer', name:'Stregone', hitDie:6, saves:['con','cha'],
  skillCount:2, skills:['arcana','deception','insight','intimidation','persuasion','religion'],
  armor:'Nessuna', weapons:'Pugnali, dardi, fionde, bastoni ferrati, balestre leggere', tools:'—',
  caster:'full', spellAbility:'cha', spellType:'known', asi:[4,8,12,16,19], subclassLevel:1, subclassLabel:'Origine stregonesca',
  features:{
    1:[['Origine stregonesca','La fonte della tua magia innata.'],['Incantesimi','Conosci incantesimi da stregone, con il Carisma.']],
    2:[['Fonte di magia','Punti stregoneria pari al livello: puoi convertirli in slot e viceversa.']],
    3:[['Metamagia','Due modi per piegare i tuoi incantesimi (accelerato, gemello, sottile, potenziato…).']],
    10:[['Metamagia (3)','Una terza opzione di metamagia.']],
    17:[['Metamagia (4)','Una quarta opzione di metamagia.']],
    20:[['Ripristino stregonesco','Recuperi 4 punti stregoneria con un riposo breve.']]
  },
  subclasses:[{ id:'draconic', name:'Discendenza Draconica', features:{
    1:[['Antenato draconico','Scegli un tipo di drago: parli draconico e sei più convincente con i draghi.'],
       ['Resilienza draconica','+1 PF per livello e, senza armatura, CA 13 + Destrezza.']],
    6:[['Affinità elementale','Aggiungi il Carisma ai danni del tuo elemento; puoi ottenerne resistenza.']],
    14:[['Ali del drago','Azione bonus: ali che ti danno velocità di volo pari a quella di terra.']],
    18:[['Presenza draconica','Aura di 18 metri che rende gli altri affascinati o spaventati.']]
  }}]
},
{ id:'warlock', name:'Warlock', hitDie:8, saves:['wis','cha'],
  skillCount:2, skills:['arcana','deception','history','intimidation','investigation','nature','religion'],
  armor:'Armature leggere', weapons:'Armi semplici', tools:'—',
  caster:'pact', spellAbility:'cha', spellType:'known', asi:[4,8,12,16,19], subclassLevel:1, subclassLabel:'Patrono ultraterreno',
  features:{
    1:[['Patrono ultraterreno','L\'entità con cui hai stretto il patto.'],['Magia del patto','Pochi slot, sempre del livello più alto, che recuperi con un riposo breve.']],
    2:[['Suppliche occulte','Due poteri permanenti a scelta; ne ottieni altri crescendo di livello.']],
    3:[['Dono del patto','Catena, Lama o Tomo: il dono del tuo patrono.']],
    11:[['Arcanum mistico (6°)','Un incantesimo di 6° livello lanciabile una volta per riposo lungo.']],
    13:[['Arcanum mistico (7°)','Un incantesimo di 7° livello, una volta per riposo lungo.']],
    15:[['Arcanum mistico (8°)','Un incantesimo di 8° livello, una volta per riposo lungo.']],
    17:[['Arcanum mistico (9°)','Un incantesimo di 9° livello, una volta per riposo lungo.']],
    20:[['Maestro occulto','Con un minuto di preghiera recuperi tutti gli slot del patto, una volta per riposo lungo.']]
  },
  subclasses:[{ id:'fiend', name:'L\'Immondo', features:{
    1:[['Benedizione dell\'oscuro','Quando riduci una creatura a 0 PF ottieni PF temporanei pari al Carisma + livello.']],
    6:[['Resistenza dell\'oscuro','Scegli un tipo di danno: ne ottieni resistenza.']],
    10:[['Elargizione dell\'oscuro','Vantaggio ai TS contro incantesimi ed effetti magici.']],
    14:[['Scagliare nell\'inferno','Trasporti una creatura in un piano infernale per un istante: 10d10 danni psichici.']]
  }}]
},
{ id:'wizard', name:'Mago', hitDie:6, saves:['int','wis'],
  skillCount:2, skills:['arcana','history','insight','investigation','medicine','religion'],
  armor:'Nessuna', weapons:'Pugnali, dardi, fionde, bastoni ferrati, balestre leggere', tools:'—',
  caster:'full', spellAbility:'int', spellType:'book', asi:[4,8,12,16,19], subclassLevel:2, subclassLabel:'Tradizione arcana',
  features:{
    1:[['Incantesimi','Prepari incantesimi dal tuo libro, usando l\'Intelligenza.'],
       ['Recupero arcano','Con un riposo breve recuperi slot pari a metà del tuo livello, una volta al giorno.']],
    2:[['Tradizione arcana','La scuola di magia in cui ti specializzi.']],
    18:[['Padronanza degli incantesimi','Un incantesimo di 1° e uno di 2° livello lanciabili a volontà.']],
    20:[['Incantesimi personalizzati','Due incantesimi di 3° livello o inferiore che puoi lanciare senza spendere slot, una volta per riposo lungo.']]
  },
  subclasses:[{ id:'evocation', name:'Scuola di Evocazione', features:{
    2:[['Studioso di evocazione','Copiare incantesimi di evocazione nel libro costa metà tempo e denaro.'],
       ['Modellare incantesimi','I tuoi alleati nelle aree dei tuoi incantesimi da evocazione sono protetti.']],
    6:[['Trucchetto potente','I trucchetti infliggono comunque metà danni quando il bersaglio supera il TS.']],
    10:[['Evocazione potenziata','Aggiungi il modificatore di Intelligenza ai danni degli incantesimi da evocazione.']],
    14:[['Sovraccarico','Massimizzi i danni di un incantesimo da evocazione di 5° livello o inferiore, a costo di danni a te stesso.']]
  }}]
},
];
const CLASS_BY_ID = Object.fromEntries(CLASSES_FULL.map(c => [c.id, c]));
const RACE_BY_ID = Object.fromEntries(RACES.map(r => [r.id, r]));
