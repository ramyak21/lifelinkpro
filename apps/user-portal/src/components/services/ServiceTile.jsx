import { Link } from "react-router-dom";
import { LuArrowRight } from "react-icons/lu";
import cx from "@lifelink/shared/utils/cx";
import styles from "./ServiceTile.module.css";

// Clickable service entry (icon, name, one-line description)
export default function ServiceTile({ service, layout = "row", headingLevel: Heading = "h3" }) {
  const Icon = service.icon;

  return (
    <Link to={service.to} className={cx(styles.tile, styles[layout], service.urgent && styles.urgent)}>
      <span className={styles.icon} aria-hidden="true">
        <Icon />
      </span>
      <span className={styles.text}>
        <Heading className={styles.title}>{service.title}</Heading>
        <span className={styles.description}>{service.description}</span>
      </span>
      <LuArrowRight className={styles.arrow} aria-hidden="true" />
    </Link>
  );
}
