import { LuRefreshCw, LuTriangleAlert } from "react-icons/lu";
import Button from "./Button";
import cx from "../../utils/cx";
import { getErrorMessage } from "../../utils/errors";
import styles from "./StateMessage.module.css";

// Shown when data could not be loaded. Never displays raw technical errors.
export default function ErrorState({
  title = "Something went wrong",
  description,
  error,
  onRetry,
  retrying = false,
  compact = false
}) {
  const message = description || getErrorMessage(error, "We couldn't load this information. Please try again.");

  return (
    <div className={cx(styles.state, styles.error, compact && styles.compact)} role="alert">
      <div className={styles.icon} aria-hidden="true"><LuTriangleAlert /></div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{message}</p>
      {onRetry && (
        <div className={styles.action}>
          <Button variant="secondary" leftIcon={<LuRefreshCw />} onClick={onRetry} loading={retrying}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
