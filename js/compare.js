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
  return `${esc(m.nature)}${ni?.inc && ni?.dec ? ` <i class="up">▲${k(ni.inc)}</i> <i class="down">▼${k(ni.dec)}</i>` : ''}`; };
const abilText = m => { const n = m.abName ?? m.ability, ha = m.eff?.hiddenAb, isHA = ha && norm(n) === norm(ha);
  return `${esc(n)}${isHA ? ' <em class="ha">HA</em>' : ''}`; };

const STAT_VAR = { HP: 'hp', Atk: 'atk', Def: 'def', SpA: 'spa', SpD: 'spd', Spe: 'spe' };
const who = m => `<img alt=""><div class="cc-name"><b>${esc(m.eff?.label ?? m.name)}</b><span>Lv.${m.view?.lvl100 ? 100 : (m.level ?? '?')}${gameId(m) ? ` · ID ${idHTML(gameId(m))}` : ''}</span></div>`;
const tags = m => `<div class="cc-tags"><span class="tag">${natText(m)}</span><span class="tag">${abilText(m)}</span><span class="tag mute">IV Σ ${sum(m.ivs)} · EV Σ ${sum(m.evs)}</span></div>`;

/** Bir stat karosu: etiket, değer + sıra, 0'dan başlayan ölçekli çubuk (ortak maks), alt satırda IV/EV */
function tile({ label, v, rank, n, lo, hi, max, color, sub = '', dim = false, big = false, mark = '' }){
  if(v == null) return `<div class="st na"><span class="st-l">${label}</span><span class="st-v">…</span></div>`;
  const cls = hi !== lo ? (rank === 1 ? ' best' : v === lo ? ' worst' : '') : '';   // hepsi eşitse çerçeve yok
  return `<div class="st${cls}${dim ? ' dim' : ''}${big ? ' big' : ''}" style="--c:${color};--p:${max ? (100 * v / max).toFixed(1) : 0}%">` +
    `<span class="st-l">${label}${mark ? `<i class="${mark}">${mark === 'up' ? '▲' : '▼'}</i>` : ''}</span>` +
    `<span class="st-v"><b>${v}</b><small title="${t('Rank {r} of {n}', { r: rank, n })}">#${rank}/${n}</small></span>` +
    `<span class="st-m"><i></i></span>${sub ? `<small class="st-s">${sub}</small>` : ''}</div>`;
}

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
  const card = i => { const m = list[i];
    return `<article class="cc"><header class="cc-id">${who(m)}${tags(m)}</header><div class="cc-stats">` +
      KEYS.map((k, j) => tile({ label: LABEL[k], v: per[j].v[i], rank: per[j].r[i], n, lo: per[j].lo, hi: per[j].hi, max: per[j].hi,
        color: `var(--${STAT_VAR[k]})`, sub: `IV ${STATS.get(m.ivs, k)} · EV ${STATS.get(m.evs, k)}`, dim: imp.size > 0 && !imp.has(k), mark: natMark(m, k) })).join('') +
      tile({ label: `${t('Overall')} Σ`, v: overall[i], rank: oRank[i], n, lo: oLo, hi: oHi, max: oHi, color: 'var(--accent)', big: true }) +
      '</div></article>'; };
  $('#cmpBody').innerHTML = `<div class="cmp-list ${lay}">${order.map(card).join('')}</div>`;
  $('#cmpBody').querySelectorAll('.cc img').forEach((img, r) => setImg(img, list[order[r]].imgs, list[order[r]]));
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
