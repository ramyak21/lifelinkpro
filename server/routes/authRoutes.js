const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");
const { loginRateLimit, registerRateLimit } = require("../middleware/security");

// Rate limited: repeated failed sign-ins and mass registrations get 429
router.post("/register", registerRateLimit, register);
router.post("/login", loginRateLimit, login);

module.exports = router;
