/* AudioWorklet: junta el audio del micrófono en bloques de 1024 muestras y los manda al decodificador.
   Corre en el hilo de audio, así que no le saca tiempo a la pantalla. */
class Captura extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(1024); this.n = 0; this.out = null;
    this.port.onmessage = (e) => { if (e.data.port) { this.out = e.data.port; } };
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && this.out) {
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.n++] = ch[i];
        if (this.n === 1024) { this.out.postMessage(this.buf, [this.buf.buffer]); this.buf = new Float32Array(1024); this.n = 0; }
      }
    }
    return true;
  }
}
registerProcessor('captura', Captura);
