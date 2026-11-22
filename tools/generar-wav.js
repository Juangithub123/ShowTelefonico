/* Genera los WAV de los comandos para disparar desde Arena, TD o cualquier reproductor.
   Uso: node tools/generar-wav.js   (deja los archivos en wav/) */
const fs = require('fs'), path = require('path');
const factory = require('../vendor/ggwave.js');
const RATE = 48000;
const COMANDOS = require('../comandos.json');

function wav(float32, rate) {
  const n = float32.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(float32[i] * 32767))), 44 + i * 2); }
  return buf;
}

function check(gg, f, cmd) {
  const p = gg.getDefaultParameters(); p.sampleRateInp = RATE; p.sampleRateOut = RATE;
  const rx = gg.init(p), pad = new Float32Array(Math.round(RATE * 0.4)), tail = new Float32Array(RATE);
  const all = new Float32Array(pad.length + f.length + tail.length); all.set(f, pad.length);
  let got = '';
  for (let i = 0; i < all.length; i += 1024) {
    const chunk = all.slice(i, i + 1024); if (chunk.length < 1024) { break; }
    const r = gg.decode(rx, new Int8Array(chunk.buffer));
    if (r && r.length) { got = String.fromCharCode.apply(null, Array.from(r)); } /* copiar enseguida: apunta a la memoria interna de ggwave */
  }
  gg.free(rx);
  return got === cmd;
}

factory().then(function (gg) {
  gg.disableLog();
  const log = console.log; console.log = function () {}; /* ggwave imprime líneas de depuración al codificar */
  const p = gg.getDefaultParameters(); p.sampleRateInp = RATE; p.sampleRateOut = RATE;
  const inst = gg.init(p);
  /* protocolos NORMAL: los FAST/FASTEST fallan seguido aun sin ruido (medido: 20/20 contra 1-6/20).
     Cada comando dura ~1,26 s: el cambio ocurre al terminar el sonido, hay que dispararlo ese tiempo antes. */
  const modos = { audible: gg.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_NORMAL, ultrasonido: gg.ProtocolId.GGWAVE_PROTOCOL_ULTRASOUND_NORMAL };
  Object.keys(modos).forEach(function (modo) {
    fs.mkdirSync(path.join(__dirname, '..', 'wav', modo), { recursive: true });
    COMANDOS.escenas.forEach(function (e) {
      /* cada escena con los valores por defecto: ETCPI */
      const d = COMANDOS.defecto;
      e.cmd = String(e.n) + ((d.bpm - 60) / 4).toString(36) + d.color + d.patron + d.intensidad;
      const raw = gg.encode(inst, e.cmd, modos[modo], 50);
      const f = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
      /* comprobación: se decodifica como llegaría a un micrófono (en trozos, con silencio antes y después) */
      const ok = check(gg, f, e.cmd);
      const name = e.n + '-' + e.id + '.wav';
      fs.writeFileSync(path.join(__dirname, '..', 'wav', modo, name), wav(f, RATE));
      log(modo.padEnd(12), name.padEnd(22), e.cmd, (f.length / RATE).toFixed(2) + ' s', ok ? 'ok' : 'NO DECODIFICA');
    });
  });
});
