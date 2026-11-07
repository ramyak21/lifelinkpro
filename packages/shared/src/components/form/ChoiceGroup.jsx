import { useId } from "react";
import { LuCircleAlert } from "react-icons/lu";
import cx from "../../utils/cx";
import styles from "./ChoiceGroup.module.css";

// Large, tappable radio options in a <fieldset>.
// options: [{ value, label, description?, icon? }]; columns: 2 | 3 | 4
export default function ChoiceGroup({
  legend,
  hint,
  error,
  optional,
  name,
  value,
  onChange,
  onBlur,
  options,
  columns = 2,
  compact = false,
  full = true
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <fieldset
      className={cx(styles.group, full && styles.full)}
      aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
    >
      <legend className={styles.legend}>
        {legend}
        {optional && <span className={styles.optional}> (optional)</span>}
      </legend>
      {hint && <p id={hintId} className={styles.hint}>{hint}</p>}

      <div className={cx(styles.options, styles[`cols${columns}`], compact && styles.compact)}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label key={option.value} className={cx(styles.option, selected && styles.selected, error && styles.invalid)}>
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={onChange}
                onBlur={onBlur}
                required={!optional}
                aria-invalid={error ? true : undefined}
                className={styles.radio}
              />
              {option.icon && <span className={styles.icon} aria-hidden="true">{option.icon}</span>}
              <span className={styles.text}>
                <span className={styles.label}>{option.label}</span>
                {option.description && <span className={styles.description}>{option.description}</span>}
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <p id={errorId} className={styles.error}>
          <LuCircleAlert aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </fieldset>
  );
}
