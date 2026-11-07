import { useContext } from "react";
import { ToastContext } from "../context/toastContext";

// toast.success("Saved."), toast.error("Could not delete."), toast.info("...")
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return context;
}
