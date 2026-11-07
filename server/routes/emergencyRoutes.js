const express = require("express");
const router = express.Router();
const c = require("../controllers/publicController");
const { optionalAuth, requireAdmin } = require("../middleware/auth");

// Anyone can ask for help; signed-in requesters can then follow it under /api/me/requests
router.post("/", optionalAuth, c.createEmergency);

// Emergency details are sensitive: administrators only, paginated
router.get("/", requireAdmin, c.adminList("emergencies", "emergencies"));

module.exports = router;
