// ======================================================
// SIGNED-IN USER  /api/me/*   (every route is behind requireUser)
// ------------------------------------------------------
// A user only ever sees their own data: every query is scoped to req.user.id,
// which comes from the verified token + database, never from the request.
// Another user's request id answers 404, exactly like a missing one.
// ======================================================

const pool = require("../config/database");
const userService = require("../services/userService");
const emergencyService = require("../services/emergencyService");
const eventService = require("../services/eventService");
const { validateFields } = require("../utils/validate");
const { badRequest } = require("../utils/httpError");

const volunteerProfileOf = async (userId) => {
    const [rows] = await pool.query(
        "SELECT id, name, email, phone, skills, location, availability, created_at FROM volunteers WHERE user_id = ?",
        [userId]
    );
    return rows[0] || null;
};

const getMe = async (req, res) => {
    res.json({
        success: true,
        user: await userService.getProfile(req.user.id),
        volunteerProfile: await volunteerProfileOf(req.user.id)
    });
};

const updateMe = async (req, res) => {
    const { name } = validateFields(req.body, { name: { label: "Name", type: "string", required: true, max: 150 } });
    const user = await userService.updateOwnName(req.user.id, name);
    res.json({ success: true, message: "Profile updated", user });
};

const changePassword = async (req, res) => {
    await userService.changeOwnPassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    res.json({ success: true, message: "Password changed" });
};

// Everything this account has submitted, with emergency status history
const myRequests = async (req, res) => {
    const userId = req.user.id;
    const [emergencies, [bloodDonations], [foodDonations], volunteerProfile, events] = await Promise.all([
        emergencyService.listForRequester(req.user),
        pool.query(
            "SELECT id, blood_group, age, location, phone, available, created_at FROM blood_donors WHERE user_id = ? ORDER BY created_at DESC",
            [userId]
        ),
        pool.query(
            "SELECT id, food_type, quantity, location, phone, available, created_at FROM food_donations WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
            [userId]
        ),
        volunteerProfileOf(userId),
        eventService.joinedBy(req.user)
    ]);
    res.json({ success: true, emergencies, bloodDonations, foodDonations, volunteerProfile, events });
};

const cancelMyEmergency = async (req, res) => {
    await emergencyService.cancelByOwner(Number(req.params.id), req.user);
    res.json({ success: true, message: "Your request was cancelled" });
};

// Requests assigned to this account's volunteer profile
const myAssignments = async (req, res) => {
    const volunteerProfile = await volunteerProfileOf(req.user.id);
    const assignments = volunteerProfile ? await emergencyService.listForVolunteer(volunteerProfile.id) : [];
    res.json({ success: true, volunteerProfile, assignments });
};

const updateMyAssignment = async (req, res) => {
    const volunteerProfile = await volunteerProfileOf(req.user.id);
    if (!volunteerProfile) {
        return res.status(403).json({ success: false, message: "Only registered volunteers can update assignments." });
    }
    if (typeof req.body.status !== "string") throw badRequest("status is required.");
    await emergencyService.changeStatusAsVolunteer(
        Number(req.params.id), req.body.status, req.user, volunteerProfile.id, req.body.note
    );
    res.json({ success: true, message: `Request marked ${req.body.status}` });
};

module.exports = { getMe, updateMe, changePassword, myRequests, cancelMyEmergency, myAssignments, updateMyAssignment };
