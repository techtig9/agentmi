import { createClient } from "@/lib/supabase/server";
import { signWebhookPayload, type WebhookEventType, type WebhookPayload } from "./sign";

/**
 * Fire-and-log: failures here never block the calling action (agent
 * creation, training completion) — a customer's endpoint being down
 * shouldn't fail the underlying operation. Delivery attempts are logged
 * either way so failures are visible in webhook_deliveries.
 */
export async function dispatchWebhookEvent(
  orgId: string,
  event: WebhookEventType,
  agentId: string,
  data: Record<string, unknown>
): Promise<void> {
  const supabase = createClient();

  const { data: endpoints } = await supabase
    .from("webhook_endpoints")
    .select("id, url, secret, subscribed_events")
    .eq("org_id", orgId)
    .eq("is_active", true);

  if (!endpoints || endpoints.length === 0) return;

  const payload: WebhookPayload = {
    event,
    org_id: orgId,
    agent_id: agentId,
    data,
    occurred_at: new Date().toISOString(),
  };

  await Promise.all(
    endpoints
      .filter((e) => e.subscribed_events.includes(event))
      .map(async (endpoint) => {
        const { body, signatureHeader } = signWebhookPayload(payload, endpoint.secret);
        let status: number | null = null;
        let succeeded = false;

        try {
          const response = await fetch(endpoint.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Agentmi-Signature": signatureHeader,
            },
            body,
          });
          status = response.status;
          succeeded = response.ok;
        } catch {
          succeeded = false; // network error reaching the customer's endpoint
        }

        await supabase.from("webhook_deliveries").insert({
          endpoint_id: endpoint.id,
          event,
          payload,
          response_status: status,
          succeeded,
        });
      })
  );
}
