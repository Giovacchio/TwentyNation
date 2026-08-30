/* ═══════════════════════════════════════════════════════════════
   COSTRUTTORE DI INCONTRI — v7.7
   Il bestiario è diventato un archivio da migliaia di creature. Questo
   è il pezzo che lo trasforma in uno strumento: scegli chi c'è dall'
   altra parte e l'app dice se lo scontro regge, e quanti punti
   esperienza vale.

   I numeri qui dentro sono tabelle di regole — punti esperienza per
   grado sfida, soglie per livello, moltiplicatore per numero di
   nemici. Sono meccanica, non testo di nessun manuale: nessuna
   descrizione, nessun nome, nessun brano. Se al tuo tavolo usate
   soglie diverse, i conti si leggono tutti in chiaro qui sotto.
   ═══════════════════════════════════════════════════════════════ */

/* Punti esperienza che vale una creatura, per grado sfida. */
const PX_PER_GS = {
  '0':10, '1/8':25, '1/4':50, '1/2':100,
  '1':200, '2':450, '3':700, '4':1100, '5':1800, '6':2300, '7':2900, '8':3900,
  '9':5000, '10':5900, '11':7200, '12':8400, '13':10000, '14':11500, '15':13000,
  '16':15000, '17':18000, '18':20000, '19':22000, '20':25000, '21':33000,
  '22':41000, '23':50000, '24':62000, '25':75000, '26':90000, '27':105000,
  '28':120000, '29':135000, '30':155000,
};
/* Soglie per personaggio, per livello: facile / medio / difficile / mortale. */
const SOGLIE_PX = [
  [25,50,75,100],[50,100,150,200],[75,150,225,400],[125,250,375,500],
  [250,500,750,1100],[300,600,900,1400],[350,700,1100,1700],[450,900,1400,2100],
  [550,1100,1600,2400],[600,1200,1900,2800],[800,1600,2400,3600],[1000,2000,3000,4500],
  [1100,2200,3400,5100],[1250,2500,3800,5700],[1400,2800,4300,6400],[1600,3200,4800,7200],
  [2000,3900,5900,8800],[2100,4200,6300,9500],[2400,4900,7300,10900],[2800,5700,8500,12700],
];
const GRADI = ['facile','medio','difficile','mortale'];

/* Più nemici sono, più lo scontro pesa di quanto dica la somma: la
   scala vale per un gruppo da tre a cinque, e si sposta di un gradino
   per i gruppi più piccoli o più numerosi. */
function moltiplicatoreIncontro(quanti, quantiPg){
  const scala = [1, 1.5, 2, 2.5, 3, 4];
  let i = quanti <= 1 ? 0 : quanti === 2 ? 1 : quanti <= 6 ? 2 : quanti <= 10 ? 3 : quanti <= 14 ? 4 : 5;
  if (quantiPg && quantiPg < 3) i = Math.min(scala.length - 1, i + 1);
  if (quantiPg && quantiPg >= 6) i = Math.max(0, i - 1);
  return scala[i];
}
function pxDiGs(gs){
  const k = String(gs == null ? '' : gs).trim();
  if (PX_PER_GS[k] != null) return PX_PER_GS[k];
  const n = (typeof crValue === 'function') ? crValue(k) : parseFloat(k);
  if (!isFinite(n)) return 0;
  return PX_PER_GS[String(Math.round(n))] || 0;
}
/* Il grado sfida di una creatura, comunque sia entrata nell'app. */
function gsDiCreatura(x){
  if (!x) return '';
  if (x.cr != null) return String(x.cr);                    // bestiario SRD
  const m = /GS\s+([0-9/]+)/i.exec(x.type || '');           // PNG e mostri importati
  return m ? m[1] : '';
}
function nomeDiCreatura(x){
  return (typeof monsterName === 'function' && x.cr != null) ? monsterName(x) : (x.name || x.it || x.en || '—');
}

/* ─── Lo stato della schermata ─── */
let inc = null;
function openIncontri(){
  inc = {
    q: '',
    scelti: [],                                   // { id, nome, gs, fonte, quanti }
    party: (state.characters || []).map(c => c.id),
  };
  listaAzzera('inc-mostri');
  openModal({ render: incontriHTML });
}
function incCerca(v){ inc.q = v; listaAzzera('inc-mostri'); renderModalRoot(); }
function incParty(id){
  const i = inc.party.indexOf(id);
  if (i >= 0) inc.party.splice(i, 1); else inc.party.push(id);
  renderModalRoot();
}
function incAggiungi(chiave){
  const [fonte, id] = String(chiave).split('|');
  const gia = inc.scelti.find(x => x.id === id && x.fonte === fonte);
  if (gia){ gia.quanti++; renderModalRoot(); return; }
  const x = incTrova(fonte, id);
  if (!x) return;
  inc.scelti.push({ id, fonte, nome: nomeDiCreatura(x), gs: gsDiCreatura(x), quanti: 1 });
  renderModalRoot();
}
function incTogli(i, quanti){
  const s = inc.scelti[i]; if (!s) return;
  s.quanti += quanti;
  if (s.quanti <= 0) inc.scelti.splice(i, 1);
  renderModalRoot();
}
function incTrova(fonte, id){
  if (fonte === 'srd') return (typeof MONSTER_BY_ID !== 'undefined') ? MONSTER_BY_ID[id] : null;
  if (fonte === 'mio') return (state.npcs || []).find(n => n.id === id);
  return (state.sharedNpcs || []).find(n => n.id === id);
}

