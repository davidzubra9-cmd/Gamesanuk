/* ยานรบพิทักษ์ดวงดาว — ยิงอัตโนมัติ ลากเพื่อเคลื่อนที่ เก็บไอเท็ม โค่นบอส */
SP.register('star-defender', function (ctx) {
  const W = ctx.w, H = ctx.h, g = ctx.g;
  const R = SP.rand, clamp = SP.clamp;

  const P = { x: W / 2, y: H - 110, tx: W / 2 };
  let lives = 3, score = 0, t = 0, fireT = 0, inv = 0, rapid = 0, shield = 0, spawnT = 1, nextBoss = 50, shake = 0;
  const bullets = [], ebul = [], enemies = [], items = [], parts = [], stars = [], texts = [];
  let boss = null;
  const keys = {};
  for (let i = 0; i < 70; i++) stars.push({ x: R(0, W), y: R(0, H), s: R(0.5, 2.2), v: R(20, 120) });

  ctx.on(window, 'keydown', e => { keys[e.key] = true; });
  ctx.on(window, 'keyup', e => { keys[e.key] = false; });
  ctx.on(ctx.canvas, 'pointermove', e => { const p = ctx.pos(e); P.tx = p.x; });
  ctx.on(ctx.canvas, 'pointerdown', e => { const p = ctx.pos(e); P.tx = p.x; });

  function boom(x, y, c, n) {
    for (let i = 0; i < n; i++) {
      const a = R(0, 6.28), v = R(40, 220);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: R(0.3, 0.8), c });
    }
  }
  function say(x, y, s, c) { texts.push({ x, y, s, c, life: 0.9 }); }

  function spawnEnemy() {
    const r = Math.random(), x = R(40, W - 40);
    if (r < 0.55) enemies.push({ k: 'a', x, y: -30, hp: 1, r: 18, vy: R(70, 110) + t * 0.6, ph: R(0, 6), sc: 10, fire: R(1, 3) });
    else if (r < 0.85) enemies.push({ k: 'b', x, y: -30, hp: 3, r: 24, vy: R(50, 80) + t * 0.4, ph: R(0, 6), sc: 30, fire: R(0.8, 2) });
    else enemies.push({ k: 'c', x, y: -30, hp: 2, r: 20, vy: R(90, 130) + t * 0.5, ph: R(0, 6), sc: 20, fire: 99, tx: P.x });
  }

  function hurt() {
    if (inv > 0) return;
    if (shield > 0) { shield = 0; inv = 0.8; SP.sfx.hit(); boom(P.x, P.y, '#7cf3ff', 14); return; }
    lives--; inv = 1.8; shake = 0.3; SP.sfx.hit(); boom(P.x, P.y, '#ff8a3d', 22);
    if (lives <= 0) { SP.sfx.boom(); ctx.gameOver(score, 'ยานถูกทำลาย!'); }
  }

  function update(dt) {
    t += dt; ctx.setScore(score);
    if (inv > 0) inv -= dt; if (rapid > 0) rapid -= dt; if (shield > 0) shield -= dt; if (shake > 0) shake -= dt;
    const L = keys.ArrowLeft || keys.a || keys.A, Rr = keys.ArrowRight || keys.d || keys.D;
    if (L || Rr) P.tx += ((Rr ? 1 : 0) - (L ? 1 : 0)) * 560 * dt;
    P.tx = clamp(P.tx, 30, W - 30);
    P.x += (P.tx - P.x) * Math.min(1, dt * 12);

    for (const s of stars) { s.y += s.v * dt; if (s.y > H) { s.y = 0; s.x = R(0, W); } }

    // ยิง
    fireT -= dt;
    if (fireT <= 0) {
      fireT = rapid > 0 ? 0.09 : 0.17;
      bullets.push({ x: P.x, y: P.y - 24, vx: 0 });
      if (rapid > 0) { bullets.push({ x: P.x - 14, y: P.y - 14, vx: -40 }); bullets.push({ x: P.x + 14, y: P.y - 14, vx: 40 }); }
      SP.sfx.shoot();
    }
    for (const b of bullets) { b.y -= 760 * dt; b.x += b.vx * dt; }
    for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].y < -20) bullets.splice(i, 1);

    // ศัตรู
    if (!boss) {
      spawnT -= dt;
      if (spawnT <= 0) { spawnEnemy(); spawnT = Math.max(0.35, 1.0 - t * 0.008) * R(0.7, 1.2); }
    }
    for (const e of enemies) {
      e.y += e.vy * dt; e.ph += dt * 2;
      if (e.k === 'a') e.x += Math.sin(e.ph) * 60 * dt;
      else if (e.k === 'c') e.x += clamp(P.x - e.x, -1, 1) * 90 * dt;
      e.fire -= dt;
      if (e.fire <= 0 && e.y > 20 && e.y < H * 0.6) {
        e.fire = R(1.4, 2.6);
        const a = Math.atan2(P.y - e.y, P.x - e.x);
        ebul.push({ x: e.x, y: e.y + 10, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190 });
      }
      if (Math.hypot(e.x - P.x, e.y - P.y) < e.r + 16) { e.hp = 0; boom(e.x, e.y, '#ffb74d', 12); hurt(); }
    }

    // บอส
    if (!boss && t >= nextBoss) {
      boss = { x: W / 2, y: -80, hp: 70, max: 70, dir: 1, fire: 1.2, ph: 0 };
      nextBoss += 55;
      say(W / 2, 200, 'บอสมาแล้ว!', '#ff8a8a');
    }
    if (boss) {
      boss.ph += dt;
      if (boss.y < 110) boss.y += 80 * dt;
      boss.x += boss.dir * 110 * dt;
      if (boss.x > W - 70) boss.dir = -1; if (boss.x < 70) boss.dir = 1;
      boss.fire -= dt;
      if (boss.fire <= 0 && boss.y >= 100) {
        boss.fire = 0.9;
        for (let i = -2; i <= 2; i++) ebul.push({ x: boss.x + i * 22, y: boss.y + 40, vx: i * 55, vy: 210 });
      }
      if (Math.hypot(boss.x - P.x, boss.y - P.y) < 60) hurt();
    }

    // กระสุนชนศัตรู
    for (const b of bullets) {
      if (b.dead) continue;
      for (const e of enemies) {
        if (e.hp > 0 && Math.abs(b.x - e.x) < e.r + 4 && Math.abs(b.y - e.y) < e.r + 8) {
          b.dead = true; e.hp--; boom(b.x, b.y, '#fff3a8', 3);
          if (e.hp <= 0) {
            score += e.sc; SP.sfx.boom(); boom(e.x, e.y, '#ff9f43', 14);
            if (Math.random() < 0.13) items.push({ k: Math.random() < 0.5 ? 'rapid' : 'shield', x: e.x, y: e.y });
          }
          break;
        }
      }
      if (!b.dead && boss && Math.abs(b.x - boss.x) < 56 && Math.abs(b.y - boss.y) < 40) {
        b.dead = true; boss.hp--; boom(b.x, b.y, '#ffd21f', 3);
        if (boss.hp <= 0) {
          score += 500; SP.sfx.boom(); boom(boss.x, boss.y, '#ffd21f', 50); say(boss.x, boss.y, 'ล้มบอส! +500', '#ffe066');
          items.push({ k: 'shield', x: boss.x, y: boss.y }); boss = null;
          if (lives < 3) lives++;
        }
      }
    }
    for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].dead) bullets.splice(i, 1);
    for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].hp <= 0 || enemies[i].y > H + 40) enemies.splice(i, 1);

    // กระสุนศัตรู
    for (const b of ebul) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (Math.hypot(b.x - P.x, b.y - P.y) < 15) { b.dead = true; hurt(); }
    }
    for (let i = ebul.length - 1; i >= 0; i--) if (ebul[i].dead || ebul[i].y > H + 20 || ebul[i].x < -20 || ebul[i].x > W + 20) ebul.splice(i, 1);

    // ไอเท็ม
    for (const it of items) {
      it.y += 110 * dt;
      if (Math.hypot(it.x - P.x, it.y - P.y) < 30) {
        it.dead = true; SP.sfx.coin();
        if (it.k === 'rapid') { rapid = 8; say(P.x, P.y - 40, 'ยิงเร็ว!', '#ffe066'); }
        else { shield = 10; say(P.x, P.y - 40, 'โล่!', '#7cf3ff'); }
      }
    }
    for (let i = items.length - 1; i >= 0; i--) if (items[i].dead || items[i].y > H + 20) items.splice(i, 1);

    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
    for (const x of texts) { x.y -= 36 * dt; x.life -= dt; }
    for (let i = texts.length - 1; i >= 0; i--) if (texts[i].life <= 0) texts.splice(i, 1);
  }

  function drawShip(x, y) {
    g.save(); g.translate(x, y);
    const fl = 10 + Math.sin(t * 40) * 4;
    g.fillStyle = '#ffb300'; g.beginPath(); g.moveTo(-8, 16); g.lineTo(0, 16 + fl + 8); g.lineTo(8, 16); g.fill();
    g.fillStyle = '#fff3a8'; g.beginPath(); g.moveTo(-4, 16); g.lineTo(0, 16 + fl); g.lineTo(4, 16); g.fill();
    g.fillStyle = '#6d28d9';
    g.beginPath(); g.moveTo(0, -28); g.lineTo(26, 18); g.lineTo(10, 12); g.lineTo(0, 20); g.lineTo(-10, 12); g.lineTo(-26, 18); g.closePath(); g.fill();
    g.fillStyle = '#ffd21f'; g.beginPath(); g.moveTo(0, -28); g.lineTo(8, 4); g.lineTo(0, 10); g.lineTo(-8, 4); g.closePath(); g.fill();
    g.fillStyle = '#a78bfa'; g.beginPath(); g.ellipse(0, -2, 4, 8, 0, 0, 6.3); g.fill();
    g.strokeStyle = '#ffd21f'; g.lineWidth = 2; g.beginPath(); g.moveTo(-26, 18); g.lineTo(-10, 12); g.moveTo(26, 18); g.lineTo(10, 12); g.stroke();
    if (shield > 0) {
      g.strokeStyle = 'rgba(124,243,255,' + (0.5 + Math.sin(t * 10) * 0.2) + ')'; g.lineWidth = 3;
      g.beginPath(); g.arc(0, 0, 36, 0, 6.3); g.stroke();
      g.fillStyle = 'rgba(124,243,255,0.12)'; g.fill();
    }
    g.restore();
  }

  function drawEnemy(e) {
    g.save(); g.translate(e.x, e.y);
    if (e.k === 'a') {
      g.fillStyle = '#ff5d8f'; g.beginPath(); g.moveTo(0, 18); g.lineTo(18, -10); g.lineTo(0, -4); g.lineTo(-18, -10); g.closePath(); g.fill();
      g.fillStyle = '#ffd21f'; g.beginPath(); g.arc(0, 0, 5, 0, 6.3); g.fill();
    } else if (e.k === 'b') {
      g.fillStyle = '#8b5cf6'; g.beginPath(); g.ellipse(0, 4, 26, 12, 0, 0, 6.3); g.fill();
      g.fillStyle = '#c4b5fd'; g.beginPath(); g.ellipse(0, -4, 14, 12, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#ffd21f'; for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(i * 14, 6, 3, 0, 6.3); g.fill(); }
      if (e.hp < 3) { g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(-26, 20, 52 * e.hp / 3, 3); }
    } else {
      g.rotate(t * 4);
      SP.starPath(g, 0, 0, 20, 9, 4, 0); g.fillStyle = '#ff9f43'; g.fill(); g.strokeStyle = '#7c2d12'; g.lineWidth = 2; g.stroke();
    }
    g.restore();
  }

  function draw() {
    g.save();
    if (shake > 0) g.translate(R(-5, 5), R(-5, 5));
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a0220'); bg.addColorStop(1, '#2b0d5e');
    g.fillStyle = bg; g.fillRect(-10, -10, W + 20, H + 20);
    for (const s of stars) { g.fillStyle = 'rgba(255,255,255,' + clamp(s.s / 2.2, 0.2, 0.9) + ')'; g.fillRect(s.x, s.y, s.s, s.s * (1 + s.v / 60)); }
    SP.glow(g, W * 0.8, 120, 160, 'rgba(168,85,247,0.35)', 1);

    for (const it of items) {
      SP.glow(g, it.x, it.y, 28, it.k === 'rapid' ? 'rgba(255,210,31,0.8)' : 'rgba(124,243,255,0.8)', 0.9);
      g.fillStyle = it.k === 'rapid' ? '#ffd21f' : '#7cf3ff';
      SP.rr(g, it.x - 13, it.y - 13, 26, 26, 8); g.fill();
      g.fillStyle = '#2a0b55'; g.font = '800 16px Prompt, sans-serif'; g.textAlign = 'center';
      g.fillText(it.k === 'rapid' ? '⚡' : '🛡', it.x, it.y + 6);
    }
    for (const e of enemies) drawEnemy(e);
    if (boss) {
      g.save(); g.translate(boss.x, boss.y);
      g.fillStyle = '#4c1d95'; g.beginPath(); g.ellipse(0, 0, 64, 30, 0, 0, 6.3); g.fill();
      g.fillStyle = '#7c3aed'; g.beginPath(); g.ellipse(0, -10, 40, 24, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#ffd21f'; for (let i = -3; i <= 3; i++) { g.beginPath(); g.arc(i * 16, 8, 4, 0, 6.3); g.fill(); }
      g.fillStyle = '#ff4d4d'; g.beginPath(); g.arc(0, -14, 9, 0, 6.3); g.fill();
      g.restore();
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(W / 2 - 100, 46, 200, 8);
      g.fillStyle = '#ff5d5d'; g.fillRect(W / 2 - 100, 46, 200 * boss.hp / boss.max, 8);
    }
    for (const b of bullets) { g.fillStyle = '#ffe066'; SP.rr(g, b.x - 2.5, b.y - 9, 5, 16, 2); g.fill(); }
    for (const b of ebul) {
      SP.glow(g, b.x, b.y, 12, 'rgba(255,90,140,0.8)', 0.9);
      g.fillStyle = '#ff5d8f'; g.beginPath(); g.arc(b.x, b.y, 5, 0, 6.3); g.fill();
    }
    if (!(inv > 0 && Math.floor(t * 12) % 2)) drawShip(P.x, P.y);
    for (const p of parts) { g.globalAlpha = clamp(p.life * 2.5, 0, 1); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, 3, 0, 6.3); g.fill(); }
    g.globalAlpha = 1;
    g.font = '800 20px Prompt, sans-serif'; g.textAlign = 'center';
    for (const x of texts) {
      g.globalAlpha = clamp(x.life * 1.5, 0, 1);
      g.lineWidth = 4; g.strokeStyle = 'rgba(20,4,45,0.8)'; g.strokeText(x.s, x.x, x.y);
      g.fillStyle = x.c; g.fillText(x.s, x.x, x.y);
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 3; i++) {
      SP.heartPath(g, 26 + i * 30, 14, 22);
      g.fillStyle = i < lives ? '#ff4d8d' : 'rgba(255,255,255,0.2)'; g.fill();
    }
    if (rapid > 0) { g.fillStyle = '#ffd21f'; g.font = '700 14px Prompt, sans-serif'; g.textAlign = 'right'; g.fillText('⚡ ' + Math.ceil(rapid), W - 14, 28); }
    if (shield > 0) { g.fillStyle = '#7cf3ff'; g.font = '700 14px Prompt, sans-serif'; g.textAlign = 'right'; g.fillText('🛡 ' + Math.ceil(shield), W - 14, 48); }
    if (t < 3.5) {
      g.globalAlpha = clamp(3.5 - t, 0, 1);
      g.fillStyle = 'rgba(20,4,45,0.75)'; SP.rr(g, W / 2 - 170, H / 2 - 40, 340, 50, 14); g.fill();
      g.fillStyle = '#fff'; g.font = '600 18px Prompt, sans-serif'; g.textAlign = 'center';
      g.fillText('ลากเพื่อเคลื่อนยาน — ยิงอัตโนมัติ', W / 2, H / 2 - 9);
      g.globalAlpha = 1;
    }
    g.restore();
  }

  ctx.loop(dt => { update(dt); draw(); });
});
