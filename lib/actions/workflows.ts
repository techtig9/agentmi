"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { z } from "zod";

export type CreateWorkflowState = { error: string | null; workflowId?: string };

const nameSchema = z.object({ name: z.string().min(2).max(80) });

export async function createWorkflow(
  _prev: CreateWorkflowState,
  formData: FormData
): Promise<CreateWorkflowState> {
  const parsed = nameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const ctx = await getOrgContext();
  const supabase = createClient();

  const { data: workflow, error } = await supabase
    .from("workflows")
    .insert({ org_id: ctx.orgId, name: parsed.data.name, created_by: ctx.userId })
    .select("id")
    .single();

  if (error || !workflow) return { error: "Couldn't create the workflow." };

  revalidatePath("/dashboard/workflows");
  return { error: null, workflowId: workflow.id };
}

export type AddMemberState = { error: string | null };

const addMemberSchema = z.object({
  workflowId: z.string().uuid(),
  agentId: z.string().uuid(),
  keywords: z.string().optional(), // comma-separated, from a plain text input
});

export async function addWorkflowMember(_prev: AddMemberState, formData: FormData): Promise<AddMemberState> {
  const parsed = addMemberSchema.safeParse({
    workflowId: formData.get("workflowId"),
    agentId: formData.get("agentId"),
    keywords: formData.get("keywords") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const ctx = await getOrgContext();
  const supabase = createClient();

  // Confirm the agent belongs to this org — RLS would also block a
  // cross-org insert, but this gives a clear error instead of a silent one.
  const { data: agent } = await supabase
    .from("agents")
    .select("id, kind")
    .eq("id", parsed.data.agentId)
    .eq("org_id", ctx.orgId)
    .single();
  if (!agent) return { error: "Agent not found." };
  if (agent.kind !== "ai") return { error: "Only AI agents can be workflow specialists." };

  const keywords = parsed.data.keywords
    ? parsed.data.keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean)
    : [];

  const { error } = await supabase.from("workflow_members").insert({
    workflow_id: parsed.data.workflowId,
    agent_id: parsed.data.agentId,
    keywords,
  });

  if (error) return { error: "Couldn't add the agent — it may already be in this workflow." };

  revalidatePath("/dashboard/workflows");
  return { error: null };
}

export async function removeWorkflowMember(_prev: AddMemberState, formData: FormData): Promise<AddMemberState> {
  const workflowId = formData.get("workflowId") as string;
  const agentId = formData.get("agentId") as string;
  await getOrgContext(); // enforces the caller is a logged-in org member; RLS enforces the rest

  const supabase = createClient();
  const { error } = await supabase
    .from("workflow_members")
    .delete()
    .eq("workflow_id", workflowId)
    .eq("agent_id", agentId);

  if (error) return { error: "Couldn't remove the agent." };

  revalidatePath("/dashboard/workflows");
  return { error: null };
}
