/* Showdown export formatı ayrıştırıcı */

export function slugify(s){ return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }

function parseStats(str){
  const o = {};
  for(const part of str.split('/')){
    const m = part.trim().match(/^(\d+)\s+([A-Za-z]+)/);
    if(m) o[m[2]] = parseInt(m[1],10);
  }
  return o;
}

/** Metinden {name, level, ability, nature, evs, ivs, moves, tera} üretir.
 *  İsim/Ability/Nature zorunlu; eksikse Error. */
export function parseMon(text){
  const lines = text.split('\n').map(l=>l.trim()).filter(Boolean);
  const out = { moves:[], evs:{}, ivs:{}, name:null, level:null, ability:null, nature:null, tera:null };

  for(const line of lines){
    if(/^Ability\s*:/i.test(line))       out.ability = line.split(/:(.+)/)[1].trim();
    else if(/^Tera Type\s*:/i.test(line)) out.tera = line.split(/:(.+)/)[1].trim();
    else if(/^Level\s*:/i.test(line))    out.level = +line.split(':')[1].trim();
    else if(/^EVs\s*:/i.test(line))      out.evs = parseStats(line.split(/:(.+)/)[1]);
    else if(/^IVs\s*:/i.test(line))      out.ivs = parseStats(line.split(/:(.+)/)[1]);
    else if(/^-/.test(line))             out.moves.push(line.replace(/^-\s*/,'').trim());
    else if(/nature$/i.test(line) && !out.nature) out.nature = line.trim().replace(/\s*nature$/i,'');
    else if(!out.name) out.name = line.replace(/@.*$/,'').replace(/\((M|F)\)\s*$/,'').trim();
  }

  if(!out.name || !out.ability || !out.nature){
    throw new Error('İsim, Ability ve Nature satırları mutlaka olmalı! Metni kontrol et.');
  }
  return out;
}
