// ======================================================
// AUTHENTICATION AND AUTHORIZATION
// ------------------------------------------------------
// Tokens are JWTs { id, role } signed with JWT_SECRET (see authController).
// Every guard re-reads the account from MySQL, so a deleted account loses
// access immediately and a demoted admin loses admin access immediately —
// the role inside the token is never trusted on its own.
//
//   requireUser   — any signed-in account          (401 otherwise)
//   requireAdmin  — signed-in account with role admin (401 / 403)
//   optionalAuth  — attaches req.user when a valid token is sent; a request
//                   without a token continues anonymously; an invalid or
//                   expired token is rejected with 401 (the client should
//                   sign in again rather than silently lose the link)
// ======================================================

const jwt = require("jsonwebtoken");
const pool = require("../config/database");

const unauthorized = (res, message) => res.status(401).json({ success: false, message });

// Returns { token } | { error } from the Authorization header
const readBearer = (req) => {
    const header = req.headers.authorization;
    if (!header) return { error: "No token provided" };
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) return { error: "Invalid token" };
    return { token };
};

const verify = (token) => {
    try {
        // Only HS256 — tokens with "alg: none" or another algorithm are rejected
        return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch {
        return null;
    }
};

// Loads the current account (never the password hash)
const loadAccount = async (id) => {
    const [rows] = await pool.execute(
        "SELECT id, name, email, role FROM users WHERE id = ?",
        [id ?? null]
    );
    return rows[0] || null;
};

const authenticate = ({ required, role }) => async (req, res, next) => {
    const { token, error } = readBearer(req);

    if (error) {
        if (!required && error === "No token provided") return next();
        return unauthorized(res, error);
    }

    const claims = verify(token);
    if (!claims) return unauthorized(res, "Token expired or invalid");

    // Cheap check first: a token that never had the role is refused without a query
    if (role && claims.role !== role) {
        return res.status(403).json({ success: false, message: "Admin access required" });
    }

    try {
        const account = await loadAccount(claims.id);
        if (!account) return unauthorized(res, "Token expired or invalid");
        if (role && account.role !== role) {
            return res.status(403).json({ success: false, message: "Admin access required" });
        }
        req.user = account;
        next();
    } catch (err) {
        next(err);
    }
};

const requireUser = authenticate({ required: true });
const requireAdmin = authenticate({ required: true, role: "admin" });
const optionalAuth = authenticate({ required: false });

module.exports = { requireUser, requireAdmin, optionalAuth };
