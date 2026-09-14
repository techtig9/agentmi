import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { readSupabaseEnv, supabaseConfigStatus } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

/**
 * Readiness endpoint. This checks the minimum production configuration and
 * the database connection without exposing credentials or provider details.
 */
export async function GET() {
  // Shared with the middleware, the landing page and the setup screen, so
  // "configured" cannot mean one thing here and another there.
  const supabaseEnv = supabaseConfigStatus(readSupabaseEnv());

  const configuration = {
    supabase: supabaseEnv.configured,
    serviceRole: supabaseEnv.serviceRoleConfigured,
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
