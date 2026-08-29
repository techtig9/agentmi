import { createServiceClient } from "@/lib/supabase/service";

export type MemoryKind = "fact" | "preference" | "profile" | "instruction" | "summary";
export interface AgentMemory { id: string; kind: MemoryKind; content: string; importance: number; source: string; expires_at: string | null; }

const MAX_MEMORY_ITEMS = 12;
const MAX_MEMORY_CHARS = 8000;

export async function getOrCreateSession(input: { orgId: string; agentId: string; userId: string; sessionId?: string }) {
  const db = createServiceClient();
  if (input.sessionId) {
    const { data } = await db.from("agent_memory_sessions").select("id").eq("id", input.sessionId).eq("org_id", input.orgId).eq("agent_id", input.agentId).eq("user_id", input.userId).maybeSingle();
    if (data) return data.id;
  }
  const { data, error } = await db.from("agent_memory_sessions").insert({ org_id: input.orgId, agent_id: input.agentId, user_id: input.userId, title: "New conversation" }).select("id").single();
  if (error) throw new Error(`Unable to create memory session: ${error.message}`);
  return data.id as string;
}

export async function loadSessionMessages(sessionId: string, orgId: string, agentId: string, userId: string, limit = 20) {
  const db = createServiceClient();
  const { data } = await db.from("agent_memory_messages").select("role,content").eq("session_id", sessionId).eq("org_id", orgId).eq("agent_id", agentId).eq("user_id", userId).order("created_at", { ascending: false }).limit(Math.min(limit, 40));
  return (data ?? []).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content).slice(0, 4000) }));
}

export async function appendSessionMessages(input: { sessionId: string; orgId: string; agentId: string; userId: string; user: string; assistant: string }) {
  const db = createServiceClient();
  const { error } = await db.from("agent_memory_messages").insert([
    { session_id: input.sessionId, org_id: input.orgId, agent_id: input.agentId, user_id: input.userId, role: "user", content: input.user.slice(0, 4000) },
    { session_id: input.sessionId, org_id: input.orgId, agent_id: input.agentId, user_id: input.userId, role: "assistant", content: input.assistant.slice(0, 8000) },
  ]);
  if (error) throw new Error(`Unable to save conversation: ${error.message}`);
  await db.from("agent_memory_sessions").update({ updated_at: new Date().toISOString() }).eq("id", input.sessionId).eq("org_id", input.orgId);
}

export async function getMemories(input: { orgId: string; agentId: string; userId: string }) {
  const db = createServiceClient();
  const { data } = await db.from("agent_memories").select("id,kind,content,importance,source,expires_at").eq("org_id", input.orgId).eq("agent_id", input.agentId).or(`user_id.is.null,user_id.eq.${input.userId}`).or("expires_at.is.null,expires_at.gt." + new Date().toISOString()).order("importance", { ascending: false }).order("updated_at", { ascending: false }).limit(MAX_MEMORY_ITEMS);
  return (data ?? []) as AgentMemory[];
}

export function formatMemoryContext(memories: AgentMemory[]) {
  let used = 0;
  const lines: string[] = [];
  for (const memory of memories) {
    const line = `- [${memory.kind}] ${memory.content}`;
    if (used + line.length > MAX_MEMORY_CHARS) break;
    lines.push(line); used += line.length;
  }
  return lines.length ? `Persistent memory available to you:\n${lines.join("\n")}\nOnly use these memories when relevant; do not invent facts.` : "No persistent memory is available.";
}

export async function saveMemory(input: { orgId: string; agentId: string; userId?: string | null; kind?: MemoryKind; content: string; importance?: number; source?: string; expiresAt?: string | null }) {
  const content = input.content.trim().slice(0, 2000);
  if (!content) throw new Error("Memory content cannot be empty.");
  const db = createServiceClient();
  const { data, error } = await db.from("agent_memories").insert({ org_id: input.orgId, agent_id: input.agentId, user_id: input.userId ?? null, kind: input.kind ?? "fact", content, importance: Math.min(5, Math.max(1, input.importance ?? 3)), source: input.source ?? "user", expires_at: input.expiresAt ?? null }).select("id,kind,content,importance,source,expires_at").single();
  if (error) throw new Error(`Unable to save memory: ${error.message}`);
  return data as AgentMemory;
}

export async function deleteMemory(input: { id: string; orgId: string; agentId: string; userId: string }) {
  const db = createServiceClient();
  const { error } = await db.from("agent_memories").delete().eq("id", input.id).eq("org_id", input.orgId).eq("agent_id", input.agentId).or(`user_id.is.null,user_id.eq.${input.userId}`);
  if (error) throw new Error(`Unable to delete memory: ${error.message}`);
}
