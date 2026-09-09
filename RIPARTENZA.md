# TwentyNation — punto della situazione

**Versione corrente: 9.4** · app in `github.com/Giovacchio/TwentyNation`, online su
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
| **`icone.js`** | **le 75 icone disegnate (`ICONE`) e l'aiuto `ic(nome, extraClasse)` che le stampa** |
| **`sistemi.js`** | **i sistemi di gioco: `SISTEMI`, `colDi()`, `setSistema()`, le tabelle di regole per sistema** |
| `app.js` | il cuore: stato, schede, sincronizzazione, grimorio, iniziativa, opzioni |
| `sw.js` | service worker: l'app parte offline e si aggiorna da sola |
| `rules-data.js` | classi, razze, background, condizioni, abilità (SRD) |
| `spells-data.js` · `spells-it.js` | incantesimi SRD e nomi italiani |
| **`spells-desc-it.js`** | **i testi degli incantesimi in italiano: `SPELLS_DESC_IT` (319 descrizioni), `SPELLS_HIGHER_IT` (90 «ai livelli superiori»), `SPELLS_MAT_IT` (184 componenti materiali), più `spellDescIt`/`haDescIt`/`spellHigherIt`/`spellMatIt`** |
| `monsters-data.js` | bestiario SRD (81 creature) |
| `bestiary.js` | consultazione bestiario, PNG, compagni e forme selvatiche |
| `gear-data.js` · `gear.js` | equipaggiamento |
| `magic-items-data.js` · `magic-items.js` | oggetti magici |
| `builder.js` | creazione guidata del personaggio |
| `levelup.js` | passaggio di livello |
| `journal.js` | diario delle sessioni |
| `pdf-import.js` | legge una scheda PDF compilabile |
| `pdf-export.js` | esporta la scheda in PDF (foglio suo, da stampa) **e il libretto degli incantesimi a due colonne** |
| **`pdf-riempi.js`** | **riempie la scheda compilabile DELL'UTENTE: stessi nomi di casella del lettore** |
| `gear-data.js` | …e `gearTrova()`/`GEAR_ALIAS`: dal nome scritto nei pacchetti alla voce di tabella |
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
| **`incontri.js`** | **costruttore di incontri: peso dello scontro, punti esperienza e incontri salvati (`state.incontri`)** |
| `firestore.rules` | regole di sicurezza (già pubblicate, **non vanno cambiate**) |

**Attenzione:** un file nuovo va aggiunto in **tre** posti — `index.html` (lo `<script>`),
`sw.js` (`CORE_ASSETS`), e la cartella del repo. Il test `test-caricamento.mjs` lo verifica.

---

## Cosa sa fare, oggi

**Sistemi di gioco (v9.4)** — sotto il titolo c'è il sistema attivo, e si tocca per
cambiarlo. D&D 5e porta le sue tabelle SRD; gli altri partono vuoti e si riempiono con
quello che importi tu. I due mondi non si vedono fra loro: cassetti diversi in locale,
collezioni diverse su Firebase, tavoli diversi.

**Personaggi** — schermata iniziale a carte grandi: il ritratto si vede intero (4:3, con
lo stesso ritratto sfocato dietro al posto delle bande), livello, PF e i segni di
concentrazione, condizioni e forma selvatica; tutta la carta apre la scheda. Da due
personaggi in su si sceglie fra **carte grandi ed elenco compatto** (`state.partyVista`,
ricordato in `localStorage`), e sugli schermi larghi entrambe vanno su due colonne.
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
delle parole spezzate dai PDF a due colonne). Nel Grimorio resta fuori solo la fila del
**livello**; classe e tratti stanno nel pannello **Filtri**, che porta addosso quanti ne
hai accesi e li mostra scritti per esteso quando è chiuso.

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

