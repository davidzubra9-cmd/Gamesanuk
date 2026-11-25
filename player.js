/* =========================================================
   ตัวเล่นเกม: สร้างเวที หน้าเริ่มเกม หน้าจบเกม ปุ่มควบคุม
   เกมแต่ละเกมลงทะเบียนด้วย SP.register(id, function (ctx) { ... })
   ctx = { root, canvas, g, w, h, setScore, gameOver, on, loop, after, every, pos, best }
   ========================================================= */
(function () {
  'use strict';
  var SP = window.SP;
  var BLOCK_KEYS = { ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, ' ': 1, Spacebar: 1 };

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function loadScript(src, ok, fail) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = ok;
    s.onerror = fail;
    document.head.appendChild(s);
  }

  SP.mountPlayer = function (mount, meta, hooks) {
    hooks = hooks || {};
    mount.innerHTML = '';

    var wrap = el('section', 'stage-wrap');
    var box = el('div', 'stage-box');
    var root = el('div', 'stage-root' + (meta.type === 'dom' ? ' dom' : ''));
    var ov = el('div', 'overlay');
    box.appendChild(root);
    box.appendChild(ov);

    var bar = el('div', 'stagebar');
    bar.innerHTML =
      '<div class="hud"><span>คะแนน <b data-sc>0</b></span><span>สูงสุด <b data-bs>0</b></span></div>' +
      '<div class="btns">' +
      '<button class="ibtn" data-act="restart" title="เริ่มใหม่" aria-label="เริ่มใหม่">↻</button>' +
      '<button class="ibtn" data-act="mute" title="เปิด/ปิดเสียง" aria-label="เปิดปิดเสียง"></button>' +
      '<button class="ibtn" data-act="full" title="เต็มจอ" aria-label="เต็มจอ">⛶</button>' +
      '</div>';
    wrap.appendChild(box);
    wrap.appendChild(bar);
    mount.appendChild(wrap);

    var scEl = bar.querySelector('[data-sc]');
    var bsEl = bar.querySelector('[data-bs]');
    var muteBtn = bar.querySelector('[data-act="mute"]');

    var session = null;       // เกมที่กำลังเล่น
    var destroyed = false;

    function refreshMute() { muteBtn.textContent = SP.isMuted() ? '🔇' : '🔊'; }
    refreshMute();
    bsEl.textContent = SP.fmt(SP.getBest(meta.id));

    /* ---------- ปรับขนาดเวทีให้พอดีหน้าจอ ---------- */
    function isFull() {
      return document.fullscreenElement === wrap || document.webkitFullscreenElement === wrap;
    }
    function fit() {
      if (destroyed) return;
      var ratio = meta.w / meta.h;
      var full = isFull();
      var wrapW = full ? window.innerWidth : wrap.clientWidth - 24;
      var barH = bar.offsetHeight + 12;
      var maxH = full ? window.innerHeight - barH - 16 : Math.max(320, window.innerHeight - 200 - barH);
      var w = Math.min(wrapW, maxH * ratio);
      if (meta.type === 'dom') w = Math.min(w, 560);
      var h = w / ratio;
      box.style.width = Math.floor(w) + 'px';
      box.style.height = Math.floor(h) + 'px';
      var fs = meta.type === 'dom' ? w / 30 : SP.clamp(w / 30, 11, 20);
      box.style.fontSize = fs.toFixed(2) + 'px';
    }
    fit();
    var onResize = function () { fit(); };
    window.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', onResize);
    document.addEventListener('webkitfullscreenchange', onResize);

    var onKeyBlock = function (e) {
      if (!session || !session.running) return;
      var t = e.target && e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA') return;
      if (BLOCK_KEYS[e.key]) e.preventDefault();
    };
    window.addEventListener('keydown', onKeyBlock);

    /* ---------- หน้าจอซ้อน (overlay) ---------- */
    function showIntro() {
      ov.className = 'overlay';
      var how = (meta.how || []).map(function (h) { return '<li>' + h + '</li>'; }).join('');
      ov.innerHTML =
        '<div class="ov-icon">' + meta.icon + '</div>' +
        '<h2>' + meta.title + '</h2>' +
        '<ul class="ov-how">' + how + '</ul>' +
        '<button class="btn big" data-go>▶ เริ่มเล่น</button>' +
        '<div class="ov-ctrl">' + SP.inputLabel(meta) + '</div>';
      ov.querySelector('[data-go]').onclick = function () { start(); };
    }

    function showError(msg) {
      ov.className = 'overlay';
      ov.innerHTML = '<div class="ov-icon">😵</div><h2>โหลดเกมไม่สำเร็จ</h2><p class="ov-sub">' + msg + '</p>' +
        '<div class="ov-btns"><button class="btn" data-home>กลับหน้าแรก</button></div>';
      ov.querySelector('[data-home]').onclick = function () { if (hooks.onHome) hooks.onHome(); };
    }

    function showOver(score, msg, isNew) {
      ov.className = 'overlay';
      ov.innerHTML =
        '<h2>' + (msg || 'จบเกม') + '</h2>' +
        '<div class="ov-sub">คะแนนของคุณ</div>' +
        '<div class="ov-score">' + SP.fmt(score) + '</div>' +
        (isNew ? '<div class="ov-new">🏆 สถิติใหม่!</div>' : '<div class="ov-sub">สูงสุด ' + SP.fmt(SP.getBest(meta.id)) + '</div>') +
        '<div class="ov-btns"><button class="btn" data-again>↻ เล่นอีกครั้ง</button>' +
        '<button class="btn ghost" data-home>หน้าแรก</button></div>';
      ov.querySelector('[data-again]').onclick = function () { start(); };
      ov.querySelector('[data-home]').onclick = function () { if (hooks.onHome) hooks.onHome(); };
    }

    /* ---------- เริ่ม / หยุดเกม ---------- */
    function stop() {
      if (!session) return;
      var s = session;
      session = null;
      s.running = false;
      s.cleanups.forEach(function (fn) { try { fn(); } catch (e) {} });
      if (s.api && typeof s.api.destroy === 'function') { try { s.api.destroy(); } catch (e) {} }
      root.innerHTML = '';
    }

    function start() {
      stop();
      SP.unlockAudio();
      SP.pushRecent(meta.id);
      ov.className = 'overlay hide';
      scEl.textContent = '0';
      bsEl.textContent = SP.fmt(SP.getBest(meta.id));

      var S = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      var s = { running: true, cleanups: [], over: false, api: null };
      session = s;

      var canvas = null, g = null;
      if (meta.type === 'canvas') {
        canvas = document.createElement('canvas');
        canvas.width = Math.round(meta.w * S);
        canvas.height = Math.round(meta.h * S);
        root.appendChild(canvas);
        g = canvas.getContext('2d');
      }

      var ctx = {
        root: root, canvas: canvas, g: g, w: meta.w, h: meta.h, S: S,
        best: SP.getBest(meta.id),
        setScore: function (n) { scEl.textContent = SP.fmt(n); },
        pos: function (e) {
          var r = (canvas || root).getBoundingClientRect();
          return { x: (e.clientX - r.left) / r.width * meta.w, y: (e.clientY - r.top) / r.height * meta.h };
        },
        on: function (target, type, fn, opts) {
          target.addEventListener(type, fn, opts);
          s.cleanups.push(function () { target.removeEventListener(type, fn, opts); });
        },
        after: function (fn, ms) {
          var id = setTimeout(function () { if (s.running) fn(); }, ms);
          s.cleanups.push(function () { clearTimeout(id); });
          return id;
        },
        every: function (fn, ms) {
          var id = setInterval(function () { if (s.running) fn(); }, ms);
          s.cleanups.push(function () { clearInterval(id); });
          return id;
        },
        loop: function (fn) {
          var last = performance.now(), id = 0;
          function frame(t) {
            if (!s.running) return;
            var dt = Math.min(0.05, Math.max(0.001, (t - last) / 1000));
            last = t;
            if (g) g.setTransform(S, 0, 0, S, 0, 0);
            fn(dt, t);
            id = requestAnimationFrame(frame);
          }
          id = requestAnimationFrame(frame);
          s.cleanups.push(function () { cancelAnimationFrame(id); });
        },
        gameOver: function (score, msg) {
          if (s.over || session !== s) return;
          s.over = true;
          score = Math.floor(score || 0);
          s.running = false;
          s.cleanups.forEach(function (fn) { try { fn(); } catch (e) {} });
          s.cleanups = [];
          var isNew = SP.setBest(meta.id, score);
          bsEl.textContent = SP.fmt(SP.getBest(meta.id));
          scEl.textContent = SP.fmt(score);
          if (isNew) SP.sfx.win(); else SP.sfx.lose();
          setTimeout(function () { if (session === s) showOver(score, msg, isNew); }, 650);
        }
      };

      try {
        s.api = SP.games[meta.id](ctx) || null;
      } catch (err) {
        console.error(err);
        stop();
        showError('เกิดข้อผิดพลาดตอนเริ่มเกม ลองรีเฟรชหน้าเว็บอีกครั้ง');
      }
    }

    /* ---------- ปุ่มควบคุม ---------- */
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'restart') { start(); }
      else if (act === 'mute') { SP.setMuted(!SP.isMuted()); refreshMute(); }
      else if (act === 'full') {
        if (isFull()) {
          (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        } else {
          var rq = wrap.requestFullscreen || wrap.webkitRequestFullscreen;
          if (rq) { try { rq.call(wrap); } catch (er) {} }
        }
      }
    });

    /* ---------- โหลดสคริปต์เกม แล้วโชว์หน้าแนะนำ ---------- */
    function ready() { if (!destroyed) showIntro(); }
    if (SP.games[meta.id]) {
      ready();
    } else {
      ov.className = 'overlay';
      ov.innerHTML = '<div class="ov-icon">' + meta.icon + '</div><h2>กำลังโหลด...</h2>';
      loadScript('games/' + meta.id + '.js', function () {
        if (SP.games[meta.id]) ready(); else showError('ไม่พบไฟล์เกม');
      }, function () { showError('ไม่พบไฟล์เกม'); });
    }

    return {
      destroy: function () {
        destroyed = true;
        stop();
        window.removeEventListener('resize', onResize);
        document.removeEventListener('fullscreenchange', onResize);
        document.removeEventListener('webkitfullscreenchange', onResize);
        window.removeEventListener('keydown', onKeyBlock);
        if (isFull()) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {} }
      }
    };
  };
})();
