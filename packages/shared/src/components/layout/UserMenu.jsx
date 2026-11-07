import { useCallback, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LuChevronDown, LuLogOut } from "react-icons/lu";
import { useDismiss } from "../../hooks/useDismiss";
import { initials } from "../../utils/format";
import cx from "../../utils/cx";
import styles from "./UserMenu.module.css";

// Account dropdown: avatar button with the signed-in user's links and sign out.
// links: [{ to | href, label, icon }] — `href` for links to another app (e.g. the other portal)
export default function UserMenu({ user, links, onSignOut, align = "right" }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuId = useId();

  const close = useCallback((reason) => {
    setOpen(false);
    if (reason === "escape") buttonRef.current?.focus();
  }, []);

  useDismiss(containerRef, open, close);

  return (
    <div className={styles.menu} ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${user.name}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.avatar} aria-hidden="true">{initials(user.name)}</span>
        <span className={styles.name}>{user.name}</span>
        <LuChevronDown className={styles.chevron} aria-hidden="true" />
      </button>

      {open && (
        <div id={menuId} className={cx(styles.panel, styles[align])}>
          <div className={styles.identity}>
            <p className={styles.identityName}>{user.name}</p>
            <p className={styles.identityEmail}>{user.email}</p>
          </div>
          <ul className={styles.list}>
            {links.map(({ to, href, label, icon: Icon }) => (
              <li key={to || href}>
                {href ? (
                  <a href={href} className={styles.item}>
                    <Icon aria-hidden="true" />
                    {label}
                  </a>
                ) : (
                  <Link to={to} className={styles.item} onClick={() => setOpen(false)}>
                    <Icon aria-hidden="true" />
                    {label}
                  </Link>
                )}
              </li>
            ))}
            <li>
              <button
                type="button"
                className={cx(styles.item, styles.signOut)}
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
              >
                <LuLogOut aria-hidden="true" />
                Sign out
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
