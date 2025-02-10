import { WebSocket as WsWebSocket } from 'ws'

export type GameStatus = 'opened' | 'started' | 'closed'
export type GameType = 'basic' | 'solo'

export type Player = {
  socket: WsWebSocket
  userId: string
  // userName: string
}
export type PlainPlayer = Omit<Player, 'socket'>

export type SocketPayload = {
  event: SocketEvent
  payload: unknown
}

export type RequestMessage = {
  gameId?: string
  content?: string
  event: SocketEvent
  date: number
}

export type ResponseMessage = RequestMessage & { userId: string }

export type Round = {
  roundId: number
  messages: ResponseMessage[]
  isComplete: boolean
}

export type GameProperties = {
  type: GameType
  maxPlayers: number
  duration: number
}

export type GameSettings = {
  status: GameStatus
  createdBy: string
  createdAt: number
  startedAt?: number
} & GameProperties

export type Game = {
  gameId: string
  settings: GameSettings
  rounds: Round[]
  players: PlainPlayer[]
}

export type SocketEvent =
  | 'CREATE_GAME'
  | 'DISCONNECT_PLAYER'
  | 'PLAY_ROUND'
  | 'LIST_GAMES'
  | 'CLOSE_CONNECTION'
  | 'JOIN_GAME'
  | 'DELETE_GAME'
  | 'QUIT_GAME'

export type WebSocket = WsWebSocket

export const generateUID = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function sortRoundMessages(
  userId: string,
  round: Round,
): {
  me?: ResponseMessage
  others: ResponseMessage[]
} {
  const messages = round.messages
  const userMessage = messages.find((msg) => msg.userId === userId)
  const otherMessages = messages.filter((msg) => msg.userId !== userId)
  return { me: userMessage, others: otherMessages }
}

export function findGame(gameId: string | undefined, games: Game[]): Game | undefined {
  if (!gameId) return undefined
  for (const game of games) {
    if (game.gameId === gameId) {
      return game
    }
  }
  return undefined
}

export function removeGame(gameId: string, games: Game[]): string | false {
  const index = games.findIndex((g) => g.gameId === gameId)
  if (index !== -1) {
    games.splice(index, 1)
    return gameId
  }
  return false
}

export function syncGame(game: Game, games: Game[]) {
  const idx = games.findIndex((g) => g.gameId === game.gameId)
  if (idx !== -1) games.splice(idx, 1, game)
  else games.push(game)
}

export const isOlderThan = (date: number | undefined, minutes: number): boolean => {
  if (!date) return false
  return Date.now() - date > 60 * 1000 * minutes
}

export const hasPlayerLeftGame = (playerId: string, game: Game) => {
  const lastRound = game.rounds[game.rounds.length - 1]
  if (!lastRound) return false
  const lastMessage = lastRound.messages?.find((m) => m.userId === playerId)
  return isOlderThan(lastMessage?.date, 5)
}
