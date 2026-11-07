import { useId, useLayoutEffect, useRef } from "react";
import { LuCircleHelp, LuTriangleAlert } from "react-icons/lu";
import Button from "./Button";
import cx from "../../utils/cx";
import styles from "./ConfirmDialog.module.css";

// Modal confirmation (destructive by default; tone="primary" for workflow steps), built on the native <dialog>
// (focus is trapped inside, Escape cancels, focus returns to the trigger).
// The Cancel button comes first so it receives focus, not the destructive action.
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  tone = "danger",
  onConfirm,
  onCancel,
  children
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  // Layout effect: open/close before paint, so the panel never flashes empty
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const requestCancel = () => {
    if (!loading) onCancel();
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        requestCancel();
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the <dialog> element itself
        if (event.target === event.currentTarget) requestCancel();
      }}
    >
      {open && (
        <div className={styles.panel}>
          <div className={cx(styles.icon, tone !== "danger" && styles.iconPrimary)} aria-hidden="true">
            {tone === "danger" ? <LuTriangleAlert /> : <LuCircleHelp />}
          </div>
          <div className={styles.content}>
            <h2 id={titleId} className={styles.title}>{title}</h2>
            <div id={descriptionId} className={styles.description}>{description}</div>
            {children}
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={requestCancel} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
