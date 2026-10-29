/* ==========================================================================
   CLASSIC A — XOX, Nim, Kelime Ustası (Wordle), Deniz Savaşı
   ========================================================================== */
(function () {
  "use strict";
  const E = window.Engine;
  const { el, rnd, rand, clamp, pick, shuffle, hud, overlay, Sound, Haptic, store } = E;
  const GAMES = window.GAMES;

  /* ====================================================================
     XOX
     ==================================================================== */
  GAMES.push({
    id: "xox", title: "XOX", emoji: "⭕", cat: "classic", featured: true,
    desc: "Üçü birleştir. AI: kolay / orta / yenilmez.",
    hint: "Hücreye dokun",
    mount(host, root) {
      const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      const stats = store.get("xoxStats", { w: 0, l: 0, d: 0 });
      const h = hud([{ label: "Sıra", tone: "accent" }, { label: "Kazandı", tone: "good" }, { label: "Kaybetti", tone: "bad" }, { label: "Berabere" }]);
      root.appendChild(h.root);

      let difficulty = "orta", aiMode = true;
      const diffRow = el("div", { class: "seg" });
      [["kolay", "😊 Kolay"], ["orta", "😐 Orta"], ["zor", "😈 Yenilmez"]].forEach((pair) => {
        const k = pair[0], label = pair[1];
        const b = el("button", { class: "seg-btn" + (k === difficulty ? " active" : ""), text: label, "data-d": k });
        b.addEventListener("click", () => {
          difficulty = k;
          diffRow.querySelectorAll(".seg-btn").forEach((x) => x.classList.toggle("active", x.dataset.d === k));
          newGame();
        });
        diffRow.appendChild(b);
      });
      root.appendChild(diffRow);

      const board = el("div", { class: "board-xox" });
      root.appendChild(board);

      let cells, state, turn, ended;

      function newGame() {
        state = Array(9).fill("");
        turn = "X";
        ended = false;
        updateHud();
        board.innerHTML = "";
        cells = [];
        for (let i = 0; i < 9; i++) {
          const b = el("button", { type: "button", class: "cell-xox" });
          b.addEventListener("click", () => play(i));
          board.appendChild(b);
          cells.push(b);
        }
      }

      function updateHud() {
        h.set(0, turn);
        h.set(1, stats.w);
        h.set(2, stats.l);
        h.set(3, stats.d);
      }

      function winner(b) {
        for (let i = 0; i < LINES.length; i++) {
          const L = LINES[i];
          if (b[L[0]] && b[L[0]] === b[L[1]] && b[L[0]] === b[L[2]]) return { p: b[L[0]], line: L };
        }
        return null;
      }

      function play(i) {
        if (ended || state[i]) return;
        if (aiMode && turn === "O") return;
        place(i, turn);
        Sound.play("tap");
        if (finish()) return;
        turn = turn === "X" ? "O" : "X";
        updateHud();
        if (aiMode && turn === "O") setTimeout(aiMove, 320);
      }

      function place(i, p) {
        state[i] = p;
        cells[i].textContent = p;
        cells[i].classList.add(p === "X" ? "x" : "o");
        cells[i].disabled = true;
      }

      function finish() {
        const w = winner(state);
        if (w) {
          ended = true;
          w.line.forEach((i) => cells[i].classList.add("win"));
          if (w.p === "X") {
            stats.w++;
            Sound.play("win");
            Haptic.tap(30);
            host.toast("Kazandın! 🎉", "good");
          } else {
            stats.l++;
            Sound.play("miss");
            Haptic.tap(30);
            host.toast("AI kazandı 🤖", "bad");
          }
          store.set("xoxStats", stats);
          updateHud();
          E.Profile.checkAchievements({ type: "xox" });
          return true;
        }
        if (state.every(Boolean)) {
          ended = true;
          stats.d++;
          store.set("xoxStats", stats);
          Sound.play("tap");
          host.toast("Berabere 🤝");
          updateHud();
          return true;
        }
        return false;
      }

      function minimax(b, isMax, depth) {
        const w = winner(b);
        if (w) return w.p === "O" ? 10 - depth : depth - 10;
        if (b.every(Boolean)) return 0;
        let best = isMax ? -Infinity : Infinity;
        for (let i = 0; i < 9; i++) {
          if (b[i]) continue;
          b[i] = isMax ? "O" : "X";
          const s = minimax(b, !isMax, depth + 1);
          b[i] = "";
          best = isMax ? Math.max(best, s) : Math.min(best, s);
        }
        return best;
      }

      function findWin(b, player) {
        for (let li = 0; li < LINES.length; li++) {
          const L = LINES[li];
          const vals = L.map((i) => b[i]);
          const cnt = vals.filter((v) => v === player).length;
          const empty = vals.filter((v) => !v).length;
          if (cnt === 2 && empty === 1) return L[vals.indexOf("")];
        }
        return -1;
      }

      function empties() {
        return state.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
      }

      function smartMove() {
        let m = findWin(state, "O");
        if (m >= 0) return m;
        m = findWin(state, "X");
        if (m >= 0) return m;
        if (!state[4]) return 4;
        const corners = [0, 2, 6, 8].filter((i) => !state[i]);
        if (corners.length) return pick(corners);
        const e = empties();
        return e.length ? pick(e) : -1;
      }

      function bestMove() {
        let best = -Infinity, choices = [];
        for (let i = 0; i < 9; i++) {
          if (state[i]) continue;
          state[i] = "O";
          const s = minimax(state.slice(), false, 0);
          state[i] = "";
          if (s > best) { best = s; choices = [i]; }
          else if (s === best) choices.push(i);
        }
        return choices.length ? pick(choices) : -1;
      }

      function aiMove() {
        if (ended || !aiMode) return;
        let move;
        if (difficulty === "kolay") {
          const e = empties();
          move = Math.random() < 0.7 ? (e.length ? pick(e) : -1) : smartMove();
        } else if (difficulty === "orta") {
          move = Math.random() < 0.35 ? smartMove() : bestMove();
        } else {
          move = bestMove();
        }
        if (move == null || move < 0) return;
        place(move, "O");
        Sound.play("tap");
        if (finish()) return;
        turn = "X";
        updateHud();
      }

      const aiBtn = el("button", {
        type: "button",
        class: "btn sm sec",
        text: "🤖 AI: Açık",
        on: {
          click(e) {
            aiMode = !aiMode;
            e.currentTarget.textContent = "🤖 AI: " + (aiMode ? "Açık" : "Kapalı");
            newGame();
          }
        }
      });
      root.appendChild(el("div", { class: "hud-actions" }, [
        aiBtn,
        el("button", { type: "button", class: "btn sm sec", text: "🔄 Yeni Oyun", on: { click: newGame } })
      ]));

      newGame();
      return { stop() {} };
    }
  });

  /* ====================================================================
     NIM
     ==================================================================== */
  GAMES.push({
    id: "nim", title: "Nim", emoji: "🪨", cat: "classic",
    desc: "Son taşı alan kaybeder — AI'yi yen.",
    hint: "Bir taşa dokun",
    mount(host, root) {
      const h = hud([{ label: "Sıra", tone: "accent" }, { label: "Kazandı", tone: "good" }, { label: "Kaybetti", tone: "bad" }]);
      root.appendChild(h.root);

      const pilesEl = el("div", { class: "nim-piles" });
      root.appendChild(pilesEl);
      const infoEl = el("div", { class: "nim-info", text: "" });
      root.appendChild(infoEl);

      const stats = store.get("nimStats", { w: 0, l: 0 });
      let piles, turn, ended;

      function newGame() {
        piles = [3, 5, 7];
        turn = "S";
        ended = false;
        h.set(0, "Sen");
        h.set(1, stats.w);
        h.set(2, stats.l);
        infoEl.textContent = "Bir taşa dokun — o taş ve üstündekileri alırsın.";
        render();
      }

      function render() {
        pilesEl.innerHTML = "";
        piles.forEach((count, pi) => {
          const stack = el("div", { class: "nim-pile" });
          for (let i = 0; i < count; i++) {
            const s = el("div", { class: "nim-stone" });
            if (turn === "S" && !ended) {
              s.style.cursor = "pointer";
              s.addEventListener("click", () => take(pi, count - i));
            }
            stack.appendChild(s);
          }
          if (!count) stack.appendChild(el("span", { class: "nim-empty", text: "—" }));
          pilesEl.appendChild(stack);
        });
        if (!ended) h.set(0, turn === "S" ? "Sen" : "AI");
      }

      function total() {
        return piles.reduce((a, b) => a + b, 0);
      }

      function take(pi, howMany) {
        if (ended || turn !== "S" || piles[pi] <= 0) return;
        howMany = clamp(howMany, 1, piles[pi]);
        piles[pi] -= howMany;
        Sound.play("tap");
        Haptic.tap(8);
        infoEl.textContent = `${howMany} taş aldın.`;
        render();
        if (checkEnd("S")) return;
        turn = "A";
        h.set(0, "AI");
        setTimeout(function () { aiTurn(); }, 650);
      }

      function checkEnd(whoMoved) {
        if (total() > 0) return false;
        ended = true;
        if (whoMoved === "S") {
          stats.l++;
          Sound.play("miss");
          Haptic.tap(35);
          infoEl.textContent = "Son taşı aldın — kaybettin! 😅 AI'yi yenmek için farklı oyna.";
        } else {
          stats.w++;
          Sound.play("win");
          Haptic.tap(35);
          infoEl.textContent = "AI son taşı aldı — kazandın! 🎉";
        }
        store.set("nimStats", stats);
        h.set(1, stats.w);
        h.set(2, stats.l);
        E.Profile.checkAchievements({ type: "nim" });
        render();
        return true;
      }

      function aiTurn() {
        if (ended) return;
        const xor = piles.reduce((a, b) => a ^ b, 0);
        let pi = -1, amount = 1;
        if (xor !== 0) {
          for (let i = 0; i < piles.length; i++) {
            const target = piles[i] ^ xor;
            if (target < piles[i]) { pi = i; amount = piles[i] - target; break; }
          }
        }
        if (pi < 0) {
          const nonEmpty = [];
          piles.forEach((v, i) => { if (v) nonEmpty.push(i); });
          if (!nonEmpty.length) return;
          pi = pick(nonEmpty);
          amount = 1;
        }
        piles[pi] -= amount;
        Sound.play("tap");
        infoEl.textContent = `AI ${amount} taş aldı.`;
        render();
        if (checkEnd("A")) return;
        turn = "S";
        h.set(0, "Sen");
        render();
      }

      root.appendChild(el("div", { class: "hud-actions" }, el("button", {
        type: "button", class: "btn sm sec", text: "🔄 Yeni Oyun", on: { click: newGame }
      })));

      newGame();
      return { stop() {} };
    }
  });

  /* ====================================================================
     KELİME USTASI (Wordle)
     ==================================================================== */
  GAMES.push({
    id: "wordle", title: "Kelime Ustası", emoji: "📝", cat: "classic",
    desc: "5 harfli gizli kelimeyi 6 denemede bul.",
    hint: "Klavyeden yaz",
    mount(host, root) {
      const WORDS = [
        "KALEM", "KİTAP", "BULUT", "DENİZ", "GÜNEŞ", "ARABA", "ÇİÇEK", "DÜNYA",
        "HAYAT", "YILAN", "KAHVE", "ÇORBA", "ELMA", "KEDİ", "BİLGİ", "SINIR",
        "DELİK", "ÇEVRE", "KAPAK", "MASKE", "TEMEL", "YAZAR", "UÇMAK", "YEŞİL",
        "BEYAZ", "SAKIZ", "TATLI", "SİMİT", "PİLAV", "KEMER", "SOĞUK", "ZEYTİN".length === 5 ? "ZEYTİN" : "ZEHİR",
        "KANAT", "DUMAN", "SAHİL", "TOPRA".slice(0, 5), "AJANDA".slice(0, 5), "SABA", "KIYAM".slice(0, 5),
        "KORKU", "SEVGİ", "IŞIK", "YILDIZ".slice(0, 5), "ORMAN", "KAYIK", "TORBA".slice(0, 5)
      ].filter((w) => w.length === 5);
      const KEY_ROWS = ["QÜERTYUIOPĞ", "ASDFGHJKLŞİ", "ZXCVBNMÖÇ"];

      const h = hud([{ label: "Deneme", tone: "accent" }, { label: "Sonuç" }]);
      root.appendChild(h.root);

      const gridEl = el("div", { class: "wordle-grid" });
      root.appendChild(gridEl);
      const kbdEl = el("div", { class: "wordle-kbd" });
      root.appendChild(kbdEl);

      function norm(s) {
        return s.toLocaleUpperCase("tr-TR");
      }

      let answer, guesses, current, over, keyState;

      function newGame() {
        answer = norm(pick(WORDS));
        guesses = [];
        current = "";
        over = false;
        keyState = {};
        h.set(0, 0);
        h.set(1, "—");
        render();
      }

      function render() {
        gridEl.innerHTML = "";
        for (let r = 0; r < 6; r++) {
          const rowEl = el("div", { class: "wordle-row" });
          for (let c = 0; c < 5; c++) {
            let letter = "";
            let cls = "wordle-tile";
            const g = guesses[r];
            if (g) {
              letter = g.word[c];
              cls += " " + g.result[c];
            } else if (r === guesses.length && current[c]) {
              letter = current[c];
              cls += " active";
            }
            rowEl.appendChild(el("div", { class: cls, text: letter || "" }));
          }
          gridEl.appendChild(rowEl);
        }

        kbdEl.innerHTML = "";
        KEY_ROWS.forEach((rowStr, ri) => {
          const rowEl = el("div", { class: "wordle-krow" });
          if (ri === 2) rowEl.appendChild(el("button", { type: "button", class: "keykey wide", text: "OK", on: { click: submit } }));
          [...rowStr].forEach((ch) => {
            const st = keyState[ch] || "";
            rowEl.appendChild(el("button", {
              type: "button",
              class: "keykey " + st,
              text: ch,
              on: { click: () => typeLetter(ch) }
            }));
          });
          if (ri === 2) rowEl.appendChild(el("button", { type: "button", class: "keykey wide", text: "⌫", on: { click: backspace } }));
          kbdEl.appendChild(rowEl);
        });
      }

      function typeLetter(ch) {
        if (over || current.length >= 5) return;
        current += ch;
        Sound.play("tap");
        Haptic.tap(3);
        render();
      }

      function backspace() {
        if (over) return;
        current = current.slice(0, -1);
        render();
      }

      function submit() {
        if (over) return;
        if (current.length !== 5) {
          Sound.play("bad");
          host.toast("5 harf gerekli");
          return;
        }
        const word = current;
        const res = Array(5).fill("absent");
        const pool = answer.split("");
        for (let i = 0; i < 5; i++) {
          if (word[i] === answer[i]) { res[i] = "correct"; pool[i] = null; }
        }
        for (let i = 0; i < 5; i++) {
          if (res[i] === "correct") continue;
          const idx = pool.indexOf(word[i]);
          if (idx >= 0) { res[i] = "present"; pool[idx] = null; }
        }
        guesses.push({ word, result: res });
        for (let i = 0; i < 5; i++) {
          const ch = word[i];
          const cur = keyState[ch];
          const rank = { absent: 1, present: 2, correct: 3 };
          if (!cur || rank[res[i]] > rank[cur]) keyState[ch] = res[i];
        }
        current = "";
        h.set(0, guesses.length);

        if (word === answer) {
          over = true;
          h.set(1, "Kazandın! 🎉");
          Sound.play("win");
          Haptic.tap(40);
          host.toast(`Tebrikler! ${guesses.length} denemede bildin 🎉`, "good");
          host.recordMoves(guesses.length);
        } else if (guesses.length >= 6) {
          over = true;
          h.set(1, answer);
          Sound.play("miss");
          host.toast(`Kaybettin. Cevap: ${answer}`, "bad");
        } else {
          Sound.play("point");
        }
        render();
      }

      const stopKeys = E.onKey((e) => {
        if (over) return;
        const target = e.target;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
        if (e.key === "Enter") { e.preventDefault(); submit(); }
        else if (e.key === "Backspace") { e.preventDefault(); backspace(); }
        else if (/^[a-zA-ZçğıöşüÇĞİÖŞÜ]$/.test(e.key)) {
          e.preventDefault();
          typeLetter(norm(e.key));
        }
      });

      root.appendChild(el("div", { class: "hud-actions" }, el("button", {
        type: "button", class: "btn sm sec", text: "🔄 Yeni Kelime", on: { click: newGame }
      })));

      newGame();
      return { stop() { stopKeys(); } };
    }
  });

  /* ====================================================================
     DENİZ SAVAŞI
     ==================================================================== */
  GAMES.push({
    id: "battleship", title: "Deniz Savaşı", emoji: "🚢", cat: "classic",
    desc: "8×8 denizde AI'nin gemilerini batır.",
    hint: "Hücreye dokun = ateş",
    mount(host, root) {
      const N = 8;
      const SHIPS = [4, 3, 2, 2];
      const h = hud([{ label: "Vuruş", tone: "accent" }, { label: "Kalan Gemi" }, { label: "Atış" }]);
      root.appendChild(h.root);

      const boards = el("div", { class: "bs-boards" });
      root.appendChild(boards);

      const enemyWrap = el("div", { class: "bs-side" });
      const myWrap = el("div", { class: "bs-side" });
      boards.appendChild(enemyWrap);
      boards.appendChild(myWrap);

      let enemy, mine, shots, hits, shipsLeft, turn, over, aiQueue;

      function emptyGrid() {
        return Array.from({ length: N }, () =>
          Array.from({ length: N }, () => ({ ship: false, hit: false, id: -1 })));
      }

      function placeShips(g) {
        let id = 0;
        SHIPS.forEach((len) => {
          let placed = false, guard = 0;
          while (!placed && guard < 500) {
            guard++;
            const horiz = Math.random() < 0.5;
            const r0 = rnd(N - (horiz ? 0 : len - 1));
            const c0 = rnd(N - (horiz ? len - 1 : 0));
            let ok = true;
            for (let k = 0; k < len && ok; k++) {
              const r = r0 + (horiz ? 0 : k), c = c0 + (horiz ? k : 0);
              for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                  const nr = r + dr, nc = c + dc;
                  if (nr >= 0 && nr < N && nc >= 0 && nc < N && g[nr][nc].ship) ok = false;
                }
              }
            }
            if (ok) {
              for (let k = 0; k < len; k++) {
                const r = r0 + (horiz ? 0 : k), c = c0 + (horiz ? k : 0);
                g[r][c].ship = true;
                g[r][c].id = id;
              }
              id++;
              placed = true;
            }
          }
        });
      }

      function newGame() {
        boards.querySelectorAll(".overlay").forEach((o) => o.remove());
        enemy = emptyGrid();
        mine = emptyGrid();
        placeShips(enemy);
        placeShips(mine);
        shots = 0;
        hits = 0;
        shipsLeft = SHIPS.length;
        turn = "S";
        over = false;
        aiQueue = [];
        h.set(0, 0);
        h.set(1, shipsLeft);
        h.set(2, 0);
        render();
      }

      function renderGrid(g, hide, onCell, label) {
        const wrap = el("div", { class: "bs-grid-wrap" });
        wrap.appendChild(el("div", { class: "bs-label", text: label }));
        const grid = el("div", { class: "cell-grid bs-grid" });
        grid.style.gridTemplateColumns = `repeat(${N}, var(--cell))`;
        grid.style.setProperty("--cell", "32px");
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = g[r][c];
            let cls = "";
            let text = "";
            if (cell.hit) {
              if (cell.ship) { cls = "boom"; text = "💥"; }
              else { cls = "open"; text = "•"; }
            } else if (!hide && cell.ship) {
              cls = "ship-cell";
              text = "🚢";
            }
            const b = el("button", { type: "button", class: cls, text });
            if (onCell && !over) b.addEventListener("click", () => onCell(r, c));
            grid.appendChild(b);
          }
        }
        wrap.appendChild(grid);
        return wrap;
      }

      function render() {
        enemyWrap.innerHTML = "";
        enemyWrap.appendChild(renderGrid(enemy, true, fire, "Düşman"));
        myWrap.innerHTML = "";
        myWrap.appendChild(renderGrid(mine, false, null, "Senin filon"));
      }

      function fire(r, c) {
        if (over || turn !== "S") return;
        const cell = enemy[r][c];
        if (cell.hit) return;
        cell.hit = true;
        shots++;
        h.set(2, shots);
        if (cell.ship) {
          hits++;
          h.set(0, hits);
          Sound.play("hit");
          Haptic.tap(12);
          if (sunkShip(enemy, cell.id)) {
            shipsLeft--;
            h.set(1, shipsLeft);
            host.toast("Gemi battı! 💥", "good");
            Sound.play("win");
          }
        } else {
          Sound.play("miss");
        }
        render();
        if (shipsLeft <= 0) return win();
        turn = "A";
        setTimeout(aiFire, 420);
      }

      function sunkShip(g, id) {
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            if (g[r][c].ship && g[r][c].id === id && !g[r][c].hit) return false;
          }
        }
        return true;
      }

      function aiFire() {
        if (over) return;
        let target = null;
        while (aiQueue.length && !target) {
          const cand = aiQueue.shift();
          if (!mine[cand[0]][cand[1]].hit) target = cand;
        }
        if (!target) {
          const open = [];
          for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) if (!mine[r][c].hit) open.push([r, c]);
          }
          if (!open.length) return lose();
          target = pick(open);
        }
        const cell = mine[target[0]][target[1]];
        cell.hit = true;
        if (cell.ship) {
          Sound.play("hit");
          [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach((d) => {
            const nr = target[0] + d[0], nc = target[1] + d[1];
            if (nr >= 0 && nr < N && nc >= 0 && nc < N && !mine[nr][nc].hit) aiQueue.push([nr, nc]);
          });
          if (sunkShip(mine, cell.id)) host.toast("AI bir gemini batırdı! 💀", "bad");
        } else {
          Sound.play("miss");
        }
        render();
        if (myShipsLeft() <= 0) return lose();
        turn = "S";
      }

      function myShipsLeft() {
        const ids = {};
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            if (mine[r][c].ship && !mine[r][c].hit) ids[mine[r][c].id] = true;
          }
        }
        return Object.keys(ids).length;
      }

      function win() {
        over = true;
        Sound.play("win");
        Haptic.tap(40);
        boards.style.position = "relative";
        boards.appendChild(overlay({
          title: "Kazandın! 🎉",
          msg: `${shots} atışta ${hits} vuruş.`,
          buttons: [{ label: "Yeni Oyun", onClick: newGame }]
        }));
      }

      function lose() {
        over = true;
        Sound.play("die");
        Haptic.tap(40);
        boards.style.position = "relative";
        boards.appendChild(overlay({
          title: "Kaybettin",
          msg: "AI filonu batırdı. Tekrar dene!",
          buttons: [{ label: "Yeni Oyun", onClick: newGame }]
        }));
      }

      root.appendChild(el("div", { class: "hud-actions" }, el("button", {
        type: "button", class: "btn sm sec", text: "🔄 Yeni Oyun", on: { click: newGame }
      })));

      newGame();
      return { stop() {} };
    }
  });
})();
