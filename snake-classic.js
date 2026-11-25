/* งูเขียวนักกิน — เกมงูคลาสสิก ปัดนิ้วหรือกดลูกศร */
SP.register('snake-classic', function (ctx) {
  const W = ctx.w, H = ctx.h, g = ctx.g;
  const R = SP.rand, clamp = SP.clamp;
  const N = 20, C = W / N;

  let snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  let dir = { x: 1, y: 0 }, queue = [], acc = 0, score = 0, t = 0, grow = 0;
  let food = null, gold = null, goldT = 0, parts = [], eaten = 0;
  const FRUITS = ['🍎', '🍊', '🍇', '🍓', '🥭', '🍍'];
  let fruit = FRUITS[0];

  function free(x, y) { return !snake.some(s => s.x === x && s.y === y) && !(food && food.x === x && food.y === y) && !(gold && gold.x === x && gold.y === y); }
  function randCell() {
    for (let i = 0; i < 400; i++) { const x = SP.irand(0, N - 1), y = SP.irand(0, N - 1); if (free(x, y)) return { x, y }; }
    return null;
  }
  food = randCell();

  function setDir(dx, dy) {
    const last = queue.length ? queue[queue.length - 1] : dir;
    if ((dx === -last.x && dy === -last.y) || (dx === last.x && dy === last.y)) return;
    if (queue.length < 3) queue.push({ x: dx, y: dy });
  }
  ctx.on(window, 'keydown', e => {
    const k = e.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') setDir(0, -1);
    else if (k === 'ArrowDown' || k === 's' || k === 'S') setDir(0, 1);
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') setDir(-1, 0);
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') setDir(1, 0);
  });
  let sx = 0, sy = 0, sw = false;
  ctx.on(ctx.canvas, 'pointerdown', e => { sx = e.clientX; sy = e.clientY; sw = true; });
  ctx.on(ctx.canvas, 'pointermove', e => {
    if (!sw) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 24) {
      if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0); else setDir(0, dy > 0 ? 1 : -1);
      sx = e.clientX; sy = e.clientY;
    }
  });
  ctx.on(window, 'pointerup', () => { sw = false; });

  function burst(x, y, c) {
    for (let i = 0; i < 10; i++) { const a = R(0, 6.28), v = R(40, 140); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: R(0.3, 0.6), c }); }
  }

  function step() {
    if (queue.length) dir = queue.shift();
    const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || snake.slice(0, snake.length - (grow > 0 ? 0 : 1)).some(s => s.x === h.x && s.y === h.y)) {
      SP.sfx.hit(); ctx.gameOver(score, 'งูชนแล้ว!'); return false;
    }
    snake.unshift(h);
    if (food && h.x === food.x && h.y === food.y) {
      score += 10; grow += 1; eaten++; SP.sfx.pop(); burst(h.x * C + C / 2, h.y * C + C / 2, '#ff6b6b');
      fruit = SP.pick(FRUITS); food = randCell();
      if (eaten % 5 === 0 && !gold) { gold = randCell(); goldT = 7; }
    } else if (gold && h.x === gold.x && h.y === gold.y) {
      score += 30; grow += 2; SP.sfx.coin(); burst(h.x * C + C / 2, h.y * C + C / 2, '#ffd21f'); gold = null;
    }
    if (grow > 0) grow--; else snake.pop();
    ctx.setScore(score);
    return true;
  }

  function update(dt) {
    t += dt;
    const interval = Math.max(0.065, 0.15 - snake.length * 0.0018);
    acc += dt;
    while (acc >= interval) { acc -= interval; if (!step()) return; }
    if (gold) { goldT -= dt; if (goldT <= 0) gold = null; }
    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    parts = parts.filter(p => p.life > 0);
  }

  function draw() {
    g.fillStyle = '#1a0638'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      g.fillStyle = (x + y) % 2 ? '#2a0d5c' : '#240a52'; g.fillRect(x * C, y * C, C, C);
    }
    g.font = (C * 0.8) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (food) g.fillText(fruit, food.x * C + C / 2, food.y * C + C / 2 + 2);
    if (gold) {
      SP.glow(g, gold.x * C + C / 2, gold.y * C + C / 2, C, 'rgba(255,210,31,0.8)', 0.8);
      SP.starPath(g, gold.x * C + C / 2, gold.y * C + C / 2, C * 0.45, C * 0.2, 5, t * 2);
      g.fillStyle = '#ffd21f'; g.fill();
      if (goldT < 2 && Math.floor(t * 8) % 2) { g.fillStyle = 'rgba(26,6,56,0.6)'; g.fill(); }
    }
    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i], k = 1 - i / (snake.length + 6) * 0.5;
      g.fillStyle = i % 2 ? 'rgb(' + Math.round(160 * k) + ',' + Math.round(230 * k) + ',' + Math.round(50 * k) + ')' : 'rgb(' + Math.round(130 * k) + ',' + Math.round(210 * k) + ',' + Math.round(40 * k) + ')';
      SP.rr(g, s.x * C + 1.5, s.y * C + 1.5, C - 3, C - 3, i === 0 ? 8 : 6); g.fill();
    }
    const h = snake[0], hx = h.x * C + C / 2, hy = h.y * C + C / 2;
    g.fillStyle = '#ffd21f'; g.beginPath(); g.arc(hx + dir.x * 3, hy + dir.y * 3, C * 0.12 + 4, 0, 6.3);
    g.fillStyle = '#fff';
    const px = -dir.y, py = dir.x;
    [[-1], [1]].forEach(m => {
      const ex = hx + dir.x * 4 + px * m[0] * 5, ey = hy + dir.y * 4 + py * m[0] * 5;
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, 3.6, 0, 6.3); g.fill();
      g.fillStyle = '#2a0b55'; g.beginPath(); g.arc(ex + dir.x, ey + dir.y, 1.8, 0, 6.3); g.fill();
    });
    g.textBaseline = 'alphabetic';
    for (const p of parts) { g.globalAlpha = clamp(p.life * 3, 0, 1); g.fillStyle = p.c; g.fillRect(p.x - 2, p.y - 2, 4, 4); }
    g.globalAlpha = 1;
    if (t < 3 && snake.length <= 3) {
      g.fillStyle = 'rgba(20,4,45,0.75)'; SP.rr(g, W / 2 - 170, H / 2 + 50, 340, 42, 14); g.fill();
      g.fillStyle = '#fff'; g.font = '600 17px Prompt, sans-serif'; g.textAlign = 'center';
      g.fillText('กดลูกศร หรือปัดนิ้วเพื่อเลี้ยว', W / 2, H / 2 + 77);
    }
  }

  ctx.loop(dt => { update(dt); draw(); });
});
