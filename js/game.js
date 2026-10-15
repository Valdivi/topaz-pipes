/* ============================================================
   JUEGO · pantallas, tablero táctil, temporizador y resultados
   ============================================================ */
(function () {
  'use strict';

  var C = window.CONFIG, E = window.Engine;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var stage = $('#stage');
  var params = new URLSearchParams(location.search);
  var CELL = C.layout.grid.w / C.grid.cols;           // 85 px
  var STEP = C.lightStepMs;

  if (params.has('kiosk')) document.body.classList.add('kiosk');

  /* ---------- utilidades ---------- */
  function box(el, b) {
    el.style.left = b.x + 'px'; el.style.top = b.y + 'px';
    el.style.width = b.w + 'px'; el.style.height = b.h + 'px';
  }
  function themeUrl(t, f) { return 'assets/themes/' + t.id + '/' + f + '.png'; }
  function pipeUrl(type, on, locked) { return 'assets/pipes/' + type + (locked ? '-lock' : '') + '-' + (on ? 'on' : 'off') + '.svg'; }
  function fmt(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function setLit(el, lit, delayMs) {
    el.style.setProperty('--d', (lit ? delayMs : 0) + 'ms');
    el.classList.toggle('lit', !!lit);
  }

  /* ---------- escala a la pantalla ---------- */
  function fit() {
    var s = Math.min(window.innerWidth / 500, window.innerHeight / 1000);
    stage.style.transform = 'scale(' + s + ')';
  }
  window.addEventListener('resize', fit);
  fit();

  // Sin zoom, sin menú contextual, sin arrastres
  ['contextmenu', 'gesturestart', 'gesturechange', 'dragstart', 'selectstart'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { e.preventDefault(); });
  });
  document.addEventListener('touchmove', function (e) { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

  /* ---------- colocar elementos según el layout ---------- */
  var L = C.layout;
  box($('#logo'), L.logo);
  box($('#start-title'), L.title);
  box($('#game-title'), L.title);
  box($('#win-title'), L.title);
  box($('#lose-title'), L.title);
  box($('#hud-time'), L.hudTime);
  box($('#hud-points'), L.hudPoints);
  box($('#taps'), L.taps);
  box($('#grid'), L.grid);
  box($('#grid-frame'), { x: L.grid.x - 8, y: L.grid.y - 8, w: L.grid.w + 16, h: L.grid.h + 16 });

  $('#btn-start span').textContent = C.texts.startButton;
  $('#lbl-time').textContent = C.texts.timeLabel;
  $('#lbl-points').textContent = C.texts.pointsLabel;
  $('#lbl-taps').textContent = C.texts.tapsLabel;
  $('#win-points-label').textContent = C.texts.winPoints;
  $('#win-time-label').textContent = C.texts.winTime;
  $('#btn-again span').textContent = C.texts.again;
  $('#btn-retry span').textContent = C.texts.retry;

  /* ---------- precarga ---------- */
  function preload() {
    var urls = ['assets/common/bg.jpg', 'assets/common/logo.png'];
    ['cross', 'straight', 'elbow', 'tee'].forEach(function (t) {
      urls.push(pipeUrl(t, 0), pipeUrl(t, 1), pipeUrl(t, 0, true), pipeUrl(t, 1, true));
    });
    C.themes.forEach(function (t) { ['title', 'origin', 'dest', 'win', 'lose'].forEach(function (f) { urls.push(themeUrl(t, f)); }); });
    var imgs = urls.map(function (u) {
      return new Promise(function (res) { var i = new Image(); i.onload = i.onerror = res; i.src = u; });
    });
    var fonts = document.fonts && document.fonts.load
      ? Promise.all([document.fonts.load('600 14px Montserrat'), document.fonts.load('800 20px Montserrat')]).catch(function () {})
      : Promise.resolve();
    var timeout = new Promise(function (res) { setTimeout(res, 8000); });
    return Promise.race([Promise.all(imgs.concat([fonts])), timeout]);
  }

  /* ---------- selección de modo ---------- */
  function enabledThemes() { return C.themes.filter(function (t) { return t.enabled !== false; }); }
  function pickTheme() {
    var list = enabledThemes();
    var forced = params.get('mode');
    if (forced) {
      var f = list.filter(function (t) { return t.id === forced; })[0];
      if (f) return f;
    }
    var last = null;
    try { last = localStorage.getItem('lastTheme'); } catch (e) {}
    var pool = list.filter(function (t) { return t.id !== last; });
    if (!pool.length) pool = list;
    var t = pool[Math.floor(Math.random() * pool.length)];
    try { localStorage.setItem('lastTheme', t.id); } catch (e) {}
    return t;
  }

  /* ---------- celdas ---------- */
  var BADGE = '<svg class="badge" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#d6203f"/>' +
    '<rect x="5.5" y="9" width="9" height="6.5" rx="1.5" fill="#fff"/>' +
    '<path d="M7.5 9V7.2a2.5 2.5 0 0 1 5 0V9" fill="none" stroke="#fff" stroke-width="1.6"/></svg>';

  function makeCell(kind, type, turns, locked) {
    var el = document.createElement('div');
    el.className = 'cell' + (locked ? ' locked' : '');
    var tile = document.createElement('div');
    tile.className = 'tile';
    el.appendChild(tile);
    if (kind === 'pipe') {
      var r = document.createElement('div');
      r.className = 'rot';
      r.style.transform = 'rotate(' + (turns * 90) + 'deg)';
      r.innerHTML = '<img class="off" src="' + pipeUrl(type, 0, locked) + '" alt=""><img class="on" src="' + pipeUrl(type, 1, locked) + '" alt="">';
      el.appendChild(r);
      el._rot = r;
      if (locked) el.insertAdjacentHTML('beforeend', BADGE);
    }
    el.style.width = el.style.height = CELL + 'px';
    return el;
  }
  function fixedTile(el, src) {
    var tile = el.firstChild;
    tile.classList.add('fixed');
    tile.innerHTML = '<img src="' + src + '" alt=""><span class="fx"></span>';
  }

  /* ---------- pantallas ---------- */
  var screens = { start: $('#screen-start'), game: $('#screen-game'), win: $('#screen-win'), lose: $('#screen-lose') };
  function show(names) {
    Object.keys(screens).forEach(function (k) { screens[k].classList.toggle('active', names.indexOf(k) !== -1); });
  }

  var theme = null, nextTheme = null;
  var board = null, cellEls = [];
  var locked = true, endAt = 0, timerId = 0, idleId = 0, solvedRemaining = 0, tapsLeft = 0;

  function clearTimers() { clearInterval(timerId); clearTimeout(idleId); }

  /* ----- INICIO ----- */
  function showStart() {
    clearTimers();
    locked = true;
    stopConfetti();
    nextTheme = pickTheme();
    $('#start-title').src = themeUrl(nextTheme, 'title');
    show(['start']);
  }

  /* ----- JUEGO ----- */
  function startGame(t) {
    clearTimers();
    stopConfetti();
    theme = t || nextTheme || pickTheme();
    $('#game-title').src = themeUrl(theme, 'title');
    $('#val-points').textContent = '0';
    $('#hud-time').classList.remove('low');
    screens.game.classList.remove('won');
    buildBoard();
    show(['game']);
    locked = false;
    startTimer();
  }

  function buildBoard() {
    var grid = $('#grid');
    grid.innerHTML = '';
    var D = theme.difficulty || {};
    function pick(k) { return D[k] !== undefined ? D[k] : C[k]; }
    board = E.generate({
      rows: C.grid.rows, cols: C.grid.cols, routes: C.routes, maxWays: pick('maxWays'),
      weights: C.pieceWeights, upgrade: C.pathUpgradeChance,
      locked: pick('locked'), lockedOnRoute: pick('lockedOnRoute'),
      minTaps: pick('minTaps'), maxTaps: pick('maxTaps'), tapMargin: pick('tapMargin')
    });
    tapsLeft = board.tapLimit;
    showTaps(false);
    cellEls = [];
    for (var r = 0; r < board.rows; r++) {
      cellEls.push([]);
      for (var c = 0; c < board.cols; c++) {
        var cell = board.cells[r][c], el;
        if (cell.type === 'origin') { el = makeCell('origin'); fixedTile(el, themeUrl(theme, 'origin')); }
        else if (cell.type === 'dest') { el = makeCell('dest'); fixedTile(el, themeUrl(theme, 'dest')); }
        else { el = makeCell('pipe', cell.type, cell.turns, !!cell.locked); }
        el.style.left = (c * CELL) + 'px';
        el.style.top = (r * CELL) + 'px';
        el.dataset.r = r; el.dataset.c = c;
        grid.appendChild(el);
        cellEls[r].push(el);
      }
    }
    updateLights();
  }

  function showTaps(bump) {
    var t = $('#taps');
    $('#val-taps').textContent = String(tapsLeft);
    t.classList.toggle('low', tapsLeft <= C.lowTaps);
    if (bump) { t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump'); }
  }

  function updateLights() {
    var f = E.flood(board);
    for (var r = 0; r < board.rows; r++) {
      for (var c = 0; c < board.cols; c++) {
        var d = f.dist[E.key(r, c)];
        var lit = d !== undefined;
        // El origen solo brilla cuando ya hay alguna tubería conectada a él
        if (r === 0 && c === 0) lit = f.count > 1;
        setLit(cellEls[r][c], lit, (d || 0) * STEP);
      }
    }
    return f;
  }

  $('#grid').addEventListener('pointerdown', function (e) {
    if (locked) return;
    var el = e.target.closest ? e.target.closest('.cell') : null;
    if (!el) return;
    var r = +el.dataset.r, c = +el.dataset.c;
    var cell = board.cells[r][c];
    if (cell.locked) { // pieza fija: no gira y no gasta toques
      el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
      return;
    }
    if (cell.fixed) return;
    cell.turns += 1;
    cell.rot = cell.turns % 4;
    el._rot.style.transform = 'rotate(' + (cell.turns * 90) + 'deg)';
    tapsLeft = Math.max(0, tapsLeft - 1);
    showTaps(true);
    var f = updateLights();
    if (f.solved) onSolved(f);
    else if (tapsLeft <= 0) onOutOfTaps();
  });

  /* ----- temporizador ----- */
  function startTimer() {
    endAt = Date.now() + C.timeLimit * 1000;
    tick();
    timerId = setInterval(tick, 200);
  }
  function tick() {
    var rem = Math.max(0, endAt - Date.now());
    var s = Math.ceil(rem / 1000);
    $('#val-time').textContent = fmt(s);
    $('#hud-time').classList.toggle('low', s <= C.warnSeconds);
    if (rem <= 0) { clearInterval(timerId); onTimeout(); }
  }

  /* ----- resultado ----- */
  function onSolved(f) {
    locked = true;
    clearInterval(timerId);
    solvedRemaining = Math.max(0, Math.floor((endAt - Date.now()) / 1000));
    screens.game.classList.add('won');
    var wait = (f.destDist || 0) * STEP + 1300;
    setTimeout(showWin, wait);
  }

  function showWin() {
    var score = C.scoring.base + solvedRemaining * C.scoring.perSecond;
    // La frase de victoria depende del modo que le tocó a la persona
    $('#win-title').src = themeUrl(theme, 'title');
    $('#win-card').src = themeUrl(theme, 'win');
    $('#win-time').textContent = fmt(solvedRemaining);
    $('#win-points').textContent = '0';
    $('#val-points').textContent = String(score);
    show(['win']);
    countUp($('#win-points'), score, 1000);
    confetti();
    idleId = setTimeout(showStart, C.resultIdleMs.win);
  }

  function showLose() {
    setTimeout(function () {
      $('#lose-title').src = themeUrl(theme, 'title');
      $('#lose-card').src = themeUrl(theme, 'lose');
      show(['lose']);
      idleId = setTimeout(showStart, C.resultIdleMs.lose);
    }, 450);
  }
  function onTimeout() { locked = true; showLose(); }
  function onOutOfTaps() { locked = true; clearInterval(timerId); showLose(); }

  function countUp(el, target, ms) {
    var t0 = performance.now();
    (function step(now) {
      var p = Math.min(1, (now - t0) / ms);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1 && screens.win.classList.contains('active')) requestAnimationFrame(step);
      else el.textContent = String(target);
    })(t0);
  }

  function confetti() {
    var host = $('#confetti');
    host.innerHTML = '';
    var colors = ['#22b8e6', '#37c9a0', '#ec4e8c', '#ffffff', '#7a5cff', '#ffd23f'];
    for (var i = 0; i < 46; i++) {
      var p = document.createElement('i');
      p.style.left = (Math.random() * 100) + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = (2.2 + Math.random() * 2.2) + 's';
      p.style.animationDelay = (Math.random() * 0.9) + 's';
      p.style.setProperty('--dx', ((Math.random() - 0.5) * 160) + 'px');
      p.style.setProperty('--rot', (360 + Math.random() * 720) + 'deg');
      host.appendChild(p);
    }
  }
  function stopConfetti() { $('#confetti').innerHTML = ''; }

  /* ---------- botones ---------- */
  function tap(el, fn) { el.addEventListener('pointerdown', function (e) { e.preventDefault(); fn(); }); }
  tap($('#screen-start'), function () { if (screens.start.classList.contains('active')) startGame(nextTheme); });
  tap($('#btn-again'), function () { startGame(pickTheme()); });
  tap($('#btn-retry'), function () { startGame(pickTheme()); });

  /* ---------- ayudas para probar (?debug) ---------- */
  if (params.has('debug')) {
    window.__solve = function () {
      if (!board || locked) return;
      board.paths[0].forEach(function (p) {
        var cell = board.cells[p[0]][p[1]], want = board.sol[E.key(p[0], p[1])];
        while (cell.rot !== want) { cell.turns += 1; cell.rot = cell.turns % 4; }
        cellEls[p[0]][p[1]]._rot.style.transform = 'rotate(' + (cell.turns * 90) + 'deg)';
      });
      var f = updateLights();
      if (f.solved) onSolved(f);
    };
    document.addEventListener('keydown', function (e) {
      if (e.code === 'KeyS') window.__solve();
      if (e.code === 'KeyN' && screens.start.classList.contains('active')) showStart();
    });
  }

  /* ---------- arranque ---------- */
  preload().then(function () {
    $('#loading').classList.add('done');
    showStart();
  });
})();
