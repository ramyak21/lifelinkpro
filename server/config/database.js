const mysql = require("mysql2/promise");
const connectionOptions = require("./connectionOptions");

// Connection settings come from server/.env (see server/.env.example)
const pool = mysql.createPool({
  ...connectionOptions(),
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Return DATE columns (events.date) as "YYYY-MM-DD" strings, not timezone-shifted Date objects
  dateStrings: ["DATE"]
});

module.exports = pool;
