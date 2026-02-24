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
 * On Vercel, x-real-ip is set by the platform and cannot be spoofed.
 * Falls back to first entry of x-forwarded-for, then to a shared key.
 */
export function getClientIp(request: Request): string {
  // Vercel sets x-real-ip reliably
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  // Fallback: first hop in x-forwarded-for (leftmost = client)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  // Last resort: rate-limit all unknown sources under one key
  return "__unknown_ip__";
}
