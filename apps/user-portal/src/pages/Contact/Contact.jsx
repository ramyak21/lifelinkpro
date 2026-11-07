import { LuChevronDown } from "react-icons/lu";
import PageHeader from "@lifelink/shared/components/ui/PageHeader";
import SectionHeader from "@lifelink/shared/components/ui/SectionHeader";
import SplitLayout from "../../components/layout/SplitLayout";
import ServiceTile from "../../components/services/ServiceTile";
import EmergencyCallout from "../../components/emergency/EmergencyCallout";
import { SERVICES } from "../../config/services";
import { useDocumentTitle } from "@lifelink/shared/hooks/useDocumentTitle";
import styles from "./Contact.module.css";

// Answers describe how the platform actually works today
const QUESTIONS = [
  {
    question: "How do I get emergency help?",
    answer:
      "If someone's life is in danger, call 112 (emergency services) or 108 (ambulance) first. You can also send an SOS request from the Emergency page with your location and phone number; it is shared with LifeLink Pro coordinators."
  },
  {
    question: "Do I need an account?",
    answer:
      "No. You can send emergency requests, register as a donor or volunteer, and browse hospitals, ambulances and events without signing in. An account gives you a personal dashboard."
  },
  {
    question: "How do I become a blood donor?",
    answer:
      "Fill in the blood donor form with your blood group, age (18–65), phone number and location. Each phone number can be registered once."
  },
  {
    question: "Can I add a hospital, ambulance or event?",
    answer:
      "Yes. Use “Register a hospital”, “Register an ambulance” or “Create event” on those pages. New entries appear in the public lists straight away."
  },
  {
    question: "How do I change or remove my information?",
    answer:
      "Ask a LifeLink Pro administrator. Administrators can review and remove records from the admin dashboard."
  }
];

const BROWSE = [SERVICES.hospitals, SERVICES.ambulances, SERVICES.blood, SERVICES.volunteer];

export default function Contact() {
  useDocumentTitle("Help & contact");

  return (
    <div className="container page">
      <PageHeader
        eyebrow="Help & contact"
        title="How can we help?"
        description="Find answers about using LifeLink Pro, or get urgent help straight away."
      />

      <SplitLayout aside={<EmergencyCallout showRequestLink />} asideLabel="Emergency numbers">
        <section aria-labelledby="faq-title">
          <SectionHeader id="faq-title" title="Common questions" />
          <div className={styles.faq}>
            {QUESTIONS.map(({ question, answer }) => (
              <details key={question} className={styles.item}>
                <summary className={styles.summary}>
                  {question}
                  <LuChevronDown className={styles.chevron} aria-hidden="true" />
                </summary>
                <p className={styles.answer}>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="browse-title" className={styles.browse}>
          <SectionHeader id="browse-title" title="Find a service" />
          <ul className={styles.tiles}>
            {BROWSE.map((service) => (
              <li key={service.id}>
                <ServiceTile service={service} />
              </li>
            ))}
          </ul>
        </section>
      </SplitLayout>
    </div>
  );
}
