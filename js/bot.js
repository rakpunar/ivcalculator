/* ProHelper bot ile yerel bağlantı (127.0.0.1:47831-47835): durum rozeti, "Botdan al", bot -> site gönderimi */
import { parsePcExport, runImport } from './import.js';
import { t } from './i18n.js';
import { noticeBox, confirmBox } from './dialog.js';
import { mons, on, relUids, setRelList } from './state.js';
import { showMessage } from './ui.js';

const PORTS = [47831, 47832, 47833, 47834, 47835];
const $ = id => document.getElementById(id);
let port = null, busy = false, timer = null, cooldownUntil = 0, lastD = null;

const url = path => `http://127.0.0.1:${port}${path}`;
const get = async (path, ms = 8000) => (await fetch(url(path), { signal: AbortSignal.timeout(ms) })).json();

/** Bot'u bulur (önce bilinen port, sonra sırayla hepsi; her biri 800 ms). Bulamazsa null. */
async function ping(){
  for(const p of port ? [port, ...PORTS.filter(x => x !== port)] : PORTS){
    try{
      const r = await fetch(`http://127.0.0.1:${p}/ping`, { signal: AbortSignal.timeout(800) });
      const d = await r.json();
      if(d?.app === 'prohelper-bot'){ port = p; return d; }
    }catch(e){ /* sıradaki port */ }
  }
  port = null; return null;
}

function show(d){
  lastD = d;
  $('botBadge').textContent = d ? t('Bot connected (PC: {pc})', { pc: d.pc }) : t('Bot not found');
  $('botBadge').classList.toggle('on', !!d);
  $('btnBot').disabled = !d || busy;
  syncRel();
}

/* ---- salma listesi: seçilenleri botun listesine ekler (salmayı kullanıcı uygulamada yapar); liste relRev ile senkron ---- */
const relIds = () => mons.filter(m => m.sel && /^\d+$/.test(m.uid ?? '') && !relUids.has(m.uid)).map(m => m.uid).slice(0, 2000);
function syncRel(){ const n = relIds().length; const b = $('btnRel'); b.disabled = !lastD || n < 1; b.textContent = `🗑 ${t('Release via bot')}${n ? ` (${n})` : ''}`; }

async function sendRelease(){
  const uids = relIds(); if(!uids.length) return;
  if(!(await confirmBox(t("Add {n} Pokémon to the bot's release list? You decide in the app when to release them.", { n: uids.length }), { ok: 'Add to list', danger: true }))) return;
  try{
    // text/plain: preflight (OPTIONS) gerektirmez; gövde yine JSON
    const r = await (await fetch(url('/release'), { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ uids }), signal: AbortSignal.timeout(8000) })).json();
    if(!r?.ok) throw new Error('rejected');
    showMessage({ type: 'ok', text: t("✔ Sent to the bot's release list: {n} new.", { n: r.received ?? 0 }) });
    relPull(true);
  }catch(e){ noticeBox(t('Release request failed: {err}', { err: e.message })); }
}

/** Botun salma listesini çeker (GET /rellist), kartlardaki 🗑 işaretini günceller; ilk eşitlemede yalnız doluysa bildirir */
let relRev, relSynced = false;
async function relPull(quiet){
  const r = await get('/rellist', 4000).catch(() => null);
  if(!r || !Array.isArray(r.uids)) return;
  const first = !relSynced; relSynced = true; relRev = r.rev;
  const n = setRelList(r.uids);
  if(!quiet && (!first || n)) showMessage({ type: 'ok', text: t('Release list updated: {n} Pokémon', { n }) });
}

/** Zarfı içe aktarır; bitince (kullanıcı OK'layınca) döner. ack=true: bot'a "tamam" bildirir. */
async function doImport(path, ack){
  busy = true; show({ pc: '…' });
  try{
    const exp = parsePcExport(JSON.stringify(await get(path, 30000)));
    if(!exp) throw new Error('unexpected response');
    if(!exp.pokemon.length) return;
    const p = runImport(exp); if(!p) return;
    await p;
    if(ack && exp.id) await fetch(url('/outbox/ack?id=' + encodeURIComponent(exp.id)), { method: 'POST', signal: AbortSignal.timeout(5000) }).catch(() => {});
  }catch(e){
    cooldownUntil = Date.now() + 30000; // hata sonrası otomatik tekrar denemeden önce bekle
    noticeBox(t('Bot import failed: {err}', { err: e.message }));
  }finally{ busy = false; }
}

async function poll(){
  clearTimeout(timer);
  if(!document.hidden && !busy){
    const d = await ping(); show(d);
    if(d?.pending > 0 && Date.now() > cooldownUntil) await doImport('/outbox', true);
    if(d && (!relSynced || (d.relRev !== undefined && d.relRev !== relRev))) await relPull();
    if(!d) relSynced = false;   // bot kapandı: tekrar bağlanınca tam eşitleme
  }
  timer = setTimeout(poll, port ? 3000 : 10000);
}

export function initBot(){
  $('btnBot').addEventListener('click', () => doImport('/pc', false));
  $('btnRel').addEventListener('click', sendRelease);
  on('grid', syncRel);
  document.addEventListener('visibilitychange', () => { if(!document.hidden) poll(); });
  addEventListener('langchange', () => show(lastD));
  poll();
}
