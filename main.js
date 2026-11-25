/* =========================================================
   หน้าเว็บหลัก: หน้าแรก หมวดหมู่ ค้นหา และหน้าเล่นเกม (ใช้ #/ เป็นเส้นทาง)
   ========================================================= */
(function () {
  'use strict';
  var SP = window.SP;
  var app = document.getElementById('app');
  var catbar = document.getElementById('catbar');
  var qInput = document.getElementById('q');
  var player = null;

  var PLAY_SVG = '<svg viewBox="0 0 24 24"><path d="M6 3l15 9-15 9z"/></svg>';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function thumb(g) {
    return '<div class="thumb" style="--c1:' + g.grad[0] + ';--c2:' + g.grad[1] + '">' +
      (g.badge ? '<span class="badge">' + esc(g.badge) + '</span>' : (g.cat === 'thai' ? '<span class="badge thai">🇹🇭 ไทย</span>' : '')) +
      '<span class="em">' + g.icon + '</span>' +
      '<span class="play-hint">' + PLAY_SVG + '</span></div>';
  }

  function card(g) {
    var best = SP.getBest(g.id);
    var cat = SP.getCat(g.cat);
    return '<a class="card" href="#/g/' + g.id + '">' + thumb(g) +
      '<div class="card-body"><div class="card-title">' + esc(g.title) + '</div>' +
      '<div class="card-meta"><span>' + (best ? '<span class="best">🏆 ' + SP.fmt(best) + '</span>' : esc(cat ? cat.name : '')) + '</span>' +
      '<span>' + SP.inputLabel(g) + '</span></div></div></a>';
  }

  function byCat(id) { return SP.gameList.filter(function (g) { return g.cat === id; }); }

  function section(title, sub, games, opts) {
    opts = opts || {};
    return '<section class="sec' + (opts.special ? ' special' : '') + '">' +
      '<div class="sec-head"><h2>' + title + (sub ? ' <span class="sub">' + sub + '</span>' : '') + '</h2>' +
      (opts.more ? '<a class="more" href="' + opts.more + '">ดูทั้งหมด →</a>' : '') + '</div>' +
      '<div class="grid">' + games.map(card).join('') + '</div></section>';
  }

  /* ---------- แถบหมวดหมู่ ---------- */
  function renderCatbar(active) {
    catbar.innerHTML = SP.categories.map(function (c) {
      var n = c.id === 'all' ? SP.gameList.length : byCat(c.id).length;
      return '<a class="chip' + (c.special ? ' special' : '') + (c.id === active ? ' on' : '') + '" href="' +
        (c.id === 'all' ? '#/' : '#/c/' + c.id) + '">' + c.icon + ' ' + esc(c.name) + ' <span class="n">' + n + '</span></a>';
    }).join('');
    var on = catbar.querySelector('.on');
    if (on && on.scrollIntoView) { try { on.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {} }
  }

  /* ---------- หน้าแรก ---------- */
  function homeView() {
    var thai = byCat('thai');
    var html = '';
    html += '<section class="hero"><div>' +
      '<span class="kicker">🪷 หมวดพิเศษ</span>' +
      '<h1>เล่นเกม<em>ประเพณีไทย</em><br>สนุกได้ ได้รู้จักวัฒนธรรม</h1>' +
      '<p>ลอยกระทง สงกรานต์ ตะกร้อ ว่าวจุฬา ระนาดเอก และของดีเมืองไทย ถูกแปลงเป็นเกมสนุก ๆ ให้เล่นฟรีทั้งบนมือถือและคอมพิวเตอร์</p>' +
      '<a class="btn" href="#/c/thai">▶ เข้าไปเล่นเลย</a></div>' +
      '<div class="hero-games">' + thai.slice(0, 3).map(card).join('') + '</div></section>';

    var recent = SP.getRecent().map(SP.getGame).filter(Boolean);
    if (recent.length) html += section('🕘 เล่นล่าสุด', '', recent.slice(0, 6));

    html += section('🪷 เกมประเพณีไทย', 'เกมพิเศษที่คิดขึ้นจากประเพณีไทย', thai, { special: true, more: '#/c/thai' });
    SP.categories.forEach(function (c) {
      if (c.id === 'all' || c.id === 'thai') return;
      var list = byCat(c.id);
      if (list.length) html += section(c.icon + ' ' + esc(c.name), '', list, { more: '#/c/' + c.id });
    });
    app.innerHTML = html;
  }

  function catView(id) {
    var c = SP.getCat(id);
    if (!c) { homeView(); return; }
    var list = byCat(id);
    app.innerHTML =
      '<div class="cat-banner"><div class="big">' + c.icon + '</div><div><h1>' + esc(c.name) +
      '</h1><p>' + esc(c.desc || '') + '</p></div></div>' +
      '<section class="sec"><div class="grid">' + list.map(card).join('') + '</div></section>';
  }

  function searchView(q) {
    var key = q.trim().toLowerCase();
    var list = SP.gameList.filter(function (g) {
      var cat = SP.getCat(g.cat);
      return (g.title + ' ' + g.desc + ' ' + (cat ? cat.name : '')).toLowerCase().indexOf(key) !== -1;
    });
    app.innerHTML = '<section class="sec"><div class="sec-head"><h2>ผลการค้นหา “' + esc(q) + '” <span class="sub">' + list.length + ' เกม</span></h2></div>' +
      (list.length ? '<div class="grid">' + list.map(card).join('') + '</div>' :
        '<div class="empty">😢 ไม่พบเกมที่ค้นหา ลองคำอื่นดูนะ<br><br><a class="btn" href="#/">ดูเกมทั้งหมด</a></div>') + '</section>';
  }

  /* ---------- หน้าเล่นเกม ---------- */
  function gameView(id) {
    var g = SP.getGame(id);
    if (!g) { location.hash = '#/'; return; }
    var cat = SP.getCat(g.cat);
    document.title = g.title + ' — สนุกเพลย์';

    var others = SP.gameList.filter(function (x) { return x.id !== g.id; });
    others.sort(function (a, b) { return (b.cat === g.cat) - (a.cat === g.cat); });
    var side = others.slice(0, 7).map(function (x) {
      var c = SP.getCat(x.cat);
      return '<a class="mini" href="#/g/' + x.id + '">' + thumb(x).replace(/<span class="badge[^>]*>.*?<\/span>/, '') +
        '<div><b>' + esc(x.title) + '</b><small>' + esc(c ? c.name : '') + '</small></div></a>';
    }).join('');

    app.innerHTML =
      '<div class="crumbs"><a href="#/">หน้าแรก</a> › <a href="#/c/' + g.cat + '">' + esc(cat ? cat.name : '') + '</a> › ' + esc(g.title) + '</div>' +
      '<div class="play-layout"><div class="play-main">' +
      '<div id="stageMount"></div>' +
      '<div class="info"><h1>' + g.icon + ' ' + esc(g.title) + '</h1>' +
      '<div class="tags"><span class="tag y">' + esc(cat ? cat.icon + ' ' + cat.name : '') + '</span>' +
      '<span class="tag">เล่นด้วย ' + SP.inputLabel(g) + '</span><span class="tag">ฟรี</span></div>' +
      '<p>' + esc(g.desc) + '</p>' +
      '<h3>วิธีเล่น</h3><ul>' + g.how.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul>' +
      (g.fact ? '<div class="fact"><b>💡 รู้หรือไม่?</b> ' + esc(g.fact) + '</div>' : '') +
      '</div></div>' +
      '<aside class="side"><h3>เกมอื่น ๆ ที่น่าสนใจ</h3>' + side + '</aside></div>';

    player = SP.mountPlayer(document.getElementById('stageMount'), g, {
      onHome: function () { location.hash = '#/'; }
    });
  }

  /* ---------- เส้นทาง ---------- */
  function route() {
    if (player) { player.destroy(); player = null; }
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('/');
    document.title = 'สนุกเพลย์ — เล่นเกมออนไลน์ฟรี พร้อมเกมประเพณีไทย';

    if (parts[0] === 'g' && parts[1]) {
      renderCatbar((SP.getGame(parts[1]) || {}).cat);
      gameView(parts[1]);
    } else if (parts[0] === 'search') {
      renderCatbar('');
      searchView(decodeURIComponent(parts.slice(1).join('/')));
    } else if (parts[0] === 'c' && parts[1]) {
      qInput.value = '';
      renderCatbar(parts[1]);
      catView(parts[1]);
      document.title = ((SP.getCat(parts[1]) || {}).name || 'หมวดหมู่') + ' — สนุกเพลย์';
    } else {
      qInput.value = '';
      renderCatbar('all');
      homeView();
    }
    window.scrollTo(0, 0);
  }

  var t = 0;
  qInput.addEventListener('input', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      var q = qInput.value.trim();
      if (q) location.hash = '#/search/' + encodeURIComponent(q);
      else location.hash = '#/';
    }, 250);
  });

  window.addEventListener('hashchange', route);
  route();
})();
