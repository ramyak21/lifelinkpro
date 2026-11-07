import cx from "../../utils/cx";
import styles from "./Badge.module.css";

// Small status label. Always carries text, so meaning never relies on colour alone.
// tone: "neutral" | "primary" | "success" | "warning" | "danger"
export default function Badge({ tone = "neutral", icon, dot = false, className, children }) {
  return (
    <span className={cx(styles.badge, styles[tone], className)}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
