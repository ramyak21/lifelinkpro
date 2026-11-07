import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { LuCircleHelp, LuClipboardList, LuLayoutDashboard, LuMenu, LuShieldCheck, LuSiren, LuUserRound } from "react-icons/lu";
import Logo from "@lifelink/shared/components/layout/Logo";
import NavMenu from "./NavMenu";
import UserMenu from "@lifelink/shared/components/layout/UserMenu";
import Button from "@lifelink/shared/components/ui/Button";
import IconButton from "@lifelink/shared/components/ui/IconButton";
import Drawer from "@lifelink/shared/components/ui/Drawer";
import { SERVICE_GROUPS, SERVICES } from "../../config/services";
import { useAuth } from "@lifelink/shared/hooks/useAuth";
import { useSignOut } from "@lifelink/shared/hooks/useSignOut";
import { initials } from "@lifelink/shared/utils/format";
import cx from "@lifelink/shared/utils/cx";
import { ADMIN_PORTAL_URL } from "../../config/portals";
import styles from "./Navbar.module.css";

const accountLinks = (isAdmin) => [
  { to: "/dashboard", label: "Dashboard", icon: LuLayoutDashboard },
  { to: "/requests", label: "My requests", icon: LuClipboardList },
  { to: "/profile", label: "Profile", icon: LuUserRound },
  ...(isAdmin && ADMIN_PORTAL_URL ? [{ href: ADMIN_PORTAL_URL, label: "Admin portal", icon: LuShieldCheck }] : [])
];

export default function Navbar() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const signOut = useSignOut();

  const handleSignOut = () => {
    setMenuOpen(false);
    signOut("/");
  };

  const closeMenu = () => setMenuOpen(false);
  const navClass = ({ isActive }) => cx(styles.navLink, isActive && styles.active);

  return (
    <header className={styles.header}>
      <div className={cx("container", styles.bar)}>
        <Logo className={styles.logo} />

        <nav className={styles.desktopNav} aria-label="Main">
          <ul className={styles.navList}>
            {SERVICE_GROUPS.map((group) => (
              <li key={group.id}>
                <NavMenu label={group.title} items={group.services} />
              </li>
            ))}
            <li>
              <NavLink to="/events" className={navClass}>Events</NavLink>
            </li>
            <li>
              <NavLink to="/contact" className={navClass}>Help</NavLink>
            </li>
          </ul>
        </nav>

        <div className={styles.actions}>
          <Button to="/emergency" variant="danger" size="sm" leftIcon={<LuSiren />} className={styles.sos}>
            <span className={styles.sosLong}>Emergency</span>
            <span className={styles.sosShort}>SOS</span>
          </Button>

          <div className={styles.desktopAccount}>
            {isAuthenticated ? (
              <UserMenu user={user} links={accountLinks(isAdmin)} onSignOut={handleSignOut} />
            ) : (
              <>
                <Button to="/login" variant="ghost" size="sm">Sign in</Button>
                <Button to="/register" size="sm">Create account</Button>
              </>
            )}
          </div>

          <IconButton
            className={styles.menuButton}
            label="Open menu"
            icon={<LuMenu />}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          />
        </div>
      </div>

      <Drawer open={menuOpen} onClose={closeMenu} title="Menu" header={<Logo onClick={closeMenu} />}>
        <nav aria-label="Main" className={styles.mobileNav}>
          {SERVICE_GROUPS.map((group) => (
            <div key={group.id} className={styles.mobileGroup}>
              <h2 className={styles.mobileHeading}>{group.title}</h2>
              <ul>
                {group.services.map((service) => {
                  const Icon = service.icon;
                  return (
                    <li key={service.to}>
                      <NavLink
                        to={service.to}
                        className={({ isActive }) =>
                          cx(styles.mobileLink, service.urgent && styles.mobileUrgent, isActive && styles.mobileActive)
                        }
                        onClick={closeMenu}
                      >
                        <Icon aria-hidden="true" />
                        {service.title}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div className={styles.mobileGroup}>
            <h2 className={styles.mobileHeading}>More</h2>
            <ul>
              <li>
                <NavLink to="/events" className={({ isActive }) => cx(styles.mobileLink, isActive && styles.mobileActive)} onClick={closeMenu}>
                  <SERVICES.events.icon aria-hidden="true" />
                  Community events
                </NavLink>
              </li>
              <li>
                <NavLink to="/contact" className={({ isActive }) => cx(styles.mobileLink, isActive && styles.mobileActive)} onClick={closeMenu}>
                  <LuCircleHelp aria-hidden="true" />
                  Help &amp; contact
                </NavLink>
              </li>
            </ul>
          </div>

          <div className={styles.mobileAccount}>
            {isAuthenticated ? (
              <>
                <div className={styles.mobileIdentity}>
                  <span className={styles.mobileAvatar} aria-hidden="true">{initials(user.name)}</span>
                  <div>
                    <p className={styles.mobileName}>{user.name}</p>
                    <p className={styles.mobileEmail}>{user.email}</p>
                  </div>
                </div>
                <ul>
                  {accountLinks(isAdmin).map(({ to, href, label, icon: Icon }) => (
                    <li key={to || href}>
                      {href ? (
                        <a href={href} className={styles.mobileLink}>
                          <Icon aria-hidden="true" />
                          {label}
                        </a>
                      ) : (
                        <Link to={to} className={styles.mobileLink} onClick={closeMenu}>
                          <Icon aria-hidden="true" />
                          {label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
                <Button variant="secondary" fullWidth onClick={handleSignOut}>Sign out</Button>
              </>
            ) : (
              <div className={styles.mobileAuth}>
                <Button to="/register" fullWidth onClick={closeMenu}>Create account</Button>
                <Button to="/login" variant="secondary" fullWidth onClick={closeMenu}>Sign in</Button>
              </div>
            )}
          </div>
        </nav>
      </Drawer>
    </header>
  );
}
