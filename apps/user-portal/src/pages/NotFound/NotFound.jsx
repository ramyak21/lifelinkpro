import { LuHouse, LuSearchX, LuSiren } from "react-icons/lu";
import Button from "@lifelink/shared/components/ui/Button";
import EmptyState from "@lifelink/shared/components/ui/EmptyState";
import { useDocumentTitle } from "@lifelink/shared/hooks/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("Page not found");

  return (
    <div className="container page">
      <EmptyState
        as="h1"
        icon={<LuSearchX />}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved. Check the address, or use one of these links."
        action={
          <>
            <Button to="/" leftIcon={<LuHouse />}>Go to home</Button>
            <Button to="/emergency" variant="secondary" leftIcon={<LuSiren />}>Emergency SOS</Button>
          </>
        }
      />
    </div>
  );
}
