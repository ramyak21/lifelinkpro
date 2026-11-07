import Badge from "@lifelink/shared/components/ui/Badge";
import { formatDateTime, formatRelativeTime, orDash, telHref } from "@lifelink/shared/utils/format";
import styles from "./Cells.module.css";

// Small renderers used by the admin table columns

export function StatusCell({ status }) {
  return <Badge tone={status.tone} dot>{status.label}</Badge>;
}

export function PhoneCell({ phone }) {
  if (!phone) return "—";
  return <a href={telHref(phone)} className={styles.phone}>{phone}</a>;
}

// Long free text: one line in the table, full text on hover and for screen readers
export function LongTextCell({ text }) {
  const value = orDash(text);
  return <span className={styles.truncate} title={text || undefined}>{value}</span>;
}

export function TimeAgoCell({ value }) {
  if (!value) return "—";
  return (
    <time dateTime={value} title={formatDateTime(value)} className={styles.nowrap}>
      {formatRelativeTime(value)}
    </time>
  );
}
