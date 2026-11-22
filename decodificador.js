/* Web Worker: decodifica los comandos fuera del hilo de la pantalla, así el dibujo no se traba.
   Recibe bloques de audio (Float32, 1024 muestras) por un MessagePort que le pasa la página,
   y le contesta a la página con los comandos y con el nivel del micrófono. */
importScripts('vendor/ggwave.js');

var gg = null, inst = null, queue = [], lv = 0, lastLv = 0, nBlocks = 0, msDec = 0;

function block(f) {
  for (var i = 0; i < f.length; i += 16) { lv = Math.max(lv, Math.abs(f[i])); }
  var t = performance.now();
  var r = gg.decode(inst, new Int8Array(f.buffer, f.byteOffset, f.byteLength));
  msDec += performance.now() - t; nBlocks++;
  if (r && r.length) { postMessage({ cmd: String.fromCharCode.apply(null, Array.from(r)) }); } /* copiar ya: apunta a memoria de ggwave */
  var now = Date.now();
  if (now - lastLv > 120) { postMessage({ lv: lv }); lv = 0; lastLv = now; }
  if (nBlocks >= 47) { postMessage({ diag: { blocks: nBlocks, ms: msDec / nBlocks } }); nBlocks = 0; msDec = 0; }
}

function feed(f) { if (gg) { block(f); } else if (queue.length < 200) { queue.push(f); } }

onmessage = function (e) {
  var d = e.data;
  if (d.init) {
    ggwave_factory().then(function (g) {
      gg = g; gg.disableLog();
      ['AUDIBLE_FAST', 'AUDIBLE_FASTEST', 'ULTRASOUND_FAST', 'ULTRASOUND_FASTEST', 'DT_NORMAL', 'DT_FAST', 'DT_FASTEST'].forEach(function (n) { gg.rxToggleProtocol(gg.ProtocolId['GGWAVE_PROTOCOL_' + n], false); });
      var p = gg.getDefaultParameters(); p.sampleRateInp = d.rate; p.sampleRateOut = d.rate;
      inst = gg.init(p);
      queue.splice(0).forEach(block);
      postMessage({ ready: true });
    });
    /* el audio puede llegar directo desde el AudioWorklet por este puerto */
    if (d.port) { d.port.onmessage = function (m) { feed(m.data); }; }
  } else if (d.audio) {
    feed(d.audio);
  }
};
