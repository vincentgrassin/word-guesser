import { WebSocket as WsWebSocket } from 'ws'

export type GameStatus = 'opened' | 'started' | 'win' | 'loss'
export const gameStatuses = new Set<GameStatus>(['win', 'loss', 'opened', 'started'])
export type GameType = 'basic' | 'solo'

export type SocketRequestQuery = {
  userName: string
  // Secret kept by the browser: proves the connection belongs to the owner of userId
  token?: string
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

export type ResponseMessage = RequestMessage & { userId: string; messageId: string }

export type MessageSimilarity = {
  sourceId: string
  targetId: string
  // null: at least one of the two words is unknown
  score: number | null
}

export type ScoreLevel = 'low' | 'medium' | 'high' | 'extreme'

// Calibrated for the backend's word vectors (fastText cc.fr.300, see
// packages/backend/data): change them together with the vector file.
export const SCORE_THRESHOLDS = { medium: 0.3, high: 0.42, extreme: 0.58 } as const

export function scoreLevel(score: number): ScoreLevel {
  if (score >= SCORE_THRESHOLDS.extreme) return 'extreme'
  if (score >= SCORE_THRESHOLDS.high) return 'high'
  if (score >= SCORE_THRESHOLDS.medium) return 'medium'
  return 'low'
}

export type Round = {
  roundId: number
  messages: ResponseMessage[]
  isComplete: boolean
  messagesSimilarity: MessageSimilarity[]
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
  // Sent only to the client whose message was refused, with the reason as payload
  | 'ERROR'

export type WebSocket = WsWebSocket

export const generateUID = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
