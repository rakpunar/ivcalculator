/* UI: envanter grid (template), modal (template), tooltip, mesajlar */
import { STAT_ORDER, STAT_COLORS, STATS, CAT_ICON } from './data.js';
import { natureDesc, moveMeta, imgSrc } from './api.js';
import { calcMon, effLevel } from './stats.js';
import { mons, on, setView, bulkView, stageAvailable, megaAvailable, setSel, selectAll, refreshView } from './state.js';

const $  = sel => document.querySelector(sel);
const grid = $('#grid');
const overlay = $('#overlay');
const modal = $('#modal');
const tooltip = $('#tooltip');

let modalMon = null;
let removeMonRef = null;   // main.js enjekte eder
let clearAllRef = null;    // main.js enjekte eder

/* ---------- yardımcılar ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tv = m => STATS.totalIV(m.ivs);
const API_STAT = { hp:'HP', attack:'Atk', defense:'Def', 'special-attack':'SpA', 'special-defense':'SpD', speed:'Spe' };

function typeChips(types){
  if(!types?.length) return '';
  return types.map(t => `<span class="type-icon t-${t}" title="${t[0].toUpperCase()+t.slice(1)} type">${t.toUpperCase()}</span>`).join('');
}

function setImg(img, primary, fallback){
  img.loading = 'lazy';
  img.onerror = () => { img.onerror = null; img.src = fallback || ''; };
  imgSrc(primary || fallback || '').then(src => { img.src = src; });
}

function colorForValue(v, sorted){
  const r = sorted.indexOf(v);
  const t = sorted.length>1 ? r/(sorted.length-1) : 0;
  return `hsl(${130 - 130*t},60%,58%)`; // yeşil → kırmızı
}

/* ---------- grid ---------- */
const pretty = slug => slug.replace(/-/g,' ').replace(/\b\w/g, c => c.toUpperCase());
const effStage = m => stageAvailable(m, m.view.stage) ? m.view.stage : 'current';
const isMega  = m => !!m.view.mega && !!m.opts?.hasMega;

/* Segmented radio: gizli input + stilize span (klavye/erişilebilirlik korunur) */
const seg = (name, items, val) => `<div class="seg" role="radiogroup">${items.map(o =>
  `<label${o.dis ? ' class="dis"' : ''} title="${esc(o.title || '')}"><input type="radio" name="${name}" value="${o.v}"${o.v === val ? ' checked' : ''}${o.dis ? ' disabled' : ''}><span>${o.t}</span></label>`).join('')}</div>`;
const pick = (cls, items, val) => `<select class="pick ${cls}">${items.map(v =>
  `<option value="${v}"${v === val ? ' selected' : ''}>${esc(pretty(v))}</option>`).join('')}</select>`;

function ctrlHTML(m, i){ // i: radyo grup adı eki (kart indeksi veya 'M' = modal)
  if(!m.opts) return '<span class="na">…</span>';
  const o = m.opts, v = m.view, st = effStage(m);
  const stages = [{ v:'current', t:'Current' },
    { v:'final', t:'Final', dis:!o.finals.length, title:o.finals.length ? 'Show final evolution' : 'No further evolution' }];
  let h = seg('lv' + i, [{ v:'cur', t:'Lv. ' + (m.level ?? '?') }, { v:'100', t:'Lv. 100' }], v.lvl100 ? '100' : 'cur')
        + seg('st' + i, stages, st);
  if(o.hasMega) h += seg('mg' + i, [{ v:'off', t:'Normal' }, { v:'on', t:'Mega' }], v.mega ? 'on' : 'off');
  if(st === 'final' && !v.mega && o.finals.length > 1) h += pick('pk-final', o.finals, v.finalPick ?? o.finals[0]);
  if(v.mega && o.megas.length > 1) h += pick('pk-mega', o.megas, v.megaPick ?? o.megas[0]);
  if(o.forms.length > 1) h += pick('pk-form', o.forms, o.curForm);
  return h;
}

