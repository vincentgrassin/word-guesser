# 04 - A Solo game belongs to its creator

Status: done
Blocked by: 02

## What

Only the creator sees a Solo game and can be in it. Quitting it deletes it.

## Changes

`packages/backend/src/server.ts`:

- **Audience**: one function that gives the connected players a game is sent to: everyone for a `basic` game, only the creator for a `solo` game. Use it everywhere a game is sent: the initial `LIST_GAMES`, `CREATE_GAME`, `JOIN_GAME`, `PLAY_ROUND`, `QUIT_GAME`, `UPDATE_PLAYER`, `END_GAME`, `DELETE_GAME` (manual and on expiry), and the bot moves of ticket 03. Today every one of them sends to all `players`.
- **`JOIN_GAME`** on a Solo game by anyone but its creator: refused ("This game is private"). The creator joining again (reconnecting) stays allowed.
- **`QUIT_GAME`** on a Solo game by its creator: the game is deleted (as `DELETE_GAME`), not left with the bot alone.

## Tests

`server.spec.ts`:

- another player is not sent a Solo game: not in `LIST_GAMES` on connection, nor when it is created or played;
- another player's `JOIN_GAME` is refused;
- the creator quitting deletes the game;
- `basic` games are still sent to everyone (existing tests).

## Done when

- The tests above pass.

## Comments
