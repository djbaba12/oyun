/* ==========================================================================
   PUZZLE A — Hafıza, 2048, Mayın Tarlası, Blok Bulmaca, Sudoku
   ========================================================================== */
(function () {
  "use strict";
  const E = window.Engine;
  const { el, rnd, rand, clamp, pick, shuffle, hud, overlay, Sound, Haptic, store } = E;
  const GAMES = window.GAMES;

  /* ====================================================================
     HAFIZA KARTLARI
     ==================================================================== */
  GAMES.push({
    id: "memory", title: "Hafıza Kartları", emoji: "🃏", cat: "puzzle",
    desc: "Aynı emojileri eşleştir.",
    hint: "Kartlara dokun",
    mount(host, root) {
      const SETS = {
        kolay: { emojis: ["🍎", "🍌", "🍇", "🍓", "🍑", "🍍"], cols: 4, label: "Kolay (12)" },
        orta: { emojis: ["🍎", "🍌", "🍇", "🍓", "🍑", "🍍", "🥝", "🍒"], cols: 4, label: "Orta (16)" },
        zor: { emojis: ["🍎", "🍌", "🍇", "🍓", "🍑", "🍍", "🥝", "🍒", "🥑", "🍉"], cols: 5, label: "Zor (20)" }
      };
      let mode = "kolay";
      const h = hud([{ label: "Hamle", tone: "accent" }, { label: "Süre" }, { label: "Çift" }]);
      root.appendChild(h.root);

      const modeRow = el("div", { class: "seg" });
      Object.keys(SETS).forEach((k) => {
        const b = el("button", { class: "seg-btn" + (k === mode ? " active" : ""), text: SETS[k].label, "data-mode": k });
        b.addEventListener("click", () => {
          mode = k;
          modeRow.querySelectorAll(".seg-btn").forEach((x) => x.classList.toggle("active", x.dataset.mode === k));
          newGame();
        });
        modeRow.appendChild(b);
      });
      root.appendChild(modeRow);

      const grid = el("div", { class: "mem-grid" });
      root.appendChild(grid);

      let first = null, second = null, lock = false, moves = 0, matched = 0, timer = null, secs = 0;
      let started = false, t0 = 0, flipTimer = null, gameId = 0;

      function newGame() {
        gameId++;
        clearTimeout(flipTimer);
        clearInterval(timer);
        timer = null;
        first = second = null;
        lock = false;
        moves = 0; matched = 0; secs = 0; started = false; t0 = 0;
        const set = SETS[mode];
        h.set(0, 0); h.set(1, "0:00"); h.set(2, "0/" + set.emojis.length);
        grid.style.setProperty("--cols", set.cols);
        grid.innerHTML = "";
        const deck = shuffle([...set.emojis, ...set.emojis]);
        deck.forEach((emoji) => {
          const card = el("button", { class: "mem-card", "data-e": emoji, type: "button" },
            el("div", { class: "mem-inner" }, [
              el("div", { class: "mem-face mem-back", text: "❔" }),
              el("div", { class: "mem-face mem-front", text: emoji })
            ]));
          card.addEventListener("click", () => flip(card));
          grid.appendChild(card);
        });
      }

      function startClock() {
        if (started) return;
        started = true;
        t0 = Date.now();
        timer = setInterval(() => {
          secs = Math.floor((Date.now() - t0) / 1000);
          h.set(1, `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`);
        }, 250);
      }

      function flip(card) {
        if (lock || !card.isConnected || card.classList.contains("flipped") || card.classList.contains("matched")) return;
        startClock();
        Sound.play("tap");
        Haptic.tap(5);
        card.classList.add("flipped");
        if (!first) { first = card; return; }
        second = card;
        moves++;
        h.set(0, moves);
        lock = true;
        const a = first, b = second, my = gameId;
        const total = SETS[mode].emojis.length;

        if (a.dataset.e === b.dataset.e) {
          flipTimer = setTimeout(() => {
            if (my !== gameId) return;
            a.classList.add("matched");
            b.classList.add("matched");
            matched++;
            h.set(2, matched + "/" + total);
            lock = false;
            first = second = null;
            Sound.play("point");
            if (matched === total) {
              clearInterval(timer);
              const isBest = host.recordMoves(moves);
              const secsText = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
              host.toast(`Tebrikler! ${moves} hamle, ${secsText}${isBest ? " — 🏆 Yeni rekor!" : ""}`, "good");
            }
          }, 320);
        } else {
          flipTimer = setTimeout(() => {
            if (my !== gameId) return;
            a.classList.remove("flipped");
            b.classList.remove("flipped");
            lock = false;
            first = second = null;
          }, 700);
        }
      }

      root.appendChild(el("div", { class: "hud-actions" }, el("button", {
        class: "btn sm sec", text: "🔄 Yeni Oyun", on: { click: newGame }
      })));

      newGame();
      return { stop() { gameId++; clearInterval(timer); clearTimeout(flipTimer); } };
    }
  });

  /* ====================================================================
     2048
     ==================================================================== */
  GAMES.push({
    id: "2048", title: "2048", emoji: "🔢", cat: "puzzle", featured: true,
    desc: "Sayıları birleştir, 2048'e ulaş.",
    hint: "Kaydır / yön tuşları",
    mount(host, root) {
      const h = hud([{ label: "Skor", tone: "accent" }, { label: "Rekor" }, { label: "En İyi" }]);
      root.appendChild(h.root);
      const board = el("div", { class: "board2048" });
      root.appendChild(board);

      const CLS = {
        2: "t2", 4: "t4", 8: "t8", 16: "t16", 32: "t32", 64: "t64",
        128: "t128", 256: "t256", 512: "t512", 1024: "t1024", 2048: "t2048"
      };
      let grid, score, over, wonShown, undoStack;

      function newGame() {
        grid = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
        score = 0; over = false; wonShown = false; undoStack = [];
        add(); add();
        render();
        h.set(0, 0);
        h.set(1, host.best || 0);
        h.set(2, maxTile());
      }

      function maxTile() {
        let m = 0;
        grid.forEach((row) => row.forEach((v) => { if (v > m) m = v; }));
        return m || 2;
      }

      function add() {
        const empty = [];
        grid.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
        if (!empty.length) return;
        const pos = pick(empty);
        grid[pos[0]][pos[1]] = Math.random() < 0.9 ? 2 : 4;
      }

      function render() {
        board.innerHTML = "";
        grid.forEach((row) => row.forEach((v) => {
          board.appendChild(el("div", {
            class: "tile " + (v === 0 ? "" : (CLS[v] || "tbig")),
            text: v === 0 ? "" : String(v)
          }));
        }));
        h.set(0, score);
      }

      function slide(row) {
        const arr = row.filter(Boolean);
        for (let i = 0; i < arr.length - 1; i++) {
          if (arr[i] === arr[i + 1]) {
            arr[i] *= 2;
            score += arr[i];
            arr.splice(i + 1, 1);
          }
        }
        while (arr.length < 4) arr.push(0);
        return arr;
      }

      function rot(g) {
        const out = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) out[c][3 - r] = g[r][c];
        return out;
      }

      function move(dir) {
        if (over) return;
        const before = JSON.stringify(grid);
        const beforeScore = score;
        const turns = { left: 0, up: 1, right: 2, down: 3 }[dir];
        for (let i = 0; i < turns; i++) grid = rot(grid);
        grid = grid.map(slide);
        for (let i = 0; i < 4 - turns; i++) grid = rot(grid);
        if (JSON.stringify(grid) === before) return;

        undoStack.push({ grid: JSON.parse(before), score: beforeScore });
        if (undoStack.length > 12) undoStack.shift();

        add();
        render();
        Sound.play("move");
        Haptic.tap(4);
        const best = host.record(score);
        h.set(1, host.best || 0);
        h.set(2, maxTile());

        if (!wonShown && grid.some((row) => row.some((v) => v >= 2048))) {
          wonShown = true;
          host.toast("🎉 2048'e ulaştın! Devam edebilirsin.", "good");
          Sound.play("win");
          Haptic.tap(30);
        }

        if (!canMove()) {
          over = true;
          Sound.play("die");
          board.style.position = "relative";
          const ov = overlay({
            title: "Hamle kalmadı",
            big: score,
            msg: best ? "🏆 Yeni rekor!" : "Başka bir yön dene?",
            buttons: [
              { label: "Geri Al", onClick: () => { ov.remove(); undo(); } },
              { label: "Yeni Oyun", onClick: () => { ov.remove(); newGame(); } }
            ]
          });
          board.appendChild(ov);
        }
      }

      function undo() {
        const st = undoStack.pop();
        if (!st) return;
        grid = st.grid;
        score = st.score;
        over = false;
        render();
        h.set(2, maxTile());
      }

      function canMove() {
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if (!grid[r][c]) return true;
            if (c < 3 && grid[r][c] === grid[r][c + 1]) return true;
            if (r < 3 && grid[r][c] === grid[r + 1][c]) return true;
          }
        }
        return false;
      }

      const stopKeys = E.onKey((e) => {
        const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
        if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
        else if (e.key.toLowerCase() === "z") undo();
      });
      const disposeSwipe = E.swipe(board, { onSwipe: move });

      root.appendChild(el("div", { class: "hud-actions" }, [
        el("button", { class: "btn sm sec", text: "🔄 Yeni Oyun", on: { click: newGame } }),
        el("button", { class: "btn sm sec", text: "↶ Geri Al", on: { click: undo } })
      ]));

      newGame();
      return { stop() { stopKeys(); disposeSwipe(); } };
    }
  });

  /* ====================================================================
     MAYIN TARLASI
     ==================================================================== */
  GAMES.push({
    id: "mines", title: "Mayın Tarlası", emoji: "💣", cat: "puzzle", featured: true,
    desc: "Mayınlara basmadan tüm kareleri aç.",
    hint: "Dokun aç • Uzun bas bayrak",
    mount(host, root) {
      const LEVELS = {
        kolay: { n: 8, mines: 8, cell: 38, label: "Kolay" },
        orta: { n: 10, mines: 16, cell: 33, label: "Orta" },
        zor: { n: 12, mines: 26, cell: 28, label: "Zor" }
      };
      let diff = "kolay";
      const h = hud([{ label: "💣" }, { label: "Süre" }, { label: "Rekor" }]);
      root.appendChild(h.root);

      const diffRow = el("div", { class: "seg" });
      Object.keys(LEVELS).forEach((k) => {
        const b = el("button", { class: "seg-btn" + (k === diff ? " active" : ""), text: LEVELS[k].label, "data-d": k });
        b.addEventListener("click", () => {
          diff = k;
          diffRow.querySelectorAll(".seg-btn").forEach((x) => x.classList.toggle("active", x.dataset.d === k));
          newGame();
        });
        diffRow.appendChild(b);
      });
      root.appendChild(diffRow);

      const gridWrap = el("div", { class: "grid-wrap" });
      const grid = el("div", { class: "cell-grid" });
      gridWrap.appendChild(grid);
      root.appendChild(gridWrap);

      let cells, opened, flags, dead, won, timer, secs, firstClick, lvl;

      function newGame() {
        clearInterval(timer);
        timer = null;
        lvl = LEVELS[diff];
        const n = lvl.n;
        cells = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => ({
          r, c, mine: false, open: false, flag: false, count: 0
        })));
        opened = 0; flags = 0; dead = false; won = false; secs = 0; firstClick = true;
        h.set(0, lvl.mines);
        h.set(1, 0);
        const prev = store.get("mines_" + diff, 0);
        h.set(2, prev ? prev + "s" : "—");
        grid.style.gridTemplateColumns = `repeat(${n}, var(--cell))`;
        grid.style.setProperty("--cell", lvl.cell + "px");
        grid.innerHTML = "";
        cells.forEach((row) => row.forEach((cell) => {
          const btn = el("button", { type: "button" });
          let longPress = null, longPressed = false;

          btn.addEventListener("click", () => {
            if (longPressed) { longPressed = false; return; }
            openCell(cell);
          });
          btn.addEventListener("contextmenu", (e) => { e.preventDefault(); toggleFlag(cell); });
          btn.addEventListener("touchstart", () => {
            longPressed = false;
            longPress = setTimeout(() => {
              longPressed = true;
              toggleFlag(cell);
              longPress = null;
            }, 360);
          }, { passive: true });
          btn.addEventListener("touchmove", () => { clearTimeout(longPress); longPress = null; }, { passive: true });
          btn.addEventListener("touchend", () => { clearTimeout(longPress); longPress = null; }, { passive: true });

          cell.el = btn;
          grid.appendChild(btn);
        }));
      }

      function plant(sr, sc) {
        const n = lvl.n;
        const spots = [];
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            if (Math.abs(r - sr) <= 1 && Math.abs(c - sc) <= 1) continue;
            spots.push([r, c]);
          }
        }
        shuffle(spots).slice(0, lvl.mines).forEach(([r, c]) => { cells[r][c].mine = true; });
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            let cnt = 0;
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < n && nc >= 0 && nc < n && cells[nr][nc].mine) cnt++;
              }
            }
            cells[r][c].count = cnt;
          }
        }
        timer = setInterval(() => { secs++; h.set(1, secs); }, 1000);
      }

      function openCell(cell) {
        if (dead || won || cell.open) return;
        if (cell.flag) { toggleFlag(cell); return; }
        if (firstClick) { plant(cell.r, cell.c); firstClick = false; }
        if (cell.mine) return boom(cell);
        flood(cell);
        Sound.play("tap");
        Haptic.tap(5);
        checkWin();
      }

      function flood(start) {
        const n = lvl.n;
        const stack = [start];
        while (stack.length) {
          const c0 = stack.pop();
          if (c0.open || c0.flag) continue;
          c0.open = true;
          opened++;
          c0.el.classList.add("open");
          if (c0.count > 0) {
            c0.el.textContent = c0.count;
            c0.el.classList.add("n" + c0.count);
          } else {
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = c0.r + dr, nc = c0.c + dc;
                if (nr >= 0 && nr < n && nc >= 0 && nc < n && !cells[nr][nc].open && !cells[nr][nc].mine) {
                  stack.push(cells[nr][nc]);
                }
              }
            }
          }
        }
      }

      function toggleFlag(cell) {
        if (dead || won || cell.open) return;
        if (firstClick) { plant(cell.r, cell.c); firstClick = false; }
        if (!cell.flag && flags >= lvl.mines) return;
        cell.flag = !cell.flag;
        if (cell.flag) {
          flags++;
          cell.el.classList.add("flag");
          cell.el.textContent = "🚩";
        } else {
          flags--;
          cell.el.classList.remove("flag");
          cell.el.textContent = "";
        }
        h.set(0, Math.max(lvl.mines - flags, 0));
        Sound.play("flag");
        Haptic.tap(8);
      }

      function checkWin() {
        const total = lvl.n * lvl.n - lvl.mines;
        if (opened < total) return;
        won = true;
        clearInterval(timer);
        cells.forEach((row) => row.forEach((c) => {
          if (c.mine && !c.flag) {
            c.el.textContent = "🚩";
            c.el.classList.add("open");
          }
        }));
        Sound.play("win");
        Haptic.tap(30);
        const prev = store.get("mines_" + diff, 0);
        const better = !prev || secs < prev;
        if (better) {
          store.set("mines_" + diff, secs);
          h.set(2, secs + "s");
          host.record(secs);
        }
        host.toast(`Temizledin! ${secs} saniye${better ? " — 🏆 Yeni rekor!" : ""}`, "good");
      }

      function boom(cell) {
        dead = true;
        clearInterval(timer);
        Sound.play("die");
        Haptic.tap(60);
        cell.el.classList.add("boom");
        cell.el.textContent = "💥";
        cells.forEach((row) => row.forEach((c) => {
          if (c.mine && !c.el.classList.contains("boom")) {
            c.el.textContent = "💣";
            c.el.classList.add("open");
          }
        }));
        host.toast("Mayına bastın! 💥", "bad");
      }

      root.appendChild(el("div", { class: "hud-actions" }, el("button", {
        class: "btn sm sec", text: "🔄 Yeni Tahta", on: { click: newGame }
      })));

      newGame();
      return { stop() { clearInterval(timer); } };
    }
  });

  /* ====================================================================
     BLOK BULMACA
     ==================================================================== */
  GAMES.push({
    id: "blocks", title: "Blok Bulmaca", emoji: "🧩", cat: "puzzle",
    desc: "Parçaları yerleştir, satır/sütun temizle.",
    hint: "Parça seç, hücreye dokun",
    mount(host, root) {
      const N = 8;
      const h = hud([{ label: "Skor", tone: "accent" }, { label: "Kombo" }, { label: "Rekor" }]);
      root.appendChild(h.root);

      const gridWrap = el("div", { class: "grid-wrap" });
      const gridEl = el("div", { class: "cell-grid" });
      gridEl.style.gridTemplateColumns = `repeat(${N}, var(--cell))`;
      gridEl.style.setProperty("--cell", "34px");
      gridWrap.appendChild(gridEl);
      root.appendChild(gridWrap);

      const tray = el("div", { class: "row-wrap tray" });
      root.appendChild(tray);

      const SHAPES = [
        [[1]], [[1, 1]], [[1], [1]], [[1, 1], [1, 1]], [[1, 1, 1]],
        [[1], [1], [1]], [[1, 0], [1, 1]], [[0, 1], [1, 1]],
        [[1, 1], [1, 0]], [[1, 1], [0, 1]], [[1, 0, 0], [1, 1, 1]],
        [[0, 0, 1], [1, 1, 1]], [[1, 1, 1], [0, 1, 0]], [[1, 0], [1, 0], [1, 1]]
      ];
      const COLORS = ["#22d3ee", "#34d399", "#fbbf24", "#c084fc", "#fb7185", "#60a5fa"];

      let grid, pieces, score, combo, selected;

      function newGame() {
        grid = Array.from({ length: N }, () => Array(N).fill(null));
        score = 0; combo = 0; selected = null;
        h.set(0, 0); h.set(1, 0); h.set(2, host.best || 0);
        pieces = [0, 1, 2].map(() => ({ shape: pick(SHAPES), color: pick(COLORS), used: false }));
        gridWrap.querySelectorAll(".overlay").forEach((o) => o.remove());
        renderGrid();
        renderTray();
      }

      function refill() {
        if (pieces.some((p) => !p.used)) return;
        pieces = [0, 1, 2].map(() => ({ shape: pick(SHAPES), color: pick(COLORS), used: false }));
      }

      function canPlace(p, r, c) {
        for (let y = 0; y < p.shape.length; y++) {
          for (let x = 0; x < p.shape[y].length; x++) {
            if (!p.shape[y][x]) continue;
            const nr = r + y, nc = c + x;
            if (nr >= N || nc >= N || grid[nr][nc]) return false;
          }
        }
        return true;
      }

      function anyMove() {
        return pieces.some((p) => {
          if (p.used) return false;
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (canPlace(p, r, c)) return true;
          return false;
        });
      }

      function place(p, r, c) {
        p.shape.forEach((row, y) => row.forEach((v, x) => {
          if (v) grid[r + y][c + x] = p.color;
        }));
        p.used = true;
        Sound.play("pop");
        Haptic.tap(10);

        const rows = [], cols = [];
        for (let i = 0; i < N; i++) {
          if (grid[i].every(Boolean)) rows.push(i);
          if (grid.every((row) => row[i])) cols.push(i);
        }
        let gain = p.shape.flat().filter(Boolean).length;
        if (rows.length + cols.length) {
          combo++;
          gain += (rows.length + cols.length) * N * 10 * combo;
          rows.forEach((i) => { grid[i] = Array(N).fill(null); });
          cols.forEach((i) => grid.forEach((row) => { row[i] = null; }));
          h.set(1, combo);
          Sound.play(combo > 1 ? "combo" : "line");
          Haptic.tap(20);
          if (combo >= 2) host.toast(`Kombo x${combo}! 🔥`, "good");
        } else {
          combo = 0;
          h.set(1, 0);
        }
        score += gain;
        h.set(0, score);
        selected = null;
        refill();
        renderGrid();
        renderTray();

        if (!anyMove()) {
          const isBest = host.record(score);
          h.set(2, host.best || 0);
          Sound.play("die");
          gridWrap.style.position = "relative";
          gridWrap.appendChild(overlay({
            title: "Hamle kalmadı",
            big: score,
            msg: isBest ? "🏆 Yeni rekor!" : "Harika bir oyun!",
            buttons: [{ label: "Yeniden Oyna", onClick: newGame }]
          }));
        }
      }

      function renderGrid() {
        gridEl.innerHTML = "";
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const v = grid[r][c];
            const b = el("button", { type: "button", class: v ? "open" : "", style: v ? { background: v } : {} });
            b.addEventListener("click", () => onCell(r, c));
            gridEl.appendChild(b);
          }
        }
        gridWrap.style.position = "relative";
      }

      function onCell(r, c) {
        if (!selected) { Sound.play("bad"); return; }
        if (!canPlace(selected, r, c)) { Sound.play("bad"); return; }
        place(selected, r, c);
      }

      function renderTray() {
        tray.innerHTML = "";
        pieces.forEach((p) => {
          const box = el("button", {
            type: "button",
            class: "tray-piece" + (selected === p ? " sel" : ""),
            style: { opacity: p.used ? "0.28" : "1" }
          });
          const inner = el("div", {
            style: {
              display: "grid",
              gridTemplateColumns: `repeat(${p.shape[0].length}, 1fr)`,
              gridTemplateRows: `repeat(${p.shape.length}, 1fr)`,
              gap: "2px",
              width: "100%",
              height: "100%"
            }
          });
          p.shape.forEach((row) => row.forEach((v) => {
            inner.appendChild(el("span", { style: { background: v ? p.color : "transparent", borderRadius: "3px" } }));
          }));
          box.appendChild(inner);
          box.addEventListener("click", () => {
            if (p.used) return;
            selected = selected === p ? null : p;
            Sound.play("tap");
            renderTray();
          });
          tray.appendChild(box);
        });
      }

      newGame();
      return { stop() {} };
    }
  });

  /* ====================================================================
     SUDOKU
     ==================================================================== */
  GAMES.push({
    id: "sudoku", title: "Sudoku", emoji: "🔳", cat: "puzzle",
    desc: "4×4 ve 9×9 sudoku, ipucu desteği.",
    hint: "Boş kareye dokun",
    mount(host, root) {
      let size = 4;
      const h = hud([{ label: "Süre" }, { label: "Hata" }, { label: "Zorluk" }]);
      root.appendChild(h.root);

      const sizeRow = el("div", { class: "seg" });
      const b4 = el("button", { class: "seg-btn active", text: "4×4 Kolay" });
      const b9 = el("button", { class: "seg-btn", text: "9×9 Orta" });
      b4.addEventListener("click", () => { size = 4; b4.classList.add("active"); b9.classList.remove("active"); newGame(); });
      b9.addEventListener("click", () => { size = 9; b9.classList.add("active"); b4.classList.remove("active"); newGame(); });
      sizeRow.appendChild(b4);
      sizeRow.appendChild(b9);
      root.appendChild(sizeRow);

      const boardWrapEl = el("div", { class: "grid-wrap" });
      const boardEl = el("div", { class: "cell-grid" });
      boardWrapEl.appendChild(boardEl);
      root.appendChild(boardWrapEl);

      const numPad = el("div", { class: "numpad" });
      root.appendChild(numPad);

      let solution, puzzle, current, selected, errors, t0, timerId;

      function baseGrid(n) {
        const g = Array.from({ length: n }, () => Array(n).fill(0));
        const box = n === 4 ? 2 : 3;
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            g[r][c] = ((r * box + Math.floor(r / box) + c) % n) + 1;
          }
        }
        return g;
      }

      function shuffleSudoku(g) {
        const n = g.length;
        const digits = shuffle(Array.from({ length: n }, (_, i) => i + 1));
        return g.map((row) => row.map((v) => digits[v - 1]));
      }

      function newGame() {
        clearInterval(timerId);
        boardWrapEl.querySelectorAll(".overlay").forEach((o) => o.remove());
        const n = size;
        solution = shuffleSudoku(baseGrid(n));
        puzzle = solution.map((r) => r.slice());
        const removeCount = n === 4 ? 7 : 44;
        let removed = 0, guard = 0;
        while (removed < removeCount && guard < 600) {
          guard++;
          const r = rnd(n), c = rnd(n);
          if (puzzle[r][c] === 0) continue;
          puzzle[r][c] = 0;
          removed++;
        }
        current = puzzle.map((r) => r.slice());
        selected = null;
        errors = 0;
        h.set(0, "0:00");
        h.set(1, 0);
        h.set(2, n === 4 ? "Kolay" : "Orta");
        t0 = Date.now();
        timerId = setInterval(() => {
          const s = Math.floor((Date.now() - t0) / 1000);
          h.set(0, `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
        }, 500);

        const cellPx = n === 4 ? 66 : 36;
        boardEl.style.gridTemplateColumns = `repeat(${n}, var(--cell))`;
        boardEl.style.setProperty("--cell", cellPx + "px");
        boardEl.style.gap = n === 4 ? "4px" : "2px";
        boardEl.innerHTML = "";

        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            const fixed = puzzle[r][c] !== 0;
            const b = el("button", {
              type: "button",
              class: fixed ? "open" : "",
              style: {
                background: fixed ? "rgba(124,92,255,.16)" : "",
                color: fixed ? "#c4b5fd" : "#eef1fa",
                fontSize: n === 4 ? "24px" : "16px"
              },
              text: current[r][c] ? String(current[r][c]) : ""
            });
            if (fixed) b.dataset.fixed = "1";
            else {
              b.addEventListener("click", () => {
                boardEl.querySelectorAll("button").forEach((x) => {
                  if (!x.dataset.fixed) x.style.outline = "none";
                });
                selected = { r, c, el: b };
                b.style.outline = "2px solid #22d3ee";
                Sound.play("tap");
              });
            }
            boardEl.appendChild(b);
          }
        }

        numPad.innerHTML = "";
        for (let i = 1; i <= n; i++) {
          numPad.appendChild(el("button", {
            class: "np", text: String(i), on: { click: () => setValue(i) }
          }));
        }
        numPad.appendChild(el("button", { class: "np np-del", text: "⌫", on: { click: () => setValue(0) } }));
      }

      function setValue(v) {
        if (!selected) {
          Sound.play("bad");
          host.toast("Önce bir kare seç");
          return;
        }
        const { r, c, el: cellEl } = selected;
        current[r][c] = v;
        cellEl.textContent = v ? String(v) : "";
        cellEl.classList.remove("n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8", "n9");
        if (v && v !== solution[r][c]) {
          errors++;
          h.set(1, errors);
          cellEl.style.color = "#fb7185";
          Sound.play("bad");
          Haptic.tap(15);
        } else if (v) {
          cellEl.style.color = "#34d399";
          cellEl.classList.add("n" + v);
          Sound.play("tap");
        }
        checkDone();
      }

      function checkDone() {
        const solved = current.every((row, r) => row.every((v, c) => v === solution[r][c]));
        if (!solved) return;
        clearInterval(timerId);
        const s = Math.floor((Date.now() - t0) / 1000);
        Sound.play("win");
        Haptic.tap(40);
        boardWrapEl.style.position = "relative";
        boardWrapEl.appendChild(overlay({
          title: "Çözüldü! 🎉",
          big: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`,
          msg: `${errors} hata ile tamamladın.`,
          buttons: [{ label: "Yeni Oyun", onClick: newGame }]
        }));
      }

      const stopKeys = E.onKey((e) => {
        if (!selected) return;
        if (/^[1-9]$/.test(e.key)) { e.preventDefault(); setValue(Number(e.key)); }
        if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); setValue(0); }
      });

      root.appendChild(el("div", { class: "hud-actions" }, el("button", {
        class: "btn sm sec", text: "🔄 Yeni Oyun", on: { click: newGame }
      })));

      newGame();
      return { stop() { clearInterval(timerId); stopKeys(); } };
    }
  });
})();
