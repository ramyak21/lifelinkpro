import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { LuPencil, LuPhone, LuRefreshCw, LuUserMinus, LuUserPlus, LuUserRoundCheck } from "react-icons/lu";
import PageHeader from "@lifelink/shared/components/ui/PageHeader";
import Card, { CardHeader } from "@lifelink/shared/components/ui/Card";
import Badge from "@lifelink/shared/components/ui/Badge";
import Button from "@lifelink/shared/components/ui/Button";
import Alert from "@lifelink/shared/components/ui/Alert";
import Drawer from "@lifelink/shared/components/ui/Drawer";
import ConfirmDialog from "@lifelink/shared/components/ui/ConfirmDialog";
import ErrorState from "@lifelink/shared/components/ui/ErrorState";
import { SkeletonCard } from "@lifelink/shared/components/ui/Skeleton";
import TextAreaField from "@lifelink/shared/components/form/TextAreaField";
import EmergencyProgress from "@lifelink/shared/components/emergency/EmergencyProgress";
import EmergencyTimeline from "@lifelink/shared/components/emergency/EmergencyTimeline";
import RecordForm from "../../components/admin/RecordForm";
import VolunteerPicker from "./VolunteerPicker";
import { ADMIN_RESOURCES } from "../../components/admin/adminResources";
import { manageApi } from "@lifelink/shared/services/lifelink";
import { useAsync } from "@lifelink/shared/hooks/useAsync";
import { usePolling } from "@lifelink/shared/hooks/usePolling";
import { useToast } from "@lifelink/shared/hooks/useToast";
import { useDocumentTitle } from "@lifelink/shared/hooks/useDocumentTitle";
import { getErrorMessage } from "@lifelink/shared/utils/errors";
import { formatDateTime, orDash, telHref } from "@lifelink/shared/utils/format";
import { emergencyStatus } from "@lifelink/shared/utils/status";
import styles from "./EmergencyDetail.module.css";

const REFRESH_MS = 30000;
const config = ADMIN_RESOURCES.emergencies;

// Status changes an administrator may make (the API enforces the same table)
const NEXT_STATUSES = {
  Pending: ["Accepted", "Cancelled"],
  Accepted: ["In Progress", "Cancelled"],
  "In Progress": ["Resolved", "Cancelled"],
  Resolved: [],
  Cancelled: []
};
const ACTIVE = ["Pending", "Accepted", "In Progress"];

const STATUS_ACTION = {
  Accepted: { label: "Accept request", confirm: "Mark this request as accepted? Assigning a volunteer also does this." },
  "In Progress": { label: "Mark in progress", confirm: "Mark this request as in progress? The assigned volunteer is on it." },
  Resolved: { label: "Mark resolved", confirm: "Mark this request as resolved? It can't be reopened afterwards." },
  Cancelled: { label: "Cancel request", confirm: "Cancel this request? It can't be reopened afterwards.", tone: "danger" }
};

// Who sent the request: a member's account, an administrator who logged it (e.g. a phone call), or nobody signed in
function requesterAccount(record) {
  if (record.accountName) return `${record.accountName} (${record.accountEmail})`;
  const created = record.updates?.find((update) => update.action === "created");
  if (created?.actor_role === "admin") return `Logged by ${created.actor_name || "an administrator"}`;
  return "Sent without signing in";
}

