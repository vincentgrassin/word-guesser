# 02 - Replace Hugging Face with the local vector file

Status: done
Blocked by: 01 (file format)

## What

Rewrite `packages/backend/src/semantic.ts` to score words from `data/vectors.bin`, and remove everything Hugging Face.

## Behaviour

- **Loading**: the file is read once at startup into memory.
  - Missing or unreadable file: degraded mode. An error is logged, the server still starts, and scores are off.
- **Lookup** of a word:
  1. Lowercase it, then look it up as is.
  2. Not found: look it up with accents removed, and take the most frequent form that matches (`ete` -> `été`).
  3. Still not found: the word is unknown.
- **`getSemanticScore(source, targets)`** keeps its role as the single entry point:
  - semantics off: returns `[]`;
  - a pair where either word is unknown: `score: null`;
  - otherwise: the dot product of the two vectors (they are normalised), converted back from int8.
- Exposes whether semantics are on, for `/health` (ticket 05).
- No nearest-word search yet: that comes with the bot, as a separate function.

## Removal

- The Hugging Face `fetch` in `semantic.ts`.
- `ENABLE_SEMANTIC_CHECK`, `HUGGING_FACE_TOKEN`, `HUGGING_FACE_SEMANTIC_API` from `.env.example` and the README table. Tell the user to remove them from their local `.env` and the server's `.env`.
- The `msw` Hugging Face handler (`src/__tests__/setup/msw.ts`) and its uses in `semantic.spec.ts` and `server.spec.ts`. Remove `msw` from the dev dependencies if nothing else uses it.

## Tests

Against a small hand-made fixture file (a few words with chosen vectors, written in the ticket 01 format), not the real file:

- two known words give the expected score;
- case and accents are ignored (`Été`, `ete`);
- an unknown word gives `null`;
- a missing file gives `[]` and does not throw;
- `server.spec.ts`: a complete round carries the scores.

## Done when

- No reference to Hugging Face remains in the code, config and README.
- All backend tests pass.

## Comments

### 2026-11-27 - Notes from ticket 01

- Stored words are lowercase with `œ` -> `oe` and `æ` -> `ae`: normalise the input the same way before the lookup.
- After int8 rounding, vectors are only approximately unit length: precompute each norm at load time and divide the dot product by both norms.

### 2026-11-27 - Implemented (not committed yet)

- `src/wordVectors.ts` owns the file format (`encodeWordVectors` / `decodeWordVectors`). The generation script and the test fixtures use it too, so the format is written in one place. Regenerating `vectors.bin` through it gives the same SHA-256.
- `src/semantic.ts`: `loadSemantic(path)` (called by `index.ts` at startup), `isSemanticOn()` (for `/health`, ticket 05), `getSemanticScore()` now synchronous. The lookup also turns the typographic apostrophe `’` (phone keyboards) into `'`.
- The shared `MessageSimilarity.score` became `number | null` here, so the backend compiles; the frontend `getMaxScore` only skips `null` for now. The `?` display stays in ticket 03.
- `msw` removed from the backend (the frontend still uses it).
- Real file: loads in about 85 ms, about 50 MB of memory, 0.02 ms per pair.
- Seen while testing: `ete / hiver` scores only 0.33, because `été` is mostly the past participle of `être` in the texts fastText learnt from. Words with a very frequent second meaning score lower than expected; accepted.
