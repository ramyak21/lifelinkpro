import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import MemberAuthLayout from "../../components/layout/MemberAuthLayout";
import Alert from "@lifelink/shared/components/ui/Alert";
import Button from "@lifelink/shared/components/ui/Button";
import TextField from "@lifelink/shared/components/form/TextField";
import PasswordField from "@lifelink/shared/components/form/PasswordField";
import { authApi } from "@lifelink/shared/services/lifelink";
import { useAuth } from "@lifelink/shared/hooks/useAuth";
import { useForm } from "@lifelink/shared/hooks/useForm";
import { useDocumentTitle } from "@lifelink/shared/hooks/useDocumentTitle";
import { getErrorMessage } from "@lifelink/shared/utils/errors";
import { email, matches, minLength, required, validate } from "@lifelink/shared/utils/validation";
import styles from "@lifelink/shared/components/auth/AuthForm.module.css";

const validateAccount = (values) =>
  validate(values, {
    name: [required("Enter your full name.")],
    email: [required("Enter your email address."), email()],
    password: [required("Create a password."), minLength(8, "Use at least 8 characters for your password.")],
    confirmPassword: [required("Re-enter your password."), matches("password", "The passwords don't match.")]
  });

const INITIAL_VALUES = { name: "", email: "", password: "", confirmPassword: "" };

export default function Register() {
  useDocumentTitle("Create an account");
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);

  const form = useForm({
    initialValues: INITIAL_VALUES,
    validate: validateAccount,
    onSubmit: async (values) => {
      setServerError(null);
      try {
        await authApi.register({
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password
        });
        navigate("/login", { state: { registered: true, email: values.email.trim() } });
      } catch (error) {
        const message = getErrorMessage(error, "We couldn't create your account. Please try again.");
        setServerError(
          message === "User already exists"
            ? { title: "This email is already registered", text: "Sign in instead, or use a different email address.", signInEmail: values.email.trim() }
            : { title: "We couldn't create your account", text: message }
        );
      }
    }
  });

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <MemberAuthLayout
      title="Create your account"
      description="Get a personal dashboard with quick access to every LifeLink Pro service."
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form noValidate onSubmit={form.handleSubmit} className={styles.form}>
        {serverError && (
          <Alert
            tone="danger"
            title={serverError.title}
            action={
              serverError.signInEmail && (
                <Button to="/login" state={{ email: serverError.signInEmail }} variant="secondary" size="sm">
                  Go to sign in
                </Button>
              )
            }
          >
            {serverError.text}
          </Alert>
        )}
        <TextField label="Full name" autoComplete="name" maxLength={150} {...form.field("name")} />
        <TextField label="Email address" type="email" inputMode="email" autoComplete="email" maxLength={255} {...form.field("email")} />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          hint="At least 8 characters."
          {...form.field("password")}
        />
        <PasswordField label="Confirm password" autoComplete="new-password" {...form.field("confirmPassword")} />
        <Button type="submit" size="lg" fullWidth loading={form.submitting}>
          Create account
        </Button>
      </form>
    </MemberAuthLayout>
  );
}
