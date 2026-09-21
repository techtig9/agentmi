/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  poweredByHeader: false,
  async headers() {
    // The browser Supabase client connects straight to the project origin, so
    // it has to be in connect-src or every signed-in page breaks. It is read
    // at build time, which is when Vercel has it; a build with no environment
    // set falls back to allowing https: rather than emitting a policy that
    // would block the app the moment credentials were added.
    const supabaseOrigin = (() => {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
        return url ? new URL(url).origin : null;
      } catch {
        return null;
      }
    })();

    const connectSrc = ["'self'", supabaseOrigin, supabaseOrigin ? null : "https:", "https://*.paddle.com"]
      .filter(Boolean)
      .join(" ");

    const csp = [
      "default-src 'self'",
      // Next.js inlines its bootstrap and the pre-paint theme script, so
      // 'unsafe-inline' is required here. The value of this directive is that
      // it still blocks script from any other ORIGIN, which is the actual
      // exfiltration path in an XSS.
      "script-src 'self' 'unsafe-inline' https://cdn.paddle.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src ${connectSrc}`,
      "frame-src https://*.paddle.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