export function renderGrid(){
  $('#count').textContent = mons.length;
  const slot = $('#emptySlot'); slot.remove();
  grid.innerHTML = '';
  mons.forEach((m,i)=>{
    const node = $('#tpl-card').content.firstElementChild.cloneNode(true);
    node.dataset.i = i;
    node.querySelector('.name').textContent = (m.eff?.label ?? m.name) + (m.loading ? ' ⏳' : '');
    node.querySelector('.lvl').textContent = `Lv. ${m.view.lvl100 ? 100 : (m.level ?? '?')} · ${m.nature} Nature`;
    node.querySelector('.ability').textContent = m.abName ?? m.ability;
    node.querySelector('.ability').classList.toggle('ab-bad', m.abName === 'Unknown');
    node.querySelector('.iv-sum').textContent = `${tv(m)} / 186`;
    node.querySelector('.ivbadge .tv').textContent = tv(m);
    node.querySelector('.types').innerHTML = typeChips(m.types);
    if(m.opts?.hasMega) node.querySelector('.tags').innerHTML = isMega(m)
      ? '<span class="tag mega on" title="Showing Mega Evolution">MEGA</span>'
      : '<span class="tag mega" title="This Pokémon has a Mega Evolution">★ Mega available</span>';
    node.querySelector('.ctrl').innerHTML = ctrlHTML(m, i);
    node.classList.toggle('picked', !!m.sel);
    node.querySelector('.sel input').checked = !!m.sel;
    setImg(node.querySelector('img'), m.sprite, m.art);
    node.querySelector('.del').addEventListener('click', e => { e.stopPropagation(); removeMonRef(i); });
    node.querySelector('.lvl').addEventListener('mouseenter', e => showNatureTip(e, m));
    node.querySelector('.lvl').addEventListener('mouseleave', hideTip);
    node.querySelector('.ability').addEventListener('mouseenter', e => showAbilityTip(e, m));
    node.querySelector('.ability').addEventListener('mouseleave', hideTip);
    node.addEventListener('click', e => { if(!e.target.closest('.ctrl,.sel,.del')) openModal(m); });
    grid.appendChild(node);
  });
  grid.appendChild(slot);
  renderToolbar();
}

/* Toplu kontroller + IV toplamları */
function renderToolbar(){
  const n = mons.length, sel = mons.filter(m => m.sel);
  const sum = list => list.reduce((s,m) => s + tv(m), 0);
  $('#totals').innerHTML =
    `<span>List total IV <b>${sum(mons)}</b> <small>/ ${n*186} · ${n} Pokémon</small></span>` +
    `<span>Selected total IV <b>${sum(sel)}</b> <small>/ ${sel.length*186} · ${sel.length} selected</small></span>`;

  const all = fn => n > 0 && mons.every(fn);
  const lv = all(m => m.view.lvl100) ? '100' : all(m => !m.view.lvl100) ? 'cur' : '';
  const stageOn = s => { const ap = mons.filter(m => stageAvailable(m, s));
    return ap.length > 0 && ap.every(m => effStage(m) === s); };
  const st = ['current','final'].find(stageOn) ?? '';
  const mg = mons.filter(megaAvailable);
  const mgv = !mg.length ? '' : mg.every(isMega) ? 'on' : mg.every(m => !isMega(m)) ? 'off' : '';
  $('#bulk').innerHTML = `<span class="tb-lbl">${sel.length ? 'Selected' : 'All'}:</span>` +
    seg('bulk-lv', [{ v:'cur', t:'Current Lv.' }, { v:'100', t:'Lv. 100' }], lv) +
    seg('bulk-st', [{ v:'current', t:'Current' }, { v:'final', t:'Final' }], st) +
    seg('bulk-mg', [{ v:'off', t:'Normal' }, { v:'on', t:'Mega' }], mgv);
}

/* kart ve modaldaki ortak kontroller (seviye / evrim / mega / form) */
function handleCtrl(m, t){
  if(t.name?.startsWith('lv')) setView(m, { lvl100: t.value === '100' });
  else if(t.name?.startsWith('st')) setView(m, { stage: t.value });
  else if(t.name?.startsWith('mg')) setView(m, { mega: t.value === 'on' });
  else if(t.classList.contains('pk-form'))  setView(m, { form: t.value });
  else if(t.classList.contains('pk-final')) setView(m, { finalPick: t.value });
  else if(t.classList.contains('pk-mega'))  setView(m, { megaPick: t.value });
}

