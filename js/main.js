/* Bağlantı: butonlar + modül başlatma */
import { parseMon } from './parser.js';
import { addMon, removeMon, clearAll, loadInventory } from './state.js';
import { initUI, showMessage } from './ui.js';

const btnAdd = document.getElementById('btnAdd');
const paste = document.getElementById('paste');

document.getElementById('emptySlot').addEventListener('click', () => paste.focus());

btnAdd.addEventListener('click', () => {
  const text = paste.value;
  let mon;
  try{
    mon = parseMon(text);
  }catch(err){
    showMessage({ type:'err', text:'⚠ ' + err.message });
    return;
  }
  addMon(mon);
  showMessage({
    type:'ok',
    text:`✔ ${mon.name} added to inventory (Total IV: ${[...Object.entries(mon.ivs)].reduce((s,[,v])=>s+v,0)}/186) — fetching details in background.`
  });
  paste.value = '';
});

/* Önbelleği atlayarak tüm site dosyalarını yeniden indirir, sonra sayfayı yeniler (envanter localStorage'da kalır).
   shortcut: dosya listesi elle tutuluyor, yeni dosya eklenince buraya da eklenmeli. */
const SITE_FILES = ['./', 'style.css', 'js/main.js', 'js/api.js', 'js/data.js', 'js/parser.js', 'js/state.js', 'js/stats.js', 'js/ui.js'];
const btnReload = document.getElementById('btnReload');
btnReload.addEventListener('click', async () => {
  btnReload.disabled = true; btnReload.textContent = 'Updating…';
  await Promise.all(SITE_FILES.map(f => fetch(f, { cache:'reload' }).catch(() => {})));
  location.reload();
});

initUI({ remove: removeMon, clearAll });
loadInventory();