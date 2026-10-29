/* ==========================================================================
   ARCADE B — Yıldız Savunması, Asteroit, Tırmanıcı, Hedef, Basket, Balon
   ========================================================================== */
(function () {
  "use strict";
  const E = window.Engine;
  const { el, rnd, rand, clamp, pick, hud, overlay, boardWrap, touchControls, Sound, hidpi, Haptic } = E;
  const GAMES = window.GAMES;

  /* ====================================================================
     YILDIZ SAVUNMASI
     ==================================================================== */
  GAMES.push({
    id: "shooter", title: "Yıldız Savunması", emoji: "🚀", cat: "arcade", featured: true,
    desc: "Uzay gemisiyle dalgaları püskürt.",
    hint: "Sürükle / ← → / Boşluk",
    mount(host, root) {
      const W = 400, H = 560;
      const canvas = E.makeCanvas(W, H);
      const ctx = hidpi(canvas, W, H);
      const wrap = boardWrap(canvas);
      const h = hud([{ label: "Skor", tone: "accent" }, { label: "Can" }, { label: "Dalga" }, { label: "Rekor" }]);
      root.appendChild(h.root);
      root.appendChild(wrap);

      let ship, bullets, enemies, parts, stars, score, lives, wave, running, raf, last;
      let spawnCd, waveT, shake, fireCd, leftKey, rightKey, targetX, dragging;

      function reset() {
        ship = { x: W / 2, y: H - 46, w: 30, h: 26 };
        bullets = []; enemies = []; parts = [];
        stars = Array.from({ length: 60 }, () => ({ x: rnd(W), y: rnd(H), s: rand(0.3, 1.5) }));
        score = 0; lives = 3; wave = 1;
        spawnCd = 0; waveT = 0; shake = 0; fireCd = 0; targetX = null;
        leftKey = rightKey = false; dragging = false;
        h.set(0, 0); h.set(1, "❤️❤️❤️"); h.set(2, 1); h.set(3, host.best || 0);
      }

      function burst(x, y, color, n) {
        for (let i = 0; i < (n || 10); i++) {
          parts.push({ x, y, vx: rand(-3, 3), vy: rand(-3, 3), life: 1, c: color });
        }
      }

      function spawnEnemy() {
        const kind = rnd(3);
        const w = 22 + kind * 7;
        enemies.push({
          x: rand(14, Math.max(20, W - 14 - w)), y: -w, w, h: w * 0.8,
          vy: 1 + wave * 0.14 + rand(0, 0.5),
          vx: rand(-0.5, 0.5),
          wob: rand(0, 6.28),
          hp: kind === 2 ? 3 : kind === 1 ? 2 : 1,
          hue: kind === 2 ? 300 : kind === 1 ? 40 : 190,
          flash: 0
        });
      }

      function shoot() {
        if (fireCd > 0) return;
        fireCd = 8;
        bullets.push({ x: ship.x - 8, y: ship.y - 16 }, { x: ship.x + 8, y: ship.y - 16 });
        Sound.play("shoot");
      }

      function update(dt) {
        stars.forEach((s) => {
          s.y += s.s * dt;
          if (s.y > H) { s.y = -2; s.x = rnd(W); }
        });

        if (leftKey) ship.x -= 6 * dt;
        if (rightKey) ship.x += 6 * dt;
        if (targetX != null) ship.x += clamp(targetX - ship.x, -10 * dt, 10 * dt);
        ship.x = clamp(ship.x, ship.w / 2, W - ship.w / 2);

        fireCd -= dt;
        shoot();

        bullets.forEach((b) => { b.y -= 10.5 * dt; });
        bullets = bullets.filter((b) => b.y > -16);

        spawnCd += dt;
        if (spawnCd > Math.max(40 - wave * 2.5, 12)) { spawnCd = 0; spawnEnemy(); }

        enemies.forEach((e) => {
          e.y += e.vy * dt;
          e.wob += 0.05 * dt;
          e.x = clamp(e.x + Math.sin(e.wob) * 0.7 + e.vx * dt, 0, W - e.w);
          if (e.flash > 0) e.flash -= 0.08 * dt;
        });

        for (let bi = bullets.length - 1; bi >= 0; bi--) {
          const b = bullets[bi];
          for (let ei = enemies.length - 1; ei >= 0; ei--) {
            const e = enemies[ei];
            if (b.x > e.x && b.x < e.x + e.w && b.y < e.y + e.h && b.y > e.y) {
              bullets.splice(bi, 1);
              e.hp--; e.flash = 1;
              if (e.hp <= 0) {
                burst(e.x + e.w / 2, e.y + e.h / 2, `hsl(${e.hue},85%,64%)`, 14);
                enemies.splice(ei, 1);
                score += 10;
                h.set(0, score);
                Sound.play("pop");
                shake = 3;
              }
              break;
            }
          }
        }

        for (let ei = enemies.length - 1; ei >= 0; ei--) {
          const e = enemies[ei];
          if (e.y + e.h > H - 6) {
            burst(e.x + e.w / 2, H - 10, "#fb7185", 9);
            enemies.splice(ei, 1);
            lives--;
            h.set(1, lives > 0 ? "❤️".repeat(lives) : "💀");
            Sound.play("miss");
            Haptic.tap(25);
            shake = 8;
            if (lives <= 0) return gameOver();
          }
        }

        parts.forEach((p) => {
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.vy += 0.07 * dt;
          p.life -= 0.028 * dt;
        });
        parts = parts.filter((p) => p.life > 0);
        if (shake > 0) shake -= 0.5 * dt;

        waveT += dt;
        if (waveT > 650) {
          waveT = 0; wave++;
          h.set(2, wave);
          Sound.play("level");
          host.toast("Dalga " + wave + " — hızlandı! 🚀", "good");
        }
      }

      function draw() {
        ctx.save();
        if (shake > 0) ctx.translate(rand(-shake, shake), rand(-shake, shake));
        ctx.fillStyle = "#05070f";
        ctx.fillRect(-10, -10, W + 20, H + 20);

        stars.forEach((s) => {
          ctx.fillStyle = `rgba(190,220,255,${0.2 + s.s * 0.3})`;
          ctx.fillRect(s.x, s.y, s.s, s.s * 2.2);
        });

        enemies.forEach((e) => {
          ctx.fillStyle = e.flash > 0 ? "#fff" : `hsl(${e.hue},80%,62%)`;
          ctx.shadowColor = `hsl(${e.hue},80%,62%)`;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(e.x + e.w / 2, e.y + e.h);
          ctx.lineTo(e.x, e.y);
          ctx.lineTo(e.x + e.w, e.y);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(0,0,0,.5)";
          ctx.fillRect(e.x + e.w * 0.35, e.y + e.h * 0.3, e.w * 0.3, e.h * 0.2);
        });

        ctx.fillStyle = "#67e8f9";
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 8;
        bullets.forEach((b) => ctx.fillRect(b.x - 1.6, b.y - 11, 3.2, 14));
        ctx.shadowBlur = 0;

        ctx.fillStyle = "#22d3ee";
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(ship.x, ship.y - ship.h);
        ctx.lineTo(ship.x - ship.w / 2, ship.y + ship.h / 2);
        ctx.lineTo(ship.x - ship.w / 5, ship.y + ship.h / 3);
        ctx.lineTo(ship.x + ship.w / 5, ship.y + ship.h / 3);
        ctx.lineTo(ship.x + ship.w / 2, ship.y + ship.h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(251,146,60,${0.5 + Math.random() * 0.5})`;
        ctx.beginPath();
        ctx.moveTo(ship.x - 4, ship.y + ship.h / 3);
        ctx.lineTo(ship.x + 4, ship.y + ship.h / 3);
        ctx.lineTo(ship.x, ship.y + ship.h / 3 + 10 + Math.random() * 9);
        ctx.closePath();
        ctx.fill();

        parts.forEach((p) => {
          ctx.globalAlpha = Math.max(p.life, 0);
          ctx.fillStyle = p.c;
          ctx.fillRect(p.x, p.y, 3, 3);
          ctx.globalAlpha = 1;
        });
        ctx.restore();
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

      function gameOver() {
        running = false;
        cancelAnimationFrame(raf);
        Sound.play("die");
        Haptic.tap(40);
        const isBest = host.record(score);
        h.set(3, host.best || 0);
        wrap.appendChild(overlay({
          title: "Gemi düştü!",
          big: score,
          msg: `Dalga ${wave}${isBest ? " — 🏆 Yeni rekor!" : ""}`,
          buttons: [{ label: "Tekrar Oyna", onClick: start }]
        }));
      }

      canvas.addEventListener("mousedown", () => { dragging = true; });
      canvas.addEventListener("mousemove", (e) => { if (dragging) targetX = E.pointerPos(canvas, e).x; });
      window.addEventListener("mouseup", () => { dragging = false; });
      canvas.addEventListener("touchstart", (e) => { e.preventDefault(); targetX = E.pointerPos(canvas, e).x; }, { passive: false });
      canvas.addEventListener("touchmove", (e) => { targetX = E.pointerPos(canvas, e).x; }, { passive: true });

      const stopKeys = E.onKey((e) => {
        if (e.key === "ArrowLeft" || e.key === "a") { e.preventDefault(); leftKey = true; targetX = null; }
        if (e.key === "ArrowRight" || e.key === "d") { e.preventDefault(); rightKey = true; targetX = null; }
        if (e.code === "Space") { e.preventDefault(); shoot(); }
      });
      const stopKeysUp = E.onKey((e) => {
        if (e.key === "ArrowLeft" || e.key === "a") leftKey = false;
        if (e.key === "ArrowRight" || e.key === "d") rightKey = false;
      }, true);

      const pad = touchControls([
        { label: "◀", onPress: () => { leftKey = true; targetX = null; }, onRelease: () => { leftKey = false; }, aria: "Sol" },
        { label: "🚀", onPress: shoot, aria: "Ateş" },
        { label: "▶", onPress: () => { rightKey = true; targetX = null; }, onRelease: () => { rightKey = false; }, aria: "Sağ" }
      ]);
      root.appendChild(pad.node);

      reset();
      draw();
      wrap.appendChild(overlay({
        title: "🚀 Yıldız Savunması",
        msg: "Parmağını sürükle veya yön tuşlarını kullan. Otomatik ateş açık!",
        buttons: [{ label: "Başla", onClick: start }]
      }));
      return { stop() { running = false; cancelAnimationFrame(raf); stopKeys(); stopKeysUp(); pad.dispose(); } };
    }
  });

  /* ====================================================================
     ASTEROİT
     ==================================================================== */
  GAMES.push({
    id: "asteroid", title: "Asteroit", emoji: "☄️", cat: "arcade",
    desc: "Asteroitlerden kaç, ne kadar dayanabilirsin?",
    hint: "Sürükle / ← →",
    mount(host, root) {
      const W = 400, H = 560;
      const canvas = E.makeCanvas(W, H);
      const ctx = hidpi(canvas, W, H);
      const wrap = boardWrap(canvas);
      const h = hud([{ label: "Süre", tone: "accent" }, { label: "Rekor" }]);
      root.appendChild(h.root);
      root.appendChild(wrap);

      let shipX, rocks, stars, running, raf, last, tSec, elapsed, spawnCd, speedMul;
      let leftKey, rightKey, targetX, flash;

      function reset() {
        shipX = W / 2;
        rocks = [];
        stars = Array.from({ length: 40 }, () => ({ x: rnd(W), y: rnd(H), s: rand(0.3, 1.2) }));
        tSec = 0; elapsed = 0; spawnCd = 0; speedMul = 1; flash = 0;
        leftKey = rightKey = false; targetX = null;
        h.set(0, "0.0s");
        h.set(1, host.best ? Number(host.best).toFixed(1) + "s" : "—");
      }

      function spawnRock() {
        const r = rand(12, 26);
        rocks.push({
          x: rand(r, W - r), y: -r, r,
          vy: rand(1.4, 2.6) * speedMul,
          vx: rand(-0.7, 0.7),
          rot: rand(0, 6.28),
          vr: rand(-0.04, 0.04),
          pts: Array.from({ length: 7 }, () => rand(0.72, 1.15))
        });
      }

      function update(dt) {
        stars.forEach((s) => {
          s.y += s.s * 2 * dt;
          if (s.y > H) { s.y = -2; s.x = rnd(W); }
        });

        if (leftKey) shipX -= 6.2 * dt;
        if (rightKey) shipX += 6.2 * dt;
        if (targetX != null) shipX += clamp(targetX - shipX, -11 * dt, 11 * dt);
        shipX = clamp(shipX, 18, W - 18);

        elapsed += dt / 60;
        if (elapsed - tSec > 0.09) {
          tSec = elapsed;
          h.set(0, elapsed.toFixed(1) + "s");
        }

        speedMul = 1 + elapsed / 26;
        spawnCd += dt;
        if (spawnCd > Math.max(32 - elapsed * 1.1, 9)) { spawnCd = 0; spawnRock(); }

        for (let i = rocks.length - 1; i >= 0; i--) {
          const r = rocks[i];
          r.y += r.vy * dt;
          r.x += r.vx * dt;
          r.rot += r.vr * dt;
          if (r.x < r.r) { r.x = r.r; r.vx *= -1; }
          if (r.x > W - r.r) { r.x = W - r.r; r.vx *= -1; }
          const dy = r.y - (H - 34);
          if (dy < r.r + 14 && dy > -r.r - 10 && Math.abs(r.x - shipX) < r.r + 13) return over();
          if (r.y - r.r > H + 20) rocks.splice(i, 1);
        }
        if (flash > 0) flash -= 0.05 * dt;
      }

      function draw() {
        ctx.fillStyle = "#05070f";
        ctx.fillRect(0, 0, W, H);

        stars.forEach((s) => {
          ctx.fillStyle = `rgba(200,225,255,${0.2 + s.s * 0.25})`;
          ctx.fillRect(s.x, s.y, s.s, s.s * 2);
        });

        rocks.forEach((r) => {
          ctx.save();
          ctx.translate(r.x, r.y);
          ctx.rotate(r.rot);
          ctx.beginPath();
          r.pts.forEach((k, i) => {
            const a = (i / r.pts.length) * Math.PI * 2;
            const px = Math.cos(a) * r.r * k, py = Math.sin(a) * r.r * k;
            if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
          });
          ctx.closePath();
          const g = ctx.createRadialGradient(-r.r * 0.3, -r.r * 0.3, 2, 0, 0, r.r);
          g.addColorStop(0, "#94a3b8");
          g.addColorStop(1, "#475569");
          ctx.fillStyle = g;
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,.25)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        });

        const y = H - 34;
        ctx.fillStyle = flash > 0 ? "#fff" : "#22d3ee";
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(shipX, y - 20);
        ctx.lineTo(shipX - 13, y + 10);
        ctx.lineTo(shipX, y + 4);
        ctx.lineTo(shipX + 13, y + 10);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = "rgba(255,255,255,.85)";
        ctx.font = "700 22px Segoe UI, sans-serif";
        ctx.fillText(elapsed.toFixed(1) + "s", 14, 32);
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
        const secs = Math.round(elapsed * 10) / 10;
        const isBest = host.record(secs);
        h.set(1, (host.best ? Number(host.best).toFixed(1) : "—") + "s");
        wrap.appendChild(overlay({
          title: "Çarptın! ☄️",
          big: secs.toFixed(1) + "s",
          msg: isBest ? "🏆 Yeni rekor!" : "Daha uzun dayanabilir misin?",
          buttons: [{ label: "Tekrar Oyna", onClick: start }]
        }));
      }

      canvas.addEventListener("mousedown", (e) => { targetX = E.pointerPos(canvas, e).x; });
      canvas.addEventListener("mousemove", (e) => { if (e.buttons) targetX = E.pointerPos(canvas, e).x; });
      canvas.addEventListener("touchstart", (e) => { e.preventDefault(); targetX = E.pointerPos(canvas, e).x; }, { passive: false });
      canvas.addEventListener("touchmove", (e) => { targetX = E.pointerPos(canvas, e).x; }, { passive: true });

      const stopKeys = E.onKey((e) => {
        if (e.key === "ArrowLeft" || e.key === "a") { e.preventDefault(); leftKey = true; targetX = null; }
        if (e.key === "ArrowRight" || e.key === "d") { e.preventDefault(); rightKey = true; targetX = null; }
      });
      const stopKeysUp = E.onKey((e) => {
        if (e.key === "ArrowLeft" || e.key === "a") leftKey = false;
        if (e.key === "ArrowRight" || e.key === "d") rightKey = false;
      }, true);

      const pad = touchControls([
        { label: "◀", onPress: () => { leftKey = true; targetX = null; }, onRelease: () => { leftKey = false; }, aria: "Sol" },
        { label: "▶", onPress: () => { rightKey = true; targetX = null; }, onRelease: () => { rightKey = false; }, aria: "Sağ" }
      ]);
      root.appendChild(pad.node);

      reset();
      draw();
      wrap.appendChild(overlay({
        title: "☄️ Asteroit",
        msg: "Asteroitlerden kaç! Sürükle veya yön tuşlarıyla hareket et.",
        buttons: [{ label: "Başla", onClick: start }]
      }));
      return { stop() { running = false; cancelAnimationFrame(raf); stopKeys(); stopKeysUp(); pad.dispose(); } };
    }
  });

  /* ====================================================================
     TIRMANICI
     ==================================================================== */
  GAMES.push({
    id: "jumper", title: "Tırmanıcı", emoji: "🧗", cat: "arcade",
    desc: "Platformlardan yukarı zıpla, düşme.",
    hint: "Sürükle / ← →",
    mount(host, root) {
      const W = 360, H = 560;
      const canvas = E.makeCanvas(W, H, { maxWidth: "420px" });
      const ctx = hidpi(canvas, W, H);
      const wrap = boardWrap(canvas);
      const h = hud([{ label: "Yükseklik", tone: "accent" }, { label: "Rekor" }]);
      root.appendChild(h.root);
      root.appendChild(wrap);

      const PW = 62, PH = 12;
      let player, platforms, camera, running, raf, last, keyL, keyR, maxH;

      function reset() {
        player = { x: W / 2 - 14, y: H - 90, w: 28, h: 28, vy: 0, vx: 0 };
        platforms = [];
        for (let i = 0; i < 9; i++) {
          platforms.push({
            x: rand(10, W - PW - 10),
            y: H - 40 - i * 66,
            w: PW,
            type: rnd(9) === 0 ? "spring" : "normal"
          });
        }
        camera = 0; maxH = 0; keyL = keyR = false;
        h.set(0, 0); h.set(1, host.best || 0);
      }

      function update(dt) {
        let ax = 0;
        if (keyL) ax -= 0.9;
        if (keyR) ax += 0.9;
        player.vx += ax * dt;
        player.vx *= 0.92;
        player.vx = clamp(player.vx, -7, 7);
        player.x += player.vx * dt;

        if (player.x + player.w < 0) player.x = W;
        if (player.x > W) player.x = -player.w;

        player.vy += 0.42 * dt;
        player.y += player.vy * dt;

        if (player.vy > 0) {
          for (const p of platforms) {
            if (player.x + player.w > p.x + 3 && player.x < p.x + p.w - 3 &&
                player.y + player.h > p.y && player.y + player.h < p.y + PH + 12) {
              player.y = p.y - player.h;
              player.vy = p.type === "spring" ? -14.5 : -9.6;
              Sound.play(p.type === "spring" ? "jump" : "tap");
              Haptic.tap(p.type === "spring" ? 12 : 5);
              break;
            }
          }
        }

        const camTarget = Math.min(0, player.y - H * 0.55);
        if (camTarget < camera) camera = camTarget;

        maxH = Math.max(maxH, Math.round((H - 90 - (player.y + camera)) / 5));
        h.set(0, maxH);

        let topMost = Infinity;
        platforms.forEach((p) => { if (p.y < topMost) topMost = p.y; });
        while (topMost > camera - 80 && platforms.length < 26) {
          platforms.push({
            x: rand(8, W - PW - 8),
            y: topMost - rand(52, 78),
            w: PW,
            type: rnd(8) === 0 ? "spring" : "normal"
          });
          topMost = platforms[platforms.length - 1].y;
        }
        platforms = platforms.filter((p) => p.y < camera + H + 120);

        if (player.y - camera > H + 40) return gameOver();
      }

      function draw() {
        const t = clamp(maxH / 700, 0, 1);
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, `hsl(${230 - t * 60}, 55%, ${14 + t * 8}%)`);
        g.addColorStop(1, `hsl(${250 - t * 40}, 45%, ${8 + t * 5}%)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "rgba(255,255,255,.18)";
        for (let i = 0; i < 40; i++) {
          const sx = (i * 91) % W;
          const sy = ((i * 137) + camera * 0.3) % H;
          ctx.fillRect(sx, (sy + H) % H, 1.5, 1.5);
        }

        ctx.save();
        ctx.translate(0, -camera);

        platforms.forEach((p) => {
          const isSpring = p.type === "spring";
          ctx.fillStyle = isSpring ? "#fbbf24" : "#34d399";
          ctx.shadowColor = isSpring ? "rgba(251,191,36,.6)" : "rgba(52,211,153,.4)";
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.roundRect(p.x, p.y, p.w, PH, 6);
          ctx.fill();
          ctx.shadowBlur = 0;
          if (isSpring) {
            ctx.strokeStyle = "#92400e";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p.x + p.w / 2 - 6, p.y - 6);
            ctx.lineTo(p.x + p.w / 2 + 6, p.y - 6);
            ctx.stroke();
          }
        });

        ctx.save();
        ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
        ctx.rotate(clamp(player.vx * 0.03, -0.3, 0.3));
        ctx.fillStyle = "#22d3ee";
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.roundRect(-player.w / 2, -player.h / 2, player.w, player.h, 9);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#04212b";
        ctx.beginPath(); ctx.arc(-4, -3, 3, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(5, -3, 3, 0, 7); ctx.fill();
        ctx.restore();
        ctx.restore();

        ctx.fillStyle = "rgba(255,255,255,.9)";
        ctx.font = "800 20px Segoe UI, sans-serif";
        ctx.fillText(maxH + " m", 14, 30);
      }

      function loop(ts) {
        if (!running) return;
        if (!last) last = ts;
        const dt = clamp((ts - last) / 16.67, 0.3, 2.2);
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

      function gameOver() {
        running = false;
        cancelAnimationFrame(raf);
        Sound.play("die");
        Haptic.tap(40);
        const isBest = host.record(maxH);
        h.set(1, host.best || 0);
        wrap.appendChild(overlay({
          title: "Düştün!",
          big: maxH + " m",
          msg: isBest ? "🏆 Yeni rekor!" : "Daha yükseğe çıkabilirsin!",
          buttons: [{ label: "Tekrar Oyna", onClick: start }]
        }));
      }

      let dragging = false, dragStartX = 0, dragStartPlayer = 0;
      const onDown = (e) => {
        const p = E.pointerPos(canvas, e);
        dragging = true;
        dragStartX = p.x;
        dragStartPlayer = player.x;
      };
      const onMove = (e) => {
        if (!dragging) return;
        if (e.cancelable) e.preventDefault();
        const p = E.pointerPos(canvas, e);
        player.x = clamp(dragStartPlayer + (p.x - dragStartX) * 1.6, -player.w, W);
      };
      const onUp = () => { dragging = false; };
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);

      const stopKeys = E.onKey((e) => {
        if (e.key === "ArrowLeft" || e.key === "a") { e.preventDefault(); keyL = true; }
        if (e.key === "ArrowRight" || e.key === "d") { e.preventDefault(); keyR = true; }
      });
      const stopKeysUp = E.onKey((e) => {
        if (e.key === "ArrowLeft" || e.key === "a") keyL = false;
        if (e.key === "ArrowRight" || e.key === "d") keyR = false;
      }, true);

      const pad = touchControls([
        { label: "◀", onPress: () => { keyL = true; }, onRelease: () => { keyL = false; }, aria: "Sol" },
        { label: "▶", onPress: () => { keyR = true; }, onRelease: () => { keyR = false; }, aria: "Sağ" }
      ]);
      root.appendChild(pad.node);

      reset();
      draw();
      wrap.appendChild(overlay({
        title: "🧗 Tırmanıcı",
        msg: "Platformlardan yukarı zıpla. Sarı platformlar seni daha yükseğe fırlatır!",
        buttons: [{ label: "Başla", onClick: start }]
      }));
      return {
        stop() {
          running = false;
          cancelAnimationFrame(raf);
          stopKeys();
          stopKeysUp();
          pad.dispose();
          window.removeEventListener("pointerup", onUp);
        }
      };
    }
  });

  /* ====================================================================
     HEDEF VUR
     ==================================================================== */
  GAMES.push({
    id: "target", title: "Hedef Vur", emoji: "🎯", cat: "arcade",
    desc: "Beliren hedefleri hızlıca vur.",
    hint: "Dokun / tıkla",
    mount(host, root) {
      const W = 380, H = 520;
      const canvas = E.makeCanvas(W, H);
      const ctx = hidpi(canvas, W, H);
      const wrap = boardWrap(canvas);
      const h = hud([{ label: "Skor", tone: "accent" }, { label: "Süre" }, { label: "Rekor" }]);
      root.appendChild(h.root);
      root.appendChild(wrap);

      const DURATION = 30;
      let target, score, running, raf, last, hits, combo, floaters, radius, startAt;

      function reset() {
        target = null; score = 0; hits = 0; combo = 0;
        floaters = []; radius = 46; last = 0;
        startAt = Date.now();
        h.set(0, 0); h.set(1, DURATION + "s"); h.set(2, host.best || 0);
      }

      function spawn() {
        const pad = radius + 14;
        target = {
          x: rand(pad, W - pad),
          y: rand(70, H - pad),
          r: radius,
          born: Date.now(),
          life: Math.max(700, 1600 - score * 8),
          ring: 0
        };
      }

      function update(dt) {
        const remaining = Math.max(0, DURATION - (Date.now() - startAt) / 1000);
        h.set(1, Math.ceil(remaining) + "s");
        if (remaining <= 0) return gameOver();

        if (!target) { spawn(); return; }

        if (Date.now() - target.born > target.life) {
          target = null;
          combo = 0;
          Sound.play("miss");
          score = Math.max(0, score - 5);
          h.set(0, score);
          floaters.push({ x: W / 2, y: H / 2, text: "Kaçırdın!", t: 1, c: "#fb7185" });
          spawn();
        } else {
          target.ring = (Date.now() - target.born) / target.life;
        }

        floaters.forEach((f) => { f.t -= 0.02 * dt; f.y -= 0.8 * dt; });
        floaters = floaters.filter((f) => f.t > 0);
      }

      function draw() {
        ctx.fillStyle = "#070a12";
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = "rgba(255,255,255,.03)";
        for (let x = 0; x < W; x += 38) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += 38) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

        if (target) {
          const t = target;
          const left = 1 - t.ring;
          ctx.strokeStyle = "rgba(251,113,133,.35)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.r + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left);
          ctx.stroke();

          const col = left > 0.5 ? "#34d399" : left > 0.25 ? "#fbbf24" : "#fb7185";
          ctx.fillStyle = col;
          ctx.shadowColor = col;
          ctx.shadowBlur = 22;
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#fff";
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r * 0.62, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r * 0.3, 0, Math.PI * 2); ctx.fill();
        }

        floaters.forEach((f) => {
          ctx.globalAlpha = Math.max(f.t, 0);
          ctx.fillStyle = f.c;
          ctx.font = "800 18px Segoe UI, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(f.text, f.x, f.y);
          ctx.globalAlpha = 1;
        });
        ctx.textAlign = "left";

        if (combo > 1) {
          ctx.fillStyle = "rgba(124,92,255,.95)";
          ctx.font = "800 15px Segoe UI, sans-serif";
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

      function hitAt(px, py) {
        if (!running || !target) return;
        const dx = px - target.x, dy = py - target.y;
        if (Math.sqrt(dx * dx + dy * dy) <= target.r + 6) {
          const ms = Date.now() - target.born;
          const speedBonus = Math.max(0, Math.round((target.life - ms) / 60));
          combo++;
          const gain = (10 + speedBonus) * Math.min(combo, 5);
          score += gain;
          h.set(0, score);
          hits++;
          floaters.push({ x: target.x, y: target.y - 10, text: "+" + gain, t: 1, c: "#34d399" });
          Sound.play(speedBonus > 12 ? "win" : "point");
          Haptic.tap(10);
          radius = Math.max(26, radius - 0.9);
          target = null;
          spawn();
        } else {
          combo = 0;
          score = Math.max(0, score - 2);
          h.set(0, score);
          floaters.push({ x: px, y: py, text: "×", t: 1, c: "#fb7185" });
          Sound.play("bad");
        }
      }

      const click = (e) => {
        const p = E.pointerPos(canvas, e);
        hitAt(p.x, p.y);
      };
      canvas.addEventListener("mousedown", click);
      canvas.addEventListener("touchstart", (e) => { e.preventDefault(); click(e); }, { passive: false });

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
        const isBest = host.record(score);
        h.set(2, host.best || 0);
        wrap.appendChild(overlay({
          title: "Süre bitti!",
          big: score,
          msg: `${hits} hedef vurdun${isBest ? " — 🏆 Yeni rekor!" : ""}`,
          buttons: [{ label: "Tekrar Oyna", onClick: start }]
        }));
      }

      reset();
      draw();
      wrap.appendChild(overlay({
        title: "🎯 Hedef Vur",
        msg: "Hızlı vur, kombo yap! Hedef ne kadar hızlıysa puan o kadar artar.",
        buttons: [{ label: "Başla", onClick: start }]
      }));
      return { stop() { running = false; cancelAnimationFrame(raf); } };
    }
  });

  /* ====================================================================
     BASKET
     ==================================================================== */
  GAMES.push({
    id: "basket", title: "Basket", emoji: "🏀", cat: "arcade",
    desc: "Fizik temelli basket: dokun, sürükle, at!",
    hint: "Sürükle ve bırak",
    mount(host, root) {
      const W = 380, H = 560;
      const canvas = E.makeCanvas(W, H, { maxWidth: "440px" });
      const ctx = hidpi(canvas, W, H);
      const wrap = boardWrap(canvas);
      const h = hud([{ label: "Sayı", tone: "accent" }, { label: "Atış" }, { label: "Rekor" }]);
      root.appendChild(h.root);
      root.appendChild(wrap);

      const GRAV = 0.42, MAX_SHOTS = 10;
      let ball, aim, score, shots, running, raf, last, made, hoopY, hoopX, phase, ballTimeout;

      function reset() {
        hoopY = 170; hoopX = W - 95; phase = 0;
        ball = { x: 90, y: H - 70, vx: 0, vy: 0, r: 14, flying: false, spin: 0 };
        aim = { active: false, sx: 0, sy: 0, cx: 0, cy: 0 };
        score = 0; shots = 0; made = 0;
        h.set(0, 0); h.set(1, 0); h.set(2, host.best || 0);
      }

      function update(dt) {
        phase += dt * 0.6;
        hoopX = W - 95 + Math.sin(phase * 0.04) * 45;

        if (!ball.flying) return;
        ball.vy += GRAV * dt;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        ball.spin += ball.vx * 0.02 * dt;

        // çember algılama
        if (ball.vy > 0 && ball.x > hoopX - 31 + 6 && ball.x < hoopX + 31 - 6) {
          const py = ball.y - ball.vy;
          if (py <= hoopY && ball.y >= hoopY) {
            const perfect = Math.abs(ball.x - hoopX) < 12;
            score += perfect ? 3 : 2;
            made++;
            h.set(0, score);
            Sound.play("win");
            Haptic.tap(20);
            resetBall();
            if (perfect) host.toast("Mükemmel atış! +3 🎯", "good");
            return;
          }
        }

        if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx *= -0.6; }
        if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx *= -0.6; }

        if (ball.y > H + 40) {
          Sound.play("miss");
          resetBall();
        }
      }

      function resetBall() {
        ball.flying = false;
        ball.x = 90; ball.y = H - 70; ball.vx = 0; ball.vy = 0;
        checkEnd();
      }

      function checkEnd() {
        if (shots < MAX_SHOTS || running === false) return;
        running = false;
        cancelAnimationFrame(raf);
        const isBest = host.record(score);
        h.set(2, host.best || 0);
        Sound.play(score >= 12 ? "win" : "level");
        wrap.appendChild(overlay({
          title: "Seans bitti!",
          big: score,
          msg: `${MAX_SHOTS} atışta ${made} isabet${isBest ? " — 🏆 Yeni rekor!" : ""}`,
          buttons: [{ label: "Tekrar Oyna", onClick: start }]
        }));
      }

      function draw() {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#101a2e");
        g.addColorStop(1, "#070b14");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "#0f2f1f";
        ctx.fillRect(0, H - 24, W, 24);

        const hx = hoopX, hy = hoopY;
        ctx.strokeStyle = "#e11d48";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.roundRect(hx - 31, hy - 6, 62, 12, 6);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,.4)";
        ctx.lineWidth = 1.5;
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(hx + i * 13, hy + 6);
          ctx.lineTo(hx + i * 6, hy + 32);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(255,255,255,.08)";
        ctx.fillRect(hx + 34, hy - 40, 8, 70);
        ctx.strokeStyle = "rgba(255,255,255,.25)";
        ctx.strokeRect(hx + 34, hy - 40, 8, 70);

        // top
        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.rotate(ball.spin);
        ctx.fillStyle = "#f97316";
        ctx.shadowColor = "rgba(249,115,22,.6)";
        ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(0, 0, ball.r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(0,0,0,.5)";
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(0, 0, ball.r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-ball.r, 0); ctx.lineTo(ball.r, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -ball.r); ctx.lineTo(0, ball.r); ctx.stroke();
        ctx.beginPath(); ctx.arc(-ball.r * 0.5, 0, ball.r * 0.9, -1.3, 1.3); ctx.stroke();
        ctx.beginPath(); ctx.arc(ball.r * 0.5, 0, ball.r * 0.9, Math.PI - 1.3, Math.PI + 1.3); ctx.stroke();
        ctx.restore();

        if (aim.active && !ball.flying) {
          const dx = aim.sx - aim.cx, dy = aim.sy - aim.cy;
          const power = Math.min(Math.sqrt(dx * dx + dy * dy) / 110, 1);
          const ang = Math.atan2(dy, dx);
          ctx.strokeStyle = `rgba(34,211,238,${0.35 + power * 0.5})`;
          ctx.lineWidth = 3;
          ctx.setLineDash([7, 7]);
          ctx.beginPath();
          ctx.moveTo(ball.x, ball.y);
          ctx.lineTo(ball.x + Math.cos(ang) * power * 150, ball.y + Math.sin(ang) * power * 150);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = "rgba(255,255,255,.15)";
          ctx.fillRect(20, H - 12, W - 40, 6);
          ctx.fillStyle = power > 0.8 ? "#fb7185" : "#22d3ee";
          ctx.fillRect(20, H - 12, (W - 40) * power, 6);
        }

        ctx.fillStyle = "rgba(255,255,255,.5)";
        ctx.font = "700 12px Segoe UI, sans-serif";
        ctx.fillText("İsabet: " + made + "/" + shots + "  •  Kalan atış: " + Math.max(MAX_SHOTS - shots, 0), 14, 24);
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

      function down(e) {
        if (!running || ball.flying || shots >= MAX_SHOTS) return;
        if (e.cancelable) e.preventDefault();
        const p = E.pointerPos(canvas, e);
        aim = { active: true, sx: p.x, sy: p.y, cx: p.x, cy: p.y };
      }
      function move(e) {
        if (!aim.active) return;
        if (e.cancelable) e.preventDefault();
        const p = E.pointerPos(canvas, e);
        aim.cx = p.x; aim.cy = p.y;
      }
      function up() {
        if (!aim.active || !running) { aim.active = false; return; }
        aim.active = false;
        const dx = aim.sx - aim.cx, dy = aim.sy - aim.cy;
        const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 110);
        if (dist < 14) return;
        const ang = Math.atan2(dy, dx);
        const power = dist / 110;
        shots++;
        h.set(1, shots);
        ball.vx = Math.cos(ang) * power * 13;
        ball.vy = Math.sin(ang) * power * 13;
        ball.flying = true;
        Sound.play("jump");
      }

      canvas.addEventListener("pointerdown", down);
      canvas.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);

      const stopKeys = E.onKey((e) => {
        if (e.code === "Space" && running && !ball.flying && shots < MAX_SHOTS) {
          e.preventDefault();
          shots++; h.set(1, shots);
          ball.vx = rand(5, 8);
          ball.vy = -rand(9, 12);
          ball.flying = true;
          Sound.play("jump");
        }
      });

      function start() {
        E.removeOverlay(wrap);
        reset();
        running = true;
        last = 0;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }

      reset();
      draw();
      wrap.appendChild(overlay({
        title: "🏀 Basket",
        msg: `${MAX_SHOTS} atışın var. Topa dokun, geriye sürükle ve bırak. Mükemmel atış +3!`,
        buttons: [{ label: "Başla", onClick: start }]
      }));
      return {
        stop() {
          running = false;
          cancelAnimationFrame(raf);
          stopKeys();
          clearTimeout(ballTimeout);
          window.removeEventListener("pointerup", up);
          window.removeEventListener("pointercancel", up);
        }
      };
    }
  });

  /* ====================================================================
     BALON PATLAT
     ==================================================================== */
  GAMES.push({
    id: "balloons", title: "Balon Patlat", emoji: "🎈", cat: "arcade",
    desc: "Yükselen balonları patlat, bombalara dokunma.",
    hint: "Dokun / tıkla",
    mount(host, root) {
      const W = 380, H = 540;
      const canvas = E.makeCanvas(W, H);
      const ctx = hidpi(canvas, W, H);
      const wrap = boardWrap(canvas);
      const h = hud([{ label: "Puan", tone: "accent" }, { label: "Can" }, { label: "Rekor" }]);
      root.appendChild(h.root);
      root.appendChild(wrap);

      const COLORS = ["#fb7185", "#fbbf24", "#34d399", "#22d3ee", "#c084fc", "#f472b6"];
      let balloons, score, lives, running, raf, last, spawnCd, combo, pops;

      function reset() {
        balloons = []; score = 0; lives = 3; spawnCd = 0; combo = 0; pops = 0; last = 0;
        h.set(0, 0); h.set(1, "❤️❤️❤️"); h.set(2, host.best || 0);
      }

      function spawn() {
        const bomb = Math.random() < 0.16;
        const r = rand(18, 30);
        balloons.push({
          x: rand(r + 8, W - r - 8),
          y: H + r, r,
          vy: rand(1.1, 2.2) + score * 0.006,
          vx: rand(-0.35, 0.35),
          col: bomb ? "#334155" : pick(COLORS),
          bomb,
          wob: rand(0, 6.28)
        });
      }

      function update(dt) {
        spawnCd += dt;
        if (spawnCd > Math.max(28 - score * 0.05, 10)) { spawnCd = 0; spawn(); }

        for (let i = balloons.length - 1; i >= 0; i--) {
          const b = balloons[i];
          b.y -= b.vy * dt;
          b.wob += 0.04 * dt;
          b.x += Math.sin(b.wob) * 0.6 + b.vx * dt;
          if (b.y + b.r < 0) {
            balloons.splice(i, 1);
            if (!b.bomb) {
              lives--;
              h.set(1, lives > 0 ? "❤️".repeat(lives) : "💀");
              Sound.play("miss");
              if (lives <= 0) return over();
            }
          }
        }
      }

      function draw() {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#101a35");
        g.addColorStop(1, "#061019");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "rgba(255,255,255,.04)";
        for (let i = 0; i < 5; i++) {
          const cx = (i * 97 + Date.now() / 90) % (W + 100) - 50;
          ctx.beginPath(); ctx.arc(cx, 60 + i * 40, 34, 0, 7); ctx.fill();
        }

        balloons.forEach((b) => {
          ctx.strokeStyle = "rgba(255,255,255,.25)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(b.x, b.y + b.r);
          ctx.quadraticCurveTo(b.x + 6, b.y + b.r + 16, b.x, b.y + b.r + 30);
          ctx.stroke();

          ctx.fillStyle = b.col;
          ctx.shadowColor = b.col;
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, b.r, b.r * 1.18, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          if (b.bomb) {
            ctx.font = `700 ${b.r}px Segoe UI, sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText("💀", b.x, b.y + b.r * 0.35);
            ctx.textAlign = "left";
          } else {
            ctx.fillStyle = "rgba(255,255,255,.45)";
            ctx.beginPath();
            ctx.ellipse(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.22, b.r * 0.34, -0.4, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        if (combo > 2) {
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
        for (let i = balloons.length - 1; i >= 0; i--) {
          const b = balloons[i];
          const dx = p.x - b.x, dy = p.y - b.y;
          if (Math.sqrt(dx * dx + dy * dy) <= b.r + 10) {
            balloons.splice(i, 1);
            if (b.bomb) {
              lives--;
              combo = 0;
              h.set(1, lives > 0 ? "❤️".repeat(lives) : "💀");
              Sound.play("bad");
              Haptic.tap(30);
              if (lives <= 0) return over();
            } else {
              combo++;
              pops++;
              const gain = (b.r < 22 ? 20 : 10) * Math.min(combo, 6);
              score += gain;
              h.set(0, score);
              Sound.play(combo > 3 ? "combo" : "pop");
              Haptic.tap(8);
            }
            return;
          }
        }
        combo = 0;
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

      function over() {
        running = false;
        cancelAnimationFrame(raf);
        Sound.play("die");
        Haptic.tap(40);
        const isBest = host.record(score);
        h.set(2, host.best || 0);
        wrap.appendChild(overlay({
          title: "Oyun bitti!",
          big: score,
          msg: `${pops} balon patlattın${isBest ? " — 🏆 Yeni rekor!" : ""}`,
          buttons: [{ label: "Tekrar Oyna", onClick: start }]
        }));
      }

      reset();
      draw();
      wrap.appendChild(overlay({
        title: "🎈 Balon Patlat",
        msg: "Renkli balonları patlat! Kafatası balonlarına dokunma.",
        buttons: [{ label: "Başla", onClick: start }]
      }));
      return { stop() { running = false; cancelAnimationFrame(raf); } };
    }
  });
})();
