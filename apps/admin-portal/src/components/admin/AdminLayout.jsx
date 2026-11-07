import { Suspense, useState } from "react";
import { Outlet } from "react-router-dom";
import { LuExternalLink, LuMenu, LuUserRound } from "react-icons/lu";
import AdminNav from "./AdminNav";
import Logo from "@lifelink/shared/components/layout/Logo";
import UserMenu from "@lifelink/shared/components/layout/UserMenu";
import PageLoader from "@lifelink/shared/components/layout/PageLoader";
import Button from "@lifelink/shared/components/ui/Button";
import IconButton from "@lifelink/shared/components/ui/IconButton";
import Drawer from "@lifelink/shared/components/ui/Drawer";
import { useAuth } from "@lifelink/shared/hooks/useAuth";
import { useSignOut } from "@lifelink/shared/hooks/useSignOut";
import { USER_PORTAL_URL } from "../../config/portals";
import styles from "./AdminLayout.module.css";

const ACCOUNT_LINKS = [{ to: "/account", label: "Your account", icon: LuUserRound }];

// Admin shell: fixed sidebar on desktop, drawer + top bar below 1024px
export default function AdminLayout() {
  const { user } = useAuth();
  const signOut = useSignOut();
  const [navOpen, setNavOpen] = useState(false);

  const handleSignOut = () => signOut("/login");

  return (
    <div className={styles.shell}>
      <a href="#main" className="skip-link">Skip to main content</a>

      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Logo to="/" suffix="Admin" />
        </div>
        <div className={styles.sidebarBody}>
          <AdminNav />
        </div>
      </aside>

      <div className={styles.content}>
        <header className={styles.topbar}>
          <IconButton
            className={styles.menuButton}
            label="Open admin menu"
            icon={<LuMenu />}
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
          />
          <Logo to="/" suffix="Admin" className={styles.topbarLogo} />

          <div className={styles.topbarActions}>
            {USER_PORTAL_URL && (
              <Button href={USER_PORTAL_URL} variant="ghost" size="sm" leftIcon={<LuExternalLink />} className={styles.viewSite}>
                View site
              </Button>
            )}
            <UserMenu
              user={user}
              links={ACCOUNT_LINKS}
              onSignOut={handleSignOut}
            />
          </div>
        </header>

        <main id="main" tabIndex={-1} className={styles.main}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <Drawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        side="left"
        title="Admin menu"
        header={<Logo to="/" suffix="Admin" onClick={() => setNavOpen(false)} />}
      >
        <AdminNav onNavigate={() => setNavOpen(false)} />
      </Drawer>
    </div>
  );
}
