import cx from "../../utils/cx";
import styles from "./Spinner.module.css";

// decorative: inside buttons (the button itself reports aria-busy)
export default function Spinner({ size = "md", label = "Loading", decorative = false, className }) {
  return (
    <span
      className={cx(styles.spinner, styles[size], className)}
      role={decorative ? undefined : "status"}
      aria-hidden={decorative || undefined}
    >
      <svg viewBox="0 0 24 24" fill="none">
        <circle className={styles.track} cx="12" cy="12" r="9" strokeWidth="3" />
        <circle className={styles.arc} cx="12" cy="12" r="9" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {!decorative && <span className="visually-hidden">{label}</span>}
    </span>
  );
}
