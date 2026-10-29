/* ==========================================================================
   EXTRA — 40+ hedefine ulaşmak için 4 yeni oyun
   Hankey, Kart Eşleştirme Hızı, Sıra Takip, Müzik Ezberi
   ========================================================================== */
(function () {
  "use strict";
  const E = window.Engine;
  const { el, rnd, rand, clamp, pick, shuffle, hud, overlay, Sound, Haptic, store, boardWrap, touchControls, hidpi } = E;
  const GAMES = window.GAMES;

  /* ====================================================================
     HANKEY (Hanoi Kuleleri)
     ==================================================================== */
  GAMES.push({
    id: "hanoi", title: "Hankey Kulesi", emoji: "🗼", cat: "puzzle", new: true,
    desc: "Tüm diskleri son çubuğa taşı. Büyük disk küçüğün üstüne gelemez.",
    hint: "Çubuğa dokun, sonra hedef",
    mount(host, root) {
      const h = hud([{ label: "Hamle", tone: "accent" }, { label: "En İyi", tone: "good" }, { label: "Disk" }]);
      root.appendChild(h.root);

      let diskCount = 3;
      const segRow = el("div", { class: "seg" });
      [3, 4, 5].forEach((n) => {
        const b = el("button", { class: "seg-btn" + (n === diskCount ? " active" : ""), text: n + " disk", "data-n": n });
        b.addEventListener("click", () => {
          diskCount = n;
          segRow.querySelectorAll(".seg-btn").forEach((x) => x.classList.toggle("active", x.dataset.n === String(n)));
          newGame();
        });
        segRow.appendChild(b);
      });
      root.appendChild(segRow);

      const boardEl = el("div", { class: "hanoi" });
      root.appendChild(boardEl);

      let pegs, selected, moves, solved, minMoves;

      function newGame() {
        E.removeOverlay(boardEl);
        pegs = [Array.from({ length: diskCount }, (_, i) => diskCount - i), [], []];
        selected = null;
        moves = 0;
        solved = false;
        minMoves = Math.pow(2, diskCount) - 1;
        h.set(0, 0);
        h.set(2, diskCount);
        const prev = store.get("hanoi" + diskCount, 0);
        h.set(1, prev ? prev + " (min " + minMoves + ")" : "min " + minMoves);
        render();
      }

      function render() {
        boardEl.innerHTML = "";
        pegs.forEach((peg, i) => {
          const col = el("button", {
            type: "button",
            class: "hanoi-peg" + (selected === i ? " sel" : "")
          });
          // çubuk
          col.appendChild(el("div", { class: "hanoi-rod" }));
          // diskler (büyükten küçüğe altta)
          peg.slice().reverse().forEach((disk) => {
            const w = 24 + disk * (100 / diskCount);
            col.appendChild(el("div", {
              class: "hanoi-disk",
              style: { width: w + "%", background: "hsl(" + (disk * 42 + 190) + ", 75%, 60%)" }
            }, String(disk)));
          });
          col.appendChild(el("div", { class: "hanoi-base" }));
          col.addEventListener("click", () => tap(i));
          boardEl.appendChild(col);
        });
      }

      function tap(i) {
        if (solved) return;
        const peg = pegs[i];
        if (selected === null) {
          if (!peg.length) { Sound.play("bad"); return; }
          selected = i;
          Sound.play("tap");
          Haptic.tap(6);
          render();
          return;
        }
        if (selected === i) { selected = null; render(); return; }

        const from = pegs[selected];
        const to = peg;
        const disk = from[from.length - 1];
        const top = to[to.length - 1];
        if (top != null && top < disk) {
          Sound.play("bad");
          Haptic.tap(25);
          host.toast("Büyük disk küçüğün üstüne gelemez!");
          selected = null;
          render();
          return;
        }
        from.pop();
        to.push(disk);
        moves++;
        h.set(0, moves);
        selected = null;
        Sound.play("point");
        Haptic.tap(8);
        render();
        checkWin();
      }

      function checkWin() {
        if (pegs[2].length !== diskCount) return;
        solved = true;
        Sound.play("win");
        Haptic.tap(50);
        const prev = store.get("hanoi" + diskCount, 0);
        const isBest = !prev || moves < prev;
        if (isBest) {
          store.set("hanoi" + diskCount, moves);
          h.set(1, moves + " (min " + minMoves + ")");
          host.recordMoves(moves);
        }
        const perfect = moves === minMoves;
        host.toast(perfect ? "🏆 Mükemmel! Minimum hamle!" : "Çözdün! 🎉", "good");
        boardEl.style.position = "relative";
        boardEl.appendChild(overlay({
          title: perfect ? "Mükemmel Çözüm! 🏆" : "Çözdün! 🎉",
          big: moves + " hamle",
          msg: `Minimum ${minMoves} hamle. ${isBest ? "Yeni rekor!" : ""}`,
          buttons: [{ label: "Yeni Oyun", onClick: newGame }]
        }));
      }

      root.appendChild(el("div", { class: "hud-actions" }, el("button", {
        class: "btn sm sec", text: "🔄 Yeni Oyun", on: { click: newGame }
      })));

      newGame();
      return { stop() {} };
    }
  });

  /* ====================================================================
     KART EŞLEŞTİRME HIZI (speed matching)
     ==================================================================== */
  GAMES.push({
    id: "speedy", title: "Hız Eşleştirme", emoji: "⚡", cat: "arcade", new: true,
    desc: "Aynı emoji çiftlerine hızlıca dokun. Süre 45 saniye!",
    hint: "Dokun",
    mount(host, root) {
      const W = 360, H = 480;
      const canvas = E.makeCanvas(W, H, { maxWidth: "440px" });
      const ctx = hidpi(canvas, W, H);
      const wrap = boardWrap(canvas);
      const h = hud([{ label: "Puan", tone: "accent" }, { label: "Süre" }, { label: "Rekor" }]);
      root.appendChild(h.root);
      root.appendChild(wrap);

      const EMOJIS = ["🍎","🍌","🍇","🍓","🍑","🍍","🥝","🍒","🥑","🍉","🐶","🐱","🐼","🦊","⚽","🏀","🎸","🎨"];
      const DURATION = 45;
      let tiles, score, combo, running, raf, last, startAt, selected, spawnCd;

      function reset() {
        tiles = [];
        score = 0;
        combo = 0;
        selected = null;
        startAt = Date.now();
        last = 0;
        spawnCd = 0;
        h.set(0, 0);
        h.set(1, DURATION + "s");
        h.set(2, host.best || 0);
        for (let i = 0; i < 4; i++) spawnPair();
      }

      function spawnPair() {
        const emoji = pick(EMOJIS);
        const r = 26;
        for (let i = 0; i < 2; i++) {
          let x, y, tries = 0;
          do {
            x = rand(r + 10, W - r - 10);
            y = rand(r + 10, H - r - 10);
            tries++;
          } while (tries < 40 && tiles.some((t) => Math.hypot(t.x - x, t.y - y) < r * 2.6));
          tiles.push({ x, y, r, emoji, pulse: rand(0, 6.28) });
        }
      }

      function update(dt) {
        const left = Math.max(0, DURATION - (Date.now() - startAt) / 1000);
        h.set(1, Math.ceil(left) + "s");
        if (left <= 0) return gameOver();
        tiles.forEach((t) => { t.pulse += 0.05 * dt; });
      }

      function draw() {
        ctx.fillStyle = "#070a12";
        ctx.fillRect(0, 0, W, H);

        // arka süs
        ctx.strokeStyle = "rgba(255,255,255,.03)";
        for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

        tiles.forEach((t) => {
          const sel = selected === t;
          const scale = 1 + Math.sin(t.pulse) * 0.04 + (sel ? 0.1 : 0);
          ctx.fillStyle = sel ? "#7c5cff" : "#1f2440";
          ctx.strokeStyle = sel ? "#22d3ee" : "rgba(124,92,255,.45)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.r * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.font = (t.r * 1.15) + "px Segoe UI, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(t.emoji, t.x, t.y + 1);
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
        });

        if (combo > 1) {
          ctx.fillStyle = "rgba(251,191,36,.95)";
          ctx.font = "800 16px Segoe UI, sans-serif";
          ctx.textAlign = "right";
          ctx.fillText("Kombo x" + combo, W - 14, 28);
          ctx.textAlign = "left";
        }
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
        let hit = null;
        for (let i = tiles.length - 1; i >= 0; i--) {
          const t = tiles[i];
          if (Math.hypot(p.x - t.x, p.y - t.y) <= t.r + 6) { hit = t; break; }
        }
        if (!hit) { selected = null; return; }

        if (!selected) {
          selected = hit;
          Sound.play("tap");
          Haptic.tap(4);
          return;
        }
        if (selected === hit) { selected = null; return; }

        if (selected.emoji === hit.emoji) {
          combo++;
          const gain = 10 * Math.min(combo, 6);
          score += gain;
          h.set(0, score);
          Sound.play(combo > 3 ? "combo" : "point");
          Haptic.tap(10);
          tiles = tiles.filter((t) => t !== selected && t !== hit);
          selected = null;
          spawnPair();
        } else {
          combo = 0;
          score = Math.max(0, score - 2);
          h.set(0, score);
          Sound.play("bad");
          selected = null;
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
          title: "Süre bitti!",
          big: score,
          msg: isBest ? "🏆 Yeni rekor!" : "Daha hızlı olabilir misin?",
          buttons: [{ label: "Tekrar Oyna", onClick: start }]
        }));
      }

      reset();
      draw();
      wrap.appendChild(overlay({
        title: "⚡ Hız Eşleştirme",
        msg: "Aynı emoji çiftlerine sırayla dokun. 45 saniyede ne kadar çok eşleştirirsen o kadar puan!",
        buttons: [{ label: "Başla", onClick: start }]
      }));
      return { stop() { running = false; cancelAnimationFrame(raf); } };
    }
  });

  /* ====================================================================
     SIRA TAKİP (pattern recall grid)
     ==================================================================== */
  GAMES.push({
    id: "sequence", title: "Sıra Takip", emoji: "🔗", cat: "puzzle", new: true,
    desc: "Karelerin yanma sırasını hatırla ve aynı sırayla tekrar et.",
    hint: "Sıraya göre dokun",
    mount(host, root) {
      const h = hud([{ label: "Tur", tone: "accent" }, { label: "Durum" }, { label: "Rekor" }]);
      root.appendChild(h.root);
      const wrap = el("div", { class: "board-wrap" });
      const grid = el("div", { class: "cell-grid" });
      grid.style.gridTemplateColumns = "repeat(3, var(--cell))";
      grid.style.setProperty("--cell", "84px");
      wrap.appendChild(grid);
      root.appendChild(wrap);

      let round = 0, seq = [], input = [], cells = [], token = 0, phase = "idle";
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      function build() {
        grid.innerHTML = "";
        cells = [];
        for (let i = 0; i < 9; i++) {
          const b = el("button", { type: "button", class: "seqcell", "data-i": i });
          b.addEventListener("click", () => press(i));
          grid.appendChild(b);
          cells.push(b);
        }
      }

      async function nextRound() {
        const my = ++token;
        round++;
        h.set(0, round);
        const len = Math.min(2 + round, 9);
        seq = Array.from({ length: len }, () => rnd(9));
        build();
        input = [];
        phase = "show";
        h.set(1, "İzle");
        await sleep(500);
        for (let i = 0; i < seq.length; i++) {
          if (my !== token) return;
          const b = cells[seq[i]];
          b.classList.add("lit");
          Sound.tone(420 + seq[i] * 40, 0.11, "sine", 0.07);
          await sleep(Math.max(320, 520 - round * 15));
          b.classList.remove("lit");
          await sleep(110);
        }
        if (my !== token) return;
        phase = "input";
        h.set(1, "1. adım");
      }

      function press(i) {
        if (phase !== "input") return;
        const b = cells[i];
        b.classList.add("tap");
        setTimeout(() => b.classList.remove("tap"), 150);
        Sound.play("tap");
        Haptic.tap(5);
        const idx = input.length;
        if (seq[idx] !== i) {
          Sound.play("bad");
          Haptic.tap(30);
          b.classList.add("wrong");
          return fail();
        }
        input.push(i);
        if (input.length === seq.length) {
          phase = "ok";
          host.record(round);
          h.set(2, host.best || 0);
          Sound.play("point");
          setTimeout(() => { if (phase === "ok") nextRound(); }, 620);
        } else {
          h.set(1, (input.length + 1) + ". adım");
        }
      }

      function fail() {
        token++;
        phase = "fail";
        wrap.style.position = "relative";
        wrap.appendChild(overlay({
          title: "Yanlış sıra!",
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

  /* ====================================================================
     MÜZİK EZBERİ (melody memory)
     ==================================================================== */
  GAMES.push({
    id: "melody", title: "Melodi Ezberi", emoji: "🎵", cat: "puzzle", new: true,
    desc: "Çalınan notaları sırayla dinle ve tekrar çal.",
    hint: "Notalara sırayla dokun",
    mount(host, root) {
      const h = hud([{ label: "Seviye", tone: "accent" }, { label: "Durum" }, { label: "Rekor" }]);
      root.appendChild(h.root);

      const KEYS = [
        { c: "#22d3ee", f: 523, name: "Do" },
        { c: "#34d399", f: 587, name: "Re" },
        { c: "#fbbf24", f: 659, name: "Mi" },
        { c: "#fb7185", f: 784, name: "Fa" },
        { c: "#c084fc", f: 880, name: "Sol" }
      ];
      const keysEl = el("div", { class: "melody-keys" });
      const btns = KEYS.map((k, i) => {
        const b = el("button", { type: "button", class: "melody-key", style: { background: k.c }, text: k.name });
        b.addEventListener("click", () => press(i));
        keysEl.appendChild(b);
        return b;
      });
      const wrap = el("div", { class: "board-wrap melody-wrap" }, keysEl);
      root.appendChild(wrap);

      let seq = [], idx = 0, level = 0, playing = false, accepting = false, token = 0;
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      function playTone(i, dur) {
        return new Promise((res) => {
          btns[i].classList.add("lit");
          Sound.tone(KEYS[i].f, (dur || 300) / 1000, "sine", 0.1);
          setTimeout(() => {
            btns[i].classList.remove("lit");
            setTimeout(res, 70);
          }, dur || 300);
        });
      }

      async function playSeq(my) {
        accepting = false;
        await sleep(450);
        for (const i of seq) {
          if (my !== token) return;
          await playTone(i, Math.max(240, 520 - level * 15));
          await sleep(70);
        }
        if (my === token) { accepting = true; idx = 0; h.set(1, "Sıra sende"); }
      }

      async function nextLevel() {
        const my = token;
        level++;
        h.set(0, level);
        h.set(1, "Dinle");
        seq.push(rnd(KEYS.length));
        playing = true;
        await playSeq(my);
      }

      function start() {
        E.removeOverlay(wrap);
        token++;
        seq = [];
        level = 0;
        playing = true;
        h.set(0, 0);
        nextLevel();
      }

      async function press(i) {
        if (!accepting || !playing) return;
        await playTone(i, 220);
        if (!accepting || !playing) return;
        if (seq[idx] !== i) return fail();
        idx++;
        if (idx === seq.length) {
          accepting = false;
          host.record(level);
          h.set(2, host.best || 0);
          Sound.play("point");
          await sleep(420);
          nextLevel();
        }
      }

      function fail() {
        playing = false;
        accepting = false;
        token++;
        Sound.play("die");
        Haptic.tap(40);
        wrap.appendChild(overlay({
          title: "Yanlış nota!",
          big: level,
          msg: `Seviye ${level} — tekrar dene!`,
          buttons: [{ label: "Tekrar", onClick: start }]
        }));
      }

      h.set(2, host.best || 0);
      start();
      return { stop() { token++; playing = false; } };
    }
  });
})();
