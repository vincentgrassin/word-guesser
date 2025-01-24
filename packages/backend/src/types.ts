import { WebSocket } from "ws";

export type Message = {
  userId: string;
  message: string;
  date: Date;
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
};

export type Client = {
  socket: WebSocket;
  gameId: string;
  game: Game;
  userId: string;
};
