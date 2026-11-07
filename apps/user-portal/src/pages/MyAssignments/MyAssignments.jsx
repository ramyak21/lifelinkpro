import { useState } from "react";
import { LuHandHeart, LuPhone, LuRefreshCw } from "react-icons/lu";
import PageHeader from "@lifelink/shared/components/ui/PageHeader";
import Card from "@lifelink/shared/components/ui/Card";
import Badge from "@lifelink/shared/components/ui/Badge";
import Button from "@lifelink/shared/components/ui/Button";
import EmptyState from "@lifelink/shared/components/ui/EmptyState";
import ErrorState from "@lifelink/shared/components/ui/ErrorState";
import ConfirmDialog from "@lifelink/shared/components/ui/ConfirmDialog";
import TextAreaField from "@lifelink/shared/components/form/TextAreaField";
import { SkeletonCard } from "@lifelink/shared/components/ui/Skeleton";
import EmergencyProgress from "@lifelink/shared/components/emergency/EmergencyProgress";
import EmergencyTimeline from "@lifelink/shared/components/emergency/EmergencyTimeline";
import { meApi } from "@lifelink/shared/services/lifelink";
import { useAsync } from "@lifelink/shared/hooks/useAsync";
import { usePolling } from "@lifelink/shared/hooks/usePolling";
import { useToast } from "@lifelink/shared/hooks/useToast";
import { useDocumentTitle } from "@lifelink/shared/hooks/useDocumentTitle";
import { getErrorMessage } from "@lifelink/shared/utils/errors";
import { formatDateTime, telHref } from "@lifelink/shared/utils/format";
import { emergencyStatus } from "@lifelink/shared/utils/status";
import styles from "../MyRequests/MyRequests.module.css";

const REFRESH_MS = 30000;

// What the assigned volunteer may do next (the API enforces the same rules)
const NEXT_STEP = {
  Accepted: { status: "In Progress", label: "Start helping", confirm: "Let the coordinators know you're on your way?" },
  "In Progress": { status: "Resolved", label: "Mark resolved", confirm: "Mark this request as resolved? This can't be undone." }
};

export default function MyAssignments() {
  useDocumentTitle("My assignments");
  const toast = useToast();
  const { data, loading, failed, error, reload } = useAsync(meApi.assignments);
  usePolling(reload, REFRESH_MS);
  const [pending, setPending] = useState(null); // { request, step }
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await meApi.updateAssignment(pending.request.id, pending.step.status, note.trim() || undefined);
      toast.success(`Request #${pending.request.id} is now ${pending.step.status}.`);
    } catch (updateError) {
      toast.error(getErrorMessage(updateError, "We couldn't update this request. Please try again."));
    } finally {
      setBusy(false);
      setPending(null);
      setNote("");
      reload();
    }
  };

  let content;
  if (loading && !data) {
    content = <SkeletonCard />;
  } else if (failed && !data) {
    content = <ErrorState error={error} title="Your assignments couldn't be loaded" onRetry={reload} />;
  } else if (!data.volunteerProfile) {
    content = (
      <EmptyState
        icon={<LuHandHeart />}
        title="You're not registered as a volunteer"
        description="Register as a volunteer while signed in. Coordinators can then assign emergency requests to you, and they appear here."
        action={<Button to="/volunteer">Register as a volunteer</Button>}
      />
    );
  } else if (data.assignments.length === 0) {
    content = (
      <EmptyState
        icon={<LuHandHeart />}
        title="No assignments yet"
        description="When a coordinator assigns an emergency request to you, it appears here with the requester's contact details."
      />
    );
  } else {
    content = (
      <ul className={styles.list}>
        {data.assignments.map((request) => {
          const status = emergencyStatus(request.status);
          const step = NEXT_STEP[request.status];
          return (
            <li key={request.id}>
              <Card padding="lg" as="article" className={styles.request} aria-labelledby={`assignment-${request.id}`}>
                <div className={styles.requestHead}>
                  <div>
                    <h2 id={`assignment-${request.id}`} className={styles.requestTitle}>
                      {request.emergency_type || "Emergency"} — {request.name} <span className={styles.ref}>#{request.id}</span>
                    </h2>
                    <p className={styles.meta}>Received {formatDateTime(request.created_at)}</p>
                  </div>
                  <Badge tone={status.tone} dot>{status.label}</Badge>
                </div>
                <EmergencyProgress status={request.status} />
                <dl className={styles.facts}>
                  <div>
                    <dt>Location</dt>
                    <dd>{request.location}</dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd><a href={telHref(request.phone)}>{request.phone}</a></dd>
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
                  <EmergencyTimeline updates={request.updates} viewer="volunteer" />
                </details>
                {step && (
                  <div className={styles.requestActions}>
                    <Button href={telHref(request.phone)} variant="secondary" size="sm" leftIcon={<LuPhone />}>
                      Call requester
                    </Button>
                    <Button size="sm" onClick={() => setPending({ request, step })}>{step.label}</Button>
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="container page">
      <PageHeader
        backTo="/requests"
        backLabel="My requests"
        eyebrow="Volunteer"
        title="My assignments"
        description="Emergency requests a coordinator assigned to you. Updates refresh automatically."
        actions={
          data && (
            <Button variant="secondary" leftIcon={<LuRefreshCw />} onClick={reload} loading={loading}>
              Refresh
            </Button>
          )
        }
      />
      {content}

      <ConfirmDialog
        open={Boolean(pending)}
        tone="primary"
        title={pending ? `${pending.step.label}?` : ""}
        description={pending && <p>{pending.step.confirm}</p>}
        confirmLabel={pending?.step.label}
        cancelLabel="Not now"
        loading={busy}
        onConfirm={confirm}
        onCancel={() => {
          setPending(null);
          setNote("");
        }}
      >
        <TextAreaField
          label="Note for the coordinators"
          optional
          maxLength={500}
          name="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </ConfirmDialog>
    </div>
  );
}
