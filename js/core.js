/* ==========================================================================
   CORE — Oyun Durağı Pro ortak motoru
   • DOM yardımcıları, ses, kayıt, jestler, canvas
   • PRO: istatistik, başarımlar, oyun geçmişi, tema, haptik
   ========================================================================== */
(function () {
  "use strict";

  /* --------------------------- Matematik --------------------------- */
  const rnd = (n) => Math.floor(Math.random() * n);
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const pick = (arr) => arr[rnd(arr.length)];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = rnd(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ------------------------------ DOM ------------------------------ */
  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      for (const k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
        const v = props[k];
        if (v == null) continue;
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k === "html") node.innerHTML = v;
        else if (k === "on") for (const ev in v) node.addEventListener(ev, v[ev]);
        else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
        else if (k === "dataset") Object.assign(node.dataset, v);
        else if (k in node) node[k] = v;
        else node.setAttribute(k, v);
      }
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach((c) => {
        if (c == null || c === false) return;
        node.appendChild(typeof c === "string" || typeof c === "number"
          ? document.createTextNode(String(c)) : c);
      });
    }
    return node;
  }

  const txt = (s) => document.createTextNode(String(s));

  function hud(items) {
    const root = el("div", { class: "hud" });
    const values = [];
    items.forEach((it) => {
      const b = el("b", { text: it.value == null ? "0" : String(it.value) });
      root.appendChild(el("span", { class: "hud-item " + (it.tone || "") }, [txt(it.label), b]));
      values.push(b);
    });
    return {
      root,
      set(i, v) { if (values[i]) values[i].textContent = String(v); },
      get(i) { return values[i] ? values[i].textContent : ""; }
    };
  }

  function overlay(opts) {
    const ov = el("div", { class: "overlay" });
    if (opts.title) ov.appendChild(el("h3", { text: opts.title }));
    if (opts.big != null) ov.appendChild(el("div", { class: "big", text: String(opts.big) }));
    if (opts.msg) ov.appendChild(el("p", { text: opts.msg }));
    const row = el("div", { class: "row" });
    const btns = opts.buttons || (opts.button ? [{ label: opts.button, onClick: opts.onButton }] : []);
    btns.forEach((b, i) => {
      row.appendChild(el("button", {
        class: "btn " + (b.secondary || i > 0 ? "sec" : "") + (b.small ? " sm" : ""),
        text: b.label,
        on: { click: b.onClick }
      }));
    });
    if (btns.length) ov.appendChild(row);
    return ov;
  }

  function removeOverlay(wrap) {
    wrap.querySelectorAll(":scope > .overlay").forEach((o) => o.remove());
  }

  /* ------------------------------ Ses ------------------------------ */
  const Sound = {
    enabled: true,
    volume: 0.7,
    _ctx: null,
    ensure() {
      if (!this._ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { this._ctx = new AC(); } catch (e) { return null; }
      }
      if (this._ctx.state === "suspended") this._ctx.resume().catch(() => {});
      return this._ctx;
    },
    tone(freq, dur, type, vol) {
      if (!this.enabled) return;
      const ctx = this.ensure();
      if (!ctx) return;
      try {
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type || "sine";
        o.frequency.setValueAtTime(freq, t);
        const v = (vol || 0.07) * this.volume;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(v, 0.0002), t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + dur + 0.03);
      } catch (e) { /* yut */ }
    },
    play(name) {
      if (!this.enabled) return;
      const S = SOUNDS[name];
      if (!S) { this.tone(440, 0.06, "sine", 0.05); return; }
      const timers = [];
      S.forEach((s) => {
        const delay = (s[3] || 0);
        if (delay) timers.push(setTimeout(() => this.tone(s[0], s[1], s[2], s[4] || 0.06), delay));
        else this.tone(s[0], s[1], s[2], s[4] || 0.06);
      });
      SOUND_TIMERS.push(...timers);
      if (SOUND_TIMERS.length > 200) SOUND_TIMERS.splice(0, 100);
    },
    note(i, dur, base) {
      const scale = [0, 2, 4, 7, 9, 12, 14, 16];
      const f = (base || 440) * Math.pow(2, scale[i % scale.length] / 12);
      this.tone(f, (dur || 160) / 1000, "sine", 0.09);
    }
  };
  const SOUND_TIMERS = [];

  const SOUNDS = {
    click: [[520, .04, "triangle", 0, .04]],
    tap:   [[700, .03, "sine", 0, .03]],
    move:  [[300, .03, "square", 0, .02]],
    pop:   [[680, .07, "sine", 0, .07]],
    eat:   [[780, .05, "sine", 0, .07], [1040, .07, "sine", 60, .06]],
    point: [[880, .09, "triangle", 0, .07]],
    hit:   [[400, .05, "square", 0, .05]],
    paddle:[[260, .05, "square", 0, .04]],
    jump:  [[600, .07, "sine", 0, .06]],
    shoot: [[900, .035, "sawtooth", 0, .02]],
    brick: [[640, .05, "square", 0, .05]],
    line:  [[700, .1, "triangle", 0, .07], [940, .12, "triangle", 90, .07]],
    level: [[780, .1, "triangle", 0, .08], [1040, .14, "triangle", 100, .08]],
    win:   [[660, .1, "triangle", 0, .08], [880, .1, "triangle", 110, .08], [1320, .2, "triangle", 220, .08]],
    miss:  [[170, .13, "sawtooth", 0, .06]],
    die:   [[300, .22, "sawtooth", 0, .07], [190, .3, "sawtooth", 150, .07]],
    bad:   [[200, .16, "square", 0, .06]],
    flag:  [[900, .04, "square", 0, .04]],
    coin:  [[1000, .05, "square", 0, .05], [1300, .08, "square", 50, .05]],
    splash:[[420, .08, "sine", 0, .05]],
    tick:  [[1200, .02, "square", 0, .02]],
    // PRO: özel sesler
    achieve: [[660, .09, "triangle", 0, .07], [880, .09, "triangle", 70, .07], [1100, .09, "triangle", 140, .07], [1320, .22, "triangle", 210, .08]],
    combo: [[900, .05, "square", 0, .05], [1200, .05, "square", 60, .05], [1500, .07, "square", 120, .05]]
  };

  /* ---------------------------- Depolama ---------------------------- */
  const PREFIX = "oydpro:";
  const store = {
    get(key, def) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw == null ? def : JSON.parse(raw);
      } catch (e) { return def; }
    },
    set(key, val) {
      try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); return true; }
      catch (e) { return false; }
    },
    del(key) { try { localStorage.removeItem(PREFIX + key); } catch (e) {} }
  };

  /* --------------------- İlerleme / istatistik --------------------- */
  const Profile = {
    _dirty: false,
    data() {
      let p = store.get("profile", null);
      if (!p || typeof p !== "object") {
        p = { games: 0, bests: 0, plays: {}, firstPlay: Date.now(), streak: 0, lastDay: "", achievements: {} };
      }
      if (!p.plays) p.plays = {};
      if (!p.achievements) p.achievements = {};
      return p;
    },
    save(p) { store.set("profile", p); },

    /** Oyun açıldığında çağrılır */
    startGame(id) {
      const p = this.data();
      p.plays[id] = (p.plays[id] || 0) + 1;
      p.games = Object.keys(p.plays).length;
      // günlük seri
      const today = new Date().toISOString().slice(0, 10);
      if (p.lastDay !== today) {
        const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        p.streak = p.lastDay === yesterday ? (p.streak || 0) + 1 : 1;
        p.lastDay = today;
      }
      this.save(p);
      this.checkAchievements({ type: "play", id });
      return p;
    },

    /** Skor kaydedildiğinde çağrılır */
    onBest(id, value, meta) {
      const p = this.data();
      this.save(p);
      this.checkAchievements({ type: "best", id, value, meta });
    },

    played(id) { return (this.data().plays[id] || 0) > 0; },
    playCount(id) { return this.data().plays[id] || 0; },
    totalPlays() {
      const p = this.data();
      return Object.keys(p.plays).reduce((a, k) => a + p.plays[k], 0);
    },

    checkAchievements(evt) {
      const unlocked = [];
      ACHIEVEMENTS.forEach((a) => {
        const p = this.data();
        if (p.achievements[a.id]) return;
        let ok = false;
        try { ok = a.test(evt, p, store, window.GAMES || []); } catch (e) { ok = false; }
        if (ok) {
          const q = this.data();
          q.achievements[a.id] = Date.now();
          this.save(q);
          unlocked.push(a);
        }
      });
      if (unlocked.length) {
        unlocked.forEach((a) => {
          if (window.App && window.App.toast) window.App.toast(`${a.icon} Başarım: ${a.title}`, "good");
          Sound.play("achieve");
        });
        if (window.App && window.App.onAchievements) window.App.onAchievements(unlocked);
      }
      return unlocked;
    }
  };

  /* --------------------------- Başarımlar --------------------------- */
  const bestOf = (id) => store.get("best_" + id, 0);
  const playedCount = (p) => Object.keys(p.plays || {}).length;
  const bestCount = () => (window.GAMES || []).filter((g) => bestOf(g.id) > 0).length;

  const ACHIEVEMENTS = [
    { id: "first", icon: "🎉", title: "İlk Adım", desc: "İlk oyununu oyna", test: (e) => e.type === "play" },
    { id: "five", icon: "🧭", title: "Kâşif", desc: "5 farklı oyun oyna", test: (e, p) => playedCount(p) >= 5 },
    { id: "fifteen", icon: "🗺️", title: "Gezgin", desc: "15 farklı oyun oyna", test: (e, p) => playedCount(p) >= 15 },
    { id: "thirty", icon: "👑", title: "Koleksiyoncu", desc: "30 farklı oyun oyna", test: (e, p) => playedCount(p) >= 30 },
    { id: "all", icon: "🏆", title: "Tamamı!", desc: "Tüm oyunları dene", test: (e, p, s, games) => games.length > 0 && playedCount(p) >= games.length },
    { id: "rec1", icon: "⭐", title: "Rekor Kırıcı", desc: "İlk rekorunu kır", test: () => bestCount() >= 1 },
    { id: "rec10", icon: "🌟", title: "On Yıldız", desc: "10 oyunda rekor", test: () => bestCount() >= 10 },
    { id: "rec25", icon: "💫", title: "Yıldız Yağmuru", desc: "25 oyunda rekor", test: () => bestCount() >= 25 },
    { id: "plays25", icon: "🔥", title: "Isınma Turu", desc: "Toplam 25 oyun oyna", test: (e, p) => Profile.totalPlays() >= 25 },
    { id: "plays100", icon: "💥", title: "Bağımlı", desc: "Toplam 100 oyun oyna", test: () => Profile.totalPlays() >= 100 },
    { id: "snake50", icon: "🐍", title: "Yılan Ustası", desc: "Yılan'da 200 puan", test: (e) => e.id === "snake" && e.value >= 200 },
    { id: "tetris20", icon: "🧱", title: "Duvar Ustası", desc: "Tetris'te 20 satır", test: (e) => e.id === "tetris" && e.value >= 2000 },
    { id: "2048win", icon: "🔢", title: "2048!", desc: "2048 karosuna ulaş", test: (e) => e.id === "2048" && e.value >= 20480 },
    { id: "flappy30", icon: "🐤", title: "Kanat Ustası", desc: "Flappy'de 30 boru", test: (e) => e.id === "flappy" && e.value >= 30 },
    { id: "react200", icon: "⚡", title: "Şimşek Refleks", desc: "200 ms altı tepki", test: (e) => e.id === "reaction" && e.value > 0 && e.value < 200 },
    { id: "mineswin", icon: "💣", title: "Mayın Uzmanı", desc: "Mayın tarlasını temizle", test: (e) => e.id === "mines" && e.value > 0 },
    { id: "nimwin", icon: "🪨", title: "Nim Zaferi", desc: "Nim'de AI'yi yen", test: (e, p) => { const s = store.get("nimStats", null); return s && s.w > 0; } },
    { id: "xoxwin", icon: "⭕", title: "XOX Şampiyonu", desc: "XOX'ta 3 kez kazan", test: () => { const s = store.get("xoxStats", null); return s && s.w >= 3; } },
    { id: "streak3", icon: "📅", title: "Sadık Oyuncu", desc: "3 gün üst üste gir", test: (e, p) => (p.streak || 0) >= 3 }
  ];

  /* ------------------------- Tuş dinleyici ------------------------- */
  function onKey(handler, keyup) {
    const ev = keyup ? "keyup" : "keydown";
    const wrapped = (e) => handler(e);
    document.addEventListener(ev, wrapped);
    return () => document.removeEventListener(ev, wrapped);
  }

  /* --------------------------- Jestler --------------------------- */
  function swipe(node, opts) {
    let sx = 0, sy = 0, active = false;
    const TH = opts.threshold || 24;
    const start = (e) => {
      const t = e.touches ? e.touches[0] : e;
      sx = t.clientX; sy = t.clientY; active = true;
    };
    const move = (e) => {
      if (!active) return;
      if (e.cancelable && opts.preventScroll !== false) e.preventDefault();
    };
    const end = (e) => {
      if (!active) return;
      active = false;
      const t = (e.changedTouches ? e.changedTouches[0] : e);
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < TH) {
        if (opts.onTap) opts.onTap(t.clientX, t.clientY);
        return;
      }
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      if (opts.onSwipe) opts.onSwipe(dir, { dx, dy });
    };
    node.addEventListener("touchstart", start, { passive: true });
    node.addEventListener("touchmove", move, { passive: false });
    node.addEventListener("touchend", end, { passive: true });
    node.addEventListener("touchcancel", () => { active = false; }, { passive: true });

    let dragging = false, mx = 0, my = 0;
    const mdown = (e) => { dragging = true; mx = e.clientX; my = e.clientY; };
    const mup = (e) => {
      if (!dragging) return;
      dragging = false;
      const dx = e.clientX - mx, dy = e.clientY - my;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < TH) return;
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      if (opts.onSwipe) opts.onSwipe(dir, { dx, dy });
    };
    if (opts.mouse !== false) {
      node.addEventListener("mousedown", mdown);
      window.addEventListener("mouseup", mup);
    }

    return () => {
      node.removeEventListener("touchstart", start);
      node.removeEventListener("touchmove", move);
      node.removeEventListener("touchend", end);
      node.removeEventListener("mousedown", mdown);
      window.removeEventListener("mouseup", mup);
    };
  }

  /* -------------------- Dokunmatik kontrol çubuğu -------------------- */
  function touchControls(buttons) {
    const bar = el("div", { class: "mobile-controls" });
    const disposes = [];
    buttons.forEach((b) => {
      const btn = el("button", { text: b.label, "aria-label": b.aria || b.label, type: "button" });
      let timer = null, rep = null;
      const start = (e) => {
        if (e.cancelable) e.preventDefault();
        Haptic.tap();
        b.onPress();
        if (b.repeat) {
          timer = setTimeout(() => {
            let n = 0;
            rep = setInterval(() => {
              b.onPress(); n++;
              if (n > 40) clearInterval(rep);
            }, 90);
          }, 260);
        }
      };
      const stop = () => {
        clearTimeout(timer); clearInterval(rep);
        timer = rep = null;
        if (b.onRelease) b.onRelease();
      };
      btn.addEventListener("touchstart", start, { passive: false });
      btn.addEventListener("touchend", stop);
      btn.addEventListener("touchcancel", stop);
      btn.addEventListener("mousedown", start);
      btn.addEventListener("mouseup", stop);
      btn.addEventListener("mouseleave", stop);
      btn.addEventListener("click", (e) => e.preventDefault());
      disposes.push(() => { clearTimeout(timer); clearInterval(rep); });
      bar.appendChild(btn);
    });
    return { node: bar, dispose: () => disposes.forEach((d) => d()) };
  }

  /* ---------------------------- Haptik ---------------------------- */
  const Haptic = {
    enabled: true,
    tap(ms) {
      if (!this.enabled) return;
      try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {}
    }
  };

  /* ----------------------------- Canvas ----------------------------- */
  function makeCanvas(w, h, opts) {
    const canvas = el("canvas", { class: "game-canvas" });
    canvas.width = w;
    canvas.height = h;
    if (opts && opts.maxWidth) canvas.style.maxWidth = opts.maxWidth;
    return canvas;
  }

  function boardWrap(canvas) {
    return el("div", { class: "board-wrap" }, canvas);
  }

  function pointerPos(canvas, e) {
    const r = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : e);
    const scaleX = canvas.width / (r.width || 1);
    const scaleY = canvas.height / (r.height || 1);
    return {
      x: (t.clientX - r.left) * scaleX,
      y: (t.clientY - r.top) * scaleY,
      nx: (t.clientX - r.left) / (r.width || 1),
      ny: (t.clientY - r.top) / (r.height || 1)
    };
  }

  /* ------------------------ Yüksek DPI ayarı ------------------------ */
  /** Canvas'ı retina ekranlarda keskin çizer */
  function hidpi(canvas, cssW, cssH) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = "100%";
    canvas.style.maxWidth = cssW + "px";
    const ctx = canvas.getContext("2d");
    if (ctx && ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  /* ---------------------------- Izgara ---------------------------- */
  function gridBoard(cols, rows, style) {
    const root = el("div", { class: "cell-grid" });
    root.style.gridTemplateColumns = `repeat(${cols}, var(--cell))`;
    if (style && style.cell) root.style.setProperty("--cell", style.cell + "px");
    const cells = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        const b = el("button", { type: "button" });
        root.appendChild(b);
        row.push(b);
      }
      cells.push(row);
    }
    return {
      root,
      at(r, c) { return cells[r] && cells[r][c]; },
      forEach(fn) { cells.forEach((row, r) => row.forEach((b, c) => fn(b, r, c))); },
      reset() {
        cells.forEach((row) => row.forEach((b) => {
          b.textContent = ""; b.className = ""; b.disabled = false;
          b.style.cssText = "";
        }));
      }
    };
  }

  /* --------------------------- Zamanlayıcı --------------------------- */
  function stopwatch(elOrFn) {
    let t0 = 0, id = null, running = false;
    const emit = () => {
      const s = Math.floor((Date.now() - t0) / 1000);
      const v = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      if (typeof elOrFn === "function") elOrFn(v, s);
      else if (elOrFn) elOrFn.textContent = v;
      return s;
    };
    return {
      start() { t0 = Date.now(); running = true; clearInterval(id); emit(); id = setInterval(emit, 250); },
      stop() { clearInterval(id); running = false; },
      reset() { clearInterval(id); running = false; t0 = 0; },
      get seconds() { return running ? Math.floor((Date.now() - t0) / 1000) : 0; },
      get running() { return running; }
    };
  }

  /* ----------------------------- Dışa aç ----------------------------- */
  window.Engine = {
    rnd, rand, clamp, lerp, pick, shuffle,
    el, txt, hud, overlay, removeOverlay,
    Sound, store, Profile, ACHIEVEMENTS,
    onKey, swipe, touchControls, Haptic,
    makeCanvas, boardWrap, pointerPos, hidpi, gridBoard, stopwatch,
    bestOf, SOUNDS
  };
})();
