/* Tarayıcı alert/confirm yerine site tasarımına uygun onay/bilgi kutusu: yerel <dialog closedby="any"> (Esc + dışarı tıklama kapatır).
   Tamam → true, İptal/Esc/dışarı → false. */
import { t } from './i18n.js';

export function confirmBox(text, { ok = 'OK', danger = false, cancel = true } = {}){
  const d = document.querySelector('#dlg'), b = d.querySelector('[value=ok]');
  d.querySelector('p').textContent = text;
  b.textContent = t(ok); b.classList.toggle('danger', danger); d.querySelector('[value=cancel]').hidden = !cancel;
  return new Promise(res => {
    d.addEventListener('close', () => res(d.returnValue === 'ok'), { once: true });
    d.returnValue = ''; d.showModal(); b.focus();
  });
}
export const noticeBox = text => confirmBox(text, { cancel: false });
