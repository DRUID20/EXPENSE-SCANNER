const CACHE_NAME = "expense-tracker-__BUILD_ID__";
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/dashboard/expenses",
  "/dashboard/expenses/new",
  "/dashboard/scan",
  "/dashboard/approvals",
  "/dashboard/analytics",
  "/dashboard/team",
  "/dashboard/settings",
  "/login",
  "/offline.html",
];

// Install: cache essential resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use addAll for critical pages, but don't fail install if some are unavailable
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Fallback: cache what we can individually
        return Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            fetch(url)
              .then((res) => {
                if (res.ok) cache.put(url, res);
              })
              .catch(() => {})
          )
        );
      });
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
          .filter((name) => name !== CACHE_NAME && name !== "offline-expenses")
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

  // For POST requests to expenses API when offline, queue for sync
  if (request.method === "POST" && url.pathname === "/api/expenses") {
    event.respondWith(
      fetch(request.clone()).catch(async () => {
        const body = await request.clone().json();
        const cache = await caches.open("offline-expenses");
        const offlineId = `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await cache.put(
          new Request(`/api/expenses?offlineId=${offlineId}`),
          new Response(JSON.stringify(body))
        );
        // Request background sync
        if (self.registration.sync) {
          await self.registration.sync.register("sync-expenses");
        }
        return new Response(
          JSON.stringify({ expense: { id: offlineId }, offline: true }),
          { headers: { "Content-Type": "application/json" } }
        );
      })
    );
    return;
  }

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // API requests: network-first with cache fallback for offline support
  // Network-first ensures cross-device sync is always fresh (approvals, notifications)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Offline: return cached API data if available
          const cached = await caches.match(request);
          if (cached) return cached;
          // Return empty but valid JSON so the app doesn't crash
          return new Response(JSON.stringify({ error: "offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        })
    );
    return;
  }

  // Static assets (JS chunks, CSS, images, fonts): cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|ico|woff|woff2)$/) ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        }).catch(() => {
          // For missing static assets offline, return empty response
          return new Response("", { status: 503 });
        });
      })
    );
    return;
  }

  // Next.js data requests (_next/data): stale-while-revalidate
  if (url.pathname.startsWith("/_next/data/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cached) => {
          const networkFetch = fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => cached || new Response("{}", {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }));

          return cached || networkFetch;
        });
      })
    );
    return;
  }

  // HTML page navigations: network-first, cache visited pages for offline use
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Try to serve cached version of this exact page
          const cached = await caches.match(request);
          if (cached) return cached;

          // For dashboard sub-routes, try serving the cached /dashboard shell
          // Next.js client-side routing will handle the actual route
          if (url.pathname.startsWith("/dashboard")) {
            const dashboardCached = await caches.match("/dashboard");
            if (dashboardCached) return dashboardCached;
          }

          // Last resort: offline page
          const offlinePage = await caches.match(OFFLINE_URL);
          return offlinePage || new Response("Offline", { status: 503 });
        })
    );
    return;
  }

  // Everything else: network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => caches.match(request))
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
