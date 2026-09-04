/* ══════════════════════════════════════════════════════════════
   Grimorio — leggere gli incantesimi da un PDF
   Molti compendi sono impaginati su due colonne: qui le separiamo
   guardando dove stanno le parole sulla pagina, poi ricomponiamo
   i blocchi «nome / scuola / livello / lancio / gittata /
   componenti / durata / testo».
   Quello che esce finisce fra i TUOI incantesimi, sul tuo account:
   non tocca il contenuto pubblico dell'app.
   ══════════════════════════════════════════════════════════════ */

/* ═══ LA LETTURA DEI PDF, UNA VOLTA SOLA ═══════════════════════
   Ogni lettore dell'app si ricostruiva le righe per conto suo, e il piu'
   ingenuo raggruppava i pezzi per coordinata Y **su tutta la pagina**:
   su un manuale a due colonne questo incolla insieme la riga di sinistra
   e quella di destra. Il risultato lo si vedeva sulle suppliche —
   «Sguardo del Nulla Passo di Cenere», due nomi fusi in uno, e i testi
   delle due colonne mescolati riga per riga.

   Qui le colonne si CONTANO, non si danno per scontate: si guarda dove
   il testo non arriva mai (i corridoi bianchi verticali) e si taglia li'.
   Una pagina a colonna unica resta una colonna sola; una a tre, tre.
   Insieme alle righe torna anche il corpo del carattere, che e' il modo
   piu' affidabile di riconoscere un titolo: nei manuali il nome di una
   voce e' scritto piu' grande del testo, e questo lo sa la pagina, non
   una regola sulla lunghezza della riga. */

/* I corridoi bianchi fra le colonne. Torna i confini in x. */
function corridoiVerticali(pezzi, larghezza){
  if (pezzi.length < 40) return [];                 // troppo poco testo per fidarsi
  const passo = Math.max(4, larghezza / 120);
  const celle = new Array(Math.ceil(larghezza / passo)).fill(0);
  pezzi.forEach(p => {
    const da = Math.max(0, Math.floor(p.x / passo));
    const a  = Math.min(celle.length - 1, Math.floor((p.x + (p.w || 0)) / passo));
    for (let i = da; i <= a; i++) celle[i]++;
  });
  // il margine esterno non e' un corridoio: si guarda solo dentro al testo
  let primo = celle.findIndex(c => c > 0);
  let ultimo = celle.length - 1; while (ultimo > 0 && !celle[ultimo]) ultimo--;
  if (primo < 0 || ultimo - primo < 10) return [];
  const minLargo = Math.max(2, Math.round((larghezza * 0.035) / passo));  // ~3,5% della pagina
  const tagli = [];
  let i = primo;
  while (i <= ultimo){
    if (celle[i] === 0){
      let j = i; while (j <= ultimo && celle[j] === 0) j++;
      if (j - i >= minLargo) tagli.push(((i + j) / 2) * passo);
      i = j;
    } else i++;
  }
  /* Un corridoio va bene solo se le colonne che ritaglia hanno davvero
     del testo per conto loro: un rientro largo o un titolo centrato
     lasciano buchi che non sono colonne. */
  return tagli.filter(x => {
    const sin = pezzi.filter(p => p.x + (p.w||0) <= x).length;
    const des = pezzi.filter(p => p.x > x).length;
    return sin >= 12 && des >= 12;
  });
}

/* Da una pagina di pdf.js alle sue righe, colonna per colonna.
   Ogni riga: { t, x, y, dim, col } — `dim` e' il corpo piu' grande
   usato nella riga, che serve a capire se e' un titolo. */
