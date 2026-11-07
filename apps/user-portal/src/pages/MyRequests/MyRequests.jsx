import { useState } from "react";
import { LuDroplet, LuHandHeart, LuRefreshCw, LuSiren, LuUtensils } from "react-icons/lu";
import PageHeader from "@lifelink/shared/components/ui/PageHeader";
import SectionHeader from "@lifelink/shared/components/ui/SectionHeader";
import Card from "@lifelink/shared/components/ui/Card";
import Badge from "@lifelink/shared/components/ui/Badge";
import Button from "@lifelink/shared/components/ui/Button";
import Alert from "@lifelink/shared/components/ui/Alert";
import EmptyState from "@lifelink/shared/components/ui/EmptyState";
import ErrorState from "@lifelink/shared/components/ui/ErrorState";
import ConfirmDialog from "@lifelink/shared/components/ui/ConfirmDialog";
import { SkeletonCard } from "@lifelink/shared/components/ui/Skeleton";
import EmergencyProgress from "@lifelink/shared/components/emergency/EmergencyProgress";
import EmergencyTimeline from "@lifelink/shared/components/emergency/EmergencyTimeline";
import EventCard from "../../components/events/EventCard";
import { meApi } from "@lifelink/shared/services/lifelink";
import { useAsync } from "@lifelink/shared/hooks/useAsync";
import { usePolling } from "@lifelink/shared/hooks/usePolling";
import { useToast } from "@lifelink/shared/hooks/useToast";
import { useDocumentTitle } from "@lifelink/shared/hooks/useDocumentTitle";
import { getErrorMessage } from "@lifelink/shared/utils/errors";
import { formatDate, formatDateTime } from "@lifelink/shared/utils/format";
import { emergencyStatus } from "@lifelink/shared/utils/status";
import styles from "./MyRequests.module.css";

// Status changes made in the admin portal show up here without a manual refresh
const REFRESH_MS = 30000;

