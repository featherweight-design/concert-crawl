interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store: limits are per-instance and reset on deploy/restart.
// Suitable for single-container deployments; replace with Redis/Upstash for multi-instance.
const store = new Map<string, RateLimitEntry>()

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()

  // Prune expired entries on each call to prevent unbounded map growth
  for (const [storedKey, entry] of store) {
    if (now >= entry.resetAt) store.delete(storedKey)
  }

  const entry = store.get(key)

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterMs: 0 }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfterMs: entry.resetAt - now }
  }

  entry.count += 1
  return { allowed: true, retryAfterMs: 0 }
}
