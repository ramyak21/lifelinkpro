const fs = require("fs");

// MySQL connection settings from server/.env, shared by the API pool
// (config/database.js) and the SQL scripts (scripts/migrate.js, scripts/seed.js)
const connectionOptions = () => {

  const options = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  };

  // Encrypted connection, for hosted MySQL servers that require TLS.
  // DB_SSL_CA is an optional path to the provider's CA certificate (.pem).
  if (process.env.DB_SSL === "true") {
    options.ssl = {
      rejectUnauthorized: true,
      ...(process.env.DB_SSL_CA && { ca: fs.readFileSync(process.env.DB_SSL_CA, "utf8") })
    };
  }

  return options;
};

module.exports = connectionOptions;
