import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@lifelink/shared/hooks/useAuth";

// Guards member pages. The API still checks every protected request; this only keeps the UI honest.
export default function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children ?? <Outlet />;
}
