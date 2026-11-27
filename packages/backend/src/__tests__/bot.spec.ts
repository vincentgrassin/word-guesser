import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { WordVectorEntry } from '../wordVectors.js'
import { BOT, chooseBotWord, loadSemantic } from '../semantic.js'
import { writeTestVectors } from './setup/wordVectors.js'

const lemma = (word: string, vector: number[]): WordVectorEntry => ({ word, isLemma: true, vector })

// "proche" + a letter: 25 words around the middle of mer and montagne,
// procheA the nearest, then each one a bit further, all nearer than marin.
const LETTERS = 'abcdefghijklmnopqrstuvwxy'
const nearWords = [...LETTERS].map((letter, k) => lemma(`proche${letter}`, [1, 1, k * 0.05]))

// Most frequent first, like the real file.
const WORDS: WordVectorEntry[] = [
  lemma('mer', [1, 0, 0]),
  lemma('montagne', [0, 1, 0]),
  lemma('soleil', [0, 0, 1]),
  // Right in the middle of mer and montagne, but the bot may not play them:
  { word: 'montagnes', isLemma: false, vector: [1, 1, 0] },
  lemma('col', [1, 1, 0]),
  // Near mer only
  lemma('marin', [1, 0, 0.1]),
  ...nearWords,
]

const vectors = writeTestVectors(WORDS)
afterAll(() => vectors.cleanup())

describe('chooseBotWord', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    loadSemantic(vectors.path)
  })

  const afterMerMontagne = {
    ownWords: ['mer'],
    partnerWords: ['montagne'],
    playedWords: ['mer', 'montagne'],
  }

  it('easy: plays the nearest word to the middle of the last round', () => {
    expect(chooseBotWord({ ...afterMerMontagne, level: 'easy' })).toBe('prochea')
  })

  it('never plays a non-lemma, a word of 3 letters or less, or a word already said', () => {
    // montagnes and col are closer to the middle than procheA
    expect(chooseBotWord({ ...afterMerMontagne, level: 'easy' })).toBe('prochea')
    expect(
      chooseBotWord({
        ...afterMerMontagne,
        playedWords: ['mer', 'montagne', 'Prochea'],
        level: 'easy',
      }),
    ).toBe('procheb')
  })

  it('normal and hard pick at random among the 5 and the 20 nearest words', () => {
    const lastOfThem = () => 0.999

    expect(chooseBotWord({ ...afterMerMontagne, level: 'normal', random: () => 0 })).toBe('prochea')
    expect(chooseBotWord({ ...afterMerMontagne, level: 'normal', random: lastOfThem })).toBe(
      'prochee',
    )
    expect(chooseBotWord({ ...afterMerMontagne, level: 'hard', random: lastOfThem })).toBe(
      'prochet',
    )
  })

  it("aims at its own word alone when the partner's words are all unknown", () => {
    const move = { ownWords: ['mer'], partnerWords: ['xyzzy'], playedWords: ['mer', 'xyzzy'] }

    expect(chooseBotWord({ ...move, level: 'easy' })).toBe('marin')
  })

  it("uses the partner's last known word when the last one is unknown", () => {
    const move = {
      ownWords: ['soleil', 'mer'],
      partnerWords: ['montagne', 'xyzzy'],
      playedWords: ['soleil', 'mer', 'montagne', 'xyzzy'],
    }

    expect(chooseBotWord({ ...move, level: 'easy' })).toBe('prochea')
  })

  it('plays a random frequent word in round 1', () => {
    const firstRound = { ownWords: [], partnerWords: [], playedWords: [], level: 'easy' as const }

    // mer has only 3 letters: montagne is the first word the bot may play
    expect(chooseBotWord({ ...firstRound, random: () => 0 })).toBe('montagne')
    expect(chooseBotWord({ ...firstRound, random: () => 0.999 })).toBe('prochey')
  })

  it('plays nothing when semantics are off', () => {
    loadSemantic('missing.bin')

    expect(chooseBotWord({ ...afterMerMontagne, level: 'easy' })).toBeUndefined()
  })

  it(`never plays a word beyond the ${BOT.vocabularySize} most frequent`, () => {
    const fillers = Array.from({ length: BOT.vocabularySize }, (_, i) =>
      lemma(`mot${i}`, [0, 0, 1]),
    )
    const rare = writeTestVectors([
      lemma('mer', [1, 0, 0]),
      lemma('montagne', [0, 1, 0]),
      ...fillers.slice(2),
      lemma('rare', [1, 1, 0]),
    ])
    loadSemantic(rare.path)

    expect(chooseBotWord({ ...afterMerMontagne, level: 'easy' })).not.toBe('rare')
    rare.cleanup()
  })
})
