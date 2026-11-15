/* Envanter durumu + arka plan veri kuyruğu + localStorage kalıcılığı */
import { LS_KEY } from './data.js';
import { abilityDesc, natureInfo, natDescOf, resolveView, loadMoveMeta, spriteURL, artURL } from './api.js';
import { calcMon } from './stats.js';

export const mons = [];

const DEFAULT_VIEW = { lvl100:false, stage:'current', mega:false, form:null, finalPick:null, megaPick:null };

/* basit event bus */
const listeners = {};
function emit(ev, payload){
  (listeners[ev] || []).forEach(fn => { try{ fn(payload); }catch(e){ console.error(e); } });
}
export const on = (ev, fn) => { (listeners[ev] ??= []).push(fn); };
function message(type, text){ emit('msg', {type, text}); }

/* ---------- arka plan kuyruğu ---------- */
const queue = [];
let processing = false;

function updateQueueStatus(){
  const remaining = queue.length + (processing ? 1 : 0);
  emit('queue', remaining);
}

export function enqueueDataFetch(mon){
  mon.abDesc = null; mon.natDesc = null; mon.natureInfo = null;
  mon.err = null; mon.calc = null; mon.loading = true;
  queue.push(mon);
  processQueue();
}

async function processQueue(){
  if(processing) return;
  processing = true;
  updateQueueStatus();
  while(queue.length){
    const mon = queue.shift();
    try{
      const [ab, ni] = await Promise.all([
        abilityDesc(mon.ability), natureInfo(mon.nature), refreshView(mon)
      ]);
      mon.abDesc = ab; mon.natureInfo = ni; mon.err = null;
      mon.natDesc = natDescOf(ni);
      await loadMoveMeta(mon);
      mon.loading = false;
      message('ok', `✔ ${mon.name}: stat data updated.`);
    }catch(err){
      mon.err = err.message; mon.loading = false;
      message('err', `⚠ ${mon.name}: could not fetch data (${err.message}); will retry in tooltip/modal.`);
    }
    saveInventory();
    updateQueueStatus();
    emit('grid');
    emit('mon', mon);
  }
  processing = false;
  updateQueueStatus();
}

/* ---------- görünüm (seviye / evrim / form) ---------- */
/** mon.view'a göre Pokémon'u çözer; base, tür, görsel, label ve stat hesabını günceller.
 *  Art arda çağrılırsa yalnızca en sonuncu sonucu uygulanır. */
export async function refreshView(mon){
  const tok = mon._t = {};
  const r = await resolveView(mon);
  if(mon._t !== tok) return;
  mon.eff = r; mon.opts = r.opts; mon.base = r.base; mon.types = r.base.types;
  mon.sprite = spriteURL(r.base.id); // eski kayıtlı pokemondb URL'lerini de ezer
  mon.art    = artURL(r.base.id);
  try{ mon.calc = await calcMon(mon); }catch(e){ mon.calc = null; }
}

export function setView(mon, patch){
  Object.assign(mon.view, patch);
  saveInventory();
  emit('grid'); // radyolar anında güncellenir
  refreshView(mon).then(() => { saveInventory(); emit('grid'); emit('mon', mon); })
    .catch(err => message('err', `⚠ ${mon.name}: ${err.message}`));
}

/** Seçili Pokémon varsa onlara, yoksa tümüne uygular. Uygulanamayan evrim aşamasını atlar. */
export function bulkView(patch){
  const sel = mons.filter(m => m.sel);
  (sel.length ? sel : mons).forEach(m => {
    const p = { ...patch };
    if('stage' in p && !stageAvailable(m, p.stage)) delete p.stage;
    if(p.mega && !megaAvailable(m)) delete p.mega;
    if(Object.keys(p).length) setView(m, p);
  });
}
export const stageAvailable = (m, stage) => stage !== 'final' || !m.opts || m.opts.finals.length > 0;
export const megaAvailable  = m => !m.opts || m.opts.hasMega;

/* ---------- seçim ---------- */
export function setSel(mon, v){ mon.sel = v; saveInventory(); emit('grid'); }
export function selectAll(fn = () => true){ mons.forEach(m => { m.sel = fn(m); }); saveInventory(); emit('grid'); }

/* ---------- CRUD ---------- */
export function addMon(mon){
  mon.view = { ...DEFAULT_VIEW }; mon.sel = false;
  mons.push(mon);
  saveInventory();
  emit('grid');
  enqueueDataFetch(mon);
}

export function removeMon(index){
  const [m] = mons.splice(index,1);
  saveInventory();
  emit('grid');
  if(m) message('ok', `🗑 ${m.name} removed from inventory.`);
  return m;
}

export function clearAll(){
  mons.length = 0;
  saveInventory();
  emit('grid');
  message('ok', '🗑 Inventory cleared.');
}

/* ---------- kalıcılık ---------- */
function saveInventory(){
  try{
    const data = mons.map(m => ({
      name:m.name, level:m.level, ability:m.ability, nature:m.nature,
      evs:m.evs, ivs:m.ivs, moves:m.moves, tera:m.tera ?? null,
      sprite:m.sprite, art:m.art, moveMeta:m.moveMeta ?? null, view:m.view, sel:!!m.sel
    }));
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }catch(e){ /* quota vb. sessizce geç */ }
}

export function loadInventory(){
  let data = null;
  try{ data = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); }catch(e){}
  if(!Array.isArray(data)) return;
  data.forEach(d => {
    const view = { ...DEFAULT_VIEW, ...d.view };
    if(view.stage === 'mega'){ view.stage = 'current'; view.mega = true; } // eski kayıt göçü
    mons.push(Object.assign({ evs:{}, ivs:{}, moves:[], loading:true }, d, { view }));
  });
  if(mons.length) message('ok', `✔ ${mons.length} Pokémon restored from browser storage.`);
  emit('grid');
  mons.forEach(enqueueDataFetch);
}
