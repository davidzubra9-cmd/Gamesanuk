/* OX ท้าบอท — เล่นสู้บอท 5 รอบ เลือกระดับง่ายหรือยาก (DOM) */
SP.register('tic-tac-toe', function (ctx) {
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const ROUNDS = 5;
  const root = ctx.root;
  let hard = false, round = 1, score = 0, wins = 0, losses = 0, draws = 0;
  let b = Array(9).fill(''), turnLock = false, ended = false;

  function winnerOf(bd) {
    for (const l of LINES) if (bd[l[0]] && bd[l[0]] === bd[l[1]] && bd[l[0]] === bd[l[2]]) return { w: bd[l[0]], line: l };
    return null;
  }
  function minimax(bd, turn, depth) {
    const w = winnerOf(bd);
    if (w) return w.w === 'O' ? 10 - depth : depth - 10;
    if (bd.every(Boolean)) return 0;
    let best = turn === 'O' ? -99 : 99;
    for (let i = 0; i < 9; i++) if (!bd[i]) {
      bd[i] = turn;
      const v = minimax(bd, turn === 'O' ? 'X' : 'O', depth + 1);
      bd[i] = '';
      best = turn === 'O' ? Math.max(best, v) : Math.min(best, v);
    }
    return best;
  }
  function botMove() {
    const empty = []; for (let i = 0; i < 9; i++) if (!b[i]) empty.push(i);
    if (!hard) {
      // ระดับง่าย: ชนะถ้าเห็นทางชนะ ไม่งั้นสุ่ม (ไม่บล็อกเสมอไป)
      for (const i of empty) { b[i] = 'O'; if (winnerOf(b)) { b[i] = ''; return i; } b[i] = ''; }
      if (Math.random() < 0.35) for (const i of empty) { b[i] = 'X'; if (winnerOf(b)) { b[i] = ''; return i; } b[i] = ''; }
      return SP.pick(empty);
    }
    let bestV = -99, moves = [];
    for (const i of empty) {
      b[i] = 'O'; const v = minimax(b, 'X', 1); b[i] = '';
      if (v > bestV) { bestV = v; moves = [i]; } else if (v === bestV) moves.push(i);
    }
    return SP.pick(moves);
  }

  function renderPick() {
    root.innerHTML = '<div class="ox"><h2 style="font-size:2em;font-weight:800;color:#ffd21f">OX ท้าบอท</h2>' +
      '<p style="color:#eadfff">เล่นสู้บอท ' + ROUNDS + ' รอบ เลือกระดับความยาก</p>' +
      '<div class="ox-pick"><button class="btn" data-lv="0">🙂 ง่าย</button><button class="btn ghost" data-lv="1">😈 ยาก</button></div></div>';
    root.querySelectorAll('[data-lv]').forEach(btn => btn.onclick = () => { hard = btn.dataset.lv === '1'; SP.sfx.click(); startRound(); });
  }

  function renderBoard(winLine) {
    root.innerHTML =
      '<div class="ox"><div class="ox-top"><span>รอบ <b>' + round + '/' + ROUNDS + '</b></span><span>ชนะ <b>' + wins + '</b></span><span>เสมอ <b>' + draws + '</b></span><span>แพ้ <b>' + losses + '</b></span></div>' +
      '<div class="ox-status" data-st></div><div class="ox-board"></div>' +
      '<div style="color:#b9a6e6;font-size:.85em">คุณคือ <b style="color:#ffd21f">X</b> · บอท (' + (hard ? 'ยาก' : 'ง่าย') + ') คือ <b style="color:#c4a1ff">O</b></div></div>';
    const bd = root.querySelector('.ox-board');
    b.forEach((v, i) => {
      const c = document.createElement('button');
      c.className = 'ox-cell' + (v ? ' ' + v.toLowerCase() : '') + (winLine && winLine.indexOf(i) >= 0 ? ' win' : '');
      c.textContent = v; c.disabled = !!v || turnLock || ended;
      c.onclick = () => play(i);
      bd.appendChild(c);
    });
  }
  function status(t) { const s = root.querySelector('[data-st]'); if (s) s.textContent = t; }

  function startRound() {
    b = Array(9).fill(''); turnLock = false;
    renderBoard(); status('ตาคุณ — วาง X');
    // สลับคนเริ่ม: รอบคู่บอทเริ่มก่อน
    if (round % 2 === 0) {
      turnLock = true; status('บอทกำลังคิด...');
      ctx.after(() => { const m = botMove(); b[m] = 'O'; SP.sfx.pop(); turnLock = false; renderBoard(); status('ตาคุณ — วาง X'); }, 600);
    }
  }

  function finish(res, line) {
    turnLock = true;
    if (res === 'X') { wins++; score += Math.round(20 * (hard ? 1.5 : 1)); SP.sfx.win(); }
    else if (res === 'O') { losses++; SP.sfx.hit(); }
    else { draws++; score += Math.round(8 * (hard ? 1.5 : 1)); SP.sfx.click(); }
    ctx.setScore(score);
    renderBoard(line);
    status(res === 'X' ? '🎉 คุณชนะรอบนี้!' : res === 'O' ? '😵 บอทชนะรอบนี้' : '🤝 เสมอกัน');
    if (round >= ROUNDS) {
      ended = true;
      ctx.after(() => ctx.gameOver(score, wins > losses ? 'ชนะบอทได้!' : wins === losses ? 'เสมอกับบอท' : 'บอทชนะ ลองใหม่นะ'), 1200);
    } else {
      ctx.after(() => { round++; startRound(); }, 1300);
    }
  }

  function play(i) {
    if (turnLock || ended || b[i]) return;
    b[i] = 'X'; SP.sfx.click();
    let w = winnerOf(b);
    if (w) return finish('X', w.line);
    if (b.every(Boolean)) return finish('draw');
    turnLock = true; renderBoard(); status('บอทกำลังคิด...');
    ctx.after(() => {
      const m = botMove(); b[m] = 'O'; SP.sfx.pop();
      w = winnerOf(b);
      if (w) return finish('O', w.line);
      if (b.every(Boolean)) return finish('draw');
      turnLock = false; renderBoard(); status('ตาคุณ — วาง X');
    }, 500);
  }

  ctx.setScore(0);
  renderPick();
});
