import { Client, Game, Message, Round } from "./types.js";
import { WebSocket } from "ws";

export const WebSocketState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

export function getClientsByGameId(
  gameId: string,
  clients: Set<Client>
): Set<Client> {
  const matchingClients = new Set<Client>();
  clients.forEach((client) => {
    if (client.gameId === gameId) {
      matchingClients.add(client);
    }
  });
  return matchingClients;
}

export const computePlayers = (
  userId: string,
  gameId: string,
  clientsSet: Set<Client>
) => {
  let userIds: string[] = [];

  const clients = Array.from(clientsSet);
  if (!(clients.length === 0)) {
    userIds = clients.map((c) => c.userId);
  }
  userIds.push(userId);
  return userIds;
};

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
    settings: {
      players: [],
      status: "ongoing",
    },
  };
};

export const buildClient = (
  socket: WebSocket,
  connectedClients: Set<Client>,
  gameId: string,
  userId: string
) => {
  const hasConnectedClients = connectedClients.size > 0;
  const client: Client = {
    socket,
    gameId,
    userId,
    game: hasConnectedClients
      ? Array.from(connectedClients)[0].game
      : buildInitialGame(gameId),
  };
  client.game.settings.players = hasConnectedClients
    ? computePlayers(userId, gameId, connectedClients)
    : [userId];

  return client;
};

export const isClientOfCurrentGame = (client: Client, gameId: string) => {
  return (
    client.gameId === gameId && client.socket.readyState === WebSocketState.OPEN
  );
};

export const broadCastMessageByGame = (
  clients: Set<Client>,
  gameId: string,
  message: string
) => {
  clients.forEach((client) => {
    if (isClientOfCurrentGame(client, gameId)) {
      client.socket.send(message);
    }
  });
};

export const removePlayerFromGame = (clients: Set<Client>, userId: string) => {
  const connectedClient = Array.from(clients)[0];
  connectedClient.game.settings.players =
    connectedClient.game.settings.players.filter((id) => userId !== id);
  return connectedClient.game;
};
