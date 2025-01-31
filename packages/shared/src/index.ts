import { WebSocket as WsWebSocket } from "ws";

export type Player = {
  socket: WsWebSocket;
  userId: string;
};

export type MessageResponse = {
  event: SocketEvent;
  payload: unknown;
};

export type Message = {
  userId?: string;
  gameId?: string;
  content?: string;
  date: Date;
  event: SocketEvent;
};
export type Round = {
  roundId: number;
  player1: Message | undefined;
  player2: Message | undefined;
  status: "win" | "ongoing";
};

export type GameSettings = {
  status: "win" | "ongoing";
  createdBy: string;
  createdAt: Date;
};

export type Game = {
  gameId: string;
  settings: GameSettings;
  rounds: Round[];
  players: Omit<Player, "socket">[];
};

export type SocketEvent =
  | "CREATE_GAME"
  | "DISCONNECT_PLAYER"
  | "PLAY_ROUND"
  | "LIST_GAMES"
  | "JOIN_GAME";

export type WebSocket = WsWebSocket;

export const generateUID = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getGame = (games: Game[], gameId: string) => {
  return games.find((g) => g.gameId === gameId);
};
