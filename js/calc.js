/* Bağımsız stat hesaplayıcı (calc.html): envanter/karşılaştırma yok; hesap ana uygulamayla ortak (calcMon + mods). */
import { game } from './game.js';
import { KEYS, STAT_ORDER, STAT_COLORS, NATURES } from './data.js';
import { natureInfo } from './api.js';
import { calcMon } from './stats.js';
import { spriteList, PLACEHOLDER } from './sprites.js';
import { ITEMS, ABILITIES, itemOptions, ownAb, abActive, modText } from './mods.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
const MAX = { iv: 31, ev: 252 };
const S = { id: null, abOn: false, iv: Object.fromEntries(KEYS.map(k => [k, 31])), ev: Object.fromEntries(KEYS.map(k => [k, 0])), stage: {} };
const G = await game();

/* Pokémon listesi: tüm formlar ve mega'lar ayrı satır */
const byLabel = new Map(), labelOf = {};
for(const id of Object.keys(G.dex).map(Number).filter(id => id > 0)){
  let l = G.label(id); if(byLabel.has(l.toLowerCase())) l += ` #${id}`;
  byLabel.set(l.toLowerCase(), id); labelOf[id] = l;
}
$('monList').innerHTML = [...byLabel.values()].map(id => `<option value="${esc(labelOf[id])}">#${G.rootOf(id)}</option>`).join('');

const short = { attack: 'Atk', defense: 'Def', 'special-attack': 'SpA', 'special-defense': 'SpD', speed: 'Spe' };
$('nature').innerHTML = (await Promise.all([...NATURES].sort().map(async n => {
  const i = await natureInfo(n);
  return `<option value="${n}"${n === 'Hardy' ? ' selected' : ''}>${n}${i.inc ? ` (+${short[i.inc]} −${short[i.dec]})` : ' (nötr)'}</option>`;
}))).join('');

/* stat satırları bir kez çizilir (girişlerde odak kaybolmasın) */
const num = (t, k, label) => `<button class="mini" data-step="-1" aria-label="${label} ${t} azalt">▼</button> <input type="number" min="0" max="${MAX[t]}" step="${t === 'ev' ? 4 : 1}" data-t="${t}" data-k="${k}" value="${S[t][k]}" aria-label="${label} ${t.toUpperCase()}"> <button class="mini" data-step="1" aria-label="${label} ${t} artır">▲</button> <button class="mini" data-max title="${MAX[t]}">Max</button>`;
const stageBtn = (k, d) => `<button class="bf${d < 0 ? ' neg' : ''}" data-stage="${k}" data-d="${d}">${d > 0 ? '+' : '−'}${Math.abs(d)}</button>`;
$('stats').innerHTML = STAT_ORDER.map(({ key: k, label }) => `<tr><td style="color:${STAT_COLORS[k]}">${label} <span id="nat-${k}"></span></td>
  <td id="base-${k}"></td><td>${num('iv', k, label)}</td><td>${num('ev', k, label)}</td>
  <td>${k === 'HP' ? '—' : `${stageBtn(k, -6)} ${stageBtn(k, -1)} <b id="sg-${k}">0</b> ${stageBtn(k, 1)} ${stageBtn(k, 6)}`}</td><td class="final" id="out-${k}"></td></tr>`).join('');
$('allStage').innerHTML = [-6, -1, 1, 6].map(d => stageBtn('all', d)).join(' ') + ' <button class="bf rst" data-stage="all" data-d="0">↺ Sıfırla</button>';

const mon = () => ({
  base: { stats: G.stats(S.id), species: G.rootOf(S.id) }, eff: { canEvo: G.hasEvo(S.id) },
  ivs: S.iv, evs: S.ev, level: Math.min(100, Math.max(1, Math.floor(+$('level').value) || 100)),
  nature: $('nature').value, ability: $('ability').value,
  view: { item: $('itOn').checked ? $('item').value : '', abil: S.abOn ? 'on' : '' },
});

