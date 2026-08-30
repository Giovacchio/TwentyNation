# TwentyNation — punto della situazione

**Versione corrente: 7.6** · app in `github.com/Giovacchio/TwentyNation`, online su
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
| `pdf-export.js` | esporta la scheda in PDF |
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

1. **Costruttore di incontri** — scegli i mostri dal bestiario, l'app dice se l'incontro
   è facile/medio/difficile/mortale per il gruppo e quanti PX vale. Tutto SRD,
   self-contained, nessun rischio. *È la cosa più utile che manca* — e adesso che il
   bestiario regge migliaia di creature ha molto più senso di prima.
2. **Condizioni con durata nell'iniziativa** — effetti attivi che scalano da soli a ogni
   round, e avviso sulla concentrazione quando quel personaggio subisce danni.
3. **Il master vede il gruppo** — PF, CA e percezione passiva dei giocatori visibili al
   master in tempo reale. Il salto più grande, ma tocca privacy e regole: opt-in per
   ciascun giocatore.
4. **Diario condiviso** col tavolo (oggi è solo personale).
5. **Traduzione dei nomi anche per il bestiario** (oggi copre solo le aggiunte).
6. Rimasto in sospeso: due segnalazioni dell'audit mobile dove il dado copre un pulsante
   da fermo — si liberano scorrendo, quindi non urgenti.
7. **Oltre le 4.000 creature** servirebbe uscire da `localStorage`: IndexedDB per il solo
   bestiario di consultazione, separato da `state.npcs`. Non serve finché il contatore in
   «Salute dei dati» resta sotto il 60% — guardalo prima di rimetterci mano.

---

## Come si lavora qui

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
