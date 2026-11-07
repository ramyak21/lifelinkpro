// ======================================================
// SECURITY HEADERS, REQUEST LOGGING, RATE LIMITING
// ======================================================

// --- Security headers --------------------------------------------------
// The API only returns JSON, so it can use a very strict policy.
const securityHeaders = (req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    if (process.env.NODE_ENV === "production") {
        // Only meaningful over HTTPS (browsers ignore it on plain HTTP)
        res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
    }
    next();
};

// --- Request logging ---------------------------------------------------
// One line per request: method, path WITHOUT the query string, status, time.
// Bodies, headers (Authorization!), tokens and search terms are never logged.
// Disable with LOG_REQUESTS=false.
const requestLogger = (req, res, next) => {
    if (process.env.LOG_REQUESTS === "false") return next();
    const started = process.hrtime.bigint();
    res.on("finish", () => {
        const ms = Number(process.hrtime.bigint() - started) / 1e6;
        const path = req.originalUrl.split("?")[0];
        console.log(`[api] ${req.method} ${path} ${res.statusCode} ${ms.toFixed(0)}ms`);
    });
    next();
};

// --- Rate limiting -----------------------------------------------------
// Small in-memory fixed-window limiter (no extra dependency). Counts live in
// this process only: with several API instances, each counts separately —
// put a shared limiter (proxy / Redis) in front for multi-instance setups.
// Behind a reverse proxy set TRUST_PROXY (e.g. 1) so req.ip is the client IP.
const createLimiter = ({ windowMs, max }) => {
    const hits = new Map();
    const sweep = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key);
    }, windowMs);
    sweep.unref();

    return {
        // Returns seconds until the window resets when the key is over the limit, else 0
        blockedFor(key) {
            const entry = hits.get(key);
            if (!entry || entry.reset <= Date.now()) return 0;
            return entry.count >= max ? Math.ceil((entry.reset - Date.now()) / 1000) : 0;
        },
        hit(key) {
            const now = Date.now();
            const entry = hits.get(key);
            if (!entry || entry.reset <= now) hits.set(key, { count: 1, reset: now + windowMs });
            else entry.count += 1;
        },
        clear(key) {
            hits.delete(key);
        }
    };
};

const envInt = (name, fallback) => {
    const n = Number(process.env[name]);
    return Number.isInteger(n) && n > 0 ? n : fallback;
};

const FIFTEEN_MIN = 15 * 60 * 1000;
// Failed sign-ins: per account+IP (guessing one password) and per IP (many accounts)
const loginFailuresByAccount = createLimiter({ windowMs: FIFTEEN_MIN, max: envInt("RATE_LIMIT_LOGIN_FAILURES", 10) });
const loginFailuresByIp = createLimiter({ windowMs: FIFTEEN_MIN, max: envInt("RATE_LIMIT_LOGIN_FAILURES_PER_IP", 50) });
const registrations = createLimiter({ windowMs: 60 * 60 * 1000, max: envInt("RATE_LIMIT_REGISTER_PER_HOUR", 30) });

const tooMany = (res, seconds, what) => {
    res.setHeader("Retry-After", String(seconds));
    return res.status(429).json({
        success: false,
        message: `Too many ${what}. Try again in ${Math.ceil(seconds / 60)} minute(s).`
    });
};

const accountKey = (req) => `${req.ip}|${String(req.body?.email || "").trim().toLowerCase()}`;

// Blocks a sign-in attempt when too many recent attempts failed
const loginRateLimit = (req, res, next) => {
    const wait = Math.max(loginFailuresByAccount.blockedFor(accountKey(req)), loginFailuresByIp.blockedFor(req.ip));
    if (wait) return tooMany(res, wait, "failed sign-in attempts");
    // authController reports the outcome through these callbacks
    req.loginFailed = () => {
        loginFailuresByAccount.hit(accountKey(req));
        loginFailuresByIp.hit(req.ip);
    };
    req.loginSucceeded = () => loginFailuresByAccount.clear(accountKey(req));
    next();
};

const registerRateLimit = (req, res, next) => {
    const wait = registrations.blockedFor(req.ip);
    if (wait) return tooMany(res, wait, "accounts created from this network");
    registrations.hit(req.ip);
    next();
};

module.exports = { securityHeaders, requestLogger, loginRateLimit, registerRateLimit };
