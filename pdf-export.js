/* ══════════════════════════════════════════════════════════════
   Grimorio — esporta la scheda in PDF
   Un foglio A4 pulito, pensato per essere stampato o mandato al
   master. Niente sfondi scuri: inchiostro su carta, con le cose
   importanti in evidenza. L'impaginazione va a capo e cambia
   pagina da sola, quindi nessun testo finisce fuori dal foglio.
   ══════════════════════════════════════════════════════════════ */

const PDFX = {
  W: 595.28, H: 841.89,          // A4 in punti
  M: 38,                          // margine
  ink:   [0.12, 0.11, 0.13],
  soft:  [0.42, 0.40, 0.45],
  line:  [0.78, 0.75, 0.72],
  accent:[0.42, 0.13, 0.18],      // granata
  gold:  [0.55, 0.44, 0.20],
  fill:  [0.965, 0.955, 0.935],
};


/* I font standard del PDF sanno scrivere solo i caratteri WinAnsi.
   Nomi con emoji o simboli esotici farebbero fallire tutto: li
   convertiamo in qualcosa di equivalente, o li togliamo. */
const WA_MAP = {
  '\u2018':"'", '\u2019':"'", '\u201A':"'", '\u201B':"'",
  '\u201C':'"', '\u201D':'"', '\u201E':'"',
  '\u2010':'-', '\u2011':'-', '\u2012':'-', '\u2013':'-', '\u2014':'-', '\u2015':'-', '\u2212':'-',
  '\u00A0':' ', '\u2007':' ', '\u2009':' ', '\u202F':' ', '\u200B':'',
  '\u2026':'...', '\u2022':'-', '\u25CF':'*', '\u25CB':'o', '\u25C7':'(c)', '\u25AA':'>',
  '\u2713':'v', '\u2714':'v', '\u2717':'x', '\u2192':'->', '\u2190':'<-',
  '\u00D7':'x', '\u2044':'/', '\u2264':'<=', '\u2265':'>=',
};
const WA_EXTRA = new Set([0x20AC,0x201A,0x0192,0x201E,0x2026,0x2020,0x2021,0x02C6,0x2030,0x0160,0x2039,0x0152,0x017D,
                          0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,0x02DC,0x2122,0x0161,0x203A,0x0153,0x017E,0x0178]);
function wa(v){
  let s = String(v == null ? '' : v);
  s = s.replace(/[\u2018-\u201E\u2010-\u2015\u2212\u00A0\u2007\u2009\u202F\u200B\u2026\u2022\u25CF\u25CB\u25C7\u25AA\u2713\u2714\u2717\u2192\u2190\u00D7\u2044\u2264\u2265]/g, ch => WA_MAP[ch] != null ? WA_MAP[ch] : '');
  let out = '';
  for (const ch of s){
    const cp = ch.codePointAt(0);
    if (cp === 10 || cp === 13){ out += '\n'; continue; }
    if (cp >= 0x20 && cp <= 0x7E){ out += ch; continue; }
    if (cp >= 0xA1 && cp <= 0xFF){ out += ch; continue; }
    if (WA_EXTRA.has(cp)){ out += ch; continue; }
    // tutto il resto (emoji comprese) sparisce, ma non fa saltare il PDF
  }
  return out;
}

/* ─── Motore di impaginazione ───
   Tiene il cursore, spezza il testo e cambia pagina quando serve. */
