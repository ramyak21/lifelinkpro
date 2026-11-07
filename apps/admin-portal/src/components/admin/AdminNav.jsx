import { NavLink } from "react-router-dom";
import { ADMIN_NAV } from "./adminResources";
import cx from "@lifelink/shared/utils/cx";
import styles from "./AdminNav.module.css";

// Sidebar navigation for the admin area (also used inside the mobile drawer)
export default function AdminNav({ onNavigate }) {
  return (
    <nav aria-label="Admin" className={styles.nav}>
      {ADMIN_NAV.map((section) => (
        <div key={section.title} className={styles.section}>
          <h2 className={styles.heading}>{section.title}</h2>
          <ul className={styles.list}>
            {section.items.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) => cx(styles.link, isActive && styles.active)}
                  onClick={onNavigate}
                >
                  <Icon aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
