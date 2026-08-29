import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

/**
 * Readiness endpoint. This checks the minimum production configuration and
 * the database connection without exposing credentials or provider details.
 */
export async function GET() {
  const configuration = {
    supabase: configured("NEXT_PUBLIC_SUPABASE_URL") && configured("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceRole: configured("SUPABASE_SERVICE_ROLE_KEY"),
    aiProvider: configured("GROQ_API_KEY") || configured("CEREBRAS_API_KEY") || configured("OPENROUTER_API_KEY") || configured("ANTHROPIC_API_KEY"),
    anthropic: configured("ANTHROPIC_API_KEY") && process.env.ANTHROPIC_ENABLED === "true",
    voyage: configured("VOYAGE_API_KEY") && process.env.VOYAGE_ENABLED !== "false",
  };

  let database = false;
  let databaseError = false;

  if (configuration.supabase && configuration.serviceRole) {
    try {
      const supabase = createServiceClient();
      const { error } = await supabase.from("organizations").select("id", { head: true, count: "exact" });
      database = !error;
      databaseError = Boolean(error);
    } catch {
      databaseError = true;
    }
  }

  const ready = configuration.supabase && configuration.serviceRole && configuration.aiProvider && database;

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      checks: {
        configuration,
        database,
        databaseError,
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: ready ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
}
