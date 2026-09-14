import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import {
  MarketplaceBrowser,
  PublishForm,
  type MarketplaceCard,
} from "@/components/dashboard/MarketplaceBrowser";

export default async function MarketplacePage() {
  const ctx = await getOrgContext();
  const db = createClient();

  const [{ data: items }, { data: agents }] = await Promise.all([
    // Public published listings, plus this organization's own listings whatever
    // their state — a private listing never becomes visible to another org.
    db
      .from("marketplace_items")
      .select(
        "id, org_id, resource_type, resource_id, title, description, category, status, visibility, installs, version, created_at"
      )
      .or(`and(status.eq.published,visibility.eq.public),org_id.eq.${ctx.orgId}`)
      .order("installs", { ascending: false })
      .limit(100),
    db.from("agents").select("id, name").eq("org_id", ctx.orgId).eq("kind", "ai").order("name"),
  ]);

  const cards: MarketplaceCard[] = (items ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description ?? "A reusable Agentmi resource.",
    category: item.category ?? "other",
    resourceType: item.resource_type,
    status: item.status,
    version: item.version ?? 1,
    installs: item.installs ?? 0,
    isOwn: item.org_id === ctx.orgId,
    createdAt: item.created_at,
  }));

  return (
    <PlatformPage
      eyebrow="Ecosystem"
      title="Marketplace"
      description="Agents and workflows people have chosen to share. Install one to get a copy in your workspace, or publish your own."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <MarketplaceBrowser items={cards} />
        <PublishForm agents={agents ?? []} />
      </div>
    </PlatformPage>
  );
}
