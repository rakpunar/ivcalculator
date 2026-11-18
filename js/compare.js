/* Seçili Pokémon'ları hesaplanmış statlara (base + IV + EV + nature + seviye) göre karşılaştırır.
   Her stat için sıralama (#1 yeşil, en kötü kırmızı çerçeve); "önemli" işaretlenen statların toplamıyla genel sıralama, canlı hesaplanır. */
import { mons, on } from './state.js';
import { calcMon } from './stats.js';
import { setImg } from './ui.js';
import { t } from './i18n.js';

const KEYS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
const LABEL = { HP: 'HP', Atk: 'ATK', Def: 'DEF', SpA: 'SPATK', SpD: 'SPDEF', Spe: 'SPD' };
const $ = s => document.querySelector(s);
let list = [], imp = new Set(KEYS);      // karşılaştırılan Pokémon, önemli statlar

/** yarışma sıralaması (1,1,3): değeri olmayanlar (null) sıralanmaz */
const rankOf = vals => vals.map(v => v == null ? null : 1 + vals.filter(x => x != null && x > v).length);
const total = (m, keys) => keys.reduce((s, k) => s + (m.calc?.[k] ?? 0), 0);

function cell(v, rank, n, lo, hi){
  if(v == null) return '<td class="na">…</td>';
  const cls = hi !== lo ? (rank === 1 ? ' best' : v === lo ? ' worst' : '') : '';   // hepsi eşitse çerçeve yok
  return `<td class="${cls.trim()}"><b>${v}</b> <small title="${t('Rank {r} of {n}', { r: rank, n })}">#${rank}/${n}</small></td>`;
}

function render(){
  const keys = imp.size ? [...imp] : KEYS, n = list.length;
  $('#cmpImp').innerHTML = `<span class="tb-lbl">${t('Important stats')}:</span>` + KEYS.map(k =>
    `<button type="button" class="cmpchip${imp.has(k) ? ' on' : ''}" data-k="${k}" aria-pressed="${imp.has(k)}">${LABEL[k]}</button>`).join('');
  const overall = list.map(m => m.calc ? total(m, keys) : null), oRank = rankOf(overall);
  const order = list.map((_, i) => i).sort((a, b) => (oRank[a] ?? 99) - (oRank[b] ?? 99));
  const per = KEYS.map(k => { const v = list.map(m => m.calc?.[k] ?? null); const r = rankOf(v), f = v.filter(x => x != null);
    return { v, r, lo: Math.min(...f), hi: Math.max(...f) }; });
  const oF = overall.filter(x => x != null), oLo = Math.min(...oF), oHi = Math.max(...oF);
  $('#cmpBody').innerHTML = `<table class="cmptbl"><thead><tr><th>Pokémon</th>` +
    KEYS.map(k => `<th class="${imp.size && !imp.has(k) ? '' : 'imp'}">${LABEL[k]}</th>`).join('') + `<th class="imp">${t('Overall')} <small>(Σ ${keys.map(k => LABEL[k]).join('+')})</small></th></tr></thead><tbody>` +
    order.map(i => { const m = list[i];
      return `<tr><td class="who"><img width="40" height="40" alt=""><span>${m.eff?.label ?? m.name}<small>Lv.${m.view?.lvl100 ? 100 : (m.level ?? '?')}</small></span></td>` +
        KEYS.map((k, j) => cell(per[j].v[i], per[j].r[i], n, per[j].lo, per[j].hi)).join('') +
        cell(overall[i], oRank[i], n, oLo, oHi) + '</tr>'; }).join('') + '</tbody></table>';
  $('#cmpBody').querySelectorAll('tbody tr').forEach((tr, r) => setImg(tr.querySelector('img'), list[order[r]].imgs));
}

async function open(){
  list = mons.filter(m => m.sel);
  await Promise.all(list.map(async m => { if(m.calc === undefined) m.calc = await calcMon(m).catch(() => null); }));
  render(); $('#cmpDlg').showModal();
}

export function initCompare(){
  const btn = $('#btnCmp');
  const sync = () => { const n = mons.filter(m => m.sel).length; btn.disabled = n < 2; btn.textContent = `⚖ ${t('Compare')}${n ? ` (${n})` : ''}`; };
  on('grid', sync); addEventListener('langchange', sync); sync();
  btn.addEventListener('click', open);
  $('#cmpImp').addEventListener('click', e => { const k = e.target.dataset.k; if(!k) return; imp.has(k) ? imp.delete(k) : imp.add(k); render(); });
}
