/* Service worker autonome ; scope limité au dossier front-pattern-catalog. */
const VERSION = 'front-patterns-v8';
const SHELL = ['./', './index.html', './patterns.json', './diagrams.js', './decision-tree.html', './decision-tree.js', './decision-map.css', './decision-tree.json', './pattern.html', './pattern-detail.js', './pattern-detail.css', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];
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
    // Une PWA multipage doit conserver la bonne page, et non remplacer l'arbre
    // ou une fiche d'architecture par la page d'accueil hors ligne.
    const filename = url.pathname.split('/').pop();
    const key = filename === 'pattern.html' ? './pattern.html'
              : filename === 'decision-tree.html' ? './decision-tree.html'
              : './index.html';
    event.respondWith(fetch(event.request).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        event.waitUntil(caches.open(VERSION).then((cache) => cache.put(key, copy)));
      }
      return res;
    }).catch(() => caches.match(key).then((cached) => cached || caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
    if (res.ok) { const copy = res.clone(); event.waitUntil(caches.open(VERSION).then((cache) => cache.put(event.request, copy))); }
    return res;
  })));
});
