import fastify from "fastify";
import websocketPlugin, { WebSocket } from "@fastify/websocket";
import cors from "@fastify/cors";

const WebSocketState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

const server = fastify();

const clients = new Set<WebSocket>();

console.log("starting server");

server.register(websocketPlugin);
// server.register(cors, {
//   origin: "http://localhost:5173", // Allow the frontend origin
//   methods: ["GET"], // Allow WebSocket GET requests
//   credentials: true, // Include cookies if needed
// });

server.get("/", async (request, reply) => {
  return "pong\n";
});

server.register(async function (fastify) {
  fastify.get(
    "/chat/:roomId",
    { websocket: true },
    (socket /* WebSocket */, req /* FastifyRequest */) => {
      console.log("Entering chat room", req.params);

      clients.add(socket);
      socket.on("message", (message) => {
        const parsedMessage = message.toString();
        clients.forEach((client) => {
          if (client.readyState === WebSocketState.OPEN) {
            client.send(parsedMessage);
          }
        });
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