/* ─── Il conto ─── */
function incContoIncontro(){
  const pgs = (state.characters || []).filter(c => inc.party.includes(c.id));
  const quantiPg = pgs.length;
  const px = inc.scelti.reduce((n, s) => n + pxDiGs(s.gs) * s.quanti, 0);
  const quanti = inc.scelti.reduce((n, s) => n + s.quanti, 0);
  const molt = moltiplicatoreIncontro(quanti, quantiPg);
  const pesato = Math.round(px * molt);
  const soglie = [0,1,2,3].map(k => pgs.reduce((n, c) =>
    n + (SOGLIE_PX[clamp(Number(c.level)||1, 1, 20) - 1] || [0,0,0,0])[k], 0));
  let grado = -1;
  for (let k = 0; k < 4; k++) if (pesato >= soglie[k]) grado = k;
  return { px, pesato, quanti, molt, soglie, grado, quantiPg,
           pxAtesta: quantiPg ? Math.floor(px / quantiPg) : 0 };
}

function incontriHTML(){
  const c = incContoIncontro();
  const nq = norm((inc.q || '').trim());
  /* Si cerca in una volta sola fra le creature di serie, le tue e
     quelle del tavolo: al momento di preparare uno scontro non
     interessa da dove vengono. */
  const catalogo = []
    .concat((typeof SRD_MONSTERS !== 'undefined' ? SRD_MONSTERS : []).map(m => ({ x:m, fonte:'srd', id:m.id })))
    .concat((state.npcs || []).map(n => ({ x:n, fonte:'mio', id:n.id })))
    .concat((state.sharedNpcs || []).map(n => ({ x:n, fonte:'tavolo', id:n.id })));
  const trovati = nq
    ? catalogo.filter(v => norm(nomeDiCreatura(v.x)).includes(nq) || norm(v.x.type || v.x.t || '').includes(nq))
    : [];

  const rigaTrovato = (v) => {
    const gs = gsDiCreatura(v.x), px = pxDiGs(gs);
    return `<button class="attack-row" style="width:100%; text-align:left" onclick="incAggiungi('${jsStr(v.fonte + '|' + v.id)}')">
      <span class="attack-main">
        <span class="attack-name">${escapeHtml(nomeDiCreatura(v.x))}${v.fonte==='tavolo'?' ⚔️':(v.fonte==='mio'?' ✦':'')}</span>
        <span class="muted" style="font-size:.72rem; display:block">${gs?('GS '+escapeHtml(gs)+' · '+px+' PX'):'senza grado sfida'}</span>
      </span>
      <span class="attack-btn" style="pointer-events:none">＋</span>
    </button>`;
  };

  const colore = ['var(--good)','var(--gold)','var(--warn)','var(--garnet-bright)'][c.grado] || 'var(--ink-faint)';
  const etichetta = c.grado < 0 ? 'una passeggiata' : GRADI[c.grado];

  const inner = `
    <p class="muted" style="margin-bottom:12px">
      Scegli chi c'è dall'altra parte: l'app dice quanto pesa lo scontro per il tuo gruppo e quanti punti esperienza vale.
    </p>

    <div class="card" style="margin-bottom:12px; border-color:${colore}">
      <div class="row-between" style="align-items:flex-start">
        <div>
          <div class="card-title" style="margin:0; color:${colore}; text-transform:capitalize">${escapeHtml(etichetta)}</div>
          <div class="muted" style="font-size:.75rem; margin-top:3px">
            ${c.quanti ? c.quanti + (c.quanti===1?' creatura':' creature') + ' · ' + c.quantiPg + (c.quantiPg===1?' personaggio':' personaggi') : 'Non hai ancora scelto nessuno'}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--font-display); font-size:1.3rem; color:var(--gold)">${c.px.toLocaleString('it-IT')}</div>
          <div class="muted" style="font-size:.7rem">PX veri</div>
        </div>
      </div>
      ${c.quanti ? `
        <div class="muted" style="font-size:.74rem; margin-top:10px; line-height:1.6">
          Con ${c.quanti} nemici il peso conta ×${c.molt}: <b>${c.pesato.toLocaleString('it-IT')}</b> contro le soglie del gruppo.<br>
          ${GRADI.map((g,k)=>`<span style="${c.grado===k?'color:'+colore+'; font-weight:700':''}">${g} ${c.soglie[k].toLocaleString('it-IT')}</span>`).join(' · ')}
        </div>
        <div class="row-between" style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--line)">
          <span class="muted" style="font-size:.78rem">A testa, se vincono</span>
          <b style="color:var(--gold)">${c.pxAtesta.toLocaleString('it-IT')} PX</b>
        </div>` : ''}
    </div>

    ${(state.characters||[]).length ? `
      <div class="divider"><span class="flourish">❧</span><span>Chi combatte</span></div>
      <div class="chip-row" style="margin-bottom:12px">
        ${(state.characters||[]).map(p=>`<button class="chip ${inc.party.includes(p.id)?'active':''}" onclick="incParty('${jsStr(p.id)}')">${escapeHtml(p.name||'—')} · ${p.level||1}</button>`).join('')}
      </div>` : `<div class="card" style="margin-bottom:12px; border-color:var(--warn)">
        <div class="muted" style="font-size:.8rem">Senza personaggi non c'è un metro per giudicare lo scontro: creane almeno uno.</div>
      </div>`}

    ${inc.scelti.length ? `<div class="divider"><span class="flourish">❧</span><span>Dall'altra parte</span></div>
      <div class="list-gap" style="margin-bottom:12px">${inc.scelti.map((s,i)=>`
        <div class="attack-row">
          <div class="attack-main" style="pointer-events:none">
            <div class="attack-name">${escapeHtml(s.nome)}${s.quanti>1?' ×'+s.quanti:''}</div>
            <div class="muted" style="font-size:.72rem">${s.gs?('GS '+escapeHtml(s.gs)+' · '+(pxDiGs(s.gs)*s.quanti).toLocaleString('it-IT')+' PX'):'senza grado sfida'}</div>
          </div>
          <button class="stepper-btn sm" onclick="incTogli(${i},-1)">−</button>
          <button class="stepper-btn sm" onclick="incTogli(${i},1)">+</button>
        </div>`).join('')}</div>
      <div class="btn-row" style="margin-bottom:12px">
        <button class="btn btn-gold" onclick="incAllIniziativa()">⚔️ Manda all'iniziativa</button>
        <button class="btn btn-ghost btn-sm" onclick="inc.scelti=[]; renderModalRoot()">Svuota</button>
      </div>` : ''}

    <div class="divider"><span class="flourish">❧</span><span>Aggiungi nemici</span></div>
    ${cercaLista('inc-cerca', inc.q, 'incCerca', 'Cerca fra ' + catalogo.length + ' creature…')}
    ${nq
      ? (trovati.length
          ? bloccoLista('inc-mostri', trovati, rigaTrovato, { modale:true, nome:'creature' })
          : `<div class="lista-vuota">Nessuna creatura con questo nome.</div>`)
      : `<div class="lista-vuota">Scrivi il nome di una creatura per trovarla — ci sono quelle di serie, le tue e quelle del tavolo.</div>`}

    <div class="spell-source-note">Le soglie sono un'indicazione, non una regola: contano molto di più il terreno, le risorse rimaste e come giocano i tuoi. Un «medio» a fine giornata può ammazzare.</div>`;
  return modalShell('⚔️ Costruttore di incontri', inner);
}

