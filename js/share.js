/* Liste paylaşımı: envanter sıkıştırılıp Cloudflare Worker'a (worker/) kaydedilir; ?c=KOD bağlantısı veya kodla her cihazda yüklenir. */
import { mons, addMons, clearAll, exportMon } from './state.js';
import { showMessage as msg } from './ui.js';
import { logEvent } from './log.js';

const API = 'https://ivcalc-share.r-akpunar.workers.dev/api/lists'; // deploy sonrası gerçek adresle değişir
const LS = 'ivcalc.share.v1';             // { code, key } — düzenleme anahtarı yalnızca bu tarayıcıda
const CODE_RE = /^[a-z0-9][a-z0-9-]{3,23}$/;
const $ = s => document.querySelector(s);
const showMessage = (type, text) => msg({ type, text });
const read = () => { try{ return JSON.parse(localStorage.getItem(LS) || 'null'); }catch(e){ return null; } };
const write = v => { try{ v ? localStorage.setItem(LS, JSON.stringify(v)) : localStorage.removeItem(LS); }catch(e){} };

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
function showInfo(){
  const s = read(), info = $('#shInfo');
  $('#shSave').textContent = s ? '☁ Update saved list' : '☁ Save & get link';
  $('#shCode').disabled = !!s;
  if(!s){ info.textContent = 'Saves the whole list online. Anyone with the link or code can open it.'; return; }
  const l = linkFor(s.code);
  info.innerHTML = `Code <b>${s.code}</b> · <a href="${l}">${l}</a> <button class="mini" id="shCopy">Copy link</button> <button class="mini" id="shUnlink" title="Stop updating this code from this browser (the saved list stays online)">Unlink</button>`;
}

async function save(){
  const btn = $('#shSave'); btn.disabled = true;
  try{
    if(!mons.length) throw new Error('The inventory is empty.');
    const data = await pack(mons.map(exportMon)), s = read();
    if(s){ await call('PUT', '/' + s.code, { data }, s.key); showMessage('ok', `✔ List updated (code ${s.code}).`); }
    else{
      const code = $('#shCode').value.trim().toLowerCase();
      if(code && !CODE_RE.test(code)) throw new Error('Code must be 4–24 characters: a–z, 0–9, "-".');
      const r = await call('POST', '', { data, code: code || undefined });
      write({ code: r.code, key: r.key });
      showMessage('ok', `✔ Saved. Code: ${r.code}`);
    }
    showInfo();
  }catch(e){
    logEvent('error', 'share save', e);
    showMessage('err', e.status === 409 ? '✖ That code is already taken. Choose another.' : '✖ ' + e.message);
  }finally{ btn.disabled = false; }
}

const askMode = n => new Promise(res => {
  if(!mons.length) return res('replace');
  const d = $('#shDlg'); $('#shDlgTxt').textContent = `This list has ${n} Pokémon. You already have ${mons.length} in your inventory.`;
  d.addEventListener('close', () => res(d.returnValue), { once: true }); d.showModal();
});

async function load(input){
  const raw = String(input).trim(), code = (raw.match(/[?&]c=([a-z0-9-]+)/i)?.[1] ?? raw).toLowerCase();
  if(!CODE_RE.test(code)) return showMessage('err', '✖ Enter a valid code or link.');
  try{
    const { data } = await call('GET', '/' + code);
    const list = await unpack(data);
    if(!Array.isArray(list)) throw new Error('Invalid list data.');
    const mode = await askMode(list.length);
    if(mode !== 'merge' && mode !== 'replace') return;
    if(mode === 'replace') clearAll();
    const r = addMons(list.map(d => Object.assign({ evs: {}, ivs: {}, moves: [], loading: true }, d)));
    showMessage('ok', `✔ ${r.added} Pokémon loaded from ${code}` + (r.skipped ? ` (${r.skipped} already present)` : '') + '.');
  }catch(e){
    logEvent('error', 'share load', e);
    showMessage('err', e.status === 404 ? '✖ No list found for that code.' : '✖ ' + e.message);
  }
}

export function initShare(){
  showInfo();
  $('#shSave').addEventListener('click', save);
  $('#shGo').addEventListener('click', () => load($('#shLoad').value));
  $('#shLoad').addEventListener('keydown', e => { if(e.key === 'Enter') load(e.target.value); });
  $('#shInfo').addEventListener('click', e => {
    if(e.target.id === 'shCopy'){ const l = linkFor(read().code); navigator.clipboard?.writeText(l).then(() => showMessage('ok', '✔ Link copied.'), () => showMessage('err', '✖ Could not copy: ' + l)); }
    else if(e.target.id === 'shUnlink'){ write(null); showInfo(); }
  });
  const c = new URLSearchParams(location.search).get('c'); // bağlantıyla gelen liste
  if(c){ history.replaceState(null, '', location.pathname); load(c); }
}
