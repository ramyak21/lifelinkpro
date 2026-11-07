// ======================================================
// FIELD RULES — one definition per record type, used by the public
// endpoints (user portal) and the admin endpoints (admin portal), so both
// validate the same way. Keys are database columns; `from` lists the request
// field names accepted (current name first, legacy names after).
// Required fields match what the API has always required, so existing
// clients keep working; formats/lengths/allowed values are now enforced too.
// ======================================================

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const EMERGENCY_TYPES = ["Medical", "Accident", "Fire", "Other"];
const EMERGENCY_STATUSES = ["Pending", "Accepted", "In Progress", "Resolved", "Cancelled"];
const AVAILABILITY = ["Full Time", "Part Time", "Weekends"];
const HOSPITAL_EMERGENCY = ["Available", "Not Available"];
const AMBULANCE_STATUS = ["available", "busy"];
const ROLES = ["user", "admin"];

const bloodDonor = {
    name: { label: "Name", type: "string", required: true, max: 150 },
    phone: { label: "Phone", type: "phone", required: true },
    age: { label: "Age", type: "int", min: 18, max: 65 },
    blood_group: { from: ["bloodGroup", "blood_group"], label: "Blood group", type: "enum", values: BLOOD_GROUPS, caseInsensitive: true, required: true },
    location: { label: "Location", type: "string", required: true, max: 255 }
};

const foodDonation = {
    name: { from: ["donorName", "name"], label: "Donor name", type: "string", required: true, max: 150 },
    phone: { label: "Phone", type: "phone", required: true },
    food_type: { from: ["foodType", "food_type"], label: "Food type", type: "string", required: true, max: 100 },
    quantity: { label: "Quantity", type: "string", required: true, max: 100 },
    location: { label: "Pickup location", type: "string", required: true, max: 255 }
};

const volunteer = {
    name: { label: "Name", type: "string", required: true, max: 150 },
    email: { label: "Email", type: "email" },
    phone: { label: "Phone", type: "phone" },
    address: { label: "Address", type: "string", max: 255 },
    skills: { label: "Skills", type: "string", max: 255 },
    location: { label: "Location", type: "string", max: 255 },
    availability: { label: "Availability", type: "enum", values: AVAILABILITY, caseInsensitive: true }
};

const event = (publicForm) => ({
    title: { from: ["eventName", "title"], label: "Event title", type: "string", required: true, max: 200 },
    description: { label: "Description", type: "text", max: 5000 },
    date: { label: "Date", type: "date", notInPast: publicForm },
    location: { label: "Location", type: "string", max: 255 },
    organizer: { label: "Organiser", type: "string", max: 150 }
});

const hospital = {
    name: { from: ["hospitalName", "name"], label: "Hospital name", type: "string", required: true, max: 200 },
    location: { label: "Location", type: "string", max: 255 },
    phone: { label: "Phone", type: "phone" },
    address: { label: "Address", type: "string", max: 255 },
    services: { label: "Services", type: "text", max: 5000 },
    emergency_available: { from: ["emergencyAvailable", "emergency_available"], label: "Emergency availability", type: "enum", values: HOSPITAL_EMERGENCY, caseInsensitive: true }
};

const ambulance = {
    name: { from: ["driverName", "name"], label: "Driver name", type: "string", required: true, max: 150 },
    phone: { label: "Phone", type: "phone", required: true },
    vehicle_number: { from: ["vehicleNumber", "vehicle_number"], label: "Vehicle number", type: "string", max: 30 },
    location: { label: "Location", type: "string", required: true, max: 255 },
    // Stored as sent (e.g. "Busy" or "available"); matched case-insensitively
    status: { from: ["availability", "status"], label: "Availability", type: "enum", values: AMBULANCE_STATUS, caseInsensitive: true, keepCase: true, default: "available" }
};

const emergency = {
    name: { label: "Name", type: "string", required: true, max: 150 },
    phone: { label: "Phone", type: "phone", required: true },
    location: { label: "Location", type: "string", required: true, max: 255 },
    emergency_type: { from: ["emergencyType", "emergency_type"], label: "Emergency type", type: "enum", values: EMERGENCY_TYPES, caseInsensitive: true },
    description: { label: "Description", type: "text", max: 1000 }
};

const userAdminUpdate = {
    name: { label: "Name", type: "string", required: true, max: 150 },
    role: { label: "Role", type: "enum", values: ROLES, required: true }
};

module.exports = {
    BLOOD_GROUPS,
    EMERGENCY_TYPES,
    EMERGENCY_STATUSES,
    AVAILABILITY,
    HOSPITAL_EMERGENCY,
    AMBULANCE_STATUS,
    ROLES,
    bloodDonor,
    foodDonation,
    volunteer,
    event,
    hospital,
    ambulance,
    emergency,
    userAdminUpdate
};
