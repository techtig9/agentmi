"use client";

import Script from "next/script";

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: "sandbox" | "production") => void };
      Initialize: (opts: { token: string }) => void;
      Checkout: {
        open: (opts: {
          items: { priceId: string; quantity: number }[];
          customer?: { email: string };
          customData?: Record<string, string>;
        }) => void;
      };
    };
  }
}

export function PaddleLoader() {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!token) return null;

  return (
    <Script
      src="https://cdn.paddle.com/paddle/v2/paddle.js"
      strategy="afterInteractive"
      onLoad={() => {
        if (!window.Paddle) return;
        // Sandbox vs production is an account-level distinction on
        // Paddle's side — switch this once you've moved off Sandbox keys.
        window.Paddle.Environment.set("sandbox");
        window.Paddle.Initialize({ token });
      }}
    />
  );
}
