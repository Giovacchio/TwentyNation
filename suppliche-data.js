/* TwentyNation — Suppliche occulte e incantesimi da sottoclasse
   ═══════════════════════════════════════════════════════════════
   SOLO contenuto del System Reference Document 5.1 (Wizards of the
   Coast, Open Gaming License 1.0a). Le suppliche che stanno solo sul
   Manuale del Giocatore NON sono qui e non ci finiranno: chi possiede
   il manuale se le carica nel proprio account con l'importazione, e
   restano sue. Possedere il libro dà il diritto di usarlo, non di
   ripubblicarlo.

   I testi sono riscritti in italiano: sono le REGOLE (aperte
   dall'OGL), non la prosa del manuale.
   ─────────────────────────────────────────────────────────────── */

/* Quante suppliche conosce un warlock al suo livello (SRD). */
const SUPPLICHE_PER_LIVELLO = [0,0,2,2,2,3,3,4,4,5,5,5,6,6,6,7,7,7,8,8,8];
function quanteSuppliche(livello){
  return SUPPLICHE_PER_LIVELLO[Math.max(0, Math.min(20, Number(livello) || 0))] || 0;
}

/* ─── Come si scrive un effetto ───────────────────────────────────
   tipo:'incantesimo'  id, quando: 'volonta' | 'riposoLungo' | 'riposoBreve'
                       livello: a che livello lo lanci (se fisso)
   tipo:'trucchetto'   id — un trucchetto in più che conosci
   tipo:'danno'        a:'eldritch-blast', agg:'car' — somma una caratteristica
   tipo:'gittata'      a:'eldritch-blast', metri
   tipo:'raggi'        a:'eldritch-blast', spinta — spinge il bersaglio
   tipo:'senso'        testo — scurovisione, vedere l'invisibile…
   tipo:'competenza'   abilita:[chiavi]
   tipo:'nota'         testo — quando non è nessuna delle altre
   ──────────────────────────────────────────────────────────────── */

