"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext, requireRole } from "@/lib/data/org-context";
import { executeTool, isSafeHttpUrl, EXECUTABLE_TOOL_KINDS } from "@/lib/chat/tool-runtime";
import { resolveSecret } from "@/lib/secrets/resolve";

/**
 * Tool kinds are restricted to the ones the runtime can actually execute.
 *
 * The form previously offered web_search, calculator, code, database and email.
 * `executeTool` throws for every one of those, so a tool created with them
 * would be attachable to an agent and then fail on the first call — a
 * configuration that could never work. An endpoint is required for the same
 * reason: `executeHttpTool` refuses to run without one.
 */
const schema = z
  .object({
    name: z.string().min(2).max(80),
    description: z.string().max(500).optional(),
    kind: z.enum(EXECUTABLE_TOOL_KINDS),
    endpoint: z.string().url("Enter a full URL, including https://"),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
    secretId: z.string().uuid().optional(),
  })
  .refine((value) => isSafeHttpUrl(value.endpoint), {
    message: "Endpoint must be a public HTTP(S) URL — private and loopback addresses are blocked.",
    path: ["endpoint"],
  });

export type ToolActionState = { error: string | null; success?: string };

export async function createPlatformTool(
  _prev: ToolActionState,
  formData: FormData
): Promise<ToolActionState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    kind: formData.get("kind"),
    endpoint: formData.get("endpoint"),
    method: formData.get("method") || undefined,
    secretId: formData.get("secret_id") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const ctx = await getOrgContext();
  const supabase = createClient();

  if (parsed.data.secretId) {
    const { data: secret } = await supabase
      .from("agent_secrets")
      .select("id")
      .eq("id", parsed.data.secretId)
      .eq("org_id", ctx.orgId)
      .is("revoked_at", null)
      .single();
    if (!secret) return { error: "Selected secret is unavailable." };
  }

  const { error } = await supabase.from("agent_tools").insert({
    org_id: ctx.orgId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    kind: parsed.data.kind,
    config: {
      endpoint: parsed.data.endpoint,
      method: parsed.data.method ?? "GET",
      secret_id: parsed.data.secretId ?? null,
    },
    created_by: ctx.userId,
  });
  if (error) return { error: "Couldn't create the tool. Please try again." };

  await supabase.from("audit_logs").insert({
    org_id: ctx.orgId,
    actor_id: ctx.userId,
    action: "tool_created",
    metadata: { name: parsed.data.name, kind: parsed.data.kind, has_secret: !!parsed.data.secretId },
  });

  revalidatePath("/dashboard/tools");
  return { error: null, success: `Created ${parsed.data.name}.` };
}

const toolIdSchema = z.object({ toolId: z.string().uuid() });

/**
 * Runs the tool once, exactly the way an agent would.
 *
 * This is a genuine request through the same `executeTool` path — including the
 * SSRF guard and the secrets-vault credential resolution — rather than a
 * reachability ping, so "connection ok" means the agent's call will work too.
 */
export async function testPlatformTool(
  _prev: ToolActionState,
  formData: FormData
): Promise<ToolActionState> {
  const parsed = toolIdSchema.safeParse({ toolId: formData.get("toolId") });
  if (!parsed.success) return { error: "Invalid tool." };

  const ctx = await getOrgContext();
  const supabase = createClient();

  const { data: tool } = await supabase
    .from("agent_tools")
    .select("id,name,kind,description,config")
    .eq("id", parsed.data.toolId)
    .eq("org_id", ctx.orgId)
    .single();
  if (!tool) return { error: "Tool not found." };

  const config = (tool.config ?? {}) as Record<string, unknown>;
  const secretId = typeof config.secret_id === "string" ? config.secret_id : null;
  const secret = secretId ? await resolveSecret(supabase, ctx.orgId, secretId) : null;
  if (secretId && !secret) {
    return {
      error:
        "This tool references a secret that is revoked or whose value is not configured on the server.",
    };
  }

  try {
    const output = await executeTool(
      {
        id: tool.id,
        name: tool.name,
        description: tool.description ?? "",
        kind: tool.kind,
        config,
        authHeaderValue: secret?.value,
      },
      {}
    );
    const preview = typeof output === "string" ? output : JSON.stringify(output);
    return {
      error: null,
      success: `Connection ok — responded with ${preview.slice(0, 140)}${preview.length > 140 ? "…" : ""}`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "The tool request failed." };
  }
}

/** Pauses or resumes a tool. A paused tool stays attached but cannot be called. */
export async function toggleToolActive(
  _prev: ToolActionState,
  formData: FormData
): Promise<ToolActionState> {
  const parsed = toolIdSchema.safeParse({ toolId: formData.get("toolId") });
  if (!parsed.success) return { error: "Invalid tool." };

  const ctx = await getOrgContext();
  const denied = requireRole(ctx, ["owner", "admin"]);
  if (denied) return { error: denied };

  const supabase = createClient();
  const { data: tool } = await supabase
    .from("agent_tools")
    .select("id,name,is_active")
    .eq("id", parsed.data.toolId)
    .eq("org_id", ctx.orgId)
    .single();
  if (!tool) return { error: "Tool not found." };

  const next = !tool.is_active;
  const { error } = await supabase
    .from("agent_tools")
    .update({ is_active: next })
    .eq("id", tool.id)
    .eq("org_id", ctx.orgId);
  if (error) return { error: "Couldn't update the tool. Please try again." };

  await supabase.from("audit_logs").insert({
    org_id: ctx.orgId,
    actor_id: ctx.userId,
    action: next ? "tool_resumed" : "tool_paused",
    metadata: { tool_id: tool.id },
  });

  revalidatePath("/dashboard/tools");
  return { error: null, success: `${tool.name} ${next ? "resumed" : "paused"}.` };
}

const attachSchema = z.object({
  agentId: z.string().uuid(),
  toolIds: z.array(z.string().uuid()).max(12),
});

export async function setAgentTools(formData: FormData) {
  const raw = String(formData.get("tool_ids") ?? "");
  const parsed = attachSchema.safeParse({
    agentId: formData.get("agent_id"),
    toolIds: raw ? raw.split(",").filter(Boolean) : [],
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const ctx = await getOrgContext();
  const supabase = createClient();
  const { data: agent } = await supabase
    .from("agents")
    .select("id,config")
    .eq("id", parsed.data.agentId)
    .eq("org_id", ctx.orgId)
    .single();
  if (!agent) throw new Error("Agent not found.");
  if (parsed.data.toolIds.length) {
    const { data: allowed } = await supabase
      .from("agent_tools")
      .select("id")
      .eq("org_id", ctx.orgId)
      .in("id", parsed.data.toolIds)
      .eq("is_active", true);
    if ((allowed ?? []).length !== parsed.data.toolIds.length)
      throw new Error("One or more tools are not available in this workspace.");
  }
  const config =
    agent.config && typeof agent.config === "object" && !Array.isArray(agent.config)
      ? (agent.config as Record<string, unknown>)
      : {};
  const nextConfig = { ...config, tools: parsed.data.toolIds };
  const { error } = await supabase
    .from("agents")
    .update({ config: nextConfig, updated_at: new Date().toISOString() })
    .eq("id", agent.id)
    .eq("org_id", ctx.orgId);
  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({
    org_id: ctx.orgId,
    actor_id: ctx.userId,
    action: "agent_tools_updated",
    metadata: { agent_id: agent.id, tool_ids: parsed.data.toolIds },
  });
  revalidatePath(`/dashboard/agents/${agent.id}/tools`);
  revalidatePath(`/dashboard/agents/${agent.id}/builder`);
}
