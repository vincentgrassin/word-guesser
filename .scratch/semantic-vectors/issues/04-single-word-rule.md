# 04 - One word per answer

Status: done
Blocked by: none

## What

Refuse an answer that contains a space, so that nearly every answer can be scored.

## Changes

- Backend, `PLAY_ROUND` in `packages/backend/src/server.ts`: after `readText` (which already trims), refuse a word containing whitespace with `refuse('One word only')`. Hyphens and apostrophes stay allowed (`arc-en-ciel`, `aujourd'hui`).
- Frontend: the answer form prevents sending a word with a space and says why, so that the player rarely meets the server refusal. The server stays the authority.

## Tests

- `server.spec.ts`: `deux mots` is refused with an `ERROR`; `arc-en-ciel` and `aujourd'hui` are accepted; leading and trailing spaces are still trimmed and accepted.
- Frontend: the form shows the message and does not send.

## Done when

- Both sides enforce the rule, and the tests above pass.

## Comments
