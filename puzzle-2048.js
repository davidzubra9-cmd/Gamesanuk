/* 2048 ม่วงทอง — เลื่อนตัวเลขให้เท่ากันรวมกัน (DOM) */
SP.register('puzzle-2048', function (ctx) {
  const N = 4;
  const COLORS = {
    2: ['#ede4ff', '#4c1d95'], 4: ['#d9c8ff', '#4c1d95'], 8: ['#b794f6', '#fff'], 16: ['#9f6bf2', '#fff'],
    32: ['#8248e8', '#fff'], 64: ['#6d28d9', '#fff'], 128: ['#ffe27a', '#4c1d95'], 256: ['#ffd21f', '#4c1d95'],
    512: ['#ffbd14', '#4c1d95'], 1024: ['#ff9f0a', '#fff'], 2048: ['#ff7a00', '#fff']
  };
  let grid, score = 0, won = false, over = false, nid = 1;
  let tiles = {};                       // id -> {el, r, c, v}
  const root = ctx.root;

  root.innerHTML =
    '<div class="t48"><div class="t48-top"><h2>2048</h2>' +
    '<div style="display:flex;gap:.5em"><div class="t48-box">คะแนน<b data-s>0</b></div><div class="t48-box">สูงสุด<b data-b>0</b></div></div></div>' +
    '<div class="t48-hint">รวมเลขที่เท่ากันให้ถึง <b style="color:#ffd21f">2048</b> — ปัดนิ้วหรือกดลูกศร</div>' +
    '<div class="t48-board"><div class="t48-cells"></div><div class="t48-tiles"></div></div></div>';
  const cellsEl = root.querySelector('.t48-cells'), tilesEl = root.querySelector('.t48-tiles');
  const sEl = root.querySelector('[data-s]'), bEl = root.querySelector('[data-b]');
  bEl.textContent = SP.fmt(ctx.best);

  const STEP = 25.3;                    // ระยะเป็น % ของพื้นที่กระดาน
  for (let i = 0; i < N * N; i++) {
    const d = document.createElement('div'); d.className = 't48-cell';
    d.style.left = (i % N) * STEP + '%'; d.style.top = Math.floor(i / N) * STEP + '%';
    cellsEl.appendChild(d);
  }

  grid = Array.from({ length: N }, () => Array(N).fill(null));

  function place(el, r, c) { el.style.left = c * STEP + '%'; el.style.top = r * STEP + '%'; }
  function paint(el, v) {
    const col = COLORS[v] || ['#ff5500', '#fff'];
    el.style.background = col[0]; el.style.color = col[1];
    el.textContent = String(v);
    el.className = 't48-tile' + (v >= 1000 ? ' d4' : v >= 100 ? ' d3' : '');
  }
  function addTile(r, c, v, isNew) {
    const el = document.createElement('div');
    paint(el, v); place(el, r, c);
    if (isNew) el.classList.add('new');
    tilesEl.appendChild(el);
    const t = { id: nid++, el, r, c, v };
    grid[r][c] = t; return t;
  }
  function spawn() {
    const empty = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) empty.push([r, c]);
    if (!empty.length) return;
    const p = SP.pick(empty);
    addTile(p[0], p[1], Math.random() < 0.9 ? 2 : 4, true);
  }

  function canMove() {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const t = grid[r][c];
      if (!t) return true;
      if (c < N - 1 && grid[r][c + 1] && grid[r][c + 1].v === t.v) return true;
      if (r < N - 1 && grid[r + 1][c] && grid[r + 1][c].v === t.v) return true;
    }
    return false;
  }

  function move(dr, dc) {
    if (over) return;
    let moved = false, gain = 0;
    const order = [];
    for (let i = 0; i < N; i++) order.push(i);
    const rs = dr > 0 ? order.slice().reverse() : order, cs = dc > 0 ? order.slice().reverse() : order;
    const merged = new Set();
    const toRemove = [];
    for (const r of rs) for (const c of cs) {
      const t = grid[r][c]; if (!t) continue;
      let nr = r, nc = c;
      while (true) {
        const tr = nr + dr, tc = nc + dc;
        if (tr < 0 || tc < 0 || tr >= N || tc >= N) break;
        const o = grid[tr][tc];
        if (!o) { nr = tr; nc = tc; continue; }
        if (o.v === t.v && !merged.has(o.id)) { nr = tr; nc = tc; }
        break;
      }
      if (nr === r && nc === c) continue;
      const target = grid[nr][nc];
      grid[r][c] = null;
      if (target) {   // รวมกัน
        merged.add(target.id);
        target.v *= 2; gain += target.v; t.r = nr; t.c = nc; place(t.el, nr, nc);
        toRemove.push({ t, into: target });
      } else { grid[nr][nc] = t; t.r = nr; t.c = nc; place(t.el, nr, nc); }
      moved = true;
    }
    if (!moved) return;
    SP.sfx.click();
    setTimeout(() => {
      for (const m of toRemove) {
        m.t.el.remove();
        paint(m.into.el, m.into.v); m.into.el.classList.add('merge');
        setTimeout(() => m.into.el.classList.remove('merge'), 220);
      }
    }, 120);
    if (gain) { score += gain; sEl.textContent = SP.fmt(score); ctx.setScore(score); SP.sfx.pop(); }
    spawn();
    if (!won) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c] && grid[r][c].v >= 2048) {
        won = true; SP.sfx.win();
        const toast = document.createElement('div'); toast.className = 't48-toast'; toast.textContent = '🎉 ถึง 2048 แล้ว! เล่นต่อได้เลย';
        root.querySelector('.t48').appendChild(toast); ctx.after(() => toast.remove(), 2200);
      }
    }
    if (!canMove()) { over = true; ctx.after(() => ctx.gameOver(score, 'กระดานเต็มแล้ว'), 500); }
  }

  ctx.on(window, 'keydown', e => {
    const k = e.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') move(-1, 0);
    else if (k === 'ArrowDown' || k === 's' || k === 'S') move(1, 0);
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') move(0, -1);
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') move(0, 1);
  });
  let sx = 0, sy = 0, tracking = false;
  ctx.on(root, 'pointerdown', e => { sx = e.clientX; sy = e.clientY; tracking = true; });
  ctx.on(window, 'pointerup', e => {
    if (!tracking) return; tracking = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) move(0, dx > 0 ? 1 : -1); else move(dy > 0 ? 1 : -1, 0);
  });

  ctx.setScore(0);
  spawn(); spawn();
});
