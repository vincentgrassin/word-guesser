import {
  Game,
  GameStatus,
  GameType,
  Message,
  Player,
  Round,
} from "@word-guesser/shared";

export const WebSocketState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

export const buildPlayers = (game: Game, player: Player | undefined) => {
  const players = game.players;
  if (!player) return players;
  if (players.length === getMaxPlayers(game.settings.type)) return players;

  const hasAlreadyPlayer = players.some((p) => p.userId === player?.userId);
  if (hasAlreadyPlayer) return players;

  const cleanedPlayer = cleanPlayer(player);
  return [...players, cleanedPlayer];
};

export const buildRounds = (game: Game, message: Message) => {
  const rounds = [...game.rounds];
  const [player1, player2] = game.players;

  if (!player1 || !player2) {
    console.error("Invalid player");
    return rounds;
  }

  const isPlayer1 = message.userId === player1.userId;
  const isPlayer2 = message.userId === player2.userId;

  if (!isPlayer1 && !isPlayer2) {
    console.error("Message sender is not a recognized player in this game");
    return rounds;
  }

  if (rounds.length === 0) {
    // No rounds exist, create the first round
    rounds.push({
      player1: isPlayer1 ? message : undefined,
      player2: isPlayer2 ? message : undefined,
      roundId: 1,
    });
  } else {
    const currentRound = rounds[rounds.length - 1];

    if (currentRound.player1 && currentRound.player2) {
      // Both players have sent messages, start a new round
      rounds.push({
        player1: isPlayer1 ? message : undefined,
        player2: isPlayer2 ? message : undefined,
        roundId: currentRound.roundId + 1,
      });
    } else {
      // There's an ongoing round, update the appropriate player
      if (isPlayer1) {
        currentRound.player1 = message;
      } else if (isPlayer2) {
        currentRound.player2 = message;
      }
    }
  }
  return rounds;
};

export const buildGameStatus = (game: Game): GameStatus => {
  let status = game.settings.status;
  if (game.players.length === getMaxPlayers(game.settings.type)) {
    status = "started";
  }
  const rounds = game.rounds;
  if (rounds.length) {
    const lastRound = game.rounds[game.rounds.length - 1];
    const hasWin = lastRound.player1?.content === lastRound.player2?.content;
    return hasWin ? "closed" : status;
  }
  return status;
};

export const buildInitialGame = (gameId: string, userId: string): Game => {
  return {
    gameId,
    rounds: [],
    players: [],
    settings: {
      status: "opened",
      type: "basic",
      createdBy: userId,
      createdAt: new Date(Date.now()),
    },
  };
};

export const broadcast = (players: Player[], message: string) => {
  players.forEach((player) => {
    player.socket.send(message);
  });
};

export function findPlayer(
  userId: string,
  players: Player[]
): Player | undefined {
  for (const player of players) {
    if (player.userId === userId) {
      return player;
    }
  }
  return undefined;
}

export function cleanPlayer(player: Player): Omit<Player, "socket"> {
  const { socket, ...rest } = player;
  return rest;
}

export function addPlayer(
  newPlayer: Player | undefined,
  players: Player[]
): boolean {
  if (!newPlayer) return false;

  for (const player of players) {
    if (player.userId === newPlayer.userId) {
      return false;
    }
  }
  players.push(newPlayer);
  return true;
}

export function findGame(gameId: string, games: Game[]): Game | undefined {
  for (const game of games) {
    if (game.gameId === gameId) {
      return game;
    }
  }
  return undefined;
}

export const getMaxPlayers = (type: GameType) => {
  switch (type) {
    case "basic":
      return 2;
    default:
      return 2;
  }
};
