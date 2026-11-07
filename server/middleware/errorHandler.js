// ======================================================
// ERROR RESPONSES
// ------------------------------------------------------
// Clients only ever receive a short, safe message. The full
// error (SQL message, stack trace) stays in the server log:
// controllers log it with console.error before calling
// sendServerError, and errorHandler logs what reaches Express.
// ======================================================

const { HttpError } = require("../utils/httpError");

// MySQL errors caused by invalid input values -> 400 with a safe message
const INVALID_INPUT_ERRORS = {
    ER_DATA_TOO_LONG: "One or more fields are too long.",
    ER_TRUNCATED_WRONG_VALUE: "One or more fields have an invalid value.",
    ER_TRUNCATED_WRONG_VALUE_FOR_FIELD: "One or more fields have an invalid value.",
    WARN_DATA_TRUNCATED: "One or more fields have an invalid value.",
    ER_WARN_DATA_OUT_OF_RANGE: "One or more fields are out of range.",
    ER_BAD_NULL_ERROR: "A required field is missing.",
    ER_DUP_ENTRY: "This record already exists."
};


// Used in controller/route catch blocks
const sendServerError = (res, error) => {

    const message = INVALID_INPUT_ERRORS[error && error.code];

    if (message) {
        return res.status(400).json({
            success: false,
            message
        });
    }

    return res.status(500).json({
        success: false,
        message: "Internal server error"
    });

};


// Last middleware in server.js — errors thrown before/outside the controllers
const errorHandler = (error, req, res, next) => {

    if (res.headersSent) {
        return next(error);
    }

    // Expected failures thrown on purpose (utils/httpError.js): status + safe message
    if (error instanceof HttpError) {
        return res.status(error.status).json({
            success: false,
            message: error.message,
            ...error.extra
        });
    }

    // Client errors raised by express.json(): invalid JSON, body too large, bad charset
    if (error.status >= 400 && error.status < 500) {

        const message =
            error.type === "entity.parse.failed" ? "Request body is not valid JSON." :
            error.type === "entity.too.large" ? "Request body is too large." :
            "Invalid request.";

        return res.status(error.status).json({
            success: false,
            message
        });
    }

    console.error("Unhandled Error:", error);

    return sendServerError(res, error);

};


module.exports = {
    sendServerError,
    errorHandler
};
