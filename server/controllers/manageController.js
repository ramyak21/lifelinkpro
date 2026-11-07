// ======================================================
// ADMIN MANAGEMENT  /api/manage/*   (every route is behind requireAdmin)
// ------------------------------------------------------
// One generic controller driven by services/resources.js:
//   GET    /api/manage/:resource            list (page, pageSize, q, filters, sort, order)
//   GET    /api/manage/:resource/:id        one record (emergencies include history)
//   POST   /api/manage/:resource            create   (not users)
//   PUT    /api/manage/:resource/:id        update
//   DELETE /api/manage/:resource/:id        delete   (integrity checks below)
//   PUT    /api/manage/emergencies/:id/status       workflow status change
//   PUT    /api/manage/emergencies/:id/assignment   assign / unassign a volunteer
// ======================================================

const pool = require("../config/database");
const repo = require("../repositories/resourceRepository");
const { RESOURCES } = require("../services/resources");
const F = require("../services/fields");
const emergencyService = require("../services/emergencyService");
const userService = require("../services/userService");
const { validateFields } = require("../utils/validate");
const { parseListQuery, pagination } = require("../utils/listQuery");
const { HttpError, badRequest, conflict, notFound } = require("../utils/httpError");

const resourceFor = (req) => {
    const resource = RESOURCES[req.params.resource];
    if (!resource) throw notFound("Unknown resource");
    return resource;
};

// ---------------- legacy counts (kept for existing clients) ----------------
const getDashboard = async (req, res) => {
    const tables = {
        users: "users", hospitals: "hospitals", volunteers: "volunteers", bloodDonors: "blood_donors",
        foodDonations: "food_donations", events: "events", emergencies: "emergencies"
    };
    const counts = await Promise.all(
        Object.values(tables).map((table) => pool.query(`SELECT COUNT(*) AS count FROM ${table}`))
    );
    const stats = Object.fromEntries(Object.keys(tables).map((key, i) => [key, counts[i][0][0].count]));
    res.json({ success: true, stats });
};

// ---------------- list / detail ----------------
const list = async (req, res) => {
    const resource = resourceFor(req);
    const query = parseListQuery(req.query, { sortable: Object.keys(resource.sortable) });
    const filters = Object.fromEntries(Object.keys(resource.filters || {}).map((name) => [name, req.query[name]]));
    const { rows, total, facets } = await repo.list(resource, { ...query, filters });
    res.json({ success: true, [resource.key]: rows, pagination: pagination(query, total), facets });
};

const detail = async (req, res) => {
    const resource = resourceFor(req);
    const id = Number(req.params.id);
    const record = req.params.resource === "emergencies"
        ? await emergencyService.detailForAdmin(id)
        : await repo.findById(resource, id);
    if (!record) throw notFound(`${resource.singular} not found`);
    res.json({ success: true, record });
};

// ---------------- create / update ----------------
const create = async (req, res) => {
    const resource = resourceFor(req);
    if (!resource.fields) {
        throw new HttpError(405, `${resource.singular} records can't be created here. People create their own accounts.`);
    }
    const values = validateFields(req.body, resource.fields);
    let record;
    if (req.params.resource === "emergencies") {
        const created = await emergencyService.create(values, { account: req.user, actorRole: "admin" });
        record = await emergencyService.detailForAdmin(created.id);
    } else {
        if (req.params.resource === "events") values.participants = 0;
        if (req.params.resource === "blood-donors") await assertUniquePhone(values.phone);
        record = await repo.findById(resource, await repo.insert(resource, values));
    }
    res.status(201).json({ success: true, message: `${resource.singular} created successfully`, record });
};

const update = async (req, res) => {
    const resource = resourceFor(req);
    const id = Number(req.params.id);

    if (req.params.resource === "users") {
        const values = validateFields(req.body, F.userAdminUpdate);
        const record = await userService.updateByAdmin(id, values, req.user);
        return res.json({ success: true, message: "User updated successfully", record });
    }

    const values = validateFields(req.body, resource.fields);
    if (!(await repo.findById(resource, id))) throw notFound(`${resource.singular} not found`);
    if (req.params.resource === "blood-donors") await assertUniquePhone(values.phone, id);
    await repo.update(resource, id, values);

    const record = req.params.resource === "emergencies"
        ? await emergencyService.detailForAdmin(id)
        : await repo.findById(resource, id);
    res.json({ success: true, message: `${resource.singular} updated successfully`, record });
};

const assertUniquePhone = async (phone, exceptId = 0) => {
    const [rows] = await pool.query("SELECT id FROM blood_donors WHERE phone = ? AND id <> ? LIMIT 1", [phone, exceptId]);
    if (rows.length > 0) throw conflict("Another blood donor is already registered with this phone number.");
};

// ---------------- delete ----------------
const remove = async (req, res) => {
    const resource = resourceFor(req);
    const id = Number(req.params.id);

    if (req.params.resource === "users") {
        await userService.deleteByAdmin(id, req.user);
        return res.json({ success: true, message: "User deleted successfully" });
    }

    if (req.params.resource === "volunteers") {
        // A volunteer who is helping right now can't silently disappear from the request
        const [[{ n }]] = await pool.query(
            "SELECT COUNT(*) AS n FROM emergencies WHERE assigned_volunteer_id = ? AND status IN ('Accepted', 'In Progress')",
            [id]
        );
        if (n > 0) {
            throw conflict(`This volunteer is assigned to ${n} active emergency request(s). Reassign or close them first.`);
        }
    }

    const deleted = await repo.remove(resource, id);
    if (!deleted) throw notFound(`${resource.singular} not found`);
    res.json({ success: true, message: `${resource.singular} deleted successfully` });
};

// ---------------- emergency workflow ----------------
const setEmergencyStatus = async (req, res) => {
    if (typeof req.body.status !== "string") throw badRequest("status is required.");
    const record = await emergencyService.changeStatusAsAdmin(Number(req.params.id), req.body.status, req.user, req.body.note);
    res.json({ success: true, message: `Request marked ${req.body.status}`, record: await emergencyService.detailForAdmin(record.id) });
};

const setEmergencyAssignment = async (req, res) => {
    const raw = req.body.volunteerId;
    if (raw === undefined) throw badRequest("volunteerId is required (use null to remove the volunteer).");
    let volunteerId = null;
    if (raw !== null) {
        volunteerId = Number(raw);
        if (!Number.isInteger(volunteerId) || volunteerId < 1) throw badRequest("volunteerId must be a positive whole number or null.");
    }
    const record = await emergencyService.assignVolunteer(Number(req.params.id), volunteerId, req.user, req.body.note);
    res.json({
        success: true,
        message: volunteerId ? "Volunteer assigned" : "Volunteer removed",
        record: await emergencyService.detailForAdmin(record.id)
    });
};

module.exports = {
    getDashboard,
    list,
    detail,
    create,
    update,
    remove,
    setEmergencyStatus,
    setEmergencyAssignment
};