function initToolbar(){
  $('#btnSelAll').addEventListener('click',  () => selectAll(() => true));
  $('#btnSelNone').addEventListener('click', () => selectAll(() => false));
  $('#btnSelInv').addEventListener('click',  () => selectAll(m => !m.sel));
  $('#bulk').addEventListener('change', e => {
    if(e.target.name === 'bulk-lv') bulkView({ lvl100: e.target.value === '100' });
    else if(e.target.name === 'bulk-st') bulkView({ stage: e.target.value });
    else if(e.target.name === 'bulk-mg') bulkView({ mega: e.target.value === 'on' }); // sadece mega'sı olanlara
  });
  // kart içi kontroller (event delegation; kartlar her çizimde yenilenir)
  grid.addEventListener('change', e => {
    const card = e.target.closest('.card'); if(!card) return;
    const m = mons[+card.dataset.i];
    if(e.target.closest('.sel')) setSel(m, e.target.checked);
    else handleCtrl(m, e.target);
  });
  modal.addEventListener('change', e => { if(modalMon) handleCtrl(modalMon, e.target); });
  modal.addEventListener('click', e => { // stat buff/debuff: data-b = stat anahtarı veya 'all', data-d = değişim (0 = sıfırla)
    const b = e.target.closest('[data-b]'); if(!b || !modalMon || b.disabled) return;
    const m = modalMon, d = +b.dataset.d, keys = b.dataset.b === 'all' ? BUFF_KEYS : [b.dataset.b];
    m.buff ??= {};
    keys.forEach(k => { m.buff[k] = d ? Math.max(-6, Math.min(6, (m.buff[k] || 0) + d)) : 0; });
    renderModal(m);
  });
}

/* ---------- modal ---------- */
function openModal(m){
  modalMon = m;
  overlay.classList.add('open');
  renderModal(m);
}

export function closeModal(){ overlay.classList.remove('open'); modalMon = null; }

/* Buff/debuff kademeleri (-6..+6, HP hariç): çarpan (2+n)/2, negatifte 2/(2-n). Yalnızca oturum içi, kaydedilmez. */
const BUFF_KEYS = ['Atk','Def','SpA','SpD','Spe'];
const buffMult = n => n >= 0 ? (2 + n) / 2 : 2 / (2 - n);
const buffBtns = (b, n) => [[-6,'−6'],[-2,'−2'],[-1,'−1'],[1,'+1'],[2,'+2'],[6,'+6']].map(([d,t]) =>
  `<button class="bf${d<0?' neg':''}" data-b="${b}" data-d="${d}"${(d>0 && n>=6) || (d<0 && n<=-6) ? ' disabled' : ''}>${t}</button>`).join('')
  + `<button class="bf rst" data-b="${b}" data-d="0" title="Reset"${n ? '' : ' disabled'}>↺</button>`;

function statVal(m, k){
  const n = m.buff?.[k] || 0, v = m.calc[k];
  return n ? `<b class="${n>0?'buffed':'debuffed'}">${Math.floor(v * buffMult(n))}</b> <small title="Base value">(${v}, ${n>0?'+':''}${n})</small>` : v;
}

