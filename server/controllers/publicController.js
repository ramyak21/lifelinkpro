// ======================================================
// PUBLIC SERVICE ENDPOINTS (used by the user portal)
// ------------------------------------------------------
// Submissions are open to everyone. When the request carries a valid token
// (optionalAuth), the new record is linked to that account (user_id) so it
// appears under "My requests". Response messages and shapes are unchanged
// from the original API.
// ======================================================

const pool = require("../config/database");
const F = require("../services/fields");
const emergencyService = require("../services/emergencyService");
const eventService = require("../services/eventService");
const resourceRepo = require("../repositories/resourceRepository");
const { RESOURCES } = require("../services/resources");
const { validateFields } = require("../utils/validate");
const { parseListQuery, pagination } = require("../utils/listQuery");
const { badRequest } = require("../utils/httpError");

const insertRow = async (table, values) => {
    const columns = Object.keys(values);
    const [result] = await pool.query(
        `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
        columns.map((c) => values[c])
    );
    const [[row]] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [result.insertId]);
    return row;
};

const owner = (req) => (req.user ? { user_id: req.user.id } : {});

// ---------------- blood donors ----------------
exports.registerBloodDonor = async (req, res) => {
    const values = validateFields(req.body, F.bloodDonor, {
        requiredMessage: "Name, phone, blood group and location are required."
    });
    const [existing] = await pool.query("SELECT id FROM blood_donors WHERE phone = ? LIMIT 1", [values.phone]);
    if (existing.length > 0) throw badRequest("You are already registered as a blood donor");

    const donor = await insertRow("blood_donors", { ...values, ...owner(req) });
    res.status(201).json({ success: true, message: "Blood donor registered successfully", donor });
};

// ---------------- food donations ----------------
exports.donateFood = async (req, res) => {
    const values = validateFields(req.body, F.foodDonation, {
        requiredMessage: "Donor name, phone, food type, quantity and location are required."
    });
    const [existing] = await pool.query(
        `SELECT id FROM food_donations
         WHERE name = ? AND phone = ? AND food_type = ? AND quantity = ? AND location = ? LIMIT 1`,
        [values.name, values.phone, values.food_type, values.quantity, values.location]
    );
    if (existing.length > 0) throw badRequest("This food donation already exists.");

    const donation = await insertRow("food_donations", { ...values, ...owner(req) });
    res.status(201).json({ success: true, message: "Food donation added successfully.", donation });
};

// ---------------- volunteers ----------------
exports.registerVolunteer = async (req, res) => {
    const values = validateFields(req.body, F.volunteer, { requiredMessage: "Volunteer name is required." });
    if (req.user) {
        const [existing] = await pool.query("SELECT id FROM volunteers WHERE user_id = ? LIMIT 1", [req.user.id]);
        if (existing.length > 0) throw badRequest("You are already registered as a volunteer.");
    }
    const volunteer = await insertRow("volunteers", { ...values, ...owner(req) });
    res.status(201).json({ success: true, message: "Volunteer registered successfully", volunteer });
};

// ---------------- events ----------------
exports.createEvent = async (req, res) => {
    const values = validateFields(req.body, F.event(true), { requiredMessage: "Event title is required." });
    const event = await insertRow("events", { ...values, participants: 0 });
    res.status(201).json({ success: true, message: "Event created successfully", event });
};

exports.listEvents = async (req, res) => {
    res.json({ success: true, events: await eventService.list(req.user) });
};

exports.joinEvent = async (req, res) => {
    const event = await eventService.join(Number(req.params.id), req.user);
    res.json({ success: true, message: "Joined event successfully", event });
};

exports.leaveEvent = async (req, res) => {
    const event = await eventService.leave(Number(req.params.id), req.user);
    res.json({ success: true, message: "You have left the event", event });
};

// ---------------- hospitals ----------------
exports.registerHospital = async (req, res) => {
    const values = validateFields(req.body, F.hospital, { requiredMessage: "Hospital name is required." });
    const hospital = await insertRow("hospitals", values);
    res.status(201).json({ success: true, message: "Hospital registered successfully", hospital });
};

exports.listHospitals = async (req, res) => {
    const [hospitals] = await pool.query("SELECT * FROM hospitals ORDER BY created_at DESC, id DESC");
    res.json({ success: true, hospitals });
};

// ---------------- ambulances ----------------
exports.registerAmbulance = async (req, res) => {
    const values = validateFields(req.body, F.ambulance, { requiredMessage: "Name, phone and location are required." });
    const ambulance = await insertRow("ambulances", values);
    res.status(201).json({ success: true, message: "Ambulance registered successfully", ambulance });
};

exports.listAmbulances = async (req, res) => {
    const [ambulances] = await pool.query("SELECT * FROM ambulances ORDER BY created_at DESC, id DESC");
    res.json({ success: true, ambulances });
};

// ---------------- emergencies ----------------
exports.createEmergency = async (req, res) => {
    const values = validateFields(req.body, F.emergency, { requiredMessage: "Name, phone and location are required." });
    const emergency = await emergencyService.create(values, { account: req.user || null });
    res.status(201).json({ success: true, message: "Emergency request created successfully.", emergency });
};

// ---------------- legacy list endpoints (now administrator-only) ----------------
// GET /api/blood, /api/food, /api/volunteer, /api/emergency used to be public and
// exposed names, phone numbers and emergency details. They now require an admin
// token and are paginated like /api/manage/*. Kept for backwards compatibility.
exports.adminList = (resourceName, legacyKey) => async (req, res) => {
    const resource = RESOURCES[resourceName];
    const query = parseListQuery(req.query, { sortable: Object.keys(resource.sortable) });
    const { rows, total } = await resourceRepo.list(resource, { ...query, filters: {} });
    res.json({ success: true, [legacyKey]: rows, pagination: pagination(query, total) });
};
