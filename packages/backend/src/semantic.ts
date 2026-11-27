import { MessageSimilarity, ResponseMessage } from '@word-guesser/shared'
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
}

// Undefined until a vector file is loaded: semantics are off (degraded mode).
let vocabulary: Vocabulary | undefined

const removeAccents = (word: string) => word.normalize('NFD').replace(/[̀-ͯ]/g, '')

// The spelling words are stored with (see scripts/build-vectors.ts).
const normaliseSpelling = (word: string) =>
  word.trim().toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/’/g, "'")

const buildVocabulary = (vectors: WordVectors): Vocabulary => {
  const { dim, words, values } = vectors
  const index = new Map<string, number>()
  const accentFree = new Map<string, number>()
  const norms = new Float64Array(words.length)
  words.forEach((word, i) => {
    index.set(word, i)
    // Words are sorted by decreasing frequency: the first one wins.
    const key = removeAccents(word)
    if (!accentFree.has(key)) accentFree.set(key, i)
    let sum = 0
    for (let d = i * dim; d < (i + 1) * dim; d++) sum += values[d] * values[d]
    norms[i] = Math.sqrt(sum)
  })
  return { ...vectors, index, accentFree, norms }
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
      score: source === undefined || targetWord === undefined ? null : similarity(vocab, source, targetWord),
    }
  })
}