function pdfDoc(lib, doc, fonts, title){
  const S = {
    doc, lib, fonts, page: null, y: 0, pageNo: 0, title,
    rgb: lib.rgb,
    get left(){ return PDFX.M; },
    get right(){ return PDFX.W - PDFX.M; },
    get width(){ return PDFX.W - PDFX.M*2; },
  };

  S.newPage = () => {
    S.page = doc.addPage([PDFX.W, PDFX.H]);
    S.pageNo++;
    S.y = PDFX.H - PDFX.M;
    // filo dorato in alto e piede di pagina
    S.page.drawRectangle({ x:0, y:PDFX.H-6, width:PDFX.W, height:6, color:S.rgb(...PDFX.gold), opacity:0.55 });
    S.page.drawText(wa(title), { x:PDFX.M, y:20, size:7.5, font:fonts.it, color:S.rgb(...PDFX.soft) });
    const n = String(S.pageNo);
    S.page.drawText(wa(n), { x:PDFX.W - PDFX.M - fonts.it.widthOfTextAtSize(wa(n),7.5), y:20, size:7.5, font:fonts.it, color:S.rgb(...PDFX.soft) });
    return S.page;
  };

  S.space = (h) => { if (S.y - h < PDFX.M + 26) S.newPage(); };
  S.gap = (h) => { S.y -= h; };

  /* Spezza il testo alla larghezza data, rispettando gli a capo. */
  S.wrap = (text, font, size, maxW) => {
    const out = [];
    wa(text).split(/\r?\n/).forEach(para => {
      if (!para.trim()){ out.push(''); return; }
      let line = '';
      para.split(/\s+/).forEach(word => {
        // una parola più larga della colonna va spezzata a forza
        while (font.widthOfTextAtSize(wa(word), size) > maxW){
          let cut = word.length;
          while (cut > 1 && font.widthOfTextAtSize(wa(word.slice(0,cut)), size) > maxW) cut--;
          if (line){ out.push(line); line = ''; }
          out.push(word.slice(0, cut));
          word = word.slice(cut);
        }
        const test = line ? line + ' ' + word : word;
        if (font.widthOfTextAtSize(wa(test), size) <= maxW) line = test;
        else { if (line) out.push(line); line = word; }
      });
      if (line) out.push(line);
    });
    return out;
  };

  S.text = (t, opts) => {
    const o = Object.assign({ size:9, font:fonts.it, color:PDFX.ink, x:S.left, maxW:S.width, lead:1.34 }, opts||{});
    const lines = S.wrap(t, o.font, o.size, o.maxW);
    const lh = o.size * o.lead;
    // se in fondo alla pagina ci sta una riga sola, si cambia foglio:
    // una riga orfana in cima alla pagina dopo si legge male
    if (lines.length > 1 && S.y - 2*lh < PDFX.M + 26) S.newPage();
    lines.forEach(ln => {
      S.space(lh);
      if (ln) S.page.drawText(wa(ln), { x:o.x, y:S.y - o.size, size:o.size, font:o.font, color:S.rgb(...o.color) });
      S.y -= lh;
    });
    return lines.length;
  };

  /* Titolo di sezione con filetto */
  S.heading = (t) => {
    // un titolo da solo in fondo al foglio è brutto: pretende
    // lo spazio per sé e per un paio di righe di contenuto
    S.space(46);
    S.gap(9);
    S.page.drawText(wa(t.toUpperCase()), { x:S.left, y:S.y-9, size:9.5, font:fonts.bold, color:S.rgb(...PDFX.accent) });
    S.y -= 13;
    S.page.drawLine({ start:{x:S.left,y:S.y}, end:{x:S.right,y:S.y}, thickness:0.7, color:S.rgb(...PDFX.gold), opacity:0.6 });
    S.y -= 8;
  };

  /* Riquadro con etichetta piccola sopra e valore grosso sotto */
  S.stat = (x, y, w, h, label, value, sub) => {
    S.page.drawRectangle({ x, y:y-h, width:w, height:h, color:S.rgb(...PDFX.fill), borderColor:S.rgb(...PDFX.line), borderWidth:0.7 });
    const lw = fonts.bold.widthOfTextAtSize(wa(label), 6.4);
    S.page.drawText(wa(label), { x:x + (w-lw)/2, y:y-11, size:6.4, font:fonts.bold, color:S.rgb(...PDFX.soft) });
    const vs = value.length > 6 ? 11 : 15;
    const vw = fonts.bold.widthOfTextAtSize(wa(value), vs);
    S.page.drawText(wa(value), { x:x + (w-vw)/2, y:y - h/2 - vs/2 + 3, size:vs, font:fonts.bold, color:S.rgb(...PDFX.ink) });
    if (sub){
      const sw = fonts.it.widthOfTextAtSize(wa(sub), 6.2);
      S.page.drawText(wa(sub), { x:x + (w-sw)/2, y:y-h+6, size:6.2, font:fonts.it, color:S.rgb(...PDFX.soft) });
    }
  };

  /* Riga a due colonne: etichetta a sinistra, valore a destra */
  S.row = (label, value) => {
    if (!value && value !== 0) return;
    const labW = 108;
    const lines = S.wrap(String(value), fonts.it, 8.6, S.width - labW - 6);
    const lh = 8.6 * 1.34;
    S.space(lines.length * lh + 2);
    S.page.drawText(wa(label), { x:S.left, y:S.y-8.6, size:8.6, font:fonts.bold, color:S.rgb(...PDFX.soft) });
    lines.forEach((ln, i) => {
      S.page.drawText(wa(ln), { x:S.left+labW, y:S.y-8.6-i*lh, size:8.6, font:fonts.it, color:S.rgb(...PDFX.ink) });
    });
    S.y -= lines.length * lh + 2;
  };

  /* Riga di una tabella, con colonne di larghezza fissa */
  S.trow = (cells, widths, opts) => {
    const o = Object.assign({ bold:false, size:8.4, fillRow:false }, opts||{});
    const font = o.bold ? fonts.bold : fonts.it;
    const wrapped = cells.map((c,i) => S.wrap(String(c==null?'':c), font, o.size, widths[i]-7));
    const rows = Math.max(...wrapped.map(w=>w.length), 1);
    const lh = o.size * 1.3;
    const h = rows*lh + 5;
    S.space(h);
    if (o.fillRow) S.page.drawRectangle({ x:S.left, y:S.y-h, width:S.width, height:h, color:S.rgb(...PDFX.fill) });
    let x = S.left;
    wrapped.forEach((w, i) => {
      w.forEach((ln, li) => {
        S.page.drawText(wa(ln), { x:x+3, y:S.y-o.size-2-li*lh, size:o.size, font, color:S.rgb(...(o.bold?PDFX.soft:PDFX.ink)) });
      });
      x += widths[i];
    });
    S.y -= h;
    S.page.drawLine({ start:{x:S.left,y:S.y}, end:{x:S.right,y:S.y}, thickness:0.4, color:S.rgb(...PDFX.line), opacity:0.7 });
  };

  S.newPage();
  return S;
}

