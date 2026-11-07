const express = require("express");
const router = express.Router();
const c = require("../controllers/publicController");

// Public directory (contact details shown on purpose so people can call)
router.post("/register", c.registerHospital);
router.get("/", c.listHospitals);

module.exports = router;
