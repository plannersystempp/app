// Service Worker simplificado para desativar comportamento problemático
const CACHE_NAME = 'plannersystem-v2.7.2-disabled-fetch';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Limpa todos os caches antigos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }),
      self.clients.claim() // Assume o controle imediatamente
    ])
  );
});

// Fetch event desativado - deixa o navegador lidar com tudo
self.addEventListener('fetch', (event) => {
  // Pass-through explícito
  return;
});

/* 
// Push notifications desativadas conforme solicitação
self.addEventListener('push', (event) => {
  // Push desativado
});
*/
