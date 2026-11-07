import {
  LuAmbulance,
  LuArrowRight,
  LuCalendarDays,
  LuCalendarX,
  LuCircleCheck,
  LuDroplet,
  LuHandHeart,
  LuHospital,
  LuMapPin,
  LuRefreshCw,
  LuSiren,
  LuUsers,
  LuUtensils
} from "react-icons/lu";
import { Link } from "react-router-dom";
import PageHeader from "@lifelink/shared/components/ui/PageHeader";
import Card, { CardHeader } from "@lifelink/shared/components/ui/Card";
import Button from "@lifelink/shared/components/ui/Button";
import EmptyState from "@lifelink/shared/components/ui/EmptyState";
import ErrorState from "@lifelink/shared/components/ui/ErrorState";
import Skeleton from "@lifelink/shared/components/ui/Skeleton";
import StatCard from "../../components/admin/StatCard";
import { StatusCell, TimeAgoCell } from "../../components/admin/Cells";
import { adminApi } from "@lifelink/shared/services/lifelink";
import { useAsync } from "@lifelink/shared/hooks/useAsync";
import { usePolling } from "@lifelink/shared/hooks/usePolling";
import { useAuth } from "@lifelink/shared/hooks/useAuth";
import { useDocumentTitle } from "@lifelink/shared/hooks/useDocumentTitle";
import { firstName, formatEventDate, greeting, pluralize } from "@lifelink/shared/utils/format";
import { emergencyStatus } from "@lifelink/shared/utils/status";
import styles from "./AdminDashboard.module.css";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const REFRESH_MS = 60000;

