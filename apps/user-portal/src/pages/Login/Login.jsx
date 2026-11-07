import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import MemberAuthLayout from "../../components/layout/MemberAuthLayout";
import SignInForm from "@lifelink/shared/components/auth/SignInForm";
import Alert from "@lifelink/shared/components/ui/Alert";
import { useAuth } from "@lifelink/shared/hooks/useAuth";
import { useDocumentTitle } from "@lifelink/shared/hooks/useDocumentTitle";
import styles from "@lifelink/shared/components/auth/AuthForm.module.css";
import { ADMIN_PORTAL_URL } from "../../config/portals";

export default function Login() {
  useDocumentTitle("Sign in");
  const { isAuthenticated, startSession, sessionExpired } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const { from, registered, email } = location.state || {};
  const destination = from || "/dashboard";

  if (isAuthenticated) {
    return <Navigate to={destination} replace />;
  }

  const handleAuthenticated = (data) => {
    startSession(data);
    navigate(destination, { replace: true });
  };

  return (
    <MemberAuthLayout
      title="Sign in"
      description="Welcome back. Sign in to your LifeLink Pro account."
      footer={
        <>
          New to LifeLink Pro? <Link to="/register">Create an account</Link>
        </>
      }
    >
      {registered && (
        <Alert tone="success" title="Your account is ready" className={styles.notice}>
          Sign in with your new email address and password.
        </Alert>
      )}
      {sessionExpired && !registered && (
        <Alert tone="warning" title="Your session has expired" className={styles.notice}>
          Please sign in again to continue.
        </Alert>
      )}

      <SignInForm initialEmail={email || ""} onAuthenticated={handleAuthenticated} />

      {ADMIN_PORTAL_URL && (
        <p className={styles.altLink}>
          Administrator? <a href={ADMIN_PORTAL_URL}>Go to the admin portal</a>
        </p>
      )}
    </MemberAuthLayout>
  );
}
