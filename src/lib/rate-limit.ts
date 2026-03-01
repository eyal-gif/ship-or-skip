// In-memory rate limiter with cleanup and bounded size
// For production at scale, swap with Redis/Upstash

const MAX_ENTRIES = 10_000;
const rateMap = new Map<string, { count: number; resetAt: number }>();

// Periodic cleanup of expired entries (runs at most once per minute)
let lastCleanup = 0;
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;

  for (const [key, entry] of rateMap) {
    if (now > entry.resetAt) {
      rateMap.delete(key);
    }
  }

  // Hard cap: if still too large, clear oldest entries
  if (rateMap.size > MAX_ENTRIES) {
    const toDelete = rateMap.size - MAX_ENTRIES;
    const keys = rateMap.keys();
    for (let i = 0; i < toDelete; i++) {
      const next = keys.next();
      if (!next.done) rateMap.delete(next.value);
    }
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number } {
  cleanup();

  const now = Date.now();
  const entry = rateMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count };
}

/**
 * Extract a reliable client IP from request headers.
 * On Vercel, x-real-ip is set by the platform and cannot be spoofed
 * by the end-user — it is injected by the edge network.
 *
 * IMPORTANT: x-forwarded-for CAN be spoofed by clients, so we only
 * use it in non-production or when x-real-ip is missing. In production
 * on Vercel, x-real-ip is always present and trustworthy.
 */
export function getClientIp(request: Request): string {
  // Vercel sets x-real-ip reliably — prefer it always
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  // In production, if x-real-ip is absent something is off — use
  // a strict shared key so these requests share a very tight limit.
  if (process.env.NODE_ENV === "production") {
    return "__no_ip__";
  }

  // Development only: fall back to x-forwarded-for (first hop)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return "127.0.0.1";
}
