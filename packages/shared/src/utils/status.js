// Maps stored status values to a label + badge tone. Only values the backend
// actually stores are given a meaning; anything else is shown as "unknown".

// emergencies.status (migration 002): Pending → Accepted → In Progress → Resolved, or Cancelled
const EMERGENCY_STATUS = {
  pending: { label: "Pending", tone: "warning", description: "Waiting for a coordinator to review it" },
  accepted: { label: "Accepted", tone: "primary", description: "A coordinator has accepted the request" },
  "in progress": { label: "In Progress", tone: "primary", description: "A volunteer is helping" },
  resolved: { label: "Resolved", tone: "success", description: "The request has been resolved" },
  cancelled: { label: "Cancelled", tone: "neutral", description: "The request was cancelled" }
};

export const EMERGENCY_STEPS = ["Pending", "Accepted", "In Progress", "Resolved"];
export const OPEN_EMERGENCY_STATUSES = ["Pending", "Accepted", "In Progress"];

export function emergencyStatus(status) {
  return EMERGENCY_STATUS[String(status || "").toLowerCase()] || { label: status || "Unknown", tone: "neutral" };
}

// ambulances.status: "available" (API default) or the form's "Available" / "Busy"
export function ambulanceStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value === "available") return { key: "available", label: "Available", tone: "success" };
  if (value === "busy") return { key: "busy", label: "Busy", tone: "warning" };
  return { key: "unknown", label: "Status unknown", tone: "neutral" };
}

// hospitals.emergency_available: "Available" / "Not Available" / empty
export function hospitalEmergency(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "available") return { key: "available", label: "Emergency services", tone: "success" };
  if (normalized === "not available") return { key: "unavailable", label: "No emergency services", tone: "neutral" };
  return null;
}

// food_donations.available / blood_donors.available (1 or 0)
export function availability(flag) {
  return Number(flag) === 1
    ? { label: "Available", tone: "success" }
    : { label: "Unavailable", tone: "neutral" };
}

export function roleBadge(role) {
  return role === "admin"
    ? { label: "Administrator", tone: "primary" }
    : { label: "Member", tone: "neutral" };
}
