/* TwentyNation — effetti delle sottoclassi sulle regole
   Una sottoclasse non è solo testo: il Druido del Cerchio della Luna si
   trasforma in bestie più grosse, il Warlock col Patto della Catena può
   scegliere famigli che gli altri non hanno. Qui la scheda ricorda quale
   sottoclasse ha, e la sottoclasse può dichiarare cosa cambia.
   I valori li metti tu dal manuale che possiedi: l'app non li contiene. */

/* La classe e la sottoclasse della scheda, come oggetti veri. */
function classeDi(c){
  if (!c) return null;
  if (c.classId && typeof CLASS_BY_ID !== 'undefined' && CLASS_BY_ID[c.classId]) return CLASS_BY_ID[c.classId];
  // schede vecchie: si risale dal nome scritto a mano
  const n = norm(c.classField || '');
  if (!n || typeof CLASSES_FULL === 'undefined') return null;
  return CLASSES_FULL.find(x => norm(x.name) === n || norm(x.id) === n) || null;
}
function sottoclasseDi(c){
  if (!c || !c.subclassId) return null;
  const cl = classeDi(c); if (!cl) return null;
  return (subclassesFor(cl.id) || []).find(s => s.id === c.subclassId) || null;
}
/* Gli effetti dichiarati dalla sottoclasse, se ce ne sono. */
function meccanicheDi(c){
  const sc = sottoclasseDi(c);
  return (sc && sc.meccaniche) ? sc.meccaniche : null;
}


/* ─── Dono del Patto ───
   È un privilegio del warlock al 3° livello, non una sottoclasse: sta
   sulla scheda. Il Patto della Catena allarga le forme del famiglio.
   (SRD 5.1, licenza OGL 1.0a.) */
const DONI_PATTO = {
  chain: { nome:'Patto della Catena', desc:'Impari trova famiglio e lo lanci come rituale. Il famiglio può prendere anche forma di diavoletto, pseudodragone, quasit o folletto. Quando compi l\'azione di Attacco puoi rinunciare a un tuo attacco perché il famiglio ne faccia uno con la sua reazione.' },
  blade: { nome:'Patto della Lama', desc:'Evochi un\'arma da mischia con cui sei competente e che conta come magica.' },
  tome:  { nome:'Patto del Tomo',   desc:'Ricevi un libro con tre trucchetti a tua scelta da qualsiasi lista.' },
};
function donoPatto(c){
  const cl = classeDi(c);
  if (!cl || cl.id !== 'warlock') return null;
  if (!c.pactBoon) return null;
  return Object.assign({ id: c.pactBoon }, DONI_PATTO[c.pactBoon] || {});
}
function impostaDonoPatto(charId, id){
  const c = charById(charId); if (!c) return;
  c.pactBoon = id || '';
  scheduleSave('characters', c); render();
  if (id && DONI_PATTO[id]) toast('🔗 ' + DONI_PATTO[id].nome);
}
function donoPattoHTML(c){
  const cl = classeDi(c);
  if (!cl || cl.id !== 'warlock' || (c.level||1) < 3) return '';
  const d = donoPatto(c);
  return `<div class="field" style="margin-top:12px">
    <label>Dono del Patto</label>
    <select onchange="impostaDonoPatto('${c.id}', this.value)">
      <option value="">— nessuno —</option>
      ${Object.keys(DONI_PATTO).map(k=>`<option value="${k}" ${c.pactBoon===k?'selected':''}>${escapeHtml(DONI_PATTO[k].nome)}</option>`).join('')}
    </select>
    ${d ? `<div class="muted" style="font-size:.73rem; margin-top:6px">${escapeHtml(d.desc)}</div>` : ''}
  </div>`;
}

/* ─── Forma selvatica ───
   Regola di serie del druido; una sottoclasse può alzare il grado
   sfida per livello e togliere i divieti di volo e nuoto. */
