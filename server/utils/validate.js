// ======================================================
// SERVER-SIDE VALIDATION AND NORMALISATION
// ------------------------------------------------------
// A spec maps an output column to a rule:
//   column: { from: ["apiField", "legacyField"], label, type, required, max, min, values, ... }
// validateFields() reads the first present request field, trims and checks it,
// and returns { values } (column -> clean value) or throws a 400 HttpError.
// Types: string, text, phone, email, int, date, enum.
// ======================================================

const { badRequest } = require("./httpError");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;
const PHONE_CHARS = /^[0-9+\-\s()]+$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

// Today's date as YYYY-MM-DD, one day of slack so users in any time zone can pick "today"
const earliestAllowedDate = () => {
    const d = new Date(Date.now() - 24 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
};

const checkValue = (rule, raw) => {
    const label = rule.label;
    const text = String(raw).trim();

    switch (rule.type) {
        case "int": {
            if (!/^-?\d+$/.test(text)) throw badRequest(`${label} must be a whole number.`);
            const n = Number(text);
            if (rule.min !== undefined && n < rule.min) throw badRequest(`${label} must be at least ${rule.min}.`);
            if (rule.max !== undefined && n > rule.max) throw badRequest(`${label} must be at most ${rule.max}.`);
            return n;
        }
        case "phone": {
            const digits = text.replace(/\D/g, "");
            if (!PHONE_CHARS.test(text) || digits.length < 7 || digits.length > 15) {
                throw badRequest(`${label} must be a valid phone number (7–15 digits).`);
            }
            if (text.length > 30) throw badRequest(`${label} must be at most 30 characters.`);
            return text;
        }
        case "email": {
            if (!EMAIL_PATTERN.test(text)) throw badRequest(`${label} must be a valid email address.`);
            if (text.length > 255) throw badRequest(`${label} must be at most 255 characters.`);
            return text;
        }
        case "date": {
            const m = DATE_PATTERN.exec(text);
            const date = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
            if (!m || date.getUTCMonth() !== +m[2] - 1 || date.getUTCDate() !== +m[3]) {
                throw badRequest(`${label} must be a valid date (YYYY-MM-DD).`);
            }
            if (rule.notInPast && text < earliestAllowedDate()) {
                throw badRequest(`${label} must be today or a future date.`);
            }
            return text;
        }
        case "enum": {
            const match = rule.values.find((v) =>
                rule.caseInsensitive ? v.toLowerCase() === text.toLowerCase() : v === text
            );
            if (!match) throw badRequest(`${label} must be one of: ${rule.values.join(", ")}.`);
            return rule.keepCase ? text : match;
        }
        default: {
            // string / text
            const max = rule.max ?? 255;
            if (text.length > max) throw badRequest(`${label} must be at most ${max} characters.`);
            return rule.upperCase ? text.toUpperCase() : text;
        }
    }
};

// options.partial: only validate fields present in the body (for PATCH-style updates)
// options.requiredMessage: legacy combined message when any required field is missing
function validateFields(body, spec, options = {}) {
    const values = {};
    const missing = [];

    for (const [column, rule] of Object.entries(spec)) {
        const keys = rule.from || [column];
        const key = keys.find((k) => body[k] !== undefined);
        const raw = key === undefined ? undefined : body[key];

        if (isBlank(raw)) {
            if (rule.required && !options.partial) missing.push(rule.label);
            else if (key !== undefined || !options.partial) values[column] = rule.default ?? null;
            continue;
        }
        values[column] = checkValue(rule, raw);
    }

    if (missing.length > 0) {
        throw badRequest(options.requiredMessage || `${missing[0]} is required.`, { fields: missing });
    }

    return values;
}

module.exports = { validateFields, isBlank, EMAIL_PATTERN };
