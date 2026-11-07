// The admin management screens, one per record type — a description of what to
// show and edit. All data goes through the shared manageApi (GET/POST/PUT/DELETE
// /api/manage/:resource); paging, search, filters and sorting happen in the API.
//   key          response array key of GET /api/manage/:resource
//   filter       server filter: { param, label, options } (counts come from the API's facets)
//   columns      table columns; `sortKey` = an API sort column
//   fields       create/edit form (API request field names); absent = not editable here
//   toForm(row)  turns a record into form values
//   detail       true = opens a full page (/emergencies/:id) instead of the side panel
import {
  LuAmbulance,
  LuCalendarDays,
  LuDroplet,
  LuHandHeart,
  LuHospital,
  LuLayoutDashboard,
  LuSiren,
  LuUserCog,
  LuUsers,
  LuUtensils
} from "react-icons/lu";
import Badge from "@lifelink/shared/components/ui/Badge";
import { LongTextCell, PhoneCell, StatusCell, TimeAgoCell } from "./Cells";
import { formatDate, formatEventDate, isUpcoming, orDash } from "@lifelink/shared/utils/format";
import { ambulanceStatus, availability, emergencyStatus, hospitalEmergency, roleBadge } from "@lifelink/shared/utils/status";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const options = (values) => values.map((value) => ({ value, label: value }));
const added = { key: "created_at", header: "Added", nowrap: true, sortKey: "created_at", render: (row) => formatDate(row.created_at) };