function pdfRighePagina(tc, larghezza){
  const pezzi = tc.items
    .map(i => ({ t: String(i.str || ''), x: i.transform[4], y: i.transform[5],
                 w: i.width || 0, h: i.height || 0 }))
    .filter(p => p.t && p.t.trim());
  if (!pezzi.length) return [];

  const tagli = corridoiVerticali(pezzi, larghezza || 595);
  const colonnaDi = (p) => { let n = 0; tagli.forEach(x => { if (p.x >= x) n++; }); return n; };

  const perCol = new Map();
  pezzi.forEach(p => {
    const c = colonnaDi(p);
    if (!perCol.has(c)) perCol.set(c, []);
    perCol.get(c).push(p);
  });

  const righe = [];
  [...perCol.keys()].sort((a,b)=>a-b).forEach(c => {
    const col = perCol.get(c).sort((a,b) => (b.y - a.y) || (a.x - b.x));
    let cur = null;
    col.forEach(p => {
      /* stessa riga entro mezza altezza di carattere: arrotondare la y
         a numero intero spezzava le righe con apici e accenti */
      const tolleranza = Math.max(2, (p.h || 10) * 0.5);
      if (!cur || Math.abs(p.y - cur.y) > tolleranza){
        cur = { t: p.t, x: p.x, y: p.y, dim: p.h || 10, col: c, fine: p.x + p.w };
        righe.push(cur);
        return;
      }
      /* spazio vero o parola spezzata? lo dice la distanza, non il caso */
      const buco = p.x - cur.fine;
      const largo = buco > Math.max(0.9, (p.h || 10) * 0.18);
      const gia = /\s$/.test(cur.t) || /^\s/.test(p.t);
      if (largo && !gia) cur.t += ' ';
      else if (!largo && gia) cur.t = cur.t.replace(/\s+$/, '');
      cur.t += p.t;
      cur.fine = p.x + p.w;
      if ((p.h || 0) > cur.dim) cur.dim = p.h;
    });
  });
  return righe.map(r => ({ ...r, t: r.t.replace(/\s+/g, ' ').trim() })).filter(r => r.t);
}

/* Tutte le righe di un PDF, gia' in ordine di lettura. */
async function pdfRighe(buffer, from, to){
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({ data: new Uint8Array(bufferCopia(buffer)) }).promise;
  const primo = clamp(from || 1, 1, doc.numPages);
  const ultimo = clamp(to || doc.numPages, primo, doc.numPages);
  const fuori = [];
  for (let p = primo; p <= ultimo; p++){
    const pagina = await doc.getPage(p);
    const vp = pagina.getViewport({ scale: 1 });
    const tc = await pagina.getTextContent();
    pdfRighePagina(tc, vp.width).forEach(r => fuori.push({ ...r, pagina: p }));
    if (p % 12 === 0) await new Promise(r => setTimeout(r, 0));
  }
  const pagine = doc.numPages;
  try { doc.destroy(); } catch(e){}
  return { righe: fuori, pagine };
}
/* Il corpo del testo normale: la dimensione piu' usata nella pagina.
   Tutto quello che e' scritto piu' grande e' un titolo. */
function corpoDelTesto(righe){
  const conti = {};
  righe.forEach(r => { const k = Math.round((r.dim || 10) * 2) / 2; conti[k] = (conti[k] || 0) + r.t.length; });
  let vinc = 10, max = -1;
  Object.keys(conti).forEach(k => { if (conti[k] > max){ max = conti[k]; vinc = Number(k); } });
  return vinc;
}

