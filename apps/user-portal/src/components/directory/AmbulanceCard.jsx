import { LuAmbulance, LuMapPin, LuPhone, LuUserRound } from "react-icons/lu";
import Badge from "@lifelink/shared/components/ui/Badge";
import Button from "@lifelink/shared/components/ui/Button";
import { ambulanceStatus } from "@lifelink/shared/utils/status";
import { telHref } from "@lifelink/shared/utils/format";
import styles from "./DirectoryCard.module.css";

// Ambulance directory entry (GET /api/ambulance)
export default function AmbulanceCard({ ambulance }) {
  const status = ambulanceStatus(ambulance.status);

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon} aria-hidden="true"><LuAmbulance /></span>
        <div className={styles.heading}>
          <h3 className={styles.title}>
            {ambulance.vehicle_number ? (
              <span className={styles.plate}>{ambulance.vehicle_number}</span>
            ) : (
              "Vehicle number not listed"
            )}
          </h3>
          <Badge tone={status.tone} dot>{status.label}</Badge>
        </div>
      </div>

      <ul className={styles.meta}>
        <li>
          <LuUserRound aria-hidden="true" />
          <span>Driver: {ambulance.name}</span>
        </li>
        <li>
          <LuMapPin aria-hidden="true" />
          <span>{ambulance.location}</span>
        </li>
        <li>
          <LuPhone aria-hidden="true" />
          <span>{ambulance.phone}</span>
        </li>
      </ul>

      <div className={styles.footer}>
        <Button
          href={telHref(ambulance.phone)}
          variant={status.key === "available" ? "primary" : "secondary"}
          size="sm"
          leftIcon={<LuPhone />}
          aria-label={`Call ${ambulance.name}, driver of ${ambulance.vehicle_number || "this ambulance"}`}
        >
          Call driver
        </Button>
      </div>
    </article>
  );
}
