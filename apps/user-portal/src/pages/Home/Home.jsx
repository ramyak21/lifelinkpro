import { LuArrowRight, LuClipboardList, LuHeartPulse, LuMousePointerClick, LuUsers } from "react-icons/lu";
import Button from "@lifelink/shared/components/ui/Button";
import SectionHeader from "@lifelink/shared/components/ui/SectionHeader";
import ServiceTile from "../../components/services/ServiceTile";
import EmergencyCallout from "../../components/emergency/EmergencyCallout";
import UpcomingEvents from "../../components/events/UpcomingEvents";
import { SERVICE_GROUPS } from "../../config/services";
import { useAuth } from "@lifelink/shared/hooks/useAuth";
import { useDocumentTitle } from "@lifelink/shared/hooks/useDocumentTitle";
import cx from "@lifelink/shared/utils/cx";
import styles from "./Home.module.css";

const STEPS = [
  {
    icon: LuMousePointerClick,
    title: "Choose a service",
    text: "Request emergency help, find a hospital or ambulance, or pick a way to give help."
  },
  {
    icon: LuClipboardList,
    title: "Share a few details",
    text: "Short forms ask only for what's needed — usually your name, phone number and location."
  },
  {
    icon: LuUsers,
    title: "Coordinators take it from there",
    text: "Your request or registration is shared with the LifeLink Pro coordinators who manage the platform."
  }
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  useDocumentTitle(null);

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={cx("container", styles.heroInner)}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>
              <LuHeartPulse aria-hidden="true" />
              Community services platform
            </p>
            <h1 id="hero-title" className={styles.heroTitle}>
              Help is closer when communities connect.
            </h1>
            <p className={styles.heroLead}>
              LifeLink Pro brings emergency requests, blood and food donations, volunteers, hospitals
              and ambulances together in one place — so people can find help, and offer it, quickly.
            </p>
            <div className={styles.heroActions}>
              <Button href="#services" size="lg" rightIcon={<LuArrowRight />}>
                Explore services
              </Button>
              {isAuthenticated ? (
                <Button to="/dashboard" variant="secondary" size="lg">Go to your dashboard</Button>
              ) : (
                <Button to="/register" variant="secondary" size="lg">Create an account</Button>
              )}
            </div>
          </div>

          <EmergencyCallout showRequestLink className={styles.heroCallout} />
        </div>
      </section>

      {/* ---------- Services ---------- */}
      <section id="services" className={styles.section} aria-labelledby="services-title">
        <div className="container">
          <SectionHeader
            id="services-title"
            eyebrow="Services"
            title="What would you like to do?"
            description="Everything on LifeLink Pro falls into two groups: getting help, and helping others."
          />
          <div className={styles.groups}>
            {SERVICE_GROUPS.map((group) => (
              <div key={group.id} className={styles.group}>
                <h3 className={styles.groupTitle}>{group.title}</h3>
                <p className={styles.groupDescription}>{group.description}</p>
                <ul className={styles.serviceList}>
                  {group.services.map((service) => (
                    <li key={service.id}>
                      <ServiceTile service={service} headingLevel="h4" />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Events (live data) ---------- */}
      <section className={cx(styles.section, styles.sectionAlt)} aria-labelledby="events-title">
        <div className="container">
          <SectionHeader
            id="events-title"
            eyebrow="Community events"
            title="Upcoming community events"
            description="Drives, camps and awareness programmes organised through LifeLink Pro."
            action={<Button to="/events" variant="outline" rightIcon={<LuArrowRight />}>All events</Button>}
          />
          <UpcomingEvents limit={3} />
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className={styles.section} aria-labelledby="how-title">
        <div className="container">
          <SectionHeader id="how-title" eyebrow="How it works" title="Three steps, no paperwork" />
          <ol className={styles.steps}>
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className={styles.step}>
                <span className={styles.stepIcon} aria-hidden="true"><Icon /></span>
                <p className={styles.stepNumber}>Step {index + 1}</p>
                <h3 className={styles.stepTitle}>{title}</h3>
                <p className={styles.stepText}>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Account call to action ---------- */}
      {!isAuthenticated && (
        <section className={styles.ctaSection} aria-labelledby="cta-title">
          <div className="container">
            <div className={styles.cta}>
              <div className={styles.ctaCopy}>
                <h2 id="cta-title" className={styles.ctaTitle}>Keep every service one tap away</h2>
                <p className={styles.ctaText}>
                  Create a free account to get a personal dashboard with quick access to every service
                  and upcoming events. You can still use every service without one.
                </p>
              </div>
              <div className={styles.ctaActions}>
                <Button to="/register" size="lg">Create an account</Button>
                <Button to="/login" variant="secondary" size="lg">Sign in</Button>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