// Turns GET /api/admin/summary (counts computed by MySQL) into the dashboard cards
function summarise(summary) {
  const { users, bloodDonors, foodDonations, volunteers, events, hospitals, ambulances, emergencies } = summary;
  const pending = emergencies.byStatus.Pending;

  return {
    stats: [
      {
        label: "Open emergencies",
        value: emergencies.open,
        hint: pending ? `${pending} waiting for a volunteer` : "None waiting",
        hintTone: pending ? "warning" : undefined,
        icon: LuSiren,
        to: "/manage/emergencies"
      },
      { label: "Blood donors", value: bloodDonors.total, hint: "In the donor registry", icon: LuDroplet, to: "/manage/blood-donors" },
      { label: "Volunteers", value: volunteers.total, hint: "Ready to help", icon: LuHandHeart, to: "/manage/volunteers" },
      { label: "Food donations", value: foodDonations.total, hint: `${foodDonations.available} available`, icon: LuUtensils, to: "/manage/food-donations" },
      { label: "Events", value: events.total, hint: `${events.upcoming} upcoming`, icon: LuCalendarDays, to: "/manage/events" },
      { label: "Hospitals", value: hospitals.total, hint: `${hospitals.withEmergency} with emergency services`, icon: LuHospital, to: "/manage/hospitals" },
      { label: "Ambulances", value: ambulances.total, hint: `${ambulances.available} available`, icon: LuAmbulance, to: "/manage/ambulances" },
      { label: "Users", value: users.total, hint: pluralize(users.admins, "administrator"), icon: LuUsers, to: "/manage/users" }
    ],
    byStatus: Object.entries(emergencies.byStatus).map(([status, count]) => ({ status, count })),
    emergencyTotal: emergencies.total,
    latestRequests: summary.latestEmergencies,
    bloodGroups: BLOOD_GROUPS.map((group) => ({ group, count: bloodDonors.byGroup[group] || 0 })),
    donorTotal: bloodDonors.total,
    upcomingEvents: summary.upcomingEvents.slice(0, 4)
  };
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="visually-hidden">Loading dashboard</span>
      <ul className={styles.stats} aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index} className={styles.skeletonCard}>
            <Skeleton width="50%" />
            <Skeleton width="35%" height="2rem" />
            <Skeleton width="60%" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminDashboard() {
  useDocumentTitle("Admin dashboard");
  const { user } = useAuth();
  const { data, loading, failed, error, reload } = useAsync(adminApi.summary);
  usePolling(reload, REFRESH_MS);

  const header = (
    <PageHeader
      eyebrow="Admin dashboard"
      title={`${greeting()}, ${firstName(user.name)}`}
      description="Here's what's happening across LifeLink Pro. Figures refresh every minute."
      actions={
        data && (
          <Button variant="secondary" leftIcon={<LuRefreshCw />} onClick={reload} loading={loading}>
            Refresh
          </Button>
        )
      }
    />
  );

  if (loading && !data) {
    return (
      <>
        {header}
        <DashboardSkeleton />
      </>
    );
  }

  if (failed && !data) {
    return (
      <>
        {header}
        <ErrorState error={error} title="The dashboard couldn't be loaded" onRetry={reload} />
      </>
    );
  }

  const { stats, byStatus, emergencyTotal, latestRequests, bloodGroups, donorTotal, upcomingEvents } = summarise(data);
  const largestGroup = Math.max(...bloodGroups.map((entry) => entry.count), 1);

  return (
    <>
      {header}

      <section aria-labelledby="totals-title">
        <h2 id="totals-title" className="visually-hidden">Totals</h2>
        <ul className={styles.stats}>
          {stats.map((stat) => (
            <li key={stat.label}>
              <StatCard {...stat} />
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.panels}>
        <Card padding="none" className={styles.requestsPanel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Latest emergency requests</h2>
            <Button to="/manage/emergencies" variant="ghost" size="sm" rightIcon={<LuArrowRight />}>
              View all
            </Button>
          </div>
          {latestRequests.length === 0 ? (
            <EmptyState
              compact
              icon={<LuCircleCheck />}
              title="No emergency requests"
              description="New SOS requests will appear here."
            />
          ) : (
            <ul className={styles.rows}>
              {latestRequests.map((request) => (
                <li key={request.id} className={styles.row}>
                  <div className={styles.rowMain}>
                    <p className={styles.rowTitle}>
                      <Link to={`/emergencies/${request.id}`} className={styles.rowLink}>{request.name}</Link>
                      <span className={styles.rowSubtle}> · {request.emergency_type || "Type not given"}</span>
                    </p>
                    <p className={styles.rowMeta}>
                      <LuMapPin aria-hidden="true" />
                      <span className={styles.rowMetaText}>{request.location}</span>
                      <span aria-hidden="true">·</span>
                      <TimeAgoCell value={request.created_at} />
                    </p>
                  </div>
                  <StatusCell status={emergencyStatus(request.status)} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="md">
          <CardHeader title="Emergencies by status" description={pluralize(emergencyTotal, "request")} as="h2" />
          <ul className={styles.statusList}>
            {byStatus.map(({ status, count }) => (
              <li key={status}>
                <Link to={`/manage/emergencies?status=${encodeURIComponent(status)}`} className={styles.statusRow}>
                  <StatusCell status={emergencyStatus(status)} />
                  <span className={styles.barValue}>{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card padding="md">
          <CardHeader title="Blood donors by group" description={pluralize(donorTotal, "registered donor")} as="h2" />
          {donorTotal === 0 ? (
            <EmptyState compact icon={<LuDroplet />} title="No donors yet" description="Registrations will appear here." />
          ) : (
            <ul className={styles.bars}>
              {bloodGroups.map(({ group, count }) => (
                <li key={group} className={styles.barRow}>
                  <span className={styles.barLabel}>{group}</span>
                  <span className={styles.barTrack} aria-hidden="true">
                    <span className={styles.barFill} style={{ width: `${(count / largestGroup) * 100}%` }} />
                  </span>
                  <span className={styles.barValue}>
                    {count}
                    <span className="visually-hidden"> {count === 1 ? "donor" : "donors"}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="none" className={styles.eventsPanel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Upcoming events</h2>
            <Button to="/manage/events" variant="ghost" size="sm" rightIcon={<LuArrowRight />}>
              View all
            </Button>
          </div>
          {upcomingEvents.length === 0 ? (
            <EmptyState compact icon={<LuCalendarX />} title="No upcoming events" description="Events created by the community will appear here." />
          ) : (
            <ul className={styles.rows}>
              {upcomingEvents.map((event) => (
                <li key={event.id} className={styles.row}>
                  <div className={styles.rowMain}>
                    <p className={styles.rowTitle}>{event.title}</p>
                    <p className={styles.rowMeta}>
                      <LuCalendarDays aria-hidden="true" />
                      <span>{formatEventDate(event.date)}</span>
                      {event.location && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className={styles.rowMetaText}>{event.location}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className={styles.rowCount}>{pluralize(Number(event.participants) || 0, "participant")}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
