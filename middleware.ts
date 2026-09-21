import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { required } from "@/lib/config/env";

export async function middleware(request: NextRequest) {
  // Without credentials `createServerClient` throws, which would surface on
  // every protected route as an unhandled error rather than as the
  // configuration problem it actually is. Nobody can be signed in either, so
  // the honest destination is the setup screen. `/setup` is outside this
  // middleware's matcher, so this cannot loop.
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    required(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isOnboardingRoute = request.nextUrl.pathname.startsWith("/onboarding");

  if ((isDashboardRoute || isAdminRoute || isOnboardingRoute) && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // A session exists as soon as signInWithPassword succeeds, even for an
  // account with TOTP enrolled — the second-factor step is a separate,
  // explicit action (see verifyMfaChallenge). Without this check here,
  // navigating straight to a dashboard URL after password sign-in would
  // skip the MFA challenge page entirely, since the session alone would
  // satisfy the check above. This enforces the step-up centrally so no
  // individual route can accidentally forget it.
  if (user && (isDashboardRoute || isAdminRoute)) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.currentLevel !== aal.nextLevel) {
      const redirectUrl = new URL("/login/mfa", request.url);
      redirectUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Admin route + non-admin check happens in the route's own layout, where
  // we can read profiles.is_admin — middleware only guarantees "logged in."

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/onboarding"],
};
