/* Bağımsız stat hesaplayıcı (calc.html): envanter/karşılaştırma yok; hesap ana uygulamayla ortak (calcMon + mods). */
import { game } from './game.js';
import { KEYS, STAT_ORDER, STAT_COLORS, NATURES } from './data.js';
import { natureInfo } from './api.js';
import { calcMon } from './stats.js';
import { spriteList, PLACEHOLDER, cropSprite } from './sprites.js';
import { ITEMS, ABILITIES, itemOptions, ownAb, abActive, modText, stageOf } from './mods.js';

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
  $('abTxt').textContent = ab ? `Ability bonusunu uygula: ${modText(ABILITIES, ab)}${forced ? ' (eşya ile aktif)' : ''}` : '';
  const desc = G.abilityDesc(m.ability);
  $('abDesc').textContent = (desc?.accurate || desc?.desc || '') + (ab ? '' : ' (Stat hesabına etkisi yok.)');
  const it = $('item').value, st = ITEMS[it]?.st;
  $('itOnL').hidden = !it;
  $('itTxt').textContent = it ? `Eşya bonusunu uygula: ${st === 'brn' ? 'burn (Atk ×0.5, Guts hariç)' : st === 'tox' ? 'toxic durumu' : ITEMS[it].booster ? 'Protosynthesis / Quark Drive etkinleşir' : modText(ITEMS, it)}` : '';
  for(const k of KEYS){
    $('base-' + k).textContent = m.base.stats[k];
    $('nat-' + k).innerHTML = short[ni.inc] === k ? '<span class="up">▲</span>' : short[ni.dec] === k ? '<span class="down">▼</span>' : '';
    const n = stageOf(m, k, S.stage[k], out), v = Math.floor(out[k] * (n >= 0 ? (2 + n) / 2 : 2 / (2 - n)));
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
  for(const src of list){   // saydam kenarlar kırpılır: sprite kutuyu doldurur
    try{ const c = await cropSprite(src); if(me === sprRun) $('sprite').src = c; return; }catch(e){}
  }
  $('sprite').src = PLACEHOLDER;
}

/* kendi açılır listesi: datalist ilk tıklamada güvenilir açılmıyor */
const box = $('monList'), inp = $('mon');
let cur = 0;
const mark = i => {
  box.children[cur]?.classList.remove('cur');
  cur = Math.max(0, Math.min(box.children.length - 1, i));
  box.children[cur]?.classList.add('cur'); box.children[cur]?.scrollIntoView({ block: 'nearest' });
};
function showList(){
  const q = inp.value.trim().toLowerCase();
  const ids = [...byLabel.values()].filter(id => /^\d+$/.test(q) ? G.rootOf(id) === +q || id === +q : labelOf[id].toLowerCase().includes(q));
  ids.sort((a, b) => !labelOf[a].toLowerCase().startsWith(q) - !labelOf[b].toLowerCase().startsWith(q));
  box.innerHTML = ids.map(id => `<div role="option" data-id="${id}">${esc(labelOf[id])} <small>#${G.rootOf(id)}</small></div>`).join('');
  box.hidden = false; inp.setAttribute('aria-expanded', 'true'); cur = 0; mark(0);
}
const hideList = () => { box.hidden = true; inp.setAttribute('aria-expanded', 'false'); };
const choose = el => { if(el){ pick(+el.dataset.id); inp.blur(); } };
inp.addEventListener('focus', () => { inp.value = ''; showList(); });
inp.addEventListener('click', () => { if(box.hidden) showList(); });
inp.addEventListener('input', showList);
inp.addEventListener('blur', () => { hideList(); inp.value = labelOf[S.id]; });
inp.addEventListener('keydown', e => {
  if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); mark(cur + (e.key === 'ArrowDown' ? 1 : -1)); }
  else if(e.key === 'Enter') choose(box.children[cur]);
  else if(e.key === 'Escape') inp.blur();
});
box.addEventListener('mousedown', e => e.preventDefault());   // kaydırma/tıklama kutunun odağını düşürmesin
box.addEventListener('click', e => choose(e.target.closest('[data-id]')));

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

