import websocketPlugin from "@fastify/websocket";
import {
  Game,
  Player,
  generateUID,
  removeGame,
  findGame,
  hasPlayerLeftGame,
} from "@word-guesser/shared";
import dotenv from "dotenv";
import fastify from "fastify";
import {
  broadcast,
  broadcastToOne,
  buildGameStatus,
  buildInitialGame,
  buildPlayers,
  buildRounds,
  findPlayer,
  findPlayerById,
  isPlayerInGame,
  parseMessage,
  removePlayerFromGame,
  removePlayerFromPlayers,
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
        const message = parseMessage(m);
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
                const responseMessage = {
                  ...message,
                  userId,
                };
                game.rounds = buildRounds(game, responseMessage);
                game.settings.status = buildGameStatus(game);
                broadcast(players, event, game);
              }
            }
            break;
          case "QUIT_GAME":
            const gameToQuit = findGame(gameId, games);
            if (gameToQuit) {
              removePlayerFromGame(userId, gameToQuit);
              broadcast(players, event, gameToQuit);
            }
            break;
          case "DELETE_GAME":
            if (gameId) {
              const deletedGameId = removeGame(gameId, games);
              broadcast(players, event, deletedGameId);
            }
            break;
        }
      });

      // Clean up on disconnect
      socket.on("close", () => {
        const disconnectedPlayer = findPlayer(socket, players);

        if (!disconnectedPlayer) return;
        const disconnectedUserId = disconnectedPlayer.userId;
        removePlayerFromPlayers(disconnectedPlayer, players);
        const remainingConnections = findPlayerById(
          disconnectedUserId,
          players
        );
        if (!remainingConnections) {
          games.forEach((game) => {
            const isInGame = isPlayerInGame(disconnectedUserId, game);
            if (isInGame) {
              const hasLeftGame = hasPlayerLeftGame(disconnectedUserId, game);
              if (hasLeftGame) {
                removePlayerFromGame(disconnectedUserId, game);
              }
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
