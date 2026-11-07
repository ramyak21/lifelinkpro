import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LuHospital, LuSiren, LuUsers } from "react-icons/lu";
import AuthLayout from "@lifelink/shared/components/layout/AuthLayout";
import SignInForm from "@lifelink/shared/components/auth/SignInForm";
import Alert from "@lifelink/shared/components/ui/Alert";
import { useAuth } from "@lifelink/shared/hooks/useAuth";
import { useDocumentTitle } from "@lifelink/shared/hooks/useDocumentTitle";
import styles from "@lifelink/shared/components/auth/AuthForm.module.css";
import { USER_PORTAL_URL } from "../../config/portals";

const ADMIN_POINTS = [
  { icon: LuSiren, text: "Review, assign and track emergency requests" },
  { icon: LuUsers, text: "Manage donors, volunteers and user accounts" },
  { icon: LuHospital, text: "Maintain the hospital and ambulance directory" }
];

export default function Login() {
  useDocumentTitle("Administrator sign in");
  const { isAdmin, startSession, sessionExpired } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from;

  if (isAdmin) {
    return <Navigate to={from || "/"} replace />;
  }

  // Only administrator accounts get a session in this portal
  const handleAuthenticated = (data) => {
    if (data.user.role !== "admin") {
      return "This account doesn't have administrator access.";
    }
    startSession(data);
    navigate(from || "/", { replace: true });
    return null;
  };

  return (
    <AuthLayout
      brandTitle="Coordinate community help from one place."
      points={ADMIN_POINTS}
      logoSuffix="Admin"
      backTo={null}
      title="Administrator sign in"
      description="Sign in with an administrator account to manage LifeLink Pro."
      footer={
        USER_PORTAL_URL && (
          <>
            Not an administrator? <a href={USER_PORTAL_URL}>Go to the LifeLink Pro website</a>
          </>
        )
      }
    >
      {sessionExpired && (
        <Alert tone="warning" title="Your session has expired" className={styles.notice}>
          Please sign in again to continue.
        </Alert>
      )}

      <SignInForm submitLabel="Sign in to admin" onAuthenticated={handleAuthenticated} />
    </AuthLayout>
  );
}
