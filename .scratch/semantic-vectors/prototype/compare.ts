// Throwaway prototype: compares fastText and Fauconnier French word vectors.
// Usage: node compare.ts <data-dir>
// Downloads go to <data-dir>; nothing is written next to this script.
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createGunzip } from 'node:zlib'
import { join } from 'node:path'

const FASTTEXT_URL = 'https://dl.fbaipublicfiles.com/fasttext/vectors-crawl/cc.fr.300.vec.gz'
const FASTTEXT_WORDS = 200_000
const FAUCONNIER_URL =
  'https://embeddings.net/embeddings/frWac_non_lem_no_postag_no_phrase_200_skip_cut100.bin'

// Words searched as neighbours: the most frequent ones only, as the bot would.
const NEIGHBOUR_VOCABULARY = 50_000

type Vectors = { words: string[]; index: Map<string, number>; data: Float32Array; dim: number }

const PAIRS: [string, string, string][] = [
  ['synonymes', 'voiture', 'automobile'],
  ['synonymes', 'content', 'heureux'],
  ['synonymes', 'maison', 'demeure'],
  ['proches', 'chat', 'chien'],
  ['liés', 'mer', 'plage'],
  ['liés', 'pain', 'boulangerie'],
  ['liés', 'hiver', 'neige'],
  ['liés', 'médecin', 'hôpital'],
  ['liés', 'abeille', 'miel'],
  ['liés', 'guitare', 'musique'],
  ['liés', 'livre', 'lecture'],
  ['contraires', 'chaud', 'froid'],
  ['contraires', 'jour', 'nuit'],
  ['contraires', 'grand', 'petit'],
  ['double sens', 'avocat', 'tribunal'],
  ['double sens', 'avocat', 'guacamole'],
  ['double sens', 'souris', 'ordinateur'],
  ['double sens', 'souris', 'fromage'],
  ['flexion', 'cheval', 'chevaux'],
  ['flexion', 'manger', 'mangeait'],
  ['sans rapport', 'chaise', 'nuage'],
  ['sans rapport', 'banane', 'démocratie'],
  ['sans rapport', 'crayon', 'volcan'],
  ['sans rapport', 'téléphone', 'girafe'],
]

const MIDPOINTS: [string, string][] = [
  ['mer', 'montagne'],
  ['chat', 'nuit'],
  ['pomme', 'rouge'],
  ['roi', 'femme'],
  ['feu', 'eau'],
  ['école', 'enfant'],
  ['soleil', 'plage'],
  ['café', 'matin'],
]

const normalise = (v: Float32Array) => {
  let norm = 0
  for (const x of v) norm += x * x
  norm = Math.sqrt(norm) || 1
  for (let i = 0; i < v.length; i++) v[i] /= norm
}

// Keeps the first (most frequent) spelling of each lowercased word.
const buildVectors = (entries: { word: string; vector: Float32Array }[], dim: number): Vectors => {
  const words: string[] = []
  const index = new Map<string, number>()
  const data = new Float32Array(entries.length * dim)
  for (const { word, vector } of entries) {
    const key = word.toLowerCase()
    if (index.has(key)) continue
    normalise(vector)
    data.set(vector, words.length * dim)
    index.set(key, words.length)
    words.push(key)
  }
  return { words, index, data: data.subarray(0, words.length * dim), dim }
}

const download = async (url: string, path: string) => {
  if (existsSync(path)) return
  console.error(`Téléchargement de ${url}...`)
  const response = await fetch(url)
  if (!response.ok || !response.body) throw new Error(`${url}: HTTP ${response.status}`)
  await pipeline(Readable.fromWeb(response.body as never), createWriteStream(path))
}

// The .vec file is sorted by frequency: reading its beginning gives the most common words.
const loadFastText = async (dataDir: string): Promise<Vectors> => {
  const path = join(dataDir, `cc.fr.300.top${FASTTEXT_WORDS}.vec`)
  if (!existsSync(path)) {
    console.error(`Lecture des ${FASTTEXT_WORDS} premiers mots de ${FASTTEXT_URL}...`)
    const controller = new AbortController()
    const response = await fetch(FASTTEXT_URL, { signal: controller.signal })
    if (!response.ok || !response.body) throw new Error(`fastText: HTTP ${response.status}`)
    // Aborting the download on purpose makes both streams emit an error: ignore it.
    const source = Readable.fromWeb(response.body as never).on('error', () => {})
    const gunzip = source.pipe(createGunzip()).on('error', () => {})
    const lines = createInterface({ input: gunzip })
    const out = createWriteStream(path)
    let count = -1 // the first line is the header
    for await (const line of lines) {
      if (count >= 0) out.write(line + '\n')
      if (++count >= FASTTEXT_WORDS) break
    }
    controller.abort()
    await new Promise((resolve) => out.end(resolve))
  }

  const entries: { word: string; vector: Float32Array }[] = []
  for await (const line of createInterface({ input: createReadStream(path) })) {
    const parts = line.trimEnd().split(' ')
    entries.push({ word: parts[0], vector: Float32Array.from(parts.slice(1), Number) })
  }
  return buildVectors(entries, 300)
}

