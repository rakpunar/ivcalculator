/* Yerel sprite'lar (gamedata/sprites, 128x128): oyundaki forma uygun görsel adayları üretir.
   Adaylar sırayla denenir (setImg); hiçbiri yoksa yer tutucu gösterilir. */
const SPR = 'gamedata/sprites/';

let formMapP = null;
const formMap = () => formMapP ??= fetch('gamedata/form-map.json').then(r => r.json()).then(j => j.species_forms ?? j).catch(() => (formMapP = null, {}));

/** mon: {dex?, gform?, shiny?, view}; speciesId: türün ulusal dex numarası (görünüm: evrim/mega/form seçimine göre). */
export async function spriteList(mon, speciesId){
  const out = [], v = mon.view || {};
  const add = p => { if(mon.shiny) out.push(`${SPR}${p}_shiny.png`); out.push(`${SPR}${p}.png`); }; // shiny yoksa normali
  // PC'den gelen Pokémon (dex = oyun kimliği) kendi formunu gösterir; evrim/mega seçilince türe göre görsel
  if(mon.dex && v.stage === 'current' && !v.mega && v.form == null){
    const dex = +mon.dex, f = +mon.gform || 0;
    if(dex >= 3000) add(`forms/${dex}`);
    else{
      if(f > 0){
        add(`forms/${dex}_${f}`);
        const sid = (await formMap())[dex]?.[f - 1];
        if(sid != null) add(`forms/${sid}`);
      }
      add(String(dex));
    }
  }
  if(speciesId) add(speciesId >= 3000 ? `forms/${speciesId}` : String(speciesId));
  return [...new Set(out)];
}

/** Hiçbir görsel bulunamazsa gösterilir */
export const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="12" fill="#1c2540"/><text x="48" y="62" font-size="44" text-anchor="middle" fill="#6b7aa8">?</text></svg>');
