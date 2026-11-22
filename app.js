/* Luces FAA! · página del público.
   El micrófono escucha comandos cortos codificados en sonido (ggwave) que salen por la PA del show.
   Cada comando elige una escena y sus controles; la escena corre con el reloj del teléfono desde que llegó el comando.
   No necesita red durante el show: alcanza con haber abierto la página antes (queda guardada para usarse sin señal).

   Formato del comando: 5 caracteres «ETCPI»
     E escena 1-9 · T velocidad 0-z (BPM = 60 + 4·T, de 60 a 200) · C color 0-9 · P patrón 0-9 · I intensidad 0-9 (10 % a 100 %)
   Los comandos viejos «e1»…«e7» siguen funcionando (con los valores por defecto). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('cv'), ctx = cv.getContext('2d');

  /* colores: 0 = paleta FAA! completa; 9 = uno al azar por teléfono */
  var ROSA = '#FF2E6A', VIOLETA = '#8E24D9', VERDE = '#93CC6E', DORADO = '#F4C95C', TURQUESA = '#8FBABA';
  var PALETA = [ROSA, VIOLETA, VERDE, DORADO, TURQUESA];
  var COLORES = [null, ROSA, VIOLETA, VERDE, DORADO, TURQUESA, '#FFFFFF', '#FF3B1F', '#2F6BFF', null];

  var seed = Math.random(); /* cada teléfono distinto: chispas, vela, arcoíris y color al azar */
  var st = { e: 1, bpm: 120, c: 0, p: 0, i: 9 }, t0 = performance.now();

  function frac(x) { return x - Math.floor(x); }
  function rnd(n) { return frac(Math.sin((n + 1) * 12.9898 + seed * 78.233) * 43758.5453); }
  function beat() { return 60000 / st.bpm; }
  /* el color de la escena; k = índice para recorrer la paleta (por tiempo, por compás…) */
  function color(k) {
    if (st.c === 0) { return PALETA[((k || 0) % PALETA.length + PALETA.length) % PALETA.length]; }
    if (st.c === 9) { return PALETA[Math.floor(rnd(k || 0) * PALETA.length)]; }
    return COLORES[st.c];
  }
  /* pinta todo con un color y una intensidad 0-1 (sobre negro) */
  function fill(c, a) {
    ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    if (!c || a <= 0) { return; }
    ctx.globalAlpha = Math.min(1, a) * (0.1 + 0.1 * st.i); ctx.fillStyle = c; ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalAlpha = 1;
  }
  /* destellos: nunca más de 3 por segundo (límite recomendado por fotosensibilidad) */
  function safe(ms) { return Math.max(ms, 1000 / 3); }

  /* ---------- Escenas: f(t), t = milisegundos desde que llegó el comando ---------- */
  var SCENES = {
    1: { nombre: 'Apagado', f: function () { fill(null, 0); } },
    2: { nombre: 'Color', f: function (t) {
      var b = beat();
      if (st.p === 1) { fill(color(0), 0.55 + 0.45 * Math.sin(t / (b * 4) * Math.PI * 2)); }        /* respira cada compás */
      else if (st.p === 2) { fill(color(0), (t % safe(b)) < safe(b) / 2 ? 1 : 0.15); }                /* parpadeo suave */
      else { fill(color(0), 1); }                                                                     /* fijo */
    } },
    3: { nombre: 'Pulso', f: function (t) {
      var b = beat(), n, ph;
      if (st.p === 2) { b *= 2; }                                    /* cada 2 tiempos */
      ph = (t % b) / b; n = Math.floor(t / b);
      if (st.p === 3) { ph = frac(ph + 0.5); }                       /* a contratiempo */
      var k = st.p === 1 ? (ph < 0.18 ? 1 : 0) : Math.pow(1 - ph, 2.2); /* 1 = seco, si no, decae suave */
      fill(color(n), 0.12 + 0.88 * k);
    } },
    4: { nombre: 'Colores', f: function (t) {
      var b = beat();
      if (st.p === 1) { fill(color(Math.floor(t / (b * 4))), 1); }    /* cambia por compás */
      else if (st.p === 2) {                                         /* fundido continuo entre colores */
        var x = t / (b * 2), i = Math.floor(x);
        fill(color(i), 1); ctx.globalAlpha = frac(x) * (0.1 + 0.1 * st.i); ctx.fillStyle = color(i + 1); ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalAlpha = 1;
      } else if (st.p === 3) { var nn = Math.floor(t / b); fill(PALETA[Math.floor(rnd(nn) * PALETA.length)], 1); } /* al azar por teléfono */
      else { fill(color(Math.floor(t / b)), 1); }                      /* cambia por tiempo */
    } },
    5: { nombre: 'Destellos', f: function (t) {
      var b = beat(), per = safe(st.p === 1 || st.p === 2 ? b * 2 : b), ph = t % per;
      var on = ph < 80 || (st.p === 2 && ph > per / 4 && ph < per / 4 + 80 && per / 4 >= 1000 / 6); /* 2: doble destello */
      fill(color(Math.floor(t / per)) || '#fff', on ? 1 : 0);
    } },
    6: { nombre: 'Chispas', f: function (t) {
      var slot = Math.floor(t / 180), r = rnd(slot * 7.31), dens = 0.04 + 0.05 * st.p; /* patrón = cantidad de chispas */
      fill(color(Math.floor(rnd(slot) * 97)), r < dens ? 1 : 0);
    } },
    7: { nombre: '26', f: function (t) {
      var b = beat(), n = Math.floor(t / b), ph = (t % b) / b, s = 1 + 0.06 * Math.pow(1 - ph, 3);
      fill(null, 0);
      if (st.p === 2 && (t % safe(b)) > safe(b) / 2) { return; }    /* 2: parpadea */
      var w = cv.width, h = cv.height, size = Math.min(w * 0.62, h * 0.5) * s;
      ctx.globalAlpha = 0.1 + 0.1 * st.i;
      ctx.fillStyle = st.p === 1 ? color(n) : color(0) || ROSA;       /* 1: cambia de color por tiempo */
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '900 ' + Math.round(size) + 'px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
      ctx.fillText('26', w / 2, h / 2); ctx.globalAlpha = 1;
    } },
    8: { nombre: 'Vela', f: function (t) {
      /* cada teléfono titila distinto, como una vela; el patrón es cuánto se mueve la llama */
      var x = t / 1000 * (1.5 + st.p), n = Math.sin(x * 2.1 + seed * 40) * 0.5 + Math.sin(x * 3.7 + seed * 13) * 0.3 + Math.sin(x * 7.3 + seed * 7) * 0.2;
      fill(st.c === 0 ? DORADO : color(0), 0.62 + 0.3 * n);
    } },
    9: { nombre: 'Arcoíris', f: function (t) {
      /* recorre los colores sin cortes; patrón 0 = todos juntos, 1-9 = cada teléfono corrido (de lejos, un brillo que se mueve) */
      var hue = (t / (beat() * 8) * 360 + (st.p ? seed * 36 * st.p : 0)) % 360;
      fill('hsl(' + hue.toFixed(0) + ',90%,55%)', 1);
    } }
  };

  function apply(next) {
    if (!SCENES[next.e]) { return; }
    st = next; t0 = performance.now();
    $('stxt').textContent = SCENES[st.e].nombre + ' · ' + st.bpm + ' BPM';
    showStatus();
  }

  function frame() {
    requestAnimationFrame(frame);
    var w = innerWidth, h = innerHeight;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    SCENES[st.e].f(performance.now() - t0);
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
    }).then(function (stream) {
      return ggwave_factory().then(function (g) {
        gg = g; gg.disableLog();
        var p = gg.getDefaultParameters(); p.sampleRateInp = actx.sampleRate; p.sampleRateOut = actx.sampleRate;
        inst = gg.init(p);
        var src = actx.createMediaStreamSource(stream), proc = actx.createScriptProcessor(1024, 1, 1), mute = actx.createGain();
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

  function onCommand(cmd) {
    cmd = cmd.trim().toLowerCase();
    var m = /^([1-9])([0-9a-z])([0-9])([0-9])([0-9])$/.exec(cmd);
    if (m) { apply({ e: +m[1], bpm: 60 + 4 * parseInt(m[2], 36), c: +m[3], p: +m[4], i: +m[5] }); return; }
    var old = /^e(\d)$/.exec(cmd); /* comandos viejos */
    if (old) { apply({ e: +old[1], bpm: 120, c: 0, p: 0, i: 9 }); }
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
      $('ov').hidden = true; apply({ e: 1, bpm: 120, c: 0, p: 0, i: 9 }); $('stxt').textContent = 'Escuchando…'; showStatus();
    }).catch(function () {
      b.disabled = false; b.textContent = 'Probar de nuevo';
      $('warn').textContent = 'Sin micrófono no llegan las señales. Revisá el permiso, o tocá 5 veces la pantalla para elegir la escena a mano.';
      $('ov').hidden = true;
    });
  });

  /* ---------- Plan B: 5 toques seguidos abren el selector de escenas a mano ---------- */
  var taps = [];
  $('picker').innerHTML = Object.keys(SCENES).map(function (k) { return '<button type="button" data-s="' + k + '">' + SCENES[k].nombre + '</button>'; }).join('');
  $('picker').addEventListener('click', function (e) {
    var b = e.target.closest('[data-s]'); if (b) { apply({ e: +b.dataset.s, bpm: st.bpm, c: st.c, p: 0, i: 9 }); this.hidden = true; }
  });
  cv.addEventListener('click', function () {
    var now = performance.now(); taps = taps.filter(function (t) { return now - t < 2000; }); taps.push(now);
    if (taps.length >= 5) { taps = []; $('picker').hidden = !$('picker').hidden; }
  });

  /* guardar la página para usarla sin señal */
  if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(function () {}); }

  frame();
})();
