import { LuLogOut, LuShieldCheck } from "react-icons/lu";
import PageHeader from "@lifelink/shared/components/ui/PageHeader";
import Card, { CardHeader } from "@lifelink/shared/components/ui/Card";
import Badge from "@lifelink/shared/components/ui/Badge";
import Button from "@lifelink/shared/components/ui/Button";
import { NameForm, PasswordForm } from "@lifelink/shared/components/account/AccountForms";
import SplitLayout from "../../components/layout/SplitLayout";
import { useAuth } from "@lifelink/shared/hooks/useAuth";
import { useSignOut } from "@lifelink/shared/hooks/useSignOut";
import { useToast } from "@lifelink/shared/hooks/useToast";
import { useDocumentTitle } from "@lifelink/shared/hooks/useDocumentTitle";
import { initials } from "@lifelink/shared/utils/format";
import { roleBadge } from "@lifelink/shared/utils/status";
import { ADMIN_PORTAL_URL } from "../../config/portals";
import styles from "./Profile.module.css";

export default function Profile() {
  useDocumentTitle("Your profile");
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const signOut = useSignOut();
  const role = roleBadge(user.role);

  const handleSignOut = () => {
    signOut("/");
    toast.info("You've been signed out.");
  };

  return (
    <div className="container page">
      <PageHeader
        backTo="/dashboard"
        backLabel="Dashboard"
        eyebrow="Account"
        title="Your profile"
        description="Your account details, and how to keep your account secure."
      />

      <SplitLayout
        asideLabel="Session"
        aside={
          <Card padding="md">
            <CardHeader title="Session" description="Signed in on this device." as="h2" />
            <div className={styles.sessionActions}>
              {isAdmin && ADMIN_PORTAL_URL && (
                <Button href={ADMIN_PORTAL_URL} variant="secondary" fullWidth leftIcon={<LuShieldCheck />}>
                  Open admin portal
                </Button>
              )}
              <Button variant="danger-ghost" fullWidth leftIcon={<LuLogOut />} onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </Card>
        }
      >
        <Card padding="lg">
          <div className={styles.identity}>
            <span className={styles.avatar} aria-hidden="true">{initials(user.name)}</span>
            <div className={styles.identityText}>
              <h2 className={styles.name}>{user.name}</h2>
              <Badge tone={role.tone}>{role.label}</Badge>
            </div>
          </div>

          <div className={styles.form}>
            <NameForm />
          </div>
        </Card>

        <Card padding="lg">
          <PasswordForm />
        </Card>
      </SplitLayout>
    </div>
  );
}
