// ======================================================
// Generic SQL for admin resources (see services/resources.js).
// Identifiers come only from the resource definitions; every value is a
// placeholder parameter.
// ======================================================

const pool = require("../config/database");
const { likePattern } = require("../utils/listQuery");
const { badRequest } = require("../utils/httpError");

// WHERE clause + params for ?q= and the resource's filters
function buildWhere(resource, { q, filters = {} }, { skipFilter } = {}) {
    const clauses = [];
    const params = [];

    if (q) {
        clauses.push(`(${resource.search.map((col) => `${col} LIKE ?`).join(" OR ")})`);
        resource.search.forEach(() => params.push(likePattern(q)));
    }

    for (const [name, def] of Object.entries(resource.filters || {})) {
        const value = filters[name];
        if (value === undefined || value === "" || value === "all" || name === skipFilter) continue;
        if (!def.values.includes(value)) {
            throw badRequest(`${name} must be one of: ${def.values.join(", ")}.`);
        }
        if (def.where) {
            clauses.push(def.where(value));
            if (def.param) params.push(def.param(value));
        } else {
            clauses.push(`${def.column} = ?`);
            params.push(value);
        }
    }

    return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

async function list(resource, query) {
    const { sql, params } = buildWhere(resource, query);
    const orderBy = `${resource.sortable[query.sort] || "t.created_at"} ${query.order}, t.id ${query.order}`;

    // LIMIT/OFFSET are validated integers (utils/listQuery.js), so they are inlined
    const [rows] = await pool.query(
        `SELECT ${resource.select} FROM ${resource.from} ${sql}
         ORDER BY ${orderBy} LIMIT ${query.pageSize} OFFSET ${query.offset}`,
        params
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM ${resource.from} ${sql}`, params);

    // Facets: counts per filter value for the current search, ignoring that filter itself
    const facets = {};
    for (const [name, def] of Object.entries(resource.filters || {})) {
        const where = buildWhere(resource, query, { skipFilter: name });
        const expr = def.facet || def.column;
        const [counts] = await pool.query(
            `SELECT ${expr} AS value, COUNT(*) AS count FROM ${resource.from} ${where.sql} GROUP BY ${expr}`,
            where.params
        );
        facets[name] = Object.fromEntries(def.values.map((v) => [v, 0]));
        let all = 0;
        for (const { value, count } of counts) {
            all += count;
            if (value !== null && value in facets[name]) facets[name][value] = count;
        }
        facets[name].all = all;
    }

    return { rows, total, facets };
}

async function findById(resource, id, connection = pool) {
    const [rows] = await connection.query(`SELECT ${resource.select} FROM ${resource.from} WHERE t.id = ?`, [id]);
    return rows[0] || null;
}

async function insert(resource, values, connection = pool) {
    const columns = Object.keys(values);
    const [result] = await connection.query(
        `INSERT INTO ${resource.table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
        columns.map((c) => values[c])
    );
    return result.insertId;
}

async function update(resource, id, values, connection = pool) {
    const columns = Object.keys(values);
    if (columns.length === 0) return 0;
    const [result] = await connection.query(
        `UPDATE ${resource.table} SET ${columns.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`,
        [...columns.map((c) => values[c]), id]
    );
    return result.affectedRows;
}

async function remove(resource, id, connection = pool) {
    const [result] = await connection.query(`DELETE FROM ${resource.table} WHERE id = ?`, [id]);
    return result.affectedRows;
}

module.exports = { list, findById, insert, update, remove };
