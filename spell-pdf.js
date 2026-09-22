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
  const cerca = (soglia, largo = minLargo) => {
    const tagli = [];
    let i = primo;
    while (i <= ultimo){
      if (celle[i] <= soglia){
        let j = i; while (j <= ultimo && celle[j] <= soglia) j++;
        if (j - i >= largo) tagli.push({ x: ((i + j) / 2) * passo, largo: j - i });
        i = j;
      } else i++;
    }
    /* Un corridoio va bene solo se le colonne che ritaglia hanno davvero
       del testo per conto loro: un rientro largo o un titolo centrato
       lasciano buchi che non sono colonne. */
    return tagli.filter(({ x }) => {
      const sin = pezzi.filter(p => p.x + (p.w||0) <= x).length;
      const des = pezzi.filter(p => p.x > x).length;
      return sin >= 12 && des >= 12;
    });
  };
  const netti = cerca(0);
  if (netti.length) return netti.map(t => t.x);
  /* Nessun corridoio pulito: capita quando in cima alla pagina c'e' una
     riga larga quanto il foglio (un'intestazione, una tabella) che
     attraversa le due colonne, o quando le colonne sono a un centimetro
     l'una dall'altra. Si riprova tollerando pochissime righe che passano
     sopra al corridoio, e se ne prende UNO solo, vicino al centro: il
     piu' largo. E' il caso dei manuali a due colonne, non altro. */
  const soglia = Math.max(1, Math.round(pezzi.length * 0.04));
  const quasi = cerca(soglia, Math.max(2, Math.round((larghezza * 0.012) / passo))).filter(({ x }) => {
    const rel = (x - primo * passo) / ((ultimo - primo) * passo);
    return rel > 0.35 && rel < 0.65;
  }).sort((a, b) => b.largo - a.largo);
  return quasi.length ? [quasi[0].x] : [];
}

/* Da che parte del taglio sta un pezzo di testo. Un titolo scritto piu'
   grande puo' cominciare un paio di punti prima del corridoio (la sua
   prima lettera sporge): conta dove sta la sua meta', non il suo inizio,
   se no finisce nella colonna accanto, incollato a una frase non sua. */
