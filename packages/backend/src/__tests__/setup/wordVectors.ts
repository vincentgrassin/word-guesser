import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { encodeWordVectors, WordVectorEntry } from '../../wordVectors.js'

// A tiny vocabulary with hand-picked vectors, most frequent first like the real file.
// mer / plage: 0.6; mer / chaise: 0; pêche / plage: 0.8; péché / plage: 0.
export const TEST_WORDS: WordVectorEntry[] = [
  { word: 'mer', isLemma: true, vector: [1, 0, 0] },
  { word: 'plage', isLemma: true, vector: [0.6, 0.8, 0] },
  { word: 'chaise', isLemma: true, vector: [0, 0, 1] },
  // Both are "peche" without accents: pêche comes first, so it is the more frequent.
  { word: 'pêche', isLemma: true, vector: [0, 1, 0] },
  { word: 'péché', isLemma: true, vector: [0, 0, 1] },
  { word: 'coeur', isLemma: true, vector: [1, 0, 0] },
  { word: "presqu'île", isLemma: true, vector: [1, 0, 0] },
  { word: 'plages', isLemma: false, vector: [0.6, 0.8, 0] },
]

// Writes a vector file in a temporary folder; call the returned cleanup when done.
export const writeTestVectors = (entries: WordVectorEntry[] = TEST_WORDS) => {
  const dir = mkdtempSync(join(tmpdir(), 'word-vectors-'))
  const path = join(dir, 'vectors.bin')
  writeFileSync(path, encodeWordVectors(entries))
  return { path, dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}
