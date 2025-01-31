import websocketPlugin from "@fastify/websocket";
import { Game, Message, Player, generateUID } from "@word-guesser/shared";
import fastify from "fastify";
import {
  broadcast,
  buildInitialGame,
  findGame,
  findPlayer,
  buildPlayers,
  buildRounds,
  getMaxPlayers,
  buildGameStatus,
} from "./helpers.js";

const server = fastify();

const games: Game[] = [];
const players: Player[] = [];

console.log("Starting server");
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
      newPlayer.socket.send(
        JSON.stringify({ event: "LIST_GAMES", payload: Array.from(games) })
      );

      socket.on("message", (m: Buffer) => {
        const rawMessage = m.toString();
        const message: Message = JSON.parse(rawMessage);
        const { event, content, userId, gameId, date } = message;

        switch (event) {
          case "CREATE_GAME":
            const uid = generateUID();
            const newGame = buildInitialGame(uid, userId || "");
            games.push(newGame);
            broadcast(players, JSON.stringify({ event, payload: newGame }));
            break;
          case "JOIN_GAME":
            if (userId && gameId) {
              const player = findPlayer(userId, players);
              const game = findGame(gameId, games);
              if (game) {
                game.players = buildPlayers(game, player);
                game.settings.status = buildGameStatus(game);
              }
              broadcast(players, JSON.stringify({ event, payload: game }));
            }
            break;
          case "PLAY_ROUND":
            if (userId && gameId) {
              const game = findGame(gameId, games);
              if (game) {
                game.rounds = buildRounds(game, message);
                game.settings.status = buildGameStatus(game);
              }
              broadcast(players, JSON.stringify({ event, payload: game }));
            }
            break;
        }
      });

      // Clean up on disconnect
      socket.on("close", () => {
        //TODO: close games, updates players, update games
      });

      socket.on("error", (error: Error) => {
        //TODO: handle errors
      });
    }
  );
});

server.listen({ port: 3000, host: "0.0.0.0" }, (err, address) => {
  //TODO: env variables
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
