interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 60_000);

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;
}

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0, remaining: maxAttempts - 1 };
  }

  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      retryAfterMs: entry.resetAt - now,
      remaining: 0,
    };
  }

  entry.count++;
  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: maxAttempts - entry.count,
  };
}
