import websocketPlugin from "@fastify/websocket";
import { Game, Message, Player } from "@word-guesser/shared";
import fastify from "fastify";
import {
  broadcast,
  buildInitialGame,
  cleanPlayer,
  findGame,
  findPlayer,
  generateUID,
} from "./helpers.js";

const server = fastify();

const games: Game[] = [];
const players: Player[] = [];

console.log("Starting server");
server.register(websocketPlugin);

server.register(async function (fastify) {
  // fastify.get(
  //   "/game/:gameId",
  //   { websocket: true },
  //   (socket /* WebSocket */, req /* FastifyRequest */) => {
  //     const gameId = (req.params as { gameId: string }).gameId;
  //     const userId = (req.query as { userId: string }).userId || "";

  //     // Add new client with its room ID
  //     const connectedClients = getClientsByGameId(gameId, clients);
  //     const client = buildClient(socket, connectedClients, gameId, userId);
  //     clients.add(client);
  //     broadCastMessageByGame(clients, gameId, JSON.stringify(client.game));

  //     socket.on("message", (message) => {
  //       const rawMessage = message.toString();
  //       const parsedMessage: Message = JSON.parse(rawMessage);
  //       const updatedRounds = updateRounds(client.game.rounds, parsedMessage);
  //       clients.forEach((client) => {
  //         if (isClientOfCurrentGame(client, gameId)) {
  //           client.game.messages.push(parsedMessage);
  //           client.game.rounds = updatedRounds;
  //           client.socket.send(JSON.stringify(client.game));
  //         }
  //       });
  //     });

  //     // Clean up on disconnect
  //     socket.on("close", () => {
  //       console.log(`Client disconnected from room ${gameId}`);
  //       clients.delete(client);
  //       const connectedClients = getClientsByGameId(gameId, clients);
  //       if (connectedClients.size) {
  //         const updatedGame = removePlayerFromGame(connectedClients, userId);
  //         broadCastMessageByGame(
  //           connectedClients,
  //           gameId,
  //           JSON.stringify(updatedGame)
  //         );
  //       }
  //     });

  //     socket.on("error", (error) => {
  //       console.error(`Error in room ${gameId}:`, error);
  //       clients.delete(client);
  //     });
  //   }
  // );

  fastify.get(
    "/connect/:userId",
    { websocket: true },
    (socket /* WebSocket */, req /* FastifyRequest */) => {
      const userId = (req.params as { userId: string }).userId;
      const newPlayer = {
        userId,
        socket,
      };

      players.push(newPlayer);
      newPlayer.socket.send(
        JSON.stringify({ event: "LIST_GAMES", payload: Array.from(games) })
      );

      socket.on("message", (m) => {
        const rawMessage = m.toString();
        const { event, content, userId, gameId, date }: Message =
          JSON.parse(rawMessage);

        switch (event) {
          case "CREATE_GAME":
            const uid = generateUID();
            const newGame = buildInitialGame(uid);
            games.push(newGame);
            broadcast(players, JSON.stringify({ event, payload: newGame }));
            break;
          case "JOIN_GAME":
            if (userId && gameId) {
              const player = findPlayer(userId, players);
              const game = findGame(gameId, games);
              const hasAlreadyPlayer = game?.players.some(
                (p) => p.userId === player?.userId
              );
              if (player && !hasAlreadyPlayer) {
                const cleanedPlayer = cleanPlayer(player);
                game?.players.push(cleanedPlayer);
              }
              broadcast(players, JSON.stringify({ event, payload: game }));
            }
            break;
        }
      });

      // Clean up on disconnect
      socket.on("close", () => {
        // players.delete(newPlayer);
      });

      socket.on("error", (error) => {});
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
