// Service worker minimal — nécessaire pour que Chrome/Android propose l'installation de la PWA
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Passthrough simple — pas de cache offline pour l'instant
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
