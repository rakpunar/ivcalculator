/* Veri katmanı: oyun verisi (gamedata/, bkz. game.js) + yerel sprite önbelleği. PokéAPI kullanılmaz. */
import { game } from './game.js';
import { t } from './i18n.js';

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

const prettyStat = n => ({ attack:'Atk', defense:'Def', 'special-attack':'SpA', 'special-defense':'SpD', speed:'Spe', hp:'HP' }[n] ?? n);
const prettyAb = x => String(x);

/* ---------- ability ---------- */
export async function abilityDesc(name){
  const d = (await game()).abilityDesc(name);
  return (d?.accurate || d?.desc || '').trim() || 'Açıklama bulunamadı.';
}

/* ---------- nature (sabit tablo; inc/dec = PokéAPI stat adları) ---------- */
const NATURE = { Lonely:'attack/defense', Brave:'attack/speed', Adamant:'attack/special-attack', Naughty:'attack/special-defense',
  Bold:'defense/attack', Relaxed:'defense/speed', Impish:'defense/special-attack', Lax:'defense/special-defense',
  Timid:'speed/attack', Hasty:'speed/defense', Jolly:'speed/special-attack', Naive:'speed/special-defense',
  Modest:'special-attack/attack', Mild:'special-attack/defense', Quiet:'special-attack/speed', Rash:'special-attack/special-defense',
  Calm:'special-defense/attack', Gentle:'special-defense/defense', Sassy:'special-defense/speed', Careful:'special-defense/special-attack' };

export async function natureInfo(name){
  const k = String(name).trim().replace(/^./, c => c.toUpperCase()).toLowerCase().replace(/^./, c => c.toUpperCase());
  const [inc, dec] = (NATURE[k] ?? '/').split('/');
  return { inc: inc || null, dec: dec || null };
}

export function natDescOf(ni){
  const inc = prettyStat(ni.inc), dec = prettyStat(ni.dec);
  return (ni.inc && ni.dec)
    ? t('+{inc} / −{dec}: Raises {inc} by 10%, lowers {dec} by 10%.', { inc, dec })
    : t('Neutral nature — affects no stat.');
}
export async function natureDesc(name){
  return natDescOf(await natureInfo(name));
}

/* ---------- görünüm: mon.view'a göre gösterilecek Pokémon ---------- */
const norm = x => String(x ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** view = {stage:'current'|'final', mega:bool, form, finalPick, megaPick, lvl100}; form/finalPick/megaPick = oyun dex id'leri.
 *  döner {id, label, base, isMega, megaAbility, abilityOk, autoForm, ownAbilities, opts} */
export async function resolveView(mon){
  const G = await game(), v = mon.view;
  const own = mon.dex != null ? +mon.dex : G.idByName(mon.name);
  if(own == null || !G.dex[own]) throw new Error(`Unknown Pokémon "${mon.name}"`);
  const root = G.rootOf(own), forms = G.formsOf(root);
  if(!forms.includes(own)) forms.unshift(own);
  const num = x => (x == null || x === '' ? NaN : +x); // eski kayıtlardaki PokéAPI adları (metin) yok sayılır
  const ownForm = G.formId(own, +mon.gform || 0); // alternatif form (Alola vb.): kendi stat/tür/evrim zincirini izler
  let form = forms.includes(num(v.form)) ? num(v.form) : (forms.includes(ownForm) ? ownForm : own);
  // ability doğrulama: seçili formun gerçek ability listesi
  const has = list => list.some(a => norm(a) === norm(mon.ability));
  let ownAbs = G.abilitiesOf(form), autoForm = null;
  if(!has(ownAbs) && !forms.includes(num(v.form)) && ownForm === own){ // form oyundan biliniyorsa tahmin yok // form seçilmemiş: ability başka formun ise o formu kullan
    for(const f of forms.filter(x => x !== form)){
      const a = G.abilitiesOf(f);
      if(has(a)){ autoForm = f; form = f; ownAbs = a; break; }
    }
  }
  const finals = G.finalsOf(root, G.hasEvo(ownForm) ? ownForm : root);
  const pickFinal = finals.includes(num(v.finalPick)) ? num(v.finalPick) : finals[0];
  const megaSp = [root, ...(pickFinal != null ? [pickFinal] : []), ...finals].map(G.rootOf).find(s => G.megasOf(s).length);

  let id = form, forms2 = forms;
  if(v.stage === 'final' && pickFinal != null){
    forms2 = G.formsOf(G.rootOf(pickFinal));
    id = forms2.includes(num(v.form)) ? num(v.form) : pickFinal;
  }
  const megas = megaSp != null ? G.megasOf(megaSp) : [];
  const isMega = !!(v.mega && megaSp != null);
  if(isMega){ // mega, evrim aşamasından bağımsız ek seçim
    forms2 = [];
    id = megas.includes(num(v.megaPick)) ? num(v.megaPick) : megas[0];
  }
  const labels = {};
  [...forms2, ...finals, ...megas, ...forms].forEach(i => { labels[i] = G.label(i); });
  return { id, label: id === own ? mon.name : G.label(id), isMega,
    base: { stats: G.stats(id), types: G.types(id), id, species: G.rootOf(id) },
    megaAbility: isMega ? (G.abilitiesOf(id)[0] ?? null) : null,
    abilityOk: has(ownAbs), autoForm, hiddenAb: G.hiddenOf(form),
    ownAbilities: ownAbs.map(prettyAb),
    opts: { forms: forms2, curForm: id, finals, megas, hasMega: megaSp != null, labels } };
}

/* ---------- move ---------- */
const CAT = ['physical', 'special', 'status'];
/** oyun tablosunda yalnızca tür/kategori/güç var; doğruluk, PP, öncelik, açıklama yok (null) */
export async function moveMeta(name){
  const m = (await game()).move(name);
  if(!m) throw new Error(`Unknown move "${name}"`);
  return { type: m.Type, cat: CAT[m.Category] ?? 'status', power: m.Power || null, accuracy: null, pp: null, priority: 0, desc: '' };
}

export async function loadMoveMeta(mon){
  if(mon.moveMeta || !mon.moves?.length) return;
  const metas = await Promise.all(mon.moves.map(x => moveMeta(x).catch(() => null))); // bilinmeyen hamle diğerlerini engellemez
  mon.moveMeta = Object.fromEntries(mon.moves.map((x, i) => [x, metas[i]]).filter(([, m]) => m));
}
