/* Paylaşılan liste (Cloudflare Worker, bkz. worker/): bağlantı/kod = listenin kendisi.
   Bir tarayıcı bir koda bağlanınca o tarayıcıdaki envanter O LİSTE olur (kendi yerel envanteri ayrı saklanır, "Unlink" ile geri gelir);
   değişiklikler otomatik kaydedilir, başka tarayıcıdaki değişiklikler periyodik çekilir. Çakışmada son yazan kazanır.
   Kodu bilen herkes listeyi okuyup düzenleyebilir. */
import { mons, on, exportMon, setInventory, flushSave } from './state.js';
import { showMessage as msg } from './ui.js';
import { logEvent } from './log.js';
import { t } from './i18n.js';

const API = 'https://ivcalc-share.r-akpunar.workers.dev/api/lists';
const LS = 'ivcalc.share.v1';             // { code, key?, t } — bu tarayıcının bağlı olduğu liste
const CODE_RE = /^[a-z0-9][a-z0-9-]{3,23}$/;
const POLL_MS = 30000, PUSH_DELAY = 1500;
const $ = s => document.querySelector(s);
const showMessage = (type, text) => msg({ type, text });
const read = () => { try{ return JSON.parse(localStorage.getItem(LS) || 'null'); }catch(e){ return null; } };
const write = v => { try{ v ? localStorage.setItem(LS, JSON.stringify(v)) : localStorage.removeItem(LS); }catch(e){} };

let s = read();                            // bağlı liste veya null
let lastJson = null, pushTimer = null, busy = false, status = '';

