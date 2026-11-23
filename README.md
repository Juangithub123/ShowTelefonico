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
| `emisor.html`, `emisor.js` | Panel para quien opera: arma y suena los comandos desde una compu o teléfono conectado a la consola |
| `wav/audible/`, `wav/ultrasonido/` | Cada escena con los valores por defecto como WAV (48 kHz, mono), para Arena o TouchDesigner |
| `comandos.json` | La lista de escenas y sus comandos |
| `tools/generar-wav.js` | Regenera los WAV y comprueba que cada uno se decodifique (`node tools/generar-wav.js`) |
| `captura.js`, `decodificador.js` | El micrófono se junta en el hilo de audio (AudioWorklet), que además detecta el tic de sincronía, y se decodifica en un Web Worker, así la pantalla no se traba |
| `vendor/ggwave.js` | ggwave 0.4.0 (licencia MIT), en un solo archivo |
| `sw.js` | Guarda la página para usarla sin señal. Al cambiar archivos, subir `VERSION` |

## Comandos

Cada comando tiene 5 caracteres, `ETCPI`:

| Letra | Qué es | Valores |
| --- | --- | --- |
| E | Escena | 1 a 9 (tabla de abajo) |
| T | Velocidad | 0 a z en base 36: BPM = 60 + 4·T, de 60 a 200 (`f` = 120) |
| C | Color | 0 paleta FAA!, 1 rosa, 2 violeta, 3 verde, 4 dorado, 5 turquesa, 6 blanco, 7 rojo, 8 azul, 9 al azar por teléfono |
| P | Patrón | Depende de la escena (tabla de abajo) |
| I | Intensidad | 0 a 9 (10 % a 100 %) |

Por ejemplo, `4f229` es Colores a 120 BPM, en violeta, con fundido continuo y al 100 %. Los comandos viejos `e1`…`e7` siguen andando.

| E | Escena | Patrones |
| --- | --- | --- |
| 1 | Apagado | — |
| 2 | Color | Fijo · Respira cada compás · Parpadeo suave |
| 3 | Pulso | Suave · Seco · Cada 2 tiempos · A contratiempo |
| 4 | Colores | Cambia por tiempo · Por compás · Fundido continuo · Al azar por teléfono |
| 5 | Destellos | Uno por tiempo · Cada 2 tiempos · Doble. Nunca más de 3 por segundo, por fotosensibilidad |
| 6 | Chispas | 0 a 9: cantidad de chispas |
| 7 | 26 | Fijo · Cambia de color · Parpadea |
| 8 | Vela | 0 a 9: cuánto se mueve la llama. Cada teléfono titila distinto |
| 9 | Arcoíris | 0: todos juntos · 1 a 9: cada teléfono más corrido |

El emisor arma el comando con botones y deslizadores. Tiene tap tempo y atajos de teclado: 1-9 eligen escena, espacio envía y T marca el tempo. También descarga el WAV de cualquier combinación.

## Cosas medidas

- **Protocolos:** se usan los NORMAL de ggwave. Los FAST y FASTEST fallaron seguido aun sin ruido (1 a 6 aciertos de 20, contra 20 de 20).
- **Duración:** cada comando de 5 caracteres dura ~1,45 s, más 0,2 s hasta el tic. El cambio cae en el tic, así que hay que dispararlo ~1,7 s antes del golpe.
- **Frecuencia de muestreo:** la página trabaja a 48 kHz, porque ggwave decodifica mal el audio a 44,1 kHz (0 de 7 comandos audibles). Con eso, en la prueba con micrófono simulado llegaron 7 de 7, audibles y ultrasónicos.
- **Ultrasonido:** usa la banda de ~15 a 19 kHz. Muchas PA y micrófonos de teléfono pierden respuesta ahí: hay que probarlo con el equipo real.

## Sincronía entre teléfonos

Cada comando termina con un **tic**: 0,2 s después de los datos suena un pulso de 30 ms, a 17.500 Hz en ultrasonido o a 9.000 Hz en audible. El comando dice *qué* hacer y el tic dice *cuándo*. Para que el golpe de luz caiga en un golpe de la música, el tic tiene que coincidir con ese golpe.

- El AudioWorklet busca el tic con filtros de Goertzel cada ~1,3 ms y lo ubica con la hora exacta del audio. En simulación, con música encima, se detectó 120 de 120 veces, con un error menor a 1 ms. Usando solo el comando, la dispersión era de unos 25 ms entre teléfonos, y hasta 110 ms cuando el comando se detecta un bloque tarde.
- La hora del audio se pasa al reloj de la pantalla descontando la demora de entrada (`track.getSettings().latency`, en Chrome) y de salida (`outputLatency`) que informa el navegador.
- Si el tic no aparece en la ventana esperada (de 120 ms antes a 50 ms después de lo previsto), se usa la hora calculada a partir del comando.
- Con `?diag` se ve cómo se sincronizó cada comando (`tic ±X ms`) y las demoras de entrada y salida.

Lo que no se puede corregir del todo: si un modelo de teléfono tiene más demora de micrófono que otro y el navegador no la informa (por ejemplo Firefox), queda esa diferencia, normalmente de unas decenas de ms.

## Plan B

Si un teléfono no escucha, **5 toques seguidos en la pantalla** abren un selector para elegir la escena a mano.
