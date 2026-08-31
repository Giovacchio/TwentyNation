/* TwentyNation — riempi la TUA scheda compilabile
   ----------------------------------------------------------------
   L'esportazione in PDF fa un foglio suo, pensato per la stampa. Ma se
   la scheda l'hai già — quella compilabile da cui l'app legge i dati —
   il posto giusto dove metterli è dentro quella, nelle sue caselle.
   Qui si fa il giro di ritorno: prendi il tuo modulo, l'app ci scrive
   dentro il personaggio e te lo ridà, ancora compilabile.

   Perché non è l'app a fornire il modulo: la scheda ufficiale è
   materiale protetto e non si può distribuire. Il modulo lo metti tu —
   è tuo — e l'app si limita a scriverci dentro. Gli stessi nomi di
   campo che il lettore usa per capire una scheda vengono qui riusati
   per riempirla: se un dato si legge, si riscrive nella stessa casella.
*/

let __modelloScheda = null;      // { nome, buffer } — dura quanto la sessione
let __modelloCampi  = null;      // i campi letti dal modello, con la geometria

function modelloPronto(){ return !!(__modelloScheda && __modelloScheda.buffer); }

/* ─── Indice dei campi del modulo ───
   pdf-lib vuole il nome esatto. Le schede in giro chiamano lo stesso
   dato in modi diversi ("CharacterName", "Nome"), quindi si cerca in
   forma normalizzata e si torna il nome vero da usare. */
function indiceNomi(form){
  const idx = {};
  form.getFields().forEach(f => {
    let n = ''; try { n = f.getName(); } catch(e){ return; }
    const k = norm(n).replace(/\s+/g, ' ');
    if (!idx[k]) idx[k] = n;
  });
  return idx;
}
function campoVero(idx, nomi){
  for (const n of nomi){
    const v = idx[norm(n).replace(/\s+/g,' ')];
    if (v) return v;
  }
  return null;
}

/* ─── Riempimento di un singolo campo ───
   Ogni scrittura è protetta: un modulo può avere caselle a lunghezza
   fissa, campi in sola lettura o caselle che pdf-lib non digerisce.
   Una casella che non si lascia scrivere non deve far saltare tutto il
   resto della scheda. */
function scriviCampo(form, lib, idx, nomi, valore, esito){
  if (valore === null || valore === undefined) return false;
  const testo = String(valore);
  if (!testo.trim()) return false;
  const nome = campoVero(idx, Array.isArray(nomi) ? nomi : [nomi]);
  if (!nome){ esito.mancanti.push((Array.isArray(nomi)?nomi[0]:nomi)); return false; }
  try {
    const f = form.getField(nome);
    if (lib.PDFTextField && f instanceof lib.PDFTextField){ f.setText(testo); esito.scritti++; return true; }
    if (lib.PDFDropdown && f instanceof lib.PDFDropdown){ f.select(testo); esito.scritti++; return true; }
    if (typeof f.setText === 'function'){ f.setText(testo); esito.scritti++; return true; }
  } catch(e){ esito.rifiutati.push(nome); }
  return false;
}
function spuntaCampo(form, lib, idx, nomi, acceso, esito){
  const nome = campoVero(idx, Array.isArray(nomi) ? nomi : [nomi]);
  if (!nome) return false;
  try {
    const f = form.getField(nome);
    if (typeof f.check === 'function'){
      if (acceso) f.check(); else f.uncheck();
      esito.scritti++; return true;
    }
    /* Non tutte le schede in giro usano vere caselle di spunta: alcune
       mettono un campo di testo dove ci si aspetta una crocetta. Meglio
       scriverci una X che lasciare la riga vuota. */
    if (typeof f.setText === 'function'){
      f.setText(acceso ? 'X' : '');
      esito.scritti++; return true;
    }
  } catch(e){ esito.rifiutati.push(nome); }
  return false;
}

/* ─── Da personaggio a caselle ───
   I nomi qui sotto sono gli stessi che legge pdf-import.js: primo il
   nome inglese della scheda standard, poi le varianti italiane. */
