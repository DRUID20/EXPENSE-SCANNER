/// <reference lib="webworker" />

const CACHE_NAME = "gasco-expense-v1";
const OFFLINE_URL = "/offline";

// Static assets to cache on install
const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/dashboard/expenses",
  "/dashboard/expenses/new",
  "/dashboard/scan",
  "/dashboard/approvals",
  "/dashboard/analytics",
  "/dashboard/settings",
  "/offline",
  "/manifest.json",
];

const sw = self;

// Install: precache shell assets
sw.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => sw.skipWaiting())
  );
});

// Activate: clean old caches
sw.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => sw.clients.claim())
  );
});

// Fetch: network-first for API, cache-first for static
sw.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== "GET" || url.origin !== location.origin) return;

  // API requests: network-first with cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Cache successful GET API responses
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ||
              new Response(JSON.stringify({ error: "Offline" }), {
                status: 503,
                headers: { "Content-Type": "application/json" },
              })
          )
        )
    );
    return;
  }

  // Static/page assets: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => {
          // Return offline page for navigation requests
          if (request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
          return undefined;
        });

      return cached || fetchPromise;
    })
  );
});

// Background Sync: retry failed expense submissions
sw.addEventListener("sync", (event) => {
  if (event.tag === "sync-expenses") {
    event.waitUntil(syncPendingExpenses());
  }
});

async function syncPendingExpenses() {
  try {
    // Open IndexedDB to get queued expenses
    const db = await openDB();
    const tx = db.transaction("sync-queue", "readonly");
    const store = tx.objectStore("sync-queue");
    const items = await getAllFromStore(store);

    for (const item of items) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
        });

        if (res.ok) {
          // Remove from queue on success
          const deleteTx = db.transaction("sync-queue", "readwrite");
          deleteTx.objectStore("sync-queue").delete(item.id);

          // Notify user
          await sw.registration.showNotification("Expense Synced", {
            body: `Your offline expense has been submitted successfully.`,
            icon: "/icons/icon-192.svg",
            badge: "/icons/icon-96.svg",
            tag: "sync-success",
          });
        }
      } catch {
        // Will retry on next sync
      }
    }
  } catch {
    // DB not available
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("gasco-expense-offline", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("sync-queue")) {
        db.createObjectStore("sync-queue", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("offline-receipts")) {
        db.createObjectStore("offline-receipts", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Push Notifications
sw.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Notification", body: event.data.text() };
  }

  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.svg",
    badge: "/icons/icon-96.svg",
    tag: data.tag || "default",
    data: data.url ? { url: data.url } : undefined,
    actions: data.actions || [],
    vibrate: [200, 100, 200],
  };

  event.waitUntil(sw.registration.showNotification(data.title, options));
});

// Notification click handling
sw.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/dashboard";

  // Handle action buttons
  if (event.action === "approve" || event.action === "reject") {
    // Navigate to approvals page
    event.waitUntil(
      sw.clients.matchAll({ type: "window" }).then((clients) => {
        for (const client of clients) {
          if (client.url.includes("/dashboard") && "focus" in client) {
            client.navigate("/dashboard/approvals");
            return client.focus();
          }
        }
        return sw.clients.openWindow("/dashboard/approvals");
      })
    );
    return;
  }

  event.waitUntil(
    sw.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("/dashboard") && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return sw.clients.openWindow(url);
    })
  );
});
