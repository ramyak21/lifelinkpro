// Formatting helpers. Dates use the visitor's locale.

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

// MySQL DATE values arrive as "YYYY-MM-DD"; parse them as local dates (no timezone shift)
export function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || "");
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function todayISO() {
  const today = startOfToday();
  const pad = (n) => String(n).padStart(2, "0");
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

// Events without a date count as upcoming ("date to be announced")
export function isUpcoming(dateValue) {
  const date = parseDateOnly(dateValue);
  return !date || date >= startOfToday();
}

// Sort events by date, soonest first; undated ("to be announced") events last
export function compareEventDates(a, b) {
  const dateA = parseDateOnly(a.date);
  const dateB = parseDateOnly(b.date);
  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;
  return dateA - dateB;
}

export function isPastDate(dateValue) {
  const date = parseDateOnly(dateValue);
  return Boolean(date) && date < startOfToday();
}

const longDate = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric"
});

const shortDate = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric"
});

const dateTime = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

export function formatEventDate(value) {
  const date = parseDateOnly(value);
  return date ? longDate.format(date) : "Date to be announced";
}

// Parts for a calendar-style date tile: { day: "5", month: "Dec" }
export function dateTileParts(value) {
  const date = parseDateOnly(value);
  if (!date) return null;
  return {
    day: String(date.getDate()),
    month: date.toLocaleString(undefined, { month: "short" })
  };
}

// created_at / updated_at timestamps
export function formatDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? shortDate.format(date) : "—";
}

export function formatDateTime(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? dateTime.format(date) : "—";
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function formatRelativeTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "—";

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60]
  ];

  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return relative.format(Math.round(seconds / size), unit);
    }
  }
  return "just now";
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function firstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "there";
}

export function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function telHref(phone) {
  return `tel:${String(phone || "").replace(/[^\d+]/g, "")}`;
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

// Optional text from the API: show an em dash for empty values
export function orDash(value) {
  return value === null || value === undefined || String(value).trim() === "" ? "—" : value;
}
