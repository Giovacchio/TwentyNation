/* TwentyNation — il motore delle suppliche e degli incantesimi di sottoclasse
   ═══════════════════════════════════════════════════════════════════════
   Due cose che il regolamento tratta allo stesso modo e che l'app
   trattava come inesistenti:

   · gli incantesimi che arrivano dalla SOTTOCLASSE (dominio, circolo,
     giuramento, patrono) sono SEMPRE preparati e NON contano nel numero
     che puoi preparare. Non si aggiungono ai conosciuti: vivono in una
     lista a parte, così non li puoi togliere per sbaglio e non falsano
     il conteggio;
   · le SUPPLICHE del warlock sono scelte con dei prerequisiti, e ognuna
     fa qualcosa di preciso: dà un incantesimo a volontà, aggiunge una
     caratteristica ai danni, allunga una gittata.

   Quelle del Manuale del Giocatore NON stanno qui: le carichi tu con
   l'importazione e restano nel tuo account. */

/* ─── Incantesimi dalla sottoclasse ─────────────────────────────── */

/* La sottoclasse può portare incantesimi in tre modi: la tabella SRD,
   la scelta del terreno (Circolo della Terra), o quello che hai
   configurato tu su una sottoclasse tua. */
function spellSottoclasseDi(c){
  if (!c) return [];
  const trovata = sottoclasseConClasse(c);
  if (!trovata) return [];
  const sc = trovata.sc;
  const lv = trovata.livello;

  let tabella = null, etichetta = '';
  if (typeof SPELL_SOTTOCLASSE !== 'undefined' && SPELL_SOTTOCLASSE[sc.id]){
    tabella = SPELL_SOTTOCLASSE[sc.id].spells;
    etichetta = SPELL_SOTTOCLASSE[sc.id].etichetta;
  } else if (sc.id === 'land' && typeof CIRCOLO_TERRE !== 'undefined'){
    const t = CIRCOLO_TERRE[c.terrenoCircolo];
    if (t){ tabella = t.spells; etichetta = 'Circolo della Terra · ' + t.nome; }
  } else if (sc.meccaniche && sc.meccaniche.spells){
    tabella = sc.meccaniche.spells;
    etichetta = sc.name;
  }
  if (!tabella) return [];

  const fuori = [];
  Object.keys(tabella).map(Number).sort((a,b)=>a-b).forEach(soglia => {
    if (lv < soglia) return;
    (tabella[soglia] || []).forEach(id => {
      const sp = spellByRef({ id, source:'srd' });
      if (sp) fuori.push({ sp, da: etichetta, daLivello: soglia });
    });
  });
  return fuori;
}
/* Quale classe porta la sottoclasse, e a che livello sei IN QUELLA.
   Un chierico 3 / ladro 5 ha gli incantesimi di dominio da chierico 3,
   non da 8. E la sottoclasse puo' stare sulla SECONDA classe: cercarla
   solo nella prima lasciava fuori meta' dei multiclasse. */
function sottoclasseConClasse(c){
  if (!c || !c.subclassId) return null;
  const cl = (typeof classeDi === 'function') ? classeDi(c) : null;
  if (cl && typeof subclassesFor === 'function'){
    const sc = (subclassesFor(cl.id) || []).find(x => x.id === c.subclassId);
    if (sc) return { sc, classId: cl.id, livello: Number(c.level) || 1 };
  }
  /* la seconda classe del multiclasse */
  if (c.class2 && typeof classIdDaNome === 'function'){
    const id2 = classIdDaNome(c.class2);
    if (id2 && typeof subclassesFor === 'function'){
      const sc2 = (subclassesFor(id2) || []).find(x => x.id === c.subclassId)
        || (subclassesFor(id2) || []).find(x => x.id === c.subclassId2);
      if (sc2) return { sc: sc2, classId: id2, livello: Number(c.level2) || 1 };
    }
  }
  return null;
}
/* livelloNellaClasseDi: tolta. Il livello da warlock lo ricavano già
   perchePuoiNo() e supplicheSpettanti(), ognuna dove le serve. */
