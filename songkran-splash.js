/* สงกรานต์สาดน้ำ — สาดน้ำเพื่อน ๆ แต่ห้ามสาดพระสงฆ์และผู้ใหญ่ */
SP.register('songkran-splash', function (ctx) {
  const W = ctx.w, H = ctx.h, g = ctx.g;
  const R = SP.rand, clamp = SP.clamp;

  const TOTAL = 45;
  let timeLeft = TOTAL, elapsed = 0, score = 0, combo = 0, spawnT = 0.6, t = 0;
  const holes = [];
  [[170, 290], [400, 290], [630, 290], [170, 440], [400, 440], [630, 440]].forEach(p => holes.push({ x: p[0], y: p[1], p: null }));
  const drops = [], texts = [];

  const SHIRTS = ['#ff6b9d', '#4dd0e1', '#ffca28', '#81c784', '#ff8a65'];
  const SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#ffdbac'];

  function spawn() {
    const free = holes.filter(h => !h.p);
    if (!free.length) return;
    const maxActive = elapsed < 15 ? 3 : elapsed < 30 ? 4 : 5;
    if (holes.length - free.length >= maxActive) return;
    const h = SP.pick(free), r = Math.random();
    const kind = r < 0.6 ? 'friend' : r < 0.74 ? 'monk' : r < 0.88 ? 'elder' : 'elephant';
    const fast = Math.max(0.6, 1 - elapsed * 0.009);
    h.p = {
      kind, st: 'up', rise: 0, tm: 0, wet: 0,
      stay: (kind === 'friend' ? R(1.0, 1.6) : kind === 'elephant' ? 1.3 : 1.6) * fast,
      shirt: SP.pick(SHIRTS), skin: SP.pick(SKINS), flower: Math.floor(R(0, 3))
    };
  }

  function say(x, y, s, c) { texts.push({ x, y, s, c, life: 1 }); }
  function splash(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = R(0, 6.28), v = R(60, 260);
      drops.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 90, life: R(0.4, 0.8) });
    }
  }

  ctx.on(ctx.canvas, 'pointerdown', e => {
    const p = ctx.pos(e);
    splash(p.x, p.y, 12); SP.sfx.splash();
    for (const h of holes) {
      const q = h.p;
      if (!q || q.st === 'hit' || q.st === 'down' || q.rise < 0.35) continue;
      const sc = q.kind === 'elephant' ? 1.25 : 1;
      const top = h.y - 118 * q.rise * sc;
      if (Math.abs(p.x - h.x) < 50 * sc && p.y > top - 6 && p.y < h.y + 6) {
        q.st = 'hit'; q.tm = 0; q.wet = 1;
        splash(h.x, h.y - 60 * q.rise, 18);
        if (q.kind === 'friend') {
          combo++;
          const m = 1 + Math.min(4, Math.floor(combo / 4));
          score += 10 * m; SP.sfx.pop();
          say(h.x, h.y - 130, '+' + 10 * m, '#ffe066');
        } else if (q.kind === 'elephant') {
          score += 50; timeLeft = Math.min(TOTAL + 10, timeLeft + 3); combo++; SP.sfx.coin();
          say(h.x, h.y - 150, 'ช้างช่วย! +50 / +3วิ', '#7cf3ff');
        } else {
          score = Math.max(0, score - 20); timeLeft = Math.max(0, timeLeft - 3); combo = 0; SP.sfx.hit();
          say(h.x, h.y - 130, q.kind === 'monk' ? 'ไม่สุภาพนะ 🙏 -20' : 'เคารพผู้ใหญ่ 🙏 -20', '#ff7b7b');
        }
        ctx.setScore(score);
        break;
      }
    }
  });

  function update(dt) {
    t += dt; elapsed += dt; timeLeft -= dt;
    if (timeLeft <= 0) { ctx.gameOver(score, 'หมดเวลาสงกรานต์!'); return; }
    spawnT -= dt;
    if (spawnT <= 0) { spawn(); spawnT = Math.max(0.35, 0.95 - elapsed * 0.012) * R(0.8, 1.2); }

    for (const h of holes) {
      const q = h.p; if (!q) continue;
      q.tm += dt;
      if (q.st === 'up') { q.rise = clamp(q.tm / 0.18, 0, 1); if (q.rise >= 1) { q.st = 'stay'; q.tm = 0; } }
      else if (q.st === 'stay') {
        q.rise = 1;
        if (q.tm >= q.stay) { q.st = 'down'; q.tm = 0; if (q.kind === 'friend') combo = 0; }
      } else if (q.st === 'hit') { if (q.tm >= 0.45) { q.st = 'down'; q.tm = 0; } }
      else if (q.st === 'down') { q.rise = clamp(1 - q.tm / 0.2, 0, 1); if (q.rise <= 0) h.p = null; }
    }
    for (const d of drops) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 700 * dt; d.life -= dt; }
    for (let i = drops.length - 1; i >= 0; i--) if (drops[i].life <= 0) drops.splice(i, 1);
    for (const x of texts) { x.y -= 36 * dt; x.life -= dt; }
    for (let i = texts.length - 1; i >= 0; i--) if (texts[i].life <= 0) texts.splice(i, 1);
  }

  function drawPerson(h) {
    const q = h.p, sc = q.kind === 'elephant' ? 1.25 : 1;
    g.save();
    g.beginPath(); g.rect(h.x - 90, h.y - 190, 180, 190 + 4); g.clip();
    g.translate(h.x, h.y + (1 - q.rise) * 130);
    g.scale(sc, sc);
    const bob = q.st === 'stay' ? Math.sin(t * 8 + h.x) * 2 : 0;
    g.translate(0, bob);
    const wet = q.wet > 0;
    if (q.kind === 'elephant') {
      g.fillStyle = '#8e8aa8';
      g.beginPath(); g.arc(-34, -62, 24, 0, 6.3); g.arc(34, -62, 24, 0, 6.3); g.fill();
      g.fillStyle = '#f2a6c4'; g.beginPath(); g.arc(-34, -62, 14, 0, 6.3); g.arc(34, -62, 14, 0, 6.3); g.fill();
      g.fillStyle = '#a7a3c0'; g.beginPath(); g.arc(0, -64, 34, 0, 6.3); g.fill();
      g.beginPath(); g.moveTo(-12, -50); g.quadraticCurveTo(-18, -10, 6, -8); g.lineTo(14, -16);
      g.quadraticCurveTo(-4, -18, 2, -48); g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-22, -42); g.lineTo(-32, -22); g.lineTo(-16, -34); g.fill();
      g.fillStyle = '#222'; g.beginPath(); g.arc(-12, -74, 3.5, 0, 6.3); g.arc(12, -74, 3.5, 0, 6.3); g.fill();
      g.fillStyle = '#ffd21f'; SP.rr(g, -20, -102, 40, 12, 6); g.fill();
      if (q.st === 'stay' || q.st === 'up') {
        g.strokeStyle = 'rgba(120,210,255,0.8)'; g.lineWidth = 3;
        for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(10 + i * 8, -10 - i * 8 + Math.sin(t * 20 + i) * 2, 3, 0, 6.3); g.stroke(); }
      }
    } else {
      const monk = q.kind === 'monk', elder = q.kind === 'elder';
      // ลำตัว
      g.fillStyle = monk ? '#ff9a1f' : elder ? '#9575cd' : q.shirt;
      SP.rr(g, -34, -58, 68, 62, 16); g.fill();
      if (monk) {
        g.fillStyle = '#e07b00'; g.beginPath(); g.moveTo(-34, -40); g.lineTo(34, -8); g.lineTo(34, 4); g.lineTo(-34, 4); g.closePath(); g.fill();
      } else if (!elder) {
        g.fillStyle = 'rgba(255,255,255,0.85)';
        for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(-24 + (i % 3) * 22, -40 + Math.floor(i / 3) * 24, 5, 0, 6.3); g.fill(); }
      }
      // หัว
      g.fillStyle = q.skin; g.beginPath(); g.arc(0, -80, 26, 0, 6.3); g.fill();
      if (monk) {
        g.fillStyle = 'rgba(0,0,0,0.08)'; g.beginPath(); g.arc(0, -90, 20, Math.PI, 0); g.fill();
      } else if (elder) {
        g.fillStyle = '#e8e8ef'; g.beginPath(); g.arc(0, -86, 26, Math.PI * 1.05, Math.PI * 1.95); g.fill();
        g.beginPath(); g.arc(0, -108, 10, 0, 6.3); g.fill();
        g.strokeStyle = '#444'; g.lineWidth = 2;
        g.beginPath(); g.arc(-10, -80, 7, 0, 6.3); g.arc(10, -80, 7, 0, 6.3); g.moveTo(-3, -80); g.lineTo(3, -80); g.stroke();
      } else {
        g.fillStyle = '#2d1b4e'; g.beginPath(); g.arc(0, -84, 27, Math.PI * 1.02, Math.PI * 1.98); g.fill();
        // พวงมาลัย / ดอกไม้ทัดหู
        g.fillStyle = ['#ff6b9d', '#ffd21f', '#fff'][q.flower]; g.beginPath(); g.arc(20, -96, 6, 0, 6.3); g.fill();
      }
      // หน้าตา
      g.fillStyle = '#222';
      if (wet) {
        g.strokeStyle = '#222'; g.lineWidth = 2.5;
        g.beginPath(); g.arc(-10, -78, 5, Math.PI, 0); g.arc(10, -78, 5, Math.PI, 0); g.stroke();
      } else {
        g.beginPath(); g.arc(-10, -78, 3.2, 0, 6.3); g.arc(10, -78, 3.2, 0, 6.3); g.fill();
      }
      g.strokeStyle = '#8a2b2b'; g.lineWidth = 2.5; g.beginPath();
      if (monk || elder) g.arc(0, -68, 7, 0.2, Math.PI - 0.2); else g.arc(0, -70, 10, 0.1, Math.PI - 0.1);
      g.stroke();
    }
    if (wet) {
      g.fillStyle = 'rgba(80,180,255,0.35)';
      g.beginPath(); g.arc(0, -66, 46, 0, 6.3); g.fill();
      g.fillStyle = 'rgba(160,220,255,0.9)';
      for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(-24 + i * 12, -50 + ((t * 80 + i * 17) % 40), 3, 5, 0, 0, 6.3); g.fill(); }
    }
    g.restore();
  }

  function drawBarrel(h) {
    const x = h.x, y = h.y;
    g.fillStyle = '#1e6bff'; SP.rr(g, x - 66, y - 2, 132, 76, 14); g.fill();
    g.fillStyle = '#4d94ff'; SP.rr(g, x - 66, y - 2, 132, 14, 8); g.fill();
    g.fillStyle = '#1250c9'; g.fillRect(x - 66, y + 30, 132, 7); g.fillRect(x - 66, y + 56, 132, 7);
    g.fillStyle = 'rgba(255,255,255,0.28)'; SP.rr(g, x - 54, y + 14, 14, 52, 7); g.fill();
    g.fillStyle = '#ffd21f'; g.font = '700 15px Prompt, sans-serif'; g.textAlign = 'center';
    g.fillText('สงกรานต์', x + 8, y + 52);
  }

  function draw() {
    // ท้องฟ้าร้อนระอุ
    const sky = g.createLinearGradient(0, 0, 0, 230);
    sky.addColorStop(0, '#5b21b6'); sky.addColorStop(0.55, '#c2417b'); sky.addColorStop(1, '#ffb347');
    g.fillStyle = sky; g.fillRect(0, 0, W, 230);
    SP.glow(g, 690, 60, 150, 'rgba(255,240,150,0.9)', 0.9);
    g.fillStyle = '#fff2a8'; g.beginPath(); g.arc(690, 60, 34, 0, 6.3); g.fill();
    // เรือนไทยไกล ๆ
    g.fillStyle = '#2b0d57';
    [[90, 175], [330, 190], [560, 180]].forEach(p => {
      g.beginPath(); g.moveTo(p[0] - 80, p[1] + 55); g.lineTo(p[0] - 56, p[1] + 5); g.quadraticCurveTo(p[0] - 30, p[1] - 5, p[0], p[1] - 40);
      g.quadraticCurveTo(p[0] + 30, p[1] - 5, p[0] + 56, p[1] + 5); g.lineTo(p[0] + 80, p[1] + 55); g.closePath(); g.fill();
    });
    // ธงราว
    g.strokeStyle = '#fff'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, 20); g.quadraticCurveTo(W / 2, 70, W, 20); g.stroke();
    const cols = ['#ffd21f', '#fff', '#a78bfa', '#ff6b9d'];
    for (let i = 0; i < 18; i++) {
      const tt = (i + 0.5) / 18, x = W * tt, y = 20 + 2 * 25 * tt * (1 - tt) * 2 + 0;
      g.fillStyle = cols[i % 4]; g.beginPath(); g.moveTo(x - 9, y); g.lineTo(x + 9, y); g.lineTo(x, y + 22); g.closePath(); g.fill();
    }
    // พื้นถนน
    const gr = g.createLinearGradient(0, 230, 0, H);
    gr.addColorStop(0, '#4a1d96'); gr.addColorStop(1, '#2a0b55');
    g.fillStyle = gr; g.fillRect(0, 230, W, H - 230);
    g.fillStyle = 'rgba(255,210,31,0.18)';
    for (let i = 0; i < 12; i++) g.fillRect(i * 80 + 20, 232, 40, 4);

    // คนและถัง เรียงแถวหลังก่อนแถวหน้า
    [290, 440].forEach(row => {
      holes.filter(h => h.y === row).forEach(h => {
        SP.glow(g, h.x, h.y + 40, 90, 'rgba(0,0,0,0.35)', 0.5);
        if (h.p && h.p.rise > 0) drawPerson(h);
        drawBarrel(h);
      });
    });

    for (const d of drops) {
      g.globalAlpha = clamp(d.life * 2, 0, 1);
      g.fillStyle = '#9fe0ff'; g.beginPath(); g.arc(d.x, d.y, 4, 0, 6.3); g.fill();
    }
    g.globalAlpha = 1;
    g.font = '800 22px Prompt, sans-serif'; g.textAlign = 'center';
    for (const x of texts) {
      g.globalAlpha = clamp(x.life * 1.5, 0, 1);
      g.lineWidth = 4; g.strokeStyle = 'rgba(20,4,45,0.8)'; g.strokeText(x.s, x.x, x.y);
      g.fillStyle = x.c; g.fillText(x.s, x.x, x.y);
    }
    g.globalAlpha = 1;

    // แถบเวลา
    const pct = clamp(timeLeft / TOTAL, 0, 1);
    g.fillStyle = 'rgba(20,4,45,0.7)'; g.fillRect(0, 0, W, 12);
    g.fillStyle = pct < 0.25 ? '#ff5d5d' : '#ffd21f'; g.fillRect(0, 0, W * pct, 12);
    g.fillStyle = '#fff'; g.font = '700 16px Prompt, sans-serif'; g.textAlign = 'left';
    g.fillText('⏱ ' + Math.ceil(timeLeft) + ' วิ', 12, 36);
    if (combo >= 3) {
      g.textAlign = 'right'; g.fillStyle = '#ffe066'; g.font = '800 20px Prompt, sans-serif';
      g.fillText('คอมโบ x' + combo, W - 14, 36);
    }
    if (t < 3.5) {
      g.globalAlpha = clamp(3.5 - t, 0, 1);
      g.fillStyle = 'rgba(20,4,45,0.75)'; SP.rr(g, W / 2 - 230, 98, 460, 44, 14); g.fill();
      g.fillStyle = '#fff'; g.font = '600 18px Prompt, sans-serif'; g.textAlign = 'center';
      g.fillText('แตะสาดเพื่อน ๆ — ห้ามสาดพระสงฆ์และผู้ใหญ่นะ 🙏', W / 2, 127);
      g.globalAlpha = 1;
    }
  }

  ctx.loop(dt => { update(dt); draw(); });
});