function riempiAnagrafica(form, lib, idx, c, e){
  const S = (n,v)=>scriviCampo(form, lib, idx, n, v, e);
  S(['CharacterName','CharacterName 2','Nome','Nome personaggio'], c.name);
  S(['PlayerName','Giocatore'], c.playerName);
  S(['Race ','Race','Razza'], nomeRazzaScheda(c));
  S(['Background','Backgroud','Retroscena'], nomeBackgroundScheda(c));
  S(['Alignment','Allineamento'], c.alignment);
  S(['XP','EXP','Punti esperienza','Esperienza'], c.xp);
  S(['Nex_XP','NextLevel','Prossimo livello'], c.xpNext);
  S(['ClassLevel','Class','Classe','Classe e livello'], rigaClasse(c));
  S(['Sottoclasse','Subclass','Archetipo','Archetype','Specializzazione'], nomeSottoclasseScheda(c));
  S(['Sesso','Sex','Gender','Genere'], c.sex);
  S(['ProfBonus','Bonus di competenza'], segno(profBonus(c.level)));
}
/* La riga «Classe e livello» deve poter essere riletta: il lettore la
   spacchetta cercando nome e numero, e con il multiclasse il formato
   «Guerriero 5 / Ladro 2» è quello che capisce. */
function rigaClasse(c){
  const uno = (c.classField || '') + ' ' + (c.level || 1);
  if (c.class2 && c.level2) return uno.trim() + ' / ' + c.class2 + ' ' + c.level2;
  return uno.trim();
}
function nomeRazzaScheda(c){
  if (typeof razzaDi === 'function'){ const r = razzaDi(c); if (r && r.name) return r.name; }
  return c.race || '';
}
function nomeBackgroundScheda(c){
  if (typeof backgroundDi === 'function'){ const b = backgroundDi(c); if (b && b.name) return b.name; }
  return c.background || '';
}
function nomeSottoclasseScheda(c){
  if (!c.subclassId || typeof subclassesFor !== 'function' || !c.classId) return '';
  const s = subclassesFor(c.classId).find(x => x.id === c.subclassId);
  return s ? s.name : '';
}
function segno(n){ const v = Number(n)||0; return (v >= 0 ? '+' : '') + v; }

function riempiCaratteristiche(form, lib, idx, c, e){
  const S = (n,v)=>scriviCampo(form, lib, idx, n, v, e);
  const C = (n,v)=>spuntaCampo(form, lib, idx, n, v, e);
  ABILITIES.forEach(a => {
    const code = a.key.toUpperCase();
    const val = getPath(c, 'abilities.'+a.key, 10);
    S([code, a.label], val);
    S([code+'mod', code+' mod', 'mod'+code], segno(mod(val)));
    // tiri salvezza
    S(['ST '+a.label, code+'save', 'ST'+code], segno(saveMod(c, a.key)));
    C([code+'prof', 'ST '+a.label+' prof', code+'save'], (c.saveProf||[]).includes(a.key));
  });
  // abilità: valore e spunta di competenza/esperienza
  const CODICI = { acrobatics:'ACRO', animalHandling:'ANIM', arcana:'ARC', athletics:'ATH',
    deception:'DEC', history:'HIST', insight:'INS', intimidation:'INTI', investigation:'INV',
    medicine:'MED', nature:'NAT', perception:'PERC', performance:'PERF', persuasion:'PERS',
    religion:'REL', sleightOfHand:'SLE', stealth:'STLTH', survival:'SURV' };
  SKILLS.forEach(s => {
    const code = CODICI[s.key];
    S([s.label, code], segno(skillMod(c, s)));
    if (!code) return;
    const liv = skillLevel(c, s.key);
    C([code+'P'], liv >= 1);
    C([code+'PE'], liv >= 2);
  });
  S(['Passive','PASSIVE','Percezione passiva'], passivePerception(c));
}

