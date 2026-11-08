# IV Calculator — Pokémon Inventory

Showdown-formatında yapıştırılan Pokémon'un kartını oluşturan, IV/EV ve Lv.100 stat hesaplaması yapan bir envanter aracı.

**Canlı demo:** https://rakpunar.github.io/ivcalculator/

## Özellikler

- Showdown export formatı parse edilir (Name, Ability, Nature, EVs, IVs, Moves, Tera)
- Görsel, Ability açıklaması, Nature bilgisi ve Base Statlar **PokéAPI** üzerinden canlı çekilir (pokemondb HTML scrape fallback)
- Base statlar büyükten küçüğe sıralanır; **yeşil→kırmızı** progress bar
- Stat tablosu: `ATK / DEF / SPD / SPATK / SPDEF / HP` sırası ile IV, EV ve **Lv.100 hesabı** tek tabloda (Gen 3+ formülü, nature modifier dahil)
- Envanter kartları: isim, ability tooltip, nature tooltip, Toplam IV (max 186)
- Tarayıcıda kalıcı (localStorage) — sayfa yenilendiğinde envanter geri yüklenir
- Kart başına ✕ ve "Tümünü Sil" butonu
- Sırasız istek yok: talepler arka planda sırayla, promise-cache ile doldurulur

## Kullanım

1. Sayfayı aç
2. Sol metin alanına Showdown formatında Pokémonını yapıştır, örnek:

```
Mankey
Level: 22
Adamant Nature
Ability: Anger Point
EVs: 0 HP / 0 Atk / 0 Def / 0 SpA / 0 SpD / 0 Spe
IVs: 15 HP / 27 Atk / 4 Def / 29 SpA / 28 SpD / 11 Spe
- Cross Chop
- Swagger
- Pursuit
- Seismic Toss
```

3. "Envantere Ekle" — kart anında oluşur, detaylar arka planda çekilir.
4. Karta tıkla → büyük kartı (Lv.100 stats, IV/EV, base statlar, hamleler).

## Notlar

- Veri kaynağı: [PokéAPI](https://pokeapi.co) (CORS açık, doğrudan tarayıcıdan çağrılır); yeterli veri gelirse [pokemondb.net](https://pokemondb.net) fallback devreye girer.
- Pokémon kayıtları yalnızca **senin tarayıcında** saklanır (localStorage), sunucuya gitmez.

## Yerel Çalıştırma

ES modülleri kullanıldığı için `index.html`'i doğrudan çift tıklayarak açmak yerine küçük bir web sunucusu ile çalıştır:

```
npx serve .
# veya
python -m http.server
```

GitHub Pages / herhangi bir statik host üzerinde doğrudan çalışır.

## Lisans

MIT

