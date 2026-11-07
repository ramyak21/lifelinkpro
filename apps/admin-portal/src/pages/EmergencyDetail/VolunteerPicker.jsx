import { useCallback, useEffect, useState } from "react";
import { LuUsers } from "react-icons/lu";
import SearchInput from "@lifelink/shared/components/ui/SearchInput";
import Badge from "@lifelink/shared/components/ui/Badge";
import Button from "@lifelink/shared/components/ui/Button";
import EmptyState from "@lifelink/shared/components/ui/EmptyState";
import ErrorState from "@lifelink/shared/components/ui/ErrorState";
import { SkeletonCard } from "@lifelink/shared/components/ui/Skeleton";
import { manageApi } from "@lifelink/shared/services/lifelink";
import { useAsync } from "@lifelink/shared/hooks/useAsync";
import { orDash } from "@lifelink/shared/utils/format";
import styles from "./EmergencyDetail.module.css";

const SEARCH_DELAY_MS = 350;

// Searchable volunteer list (first 10 matches, A→Z) with their current workload
export default function VolunteerPicker({ currentId, busy, onPick }) {
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQ(draft.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft]);

  const load = useCallback(
    () => manageApi.list("volunteers", "volunteers", { q: q || undefined, pageSize: 10, sort: "name", order: "asc" }),
    [q]
  );
  const { data, loading, failed, error, reload } = useAsync(load);

  let content;
  if (loading && !data) content = <SkeletonCard />;
  else if (failed && !data) content = <ErrorState error={error} title="Volunteers couldn't be loaded" onRetry={reload} />;
  else if (data.rows.length === 0) {
    content = (
      <EmptyState
        compact
        icon={<LuUsers />}
        title={q ? "No matching volunteers" : "No volunteers yet"}
        description={q ? "Try a name, skill or area." : "People who register as volunteers appear here."}
      />
    );
  } else {
    content = (
      <>
        <ul className={styles.pickList} aria-busy={loading}>
          {data.rows.map((volunteer) => {
            const current = volunteer.id === currentId;
            const activeCount = Number(volunteer.activeAssignments) || 0;
            return (
              <li key={volunteer.id} className={styles.pickItem}>
                <div className={styles.pickMain}>
                  <p className={styles.volunteerName}>{volunteer.name}</p>
                  <p className={styles.muted}>
                    {orDash(volunteer.availability)} · {orDash(volunteer.location || volunteer.address)}
                  </p>
                  {volunteer.skills && <p className={styles.muted}>{volunteer.skills}</p>}
                  <Badge tone={activeCount ? "warning" : "success"}>
                    {activeCount ? `${activeCount} active` : "Free"}
                  </Badge>
                </div>
                {current ? (
                  <Badge tone="primary">Assigned</Badge>
                ) : (
                  <Button size="sm" disabled={busy} onClick={() => onPick(volunteer)} aria-label={`Assign ${volunteer.name}`}>
                    Assign
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {data.pagination.total > data.rows.length && (
          <p className={styles.muted}>
            Showing the first {data.rows.length} of {data.pagination.total}. Search to narrow the list.
          </p>
        )}
      </>
    );
  }

  return (
    <div className={styles.stack}>
      <SearchInput label="Search volunteers" placeholder="Name, skill or area…" value={draft} onChange={setDraft} />
      {content}
    </div>
  );
}
