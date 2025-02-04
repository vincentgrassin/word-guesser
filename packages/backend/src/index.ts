import websocketPlugin from "@fastify/websocket";
import { Game, Message, Player, generateUID } from "@word-guesser/shared";
import fastify from "fastify";
import dotenv from "dotenv";
import {
  broadcast,
  buildInitialGame,
  findGame,
  findPlayerById,
  buildPlayers,
  buildRounds,
  buildGameStatus,
  removePlayerFromGame,
  isPlayerInGame,
  broadcastToOne,
  removePlayerFromPlayers,
  findPlayer,
} from "./helpers.js";

const server = fastify();
dotenv.config();

const games: Game[] = [];
let players: Player[] = [];

console.info("[INFO]: Starting server");
server.register(websocketPlugin);

server.register(async function (fastify) {
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
      broadcastToOne(newPlayer, "LIST_GAMES", games);

      socket.on("message", (m: Buffer) => {
        const rawMessage = m.toString();
        const message: Message = JSON.parse(rawMessage);
        message.userId = userId;
        const { event, gameId } = message;
        switch (event) {
          case "CREATE_GAME":
            const uid = generateUID();
            const newGame = buildInitialGame(uid, userId || "");
            games.push(newGame);
            broadcast(players, event, newGame);
            break;
          case "JOIN_GAME":
            if (userId && gameId) {
              const player = findPlayerById(userId, players);
              const game = findGame(gameId, games);
              if (game) {
                game.players = buildPlayers(game, player);
                game.settings.status = buildGameStatus(game);
              }
              broadcast(players, event, game);
            }
            break;
          case "PLAY_ROUND":
            if (userId && gameId) {
              const game = findGame(gameId, games);
              if (game) {
                game.rounds = buildRounds(game, message);
                game.settings.status = buildGameStatus(game);
                broadcast(players, event, game);
              }
            }
            break;
          case "QUIT_GAME":
            const game = findGame(gameId, games);
            if (game) {
              removePlayerFromGame(userId, game);
              broadcast(players, event, game);
            }

            break;
        }
      });

      // Clean up on disconnect
      socket.on("close", () => {
        const disconnectedPlayer = findPlayer(socket, players);

        if (!disconnectedPlayer) return;
        removePlayerFromPlayers(disconnectedPlayer, players);
        const remainingConnections = findPlayerById(
          disconnectedPlayer.userId,
          players
        );
        if (!remainingConnections) {
          games.forEach((game) => {
            const isInGame = isPlayerInGame(disconnectedPlayer.userId, game);
            if (isInGame) {
              removePlayerFromGame(disconnectedPlayer.userId, game);
              broadcast(players, "CLOSE_CONNECTION", game);
            }
          });
        }
      });

      socket.on("error", (error: Error) => {
        //TODO: handle errors
      });
    }
  );
});

server.listen(
  { port: parseInt(process.env.PORT!), host: process.env.HOST },
  (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.info(`[INFO]: Server listening at ${address}`);
  }
);
