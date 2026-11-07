const express = require("express");
const router = express.Router();
const { getAdminStats, getAllData, getSummary } = require("../controllers/adminController");
const { requireAdmin } = require("../middleware/auth");

router.use(requireAdmin);

// Admin portal dashboard: counts and short lists only
router.get("/summary", getSummary);

// Kept for existing clients. /all returns whole tables — prefer /summary and /api/manage/*.
router.get("/stats", getAdminStats);
router.get("/all", getAllData);

module.exports = router;