export default function MyRequests() {
  useDocumentTitle("My requests");
  const toast = useToast();
  const { data, loading, failed, error, reload, setData } = useAsync(meApi.requests);
  usePolling(reload, REFRESH_MS);
  const [cancelling, setCancelling] = useState(null);
  const [busy, setBusy] = useState(false);

  const confirmCancel = async () => {
    setBusy(true);
    try {
      await meApi.cancelEmergency(cancelling.id);
      toast.success("Your request was cancelled.");
      setCancelling(null);
      reload();
    } catch (cancelError) {
      toast.error(getErrorMessage(cancelError, "We couldn't cancel this request. Please try again."));
      setCancelling(null);
      reload();
    } finally {
      setBusy(false);
    }
  };

  const updateEvent = (updated) =>
    setData((current) => ({
      ...current,
      events: updated.joined
        ? current.events.map((event) => (event.id === updated.id ? { ...event, ...updated } : event))
        : current.events.filter((event) => event.id !== updated.id)
    }));

  let content;
  if (loading && !data) {
    content = (
      <div className={styles.list}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  } else if (failed && !data) {
    content = <ErrorState error={error} title="Your requests couldn't be loaded" onRetry={reload} />;
  } else {
    const { emergencies, bloodDonations, foodDonations, volunteerProfile, events } = data;
    content = (
      <>
        <section aria-labelledby="emergencies-title" className={styles.section}>
          <SectionHeader id="emergencies-title" title="Emergency requests" description="Newest first. The status updates automatically." />
          {emergencies.length === 0 ? (
            <EmptyState
              icon={<LuSiren />}
              title="You haven't sent an emergency request"
              description="Requests you send while signed in appear here so you can follow them."
              action={<Button to="/emergency" variant="secondary">Request emergency help</Button>}
            />
          ) : (
            <ul className={styles.list}>
              {emergencies.map((request) => {
                const status = emergencyStatus(request.status);
                return (
                  <li key={request.id}>
                    <Card padding="lg" as="article" className={styles.request} aria-labelledby={`request-${request.id}`}>
                      <div className={styles.requestHead}>
                        <div>
                          <h3 id={`request-${request.id}`} className={styles.requestTitle}>
                            {request.emergency_type || "Emergency"} request <span className={styles.ref}>#{request.id}</span>
                          </h3>
                          <p className={styles.meta}>Sent {formatDateTime(request.created_at)} · {request.location}</p>
                        </div>
                        <Badge tone={status.tone} dot>{status.label}</Badge>
                      </div>

                      <EmergencyProgress status={request.status} />
                      {/* EmergencyProgress already says when a request was cancelled */}
                      {request.status !== "Cancelled" && <p className={styles.statusText}>{status.description}.</p>}

                      <dl className={styles.facts}>
                        <div>
                          <dt>Volunteer</dt>
                          <dd>{request.assigned_volunteer_name || "Not assigned yet"}</dd>
                        </div>
                        <div>
                          <dt>Call-back number</dt>
                          <dd>{request.phone}</dd>
                        </div>
                        {request.description && (
                          <div className={styles.wide}>
                            <dt>Details</dt>
                            <dd>{request.description}</dd>
                          </div>
                        )}
                      </dl>

                      <details className={styles.history}>
                        <summary>History ({request.updates.length})</summary>
                        <EmergencyTimeline updates={request.updates} viewer="requester" />
                      </details>

                      {request.status === "Pending" && (
                        <div className={styles.requestActions}>
                          <Button variant="danger-ghost" size="sm" onClick={() => setCancelling(request)}>
                            Cancel request
                          </Button>
                        </div>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="contributions-title" className={styles.section}>
          <SectionHeader id="contributions-title" title="Your contributions" />
          <div className={styles.contributions}>
            <Card padding="md">
              <h3 className={styles.cardTitle}><LuDroplet aria-hidden="true" /> Blood donor registration</h3>
              {bloodDonations.length === 0 ? (
                <p className={styles.muted}>Not registered. <Button to="/blood" variant="ghost" size="sm">Become a donor</Button></p>
              ) : (
                bloodDonations.map((donor) => (
                  <p key={donor.id} className={styles.line}>
                    <Badge tone="primary">{donor.blood_group}</Badge> {donor.location} · since {formatDate(donor.created_at)}
                  </p>
                ))
              )}
            </Card>
            <Card padding="md">
              <h3 className={styles.cardTitle}><LuHandHeart aria-hidden="true" /> Volunteer profile</h3>
              {volunteerProfile ? (
                <>
                  <p className={styles.line}>{volunteerProfile.availability || "Availability not set"} · {volunteerProfile.location || "Location not set"}</p>
                  <Button to="/assignments" variant="secondary" size="sm">My assignments</Button>
                </>
              ) : (
                <p className={styles.muted}>Not registered. <Button to="/volunteer" variant="ghost" size="sm">Volunteer</Button></p>
              )}
            </Card>
            <Card padding="md">
              <h3 className={styles.cardTitle}><LuUtensils aria-hidden="true" /> Food donations</h3>
              {foodDonations.length === 0 ? (
                <p className={styles.muted}>None yet. <Button to="/food" variant="ghost" size="sm">Donate food</Button></p>
              ) : (
                <ul className={styles.plainList}>
                  {foodDonations.map((donation) => (
                    <li key={donation.id} className={styles.line}>
                      {donation.food_type} · {donation.quantity} · {formatDate(donation.created_at)}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </section>

        <section aria-labelledby="joined-title" className={styles.section}>
          <SectionHeader id="joined-title" title="Events you joined" />
          {events.length === 0 ? (
            <p className={styles.muted}>You haven't joined any events. <Button to="/events" variant="ghost" size="sm">Browse events</Button></p>
          ) : (
            <ul className={styles.events}>
              {events.map((event) => (
                <li key={event.id}>
                  <EventCard event={{ ...event, joined: true }} compact onJoined={updateEvent} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </>
    );
  }

  return (
    <div className="container page">
      <PageHeader
        backTo="/dashboard"
        backLabel="Dashboard"
        eyebrow="Account"
        title="My requests"
        description="Follow your emergency requests and see what you've registered with LifeLink Pro."
        actions={
          data && (
            <Button variant="secondary" leftIcon={<LuRefreshCw />} onClick={reload} loading={loading}>
              Refresh
            </Button>
          )
        }
      />
      <Alert tone="info" className={styles.note}>
        Only requests sent while you were signed in are linked to your account.
      </Alert>

      {content}

      <ConfirmDialog
        open={Boolean(cancelling)}
        title="Cancel this emergency request?"
        description={
          cancelling && (
            <p>
              Request <strong>#{cancelling.id}</strong> will be withdrawn and coordinators will stop acting on it.
              If someone's life is in danger, call 112 or 108.
            </p>
          )
        }
        confirmLabel="Cancel request"
        cancelLabel="Keep request"
        loading={busy}
        onConfirm={confirmCancel}
        onCancel={() => setCancelling(null)}
      />
    </div>
  );
}
