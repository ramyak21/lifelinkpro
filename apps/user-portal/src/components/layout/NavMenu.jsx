import { useCallback, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LuChevronDown } from "react-icons/lu";
import { useDismiss } from "@lifelink/shared/hooks/useDismiss";
import cx from "@lifelink/shared/utils/cx";
import styles from "./NavMenu.module.css";

// Desktop dropdown for a group of services (disclosure pattern: a button that
// shows/hides a list of links). Closes on Escape, outside click or navigation.
export default function NavMenu({ label, items }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuId = useId();
  const { pathname } = useLocation();

  const close = useCallback((reason) => {
    setOpen(false);
    if (reason === "escape") buttonRef.current?.focus();
  }, []);

  useDismiss(containerRef, open, close);

  const active = items.some((item) => pathname.startsWith(item.to));

  return (
    <div className={styles.menu} ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className={cx(styles.trigger, active && styles.active)}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <LuChevronDown className={cx(styles.chevron, open && styles.chevronOpen)} aria-hidden="true" />
      </button>

      {open && (
        <div id={menuId} className={styles.panel}>
          <ul className={styles.list}>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cx(styles.item, item.urgent && styles.urgent)}
                    onClick={() => setOpen(false)}
                  >
                    <span className={styles.itemIcon} aria-hidden="true">
                      <Icon />
                    </span>
                    <span className={styles.itemText}>
                      <span className={styles.itemTitle}>{item.title}</span>
                      <span className={styles.itemDescription}>{item.description}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
