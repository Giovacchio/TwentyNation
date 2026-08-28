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

const HB_STOP_HEAD = /^(chapter|capitolo|contents|indice|appendix|appendice|part |parte )/i;

/* Ripulisce le spaziature rotte tipiche dei testi estratti da PDF */
function hbTidy(raw){
  return String(raw||'')
    .replace(/\r/g, '')
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
    }
  }
  const voci = [];   // { marker:'•'|'o'|'', testo }
  const push = (marker, testo) => voci.push({ marker, testo: testo.trim() });

  for (let i = 0; i < grezze.length; i++){
    let l = grezze[i];
    if (!l) { push('', ''); continue; }
    if (/^\d{1,4}$/.test(l)) continue;                 // numero di pagina
    if (/^[•▪◦]$/.test(l) || /^o$/.test(l)) continue;   // pallino orfano
    let marker = '';
    let m = /^([•▪◦])\s*(.*)$/.exec(l);
    if (m){ marker = '•'; l = m[2]; }
    else { m = /^o\s+(.+)$/.exec(l); if (m){ marker = 'o'; l = m[1]; } }
    l = l.trim();
    if (!l){ if (marker) push(marker, ''); continue; }

    const apreVoce = marker
      || /^(.{2,60}?)\s*:\s*/.test(l)                  // «Campo: valore»
      || /^(.+?)\s*\([A-Z]{2,6}\)\s*:?\s*$/.test(l)   // «Nome (FONTE):»
      || hbIsHeading(l);
    const prec = voci[voci.length-1];
    if (!apreVoce && prec && prec.testo && !/[.!?:]$/.test(prec.testo) === false){
      // continuazione: si attacca alla voce prima
      prec.testo += ' ' + l;
      continue;
    }
    if (!apreVoce && prec && prec.testo && prec.marker){
      prec.testo += ' ' + l;
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
function hbCampo(testo){
  const m = /^(.{2,48}?)\s*:\s*(.+)$/s.exec(String(testo||'').trim());
  return m ? { campo: m[1].trim(), valore: m[2].trim() } : null;
}
const HB_CAMPI_RAZZA = /^(ability scores?|ability score increase|aumento dei punteggi|punteggi di caratteristica|age|et[àa]|size|taglia|speed|velocit[àa]|languages?|lingue|linguaggi|alignment|allineamento)$/i;

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
  (typeof CLASSES_FULL !== 'undefined' ? CLASSES_FULL : []).forEach(c => {
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

/* ─── Lettura delle guide («Nome (FONTE):» con elenchi puntati) ─── */
function hbScanGuida(raw){
  const voci = hbNormalizza(raw);
  const out = [];
  const mappaClassi = hbMappaSottoclassi(voci);
  let sezioneClasse = '';   // classe della sezione in cui ci troviamo

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
    if (idClasse && hbSembraClasse(corpo)){ sezioneClasse = idClasse; continue; }
    if (hbSembraClasse(corpo)){ sezioneClasse = ''; continue; }  // classe non nota (es. Artefice)

    /* — sottoclasse: ha almeno due «Livello N» — */
    const livelli = corpo.filter(v => /^(level|livello)\s*\d+/i.test(v.testo));
    if (livelli.length >= 2){
      const features = {};
      let lv = null, n = 0;
      corpo.forEach(v => {
        const ml = /^(?:level|livello)\s*(\d+)/i.exec(v.testo);
        if (ml){ lv = clamp(parseInt(ml[1]),1,20); return; }
        if (!lv) return;
        const c = hbCampo(v.testo);
        if (c && c.valore.length > 12){
          (features[lv] = features[lv] || []).push([c.campo, c.valore.slice(0,700)]);
          n++;
        }
      });
      if (n >= 2){
        out.push({ kind:'subclass', name: t.nome, source: t.fonte,
                   classId: sezioneClasse || mappaClassi[norm(t.nome)] || hbIndovinaClasse(t.nome),
                   features });
        continue;
      }
    }

    /* — razza: ha i campi tipici — */
    const campi = {};
    const tratti = [];
    corpo.forEach(v => {
      const c = hbCampo(v.testo);
      if (!c) return;
      if (HB_CAMPI_RAZZA.test(c.campo)) campi[norm(c.campo)] = c.valore;
      else if (c.valore.length > 10) tratti.push([c.campo, c.valore.slice(0,500)]);
    });
    const haPunteggi = Object.keys(campi).some(k => /punteggi|ability/.test(k));
    const haVelocita = Object.keys(campi).some(k => /speed|velocit/.test(k));
    if (haPunteggi && (haVelocita || tratti.length >= 2)){
      const kPunteggi = Object.keys(campi).find(k => /punteggi|ability/.test(k));
      const kVel = Object.keys(campi).find(k => /speed|velocit/.test(k));
      const kTaglia = Object.keys(campi).find(k => /size|taglia/.test(k));
      const kLingue = Object.keys(campi).find(k => /languages?|lingue|linguaggi/.test(k));
      out.push({ kind:'race', name: t.nome, source: t.fonte,
        bonus: parseAbilityBonus(campi[kPunteggi]),
        speed: kVel ? parseSpeedM(campi[kVel]) : 9,
        size: kTaglia ? parseSizeWord(campi[kTaglia]) : 'Media',
        languages: kLingue ? campi[kLingue].slice(0,120) : 'Comune',
        traits: tratti.slice(0,10), grantSkills: [] });
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
        langCount: (()=>{ const v = get(/languages?|lingue/i); const n = /(\d+)|two|due/i.exec(v||''); return n ? (/two|due/i.test(n[0])?2:parseInt(n[0])||1) : 0; })(),
        feature: get(/^(feature|privilegio)$/i),
        desc: get(/^(feature|privilegio)$/i) ? '' : '',
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
  (typeof CLASSES_FULL !== 'undefined' ? CLASSES_FULL : []).forEach(c => {
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
    if (daGuida.length >= 2) trovati.push(...daGuida);
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
    const coda = righe.slice(i, Math.min(righe.length, i + 70));
    const blocco = coda.join('\n');
    if (!(RX_RACE_SPEED.test(blocco) || /^(Speed|Velocit)/im.test(blocco))) continue;
    const rz = { kind:'race', name: nome, bonus: parseAbilityBonus(m[2] + ' ' + (coda[1]||'')),
      speed: 9, size:'Media', languages:'Comune', traits: [], grantSkills: [] };
    let tratti = [];
    for (let j = 0; j < coda.length; j++){
      const l = coda[j]; if (!l) continue;
      let x;
      if ((x = RX_RACE_SPEED.exec(l))){ rz.speed = parseSpeedM(x[2] + ' ' + (coda[j+1]||'')); continue; }
      if ((x = RX_RACE_SIZE.exec(l))){ rz.size = parseSizeWord(x[2] + ' ' + (coda[j+1]||'')); continue; }
      if ((x = RX_RACE_LANG.exec(l))){ rz.languages = (x[2]||'').trim().slice(0,120) || 'Comune'; continue; }
      if (RX_RACE_AGE.test(l) || RX_RACE_ALIGN.test(l) || RX_RACE_ASI.test(l)) continue;
      // un tratto: «Nome. testo»
      const t = /^([A-ZÀ-Ý][A-Za-zÀ-ý' \-]{2,34})\s*[.:]\s+(.{15,})$/.exec(l);
      if (t) tratti.push([t[1].trim(), t[2].trim().slice(0,400)]);
      if (tratti.length >= 8) break;
    }
    rz.traits = tratti;
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

/* ─── Interfaccia ─── */
let hbBulk = null; /* { trovati, scelti:Set, condividi } */

function openHomebrewBulk(){
  hbBulk = { trovati: null, scelti: new Set(), condividi: false, busy: false };
  openModal({ render: hbBulkHTML });
}
function hbBulkHTML(){
  const b = hbBulk || {};
  if (!b.trovati) return modalShell('⤒ Leggi dal tuo manuale', `
    <p class="muted" style="margin-bottom:14px">
      Carica un file di testo o un PDF preso dal manuale che possiedi: l'app cerca da sola
      <b>sottoclassi, razze e background</b> e ti fa scegliere quali tenere.
      Quello che entra resta tuo; lo condividi col tavolo solo se lo decidi.
    </p>
    <div class="btn-row">
      <button class="btn btn-gold" ${b.busy?'disabled':''} onclick="document.getElementById('hb-bulk-file').click()">📂 ${b.busy?'Leggo…':'Scegli il file'}</button>
      <button class="btn btn-ghost" ${b.busy?'disabled':''} onclick="hbBulkFromBox()">Analizza il testo</button>
    </div>
    <input type="file" id="hb-bulk-file" accept=".txt,text/plain,application/pdf,.pdf,.md" style="display:none" onchange="hbBulkFile(this)">
    <div class="field" style="margin-top:12px">
      <label>…oppure incolla qui</label>
      <textarea id="hb-bulk-text" style="min-height:120px; font-family:var(--font-ui); font-size:.8rem" placeholder="Incolla il testo di una sottoclasse, di una razza o di un background."></textarea>
    </div>
    <div class="spell-source-note">Carica solo materiale di cui hai i diritti: i tuoi appunti, il tuo homebrew, o i manuali che possiedi. Resta sul tuo account e, se lo scegli, sul tavolo che hai creato tu.</div>`);

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
        ? [Object.entries(x.bonus||{}).map(([kk,v])=>ABILITY_BY_KEY[kk].abbr+' +'+v).join(' '), (x.traits||[]).length + ' tratti', x.speed+' m'].filter(Boolean).join(' · ')
        : [(x.skills||[]).map(s=>(SKILLS.find(y=>y.key===s)||{}).label).filter(Boolean).join(', '), x.feature].filter(Boolean).join(' · ');
    return `<button class="attack-row" style="width:100%; text-align:left; ${on?'border-color:var(--gold)':''}" onclick="hbBulkToggle('${x.id}')">
      <span style="flex-shrink:0; margin-right:10px; font-size:1.1rem">${on?'☑️':'⬜'}</span>
      <span class="attack-main">
        <span class="attack-name">${k.icon||''} ${escapeHtml(x.name)}</span>
        <span class="muted" style="font-size:.73rem; display:block">${escapeHtml(dettaglio||'—')}</span>
      </span>
    </button>`;
  };
  const sezione = (kind, titolo) => perTipo[kind].length
    ? `<div class="divider"><span class="flourish">❧</span><span>${titolo} (${perTipo[kind].length})</span></div>
       <div class="chip-row" style="margin-bottom:8px">
         <button class="chip" onclick="hbBulkAll('${kind}',true)">Scegli tutti</button>
         <button class="chip" onclick="hbBulkAll('${kind}',false)">Nessuno</button>
       </div>
       <div class="list-gap">${perTipo[kind].map(riga).join('')}</div>` : '';

  /* Con un manuale intero le sottoclassi sono più di cento: le raccogliamo
     per classe, così si trova subito quella che interessa. */
  const sezioneSottoclassi = () => {
    const lista = perTipo.subclass;
    if (!lista.length) return '';
    const gruppi = new Map();
    lista.forEach(x => {
      const k = x.classId || '';
      if (!gruppi.has(k)) gruppi.set(k, []);
      gruppi.get(k).push(x);
    });
    const ordine = [...gruppi.keys()].sort((a,c) => {
      if (!a) return 1; if (!c) return -1;
      const na = (typeof CLASS_BY_ID !== 'undefined' && CLASS_BY_ID[a] ? CLASS_BY_ID[a].name : a);
      const nc = (typeof CLASS_BY_ID !== 'undefined' && CLASS_BY_ID[c] ? CLASS_BY_ID[c].name : c);
      return na.localeCompare(nc);
    });
    const blocchi = ordine.map(k => {
      const voci = gruppi.get(k);
      const nome = k
        ? ((typeof CLASS_BY_ID !== 'undefined' && CLASS_BY_ID[k] ? CLASS_BY_ID[k].name : k))
        : 'Senza classe riconosciuta';
      // Con poche voci non ha senso far aprire: si mostrano già tutte.
      const aperto = lista.length <= 12 ? !(hbBulk.chiusi && hbBulk.chiusi.has(k))
                                        : !!(hbBulk.aperti && hbBulk.aperti.has(k));
      const scelti = voci.filter(x => b.scelti.has(x.id)).length;
      return `<div style="margin-bottom:8px">
        <button class="attack-row" style="width:100%; text-align:left" onclick="hbBulkApri('${k}')">
          <span style="flex-shrink:0; margin-right:10px">${aperto?'▾':'▸'}</span>
          <span class="attack-main">
            <span class="attack-name">${escapeHtml(nome)}</span>
            <span class="muted" style="font-size:.73rem; display:block">${voci.length} sottoclassi${scelti?' · '+scelti+' scelte':''}</span>
          </span>
        </button>
        ${aperto ? `<div class="chip-row" style="margin:8px 0">
            <button class="chip" onclick="hbBulkAll('subclass',true,'${k}')">Scegli tutte</button>
            <button class="chip" onclick="hbBulkAll('subclass',false,'${k}')">Nessuna</button>
          </div>
          <div class="list-gap">${voci.map(riga).join('')}</div>` : ''}
      </div>`;
    }).join('');
    return `<div class="divider"><span class="flourish">❧</span><span>Sottoclassi (${lista.length})</span></div>
      <div class="chip-row" style="margin-bottom:8px">
        <button class="chip" onclick="hbBulkAll('subclass',true)">Scegli tutte</button>
        <button class="chip" onclick="hbBulkAll('subclass',false)">Nessuna</button>
      </div>${blocchi}`;
  };

  const n = b.scelti.size;
  return modalShell('⤒ Cosa ho trovato', `
    <div class="card" style="margin-bottom:12px">
      <div class="row-between"><span class="muted">Riconosciuti</span><b>${b.trovati.length}</b></div>
      <div class="row-between" style="margin-top:4px"><span class="muted">Selezionati</span><b style="color:var(--gold)">${n}</b></div>
    </div>
    ${b.trovati.length ? '' : emptyState('🤔','Non ho riconosciuto niente. Prova con una porzione più piccola, o incolla il testo di una voce sola.')}
    ${sezioneSottoclassi()}
    ${sezione('race','Razze')}
    ${sezione('background','Background')}
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
/* Apre o chiude il gruppo di una classe nell'elenco. */
function hbBulkApri(classId){
  const pochi = (hbBulk.trovati||[]).filter(x=>x.kind==='subclass').length <= 12;
  const insieme = pochi ? (hbBulk.chiusi = hbBulk.chiusi || new Set())
                        : (hbBulk.aperti = hbBulk.aperti || new Set());
  if (insieme.has(classId)) insieme.delete(classId); else insieme.add(classId);
  renderModalRoot();
}
function hbBulkShare(){ hbBulk.condividi = !hbBulk.condividi; renderModalRoot(); }

function hbBulkAnalizza(testo){
  if (!String(testo||'').trim()){ toast('Non c\'è niente da leggere'); return; }
  const trovati = hbScanText(testo);
  hbBulk.trovati = trovati;
  hbBulk.busy = false;
  hbBulk.scelti = new Set();
  hbBulk.aperti = new Set();
  hbBulk.chiusi = new Set();
  renderModalRoot({ toTop:true });
  toast(trovati.length ? ('Ho riconosciuto ' + trovati.length + ' voci') : '⚠️ Non ho riconosciuto niente');
}
function hbBulkFromBox(){
  const el = document.getElementById('hb-bulk-text');
  hbBulkAnalizza(el ? el.value : '');
}
function hbBulkFile(input){
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  const isPdf = /pdf/i.test(file.type||'') || /\.pdf$/i.test(file.name||'');
  hbBulk.busy = true; renderModalRoot();
  if (isPdf){
    const r = new FileReader();
    r.onload = async () => {
      try {
        const { text } = await extractPdfColumns(r.result, 1, 0);
        hbBulkAnalizza(text);
      } catch(e){ console.error(e); hbBulk.busy=false; renderModalRoot(); toast('⚠️ Non riesco a leggere questo PDF'); }
    };
    r.onerror = () => { hbBulk.busy=false; renderModalRoot(); toast('⚠️ File illeggibile'); };
    r.readAsArrayBuffer(file);
    return;
  }
  const r = new FileReader();
  r.onload = () => hbBulkAnalizza(r.result);
  r.onerror = () => { hbBulk.busy=false; renderModalRoot(); toast('⚠️ File illeggibile'); };
  r.readAsText(file);
}
async function hbBulkConfirm(){
  const scelti = hbBulk.trovati.filter(x => hbBulk.scelti.has(x.id));
  if (!scelti.length) return;
  state.homebrew = state.homebrew || [];
  scelti.forEach(x => { x.updatedAt = Date.now(); state.homebrew.push(x); fsSet('homebrew', x); });
  saveLocal();
  const condividi = hbBulk.condividi;
  closeModal(); render();
  toast('📚 ' + scelti.length + ' voci aggiunte ai tuoi contenuti');
  if (condividi && typeof shareToCampaign === 'function'){
    const n = await shareToCampaign('homebrew', scelti);
    if (n) toast('⚔️ ' + n + ' anche nella campagna');
  }
  hbBulk = null;
}
