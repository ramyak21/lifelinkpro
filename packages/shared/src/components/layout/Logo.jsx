import { Link } from "react-router-dom";
import { LuHeartPulse } from "react-icons/lu";
import cx from "../../utils/cx";
import styles from "./Logo.module.css";

// Brand mark. `suffix` adds a label such as "Admin"; `inverted` for dark backgrounds.
export default function Logo({ to = "/", suffix, inverted = false, className, ...rest }) {
  return (
    <Link to={to} className={cx(styles.logo, inverted && styles.inverted, className)} {...rest}>
      <span className={styles.mark} aria-hidden="true">
        <LuHeartPulse />
      </span>
      <span className={styles.name}>LifeLink Pro</span>
      {suffix && <span className={styles.suffix}>{suffix}</span>}
    </Link>
  );
}
