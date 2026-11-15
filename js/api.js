/* Veri kaynağı: yalnızca PokéAPI (+ PokeAPI/sprites görselleri), doğrudan tarayıcıdan.
   Tüm istekler promise-cache'lidir: aynı kaynağa ikinci istek atılmaz. */
import { STAT_API_TO_KEY } from './data.js';
import { slugify } from './parser.js';

export async function fetchJSON(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error('HTTP ' + r.status);
  return await r.json();
}

function prettyStat(apiName){
  return { attack:'Atk', defense:'Def', 'special-attack':'SpA',
           'special-defense':'SpD', speed:'Spe', hp:'HP' }[apiName] ?? apiName;
}

/* ---------- ability ---------- */
const abNameFixes = { // Showdown adı → PokéAPI slug farkları
  'battle-bond':'battle-bond', 'power-construct':'power-construct',
  'gulp-missile':'gulp-missile', 'neutralizing-gas':'neutralizing-gas'
};
const abCache = {};   // slug → desc
const abPending = {}; // slug → Promise

export async function abilityDesc(name){
  const slug = slugify(name);
  if(abCache[slug] !== undefined) return abCache[slug];
  if(abPending[slug]) return abPending[slug];
  abPending[slug] = (async () => {
    let desc;
    try{
      const j = await fetchJSON('https://pokeapi.co/api/v2/ability/' + slug);
      const en = (j.effect_entries || []).find(e => e.language?.name === 'en');
      desc = en?.short_effect?.trim() || en?.effect?.trim() || '';
    }catch(e){
      desc = ''; // PokéAPI'de yoksa/kapalıysa "Açıklama bulunamadı"
    }
    if(desc.length > 400) desc = desc.slice(0,380).replace(/\s+\S*$/,'') + '…';
    abCache[slug] = desc || 'Açıklama bulunamadı.';
    delete abPending[slug];
    return abCache[slug];
  })();
  abPending[slug].catch(() => { delete abPending[slug]; });
  return abPending[slug];
}

/* ---------- nature ---------- */
const natureCache = {}; // key → {inc, dec} (PokéAPI stat adları)
let naturePending = null;

export async function natureInfo(name){
  const key = name.toLowerCase();
  if(natureCache[key]) return natureCache[key];
  if(!naturePending){
    naturePending = (async () => {
      const j = await fetchJSON('https://pokeapi.co/api/v2/nature/' + key);
      const info = { inc: j.increased_stat?.name ?? null, dec: j.decreased_stat?.name ?? null };
      natureCache[key] = info;
      return info;
    })();
    naturePending.catch(() => { naturePending = null; });
  }
  return naturePending;
}

export function natDescOf(ni){
  const inc = prettyStat(ni.inc), dec = prettyStat(ni.dec);
  return (ni.inc && ni.dec)
    ? `+${inc} / −${dec}: ${inc} statını %10 arttırır, ${dec} statını %10 azaltır.`
    : 'Nötr nature — hiçbir statı etkilemez.';
}
export async function natureDesc(name){
  return natDescOf(await natureInfo(name));
}

/* ---------- pokemon / base stat ---------- */
/* promise-cache: aynı anahtar bir kez çekilir; hata olursa tekrar denenebilir */
const cached = (cache, key, fn) => cache[key] ??= fn().catch(e => { delete cache[key]; throw e; });
const API = 'https://pokeapi.co/api/v2/';
const pkCache = {}, spCache = {}, chCache = {}, infoCache = {}, baseCache = {};

const pokemonJSON = slug => cached(pkCache, slug, () => fetchJSON(API + 'pokemon/' + slug));

/** slug → {stats, types, id} */
export const baseStats = name => cached(baseCache, slugify(name), async () => {
  const j = await pokemonJSON(slugify(name));
  const b = {};
  j.stats.forEach(s => { const k = STAT_API_TO_KEY[s.stat.name]; if(k) b[k] = s.base_stat; });
  return { stats:b, types:j.types.map(t => t.type.name), id:j.id };
});

/* ---------- tür (species): formlar, mega, evrim zinciri ---------- */
const NOT_FORM = /-mega|-gmax|-totem|-cap$|-cosplay|-rock-star|-belle|-pop-star|-phd|-libre|-starter/;

const speciesData = name => cached(spCache, name, async () => {
  const s = await fetchJSON(API + 'pokemon-species/' + name);
  const names = s.varieties.map(v => v.pokemon.name);
  return {
    name,
    def:   s.varieties.find(v => v.is_default)?.pokemon.name ?? names[0],
    forms: names.filter(n => !NOT_FORM.test(n)),
    megas: names.filter(n => /-mega/.test(n)),
    chain: s.evolution_chain?.url,
  };
});

