/* UI: envanter grid (template), modal (template), tooltip, mesajlar */
import { STAT_ORDER, STAT_COLORS, STATS, TYPE_COLORS, CAT_INFO } from './data.js';
import { abilityDesc, natureDesc, baseStats } from './api.js';
import { calcMon } from './stats.js';
import { mons, on } from './state.js';

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
  return types.map(t => `<span class="type" style="background:${TYPE_COLORS[t]||'#666'}">${t}</span>`).join('');
}

function setImg(img, primary, fallback){
  img.onerror = () => { img.onerror = null; img.src = fallback; };
  img.src = primary;
}

function colorForValue(v, sorted){
  const r = sorted.indexOf(v);
  const t = sorted.length>1 ? r/(sorted.length-1) : 0;
  return `hsl(${130 - 130*t},60%,58%)`; // yeşil → kırmızı
}

/* ---------- grid ---------- */
export function renderGrid(){
  $('#count').textContent = mons.length;
  const slot = $('#emptySlot'); slot.remove();
  grid.innerHTML = '';
  mons.forEach((m,i)=>{
    const node = $('#tpl-card').content.firstElementChild.cloneNode(true);
    node.dataset.i = i;
    node.querySelector('.name').textContent = m.name + (m.loading ? ' ⏳' : '');
    node.querySelector('.lvl').textContent = `Lv. ${m.level ?? '?'} · ${m.nature} Nature`;
    node.querySelector('.ability').textContent = m.ability;
    node.querySelector('.iv-sum').textContent = `${tv(m)} / 186`;
    node.querySelector('.ivbadge .tv').textContent = tv(m);
    node.querySelector('.types').innerHTML = typeChips(m.types);
    setImg(node.querySelector('img'), m.sprite, m.art);
    node.querySelector('.del').addEventListener('click', e => { e.stopPropagation(); removeMonRef(i); });
    node.querySelector('.lvl').addEventListener('mouseenter', e => showNatureTip(e, m));
    node.querySelector('.lvl').addEventListener('mouseleave', hideTip);
    node.querySelector('.ability').addEventListener('mouseenter', e => showAbilityTip(e, m));
    node.querySelector('.ability').addEventListener('mouseleave', hideTip);
    node.addEventListener('click', () => openModal(m));
    grid.appendChild(node);
  });
  grid.appendChild(slot);
}

/* ---------- modal ---------- */
function openModal(m){
  modalMon = m;
  overlay.classList.add('open');
  renderModal(m);
}

export function closeModal(){ overlay.classList.remove('open'); modalMon = null; }

function renderModal(m){
  // veri hazır değilse arka planda çekeceğiz; bu render anlık durumu gösterir
  if(m.calc === undefined){
    calcMon(m).then(c => {
      m.calc = c;
      if(modalMon === m) renderModal(m);
    }).catch(() => { m.calc = null; });
  }
  const root = $('#tpl-modal').content.cloneNode(true);

  root.querySelector('.types').innerHTML = typeChips(m.types) || '<span class="na">türler yükleniyor…</span>';
  root.querySelector('.name').textContent = m.name;
  root.querySelector('.lvl').textContent = `Lv. ${m.level ?? '?'}`;
  root.querySelector('.lvl-extra').textContent = m.tera ? 'Tera: ' + m.tera : '';
  setImg(root.querySelector('img'), m.art, m.sprite);
  root.querySelector('.tv').textContent = tv(m);
  root.querySelector('.tvsum').textContent = tv(m);
  root.querySelector('.tvbar').style.width = (tv(m)/186*100).toFixed(1) + '%';
  root.querySelector('.abl').textContent = m.ability;
  root.querySelector('.nat').textContent = m.nature;
  root.querySelector('.descAbility').innerHTML = m.abDesc != null
    ? `<span class="abl">${esc(m.ability)}:</span> ${esc(m.abDesc)}` : 'yükleniyor…';
  root.querySelector('.descNature').innerHTML = m.natDesc != null
    ? `${esc(m.nature)} — ${esc(m.natDesc)}` : 'yükleniyor…';

  // Stat dağılımı tablosu
  const ascKey = m.natureInfo?.inc, dscKey = m.natureInfo?.dec;
  const arrow = k => (ascKey && API_STAT[ascKey]===k ? ' <span class="arrow-alert" title="Nature artış">▲</span>'
                  :   dscKey && API_STAT[dscKey]===k ? ' <span class="arrow-down" title="Nature azalış">▼</span>' : '');
  root.querySelector('#statBody').innerHTML = STAT_ORDER.map(s=>`
    <tr>
      <td style="color:${STAT_COLORS[s.key]}">${s.label}${arrow(s.key)}</td>
      <td class="v100">${m.calc?.[s.key]!=null ? m.calc[s.key] : '<span class="na">…</span>'}</td>
      <td class="iv">${STATS.get(m.ivs,s.key)}</td>
      <td class="ev">${STATS.get(m.evs,s.key)}</td>
    </tr>`).join('');

  // Base stat tablosu (sıra = Stat Dağılımı; renk = değere göre yeşil→kırmızı)
  root.querySelector('#baseBody').innerHTML = m.base
    ? baseTableRows(m) : '<tr><td colspan="2" class="na">çekiliyor…</td></tr>';

  // Hamleler
  root.querySelector('#moves').innerHTML = moveChips(m);

  modal.innerHTML = '';
  modal.appendChild(root);
  modal.querySelector('.close').addEventListener('click', closeModal);

  // eksik veriyi arka planda çek, gelince tekrar çiz
  fetchModalData(m);
}