function limiteFormaBase(level){
  if (level >= 8) return { cr: 1, note: 'Fino a GS 1, con qualsiasi velocità.' };
  if (level >= 4) return { cr: 0.5, note: 'Fino a GS 1/2, senza velocità di volo.' };
  return { cr: 0.25, note: 'Fino a GS 1/4, senza velocità di volo né di nuoto.' };
}
function crInParole(cr){
  if (cr >= 1) return 'GS ' + cr;
  if (cr === 0.5) return 'GS 1/2';
  if (cr === 0.25) return 'GS 1/4';
  return 'GS ' + cr;
}
/* Prende il personaggio (non solo il livello): tiene conto della sottoclasse. */
function limiteForma(c){
  const lv = (c && c.level) || 1;
  const base = limiteFormaBase(lv);
  const m = meccanicheDi(c);
  const f = m && m.forma;
  if (!f) return base;

  let cr = base.cr;
  if (Array.isArray(f.gsPerLivello) && f.gsPerLivello.length){
    // [[livello, gs], …]: vale la riga più alta raggiunta
    const righe = f.gsPerLivello.slice().sort((a,b) => a[0] - b[0]);
    righe.forEach(r => { if (lv >= Number(r[0])) cr = Number(r[1]); });
  }
  // «grado sfida pari al livello diviso N, arrotondato per difetto»,
  // dal livello indicato in poi: vale se dà un risultato migliore.
  if (f.divisore && lv >= Number(f.divisoreDa || 1)){
    const calcolato = Math.floor(lv / Number(f.divisore));
    if (calcolato > cr) cr = calcolato;
  }
  const nuoto = f.nuotoDa != null ? lv >= Number(f.nuotoDa) : lv >= 4;
  const volo  = f.voloDa  != null ? lv >= Number(f.voloDa)  : lv >= 8;
  const pezzi = ['Fino a ' + crInParole(cr)];
  if (volo && nuoto) pezzi.push('con qualsiasi velocità');
  else if (nuoto) pezzi.push('senza velocità di volo');
  else pezzi.push('senza velocità di volo né di nuoto');
  const sc = sottoclasseDi(c);
  return { cr, nuoto, volo, note: pezzi.join(', ') + '.', da: sc ? sc.name : '' };
}

/* ─── Famigli ───
   Di serie sono le creature marcate come famiglio nel bestiario; una
   sottoclasse può aggiungerne altre o allargare il grado sfida. */
function famigliDi(c){
  const m = meccanicheDi(c);
  const f = m && m.famigli;
  let extra = (f && Array.isArray(f.extra)) ? f.extra.filter(Boolean) : [];
  let daPatto = '';
  if (c && c.pactBoon === 'chain'){
    const delPatto = (typeof SRD_MONSTERS !== 'undefined' ? SRD_MONSTERS : []).filter(x => x.pf).map(x => x.id);
    extra = [...new Set(extra.concat(delPatto))];
    daPatto = DONI_PATTO.chain.nome;
  }
  const daSotto = (f && (f.extra || f.gsMax != null || f.qualsiasiBestia)) ? (sottoclasseDi(c)||{}).name || '' : '';
  return { extra, gsMax: f && f.gsMax != null ? Number(f.gsMax) : null,
           qualsiasiBestia: !!(f && f.qualsiasiBestia),
           da: [daPatto, daSotto].filter(Boolean).join(' e ') };
}


/* Azioni che la sottoclasse aggiunge al turno: le scrivi tu dal tuo
   manuale, l'app le mostra dove servono. */
function azioniDi(c){
  const m = meccanicheDi(c);
  const l = (m && Array.isArray(m.azioni)) ? m.azioni : [];
  const f = m && m.forma;
  const fuori = l.slice();
  if (f && f.azioneBonus){
    const sc = sottoclasseDi(c);
    fuori.push({ quando:'bonus', nome:'Forma selvatica', testo:'Ti trasformi con un\'azione bonus' + (sc?' ('+sc.name+')':'') + '.' });
  }
  return fuori;
}

/* ─── Proposta automatica leggendo il testo del privilegio ───
   Non inventa niente: cerca i numeri dentro il testo che hai importato
   tu, e te li propone da confermare. */
