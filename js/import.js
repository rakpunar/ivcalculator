/* ProHelper PC dışa aktarımı ({"format":"prohelper-pc",...}) → envanter kayıtları */
import { KEYS } from './data.js';

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
    const base = cleanName(p?.name ?? ''), name = p?.form ? `${base}-${cleanName(p.form)}` : base;
    if(!name || !p.nature || !p.ability){ bad++; continue; }
    out.push({ name, level: +p.level || null, ability: String(p.ability), nature: String(p.nature),
      evs: stats(p.evs), ivs: stats(p.ivs), moves: (p.moves ?? []).filter(Boolean).map(String),
      tera: null, uid: p.uid != null ? String(p.uid) : null, loading: true });
  }
  return { mons: out, bad };
}
