import { useState } from "react";
import { LuHospital, LuPlus, LuSearchX } from "react-icons/lu";
import PageHeader from "@lifelink/shared/components/ui/PageHeader";
import Button from "@lifelink/shared/components/ui/Button";
import Toolbar from "@lifelink/shared/components/ui/Toolbar";
import SearchInput from "@lifelink/shared/components/ui/SearchInput";
import SegmentedControl from "@lifelink/shared/components/ui/SegmentedControl";
import EmptyState from "@lifelink/shared/components/ui/EmptyState";
import ErrorState from "@lifelink/shared/components/ui/ErrorState";
import { SkeletonGrid } from "@lifelink/shared/components/ui/Skeleton";
import CardGrid from "../../components/layout/CardGrid";
import HospitalCard from "../../components/directory/HospitalCard";
import { hospitalApi } from "@lifelink/shared/services/lifelink";
import { useAsync } from "@lifelink/shared/hooks/useAsync";
import { useDocumentTitle } from "@lifelink/shared/hooks/useDocumentTitle";
import { hospitalEmergency } from "@lifelink/shared/utils/status";
import { pluralize } from "@lifelink/shared/utils/format";

const offersEmergency = (hospital) => hospitalEmergency(hospital.emergency_available)?.key === "available";

const matches = (hospital, query) =>
  [hospital.name, hospital.address, hospital.location, hospital.services].some((value) =>
    String(value || "").toLowerCase().includes(query)
  );

export default function Hospitals() {
  useDocumentTitle("Hospitals");
  const { data, loading, failed, error, reload } = useAsync(hospitalApi.list);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const hospitals = data || [];
  const withEmergency = hospitals.filter(offersEmergency);
  const pool = filter === "emergency" ? withEmergency : hospitals;
  const search = query.trim().toLowerCase();
  const visible = search ? pool.filter((hospital) => matches(hospital, search)) : pool;

  let content;
  if (loading && !data) {
    content = <SkeletonGrid count={6} label="Loading hospitals" min="320px" />;
  } else if (failed && !data) {
    content = <ErrorState error={error} title="Hospitals couldn't be loaded" onRetry={reload} />;
  } else if (hospitals.length === 0) {
    content = (
      <EmptyState
        icon={<LuHospital />}
        title="No hospitals listed yet"
        description="Hospitals appear here once they are registered."
        action={<Button to="/hospitals/register" leftIcon={<LuPlus />}>Register a hospital</Button>}
      />
    );
  } else if (visible.length === 0) {
    content = (
      <EmptyState
        icon={<LuSearchX />}
        title={search ? `No hospitals match “${query.trim()}”` : "No hospitals with emergency services listed"}
        description={search ? "Try a different name, area or service." : "Show all hospitals to see every listing."}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
          >
            Show all hospitals
          </Button>
        }
      />
    );
  } else {
    content = (
      <CardGrid as="ul" min="320px" aria-label="Hospitals">
        {visible.map((hospital) => (
          <li key={hospital.id}>
            <HospitalCard hospital={hospital} />
          </li>
        ))}
      </CardGrid>
    );
  }

  return (
    <div className="container page">
      <PageHeader
        eyebrow="Get help"
        title="Hospitals"
        description="Hospitals registered with LifeLink Pro, with their services and whether they accept emergency cases."
        actions={
          <Button to="/hospitals/register" variant="secondary" leftIcon={<LuPlus />}>
            Register a hospital
          </Button>
        }
      />

      {data && hospitals.length > 0 && (
        <Toolbar summary={`Showing ${pluralize(visible.length, "hospital")} of ${hospitals.length}`}>
          <SearchInput
            label="Search hospitals"
            placeholder="Search by name, area or service"
            value={query}
            onChange={setQuery}
          />
          <SegmentedControl
            label="Filter hospitals"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: hospitals.length },
              { value: "emergency", label: "Emergency services", count: withEmergency.length }
            ]}
          />
        </Toolbar>
      )}

      {content}
    </div>
  );
}
