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
    text:`✔ ${mon.name} envantere eklendi (IV toplam: ${[...Object.entries(mon.ivs)].reduce((s,[,v])=>s+v,0)}/186) — detayları arka planda çekiliyor.`
  });
  paste.value = '';
});

initUI({ remove: removeMon, clearAll });
loadInventory();