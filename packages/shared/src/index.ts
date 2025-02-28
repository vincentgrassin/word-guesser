import { WebSocket as WsWebSocket } from 'ws'

export type GameStatus = 'opened' | 'started' | 'win' | 'loss'
export const gameStatuses = new Set<GameStatus>(['win', 'loss', 'opened', 'started'])
export type GameType = 'basic' | 'solo'

export type SocketRequestQuery = {
  userName: string
}
export type SocketRequestParams = {
  userId: string
}

export type User = {
  userId: string
  userName: string
}

export type PlayerSettings = Omit<User, 'userId'>

export type Player = {
  socket: WsWebSocket
} & User

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
  name: string
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
  players: User[]
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
  | 'END_GAME'
  | 'UPDATE_PLAYER'

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

export function sortPlayers(
  userId: string,
  players: User[],
): {
  me?: User
  others: User[]
} {
  const me = players.find((p) => p.userId === userId)
  const otherPlayers = players.filter((p) => p.userId !== userId)
  return { me, others: otherPlayers }
}

export function findGame(gameId: string | undefined, games: Game[]): Game | undefined {
  if (!gameId) return undefined
  for (const game of games) {
    if (game?.gameId === gameId) {
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

export function isPlayerInGame(userId: string, game: Game | undefined): boolean {
  if (!game) return false
  return game.players.some((p) => p.userId === userId)
}
