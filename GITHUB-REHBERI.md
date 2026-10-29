# 🐙 GitHub'a Yayınlama — TEK TIK

> **Depo:** https://github.com/djbaba12/oyun (public, boş)
> **Yayın adresi:** https://djbaba12.github.io/oyun/
>
> 40 dosya hazır, 4 commit atıldı, uzak depo ayarlı. Sadece göndermek kaldı.

---

## 🔐 ÖNCE: Token'ı iptal et!

Bir GitHub token'ı paylaştıysan **hemen sil**:
👉 https://github.com/settings/tokens → ilgili token → **Delete**

Token senin hesabına yazma yetkisi verir. Kimseye (bana bile) verme.
**Yeni token alacaksın** — aşağıdaki adımda.

---

## ⚡ 2 adımda yayın

### Adım 1 — Token al (30 saniye)

1. https://github.com/settings/tokens
2. **Generate new token (classic)**
3. Note: `oyun-push` · Expiration: `30 days`
4. **Scope:** sadece ✅ **`repo`**
5. **Generate token** → çıkan `ghp_...` kodunu kopyala

### Adım 2 — Betiği çalıştır

Bu klasörde **`GITHUB-A-GONDER.bat`** dosyasına **çift tıkla**.

- Kullanıcı adı: otomatik `djbaba12`
- Token sorulduğunda yapıştır (ekranda görünmez)

Betik şunları yapar:
1. Token'ı uzak depoya geçici olarak ekler
2. Dosyaları gönderir (`push --force`)
3. **Token'ı temizler** (diske yazılmaz)
4. Pages ayar sayfasını açar

### Adım 3 — Pages'i aç

Açılan sayfada: **Source → GitHub Actions → Save**

⏱️ 1-2 dakika sonra: **https://djbaba12.github.io/oyun/**

---

## 🖱️ Betik çalışmazsa: GitHub Desktop

1. https://desktop.github.com → kur → giriş yap
2. **File → Add local repository** → bu klasörü seç
3. **Repository → Push** (uzak depo zaten `origin` olarak ayarlı)
4. **Settings → Pages → GitHub Actions**

---

## 🆘 Hata tablosu

| Mesaj | Sebep | Çözüm |
|---|---|---|
| `Authentication failed` | Token yanlış / süresi geçmiş | Yeni token |
| `Permission denied (403)` | `repo` izni yok | Token'a `repo` ekle |
| `could not resolve host` | İnternet yok | Bağlantıyı kontrol et |
| `remote origin already exists` | Sorun değil | Betik otomatik düzeltiyor |
| Betik açılmıyor | — | Sağ tık → **Yönetici olarak çalıştır** |
| `Detected dubious ownership` | Windows OneDrive | `git config --global --add safe.directory "%CD%"` |

---

## 🔁 Güncelleme

Siteyi değiştirdikten sonra **betiği tekrar çalıştır** — otomatik commit + push eder.

`js/` veya `css/` değiştiyse `sw.js` içinde sürümü artır:
```js
const VERSION = "v4.0.1";
```

---

## ✅ Yayın kontrol listesi

- [ ] Token iptal edildi / yenilendi
- [ ] Betik çalıştı → "BAŞARILI" yazdı
- [ ] GitHub'da dosyalar görünüyor (40 dosya)
- [ ] Settings → Pages → GitHub Actions seçildi
- [ ] Actions sekmesinde yeşil tik
- [ ] https://djbaba12.github.io/oyun/ açılıyor
- [ ] Telefonda açıp ana ekrana ekledim

---

## 🎯 Yayınladıktan sonra

- Telefonda aç → üstteki ⬇ → **"Ana ekrana ekle"** (uygulama gibi, internetsiz çalışır)
- Oyun paylaş: `https://djbaba12.github.io/oyun/#tetris`
- WhatsApp'ta önizleme kartı otomatik gelir

İyi eğlenceler! 🎮
