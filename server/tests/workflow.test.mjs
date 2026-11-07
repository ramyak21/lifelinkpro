// ======================================================
// WORKFLOW TESTS — accounts, ownership, emergency workflow, admin management
// ------------------------------------------------------
// End-to-end against the running API + MySQL (like api.test.mjs). Covers what
// migration 002 and the portal split added: /api/me, request ownership, the
// emergency status/assignment workflow, admin paging/CRUD, account safeguards,
// rate limits and security headers. Every row it creates is removed at the end.
// Development databases only.
//
// Usage: npm run test:workflow   (API running, demo seed loaded)
// ======================================================

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const require = createRequire(import.meta.url);
require("dotenv").config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });
const mysql = require("mysql2/promise");
const connectionOptions = require("../config/connectionOptions");

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run tests while NODE_ENV=production (they create and delete data).");
  process.exit(1);
}

const BASE = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "admin@lifelinkpro.test";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "Admin@123";
const RUN = Date.now().toString().slice(-6);
const PASSWORD = "Test@12345";
const results = [];
const check = (group, name, ok, detail = "") => results.push({ group, name, ok: !!ok, detail });

const call = async (method, path, body, token, base = BASE) => {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, data, headers: res.headers };
};

const db = await mysql.createConnection({ ...connectionOptions(), database: process.env.DB_NAME });

const register = async (label) => {
  const email = `wftest.${label}.${RUN}@lifelinkpro.test`;
  await call("POST", "/api/auth/register", { name: `WF Test ${label}`, email, password: PASSWORD });
  const r = await call("POST", "/api/auth/login", { email, password: PASSWORD });
  return { email, token: r.data?.token, id: r.data?.user?.id };
};

