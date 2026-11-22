/* PC arama sözdizimi (ProBot PcSearch.cs ile aynı): virgülle ayrılmış terimler, hepsi sağlanmalı.
   "pika, timi, 31" · "pokemon pika, abil timi, spa 31" (kolon adı ≥3 harf önek olabilir) · "spa>30", "lv >50", "iv>=150" */
import { hiddenPower } from './stats.js';
// IV sırası oyundaki gibi: Atk, Def, Spe, SpA, SpD, HP
const IVK = ['Atk', 'Def', 'Spe', 'SpA', 'SpD', 'HP'];
const ALIAS = { pokemon:'name', poke:'name', name:'name', lv:'lv', level:'lv', nature:'nature', ability:'ability', abilty:'ability', abiltiy:'ability', item:'item',
  ot:'ot', nick:'ot', nickname:'ot', move:'move', gender:'gender', atk:'iv0', def:'iv1', spe:'iv2', speed:'iv2', spa:'iv3', spatk:'iv3', spd:'iv4', spdef:'iv4', spdf:'iv4', hp:'iv5',
  iv:'ivt', ivt:'ivt', total:'ivt' };
const NUMCOL = c => c === 'lv' || c === 'ivt' || /^iv\d$/.test(c);

function row(m){
  const g = String(m.gender ?? '').toUpperCase();
  const iv = IVK.map(k => +m.ivs?.[k] || 0);
  return {
    texts: null, name: `${m.name ?? ''} ${m.eff?.label ?? ''}`.trim(), ot: m.nick ?? m.nickname ?? '', nature: m.nature ?? '', ability: m.ability ?? '', item: m.item && m.item !== '0' ? String(m.item) : '',
    move: (m.moves ?? []).join(' '), gender: g === 'M' ? 'M male' : g === 'F' ? 'F female' : '',
    flags: (m.shiny ? 'shiny ' : '') + (m.gform > 0 || m.dex >= 3000 ? 'form' : ''),
    lv: m.level ?? 0, ivt: iv.reduce((a, b) => a + b, 0), iv,
    // genel arama: Pokémon'un diğer tüm bilgileri (tür, form, uid, dex, EV, hesaplanan statlar, Hidden Power…)
    extra: [m.name, m.eff?.id, m.abName, ...(m.types ?? m.eff?.types ?? []), hiddenPower(m.ivs), m.tera, m.uid, m.dex].filter(x => x != null && x !== '').map(String),
    nums: [m.dex, m.uid, ...Object.values(m.evs ?? {}), ...Object.values(m.calc ?? {})].filter(x => x !== '' && x != null && !isNaN(+x)).map(Number),
  };
}
const num = (r, c) => c === 'lv' ? r.lv : c === 'ivt' ? r.ivt : r.iv[+c[2]];
const has = (h, v) => !!h && h.toLowerCase().includes(v.toLowerCase());
const col = tok => {
  tok = tok.toLowerCase(); if(ALIAS[tok]) return ALIAS[tok];
  if(tok.length >= 3) for(const k in ALIAS) if(k.startsWith(tok)) return ALIAS[k];
  return null;
};
const OPS = { '>': (a, b) => a > b, '<': (a, b) => a < b, '>=': (a, b) => a >= b, '<=': (a, b) => a <= b, '=': (a, b) => a === b };

function term(t){
  let m = /^([^\s<>=]+)\s*(>=|<=|>|<|=)\s*(\d+)$/.exec(t), c;
  if(m && (c = col(m[1])) && NUMCOL(c)){ const v = +m[3], f = OPS[m[2]]; return r => f(num(r, c), v); }
  m = /^(\S+)\s+(.+)$/.exec(t);
  if(m && (c = col(m[1]))){
    const val = m[2].trim();
    if(NUMCOL(c)){ const n = /^\d+$/.test(val) ? +val : NaN; return r => num(r, c) === n; }
    return r => has(r[c], val);
  }
  const n = /^\d+$/.test(t) ? +t : NaN;
  return r => (!isNaN(n) && (r.iv.includes(n) || r.lv === n || r.ivt === n || r.nums.includes(n))) || [r.name, r.ot, r.nature, r.ability, r.item, r.move, r.gender, r.flags, ...r.extra].some(s => has(s, t));
}

/** Sorgudan süzgeç üretir (Pokémon → boolean); boş sorgu = hepsi */
export function compileSearch(q){
  const terms = String(q ?? '').split(',').map(s => s.trim()).filter(Boolean).map(term);
  return terms.length ? m => { const r = row(m); return terms.every(f => f(r)); } : () => true;
}
