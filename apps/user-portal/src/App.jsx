import { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import PublicLayout from "./components/layout/PublicLayout";
import RequireAuth from "./components/layout/RequireAuth";
import RouteEffects from "@lifelink/shared/components/layout/RouteEffects";
import PageLoader from "@lifelink/shared/components/layout/PageLoader";

// Public site
import Home from "./pages/Home/Home";
import Contact from "./pages/Contact/Contact";
import NotFound from "./pages/NotFound/NotFound";

// Services
import Emergency from "./pages/Emergency/Emergency";
import BloodDonation from "./pages/BloodDonation/BloodDonation";
import FoodDonation from "./pages/FoodDonation/FoodDonation";
import Volunteer from "./pages/Volunteer/Volunteer";
import Events from "./pages/Events/Events";
import EventCreate from "./pages/EventCreate/EventCreate";
import Hospitals from "./pages/Hospitals/Hospitals";
import HospitalRegister from "./pages/HospitalRegister/HospitalRegister";
import Ambulance from "./pages/Ambulance/Ambulance";
import AmbulanceRegister from "./pages/AmbulanceRegister/AmbulanceRegister";

// Accounts
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Dashboard from "./pages/Dashboard/Dashboard";
import Profile from "./pages/Profile/Profile";
import MyRequests from "./pages/MyRequests/MyRequests";
import MyAssignments from "./pages/MyAssignments/MyAssignments";

// User portal only. Administration lives in the separate admin portal (apps/admin-portal).
export default function App() {
  return (
    <>
      <RouteEffects />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="contact" element={<Contact />} />

            <Route path="emergency" element={<Emergency />} />
            <Route path="blood" element={<BloodDonation />} />
            <Route path="food" element={<FoodDonation />} />
            <Route path="volunteer" element={<Volunteer />} />
            <Route path="events" element={<Events />} />
            <Route path="events/new" element={<EventCreate />} />
            <Route path="hospitals" element={<Hospitals />} />
            <Route path="hospitals/register" element={<HospitalRegister />} />
            <Route path="ambulance" element={<Ambulance />} />
            <Route path="ambulance/register" element={<AmbulanceRegister />} />

            <Route element={<RequireAuth />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="requests" element={<MyRequests />} />
              <Route path="assignments" element={<MyAssignments />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Routes>
      </Suspense>
    </>
  );
}
