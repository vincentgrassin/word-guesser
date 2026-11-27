import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getSemanticScore, isSemanticOn, loadSemantic } from '../semantic.js'
import { buildMessage } from './setup/factories.js'
import { writeTestVectors } from './setup/wordVectors.js'

const vectors = writeTestVectors()
afterAll(() => vectors.cleanup())

const message = (userId: string, content: string) =>
  buildMessage(userId, content, { messageId: `m-${userId}` })

// The score of the pair of words, through the public entry point.
const scoreOf = (a: string, b: string) =>
  getSemanticScore(message('alice', a), [message('bob', b)])[0]?.score

describe('getSemanticScore', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(loadSemantic(vectors.path)).toBe(true)
  })

  it('maps each target to a scored pair', () => {
    const scores = getSemanticScore(message('alice', 'mer'), [
      message('bob', 'plage'),
      message('carol', 'chaise'),
    ])

    expect(scores).toEqual([
      { sourceId: 'm-alice', targetId: 'm-bob', score: expect.closeTo(0.6, 2) },
      { sourceId: 'm-alice', targetId: 'm-carol', score: expect.closeTo(0, 2) },
    ])
  })

  it('scores identical words 1', () => {
    expect(scoreOf('plage', 'plage')).toBeCloseTo(1, 2)
  })

  it('ignores case, surrounding spaces, the œ ligature and typographic apostrophes', () => {
    expect(scoreOf(' MER ', 'Plage')).toBeCloseTo(0.6, 2)
    expect(scoreOf('Cœur', 'mer')).toBeCloseTo(1, 2)
    expect(scoreOf('presqu’île', 'mer')).toBeCloseTo(1, 2)
  })

  it('falls back to the most frequent accented form of a word typed without accents', () => {
    // "peche" is both pêche (0.8 with plage) and péché (0 with plage): pêche is more frequent.
    expect(scoreOf('peche', 'plage')).toBeCloseTo(0.8, 2)
    expect(scoreOf('péché', 'plage')).toBeCloseTo(0, 2)
  })

  it('gives a null score to a pair with an unknown word, and still scores the others', () => {
    const scores = getSemanticScore(message('alice', 'mer'), [
      message('bob', 'xyzzy'),
      message('carol', 'plage'),
    ])

    expect(scores.map((s) => s.score)).toEqual([null, expect.closeTo(0.6, 2)])
    expect(scoreOf('xyzzy', 'mer')).toBeNull()
  })

  it('turns semantics off when the file is missing', () => {
    expect(loadSemantic(join(vectors.dir, 'missing.bin'))).toBe(false)

    expect(isSemanticOn()).toBe(false)
    expect(getSemanticScore(message('alice', 'mer'), [message('bob', 'plage')])).toEqual([])
    expect(console.error).toHaveBeenCalled()
  })

  it('turns semantics off when the file is not a vector file', () => {
    const invalid = join(vectors.dir, 'invalid.bin')
    writeFileSync(invalid, 'not a vector file')

    expect(loadSemantic(invalid)).toBe(false)
    expect(isSemanticOn()).toBe(false)
  })
})
