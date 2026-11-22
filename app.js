/* Luces FAA! · página del público.
   El micrófono escucha comandos cortos codificados en sonido (ggwave) que salen por la PA del show.
   Cada comando elige una escena; la escena corre con el reloj del teléfono desde el momento en que llegó el comando.
   No necesita red durante el show: alcanza con haber abierto la página antes (queda guardada para usarse sin señal). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('cv'), ctx = cv.getContext('2d');
  var BPM = 120, BEAT = 60000 / BPM;

  /* paleta del FAA! (de las ilustraciones de la tera) */
  var ROSA = '#FF2E6A', VIOLETA = '#8E24D9', VERDE = '#93CC6E', DORADO = '#F4C95C', TURQUESA = '#8FBABA';
  var PALETA = [ROSA, VIOLETA, VERDE, DORADO, TURQUESA];

  var scene = 1, t0 = performance.now(), seed = Math.random(); /* seed: cada teléfono distinto, para las chispas */

  /* ---------- Escenas: f(t) dibuja la pantalla; t = milisegundos desde que llegó el comando ---------- */
  function fill(c) { ctx.fillStyle = c; ctx.fillRect(0, 0, cv.width, cv.height); }
  var SCENES = {
    1: { nombre: 'Apagado', f: function () { fill('#000'); } },
    2: { nombre: 'Blanco', f: function () { fill('#fff'); } },
    3: { nombre: 'Pulso', f: function (t) {
      var ph = (t % BEAT) / BEAT, k = Math.pow(1 - ph, 2.2);
      fill('#000'); ctx.globalAlpha = 0.15 + 0.85 * k; fill(ROSA); ctx.globalAlpha = 1;
    } },
    4: { nombre: 'Colores', f: function (t) { fill(PALETA[Math.floor(t / BEAT) % PALETA.length]); } },
    /* destellos: un flash corto por tiempo, 2 por segundo a 120 BPM (por debajo de 3 por segundo, el límite
       recomendado para no afectar a personas con fotosensibilidad) */
    5: { nombre: 'Destellos', f: function (t) { fill((t % BEAT) < 90 ? '#fff' : '#000'); } },
    /* chispas: cada teléfono se prende en momentos distintos; de lejos el público centellea */
    6: { nombre: 'Chispas', f: function (t) {
      var slot = Math.floor(t / 180), r = frac(Math.sin((slot + 1) * 12.9898 + seed * 78.233) * 43758.5453);
      fill(r > 0.82 ? PALETA[Math.floor(r * 100) % PALETA.length] : '#000');
    } },
    7: { nombre: '26', f: function (t) {
      var c = PALETA[Math.floor(t / BEAT) % PALETA.length], ph = (t % BEAT) / BEAT, s = 1 + 0.06 * Math.pow(1 - ph, 3);
      fill('#000');
      var w = cv.width, h = cv.height, size = Math.min(w * 0.62, h * 0.5) * s;
      ctx.fillStyle = c; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '900 ' + Math.round(size) + 'px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
      ctx.fillText('26', w / 2, h / 2);
    } }
  };
  function frac(x) { return x - Math.floor(x); }

  function setScene(n) {
    if (!SCENES[n]) { return; }
    scene = n; t0 = performance.now();
    $('stxt').textContent = SCENES[n].nombre;
    showStatus();
  }

  function frame() {
    requestAnimationFrame(frame);
    var w = innerWidth, h = innerHeight;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    SCENES[scene].f(performance.now() - t0);
  }

  /* ---------- Estado: se ve un momento al entrar o al cambiar de escena, después se apaga ---------- */
  var dimT = 0;
  function showStatus() { $('status').classList.remove('dim'); clearTimeout(dimT); dimT = setTimeout(function () { $('status').classList.add('dim'); }, 4000); }

  /* ---------- Escucha: micrófono sin procesar → ggwave ---------- */
  var actx, gg, inst;
  function listen() {
    /* a 48 kHz: ggwave decodifica mal si le llega audio a otra frecuencia (medido: 0/7 audibles a 44,1 kHz);
       así el navegador convierte el micrófono a 48 kHz antes de pasárselo */
    var AC = window.AudioContext || window.webkitAudioContext;
    try { actx = new AC({ sampleRate: 48000 }); } catch (e) { actx = new AC(); }
    return navigator.mediaDevices.getUserMedia({
      /* sin cancelación de eco, supresión de ruido ni ganancia automática: si no, el teléfono borra las señales */
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false
    }).then(function (st) {
      return ggwave_factory().then(function (g) {
        gg = g; gg.disableLog();
        var p = gg.getDefaultParameters(); p.sampleRateInp = actx.sampleRate; p.sampleRateOut = actx.sampleRate;
        inst = gg.init(p);
        var src = actx.createMediaStreamSource(st), proc = actx.createScriptProcessor(1024, 1, 1), mute = actx.createGain();
        mute.gain.value = 0;
        proc.onaudioprocess = function (e) {
          var data = e.inputBuffer.getChannelData(0), lv = 0;
          for (var i = 0; i < data.length; i += 16) { lv = Math.max(lv, Math.abs(data[i])); }
          $('dot').style.setProperty('--lv', String(1 + Math.min(1, lv * 4)));
          var r = gg.decode(inst, new Int8Array(new Float32Array(data).buffer));
          if (r && r.length) { onCommand(String.fromCharCode.apply(null, Array.from(r))); } /* copiar ya: apunta a memoria de ggwave */
        };
        src.connect(proc); proc.connect(mute); mute.connect(actx.destination);
        if (actx.state === 'suspended') { actx.resume(); }
      });
    });
  }

  /* comandos: «e1»…«e7» = escena */
  function onCommand(cmd) {
    var m = /^e(\d+)$/.exec(cmd.trim());
    if (m) { setScene(+m[1]); }
  }

  /* ---------- Pantalla siempre encendida ---------- */
  var lock = null;
  function keepAwake() {
    if (!('wakeLock' in navigator)) { return; }
    navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () {});
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && lock === null) { keepAwake(); }
    if (!document.hidden && actx && actx.state === 'suspended') { actx.resume(); }
    if (document.hidden) { lock = null; }
  });

  /* ---------- Entrar ---------- */
  $('go').addEventListener('click', function () {
    var b = this; b.disabled = true; b.textContent = 'Abriendo…';
    keepAwake();
    var de = document.documentElement;
    if (de.requestFullscreen) { de.requestFullscreen().catch(function () {}); }
    listen().then(function () {
      $('ov').hidden = true; setScene(1); $('stxt').textContent = 'Escuchando…'; showStatus();
    }).catch(function () {
      b.disabled = false; b.textContent = 'Probar de nuevo';
      $('warn').textContent = 'Sin micrófono no llegan las señales. Revisá el permiso, o tocá 5 veces la pantalla para elegir la escena a mano.';
      $('ov').hidden = true;
    });
  });

  /* ---------- Plan B: 5 toques seguidos abren el selector de escenas a mano ---------- */
  var taps = [];
  $('picker').innerHTML = Object.keys(SCENES).map(function (k) { return '<button type="button" data-s="' + k + '">' + SCENES[k].nombre + '</button>'; }).join('');
  $('picker').addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (b) { setScene(+b.dataset.s); this.hidden = true; } });
  cv.addEventListener('click', function () {
    var now = performance.now(); taps = taps.filter(function (t) { return now - t < 2000; }); taps.push(now);
    if (taps.length >= 5) { taps = []; $('picker').hidden = !$('picker').hidden; }
  });

  /* guardar la página para usarla sin señal */
  if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(function () {}); }

  setScene(1); frame();
})();
