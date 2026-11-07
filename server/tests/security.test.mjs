// ======================================================
// SECURITY TESTS
// ------------------------------------------------------
// Checks the post-migration hardening: no password/secret exposure,
// admin authorization (incl. deleted/demoted admins), input
// validation, safe error messages, SQL-injection attempts, CORS,
// headers, and the server's startup configuration checks.
// Needs the API running (npm run dev) and the demo seed loaded
// (npm run sql:seed). Every row it creates is removed at the end.
// Development databases only.
//
// Usage: npm run test:security
// ======================================================

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const SERVER_DIR = fileURLToPath(new URL("..", import.meta.url));
require("dotenv").config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const connectionOptions = require("../config/connectionOptions");

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run tests while NODE_ENV=production (they create and delete data).");
  process.exit(1);
}

const BASE = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "admin@lifelinkpro.test";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "Admin@123";
const CLIENT_ORIGIN = (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim().replace(/\/+$/, "");
const RUN = Date.now().toString().slice(-6);

const results = [];
const errorResponses = [];

const check = (group, name, ok, detail = "") => {
  results.push({ group, name, ok: !!ok, detail });
};

const request = async (method, path, { json, body, token, headers = {}, base = BASE } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: json !== undefined ? JSON.stringify(json) : body
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* non-JSON */ }
  if (res.status >= 400) {
    errorResponses.push({ path, status: res.status, text, type: res.headers.get("content-type") || "" });
  }
  return { status: res.status, data, text, headers: res.headers };
};

const db = await mysql.createConnection({ ...connectionOptions(), database: process.env.DB_NAME });

const POST_ENDPOINTS = [
  "/api/auth/register", "/api/auth/login", "/api/blood/register", "/api/food/donate",
  "/api/volunteer/register", "/api/events/create", "/api/hospital/register",
  "/api/ambulance/register", "/api/emergency"
];
// Admin-only reads. The four legacy lists (/api/blood, /api/food, /api/volunteer, /api/emergency)
// return personal data, so they are admin-only too.
const ADMIN_GETS = [
  "/api/admin/stats", "/api/admin/all", "/api/admin/summary", "/api/manage/dashboard", "/api/manage/users",
  "/api/manage/hospitals", "/api/manage/volunteers", "/api/manage/blood-donors",
  "/api/manage/food-donations", "/api/manage/events", "/api/manage/emergencies", "/api/manage/ambulances",
  "/api/blood", "/api/food", "/api/volunteer", "/api/emergency"
];
const ADMIN_DELETES = ["users", "hospitals", "volunteers", "blood-donors", "food-donations", "events", "emergencies", "ambulances"]
  .map((resource) => `/api/manage/${resource}/999999999`);
const ADMIN_ROUTES = [...ADMIN_GETS.map((p) => ["GET", p]), ...ADMIN_DELETES.map((p) => ["DELETE", p])];
const PUBLIC_GETS = ["/", "/api/events", "/api/hospital", "/api/ambulance"];

const login = async (email, password) =>
  (await request("POST", "/api/auth/login", { json: { email, password } })).data?.token;

// ---------------- setup ----------------
const adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
check("Setup", "demo admin can log in", !!adminToken);
const adminId = adminToken ? jwt.decode(adminToken).id : null;

const userEmail = `sectest.${RUN}@lifelinkpro.test`;
let r = await request("POST", "/api/auth/register", { json: { name: "SecTest User", email: userEmail, password: "Test@12345" } });
check("Password exposure", "register response contains no password", r.status === 201 && !/password|\$2[aby]\$/i.test(JSON.stringify(r.data?.user)));

r = await request("POST", "/api/auth/login", { json: { email: userEmail, password: "Test@12345" } });
const userToken = r.data?.token;
check("Password exposure", "login response contains no password", r.status === 200 && r.data?.user && !("password" in r.data.user) && !/\$2[aby]\$/.test(r.text));

// ---------------- password / secret exposure ----------------
const secretValues = [process.env.JWT_SECRET, process.env.DB_PASSWORD].filter((value) => value && value.length >= 4);
const findLeaks = (text) => [
  ...(/\$2[aby]\$\d\d\$/.test(text) ? ["bcrypt hash"] : []),
  ...(/"(password|password_hash|passwordHash|hashed_?password)"\s*:/i.test(text) ? ["password field"] : []),
  ...(secretValues.some((value) => text.includes(value)) ? ["secret value"] : [])
];

