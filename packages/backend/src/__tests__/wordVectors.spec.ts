import { describe, expect, it } from 'vitest'
import { decodeWordVectors, encodeWordVectors } from '../wordVectors.js'

describe('word vector file', () => {
  const entries = [
    { word: 'mer', isLemma: true, vector: [3, 4] },
    { word: 'mers', isLemma: false, vector: [0, -2] },
  ]

  it('reads back the words, their lemma flag and their vectors', () => {
    const vectors = decodeWordVectors(encodeWordVectors(entries, { source: 'test' }))

    expect(vectors.dim).toBe(2)
    expect(vectors.words).toEqual(['mer', 'mers'])
    expect(vectors.isLemma).toEqual([true, false])
    // Unit length scaled to int8: [0.6, 0.8] * 127 and [0, -1] * 127
    expect(Array.from(vectors.values)).toEqual([76, 102, 0, -127])
  })

  it('refuses a truncated file', () => {
    const file = encodeWordVectors(entries)

    expect(() => decodeWordVectors(file.subarray(0, file.length - 1))).toThrow()
  })

  it('refuses vectors of different lengths', () => {
    expect(() =>
      encodeWordVectors([...entries, { word: 'plage', isLemma: true, vector: [1, 2, 3] }]),
    ).toThrow()
  })
})
