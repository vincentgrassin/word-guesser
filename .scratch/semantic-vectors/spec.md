# Semantic proximity with pre-computed word vectors

Status: open

## Goal

After each complete round, show each player how close in meaning their word is to the other players' words, computed for free on our own server from a list of pre-computed French word vectors. The current Hugging Face integration goes away.

Later, the same data feeds a bot (Solo and AI Duel modes): finding the words nearest to a set of words. The bot is out of scope here, but the data must allow it.

## Game rules

- The score is a **hint only**. Winning still requires an exact match.
- An answer is **a single word**. Hyphens and apostrophes are allowed (`arc-en-ciel`, `aujourd'hui`). An answer containing a space is refused with an `ERROR` event explaining why.
- Display is unchanged: each word shows a level (`low`, `medium`, `high`, ...) derived from its best score against the other words of the round.
- A word missing from the list is accepted and shows a `?` indicator instead of a level.
- If the vector file cannot be loaded, the game runs without semantics (degraded mode) and the indicator is hidden.

## Data

- Source: **fastText French** (`cc.fr.300`, CC BY-SA 3.0), `https://dl.fbaipublicfiles.com/fasttext/vectors-crawl/cc.fr.300.vec.gz`. The file is sorted by frequency, so only its beginning is read.
  - Chosen over Fauconnier's word2vec (frWaC) by the prototype in `prototype/compare.ts`: better coverage of modern vocabulary and secondary meanings (`avocat / guacamole`, `souris / fromage`), and more human-looking nearest words for the future bot. Fauconnier separates unrelated words more clearly, but that is a matter of scale the thresholds absorb.
- Vocabulary filter: **Lexique 3.83** (CC BY-SA 4.0), `http://www.lexique.org/databases/Lexique383/Lexique383.tsv`. Columns used: `ortho`, `cgram`, `islem`, `freqfilms2`, `freqlivres`.
- Vocabulary: inflected forms of frequent words (plurals, feminines, conjugated verbs). No proper nouns, no function words (`le`, `de`, `et`, ...). Target: 50,000 to 100,000 forms.
- Each entry carries an `isLemma` flag (base form or not), for the future bot.
- Vectors are normalised (unit length, so similarity is a dot product) and quantised to int8. Expected size: 15 to 30 MB.
- The generated file is committed to the repository.
- Lookup ignores case. If the exact input is not found, it falls back to the most frequent form that matches once accents are removed (`ete` -> `été`).

## Generation script

- TypeScript/Node, in `packages/backend/scripts/`.
- Downloads the sources from fixed URLs and checks them against fixed checksums, so the file can be rebuilt identically.
- The README explains how to regenerate the file in a few commands.

## Code changes

- Remove the Hugging Face code and its variables (`ENABLE_SEMANTIC_CHECK`, `HUGGING_FACE_TOKEN`, `HUGGING_FACE_SEMANTIC_API`). Semantics are on by default.
- `getSemanticScore` stays the single entry point for scores. Nearest-word search, when the bot needs it, will be a separate function.
- The vector list lives in the backend only; the frontend never downloads it.
- `MessageSimilarity.score` becomes `number | null`:
  - `null`: at least one of the two words is unknown.
  - `messagesSimilarity: []` on a complete round: semantics are off (degraded mode).
- The level thresholds move to `shared`, with a comment stating they are calibrated for the chosen vector list. The backend sends the raw score. Starting values, from the prototype, to refine by playing:

  | Level     | fastText score |
  | --------- | -------------- |
  | `low`     | < 0.30         |
  | `medium`  | 0.30 to 0.42   |
  | `high`    | 0.42 to 0.58   |
  | `extreme` | >= 0.58        |
- Degraded mode: an error log at startup, and `/health` returns `semantic: "on" | "off"`.

## Credits

The vector source and Lexique are credited in the README and in the game footer, as their Creative Commons licences require.

## Tests

- The semantic module is tested against a small hand-made vector file (a few words, chosen vectors).
- CI checks that the real file loads.

## Out of scope

- The bot (Solo, AI Duel modes).
- Typo tolerance in the win condition.
- Multi-word expressions.
- Games already persisted with Hugging Face scores: they expire on their own.
