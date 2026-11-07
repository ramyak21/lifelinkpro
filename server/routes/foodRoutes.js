const express = require("express");
const router = express.Router();
const c = require("../controllers/publicController");
const { optionalAuth, requireAdmin } = require("../middleware/auth");

router.post("/donate", optionalAuth, c.donateFood);

// Donor contact details: administrators only, paginated
router.get("/", requireAdmin, c.adminList("food-donations", "donations"));

module.exports = router;
