const express = require("express");
const router = express.Router();
const c = require("../controllers/publicController");
const { optionalAuth, requireAdmin } = require("../middleware/auth");

// Public form; a signed-in account can have one volunteer profile
router.post("/register", optionalAuth, c.registerVolunteer);

// Volunteer contact details: administrators only, paginated
router.get("/", requireAdmin, c.adminList("volunteers", "volunteers"));

module.exports = router;
