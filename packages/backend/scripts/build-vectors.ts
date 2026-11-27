// Builds data/vectors.bin: French word vectors (fastText) restricted to frequent
// words (Lexique). See "Regenerate the word vectors" in the README.
// Usage: pnpm --filter backend build-vectors <download-dir>
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { createGunzip } from 'node:zlib'

const FASTTEXT = {
  url: 'https://dl.fbaipublicfiles.com/fasttext/vectors-crawl/cc.fr.300.vec.gz',
  // The file is sorted by frequency: its first lines hold the most common words.
  // Only those are read; the full file (1.3 GB) is never downloaded.
  lines: 400_000,
  dim: 300,
  // SHA-256 of the extracted lines, not of the full file.
  sha256: '0cef4049f91657db9a542f5a3577d9583e9eebc214caab3269f0d9c640ece7d0',
}

const LEXIQUE = {
  url: 'http://www.lexique.org/databases/Lexique383/Lexique383.tsv',
  sha256: '637ba37a767a66679c48371d673ece50cbf541b49a4e40e598963d4f3fbce52b',
}

// Content words only: articles, pronouns, prepositions, conjunctions,
// auxiliaries and onomatopoeia are left out.
const KEPT_CATEGORIES = new Set(['NOM', 'ADJ', 'VER', 'ADV'])

// Lexique spells "coeur", the web mostly "cœur": both become "coeur". Words are
// stored this way, so the lookup must normalise its input the same way.
const normaliseSpelling = (word: string) => word.toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')

const OUTPUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'vectors.bin')

type Form = { word: string; frequency: number; isLemma: boolean }

const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex')

const checkSha256 = (name: string, path: string, expected: string) => {
  const actual = sha256(path)
  if (actual === expected) return
  if (!expected) {
    console.warn(`${name}: no checksum set yet. Set it to ${actual} once the output looks right.`)
    return
  }
  throw new Error(`${name}: checksum ${actual} differs from ${expected}. Delete ${path} or update the script.`)
}

const downloadLexique = async (dir: string) => {
  const path = join(dir, 'Lexique383.tsv')
  if (!existsSync(path)) {
    console.log(`Downloading ${LEXIQUE.url}`)
    const response = await fetch(LEXIQUE.url)
    if (!response.ok || !response.body) throw new Error(`Lexique: HTTP ${response.status}`)
    await pipeline(Readable.fromWeb(response.body as never), createWriteStream(path))
  }
  checkSha256('Lexique', path, LEXIQUE.sha256)
  return path
}

const extractFastText = async (dir: string) => {
  const path = join(dir, `cc.fr.300.first${FASTTEXT.lines}.vec`)
  if (!existsSync(path)) {
    console.log(`Reading the first ${FASTTEXT.lines} words of ${FASTTEXT.url}`)
    const controller = new AbortController()
    const response = await fetch(FASTTEXT.url, { signal: controller.signal })
    if (!response.ok || !response.body) throw new Error(`fastText: HTTP ${response.status}`)
    // Aborting the download on purpose makes both streams emit an error: ignore it.
    const source = Readable.fromWeb(response.body as never).on('error', () => {})
    const lines = createInterface({ input: source.pipe(createGunzip()).on('error', () => {}) })
    const out = createWriteStream(path)
    let count = -1 // the first line is a header
    for await (const line of lines) {
      if (count >= 0) out.write(line + '\n')
      if (++count >= FASTTEXT.lines) break
    }
    controller.abort()
    await new Promise((resolve) => out.end(resolve))
  }
  checkSha256('fastText', path, FASTTEXT.sha256)
  return path
}

