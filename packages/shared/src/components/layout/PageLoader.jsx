import Spinner from "../ui/Spinner";
import styles from "./PageLoader.module.css";

// Shown while a lazily loaded page's code downloads
export default function PageLoader() {
  return (
    <div className={styles.loader}>
      <Spinner size="lg" label="Loading page" />
    </div>
  );
}
