import { Link } from "react-router-dom";
import { LuArrowLeft } from "react-icons/lu";
import Logo from "./Logo";
import styles from "./AuthLayout.module.css";

// Split screen for sign-in and registration: brand panel + form.
// Each portal supplies its own brand copy (brandTitle, points) and logo suffix.
// points: [{ icon: Component, text }]; backTo/backLabel: optional link above the form
export default function AuthLayout({
  brandTitle,
  points = [],
  logoSuffix,
  backTo = "/",
  backLabel = "Back to home",
  title,
  description,
  footer,
  children
}) {
  return (
    <div className={styles.shell}>
      <a href="#main" className="skip-link">Skip to main content</a>

      <section className={styles.brand} aria-label="About LifeLink Pro">
        <Logo inverted suffix={logoSuffix} />
        <div className={styles.brandBody}>
          <h2 className={styles.brandTitle}>{brandTitle}</h2>
          <ul className={styles.points}>
            {points.map(({ icon: Icon, text }) => (
              <li key={text}>
                <span className={styles.pointIcon} aria-hidden="true"><Icon /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.brandNote}>In a life-threatening emergency, call 112 or 108.</p>
      </section>

      <main id="main" tabIndex={-1} className={styles.main}>
        <div className={styles.top}>
          <Logo className={styles.mobileLogo} suffix={logoSuffix} />
          {backTo && (
            <Link to={backTo} className={styles.back}>
              <LuArrowLeft aria-hidden="true" />
              {backLabel}
            </Link>
          )}
        </div>

        <div className={styles.formArea}>
          <h1 className={styles.title}>{title}</h1>
          {description && <p className={styles.description}>{description}</p>}
          <div className={styles.content}>{children}</div>
          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      </main>
    </div>
  );
}
