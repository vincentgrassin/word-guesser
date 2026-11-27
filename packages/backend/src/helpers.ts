import {
  Game,
  GameProperties,
  GameStatus,
  gameStatuses,
  isPlayerInGame,
  User,
  Player,
  RequestMessage,
  ResponseMessage,
  SocketEvent,
  WebSocket,
  Round,
  MessageSimilarity,
  BotLevel,
  botLevels,
  generateUID,
} from '@word-guesser/shared'
import { getSemanticScore } from './semantic.js'

export const WebSocketState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const

// Everything a client sends is untrusted: these limits bound what it can choose.
export const LIMITS = {
  maxPlayers: { min: 2, max: 8 },
  duration: { min: 60_000, max: 30 * 60_000 },
  gameNameLength: 40,
  userNameLength: 30,
  wordLength: 50,
  maxGames: 100,
} as const

// How long a game is kept without any activity, in milliseconds.
export const GAME_EXPIRY = {
  finished: 10 * 60_000,
  inactive: 30 * 60_000,
} as const

// The IP address rate limits are keyed on. In production the backend is only
// reachable through Caddy, which replaces any X-Forwarded-For sent by the client
// with the real client address: the last entry is therefore trustworthy.
export const clientAddress = (
  forwardedFor: string | string[] | undefined,
  socketAddress: string | undefined,
): string => {
  const header = Array.isArray(forwardedFor) ? forwardedFor.join(',') : forwardedFor
  const lastHop = header?.split(',').pop()?.trim()
  return lastHop || socketAddress || 'unknown'
}

// The clock starts when the first round is complete (see updateGameStartTime).
export const isOutOfTime = (game: Game, now: number) => {
  const { status, startedAt, duration } = game.settings
  return status === 'started' && startedAt !== undefined && now >= startedAt + duration
}

export const isGameExpired = (game: Game, lastActivityAt: number, now: number) => {
  const isFinished = game.settings.status === 'win' || game.settings.status === 'loss'
  const maxIdle = isFinished ? GAME_EXPIRY.finished : GAME_EXPIRY.inactive
  return now - lastActivityAt > maxIdle
}

const DEFAULT_GAME_PROPERTIES = { type: 'basic', maxPlayers: 2, duration: 2 * 60_000 } as const

// END_GAME is not here: only the server ends a game (win or time out).
const CLIENT_EVENTS = new Set<SocketEvent>([
  'CREATE_GAME',
  'JOIN_GAME',
  'PLAY_ROUND',
  'QUIT_GAME',
  'DELETE_GAME',
  'UPDATE_PLAYER',
])

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === 'string'

// Trimmed and shortened text, or '' when the value is not a string.
export const readText = (value: unknown, maxLength: number): string =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''

const readInteger = (value: unknown, fallback: number, range: { min: number; max: number }) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(range.max, Math.max(range.min, Math.round(value)))
    : fallback

// The message, or undefined when it is not a well-formed client message.
export const parseMessage = (m: Buffer): RequestMessage | undefined => {
  const data = parseJson(m.toString())
  if (!isRecord(data)) return undefined

  const { event, gameId, content, date } = data
  if (typeof event !== 'string' || !CLIENT_EVENTS.has(event as SocketEvent)) return undefined
  if (!isOptionalString(gameId) || !isOptionalString(content)) return undefined
  if (typeof date !== 'number') return undefined

  return { event: event as SocketEvent, gameId, content, date }
}

export const updatePlayerInGames = (games: Game[], player: Player) => {
  games.forEach((game) => {
    const playerIndex = game.players.findIndex((p) => p.userId === player.userId)
    if (playerIndex !== -1) {
      game.players[playerIndex] = cleanPlayer(player)
    }
  })
}

export const addPlayerToGame = (game: Game, player: Player | undefined) => {
  if (!player) return
  if (game.players.length === game.settings.maxPlayers) return

  const hasAlreadyPlayer = game.players.some((p) => p.userId === player.userId)
  if (hasAlreadyPlayer) return

  const cleanedPlayer = cleanPlayer(player)
  game.players.push(cleanedPlayer)
}

// Only the name can change: the id and the socket belong to the connection.
// Returns undefined when the settings are invalid.
export const updatePlayer = (rawPlayerSettings: string | undefined, player: Player) => {
  if (!rawPlayerSettings) return
  const playerSettings = parseJson(rawPlayerSettings)
  if (!isRecord(playerSettings)) return

  const userName = readText(playerSettings.userName, LIMITS.userNameLength)
  if (!userName) return

  player.userName = userName
  return player
}

export const updateRounds = async (game: Game, message: ResponseMessage) => {
  const rounds = [...game.rounds]

  if (!game.players) {
    console.error('[ERROR]: Invalid player')
    return rounds
  }
  const isPlayer = game.players.find((p) => p.userId === message.userId)

  if (!isPlayer) {
    console.error('[ERROR]: Message sender is not a recognized player in this game')
    return rounds
  }

  if (rounds.length === 0) {
    rounds.push(createRound(1, message))
  } else {
    const currentRound = rounds[rounds.length - 1]
    const playersNumber = game.settings.maxPlayers

    if (currentRound.messages.length === playersNumber) {
      rounds.push(createRound(currentRound.roundId + 1, message))
    } else {
      updateCurrentRound(currentRound, message, playersNumber)
      if (currentRound.isComplete) {
        currentRound.messagesSimilarity = calculateMessageSimilarities(currentRound)
      }
    }
  }
  game.rounds = rounds
}

const createRound = (roundId: number, message: ResponseMessage): Round => {
  return {
    roundId,
    isComplete: false,
    messages: [message],
    messagesSimilarity: [],
  }
}