0*. **Il pacchetto iniziale passa da `gearTrova()` (v8.5), non dal nome nudo.** I pacchetti
   sono scritti in italiano corrente («Armatura di cuoio», «Giavellotti»), le tabelle SRD
   hanno il nome secco e singolare («Cuoio», «Giavellotto»): finche' il confronto era sul
   nome, meta' delle classi partiva senza armatura (ladro con CA 9) e il paladino senza
   nessuna riga d'attacco. Chi aggiunge una voce a `CLASS_KITS` **deve** usare un nome che
   `gearTrova` risolve, o aggiungere l'alias in `GEAR_ALIAS`: una prova di
   `test-creazione.mjs` passa in rassegna tutti e dodici i pacchetti e fallisce se no.

0**. **La domanda di controllo ha una risposta scritta (v8.5): `test-creazione.mjs`.**
   Percorre il creatore premendo ogni pulsante, confronta la scheda che ne esce con quello
   che una scheda 5e ha davvero, e finisce sui due PDF. Quando si aggiunge qualcosa al
   creatore, la prova da estendere e' quella — non un test nuovo che chiama le funzioni.
   **Cosa cercare quando si aggiunge un privilegio o una razza:** ci sono scelte scritte
   come frasi («conosci un trucchetto da mago») che vanno rese caselle vere? Ci sono
   caselline di usi limitati (`CLASS_RISORSE`)? La CA cambia? Il calcolo passa da un posto
   solo o e' duplicato?

0!. **Le icone non sono più emoji (v9.2): si scrivono `${ic('dado')}`.**
   `icone.js` tiene 75 disegni su griglia 24×24 e `ic(nome)` restituisce l'`<svg>`, in
   `currentColor` — segue il colore del testo, e quindi anche il tema chiaro. Due regole
   che ho imparato rompendo l'app tre volte in un pomeriggio:
   **(a)** `${ic('x')}` vale solo dentro un *template literal* (apici inclinati). Dentro
   una stringa normale finisce sullo schermo come testo: `test-v92` ha un controllo che
   guarda l'HTML davvero prodotto in ogni schermata e fallisce se ci trova quella scritta.
   **(b)** dove va **testo puro** — `toast()`, `alert`, il testo dei PDF, gli `aria-label`
   — l'icona non ci va: uscirebbe il codice dell'`<svg>`.
   Restano emoji, di proposito, le cose che *sono* un'immagine: avatar dei personaggi,
   ritratti delle creature, i 14 segni delle condizioni.

0§. **Il lettore dei manuali ragiona a PARAGRAFI, non a righe (v9.3).**
   `hbParagrafi()` ricuce le righe che il PDF ha mandato a capo: una riga continua
   quella prima se quella prima non finisce con `.`/`!`/`?`/`:` e non è un titolo.
   `hbSembraEtichetta()`/`hbEtichettaValida()` decidono cosa è un campo: maiuscola
   iniziale, poche parole, niente punteggiatura di frase dentro — se no un due punti
   in mezzo alla prosa spezzava un tratto in due (e il secondo pezzo si chiamava
   «cantrips of your choice»). `hbEtichettaNota()` è la scorciatoia per i campi che i
   manuali usano sempre uguali: quelli aprono una voce comunque.
   **Chi tocca il lettore:** la prova da estendere è `test-v93.mjs`, e i testi di prova
   vanno **inventati** con la forma di un manuale, mai copiati da uno vero.

