import { useEffect, useRef } from "react";
import { LuCircleCheck } from "react-icons/lu";
import styles from "./SuccessPanel.module.css";

// Replaces a form after a successful submission: what happened, a summary,
// and what to do next. Focus moves to the heading so it is announced.
export default function SuccessPanel({ title, message, details = [], actions }) {
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className={styles.panel}>
      <span className={styles.icon} aria-hidden="true">
        <LuCircleCheck />
      </span>
      <h2 className={styles.title} ref={headingRef} tabIndex={-1}>
        {title}
      </h2>
      {message && <p className={styles.message}>{message}</p>}

      {details.length > 0 && (
        <dl className={styles.details}>
          {details
            .filter((detail) => detail.value)
            .map((detail) => (
              <div key={detail.label} className={styles.detail}>
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
        </dl>
      )}

      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
