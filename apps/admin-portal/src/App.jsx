import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RouteEffects from "@lifelink/shared/components/layout/RouteEffects";
import PageLoader from "@lifelink/shared/components/layout/PageLoader";
import RequireAdmin from "./components/layout/RequireAdmin";
import AdminLayout from "./components/admin/AdminLayout";
import Login from "./pages/Login/Login";
import NotFound from "./pages/NotFound/NotFound";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard/AdminDashboard"));
const AdminManage = lazy(() => import("./pages/AdminManage/AdminManage"));
const EmergencyDetail = lazy(() => import("./pages/EmergencyDetail/EmergencyDetail"));
const Account = lazy(() => import("./pages/Account/Account"));

// Admin portal route tree. Every screen requires an administrator session; the API
// re-checks the administrator role on every request regardless of what this app shows.
export default function App() {
  return (
    <>
      <RouteEffects />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="manage" element={<Navigate to="emergencies" replace />} />
            <Route path="manage/:resource" element={<AdminManage />} />
            <Route path="emergencies/:id" element={<EmergencyDetail />} />
            <Route path="account" element={<Account />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
