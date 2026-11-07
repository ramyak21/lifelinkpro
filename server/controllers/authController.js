const pool = require("../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { checkPasswordPolicy } = require("../services/userService");
const { EMAIL_PATTERN } = require("../utils/validate");
const { badRequest } = require("../utils/httpError");


// ===============================
// REGISTER
// ===============================
// Always creates role "user" (a "role" field in the body is ignored).
const register = async (req, res) => {

    const { name, email, password } = req.body;

    if (
        typeof name !== "string" || !name.trim() ||
        typeof email !== "string" ||
        typeof password !== "string" || !password
    ) {
        throw badRequest("Name, email and password are required.");
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!EMAIL_PATTERN.test(cleanEmail) || cleanEmail.length > 255) {
        throw badRequest("Please provide a valid email address.");
    }
    if (cleanName.length > 150) {
        throw badRequest("Name must be at most 150 characters.");
    }
    checkPasswordPolicy(password);

    const [existingUsers] = await pool.execute("SELECT id FROM users WHERE email = ?", [cleanEmail]);
    if (existingUsers.length > 0) {
        throw badRequest("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
        "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
        [cleanName, cleanEmail, hashedPassword, "user"]
    );

    res.status(201).json({
        success: true,
        message: "Registration successful",
        user: { id: result.insertId, name: cleanName, email: cleanEmail, role: "user" }
    });
};


// ===============================
// LOGIN
// ===============================
// The same message for an unknown email and a wrong password, so the API does
// not reveal which accounts exist. Failed attempts feed the rate limiter
// (middleware/security.js -> loginRateLimit).
const login = async (req, res) => {

    const { email, password } = req.body;

    if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
        throw badRequest("Email and password are required.");
    }

    const [users] = await pool.execute(
        "SELECT id, name, email, role, password FROM users WHERE email = ?",
        [email.trim()]
    );
    const user = users[0];
    const isMatch = user ? await bcrypt.compare(password, user.password) : false;

    if (!isMatch) {
        req.loginFailed?.();
        throw badRequest("Invalid email or password");
    }
    req.loginSucceeded?.();

    const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d", algorithm: "HS256" }
    );

    res.json({
        success: true,
        message: "Login successful",
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
};


module.exports = { register, login };
