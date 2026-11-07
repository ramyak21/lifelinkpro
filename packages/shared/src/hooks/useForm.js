import { useCallback, useMemo, useState } from "react";

// Controlled-form state with validation that only shows an error once the
// field has been visited (blur) or the user tried to submit.
export function useForm({ initialValues, validate, onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const errors = useMemo(() => validate(values), [validate, values]);

  const setValue = useCallback((name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
  }, []);

  const handleChange = useCallback(
    (event) => setValue(event.target.name, event.target.value),
    [setValue]
  );

  const handleBlur = useCallback((event) => {
    const { name } = event.target;
    setTouched((current) => (current[name] ? current : { ...current, [name]: true }));
  }, []);

  const visibleError = (name) => (touched[name] || submitAttempted ? errors[name] : undefined);

  // Spread onto a field component: <TextField {...field("name")} />
  const field = (name) => ({
    name,
    value: values[name] ?? "",
    onChange: handleChange,
    onBlur: handleBlur,
    error: visibleError(name)
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitAttempted(true);

    const invalid = Object.keys(errors);
    if (invalid.length > 0) {
      // Move focus to the first problem so keyboard and screen-reader users find it
      document.querySelector(`[name="${invalid[0]}"]`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = useCallback(() => {
    setValues(initialValues);
    setTouched({});
    setSubmitAttempted(false);
    // "Send another" swaps the success message back for the form: start on its first field
    requestAnimationFrame(() => {
      document.querySelector(`[name="${Object.keys(initialValues)[0]}"]`)?.focus();
    });
  }, [initialValues]);

  return { values, errors, submitting, field, setValue, visibleError, handleSubmit, reset };
}
