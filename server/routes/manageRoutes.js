const express = require("express");
const router = express.Router();
const c = require("../controllers/manageController");
const { requireAdmin } = require("../middleware/auth");
const { validateIdParam } = require("../middleware/validation");

// Every management route requires an administrator (checked against the database)
router.use(requireAdmin);

router.get("/dashboard", c.getDashboard);

// Emergency workflow (before the generic /:resource/:id routes)
router.put("/emergencies/:id/status", validateIdParam, c.setEmergencyStatus);
router.put("/emergencies/:id/assignment", validateIdParam, c.setEmergencyAssignment);

// Generic resource management: users, hospitals, volunteers, blood-donors,
// food-donations, events, ambulances, emergencies (see services/resources.js)
router.get("/:resource", c.list);
router.post("/:resource", c.create);
router.get("/:resource/:id", validateIdParam, c.detail);
router.put("/:resource/:id", validateIdParam, c.update);
router.delete("/:resource/:id", validateIdParam, c.remove);

module.exports = router;
