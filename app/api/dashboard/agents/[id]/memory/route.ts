import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/data/org-context";
import { createClient } from "@/lib/supabase/server";
import { deleteMemory, getMemories, saveMemory } from "@/lib/memory/store";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  const memories = await getMemories({ orgId: ctx.orgId, agentId: params.id, userId: ctx.userId });
  return NextResponse.json({ memories });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  const db = createClient();
  const { data: agent } = await db.from("agents").select("id").eq("id", params.id).eq("org_id", ctx.orgId).single();
  if (!agent) return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  try {
    const body = await request.json();
    if (typeof body.content !== "string" || body.content.length > 2000) return NextResponse.json({ error: "Memory content is required and must be under 2000 characters." }, { status: 400 });
    const memory = await saveMemory({ orgId: ctx.orgId, agentId: params.id, userId: body.scope === "workspace" ? null : ctx.userId, kind: body.kind, content: body.content, importance: body.importance, source: "user", expiresAt: body.expires_at });
    return NextResponse.json({ memory }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Unable to save memory." }, { status: 400 }); }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  try {
    const body = await request.json();
    if (typeof body.id !== "string") return NextResponse.json({ error: "Memory id is required." }, { status: 400 });
    await deleteMemory({ id: body.id, orgId: ctx.orgId, agentId: params.id, userId: ctx.userId });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Unable to delete memory." }, { status: 400 }); }
}
