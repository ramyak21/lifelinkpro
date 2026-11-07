import { LuPhone, LuSiren } from "react-icons/lu";
import Button from "@lifelink/shared/components/ui/Button";
import { EMERGENCY_NUMBERS } from "../../config/services";
import cx from "@lifelink/shared/utils/cx";
import styles from "./EmergencyCallout.module.css";

// "Call 112 / 108" panel. With showRequestLink it also offers the SOS form.
export default function EmergencyCallout({ title = "In a life-threatening emergency", showRequestLink = false, className }) {
  return (
    <section className={cx(styles.callout, className)} aria-label="Emergency phone numbers">
      <div className={styles.header}>
        <span className={styles.icon} aria-hidden="true">
          <LuSiren />
        </span>
        <div>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.text}>Call emergency services first — a phone call is always the fastest way to get help.</p>
        </div>
      </div>

      <ul className={styles.numbers}>
        {EMERGENCY_NUMBERS.map((entry) => (
          <li key={entry.number}>
            <a href={`tel:${entry.number}`} className={styles.number}>
              <LuPhone aria-hidden="true" />
              <span className={styles.numberValue}>{entry.number}</span>
              <span className={styles.numberLabel}>{entry.label}</span>
            </a>
          </li>
        ))}
      </ul>

      {showRequestLink && (
        <Button to="/emergency" variant="danger" fullWidth leftIcon={<LuSiren />}>
          Send an SOS request
        </Button>
      )}
    </section>
  );
}