/* Il Circolo della Terra chiede quale terreno: senza, non dà niente. */
function serveTerreno(c){
  const t = sottoclasseConClasse(c);
  return !!(t && t.sc.id === 'land' && !c.terrenoCircolo);
}
function impostaTerreno(charId, chiave){
  const c = charById(charId); if (!c) return;
  c.terrenoCircolo = chiave || '';
  scheduleSave('characters', c);
  closeModal(); render();
  if (chiave && CIRCOLO_TERRE[chiave]) toast('🌿 ' + CIRCOLO_TERRE[chiave].nome);
}
function apriSceltaTerreno(charId){
  const c = charById(charId); if (!c) return;
  openModal({ render: () => modalShell('🌿 Il tuo terreno', `
    <p class="muted" style="font-size:.84rem; margin-bottom:12px">
      Il Circolo della Terra dà incantesimi diversi a seconda del terreno in cui ti sei formato.
      Si sceglie una volta, al 3° livello.
    </p>
    ${Object.keys(CIRCOLO_TERRE).map(k => {
      const t = CIRCOLO_TERRE[k];
      const primi = (t.spells[3]||[]).map(id => { const s = spellByRef({id,source:'srd'}); return s ? spellName(s) : id; });
      return `<button class="attack-row" style="width:100%; text-align:left; margin-bottom:6px; ${c.terrenoCircolo===k?'border-color:var(--gold)':''}"
              onclick="impostaTerreno('${c.id}','${k}')">
        <span class="attack-main">
          <span class="attack-name">${escapeHtml(t.nome)}${c.terrenoCircolo===k?' ✓':''}</span>
          <span class="muted" style="font-size:.73rem">Dal 3°: ${escapeHtml(primi.join(', '))}</span>
        </span>
      </button>`;
    }).join('')}
    <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="closeModal()">Chiudi</button>
  `) });
}

/* ─── Suppliche ──────────────────────────────────────────────────── */

/* Tutte quelle disponibili: SRD + quelle che hai caricato tu. */
function tutteLeSuppliche(){
  const srd = (typeof SUPPLICHE_SRD !== 'undefined' ? SUPPLICHE_SRD : []).map(s => ({...s, fonte:'srd'}));
  const mie = (state.suppliche || []).map(s => ({...s, fonte:'mia'}));
  const nomiMiei = new Set(mie.map(s => norm(s.nome || '')));
  const condivise = (state.sharedSuppliche || [])
    .filter(s => !nomiMiei.has(norm(s.nome || '')))
    .map(s => ({...s, fonte:'tavolo'}));
  return mie.concat(condivise, srd.filter(s => !nomiMiei.has(norm(s.nome))));
}
function supplicaById(id){ return tutteLeSuppliche().find(s => s.id === id) || null; }

