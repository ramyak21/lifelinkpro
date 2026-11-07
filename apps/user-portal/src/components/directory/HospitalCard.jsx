import { LuHospital, LuMapPin, LuPhone, LuStethoscope } from "react-icons/lu";
import Badge from "@lifelink/shared/components/ui/Badge";
import Button from "@lifelink/shared/components/ui/Button";
import { hospitalEmergency } from "@lifelink/shared/utils/status";
import { telHref } from "@lifelink/shared/utils/format";
import styles from "./DirectoryCard.module.css";

// Hospital directory entry (GET /api/hospital)
export default function HospitalCard({ hospital }) {
  const emergency = hospitalEmergency(hospital.emergency_available);
  // Add the city/area unless the street address already includes it
  const addressHasLocation =
    hospital.address && hospital.location &&
    hospital.address.toLowerCase().includes(hospital.location.toLowerCase());
  const place = addressHasLocation
    ? hospital.address
    : [hospital.address, hospital.location].filter(Boolean).join(", ");

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon} aria-hidden="true"><LuHospital /></span>
        <div className={styles.heading}>
          <h3 className={styles.title}>{hospital.name}</h3>
          {emergency && <Badge tone={emergency.tone} dot>{emergency.label}</Badge>}
        </div>
      </div>

      <ul className={styles.meta}>
        <li>
          <LuMapPin aria-hidden="true" />
          <span>{place || "Address not provided"}</span>
        </li>
        {hospital.services && (
          <li>
            <LuStethoscope aria-hidden="true" />
            <span>{hospital.services}</span>
          </li>
        )}
        {hospital.phone && (
          <li>
            <LuPhone aria-hidden="true" />
            <span>{hospital.phone}</span>
          </li>
        )}
      </ul>

      {hospital.phone && (
        <div className={styles.footer}>
          <Button
            href={telHref(hospital.phone)}
            variant="secondary"
            size="sm"
            leftIcon={<LuPhone />}
            aria-label={`Call ${hospital.name}`}
          >
            Call
          </Button>
        </div>
      )}
    </article>
  );
}
