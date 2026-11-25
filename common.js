/* =========================================================
   ฟังก์ชันกลางของสนุกเพลย์: เก็บคะแนน เสียง และเครื่องมือช่วยเขียนเกม
   ========================================================= */
(function () {
  'use strict';
  var SP = window.SP = window.SP || {};
  SP.games = SP.games || {};
  SP.register = function (id, factory) { SP.games[id] = factory; };

  /* ---------- เก็บข้อมูลในเครื่อง ---------- */
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  SP.store = store;
  SP.getBest = function (id) { return store.get('sp_best_' + id, 0); };
  SP.setBest = function (id, s) {
    if (s > SP.getBest(id)) { store.set('sp_best_' + id, s); return true; }
    return false;
  };
  SP.pushRecent = function (id) {
    var r = store.get('sp_recent', []).filter(function (x) { return x !== id; });
    r.unshift(id);
    store.set('sp_recent', r.slice(0, 8));
  };
  SP.getRecent = function () { return store.get('sp_recent', []); };

  /* ---------- คณิตศาสตร์เล็ก ๆ ---------- */
  SP.rand = function (a, b) { return a + Math.random() * (b - a); };
  SP.irand = function (a, b) { return Math.floor(SP.rand(a, b + 1)); };
  SP.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  SP.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  SP.shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };
  SP.fmt = function (n) { return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };

  /* ---------- ตัวช่วยวาด ---------- */
  SP.rr = function (g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };
  SP.starPath = function (g, cx, cy, R, r, n, rot) {
    g.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var rad = i % 2 ? r : R, a = (rot || 0) + i * Math.PI / n - Math.PI / 2;
      var x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.closePath();
  };
  SP.heartPath = function (g, x, y, s) {
    g.beginPath();
    g.moveTo(x, y + s * 0.35);
    g.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
    g.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
    g.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
    g.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.35);
    g.closePath();
  };
  SP.glow = function (g, x, y, r, color, alpha) {
    var gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, color);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.save();
    g.globalAlpha = alpha == null ? 1 : alpha;
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.restore();
  };

  /* ---------- เสียง (สร้างด้วย WebAudio ไม่ต้องมีไฟล์) ---------- */
  var ac = null, muted = store.get('sp_muted', false);
  SP.isMuted = function () { return muted; };
  SP.setMuted = function (v) { muted = !!v; store.set('sp_muted', muted); };
  function audio() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; }
    }
    if (ac && ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
    return ac;
  }
  SP.unlockAudio = audio;
  SP.tone = function (freq, dur, type, vol, slideTo) {
    if (muted) return;
    var a = audio(); if (!a) return;
    dur = dur || 0.12; vol = vol == null ? 0.12 : vol;
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.03);
  };
  SP.noise = function (dur, vol) {
    if (muted) return;
    var a = audio(); if (!a) return;
    dur = dur || 0.15; vol = vol == null ? 0.1 : vol;
    var n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = a.createBufferSource(), g = a.createGain();
    s.buffer = buf; g.gain.value = vol;
    s.connect(g); g.connect(a.destination); s.start();
  };
  SP.sfx = {
    click: function () { SP.tone(520, 0.05, 'square', 0.05); },
    pop:   function () { SP.tone(700, 0.08, 'square', 0.06, 1000); },
    coin:  function () { SP.tone(880, 0.07, 'square', 0.06); setTimeout(function () { SP.tone(1320, 0.1, 'square', 0.06); }, 70); },
    hit:   function () { SP.tone(200, 0.2, 'sawtooth', 0.1, 60); },
    shoot: function () { SP.tone(900, 0.06, 'square', 0.03, 400); },
    boom:  function () { SP.noise(0.25, 0.12); SP.tone(120, 0.25, 'sawtooth', 0.08, 40); },
    jump:  function () { SP.tone(300, 0.14, 'square', 0.06, 700); },
    splash: function () { SP.noise(0.14, 0.09); },
    flip:  function () { SP.tone(600, 0.05, 'triangle', 0.08); },
    win:   function () { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { SP.tone(f, 0.16, 'triangle', 0.1); }, i * 110); }); },
    lose:  function () { [420, 330, 250, 170].forEach(function (f, i) { setTimeout(function () { SP.tone(f, 0.18, 'sawtooth', 0.07); }, i * 130); }); },
    /* เสียงระนาด: ไม้กระทบไม้ */
    ranad: function (f) {
      SP.tone(f, 0.5, 'triangle', 0.2);
      SP.tone(f * 2, 0.22, 'sine', 0.07);
      SP.tone(f * 3.01, 0.08, 'sine', 0.03);
      SP.noise(0.02, 0.05);
    }
  };
})();