/* Estrae il testo tenendo conto delle colonne e delle righe */
async function extractPdfColumns(buffer, from, to, onProgress){
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({ data: new Uint8Array(bufferCopia(buffer)) }).promise;
  const first = clamp(from || 1, 1, doc.numPages);
  const last = clamp(to || doc.numPages, first, doc.numPages);
  const chunks = [];

  for (let p = first; p <= last; p++){
    if (onProgress) onProgress(p - first + 1, last - first + 1);
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    /* Le colonne si CONTANO guardando i corridoi bianchi, invece di
       tagliare sempre a meta' pagina. Tagliare a meta' funziona sui
       manuali a due colonne e rovina tutto il resto: su una pagina a
       colonna unica spezzava ogni riga in due, e la meta' destra di
       tutte le righe finiva in fondo, staccata dalla sua. */
    const pezzi = tc.items
      .map(it => ({ s: it.str, x: it.transform ? it.transform[4] : 0,
                    y: it.transform ? it.transform[5] : 0,
                    w: it.width || 0, h: it.height || 10 }))
      .filter(it => it.s && it.s.trim());
    const tagli = corridoiVerticali(pezzi.map(p => ({ x:p.x, w:p.w })), vp.width);
    const quale = (x) => { let n = 0; tagli.forEach(t => { if (x >= t) n++; }); return n; };
    const cols = [];
    for (let i = 0; i <= tagli.length; i++) cols.push([]);
    pezzi.forEach(it => cols[quale(it.x)].push(it));

    /* Molti PDF spezzano le parole in tanti pezzetti ("c rac kling"):
       non sono spazi veri, sono solo frammenti vicini. Invece di
       indovinare quali riattaccare, guardiamo quanto distano davvero:
       se fra la fine di un pezzo e l'inizio del successivo non c'è
       spazio, era una parola sola. */
    cols.forEach(col => {
      if (!col.length) return;
      col.sort((a,b) => (b.y - a.y) || (a.x - b.x));
      let txt = '', lastY = null, lastEnd = null;
      col.forEach(it => {
        if (lastY !== null && Math.abs(it.y - lastY) > 3){
          txt += '\n';
        } else if (lastEnd !== null){
          const gap = it.x - lastEnd;
          const wide = gap > Math.max(0.9, (it.h || 10) * 0.18);
          const already = /\s$/.test(txt) || /^\s/.test(it.s);
          if (wide && !already) txt += ' ';
          else if (!wide && already) txt = txt.replace(/\s+$/, '');
        }
        txt += it.s;
        lastY = it.y;
        lastEnd = it.x + (it.w || 0);
      });
      chunks.push(txt);
    });
    if (p % 12 === 0) await new Promise(r => setTimeout(r, 0)); // lascia respirare l'interfaccia
  }
  const pages = doc.numPages;
  try { doc.destroy(); } catch(e){}
  return { text: chunks.join('\n\n'), pages };
}

/* ─── Parole spezzate ───
   Certi PDF infilano uno spazio dentro le parole, sempre dopo la
   stessa lettera: "c rac kling" invece di "crackling". Il guaio è che
   "magic al" (rotto: «magical») e "magic item" (giusto) sono identici
   a vederli. Allora usiamo il documento come vocabolario: se il pezzo
   dopo lo spazio compare altrove da solo, era una parola vera e lo
   spazio resta; se non compare mai, era la coda di una parola tagliata.
   Un frammento di una lettera sola, o un pezzo di sinistra lungo una
   lettera, si riattaccano sempre. */
/* Quale lettera taglia le parole? Contare gli spazi che la seguono non
   basta: in inglese "the ", "one ", "more " gonfiano la "e" quanto la
   "c" colpevole. Il segnale pulito è un altro: la lettera che compare
   *da sola*, staccata, davanti a una parola ("c reature"). Le uniche
   lettere che stanno legittimamente da sole sono poche, e le saltiamo. */
