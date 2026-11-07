import { LuInbox } from "react-icons/lu";
import cx from "../../utils/cx";
import styles from "./StateMessage.module.css";

// Shown when a list has no records. Only pass an action the viewer can perform.
export default function EmptyState({ icon = <LuInbox />, title, description, action, compact = false, as: Heading = "h3" }) {
  return (
    <div className={cx(styles.state, compact && styles.compact)}>
      <div className={styles.icon} aria-hidden="true">{icon}</div>
      <Heading className={styles.title}>{title}</Heading>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
