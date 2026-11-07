// ======================================================
// API FUNCTIONAL TESTS
// ------------------------------------------------------
// End-to-end checks of every endpoint, using the same payloads the
// React forms send. Needs the API running (npm run dev) and the demo
// seed loaded (npm run sql:seed). Every row it creates is removed at
// the end. Development databases only.
//
// Usage: npm run test:api
// ======================================================

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

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
const results = [];

const check = (group, name, ok, detail = "") => {
  results.push({ group, name, ok: !!ok, detail });
};

const call = async (method, path, body, token) => {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, data };
};

const decodeJwt = (token) =>
  JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());

const db = await mysql.createConnection({ ...connectionOptions(), database: process.env.DB_NAME });

// ---------------- server ----------------
let r = await call("GET", "/");
check("Server", "GET / welcome", r.status === 200 && r.data?.success === true, r.data?.message);

r = await call("GET", "/api/does-not-exist");
check("Server", "unknown route -> 404 JSON", r.status === 404 && r.data?.message === "API Route Not Found");

// ---------------- auth ----------------
const email = `apitest.${RUN}@lifelinkpro.test`;
// Register.jsx sends name, email, password, role (role is ignored by the API)
r = await call("POST", "/api/auth/register", { name: "API Test User", email, password: "Test@12345", role: "Admin" });
check("Register", "POST /api/auth/register -> 201", r.status === 201 && r.data?.success, r.data?.message);
check("Register", "response user {id,name,email,role}", r.data?.user && Number.isInteger(r.data.user.id) && r.data.user.email === email);
check("Register", "self-registration cannot become admin", r.data?.user?.role === "user", `role=${r.data?.user?.role}`);
const testUserId = r.data?.user?.id;

const [[stored]] = await db.query("SELECT password, role FROM users WHERE email = ?", [email]);
check("Register", "password stored as bcrypt hash", /^\$2[aby]\$10\$/.test(stored?.password || ""));

r = await call("POST", "/api/auth/register", { name: "API Test User", email, password: "Test@12345", role: "Citizen" });
check("Register", "duplicate email -> 400", r.status === 400 && r.data?.message === "User already exists");

// Login.jsx sends email, password
r = await call("POST", "/api/auth/login", { email, password: "Test@12345" });
check("Login", "POST /api/auth/login -> 200 + token", r.status === 200 && typeof r.data?.token === "string");
check("Login", "response user {id,name,email,role}", r.data?.user?.id === testUserId && r.data?.user?.name === "API Test User" && r.data?.user?.role === "user");
const userToken = r.data?.token;
const userClaims = userToken ? decodeJwt(userToken) : {};
check("Login", "JWT payload unchanged {id, role} + 7d expiry", userClaims.id === testUserId && userClaims.role === "user" && userClaims.exp - userClaims.iat === 7 * 24 * 3600, JSON.stringify(userClaims));

r = await call("POST", "/api/auth/login", { email, password: "wrong-password" });
check("Login", "wrong password -> 400", r.status === 400 && r.data?.message === "Invalid email or password");

r = await call("POST", "/api/auth/login", { email: `nobody.${RUN}@lifelinkpro.test`, password: "x" });
check("Login", "unknown email -> 400", r.status === 400);

