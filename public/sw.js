// Minimal Service Worker pour PWA - Le Fil du bureau CJ
const CACHE_NAME = "le-fil-cj-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // En phase 1, stratégie network-first sans interférer avec l'authentification SSR
  if (event.request.method !== "GET" || event.request.url.startsWith("chrome-extension")) {
    return;
  }
});