function renderModal(m){
  // veri hazır değilse arka planda çekeceğiz; bu render anlık durumu gösterir
  if(m.calc === undefined){
    calcMon(m).then(c => {
      m.calc = c;
      if(modalMon === m) renderModal(m);
    }).catch(() => { m.calc = null; });
  }
  const root = $('#tpl-modal').content.cloneNode(true);

  root.querySelector('.types').innerHTML = typeChips(m.types) || '<span class="na">loading types…</span>';
  root.querySelector('.name').textContent = m.eff?.label ?? m.name;
  root.querySelector('.lvl').textContent = `Lv. ${m.view.lvl100 ? 100 : (m.level ?? '?')}`;
  root.querySelector('.secstats').textContent = `Stats — Lv.${effLevel(m)} · IV · EV`;
  root.querySelector('.thlv').textContent = `Lv.${effLevel(m)}`;
  root.querySelector('.m-ctrl').innerHTML = ctrlHTML(m, 'M');
  root.querySelector('.lvl-extra').textContent = m.tera ? 'Tera: ' + m.tera : '';
  setImg(root.querySelector('img'), m.art, m.sprite);
  root.querySelector('.tv').textContent = tv(m);
  root.querySelector('.tvsum').textContent = tv(m);
  root.querySelector('.tvbar').style.width = (tv(m)/186*100).toFixed(1) + '%';

  // Stat dağılımı tablosu
  const ascKey = m.natureInfo?.inc, dscKey = m.natureInfo?.dec;
  const arrow = k => (ascKey && API_STAT[ascKey]===k ? ' <span class="arrow-alert" title="Nature artış">▲</span>'
                  :   dscKey && API_STAT[dscKey]===k ? ' <span class="arrow-down" title="Nature azalış">▼</span>' : '');
  root.querySelector('#statBody').innerHTML = STAT_ORDER.map(s=>`
    <tr>
      <td style="color:${STAT_COLORS[s.key]}">${s.label}${arrow(s.key)}</td>
      <td class="v100">${m.calc?.[s.key]!=null ? statVal(m, s.key) : '<span class="na">…</span>'}</td>
      <td class="iv">${STATS.get(m.ivs,s.key)}</td>
      <td class="ev">${STATS.get(m.evs,s.key)}</td>
      <td class="bfc">${BUFF_KEYS.includes(s.key) ? buffBtns(s.key, m.buff?.[s.key] || 0) : '<span class="na">—</span>'}</td>
    </tr>`).join('');
  root.querySelector('#buffAll').innerHTML = '<b>All stats:</b> ' + buffBtns('all', 0).replace(' disabled','');

  // Base stat tablosu (sıra = Stat Dağılımı; renk = değere göre yeşil→kırmızı)
  root.querySelector('#baseBody').innerHTML = m.base
    ? baseTableRows(m) : '<tr><td colspan="2" class="na">çekiliyor…</td></tr>';

  // Hamleler (tablo)
  root.querySelector('#movesBody').innerHTML = moveRows(m);

  // Alt orta blok: ability + nature adı/açıklaması (hamleler ve base statların altında, ortalanmış)
  root.querySelector('.fAbility').innerHTML =
    `<b>Ability:</b> <span class="abl${m.abName === 'Unknown' ? ' ab-bad' : ''}">${esc(m.abName ?? m.ability)}</span> — ${m.abDesc != null ? esc(m.abDesc) : 'loading…'}`;
  root.querySelector('.fNature').innerHTML =
    `<b>Nature:</b> <b>${esc(m.nature)}</b> — ${m.natDesc != null ? esc(m.natDesc) : 'loading…'}`;

  modal.innerHTML = '';
  modal.appendChild(root);
  modal.querySelector('.close').addEventListener('click', closeModal);

  // Hamle tooltip'leri
  modal.querySelectorAll('.movelink').forEach(el => {
    el.addEventListener('mouseenter', e => showMoveTip(e, el.dataset.move, m));
    el.addEventListener('mouseleave', hideTip);
  });

  // eksik veriyi arka planda çek, gelince tekrar çiz
  fetchModalData(m);
}

