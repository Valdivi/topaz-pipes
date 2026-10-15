// Prueba del motor: node tests/engine.test.js
const assert = require('assert');
const E = require('../js/engine.js');

// RNG con semilla para que los fallos sean reproducibles
function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clone = b => JSON.parse(JSON.stringify(b));
const isOriginNeighbor = (r, c) => (r === 0 && c === 1) || (r === 1 && c === 0);

// Pone una ruta en su rotación de solución (sin tocar el resto)
function applySolution(board, path) {
  path.forEach(([r, c]) => { board.cells[r][c].rot = board.sol[r + ',' + c]; });
}

// Resuelve dando toques horarios solo en la ruta más corta en toques; devuelve cuántos toques usó
function solveByTaps(board) {
  const taps = board.paths.map(path => {
    const copy = clone(board);
    let n = 0;
    path.forEach(([r, c]) => {
      const cell = copy.cells[r][c], need = copy.req[r + ',' + c];
      if (cell.locked) return;
      while ((E.maskOf(cell) & need) !== need) { cell.rot = (cell.rot + 1) % 4; n++; }
    });
    return { n, copy };
  }).sort((a, b) => a.n - b.n)[0];
  return { n: taps.n, solved: E.flood(taps.copy).solved };
}

function run(label, opts, n, range) {
  const ways = [], mins = [];
  let inRange = 0, overLimit = 0;
  for (let i = 0; i < n; i++) {
    const rng = mulberry(5000 + i);
    const b = E.generate(Object.assign({ rows: 5, cols: 5, rng }, opts));

    // 1) nunca empieza resuelto y NADA está conectado al origen
    const f0 = E.flood(b);
    assert.strictEqual(f0.solved, false, `tablero ${i} (${label}) ya viene resuelto`);
    assert.strictEqual(f0.count, 1, `tablero ${i} (${label}) tiene tuberías conectadas al empezar`);

    // 2) las rutas son caminos válidos
    const used = new Set();
    b.paths.forEach(p => {
      for (let k = 0; k < p.length; k++) {
        const key = p[k].join(',');
        assert(!used.has(key), `casilla repetida en rutas (tablero ${i})`);
        used.add(key);
        if (k > 0) assert.strictEqual(Math.abs(p[k][0] - p[k - 1][0]) + Math.abs(p[k][1] - p[k - 1][1]), 1);
      }
    });
    assert(!used.has('0,0') && !used.has('4,4'));

    // 3) cada ruta, por sí sola, resuelve el tablero (las piezas fijas ya están bien puestas)
    b.paths.forEach((p, idx) => {
      const copy = clone(b);
      applySolution(copy, p);
      assert.strictEqual(E.flood(copy).solved, true, `la ruta ${idx} no resuelve el tablero ${i} (${label})`);
    });

    // 4) formas de ganar dentro del límite
    const w = E.countWays(b, 200);
    assert(w >= b.paths.length);
    ways.push(w);
    if (opts.maxWays && w > opts.maxWays) overLimit++;

    // 5) piezas fijas
    const locked = [];
    b.cells.forEach((row, r) => row.forEach((cell, c) => { if (cell.locked) locked.push([r, c, cell]); }));
    assert.strictEqual(locked.length, opts.locked || 0, `número de piezas fijas (tablero ${i})`);
    locked.forEach(([r, c, cell]) => {
      assert(cell.fixed, 'una pieza fija debe estar marcada fixed');
      assert(!isOriginNeighbor(r, c), 'no se fijan casillas junto al origen');
      assert(!(r === 0 && c === 0) && !(r === 4 && c === 4));
    });
    const onRoute = locked.filter(([r, c]) => used.has(r + ',' + c));
    assert.strictEqual(onRoute.length, Math.min(opts.lockedOnRoute == null ? 1 : opts.lockedOnRoute, opts.locked || 0), 'piezas fijas dentro de la ruta');
    onRoute.forEach(([r, c, cell]) => assert.strictEqual(cell.rot, b.sol[r + ',' + c], 'la pieza fija de la ruta debe estar bien orientada'));

    // 6) toques: mínimo real, rango pedido y límite
    const s = solveByTaps(b);
    assert.strictEqual(s.solved, true, 'resolver con toques debe ganar');
    assert.strictEqual(s.n, b.minTaps, `minTaps (${b.minTaps}) no coincide con los toques reales (${s.n}) en tablero ${i}`);
    assert.strictEqual(b.tapLimit, b.minTaps + (opts.tapMargin == null ? 5 : opts.tapMargin));
    mins.push(b.minTaps);
    if (b.minTaps >= range[0] && b.minTaps <= range[1]) inRange++;
  }
  const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
  console.log(`${label}: ${n} tableros OK · formas de ganar: máx ${Math.max(...ways)} · toques mínimos: media ${avg(mins)} (${Math.min(...mins)}–${Math.max(...mins)}) · dentro de [${range}]: ${(inRange / n * 100).toFixed(1)} %`);
  return { overLimit, inRangePct: inRange / n };
}

// Giro de máscaras
assert.strictEqual(E.rotMask(E.N, 1), E.E);
assert.strictEqual(E.rotMask(E.E, 1), E.S);
assert.strictEqual(E.rotMask(E.S, 1), E.W);
assert.strictEqual(E.rotMask(E.W, 1), E.N);
assert.strictEqual(E.rotMask(E.BASE.tee, 4), E.BASE.tee);

const W = { straight: 36, elbow: 44, tee: 14, cross: 6 };
const t0 = Date.now();
const u = run('Solución única + 2 fijas + toques 10–15', { routes: 1, maxWays: 1, weights: W, upgrade: 0.1, locked: 2, lockedOnRoute: 1, minTaps: 10, maxTaps: 15, tapMargin: 5 }, 3000, [10, 15]);
const d = run('Dos rutas   + 2 fijas + toques 8–13 ', { routes: 2, maxWays: 2, weights: W, upgrade: 0.1, locked: 2, lockedOnRoute: 1, minTaps: 8, maxTaps: 13, tapMargin: 5 }, 3000, [8, 13]);
const z = run('Sin piezas fijas (compatibilidad)   ', { routes: 1, maxWays: 1, weights: W, upgrade: 0.1 }, 1000, [0, 99]);
console.log(`tiempo total: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
assert.strictEqual(u.overLimit + d.overLimit + z.overLimit, 0, 'hay tableros con más formas de ganar que el límite');
assert(u.inRangePct > 0.9, 'la mayoría de tableros debe caer en el rango de toques (solución única)');
console.log('Todas las pruebas pasaron');
