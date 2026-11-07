// ======================================================
// EVENTS — listing and participation
// ------------------------------------------------------
// Joining requires a signed-in account and is recorded in event_participants
// (one row per user and event), so the same person cannot be counted twice.
// events.participants is the displayed total; it also contains anonymous joins
// recorded before participation tracking existed (migration 002).
// ======================================================

const pool = require("../config/database");
const { withTransaction } = require("../repositories/transaction");
const { badRequest, conflict, notFound } = require("../utils/httpError");

// Public list (newest first). With an account, each event says whether they joined it.
async function list(account) {
    if (!account) {
        const [events] = await pool.query("SELECT * FROM events ORDER BY created_at DESC, id DESC");
        return events;
    }
    const [events] = await pool.query(
        `SELECT e.*, (p.user_id IS NOT NULL) AS joined
         FROM events e
         LEFT JOIN event_participants p ON p.event_id = e.id AND p.user_id = ?
         ORDER BY e.created_at DESC, e.id DESC`,
        [account.id]
    );
    return events.map((event) => ({ ...event, joined: Boolean(event.joined) }));
}

const lockEvent = async (connection, id) => {
    const [rows] = await connection.query(
        "SELECT *, (date IS NOT NULL AND date < CURDATE()) AS is_past FROM events WHERE id = ? FOR UPDATE",
        [id]
    );
    return rows[0] || null;
};

const reload = async (connection, id) => {
    const [[event]] = await connection.query("SELECT * FROM events WHERE id = ?", [id]);
    return event;
};

async function join(eventId, account) {
    return withTransaction(async (connection) => {
        const event = await lockEvent(connection, eventId);
        if (!event) throw notFound("Event not found");
        if (event.is_past) throw badRequest("This event has already taken place.");

        const [existing] = await connection.query(
            "SELECT 1 FROM event_participants WHERE event_id = ? AND user_id = ?",
            [eventId, account.id]
        );
        if (existing.length > 0) throw conflict("You have already joined this event.");

        await connection.query("INSERT INTO event_participants (event_id, user_id) VALUES (?, ?)", [eventId, account.id]);
        await connection.query("UPDATE events SET participants = participants + 1 WHERE id = ?", [eventId]);
        return { ...(await reload(connection, eventId)), joined: true };
    });
}

async function leave(eventId, account) {
    return withTransaction(async (connection) => {
        const event = await lockEvent(connection, eventId);
        if (!event) throw notFound("Event not found");

        const [result] = await connection.query(
            "DELETE FROM event_participants WHERE event_id = ? AND user_id = ?",
            [eventId, account.id]
        );
        if (result.affectedRows === 0) throw notFound("You haven't joined this event.");

        await connection.query(
            "UPDATE events SET participants = GREATEST(CAST(participants AS SIGNED) - 1, 0) WHERE id = ?",
            [eventId]
        );
        return { ...(await reload(connection, eventId)), joined: false };
    });
}

async function joinedBy(account) {
    const [events] = await pool.query(
        `SELECT e.*, p.joined_at
         FROM event_participants p JOIN events e ON e.id = p.event_id
         WHERE p.user_id = ?
         ORDER BY e.date IS NULL, e.date ASC`,
        [account.id]
    );
    return events;
}

module.exports = { list, join, leave, joinedBy };
