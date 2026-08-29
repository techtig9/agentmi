"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";

const publishSchema = z.object({
  resourceType: z.enum(["agent", "tool", "workflow"]),
  resourceId: z.string().uuid(), title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(), category: z.string().trim().min(2).max(60),
});

export async function publishMarketplaceItem(formData: FormData) {
  const p = publishSchema.safeParse({resourceType: formData.get("resource_type"), resourceId: formData.get("resource_id"), title: formData.get("title"), description: formData.get("description") || undefined, category: formData.get("category")});
  if (!p.success) throw new Error(p.error.issues[0].message);
  const ctx = await getOrgContext(); const db = createClient();
  const ownership = await verifyResource(db, ctx.orgId, p.data.resourceType, p.data.resourceId);
  if (!ownership) throw new Error("Resource not found in this workspace.");
  const { error } = await db.from("marketplace_items").upsert({org_id: ctx.orgId, resource_type:p.data.resourceType, resource_id:p.data.resourceId, title:p.data.title, description:p.data.description || null, category:p.data.category, visibility:"public", status:"published", created_by:ctx.userId, updated_at:new Date().toISOString()}, {onConflict:"org_id,resource_type,resource_id"});
  if (error) throw new Error(error.message);
  await db.from("audit_logs").insert({org_id:ctx.orgId, actor_id:ctx.userId, action:"marketplace_published", metadata:{resource_type:p.data.resourceType, resource_id:p.data.resourceId}});
  revalidatePath("/dashboard/marketplace");
}

export async function unpublishMarketplaceItem(formData: FormData) {
  const id = String(formData.get("id") || ""); if (!z.string().uuid().safeParse(id).success) throw new Error("Invalid marketplace item.");
  const ctx = await getOrgContext(); const db = createClient();
  const {data,error}=await db.from("marketplace_items").update({status:"unpublished",visibility:"private",updated_at:new Date().toISOString()}).eq("id",id).eq("org_id",ctx.orgId).select("id").single();
  if(error || !data) throw new Error("Marketplace item not found.");
  await db.from("audit_logs").insert({org_id:ctx.orgId,actor_id:ctx.userId,action:"marketplace_unpublished",metadata:{item_id:id}});
  revalidatePath("/dashboard/marketplace");
}

export async function installMarketplaceItem(formData: FormData) {
  const id=String(formData.get("id")||""); if(!z.string().uuid().safeParse(id).success) throw new Error("Invalid marketplace item.");
  const ctx=await getOrgContext(); const db=createClient();
  const {data:item}=await db.from("marketplace_items").select("id,resource_type,resource_id,title,status,visibility").eq("id",id).eq("status","published").eq("visibility","public").single();
  if(!item) throw new Error("Published marketplace item not found.");
  const existing=await db.from("marketplace_installs").select("id").eq("item_id",id).eq("org_id",ctx.orgId).maybeSingle();
  if(existing.data) return;
  if(item.resource_type === "agent") {
    const {data:src}=await db.from("agents").select("id,name,kind,theme,config,template_id").eq("id",item.resource_id).single();
    if(!src) throw new Error("Source agent is no longer available.");
    const {data:copy,error}=await db.from("agents").insert({org_id:ctx.orgId,kind:src.kind,name:`${src.name} (Copy)`,status:"ready",template_id:src.template_id,theme:src.theme,config:src.config,created_by:ctx.userId}).select("id").single();
    if(error || !copy) throw new Error("Could not install the agent.");
  } else { throw new Error("This resource type is published but its installer is not available yet."); }
  await db.from("marketplace_installs").insert({item_id:id,org_id:ctx.orgId,installed_by:ctx.userId});
  await db.rpc("increment_marketplace_installs", {p_item_id:id}).then(()=>{});
  await db.from("audit_logs").insert({org_id:ctx.orgId,actor_id:ctx.userId,action:"marketplace_installed",metadata:{item_id:id,resource_type:item.resource_type}});
  revalidatePath("/dashboard/marketplace"); revalidatePath("/dashboard/agents");
}

async function verifyResource(db:ReturnType<typeof createClient>, orgId:string, type:string, id:string) {
  const table=type === "agent" ? "agents" : type === "tool" ? "tools" : "workflows";
  const {data}=await db.from(table).select("id").eq("id",id).eq("org_id",orgId).maybeSingle(); return data;
}
