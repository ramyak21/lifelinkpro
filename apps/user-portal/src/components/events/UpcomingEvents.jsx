import { LuCalendarPlus, LuCalendarX } from "react-icons/lu";
import EventCard from "./EventCard";
import CardGrid from "../layout/CardGrid";
import Button from "@lifelink/shared/components/ui/Button";
import EmptyState from "@lifelink/shared/components/ui/EmptyState";
import ErrorState from "@lifelink/shared/components/ui/ErrorState";
import { SkeletonGrid } from "@lifelink/shared/components/ui/Skeleton";
import { eventsApi } from "@lifelink/shared/services/lifelink";
import { useAsync } from "@lifelink/shared/hooks/useAsync";
import { compareEventDates, isUpcoming } from "@lifelink/shared/utils/format";
import styles from "./UpcomingEvents.module.css";

// Next few events from GET /api/events, with loading, empty and error states
export default function UpcomingEvents({ limit = 3, min = "300px" }) {
  const { data: events, loading, failed, error, reload, setData } = useAsync(eventsApi.list);

  if (loading && !events) {
    return <SkeletonGrid count={limit} label="Loading events" min={min} />;
  }

  if (failed && !events) {
    return <ErrorState compact error={error} title="Events couldn't be loaded" onRetry={reload} />;
  }

  const upcoming = (events || []).filter((event) => isUpcoming(event.date)).sort(compareEventDates).slice(0, limit);

  if (upcoming.length === 0) {
    return (
      <div className={styles.empty}>
        <EmptyState
          compact
          icon={<LuCalendarX />}
          title="No upcoming events yet"
          description="When someone organises a drive, camp or awareness event, it will appear here."
          action={<Button to="/events/new" variant="secondary" leftIcon={<LuCalendarPlus />}>Create an event</Button>}
        />
      </div>
    );
  }

  const handleJoined = (updated) =>
    setData((list) => list.map((event) => (event.id === updated.id ? updated : event)));

  return (
    <CardGrid as="ul" min={min}>
      {upcoming.map((event) => (
        <li key={event.id}>
          <EventCard event={event} compact onJoined={handleJoined} />
        </li>
      ))}
    </CardGrid>
  );
}
