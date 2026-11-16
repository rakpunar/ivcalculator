/* Veri kaynağı: yalnızca PokéAPI (+ PokeAPI/sprites görselleri), doğrudan tarayıcıdan.
   Tüm istekler promise-cache'lidir: aynı kaynağa ikinci istek atılmaz. */
import { STAT_API_TO_KEY } from './data.js';
import { slugify } from './parser.js';

/* Kalıcı önbellek (Cache API): PokéAPI cevapları ve sprite görselleri sayfa yenilense de saklanır.
   Cache API yoksa/başarısız olursa her şey eskisi gibi ağdan gelir. */
const CACHE = 'ivcalc-data-v1', TTL = 30 * 864e5; // 30 gün
const store = () => (globalThis.caches ? caches.open(CACHE) : Promise.resolve(null)).catch(() => null);
async function cacheGet(url){
  try{
    const r = await (await store())?.match(url);
    if(r && Date.now() - (+r.headers.get('x-cached-at') || 0) < TTL) return r;
  }catch(e){}
  return null;
}
async function cachePut(url, body, type){
  try{ await (await store())?.put(url, new Response(body, { headers: { 'x-cached-at': Date.now(), 'content-type': type } })); }catch(e){}
}

const blobMemo = new Map(); // url → blob: adresi (oturum içi)
/** Görsel adresini döner: kalıcı önbellekte varsa blob:, yoksa (ve arka planda kaydedip) özgün url */
export async function imgSrc(url){
  if(!url) return '';
  if(blobMemo.has(url)) return blobMemo.get(url);
  const hit = await cacheGet(url);
  if(hit){ const b = URL.createObjectURL(await hit.blob()); blobMemo.set(url, b); return b; }
  fetch(url).then(async r => { if(r.ok) await cachePut(url, await r.blob(), r.headers.get('content-type') || 'image/png'); }).catch(() => {});
  return url;
}

/* PokéAPI dostu istek: en fazla 2 paralel, istek başlangıçları arası ~200 ms, 429/5xx/ağ hatasında üstel geri çekilmeyle tekrar */
const sleep = ms => new Promise(r => setTimeout(r, ms));
let inflight = 0, nextStart = 0;
const waiters = [];
async function acquire(){
  while(inflight >= 2) await new Promise(r => waiters.push(r));
  inflight++;
  const now = Date.now(), at = Math.max(now, nextStart);
  nextStart = at + 200;
  if(at > now) await sleep(at - now);
}
const release = () => { inflight--; waiters.shift()?.(); };

export async function fetchJSON(url){
  const hit = await cacheGet(url);
  if(hit) return hit.json();
  let err;
  for(let i = 0; i < 4; i++){
    await acquire();
    let wait = 600 * 2 ** i;
    try{
      const r = await fetch(url);
      if(r.ok){ const txt = await r.text(); cachePut(url, txt, 'application/json'); return JSON.parse(txt); }
      err = new Error('HTTP ' + r.status);
      if(r.status !== 429 && r.status < 500) throw err; // 404 vb. tekrar denenmez
      wait = Math.max(wait, (+r.headers.get('Retry-After') || 0) * 1000);
    }catch(e){ if(e === err) throw e; err = e; } // ağ hatası: tekrar dene
    finally{ release(); }
    await sleep(wait);
  }
  throw err;
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
  const slug = slugify(name.replace(/['’]/g, '')); // "Mind's Eye" → minds-eye
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

/* Bazı türlerin /pokemon/<tür> adresi yoktur (morpeko → morpeko-full-belly, mimikyu → mimikyu-disguised, eiscue, indeedee…):
   404'te türün varsayılan formuna düşülür. */
const pokemonJSON = slug => cached(pkCache, slug, async () => {
  try{ return await fetchJSON(API + 'pokemon/' + slug); }
  catch(e){
    if(e.message !== 'HTTP 404') throw e;
    const sp = await fetchJSON(API + 'pokemon-species/' + slug).catch(() => null);
    const def = sp?.varieties.find(v => v.is_default)?.pokemon.name;
    if(!def || def === slug) throw e;
    return fetchJSON(API + 'pokemon/' + def);
  }
});

/** slug → {stats, types, id} */
export const baseStats = name => cached(baseCache, slugify(name), async () => {
  const j = await pokemonJSON(slugify(name));
  const b = {};
  j.stats.forEach(s => { const k = STAT_API_TO_KEY[s.stat.name]; if(k) b[k] = s.base_stat; });
  return { stats:b, types:j.types.map(t => t.type.name), id:j.id, species:+j.species.url.match(/(\d+)\/?$/)[1] };
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
  const own0 = slugify(mon.name), v = mon.view;
  const { self, finals } = await speciesInfo(own0);
  const own = own0 === self.name ? self.def : own0; // tür adı = varsayılan formu (morpeko → morpeko-full-belly)
  const forms = [...new Set([own, ...self.forms])];
  let form = forms.includes(v.form) ? v.form : own;
  // ability doğrulama: kullanıcının Pokémon'unun (seçili formun) gerçek ability listesi
  const norm = x => x.toLowerCase().replace(/[^a-z0-9]/g, '');
  const abOf = async sl => (await pokemonJSON(sl)).abilities.map(a => a.ability.name);
  const has = list => list.some(a => norm(a) === norm(mon.ability));
  let ownAbs = await abOf(form), autoForm = null;
  if(!has(ownAbs) && !v.form){ // form seçilmemiş: ability başka bir formun ise (ör. Ursaluna-Bloodmoon "Mind's Eye") o formu kullan
    for(const f of forms.filter(x => x !== form)){
      const a = await abOf(f);
      if(has(a)){ autoForm = f; form = f; ownAbs = a; break; }
    }
  }
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
  // ability: mega'da mega formunun kendi (tek) ability'si; kullanıcının ability'si ise türün gerçek listesinde olmalı
  const isMega = !!(v.mega && megaSp);
  const prettyAb = x => x.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const megaAbs = isMega ? (await pokemonJSON(slug)).abilities.filter(a => !a.is_hidden).map(a => a.ability.name) : [];
  const label = slug === own ? mon.name : slug.replace(/-/g, ' ');
  return { slug, label, base, isMega,
    megaAbility: megaAbs[0] ? prettyAb(megaAbs[0]) : null,
    abilityOk: has(ownAbs), autoForm,
    ownAbilities: ownAbs.map(prettyAb),
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
