// ======================================================
// REQUEST VALIDATION
// ======================================================

// Every endpoint takes a flat JSON object (text/number values) or no body at all
const requireFlatJsonBody = (req, res, next) => {

    // Express 5 leaves req.body undefined when no JSON body was sent
    if (req.body === undefined) {
        req.body = {};
        return next();
    }

    const isFlatObject =
        req.body !== null &&
        typeof req.body === "object" &&
        !Array.isArray(req.body) &&
        Object.values(req.body).every((value) => value === null || typeof value !== "object");

    if (!isFlatObject) {
        return res.status(400).json({
            success: false,
            message: "Request body must be a JSON object with text or number values."
        });
    }

    next();
};


// :id route parameters must be positive whole numbers (MySQL BIGINT ids)
const validateIdParam = (req, res, next) => {

    if (!/^[1-9]\d{0,18}$/.test(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid id."
        });
    }

    next();
};


module.exports = {
    requireFlatJsonBody,
    validateIdParam
};