const LONE_WORDS = new Set(['a','i','e','o','y','è','ho','a']);
function findSplitLetter(text){
  const t = String(text);
  let best = null, bestN = 0;
  for (const ch of 'abcdefghijklmnopqrstuvwxyz'){
    if (LONE_WORDS.has(ch)) continue;
    const n = (t.match(new RegExp('(^|[^A-Za-z])' + ch + ' [a-z]{2,}', 'g')) || []).length;
    if (n > bestN){ bestN = n; best = ch; }
  }
  return bestN >= 25 ? best : null;
}
function deSpace(text){
  const L = findSplitLetter(text);
  if (!L) return text;

  /* Vocabolario del documento. Non cancelliamo niente — cancellare si
     porterebbe via anche le parole buone che stanno dopo un taglio.
     Scorriamo le parole e teniamo solo quelle che NON hanno la lettera
     sospetta più spazio subito prima: quelle sono scritte intere di
     sicuro, e bastano a riconoscere le vere dalle code. */
  const clean = new Set();
  const low = String(text).toLowerCase();
  for (const m of low.matchAll(/[a-z]{2,}/g)){
    const i = m.index;
    if (i >= 2 && low[i-1] === ' ' && low[i-2] === L) continue; // possibile coda
    clean.add(m[0]);
  }

  const join = (m, left, right) => {
    if (left.length === 1) return left + right;        // "c reature"
    if (right.length === 1) return left + right;       // "attac k"
    if (!clean.has(right.toLowerCase())) return left + right; // "magic al"
    return m;                                          // "magic item"
  };
  let out = String(text), prev = null, guard = 0;
  const rx = new RegExp('([A-Za-z]*' + L + ') ([a-z]+)', 'g');
  while (out !== prev && guard++ < 6){
    prev = out;
    out = out.replace(rx, join);
  }
  return out;
}
/* Ripulitura innocua: spazi doppi e bordi. */
function healSpacing(line){
  return String(line).replace(/\s{2,}/g, ' ').trim();
}

const SPELL_SCHOOLS_EN = ['Abjuration','Conjuration','Divination','Enchantment','Evocation','Illusion','Necromancy','Transmutation'];
/* Uno solo elenco per tutta l'app: se qui e in app.js divergono, lo stesso
   incantesimo finisce in due scuole diverse a seconda di come è entrato. */
const SCHOOL_IT = (typeof SCHOOLS_IT !== 'undefined') ? SCHOOLS_IT : {
  Abjuration:'Abiurazione', Conjuration:'Evocazione', Divination:'Divinazione',
  Enchantment:'Ammaliamento', Evocation:'Invocazione', Illusion:'Illusione',
  Necromancy:'Necromanzia', Transmutation:'Trasmutazione' };

