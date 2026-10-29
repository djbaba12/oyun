/* ==========================================================================
   ARCADE A — Yılan, Tetris, Flappy, Kırıcı, Pong
   ========================================================================== */
(function () {
  "use strict";
  const E = window.Engine;
  const { el, rnd, rand, clamp, pick, hud, overlay, boardWrap, touchControls, Sound, hidpi, Haptic } = E;
  const GAMES = (window.GAMES = window.GAMES || []);

  /* ====================================================================
     YILAN
     ==================================================================== */
  GAMES.push({
    id: "snake", title: "Yılan", emoji: "🐍", cat: "arcade", featured: true,
    desc: "Yem topla, uzа, kendine çarpma.",
    hint: "Kaydır / yön tuşları",
    mount(host, root) {
      const CELL = 20, COLS = 20, ROWS = 20;
      const SIZE = COLS * CELL;
      const canvas = E.makeCanvas(SIZE, SIZE);
      const drawCtx = hidpi(canvas, SIZE, SIZE);
      const wrap = boardWrap(canvas);
      const h = hud([{ label: "Skor", tone: "accent" }, { label: "Rekor" }, { label: "Hız" }]);
      root.appendChild(h.root);

      let snake, dir, nextDir, food, score, speed, timer, running, parts, bonus, bonusTick, lastMove;

      function reset() {
        snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
        dir = { x: 1, y: 0 }; nextDir = { x: 1, y: 0 };
        score = 0; speed = 1; parts = []; bonus = null; bonusTick = 0;
        h.set(0, 0); h.set(2, 1); h.set(1, host.best || 0);
        placeFood();
      }

      function placeFood() {
        let guard = 0;
        do {
          food = { x: rnd(COLS), y: rnd(ROWS) };
          guard++;
        } while (snake.some((s) => s.x === food.x && s.y === food.y) && guard < 900);
      }

      function burst(cx, cy, color, n) {
        for (let i = 0; i < (n || 10); i++) {
          parts.push({ x: cx, y: cy, vx: rand(-2.4, 2.4), vy: rand(-2.4, 2.4), life: 1, c: color });
        }
      }

      function draw() {
        const ctx = drawCtx;
        ctx.fillStyle = "#070a12";
        ctx.fillRect(0, 0, SIZE, SIZE);

        ctx.strokeStyle = "rgba(255,255,255,.028)";
        for (let i = 1; i < COLS; i++) {
          ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, SIZE); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(SIZE, i * CELL); ctx.stroke();
        }

        const pulse = 1 + Math.sin(Date.now() / 170) * 0.14;
        ctx.fillStyle = "#fb7185";
        ctx.shadowColor = "#fb7185";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, (CELL / 2 - 2) * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (bonus) {
          ctx.fillStyle = "#fbbf24";
          ctx.shadowColor = "#fbbf24";
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(bonus.x * CELL + CELL / 2, bonus.y * CELL + CELL / 2, CELL / 2 - 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        snake.forEach((s, i) => {
          const t = i / Math.max(snake.length - 1, 1);
          ctx.fillStyle = i === 0 ? "#67e8f9" : `hsl(${178 + t * 48}, 74%, ${65 - t * 24}%)`;
          ctx.beginPath();
          const r = i === 0 ? 7 : 5;
          ctx.roundRect(s.x * CELL + 1.5, s.y * CELL + 1.5, CELL - 3, CELL - 3, r);
          ctx.fill();
        });

        if (snake[0]) {
          const s = snake[0];
          ctx.fillStyle = "#04121a";
          const ox = dir.x * 4, oy = dir.y * 4;
          ctx.beginPath(); ctx.arc(s.x * CELL + CELL / 2 - 3 + ox, s.y * CELL + CELL / 2 - 2 + oy, 2, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.arc(s.x * CELL + CELL / 2 + 3 + ox, s.y * CELL + CELL / 2 - 2 + oy, 2, 0, 7); ctx.fill();
        }

        parts.forEach((q) => {
          ctx.globalAlpha = Math.max(q.life, 0);
          ctx.fillStyle = q.c;
          ctx.fillRect(q.x, q.y, 3, 3);
          ctx.globalAlpha = 1;
        });
      }

      function step() {
        dir = nextDir;
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) return gameOver("Duvara çarptın!");
        if (snake.slice(0, -1).some((s) => s.x === head.x && s.y === head.y)) return gameOver("Kuyruğuna çarptın!");

        snake.unshift(head);
        const ateFood = head.x === food.x && head.y === food.y;
        const ateBonus = bonus && head.x === bonus.x && head.y === bonus.y;

        if (ateFood) {
          burst(head.x * CELL + CELL / 2, head.y * CELL + CELL / 2, "#fb7185", 12);
          Sound.play("eat");
          score += 10;
          if (score % 50 === 0 && speed < 14) {
            speed++;
            h.set(2, speed);
            restartTimer();
            Haptic.tap(12);
          }
          placeFood();
        } else if (ateBonus) {
          burst(head.x * CELL + CELL / 2, head.y * CELL + CELL / 2, "#fbbf24", 16);
          Sound.play("coin");
          score += 50;
          bonus = null;
        } else {
          snake.pop();
        }

        h.set(0, score);

        bonusTick++;
        if (!bonus && bonusTick > 45 && Math.random() < 0.25) {
          let guard = 0;
          do {
            bonus = { x: rnd(COLS), y: rnd(ROWS) };
            guard++;
          } while ((snake.some((s) => s.x === bonus.x && s.y === bonus.y) ||
            (food.x === bonus.x && food.y === bonus.y)) && guard < 250);
          bonusTick = 0;
        }

        draw();
      }

      function restartTimer() {
        clearInterval(timer);
        timer = setInterval(step, Math.max(150 - speed * 11, 52));
      }

      function start() {
        E.removeOverlay(wrap);
        reset();
        running = true;
        restartTimer();
        draw();
      }

      function gameOver(reason) {
        running = false;
        clearInterval(timer);
        Sound.play("die");
        Haptic.tap(30);
        const isBest = host.record(score);
        h.set(1, host.best || 0);
        wrap.appendChild(overlay({
          title: "Oyun Bitti",
          big: score,
          msg: `${reason}${isBest ? " 🏆 Yeni rekor!" : ""}`,
          buttons: [{ label: "Tekrar Oyna", onClick: start }]
        }));
      }

      function setDir(x, y) {
        if (!running) return;
        if (dir.x === -x && dir.y === -y) return;
        if (dir.x === x && dir.y === y) return;
        nextDir = { x, y };
      }

      const stopKeys = E.onKey((e) => {
        const k = e.key.toLowerCase();
        if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "].includes(k)) e.preventDefault();
        if (k === "arrowup" || k === "w") setDir(0, -1);
        else if (k === "arrowdown" || k === "s") setDir(0, 1);
        else if (k === "arrowleft" || k === "a") setDir(-1, 0);
        else if (k === "arrowright" || k === "d") setDir(1, 0);
      });

      const disposeSwipe = E.swipe(wrap, {
        onSwipe(d) {
          if (d === "up") setDir(0, -1);
          else if (d === "down") setDir(0, 1);
          else if (d === "left") setDir(-1, 0);
          else setDir(1, 0);
        }
      });

      const pad = touchControls([
        { label: "▲", onPress: () => setDir(0, -1), aria: "Yukarı" },
        { label: "◀", onPress: () => setDir(-1, 0), aria: "Sol" },
        { label: "▼", onPress: () => setDir(0, 1), aria: "Aşağı" },
        { label: "▶", onPress: () => setDir(1, 0), aria: "Sağ" }
      ]);
      root.appendChild(wrap);
      root.appendChild(pad.node);

      reset();
      draw();
      wrap.appendChild(overlay({
        title: "🐍 Yılan",
        msg: "Kaydırarak veya yön tuşlarıyla oyna. Sarı bonus +50 puan!",
        buttons: [{ label: "Başla", onClick: start }]
      }));

      return { stop() { running = false; clearInterval(timer); stopKeys(); disposeSwipe(); pad.dispose(); } };
    }
  });

  /* ====================================================================
     TETRİS
     ==================================================================== */
  GAMES.push({
    id: "tetris", title: "Tetris", emoji: "🟦", cat: "classic", featured: true,
    desc: "Satırları tamamla, hızlan, rekor kır.",
    hint: "◀ ▶ hareket • ↻ döndür",
    mount(host, root) {
      const COLS = 10, ROWS = 20, CELL = 22;
      const BW = COLS * CELL, PANEL = 84;
      const W = BW + PANEL, H = ROWS * CELL;
      const canvas = E.makeCanvas(W, H);
      const ctx = hidpi(canvas, W, H);
      const wrap = boardWrap(canvas);
      const h = hud([{ label: "Skor", tone: "accent" }, { label: "Satır" }, { label: "Seviye" }, { label: "Rekor" }]);
      root.appendChild(h.root);

      const SHAPES = {
        I: [[1, 1, 1, 1]], J: [[1, 0, 0], [1, 1, 1]], L: [[0, 0, 1], [1, 1, 1]],
        O: [[1, 1], [1, 1]], S: [[0, 1, 1], [1, 1, 0]], T: [[0, 1, 0], [1, 1, 1]],
        Z: [[1, 1, 0], [0, 1, 1]]
      };
      const COLORS = { I: "#22d3ee", J: "#60a5fa", L: "#fbbf24", O: "#facc15", S: "#34d399", T: "#c084fc", Z: "#fb7185" };

      let board, piece, next, bag, score, lines, level, running, raf, lastDrop, dropMs, ghost;

      function newBag() { return E.shuffle(Object.keys(SHAPES)); }
      function randomPiece() {
        if (!bag.length) bag = newBag();
        const k = bag.pop();
        return { shape: SHAPES[k].map((r) => r.slice()), color: COLORS[k], x: 3, y: 0, k };
      }

      function reset() {
        board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        bag = newBag();
        next = randomPiece();
        piece = randomPiece();
        score = 0; lines = 0; level = 1; dropMs = 800; lastDrop = 0; ghost = true;
        h.set(0, 0); h.set(1, 0); h.set(2, 1); h.set(3, host.best || 0);
      }

      function collide(p, ox, oy) {
        ox = ox || 0; oy = oy || 0;
        for (let y = 0; y < p.shape.length; y++) {
          for (let x = 0; x < p.shape[y].length; x++) {
            if (!p.shape[y][x]) continue;
            const nx = p.x + x + ox, ny = p.y + y + oy;
            if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
            if (ny >= 0 && board[ny][nx]) return true;
          }
        }
        return false;
      }

      function rotateMat(m) {
        const hh = m.length, ww = m[0].length;
        const out = Array.from({ length: ww }, () => Array(hh).fill(0));
        for (let y = 0; y < hh; y++) for (let x = 0; x < ww; x++) out[x][hh - 1 - y] = m[y][x];
        return out;
      }

      function tryRotate() {
        if (!running) return;
        const r = rotateMat(piece.shape);
        const cand = { ...piece, shape: r };
        for (const kick of [0, -1, 1, -2, 2]) {
          if (!collide(cand, kick, 0)) {
            piece.shape = r;
            piece.x += kick;
            Sound.play("move");
            Haptic.tap(6);
            draw();
            return;
          }
        }
      }

      function merge() {
        piece.shape.forEach((row, y) => row.forEach((v, x) => {
          if (v && piece.y + y >= 0) board[piece.y + y][piece.x + x] = piece.color;
        }));
      }

      function clearLines() {
        let n = 0;
        for (let y = ROWS - 1; y >= 0; y--) {
          if (board[y].every(Boolean)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(null));
            n++; y++;
          }
        }
        if (n) {
          lines += n;
          score += [0, 100, 300, 500, 800][n] * level;
          const nl = Math.floor(lines / 10) + 1;
          if (nl !== level) { level = nl; Sound.play("level"); }
          dropMs = Math.max(90, 800 - (level - 1) * 65);
          h.set(0, score); h.set(1, lines); h.set(2, level);
          Sound.play(n >= 3 ? "line" : "brick");
          Haptic.tap(n >= 3 ? 25 : 12);
        }
      }

      function lock() {
        merge();
        clearLines();
        piece = next;
        next = randomPiece();
        if (collide(piece)) return gameOver();
        draw();
      }

      function softDrop() {
        if (!running) return;
        if (collide(piece, 0, 1)) lock();
        else { piece.y++; score++; h.set(0, score); }
        draw();
      }

      function move(dx) {
        if (!running) return;
        if (!collide(piece, dx, 0)) {
          piece.x += dx;
          Sound.play("move");
          Haptic.tap(5);
          draw();
        }
      }

      function hardDrop() {
        if (!running) return;
        while (!collide(piece, 0, 1)) { piece.y++; score += 2; }
        Sound.play("brick");
        Haptic.tap(16);
        lock();
      }

      function block(gx, gy, color, alpha) {
        const x = gx * CELL, y = gy * CELL;
        ctx.globalAlpha = alpha == null ? 1 : alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, CELL - 2, CELL - 2, 4);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.26)";
        ctx.beginPath();
        ctx.roundRect(x + 3, y + 3, CELL - 6, 4, 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      function draw() {
        ctx.fillStyle = "#070a12";
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = "rgba(255,255,255,.035)";
        for (let x = 0; x <= COLS; x++) {
          ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke();
        }
        for (let y = 0; y <= ROWS; y++) {
          ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(BW, y * CELL); ctx.stroke();
        }

        board.forEach((row, y) => row.forEach((c, x) => { if (c) block(x, y, c); }));

        if (running && piece) {
          if (ghost) {
            let gy = piece.y;
            while (!collide({ ...piece, y: gy }, 0, 1)) gy++;
            piece.shape.forEach((row, yy) => row.forEach((v, x) => {
              if (v) block(piece.x + x, gy + yy, piece.color, 0.16);
            }));
          }
          piece.shape.forEach((row, yy) => row.forEach((v, x) => {
            if (v) block(piece.x + x, piece.y + yy, piece.color);
          }));
        }

        // yan panel
        const px = BW + 14;
        ctx.fillStyle = "rgba(255,255,255,.05)";
        ctx.beginPath();
        ctx.roundRect(px - 8, 10, PANEL - 12, 88, 10);
        ctx.fill();
        ctx.fillStyle = "#6d7594";
        ctx.font = "600 9px Segoe UI, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("SIRADAKİ", px + (PANEL - 26) / 2, 26);
        if (next) {
          const s = 13;
          const nx = px + (PANEL - 26) / 2;
          const offX = nx - (next.shape[0].length * s) / 2;
          const offY = 52 - (next.shape.length * s) / 2;
          next.shape.forEach((row, y) => row.forEach((v, x) => {
            if (!v) return;
            ctx.fillStyle = next.color;
            ctx.beginPath();
            ctx.roundRect(offX + x * s, offY + y * s, s - 2, s - 2, 3);
            ctx.fill();
          }));
        }
        ctx.textAlign = "left";
      }

      function loop(ts) {
        if (!running) return;
        if (!lastDrop) lastDrop = ts;
        if (ts - lastDrop > dropMs) { lastDrop = ts; softDrop(); }
        draw();
        raf = requestAnimationFrame(loop);
      }

      function start() {
        E.removeOverlay(wrap);
        reset();
        running = true;
        lastDrop = 0;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }

      function gameOver() {
        running = false;
        cancelAnimationFrame(raf);
        Sound.play("die");
        Haptic.tap(40);
        const isBest = host.record(score);
        h.set(3, host.best || 0);
        wrap.appendChild(overlay({
          title: "Oyun Bitti",
          big: score,
          msg: `${lines} satır${isBest ? " — 🏆 Yeni rekor!" : ""}`,
          buttons: [{ label: "Tekrar Oyna", onClick: start }]
        }));
      }

      const stopKeys = E.onKey((e) => {
        if (!running) return;
        const k = e.key;
        if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(k)) e.preventDefault();
        if (k === "ArrowLeft") move(-1);
        else if (k === "ArrowRight") move(1);
        else if (k === "ArrowDown") softDrop();
        else if (k === "ArrowUp") tryRotate();
        else if (k === " ") hardDrop();
        else if (k.toLowerCase() === "g") { ghost = !ghost; draw(); }
      });

      E.swipe(wrap, {
        onSwipe(d) {
          if (!running) return;
          if (d === "left") move(-1);
          else if (d === "right") move(1);
          else if (d === "down") softDrop();
          else if (d === "up") tryRotate();
        }
      });

      const pad = touchControls([
        { label: "◀", onPress: () => move(-1), repeat: true, aria: "Sol" },
        { label: "↻", onPress: tryRotate, aria: "Döndür" },
        { label: "▼", onPress: softDrop, repeat: true, aria: "Aşağı" },
        { label: "▶", onPress: () => move(1), repeat: true, aria: "Sağ" },
        { label: "⤓", onPress: hardDrop, aria: "Hemen düşür" }
      ]);
      root.appendChild(wrap);
      root.appendChild(pad.node);

      reset();
      draw();
      wrap.appendChild(overlay({
        title: "🟦 Tetris",
        msg: "Kaydır: hareket • Yukarı: döndür • Aşağı: hızlandır",
        buttons: [{ label: "Başla", onClick: start }]
      }));

      return { stop() { running = false; cancelAnimationFrame(raf); stopKeys(); pad.dispose(); } };
    }
  });

  /* ====================================================================
     FLAPPY
     ==================================================================== */
  GAMES.push({
    id: "flappy", title: "Flappy Kuş", emoji: "🐤", cat: "arcade",
    desc: "Boşluklardan geç, dokun ve uç.",
    hint: "Dokun / Boşluk",
    mount(host, root) {
      const W = 360, H = 560;
      const canvas = E.makeCanvas(W, H, { maxWidth: "420px" });
      const ctx = hidpi(canvas, W, H);
      const wrap = boardWrap(canvas);
      const h = hud([{ label: "Skor", tone: "accent" }, { label: "Rekor" }]);
      root.appendChild(h.root);
      root.appendChild(wrap);

      const GRAV = 0.38, JUMP = -6.6, PIPE_W = 58, GAP = 148, SPEED = 2.3;
      let bird, pipes, score, running, raf, t, started;

      function reset() {
        bird = { x: 84, y: H / 2, vy: 0, r: 13 };
        pipes = []; score = 0; t = 0; started = false;
        h.set(0, 0); h.set(1, host.best || 0);
      }

      function spawn() {
        const margin = 64;
        const top = rnd(H - GAP - margin * 2) + margin;
        pipes.push({ x: W + 20, top, scored: false });
      }

      function flap() {
        if (!running) return;
        bird.vy = JUMP;
        Sound.play("jump");
        Haptic.tap(5);
      }

      function update() {
        t++;
        if (!started) { bird.y = H / 2 + Math.sin(t / 11) * 9; return; }
        bird.vy += GRAV;
        bird.y += bird.vy;

        if (t % 88 === 0) spawn();
        pipes.forEach((p) => {
          p.x -= SPEED;
          if (!p.scored && p.x + PIPE_W < bird.x - bird.r) {
            p.scored = true; score++;
            h.set(0, score);
            Sound.play("point");
          }
        });
        pipes = pipes.filter((p) => p.x > -PIPE_W - 10);

        if (bird.y + bird.r > H - 40 || bird.y - bird.r < 0) return over();
        for (const p of pipes) {
          if (bird.x + bird.r > p.x && bird.x - bird.r < p.x + PIPE_W) {
            if (bird.y - bird.r < p.top || bird.y + bird.r > p.top + GAP) return over();
          }
        }
      }

      function draw() {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#0a2740");
        g.addColorStop(0.55, "#0f3d55");
        g.addColorStop(1, "#0a1524");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "rgba(255,255,255,.26)";
        for (let i = 0; i < 26; i++) {
          ctx.fillRect((i * 137 + t * 0.2) % W, (i * 97) % (H - 80), 2, 2);
        }

        pipes.forEach((p) => {
          const grd = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
          grd.addColorStop(0, "#16a34a");
          grd.addColorStop(0.5, "#4ade80");
          grd.addColorStop(1, "#15803d");
          ctx.fillStyle = grd;
          ctx.fillRect(p.x, 0, PIPE_W, p.top);
          ctx.fillRect(p.x, p.top + GAP, PIPE_W, H - p.top - GAP - 40);
          ctx.fillStyle = "#166534";
          ctx.fillRect(p.x - 3, p.top - 14, PIPE_W + 6, 14);
          ctx.fillRect(p.x - 3, p.top + GAP, PIPE_W + 6, 14);
        });

        ctx.fillStyle = "#1b2b18";
        ctx.fillRect(0, H - 40, W, 40);
        ctx.fillStyle = "#2d4626";
        for (let x = -(t * 0.7) % 28; x < W; x += 28) ctx.fillRect(x, H - 40, 14, 40);

        const rot = clamp(bird.vy * 0.055, -0.5, 0.9);
        ctx.save();
        ctx.translate(bird.x, bird.y);
        ctx.rotate(rot);
        ctx.fillStyle = "#facc15";
        ctx.shadowColor = "rgba(250,204,21,.65)";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.ellipse(0, 0, bird.r + 4, bird.r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.ellipse(2, 4, bird.r - 4, bird.r - 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111";
        ctx.beginPath(); ctx.arc(6, -4, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#f97316";
        ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(22, 3); ctx.lineTo(13, 6); ctx.closePath(); ctx.fill();
        ctx.restore();

        ctx.fillStyle = "rgba(255,255,255,.94)";
        ctx.font = "800 42px Segoe UI, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(score), W / 2, 66);
        ctx.textAlign = "left";
      }

      function loop() {
        if (!running) return;
        update();
        draw();
        raf = requestAnimationFrame(loop);
      }

      function start() {
        E.removeOverlay(wrap);
        reset();
        running = true;
        started = true;
        flap();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }

      function over() {
        running = false;
        cancelAnimationFrame(raf);
        Sound.play("die");
        Haptic.tap(35);
        const isBest = host.record(score);
        h.set(1, host.best || 0);
        wrap.appendChild(overlay({
          title: "Çarptın!",
          big: score,
          msg: isBest ? "🏆 Yeni rekor!" : "Tekrar dene!",
          buttons: [{ label: "Tekrar Dene", onClick: start }]
        }));
      }

      canvas.addEventListener("mousedown", flap);
      canvas.addEventListener("touchstart", (e) => { e.preventDefault(); flap(); }, { passive: false });
      const stopKeys = E.onKey((e) => {
        if (e.code === "Space" || e.key === "ArrowUp" || e.key === "Enter") {
          e.preventDefault();
          flap();
        }
      });

      reset();
      draw();
      wrap.appendChild(overlay({
        title: "🐤 Flappy Kuş",
        msg: "Ekrana dokunarak kanat çırp. Borulara çarpmadan geç!",
        buttons: [{ label: "Başla", onClick: start }]
      }));
      return { stop() { running = false; cancelAnimationFrame(raf); stopKeys(); } };
    }
  });

  /* ====================================================================
     KIRICI
     ==================================================================== */
  GAMES.push({
    id: "breakout", title: "Kırıcı", emoji: "🧱", cat: "arcade",
    desc: "Tüm tuğlaları kır, topu düşürme.",
    hint: "Sürükle / ← →",
    mount(host, root) {
      const W = 420, H = 520;
      const canvas = E.makeCanvas(W, H);
      const ctx = hidpi(canvas, W, H);
      const wrap = boardWrap(canvas);
      const h = hud([{ label: "Skor", tone: "accent" }, { label: "Can" }, { label: "Seviye" }, { label: "Rekor" }]);
      root.appendChild(h.root);
      root.appendChild(wrap);

      const COLS = 8, ROWS = 6, BH = 18, PAD_W = 82, PAD_H = 12;
      let bricks, paddle, ball, score, lives, level, running, raf, left, right, targetX;

      function build() {
        bricks = [];
        const bw = (W - 16) / COLS;
        const palette = ["#fb7185", "#f472b6", "#c084fc", "#818cf8", "#60a5fa", "#22d3ee"];
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            bricks.push({
              x: 8 + c * bw + 2,
              y: 50 + r * (BH + 4),
              w: bw - 4,
              h: BH,
              color: palette[r % palette.length],
              hp: r < 2 && level > 1 ? 2 : 1,
              alive: true
            });
          }
        }
      }

      function resetBall() {
        paddle = { x: W / 2 - PAD_W / 2 };
        ball = { x: W / 2, y: H - 60, vx: rand(-2.6, 2.6), vy: -3.8, r: 7, stuck: true };
      }

      function reset(full) {
        if (full) { score = 0; lives = 3; level = 1; }
        build();
        resetBall();
        h.set(0, score);
        h.set(1, "❤️".repeat(Math.max(lives, 0)) || "💀");
        h.set(2, level);
        h.set(3, host.best || 0);
        draw();
      }

      function update() {
        if (left) paddle.x -= 7;
        if (right) paddle.x += 7;
        if (targetX != null) paddle.x += clamp(targetX - (paddle.x + PAD_W / 2), -12, 12);
        paddle.x = clamp(paddle.x, 0, W - PAD_W);

        if (ball.stuck) {
          ball.x = paddle.x + PAD_W / 2;
          ball.y = H - 62;
          return;
        }

        ball.x += ball.vx;
        ball.y += ball.vy;

        if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx *= -1; Sound.play("paddle"); }
        if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx *= -1; Sound.play("paddle"); }
        if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy *= -1; Sound.play("paddle"); }

        if (ball.y + ball.r > H - 34 && ball.y < H - 34 + PAD_H && ball.vy > 0 &&
            ball.x > paddle.x - 4 && ball.x < paddle.x + PAD_W + 4) {
          ball.y = H - 34 - ball.r;
          const hit = (ball.x - (paddle.x + PAD_W / 2)) / (PAD_W / 2);
          ball.vx = hit * 5;
          ball.vy = -clamp(Math.abs(ball.vy) + 0.25, 3.2, 7.5);
          Sound.play("hit");
          Haptic.tap(8);
        }

        for (const b of bricks) {
          if (!b.alive) continue;
          if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
              ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
            b.hp--;
            if (b.hp <= 0) { b.alive = false; score += 10; } else score += 5;
            h.set(0, score);
            Sound.play("brick");
            const ox = Math.min(Math.abs(ball.x - b.x), Math.abs(ball.x - (b.x + b.w)));
            const oy = Math.min(Math.abs(ball.y - b.y), Math.abs(ball.y - (b.y + b.h)));
            if (oy < ox) ball.vy *= -1; else ball.vx *= -1;
            break;
          }
        }

        if (bricks.every((b) => !b.alive)) return winLevel();

        if (ball.y - ball.r > H) {
          lives--;
          h.set(1, lives > 0 ? "❤️".repeat(lives) : "💀");
          Sound.play("miss");
          Haptic.tap(25);
          if (lives <= 0) return gameOver();
          resetBall();
        }
      }

      function draw() {
        ctx.fillStyle = "#06080f";
        ctx.fillRect(0, 0, W, H);

        bricks.forEach((b) => {
          if (!b.alive) return;
          ctx.fillStyle = b.color;
          if (b.hp > 1) { ctx.shadowColor = b.color; ctx.shadowBlur = 12; }
          ctx.beginPath();
          ctx.roundRect(b.x, b.y, b.w, b.h, 5);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255,255,255,.3)";
          ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, 3);
          if (b.hp > 1) {
            ctx.strokeStyle = "rgba(255,255,255,.85)";
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        });

        const pg = ctx.createLinearGradient(paddle.x, 0, paddle.x + PAD_W, 0);
        pg.addColorStop(0, "#22d3ee");
        pg.addColorStop(1, "#7c5cff");
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.roundRect(paddle.x, H - 34, PAD_W, PAD_H, 6);
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.shadowColor = "#a5b4fc";
        ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

      function loop() {
        if (!running) return;
        update();
        draw();
        raf = requestAnimationFrame(loop);
      }

      function start() {
        E.removeOverlay(wrap);
        reset(true);
        running = true;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }

      function winLevel() {
        running = false;
        cancelAnimationFrame(raf);
        Sound.play("level");
        level++;
        wrap.appendChild(overlay({
          title: "Seviye Temiz! 🎉",
          big: score,
          msg: "Sonraki seviye daha zor!",
          buttons: [{ label: "Devam", onClick: () => {
            E.removeOverlay(wrap);
            reset(false);
            running = true;
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(loop);
          } }]
        }));
      }

      function gameOver() {
        running = false;
        cancelAnimationFrame(raf);
        Sound.play("die");
        const isBest = host.record(score);
        h.set(3, host.best || 0);
        wrap.appendChild(overlay({
          title: "Oyun Bitti",
          big: score,
          msg: isBest ? "🏆 Yeni rekor!" : "Tekrar dene!",
          buttons: [{ label: "Tekrar Oyna", onClick: start }]
        }));
      }

      function launch() {
        if (running && ball.stuck) {
          ball.stuck = false;
          ball.vy = -4;
          Sound.play("jump");
        }
      }

      canvas.addEventListener("mousedown", (e) => { launch(); targetX = E.pointerPos(canvas, e).x; });
      canvas.addEventListener("mousemove", (e) => { if (e.buttons) targetX = E.pointerPos(canvas, e).x; });
      canvas.addEventListener("touchstart", (e) => { e.preventDefault(); launch(); targetX = E.pointerPos(canvas, e).x; }, { passive: false });
      canvas.addEventListener("touchmove", (e) => { targetX = E.pointerPos(canvas, e).x; }, { passive: true });
      canvas.addEventListener("touchend", () => { targetX = null; });

      const stopKeys = E.onKey((e) => {
        if (e.key === "ArrowLeft") { e.preventDefault(); left = true; targetX = null; }
        if (e.key === "ArrowRight") { e.preventDefault(); right = true; targetX = null; }
        if (e.code === "Space") { e.preventDefault(); launch(); }
      });
      const stopKeysUp = E.onKey((e) => {
        if (e.key === "ArrowLeft") left = false;
        if (e.key === "ArrowRight") right = false;
      }, true);

      const pad = touchControls([
        { label: "◀", onPress: () => { left = true; targetX = null; }, onRelease: () => { left = false; }, aria: "Sol" },
        { label: "Başlat", onPress: launch, aria: "Topu fırlat" },
        { label: "▶", onPress: () => { right = true; targetX = null; }, onRelease: () => { right = false; }, aria: "Sağ" }
      ]);
      root.appendChild(pad.node);

      reset(true);
      wrap.appendChild(overlay({
        title: "🧱 Kırıcı",
        msg: "Parmağını sürükleyerek raketi hareket ettir. Dokun = topu fırlat.",
        buttons: [{ label: "Başla", onClick: start }]
      }));

      return { stop() { running = false; cancelAnimationFrame(raf); stopKeys(); stopKeysUp(); pad.dispose(); } };
    }
  });

  /* ====================================================================
     PONG
     ==================================================================== */
  GAMES.push({
    id: "pong", title: "Pong", emoji: "🏓", cat: "classic",
    desc: "Efsanevi 2D tenis, AI'ye karşı.",
    hint: "Sürükle / ↑ ↓",
    mount(host, root) {
      const W = 420, H = 520;
      const canvas = E.makeCanvas(W, H, { maxWidth: "460px" });
      const ctx = hidpi(canvas, W, H);
      const wrap = boardWrap(canvas);
      const h = hud([{ label: "Sen", tone: "good" }, { label: "Bot", tone: "bad" }, { label: "Tur" }]);
      root.appendChild(h.root);
      root.appendChild(wrap);

      const PH = 74, PW = 11;
      let playerY, botY, ball, rounds, running, raf, up, down, targetY, difficulty = 1;

      function reset() {
        playerY = H / 2 - PH / 2;
        botY = H / 2 - PH / 2;
        rounds = 3;
        h.set(0, 0); h.set(1, 0); h.set(2, "●●●");
        newBall(true);
      }

      function newBall(toPlayer) {
        ball = {
          x: W / 2, y: H / 2,
          vx: (toPlayer ? -1 : 1) * rand(3.4, 4.2),
          vy: rand(-2.2, 2.2),
          r: 7
        };
      }

      function update() {
        if (up) playerY -= 6.2;
        if (down) playerY += 6.2;
        if (targetY != null) playerY += clamp(targetY - (playerY + PH / 2), -14, 14);
        playerY = clamp(playerY, 0, H - PH);

        const speed = 2.8 + difficulty * 0.6;
        botY += clamp((ball.y - PH / 2) - botY, -speed, speed);
        botY = clamp(botY, 0, H - PH);

        ball.x += ball.vx;
        ball.y += ball.vy;
        if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy *= -1; Sound.play("paddle"); }
        if (ball.y + ball.r > H) { ball.y = H - ball.r; ball.vy *= -1; Sound.play("paddle"); }

        if (ball.vx < 0 && ball.x - ball.r < PW + 16 && ball.x > 8 &&
            ball.y > playerY && ball.y < playerY + PH) {
          ball.x = PW + 16 + ball.r;
          ball.vx = Math.abs(ball.vx) * 1.04;
          ball.vy += (ball.y - (playerY + PH / 2)) * 0.12;
          Sound.play("hit");
          Haptic.tap(6);
        }
        if (ball.vx > 0 && ball.x + ball.r > W - PW - 16 && ball.x < W - 8 &&
            ball.y > botY && ball.y < botY + PH) {
          ball.x = W - PW - 16 - ball.r;
          ball.vx = -Math.abs(ball.vx) * 1.04;
          ball.vy += (ball.y - (botY + PH / 2)) * 0.12;
          Sound.play("hit");
        }
        ball.vy = clamp(ball.vy, -7, 7);

        if (ball.x < -20) botScored();
        if (ball.x > W + 20) playerScored();
      }

      function playerScored() {
        h.set(0, Number(h.get(0)) + 1);
        Sound.play("point");
        newBall(false);
      }

      function botScored() {
        rounds--;
        h.set(1, Number(h.get(1)) + 1);
        h.set(2, rounds > 0 ? "●".repeat(rounds) : "💀");
        Sound.play("miss");
        Haptic.tap(25);
        if (rounds <= 0) return gameOver();
        newBall(true);
      }

      function draw() {
        ctx.fillStyle = "#06080f";
        ctx.fillRect(0, 0, W, H);
        ctx.setLineDash([10, 14]);
        ctx.strokeStyle = "rgba(124,92,255,.32)";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#22d3ee";
        ctx.beginPath(); ctx.roundRect(16, playerY, PW, PH, 6); ctx.fill();
        ctx.fillStyle = "#fb7185";
        ctx.beginPath(); ctx.roundRect(W - PW - 16, botY, PW, PH, 6); ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.shadowColor = "#a5b4fc";
        ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

      function loop() {
        if (!running) return;
        update();
        draw();
        raf = requestAnimationFrame(loop);
      }

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
        wrap.appendChild(overlay({
          title: "Kaybettin",
          big: h.get(1) + " - " + h.get(0),
          msg: "Bot 3 tur kazandı. Zorluğu artırıp tekrar dene!",
          buttons: [{ label: "Tekrar Oyna", onClick: start }]
        }));
      }

      canvas.addEventListener("mousedown", (e) => { targetY = E.pointerPos(canvas, e).y; });
      canvas.addEventListener("mousemove", (e) => { if (e.buttons) targetY = E.pointerPos(canvas, e).y; });
      canvas.addEventListener("touchstart", (e) => { e.preventDefault(); targetY = E.pointerPos(canvas, e).y; }, { passive: false });
      canvas.addEventListener("touchmove", (e) => { targetY = E.pointerPos(canvas, e).y; }, { passive: true });
      canvas.addEventListener("touchend", () => { targetY = null; });

      const stopKeys = E.onKey((e) => {
        if (e.key === "ArrowUp") { e.preventDefault(); up = true; targetY = null; }
        if (e.key === "ArrowDown") { e.preventDefault(); down = true; targetY = null; }
      });
      const stopKeysUp = E.onKey((e) => {
        if (e.key === "ArrowUp") up = false;
        if (e.key === "ArrowDown") down = false;
      }, true);

      const pad = touchControls([
        { label: "▲", onPress: () => { up = true; targetY = null; }, onRelease: () => { up = false; } },
        { label: "▼", onPress: () => { down = true; targetY = null; }, onRelease: () => { down = false; } }
      ]);
      root.appendChild(pad.node);

      reset();
      draw();
      wrap.appendChild(overlay({
        title: "🏓 Pong",
        msg: "Raketini sürükleyerek topu karşıla. 3 tur kaybedersen oyun biter.",
        buttons: [{ label: "Başla", onClick: start }]
      }));
      return { stop() { running = false; cancelAnimationFrame(raf); stopKeys(); stopKeysUp(); pad.dispose(); } };
    }
  });
})();
