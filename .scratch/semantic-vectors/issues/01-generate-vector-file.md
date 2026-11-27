# 01 - Generate the word vector file

Status: open
Blocked by: none

## What

A TypeScript script, `packages/backend/scripts/build-vectors.ts`, that builds `packages/backend/data/vectors.bin` from fastText and Lexique. The generated file is committed.

## Steps

1. **fastText**: stream `cc.fr.300.vec.gz`, gunzip on the fly, keep the first N lines (N around 200,000), then abort the download. `prototype/compare.ts` already does this (`loadFastText`).
2. **Lexique**: download `Lexique383.tsv` in full.
3. **Filter** the Lexique rows:
   - `cgram` in `NOM`, `ADJ`, `VER`, `ADV`. Drops articles, pronouns, prepositions, conjunctions, auxiliaries, onomatopoeia.
   - `ortho` without a space (single words only).
   - Above a frequency threshold on `freqfilms2` / `freqlivres`, tuned to reach 50,000 to 100,000 forms.
   - A form can appear on several rows (homographs): merge them. `isLemma` is true if any row has `islem = 1`; frequency is the highest one.
4. **Join**: keep the forms that have a fastText vector (lowercased; the first, most frequent, spelling wins).
5. **Encode** each vector: normalise to unit length, then quantise to int8 (`round(x * 127)`).
6. **Write** the file, sorted by decreasing frequency (the bot will search the most frequent words first).

## File format

Little-endian binary:

- `uint32` header length, then a UTF-8 JSON header: `{ "version": 1, "dim": 300, "count": n, "source": "...", "lexique": "..." }`.
- `count` entries of words: `uint8` byte length + UTF-8 bytes + `uint8` flags (bit 0 = `isLemma`).
- `count * dim` `int8` values, in the same order as the words.

The accent-insensitive lookup index is built when the file is loaded, not stored.

## Reproducibility

- Source URLs are constants in the script.
- Checksums (SHA-256) are constants too: of the full Lexique file, and of the extracted fastText text (the first N lines; the full 1.3 GB file is never downloaded). The script stops if one differs.
- Downloads go to a temporary directory given as an argument, never into the repo.
- A `pnpm --filter backend build-vectors <tmp-dir>` script, and a "Regenerate the word vectors" section in the README.

## Done when

- `vectors.bin` is committed and weighs 15 to 30 MB.
- Running the script twice gives the same file (same SHA-256).
- The script prints the number of forms kept and how many of them are lemmas.

## Comments
