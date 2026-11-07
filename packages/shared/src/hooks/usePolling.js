import { useEffect } from "react";

// Calls `refresh` every `intervalMs` while the page is visible (and once when the
// tab becomes visible again), so open screens pick up changes made elsewhere —
// e.g. a request status changed in the admin portal. Plain HTTP polling: no
// WebSocket/SSE infrastructure. Pass a stable `refresh` (e.g. useAsync's reload).
export function usePolling(refresh, intervalMs, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const tick = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh, intervalMs, enabled]);
}