function riempiCombattimento(form, lib, idx, c, e){
  const S = (n,v)=>scriviCampo(form, lib, idx, n, v, e);
  const C = (n,v)=>spuntaCampo(form, lib, idx, n, v, e);
  S(['AC','CA','Classe Armatura'], c.ac);
  S(['Initiative','Iniziativa'], segno(c.initiative != null ? c.initiative : mod(getPath(c,'abilities.dex',10))));
  S(['Speed','Velocita','Velocità'], c.speed);
  S(['Vision','Sensi','Senses'], c.senses);
  S(['HPMax','PF Massimi','HP Max'], getPath(c,'hp.max',0));
  S(['HPCurrent','PF Attuali'], getPath(c,'hp.current',0));
  S(['HPTemp','PF Temporanei'], getPath(c,'hp.temp',0) || '');
  S(['HD','Dado Vita','HitDice'], (c.level||1) + 'd' + (c.hitDie||8));
  S(['HDTotal','HD Total','HDTotal2'], (c.level||1) + 'd' + (c.hitDie||8));
  S(['HDLeft','Dadi vita rimasti'], hitDiceLeft(c));
  if (c.hitDie2) S(['HD2'], (c.level2||0) + 'd' + c.hitDie2);
  C(['insp1','Inspiration','Ispirazione'], !!c.inspiration);
  S(['Exhaustion','Sfinimento'], c.exhaustion || '');
  // attacchi: le sei righe della scheda
  (c.attacks||[]).slice(0,6).forEach((a, i) => {
    const n = i + 1;
    S([n===1 ? 'Wpn Name' : 'Wpn Name '+n, 'Arma '+n], a.name);
    S(['Wpn'+n+' AtkBonus', 'Wpn'+n+' AtkBonus ', 'Wpn'+n+'AtkBonus'], a.atk);
    S(['Wpn'+n+' Damage', 'Wpn'+n+' Damage ', 'Wpn'+n+'Damage'], a.dmg);
  });
  // risorse a usi limitati
  (c.resources||[]).slice(0,6).forEach((r, i) => {
    const n = i + 1;
    S(['Limited Feat '+n], r.name);
    S(['FeatTot '+n], r.total);
    S(['FeatLeft '+n], r.left);
    C(['RecoverySR '+n], r.recovery === 'sr');
    C(['RecoveryDN '+n], r.recovery === 'dn');
    C(['RecoveryLR '+n], r.recovery === 'lr' || !r.recovery);
  });
}

function riempiCompetenze(form, lib, idx, c, e){
  const S = (n,v)=>scriviCampo(form, lib, idx, n, v, e);
  const C = (n,v)=>spuntaCampo(form, lib, idx, n, v, e);
  S(['Languages 1','ProficienciesLang','Linguaggi'], c.languages);
  S(['TOOLS 1','Strumenti'], c.tools);
  S(['Armor','Armatura'], c.armor);
  const p = norm(c.profOther || '');
  C(['ArmorLight'], /armature leggere/.test(p));
  C(['ArmorMed'],   /armature medie/.test(p));
  C(['ArmorHea'],   /armature pesanti/.test(p));
  C(['Shield','Shields'], /scudi/.test(p));
  C(['WpnSim'], /armi semplici/.test(p));
  C(['WpnMar'], /armi da guerra/.test(p));
  S(['Talenti1','Talenti','Feats'], c.feats);
  S(['Testo2'], c.notesRace);
  S(['Testo3','Features and Traits','Privilegi'], testoPrivilegi(c));
  S(['Testo6','Note'], c.notesExtra);
  S(['Suppliche','Invocations','Eldritch Invocations','Supplica'], testoSuppliche(c));
  S(['PesoTrasportabile','PesoMassimo','Capacita'], c.carryCapacity);
}
/* I privilegi scritti a mano dall'utente restano; se sotto ci sono
   sottoclasse e suppliche, il lettore le ritrova da qui — è la casella
   in cui le cerca. */
function testoPrivilegi(c){
  const pezzi = [];
  if (c.features) pezzi.push(c.features);
  const sub = nomeSottoclasseScheda(c);
  if (sub && !(norm(c.features||'').includes(norm(sub)))) pezzi.push(sub);
  return pezzi.join('\n');
}
function testoSuppliche(c){
  if (typeof supplicheDi !== 'function') return '';
  const s = supplicheDi(c);
  return s.length ? s.map(x => x.nome).join('\n') : '';
}

