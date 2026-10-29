# 🐙 GitHub'a Yayınlama Rehberi

> ## 🎯 Senin depona hazır!
> **Depo:** https://github.com/djbaba12/oyun — public ve şu an boş ✓
> **Yayın adresi olacak:** https://djbaba12.github.io/oyun/
>
> Site dosyaları ve git deposu bu klasörde **hazır**. Aşağıdaki 2 adımı yapman yeterli.

---

## ⚡ En hızlı yol (2 komut)

Bu klasörde terminal aç (`Shift + Sağ tık` → **"Terminalde aç"**) ve sırayla çalıştır:

```bash
git remote add origin https://github.com/djbaba12/oyun.git
git push -u origin main
```

İlk seferde GitHub **kullanıcı adı + Personal Access Token** ister:

1. https://github.com/settings/tokens → **Generate new token (classic)**
2. Scope: ✅ **repo**
3. Oluşan token'ı **şifre olarak** yapıştır (GitHub şifresi çalışmaz)

Sonra GitHub'da: depo → **Settings** → **Pages** → **Source: GitHub Actions**

✅ 1–2 dakika içinde siten yayında: **https://djbaba12.github.io/oyun/**

---

## ✅ Alternatif: GitHub Desktop (komut yok)

1. https://desktop.github.com indir, GitHub hesabınla giriş yap
2. **File → Add local repository** → bu klasörü seç
3. **Repository → Repository settings → Remote** alanına `djbaba12/oyun` yaz
   (veya **Publish repository** → isim `oyun`, "private" işaretini kaldır)
4. **Push origin** → **Settings → Pages → Source: GitHub Actions**

---

## 🌐 Adresini doğrula

`index.html` içindeki adresler **zaten senin adresine ayarlandı**:

```html
<link rel="canonical" href="https://djbaba12.github.io/oyun/">
<meta property="og:url" content="https://djbaba12.github.io/oyun/">
<meta property="og:image" content="https://djbaba12.github.io/oyun/assets/og-image.png">
```

`robots.txt` ve `sitemap.xml` da güncel. Başka bir şey değiştirmen gerekmiyor.

---

## 🔁 Güncelleme yayınlama

```bash
git add .
git commit -m "Yeni oyun eklendi"
git push
```

GitHub Actions otomatik yeniden yayınlar (~1 dk).

> JS/CSS değiştirdiysen `sw.js` içindeki sürümü artır:
> ```js
> const VERSION = "v4.0.1";
> ```
> Böylece tarayıcılar yeni sürümü alır.

---

## 🗂️ Depoda neler var?

```
.gitattributes              satır sonu normalizasyonu
.gitignore                  node_modules, .DS_Store vs. hariç
.github/workflows/pages.yml otomatik yayın (GitHub Actions)
README.md                   proje tanıtımı
GITHUB-REHBERI.md           bu dosya
YAYIN-REHBERI.md            Netlify alternatifi
index.html
css/  js/  assets/          site
tools/                      ikon üreticisi (siteye dahil değil)
```

---

## 🧪 Yayın öncesi son kontrol

Bu klasördeki site yerelde çalışıyor mu? `index.html`'e çift tıkla.
Animasyonlar, ses, PWA hepsi `file://` altında da test edildi.

---

## ❓ Sorun giderme

| Sorun | Çözüm |
|---|---|
| `remote: Permission denied` | Token'ında `repo` scope var mı? Windows Kimlik Yöneticisi'nden eski GitHub bilgisini sil |
| `error: remote origin already exists` | `git remote set-url origin https://github.com/djbaba12/oyun.git` |
| Pages boş görünüyor | Settings → Pages → Source **GitHub Actions** mı? |
| Site 404 veriyor | Actions sekmesinde workflow yeşil mi? 1-2 dk bekle, sonra `Ctrl+Shift+R` |
| Stil bozuk / oyun yok | Klasör yapısı (`css/`, `js/`) korunmalı — tek tek dosya yükleme |
| PWA kurulmuyor | HTTPS gerekli — `github.io` bunu sağlar ✓ |
| Eski sürüm görünüyor | `sw.js` içindeki `VERSION` değerini artırıp tekrar push et |

---

## 🎉 Yayınladıktan sonra

Adresin: **https://djbaba12.github.io/oyun/**

- Telefonda aç → üstteki ⬇ ile **ana ekrana ekle**
- WhatsApp'ta paylaş → önizleme kartı otomatik gelecek
- Belirli oyunu paylaş: `https://djbaba12.github.io/oyun/#tetris`

İyi eğlenceler! 🎮
