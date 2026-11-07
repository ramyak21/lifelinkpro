import { LuArrowRight, LuShieldCheck, LuUserRound } from "react-icons/lu";
import PageHeader from "@lifelink/shared/components/ui/PageHeader";
import SectionHeader from "@lifelink/shared/components/ui/SectionHeader";
import Card, { CardHeader } from "@lifelink/shared/components/ui/Card";
import Badge from "@lifelink/shared/components/ui/Badge";
import Button from "@lifelink/shared/components/ui/Button";
import SplitLayout from "../../components/layout/SplitLayout";
import ServiceTile from "../../components/services/ServiceTile";
import EmergencyCallout from "../../components/emergency/EmergencyCallout";
import UpcomingEvents from "../../components/events/UpcomingEvents";
import RequestsSummary from "../../components/requests/RequestsSummary";
import { SERVICE_GROUPS } from "../../config/services";
import { useAuth } from "@lifelink/shared/hooks/useAuth";
import { useDocumentTitle } from "@lifelink/shared/hooks/useDocumentTitle";
import { firstName, greeting } from "@lifelink/shared/utils/format";
import { roleBadge } from "@lifelink/shared/utils/status";
import { ADMIN_PORTAL_URL } from "../../config/portals";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
  useDocumentTitle("Your dashboard");
  const { user, isAdmin } = useAuth();
  const role = roleBadge(user.role);

  return (
    <div className="container page">
      <PageHeader
        eyebrow="Your dashboard"
        title={`${greeting()}, ${firstName(user.name)}`}
        description="Pick up where you need to — every LifeLink Pro service is one click away."
        actions={
          isAdmin && ADMIN_PORTAL_URL && (
            <Button href={ADMIN_PORTAL_URL} leftIcon={<LuShieldCheck />}>
              Open admin portal
            </Button>
          )
        }
      />

      <SplitLayout
        asideLabel="Emergency help and your account"
        aside={
          <>
            <EmergencyCallout title="Need urgent help?" showRequestLink />
            <RequestsSummary />
            <Card padding="md">
              <CardHeader
                title="Your account"
                as="h2"
                action={<Badge tone={role.tone}>{role.label}</Badge>}
              />
              <dl className={styles.account}>
                <div>
                  <dt>Name</dt>
                  <dd>{user.name}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{user.email}</dd>
                </div>
              </dl>
              <Button to="/profile" variant="secondary" fullWidth leftIcon={<LuUserRound />} className={styles.profileButton}>
                View profile
              </Button>
            </Card>
          </>
        }
      >
        <section aria-labelledby="quick-actions-title" className={styles.section}>
          <SectionHeader id="quick-actions-title" title="Quick actions" />
          <div className={styles.groups}>
            {SERVICE_GROUPS.map((group) => (
              <div key={group.id}>
                <h3 className={styles.groupTitle}>{group.title}</h3>
                <ul className={styles.tiles}>
                  {group.services.map((service) => (
                    <li key={service.id}>
                      <ServiceTile service={service} headingLevel="h4" />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="events-title" className={styles.section}>
          <SectionHeader
            id="events-title"
            title="Upcoming events"
            action={<Button to="/events" variant="ghost" size="sm" rightIcon={<LuArrowRight />}>All events</Button>}
          />
          <UpcomingEvents limit={4} min="280px" />
        </section>
      </SplitLayout>
    </div>
  );
}
