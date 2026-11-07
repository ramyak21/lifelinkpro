import { LuSearchX } from "react-icons/lu";
import EmptyState from "@lifelink/shared/components/ui/EmptyState";
import Button from "@lifelink/shared/components/ui/Button";
import { useDocumentTitle } from "@lifelink/shared/hooks/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("Page not found · Admin");

  return (
    <>
      <h1 className="visually-hidden">Page not found</h1>
      <EmptyState
        icon={<LuSearchX />}
        title="This admin page doesn't exist"
        description="Check the address, or go back to the dashboard."
        action={<Button to="/">Go to the dashboard</Button>}
      />
    </>
  );
}
