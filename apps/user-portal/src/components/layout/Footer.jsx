import { Link } from "react-router-dom";
import Logo from "@lifelink/shared/components/layout/Logo";
import { EMERGENCY_NUMBERS, SERVICE_GROUPS } from "../../config/services";
import { useAuth } from "@lifelink/shared/hooks/useAuth";
import styles from "./Footer.module.css";

// Copyright year, read once when the app loads
const YEAR = new Date().getFullYear();

export default function Footer() {
  const { isAuthenticated } = useAuth();

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.brand}>
            <Logo inverted />
            <p className={styles.tagline}>
              LifeLink Pro connects people who need help with the donors, volunteers and services
              that can provide it.
            </p>
          </div>

          {SERVICE_GROUPS.map((group) => (
            <nav key={group.id} aria-label={group.title}>
              <h2 className={styles.heading}>{group.title}</h2>
              <ul className={styles.links}>
                {group.services.map((service) => (
                  <li key={service.to}>
                    <Link to={service.to}>{service.title}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <nav aria-label="LifeLink Pro">
            <h2 className={styles.heading}>LifeLink Pro</h2>
            <ul className={styles.links}>
              <li><Link to="/events">Community events</Link></li>
              <li><Link to="/contact">Help &amp; contact</Link></li>
              {isAuthenticated ? (
                <li><Link to="/dashboard">Your dashboard</Link></li>
              ) : (
                <>
                  <li><Link to="/login">Sign in</Link></li>
                  <li><Link to="/register">Create account</Link></li>
                </>
              )}
            </ul>
          </nav>
        </div>

        <div className={styles.bottom}>
          <p>© {YEAR} LifeLink Pro</p>
          <p>
            In an emergency, call{" "}
            {EMERGENCY_NUMBERS.map((entry, index) => (
              <span key={entry.number}>
                {index > 0 && " or "}
                <a href={`tel:${entry.number}`} className={styles.phone}>{entry.number}</a>
                {" "}({entry.label.toLowerCase()})
              </span>
            ))}
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
