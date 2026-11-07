import { useCallback, useMemo, useRef, useState } from "react";
import { LuCircleAlert, LuCircleCheck, LuInfo, LuX } from "react-icons/lu";
import { ToastContext } from "../../context/toastContext";
import cx from "../../utils/cx";
import styles from "./Toast.module.css";

const ICONS = { success: LuCircleCheck, danger: LuCircleAlert, info: LuInfo };
const MAX_VISIBLE = 3;

let nextId = 1;

// Short-lived feedback messages ("Event deleted."). The live region is always
// rendered so screen readers announce new toasts.
export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const show = useCallback(
    (tone, message, { title, duration = 5000 } = {}) => {
      const id = nextId++;
      setToasts((list) => [...list.slice(-(MAX_VISIBLE - 1)), { id, tone, title, message }]);
      timers.current.set(id, setTimeout(() => dismiss(id), duration));
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      success: (message, options) => show("success", message, options),
      error: (message, options) => show("danger", message, options),
      info: (message, options) => show("info", message, options),
      dismiss
    }),
    [show, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.region} aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <div
              key={toast.id}
              className={cx(styles.toast, styles[toast.tone])}
              role={toast.tone === "danger" ? "alert" : "status"}
            >
              <Icon className={styles.icon} aria-hidden="true" />
              <div className={styles.body}>
                {toast.title && <p className={styles.title}>{toast.title}</p>}
                <p className={styles.message}>{toast.message}</p>
              </div>
              <button
                type="button"
                className={styles.close}
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
              >
                <LuX aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
