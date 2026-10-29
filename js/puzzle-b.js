/* ==========================================================================
   PUZZLE B — Sayı Ezberi, Kayan Bulmaca, Renk Sırala, Renk Ustası,
              Işıkları Kapat, Labirent, Piksel Boyama, Sayı Tahmin
   ========================================================================== */
(function () {
  "use strict";
  const E = window.Engine;
  const { el, rnd, rand, clamp, pick, shuffle, hud, overlay, Sound, Haptic, store } = E;
  const GAMES = window.GAMES;

  /* ====================================================================
     SAYI EZBERİ
     ==================================================================== */
  GAMES.push({
    id: "numbers", title: "Sayı Ezberi", emoji: "🔟", cat: "puzzle",
    desc: "Önce sayıları gör, sonra sırayla tekrarla.",
    hint: "Sırayla dokun",
    mount(host, root) {
      const h = hud([{ label: "Seviye", tone: "accent" }, { label: "Durum" }, { label: "Rekor" }]);
      root.appendChild(h.root);
      const wrap = el("div", { class: "board-wrap" });
      const grid = el("div", { class: "cell-grid" });
      wrap.appendChild(grid);
      root.appendChild(wrap);

      let level = 0, seq = [], input = [], phase = "idle", token = 0, running = false;
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      function drawGrid(size, nums, interactive) {
        grid.style.gridTemplateColumns = `repeat(${size}, var(--cell))`;
        grid.style.setProperty("--cell", (size <= 3 ? 74 : 58) + "px");
        grid.innerHTML = "";
        for (let i = 0; i < size * size; i++) {
          const n = nums ? nums[i] : null;
          const b = el("button", {
            type: "button",
            class: n == null ? "open" : "",
            style: { fontSize: "20px", fontWeight: "800" },
            text: n == null ? "" : String(n)
          });
          if (interactive) b.addEventListener("click", () => press(i));
          grid.appendChild(b);
        }
      }

      async function nextLevel() {
        const my = ++token;
        running = true;
        level++;
        h.set(0, level);
        const size = Math.min(3 + Math.floor(level / 2), 5);
        const count = size * size;
        seq = shuffle(Array.from({ length: count }, (_, i) => i + 1)).slice(0, Math.min(3 + level, count));
        const nums = Array(count).fill(null);
        seq.forEach((pos, i) => { nums[pos] = i + 1; });

        phase = "show";
        h.set(1, "İzle");
        drawGrid(size, nums, false);
        await sleep(1000);

        for (let i = 0; i < seq.length; i++) {
          if (my !== token) return;
          const btns = grid.querySelectorAll("button");
          const b = btns[seq[i]];
          if (!b) return;
          b.style.background = "#22d3ee";
          b.style.color = "#04121b";
          Sound.tone(500 + i * 60, 0.12, "sine", 0.08);
          await sleep(520);
          b.style.background = "";
          b.style.color = "";
          await sleep(150);
        }
        if (my !== token) return;
        phase = "input";
        input = [];
        h.set(1, "Sıra sende");
        drawGrid(size, null, true);
      }

      function press(i) {
        if (phase !== "input" || !running) return;
        input.push(i);
        const btns = grid.querySelectorAll("button");
        if (btns[i]) {
          btns[i].style.background = "#7c5cff";
          setTimeout(() => { if (btns[i]) btns[i].style.background = ""; }, 160);
        }
        Sound.play("tap");
        Haptic.tap(6);
        const idx = input.length - 1;
        if (seq[idx] !== i) return fail();
        if (input.length === seq.length) {
          phase = "done";
          host.record(level);
          h.set(2, host.best || 0);
          Sound.play("point");
          setTimeout(() => { if (running) nextLevel(); }, 600);
        }
      }

      function fail() {
        running = false;
        phase = "fail";
        token++;
        Sound.play("die");
        Haptic.tap(40);
        wrap.appendChild(overlay({
          title: "Yanlış!",
          big: level,
          msg: `Seviye ${level} — tekrar dene!`,
          buttons: [{ label: "Tekrar", onClick: start }]
        }));
      }

      function start() {
        E.removeOverlay(wrap);
        level = 0;
        token++;
        nextLevel();
      }

      h.set(2, host.best || 0);
      start();
      return { stop() { token++; running = false; } };
    }
  });

  /* ====================================================================
     KAYAN BULMACA
     ==================================================================== */
  GAMES.push({
    id: "slide", title: "Kayan Bulmaca", emoji: "🔀", cat: "puzzle",
    desc: "Karoları sıraya diz, boşluğu kullan.",
    hint: "Karo dokun / kaydır",
    mount(host, root) {
      let N = 3;
      const h = hud([{ label: "Hamle", tone: "accent" }, { label: "Süre" }, { label: "Rekor" }]);
      root.appendChild(h.root);

      const sizeRow = el("div", { class: "seg" });
      const b3 = el("button", { class: "seg-btn active", text: "3×3" });
      const b4 = el("button", { class: "seg-btn", text: "4×4" });
      b3.addEventListener("click", () => { N = 3; b3.classList.add("active"); b4.classList.remove("active"); newGame(); });
      b4.addEventListener("click", () => { N = 4; b4.classList.add("active"); b3.classList.remove("active"); newGame(); });
      sizeRow.appendChild(b3);
      sizeRow.appendChild(b4);
      root.appendChild(sizeRow);

      const gridEl = el("div", { class: "cell-grid" });
      const gridWrap = el("div", { class: "grid-wrap" }, gridEl);
      root.appendChild(gridWrap);

      let board, moves, solved, t0, timerId;

      function newGame() {
        clearInterval(timerId);
        gridWrap.querySelectorAll(".overlay").forEach((o) => o.remove());
        board = Array.from({ length: N * N }, (_, i) => (i + 1) % (N * N));
        for (let i = 0; i < 200; i++) {
          const empty = board.indexOf(0);
          const opts = neighbors(empty);
          const p = pick(opts);
          [board[empty], board[p]] = [board[p], board[empty]];
        }
        moves = 0;
        solved = false;
        h.set(0, 0);
        h.set(1, "0:00");
        const prev = store.get("slide" + N, 0);
        h.set(2, prev ? prev + " hamle" : "—");
        render();
        t0 = Date.now();
        timerId = setInterval(() => {
          const s = Math.floor((Date.now() - t0) / 1000);
          h.set(1, `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
        }, 500);
      }

      function neighbors(idx) {
        const r = Math.floor(idx / N), c = idx % N;
        const out = [];
        if (r > 0) out.push(idx - N);
        if (r < N - 1) out.push(idx + N);
        if (c > 0) out.push(idx - 1);
        if (c < N - 1) out.push(idx + 1);
        return out;
      }

      function render() {
        const px = N === 3 ? 84 : 62;
        gridEl.style.gridTemplateColumns = `repeat(${N}, var(--cell))`;
        gridEl.style.setProperty("--cell", px + "px");
        gridEl.innerHTML = "";
        board.forEach((v, i) => {
          const empty = v === 0;
          const b = el("button", {
            type: "button",
            class: empty ? "open" : "",
            style: {
              fontSize: N === 3 ? "24px" : "18px",
              background: empty ? "transparent" : "",
              color: "#fff"
            },
            text: empty ? "" : String(v)
          });
          if (!empty) b.addEventListener("click", () => tryMove(i));
          gridEl.appendChild(b);
        });
      }

      function tryMove(idx) {
        if (solved) return;
        const empty = board.indexOf(0);
        if (neighbors(empty).indexOf(idx) < 0) { Sound.play("bad"); return; }
        [board[empty], board[idx]] = [board[idx], board[empty]];
        moves++;
        h.set(0, moves);
        Sound.play("tap");
        Haptic.tap(5);
        render();
        checkWin();
      }

      function checkWin() {
        const ok = board.every((v, i) => v === (i + 1) % (N * N));
        if (!ok) return;
        solved = true;
        clearInterval(timerId);
        Sound.play("win");
        Haptic.tap(40);
        const prev = store.get("slide" + N, 0);
        const isBest = !prev || moves < prev;
        if (isBest) {
          store.set("slide" + N, moves);
          h.set(2, moves + " hamle");
          host.recordMoves(moves);
        }
        gridWrap.style.position = "relative";
        gridWrap.appendChild(overlay({
          title: "Çözdün! 🎉",
          big: moves + " hamle",
          msg: isBest ? "🏆 Yeni rekor!" : "Tekrar dene?",
          buttons: [{ label: "Yeni Oyun", onClick: newGame }]
        }));
      }

      E.swipe(gridEl, {
        onSwipe(dir) {
          const empty = board.indexOf(0);
          const r = Math.floor(empty / N), c = empty % N;
          let target = -1;
          if (dir === "up" && r < N - 1) target = empty + N;
          if (dir === "down" && r > 0) target = empty - N;
          if (dir === "left" && c < N - 1) target = empty + 1;
          if (dir === "right" && c > 0) target = empty - 1;
          if (target >= 0) tryMove(target);
        }
      });

      root.appendChild(el("div", { class: "hud-actions" }, el("button", {
        class: "btn sm sec", text: "🔄 Karıştır", on: { click: newGame }
      })));

      newGame();
      return { stop() { clearInterval(timerId); } };
    }
  });

  /* ====================================================================
     RENK SIRALA
     ==================================================================== */
  GAMES.push({
    id: "colorsort", title: "Renk Sırala", emoji: "🧪", cat: "puzzle",
    desc: "Tüplerdeki renkleri sırala.",
    hint: "Boruya dokun, sonra hedef",
    mount(host, root) {
      const h = hud([{ label: "Hamle", tone: "accent" }, { label: "Durum" }]);
      root.appendChild(h.root);

      const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#06b6d4", "#f97316", "#ec4899"];
      const CAP = 4;
      let tubeCount = 6;
      const tubesEl = el("div", { class: "tubes" });
      root.appendChild(tubesEl);
      const wrap = el("div", { class: "tubes-wrap" }, tubesEl);
      root.appendChild(wrap);

      let tubes, moves, selected, history;

      function newGame() {
        E.removeOverlay(wrap);
        const colorCount = tubeCount - 2;
        const pool = [];
        shuffle(COLORS).slice(0, colorCount).forEach((c) => {
          for (let i = 0; i < CAP; i++) pool.push(c);
        });
        shuffle(pool);
        tubes = [];
        for (let i = 0; i < colorCount; i++) {
          tubes.push({ cells: pool.slice(i * CAP, i * CAP + CAP) });
        }
        tubes.push({ cells: [] }, { cells: [] });
        moves = 0;
        selected = null;
        history = [];
        h.set(0, 0);
        h.set(1, "—");
        render();
      }

      function isSolved() {
        return tubes.every((t) => t.cells.length === 0 ||
          (t.cells.length === CAP && t.cells.every((c) => c === t.cells[0])));
      }

      function render() {
        tubesEl.innerHTML = "";
        tubesEl.style.gridTemplateColumns = `repeat(${tubeCount > 6 ? 4 : 3}, minmax(0, auto))`;
        const hgt = tubeCount > 8 ? 130 : 170;
        tubes.forEach((t, ti) => {
          const col = el("div", {
            class: "tube" + (selected === ti ? " sel" : ""),
            style: { height: hgt + "px" },
            role: "button",
            tabindex: "0"
          });
          t.cells.forEach((c) => {
            col.appendChild(el("div", {
              class: "tube-cell",
              style: { background: c }
            }));
          });
          col.addEventListener("click", () => onTube(ti));
          col.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTube(ti); } });
          tubesEl.appendChild(col);
        });
      }

      function onTube(i) {
        const t = tubes[i];
        if (selected === null) {
          if (!t.cells.length) return;
          selected = i;
          Sound.play("tap");
          render();
          return;
        }
        if (selected === i) { selected = null; render(); return; }
        const src = tubes[selected];
        const dst = t;
        const color = src.cells[src.cells.length - 1];
        if (dst.cells.length >= CAP) { Sound.play("bad"); selected = null; render(); return; }
        if (dst.cells.length && dst.cells[dst.cells.length - 1] !== color) {
          Sound.play("bad");
          selected = null;
          render();
          return;
        }
        history.push(JSON.stringify({ tubes: tubes.map((x) => x.cells.slice()), moves }));
        let n = 0;
        for (let k = src.cells.length - 1; k >= 0 && src.cells[k] === color && dst.cells.length + n < CAP; k--) n++;
        for (let k = 0; k < n; k++) dst.cells.push(src.cells.pop());
        moves++;
        h.set(0, moves);
        selected = null;
        Sound.play("point");
        Haptic.tap(8);
        render();
        if (isSolved()) {
          Sound.play("win");
          Haptic.tap(40);
          h.set(1, "Çözüldü!");
          host.recordMoves(moves);
          host.toast(`Çözdün! ${moves} hamle 🎉`, "good");
        }
      }

      function undo() {
        const st = history.pop();
        if (!st) return;
        const d = JSON.parse(st);
        tubes = d.tubes.map((cells) => ({ cells }));
        moves = d.moves;
        selected = null;
        h.set(0, moves);
        render();
      }

      root.appendChild(el("div", { class: "hud-actions" }, [
        el("button", { class: "btn sm sec", text: "↶ Geri Al", on: { click: undo } }),
        el("button", { class: "btn sm sec", text: "🔄 Yeni Oyun", on: { click: newGame } })
      ]));

      newGame();
      return { stop() {} };
    }
  });

  /* ====================================================================
     RENK USTASI (Simon)
     ==================================================================== */
  GAMES.push({
    id: "simon", title: "Renk Ustası", emoji: "🌈", cat: "puzzle",
    desc: "Yanan renkleri sırayla tekrarla.",
    hint: "Karelere sırayla dokun",
    mount(host, root) {
      const h = hud([{ label: "Seviye", tone: "accent" }, { label: "Durum" }, { label: "Rekor" }]);
      root.appendChild(h.root);
      const COLORS = ["#22d3ee", "#34d399", "#a3e635", "#fbbf24", "#fb7185", "#c084fc"];
      const grid = el("div", { class: "simon6" });
      const btns = COLORS.map((c, i) => {
        const b = el("button", { type: "button", "data-i": i, style: { background: c } });
        grid.appendChild(b);
        return b;
      });
      const wrap = el("div", { class: "board-wrap" }, grid);
      root.appendChild(wrap);

      let seq = [], idx = 0, level = 0, playing = false, accepting = false, token = 0;
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      function flash(i, dur) {
        return new Promise((res) => {
          btns[i].classList.add("lit");
          Sound.tone(380 + i * 90, (dur || 180) / 1000, "sine", 0.09);
          setTimeout(() => {
            btns[i].classList.remove("lit");
            setTimeout(res, 60);
          }, dur);
        });
      }

      async function playSeq(my) {
        accepting = false;
        await sleep(420);
        for (const i of seq) {
          if (my !== token) return;
          await flash(i, Math.max(170, 500 - level * 22));
          await sleep(55);
        }
        if (my === token) { accepting = true; idx = 0; h.set(1, "Sıra sende"); }
      }

      async function nextLevel() {
        const my = token;
        level++;
        h.set(0, level);
        h.set(1, "İzle");
        seq.push(rnd(6));
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
        await flash(i, 150);
        if (!accepting || !playing) return;
        if (seq[idx] !== i) return fail();
        idx++;
        if (idx === seq.length) {
          accepting = false;
          host.record(level);
          h.set(2, host.best || 0);
          Sound.play("point");
          await sleep(440);
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
          title: "Yanlış renk!",
          big: level,
          msg: `Seviye ${level} — tekrar dene!`,
          buttons: [{ label: "Tekrar", onClick: start }]
        }));
      }

      btns.forEach((b) => b.addEventListener("click", () => press(Number(b.dataset.i))));

      h.set(2, host.best || 0);
      start();
      return { stop() { token++; playing = false; } };
    }
  });

  /* ====================================================================
     IŞIKLARI KAPAT (Lights Out)
     ==================================================================== */
  GAMES.push({
    id: "lights", title: "Işıkları Kapat", emoji: "💡", cat: "puzzle",
    desc: "Tüm ışıkları söndür — dokunduğun ışık komşularını da değiştirir.",
    hint: "Işığa dokun",
    mount(host, root) {
      const N = 5;
      const h = hud([{ label: "Hamle", tone: "accent" }, { label: "Kalan" }, { label: "Rekor" }]);
      root.appendChild(h.root);

      const gridWrap = el("div", { class: "grid-wrap" });
      const grid = el("div", { class: "cell-grid lights" });
      grid.style.gridTemplateColumns = `repeat(${N}, var(--cell))`;
      grid.style.setProperty("--cell", "56px");
      gridWrap.appendChild(grid);
      root.appendChild(gridWrap);

      let cells, moves, solved;

      function newGame() {
        E.removeOverlay(gridWrap);
        cells = Array.from({ length: N }, () => Array(N).fill(false));
        // çözülebilir karıştırma: rastgele hamleler
        for (let i = 0; i < 12; i++) {
          toggle(rnd(N), rnd(N));
        }
        if (cells.every((row) => row.every((v) => !v))) toggle(0, 0);
        moves = 0;
        solved = false;
        h.set(0, 0);
        render();
        const prev = store.get("lights" + N, 0);
        h.set(2, prev ? prev + " hamle" : "—");
        countLit();
      }

      function toggle(r, c) {
        [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < N && nc >= 0 && nc < N) cells[nr][nc] = !cells[nr][nc];
        });
      }

      function countLit() {
        let n = 0;
        cells.forEach((row) => row.forEach((v) => { if (v) n++; }));
        h.set(1, n);
        return n;
      }

      function render() {
        grid.innerHTML = "";
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const b = el("button", { type: "button", class: cells[r][c] ? "on" : "" });
            b.addEventListener("click", () => press(r, c));
            grid.appendChild(b);
          }
        }
      }

      function press(r, c) {
        if (solved) return;
        toggle(r, c);
        moves++;
        h.set(0, moves);
        Sound.play("tap");
        Haptic.tap(8);
        render();
        const lit = countLit();
        if (lit === 0) {
          solved = true;
          Sound.play("win");
          Haptic.tap(40);
          const prev = store.get("lights" + N, 0);
          const isBest = !prev || moves < prev;
          if (isBest) {
            store.set("lights" + N, moves);
            h.set(2, moves + " hamle");
            host.recordMoves(moves);
          }
          gridWrap.style.position = "relative";
          gridWrap.appendChild(overlay({
            title: "Tüm ışıklar kapandı! 🎉",
            big: moves + " hamle",
            msg: isBest ? "🏆 Yeni rekor!" : "Tekrar dene?",
            buttons: [{ label: "Yeni Oyun", onClick: newGame }]
          }));
        }
      }

      root.appendChild(el("div", { class: "hud-actions" }, el("button", {
        class: "btn sm sec", text: "🔄 Yeni Oyun", on: { click: newGame }
      })));

      newGame();
      return { stop() {} };
    }
  });

  /* ====================================================================
     LABİRENT
     ==================================================================== */
  GAMES.push({
    id: "maze", title: "Labirent", emoji: "🌀", cat: "puzzle",
    desc: "Çıkışa ulaş — her seviye daha büyük.",
    hint: "Sürükle / yön tuşları",
    mount(host, root) {
      const h = hud([{ label: "Seviye", tone: "accent" }, { label: "Adım" }, { label: "Rekor" }]);
      root.appendChild(h.root);

      const canvasWrap = el("div", { class: "board-wrap" });
      const canvas = E.makeCanvas(340, 340, { maxWidth: "440px" });
      let ctx = canvas.getContext("2d");
      canvasWrap.appendChild(canvas);
      root.appendChild(canvasWrap);

      let size, grid, player, exit, level, steps, running, visited;

      function makeMaze(n) {
        const g = Array.from({ length: n }, () => Array.from({ length: n }, () => ({ walls: [1, 1, 1, 1], seen: false })));
        const stack = [[0, 0]];
        g[0][0].seen = true;
        while (stack.length) {
          const cur = stack[stack.length - 1];
          const r = cur[0], c = cur[1];
          const opts = [];
          if (r > 0 && !g[r - 1][c].seen) opts.push([-1, 0, 0, 2]);
          if (c < n - 1 && !g[r][c + 1].seen) opts.push([0, 1, 3, 1]);
          if (r < n - 1 && !g[r + 1][c].seen) opts.push([1, 0, 2, 0]);
          if (c > 0 && !g[r][c - 1].seen) opts.push([0, -1, 1, 3]);
          if (!opts.length) { stack.pop(); continue; }
          const o = pick(opts);
          const dr = o[0], dc = o[1], w1 = o[2], w2 = o[3];
          g[r][c].walls[w1] = 0;
          g[r + dr][c + dc].walls[w2] = 0;
          g[r + dr][c + dc].seen = true;
          stack.push([r + dr, c + dc]);
        }
        return g;
      }

      function setupCanvas() {
        const W = Math.min(window.innerWidth - 80, 380);
        ctx = E.hidpi(canvas, 340, 340);
        canvas.style.maxWidth = "440px";
      }

      function newLevel(lv) {
        E.removeOverlay(canvasWrap);
        level = lv;
        size = Math.min(5 + (lv - 1) * 2, 21);
        grid = makeMaze(size);
        player = { r: 0, c: 0 };
        exit = { r: size - 1, c: size - 1 };
        steps = 0;
        visited = { "0,0": true };
        h.set(0, level);
        h.set(1, 0);
        h.set(2, host.best || 0);
        running = true;
        draw();
      }

      function draw() {
        if (!ctx) return;
        const n = size;
        const cell = Math.floor(340 / n);
        ctx.fillStyle = "#070a12";
        ctx.fillRect(0, 0, 340, 340);

        ctx.fillStyle = "rgba(52,211,153,.35)";
        ctx.fillRect(exit.c * cell, exit.r * cell, cell, cell);

        ctx.fillStyle = "rgba(124,92,255,.14)";
        Object.keys(visited).forEach((k) => {
          const p = k.split(",");
          const r = +p[0], c = +p[1];
          ctx.fillRect(c * cell + cell * 0.35, r * cell + cell * 0.35, cell * 0.3, cell * 0.3);
        });

        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = Math.max(2, 3 - n / 10);
        ctx.lineCap = "round";
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            const w = grid[r][c].walls;
            const x = c * cell, y = r * cell;
            ctx.beginPath();
            if (w[0]) { ctx.moveTo(x, y); ctx.lineTo(x + cell, y); }
            if (w[1]) { ctx.moveTo(x + cell, y); ctx.lineTo(x + cell, y + cell); }
            if (w[2]) { ctx.moveTo(x, y + cell); ctx.lineTo(x + cell, y + cell); }
            if (w[3]) { ctx.moveTo(x, y); ctx.lineTo(x, y + cell); }
            ctx.stroke();
          }
        }

        const px = player.c * cell + cell / 2;
        const py = player.r * cell + cell / 2;
        ctx.fillStyle = "#fbbf24";
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(px, py, cell * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      function move(dir) {
        if (!running) return;
        if (!grid[player.r] || !grid[player.r][player.c]) return;
        const w = grid[player.r][player.c].walls;
        let nr = player.r, nc = player.c;
        if (dir === "up" && !w[0]) nr--;
        else if (dir === "right" && !w[1]) nc++;
        else if (dir === "down" && !w[2]) nr++;
        else if (dir === "left" && !w[3]) nc--;
        else { Sound.play("bad"); return; }
        if (nr < 0 || nc < 0 || nr >= size || nc >= size) return;
        player.r = nr;
        player.c = nc;
        steps++;
        h.set(1, steps);
        visited[nr + "," + nc] = true;
        Sound.play("tap");
        Haptic.tap(4);
        draw();
        if (nr === exit.r && nc === exit.c) complete();
      }

      function complete() {
        running = false;
        Sound.play("level");
        Haptic.tap(30);
        host.record(level);
        h.set(2, host.best || 0);
        canvasWrap.style.position = "relative";
        canvasWrap.appendChild(overlay({
          title: `Seviye ${level} tamam! 🎉`,
          msg: `${steps} adımda çıktın. Sonraki seviye daha büyük!`,
          buttons: [
            { label: "Sonraki Seviye", onClick: () => newLevel(level + 1) },
            { label: "Baştan", onClick: () => newLevel(1) }
          ]
        }));
      }

      const stopKeys = E.onKey((e) => {
        const map = {
          ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
          w: "up", s: "down", a: "left", d: "right"
        };
        const dir = map[e.key] || map[e.key.toLowerCase()];
        if (dir) { e.preventDefault(); move(dir); }
      });

      const disposeSwipe = E.swipe(canvasWrap, { onSwipe(d) { move(d); } });

      const pad = E.touchControls([
        { label: "▲", onPress: () => move("up"), aria: "Yukarı" },
        { label: "◀", onPress: () => move("left"), aria: "Sol" },
        { label: "▼", onPress: () => move("down"), aria: "Aşağı" },
        { label: "▶", onPress: () => move("right"), aria: "Sağ" }
      ]);
      root.appendChild(pad.node);

      root.appendChild(el("div", { class: "hud-actions" }, el("button", {
        class: "btn sm sec", text: "🔄 Baştan", on: { click: () => newLevel(1) }
      })));

      setupCanvas();
      newLevel(1);
      return { stop() { running = false; stopKeys(); disposeSwipe(); pad.dispose(); } };
    }
  });

  /* ====================================================================
     PİKSEL BOYAMA
     ==================================================================== */
  GAMES.push({
    id: "pixelart", title: "Piksel Boyama", emoji: "🎨", cat: "puzzle",
    desc: "Sayılara göre boya, resmi tamamla.",
    hint: "Renk seç, hücreye dokun",
    mount(host, root) {
      const N = 12;
      const h = hud([{ label: "Tamamlanan", tone: "accent" }, { label: "Resim" }]);
      root.appendChild(h.root);

      const gridWrap = el("div", { class: "grid-wrap" });
      const grid = el("div", { class: "cell-grid" });
      grid.style.gridTemplateColumns = `repeat(${N}, var(--cell))`;
      grid.style.setProperty("--cell", "24px");
      gridWrap.appendChild(grid);
      root.appendChild(gridWrap);

      const paletteRow = el("div", { class: "palette" });
      root.appendChild(paletteRow);

      function heartMask(n) {
        const out = [];
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            const x = (c + 0.5) / n * 2.4 - 1.2;
            const y = -((r + 0.5) / n * 2.4 - 1.2);
            const f = Math.pow(x * x + y * y - 0.42, 3) - x * x * Math.pow(y, 3);
            out.push(f < 0 ? 1 : 0);
          }
        }
        return out;
      }

      function starMask(n) {
        const out = [];
        const cx = n / 2 - 0.5, cy = n / 2 - 0.5;
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            const dx = c - cx, dy = r - cy;
            const a = Math.atan2(dy, dx);
            const rad = Math.sqrt(dx * dx + dy * dy) / (n * 0.5);
            const spikes = 0.55 + 0.45 * Math.abs(Math.cos(a * 2.5));
            out.push(rad < spikes ? 1 : 0);
          }
        }
        return out;
      }

      function diamondMask(n) {
        const out = [];
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            const dx = Math.abs(c - n / 2 + 0.5);
            const dy = Math.abs(r - n / 2 + 0.5);
            out.push(dx + dy < n * 0.44 ? 1 : 0);
          }
        }
        return out;
      }

      const DESIGNS = [
        { name: "Kalp", mask: heartMask, colors: ["#fb7185", "#f9a8d4"] },
        { name: "Yıldız", mask: starMask, colors: ["#fbbf24", "#fde68a"] },
        { name: "Elmas", mask: diamondMask, colors: ["#22d3ee", "#a5f3fc"] }
      ];

      let design, target, painted, colorIdx;

      function newGame() {
        design = pick(DESIGNS);
        target = design.mask(N);
        painted = Array(N * N).fill(0);
        colorIdx = 0;
        h.set(0, "0%");
        h.set(1, design.name);

        grid.innerHTML = "";
        for (let i = 0; i < N * N; i++) {
          const b = el("button", { type: "button" });
          b.addEventListener("click", () => paint(i));
          grid.appendChild(b);
        }

        paletteRow.innerHTML = "";
        design.colors.forEach((c, i) => {
          const sw = el("button", {
            type: "button",
            class: "swatch" + (i === colorIdx ? " sel" : ""),
            style: { background: c }
          });
          sw.addEventListener("click", () => {
            colorIdx = i;
            paletteRow.querySelectorAll(".swatch").forEach((x, j) => x.classList.toggle("sel", j === i));
          });
          paletteRow.appendChild(sw);
        });
      }

      function paint(i) {
        if (target[i] === 0) { Sound.play("bad"); Haptic.tap(15); return; }
        painted[i] = 1;
        grid.children[i].style.background = design.colors[colorIdx];
        grid.children[i].classList.add("done");
        Sound.play("tap");
        Haptic.tap(4);
        const total = target.filter(Boolean).length;
        const done = painted.filter(Boolean).length;
        const pct = Math.round(done / total * 100);
        h.set(0, pct + "%");
        if (done === total) {
          Sound.play("win");
          Haptic.tap(40);
          host.toast("Resim tamamlandı! 🎨", "good");
        }
      }

      root.appendChild(el("div", { class: "hud-actions" }, el("button", {
        class: "btn sm sec", text: "🔄 Yeni Resim", on: { click: newGame }
      })));

      newGame();
      return { stop() {} };
    }
  });

  /* ====================================================================
     SAYI TAHMİN
     ==================================================================== */
  GAMES.push({
    id: "guess", title: "Sayı Tahmin", emoji: "🔮", cat: "puzzle",
    desc: "1-100 arası sayıyı en az denemede bul.",
    hint: "Sayı gir, tahmin et",
    mount(host, root) {
      const h = hud([{ label: "Deneme", tone: "accent" }, { label: "Kayıt" }, { label: "Rekor" }]);
      root.appendChild(h.root);

      const log = el("div", { class: "guess-log" });
      root.appendChild(log);

      const inputRow = el("div", { class: "guess-row" });
      const input = el("input", {
        type: "number", min: "1", max: "100", placeholder: "1-100", inputmode: "numeric", "aria-label": "Tahmin"
      });
      const btn = el("button", { class: "btn", text: "Tahmin Et", type: "button" });
      inputRow.appendChild(input);
      inputRow.appendChild(btn);
      root.appendChild(inputRow);

      root.appendChild(el("div", { class: "hud-actions" }, el("button", {
        class: "btn sm sec", text: "🔄 Yeni Oyun", on: { click: newGame }
      })));

      let secret, tries, alive;

      function newGame() {
        secret = rnd(100) + 1;
        tries = 0;
        alive = true;
        h.set(0, 0);
        h.set(1, "—");
        h.set(2, store.get("guessBest", 0) || "—");
        log.innerHTML = "";
        addLog("1 ile 100 arasında bir sayı tuttum. Tahmin et! 🎲", "#22d3ee");
        input.value = "";
        input.disabled = false;
        btn.disabled = false;
        try { input.focus(); } catch (e) {}
      }

      function addLog(text, color) {
        log.appendChild(el("div", {
          class: "guess-line",
          style: { borderLeftColor: color || "#7c5cff" },
          text
        }));
        log.scrollTop = log.scrollHeight;
      }

      function guess() {
        if (!alive) return;
        const v = parseInt(input.value, 10);
        if (isNaN(v) || v < 1 || v > 100) {
          Sound.play("bad");
          addLog("⚠️ 1-100 arası bir sayı gir!", "#fb7185");
          return;
        }
        tries++;
        h.set(0, tries);
        input.value = "";

        if (v === secret) {
          alive = false;
          h.set(1, tries);
          const best = store.get("guessBest", 0);
          const isBest = !best || tries < best;
          if (isBest) {
            store.set("guessBest", tries);
            h.set(2, tries);
            host.recordMoves(tries);
            host.toast(`🏆 Yeni rekor: ${tries} deneme!`, "good");
          }
          addLog(`🎉 Buldun! ${secret} — ${tries} denemede.`, "#34d399");
          Sound.play("win");
          Haptic.tap(40);
          input.disabled = true;
          btn.disabled = true;
          return;
        }
        if (v < secret) {
          addLog(`⬆️ ${v} çok küçük — daha yükseğe bak.`, "#fbbf24");
        } else {
          addLog(`⬇️ ${v} çok büyük — daha aşağıya bak.`, "#60a5fa");
        }
        Sound.play("tap");
        if (tries >= 6 && tries % 2 === 0) {
          const near = Math.abs(secret - v);
          addLog(`💡 İpucu: ${near <= 5 ? "Çok yakınsın!" : near <= 15 ? "Yaklaşıyorsun." : "Uzaksın."}`, "#c084fc");
        }
      }

      btn.addEventListener("click", guess);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.stopPropagation(); guess(); }
      });

      newGame();
      return { stop() {} };
    }
  });
})();
