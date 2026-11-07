const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Stop early with a clear message when required settings are missing (see .env.example)
const isProduction = process.env.NODE_ENV === "production";

const missingEnv = ["DB_USER", "DB_NAME", "JWT_SECRET", ...(isProduction ? ["CLIENT_URL"] : [])]
  .filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
  console.error(`❌ Missing environment variables: ${missingEnv.join(", ")} (see server/.env.example)`);
  process.exit(1);
}

if (isProduction && process.env.JWT_SECRET.length < 32) {
  console.error("❌ JWT_SECRET must be at least 32 characters long in production.");
  process.exit(1);
}

const pool = require("./config/database");
const { requireFlatJsonBody } = require("./middleware/validation");
const { errorHandler } = require("./middleware/errorHandler");
const { securityHeaders, requestLogger } = require("./middleware/security");

const app = express();

// Don't advertise the framework in response headers
app.disable("x-powered-by");

// Behind a reverse proxy, TRUST_PROXY (e.g. 1 = one proxy hop) makes req.ip the real
// client address, which the login/registration rate limits rely on
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set("trust proxy", Number.isInteger(hops) ? hops : process.env.TRUST_PROXY);
}

// Test MySQL Connection
pool.getConnection()
  .then((connection) => {
    console.log("✅ MySQL Database Connected");
    connection.release();
  })
  .catch((error) => {
    console.error("❌ MySQL Connection Failed:", error.message);
  });

// Browsers may only call the API from the frontend URL(s) in CLIENT_URL (comma-separated):
// the user portal and the admin portal
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((url) => url.trim().replace(/\/+$/, ""))
  .filter(Boolean);

// Middlewares
app.use(requestLogger);
app.use(securityHeaders);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(requireFlatJsonBody);

// Home Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 Welcome to LifeLink Pro API",
  });
});

// AUTH
app.use("/api/auth", require("./routes/authRoutes"));

// EMERGENCY
app.use("/api/emergency", require("./routes/emergencyRoutes"));

// BLOOD
app.use("/api/blood", require("./routes/bloodRoutes"));

// FOOD
app.use("/api/food", require("./routes/foodRoutes"));

// VOLUNTEER
app.use("/api/volunteer", require("./routes/volunteerRoutes"));

// EVENTS
app.use("/api/events", require("./routes/eventRoutes"));

// HOSPITAL
app.use("/api/hospital", require("./routes/hospitalRoutes"));

// AMBULANCE
app.use("/api/ambulance", require("./routes/ambulanceRoutes"));

// SIGNED-IN USER (own profile, requests, assignments)
app.use("/api/me", require("./routes/meRoutes"));

// ADMIN
app.use("/api/admin", require("./routes/adminRoutes"));

// ADMIN MANAGEMENT
app.use("/api/manage", require("./routes/manageRoutes"));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API Route Not Found",
  });
});

// Error Handler — invalid JSON, oversized bodies and unexpected errors return safe JSON
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
