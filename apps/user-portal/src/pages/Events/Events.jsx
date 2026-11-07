import { useState } from "react";
import { LuCalendarPlus, LuCalendarX, LuSearchX } from "react-icons/lu";
import PageHeader from "@lifelink/shared/components/ui/PageHeader";
import Button from "@lifelink/shared/components/ui/Button";
import Toolbar from "@lifelink/shared/components/ui/Toolbar";
import SearchInput from "@lifelink/shared/components/ui/SearchInput";
import SegmentedControl from "@lifelink/shared/components/ui/SegmentedControl";
import EmptyState from "@lifelink/shared/components/ui/EmptyState";
import ErrorState from "@lifelink/shared/components/ui/ErrorState";
import { SkeletonGrid } from "@lifelink/shared/components/ui/Skeleton";
import CardGrid from "../../components/layout/CardGrid";
import EventCard from "../../components/events/EventCard";
import { eventsApi } from "@lifelink/shared/services/lifelink";
import { useAsync } from "@lifelink/shared/hooks/useAsync";
import { useDocumentTitle } from "@lifelink/shared/hooks/useDocumentTitle";
import { compareEventDates, isUpcoming, pluralize } from "@lifelink/shared/utils/format";

const matches = (event, query) =>
  [event.title, event.location, event.organizer, event.description].some((value) =>
    String(value || "").toLowerCase().includes(query)
  );

export default function Events() {
  useDocumentTitle("Community events");
  const { data, loading, failed, error, reload, setData } = useAsync(eventsApi.list);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("upcoming");

  const events = data || [];
  const upcoming = events.filter((event) => isUpcoming(event.date)).sort(compareEventDates);
  const past = events.filter((event) => !isUpcoming(event.date)).sort((a, b) => compareEventDates(b, a));
  const pools = { upcoming, past, all: [...upcoming, ...past] };

  const search = query.trim().toLowerCase();
  const visible = search ? pools[filter].filter((event) => matches(event, search)) : pools[filter];

  const handleJoined = (updated) =>
    setData((list) => list.map((event) => (event.id === updated.id ? updated : event)));

  let content;
  if (loading && !data) {
    content = <SkeletonGrid count={6} label="Loading events" min="320px" />;
  } else if (failed && !data) {
    content = <ErrorState error={error} title="Events couldn't be loaded" onRetry={reload} />;
  } else if (events.length === 0) {
    content = (
      <EmptyState
        icon={<LuCalendarX />}
        title="No events yet"
        description="Be the first to organise a drive, camp or awareness programme."
        action={<Button to="/events/new" leftIcon={<LuCalendarPlus />}>Create the first event</Button>}
      />
    );
  } else if (visible.length === 0) {
    content = search ? (
      <EmptyState
        icon={<LuSearchX />}
        title={`No events match “${query.trim()}”`}
        description="Try a different word, or clear the search."
        action={<Button variant="secondary" onClick={() => setQuery("")}>Clear search</Button>}
      />
    ) : (
      <EmptyState
        icon={<LuCalendarX />}
        title={filter === "upcoming" ? "No upcoming events" : "No past events"}
        description={filter === "upcoming" ? "Create one, or look at past events." : "Events appear here after their date has passed."}
        action={
          filter === "upcoming" ? (
            <>
              <Button to="/events/new" leftIcon={<LuCalendarPlus />}>Create an event</Button>
              <Button variant="secondary" onClick={() => setFilter("past")}>Show past events</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setFilter("upcoming")}>Show upcoming events</Button>
          )
        }
      />
    );
  } else {
    content = (
      <CardGrid as="ul" min="320px" aria-label="Events">
        {visible.map((event) => (
          <li key={event.id}>
            <EventCard event={event} onJoined={handleJoined} />
          </li>
        ))}
      </CardGrid>
    );
  }

  return (
    <div className="container page">
      <PageHeader
        eyebrow="Community"
        title="Community events"
        description="Blood donation camps, food drives, awareness programmes and more. Join an event to let the organisers know you're coming."
        actions={<Button to="/events/new" leftIcon={<LuCalendarPlus />}>Create event</Button>}
      />

      {data && events.length > 0 && (
        <Toolbar summary={`Showing ${pluralize(visible.length, "event")}`}>
          <SearchInput
            label="Search events"
            placeholder="Search by name, place or organiser"
            value={query}
            onChange={setQuery}
          />
          <SegmentedControl
            label="Show events"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "upcoming", label: "Upcoming", count: upcoming.length },
              { value: "past", label: "Past", count: past.length },
              { value: "all", label: "All", count: events.length }
            ]}
          />
        </Toolbar>
      )}

      {content}
    </div>
  );
}
