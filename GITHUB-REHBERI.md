# 🐙 GitHub'a Yayınlama Rehberi

Bu klasör zaten bir **git deposu** olarak hazırlanmış durumda.
Yapman gereken tek şey: kendi GitHub hesabına göndermek.

> ⚠️ **Neden push'u ben yapamıyorum?**
> GitHub'a yazmak için **senin hesabın** gerekir (giriş veya erişim anahtarı).
> Bu bilgiler sende kalmalı — bu yüzden son adımı sen yapıyorsun.
> Aşağıdaki adımlar 3 dakikada biter.

---

## ✅ Yöntem 1: GitHub Desktop (en kolay, komut yok)

1. **GitHub Desktop** indir: https://desktop.github.com
2. GitHub hesabınla giriş yap
3. Menü: **File → Add local repository**
4. Bu klasörü seç: `OyunDurağı Pro`
5. Sağ üstte **Publish repository** → isim: `oyun-duragi`
   - ✅ "Keep this code private" işaretini **kaldır** (Pages için gerekli)
6. **Publish repository**'ye bas

Sonra Pages'i aç:
7. GitHub'da depona gir → **Settings → Pages**
8. **Source: GitHub Actions** seç

Site 1-2 dakika içinde hazır:
```
https://KULLANICIADI.github.io/oyun-duragi/
```

---

## ✅ Yöntem 2: Komut satırı

### 1. GitHub'da boş depo aç
https://github.com/new
- Repository name: `oyun-duragi`
- **Public** seç
- README/`.gitignore` ekleme (zaten var)
- **Create repository**

### 2. Bu klasörde terminal aç

Windows'ta klasörde `Shift + Sağ tık` → **"Terminalde aç"** veya **"PowerShell penceresi burada"**

### 3. Gönder

```bash
git remote add origin https://github.com/KULLANICIADI/oyun-duragi.git
git branch -M main
git push -u origin main
```

Git kullanıcı adı + **Personal Access Token** ister:
- https://github.com/settings/tokens → **Generate new token (classic)**
- Scope: ✅ **repo**
- Token'ı şifre olarak yapıştır (şifre değil!)

### 4. Pages'i aç
GitHub → depo → **Settings → Pages → Source: GitHub Actions**

`.github/workflows/pages.yml` dosyası otomatik yayınlar.
**Actions** sekmesinden ilerlemeyi izleyebilirsin.

---

## 🌐 Adresini özelleştir

Site adresi: `https://KULLANICIADI.github.io/oyun-duragi/`

Gerçek adresini `index.html` içine yaz (sosyal önizleme için):

```html
<link rel="canonical" href="https://KULLANICIADI.github.io/oyun-duragi/">
<meta property="og:url" content="https://KULLANICIADI.github.io/oyun-duragi/">
<meta property="og:image" content="https://KULLANICIADI.github.io/oyun-duragi/assets/og-image.png">
<meta name="twitter:image" content="https://KULLANICIADI.github.io/oyun-duragi/assets/og-image.png">
```

Ayrıca `robots.txt` ve `sitemap.xml` içindeki `https://oyun-duragi.netlify.app` adreslerini
kendi adresinle değiştir.

---

## 🔁 Güncelleme yayınlama

```bash
git add .
git commit -m "Yeni oyun eklendi"
git push
```

GitHub Actions otomatik olarak yeniden yayınlar (yaklaşık 1 dk).

> JS/CSS değiştirdiysen `sw.js` içindeki `VERSION` değerini artır ki kullanıcılar yeni sürümü alsın:
> ```js
> const VERSION = "v4.0.1";
> ```

---

## 🗂️ Depoda neler var?

```
.gitignore               node_modules, .DS_Store vs. hariç
.github/workflows/pages.yml   otomatik yayın
README.md                proje tanıtımı
GITHUB-REHBERI.md        bu dosya
index.html + css/ + js/ + assets/   site
```

`tools/` klasörü ve test dosyaları depoya girmez.

---

## ❓ Sorun giderme

| Sorun | Çözüm |
|---|---|
| `remote: Permission denied` | Token'ında `repo` scope'u var mı? GitHub giriş bilgilerini Windows Kimlik Yöneticisi'nden sil |
| Pages boş görünüyor | Settings → Pages → Source'un **GitHub Actions** olduğundan emin ol |
| Site 404 veriyor | Actions sekmesinde workflow başarılı mı? Birkaç dakika bekle |
| Stil bozuk | Dosyalar `css/` klasöründe mi? Depoda klasör yapısı korunmalı |
| PWA kurulmuyor | HTTPS gerekli — `github.io` HTTPS sağlar ✓ |

---

Yayınladıktan sonra adresi bana söyle, `index.html` içindeki adres satırlarını
senin domainine göre güncelleyip yeni zip hazırlayayım. 🎉
