/* ProHelper bot ile yerel bağlantı (127.0.0.1:47831-47835): durum rozeti, "Botdan al", bot -> site gönderimi */
import { parsePcExport, runImport } from './import.js';
import { t } from './i18n.js';
import { noticeBox, confirmBox } from './dialog.js';
import { mons, on, relUids, setRelList, protUids, setProtList, evPlans, setEvPlans, evsChanged, EV_MAX } from './state.js';
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

/* ---- salma / koruma / EV taslağı: bot listeleri rev ile senkron (ping'deki relRev, protRev, evRev) ---- */
const UID = m => /^\d+$/.test(m.uid ?? '');
const sel = () => mons.filter(m => m.sel && UID(m));
const relIds = () => sel().filter(m => !relUids.has(m.uid)).map(m => m.uid).slice(0, 2000);
const evDrafts = () => mons.filter(m => UID(m) && evsChanged(m));
function syncRel(){
  const n = relIds().length, s = sel(), b = $('btnRel');
  b.disabled = !lastD || n < 1; b.textContent = `🗑 ${t('Release via bot')}${n ? ` (${n})` : ''}`;
  $('btnPcf').disabled = !s.length;
  const un = s.filter(m => !protUids.has(m.uid)).length;
  $('btnProt').disabled = !lastD || !s.length; $('btnProt').textContent = !s.length || un ? `🛡 ${t('Protect')}` : `🛡 ${t('Unprotect')}`;
  const d = evDrafts().length; $('btnEv').disabled = !lastD || !d; $('btnEv').textContent = `📤 ${t('Send EV plan')}${d ? ` (${d})` : ''}`;
  const e = s.filter(m => evPlans.has(m.uid)).length; $('btnEvDel').disabled = !lastD || !e; $('btnEvDel').textContent = `✕ ${t('Remove EV plan')}${e ? ` (${e})` : ''}`;
}

// text/plain: preflight (OPTIONS) gerektirmez; gövde yine JSON
const post = async (path, body) => (await fetch(url(path), { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) })).json();
const okOr = r => { if(!r?.ok) throw new Error('rejected'); return r; };

const IVN = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'], statLine = o => IVN.map(k => `${k} ${o?.[k] ?? 0}`).join(' / ');
/** korumalı Pokémon onay kutusu metni (ProBot önizlemesiyle aynı alanlar) */
function preview(m){
  const g = String(m.gender ?? '').toUpperCase(), iv = IVN.reduce((a, k) => a + (+m.ivs?.[k] || 0), 0), ev = IVN.reduce((a, k) => a + (+m.evs?.[k] || 0), 0);
  return [`${m.shiny ? '★ ' : ''}${m.name}${g === 'M' ? ' ♂' : g === 'F' ? ' ♀' : ''}  Lv ${m.level ?? '?'}`, `${t('Nature')}: ${m.nature}`, `IV (${iv}): ${statLine(m.ivs)}`, `EV (${ev}): ${statLine(m.evs)}`,
    `${t('Ability')}: ${m.ability}`, m.item && m.item !== '0' ? `${t('Item')}: ${m.item}` : '', m.map ? `${t('Map')}: ${m.map}` : ''].filter(Boolean).join('\n');
}

async function sendRelease(){
  const all = relIds(); if(!all.length) return;
  const prot = all.filter(u => protUids.has(u)), plain = all.filter(u => !protUids.has(u));
  if(plain.length && !(await confirmBox(t("Add {n} Pokémon to the bot's release list? You decide in the app when to release them.", { n: plain.length }), { ok: 'Add to list', danger: true }))) return;
  const ok = [];
  for(const u of prot){   // korumalı her Pokémon için ayrı onay
    const m = mons.find(x => x.uid === u);
    if(await confirmBox(`${t('Protected Pokémon! Remove protection and add to the release list?')}\n\n${preview(m)}`, { ok: 'Unprotect and add', danger: true })) ok.push(u);
  }
  const uids = [...plain, ...ok]; if(!uids.length) return;
  try{
    if(ok.length) okOr(await post('/protect/remove', { uids: ok }));
    const r = okOr(await post('/release', { uids }));
    showMessage({ type: 'ok', text: t("✔ Sent to the bot's release list: {n} new.", { n: r.received ?? 0 }) });
    pull('prot', true); pull('rel', true);
  }catch(e){ noticeBox(t('Release request failed: {err}', { err: e.message })); }
}

