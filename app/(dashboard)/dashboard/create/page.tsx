import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PromptEngineerWizard } from "@/components/wizard/PromptEngineerWizard";

export default async function CreateAgentPage({
  searchParams,
}: {
  searchParams: { template?: string };
}) {
  const ctx = await getOrgContext();
  const supabase = createClient();

  const [{ data: templates }, { count: agentCount }] = await Promise.all([
    supabase.from("templates").select("id, name, description").eq("kind", "ai"),
    supabase
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("org_id", ctx.orgId),
  ]);

  const available = templates ?? [];

  // The Templates page links here with ?template=<id>. Resolve it against the
  // real list rather than trusting the query string — an unknown or malformed
  // id simply starts the wizard with nothing preselected.
  const requested = searchParams.template;
  const initialTemplateId =
    requested && available.some((t) => t.id === requested) ? requested : null;

  return (
    <PromptEngineerWizard
      templates={available}
      isFirstBuildForOrg={(agentCount ?? 0) === 0}
      isAdmin={ctx.isAdmin}
      initialTemplateId={initialTemplateId}
    />
  );
}