let run = 0;
async function update(){
  const m = mon(), me = ++run, out = await calcMon(m), ni = await natureInfo(m.nature);
  if(me !== run) return;
  const ab = ownAb(m), active = !!abActive(m), forced = active && !S.abOn;
  $('abOnL').hidden = !ab;
  $('abOn').checked = active; $('abOn').disabled = forced;
  $('abTxt').textContent = ab ? `Ability bonusunu uygula: ${modText(ABILITIES, ab)}${forced ? ' (orb ile aktif)' : ''}` : '';
  const desc = G.abilityDesc(m.ability);
  $('abDesc').textContent = (desc?.accurate || desc?.desc || '') + (ab ? '' : ' (Stat hesabına etkisi yok.)');
  const it = $('item').value, st = ITEMS[it]?.st;
  $('itOnL').hidden = !it;
  $('itTxt').textContent = it ? `Eşya bonusunu uygula: ${st === 'brn' ? 'burn (Atk ×0.5, Guts hariç)' : st === 'tox' ? 'toxic durumu' : modText(ITEMS, it)}` : '';
  for(const k of KEYS){
    $('base-' + k).textContent = m.base.stats[k];
    $('nat-' + k).innerHTML = short[ni.inc] === k ? '<span class="up">▲</span>' : short[ni.dec] === k ? '<span class="down">▼</span>' : '';
    const n = S.stage[k] || 0, v = Math.floor(out[k] * (n >= 0 ? (2 + n) / 2 : 2 / (2 - n)));
    $('out-' + k).innerHTML = n ? `<span class="${n > 0 ? 'up' : 'down'}">${v}</span> <small>(${out[k]})</small>` : v;
    if(k !== 'HP') $('sg-' + k).textContent = n > 0 ? '+' + n : n;
  }
  const tot = KEYS.reduce((a, k) => a + S.ev[k], 0);
  $('evTotal').innerHTML = `EV toplamı <b class="${tot > 510 ? 'down' : ''}">${tot}</b> / 510${tot > 510 ? ' (oyunda mümkün değil)' : ''}`;
}

let sprRun = 0;
async function pick(id){
  S.id = id; S.abOn = false;
  $('mon').value = labelOf[id];
  $('types').innerHTML = G.types(id).map(t => `<span class="type-icon t-${t}">${t.toUpperCase()}</span>`).join('');
  const hidden = G.hiddenOf(id);
  $('ability').innerHTML = [...new Set(G.abilitiesOf(id))].map(a => `<option value="${esc(a)}">${esc(a)}${a === hidden ? ' (gizli)' : ''}</option>`).join('') || '<option value="">—</option>';
  const old = $('item').value;
  $('item').innerHTML = '<option value="">Yok</option>' + itemOptions(mon()).map(x => `<option value="${x.k}"${x.k === old ? ' selected' : ''}>${esc(x.n)}</option>`).join('');
  update();
  const me = ++sprRun, list = await spriteList({ dex: id, view: { stage: 'current' } }, id);
  if(me !== sprRun) return;
  const img = $('sprite'); let i = 0;
  img.onerror = () => { if(i >= list.length) img.onerror = null; img.src = list[i++] ?? PLACEHOLDER; };
  img.onerror();
}

$('mon').addEventListener('focus', () => { $('mon').value = ''; });   // dolu kutuda datalist yalnız eşleşeni gösterir
$('mon').addEventListener('blur', () => { $('mon').value = labelOf[S.id]; });
$('mon').addEventListener('input', e => {
  const id = byLabel.get(e.target.value.trim().toLowerCase());
  if(id){ pick(id); e.target.blur(); }
});
$('mon').addEventListener('change', e => { const id = +e.target.value; if(id > 0 && G.dex[id]){ pick(id); e.target.blur(); } });   // numara

const set = (t, k, v) => S[t][k] = Math.max(0, Math.min(MAX[t], Math.floor(+v) || 0));
document.addEventListener('input', e => {
  const d = e.target.dataset;
  if(d.t) set(d.t, d.k, e.target.value);
  if(d.t || e.target.id === 'level') update();
});
document.addEventListener('change', e => {
  const t = e.target;
  if(t.dataset.t) t.value = S[t.dataset.t][t.dataset.k];
  else if(t.id === 'abOn') S.abOn = t.checked;
  else if(t.id === 'ability') S.abOn = false;
  else if(t.id === 'item') $('itOn').checked = !!t.value;
  else if(t.id !== 'nature' && t.id !== 'itOn') return;
  update();
});
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if(!b) return;
  const d = b.dataset;
  if(d.all) document.querySelectorAll(`input[data-t="${d.all}"]`).forEach(i => { i.value = set(d.all, i.dataset.k, d.v); });
  else if(d.step || 'max' in d){
    const i = b.parentElement.querySelector(`input`);
    if(d.step) i[+d.step > 0 ? 'stepUp' : 'stepDown'](); else i.value = i.max;
    i.value = set(i.dataset.t, i.dataset.k, i.value);
  }else if(d.stage){
    for(const k of d.stage === 'all' ? KEYS.filter(k => k !== 'HP') : [d.stage]) S.stage[k] = +d.d ? Math.max(-6, Math.min(6, (S.stage[k] || 0) + +d.d)) : 0;
  }
  update();
});

pick(1);
