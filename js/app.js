/* ==========================================================================
   APP — yönlendirme, ana sayfa, arama, rekorlar, başarımlar, PWA
   ========================================================================== */
(function () {
  "use strict";
  const E = window.Engine;
  const { el, store, Sound, Profile, Haptic } = E;
  const $ = (id) => document.getElementById(id);

  const state = {
    games: window.GAMES || [],
    category: "all",
    search: "",
    current: null,
    cleanup: null,
    stops: [],
    tab: "home",
    view: "home"
  };

  const CATEGORIES = [
    { id: "all", label: "🎯 Tümü" },
    { id: "arcade", label: "🕹️ Arcade" },
    { id: "puzzle", label: "🧠 Zeka" },
    { id: "classic", label: "♟️ Klasik" },
    { id: "new", label: "✨ Yeni" }
  ];

  /* ------------------------------ Toast ------------------------------ */
  function toast(msg, kind) {
    const wrap = $("toast-wrap");
    if (!wrap) return;
    const t = el("div", { class: "toast " + (kind || ""), text: msg });
    wrap.appendChild(t);
    setTimeout(() => t.remove(), 2700);
    if (wrap.children.length > 3) wrap.firstChild.remove();
  }

  /* ---------------------------- Kayıtlar ---------------------------- */
  const bestOf = (g) => Number(store.get("best_" + g.id, 0)) || 0;

  function recordLabel(g, v) {
    if (!v) return "";
    if (g.id === "reaction") return v + " ms";
    if (g.id === "asteroid") return Number(v).toFixed(1) + "s";
    if (g.id === "mines") return v + "s";
    if (g.id === "guess") return v + " deneme";
    if (g.id === "memory" || g.id === "slide" || g.id === "lights" ||
        g.id === "colorsort" || g.id === "wordle" || g.id === "solitaire") {
      return v + " hamle";
    }
    return String(v);
  }

  /* ------------------------- Oyun kartları ------------------------- */
  const TINTS = [
    "rgba(124,92,255,.55)", "rgba(34,211,238,.5)", "rgba(244,114,182,.5)",
    "rgba(52,211,153,.5)", "rgba(251,191,36,.5)", "rgba(96,165,250,.5)"
  ];

  function filteredGames() {
    let list = state.games;
    if (state.category === "new") list = list.filter((g) => g.new);
    else if (state.category !== "all") list = list.filter((g) => g.cat === state.category);
    if (state.search) {
      const q = state.search.toLowerCase();
      list = list.filter((g) =>
        g.title.toLowerCase().indexOf(q) >= 0 ||
        g.desc.toLowerCase().indexOf(q) >= 0 ||
        g.cat.toLowerCase().indexOf(q) >= 0);
    }
    return list;
  }

  function renderGames() {
    const grid = $("game-grid");
    if (!grid) return;
    grid.innerHTML = "";
    const list = filteredGames();
    const countEl = $("game-count");
    if (countEl) countEl.textContent = list.length + " oyun";
    const empty = $("empty-state");
    if (empty) empty.hidden = list.length > 0;

    list.forEach((g, i) => {
      const best = bestOf(g);
      const played = Profile.played(g.id);
      const card = el("button", {
        class: "game-card" + (played ? " played" : ""),
        type: "button",
        "aria-label": g.title + " oyununu aç",
        style: { "--tint": TINTS[i % TINTS.length] }
      }, [
        el("div", { class: "ic", text: g.emoji }),
        el("h3", { text: g.title }),
        el("div", {
          class: "rec",
          html: best ? "Rekor <b>" + recordLabel(g, best) + "</b>" : "Henüz rekor yok"
        })
      ]);
      if (g.new) card.appendChild(el("span", { class: "new-dot", "aria-label": "Yeni" }));
      if (played) card.appendChild(el("span", { class: "played-dot", title: "Daha önce oynadın" }));
      card.addEventListener("click", () => openGame(g));
      grid.appendChild(card);
    });
  }

  function renderStats() {
    const wrap = $("quick-stats");
    if (!wrap) return;
    const played = state.games.filter((g) => bestOf(g) > 0).length;
    const prof = Profile.data();
    const ach = Object.keys(prof.achievements || {}).length;
    wrap.innerHTML = "";
    wrap.appendChild(el("div", { class: "stat" }, [
      el("span", { class: "ic", text: "🎮" }), el("b", { text: String(state.games.length) }), E.txt(" oyun")
    ]));
    wrap.appendChild(el("div", { class: "stat" }, [
      el("span", { class: "ic", text: "🏆" }), el("b", { text: String(played) }), E.txt(" rekor")
    ]));
    wrap.appendChild(el("div", { class: "stat" }, [
      el("span", { class: "ic", text: "🥇" }), el("b", { text: ach + "/" + E.ACHIEVEMENTS.length }), E.txt(" başarım")
    ]));
    if (prof.streak > 0) {
      wrap.appendChild(el("div", { class: "stat" }, [
        el("span", { class: "ic", text: "🔥" }), el("b", { text: String(prof.streak) }), E.txt(" gün seri")
      ]));
    }
  }

  function renderChips() {
    const chips = $("category-chips");
    if (!chips) return;
    chips.innerHTML = "";
    CATEGORIES.forEach((c) => {
      const b = el("button", {
        class: "chip" + (state.category === c.id ? " active" : ""),
        text: c.label,
        type: "button",
        "data-cat": c.id,
        role: "tab"
      });
      b.addEventListener("click", () => {
        state.category = c.id;
        state.search = "";
        const si = $("search-input");
        if (si) si.value = "";
        Sound.play("tap");
        Haptic.tap(4);
        renderChips();
        renderGames();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      chips.appendChild(b);
    });
  }

  /* ---------------------------- Ana sayfa ---------------------------- */
  function buildHome() {
    const home = $("home");
    home.innerHTML = `
      <section class="hero">
        <h1 id="greet"></h1>
        <p id="hero-sub"></p>
        <div class="quick-stats" id="quick-stats"></div>
      </section>
      <section class="chips-wrap">
        <div class="chips" id="category-chips" role="tablist" aria-label="Kategoriler"></div>
      </section>
      <section class="section">
        <div class="section-head">
          <h2>Oyunlar <span class="muted" id="game-count"></span></h2>
          <button class="link-btn" id="achievements-btn" type="button">🥇 Başarımlar</button>
        </div>
        <div class="game-grid" id="game-grid"></div>
        <div class="empty" id="empty-state" hidden>
          <span>🔍</span>
          <p>Bu aramaya uygun oyun bulunamadı.</p>
        </div>
      </section>`;

    const hour = new Date().getHours();
    const greet = hour < 6 ? "İyi geceler 🌙" : hour < 12 ? "Günaydın ☀️" : hour < 18 ? "İyi günler 👋" : "İyi akşamlar 🌆";
    const greetEl = $("greet");
    greetEl.appendChild(E.txt(greet + " "));
    greetEl.appendChild(el("span", { text: "Ne oynayalım?" }));

    const prof = Profile.data();
    const sub = $("hero-sub");
    if (prof.games > 0) {
      sub.textContent = `${state.games.length} oyun • ${Object.keys(prof.achievements || {}).length} başarım açtın • Rekorların cihazında saklanır`;
    } else {
      sub.textContent = `${state.games.length} oyun, tek dokunuş. İnternet gerekmez, rekorların cihazında saklanır.`;
    }

    renderStats();
    renderChips();
    renderGames();

    const achBtn = $("achievements-btn");
    if (achBtn) achBtn.addEventListener("click", renderAchievements);
  }

  /* ------------------------- Başarımlar sayfası ------------------------- */
  function renderAchievements() {
    if (state.current) backToHome(true);
    state.view = "achievements";
    setTab("");
    const home = $("home");
    const prof = Profile.data();
    const unlockedIds = prof.achievements || {};
    const total = E.ACHIEVEMENTS.length;
    const done = Object.keys(unlockedIds).length;

    home.innerHTML = "";
    const section = el("section", { class: "section page" }, [
      el("div", { class: "section-head" }, [
        el("h2", { text: "🥇 Başarımlar" }),
        el("span", { class: "muted", text: done + "/" + total })
      ])
    ]);

    section.appendChild(el("div", { class: "progress" },
      el("div", { class: "progress-fill", style: { width: (done / total * 100).toFixed(1) + "%" } })));

    const list = el("div", { class: "ach-list" });
    E.ACHIEVEMENTS.forEach((a) => {
      const got = !!unlockedIds[a.id];
      list.appendChild(el("div", { class: "ach-row" + (got ? " got" : "") }, [
        el("div", { class: "ic", text: got ? a.icon : "🔒" }),
        el("div", { class: "info" }, [
          el("h4", { text: a.title }),
          el("p", { text: a.desc })
        ]),
        el("span", { class: "ach-state", text: got ? "✓" : "" })
      ]));
    });
    section.appendChild(list);

    section.appendChild(el("div", { class: "profile-card" }, [
      el("h3", { text: "📊 Profil" }),
      el("div", { class: "profile-grid" }, [
        statBox("Oynanan oyun", prof.games || 0),
        statBox("Toplam oynama", Profile.totalPlays()),
        statBox("Rekor", state.games.filter((g) => bestOf(g) > 0).length),
        statBox("Gün serisi", prof.streak || 0)
      ])
    ]));

    home.appendChild(section);
    window.scrollTo({ top: 0 });
  }

  function statBox(label, value) {
    return el("div", { class: "pstat" }, [
      el("b", { text: String(value) }),
      el("span", { text: label })
    ]);
  }

  /* --------------------------- Rekorlar sayfası --------------------------- */
  function renderRecords() {
    if (state.current) backToHome(true);
    state.view = "records";
    setTab("records");
    const home = $("home");
    home.innerHTML = "";
    const section = el("section", { class: "section page" }, [
      el("div", { class: "section-head" }, [
        el("h2", { text: "🏆 Rekorlar" }),
        el("span", { class: "muted", text: "Bu cihazda" })
      ])
    ]);

    const list = el("div", { class: "records-list" });
    const withBest = state.games.filter((g) => bestOf(g) > 0);
    if (!withBest.length) {
      list.appendChild(el("div", { class: "empty" }, [
        el("span", { text: "🏆" }),
        el("p", { text: "Henüz rekor yok. Bir oyun oyna ve ilk rekorunu kır!" })
      ]));
    } else {
      withBest.sort((a, b) => bestOf(b) - bestOf(a));
      withBest.forEach((g) => {
        const row = el("button", { class: "record-row", type: "button" }, [
          el("div", { class: "ic", text: g.emoji }),
          el("div", { class: "info" }, [
            el("h4", { text: g.title }),
            el("p", { text: g.desc })
          ]),
          el("div", { class: "val", text: recordLabel(g, bestOf(g)) })
        ]);
        row.addEventListener("click", () => openGame(g));
        list.appendChild(row);
      });
    }
    section.appendChild(list);

    const resetBtn = el("button", { class: "btn sec block", type: "button", text: "Tüm rekorları sıfırla" });
    resetBtn.addEventListener("click", () => {
      state.games.forEach((g) => store.del("best_" + g.id));
      ["mines_kolay", "mines_orta", "mines_zor", "slide3", "slide4", "lights5",
        "guessBest", "xoxStats", "nimStats", "reactionBest", "profile"].forEach((k) => store.del(k));
      toast("Rekorlar ve başarımlar sıfırlandı");
      renderRecords();
      renderStats();
    });
    section.appendChild(el("div", { class: "reset-wrap" }, resetBtn));

    home.appendChild(section);
    window.scrollTo({ top: 0 });
  }

  /* ------------------------------ Tabbar ----------------------------- */
  function setTab(name) {
    document.querySelectorAll(".tab").forEach((t) => {
      const on = t.dataset.tab === name;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  /* ---------------------------- Oyun aç ---------------------------- */
  function openGame(g) {
    if (!g) return;
    try { if (state.cleanup) state.cleanup(); } catch (e) { console.error(e); }
    state.stops.forEach((s) => s());
    state.stops = [];
    state.cleanup = null;

    state.current = g;
    state.view = "play";
    Profile.startGame(g.id);

    $("play-title").innerHTML = "";
    $("play-title").appendChild(el("span", { text: g.emoji }));
    $("play-title").appendChild(el("span", { text: g.title }));
    $("play-desc").textContent = g.desc + (g.hint ? "  •  " + g.hint : "");

    $("home").hidden = true;
    $("play").hidden = false;
    $("back-btn").hidden = false;
    $("appbar-title").textContent = g.title;

    const stage = $("stage");
    stage.innerHTML = "";
    const shell = el("div", { class: "game-shell" });
    stage.appendChild(shell);
    window.scrollTo({ top: 0 });

    const host = {
      store,
      best: bestOf(g),
      sound: (n) => Sound.play(n),
      tone: (i, d) => Sound.note(i, d),
      toast,
      record(score) {
        const cur = bestOf(g);
        if (score > cur) {
          store.set("best_" + g.id, score);
          host.best = score;
          toast(`🏆 Yeni rekor: ${recordLabel(g, score)}`, "good");
          Profile.onBest(g.id, score);
          return true;
        }
        return false;
      },
      recordMoves(moves) {
        const cur = bestOf(g);
        if (!cur || moves < cur) {
          store.set("best_" + g.id, moves);
          host.best = moves;
          toast(`🏆 En az hamle: ${moves}`, "good");
          Profile.onBest(g.id, moves);
          return true;
        }
        return false;
      }
    };

    try {
      const handle = g.mount(host, shell);
      if (handle && handle.stop) state.cleanup = handle.stop;
    } catch (err) {
      console.error("Oyun yüklenemedi:", g.id, err);
      shell.appendChild(el("div", { class: "overlay static" }, [
        el("h3", { text: "Bu oyun yüklenemedi" }),
        el("p", { text: "Lütfen sayfayı yenileyip tekrar dene." }),
        el("button", { class: "btn", type: "button", text: "Geri dön", on: { click: () => backToHome() } })
      ]));
    }

    try { history.replaceState(null, "", "#" + g.id); } catch (e) {}
  }

  function backToHome(silent) {
    if (state.current) {
      try { if (state.cleanup) state.cleanup(); } catch (e) { console.error(e); }
      state.cleanup = null;
      state.current = null;
      state.stops.forEach((s) => s());
      state.stops = [];
    }
    $("stage").innerHTML = "";
    $("play").hidden = true;
    $("home").hidden = false;
    $("back-btn").hidden = true;
    $("appbar-title").innerHTML = 'Oyun Durağı <b class="brand-b">Pro</b>';
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}

    if (!silent) {
      state.view = "home";
      state.tab = "home";
      setTab("home");
      buildHome();
    }
  }

  function goTab(name) {
    if (name === "records") { renderRecords(); return; }
    if (name === "chat") { if (window.ChatUI) { window.ChatUI.render(); return; } }
    if (name === "football") { if (window.Football) { window.Football.render(); return; } }
    if (state.current) backToHome(true);
    state.tab = name;
    setTab(name);
    state.category = name === "home" ? "all" : name;
    state.search = "";
    state.view = "home";
    const si = $("search-input");
    if (si) si.value = "";
    if (!$("game-grid")) buildHome();
    else { renderChips(); renderGames(); renderStats(); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ----------------------------- PWA ----------------------------- */
  let deferredPrompt = null;

  function initPWA() {
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").then((reg) => {
          reg.addEventListener("updatefound", () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener("statechange", () => {
              if (nw.state === "installed" && navigator.serviceWorker.controller) {
                toast("Yeni sürüm hazır — yenileniyor…");
                setTimeout(() => location.reload(), 1200);
              }
            });
          });
        }).catch(() => {});
      });
    }

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const btn = $("install-btn");
      if (btn) btn.hidden = false;
    });

    const installBtn = $("install-btn");
    if (installBtn) {
      installBtn.addEventListener("click", () => {
        if (!deferredPrompt) {
          toast("Tarayıcı menüsünden 'Ana ekrana ekle' seçebilirsin");
          return;
        }
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((res) => {
          if (res.outcome === "accepted") toast("Ana ekrana eklendi! 📱", "good");
          deferredPrompt = null;
          installBtn.hidden = true;
        });
      });
    }

    window.addEventListener("appinstalled", () => {
      const btn = $("install-btn");
      if (btn) btn.hidden = true;
    });

    const netBar = $("net-bar");
    function updateNet() {
      if (!netBar) return;
      netBar.hidden = navigator.onLine !== false;
    }
    window.addEventListener("online", updateNet);
    window.addEventListener("offline", updateNet);
    updateNet();
  }

  /* ----------------------------- Olaylar ----------------------------- */
  function bind() {
    $("back-btn").addEventListener("click", () => {
      Sound.play("tap");
      backToHome();
    });

    $("tabbar").addEventListener("click", (e) => {
      const tab = e.target.closest(".tab");
      if (!tab) return;
      Sound.play("tap");
      Haptic.tap(5);
      goTab(tab.dataset.tab);
    });

    const searchBtn = $("search-btn");
    const searchRow = $("search-row");
    const searchInput = $("search-input");
    searchBtn.addEventListener("click", () => {
      searchRow.hidden = !searchRow.hidden;
      if (!searchRow.hidden) {
        if (state.view !== "home") goTab("home");
        try { searchInput.focus(); } catch (e) {}
      } else {
        searchInput.value = "";
        state.search = "";
        renderGames();
      }
    });
    $("search-close").addEventListener("click", () => {
      searchRow.hidden = true;
      searchInput.value = "";
      state.search = "";
      renderGames();
    });
    searchInput.addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      if (!$("game-grid")) buildHome();
      renderGames();
    });

    $("sound-btn").addEventListener("click", () => {
      Sound.enabled = !Sound.enabled;
      store.set("sound", Sound.enabled);
      $("sound-on").hidden = !Sound.enabled;
      $("sound-off").hidden = Sound.enabled;
      if (Sound.enabled) {
        Sound.play("tap");
        toast("Ses açıldı 🔊");
      } else toast("Ses kapandı 🔇");
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (state.current) { backToHome(); return; }
        if (!$("search-row").hidden) { $("search-row").hidden = true; return; }
        if (state.view !== "home") goTab("home");
      }
    });

    document.addEventListener("pointerdown", () => Sound.ensure(), { once: true });
    window.addEventListener("hashchange", handleHash);

    // Başarımlar sekmesi (tabbar içinde ayrı buton)
    const achTab = $("achievements-tab");
    if (achTab) achTab.addEventListener("click", renderAchievements);
  }

  function handleHash() {
    const hash = location.hash.slice(1);
    if (!hash) return;
    if (hash === "records") { renderRecords(); return; }
    if (hash === "achievements") { renderAchievements(); return; }
    if (hash === "chat") { if (window.ChatUI) window.ChatUI.render(); return; }
    if (hash === "football") { if (window.Football) window.Football.render(); return; }
    if (hash.indexOf("cat-") === 0) {
      const cat = hash.slice(4);
      if (state.current) backToHome(true);
      state.category = cat;
      buildHome();
      return;
    }
    const g = state.games.find((x) => x.id === hash);
    if (g && (!state.current || state.current.id !== g.id)) openGame(g);
  }

  /* ------------------------------ Başlat ----------------------------- */
  function init() {
    const savedSound = store.get("sound", true);
    Sound.enabled = savedSound !== false;
    $("sound-on").hidden = !Sound.enabled;
    $("sound-off").hidden = Sound.enabled;

    bind();
    buildHome();
    initPWA();

    if (location.hash) handleHash();

    setTimeout(() => {
      if (!state.current) {
        try { Profile.checkAchievements({ type: "init" }); } catch (e) {}
      }
    }, 900);
  }

  window.App = {
    openGame,
    backToHome,
    goTab,
    renderGames,
    renderAchievements,
    renderRecords,
    toast,
    state,
    onAchievements(unlocked) {
      renderStats();
      if (state.view === "achievements") renderAchievements();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else init();
})();
