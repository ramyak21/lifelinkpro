import styles from "./SplitLayout.module.css";

// Main content with a supporting side panel (stacks below on smaller screens)
export default function SplitLayout({ children, aside, asideLabel = "More information" }) {
  return (
    <div className={styles.split}>
      <div className={styles.primary}>{children}</div>
      {aside && (
        <aside className={styles.aside} aria-label={asideLabel}>
          {aside}
        </aside>
      )}
    </div>
  );
}