// One entry per spelling: a spelling can appear on several rows (homographs).
const readLexique = (path: string): Map<string, Form> => {
  const [header, ...rows] = readFileSync(path, 'utf8').split('\n')
  const column = Object.fromEntries(header.trim().split('\t').map((name, i) => [name, i]))
  const forms = new Map<string, Form>()
  for (const row of rows) {
    const cells = row.split('\t')
    const word = normaliseSpelling(cells[column.ortho] ?? '')
    // Elided forms (n', qu') are not words a player would answer.
    if (!word || /\s/.test(word) || word.endsWith("'")) continue
    if (!KEPT_CATEGORIES.has(cells[column.cgram])) continue
    const frequency = Math.max(Number(cells[column.freqfilms2]), Number(cells[column.freqlivres]))
    const isLemma = cells[column.islem] === '1'
    const known = forms.get(word)
    forms.set(word, {
      word,
      frequency: Math.max(frequency, known?.frequency ?? 0),
      isLemma: isLemma || (known?.isLemma ?? false),
    })
  }
  return forms
}

// The vector of each wanted word; the first (most frequent) spelling wins when case differs.
const readFastText = async (path: string, wanted: Set<string>) => {
  const vectors = new Map<string, Float64Array>()
  for await (const line of createInterface({ input: createReadStream(path) })) {
    const space = line.indexOf(' ')
    const word = normaliseSpelling(line.slice(0, space))
    if (!wanted.has(word) || vectors.has(word)) continue
    const values = line.slice(space + 1).trimEnd().split(' ').map(Number)
    if (values.length !== FASTTEXT.dim) throw new Error(`fastText: "${word}" has ${values.length} values`)
    vectors.set(word, Float64Array.from(values))
  }
  return vectors
}

// Normalised to unit length, then scaled to int8.
const quantise = (vector: Float64Array) => {
  const norm = Math.hypot(...vector) || 1
  return Int8Array.from(vector, (x) => Math.max(-127, Math.min(127, Math.round((x / norm) * 127))))
}

// Little-endian: uint32 header length, JSON header, words (uint8 length, UTF-8, uint8 flags),
// then count * dim int8 values in the same order.
const encode = (forms: Form[], vectors: Map<string, Float64Array>) => {
  const header = Buffer.from(
    JSON.stringify({
      version: 1,
      dim: FASTTEXT.dim,
      count: forms.length,
      source: `fastText cc.fr.300 (CC BY-SA 3.0), first ${FASTTEXT.lines} words`,
      lexique: 'Lexique 3.83 (CC BY-SA 4.0)',
    }),
  )
  const headerLength = Buffer.alloc(4)
  headerLength.writeUInt32LE(header.length)

  const words = forms.flatMap(({ word, isLemma }) => {
    const bytes = Buffer.from(word, 'utf8')
    if (bytes.length > 255) throw new Error(`"${word}" is too long`)
    return [Buffer.from([bytes.length]), bytes, Buffer.from([isLemma ? 1 : 0])]
  })

  const values = Buffer.alloc(forms.length * FASTTEXT.dim)
  forms.forEach(({ word }, i) => {
    values.set(new Uint8Array(quantise(vectors.get(word)!).buffer), i * FASTTEXT.dim)
  })

  return Buffer.concat([headerLength, header, ...words, values])
}

const main = async () => {
  const dir = process.argv[2]
  if (!dir) throw new Error('Usage: pnpm --filter backend build-vectors <download-dir>')
  mkdirSync(dir, { recursive: true })

  const lexique = readLexique(await downloadLexique(dir))
  const vectors = await readFastText(await extractFastText(dir), new Set(lexique.keys()))

  // Most frequent first, the bot searches from the top. Ties: plain code-unit order, stable everywhere.
  const forms = [...lexique.values()]
    .filter((f) => vectors.has(f.word))
    .sort((a, b) => b.frequency - a.frequency || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0))

  const file = encode(forms, vectors)
  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, file)
  const lemmas = forms.filter((f) => f.isLemma).length
  const megabytes = (file.length / 1024 / 1024).toFixed(1)
  console.log(`Wrote ${OUTPUT}: ${forms.length} forms (${lemmas} lemmas), ${megabytes} MB`)
  console.log(`SHA-256: ${sha256(OUTPUT)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