function dopoIlTaglio(x, w, taglio){
  if (x >= taglio) return true;
  return x > taglio - 40 && x + (w || 0) / 2 > taglio;
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
  const colonnaDi = (p) => { let n = 0; tagli.forEach(x => { if (dopoIlTaglio(p.x, p.w, x)) n++; }); return n; };

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
    const quale = (x, w) => { let n = 0; tagli.forEach(t => { if (dopoIlTaglio(x, w, t)) n++; }); return n; };
    const cols = [];
    for (let i = 0; i <= tagli.length; i++) cols.push([]);
    pezzi.forEach(it => cols[quale(it.x, it.w)].push(it));

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
const SUFFISSI = /^(al|ally|ed|es|er|ers|est|ing|ings|ion|ions|tion|tions|sion|ly|ness|ment|ments|able|ible|ous|ive|ity|ies|ied|ial|ian|ize|ized|ise|ised|ist|ism|ure|ures|ant|ance|ence|ent|ency|ancy|ful|less|ward|wards|ship|hood|ic|ical|ics|ify|ified|en|ened)$/i;
function deSpace(text){
  const L = findSplitLetter(text);
  if (!L) return text;

  /* Vocabolario del documento. Non cancelliamo niente — cancellare si
     porterebbe via anche le parole buone che stanno dopo un taglio.
     Scorriamo le parole e teniamo solo quelle che NON hanno la lettera
     sospetta più spazio subito prima: quelle sono scritte intere di
     sicuro, e bastano a riconoscere le vere dalle code. */
  /* conta quante volte ogni parola compare intera e quante come "coda"
     (subito dopo la lettera colpevole e uno spazio o un a capo) */
  const vocab = (t, lettera) => {
    const v = new Map(), code = new Map();
    const low = String(t).toLowerCase();
    for (const m of low.matchAll(/[a-z]{2,}/g)){
      const i = m.index, w = m[0];
      const map = (i >= 2 && /\s/.test(low[i-1]) && low[i-2] === lettera) ? code : v;
      map.set(w, (map.get(w) || 0) + 1);
    }
    v.code = code;
    return v;
  };
  /* un pezzo e' una coda se compare piu' spesso attaccato alla lettera
     che da solo ("tion": 325 volte dopo "c ", una volta sola intero) */
  const eCoda = (v, w) => { w = w.toLowerCase(); return (v.code.get(w) || 0) > (v.get(w) || 0); };
  const clean = vocab(text, L);

  const join = (m, left, right) => {
    if (clean.has((left + right).toLowerCase())) return left + right; // "ac tion": "action" c'e' altrove
    if (left.length === 1) return left + right;        // "c reature", "C onjuration"
    if (right.length === 1) return left + right;       // "attac k"
    /* "telekinetic grip", "psychic damage": le parole inglesi che finiscono
       per c sono quasi tutte in -ic, e dopo hanno una parola vera. Si
       riattacca solo un suffisso ("magic al"). */
    if (L === 'c' && left.length >= 4 && /ic$/i.test(left) && right.length >= 3 && !SUFFISSI.test(right)
        && ((clean.has(right.toLowerCase()) && !eCoda(clean, right)) || /^[^aeiouykt]/i.test(right))) return m;
    if (eCoda(clean, right)) return left + right;     // "direc tion"
    if (!clean.has(right.toLowerCase())) return left + right; // "magic al"
    if (L === 'c' && !/[ia]c$/i.test(left)) return left + right; // "desc ends", "bec omes"
    return m;                                          // "magic item"
  };
  /* la lettera non deve venire dopo un apostrofo: "can't regain" è giusto */
  const regola = (l) => new RegExp("(?<![A-Za-z'’])([A-Za-z]*[" + l + l.toUpperCase() + "]) ([a-z]+)", 'g');
  const passa = (t, rx, fn) => {
    let out = t, prev = null, guard = 0;
    while (out !== prev && guard++ < 6){ prev = out; out = out.replace(rx, fn); }
    return out;
  };
  /* la lettera rimasta sola in fondo alla riga («… that succeeds c» +
     a capo + «an act…»): va in testa alla riga dopo, attaccata al suo pezzo */
  let out = String(text).replace(new RegExp('(^|[ \\t])' + L + '[ \\t]*\\n([a-z])', 'g'), '$1\n' + L + '$2');
  out = passa(out, regola(L), join);

  /* Seconda lettera colpevole, piu' rara ("siz ed", "daz z ling"): la si
     riconosce perche' quasi tutto quello che le viene dopo non esiste
     come parola da solo. Con la "t" di "at the" non succede mai. */
  for (const ch of 'abcdefghijklmnopqrstuvwxyz'){
    if (ch === L || LONE_WORDS.has(ch)) continue;
    /* serve la stessa prova della prima: la lettera che compare da sola
       davanti a un pezzo di parola. Senza questa, in un documento corto
       (dove ogni parola compare una volta sola) sembrava colpevole
       qualunque lettera, e «Casting time» diventava «Castingtime». */
    const sole = (out.match(new RegExp('(^|[^A-Za-z\'’])' + ch + ' [a-z]{2,}', 'g')) || []).length;
    if (sole < 3) continue;
    const v = vocab(out, ch);
    const rx = regola(ch);
    const buona = (left, right) => left.length === 1 || right.length === 1
      || v.has((left + right).toLowerCase()) || !v.has(right.toLowerCase()) || eCoda(v, right);
    let n = 0, code = 0;
    for (const m of out.matchAll(rx)){ n++; if (buona(m[1], m[2])) code++; }
    if (n < 5 || code / n < 0.6) continue;
    out = passa(out, rx, (m, left, right) => buona(left, right) ? left + right : m);
  }

  /* Maiuscola staccata a inizio parola: "S trength", "C onjuration". */
  const tutto = vocab(out, '#');
  out = out.replace(/(?<![A-Za-z'’.])([B-HJ-Z]) ([a-z]{2,})/g, (m, a, b) =>
    (tutto.has((a + b).toLowerCase()) || !tutto.has(b)) ? a + b : m);
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
  const SPAZZATURA = /^-?\s*Generated and printed at\b|^Page \d+$|^\d{1,3}$/i;
  const lines = deSpace(String(raw)).split(/\r?\n/).map(healSpacing).filter(l => !SPAZZATURA.test(l));
  const isLevel = (l) => /^Level\s*:/i.test(l) || /^Livello\s*:/i.test(l);
  const schoolKeys = {};
  SPELL_SCHOOLS_EN.forEach(x => { schoolKeys[x.toLowerCase()] = x; });
  Object.keys(SCHOOL_IT).forEach(en => { schoolKeys[SCHOOL_IT[en].toLowerCase()] = en; });
  /* "Evocation", "C onjuration", "Transmutation (ritual)", "Evocation cantrip":
     torna la scuola in inglese (la chiave di SCHOOL_IT) oppure ''. */
  const schoolOf = (l) => {
    const t = String(l || '').trim();
    const tutto = t.replace(/\s+/g, '').toLowerCase();
    if (schoolKeys[tutto]) return schoolKeys[tutto];
    const primo = t.split(/[\s(]+/)[0].toLowerCase();
    if (schoolKeys[primo] && t.length < 40) return schoolKeys[primo];
    return '';
  };
  const field = (l, ...keys) => {
    for (const k of keys){
      const m = new RegExp('^' + k + '\\s*:\\s*(.*)$', 'i').exec(l);
      if (m) return m[1].trim();
    }
    return null;
  };
  const HEAD = /^(Casting time|Casting|Range|Components|Duration|Tempo di lancio|Tempo|Gittata|Componenti|Durata)\s*:/i;
  const HIGHER = /^(At higher levels?\.?|A livelli superiori\.?)\s*/i;

  // indici delle righe "Level:" — ognuna apre un incantesimo
  const starts = [];
  lines.forEach((l, i) => { if (isLevel(l)) starts.push(i); });
  if (!starts.length) return [];

  // Per ogni incantesimo troviamo dove sta il suo nome: serve anche a
  // sapere dove finisce quello prima, senza tagliargli la coda.
  const heads = starts.map(li => {
    let name = '', school = '', nameAt = li, ritual = false;
    for (let j = li - 1; j >= Math.max(0, li - 5); j--){
      const l = lines[j];
      if (!l) continue;
      if (!school && schoolOf(l)){
        school = schoolOf(l); nameAt = j;
        if (/\britual\b|\brituale\b/i.test(l)) ritual = true;
        continue;
      }
      if (HEAD.test(l)) continue;
      if (l.length > 60) break;
      name = l.trim(); nameAt = j;
      break;
    }
    // "Alarm (Ritual)": il rituale e' un'informazione, non parte del nome
    if (/\((ritual|rituale)\)\s*$/i.test(name)){ ritual = true; name = name.replace(/\s*\((ritual|rituale)\)\s*$/i, '').trim(); }
    return { li, name, school, nameAt, ritual };
  });

  const out = [];
  heads.forEach((head, idx) => {
    const li = head.li, name = head.name;
    if (!name || schoolOf(name) === name.replace(/\s+/g,'') || norm(name).length < 3) return;
    if (schoolOf(name) && name.replace(/\s+/g,'').length < 16) return;

    // il corpo arriva fino al nome del prossimo incantesimo
    const stop = idx + 1 < heads.length ? Math.max(li + 1, heads[idx+1].nameAt) : lines.length;
    const sp = { name, school: head.school, desc: '', higher: '', ritual: head.ritual };
    const body = [];
    let higher = false, inTesta = true, j = li;

    /* 1) L'intestazione: Livello, Tempo, Gittata, Componenti, Durata.
       I campi si leggono solo qui: una "range:" dentro al testo non deve
       sovrascrivere la gittata vera. */
    const aCapo = (v, k) => {        // un campo che va a capo prosegue sulla riga dopo
      while (k + 1 < stop && lines[k+1] && !HEAD.test(lines[k+1]) && !isLevel(lines[k+1])
             && (/\([^)]*$/.test(v) || /,\s*$/.test(v))){
        v += ' ' + lines[++k];
      }
      return [v, k];
    };
    for (; j < stop && inTesta; j++){
      const l = lines[j];
      if (!l) continue;
      let v;
      if ((v = field(l, 'Level', 'Livello')) != null){
        sp.level = /cantrip|trucchetto/i.test(v) ? 0 : (parseInt(v) || 0);
        continue;
      }
      if ((v = field(l, 'Casting time', 'Casting', 'Tempo di lancio', 'Tempo')) != null){
        [v, j] = aCapo(v, j);
        if (/\((ritual|rituale)\)/i.test(v)){ sp.ritual = true; v = v.replace(/\s*\((ritual|rituale)\)/i, '').trim(); }
        sp.cast = v; continue;
      }
      if ((v = field(l, 'Range', 'Gittata')) != null){ sp.range = v; continue; }
      if ((v = field(l, 'Components', 'Componenti')) != null){
        [v, j] = aCapo(v, j);
        const m = /\(([^)]*)\)?/.exec(v);
        if (m) sp.mat = m[1].trim();
        /* "V,S,M", "V. S, M", "V, S M": contano solo le lettere */
        const lett = v.replace(/\s*\(.*$/, '');
        sp.comp = ['V','S','M'].filter(x => new RegExp('\\b' + x + '\\b').test(lett)).join(', ') || lett.trim();
        continue;
      }
      if ((v = field(l, 'Duration', 'Durata')) != null){
        [v, j] = aCapo(v, j);
        if (/^ritual\b/i.test(v)) sp.ritual = true;
        sp.dur = v; continue;
      }
      inTesta = false; j--;          // prima riga del testo: si esce
    }

    /* 2) Subito dopo la durata, certe schede mettono il materiale fra
       parentesi su una riga sua, e il tempo "Special" spiegato per esteso
       (la reazione e cosa la fa scattare). */
    while (j < stop && !lines[j]) j++;
    if (j < stop && /^\(/.test(lines[j]) && /\bM\b/.test(sp.comp || '') && !sp.mat){
      let v = lines[j];
      while (!/\)/.test(v) && j + 1 < stop && lines[j+1]) v += ' ' + lines[++j];
      sp.mat = v.replace(/^\(|\)\s*$/g, '').trim();
      j++;
    }
    if (/^special$/i.test(sp.cast || '') && j < stop){
      const l = lines[j] || '';
      const r = /^(1\s+reaction\b.*|reaction(\s+trigger)?\s*:\s*.*)$/i.exec(l);
      if (r){
        let v = l;
        while (j + 1 < stop && lines[j+1] && /^[a-z(]/.test(lines[j+1])) v += ' ' + lines[++j];
        v = v.replace(/^reaction(\s+trigger)?\s*:\s*/i, '');
        sp.cast = /^1\s+reaction/i.test(v) ? v : '1 reaction, ' + v.charAt(0).toLowerCase() + v.slice(1);
        j++;
      }
    }

    /* 3) Il testo, fino al prossimo incantesimo. "At Higher Levels." puo'
       stare su una riga sua o a meta' riga: quello che segue e' la parte
       ai livelli superiori, e non si butta. */
    for (; j < stop; j++){
      let l = lines[j];
      if (!l){ if (body.length && !higher) body.push(''); continue; }
      if (!higher){
        const mid = /(^|[.!?)]\s+)(At Higher Levels?\.|A livelli superiori\.)\s*/i.exec(l);
        if (/^at higher levels?(\.|:|$)/i.test(l) || /^a livelli superiori/i.test(l)){
          higher = true; l = l.replace(HIGHER, '');
          if (!l) continue;
        } else if (mid){
          const prima = l.slice(0, mid.index + mid[1].length).trim();
          if (prima) body.push(prima);
          higher = true; l = l.slice(mid.index + mid[0].length).trim();
          if (!l) continue;
        }
      }
      // la riga di un altro incantesimo che sconfina: ci fermiamo
      if (schoolOf(l) && lines[j+1] && isLevel(lines[j+1])) break;
      (higher ? (sp.higher += (sp.higher ? ' ' : '') + l) : body.push(l));
    }
    sp.desc = body.join(' ').replace(/\s{2,}/g, ' ').replace(/([a-z])- ([a-z])/g, '$1$2').trim();
    sp.higher = sp.higher.replace(/([a-z])- ([a-z])/g, '$1$2').trim();
    if (!sp.desc && !sp.higher) return;
    // una scheda senza gittata, componenti e durata e' un segnaposto, non un incantesimo
    if (!sp.range && !sp.comp && !sp.dur) return;
    if (sp.level == null) sp.level = 0;
    if (sp.mat && !/\bM\b/.test(sp.comp || '')) sp.comp = (sp.comp ? sp.comp + ', ' : '') + 'M';
    if (/^concentration|^concentrazione/i.test(sp.dur || '')) sp.conc = true;
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
    <button class="btn btn-gold btn-block" onclick="document.getElementById('spell-pdf-file').click()">${ic('cartella')} ${s.buffer ? 'Cambia PDF' : 'Scegli il PDF'}</button>
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
      <button class="btn btn-primary btn-block" ${s.busy?'disabled':''} onclick="spellPdfRun()">${s.busy ? '⏳ Sto leggendo…' : ic('cerca') + ' Leggi gli incantesimi'}</button>
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
      toast('⚠ Non riesco ad aprire questo PDF');
    }
  };
  reader.onerror = () => toast('⚠ Impossibile leggere il file');
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
      toast('⚠ Nessun incantesimo riconosciuto: prova a restringere le pagine');
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
      ritual: !!s.ritual, conc: !!s.conc,
    }))));
  } catch(e){
    console.error('Lettura PDF fallita', e);
    spdf.busy = false; renderModalRoot();
    toast('⚠ Lettura non riuscita');
  }
}
