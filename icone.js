/* TwentyNation — icone
   ═══════════════════════════════════════════════════════════════════
   L'app è oro su inchiostro, serif, sobria. Sopra ci stavano 359
   pittogrammi a colori — 🎭 📖 ⚔️ 🎲 — disegnati da qualcun altro, in
   una palette che non è questa: a schermo litigavano con l'oro.

   Qui ci sono disegnati su una griglia di 24, tutti con lo stesso
   tratto, e soprattutto in `currentColor`: diventano oro dentro un
   titolo, granata dentro un avviso, inchiostro sbiadito in una riga
   secondaria. È la cosa che un'emoji a colori non può fare.

   Restano a colori, di proposito, due cose: gli AVATAR (li sceglie
   l'utente, sono la faccia del suo personaggio) e le CONDIZIONI (un
   bollo colorato addosso alla scheda vuol dire «qualcosa non va», ed è
   giusto che salti all'occhio).
   ═══════════════════════════════════════════════════════════════════ */

const ICONE = {
  /* ── barra di navigazione ── */
  party:      '<circle cx="8.5" cy="9" r="3.2"/><circle cx="16" cy="10.5" r="2.6"/><path d="M3 19.5c.6-3 2.7-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/><path d="M15 15.2c2.4.1 4.1 1.6 4.6 4.3"/>',
  grimorio:   '<path d="M4 4.8c2.6-.9 5.1-.9 7.5.5v13c-2.4-1.4-4.9-1.4-7.5-.5z"/><path d="M20 4.8c-2.6-.9-5.1-.9-7.5.5v13c2.4-1.4 4.9-1.4 7.5-.5z"/>',
  /* Due lame incrociate: a 22 px contano solo le due diagonali spesse,
     i due elsi orizzontali e i pomoli. Il resto sparisce comunque. */
  /* Due spade incrociate: lama, elso trasversale e pomo. A 22 px sono
     le tre cose che si vedono, tutto il resto sparisce. */
  tavolo:     '<path d="M4 3.5 14.5 14"/><path d="M20 3.5 9.5 14"/><path d="m6.6 17.4 3.4-3.4M17.4 17.4 14 14"/><path d="M4.6 15.2 8.8 19.4M19.4 15.2l-4.2 4.2"/><circle cx="5.4" cy="20.4" r="1.15" fill="currentColor" stroke="none"/><circle cx="18.6" cy="20.4" r="1.15" fill="currentColor" stroke="none"/>',
  /* Non un ingranaggio: a 22 px un ingranaggio a tratto diventa un sole
     e si confonde col tasto del tema. Tre cursori si leggono sempre. */
  opzioni:    '<path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17" r="2"/>',

  /* ── azioni di tutti i giorni ── */
  /* Un d6 visto di fronte: l'esagono del d20 a questa misura diventava
     una macchia. Un quadrato coi puntini si riconosce subito. */
  dado:       '<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="3.6"/><circle cx="8.4" cy="8.4" r="1.25" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none"/><circle cx="15.6" cy="15.6" r="1.25" fill="currentColor" stroke="none"/>',
  cerca:      '<circle cx="10.6" cy="10.6" r="6.4"/><path d="m15.4 15.4 4.6 4.6"/>',
  chiudi:     '<path d="m6 6 12 12M18 6 6 18"/>',
  indietro:   '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
  avanti:     '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  piu:        '<path d="M12 5v14M5 12h14"/>',
  meno:       '<path d="M5 12h14"/>',
  spunta:     '<path d="m4.5 12.5 5 5 10-11"/>',
  avviso:     '<path d="M12 3.6 22 20H2z"/><path d="M12 9.5v4.5"/><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none"/>',
  info:       '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".9" fill="currentColor" stroke="none"/>',
  altro:      '<circle cx="5.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
  giu:        '<path d="m6 9 6 6 6-6"/>',
  su:         '<path d="m6 15 6-6 6 6"/>',
  ricarica:   '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/>',

  /* ── tema ── */
  luna:       '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  sole:       '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.4M12 19v2.4M21.4 12H19M5 12H2.6M18.6 5.4 17 7M7 17l-1.6 1.6M18.6 18.6 17 17M7 7 5.4 5.4"/>',

  /* ── personaggio ── */
  cuore:      '<path d="M12 20.2 4.6 13a4.6 4.6 0 0 1 7.4-5.3A4.6 4.6 0 0 1 19.4 13z"/>',
  scudo:      '<path d="M12 2.8 20 6v6c0 4.4-3.3 7.7-8 9.2-4.7-1.5-8-4.8-8-9.2V6z"/>',
  spada:      '<path d="M12 3.2 13.6 6v8.2h-3.2V6z"/><path d="M7.4 14.2h9.2"/><path d="M12 14.2v3.9"/><circle cx="12" cy="19.6" r="1.5"/>',
  zaino:      '<path d="M6 9.5A4 4 0 0 1 10 5.5h4a4 4 0 0 1 4 4V20H6z"/><path d="M9.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5"/><path d="M9 13h6"/>',
  monete:     '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7"/><path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
  livello:    '<path d="M4 19h16"/><path d="m4.5 15 4.5-5 3.5 3.5 6.5-7.5"/><path d="M15 5.5h4.5V10"/>',
  teschio:    '<path d="M12 3.2c4.4 0 7.4 3 7.4 7 0 2.4-1 4-2.4 5v3H7v-3c-1.4-1-2.4-2.6-2.4-5 0-4 3-7 7.4-7z"/><circle cx="9.3" cy="10.6" r="1.5"/><circle cx="14.7" cy="10.6" r="1.5"/>',
  /* Due gocce, se no era identica a `goccia`. */
  sangue:     '<path d="M9.5 2.8c2.6 3.1 4.1 5.3 4.1 7.2a4.1 4.1 0 1 1-8.2 0c0-1.9 1.5-4.1 4.1-7.2z"/><path d="M17 12.6c1.6 2 2.6 3.3 2.6 4.5a2.6 2.6 0 1 1-5.2 0c0-1.2 1-2.5 2.6-4.5z"/>',
  clessidra:  '<path d="M7 3.5h10M7 20.5h10"/><path d="M7.5 3.5c0 4 4.5 5.3 4.5 8.5s-4.5 4.5-4.5 8.5"/><path d="M16.5 3.5c0 4-4.5 5.3-4.5 8.5s4.5 4.5 4.5 8.5"/>',
  /* Cerchi concentrici: «sto tenendo il fuoco su una cosa sola». */
  concentra:  '<circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="5"/><path d="M12 3.2a8.8 8.8 0 0 1 8.8 8.8M12 20.8A8.8 8.8 0 0 1 3.2 12"/>',
  corsa:      '<circle cx="14" cy="4.8" r="1.9"/><path d="m8 20.5 3-5.2-2.6-2.8 1.4-4.2 3.7 2 2.9 1.4"/><path d="m13.6 15.3 2.4 5.2"/><path d="m9.8 8.3-4 1.6"/>',
  /* Un fuoco da campo, non una tenda: la tenda a tratto e' un triangolo
     con dentro delle righe, cioe' il cartello di pericolo. */
  tenda:      '<path d="M12 3.6c2.5 2.9 3.8 4.8 3.8 6.6a3.8 3.8 0 0 1-7.6 0c0-1.8 1.3-3.7 3.8-6.6z"/><path d="m3.2 16.8 17.6 4M20.8 16.8l-17.6 4"/>',
  zampa:      '<ellipse cx="12" cy="15.5" rx="4.2" ry="3.4"/><ellipse cx="6.6" cy="10.6" rx="1.9" ry="2.4"/><ellipse cx="17.4" cy="10.6" rx="1.9" ry="2.4"/><ellipse cx="10" cy="6.8" rx="1.8" ry="2.3"/><ellipse cx="14" cy="6.8" rx="1.8" ry="2.3"/>',
  persona:    '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20.2c.8-3.9 3.6-6 7.2-6s6.4 2.1 7.2 6"/>',
  corona:     '<path d="M4 17.5h16"/><path d="m4 17.5-1.2-9 5 3.5L12 5l4.2 7 5-3.5-1.2 9z"/>',
  scolaro:    '<path d="M2.8 9.2 12 5l9.2 4.2L12 13.4z"/><path d="M6.5 11.2v4.4c0 1.6 2.6 2.9 5.5 2.9s5.5-1.3 5.5-2.9v-4.4"/>',

  /* ── magia ── */
  incantesimo:'<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18 16.5 18.8 19l2.5.8-2.5.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8z" transform="translate(0,-2.5)"/>',
  bacchetta:  '<path d="m4.5 19.5 11-11"/><path d="m14 5.5 4.5 4.5"/><path d="M17.5 3.2 18.2 5l1.8.7-1.8.7-.7 1.8-.7-1.8L15 5.7l1.8-.7z"/>',
  candela:    '<path d="M9.5 10.5h5V20h-5z"/><path d="M12 10.5V8"/><path d="M12 3.4c1.6 1.6 2.4 2.7 2.4 3.7a2.4 2.4 0 0 1-4.8 0c0-1 .8-2.1 2.4-3.7z"/>',
  anello:     '<circle cx="12" cy="14.8" r="5.2"/><circle cx="12" cy="14.8" r="2.2"/><path d="m9.4 8.4 2.6-4.2 2.6 4.2z"/>',
  fuoco:      '<path d="M12 3c4 4 6.2 6.6 6.2 9.6a6.2 6.2 0 0 1-12.4 0C5.8 9.6 8 7 12 3z"/><path d="M12 20a2.9 2.9 0 0 1-1.6-5.3c1.1-.8 1.6-1.5 1.6-2.4 1.7 1.7 2.6 2.9 2.6 4a2.9 2.9 0 0 1-2.6 3.7z"/>',
  goccia:     '<path d="M12 3.4c3.7 4.4 5.8 7.3 5.8 10a5.8 5.8 0 0 1-11.6 0c0-2.7 2.1-5.6 5.8-10z"/>',

  /* ── contenuti e file ── */
  libro:      '<path d="M5 4.5h9.5A3.5 3.5 0 0 1 18 8v11.5H8.5A3.5 3.5 0 0 1 5 16z"/><path d="M18 19.5h1.5"/><path d="M8.5 8.5h6M8.5 12h6"/>',
  pergamena:  '<path d="M7 3.5h11v14a3 3 0 0 1-3 3H6.5"/><path d="M7 3.5a2.5 2.5 0 0 0 0 5h2"/><path d="M18 17.5a3 3 0 0 1-3 3"/><path d="M10.5 8h5M10.5 11.5h5M10.5 15h3"/>',
  foglio:     '<path d="M6 3.5h7.5L19 9v11.5H6z"/><path d="M13.5 3.5V9H19"/><path d="M9 13h7M9 16.5h5"/>',
  cartella:   '<path d="M3.5 6.5h5.5l2 2.5h9.5v10.5h-17z"/>',
  salva:      '<path d="M4.5 4.5h12L20 8v11.5h-15z"/><path d="M8 4.5h7v4.5H8z"/><path d="M8 13h8v6.5H8z"/>',
  scarica:    '<path d="M12 3.5v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4.5 19.5h15"/>',
  carica:     '<path d="M12 15.5v-11"/><path d="M7.5 9 12 4.5 16.5 9"/><path d="M4.5 19.5h15"/>',
  cestino:    '<path d="M4.5 6.5h15"/><path d="M9 6.5V4h6v2.5"/><path d="M6.5 6.5 7.5 20h9l1-13.5"/><path d="M10.5 10v6M13.5 10v6"/>',
  etichetta:  '<path d="M3.5 11.5 11 4h8.5v8.5L12 20z"/><circle cx="15.8" cy="8.2" r="1.4"/>',
  copia:      '<path d="M9 3.5h11.5V15"/><path d="M3.5 9h11.5v11.5H3.5z"/>',
  foto:       '<path d="M3.5 7h4L9 4.5h6L16.5 7h4v13h-17z"/><circle cx="12" cy="13" r="3.6"/>',
  immagine:   '<path d="M3.5 4.5h17v15h-17z"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m4 17 5-5 4 4 3-2.5 4 3.5"/>',
  penna:      '<path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m14.5 5.5 4 4"/>',
  /* Una puntina: la freccia di prima si confondeva con «carica». */
  nota:       '<path d="M12 14.5V21"/><path d="M7.5 14.5h9l-1.2-3V5.5h1.4V3H7.3v2.5h1.4v6z"/>',
  mappa:      '<path d="m3.5 6 5.5-2.5 6 2.5 5.5-2.5v14.5L15 20l-6-2.5L3.5 20z"/><path d="M9 3.5v14M15 6v14"/>',
  castello:   '<path d="M3.5 20V8l3 1.5V8l3-1.5V8l3-1.5V8l3-1.5V8l3-1.5V20z"/><path d="M10 20v-5h4v5"/>',
  legame:     '<path d="M9.5 14.5a4 4 0 0 1 0-5.7l2.4-2.4a4 4 0 1 1 5.7 5.7l-1.2 1.2"/><path d="M14.5 9.5a4 4 0 0 1 0 5.7l-2.4 2.4a4 4 0 1 1-5.7-5.7l1.2-1.2"/>',
  lucchetto:  '<path d="M5.5 10.5h13v9.5h-13z"/><path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7"/>',
  occhio:     '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.8"/>',
  nascosto:   '<path d="M4 4.5 20 19.5"/><path d="M9.6 6.5A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.2 3.8"/><path d="M15 15.5A9 9 0 0 1 12 18c-6 0-9.5-6-9.5-6a17 17 0 0 1 4.2-4.5"/>',
  idea:       '<path d="M8.5 15.5A5.5 5.5 0 1 1 15.5 15.5c-.8.9-1 1.7-1 3h-5c0-1.3-.2-2.1-1-3z"/><path d="M10 21h4"/>',
  vuoto:      '<path d="M3.5 12.5 6 5.5h12l2.5 7v7h-17z"/><path d="M3.5 12.5h5l1 2.5h5l1-2.5h5"/>',
  griglia:    '<rect x="3.6" y="3.6" width="7.2" height="7.2" rx="1.6"/><rect x="13.2" y="3.6" width="7.2" height="7.2" rx="1.6"/><rect x="3.6" y="13.2" width="7.2" height="7.2" rx="1.6"/><rect x="13.2" y="13.2" width="7.2" height="7.2" rx="1.6"/>',
  elenco:     '<path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><circle cx="4.6" cy="6" r=".9"/><circle cx="4.6" cy="12" r=".9"/><circle cx="4.6" cy="18" r=".9"/>',
  filtro:     '<path d="M3.5 5.5h17l-6.6 7.6v5.1l-3.8 2.1v-7.2z"/>',
  offline:    '<path d="M7.5 18.5h9a3.8 3.8 0 0 0 .4-7.6 5.4 5.4 0 0 0-9.9-1.6 3.9 3.9 0 0 0 .5 9.2z"/><path d="M3.5 3.5l17 17"/>',
  salute:     '<path d="M3.5 12.5h4l2-5 3 10 2.5-5h5.5"/>',
  dm:         '<path d="M12 2.8 20 6v6c0 4.4-3.3 7.7-8 9.2-4.7-1.5-8-4.8-8-9.2V6z"/><path d="m9 12 2 2 4-4"/>',
  /* Una testa cornuta di profilo: il drago intero a 22 px diventava una
     macchia senza forma. Qui si leggono corno, muso e occhio. */
  /* Orecchie a punta: e' il modo piu' corto per dire «stirpe». */
  razza:      '<circle cx="12" cy="8.6" r="3.6"/><path d="M8.9 6.6 6.2 3.4l.5 4.2M15.1 6.6l2.7-3.2-.5 4.2"/><path d="M5.5 20.6c.7-3.9 3.4-6 6.5-6s5.8 2.1 6.5 6"/>',
  domanda:    '<circle cx="12" cy="12" r="9"/><path d="M9.4 9.4a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.2-2.6 4"/><circle cx="12" cy="17.4" r=".9" fill="currentColor" stroke="none"/>',
  diario:     '<path d="M6.5 3.5h13v17h-13z"/><path d="M4.5 7h2M4.5 12h2M4.5 17h2"/><path d="M9.5 8.5h7M9.5 12h7M9.5 15.5h4"/>',
  trucchetto: '<path d="m12 6 1.4 3.8L17 11.2l-3.6 1.4L12 16.4l-1.4-3.8L7 11.2l3.6-1.4z"/>',
  mano:       '<path d="M8.5 12V6.2a1.6 1.6 0 0 1 3.2 0V11"/><path d="M11.7 10.6V5.4a1.6 1.6 0 0 1 3.2 0V11"/><path d="M14.9 10.8V7.4a1.6 1.6 0 0 1 3.2 0V15c0 3.2-2.2 5.5-5.4 5.5-2.8 0-4.4-1.3-5.6-3.4L5 13.4a1.6 1.6 0 0 1 2.7-1.7z"/>',
};

/* Un'icona dentro l'HTML. `nome` è una chiave di ICONE; se non c'è,
   torna stringa vuota invece di rompere il disegno della pagina. */
function ic(nome, extra){
  const d = ICONE[nome];
  if (!d) return '';
  return '<svg class="ic' + (extra ? ' ' + extra : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + d + '</svg>';
}
