# Grimorio — lista dei cambiamenti

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
