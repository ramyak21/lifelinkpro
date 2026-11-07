import { LuArrowRight, LuClipboardList, LuHandHeart } from "react-icons/lu";
import Card, { CardHeader } from "@lifelink/shared/components/ui/Card";
import Badge from "@lifelink/shared/components/ui/Badge";
import Button from "@lifelink/shared/components/ui/Button";
import Skeleton from "@lifelink/shared/components/ui/Skeleton";
import { meApi } from "@lifelink/shared/services/lifelink";
import { useAsync } from "@lifelink/shared/hooks/useAsync";
import { usePolling } from "@lifelink/shared/hooks/usePolling";
import { emergencyStatus, OPEN_EMERGENCY_STATUSES } from "@lifelink/shared/utils/status";
import styles from "./RequestsSummary.module.css";

// Dashboard card: the member's open emergency requests (from GET /api/me/requests)
export default function RequestsSummary() {
  const { data, failed, reload } = useAsync(meApi.requests);
  usePolling(reload, 60000);

  const open = (data?.emergencies || []).filter((request) => OPEN_EMERGENCY_STATUSES.includes(request.status));

  return (
    <Card padding="md">
      <CardHeader title="Your requests" as="h2" />
      {!data && !failed && <Skeleton height="56px" />}
      {failed && !data && <p className={styles.muted}>Your requests couldn't be loaded right now.</p>}
      {data && (
        <>
          {open.length === 0 ? (
            <p className={styles.muted}>You have no open emergency requests.</p>
          ) : (
            <ul className={styles.list}>
              {open.slice(0, 3).map((request) => {
                const status = emergencyStatus(request.status);
                return (
                  <li key={request.id} className={styles.item}>
                    <span>{request.emergency_type || "Emergency"} #{request.id}</span>
                    <Badge tone={status.tone} dot>{status.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
          <div className={styles.actions}>
            <Button to="/requests" variant="secondary" size="sm" fullWidth leftIcon={<LuClipboardList />} rightIcon={<LuArrowRight />}>
              My requests
            </Button>
            {data.volunteerProfile && (
              <Button to="/assignments" variant="ghost" size="sm" fullWidth leftIcon={<LuHandHeart />}>
                My assignments
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
