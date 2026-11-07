import cx from "@lifelink/shared/utils/cx";
import styles from "./CardGrid.module.css";

// Responsive grid: as many columns as fit, each at least `min` wide
// (1 column on phones, 2 on tablets, 3–4 on desktops).
export default function CardGrid({ min = "300px", as: Tag = "div", className, style, children, ...rest }) {
  return (
    <Tag className={cx(styles.grid, className)} style={{ "--card-min": min, ...style }} {...rest}>
      {children}
    </Tag>
  );
}