const findNode = (n, sp) => n.species.name === sp ? n : n.evolves_to.map(c => findNode(c, sp)).find(Boolean);
const leaves   = n => n.evolves_to.length ? n.evolves_to.flatMap(leaves) : [n.species.name];

/** slug → {self, finals[]} (her biri speciesData; finals = son evrim(ler), evrimi yoksa boş) */
const speciesInfo = slug => cached(infoCache, slug, async () => {
  const sp = (await pokemonJSON(slug)).species.name;
  const self = await speciesData(sp);
  let finals = [];
  if(self.chain){
    const root = (await cached(chCache, self.chain, () => fetchJSON(self.chain))).chain;
    const node = findNode(root, sp);
    if(node) finals = await Promise.all(leaves(node).filter(n => n !== sp).map(speciesData));
  }
  return { self, finals };
});

/** mon.view'a göre gösterilecek Pokémon'u çözer.
 *  view = {stage:'current'|'final', mega:bool, form, finalPick, megaPick, lvl100}
 *  döner {slug, label, base, opts:{forms, finals, megas, hasMega}} */
export async function resolveView(mon){
  const own = slugify(mon.name), v = mon.view;
  const { self, finals } = await speciesInfo(own);
  const forms = [...new Set([own, ...self.forms])];
  const form = forms.includes(v.form) ? v.form : own;
  const pickFinal = finals.find(f => f.name === v.finalPick) ?? finals[0];
  const megaSp = [self, ...(pickFinal ? [pickFinal] : []), ...finals].find(s => s.megas.length);

  let slug = form, forms2 = forms;
  if(v.stage === 'final' && pickFinal){
    forms2 = pickFinal.forms;
    // bölgesel ek (alola/galar/hisui/paldea…) son evrimde de varsa korunur
    const suffix = form.startsWith(self.name) ? form.slice(self.name.length) : '';
    slug = forms2.includes(v.form) ? v.form
         : suffix && forms2.includes(pickFinal.name + suffix) ? pickFinal.name + suffix : pickFinal.def;
  }
  if(v.mega && megaSp){ // mega, evrim aşamasından bağımsız ek seçim; hattın mega'sı varsa onu gösterir
    forms2 = []; // mega'da form seçici yok
    slug = megaSp.megas.includes(v.megaPick) ? v.megaPick : megaSp.megas[0];
  }
  const base = await baseStats(slug);
  const label = slug === own ? mon.name : slug.replace(/-/g, ' ');
  return { slug, label, base,
    opts: { forms: forms2, curForm: slug, finals: finals.map(f => f.name), megas: megaSp?.megas ?? [], hasMega: !!megaSp } };
}

/* ---------- move ---------- */
const moveCache = {};   // slug → {type, cat}
const movePending = {};

export async function moveMeta(name){
  const slug = slugify(name);
  if(moveCache[slug]) return moveCache[slug];
  if(movePending[slug]) return movePending[slug];
  movePending[slug] = (async () => {
    const j = await fetchJSON('https://pokeapi.co/api/v2/move/' + slug);
    const fl = (j.flavor_text_entries || []).filter(e => e.language?.name === 'en');
    const flavor = fl.at(-1)?.flavor_text?.replace(/[\n\f]/g,' ') || '';
    moveCache[slug] = {
      type: j.type.name,
      cat: j.damage_class.name,
      power: j.power,
      accuracy: j.accuracy,
      pp: j.pp,
      priority: j.priority ?? 0,
      desc: flavor,
    };
    delete movePending[slug];
    return moveCache[slug];
  })();
  movePending[slug].catch(() => { delete movePending[slug]; });
  return movePending[slug];
}

export async function loadMoveMeta(mon){
  if(mon.moveMeta || !mon.moves?.length) return;
  try{
    const metas = await Promise.all(mon.moves.map(x => moveMeta(x)));
    mon.moveMeta = Object.fromEntries(mon.moves.map((x,i) => [x, metas[i]]));
  }catch(e){ /* bazı hamleler bulunamayabilir; rozetler boşa düşer */ }
}

/* ---------- görsel url'leri ---------- */
const SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
export const spriteURL = id => SPR + 'other/home/' + id + '.png';
export const artURL    = id => SPR + 'other/official-artwork/' + id + '.png';
