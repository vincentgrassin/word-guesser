# 03 - The bot plays its rounds

Status: open
Blocked by: 01, 02

## What

The server plays for the bot seats, at the start of each round.

## Behaviour

- **When**: when a game holding a bot starts (ticket 02) and each time a round completes and the game is still `started`, schedule the bot's move after a random delay of 1 to 3 s.
- **The move**: `chooseBotWord` (ticket 01) with the completed rounds only, then the same path as a human `PLAY_ROUND`: `updateRounds`, `updateGameStatus`, `updateGameStartTime`, broadcast. Extract that path from the `PLAY_ROUND` handler into one function both use, rather than copying it.
- **Skipped** when, at the time the delay ends, the game is gone, is over (win, loss), is out of time, or the bot has already played this round.
- **Server restart**: when the saved state is loaded, schedule the move of every bot that has not played the round being played.
- **Shutdown**: pending moves are cancelled when the server closes (like `clockTimer` and `cleanupTimer`).
- The delay and the random source are injectable (`ServerOptions`), so tests can run with no wait.

## Tests

`server.spec.ts`, with a zero delay and a fixed random:

- the bot plays the first round on its own; the human sees the bot's word hidden until they answer (existing `gameForPlayer`);
- once the human answers, the round completes with both words and its scores, and the bot plays the next round;
- a match between the human and the bot wins the game;
- the bot does not play in a finished game or once time is up;
- after a restart (state file), a bot that had not played its round plays it.

## Done when

- A Solo game can be played to the end against the bot, and the tests above pass.

## Comments