function riempiStoria(form, lib, idx, c, e){
  const S = (n,v)=>scriviCampo(form, lib, idx, n, v, e);
  S(['Tratti car','PersonalityTraits ','PersonalityTraits','Tratti'], c.traits);
  S(['Ideali1','Ideals','Ideali'], c.ideals);
  S(['LEgami1','Bonds','Legami'], c.bonds);
  S(['DIfetti1','Flaws','Difetti'], c.flaws);
  S(['Nemici1','Nemici'], c.enemies);
  S(['Alleati','Allies','Allies and Organizations'], c.allies);
  S(['Fazione','FactionName','Faction'], c.faction);
  S(['SymbolNAME','Simbolo'], c.symbol);
  S(['Backstory','Storia','CharacterBackstory'], c.backstory);
  const ap = c.appearance || {};
  S(['AGE','Age','Eta','Età'], ap.age);
  S(['HEIGHT','Height','Altezza'], ap.height);
  S(['WEIGHT','Weight','Peso'], ap.weight);
  S(['EYES','Eyes','Occhi'], ap.eyes);
  S(['SKIN','Skin','Pelle'], ap.skin);
  S(['HAIR','Hair','Capelli'], ap.hair);
  S(['AppearanceText','Appearance','Aspetto'], ap.text);
}

function riempiZaino(form, lib, idx, c, e){
  const S = (n,v)=>scriviCampo(form, lib, idx, n, v, e);
  const monete = c.coins || {};
  [['cp','CP'],['sp','SP'],['ep','EP'],['gp','GP'],['pp','PP']].forEach(([k, code]) => {
    if (monete[k]) S([code], monete[k]);
  });
  /* Lo zaino: le schede hanno righe numerate «eq 1», «eq 2»… con il
     peso accanto. Se non ce ne sono, si ripiega sul campo unico. */
  const righe = (c.inventory||[]).map(o => (o.qty > 1 ? o.qty + '× ' : '') + (o.name||''));
  const pesi  = (c.inventory||[]).map(o => o.weight || '');
  let usateRighe = 0;
  for (let i = 0; i < righe.length && i < 40; i++){
    const nome = campoVero(idx, ['eq '+(i+1), 'eq'+(i+1)]);
    if (!nome) break;
    if (scriviCampo(form, lib, idx, [nome], righe[i], e)) usateRighe++;
    if (pesi[i]) scriviCampo(form, lib, idx, ['Peso'+(i+1)], pesi[i], e);
  }
  if (!usateRighe && righe.length) S(['Equipment','Equipaggiamento'], righe.join('\n'));
  else if (righe.length > usateRighe) S(['Equipment','Equipaggiamento'], righe.slice(usateRighe).join('\n'));
}

function riempiMagia(form, lib, idx, c, e){
  const S = (n,v)=>scriviCampo(form, lib, idx, n, v, e);
  if (!c.casterType || c.casterType === 'none') return;
  S(['SpellcastingClass 2','SpellcastingClass','Classe incantatore'], c.classField);
  const ab = ABILITIES.find(a => a.key === (c.spellAbility||'int'));
  S(['SpellcastingAbility 2','SpellcastingAbility','Caratteristica'], ab ? ab.label : '');
  S(['SpellSaveDC  2','SpellSaveDC 2','SpellSaveDC','CD'], 8 + spellcastingMod(c));
  S(['SpellAtkBonus 2','SpellAtkBonus','Bonus attacco magico'], segno(spellcastingMod(c)));
}

/* ─── Le caselle degli incantesimi ───
   Non hanno un nome parlante ("0 1", "1_3"): si capisce a che livello
   appartengono solo dalla loro posizione, sotto l'intestazione degli
   slot. È la stessa geometria che usa il lettore in importazione: qui
   la si ripercorre al contrario, per sapere dove scrivere. */
