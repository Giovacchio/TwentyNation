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
  const extra = (f && Array.isArray(f.extra)) ? f.extra.filter(Boolean) : [];
  return { extra, gsMax: f && f.gsMax != null ? Number(f.gsMax) : null,
           qualsiasiBestia: !!(f && f.qualsiasiBestia),
           da: (extra.length || (f && (f.gsMax != null || f.qualsiasiBestia))) ? (sottoclasseDi(c)||{}).name || '' : '' };
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
function meccSet(percorso, valore){
  const p = percorso.split('.');
  let o = meccDraft;
  for (let i = 0; i < p.length - 1; i++){ o[p[i]] = o[p[i]] || {}; o = o[p[i]]; }
  const ultimo = p[p.length-1];
  if (valore === '' || valore == null) delete o[ultimo]; else o[ultimo] = valore;
  renderModalRoot();
}
function meccRigaGs(i, campo, v){
  meccDraft.forma = meccDraft.forma || {};
  meccDraft.forma.gsPerLivello = meccDraft.forma.gsPerLivello || [];
  const r = meccDraft.forma.gsPerLivello[i] || [1, 0.25];
  r[campo] = campo === 0 ? (parseInt(v)||1) : (String(v).includes('/') ? Number(v.split('/')[0])/Number(v.split('/')[1]) : Number(v)||0);
  meccDraft.forma.gsPerLivello[i] = r;
  renderModalRoot();
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
      <div class="field"><label>Nuoto dal livello</label><input inputmode="numeric" value="${attr(f.nuotoDa==null?'':f.nuotoDa)}" placeholder="4" oninput="meccSet('forma.nuotoDa', this.value===''?'':parseInt(this.value)||0)"></div>
      <div class="field"><label>Volo dal livello</label><input inputmode="numeric" value="${attr(f.voloDa==null?'':f.voloDa)}" placeholder="8" oninput="meccSet('forma.voloDa', this.value===''?'':parseInt(this.value)||0)"></div>
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
  if (m.famigli && m.famigli.extra && m.famigli.extra.length) p.push(m.famigli.extra.length + ' famigli in più');
  return p.join(' · ');
}
