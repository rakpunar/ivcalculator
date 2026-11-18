/* ProHelper PC dışa aktarımı ({"format":"prohelper-pc",...}) → envanter kayıtları */
import { KEYS } from './data.js';
import { addMons, on } from './state.js';
import { t } from './i18n.js';

/** Metin bu formatta mı? (yalnızca ucuz önkontrol + parse; değilse null) */
export function parsePcExport(text){
  const t = text?.trim();
  if(!t || t[0] !== '{' || !t.includes('prohelper-pc')) return null;
  try{
    const j = JSON.parse(t);
    return j?.format === 'prohelper-pc' && Array.isArray(j.pokemon) ? j : null;
  }catch(e){ return null; }
}

const stats = v => { // [HP,Atk,Def,SpA,SpD,Spe] dizisi veya anahtarlı nesne → {HP,Atk,...}
  if(Array.isArray(v)) return Object.fromEntries(KEYS.map((k, i) => [k, +v[i] || 0]));
  return Object.fromEntries(KEYS.map(k => [k, +v?.[k] || 0]));
};

/** Oyun adı → PokéAPI slug'ına uygun ad (Farfetch'd, Nidoran♀ gibi); formlar ("Slowbro-Galar") olduğu gibi kalır */
const cleanName = n => String(n).replace(/♀/g, '-f').replace(/♂/g, '-m').replace(/['’.:]/g, '').trim();

/** Geçerli kayıtları ve atlananların sayısını döner */
export function pcToMons(exp){
  const out = []; let bad = 0;
  for(const p of exp.pokemon){
    const base = cleanName(p?.name ?? ''), name = typeof p?.form === 'string' && p.form ? `${base}-${cleanName(p.form)}` : base;
    if(!name || !p.nature || !p.ability){ bad++; continue; }
    out.push({ name, level: +p.level || null, ability: String(p.ability), nature: String(p.nature),
      evs: stats(p.evs), ivs: stats(p.ivs), moves: (p.moves ?? []).filter(Boolean).map(String),
      tera: null, dex: p.dex ?? null, gform: Number.isInteger(p.form) ? p.form : 0, shiny: !!p.shiny, uid: p.uid ? String(p.uid) : null, loading: true });
  }
  return { mons: out, bad };
}

/* ---------- toplu içe aktarma: ekranı kilitler, ilerleme gösterir, bitince özet verir ---------- */
const $ = id => document.getElementById(id);
let imp = null; // {total, done, resolve, summary}

on('mon', m => { if(imp?.total){ imp.done++; $('lockBar').value = imp.done; $('lockTxt').textContent = `${imp.done} / ${imp.total} — ${m.name}`; } });
on('queue', remaining => { if(imp?.total && !remaining) finish(); });

function finish(){
  const i = imp; imp = null;
  $('lockTitle').textContent = t('Import finished');
  $('lockBar').value = $('lockBar').max;
  $('lockTxt').textContent = i.summary;
  $('lockOk').hidden = false;
  $('lockOk').onclick = () => { $('lock').hidden = true; i.resolve(); };
}

/** exp = "prohelper-pc" zarfı. Kullanıcı OK'a basınca çözülür. Zaten bir içe aktarma sürüyorsa null döner. */
export function runImport(exp){
  if(imp) return null;
  const { mons: list, bad } = pcToMons(exp);
  return new Promise(resolve => {
    imp = { total: 0, done: 0, resolve, summary: '' };
    $('lockOk').hidden = true; $('lockTitle').textContent = t('Importing…'); $('lockTxt').textContent = t('Starting…');
    $('lockBar').value = 0; $('lockBar').max = Math.max(1, list.length); $('lock').hidden = false;
    const { added, skipped } = addMons(list);
    imp.summary = t('Added: {a}\nSkipped (already in inventory): {s}\nSkipped (invalid): {b}', { a: added, s: skipped, b: bad });
    if(!added) return finish();
    imp.total = added; $('lockBar').max = added;
  });
}
