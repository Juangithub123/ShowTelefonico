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

/* Si el micrófono no viene a 48 kHz (Firefox no deja forzarlo), se convierte acá: ggwave decodifica mal a otra
   frecuencia, y probado en Node, convertir con interpolación lineal a 48 kHz recupera todos los comandos. */
var inRate = 48000, pos = 0, prev = 0, acc = new Float32Array(1024), nAcc = 0;
function resample(f) {
  if (inRate === 48000) { return [f]; }
  var step = inRate / 48000, outBlocks = [];
  while (pos < f.length) {
    var i = Math.floor(pos), t = pos - i, a = i === 0 ? prev : f[i - 1], b = f[i];
    acc[nAcc++] = a + (b - a) * t;
    if (nAcc === 1024) { outBlocks.push(acc); acc = new Float32Array(1024); nAcc = 0; }
    pos += step;
  }
  pos -= f.length; prev = f[f.length - 1];
  return outBlocks;
}
function feed(f) { resample(f).forEach(function (blk) { if (gg) { block(blk); } else if (queue.length < 200) { queue.push(blk); } }); }

onmessage = function (e) {
  var d = e.data;
  if (d.init) {
    inRate = d.rate || 48000;
    ggwave_factory().then(function (g) {
      gg = g; gg.disableLog();
      ['AUDIBLE_FAST', 'AUDIBLE_FASTEST', 'ULTRASOUND_FAST', 'ULTRASOUND_FASTEST', 'DT_NORMAL', 'DT_FAST', 'DT_FASTEST'].forEach(function (n) { gg.rxToggleProtocol(gg.ProtocolId['GGWAVE_PROTOCOL_' + n], false); });
      var p = gg.getDefaultParameters(); p.sampleRateInp = 48000; p.sampleRateOut = 48000;
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