0#. **Ogni sistema di gioco ha il suo CASSETTO (v9.4).**
   `state.sistema` vale `dnd5e` o `sw5e`. In locale l'archivio è
   `{ diChi, sistemi: { dnd5e:{…}, sw5e:{…} } }`; su Firebase le collezioni
   prendono un prefisso (`colDi('characters')` → `sw5e__characters`), e D&D
   tiene i nomi di sempre perché gli archivi che esistono non si toccano.
   In memoria c'è **solo** il cassetto aperto: `apriCassetto()` fa puntare
   `state.characters` & co. dentro `__archivioSistemi[state.sistema]`, con gli
   **stessi array**, così un `push` finisce anche nell'archivio.
   **La trappola da conoscere:** la sincronia sostituisce gli array interi
   (`state[name] = mergeCollection(...)`) invece di modificarli — per questo
   `pacchettoLocale()` riallinea il cassetto **prima** di scrivere. Chi tocca
   quella parte deve tenerlo, o l'archivio resta indietro di un giro.
   **Perché non un campo `sistema` su ogni scheda:** i punti che leggono una
   lista sono più di duecento; col campo, dimenticarne uno significa mostrare
   roba dell'altro mondo. Col cassetto non c'è niente da ricordare.
   Le tabelle di regole passano da `razzeBase()`, `classiBase()`,
   `incantesimiBase()`, `mostriBase()`, `backgroundBase()`: **mai** più da
   `RACES`/`CLASSES_FULL`/`SRD_SPELLS`/`SRD_MONSTERS` diretti.
   **I sistemi diversi da D&D partono vuoti, per scelta**: vedi «Il vincolo
   sui contenuti» in fondo. Non ci si mette dentro materiale di altri.

0-. **Le finestre sono una pila (v8.4).** `openModal` impila, `closeModal` scende di un
   gradino, `closeModalAll` svuota. Regola: se dopo la chiusura si **cambia schermata**
   (`goView`, `openSheet`, `setDmTab`) va usato `closeModalAll`, altrimenti resta una
   finestra appesa sopra una vista nuova. `modalReplace` per le schermate che si
   ridisegnano da sole (rileggi il PDF), `modalPopTo(fn)` per i «← torna al modulo».
   Aprire due volte la STESSA `render` è un ridisegno, non un gradino, e la pila ha un
   tetto di 8: se ci arrivi è un ciclo, non una navigazione.

0∞. **`COLLEZIONI` (v9.1) e' l'elenco delle collezioni personali, in UN posto solo.**
   Erano scritte a mano in sette punti — `loadLocal`, `pacchettoLocale`, cambio account
   (due volte), «hai roba qui?», `wire()`, backup, ripristino — cioe' il modo classico per
   dimenticarsene in meta' aggiungendone una nuova. Chi aggiunge una collezione la mette
   li' e nel backup/ripristino, e il resto la trova da solo. E' la stessa lezione di
   `COND_TIPI` in campaign.js, applicata di nuovo.

