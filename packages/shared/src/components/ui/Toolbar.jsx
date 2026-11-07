import styles from "./Toolbar.module.css";

// Search/filter row above a list. `summary` ("3 hospitals") is announced politely.
export default function Toolbar({ children, summary }) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.controls}>{children}</div>
      {summary !== undefined && (
        <p className={styles.summary} role="status">
          {summary}
        </p>
      )}
    </div>
  );
}
