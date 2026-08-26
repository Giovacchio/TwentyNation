# Grimorio — lista dei cambiamenti

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
