// Runs fn(connection) inside a MySQL transaction on one pooled connection.
// Commits when fn resolves, rolls back when it throws, always releases.
const pool = require("../config/database");

async function withTransaction(fn) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await fn(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = { withTransaction };
