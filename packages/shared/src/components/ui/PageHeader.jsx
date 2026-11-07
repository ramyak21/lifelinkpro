import { Link } from "react-router-dom";
import { LuArrowLeft } from "react-icons/lu";
import cx from "../../utils/cx";
import styles from "./PageHeader.module.css";

// Top of every page: optional back link, eyebrow (section), h1, description, actions
export default function PageHeader({ eyebrow, title, description, actions, backTo, backLabel = "Back", tone, className }) {
  return (
    <header className={cx(styles.header, tone && styles[tone], className)}>
      {backTo && (
        <Link to={backTo} className={styles.back}>
          <LuArrowLeft aria-hidden="true" />
          {backLabel}
        </Link>
      )}
      <div className={styles.row}>
        <div className={styles.text}>
          {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
          <h1 className={styles.title}>{title}</h1>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
}
