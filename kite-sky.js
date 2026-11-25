/* ว่าวจุฬาล่องลม — กดค้างให้ลมหนุนว่าวขึ้น ปล่อยให้ร่อนลง เก็บดาว หลบนก เมฆฝน และว่าวปักเป้า */
SP.register('kite-sky', function (ctx) {
  const W = ctx.w, H = ctx.h, g = ctx.g;
  const R = SP.rand, clamp = SP.clamp;
  const GROUND = H - 70;

  const K = { x: 210, y: 220, vy: 0, tilt: 0 };
  let lives = 3, stars = 0, dist = 0, speed = 230, t = 0, inv = 0, hold = false, spawnT = 1, starT = 1.2;
  const obs = [], pick = [], sparks = [], texts = [], clouds = [], palms = [];
  const tail = [];
  for (let i = 0; i < 8; i++) tail.push({ x: K.x, y: K.y });
  for (let i = 0; i < 6; i++) clouds.push({ x: R(0, W), y: R(30, 200), s: R(0.6, 1.4), v: R(0.15, 0.4) });
  for (let i = 0; i < 4; i++) palms.push({ x: i * 230 + R(0, 100), h: R(70, 110) });

  ctx.on(ctx.canvas, 'pointerdown', () => { hold = true; });
  ctx.on(window, 'pointerup', () => { hold = false; });
  ctx.on(window, 'pointercancel', () => { hold = false; });
  const keyH = {};
  ctx.on(window, 'keydown', e => { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keyH.v = true; });
  ctx.on(window, 'keyup', e => { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keyH.v = false; });

  function say(x, y, s, c) { texts.push({ x, y, s, c, life: 0.9 }); }
  function burst(x, y, c, n) {
    for (let i = 0; i < n; i++) {
      const a = R(0, 6.28), v = R(50, 170);
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: R(0.3, 0.7), c });
    }
  }

  function spawnObs() {
    const r = Math.random();
    if (r < 0.45) obs.push({ k: 'bird', x: W + 40, y: R(70, GROUND - 90), v: speed + R(40, 120), ph: R(0, 6), r: 20 });
    else if (r < 0.75) obs.push({ k: 'rival', x: W + 50, y: R(90, GROUND - 120), v: speed * 0.8, ph: R(0, 6), base: 0, r: 27 });
    else obs.push({ k: 'storm', x: W + 80, y: R(60, GROUND - 160), v: speed * 0.85, r: 48, ph: R(0, 6) });
    if (obs[obs.length - 1].k === 'rival') obs[obs.length - 1].base = obs[obs.length - 1].y;
  }

  function update(dt) {
    t += dt;
    speed = 230 + Math.min(200, t * 3.2);
    dist += speed * dt;
    ctx.setScore(Math.floor(dist / 40) + stars * 5);
    if (inv > 0) inv -= dt;

    const up = hold || keyH.v;
    K.vy += (up ? -1500 : 950) * dt;
    K.vy = clamp(K.vy, -340, 400);
    K.y += K.vy * dt;
    K.tilt += (clamp(K.vy / 500, -0.5, 0.5) - K.tilt) * Math.min(1, dt * 8);
    if (K.y < 30) { K.y = 30; K.vy = 0; }
    if (K.y > GROUND - 20) { SP.sfx.hit(); ctx.gameOver(Math.floor(dist / 40) + stars * 5, 'ว่าวตกพื้นแล้ว!'); return; }

    // หางว่าว
    tail[0].x = K.x - 6; tail[0].y = K.y + 34;
    for (let i = 1; i < tail.length; i++) {
      const a = tail[i - 1], b = tail[i];
      b.x += (a.x - 11 - b.x) * Math.min(1, dt * 10);
      b.y += (a.y + 8 + Math.sin(t * 6 + i) * 3 - b.y) * Math.min(1, dt * 10);
    }

    spawnT -= dt; starT -= dt;
    if (spawnT <= 0) { spawnObs(); spawnT = R(0.9, 1.6) * (260 / speed); }
    if (starT <= 0) { pick.push({ x: W + 30, y: R(60, GROUND - 80), ph: R(0, 6) }); starT = R(1.1, 2.2); }

    for (const o of obs) {
      o.x -= o.v * dt;
      if (o.k === 'rival') o.y = o.base + Math.sin(t * 2.2 + o.ph) * 55;
      if (o.dead) continue;
      const rr = o.r + 14;
      if (inv <= 0 && Math.hypot(o.x - K.x, o.y - (K.y + 4)) < rr) {
        o.dead = true; lives--; inv = 1.6; SP.sfx.hit(); burst(K.x, K.y, '#ffffff', 14);
        say(K.x, K.y - 30, o.k === 'rival' ? 'เชือกถูกตัด!' : 'โดนแล้ว!', '#ff8a8a');
        if (lives <= 0) { ctx.gameOver(Math.floor(dist / 40) + stars * 5, 'ว่าวโดนตัดเชือก!'); return; }
      }
    }
    for (let i = obs.length - 1; i >= 0; i--) if (obs[i].dead || obs[i].x < -120) obs.splice(i, 1);
    for (const s of pick) {
      s.x -= speed * dt;
      if (!s.got && Math.hypot(s.x - K.x, s.y - K.y) < 36) {
        s.got = true; stars++; SP.sfx.coin(); burst(s.x, s.y, '#ffd21f', 10); say(s.x, s.y - 20, '+5', '#ffe066');
      }
    }
    for (let i = pick.length - 1; i >= 0; i--) if (pick[i].got || pick[i].x < -40) pick.splice(i, 1);
    for (const c of clouds) { c.x -= speed * c.v * dt; if (c.x < -150) { c.x = W + 100; c.y = R(30, 200); } }
    for (const p of palms) { p.x -= speed * 0.6 * dt; if (p.x < -60) { p.x = W + R(20, 200); p.h = R(70, 110); } }
    for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
    for (const x of texts) { x.y -= 36 * dt; x.life -= dt; }
    for (let i = texts.length - 1; i >= 0; i--) if (texts[i].life <= 0) texts.splice(i, 1);
  }

  function drawChula(x, y, tilt, scale) {
    g.save(); g.translate(x, y); g.rotate(tilt); g.scale(scale, scale);
    SP.starPath(g, 0, 0, 34, 14, 5, 0);
    g.fillStyle = '#7c3aed'; g.fill();
    g.lineWidth = 3; g.strokeStyle = '#ffd21f'; g.stroke();
    SP.starPath(g, 0, 0, 20, 8, 5, 0);
    g.fillStyle = '#ffd21f'; g.fill();
    g.strokeStyle = '#ffd21f'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, -34); g.lineTo(0, 30); g.stroke();
    g.restore();
  }

  function drawPakpao(o) {
    g.save(); g.translate(o.x, o.y); g.rotate(Math.sin(t * 3 + o.ph) * 0.15);
    g.fillStyle = '#ef4444'; g.beginPath(); g.moveTo(0, -30); g.lineTo(22, 0); g.lineTo(0, 30); g.lineTo(-22, 0); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -30); g.lineTo(22, 0); g.lineTo(0, 0); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(0, 30); g.lineTo(-22, 0); g.lineTo(0, 0); g.closePath(); g.fill();
    g.strokeStyle = '#7f1d1d'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -30); g.lineTo(22, 0); g.lineTo(0, 30); g.lineTo(-22, 0); g.closePath(); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 30);
    for (let i = 1; i <= 5; i++) g.lineTo(Math.sin(t * 6 + i + o.ph) * 6, 30 + i * 9);
    g.stroke();
    g.restore();
  }

  function drawBird(o) {
    const f = Math.sin(t * 14 + o.ph);
    g.save(); g.translate(o.x, o.y);
    g.fillStyle = '#2a0b55'; g.beginPath(); g.ellipse(0, 0, 16, 8, 0, 0, 6.3); g.fill();
    g.beginPath(); g.arc(-14, -3, 6, 0, 6.3); g.fill();
    g.fillStyle = '#ffb300'; g.beginPath(); g.moveTo(-19, -3); g.lineTo(-27, -1); g.lineTo(-19, 1); g.fill();
    g.fillStyle = '#2a0b55';
    g.beginPath(); g.moveTo(-4, -2); g.quadraticCurveTo(4, -26 * f - 4, 14, -4); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(16, 0); g.lineTo(28, -4); g.lineTo(28, 4); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-15, -4, 1.8, 0, 6.3); g.fill();
    g.restore();
  }

  function drawStorm(o) {
    g.save(); g.translate(o.x, o.y);
    g.fillStyle = '#3b3358';
    [[-30, 8, 28], [0, -6, 36], [32, 8, 28], [0, 14, 30]].forEach(c => { g.beginPath(); g.arc(c[0], c[1], c[2], 0, 6.3); g.fill(); });
    g.fillStyle = '#4b4270'; g.beginPath(); g.arc(-6, -12, 24, 0, 6.3); g.fill();
    if (Math.sin(t * 5 + o.ph) > 0.6) {
      g.strokeStyle = '#ffe066'; g.lineWidth = 4; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(4, 24); g.lineTo(-6, 42); g.lineTo(6, 42); g.lineTo(-4, 62); g.stroke();
    }
    g.restore();
  }

  function draw() {
    const sky = g.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, '#4c1d95'); sky.addColorStop(0.5, '#b4529a'); sky.addColorStop(1, '#ffc15a');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    SP.glow(g, 620, GROUND - 40, 230, 'rgba(255,235,150,0.8)', 0.9);
    for (const c of clouds) {
      g.fillStyle = 'rgba(255,255,255,0.28)';
      g.beginPath(); g.ellipse(c.x, c.y, 60 * c.s, 16 * c.s, 0, 0, 6.3); g.ellipse(c.x + 30 * c.s, c.y - 10 * c.s, 40 * c.s, 14 * c.s, 0, 0, 6.3); g.fill();
    }
    // ภูเขาไกล
    g.fillStyle = '#5b2a9e'; g.beginPath(); g.moveTo(0, GROUND);
    for (let x = 0; x <= W; x += 80) g.lineTo(x, GROUND - 50 - 30 * Math.sin(x * 0.011 + 1));
    g.lineTo(W, GROUND); g.fill();
    // ต้นตาล/มะพร้าว
    for (const p of palms) {
      g.strokeStyle = '#2b0d57'; g.lineWidth = 6; g.beginPath(); g.moveTo(p.x, GROUND + 8); g.quadraticCurveTo(p.x + 8, GROUND - p.h / 2, p.x + 2, GROUND - p.h); g.stroke();
      g.fillStyle = '#2b0d57';
      for (let i = 0; i < 6; i++) {
        g.save(); g.translate(p.x + 2, GROUND - p.h); g.rotate(-Math.PI / 2 + (i - 2.5) * 0.55 + Math.sin(t + i) * 0.04);
        g.beginPath(); g.ellipse(24, 0, 26, 5, 0, 0, 6.3); g.fill(); g.restore();
      }
    }
    // ทุ่งนา
    const fl = g.createLinearGradient(0, GROUND, 0, H);
    fl.addColorStop(0, '#d9a514'); fl.addColorStop(1, '#8a5c06');
    g.fillStyle = fl; g.fillRect(0, GROUND, W, H - GROUND);
    g.strokeStyle = 'rgba(255,235,140,0.5)'; g.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const x = ((i * 110 - dist * 0.9) % (W + 110) + W + 110) % (W + 110) - 40;
      g.beginPath(); g.moveTo(x, GROUND + 4); g.lineTo(x - 70, H); g.stroke();
    }
    // เด็กชักว่าว
    g.fillStyle = '#ffd21f'; g.beginPath(); g.arc(60, GROUND - 6, 11, 0, 6.3); g.fill();
    g.fillStyle = '#ec4899'; SP.rr(g, 50, GROUND + 4, 20, 26, 6); g.fill();

    for (const s of pick) {
      SP.glow(g, s.x, s.y, 30, 'rgba(255,220,80,0.8)', 0.8);
      SP.starPath(g, s.x, s.y, 14, 6, 5, t * 1.5 + s.ph); g.fillStyle = '#ffd21f'; g.fill();
      g.strokeStyle = '#fff3a8'; g.lineWidth = 1.5; g.stroke();
    }
    for (const o of obs) {
      if (o.k === 'bird') drawBird(o); else if (o.k === 'rival') drawPakpao(o); else drawStorm(o);
    }
    // สายป่าน
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(60, GROUND - 14);
    g.quadraticCurveTo((60 + K.x) / 2, (GROUND + K.y) / 2 + 40, K.x, K.y + 8); g.stroke();
    // หาง
    g.strokeStyle = '#ffd21f'; g.lineWidth = 3; g.beginPath(); g.moveTo(tail[0].x, tail[0].y);
    for (let i = 1; i < tail.length; i++) g.lineTo(tail[i].x, tail[i].y);
    g.stroke();
    tail.forEach((p, i) => { if (i % 2) { g.fillStyle = '#ec4899'; g.beginPath(); g.arc(p.x, p.y, 4, 0, 6.3); g.fill(); } });
    if (!(inv > 0 && Math.floor(t * 12) % 2)) drawChula(K.x, K.y, K.tilt, 1);

    for (const s of sparks) { g.globalAlpha = clamp(s.life * 3, 0, 1); g.fillStyle = s.c; g.beginPath(); g.arc(s.x, s.y, 3, 0, 6.3); g.fill(); }
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
    g.fillStyle = '#ffd21f'; g.font = '700 16px Prompt, sans-serif'; g.textAlign = 'right';
    g.fillText('⭐ ' + stars, W - 14, 30);
    if (t < 4) {
      g.globalAlpha = clamp(4 - t, 0, 1);
      g.fillStyle = 'rgba(20,4,45,0.75)'; SP.rr(g, W / 2 - 200, 120, 400, 46, 14); g.fill();
      g.fillStyle = '#fff'; g.font = '600 18px Prompt, sans-serif'; g.textAlign = 'center';
      g.fillText('กดค้างให้ว่าวขึ้น ปล่อยให้ว่าวร่อนลง', W / 2, 150);
      g.globalAlpha = 1;
    }
  }

  ctx.loop(dt => { update(dt); draw(); });
});
