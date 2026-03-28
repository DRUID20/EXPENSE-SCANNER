import { useEffect, useRef, useCallback } from "react";

/**
 * Polls a callback at a given interval, but only when the tab is visible.
 * Immediately re-fetches when the tab becomes visible again after being hidden.
 * Debounces rapid visibility changes (common on Android when switching apps).
 */
export function usePolling(callback: () => void, intervalMs: number = 15000) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => callbackRef.current(), intervalMs);
  }, [intervalMs]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Start polling immediately
    startPolling();

    const handleVisibility = () => {
      // Debounce rapid visibility changes (Android app-switching flicker)
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (document.visibilityState === "visible") {
        debounceRef.current = setTimeout(() => {
          // Immediately fetch fresh data when tab becomes visible
          callbackRef.current();
          // Restart the interval from now so we don't double-fetch
          startPolling();
        }, 100);
      } else {
        // Stop polling when hidden to save battery/CPU
        stopPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopPolling();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [intervalMs, startPolling, stopPolling]);
}
