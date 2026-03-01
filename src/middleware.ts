import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Generate a per-request nonce for inline scripts
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });

  // Pass nonce to server components via header
  response.headers.set("x-nonce", nonce);

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  // Disable legacy XSS auditor (deprecated, can cause issues)
  response.headers.set("X-XSS-Protection", "0");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // HSTS: enforce HTTPS for 1 year
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=(self)"
  );
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      // Nonce-based script policy — blocks arbitrary inline scripts
      // 'strict-dynamic' lets nonce-approved scripts load their children
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://accounts.google.com https://apis.google.com`,
      // Styles still need unsafe-inline (Tailwind / Next.js injects styles)
      "style-src 'self' 'unsafe-inline' https://accounts.google.com",
      // Tightened img-src: only self, data URIs, Google profile pics
      "img-src 'self' data: blob: https://lh3.googleusercontent.com",
      "font-src 'self'",
      // Removed api.openai.com (server-side only, not needed in CSP)
      "connect-src 'self' https://accounts.google.com",
      "frame-src https://accounts.google.com",
      // Prevent <base> tag hijacking
      "base-uri 'self'",
      // Restrict form targets
      "form-action 'self'",
    ].join("; ")
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
