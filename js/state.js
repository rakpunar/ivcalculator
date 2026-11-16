/* Envanter durumu + arka plan veri kuyruğu + localStorage kalıcılığı */
import { logEvent } from './log.js';
import { LS_KEY } from './data.js';
import { abilityDesc, natureInfo, natDescOf, resolveView, loadMoveMeta, spriteURL, artURL } from './api.js';
import { calcMon } from './stats.js';

export const mons = [];

const DEFAULT_VIEW = { lvl100:false, stage:'current', mega:false, form:null, finalPick:null, megaPick:null };

/* basit event bus */
const listeners = {};
let gridTimer = null;
function emit(ev, payload){
  if(ev === 'grid'){ // yüzlerce Pokémonda her değişiklikte tüm kartları yeniden çizmek tarayıcıyı dondurur: 60 ms içindekiler tek çizimde birleşir
    gridTimer ??= setTimeout(() => { gridTimer = null; fire('grid'); }, 60);
    return;
  }
  fire(ev, payload);
}
function fire(ev, payload){
  (listeners[ev] || []).forEach(fn => { try{ fn(payload); }catch(e){ console.error(e); } });
}
export const on = (ev, fn) => { (listeners[ev] ??= []).push(fn); };
function message(type, text){
  if(type === 'err') logEvent('error', text); emit('msg', {type, text}); }

/* ---------- arka plan kuyruğu ---------- */
const queue = [];

function updateQueueStatus(){
  const remaining = queue.length + active;
  emit('queue', remaining);
}

export function enqueueDataFetch(mon){
  mon.abDesc = null; mon.natDesc = null; mon.natureInfo = null;
  mon.err = null; mon.calc = null; mon.loading = true;
  queue.push(mon);
  processQueue();
}

const WORKERS = 4; // toplu importta hızlansın diye birkaç Pokémon paralel işlenir
let active = 0;

async function runOne(mon){
  try{
    const [ni] = await Promise.all([natureInfo(mon.nature), refreshView(mon)]);
    mon.natureInfo = ni; mon.err = null;
    mon.natDesc = natDescOf(ni);
    await loadMoveMeta(mon);
    mon.loading = false;
    if(queue.length < 3) message('ok', `✔ ${mon.name}: stat data updated.`);
  }catch(err){
    mon.err = err.message; mon.loading = false;
    message('err', `⚠ ${mon.name}: could not fetch data (${err.message}); will retry in tooltip/modal.`);
  }
  saveInventory();
  emit('grid');
  emit('mon', mon);
}

function processQueue(){
  while(active < WORKERS && queue.length){
    active++;
    runOne(queue.shift()).finally(() => { active--; processQueue(); });
  }
  updateQueueStatus();
}

/* ---------- görünüm (seviye / evrim / form) ---------- */
/** mon.view'a göre Pokémon'u çözer; base, tür, görsel, label ve stat hesabını günceller.
 *  Art arda çağrılırsa yalnızca en sonuncu sonucu uygulanır. */
export async function refreshView(mon){
  const tok = mon._t = {};
  const r = await resolveView(mon);
  if(mon._t !== tok) return;
  // gösterilecek ability: mega ise megaya ait; değilse kullanıcınınki (türde yoksa "Unknown")
  let abName = mon.ability, abDesc;
  if(r.isMega && r.megaAbility){ abName = r.megaAbility; abDesc = await abilityDesc(abName); }
  else if(r.abilityOk) abDesc = await abilityDesc(abName);
  else { abName = 'Unknown'; abDesc = `"${mon.ability}" is not a possible ability of ${mon.name} (${r.ownAbilities.join(', ')}).`; }
  if(mon._t !== tok) return;
  mon.abName = abName; mon.abDesc = abDesc;
  if(r.autoForm && !mon.view.form) mon.view.form = r.autoForm; // ability'den anlaşılan form kalıcı olsun
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
  const sel = mons.filter(m => m.sel), changed = [];
  (sel.length ? sel : mons).forEach(m => {
    const p = { ...patch };
    if('stage' in p && !stageAvailable(m, p.stage)) delete p.stage;
    if(p.mega && !megaAvailable(m)) delete p.mega;
    if(Object.keys(p).length){ Object.assign(m.view, p); changed.push(m); }
  });
  saveInventory(); emit('grid'); // radyolar anında güncellenir
  (async () => {
    for(let i = 0; i < changed.length; i += 8){
      await Promise.all(changed.slice(i, i + 8).map(m => refreshView(m).then(() => emit('mon', m))
        .catch(err => message('err', `⚠ ${m.name}: ${err.message}`))));
      emit('grid');
    }
    saveInventory();
  })();
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

/** Toplu ekleme: tek kaydet + tek çizim. uid'si zaten envanterde olanlar atlanır; döner {added, skipped} */
export function addMons(list){
  const have = new Set(mons.map(m => m.uid).filter(Boolean));
  const fresh = list.filter(m => !(m.uid && have.has(m.uid)));
  fresh.forEach(m => { m.view = { ...DEFAULT_VIEW }; m.sel = false; mons.push(m); });
  saveInventory();
  emit('grid');
  fresh.forEach(enqueueDataFetch);
  return { added: fresh.length, skipped: list.length - fresh.length };
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
let quotaWarned = false, saveTimer = null;
function saveInventory(){ // art arda çağrılar tek yazımda birleşir (500 kayıt = her seferinde büyük JSON)
  saveTimer ??= setTimeout(saveNow, 400);
}
addEventListener('pagehide', () => { if(saveTimer) saveNow(); });
function saveNow(){
  clearTimeout(saveTimer); saveTimer = null;
  try{
    const data = mons.map(m => ({
      name:m.name, level:m.level, ability:m.ability, nature:m.nature,
      evs:m.evs, ivs:m.ivs, moves:m.moves, tera:m.tera ?? null, uid:m.uid ?? null,
      view:m.view, sel:!!m.sel // sprite/art/moveMeta kaydedilmez: PokéAPI'den yeniden türetilir (kota için)
    }));
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }catch(e){
    if(!quotaWarned){ quotaWarned = true; message('err', '⚠ Browser storage is full: the inventory could not be saved.'); }
  }
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
