import { useEffect } from "react";

// Calls onDismiss(reason) when the user presses Escape ("escape") or clicks
// outside `ref` ("outside") while open. Used by dropdown menus.
export function useDismiss(ref, open, onDismiss) {
  useEffect(() => {
    if (!open) return undefined;

    const handlePointer = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onDismiss("outside");
    };
    const handleKey = (event) => {
      if (event.key === "Escape") onDismiss("escape");
    };

    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [ref, open, onDismiss]);
}
