# TwentyNation

Un compagno per le sessioni di **D&D 5e**, pensato per stare in mano mentre si gioca.
Web app installabile (PWA): funziona anche senza rete, e con un account Google ritrovi
tutto su ogni dispositivo.

**→ [giovacchio.github.io/TwentyNation](https://giovacchio.github.io/TwentyNation/)**

## Cosa fa

- **Personaggi** — schede complete con tiri, punti ferita, condizioni, riposi, salita di
  livello, multiclasse, inventario con peso e valuta, ritratto.
- **Il tuo turno** — una schermata sola con attacchi, incantesimi divisi per tempo di
  lancio, slot e risorse: lanciare spende lo slot, accende la concentrazione e segna
  l'azione.
- **Creazione guidata** — dalla razza al riepilogo, con i contenuti che hai caricato tu
  mescolati a quelli di serie.
- **Grimorio** — 319 incantesimi tradotti in italiano, con l'originale inglese in fondo a
  ogni scheda; ricerca nel nome e nel testo.
- **Tavolo del master** — bestiario, PNG, iniziativa, costruttore di incontri, diario.
- **Campagne** — un tavolo condiviso con i giocatori: incantesimi, creature e aggiunte in
  comune. Le schede restano private.
- **PDF** — legge le schede compilabili e le riempie, esporta la scheda e il libretto
  degli incantesimi.
- **Il tuo materiale** — legge razze, sottoclassi e background dai PDF dei manuali che
  possiedi e li porta nel tuo account.
- **Più sistemi di gioco** — D&D 5e e (vuoto, da riempire con quello che possiedi) Star
  Wars 5e, con i dati separati.

## Il materiale di gioco

Le regole di base vengono dal **System Reference Document 5.1**, che Wizards of the Coast
pubblica con licenza **Creative Commons Attribution 4.0**. L'attribuzione richiesta è in
[`LICENZA-SRD.md`](LICENZA-SRD.md) ed è riportata anche dentro l'app, in Opzioni.

**Nell'app non entra materiale dei manuali commerciali.** Né testo del Manuale del
Giocatore, né di Xanathar, né di Tasha, né copiato dai siti che lo ripubblicano —
nemmeno parafrasato. Possedere un libro dà il diritto di usarlo, non di ridistribuirlo.

Quello che l'app fa è darti **gli strumenti** per metterci dentro da te il materiale dei
tuoi manuali: lettori di PDF e di testo, editor, importazioni. Resta sul tuo account e
non viene condiviso con nessuno.

Lo stesso vale per **Star Wars 5e**: è una conversione fatta da fan sopra il SRD, ma sopra
ci sono i nomi e il mondo di Lucasfilm e la scrittura di chi l'ha fatta. Nell'app non
entra niente di loro: c'è la macchina, il materiale lo porti tu.

## I tuoi dati

- Senza account: tutto resta nel browser di questo dispositivo.
- Con l'account Google: i dati stanno nel **tuo** spazio su Firebase, uno per utente, e
  nessuno li vede. Le regole di sicurezza sono in [`firestore.rules`](firestore.rules).
- Quello che elimini resta recuperabile **30 giorni** nel cestino.
- Un backup si esporta in un file quando vuoi (Opzioni → Backup), e porta via tutti i
  sistemi di gioco.

## Com'è fatta

JavaScript puro, **nessun build step**: i file si caricano in ordine da `index.html` e
basta aprirlo. Nessuna dipendenza da installare; `pdf.js` e `pdf-lib` sono vendorizzati
in `vendor/`.

Per lavorarci in locale basta un server statico qualsiasi nella cartella:

```
python3 -m http.server 8931
```

`CHANGELOG.md` tiene la storia di cosa è cambiato, versione per versione.

## Licenza

Il materiale SRD è di Wizards of the Coast, alle condizioni scritte sopra.
Per il **codice** dell'app non è ancora stata scelta una licenza: finché non c'è, valgono
i diritti d'autore di default — chiedi prima di riusarlo.
