"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";

const schema = z.object({ name: z.string().min(2).max(80), description: z.string().max(500).optional(), kind: z.enum(["http","web_search","calculator","code","database","email","custom"]), endpoint: z.string().url().optional(), method: z.enum(["GET","POST","PUT","PATCH","DELETE"]).optional(), secretId: z.string().uuid().optional() });
export async function createPlatformTool(formData: FormData) {
  const parsed = schema.safeParse({ name: formData.get("name"), description: formData.get("description") || undefined, kind: formData.get("kind"), endpoint: formData.get("endpoint") || undefined, method: formData.get("method") || undefined, secretId: formData.get("secret_id") || undefined });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const ctx = await getOrgContext(); const supabase = createClient();
  if (parsed.data.secretId) {
    const { data: secret } = await supabase.from("agent_secrets").select("id").eq("id", parsed.data.secretId).eq("org_id", ctx.orgId).is("revoked_at", null).single();
    if (!secret) throw new Error("Selected secret is unavailable.");
  }
  const { error } = await supabase.from("agent_tools").insert({ org_id: ctx.orgId, name: parsed.data.name, description: parsed.data.description ?? null, kind: parsed.data.kind, config: { endpoint: parsed.data.endpoint ?? null, method: parsed.data.method ?? "GET", secret_id: parsed.data.secretId ?? null }, created_by: ctx.userId });
  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ org_id: ctx.orgId, actor_id: ctx.userId, action: "tool_created", metadata: { name: parsed.data.name, kind: parsed.data.kind, has_secret: !!parsed.data.secretId } });
  revalidatePath("/dashboard/tools");
}

const attachSchema = z.object({ agentId: z.string().uuid(), toolIds: z.array(z.string().uuid()).max(12) });
export async function setAgentTools(formData: FormData) {
  const raw = String(formData.get("tool_ids") ?? "");
  const parsed = attachSchema.safeParse({ agentId: formData.get("agent_id"), toolIds: raw ? raw.split(",").filter(Boolean) : [] });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const ctx = await getOrgContext(); const supabase = createClient();
  const { data: agent } = await supabase.from("agents").select("id,config").eq("id", parsed.data.agentId).eq("org_id", ctx.orgId).single();
  if (!agent) throw new Error("Agent not found.");
  if (parsed.data.toolIds.length) {
    const { data: allowed } = await supabase.from("agent_tools").select("id").eq("org_id", ctx.orgId).in("id", parsed.data.toolIds).eq("is_active", true);
    if ((allowed ?? []).length !== parsed.data.toolIds.length) throw new Error("One or more tools are not available in this workspace.");
  }
  const config = agent.config && typeof agent.config === "object" && !Array.isArray(agent.config) ? agent.config as Record<string, unknown> : {};
  const nextConfig = { ...config, tools: parsed.data.toolIds };
  const { error } = await supabase.from("agents").update({ config: nextConfig, updated_at: new Date().toISOString() }).eq("id", agent.id).eq("org_id", ctx.orgId);
  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ org_id: ctx.orgId, actor_id: ctx.userId, action: "agent_tools_updated", metadata: { agent_id: agent.id, tool_ids: parsed.data.toolIds } });
  revalidatePath(`/dashboard/agents/${agent.id}/tools`); revalidatePath(`/dashboard/agents/${agent.id}/builder`);
}
