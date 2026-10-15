# Topaz · Connect the Core

Juego táctil para pantalla vertical 500×1000. Cada partida es una ronda corta de 45 s en un tablero 5×5 con uno de los 8 modos (títulos) elegido al azar.

## Cómo se juega
- Toca una pieza para girarla y conecta el origen (arriba-izquierda) con el destino (abajo-derecha).
- Todo empieza en gris; las tuberías se encienden en azul solo cuando están conectadas al origen.
- **2 piezas rojas con candado** no se pueden girar (tocarlas no gasta toque).
- **Límite de toques**: toques mínimos del tablero + 5. El contador "TOQUES" se pone rojo con 3 o menos.
- Si se acaba el tiempo (el reloj se pone rojo y palpita en los últimos 5 s) o los toques, sale el título del modo con su frase "¡Casi!" (`assets/themes/<id>/lose.png`).
- Al ganar se muestra el título del modo jugado y su frase de victoria (`assets/themes/<id>/win.png`).

## Publicar
- Cloudflare Pages: sin build command, directorio raíz `/`. O `npx wrangler pages deploy .`
- Parámetros URL: `?kiosk` (oculta cursor), `?mode=<id>` (fuerza un modo), `?debug` (S resuelve, N siguiente modo en inicio).

## Configuración
Todo en `js/config.js`: `timeLimit`, `warnSeconds`, `routes`, `maxWays`, `locked`, `lockedOnRoute`, `minTaps`, `maxTaps`, `tapMargin`, `lowTaps`, `scoring`, textos, layout y `themes` (`enabled:false` quita un modo).

Valores actuales: hasta 2 formas de ganar, toques mínimos 9–13, margen +5, 45 s. FinXperience tiene ajustes propios (`difficulty` en `themes`).

## Modos
core, channels, experience, origination, secure, techinvest, techpay, topazone. Cada uno usa `assets/themes/<id>/{title,origin,dest,win,lose}.png`.

## Pruebas
`node tests/engine.test.js` y `node tests/solvable.test.js` (comprueba con un solucionador independiente que todos los tableros se pueden ganar).
