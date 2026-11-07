import { useId } from "react";
import { LuCircleAlert } from "react-icons/lu";
import cx from "../../utils/cx";
import styles from "./Field.module.css";

// Shared label / hint / error layout for TextField, SelectField and TextAreaField.
// children receives the props the control needs ({ id, aria-* }).
export default function FieldShell({ id: idProp, label, hint, error, optional, full, className, counter, children }) {
  const generatedId = useId();
  const id = idProp || generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const controlProps = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
    required: !optional,
    className: cx(styles.control, error && styles.invalid)
  };

  return (
    <div className={cx(styles.field, full && styles.full, className)}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
          {optional && <span className={styles.optional}> (optional)</span>}
        </label>
        {counter}
      </div>
      {children(controlProps)}
      {hint && <p id={hintId} className={styles.hint}>{hint}</p>}
      {error && (
        <p id={errorId} className={styles.error}>
          <LuCircleAlert aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