/* Hamle tooltip: tür + kategori ikonu + Power/Acc/PP + açıklama */
function showMoveTip(e, mv, m){
  tooltip.innerHTML = `<b>${esc(mv)}</b><br><span class="skel">Loading…</span>`;
  placeTip(e);
  moveMeta(mv).then(d => {
    if(m.moveMeta) m.moveMeta[mv] = d; else m.moveMeta = {[mv]: d};
    const bits = [
      `<span class="type-icon t-${d.type}" style="width:auto;padding:1px 7px">${d.type.toUpperCase()}</span>`,
    ];
    if(CAT_ICON[d.cat]) bits.push(`<img class="caticon" src="${CAT_ICON[d.cat].icon}" width="27" height="18" alt="${CAT_ICON[d.cat].label}" title="${CAT_ICON[d.cat].label}">`);
    bits.push(`Pwr: <b>${d.power ?? '—'}</b>`, `Acc: <b>${d.accuracy ?? '—'}%</b>`, `PP: <b>${d.pp ?? '—'}</b>`);
    tooltip.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:5px">${bits.join('')}</div>
      <b>${esc(mv)}</b><br>${esc(d.desc || 'No description available.')}`;
  }).catch(() => { tooltip.innerHTML = `<b>${esc(mv)}</b><br><i>Could not load data.</i>`; });
}

// Base statlar: sırada Stat Dağılımı ile aynı; renk Pokémon'un kendi değer sırasına göre (yeşil→kırmızı)
function baseTableRows(m){
  const vals = STAT_ORDER.map(s=>m.base.stats[s.key]);
  const sorted = [...vals].sort((a,b)=>b-a);
  const MAX_BASE = 255; // barın uzunluğu her zaman tür üst sınırına göre
  return STAT_ORDER.map((s,i)=>{
    const v = vals[i];
    const width = Math.min(100, (v/MAX_BASE*100)).toFixed(1);
    return `
    <tr>
      <td style="color:${STAT_COLORS[s.key]}">${s.label}</td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="flex:1;height:9px;background:#1a2230;border-radius:5px;overflow:hidden">
            <div style="width:${width}%;height:100%;background:${colorForValue(v,sorted)};border-radius:5px"></div>
          </div>
          <span style="width:40px;text-align:right;color:#fff">${v}</span>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function moveRows(m){
  const metas = m.moveMeta || {};
  if(!m.moves.length) return '<tr><td colspan="3" class="na">no moves</td></tr>';
  return m.moves.map(mv=>{
    const mt = metas[mv];
    const tdType = mt ? `<td class="c-type"><span class="type-icon t-${mt.type}">${mt.type.toUpperCase()}</span></td>` : '<td class="c-type na">…</td>';
    const tdCat = mt && CAT_ICON[mt.cat]
      ? `<td class="c-cat"><img class="caticon" src="${CAT_ICON[mt.cat].icon}" width="27" height="18" alt="${CAT_ICON[mt.cat].label}" title="${CAT_ICON[mt.cat].label}"></td>`
      : '<td class="c-cat na">…</td>';
    return `<tr>
      ${tdType}${tdCat}
      <td class="c-name"><span class="movelink" data-move="${esc(mv)}">${esc(mv)}</span></td>
    </tr>`;
  }).join('');
}

/* modal verisi yoksa arka planda tek seferlik çek (promise-cache → çift fetch yok) */
function fetchModalData(m){
  if(m.natDesc == null && !m._natTried){
    m._natTried = true;
    natureDesc(m.nature).then(d => { m.natDesc = d; if(modalMon===m) renderModal(m); })
      .catch(() => { if(modalMon===m) renderModal(m); });
  }
  if(!m.base){
    refreshView(m).then(() => { if(modalMon===m) renderModal(m); }).catch(() => {});
  }
}

/* ---------- tooltip ---------- */
function placeTip(e){
  tooltip.style.display = 'block';
  const pos = e.target.getBoundingClientRect();
  tooltip.style.left = Math.min(innerWidth - tooltip.offsetWidth - 10, pos.left) + 'px';
  tooltip.style.top  = (pos.bottom + 8) + 'px';
}
function hideTip(){ tooltip.style.display = 'none'; }

function showAbilityTip(e, m){
  const n = esc(m.abName ?? m.ability);
  tooltip.innerHTML = `<b>${n}</b><br>` + (m.abDesc != null ? esc(m.abDesc) : '<span class="skel">Loading…</span>');
  placeTip(e);
}
function showNatureTip(e, m){
  tooltip.innerHTML = `<b>${esc(m.nature)} Nature</b><br><span class="skel">Loading…</span>`;
  placeTip(e);
  natureDesc(m.nature).then(d => { tooltip.innerHTML = `<b>${esc(m.nature)} Nature</b><br>${esc(d)}`; })
    .catch(() => { tooltip.innerHTML = `<b>${esc(m.nature)} Nature</b><br><i>Could not load description.</i>`; });
}

/* ---------- mesaj / kuyruk göstergesi ---------- */
export function showMessage({type, text}){
  const msg = $('#msg');
  msg.className = 'msg ' + type; msg.textContent = text;
  clearTimeout(msg._t);
  msg._t = setTimeout(()=>msg.className='msg', 5000);
}
export function showQueue(remaining){
  const st = $('#status');
  if(remaining > 0){
    st.textContent = `⏳ Arka planda ${remaining} Pokémon'un verileri sırayla çekiliyor…`;
    st.classList.add('show');
  } else st.classList.remove('show');
}

/* ---------- init ---------- */
export function initUI({ remove, clearAll }){
  removeMonRef = remove;
  clearAllRef = clearAll;
  $('#btnClear').addEventListener('click', () => {
    if(!mons.length) return;
    if(confirm("All Pokémon will be removed from the inventory. Are you sure?")) clearAllRef();
  });
  overlay.addEventListener('click', e => { if(e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });

  initToolbar();
  on('grid', renderGrid);   // envanter değişince yeniden çiz
  on('mon',  mon => { if(modalMon === mon) renderModal(mon); }); // kuyruktan veri gelince modal güncellenir
  on('msg',  showMessage);
  on('queue', showQueue);
  renderGrid();
}