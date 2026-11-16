/* ProHelper bot ile yerel bağlantı (127.0.0.1:47831-47835): durum rozeti, "Botdan al", bot -> site gönderimi */
import { parsePcExport, runImport } from './import.js';
import { t } from './i18n.js';

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
    alert(t('Bot import failed: {err}', { err: e.message }));
  }finally{ busy = false; }
}

async function poll(){
  clearTimeout(timer);
  if(!document.hidden && !busy){
    const d = await ping(); show(d);
    if(d?.pending > 0 && Date.now() > cooldownUntil) await doImport('/outbox', true);
  }
  timer = setTimeout(poll, port ? 3000 : 10000);
}

export function initBot(){
  $('btnBot').addEventListener('click', () => doImport('/pc', false));
  document.addEventListener('visibilitychange', () => { if(!document.hidden) poll(); });
  addEventListener('langchange', () => show(lastD));
  poll();
}
