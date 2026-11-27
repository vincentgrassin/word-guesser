# 05 - Create and play a Solo game in the browser

Status: done
Blocked by: 02

## What

The creation form offers Solo with a level, and the game screen shows the bot as a bot.

## Changes

- `GameCreationForm.vue`:
  - enable the `Solo` radio (disabled today);
  - with Solo selected: hide "Number of players", show the level (`Easy` / `Normal` / `Hard`, `Normal` selected by default) with `BaseRadioGroup`;
  - send `botLevel` with the game properties.
- After creating a Solo game, the player lands in it (check what happens today after creating a `basic` game, and keep the same flow).
- Game screen: the bot's seat shows it is a bot (its name already holds its level; add a small marker or icon in `PlayersArea`). The game settings area shows the level.
- The `ERROR` "Solo mode is unavailable" is shown to the player (check how errors are displayed today).

## Tests

- The form: Solo hides the player count, shows the level, and sends `type: 'solo'` with `botLevel`.
- `GameView.spec.ts`: a Solo game shows the bot marked as a bot, and the level.

## Done when

- A Solo game can be created and played from the browser, and the tests above pass.

## Comments

### 2026-11-27 - Implemented

- Server refusals were only logged in the console. They now show in a dismissable banner (`state.serverError` in the store, shown by `App.vue`), for every refusal, not only "Solo mode is unavailable".
- Same flow as a basic game after creation: the game shows in the lobby (for its creator only) and the player opens it. The creator is already seated, so the game page sends no `JOIN_GAME`.
- The creation form keeps its field order (name, players, duration, type), so the existing test still finds the inputs; the level comes last.
