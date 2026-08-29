import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness endpoint. It deliberately does not query third-party services so
 * orchestrators can distinguish "the process is alive" from dependency health.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "agentmi",
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
