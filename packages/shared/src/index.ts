import { WebSocket as WsWebSocket } from "ws";

export type GameStatus = "opened" | "started" | "closed";
export type GameType = "basic";

export type Player = {
  socket: WsWebSocket;
  userId: string;
};
export type PlainPlayer = Omit<Player, "socket">;

export type MessageResponse = {
  event: SocketEvent;
  payload: unknown;
};

export type RequestMessage = {
  gameId?: string;
  content?: string;
  event: SocketEvent;
  date: Date;
};

export type ResponseMessage = RequestMessage & { userId: string };

export type Round = {
  roundId: number;
  messages: ResponseMessage[];
  isComplete: boolean;
};

export type GameSettings = {
  status: GameStatus;
  createdBy: string;
  createdAt: Date;
  type: GameType;
};

export type Game = {
  gameId: string;
  settings: GameSettings;
  rounds: Round[];
  players: PlainPlayer[];
};

export type SocketEvent =
  | "CREATE_GAME"
  | "DISCONNECT_PLAYER"
  | "PLAY_ROUND"
  | "LIST_GAMES"
  | "CLOSE_CONNECTION"
  | "JOIN_GAME"
  | "QUIT_GAME";

export type WebSocket = WsWebSocket;

export const generateUID = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getGame = (games: Game[], gameId: string) => {
  return games.find((g) => g.gameId === gameId);
};

export function sortRoundMessages(
  userId: string,
  round: Round
): {
  me?: ResponseMessage;
  others: ResponseMessage[];
} {
  const messages = round.messages;
  const userMessage = messages.find((msg) => msg.userId === userId);
  const otherMessages = messages.filter((msg) => msg.userId !== userId);
  return { me: userMessage, others: otherMessages };
}
