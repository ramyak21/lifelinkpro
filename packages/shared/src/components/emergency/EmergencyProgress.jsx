import { LuCheck, LuX } from "react-icons/lu";
import cx from "../../utils/cx";
import { EMERGENCY_STEPS } from "../../utils/status";
import styles from "./EmergencyProgress.module.css";

// Step tracker: Pending → Accepted → In Progress → Resolved (or Cancelled)
export default function EmergencyProgress({ status }) {
  if (status === "Cancelled") {
    return (
      <p className={styles.cancelled}>
        <LuX aria-hidden="true" /> This request was cancelled.
      </p>
    );
  }
  const current = Math.max(0, EMERGENCY_STEPS.indexOf(status));

  return (
    <ol className={styles.steps} aria-label="Request progress">
      {EMERGENCY_STEPS.map((step, index) => {
        const done = index < current || (index === current && step === "Resolved");
        const active = index === current && !done;
        return (
          <li
            key={step}
            className={cx(styles.step, done && styles.done, active && styles.active)}
            aria-current={active ? "step" : undefined}
          >
            <span className={styles.marker} aria-hidden="true">
              {done ? <LuCheck /> : index + 1}
            </span>
            <span className={styles.label}>
              {step}
              <span className="visually-hidden">{done ? " (done)" : active ? " (current)" : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
