import { useId } from "react";
import { LuSearch, LuX } from "react-icons/lu";
import cx from "../../utils/cx";
import styles from "./SearchInput.module.css";

// Search box for filtering lists. The label is visually hidden but announced.
export default function SearchInput({ label = "Search", value, onChange, placeholder, className }) {
  const id = useId();

  return (
    <div className={cx(styles.search, className)}>
      <label htmlFor={id} className="visually-hidden">{label}</label>
      <LuSearch className={styles.icon} aria-hidden="true" />
      <input
        id={id}
        type="search"
        className={styles.input}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
      />
      {value && (
        <button type="button" className={styles.clear} onClick={() => onChange("")} aria-label="Clear search">
          <LuX aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
