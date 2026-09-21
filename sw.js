// Минимальный Service Worker для активации PWA установки
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Просто пропускаем запросы напрямую в сеть
    return;
});
