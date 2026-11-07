import { useId } from "react";
import cx from "../../utils/cx";
import styles from "./SegmentedControl.module.css";

// Compact single-choice filter ("Upcoming | Past | All"), built on native radios
// so arrow keys move between options.
export default function SegmentedControl({ label, options, value, onChange, className }) {
  const name = useId();

  return (
    <fieldset className={cx(styles.control, className)}>
      <legend className="visually-hidden">{label}</legend>
      {options.map((option) => (
        <label key={option.value} className={cx(styles.option, value === option.value && styles.selected)}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className={styles.input}
          />
          <span>{option.label}</span>
          {option.count !== undefined && <span className={styles.count}>{option.count}</span>}
        </label>
      ))}
    </fieldset>
  );
}