let r;
const admin = (await call("POST", "/api/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD })).data;
const adminToken = admin?.token;
const adminId = admin?.user?.id;
check("Setup", "admin can sign in", !!adminToken);

const alice = await register("alice"); // requester
const bob = await register("bob");     // another member
const vic = await register("vic");     // will become a volunteer
const wes = await register("wes");     // another volunteer
check("Setup", "four members registered and signed in", [alice, bob, vic, wes].every((u) => u.token && u.id));

// ---------------- /api/me ----------------
r = await call("GET", "/api/me");
check("Me", "GET /api/me without a token -> 401", r.status === 401);
r = await call("GET", "/api/me", undefined, alice.token);
check("Me", "GET /api/me returns own profile without password", r.status === 200 && r.data?.user?.id === alice.id && !("password" in (r.data?.user || {})) && r.data?.volunteerProfile === null);
r = await call("PATCH", "/api/me", { name: "  WF Test Alice Renamed  " }, alice.token);
check("Me", "PATCH /api/me trims and saves the name", r.status === 200 && r.data?.user?.name === "WF Test Alice Renamed");
r = await call("PATCH", "/api/me", { name: "   " }, alice.token);
check("Me", "blank name -> 400", r.status === 400);
r = await call("PATCH", "/api/me", { name: "WF Test Alice", role: "admin" }, alice.token);
const [[aliceRow]] = await db.query("SELECT role FROM users WHERE id = ?", [alice.id]);
check("Me", "role in PATCH /api/me is ignored", r.status === 200 && aliceRow.role === "user");
r = await call("PUT", "/api/me/password", { currentPassword: "wrong-one", newPassword: "NewPass@123" }, alice.token);
check("Me", "password change with wrong current password -> 400", r.status === 400);
r = await call("PUT", "/api/me/password", { currentPassword: PASSWORD, newPassword: "short" }, alice.token);
check("Me", "new password under 8 characters -> 400", r.status === 400);
r = await call("PUT", "/api/me/password", { currentPassword: PASSWORD, newPassword: "NewPass@123" }, alice.token);
const reLogin = await call("POST", "/api/auth/login", { email: alice.email, password: "NewPass@123" });
const oldLogin = await call("POST", "/api/auth/login", { email: alice.email, password: PASSWORD });
check("Me", "password change works; old password stops working", r.status === 200 && reLogin.status === 200 && oldLogin.status === 400);
r = await call("POST", "/api/auth/register", { name: "WF Short", email: `wftest.short.${RUN}@lifelinkpro.test`, password: "1234567" });
check("Me", "registration with a 7-character password -> 400", r.status === 400);

// ---------------- submissions linked to the account ----------------
const vicVolunteer = await call("POST", "/api/volunteer/register", { name: "WF Test Vic", phone: `90${RUN}11`, skills: "First aid", location: "Test City", availability: "Weekends" }, vic.token);
check("Ownership", "volunteer registered while signed in is linked to the account", vicVolunteer.status === 201 && vicVolunteer.data?.volunteer?.user_id === vic.id);
r = await call("POST", "/api/volunteer/register", { name: "WF Test Vic Again", phone: `90${RUN}12` }, vic.token);
check("Ownership", "second volunteer profile for the same account -> 400", r.status === 400);
const wesVolunteer = await call("POST", "/api/volunteer/register", { name: "WF Test Wes", phone: `90${RUN}13`, availability: "Part Time" }, wes.token);
const vicVolunteerId = vicVolunteer.data?.volunteer?.id;
const wesVolunteerId = wesVolunteer.data?.volunteer?.id;

r = await call("POST", "/api/emergency", { name: "WF Test Alice", phone: `91${RUN}01`, location: "Alice Street", emergencyType: "Medical", description: "Fainted" }, alice.token);
const aliceEmergency = r.data?.emergency;
check("Ownership", "emergency sent while signed in -> user_id set, status Pending", r.status === 201 && aliceEmergency?.user_id === alice.id && aliceEmergency?.status === "Pending");
r = await call("POST", "/api/emergency", { name: "WF Test Anonymous", phone: `91${RUN}02`, location: "Anon Street" });
const anonEmergency = r.data?.emergency;
check("Ownership", "anonymous emergency -> user_id NULL", r.status === 201 && anonEmergency?.user_id === null);
r = await call("POST", "/api/emergency", { name: "WF Test X", phone: `91${RUN}03`, location: "X" }, "not-a-real-token");
check("Ownership", "invalid token on a public form -> 401 (not silently anonymous)", r.status === 401);
r = await call("POST", "/api/blood/register", { name: "WF Test Alice", phone: `92${RUN}01`, age: 30, bloodGroup: "o+", location: "Test City" }, alice.token);
check("Ownership", "blood group normalised (o+ -> O+) and linked", r.status === 201 && r.data?.donor?.blood_group === "O+" && r.data?.donor?.user_id === alice.id);
const aliceDonorId = r.data?.donor?.id;

r = await call("GET", "/api/me/requests", undefined, alice.token);
const mine = r.data?.emergencies || [];
check("Ownership", "GET /api/me/requests lists own emergency with history", r.status === 200 && mine.some((e) => e.id === aliceEmergency?.id && e.updates?.[0]?.action === "created"));
check("Ownership", "own requests include the linked blood donation", r.data?.bloodDonations?.some((d) => d.id === aliceDonorId));
check("Ownership", "history shown to users has no account ids or names", mine.every((e) => e.updates.every((u) => !("actor_user_id" in u) && !("actor_name" in u))));
r = await call("GET", "/api/me/requests", undefined, bob.token);
check("Ownership", "another member does not see Alice's request", r.status === 200 && !(r.data?.emergencies || []).some((e) => e.id === aliceEmergency?.id));
r = await call("PUT", `/api/me/emergencies/${aliceEmergency?.id}/cancel`, undefined, bob.token);
check("Ownership", "another member cancelling Alice's request -> 404", r.status === 404);
r = await call("PUT", `/api/me/emergencies/${anonEmergency?.id}/cancel`, undefined, alice.token);
check("Ownership", "cancelling an anonymous request -> 404", r.status === 404);

// ---------------- emergency workflow (admin + volunteer) ----------------
const id = anonEmergency?.id;
r = await call("PUT", `/api/manage/emergencies/${id}/status`, { status: "In Progress" }, adminToken);
check("Workflow", "Pending -> In Progress (skipping Accepted) -> 409", r.status === 409 && Array.isArray(r.data?.allowed));
r = await call("PUT", `/api/manage/emergencies/${id}/status`, { status: "Done" }, adminToken);
check("Workflow", "unknown status -> 400", r.status === 400);
r = await call("PUT", `/api/manage/emergencies/${id}/assignment`, { volunteerId: vicVolunteerId }, bob.token);
check("Workflow", "member cannot assign volunteers -> 403", r.status === 403);
r = await call("PUT", `/api/manage/emergencies/${id}/assignment`, { volunteerId: 999999999 }, adminToken);
check("Workflow", "unknown volunteer -> 404", r.status === 404);
r = await call("PUT", `/api/manage/emergencies/${id}/assignment`, { volunteerId: vicVolunteerId, note: "Closest volunteer" }, adminToken);
check("Workflow", "assigning a volunteer accepts a Pending request", r.status === 200 && r.data?.record?.status === "Accepted" && r.data?.record?.assigned_volunteer_id === vicVolunteerId && !!r.data?.record?.assigned_at);
r = await call("PUT", `/api/manage/emergencies/${id}/assignment`, { volunteerId: vicVolunteerId }, adminToken);
check("Workflow", "assigning the same volunteer twice -> 409", r.status === 409);
r = await call("DELETE", `/api/manage/volunteers/${vicVolunteerId}`, undefined, adminToken);
check("Workflow", "deleting a volunteer with an active assignment -> 409", r.status === 409);

r = await call("GET", "/api/me/assignments", undefined, vic.token);
check("Workflow", "volunteer sees the assignment with the requester's contact details", r.status === 200 && r.data?.assignments?.some((a) => a.id === id && a.phone === `91${RUN}02`));
r = await call("GET", "/api/me/assignments", undefined, bob.token);
check("Workflow", "a member without a volunteer profile sees no assignments", r.status === 200 && r.data?.volunteerProfile === null && r.data?.assignments?.length === 0);
r = await call("PUT", `/api/me/assignments/${id}/status`, { status: "In Progress" }, bob.token);
check("Workflow", "non-volunteer updating an assignment -> 403", r.status === 403);
r = await call("PUT", `/api/me/assignments/${id}/status`, { status: "In Progress" }, wes.token);
check("Workflow", "a different volunteer updating it -> 404", r.status === 404);
r = await call("PUT", `/api/me/assignments/${id}/status`, { status: "Cancelled" }, vic.token);
check("Workflow", "volunteer cannot cancel -> 409", r.status === 409);
r = await call("PUT", `/api/me/assignments/${id}/status`, { status: "In Progress", note: "On my way" }, vic.token);
check("Workflow", "assigned volunteer starts work (Accepted -> In Progress)", r.status === 200);
r = await call("PUT", `/api/manage/emergencies/${id}/assignment`, { volunteerId: null }, adminToken);
check("Workflow", "removing the volunteer while In Progress -> 409", r.status === 409);
r = await call("PUT", `/api/manage/emergencies/${id}/assignment`, { volunteerId: wesVolunteerId }, adminToken);
check("Workflow", "admin can reassign to another volunteer while In Progress", r.status === 200 && r.data?.record?.assigned_volunteer_id === wesVolunteerId && r.data?.record?.status === "In Progress");
r = await call("PUT", `/api/me/assignments/${id}/status`, { status: "Resolved" }, vic.token);
check("Workflow", "the previous volunteer can no longer update it -> 404", r.status === 404);
r = await call("PUT", `/api/me/assignments/${id}/status`, { status: "Resolved" }, wes.token);
check("Workflow", "new volunteer resolves it", r.status === 200);
r = await call("PUT", `/api/manage/emergencies/${id}/status`, { status: "Accepted" }, adminToken);
check("Workflow", "Resolved is final -> 409", r.status === 409);
r = await call("GET", `/api/manage/emergencies/${id}`, undefined, adminToken);
const rec = r.data?.record;
const actions = (rec?.updates || []).map((u) => `${u.action}:${u.to_status || u.volunteer_name || ""}:${u.actor_role}`);
check("Workflow", "status Resolved with resolved_at in MySQL", rec?.status === "Resolved" && !!rec?.resolved_at);
check("Workflow", "audit trail records every step with actor role", JSON.stringify(actions) === JSON.stringify([
  "created:Pending:public", "volunteer_assigned:WF Test Vic:admin", "status_changed:Accepted:admin",
  "status_changed:In Progress:volunteer", "volunteer_assigned:WF Test Wes:admin", "status_changed:Resolved:volunteer"
]), JSON.stringify(actions));

// Requester view of a workflow driven by the admin portal
r = await call("PUT", `/api/manage/emergencies/${aliceEmergency?.id}/assignment`, { volunteerId: wesVolunteerId }, adminToken);
r = await call("GET", "/api/me/requests", undefined, alice.token);
const aliceView = (r.data?.emergencies || []).find((e) => e.id === aliceEmergency?.id);
check("Integration", "admin assignment is visible to the requester (status + volunteer name)", aliceView?.status === "Accepted" && aliceView?.assigned_volunteer_name === "WF Test Wes");
check("Integration", "requester does not receive the volunteer's phone number", aliceView && !("assigned_volunteer_phone" in aliceView) && !JSON.stringify(aliceView).includes(`90${RUN}13`));
r = await call("PUT", `/api/me/emergencies/${aliceEmergency?.id}/cancel`, undefined, alice.token);
check("Integration", "requester cannot cancel once Accepted -> 409", r.status === 409);
r = await call("PUT", `/api/manage/emergencies/${aliceEmergency?.id}/status`, { status: "Cancelled", note: "Duplicate call" }, adminToken);
check("Integration", "admin cancels with a note", r.status === 200 && r.data?.record?.status === "Cancelled");
const dupe = await call("POST", "/api/emergency", { name: "WF Test Alice", phone: `91${RUN}01`, location: "Alice Street" }, alice.token);
check("Integration", "a closed request no longer blocks a new one from the same person", dupe.status === 201);
r = await call("PUT", `/api/me/emergencies/${dupe.data?.emergency?.id}/cancel`, undefined, alice.token);
check("Integration", "requester cancels their own Pending request", r.status === 200);
r = await call("PUT", `/api/me/emergencies/${dupe.data?.emergency?.id}/cancel`, undefined, alice.token);
check("Integration", "cancelling twice -> 409", r.status === 409);

// ---------------- admin listing: paging, search, filters, facets ----------------
r = await call("GET", "/api/manage/emergencies?pageSize=1&page=1", undefined, adminToken);
check("Admin lists", "pageSize=1 returns one row with pagination totals", r.status === 200 && r.data?.emergencies?.length === 1 && r.data?.pagination?.total >= 3 && r.data?.pagination?.totalPages >= 3);
r = await call("GET", `/api/manage/emergencies?status=Resolved&q=${encodeURIComponent("WF Test")}`, undefined, adminToken);
check("Admin lists", "status filter + search", r.status === 200 && r.data?.emergencies?.length >= 1 && r.data.emergencies.every((e) => e.status === "Resolved"));
check("Admin lists", "facets count every status for the current search", r.data?.facets?.status?.Resolved >= 1 && r.data?.facets?.status?.Cancelled >= 2 && "all" in r.data.facets.status);
r = await call("GET", "/api/manage/emergencies?status=Nope", undefined, adminToken);
check("Admin lists", "unknown filter value -> 400", r.status === 400);
r = await call("GET", "/api/manage/emergencies?pageSize=1000", undefined, adminToken);
check("Admin lists", "pageSize over 100 -> 400 (no unbounded lists)", r.status === 400);
r = await call("GET", `/api/manage/users?q=${encodeURIComponent("%")}`, undefined, adminToken);
check("Admin lists", "search treats % literally", r.status === 200 && r.data?.users?.length === 0);
r = await call("GET", "/api/manage/volunteers?availability=Weekends&sort=name&order=asc", undefined, adminToken);
check("Admin lists", "availability filter + sort", r.status === 200 && r.data.volunteers.every((v) => v.availability === "Weekends") && "activeAssignments" in (r.data.volunteers[0] || {}));
r = await call("GET", "/api/manage/nonsense", undefined, adminToken);
check("Admin lists", "unknown resource -> 404", r.status === 404);

// ---------------- admin create / edit / delete ----------------
r = await call("POST", "/api/manage/ambulances", { driverName: "WF Test Driver", phone: `93${RUN}01`, vehicleNumber: `WF-${RUN}`, location: "Depot", availability: "available" }, adminToken);
const ambId = r.data?.record?.id;
check("Admin CRUD", "create ambulance -> 201", r.status === 201 && r.data?.record?.vehicle_number === `WF-${RUN}`);
r = await call("PUT", `/api/manage/ambulances/${ambId}`, { driverName: "WF Test Driver", phone: `93${RUN}01`, vehicleNumber: `WF-${RUN}`, location: "Depot", availability: "Busy" }, adminToken);
check("Admin CRUD", "edit ambulance availability", r.status === 200 && r.data?.record?.status === "Busy");
r = await call("GET", "/api/manage/ambulances?status=busy", undefined, adminToken);
check("Admin CRUD", "case-insensitive status filter finds it", r.data?.ambulances?.some((a) => a.id === ambId));
r = await call("PUT", `/api/manage/ambulances/${ambId}`, { driverName: "", phone: "1", location: "" }, adminToken);
check("Admin CRUD", "invalid edit -> 400, record unchanged", r.status === 400);
r = await call("DELETE", `/api/manage/ambulances/${ambId}`, undefined, adminToken);
check("Admin CRUD", "delete ambulance (new endpoint)", r.status === 200 && r.data?.message === "Ambulance deleted successfully");
r = await call("POST", "/api/manage/hospitals", { services: "No name" }, adminToken);
check("Admin CRUD", "create hospital without a name -> 400", r.status === 400);
r = await call("POST", "/api/manage/users", { name: "x" }, adminToken);
check("Admin CRUD", "creating users through admin -> 405", r.status === 405);
r = await call("POST", "/api/manage/events", { eventName: "WF Test Past Event", date: "2020-01-01" }, adminToken);
const pastEventId = r.data?.record?.id;
check("Admin CRUD", "admin may record a past event", r.status === 201);
r = await call("POST", "/api/events/create", { eventName: "WF Test Public Past", date: "2020-01-01" });
check("Admin CRUD", "public form rejects a past date -> 400", r.status === 400);
r = await call("PUT", `/api/events/join/${pastEventId}`, undefined, bob.token);
check("Admin CRUD", "joining a past event -> 400", r.status === 400);
r = await call("GET", `/api/manage/hospitals/999999999`, undefined, adminToken);
check("Admin CRUD", "detail of a missing record -> 404", r.status === 404);

// ---------------- account safeguards ----------------
r = await call("DELETE", `/api/manage/users/${adminId}`, undefined, adminToken);
check("Accounts", "admin cannot delete their own account -> 409", r.status === 409);
r = await call("PUT", `/api/manage/users/${adminId}`, { name: "Demo Admin", role: "user" }, adminToken);
check("Accounts", "admin cannot remove their own admin role -> 409", r.status === 409);
// Admin access needs the admin role in BOTH the token and the database:
// a promoted member signs in again; a demoted admin loses access on the next request.
r = await call("PUT", `/api/manage/users/${bob.id}`, { name: "WF Test bob", role: "admin" }, adminToken);
const bobOldToken = await call("GET", "/api/manage/users", undefined, bob.token);
const bobAdminToken = (await call("POST", "/api/auth/login", { email: bob.email, password: PASSWORD })).data?.token;
const bobAdmin = await call("GET", "/api/manage/users", undefined, bobAdminToken);
check("Accounts", "promotion: old member token still 403, new sign-in gets admin access", r.status === 200 && bobOldToken.status === 403 && bobAdmin.status === 200);
r = await call("PUT", `/api/manage/users/${bob.id}`, { name: "WF Test bob", role: "user" }, adminToken);
const bobAfter = await call("GET", "/api/manage/users", undefined, bobAdminToken);
check("Accounts", "demotion takes effect immediately, even with an admin token -> 403", r.status === 200 && bobAfter.status === 403);

// Deleting an account keeps event totals consistent
const ev = await call("POST", "/api/events/create", { eventName: `WF Test Event ${RUN}`, date: "2099-01-01" });
await call("PUT", `/api/events/join/${ev.data?.event?.id}`, undefined, bob.token);
const [[before]] = await db.query("SELECT participants FROM events WHERE id = ?", [ev.data?.event?.id]);
r = await call("DELETE", `/api/manage/users/${bob.id}`, undefined, adminToken);
const [[after]] = await db.query("SELECT participants FROM events WHERE id = ?", [ev.data?.event?.id]);
check("Accounts", "deleting a member removes their participation and decrements the count", r.status === 200 && before.participants === 1 && after.participants === 0);
r = await call("GET", "/api/me", undefined, bob.token);
check("Accounts", "token of the deleted account -> 401", r.status === 401);

// ---------------- dashboard summary ----------------
r = await call("GET", "/api/admin/summary", undefined, adminToken);
const [[counts]] = await db.query("SELECT (SELECT COUNT(*) FROM users) u, (SELECT COUNT(*) FROM emergencies WHERE status IN ('Pending','Accepted','In Progress')) o, (SELECT COUNT(*) FROM volunteers) v");
const s = r.data?.summary;
check("Dashboard", "summary counts match MySQL", r.status === 200 && s?.users?.total === counts.u && s?.emergencies?.open === counts.o && s?.volunteers?.total === counts.v, JSON.stringify({ api: [s?.users?.total, s?.emergencies?.open, s?.volunteers?.total], db: counts }));
check("Dashboard", "summary lists are bounded (latest 5, next 5)", s?.latestEmergencies?.length <= 5 && s?.upcomingEvents?.length <= 5);

// ---------------- security headers + rate limits ----------------
r = await call("GET", "/");
check("Security", "security headers set (nosniff, DENY, CSP, no-referrer)", r.headers.get("x-content-type-options") === "nosniff" && r.headers.get("x-frame-options") === "DENY" && /default-src 'none'/.test(r.headers.get("content-security-policy") || "") && r.headers.get("referrer-policy") === "no-referrer");

const limitEmail = `wftest.limit.${RUN}@lifelinkpro.test`;
await call("POST", "/api/auth/register", { name: "WF Limit", email: limitEmail, password: PASSWORD });
const failures = [];
for (let i = 0; i < 10; i += 1) failures.push((await call("POST", "/api/auth/login", { email: limitEmail, password: "wrong" })).status);
r = await call("POST", "/api/auth/login", { email: limitEmail, password: PASSWORD });
check("Security", "11th sign-in after 10 failures -> 429 even with the right password", failures.every((st) => st === 400) && r.status === 429 && Number(r.headers.get("retry-after")) > 0, `${failures.join(",")} then ${r.status}`);
r = await call("POST", "/api/auth/login", { email: alice.email, password: "NewPass@123" });
check("Security", "other accounts are not locked out", r.status === 200);

// Registration limit: a second API instance with a limit of 2 per hour
const PORT2 = 5099;
const second = spawn(process.execPath, ["server.js"], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  env: { ...process.env, PORT: String(PORT2), RATE_LIMIT_REGISTER_PER_HOUR: "2", LOG_REQUESTS: "false" },
  stdio: "ignore"
});
let up = false;
for (let i = 0; i < 40 && !up; i += 1) {
  await new Promise((res) => setTimeout(res, 250));
  try { up = (await fetch(`http://localhost:${PORT2}/`)).ok; } catch { /* starting */ }
}
const regs = [];
for (let i = 0; i < 3; i += 1) {
  regs.push((await call("POST", "/api/auth/register", { name: "WF Reg", email: `wftest.reg${i}.${RUN}@lifelinkpro.test`, password: PASSWORD }, undefined, `http://localhost:${PORT2}`)).status);
}
second.kill();
check("Security", "3rd registration within the hour (limit 2) -> 429", up && regs[0] === 201 && regs[1] === 201 && regs[2] === 429, regs.join(","));

// ---------------- cleanup ----------------
await db.query("DELETE FROM emergencies WHERE name LIKE 'WF Test%'");
await db.query("DELETE FROM volunteers WHERE name LIKE 'WF Test%'");
await db.query("DELETE FROM blood_donors WHERE name LIKE 'WF Test%'");
await db.query("DELETE FROM events WHERE title LIKE 'WF Test%'");
await db.query("DELETE FROM ambulances WHERE name LIKE 'WF Test%'");
await db.query("DELETE FROM users WHERE email LIKE 'wftest.%'");
const [[left]] = await db.query(
  `SELECT (SELECT COUNT(*) FROM users WHERE email LIKE 'wftest.%') + (SELECT COUNT(*) FROM emergencies WHERE name LIKE 'WF Test%') +
          (SELECT COUNT(*) FROM volunteers WHERE name LIKE 'WF Test%') + (SELECT COUNT(*) FROM events WHERE title LIKE 'WF Test%') +
          (SELECT COUNT(*) FROM blood_donors WHERE name LIKE 'WF Test%') + (SELECT COUNT(*) FROM ambulances WHERE name LIKE 'WF Test%') AS n`
);
check("Cleanup", "test rows removed", left.n === 0);
await db.end();

// ---------------- report ----------------
let lastGroup = "";
for (const t of results) {
  if (t.group !== lastGroup) { console.log(`\n${t.group}`); lastGroup = t.group; }
  console.log(`  ${t.ok ? "PASS" : "FAIL"}  ${t.name}${t.ok || !t.detail ? "" : "  -> " + t.detail}`);
}
const failed = results.filter((t) => !t.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exitCode = failed ? 1 : 0;
