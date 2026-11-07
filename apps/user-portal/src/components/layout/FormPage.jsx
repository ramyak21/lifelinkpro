import PageHeader from "@lifelink/shared/components/ui/PageHeader";
import Card from "@lifelink/shared/components/ui/Card";
import SplitLayout from "./SplitLayout";
import { useDocumentTitle } from "@lifelink/shared/hooks/useDocumentTitle";

// Shared structure for service forms: header → form card → guidance panel.
// documentTitle: shorter browser-tab title when the heading is long.
export default function FormPage({ title, documentTitle, eyebrow, description, backTo, backLabel, tone, aside, asideLabel, children }) {
  useDocumentTitle(documentTitle ?? title);

  return (
    <div className="container page">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        backTo={backTo}
        backLabel={backLabel}
        tone={tone}
      />
      <SplitLayout aside={aside} asideLabel={asideLabel}>
        <Card padding="lg">{children}</Card>
      </SplitLayout>
    </div>
  );
}
