/* ทุบอิฐมหาสนุก — เด้งลูกบอลทุบอิฐ เก็บแคปซูลช่วยเหลือ */
SP.register('brick-breaker', function (ctx) {
  const W = ctx.w, H = ctx.h, g = ctx.g;
  const R = SP.rand, clamp = SP.clamp;

  const PAD = { x: W / 2, y: H - 50, w: 90, h: 14, tx: W / 2 };
  const COLS = 8, BW = (W - 40) / COLS, BH = 24;
  const PAL = ['#ffd21f', '#ff9f43', '#c084fc', '#a855f7', '#8b5cf6', '#7c3aed'];
  let balls = [], bricks = [], caps = [], parts = [];
  let lives = 3, score = 0, level = 0, t = 0, wideT = 0, launched = false, spd = 330;
  const keys = {};

  function build() {
    bricks = [];
    const rows = Math.min(8, 4 + level);
    for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) {
      if (level >= 2 && (r + c) % 5 === 4) continue;
      bricks.push({ x: 20 + c * BW, y: 70 + r * (BH + 4), hp: level >= 1 && r < Math.min(level + 1, 3) ? 2 : 1, col: PAL[r % PAL.length] });
    }
  }
  function resetBall() {
    launched = false; spd = 330 + level * 25;
    balls = [{ x: PAD.x, y: PAD.y - 16, vx: 0, vy: 0, r: 8 }];
  }
  function burst(x, y, c, n) {
    for (let i = 0; i < n; i++) { const a = R(0, 6.28), v = R(40, 170); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: R(0.25, 0.6), c }); }
  }
  function launch() {
    if (launched) return;
    launched = true;
    const a = -Math.PI / 2 + R(-0.35, 0.35);
    balls[0].vx = Math.cos(a) * spd; balls[0].vy = Math.sin(a) * spd;
    SP.sfx.pop();
  }

  ctx.on(ctx.canvas, 'pointermove', e => { PAD.tx = ctx.pos(e).x; });
  ctx.on(ctx.canvas, 'pointerdown', e => { PAD.tx = ctx.pos(e).x; launch(); });
  ctx.on(window, 'keydown', e => { keys[e.key] = true; if (e.key === ' ' || e.key === 'ArrowUp') launch(); });
  ctx.on(window, 'keyup', e => { keys[e.key] = false; });

  build(); resetBall();

  function update(dt) {
    t += dt; ctx.setScore(score);
    if (wideT > 0) { wideT -= dt; PAD.w += (150 - PAD.w) * Math.min(1, dt * 8); } else PAD.w += (90 - PAD.w) * Math.min(1, dt * 8);
    const L = keys.ArrowLeft || keys.a || keys.A, Rr = keys.ArrowRight || keys.d || keys.D;
    if (L || Rr) PAD.tx += ((Rr ? 1 : 0) - (L ? 1 : 0)) * 620 * dt;
    PAD.tx = clamp(PAD.tx, PAD.w / 2 + 6, W - PAD.w / 2 - 6);
    PAD.x += (PAD.tx - PAD.x) * Math.min(1, dt * 16);

    for (const b of balls) {
      if (!launched) { b.x = PAD.x; b.y = PAD.y - 16; continue; }
      // แบ่งเป็นก้าวย่อยกันทะลุ
      const steps = Math.ceil(Math.hypot(b.vx, b.vy) * dt / 6);
      for (let s = 0; s < steps; s++) {
        b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
        if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
        if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
        // แผ่นรับ
        if (b.vy > 0 && b.y + b.r >= PAD.y && b.y + b.r <= PAD.y + PAD.h + 8 && Math.abs(b.x - PAD.x) <= PAD.w / 2 + b.r) {
          const off = clamp((b.x - PAD.x) / (PAD.w / 2), -1, 1);
          const a = -Math.PI / 2 + off * 1.05;
          const sp = Math.min(560, Math.hypot(b.vx, b.vy) * 1.01);
          b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.y = PAD.y - b.r; SP.sfx.click();
        }
        // อิฐ
        for (const k of bricks) {
          if (k.hp <= 0) continue;
          const nx = clamp(b.x, k.x, k.x + BW - 4), ny = clamp(b.y, k.y, k.y + BH);
          const dx = b.x - nx, dy = b.y - ny;
          if (dx * dx + dy * dy <= b.r * b.r) {
            if (Math.abs(dx) > Math.abs(dy)) b.vx = dx > 0 ? Math.abs(b.vx) : -Math.abs(b.vx);
            else b.vy = dy > 0 ? Math.abs(b.vy) : -Math.abs(b.vy);
            k.hp--;
            if (k.hp <= 0) {
              score += 10; SP.sfx.pop(); burst(k.x + BW / 2, k.y + BH / 2, k.col, 8);
              if (Math.random() < 0.12) caps.push({ k: Math.random() < 0.7 ? 'w' : 'l', x: k.x + BW / 2, y: k.y });
            } else { SP.sfx.click(); score += 2; }
            break;
          }
        }
      }
    }
    for (let i = balls.length - 1; i >= 0; i--) if (balls[i].y > H + 20) balls.splice(i, 1);
    if (launched && !balls.length) {
      lives--; SP.sfx.hit();
      if (lives <= 0) { ctx.gameOver(score, 'ลูกบอลหลุดหมดแล้ว'); return; }
      resetBall();
    }
    for (const c of caps) {
      c.y += 150 * dt;
      if (c.y > PAD.y - 6 && c.y < PAD.y + 20 && Math.abs(c.x - PAD.x) < PAD.w / 2 + 12) {
        c.dead = true; SP.sfx.coin();
        if (c.k === 'w') wideT = 10; else if (lives < 5) lives++;
      }
    }
    for (let i = caps.length - 1; i >= 0; i--) if (caps[i].dead || caps[i].y > H + 20) caps.splice(i, 1);
    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);

    if (launched && bricks.every(k => k.hp <= 0)) {
      level++; score += 100; SP.sfx.win(); build(); resetBall(); caps = [];
    }
  }

  function draw() {
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a0638'); bg.addColorStop(1, '#3d1a85');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 20; i++) g.fillRect((i * 97) % W, (i * 53 + t * 8) % H, 2, 2);

    for (const k of bricks) {
      if (k.hp <= 0) continue;
      g.fillStyle = k.col; SP.rr(g, k.x, k.y, BW - 4, BH, 6); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.28)'; SP.rr(g, k.x + 3, k.y + 3, BW - 10, 6, 3); g.fill();
      if (k.hp > 1) { g.strokeStyle = '#fff'; g.lineWidth = 2.5; SP.rr(g, k.x + 1, k.y + 1, BW - 6, BH - 2, 6); g.stroke(); }
    }
    for (const c of caps) {
      g.fillStyle = c.k === 'w' ? '#ffd21f' : '#ff4d8d'; SP.rr(g, c.x - 16, c.y - 10, 32, 20, 10); g.fill();
      g.fillStyle = '#2a0b55'; g.font = '800 15px Prompt, sans-serif'; g.textAlign = 'center';
      g.fillText(c.k === 'w' ? 'W' : '+', c.x, c.y + 5);
    }
    // แผ่นรับ
    const pg = g.createLinearGradient(0, PAD.y, 0, PAD.y + PAD.h);
    pg.addColorStop(0, '#ffe66d'); pg.addColorStop(1, '#ffae00');
    g.fillStyle = pg; SP.rr(g, PAD.x - PAD.w / 2, PAD.y, PAD.w, PAD.h, 7); g.fill();
    g.fillStyle = '#7c3aed'; g.fillRect(PAD.x - 8, PAD.y + 3, 16, 8);
    for (const b of balls) {
      SP.glow(g, b.x, b.y, 22, 'rgba(255,255,255,0.7)', 0.7);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 6.3); g.fill();
    }
    for (const p of parts) { g.globalAlpha = clamp(p.life * 3, 0, 1); g.fillStyle = p.c; g.fillRect(p.x - 2, p.y - 2, 4, 4); }
    g.globalAlpha = 1;
    for (let i = 0; i < lives; i++) { SP.heartPath(g, 24 + i * 28, 12, 20); g.fillStyle = '#ff4d8d'; g.fill(); }
    g.fillStyle = '#ffd21f'; g.font = '700 16px Prompt, sans-serif'; g.textAlign = 'right';
    g.fillText('ด่าน ' + (level + 1), W - 16, 28);
    if (!launched) {
      g.fillStyle = 'rgba(20,4,45,0.75)'; SP.rr(g, W / 2 - 150, H / 2 + 40, 300, 44, 14); g.fill();
      g.fillStyle = '#fff'; g.font = '600 17px Prompt, sans-serif'; g.textAlign = 'center';
      g.fillText('แตะ / คลิก / Space เพื่อปล่อยบอล', W / 2, H / 2 + 68);
    }
  }

  ctx.loop(dt => { update(dt); draw(); });
});
