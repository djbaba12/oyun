# 🎮 Oyun Durağı Pro

**40+ oyun · Sohbet & sesli mesaj · Sesli asistan · Süper Lig takibi**

Kurulum yok, sunucu yok, reklam yok. Tarayıcıda çalışır, **internet olmadan da oynanır**.

![Oyun](https://img.shields.io/badge/oyun-40%2B-purple)
![PWA](https://img.shields.io/badge/PWA-hazır-blue)
![Lisans](https://img.shields.io/badge/lisans-MIT-green)

---

## ✨ Özellikler

### 🕹️ 40+ oyun / 3 kategori

| Kategori | Oyunlar |
|---|---|
| **Arcade (15)** | Yılan, Flappy Kuş, Kırıcı, Yıldız Savunması, Asteroit, Tırmanıcı, Hedef Vur, Basket, Balon Patlat, Balıkçı, Kule İnşa, Refleks Testi, Ateş & Buz, Piyano, Hız Eşleştirme |
| **Zeka (18)** | Hafıza Kartları, 2048, Mayın Tarlası, Blok Bulmaca, Sudoku, Sayı Ezberi, Kayan Bulmaca, Renk Sırala, Renk Ustası, Işıkları Kapat, Labirent, Piksel Boyama, Sayı Tahmin, Hafıza Ekranı, Emoji Ezberi, Hankey Kulesi, Sıra Takip, Melodi Ezberi |
| **Klasik (9)** | Tetris, Pong, XOX (yenilmez AI), Nim, Kelime Ustası (Wordle), Deniz Savaşı, Solitaire, Sohbet Odası, Süper Lig |

### 🎙️ Sesli Asistan
Mikrofona basıp **konuşarak** siteyi kontrol et:

- *"Tetris aç"* → oyunu açar ve anons eder
- *"Sohbet"*, *"Süper Lig"*, *"Rekorlar"*, *"Başarımlar"*, *"Ana sayfa"*
- *"Sesi kapat"*, *"Kaç oyun var?"*, *"Yardım"*

Cevabı Türkçe **sesli** olarak verir (Web Speech API).
> Ses tanıma Chrome / Edge'de çalışır; desteklenmeyen tarayıcıda hızlı komut butonları kullanılır.

### 💬 Sohbet + Sesli Mesaj
- Kanallar: `#genel`, `#arkadaslar`, `#turnuva` + kendi kanalını aç
- Baloncuk tasarımı, tarih ayırıcı, zaman damgası
- **Sesli mesaj:** 🎤 bas → konuş → tekrar bas → kayıt gönderilir / oynatılır
- **Aynı ağda cihaz bağlama (WebRTC):** sunucu olmadan iki cihaz arasında gerçek mesaj trafiği
  *Cihaz 1 → "Davet Oluştur" → kod paylaş → Cihaz 2 "Daveti Kabul Et" → yanıt kodunu geri gönder → Bağlan*

### ⚽ Süper Lig Merkezi
- **Puan durumu:** 18 takım, O/G/B/M/AV/P; Şampiyonlar Ligi / Avrupa Ligi / düşme hattı renkleri
- **Fikstür:** tarihe göre gruplu, yaklaşan maçlar ve geri sayım
- **Sonuç girişi:** skorları elle gir → tablo otomatik hesaplanır (cihazda saklanır)
- **Maç ekleme:** takım, tarih, saat, hafta seçerek fikstüre maç ekle

### 🏆 İlerleme
- Her oyunda rekor (en yüksek skor / en az hamle / en iyi süre)
- **19 başarım**, profil kartı, 🔥 gün serisi, toplam oynama
- Tümü `localStorage`'da — hesap gerekmez

### 📱 PWA & Mobil
- **Ana ekrana ekle** → uygulama gibi açılır
- **Service Worker** ile çevrimdışı çalışır
- Alt gezinme çubuğu, güvenli alan (çentik) desteği, dokunmatik jestler, ekran içi kontrol tuşları
- Yüksek DPI (retina) canvas, haptik titreşim

---

## 🚀 Çalıştırma

En basit yol: `index.html` dosyasını aç.

PWA özellikleri için yerel sunucu öner:

```bash
python -m http.server 8080
# http://localhost:8080
```

### GitHub Pages ile ücretsiz yayın

Adım adım: **[GITHUB-REHBERI.md](GITHUB-REHBERI.md)**

```bash
git init
git add .
git commit -m "Oyun Durağı Pro v4"
git branch -M main
git remote add origin https://github.com/KULLANICI/oyun-duragi.git
git push -u origin main
```

Sonra **Settings → Pages → Source: GitHub Actions** → site yayınlanır:
`https://KULLANICI.github.io/oyun-duragi/`

### Netlify Drop ile

`oyun-duragi-pro.zip` dosyasını https://app.netlify.com/drop adresine sürükle.

---

## 🗂️ Proje yapısı

```
├── index.html                 uygulama iskeleti (SEO + PWA meta)
├── 404.html
├── manifest.webmanifest       PWA tanımı
├── sw.js                      çevrimdışı önbellek (v4.0.0)
├── netlify.toml               güvenlik başlıkları
├── robots.txt / sitemap.xml
├── css/
│   ├── base.css               tema, değişkenler
│   ├── layout.css             kabuk, duyarlı ızgara
│   ├── components.css         kartlar, HUD, başarımlar
│   ├── play.css               oyun bileşenleri
│   └── features.css           Süper Lig + Sohbet + Sesli Asistan   ← v4
├── js/
│   ├── core.js                motor: ses, kayıt, jest, başarımlar
│   ├── arcade-a.js            Yılan, Tetris, Flappy, Kırıcı, Pong
│   ├── arcade-b.js            Yıldız, Asteroit, Tırmanıcı, Hedef, Basket, Balon
│   ├── puzzle-a.js            Hafıza, 2048, Mayın, Blok, Sudoku
│   ├── puzzle-b.js            Sayı Ezberi, Kayar, Renk, Simon, Işık, Labirent, Piksel, Tahmin
│   ├── classic-a.js           XOX, Nim, Kelime, Deniz Savaşı
│   ├── classic-b.js           Solitaire, Kule, Balıkçı, Refleks, Hafıza Ekranı, Ateş&Buz, Piyano
│   ├── extra.js               Hankey, Hız Eşleştirme, Sıra Takip, Melodi
│   ├── football.js            Süper Lig merkezi                        ← v4
│   ├── chat.js                Sohbet + sesli mesaj + WebRTC            ← v4
│   ├── voice.js               Sesli asistan                            ← v4
│   └── app.js                 yönlendirme, arama, rekorlar, başarımlar
├── assets/                    ikonlar + sosyal önizleme görselleri
└── .github/workflows/pages.yml  GitHub Pages otomatik yayın
```

---

## ➕ Yeni oyun ekleme

```js
window.GAMES.push({
  id: "oyunum",
  title: "Oyunum",
  emoji: "🎲",
  cat: "arcade",            // arcade | puzzle | classic
  desc: "Kısa açıklama.",
  hint: "Kontroller",
  mount(host, root) {
    const p = document.createElement("p");
    p.textContent = "Merhaba!";
    root.appendChild(p);
    return { stop() {} };   // oyundan çıkarken temizlik
  }
});
```

Kart galerisi, arama, başarımlar ve rekor sistemi otomatik çalışır.

---

## 🔒 Gizlilik

- **Sunucu yok.** Rekorlar, mesajlar, fikstür — hepsi yalnızca senin tarayıcında (`localStorage`).
- Çerez yok, reklam yok, takip yok, üçüncü parti istek yok.
- Content-Security-Policy ve güvenlik başlıkları açık.

## 📄 Lisans

MIT — özgürce kullan, değiştir, paylaş.

---

İyi eğlenceler! 🎉
