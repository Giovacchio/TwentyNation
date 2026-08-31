# TwentyNation — punto della situazione

**Versione corrente: 8.4** · app in `github.com/Giovacchio/TwentyNation`, online su
`giovacchio.github.io/TwentyNation` (GitHub Pages).
Cartella locale: `C:\Users\Tizia\Documents\GitHub\TwentyNation`.

---

## Com'è fatta

PWA in JavaScript puro, **nessun build step**: i file sono caricati in ordine con
`<script defer>` da `index.html`, e le funzioni sono globali (chiamate dagli `onclick`
scritti nell'HTML). Dati su **Firebase** (Firestore + accesso Google), con copia locale
in `localStorage` e funzionamento completo anche scollegati.

### I file, e cosa fa ciascuno

| file | cosa contiene |
|---|---|
| `index.html` | guscio dell'app e **tutto il CSS** |
| `app.js` | il cuore: stato, schede, sincronizzazione, grimorio, iniziativa, opzioni |
| `sw.js` | service worker: l'app parte offline e si aggiorna da sola |
| `rules-data.js` | classi, razze, background, condizioni, abilità (SRD) |
| `spells-data.js` · `spells-it.js` | incantesimi SRD e nomi italiani |
| `monsters-data.js` | bestiario SRD (81 creature) |
| `bestiary.js` | consultazione bestiario, PNG, compagni e forme selvatiche |
| `gear-data.js` · `gear.js` | equipaggiamento |
| `magic-items-data.js` · `magic-items.js` | oggetti magici |
| `builder.js` | creazione guidata del personaggio |
| `levelup.js` | passaggio di livello |
| `journal.js` | diario delle sessioni |
| `pdf-import.js` | legge una scheda PDF compilabile |
| `pdf-export.js` | esporta la scheda in PDF (foglio suo, da stampa) |
| **`pdf-riempi.js`** | **riempie la scheda compilabile DELL'UTENTE: stessi nomi di casella del lettore** |
| `spell-pdf.js` | estrae testo dai PDF a colonne e riconosce incantesimi |
| `homebrew.js` | contenuti tuoi: sottoclassi, razze, background |
| `homebrew-bulk.js` | legge interi manuali e ne ricava le voci |
| `campaign.js` | campagne condivise col tavolo |
| `traduci.js` | traduce in italiano i nomi di quello che importi |
| `cestino.js` | cestino a 30 giorni, «salute dei dati», spazio occupato |
| `turno.js` | «Il tuo turno» |
| `meccaniche.js` | effetti delle sottoclassi sulle regole, Dono del Patto |
| `mostri-pdf.js` | legge i mostri da PDF, testo e **JSON** |
| **`liste.js`** | **elenchi lunghi: paginazione, ricerca, scelta a pastiglie** |
| **`incontri.js`** | **costruttore di incontri: peso dello scontro e punti esperienza** |
| `firestore.rules` | regole di sicurezza (già pubblicate, **non vanno cambiate**) |

**Attenzione:** un file nuovo va aggiunto in **tre** posti — `index.html` (lo `<script>`),
`sw.js` (`CORE_ASSETS`), e la cartella del repo. Il test `test-caricamento.mjs` lo verifica.

---

## Cosa sa fare, oggi

**Personaggi** — schermata iniziale a carte grandi: il ritratto si vede intero (4:3, con
lo stesso ritratto sfocato dietro al posto delle bande), livello, PF e i segni di
concentrazione, condizioni e forma selvatica; tutta la carta apre la scheda.
Creazione guidata, scheda completa con tiri, PF, condizioni, riposi,
passaggio di livello, esportazione e importazione PDF, ritratto, multiclasse parziale.
**«Il tuo turno»**: una schermata con attacchi, incantesimi divisi per tempo di lancio,
slot e risorse da spendere, senza aprire la scheda. «Lancia» spende lo slot (anche a
livello più alto se serve), accende la concentrazione e segna l'azione; l'economia del
turno (azione / bonus / reazione) si azzera con «Nuovo turno»; a 0 PF compaiono i tiri
salvezza contro morte. **Chi prepara e chi no** lo decide `preparaIncantesimi()` in
`turno.js` guardando `CLASS_BY_ID[c.classId].spellType`: bardo, stregone, warlock e
ranger NON preparano — filtrarli sui preparati lasciava la schermata vuota. **Scorrimento laterale** fra le sezioni.

**Incantesimi** — 319 SRD più i tuoi, importabili da JSON, testo o PDF (con ricucitura
delle parole spezzate dai PDF a due colonne).

**Contenuti tuoi** — sottoclassi, razze e background presi dai manuali che possiedi:
il lettore ne ha riconosciuti 116 e 48 da due guide reali. Traduzione automatica dei nomi.
**⚙️ Effetti sul gioco**: una sottoclasse può cambiare le regole (forma selvatica per
livello o per formula, famigli in più, azioni extra nel turno).

**E sono integrati davvero (v6.9)** — il creatore mostra i tuoi incantesimi anche
quando non dicono la classe, e adotta le sottoclassi di classi che l'app non ha; il
lettore di schede riconosce le tue razze, i tuoi background e la tua sottoclasse, e
aggancia gli incantesimi a quelli che possiedi già invece di duplicarli. Il personaggio
tiene `raceId`/`bgId`/`classId`/`subclassId`, non solo i nomi scritti.

**Tavolo del master** — bestiario SRD, PNG, iniziativa, diario. Lettore dei mostri da
PDF, testo e JSON delle raccolte SRD.

**Campagne** — tavolo condiviso con codice d'invito: incantesimi, aggiunte **e creature**
in comune, in un clic. I personaggi restano privati. Regole di sicurezza vere.
Le tre collezioni condivisibili stanno in un elenco solo, `COND_TIPI` in `campaign.js`:
conteggi, preselezione, condividi-tutto e ritira-tutto lo attraversano, così la prossima
si aggiunge in un posto invece che in otto. Le regole Firestore hanno un jolly
(`match /{sezione}/{docId}`) che copre già qualunque collezione nuova: **non vanno
toccate**. Il **bestiario sincronizzato** (`state.campaign.sincBestiario`, per
dispositivo) riversa tutto e tiene aggiornato: il riflesso è agganciato a `fsSet`,
`fsSetMany`, `fsDelete` e `fsDeleteMany` tramite `rispecchiaTavolo()` /
`rispecchiaTavoloElimina()` in `campaign.js` — così ogni strada d'ingresso è coperta
senza toccare i singoli pulsanti. Con la sincronia accesa il tasto «copia nel tuo
bestiario» va nascosto, o la copia risale come voce nuova e si vede doppia.

**Sicurezza dei dati** — cestino a 30 giorni, «salute dei dati» con **indicatore dello
spazio occupato**, backup esportabile, freno che impedisce a un aggiornamento di
cancellare mezza collezione.

**Regge i grandi numeri (v6.8)** — fino a **4.000 creature** nel bestiario e centinaia
di razze, sottoclassi e background. Misurato: 4.000 entrate in 255 ms, bestiario aperto
in 16 ms, archivio 2,8 MB sui ~5 che i browser concedono. Ogni elenco lungo mostra
60 righe per volta con «↓ Mostrane altri», e sopra c'è sempre la ricerca.
`fsSetMany` / `fsDeleteMany` scrivono e cancellano a pacchetti da 400.

---

## Da dove ripartire

0. **L'integrazione col materiale caricato è stata ripassata punto per punto nella v7.9**
   e le quattro falle trovate sono chiuse: il riquadro «Origini» sulla scheda, il legame
   `raceId`/`bgId` reso vero e non più scritto-e-dimenticato, la ricerca globale estesa a
   `sharedHomebrew` e `sharedNpcs`, la sottoclasse sul PDF. Il metodo che le ha trovate —
   costruire un personaggio che usa SOLO roba caricata e poi cercarlo in ogni schermata —
   vale la pena rifarlo dopo ogni funzione nuova: tre delle quattro erano invisibili ai
   test perché i test partivano già dall'oggetto giusto invece che dalla scheda.

0-. **Le finestre sono una pila (v8.4).** `openModal` impila, `closeModal` scende di un
   gradino, `closeModalAll` svuota. Regola: se dopo la chiusura si **cambia schermata**
   (`goView`, `openSheet`, `setDmTab`) va usato `closeModalAll`, altrimenti resta una
   finestra appesa sopra una vista nuova. `modalReplace` per le schermate che si
   ridisegnano da sole (rileggi il PDF), `modalPopTo(fn)` per i «← torna al modulo».
   Aprire due volte la STESSA `render` è un ridisegno, non un gradino, e la pila ha un
   tetto di 8: se ci arrivi è un ciclo, non una navigazione.

0=. **La scheda finta di prova mentiva (v8.4), e va ricordato.** Le sue caselle di spunta
   erano campi di testo travestiti: nessuna prova aveva mai verificato che competenze,
   tiri salvezza e tipo di riposo venissero **scritti**. E con una sola intestazione degli
   slot, la geometria degli incantesimi non era mai stata messa alla prova. Ora la genera
   `fai-scheda.mjs` con caselle vere e le tre colonne dei nove livelli. **Morale: quando
   una prova passa, chiedersi se il finto su cui gira somiglia davvero al vero.**

0+. **Le suppliche (v8.1) sono il modello di come si aggiunge materiale al confine della
   licenza**: quelle SRD dentro l'app con gli effetti veri, quelle del manuale caricate
   dall'utente e residenti nel suo account. `suppliche-data.js` contiene SOLO SRD, e due
   prove di `test-v81.mjs` stanno lì apposta per accorgersi se un giorno ci finisce altro.
   Nella stessa passata sono stati tolti da `spells-it.js` i 16 nomi di proprietà
   («di Tenser», «di Tasha», «di Melf»…) che l'SRD sostituisce col nome nudo.

0-. **Il finto cloud delle prove (`mock-cloud.js`) deve MENTIRE IL MENO POSSIBILE.**
   Non rimandava indietro le scritture come fa Firestore, e la funzione per staccarsi
   non staccava niente: due bugie che tenevano nascosto lo sfarfallio della v8.0.2 e
   che facevano passare per buono un cambio account. Se una prova col finto cloud dà
   un risultato più pulito di quello che si vede sul telefono, il sospetto va lì.

0. **Le prove che chiamano la funzione invece di premere il tasto sono il difetto
   ricorrente di questo progetto** (v8.0.1: «Ripristina» nel cestino rotto da chissà
   quando, con 13 prove verdi sopra). Due regole che ne sono uscite:
   **(a)** quando si prova un comando, si preme il pulsante nel DOM, non la funzione;
   **(b)** una schermata visitata ma VUOTA è una schermata non provata — il crawl adesso
   si semina cestino, campagna e compagni prima di partire, e solo così quei pulsanti
   esistono nel momento in cui ci passa. Prima di dire che una parte è coperta, guarda se
   in quella schermata c'era davvero qualcosa dentro.

0a. **La falla degli account (v8.0) è la cosa da non far ricadere.** Il proprietario
   dell'archivio locale sta DENTRO l'archivio (`diChi`), non più in una chiave separata:
   due chiavi che possono separarsi sono un modo per creare dati orfani, e i dati orfani
   venivano adottati. Chi tocca `cambiaCassetto`, `pacchettoLocale` o `loadLocal` tenga
   presente che i casi sono TRE — tuo, di un altro, di nessuno — non due.

0b. **Due mancanze note, segnalate e non scelte da Giova** (v7.9.1): il **cestino non
   finisce nel backup** — ripristinando, quello cancellato negli ultimi 30 giorni non
   torna; e il **vantaggio si dichiara solo dopo il tiro** (`repeatRoll`), mentre
   `state.rollMode` e `setRollMode` sono codice morto, l'inizio mai finito di quella
   funzione. Se un giorno si fa il vantaggio pre-tiro, si parte da lì.

1. ~~**Il master vede il gruppo**~~ — **fatto nella v8.0**, come «Compagni della campagna»
   (`party.js`): opt-in per ciascun giocatore, due livelli di dettaglio, sola lettura,
   sezione separata dai propri personaggi. Note, diario, storia, inventario e monete non
   partono mai. Se un giorno serve il master che vede tutti senza opt-in, è una riga in
   `compagniDelTavolo()` — ma va detto ai giocatori prima, non dopo.
2. **Diario condiviso** col tavolo (oggi è solo personale).
3. **Munizioni** e **filtri per livello/scuola negli incantesimi della scheda**: due buchi
   noti, messi da parte per scelta di Giova (le munizioni non le conta, e i filtri con gli
   incantesimi importati senza scuola andrebbero pensati).
4. **Incontri salvati**: oggi il costruttore è usa-e-getta. Poterli preparare in anticipo
   e richiamarli a sessione aperta sarebbe il passo naturale.
5. Rimasto in sospeso: due segnalazioni dell'audit mobile dove il dado copre un pulsante
   da fermo — si liberano scorrendo, quindi non urgenti.
6. **Oltre le 4.000 creature** servirebbe uscire da `localStorage`: IndexedDB per il solo
   bestiario di consultazione, separato da `state.npcs`. Non serve finché il contatore in
   «Salute dei dati» resta sotto il 60% — guardalo prima di rimetterci mano.

---

## Come si lavora qui

### La regola: prima lo legge, poi lo crea

**Ogni aggiunta di contenuto attraversa due porte, in quest'ordine, e non è finita
finché non le ha passate tutte e due.**

1. **Il lettore PDF deve capirlo.** Chi ha già una scheda o un manuale non ricomincia da
   zero: importa. Se una cosa nuova non si riconosce leggendo un PDF o un testo, per chi
   arriva da fuori quella cosa non esiste. Vale il riconoscimento **secondo le regole**,
   non solo il nome: prerequisiti, livello, cosa concede.
2. **Il creatore di personaggi deve saperla mettere davvero.** Non un cartello che dice
   «poi aggiungilo a mano»: il passo, i controlli, i prerequisiti, e il risultato che
   finisce nella scheda costruita.

Solo dopo vengono la scheda, la stampa e la condivisione col tavolo.

Perché è scritta qui: le due porte sono state saltate parecchie volte, e ogni volta il
buco è rimasto invisibile finché non l'ha trovato un giocatore. Gli aumenti di
caratteristica (v8.2.1) avevano il cartello «mettili a mano» al posto dei comandi; le
suppliche (v8.1) sono nate già passando da tutte e due, ed è la ragione per cui hanno
funzionato al primo colpo.

**Come si verifica che le porte siano passate davvero:**

- una prova che parte da un **PDF o da un testo** e controlla che la cosa nuova venga
  riconosciuta con i suoi attributi (non solo il nome);
- una prova che apre il **creatore**, la sceglie, e guarda che finisca in
  `buildCharacterFromBuilder()`;
- e la domanda di controllo: *un personaggio importato da PDF e uno creato con la
  procedura guidata arrivano alla stessa scheda?* Se no, una delle due porte è finta.


- **Ogni consegna è testata prima**: `/root/t/*.mjs` con Playwright, più `audit/audit.mjs`
  che scatta 99 schermate e cerca testo tagliato, elementi troppo piccoli e sovrapposizioni.
  `test-tremila.mjs` è la prova di carico: 4.000 creature vere e 500 voci di contenuti.
- **`check-interazioni.mjs`** (statico, istantaneo): legge tutti i gestori inline del codice
  — `onclick`, `oninput`, `onchange`, `onkeydown` — e verifica che ogni funzione chiamata
  esista, che nessun `<button>` sia senza gestore, che nessuna funzione sia definita due
  volte e che ogni `getElementById` cerchi un id che qualcuno crea. Lanciarlo dopo ogni
  modifica: costa un secondo.
- **`crawl-interazioni.mjs`** (dinamico, ~8 minuti): apre 37 superfici e **clicca ogni
  elemento uno per uno**, rimettendo a posto lo stato fra un tocco e l'altro. Segnala gli
  errori a runtime, i tocchi senza nessun effetto e le zone di tocco sotto i 32 px
  (misurate davvero con `elementFromPoint`, non dal rettangolo dell'elemento — e portando
  prima l'elemento in vista, o la misura vale zero). Rapporto completo in
  `/tmp/interazioni.json`. È quello che ha trovato il tasto delle risorse morto da sempre.
- **Le risorse non hanno un identificativo**: si indirizzano per posizione, come fanno
  `saveResource`, `bumpResource` e `removeResource`. Cercarle per `id` non trova mai niente.
- **I test devono usare i modelli veri dell'app.** Nella v6.4 quattro difetti gravi erano
  passati perché i test seminavano la forma sbagliata dei dati: verificavano l'errore
  invece del comportamento. Prima di scrivere una prova, controlla com'è fatto davvero
  il campo in `app.js`.
- Trappole già pagate: `preparedSpells` contiene **identificativi**, non oggetti;
  `slotsFor()` restituisce un **array che parte da 0** (posizione 0 = 1° livello);
  `concentration` è un **oggetto** `{name}`; i PNG usano `hpMax`/`hpCurrent`/`speed`/`type`;
  **Firestore rifiuta gli array dentro array** (per questo esistono `perNuvola`/`daNuvola`).
- **`saveLocal()` dev'essere sincrono.** Nella v6.7 ho provato a raggrupparne le chiamate
  con un ritardo di 40 ms: `test-v55` l'ha bocciato subito, perché `cambiaCassetto()` legge
  `localStorage` appena dopo aver toccato lo stato e si sarebbe portato via la versione di
  prima. Il costo non è mai il singolo salvataggio, sono le chiamate in ciclo.
- **Aggiungere in ciclo è sempre l'errore.** `fsSet` riscrive l'intero archivio locale a
  ogni chiamata: dentro un `forEach` su tremila oggetti sono novemila serializzazioni da
  un megabyte. Per i gruppi si usa `fsSetMany(collezione, lista, avanzamento)`, che
  restituisce `-1` se la memoria è piena — e **chi lo chiama deve tornare indietro**, non
  lasciare l'importazione a metà.
- **`resizeImageFile()` non ritaglia più.** Fino alla 6.9 tagliava a quadrato dal centro
  appena caricata l'immagine, distruggendo l'originale. Adesso riduce e basta, con due
  tetti (lato lungo 480, area 190.000 px). Se un giorno serve un cerchio, lo fa il CSS.
- **Gli effetti temporanei di un personaggio stanno sulla SUA scheda** (`c.effetti`), non
  sulla riga del combattente: `effettiDi(cb)` / `salvaEffettiDi(cb)` in `app.js` sono
  l'unico modo giusto di leggerli e scriverli, e restituiscono **lo stesso oggetto** che
  vede la scheda. Chi legge `cb.effetti` direttamente su un PG vede una lista vuota.
- **Gli slot del multiclasse** stanno in `slotsFor()` / `livelloIncantatoreTotale()`
  (`app.js`): si sommano i livelli da incantatore, non i livelli. Il patto del warlock
  NON entra nella somma — ha la sua riga, il suo `pactUsed` e torna col riposo breve.
- **Il ponte fra le tue cose e il resto sta in `homebrew.js`**: `trovaRazza()`,
  `trovaSottoclasse()`, `sottoclassiSenzaCasa()`, `adottaSottoclasse()`. Quando aggiungi
  un punto dell'app che deve conoscere il materiale caricato, passa da lì — e ricordati
  che `matchSpellText()` in `pdf-import.js` cerca in `allSpells()`, non nell'SRD.
- **Ogni elenco che può superare le 60 righe passa da `bloccoLista()`** (`liste.js`), con
  `cercaLista()` sopra. Le pastiglie di scelta (razze, background) usano `sceltaChip()`.
  Ricordati di `listaAzzera(chiave)` quando cambia il filtro, o resti a mostrarne 600.
- Consegna: `SendUserFile` → `device_commit_files` nella cartella del repo → `project_write`.
  Poi il push lo fa Giova. **Ricordagli sempre i file nuovi**, che `git add` può saltare.

---

## Il vincolo sui contenuti

Nell'app va **solo materiale SRD 5.1 (licenza OGL 1.0a)**, riscritto in italiano.
Niente testo del Manuale del Giocatore, di Xanathar, di Tasha o copiato da wikidot —
nemmeno parafrasato, nemmeno in una campagna privata, nemmeno se Giova possiede il libro
(possederlo dà il diritto di usarlo, non di ripubblicarlo).

Quello che l'app fa invece è dargli **gli strumenti** per metterci dentro da sé il
materiale dei suoi manuali: lettori di PDF e testo, editor, importazioni. Il materiale
resta sul suo account.

Casi già decisi: *Patto della Catena* **è** nell'SRD (implementato di serie);
*Cerchio della Luna* **non** lo è (il testo lo carica lui, gli effetti li configura con ⚙️).
