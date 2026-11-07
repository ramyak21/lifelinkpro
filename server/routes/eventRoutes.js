const express = require("express");
const router = express.Router();
const c = require("../controllers/publicController");
const { optionalAuth, requireUser } = require("../middleware/auth");
const { validateIdParam } = require("../middleware/validation");

router.post("/create", c.createEvent);

// Public list; with a token each event also says whether this account joined it
router.get("/", optionalAuth, c.listEvents);

// Joining is per account (no double counting); the id is checked before the token
router.put("/join/:id", validateIdParam, requireUser, c.joinEvent);
router.put("/leave/:id", validateIdParam, requireUser, c.leaveEvent);

module.exports = router;