const updateCurrentRound = (round: Round, message: ResponseMessage, playersNumber: number) => {
  const playerMessageIndex = round.messages.findIndex((m) => m.userId === message.userId)
  if (playerMessageIndex === -1) {
    round.messages.push(message)
  } else {
    round.messages[playerMessageIndex] = message
  }
  if (round.messages.length === playersNumber) {
    round.isComplete = true
  }
}

// Every pair of messages of the round, each pair once.
const calculateMessageSimilarities = (round: Round): MessageSimilarity[] =>
  round.messages
    .slice(0, -1)
    .flatMap((source, i) => getSemanticScore(source, round.messages.slice(i + 1)))

// A game is played only while the table is full: it waits ('opened') otherwise.
// A finished game stays finished.
export const updateGameStatus = (game: Game) => {
  const { status, maxPlayers } = game.settings
  if (status === 'win' || status === 'loss') return

  game.settings.status = game.players.length === maxPlayers ? 'started' : 'opened'

  const lastRound = game.rounds[game.rounds.length - 1]
  if (lastRound && areAllMessagesEquals(lastRound.messages, maxPlayers)) {
    game.settings.status = 'win'
  }
}

export const updateGameStatusTo = (game: Game, status: string | undefined) => {
  const value = status as GameStatus
  if (!value || !gameStatuses.has(value)) {
    console.error(`Invalid game status: ${status}`)
    return
  }
  game.settings.status = value
}

export const updateGameStartTime = (game: Game) => {
  if (game.rounds.length && game.rounds[0].isComplete && !game.settings.startedAt) {
    game.settings.startedAt = Date.now()
  }
}

export const buildInitialGame = (
  gameId: string,
  userId: string,
  rawProperties: string | undefined,
): Game => {
  const parsed = rawProperties ? parseJson(rawProperties) : undefined
  const input = isRecord(parsed) ? parsed : {}

  const isSolo = input.type === 'solo'

  // Pick each property the creator may choose; status, createdBy... are the server's.
  const gameProperties: GameProperties = {
    type: isSolo ? 'solo' : DEFAULT_GAME_PROPERTIES.type,
    // Solo: the creator and the bot
    maxPlayers: isSolo
      ? 2
      : readInteger(input.maxPlayers, DEFAULT_GAME_PROPERTIES.maxPlayers, LIMITS.maxPlayers),
    duration: readInteger(input.duration, DEFAULT_GAME_PROPERTIES.duration, LIMITS.duration),
    name: readText(input.name, LIMITS.gameNameLength) || gameId,
    ...(isSolo && {
      botLevel: botLevels.has(input.botLevel as BotLevel) ? (input.botLevel as BotLevel) : 'normal',
    }),
  }

  return {
    gameId,
    rounds: [],
    players: [],
    settings: {
      status: 'opened',
      createdBy: userId,
      createdAt: Date.now(),
      ...gameProperties,
    },
  }
}

// The game as one player may see it: the other players' words of the round
// being played stay hidden until everyone has answered.
export const gameForPlayer = (game: Game, userId: string): Game => ({
  ...game,
  rounds: game.rounds.map((round) =>
    round.isComplete
      ? round
      : {
          ...round,
          messages: round.messages.map((m) =>
            m.userId === userId ? m : { ...m, content: undefined },
          ),
        },
  ),
})

export const canPlayRound = (game: Game) => game.settings.status === 'started'

export const canDeleteGame = (userId: string, game: Game) =>
  game.settings.createdBy === userId || isPlayerInGame(userId, game)

export const broadcastToOne = (player: Player, event: SocketEvent, payload: unknown) => {
  player.socket.send(JSON.stringify({ event, payload }))
}

export const broadcast = (players: Player[], event: SocketEvent, payload: unknown) => {
  players.forEach((player) => {
    broadcastToOne(player, event, payload)
  })
}

export const broadcastGame = (players: Player[], event: SocketEvent, game: Game) => {
  players.forEach((player) => {
    broadcastToOne(player, event, gameForPlayer(game, player.userId))
  })
}

export function findPlayerById(userId: string, players: Player[]): Player | undefined {
  for (const player of players) {
    if (player.userId === userId) {
      return player
    }
  }
  return undefined
}

export function findPlayer(socket: WebSocket, players: Player[]): Player | undefined {
  return players.find((p) => p.socket === socket)
}

export function cleanPlayer(player: Player): User {
  const { socket, ...rest } = player
  return rest
}

// The round being played then waits for the player who takes the free seat:
// the leaving player's answer is dropped, and the game pauses until the table is full.
export function removePlayerFromGame(userId: string, game: Game): boolean {
  const players = game.players
  if (!userId) return false
  const index = players.findIndex((p) => p.userId === userId)
  if (index !== -1) {
    players.splice(index, 1)
  }

  const lastRound = game.rounds[game.rounds.length - 1]
  if (lastRound && !lastRound.isComplete) {
    lastRound.messages = lastRound.messages.filter((m) => m.userId !== userId)
  }
  updateGameStatus(game)
  return true
}

export function removePlayerFromPlayers(player: Player, players: Player[]): boolean {
  if (!player) return false

  const index = players.findIndex((p) => p.socket === player.socket)
  if (index !== -1) {
    players.splice(index, 1)
  }

  return true
}

export function areAllMessagesEquals(messages: ResponseMessage[], playersNumber: number) {
  if (messages.length === 0) return false
  if (messages.length !== playersNumber) return false

  const firstMessage = messages[0].content
  return messages.every((item) => item.content === firstMessage)
}

// The bot seat of a Solo game: the server plays for it (see bot moves in server.ts).
export const buildBot = (level: BotLevel): User => ({
  userId: `bot-${generateUID()}`,
  userName: `Bot (${level})`,
  isBot: true,
})
