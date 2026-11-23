import { describe, expect, it } from 'vitest'
import { createTokenBucket } from '../rateLimit.js'

describe('createTokenBucket', () => {
  it('allows a burst, then refuses', () => {
    const bucket = createTokenBucket({ perSecond: 1, burst: 3 }, 0)

    expect([bucket.take(0), bucket.take(0), bucket.take(0)]).toEqual([true, true, true])
    expect(bucket.take(0)).toBe(false)
  })

  it('refills at the given rate', () => {
    const bucket = createTokenBucket({ perSecond: 2, burst: 1 }, 0)
    bucket.take(0)

    expect(bucket.take(400)).toBe(false)
    expect(bucket.take(500)).toBe(true)
  })

  it('never holds more than the burst', () => {
    const bucket = createTokenBucket({ perSecond: 1, burst: 2 }, 0)

    expect(bucket.isFull(60_000)).toBe(true)
    expect([bucket.take(60_000), bucket.take(60_000), bucket.take(60_000)]).toEqual([
      true,
      true,
      false,
    ])
  })

  it('tells when it is full, so an idle bucket can be forgotten', () => {
    const bucket = createTokenBucket({ perSecond: 1, burst: 2 }, 0)
    bucket.take(0)

    expect(bucket.isFull(500)).toBe(false)
    expect(bucket.isFull(1000)).toBe(true)
  })
})
