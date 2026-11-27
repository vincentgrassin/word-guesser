# 01 - The bot's brain: pick a word from the vectors

Status: open
Blocked by: none

## What

A pure function that picks the bot's next word, next to `getSemanticScore` in `packages/backend/src/semantic.ts` (it needs the loaded vocabulary). No game, no timer, no WebSocket here.

## Behaviour

Something like `chooseBotWord({ ownWords, partnerWords, playedWords, level, random })`:

- `ownWords` / `partnerWords`: the bot's and the human's words of the completed rounds, oldest first.
- `playedWords`: every word said in the game, by anyone, never to be played again.
- `random`: injected (defaults to `Math.random`), so tests are deterministic.
- Returns a word, or `undefined` when semantics are off.

Rules (see the spec):

- Vocabulary: lemmas, among the 20,000 most frequent, at least 4 letters, not already played (compared after the lookup normalisation: case, `œ`, accents).
- No completed round yet: a random word among the 2,000 most frequent of that vocabulary.
- Otherwise: midpoint of the bot's last word and the human's last word. Unknown human word: the human's last known word from earlier rounds instead; none: the bot's word alone.
- Level: `easy` the nearest, `normal` a random one of the 5 nearest, `hard` a random one of the 20 nearest.
- The 20,000 / 2,000 / 4 / 1-5-20 values are named constants.

The nearest-word search scans the bot vocabulary (20,000 x 300 int8 values): measure it on the real file, it should take a few milliseconds.

## Tests

On a hand-made vector file (`src/__tests__/setup/wordVectors.ts`), extended with the words these tests need:

- the first word comes from the frequent vocabulary, and depends on `random`;
- `easy` picks the nearest word to the midpoint;
- `normal` / `hard` pick among the 5 / 20 nearest, according to `random`;
- non-lemmas, words of 3 letters or less, rare words and already played words are never picked;
- an unknown human word falls back as described;
- semantics off: `undefined`.

## Done when

- The tests above pass, and the real file gives sensible picks for a few pairs (`mer` + `montagne`, `chat` + `nuit`), checked by hand like in the prototype.

## Comments
