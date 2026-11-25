/* นักวิ่งนีออน — กระโดดข้ามหนามและบล็อก กระโดดซ้อนได้ 1 ครั้ง */
SP.register('neon-runner', function (ctx) {
  const W = ctx.w, H = ctx.h, g = ctx.g;
  const R = SP.rand, clamp = SP.clamp;
  const GROUND = H - 100, U = 44;   // U = ขนาดหนึ่งช่อง

  const P = { x: 170, y: GROUND, vy: 0, w: 38, h: 38, rot: 0, jumps: 0, onGround: true };
  let speed = 340, dist = 0, coins = 0, t = 0, nextX = W + 200, trail = [];
  const obs = [], pickups = [], sparks = [], texts = [];

  const GRAV = 2500, JUMP = 880, JUMP2 = 760;

  function jump() {
    if (P.onGround) { P.vy = -JUMP; P.onGround = false; P.jumps = 1; SP.sfx.jump(); }
    else if (P.jumps < 2) { P.vy = -JUMP2; P.jumps = 2; SP.sfx.jump(); burst(P.x + P.w / 2, P.y, '#ffd21f', 8); }
  }
  function burst(x, y, c, n) {
    for (let i = 0; i < n; i++) { const a = R(0, 6.28), v = R(40, 160); sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: R(0.25, 0.6), c }); }
  }

  ctx.on(ctx.canvas, 'pointerdown', () => jump());
  ctx.on(window, 'keydown', e => { if (!e.repeat && (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')) jump(); });

  function addGroup() {
    const r = Math.random(), x = nextX;
    let width = U;
    if (r < 0.3) { obs.push({ k: 'spike', x, y: GROUND, w: U, h: U }); }
    else if (r < 0.48) { obs.push({ k: 'spike', x, y: GROUND, w: U, h: U }, { k: 'spike', x: x + U, y: GROUND, w: U, h: U }); width = U * 2; }
    else if (r < 0.66) { obs.push({ k: 'block', x, y: GROUND, w: U, h: U }); pickups.push({ x: x + U / 2, y: GROUND - U - 40 }); }
    else if (r < 0.82) {
      obs.push({ k: 'block', x, y: GROUND, w: U, h: U }, { k: 'block', x: x + U, y: GROUND, w: U, h: U * 2 });
      pickups.push({ x: x + U * 1.5, y: GROUND - U * 2 - 40 }); width = U * 2;
    } else {
      obs.push({ k: 'block', x, y: GROUND, w: U * 3, h: U }, { k: 'spike', x: x + U * 3, y: GROUND, w: U, h: U });
      pickups.push({ x: x + U * 1.5, y: GROUND - U - 40 }); width = U * 4;
    }
    if (Math.random() < 0.5) for (let i = 0; i < 3; i++) pickups.push({ x: x + width + 80 + i * 36, y: GROUND - 90 - Math.sin(i * 1.5) * 20 });
    nextX = x + width + Math.max(260, speed * 0.78) + R(0, 160);
  }

  function die() {
    SP.sfx.hit(); burst(P.x + 19, P.y - 19, '#ffd21f', 24);
    ctx.gameOver(Math.floor(dist / 12) + coins * 5, 'ชนเข้าแล้ว!');
  }

  function update(dt) {
    t += dt;
    speed = 340 + Math.min(300, t * 6);
    dist += speed * dt;
    ctx.setScore(Math.floor(dist / 12) + coins * 5);
    while (nextX < W + 300) addGroup();
    nextX -= speed * dt;
    for (const o of obs) o.x -= speed * dt;
    for (const c of pickups) c.x -= speed * dt;

    const prevBottom = P.y;
    P.vy += GRAV * dt;
    P.y += P.vy * dt;
    let support = GROUND;
    const L = P.x + 6, Rr = P.x + P.w - 6;
    for (const o of obs) {
      if (o.k !== 'block') continue;
      if (Rr > o.x && L < o.x + o.w) {
        const top = o.y - o.h;
        if (prevBottom <= top + 6 && P.y >= top && P.vy >= 0) support = Math.min(support, top);   // ลงบนบล็อก
        else if (P.y > top + 6 && prevBottom > top + 6 && P.y - P.h < o.y) { die(); return; }       // ชนด้านข้าง
      }
    }
    if (P.y >= support) { P.y = support; P.vy = 0; P.onGround = true; P.jumps = 0; P.rot = Math.round(P.rot / (Math.PI / 2)) * (Math.PI / 2); }
    else { P.onGround = false; P.rot += dt * 7; }

    for (const o of obs) {
      if (o.k !== 'spike') continue;
      const hx = o.x + o.w * 0.28, hw = o.w * 0.44, hy = o.y - o.h * 0.7;
      if (P.x + P.w - 7 > hx && P.x + 7 < hx + hw && P.y > hy + 4 && P.y - P.h < o.y) { die(); return; }
    }
    for (const c of pickups) {
      if (!c.got && Math.hypot(c.x - (P.x + P.w / 2), c.y - (P.y - P.h / 2)) < 30) {
        c.got = true; coins++; SP.sfx.coin(); burst(c.x, c.y, '#ffd21f', 6);
      }
    }
    for (let i = obs.length - 1; i >= 0; i--) if (obs[i].x < -200) obs.splice(i, 1);
    for (let i = pickups.length - 1; i >= 0; i--) if (pickups[i].got || pickups[i].x < -50) pickups.splice(i, 1);

    trail.push({ x: P.x + P.w / 2, y: P.y - P.h / 2, life: 0.3 });
    for (const tr of trail) { tr.life -= dt; tr.x -= speed * dt; }
    trail = trail.filter(tr => tr.life > 0);
    for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
  }

  function draw() {
    const bg = g.createLinearGradient(0, 0, 0, GROUND);
    bg.addColorStop(0, '#1a0638'); bg.addColorStop(1, '#5b21b6');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // ดวงอาทิตย์นีออน
    const sg = g.createLinearGradient(0, 80, 0, 260);
    sg.addColorStop(0, '#ffe66d'); sg.addColorStop(1, '#ff4fa3');
    g.save(); g.beginPath(); g.arc(W * 0.7, 190, 100, 0, 6.3); g.clip();
    g.fillStyle = sg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#3b0f86';
    for (let i = 0; i < 6; i++) g.fillRect(W * 0.7 - 110, 200 + i * 16, 220, 3 + i * 1.6);
    g.restore();
    // เส้นขอบฟ้าและกริด
    g.strokeStyle = 'rgba(255,210,31,0.55)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, GROUND); g.lineTo(W, GROUND); g.stroke();
    g.fillStyle = '#22084d'; g.fillRect(0, GROUND, W, H - GROUND);
    g.strokeStyle = 'rgba(167,139,250,0.35)'; g.lineWidth = 1.5;
    const off = (dist * 0.9) % 60;
    for (let x = -off; x < W + 60; x += 60) { g.beginPath(); g.moveTo(x, GROUND); g.lineTo(x - (x - W / 2) * 0.9, H); g.stroke(); }
    for (let i = 1; i < 5; i++) { const y = GROUND + i * i * 5.5; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // ตึกไกล ๆ
    g.fillStyle = 'rgba(30,8,70,0.85)';
    for (let i = 0; i < 12; i++) {
      const x = ((i * 90 - dist * 0.25) % (W + 180) + W + 180) % (W + 180) - 90;
      const h = 60 + (i * 37) % 90; g.fillRect(x, GROUND - h, 56, h);
    }

    for (const c of pickups) {
      SP.glow(g, c.x, c.y, 24, 'rgba(255,210,31,0.8)', 0.8);
      g.fillStyle = '#ffd21f'; g.beginPath(); g.arc(c.x, c.y, 10, 0, 6.3); g.fill();
      g.fillStyle = '#b37a00'; g.font = '800 12px Prompt, sans-serif'; g.textAlign = 'center'; g.fillText('฿', c.x, c.y + 4);
    }
    for (const o of obs) {
      if (o.k === 'block') {
        g.fillStyle = '#7c3aed'; g.fillRect(o.x, o.y - o.h, o.w, o.h);
        g.strokeStyle = '#ffd21f'; g.lineWidth = 3; g.strokeRect(o.x + 1.5, o.y - o.h + 1.5, o.w - 3, o.h - 3);
        g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1;
        for (let yy = o.y - o.h + U; yy < o.y; yy += U) { g.beginPath(); g.moveTo(o.x, yy); g.lineTo(o.x + o.w, yy); g.stroke(); }
        for (let xx = o.x + U; xx < o.x + o.w; xx += U) { g.beginPath(); g.moveTo(xx, o.y - o.h); g.lineTo(xx, o.y); g.stroke(); }
      } else {
        g.fillStyle = '#ff4fa3'; g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x + o.w / 2, o.y - o.h); g.lineTo(o.x + o.w, o.y); g.closePath(); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
      }
    }
    for (const tr of trail) { g.globalAlpha = tr.life * 1.5; g.fillStyle = '#ffd21f'; g.fillRect(tr.x - 8, tr.y - 8, 16, 16); }
    g.globalAlpha = 1;
    // ผู้เล่น
    g.save(); g.translate(P.x + P.w / 2, P.y - P.h / 2); g.rotate(P.rot);
    SP.glow(g, 0, 0, 40, 'rgba(255,210,31,0.5)', 0.8);
    g.fillStyle = '#ffd21f'; SP.rr(g, -P.w / 2, -P.h / 2, P.w, P.h, 8); g.fill();
    g.strokeStyle = '#2a0b55'; g.lineWidth = 3; SP.rr(g, -P.w / 2, -P.h / 2, P.w, P.h, 8); g.stroke();
    g.fillStyle = '#2a0b55'; g.fillRect(-12, -9, 8, 9); g.fillRect(4, -9, 8, 9);
    g.fillRect(-10, 8, 20, 4);
    g.restore();
    for (const s of sparks) { g.globalAlpha = clamp(s.life * 3, 0, 1); g.fillStyle = s.c; g.beginPath(); g.arc(s.x, s.y, 3, 0, 6.3); g.fill(); }
    g.globalAlpha = 1;
    g.fillStyle = '#ffd21f'; g.font = '700 18px Prompt, sans-serif'; g.textAlign = 'right';
    g.fillText('🪙 ' + coins, W - 16, 30);
    if (t < 3.5) {
      g.globalAlpha = clamp(3.5 - t, 0, 1);
      g.fillStyle = 'rgba(20,4,45,0.75)'; SP.rr(g, W / 2 - 200, 90, 400, 46, 14); g.fill();
      g.fillStyle = '#fff'; g.font = '600 18px Prompt, sans-serif'; g.textAlign = 'center';
      g.fillText('แตะ / Space เพื่อกระโดด — กระโดดซ้อนได้ 2 ครั้ง', W / 2, 119);
      g.globalAlpha = 1;
    }
  }

  ctx.loop(dt => { update(dt); draw(); });
});
