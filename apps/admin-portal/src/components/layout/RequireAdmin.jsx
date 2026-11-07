import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@lifelink/shared/hooks/useAuth";

// Keeps the admin UI honest: no administrator session -> sign-in page.
// This is convenience only; the API enforces the administrator role on every admin request.
export default function RequireAdmin({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
