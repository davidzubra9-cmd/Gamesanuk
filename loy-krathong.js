/* ลอยกระทงล่องธารา — บังคับกระทงล่องน้ำยามค่ำคืน เก็บประทีป/ดอกบัว หลบหินและท่อนซุง */
SP.register('loy-krathong', function (ctx) {
  const W = ctx.w, H = ctx.h, g = ctx.g;
  const R = SP.rand, clamp = SP.clamp;

  const P = { x: W / 2, y: H - 140, tx: W / 2 };
  let lives = 3, pts = 0, dist = 0, speed = 170, t = 0, inv = 0, shake = 0, spawnT = 0.6;
  const items = [], sparks = [], ripples = [], glints = [], lanterns = [], texts = [];
  const keys = {};

  for (let i = 0; i < 28; i++) ripples.push({ x: R(20, W - 20), y: R(0, H), r: R(6, 16), a: R(0.08, 0.22) });
  for (let i = 0; i < 18; i++) glints.push({ y: R(0, H), w: R(8, 34), o: R(-60, 60) });
  for (let i = 0; i < 12; i++) lanterns.push({ x: R(0, W), y: R(0, H * 0.7), r: R(2, 5), v: R(8, 24), ph: R(0, 6) });

  ctx.on(window, 'keydown', e => { keys[e.key] = true; });
  ctx.on(window, 'keyup', e => { keys[e.key] = false; });
  ctx.on(ctx.canvas, 'pointermove', e => { P.tx = ctx.pos(e).x; });
  ctx.on(ctx.canvas, 'pointerdown', e => { P.tx = ctx.pos(e).x; });

  function spawn() {
    const r = Math.random(), x = R(55, W - 55);
    if (r < 0.34) items.push({ k: 'candle', x, y: -30, hw: 18, hh: 18 });
    else if (r < 0.56) items.push({ k: 'flower', x, y: -30, hw: 18, hh: 18, rot: R(0, 6) });
    else if (r < 0.82) { const s = R(20, 30); items.push({ k: 'rock', x, y: -40, hw: s * 0.85, hh: s * 0.8, s }); }
    else { const w = R(90, 150); items.push({ k: 'log', x, y: -40, hw: w / 2, hh: 13, w, a: R(-0.25, 0.25) }); }
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = R(0, 6.28), v = R(40, 170);
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: R(0.4, 0.9), max: 0.9, c: color });
    }
  }
  function say(x, y, s, c) { texts.push({ x, y, s, c, life: 0.9 }); }

  function update(dt) {
    t += dt;
    speed = 170 + Math.min(230, dist / 45);
    dist += speed * dt;
    const total = Math.floor(pts + dist / 60);
    ctx.setScore(total);

    const L = keys.ArrowLeft || keys.a || keys.A, Rr = keys.ArrowRight || keys.d || keys.D;
    if (L || Rr) P.tx += ((Rr ? 1 : 0) - (L ? 1 : 0)) * 560 * dt;
    P.tx = clamp(P.tx, 44, W - 44);
    P.x += (P.tx - P.x) * Math.min(1, dt * 9);
    if (inv > 0) inv -= dt;
    if (shake > 0) shake -= dt;

    spawnT -= dt;
    if (spawnT <= 0) { spawn(); spawnT = R(0.5, 1.0) * (190 / speed) * 1.25; }

    for (const it of items) {
      it.y += speed * dt;
      if (it.dead) continue;
      if (Math.abs(it.x - P.x) < it.hw + 17 && Math.abs(it.y - P.y) < it.hh + 24) {
        if (it.k === 'candle') {
          it.dead = true; pts += 10; SP.sfx.coin(); burst(it.x, it.y, '#ffd21f', 10); say(it.x, it.y - 20, '+10', '#ffe66d');
        } else if (it.k === 'flower') {
          it.dead = true; pts += 5; SP.sfx.pop(); burst(it.x, it.y, '#ff8fd0', 8); say(it.x, it.y - 20, '+5', '#ffc2e8');
        } else if (inv <= 0) {
          it.dead = true; lives--; inv = 1.6; shake = 0.3; SP.sfx.hit(); burst(P.x, P.y, '#ffffff', 14);
          if (lives <= 0) { ctx.gameOver(total, 'กระทงล่มแล้ว!'); return; }
        }
      }
    }
    for (let i = items.length - 1; i >= 0; i--) if (items[i].dead || items[i].y > H + 80) items.splice(i, 1);

    for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
    for (const x of texts) { x.y -= 40 * dt; x.life -= dt; }
    for (let i = texts.length - 1; i >= 0; i--) if (texts[i].life <= 0) texts.splice(i, 1);
    for (const r of ripples) { r.y += speed * dt * 0.85; if (r.y > H + 20) { r.y = -20; r.x = R(20, W - 20); } }
    for (const q of glints) { q.y += speed * dt * 0.9; if (q.y > H + 10) { q.y = -10; q.o = R(-60, 60); q.w = R(8, 34); } }
    for (const l of lanterns) { l.y -= l.v * dt; l.x += Math.sin(t + l.ph) * 8 * dt; if (l.y < -10) { l.y = H * 0.7; l.x = R(0, W); } }
  }

  function drawKrathong(x, y) {
    const sway = Math.sin(t * 3) * 0.06;
    g.save(); g.translate(x, y); g.rotate(sway);
    SP.glow(g, 0, 0, 62, 'rgba(255,200,60,0.55)', 0.5 + Math.sin(t * 9) * 0.1);
    // ใบตองพับรอบกระทง
    for (let i = 0; i < 14; i++) {
      g.save(); g.rotate(i * Math.PI * 2 / 14);
      g.fillStyle = i % 2 ? '#2f9e44' : '#51cf66';
      g.beginPath(); g.moveTo(-6, -17); g.lineTo(0, -33); g.lineTo(6, -17); g.closePath(); g.fill();
      g.restore();
    }
    g.fillStyle = '#2b8a3e'; g.beginPath(); g.arc(0, 0, 22, 0, 6.3); g.fill();
    // กลีบดอกไม้ชั้นนอก ชมพู
    for (let i = 0; i < 8; i++) {
      g.save(); g.rotate(i * Math.PI / 4 + 0.2);
      g.fillStyle = '#f783ac'; g.beginPath(); g.ellipse(0, -13, 5, 10, 0, 0, 6.3); g.fill();
      g.restore();
    }
    // กลีบชั้นใน ขาว
    for (let i = 0; i < 6; i++) {
      g.save(); g.rotate(i * Math.PI / 3);
      g.fillStyle = '#fff5f8'; g.beginPath(); g.ellipse(0, -7, 3.6, 7, 0, 0, 6.3); g.fill();
      g.restore();
    }
    // ธูปเทียน
    g.strokeStyle = '#7a4a1d'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(-5, 0); g.lineTo(-9, -22); g.moveTo(5, 0); g.lineTo(9, -22); g.stroke();
    g.fillStyle = '#ffd21f'; SP.rr(g, -3, -9, 6, 12, 2); g.fill();
    const fl = 1 + Math.sin(t * 14) * 0.15;
    g.fillStyle = '#fff3a8'; g.beginPath(); g.ellipse(0, -13, 3 * fl, 6 * fl, 0, 0, 6.3); g.fill();
    g.fillStyle = '#ff922b'; g.beginPath(); g.ellipse(0, -11, 1.6, 3.5, 0, 0, 6.3); g.fill();
    g.restore();
  }

  function drawItem(it) {
    g.save(); g.translate(it.x, it.y);
    if (it.k === 'candle') {
      SP.glow(g, 0, 0, 34, 'rgba(255,220,80,0.8)', 0.8);
      g.fillStyle = '#ffd21f'; g.beginPath(); g.arc(0, 4, 12, 0, 6.3); g.fill();
      g.fillStyle = '#e8a900'; g.beginPath(); g.arc(0, 8, 8, 0, Math.PI); g.fill();
      g.fillStyle = '#fff7c2'; g.beginPath(); g.ellipse(0, -9, 4.5, 9, 0, 0, 6.3); g.fill();
      g.fillStyle = '#ff922b'; g.beginPath(); g.ellipse(0, -7, 2.4, 5, 0, 0, 6.3); g.fill();
    } else if (it.k === 'flower') {
      g.rotate(it.rot + t * 0.5);
      for (let i = 0; i < 6; i++) {
        g.save(); g.rotate(i * Math.PI / 3);
        g.fillStyle = i % 2 ? '#ff8fd0' : '#ffb3e0'; g.beginPath(); g.ellipse(0, -10, 6, 11, 0, 0, 6.3); g.fill();
        g.restore();
      }
      g.fillStyle = '#ffe066'; g.beginPath(); g.arc(0, 0, 5, 0, 6.3); g.fill();
    } else if (it.k === 'rock') {
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(0, it.s * 0.5, it.s * 1.2, it.s * 0.35, 0, 0, 6.3); g.stroke();
      g.fillStyle = '#4a3a73'; g.beginPath(); g.ellipse(0, 0, it.s, it.s * 0.85, 0, 0, 6.3); g.fill();
      g.fillStyle = '#6b5a9c'; g.beginPath(); g.ellipse(-it.s * 0.25, -it.s * 0.25, it.s * 0.55, it.s * 0.4, -0.4, 0, 6.3); g.fill();
    } else {
      g.rotate(it.a);
      g.fillStyle = '#5b3a1e'; SP.rr(g, -it.w / 2, -13, it.w, 26, 13); g.fill();
      g.fillStyle = '#7a5230'; SP.rr(g, -it.w / 2 + 6, -9, it.w - 12, 9, 5); g.fill();
      g.fillStyle = '#c9a06b'; g.beginPath(); g.ellipse(-it.w / 2 + 5, 0, 6, 11, 0, 0, 6.3); g.fill();
      g.strokeStyle = '#5b3a1e'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(-it.w / 2 + 5, 0, 3, 6, 0, 0, 6.3); g.stroke();
    }
    g.restore();
  }

  function draw() {
    g.save();
    if (shake > 0) g.translate(R(-5, 5), R(-5, 5));
    // น้ำยามค่ำคืน
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a0640'); bg.addColorStop(0.55, '#2c0f66'); bg.addColorStop(1, '#3d1a85');
    g.fillStyle = bg; g.fillRect(-10, -10, W + 20, H + 20);
    // แสงจันทร์สะท้อน
    SP.glow(g, W * 0.72, 90, 220, 'rgba(255,230,120,0.30)', 1);
    g.fillStyle = 'rgba(255,230,140,0.55)';
    for (const q of glints) g.fillRect(W * 0.72 + q.o - q.w / 2, q.y, q.w, 2.5);
    // ริ้วคลื่น
    for (const r of ripples) {
      g.strokeStyle = 'rgba(200,180,255,' + r.a + ')'; g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(r.x, r.y, r.r * 1.6, r.r * 0.5, 0, 0, 6.3); g.stroke();
    }
    // โคมลอยไกล ๆ
    for (const l of lanterns) {
      SP.glow(g, l.x, l.y, l.r * 6, 'rgba(255,190,60,0.55)', 0.6 + 0.3 * Math.sin(t * 2 + l.ph));
      g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(l.x, l.y, l.r, 0, 6.3); g.fill();
    }
    // ริมตลิ่ง
    const bank = g.createLinearGradient(0, 0, 40, 0);
    bank.addColorStop(0, '#0d0224'); bank.addColorStop(1, 'rgba(13,2,36,0)');
    g.fillStyle = bank; g.fillRect(0, 0, 40, H);
    const bank2 = g.createLinearGradient(W, 0, W - 40, 0);
    bank2.addColorStop(0, '#0d0224'); bank2.addColorStop(1, 'rgba(13,2,36,0)');
    g.fillStyle = bank2; g.fillRect(W - 40, 0, 40, H);

    for (const it of items) drawItem(it);
    if (!(inv > 0 && Math.floor(t * 12) % 2)) drawKrathong(P.x, P.y);
    for (const s of sparks) {
      g.globalAlpha = clamp(s.life / s.max, 0, 1); g.fillStyle = s.c;
      g.beginPath(); g.arc(s.x, s.y, 3, 0, 6.3); g.fill();
    }
    g.globalAlpha = 1;
    g.font = '700 20px Prompt, sans-serif'; g.textAlign = 'center';
    for (const x of texts) { g.globalAlpha = clamp(x.life, 0, 1); g.fillStyle = x.c; g.fillText(x.s, x.x, x.y); }
    g.globalAlpha = 1;

    // หัวใจ
    for (let i = 0; i < 3; i++) {
      SP.heartPath(g, 30 + i * 32, 16, 24);
      g.fillStyle = i < lives ? '#ff4d8d' : 'rgba(255,255,255,0.18)'; g.fill();
    }
    // คำแนะนำช่วงแรก
    if (t < 4) {
      g.globalAlpha = clamp(4 - t, 0, 1);
      g.fillStyle = 'rgba(20,4,45,0.7)'; SP.rr(g, W / 2 - 170, H / 2 - 60, 340, 56, 16); g.fill();
      g.fillStyle = '#fff'; g.font = '600 18px Prompt, sans-serif'; g.textAlign = 'center';
      g.fillText('ลากซ้าย-ขวาเพื่อบังคับกระทง', W / 2, H / 2 - 26);
      g.fillStyle = '#ffd21f'; g.font = '500 14px Prompt, sans-serif';
      g.fillText('เก็บประทีป 🕯 ดอกบัว หลบหินและซุง', W / 2, H / 2 - 6);
      g.globalAlpha = 1;
    }
    g.restore();
  }

  ctx.loop(dt => { update(dt); draw(); });
});
