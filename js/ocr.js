/* Oyun ekran görüntüsünden (isim, seviye, ability, nature, IV/EV tablosu) Showdown metni üretir.
   Tesseract.js ilk kullanımda CDN'den yüklenir (~10 MB dil verisi dahil), sonra tarayıcı önbelleğinden gelir.
   Düzen sabit oranlara değil, "Ability" / "Nature" / "ATK:" gibi etiketlerin bulunduğu yere göre okunur;
   bu yüzden pencere kırpma boyutu değişse de çalışır.
   shortcut: yalnızca bu oyunun bilgi penceresi düzenini tanır (etiketler: Ability, Nature, ATK/DEF/SPD/SPATK/SPDEF/HP). */
import { NATURES, KEYS } from './data.js';

const TESS_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

/* tablo satır etiketleri → stat (oyundaki SPD = Speed) */
const STAT_LABELS = { ATK:'Atk', DEF:'Def', SPD:'Spe', SPATK:'SpA', SPDEF:'SpD', HP:'HP' };

/* İlerleme: ilk kullanımda kütüphane+dil verisi yükleme %0-50, kalan okuma geçişleri; sonraki kullanımlarda okuma %0-100 */
let report = () => {};
let loadFrac = 0, workerReady = false;
const LOAD_W = { 'loading tesseract core': [0, .15], 'initializing tesseract': [.15, .05], 'loading language': [.2, .7], 'initializing api': [.9, .1] };
function onLoadLog(m){
  const key = Object.keys(LOAD_W).find(k => m.status?.startsWith(k)); if(!key) return;
  const [start, w] = LOAD_W[key];
  loadFrac = Math.max(loadFrac, start + w * (m.progress ?? 0));
  report(loadFrac * 50, 'Downloading OCR engine…');
}

let workerP = null;
function getWorker(){
  return workerP ??= (async () => {
    if(!window.Tesseract){
      await new Promise((ok, fail) => {
        const s = document.createElement('script');
        s.src = TESS_SRC; s.onload = ok; s.onerror = () => fail(new Error('OCR kütüphanesi yüklenemedi (internet?)'));
        document.head.appendChild(s);
      });
    }
    const w = await window.Tesseract.createWorker('eng', 1, { logger: onLoadLog });
    workerReady = true;
    return w;
  })().catch(e => { workerP = null; throw e; });
}

/** Görselin [x0,y0,x1,y1] piksel bölgesini büyütüp eşikler: parlak (açık/renkli) yazı siyah, zemin beyaz.
 *  thr: parlaklık eşiği (yüksek = yalnızca çok parlak yazı kalır). */