/* Quelle che il personaggio ha scelto */
function supplicheDi(c){
  return ((c && c.suppliche) || []).map(supplicaById).filter(Boolean);
}
/* Quante gliene spettano, contando il livello da warlock */
function supplicheSpettanti(c){
  if (!c) return 0;
  const cl = (typeof classeDi === 'function') ? classeDi(c) : null;
  let lv = 0;
  if (cl && cl.id === 'warlock') lv = Number(c.level) || 0;
  if (c.class2 && typeof classIdDaNome === 'function' && classIdDaNome(c.class2) === 'warlock')
    lv = Number(c.level2) || 0;
  return quanteSuppliche(lv);
}
/* Il prerequisito è soddisfatto? Torna '' se sì, altrimenti il motivo. */
function perchePuoiNo(c, s){
  const req = s && s.req; if (!req) return '';
  const cl = (typeof classeDi === 'function') ? classeDi(c) : null;
  let lv = (cl && cl.id === 'warlock') ? (Number(c.level)||0) : 0;
  if (c.class2 && typeof classIdDaNome === 'function' && classIdDaNome(c.class2) === 'warlock')
    lv = Number(c.level2) || 0;
  if (req.livello && lv < req.livello) return 'Serve il ' + req.livello + '° livello da warlock';
  if (req.patto){
    /* si legge il dono direttamente dalla scheda: donoPatto() risponde
       solo se il warlock e' la PRIMA classe, e un multiclasse resterebbe
       tagliato fuori dalle sue stesse suppliche */
    if (c.pactBoon !== req.patto){
      const nomi = { chain:'Patto della Catena', blade:'Patto della Lama', tome:'Patto del Tomo' };
      return 'Serve il ' + (nomi[req.patto] || req.patto);
    }
  }
  if (req.trucchetto){
    const ce = (c.knownSpells||[]).some(k => k.id === req.trucchetto);
    if (!ce){
      const sp = spellByRef({ id:req.trucchetto, source:'srd' });
      return 'Devi conoscere ' + (sp ? spellName(sp) : req.trucchetto);
    }
  }
  return '';
}
function scegliSupplica(charId, id){
  const c = charById(charId); if (!c) return;
  c.suppliche = c.suppliche || [];
  const i = c.suppliche.indexOf(id);
  if (i >= 0){ c.suppliche.splice(i, 1); }
  else {
    const s = supplicaById(id); if (!s) return;
    const motivo = perchePuoiNo(c, s);
    if (motivo){ toast('⚠️ ' + motivo); return; }
    if (c.suppliche.length >= supplicheSpettanti(c)){
      toast('Ne hai già ' + c.suppliche.length + ': togline una prima');
      return;
    }
    c.suppliche.push(id);
  }
  scheduleSave('characters', c);
  renderModalRoot(); render();
}

/* ─── Cosa fanno, davvero ────────────────────────────────────────── */

/* Gli incantesimi che le suppliche ti regalano: entrano in scheda come
   lanciabili, con scritto da dove vengono e a che condizioni. */
function incantesimiDaSuppliche(c){
  const fuori = [];
  supplicheDi(c).forEach(s => {
    (s.effetti || []).forEach(e => {
      if (e.tipo !== 'incantesimo' && e.tipo !== 'trucchetto') return;
      const sp = spellByRef({ id: e.id, source:'srd' }) || spellByRef({ id: e.id, source:'custom' });
      if (!sp) return;
      fuori.push({ sp, da: s.nome, quando: e.quando || 'volonta',
        livello: e.livello || null, soloSuDiTe: !!e.soloSuDiTe });
    });
  });
  return fuori;
}
/* Le altre voci: danni, gittate, sensi, competenze, promemoria. */
function effettiSuppliche(c, tipi){
  const fuori = [];
  supplicheDi(c).forEach(s => {
    (s.effetti || []).forEach(e => {
      if (e.tipo === 'incantesimo' || e.tipo === 'trucchetto') return;
      if (tipi && !tipi.includes(e.tipo)) return;
      fuori.push({ ...e, da: s.nome });
    });
  });
  return fuori;
}
/* Le competenze regalate dalle suppliche, per la riga delle abilità. */
function competenzeDaSuppliche(c){
  const fuori = new Set();
  effettiSuppliche(c, ['competenza']).forEach(e => (e.abilita||[]).forEach(k => fuori.add(k)));
  return [...fuori];
}
/* Quanto una supplica cambia un attacco: «+3 (Carisma)» sul raggio occulto. */
function ritoccoAttacco(c, chiaveArma){
  const mod3 = (k) => Math.floor((((c.abilities||{})[k] || 10) - 10) / 2);
  const note = [];
  let danniIn = 0;
  effettiSuppliche(c, ['danno','gittata','raggi']).forEach(e => {
    if (e.a !== chiaveArma) return;
    if (e.tipo === 'danno'){
      let v = mod3(e.agg === 'car' ? 'cha' : e.agg);
      if (e.minimo != null) v = Math.max(e.minimo, v);
      danniIn += v;
      note.push(e.da + ': +' + v + (e.tipoDanno ? ' ' + e.tipoDanno : ' ai danni'));
    }
    if (e.tipo === 'gittata') note.push(e.da + ': gittata ' + e.metri + ' m');
    if (e.tipo === 'raggi')   note.push(e.da + ': spingi di ' + e.spinta + ' m');
  });
  return { danniIn, note };
}

