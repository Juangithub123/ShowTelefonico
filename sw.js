/* Guarda la página del público para que funcione sin señal durante el show.
   Al cambiar archivos de la página, subir VERSION. */
var VERSION = 'luces-faa-6';
var SHELL = ['./', 'index.html', 'app.js?v=5', 'decodificador.js?v=3', 'captura.js?v=1', 'vendor/ggwave.js', 'manifest.webmanifest', 'icono.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
/* primero la red (para tener lo último); sin señal, la copia guardada */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) { return; }
  e.respondWith(fetch(e.request).then(function (res) {
    if (res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || caches.match('index.html'); });
  }));
});
