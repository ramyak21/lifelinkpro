import { useState } from "react";
import { useLocation } from "react-router-dom";
import { LuCalendar, LuCalendarDays, LuCircleCheck, LuMapPin, LuUserRound, LuUsers } from "react-icons/lu";
import Badge from "@lifelink/shared/components/ui/Badge";
import Button from "@lifelink/shared/components/ui/Button";
import { eventsApi } from "@lifelink/shared/services/lifelink";
import { useAuth } from "@lifelink/shared/hooks/useAuth";
import { useToast } from "@lifelink/shared/hooks/useToast";
import { dateTileParts, formatEventDate, isPastDate, pluralize } from "@lifelink/shared/utils/format";
import { getErrorMessage } from "@lifelink/shared/utils/errors";
import cx from "@lifelink/shared/utils/cx";
import styles from "./EventCard.module.css";

// One community event with Join / Leave (PUT /api/events/join|leave/:id).
// Joining needs an account: the API records one participation per account, and
// `event.joined` (sent by GET /api/events with a session) says whether this user joined.
export default function EventCard({ event, onJoined, compact = false, headingLevel: Heading = "h3" }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const ended = isPastDate(event.date);
  const tile = dateTileParts(event.date);

  const change = async (action) => {
    setBusy(true);
    try {
      const updated = await (action === "join" ? eventsApi.join(event.id) : eventsApi.leave(event.id));
      onJoined?.(updated);
      toast.success(action === "join" ? `You've joined "${event.title}".` : `You've left "${event.title}".`);
    } catch (error) {
      toast.error(getErrorMessage(error, "We couldn't update your place at this event. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  let action;
  if (ended) {
    action = <Badge>Event ended</Badge>;
  } else if (!isAuthenticated) {
    action = (
      <Button size="sm" variant="outline" to="/login" state={{ from: location.pathname }} aria-label={`Sign in to join ${event.title}`}>
        Sign in to join
      </Button>
    );
  } else if (event.joined) {
    action = (
      <span className={styles.joined}>
        <Badge tone="success" icon={<LuCircleCheck />}>You're going</Badge>
        <Button size="sm" variant="ghost" onClick={() => change("leave")} loading={busy} aria-label={`Leave ${event.title}`}>
          Leave
        </Button>
      </span>
    );
  } else {
    action = (
      <Button size="sm" variant="outline" onClick={() => change("join")} loading={busy} aria-label={`Join ${event.title}`}>
        Join event
      </Button>
    );
  }

  return (
    <article className={cx(styles.card, compact && styles.compact, ended && styles.ended)}>
      <div className={styles.dateTile} aria-hidden="true">
        {tile ? (
          <>
            <span className={styles.month}>{tile.month}</span>
            <span className={styles.day}>{tile.day}</span>
          </>
        ) : (
          <LuCalendar className={styles.tbd} />
        )}
      </div>

      <div className={styles.body}>
        <Heading className={styles.title}>{event.title}</Heading>

        <ul className={styles.meta}>
          <li>
            <LuCalendarDays aria-hidden="true" />
            {event.date ? <time dateTime={event.date}>{formatEventDate(event.date)}</time> : formatEventDate(null)}
          </li>
          {event.location && (
            <li>
              <LuMapPin aria-hidden="true" />
              {event.location}
            </li>
          )}
          {event.organizer && !compact && (
            <li>
              <LuUserRound aria-hidden="true" />
              Organised by {event.organizer}
            </li>
          )}
        </ul>

        {event.description && !compact && <p className={styles.description}>{event.description}</p>}

        <div className={styles.footer}>
          <span className={styles.participants}>
            <LuUsers aria-hidden="true" />
            {pluralize(Number(event.participants) || 0, "participant")}
          </span>
          {action}
        </div>
      </div>
    </article>
  );
}
