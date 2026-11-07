// One function per backend endpoint — the single API contract used by BOTH portals.
// Pages call these instead of building URLs themselves. Request bodies and
// response shapes are the API's own (see docs/api.md).
import api from "./api";

const body = (response) => response.data;

export const authApi = {
  login: (credentials) => api.post("/auth/login", credentials).then(body),
  register: (account) => api.post("/auth/register", account).then(body)
};

// Public service forms. When the user is signed in, the token is sent
// automatically and the API links the record to the account.
export const emergencyApi = {
  create: (request) => api.post("/emergency", request).then(body)
};

export const bloodApi = {
  register: (donor) => api.post("/blood/register", donor).then(body)
};

export const foodApi = {
  donate: (donation) => api.post("/food/donate", donation).then(body)
};

export const volunteerApi = {
  register: (volunteer) => api.post("/volunteer/register", volunteer).then(body)
};

export const eventsApi = {
  // With a session, each event carries `joined`
  list: () => api.get("/events").then((response) => response.data.events),
  create: (event) => api.post("/events/create", event).then(body),
  join: (id) => api.put(`/events/join/${id}`).then((response) => response.data.event),
  leave: (id) => api.put(`/events/leave/${id}`).then((response) => response.data.event)
};

export const hospitalApi = {
  list: () => api.get("/hospital").then((response) => response.data.hospitals),
  register: (hospital) => api.post("/hospital/register", hospital).then(body)
};

export const ambulanceApi = {
  list: () => api.get("/ambulance").then((response) => response.data.ambulances),
  register: (ambulance) => api.post("/ambulance/register", ambulance).then(body)
};

// Signed-in account (any role): own profile, requests and volunteer assignments
export const meApi = {
  get: () => api.get("/me").then(body),
  update: (changes) => api.patch("/me", changes).then((response) => response.data.user),
  changePassword: (passwords) => api.put("/me/password", passwords).then(body),
  requests: () => api.get("/me/requests").then(body),
  cancelEmergency: (id) => api.put(`/me/emergencies/${id}/cancel`).then(body),
  assignments: () => api.get("/me/assignments").then(body),
  updateAssignment: (id, status, note) => api.put(`/me/assignments/${id}/status`, { status, note }).then(body)
};

// Administrators only (the API checks the admin role on every call)
export const adminApi = {
  summary: () => api.get("/admin/summary").then((response) => response.data.summary)
};

export const manageApi = {
  // params: { page, pageSize, q, sort, order, ...filters } -> { rows, pagination, facets }
  list: (resource, key, params = {}) =>
    api.get(`/manage/${resource}`, { params }).then((response) => ({
      rows: response.data[key],
      pagination: response.data.pagination,
      facets: response.data.facets || {}
    })),
  get: (resource, id) => api.get(`/manage/${resource}/${id}`).then((response) => response.data.record),
  create: (resource, values) => api.post(`/manage/${resource}`, values).then((response) => response.data.record),
  update: (resource, id, values) => api.put(`/manage/${resource}/${id}`, values).then((response) => response.data.record),
  remove: (resource, id) => api.delete(`/manage/${resource}/${id}`).then(body),
  setEmergencyStatus: (id, status, note) =>
    api.put(`/manage/emergencies/${id}/status`, { status, note }).then((response) => response.data.record),
  assignVolunteer: (id, volunteerId, note) =>
    api.put(`/manage/emergencies/${id}/assignment`, { volunteerId, note }).then((response) => response.data.record)
};
