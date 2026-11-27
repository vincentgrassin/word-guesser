# Solo mode: one human and one bot

Status: open

## Goal

Let a player play alone, cooperatively, with a bot run by the server. The bot picks its words with the word vectors already loaded for the proximity scores (`packages/backend/src/semantic.ts`), so it costs nothing to run.

The bot is a seat any game could hold: the AI Duel mode will reuse it (see `.scratch/ideas.md`).

## Game

- **1 human + 1 bot.** `maxPlayers` is forced to 2 by the server; the creation form hides the field.
- **Same rules as Duo**: an exact match wins, the clock running out loses, the creator picks the duration.
- **Only its creator sees it** in the lobby. The server refuses `JOIN_GAME` from anyone else, even with the game id or URL.
- **Deleted when the human quits it** (`QUIT_GAME`). A disconnection behaves as today; abandoned games expire with the existing cleanup.
- **Refused when semantics are off** (`isSemanticOn()` false): `ERROR` "Solo mode is unavailable".
- **Per-address limit**: in-progress games already count in `maxOpenGamesPerAddress` (`openGamesCreatedFrom` counts `opened` and `started`), so a Solo game counts with no change. A test pins it.

## The bot

- **A regular entry of `game.players`**: `User` gains `isBot?: boolean`. Its id is `bot-<uid>`, its name `Bot (<level>)`, e.g. `Bot (hard)`. It is saved with the game, so it survives restarts. It has no WebSocket: the server plays for it.
- **When it plays**: at the start of each round (when the game starts, then each time a round completes and the game goes on), after a random 1 to 3 s delay. It never reads the human's answer of the round being played, only completed rounds.
- **Not when the game is over** (win, loss) or out of time.
- **After a server restart**, it plays the moves it had not played yet.

### How it picks a word

- **Vocabulary** it may play, from `vectors.bin` (no regeneration):
  - lemmas only (`isLemma`), so it does not answer `montagnes` to `montagne`;
  - among the 20,000 most frequent words (the file is sorted by frequency);
  - at least 4 letters (drops `pas`, `est`, `ne`, `si`, `là`);
  - never a word already said in the game, by anyone (compared after the same normalisation as the lookup).
- **Round 1**: a random word among the 2,000 most frequent words of that vocabulary.
- **Next rounds**: the average (midpoint) of the vectors of the two words of the last completed round, its own and the human's; then a word among the nearest ones, depending on the level.
- **Unknown human word** (not in the file): the midpoint of its own last word and the human's last known word from earlier rounds; its own word alone if there is none.

### Levels

Chosen at creation, saved as `botLevel` in the game properties, shown in the game settings and in the bot's name. The game is cooperative: a bot that converges fast makes the game easy.

| Level    | Picks                                     |
| -------- | ----------------------------------------- |
| `easy`   | always the nearest word: predictable      |
| `normal` | a random word among the 5 nearest         |
| `hard`   | a random word among the 20 nearest        |

These numbers are constants, to tune by playing.

## Out of scope

Noted in `.scratch/ideas.md`: an expert level with an LLM, forbidding replays for humans, the lobby redesign, teams (Duel), bot personalities.
