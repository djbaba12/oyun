/* ==========================================================================
   CHAT — Arkadaşla mesajlaşma ve sesli mesaj
   • Kanallar (oda kodu) — mesajlar cihazda saklanır
   • Sesli mesaj kaydı (MediaRecorder) → oynatılabilir baloncuk
   • WebRTC DataChannel: aynı ağdaki iki cihaz arası GERÇEK mesaj
     (elle davet/yanıt kodu takası — sunucu gerekmez)
   ========================================================================== */
(function () {
  "use strict";
  const E = window.Engine;
  const { el, store, Sound, Haptic } = E;

  const MAX_MSGS = 200;
  const CHANNEL_KEY = "chat_channel";

  const state = {
    channel: store.get(CHANNEL_KEY, "genel"),
    messages: [],
    recorder: null,
    recording: false,
    recStart: 0,
    recTimer: null,
    recChunks: [],
    pc: null,
    dc: null,
    peerConnected: false
  };

  /* ------------------------------ Mesaj kaydı ------------------------------ */
  const msgKey = () => "chat_" + state.channel;

  function loadMessages() {
    state.messages = store.get(msgKey(), []) || [];
    return state.messages;
  }

  function saveMessages() {
    if (state.messages.length > MAX_MSGS) state.messages = state.messages.slice(-MAX_MSGS);
    store.set(msgKey(), state.messages);
  }

  function addMessage(msg) {
    const full = Object.assign({
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      time: Date.now(),
      from: store.get("chat_name", "Ben")
    }, msg);
    state.messages.push(full);
    saveMessages();
    renderMessages();
    return full;
  }

  /* ------------------------------- Görünüm -------------------------------- */
  function render() {
    if (window.App && window.App.state.current) window.App.backToHome(true);
    window.App.state.view = "chat";
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === "chat"));

    const home = document.getElementById("home");
    home.innerHTML = "";
    loadMessages();

    const section = el("section", { class: "section page chat-page" });
    section.appendChild(el("div", { class: "section-head" }, [
      el("h2", { text: "💬 Sohbet" }),
      el("button", { class: "link-btn", type: "button", text: "⚙️ Ayarlar", on: { click: openSettings } })
    ]));

    // kanallar
    const chanBar = el("div", { class: "chat-channels" });
    ["genel", "arkadaslar", "turnuva"].forEach((c) => {
      chanBar.appendChild(el("button", {
        class: "chip" + (state.channel === c ? " active" : ""),
        type: "button",
        text: "#" + c,
        on: {
          click() {
            state.channel = c;
            store.set(CHANNEL_KEY, c);
            loadMessages();
            render();
          }
        }
      }));
    });
    chanBar.appendChild(el("button", {
      class: "chip", type: "button", text: "＋ Kanal",
      on: {
        click() {
          const name = (window.prompt("Kanal adı (ör. muhabbet)") || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
          if (!name) return;
          state.channel = name;
          store.set(CHANNEL_KEY, name);
          loadMessages();
          render();
        }
      }
    }));
    section.appendChild(chanBar);

    const status = el("div", { class: "chat-status", id: "chat-status" });
    section.appendChild(status);
    updateStatus(status);

    const list = el("div", { class: "chat-list", id: "chat-list" });
    section.appendChild(list);

    // giriş
    const input = el("textarea", { class: "chat-input", rows: "1", placeholder: "Mesaj yaz…", "aria-label": "Mesaj" });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(input); }
    });
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 110) + "px";
    });

    const sendBtn = el("button", { class: "chat-send", type: "button", "aria-label": "Gönder", text: "➤" });
    sendBtn.addEventListener("click", () => sendText(input));

    const micBtn = el("button", { class: "chat-mic", type: "button", "aria-label": "Sesli mesaj" });
    micBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3 3 0 013 3v6a3 3 0 01-6 0V6a3 3 0 013-3z"/><path d="M19 11a7 7 0 01-14 0"/><path d="M12 18v3"/></svg>';
    micBtn.addEventListener("click", () => toggleRecord(micBtn));

    section.appendChild(el("div", { class: "chat-bar" }, [micBtn, input, sendBtn]));
    home.appendChild(section);

    renderMessages();
    try { input.focus(); } catch (e) {}
    window.scrollTo({ top: 0 });
  }

  function renderMessages() {
    const list = document.getElementById("chat-list");
    if (!list) return;
    list.innerHTML = "";

    if (!state.messages.length) {
      list.appendChild(el("div", { class: "chat-empty" }, [
        el("span", { text: "💬" }),
        el("p", { text: "Henüz mesaj yok. İlk mesajı sen yaz!" }),
        el("small", { text: "Sesli mesaj için mikrofon simgesine bas ve konuş." })
      ]));
      return;
    }

    const myName = store.get("chat_name", "Ben");
    let lastDay = "";

    state.messages.forEach((m) => {
      const d = new Date(m.time);
      const dayKey = d.toDateString();
      if (dayKey !== lastDay) {
        lastDay = dayKey;
        list.appendChild(el("div", { class: "chat-day", text: dayLabel(d) }));
      }

      const mine = m.from === myName;
      const bubble = el("div", { class: "chat-msg " + (mine ? "mine" : "theirs") });

      if (!mine) bubble.appendChild(el("div", { class: "chat-from", text: m.from }));

      if (m.type === "audio" && m.audio) {
        bubble.appendChild(el("audio", { controls: "", src: m.audio, preload: "metadata" }));
        bubble.appendChild(el("div", { class: "chat-dur", text: "🎤 " + (m.dur || 0) + " sn" }));
      } else {
        bubble.appendChild(el("div", { class: "chat-text", text: m.text || "" }));
      }

      bubble.appendChild(el("div", { class: "chat-time", text: timeLabel(d) }));
      list.appendChild(bubble);
    });

    setTimeout(() => { list.scrollTop = list.scrollHeight; }, 20);
  }

  function dayLabel(d) {
    const today = new Date();
    const yest = new Date(Date.now() - 864e5);
    if (d.toDateString() === today.toDateString()) return "Bugün";
    if (d.toDateString() === yest.toDateString()) return "Dün";
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
  }

  function timeLabel(d) {
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  /* -------------------------------- Gönder --------------------------------- */
  function sendText(input) {
    const text = (input.value || "").trim();
    if (!text) return;
    addMessage({ type: "text", text: text });
    input.value = "";
    input.style.height = "auto";
    Sound.play("tap");
    Haptic.tap(6);
    notifyOthers();
    sendToPeer({ type: "text", text: text });
  }

  /* ------------------------------ Sesli mesaj ------------------------------ */
  function toggleRecord(btn) {
    if (state.recording) { stopRecording(btn); return; }
    startRecording(btn);
  }

  function startRecording(btn) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      window.App.toast("Mikrofon bu tarayıcıda desteklenmiyor", "bad");
      return;
    }
    if (typeof window.MediaRecorder === "undefined") {
      window.App.toast("Ses kaydı desteklenmiyor", "bad");
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      state.recChunks = [];
      let rec;
      try { rec = new window.MediaRecorder(stream); }
      catch (e) { window.App.toast("Kayıt başlatılamadı", "bad"); return; }

      state.recorder = rec;
      state.stream = stream;

      rec.ondataavailable = (e) => { if (e.data && e.data.size) state.recChunks.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(state.recChunks, { type: "audio/webm" });
        const dur = Math.round((Date.now() - state.recStart) / 1000);
        try { stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
        state.stream = null;
        finishRecording(blob, dur);
      };

      rec.start();
      state.recording = true;
      state.recStart = Date.now();
      btn.classList.add("recording");
      window.App.toast("🎤 Kayıt başladı — bitirmek için tekrar bas");
      state.recTimer = setTimeout(() => { if (state.recording) stopRecording(btn); }, 60000);
    }).catch(() => {
      window.App.toast("Mikrofon izni verilmedi", "bad");
    });
  }

  function stopRecording(btn) {
    if (!state.recorder || !state.recording) return;
    state.recording = false;
    clearTimeout(state.recTimer);
    try { state.recorder.stop(); } catch (e) {}
    if (btn) btn.classList.remove("recording");
  }

  function finishRecording(blob, dur) {
    if (!blob || !blob.size) { window.App.toast("Kayıt çok kısa", "bad"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const secs = Math.max(dur, 1);
      addMessage({ type: "audio", audio: reader.result, dur: secs });
      Sound.play("point");
      Haptic.tap(20);
      notifyOthers();
      sendToPeer({ type: "audio", audio: reader.result, dur: secs });
    };
    reader.readAsDataURL(blob);
  }

  /* ------------------------------ Ayarlar --------------------------------- */
  function openSettings() {
    const existing = document.querySelector(".chat-settings");
    if (existing) { existing.remove(); return; }

    const card = el("div", { class: "chat-settings" });
    card.appendChild(el("h4", { text: "⚙️ Sohbet Ayarları" }));

    const nameIn = el("input", { type: "text", placeholder: "Görünen adın", value: store.get("chat_name", "Ben"), "aria-label": "Ad" });
    nameIn.addEventListener("change", () => {
      store.set("chat_name", nameIn.value.trim() || "Ben");
      window.App.toast("Ad kaydedildi");
      render();
    });
    card.appendChild(el("label", { class: "chat-label", text: "Adın" }));
    card.appendChild(nameIn);

    card.appendChild(el("h4", { class: "mt", text: "🌐 Aynı Ağda Cihaz Bağla" }));
    card.appendChild(el("p", {
      class: "chat-hint",
      text: "Aynı Wi-Fi'daki iki cihaz arasında gerçek mesajlaşma. Sunucu gerekmez: bir cihaz davet kodu üretir, diğeri yanıtlar."
    }));

    const offerOut = el("textarea", { class: "chat-code", placeholder: "Davet kodu burada oluşacak…", readonly: "" });
    const offerIn = el("textarea", { class: "chat-code", placeholder: "Davet kodunu buraya yapıştır…" });
    const answerOut = el("textarea", { class: "chat-code", placeholder: "Yanıt kodu burada oluşacak…", readonly: "" });
    const answerIn = el("textarea", { class: "chat-code", placeholder: "Yanıt kodunu buraya yapıştır…" });

    card.appendChild(el("label", { class: "chat-label", text: "A. Cihaz 1 — davet oluştur" }));
    card.appendChild(el("div", { class: "chat-split" }, [
      el("button", { class: "btn sm", type: "button", text: "1) Davet Oluştur", on: { click: createOffer } }),
      el("button", { class: "btn sm sec", type: "button", text: "📋 Kopyala", on: { click: () => copy(offerOut.value) } })
    ]));
    card.appendChild(offerOut);

    card.appendChild(el("label", { class: "chat-label", text: "B. Cihaz 2 — daveti yapıştır" }));
    card.appendChild(offerIn);
    card.appendChild(el("div", { class: "chat-split" }, [
      el("button", { class: "btn sm", type: "button", text: "2) Daveti Kabul Et", on: { click: acceptOffer } }),
      el("button", { class: "btn sm sec", type: "button", text: "📋 Yanıtı Kopyala", on: { click: () => copy(answerOut.value) } })
    ]));
    card.appendChild(answerOut);

    card.appendChild(el("label", { class: "chat-label", text: "C. Cihaz 1 — yanıtı yapıştır" }));
    card.appendChild(answerIn);
    card.appendChild(el("button", { class: "btn sm block", type: "button", text: "3) Bağlan", on: { click: applyAnswer } }));

    card.appendChild(el("button", {
      class: "btn sm sec block", type: "button", text: "🗑️ Bu kanalın mesajlarını sil",
      on: {
        click() {
          store.del(msgKey());
          loadMessages();
          render();
          window.App.toast("Mesajlar silindi");
        }
      }
    }));

    const page = document.querySelector(".chat-page");
    if (page) page.insertBefore(card, page.querySelector(".chat-list"));

    function copy(text) {
      if (!text) { window.App.toast("Önce kod oluştur"); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => window.App.toast("Kopyalandı", "good")).catch(() => {});
      } else {
        window.App.toast("Panoya kopyalanamadı");
      }
    }

    /* -------- WebRTC -------- */
    const RTC_CFG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

    function newPeer() {
      if (state.pc) { try { state.pc.close(); } catch (e) {} }
      const pc = new window.RTCPeerConnection(RTC_CFG);
      state.pc = pc;
      pc.ondatachannel = (ev) => bindChannel(ev.channel);
      pc.onconnectionstatechange = () => {
        state.peerConnected = pc.connectionState === "connected";
        const st = document.getElementById("chat-status");
        if (st) updateStatus(st);
      };
      return pc;
    }

    function bindChannel(dc) {
      state.dc = dc;
      dc.onopen = () => {
        state.peerConnected = true;
        const st = document.getElementById("chat-status");
        if (st) updateStatus(st);
        window.App.toast("🌐 Cihaz bağlandı! Mesajlar anında gidiyor.", "good");
        Sound.play("win");
      };
      dc.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          state.messages.push(Object.assign({
            id: Date.now() + "-r",
            time: Date.now(),
            from: "Arkadaş"
          }, data));
          saveMessages();
          renderMessages();
          Sound.play("pop");
          Haptic.tap(8);
        } catch (e) {}
      };
      dc.onclose = () => {
        state.peerConnected = false;
        const st = document.getElementById("chat-status");
        if (st) updateStatus(st);
      };
    }

    function waitIce(pc) {
      return new Promise((resolve) => {
        if (pc.iceGatheringState === "complete") return resolve();
        let done = false;
        const finish = () => { if (done) return; done = true; resolve(); };
        pc.addEventListener("icegatheringstatechange", () => {
          if (pc.iceGatheringState === "complete") finish();
        });
        setTimeout(finish, 3000);
      });
    }

    function createOffer() {
      if (typeof window.RTCPeerConnection === "undefined") {
        window.App.toast("Bu tarayıcı WebRTC desteklemiyor", "bad");
        return;
      }
      const pc = newPeer();
      bindChannel(pc.createDataChannel("chat"));
      pc.createOffer()
        .then((o) => pc.setLocalDescription(o))
        .then(() => waitIce(pc))
        .then(() => {
          offerOut.value = window.btoa(JSON.stringify(pc.localDescription));
          window.App.toast("Davet oluştu — kopyalayıp arkadaşına gönder");
        })
        .catch(() => window.App.toast("Davet oluşturulamadı", "bad"));
    }

    function acceptOffer() {
      if (typeof window.RTCPeerConnection === "undefined") return;
      const raw = (offerIn.value || "").trim();
      if (!raw) { window.App.toast("Önce davet kodunu yapıştır"); return; }
      let desc;
      try { desc = JSON.parse(window.atob(raw)); }
      catch (e) { window.App.toast("Davet kodu geçersiz", "bad"); return; }
      const pc = newPeer();
      pc.setRemoteDescription(desc)
        .then(() => pc.createAnswer())
        .then((a) => pc.setLocalDescription(a))
        .then(() => waitIce(pc))
        .then(() => {
          answerOut.value = window.btoa(JSON.stringify(pc.localDescription));
          window.App.toast("Yanıt oluştu — cihaz 1'e gönder");
        })
        .catch(() => window.App.toast("Davet kabul edilemedi", "bad"));
    }

    function applyAnswer() {
      if (!state.pc) { window.App.toast("Önce davet oluştur"); return; }
      const raw = (answerIn.value || "").trim();
      if (!raw) { window.App.toast("Yanıt kodunu yapıştır"); return; }
      let desc;
      try { desc = JSON.parse(window.atob(raw)); }
      catch (e) { window.App.toast("Yanıt kodu geçersiz", "bad"); return; }
      state.pc.setRemoteDescription(desc)
        .then(() => window.App.toast("Bağlanıyor…", "good"))
        .catch(() => window.App.toast("Bağlanamadı", "bad"));
    }
  }

  function sendToPeer(data) {
    if (state.dc && state.dc.readyState === "open") {
      try { state.dc.send(JSON.stringify(data)); } catch (e) {}
    }
  }

  function updateStatus(node) {
    if (!node) return;
    node.innerHTML = "";
    node.appendChild(el("span", { class: "chat-dot local" }));
    node.appendChild(el("span", {
      text: state.peerConnected ? "Cihaz bağlı · canlı" : "Bu cihazda · sekmeler arası senkron"
    }));
    if (state.peerConnected) node.appendChild(el("span", { class: "chat-dot peer" }));
  }

  /* -------------------- Sekmeler arası canlı senkron --------------------- */
  let bc = null;
  try {
    if (typeof window.BroadcastChannel !== "undefined") {
      bc = new window.BroadcastChannel("oyundurak-chat");
      bc.onmessage = (ev) => {
        if (!ev.data) return;
        loadMessages();
        renderMessages();
      };
    }
  } catch (e) {}

  function notifyOthers() {
    if (!bc) return;
    try { bc.postMessage({ channel: state.channel, at: Date.now() }); } catch (e) {}
  }

  window.addEventListener("storage", (ev) => {
    if (ev.key && ev.key.indexOf("oydpro:chat_" + state.channel) === 0) {
      loadMessages();
      renderMessages();
    }
  });

  /* ------------------------------- Dışa aç -------------------------------- */
  window.ChatUI = { render, state };

  if (window.GAMES) {
    window.GAMES.push({
      id: "chatroom", title: "Sohbet Odası", emoji: "💬", cat: "classic", new: true,
      desc: "Mesajlaş ve sesli mesaj gönder.",
      hint: "Mesaj yaz · 🎤 bas-konuş",
      mount(host, root) {
        root.appendChild(el("div", { class: "center", style: { padding: "20px 10px", width: "100%" } }, [
          el("p", { text: "Arkadaşlarınla mesajlaş, sesli mesaj gönder." }),
          el("div", { class: "mt" }, el("button", {
            class: "btn", type: "button", text: "💬 Sohbeti Aç",
            on: { click: () => { if (window.ChatUI) window.ChatUI.render(); } }
          }))
        ]));
        return { stop() {} };
      }
    });
  }
})();
