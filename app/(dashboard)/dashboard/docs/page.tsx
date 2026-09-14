import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { DocsBrowser } from "@/components/dashboard/DocsBrowser";
import { DOC_SECTIONS } from "@/lib/docs/content";

export default function DocsPage() {
  return (
    <PlatformPage
      eyebrow="Help"
      title="Documentation"
      description="How Agentmi actually behaves, section by section, with a link to the screen where each thing is done."
      action={{ href: "/dashboard/support", label: "Contact support" }}
    >
      <DocsBrowser sections={DOC_SECTIONS} />
    </PlatformPage>
  );
}