/* I nemici scelti entrano nel tracker dell'iniziativa, uno per copia.
   Non si riusa addMonsterToCombat: quella chiude la finestra, ridisegna
   e manda un messaggio a ogni creatura — dentro un ciclo da dodici
   goblin farebbe dodici volte tutto. Qui si riempie e si disegna una
   volta sola alla fine. */
function incAllIniziativa(){
  let n = 0;
  inc.scelti.forEach(s => {
    const x = incTrova(s.fonte, s.id);
    if (!x) return;
    for (let k = 0; k < s.quanti; k++){
      if (s.fonte === 'srd'){
        const dex = mod(x.ab[1]);
        const tiro = (typeof rollDiceExpression === 'function') ? rollDiceExpression(x.hd) : null;
        const pf = Math.max(1, (tiro && tiro.total) || x.hp);
        state.combat.list.push({ refId:null, kind:'monster', srdId:x.id,
          name: uniqueCombatName(nomeDiCreatura(x)),
          avatar: (typeof monsterAvatar === 'function') ? monsterAvatar(x) : '🐉',
          init: rollDie(20) + dex, hp: pf, hpMax: pf });
      } else {
        const dex = mod(getPath(x, 'abilities.dex', 10));
        const pf = x.hpMax || x.hpCurrent || 1;
        state.combat.list.push({ refId: x.id, kind:'npc',
          name: uniqueCombatName(x.name || 'Creatura'), avatar: x.avatar || '🐉',
          init: rollDie(20) + dex, hp: pf, hpMax: pf });
      }
      n++;
    }
  });
  if (!n){ toast('Non c\'è niente da mandare'); return; }
  sortCombat(); saveSession();
  closeModal();
  state.view = 'dm'; state.dmTab = 'initiative';
  render();
  toast('⚔️ ' + n + (n===1?' nemico all\'iniziativa':' nemici all\'iniziativa'));
}
