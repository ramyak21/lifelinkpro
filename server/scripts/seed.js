// ======================================================
// SQL SEED — DEVELOPMENT / DEMO DATA ONLY
// ------------------------------------------------------
// Runs every database/seeds/*.sql file in file-name order.
// Seed files only insert rows that are missing, so this
// script is safe to run more than once.
//
// Usage: npm run sql:seed   (run npm run sql:migrate first)
// ======================================================

const fs = require("fs");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
  quiet: true
});

const mysql = require("mysql2/promise");
const connectionOptions = require("../config/connectionOptions");

const SEEDS_DIR = path.join(__dirname, "..", "..", "database", "seeds");

const HINTS = {
  ECONNREFUSED: "Is the MySQL server running on DB_HOST:DB_PORT?",
  ENOTFOUND: "Check DB_HOST in server/.env.",
  ER_ACCESS_DENIED_ERROR: "Check DB_USER / DB_PASSWORD in server/.env.",
  ER_BAD_DB_ERROR: "The database does not exist yet. Run: npm run sql:migrate",
  ER_NO_SUCH_TABLE: "The tables do not exist yet. Run: npm run sql:migrate"
};

const seed = async () => {

  // Demo data must never be loaded into a production database
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to load demo seed data while NODE_ENV=production.");
  }

  if (!process.env.DB_USER || !process.env.DB_NAME) {
    throw new Error("DB_USER and DB_NAME must be set in server/.env (see server/.env.example).");
  }

  const connection = await mysql.createConnection({
    ...connectionOptions(),
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {

    const files = fs
      .readdirSync(SEEDS_DIR)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(SEEDS_DIR, file), "utf8");

      console.log(`⏳ Running ${file} ...`);

      const [results] = await connection.query(sql);

      // One result per statement — count the rows actually inserted
      const inserted = [].concat(results).reduce(
        (total, result) => total + (result.affectedRows || 0),
        0
      );

      console.log(`✅ ${file}: ${inserted} row(s) inserted`);
    }

    console.log(
      `✅ Demo data loaded into "${process.env.DB_NAME}" (existing rows were left untouched).\n` +
      "   Demo logins are listed at the top of database/seeds/001_initial_seed.sql."
    );

  } finally {
    await connection.end();
  }
};

seed().catch((error) => {
  console.error("❌ Seed failed:", error.message || error.code);

  if (HINTS[error.code]) {
    console.error(`   ${HINTS[error.code]}`);
  }

  process.exitCode = 1;
});
