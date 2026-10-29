/* ==========================================================================
   OYUN DURAĞI PRO — Service Worker
   • Kurulumda tüm oyun dosyalarını önbelleğe alır → internet olmadan çalışır
   • HTML için "network-first" (yeni sürüm hemen gelir), varlıklar için cache-first
   • Sürüm numarası değişince eski önbellek temizlenir
   ========================================================================== */
const VERSION = "v4.0.0";
const CACHE = "oyundurak-" + VERSION;

const PRECACHE = [
  "./",
  "./index.html",
  "./css/base.css",
  "./css/layout.css",
  "./css/components.css",
  "./css/play.css",
  "./css/features.css",
  "./js/core.js",
  "./js/arcade-a.js",
  "./js/arcade-b.js",
  "./js/puzzle-a.js",
  "./js/puzzle-b.js",
  "./js/classic-a.js",
  "./js/classic-b.js",
  "./js/extra.js",
  "./js/voice.js",
  "./js/chat.js",
  "./js/football.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable-512.png",
  "./assets/og-image.png",
  "./assets/demo-preview.png"
];

/* ---------- Kurulum: kritik dosyaları önbelleğe al ---------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Tek tek ekle: biri hata verirse kurulumu bozmasın
      Promise.all(PRECACHE.map((url) =>
        cache.add(new Request(url, { cache: "reload" })).catch(() => null)
      ))
    ).then(() => self.skipWaiting())
  );
});

/* ---------- Aktivasyon: eski sürümleri temizle ---------- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* ---------- İstekleri karşıla ---------- */
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Sadece GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Farklı origin (ör. dış bağlantı) → dokunma
  if (url.origin !== self.location.origin) return;

  // Gezinme istekleri: network-first, çevrimdışıysa önbellekten
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Diğer kaynaklar: cache-first, arkada güncelle
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

/* ---------- Sayfadan gelen "atla" mesajı ---------- */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
