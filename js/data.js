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

/* Tür paleti: pokemondb.net'in resmi .type-icon renkleri (kopya) */
export const TYPE_COLORS = {
  normal:'#aa9', fire:'#f42', water:'#39f', electric:'#fc3',
  grass:'#7c5',  ice:'#6cf', fighting:'#b54', poison:'#a59',
  ground:'#db5', flying:'#89f', psychic:'#f59', bug:'#ab2',
  rock:'#ba6',   ghost:'#66b', dragon:'#76e',  dark:'#754',
  steel:'#aab',  fairy:'#e9e'
};

/* Hamle kategorisi: pokemondb.net'in kendi ikonları (30x20 PNG) */
export const CAT_ICON = {
  physical:{ icon:'https://img.pokemondb.net/images/icons/move-physical.png', label:'Physical' },
  special: { icon:'https://img.pokemondb.net/images/icons/move-special.png',  label:'Special'  },
  status:  { icon:'https://img.pokemondb.net/images/icons/move-status.png',   label:'Status'   },
};

export const STATS = {
  get(o,k){ return o?.[k] ?? 0; },
  totalIV(ivs){ return KEYS.reduce((s,k)=>s+this.get(ivs,k),0); },
};

export const LS_KEY = 'ivcalc.inventory.v1';
