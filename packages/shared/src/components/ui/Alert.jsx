import { LuCircleAlert, LuCircleCheck, LuInfo, LuTriangleAlert } from "react-icons/lu";
import cx from "../../utils/cx";
import styles from "./Alert.module.css";

const ICONS = {
  info: LuInfo,
  success: LuCircleCheck,
  warning: LuTriangleAlert,
  danger: LuCircleAlert
};

// Inline message. Danger alerts are announced immediately (role="alert").
export default function Alert({ tone = "info", title, action, className, children }) {
  const Icon = ICONS[tone];

  return (
    <div className={cx(styles.alert, styles[tone], className)} role={tone === "danger" ? "alert" : "status"}>
      <Icon className={styles.icon} aria-hidden="true" />
      <div className={styles.body}>
        {title && <p className={styles.title}>{title}</p>}
        {children && <div className={styles.text}>{children}</div>}
        {action && <div className={styles.action}>{action}</div>}
      </div>
    </div>
  );
}
