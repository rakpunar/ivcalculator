/* Stat hesaplamaları — Gen 3+ formülü (Showdown ile aynı) */
import { KEYS, STATS } from './data.js';
import { natureInfo } from './api.js';
import { STAT_API_TO_KEY } from './data.js';
import { modsFor } from './mods.js';

/** Gösterilen seviye: 'Lv.100' seçiliyse ya da seviye yoksa 100, aksi halde Pokémon'un kendi seviyesi */
export const effLevel = m => (m.view?.lvl100 || !m.level) ? 100 : m.level;

/** Seçili seviyedeki gerçek statları döndürür {HP, Atk, Def, SpA, SpD, Spe}. base yüklenmemişse null. */
export async function calcMon(m){
  let ni = null;
  try{ ni = await natureInfo(m.nature); }catch(e){ /* nötr kabul */ }
  if(!m.base) return null;

  const out = {};
  for(const k of KEYS){
    const base = m.base.stats[k];
    const iv = STATS.get(m.ivs,k), ev = STATS.get(m.evs,k), L = effLevel(m);
    if(k === 'HP' && base === 1){
      out[k] = 1;   // Shedinja
    } else if(k === 'HP'){
      out[k] = Math.floor((2*base + iv + Math.floor(ev/4)) * L/100) + L + 10;
    } else {
      const inner = Math.floor((2*base + iv + Math.floor(ev/4)) * L/100) + 5;
      let mod = 1;
      if(ni?.inc && STAT_API_TO_KEY[ni.inc] === k) mod = 1.1;
      if(ni?.dec && STAT_API_TO_KEY[ni.dec] === k) mod = 0.9;
      out[k] = Math.floor(inner * mod);
    }
  }
  const mul = modsFor(m, out);   // seçili eşya / ability çarpanları
  for(const k of KEYS) if(mul[k]) out[k] = Math.floor(out[k] * mul[k]);
  return out;
}

/* Hidden Power türü (Gen 3+ formülü): IV'lerin en düşük bitleri HP,Atk,Def,Spe,SpA,SpD sırasıyla */
export const HP_TYPES = ['fighting','flying','poison','ground','rock','bug','ghost','steel','fire','water','grass','electric','psychic','ice','dragon','dark'];
export function hiddenPower(ivs){
  const b = ['HP','Atk','Def','Spe','SpA','SpD'].reduce((s, k, i) => s + ((STATS.get(ivs, k) & 1) << i), 0);
  return HP_TYPES[Math.floor(b * 15 / 63)];
}
