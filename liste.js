/* ═══════════════════════════════════════════════════════════════
   LISTE LUNGHE — v6.7
   Un bestiario da tremila creature non si disegna tutto insieme:
   tremila schede fanno più di settecentomila caratteri di HTML e
   quindicimila nodi nella pagina, e il telefono si pianta per
   qualche secondo a ogni tocco. Qui c'è il pezzo che tutte le
   schermate lunghe si passano: si mostra un blocco per volta, con
   il pulsante «mostrane altri» in fondo e il conto di quante
   restano. La ricerca resta sopra e lavora sull'elenco intero,
   così niente si perde: si cerca fra tutto, si guarda un po' per
   volta.
   ═══════════════════════════════════════════════════════════════ */

const LISTA_PASSO = 60;      // quante righe alla prima apertura
const LISTA_PASSO_PIU = 120; // quante se ne aggiungono a ogni tocco
/* Sopra questa soglia il tasto «mostrale tutte» sparisce: disegnare
   tremila schede insieme pianta il telefono per qualche secondo, e non
   serve a niente — quello che cerchi si trova scrivendone il nome. */
const LISTA_TUTTI_MAX = 400;

/* Quante righe sta mostrando adesso ciascuna lista, per nome. */
const __listeQuante = {};

function listaQuante(chiave){
  const n = __listeQuante[chiave];
  return (typeof n === 'number' && n > 0) ? n : LISTA_PASSO;
}
/* Tornando a filtrare o riaprendo la schermata si riparte dall'alto:
   restare a «600 righe mostrate» dopo aver cambiato ricerca è solo
   lentezza inutile. */
function listaAzzera(chiave){ delete __listeQuante[chiave]; }
function listaAzzeraTutte(prefisso){
  Object.keys(__listeQuante).forEach(k => {
    if (!prefisso || k.indexOf(prefisso) === 0) delete __listeQuante[k];
  });
}
function listaAltre(chiave, dentroModale){
  __listeQuante[chiave] = listaQuante(chiave) + LISTA_PASSO_PIU;
  if (dentroModale) renderModalRoot(); else render();
}
function listaTutte(chiave, dentroModale){
  __listeQuante[chiave] = 1e9;
  if (dentroModale) renderModalRoot(); else render();
}

/* Disegna la fetta visibile di un elenco e, se ne restano, il piede
   con «mostrane altri».
     chiave    nome della lista (serve a ricordare quante ne mostra)
     items     l'elenco già filtrato e ordinato
     riga      funzione che disegna una riga
     opt       { modale:true, classe:'list-gap', nome:'creature' }        */
function bloccoLista(chiave, items, riga, opt){
  const o = opt || {};
  const lista = items || [];
  const quante = listaQuante(chiave);
  const visibili = lista.slice(0, quante);
  const restanti = lista.length - visibili.length;
  const classe = o.classe || 'list-gap';
  const nome = o.nome || 'voci';
  const dove = o.modale ? 'true' : 'false';
  const html = `<div class="${classe}">${visibili.map(riga).join('')}</div>`;
  if (restanti <= 0) return html;
  return html + `
    <div class="lista-piede">
      <button class="btn btn-ghost btn-sm" onclick="listaAltre('${jsStr(chiave)}', ${dove})">
        ↓ Mostrane altri ${Math.min(LISTA_PASSO_PIU, restanti)}
      </button>
      ${(restanti > LISTA_PASSO_PIU && lista.length <= LISTA_TUTTI_MAX)
        ? `<button class="btn btn-ghost btn-sm" onclick="listaTutte('${jsStr(chiave)}', ${dove})">Tutti i ${lista.length}</button>` : ''}
      <div class="muted lista-conto">${visibili.length} di ${lista.length} ${escapeHtml(nome)}</div>
    </div>`;
}

/* Le liste lunghe si cercano, non si scorrono: questa è la casella,
   uguale ovunque, con il numero di risultati sotto. */
function cercaLista(id, valore, funzione, segnaposto){
  return `<div class="field lista-cerca">
    <input id="${id}" value="${attr(valore || '')}" placeholder="${attr(segnaposto || 'Cerca…')}"
      autocomplete="off" oninput="${funzione}(this.value)">
    ${valore ? `<button class="lista-cerca-x" onclick="${funzione}('')" aria-label="Pulisci">✕</button>` : ''}
  </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   SCELTA A PASTIGLIE
   Nella creazione guidata razze e background sono file di pastiglie.
   Con un manuale intero caricato diventano muri di duecento
   pastiglie: la scelta si trova cercando, non scorrendo. Sotto le
   venti restano com'erano — cercare fra otto razze sarebbe solo
   un passaggio in più.
   ═══════════════════════════════════════════════════════════════ */
const SCELTA_MURO = 20;   // oltre questo numero compare la ricerca
const SCELTA_MAX = 24;    // quante pastiglie al massimo insieme

function sceltaChip(lista, sceltoId, azione, campoQ, segnaposto, etichetta){
  const tutte = lista || [];
  const molte = tutte.length > SCELTA_MURO;
  const q = molte ? String((typeof bld !== 'undefined' && bld ? bld[campoQ] : '') || '').trim() : '';
  let viste = tutte;
  if (q){
    const nq = norm(q);
    viste = tutte.filter(x => norm(x.name || '').includes(nq));
  }
  // Quello già scelto resta sempre in vista, anche se la ricerca lo esclude:
  // sparire la propria scelta sotto gli occhi confonde e basta.
  const scelto = sceltoId ? tutte.find(x => x.id === sceltoId) : null;
  if (scelto && !viste.some(x => x.id === sceltoId)) viste = [scelto].concat(viste);

  const troppe = viste.length > SCELTA_MAX;
  const mostrate = troppe ? viste.slice(0, SCELTA_MAX) : viste;
  const chip = (x) => `<button class="chip ${sceltoId===x.id?'active':''}" onclick="${azione}('${jsStr(x.id)}')">${etichetta(x)}</button>`;

  return `${molte ? cercaLista('scelta-'+campoQ, q, 'bldCercaScelta_'+campoQ, segnaposto) : ''}
    ${mostrate.length ? `<div class="chip-row" style="margin-bottom:${troppe?'6px':'14px'}">${mostrate.map(chip).join('')}</div>` : ''}
    ${troppe ? `<div class="muted" style="font-size:.72rem; margin-bottom:14px">…e altre ${viste.length - SCELTA_MAX}: scrivi qualche lettera del nome per trovarla.</div>` : ''}
    ${(!mostrate.length) ? `<div class="lista-vuota">Nessuna voce con questo nome.</div>` : ''}`;
}
/* Le due caselle della creazione guidata: nomi fissi, così l'onclick
   nell'HTML resta una stringa semplice. */
function bldCercaScelta_raceQ(v){ bld.raceQ = v; renderModalRoot(); }
function bldCercaScelta_bgQ(v){ bld.bgQ = v; renderModalRoot(); }
function bldCercaSub(v){ bld.subQ = v; listaAzzera('bld-sub'); renderModalRoot(); }
