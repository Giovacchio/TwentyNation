# TwentyNation — lista dei cambiamenti

## v6.5 — 29 agosto 2026
**Il lettore dei mostri capisce anche i cataloghi, e non si fa mettere in ginocchio da 11.000 voci.**

Il file `monsters_5e.json` (29 MB) ha una forma tutta sua: nome e descrizione in chiaro, e tutto il resto dentro un oggetto `properties`, con tratti e azioni in JSON annidato dentro una stringa. Non veniva letto.

- **Forma «catalogo» riconosciuta**: legge CA, punti ferita, velocità, i sei punteggi, sensi, lingue, grado sfida, e apre i tratti e le azioni annidati — bonus per colpire e danni compresi. Ogni mostro si porta dietro **il libro da cui viene**.
- **Le voci senza statistiche restano fuori, e te lo dico.** In quel file **su 11.173 voci solo 379 hanno le statistiche**: le altre 10.794 sono schede di presentazione con nome, descrizione e qualche etichetta — niente CA, punti ferita o azioni. Importarle darebbe mostri a 0 PF, inutili in gioco. Ora un riquadro te ne dà il conto e spiega perché sono state escluse.
- **Ricerca e filtro per grado sfida** nell'elenco: con centinaia di mostri servivano. «Scegli i N mostrati» vale su quello che stai vedendo, non sull'intero catalogo.
- **Freno sul volume**: oltre 400 mostri in una volta l'app chiede conferma e ne aggiunge 400, spiegando come prendere gli altri. Riempire `localStorage` con migliaia di creature bloccherebbe tutti i salvataggi.

> Provato sul file vero: 29 MB letti e analizzati in **97 millisecondi**, 379 mostri riconosciuti, e cercando «dragon» ne restano 44 che entrano nel bestiario col modello giusto — Adult Black Dragon con CA 19, 195 PF, `12 m, volare 24 m, nuotare 12 m` e 6 azioni. 8 prove nuove (22 in tutto sul lettore JSON), suite completa e regressioni verdi.

## v6.4 — 29 agosto 2026
**Revisione delle novità: sei difetti veri, quattro dei quali rendevano inutile metà di quello che avevo appena costruito.**

I moduli nuovi (turno, cestino, effetti, lettore dei mostri) avevano test verdi, ma **i test seminavano la forma sbagliata dei dati** — quindi verificavano il mio errore invece del comportamento vero. Riscritti sui modelli reali dell'app, hanno subito trovato quattro difetti gravi.

- **Nessun incantesimo di livello compariva in «Il tuo turno».** I preparati sono identificativi, non oggetti: il controllo falliva sempre e restavano solo trucchetti e attacchi. Metà della schermata era inutilizzabile.
- **Gli slot erano tutti sbagliati.** L'app li tiene in un elenco che parte da zero (posizione 0 = 1° livello), il turno li leggeva come se fossero indicizzati per livello: un mago di 1°-2° non vedeva nessuno slot, uno di 5° vedeva i numeri del 2° e 3° livello sotto le etichette 1° e 2°, e il tasto accanto a un incantesimo diceva «niente più slot» con tutti gli slot pieni.
- **I mostri importati entravano con 0 PF.** Il bestiario usa `hpMax`/`hpCurrent`/`speed`/`type`, l'importazione passava i campi grezzi: in iniziativa entravano già marcati morti, e aprendo la scheda comparivano valori inventati.
- **La concentrazione mostrava `[object Object]`** invece del nome dell'incantesimo.
- **Nell'editor degli effetti si scriveva un carattere per volta**: ogni lettera ricostruiva la schermata e il campo perdeva il fuoco. E «GS 1/2» non era digitabile: allo stato intermedio «1/» il calcolo dava infinito, che veniva salvato come 0.
- **Il cestino poteva riempire la memoria del telefono.** Conservava anche i ritratti, che sono immagini intere: una decina di personaggi bastavano a far fallire i salvataggi veri. Ora il ritratto resta fuori (e la voce lo dice), e se la scrittura non riesce te lo dico invece di promettere un recupero che non c'è. Ogni voce ha una chiave sua, così due copie con lo stesso identificativo non si cancellano a vicenda.

> Due delle otto segnalazioni della revisione erano sbagliate e le ho scartate dopo verifica. 6 prove nuove e le vecchie riscritte sui modelli veri: 14 sul turno, 13 sul cestino, 16 sui mostri. Suite completa e regressioni da v40 a v48 verdi, zero errori a runtime.

## v6.3 — 28 agosto 2026
**Il lettore dei mostri accetta anche gli elenchi in JSON.**

Le raccolte SRD che si trovano in rete sono file JSON, non blocchi statistica impaginati: il lettore costruito ieri non le avrebbe lette. Ora riconosce da solo cosa gli hai dato.

- **Tre forme diverse** di raccolta, senza pretendere che siano fatte tutte allo stesso modo: campi separati (`size`, `type`, `armor_class`) oppure la riga unica `Large aberration, lawful evil`; classe armatura come numero, come stringa `17 (natural armor)` o come elenco di oggetti; velocità come testo o come `{walk, fly, swim}`; grado sfida `0.25` o `"1/4"`.
- **Tratti e azioni anche in HTML**: le raccolte più diffuse li tengono così, e il markup viene tolto tenendo separati nome e testo.
- **Elenco nudo o dentro un contenitore** (`{results: […]}`, `{monsters: […]}`), o anche un mostro solo.
- **Le misure diventano metri** come per i PDF, e taglia e tipo vengono tradotti.
- Su un JSON che non è di mostri non inventa niente, e i blocchi statistica dei PDF continuano a funzionare: l'app sceglie la strada da sé.

> Verificato sul formato reale della raccolta SRD più diffusa: Aboleth letto con CA 17, 135 PF, `3 m, nuotare 12 m`, i sei punteggi, GS 10, due tratti e due azioni. 14 prove nuove, più tutta la suite e le regressioni da v40 a v48 — zero errori a runtime.

## v6.2 — 28 agosto 2026
**Patto della Catena di serie, effetti del Cerchio della Luna configurabili, e i mostri si leggono dai PDF.**

### 🔗 Dono del Patto (SRD)
Il Patto della Catena è nell'SRD, quindi ora è **contenuto di serie**. Sulla scheda di un warlock dal 3° livello, in *Storia*, scegli fra Catena, Lama e Tomo.

