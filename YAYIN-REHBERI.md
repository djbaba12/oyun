# 🎮 Oyun Durağı Pro — Yayın Rehberi (v2)

**40 oyun · Ücretsiz · İnternetsiz · Reklamsız · Mobil uyumlu**

> ⚠️ **Neden ilk denemede hata verdi?**
> İlk zip'i Windows'un kendi aracı üretmişti ve içindeki dosya yolları
> `js\app.js` gibi **ters eğik çizgi** ile yazılmıştı. Sunucular `js/app.js`
> (eğik çizgi) bekler. Ayrıca Türkçe karakterli dosya adı vardı.
> Yeni zip düzeltildi: doğru yollar, Türkçe karakter yok, `index.html` en dışta.
> ✅ Yeni zip test edildi: temiz klasöre açıldı ve tarayıcıda sorunsuz çalıştı.

---

## ✅ En güvenilir yol: zip'i sürükle (önerilen)

1. Aç: **https://app.netlify.com/drop**
2. Masaüstündeki **`oyun-duragi-pro.zip`** dosyasını sayfaya sürükle
   - Telefonda: **"browse to upload"** → zip dosyasını seç
   - **Zip'i açma, olduğu gibi yükle** — Netlify kendisi açar
3. Ücretsiz hesap aç (Google / GitHub / e-posta)

Sonuç adresi: `https://rastgele-isim.netlify.app`

> Eğer hâlâ hata verirse: sayfayı yenile (Ctrl+Shift+R), farklı tarayıcı dene
> (Chrome veya Edge), ya da aşağıdaki klasör yöntemini kullan.

---

## 🔁 Alternatif: klasörü sürükle (zip kullanmadan)

Bu yol zip sorunlarını tamamen atlar.

1. Aç: **https://app.netlify.com/drop**
2. Masaüstündeki **`OyunDurağı Pro`** klasörünü olduğu gibi sayfaya sürükle
   - İçinde `index.html` en dışta olmalı — öyle ✓
3. Hesap aç → bitti

---

## 🌐 Adresi güzelleştir

**Site configuration → Change site name** → `oyun-duragi`
Adresin: `https://djbaba12.github.io/oyun`

## 📱 Telefona uygulama olarak kur

Siteye gir → üst bardaki **⬇** simgesi → "Ana ekrana ekle".
Uygulama gibi açılır, **internet olmadan** çalışır.

---

## 🗂️ Yayın paketinin içeriği (28 dosya)

```
oyun-duragi-pro.zip
├── index.html              ← en dışta olmalı (öyle)
├── 404.html
├── manifest.webmanifest
├── sw.js                   çevrimdışı önbellek
├── netlify.toml            güvenlik başlıkları + yönlendirme
├── robots.txt
├── sitemap.xml
├── css/  (4 dosya)
├── js/   (9 dosya)
└── assets/ (8 dosya: ikonlar + önizleme)
```

`tools/` klasörü ve rehber dosyaları bilerek dahil edilmedi — sahada gereksiz.

---

## 🛠️ Sorun giderme

| Hata | Sebep | Çözüm |
|---|---|---|
| "We couldn't deploy the files you dropped" | Bozuk/yanlış zip | Yeni zip'i kullan, ya da klasör yöntemine geç |
| "unknown error" | Aynı sayfada çok deneme / oturum | Sayfayı yenile, gizli sekmede dene |
| Site açılıyor ama boş | `index.html` bir klasörün içinde | Bu rehberdeki yeni zip'i yükle |
| Oyunlar açılmıyor | JS dosyaları eksik | Zip'i yeniden oluştur |

---

## 🔒 Gizlilik

Sunucu yok, çerez yok, reklam yok, takip yok.
Rekorlar ve başarımlar yalnızca senin tarayıcında (`localStorage`) tutulur.

## 💡 İpuçları

- Belirli oyunu paylaş: `https://adresin.netlify.app/#tetris`
- 19 başarımı açmayı dene, 🔥 gün serisi tut
- Siteyi güncelledikten sonra `sw.js` içindeki `VERSION` değerini artır
