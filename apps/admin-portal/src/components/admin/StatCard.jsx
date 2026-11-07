import { Link } from "react-router-dom";
import cx from "@lifelink/shared/utils/cx";
import styles from "./StatCard.module.css";

// Dashboard figure that links to the matching management page
export default function StatCard({ label, value, hint, hintTone, icon: Icon, to }) {
  return (
    <Link to={to} className={styles.card}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        <span className={styles.icon} aria-hidden="true"><Icon /></span>
      </div>
      <span className={styles.value}>{value}</span>
      {hint && <span className={cx(styles.hint, hintTone && styles[hintTone])}>{hint}</span>}
    </Link>
  );
}
