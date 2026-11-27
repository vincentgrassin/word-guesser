import { BotLevel, MessageSimilarity, ResponseMessage } from '@word-guesser/shared'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { decodeWordVectors, WordVectors } from './wordVectors.js'

// packages/backend/data/vectors.bin, from src/ in dev and from build/ in production.
export const DEFAULT_VECTORS_FILE = fileURLToPath(new URL('../data/vectors.bin', import.meta.url))

type Vocabulary = WordVectors & {
  index: Map<string, number>
  // Words without accents, each pointing to its most frequent accented form.
  accentFree: Map<string, number>
  norms: Float64Array
  // The words the bot may play, most frequent first (see BOT below).
  botWords: number[]
}

// What the bot may play, and how it picks: constants to tune by playing.
export const BOT = {
  // Among the most frequent words only: rare words feel like cheating.
  vocabularySize: 20_000,
  // Drops most grammatical words (pas, est, ne, si, là).
  minLength: 4,
  // Round 1, with no word to start from: a random one among the most frequent.
  firstWords: 2_000,
  // How many of the nearest words each level picks from, at random.
  choices: { easy: 1, normal: 5, hard: 20 } satisfies Record<BotLevel, number>,
} as const

// Undefined until a vector file is loaded: semantics are off (degraded mode).
let vocabulary: Vocabulary | undefined

const removeAccents = (word: string) => word.normalize('NFD').replace(/[̀-ͯ]/g, '')

// The spelling words are stored with (see scripts/build-vectors.ts).
const normaliseSpelling = (word: string) =>
  word.trim().toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/’/g, "'")

const buildVocabulary = (vectors: WordVectors): Vocabulary => {
  const { dim, words, values, isLemma } = vectors
  const index = new Map<string, number>()
  const accentFree = new Map<string, number>()
  const norms = new Float64Array(words.length)
  const botWords: number[] = []
  words.forEach((word, i) => {
    // Lemmas only, so the bot does not answer "montagnes" to "montagne"
    if (i < BOT.vocabularySize && isLemma[i] && [...word].length >= BOT.minLength) botWords.push(i)
    index.set(word, i)
    // Words are sorted by decreasing frequency: the first one wins.
    const key = removeAccents(word)
    if (!accentFree.has(key)) accentFree.set(key, i)
    let sum = 0
    for (let d = i * dim; d < (i + 1) * dim; d++) sum += values[d] * values[d]
    norms[i] = Math.sqrt(sum)
  })
  return { ...vectors, index, accentFree, norms, botWords }
}

// Returns whether semantics are on. A missing or invalid file turns them off.
export const loadSemantic = (path: string = DEFAULT_VECTORS_FILE): boolean => {
  try {
    vocabulary = buildVocabulary(decodeWordVectors(readFileSync(path)))
    console.info(`[INFO]: Semantics on, ${vocabulary.words.length} words loaded from ${path}`)
  } catch (err) {
    vocabulary = undefined
    console.error(`[ERROR]: Semantics off, cannot load the word vectors from ${path}`, err)
  }
  return isSemanticOn()
}

export const isSemanticOn = () => vocabulary !== undefined

const findWord = (vocab: Vocabulary, input: string | undefined): number | undefined => {
  if (!input) return undefined
  const word = normaliseSpelling(input)
  return vocab.index.get(word) ?? vocab.accentFree.get(removeAccents(word))
}

// Cosine similarity: int8 rounding leaves the vectors only roughly unit length.
const similarity = (vocab: Vocabulary, a: number, b: number) => {
  const { dim, values, norms } = vocab
  let dot = 0
  for (let d = 0; d < dim; d++) dot += values[a * dim + d] * values[b * dim + d]
  return dot / (norms[a] * norms[b] || 1)
}

// No pair at all when semantics are off; a null score when either word is unknown.
export function getSemanticScore(
  sourceMessage: ResponseMessage,
  targetMessages: ResponseMessage[],
): MessageSimilarity[] {
  const vocab = vocabulary
  if (!vocab) return []

  const source = findWord(vocab, sourceMessage.content)
  return targetMessages.map((target) => {
    const targetWord = findWord(vocab, target.content)
    return {
      sourceId: sourceMessage.messageId,
      targetId: target.messageId,
      score:
        source === undefined || targetWord === undefined
          ? null
          : similarity(vocab, source, targetWord),
    }
  })
}

export type BotMove = {
  // The bot's words and its partner's words of the completed rounds, oldest first.
  ownWords: string[]
  partnerWords: string[]
  // Every word said in the completed rounds, by anyone: never played again.
  playedWords: string[]
  level: BotLevel
  random?: () => number
}

const pickAtRandom = <T>(items: T[], random: () => number): T | undefined =>
  items[Math.min(items.length - 1, Math.floor(random() * items.length))]

const lastKnownWord = (vocab: Vocabulary, words: string[]) => {
  for (let i = words.length - 1; i >= 0; i--) {
    const found = findWord(vocab, words[i])
    if (found !== undefined) return found
  }
  return undefined
}

// The `count` candidates nearest to the vector, nearest first.
const nearest = (vocab: Vocabulary, target: Float64Array, candidates: number[], count: number) => {
  const { dim, values, norms } = vocab
  const best: { word: number; score: number }[] = []
  for (const word of candidates) {
    let dot = 0
    for (let d = 0; d < dim; d++) dot += target[d] * values[word * dim + d]
    const score = dot / (norms[word] || 1)
    if (best.length < count || score > best[best.length - 1].score) {
      best.push({ word, score })
      best.sort((a, b) => b.score - a.score)
      if (best.length > count) best.pop()
    }
  }
  return best.map((b) => b.word)
}

// The bot's next word, or undefined when semantics are off. It aims at the middle
// of the last round: its own word and its partner's (or the partner's last known one).
export function chooseBotWord({
  ownWords,
  partnerWords,
  playedWords,
  level,
  random = Math.random,
}: BotMove): string | undefined {
  const vocab = vocabulary
  if (!vocab) return undefined

  const played = new Set(playedWords.map((word) => findWord(vocab, word)))
  const candidates = vocab.botWords.filter((word) => !played.has(word))
  const anchors = [
    lastKnownWord(vocab, ownWords.slice(-1)),
    lastKnownWord(vocab, partnerWords),
  ].filter((word) => word !== undefined)

  if (anchors.length === 0) {
    const first = pickAtRandom(candidates.slice(0, BOT.firstWords), random)
    return first === undefined ? undefined : vocab.words[first]
  }

  const { dim, values, norms } = vocab
  const middle = new Float64Array(dim)
  for (const word of anchors) {
    for (let d = 0; d < dim; d++) middle[d] += values[word * dim + d] / (norms[word] || 1)
  }
  const choice = pickAtRandom(nearest(vocab, middle, candidates, BOT.choices[level]), random)
  return choice === undefined ? undefined : vocab.words[choice]
}
