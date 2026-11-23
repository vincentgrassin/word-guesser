export type RateLimit = {
  // Tokens added back per second, i.e. the sustained rate allowed
  perSecond: number
  // Maximum tokens held, i.e. how many actions can happen in a quick burst
  burst: number
}

// A "token bucket": each action takes a token, tokens come back at a steady rate.
// It allows short bursts while capping the average rate.
export function createTokenBucket({ perSecond, burst }: RateLimit, now = Date.now()) {
  let tokens = burst
  let updatedAt = now

  const refill = (now: number) => {
    tokens = Math.min(burst, tokens + ((now - updatedAt) / 1000) * perSecond)
    updatedAt = now
  }

  return {
    // Takes a token if one is available; false means the action must be refused.
    take(now = Date.now()): boolean {
      refill(now)
      if (tokens < 1) return false
      tokens -= 1
      return true
    },
    isFull(now = Date.now()): boolean {
      refill(now)
      return tokens >= burst
    },
  }
}

export type TokenBucket = ReturnType<typeof createTokenBucket>
