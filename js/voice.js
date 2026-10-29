/* ==========================================================================
   VOICE — konuşarak site kontrolü (sesli asistan)
   • Web Speech API: SpeechRecognition (dinleme) + SpeechSynthesis (cevap)
   • Türkçe komutlar: oyun aç, sohbet, süper lig, rekorlar, sesi kapat…
   ========================================================================== */
(function () {
  "use strict";
  const E = window.Engine;
  const { el, store, Sound, Haptic } = E;

  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!Rec;
  const synthOK = typeof window.speechSynthesis !== "undefined";

  let recognition = null;
  let listening = false;
  let autoStopTimer = null;

  /* ------------------------------- Konuşma -------------------------------- */
  function speak(text) {
    if (!synthOK) return;
    if (store.get("voice_reply", true) === false) return;
    try {
      window.speechSynthesis.cancel();
      const u = new window.SpeechSynthesisUtterance(text);
      u.lang = "tr-TR";
      u.rate = 1.02;
      u.pitch = 1;
      const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
      const tr = voices.find((v) => /tr[-_]?TR/i.test(v.lang));
      if (tr) u.voice = tr;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  /* --------------------------- Oyun takma adları --------------------------- */
  const GAME_ALIASES = [
    { id: "snake", words: ["yılan", "yilan"] },
    { id: "tetris", words: ["tetris"] },
    { id: "flappy", words: ["flappy", "kuş", "kus"] },
    { id: "breakout", words: ["kırıcı", "kirici", "tuğla", "tugla"] },
    { id: "pong", words: ["pong", "tenis"] },
    { id: "shooter", words: ["yıldız savunması", "yildiz savunmasi", "uzay"] },
    { id: "asteroid", words: ["asteroit", "asteroid"] },
    { id: "jumper", words: ["tırmanıcı", "tirmanici", "zıplama"] },
    { id: "target", words: ["hedef"] },
    { id: "basket", words: ["basket", "basketbol"] },
    { id: "balloons", words: ["balon"] },
    { id: "fishing", words: ["balıkçı", "balikci", "balık tutma"] },
    { id: "tower", words: ["kule inşa", "kule insa"] },
    { id: "reaction", words: ["refleks", "tepki"] },
    { id: "memory", words: ["hafıza kartları", "hafiza kartlari", "hafıza", "hafiza"] },
    { id: "2048", words: ["2048", "iki bin kırk sekiz"] },
    { id: "mines", words: ["mayın", "mayin", "mayın tarlası"] },
    { id: "blocks", words: ["blok", "blok bulmaca"] },
    { id: "sudoku", words: ["sudoku", "sudoko"] },
    { id: "numbers", words: ["sayı ezberi", "sayi ezberi"] },
    { id: "slide", words: ["kayan", "kayan bulmaca"] },
    { id: "colorsort", words: ["renk sırala", "renk siralama"] },
    { id: "simon", words: ["renk ustası", "renk ustasi", "simon"] },
    { id: "lights", words: ["ışıklar", "isiklar", "ışık kapat"] },
    { id: "maze", words: ["labirent"] },
    { id: "pixelart", words: ["piksel", "boyama"] },
    { id: "guess", words: ["sayı tahmin", "sayi tahmin"] },
    { id: "xox", words: ["xox", "x o x", "üç taş"] },
    { id: "nim", words: ["nim", "taş oyunu"] },
    { id: "wordle", words: ["kelime", "wordle", "kelime ustası"] },
    { id: "battleship", words: ["deniz savaşı", "deniz savasi", "gemi"] },
    { id: "solitaire", words: ["solitaire", "iskambil"] },
    { id: "hanoi", words: ["hangey", "hankey", "hanoi"] },
    { id: "speedy", words: ["hız eşleştirme", "hiz eslestirme"] },
    { id: "sequence", words: ["sıra takip", "sira takip"] },
    { id: "melody", words: ["melodi", "müzik ezberi"] },
    { id: "piano", words: ["piyano"] },
    { id: "reflex", words: ["ateş buz", "ates buz"] },
    { id: "simonlite", words: ["hafıza ekranı", "hafiza ekrani"] },
    { id: "emojimatch", words: ["emoji"] },
    { id: "football", words: ["süper lig", "super lig", "futbol", "puan durumu"] },
    { id: "chatroom", words: ["sohbet odası", "sohbet odasi"] }
  ];

  function findGame(text) {
    const games = window.GAMES || [];
    for (let i = 0; i < GAME_ALIASES.length; i++) {
      const a = GAME_ALIASES[i];
      for (let j = 0; j < a.words.length; j++) {
        if (text.indexOf(a.words[j]) >= 0) {
          const g = games.find((x) => x.id === a.id);
          if (g) return g;
        }
      }
    }
    return games.find((g) => g.title && text.indexOf(g.title.toLowerCase()) >= 0);
  }

  /* ----------------------------- Komut işleme ----------------------------- */
  function handleCommand(raw) {
    if (!raw) return;
    const text = String(raw).toLowerCase().trim();
    if (!text) return;
    const App = window.App;
    addLog(raw);
    Haptic.tap(10);

    // --- sohbet ---
    if (/sohbet|mesaj|chat/.test(text) && !/oyun/.test(text)) {
      say("Sohbet açılıyor");
      if (window.ChatUI) window.ChatUI.render();
      return;
    }

    // --- süper lig ---
    if (/süper lig|super lig|futbol|puan durumu|maç|mac/.test(text) && !/oyun/.test(text)) {
      say("Süper Lig merkezi açılıyor");
      if (window.Football) window.Football.render();
      return;
    }

    // --- rekor / başarım ---
    if (/başarım|basari/.test(text)) {
      say("Başarımlar açılıyor");
      App.renderAchievements();
      return;
    }
    if (/rekor|skor|en iyi/.test(text)) {
      say("Rekorlar açılıyor");
      App.renderRecords();
      return;
    }

    // --- oyun aç ---
    if (/oyun|aç|ac|oyna|başlat|baslat|gir/.test(text)) {
      const g = findGame(text);
      if (g) {
        say(g.title + " açılıyor");
        App.openGame(g);
        return;
      }
    }

    // sadece oyun adı
    const gOnly = findGame(text);
    if (gOnly && text.split(/\s+/).length <= 4) {
      say(gOnly.title + " açılıyor");
      App.openGame(gOnly);
      return;
    }

    // --- gezinme ---
    if (/ana sayfa|menü|menu|geri|kapat|oyunlar listesi/.test(text)) {
      say("Ana sayfaya dönüldü");
      App.backToHome();
      return;
    }
    if (/arcade|atari/.test(text)) { say("Arcade oyunları"); App.goTab("arcade"); return; }
    if (/zeka|bulmaca/.test(text)) { say("Zeka oyunları"); App.goTab("puzzle"); return; }
    if (/klasik/.test(text)) { say("Klasik oyunlar"); App.goTab("classic"); return; }

    // --- ses kontrolü ---
    if (/sesi kapat|sessiz|sustur/.test(text)) {
      setSound(false);
      addLog("Ses kapatıldı");
      return;
    }
    if (/sesi aç|ses aç|sesi ac|sesi ac /.test(text)) {
      setSound(true);
      Sound.play("tap");
      say("Ses açıldı");
      return;
    }

    // --- bilgi ---
    if (/kaç oyun|kaç tane/.test(text)) {
      const n = (window.GAMES || []).length;
      const bests = (window.GAMES || []).filter((g) => Number(store.get("best_" + g.id, 0)) > 0).length;
      say(n + " oyun var, " + bests + " oyunda rekorun var.");
      return;
    }

    if (/yardım|yardim|ne yapabilirsin|komut/.test(text)) {
      say("Oyun adı söyle açayım. Sohbet, süper lig, rekorlar, başarımlar, ana sayfa da diyebilirsin.");
      return;
    }

    if (/merhaba|selam|hey/.test(text)) {
      say("Merhaba! Hangi oyunu açayım?");
      return;
    }

    say("Anlamadım. Oyun adı söyleyebilir ya da yardım diyebilirsin.");
  }

  function setSound(on) {
    E.Sound.enabled = on;
    store.set("sound", on);
    const onEl = document.getElementById("sound-on");
    const offEl = document.getElementById("sound-off");
    if (onEl) onEl.hidden = !on;
    if (offEl) offEl.hidden = on;
  }

  function say(text) {
    addLog(text, true);
    speak(text);
  }

  /* -------------------------------- Panel -------------------------------- */
  function buildPanel() {
    if (document.getElementById("voice-fab")) return;

    const fab = el("button", { class: "voice-fab", id: "voice-fab", type: "button", "aria-label": "Sesli asistan" });
    fab.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3 3 0 013 3v6a3 3 0 01-6 0V6a3 3 0 013-3z"/><path d="M19 11a7 7 0 01-14 0"/><path d="M12 18v3"/></svg>';
    fab.addEventListener("click", togglePanel);

    const panel = el("div", { class: "voice-panel", id: "voice-panel" });
    panel.hidden = true;
    panel.appendChild(el("div", { class: "voice-head" }, [
      el("h4", { text: "🎙️ Sesli Asistan" }),
      el("button", { class: "icon-btn sm", type: "button", text: "✕", "aria-label": "Kapat", on: { click: togglePanel } })
    ]));

    panel.appendChild(el("p", {
      class: "voice-status", id: "voice-status",
      text: supported ? "Mikrofona bas ve konuş" : "Bu tarayıcı ses tanımayı desteklemiyor"
    }));

    const micBtn = el("button", { class: "voice-mic", id: "voice-mic", type: "button", "aria-label": "Dinlemeyi başlat" });
    micBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3 3 0 013 3v6a3 3 0 01-6 0V6a3 3 0 013-3z"/><path d="M19 11a7 7 0 01-14 0"/><path d="M12 18v3"/></svg>';
    micBtn.addEventListener("click", toggleListening);
    panel.appendChild(micBtn);

    const log = el("div", { class: "voice-log", id: "voice-log" });
    panel.appendChild(log);

    const quick = el("div", { class: "voice-quick" }, [
      quickBtn("Tetris", "tetris oyununu aç"),
      quickBtn("Süper Lig", "süper lig"),
      quickBtn("Sohbet", "sohbet"),
      quickBtn("Rekorlar", "rekorlar"),
      quickBtn("Yardım", "yardım")
    ]);
    panel.appendChild(quick);

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    if (store.get("voice_tip", true)) {
      addLog("Merhaba! Mikrofona basıp konuş ya da aşağıdaki kısayolları kullan.");
      store.set("voice_tip", false);
    }
  }

  function quickBtn(label, cmd) {
    return el("button", {
      class: "chip", type: "button", text: label,
      on: { click: () => { openPanel(); handleCommand(cmd); } }
    });
  }

  function addLog(line, isBot) {
    const log = document.getElementById("voice-log");
    if (!log) return;
    log.appendChild(el("div", { class: "voice-line " + (isBot ? "bot" : "user"), text: line }));
    log.scrollTop = log.scrollHeight;
  }

  function openPanel() {
    buildPanel();
    const panel = document.getElementById("voice-panel");
    if (panel) panel.hidden = false;
  }

  function togglePanel() {
    buildPanel();
    const panel = document.getElementById("voice-panel");
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) Sound.play("pop");
  }

  /* -------------------------------- Dinleme -------------------------------- */
  function toggleListening() {
    if (!supported) {
      const s = document.getElementById("voice-status");
      if (s) s.textContent = "Ses tanıma desteklenmiyor — kısayolları kullan";
      if (window.App) window.App.toast("Ses tanıma yok. Chrome veya Edge dene.", "bad");
      return;
    }
    if (listening) stopListening();
    else startListening();
  }

  function startListening() {
    try {
      if (!recognition) {
        recognition = new Rec();
        recognition.lang = "tr-TR";
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (ev) => {
          let interim = "", final = "";
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            const r = ev.results[i];
            if (r.isFinal) final += r[0].transcript;
            else interim += r[0].transcript;
          }
          const st = document.getElementById("voice-status");
          if (st && interim) st.textContent = "“" + interim + "”";
          if (final) handleCommand(final);
        };

        recognition.onerror = (ev) => {
          const st = document.getElementById("voice-status");
          if (st) {
            st.textContent = ev.error === "not-allowed" ? "Mikrofon izni verilmedi"
              : ev.error === "no-speech" ? "Ses duyamadım, tekrar dene"
              : "Hata: " + ev.error;
          }
          listening = false;
          const btn = document.getElementById("voice-mic");
          if (btn) btn.classList.remove("listening");
        };

        recognition.onend = () => {
          listening = false;
          const btn = document.getElementById("voice-mic");
          if (btn) btn.classList.remove("listening");
        };
      }

      recognition.start();
      listening = true;
      const btn = document.getElementById("voice-mic");
      if (btn) btn.classList.add("listening");
      const st = document.getElementById("voice-status");
      if (st) st.textContent = "Dinliyorum…";
      Sound.play("pop");
      Haptic.tap(15);

      clearTimeout(autoStopTimer);
      autoStopTimer = setTimeout(() => { if (listening) stopListening(); }, 12000);
    } catch (e) {
      listening = false;
      if (window.App) window.App.toast("Mikrofon başlatılamadı", "bad");
    }
  }

  function stopListening() {
    listening = false;
    clearTimeout(autoStopTimer);
    const btn = document.getElementById("voice-mic");
    if (btn) btn.classList.remove("listening");
    const st = document.getElementById("voice-status");
    if (st && supported) st.textContent = "Mikrofona bas ve konuş";
    try { if (recognition) recognition.stop(); } catch (e) {}
  }

  /* -------------------------------- Başlat -------------------------------- */
  function init() {
    buildPanel();
  }

  window.Voice = { init, togglePanel, openPanel, handleCommand, speak, supported, synthOK };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else init();
})();
