// Order Reminder Service Worker - No stale cache mode
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Always fetch directly from network to avoid any stale data
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
