// The word vector file (data/vectors.bin), written by scripts/build-vectors.ts.
//
// Little-endian binary:
// - uint32 header length, then a UTF-8 JSON header ({ version, dim, count, ... });
// - count words: uint8 byte length, UTF-8 bytes, uint8 flags (bit 0 = isLemma);
// - count * dim int8 values, in the same order as the words.

export type WordVectorHeader = { version: 1; dim: number; count: number } & Record<string, unknown>

export type WordVectorEntry = { word: string; isLemma: boolean; vector: ArrayLike<number> }

export type WordVectors = {
  dim: number
  words: string[]
  isLemma: boolean[]
  values: Int8Array
}

// Normalised to unit length, then scaled to int8.
const quantise = (vector: ArrayLike<number>) => {
  const values = Array.from(vector)
  const norm = Math.hypot(...values) || 1
  return Int8Array.from(values, (x) => Math.max(-127, Math.min(127, Math.round((x / norm) * 127))))
}

export const encodeWordVectors = (
  entries: WordVectorEntry[],
  meta: Record<string, unknown> = {},
): Buffer => {
  const dim = entries[0]?.vector.length ?? 0
  const header = Buffer.from(JSON.stringify({ version: 1, dim, count: entries.length, ...meta }))
  const headerLength = Buffer.alloc(4)
  headerLength.writeUInt32LE(header.length)

  const words = entries.flatMap(({ word, isLemma }) => {
    const bytes = Buffer.from(word, 'utf8')
    if (bytes.length > 255) throw new Error(`"${word}" is too long`)
    return [Buffer.from([bytes.length]), bytes, Buffer.from([isLemma ? 1 : 0])]
  })

  const values = Buffer.alloc(entries.length * dim)
  entries.forEach(({ word, vector }, i) => {
    if (vector.length !== dim) throw new Error(`"${word}" has ${vector.length} values, not ${dim}`)
    values.set(new Uint8Array(quantise(vector).buffer), i * dim)
  })

  return Buffer.concat([headerLength, header, ...words, values])
}

// Throws when the buffer is not a valid word vector file.
export const decodeWordVectors = (buffer: Buffer): WordVectors => {
  const headerLength = buffer.readUInt32LE(0)
  const header = JSON.parse(buffer.subarray(4, 4 + headerLength).toString('utf8')) as WordVectorHeader
  if (header.version !== 1) throw new Error(`Unsupported word vector file version ${header.version}`)

  const words: string[] = []
  const isLemma: boolean[] = []
  let offset = 4 + headerLength
  for (let i = 0; i < header.count; i++) {
    const length = buffer[offset]
    words.push(buffer.subarray(offset + 1, offset + 1 + length).toString('utf8'))
    isLemma.push((buffer[offset + 1 + length] & 1) === 1)
    offset += length + 2
  }

  const size = header.count * header.dim
  if (buffer.length - offset !== size) {
    throw new Error(`Expected ${size} vector bytes, found ${buffer.length - offset}`)
  }
  const values = new Int8Array(buffer.buffer, buffer.byteOffset + offset, size)
  return { dim: header.dim, words, isLemma, values }
}
