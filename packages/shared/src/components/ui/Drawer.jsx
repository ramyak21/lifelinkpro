import { useLayoutEffect, useRef } from "react";
import { LuX } from "react-icons/lu";
import IconButton from "./IconButton";
import cx from "../../utils/cx";
import styles from "./Drawer.module.css";

// Side sheet built on the native <dialog>: traps focus, closes on Escape or a
// backdrop click, and makes the page behind it inert.
export default function Drawer({ open, onClose, title, side = "right", size, header, closeLabel = "Close menu", children }) {
  const dialogRef = useRef(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={cx(styles.drawer, styles[side], size === "wide" && styles.wide)}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.panel}>
        <div className={styles.header}>
          {header || <span className={styles.title}>{title}</span>}
          <IconButton label={closeLabel} icon={<LuX />} onClick={onClose} />
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </dialog>
  );
}
