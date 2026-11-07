import { useMemo, useState } from "react";
import Button from "@lifelink/shared/components/ui/Button";
import TextField from "@lifelink/shared/components/form/TextField";
import TextAreaField from "@lifelink/shared/components/form/TextAreaField";
import ChoiceGroup from "@lifelink/shared/components/form/ChoiceGroup";
import { FormActions, FormError } from "@lifelink/shared/components/form/FormLayout";
import { useForm } from "@lifelink/shared/hooks/useForm";
import { getErrorMessage } from "@lifelink/shared/utils/errors";
import { email, phone, required, validate, wholeNumberBetween } from "@lifelink/shared/utils/validation";
import styles from "./RecordForm.module.css";

// Builds browser-side rules from the field definitions (the API applies the same rules)
const rulesFor = (fields) =>
  Object.fromEntries(
    fields.map((field) => {
      const rules = [];
      if (field.required) rules.push(required(`Enter ${field.label.toLowerCase()}.`));
      if (field.type === "tel") rules.push(phone());
      if (field.type === "email") rules.push(email());
      if (field.type === "number") rules.push(wholeNumberBetween(field.min, field.max, `${field.label} must be between ${field.min} and ${field.max}.`));
      if (field.max && !["number", "choice", "date"].includes(field.type)) {
        rules.push([(value) => String(value ?? "").trim().length <= field.max, `${field.label} can be at most ${field.max} characters.`]);
      }
      return [field.name, rules];
    })
  );

// Create / edit form for one admin resource (see adminResources.jsx `fields`).
// onSave(values) must return a promise; errors from the API are shown above the form.
export default function RecordForm({ fields, initialValues, submitLabel, onSave, onCancel }) {
  const [serverError, setServerError] = useState(null);
  const startValues = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.name, initialValues?.[field.name] ?? ""])),
    [fields, initialValues]
  );
  const validateValues = useMemo(() => {
    const rules = rulesFor(fields);
    return (values) => validate(values, rules);
  }, [fields]);

  const form = useForm({
    initialValues: startValues,
    validate: validateValues,
    onSubmit: async (values) => {
      setServerError(null);
      const payload = Object.fromEntries(
        fields.map((field) => {
          const raw = String(values[field.name] ?? "").trim();
          return [field.name, field.upperCase ? raw.toUpperCase() : raw];
        })
      );
      try {
        await onSave(payload);
      } catch (error) {
        setServerError(getErrorMessage(error, "The record couldn't be saved. Please try again."));
      }
    }
  });

  return (
    <form noValidate onSubmit={form.handleSubmit} className={styles.form}>
      <FormError title="Not saved">{serverError}</FormError>
      <div className={styles.grid}>
        {fields.map((field) => {
          const common = { label: field.label, optional: !field.required, ...form.field(field.name) };
          if (field.type === "textarea") return <TextAreaField key={field.name} {...common} maxLength={field.max} />;
          if (field.type === "choice") {
            return (
              <ChoiceGroup key={field.name}
                {...common}
                legend={field.label}
                options={field.options}
                columns={field.columns || 2}
                compact={field.compact}
              />
            );
          }
          return (
            <TextField key={field.name}
              {...common}
              full={field.full}
              type={field.type === "tel" ? "tel" : field.type === "email" ? "email" : field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
              inputMode={field.type === "number" ? "numeric" : undefined}
              maxLength={field.max && field.type !== "number" ? field.max : undefined}
            />
          );
        })}
      </div>
      <FormActions>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={form.submitting}>{submitLabel}</Button>
      </FormActions>
    </form>
  );
}
