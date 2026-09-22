/* ══════════════════════════════════════════════════════════════
   Grimorio — lettura in blocco di sottoclassi, razze e background
   Carichi un testo (o un PDF) dai manuali che possiedi e l'app
   riconosce da sola i blocchi, te li elenca e tu scegli quali
   tenere. Quello che entra resta tuo: lo condividi col tavolo
   solo se lo decidi.
   ══════════════════════════════════════════════════════════════ */

/* ─── Riconoscimento ───
   Non cerchiamo nomi noti: cerchiamo la FORMA che hanno queste voci
   nei testi di gioco, così funziona con qualsiasi manuale o appunto. */

const HB_STOP_HEAD = /^(chapter|capitolo|contents|indice|appendix|appendice|part |parte |subclasses?\b|sottoclassi\b)/i;
/* Separatore interno fra una voce «o» e i suoi dettagli «▪»: un carattere
   che nei manuali non c'e', cosi' dopo si ritrovano le opzioni intatte. */
const HB_SOTTO = ' \u2023 ';

/* Ripulisce le spaziature rotte tipiche dei testi estratti da PDF */
function hbTidy(raw){
  return String(raw||'')
    .replace(/\r/g, '')
    /* I PDF portano dietro caratteri che sullo schermo diventano un
       quadratino: glifi di font simbolo (area a uso privato), caselle
       geometriche, trattini morbidi e spazi a larghezza zero. Nel testo
       non significano niente, ma finiscono in mezzo alle frasi. */
    .replace(/[\uE000-\uF8FF\uFFFC\uFFFD]/g, '')
    .replace(/[\u25A0\u25A1\u2610\u2611\u2612]/g, '')
    .replace(/[\u00AD\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map(l => l.trim()).join('\n');
}
/* "C o n t e n t s" → "Contents": righe di sole lettere separate */
function hbUnspace(line){
  const l = String(line||'').trim();
  if (l.length < 5) return l;
  const pezzi = l.split(' ');
  const singole = pezzi.filter(p => p.length === 1).length;
  if (pezzi.length >= 4 && singole / pezzi.length > 0.6) return pezzi.join('');
  return l;
}
function hbIsHeading(line){
  const l = hbUnspace(line);
  if (!l || l.length > 52 || l.length < 3) return false;
  if (HB_STOP_HEAD.test(l)) return false;
  if (/[.:;,]$/.test(l)) return false;
  if (l.includes(':')) return false;     // «Competenze: …» è un campo, non un titolo
  if (/^\d/.test(l)) return false;
  // titoli: parole che cominciano per maiuscola, poche parole
  const parole = l.split(/\s+/);
  if (parole.length > 6) return false;
  const maiuscole = parole.filter(p => /^[A-ZÀ-Ý]/.test(p)).length;
  return maiuscole >= Math.max(1, Math.ceil(parole.length * 0.6));
}

/* ── Background: li tradisce «Competenze nelle abilità» / «Skill Proficiencies» ── */
const RX_BG_SKILL = /^(Skill Proficiencies|Competenze nelle abilit[àa]|Abilit[àa])\s*:\s*(.+)$/i;
const RX_BG_TOOL  = /^(Tool Proficiencies|Competenze negli strumenti|Strumenti)\s*:\s*(.+)$/i;
const RX_BG_LANG  = /^(Languages?|Lingue|Linguaggi)\s*:\s*(.+)$/i;
const RX_BG_EQUIP = /^(Equipment|Equipaggiamento)\s*:\s*(.+)$/i;
const RX_BG_FEAT  = /^(Feature|Privilegio)\s*:\s*(.+)$/i;

/* ── Razze: «Ability Score Increase» + «Speed» + «Size» ── */
const RX_RACE_ASI  = /^(Ability Score Increase|Aumento dei Punteggi di Caratteristica|Aumento del Punteggio di Caratteristica)\s*[.:]\s*(.*)$/i;
const RX_RACE_SPEED= /^(Speed|Velocit[àa])\s*[.:]\s*(.*)$/i;
const RX_RACE_SIZE = /^(Size|Taglia)\s*[.:]\s*(.*)$/i;
const RX_RACE_LANG = /^(Languages?|Lingue|Linguaggi)\s*[.:]\s*(.*)$/i;
const RX_RACE_AGE  = /^(Age|Et[àa])\s*[.:]\s*(.*)$/i;
const RX_RACE_ALIGN= /^(Alignment|Allineamento)\s*[.:]\s*(.*)$/i;

/* ── Sottoclassi: privilegi con il livello dentro ── */
const RX_LEVEL_EN = /\bat\s+(\d+)(?:st|nd|rd|th)\s+level\b/i;
const RX_LEVEL_IT = /\bal\s+(\d+)[°ºo]?\s*livello\b/i;
function hbLevelIn(text){
  const m = RX_LEVEL_IT.exec(text) || RX_LEVEL_EN.exec(text);
  return m ? clamp(parseInt(m[1]), 1, 20) : null;
}

const ABIL_WORDS = {
  strength:'str', forza:'str', dexterity:'dex', destrezza:'dex',
  constitution:'con', costituzione:'con', intelligence:'int', intelligenza:'int',
  wisdom:'wis', saggezza:'wis', charisma:'cha', carisma:'cha',
};
function parseAbilityBonus(testo){
  const out = {};
  const t = String(testo||'');
  const rx = /(your\s+)?([A-Za-zÀ-ý]+)\s+score\s+increases?\s+by\s+(\d+)|(?:il\s+tuo\s+)?punteggio\s+di\s+([A-Za-zÀ-ý]+)\s+aumenta\s+di\s+(\d+)|([A-Za-zÀ-ý]+)\s*\+\s*(\d+)/gi;
  let m;
  while ((m = rx.exec(t))){
    const nome = (m[2] || m[4] || m[6] || '').toLowerCase();
    const val = parseInt(m[3] || m[5] || m[7]);
    const k = ABIL_WORDS[nome];
    if (k && val >= 1 && val <= 3) out[k] = val;
  }
  return out;
}
function parseSpeedM(testo){
  const t = String(testo||'');
  let m = /(\d+)\s*(?:metri|metro|m\b)/i.exec(t);
  if (m) return clamp(parseFloat(m[1]), 1, 30);
  m = /(\d+)\s*(?:feet|foot|ft\.?|piedi)/i.exec(t);
  if (m) return clamp(Math.round(parseInt(m[1]) * 0.3 * 2) / 2, 1, 30);
  return 9;
}
function parseSizeWord(testo){
  const t = norm(testo||'');
  if (/piccol|small/.test(t)) return 'Piccola';
  if (/grande|large/.test(t)) return 'Grande';
  if (/minuscol|tiny/.test(t)) return 'Minuscola';
  return 'Media';
}
function parseSkillList(testo){
  const t = norm(testo||'');
  const out = [];
  SKILLS.forEach(s => { if (t.includes(norm(s.label))) out.push(s.key); });
  const EN = { acrobatics:'acrobatics', 'animal handling':'animalHandling', arcana:'arcana', athletics:'athletics',
    deception:'deception', history:'history', insight:'insight', intimidation:'intimidation',
    investigation:'investigation', medicine:'medicine', nature:'nature', perception:'perception',
    performance:'performance', persuasion:'persuasion', religion:'religion',
    'sleight of hand':'sleightOfHand', stealth:'stealth', survival:'survival' };
  Object.keys(EN).forEach(k => { if (t.includes(norm(k)) && !out.includes(EN[k])) out.push(EN[k]); });
  return [...new Set(out)];
}


/* ─── Normalizzazione ───
   Le guide impaginate su due colonne escono con i pallini staccati dal
   testo, i numeri di pagina in mezzo alle frasi e i valori che vanno a
   capo. Qui rimettiamo insieme le voci prima di leggerle. */
function hbNormalizza(raw){
  const grezze = hbTidy(raw).split('\n');
  // I titoli a volte vanno a capo prima della fonte:
  // «Cammino del Guerriero Totemico» + «(PHB/SC Update):» → una riga sola.
  for (let i = 0; i < grezze.length - 1; i++){
    const a = (grezze[i]||'').trim(), b = (grezze[i+1]||'').trim();
    if (a && !/[:.!?]$/.test(a) && /^\([^)]{2,30}\)\s*:$/.test(b) && a.length <= 60 && /^[A-ZÀ-Ý]/.test(a)){
      grezze[i] = a + ' ' + b; grezze[i+1] = '';
      continue;
    }
    // La parentesi può spezzarsi a metà: «Via dell'Anima Solare (SC/XG» + «Update):»
    const apre = (a.match(/\(/g)||[]).length, chiude = (a.match(/\)/g)||[]).length;
    if (a && apre > chiude && /^[^()]{1,30}\)\s*:$/.test(b) && a.length <= 60 && /^[A-ZÀ-Ý]/.test(a)){
      grezze[i] = a + ' ' + b; grezze[i+1] = '';
    }
  }
  /* Una guida fatta tutta a elenchi puntati («• Speed: 30ft.»): li' ogni
     campo ha il suo pallino, e una riga SENZA pallino e' sempre il
     seguito della voce sopra — anche se sembra un titolo («Undercommon»,
     «Small», «Save)») o un campo («Ancestry: each creature…», che e'
     «Draconic» + a capo + «Ancestry»). Solo un vero titolo «Nome (FONTE):»
     apre qualcosa. */
  const conPallino = grezze.filter(l => /^[•◦▪]\s*[A-ZÀ-Ý][^:]{1,40}:/.test(l)).length;
  const senza = grezze.filter(l => /^[A-ZÀ-Ý][^:]{1,40}:\s*\S/.test(l)).length;
  const tuttaAPallini = conPallino >= 30 && conPallino / (conPallino + senza) > 0.9;
  const voci = [];   // { marker:'•'|'o'|'', testo }
  const push = (marker, testo) => voci.push({ marker, testo: testo.trim() });

  for (let i = 0; i < grezze.length; i++){
    let l = grezze[i];
    if (!l) { push('', ''); continue; }
    if (/^\d{1,4}$/.test(l)) continue;                 // numero di pagina
    if (/^((st|nd|rd|th)\s*)+$/.test(l)) continue;     // gli apici di "6th" finiti su una riga loro
    if (/^[•▪◦]$/.test(l) || /^o$/.test(l)) continue;   // pallino orfano
    let marker = '';
    let m = /^([•◦])\s*(.*)$/.exec(l);
    if (m){ marker = '•'; l = m[2]; }
    else if ((m = /^▪\s*(.*)$/.exec(l))){
      /* «▪» e' il terzo livello: il dettaglio della voce «o» di sopra
         (Shifter: «o Beasthide: Constitution +1» / «▪ Feature: …»).
         Non e' un tratto nuovo della razza: si attacca a quella voce. */
      const su = [...voci].reverse().find(v => v.testo);
      if (su && su.marker === 'o'){ su.testo = su.testo.replace(/\s+$/, '') + HB_SOTTO + m[1].trim(); continue; }
      marker = 'o'; l = m[1];
    }
    else { m = /^o\s+(.+)$/.exec(l); if (m){ marker = 'o'; l = m[1]; } }
    l = l.trim();
    if (!l){ if (marker) push(marker, ''); continue; }

    let prec = voci[voci.length-1];
    /* «You learn three» + a capo + «Alchemical Formula options:»: sembra un
       titolo ma e' la fine della frase. Un titolo vero, qui, porta la fonte
       fra parentesi, oppure arriva dopo una voce finita. */
    const suPrima = (() => { let k = voci.length - 1; while (k >= 0 && !voci[k].testo) k--; return voci[k]; })();
    const titoloDebole = hbTitolo(l) && !/\([^)]{1,30}\)\s*:\s*$/.test(l)
      && suPrima && suPrima.marker && !/[.!?:)]$/.test(suPrima.testo);
    if (tuttaAPallini && !marker && (!hbTitolo(l) || titoloDebole) && !hbApreVarianti(l) && !HB_STOP_HEAD.test(l)){
      let k = voci.length - 1;
      while (k >= 0 && !voci[k].testo && voci.length - k <= 3) k--;
      const su = voci[k];
      if (su && su.testo && su.marker && !hbTitolo(su.testo)){
        voci.length = k + 1;
        su.testo = hbUnisci(su.testo, l);
        continue;
      }
    }
    /* Una riga vuota in mezzo a una voce rimasta a meta' (fine colonna,
       fine pagina) non la chiude: «Languages: Common, Dwarvish, and» +
       riga vuota + «Undercommon» e' ancora la stessa voce. */
    if (prec && !prec.testo){
      let k = voci.length - 1;
      while (k >= 0 && !voci[k].testo && voci.length - k <= 3) k--;
      const su = voci[k];
      const aMeta = su && su.testo && su.marker && !/[.!?:]$/.test(su.testo);
      if (aMeta && !marker && /(,|\b(and|or|of|the|to|with|a|e|o|di|il|la|per))$/i.test(su.testo)){
        voci.length = k + 1;              // finisce con «and», «,»: continua di sicuro
        su.testo = hbUnisci(su.testo, l);
        continue;
      }
      if (aMeta && !marker && /^[a-z(]/.test(l)){
        voci.length = k + 1;
        prec = su;
      }
    }
    /* «È rimasta a metà» vuol dire: c'è una riga prima, non finisce con
       un punto o due punti, e non è un titolo. Una riga che segue una
       frase a metà la sta continuando — anche se ha dei due punti in
       mezzo, anche se comincia in maiuscolo. È il paragrafo che il PDF
       ha mandato a capo, non una voce nuova. */
    const cm = /^(.{2,48}?)\s*:(\s|$)/.exec(l);
    const et = cm ? cm[1].trim() : '';
    const parole = et ? et.split(/\s+/).length : 0;
    const precAMeta = !!(prec && prec.testo && !/[.!?:]$/.test(prec.testo) && !hbIsHeading(prec.testo));
    const apreVoce = marker
      || (et && hbEtichettaNota(et))                   // «Velocità:» apre sempre
      // Un'etichetta corta apre comunque; una lunga solo se la riga
      // prima è finita — se no è la coda di un paragrafo con dentro
      // dei due punti, non un campo nuovo.
      || (hbSembraEtichetta(l) && (parole <= 3 || !precAMeta))
      || /^(.+?)\s*\([A-Za-z0-9][A-Za-z0-9\/ .'\u2019-]{1,28}\)\s*:?\s*$/.test(l)   // «Nome (FONTE):»
      || hbIsHeading(l);
    // Una riga che non apre niente continua quella prima, ma solo se
    // quella prima è rimasta a metà: un titolo «Nome (FONTE):» è finito,
    // e non deve mangiarsi la prosa che lo segue.
    if (!apreVoce && prec && prec.testo && !/[.!?:]$/.test(prec.testo)){
      prec.testo = hbUnisci(prec.testo, l);
      continue;
    }
    if (!apreVoce && prec && prec.testo && prec.marker && !/:$/.test(prec.testo)){
      prec.testo = hbUnisci(prec.testo, l);
      continue;
    }
    push(marker, l);
  }
  return voci;
}

/* Titolo di una voce: «Nome (FONTE):» oppure «Nome:» */
function hbTitolo(testo){
  const m = /^(.{2,60}?)\s*(?:\(([A-Za-z0-9][A-Za-z0-9/ '.\u2019-]{1,28})\))?\s*:\s*$/.exec(String(testo||'').trim());
  if (!m) return null;
  const nome = m[1].trim();
  if (!nome || nome.length < 3 || /^\d/.test(nome)) return null;
  if (HB_STOP_HEAD.test(nome)) return null;
  if (!/^[A-ZÀ-Ý]/.test(nome)) return null;
  // un titolo non contiene numeri, virgole o riferimenti a livelli
  if (/\d/.test(nome) || /,/.test(nome)) return null;
  if (/^(level|livello)\b/i.test(nome)) return null;
  return { nome, fonte: m[2] || '' };
}
/* Una voce «Campo: valore» */
/* Un'etichetta di campo si riconosce da com'è fatta, non dal fatto che
   ci siano due punti: comincia in maiuscolo, è corta, e dentro non ha
   punteggiatura di frase. Senza questi vincoli bastava un due punti in
   mezzo a una riga qualsiasi — «…uno dei seguenti trucchetti a tua
   scelta: mano magica, luce…» — per spezzare un tratto in due voci. */
function hbEtichettaValida(campo){
  const et = String(campo||'').trim();
  if (et.length < 3 || et.length > 48) return false;
  if (!/^[A-ZÀ-Ý]/.test(et)) return false;
  if (/[.!?,;]/.test(et)) return false;
  if (et.split(/\s+/).length > 7) return false;
  return true;
}
/* I campi che un manuale usa sempre uguali. Questi aprono una voce anche
   se la riga prima è rimasta a metà: se il PDF taglia male un paragrafo,
   «Velocità:» non deve finire dentro la frase precedente. */
function hbEtichettaNota(campo){
  const et = String(campo||'').trim();
  return HB_CAMPI_RAZZA.test(et)
      || /^(skill proficiencies|tool proficiencies|competenze nelle abilit[àa]|competenze negli strumenti|abilit[àa]|strumenti|equipment|equipaggiamento|feature|privilegio)$/i.test(et);
}
function hbSembraEtichetta(riga){
  const m = /^(.{2,48}?)\s*:(\s|$)/.exec(String(riga||'').trim());
  return !!m && hbEtichettaValida(m[1]);
}
/* Due righe che si attaccano. Se la prima finisce con un trattino è una
   parola spezzata a fine riga («resist-» + «enza»), non due parole. */
function hbUnisci(a, b){
  if (/[A-Za-zÀ-ÿ]-$/.test(a) && /^[a-zà-ÿ]/.test(b)) return a.slice(0, -1) + b;
  return a + ' ' + b;
}
/* Rimette insieme i paragrafi che il PDF ha mandato a capo. Una riga
   continua quella prima quando quella prima non è finita — niente punto
   in fondo, e non è un titolo. Prima di questo, ogni riga era una voce a
   sé: un tratto lungo tre righe diventava un tratto troncato più due
   pezzi di frase spacciati per tratti nuovi. */
function hbParagrafi(righe){
  const out = [];
  for (const r of (righe||[])){
    const l = String(r||'').trim();
    if (!l){ out.push(''); continue; }
    const prec = out.length ? out[out.length-1] : '';
    const cm = /^(.{2,48}?)\s*[.:](\s|$)/.exec(l);
    const precAMeta = !!(prec && !/[.!?:]$/.test(prec) && !hbIsHeading(prec));
    const apre = !precAMeta
      || (cm && hbEtichettaNota(cm[1]))
      || hbIsHeading(l);
    if (apre) out.push(l);
    else out[out.length-1] = hbUnisci(prec, l);
  }
  return out;
}
/* «You can speak, read, and write Common and Elvish.» → «Common and
   Elvish»: la frase intera in un campo che dice «Lingue» è rumore. */
function hbLingue(testo){
  let t = String(testo||'').trim();
  t = t.replace(/^(you can (?:speak,? (?:read,? )?(?:and )?write|speak|read and write)|puoi parlare(?:, leggere e scrivere)?|sai parlare(?:, leggere e scrivere)?|parli(?:, leggi e scrivi)?)\s+/i, '');
  t = t.replace(/[.;\s]+$/, '').trim();
  return t.slice(0,120) || 'Comune';
}
function hbCampo(testo){
  const m = /^(.{2,48}?)\s*:\s*(.+)$/s.exec(String(testo||'').trim());
  if (!m) return null;
  const campo = m[1].trim();
  if (!hbEtichettaValida(campo)) return null;
  return { campo, valore: m[2].trim() };
}
/* «Shifter Subraces», «Sottorazze», «Varianti»: da qui in poi le voci
   non sono più tratti della razza, sono le VARIANTI fra cui scegliere.
   Senza questo, Pellebestia e Zannalunga finivano fra i tratti e la
   creazione guidata non ti faceva scegliere niente. */
const HB_APRE_VARIANTI = /\b(sub-?races?|sub-?race|sottorazz[ae]|varianti|variante|lignagg(?:io|i)|lineages?|legac(?:y|ies))\b/i;
function hbApreVarianti(testo){
  const t = String(testo||'').trim();
  if (!t || t.length > 70) return false;
  return HB_APRE_VARIANTI.test(t);
}
/* Una variante porta quasi sempre il suo aumento di caratteristica
   dentro al testo: «Your Constitution score increases by 1». */
function hbVariante(nome, testo){
  /* Un identificativo vero da subito: le schede ci si attaccano, e
     rileggendo lo stesso manuale quello vecchio viene riusato. */
  return { id: (typeof uid === 'function' ? uid() : 'var-' + Math.random().toString(36).slice(2)),
           name: String(nome||'').trim(),
           bonus: parseAbilityBonus(String(testo||'')),
           traits: [[String(nome||'').trim(), String(testo||'').split(HB_SOTTO).join(' · ').slice(0,500)]] };
}
const HB_CAMPI_RAZZA = /^(ability scores?|ability score increase|aumento dei punteggi(?: di caratteristica)?|punteggi di caratteristica|incremento dei punteggi(?: di caratteristica)?|age|et[àa]|size|taglia|speed|velocit[àa]|languages?|lingue|linguaggi|alignment|allineamento)$/i;

/* Nomi di classe riconosciuti, in italiano e in inglese. Serve a capire
   quando un titolo apre la sezione di una classe invece di essere una
   sottoclasse: da quel punto in poi le sottoclassi appartengono a quella. */
function hbClasseDaNome(nome){
  let n = norm(String(nome||'').replace(/\([^)]*\)/g,' '));
  n = n.replace(/\s+/g,' ').trim();
  if (!n) return null;
  const EN = { barbarian:'barbarian', bard:'bard', cleric:'cleric', druid:'druid',
    fighter:'fighter', monk:'monk', paladin:'paladin', ranger:'ranger', rogue:'rogue',
    sorcerer:'sorcerer', warlock:'warlock', wizard:'wizard' };
  const tab = {};
  classiBase().forEach(c => {
    tab[norm(c.name)] = c.id; tab[norm(c.id)] = c.id;
  });
  Object.keys(EN).forEach(k => { tab[k] = EN[k]; });
  if (tab[n]) return tab[n];
  const sing = n.replace(/s$/,'');                 // «Druids» → «Druid»
  if (tab[sing]) return tab[sing];
  return null;
}
/* Il corpo di una classe si riconosce dai suoi campi di apertura. */
function hbSembraClasse(corpo){
  const campi = corpo.map(v => hbCampo(v.testo)).filter(Boolean).map(c => norm(c.campo));
  const testi = corpo.map(v => norm(v.testo));
  const ha = (rx) => campi.some(c => rx.test(c)) || testi.some(t => rx.test(t));
  return (ha(/^hit dice|^dadi vita/) || ha(/^hit points/)) &&
         (ha(/^armor$|^armature$/) || ha(/^saving throws|^tiri salvezza/) || ha(/^proficiencies|^competenze$/));
}

/* «Scoperta. La solitudine ti ha portato a…» → titolo e corpo separati,
   come li tiene il lettore a righe: chi li consuma si aspetta due campi. */
function hbTitoloPrivilegio(testo){
  const t = String(testo||'').trim();
  if (!t) return '';
  const m = /^(.{2,60}?)[.:]\s+(.+)$/s.exec(t);
  return (m ? m[1] : t).trim().slice(0,80);
}
function hbCorpoPrivilegio(testo){
  const t = String(testo||'').trim();
  if (!t) return '';
  const m = /^(.{2,60}?)[.:]\s+(.+)$/s.exec(t);
  return m ? m[2].trim().slice(0,700) : '';
}
/* «una a tua scelta», «due lingue», «two languages», «1». */
function hbQuanteLingue(testo){
  const t = norm(testo||'');
  if (!t) return 0;
  if (/\b(due|two|2)\b/.test(t)) return 2;
  if (/\b(tre|three|3)\b/.test(t)) return 3;
  if (/\b(una|uno|un|one|1)\b/.test(t)) return 1;
  return t ? 1 : 0;
}

/* ─── Le razze: quello che si SCEGLIE ───
   Un manuale scrive le scelte come frasi («Intelligence or Charisma +1»,
   «one skill of your choice», «either smith's tools or…»). Lette come
   testo finivano fra i tratti e basta: la creazione guidata non chiedeva
   niente e in scheda non arrivava niente. Qui diventano opzioni. */
const HB_NUMERI = { one:1, a:1, an:1, two:2, three:3, four:4, five:5, six:6, un:1, uno:1, una:1, due:2, tre:3, quattro:4, cinque:5, sei:6 };
const HB_ABIL_RX = '(strength|dexterity|constitution|intelligence|wisdom|charisma|forza|destrezza|costituzione|intelligenza|saggezza|carisma)';
function hbNumero(w){ const n = parseInt(w); return isNaN(n) ? (HB_NUMERI[String(w||'').toLowerCase()] || 0) : n; }
/* «Constitution +2, Wisdom +1», «Dexterity +2, Strength -2»,
   «Strength, Constitution, and Charisma +1», «Intelligence or Charisma +1»,
   «Charisma +2, Two other abilities +1», «Two ability scores increase by 2,
   other four increase by 1», «Il tuo punteggio di Forza aumenta di 2». */
function hbBonusRazza(testo){
  const t = String(testo||'').replace(/[−–]/g, '-').replace(/\s+/g, ' ').trim();
  const bonus = {};
  let scelta = null;
  const tutte = ['str','dex','con','int','wis','cha'];
  const k = (w) => ABIL_WORDS[String(w||'').toLowerCase()];
  // pezzi separati da virgola o «;», ma «A, B, and C +1» resta insieme
  // si taglia solo dopo un valore: «A, B, and C +1» resta un pezzo solo
  const pezzi = t.split(/(?<=\d)\s*[,;]\s*|;\s*/).map(x => x.trim()).filter(Boolean);
  let tutteA = 0, altre = false;
  for (const p of pezzi){
    let m;
    // «Two ability scores increase by 2, other four increase by 1» (una volta sola, tutto insieme)
    if ((m = /\b(one|two|three|a|an|\d|uno|una|due|tre)\s+(?:other\s+|different\s+|altr[ie]\s+)?(?:ability scores?|abilities|scores?|punteggi(?: di caratteristica)?|caratteristiche)\s*(?:of your choice\s*|a (?:tua )?scelta\s*)?(?:increase|aumenta(?:no)?)?\s*(?:by|di)?\s*\+?\s*(\d)/i.exec(p))){
      const quante = hbNumero(m[1]), di = parseInt(m[2]);
      if (quante && di) scelta = { count: quante, amount: di, exclude: [] };
      altre = /\b(other|different|altr[ie])\b/i.test(m[0]);
      continue;
    }
    if ((m = /\b(?:other|the other|all(?: other)?|each(?: other)?|every|tutt[ie](?: gli altri)?|gli altri)\b.*?(?:increase|aumenta(?:no)?)\s*(?:by|di)\s*(\d)/i.exec(p))
        || /^(?:all|each|every) (?:of your )?ability scores? (?:increase|increases) by (\d)/i.exec(p)){
      const di = parseInt((m || [])[1] || /\d/.exec(p)[0]);
      tutte.forEach(a => { if (!bonus[a]) bonus[a] = di; });
      tutteA = di;
      continue;
    }
    // «Your choice of Strength, Intelligence, or Wisdom +1», «Intelligence or Charisma +1»
    if (/\bor\b|\boppure\b|\bo\b|choice of|a (?:tua )?scelta/i.test(p)){
      const nomi = [...p.matchAll(new RegExp(HB_ABIL_RX, 'gi'))].map(x => k(x[1])).filter(Boolean);
      const v = /([+\-])\s*(\d)/.exec(p) || /(?:increase|aumenta)\w*\s*(?:by|di)\s*()(\d)/i.exec(p);
      if (nomi.length >= 2 && v){
        scelta = { count: 1, amount: parseInt(v[2]), exclude: [], from: [...new Set(nomi)] };
        continue;
      }
    }
    // «A, B, and C +1» / «A +2»
    const val = /([+\-])\s*(\d)\s*$/.exec(p) || /(?:increases?|aumenta)\s*(?:by|di)\s*()(\d)/i.exec(p);
    if (val){
      const n = (val[1] === '-' ? -1 : 1) * parseInt(val[2]);
      const nomi = [...p.matchAll(new RegExp(HB_ABIL_RX, 'gi'))].map(x => k(x[1])).filter(Boolean);
      nomi.forEach(a => { bonus[a] = n; });
      continue;
    }
    // «Wisdom +1 Strength +2» senza virgole: la vecchia lettura
    Object.assign(bonus, parseAbilityBonus(p));
  }
  /* «Two ability scores increase by 2, other four by 1»: tutte a +1, e
     due a scelta prendono +1 in piu' (non +2 sopra al +1). */
  if (scelta && tutteA){
    scelta.amount = Math.max(1, scelta.amount - tutteA);
  } else if (scelta && altre && !scelta.from){
    // «Charisma +2, Two other abilities +1»: le altre, non il Carisma
    scelta.exclude = Object.keys(bonus).filter(a => bonus[a] > 0);
  }
  return { bonus, bonusChoice: scelta };
}

/* Le abilita' che una razza da' o fa scegliere, lette dai tratti.
   «Keen Senses: Proficient in Perception» la da';
   «Stone Cunning: … if you are proficient in History» no. */
function hbAbilitaRazza(tratti){
  const EN = { acrobatics:'acrobatics', 'animal handling':'animalHandling', arcana:'arcana', athletics:'athletics',
    deception:'deception', history:'history', insight:'insight', intimidation:'intimidation',
    investigation:'investigation', medicine:'medicine', nature:'nature', perception:'perception',
    performance:'performance', persuasion:'persuasion', religion:'religion',
    'sleight of hand':'sleightOfHand', stealth:'stealth', survival:'survival' };
  const lista = Object.keys(EN).join('|');
  const out = { grantSkills: [], skillChoice: 0, skillChoiceFrom: null };
  (tratti||[]).forEach(([nome, desc]) => {
    const t = String(desc||'').replace(/\s+/g, ' ');
    let m;
    // «proficiency in two skills of your choice» / «one skill of your choice»
    if ((m = /proficien\w*\s+(?:in|with)\s+(one|two|three|\d|a|an)\s+(?:additional\s+|other\s+)?skills?\s+of your choice/i.exec(t))
        || (m = /competenz\w*\s+in\s+(una|due|tre|\d)\s+abilit\w*\s+a (?:tua )?scelta/i.exec(t))){
      out.skillChoice += hbNumero(m[1]) || 1;
      return;
    }
    // «proficiency in two of the following skills of your choice: Arcana, History…»
    if ((m = /(?:proficien\w*|trained)\s+(?:in|with)\s+(?:your choice of\s+)?(one|two|three|\d)\s+of the following skills[^:]*:\s*([^.]+)/i.exec(t))){
      const da = parseSkillList(m[2]);
      if (da.length){ out.skillChoice += hbNumero(m[1]) || 1; out.skillChoiceFrom = da; return; }
    }
    // «You gain proficiency in the Intimidation skill», «Proficient in Perception»
    const rx = new RegExp('(?:^|(?:you\\s+)?(?:gain|have|are)\\s+)(?:proficiency|proficient|trained)\\s+(?:in|with)\\s+(?:the\\s+)?((?:' + lista + ')(?:\\s*(?:,|and|or)\\s*(?:' + lista + '))*)', 'i');
    if ((m = rx.exec(t)) && !/\b(if|unless|when)\s+$/i.test(t.slice(0, m.index)) && !/\bor\b/i.test(m[1])){
      parseSkillList(m[1]).forEach(sk => { if (!out.grantSkills.includes(sk)) out.grantSkills.push(sk); });
    }
  });
  return out;
}

/* Una scelta scritta in una riga sola: «You gain proficiency with either –
   smith's tools, brewer's supplies, or mason's tools». Torna le opzioni. */
function hbOpzioniInTesto(testo){
  const t = String(testo||'').replace(/\s+/g, ' ');
  const m = /\b(?:either|one of the following|your choice of|choice of|a (?:tua )?scelta fra|uno fra|una fra)\s*[–—:-]?\s*([^.;]+)/i.exec(t);
  if (!m) return null;
  const opz = m[1].split(/\s*,\s*(?:or\s+|and\s+|o\s+|e\s+)?|\s+or\s+|\s+oppure\s+/i)
    .map(x => x.replace(/^(?:or|and|o|e)\s+/i, '').replace(/[\s.]+$/, '').trim())
    .filter(x => x && x.length <= 40);
  return opz.length >= 2 && opz.length <= 12 ? opz : null;
}
/* Frasi che dicono «qui si sceglie»: servono a capire se un elenco con
   la «o» e' una scelta da fare creando il personaggio o solo un elenco
   di esempi (i congegni dello gnomo delle rocce si scelgono giocando). */
const HB_E_SCELTA = /\b(your choice|choose|choice:|pick one|select|a (?:tua )?scelta|scegli)\b/i;

/* «Common and Dwarvish» → «Comune, Nanico»; «one extra of your choice» →
   «Una a scelta»: la creazione guidata conta le lingue da scegliere
   proprio da quel «a scelta». */
const HB_LINGUE_EN = { common:'Comune', dwarvish:'Nanico', elvish:'Elfico', giant:'Gigante', gnomish:'Gnomesco',
  goblin:'Goblin', halfling:'Halfling', orc:'Orchesco', orcish:'Orchesco', abyssal:'Abissale', celestial:'Celestiale',
  draconic:'Draconico', 'deep speech':'Linguaggio delle Profondità', infernal:'Infernale', primordial:'Primordiale',
  sylvan:'Silvano', undercommon:'Sottocomune', auran:'Auran', aquan:'Aquan', ignan:'Ignan', terran:'Terran', gith:'Gith' };
function hbLingueRazza(testo){
  let t = hbLingue(testo)
    .replace(/^(?:you can )?read and write\s+/i, '')
    .replace(/\s*,?\s*\bbut\b.*$/i, '');        // «…, but you can only speak using Mimicry»: e' un tratto
  const parti = [];
  let scelta = 0;
  t = t.replace(/\b(one|two|three|a|an|1|2|3)\s+(?:extra|additional|other|more|others)?\s*(?:language|languages|others|other|extra|more)?\s*(?:language\s*)?of (?:your|their) choice\b/gi, (m, n) => { scelta += hbNumero(n) || 1; return ''; });
  t = t.replace(/\byour choice of (one|two|three|\d)\s*(?:others?|other languages?|languages?|extra)?/gi, (m, n) => { scelta += hbNumero(n) || 1; return ''; });
  t = t.replace(/\b(one|two|three)\s+(?:extra|additional|other|more)\s+languages?\b/gi, (m, n) => { scelta += hbNumero(n) || 1; return ''; });
  t.split(/\s*,\s*|\s+and\s+|\s+e\s+/i).map(x => x.replace(/^(and|e)\s+/i, '').trim()).filter(Boolean).forEach(x => {
    if (x.length > 30) return;               // una frase, non una lingua
    parti.push(HB_LINGUE_EN[x.toLowerCase()] || x);
  });
  const nomi = ['','Una a scelta','Due a scelta','Tre a scelta'];
  if (scelta) parti.push(nomi[Math.min(scelta, 3)]);
  return [...new Set(parti)].join(', ') || 'Comune';
}

/* ─── Lettura delle guide («Nome (FONTE):» con elenchi puntati) ─── */
function hbScanGuida(raw){
  const voci = hbNormalizza(raw);
  const out = [];
  const mappaClassi = hbMappaSottoclassi(voci);
  let sezioneClasse = '';   // classe della sezione in cui ci troviamo
  let classeIgnota = '';    // una classe che l'app non ha (Artefice, Cacciatore di sangue…)

  for (let i = 0; i < voci.length; i++){
    const t = hbTitolo(voci[i].testo);
    if (!t || voci[i].marker) continue;

    // raccogliamo le voci fino al prossimo titolo
    const corpo = [];
    for (let j = i + 1; j < voci.length; j++){
      if (!voci[j].marker && hbTitolo(voci[j].testo)) break;
      if (voci[j].testo) corpo.push(voci[j]);
      if (corpo.length > 90) break;
    }
    if (!corpo.length) continue;

    /* — intestazione di classe: apre una sezione, non si importa — */
    const idClasse = hbClasseDaNome(t.nome);
    if (idClasse && hbSembraClasse(corpo)){ sezioneClasse = idClasse; classeIgnota = ''; continue; }
    if (hbSembraClasse(corpo)){ sezioneClasse = ''; classeIgnota = t.nome; continue; }  // classe non nota (es. Artefice)

    /* — sottoclasse: ha almeno due «Livello N» — */
    const livelli = corpo.filter(v => /^(level|livello)\s*\d+/i.test(v.testo));
    if (livelli.length >= 2){
      const features = {};
      const scelte = [];
      let lv = null, n = 0;
      /* Un privilegio con le sue opzioni sotto («Totem Spirit: choose one» +
         Bear, Eagle, Wolf; «Maneuvers: you learn three» + l'elenco): le
         opzioni diventano una SCELTA, da fare quando arrivi a quel livello. */
      const aggiungi = (nome, testo) => {
        const pezzi = String(testo||'').split(HB_SOTTO).map(x => x.trim()).filter(Boolean);
        let corpoP = pezzi[0] || '';
        if (pezzi.length >= 3 || (pezzi.length >= 2 && HB_E_SCELTA.test(corpoP))){
          const opz = pezzi.slice(1).map(o => { const c = hbCampo(o); return c ? c.campo + ': ' + c.valore : o; });
          const nomi = opz.map(o => o.split(':')[0].trim());
          /* solo se il testo dice di SCEGLIERE: «You gain the following two
             Channel Divinity options» te le da' tutte e due, non e' una scelta */
          /* e le opzioni devono avere un nome («Bear: …», «Archery: …»): un
             elenco di frasi («You gain a bonus…», «Strength Score») e' la
             lista di quello che il privilegio fa, non una scelta */
          const conNome = pezzi.slice(1).filter(o => { const c = hbCampo(o); return c && c.campo.split(/\s+/).length <= 5 && c.valore.length >= 3; }).length;
          if (/\b(choose|chosen|your choice|of your choice|choice of|pick|select|a (?:tua )?scelta|scegli)\b/i.test(corpoP)
              && conNome >= Math.max(2, Math.ceil((pezzi.length - 1) * 0.7))){
            const q = /\b(?:learn|choose|pick|select|gain|know)\s+(one|two|three|four|five|\d)\b/i.exec(corpoP);
            scelte.push({ livello: lv, nome: String(nome).slice(0,60), quante: q ? (hbNumero(q[1]) || 1) : 1,
                          opzioni: opz.map(o => o.slice(0,300)).slice(0,24) });
            corpoP += ' Opzioni: ' + nomi.join(', ') + '.';
          } else {
            corpoP += ' ' + opz.map(o => '• ' + o).join(' ');
          }
        }
        (features[lv] = features[lv] || []).push([nome, corpoP.slice(0,700)]);
        n++;
      };
      corpo.forEach(v => {
        const ml = /^(?:level|livello)\s*(\d+)\s*[.:)\-]?\s*(.*)$/i.exec(v.testo);
        if (ml){
          lv = clamp(parseInt(ml[1]),1,20);
          /* «Livello 3: Nome del privilegio. testo» — il privilegio sta
             sulla stessa riga del livello. Prima la riga contava solo per
             dire «da qui in poi è il livello 3» e il testo si buttava. */
          const resto = (ml[2]||'').trim();
          if (resto.length > 12){
            const c = hbCampo(resto) || /^([A-ZÀ-Ý][A-Za-zÀ-ý' \-]{2,44})\s*[.]\s+(.{12,})$/.exec(resto);
            if (c && c.campo) aggiungi(c.campo, c.valore);
            else if (c) aggiungi(c[1].trim(), c[2].trim());
            else aggiungi('Privilegio di livello ' + lv, resto);
          }
          return;
        }
        if (!lv) return;
        const c = hbCampo(v.testo);
        if (c && c.valore.length > 12) aggiungi(c.campo, c.valore);
      });
      if (n >= 2){
        const sc = { kind:'subclass', name: t.nome, source: t.fonte,
                   classId: sezioneClasse || mappaClassi[norm(t.nome)] || hbIndovinaClasse(t.nome),
                   features };
        if (scelte.length) sc.scelte = scelte.slice(0,8);
        if (!sc.classId && classeIgnota) sc.classeNelManuale = classeIgnota;
        out.push(sc);
        continue;
      }
    }

    /* — razza: ha i campi tipici — */
    const campi = {};
    const tratti = [];
    const varianti = [];
    const scelte = [];
    let inVarianti = false;
    /* Le voci «o» sotto un tratto sono le sue opzioni: si raccolgono
       col tratto a cui appartengono invece di diventare tratti a se'. */
    const gruppi = [];
    corpo.forEach(v => {
      if (v.marker === 'o' && gruppi.length) gruppi[gruppi.length-1].opz.push(v.testo);
      else gruppi.push({ v, opz: [] });
    });
    gruppi.forEach(({ v, opz }) => {
      if (hbApreVarianti(v.testo)){ inVarianti = true; }
      const c = hbCampo(v.testo);
      if (!c) return;
      if (HB_CAMPI_RAZZA.test(c.campo)){ campi[norm(c.campo)] = c.valore; return; }
      if (hbApreVarianti(c.campo) && !opz.length){ inVarianti = true; return; }
      if (inVarianti){ if (c.valore.length > 10) varianti.push(hbVariante(c.campo, c.valore)); return; }
      if (opz.length){
        const voci = opz.map(o => { const x = hbCampo(o); return x ? { nome: x.campo, testo: x.valore } : { nome: o.slice(0, 40), testo: o }; });
        const conBonus = voci.filter(o => Object.keys(parseAbilityBonus(o.testo)).length).length;
        if (conBonus >= Math.ceil(voci.length / 2) && !varianti.length){
          // «Shift Form: Choose one form» con «Beasthide: Constitution +1»: sono varianti vere
          tratti.push([c.campo, c.valore.slice(0,500)]);
          voci.forEach(o => { const vv = hbVariante(o.nome, o.testo); vv.traits = [[c.campo + ' — ' + o.nome, o.testo.split(HB_SOTTO).join(' · ').slice(0,500)]]; varianti.push(vv); });
          return;
        }
        if (HB_E_SCELTA.test(c.valore)){
          // «Draconic Ancestry: … based on your choice:» → una scelta con le sue opzioni
          tratti.push([c.campo, c.valore.slice(0,500)]);
          scelte.push({ nome: c.campo, opzioni: voci.map(o => o.nome + (o.testo && o.testo !== o.nome ? ': ' + o.testo : '')).map(x => x.slice(0,160)).slice(0,16) });
          return;
        }
        // un elenco di esempi: resta dentro al tratto
        tratti.push([c.campo, (c.valore + ' ' + opz.map(o => '• ' + o).join(' ')).slice(0,700)]);
        return;
      }
      if (c.valore.length <= 10 && !/\d/.test(c.valore)) return;
      tratti.push([c.campo, c.valore.slice(0,500)]);
      const inRiga = !/proficien|competenz/i.test(c.campo + ' ' + c.valore) || /tool|strument|kit|supplies|instrument/i.test(c.valore)
        ? hbOpzioniInTesto(c.valore) : null;
      if (inRiga && !/language|lingu|cantrip|trucchett|skill|abilit/i.test(c.campo + ' ' + c.valore.slice(0, 80)))
        scelte.push({ nome: c.campo, opzioni: inRiga, strumento: /tool|strument|supplies|kit|instrument/i.test(c.valore) });
    });
    const haPunteggi = Object.keys(campi).some(k => /punteggi|ability/.test(k));
    const haVelocita = Object.keys(campi).some(k => /speed|velocit/.test(k));
    if (haPunteggi && (haVelocita || tratti.length >= 2)){
      const kPunteggi = Object.keys(campi).find(k => /punteggi|ability/.test(k));
      const kVel = Object.keys(campi).find(k => /speed|velocit/.test(k));
      const kTaglia = Object.keys(campi).find(k => /size|taglia/.test(k));
      const kLingue = Object.keys(campi).find(k => /languages?|lingue|linguaggi/.test(k));
      const b = hbBonusRazza(campi[kPunteggi]);
      const ab = hbAbilitaRazza(tratti);
      const razza = { kind:'race', name: t.nome, source: t.fonte,
        bonus: b.bonus,
        speed: kVel ? parseSpeedM(campi[kVel]) : 9,
        size: kTaglia ? parseSizeWord(campi[kTaglia]) : 'Media',
        languages: kLingue ? hbLingueRazza(campi[kLingue]) : 'Comune',
        traits: tratti.slice(0,14), grantSkills: ab.grantSkills, subraces: varianti.slice(0,12) };
      if (b.bonusChoice) razza.bonusChoice = b.bonusChoice;
      if (ab.skillChoice) razza.skillChoice = Math.min(ab.skillChoice, 4);
      if (ab.skillChoiceFrom) razza.skillChoiceFrom = ab.skillChoiceFrom;
      if (scelte.length) razza.scelte = scelte.slice(0,6);
      out.push(razza);
      continue;
    }

    /* — background: competenze nelle abilità — */
    const kAbil = corpo.map(v => hbCampo(v.testo)).filter(Boolean)
      .find(c => /^(skill proficiencies|competenze nelle abilit[àa]|abilit[àa])$/i.test(c.campo));
    if (kAbil){
      const get = (rx) => { const c = corpo.map(v=>hbCampo(v.testo)).filter(Boolean).find(x=>rx.test(x.campo)); return c ? c.valore : ''; };
      out.push({ kind:'background', name: t.nome, source: t.fonte,
        skills: parseSkillList(kAbil.valore),
        tools: get(/tool proficiencies|strumenti/i),
        langCount: hbQuanteLingue(get(/languages?|lingue/i)),
        feature: hbTitoloPrivilegio(get(/^(feature|privilegio)$/i)),
        desc: hbCorpoPrivilegio(get(/^(feature|privilegio)$/i)),
        equipment: get(/equipment|equipaggiamento/i) });
      continue;
    }
  }
  return out;
}

/* Dall'indice: «Mago – 139» seguito da «o Scuola di Evocazione – 144»
   ricava a quale classe appartiene ogni sottoclasse. */
function hbMappaSottoclassi(voci){
  const mappa = {};
  const perNome = {};
  classiBase().forEach(c => {
    perNome[norm(c.name)] = c.id;
    perNome[norm(c.id)] = c.id;
  });
  const EN = { barbarian:'barbarian', bard:'bard', cleric:'cleric', druid:'druid', fighter:'fighter',
    monk:'monk', paladin:'paladin', ranger:'ranger', rogue:'rogue', sorcerer:'sorcerer',
    warlock:'warlock', wizard:'wizard' };
  Object.keys(EN).forEach(k => { perNome[k] = EN[k]; });

  let classeCorrente = '';
  voci.forEach(v => {
    const testo = String(v.testo||'').replace(/\s*[–—-]\s*\d+\s*$/, '').trim();
    if (!testo) return;
    const k = perNome[norm(testo)];
    if (k && v.marker !== 'o'){ classeCorrente = k; return; }
    if (classeCorrente && v.marker === 'o' && testo.length < 60) mappa[norm(testo)] = classeCorrente;
  });
  return mappa;
}
/* Ultima spiaggia: i nomi delle sottoclassi seguono convenzioni note */
function hbIndovinaClasse(nome){
  const n = norm(nome);
  if (/^path of|^cammino/.test(n)) return 'barbarian';
  if (/^college of|^collegio/.test(n)) return 'bard';
  if (/domain$|^dominio/.test(n)) return 'cleric';
  if (/^circle of|^circolo/.test(n)) return 'druid';
  if (/^way of|^via del/.test(n)) return 'monk';
  if (/^oath of|^giuramento/.test(n)) return 'paladin';
  if (/^school of|^scuola/.test(n)) return 'wizard';
  if (/^patron of|^patrono|^the (fiend|archfey|great old one)/.test(n)) return 'warlock';
  if (/bloodline$|^discendenza|sorcery$/.test(n)) return 'sorcerer';
  return '';
}

/* ─── Il motore ─── */
function hbScanText(raw){
  const testo = hbTidy(raw);
  const righe = testo.split('\n');
  const trovati = [];

  /* Prima il formato delle guide («Nome (FONTE):» con elenchi puntati):
     se rende, è quello giusto e il resto non serve. */
  try {
    const daGuida = hbScanGuida(raw);
    // Due voci bastano a dire che il formato è quello giusto; una sola vale
  // solo se l'altra lettura non ha trovato niente (è il caso di chi
  // incolla una voce singola, che la schermata stessa suggerisce).
  if (daGuida.length >= 2 || (daGuida.length === 1 && !trovati.length)) trovati.push(...daGuida);
  } catch(e){ console.warn('Lettura guida non riuscita', e); }

  /* — Background — */
  for (let i = 0; i < righe.length; i++){
    const m = RX_BG_SKILL.exec(righe[i]);
    if (!m) continue;
    // il nome è l'ultimo titolo sopra
    let nome = '';
    for (let j = i - 1; j >= Math.max(0, i - 12); j--){
      if (hbIsHeading(righe[j])){ nome = hbUnspace(righe[j]); break; }
    }
    if (!nome) continue;
    const bg = { kind:'background', name: nome, skills: parseSkillList(m[2]),
      tools:'', langCount:0, feature:'', desc:'', equipment:'' };
    for (let j = i + 1; j < Math.min(righe.length, i + 60); j++){
      const l = righe[j];
      let x;
      if ((x = RX_BG_TOOL.exec(l))) { bg.tools = x[2].trim(); continue; }
      if ((x = RX_BG_LANG.exec(l))) { const n = /(\d+)|two|due/i.exec(x[2]); bg.langCount = n ? (/two|due/i.test(n[0]) ? 2 : parseInt(n[0])||1) : 1; continue; }
      if ((x = RX_BG_EQUIP.exec(l))) { bg.equipment = x[2].trim(); continue; }
      if ((x = RX_BG_FEAT.exec(l))) {
        bg.feature = x[2].trim();
        const desc = [];
        for (let k = j + 1; k < Math.min(righe.length, j + 8); k++){
          if (!righe[k]) { if (desc.length) break; continue; }
          if (hbIsHeading(righe[k]) || RX_BG_SKILL.test(righe[k])) break;
          desc.push(righe[k]);
        }
        bg.desc = desc.join(' ').slice(0, 600);
        break;
      }
      if (RX_BG_SKILL.test(l)) break;
    }
    if (bg.skills.length) trovati.push(bg);
  }

  /* — Razze — */
  for (let i = 0; i < righe.length; i++){
    const m = RX_RACE_ASI.exec(righe[i]);
    if (!m) continue;
    let nome = '';
    for (let j = i - 1; j >= Math.max(0, i - 14); j--){
      if (hbIsHeading(righe[j])){ nome = hbUnspace(righe[j]); break; }
    }
    if (!nome) continue;
    const coda = hbParagrafi(righe.slice(i, Math.min(righe.length, i + 70)));
    const blocco = coda.join('\n');
    if (!(RX_RACE_SPEED.test(blocco) || /^(Speed|Velocit)/im.test(blocco))) continue;
    // il paragrafo ricucito dice più della riga sola: «…di 2, e il tuo
    // punteggio di Carisma di 1» sta tutto qui, non spezzato in due.
    const mAsi = RX_RACE_ASI.exec(coda[0] || '') || m;
    const rz = { kind:'race', name: nome, bonus: parseAbilityBonus(mAsi[2] + ' ' + (coda[1]||'')),
      speed: 9, size:'Media', languages:'Comune', traits: [], grantSkills: [] };
    let tratti = [];
    const varianti = [];
    let inVarianti = false;
    for (let j = 0; j < coda.length; j++){
      const l = coda[j]; if (!l) continue;
      let x;
      if ((x = RX_RACE_SPEED.exec(l))){ rz.speed = parseSpeedM(x[2] + ' ' + (coda[j+1]||'')); continue; }
      if ((x = RX_RACE_SIZE.exec(l))){ rz.size = parseSizeWord(x[2] + ' ' + (coda[j+1]||'')); continue; }
      if ((x = RX_RACE_LANG.exec(l))){ rz.languages = hbLingueRazza(x[2]); continue; }
      if (RX_RACE_AGE.test(l) || RX_RACE_ALIGN.test(l) || RX_RACE_ASI.test(l)) continue;
      // «Sottorazze»: da qui in poi sono varianti, non tratti
      if (hbApreVarianti(l)){ inVarianti = true; continue; }
      // un tratto: «Nome. testo»
      const t = /^([A-ZÀ-Ý][A-Za-zÀ-ý' \-]{2,34})\s*[.:]\s+(.{15,})$/.exec(l);
      if (t){
        if (inVarianti) varianti.push(hbVariante(t[1].trim(), t[2].trim()));
        else tratti.push([t[1].trim(), t[2].trim().slice(0,400)]);
      }
      if (tratti.length >= 8 && !inVarianti) break;
      if (varianti.length >= 12) break;
    }
    rz.traits = tratti;
    rz.subraces = varianti;
    /* anche nel testo in prosa: le scelte (bonus e abilita') diventano opzioni */
    const nuovo = hbBonusRazza(mAsi[2] + ' ' + (coda[1]||''));
    if (!Object.keys(rz.bonus).length) rz.bonus = nuovo.bonus;
    if (nuovo.bonusChoice) rz.bonusChoice = nuovo.bonusChoice;
    const ab = hbAbilitaRazza(tratti);
    rz.grantSkills = ab.grantSkills;
    if (ab.skillChoice) rz.skillChoice = Math.min(ab.skillChoice, 4);
    if (ab.skillChoiceFrom) rz.skillChoiceFrom = ab.skillChoiceFrom;
    if (Object.keys(rz.bonus).length || tratti.length) trovati.push(rz);
  }

  /* — Sottoclassi —
     Prima troviamo i singoli privilegi (un titolo corto seguito da un
     testo che cita il livello), poi li raggruppiamo: privilegi vicini
     appartengono alla stessa sottoclasse, e il nome è il titolo che
     sta sopra al primo del gruppo. Così non scambiamo per sottoclasse
     ogni intestazione che passa. */
  // prima tutti i titoletti brevi, poi il corpo di ognuno si ferma al
  // titoletto seguente: senza questo limite il nome della sottoclasse
  // si prende il livello del suo primo privilegio e si spaccia per uno.
  const titoletti = [];
  for (let i = 0; i < righe.length; i++){
    const l = righe[i];
    if (!l || l.length > 44) continue;
    const t = /^([A-ZÀ-Ý][A-Za-zÀ-ý' \-]{2,40})\s*[.:]?\s*$/.exec(l);
    if (t) titoletti.push({ riga:i, nome:t[1].trim() });
  }
  const privilegi = [];
  titoletti.forEach((tt, k) => {
    const fine = k + 1 < titoletti.length ? Math.min(titoletti[k+1].riga, tt.riga + 6) : tt.riga + 6;
    const dopo = righe.slice(tt.riga + 1, fine).join(' ').trim();
    const lv = hbLevelIn(dopo);
    if (!lv || dopo.length < 25) return;
    privilegi.push({ riga: tt.riga, nome: tt.nome, lv, testo: dopo.slice(0,500) });
  });
  // gruppi: privilegi separati da meno di 14 righe stanno insieme
  const gruppi = [];
  privilegi.forEach(pv => {
    const g = gruppi[gruppi.length-1];
    if (g && pv.riga - g[g.length-1].riga <= 14) g.push(pv);
    else gruppi.push([pv]);
  });
  const nomiPresi = new Set(trovati.map(x => norm(x.name)));
  gruppi.forEach(g => {
    if (g.length < 2) return;
    const nomiPriv = new Set(g.map(pv => norm(pv.nome)));
    let nome = '';
    for (let j = g[0].riga - 1; j >= Math.max(0, g[0].riga - 10); j--){
      const cand = hbUnspace(righe[j]);
      if (!cand || !hbIsHeading(righe[j])) continue;
      if (nomiPriv.has(norm(cand))) continue;       // è il titolo di un privilegio
      if (nomiPresi.has(norm(cand))) continue;      // è già una razza o un background
      nome = cand; break;
    }
    if (!nome) return;
    const features = {};
    g.forEach(pv => { (features[pv.lv] = features[pv.lv] || []).push([pv.nome, pv.testo]); });
    trovati.push({ kind:'subclass', name: nome, classId:'', features });
  });

  /* niente doppioni, e un identificativo per ognuno */
  const visti = new Set();
  return trovati.filter(x => {
    const k = x.kind + '|' + norm(x.name);
    if (visti.has(k) || !norm(x.name)) return false;
    visti.add(k); return true;
  }).map(x => Object.assign({ id: uid(), source: '' }, x));
}

/* ─── Quello che hai già ──────────────────────────────────────────
   L'importatore degli incantesimi dice da sempre quanti sono nuovi e
   quanti già tuoi; questo no: caricando due volte la stessa guida
   uscivano due «Cammino del Berserker», tutti e due già spuntati.
   Il confronto è per tipo + nome, come per gli incantesimi. */
function hbGiaTua(voce){
  if (!voce) return null;
  const k = norm(voce.name || '');
  if (!k) return null;
  return (state.homebrew || []).find(x => x && x.kind === voce.kind && norm(x.name||'') === k) || null;
}
function hbGiaAlTavolo(voce){
  if (!voce) return null;
  const k = norm(voce.name || '');
  if (!k) return null;
  return (state.sharedHomebrew || []).find(x => x && x.kind === voce.kind && norm(x.name||'') === k) || null;
}
/* Come si presenta una voce già presente, e cosa succede se la scegli. */
/* Quello che in una voce letta NON torna. Non è un errore — il manuale
   può davvero non dirlo — ma vederlo prima di importare vale molto di
   più che scoprirlo dopo, aprendo la scheda e trovandola vuota. */
function hbCosaManca(x){
  const p = [];
  if (x.kind === 'race'){
    if (!Object.keys(x.bonus||{}).length) p.push('nessun bonus di caratteristica');
    if (!(x.traits||[]).length) p.push('nessun tratto');
    const senzaBonus = (x.subraces||[]).filter(v => !Object.keys(v.bonus||{}).length).map(v=>v.name);
    if (senzaBonus.length) p.push('varianti senza bonus: ' + senzaBonus.join(', '));
  } else if (x.kind === 'subclass'){
    // «classe da scegliere» lo dice già la riga sopra: non due volte
    if (!Object.keys(x.features||{}).length) p.push('nessun privilegio');
  } else if (x.kind === 'background'){
    if (!(x.skills||[]).length) p.push('nessuna competenza');
    if (!x.feature) p.push('nessun privilegio');
  }
  return p.join(' · ');
}
function hbStatoVoce(voce){
  const mia = hbGiaTua(voce);
  if (mia) return { stato:'mia', id: mia.id, nota:'ce l\'hai già · scegliendola la aggiorni' };
  const tav = hbGiaAlTavolo(voce);
  if (tav) return { stato:'tavolo', id: null, nota:'già sul tavolo, messa da ' + (tav.sharedByName || 'un altro') };
  return { stato:'nuova', id:null, nota:'' };
}

/* ─── Interfaccia ─── */
let hbBulk = null; /* { trovati, scelti:Set, condividi } */

function openHomebrewBulk(){
  hbBulk = { trovati: null, scelti: new Set(), condividi: false, busy: false, q: '' };
  listaAzzeraTutte('hb');
  openModal({ render: hbBulkHTML });
}
/* Le guide elencano le razze già come varianti («Hill Dwarf», «Wood Elf»,
   «Air Genasi»): la stirpe è l'ultima parola del nome, e serve solo a
   raccogliere l'elenco in gruppi leggibili. */
function hbStirpe(nome){
  let n = String(nome||'').replace(/\[[^\]]*\]/g,' ').replace(/\([^)]*\)/g,' ');
  n = n.replace(/[^A-Za-zÀ-ÿ' -]/g,' ').replace(/\s+/g,' ').trim();
  if (!n) return '';
  const parti = n.split(' ');
  let ultima = parti[parti.length-1];
  // «Mezzelfo», «Half-Elf»: il trattino tiene insieme il nome, non è una stirpe
  if (/-/.test(ultima)) return ultima;
  return parti.length > 1 ? ultima : n;
}

function hbBulkHTML(){
  const b = hbBulk || {};
  if (!b.trovati) return modalShell('⤒ Leggi dal tuo manuale', `
    <p class="muted" style="margin-bottom:14px">
      Carica uno o più file di testo o PDF presi dai manuali che possiedi (puoi sceglierli tutti insieme): l'app cerca da sola
      <b>sottoclassi, razze e background</b> e ti fa scegliere quali tenere.
      Quello che entra resta tuo; lo condividi col tavolo solo se lo decidi.
    </p>
    <div class="btn-row">
      <button class="btn btn-gold" ${b.busy?'disabled':''} onclick="document.getElementById('hb-bulk-file').click()">${ic('cartella')} ${b.busy
        ? ((b.file_n > 1 ? 'File '+b.file+' di '+b.file_n+' · ' : '') + (b.tot ? 'pagina '+b.pag+' di '+b.tot+'…' : 'leggo…'))
        : 'Scegli i file'}</button>
      <button class="btn btn-ghost" ${b.busy?'disabled':''} onclick="hbBulkFromBox()">Analizza il testo</button>
    </div>
    ${b.busy ? `<p class="muted" style="font-size:.75rem; margin-top:-6px">Un manuale intero richiede qualche minuto: tieni l'app aperta finché non finisce.</p>` : ''}
    <input type="file" id="hb-bulk-file" multiple accept=".txt,text/plain,application/pdf,.pdf,.md" style="display:none" onchange="hbBulkFile(this)">
    <div class="field" style="margin-top:12px">
      <label>…oppure incolla qui</label>
      <textarea id="hb-bulk-text" style="min-height:120px; font-family:var(--font-ui); font-size:.8rem" placeholder="Incolla il testo di una sottoclasse, di una razza o di un background."></textarea>
    </div>
    <div class="spell-source-note">Carica solo materiale di cui hai i diritti: i tuoi appunti, il tuo homebrew, o i manuali che possiedi. Resta sul tuo account e, se lo scegli, sul tavolo che hai creato tu.</div>`);

  if (b.salvando) return modalShell(ic('libro') + ' Le metto fra le tue voci', `
    <p class="muted" style="margin-bottom:14px">Ci vuole qualche secondo. Tieni l'app aperta.</p>
    <div class="card">
      <div class="row-between"><span class="muted">Salvate</span><b style="color:var(--gold)">${b.salvando.fatti} di ${b.salvando.tot}</b></div>
      <div class="barra" style="margin-top:10px"><div class="barra-piena" style="width:${Math.round(100*b.salvando.fatti/Math.max(1,b.salvando.tot))}%"></div></div>
    </div>`);

  const perTipo = { subclass:[], race:[], background:[] };
  b.trovati.forEach(x => { if (perTipo[x.kind]) perTipo[x.kind].push(x); });
  const riga = (x) => {
    const on = b.scelti.has(x.id);
    const k = HB_KINDS[x.kind] || {};
    const nomeClasse = x.kind === 'subclass'
      ? (x.classId && typeof CLASS_BY_ID !== 'undefined' && CLASS_BY_ID[x.classId] ? CLASS_BY_ID[x.classId].name : '')
      : '';
    const dettaglio = x.kind === 'subclass'
      ? (nomeClasse ? nomeClasse + ' · ' : '⚠︎ classe da scegliere · ')
        + Object.keys(x.features||{}).length + ' privilegi (liv. ' + Object.keys(x.features||{}).sort((a,c)=>a-c).join(', ') + ')'
      : x.kind === 'race'
        ? [Object.entries(x.bonus||{}).map(([kk,v])=>ABILITY_BY_KEY[kk].abbr+' +'+v).join(' '),
           (x.traits||[]).length + ' ' + pluralize((x.traits||[]).length,'tratto','tratti'),
           x.speed+' m',
           /* Le varianti sono la cosa che si vuole sapere PRIMA di
              importare: se il lettore non le ha viste, si rilegge il PDF
              invece di accorgersene dopo, dentro la creazione guidata. */
           (x.subraces||[]).length ? (x.subraces.length + ' ' + pluralize(x.subraces.length,'variante','varianti') + ': ' + x.subraces.map(v=>v.name).join(', ')) : ''
          ].filter(Boolean).join(' · ')
        : [(x.skills||[]).map(s=>(SKILLS.find(y=>y.key===s)||{}).label).filter(Boolean).join(', '), x.feature].filter(Boolean).join(' · ');
    const st = hbStatoVoce(x);
    return `<button class="attack-row" style="width:100%; text-align:left; ${on?'border-color:var(--gold)':(st.stato!=='nuova'?'border-color:var(--line)':'')}" onclick="hbBulkToggle('${x.id}')">
      <span style="flex-shrink:0; margin-right:10px; font-size:1.1rem">${on?'☑':'⬜'}</span>
      <span class="attack-main">
        <span class="attack-name" style="${st.stato!=='nuova'&&!on?'opacity:.72':''}">${k.icon||''} ${escapeHtml(x.name)}${
          st.stato==='mia' ? ' <span class="badge">già tua</span>' : st.stato==='tavolo' ? ' <span class="badge">dal tavolo</span>' : ''}</span>
        <span class="muted" style="font-size:.73rem; display:block">${escapeHtml([dettaglio||'—', st.nota].filter(Boolean).join(' · '))}</span>
        ${(()=>{ const d = hbCosaManca(x); return d ? `<span style="font-size:.71rem; display:block; color:var(--warn)">${ic('avviso')} ${escapeHtml(d)}</span>` : ''; })()}
      </span>
    </button>`;
  };
  /* Elenco raccolto in gruppi apribili: serve sia alle sottoclassi (per
     classe) sia alle razze (per stirpe), che altrimenti sono liste
     lunghissime da scorrere. */
  const gruppi = (lista, titolo, chiave, etichetta, azione, extra) => {
    if (!lista.length) return '';
    const mappa = new Map();
    lista.forEach(x => {
      const k = chiave(x);
      if (!mappa.has(k)) mappa.set(k, []);
      mappa.get(k).push(x);
    });
    const ordine = [...mappa.keys()].sort((a,c) => {
      if (!a) return 1; if (!c) return -1;
      return etichetta(a).localeCompare(etichetta(c));
    });
    const unoSolo = ordine.every(k => mappa.get(k).length === 1);
    const blocchi = ordine.map(k => {
      const voci = mappa.get(k);
      // Un gruppo da una voce sola non vale un clic: si mostra la riga e basta.
      if (voci.length === 1) return `<div style="margin-bottom:8px">${riga(voci[0])}</div>`;
      // Con poche voci, o con gruppi da uno, non ha senso far aprire.
      const aperto = (lista.length <= 12 || unoSolo)
        ? !(hbBulk.chiusi && hbBulk.chiusi.has(titolo+':'+k))
        : !!(hbBulk.aperti && hbBulk.aperti.has(titolo+':'+k));
      const scelti = voci.filter(x => b.scelti.has(x.id)).length;
      return `<div style="margin-bottom:8px">
        <button class="attack-row" style="width:100%; text-align:left" onclick="hbBulkApri('${jsStr(titolo+':'+k)}', ${lista.length}, ${unoSolo})">
          <span style="flex-shrink:0; margin-right:10px">${aperto?'▾':'▸'}</span>
          <span class="attack-main">
            <span class="attack-name">${escapeHtml(etichetta(k))}</span>
            <span class="muted" style="font-size:.73rem; display:block">${voci.length} voci${scelti?' · '+scelti+(scelti===1?' scelta':' scelte'):''}</span>
          </span>
        </button>
        ${aperto ? `<div class="chip-row" style="margin:8px 0">
            <button class="chip" onclick="${azione}(true,'${jsStr(k)}')">Scegli tutte</button>
            <button class="chip" onclick="${azione}(false,'${jsStr(k)}')">Nessuna</button>
          </div>
          ${extra ? extra(k) : ''}
          ${bloccoLista('hbg:'+titolo+':'+k, voci, riga, { modale:true, nome:'voci' })}` : ''}
      </div>`;
    }).join('');
    return `<div class="divider"><span class="flourish">❧</span><span>${titolo} (${lista.length})</span></div>
      <div class="chip-row" style="margin-bottom:8px">
        <button class="chip" onclick="${azione}(true)">Scegli tutte</button>
        <button class="chip" onclick="${azione}(false)">Nessuna</button>
      </div>${blocchi}`;
  };

  const sezione = (kind, titolo) => perTipo[kind].length
    ? `<div class="divider"><span class="flourish">❧</span><span>${titolo} (${perTipo[kind].length})</span></div>
       <div class="chip-row" style="margin-bottom:8px">
         <button class="chip" onclick="hbBulkAll('${kind}',true)">Scegli tutti</button>
         <button class="chip" onclick="hbBulkAll('${kind}',false)">Nessuno</button>
       </div>
       ${bloccoLista('hbs:'+kind, perTipo[kind], riga, { modale:true, nome:'voci' })}` : '';

  /* Le sottoclassi di una classe che l'app non ha (Artefice, Mistico…)
     stanno nel gruppo di QUELLA classe, col suo nome: «Senza classe»
     mescolava tutto, e assegnandole se ne spostavano anche di non loro. */
  const nomeClasseDi = (k) => !k ? 'Senza classe riconosciuta'
    : k.startsWith('?') ? k.slice(1) + ' — classe che l’app non ha'
    : ((typeof CLASS_BY_ID !== 'undefined' && CLASS_BY_ID[k]) ? CLASS_BY_ID[k].name : k);
  /* Con un manuale intero le sottoclassi sono più di cento e le razze
     quasi cinquanta: si raccolgono per classe e per stirpe. */
  const sezioneSottoclassi = () => gruppi(
    perTipo.subclass, 'Sottoclassi', hbGruppoClasse, nomeClasseDi, 'hbBulkTutteSub',
    (k) => (k && !k.startsWith('?')) ? '' : `<div class="field" style="margin:8px 0">
        <label>Assegna tutto il gruppo a una classe</label>
        <select onchange="hbBulkAssegna(this.value, '${jsStr(k)}')">
          <option value="">— scegli la classe —</option>
          ${classiBase().map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>`);
  const sezioneRazze = () => gruppi(
    perTipo.race, 'Razze', x => hbStirpe(x.name), (k) => k || 'Altre', 'hbBulkTutteRazze');

  /* Cercando, i gruppi lasciano il posto a un elenco piatto: quando sai
     il nome non vuoi aprire la classe giusta, vuoi la riga. */
  const q = (b.q || '').trim();
  const cercati = q ? (()=>{ const nq = norm(q);
      return b.trovati.filter(x => norm(x.name||'').includes(nq)
        || norm(((typeof CLASS_BY_ID!=='undefined' && CLASS_BY_ID[x.classId])||{}).name || '').includes(nq)); })()
    : null;

  const n = b.scelti.size;
  return modalShell('⤒ Cosa ho trovato', `
    ${(() => {
      const gia = b.trovati.filter(x => hbStatoVoce(x).stato === 'mia').length;
      const tav = b.trovati.filter(x => hbStatoVoce(x).stato === 'tavolo').length;
      return `<div class="card" style="margin-bottom:12px">
        <div class="row-between"><span class="muted">Riconosciuti</span><b>${b.trovati.length}</b></div>
        <div class="row-between" style="margin-top:4px"><span class="muted">Nuovi</span><b>${b.trovati.length - gia - tav}</b></div>
        ${gia ? `<div class="row-between" style="margin-top:4px"><span class="muted">Che hai già</span><b>${gia}</b></div>` : ''}
        ${tav ? `<div class="row-between" style="margin-top:4px"><span class="muted">Già sul tavolo</span><b>${tav}</b></div>` : ''}
        <div class="row-between" style="margin-top:4px"><span class="muted">Selezionati</span><b style="color:var(--gold)">${n}</b></div>
        ${gia ? `<div class="muted" style="font-size:.73rem; margin-top:8px">Quelli che hai già partono non spuntati: sceglierli non ne crea una copia, <b>aggiorna</b> quelli tuoi col testo appena letto.</div>` : ''}
      </div>`;
    })()}
    ${b.trovati.length > LISTA_PASSO ? cercaLista('hb-bulk-cerca', b.q, 'hbBulkCerca', 'Cerca fra le ' + b.trovati.length + ' voci trovate\u2026') : ''}
    ${b.trovati.length ? '' : emptyState('🤔','Non ho riconosciuto niente. Prova con una porzione più piccola, o incolla il testo di una voce sola.')}
    ${cercati ? (cercati.length
        ? `<div class="chip-row" style="margin-bottom:8px">
             <button class="chip" onclick="hbBulkTuttiCercati(true)">Scegli i ${cercati.length} trovati</button>
             <button class="chip" onclick="hbBulkTuttiCercati(false)">Nessuno</button>
           </div>` + bloccoLista('hb-cercati', cercati, riga, { modale:true, nome:'voci' })
        : `<div class="lista-vuota">Nessuna voce con questo nome.</div>`)
      : `${sezioneSottoclassi()}
    ${sezioneRazze()}
    ${sezione('background','Background')}`}
    ${(typeof campaignReady === 'function' && campaignReady()) ? `
      <button class="switch-row" style="margin-top:14px" onclick="hbBulkShare()">
        <div class="track"><div class="knob" style="${b.condividi?'transform:translateX(21px)':''}"></div></div>
        <div style="flex:1; text-align:left; font-family:var(--font-ui)">
          <b style="font-size:.84rem">Condividi con «${escapeHtml(state.campaign.name||'la campagna')}»</b>
          <div class="muted" style="font-size:.73rem; font-weight:600">Li vedranno i membri del tuo tavolo nella creazione guidata.</div>
        </div>
      </button>` : ''}
    <div class="btn-row" style="margin-top:14px">
      <button class="btn btn-ghost" onclick="openHomebrewBulk()">← Ricomincia</button>
      <button class="btn btn-primary" ${n?'':'disabled'} onclick="hbBulkConfirm()">Aggiungi ${n||''}</button>
    </div>
    <div class="muted" style="font-size:.73rem; margin-top:10px">Quello che l'app riconosce è una bozza: apri ogni voce dopo e sistemala se serve. Le sottoclassi vanno legate alla classe giusta.</div>`);
}
function hbBulkCerca(v){ hbBulk.q = v; listaAzzera('hb-cercati'); renderModalRoot(); }
function hbBulkTuttiCercati(on){
  const nq = norm((hbBulk.q||'').trim());
  hbBulk.trovati.filter(x => norm(x.name||'').includes(nq)
      || norm(((typeof CLASS_BY_ID!=='undefined' && CLASS_BY_ID[x.classId])||{}).name || '').includes(nq))
    .forEach(x => on ? hbBulk.scelti.add(x.id) : hbBulk.scelti.delete(x.id));
  renderModalRoot();
}
function hbBulkToggle(id){
  if (hbBulk.scelti.has(id)) hbBulk.scelti.delete(id); else hbBulk.scelti.add(id);
  renderModalRoot();
}
function hbBulkAll(kind, on, classId){
  hbBulk.trovati
    .filter(x => x.kind===kind && (classId === undefined || (x.classId||'') === classId))
    .forEach(x => on ? hbBulk.scelti.add(x.id) : hbBulk.scelti.delete(x.id));
  renderModalRoot();
}
/* Dà in un colpo solo una classe a tutte le sottoclassi rimaste senza. */
function hbGruppoClasse(x){ return x.classId || (x.classeNelManuale ? '?' + x.classeNelManuale : ''); }
function hbBulkAssegna(classId, gruppo){
  if (!classId) return;
  let n = 0;
  hbBulk.trovati.forEach(x => {
    if (x.kind !== 'subclass' || x.classId) return;
    if (gruppo != null && hbGruppoClasse(x) !== gruppo) return;
    x.classId = classId; n++;
  });
  if (hbBulk.aperti) hbBulk.aperti.add('Sottoclassi:'+classId);
  if (hbBulk.chiusi) hbBulk.chiusi.delete('Sottoclassi:'+classId);
  renderModalRoot();
  if (n) toast(n + ' sottoclassi assegnate a ' + ((CLASS_BY_ID[classId]||{}).name || classId));
}
/* Apre o chiude il gruppo di una classe nell'elenco. */
function hbBulkApri(chiave, quante, unoSolo){
  // Se i gruppi partono già aperti si tiene la lista di quelli chiusi.
  const partonoAperti = (quante <= 12) || unoSolo;
  const insieme = partonoAperti ? (hbBulk.chiusi = hbBulk.chiusi || new Set())
                                : (hbBulk.aperti = hbBulk.aperti || new Set());
  if (insieme.has(chiave)) insieme.delete(chiave); else insieme.add(chiave);
  renderModalRoot();
}
/* Scorciatoie usate dai pulsanti dei gruppi. */
function hbBulkTutteSub(on, gruppo){
  hbBulk.trovati
    .filter(x => x.kind === 'subclass' && (gruppo === undefined || hbGruppoClasse(x) === gruppo))
    .forEach(x => on ? hbBulk.scelti.add(x.id) : hbBulk.scelti.delete(x.id));
  renderModalRoot();
}
function hbBulkTutteRazze(on, stirpe){
  hbBulk.trovati
    .filter(x => x.kind==='race' && (stirpe === undefined || hbStirpe(x.name) === stirpe))
    .forEach(x => on ? hbBulk.scelti.add(x.id) : hbBulk.scelti.delete(x.id));
  renderModalRoot();
}
function hbBulkShare(){ hbBulk.condividi = !hbBulk.condividi; renderModalRoot(); }

function hbBulkAnalizza(testo){
  if (!String(testo||'').trim()){
    hbBulk.busy = false; renderModalRoot();
    toast('Non c\'è niente da leggere'); return;
  }
  const trovati = hbScanText(testo);
  hbBulk.trovati = trovati;
  hbBulk.busy = false;
  /* Chi carica un manuale intero le vuole tutte — ma solo quelle che non
     ha già: partono spuntate le nuove, le altre restano da spuntare a
     mano se davvero le vuoi riscrivere. */
  hbBulk.scelti = new Set(trovati.filter(x => hbStatoVoce(x).stato === 'nuova').map(x => x.id));
  hbBulk.aperti = new Set();
  hbBulk.chiusi = new Set();
  hbBulk.q = '';
  listaAzzeraTutte('hb');
  renderModalRoot({ toTop:true });
  toast(trovati.length ? ('Ho riconosciuto ' + trovati.length + ' ' + pluralize(trovati.length,'voce','voci')) : 'Non ho riconosciuto niente');
}
function hbBulkFromBox(){
  const el = document.getElementById('hb-bulk-text');
  hbBulkAnalizza(el ? el.value : '');
}
/* Legge uno o più file di fila e mette insieme tutto quello che trova:
   così razze e sottoclassi entrano con un caricamento solo. */
async function hbBulkFile(input){
  const files = Array.from(input.files || []);
  input.value = '';
  return hbBulkUsaFile(files);
}
/* Legge file già scelti altrove (per esempio dal tasto «Importa» delle
   opzioni, che accetta qualsiasi tipo di file). */
async function hbBulkUsaFile(files){
  files = Array.from(files || []);
  if (!files.length) return;
  hbBulk.busy = true; hbBulk.pag = 0; hbBulk.tot = 0;
  hbBulk.file = 0; hbBulk.file_n = files.length; hbBulk.nome = '';
  renderModalRoot();

  const testi = [];
  for (let i = 0; i < files.length; i++){
    const f = files[i];
    hbBulk.file = i + 1; hbBulk.nome = f.name || ''; hbBulk.pag = 0; hbBulk.tot = 0;
    renderModalRoot();
    try {
      const testo = /pdf/i.test(f.type||'') || /\.pdf$/i.test(f.name||'')
        ? await hbLeggiPdf(f)
        : await hbLeggiTesto(f);
      if (testo) testi.push(testo);
    } catch(e){
      console.error(e);
      toast(' Non riesco a leggere «' + (f.name||'il file') + '»');
    }
  }
  if (!testi.length){ hbBulk.busy = false; renderModalRoot(); return; }
  hbBulkAnalizza(testi.join('\n\n'));
}
function hbLeggiPdf(file){
  return new Promise((risolvi, rifiuta) => {
    const r = new FileReader();
    r.onload = async () => {
      try {
        let ultimo = 0;
        const { text } = await extractPdfColumns(r.result, 1, 0, (fatte, totali) => {
          hbBulk.pag = fatte; hbBulk.tot = totali;
          // una ridisegnata ogni mezzo secondo: basta a far vedere che lavora
          const ora = Date.now();
          if (ora - ultimo > 500){ ultimo = ora; renderModalRoot(); }
        });
        risolvi(text);
      } catch(e){ rifiuta(e); }
    };
    r.onerror = () => rifiuta(new Error('file illeggibile'));
    r.readAsArrayBuffer(file);
  });
}
function hbLeggiTesto(file){
  return new Promise((risolvi, rifiuta) => {
    const r = new FileReader();
    r.onload = () => risolvi(r.result);
    r.onerror = () => rifiuta(new Error('file illeggibile'));
    r.readAsText(file);
  });
}
async function hbBulkConfirm(){
  const scelti = hbBulk.trovati.filter(x => hbBulk.scelti.has(x.id));
  if (!scelti.length) return;
  state.homebrew = state.homebrew || [];
  const quantePrima = state.homebrew.length;
  /* Com'erano prima le voci che stiamo per sostituire: serve solo se il
     salvataggio fallisce e bisogna rimetterle a posto. */
  const prima = new Map();
  scelti.forEach(x => { const m = hbGiaTua(x); if (m) prima.set(m.id, m); });
  let conEffetti = 0, aggiornate = 0;
  const ora = Date.now();
  scelti.forEach(x => {
    // se dal testo si capiscono gli effetti sulle regole, glieli si mette
    // già addosso: poi si aprono con ${ic('opzioni')} e si sistemano.
    if (typeof proponiMeccaniche === 'function'){
      try { const m = proponiMeccaniche(x); if (m){ x.meccaniche = m; conEffetti++; } } catch(e){}
    }
    x.updatedAt = ora;
    /* Se una voce con lo stesso nome ce l'hai già, si AGGIORNA quella
       invece di affiancarne una copia: si tiene il suo identificativo,
       così le schede che ci sono attaccate (raceId, subclassId) non
       restano a puntare a una voce morta. Gli effetti ${ic('opzioni')} che avevi
       configurato a mano non si buttano se la lettura non ne propone. */
    const mia = hbGiaTua(x);
    if (mia){
      const vecchiaMecc = mia.meccaniche;
      x.id = mia.id;
      if (!x.meccaniche && vecchiaMecc) x.meccaniche = vecchiaMecc;
      if (!x.classId && mia.classId) x.classId = mia.classId;   // il legame alla classe si conserva
      /* Gli effetti ⚙ configurati su una VARIANTE: si ritrovano per nome
         e si riattaccano. Senza questo, rileggere lo stesso manuale
         buttava via il lavoro fatto a mano su ogni variante — e la
         rilettura è proprio la cosa che si fa più spesso. */
      if (Array.isArray(x.subraces) && Array.isArray(mia.subraces)){
        x.subraces.forEach(nuova => {
          const vecchia = mia.subraces.find(v => norm(v.name||'') === norm(nuova.name||''));
          if (!vecchia) return;
          if (!nuova.meccaniche && vecchia.meccaniche) nuova.meccaniche = vecchia.meccaniche;
          if (vecchia.id) nuova.id = vecchia.id;   // le schede attaccate puntano a questo
          if (!Object.keys(nuova.bonus||{}).length && Object.keys(vecchia.bonus||{}).length) nuova.bonus = vecchia.bonus;
          if (!nuova.grantSkills && vecchia.grantSkills) nuova.grantSkills = vecchia.grantSkills;
        });
      }
      const i = state.homebrew.indexOf(mia);
      state.homebrew[i] = x;
      aggiornate++;
    } else state.homebrew.push(x);
  });

  // Un manuale intero sono centinaia di voci: una sola riscrittura
  // dell'archivio e le scritture sul server a pacchetti, non una per voce.
  hbBulk.salvando = { fatti: 0, tot: scelti.length };
  renderModalRoot();
  const esito = await fsSetMany('homebrew', scelti, (fatti, tot) => {
    if (hbBulk && hbBulk.salvando){ hbBulk.salvando = { fatti, tot }; renderModalRoot(); }
  });

  if (esito === -1){
    /* Tornare indietro davvero: le voci nuove si tolgono, quelle
       sostituite si rimettono com'erano — se no un'importazione fallita
       cancellerebbe roba che c'era gia'. */
    const nuove = new Set(scelti.filter(x => !prima.has(x.id)).map(x => x.id));
    state.homebrew = state.homebrew.filter(x => !nuove.has(x.id))
      .map(x => prima.has(x.id) ? prima.get(x.id) : x);
    saveLocalOra();
    if (hbBulk) hbBulk.salvando = null;
    renderModalRoot();
    confirmDialog('Non ci stanno tutte',
      'La memoria del telefono è piena: ne hai già ' + quantePrima + ' fra le tue voci. ' +
      'Non ho aggiunto niente per non lasciare l\'archivio a metà. ' +
      'Svuota il cestino da Opzioni → Salute dei dati, oppure aggiungine meno per volta.',
      () => {}, 'Ho capito');
    return;
  }

  const condividi = hbBulk.condividi;
  closeModal(); render();
  const nuove = scelti.length - aggiornate;
  toast(nuove + ' ' + pluralize(nuove, 'voce aggiunta', 'voci aggiunte') +
        (aggiornate ? ' · ' + aggiornate + (aggiornate === 1 ? ' aggiornata' : ' aggiornate') : '') +
        (conEffetti ? ' · ' + conEffetti + ' con effetti riconosciuti' : ''));
  if (condividi && typeof shareToCampaign === 'function'){
    const n = await shareToCampaign('homebrew', scelti);
    if (n) toast(n + ' anche nella campagna');
  }
  hbBulk = null;
}
