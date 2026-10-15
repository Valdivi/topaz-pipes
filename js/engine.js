/* ============================================================
   MOTOR DEL JUEGO (sin DOM, se puede probar en node)
   Máscara de conexiones: N=1, E=2, S=4, O=8
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var N = 1, E = 2, S = 4, W = 8;
  // Índices: 0 = N, 1 = E, 2 = S, 3 = O
  var DIRS = [
    { b: N, dr: -1, dc: 0, opp: S },
    { b: E, dr: 0, dc: 1, opp: W },
    { b: S, dr: 1, dc: 0, opp: N },
    { b: W, dr: 0, dc: -1, opp: E }
  ];

  // Orientación en que vienen dibujadas las piezas (sin rotar)
  var BASE = { straight: N | S, elbow: N | W, tee: N | S | W, cross: N | E | S | W };

  // Origen (arriba-izquierda) acepta tubería por la derecha o por abajo.
  // Destino (abajo-derecha) acepta por la izquierda o por arriba.
  var ORIGIN_MASK = E | S;
  var DEST_MASK = N | W;

  function key(r, c) { return r + ',' + c; }

  // Gira una máscara 90° en sentido horario, t veces
  function rotMask(m, t) {
    t = ((t % 4) + 4) % 4;
    for (var i = 0; i < t; i++) m = ((m << 1) & 15) | ((m >> 3) & 1);
    return m;
  }

  function maskOf(cell) {
    if (cell.type === 'origin') return ORIGIN_MASK;
    if (cell.type === 'dest') return DEST_MASK;
    return rotMask(BASE[cell.type], cell.rot);
  }

  function shuffle(a, rng) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Camino aleatorio sin cruzarse de start a end (ambos incluidos)
  function findPath(rows, cols, start, end, blocked, maxLen, rng) {
    var path = [start];
    var seen = {}; var k;
    for (k in blocked) seen[k] = true;
    seen[key(start[0], start[1])] = true;
    var nodes = 0;

    function dfs(cur) {
      if (++nodes > 4000) return false;
      if (cur[0] === end[0] && cur[1] === end[1]) return true;
      var left = Math.abs(end[0] - cur[0]) + Math.abs(end[1] - cur[1]);
      if (path.length + left > maxLen) return false;
      var opts = shuffle(DIRS, rng);
      for (var i = 0; i < opts.length; i++) {
        var nr = cur[0] + opts[i].dr, nc = cur[1] + opts[i].dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        var kk = key(nr, nc);
        if (seen[kk]) continue;
        seen[kk] = true; path.push([nr, nc]);
        if (dfs([nr, nc])) return true;
        path.pop(); delete seen[kk];
      }
      return false;
    }
    return dfs(start) ? path.slice() : null;
  }

  function dirBit(from, to) {
    for (var i = 0; i < 4; i++) {
      if (from[0] + DIRS[i].dr === to[0] && from[1] + DIRS[i].dc === to[1]) return DIRS[i].b;
    }
    return 0;
  }

  function pickWeighted(weights, rng) {
    var total = 0, k;
    for (k in weights) total += weights[k];
    var x = rng() * total;
    for (k in weights) { x -= weights[k]; if (x < 0) return k; }
    return 'straight';
  }

  function flood(board) {
    var rows = board.rows, cols = board.cols, cells = board.cells;
    var dist = {}, q = [[0, 0]], head = 0, maxDist = 0, count = 1;
    dist[key(0, 0)] = 0;
    while (head < q.length) {
      var cur = q[head++], r = cur[0], c = cur[1];
      var m = maskOf(cells[r][c]), d0 = dist[key(r, c)];
      for (var i = 0; i < 4; i++) {
        var D = DIRS[i];
        if (!(m & D.b)) continue;
        var nr = r + D.dr, nc = c + D.dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        var kk = key(nr, nc);
        if (dist[kk] !== undefined) continue;
        if (!(maskOf(cells[nr][nc]) & D.opp)) continue;
        dist[kk] = d0 + 1; count++;
        if (d0 + 1 > maxDist) maxDist = d0 + 1;
        q.push([nr, nc]);
      }
    }
    var dk = key(rows - 1, cols - 1);
    // count incluye al origen: count === 1 significa que no hay nada conectado
    return { dist: dist, count: count, solved: dist[dk] !== undefined, destDist: dist[dk], maxDist: maxDist };
  }

  /* Cuenta las formas distintas de ganar: caminos sin repetir casillas del origen al
     destino, respetando lo que cada tipo de pieza puede hacer al girar
     (recta = sigue derecho, codo = gira, T y cruz = cualquiera). */
  function countWays(board, cap) {
    cap = cap || 60;
    var rows = board.rows, cols = board.cols, cells = board.cells, count = 0;
    var visited = {}; visited[key(0, 0)] = true;

    function allowed(type, din, dout) {
      if (din === dout) return false;
      if (type === 'straight') return dout === (din + 2) % 4;
      if (type === 'elbow') return dout !== (din + 2) % 4;
      return true; // tee y cruz
    }
    function go(r, c, d) {
      if (count > cap) return;
      var nr = r + DIRS[d].dr, nc = c + DIRS[d].dc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) return;
      var k = key(nr, nc);
      if (visited[k]) return;
      var cell = cells[nr][nc], din = (d + 2) % 4; // lado por el que entramos
      if (cell.type === 'dest') { if (din === 0 || din === 3) count++; return; }
      if (cell.type === 'origin') return;
      visited[k] = true;
      for (var o = 0; o < 4; o++) if (allowed(cell.type, din, o)) go(nr, nc, o);
      delete visited[k];
    }
    go(0, 0, 1); go(0, 0, 2);
    return count;
  }

  function isOriginNeighbor(r, c) { return (r === 0 && c === 1) || (r === 1 && c === 0); }

  // Arma un tablero con rutas ya trazadas (sin mezclar todavía)
  function buildBoard(rows, cols, paths, weights, upgrade, rng) {
    var cells = [];
    for (var r = 0; r < rows; r++) {
      cells.push([]);
      for (var c = 0; c < cols; c++) {
        var t = pickWeighted(weights, rng);
        // junto al origen no hay cruces: siempre conectarían solas
        if (t === 'cross' && isOriginNeighbor(r, c)) t = 'tee';
        cells[r].push({ type: t, rot: 0, fixed: false });
      }
    }
    cells[0][0] = { type: 'origin', rot: 0, fixed: true };
    cells[rows - 1][cols - 1] = { type: 'dest', rot: 0, fixed: true };

    var req = {}, sol = {};
    paths.forEach(function (path) {
      for (var i = 0; i < path.length; i++) {
        var cur = path[i];
        var prev = i === 0 ? [0, 0] : path[i - 1];
        var next = i === path.length - 1 ? [rows - 1, cols - 1] : path[i + 1];
        var need = dirBit(cur, prev) | dirBit(cur, next);
        var type = (need === (N | S) || need === (E | W)) ? 'straight' : 'elbow';
        if (rng() < upgrade) {
          type = rng() < 0.75 ? 'tee' : 'cross';
          if (type === 'cross' && isOriginNeighbor(cur[0], cur[1])) type = 'tee';
        }
        var good = [];
        for (var t2 = 0; t2 < 4; t2++) if ((rotMask(BASE[type], t2) & need) === need) good.push(t2);
        cells[cur[0]][cur[1]].type = type;
        req[key(cur[0], cur[1])] = need;
        sol[key(cur[0], cur[1])] = good[Math.floor(rng() * good.length)];
      }
    });
    return { rows: rows, cols: cols, cells: cells, paths: paths, req: req, sol: sol };
  }

  function generate(opts) {
    opts = opts || {};
    var rows = opts.rows || 5, cols = opts.cols || 5;
    var rng = opts.rng || Math.random;
    var routes = opts.routes === 2 ? 2 : 1;
    var weights = opts.weights || { straight: 36, elbow: 44, tee: 14, cross: 6 };
    var upgrade = opts.upgrade == null ? 0.1 : opts.upgrade;
    // Máximo de formas de ganar por tablero (por defecto, las rutas pedidas)
    var maxWays = opts.maxWays || routes;
    // Piezas fijas (rojas): cuántas, y cuántas de ellas forman parte de la ruta
    var lockedCount = opts.locked || 0;
    var lockedOnRoute = opts.lockedOnRoute == null ? 1 : opts.lockedOnRoute;
    // Toques mínimos exigidos para resolver el tablero (rango) y margen del límite
    var minTaps = opts.minTaps || 0;
    var maxTaps = opts.maxTaps || 999;
    var tapMargin = opts.tapMargin == null ? 5 : opts.tapMargin;

    var originK = key(0, 0), destK = key(rows - 1, cols - 1);
    var base = {}; base[originK] = true; base[destK] = true;
    var oStarts = [[0, 1], [1, 0]];
    var dEnds = [[rows - 1, cols - 2], [rows - 2, cols - 1]];

    function pickPaths() {
      var s = shuffle(oStarts, rng), e = shuffle(dEnds, rng);
      if (routes === 1) {
        var p = findPath(rows, cols, s[0], e[0], base, 13, rng);
        return p ? [p] : null;
      }
      var a = findPath(rows, cols, s[0], e[0], base, 11, rng);
      if (!a) return null;
      var blocked = {}, k;
      for (k in base) blocked[k] = true;
      for (var i = 0; i < a.length; i++) blocked[key(a[i][0], a[i][1])] = true;
      var b = findPath(rows, cols, s[1], e[1], blocked, 11, rng);
      return b ? [a, b] : null;
    }

    // Busca un tablero cuyo número de formas de ganar no pase de maxWays.
    var best = null, bestWays = Infinity, done = false;
    for (var pa = 0; pa < 120 && !done; pa++) {
      var paths = pickPaths();
      if (!paths) continue;
      for (var fill = 0; fill < 30; fill++) {
        var board = buildBoard(rows, cols, paths, weights, upgrade, rng);
        // Con toques mínimos pedidos, descarta rutas con tantas rectas que no daría para llegar
        if (minTaps && pa < 80 && potentialTaps(board) < minTaps + 3) break;
        var ways = countWays(board, 40);
        if (ways < bestWays) { best = board; bestWays = ways; }
        if (ways <= maxWays) { done = true; break; }
      }
    }
    if (!best) { // salida de emergencia: borde superior y derecho
      var f = [];
      for (var cc = 1; cc < cols; cc++) f.push([0, cc]);
      for (var rr = 1; rr < rows - 1; rr++) f.push([rr, cols - 1]);
      best = buildBoard(rows, cols, [f], weights, 0, rng);
      bestWays = countWays(best, 40);
    }
    best.ways = bestWays;
    applyLocks(best, lockedCount, lockedOnRoute, rng);
    scramble(best, rng, minTaps, maxTaps);
    best.minTaps = minTapsOf(best);
    best.tapLimit = best.minTaps + tapMargin;
    return best;
  }

  // Fija piezas (no se pueden girar). Las de la ruta quedan ya bien orientadas;
  // las demás son señuelos con una orientación cualquiera, preferentemente junto a la ruta.
  function applyLocks(board, count, onRoute, rng) {
    board.locks = [];
    if (!count) return;
    var routeSet = {}, routeCells = [];
    board.paths.forEach(function (p) {
      p.forEach(function (q) {
        routeSet[key(q[0], q[1])] = true;
        if (!isOriginNeighbor(q[0], q[1])) routeCells.push(q);
      });
    });
    var near = [], far = [];
    for (var r = 0; r < board.rows; r++) {
      for (var c = 0; c < board.cols; c++) {
        if ((r === 0 && c === 0) || (r === board.rows - 1 && c === board.cols - 1)) continue;
        if (routeSet[key(r, c)] || isOriginNeighbor(r, c)) continue;
        var adj = DIRS.some(function (D) { return routeSet[key(r + D.dr, c + D.dc)]; });
        (adj ? near : far).push([r, c]);
      }
    }
    var nRoute = Math.min(onRoute, count, routeCells.length);
    shuffle(routeCells, rng).slice(0, nRoute).forEach(function (q) {
      var cell = board.cells[q[0]][q[1]];
      cell.rot = board.sol[key(q[0], q[1])]; cell.fixed = true; cell.locked = true;
      board.locks.push({ r: q[0], c: q[1], onRoute: true });
    });
    shuffle(near, rng).concat(shuffle(far, rng)).slice(0, count - nRoute).forEach(function (q) {
      var cell = board.cells[q[0]][q[1]];
      cell.rot = Math.floor(rng() * 4); cell.fixed = true; cell.locked = true;
      board.locks.push({ r: q[0], c: q[1], onRoute: false });
    });
  }

  // Máximo de toques que podría necesitar una casilla de ruta según cómo quede girada
  function maxTapsFor(type, need) {
    var goods = [];
    for (var t = 0; t < 4; t++) if ((rotMask(BASE[type], t) & need) === need) goods.push(t);
    var worst = 0;
    for (var s = 0; s < 4; s++) {
      var m = 4;
      for (var g = 0; g < goods.length; g++) m = Math.min(m, (goods[g] - s + 4) % 4);
      worst = Math.max(worst, m);
    }
    return worst;
  }
  // Toques máximos posibles del tablero (el de la ruta que menos permite)
  function potentialTaps(board) {
    return Math.min.apply(null, board.paths.map(function (p) {
      var sum = 0;
      for (var i = 0; i < p.length; i++) {
        sum += maxTapsFor(board.cells[p[i][0]][p[i][1]].type, board.req[key(p[i][0], p[i][1])]);
      }
      return sum;
    }));
  }

  // Toques mínimos para completar una ruta (giros horarios; las piezas fijas no cuentan)
  function tapsFor(board, path) {
    var n = 0;
    for (var i = 0; i < path.length; i++) {
      var cell = board.cells[path[i][0]][path[i][1]], need = board.req[key(path[i][0], path[i][1])];
      if (cell.locked) {
        if ((maskOf(cell) & need) !== need) return Infinity;
        continue;
      }
      var t = 0;
      while (t < 4 && (rotMask(BASE[cell.type], cell.rot + t) & need) !== need) t++;
      if (t === 4) return Infinity;
      n += t;
    }
    return n;
  }
  function minTapsOf(board) {
    return Math.min.apply(null, board.paths.map(function (p) { return tapsFor(board, p); }));
  }

  // Cuántas casillas de una ruta no cumplen aún su conexión
  function misplaced(board, path) {
    var n = 0;
    for (var i = 0; i < path.length; i++) {
      var k = key(path[i][0], path[i][1]);
      var cell = board.cells[path[i][0]][path[i][1]];
      if ((maskOf(cell) & board.req[k]) !== board.req[k]) n++;
    }
    return n;
  }

  // Gira al azar hasta que NADA esté conectado al origen, el tablero no esté
  // resuelto, cada ruta necesite varios toques y los toques mínimos caigan en
  // el rango pedido [minTaps, maxTaps]. Si no se logra, se queda con el que
  // más se acerque al rango.
  function scramble(board, rng, minTaps, maxTaps) {
    minTaps = minTaps || 0; maxTaps = maxTaps || 999;
    var ok = false, snap = null, snapGap = Infinity;
    for (var attempt = 0; attempt < 800 && !ok; attempt++) {
      for (var r = 0; r < board.rows; r++) {
        for (var c = 0; c < board.cols; c++) {
          var cell = board.cells[r][c];
          if (!cell.fixed) cell.rot = Math.floor(rng() * 4);
        }
      }
      var f = flood(board);
      if (f.solved || f.count > 1) continue;
      if (!board.paths.every(function (p) { return misplaced(board, p) >= 2; })) continue;
      var mt = minTapsOf(board);
      var gap = mt < minTaps ? minTaps - mt : (mt > maxTaps ? mt - maxTaps : 0);
      if (gap < snapGap) {
        snapGap = gap;
        snap = board.cells.map(function (row) { return row.map(function (x) { return x.rot; }); });
      }
      if (gap === 0) ok = true;
    }
    if (!ok && snap) { // el mejor intento válido
      for (var sr = 0; sr < board.rows; sr++)
        for (var sc = 0; sc < board.cols; sc++) board.cells[sr][sc].rot = snap[sr][sc];
      ok = true;
    }
    if (!ok) { // último recurso: desalinear a la fuerza y desconectar el origen
      board.paths.forEach(function (p) {
        for (var i = 0; i < p.length && i < 3; i++) {
          var cell = board.cells[p[i][0]][p[i][1]];
          if (cell.fixed) continue;
          var k = key(p[i][0], p[i][1]);
          for (var t = 0; t < 4; t++) {
            cell.rot = t;
            if ((maskOf(cell) & board.req[k]) !== board.req[k]) break;
          }
        }
      });
      [[0, 1, W], [1, 0, N]].forEach(function (n) {
        var cell = board.cells[n[0]][n[1]];
        for (var t = 0; t < 4; t++) { cell.rot = t; if (!(maskOf(cell) & n[2])) break; }
      });
    }
    // Cada casilla gira de forma acumulada en pantalla: turns parte de rot
    for (var rr = 0; rr < board.rows; rr++)
      for (var cc = 0; cc < board.cols; cc++) board.cells[rr][cc].turns = board.cells[rr][cc].rot;
  }

  return {
    N: N, E: E, S: S, W: W, BASE: BASE,
    key: key, rotMask: rotMask, maskOf: maskOf,
    generate: generate, flood: flood, countWays: countWays, misplaced: misplaced, minTapsOf: minTapsOf
  };
});
