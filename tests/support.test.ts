import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const source = fs.readFileSync(path.join(root, "lib/actions/support.ts"), "utf8");

test("replyToTicket is gated to platform admins only", () => {
  const body = source.slice(source.indexOf("export async function replyToTicket"), source.indexOf("export async function markNotificationRead"));
  assert.match(body, /if \(!ctx\.isAdmin\)/, "replying to a ticket must require ctx.isAdmin");
});

test("replyToTicket creates a real notification, not just a status update", () => {
  const body = source.slice(source.indexOf("export async function replyToTicket"), source.indexOf("export async function markNotificationRead"));
  assert.match(body, /from\("notifications"\)\s*\.insert/, "a reply must insert a notification row for the ticket's org");
});

test("createSupportTicket does not require admin -- any org member can file a request", () => {
  const body = source.slice(source.indexOf("export async function createSupportTicket"), source.indexOf("export async function replyToTicket"));
  assert.ok(!body.includes("isAdmin"), "filing a ticket should not be admin-gated");
});

test("markNotificationRead scopes the update to the caller's own org", () => {
  const body = source.slice(source.indexOf("export async function markNotificationRead"));
  assert.match(body, /\.eq\("org_id",\s*ctx\.orgId\)/, "marking a notification read must be scoped to the caller's org, not any notification by id alone");
});
