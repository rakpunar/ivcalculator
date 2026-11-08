/* Envanter durumu + arka plan veri kuyruğu + localStorage kalıcılığı */
import { LS_KEY } from './data.js';
import { abilityDesc, natureInfo, natDescOf, baseStats, loadMoveMeta, spriteURL, artURL } from './api.js';
import { calcMon } from './stats.js';

export const mons = [];

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
      const [ab, ni, base] = await Promise.all([
        abilityDesc(mon.ability), natureInfo(mon.nature), baseStats(mon.name)
      ]);
      mon.abDesc = ab; mon.natureInfo = ni; mon.base = base; mon.err = null;
      mon.natDesc = natDescOf(ni);
      mon.types = base.types;
      await loadMoveMeta(mon);
      try{ mon.calc = await calcMon(mon); }catch(e){}
      mon.loading = false;
      message('ok', `✔ ${mon.name}: stat verileri güncellendi.`);
    }catch(err){
      mon.err = err.message; mon.loading = false;
      message('err', `⚠ ${mon.name}: veri çekilemedi (${err.message}); tooltip/modal'da tekrar denenir.`);
    }
    saveInventory();
    updateQueueStatus();
    emit('grid');
    emit('mon', mon);
  }
  processing = false;
  updateQueueStatus();
}

/* ---------- CRUD ---------- */
export function addMon(mon){
  mon.sprite = spriteURL(mon.name);
  mon.art    = artURL(mon.name);
  mons.push(mon);
  saveInventory();
  emit('grid');
  enqueueDataFetch(mon);
}

export function removeMon(index){
  const [m] = mons.splice(index,1);
  saveInventory();
  emit('grid');
  if(m) message('ok', `🗑 ${m.name} envanterden silindi.`);
  return m;
}

export function clearAll(){
  mons.length = 0;
  saveInventory();
  emit('grid');
  message('ok', '🗑 Envanter boşaltıldı.');
}

/* ---------- kalıcılık ---------- */
function saveInventory(){
  try{
    const data = mons.map(m => ({
      name:m.name, level:m.level, ability:m.ability, nature:m.nature,
      evs:m.evs, ivs:m.ivs, moves:m.moves, tera:m.tera ?? null,
      sprite:m.sprite, art:m.art, moveMeta:m.moveMeta ?? null
    }));
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }catch(e){ /* quota vb. sessizce geç */ }
}

export function loadInventory(){
  let data = null;
  try{ data = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); }catch(e){}
  if(!Array.isArray(data)) return;
  data.forEach(d => {
    mons.push(Object.assign({ evs:{}, ivs:{}, moves:[], loading:true }, d));
  });
  if(mons.length) message('ok', `✔ ${mons.length} Pokémon tarayıcı kaydından geri yüklendi.`);
  emit('grid');
  mons.forEach(enqueueDataFetch);
}
