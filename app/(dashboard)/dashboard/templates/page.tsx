import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { TemplateGallery, type TemplateCard } from "@/components/dashboard/TemplateGallery";
import { templateRequirements, templatePrompt } from "@/lib/templates/describe";

export default async function TemplatesPage() {
  await getOrgContext();
  const db = createClient();

  const { data: templates } = await db
    .from("templates")
    .select("id, name, description, kind, category, config")
    .order("category");

  const cards: TemplateCard[] = (templates ?? []).map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description ?? "An Agentmi starting point.",
    kind: template.kind,
    category: template.category,
    // Requirements and the preview are read from the template's own config, so
    // a card can never promise something the configuration does not contain.
    requirements: templateRequirements(template.config),
    prompt: templatePrompt(template.config),
  }));

  return (
    <PlatformPage
      eyebrow="Ecosystem"
      title="Templates"
      description="Proven starting points. A template seeds your agent's instructions and expected setup; the agent is yours to change from the moment it is created."
      action={{ href: "/dashboard/create", label: "Start from scratch" }}
    >
      <TemplateGallery templates={cards} />
    </PlatformPage>
  );
}
