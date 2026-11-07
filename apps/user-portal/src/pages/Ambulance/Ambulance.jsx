import { useState } from "react";
import { LuAmbulance, LuPlus, LuSearchX } from "react-icons/lu";
import PageHeader from "@lifelink/shared/components/ui/PageHeader";
import Alert from "@lifelink/shared/components/ui/Alert";
import Button from "@lifelink/shared/components/ui/Button";
import Toolbar from "@lifelink/shared/components/ui/Toolbar";
import SearchInput from "@lifelink/shared/components/ui/SearchInput";
import SegmentedControl from "@lifelink/shared/components/ui/SegmentedControl";
import EmptyState from "@lifelink/shared/components/ui/EmptyState";
import ErrorState from "@lifelink/shared/components/ui/ErrorState";
import { SkeletonGrid } from "@lifelink/shared/components/ui/Skeleton";
import CardGrid from "../../components/layout/CardGrid";
import AmbulanceCard from "../../components/directory/AmbulanceCard";
import { ambulanceApi } from "@lifelink/shared/services/lifelink";
import { useAsync } from "@lifelink/shared/hooks/useAsync";
import { useDocumentTitle } from "@lifelink/shared/hooks/useDocumentTitle";
import { ambulanceStatus } from "@lifelink/shared/utils/status";
import { pluralize } from "@lifelink/shared/utils/format";
import styles from "./Ambulance.module.css";

// Available ambulances first
const STATUS_ORDER = { available: 0, busy: 1, unknown: 2 };

const matches = (ambulance, query) =>
  [ambulance.name, ambulance.location, ambulance.vehicle_number].some((value) =>
    String(value || "").toLowerCase().includes(query)
  );

export default function Ambulance() {
  useDocumentTitle("Ambulances");
  const { data, loading, failed, error, reload } = useAsync(ambulanceApi.list);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const ambulances = [...(data || [])].sort(
    (a, b) => STATUS_ORDER[ambulanceStatus(a.status).key] - STATUS_ORDER[ambulanceStatus(b.status).key]
  );
  const count = (key) => ambulances.filter((ambulance) => ambulanceStatus(ambulance.status).key === key).length;
  const pool = filter === "all" ? ambulances : ambulances.filter((a) => ambulanceStatus(a.status).key === filter);
  const search = query.trim().toLowerCase();
  const visible = search ? pool.filter((ambulance) => matches(ambulance, search)) : pool;

  let content;
  if (loading && !data) {
    content = <SkeletonGrid count={6} label="Loading ambulances" />;
  } else if (failed && !data) {
    content = <ErrorState error={error} title="Ambulances couldn't be loaded" onRetry={reload} />;
  } else if (ambulances.length === 0) {
    content = (
      <EmptyState
        icon={<LuAmbulance />}
        title="No ambulances listed yet"
        description="Ambulances appear here once they are registered. In an emergency, call 108."
        action={<Button to="/ambulance/register" leftIcon={<LuPlus />}>Register an ambulance</Button>}
      />
    );
  } else if (visible.length === 0) {
    content = (
      <EmptyState
        icon={<LuSearchX />}
        title={search ? `No ambulances match “${query.trim()}”` : "No ambulances with this status"}
        description={search ? "Try a different area, driver or vehicle number." : "Show all ambulances to see every listing."}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
          >
            Show all ambulances
          </Button>
        }
      />
    );
  } else {
    content = (
      <CardGrid as="ul" min="300px" aria-label="Ambulances">
        {visible.map((ambulance) => (
          <li key={ambulance.id}>
            <AmbulanceCard ambulance={ambulance} />
          </li>
        ))}
      </CardGrid>
    );
  }

  return (
    <div className="container page">
      <PageHeader
        eyebrow="Get help"
        title="Ambulances"
        description="Ambulances registered with LifeLink Pro. In a life-threatening emergency, call 108 first."
        actions={
          <Button to="/ambulance/register" variant="secondary" leftIcon={<LuPlus />}>
            Register an ambulance
          </Button>
        }
      />

      {data && ambulances.length > 0 && (
        <>
          <Alert tone="info" className={styles.notice}>
            Availability is set when an ambulance is registered and may have changed since. Call the driver to confirm.
          </Alert>
          <Toolbar summary={`Showing ${pluralize(visible.length, "ambulance")} of ${ambulances.length}`}>
            <SearchInput
              label="Search ambulances"
              placeholder="Search by area, driver or vehicle"
              value={query}
              onChange={setQuery}
            />
            <SegmentedControl
              label="Filter by availability"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All", count: ambulances.length },
                { value: "available", label: "Available", count: count("available") },
                { value: "busy", label: "Busy", count: count("busy") }
              ]}
            />
          </Toolbar>
        </>
      )}

      {content}
    </div>
  );
}
