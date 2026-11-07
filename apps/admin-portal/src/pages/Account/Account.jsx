import PageHeader from "@lifelink/shared/components/ui/PageHeader";
import Card from "@lifelink/shared/components/ui/Card";
import Alert from "@lifelink/shared/components/ui/Alert";
import { NameForm, PasswordForm } from "@lifelink/shared/components/account/AccountForms";
import { useDocumentTitle } from "@lifelink/shared/hooks/useDocumentTitle";
import styles from "./Account.module.css";

// /account — the signed-in administrator's own name and password
export default function Account() {
  useDocumentTitle("Your account · Admin");

  return (
    <>
      <PageHeader eyebrow="Account" title="Your account" description="Your administrator details and password." />
      <Alert tone="info" className={styles.note}>
        Administrator access is granted by another administrator on the Users screen. Your own role can't be changed here.
      </Alert>
      <div className={styles.grid}>
        <Card padding="lg">
          <NameForm titleAs="h2" />
        </Card>
        <Card padding="lg">
          <PasswordForm />
        </Card>
      </div>
    </>
  );
}
