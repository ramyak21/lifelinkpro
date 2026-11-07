// SQL for emergency requests and their history (emergency_updates).
const pool = require("../config/database");

const ACTIVE_STATUSES = ["Pending", "Accepted", "In Progress"];

// Row lock for workflow changes (call inside a transaction)
async function lockById(connection, id) {
    const [rows] = await connection.query("SELECT * FROM emergencies WHERE id = ? FOR UPDATE", [id]);
    return rows[0] || null;
}

async function findActiveDuplicate(connection, { name, phone, location }) {
    const [rows] = await connection.query(
        `SELECT id FROM emergencies
         WHERE name = ? AND phone = ? AND location = ? AND status IN (?)
         LIMIT 1`,
        [name, phone, location, ACTIVE_STATUSES]
    );
    return rows[0] || null;
}

async function insert(connection, values) {
    const columns = Object.keys(values);
    const [result] = await connection.query(
        `INSERT INTO emergencies (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
        columns.map((c) => values[c])
    );
    return result.insertId;
}

async function updateFields(connection, id, values) {
    const columns = Object.keys(values);
    await connection.query(
        `UPDATE emergencies SET ${columns.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`,
        [...columns.map((c) => values[c]), id]
    );
}

async function addUpdate(connection, entry) {
    const columns = Object.keys(entry);
    await connection.query(
        `INSERT INTO emergency_updates (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
        columns.map((c) => entry[c])
    );
}

async function listUpdates(emergencyId, connection = pool) {
    const [rows] = await connection.query(
        `SELECT id, action, from_status, to_status, volunteer_id, volunteer_name,
                actor_user_id, actor_name, actor_role, note, created_at
         FROM emergency_updates WHERE emergency_id = ? ORDER BY created_at ASC, id ASC`,
        [emergencyId]
    );
    return rows;
}

// History for several requests in ONE query (avoids a query per request), grouped by request id
async function listUpdatesFor(emergencyIds) {
    const byId = new Map(emergencyIds.map((id) => [id, []]));
    if (emergencyIds.length === 0) return byId;
    const [rows] = await pool.query(
        `SELECT id, emergency_id, action, from_status, to_status, volunteer_id, volunteer_name,
                actor_user_id, actor_name, actor_role, note, created_at
         FROM emergency_updates WHERE emergency_id IN (?) ORDER BY created_at ASC, id ASC`,
        [emergencyIds]
    );
    for (const row of rows) byId.get(row.emergency_id)?.push(row);
    return byId;
}

// Full record for administrators: requester account + assigned volunteer
async function findDetail(id, connection = pool) {
    const [rows] = await connection.query(
        `SELECT t.*, t.emergency_type AS emergencyType,
                v.name AS assignedVolunteerName, v.phone AS assignedVolunteerPhone,
                v.email AS assignedVolunteerEmail, v.availability AS assignedVolunteerAvailability,
                u.name AS accountName, u.email AS accountEmail
         FROM emergencies t
         LEFT JOIN volunteers v ON v.id = t.assigned_volunteer_id
         LEFT JOIN users u ON u.id = t.user_id
         WHERE t.id = ?`,
        [id]
    );
    return rows[0] || null;
}

// A user's own requests (requester view: volunteer name only, no volunteer phone/email)
async function listForUser(userId) {
    const [rows] = await pool.query(
        `SELECT t.id, t.name, t.emergency_type, t.location, t.phone, t.description, t.status,
                t.assigned_at, t.resolved_at, t.created_at, t.updated_at,
                v.name AS assigned_volunteer_name
         FROM emergencies t
         LEFT JOIN volunteers v ON v.id = t.assigned_volunteer_id
         WHERE t.user_id = ?
         ORDER BY t.created_at DESC, t.id DESC
         LIMIT 100`,
        [userId]
    );
    return rows;
}

// Requests assigned to a volunteer profile (volunteer view: needs the requester's contact details)
async function listForVolunteer(volunteerId) {
    const [rows] = await pool.query(
        `SELECT t.id, t.name, t.emergency_type, t.location, t.phone, t.description, t.status,
                t.assigned_at, t.resolved_at, t.created_at, t.updated_at
         FROM emergencies t
         WHERE t.assigned_volunteer_id = ?
         ORDER BY FIELD(t.status, 'In Progress', 'Accepted', 'Pending', 'Resolved', 'Cancelled'), t.updated_at DESC
         LIMIT 100`,
        [volunteerId]
    );
    return rows;
}

module.exports = {
    ACTIVE_STATUSES,
    lockById,
    findActiveDuplicate,
    insert,
    updateFields,
    addUpdate,
    listUpdates,
    listUpdatesFor,
    findDetail,
    listForUser,
    listForVolunteer
};
