import cx from "../../utils/cx";
import styles from "./Skeleton.module.css";

// Placeholder block shown while content loads (hidden from screen readers;
// the loading region itself announces "Loading …")
export default function Skeleton({ width = "100%", height = "1rem", radius = "sm", className }) {
  return (
    <span
      className={cx(styles.skeleton, styles[radius], className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

// A card-shaped placeholder for card grids
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className={styles.card} aria-hidden="true">
      <Skeleton width="40%" height="0.875rem" />
      <Skeleton width="75%" height="1.25rem" />
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} width={index === lines - 1 ? "55%" : "100%"} />
      ))}
    </div>
  );
}

// Table-shaped placeholder for admin lists
export function SkeletonTable({ rows = 6, label = "Loading" }) {
  return (
    <div className={styles.table} role="status" aria-busy="true">
      <span className="visually-hidden">{label}</span>
      <div className={styles.tableHeader} aria-hidden="true">
        <Skeleton width="30%" height="0.75rem" />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.tableRow} aria-hidden="true">
          <Skeleton width="22%" />
          <Skeleton width="18%" />
          <Skeleton width="26%" />
          <Skeleton width="12%" />
        </div>
      ))}
    </div>
  );
}

// Grid of card placeholders (same column logic as CardGrid) with a loading label
export function SkeletonGrid({ count = 6, label = "Loading", min = "300px" }) {
  return (
    <div className={styles.grid} style={{ "--card-min": min }} role="status" aria-busy="true">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}
