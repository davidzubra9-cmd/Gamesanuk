/* ระนาดเอกฮีโร่ — เกมจังหวะ 4 ช่องทาง ตีให้ตรงจังหวะแล้วเสียงระนาดจะดังเป็นทำนอง */
SP.register('ranad-hero', function (ctx) {
  const W = ctx.w, H = ctx.h, g = ctx.g;
  const clamp = SP.clamp;
  const LANES = 4, LW = W / LANES, HIT_Y = H - 120, TRAVEL = 1.55;
  const SPEED = (HIT_Y + 40) / TRAVEL;
  const FREQ = [523.25, 587.33, 659.25, 783.99];            // ซอล-ลา-ที-เร ในบันไดเสียงเพนทาโทนิก
  const NAMES = ['โด', 'เร', 'มี', 'ซอล'];
  const COLORS = ['#ffd21f', '#ff9f43', '#ffd21f', '#ff9f43'];
  const KEYS = { d: 0, f: 1, j: 2, k: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3, D: 0, F: 1, J: 2, K: 3 };

  /* ---------- สร้างโน้ตเพลง (ทำนองลายไทยจากบันไดเสียงเพนทาโทนิก) ---------- */
  const A = [0, 1, 2, -1, 2, 1, 0, -1, 1, 2, 3, -1, 3, 2, 1, -1];
  const B = [2, 3, 2, 1, 2, -1, 0, -1, 0, 1, 2, 3, 2, 1, 0, -1];
  const C = [0, 0, 1, 2, 3, -1, 3, 2, 1, 1, 2, 3, 3, 2, 1, 0];
  const SONG = [A, A, B, A, B, C, A, C, B, C];
  const STEP = 0.28, LEAD = 2.2;
  const notes = [];
  SONG.forEach((ph, pi) => {
    ph.forEach((lane, si) => {
      if (lane < 0) return;
      const time = LEAD + (pi * 16 + si) * STEP;
      notes.push({ lane, time, done: false });
      if (pi >= 4 && si % 4 === 0) notes.push({ lane: (lane + 2) % LANES, time, done: false });
    });
  });
  const END = notes[notes.length - 1].time + 1.2;

  let songT = 0, score = 0, combo = 0, best = 0, energy = 100, perfect = 0, good = 0, miss = 0;
  const flash = [0, 0, 0, 0], pops = [], sparks = [];
  let t = 0;

  function judge(txt, color, lane) { pops.push({ txt, color, x: lane * LW + LW / 2, y: HIT_Y - 70, life: 0.6 }); }

  function press(lane) {
    flash[lane] = 0.18;
    let n = null;
    for (const q of notes) {
      if (q.done || q.lane !== lane) continue;
      const d = Math.abs(q.time - songT);
      if (d <= 0.15 && (!n || d < Math.abs(n.time - songT))) n = q;
    }
    if (!n) {
      SP.tone(180, 0.06, 'triangle', 0.06);       // ตีเปล่า เสียงทึบ ๆ
      energy = Math.max(0, energy - 2);
      return;
    }
    n.done = true; n.hit = true;
    const d = Math.abs(n.time - songT);
    const isPerfect = d <= 0.07;
    combo++; best = Math.max(best, combo);
    const mult = 1 + Math.floor(combo / 10) * 0.2;
    score += Math.round((isPerfect ? 100 : 50) * mult);
    if (isPerfect) { perfect++; judge('Perfect', '#ffe066', lane); energy = Math.min(100, energy + 2); }
    else { good++; judge('Good', '#7cf3ff', lane); energy = Math.min(100, energy + 1); }
    ctx.setScore(score);
    SP.sfx.ranad(FREQ[lane]);
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * 6.28, v = 60 + Math.random() * 140;
      sparks.push({ x: lane * LW + LW / 2, y: HIT_Y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0.5, c: isPerfect ? '#ffe066' : '#7cf3ff' });
    }
  }

  ctx.on(window, 'keydown', e => {
    if (e.repeat) return;
    const l = KEYS[e.key];
    if (l !== undefined) press(l);
  });
  ctx.on(ctx.canvas, 'pointerdown', e => {
    const p = ctx.pos(e);
    press(clamp(Math.floor(p.x / LW), 0, LANES - 1));
  });

  function update(dt) {
    t += dt; songT += dt;
    for (let i = 0; i < LANES; i++) if (flash[i] > 0) flash[i] -= dt;
    for (const q of notes) {
      if (!q.done && songT - q.time > 0.16) {
        q.done = true; q.missed = true; miss++; combo = 0; energy -= 9;
        judge('พลาด', '#ff7b7b', q.lane); SP.tone(130, 0.12, 'sawtooth', 0.05);
      }
    }
    for (const p of pops) { p.y -= 40 * dt; p.life -= dt; }
    for (let i = pops.length - 1; i >= 0; i--) if (pops[i].life <= 0) pops.splice(i, 1);
    for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 300 * dt; s.life -= dt; }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
    if (energy <= 0) { ctx.gameOver(score, 'พลังหมดก่อนจบเพลง'); return; }
    if (songT > END) {
      const bonus = Math.round(energy) * 5;
      ctx.gameOver(score + bonus, 'จบเพลง! 🎉 โบนัสพลัง +' + bonus);
    }
  }

  function drawNote(x, y, lane) {
    SP.glow(g, x, y, 50, 'rgba(255,210,31,0.55)', 0.7);
    const gr = g.createLinearGradient(x, y - 20, x, y + 20);
    gr.addColorStop(0, '#fff3a8'); gr.addColorStop(1, COLORS[lane]);
    g.fillStyle = gr; SP.rr(g, x - 44, y - 17, 88, 34, 17); g.fill();
    g.strokeStyle = '#7a4a10'; g.lineWidth = 2.5; SP.rr(g, x - 44, y - 17, 88, 34, 17); g.stroke();
    g.fillStyle = '#7a4a10'; g.beginPath(); g.arc(x - 28, y, 3, 0, 6.3); g.arc(x + 28, y, 3, 0, 6.3); g.fill();
  }

  function draw() {
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#14052e'); bg.addColorStop(1, '#3a1380');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // ลวดลายจาง ๆ
    g.strokeStyle = 'rgba(255,210,31,0.05)'; g.lineWidth = 1.5;
    for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(W / 2, 220, 40 + i * 34, 0, 6.3); g.stroke(); }
    // ช่องทาง
    for (let i = 0; i < LANES; i++) {
      const f = clamp(flash[i] / 0.18, 0, 1);
      if (f > 0) {
        const gr = g.createLinearGradient(0, HIT_Y - 260, 0, HIT_Y + 40);
        gr.addColorStop(0, 'rgba(255,210,31,0)'); gr.addColorStop(1, 'rgba(255,210,31,' + (0.4 * f) + ')');
        g.fillStyle = gr; g.fillRect(i * LW, HIT_Y - 260, LW, 300);
      }
      if (i) { g.strokeStyle = 'rgba(255,210,31,0.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(i * LW, 0); g.lineTo(i * LW, H); g.stroke(); }
    }
    // โน้ตที่กำลังลงมา
    for (const q of notes) {
      if (q.done) continue;
      const y = HIT_Y - (q.time - songT) * SPEED;
      if (y < -40 || y > H + 40) continue;
      drawNote(q.lane * LW + LW / 2, y, q.lane);
    }
    // เส้นตี + ลูกระนาด
    g.fillStyle = 'rgba(255,210,31,0.9)'; g.fillRect(0, HIT_Y - 2, W, 4);
    for (let i = 0; i < LANES; i++) {
      const x = i * LW + LW / 2, f = clamp(flash[i] / 0.18, 0, 1);
      const bar = g.createLinearGradient(0, HIT_Y + 14, 0, HIT_Y + 66);
      bar.addColorStop(0, f > 0 ? '#ffe9a0' : '#b8742a'); bar.addColorStop(1, f > 0 ? '#ffd21f' : '#6b3a10');
      g.fillStyle = bar; SP.rr(g, x - 46, HIT_Y + 14 + f * 4, 92, 52, 14); g.fill();
      g.strokeStyle = '#ffd21f'; g.lineWidth = 3; SP.rr(g, x - 46, HIT_Y + 14 + f * 4, 92, 52, 14); g.stroke();
      g.fillStyle = f > 0 ? '#3a1280' : '#ffe9a0'; g.font = '700 18px Prompt, sans-serif'; g.textAlign = 'center';
      g.fillText(NAMES[i], x, HIT_Y + 46 + f * 4);
    }
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.font = '500 13px Prompt, sans-serif'; g.textAlign = 'center';
    ['D', 'F', 'J', 'K'].forEach((k, i) => g.fillText(k, i * LW + LW / 2, H - 14));

    for (const s of sparks) { g.globalAlpha = clamp(s.life * 2, 0, 1); g.fillStyle = s.c; g.beginPath(); g.arc(s.x, s.y, 3, 0, 6.3); g.fill(); }
    g.globalAlpha = 1;
    g.font = '800 24px Prompt, sans-serif'; g.textAlign = 'center';
    for (const p of pops) {
      g.globalAlpha = clamp(p.life * 2.2, 0, 1);
      g.lineWidth = 4; g.strokeStyle = 'rgba(20,4,45,0.85)'; g.strokeText(p.txt, p.x, p.y);
      g.fillStyle = p.color; g.fillText(p.txt, p.x, p.y);
    }
    g.globalAlpha = 1;

    // พลัง
    g.fillStyle = 'rgba(0,0,0,0.5)'; SP.rr(g, 14, 14, W - 28, 14, 7); g.fill();
    g.fillStyle = energy < 30 ? '#ff5d5d' : '#ffd21f'; SP.rr(g, 14, 14, Math.max(8, (W - 28) * clamp(energy / 100, 0, 1)), 14, 7); g.fill();
    // ความคืบหน้าเพลง
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(14, 34, (W - 28) * clamp(songT / END, 0, 1), 3);
    if (combo >= 3) {
      g.fillStyle = '#fff'; g.font = '800 36px Prompt, sans-serif'; g.textAlign = 'center';
      g.lineWidth = 5; g.strokeStyle = 'rgba(20,4,45,0.85)'; g.strokeText(combo + ' คอมโบ', W / 2, 140); g.fillText(combo + ' คอมโบ', W / 2, 140);
    }
    if (songT < LEAD - 0.4) {
      g.fillStyle = 'rgba(20,4,45,0.75)'; SP.rr(g, W / 2 - 190, 230, 380, 90, 18); g.fill();
      g.fillStyle = '#ffd21f'; g.font = '800 28px Prompt, sans-serif'; g.textAlign = 'center';
      g.fillText('เตรียมตัว...', W / 2, 270);
      g.fillStyle = '#fff'; g.font = '500 16px Prompt, sans-serif';
      g.fillText('แตะช่องทาง หรือกด D F J K ให้ตรงจังหวะ', W / 2, 300);
    }
  }

  ctx.loop(dt => { update(dt); draw(); });
});
