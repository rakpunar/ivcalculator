/* Sabitler ve paletler — tek doğruluk kaynağı */

// Nature adları (OCR düzeltmesi için)
export const NATURES = ['Hardy','Lonely','Brave','Adamant','Naughty','Bold','Docile','Relaxed','Impish','Lax','Timid','Hasty','Serious','Jolly','Naive','Modest','Mild','Quiet','Bashful','Rash','Calm','Gentle','Sassy','Careful','Quirky'];

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

/* Hamle kategorisi: yerel inline SVG ikonlar (dış bağımlılık yok) */
const svgIcon = (bg, shape) => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 27 18"><rect width="27" height="18" rx="4" fill="${bg}"/>${shape}</svg>`);
export const CAT_ICON = {
  physical:{ icon:svgIcon('#c92112','<path d="M13.5 2l2.4 5.1 5.6.7-4.1 3.9 1 5.5-4.9-2.7-4.9 2.7 1-5.5-4.1-3.9 5.6-.7z" fill="#ffd34d"/>'), label:'Physical' },
  special: { icon:svgIcon('#4f5fb0','<circle cx="13.5" cy="9" r="6" fill="none" stroke="#fff" stroke-width="1.6"/><circle cx="13.5" cy="9" r="2.4" fill="#fff"/>'), label:'Special' },
  status:  { icon:svgIcon('#8c888c','<path d="M5 9h17M5 5h17M5 13h17" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>'), label:'Status' },
};

export const STATS = {
  get(o,k){ return o?.[k] ?? 0; },
  totalIV(ivs){ return KEYS.reduce((s,k)=>s+this.get(ivs,k),0); },
};

export const LS_KEY = 'ivcalc.inventory.v1';
