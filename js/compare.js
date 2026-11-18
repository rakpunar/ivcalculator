/* Seçili Pokémon'ları hesaplanmış statlara (base + IV + EV + nature + seviye) göre karşılaştırır.
   Her stat için sıralama (#1 yeşil, en kötü kırmızı çerçeve); "önemli" işaretlenen statların toplamıyla genel sıralama, canlı hesaplanır.
   Nature, ability (+ gizli ability), IV/EV görünür; yerleşim yatay (satır = Pokémon) ya da dikey (sütun = Pokémon), son seçim hatırlanır. */
import { mons, on } from './state.js';
import { calcMon } from './stats.js';
import { STATS, STAT_API_TO_KEY } from './data.js';
import { setImg, gameId, idHTML } from './ui.js';
import { t } from './i18n.js';

const KEYS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
const LABEL = { HP: 'HP', Atk: 'ATK', Def: 'DEF', SpA: 'SPATK', SpD: 'SPDEF', Spe: 'SPD' };
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const norm = x => String(x ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const LS = 'ivcalc.cmp.layout';
let list = [], imp = new Set(KEYS);      // karşılaştırılan Pokémon, önemli statlar
let lay = (() => { try{ return localStorage.getItem(LS) === 'v' ? 'v' : 'h'; }catch(e){ return 'h'; } })();

/** yarışma sıralaması (1,1,3): değeri olmayanlar (null) sıralanmaz */
const rankOf = vals => vals.map(v => v == null ? null : 1 + vals.filter(x => x != null && x > v).length);
const total = (m, keys) => keys.reduce((s, k) => s + (m.calc?.[k] ?? 0), 0);
const sum = (o, keys = KEYS) => keys.reduce((s, k) => s + STATS.get(o, k), 0);

const natMark = (m, k) => m.natureInfo?.inc && STAT_API_TO_KEY[m.natureInfo.inc] === k ? 'up' : m.natureInfo?.dec && STAT_API_TO_KEY[m.natureInfo.dec] === k ? 'down' : '';
const natText = m => { const ni = m.natureInfo, k = x => LABEL[STAT_API_TO_KEY[x]];
  return `${esc(m.nature)}${ni?.inc && ni?.dec ? ` <small><i class="up">▲${k(ni.inc)}</i> <i class="down">▼${k(ni.dec)}</i></small>` : ''}`; };
const abilText = m => { const n = m.abName ?? m.ability, ha = m.eff?.hiddenAb, isHA = ha && norm(n) === norm(ha);
  return `${esc(n)}${isHA ? ' <small class="ha">HA</small>' : ''}${ha && !isHA ? `<small>HA: ${esc(ha)}</small>` : ''}`; };

function cell(v, rank, n, lo, hi, sub = ''){
  if(v == null) return '<td class="na">…</td>';
  const cls = hi !== lo ? (rank === 1 ? ' best' : v === lo ? ' worst' : '') : '';   // hepsi eşitse çerçeve yok
  return `<td class="${cls.trim()}"><b>${v}</b> <small title="${t('Rank {r} of {n}', { r: rank, n })}">#${rank}/${n}</small>${sub}</td>`;
}
const sub = (m, k) => `<small class="ivev ${natMark(m, k)}">IV ${STATS.get(m.ivs, k)} · EV ${STATS.get(m.evs, k)}</small>`;
const who = m => `<img width="40" height="40" alt=""><span>${esc(m.eff?.label ?? m.name)}<small>Lv.${m.view?.lvl100 ? 100 : (m.level ?? '?')}</small>${gameId(m) ? `<small>ID ${idHTML(gameId(m))}</small>` : ''}</span>`;

function render(){
  const keys = imp.size ? [...imp] : KEYS, n = list.length;
  $('#cmpImp').innerHTML = `<span class="tb-lbl">${t('Important stats')}:</span>` + KEYS.map(k =>
    `<button type="button" class="cmpchip${imp.has(k) ? ' on' : ''}" data-k="${k}" aria-pressed="${imp.has(k)}">${LABEL[k]}</button>`).join('') +
    `<span class="cmp-lay" role="group" aria-label="${t('Layout')}"><button type="button" class="cmpchip${lay === 'h' ? ' on' : ''}" data-lay="h" aria-pressed="${lay === 'h'}" title="${t('Horizontal')}">⇆ ${t('Horizontal')}</button><button type="button" class="cmpchip${lay === 'v' ? ' on' : ''}" data-lay="v" aria-pressed="${lay === 'v'}" title="${t('Vertical')}">⇅ ${t('Vertical')}</button></span>`;
  const overall = list.map(m => m.calc ? total(m, keys) : null), oRank = rankOf(overall);
  const order = list.map((_, i) => i).sort((a, b) => (oRank[a] ?? 99) - (oRank[b] ?? 99));
  const per = KEYS.map(k => { const v = list.map(m => m.calc?.[k] ?? null); const r = rankOf(v), f = v.filter(x => x != null);
    return { v, r, lo: Math.min(...f), hi: Math.max(...f) }; });
  const oF = overall.filter(x => x != null), oLo = Math.min(...oF), oHi = Math.max(...oF);
  const oCell = i => cell(overall[i], oRank[i], n, oLo, oHi);
  const sCell = (j, i) => cell(per[j].v[i], per[j].r[i], n, per[j].lo, per[j].hi, sub(list[i], KEYS[j]));
  const oTh = `${t('Overall')} <small>(Σ ${keys.map(k => LABEL[k]).join('+')})</small>`;
  const thCls = k => imp.size && !imp.has(k) ? '' : 'imp';
  const info = i => `<td class="info">IV Σ ${sum(list[i].ivs)} · EV Σ ${sum(list[i].evs)}</td>`;

  if(lay === 'h'){
    $('#cmpBody').innerHTML = `<table class="cmptbl"><thead><tr><th>Pokémon</th><th>${t('Nature')}</th><th>${t('Ability')}</th>` +
      KEYS.map(k => `<th class="${thCls(k)}">${LABEL[k]}</th>`).join('') + `<th class="imp">${oTh}</th></tr></thead><tbody>` +
      order.map(i => { const m = list[i];
        return `<tr><td class="who">${who(m)}<small class="sumline">IV Σ ${sum(m.ivs)} · EV Σ ${sum(m.evs)}</small></td><td class="txt">${natText(m)}</td><td class="txt">${abilText(m)}</td>` +
          KEYS.map((_, j) => sCell(j, i)).join('') + oCell(i) + '</tr>'; }).join('') + '</tbody></table>';
  } else {
    $('#cmpBody').innerHTML = `<table class="cmptbl vert"><thead><tr><th></th>` +
      order.map(i => `<th class="whoh"><div class="who">${who(list[i])}</div></th>`).join('') + `</tr></thead><tbody>` +
      `<tr><th>${t('Nature')}</th>${order.map(i => `<td class="txt">${natText(list[i])}</td>`).join('')}</tr>` +
      `<tr><th>${t('Ability')}</th>${order.map(i => `<td class="txt">${abilText(list[i])}</td>`).join('')}</tr>` +
      KEYS.map((k, j) => `<tr><th class="${thCls(k)}">${LABEL[k]}</th>${order.map(i => sCell(j, i)).join('')}</tr>`).join('') +
      `<tr><th class="imp">${oTh}</th>${order.map(i => oCell(i)).join('')}</tr>` +
      `<tr><th>IV / EV</th>${order.map(i => info(i)).join('')}</tr></tbody></table>`;
  }
  $('#cmpBody').querySelectorAll('img').forEach((img, r) => setImg(img, list[order[r]].imgs, list[order[r]]));
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
  $('#cmpImp').addEventListener('click', e => { const b = e.target.closest('button'); if(!b) return;
    if(b.dataset.lay){ lay = b.dataset.lay; try{ localStorage.setItem(LS, lay); }catch(err){} }
    else if(b.dataset.k) imp.has(b.dataset.k) ? imp.delete(b.dataset.k) : imp.add(b.dataset.k);
    else return;
    render(); });
}
