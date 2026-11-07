import { useState } from "react";
import Alert from "../ui/Alert";
import Button from "../ui/Button";
import TextField from "../form/TextField";
import PasswordField from "../form/PasswordField";
import { authApi } from "../../services/lifelink";
import { useForm } from "../../hooks/useForm";
import { getErrorMessage } from "../../utils/errors";
import { email, required, validate } from "../../utils/validation";
import styles from "./AuthForm.module.css";

const validateSignIn = (values) =>
  validate(values, {
    email: [required("Enter your email address."), email()],
    password: [required("Enter your password.")]
  });

// Email + password sign-in (POST /api/auth/login). onAuthenticated(data) may
// return an error message to show instead of continuing.
export default function SignInForm({ initialEmail = "", submitLabel = "Sign in", onAuthenticated }) {
  const [serverError, setServerError] = useState("");

  const form = useForm({
    initialValues: { email: initialEmail, password: "" },
    validate: validateSignIn,
    onSubmit: async (values) => {
      setServerError("");
      try {
        const data = await authApi.login({ email: values.email.trim(), password: values.password });
        const problem = onAuthenticated(data);
        if (problem) setServerError(problem);
      } catch (error) {
        setServerError(getErrorMessage(error, "We couldn't sign you in. Please try again."));
      }
    }
  });

  return (
    <form noValidate onSubmit={form.handleSubmit} className={styles.form}>
      {serverError && (
        <Alert tone="danger" title="Sign-in failed">
          {serverError}
        </Alert>
      )}
      <TextField label="Email address" type="email" inputMode="email" autoComplete="email" {...form.field("email")} />
      <PasswordField label="Password" autoComplete="current-password" {...form.field("password")} />
      <Button type="submit" size="lg" fullWidth loading={form.submitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