function caselleIncantesimiPerLivello(campi){
  const eCasella = (n) => /^0\s*\d+$/.test(n) || /^\d+_\d+$/.test(n) || /^spell name\s*\d+$/i.test(n) || /^spells\s*\d+$/i.test(n);
  const caselle = campi.filter(f => eCasella(f.name.trim()));
  if (!caselle.length) return null;
  const pagina = caselle.map(b=>b.page).sort((a,b)=>a-b)[Math.floor(caselle.length/2)];
  const colonna = (f) => Math.round(f.x / 90);
  const teste = campi.filter(f => /^slotstotal\s*\d+$/i.test(f.name.trim()) && f.page === pagina);
  teste.sort((a,b) => colonna(a) - colonna(b) || b.y - a.y);
  const livelloTesta = {};
  teste.forEach((h, i) => { livelloTesta[h.name] = i + 1; });

  const per = {};
  caselle.slice().sort((a,b) => (a.page-b.page) || (colonna(a)-colonna(b)) || (b.y - a.y)).forEach(box => {
    const n = box.name.trim();
    let liv = null;
    if (/^0\s*\d+$/.test(n)) liv = 0;
    else {
      let best = null;
      teste.forEach(h => {
        if (Math.abs(h.x - box.x) > 90 || h.y < box.y) return;
        if (!best){ best = h; return; }
        const dN = Math.abs(h.x - box.x), dV = Math.abs(best.x - box.x);
        if (dN < dV - 20 || (Math.abs(dN - dV) <= 20 && h.y < best.y)) best = h;
      });
      if (best) liv = livelloTesta[best.name];
    }
    if (liv == null) return;
    (per[liv] = per[liv] || []).push(box.name);
  });
  return { per, teste: teste.map(h => ({ nome: h.name, livello: livelloTesta[h.name] })) };
}
function riempiIncantesimi(form, lib, idx, c, campi, e){
  if (!c.casterType || c.casterType === 'none') return;
  const g = caselleIncantesimiPerLivello(campi);
  if (!g) return;
  const preparati = c.preparedSpells || [];
  const perLivello = {};
  (c.knownSpells||[]).forEach(k => {
    const sp = spellByRef(k); if (!sp) return;
    (perLivello[sp.level] = perLivello[sp.level] || []).push(sp);
  });
  Object.keys(perLivello).forEach(l => perLivello[l].sort((a,b)=>spellName(a).localeCompare(spellName(b),'it')));

  Object.keys(g.per).forEach(livStr => {
    const liv = Number(livStr);
    const caselle = g.per[liv];
    const lista = perLivello[liv] || [];
    caselle.forEach((nomeCampo, i) => {
      const sp = lista[i];
      if (!sp) return;
      const preparato = liv > 0 && preparati.includes(sp.id) ? '✓ ' : '';
      scriviCampo(form, lib, idx, [nomeCampo], preparato + spellName(sp), e);
    });
    if (lista.length > caselle.length) e.troppi.push((liv===0?'trucchetti':liv+'° livello') + ': ' + (lista.length - caselle.length) + ' non ci stanno');
  });
  // slot per livello
  const slot = slotsFor(c);
  const usati = c.slotsUsed || {};
  g.teste.forEach(h => {
    const tot = slot[h.livello-1] || 0;
    if (!tot) return;
    scriviCampo(form, lib, idx, [h.nome], tot, e);
    const rimasti = clamp(tot - (usati[h.livello]||0), 0, tot);
    const nomeRim = h.nome.replace(/slotstotal/i, m => m[0]==='S' ? 'SlotsRemaining' : 'slotsremaining');
    scriviCampo(form, lib, idx, [nomeRim], rimasti, e);
  });
}

/* ─── Pulizia delle sezioni a righe ───
   Attacchi, risorse, zaino e incantesimi sono elenchi: se il tuo modulo
   ha gia' dentro un altro personaggio (o lo riusi per il secondo della
   compagnia) le righe avanzate resterebbero li' sotto, mescolate alle
   nuove. Quelle sezioni le riscrive l'app per intero, quindi prima le
   svuota. Tutto il resto del modulo non viene toccato. */