/* gzip + base64 */
async function pack(obj){
  const buf = await new Response(new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
  let bin = ''; const u = new Uint8Array(buf);
  for(let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(bin);
}
async function unpack(str){
  const u = Uint8Array.from(atob(str), c => c.charCodeAt(0));
  return JSON.parse(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
}

async function call(method, path, body, key){
  const r = await fetch(API + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(key ? { 'X-Key': key } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if(!r.ok) throw Object.assign(new Error(j.error || `HTTP ${r.status}`), { status: r.status });
  return j;
}

const linkFor = code => `${location.origin}${location.pathname}?c=${code}`;
const keyOf = () => s.key ?? s.code;       // yeni listelerde düzenleme anahtarı = kodun kendisi
const curJson = () => JSON.stringify(mons.map(exportMon));
const ensureUids = () => mons.forEach(m => { m.uid ??= 'l' + Math.random().toString(36).slice(2, 12); });

function setStatus(k){ status = k; const el = $('#shStat'); if(el) el.textContent = k ? t(k) : ''; }
function showInfo(){
  const info = $('#shInfo');
  $('#shSave').textContent = s ? '☁ Sync now' : '☁ Save & get link';
  $('#shCode').disabled = !!s;
  if(!s){ info.textContent = 'Saves the whole list online. Anyone with the link or code can open it.'; return; }
  const l = linkFor(s.code);
  info.innerHTML = `Code <b>${s.code}</b> · <a href="${l}">${l}</a> <button class="mini" id="shCopy">Copy link</button> <button class="mini" id="shUnlink" title="Disconnect this browser from the list (the list stays online; your own inventory comes back)">Unlink</button> <span id="shStat" class="shstat"></span>`;
  setStatus(status);
}

/* ---- gönder / çek ---- */
async function push(){
  if(!s || busy) return;
  const json = curJson(); if(json === lastJson) return;
  busy = true; setStatus('Saving…');
  try{
    ensureUids();                            // cihazlar arası kimlik (görünüm/seçim korunsun)
    const r = await call('PUT', '/' + s.code, { data: await pack(mons.map(exportMon)) }, keyOf());
    lastJson = curJson(); s.t = r.t; write(s); setStatus('Synced');
  }catch(e){
    logEvent('error', 'share push', e);
    setStatus(e.status === 403 ? 'Read-only (old link)' : 'Sync failed — will retry');
    if(e.status !== 403) schedulePush(15000);
  }finally{ busy = false; }
}
function schedulePush(ms = PUSH_DELAY){ clearTimeout(pushTimer); pushTimer = setTimeout(() => { pushTimer = null; push(); }, ms); }

async function pull(force){
  if(!s || busy || pushTimer) return;       // bekleyen yerel değişiklik varsa önce o gider
  try{
    const meta = await call('GET', '/' + s.code + '?meta=1');
    if(!force && meta.t === s.t) return setStatus('Synced');
    const full = await call('GET', '/' + s.code), list = await unpack(full.data);
    if(!Array.isArray(list)) throw new Error(t('Invalid list data.'));
    if(pushTimer || busy) return;           // beklerken yerel düzenleme olduysa ezme
    setInventory(list);
    lastJson = curJson(); s.t = full.t; write(s); setStatus('Synced');
  }catch(e){
    logEvent('error', 'share pull', e);
    setStatus(e.status === 404 ? 'List not found' : 'Sync failed — will retry');
  }
}

/* ---- bağlan / ayrıl ---- */
const ask = code => new Promise(res => {
  const d = $('#shDlg'); $('#shDlgTxt').textContent = t('Open the shared list "{code}"? This browser will show and edit that list instead of its own inventory. Your own inventory stays saved here and comes back when you unlink.', { code });
  const fin = ok => { d.removeEventListener('close', onClose); d.removeEventListener('click', onClick); res(ok); };
  const onClose = () => fin(d.returnValue === 'open');
  const onClick = e => { const b = e.target.closest('button'); if(b) fin(b.value === 'open'); }; // 'close' olayı her ortamda güvenilir değil
  d.addEventListener('close', onClose); d.addEventListener('click', onClick); d.showModal();
});

async function openCode(input){
  const raw = String(input).trim(), code = (raw.match(/[?&]c=([a-z0-9-]+)/i)?.[1] ?? raw).toLowerCase();
  if(!CODE_RE.test(code)) return showMessage('err', t('✖ Enter a valid code or link.'));
  if(s?.code === code){ history.replaceState(null, '', linkFor(code)); return pull(true); }
  try{ await call('GET', '/' + code + '?meta=1'); }
  catch(e){ logEvent('error', 'share open', e); history.replaceState(null, '', s ? linkFor(s.code) : location.pathname); return showMessage('err', e.status === 404 ? t('✖ No list found for that code.') : '✖ ' + e.message); }
  if(!(await ask(code))){ history.replaceState(null, '', s ? linkFor(s.code) : location.pathname); return; }
  flushSave();                                   // mevcut envanter ESKİ anahtara yazılsın
  write({ code, t: 0 });
  history.replaceState(null, '', linkFor(code));
  location.reload();                             // yeni listenin kendi önbelleğiyle açılır, ardından sunucudan çekilir
}

async function save(){
  const btn = $('#shSave'); btn.disabled = true;
  try{
    if(s){ clearTimeout(pushTimer); pushTimer = null; lastJson = null; await push(); await pull(true); return; }
    if(!mons.length) throw new Error(t('The inventory is empty.'));
    const code = $('#shCode').value.trim().toLowerCase();
    if(code && !CODE_RE.test(code)) throw new Error(t('Code must be 4–24 characters: a–z, 0–9, "-".'));
    ensureUids();
    const r = await call('POST', '', { data: await pack(mons.map(exportMon)), code: code || undefined });
    s = { code: r.code, t: r.t }; write(s); flushSave();   // mevcut envanter artık bu listenin önbelleği
    lastJson = curJson(); history.replaceState(null, '', linkFor(r.code)); status = 'Synced';
    showMessage('ok', t('✔ Saved. Code: {code}', { code: r.code }));
    showInfo();
  }catch(e){
    logEvent('error', 'share save', e);
    showMessage('err', e.status === 409 ? t('✖ That code is already taken. Choose another.') : '✖ ' + e.message);
  }finally{ btn.disabled = false; }
}

export function initShare(){
  showInfo();
  addEventListener('langchange', showInfo);
  $('#shSave').addEventListener('click', save);
  $('#shGo').addEventListener('click', () => openCode($('#shLoad').value));
  $('#shLoad').addEventListener('keydown', e => { if(e.key === 'Enter') openCode(e.target.value); });
  $('#shInfo').addEventListener('click', e => {
    if(e.target.id === 'shCopy'){ const l = linkFor(s.code); navigator.clipboard?.writeText(l).then(() => showMessage('ok', t('✔ Link copied.')), () => showMessage('err', t('✖ Could not copy: {l}', { l }))); }
    else if(e.target.id === 'shUnlink'){ flushSave(); write(null); history.replaceState(null, '', location.pathname); location.reload(); }
  });
  on('saved', () => { if(s && curJson() !== lastJson) schedulePush(); });
  addEventListener('pagehide', () => { if(s && pushTimer){ clearTimeout(pushTimer); pushTimer = null; push(); } });
  document.addEventListener('visibilitychange', () => { if(!document.hidden) pull(); });
  setInterval(() => { if(!document.hidden) pull(); }, POLL_MS);

  const c = new URLSearchParams(location.search).get('c');
  if(c) openCode(c);                              // bağlantıyla geldi: bağlı değilse sor, bağlıysa çek
  else if(s){ history.replaceState(null, '', linkFor(s.code)); pull(true); }
}
