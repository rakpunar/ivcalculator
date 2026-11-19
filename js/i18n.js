/* Arayüz dili (EN / TR). Kaynak dil İngilizce: sözlük anahtarı = İngilizce metin.
   Pokémon, hamle, ability adları ve açıklamaları çevrilmez; yalnızca arayüz metinleri.
   - Statik/DOM metinleri: MutationObserver tam eşleşen metin düğümlerini ve title/placeholder/aria-label özniteliklerini çevirir.
   - Değişkenli metinler: t('... {x} ...', { x }). Sözlükte yoksa İngilizcesi döner. */
const TR = {
  'IV Calculator — Pokémon Inventory': 'IV Hesaplayıcı — Pokémon Envanteri',
  'Add Pokémon': 'Pokémon Ekle',
  '📋 Paste image from clipboard': '📋 Panodaki görseli yapıştır',
  'Read the image currently in your clipboard (same as pressing Ctrl+V)': 'Panodaki görseli oku (Ctrl+V ile aynı)',
  '📷 Image file…': '📷 Görsel dosyası…',
  'Choose an image file': 'Bir görsel dosyası seç',
  'Bot not found': 'Bot bulunamadı',
  '🤖 Import from bot': '🤖 Botdan al',
  'Import the whole PC from the ProHelper bot running on this computer': "Bu bilgisayarda çalışan ProHelper botundan tüm PC'yi al",
  '＋ Add to Inventory': '＋ Envantere Ekle',
  'Share / Sync': 'Paylaş / Senkronla',
  'Custom code (optional)': 'Özel kod (isteğe bağlı)', 'Custom code': 'Özel kod',
  '☁ Save & get link': '☁ Kaydet ve bağlantı al',
  'Save your list online and get a link that opens it on any device': 'Listeni çevrimiçi kaydet ve her cihazda açılan bir bağlantı al',
  'Saves the whole list online. Anyone with the link or code can open it.': 'Tüm listeyi çevrimiçi kaydeder. Bağlantıyı veya kodu bilen herkes açabilir.',
  'Code or link to load': 'Yüklenecek kod veya bağlantı',
  '⬇ Load': '⬇ Yükle',
  'Download the error log of this session as a .txt file to share': 'Bu oturumun hata günlüğünü paylaşmak için .txt olarak indir',
  'Clear the log': 'Günlüğü temizle',
  '↻ Update site': '↻ Siteyi güncelle',
  'Reload the newest version of the site (your inventory is kept)': 'Sitenin en yeni sürümünü yükle (envanterin korunur)',
  'Inventory (': 'Envanter (',
  '🗑 Clear All': '🗑 Tümünü Sil',
  'Delete all Pokémon in the inventory': "Envanterdeki tüm Pokémon'ları sil",
  'Select all': 'Tümünü seç', 'Deselect all': 'Seçimi kaldır', 'Invert': 'Tersine çevir',
  'ID': 'ID', 'Copy ID': 'ID’yi kopyala', '✔ Copied: {v}': '✔ Kopyalandı: {v}', 'Clear All': 'Tümünü sil', 'Compare': 'Karşılaştır', 'Compare Pokémon': 'Pokémon karşılaştır', 'Compare the selected Pokémon (select at least 2)': 'Seçili Pokémon’ları karşılaştır (en az 2 seç)', 'Important stats': 'Önemli statlar', 'Overall': 'Genel', 'Rank {r} of {n}': '{n} içinde {r}. sıra',
'Switch theme': 'Temayı değiştir', 'Layout': 'Yerleşim', 'Horizontal': 'Yatay', 'Vertical': 'Dikey', 'Release via bot': 'Bot ile sal', 'Ask the bot to release the selected Pokémon (the bot asks you in-game first)': 'Seçili Pokémon’ları bota saldır (bot önce oyunda sana sorar)', 'Send request': 'İsteği gönder', 'Send a release request for {n} Pokémon to the bot? The bot asks you in-game before releasing anything.': '{n} Pokémon için bota salma isteği gönderilsin mi? Bot, bir şey salmadan önce oyunda sana sorar.', '✔ Release request sent: {n} new.': '✔ Salma isteği gönderildi: {n} yeni.', 'Release request failed: {err}': 'Salma isteği başarısız: {err}', '🗑 {n} Pokémon released by the bot.': '🗑 Bot {n} Pokémon saldı.', '{n} release request(s) declined or not possible.': '{n} salma isteği iptal edildi ya da yapılamadı.', 'Open list': 'Listeyi aç', 'Cancel': 'İptal',
  '☁ Sync now': '☁ Şimdi eşitle', 'Synced': 'Eşitlendi', 'Saving…': 'Kaydediliyor…', 'Sync failed — will retry': 'Eşitleme başarısız — tekrar denenecek',
  'Read-only (old link)': 'Salt okunur (eski bağlantı)', 'List not found': 'Liste bulunamadı',
  'Disconnect this browser from the list (the list stays online; your own inventory comes back)': 'Bu tarayıcının listeyle bağlantısını kes (liste çevrimiçi kalır; kendi envanterin geri gelir)',
  'Open the shared list "{code}"? This browser will show and edit that list instead of its own inventory. Your own inventory stays saved here and comes back when you unlink.': '"{code}" paylaşılan listesi açılsın mı? Bu tarayıcı kendi envanteri yerine o listeyi gösterir ve düzenler. Kendi envanterin burada saklı kalır, bağlantıyı kesince geri gelir.',
  'Empty slot — click to add': 'Boş yuva — eklemek için tıkla',
  'Delete': 'Sil', 'Select': 'Seç', 'Ability': 'Yetenek', 'Total IV': 'Toplam IV',
  'IV total (max 186)': 'IV toplamı (maks 186)',
  'Close': 'Kapat', 'Moves': 'Hamleler', 'Type': 'Tür', 'Cat.': 'Kat.', 'Move': 'Hamle', 'Base': 'Taban', 'Base Stats': 'Taban Statlar',
  'Ability:': 'Yetenek:', 'Nature:': 'Karakter:', 'Hidden Power:': 'Hidden Power:',
  'loading…': 'yükleniyor…', 'OK': 'Tamam',
  'Current Lv.': 'Mevcut Lv.', 'Current': 'Mevcut', 'All:': 'Tümü:', 'Selected:': 'Seçili:',
  'Show final evolution': 'Son evrimi göster', 'No further evolution': 'Başka evrim yok',
  '★ Mega available': '★ Mega mevcut', 'Showing Mega Evolution': 'Mega Evrim gösteriliyor', 'This Pokémon has a Mega Evolution': "Bu Pokémon'un Mega Evrimi var",
  'List total IV': 'Liste toplam IV', 'Selected total IV': 'Seçili toplam IV',
  'Search name, move, ability…': 'İsim, hamle, yetenek ara…', 'Search': 'Ara', 'Sort by': 'Sırala',
  'Sort: inventory order': 'Sırala: envanter sırası', 'Name': 'İsim', 'Level': 'Seviye', 'Nature': 'Karakter', 'IV total': 'IV toplamı',
  'Perfect IVs (31)': 'Mükemmel IV (31)', '↑ Asc': '↑ Artan', '↓ Desc': '↓ Azalan',
  'Toggle ascending / descending': 'Artan / azalan arasında geçiş',
  'Filters': 'Filtreler', 'Nature: any': 'Karakter: hepsi', 'Type: any': 'Tür: hepsi', 'Hidden Power: any': 'Hidden Power: hepsi',
  '◆ Forms': '◆ Formlar', 'Reset': 'Sıfırla',
  'EV total': 'EV toplamı', '↺ Reset EVs': "↺ EV'leri sıfırla", 'Restore the EVs this Pokémon was added with': 'Pokémon eklendiğindeki EV değerlerini geri yükle',
  'All stats:': 'Tüm statlar:',
  'Loading…': 'Yükleniyor…', 'Could not load data.': 'Veri yüklenemedi.', 'Could not load description.': 'Açıklama yüklenemedi.',
  'No description available.': 'Açıklama yok.', 'Pwr:': 'Güç:', 'Acc:': 'İsab:', 'no moves': 'hamle yok',
  'Nature increase': 'Karakter artışı', 'Nature decrease': 'Karakter azalışı', 'Base value': 'Taban değer',
  'Code': 'Kod', 'Copy link': 'Bağlantıyı kopyala', 'Unlink': 'Bağlantıyı kes',
  'Stop updating this code from this browser (the saved list stays online)': 'Bu koda bu tarayıcıdan güncelleme yapmayı bırak (kayıtlı liste çevrimiçi kalır)',
  '☁ Update saved list': '☁ Kayıtlı listeyi güncelle',
  'Import finished': 'İçe aktarma bitti', 'Importing…': 'İçe aktarılıyor…', 'Starting…': 'Başlıyor…', 'Updating…': 'Güncelleniyor…',
  '⏳ Reading image… 0%': '⏳ Görsel okunuyor… %0',
  /* değişkenli metinler */
  'Lv. {l} · {n} Nature': 'Lv. {l} · {n} Karakteri',
  '{n} Nature': '{n} Karakteri',
  'Stats — Lv.{l} · IV · EV': 'Statlar — Lv.{l} · IV · EV',
  '/ {t} · max {m} each': '/ {t} · her biri en çok {m}',
  '/ {a} · {n} Pokémon': '/ {a} · {n} Pokémon',
  '/ {a} · {n} selected': '/ {a} · {n} seçili',
  'Filters · {n}': 'Filtreler · {n}',
  '+{inc} / −{dec}: Raises {inc} by 10%, lowers {dec} by 10%.': '+{inc} / −{dec}: {inc} statını %10 arttırır, {dec} statını %10 azaltır.',
  'Neutral nature — affects no stat.': 'Nötr karakter — hiçbir statı etkilemez.',
  '⏳ Fetching data for {n} Pokémon in the background…': "⏳ Arka planda {n} Pokémon'un verileri sırayla çekiliyor…",
  'All Pokémon will be removed from the inventory. Are you sure?': "Tüm Pokémon'lar envanterden silinecek. Emin misin?",
  '✔ {name}: stat data updated.': '✔ {name}: stat verisi güncellendi.',
  '⚠ {name}: could not fetch data ({err}); will retry in tooltip/modal.': '⚠ {name}: veri alınamadı ({err}); ipucu/modal açılınca tekrar denenecek.',
  '🗑 {name} removed from inventory.': '🗑 {name} envanterden silindi.',
  '🗑 Inventory cleared.': '🗑 Envanter temizlendi.',
  '⚠ Browser storage is full: the inventory could not be saved.': '⚠ Tarayıcı depolaması dolu: envanter kaydedilemedi.',
  '✔ {n} Pokémon restored from browser storage.': '✔ {n} Pokémon tarayıcı depolamasından geri yüklendi.',
  '✔ {name} added to inventory (Total IV: {iv}/186) — fetching details in background.': '✔ {name} envantere eklendi (Toplam IV: {iv}/186) — ayrıntılar arka planda çekiliyor.',
  '⏳ Reading the image takes a while (the first time the OCR engine, ~10 MB, must download). Please wait…': '⏳ Görseli okumak biraz sürer (ilk seferde ~10 MB OCR motoru indirilir). Lütfen bekle…',
  '⏳ {label} {pct}% — this can take a while, please wait…': '⏳ {label} %{pct} — bu biraz sürebilir, lütfen bekle…',
  '✔ Image read. Check the text, then click Add.': "✔ Görsel okundu. Metni kontrol et, sonra Ekle'ye tıkla.",
  '⚠ No image in the clipboard. Copy a screenshot first.': '⚠ Panoda görsel yok. Önce bir ekran görüntüsü kopyala.',
  '⚠ Could not read the clipboard. Press Ctrl+V on the page instead.': '⚠ Pano okunamadı. Bunun yerine sayfada Ctrl+V bas.',
  'Added: {a}\nSkipped (already in inventory): {s}\nSkipped (invalid): {b}': 'Eklenen: {a}\nAtlanan (envanterde var): {s}\nAtlanan (geçersiz): {b}',
  'Bot connected (PC: {pc})': 'Bot bağlı (PC: {pc})',
  'Bot import failed: {err}': 'Bot içe aktarma başarısız: {err}',
  '✔ List updated (code {code}).': '✔ Liste güncellendi (kod {code}).',
  'The inventory is empty.': 'Envanter boş.',
  'Code must be 4–24 characters: a–z, 0–9, "-".': 'Kod 4–24 karakter olmalı: a–z, 0–9, "-".',
  '✔ Saved. Code: {code}': '✔ Kaydedildi. Kod: {code}',
  '✖ That code is already taken. Choose another.': '✖ Bu kod zaten alınmış. Başka bir tane seç.',
  'This list has {n} Pokémon. You already have {m} in your inventory.': 'Bu listede {n} Pokémon var. Envanterinde zaten {m} tane var.',
  '✖ Enter a valid code or link.': '✖ Geçerli bir kod veya bağlantı gir.',
  'Invalid list data.': 'Geçersiz liste verisi.',
  '✔ {n} Pokémon loaded from {code}.': '✔ {n} Pokémon {code} listesinden yüklendi.',
  '✔ {n} Pokémon loaded from {code} ({s} already present).': '✔ {n} Pokémon {code} listesinden yüklendi ({s} tanesi zaten vardı).',
  '✖ No list found for that code.': '✖ Bu kod için liste bulunamadı.',
  '✔ Link copied.': '✔ Bağlantı kopyalandı.',
  '✖ Could not copy: {l}': '✖ Kopyalanamadı: {l}',
};
/* HTML içeren metinler (data-i18n-html="anahtar") */
const TR_HTML = {
  tip: 'İpucu: bir ekran görüntüsü kopyala, sonra bu sayfada herhangi bir yerde <kbd>Ctrl</kbd>+<kbd>V</kbd> bas. Görseli metin kutusuna sürükleyip de bırakabilirsin.',
};

