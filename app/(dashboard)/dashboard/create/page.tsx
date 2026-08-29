import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PromptEngineerWizard } from "@/components/wizard/PromptEngineerWizard";

export default async function CreateAgentPage() {
  const ctx = await getOrgContext();
  const supabase = createClient();

  const [{ data: templates }, { count: agentCount }] = await Promise.all([
    supabase.from("templates").select("id, name, description").eq("kind", "ai"),
    supabase
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("org_id", ctx.orgId),
  ]);

  return (
    <PromptEngineerWizard
      templates={templates ?? []}
      isFirstBuildForOrg={(agentCount ?? 0) === 0}
      isAdmin={ctx.isAdmin}
    />
  );
}