// Base statlar: sırada Stat Dağılımı ile aynı; renk değere göre (en yüksek yeşil → en düşük kırmızı)
function baseTableRows(m){
  const vals = STAT_ORDER.map(s=>m.base.stats[s.key]);
  const sorted = [...vals].sort((a,b)=>b-a);
  const max = sorted[0];
  return STAT_ORDER.map((s,i)=>{
    const v = vals[i];
    const width = max>0 ? (v/max*100).toFixed(1) : 0;
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

function moveChips(m){
  if(!m.moves.length) return '<div class="eff">—</div>';
  const metas = m.moveMeta || {};
  return `<div class="moves">${m.moves.map(mv=>{
    const mt = metas[mv];
    const ty = mt ? `<span class="ty" style="background:${TYPE_COLORS[mt.type]||'#666'}">${mt.type}</span>` : '';
    const cat = mt && CAT_INFO[mt.cat]
      ? `<span class="cat" style="color:${CAT_INFO[mt.cat].color}">${CAT_INFO[mt.cat].icon} ${CAT_INFO[mt.cat].label}</span>`
      : (mt ? '' : '<span class="na">…</span>');
    return `<span class="movechip">${ty}${cat}<span>${esc(mv)}</span></span>`;
  }).join('')}</div>`;
}

/* modal verisi yoksa arka planda tek seferlik çek (promise-cache → çift fetch yok) */
function fetchModalData(m){
  if(m.abDesc == null && !m._abTried){
    m._abTried = true;
    abilityDesc(m.ability).then(d => {
      m.abDesc = d;
      if(modalMon===m) renderModal(m);
    }).catch(() => { m.abDesc = 'Açıklama çekilemedi (ağ hatası).'; if(modalMon===m) renderModal(m); });
  }
  if(m.natDesc == null && !m._natTried){
    m._natTried = true;
    natureDesc(m.nature).then(d => { m.natDesc = d; if(modalMon===m) renderModal(m); })
      .catch(() => { m.natDesc = 'Açıklama çekilemedi (ağ hatası).'; if(modalMon===m) renderModal(m); });
  }
  if(!m.base){
    baseStats(m.name).then(b => {
      m.base = b; m.types = b.types;
      if(modalMon===m) renderModal(m);
    }).catch(() => {});
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
  tooltip.innerHTML = `<b>${esc(m.ability)}</b><br><span class="skel">Yükleniyor…</span>`;
  placeTip(e);
  abilityDesc(m.ability).then(d => { tooltip.innerHTML = `<b>${esc(m.ability)}</b><br>${esc(d)}`; })
    .catch(() => { tooltip.innerHTML = `<b>${esc(m.ability)}</b><br><i>Açıklama çekilemedi.</i>`; });
}
function showNatureTip(e, m){
  tooltip.innerHTML = `<b>${esc(m.nature)} Nature</b><br><span class="skel">Yükleniyor…</span>`;
  placeTip(e);
  natureDesc(m.nature).then(d => { tooltip.innerHTML = `<b>${esc(m.nature)} Nature</b><br>${esc(d)}`; })
    .catch(() => { tooltip.innerHTML = `<b>${esc(m.nature)} Nature</b><br><i>Açıklama çekilemedi.</i>`; });
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
    if(confirm("Envanterdeki tüm Pokémon'lar silinecek. Emin misin?")) clearAllRef();
  });
  overlay.addEventListener('click', e => { if(e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });

  on('grid', renderGrid);   // envanter değişince yeniden çiz
  on('mon',  mon => { if(modalMon === mon) renderModal(mon); }); // kuyruktan veri gelince modal güncellenir
  on('msg',  showMessage);
  on('queue', showQueue);
  renderGrid();
}