function proponiMeccaniche(voce){
  if (!voce || voce.kind !== 'subclass') return null;
  const pezzi = [];
  Object.keys(voce.features || {}).forEach(lv => {
    (voce.features[lv] || []).forEach(f => pezzi.push([Number(lv), String(f[0]||''), String(f[1]||'')]));
  });
  if (!pezzi.length) return null;
  const proposta = {};

  // Forma selvatica: righe tipo «Level 6: CR 2» o «6° livello: GS 2»
  const gs = [];
  pezzi.forEach(([lv, nome, testo]) => {
    const t = (nome + ' ' + testo);
    if (!/wild ?shape|forma selvatica/i.test(t)) return;
    const rx = /(?:cr|gs|challenge rating|grado sfida)\s*:?\s*(\d+(?:\/\d+)?|\d+(?:[.,]\d+)?)/gi;
    let m;
    while ((m = rx.exec(t))){
      let v = m[1].includes('/') ? (Number(m[1].split('/')[0]) / Number(m[1].split('/')[1])) : Number(m[1].replace(',','.'));
      if (Number.isFinite(v) && v <= 10) gs.push([lv, v]);
    }
    if (/volo|fly|flying/i.test(t)) proposta.voloDa = lv;
    if (/nuoto|swim/i.test(t)) proposta.nuotoDa = lv;
    if (/azione bonus|bonus action/i.test(t)) proposta.azioneBonus = true;
  });
  if (gs.length) proposta.gsPerLivello = gs;

  // Famigli: creature nominate accanto a «famiglio»
  const nomiFam = [];
  pezzi.forEach(([lv, nome, testo]) => {
    const t = (nome + ' ' + testo);
    if (!/famiglio|familiar|patto della catena|pact of the chain/i.test(t)) return;
    (typeof SRD_MONSTERS !== 'undefined' ? SRD_MONSTERS : []).forEach(mo => {
      const a = norm(mo.it || ''), b = norm(mo.n || '');
      if ((a && norm(t).includes(a)) || (b && norm(t).includes(b))) nomiFam.push(mo.id);
    });
  });
  const fam = [...new Set(nomiFam)];

  const out = {};
  if (Object.keys(proposta).length) out.forma = proposta;
  if (fam.length) out.famigli = { extra: fam };
  return Object.keys(out).length ? out : null;
}

/* ─── L'editor ─── */
let meccDraft = null, meccHbId = null;

function openMeccaniche(hbId){
  const h = (state.homebrew || []).find(x => x.id === hbId);
  if (!h){ toast('Non trovo questa voce'); return; }
  meccHbId = hbId;
  meccDraft = JSON.parse(JSON.stringify(h.meccaniche || {}));
  openModal({ render: meccanicheHTML });
}
/* `ridisegna` sta a false quando la modifica arriva da un campo di testo:
   ricostruire il modale a ogni lettera faceva perdere il fuoco e si
   riusciva a scrivere un carattere per volta. */
function meccSet(percorso, valore, ridisegna){
  const p = percorso.split('.');
  let o = meccDraft;
  for (let i = 0; i < p.length - 1; i++){ o[p[i]] = o[p[i]] || {}; o = o[p[i]]; }
  const ultimo = p[p.length-1];
  if (valore === '' || valore == null) delete o[ultimo]; else o[ultimo] = valore;
  if (ridisegna) renderModalRoot();
}
/* «1/2» si scrive un carattere per volta: allo stato intermedio «1/»
   il vecchio calcolo dava Infinity, che poi veniva salvato come 0. */
