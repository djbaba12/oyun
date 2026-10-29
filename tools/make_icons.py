"""Üretim varlıkları: ikonlar, sosyal önizleme, demo ekran görüntüsü."""
import os, math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

BASE = r"C:\Users\djdjd\OneDrive\Belgeler\deepseek-harness\default-workspace\pro2"
ASSETS = os.path.join(BASE, "assets")
os.makedirs(ASSETS, exist_ok=True)

BG_TOP = (124, 92, 255)
BG_BOT = (34, 211, 238)
FONT_BOLD = r"C:\Windows\Fonts\segoeuib.ttf"
FONT_REG = r"C:\Windows\Fonts\segoeui.ttf"
FONT_EMOJI = r"C:\Windows\Fonts\seguiemj.ttf"


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def gradient(size):
    img = Image.new("RGB", (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        d.line([(0, y), (size, y)], fill=lerp(BG_TOP, BG_BOT, y / max(size - 1, 1)))
    return img


def rounded_mask(size, radius, scale=4):
    mask = Image.new("L", (size * scale, size * scale), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size * scale - 1, size * scale - 1], radius=radius * scale, fill=255)
    return mask.resize((size, size), Image.LANCZOS)


def draw_glyph(img, size):
    d = ImageDraw.Draw(img)
    s = size
    cx, cy = s / 2, s / 2
    w, h = s * 0.62, s * 0.42
    x0, y0 = cx - w / 2, cy - h / 2
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=s * 0.13, fill=(255, 255, 255, 255))
    ax, ay = cx - s * 0.15, cy
    arm, th = s * 0.085, s * 0.030
    d.rounded_rectangle([ax - arm, ay - th, ax + arm, ay + th], radius=th, fill=BG_TOP + (255,))
    d.rounded_rectangle([ax - th, ay - arm, ax + th, ay + arm], radius=th, fill=BG_TOP + (255,))
    r = s * 0.042
    d.ellipse([cx + s * 0.075 - r, cy - r, cx + s * 0.075 + r, cy + r], fill=BG_BOT + (255,))
    d.ellipse([cx + s * 0.185 - r, cy - s * 0.055 - r, cx + s * 0.185 + r, cy - s * 0.055 + r],
              fill=(244, 114, 182, 255))
    return img


