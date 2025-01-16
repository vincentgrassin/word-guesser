import fastify from "fastify";
import websocketPlugin from "@fastify/websocket";
import { WebSocket } from "ws";

const WebSocketState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

const server = fastify();

interface Client {
  socket: WebSocket;
  gameId: string;
}

const clients = new Set<Client>();

console.log("Starting server");
server.register(websocketPlugin);

server.register(async function (fastify) {
  fastify.get(
    "/game/:gameId",
    { websocket: true },
    (socket /* WebSocket */, req /* FastifyRequest */) => {
      const gameId = (req.params as { gameId: string }).gameId;
      console.log("Entering chat room", gameId);

      // Add new client with its room ID
      const client = { socket, gameId };
      clients.add(client);

      socket.on("message", (message) => {
        const rawMessage = message.toString();
        const parsedMessage = JSON.parse(rawMessage);

        // Only broadcast to clients in the same room
        clients.forEach((client) => {
          if (
            client.gameId === gameId &&
            client.socket.readyState === WebSocketState.OPEN
          ) {
            client.socket.send(rawMessage);
          }
        });
      });

      // Clean up on disconnect
      socket.on("close", () => {
        console.log(`Client disconnected from room ${gameId}`);
        clients.delete(client);
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
