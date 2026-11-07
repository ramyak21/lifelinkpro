// ======================================================
// EMERGENCY REQUEST WORKFLOW
// ------------------------------------------------------
// Status model (emergencies.status):
//
//   Pending ──► Accepted ──► In Progress ──► Resolved
//      │            │              │
//      └────────────┴──────────────┴──► Cancelled
//
// Who may do what:
//   administrator      : any arrow above; assign / reassign / unassign a volunteer
//   assigned volunteer : Accepted → In Progress, In Progress → Resolved
//   requester (owner)  : Pending → Cancelled
// Rules:
//   * "In Progress" needs an assigned volunteer
//   * assigning a volunteer to a Pending request also accepts it
//   * a volunteer cannot be removed while the request is In Progress
//   * Resolved and Cancelled are final
// Every change runs in a transaction with the request row locked, so two
// people (or a double click) cannot apply conflicting changes, and each change
// writes an entry to emergency_updates (who, what, when).
// ======================================================

const repo = require("../repositories/emergencyRepository");
const { withTransaction } = require("../repositories/transaction");
const { badRequest, conflict, notFound } = require("../utils/httpError");
const { EMERGENCY_STATUSES } = require("./fields");

const ADMIN_TRANSITIONS = {
    Pending: ["Accepted", "Cancelled"],
    Accepted: ["In Progress", "Cancelled"],
    "In Progress": ["Resolved", "Cancelled"],
    Resolved: [],
    Cancelled: []
};
const VOLUNTEER_TRANSITIONS = { Accepted: ["In Progress"], "In Progress": ["Resolved"] };
const OWNER_TRANSITIONS = { Pending: ["Cancelled"] };

const actorFields = (actor) => ({
    actor_user_id: actor?.id ?? null,
    actor_name: actor?.name ?? null,
    actor_role: actor?.role ?? "public"
});

const cleanNote = (note) => {
    if (note === undefined || note === null || String(note).trim() === "") return null;
    const text = String(note).trim();
    if (text.length > 500) throw badRequest("Note must be at most 500 characters.");
    return text;
};

// --- creation ----------------------------------------------------------

// values: validated columns (fields.emergency); account: signed-in user or null
async function create(values, { account = null, actorRole = account ? "requester" : "public" } = {}) {
    return withTransaction(async (connection) => {
        if (await repo.findActiveDuplicate(connection, values)) {
            throw badRequest("Emergency request already exists.");
        }
        const row = { ...values, user_id: actorRole === "admin" ? null : account?.id ?? null };
        const id = await repo.insert(connection, row);
        await repo.addUpdate(connection, {
            emergency_id: id,
            action: "created",
            to_status: "Pending",
            ...actorFields(account && { ...account, role: actorRole })
        });
        const [rows] = await connection.query("SELECT * FROM emergencies WHERE id = ?", [id]);
        return rows[0];
    });
}

// --- status changes ----------------------------------------------------

async function changeStatus(id, toStatus, { actor, actorRole, transitions, note, volunteerId }) {
    if (!EMERGENCY_STATUSES.includes(toStatus)) {
        throw badRequest(`status must be one of: ${EMERGENCY_STATUSES.join(", ")}.`);
    }
    const cleanedNote = cleanNote(note);

    return withTransaction(async (connection) => {
        const current = await repo.lockById(connection, id);
        if (!current) throw notFound("Emergency not found");
        if (volunteerId !== undefined && current.assigned_volunteer_id !== volunteerId) {
            throw notFound("Emergency not found");
        }
        if (current.status === toStatus) {
            throw conflict(`This request is already ${toStatus}.`);
        }
        const allowed = transitions[current.status] || [];
        if (!allowed.includes(toStatus)) {
            throw conflict(`A request that is ${current.status} can't be changed to ${toStatus}.`, {
                allowed
            });
        }
        if (toStatus === "In Progress" && !current.assigned_volunteer_id) {
            throw conflict("Assign a volunteer before marking the request In Progress.");
        }

        await repo.updateFields(connection, id, {
            status: toStatus,
            ...(toStatus === "Resolved" ? { resolved_at: new Date() } : {})
        });
        await repo.addUpdate(connection, {
            emergency_id: id,
            action: "status_changed",
            from_status: current.status,
            to_status: toStatus,
            note: cleanedNote,
            ...actorFields({ ...actor, role: actorRole })
        });
        return repo.findDetail(id, connection);
    });
}

const changeStatusAsAdmin = (id, status, admin, note) =>
    changeStatus(id, status, { actor: admin, actorRole: "admin", transitions: ADMIN_TRANSITIONS, note });

const changeStatusAsVolunteer = (id, status, account, volunteerId, note) =>
    changeStatus(id, status, {
        actor: account,
        actorRole: "volunteer",
        transitions: VOLUNTEER_TRANSITIONS,
        note,
        volunteerId
    });

