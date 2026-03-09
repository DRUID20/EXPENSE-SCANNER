const CACHE_NAME = "expense-tracker-v2";
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/login",
  "/offline.html",
];

// Install: cache essential resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // API requests: network-first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|ico|woff|woff2)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        });
      })
    );
    return;
  }

  // HTML pages: network-first with offline fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          return cached || caches.match(OFFLINE_URL);
        });
      })
  );
});

// Background sync for offline receipts
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-expenses") {
    event.waitUntil(syncOfflineExpenses());
  }
});

async function syncOfflineExpenses() {
  try {
    const cache = await caches.open("offline-expenses");
    const requests = await cache.keys();

    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const data = await response.json();
        try {
          await fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          await cache.delete(request);
        } catch {
          // Will retry on next sync
        }
      }
    }
  } catch (err) {
    console.error("Sync failed:", err);
  }
}

// Push notifications
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Gasco ExpenseTracker";
  const options = {
    body: data.message || "You have a new notification",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/dashboard" },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
