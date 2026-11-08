/* Stat hesaplamaları — Gen 3+ formülü (Showdown ile aynı) */
import { KEYS, STATS } from './data.js';
import { natureInfo } from './api.js';
import { STAT_API_TO_KEY } from './data.js';

/** Lv.100 gerçek statları döndürür {HP, Atk, Def, SpA, SpD, Spe}. base yüklenmemişse null. */
export async function calcMon(m){
  let ni = null;
  try{ ni = await natureInfo(m.nature); }catch(e){ /* nötr kabul */ }
  if(!m.base) return null;

  const out = {};
  for(const k of KEYS){
    const base = m.base.stats[k];
    const iv = STATS.get(m.ivs,k), ev = STATS.get(m.evs,k), L = 100;
    if(k === 'HP'){
      out[k] = Math.floor((2*base + iv + Math.floor(ev/4)) * L/100) + L + 10;
    } else {
      const inner = Math.floor((2*base + iv + Math.floor(ev/4)) * L/100) + 5;
      let mod = 1;
      if(ni?.inc && STAT_API_TO_KEY[ni.inc] === k) mod = 1.1;
      if(ni?.dec && STAT_API_TO_KEY[ni.dec] === k) mod = 0.9;
      out[k] = Math.floor(inner * mod);
    }
  }
  return out;
}