def make_icon(size, radius_ratio=None, glyph_scale=1.0):
    base = gradient(size).convert("RGBA")
    if radius_ratio is not None:
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        out.paste(base, (0, 0), rounded_mask(size, int(size * radius_ratio)))
    else:
        out = base.copy()
    gsize = int(size * glyph_scale)
    g = draw_glyph(Image.new("RGBA", (gsize, gsize), (0, 0, 0, 0)), gsize)
    out.alpha_composite(g, ((size - gsize) // 2, (size - gsize) // 2))
    return out


# ---------------- PWA ikonları ----------------
make_icon(192, 0.22).save(os.path.join(ASSETS, "icon-192.png"))
make_icon(512, 0.22).save(os.path.join(ASSETS, "icon-512.png"))
make_icon(512, None, 0.72).save(os.path.join(ASSETS, "icon-maskable-512.png"))
make_icon(180, None, 0.86).convert("RGB").save(os.path.join(ASSETS, "apple-touch-icon.png"))
make_icon(64, 0.25).save(os.path.join(ASSETS, "favicon.png"))


# ---------------- Sosyal önizleme ----------------
def make_og():
    W, H = 1200, 630
    img = Image.new("RGBA", (W, H), (8, 9, 15, 255))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-300, -400, 800, 500], fill=(124, 92, 255, 115))
    gd.ellipse([600, -350, 1500, 450], fill=(34, 211, 238, 85))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(140)))

    img.alpha_composite(make_icon(210, 0.22), (84, 92))

    d = ImageDraw.Draw(img)
    # emoji ızgarası
    try:
        ef = font(FONT_EMOJI, 62)
        for i, e in enumerate(["🐍", "🧱", "💣", "🎯", "🏀", "🌀", "🃏", "🔢", "⭕", "🎈", "🚀", "🧩"]):
            d.text((790 + (i % 4) * 96, 78 + (i // 4) * 96), e, font=ef, embedded_color=True)
    except Exception as ex:
        print("emoji:", ex)

    d.text((90, 348), "Oyun Durağı Pro", font=font(FONT_BOLD, 76), fill=(238, 241, 250))
    d.text((94, 446), "40+ oyun · İnternet gerekmez · Mobil uyumlu",
           font=font(FONT_REG, 30), fill=(167, 174, 201))

    # rozet (metne göre boyutlandırılmış)
    bx, by, bh = 94, 512, 62
    label = "Ücretsiz · Reklamsız"
    bf = font(FONT_BOLD, 26)
    tw = d.textlength(label, font=bf)
    d.rounded_rectangle([bx, by, bx + tw + 60, by + bh], radius=bh // 2,
                        fill=(124, 92, 255, 55), outline=(124, 92, 255, 190), width=2)
    d.text((bx + 30, by + 16), label, font=bf, fill=(196, 181, 253))

    img.convert("RGB").save(os.path.join(ASSETS, "og-image.png"), optimize=True)
    img.convert("RGB").save(os.path.join(ASSETS, "og-image.jpg"), quality=90, optimize=True)


make_og()


# ---------------- Demo ekranı (gerçek arayüz önizlemesi) ----------------
def make_demo():
    W, H = 1200, 750
    img = Image.new("RGBA", (W, H), (8, 9, 15, 255))
    gd = ImageDraw.Draw(img)
    for y in range(H):
        gd.line([(0, y), (W, y)], fill=lerp((24, 20, 49), (8, 9, 15), y / H))

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    g2 = ImageDraw.Draw(glow)
    g2.ellipse([-200, -420, 700, 300], fill=(124, 92, 255, 90))
    g2.ellipse([700, -380, 1500, 220], fill=(34, 211, 238, 70))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(120)))

    d = ImageDraw.Draw(img)
    fb = font(FONT_BOLD, 22)
    fs = font(FONT_REG, 15)
    ft = font(FONT_BOLD, 28)

    # üst bar
    d.rounded_rectangle([40, 30, W - 40, 96], radius=18, fill=(17, 20, 32))
    d.rounded_rectangle([58, 46, 92, 80], radius=11, fill=(124, 92, 255))
    d.text((104, 54), "Oyun Durağı", font=fb, fill=(238, 241, 250))
    d.text((104 + d.textlength("Oyun Durağı", font=fb) + 6, 54), "Pro", font=fb, fill=(34, 211, 238))
    for i, (label, active) in enumerate([("Tümü", 1), ("Arcade", 0), ("Zeka", 0), ("Klasik", 0), ("Yeni", 0)]):
        x = 420 + i * 104
        if active:
            d.rounded_rectangle([x, 50, x + 86, 82], radius=16, fill=(124, 92, 255))
        else:
            d.rounded_rectangle([x, 50, x + 86, 82], radius=16, outline=(42, 48, 80), fill=(23, 27, 43))
        d.text((x + 20, 58), label, font=fs, fill=(255, 255, 255) if active else (167, 174, 201))

    # hero
    d.text((44, 124), "İyi günler", font=ft, fill=(238, 241, 250))
    d.text((44 + d.textlength("İyi günler ", font=ft), 124), "Ne oynayalım?", font=ft, fill=(34, 211, 238))
    d.text((44, 166), "40+ oyun, tek dokunuş. Rekorların cihazında saklanır.", font=fs, fill=(167, 174, 201))

    cards = [
        ("🐍", "Yılan", "1.240"), ("🧱", "Tetris", "8.900"), ("💣", "Mayın", "34s"),
        ("🎯", "Hedef Vur", "6.310"), ("🏀", "Basket", "22"), ("🌀", "Labirent", "12"),
        ("🃏", "Hafıza", "14"), ("🔢", "2048", "16.384"), ("⭕", "XOX", "18"),
        ("🎈", "Balon", "4.870"), ("🚀", "Yıldız", "2.640"), ("🧩", "Bloklar", "9.120"),
    ]
    cw, ch, gap = 250, 128, 22
    for i, (emoji, title, rec) in enumerate(cards):
        col, row = i % 4, i // 4
        x = 44 + col * (cw + gap)
        y = 208 + row * (ch + gap)
        d.rounded_rectangle([x, y, x + cw, y + ch], radius=20, fill=(27, 31, 51), outline=(42, 48, 80))
        d.rounded_rectangle([x + 18, y + 16, x + 18 + 46, y + 62], radius=14, fill=(35, 40, 66))
        try:
            d.text((x + 26, y + 20), emoji, font=font(FONT_EMOJI, 30), embedded_color=True)
        except Exception:
            pass
        d.text((x + 18, y + 72), title, font=fb, fill=(255, 255, 255))
        d.text((x + 18, y + 100), "Rekor " + rec, font=fs, fill=(109, 117, 148))

    # alt sekme çubuğu
    d.rounded_rectangle([40, H - 92, W - 40, H - 26], radius=20, fill=(11, 13, 22), outline=(42, 48, 80))
    for i, label in enumerate(["Ana Sayfa", "Arcade", "Zeka", "Klasik", "Rekorlar"]):
        x = 84 + i * ((W - 168) / 5)
        col = (34, 211, 238) if i == 0 else (109, 117, 148)
        d.text((x + 34, H - 68), label, font=fs, fill=col)

    img.convert("RGB").save(os.path.join(ASSETS, "demo-preview.png"), optimize=True)


make_demo()

print("Üretildi:")
for f in sorted(os.listdir(ASSETS)):
    p = os.path.join(ASSETS, f)
    print(f"  {f:28s} {os.path.getsize(p)//1024} KB")
