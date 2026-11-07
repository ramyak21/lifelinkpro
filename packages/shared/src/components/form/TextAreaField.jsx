import FieldShell from "./FieldShell";
import styles from "./Field.module.css";

// Multi-line text. With maxLength, shows a live "120 / 1000" counter.
export default function TextAreaField({ id, label, hint, error, optional, full = true, className, rows = 4, maxLength, value = "", ...textareaProps }) {
  const counter = maxLength ? (
    <span className={styles.counter} aria-hidden="true">
      {value.length} / {maxLength}
    </span>
  ) : null;

  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      full={full}
      className={className}
      counter={counter}
    >
      {(controlProps) => (
        <textarea
          {...controlProps}
          className={`${controlProps.className} ${styles.textarea}`}
          rows={rows}
          maxLength={maxLength}
          value={value}
          {...textareaProps}
        />
      )}
    </FieldShell>
  );
}