export const ADMIN_RESOURCES = {
  emergencies: {
    title: "Emergency requests",
    singular: "emergency request",
    key: "emergencies",
    icon: LuSiren,
    description: "SOS requests, newest first. Open one to review it, assign a volunteer and change its status.",
    detail: true,
    filter: {
      param: "status",
      label: "Filter by status",
      options: options(["Pending", "Accepted", "In Progress", "Resolved", "Cancelled"])
    },
    describe: (row) => `request #${row.id} from ${row.name}`,
    columns: [
      { key: "name", header: "Requester", primary: true, sortKey: "name" },
      { key: "emergencyType", header: "Type", render: (row) => orDash(row.emergencyType) },
      { key: "status", header: "Status", sortKey: "status", render: (row) => <StatusCell status={emergencyStatus(row.status)} /> },
      { key: "assignedVolunteerName", header: "Volunteer", render: (row) => orDash(row.assignedVolunteerName) },
      { key: "location", header: "Location", render: (row) => <LongTextCell text={row.location} /> },
      { key: "phone", header: "Phone", render: (row) => <PhoneCell phone={row.phone} /> },
      { key: "created_at", header: "Received", sortKey: "created_at", render: (row) => <TimeAgoCell value={row.created_at} /> }
    ],
    fields: [
      { name: "name", label: "Requester name", required: true, max: 150 },
      { name: "phone", label: "Phone number", type: "tel", required: true },
      { name: "location", label: "Location", required: true, max: 255, full: true },
      { name: "emergencyType", label: "Type of emergency", type: "choice", options: options(["Medical", "Accident", "Fire", "Other"]), columns: 4 },
      { name: "description", label: "Details", type: "textarea", max: 1000 }
    ],
    toForm: (row) => ({
      name: row.name, phone: row.phone, location: row.location,
      emergencyType: row.emergency_type || "", description: row.description || ""
    })
  },

  "blood-donors": {
    title: "Blood donors",
    singular: "blood donor",
    key: "donors",
    icon: LuDroplet,
    description: "People registered in the blood donor registry.",
    filter: { param: "bloodGroup", label: "Filter by blood group", options: options(BLOOD_GROUPS) },
    describe: (row) => `${row.name} (${row.bloodGroup})`,
    columns: [
      { key: "name", header: "Donor", primary: true, sortKey: "name" },
      { key: "bloodGroup", header: "Blood group", sortKey: "blood_group", render: (row) => <Badge tone="primary">{row.bloodGroup}</Badge> },
      { key: "age", header: "Age", sortKey: "age", render: (row) => orDash(row.age) },
      { key: "phone", header: "Phone", render: (row) => <PhoneCell phone={row.phone} /> },
      { key: "location", header: "Location", render: (row) => <LongTextCell text={row.location} /> },
      added
    ],
    fields: [
      { name: "name", label: "Full name", required: true, max: 150 },
      { name: "phone", label: "Phone number", type: "tel", required: true },
      { name: "age", label: "Age", type: "number", min: 18, max: 65 },
      { name: "location", label: "City or area", required: true, max: 255 },
      { name: "bloodGroup", label: "Blood group", type: "choice", options: options(BLOOD_GROUPS), required: true, columns: 4, compact: true }
    ],
    toForm: (row) => ({ name: row.name, phone: row.phone, age: row.age ?? "", location: row.location, bloodGroup: row.blood_group })
  },

  "food-donations": {
    title: "Food donations",
    singular: "food donation",
    key: "foodDonations",
    icon: LuUtensils,
    description: "Food offered for pickup, newest first.",
    describe: (row) => `the donation from ${row.donorName}`,
    columns: [
      { key: "donorName", header: "Donor", primary: true, sortKey: "name" },
      { key: "foodType", header: "Food", sortKey: "food_type" },
      { key: "quantity", header: "Quantity" },
      { key: "location", header: "Pickup location", render: (row) => <LongTextCell text={row.location} /> },
      { key: "phone", header: "Phone", render: (row) => <PhoneCell phone={row.phone} /> },
      { key: "available", header: "Status", render: (row) => <StatusCell status={availability(row.available)} /> },
      added
    ],
    fields: [
      { name: "donorName", label: "Donor name", required: true, max: 150 },
      { name: "phone", label: "Phone number", type: "tel", required: true },
      { name: "foodType", label: "Type of food", required: true, max: 100 },
      { name: "quantity", label: "Quantity", required: true, max: 100 },
      { name: "location", label: "Pickup location", required: true, max: 255, full: true }
    ],
    toForm: (row) => ({ donorName: row.name, phone: row.phone, foodType: row.food_type, quantity: row.quantity, location: row.location })
  },

  volunteers: {
    title: "Volunteers",
    singular: "volunteer",
    key: "volunteers",
    icon: LuHandHeart,
    description: "People who have offered their time and skills. “Active” counts requests they are helping with now.",
    filter: { param: "availability", label: "Filter by availability", options: options(["Full Time", "Part Time", "Weekends"]) },
    describe: (row) => row.name,
    columns: [
      { key: "name", header: "Name", primary: true, sortKey: "name" },
      { key: "phone", header: "Phone", render: (row) => <PhoneCell phone={row.phone} /> },
      { key: "skills", header: "Skills", render: (row) => <LongTextCell text={row.skills} /> },
      { key: "location", header: "Location", render: (row) => orDash(row.location || row.address) },
      { key: "availability", header: "Availability", sortKey: "availability", render: (row) => orDash(row.availability) },
      { key: "activeAssignments", header: "Active", render: (row) => (Number(row.activeAssignments) > 0 ? <Badge tone="primary">{row.activeAssignments}</Badge> : "0") },
      added
    ],
    fields: [
      { name: "name", label: "Full name", required: true, max: 150 },
      { name: "phone", label: "Phone number", type: "tel" },
      { name: "email", label: "Email address", type: "email" },
      { name: "skills", label: "Skills", max: 255 },
      { name: "location", label: "Location", max: 255 },
      { name: "availability", label: "Availability", type: "choice", options: options(["Full Time", "Part Time", "Weekends"]), columns: 3 }
    ],
    toForm: (row) => ({
      name: row.name, phone: row.phone || "", email: row.email || "", skills: row.skills || "",
      location: row.location || "", availability: row.availability || ""
    })
  },

  events: {
    title: "Events",
    singular: "event",
    key: "events",
    icon: LuCalendarDays,
    description: "Community events. “Joined” is the participant count shown on the website.",
    filter: { param: "when", label: "Filter by date", options: [{ value: "upcoming", label: "Upcoming" }, { value: "past", label: "Past" }] },
    describe: (row) => `“${row.eventName}”`,
    columns: [
      { key: "eventName", header: "Event", primary: true, sortKey: "title" },
      { key: "date", header: "Date", nowrap: true, sortKey: "date", render: (row) => formatEventDate(row.date) },
      { key: "when", header: "Status", render: (row) => (isUpcoming(row.date) ? <Badge tone="primary" dot>Upcoming</Badge> : <Badge dot>Ended</Badge>) },
      { key: "location", header: "Location", render: (row) => <LongTextCell text={row.location} /> },
      { key: "organizer", header: "Organiser", render: (row) => orDash(row.organizer) },
      { key: "participants", header: "Joined", sortKey: "participants", render: (row) => row.participants }
    ],
    fields: [
      { name: "eventName", label: "Event name", required: true, max: 200, full: true },
      { name: "date", label: "Date", type: "date" },
      { name: "location", label: "Location", max: 255 },
      { name: "organizer", label: "Organiser", max: 150 },
      { name: "description", label: "Description", type: "textarea", max: 5000 }
    ],
    toForm: (row) => ({
      eventName: row.title, date: row.date || "", location: row.location || "",
      organizer: row.organizer || "", description: row.description || ""
    })
  },

  hospitals: {
    title: "Hospitals",
    singular: "hospital",
    key: "hospitals",
    icon: LuHospital,
    description: "Hospitals listed in the public directory.",
    filter: { param: "emergency", label: "Filter by emergency services", options: [{ value: "Available", label: "Emergency services" }, { value: "Not Available", label: "No emergency" }] },
    describe: (row) => row.hospitalName,
    columns: [
      { key: "hospitalName", header: "Hospital", primary: true, sortKey: "name" },
      { key: "phone", header: "Phone", render: (row) => <PhoneCell phone={row.phone} /> },
      { key: "address", header: "Address", render: (row) => <LongTextCell text={row.address || row.location} /> },
      { key: "services", header: "Services", render: (row) => <LongTextCell text={row.services} /> },
      {
        key: "emergencyAvailable",
        header: "Emergency",
        render: (row) => {
          const status = hospitalEmergency(row.emergencyAvailable);
          return status ? <StatusCell status={status} /> : "Not specified";
        }
      },
      added
    ],
    fields: [
      { name: "hospitalName", label: "Hospital name", required: true, max: 200, full: true },
      { name: "phone", label: "Phone number", type: "tel" },
      { name: "address", label: "Address", max: 255 },
      { name: "services", label: "Services offered", type: "textarea", max: 5000 },
      { name: "emergencyAvailable", label: "Accepts emergency cases?", type: "choice", options: [{ value: "Available", label: "Yes" }, { value: "Not Available", label: "No" }] }
    ],
    toForm: (row) => ({
      hospitalName: row.name, phone: row.phone || "", address: row.address || row.location || "",
      services: row.services || "", emergencyAvailable: row.emergency_available || ""
    })
  },

  ambulances: {
    title: "Ambulances",
    singular: "ambulance",
    key: "ambulances",
    icon: LuAmbulance,
    description: "Ambulances listed in the public directory. Keep availability up to date here.",
    filter: { param: "status", label: "Filter by availability", options: [{ value: "available", label: "Available" }, { value: "busy", label: "Busy" }] },
    describe: (row) => row.vehicle_number || `the ambulance driven by ${row.name}`,
    columns: [
      { key: "vehicle_number", header: "Vehicle", primary: true, render: (row) => row.vehicle_number || "Not listed" },
      { key: "name", header: "Driver", sortKey: "name" },
      { key: "phone", header: "Phone", render: (row) => <PhoneCell phone={row.phone} /> },
      { key: "location", header: "Base", render: (row) => <LongTextCell text={row.location} /> },
      { key: "status", header: "Status", sortKey: "status", render: (row) => <StatusCell status={ambulanceStatus(row.status)} /> },
      added
    ],
    fields: [
      { name: "driverName", label: "Driver name", required: true, max: 150 },
      { name: "phone", label: "Phone number", type: "tel", required: true },
      { name: "vehicleNumber", label: "Vehicle number", max: 30, upperCase: true },
      { name: "location", label: "Base location", required: true, max: 255 },
      { name: "availability", label: "Availability", type: "choice", options: [{ value: "available", label: "Available" }, { value: "busy", label: "Busy" }], required: true }
    ],
    toForm: (row) => ({
      driverName: row.name, phone: row.phone, vehicleNumber: row.vehicle_number || "",
      location: row.location, availability: String(row.status || "available").toLowerCase()
    })
  },

  users: {
    title: "Users",
    singular: "user account",
    key: "users",
    icon: LuUsers,
    description: "Everyone with a LifeLink Pro account. Accounts are created by people themselves on the website.",
    filter: { param: "role", label: "Filter by role", options: [{ value: "admin", label: "Administrators" }, { value: "user", label: "Members" }] },
    describe: (row) => `${row.name}'s account (${row.email})`,
    deleteNote: "Their requests and registrations are kept, no longer linked to an account. Their event participations are removed.",
    // Server rules: no self-delete / self-demotion, at least one administrator remains
    isSelf: (row, currentUser) => row.id === currentUser?.id,
    roleAction: { icon: LuUserCog },
    columns: [
      { key: "name", header: "Name", primary: true, sortKey: "name" },
      { key: "email", header: "Email", sortKey: "email" },
      {
        key: "role",
        header: "Role",
        sortKey: "role",
        render: (row) => {
          const role = roleBadge(row.role);
          return <Badge tone={role.tone}>{role.label}</Badge>;
        }
      },
      { key: "created_at", header: "Joined", nowrap: true, sortKey: "created_at", render: (row) => formatDate(row.created_at) }
    ]
  }
};

const link = (slug) => ({
  to: `/manage/${slug}`,
  label: ADMIN_RESOURCES[slug].title,
  icon: ADMIN_RESOURCES[slug].icon
});

export const ADMIN_NAV = [
  { title: "Overview", items: [{ to: "/", label: "Dashboard", icon: LuLayoutDashboard }] },
  { title: "Requests", items: [link("emergencies")] },
  { title: "Community", items: ["blood-donors", "food-donations", "volunteers", "events"].map(link) },
  { title: "Directory", items: ["hospitals", "ambulances"].map(link) },
  { title: "Accounts", items: [link("users")] }
];
