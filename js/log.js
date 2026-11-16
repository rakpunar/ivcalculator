/* Hata günlüğü: oturum boyunca biriken hatalar, "Log" butonuyla .txt olarak indirilir.
   main.js'in İLK importu olmalı ki sonradan yüklenen modüllerin hataları da yakalansın. */
const KEY = 'ivcalc.log.v1', MAX = 300; // shortcut: en eski kayıtlar silinir, 300 üstü tutulmaz
let entries = [];
try{ entries = JSON.parse(sessionStorage.getItem(KEY) || '[]'); }catch(e){}

const fmt = a => a instanceof Error ? (a.stack || a.message) : typeof a === 'string' ? a : (() => { try{ return JSON.stringify(a); }catch(e){ return String(a); } })();

export function logEvent(level, ...args){
  entries.push({ t: new Date().toISOString(), level, msg: args.map(fmt).join(' ') });
  if(entries.length > MAX) entries.splice(0, entries.length - MAX);
  try{ sessionStorage.setItem(KEY, JSON.stringify(entries)); }catch(e){}
  const n = document.getElementById('logCount'); if(n) n.textContent = entries.length;
}

for(const lv of ['error', 'warn']){ // console.error/warn'ı da yakala (özgün davranış korunur)
  const orig = console[lv].bind(console);
  console[lv] = (...a) => { logEvent(lv, ...a); orig(...a); };
}
addEventListener('error', e => logEvent('error', `${e.message} (${e.filename}:${e.lineno}:${e.colno})`, e.error));
addEventListener('unhandledrejection', e => logEvent('error', 'Unhandled rejection:', e.reason));

export function initLog(){
  const count = document.getElementById('logCount'); count.textContent = entries.length;
  document.getElementById('btnLog').addEventListener('click', () => {
    let inv = '?'; try{ inv = JSON.parse(localStorage.getItem('ivcalc.inventory.v1') || '[]').length; }catch(e){}
    const head = [`IV Calculator debug log`, `Exported: ${new Date().toISOString()}`, `URL: ${location.href}`,
      `UserAgent: ${navigator.userAgent}`, `Inventory size: ${inv}`, `Entries: ${entries.length}`, ''].join('\n');
    const body = entries.map(e => `[${e.t}] ${e.level.toUpperCase()} ${e.msg}`).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([head + '\n' + (body || '(no errors recorded)') + '\n'], { type: 'text/plain' }));
    a.download = `ivcalc-log-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt`;
    a.click(); URL.revokeObjectURL(a.href);
  });
  document.getElementById('btnLogClear').addEventListener('click', () => { entries = []; logEvent('info', 'Log cleared'); });
}