const SUPPLICHE_SRD = [
  { id:'agonizing-blast', nome:'Raggio agonizzante', en:'Agonizing Blast',
    req:{ trucchetto:'eldritch-blast' },
    testo:'Quando lanci raggio occulto, aggiungi il modificatore di Carisma ai danni che infligge.',
    effetti:[{ tipo:'danno', a:'eldritch-blast', agg:'cha' }] },
  { id:'armor-of-shadows', nome:'Armatura di ombre', en:'Armor of Shadows',
    testo:'Puoi lanciare armatura magica su te stesso a volontà, senza spendere slot né componenti materiali.',
    effetti:[{ tipo:'incantesimo', id:'mage-armor', quando:'volonta', soloSuDiTe:true }] },
  { id:'ascendant-step', nome:'Passo ascendente', en:'Ascendant Step',
    req:{ livello:9 },
    testo:'Puoi lanciare levitazione su te stesso a volontà, senza spendere slot né componenti materiali.',
    effetti:[{ tipo:'incantesimo', id:'levitate', quando:'volonta', soloSuDiTe:true }] },
  { id:'beast-speech', nome:'Linguaggio delle bestie', en:'Beast Speech',
    testo:'Puoi lanciare parlare con gli animali a volontà, senza spendere slot.',
    effetti:[{ tipo:'incantesimo', id:'speak-with-animals', quando:'volonta' }] },
  { id:'beguiling-influence', nome:'Influenza ammaliante', en:'Beguiling Influence',
    testo:'Ottieni competenza nelle abilità Inganno e Persuasione.',
    effetti:[{ tipo:'competenza', abilita:['deception','persuasion'] }] },
  { id:'bewitching-whispers', nome:'Sussurri stregati', en:'Bewitching Whispers',
    req:{ livello:7 },
    testo:'Puoi lanciare confusione una volta per riposo lungo, usando uno slot del patto.',
    effetti:[{ tipo:'incantesimo', id:'confusion', quando:'riposoLungo' }] },
  { id:'book-of-ancient-secrets', nome:'Libro dei segreti antichi', en:'Book of Ancient Secrets',
    req:{ patto:'tome' },
    testo:'Sul tuo Libro delle Ombre trascrivi due rituali di 1° livello, da qualsiasi lista. Puoi lanciarli come rituali, e aggiungerne altri trovati in giro.',
    effetti:[{ tipo:'nota', testo:'Rituali sul Libro delle Ombre: puoi lanciarli come rituali senza conoscerli.' }] },
  { id:'chains-of-carceri', nome:'Catene di Carceri', en:'Chains of Carceri',
    req:{ livello:15, patto:'chain' },
    testo:'Puoi lanciare immobilizzare mostri a volontà contro celestiali, immondi ed elementali, senza spendere slot. Sulla stessa creatura solo una volta per riposo lungo.',
    effetti:[{ tipo:'incantesimo', id:'hold-monster', quando:'volonta' }] },
  { id:'devils-sight', nome:'Vista del diavolo', en:"Devil's Sight",
    testo:'Vedi normalmente nell\'oscurità, magica e non, fino a 36 metri.',
    effetti:[{ tipo:'senso', testo:'Vedi nell\'oscurità (anche magica) fino a 36 m' }] },
  { id:'dreadful-word', nome:'Parola tremenda', en:'Dreadful Word',
    req:{ livello:7 },
    testo:'Puoi lanciare confusione una volta per riposo lungo, usando uno slot del patto.',
    effetti:[{ tipo:'incantesimo', id:'confusion', quando:'riposoLungo' }] },
  { id:'eldritch-sight', nome:'Vista occulta', en:'Eldritch Sight',
    testo:'Puoi lanciare individuazione del magico a volontà, senza spendere slot.',
    effetti:[{ tipo:'incantesimo', id:'detect-magic', quando:'volonta' }] },
  { id:'eldritch-spear', nome:'Lancia occulta', en:'Eldritch Spear',
    req:{ trucchetto:'eldritch-blast' },
    testo:'La gittata di raggio occulto sale a 90 metri.',
    effetti:[{ tipo:'gittata', a:'eldritch-blast', metri:90 }] },
  { id:'eyes-of-the-rune-keeper', nome:'Occhi del custode delle rune', en:'Eyes of the Rune Keeper',
    testo:'Sai leggere qualsiasi scrittura.',
    effetti:[{ tipo:'nota', testo:'Leggi qualsiasi scrittura, in qualunque lingua.' }] },
  { id:'fiendish-vigor', nome:'Vigore immondo', en:'Fiendish Vigor',
    testo:'Puoi lanciare falsa vita su te stesso a volontà, al 1° livello, senza spendere slot.',
    effetti:[{ tipo:'incantesimo', id:'false-life', quando:'volonta', livello:1, soloSuDiTe:true }] },
  { id:'gaze-of-two-minds', nome:'Sguardo delle due menti', en:'Gaze of Two Minds',
    testo:'Con un\'azione tocchi un umanoide consenziente e percepisci quello che percepisce lui finché resta sul tuo piano, fino alla fine del tuo turno successivo.',
    effetti:[{ tipo:'nota', testo:'Azione: percepisci attraverso i sensi di un umanoide consenziente che tocchi.' }] },
  { id:'lifedrinker', nome:'Bevitore di vita', en:'Lifedrinker',
    req:{ livello:12, patto:'blade' },
    testo:'Quando colpisci con l\'arma del patto, la creatura subisce danni necrotici aggiuntivi pari al tuo modificatore di Carisma (minimo 1).',
    effetti:[{ tipo:'danno', a:'arma-del-patto', agg:'cha', tipoDanno:'necrotici', minimo:1 }] },
  { id:'mask-of-many-faces', nome:'Maschera dai molti volti', en:'Mask of Many Faces',
    testo:'Puoi lanciare camuffare se stesso a volontà, senza spendere slot.',
    effetti:[{ tipo:'incantesimo', id:'disguise-self', quando:'volonta' }] },
  { id:'master-of-myriad-forms', nome:'Padrone delle mille forme', en:'Master of Myriad Forms',
    req:{ livello:15 },
    testo:'Puoi lanciare alterare se stesso a volontà, senza spendere slot.',
    effetti:[{ tipo:'incantesimo', id:'alter-self', quando:'volonta' }] },
  { id:'minions-of-chaos', nome:'Servitori del caos', en:'Minions of Chaos',
    req:{ livello:9 },
    testo:'Puoi lanciare evocare elementale una volta per riposo lungo, usando uno slot del patto.',
    effetti:[{ tipo:'incantesimo', id:'conjure-elemental', quando:'riposoLungo' }] },
  { id:'mire-the-mind', nome:'Impantanare la mente', en:'Mire the Mind',
    req:{ livello:5 },
    testo:'Puoi lanciare lentezza una volta per riposo lungo, usando uno slot del patto.',
    effetti:[{ tipo:'incantesimo', id:'slow', quando:'riposoLungo' }] },
  { id:'misty-visions', nome:'Visioni nebbiose', en:'Misty Visions',
    testo:'Puoi lanciare immagine silenziosa a volontà, senza spendere slot né componenti materiali.',
    effetti:[{ tipo:'incantesimo', id:'silent-image', quando:'volonta' }] },
  { id:'one-with-shadows', nome:'Tutt\'uno con le ombre', en:'One with Shadows',
    req:{ livello:5 },
    testo:'In penombra o oscurità puoi diventare invisibile con un\'azione, finché non ti muovi o compi un\'azione.',
    effetti:[{ tipo:'nota', testo:'Azione, in penombra o oscurità: invisibile finché non ti muovi o agisci.' }] },
  { id:'otherworldly-leap', nome:'Balzo ultraterreno', en:'Otherworldly Leap',
    req:{ livello:9 },
    testo:'Puoi lanciare salto su te stesso a volontà, senza spendere slot né componenti materiali.',
    effetti:[{ tipo:'incantesimo', id:'jump', quando:'volonta', soloSuDiTe:true }] },
  { id:'repelling-blast', nome:'Raggio respingente', en:'Repelling Blast',
    req:{ trucchetto:'eldritch-blast' },
    testo:'Quando colpisci una creatura con raggio occulto, puoi spingerla di 3 metri in linea retta.',
    effetti:[{ tipo:'raggi', a:'eldritch-blast', spinta:3 }] },
  { id:'sculptor-of-flesh', nome:'Scultore di carne', en:'Sculptor of Flesh',
    req:{ livello:7 },
    testo:'Puoi lanciare metamorfosi una volta per riposo lungo, usando uno slot del patto.',
    effetti:[{ tipo:'incantesimo', id:'polymorph', quando:'riposoLungo' }] },
  { id:'sign-of-ill-omen', nome:'Segno del malaugurio', en:'Sign of Ill Omen',
    req:{ livello:5 },
    testo:'Puoi lanciare maledizione una volta per riposo lungo, usando uno slot del patto.',
    effetti:[{ tipo:'incantesimo', id:'bestow-curse', quando:'riposoLungo' }] },
  { id:'thief-of-five-fates', nome:'Ladro dei cinque fati', en:'Thief of Five Fates',
    testo:'Puoi lanciare punizione una volta per riposo lungo, usando uno slot del patto.',
    effetti:[{ tipo:'incantesimo', id:'bane', quando:'riposoLungo' }] },
  { id:'thirsting-blade', nome:'Lama assetata', en:'Thirsting Blade',
    req:{ livello:5, patto:'blade' },
    testo:'Con l\'arma del patto attacchi due volte, invece di una, quando compi l\'azione di Attacco.',
    effetti:[{ tipo:'nota', testo:'Attacchi due volte con l\'arma del patto quando fai l\'azione di Attacco.' }] },
  { id:'visions-of-distant-realms', nome:'Visioni di reami lontani', en:'Visions of Distant Realms',
    req:{ livello:15 },
    testo:'Puoi lanciare occhio arcano a volontà, senza spendere slot.',
    effetti:[{ tipo:'incantesimo', id:'arcane-eye', quando:'volonta' }] },
  { id:'voice-of-the-chain-master', nome:'Voce del padrone della catena', en:'Voice of the Chain Master',
    req:{ patto:'chain' },
    testo:'Puoi comunicare col tuo famiglio e percepire attraverso i suoi sensi a qualsiasi distanza, sullo stesso piano. Mentre lo fai, puoi parlare attraverso di lui con la tua voce.',
    effetti:[{ tipo:'nota', testo:'Percepisci e parli attraverso il famiglio a qualsiasi distanza, sullo stesso piano.' }] },
  { id:'whispers-of-the-grave', nome:'Sussurri della tomba', en:'Whispers of the Grave',
    req:{ livello:9 },
    testo:'Puoi lanciare parlare con i morti a volontà, senza spendere slot.',
    effetti:[{ tipo:'incantesimo', id:'speak-with-dead', quando:'volonta' }] },
  { id:'witch-sight', nome:'Vista della strega', en:'Witch Sight',
    req:{ livello:15 },
    testo:'Entro 9 metri vedi la forma vera di qualsiasi mutaforma o creatura sotto un effetto di illusione o trasmutazione.',
    effetti:[{ tipo:'senso', testo:'Entro 9 m vedi la forma vera di mutaforma e creature trasmutate o illuse' }] },
];