function svuotaSezioniRipetute(form, lib, idx, campi, e){
  const scarto = { scritti:0, mancanti:[], rifiutati:[], troppi:[] };
  const vuota = (nomi) => {
    const nome = campoVero(idx, nomi); if (!nome) return;
    try {
      const f = form.getField(nome);
      if (typeof f.setText === 'function') f.setText('');
      else if (typeof f.uncheck === 'function') f.uncheck();
    } catch(err){}
  };
  for (let i=1;i<=6;i++){
    vuota([i===1 ? 'Wpn Name' : 'Wpn Name '+i, 'Arma '+i]);
    vuota(['Wpn'+i+' AtkBonus', 'Wpn'+i+' AtkBonus ', 'Wpn'+i+'AtkBonus']);
    vuota(['Wpn'+i+' Damage', 'Wpn'+i+' Damage ', 'Wpn'+i+'Damage']);
    vuota(['Limited Feat '+i]); vuota(['FeatTot '+i]); vuota(['FeatLeft '+i]);
  }
  for (let i=1;i<=40;i++){ vuota(['eq '+i, 'eq'+i]); vuota(['Peso'+i]); }
  vuota(['Equipment','Equipaggiamento']);
  const g = caselleIncantesimiPerLivello(campi);
  if (g){
    Object.keys(g.per).forEach(l => g.per[l].forEach(n => vuota([n])));
    g.teste.forEach(h => { vuota([h.nome]); vuota([h.nome.replace(/slotstotal/i, m => m[0]==='S' ? 'SlotsRemaining' : 'slotsremaining')]); });
  }
}

/* ─── Il giro completo ─── */
async function riempiSchedaCompilabile(charId, buffer){
  const c = charById(charId);
  if (!c) { toast('Personaggio non trovato'); return null; }
  const lib = await loadPdfLib();
  const doc = await lib.PDFDocument.load(buffer, { ignoreEncryption:true, updateMetadata:false });
  let form;
  try { form = doc.getForm(); } catch(err){ throw new Error('senza-campi'); }
  const campi = await readPdfFields(buffer);
  if (!campi.length) throw new Error('senza-campi');

  const idx = indiceNomi(form);
  const e = { scritti:0, mancanti:[], rifiutati:[], troppi:[] };
  svuotaSezioniRipetute(form, lib, idx, campi, e);
  riempiAnagrafica(form, lib, idx, c, e);
  riempiCaratteristiche(form, lib, idx, c, e);
  riempiCombattimento(form, lib, idx, c, e);
  riempiCompetenze(form, lib, idx, c, e);
  riempiStoria(form, lib, idx, c, e);
  riempiZaino(form, lib, idx, c, e);
  riempiMagia(form, lib, idx, c, e);
  riempiIncantesimi(form, lib, idx, c, campi, e);

  /* Il modulo resta compilabile: non si appiattisce niente, così la
     scheda la puoi ancora correggere a mano dopo. */
  try {
    const font = await doc.embedFont(lib.StandardFonts.Helvetica);
    form.updateFieldAppearances(font);
  } catch(err){ try { form.updateFieldAppearances(); } catch(e2){} }

  const bytes = await doc.save();
  return { bytes, esito: e, campi: campi.length };
}

