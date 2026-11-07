const express = require("express");
const router = express.Router();
const c = require("../controllers/meController");
const { requireUser } = require("../middleware/auth");
const { validateIdParam } = require("../middleware/validation");

// The signed-in account's own data only
router.use(requireUser);

router.get("/", c.getMe);
router.patch("/", c.updateMe);
router.put("/password", c.changePassword);

router.get("/requests", c.myRequests);
router.put("/emergencies/:id/cancel", validateIdParam, c.cancelMyEmergency);

router.get("/assignments", c.myAssignments);
router.put("/assignments/:id/status", validateIdParam, c.updateMyAssignment);

module.exports = router;
