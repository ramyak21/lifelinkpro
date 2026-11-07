import cx from "../../utils/cx";
import buttonStyles from "./Button.module.css";
import styles from "./IconButton.module.css";

const VARIANTS = {
  ghost: buttonStyles.ghost,
  secondary: buttonStyles.secondary,
  "danger-ghost": buttonStyles.dangerGhost
};

// Square icon-only button. `label` is required: it is the accessible name.
export default function IconButton({ label, icon, variant = "ghost", className, type = "button", ...rest }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(buttonStyles.button, VARIANTS[variant], styles.iconButton, className)}
      {...rest}
    >
      <span aria-hidden="true" className={styles.icon}>{icon}</span>
    </button>
  );
}
