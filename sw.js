/* Service worker autonome ; scope limité au dossier front-pattern-catalog. */
const VERSION = 'front-patterns-v1';
const SHELL = ['./', './index.html', './patterns.json', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('front-patterns-') && k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then((res) => {
      if (res.ok) { const copy = res.clone(); event.waitUntil(caches.open(VERSION).then((cache) => cache.put('./index.html', copy))); }
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
    if (res.ok) { const copy = res.clone(); event.waitUntil(caches.open(VERSION).then((cache) => cache.put(event.request, copy))); }
    return res;
  })));
});
