import { NextResponse, type NextRequest } from "next/server";
import { verifyPaddleSignature, routePaddleEvent } from "@/lib/billing/paddle-webhook";
import { createClient } from "@supabase/supabase-js";

// Service-role client: webhooks have no user session, and RLS intentionally
// has no client-writable policy for subscriptions/credit_ledger — this is
// the one place allowed to bypass that, guarded by signature verification.
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("paddle-signature");

  if (!signatureHeader) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const verification = verifyPaddleSignature(
    rawBody,
    signatureHeader,
    process.env.PADDLE_WEBHOOK_SECRET!
  );

  if (!verification.valid) {
    // Deliberately vague response body — don't help an attacker iterate.
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventId: string = event.event_id;
  const eventType: string = event.event_type;
  const supabase = serviceClient();

  // Idempotency: Paddle may redeliver the same event on retry.
  const { error: insertError } = await supabase
    .from("processed_webhook_events")
    .insert({ event_id: eventId, event_type: eventType });

  if (insertError) {
    // Unique-violation on event_id means we've already processed this one —
    // return 200 so Paddle stops retrying, but do nothing further.
    return NextResponse.json({ status: "already_processed" }, { status: 200 });
  }

  const intent = routePaddleEvent(eventType);
  const paddleSubscriptionId: string | undefined =
    event.data?.subscription_id ?? event.data?.id;
  // Set at Paddle.Checkout.open({ customData: { org_id } }) client-side —
  // required on activation because our subscriptions row (created at org
  // signup, plan='free') has no paddle_subscription_id yet to match by.
  const orgId: string | undefined = event.data?.custom_data?.org_id;

  switch (intent.action) {
    case "activate": {
      const plan = event.data?.items?.[0]?.price?.custom_data?.plan_id ?? null;
      const cycle = event.data?.billing_cycle?.interval === "year" ? "yearly" : "monthly";

      if (!orgId) {
        // Can't identify which org this checkout belongs to — log loudly
        // rather than silently doing nothing. This should never happen if
        // the checkout button always sets customData.org_id.
        console.error(`paddle activate event ${eventId} missing custom_data.org_id`);
        break;
      }

      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          plan,
          cycle,
          paddle_subscription_id: paddleSubscriptionId,
          current_period_end: event.data?.current_billing_period?.ends_at ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("org_id", orgId);
      break;
    }
    case "update": {
      const plan = event.data?.items?.[0]?.price?.custom_data?.plan_id ?? null;
      const cycle = event.data?.billing_cycle?.interval === "year" ? "yearly" : "monthly";
      // By now paddle_subscription_id was set during activation, so
      // later updates (plan changes, renewals) can match by it directly —
      // no custom_data needed on these events.
      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          plan,
          cycle,
          paddle_subscription_id: paddleSubscriptionId,
          current_period_end: event.data?.current_billing_period?.ends_at ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("paddle_subscription_id", paddleSubscriptionId);
      break;
    }
    case "cancel": {
      await supabase
        .from("subscriptions")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("paddle_subscription_id", paddleSubscriptionId);
      break;
    }
    case "mark_past_due": {
      await supabase
        .from("subscriptions")
        .update({ status: "past_due", updated_at: new Date().toISOString() })
        .eq("paddle_subscription_id", paddleSubscriptionId);
      break;
    }
    case "ignore":
      break;
  }

  return NextResponse.json({ status: "processed" }, { status: 200 });
}