Col **Patto della Catena** il famiglio può prendere anche le quattro forme speciali, e nel bestiario sono entrati **diavoletto, quasit e pseudodragone** (il folletto c'era già) con statistiche, tratti e azioni. Non compaiono nell'elenco dei famigli normali: si sbloccano solo col patto, e quando succede l'app ti dice da dove arriva il permesso.

### ⚙️ Effetti che coprono anche il Cerchio della Luna
Il testo del Cerchio della Luna è del Manuale del Giocatore e resta fuori dall'app, ma i suoi effetti ora si dichiarano tutti con ⚙️:

- **«GS = livello ÷ N, dal livello X»** oltre alla tabella per livelli: è la forma «grado sfida pari al livello del druido diviso 3» presa alla lettera. Vale il risultato migliore fra tabella e formula.
- **Trasformazione come azione bonus**, che compare fra le azioni bonus in «Il tuo turno».
- **Azioni in più**: nome, quando (azione / bonus / reazione) e una riga di promemoria, scritti da te. Compaiono nel turno al posto giusto — è lì che metti «spendi uno slot per curarti 1d8 per livello».

Provato con i tuoi numeri: al 2° livello GS 1, al 6° GS 2, al 9° GS 3.

### 🐉 Leggere i mostri dai tuoi manuali
Nel **Tavolo del Master**, sotto il bestiario: «📖 Leggi i mostri dal tuo manuale». Riconosce i blocchi statistica nel formato standard e ne ricava **nome, taglia, tipo, CA, punti ferita e dadi vita, velocità, i sei punteggi, sensi, lingue, grado sfida, tratti e azioni**, tenendo separati i tratti dalle azioni.

- **Le misure diventano metri**: `50 ft., fly 60 ft.` → `15 m, volare 18 m`.
- I gradi sfida in frazione (`1/8`, `1/4`) restano tali.
- Più file insieme, con l'avanzamento pagina per pagina.
- Su un testo di prosa qualunque non inventa niente.

I mostri che entrano finiscono nel tuo bestiario e diventano **scegliibili come forma selvatica, famiglio o compagno**: è così che un bestiario caricato allarga davvero il gioco.

> Verificato: 16 prove nuove, più tutta la suite e le regressioni da v40 a v48 — zero errori a runtime, audit mobile invariato.

## v6.1 — 28 agosto 2026
**Le sottoclassi che importi ora cambiano davvero le regole, non solo il testo.**

Finora una sottoclasse era una scheda di testo: bella da leggere, invisibile al resto dell'app. Il Druido del Cerchio della Luna vedeva le stesse bestie di un druido qualunque, e il Warlock col Patto della Catena gli stessi famigli.

### La scheda ricorda che sottoclasse ha
Prima la sottoclasse finiva solo dentro l'elenco dei privilegi, come testo: l'app non aveva modo di sapere che sei un druido della luna. Ora **classe e sottoclasse sono campi veri** della scheda. La creazione guidata li compila da sola; sulle schede già fatte o importate da PDF c'è un menù a tendina in **Storia**, sotto il background. Le schede vecchie risalgono alla classe dal nome che ci avevi scritto.

### ⚙️ Effetti sul gioco
Ogni tua sottoclasse ha un tasto ⚙️ in *Contenuti tuoi* dove dichiari **cosa cambia nelle regole** — non cosa dice il manuale:

- **Forma selvatica**: il grado sfida massimo per livello (quante righe vuoi), e da che livello arrivano nuoto e volo. Di serie resta GS 1/4 dal 2°, 1/2 dal 4°, 1 dall'8°.
- **Famigli**: le creature che questa sottoclasse ti lascia scegliere **oltre** a quelle normali.

Quello che dichiari viene applicato: il selettore delle bestie filtra al grado sfida giusto e ti dice da quale sottoclasse arriva il permesso, e l'elenco dei famigli si allarga di conseguenza — senza perdere quelli di sempre.

### L'app prova a compilarli da sola
Quando importi da un manuale, se nel testo dei privilegi trova numeri accanto a «forma selvatica»/«wild shape» o creature nominate accanto a «famiglio»/«familiar», **propone già gli effetti** e te lo dice («12 voci aggiunte · 3 con effetti riconosciuti»). Legge solo i numeri del testo che hai caricato tu, non inventa nulla: su un privilegio qualunque non propone niente. Resta una bozza da controllare con ⚙️.

> Verificato: 13 prove nuove, più tutta la suite e le regressioni da v40 a v48 — zero errori a runtime, audit mobile invariato.

## v6.0 — 28 agosto 2026
**«Il tuo turno»: tutto quello che puoi fare adesso, senza aprire la scheda. E niente si elimina più per sempre.**

### ⚔️ Il tuo turno
Il tasto ⚔️ in cima alla scheda (e nella schermata iniziale) apre una sola videata con quello che ti serve mentre il tavolo aspetta te:

- **PF con −5 / −1 / +1 / +5**, CA, iniziativa e velocità in testa, con la barra della salute.
- **Concentrazione** in evidenza con il nome dell'incantesimo e il tasto per interromperla.
- **Condizioni attive** come pastiglie: si tolgono con un tocco, se ne aggiungono altre.
- **Azione**: i tuoi attacchi (tocchi il bonus e tiri per colpire, tocchi i danni e li tiri), i tuoi incantesimi da 1 azione, e le dieci azioni di base con il promemoria in una riga — Scatto, Disimpegno, Schivata, Aiuto, Nascondersi, Preparare, Cercare, Usare un oggetto.
- **Azione bonus** e **Reazione** con i loro incantesimi, divisi automaticamente leggendo il tempo di lancio. Gli incantesimi non preparati non compaiono.
- **Da spendere**: slot per livello e risorse, un tocco per consumarne uno. Non si scende sotto zero.

Il riposo è sceso nel menù ⋯ (si fa due volte a sessione, il turno ogni round), e sugli schermi stretti i tasti in cima si stringono quel tanto che basta perché nome e livello restino leggibili per intero.

### 🗑️ Niente si elimina più per sempre
Dopo esserci passati due volte, ho smesso di fidarmi delle eliminazioni.

- **Cestino con 30 giorni di ripensamento** per personaggi, PNG, incantesimi, aggiunte e voci del diario. Si ripristina identico, tratti e privilegi compresi, e quello che rimetti a posto **risale sull'account** invece di restare solo lì.
- Il cestino vive **su questo dispositivo**: non occupa spazio sul tuo account e non lo vede nessuno. Si svuota da solo dopo trenta giorni.
- I messaggi di conferma non dicono più «non si torna indietro», perché adesso si torna indietro.

### 🩺 Salute dei dati
In **Opzioni → I tuoi dati**: quante cose hai, **quante sono davvero sul tuo account** e quante esistono solo qui, divise per tipo. Se qualcosa non è salito te lo dice in chiaro, con il tasto per esportare un backup lì accanto. È la schermata che sarebbe servita a scoprire in un attimo il difetto degli array annidati.

> Verificato: 21 prove nuove (10 sul turno, 11 su cestino e salute dei dati), più tutta la suite e le regressioni da v40 a v48 — zero errori a runtime. Audit mobile su 99 schermate: zero elementi troppo piccoli, zero fuori pagina.

## v5.9 — 28 agosto 2026
**Quando la condivisione non va, adesso l'app dice perché.**

«Non è andato niente» non spiegava niente: l'errore vero del server finiva nella console del browser, dove nessuno lo guarda. È il motivo per cui il difetto degli array annidati è rimasto invisibile a lungo.

- **Il messaggio dice la causa**, in italiano: forma dei dati, permessi negati, non risulti collegato, limite del piano Firebase, connessione assente, voce troppo grande.
- **«🩺 Non funziona? Provalo»** nella schermata della campagna: prova a scrivere sul tavolo quattro cose diverse, una per volta — una voce semplice, una con gli array annidati (la forma vecchia), una confezionata come fa ora l'app, e una tua aggiunta vera. Quella che fallisce dice esattamente dov'è il problema. Mostra anche la versione dell'app, quante aggiunte hai e quante ne vede il tavolo, e si copia tutto con un tasto. Le voci di prova vengono cancellate subito dopo.

> Nota sulle regole di sicurezza: non vanno cambiate. Gli incantesimi passano dalla stessa identica regola (`match /{sezione}/{docId}`) e dallo stesso codice delle aggiunte — se il problema fosse nelle regole non ne sarebbe passato nemmeno uno dei 147.

> Verificato: 6 prove nuove sul messaggio d'errore e sulla diagnostica, più tutta la suite e le regressioni da v40 a v48 — zero errori a runtime.

## v5.8 — 28 agosto 2026
**Le sottoclassi e le razze non venivano salvate. Mai. Nemmeno sul tuo account.**

Il tavolo mostrava «147 incantesimi · 0 aggiunte» e sembrava un problema della condivisione. Non lo era.

**Firestore non accetta un array dentro un altro array.** I privilegi di una sottoclasse sono `{3: [["Frenesia","testo"], …]}` e i tratti di una razza sono `[["Scurovisione","vedi al buio"], …]`: array di array, esattamente la forma vietata. Ogni salvataggio delle tue aggiunte veniva quindi **respinto dal server**, e l'errore finiva solo nella console del browser.

Conseguenze, tutte spiegate da questa sola causa:
- Le tue 164 aggiunte esistevano **solo nella memoria del dispositivo**. Non erano mai arrivate al tuo account.
- Sul tavolo ne arrivavano zero, mentre i 147 incantesimi passavano senza problemi: gli incantesimi non hanno quella forma.
- La sparizione dell'altra volta è stata definitiva perché non c'era nessuna copia nel cloud da cui recuperarle.

### La correzione
- L'array interno viaggia **dentro un oggetto** e viene riaperto in lettura. Applicato a tutti i punti di passaggio: salvataggio sul tuo account, risalita di quello creato offline, lettura dei tuoi dati, condivisione col tavolo e lettura del condiviso.
- Il giro di andata e ritorno restituisce i dati **identici**: verificato sui privilegi per livello e sui tratti delle razze, fino a vederli ricomparire nella creazione guidata.
- Quello che non ha array annidati (gli incantesimi, i personaggi) non viene toccato.
- **Un rifiuto del server ora si vede.** Prima finiva in un log che nessuno guarda: adesso compare un avviso. È questo che ha reso il difetto invisibile per settimane.

### Recupero
Le tue 164 voci non hanno mai ricevuto il bollo «salvata sul server», quindi al primo collegamento dopo l'aggiornamento **risalgono da sole** sul tuo account. Da quel momento sono al sicuro e condivisibili.

### Anche
La scritta **GRIMORIO** nella barra laterale del computer è diventata TWENTYNATION: mi era sfuggita nella v5.6.

> Verificato: 10 prove nuove sul confezionamento e sul giro completo (salvataggio, condivisione, rilettura, comparsa nella creazione guidata), più tutta la suite e le regressioni da v40 a v48 — zero errori a runtime. Audit mobile invariato.

## v5.7 — 28 agosto 2026
**Le tue aggiunte non spariscono più, la campagna non ti molla, e il tavolo si apre dalla prima schermata.**

### La perdita delle sottoclassi e delle razze: trovata e chiusa
Non era la condivisione: era la regola anti-risurrezione che avevo messo nella v5.3. Diceva «se il server non me lo manda, vuol dire che l'hai cancellato altrove» — e quindi **bastava un aggiornamento arrivato vuoto o incompleto per cancellare l'intera collezione**, anche in locale. Riprodotto: 164 aggiunte, uno snapshot vuoto, zero rimaste.

Adesso non si deduce più niente dalle assenze, si ragiona su prove:
- **Si toglie solo quello che il server ci aveva già mostrato** e adesso non ha più. Un aggiornamento che semplicemente non lo contiene non prova nulla. La memoria di «cosa c'era sul server» sopravvive alla chiusura dell'app, così una cancellazione fatta su un altro dispositivo mentre eri via arriva lo stesso.
- **Freno di sicurezza**: nessun aggiornamento può portare via metà collezione o più. Se ci prova, viene ignorato e te lo dico. Un dato che riappare è un fastidio; un dato distrutto è un disastro.
- Le cancellazioni vere fatte da un altro dispositivo continuano ad arrivare, una per una, come prima.

Se hai perso delle voci, sono ancora sul tuo account: rientrando dovrebbero ricomparire. Se non tornano, dimmelo.

### Uscivi dalla campagna a ogni chiusura — ed era colpa mia, in due punti
- **`boot()` partiva troppo presto.** I file sono caricati con «defer» e quando `app.js` finiva, `campaign.js` non era ancora stato eseguito: la funzione che ripristina la campagna **non esisteva ancora**, e la riga che avrebbe dovuto chiamarla la saltava in silenzio. Risultato: a ogni avvio risultavi fuori dal tavolo. Ora si aspetta che tutti i file ci siano.
- **Un aggiornamento storto ti buttava fuori.** Se il documento della campagna arrivava vuoto o dalla cache, l'app concludeva «non fai più parte di questa campagna» e cancellava il tavolo dal telefono. Ora serve la conferma del server due volte di fila; un «permesso negato» invece vale subito, perché quello è una prova.

### Il tavolo dalla prima schermata
Sotto i pulsanti del party: se non sei in nessuna campagna, **«⚔️ Entra in una campagna»**. Se ci sei, un riquadro col nome del tavolo, il tuo ruolo, quanti siete e quante cose tue non sono ancora in comune — si tocca e ci entri.

> Verificato: 11 prove nuove più una che ricostruisce il caso vero (164 aggiunte importate, condivise, ricaricate) e tutta la suite con le regressioni da v40 a v48 — zero errori a runtime. Audit mobile invariato.

## v5.6 — 28 agosto 2026
**L'app si chiama TwentyNation, e ha il suo marchio.**

- **Icona nuova** su tutti i formati: quella tonda bordeaux col d20 dorato. Ci sono le versioni normali (192 e 512), quelle **mascherate** per Android — dove il marchio è a tutto campo sul bordeaux, così il ritaglio a cerchio o a goccia non taglia niente — la `apple-touch-icon` per iPhone e la favicon per la scheda del browser.
- **Nome cambiato in «TwentyNation»** dove indica l'app: schermata d'accesso, intestazione del party, titolo della pagina, nome sotto l'icona una volta installata, diagnostica, avviso di aggiornamento e messaggi sui backup.
- **«Grimorio» resta dov'era il suo posto**: è la sezione degli incantesimi, in fondo alla barra, e nei messaggi che parlano di quella («Aggiungi dal Grimorio»). Cambiarlo lì avrebbe confuso e basta.
- Sulla schermata d'accesso al posto dell'emoji 📖 ora c'è **il marchio vero**, dentro il sigillo dorato.

### Una cosa che si è rotta col nome nuovo, e che ho sistemato
«TwentyNation» è lungo il doppio di «Grimorio»: nell'intestazione del party finiva **sotto i due tasti** in alto a destra (cerca e tema) e si leggeva «TwentyNatio…». Misurato: il titolo occupa 193 px e lo spazio libero fra i tasti ne lascia 164 sotto i 430 px di schermo. Su schermo stretto il titolo ora scende di una riga e sta largo; sopra i 440 px resta dov'era.

> Verificato: tutta la suite più le regressioni da v40 a v48 — zero errori a runtime. Audit mobile su 99 schermate invariato (2 segnalazioni, il dado che copre un pulsante da fermo).

## v5.5 — 28 agosto 2026
**Condivisione col tavolo in un clic, account che regge fra browser e app, e la scheda si sfoglia col dito.**

### Metti in comune col tavolo in un colpo solo
Prima ogni incantesimo e ogni aggiunta andavano condivisi uno per uno col tasto ⚔️: con un manuale intero importato erano centinaia di tocchi.

- Nella schermata **Campagna** c'è un riquadro nuovo che dice quante cose tue il tavolo non vede ancora, e un tasto **«⚔️ Condividi tutto»** che le manda tutte insieme.
- **«Scegli cosa»** apre l'elenco completo con le caselle: quello che è già sul tavolo è segnato e non si ripropone, il resto parte già spuntato.
- **«Ritira tutto»** fa il contrario in un colpo, e ritira solo quello che hai messo tu (il master può ritirare qualsiasi cosa).
- La scorciatoia compare anche in *Contenuti tuoi*, col conteggio: è lì che finisci dopo aver importato un manuale.

### L'account regge il passaggio fra browser e app
- **Nell'app installata l'accesso parte dal reindirizzamento.** La finestra popup lì spesso non ha dove aprirsi e torna indietro senza niente: sembrava che il tasto non facesse nulla. Nel browser resta il popup, che è più rapido.
- **Due persone sullo stesso telefono non si vedono più i dati.** Entrando con un account diverso, la copia locale di prima viene **messa da parte in un cassetto suo** invece di restare a schermo — e torna fuori intatta quando quella persona rientra. Prima i personaggi del primo restavano visibili al secondo.
- **Le modifiche fatte da scollegato adesso risalgono.** Cambiare qualcosa senza connessione lasciava il bollo «già sul server»: la modifica restava solo sul telefono e non arrivava mai all'account. Ora il bollo viene tolto e al collegamento successivo quello che hai cambiato sale.
- Chi entra per la prima volta si porta dietro quello che aveva creato da scollegato: è suo e finisce sul suo account.

### La scheda si sfoglia col dito
- **Scorri a sinistra o a destra** per passare da Panoramica a Zaino a Magie a Storia a Note. La sezione entra dal lato da cui è arrivato il dito, e la barra in cima si sposta da sola sulla sezione attiva.
- Il gesto non ruba lo scorrimento verticale (dev'essere netto e orizzontale) e **non scatta dentro le tabelle larghe**, sulla barra delle sezioni o mentre scrivi in un campo.
- Alle due estremità non si va oltre, e chi non lancia incantesimi non ha la sezione Magie fra quelle da sfogliare.
- Il suggerimento compare una volta sola, la prima volta che apri una scheda su un telefono.

### Rifinitura
- **Gli avvisi non tagliano più le parole a metà.** Il riquadro si fermava a due righe e troncava senza puntini: adesso va a capo e arriva a tre righe.
- Su schermo grande il dado sta nell'angolo, fuori dalla colonna del contenuto.
- La barra delle sezioni scorre se non ci sta, senza sbordare.

> Verificato: 15 prove nuove su scorrimento, condivisione e cambio account, più traduzione, caricamento, revisione, importazione, guida, bulk, campagna, sincronizzazione, persistenza e le regressioni da v40 a v48 — tutte verdi, zero errori a runtime. Audit mobile su 99 schermate: le segnalazioni scendono da 4 a 2 (in entrambi i casi il dado copre un pulsante da fermo, e basta scorrere un poco perché si tolga).

## v5.4 — 28 agosto 2026
**«Traduci i nomi in italiano»: quello che importi dai manuali smette di essere in inglese.**

In *Contenuti tuoi* c'è un tasto nuovo. Rinomina in italiano **i nomi** di tutto quello che hai importato — sottoclassi, razze, tratti, privilegi, lingue — con l'anteprima di cosa diventa cosa prima di confermare, e il tasto per tornare indietro dopo.

Sui due manuali che hai caricato: **148 voci su 164** rinominate.

- `Path of the Berserker` → **Cammino del Berserker**
- `College of Whispers` → **Collegio dei Sussurri**
- `Way of the Sun Soul` → **Via dell'Anima Solare**
- `Life Domain` → **Dominio della Vita**
- `Hill Dwarf` → **Nano delle Colline** · `High Elf` → **Alto Elfo** · `Gray Dwarf [Duergar]` → **Nano Grigio [Duergar]**
- `Darkvision` → **Scurovisione** · `Common and Dwarvish` → **Comune e Nanico**

### Come si comporta
- **Il testo delle regole non viene toccato.** L'app rinomina le etichette; la prosa dei privilegi resta esattamente come sta nel tuo manuale.
- **L'originale resta salvato.** Un tasto «↩︎ Rimetti i nomi originali» riporta tutto com'era, anche a distanza di giorni.
- **Non traduce a metà.** Se di un nome riconosce solo un pezzo lo lascia intero in inglese: «Forbidden School of Blood Magic» resta così invece di diventare qualcosa di sgrammaticato. Le 16 voci non rinominate sono quelle che in italiano si dicono uguale (Drow, Firbolg, Kenku, Tabaxi, Githyanki…) o nomi propri che non ha senso tradurre.
- **Rispetta l'ordine italiano**: l'aggettivo va dopo («Nano Grigio», «Halfling Piedelesto») tranne dove non si fa («Alto Elfo»), e le parentesi restano attaccate dove erano.

### Due difetti trovati mentre lo costruivo
- **Le scuole di magia erano sbagliate, e in due modi diversi.** L'elenco in `app.js` diceva *Conjuration → Convocazione* ed *Evocation → Evocazione*; quello del lettore PDF diceva *Conjuration → Evocazione* ed *Evocation → Invocazione* — che sono i termini giusti. Risultato: lo stesso incantesimo finiva in due scuole diverse a seconda di come era entrato nell'app, e il filtro per scuola nel grimorio li separava. Ora l'elenco è **uno solo** e con i termini corretti; le diciture vecchie continuano a essere capite, così niente di quello che hai già salvato si perde.
- **Un titolo spezzato dentro la parentesi** non veniva riconosciuto: «Way of the Sun Soul (SC/XG» + «Update):» produceva una sottoclasse fantasma chiamata «Updated)». Ora la Via dell'Anima Solare entra col suo nome.

> Verificato: 8 prove nuove sulla traduzione, più caricamento, revisione, importazione, guida, bulk, campagna, sincronizzazione, persistenza e le regressioni da v40 a v48 — tutte verdi, zero errori a runtime. Audit mobile su 99 schermate invariato.

## v5.3 — 28 agosto 2026
**Revisione completa: undici difetti trovati e corretti, due dei quali sbagliavano i numeri in scheda.**

Ho fatto rileggere tutto il codice a revisori indipendenti, area per area, chiedendo per ogni segnalazione uno scenario concreto in cui l'app sbaglia davvero. Quello che segue è ciò che ha superato la verifica.

### Numeri sbagliati in scheda (i più gravi)
- **La CD degli incantesimi era più alta di 2.** In Panoramica si leggeva `10 + competenza + caratteristica` invece di `8 + …`: un mago di 5° con INT 18 vedeva **17** invece di 15 — e la scheda Magie, due schermate più in là, mostrava il numero giusto. Chi guardava il numero grande faceva fallire tiri salvezza che il mostro avrebbe superato.
- **La percezione dei non incantatori ignorava la competenza.** Nello stesso riquadro un ladro esperto in Percezione leggeva `12` accanto a una passiva di `17`.
- **Cambiare la Destrezza cancellava l'iniziativa.** Chi aveva Attento (o qualsiasi bonus scritto a mano) se lo vedeva azzerato al primo punto di DES speso, senza avviso e con il salvataggio già partito. Ora l'iniziativa si sposta della differenza invece di essere riscritta.

### Perdita di dati
- **Quello che cancellavi su un dispositivo risorgeva sull'altro.** L'altro dispositivo, ricevendo l'aggiornamento, non trovava il personaggio sul server e lo **rimetteva** — e al primo tocco lo ricaricava anche online. Ora si distingue «mai arrivato al server» (si tiene e si carica) da «c'era e non c'è più» (è stato cancellato: se ne prende atto). Vale per personaggi, PNG, incantesimi, contenuti tuoi e diario.

### Sicurezza
- **Un nome scritto da un altro membro del tavolo finiva in pagina senza filtro.** I nomi dei background arrivano anche da `sharedHomebrew`, cioè da altri utenti: bastava chiamarne uno con del markup dentro per farlo eseguire sul telefono di chi apriva la creazione guidata, con accesso alla cache locale e alla sessione. Ora passano dall'escape come tutto il resto.

### Cose che non funzionavano
- **Gli incantesimi condivisi dal tavolo non si aprivano.** Comparivano nel grimorio, ma toccarli non faceva niente — né un errore né un avviso: la ricerca guardava solo fra i tuoi e fra quelli SRD. Stesso buco nel cambio classe e nella copia.
- **Le risorse a riposo breve non si recuperavano** se avevi finito i dadi vita: il ripristino era agganciato alla spesa di un dado, e senza dadi non c'era modo di farlo. Sbagliava anche al contrario: curarsi con un dado fuori dal riposo le ricaricava. Ora c'è un tasto **«Concludi il riposo breve»** sempre presente, che recupera anche gli slot del Patto.
- **Il livello degli incantesimi non veniva mai letto dalle schede PDF.** L'appaiamento fra casella e intestazione usava fasce arrotondate che non coincidevano mai: ogni incantesimo non riconosciuto entrava come **1° livello**. Su una scheda reale i livelli ora si distribuiscono correttamente da 0 a 4.
- **Cancellare la ricerca nel grimorio poteva lasciarlo vuoto.** Premendo la ✕ entro un attimo dall'ultima lettera, il valore vecchio arrivava dopo e filtrava la lista mentre la casella era vuota e la ✕ sparita: nessun modo di capire perché non si vedeva più niente.

### Lettore dei manuali
- **Una riga di prosa sotto un titolo faceva sparire l'intera voce.** Una condizione scritta al contrario attaccava il testo al titolo, che così non veniva più riconosciuto.
- **Le razze in italiano non venivano mai lette**: il lettore cercava «Aumento dei Punteggi» ma i manuali scrivono «Aumento dei Punteggi **di Caratteristica**». Sottoclassi e background entravano, le razze zero, senza avviso.
- **Una voce sola incollata veniva scartata** anche se riconosciuta bene — proprio il caso che la schermata suggerisce.
- **Un apostrofo nel nome rompeva i gruppi** («Genasi dell'Aria»): il gruppo non si apriva più e le razze dentro restavano irraggiungibili.
- **Il privilegio dei background** finiva tutto nel titolo, descrizione compresa, e «Lingue: una a tua scelta» contava zero lingue.
- **Un file vuoto lasciava la finestra bloccata** su «leggo…» per sempre.
- **La scuola degli incantesimi restava in inglese** quando la riga diceva «Evocation cantrip»: veniva presa intera e la traduzione non la trovava.

### Il tasto «Importa» accetta tutto
Non filtra più i soli JSON: gli dai un file e capisce da solo cos'è. Backup → ripristino; **scheda PDF compilabile** → importazione della scheda; **PDF o testo di un manuale** → lettore dei manuali. Il riconoscimento è automatico (guarda se il PDF ha campi compilabili), non ti chiede niente. Stessa cosa per «Importa file» dentro *Contenuti tuoi*.

> Verificato: 7 prove nuove sulle correzioni, 6 sui percorsi di importazione, più guida, bulk, campagna, sincronizzazione, persistenza e le regressioni da v40 a v48 — tutte verdi, zero errori a runtime. Audit mobile su 99 schermate invariato.

## v5.2 — 28 agosto 2026
**Le guide impaginate a due colonne adesso si leggono per intero.**

«Leggi dal tuo manuale» reggeva un formato solo. Le guide vere — quelle con le voci a pallini, i titoli che vanno a capo prima della sigla e l'indice interlacciato su due colonne — venivano lette a metà: le classi finivano fra le sottoclassi, i privilegi di una scivolavano dentro quella prima, e nessuna sottoclasse trovava la sua classe.

### Cosa cambia
- **Le intestazioni di classe fanno da sezione, non da voce.** Quando l'app incontra un titolo con dadi vita e competenze capisce che apre una classe: tutte le sottoclassi che seguono le vengono legate da sole. Su una guida da 200 pagine ne ha riconosciute 116, con la classe giusta su 104 — le altre 12 sono di classi che l'app non ha (Artefice, Mistico, Cacciatore di Sangue) e restano da assegnare a mano.
- **Titoli spezzati su due righe ricomposti.** «Cammino del Guerriero Totemico» seguito da «(PHB/SC Update):» ora è un titolo solo, e i suoi privilegi non finiscono più nella sottoclasse precedente.
- **Niente più voci fantasma.** Un frammento come «Level 10: 4 danni da fuoco» non viene più scambiato per una sottoclasse.
- **Velocità in piedi abbreviati.** `25ft.` diventa 7,5 m; prima restava il valore di riserva.

### Un solo caricamento e sono dentro tutti
- **Più file in una volta.** Il selettore accetta più PDF insieme: guida delle razze e guida delle classi si caricano in un colpo solo e finiscono nello stesso elenco (48 razze + 116 sottoclassi = 164 voci, tutte già spuntate). Durante la lettura si legge `File 2 di 2 · pagina 128 di 203`.
- **Le razze si scelgono come le sottoclassi**: raccolte per stirpe (Elfo 4, Genasi 4, Nano 3, Aasimar 3…) con «scegli tutte» sul gruppo. Le stirpi con una razza sola restano righe normali, senza un clic in più per aprirle.
- Finita la lettura **è già tutto selezionato**: basta premere «Aggiungi 116» e ci sono. Prima andavano spuntati a mano uno per uno.
- Le sottoclassi di classi che l'app non ha si assegnano **tutte insieme** con un menù a tendina sul gruppo, invece che aprendo voce per voce.
- Durante la lettura si vede **a che pagina è arrivata** (`Pagina 128 di 203`): un manuale intero richiede qualche minuto e ora si capisce che sta lavorando.
- «📖 Leggile tutte dal tuo manuale» compare anche **dentro la creazione guidata**, ai passi di razza, sottoclasse e background: è lì che ci si accorge che manca qualcosa.

### La schermata di scelta regge i numeri grossi
- Le sottoclassi sono **raggruppate per classe**, con il conteggio e un «scegli tutte» per gruppo: con 116 voci non si scorre più a vuoto.
- Ogni riga dice **a quale classe appartiene**, e segnala con ⚠︎ quelle da assegnare.
- Con poche voci i gruppi restano già aperti.

### Razze
Su una guida di razze ne ha lette 48 su 48, con bonus ai punteggi, velocità, taglia, lingue e tratti. Le razze a bonus descrittivo (l'umano standard, «due punteggi +2, gli altri quattro +1») entrano senza numeri: si sistemano in un attimo aprendo la voce.

> Come sempre: l'app non contiene questo materiale, legge quello che carichi tu dai manuali che possiedi. Quello che entra resta sul tuo account, e va al tavolo solo se lo scegli.

## v5.1 — 27 agosto 2026
**Campagna condivisa: il tuo tavolo vede quello che ci metti dentro.**

Quello che importi resta tuo, ma ora puoi metterlo in comune **con il tuo gruppo di gioco** — non col mondo. Una campagna è il tavolo: tu, i tuoi giocatori, il master. Chi non è nella lista dei membri non vede niente, nemmeno il nome della campagna.

### Come funziona
- Da **Opzioni → Campagna**: crei un tavolo e ottieni un **codice d'invito** (tipo `CFFK-EYUQ`) da passare ai tuoi, oppure entri in uno esistente col codice che ti hanno dato.
- Nella schermata della campagna vedi i membri, quanto c'è in comune e il codice da copiare.
- Si esce quando si vuole: smetti di vedere le cose condivise, ma **i tuoi personaggi e i tuoi contenuti restano intatti**.

### Cosa si condivide
- **All'importazione**: un interruttore «Condividi con la campagna». Gli incantesimi finiscono sia fra i tuoi sia nel tavolo.
- **Uno alla volta**: dalla scheda di un tuo incantesimo, o dall'elenco delle tue aggiunte, il tasto ⚔️ lo mette in comune (e lo ritira).
- Gli incantesimi del tavolo compaiono nel grimorio **col nome di chi li ha messi**; le sottoclassi, razze e background compaiono nella creazione guidata insieme ai tuoi.
- Se hai già un incantesimo con lo stesso nome, il tuo ha la precedenza: niente doppioni.
- Ritiri quello che hai messo tu; il master può ritirare qualsiasi cosa.

### I personaggi restano privati
La campagna condivide **solo** incantesimi e aggiunte. Personaggi, zaini, diario e PNG restano nel tuo ramo personale: nessun membro li vede.

### Le regole di sicurezza sono nel repo
Nuovo file **`firestore.rules`**, da incollare in *console Firebase → Firestore Database → Regole → Pubblica*. Senza quelle, l'app funziona lo stesso ma i dati sarebbero aperti a chiunque abbia un account: è lì che si decide chi vede cosa, non nel codice dell'app. Le regole chiudono i dati personali al solo proprietario e le campagne ai soli membri.

Il codice d'invito vive in un registro separato (`inviteCodes`) che si può leggere solo conoscendo il codice esatto e non si può sfogliare: serve perché per entrare bisogna trovare la campagna *prima* di esserne membri, senza per questo poter leggere quelle degli altri.

### Note tecniche
- Nuovo file: `campaign.js`. Cache del service worker a `grimorio-v5-1`.
- Nuova suite `test-campagna.mjs`: 10 prove con due account simulati — creazione, ingresso col codice, chi vede cosa, chi può ritirare cosa, **un estraneo non legge niente**, e l'uscita che non porta via i tuoi dati.
- Le altre undici suite e l'audit telefono passano tutti, 0 errori.

## v5.0 — 27 agosto 2026
**Controllo dei salvataggi: quello che scrivi non si perde più.**

Ho messo alla prova il salvataggio da due lati: **41 campi** cambiati uno per uno e riletti dopo aver ricaricato la pagina, e **10 prove sulla sincronizzazione** con un finto server, per vedere cosa succede fra dispositivi, quando la rete cade e quando l'app viene chiusa a metà.

Il salvataggio locale era già a posto: 41 campi su 41 sopravvivono alla ricarica — testo, caratteristiche, competenze, punti ferita, condizioni, attacchi, zaino, sintonizzazione, armatura indossata, incantesimi preparati, slot, concentrazione, compagni, PNG, diario, preferenze. Nella sincronizzazione invece è saltato fuori un buco vero.

### Quello che creavi da scollegato non risaliva mai
Se aggiungevi un personaggio, importavi incantesimi o scrivevi sul diario **senza aver fatto il login** (o con la rete giù), quella roba restava solo su quel dispositivo. Facevi il login dopo e non risaliva: sull'account non arrivava mai, e cancellando i dati del browser spariva.
- Ora al primo collegamento **tutto quello che non è mai arrivato sul server viene spedito**, e l'app te lo dice.
- Sale **solo** ciò che non ha mai raggiunto il server: quello che hai cancellato da un altro telefono non risorge.
- Se anche quella spedizione fallisce, resta in attesa e riparte al collegamento dopo.

### Un salvataggio fallito non si spaccia più per riuscito
Correggendo il punto sopra ci avevo messo io un difetto peggiore: il dato veniva marcato «arrivato sul server» **prima** di sapere se la scrittura era andata a buon fine. Con la rete giù risultava sincronizzato senza esserlo, e non sarebbe più risalito. L'ha trovato la prova che avevo appena scritto. Ora il bollo si mette solo dopo la conferma del server.

### Quello che invece era già a posto
- Le modifiche in coda partono subito quando l'app va in secondo piano o viene chiusa: non si perde l'ultimo ritocco.
- Un aggiornamento che arriva da un altro dispositivo **non sovrascrive** quello che stai scrivendo in quel momento.
- Tre modifiche di fila allo stesso campo mandano al server solo l'ultimo valore.
- Dopo la risalita l'app non rispedisce tutto a ogni aggiornamento.

### Note tecniche
- Ogni dato porta ora un bollo `syncedAt`, messo solo dopo conferma del server, che distingue «mai arrivato» da «cancellato altrove».
- Due nuove suite: `test-persist.mjs` (41 campi con ricarica) e `test-sync.mjs` (10 prove con finto Firestore).
- Cache del service worker a `grimorio-v5-0`.
- Le nove suite precedenti e l'audit telefono passano tutti, 0 errori.

## v4.9 — 27 agosto 2026
**Revisione completa dell'uso da telefono.**

Ho aperto ogni schermata e ogni finestra dell'app su tre misure di telefono (360, 390 e 430 pixel di larghezza) — 99 schermate in tutto — cercando quello che sul telefono non va: roba che esce dallo schermo, testi tagliati, tasti troppo piccoli per il pollice, comandi coperti da qualcos'altro. Sono uscite **1047 segnalazioni**; dopo le correzioni ne restano 4, tutte cosmetiche.

### La barra di navigazione usciva dallo schermo
Il difetto peggiore, e c'era da sempre: la barra in basso aveva larghezza «tutto lo schermo» **più** i margini laterali, quindi era 24 pixel più larga della finestra e sbucava a destra su ogni telefono. Ora i margini li fa il contenitore e la barra sta dentro.

### Il dado galleggiante copriva i comandi
Nelle liste lunghe il dado in basso a destra restava piantato sopra la colonna dei tasti: nello zaino copriva il tasto per eliminare, nella scheda copriva i punteggi, all'iniziativa copriva un pulsante.
- Ora **scorrendo verso il basso il dado si toglie di mezzo** e torna appena ti fermi o risali.
- Sotto i 400 pixel di larghezza è anche un po' più piccolo.
- In fondo a ogni schermata c'è più aria, così l'ultima riga non gli finisce sotto.

### Eliminare un oggetto non è più un bersaglio da 32 pixel
Il ✕ sulle righe dello zaino era piccolo, distruttivo e proprio sotto il dado. È stato tolto: si elimina dalla finestra dell'oggetto, dove ora c'è **Elimina** accanto a Salva.

### Punti ferita sui telefoni stretti
La riga −5 / − / campo / + / +5 non ci stava in larghezza e i tasti finivano fuori. Sotto i 400 pixel il campo dei punti ferita prende tutta la riga e i cinque tasti si dispongono sotto, larghi uguali.

### Tasti più facili da centrare col pollice
Ingranditi: i pallini degli slot incantesimo (27 → 32), l'interruttore «indossato» e i tasti tondi dello zaino (32 → 36), il ✦ per aggiungere nelle liste (34 → 38), le etichette e i filtri (32/34 → 38/40), le linguette delle schede, e i tasti in cima alla scheda sui telefoni stretti (34 → 38).

### Dettagli
- Un messaggio di conferma lungo diventava un muro di testo in mezzo allo schermo: ora è limitato a due righe e i messaggi più prolissi sono stati accorciati.
- Nei menù a tendina il testo lungo finiva sotto la freccetta.
- Nel creatore, l'opzione «Martello da guerra (se competente)» ripeteva sé stessa nel sottotitolo.

### Note tecniche
- L'audit è ora uno strumento riutilizzabile (`/root/t/audit`): rigenera le 99 schermate e il rapporto a ogni modifica.
- Cache del service worker a `grimorio-v4-9`.
- Le nove suite di regressione (4.0 → 4.8) passano tutte, 0 errori.

## v4.8 — 27 agosto 2026
**Il PDF si carica da qualsiasi tasto, e l'app si accorge da sola di essere vecchia.**

### Il PDF non veniva proposto
Segnalato: premendo «Importa» il selettore mostrava solo i file di testo, il PDF non era selezionabile. Il tasto per i PDF esisteva, ma era quello **accanto**: chi premeva «File JSON» si trovava un selettore che i PDF li scartava. Colpa mia, non di chi lo usa.
- Ora il selettore accetta **PDF e JSON insieme**, e se scegli un PDF l'app lo passa da sola al lettore apposta. Qualunque tasto premi, funziona.
- Il tasto dedicato «📄 Da un PDF» resta, per chi lo cerca.
- Un PDF corrotto o troncato non fa più danni: te lo dice e basta.

### L'app installata restava indietro
Un'app aggiunta alla schermata del telefono può restare ferma a una versione vecchia per giorni, perché il browser ricontrolla gli aggiornamenti quando gli pare. Era questo il motivo per cui una novità appena messa online poteva non comparire.
- Ora il controllo lo chiede l'app: all'avvio e ogni volta che torna in primo piano (non più di una volta al minuto).
- Quando la versione nuova è pronta compare una **striscia dorata in cima** con «Aggiorna ora», che resta lì finché non la tocchi — prima era un messaggio che spariva da solo dopo pochi secondi.

### Note tecniche
- Cache del service worker a `grimorio-v4-8`.
- Test automatici: 7 controlli nuovi (instradamento dei PDF da qualsiasi ingresso, file rotti, striscia di aggiornamento, controllo non martellante) più le regressioni di 4.0 → 4.7. 0 errori.

## v4.7 — 27 agosto 2026
**Gli incantesimi si caricano direttamente da un PDF.**

### Perché così
L'app pubblica può contenere solo l'SRD, che è sotto licenza libera. Tutto il resto — i manuali che hai comprato — resta roba tua: va nel **tuo account**, non nel sito. Finora per farlo serviva un file JSON. Ora basta il PDF.

### Lettore di PDF (`spell-pdf.js`)
- Da **Opzioni → Incantesimi → Importa → 📄 Da un PDF**: scegli il file, eventualmente restringi le pagine, e l'app legge tutto sul tuo dispositivo.
- Riconosce **nome, livello, scuola, tempo di lancio, gittata, componenti (materiali compresi), durata, testo e «ai livelli superiori»**.
- **Due colonne**: le pagine impaginate su due colonne venivano lette a zigzag, mescolando il testo di un incantesimo con quello accanto. Ora le colonne vengono separate guardando dove stanno davvero le parole sulla pagina.
- **Parole spezzate**: certi PDF infilano uno spazio dentro le parole, sempre dopo la stessa lettera («c rac kling» invece di «crackling»). L'app capisce da sola qual è la lettera colpevole e ricuce, usando il documento stesso come vocabolario per non incollare quello che va lasciato staccato: «magic al» diventa «magical», ma «magic item» resta «magic item». Su un file di prova ha ricucito il 90% dei tagli senza rovinare nulla.
- Le intestazioni di sezione non vengono più scambiate per incantesimi.

### Cosa vedi prima di importare
- L'anteprima di sempre: quanti ne ha letti, quanti sono **nuovi**, quanti **ci sono già nell'SRD** (saltati in automatico) e quanti aggiornano i tuoi.
- Scegli tu cosa importare; quello che entra è modificabile come qualsiasi incantesimo tuo, si sincronizza sull'account e compare nel grimorio e nella ricerca globale.

### Note tecniche
- Nuovo file: `spell-pdf.js`, che usa il lettore PDF già presente. Cache del service worker a `grimorio-v4-7`.
- Test automatici: 10 controlli nuovi eseguiti su un PDF vero di 135 pagine (colonne non mescolate, campi giusti su un incantesimo noto, parole ricucite senza danni, anteprima corretta) più le regressioni di 4.0 → 4.6. 0 errori.

## v4.6 — 27 agosto 2026
**Armi, armature ed equipaggiamento veri. E un difetto del tasto Indietro che stava lì da un pezzo.**

### Tabelle dell'SRD (`gear-data.js`, `gear.js`)
- **37 armi** con dado dei danni, tipo di danno, categoria, proprietà (accurata, pesante, versatile, portata, lancio, ricarica, munizioni…), costo e peso.
- **13 armature e scudi** con Classe Armatura, tetto di Destrezza, requisito di Forza e svantaggio a Furtività.
- **131 voci di equipaggiamento**: attrezzatura, attrezzi da lavoro, strumenti musicali, munizioni, focus, cavalcature e veicoli, tutti con costo e peso.
- Si sfogliano dal **Tavolo** o dallo **Zaino** di ogni personaggio, con tre schede, filtri e ricerca in italiano e in inglese.

### Numeri già fatti, non da copiare
- Sfogliando le armi con un personaggio aperto, accanto a ognuna c'è **il tuo tiro per colpire**: l'app sceglie da sola fra Forza e Destrezza per le armi accurate e a distanza, e aggiunge il bonus di competenza solo se sei competente.
- Il tasto **⚔️** trasforma l'arma in una riga d'attacco già calcolata, danni compresi, e la mette nello zaino.
- Accanto alle armature c'è **la Classe Armatura che ti darebbero**, col tetto di Destrezza già applicato. Il tasto **🛡️** te la fa indossare e aggiorna la CA, sommando lo scudo se lo porti e avvisandoti se non hai la Forza richiesta.

### Creatore guidato
- Dove prima scriveva «un'arma da guerra a scelta», ora **te la fa scegliere davvero**, con dado dei danni sotto gli occhi.
- Il personaggio finito arriva con la **CA calcolata dall'armatura del pacchetto** (scudo compreso) e con le **righe d'attacco già pronte** per le armi che ha in mano.

### Un difetto del tasto Indietro
Cercando questa roba ne è saltato fuori uno vecchio: chiudere una finestra e aprirne subito un'altra faceva perdere una voce di cronologia, e da telefono il tasto Indietro poteva buttarti **fuori dall'app** invece di riportarti indietro di un passo. Succedeva in diversi punti (dopo aver messo un oggetto nello zaino, dopo aver scelto a chi darlo). Ora la voce viene ripresa appena la chiusura atterra.

### Note tecniche
- Nuovi file: `gear-data.js`, `gear.js`. Cache del service worker a `grimorio-v4-6`.
- Corretto anche il confronto dei nomi fra i pacchetti di partenza e le tabelle: «Cotta di maglia» e «Cotta di Maglia» non si riconoscevano, e l'armatura iniziale non veniva contata nella CA.
- Test automatici: 17 controlli nuovi più le regressioni di 4.0 → 4.5. 0 errori.

## v4.5 — 27 agosto 2026
**202 oggetti magici dell'SRD, con la sintonizzazione tracciata.**

### Archivio degli oggetti magici
- Nuovo `magic-items-data.js`: 202 oggetti magici dell'SRD 5.1 con nome italiano e inglese, tipo, rarità, cariche e cosa fanno. Pozioni, pergamene, armi e armature magiche, anelli, bacchette, bastoni, verghe e oggetti meravigliosi.
- Si sfogliano dal **Tavolo → 💍 Oggetti magici SRD** o dallo **Zaino** di ogni personaggio.
- Filtri per tipo e per rarità, più un filtro per i soli oggetti che richiedono sintonizzazione. Ricerca in italiano e in inglese, anche dentro le descrizioni.
- Il pallino a sinistra è colorato per rarità: verde per i non comuni, blu per i rari, viola per i molto rari, oro per i leggendari.

### Sintonizzazione, quella vera
- Gli oggetti che la richiedono mostrano il fulmine ⚡ nello zaino: un tocco e ti ci sintonizzi.
- Il limite è **3 oggetti per personaggio**, come da regole, e l'app te lo fa rispettare: al quarto ti dice con cosa sei già sintonizzato invece di lasciartelo sbagliare.
- In cima allo zaino compare il contatore con l'elenco di quello a cui sei legato.

### Dettagli
- Mettendo un oggetto nello zaino, rarità, sintonizzazione e cariche finiscono da sole nelle sue note; il **?** accanto all'oggetto riapre la scheda con cosa fa.
- Con più personaggi in gioco, l'app ti chiede a chi darlo mostrando quanti oggetti ha già sintonizzato.
- Gli oggetti magici entrano nella ricerca globale e nell'export PDF della scheda.

### Note tecniche
- Nuovi file: `magic-items-data.js`, `magic-items.js`. Cache del service worker a `grimorio-v4-5`.
- Test automatici: 14 controlli nuovi più le regressioni di 4.0 → 4.4. 0 errori.

## v4.4 — 27 agosto 2026
**Background completi, sesso del personaggio, barra dell'esperienza. E una revisione a tappeto di come la scheda entra nell'app.**

### Il Monello mancante
- La causa: nell'app c'erano **due liste di background** che si erano allontanate fra loro. Quella vera ne aveva 13, quella usata dalla scheda e dall'import solo 12 — mancava il Monello, e due nomi erano scritti con maiuscole diverse, così l'import non li riconosceva.
- Ora la lista è **una sola**, e ci finiscono dentro anche i background che ti sei scritto tu: compaiono nella scheda, nel creatore e nell'import.
- Nella creazione manuale se ne vedevano solo 6: ora ci sono tutti.
- L'import riconosce i background scritti **in inglese** (Urchin, Folk Hero, Guild Artisan…), con le maiuscole a caso o troncati, e li riporta al nome italiano giusto.

### Sesso del personaggio
- Nuovo campo con Maschio / Femmina / Altro: si mette dalla scheda (Storia → Aspetto), dal creatore guidato o dalla creazione manuale, e si toglie ritoccando la stessa voce.
- L'import lo legge comunque sia scritto sulla scheda: M, F, maschio, female, uomo, donna…
- Finisce anche nel PDF, insieme al resto dell'aspetto.

### Barra dell'esperienza
- Sulla panoramica compare quanto manca al livello successivo, con le soglie ufficiali dell'SRD (300, 900, 2.700… fino a 355.000).
- **＋ Esperienza** apre un pannellino per correggere il totale o aggiungerne al volo (+25, +50, +100, +250, +500, +1000), con l'anteprima di dove arrivi.
- Quando superi la soglia la barra si accende e compare **«Puoi salire al N° livello»**, che porta dritto alla salita guidata; se l'aggiunta ti fa cambiare livello, la salita si apre da sola.
- Chi gioca a traguardi non se la ritrova davanti: finché non metti dei punti resta un invito discreto.

### Revisione della corrispondenza scheda → app
Ho ricontrollato campo per campo, e sono venuti fuori due errori miei nell'export PDF introdotti con la 4.2:
- Gli **attacchi** stampavano il bonus da un campo che non esiste (`bonus` invece di `atk`): sul PDF la colonna era vuota.
- Le **risorse** leggevano `current/max` invece di `left/total`: stampavano sempre "0/0". Ora mostrano anche quando si ricaricano (riposo breve, lungo, all'alba).
Aggiunti al PDF anche: **ritratto del personaggio** in alto (se ce l'hai), allineamento, punti esperienza con la soglia del livello dopo, secondo dado vita per i multiclasse e simbolo della fazione.
- L'import non importa più valori d'esperienza che numeri non sono (su una scheda vera c'era scritto "NB"), e se la soglia del livello dopo manca la calcola da solo.
- Verificato su una scheda vera: 549 campi letti, 13 incantesimi su 14 riconosciuti — il quattordicesimo è *Hex*, che non è nell'SRD e quindi giustamente resta da sistemare a mano.

### Note tecniche
- Nuove tabelle in `rules-data.js`: `XP_THRESHOLDS`, `BACKGROUND_EN`, `SEXES`, con `matchBackground()`, `matchSex()`, `xpForLevel()`, `xpForNextLevel()`, `levelFromXp()`.
- Test automatici: 18 controlli nuovi (compreso l'import della scheda vera e la generazione del PDF col ritratto) più le regressioni di 4.0, 4.1, 4.2 e 4.3. 0 errori.
- Cache del service worker a `grimorio-v4-4`.

## v4.3 — 27 agosto 2026
**Creazione più fluida, archetipi chiari, compagni con tutto in vista.**

### Niente più salti in cima
- Il difetto peggiore era questo: ogni volta che sceglievi qualcosa dentro una finestra, l'app ridisegnava tutto e ti riportava all'inizio. Ora la posizione resta dov'era, e il cursore resta nel campo in cui stavi scrivendo, lettera dopo lettera.
- Cambiare passo del creatore, aprire una finestra nuova o filtrare una lista riparte dall'alto — perché lì è giusto così.

### Il tasto «Avanti» mancante
- Il passo dell'equipaggiamento non aveva i tasti di navigazione: si arrivava lì e la creazione si piantava. Corretto, e ora c'è un test che controlla **tutti** i passi uno per uno perché non ricapiti.

### Archetipi (sottoclassi)
- Ogni archetipo si vede **già aperto**, con i privilegi che dà fino al tuo livello: scegli sapendo cosa prendi, senza dover cliccare.
- Detto chiaro perché ce n'è uno solo per classe: è l'unico che la licenza libera (SRD) permette di includere. Gli altri sono materiale dei manuali.
- Tasto in evidenza per **crearti il tuo** dal libro che hai: lo scrivi una volta e resta lì, e viene selezionato subito.
- Nuova opzione **«Decido dopo»**: non resti più bloccato: potrai sceglierlo quando sali di livello.

### Compagni e forme selvatiche
- Ogni compagno mostra ora **tutto senza aprire nulla**: caratteristiche con i modificatori, CA, GS, taglia, velocità, sensi, abilità, tratti e azioni con i tiri di attacco e danno già pronti.
- Punti ferita con i tasti −5 / − / + / +5 direttamente sulla carta.
- Chi è **in forma** resta sempre aperto e si riconosce dal bordo verde: durante la trasformazione hai gli attacchi dell'animale sotto il dito.
- Gli altri si aprono e chiudono con un tocco sul nome.

### Barra della scheda più pulita
- Su telefono era diventata affollata e il livello finiva tagliato. Ora restano il nome, il riposo e un menù **⋯** con salita di livello, esportazione in PDF, modifica, ritratto e cambio personaggio.
- Il bonus di competenza si è spostato nella panoramica, insieme a tiro salvezza su Costituzione (quello per la concentrazione) e CD degli incantesimi.

### Note tecniche
- Test automatici: 14 nuovi controlli su fluidità e navigazione (posizione dello scorrimento al pixel, cursore nei campi, presenza dei tasti in ogni passo) più le regressioni di 4.0, 4.1 e 4.2. 0 errori.
- Cache del service worker a `grimorio-v4-3`.

## v4.2 — 27 agosto 2026
**Scheda esportabile in PDF e diario di campagna.**

### Esporta la scheda in PDF (`pdf-export.js`)
- Nuovo tasto **📄** nella barra della scheda: genera un PDF A4 pulito, pensato per essere stampato o mandato al master.
- Ci finisce dentro tutto: caratteristiche e modificatori, tiri salvezza e abilità (con competenza e competenza doppia segnate), CA, iniziativa, velocità, competenza, percezione passiva, punti ferita e dadi vita, attacchi, risorse, condizioni attive, competenze e lingue, incantesimi divisi per livello con preparati e concentrazione, zaino con pesi e monete, compagni e forme, privilegi e tratti, storia e aspetto.
- Impaginazione che va a capo e cambia pagina da sola: nessun testo esce dal foglio e non restano righe orfane in cima alla pagina.
- Nomi con emoji o simboli strani non fanno più fallire l'esportazione: vengono convertiti o tolti.
- Il file si chiama col nome del personaggio e il livello, così l'archivio resta in ordine.

### Diario di campagna (`journal.js`)
- Nuova scheda **📓 Diario** nel Tavolo: una voce per sessione con numero, data, titolo e il racconto di cosa è successo.
- Il numero di sessione si incrementa da solo; la data parte da oggi.
- **Etichette**: trama, PNG, luogo, bottino, missione, scontro, da chiarire — con filtri e contatori in cima.
- **Chi c'era**: segni i personaggi presenti e li ritrovi sulla voce.
- Ricerca dentro titoli e testo, ed **esportazione** del diario in un file di testo da incollare dove vuoi.
- Le voci si sincronizzano come il resto ed entrano nel backup completo e nella ricerca globale.

### Note tecniche
- Nuovi file: `pdf-export.js`, `journal.js`. Cache del service worker a `grimorio-v4-2`.
- `pdf-lib` era già presente per leggere le schede: ora serve anche a scriverle, e resta caricato solo quando serve.
- Test automatici: 14 controlli nuovi (PDF vero generato e riletto, diario completo) più le regressioni delle versioni 4.0 e 4.1. 0 errori.

## v4.1 — 27 agosto 2026
**Salita di livello guidata, equipaggiamento iniziale, ricerca globale.**

### Salita di livello (`levelup.js`)
- Nuovo tasto **📈** nella barra della scheda: ti porta dal livello attuale al successivo spiegandoti cosa cambia.
- Punti ferita: scegli la **media fissa** oppure **tiri il dado vita** (con il modificatore di Costituzione già dentro).
- I **privilegi nuovi** di quel livello — di classe e di sottoclasse — vengono scritti da soli sulla scheda.
- Quando tocca la **sottoclasse**, la salita non parte finché non la scegli (comprese quelle che ti sei creato tu).
- Ti dice anche cosa devi scegliere tu: aumenti di caratteristica, slot nuovi, trucchetti e incantesimi in più — e a fine salita ti porta nella scheda delle magie.
- Se la scheda è stata scritta a mano o importata da un PDF, ti chiede **una volta sola** a quale classe agganciarla e se la ricorda.
- Piccola festa di scintille (e vibrazione) a ogni livello.

### Equipaggiamento iniziale nel builder
- Nuovo passo del creatore guidato: le scelte di equipaggiamento dell'SRD per tutte e 12 le classi, con i pacchetti completi (esploratore, dungeon, sacerdote, studioso, scassinatore, diplomatico, intrattenitore).
- Vedi in tempo reale quanti oggetti e quanti kg ti porti dietro; l'equipaggiamento del background entra come voce a parte.
- Si può **spegnere** con un interruttore, se il tuo master preferisce darti l'oro iniziale.

### Ricerca globale
- Tasto **🔍** in cima al party (o `/` e `Ctrl+K` da computer): un solo campo per personaggi, incantesimi, bestiario SRD, i tuoi PNG, le condizioni e le tue aggiunte personali.
- I risultati sono divisi per gruppo e portano direttamente alla scheda giusta.

### Comodità in sessione
- **Cambio rapido di personaggio**: tocchi il nome in cima alla scheda e salti su un altro senza tornare al party (con PF e livello a colpo d'occhio).
- **Schermo sempre acceso**: nuova opzione, il telefono non si spegne durante la partita.
- **Vibrazione sui tiri**: colpetto discreto sui tiri normali, festa sui 20 naturali, tonfo sui fallimenti critici. Si spegne dalle Opzioni.

### Note tecniche
- Nuovo file: `levelup.js`. Nuove tabelle `CLASS_KITS` e pacchetti in `rules-data.js`. Cache del service worker a `grimorio-v4-1`.
- Test automatici: 18 controlli su bestiario e compagni + 16 sulle novità, telefono e desktop, 0 errori.

## v4.0 — 27 agosto 2026
**Bestiario SRD, compagni animali e condizioni.**

### Bestiario SRD (78 creature)
- Nuovo archivio `monsters-data.js` con 78 creature dell'SRD 5.1, nomi in italiano, statistiche complete, tratti e azioni.
- Nuovo sfogliatore (`bestiary.js`): si apre dal Tavolo con **🐉 Sfoglia il bestiario SRD**. Ricerca in italiano e in inglese, filtri per tipo (bestia, umanoide, non morto, mostruosità, gigante, drago, folletto, melma) e badge del grado di sfida.
- Scheda della creatura con **tiri diretti**: punti ferita tirati sui dadi vita, tiro per colpire e tiro dei danni per ogni azione.
- Da ogni creatura: **✦ nel tuo bestiario** (diventa un PNG modificabile) oppure **all'iniziativa**, dove entra in campo con i PF tirati sul momento e l'iniziativa già calcolata.

### Compagni, famigli e forme selvatiche
- Nuovo blocco **Compagni e forme** nella panoramica di ogni personaggio.
- Cinque tipi: **forma selvatica**, **famiglio**, **compagno animale**, **cavalcatura**, **evocazione** — ognuno pescato direttamente dal bestiario.
- **Druidi**: il tasto Forma selvatica compare solo a loro e il bestiario è già filtrato sul limite del livello (GS 1/4 fino al 3°, GS 1/2 dal 4°, GS 1 dall'8°), con il promemoria delle velocità consentite.
- **Famigli**: la lista mostra solo le 13 creature ammesse da *trova famiglio*.
- Ogni compagno ha i suoi punti ferita, con barra e pulsanti di cura/danno, e la sua scheda completa con i tiri.
- **Trasformazione**: tocchi 🐾 e sopra la scheda compare la fascia verde con la forma attiva, CA e PF della bestia; i PF si azzerano e si ricaricano a ogni trasformazione, come da regole. Torni normale con un tocco.

### Condizioni
- 14 condizioni dell'SRD (accecato, afferrato, affascinato, assordato, avvelenato, incapacitato, invisibile, paralizzato, pietrificato, privo di sensi, prono, spaventato, stordito, trattenuto).
- Si applicano dalla panoramica: ogni condizione mostra cosa comporta, resta visibile come etichetta rossa sulla scheda e si toglie con un tocco.

### Note tecniche
- Nuovi file: `monsters-data.js`, `bestiary.js`. Aggiunti alla cache del service worker (`grimorio-v4-0`).
- Test automatici su telefono (390×844) e desktop (1440×900): 18 controlli, 0 errori.

## v3.2 — 27 agosto 2026
I tuoi contenuti: sottoclassi, razze e background che non sono nell'SRD.

### 📚 Come funziona
Nuova sezione **Opzioni → Contenuti tuoi**. Aggiungi quello che ti serve dai manuali che possiedi, e compare nella creazione guidata accanto ai contenuti di serie, marcato con ✦. Puoi aggiungerlo anche al volo mentre crei un personaggio: nei passi Razza, Sottoclasse e Background c'è il pulsante per crearne uno nuovo, e al salvataggio torni dove eri con la voce già selezionata.

### Tre modi per inserirlo
- **A mano** — nome, fonte, classe di appartenenza, e le righe dei privilegi con il loro livello. Per le razze: velocità, taglia, bonus alle caratteristiche, lingue, competenze concesse e tratti. Per i background: le due abilità, strumenti, lingue, privilegio ed equipaggiamento.
- **Incolla il testo** — incolli il blocco e il Grimorio prova a dividerlo in privilegi, riconoscendo il livello da frasi come "Al 6° livello" o "A partire dal 3° livello". Vedi l'anteprima di quello che ha capito prima di accettarla, e correggi quello che serve.
- **Da PDF** — scegli il file, indichi le pagine e viene estratto il testo (ricostruendo gli a capo dalla posizione delle righe, altrimenti diventa un blocco illeggibile), poi passa allo stesso riconoscimento. Se il PDF è una scansione senza testo te lo dice.

### 🔒 Una precisazione
Il Grimorio **non contiene** materiale dei manuali non aperti: Xanathar's, Tasha's e il PHB oltre l'SRD non sono e non saranno inclusi, perché non hanno una licenza che lo permetta. Questa funzione è il contrario: sei tu a inserire quello che possiedi, resta sul tuo account, non viene condiviso con nessuno. Puoi esportarlo in un file per passarlo al tuo gruppo.

### 🧰 Tecnico
Nuovi file `homebrew.js` e `vendor/pdf.min.js` + `vendor/pdf.worker.min.js` (il lettore di testo dei PDF, caricato solo quando lo usi). I contenuti tuoi si sincronizzano su Firebase come tutto il resto e finiscono anche nel backup completo.

## v3.1 — 27 agosto 2026
Rifiniture trovate usando l'app come un giocatore vero.

Ho creato personaggi da zero, li ho feriti, fatti riposare, riempito lo zaino, portati al tavolo e riletto le schede su telefono e su computer. Non è saltato fuori nessun errore, ma cinque cose davano fastidio:

- **Le note non si leggevano.** Privilegi, tratti razziali e storia stavano in finestrelle da tre righe: per leggere il quarto privilegio dovevi scorrere dentro un riquadro alto due centimetri. Ora tutte le aree di testo si allargano da sole fino a contenere quello che c'è scritto.
- **Elenchi tagliati.** "Armature e armi", "Linguaggi" e "Strumenti" erano campi a riga singola e i valori lunghi finivano fuori vista. Ora vanno a capo.
- **La scheda "Magie" compariva anche ai non incantatori.** Un guerriero aveva una scheda che diceva solo "questo personaggio non lancia incantesimi". Ora appare solo a chi lancia magie (o a chi ne ha comunque in elenco): se cambi il tipo di incantatore ricompare da sola.
- **Aggiungere un attacco era un calcolo a mano.** Ora nel modulo ci sono i **bonus rapidi**: tocchi "Forza +5", "Destrezza +7" o "Magia +8" e il bonus viene inserito già calcolato con competenza e modificatore, insieme a un dado dei danni di partenza.
- **Il builder scriveva la sottoclasse alla rinfusa** in mezzo alle note. Ora è una riga chiara: "Sottoclasse: Campione".

## v3.0 — 27 agosto 2026
Creazione guidata del personaggio.

### ✦ Il builder
Nuovo pulsante **Crea personaggio guidato** nella schermata Party. Sette passi, con la possibilità di tornare indietro in qualsiasi momento:

1. **Razza** — 10 razze con sottorazze, bonus alle caratteristiche applicati da soli, tratti spiegati uno per uno. Le razze con scelte (mezzelfo, umano variante) ti fanno scegliere caratteristiche e abilità con un contatore.
2. **Classe e livello** — 12 classi: dado vita, tiri salvezza, competenze in armi e armature, e l'elenco di **tutti i privilegi che ottieni fino al livello che hai scelto**, con il livello a cui arrivano. Scegli le abilità della classe dalla lista giusta, col numero giusto.
3. **Sottoclasse** — compare solo se il livello la prevede, con i suoi privilegi fino al tuo livello. C'è anche "Altra / la scrivo io" per le sottoclassi non SRD.
4. **Background** — 13 background classici con abilità, strumenti, tratto narrativo ed equipaggiamento iniziale. Se una competenza si sovrappone a quelle già prese, te lo dice invece di lasciartela sprecare.
5. **Caratteristiche** — quattro metodi: **acquisto punti** (27 punti, con il costo crescente e il contatore), **array standard** (15-14-13-12-10-8, ogni valore assegnabile una volta sola), **tiro dei dadi** (4d6 scarta il più basso, sei volte) e **a mano**. I bonus razziali si sommano sotto i tuoi occhi e il totale con modificatore si aggiorna in tempo reale. Ti ricorda anche quanti aumenti di caratteristica ti spettano al tuo livello.
6. **Incantesimi** — solo quelli della tua classe, solo fino al livello di slot che possiedi davvero, con il **conteggio esatto** di trucchetti e incantesimi: conosciuti per bardo, stregone, warlock e ranger; preparati per chierico, druido e paladino (modificatore + livello, minimo uno); nel libro per il mago (6 al 1° livello, +2 per livello). Puoi aprire la scheda di ogni incantesimo mentre scegli.
7. **Riepilogo** — nome, ritratto o simbolo, e l'anteprima completa prima di creare.

### 🧮 Cosa calcola da solo
Punti ferita (massimo al 1° livello, media agli altri, più il bonus del nano delle colline), classe armatura, iniziativa, velocità, dado vita, tiri salvezza competenti, tutte le competenze di abilità sommate da razza, classe e background, tipo di incantatore e caratteristica da lanciatore. Privilegi, tratti razziali, tratto del background e competenze finiscono già scritti nella scheda **Note**.

### 📚 I dati
Nuovo file `rules-data.js`: 10 razze, 12 classi con 194 privilegi divisi per livello, le sottoclassi dell'SRD (Berserker, Collegio del Sapere, Dominio della Vita, Circolo della Terra, Campione, Via della Mano Aperta, Giuramento di Devozione, Cacciatore, Ladro, Discendenza Draconica, L'Immondo, Scuola di Evocazione) e 13 background. I testi sono riassunti scritti per il Grimorio: descrivono le meccaniche, che non sono protette, senza riprodurre il testo dei manuali.

### 📄 File
`index.html` · `app.js` · **`rules-data.js` (nuovo)** · **`builder.js` (nuovo)** · `sw.js`.

## v2.6 — 26 agosto 2026
Rotella del mouse e accesso Google da telefono.

### 🖱️ La rotella non faceva scorrere la pagina
- `overflow-x: hidden` su `html` **e** su `body` trasformava entrambi in contenitori di scorrimento separati: su diversi browser la rotella finiva in quello sbagliato e la pagina restava ferma. Ora si usa `overflow-x: clip`, che taglia l'eccedenza orizzontale **senza** creare quel contenitore (con ripiego automatico su `hidden` sui browser più vecchi).
- La rotella sopra la **barra laterale fissa** (su computer) o sopra lo **sfondo scuro di una finestra** non muoveva niente: ora viene girata sul contenitore giusto, così scorri da qualunque punto.

### 📱 Accesso Google da telefono: la vera causa
Nella versione precedente, prima di aprire la finestra di Google il codice faceva un'attesa (`await`) per impostare la persistenza della sessione. **Safari e i browser mobili consentono di aprire una finestra solo se la richiesta parte dentro il gesto del dito**: quell'attesa spezzava la catena, la finestra veniva interrotta e si tornava alla pagina di prima senza account — esattamente il sintomo descritto.
- Ora la persistenza viene impostata **una volta all'avvio** e la richiesta di accesso parte immediatamente al tocco, senza nessuna attesa in mezzo. Verificato: al momento della chiamata il gesto utente risulta ancora attivo.
- Se la finestra si chiude **da sola entro due secondi e mezzo** (è il browser che l'ha interrotta, non tu) si passa automaticamente al reindirizzamento; se invece l'hai chiusa tu, nessun avviso inutile.

### 🔄 Quando il telefono resta indietro
- La diagnostica ora mostra in cima la **versione dell'app**: se sul telefono non è la stessa del computer, stai ancora usando la copia in cache.
- Nuovo pulsante **🔄 Forza aggiornamento dell'app**: cancella il service worker e tutte le cache e ricarica pulito.

## v2.5 — 26 agosto 2026
Revisione a tappeto: dieci difetti trovati e corretti.

### 🐛 Bug veri, con errore riproducibile
- **Apostrofi nei nomi degli incantesimi spezzavano i pulsanti.** Il nome finiva dentro il codice di un pulsante e un apostrofo lo interrompeva a metà: su "Piaga d'Insetti", "Protezione dall'Energia", "Controllare l'Acqua", "Marchio del Cacciatore" e su qualsiasi incantesimo tuo con un apostrofo, il tasto **Concentrati** non faceva assolutamente niente (errore JavaScript silenzioso). Ora il testo viene messo in sicurezza ovunque venga usato così.
- **Una scheda senza la voce "inventario" faceva sparire tutto il party.** La normalizzazione leggeva l'elenco oggetti prima di averlo creato: l'errore veniva inghiottito e l'app si ritrovava con zero personaggi. Corretto l'ordine, e ora una scheda difettosa viene isolata invece di travolgere le altre.
- **Valori non numerici diventavano NaN.** Con un backup scritto a mano (o venuto da altrove) con `"max": "x"`, i punti ferita mostravano NaN e non si recuperavano più. Ora caratteristiche, PF, CA, velocità e iniziativa vengono riportati a numeri sensati.
- **Svuotare il campo dei PF per riscriverli li azzerava**, facendo comparire i tiri contro morte. Ora il campo vuoto viene semplicemente ignorato finché non scrivi un numero.
- **Un PDF non compilabile dava un messaggio incomprensibile** ("Expected instance of e…"). Ora dice che il file non è valido o è una scansione senza campi.

### ⚙️ Comportamenti sbagliati
- A 0 punti ferita la **concentrazione** ora si interrompe, come da regolamento.
- Gli **slot letti da una scheda PDF** restavano fissi per sempre: c'è un pulsante **↺ Auto** per tornare al calcolo da classe e livello.
- Il filtro **"Preparati"** restava attivo passando da un personaggio all'altro.
- Il **secondo dado vita** del multiclasse si poteva spendere all'infinito: ora è limitato al livello.
- Il **ritratto** viene messo in sicurezza anche quando arriva da un backup esterno.

### ✅ Verifiche fatte
- 304 funzioni, nessuna mancante e nessuna duplicata fra quelle richiamate dai pulsanti.
- Prova con dati ostili: nomi con `<script>`, virgolette e simboli, voci nulle e numeri al posto delle schede. Nessuna esecuzione di codice, nomi mostrati come testo, voci non valide scartate.
- Giro completo dell'app su telefono e su computer: creazione, importazione PDF, tutte e cinque le schede, tiri, riposi, slot, zaino, bestiario, iniziativa, incantesimi personalizzati, liste di classe, backup, tasto indietro e ricarica. **Zero errori.**

## v2.4 — 26 agosto 2026
Accesso Google riparato sui telefoni.

### 🔐 Perché non funzionava
L'app è servita da un dominio (GitHub Pages) diverso da quello di Firebase. Il vecchio flusso usava `signInWithRedirect`, che per completare l'accesso ha bisogno di uno storage di terze parti: Safari su iPhone e i Chrome recenti lo bloccano, quindi il rimbalzo tornava indietro **senza account** e sembrava che il tasto non facesse nulla. Su computer funzionava perché lì veniva usata la finestra popup.

### ✅ Come è stato risolto
- Ora si prova **sempre prima la finestra popup**, che non dipende da quello storage, su telefono come su computer.
- Se il browser la blocca (o non la supporta), si ripiega **da solo** sul reindirizzamento, avvisando.
- Il metodo che ha funzionato viene ricordato per le volte successive.
- La persistenza della sessione viene impostata esplicitamente e viene chiesto quale account usare, così non resta appeso a un account sbagliato.
- Al rientro da un reindirizzamento andato a vuoto l'app **se ne accorge e lo dice**, invece di restare in silenzio.

### 🧭 Aiuti aggiuntivi
- **Browser dentro un'altra app** (Instagram, Facebook, TikTok…): Google rifiuta l'accesso da lì per sua politica. L'app lo riconosce e spiega come aprire il Grimorio in Chrome o Safari, con il link pronto da copiare.
- Se la navigazione privata blocca l'archiviazione, viene detto chiaramente invece di fallire.
- Nuovo pannello **Opzioni → 🔐 Diagnostica accesso**: stato, dominio, dominio Firebase, modalità (browser o app installata), cookie, archiviazione, libreria Firebase, metodo in uso e ultimo errore. Con i due pulsanti per forzare popup o reindirizzamento e il tasto per copiare tutto.
- I messaggi di errore dicono cosa fare: per esempio il dominio esatto da aggiungere fra quelli autorizzati in Firebase.

## v2.3 — 26 agosto 2026
Ritratti dei personaggi e copertura completa della scheda cartacea.

### 📷 Ritratto al posto dell'emoji
- Puoi caricare una foto del personaggio: nel modulo di creazione/modifica, oppure toccando il sigillo in cima alla scheda.
- L'immagine viene ritagliata al centro, ridotta a 320px e salvata insieme al personaggio, quindi si sincronizza su tutti i dispositivi e resta disponibile offline (circa 25 KB l'una).
- Compare nell'elenco del party, nell'intestazione della scheda e nel bestiario: anche i PNG e i mostri possono avere il ritratto.
- Se togli la foto si torna al simbolo scelto.

### 🎒 Zaino completo
- Ogni oggetto ha **peso** e indicatore di **sintonizzazione** (⚡).
- Barra del **peso trasportato** con capacità di carico (di default Forza × 7,5 kg) e avviso di sovraccarico.

### 📋 Campi della scheda che mancavano
- **Competenze in armature e armi** (leggere/medie/pesanti, scudi, armi semplici e da guerra) e svantaggio a Furtività dovuto all'armatura.
- **Consumabili, munizioni e oggetti magici sintonizzati** finiscono nello zaino con le cariche rimaste.
- **Punti esperienza** e "al prossimo livello", nome del giocatore, capacità di carico.
- **Secondo dado vita** per i personaggi multiclasse, spendibile dal riposo breve.
- **Slot incantesimo già usati** letti dalla scheda, non solo i totali.
- **Incantesimi preparati**: le caselle spuntate accanto a ogni riga vengono riconosciute.
- Peso dei singoli oggetti letto dalle colonne della scheda.

### 🔍 Controllo di coerenza
- Dopo la lettura del PDF, se un numero scritto sulla scheda non coincide con quello calcolato dall'app (di solito per bonus da talenti o oggetti) te lo dico nell'anteprima, invece di importare in silenzio un valore diverso.

### ✅ Verifica delle abilità
- Le 18 abilità della scheda ci sono tutte e coincidono una a una (Acrobazia, Addestrare Animali, Arcano, Atletica, Inganno, Storia, Intuizione, Intimidire, Investigare, Medicina, Natura, Percezione, Intrattenere, Persuasione, Religione, Rapidità di Mano, Furtività, Sopravvivenza), con competenza semplice o doppia.

## v2.2 — 26 agosto 2026
Importazione delle schede PDF e scheda personaggio molto più completa.

### ⇪ Importa scheda PDF
- Nuovo pulsante **⇪ Importa PDF** nella schermata Party (e in Opzioni): scegli una scheda del personaggio in PDF compilabile e il Grimorio ne ricava il personaggio completo.
- Legge: nome, razza, classe, livello, background, allineamento, giocatore, PE; tutte e sei le caratteristiche; tiri salvezza e abilità competenti (riconosce anche la **competenza doppia**); CA, iniziativa, velocità, sensi; PF (anche scritti come `40+16`), PF temporanei, dado vita; monete; linguaggi, strumenti, armatura, talenti; attacchi con bonus e danni; risorse con usi limitati e tipo di recupero; equipaggiamento riga per riga; personalità, ideali, legami, difetti, fazione, divinità, nemici; età, altezza, peso, occhi, pelle, capelli e aspetto; note e privilegi.
- **Incantesimi**: capisce la posizione dei riquadri nella pagina magie per dedurre il livello, riconosce i nomi scritti in italiano o in inglese (anche con varianti tipo "Ristorazione minore" → *Ristorare Inferiore*), tiene le tue annotazioni accanto all'incantesimo (📌 "2d8+5 ts sag") e trasforma in incantesimi personalizzati quelli che non sono nell'SRD.
- Legge anche gli **slot dichiarati sulla scheda**, utili per Warlock e multiclasse.
- Anteprima completa prima di creare il personaggio: vedi cosa è stato riconosciuto e cosa no.
- Tutto avviene sul dispositivo: il PDF non viene caricato da nessuna parte.
- Funziona con le schede compilabili italiane (formato "CS") e con quella ufficiale in inglese.

### ⚔️ Attacchi
- Nuovo blocco nella panoramica: nome, bonus per colpire e danni.
- Tocchi il bonus e tiri il d20; tocchi i danni e tira l'espressione (`1d8+3`, `2d6+1d4`), con pulsante **Critico** che raddoppia i dadi.

### 🔦 Risorse con usi limitati
- Elenco di risorse (poteri, cariche, punti stregoneria) con contatore usi, tipo di recupero e ripristino automatico al riposo breve o lungo.

### 📜 Nuova scheda "Note"
- Linguaggi, strumenti, armatura indossata, sensi, talenti, privilegi di classe, note di razza e background, altre note.
- Talenti e privilegi sono stati spostati qui dalla panoramica, che era diventata troppo lunga.

### ✨ Altro
- **Competenza doppia**: il pallino delle abilità ora cicla niente → competente → esperto, con il modificatore calcolato di conseguenza.
- **Ispirazione** e **livello di sfinimento** direttamente in panoramica.
- Storia: sezione aspetto (età, altezza, peso, occhi, pelle, capelli) e legami nel mondo (fazione, divinità, alleati, nemici).
- Le note personali sugli incantesimi si vedono nell'elenco della scheda.
- Gli slot possono seguire una tabella personalizzata invece di quella automatica.

### 📄 File
`index.html` · `app.js` · **`pdf-import.js` (nuovo)** · **`vendor/pdf-lib.min.js` (nuovo)** · `sw.js` — `spells-data.js` e `spells-it.js` invariati.

## v2.1 — 26 agosto 2026
Ampliamento dell'archivio incantesimi.

### 🇮🇹 Nomi in italiano
- Nuovo file `spells-it.js` con la traduzione dei nomi di tutti e 319 gli incantesimi SRD.
- La ricerca trova sia in italiano sia in inglese, e ignora accenti e apostrofi: "palla di fuoco", "Fireball", "invisibilita" funzionano tutti.
- Nelle liste si legge il nome italiano, con quello inglese sotto in piccolo. Interruttore 🇮🇹/🇬🇧 nell'intestazione del Grimorio e in Opzioni.
- Le descrizioni restano in inglese: è il testo ufficiale su licenza OGL.

### ⤒ Importazione di massa
- Nuovo pulsante **Importa** nel Grimorio e in Opzioni: carichi un file `.json` (o incolli il testo) e aggiungi centinaia di incantesimi in un colpo.
- Riconosce da solo i formati più diffusi: Grimorio, Open5e v1 e v2, 5e-bits/5e-database, oppure un semplice elenco con almeno il campo `name`.
- Riconosce i nomi delle classi in italiano e in inglese, deduce le componenti V/S/M, la concentrazione e i rituali.
- Anteprima prima di importare: quanti nuovi, quanti già tuoi, quanti già presenti nell'SRD (con interruttore per saltarli).
- Reimportare lo stesso file aggiorna invece di creare doppioni.
- Salvataggio su Firebase a blocchi (batch), veloce anche con centinaia di incantesimi.
- **Esporta i tuoi**: metti i tuoi incantesimi in un file da condividere o rimettere su un altro dispositivo.
- **Rimuovi gli importati**: ripulisce in un colpo solo quelli arrivati da file, lasciando quelli scritti a mano.

### 🏷️ Liste di classe modificabili (Artificiere)
- Nell'SRD nessun incantesimo è marcato "Artificiere": il filtro esisteva ma restituiva sempre zero risultati.
- Ora da ogni incantesimo puoi aprire **🏷️ Liste di classe** e decidere a quali classi appartiene nella tua campagna. La modifica è tua e si sincronizza sull'account.
- Lo stato vuoto del filtro ora spiega cosa fare invece di dire solo "nessun risultato".

### ✍️ Modulo manuale più rapido
- **Parti da un incantesimo esistente**: cerchi un incantesimo simile e ne crei una variante con tutti i campi già compilati.
- **Modifica** di un incantesimo personalizzato già salvato (prima si poteva solo eliminare e riscrivere).
- Pulsanti rapidi per tempo di lancio, gittata e durata (1 azione, azione bonus, contatto, 18 metri, concentrazione…).
- **Salva e creane un altro**: mantiene livello, scuola e classi per inserirne tanti di fila.
- Campi materiali e "ai livelli superiori" anche nel modulo manuale.

### 🐛 Corretto
- Il titolo dei pannelli copriva i pulsanti in alto a destra (tema e lingua): non erano cliccabili nella zona centrale.
- Nome e dettaglio degli incantesimi finivano sulla stessa riga in alcune liste.

### 📄 File
`index.html` · `app.js` · `sw.js` · **`spells-it.js` (nuovo)** — `spells-data.js` non è stato modificato.

## v2.0 — 26 agosto 2026
Restyle grafico completo, correzione bug, nuove funzioni.

### 🎨 Grafica ("Grimorio di Mezzanotte")
- Tema scuro come predefinito (inchiostro, oro brunito, arcano viola); il tema chiaro diventa una vera pergamena.
- Grana di pergamena, vignettatura e braci fluttuanti animate sullo sfondo (disattivate se il sistema chiede meno animazioni).
- Nuova tipografia: Cinzel Decorative per il marchio, Cinzel per i titoli, Lora per i testi, Manrope per numeri e interfaccia.
- Intestazioni a "cornice" con filetto dorato, cornici angolari, divisori a filigrana.
- Sigilli delle caratteristiche ridisegnati, rune degli slot con bagliore arcano, dado esagonale animato per i tiri.
- Card, pulsanti, chip, campi e barre PF ridisegnati con profondità e bordi dorati.

### 🐛 Bug corretti
- **Il combattimento e la cronologia dadi non venivano mai salvati**: le funzioni esistevano ma non erano richiamate. Ora l'iniziativa sopravvive a un cambio schermata o a una ricarica.
- **App bloccata sul caricamento** se Firebase non si caricava (offline, rete lenta, blocco tracker): ora c'è un controllo + timeout di sicurezza a 6 secondi e l'app parte in modalità locale.
- **Stili mancanti** per la barra di stato salvataggio e il banner offline (erano generati dal codice ma non esistevano nel CSS).
- **Modalità "aggiungi incantesimo" che restava incastrata**: uscendo dal Grimorio la selezione non si annullava e riaprendo si leggeva "Aggiungi a undefined".
- **PF attuali sopra il massimo**: abbassando i PF max il valore attuale non veniva ridotto; ora sì (e i PF temporanei assorbono i danni per primi, come da regolamento).
- **Slot spesi oltre il massimo** dopo un calo di livello: il conteggio ora viene limitato.
- `applyClassDefaults` non veniva mai applicata alla creazione (condizione invertita): scegliendo la classe ora si impostano tipo incantatore, caratteristica, dado vita e tiri salvezza competenti.
- La schermata Opzioni mostrava una scheda account vuota anche senza login.
- Selezioni `oninput` su `<select>` sostituite con `onchange` (non affidabili su alcuni browser).
- Sincronizzazione: la fusione locale/remoto non sovrascrive più un dato remoto più recente in caso di parità di timestamp.
- Elenco incantesimi: rimosso il tetto artificiale a 350 risultati; ordinamento per livello e nome.
- Componenti degli incantesimi ora leggibili ("V, S, M (materiale)") invece di "VSM".

### 📱 Uso da telefono
- **Tasto Indietro di Android** finalmente funzionante: chiude la finestra aperta o torna alla schermata precedente invece di uscire dall'app.
- Tasto **Esc** per chiudere le finestre su PC.
- **Niente più ridisegno completo** a ogni tocco: competenze, slot, oggetti equipaggiati e stelle "preparato" si aggiornano sul posto, senza salti di scorrimento né tastiera che si chiude.
- Zoom della pagina di nuovo consentito (era bloccato: problema di accessibilità).
- Barra di navigazione presente anche dentro la scheda personaggio.
- Tastiera numerica su tutti i campi numerici; campi ingranditi a 16px per evitare lo zoom automatico di iOS.
- Salvataggio immediato quando l'app va in background (chiusura dal telefono).
- Service worker migliorato: font in cache separata, navigazioni "network-first", installazione robusta anche se manca un file.
- Scorciatoie tenendo premuta l'icona dell'app: Dadi, Grimorio, Tavolo del Master.

### 💻 Uso da PC
- Sopra i 900px la navigazione diventa una barra laterale e i contenuti si dispongono su due colonne (tre sopra i 1240px).
- Party, bestiario e compendio incantesimi in griglia a più colonne.
- Le finestre diventano dialoghi centrati invece di pannelli dal basso.

### ✨ Funzioni nuove
- **Tiri rapidi**: tocchi un'abilità, un tiro salvezza, una caratteristica, l'iniziativa o l'attacco con incantesimo e tiri il d20 col modificatore già applicato; dalla schermata del risultato puoi ritirare con vantaggio o svantaggio. Critico e fallimento critico evidenziati.
- **Riposo breve e lungo**: spesa dei dadi vita con tiro automatico (+ modificatore di Costituzione), recupero slot del Patto per i Warlock, riposo lungo che ripristina PF, slot, metà dei dadi vita e azzera i tiri contro morte.
- **Tiri salvezza contro morte** con i tre pallini di successo/fallimento e tiro automatico (naturale 20 = torni cosciente, naturale 1 = due fallimenti).
- **Backup**: esporta tutto in un file JSON e reimportalo quando vuoi (anche su un altro dispositivo, senza account).
- **Borsa**: monete di platino, oro, elettro, argento e rame nella scheda Zaino.
- **Incantesimi preparati**: stella per marcarli e filtro dedicato.
- **Concentrazione**: banner in cima alla scheda magie, si attiva dal dettaglio dell'incantesimo.
- **Percezione passiva** calcolata automaticamente.
- **Duplica** personaggio e PNG.
- Iniziativa: turno precedente, aggiunta di tutto il party in un tocco, modifica di iniziativa e PF di un combattente, i PF sincronizzati con la scheda del personaggio/PNG, segnalino 💀 a 0 PF.
- Dadi: tiro con dettaglio dei singoli risultati, cronologia con possibilità di svuotarla, tiro casuale crittografico.
- Incantesimi personalizzati: campi materiali e "ai livelli superiori", scelta di tutte e 9 le classi.

### 📄 File
`index.html` · `app.js` · `sw.js` · `manifest.json` — `spells-data.js` non è stato modificato.
