// ======================================================
// SQL MIGRATIONS
// ------------------------------------------------------
// Applies every database/migrations/*.sql file (in file-name order)
// that has not been applied yet, and records it in schema_migrations.
// The .sql files are the single source of truth for the schema.
//
// Usage: npm run sql:migrate
// ======================================================

const fs = require("fs");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
  quiet: true
});

const mysql = require("mysql2/promise");
const connectionOptions = require("../config/connectionOptions");

const MIGRATIONS_DIR = path.join(__dirname, "..", "..", "database", "migrations");

const HINTS = {
  ECONNREFUSED: "Is the MySQL server running on DB_HOST:DB_PORT?",
  ENOTFOUND: "Check DB_HOST in server/.env.",
  ER_ACCESS_DENIED_ERROR: "Check DB_USER / DB_PASSWORD in server/.env.",
  ER_DBACCESS_DENIED_ERROR: "The MySQL user cannot create/use this database. Create it manually or grant privileges."
};

const migrate = async () => {

  const dbName = process.env.DB_NAME;

  if (!process.env.DB_USER || !dbName) {
    throw new Error("DB_USER and DB_NAME must be set in server/.env (see server/.env.example).");
  }

  // Connect without selecting a database, so it can be created on a fresh install
  const connection = await mysql.createConnection({
    ...connectionOptions(),
    multipleStatements: true
  });

  try {

    // Create the database if it does not exist yet
    const [databases] = await connection.query(
      "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?",
      [dbName]
    );

    if (databases.length === 0) {
      await connection.query(
        "CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
        [dbName]
      );
      console.log(`✅ Created database "${dbName}"`);
    }

    await connection.query("USE ??", [dbName]);

    // Bookkeeping: which migration files have already been applied
    await connection.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         version     VARCHAR(255) NOT NULL PRIMARY KEY,
         applied_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    const [appliedRows] = await connection.query("SELECT version FROM schema_migrations");
    const applied = new Set(appliedRows.map((row) => row.version));

    // Tables created by hand (e.g. in phpMyAdmin) are not altered by CREATE TABLE IF NOT EXISTS
    if (applied.size === 0) {
      const [[existing]] = await connection.query(
        `SELECT COUNT(*) AS count
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME <> 'schema_migrations'`,
        [dbName]
      );

      if (existing.count > 0) {
        console.warn(
          `⚠️  "${dbName}" already contains ${existing.count} table(s) that were not created by this script.\n` +
          "   Existing tables are left unchanged. If the API later reports \"Unknown column\",\n" +
          "   compare them with database/migrations/ (see README → Troubleshooting)."
        );
      }
    }

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    const pending = files.filter((file) => !applied.has(file));

    if (pending.length === 0) {
      console.log(`✅ "${dbName}" is up to date — no pending migrations.`);
      return;
    }

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");

      console.log(`⏳ Applying ${file} ...`);

      await connection.query(sql);

      await connection.query(
        "INSERT INTO schema_migrations (version) VALUES (?)",
        [file]
      );

      console.log(`✅ Applied ${file}`);
    }

    console.log(`✅ ${pending.length} migration(s) applied to "${dbName}".`);

  } finally {
    await connection.end();
  }
};

migrate().catch((error) => {
  console.error("❌ Migration failed:", error.message || error.code);

  if (HINTS[error.code]) {
    console.error(`   ${HINTS[error.code]}`);
  }

  process.exitCode = 1;
});
