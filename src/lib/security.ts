/**
 * Security utilities for API routes
 */

const ALLOWED_VERDICTS = ["BUILD IT", "SKIP IT", "NEEDS WORK"];
const ALLOWED_SIZES = ["startup", "smb", "mid-market", "enterprise", "Unknown"];

/**
 * CSRF protection: verify the request Origin matches the app.
 * Returns true if the request is safe, false if it should be blocked.
 */
export function verifyOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Allow requests with no Origin (same-origin non-CORS, e.g. server-side)
  if (!origin && !referer) return true;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const allowedOrigins = [
    new URL(appUrl).origin,
    "http://localhost:3000",
  ];

  // Also allow the Vercel preview URLs
  if (process.env.VERCEL_URL) {
    allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
  }

  if (origin && allowedOrigins.includes(origin)) return true;

  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (allowedOrigins.includes(refOrigin)) return true;
    } catch {
      // Invalid referer URL
    }
  }

  return false;
}

/**
 * Sanitize a domain string — only allow valid domain characters.
 * Prevents prompt injection via crafted email domains.
 */
export function sanitizeDomain(domain: string): string {
  // Only allow: letters, digits, dots, hyphens
  return domain.replace(/[^a-zA-Z0-9.\-]/g, "").slice(0, 255);
}

/**
 * Validate and clamp LLM output for report scores.
 * Ensures scores are within valid range and verdict is expected.
 */
export function validateReportOutput(data: {
  feature_name?: string;
  overall_score?: number;
  verdict?: string;
  summary?: string;
  scores?: Array<{ dimension: string; score: number; detail: string }>;
}): {
  feature_name: string;
  overall_score: number;
  verdict: string;
  summary: string;
  scores: Array<{ dimension: string; score: number; detail: string }>;
} {
  const overall = typeof data.overall_score === "number"
    ? Math.min(10, Math.max(0, Math.round(data.overall_score * 10) / 10))
    : 5.0;

  const verdict = ALLOWED_VERDICTS.includes(data.verdict || "")
    ? data.verdict!
    : overall >= 7 ? "BUILD IT" : overall < 5 ? "SKIP IT" : "NEEDS WORK";

  const scores = Array.isArray(data.scores)
    ? data.scores.map((s) => ({
        dimension: String(s.dimension || "Unknown").slice(0, 100),
        score: typeof s.score === "number" ? Math.min(10, Math.max(1, Math.round(s.score))) : 5,
        detail: String(s.detail || "").slice(0, 500),
      }))
    : [];

  return {
    feature_name: String(data.feature_name || "Feature Analysis").slice(0, 200),
    overall_score: overall,
    verdict,
    summary: String(data.summary || "").slice(0, 1000),
    scores,
  };
}

/**
 * Validate company enrichment output from LLM.
 */
export function validateCompanyOutput(data: {
  company_name?: string;
  description?: string;
  size?: string;
  industry?: string;
}): { company_name: string; description: string; size: string; industry: string } {
  return {
    company_name: String(data.company_name || "Unknown").slice(0, 200),
    description: String(data.description || "Unknown").slice(0, 500),
    size: ALLOWED_SIZES.includes(data.size || "") ? data.size! : "Unknown",
    industry: String(data.industry || "Unknown").slice(0, 100),
  };
}
