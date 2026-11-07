// Parses ?page, ?pageSize, ?q, ?sort, ?order for list endpoints.
// Sort columns are only ever taken from a whitelist, never from the request.
const { badRequest } = require("./httpError");

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function parseListQuery(query, { sortable = [], defaultSort = "created_at" } = {}) {
    const page = query.page === undefined ? 1 : Number(query.page);
    const pageSize = query.pageSize === undefined ? DEFAULT_PAGE_SIZE : Number(query.pageSize);

    if (!Number.isInteger(page) || page < 1 || page > 100000) {
        throw badRequest("page must be a positive whole number.");
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
        throw badRequest(`pageSize must be between 1 and ${MAX_PAGE_SIZE}.`);
    }

    const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
    const sort = sortable.includes(query.sort) ? query.sort : defaultSort;
    const order = String(query.order).toLowerCase() === "asc" ? "ASC" : "DESC";

    return { page, pageSize, offset: (page - 1) * pageSize, q, sort, order };
}

// LIKE pattern for a search term, with % and _ treated literally
const likePattern = (term) => `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

const pagination = ({ page, pageSize }, total) => ({
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
});

module.exports = { parseListQuery, likePattern, pagination, MAX_PAGE_SIZE };
