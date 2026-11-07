const express = require("express");
const router = express.Router();
const c = require("../controllers/publicController");

// Public directory (drivers' phone numbers shown on purpose so people can call)
router.post("/register", c.registerAmbulance);
router.get("/", c.listAmbulances);

module.exports = router;
