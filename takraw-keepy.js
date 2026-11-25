/* ตะกร้อลอยฟ้า — แตะเตะลูกตะกร้อให้ลอยนานที่สุด และเตะลอดห่วงรับโบนัส */
SP.register('takraw-keepy', function (ctx) {
  const W = ctx.w, H = ctx.h, g = ctx.g;
  const R = SP.rand, clamp = SP.clamp;
  const FLOOR = H - 62, BR = 31;

  const ball = { x: W / 2, y: 150, vx: 0, vy: 0, rot: 0 };
  const hoop = { x: W / 2, y: 105, w: 96 };
  let kicks = 0, score = 0, t = 0, cd = 0, hoopCd = 0, started = false;
  const sparks = [], texts = [], feet = [];

  function say(x, y, s, c) { texts.push({ x, y, s, c, life: 1 }); }

  ctx.on(ctx.canvas, 'pointerdown', e => {
    if (cd > 0) return;
    const p = ctx.pos(e);
    const dx = p.x - ball.x, dy = p.y - ball.y;
    if (Math.hypot(dx, dy) > BR + 38) return;
    const s = clamp((dy / BR + 1) / 2, 0, 1);            // แตะล่าง = เตะแรง
    ball.vy = -(540 + 400 * s);
    ball.vx = clamp(-dx * 6 + R(-25, 25), -300, 300);   // แตะซ้าย = ลูกไปขวา
    cd = 0.07; kicks++; score++; started = true;
    ctx.setScore(score);
    SP.tone(260 + s * 160, 0.1, 'triangle', 0.15, 120);
    SP.noise(0.04, 0.05);
    feet.push({ x: ball.x, y: ball.y + BR, life: 0.18 });
    for (let i = 0; i < 8; i++) {
      const a = R(0, 6.28), v = R(60, 180);
      sparks.push({ x: ball.x, y: ball.y + BR * 0.6, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: R(0.25, 0.5) });
    }
    if (kicks % 10 === 0) { say(ball.x, ball.y - 50, kicks + ' ครั้ง!', '#ffe066'); SP.sfx.coin(); }
  });

  function update(dt) {
    t += dt; if (cd > 0) cd -= dt; if (hoopCd > 0) hoopCd -= dt;
    const gravity = 1100 + Math.min(500, kicks * 8);
    // ห่วงเคลื่อนที่
    const amp = Math.min(280, 40 + kicks * 6);
    hoop.x = W / 2 + Math.sin(t * 0.9) * amp;
    hoop.y = 105 + Math.sin(t * 1.7) * 18;

    if (started) {
      const py = ball.y;
      ball.vy += gravity * dt;
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      ball.vx *= (1 - 0.15 * dt);
      ball.rot += ball.vx * dt * 0.012 + dt * 1.5;
      if (ball.x < BR) { ball.x = BR; ball.vx = Math.abs(ball.vx) * 0.8; }
      if (ball.x > W - BR) { ball.x = W - BR; ball.vx = -Math.abs(ball.vx) * 0.8; }
      if (ball.y < BR) { ball.y = BR; ball.vy = Math.abs(ball.vy) * 0.4; }
      // ลอดห่วง
      if (hoopCd <= 0 && Math.abs(ball.x - hoop.x) < hoop.w / 2 - 8 &&
          ((py > hoop.y && ball.y <= hoop.y) || (py < hoop.y && ball.y >= hoop.y))) {
        hoopCd = 0.6; score += 5; ctx.setScore(score); SP.sfx.coin();
        say(hoop.x, hoop.y + 30, 'ลอดห่วง! +5', '#7cf3ff');
        for (let i = 0; i < 16; i++) {
          const a = R(0, 6.28), v = R(80, 220);
          sparks.push({ x: hoop.x, y: hoop.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: R(0.4, 0.8) });
        }
      }
      if (ball.y >= FLOOR - BR) { SP.sfx.hit(); ctx.gameOver(score, 'ลูกตะกร้อตกพื้น!'); return; }
    }
    for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 300 * dt; s.life -= dt; }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
    for (const x of texts) { x.y -= 38 * dt; x.life -= dt; }
    for (let i = texts.length - 1; i >= 0; i--) if (texts[i].life <= 0) texts.splice(i, 1);
    for (const f of feet) f.life -= dt;
    for (let i = feet.length - 1; i >= 0; i--) if (feet[i].life <= 0) feet.splice(i, 1);
  }

  function drawBall() {
    // เงา
    const h = clamp((FLOOR - ball.y) / FLOOR, 0, 1);
    g.fillStyle = 'rgba(0,0,0,' + (0.35 - h * 0.2) + ')';
    g.beginPath(); g.ellipse(ball.x, FLOOR + 6, BR * (1.1 - h * 0.5), 8 * (1.1 - h * 0.5), 0, 0, 6.3); g.fill();
    g.save(); g.translate(ball.x, ball.y); g.rotate(ball.rot);
    const gr = g.createRadialGradient(-8, -10, 4, 0, 0, BR);
    gr.addColorStop(0, '#ffe28a'); gr.addColorStop(1, '#d9962b');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, BR, 0, 6.3); g.fill();
    g.strokeStyle = '#7a4a10'; g.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      g.beginPath(); g.ellipse(0, 0, BR - 1, BR * 0.42, i * Math.PI / 3, 0, 6.3); g.stroke();
    }
    g.beginPath(); g.arc(0, 0, BR - 1, 0, 6.3); g.stroke();
    g.restore();
  }

  function draw() {
    // ท้องฟ้าเย็น ๆ
    const sky = g.createLinearGradient(0, 0, 0, FLOOR);
    sky.addColorStop(0, '#4c1d95'); sky.addColorStop(0.6, '#a855a8'); sky.addColorStop(1, '#fbbf24');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    SP.glow(g, 120, 330, 220, 'rgba(255,220,100,0.55)', 1);
    // วัดไกล ๆ
    g.fillStyle = '#3a1280';
    [[610, 0.9], [740, 0.7], [160, 0.75]].forEach(p => {
      const x = p[0], s = p[1];
      g.beginPath(); g.moveTo(x - 50 * s, FLOOR); g.lineTo(x - 40 * s, FLOOR - 70 * s); g.lineTo(x, FLOOR - 170 * s);
      g.lineTo(x + 40 * s, FLOOR - 70 * s); g.lineTo(x + 50 * s, FLOOR); g.closePath(); g.fill();
      g.fillRect(x - 3, FLOOR - 205 * s, 6, 40 * s);
    });
    // พื้นลานดิน
    const fl = g.createLinearGradient(0, FLOOR, 0, H);
    fl.addColorStop(0, '#8b5a14'); fl.addColorStop(1, '#4a2e07');
    g.fillStyle = fl; g.fillRect(0, FLOOR, W, H - FLOOR);
    g.fillStyle = '#ffd21f'; g.fillRect(0, FLOOR, W, 5);

    // ห่วง
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(hoop.x - hoop.w / 2, hoop.y); g.lineTo(hoop.x - hoop.w / 2 - 6, 0); g.moveTo(hoop.x + hoop.w / 2, hoop.y); g.lineTo(hoop.x + hoop.w / 2 + 6, 0); g.stroke();
    g.strokeStyle = '#ffd21f'; g.lineWidth = 7;
    g.beginPath(); g.ellipse(hoop.x, hoop.y, hoop.w / 2, 15, 0, 0, 6.3); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(hoop.x, hoop.y, hoop.w / 2 - 6, 11, 0, 0, 6.3); g.stroke();
    SP.glow(g, hoop.x, hoop.y, 70, 'rgba(255,210,31,0.4)', hoopCd > 0 ? 1 : 0.6);

    // นับครั้งใหญ่จาง ๆ
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.font = '800 150px Prompt, sans-serif'; g.textAlign = 'center';
    g.fillText(String(kicks), W / 2, 330);

    drawBall();
    // เท้าเตะ
    for (const f of feet) {
      g.save(); g.globalAlpha = clamp(f.life / 0.18, 0, 1);
      g.fillStyle = '#f1c27d'; SP.rr(g, f.x - 22, f.y - 4, 44, 20, 10); g.fill();
      g.fillStyle = '#7c3aed'; SP.rr(g, f.x - 22, f.y + 10, 44, 10, 5); g.fill();
      g.restore();
    }
    for (const s of sparks) { g.globalAlpha = clamp(s.life * 3, 0, 1); g.fillStyle = '#ffe066'; g.beginPath(); g.arc(s.x, s.y, 3, 0, 6.3); g.fill(); }
    g.globalAlpha = 1;
    g.font = '800 22px Prompt, sans-serif'; g.textAlign = 'center';
    for (const x of texts) {
      g.globalAlpha = clamp(x.life * 1.5, 0, 1);
      g.lineWidth = 4; g.strokeStyle = 'rgba(20,4,45,0.8)'; g.strokeText(x.s, x.x, x.y);
      g.fillStyle = x.c; g.fillText(x.s, x.x, x.y);
    }
    g.globalAlpha = 1;
    if (!started) {
      g.fillStyle = 'rgba(20,4,45,0.75)'; SP.rr(g, W / 2 - 210, 250, 420, 70, 16); g.fill();
      g.fillStyle = '#fff'; g.font = '700 20px Prompt, sans-serif'; g.textAlign = 'center';
      g.fillText('แตะลูกตะกร้อเพื่อเริ่มเตะ', W / 2, 280);
      g.fillStyle = '#ffd21f'; g.font = '500 15px Prompt, sans-serif';
      g.fillText('แตะล่างลูก = เตะแรง · แตะข้างลูก = เปลี่ยนทิศ', W / 2, 303);
    }
  }

  ctx.loop(dt => { update(dt); draw(); });
});
