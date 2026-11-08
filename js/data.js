/* Sabitler ve paletler — tek doğruluk kaynağı */

// İç stat anahtarları (parse + hesaplama)
export const KEYS = ['HP','Atk','Def','SpA','SpD','Spe'];

// Gösterim sırası ve isimleri
export const STAT_ORDER = [
  { key:'Atk', label:'ATK' },
  { key:'Def', label:'DEF' },
  { key:'Spe', label:'SPD' },
  { key:'SpA', label:'SPATK' },
  { key:'SpD', label:'SPDEF' },
  { key:'HP',  label:'HP'  },
];
export const STAT_LABEL = k => STAT_ORDER.find(s=>s.key===k)?.label ?? k;

export const STAT_COLORS = {
  HP:'var(--hp)', Atk:'var(--atk)', Def:'var(--def)',
  SpA:'var(--spa)', SpD:'var(--spd)', Spe:'var(--spe)'
};

// PokéAPI stat adı → iç anahtar
export const STAT_API_TO_KEY = {
  hp:'HP', attack:'Atk', defense:'Def',
  'special-attack':'SpA', 'special-defense':'SpD', speed:'Spe'
};

export const TYPE_COLORS = {
  normal:'#A8A77A', fire:'#EE8130', water:'#6390F0', electric:'#F7D02C',
  grass:'#7AC74C',  ice:'#96D9D6', fighting:'#C22E28', poison:'#A33EA1',
  ground:'#E2BF65', flying:'#A98FF3', psychic:'#F95587', bug:'#A6B91A',
  rock:'#B6A136',   ghost:'#735797', dragon:'#6F35FC',  dark:'#705746',
  steel:'#B7B7CE',  fairy:'#D685AD'
};

// Hamle kategorisi rozetleri: fiziksel (ATK) / özel (SP) / durum
export const CAT_INFO = {
  physical:{ icon:'⚔', label:'ATK', color:'#e05a5a' },
  special: { icon:'✨', label:'SP',  color:'#6a86e0' },
  status:  { icon:'🌀', label:'—',   color:'#8fa0b8' },
};

export const STATS = {
  get(o,k){ return o?.[k] ?? 0; },
  totalIV(ivs){ return KEYS.reduce((s,k)=>s+this.get(ivs,k),0); },
};

export const LS_KEY = 'ivcalc.inventory.v1';
