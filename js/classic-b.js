/* ==========================================================================
   CLASSIC B & MISC — Solitaire, Kule, Balıkçı, Refleks,
                         Hafıza Ekranı, Ateş & Buz, Piyano, Emoji Ezberi
   ========================================================================== */
(function () {
  "use strict";
  const E = window.Engine;
  const { el, rnd, rand, clamp, pick, shuffle, hud, overlay, Sound, Haptic, store, boardWrap, touchControls, hidpi } = E;
  const GAMES = window.GAMES;

  /* ====================================================================
     SOLITAIRE (mobil dikey, dokun-dokun kart yerleştirme)
     ==================================================================== */
  GAMES.push({
    id: "solitaire", title: "Solitaire", emoji: "🂡", cat: "classic",
    desc: "Kartları renk sırasıyla diz, temelleri tamamla.",
    hint: "Karta dokun, sonra hedefe",
    mount(host, root) {
      const SUITS = ["♠", "♥", "♦", "♣"];
      const RED = { "♥": 1, "♦": 1 };
      const RANK = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

      const h = hud([{ label: "Hamle", tone: "accent" }, { label: "Temel" }, { label: "Süre" }]);
      root.appendChild(h.root);

      const topRow = el("div", { class: "sol-top" });
      const tableau = el("div", { class: "sol-tableau" });
      root.appendChild(topRow);
      root.appendChild(tableau);

      let stock, waste, foundations, columns, moves, sel, t0, timerId, won;

      function makeDeck() {
        const d = [];
        SUITS.forEach((s) => {
          for (let r = 1; r <= 13; r++) d.push({ s, r, up: false });
        });
        return shuffle(d);
      }

      function newGame() {
        clearInterval(timerId);
        const deck = makeDeck();
        columns = [];
        for (let i = 0; i < 7; i++) {
          const col = [];
          for (let k = 0; k <= i; k++) {
            const c = deck.pop();
            c.up = k === i;
            col.push(c);
          }
          columns.push(col);
        }
        stock = deck;
        waste = [];
        foundations = [[], [], [], []];
        moves = 0;
        sel = null;
        won = false;
        h.set(0, 0);
        h.set(1, "0/52");
        t0 = Date.now();
        timerId = setInterval(function () {
          const s = Math.floor((Date.now() - t0) / 1000);
          h.set(2, Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"));
        }, 1000);
        render();
      }

      function cardEl(card, faceDown) {
        const red = !!RED[card.s];
        const b = el("button", {
          type: "button",
          class: "sol-card" +
            (faceDown ? " down" : "") +
            (red ? " red" : "") +
            (sel === card ? " sel" : "")
        });
        if (!faceDown) {
          b.appendChild(el("span", { class: "sol-rank", text: RANK[card.r] }));
          b.appendChild(el("span", { class: "sol-suit", text: card.s }));
        }
        return b;
      }

      function render() {
        topRow.innerHTML = "";

        const stockEl = el("button", {
          type: "button",
          class: "sol-card stock" + (stock.length ? " down" : " empty"),
          text: stock.length ? "🂠" : "↻",
          "aria-label": "Deste"
        });
        stockEl.addEventListener("click", drawStock);
        topRow.appendChild(stockEl);

        const wasteCard = waste[waste.length - 1];
        if (wasteCard) {
          const w = cardEl(wasteCard, false);
          w.addEventListener("click", () => { sel = wasteCard; Sound.play("tap"); render(); });
          topRow.appendChild(w);
        } else {
          topRow.appendChild(el("div", { class: "sol-card empty" }));
        }

        topRow.appendChild(el("div", { class: "sol-gap" }));

        foundations.forEach((f, i) => {
          const top = f[f.length - 1];
          let fEl;
          if (top) {
            fEl = cardEl(top, false);
          } else {
            fEl = el("div", { class: "sol-card empty", text: "A" });
          }
          fEl.addEventListener("click", () => dropOnFoundation(i));
          topRow.appendChild(fEl);
        });

        tableau.innerHTML = "";
        columns.forEach((col, ci) => {
          const colEl = el("div", { class: "sol-col" });
          colEl.addEventListener("click", (e) => {
            if (e.target === colEl) dropOnColumn(ci);
          });
          if (!col.length) {
            const emptySlot = el("button", { type: "button", class: "sol-card empty slot" });
            emptySlot.addEventListener("click", () => dropOnColumn(ci));
            colEl.appendChild(emptySlot);
          }
          col.forEach((card, idx) => {
            const c = cardEl(card, !card.up);
            c.style.top = (idx * (card.up ? 24 : 13)) + "px";
            c.style.zIndex = String(idx + 1);
            c.addEventListener("click", (e) => {
              e.stopPropagation();
              if (!card.up) {
                if (idx === col.length - 1) {
                  card.up = true;
                  Sound.play("tap");
                  render();
                }
                return;
              }
              sel = card;
              Sound.play("tap");
              Haptic.tap(4);
              render();
            });
            colEl.appendChild(c);
          });
          const height = col.reduce((a, card, idx) => a + (card.up ? 24 : 13), 0);
          colEl.style.height = Math.max(96, height + 74) + "px";
          tableau.appendChild(colEl);
        });
      }

      function drawStock() {
        if (won) return;
        if (!stock.length) {
          if (!waste.length) return;
          stock = waste.reverse().map((c) => {
            const copy = { s: c.s, r: c.r, up: false };
            return copy;
          });
          waste = [];
        } else {
          const c = stock.pop();
          c.up = true;
          waste.push(c);
        }
        moves++;
        h.set(0, moves);
        Sound.play("tap");
        render();
      }

      function findCol(card) {
        for (let i = 0; i < 7; i++) {
          const idx = columns[i].indexOf(card);
          if (idx >= 0) return { col: i, idx };
        }
        return null;
      }

      function dropOnFoundation(fi) {
        if (!sel || !sel.up || won) return;
        const f = foundations[fi];
        const expected = f.length === 0 ? 1 : f[f.length - 1].r + 1;
        if (sel.r !== expected) { Sound.play("bad"); sel = null; render(); return; }
        if (f.length && f[f.length - 1].s !== sel.s) { Sound.play("bad"); sel = null; render(); return; }

        const loc = findCol(sel);
        if (loc) {
          if (loc.idx !== columns[loc.col].length - 1) { Sound.play("bad"); sel = null; render(); return; }
          columns[loc.col].pop();
          if (columns[loc.col].length) columns[loc.col][columns[loc.col].length - 1].up = true;
        } else {
          const wIdx = waste.indexOf(sel);
          if (wIdx !== waste.length - 1) { Sound.play("bad"); sel = null; render(); return; }
          waste.pop();
        }
        f.push(sel);
        sel = null;
        moves++;
        h.set(0, moves);
        Sound.play("point");
        Haptic.tap(10);
        render();
        const total = foundations.reduce((a, b) => a + b.length, 0);
        h.set(1, total + "/52");
        if (total === 52) {
          won = true;
          clearInterval(timerId);
          Sound.play("win");
          Haptic.tap(50);
          host.toast("Solitaire'i kazandın! 🎉", "good");
          host.recordMoves(moves);
        }
      }

      function dropOnColumn(ci) {
        if (!sel || !sel.up || won) { sel = null; render(); return; }
        const loc = findCol(sel);
        if (loc && loc.col === ci) { sel = null; render(); return; }

        const dest = columns[ci];
        const topDest = dest[dest.length - 1];
        const red = !!RED[sel.s];
        if (topDest) {
          const destRed = !!RED[topDest.s];
          if (!(topDest.up && topDest.r === sel.r + 1 && red !== destRed)) {
            Sound.play("bad");
            sel = null;
            render();
            return;
          }
        } else if (sel.r !== 13) {
          Sound.play("bad");
          sel = null;
          render();
          return;
        }

        if (loc) {
          const moving = columns[loc.col].splice(loc.idx);
          moving.forEach((c) => dest.push(c));
          if (columns[loc.col].length) columns[loc.col][columns[loc.col].length - 1].up = true;
        } else {
          const wIdx = waste.indexOf(sel);
          if (wIdx !== waste.length - 1) { Sound.play("bad"); sel = null; render(); return; }
          waste.pop();
          dest.push(sel);
        }
        sel = null;
        moves++;
        h.set(0, moves);
        Sound.play("point");
        Haptic.tap(10);
        render();
      }

      root.appendChild(el("div", { class: "hud-actions" }, el("button", {
        type: "button", class: "btn sm sec", text: "🔄 Yeni Oyun", on: { click: newGame }
      })));

      newGame();
      return { stop() { clearInterval(timerId); } };
    }
  });

  /* ====================================================================
     KULE İNŞA
     ==================================================================== */
  GAMES.push({
    id: "tower", title: "Kule İnşa", emoji: "🏗️", cat: "arcade",
    desc: "Bloğu doğru anda bırak, kuleyi yükselt.",
    hint: "Dokun / Boşluk",
    mount(host, root) {
      const W = 340, H = 520;
      const canvas = E.makeCanvas(W, H, { maxWidth: "400px" });
      const ctx = hidpi(canvas, W, H);
      const wrap = boardWrap(canvas);
      const h = hud([{ label: "Yükseklik", tone: "accent" }, { label: "Rekor" }]);
      root.appendChild(h.root);
      root.appendChild(wrap);

      const HGT = 26, BLOCKS = [];
      let blocks, moving, dir, running, raf, last, score, camY, speed;

      function reset() {
        blocks = [{ x: 90, w: 160 }];
        score = 0;
        camY = 0;
        speed = 2.6;
        spawnMoving();
        h.set(0, 0);
        h.set(1, host.best || 0);
      }

      function spawnMoving() {
        const top = blocks[blocks.length - 1];
        moving = { x: rand(0, Math.max(0, W - top.w)), w: top.w };
        dir = Math.random() < 0.5 ? 1 : -1;
      }

      function update(dt) {
        if (!moving) return;
        moving.x += dir * speed * dt;
        if (moving.x <= 0) { moving.x = 0; dir = 1; }
        if (moving.x + moving.w >= W) { moving.x = W - moving.w; dir = -1; }
        speed = Math.min(2.6 + score * 0.12, 8);
        const targetY = -(blocks.length - 6) * HGT;
        camY += (targetY - camY) * 0.1 * dt;
      }

      function drop() {
        if (!running || !moving) return;
        const top = blocks[blocks.length - 1];
        const left = Math.max(moving.x, top.x);
        const right = Math.min(moving.x + moving.w, top.x + top.w);
        const overlap = right - left;
        if (overlap <= 2) return over();

        const perfect = Math.abs(moving.x - top.x) < 6;
        if (perfect) {
          blocks.push({ x: top.x, w: top.w });
          Sound.play("win");
          Haptic.tap(15);
          host.toast("Mükemmel! 🎯");
        } else {
          blocks.push({ x: left, w: overlap });
          Sound.play("tap");
          Haptic.tap(8);
        }
        score = blocks.length - 1;
        h.set(0, score);
        spawnMoving();
      }

      function draw() {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#1a1040");
        g.addColorStop(1, "#070a12");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.translate(0, camY);

        blocks.forEach((b, i) => {
          const y = H - 60 - i * HGT;
          const hue = (i * 28) % 360;
          ctx.fillStyle = "hsl(" + hue + ", 70%, 58%)";
          ctx.beginPath();
          ctx.roundRect(b.x, y, b.w, HGT - 2, 5);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,.22)";
          ctx.fillRect(b.x + 4, y + 4, b.w - 8, 4);
        });

        if (moving) {
          const y = H - 60 - blocks.length * HGT;
          ctx.fillStyle = "#22d3ee";
          ctx.shadowColor = "#22d3ee";
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.roundRect(moving.x, y, moving.w, HGT - 2, 5);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        ctx.restore();

        ctx.fillStyle = "rgba(255,255,255,.9)";
        ctx.font = "800 20px Segoe UI, sans-serif";
        ctx.fillText(String(score), 14, 32);
      }

      function loop(ts) {
        if (!running) return;
        if (!last) last = ts;
        const dt = clamp((ts - last) / 16.67, 0.3, 2.4);
        last = ts;
        update(dt);
        draw();
        if (running) raf = requestAnimationFrame(loop);
      }

      function start() {
        E.removeOverlay(wrap);
        reset();
        running = true;
        last = 0;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }

      function over() {
        running = false;
        cancelAnimationFrame(raf);
        Sound.play("die");
        Haptic.tap(40);
        const isBest = host.record(score);
        h.set(1, host.best || 0);
        wrap.appendChild(overlay({
          title: "Kule yıkıldı!",
          big: score,
          msg: isBest ? "🏆 Yeni rekor!" : "Daha yükseğe çıkabilirsin!",
          buttons: [{ label: "Tekrar Oyna", onClick: start }]
        }));
      }

      canvas.addEventListener("mousedown", drop);
      canvas.addEventListener("touchstart", (e) => { e.preventDefault(); drop(); }, { passive: false });
      const stopKeys = E.onKey((e) => {
        if (e.code === "Space" || e.key === "ArrowDown") { e.preventDefault(); drop(); }
      });

      reset();
      draw();
      wrap.appendChild(overlay({
        title: "🏗️ Kule İnşa",
        msg: "Hareketli bloğu doğru anda bırak. Tam üst üste = mükemmel!",
        buttons: [{ label: "Başla", onClick: start }]
      }));
      return { stop() { running = false; cancelAnimationFrame(raf); stopKeys(); } };
    }
  });

  /* ====================================================================
     BALIKÇI
     ==================================================================== */
  GAMES.push({
    id: "fishing", title: "Balıkçı", emoji: "🎣", cat: "arcade",
    desc: "Doğru anda oltayı at, balığı yakala.",
    hint: "Dokun / Boşluk",
    mount(host, root) {
      const W = 380, H = 480;
      const canvas = E.makeCanvas(W, H, { maxWidth: "440px" });
      const ctx = hidpi(canvas, W, H);
      const wrap = boardWrap(canvas);
      const h = hud([{ label: "Balık", tone: "accent" }, { label: "Can" }, { label: "Rekor" }]);
      root.appendChild(h.root);
      root.appendChild(wrap);

      let fish, line, score, lives, running, raf, last, msg, msgT, difficulty;

      function reset() {
        fish = [];
        line = null;
        score = 0;
        lives = 3;
        difficulty = 1;
        msg = "";
        msgT = 0;
        h.set(0, 0);
        h.set(1, "❤️❤️❤️");
        h.set(2, host.best || 0);
        spawnFish();
      }

      function spawnFish() {
        fish = [];
        const n = 3 + Math.floor(difficulty / 2);
        for (let i = 0; i < n; i++) {
          fish.push({
            x: rand(40, W - 40),
            y: rand(180, H - 80),
            r: rand(12, 22),
            dir: Math.random() < 0.5 ? 1 : -1,
            speed: rand(0.5, 1.4) + difficulty * 0.12,
            col: pick(["#fbbf24", "#fb7185", "#34d399", "#22d3ee", "#c084fc"]),
            wob: rand(0, 6.28)
          });
        }
      }

      function update(dt) {
        fish.forEach((f) => {
          f.x += f.dir * f.speed * dt;
          f.wob += 0.05 * dt;
          f.y += Math.sin(f.wob) * 0.5 * dt;
          if (f.x < f.r) { f.x = f.r; f.dir = 1; }
          if (f.x > W - f.r) { f.x = W - f.r; f.dir = -1; }
          f.y = clamp(f.y, 160, H - 60);
        });

        if (line) {
          line.t += dt;
          if (line.phase === "down") {
            line.y += 9 * dt;
            for (const f of fish) {
              const dx = f.x - line.x, dy = f.y - line.y;
              if (Math.sqrt(dx * dx + dy * dy) < f.r + 12) {
                score++;
                h.set(0, score);
                Sound.play("coin");
                Haptic.tap(10);
                msg = "Yakaladın! 🐟";
                msgT = 1;
                difficulty = 1 + score / 4;
                line = null;
                spawnFish();
                return;
              }
            }
            if (line.y > H - 70) {
              line.y = H - 70;
              line.phase = "up";
            }
          } else {
            line.y -= 12 * dt;
            if (line.y < 70) {
              line = null;
              lives--;
              h.set(1, lives > 0 ? "❤️".repeat(lives) : "💀");
              Sound.play("miss");
              Haptic.tap(20);
              msg = "Kaçtı! 😢";
              msgT = 1;
              if (lives <= 0) return gameOver();
            }
          }
        }
        if (msgT > 0) msgT -= 0.01 * dt;
      }

      function draw() {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#0b2540");
        g.addColorStop(0.35, "#0e3a5c");
        g.addColorStop(1, "#061625");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "rgba(34,211,238,.12)";
        for (let x = 0; x < W; x += 24) {
          const off = Math.sin(x / 40 + Date.now() / 900) * 3;
          ctx.fillRect(x, 150 + off, 16, 3);
        }
        ctx.strokeStyle = "rgba(34,211,238,.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 150);
        ctx.lineTo(W, 150);
        ctx.stroke();

        fish.forEach((f) => {
          ctx.save();
          ctx.translate(f.x, f.y);
          ctx.scale(f.dir, 1);
          ctx.fillStyle = f.col;
          ctx.shadowColor = f.col;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.ellipse(0, 0, f.r, f.r * 0.62, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(-f.r + 2, 0);
          ctx.lineTo(-f.r - 10, -f.r * 0.5);
          ctx.lineTo(-f.r - 10, f.r * 0.5);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#06121b";
          ctx.beginPath();
          ctx.arc(f.r * 0.45, -f.r * 0.15, 2.5, 0, 7);
          ctx.fill();
          ctx.restore();
        });

        // tekne
        ctx.fillStyle = "#8b5e3c";
        ctx.beginPath();
        ctx.moveTo(W / 2 - 42, 60);
        ctx.lineTo(W / 2 + 42, 60);
        ctx.lineTo(W / 2 + 28, 92);
        ctx.lineTo(W / 2 - 28, 92);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#a9754d";
        ctx.fillRect(W / 2 - 44, 54, 88, 10);

        // olta
        const bx = W / 2 + 34, by = 62;
        const tipX = line ? line.x : bx;
        const tipY = line ? line.y : 150;
        ctx.strokeStyle = "rgba(226,232,240,.7)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        if (line) {
          ctx.fillStyle = "#fb7185";
          ctx.beginPath();
          ctx.arc(tipX, tipY, 6, 0, Math.PI * 2);
          ctx.fill();
        }

        if (msgT > 0) {
          ctx.globalAlpha = Math.min(msgT, 1);
          ctx.fillStyle = "#fff";
          ctx.font = "800 20px Segoe UI, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(msg, W / 2, 34);
          ctx.textAlign = "left";
          ctx.globalAlpha = 1;
        }
        ctx.font = "16px Segoe UI, sans-serif";
        ctx.fillText("🐟 " + score, 14, 24);
      }

      function loop(ts) {
        if (!running) return;
        if (!last) last = ts;
        const dt = clamp((ts - last) / 16.67, 0.3, 2.4);
        last = ts;
        update(dt);
        draw();
        if (running) raf = requestAnimationFrame(loop);
      }

      function cast() {
        if (!running || line || msgT > 0) return;
        line = { x: W / 2 + 34 + rand(-30, 30), y: 150, t: 0, phase: "down" };
        Sound.play("splash");
      }

      canvas.addEventListener("mousedown", cast);
      canvas.addEventListener("touchstart", (e) => { e.preventDefault(); cast(); }, { passive: false });
      const stopKeys = E.onKey((e) => {
        if (e.code === "Space") { e.preventDefault(); cast(); }
      });

      function start() {
        E.removeOverlay(wrap);
        reset();
        running = true;
        last = 0;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }

      function gameOver() {
        running = false;
        cancelAnimationFrame(raf);
        Sound.play("die");
        Haptic.tap(40);
        const isBest = host.record(score);
        h.set(2, host.best || 0);
        wrap.appendChild(overlay({
          title: "Balıklar kaçtı!",
          big: score,
          msg: isBest ? "🏆 Yeni rekor!" : "Tekrar dene!",
          buttons: [{ label: "Tekrar Oyna", onClick: start }]
        }));
      }

      reset();
      draw();
      wrap.appendChild(overlay({
        title: "🎣 Balıkçı",
        msg: "Oltayı suya at, olta balığa denk gelsin. 3 kaçırma hakkın var.",
        buttons: [{ label: "Başla", onClick: start }]
      }));
      return { stop() { running = false; cancelAnimationFrame(raf); stopKeys(); } };
    }
  });

  /* ====================================================================
     REFLEKS TESTİ
     ==================================================================== */
  GAMES.push({
    id: "reaction", title: "Refleks Testi", emoji: "⚡", cat: "arcade",
    desc: "Yeşil yanınca en hızlı sen dokun.",
    hint: "Dokun / Boşluk",
    mount(host, root) {
      const h = hud([{ label: "Son", tone: "accent" }, { label: "Rekor" }, { label: "Ortalama" }]);
      root.appendChild(h.root);
      const area = el("div", { class: "react-area" });
      root.appendChild(area);

      let phase = "idle", goAt = 0, timer = null, times = [];
      const bestEver = store.get("reactionBest", 0);
      h.set(1, bestEver ? bestEver + " ms" : "—");

      function render(title, sub, cls) {
        area.className = "react-area" + (cls ? " " + cls : "");
        area.innerHTML = "";
        area.appendChild(el("h3", { text: title }));
        if (sub) area.appendChild(el("p", { text: sub }));
      }

      function arm() {
        phase = "wait";
        render("Bekle...", "Yeşil yanınca hemen dokun!", "wait");
        clearTimeout(timer);
        timer = setTimeout(function () {
          phase = "go";
          goAt = performance.now ? performance.now() : Date.now();
          render("DOKUN!", "", "go");
          Sound.tone(880, 0.1, "sine", 0.09);
          Haptic.tap(12);
        }, rand(1200, 4000));
      }

      function click() {
        const now = performance.now ? performance.now() : Date.now();
        if (phase === "idle" || phase === "done" || phase === "early") { arm(); return; }
        if (phase === "wait") {
          phase = "early";
          clearTimeout(timer);
          render("Çok erken! ⏱️", "Yeşili bekle. Tekrar dokun.", "early");
          Sound.play("miss");
          return;
        }
        if (phase === "go") {
          const ms = Math.round(now - goAt);
          phase = "done";
          times.push(ms);
          h.set(0, ms + " ms");
          const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
          h.set(2, avg + " ms");
          let msg = ms < 180 ? "İnanılmaz! 🚀" : ms < 230 ? "Çok hızlı! ⚡" : ms < 300 ? "İyi! 👍" : "Biraz daha hızlı olabilir 🙂";
          const prev = store.get("reactionBest", 0);
          if (!prev || ms < prev) {
            store.set("reactionBest", ms);
            h.set(1, ms + " ms");
            msg += " — 🏆 Yeni rekor!";
            Sound.play("win");
            host.record(ms);
          } else {
            Sound.play("point");
          }
          render(ms + " ms", msg + " Tekrar için dokun.", "go");
        }
      }

      area.addEventListener("click", click);
      const stopKeys = E.onKey((e) => {
        if (e.code === "Space") { e.preventDefault(); click(); }
      });

      render("Hazır mısın?", "Başlamak için dokun.");
      return { stop() { clearTimeout(timer); stopKeys(); } };
    }
  });

  /* ====================================================================
     HAFIZA EKRANI (yeni)
     ==================================================================== */
  GAMES.push({
    id: "simonlite", title: "Hafıza Ekranı", emoji: "👁️", cat: "puzzle", new: true,
    desc: "Ekranda kısa süre beliren deseni hatırla.",
    hint: "Deseni izle, sonra dokun",
    mount(host, root) {
      const h = hud([{ label: "Tur", tone: "accent" }, { label: "Durum" }, { label: "Rekor" }]);
      root.appendChild(h.root);
      const boardWrapEl = el("div", { class: "board-wrap" });
      const grid = el("div", { class: "mem-grid flashgrid" });
      boardWrapEl.appendChild(grid);
      root.appendChild(boardWrapEl);

      let round = 0, target = [], cells = [], token = 0, phase = "idle";
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      function buildGrid(n) {
        grid.style.setProperty("--cols", n);
        grid.innerHTML = "";
        cells = [];
        for (let i = 0; i < n * n; i++) {
          const b = el("button", { type: "button", class: "flashcell" });
          b.addEventListener("click", () => tap(i));
          grid.appendChild(b);
          cells.push(b);
        }
      }

      async function nextRound() {
        const my = ++token;
        round++;
        h.set(0, round);
        const n = Math.min(3 + Math.floor(round / 3), 5);
        buildGrid(n);

        const count = Math.min(n * n, 3 + round);
        target = shuffle(Array.from({ length: n * n }, (_, i) => i)).slice(0, count);

        phase = "show";
        h.set(1, "İzle");
        for (const idx of target) {
          if (my !== token) return;
          cells[idx].classList.add("lit");
          Sound.tone(500 + idx * 20, 0.12, "sine", 0.07);
          await sleep(430);
          cells[idx].classList.remove("lit");
          await sleep(80);
        }
        if (my !== token) return;
        phase = "input";
        h.set(1, "Dokun");
      }

      function tap(i) {
        if (phase !== "input") return;
        if (target.indexOf(i) < 0) {
          Sound.play("bad");
          Haptic.tap(30);
          cells[i].classList.add("wrong");
          return fail();
        }
        cells[i].classList.add("found");
        cells[i].disabled = true;
        Sound.play("tap");
        const found = cells.filter((c) => c.classList.contains("found")).length;
        if (found === target.length) {
          phase = "ok";
          host.record(round);
          h.set(2, host.best || 0);
          Sound.play("point");
          setTimeout(() => { if (phase === "ok") nextRound(); }, 650);
        }
      }

      function fail() {
        token++;
        phase = "fail";
        boardWrapEl.style.position = "relative";
        boardWrapEl.appendChild(overlay({
          title: "Yanlış desen!",
          big: round,
          msg: `Tur ${round} — tekrar dene!`,
          buttons: [{ label: "Tekrar", onClick: start }]
        }));
      }

      function start() {
        E.removeOverlay(boardWrapEl);
        round = 0;
        token++;
        nextRound();
      }

      h.set(2, host.best || 0);
      start();
      return { stop() { token++; } };
    }
  });

  /* ====================================================================
     ATEŞ & BUZ (yeni - reflex)
     ==================================================================== */
  GAMES.push({
    id: "reflex", title: "Ateş & Buz", emoji: "🔥", cat: "arcade", new: true,
    desc: "Mavi olanlara bas, kırmızılardan kaç. Hızlanır!",
    hint: "Dokun",
    mount(host, root) {
      const h = hud([{ label: "Skor", tone: "accent" }, { label: "Can" }, { label: "Rekor" }]);
      root.appendChild(h.root);
      const wrap = el("div", { class: "board-wrap" });
      const canvas = E.makeCanvas(360, 480);
      const ctx = hidpi(canvas, 360, 480);
      wrap.appendChild(canvas);
      root.appendChild(wrap);

      const W = 360, H = 480;
      let items, score, lives, running, raf, last, spawnCd, speed;

      function reset() {
        items = [];
        score = 0;
        lives = 5;
        spawnCd = 0;
        speed = 1;
        last = 0;
        h.set(0, 0);
        h.set(1, "❤️❤️❤️❤️❤️");
        h.set(2, host.best || 0);
      }

      function spawn() {
        const r = rand(22, 30);
        const isGood = Math.random() < 0.68;
        items.push({
          x: rand(r + 8, W - r - 8),
          y: H + r,
          r,
          vx: rand(-1.2, 1.2),
          vy: -(rand(1.4, 2.4) * speed),
          good: isGood,
          life: 1
        });
      }

      function update(dt) {
        spawnCd += dt;
        if (spawnCd > Math.max(30 - score * 0.25, 10)) { spawnCd = 0; spawn(); }
        speed = 1 + score * 0.012;

        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          it.y += it.vy * dt;
          it.x += it.vx * dt;
          if (it.x < it.r || it.x > W - it.r) it.vx *= -1;
          if (it.y < -60) {
            if (it.good) {
              lives--;
              h.set(1, lives > 0 ? "❤️".repeat(lives) : "💀");
              Sound.play("miss");
              if (lives <= 0) return gameOver();
            }
            items.splice(i, 1);
          }
        }
      }

      function draw() {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#1c0f2e");
        g.addColorStop(1, "#0a0612");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        items.forEach((it) => {
          const col = it.good ? "#22d3ee" : "#fb7185";
          ctx.fillStyle = col;
          ctx.shadowColor = col;
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#04070f";
          ctx.font = "700 " + (it.r * 1.1) + "px Segoe UI, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(it.good ? "❄" : "🔥", it.x, it.y + 1);
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
        });
      }

      function loop(ts) {
        if (!running) return;
        if (!last) last = ts;
        const dt = clamp((ts - last) / 16.67, 0.3, 2.4);
        last = ts;
        update(dt);
        draw();
        if (running) raf = requestAnimationFrame(loop);
      }

      function tap(e) {
        if (!running) return;
        const p = E.pointerPos(canvas, e);
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          const dx = p.x - it.x, dy = p.y - it.y;
          if (Math.sqrt(dx * dx + dy * dy) <= it.r + 8) {
            items.splice(i, 1);
            if (it.good) {
              score += 10;
              h.set(0, score);
              Sound.play("point");
              Haptic.tap(6);
            } else {
              lives--;
              h.set(1, lives > 0 ? "❤️".repeat(lives) : "💀");
              Sound.play("bad");
              Haptic.tap(30);
              if (lives <= 0) return gameOver();
            }
            return;
          }
        }
      }

      canvas.addEventListener("mousedown", tap);
      canvas.addEventListener("touchstart", (e) => { e.preventDefault(); tap(e); }, { passive: false });

      function start() {
        E.removeOverlay(wrap);
        reset();
        running = true;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }

      function gameOver() {
        running = false;
        cancelAnimationFrame(raf);
        Sound.play("die");
        Haptic.tap(40);
        const isBest = host.record(score);
        h.set(2, host.best || 0);
        wrap.appendChild(overlay({
          title: "Oyun bitti!",
          big: score,
          msg: isBest ? "🏆 Yeni rekor!" : "Tekrar dene!",
          buttons: [{ label: "Tekrar Oyna", onClick: start }]
        }));
      }

      reset();
      draw();
      wrap.appendChild(overlay({
        title: "🔥 Ateş & Buz",
        msg: "Mavi ❄ toplara bas (+10), kırmızı 🔥 toplara DOKUNMA!",
        buttons: [{ label: "Başla", onClick: start }]
      }));
      return { stop() { running = false; cancelAnimationFrame(raf); } };
    }
  });

  /* ====================================================================
     PİYANO (yeni)
     ==================================================================== */
  GAMES.push({
    id: "piano", title: "Piyano", emoji: "🎹", cat: "arcade", new: true,
    desc: "Kayan notaları zamanında çal",
    hint: "Tuşlara dokun",
    mount(host, root) {
      const h = hud([{ label: "Skor", tone: "accent" }, { label: "Kombo" }, { label: "Rekor" }]);
      root.appendChild(h.root);

      const BOARD_ROWS = 4;
      const boardEl = el("div", { class: "piano-board" });
      const lanes = [];
      for (let i = 0; i < BOARD_ROWS; i++) {
        const row = el("div", { class: "piano-row" });
        boardEl.appendChild(row);
        lanes.push(row);
      }
      root.appendChild(boardEl);

      const keysEl = el("div", { class: "piano-keys" });
      const KEYS = [
        { label: "1", freq: 523 }, { label: "2", freq: 587 }, { label: "3", freq: 659 },
        { label: "4", freq: 698 }, { label: "5", freq: 784 }
      ];
      root.appendChild(keysEl);

      let notes, score, combo, running, raf, last, timer, spawnCd, speed, hitZone;
      const LANE_COUNT = 5;

      function reset() {
        notes = [];
        score = 0;
        combo = 0;
        spawnCd = 0;
        speed = 1.9;
        last = 0;
        h.set(0, 0);
        h.set(1, 0);
        h.set(2, host.best || 0);
      }

      function renderKeys() {
        keysEl.innerHTML = "";
        keysEl.style.gridTemplateColumns = "repeat(" + LANE_COUNT + ", 1fr)";
        KEYS.forEach((k, i) => {
          const b = el("button", { type: "button", class: "piano-key", text: k.label });
          b.addEventListener("click", () => hit(i));
          b.addEventListener("touchstart", (e) => { e.preventDefault(); hit(i); }, { passive: false });
          keysEl.appendChild(b);
        });
      }

      function spawn() {
        const lane = rnd(LANE_COUNT);
        notes.push({ lane, y: -10, hit: false });
      }

      function update(dt) {
        spawnCd += dt;
        if (spawnCd > Math.max(22 - speed * 3, 9)) { spawnCd = 0; spawn(); }
        speed = 1.9 + score * 0.01;

        for (let i = notes.length - 1; i >= 0; i--) {
          const n = notes[i];
          n.y += speed * dt;
          if (n.y > 110) {
            notes.splice(i, 1);
            if (!n.hit) {
              combo = 0;
              h.set(1, 0);
              Sound.play("miss");
            }
          }
        }
      }

      function render() {
        lanes.forEach((row) => { row.innerHTML = ""; });
        notes.forEach((n) => {
          if (n.y < -10) return;
          const dot = el("div", {
            class: "piano-note" + (n.hit ? " done" : ""),
            style: { top: n.y + "%" }
          });
          const cell = el("div", { class: "piano-lane" });
          cell.appendChild(dot);
          if (lanes[n.lane]) lanes[n.lane].appendChild(cell);
        });
      }

      function hit(lane) {
        if (!running) return;
        Sound.tone(KEYS[lane].freq, 0.14, "triangle", 0.08);
        // en yakın notayı bul
        let best = -1, bestDist = Infinity;
        notes.forEach((n, i) => {
          if (n.hit || n.lane !== lane) return;
          const dist = Math.abs(n.y - 84);
          if (dist < bestDist) { bestDist = dist; best = i; }
        });
        if (best >= 0 && bestDist < 16) {
          notes[best].hit = true;
          combo++;
          score += 10 + combo;
          h.set(0, score);
          h.set(1, combo);
          Sound.play(combo > 5 ? "combo" : "point");
          Haptic.tap(6);
          setTimeout(() => {
            const idx = notes.indexOf(notes[best]);
          }, 0);
        } else {
          combo = 0;
          h.set(1, 0);
          Sound.play("bad");
        }
      }

      const keys = { "1": 0, "2": 1, "3": 2, "4": 3, "5": 4 };

      function loop(ts) {
        if (!running) return;
        if (!last) last = ts;
        const dt = clamp((ts - last) / 16.67, 0.3, 2.4);
        last = ts;
        update(dt);
        render();
        if (running) raf = requestAnimationFrame(loop);
      }

      function start() {
        reset();
        running = true;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }

      function stop() {
        running = false;
        cancelAnimationFrame(raf);
      }

      renderKeys();
      root.appendChild(el("div", { class: "hud-actions" }, [
        el("button", { type: "button", class: "btn sm sec", text: "▶ Başla", on: { click: start } }),
        el("button", { type: "button", class: "btn sm sec", text: "⏸ Durdur", on: { click: stop } })
      ]));

      reset();
      return { stop };
    }
  });

  /* ====================================================================
     EMOJİ EZBERİ (yeni)
     ==================================================================== */
  GAMES.push({
    id: "emojimatch", title: "Emoji Ezberi", emoji: "😀", cat: "puzzle", new: true,
    desc: "1 saniyeliğine gösterilen emojileri bul.",
    hint: "Ezberle ve dokun",
    mount(host, root) {
      const h = hud([{ label: "Tur", tone: "accent" }, { label: "Durum" }, { label: "Rekor" }]);
      root.appendChild(h.root);
      const wrap = el("div", { class: "board-wrap" });
      const grid = el("div", { class: "mem-grid flashgrid" });
      wrap.appendChild(grid);
      root.appendChild(wrap);

      const POOL = ["🍎","🍌","🍇","🍓","🍑","🍍","🥝","🍒","🥑","🍉","🐶","🐱","🐼","🦊","🐸","🐙","⚽","🏀","🎸","🎨","🚀","🌙","⭐","🔥"];
      let round = 0, target = [], cells = [], token = 0, phase = "idle";

      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      function build(n) {
        grid.style.setProperty("--cols", 4);
        grid.innerHTML = "";
        cells = [];
        for (let i = 0; i < n * n; i++) {
          const b = el("button", { type: "button", class: "flashcell emoji-cell" });
          b.addEventListener("click", () => tap(i));
          grid.appendChild(b);
          cells.push(b);
        }
      }

      async function nextRound() {
        const my = ++token;
        round++;
        h.set(0, round);
        const n = Math.min(3 + Math.floor(round / 3), 4);
        build(n);
        const count = Math.min(n * n, 3 + round);
        const picks = shuffle(Array.from({ length: n * n }, (_, i) => i)).slice(0, count);
        const emojis = shuffle(POOL).slice(0, count);
        target = picks.map((idx, i) => ({ idx, emoji: emojis[i] }));

        phase = "show";
        h.set(1, "İzle");
        target.forEach((t) => {
          cells[t.idx].textContent = t.emoji;
          cells[t.idx].classList.add("lit");
        });
        await sleep(900 + count * 120);
        if (my !== token) return;
        target.forEach((t) => {
          cells[t.idx].textContent = "";
          cells[t.idx].classList.remove("lit");
        });
        await sleep(250);
        if (my !== token) return;
        phase = "input";
        h.set(1, "Hangileriydi?");
      }

      function tap(i) {
        if (phase !== "input") return;
        const t = target.find((x) => x.idx === i);
        if (!t) {
          Sound.play("bad");
          Haptic.tap(30);
          return fail();
        }
        cells[i].textContent = t.emoji;
        cells[i].classList.add("found");
        cells[i].disabled = true;
        Sound.play("tap");
        if (cells.filter((c) => c.classList.contains("found")).length === target.length) {
          phase = "ok";
          host.record(round);
          h.set(2, host.best || 0);
          Sound.play("point");
          setTimeout(() => { if (phase === "ok") nextRound(); }, 650);
        }
      }

      function fail() {
        token++;
        phase = "fail";
        wrap.style.position = "relative";
        wrap.appendChild(overlay({
          title: "Yanlış emoji!",
          big: round,
          msg: `Tur ${round} — tekrar dene!`,
          buttons: [{ label: "Tekrar", onClick: start }]
        }));
      }

      function start() {
        E.removeOverlay(wrap);
        round = 0;
        token++;
        nextRound();
      }

      h.set(2, host.best || 0);
      start();
      return { stop() { token++; } };
    }
  });
})();
