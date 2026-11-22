/* Stat çarpanı veren eşya / ability tabloları (standart oyun kuralları). Seçim mon.view.item / mon.view.abil ile tutulur;
   hesaplama calcMon'da yapılır. Koşullu olanlar (hava, durum, arazi) "etkin" kabul edilir: seçmek = koşul sağlanıyor.
   Çarpanlar nature'dan sonra uygulanır (çarpım sırası göz ardı edilir, aşağı yuvarlanır). */
const only = (...ids) => ids;   // tür kısıtı: base.species (ulusal dex) listesi
export const ITEMS = {
  'choice-band':   { n: 'Choice Band',   mul: { Atk: 1.5 } },
  'choice-specs':  { n: 'Choice Specs',  mul: { SpA: 1.5 } },
  'choice-scarf':  { n: 'Choice Scarf',  mul: { Spe: 1.5 } },
  'assault-vest':  { n: 'Assault Vest',  mul: { SpD: 1.5 } },
  'eviolite':      { n: 'Eviolite',      mul: { Def: 1.5, SpD: 1.5 }, evo: true },   // yalnız evrimleşebilen tür
  'light-ball':    { n: 'Light Ball',    mul: { Atk: 2, SpA: 2 }, sp: only(25) },
  'thick-club':    { n: 'Thick Club',    mul: { Atk: 2 }, sp: only(104, 105) },
  'deep-sea-tooth':{ n: 'Deep Sea Tooth',mul: { SpA: 2 }, sp: only(366) },
  'deep-sea-scale':{ n: 'Deep Sea Scale',mul: { SpD: 2 }, sp: only(366) },
  'soul-dew':      { n: 'Soul Dew',      mul: { SpA: 1.5, SpD: 1.5 }, sp: only(380, 381) },
  'metal-powder':  { n: 'Metal Powder',  mul: { Def: 1.5 }, sp: only(132) },
  'quick-powder':  { n: 'Quick Powder',  mul: { Spe: 2 }, sp: only(132) },
  'macho-brace':   { n: 'Macho Brace',   mul: { Spe: 0.5 } },
  'iron-ball':     { n: 'Iron Ball',     mul: { Spe: 0.5 } },
  'power-items':   { n: 'Power Anklet/Band/…', mul: { Spe: 0.5 } },
};
export const ABILITIES = {   // c = koşul (yoksa sabit etki: kendi ability'si ise otomatik uygulanır)
  'huge-power':    { n: 'Huge Power',    mul: { Atk: 2 } },
  'pure-power':    { n: 'Pure Power',    mul: { Atk: 2 } },
  'hustle':        { n: 'Hustle',        mul: { Atk: 1.5 } },
  'gorilla-tactics':{ n: 'Gorilla Tactics', mul: { Atk: 1.5 } },
  'fur-coat':      { n: 'Fur Coat',      mul: { Def: 2 } },
  'ice-scales':    { n: 'Ice Scales',    mul: { SpD: 2 } },
  'guts':          { n: 'Guts',          mul: { Atk: 1.5 }, c: 'status' },
  'marvel-scale':  { n: 'Marvel Scale',  mul: { Def: 1.5 }, c: 'status' },
  'quick-feet':    { n: 'Quick Feet',    mul: { Spe: 1.5 }, c: 'status' },
  'toxic-boost':   { n: 'Toxic Boost',   mul: { Atk: 1.5 }, c: 'poisoned' },
  'flare-boost':   { n: 'Flare Boost',   mul: { SpA: 1.5 }, c: 'burned' },
  'defeatist':     { n: 'Defeatist',     mul: { Atk: 0.5, SpA: 0.5 }, c: 'HP ≤ 1/2' },
  'flower-gift':   { n: 'Flower Gift',   mul: { Atk: 1.5, SpD: 1.5 }, c: 'sun' },
  'solar-power':   { n: 'Solar Power',   mul: { SpA: 1.5 }, c: 'sun' },
  'grass-pelt':    { n: 'Grass Pelt',    mul: { Def: 1.5 }, c: 'grassy terrain' },
  'swift-swim':    { n: 'Swift Swim',    mul: { Spe: 2 }, c: 'rain' },
  'chlorophyll':   { n: 'Chlorophyll',   mul: { Spe: 2 }, c: 'sun' },
  'sand-rush':     { n: 'Sand Rush',     mul: { Spe: 2 }, c: 'sandstorm' },
  'slush-rush':    { n: 'Slush Rush',    mul: { Spe: 2 }, c: 'snow/hail' },
  'surge-surfer':  { n: 'Surge Surfer',  mul: { Spe: 2 }, c: 'electric terrain' },
  'orichalcum-pulse':{ n: 'Orichalcum Pulse', mul: { Atk: 4 / 3 }, c: 'sun' },
  'hadron-engine': { n: 'Hadron Engine', mul: { SpA: 4 / 3 }, c: 'electric terrain' },
  'protosynthesis':{ n: 'Protosynthesis', high: true, c: 'sun' },   // en yüksek stat ×1.3 (Spe ise ×1.5)
  'quark-drive':   { n: 'Quark Drive',   high: true, c: 'electric terrain' },
};
const NK = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const abKey = name => Object.keys(ABILITIES).find(k => NK(k) === NK(name));
/** oyundaki eşya adı → tablo anahtarı ('' = stat etkisi yok / bilinmiyor) */
export const itemKey = name => Object.keys(ITEMS).find(k => NK(ITEMS[k].n) === NK(name)) ?? '';
/** Pokémon'un kendi (seçilebilir) ability'lerinden stat etkisi olanlar: [{k, n}] */
export const abilOptions = m => {   // simülasyon: tüm tablo; türün kendi ability'leri başta (★)
  const own = new Set((m.eff?.ownAbilities ?? [m.ability]).map(abKey).filter(Boolean));
  const o = k => ({ k, n: (own.has(k) ? '★ ' : '') + ABILITIES[k].n });
  return [...own, ...Object.keys(ABILITIES).filter(k => !own.has(k))].map(o);
};
export const itemOptions = m => Object.entries(ITEMS).filter(([, d]) => (!d.sp || d.sp.includes(m.base?.species)) && (!d.evo || m.eff?.canEvo)).map(([k, d]) => ({ k, n: d.n }));
const fmt = mul => Object.entries(mul ?? {}).map(([s, v]) => `${s} ×${+v.toFixed(2)}`).join(', ') || '';
export const modText = (tbl, k) => (fmt(tbl[k]?.mul) || (tbl[k]?.high ? 'best stat ×1.3' : '')) + (tbl[k]?.c ? ` · if ${tbl[k].c}` : '');

/** stat çarpanları {Atk:1.5,…}; out = nature sonrası stat değerleri (en yüksek stat kuralı için) */
export function modsFor(m, out){
  const mul = {}, add = d => { if(d) for(const [s, v] of Object.entries(d.mul ?? {})) mul[s] = (mul[s] ?? 1) * v; };
  // ability: '' = otomatik (kendi ability'si sabit etkiliyse uygulanır), 'none' = hiçbiri, aksi halde seçilen (koşullular "koşul aktif" sayılır)
  const sel = m.view?.abil, own = abKey(m.abName ?? m.ability);
  const ab = sel === 'none' ? null : sel ? ABILITIES[sel] : (own && !ABILITIES[own].c ? ABILITIES[own] : null);
  const it = ITEMS[m.view?.item];
  if(it && (!it.sp || it.sp.includes(m.base?.species)) && (!it.evo || m.eff?.canEvo)) add(it);
  add(ab);
  if(ab?.high && out){ const best = ['Atk', 'Def', 'SpA', 'SpD', 'Spe'].reduce((a, k) => (out[k] > out[a] ? k : a), 'Atk'); mul[best] = (mul[best] ?? 1) * (best === 'Spe' ? 1.5 : 1.3); }
  return mul;
}
