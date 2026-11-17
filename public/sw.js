// Service Worker PWA & Web Push - Le Fil du bureau CJ
const CACHE_NAME = "le-fil-cj-v3";
const OFFLINE_FALLBACK = "/hors-ligne";

const PRECACHE_ASSETS = [
  "/",
  "/hors-ligne",
  "/installer",
  "/manifest.webmanifest",
  "/brand/club-cj-logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("Pré-mise en cache partielle du shell PWA :", err);
      });
    })
  );
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

// Réception d'une notification Push Web
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "Le Fil du bureau CJ";
    const options = {
      body: data.body || "",
      icon: data.icon || "/brand/icon-192.png",
      badge: "/brand/icon-192.png",
      vibrate: [100, 50, 100],
      data: {
        url: data.url || "/",
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("Erreur lors de la réception de la notification push :", err);
  }
});

// Clic sur la notification Push : ouvre ou bascule vers l'application
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Gestionnaire réseau et hors-ligne
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET" || request.url.startsWith("chrome-extension")) {
    return;
  }

  // Requêtes de navigation (pages HTML)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;
        return cache.match(OFFLINE_FALLBACK);
      })
    );
    return;
  }

  // Fichiers statiques : Next.js static, images, polices
  if (
    request.url.includes("/_next/static/") ||
    request.url.includes("/brand/") ||
    request.destination === "font" ||
    request.destination === "style"
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});