/* ─── Incantesimi che arrivano dalla sottoclasse ──────────────────
   Per regola sono SEMPRE preparati e NON contano nel numero che puoi
   preparare. Chiave = livello di classe da cui li hai.
   Solo sottoclassi SRD; le tue le configuri con l'ingranaggio ⚙️.
   ──────────────────────────────────────────────────────────────── */
const SPELL_SOTTOCLASSE = {
  /* Chierico — Dominio della Vita */
  life: { etichetta:'Dominio della Vita', spells:{
    1:['bless','cure-wounds'], 3:['lesser-restoration','spiritual-weapon'],
    5:['beacon-of-hope','revivify'], 7:['death-ward','guardian-of-faith'],
    9:['mass-cure-wounds','raise-dead'] } },
  /* Paladino — Giuramento di Devozione */
  devotion: { etichetta:'Giuramento di Devozione', spells:{
    3:['protection-from-evil-and-good','sanctuary'], 5:['lesser-restoration','zone-of-truth'],
    9:['beacon-of-hope','dispel-magic'], 13:['freedom-of-movement','guardian-of-faith'],
    17:['commune','flame-strike'] } },
  /* Warlock — L'Immondo */
  fiend: { etichetta:'L\'Immondo', spells:{
    1:['burning-hands','command'], 3:['blindness-deafness','scorching-ray'],
    5:['fireball','stinking-cloud'], 7:['fire-shield','wall-of-fire'],
    9:['flame-strike','hallow'] } },
};

