import { formatDateTime } from "../../utils/format";
import styles from "./EmergencyTimeline.module.css";

const ROLE_LABEL = {
  admin: "a coordinator",
  volunteer: "the volunteer",
  requester: "the requester",
  public: "the requester"
};

const describe = (update, { viewer }) => {
  const who = viewer === "requester" && update.actor_role === "requester"
    ? "you"
    : update.actor_name && viewer === "admin"
      ? update.actor_name
      : ROLE_LABEL[update.actor_role] || "LifeLink Pro";

  switch (update.action) {
    case "created":
      return "Request received";
    case "volunteer_assigned":
      return `Volunteer assigned: ${update.volunteer_name || "a volunteer"} (by ${who})`;
    case "volunteer_unassigned":
      return `Volunteer removed: ${update.volunteer_name || "a volunteer"} (by ${who})`;
    case "status_changed":
      return `${update.from_status ? `${update.from_status} → ` : ""}${update.to_status} (by ${who})`;
    default:
      return update.action;
  }
};

// History of a request (emergency_updates), oldest first.
// viewer: "admin" shows actor names; "requester" / "volunteer" show roles only.
export default function EmergencyTimeline({ updates = [], viewer = "requester" }) {
  if (updates.length === 0) return <p className={styles.empty}>No updates yet.</p>;

  return (
    <ol className={styles.timeline}>
      {updates.map((update) => (
        <li key={update.id} className={styles.item}>
          <span className={styles.dot} aria-hidden="true" />
          <div>
            <p className={styles.text}>{describe(update, { viewer })}</p>
            {update.note && <p className={styles.note}>“{update.note}”</p>}
            <time className={styles.time} dateTime={update.created_at}>{formatDateTime(update.created_at)}</time>
          </div>
        </li>
      ))}
    </ol>
  );
}
