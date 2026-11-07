import cx from "../../utils/cx";
import styles from "./Card.module.css";

// Surface container. padding: "none" | "sm" | "md" | "lg"
export default function Card({ as: Tag = "div", padding = "md", className, children, ...rest }) {
  return (
    <Tag className={cx(styles.card, styles[`padding-${padding}`], className)} {...rest}>
      {children}
    </Tag>
  );
}

// Title row for a card: heading, optional description and action
export function CardHeader({ title, description, action, as: Heading = "h2", id }) {
  return (
    <div className={styles.header}>
      <div className={styles.headerText}>
        <Heading className={styles.title} id={id}>{title}</Heading>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