/* Druido — Circolo della Terra: la lista dipende dal TERRENO che scegli.
   È una scelta dentro la sottoclasse, e va chiesta. */
const CIRCOLO_TERRE = {
  arctic:   { nome:'Artico',   spells:{ 3:['hold-person','spike-growth'], 5:['sleet-storm','slow'], 7:['freedom-of-movement','ice-storm'], 9:['commune-with-nature','cone-of-cold'] } },
  coast:    { nome:'Costa',    spells:{ 3:['mirror-image','misty-step'], 5:['water-breathing','water-walk'], 7:['control-water','freedom-of-movement'], 9:['conjure-elemental','scrying'] } },
  desert:   { nome:'Deserto',  spells:{ 3:['blur','silence'], 5:['create-food-and-water','protection-from-energy'], 7:['blight','hallucinatory-terrain'], 9:['insect-plague','wall-of-stone'] } },
  forest:   { nome:'Foresta',  spells:{ 3:['barkskin','spider-climb'], 5:['call-lightning','plant-growth'], 7:['divination','freedom-of-movement'], 9:['commune-with-nature','tree-stride'] } },
  grassland:{ nome:'Prateria', spells:{ 3:['invisibility','pass-without-trace'], 5:['daylight','haste'], 7:['divination','freedom-of-movement'], 9:['dream','insect-plague'] } },
  mountain: { nome:'Montagna', spells:{ 3:['spider-climb','spike-growth'], 5:['lightning-bolt','meld-into-stone'], 7:['stone-shape','stoneskin'], 9:['passwall','wall-of-stone'] } },
  swamp:    { nome:'Palude',   spells:{ 3:['darkness','acid-arrow'], 5:['water-walk','stinking-cloud'], 7:['freedom-of-movement','locate-creature'], 9:['insect-plague','scrying'] } },
  underdark:{ nome:'Sottosuolo', spells:{ 3:['spider-climb','web'], 5:['gaseous-form','stinking-cloud'], 7:['greater-invisibility','stone-shape'], 9:['cloudkill','insect-plague'] } },
};