/* ─── La schermata per sceglierle ────────────────────────────────── */
function apriSuppliche(charId){
  const c = charById(charId); if (!c) return;
  openModal({ render: () => supplicheHTML(charId) });
}
function supplicheHTML(charId){
  const c = charById(charId); if (!c) return '';
  const spettanti = supplicheSpettanti(c);
  const scelte = (c.suppliche || []);
  const tutte = tutteLeSuppliche();
  const q = norm(state.suppQ || '');
  const visibili = q ? tutte.filter(s => norm(s.nome).includes(q) || norm(s.en || '').includes(q)) : tutte;

  const riga = (s) => {
    const presa = scelte.includes(s.id);
    const motivo = perchePuoiNo(c, s);
    const marchio = s.fonte === 'srd' ? '' :
      (s.fonte === 'tavolo' ? ' <span class="badge">dal tavolo</span>' : ' <span class="badge">tua</span>');
    return `<button class="attack-row" style="width:100%; text-align:left; margin-bottom:6px; ${presa?'border-color:var(--gold)':''} ${motivo&&!presa?'opacity:.55':''}"
            onclick="scegliSupplica('${c.id}','${jsStr(s.id)}')">
      <span class="attack-main">
        <span class="attack-name">${escapeHtml(s.nome)}${presa?' ✓':''}${marchio}</span>
        <span class="muted" style="font-size:.74rem; display:block">${escapeHtml(s.testo || '')}</span>
        ${motivo && !presa ? `<span class="muted" style="font-size:.7rem; color:var(--warn)">${escapeHtml(motivo)}</span>` : ''}
      </span>
    </button>`;
  };

  return modalShell('🕯️ Suppliche occulte', `
    <div class="card" style="margin-bottom:10px">
      <div class="row-between"><span>Ne conosci</span><b>${scelte.length} / ${spettanti}</b></div>
      ${spettanti === 0 ? `<div class="muted" style="font-size:.74rem; margin-top:4px">Le suppliche arrivano dal 2° livello da warlock.</div>` : ''}
    </div>
    ${cercaLista('supp-cerca', state.suppQ || '', 'suppCerca', 'Cerca fra le ' + tutte.length + ' suppliche…')}
    ${visibili.length ? visibili.map(riga).join('')
      : `<div class="lista-vuota">Nessuna supplica con questo nome.</div>`}
    <div class="divider"><span class="flourish">❧</span><span>Ne mancano?</span></div>
    <p class="muted" style="font-size:.76rem">
      Qui ci sono quelle dell'SRD. Se il tuo manuale ne ha altre, caricale tu:
      restano nel tuo account.
    </p>
    <button class="btn btn-ghost btn-block" onclick="apriImportSuppliche('${c.id}')">⇪ Carica altre suppliche</button>
    <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="closeModal()">Chiudi</button>
  `);
}
function suppCerca(v){ state.suppQ = v; renderModalRoot(); }