function prep(bmp, [x0, y0, x1, y1], k, thr){
  const sw = x1 - x0, sh = y1 - y0;
  const c = document.createElement('canvas'); c.width = Math.round(sw * k); c.height = Math.round(sh * k);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  g.drawImage(bmp, x0, y0, sw, sh, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for(let i = 0; i < p.length; i += 4){
    const v = 255 - Math.max(p[i], p[i+1], p[i+2]); // renkli (turuncu/yeşil) yazılar da koyu çıksın
    p[i] = p[i+1] = p[i+2] = v < thr ? 0 : 255;
  }
  g.putImageData(d, 0, 0);
  return c;
}

/** Bölgeyi okur; kelimeleri özgün görsel piksel koordinatlarıyla döndürür. */
async function read(worker, bmp, region, { k = 4, thr = 180, psm = '11', whitelist = '' } = {}){
  await worker.setParameters({ tessedit_pageseg_mode: psm, tessedit_char_whitelist: whitelist });
  const { data } = await worker.recognize(prep(bmp, region, k, thr));
  const words = data.words.filter(w => w.text.trim()).map(w => ({
    t: w.text.trim(), x0: region[0] + w.bbox.x0 / k, y0: region[1] + w.bbox.y0 / k,
    x1: region[0] + w.bbox.x1 / k, y1: region[1] + w.bbox.y1 / k,
  }));
  return { words, text: data.text };
}

/* ---------- yardımcılar ---------- */
function lev(a, b){
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for(let j = 1; j <= b.length; j++) m[0][j] = j;
  for(let i = 1; i <= a.length; i++) for(let j = 1; j <= b.length; j++)
    m[i][j] = Math.min(m[i-1][j] + 1, m[i][j-1] + 1, m[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return m[a.length][b.length];
}
const letters = s => s.replace(/[^A-Za-z]/g, '');
function fixNature(s){
  const w = letters(s).toLowerCase();
  let best = null, bd = 99;
  for(const n of NATURES){ const d = lev(w, n.toLowerCase()); if(d < bd){ bd = d; best = n; } }
  return bd <= 2 ? best : null;
}

/** words içinden en iyi eşleşen etiket kelimesini bulur (Levenshtein ≤ tol); x'e göre kısıt opsiyonel */
function findLabel(words, name, tol = 1){
  let best = null, bd = 99;
  for(const w of words){
    const d = lev(letters(w.t).toUpperCase(), name);
    if(d < bd){ bd = d; best = w; }
  }
  return bd <= tol ? best : null;
}

/** Etiketin hemen altındaki değer satırı: etiketle aynı sütundan başlayan, bir satır yüksekliği içindeki kelimeler */
function valueBelow(words, label){
  const h = label.y1 - label.y0;
  return words
    .filter(w => w !== label && w.y0 >= label.y1 - h * 0.3 && w.y0 <= label.y1 + h * 1.6 && Math.abs(w.x0 - label.x0) < h * 6 && w.x0 >= label.x0 - h * 0.8)
    .sort((a, b) => a.x0 - b.x0); // değer tek satırdır; aynı satırdaki kelimeler soldan sağa
}

/** Bir tablo satırının rakamlarından IV ve EV çıkarır. Oyun IV'yi 2, EV'yi 3 haneli yazar ("30 03 000");
 *  OCR boşlukları kaybettiği için sondan sabit genişlikle okunur. HP satırında stat değeri yoktur. */
function ivEv(digits, label, warnings){
  if(digits.length < 5){ // kesik okuma (sondaki sıfırlar düşmüş): IV'yi ilk iki haneden al
    if(!/^\d\d0*$/.test(digits)) warnings.push(`${label} satırı eksik okundu, kontrol et`);
    return { iv: +digits.slice(0, 2) || 0, ev: 0 };
  }
  return { iv: +digits.slice(-5, -3), ev: +digits.slice(-3) };
}

/** Görselden Showdown metni üretir; döner {text, warnings[]} */
export async function screenshotToText(file, onProgress = () => {}){
  const hadWorker = workerReady;
  report = onProgress;
  report(0, hadWorker ? 'Reading image…' : 'Downloading OCR engine…');
  const worker = await getWorker();
  const PASSES = 3; let done = 0;
  const step = label => { const base = hadWorker ? 0 : 50, span = hadWorker ? 100 : 50; report(base + span * done++ / PASSES, label); };
  const bmp = await createImageBitmap(file);
  const W = bmp.width, H = bmp.height, warnings = [];

  // 1) tüm görsel: etiketler + değerler + tablo
  step('Finding labels…');
  const { words } = await read(worker, bmp, [0, 0, W, H]);
  const lAbility = findLabel(words, 'ABILITY'), lNature = findLabel(words, 'NATURE');
  if(!lAbility || !lNature) throw new Error('Pencere düzeni tanınamadı ("Ability" / "Nature" etiketleri bulunamadı)');

  const ability = valueBelow(words, lAbility).filter(w => w.y0 < lAbility.y1 + (lAbility.y1 - lAbility.y0) * 1.6)
    .map(w => w.t).join(' ').replace(/[^A-Za-z'’ \-]/g, '').trim();
  if(!ability) throw new Error('Ability okunamadı');
  const natureRaw = valueBelow(words, lNature).map(w => w.t).join(' ');
  const nature = fixNature(natureRaw);
  if(!nature) throw new Error('Nature okunamadı ("' + natureRaw + '")');

  // IV/EV tablosu: satır etiketlerini bul, aynı satırdaki rakamları soldan sağa birleştir
  const labelWords = words.filter(w => w.x0 > W * 0.4 && w.y0 > lNature.y0);
  const iv = {}, ev = {};
  for(const [lab, key] of Object.entries(STAT_LABELS)){
    const l = findLabel(labelWords, lab, lab.length > 3 ? 2 : 1);
    if(!l) throw new Error(`IV/EV tablosunda "${lab}" satırı bulunamadı`);
    const cy = (l.y0 + l.y1) / 2;
    const digits = words.filter(w => w !== l && w.x0 >= l.x1 - 2 && cy > w.y0 - 2 && cy < w.y1 + 2)
      .sort((a, b) => a.x0 - b.x0).map(w => w.t.replace(/\D/g, '')).join('');
    ({ iv: iv[key], ev: ev[key] } = ivEv(digits, key, warnings));
  }
  if(Object.values(iv).some(v => v > 31)) warnings.push("bazı IV değerleri 31'den büyük, kontrol et");
  if(Object.values(ev).some(v => v > 252)) warnings.push("bazı EV değerleri 252'den büyük, kontrol et");

  // 2) başlık: isim (koyu gri zemin üstünde açık yazı → düşük eşik), sonra ismin sağındaki "Lv. N"
  step('Reading name…');
  const bandBottom = Math.max(lAbility.y0 * 0.5, H * 0.1);
  const nameRead = await read(worker, bmp, [W * 0.04, 0, W * 0.82, bandBottom], { k: 4, thr: 110, psm: '11' });
  const nw = nameRead.words.sort((a, b) => a.x0 - b.x0);
  const first = nw.findIndex(w => /[A-Za-z]{3}/.test(w.t));
  if(first < 0) throw new Error('Pokémon adı okunamadı ("' + nameRead.text.trim() + '")');
  // "Mr. Mime" gibi boşluklu isimler: bitişik kelimeleri (küçük boşluk) birleştir; cinsiyet ikonu/Lv uzaktadır
  const parts = [nw[first]];
  for(const w of nw.slice(first + 1)){
    const prev = parts[parts.length - 1], h = prev.y1 - prev.y0;
    if(w.x0 - prev.x1 < h * 0.45 && /[A-Za-z]{2}/.test(w.t)) parts.push(w); else break;
  }
  const nameW = { ...parts[parts.length - 1], y0: nw[first].y0, y1: nw[first].y1 };
  const name = parts.map(w => w.t.replace(/[^A-Za-z'’.\- ]/g, '')).join(' ').trim();

  step('Reading level…');
  const lvRead = await read(worker, bmp, [nameW.x1, Math.max(0, nameW.y0 - 4), Math.min(W, nameW.x1 + W * 0.26), nameW.y1 + 4],
    { k: 6, thr: 160, psm: '7', whitelist: 'Lv.0123456789 ' });
  const level = +(lvRead.text.match(/(\d{1,3})\s*$/)?.[1] ?? 0) || null;
  if(!level) warnings.push('seviye okunamadı');

  report(100, 'Done');
  const fmt = o => KEYS.map(k => `${o[k]} ${k}`).join(' / ');
  const text = [name, level ? `Level: ${level}` : null, `${nature} Nature`, `Ability: ${ability}`,
    `EVs: ${fmt(ev)}`, `IVs: ${fmt(iv)}`].filter(Boolean).join('\n');
  return { text, warnings };
}
