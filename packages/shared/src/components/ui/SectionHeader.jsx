import styles from "./SectionHeader.module.css";

// Heading for a section within a page
export default function SectionHeader({ eyebrow, title, description, action, as: Heading = "h2", id }) {
  return (
    <div className={styles.header}>
      <div className={styles.text}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <Heading className={styles.title} id={id}>{title}</Heading>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
