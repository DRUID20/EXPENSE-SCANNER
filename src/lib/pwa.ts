// Service Worker Registration & PWA Utilities

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    // Check for updates every 30 minutes
    setInterval(() => {
      registration.update();
    }, 30 * 60 * 1000);

    return registration;
  } catch (error) {
    console.error("SW registration failed:", error);
    return null;
  }
}

// IndexedDB helpers for offline queue
const DB_NAME = "gasco-expense-offline";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
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

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
}

export async function addToSyncQueue(request: Omit<QueuedRequest, "id" | "timestamp">): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("sync-queue", "readwrite");
  const store = tx.objectStore("sync-queue");
  store.add({
    ...request,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
  });

  // Request background sync if available
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    const reg = await navigator.serviceWorker.ready;
    try {
      await (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register("sync-expenses");
    } catch {
      // Sync not supported, will retry manually
    }
  }
}

export async function getSyncQueueCount(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction("sync-queue", "readonly");
    const store = tx.objectStore("sync-queue");
    return new Promise((resolve) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

export async function saveOfflineReceipt(receipt: {
  imageData: string;
  fileName: string;
}): Promise<string> {
  const db = await openDB();
  const tx = db.transaction("offline-receipts", "readwrite");
  const store = tx.objectStore("offline-receipts");
  const id = `receipt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  store.add({ id, ...receipt, timestamp: Date.now() });
  return id;
}

export async function getOfflineReceipts(): Promise<Array<{ id: string; imageData: string; fileName: string; timestamp: number }>> {
  try {
    const db = await openDB();
    const tx = db.transaction("offline-receipts", "readonly");
    const store = tx.objectStore("offline-receipts");
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function deleteOfflineReceipt(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("offline-receipts", "readwrite");
  tx.objectStore("offline-receipts").delete(id);
}

// Push Notification helpers
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  return Notification.permission === "denied" ? "denied" : await Notification.requestPermission();
}

export function showLocalNotification(title: string, options?: NotificationOptions): void {
  if (Notification.permission === "granted") {
    navigator.serviceWorker?.ready.then((reg) => {
      reg.showNotification(title, {
        icon: "/icons/icon-192.svg",
        badge: "/icons/icon-96.svg",
        ...options,
      });
    });
  }
}

// Check if app is installed
export function isAppInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Online/Offline status
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}
