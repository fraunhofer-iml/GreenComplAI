import type { Context, MiddlewareHandler } from "hono";

import { env } from "../config.js";
import type { AppBindings } from "./context.js";
import { result } from "./result.js";

// Lightweight fixed-window, in-memory rate limiter. Sufficient for a
// single-instance self-hosted deployment; a shared store (e.g. Redis) is needed
// once the API is scaled horizontally (tracked under HA / SaaS scaling).
type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

// Best-effort client IP. Behind a reverse proxy the first x-forwarded-for hop
// is the real client; the proxy must be trusted to set it correctly.
export function clientIp(c: Context<AppBindings>): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    const [first] = forwarded.split(",");
    if (first?.trim()) return first.trim();
  }
  return c.req.header("x-real-ip")?.trim() || "unknown";
}

export type RateLimitOptions = {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Max requests per client per window. */
  limit: number;
  /** Namespace so different route tiers count independently. */
  keyPrefix: string;
};

export function rateLimit(options: RateLimitOptions): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    if (!env.RATE_LIMIT_ENABLED) return next();

    const ip = clientIp(c);
    if (env.RATE_LIMIT_ALLOWLIST.has(ip)) return next();

    const now = Date.now();
    sweep(now);

    const key = `${options.keyPrefix}:${ip}`;
    const bucket = store.get(key);

    if (!bucket || bucket.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > options.limit) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      c.header("Retry-After", String(retryAfter));
      return c.json(
        result("Rate limit exceeded. Please retry later.", {
          code: "RATE_LIMITED",
          status: 429,
        }),
        429,
      );
    }

    return next();
  };
}
