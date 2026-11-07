// ======================================================
// ADMIN RESOURCES — what each /api/manage/:resource endpoint can do.
// Every table/column name used in SQL comes from here (never from the request).
//   key        response array key (unchanged from the original API)
//   from       FROM clause; the main table is always aliased `t`
//   select     column list (adds the camelCase aliases the admin UI reads)
//   search     columns matched by ?q=
//   filters    ?<name>=<value> filters: { column | where(value), values, facet }
//   sortable   ?sort= whitelist (name -> SQL expression)
//   fields     validation rules for POST/PUT (services/fields.js); absent = no create/update
// ======================================================

const F = require("./fields");

const ACTIVE = "'Accepted', 'In Progress'";

const RESOURCES = {
    users: {
        table: "users",
        key: "users",
        singular: "User",
        from: "users t",
        select: "t.id, t.name, t.email, t.role, t.created_at, t.updated_at",
        search: ["t.name", "t.email"],
        filters: { role: { column: "t.role", values: F.ROLES } },
        sortable: { created_at: "t.created_at", name: "t.name", email: "t.email", role: "t.role" }
        // create: users register themselves; update/delete: services/userService.js
    },

    hospitals: {
        table: "hospitals",
        key: "hospitals",
        singular: "Hospital",
        from: "hospitals t",
        select: "t.*, t.name AS hospitalName, t.emergency_available AS emergencyAvailable",
        search: ["t.name", "t.address", "t.location", "t.services", "t.phone"],
        filters: { emergency: { column: "t.emergency_available", values: F.HOSPITAL_EMERGENCY } },
        sortable: { created_at: "t.created_at", name: "t.name" },
        fields: F.hospital
    },

    volunteers: {
        table: "volunteers",
        key: "volunteers",
        singular: "Volunteer",
        from: "volunteers t",
        select: `t.*, (SELECT COUNT(*) FROM emergencies e
                        WHERE e.assigned_volunteer_id = t.id AND e.status IN (${ACTIVE})) AS activeAssignments`,
        search: ["t.name", "t.email", "t.phone", "t.skills", "t.location", "t.address"],
        filters: { availability: { column: "t.availability", values: F.AVAILABILITY } },
        sortable: { created_at: "t.created_at", name: "t.name", availability: "t.availability" },
        fields: F.volunteer
    },

    "blood-donors": {
        table: "blood_donors",
        key: "donors",
        singular: "Blood donor",
        from: "blood_donors t",
        select: "t.*, t.blood_group AS bloodGroup",
        search: ["t.name", "t.phone", "t.location", "t.blood_group"],
        filters: { bloodGroup: { column: "t.blood_group", values: F.BLOOD_GROUPS } },
        sortable: { created_at: "t.created_at", name: "t.name", blood_group: "t.blood_group", age: "t.age" },
        fields: F.bloodDonor
    },

    "food-donations": {
        table: "food_donations",
        key: "foodDonations",
        singular: "Food donation",
        from: "food_donations t",
        select: "t.*, t.name AS donorName, t.food_type AS foodType",
        search: ["t.name", "t.phone", "t.food_type", "t.location"],
        filters: {},
        sortable: { created_at: "t.created_at", name: "t.name", food_type: "t.food_type" },
        fields: F.foodDonation
    },

    events: {
        table: "events",
        key: "events",
        singular: "Event",
        from: "events t",
        select: "t.*, t.title AS eventName",
        search: ["t.title", "t.location", "t.organizer", "t.description"],
        filters: {
            when: {
                values: ["upcoming", "past"],
                // Undated events count as upcoming ("to be announced"), like the user portal
                where: (value) => (value === "upcoming" ? "(t.date IS NULL OR t.date >= CURDATE())" : "t.date < CURDATE()"),
                facet: "CASE WHEN t.date IS NULL OR t.date >= CURDATE() THEN 'upcoming' ELSE 'past' END"
            }
        },
        sortable: { created_at: "t.created_at", date: "t.date", title: "t.title", participants: "t.participants" },
        fields: F.event(false)
    },

    ambulances: {
        table: "ambulances",
        key: "ambulances",
        singular: "Ambulance",
        from: "ambulances t",
        select: "t.*",
        search: ["t.name", "t.phone", "t.vehicle_number", "t.location"],
        filters: {
            status: {
                values: F.AMBULANCE_STATUS,
                where: () => "LOWER(t.status) = ?",
                param: (value) => value,
                facet: "LOWER(t.status)"
            }
        },
        sortable: { created_at: "t.created_at", name: "t.name", status: "t.status" },
        fields: F.ambulance
    },

    emergencies: {
        table: "emergencies",
        key: "emergencies",
        singular: "Emergency",
        from: "emergencies t LEFT JOIN volunteers v ON v.id = t.assigned_volunteer_id",
        select: "t.*, t.emergency_type AS emergencyType, v.name AS assignedVolunteerName",
        search: ["t.name", "t.phone", "t.location", "t.description", "t.emergency_type"],
        filters: {
            status: { column: "t.status", values: F.EMERGENCY_STATUSES },
            type: { column: "t.emergency_type", values: F.EMERGENCY_TYPES }
        },
        sortable: { created_at: "t.created_at", status: "t.status", name: "t.name", updated_at: "t.updated_at" },
        // POST/PUT go through services/emergencyService.js (history + workflow rules)
        fields: F.emergency
    }
};

module.exports = { RESOURCES };
