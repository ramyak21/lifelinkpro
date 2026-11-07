// ======================================================
// ACCOUNTS — admin changes and self-service profile/password
// ------------------------------------------------------
// Integrity rules enforced here (not only in the admin UI):
//   * an administrator cannot delete their own account or remove their own admin role
//   * the last administrator cannot be deleted or demoted
//   * deleting an account keeps its records (user_id -> NULL via foreign keys)
//     and removes its event participations, decrementing those events' counts
// ======================================================

const bcrypt = require("bcrypt");
const pool = require("../config/database");
const { withTransaction } = require("../repositories/transaction");
const { badRequest, conflict, notFound } = require("../utils/httpError");

const PUBLIC_COLUMNS = "id, name, email, role, created_at, updated_at";

// bcrypt only uses the first 72 bytes of a password
function checkPasswordPolicy(password, label = "Password") {
    if (typeof password !== "string" || password.length === 0) throw badRequest(`${label} is required.`);
    if (password.length < 8) throw badRequest(`${label} must be at least 8 characters.`);
    if (Buffer.byteLength(password, "utf8") > 72) throw badRequest(`${label} must be at most 72 bytes.`);
}

const lockUser = async (connection, id) => {
    const [rows] = await connection.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ? FOR UPDATE`, [id]);
    return rows[0] || null;
};

const otherAdminCount = async (connection, id) => {
    const [[{ n }]] = await connection.query("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND id <> ?", [id]);
    return n;
};

async function updateByAdmin(id, { name, role }, admin) {
    if (id === admin.id && role !== "admin") {
        throw conflict("You can't remove your own administrator role.");
    }
    return withTransaction(async (connection) => {
        const user = await lockUser(connection, id);
        if (!user) throw notFound("User not found");
        if (user.role === "admin" && role !== "admin" && (await otherAdminCount(connection, id)) === 0) {
            throw conflict("LifeLink Pro needs at least one administrator.");
        }
        await connection.query("UPDATE users SET name = ?, role = ? WHERE id = ?", [name, role, id]);
        return lockUser(connection, id);
    });
}

async function deleteByAdmin(id, admin) {
    if (id === admin.id) {
        throw conflict("You can't delete your own account.");
    }
    return withTransaction(async (connection) => {
        const user = await lockUser(connection, id);
        if (!user) throw notFound("User not found");
        if (user.role === "admin" && (await otherAdminCount(connection, id)) === 0) {
            throw conflict("LifeLink Pro needs at least one administrator.");
        }
        // Keep event totals consistent before the participations disappear with the account
        await connection.query(
            `UPDATE events e JOIN event_participants p ON p.event_id = e.id AND p.user_id = ?
             SET e.participants = GREATEST(CAST(e.participants AS SIGNED) - 1, 0)`,
            [id]
        );
        await connection.query("DELETE FROM users WHERE id = ?", [id]);
    });
}

async function getProfile(id) {
    const [rows] = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`, [id]);
    if (!rows[0]) throw notFound("User not found");
    return rows[0];
}

async function updateOwnName(id, name) {
    await pool.query("UPDATE users SET name = ? WHERE id = ?", [name, id]);
    return getProfile(id);
}

async function changeOwnPassword(id, currentPassword, newPassword) {
    if (typeof currentPassword !== "string" || currentPassword.length === 0) {
        throw badRequest("Current password is required.");
    }
    checkPasswordPolicy(newPassword, "New password");
    const [[row]] = await pool.query("SELECT password FROM users WHERE id = ?", [id]);
    if (!row) throw notFound("User not found");
    if (!(await bcrypt.compare(currentPassword, row.password))) {
        throw badRequest("Current password is incorrect.");
    }
    if (await bcrypt.compare(newPassword, row.password)) {
        throw badRequest("Choose a password you haven't used for this account.");
    }
    await pool.query("UPDATE users SET password = ? WHERE id = ?", [await bcrypt.hash(newPassword, 10), id]);
}

module.exports = { checkPasswordPolicy, updateByAdmin, deleteByAdmin, getProfile, updateOwnName, changeOwnPassword };
