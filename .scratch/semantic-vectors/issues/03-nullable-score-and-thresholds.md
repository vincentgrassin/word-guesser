# 03 - Unknown words, degraded mode and thresholds on the frontend

Status: open
Blocked by: none

## What

Let the frontend tell apart "low score", "unknown word" and "no semantics", and move the thresholds to `shared`.

## Changes

- `shared`: `MessageSimilarity.score` becomes `number | null` (`null` = at least one word unknown).
- `shared`: the thresholds move there from `computeScore` (`packages/frontend/src/utils/helpers.ts`), with a comment stating they are calibrated for fastText `cc.fr.300`. New values:

  | Level     | Score        |
  | --------- | ------------ |
  | `low`     | < 0.30       |
  | `medium`  | 0.30 to 0.42 |
  | `high`    | 0.42 to 0.58 |
  | `extreme` | >= 0.58      |

- Frontend, `getMaxScore` / `sortRoundMessages`: a message's score is
  - the best non-null score of its pairs;
  - `null` when all its pairs are `null` (unknown word);
  - none at all when the complete round has `messagesSimilarity: []` (semantics off).
- `BetItem.vue`: shows `?` for an unknown word, and no indicator when semantics are off.

## Tests

- `helpers.spec.ts`: the new thresholds; `null` pairs ignored when computing the best score; all `null` gives "unknown"; empty list gives "no indicator".
- A component test for `BetItem` covering the three cases.

## Done when

- The three cases display as described, and front and back still compile with the new type.

## Comments

### 2026-11-27 - Note from ticket 02

`MessageSimilarity.score` is already `number | null` in `shared`, and `getMaxScore` already skips `null` pairs. What is left: the thresholds, the `?` and hidden indicator in `BetItem`, and their tests.
