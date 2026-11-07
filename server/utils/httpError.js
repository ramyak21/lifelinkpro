// An expected failure with an HTTP status and a message that is safe to show
// to the client (e.g. 404 "Event not found"). Thrown from services/controllers
// and turned into JSON by middleware/errorHandler.js. Anything that is NOT an
// HttpError is treated as unexpected: logged, and answered with a generic 500.
class HttpError extends Error {
    constructor(status, message, extra = {}) {
        super(message);
        this.status = status;
        this.extra = extra;
    }
}

const badRequest = (message, extra) => new HttpError(400, message, extra);
const notFound = (message) => new HttpError(404, message);
const conflict = (message, extra) => new HttpError(409, message, extra);
const forbidden = (message) => new HttpError(403, message);

module.exports = { HttpError, badRequest, notFound, conflict, forbidden };