/* ─── Come si vedono in scheda ───────────────────────────────────── */
function supplicheSchedaHTML(c){
  const spettanti = supplicheSpettanti(c);
  const scelte = supplicheDi(c);
  if (!spettanti && !scelte.length) return '';
  const extra = effettiSuppliche(c, ['danno','gittata','raggi','senso','competenza','nota']);
  return `
    <div class="divider"><span class="flourish">❧</span><span>Suppliche occulte</span></div>
    <button class="btn btn-ghost btn-block btn-sm" onclick="apriSuppliche('${c.id}')">
      🕯️ ${scelte.length} su ${spettanti} — tocca per scegliere
    </button>
    ${scelte.length ? `<div class="list-gap" style="margin-top:8px">
      ${scelte.map(s => `<div class="attack-row promemoria" style="display:block">
        <div class="attack-name" style="margin-bottom:2px">${escapeHtml(s.nome)}</div>
        <div class="muted" style="font-size:.76rem">${escapeHtml(s.testo || '')}</div>
      </div>`).join('')}
    </div>` : ''}
    ${extra.length ? `<div class="muted" style="font-size:.73rem; margin-top:8px">
      ${extra.map(e => '· ' + escapeHtml(
        e.tipo === 'danno'      ? e.da + ': +' + (e.agg==='cha'?'Carisma':e.agg) + (e.tipoDanno ? ' danni ' + e.tipoDanno : ' ai danni') :
        e.tipo === 'gittata'    ? e.da + ': gittata ' + e.metri + ' m' :
        e.tipo === 'raggi'      ? e.da + ': spingi di ' + e.spinta + ' m' :
        e.tipo === 'competenza' ? e.da + ': competenza in ' + (e.abilita||[]).map(k=>{const x=SKILLS.find(y=>y.key===k);return x?x.label:k;}).join(', ') :
        e.da + ': ' + (e.testo || ''))).join('<br>')}
    </div>` : ''}`;
}

/* Gli incantesimi che NON contano nel conteggio: dalla sottoclasse e
   dalle suppliche. Si vedono, si lanciano, ma stanno per conto loro. */
function spellRegalatiHTML(c){
  const daSub = spellSottoclasseDi(c);
  const daSupp = incantesimiDaSuppliche(c);
  if (!daSub.length && !daSupp.length && !serveTerreno(c)) return '';
  const QUANDO = { volonta:'a volontà', riposoLungo:'1 per riposo lungo', riposoBreve:'1 per riposo breve' };
  return `
    <div class="divider"><span class="flourish">❧</span><span>Sempre con te</span></div>
    ${serveTerreno(c) ? `<button class="btn btn-gold btn-block btn-sm" style="margin-bottom:8px" onclick="apriSceltaTerreno('${c.id}')">
      🌿 Scegli il terreno del tuo circolo — ti dà altri incantesimi
    </button>` : ''}
    ${daSub.length ? `
      <div class="muted" style="font-size:.72rem; margin-bottom:6px">
        Da <b>${escapeHtml(daSub[0].da)}</b>: sempre preparati, e non contano fra quelli che puoi preparare.
      </div>
      <div class="list-gap">
        ${daSub.map(x => `<button class="attack-row" style="width:100%; text-align:left"
            onclick="viewSpellDetail('${jsStr(x.sp.id)}','srd')">
          <span class="attack-main">
            <span class="attack-name">${escapeHtml(spellName(x.sp))}</span>
            <span class="muted" style="font-size:.72rem">${x.sp.level ? x.sp.level + '° livello' : 'Trucchetto'} · dal ${x.daLivello}°</span>
          </span>
        </button>`).join('')}
      </div>` : ''}
    ${daSupp.length ? `
      <div class="muted" style="font-size:.72rem; margin:10px 0 6px">Dalle tue suppliche:</div>
      <div class="list-gap">
        ${daSupp.map(x => `<button class="attack-row" style="width:100%; text-align:left"
            onclick="viewSpellDetail('${jsStr(x.sp.id)}','srd')">
          <span class="attack-main">
            <span class="attack-name">${escapeHtml(spellName(x.sp))}</span>
            <span class="muted" style="font-size:.72rem">${escapeHtml(x.da)} · ${QUANDO[x.quando]||x.quando}${x.soloSuDiTe?' · solo su di te':''}${x.livello?' · '+x.livello+'° liv.':''}</span>
          </span>
        </button>`).join('')}
      </div>` : ''}`;
}
