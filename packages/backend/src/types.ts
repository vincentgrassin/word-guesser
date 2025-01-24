import { WebSocket } from "ws";

export type Message = {
  userId: string;
  message: string;
  date: Date;
  event: EVENT;
};

export type Round = {
  roundId: number;
  player1: Message | undefined;
  player2: Message | undefined;
  status: "win" | "ongoing";
};

export type GameSettings = {
  status: "win" | "ongoing";
  players: string[];
};

export type Game = {
  gameId: string;
  messages: Message[];
  settings: GameSettings;
  rounds: Round[];
  players: Set<Player>;
};

export type Client = {
  socket: WebSocket;
  gameId: string;
  game: Game;
  userId: string;
};

export type Player = {
  socket: WebSocket;
  userId: string;
  // gameIds: string[];
};

export type EVENT = "CREATE_GAME" | "DISCONNECT_PLAYER" | "PLAY_ROUND";