function meccGsDaTesto(v, precedente){
  const t = String(v==null?'':v).trim().replace(',', '.');
  if (!t) return precedente;
  const fr = /^(\d+)\s*\/\s*(\d+)$/.exec(t);
  if (fr){
    const a = Number(fr[1]), b = Number(fr[2]);
    return b ? a / b : precedente;
  }
  if (/\/$/.test(t)) return precedente;      // sta ancora scrivendo
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : precedente;
}
function meccRigaGs(i, campo, v){
  meccDraft.forma = meccDraft.forma || {};
  meccDraft.forma.gsPerLivello = meccDraft.forma.gsPerLivello || [];
  const r = meccDraft.forma.gsPerLivello[i] || [1, 0.25];
  r[campo] = campo === 0 ? (parseInt(v)||1) : meccGsDaTesto(v, r[1]);
  meccDraft.forma.gsPerLivello[i] = r;
}
function meccAggiungiGs(){
  meccDraft.forma = meccDraft.forma || {};
  meccDraft.forma.gsPerLivello = (meccDraft.forma.gsPerLivello || []).concat([[1, 0.25]]);
  renderModalRoot();
}
function meccTogliGs(i){
  if (!meccDraft.forma || !meccDraft.forma.gsPerLivello) return;
  meccDraft.forma.gsPerLivello.splice(i,1);
  if (!meccDraft.forma.gsPerLivello.length) delete meccDraft.forma.gsPerLivello;
  renderModalRoot();
}
function meccAggiungiAzione(){
  meccDraft.azioni = (meccDraft.azioni || []).concat([{ nome:'', quando:'bonus', testo:'' }]);
  renderModalRoot();
}
function meccAzione(i, campo, v, ridisegna){
  meccDraft.azioni = meccDraft.azioni || [];
  meccDraft.azioni[i] = Object.assign({ quando:'bonus' }, meccDraft.azioni[i], { [campo]: v });
  if (ridisegna) renderModalRoot();
}
function meccTogliAzione(i){
  (meccDraft.azioni || []).splice(i,1);
  if (meccDraft.azioni && !meccDraft.azioni.length) delete meccDraft.azioni;
  renderModalRoot();
}
function meccToggleFam(id){
  meccDraft.famigli = meccDraft.famigli || {};
  const l = meccDraft.famigli.extra || [];
  meccDraft.famigli.extra = l.includes(id) ? l.filter(x=>x!==id) : l.concat([id]);
  if (!meccDraft.famigli.extra.length) delete meccDraft.famigli.extra;
  renderModalRoot();
}
function meccanicheHTML(){
  const d = meccDraft || {};
  const f = d.forma || {};
  const fam = d.famigli || {};
  const righe = f.gsPerLivello || [];
  const scelti = fam.extra || [];
  const bestie = (typeof SRD_MONSTERS !== 'undefined' ? SRD_MONSTERS : [])
    .filter(m => crValue(m.cr) <= 1)
    .sort((a,b)=> monsterName(a).localeCompare(monsterName(b),'it'));

  const inner = `
    <p class="muted" style="margin-bottom:14px">
      Qui dici all'app <b>cosa cambia</b> questa sottoclasse nelle regole, non cosa dice il manuale.
      I numeri li prendi dal tuo manuale: lascia vuoto quello che non serve.
    </p>

    <div class="divider"><span class="flourish">❧</span><span>Forma selvatica</span></div>
    <p class="muted" style="font-size:.76rem; margin-bottom:8px">Il grado sfida massimo delle bestie in cui puoi trasformarti, per livello. Di serie: GS 1/4 dal 2°, 1/2 dal 4°, 1 dall'8°.</p>
    ${righe.map((r,i)=>`<div class="form-row" style="margin-bottom:6px">
      <div class="field"><label>Dal livello</label><input inputmode="numeric" value="${attr(r[0])}" oninput="meccRigaGs(${i},0,this.value)"></div>
      <div class="field"><label>GS massimo</label><input value="${attr(crInParole(r[1]).replace('GS ',''))}" placeholder="1 · 1/2 · 1/4" oninput="meccRigaGs(${i},1,this.value)"></div>
      <button class="btn-icon" style="align-self:end; margin-bottom:4px" onclick="meccTogliGs(${i})">✕</button>
    </div>`).join('')}
    <button class="btn btn-ghost btn-block btn-sm" onclick="meccAggiungiGs()">＋ Aggiungi una riga</button>
    <div class="form-row" style="margin-top:10px">
      <div class="field"><label>Oppure: GS = livello ÷</label><input inputmode="numeric" value="${attr(f.divisore==null?'':f.divisore)}" placeholder="3" oninput="meccSet('forma.divisore', this.value===''?'':parseInt(this.value)||0, false)"></div>
      <div class="field"><label>…dal livello</label><input inputmode="numeric" value="${attr(f.divisoreDa==null?'':f.divisoreDa)}" placeholder="6" oninput="meccSet('forma.divisoreDa', this.value===''?'':parseInt(this.value)||0, false)"></div>
    </div>
    <button class="switch-row" style="margin-top:6px" onclick="meccSet('forma.azioneBonus', ${f.azioneBonus?"''":'true'}, true)">
      <div class="track"><div class="knob" style="${f.azioneBonus?'transform:translateX(21px)':''}"></div></div>
      <div style="flex:1; text-align:left; font-family:var(--font-ui)">
        <b style="font-size:.84rem">Trasformazione come azione bonus</b>
        <div class="muted" style="font-size:.73rem; font-weight:600">Compare fra le azioni bonus nel tuo turno.</div>
      </div>
    </button>
    <div class="form-row" style="margin-top:10px">
      <div class="field"><label>Nuoto dal livello</label><input inputmode="numeric" value="${attr(f.nuotoDa==null?'':f.nuotoDa)}" placeholder="4" oninput="meccSet('forma.nuotoDa', this.value===''?'':parseInt(this.value)||0, false)"></div>
      <div class="field"><label>Volo dal livello</label><input inputmode="numeric" value="${attr(f.voloDa==null?'':f.voloDa)}" placeholder="8" oninput="meccSet('forma.voloDa', this.value===''?'':parseInt(this.value)||0, false)"></div>
    </div>

    <div class="divider"><span class="flourish">❧</span><span>Famigli</span></div>
    <p class="muted" style="font-size:.76rem; margin-bottom:8px">Creature che questa sottoclasse ti lascia scegliere <b>oltre</b> a quelle normali.</p>
    ${scelti.length ? `<div class="chip-row" style="margin-bottom:8px">${scelti.map(id=>{
      const m = MONSTER_BY_ID[id];
      return `<button class="chip active" onclick="meccToggleFam('${jsStr(id)}')">${escapeHtml(m?monsterName(m):id)} ✕</button>`;
    }).join('')}</div>` : ''}
    <div class="field">
      <label>Aggiungi una creatura</label>
      <select onchange="if(this.value){meccToggleFam(this.value); this.value='';}">
        <option value="">— scegli —</option>
        ${bestie.filter(m=>!scelti.includes(m.id)).map(m=>`<option value="${attr(m.id)}">${escapeHtml(monsterName(m))} (GS ${escapeHtml(m.cr)})</option>`).join('')}
      </select>
    </div>

    <div class="divider"><span class="flourish">❧</span><span>Azioni in più</span></div>
    <p class="muted" style="font-size:.76rem; margin-bottom:8px">Cose che questa sottoclasse ti fa fare nel turno. Compaiono in «Il tuo turno» sotto la voce giusta.</p>
    ${(d.azioni||[]).map((a,i)=>`<div class="card" style="margin-bottom:8px">
      <div class="form-row">
        <div class="field"><label>Nome</label><input value="${attr(a.nome||'')}" oninput="meccAzione(${i},'nome',this.value,false)"></div>
        <div class="field"><label>Quando</label>
          <select onchange="meccAzione(${i},'quando',this.value,true)">
            ${['azione','bonus','reazione'].map(q=>`<option value="${q}" ${a.quando===q?'selected':''}>${q==='bonus'?'Azione bonus':q==='reazione'?'Reazione':'Azione'}</option>`).join('')}
          </select></div>
      </div>
      <div class="field"><label>In una riga</label><input value="${attr(a.testo||'')}" placeholder="Es. spendi uno slot per curarti 1d8 per livello" oninput="meccAzione(${i},'testo',this.value,false)"></div>
      <button class="btn btn-ghost btn-block btn-sm" onclick="meccTogliAzione(${i})">Togli</button>
    </div>`).join('')}
    <button class="btn btn-ghost btn-block btn-sm" onclick="meccAggiungiAzione()">＋ Aggiungi un'azione</button>

    <div class="btn-row" style="margin-top:16px">
      <button class="btn btn-ghost" onclick="closeModal()">Annulla</button>
      <button class="btn btn-primary" onclick="salvaMeccaniche()">Salva</button>
    </div>
    <div class="spell-source-note">Questi effetti valgono per i personaggi che hanno questa sottoclasse. Il testo dei privilegi resta quello che hai importato tu.</div>`;
  return modalShell('⚙️ Effetti sul gioco', inner);
}
function salvaMeccaniche(){
  const h = (state.homebrew || []).find(x => x.id === meccHbId);
  if (!h){ closeModal(); return; }
  const pulito = JSON.parse(JSON.stringify(meccDraft || {}));
  if (pulito.forma && !Object.keys(pulito.forma).length) delete pulito.forma;
  if (pulito.famigli && !Object.keys(pulito.famigli).length) delete pulito.famigli;
  if (Array.isArray(pulito.azioni)){
    pulito.azioni = pulito.azioni.filter(a => a && String(a.nome||'').trim());
    if (!pulito.azioni.length) delete pulito.azioni;
  }
  if (Object.keys(pulito).length) h.meccaniche = pulito; else delete h.meccaniche;
  h.updatedAt = Date.now();
  saveLocal();
  if (typeof fsSet === 'function') fsSet('homebrew', h);
  meccDraft = null; meccHbId = null;
  closeModal(); render();
  toast('⚙️ Effetti salvati');
}
/* Riassunto in una riga, per l'elenco delle tue aggiunte. */
function riassuntoMeccaniche(h){
  const m = h && h.meccaniche; if (!m) return '';
  const p = [];
  if (m.forma && m.forma.gsPerLivello && m.forma.gsPerLivello.length){
    const max = m.forma.gsPerLivello.reduce((a,r)=>Math.max(a, Number(r[1])||0), 0);
    p.push('forma fino a ' + crInParole(max));
  }
  if (m.forma && m.forma.divisore) p.push('forma GS = liv ÷ ' + m.forma.divisore);
  if (m.forma && m.forma.azioneBonus) p.push('forma come bonus');
  if (m.famigli && m.famigli.extra && m.famigli.extra.length) p.push(m.famigli.extra.length + ' famigli in più');
  if (m.azioni && m.azioni.length) p.push(m.azioni.length + (m.azioni.length===1?' azione in più':' azioni in più'));
  return p.join(' · ');
}
