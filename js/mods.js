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
  'flame-orb':     { n: 'Flame Orb',     st: 'brn' },   // durum verir: ability'ye göre stat etkisi (burn Atk ×0.5, Guts hariç)
  'toxic-orb':     { n: 'Toxic Orb',     st: 'tox' },
  // tüketilen / tetiklenen eşyalar: stg = kademe artışı
  'weakness-policy': { n: "Weakness Policy", stg: { Atk: 2, SpA: 2 }, c: 'hit super effectively' },
  'blunder-policy': { n: "Blunder Policy", stg: { Spe: 2 }, c: 'move misses' },
  'liechi-berry': { n: "Liechi Berry", stg: { Atk: 1 }, c: 'HP ≤ 1/4' },
  'ganlon-berry': { n: "Ganlon Berry", stg: { Def: 1 }, c: 'HP ≤ 1/4' },
  'petaya-berry': { n: "Petaya Berry", stg: { SpA: 1 }, c: 'HP ≤ 1/4' },
  'apicot-berry': { n: "Apicot Berry", stg: { SpD: 1 }, c: 'HP ≤ 1/4' },
  'salac-berry': { n: "Salac Berry", stg: { Spe: 1 }, c: 'HP ≤ 1/4' },
  'kee-berry': { n: "Kee Berry", stg: { Def: 1 }, c: 'hit by physical move' },
  'maranga-berry': { n: "Maranga Berry", stg: { SpD: 1 }, c: 'hit by special move' },
  'absorb-bulb': { n: "Absorb Bulb", stg: { SpA: 1 }, c: 'hit by Water move' },
  'cell-battery': { n: "Cell Battery", stg: { Atk: 1 }, c: 'hit by Electric move' },
  'snowball': { n: "Snowball", stg: { Atk: 1 }, c: 'hit by Ice move' },
  'luminous-moss': { n: "Luminous Moss", stg: { SpD: 1 }, c: 'hit by Water move' },
  'adrenaline-orb': { n: "Adrenaline Orb", stg: { Spe: 1 }, c: 'intimidated' },
  'throat-spray': { n: "Throat Spray", stg: { SpA: 1 }, c: 'sound move used' },
  'electric-seed': { n: "Electric Seed", stg: { Def: 1 }, c: 'electric terrain' },
  'grassy-seed': { n: "Grassy Seed", stg: { Def: 1 }, c: 'grassy terrain' },
  'psychic-seed': { n: "Psychic Seed", stg: { SpD: 1 }, c: 'psychic terrain' },
  'misty-seed': { n: "Misty Seed", stg: { SpD: 1 }, c: 'misty terrain' },
  'room-service': { n: "Room Service", stg: { Spe: -1 }, c: 'Trick Room' },
  'booster-energy': { n: 'Booster Energy', booster: true },   // Protosynthesis / Quark Drive'ı etkinleştirir
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
  // olayla tetiklenen KADEME artışları (stg): elle verilen kademeyle toplanır, ±6 ile sınırlı. Tek tetiklenme sayılır.
  'anger-point': { n: 'Anger Point', stg: { Atk: 12 }, c: 'critical hit taken' },
  'defiant': { n: 'Defiant', stg: { Atk: 2 }, c: 'a stat is lowered' },
  'competitive': { n: 'Competitive', stg: { SpA: 2 }, c: 'a stat is lowered' },
  'justified': { n: 'Justified', stg: { Atk: 1 }, c: 'hit by Dark move' },
  'rattled': { n: 'Rattled', stg: { Spe: 1 }, c: 'hit by Bug/Ghost/Dark' },
  'steadfast': { n: 'Steadfast', stg: { Spe: 1 }, c: 'flinched' },
  'weak-armor': { n: 'Weak Armor', stg: { Def: -1, Spe: 2 }, c: 'hit by physical move' },
  'stamina': { n: 'Stamina', stg: { Def: 1 }, c: 'hit' },
  'water-compaction': { n: 'Water Compaction', stg: { Def: 2 }, c: 'hit by Water move' },
  'well-baked-body': { n: 'Well-Baked Body', stg: { Def: 2 }, c: 'hit by Fire move' },
  'thermal-exchange': { n: 'Thermal Exchange', stg: { Atk: 1 }, c: 'hit by Fire move' },
  'steam-engine': { n: 'Steam Engine', stg: { Spe: 6 }, c: 'hit by Fire/Water move' },
  'motor-drive': { n: 'Motor Drive', stg: { Spe: 1 }, c: 'hit by Electric move' },
  'lightning-rod': { n: 'Lightning Rod', stg: { SpA: 1 }, c: 'hit by Electric move' },
  'storm-drain': { n: 'Storm Drain', stg: { SpA: 1 }, c: 'hit by Water move' },
  'sap-sipper': { n: 'Sap Sipper', stg: { Atk: 1 }, c: 'hit by Grass move' },
  'wind-rider': { n: 'Wind Rider', stg: { Atk: 1 }, c: 'wind move / tailwind' },
  'moxie': { n: 'Moxie', stg: { Atk: 1 }, c: 'after a KO' },
  'chilling-neigh': { n: 'Chilling Neigh', stg: { Atk: 1 }, c: 'after a KO' },
  'grim-neigh': { n: 'Grim Neigh', stg: { SpA: 1 }, c: 'after a KO' },
  'soul-heart': { n: 'Soul-Heart', stg: { SpA: 1 }, c: 'any Pokémon faints' },
  'berserk': { n: 'Berserk', stg: { SpA: 1 }, c: 'HP drops ≤ 1/2' },
  'anger-shell': { n: 'Anger Shell', stg: { Atk: 1, SpA: 1, Spe: 1, Def: -1, SpD: -1 }, c: 'HP drops ≤ 1/2' },
  'speed-boost': { n: 'Speed Boost', stg: { Spe: 1 }, c: 'end of turn' },
  'guard-dog': { n: 'Guard Dog', stg: { Atk: 1 }, c: 'intimidated' },
  'intrepid-sword': { n: 'Intrepid Sword', stg: { Atk: 1 }, c: 'on switch-in' },
  'dauntless-shield': { n: 'Dauntless Shield', stg: { Def: 1 }, c: 'on switch-in' },
  'beast-boost': { n: 'Beast Boost', stgHigh: 1, c: 'after a KO' },   // en yüksek stat +1
  'download':    { n: 'Download', stg: { Atk: 1 }, c: 'switch-in, foe Def < SpD' },   // shortcut: yalnız Atk hali; SpA için kademe düğmesi
  'unburden':    { n: 'Unburden', mul: { Spe: 2 }, c: 'held item used/lost' },
  'plus':        { n: 'Plus',  mul: { SpA: 1.5 }, c: 'ally has Plus/Minus' },
  'minus':       { n: 'Minus', mul: { SpA: 1.5 }, c: 'ally has Plus/Minus' },
  'slow-start':  { n: 'Slow Start', mul: { Atk: 0.5, Spe: 0.5 }, c: 'first 5 turns' },
  'overgrow': { n: "Overgrow", mul: { Atk: 1.5, SpA: 1.5 }, c: 'HP ≤ 1/3, Grass moves' },
  'blaze': { n: "Blaze", mul: { Atk: 1.5, SpA: 1.5 }, c: 'HP ≤ 1/3, Fire moves' },
  'torrent': { n: "Torrent", mul: { Atk: 1.5, SpA: 1.5 }, c: 'HP ≤ 1/3, Water moves' },
  'swarm': { n: "Swarm", mul: { Atk: 1.5, SpA: 1.5 }, c: 'HP ≤ 1/3, Bug moves' },
  'flash-fire': { n: "Flash Fire", mul: { Atk: 1.5, SpA: 1.5 }, c: 'after absorbing Fire, Fire moves' },
  'transistor': { n: "Transistor", mul: { Atk: 1.3, SpA: 1.3 }, c: 'Electric moves only' },
  'dragons-maw': { n: "Dragon's Maw", mul: { Atk: 1.5, SpA: 1.5 }, c: 'Dragon moves only' },
  'steelworker': { n: "Steelworker", mul: { Atk: 1.5, SpA: 1.5 }, c: 'Steel moves only' },
  'rocky-payload': { n: "Rocky Payload", mul: { Atk: 1.5, SpA: 1.5 }, c: 'Rock moves only' },
  'water-bubble': { n: "Water Bubble", mul: { Atk: 2, SpA: 2 }, c: 'Water moves only' },
  'commander': { n: "Commander", stg: { Atk: 2, Def: 2, SpA: 2, SpD: 2, Spe: 2 }, c: 'inside ally Dondozo' },
  'protosynthesis':{ n: 'Protosynthesis', high: true, c: 'sun' },   // en yüksek stat ×1.3 (Spe ise ×1.5)
  'quark-drive':   { n: 'Quark Drive',   high: true, c: 'electric terrain' },
};
const NK = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const abKey = name => Object.keys(ABILITIES).find(k => NK(k) === NK(name));
/** oyundaki eşya adı → tablo anahtarı ('' = stat etkisi yok / bilinmiyor) */
export const itemKey = name => Object.keys(ITEMS).find(k => NK(ITEMS[k].n) === NK(name)) ?? '';
/** Pokémon'un kendi (seçilebilir) ability'lerinden stat etkisi olanlar: [{k, n}] */
/** Pokémon'un kendi ability'si stat tablosundaysa anahtarı ('' = etkisi yok) */
export const ownAb = m => abKey(m.abName ?? m.ability) ?? '';
export const itemOptions = m => Object.entries(ITEMS).filter(([, d]) => (!d.sp || d.sp.includes(m.base?.species)) && (!d.evo || m.eff?.canEvo)).map(([k, d]) => ({ k, n: d.n }));
const fmt = mul => Object.entries(mul ?? {}).map(([s, v]) => `${s} ×${+v.toFixed(2)}`).join(', ') || '';
const fmtStg = d => d?.stgHigh ? 'best stat +1 stage' : Object.entries(d?.stg ?? {}).map(([s, v]) => v >= 12 ? `${s} → +6` : `${s} ${v > 0 ? '+' : ''}${v} stage`).join(', ');
export const modText = (tbl, k) => (fmt(tbl[k]?.mul) || fmtStg(tbl[k]) || (tbl[k]?.high ? 'best stat ×1.3' : '')) + (tbl[k]?.c ? ` · if ${tbl[k].c}` : '');

