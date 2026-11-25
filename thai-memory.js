/* จับคู่ไทยแท้ — เกมจับคู่การ์ดของดีเมืองไทย (DOM) */
SP.register('thai-memory', function (ctx) {
  const ITEMS = [
    ['🐘', 'ช้างไทย'], ['🥭', 'มะม่วง'], ['🍜', 'ก๋วยเตี๋ยว'], ['🌶️', 'พริก'],
    ['🥥', 'มะพร้าว'], ['🍍', 'สับปะรด'], ['🛺', 'ตุ๊กตุ๊ก'], ['🙏', 'สวัสดี'],
    ['🪁', 'ว่าว'], ['🥁', 'กลองไทย'], ['🍚', 'ข้าวเหนียว'], ['🦐', 'กุ้งแม่น้ำ'],
    ['🍗', 'ไก่ย่าง'], ['🍌', 'กล้วย'], ['🌺', 'ดอกไม้'], ['💦', 'สงกรานต์']
  ];
  const LEVELS = [{ pairs: 6, cols: 3, time: 50 }, { pairs: 8, cols: 4, time: 65 }, { pairs: 10, cols: 4, time: 80 }, { pairs: 12, cols: 4, time: 90 }];

  let level = 0, score = 0, time = 0, moves = 0, combo = 0;
  let first = null, lock = false, left = 0, ended = false;

  const root = ctx.root;
  root.innerHTML =
    '<div class="mem"><div class="mem-top"><span>ด่าน <b data-lv>1</b></span><span>⏱ <b data-tm>0</b></span><span>เปิด <b data-mv>0</b></span></div>' +
    '<div class="mem-grid"></div><div class="mem-msg"></div></div>';
  const grid = root.querySelector('.mem-grid');
  const msg = root.querySelector('.mem-msg');
  const lvEl = root.querySelector('[data-lv]'), tmEl = root.querySelector('[data-tm]'), mvEl = root.querySelector('[data-mv]');

  function toast(text, ms) {
    msg.textContent = text; msg.classList.add('show');
    ctx.after(() => msg.classList.remove('show'), ms || 1000);
  }

  function setup() {
    const L = LEVELS[Math.min(level, LEVELS.length - 1)];
    const extra = Math.max(0, level - (LEVELS.length - 1));
    time = Math.max(55, L.time - extra * 5);
    moves = 0; combo = 0; first = null; lock = false; left = L.pairs;
    lvEl.textContent = String(level + 1); mvEl.textContent = '0'; tmEl.textContent = String(Math.ceil(time));
    const picks = SP.shuffle(ITEMS.slice()).slice(0, L.pairs);
    const cards = SP.shuffle(picks.concat(picks));
    const rows = Math.ceil(cards.length / L.cols);
    grid.style.gridTemplateColumns = 'repeat(' + L.cols + ',1fr)';
    grid.style.gridTemplateRows = 'repeat(' + rows + ',1fr)';
    grid.innerHTML = '';
    cards.forEach(c => {
      const d = document.createElement('div');
      d.className = 'mem-card';
      d.dataset.k = c[0];
      d.innerHTML = '<div class="mem-in"><div class="mem-face mem-front">✦</div>' +
        '<div class="mem-face mem-back"><span class="e">' + c[0] + '</span><span class="t">' + c[1] + '</span></div></div>';
      grid.appendChild(d);
    });
  }

  ctx.on(grid, 'pointerdown', e => {
    const card = e.target.closest('.mem-card');
    if (!card || lock || ended) return;
    if (card.classList.contains('flip') || card.classList.contains('done')) return;
    card.classList.add('flip'); SP.sfx.flip();
    if (!first) { first = card; return; }
    moves++; mvEl.textContent = String(moves);
    const a = first, b = card; first = null;
    if (a.dataset.k === b.dataset.k) {
      combo++;
      a.classList.remove('flip'); b.classList.remove('flip'); a.classList.add('done'); b.classList.add('done');
      score += 100 * (level + 1) + (combo - 1) * 25;
      ctx.setScore(score); SP.sfx.coin();
      if (combo >= 2) toast('คอมโบ x' + combo + '!', 700);
      left--;
      if (left === 0) {
        const bonus = Math.ceil(time) * 10;
        score += bonus; ctx.setScore(score); SP.sfx.win();
        toast('ผ่านด่าน! โบนัสเวลา +' + bonus, 1500);
        lock = true;
        ctx.after(() => { level++; setup(); }, 1700);
      }
    } else {
      combo = 0; lock = true;
      ctx.after(() => { a.classList.remove('flip'); b.classList.remove('flip'); lock = false; }, 700);
    }
  });

  ctx.every(() => {
    if (ended || lock && left === 0) return;
    time -= 0.1;
    tmEl.textContent = String(Math.max(0, Math.ceil(time)));
    if (time <= 0) { ended = true; ctx.gameOver(score, 'หมดเวลา! ถึงด่าน ' + (level + 1)); }
  }, 100);

  ctx.setScore(0);
  setup();
});