/* ─── La scheda ─── */
async function exportCharacterPdf(charId){
  const c = charById(charId);
  if (!c){ toast('Personaggio non trovato'); return; }
  toast('📄 Preparo il PDF…');
  let lib;
  try { lib = await loadPdfLib(); }
  catch(e){ console.error(e); toast('⚠️ Non riesco a caricare il generatore PDF'); return; }

  try {
    const doc = await lib.PDFDocument.create();
    const fonts = {
      it:   await doc.embedFont(lib.StandardFonts.Helvetica),
      bold: await doc.embedFont(lib.StandardFonts.HelveticaBold),
      obl:  await doc.embedFont(lib.StandardFonts.HelveticaOblique),
    };
    doc.setTitle((c.name || 'Scheda') + ' — Grimorio');
    doc.setCreator('Grimorio');

    const S = pdfDoc(lib, doc, fonts, (c.name || 'Senza nome') + ' · ' + (c.classField || '') + ' ' + (c.level || 1) + '°');
    await drawSheet(S, c, lib, doc, fonts);

    const bytes = await doc.save();
    const safe = (c.name || 'scheda').replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/\s+/g, '-') || 'scheda';
    downloadBlob(new Blob([bytes], { type:'application/pdf' }), safe + '-lv' + (c.level||1) + '.pdf');
    toast('📄 Scheda esportata');
  } catch(e){
    console.error('Export PDF fallito', e);
    toast('⚠️ Esportazione non riuscita');
  }
}

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* Il ritratto è salvato come data URL: pdf-lib sa leggere PNG e JPEG.
   Se è un formato che non digerisce, si va avanti senza — meglio una
   scheda senza faccia che nessuna scheda. */
