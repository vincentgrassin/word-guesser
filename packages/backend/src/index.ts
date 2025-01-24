import fastify from "fastify";
import websocketPlugin from "@fastify/websocket";
import { Client, Message } from "./types.js";
import {
  broadCastMessageByGame,
  buildClient,
  getClientsByGameId,
  isClientOfCurrentGame,
  removePlayerFromGame,
  updateRounds,
} from "./helpers.js";

const server = fastify();

const clients = new Set<Client>();

console.log("Starting server");
server.register(websocketPlugin);

server.register(async function (fastify) {
  fastify.get(
    "/game/:gameId",
    { websocket: true },
    (socket /* WebSocket */, req /* FastifyRequest */) => {
      const gameId = (req.params as { gameId: string }).gameId;
      const userId = (req.query as { userId: string }).userId || "";

      // Add new client with its room ID
      const connectedClients = getClientsByGameId(gameId, clients);
      const client = buildClient(socket, connectedClients, gameId, userId);
      clients.add(client);
      broadCastMessageByGame(clients, gameId, JSON.stringify(client.game));

      socket.on("message", (message) => {
        const rawMessage = message.toString();
        const parsedMessage: Message = JSON.parse(rawMessage);
        const updatedRounds = updateRounds(client.game.rounds, parsedMessage);
        clients.forEach((client) => {
          if (isClientOfCurrentGame(client, gameId)) {
            client.game.messages.push(parsedMessage);
            client.game.rounds = updatedRounds;
            client.socket.send(JSON.stringify(client.game));
          }
        });
      });

      // Clean up on disconnect
      socket.on("close", () => {
        console.log(`Client disconnected from room ${gameId}`);
        clients.delete(client);
        const connectedClients = getClientsByGameId(gameId, clients);
        if (connectedClients.size) {
          const updatedGame = removePlayerFromGame(connectedClients, userId);
          broadCastMessageByGame(
            connectedClients,
            gameId,
            JSON.stringify(updatedGame)
          );
        }
      });

      socket.on("error", (error) => {
        console.error(`Error in room ${gameId}:`, error);
        clients.delete(client);
      });
    }
  );
});

server.listen({ port: 3000, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
