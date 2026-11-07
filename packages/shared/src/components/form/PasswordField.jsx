import { useState } from "react";
import { LuEye, LuEyeOff } from "react-icons/lu";
import FieldShell from "./FieldShell";
import styles from "./PasswordField.module.css";

// Password input with a show/hide toggle
export default function PasswordField({ id, label = "Password", hint, error, optional, full, className, ...inputProps }) {
  const [visible, setVisible] = useState(false);

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} full={full} className={className}>
      {(controlProps) => (
        <div className={styles.wrap}>
          <input
            type={visible ? "text" : "password"}
            {...controlProps}
            className={`${controlProps.className} ${styles.input}`}
            {...inputProps}
          />
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
          >
            {visible ? <LuEyeOff aria-hidden="true" /> : <LuEye aria-hidden="true" />}
          </button>
        </div>
      )}
    </FieldShell>
  );
}