/* ---------- kayıtlar: bu tarayıcıda (localStorage) + JSON yedek ---------- */
const KEY = 'ivcalc.calc.saves.v1';
const int = (v, lo, hi, d) => Number.isFinite(+v) ? Math.max(lo, Math.min(hi, Math.floor(+v))) : d;
const stats = (o, lo, hi) => Object.fromEntries(KEYS.map(k => [k, int(o?.[k], lo, hi, 0)]));
/** depodan/dosyadan gelen kayıt doğrulanır; geçersizse null */
const clean = r => r && G.dex[r.id] && +r.id > 0 && typeof r.name === 'string' && r.name.trim() ? {
  name: r.name.trim().slice(0, 80), id: +r.id, level: int(r.level, 1, 100, 100),
  nature: NATURES.includes(r.nature) ? r.nature : 'Hardy', ability: String(r.ability ?? ''), abOn: !!r.abOn,
  item: Object.hasOwn(ITEMS, r.item) ? r.item : '', itOn: !!r.itOn,
  iv: stats(r.iv, 0, MAX.iv), ev: stats(r.ev, 0, MAX.ev), stage: stats(r.stage, -6, 6),
} : null;
const say = t => $('saveMsg').textContent = t;
let saves = [], raw = null;
try{ raw = localStorage.getItem(KEY); saves = JSON.parse(raw ?? '[]').map(clean).filter(Boolean); }
catch(e){ try{ if(raw) localStorage.setItem(KEY + '.bozuk', raw); }catch(_){} say('Eski kayıtlar okunamadı.'); }
function persist(){
  try{ localStorage.setItem(KEY, JSON.stringify(saves)); return true; }
  catch(e){ say('Tarayıcıya yazılamadı; JSON yedeği indir.'); return false; }
}
function drawSaves(){
  $('saves').innerHTML = saves.map((r, i) => `<li><span><b>${esc(r.name)}</b> <small>${esc(labelOf[r.id])} · Lv.${r.level} · ${r.nature}</small></span><button class="mini" data-load="${i}">Aç</button><button class="mini" data-del="${i}" aria-label="Sil">✕</button></li>`).join('');
}
$('save').addEventListener('click', () => {
  const m = mon(), name = $('saveName').value.trim() || labelOf[S.id];
  const r = clean({ name, id: S.id, level: m.level, nature: m.nature, ability: m.ability, abOn: S.abOn, item: $('item').value, itOn: $('itOn').checked, iv: S.iv, ev: S.ev, stage: S.stage });
  const i = saves.findIndex(x => x.name === r.name);
  if(i >= 0 && !confirm(`"${r.name}" kaydının üzerine yazılsın mı?`)) return;
  if(i >= 0) saves[i] = r; else saves.unshift(r);
  if(persist()) say(`Kaydedildi: ${r.name}`);
  drawSaves();
});
function load(r){
  pick(r.id);   // listeler eşzamanlı dolar (yalnız sprite bekler)
  $('level').value = r.level; $('nature').value = r.nature;
  if([...$('ability').options].some(o => o.value === r.ability)) $('ability').value = r.ability;
  $('item').value = r.item; $('itOn').checked = r.itOn; S.abOn = r.abOn;
  Object.assign(S.iv, r.iv); Object.assign(S.ev, r.ev); S.stage = { ...r.stage };
  document.querySelectorAll('input[data-t]').forEach(i => { i.value = S[i.dataset.t][i.dataset.k]; });
  $('saveName').value = r.name; say(`Açıldı: ${r.name}`); update();
}
$('saves').addEventListener('click', e => {
  const d = e.target.closest('button')?.dataset; if(!d) return;
  if(d.load) load(saves[d.load]);
  else if(confirm(`"${saves[d.del].name}" kaydı silinsin mi?`)){ saves.splice(d.del, 1); persist(); drawSaves(); }
});
$('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ format: 'ivcalc-calc', saves }, null, 1)], { type: 'application/json' }));
  a.download = `stat-hesaplayici-yedek-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('import').addEventListener('click', () => $('importFile').click());
$('importFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if(!f) return;
  let list;
  try{ const j = JSON.parse(await f.text()); if(j.format !== 'ivcalc-calc') throw 0; list = j.saves.map(clean).filter(Boolean); }
  catch(err){ return say('Dosya bu hesaplayıcının yedeği değil.'); }
  let n = 0;   // mevcut kayıtlar silinmez: aynısı atlanır, adı çakışan numaralanır
  for(const r of list){
    if(saves.some(x => JSON.stringify(x) === JSON.stringify(r))) continue;
    const base = r.name; for(let i = 2; saves.some(x => x.name === r.name); i++) r.name = `${base} (${i})`;
    saves.push(r); n++;
  }
  if(persist()) say(`${n} kayıt eklendi, ${list.length - n} tanesi zaten vardı.`);
  drawSaves();
});

pick(1);
drawSaves();
