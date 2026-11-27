# Ideas and things to do

Not specified yet. When one is picked up, it gets its own folder under `.scratch/` with a spec and tickets.

## Game modes

- **Solo** (1 human + 1 bot): being specified in `.scratch/solo-mode/`.
- **Duel**: 2 teams of 2 humans, the first team whose two players write the same word wins. Open questions: do teams play their rounds at the same time? Does a team see the other team's words? What if both teams match in the same round? Time out: everybody loses, or a draw?
- **AI Duel**: Duel where any seat can be a bot. Comes almost for free once Solo (bot seats) and Duel (teams) exist.
- **Expert bot level** using an LLM instead of the word vectors.
- **Bot personalities** for Solo: literal, poetic, stubborn (moves little). One bot gets predictable fast.
- **3+ players with partial points**: every pair that matches scores, since getting everyone on the same word gets very hard.
- **Secret word**: a hidden target word, players get closer to it with the proximity scores (solo or co-op). Same infrastructure, different game.

## Game rules

- **Typo tolerance in the win condition**: normalise (case, accents) and accept one typo (Levenshtein distance 1) from 6 letters. Short words stay exact (`chat` / `char`).
- **Forbid replaying a word already said in the game**, for everyone (the bot already avoids it).
- **Multi-word expressions** (`coup de foudre`): today one word per answer. Would need the local embedding model (option 2) behind `getSemanticScore`.

## Game mechanics

Today a game is only won or lost, round 1 is free, and nothing makes you want to play again. Ideas to give each game stakes, variety and replay value (brainstorm of 2026-11-27). Suggested order: per-round timer + forbidden replays (see Game rules), then score, then imposed starting words.

- **Per-round timer** (e.g. 15 s), instead of or on top of the global one: no time to overthink. Keeps the "no countdown" reveal of Game feel.
- **Score** instead of win/loss only: fewer rounds and more time left give more points, shown as stars ("Fusion en 3 rounds ⭐⭐⭐"). Goes in the share text of Game feel.
- **Imposed starting words**: each player gets a random word for round 1 (`volcan` / `bibliothèque`). Today round 1 is free, so games look alike.
- **Daily challenge**: the same starting words for everyone on a given day, compare rounds to win. Builds on imposed starting words and the share text.
- **Theme card** drawn at the start (cuisine, cinéma…): the shared word must fit it.
- **Round constraints**, now and then: "starts with M", "5 letters max", "no E".
- **Jokers** (one per game): see the letter count of the partner's word, or ask the bot for a hint.
- **Word map** on the end screen: the played words projected in 2D from their vectors (`packages/backend/src/wordVectors.ts`), each player's path converging to the shared word. Upgrade of the path recap in Game feel; the most striking idea, and the most expensive.
- **Stats and achievements**: "Télépathe" (win in 2 rounds), win streak, most unexpected shared word.

## Game feel

The game screen feels flat: nothing moves or reacts at the key moments. Agreed direction (2026-11-27): everything revolves around **heat**, and the closer the words, the hotter and faster the screen pulses. Interactive mockup: https://claude.ai/artifact/QYzcddnCEFL3M3NnSBEpPw (2 players, scripted partner, simulated scores).

- **Reveal, no countdown** (a 3-2-1 is too heavy for a fast game): the partner's card flips as soon as the last player submits, then the gauge fills. Under one second, and the input is usable right away.
- **Heat gauge**: continuous (raw score, not just 4 levels), blue → yellow → orange → red. Labels Froid / Tiède / Chaud / Brûlant. **Heartbeat pulse that speeds up with heat** (still, slow, fast + glow, very fast + tremble). Only the latest round pulses. Trend vs the previous round (↑ plus chaud / ↓ plus froid). The screen background takes a light tint of the latest heat.
- **Same word = fusion** (not a stamp): both cards slide together and merge into one gold card, with a flash, a small screen shake, a chord and confetti in the heat colours.
- **Partner presence**: a face-down card drops in when the partner has played ("Léa a joué ✓"); this is already in the data. A "typing…" indicator needs a backend event: later.
- **Input as the centre piece**: large, docked at the bottom, refocused after each reveal, Enter to submit. Shakes and explains when a word is refused. Then "En attente de Léa…".
- **Timer**: full-width bar at the top that shrinks, turns orange under 30 s and red under 10 s, using the same pulse language. Ticking sound in the last 10 s.
- **The path**: rounds read top to bottom, newest at the bottom above the input. Each row is `my word ━ gauge ━ their word`, so you see the rows warm up until the fusion.
- **End screen** instead of the modal. Win: the shared word, stats (rounds, time), path recap. Loss, not punishing: "closest with X and Y". A share text like `🟦🟨🟧🟥✨ en 4 rounds · 1:12`. No rematch button (dropped).
- **Sound**, with a mute toggle remembered in the browser: pop on submit, tick when the partner plays, card flip, a heat note whose pitch rises with the score, a rising chord on match, a soft falling note on loss. Generated with Web Audio (no files) or CC0 sounds (Kenney).
- **Visual identity**: keep the neo-brutalist base. Display font Bricolage Grotesque for titles and words. Remove the global `font-weight: normal` in `main.css`. One colour per player, **outside the heat palette** (teal, violet), with initial avatars. UI fully in French.
- **Tech**: Vue `<Transition>` / `<TransitionGroup>` + CSS keyframes; a small canvas confetti (hand-written or `canvas-confetti`). Respect `prefers-reduced-motion`.
- **Open question**: with 4 players (2 teams of 2, see Duel above), what does the screen show of the other team? At least an indicator of its progress.

## UI text

- **Translate the UI texts into French**: every screen (lobby, game, modals, error messages sent by the backend). Also listed under Game feel ("UI fully in French"), but it can ship on its own, before the redesign.

## Lobby

- Redesign the lobby (Solo games are only shown to their creator).

## Semantics

- **Tune the level thresholds** by playing (`SCORE_THRESHOLDS` in `packages/shared/src/index.ts`).
- **Modern words** missing from Lexique (`smartphone`, `selfie`, `covid`, `wifi`): a hand-written allowlist, if `?` shows up too often.
- Words with an inner apostrophe (`aujourd'hui`) are unknown: fastText splits them.

## Deployment and tooling

- After merging `feat/semantic-vectors`: check `/health` shows `semantic: "on"` on the server, and remove the Hugging Face variables from the server's `.env`.
- Domain name + `SITE_ADDRESS` for HTTPS.
- Redis for the game state.
- A dedicated `deploy` user on the server, so `vincent` can leave the `docker` group.
- Frontend type-check and lint errors (the Dockerfile and CI only build).
- Decide on pnpm `minimumReleaseAge`.
- VS Code: use the workspace TypeScript version, to see the same errors as CI.