// word2vec binary format: "<count> <dim>\n", then per word: "<word> " + dim float32 LE (+ optional "\n").
const loadFauconnier = async (dataDir: string): Promise<Vectors> => {
  const path = join(dataDir, 'fauconnier-frwac-200-skip.bin')
  await download(FAUCONNIER_URL, path)
  const buffer = readFileSync(path)
  let offset = buffer.indexOf(0x0a) + 1
  const [count, dim] = buffer.subarray(0, offset - 1).toString().trim().split(' ').map(Number)
  const entries: { word: string; vector: Float32Array }[] = []
  for (let i = 0; i < count; i++) {
    while (buffer[offset] === 0x0a) offset++
    const space = buffer.indexOf(0x20, offset)
    const word = buffer.subarray(offset, space).toString('utf8')
    offset = space + 1
    const vector = new Float32Array(dim)
    for (let d = 0; d < dim; d++) vector[d] = buffer.readFloatLE(offset + d * 4)
    offset += dim * 4
    entries.push({ word, vector })
  }
  return buildVectors(entries, dim)
}

const vectorOf = (v: Vectors, word: string) => {
  const i = v.index.get(word.toLowerCase())
  return i === undefined ? undefined : v.data.subarray(i * v.dim, (i + 1) * v.dim)
}

const dot = (a: Float32Array, b: Float32Array) => {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

const similarity = (v: Vectors, a: string, b: string) => {
  const va = vectorOf(v, a)
  const vb = vectorOf(v, b)
  return va && vb ? dot(va, vb) : undefined
}

// Similarity of random frequent word pairs: shows what "unrelated" looks like for this model.
const randomPairPercentiles = (v: Vectors) => {
  const n = Math.min(20_000, v.words.length)
  const scores: number[] = []
  let seed = 42
  const random = () => ((seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31) / 2 ** 31)
  for (let k = 0; k < 20_000; k++) {
    const a = Math.floor(random() * n)
    const b = Math.floor(random() * n)
    scores.push(dot(v.data.subarray(a * v.dim, (a + 1) * v.dim), v.data.subarray(b * v.dim, (b + 1) * v.dim)))
  }
  scores.sort((x, y) => x - y)
  return (score: number) => {
    let i = 0
    while (i < scores.length && scores[i] < score) i++
    return Math.round((100 * i) / scores.length)
  }
}

// The bot's move: the words nearest to the average of the given words, excluding them.
const nearestToMidpoint = (v: Vectors, words: string[], count: number) => {
  const vectors = words.map((w) => vectorOf(v, w))
  if (vectors.some((x) => !x)) return ['(mot inconnu)']
  const mid = new Float32Array(v.dim)
  for (const x of vectors) for (let d = 0; d < v.dim; d++) mid[d] += x![d]
  normalise(mid)
  const best: { word: string; score: number }[] = []
  const limit = Math.min(NEIGHBOUR_VOCABULARY, v.words.length)
  for (let i = 0; i < limit; i++) {
    const word = v.words[i]
    if (words.includes(word)) continue
    const score = dot(mid, v.data.subarray(i * v.dim, (i + 1) * v.dim))
    if (best.length < count || score > best[best.length - 1].score) {
      best.push({ word, score })
      best.sort((x, y) => y.score - x.score)
      if (best.length > count) best.pop()
    }
  }
  return best.map((b) => b.word)
}

const format = (score: number | undefined, percentile: (s: number) => number) =>
  score === undefined ? 'inconnu'.padEnd(12) : `${score.toFixed(2)} (p${percentile(score)})`.padEnd(12)

const main = async () => {
  const dataDir = process.argv[2]
  if (!dataDir) throw new Error('Usage: node compare.ts <data-dir>')
  mkdirSync(dataDir, { recursive: true })

  const models = { fastText: await loadFastText(dataDir), Fauconnier: await loadFauconnier(dataDir) }
  const percentiles = {
    fastText: randomPairPercentiles(models.fastText),
    Fauconnier: randomPairPercentiles(models.Fauconnier),
  }

  console.log(`\nVocabulaire : fastText ${models.fastText.words.length} mots, Fauconnier ${models.Fauconnier.words.length} mots`)
  console.log('Score = similarité cosinus. pNN = plus élevé que NN % des paires de mots tirées au hasard.\n')
  console.log(`${'catégorie'.padEnd(13)}${'paire'.padEnd(26)}${'fastText'.padEnd(14)}Fauconnier`)
  for (const [category, a, b] of PAIRS) {
    console.log(
      `${category.padEnd(13)}${`${a} / ${b}`.padEnd(26)}` +
        `${format(similarity(models.fastText, a, b), percentiles.fastText)}  ` +
        format(similarity(models.Fauconnier, a, b), percentiles.Fauconnier),
    )
  }

  console.log('\nChoix du bot (mots les plus proches du point milieu, parmi les 50 000 plus fréquents) :')
  for (const pair of MIDPOINTS) {
    console.log(`\n  ${pair.join(' + ')}`)
    for (const name of ['fastText', 'Fauconnier'] as const) {
      console.log(`    ${name.padEnd(11)} ${nearestToMidpoint(models[name], pair, 8).join(', ')}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
