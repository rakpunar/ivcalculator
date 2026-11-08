/* Veri kaynakları: 1) PokéAPI (CORS-ok, doğrudan)  2) pokemondb.net (proxy + HTML scrape, fallback)
   Tüm istekler promise-cache'lidir: aynı kaynağa ikinci istek atılmaz. */
import { STAT_API_TO_KEY } from './data.js';
import { slugify } from './parser.js';

const PROXY = u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u);

async function fetchText(url){
  const r = await fetch(PROXY(url));
  if(!r.ok) throw new Error('HTTP ' + r.status);
  return await r.text();
}
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
      desc = en?.short_effect?.trim() || en?.effect?.trim();
      if(!desc) desc = await abilityDescDB(slug);
    }catch(e){
      desc = await abilityDescDB(slug); // PokéAPI kapalıysa pokemondb
    }
    if(desc.length > 400) desc = desc.slice(0,380).replace(/\s+\S*$/,'') + '…';
    abCache[slug] = desc || 'Açıklama bulunamadı.';
    delete abPending[slug];
    return abCache[slug];
  })();
  abPending[slug].catch(() => { delete abPending[slug]; });
  return abPending[slug];
}

async function abilityDescDB(slug){
  const html = await fetchText('https://pokemondb.net/ability/' + slug);
  const doc = new DOMParser().parseFromString(html,'text/html');
  let desc = doc.querySelector('.view-effect')?.textContent?.trim();
  if(!desc){
    const td = doc.querySelector('.vitals-table tbody tr td');
    desc = td ? td.textContent.trim() : '';
  }
  return desc || '';
}

/* ---------- nature ---------- */
const natureCache = {}; // key → {inc, dec} (PokéAPI stat adları)
let naturePending = null;

function dbStatToApi(s){
  return { 'attack':'attack', 'defense':'defense', 'special attack':'special-attack',
           'special defense':'special-defense', 'speed':'speed', 'hp':'hp', '—':null }[s.toLowerCase()] ?? null;
}

export async function natureInfo(name){
  const key = name.toLowerCase();
  if(natureCache[key]) return natureCache[key];
  if(!naturePending){
    naturePending = (async () => {
      let info;
      try{
        const j = await fetchJSON('https://pokeapi.co/api/v2/nature/' + key);
        info = { inc: j.increased_stat?.name ?? null, dec: j.decreased_stat?.name ?? null };
      }catch(e){
        const html = await fetchText('https://pokemondb.net/nature');
        const doc = new DOMParser().parseFromString(html,'text/html');
        let hit = null;
        doc.querySelectorAll('.vitals-table tbody tr, table.data-table tbody tr').forEach(tr=>{
          const tds = tr.querySelectorAll('td');
          if(tds.length>=3 && tds[0].textContent.trim().toLowerCase()===key)
            hit = { inc: tds[1].textContent.trim(), dec: tds[2].textContent.trim() };
        });
        if(!hit) throw new Error('Nature bulunamadı (' + key + ')');
        info = { inc: dbStatToApi(hit.inc), dec: dbStatToApi(hit.dec) };
      }
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
const baseCache = {};   // slug → {stats, types, id}
const basePending = {};

export async function baseStats(name){
  const slug = slugify(name);
  if(baseCache[slug]) return baseCache[slug];
  if(basePending[slug]) return basePending[slug];
  basePending[slug] = (async () => {
    const j = await fetchJSON('https://pokeapi.co/api/v2/pokemon/' + slug);
    const b = {};
    j.stats.forEach(s => { const k = STAT_API_TO_KEY[s.stat.name]; if(k) b[k] = s.base_stat; });
    baseCache[slug] = { stats:b, types:j.types.map(t=>t.type.name), id:j.id };
    delete basePending[slug];
    return baseCache[slug];
  })();
  basePending[slug].catch(() => { delete basePending[slug]; });
  return basePending[slug];
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
export const spriteURL = name => 'https://img.pokemondb.net/sprites/home/normal/' + slugify(name) + '.png';
export const artURL    = name => 'https://img.pokemondb.net/artwork/large/' + slugify(name) + '.png';