for (const path of [...ADMIN_GETS, ...PUBLIC_GETS]) {
  r = await request("GET", path, { token: ADMIN_GETS.includes(path) ? adminToken : undefined });
  const leaks = findLeaks(r.text);
  check("Password exposure", `GET ${path} exposes no password/secret`, r.status === 200 && leaks.length === 0, `${r.status} ${leaks.join(", ")}`);
}

r = await request("GET", "/api/admin/all", { token: adminToken });
const allUsers = r.data?.data?.users || [];
check("Password exposure", "/api/admin/all users still have id/name/email/role", allUsers.length > 0 && allUsers.every((x) => x.id && x.name && x.email && x.role && !("password" in x)));

// ---------------- authorization matrix (all admin routes) ----------------
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const tokenCases = [
  ["no token -> 401", undefined, 401],
  ["malformed token -> 401", "not-a-jwt", 401],
  ["token signed with another secret -> 401", jwt.sign({ id: adminId, role: "admin" }, "not-the-real-secret"), 401],
  ["expired admin token -> 401", jwt.sign({ id: adminId, role: "admin", exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET), 401],
  ['unsigned "alg: none" admin token -> 401', `${b64({ alg: "none", typ: "JWT" })}.${b64({ id: adminId, role: "admin" })}.`, 401],
  ["normal user token -> 403", userToken, 403]
];

for (const [name, token, expected] of tokenCases) {
  const statuses = [];
  for (const [method, path] of ADMIN_ROUTES) {
    statuses.push((await request(method, path, { token })).status);
  }
  check("Authorization", `${name} on all ${ADMIN_ROUTES.length} admin routes`, statuses.every((s) => s === expected), `got ${[...new Set(statuses)].join(",")}`);
}

r = await request("GET", "/api/manage/dashboard", { headers: { Authorization: "Bearer" } });
check("Authorization", '"Bearer" without a token -> 401', r.status === 401);

const adminStatuses = [];
for (const [method, path] of ADMIN_ROUTES) {
  adminStatuses.push((await request(method, path, { token: adminToken })).status);
}
check("Authorization", `admin token allowed on all ${ADMIN_ROUTES.length} admin routes (GET 200, DELETE of missing id 404)`,
  adminStatuses.every((s, i) => s === (ADMIN_ROUTES[i][0] === "GET" ? 200 : 404)), `got ${adminStatuses.join(",")}`);

// ---------------- deleted / demoted admins ----------------
const hash = await bcrypt.hash("SecTest@123", 10);
const [deletedAdmin] = await db.query("INSERT INTO users (name, email, password, role) VALUES ('SecTest Admin', ?, ?, 'admin')", [`sectest.admin1.${RUN}@lifelinkpro.test`, hash]);
const [demotedAdmin] = await db.query("INSERT INTO users (name, email, password, role) VALUES ('SecTest Admin', ?, ?, 'admin')", [`sectest.admin2.${RUN}@lifelinkpro.test`, hash]);
const deletedToken = await login(`sectest.admin1.${RUN}@lifelinkpro.test`, "SecTest@123");
const demotedToken = await login(`sectest.admin2.${RUN}@lifelinkpro.test`, "SecTest@123");
check("Authorization", "second admin works before changes", (await request("GET", "/api/manage/dashboard", { token: deletedToken })).status === 200);

await request("DELETE", `/api/manage/users/${deletedAdmin.insertId}`, { token: adminToken });
await db.query("UPDATE users SET role = 'user' WHERE id = ?", [demotedAdmin.insertId]);

r = await request("GET", "/api/manage/dashboard", { token: deletedToken });
check("Authorization", "token of a deleted admin -> 401", r.status === 401, `${r.status}`);
r = await request("DELETE", "/api/manage/users/999999999", { token: demotedToken });
check("Authorization", "token of a demoted admin -> 403", r.status === 403, `${r.status}`);

// ---------------- input validation (never 500, always JSON) ----------------
const allStatus = async (fn) => {
  const statuses = [];
  for (const path of POST_ENDPOINTS) statuses.push(await fn(path));
  return statuses;
};

let statuses = await allStatus(async (path) => (await request("POST", path, { body: "{bad json", headers: { "Content-Type": "application/json" } })).status);
check("Validation", `malformed JSON -> 400 on all ${POST_ENDPOINTS.length} POST endpoints`, statuses.every((s) => s === 400), statuses.join(","));

statuses = await allStatus(async (path) => (await request("POST", path)).status);
check("Validation", `missing body -> 400 on all ${POST_ENDPOINTS.length} POST endpoints`, statuses.every((s) => s === 400), statuses.join(","));

statuses = await allStatus(async (path) => (await request("POST", path, { json: { name: { $ne: null }, email: { $gt: "" } } })).status);
check("Validation", `object values -> 400 on all ${POST_ENDPOINTS.length} POST endpoints`, statuses.every((s) => s === 400), statuses.join(","));

r = await request("POST", "/api/emergency", { json: [] });
check("Validation", "JSON array body -> 400", r.status === 400);

r = await request("POST", "/api/emergency", { json: { name: "x".repeat(200000) } });
check("Validation", "body over 100kb -> 413 JSON", r.status === 413 && r.data?.success === false);

const registerCases = [
  ["missing password", { name: "SecTest", email: `sectest.v1.${RUN}@lifelinkpro.test` }],
  ["missing name", { email: `sectest.v2.${RUN}@lifelinkpro.test`, password: "x" }],
  ["blank name", { name: "   ", email: `sectest.v3.${RUN}@lifelinkpro.test`, password: "x" }],
  ["invalid email", { name: "SecTest", email: "not-an-email", password: "x" }],
  ["password as a number", { name: "SecTest", email: `sectest.v4.${RUN}@lifelinkpro.test`, password: 12345 }]
];
for (const [name, body] of registerCases) {
  r = await request("POST", "/api/auth/register", { json: body });
  check("Validation", `register: ${name} -> 400`, r.status === 400, `${r.status} ${r.data?.message}`);
}

for (const [name, body] of [["missing fields", {}], ["email as a number", { email: 1, password: "x" }]]) {
  r = await request("POST", "/api/auth/login", { json: body });
  check("Validation", `login: ${name} -> 400`, r.status === 400, `${r.status} ${r.data?.message}`);
}

const long = "L".repeat(300);
const tooLong = [
  ["/api/auth/register", { name: long, email: `sectest.long.${RUN}@lifelinkpro.test`, password: "Test@12345" }],
  ["/api/blood/register", { name: long, phone: `88${RUN}1`, bloodGroup: "O+", location: "X" }],
  ["/api/food/donate", { donorName: long, phone: "1", foodType: "Rice", quantity: "1", location: "X" }],
  ["/api/volunteer/register", { name: long }],
  ["/api/events/create", { eventName: long }],
  ["/api/hospital/register", { hospitalName: long }],
  ["/api/ambulance/register", { driverName: long, phone: "1", location: "X" }],
  ["/api/emergency", { name: long, phone: "1", location: "X" }]
];
statuses = [];
for (const [path, body] of tooLong) statuses.push((await request("POST", path, { json: body })).status);
check("Validation", `too-long text -> 400 on ${tooLong.length} endpoints`, statuses.every((s) => s === 400), statuses.join(","));

const badValues = [
  ["event date '31-12-2026'", "/api/events/create", { eventName: "SecTest Value", date: "31-12-2026" }],
  ["event date '2026-02-30'", "/api/events/create", { eventName: "SecTest Value", date: "2026-02-30" }],
  ["blood age 'abc'", "/api/blood/register", { name: "SecTest Value", phone: `88${RUN}2`, age: "abc", bloodGroup: "O+", location: "X" }],
  ["blood age 300", "/api/blood/register", { name: "SecTest Value", phone: `88${RUN}3`, age: 300, bloodGroup: "O+", location: "X" }],
  ["blood age -5", "/api/blood/register", { name: "SecTest Value", phone: `88${RUN}4`, age: -5, bloodGroup: "O+", location: "X" }]
];
for (const [name, path, body] of badValues) {
  r = await request("POST", path, { json: body });
  check("Validation", `${name} -> 400`, r.status === 400, `${r.status} ${r.data?.message}`);
}

const probeEvent = (await request("POST", "/api/events/create", { json: { eventName: `SecTest Id Event ${RUN}` } })).data?.event;
const badIds = ["abc", `${probeEvent?.id}abc`, "0", "-1", "1.5", "1e3", "1%20OR%201%3D1", "99999999999999999999"];
statuses = [];
for (const id of badIds) {
  statuses.push((await request("DELETE", `/api/manage/events/${id}`, { token: adminToken })).status);
  statuses.push((await request("PUT", `/api/events/join/${id}`)).status);
}
check("Validation", `invalid :id values -> 400 (${badIds.length} values x DELETE + join)`, statuses.every((s) => s === 400), statuses.join(","));
const [[probeAfter]] = await db.query("SELECT COUNT(*) AS n, MAX(participants) AS p FROM events WHERE id = ?", [probeEvent?.id ?? 0]);
check("Validation", "probe event untouched by invalid ids", probeAfter.n === 1 && probeAfter.p === 0);

// ---------------- SQL injection attempts ----------------
r = await request("POST", "/api/auth/login", { json: { email: "' OR '1'='1' -- ", password: "x" } });
check("SQL injection", "login with ' OR '1'='1 -> 400, no token", r.status === 400 && !r.data?.token);
r = await request("POST", "/api/auth/login", { json: { email: `${ADMIN_EMAIL}' -- `, password: "wrong" } });
check("SQL injection", "login with comment-out of password check -> 400", r.status === 400 && !r.data?.token);

const injectionName = "Robert'); DROP TABLE users; --";
r = await request("POST", "/api/auth/register", { json: { name: injectionName, email: `sectest.inj.${RUN}@lifelinkpro.test`, password: "Test@12345" } });
const [[injected]] = await db.query("SELECT name FROM users WHERE email = ?", [`sectest.inj.${RUN}@lifelinkpro.test`]);
check("SQL injection", "malicious name stored as plain text, users table intact", r.status === 201 && injected?.name === injectionName);

// ---------------- error responses never leak internals ----------------
const internals = /sql|column|at row|ER_[A-Z]|truncated|incorrect|bind parameters|node_modules|\bat\s+\S+\s+\(|syntaxerror|typeerror|<html|<pre/i;
const nonJson = errorResponses.filter((e) => !e.type.includes("application/json"));
const leaky = errorResponses.filter((e) => internals.test(e.text));
const serverErrors = errorResponses.filter((e) => e.status >= 500);
check("Error responses", `all ${errorResponses.length} error responses are JSON`, nonJson.length === 0, nonJson.map((e) => `${e.status} ${e.path}`).join("; "));
check("Error responses", "no error response exposes SQL/stack details", leaky.length === 0, leaky.map((e) => e.text.slice(0, 80)).join("; "));
check("Error responses", "no 5xx responses for invalid input", serverErrors.length === 0, serverErrors.map((e) => `${e.status} ${e.path}`).join("; "));

// ---------------- CORS and headers ----------------
r = await request("GET", "/api/blood", { headers: { Origin: CLIENT_ORIGIN } });
check("CORS", `allowed origin ${CLIENT_ORIGIN} gets Access-Control-Allow-Origin`, r.headers.get("access-control-allow-origin") === CLIENT_ORIGIN);
r = await request("GET", "/api/blood", { headers: { Origin: "https://evil.example" } });
check("CORS", "other origins get no Access-Control-Allow-Origin", r.headers.get("access-control-allow-origin") === null);
r = await request("OPTIONS", "/api/auth/login", { headers: { Origin: CLIENT_ORIGIN, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,authorization" } });
check("CORS", "preflight from allowed origin succeeds", r.status === 204 && r.headers.get("access-control-allow-origin") === CLIENT_ORIGIN && /authorization/i.test(r.headers.get("access-control-allow-headers") || ""));
r = await request("GET", "/");
check("Headers", "X-Powered-By header removed", r.headers.get("x-powered-by") === null);

// ---------------- startup configuration checks ----------------
const runServer = (env) => spawnSync(process.execPath, ["server.js"], {
  cwd: SERVER_DIR, env: { ...process.env, PORT: "0", ...env }, encoding: "utf8", timeout: 15000
});
const strongSecret = "s".repeat(48);
let run = runServer({ JWT_SECRET: "" });
check("Startup config", "missing JWT_SECRET -> refuses to start", run.status === 1 && /Missing environment variables: .*JWT_SECRET/.test(run.stderr));
run = runServer({ NODE_ENV: "production", CLIENT_URL: "", JWT_SECRET: strongSecret });
check("Startup config", "production without CLIENT_URL -> refuses to start", run.status === 1 && /CLIENT_URL/.test(run.stderr));
run = runServer({ NODE_ENV: "production", CLIENT_URL: "https://lifelink.example", JWT_SECRET: "short-secret" });
check("Startup config", "production with a short JWT_SECRET -> refuses to start", run.status === 1 && /at least 32 characters/.test(run.stderr));

run = spawnSync(process.execPath, ["scripts/seed.js"], { cwd: SERVER_DIR, env: { ...process.env, NODE_ENV: "production" }, encoding: "utf8", timeout: 15000 });
check("Startup config", "demo seed refuses to run with NODE_ENV=production", run.status === 1 && /Refusing to load demo seed data/.test(run.stderr));

// A correctly configured production server starts and only accepts its CLIENT_URL
const PROD_PORT = 5099;
const prod = spawn(process.execPath, ["server.js"], {
  cwd: SERVER_DIR,
  env: { ...process.env, NODE_ENV: "production", CLIENT_URL: "https://lifelink.example", JWT_SECRET: strongSecret, PORT: String(PROD_PORT) }
});
let prodOutput = "";
prod.stdout.on("data", (chunk) => { prodOutput += chunk; });
prod.stderr.on("data", (chunk) => { prodOutput += chunk; });
for (let i = 0; i < 50 && !/MySQL Database Connected/.test(prodOutput); i++) {
  await new Promise((resolve) => setTimeout(resolve, 200));
}
check("Startup config", "production config starts and connects to MySQL", /Server running/.test(prodOutput) && /MySQL Database Connected/.test(prodOutput), prodOutput.trim());
const prodBase = `http://localhost:${PROD_PORT}`;
r = await request("GET", "/api/blood", { base: prodBase, headers: { Origin: "https://lifelink.example" } });
const prodAllowed = r.headers.get("access-control-allow-origin");
r = await request("GET", "/api/blood", { base: prodBase, headers: { Origin: "http://localhost:5173" } });
check("Startup config", "production CORS allows only CLIENT_URL", prodAllowed === "https://lifelink.example" && r.headers.get("access-control-allow-origin") === null);
r = await request("POST", "/api/emergency", { base: prodBase, body: "{bad", headers: { "Content-Type": "application/json" } });
check("Startup config", "production error responses are JSON without stack traces", r.status === 400 && r.data?.success === false && !internals.test(r.text));
prod.kill();

// ---------------- cleanup ----------------
await db.query("DELETE FROM users WHERE email LIKE 'sectest.%'");
await db.query("DELETE FROM events WHERE title LIKE 'SecTest%' OR title LIKE 'LLLLLLLLLL%'");
await db.query("DELETE FROM blood_donors WHERE name LIKE 'SecTest%' OR name LIKE 'LLLLLLLLLL%'");
await db.query("DELETE FROM food_donations WHERE name LIKE 'LLLLLLLLLL%'");
await db.query("DELETE FROM volunteers WHERE name LIKE 'LLLLLLLLLL%'");
await db.query("DELETE FROM hospitals WHERE name LIKE 'LLLLLLLLLL%'");
await db.query("DELETE FROM ambulances WHERE name LIKE 'LLLLLLLLLL%'");
await db.query("DELETE FROM emergencies WHERE name LIKE 'LLLLLLLLLL%'");
const [[leftover]] = await db.query(
  `SELECT
     (SELECT COUNT(*) FROM users WHERE email LIKE 'sectest.%') +
     (SELECT COUNT(*) FROM events WHERE title LIKE 'SecTest%') +
     (SELECT COUNT(*) FROM blood_donors WHERE name LIKE 'SecTest%') AS n`
);
check("Cleanup", "test rows removed", leftover.n === 0);
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
