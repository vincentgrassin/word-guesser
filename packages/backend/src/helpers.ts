import {
  Game,
  GameProperties,
  GameStatus,
  gameStatuses,
  GameType,
  PlainPlayer,
  Player,
  RequestMessage,
  ResponseMessage,
  SocketEvent,
  WebSocket,
} from '@word-guesser/shared'

export const WebSocketState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const

export const parseMessage = (m: Buffer): RequestMessage => {
  const rawMessage = m.toString()

  return JSON.parse(rawMessage, (key, value) => {
    if (key === 'date' && typeof value === 'string') {
      const parsedDate = new Date(value)
      return isNaN(parsedDate.getTime()) ? value : parsedDate
    }
    return value
  })
}

export const updatePlayers = (game: Game, player: Player | undefined) => {
  if (!player) return
  if (game.players.length === game.settings.maxPlayers) return

  const hasAlreadyPlayer = game.players.some((p) => p.userId === player.userId)
  if (hasAlreadyPlayer) return

  const cleanedPlayer = cleanPlayer(player)
  game.players.push(cleanedPlayer)
}

export const updateRounds = (game: Game, message: ResponseMessage) => {
  const rounds = [...game.rounds]

  if (!game.players) {
    console.error('Invalid player')
    return rounds
  }
  const isPlayer = game.players.find((p) => p.userId === message.userId)

  if (!isPlayer) {
    console.error('Message sender is not a recognized player in this game')
    return rounds
  }

  if (rounds.length === 0) {
    // No rounds exist, create the first round
    rounds.push({
      roundId: 1,
      isComplete: false,
      messages: [message],
    })
  } else {
    const currentRound = rounds[rounds.length - 1]
    const playersNumber = game.settings.maxPlayers
    if (currentRound.messages.length === playersNumber) {
      // All players have sent messages, start a new round
      rounds.push({
        roundId: currentRound.roundId + 1,
        isComplete: false,
        messages: [message],
      })
    } else {
      // There's an ongoing round, update the appropriate player
      const playerMessageIndex = currentRound.messages.findIndex((m) => m.userId === message.userId)
      if (playerMessageIndex === -1) {
        currentRound.messages.push(message)
      } else {
        currentRound.messages[playerMessageIndex] = message
      }
      if (currentRound.messages.length === playersNumber) {
        currentRound.isComplete = true
      }
    }
  }
  game.rounds = rounds
}

export const updateGameStatus = (game: Game) => {
  const playersNumber = game.settings.maxPlayers

  if (game.players.length === playersNumber) {
    game.settings.status = 'started'
  }

  if (game.rounds.length) {
    const lastRound = game.rounds[game.rounds.length - 1]
    const hasWin = areAllMessagesEquals(lastRound.messages, playersNumber)
    game.settings.status = hasWin ? 'win' : game.settings.status
  }
}

export const updateGameStatusTo = (game: Game, status: string | undefined) => {
  const value = status as GameStatus
  if (!value || !gameStatuses.has(value)) {
    console.error(`Invalid game status: ${status}`)
  }
  game.settings.status = value
}

export const updateGameStartTime = (game: Game) => {
  if (game.rounds.length && game.rounds[0].isComplete) {
    game.settings.startedAt = Date.now()
  }
}

export const buildInitialGame = (
  gameId: string,
  userId: string,
  rawProperties: string | undefined,
): Game => {
  const gameProperties: GameProperties = rawProperties
    ? JSON.parse(rawProperties)
    : { type: 'basic', maxPlayers: 2, duration: 2 }

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

export const broadcastToOne = (player: Player, event: SocketEvent, payload: unknown) => {
  player.socket.send(JSON.stringify({ event, payload }))
}

export const broadcast = (players: Player[], event: SocketEvent, payload: unknown) => {
  players.forEach((player) => {
    broadcastToOne(player, event, payload)
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

export function cleanPlayer(player: Player): PlainPlayer {
  const { socket, ...rest } = player
  return rest
}

export function removePlayerFromGame(userId: string, game: Game): boolean {
  const players = game.players
  if (!userId) return false
  const index = players.findIndex((p) => p.userId === userId)
  if (index !== -1) {
    players.splice(index, 1)
  }
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

export function isPlayerInGame(userId: string, game: Game): boolean {
  return game.players.some((p) => p.userId === userId)
}

export function areAllMessagesEquals(messages: ResponseMessage[], playersNumber: number) {
  if (messages.length === 0) return false
  if (messages.length !== playersNumber) return false

  const firstMessage = messages[0].content
  return messages.every((item) => item.content === firstMessage)
}
