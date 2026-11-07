const express = require("express");
const router = express.Router();
const c = require("../controllers/publicController");
const { optionalAuth, requireAdmin } = require("../middleware/auth");

// Public form; linked to the account when signed in
router.post("/register", optionalAuth, c.registerBloodDonor);

// Donor list (names, phone numbers): administrators only, paginated
router.get("/", requireAdmin, c.adminList("blood-donors", "donors"));

module.exports = router;