0∅. **La regola delle finestre, e la CAUSA vera (v9.1).** `closeModal()` fa un
   `history.back()` ASINCRONO, e una finestra aperta subito dopo RIUSA quella voce invece
   di spingerne una sua. Chiudendo di nuovo prima che il back atterri partivano DUE back
   per UNA voce, e il secondo usciva dalla pagina. Nella v9.0 avevo curato il sintomo in
   `avviaSalita`; la causa era in `closeModal`, che ora non chiama un secondo back quando
   `__needsRepush` e' vero e `__modalDepth` e' zero. **Regola operativa invariata e da
   rispettare comunque:** se dopo la chiusura si cambia schermata (`goView`, `openSheet`,
   `setDmTab`, `state.view =`) si usa `closeModalAll()`. Nella v9.1 ne sono state trovate
   **cinque** violazioni (salvataggio personaggio, PNG all'iniziativa, cambio personaggio,
   incontro all'iniziativa, importazione PDF): c'e' uno script di ricerca nel changelog,
   vale la pena rifarlo dopo ogni aggiunta.

0∫. **Una regola FACOLTATIVA resta spenta, e l'app lo dice (v9.1).** Il sovraccarico
   variante (`state.caricoVariante`, per dispositivo) e' l'esempio: il regolamento base
   non punisce chi supera la capacita' di carico, e mettere le penalita' d'ufficio sarebbe
   decidere al posto del tavolo. Spenta, il messaggio dice cosa succede davvero (niente);
   accesa, `velocitaDi()` toglie i metri PRIMA di dimezzare per lo sfinimento — invertire
   l'ordine da' un numero negativo. Stessa logica per il tiro salvezza di gruppo: le
   creature SRD non hanno tiri salvezza propri nei dati, quindi si usa il modificatore di
   caratteristica **e lo si scrive**, invece di far finta di saperne di piu'.

0∂. **Reimportare un manuale AGGIORNA, non duplica (v9.1).** `hbGiaTua()` /
   `hbStatoVoce()` in homebrew-bulk.js: il confronto e' tipo + nome normalizzato, come per
   gli incantesimi. La voce aggiornata **tiene l'id di quella vecchia** — se cambiasse, le
   schede attaccate (`raceId`, `subclassId`) punterebbero a una voce morta — e conserva
   `classId` e le `meccaniche` configurate a mano se la nuova lettura non ne propone.

0∆. **I valori che uno STATO cambia non si scrivono sopra a quelli salvati (v9.0).**
   Lo sfinimento dimezza velocita' (2°) e massimo dei PF (4°): si calcola quello in vigore
   con `pfMassimoDi()` / `velocitaDi()` in `app.js` e lo leggono TUTTI da li' — scheda,
   turno, PDF, compagni del tavolo, tetti di `bumpHP`/`setHP`. Scrivere il valore
   dimezzato dentro `hp.max` sarebbe perdita di dati: scendendo di sfinimento non
   tornerebbe piu'. La tabella e gli effetti stanno in `SFINIMENTO` /
   `effettiSfinimento()` in `rules-data.js`, accanto alle condizioni, che e' dove uno va
   a cercarli. E il riposo lungo lo riduce di 1: era una regola che non applicava nessuno.

0¢. **Quando un tetto non si puo' sapere, NON si mostra (v9.0).** `quantiPreparabili()`
   torna `null` per chi non prepara (stregone, bardo, warlock, ranger) e per le schede
   senza classe collegata — importate da PDF, scritte a mano. Meglio nessun numero che un
   numero inventato: una scheda importata non deve vedersi dire che ne prepara 3 perche'
   l'app ha tirato a indovinare la classe. Stessa regola per `preparatiCheContano()`, che
   esclude trucchetti e incantesimi sempre preparati dalla sottoclasse.

0Ø. **`closeModal(); openModal(...)` è una trappola: si usa `modalReplace` (v9.0).**
   `closeModal()` fa un `history.back()` ASINCRONO. Se si riapre subito una finestra e poi
   la si chiude prima che quel back sia atterrato, partono DUE back per UNA voce di
   cronologia e il secondo esce dalla pagina. Trovato in `avviaSalita` (levelup.js), cioe'
   sulla strada normale di chi ha due classi. La guardia `__pendingClose` /
   `__needsRepush` copre il caso lento, non quello veloce: la soluzione e' non chiudere
   affatto. Prima di scrivere `closeModal()` seguito da `openModal()`, chiedersi se non
   sia un `modalReplace`.

0¥. **Cercare nel testo degli incantesimi passa da `testoCercabile()` (v8.9), che TIENE
   DA PARTE il risultato.** Normalizzare 319 descrizioni da mille lettere a ogni tasto
   premuto e' l'errore ovvio: l'indice sta in `__indiceSpell`, la chiave e'
   `source|id|updatedAt` (cosi' un incantesimo tuo modificato si rifa' da solo) e si
   svuota sopra le 3000 voci. `filteredSpells()` non torna piu' un array ma
   **`{nome, testo}`**: i risultati di nome e quelli che hanno la parola solo nella
   descrizione restano separati, o cercando «fuoco» *palla di fuoco* annegherebbe fra i
   quaranta che il fuoco lo nominano di sfuggita. Sotto le 3 lettere nel testo non si
   cerca. `estrattoTesto()` taglia INTORNO alla parola trovata, non ai primi 130
   caratteri, e lavora per frasi perche' `norm()` toglie gli accenti e le posizioni non
   tornerebbero.

0Ω. **I rituali (v8.9) stanno in `turno.js`: `classeRituale()` e `perchePuoiNoRituale()`.**
   Fino alla v8.8 `ritual` era solo una targhetta e «Lancia» spendeva uno slot anche sui
   rituali. Le due cose da non rompere: **(a)** chi ritualizza e' bardo, chierico, druido,
   mago — e il warlock SOLO con `book-of-ancient-secrets`; **(b)** il mago (e il warlock
   col tomo) legge dal libro, quindi NON gli serve la preparazione, mentre chierico e
   druido si'. Da (b) discende anche il filtro di `incantesimiDelTurno`: i rituali non
   preparati del mago devono restare visibili, se no gli si nasconde proprio quello che il
   libro serve a fare. `turnoLancia(..., comeRituale)` non tocca ne' gli slot ne'
   l'economia del turno: dieci minuti non sono un turno.

0∏. **`pdfDoc()` sa fare due colonne (v8.9): `S.colonne = 2`.** La scheda resta a colonna
   unica (`colonne = 0`, comportamento identico a prima). Due trappole gia' pagate:
   **(a)** in `S.text` la x va letta RIGA PER RIGA da `S.left`, non catturata prima —
   `S.space` puo' saltare all'altra colonna a meta' paragrafo e una x vecchia scrive sopra
   il testo gia' stampato; **(b)** il corridoio fra le colonne dev'essere **almeno il 3,5%
   della larghezza** (26 punti su A4), o `corridoiVerticali` in `spell-pdf.js` non lo
   riconosce e il lettore dell'app rilegge il proprio libretto con le colonne incollate.
   La prova generale e': *l'app sa rileggere il PDF che ha appena scritto?*

0€. **Le traduzioni degli incantesimi stanno in `spells-desc-it.js` (v8.8), e sono agganciate
   per `id`.** Tre dizionari — descrizione, «ai livelli superiori», componenti materiali — con
   dentro tutti e 319 gli SRD. Quattro cose da sapere prima di toccarli:
   **(a)** la chiave è l'`id` di `spells-data.js`, non il nome: se un id cambia, la traduzione
   si scollega **in silenzio** — `test-v88.mjs` cerca apposta le chiavi orfane e gli SRD scoperti;
   **(b)** i quattro helper restituiscono il testo dell'UTENTE quando `sp.source === 'custom'`
   o `sp.homebrew`: la traduzione vale solo per ciò che l'app contiene di suo, ed è la stessa
   regola del vincolo sui contenuti;
   **(c)** `conGrassetto()` in `app.js` fa `escapeHtml` PRIMA e converte `**titoletto**` in
   `<b>` DOPO — invertire l'ordine è una falla XSS, non un dettaglio estetico;
   **(d)** ogni distanza è in metri (1,5 m ogni 5 piedi): una prova cerca «feet», «saving throw»,
   «hit points», «spell slot of» e «worth at least N gp» nei tre dizionari e fallisce se ne trova.
   L'originale inglese resta visibile nella scheda in un `<details>` quando `haDescIt` è vero:
   non toglierlo, è il testo OGL e la via d'uscita quando una resa non convince.

0¤. **Il difetto tipico di questo progetto: la funzione scritta bene e mai collegata (v8.7).**
   È successo due volte — `competenzeDaSuppliche` (v8.5) e `ritoccoAttacco` (v8.7): il
   calcolo c'era, era giusto, e non lo chiamava nessuno. Dopo ogni aggiunta conviene
   rifare la passata: cercare le funzioni dichiarate e mai referenziate (`morte.py` nello
   scratchpad, o un grep) e chiedersi *chi legge questo*. Un effetto che si può
   configurare col ⚙️ e non arriva in scheda è la stessa cosa.

0#. **Una riga storta non deve spegnere la lista (v8.7).** `migrateCharacter` scartava
   l'intera scheda per una voce nulla nello zaino, e `allRaces()` andava in errore per una
   razza tua con le lingue nella forma sbagliata. Regola: chi costruisce un elenco da dati
   dell'utente filtra le voci malfatte invece di fidarsi.

0§. **Un solo lettore di PDF (v8.6): `pdfRighe()` in `spell-pdf.js`.** Le colonne si CONTANO
   coi corridoi bianchi (`corridoiVerticali`), non si tagliano a meta' pagina; le righe
   tornano col corpo del carattere, che e' il modo giusto di riconoscere un titolo
   (`corpoDelTesto`). Chi scrive un lettore nuovo passa da li': raggruppare i pezzi per Y
   su tutta la pagina incolla le due colonne fra loro, ed e' cosi' che uscivano suppliche
   con due nomi in uno. **pdf.js si prende il buffer**: passargli sempre `bufferCopia()`,
   se no la seconda lettura dello stesso file fallisce.

0!. **Dopo una CANCELLAZIONE la pila si chiude tutta (v8.5.1).** Con la pila delle finestre,
   il gradino sotto una conferma di eliminazione e' lo schermo che mostrava la cosa appena
   eliminata: tornarci significa mostrare un fantasma, o andare in errore. Chi aggiunge un
   `confirmDialog` che cancella qualcosa usa `closeModalAll()`, non `closeModal()`.
   `renderModalRoot` ha anche una rete: se il disegno fallisce scende di un gradino invece
   di lasciare lo schermo bianco — ma e' una rete, non la soluzione. Prova: `test-cancella.mjs`.

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
3. ~~**Filtri negli incantesimi della scheda**~~ — **fatto nella v8.9**: raggruppati per
   livello e con la ricerca (che guarda anche nel testo). Restano le **munizioni**, messe
   da parte per scelta di Giova: non le conta.
3bis. **I talenti non esistono come dato.** La v9.0 fa scegliere «prendo un talento» al
   posto dei due punti, ma poi e' una riga di testo nei privilegi: nessun elenco, nessun
   effetto. I talenti oltre quelli SRD sono materiale dei manuali, quindi la strada e'
   quella di sempre — l'utente li carica, l'app li applica.
4. ~~**Incontri salvati**~~ — **fatto nella v9.1**: `state.incontri`, ottava collezione
   personale. Si salva la lista (chi e quanti), non le creature; non vanno al tavolo e non
   passano dal cestino. Se un giorno servisse condividerli, si aggiungono a `COND_TIPI`.
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
- **Una superficie che si RIMPICCIOLISCE mentre il crawl la percorre e' sotto-provata.**
  Il crawl conta gli elementi una volta e poi li tocca uno per uno: se un tocco accorcia
  l'elenco (una pastiglia di filtro nel grimorio), da li' in poi gli indici alti non
  trovano piu' niente e non vengono contati. Il grimorio era cosi' da sempre — se ne e'
  accorto solo perche' nella v8.9 il totale e' SCESO aggiungendo pastiglie. Rimettendo il
  filtro a zero a ogni giro si e' passati da 1533 a **1876** tocchi. Chi aggiunge un
  filtro a una superficie del crawl lo riazzeri nel codice della superficie.
- **`crawl-interazioni.mjs`** (dinamico, ~10 minuti): apre 38 superfici e **clicca ogni
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

**Star Wars 5e (v9.4): stessa regola, ed è per questo che parte vuoto.** È un lavoro
fatto da fan sopra l'SRD, ma sopra l'SRD ci sono i nomi e il mondo di Lucasfilm e la
scrittura di chi l'ha fatto: «fanmade» non vuol dire libero, e il sito non ha una licenza
che dica il contrario. Nell'app non entra **niente** di loro — né specie, né classi, né
poteri, né testi. Entra la macchina; il materiale lo porta Giova nel suo account.
Chi in futuro fosse tentato di «riempirlo un po' per comodità»: no. La decisione è questa
e vale finché non arriva una licenza scritta che dica altro.