const stOf = { status: ['brn', 'tox'], poisoned: ['tox'], burned: ['brn'] };   // orbun verdiği durum ability koşulunu sağlar mı
/** kendi ability'sinin etkisi uygulanıyor mu: onay kutusu VEYA koşulu orb durumu sağlıyor; uygulanıyorsa tablo kaydı */
export const abActive = m => {
  const own = ownAb(m), c = ABILITIES[own]?.c, { st, booster } = ITEMS[m.view?.item] ?? {};
  return own && (m.view?.abil === 'on' || (c && st && stOf[c]?.includes(st)) || (booster && ABILITIES[own].high)) ? ABILITIES[own] : null;
};

const bestOf = out => ['Atk', 'Def', 'SpA', 'SpD', 'Spe'].reduce((a, k) => (out[k] > out[a] ? k : a), 'Atk');
/** toplam kademe: elle verilen + aktif ability'nin kademesi, ±6; out = kademesiz statlar */
export const stageOf = (m, k, manual, out) => {
  const ab = abActive(m), add = (ab?.stgHigh && out ? (bestOf(out) === k ? ab.stgHigh : 0) : ab?.stg?.[k] ?? 0) + (ITEMS[m.view?.item]?.stg?.[k] ?? 0);
  return Math.max(-6, Math.min(6, (manual || 0) + add));
};

/** stat çarpanları {Atk:1.5,…}; out = nature sonrası stat değerleri (en yüksek stat kuralı için) */
export function modsFor(m, out){
  const mul = {}, add = d => { if(d) for(const [s, v] of Object.entries(d.mul ?? {})) mul[s] = (mul[s] ?? 1) * v; };
  const it = ITEMS[m.view?.item], ab = abActive(m);
  if(it?.st === 'brn' && ab !== ABILITIES.guts) mul.Atk = (mul.Atk ?? 1) * 0.5;   // burn: fiziksel yarılama (Guts'ta yok)
  if(it && (!it.sp || it.sp.includes(m.base?.species)) && (!it.evo || m.eff?.canEvo)) add(it);
  add(ab);
  if(ab?.high && out){ const best = ['Atk', 'Def', 'SpA', 'SpD', 'Spe'].reduce((a, k) => (out[k] > out[a] ? k : a), 'Atk'); mul[best] = (mul[best] ?? 1) * (best === 'Spe' ? 1.5 : 1.3); }
  return mul;
}