// /emergencies/:id — review one SOS request, assign a volunteer and move it through its workflow
export default function EmergencyDetail() {
  const { id } = useParams();
  useDocumentTitle(`Request #${id} · Admin`);
  const toast = useToast();
  const load = useCallback(() => manageApi.get("emergencies", id), [id]);
  const { data: record, loading, failed, error, reload, setData } = useAsync(load);
  usePolling(reload, REFRESH_MS);

  const [pendingStatus, setPendingStatus] = useState(null);
  const [confirmUnassign, setConfirmUnassign] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);

  // Runs one workflow action; the API answers with the updated record and history
  const run = async (action, success) => {
    setBusy(true);
    try {
      setData(await action());
      toast.success(success);
      return true;
    } catch (actionError) {
      toast.error(getErrorMessage(actionError, "This request couldn't be updated. Please try again."));
      reload();
      return false;
    } finally {
      setBusy(false);
    }
  };

  const closeDialogs = () => {
    setPendingStatus(null);
    setConfirmUnassign(false);
    setNote("");
  };

  const header = (
    <PageHeader
      backTo="/manage/emergencies"
      backLabel="Emergency requests"
      eyebrow="Emergency request"
      title={record ? `#${record.id} — ${record.name}` : `Request #${id}`}
      description={record ? `Received ${formatDateTime(record.created_at)}. Updates refresh automatically.` : undefined}
      actions={
        record && (
          <Button variant="secondary" leftIcon={<LuRefreshCw />} onClick={reload} loading={loading}>
            Refresh
          </Button>
        )
      }
    />
  );

  if (loading && !record) {
    return (
      <>
        {header}
        <SkeletonCard lines={6} />
      </>
    );
  }
  if (failed && !record) {
    const missing = error?.response?.status === 404;
    return (
      <>
        {header}
        <ErrorState
          error={error}
          title={missing ? "This request doesn't exist" : "This request couldn't be loaded"}
          onRetry={missing ? undefined : reload}
        />
      </>
    );
  }

  const status = emergencyStatus(record.status);
  const active = ACTIVE.includes(record.status);
  const hasVolunteer = Boolean(record.assigned_volunteer_id);
  const nextStatuses = NEXT_STATUSES[record.status] || [];

  return (
    <>
      {header}

      <div className={styles.layout}>
        <div className={styles.main}>
          <Card padding="lg" className={styles.stack}>
            <div className={styles.statusHead}>
              <Badge tone={status.tone} dot>{status.label}</Badge>
              <p className={styles.muted}>{status.description}</p>
            </div>
            <EmergencyProgress status={record.status} />
            {nextStatuses.length > 0 && (
              <div className={styles.actions}>
                {nextStatuses.map((next) => {
                  const needsVolunteer = next === "In Progress" && !hasVolunteer;
                  return (
                    <Button
                      key={next}
                      size="sm"
                      variant={next === "Cancelled" ? "danger-ghost" : "primary"}
                      disabled={needsVolunteer}
                      title={needsVolunteer ? "Assign a volunteer first" : undefined}
                      onClick={() => setPendingStatus(next)}
                    >
                      {STATUS_ACTION[next].label}
                    </Button>
                  );
                })}
              </div>
            )}
            {nextStatuses.includes("In Progress") && !hasVolunteer && (
              <Alert tone="info">Assign a volunteer before marking this request in progress.</Alert>
            )}
          </Card>

          <Card padding="lg">
            <CardHeader
              title="Request details"
              as="h2"
              action={
                active && (
                  <Button variant="ghost" size="sm" leftIcon={<LuPencil />} onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                )
              }
            />
            <dl className={styles.facts}>
              <div>
                <dt>Requester</dt>
                <dd>{record.name}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd><a href={telHref(record.phone)}>{record.phone}</a></dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{orDash(record.emergency_type)}</dd>
              </div>
              <div>
                <dt>Account</dt>
                <dd>{requesterAccount(record)}</dd>
              </div>
              <div className={styles.wide}>
                <dt>Location</dt>
                <dd>{record.location}</dd>
              </div>
              <div className={styles.wide}>
                <dt>Details</dt>
                <dd>{orDash(record.description)}</dd>
              </div>
              {record.resolved_at && (
                <div>
                  <dt>Resolved</dt>
                  <dd>{formatDateTime(record.resolved_at)}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card padding="lg">
            <CardHeader title="History" description="Every change to this request, oldest first." as="h2" />
            <EmergencyTimeline updates={record.updates} viewer="admin" />
          </Card>
        </div>

        <aside className={styles.side} aria-label="Assigned volunteer">
          <Card padding="lg" className={styles.stack}>
            <CardHeader title="Volunteer" as="h2" />
            {hasVolunteer ? (
              <>
                <div className={styles.volunteer}>
                  <LuUserRoundCheck aria-hidden="true" className={styles.volunteerIcon} />
                  <div>
                    <p className={styles.volunteerName}>{record.assignedVolunteerName}</p>
                    <p className={styles.muted}>
                      {orDash(record.assignedVolunteerAvailability)}
                      {record.assigned_at && ` · assigned ${formatDateTime(record.assigned_at)}`}
                    </p>
                  </div>
                </div>
                <dl className={styles.facts}>
                  <div>
                    <dt>Phone</dt>
                    <dd>{record.assignedVolunteerPhone ? <a href={telHref(record.assignedVolunteerPhone)}>{record.assignedVolunteerPhone}</a> : "Not given"}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{orDash(record.assignedVolunteerEmail)}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className={styles.muted}>
                {active ? "No volunteer yet. Assigning one moves a pending request to Accepted." : "No volunteer assigned."}
              </p>
            )}
            {active && (
              <div className={styles.actions}>
                {record.assignedVolunteerPhone && (
                  <Button href={telHref(record.assignedVolunteerPhone)} variant="secondary" size="sm" leftIcon={<LuPhone />}>
                    Call
                  </Button>
                )}
                <Button size="sm" variant={hasVolunteer ? "secondary" : "primary"} leftIcon={<LuUserPlus />} onClick={() => setPicking(true)}>
                  {hasVolunteer ? "Reassign" : "Assign volunteer"}
                </Button>
                {hasVolunteer && record.status !== "In Progress" && (
                  <Button size="sm" variant="danger-ghost" leftIcon={<LuUserMinus />} onClick={() => setConfirmUnassign(true)}>
                    Remove
                  </Button>
                )}
              </div>
            )}
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(pendingStatus)}
        tone={STATUS_ACTION[pendingStatus]?.tone || "primary"}
        title={pendingStatus ? `${STATUS_ACTION[pendingStatus].label}?` : ""}
        description={pendingStatus && <p>{STATUS_ACTION[pendingStatus].confirm}</p>}
        confirmLabel={pendingStatus ? STATUS_ACTION[pendingStatus].label : ""}
        cancelLabel="Not now"
        loading={busy}
        onConfirm={async () => {
          await run(() => manageApi.setEmergencyStatus(record.id, pendingStatus, note.trim() || undefined), `Request marked ${pendingStatus}.`);
          closeDialogs();
        }}
        onCancel={closeDialogs}
      >
        <TextAreaField label="Note for the history" optional maxLength={500} name="note" value={note} onChange={(event) => setNote(event.target.value)} />
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmUnassign}
        title="Remove the volunteer?"
        description={<p>{record.assignedVolunteerName} will no longer see this request in their assignments.</p>}
        confirmLabel="Remove volunteer"
        cancelLabel="Keep volunteer"
        loading={busy}
        onConfirm={async () => {
          await run(() => manageApi.assignVolunteer(record.id, null, note.trim() || undefined), "Volunteer removed.");
          closeDialogs();
        }}
        onCancel={closeDialogs}
      >
        <TextAreaField label="Note for the history" optional maxLength={500} name="note" value={note} onChange={(event) => setNote(event.target.value)} />
      </ConfirmDialog>

      <Drawer open={editing} onClose={() => setEditing(false)} size="wide" closeLabel="Close form" title="Edit request details">
        {editing && (
          <RecordForm
            fields={config.fields}
            initialValues={config.toForm(record)}
            submitLabel="Save changes"
            onCancel={() => setEditing(false)}
            onSave={async (values) => {
              await manageApi.update("emergencies", record.id, values);
              toast.success("Request details updated.");
              setEditing(false);
              reload();
            }}
          />
        )}
      </Drawer>

      <Drawer open={picking} onClose={() => setPicking(false)} size="wide" closeLabel="Close volunteer list" title="Choose a volunteer">
        {picking && (
          <VolunteerPicker
            currentId={record.assigned_volunteer_id}
            busy={busy}
            onPick={async (volunteer) => {
              const done = await run(() => manageApi.assignVolunteer(record.id, volunteer.id), `${volunteer.name} is assigned to this request.`);
              if (done) setPicking(false);
            }}
          />
        )}
      </Drawer>
    </>
  );
}