/* Riconosce i blocchi di incantesimo dentro al testo */
function parseSpellsFromText(raw){
  const lines = deSpace(String(raw)).split(/\r?\n/).map(healSpacing);
  const isLevel = (l) => /^Level\s*:/i.test(l) || /^Livello\s*:/i.test(l);
  const isSchool = (l) => SPELL_SCHOOLS_EN.some(s => new RegExp('^' + s + '\\b', 'i').test(l))
                        || Object.values(SCHOOL_IT).some(s => new RegExp('^' + s + '\\b', 'i').test(l));
  const field = (l, ...keys) => {
    for (const k of keys){
      const m = new RegExp('^' + k + '\\s*:\\s*(.*)$', 'i').exec(l);
      if (m) return m[1].trim();
    }
    return null;
  };

  // indici delle righe "Level:" — ognuna apre un incantesimo
  const starts = [];
  lines.forEach((l, i) => { if (isLevel(l)) starts.push(i); });
  if (!starts.length) return [];

  // Per ogni incantesimo troviamo dove sta il suo nome: serve anche a
  // sapere dove finisce quello prima, senza tagliargli la coda.
  const heads = starts.map(li => {
    let name = '', school = '', nameAt = li;
    for (let j = li - 1; j >= Math.max(0, li - 5); j--){
      const l = lines[j];
      if (!l) continue;
      // «Evocation cantrip» / «Transmutation ritual»: la scuola è la prima
    // parola, il resto è una qualifica e va tolta o non si traduce più.
    if (isSchool(l) && !school){ school = (l.trim().split(/\s+/)[0] || '').trim(); nameAt = j; continue; }
      if (/^(Casting|Range|Components|Duration|Tempo|Gittata|Componenti|Durata)\s*:/i.test(l)) continue;
      if (l.length > 60) break;
      name = l.trim(); nameAt = j;
      break;
    }
    return { li, name, school, nameAt };
  });

  /* Una riga che è solo il nome di una scuola (magari spezzata in
     "C onjuration") non è un incantesimo: è un'intestazione. */
  const schoolKeys = new Set(SPELL_SCHOOLS_EN.concat(Object.values(SCHOOL_IT)).map(x => norm(x)));
  const looksLikeSchool = (t) => schoolKeys.has(norm(String(t).replace(/\s+/g,'')));

  const out = [];
  heads.forEach((head, idx) => {
    const li = head.li, name = head.name, school = head.school;
    if (!name || looksLikeSchool(name) || norm(name).length < 3) return;

    // il corpo arriva fino al nome del prossimo incantesimo
    const stop = idx + 1 < heads.length ? Math.max(li + 1, heads[idx+1].nameAt) : lines.length;
    const sp = { name, school, desc: '', higher: '' };
    const body = [];
    let higher = false;

    for (let j = li; j < stop; j++){
      const l = lines[j];
      if (!l) { if (body.length) body.push(''); continue; }
      let v;
      if ((v = field(l, 'Level', 'Livello')) != null){
        sp.level = /cantrip|trucchetto/i.test(v) ? 0 : (parseInt(v) || 0);
        continue;
      }
      if ((v = field(l, 'Casting time', 'Casting', 'Tempo di lancio', 'Tempo')) != null){ sp.cast = v; continue; }
      if ((v = field(l, 'Range', 'Gittata')) != null){ sp.range = v; continue; }
      if ((v = field(l, 'Components', 'Componenti')) != null){
        const m = /\(([^)]*)\)/.exec(v);
        if (m) sp.mat = m[1].trim();
        sp.comp = v.replace(/\s*\([^)]*\)/, '').trim();
        continue;
      }
      if ((v = field(l, 'Duration', 'Durata')) != null){ sp.dur = v; continue; }
      if (/^(At higher level|At Higher Levels?|A livelli superiori)/i.test(l)){ higher = true; continue; }
      // la riga di un altro incantesimo che sconfina: ci fermiamo
      if (isSchool(l) && j > li + 1 && lines[j+1] && isLevel(lines[j+1])) break;
      (higher ? (sp.higher += (sp.higher ? ' ' : '') + l) : body.push(l));
    }
    sp.desc = body.join(' ').replace(/\s{2,}/g, ' ').trim();
    if (!sp.desc && !sp.higher) return;
    if (sp.level == null) sp.level = 0;
    if (sp.school && SCHOOL_IT[sp.school]) sp.schoolIt = SCHOOL_IT[sp.school];
    out.push(sp);
  });

  // ripulisce i doppioni tenendo la versione col testo più completo
  const best = {};
  out.forEach(s => {
    const k = norm(s.name);
    if (!k) return;
    const prev = best[k];
    if (!prev || (s.desc||'').length > (prev.desc||'').length) best[k] = s;
  });
  return Object.values(best);
}

/* ─── Interfaccia ─── */
let spdf = null; /* { name, buffer, pages, from, to, busy, found } */

