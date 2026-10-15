/* ============================================================
   CONFIGURACIÓN DEL JUEGO  ·  Topaz · Connect the Core
   Todo lo que se puede ajustar sin tocar la lógica está aquí.
   ============================================================ */
window.CONFIG = {
  // Tablero
  grid: { rows: 5, cols: 5 },

  // Segundos para ganar cada partida
  timeLimit: 45,

  // En los últimos N segundos el reloj se pone rojo y palpita
  warnSeconds: 5,

  // ---- Dificultad ----------------------------------------------------------
  // Cuántas rutas se trazan: 1 = una sola · 2 = dos rutas separadas
  routes: 1,

  // Máximo de formas de ganar que puede tener un tablero.
  // 1 = solución única (lo más difícil) · 2 = dos rutas (usa routes: 2)
  maxWays: 2,

  // Piezas fijas (rojas, no se pueden girar). lockedOnRoute = cuántas de ellas
  // pertenecen al camino correcto (ya vienen bien puestas); el resto son señuelos.
  locked: 2,
  lockedOnRoute: 1,

  // Toques mínimos que debe necesitar un tablero para resolverse (rango).
  // Con routes: 2 baja estos valores (por ejemplo 8 y 13).
  minTaps: 9,
  maxTaps: 13,

  // Límite de toques de cada tablero = toques mínimos + este margen
  tapMargin: 5,

  // El contador de toques se pone rojo con este número de toques o menos
  lowTaps: 3,

  // Probabilidad de las piezas de relleno (señuelos). Son pesos relativos.
  pieceWeights: { straight: 36, elbow: 44, tee: 14, cross: 6 },

  // Probabilidad de que una casilla de la ruta sea T o cruz en vez de recta/codo
  pathUpgradeChance: 0.1,

  // Puntos = base + segundos restantes × porSegundo
  scoring: { base: 1000, perSecond: 50 },

  // Velocidad a la que la luz recorre la tubería (ms por casilla)
  lightStepMs: 90,

  // Milisegundos de inactividad en pantallas de resultado antes de volver al inicio
  resultIdleMs: { win: 12000, lose: 10000 },

  // Textos (edítalos libremente)
  texts: {
    startButton: 'TOCA PARA JUGAR',
    timeLabel: 'TIEMPO',
    pointsLabel: 'PUNTOS',
    tapsLabel: 'TOQUES',
    winPoints: 'PUNTOS',
    winTime: 'Tiempo restante',
    again: 'JUGAR DE NUEVO',
    retry: 'INTENTAR DE NUEVO'
  },

  // Posiciones sobre el lienzo de 500 × 1000 (salen del editor de layout)
  layout: {
    logo:      { x: 125, y: 80,  w: 247.1503, h: 85.7527 },
    title:     { x: 42,  y: 225, w: 422.6142, h: 113.6779 },
    hudTime:   { x: 83,  y: 370, w: 145, h: 60 },
    hudPoints: { x: 279, y: 371, w: 145, h: 60 },
    taps:      { x: 150, y: 435, w: 200, h: 24 },
    grid:      { x: 42,  y: 465, w: 425, h: 425 }
  },

  // Los modos. Cada uno usa assets/themes/<id>/{title,origin,dest,win}.png
  // (win.png es la tarjeta con la frase de victoria de ese modo).
  // Pon enabled:false para quitar un modo de la rotación.
  themes: [
    { id: 'core',        name: 'FinancialCore',  enabled: true },
    { id: 'channels',    name: 'FinChannels',    enabled: true },
    { id: 'experience',  name: 'FinXperience',   enabled: true,
      difficulty: { maxWays: 1, minTaps: 11, maxTaps: 15, tapMargin: 4, locked: 3, lockedOnRoute: 1 } },
    { id: 'origination', name: 'FinOrigination', enabled: true },
    { id: 'secure',      name: 'SecureJourney',  enabled: true },
    { id: 'techinvest',  name: 'TechInvest',     enabled: true },
    { id: 'techpay',     name: 'TechPay',        enabled: true },
    { id: 'topazone',    name: 'Topaz One',      enabled: true }
  ]
};