/* ─── Interfaccia ─── */
let __riempiPer = null;
function apriRiempiScheda(charId){
  __riempiPer = charId;
  openModal({ render: riempiSchedaHTML });
}
function riempiSchedaHTML(){
  const c = charById(__riempiPer);
  const inner = `
    <p class="muted" style="margin-bottom:12px">
      Prendi la <b>tua</b> scheda compilabile — lo stesso PDF da cui l'app legge i personaggi —
      e ci scrivo dentro ${c ? '<b>'+escapeHtml(c.name||'il personaggio')+'</b>' : 'il personaggio'}:
      ogni dato finisce nella casella in cui la scheda lo tiene. Resta compilabile, così puoi ancora correggerla a mano.
    </p>
    <div class="card" style="margin-bottom:12px; border-color:var(--gold-dim)">
      <div class="muted" style="font-size:.76rem">
        Il modulo lo metti tu: la scheda ufficiale è materiale protetto e l'app non può distribuirla.
        Il file non lascia il telefono — resta qui e non viene caricato da nessuna parte.
      </div>
    </div>
    ${modelloPronto() ? `
      <div class="card" style="margin-bottom:12px">
        <div class="row-between"><span class="muted" style="font-size:.8rem">Modulo in uso</span>
          <b style="font-size:.82rem">${escapeHtml(__modelloScheda.nome)}</b></div>
        <div class="muted" style="font-size:.73rem; margin-top:4px">${__modelloCampi ? __modelloCampi + ' caselle riconosciute' : ''}</div>
        <button class="btn btn-gold btn-block btn-sm" style="margin-top:10px" onclick="riempiOra()">⤓ Riempi e scarica</button>
        <button class="btn btn-ghost btn-block btn-sm" style="margin-top:8px" onclick="scordaModello()">Usa un altro modulo</button>
      </div>` : `
      <label class="btn btn-primary btn-block" style="cursor:pointer">
        ⇪ Scegli la tua scheda compilabile
        <input type="file" accept="application/pdf,.pdf" style="display:none" onchange="riempiScegliFile(this)">
      </label>`}
    <div id="riempi-esito" style="margin-top:12px"></div>
    <button class="btn btn-ghost btn-block" style="margin-top:12px" onclick="closeModal()">Chiudi</button>`;
  return modalShell('🖊️ Riempi la tua scheda', inner);
}
function scordaModello(){ __modelloScheda = null; __modelloCampi = null; renderModalRoot(); }
function riempiScegliFile(input){
  const file = input.files && input.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = async () => {
    try {
      const buf = r.result;
      const campi = await readPdfFields(buf);
      if (!campi.length){
        toast('⚠️ Questo PDF non ha caselle da riempire: serve una scheda compilabile');
        return;
      }
      __modelloScheda = { nome: file.name, buffer: buf };
      __modelloCampi = campi.length;
      renderModalRoot();
      toast('✓ ' + campi.length + ' caselle riconosciute');
    } catch(err){
      console.error(err);
      toast('⚠️ Non riesco a leggere questo PDF');
    }
  };
  r.onerror = () => toast('⚠️ Impossibile leggere il file');
  r.readAsArrayBuffer(file);
}
async function riempiOra(){
  if (!modelloPronto()) return;
  const c = charById(__riempiPer);
  toast('🖊️ Riempio la scheda…');
  try {
    const out = await riempiSchedaCompilabile(__riempiPer, __modelloScheda.buffer);
    if (!out) return;
    const safe = ((c && c.name) || 'scheda').replace(/[^\p{L}\p{N} _-]/gu,'').trim().replace(/\s+/g,'-') || 'scheda';
    downloadBlob(new Blob([out.bytes], { type:'application/pdf' }), safe + '-compilata.pdf');
    const box = document.getElementById('riempi-esito');
    if (box){
      box.innerHTML = `<div class="card" style="border-color:var(--gold-dim)">
        <b style="font-size:.85rem">✓ ${out.esito.scritti} caselle riempite</b>
        ${out.esito.troppi.length ? `<div class="muted" style="font-size:.74rem; margin-top:6px">Non ci stanno tutti: ${escapeHtml(out.esito.troppi.join(' · '))}. Il resto è nella scheda dell'app.</div>` : ''}
        ${out.esito.rifiutati.length ? `<div class="muted" style="font-size:.74rem; margin-top:6px">${out.esito.rifiutati.length} caselle non si sono lasciate scrivere (sola lettura o formato fisso).</div>` : ''}
      </div>`;
    }
    toast('📄 Scheda compilata');
  } catch(err){
    console.error('Riempimento fallito', err);
    if (String(err && err.message) === 'senza-campi') toast('⚠️ Questo PDF non ha caselle da riempire');
    else toast('⚠️ Riempimento non riuscito');
  }
}
