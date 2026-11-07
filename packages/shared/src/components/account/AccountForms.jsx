import { useCallback, useState } from "react";
import Button from "../ui/Button";
import TextField from "../form/TextField";
import PasswordField from "../form/PasswordField";
import { FormActions, FormError } from "../form/FormLayout";
import { meApi } from "../../services/lifelink";
import { useAuth } from "../../hooks/useAuth";
import { useForm } from "../../hooks/useForm";
import { useToast } from "../../hooks/useToast";
import { getErrorMessage } from "../../utils/errors";
import { matches, minLength, required, validate } from "../../utils/validation";
import styles from "./AccountForms.module.css";

// The signed-in account's own details and password (PUT /api/me, PUT /api/me/password).
// Used by the user portal's Profile page and the admin portal's Account page.

const validateName = (values) => validate(values, { name: [required("Enter your full name.")] });

const validatePassword = (values) =>
  validate(values, {
    currentPassword: [required("Enter your current password.")],
    newPassword: [required("Choose a new password."), minLength(8, "Use at least 8 characters for your password.")],
    confirmPassword: [required("Re-enter the new password."), matches("newPassword", "The passwords don't match.")]
  });

const EMPTY_PASSWORDS = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function NameForm({ titleAs: Title = "h3" }) {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [error, setError] = useState(null);

  const form = useForm({
    initialValues: { name: user.name },
    validate: validateName,
    onSubmit: useCallback(async (values) => {
      setError(null);
      try {
        const updated = await meApi.update({ name: values.name.trim() });
        updateUser({ name: updated.name });
        toast.success("Your name was updated.");
      } catch (saveError) {
        setError(getErrorMessage(saveError, "We couldn't update your name. Please try again."));
      }
    }, [toast, updateUser])
  });

  return (
    <form noValidate onSubmit={form.handleSubmit} className={styles.form} aria-labelledby="details-title">
      <Title id="details-title" className={styles.formTitle}>Your details</Title>
      <FormError title="Not saved">{error}</FormError>
      <TextField label="Full name" autoComplete="name" maxLength={150} {...form.field("name")} />
      <TextField label="Email address" value={user.email} readOnly hint="Your sign-in email can't be changed." name="email" />
      <FormActions>
        <Button type="submit" loading={form.submitting}>Save name</Button>
      </FormActions>
    </form>
  );
}

export function PasswordForm() {
  const toast = useToast();
  const [error, setError] = useState(null);

  const form = useForm({
    initialValues: EMPTY_PASSWORDS,
    validate: validatePassword,
    onSubmit: async (values) => {
      setError(null);
      try {
        await meApi.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
        form.reset();
        toast.success("Your password was changed.");
      } catch (saveError) {
        setError(getErrorMessage(saveError, "We couldn't change your password. Please try again."));
      }
    }
  });

  return (
    <form noValidate onSubmit={form.handleSubmit} className={styles.form} aria-labelledby="password-title">
      <h2 id="password-title" className={styles.formTitle}>Change password</h2>
      <FormError title="Password not changed">{error}</FormError>
      <PasswordField label="Current password" autoComplete="current-password" {...form.field("currentPassword")} />
      <PasswordField label="New password" autoComplete="new-password" hint="At least 8 characters." {...form.field("newPassword")} />
      <PasswordField label="Confirm new password" autoComplete="new-password" {...form.field("confirmPassword")} />
      <FormActions>
        <Button type="submit" loading={form.submitting}>Change password</Button>
      </FormActions>
    </form>
  );
}
