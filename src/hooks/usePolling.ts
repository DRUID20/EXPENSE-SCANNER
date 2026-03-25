import { useEffect, useRef } from "react";

/**
 * Polls a callback at a given interval, but only when the tab is visible.
 * Immediately re-fetches when the tab becomes visible again after being hidden.
 */
export function usePolling(callback: () => void, intervalMs: number = 15000) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const poll = () => callbackRef.current();

    const interval = setInterval(poll, intervalMs);

    // Re-fetch immediately when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        poll();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [intervalMs]);
}
