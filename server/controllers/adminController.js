const pool = require("../config/database");
const { sendServerError } = require("../middleware/errorHandler");


// ======================================================
// ADMIN DASHBOARD STATISTICS
// ======================================================

const getAdminStats = async (req, res) => {

    try {

        // Users
        const [[users]] = await pool.execute(
            "SELECT COUNT(*) AS count FROM users"
        );

        // Blood Donors
        const [[bloodDonors]] = await pool.execute(
            "SELECT COUNT(*) AS count FROM blood_donors"
        );

        // Food Donations
        const [[foodDonations]] = await pool.execute(
            "SELECT COUNT(*) AS count FROM food_donations"
        );

        // Volunteers
        const [[volunteers]] = await pool.execute(
            "SELECT COUNT(*) AS count FROM volunteers"
        );

        // Events
        const [[events]] = await pool.execute(
            "SELECT COUNT(*) AS count FROM events"
        );

        // Hospitals
        const [[hospitals]] = await pool.execute(
            "SELECT COUNT(*) AS count FROM hospitals"
        );

        // Ambulances
        const [[ambulances]] = await pool.execute(
            "SELECT COUNT(*) AS count FROM ambulances"
        );


        res.json({

            success: true,

            stats: {

                users: users.count,

                bloodDonors: bloodDonors.count,

                foodDonations: foodDonations.count,

                volunteers: volunteers.count,

                events: events.count,

                hospitals: hospitals.count,

                ambulances: ambulances.count

            }

        });


    } catch (error) {

        console.error("Admin Stats Error:", error);

        sendServerError(res, error);

    }

};



// ======================================================
// GET COMPLETE ADMIN DATA
// ======================================================

const getAllData = async (req, res) => {

    try {

        // Users
        const [users] = await pool.execute(
            "SELECT id, name, email, role, created_at, updated_at FROM users ORDER BY created_at DESC"
        );


        // Blood Donors
        const [bloodDonors] = await pool.execute(
            "SELECT * FROM blood_donors ORDER BY created_at DESC"
        );


        // Food Donations
        const [foodDonations] = await pool.execute(
            "SELECT * FROM food_donations ORDER BY created_at DESC"
        );


        // Volunteers
        const [volunteers] = await pool.execute(
            "SELECT * FROM volunteers ORDER BY created_at DESC"
        );


        // Events
        const [events] = await pool.execute(
            "SELECT * FROM events ORDER BY created_at DESC"
        );


        // Hospitals
        const [hospitals] = await pool.execute(
            "SELECT * FROM hospitals ORDER BY created_at DESC"
        );


        // Ambulances
        const [ambulances] = await pool.execute(
            "SELECT * FROM ambulances ORDER BY created_at DESC"
        );


        // Emergencies
        const [emergencies] = await pool.execute(
            "SELECT * FROM emergencies ORDER BY created_at DESC"
        );


        res.json({

            success: true,

            data: {

                users,

                bloodDonors,

                foodDonations,

                volunteers,

                events,

                hospitals,

                ambulances,

                emergencies

            }

        });


    } catch (error) {

        console.error("Get Admin Data Error:", error);

        sendServerError(res, error);

    }

};



// ======================================================
// DASHBOARD SUMMARY (admin portal) — bounded: counts and short lists only
// ======================================================
const count = async (sql, params = []) => {
    const [[row]] = await pool.query(sql, params);
    return Number(row.n);
};

const getSummary = async (req, res) => {
    // Independent read-only queries, run in parallel on the pool
    const [
        users, admins, bloodDonors, volunteers, foodDonations, foodAvailable, events, upcomingEvents,
        hospitals, hospitalsEmergency, ambulances, ambulancesAvailable,
        [emergencyStatus], [bloodGroups], [latestEmergencies], [nextEvents]
    ] = await Promise.all([
        count("SELECT COUNT(*) AS n FROM users"),
        count("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'"),
        count("SELECT COUNT(*) AS n FROM blood_donors"),
        count("SELECT COUNT(*) AS n FROM volunteers"),
        count("SELECT COUNT(*) AS n FROM food_donations"),
        count("SELECT COUNT(*) AS n FROM food_donations WHERE available = TRUE"),
        count("SELECT COUNT(*) AS n FROM events"),
        count("SELECT COUNT(*) AS n FROM events WHERE date IS NULL OR date >= CURDATE()"),
        count("SELECT COUNT(*) AS n FROM hospitals"),
        count("SELECT COUNT(*) AS n FROM hospitals WHERE emergency_available = 'Available'"),
        count("SELECT COUNT(*) AS n FROM ambulances"),
        count("SELECT COUNT(*) AS n FROM ambulances WHERE LOWER(status) = 'available'"),
        pool.query("SELECT status, COUNT(*) AS n FROM emergencies GROUP BY status"),
        pool.query("SELECT blood_group, COUNT(*) AS n FROM blood_donors GROUP BY blood_group"),
        pool.query(
            `SELECT t.id, t.name, t.emergency_type, t.location, t.status, t.created_at,
                    v.name AS assigned_volunteer_name
             FROM emergencies t LEFT JOIN volunteers v ON v.id = t.assigned_volunteer_id
             ORDER BY t.created_at DESC, t.id DESC LIMIT 5`
        ),
        pool.query(
            `SELECT id, title, date, location, participants FROM events
             WHERE date IS NULL OR date >= CURDATE()
             ORDER BY date IS NULL, date ASC LIMIT 5`
        )
    ]);

    const byStatus = { Pending: 0, Accepted: 0, "In Progress": 0, Resolved: 0, Cancelled: 0 };
    for (const row of emergencyStatus) byStatus[row.status] = Number(row.n);

    res.json({
        success: true,
        summary: {
            users: { total: users, admins },
            bloodDonors: { total: bloodDonors, byGroup: Object.fromEntries(bloodGroups.map((r) => [r.blood_group, Number(r.n)])) },
            volunteers: { total: volunteers },
            foodDonations: { total: foodDonations, available: foodAvailable },
            events: { total: events, upcoming: upcomingEvents },
            hospitals: { total: hospitals, withEmergency: hospitalsEmergency },
            ambulances: { total: ambulances, available: ambulancesAvailable },
            emergencies: {
                total: Object.values(byStatus).reduce((a, b) => a + b, 0),
                open: byStatus.Pending + byStatus.Accepted + byStatus["In Progress"],
                byStatus
            },
            latestEmergencies,
            upcomingEvents: nextEvents
        }
    });
};


// ======================================================
// EXPORT
// ======================================================

module.exports = {

    getAdminStats,

    getAllData,
    getSummary

};