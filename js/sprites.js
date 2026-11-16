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

/** Saydam boşlukları kırpar (alfa > 16 sınır kutusu); sonuç data URL, kaynak başına önbellekli. */
const cropped = new Map();
export const cropSprite = src => cropped.get(src) ?? (cropped.set(src, new Promise((ok, no) => {
  const im = new Image();
  im.onerror = () => { cropped.delete(src); no(new Error('img')); };
  im.onload = () => {
    try{
      const w = im.naturalWidth, h = im.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for(let y = 0; y < h; y++) for(let i = 0; i < w; i++) if(d[(y * w + i) * 4 + 3] > 16){ if(i < x0) x0 = i; if(i > x1) x1 = i; if(y < y0) y0 = y; if(y > y1) y1 = y; }
      if(x1 < 0) return ok(src);
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1, o = document.createElement('canvas'); o.width = bw + 2; o.height = bh + 2;
      o.getContext('2d').drawImage(c, x0, y0, bw, bh, 1, 1, bw, bh);
      ok(o.toDataURL());
    }catch(e){ ok(src); } // shortcut: kırpma başarısızsa özgün görsel
  };
  im.src = src;
})), cropped.get(src));