/** oyun PC arama kutusu filtresi: uid=1 | uid=2 … (OR); bot gerekmez */
async function copyPcFilter(){
  const f = sel().map(m => `uid=${m.uid}`).join(' | '); if(!f) return;
  try{ await navigator.clipboard.writeText(f); showMessage({ type: 'ok', text: t('✔ PC filter copied ({n}): paste it into the in-game PC search box.', { n: f.split('|').length }) }); }
  catch(e){ noticeBox(f); }
}

async function toggleProt(){
  const s = sel(); if(!s.length) return;
  const add = s.filter(m => !protUids.has(m.uid)), rm = !add.length;
  try{ okOr(await post(rm ? '/protect/remove' : '/protect', { uids: (rm ? s : add).map(m => m.uid) })); pull('prot', true); }
  catch(e){ noticeBox(t('Bot request failed: {err}', { err: e.message })); }
}

const KEY = { HP: 'hp', Atk: 'atk', Def: 'def', SpA: 'spa', SpD: 'spd', Spe: 'spe' };
async function sendEv(){
  const plans = evDrafts().map(m => ({ uid: m.uid, name: m.name, dex: m.dex ?? null, target: Object.fromEntries(IVN.map(k => [KEY[k], Math.min(EV_MAX, +m.evs?.[k] || 0)])) }));
  if(!plans.length) return;
  try{ okOr(await post('/evplan', { plans })); showMessage({ type: 'ok', text: t('✔ EV plans sent to the bot: {n}.', { n: plans.length }) }); pull('ev', true); }
  catch(e){ noticeBox(t('Bot request failed: {err}', { err: e.message })); }
}
async function delEv(){
  const uids = sel().filter(m => evPlans.has(m.uid)).map(m => m.uid); if(!uids.length) return;
  try{ okOr(await post('/evplan/remove', { uids })); pull('ev', true); }
  catch(e){ noticeBox(t('Bot request failed: {err}', { err: e.message })); }
}

/** Bot listelerini çeker; ilk eşitlemede yalnız doluysa bildirir. rel/prot: {rev,uids}, ev: {rev,plans} */
const L = {
  rel:  { path: '/rellist', ping: 'relRev', rev: undefined, synced: false, apply: r => setRelList(r.uids), ok: r => Array.isArray(r.uids), msg: 'Release list updated: {n} Pokémon' },
  prot: { path: '/protect', ping: 'protRev', rev: undefined, synced: false, apply: r => setProtList(r.uids), ok: r => Array.isArray(r.uids), msg: 'Protection list updated: {n} Pokémon' },
  ev:   { path: '/evplan', ping: 'evRev', rev: undefined, synced: false, apply: r => setEvPlans(r.plans), ok: r => r.plans && typeof r.plans === 'object', msg: 'EV plans updated: {n} Pokémon' },
};
async function pull(k, quiet){
  const l = L[k], r = await get(l.path, 4000).catch(() => null);
  if(!r || !l.ok(r)) return;
  const first = !l.synced; l.synced = true; l.rev = r.rev;
  const n = l.apply(r);
  if(!quiet && (!first || n)) showMessage({ type: 'ok', text: t(l.msg, { n }) });
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
    for(const k in L){ const l = L[k]; if(d && (!l.synced || (d[l.ping] !== undefined && d[l.ping] !== l.rev))) await pull(k); if(!d) l.synced = false; }   // bot kapandı: tekrar bağlanınca tam eşitleme
  }
  timer = setTimeout(poll, port ? 3000 : 10000);
}

export function initBot(){
  $('btnBot').addEventListener('click', () => doImport('/pc', false));
  $('btnRel').addEventListener('click', sendRelease);
  $('btnPcf').addEventListener('click', copyPcFilter);
  $('btnProt').addEventListener('click', toggleProt); $('btnEv').addEventListener('click', sendEv); $('btnEvDel').addEventListener('click', delEv);
  on('grid', syncRel);
  document.addEventListener('visibilitychange', () => { if(!document.hidden) poll(); });
  addEventListener('langchange', () => show(lastD));
  poll();
}
