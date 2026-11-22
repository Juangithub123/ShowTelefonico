# Luces FAA! 2026

Show de luces en los teléfonos del público, sin app y sin red durante el show. Es la idea de Wham City Lights hecha con herramientas abiertas.

- El público abre una **página web** con un QR, toca **Entrar** y acepta el micrófono.
- Desde la PA suenan **comandos cortos codificados en sonido** con [ggwave](https://github.com/ggerganov/ggwave), en versión audible o ultrasonido.
- Cada teléfono escucha el comando y cambia de **escena**. La escena corre con el reloj del teléfono desde que llegó el comando.
- Una vez abierta, la página queda guardada y **funciona sin señal**.

## Archivos

| Archivo | Para qué |
| --- | --- |
| `index.html`, `app.js` | La página del público |
| `emisor.html`, `emisor.js` | Panel para quien opera: suena los comandos desde una compu o teléfono conectado a la consola |
| `wav/audible/`, `wav/ultrasonido/` | Los comandos como WAV (48 kHz, mono), para disparar desde Arena o TouchDesigner |
| `comandos.json` | La lista de escenas y sus comandos |
| `tools/generar-wav.js` | Regenera los WAV y comprueba que cada uno se decodifique (`node tools/generar-wav.js`) |
| `vendor/ggwave.js` | ggwave 0.4.0 (licencia MIT), en un solo archivo |
| `sw.js` | Guarda la página para usarla sin señal. Al cambiar archivos, subir `VERSION` |

## Escenas

| Comando | Escena |
| --- | --- |
| `e1` | Apagado |
| `e2` | Blanco pleno |
| `e3` | Pulso rosa, a 120 BPM |
| `e4` | Colores FAA!, uno por tiempo |
| `e5` | Destellos: un flash por tiempo. Son 2 por segundo, por debajo de los 3 por segundo recomendados por fotosensibilidad |
| `e6` | Chispas: cada teléfono se prende en momentos distintos |
| `e7` | Un 26 grande que cambia de color |

## Cosas medidas

- **Protocolos:** se usan los NORMAL de ggwave. Los FAST y FASTEST fallaron seguido aun sin ruido (1 a 6 aciertos de 20, contra 20 de 20).
- **Duración:** cada comando dura ~1,26 s y el cambio ocurre cuando termina el sonido. Para que caiga en un golpe de la música, hay que dispararlo ~1,3 s antes.
- **Frecuencia de muestreo:** la página trabaja a 48 kHz, porque ggwave decodifica mal el audio a 44,1 kHz (0 de 7 comandos audibles). Con eso, en la prueba con micrófono simulado llegaron 7 de 7, audibles y ultrasónicos.
- **Ultrasonido:** usa la banda de ~15 a 19 kHz. Muchas PA y micrófonos de teléfono pierden respuesta ahí: hay que probarlo con el equipo real.

## Plan B

Si un teléfono no escucha, **5 toques seguidos en la pantalla** abren un selector para elegir la escena a mano.
