# TwentyNation — punto della situazione

**Versione corrente: 6.4** · app in `github.com/Giovacchio/TwentyNation`, online su
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
| `cestino.js` | cestino a 30 giorni e «salute dei dati» |
| `turno.js` | «Il tuo turno» |
| `meccaniche.js` | effetti delle sottoclassi sulle regole, Dono del Patto |
| `mostri-pdf.js` | legge i mostri da PDF, testo e **JSON** |
| `firestore.rules` | regole di sicurezza (già pubblicate, **non vanno cambiate**) |

**Attenzione:** un file nuovo va aggiunto in **tre** posti — `index.html` (lo `<script>`),
`sw.js` (`CORE_ASSETS`), e la cartella del repo. Il test `test-caricamento.mjs` lo verifica.

---

## Cosa sa fare, oggi

**Personaggi** — creazione guidata, scheda completa con tiri, PF, condizioni, riposi,
passaggio di livello, esportazione e importazione PDF, ritratto, multiclasse parziale.
**«Il tuo turno»**: una schermata con attacchi, incantesimi divisi per tempo di lancio,
slot e risorse da spendere, senza aprire la scheda. **Scorrimento laterale** fra le sezioni.

**Incantesimi** — 319 SRD più i tuoi, importabili da JSON, testo o PDF (con ricucitura
delle parole spezzate dai PDF a due colonne).

**Contenuti tuoi** — sottoclassi, razze e background presi dai manuali che possiedi:
il lettore ne ha riconosciuti 116 e 48 da due guide reali. Traduzione automatica dei nomi.
**⚙️ Effetti sul gioco**: una sottoclasse può cambiare le regole (forma selvatica per
livello o per formula, famigli in più, azioni extra nel turno).

**Tavolo del master** — bestiario SRD, PNG, iniziativa, diario. Lettore dei mostri da
PDF, testo e JSON delle raccolte SRD.

**Campagne** — tavolo condiviso con codice d'invito: incantesimi e aggiunte in comune,
in un clic. I personaggi restano privati. Regole di sicurezza vere.

**Sicurezza dei dati** — cestino a 30 giorni, «salute dei dati», backup esportabile,
freno che impedisce a un aggiornamento di cancellare mezza collezione.

---

## Da dove ripartire

1. **Costruttore di incontri** — scegli i mostri dal bestiario, l'app dice se l'incontro
   è facile/medio/difficile/mortale per il gruppo e quanti PX vale. Tutto SRD,
   self-contained, nessun rischio. *È la cosa più utile che manca.*
2. **Condizioni con durata nell'iniziativa** — effetti attivi che scalano da soli a ogni
   round, e avviso sulla concentrazione quando quel personaggio subisce danni.
3. **Il master vede il gruppo** — PF, CA e percezione passiva dei giocatori visibili al
   master in tempo reale. Il salto più grande, ma tocca privacy e regole: opt-in per
   ciascun giocatore.
4. **Diario condiviso** col tavolo (oggi è solo personale).
5. **Traduzione dei nomi anche per il bestiario** (oggi copre solo le aggiunte).
6. Rimasto in sospeso: due segnalazioni dell'audit mobile dove il dado copre un pulsante
   da fermo — si liberano scorrendo, quindi non urgenti.

---

## Come si lavora qui

- **Ogni consegna è testata prima**: `/root/t/*.mjs` con Playwright, più `audit/audit.mjs`
  che scatta 99 schermate e cerca testo tagliato, elementi troppo piccoli e sovrapposizioni.
- **I test devono usare i modelli veri dell'app.** Nella v6.4 quattro difetti gravi erano
  passati perché i test seminavano la forma sbagliata dei dati: verificavano l'errore
  invece del comportamento. Prima di scrivere una prova, controlla com'è fatto davvero
  il campo in `app.js`.
- Trappole già pagate: `preparedSpells` contiene **identificativi**, non oggetti;
  `slotsFor()` restituisce un **array che parte da 0** (posizione 0 = 1° livello);
  `concentration` è un **oggetto** `{name}`; i PNG usano `hpMax`/`hpCurrent`/`speed`/`type`;
  **Firestore rifiuta gli array dentro array** (per questo esistono `perNuvola`/`daNuvola`).
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
