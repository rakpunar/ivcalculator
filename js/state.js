/* Envanter durumu + arka plan veri kuyruğu + localStorage kalıcılığı */
import { logEvent } from './log.js';
import { t } from './i18n.js';
import { LS_KEY } from './data.js';
import { abilityDesc, natureInfo, natDescOf, resolveView, loadMoveMeta } from './api.js';
import { spriteList } from './sprites.js';
import { calcMon } from './stats.js';

export const mons = [];

import { itemKey } from './mods.js';
const DEFAULT_VIEW = { lvl100:false, stage:'current', mega:false, form:null, finalPick:null, megaPick:null, item:'', abil:'' };

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
    if(queue.length < 3) message('ok', t('✔ {name}: stat data updated.', { name: mon.name }));
  }catch(err){
    mon.err = err.message; mon.loading = false;
    message('err', t('⚠ {name}: could not fetch data ({err}); will retry in tooltip/modal.', { name: mon.name, err: err.message }));
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
  mon.imgs ??= await spriteList(mon, null); // oyun kimliği (dex) varsa PokéAPI verisi olmasa da sprite gösterilir
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
  mon.imgs = await spriteList(mon, r.id); // yerel sprite adayları (PokéAPI görseli kullanılmaz)
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
  fresh.forEach(m => { m.view = { ...DEFAULT_VIEW, item: itemKey(m.item) }; m.sel = false; mons.push(m); });   // taşınan eşya tabloda varsa otomatik seçilir
  saveInventory();
  emit('grid');
  fresh.forEach(enqueueDataFetch);
  return { added: fresh.length, skipped: list.length - fresh.length };
}

/** Paylaşılan listeden gelen envanterle değiştirir: aynı uid'nin görünüm/seçimi ve değişmemiş Pokémon'un hesapları korunur */
export function setInventory(list){
  const old = new Map(mons.filter(m => m.uid).map(m => [m.uid, m]));
  const next = list.map(d => {
    const o = d.uid && old.get(d.uid);
    if(o && JSON.stringify(exportMon(o)) === JSON.stringify(exportMon(Object.assign({ evs:{}, ivs:{}, moves:[] }, d)))) return o;
    const mon = Object.assign({ evs:{}, ivs:{}, moves:[], loading:true }, d, { view:{ ...DEFAULT_VIEW, ...o?.view }, sel:!!o?.sel });
    return mon;
  });
  const fresh = next.filter(m => !mons.includes(m));
  mons.length = 0; mons.push(...next);
  saveInventory(); emit('grid');
  fresh.forEach(enqueueDataFetch);
}

export function removeMon(index){
  const [m] = mons.splice(index,1);
  saveInventory();
  emit('grid');
  if(m) message('ok', t('🗑 {name} removed from inventory.', { name: m.name }));
  return m;
}

/** botun salma koruma listesi (uid) ve EV taslakları (uid → {name,dex,target}); değişince kartlar yeniden çizilir */
export const protUids = new Set(), evPlans = new Map();
export function setProtList(uids){ protUids.clear(); uids.forEach(u => protUids.add(String(u))); emit('grid'); return protUids.size; }
export function setEvPlans(o){ evPlans.clear(); Object.entries(o ?? {}).forEach(([u, p]) => evPlans.set(String(u), p)); emit('grid'); return evPlans.size; }

/** botun salma listesi (uid'ler); değişince kartlar yeniden çizilir */
export const relUids = new Set();
export function setRelList(uids){
  relUids.clear(); uids.forEach(u => relUids.add(String(u))); emit('grid');
  return relUids.size;
}

export function clearAll(){
  mons.length = 0;
  saveInventory();
  emit('grid');
  message('ok', t('🗑 Inventory cleared.'));
}

/* ---------- EV düzenleme: ilk girilen değerler (evs0) saklanır, istenince geri dönülür ---------- */
export const EV_MAX = 252, EV_TOTAL = 510, EV_KEYS = ['HP','Atk','Def','SpA','SpD','Spe'];
export const evTotal = m => EV_KEYS.reduce((s, k) => s + (m.evs?.[k] || 0), 0);
export const origEvs = m => (m.evs0 ??= { ...m.evs });
export const evsChanged = m => EV_KEYS.some(k => (m.evs?.[k] || 0) !== (origEvs(m)[k] || 0));
async function recalc(m){ m.calc = await calcMon(m); saveInventory(); }
/** tek stat EV'si: 0..252, toplam 510'u aşarsa kalan kadar kısılır */
export function setEv(m, k, v){
  origEvs(m);
  const rest = evTotal(m) - (m.evs?.[k] || 0);
  const n = Math.max(0, Math.min(EV_MAX, Math.floor(+v) || 0, EV_TOTAL - rest));
  m.evs = { ...m.evs, [k]: n };
  return recalc(m).then(() => n);
}
export function resetEvs(m){ m.evs = { ...origEvs(m) }; return recalc(m); }

/* ---------- kalıcılık ---------- */
/** paylaşım/kayıt için kalıcı alanlar (sprite/moveMeta/hesaplananlar yok: yeniden türetilir) */
export const exportMon = m => ({
  name:m.name, level:m.level, ability:m.ability, nature:m.nature,
  evs:m.evs, evs0:m.evs0, ivs:m.ivs, moves:m.moves, tera:m.tera ?? null, uid:m.uid ?? null, dex:m.dex ?? null, gform:m.gform ?? 0, shiny:!!m.shiny,
  ...Object.fromEntries(['item', 'gender', 'nick', 'map'].filter(k => m[k]).map(k => [k, m[k]])),   // PC zarfından: yalnız doluysa saklanır
});
/* Paylaşılan listeye bağlıysa envanter o listenin kendi anahtarına yazılır; kişinin kendi envanteri LS_KEY'de bozulmadan kalır */
const wsKey = () => { try{ const c = JSON.parse(localStorage.getItem('ivcalc.share.v1') || 'null')?.code; return c ? LS_KEY + ':' + c : LS_KEY; }catch(e){ return LS_KEY; } };
let quotaWarned = false, saveTimer = null;
function saveInventory(){ // art arda çağrılar tek yazımda birleşir (500 kayıt = her seferinde büyük JSON)
  saveTimer ??= setTimeout(saveNow, 400);
}
addEventListener('pagehide', () => { if(saveTimer) saveNow(); });
export const flushSave = () => saveNow();
function saveNow(){
  clearTimeout(saveTimer); saveTimer = null;
  try{
    localStorage.setItem(wsKey(), JSON.stringify(mons.map(m => ({ ...exportMon(m), view:m.view, sel:!!m.sel }))));
    fire('saved');
  }catch(e){
    if(!quotaWarned){ quotaWarned = true; message('err', t('⚠ Browser storage is full: the inventory could not be saved.')); }
  }
}

export function loadInventory(){
  let data = null;
  try{ data = JSON.parse(localStorage.getItem(wsKey()) || 'null'); }catch(e){}
  if(!Array.isArray(data)) return;
  data.forEach(d => {
    const view = { ...DEFAULT_VIEW, ...d.view };
    if(view.stage === 'mega'){ view.stage = 'current'; view.mega = true; } // eski kayıt göçü
    mons.push(Object.assign({ evs:{}, ivs:{}, moves:[], loading:true }, d, { view }));
  });
  if(mons.length) message('ok', t('✔ {n} Pokémon restored from browser storage.', { n: mons.length }));
  emit('grid');
  mons.forEach(enqueueDataFetch);
}