async function embedPortrait(c, doc, lib){
  const src = c.portrait;
  if (!src || typeof src !== 'string' || !src.startsWith('data:image/')) return null;
  try {
    const isPng = /^data:image\/png/i.test(src);
    const isJpg = /^data:image\/(jpe?g)/i.test(src);
    if (!isPng && !isJpg) return null;
    const b64 = src.split(',')[1];
    if (!b64) return null;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  } catch(e){ console.warn('Ritratto non incorporabile nel PDF', e); return null; }
}

async function drawSheet(S, c, lib, doc, fonts){
  const rgb = lib.rgb;
  const p = profBonus(c.level || 1);

  /* ── Intestazione, col ritratto se ce l'ha ── */
  let textLeft = S.left;
  const img = await embedPortrait(c, doc, lib);
  if (img){
    const side = 62;
    S.page.drawRectangle({ x:S.left-1, y:S.y-side-1, width:side+2, height:side+2,
      borderColor:rgb(...PDFX.gold), borderWidth:1, color:rgb(...PDFX.fill) });
    // riempie il riquadro senza deformare il ritratto
    const r = img.width / img.height;
    const dw = r >= 1 ? side * r : side, dh = r >= 1 ? side : side / r;
    S.page.drawImage(img, { x:S.left - (dw-side)/2, y:S.y - side - (dh-side)/2, width:dw, height:dh });
    textLeft = S.left + side + 12;
  }
  S.page.drawText(wa(c.name || 'Senza nome'), { x:textLeft, y:S.y-20, size:21, font:fonts.bold, color:rgb(...PDFX.ink) });
  S.y -= 26;
  /* La sottoclasse mancava dalla riga sotto il nome (un Druido senza
     circolo), e del multiclasse si stampava solo meta': «Druido 6° liv.»
     anche se eri Druido 4 / Ladro 2. Adesso la riga dice le classi vere
     e il livello totale. */
  const sc  = (typeof sottoclasseDi === 'function') ? sottoclasseDi(c) : null;
  const sc2 = (c.builder && c.builder.subclassId2 && typeof subclassesFor === 'function' && c.class2 && typeof classIdDaNome === 'function')
    ? (subclassesFor(classIdDaNome(c.class2)) || []).find(x => x.id === c.builder.subclassId2) : null;
  const lv1 = c.level || 1, lv2 = Number(c.level2) || 0;
  const classi = c.class2 && lv2
    ? (c.classField || 'Avventuriero') + (sc ? ' (' + sc.name + ')' : '') + ' ' + lv1
      + ' / ' + c.class2 + (sc2 ? ' (' + sc2.name + ')' : '') + ' ' + lv2
      + '  ·  ' + (lv1 + lv2) + '° livello totale'
    : [c.classField || 'Avventuriero', sc ? sc.name : '', lv1 + '° livello'].filter(Boolean).join('  ·  ');
  const sub = [classi, c.race, c.background, c.alignment].filter(Boolean).join('  ·  ');
  S.page.drawText(wa(sub), { x:textLeft, y:S.y-9, size:9.2, font:fonts.it, color:rgb(...PDFX.soft), maxWidth:S.right-textLeft-90 });
  if (c.playerName){
    const t = 'Giocatore: ' + c.playerName;
    S.page.drawText(wa(t), { x:S.right - fonts.it.widthOfTextAtSize(wa(t), 8.6), y:S.y-9, size:8.6, font:fonts.it, color:rgb(...PDFX.soft) });
  }
  S.y -= 18;
  const xpN = parseInt(String(c.xp||'').replace(/[^\d]/g,''), 10) || 0;
  if (xpN){
    const nx = (typeof xpForNextLevel === 'function') ? xpForNextLevel(c.level||1) : null;
    const t = xpN.toLocaleString('it-IT') + ' px' + (nx ? '  /  ' + nx.toLocaleString('it-IT') + ' per il ' + ((c.level||1)+1) + '°' : '  ·  livello massimo');
    S.page.drawText(wa(t), { x:textLeft, y:S.y-8.4, size:8.4, font:fonts.it, color:rgb(...PDFX.soft) });
    S.y -= 14;
  }
  if (img) S.y = Math.min(S.y, PDFX.H - PDFX.M - 62 - 8);
  S.page.drawLine({ start:{x:S.left,y:S.y}, end:{x:S.right,y:S.y}, thickness:1.4, color:rgb(...PDFX.gold) });
  S.y -= 14;

  /* ── Caratteristiche ── */
  const bw = (S.width - 5*7) / 6;
  const top = S.y;
  ABILITIES.forEach((a, i) => {
    const v = getPath(c, 'abilities.' + a.key, 10);
    S.stat(S.left + i*(bw+7), top, bw, 54, a.abbr, signStr(mod(v)), String(v));
  });
  S.y = top - 54 - 10;

  /* ── Numeri del combattimento ── */
  const cells = [
    ['CA', String(c.ac ?? 10), ''],
    ['INIZIATIVA', signStr(c.initiative ?? mod(getPath(c,'abilities.dex',10))), ''],
    ['VELOCITÀ', (c.speed ?? 9) + ' m', ''],
    ['COMPETENZA', signStr(p), ''],
    ['PERC. PASS.', String(passivePerception(c)), ''],
    ['PUNTI FERITA', getPath(c,'hp.current',0) + '/' + getPath(c,'hp.max',0), (getPath(c,'hp.temp',0) ? '+' + getPath(c,'hp.temp',0) + ' temp' : hitDiceLeft(c) + 'd' + (c.hitDie||8) + ' rimasti')],
  ];
  const cw = (S.width - 5*7) / 6;
  const top2 = S.y;
  cells.forEach((cell, i) => S.stat(S.left + i*(cw+7), top2, cw, 42, cell[0], cell[1], cell[2]));
  S.y = top2 - 42 - 4;

  /* ── Tiri salvezza e abilità, in due colonne ── */
  S.heading('Tiri salvezza e abilità');
  const colW = (S.width - 16) / 2;
  const startY = S.y;
  let leftY = startY, rightY = startY;

  const putLine = (col, txt, marked, boldVal) => {
    const x = col === 0 ? S.left : S.left + colW + 16;
    let y = col === 0 ? leftY : rightY;
    if (y - 12 < PDFX.M + 26){
      // se una colonna finisce il foglio, si continua sulla pagina dopo
      S.newPage(); leftY = rightY = S.y; y = S.y;
    }
    if (marked) S.page.drawCircle({ x:x+3.4, y:y-6, size:2.6, color:rgb(...PDFX.accent) });
    S.page.drawCircle({ x:x+3.4, y:y-6, size:2.6, borderColor:rgb(...PDFX.soft), borderWidth:0.6, opacity:0 });
    S.page.drawText(wa(txt.label), { x:x+11, y:y-8.6, size:8.4, font: marked ? fonts.bold : fonts.it, color:rgb(...PDFX.ink) });
    const v = txt.value;
    S.page.drawText(wa(v), { x:x + colW - fonts.bold.widthOfTextAtSize(wa(v), 8.4) - 2, y:y-8.6, size:8.4, font:fonts.bold, color:rgb(...(marked?PDFX.accent:PDFX.soft)) });
    if (col === 0) leftY = y - 12.4; else rightY = y - 12.4;
  };

  S.page.drawText(wa('TIRI SALVEZZA'), { x:S.left, y:leftY-7, size:7, font:fonts.bold, color:rgb(...PDFX.soft) });
  leftY -= 12;
  ABILITIES.forEach(a => putLine(0, { label:a.label, value:signStr(saveMod(c, a.key)) }, (c.saveProf||[]).includes(a.key)));
  leftY -= 6;
  S.page.drawText(wa('ABILITÀ'), { x:S.left, y:leftY-7, size:7, font:fonts.bold, color:rgb(...PDFX.soft) });
  leftY -= 12;
  const half = 5; // a sinistra ci sono già i tiri salvezza: il resto va a destra
  S.page.drawText(wa('ABILITÀ'), { x:S.left+colW+16, y:rightY-7, size:7, font:fonts.bold, color:rgb(...PDFX.soft) });
  rightY -= 12;
  SKILLS.slice(0, half).forEach(s => putLine(0, { label:s.label + ' (' + ABILITY_BY_KEY[s.ability].abbr + ')', value:signStr(skillMod(c,s)) }, skillLevel(c,s.key) > 0));
  SKILLS.slice(half).forEach(s => putLine(1, { label:s.label + ' (' + ABILITY_BY_KEY[s.ability].abbr + ')', value:signStr(skillMod(c,s)) }, skillLevel(c,s.key) > 0));
  S.y = Math.min(leftY, rightY) - 4;
  const exp = (c.skillExpert||[]).length;
  if (exp) S.text('Il pallino pieno segna la competenza. Con competenza doppia: ' + (c.skillExpert||[]).map(k=>{ const s = SKILLS.find(x=>x.key===k); return s?s.label:k; }).join(', ') + '.', { size:7.6, color:PDFX.soft, font:fonts.obl });

  /* ── Attacchi ── */
  const atks = c.attacks || [];
  if (atks.length){
    S.heading('Attacchi');
    const w = [S.width*0.34, S.width*0.14, S.width*0.20, S.width*0.32];
    S.trow(['Nome','Bonus','Danni','Note'], w, { bold:true, size:7.6 });
    atks.forEach(a => S.trow([
      a.name || '—',
      (a.atk !== '' && a.atk != null) ? signStr(parseInt(a.atk) || 0) : '',
      a.dmg || '',
      a.notes || ''
    ], w));
  }

  /* ── Risorse e condizioni ── */
  const res = (c.resources || []).filter(r => r.name);
  /* La sezione era chiusa a chiave dietro risorse/condizioni: un
     personaggio con solo effetti a tempo o concentrazione non se la
     vedeva stampare affatto. */
  if (res.length || (c.conditions||[]).length || c.inspiration || c.exhaustion
      || (c.effetti||[]).length || (c.concentration && c.concentration.on) || c.hitDie2){
    S.heading('Risorse e stato');
    const recLabel = { sr:'riposo breve', lr:'riposo lungo', dn:'alba' };
    if (res.length) S.text(res.map(r =>
      r.name + ': ' + (r.left ?? r.total ?? 0) + '/' + (r.total ?? 0) + (recLabel[r.recovery] ? ' (' + recLabel[r.recovery] + ')' : '')
    ).join('   ·   '), { size:8.6 });
    if ((c.conditions||[]).length && typeof CONDITION_BY_ID !== 'undefined')
      S.row('Condizioni', (c.conditions||[]).map(id => CONDITION_BY_ID[id] ? CONDITION_BY_ID[id].name : id).join(', '));
    /* Gli effetti a tempo esistono dalla v7.8 e non erano mai arrivati
       sulla stampa: chi porta la scheda di carta al tavolo perdeva
       proprio la roba che cambia turno per turno. */
    if ((c.effetti||[]).length)
      S.row('Effetti attivi', c.effetti.map(e =>
        e.nome + (e.round != null ? ' (' + e.round + (e.round === 1 ? ' round' : ' round') + ')' : (e.durata ? ' (' + e.durata + ')' : ''))
      ).join(', '));
    if (c.concentration && c.concentration.on)
      S.row('Concentrazione', c.concentration.spell || 'sì');
    if (c.hitDie2) S.row('Secondo dado vita', 'd' + c.hitDie2 + ' · ' + Math.max(0,(c.level||1) - (c.hitDiceUsed2||0)) + ' rimasti');
    if (c.inspiration) S.row('Ispirazione', 'sì');
    if (c.exhaustion) S.row('Indebolimento', 'livello ' + c.exhaustion);
  }

  /* ── Competenze ── */
  if (c.profOther || c.languages || c.tools || c.armor || c.senses){
    S.heading('Competenze e lingue');
    S.row('Armi e armature', c.profOther || c.armor);
    S.row('Strumenti', c.tools);
    S.row('Lingue', c.languages);
    S.row('Sensi', c.senses);
  }

  /* ── Incantesimi ── */
  const known = (c.knownSpells || []).map(k => ({ ref:k, sp: spellByRef(k) })).filter(x => x.sp);
  if (known.length || (c.casterType && c.casterType !== 'none')){
    S.heading('Incantesimi');
    const abKey = c.spellAbility || 'int';
    S.row('Caratteristica', (ABILITY_BY_KEY[abKey] ? ABILITY_BY_KEY[abKey].label : abKey)
      + '  ·  CD ' + (8 + spellcastingMod(c)) + '  ·  attacco ' + signStr(spellcastingMod(c)));
    const slots = slotsFor(c) || [];
    const slotTxt = slots.map((n,i) => n ? (i+1) + '°: ' + n : null).filter(Boolean).join('   ');
    if (slotTxt) S.row('Slot', slotTxt);
    S.gap(4);

    const byLvl = {};
    known.forEach(k => { const l = k.sp.level || 0; (byLvl[l] = byLvl[l] || []).push(k); });
    Object.keys(byLvl).map(Number).sort((a,b)=>a-b).forEach(lvl => {
      const list = byLvl[lvl].sort((a,b) => spellName(a.sp).localeCompare(spellName(b.sp), 'it'));
      S.space(20);
      S.page.drawText(wa(lvl === 0 ? 'TRUCCHETTI' : lvl + '° LIVELLO'), { x:S.left, y:S.y-7.4, size:7.4, font:fonts.bold, color:rgb(...PDFX.gold) });
      S.y -= 12;
      const names = list.map(k => {
        const prep = (c.preparedSpells||[]).includes(k.ref.id);
        const conc = k.sp.conc ? ' (C)' : '';
        return (prep ? '* ' : '') + spellName(k.sp) + conc;
      });
      S.text(names.join('   ·   '), { size:8.4 });
      S.gap(3);
    });
    if ((c.preparedSpells||[]).length) S.text('* preparato     (C) concentrazione', { size:7.4, color:PDFX.soft, font:fonts.obl });
  }

  /* ── Zaino ── */
  const inv = (c.inventory || []).filter(i => i.name);
  if (inv.length || (c.coins && Object.values(c.coins).some(v=>v))){
    S.heading('Zaino');
    if (c.coins){
      const coins = [['pp','MP'],['gp','MO'],['ep','ME'],['sp','MA'],['cp','MR']]
        .map(([k,l]) => (c.coins[k] ? c.coins[k] + ' ' + l : null)).filter(Boolean).join('   ·   ');
      if (coins) S.row('Monete', coins);
    }
    if (inv.length){
      /* Le cariche di bacchette e bastoni (v7.8) non si stampavano:
         era proprio il numero che al tavolo si segna a matita. */
      const conCariche = inv.some(i => i.caricheMax);
      const w = conCariche
        ? [S.width*0.38, S.width*0.09, S.width*0.12, S.width*0.13, S.width*0.28]
        : [S.width*0.44, S.width*0.10, S.width*0.13, S.width*0.33];
      const recBreve = { sr:'r. breve', lr:'r. lungo', dn:'alba' };
      S.trow(conCariche ? ['Oggetto','Qtà','Peso','Cariche','Note'] : ['Oggetto','Qtà','Peso','Note'],
        w, { bold:true, size:7.6 });
      inv.forEach(it => {
        const base = [
          (it.equipped ? '> ' : '') + it.name + (it.attuned ? ' (sintonizzato)' : ''),
          String(it.qty || 1),
          it.weight ? String(it.weight).replace('.', ',') + ' kg' : '',
        ];
        if (conCariche) base.push(it.caricheMax
          ? ((it.cariche != null ? it.cariche : it.caricheMax) + '/' + it.caricheMax
             + (recBreve[it.recupero] ? ' · ' + recBreve[it.recupero] : ''))
          : '');
        base.push(it.notes || '');
        S.trow(base, w);
      });
      S.gap(4);
      S.text('Peso trasportato: ' + totalWeight(c).toFixed(1).replace('.0','').replace('.', ',') + ' kg', { size:8, color:PDFX.soft });
    }
  }

  /* ── Compagni ── */
  const comps = c.companions || [];
  if (comps.length){
    S.heading('Compagni e forme');
    const w = [S.width*0.30, S.width*0.22, S.width*0.16, S.width*0.32];
    S.trow(['Nome','Tipo','PF','Statistiche'], w, { bold:true, size:7.6 });
    comps.forEach(cp => {
      const m = (typeof MONSTER_BY_ID !== 'undefined') ? MONSTER_BY_ID[cp.monsterId] : null;
      const kind = (typeof COMPANION_KINDS !== 'undefined' && COMPANION_KINDS[cp.kind]) ? COMPANION_KINDS[cp.kind].label : cp.kind;
      S.trow([
        cp.name + (c.activeForm === cp.cid ? ' (in forma)' : ''),
        kind,
        (cp.hp ? cp.hp.current + '/' + cp.hp.max : ''),
        m ? ('CA ' + m.ac + ' · GS ' + m.cr + ' · ' + m.sp) : ''
      ], w);
    });
  }

  /* ── Privilegi e tratti ── */
  if (c.features || c.notesRace || c.notesExtra || c.feats){
    S.heading('Privilegi e tratti');
    [['', c.features], ['', c.notesRace], ['', c.notesExtra], ['Talenti', c.feats]].forEach(([lbl, txt]) => {
      if (!txt) return;
      if (lbl){ S.space(14); S.page.drawText(wa(lbl.toUpperCase()), { x:S.left, y:S.y-7.4, size:7.4, font:fonts.bold, color:rgb(...PDFX.gold) }); S.y -= 12; }
      S.text(txt, { size:8.3 });
      S.gap(6);
    });
  }

  /* ── Storia ── */
  const story = [
    ['Tratti caratteriali', c.traits], ['Ideali', c.ideals], ['Legami', c.bonds], ['Difetti', c.flaws],
    ['Alleati', c.allies], ['Nemici', c.enemies], ['Fazione', c.faction], ['Simbolo', c.symbol],
  ].filter(x => x[1]);
  const app = c.appearance || {};
  const appTxt = [
    c.sex && (typeof sexLabel === 'function' ? sexLabel(c.sex) : c.sex),
    app.age && ('Età ' + app.age), app.height && ('Altezza ' + app.height), app.weight && ('Peso ' + app.weight),
    app.eyes && ('Occhi ' + app.eyes), app.skin && ('Pelle ' + app.skin), app.hair && ('Capelli ' + app.hair),
  ].filter(Boolean).join('  ·  ');

  if (story.length || appTxt || app.text || c.backstory){
    S.heading('Storia e aspetto');
    if (appTxt) S.row('Aspetto', appTxt);
    if (app.text){ S.text(app.text, { size:8.3 }); S.gap(5); }
    story.forEach(([l, v]) => S.row(l, v));
    if (c.backstory){
      S.gap(5);
      S.space(14);
      S.page.drawText(wa('STORIA'), { x:S.left, y:S.y-7.4, size:7.4, font:fonts.bold, color:rgb(...PDFX.gold) });
      S.y -= 12;
      S.text(c.backstory, { size:8.3 });
    }
  }

  /* ── Nota di licenza, ancorata al fondo dell'ultima pagina:
        così non è mai lei ad aprire un foglio nuovo ── */
  const note = 'Generata con Grimorio. Il materiale di regole proviene dal System Reference Document 5.1 (Open Gaming License 1.0a).';
  S.page.drawLine({ start:{x:S.left,y:46}, end:{x:S.right,y:46}, thickness:0.6, color:rgb(...PDFX.gold), opacity:0.6 });
  S.page.drawText(wa(note), { x:S.left, y:38, size:6.4, font:fonts.obl, color:rgb(...PDFX.soft) });
}