// AdminLogin.jsx uses the same /auth/login and checks user.role === "admin"
r = await call("POST", "/api/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
check("Admin Login", "seeded admin logs in with role=admin", r.status === 200 && r.data?.user?.role === "admin");
const adminToken = r.data?.token;
check("Admin Login", "admin JWT carries role=admin", adminToken && decodeJwt(adminToken).role === "admin");

// ---------------- blood donor ----------------
const bloodPhone = `81${RUN}01`;
// BloodDonation.jsx: name, phone, age, bloodGroup, location
r = await call("POST", "/api/blood/register", { name: "API Test Donor", phone: bloodPhone, age: "29", bloodGroup: "B+", location: "Test City" });
check("Blood Donor", "POST /api/blood/register -> 201", r.status === 201 && r.data?.message === "Blood donor registered successfully", r.data?.message);
check("Blood Donor", "row stores blood_group + age", r.data?.donor?.blood_group === "B+" && r.data?.donor?.age === 29, JSON.stringify(r.data?.donor));
const bloodId = r.data?.donor?.id;

r = await call("POST", "/api/blood/register", { name: "API Test Donor", phone: bloodPhone, age: "29", bloodGroup: "B+", location: "Test City" });
check("Blood Donor", "same phone -> 400 already registered", r.status === 400 && r.data?.message === "You are already registered as a blood donor");

r = await call("POST", "/api/blood/register", { name: "x" });
check("Blood Donor", "missing fields -> 400", r.status === 400);

r = await call("GET", "/api/blood");
check("Blood Donor", "GET /api/blood without a token -> 401 (donor list is admin-only)", r.status === 401);
r = await call("GET", "/api/blood", null, userToken);
check("Blood Donor", "GET /api/blood as a member -> 403", r.status === 403);
r = await call("GET", "/api/blood", null, adminToken);
check("Blood Donor", "GET /api/blood as admin lists donor (paginated)", r.status === 200 && r.data?.donors?.some((d) => d.id === bloodId) && r.data?.pagination?.page === 1);

r = await call("POST", "/api/blood/register", { name: "API Test Donor", phone: `81${RUN}02`, age: "17", bloodGroup: "B+", location: "Test City" });
check("Blood Donor", "age under 18 -> 400", r.status === 400);
r = await call("POST", "/api/blood/register", { name: "API Test Donor", phone: `81${RUN}03`, bloodGroup: "Q+", location: "Test City" });
check("Blood Donor", "unknown blood group -> 400", r.status === 400);

// ---------------- food donation ----------------
const foodPayload = { donorName: "API Test Food Donor", phone: `82${RUN}01`, foodType: "Rice", quantity: "5 kg", location: "Test Hall" };
// FoodDonation.jsx: donorName, phone, foodType, quantity, location
r = await call("POST", "/api/food/donate", foodPayload);
check("Food Donation", "POST /api/food/donate -> 201", r.status === 201 && r.data?.message === "Food donation added successfully.", r.data?.message);
check("Food Donation", "row stores name/food_type", r.data?.donation?.name === foodPayload.donorName && r.data?.donation?.food_type === "Rice");
const foodId = r.data?.donation?.id;

r = await call("POST", "/api/food/donate", foodPayload);
check("Food Donation", "identical donation -> 400", r.status === 400 && r.data?.message === "This food donation already exists.");

r = await call("GET", "/api/food");
check("Food Donation", "GET /api/food without a token -> 401", r.status === 401);
r = await call("GET", "/api/food", null, adminToken);
check("Food Donation", "GET /api/food as admin lists donation", r.status === 200 && r.data?.donations?.some((d) => d.id === foodId));

// ---------------- volunteer ----------------
// Volunteer.jsx: name, phone, email, skills, location, availability
r = await call("POST", "/api/volunteer/register", { name: "API Test Volunteer", phone: `83${RUN}01`, email: `vol.${RUN}@lifelinkpro.test`, skills: "Driving", location: "Test City", availability: "Part Time" });
check("Volunteer", "POST /api/volunteer/register -> 201", r.status === 201 && r.data?.message === "Volunteer registered successfully");
check("Volunteer", "skills/location/availability stored", r.data?.volunteer?.skills === "Driving" && r.data?.volunteer?.location === "Test City" && r.data?.volunteer?.availability === "Part Time", JSON.stringify(r.data?.volunteer));
const volunteerId = r.data?.volunteer?.id;

r = await call("POST", "/api/volunteer/register", { name: "API Test Volunteer Legacy", email: `legacy.${RUN}@lifelinkpro.test`, phone: `83${RUN}02`, address: "1 Test Road" });
check("Volunteer", "legacy payload with address -> 201", r.status === 201 && r.data?.volunteer?.address === "1 Test Road");
const volunteerLegacyId = r.data?.volunteer?.id;

r = await call("POST", "/api/volunteer/register", { phone: "1" });
check("Volunteer", "missing name -> 400", r.status === 400);

r = await call("POST", "/api/volunteer/register", { name: "API Test Volunteer Bad Phone", phone: "1" });
check("Volunteer", "invalid phone -> 400", r.status === 400);

r = await call("GET", "/api/volunteer");
check("Volunteer", "GET /api/volunteer without a token -> 401", r.status === 401);
r = await call("GET", "/api/volunteer", null, adminToken);
check("Volunteer", "GET /api/volunteer as admin lists volunteer", r.status === 200 && r.data?.volunteers?.some((v) => v.id === volunteerId));

// ---------------- events ----------------
// Events.jsx: eventName, description, date, location, organizer
r = await call("POST", "/api/events/create", { eventName: "API Test Event", description: "Test drive", date: "2026-12-05", location: "Test Park", organizer: "Test Org" });
check("Event Creation", "frontend payload (eventName) -> 201", r.status === 201 && r.data?.message === "Event created successfully", `${r.status} ${r.data?.message}`);
check("Event Creation", "title/organizer/participants stored", r.data?.event?.title === "API Test Event" && r.data?.event?.organizer === "Test Org" && r.data?.event?.participants === 0 && r.data?.event?.status === "Active");
check("Event Creation", "date returned as plain YYYY-MM-DD", r.data?.event?.date === "2026-12-05", `date=${JSON.stringify(r.data?.event?.date)}`);
const eventId = r.data?.event?.id;

r = await call("POST", "/api/events/create", { title: "API Test Event Legacy" });
check("Event Creation", "legacy payload (title) -> 201", r.status === 201 && r.data?.event?.date === null);
const eventLegacyId = r.data?.event?.id;

r = await call("POST", "/api/events/create", { description: "no title" });
check("Event Creation", "missing title -> 400", r.status === 400 && r.data?.message === "Event title is required.");

r = await call("PUT", `/api/events/join/${eventId}`);
check("Event Join", "join without signing in -> 401", r.status === 401);
r = await call("PUT", `/api/events/join/${eventId}`, null, userToken);
check("Event Join", "PUT /api/events/join/:id as member -> participants 1", r.status === 200 && r.data?.event?.participants === 1 && r.data?.event?.joined === true && r.data?.message === "Joined event successfully");
r = await call("PUT", `/api/events/join/${eventId}`, null, userToken);
check("Event Join", "same member joins again -> 409, still 1", r.status === 409);
const [[afterDouble]] = await db.query("SELECT participants FROM events WHERE id = ?", [eventId]);
check("Event Join", "no double counting in MySQL", afterDouble?.participants === 1);
r = await call("GET", "/api/events", null, userToken);
check("Event Join", "GET /api/events with token marks joined", r.data?.events?.find((e) => e.id === eventId)?.joined === true);
r = await call("PUT", `/api/events/leave/${eventId}`, null, userToken);
check("Event Join", "leave -> participants 0", r.status === 200 && r.data?.event?.participants === 0 && r.data?.event?.joined === false);
r = await call("PUT", `/api/events/join/${eventId}`, null, userToken);
check("Event Join", "join again after leaving -> participants 1", r.status === 200 && r.data?.event?.participants === 1);
r = await call("PUT", "/api/events/join/999999999", null, userToken);
check("Event Join", "unknown event -> 404", r.status === 404 && r.data?.message === "Event not found");

r = await call("GET", "/api/events");
check("Event Creation", "GET /api/events lists event", r.status === 200 && r.data?.events?.some((e) => e.id === eventId));

// ---------------- hospitals ----------------
// Hospitals.jsx: hospitalName, phone, address, services, emergencyAvailable
r = await call("POST", "/api/hospital/register", { hospitalName: "API Test Hospital", phone: "84000001", address: "2 Test Road", services: "ICU, Trauma", emergencyAvailable: "Available" });
check("Hospital", "frontend payload (hospitalName) -> 201", r.status === 201 && r.data?.message === "Hospital registered successfully", `${r.status} ${r.data?.message}`);
check("Hospital", "name/address/services/emergency stored", r.data?.hospital?.name === "API Test Hospital" && r.data?.hospital?.address === "2 Test Road" && r.data?.hospital?.services === "ICU, Trauma" && r.data?.hospital?.emergency_available === "Available");
const hospitalId = r.data?.hospital?.id;

r = await call("POST", "/api/hospital/register", { name: "API Test Hospital Legacy", location: "Test City", phone: "84000002" });
check("Hospital", "legacy payload (name, location) -> 201", r.status === 201 && r.data?.hospital?.location === "Test City");
const hospitalLegacyId = r.data?.hospital?.id;

r = await call("POST", "/api/hospital/register", { phone: "1" });
check("Hospital", "missing name -> 400", r.status === 400);

r = await call("GET", "/api/hospital");
check("Hospital", "GET /api/hospital lists hospital", r.status === 200 && r.data?.hospitals?.some((h) => h.id === hospitalId));

// ---------------- ambulances ----------------
// Ambulance.jsx: driverName, phone, vehicleNumber, location, availability
r = await call("POST", "/api/ambulance/register", { driverName: "API Test Driver", phone: "85000001", vehicleNumber: `TEST-${RUN}`, location: "Test City", availability: "Busy" });
check("Ambulance", "frontend payload (driverName) -> 201", r.status === 201 && r.data?.message === "Ambulance registered successfully", `${r.status} ${r.data?.message}`);
check("Ambulance", "name/vehicle_number/status stored", r.data?.ambulance?.name === "API Test Driver" && r.data?.ambulance?.vehicle_number === `TEST-${RUN}` && r.data?.ambulance?.status === "Busy");

r = await call("POST", "/api/ambulance/register", { name: "API Test Driver Legacy", phone: "85000002", location: "Test City" });
check("Ambulance", "legacy payload -> status defaults to available", r.status === 201 && r.data?.ambulance?.status === "available");

r = await call("POST", "/api/ambulance/register", { phone: "1" });
check("Ambulance", "missing fields -> 400", r.status === 400);

r = await call("GET", "/api/ambulance");
check("Ambulance", "GET /api/ambulance lists ambulances", r.status === 200 && r.data?.ambulances?.some((a) => a.name === "API Test Driver"));

// ---------------- emergency ----------------
const emergencyPayload = { name: "API Test Requester", emergencyType: "Fire", location: "Test Street", phone: `86${RUN}01`, description: "Test fire" };
// Emergency.jsx: name, emergencyType, location, phone, description
r = await call("POST", "/api/emergency", emergencyPayload);
check("Emergency", "POST /api/emergency -> 201", r.status === 201 && r.data?.message === "Emergency request created successfully.", r.data?.message);
check("Emergency", "type/description stored, status Pending", r.data?.emergency?.emergency_type === "Fire" && r.data?.emergency?.description === "Test fire" && r.data?.emergency?.status === "Pending" && r.data?.emergency?.user_id === null);
const emergencyId = r.data?.emergency?.id;

r = await call("POST", "/api/emergency", emergencyPayload);
check("Emergency", "duplicate request -> 400", r.status === 400 && r.data?.message === "Emergency request already exists.");

r = await call("GET", "/api/emergency");
check("Emergency", "GET /api/emergency without a token -> 401 (details are private)", r.status === 401);
r = await call("GET", "/api/emergency", null, adminToken);
check("Emergency", "GET /api/emergency as admin lists request", r.status === 200 && r.data?.emergencies?.some((e) => e.id === emergencyId));

// ---------------- admin authorization ----------------
r = await call("GET", "/api/admin/stats");
check("Admin Auth", "no token -> 401", r.status === 401 && r.data?.message === "No token provided");
r = await call("GET", "/api/manage/dashboard", null, userToken);
check("Admin Auth", "user token -> 403", r.status === 403 && r.data?.message === "Admin access required");
r = await call("GET", "/api/manage/dashboard", null, "not-a-jwt");
check("Admin Auth", "invalid token -> 401", r.status === 401);

// ---------------- admin dashboard ----------------
r = await call("GET", "/api/admin/stats", null, adminToken);
const s = r.data?.stats || {};
check("Admin Dashboard", "GET /api/admin/stats -> 7 counts", r.status === 200 && ["users", "bloodDonors", "foodDonations", "volunteers", "events", "hospitals", "ambulances"].every((k) => Number.isInteger(s[k])), JSON.stringify(s));

r = await call("GET", "/api/manage/dashboard", null, adminToken);
const d = r.data?.stats || {};
check("Admin Dashboard", "GET /api/manage/dashboard -> 7 counts", r.status === 200 && ["users", "hospitals", "volunteers", "bloodDonors", "foodDonations", "events", "emergencies"].every((k) => Number.isInteger(d[k])), JSON.stringify(d));

r = await call("GET", "/api/admin/all", null, adminToken);
check("Admin Dashboard", "GET /api/admin/all -> 8 collections", r.status === 200 && ["users", "bloodDonors", "foodDonations", "volunteers", "events", "hospitals", "ambulances", "emergencies"].every((k) => Array.isArray(r.data?.data?.[k])));

// ---------------- admin management (fields AdminManage.jsx renders) ----------------
r = await call("GET", "/api/manage/users", null, adminToken);
const u = r.data?.users?.find((x) => x.id === testUserId);
check("Admin Management", "users: id/name/email/role, no password", r.status === 200 && u && u.name && u.email && u.role && !("password" in u) && "updated_at" in u);

r = await call("GET", "/api/manage/hospitals", null, adminToken);
const h = r.data?.hospitals?.find((x) => x.id === hospitalId);
check("Admin Management", "hospitals: hospitalName/phone/address", h && h.hospitalName === "API Test Hospital" && h.phone && h.address && h.name === "API Test Hospital", JSON.stringify(h));

r = await call("GET", "/api/manage/volunteers", null, adminToken);
const v = r.data?.volunteers?.find((x) => x.id === volunteerId);
check("Admin Management", "volunteers: name/phone/email", v && v.name && v.phone && v.email);

r = await call("GET", "/api/manage/blood-donors", null, adminToken);
const b = r.data?.donors?.find((x) => x.id === bloodId);
check("Admin Management", "blood donors: name/phone/bloodGroup/location", b && b.bloodGroup === "B+" && b.blood_group === "B+" && b.location);

r = await call("GET", "/api/manage/food-donations", null, adminToken);
const f = r.data?.foodDonations?.find((x) => x.id === foodId);
check("Admin Management", "food: donorName/phone/foodType/quantity/location", f && f.donorName === foodPayload.donorName && f.foodType === "Rice" && f.quantity === "5 kg" && f.location);

r = await call("GET", "/api/manage/events", null, adminToken);
const e = r.data?.events?.find((x) => x.id === eventId);
check("Admin Management", "events: eventName/date/location", e && e.eventName === "API Test Event" && e.date === "2026-12-05" && e.location === "Test Park");

r = await call("GET", "/api/manage/emergencies", null, adminToken);
const em = r.data?.emergencies?.find((x) => x.id === emergencyId);
check("Admin Management", "emergencies: name/emergencyType/phone/location/description/status", em && em.name && em.emergencyType === "Fire" && em.phone && em.location && em.description === "Test fire" && em.status === "Pending");

// ---------------- delete operations (AdminManage sends row.id) ----------------
const deletes = [
  ["users", testUserId, "User deleted successfully"],
  ["hospitals", hospitalId, "Hospital deleted successfully"],
  ["hospitals", hospitalLegacyId, "Hospital deleted successfully"],
  ["volunteers", volunteerId, "Volunteer deleted successfully"],
  ["volunteers", volunteerLegacyId, "Volunteer deleted successfully"],
  ["blood-donors", bloodId, "Blood donor deleted successfully"],
  ["food-donations", foodId, "Food donation deleted successfully"],
  ["events", eventId, "Event deleted successfully"],
  ["events", eventLegacyId, "Event deleted successfully"],
  ["emergencies", emergencyId, "Emergency deleted successfully"]
];

// A user linked to an emergency must still be deletable (FK is ON DELETE SET NULL)
const [linkRes] = await db.query(
  "INSERT INTO emergencies (user_id, name, location, phone) VALUES (?, 'API Test Linked', 'Test', ?)",
  [testUserId, `87${RUN}01`]
);

for (const [resource, id, message] of deletes) {
  r = await call("DELETE", `/api/manage/${resource}/${id}`, null, adminToken);
  check("Delete", `DELETE /api/manage/${resource}/:id`, r.status === 200 && r.data?.message === message, `${r.status} ${r.data?.message}`);
}

const [[linked]] = await db.query("SELECT user_id FROM emergencies WHERE id = ?", [linkRes.insertId]);
check("Delete", "deleting a user nulls emergencies.user_id (FK SET NULL)", linked && linked.user_id === null);

r = await call("DELETE", `/api/manage/users/${testUserId}`, null, adminToken);
check("Delete", "deleting again -> 404", r.status === 404 && r.data?.message === "User not found");

r = await call("DELETE", `/api/manage/events/${eventId}`, null, userToken);
check("Delete", "non-admin delete -> 403", r.status === 403);

// ---------------- cleanup of rows with no delete endpoint ----------------
const [a] = await db.query("DELETE FROM ambulances WHERE name LIKE 'API Test%'");
const [em2] = await db.query("DELETE FROM emergencies WHERE name LIKE 'API Test%'");
const [leftover] = await db.query(
  `SELECT
     (SELECT COUNT(*) FROM users WHERE email LIKE 'apitest.%') +
     (SELECT COUNT(*) FROM blood_donors WHERE name LIKE 'API Test%') +
     (SELECT COUNT(*) FROM food_donations WHERE name LIKE 'API Test%') +
     (SELECT COUNT(*) FROM volunteers WHERE name LIKE 'API Test%') +
     (SELECT COUNT(*) FROM events WHERE title LIKE 'API Test%') +
     (SELECT COUNT(*) FROM hospitals WHERE name LIKE 'API Test%') +
     (SELECT COUNT(*) FROM ambulances WHERE name LIKE 'API Test%') +
     (SELECT COUNT(*) FROM emergencies WHERE name LIKE 'API Test%') AS n`
);
check("Cleanup", `test rows removed (ambulances ${a.affectedRows}, linked emergency ${em2.affectedRows})`, leftover[0].n === 0);
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