// The requester can withdraw their own request while it is still Pending
async function cancelByOwner(id, account) {
    return withTransaction(async (connection) => {
        const current = await repo.lockById(connection, id);
        // Someone else's request looks exactly like a missing one
        if (!current || current.user_id !== account.id) throw notFound("Emergency not found");
        if (!(OWNER_TRANSITIONS[current.status] || []).includes("Cancelled")) {
            throw conflict(`This request is already ${current.status} and can't be cancelled here. ` +
                "Contact LifeLink Pro coordinators if your situation changed.");
        }
        await repo.updateFields(connection, id, { status: "Cancelled" });
        await repo.addUpdate(connection, {
            emergency_id: id,
            action: "status_changed",
            from_status: current.status,
            to_status: "Cancelled",
            note: "Cancelled by the requester",
            ...actorFields({ ...account, role: "requester" })
        });
    });
}

// --- volunteer assignment ----------------------------------------------

// volunteerId = null removes the current volunteer
async function assignVolunteer(id, volunteerId, admin, note) {
    const cleanedNote = cleanNote(note);

    return withTransaction(async (connection) => {
        const current = await repo.lockById(connection, id);
        if (!current) throw notFound("Emergency not found");
        if (!repo.ACTIVE_STATUSES.includes(current.status)) {
            throw conflict(`A request that is ${current.status} can't be reassigned.`);
        }

        if (volunteerId === null) {
            if (!current.assigned_volunteer_id) throw conflict("No volunteer is assigned to this request.");
            if (current.status === "In Progress") {
                throw conflict("A volunteer can't be removed while the request is In Progress. Assign someone else instead.");
            }
            const [[previous]] = await connection.query("SELECT id, name FROM volunteers WHERE id = ?", [current.assigned_volunteer_id]);
            await repo.updateFields(connection, id, { assigned_volunteer_id: null, assigned_at: null });
            await repo.addUpdate(connection, {
                emergency_id: id,
                action: "volunteer_unassigned",
                volunteer_id: previous?.id ?? null,
                volunteer_name: previous?.name ?? null,
                note: cleanedNote,
                ...actorFields({ ...admin, role: "admin" })
            });
            return repo.findDetail(id, connection);
        }

        if (current.assigned_volunteer_id === volunteerId) {
            throw conflict("This volunteer is already assigned to the request.");
        }
        const [[volunteer]] = await connection.query("SELECT id, name FROM volunteers WHERE id = ? FOR UPDATE", [volunteerId]);
        if (!volunteer) throw notFound("Volunteer not found");

        const changes = { assigned_volunteer_id: volunteer.id, assigned_at: new Date() };
        if (current.status === "Pending") changes.status = "Accepted";
        await repo.updateFields(connection, id, changes);

        await repo.addUpdate(connection, {
            emergency_id: id,
            action: "volunteer_assigned",
            volunteer_id: volunteer.id,
            volunteer_name: volunteer.name,
            note: cleanedNote,
            ...actorFields({ ...admin, role: "admin" })
        });
        if (changes.status) {
            await repo.addUpdate(connection, {
                emergency_id: id,
                action: "status_changed",
                from_status: "Pending",
                to_status: "Accepted",
                note: "Accepted when a volunteer was assigned",
                ...actorFields({ ...admin, role: "admin" })
            });
        }
        return repo.findDetail(id, connection);
    });
}

// --- reading -----------------------------------------------------------

async function detailForAdmin(id) {
    const record = await repo.findDetail(id);
    if (!record) throw notFound("Emergency not found");
    return { ...record, updates: await repo.listUpdates(id) };
}

// History as shown to the requester / volunteer: no account ids or e-mails
const publicHistory = (updates) =>
    updates.map((u) => ({
        id: u.id,
        action: u.action,
        from_status: u.from_status,
        to_status: u.to_status,
        volunteer_name: u.volunteer_name,
        actor_role: u.actor_role,
        note: u.note,
        created_at: u.created_at
    }));

const withHistory = async (rows) => {
    const updates = await repo.listUpdatesFor(rows.map((row) => row.id));
    return rows.map((row) => ({ ...row, updates: publicHistory(updates.get(row.id) || []) }));
};

const listForRequester = async (account) => withHistory(await repo.listForUser(account.id));

const listForVolunteer = async (volunteerId) => withHistory(await repo.listForVolunteer(volunteerId));

module.exports = {
    ADMIN_TRANSITIONS,
    VOLUNTEER_TRANSITIONS,
    create,
    changeStatusAsAdmin,
    changeStatusAsVolunteer,
    cancelByOwner,
    assignVolunteer,
    detailForAdmin,
    listForRequester,
    listForVolunteer
};
