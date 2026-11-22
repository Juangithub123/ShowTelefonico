/* Emisor: suena los comandos para que los escuchen los teléfonos. Usa los mismos protocolos que los WAV de wav/. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var mode = 'audible', actx = null, gg = null, inst = null;

  fetch('comandos.json').then(function (r) { return r.json(); }).then(function (data) {
    $('grid').innerHTML = data.escenas.map(function (e) {
      return '<button class="scene" type="button" data-c="' + e.cmd + '"><span>' + e.n + ' · ' + e.nombre + '</span><b>' + e.cmd + '</b></button>';
    }).join('');
    var list = function () {
      $('wavs').innerHTML = data.escenas.map(function (e) {
        var f = 'wav/' + mode + '/' + e.n + '-' + e.id + '.wav';
        return '<li><a href="' + f + '" download>' + f + '</a></li>';
      }).join('');
    };
    list();
    $('mode').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-m]'); if (!b) { return; }
      mode = b.dataset.m;
      [].forEach.call(this.querySelectorAll('[data-m]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      list();
    });
  });

  function ready() {
    if (gg) { return Promise.resolve(); }
    var AC = window.AudioContext || window.webkitAudioContext;
    try { actx = new AC({ sampleRate: 48000 }); } catch (e) { actx = new AC(); }
    return ggwave_factory().then(function (g) {
      gg = g; gg.disableLog();
      var p = gg.getDefaultParameters(); p.sampleRateInp = actx.sampleRate; p.sampleRateOut = actx.sampleRate;
      inst = gg.init(p);
    });
  }

  $('grid').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-c]'); if (!b) { return; }
    ready().then(function () {
      if (actx.state === 'suspended') { actx.resume(); }
      var proto = mode === 'audible' ? gg.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_NORMAL : gg.ProtocolId.GGWAVE_PROTOCOL_ULTRASOUND_NORMAL;
      var raw = gg.encode(inst, b.dataset.c, proto, +$('vol').value);
      var f = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
      var buf = actx.createBuffer(1, f.length, actx.sampleRate); buf.getChannelData(0).set(f);
      var src = actx.createBufferSource(); src.buffer = buf; src.connect(actx.destination); src.start();
      [].forEach.call($('grid').children, function (x) { x.classList.toggle('on', x === b); });
    });
  });
})();