function openSpellPdfImport(){
  spdf = { name:'', buffer:null, pages:0, from:1, to:0, busy:false, found:null };
  openModal({ render: spellPdfHTML });
}
function spellPdfHTML(){
  const s = spdf || {};
  const inner = `
    <p class="muted" style="margin-bottom:12px">
      Carica un PDF di incantesimi: l'app legge le pagine, riconosce nome, livello, scuola,
      tempo di lancio, gittata, componenti, durata e testo, e te li propone.
      Finiscono fra i <b>tuoi</b> incantesimi, sul tuo account.
    </p>
    <button class="btn btn-gold btn-block" onclick="document.getElementById('spell-pdf-file').click()">📂 ${s.buffer ? 'Cambia PDF' : 'Scegli il PDF'}</button>
    <input type="file" id="spell-pdf-file" accept="application/pdf,.pdf" style="display:none" onchange="spellPdfChoose(this)">
    ${s.buffer ? `
      <div class="card" style="margin-top:12px">
        <div class="row-between" style="margin-bottom:6px"><span class="muted">File</span><b style="text-align:right;font-size:.8rem">${escapeHtml(s.name)}</b></div>
        <div class="row-between"><span class="muted">Pagine</span><b>${s.pages}</b></div>
      </div>
      <div class="two-col" style="margin-top:10px">
        <div class="field"><label>Dalla pagina</label>
          <input type="number" inputmode="numeric" min="1" max="${s.pages}" value="${s.from}" oninput="spdf.from=clamp(parseInt(this.value)||1,1,${s.pages})"></div>
        <div class="field"><label>Alla pagina</label>
          <input type="number" inputmode="numeric" min="1" max="${s.pages}" value="${s.to||s.pages}" oninput="spdf.to=clamp(parseInt(this.value)||${s.pages},1,${s.pages})"></div>
      </div>
      <div class="field-hint" style="margin-bottom:12px">Lascia tutto per leggere l'intero PDF. Su file lunghi ci mette qualche secondo.</div>
      <button class="btn btn-primary btn-block" ${s.busy?'disabled':''} onclick="spellPdfRun()">${s.busy ? '⏳ Sto leggendo…' : '🔍 Leggi gli incantesimi'}</button>
    ` : ''}
    ${s.found ? `<div class="card" style="margin-top:12px; border-color:var(--good)">
      <div class="row-between"><span class="muted">Riconosciuti</span><b style="color:var(--good)">${s.found}</b></div>
    </div>` : ''}
    <div class="spell-source-note">Carica solo materiale di cui hai i diritti: i tuoi appunti, il tuo homebrew, o i manuali che possiedi per uso personale. Quello che importi resta sul tuo account e non viene pubblicato.</div>`;
  return modalShell('📄 Incantesimi da PDF', inner);
}
function spellPdfChoose(input){
  const file = input.files && input.files[0];
  input.value = '';
  if (file) spellPdfUseFile(file);
}
/* Accetta un PDF da qualsiasi parte arrivi: dal tasto dedicato oppure
   dal normale «scegli un file», così non serve indovinare quale
   pulsante premere. */
function spellPdfUseFile(file){
  if (!spdf) spdf = { name:'', buffer:null, pages:0, from:1, to:0, busy:false, found:null };
  if (!state.modal || state.modal.render !== spellPdfHTML) openModal({ render: spellPdfHTML });
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      spdf.buffer = reader.result;
      spdf.name = file.name;
      const lib = await loadPdfJs();
      const doc = await lib.getDocument({ data: new Uint8Array(reader.result.slice(0)) }).promise;
      spdf.pages = doc.numPages;
      spdf.to = doc.numPages;
      try { doc.destroy(); } catch(e){}
      renderModalRoot();
    } catch(e){
      console.error(e);
      toast('⚠️ Non riesco ad aprire questo PDF');
    }
  };
  reader.onerror = () => toast('⚠️ Impossibile leggere il file');
  reader.readAsArrayBuffer(file);
}
async function spellPdfRun(){
  if (!spdf || !spdf.buffer || spdf.busy) return;
  spdf.busy = true; spdf.found = null; renderModalRoot();
  try {
    const { text } = await extractPdfColumns(spdf.buffer.slice(0), spdf.from, spdf.to || spdf.pages,
      (i, n) => { if (i % 10 === 0) toast('📄 pagina ' + i + ' di ' + n); });
    const spells = parseSpellsFromText(text);
    spdf.busy = false;
    if (!spells.length){
      spdf.found = 0; renderModalRoot();
      toast('⚠️ Nessun incantesimo riconosciuto: prova a restringere le pagine');
      return;
    }
    spdf.found = spells.length;
    // passa il testimone alla schermata di importazione, che sa già
    // dirti quali sono nuovi e quali ci sono già
    if (state.modal) state.modal.render = spellImportHTML;
    analyzeSpellImport(JSON.stringify(spells.map(s => ({
      name: s.name, level: s.level, school: s.schoolIt || s.school || '',
      cast: s.cast || '', range: s.range || '', comp: s.comp || '', mat: s.mat || '',
      dur: s.dur || '', desc: s.desc || '', higher: s.higher || '',
    }))));
  } catch(e){
    console.error('Lettura PDF fallita', e);
    spdf.busy = false; renderModalRoot();
    toast('⚠️ Lettura non riuscita');
  }
}
