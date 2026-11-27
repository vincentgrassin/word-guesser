# 02 - Create a Solo game with a bot seat

Status: done
Blocked by: none

## What

`CREATE_GAME` with `type: 'solo'` creates a game that already holds its bot, and starts at once.

## Changes

- `shared`:
  - `User` gains `isBot?: boolean`.
  - `GameProperties` gains `botLevel?: BotLevel`, with `BotLevel = 'easy' | 'normal' | 'hard'`.
- `buildInitialGame` (`packages/backend/src/helpers.ts`), when `type` is `solo`:
  - `maxPlayers` is 2, whatever the client sent;
  - `botLevel` is read from the client, `normal` when missing or invalid;
  - for `basic` games, `botLevel` stays undefined.
- `CREATE_GAME` (`packages/backend/src/server.ts`), for a Solo game:
  - refused with "Solo mode is unavailable" when `isSemanticOn()` is false;
  - the creator is seated (today the creator joins with a separate `JOIN_GAME`: check how the frontend does it and keep one way), then the bot: `{ userId: 'bot-<uid>', userName: 'Bot (<level>)', isBot: true }`;
  - `updateGameStatus` then sets `started`, since the table is full.
- The bot is a plain `User`: it goes through persistence (`persistence.ts`) with no change. Check that `isBot` survives a save and a reload.

## Tests

- `helpers.spec.ts`: `buildInitialGame` forces `maxPlayers` to 2 and defaults `botLevel` for `solo`; leaves `basic` games unchanged.
- `server.spec.ts`:
  - a Solo game starts with the creator and a bot (`isBot: true`, level in its name);
  - refused when semantics are off;
  - counts in the per-address limit (it already does: `openGamesCreatedFrom` counts `started` games);
  - the bot survives a save and reload of the state file.

## Done when

- A Solo game is created started, with its bot, and the tests above pass. The bot does not play yet (ticket 03).

## Comments
