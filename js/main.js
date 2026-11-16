/* Bağlantı: butonlar + modül başlatma */
import { parseMon } from './parser.js';
import { addMon, removeMon, clearAll, loadInventory } from './state.js';
import { initUI, showMessage } from './ui.js';
import { screenshotToText } from './ocr.js';

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

/* Ekran görüntüsü → metin kutusunu doldurur (eklemeden önce kontrol edilebilsin diye otomatik eklemez) */
const btnShot = document.getElementById('btnShot'), btnClip = document.getElementById('btnClip'), shotFile = document.getElementById('shotFile');
async function readShot(file){
  if(!file?.type.startsWith('image/')) return;
  const status = document.getElementById('status');
  btnShot.disabled = btnClip.disabled = true; btnClip.textContent = '⏳ Reading image… 0%';
  status.textContent = '⏳ Reading the image takes a while (the first time the OCR engine, ~10 MB, must download). Please wait…';
  status.classList.add('show');
  try{
    const { text, warnings } = await screenshotToText(file, (pct, label) => {
      btnClip.textContent = `⏳ ${Math.round(pct)}%`;
      status.textContent = `⏳ ${label} ${Math.round(pct)}% — this can take a while, please wait…`;
    });
    paste.value = text;
    showMessage({ type:'ok', text:'✔ Image read. Check the text, then click Add.' + (warnings.length ? ' ⚠ ' + warnings.join('; ') : '') });
  }catch(err){
    showMessage({ type:'err', text:'⚠ ' + err.message });
  }
  status.classList.remove('show');
  btnShot.disabled = btnClip.disabled = false; btnClip.textContent = '📋 Paste image from clipboard';
}
btnShot.addEventListener('click', () => shotFile.click());
btnClip.addEventListener('click', async () => {
  try{
    for(const item of await navigator.clipboard.read()){
      const type = item.types.find(t => t.startsWith('image/'));
      if(type) return readShot(new File([await item.getType(type)], 'clipboard', { type }));
    }
    showMessage({ type:'err', text:'⚠ No image in the clipboard. Copy a screenshot first.' });
  }catch(err){ // izin reddi / tarayıcı desteklemiyor: Ctrl+V her zaman çalışır
    showMessage({ type:'err', text:'⚠ Could not read the clipboard. Press Ctrl+V on the page instead.' });
  }
});
shotFile.addEventListener('change', () => { readShot(shotFile.files[0]); shotFile.value = ''; });
document.addEventListener('paste', e => { const f = [...(e.clipboardData?.files ?? [])].find(f => f.type.startsWith('image/')); if(f){ e.preventDefault(); readShot(f); } });
paste.addEventListener('dragover', e => e.preventDefault());
paste.addEventListener('drop', e => { const f = e.dataTransfer?.files?.[0]; if(f?.type.startsWith('image/')){ e.preventDefault(); readShot(f); } });

/* Önbelleği atlayarak tüm site dosyalarını yeniden indirir, sonra sayfayı yeniler (envanter localStorage'da kalır).
   shortcut: dosya listesi elle tutuluyor, yeni dosya eklenince buraya da eklenmeli. */
const SITE_FILES = ['./', 'style.css', 'js/main.js', 'js/ocr.js', 'js/api.js', 'js/data.js', 'js/parser.js', 'js/state.js', 'js/stats.js', 'js/ui.js'];
const btnReload = document.getElementById('btnReload');
btnReload.addEventListener('click', async () => {
  btnReload.disabled = true; btnReload.textContent = 'Updating…';
  await Promise.all(SITE_FILES.map(f => fetch(f, { cache:'reload' }).catch(() => {})));
  location.reload();
});

initUI({ remove: removeMon, clearAll });
loadInventory();