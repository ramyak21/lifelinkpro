// Backwards-compatible export: routes that `require("../middleware/authMiddleware")`
// get the administrator guard. New code should use middleware/auth.js directly.
const { requireAdmin } = require("./auth");

module.exports = requireAdmin;
