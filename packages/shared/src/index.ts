import { WebSocket as WsWebSocket } from "ws";

export type Client = {
  socket: WsWebSocket;
  gameId: string;
  game: Game;
  userId: string;
};

export type Player = {
  socket: WsWebSocket;
  userId: string;
};

export type MessageResponse = {
  event: EVENT;
  payload: string;
};

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

export type EVENT =
  | "CREATE_GAME"
  | "DISCONNECT_PLAYER"
  | "PLAY_ROUND"
  | "LIST_GAMES";

export const EVENTS = {
  CREATE_GAME: "CREATE_GAME",
  DISCONNECT_PLAYER: "DISCONNECT_PLAYER",
  PLAY_ROUND: "PLAY_ROUND",
  LIST_GAMES: "LIST_GAMES",
} as const;

export type WebSocket = WsWebSocket;
