import { Game } from '@word-guesser/shared'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

// What survives a restart. Connections do not: players reconnect on their own.
export type SavedState = {
  games: Game[]
  lastActivity: [string, number][]
  creatorAddress: [string, string][]
  // Token hashes, hex encoded (never the tokens themselves)
  tokenHashes: [string, string][]
}

const isSavedState = (value: unknown): value is SavedState => {
  if (typeof value !== 'object' || value === null) return false
  const state = value as Record<string, unknown>
  return ['games', 'lastActivity', 'creatorAddress', 'tokenHashes'].every((key) =>
    Array.isArray(state[key]),
  )
}

// The saved state, or undefined when there is none or it cannot be read.
export function loadState(file: string): SavedState | undefined {
  let raw: string
  try {
    raw = readFileSync(file, 'utf8')
  } catch {
    return undefined // first start: nothing saved yet
  }
  try {
    const state: unknown = JSON.parse(raw)
    if (isSavedState(state)) return state
    console.error(`[ERROR]: Saved state in ${file} has an unexpected shape, starting empty`)
  } catch (error) {
    console.error(`[ERROR]: Saved state in ${file} is not valid JSON, starting empty`, error)
  }
  return undefined
}

// Writes to a temporary file first, then renames it: a crash during the write
// can never leave a half-written state behind.
export function saveState(file: string, state: SavedState) {
  mkdirSync(dirname(file), { recursive: true })
  const temporaryFile = `${file}.tmp`
  writeFileSync(temporaryFile, JSON.stringify(state))
  renameSync(temporaryFile, file)
}
