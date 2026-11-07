import Alert from "../ui/Alert";
import cx from "../../utils/cx";
import styles from "./FormLayout.module.css";

// Error returned by the API for the whole form (shown above the first section)
export function FormError({ title, children }) {
  if (!children) return null;
  return (
    <Alert tone="danger" title={title} className={styles.formError}>
      {children}
    </Alert>
  );
}

// A titled group of related fields in a two-column grid (one column on phones)
export function FormSection({ title, description, columns = 2, children }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {description && <p className={styles.sectionDescription}>{description}</p>}
      </div>
      <div className={cx(styles.grid, columns === 1 && styles.single)}>{children}</div>
    </section>
  );
}

// Footer row for a form: secondary action(s) then the primary action
export function FormActions({ children }) {
  return <div className={styles.actions}>{children}</div>;
}
