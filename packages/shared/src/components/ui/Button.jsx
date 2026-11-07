import { Link } from "react-router-dom";
import Spinner from "./Spinner";
import cx from "../../utils/cx";
import styles from "./Button.module.css";

const VARIANTS = {
  primary: styles.primary,
  secondary: styles.secondary,
  outline: styles.outline,
  ghost: styles.ghost,
  danger: styles.danger,
  "danger-ghost": styles.dangerGhost,
  success: styles.success
};

// One button for the whole app. Renders a <Link> with `to`, an <a> with `href`,
// otherwise a <button>. `loading` disables it and shows a spinner.
export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  to,
  href,
  type = "button",
  disabled,
  className,
  children,
  ...rest
}) {
  const classes = cx(
    styles.button,
    VARIANTS[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    loading && styles.loading,
    className
  );

  const content = (
    <>
      {loading ? (
        <Spinner size="sm" decorative />
      ) : (
        leftIcon && <span className={styles.icon} aria-hidden="true">{leftIcon}</span>
      )}
      <span>{children}</span>
      {rightIcon && !loading && <span className={styles.icon} aria-hidden="true">{rightIcon}</span>}
    </>
  );

  if (to) {
    return <Link to={to} className={classes} {...rest}>{content}</Link>;
  }

  if (href) {
    return <a href={href} className={classes} {...rest}>{content}</a>;
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
}
