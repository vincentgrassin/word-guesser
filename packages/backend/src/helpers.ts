import { Game, Message, Player, Round } from "@word-guesser/shared";

export const WebSocketState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

export const updateRounds = (rounds: Round[], message: Message) => {
  if (rounds.length === 0) {
    rounds.push({
      player1: message,
      player2: undefined,
      roundId: 1,
      status: "ongoing",
    });
  } else {
    const currentRound = rounds.length;
    if (rounds[currentRound - 1].player2) {
      rounds.push({
        player1: message,
        player2: undefined,
        roundId: currentRound + 1,
        status: "ongoing",
      });
    } else {
      rounds[currentRound - 1].player2 = message;
    }
  }
  return rounds;
};

export const buildInitialGame = (gameId: string): Game => {
  return {
    gameId,
    rounds: [],
    messages: [],
    players: [],
    settings: {
      players: [],
      status: "ongoing",
    },
  };
};

export const generateUID = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