export let lang = 'en';
try{ lang = localStorage.getItem('ivcalc.lang') || (/^tr/i.test(navigator.language) ? 'tr' : 'en'); }catch(e){}

export const t = (key, vars) => {
  let s = (lang === 'tr' && TR[key]) || key;
  if(vars) s = s.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
  return s;
};

/* ---- DOM çevirisi ---- */
const ATTRS = ['title', 'placeholder', 'aria-label'];
const textRec = new WeakMap(), attrRec = new WeakMap();
const conv = s => { const k = s.trim(); return lang === 'tr' && TR[k] ? s.replace(k, TR[k]) : s; };

function doText(n){
  const r = textRec.get(n), src = r && n.data === r.out ? r.src : n.data, out = conv(src);
  if(out !== n.data) n.data = out;
  if(out !== src || r) textRec.set(n, { src, out });
}
function doAttrs(el){
  const rec = attrRec.get(el) ?? {};
  for(const a of ATTRS){
    if(!el.hasAttribute?.(a)) continue;
    const cur = el.getAttribute(a), r = rec[a], src = r && cur === r.out ? r.src : cur, out = conv(src);
    if(out !== cur) el.setAttribute(a, out);
    if(out !== src || r) rec[a] = { src, out };
  }
  attrRec.set(el, rec);
}
function doHtml(el){
  el.dataset.en ??= el.innerHTML;
  el.innerHTML = lang === 'tr' && TR_HTML[el.dataset.i18nHtml] ? TR_HTML[el.dataset.i18nHtml] : el.dataset.en;
}
function walk(root){
  if(root.nodeType === 3){ doText(root); return; }
  if(root.nodeType !== 1) return;
  if(root.matches('script,style,textarea:not([placeholder])')) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n = root;
  do{
    if(n.nodeType === 3){ if(!n.parentElement?.closest('[data-i18n-html]')) doText(n); }
    else{ doAttrs(n); }
  }while((n = w.nextNode()));
}

let obs = null;
function start(){
  if(obs) return;
  obs = new MutationObserver(ms => {
    for(const m of ms){
      if(m.type === 'characterData') doText(m.target);
      else if(m.type === 'attributes') doAttrs(m.target);
      else m.addedNodes.forEach(walk);
    }
  });
  obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

/** tüm sayfayı mevcut dile çevirir (özgün İngilizce metinler korunur, geri dönülebilir) */
function applyAll(){
  document.documentElement.lang = lang;
  document.title = conv('IV Calculator — Pokémon Inventory');
  document.querySelectorAll('[data-i18n-html]').forEach(doHtml);
  walk(document.body);
}

export function setLang(l){
  lang = l;
  try{ localStorage.setItem('ivcalc.lang', l); }catch(e){}
  applyAll();
  dispatchEvent(new Event('langchange'));
}

export function initI18n(){
  const box = document.getElementById('langSw');
  if(box){
    box.className = 'seg';
    box.innerHTML = ['en', 'tr'].map(l => `<label><input type="radio" name="lang" value="${l}"${l === lang ? ' checked' : ''}><span>${l.toUpperCase()}</span></label>`).join('');
    box.addEventListener('change', e => setLang(e.target.value));
  }
  start(); applyAll();
}
