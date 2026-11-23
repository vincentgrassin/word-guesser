import websocketPlugin from '@fastify/websocket'
import {
  Game,
  Player,
  RequestMessage,
  SocketRequestParams,
  SocketRequestQuery,
  findGame,
  generateUID,
  hasPlayerLeftGame,
  removeGame,
  isPlayerInGame,
} from '@word-guesser/shared'
import fastify from 'fastify'
import {
  LIMITS,
  broadcast,
  broadcastGame,
  broadcastToOne,
  buildInitialGame,
  canDeleteGame,
  canEndGame,
  canPlayRound,
  findPlayer,
  findPlayerById,
  gameForPlayer,
  isGameExpired,
  parseMessage,
  readText,
  removePlayerFromGame,
  removePlayerFromPlayers,
  updateGameStartTime,
  updateGameStatus,
  updateGameStatusTo,
  addPlayerToGame,
  updateRounds,
  updatePlayer,
  cleanPlayer,
} from './helpers.js'

// Largest WebSocket message accepted, in bytes: game messages are a few hundred.
const MAX_MESSAGE_SIZE = 16 * 1024
const CLEANUP_INTERVAL = 60_000

type ServerOptions = {
  maxGames?: number
}

// Each call returns an independent server with its own in-memory state,
// so tests can start from a clean slate.
export function buildServer({ maxGames = LIMITS.maxGames }: ServerOptions = {}) {
  const server = fastify()
  const games: Game[] = []
  const players: Player[] = []
  // Server-side only: when each game (by id) last changed, to drop abandoned ones.
  const lastActivity = new Map<string, number>()

  const touch = (game: Game) => lastActivity.set(game.gameId, Date.now())

  const deleteGame = (gameId: string) => {
    lastActivity.delete(gameId)
    return removeGame(gameId, games)
  }

  const deleteExpiredGames = () => {
    const now = Date.now()
    const expired = games.filter((game) =>
      isGameExpired(game, lastActivity.get(game.gameId) ?? 0, now),
    )
    expired.forEach((game) => broadcast(players, 'DELETE_GAME', deleteGame(game.gameId)))
  }

  const cleanupTimer = setInterval(deleteExpiredGames, CLEANUP_INTERVAL)
  server.addHook('onClose', async () => clearInterval(cleanupTimer))

  server.register(websocketPlugin, { options: { maxPayload: MAX_MESSAGE_SIZE } })

  server.register(async function (fastify) {
    fastify.get(
      '/connect/:userId',
      { websocket: true },
      (socket /* WebSocket */, req /* FastifyRequest */) => {
        const userId = (req.params as SocketRequestParams).userId
        const query = req.query as SocketRequestQuery
        const newPlayer: Player = {
          userId,
          socket,
          userName: readText(query.userName, LIMITS.userNameLength) || userId,
        }
        players.push(newPlayer)
        broadcastToOne(
          newPlayer,
          'LIST_GAMES',
          games.map((game) => gameForPlayer(game, userId)),
        )

        // Tells the sender why its message was ignored; nobody else hears about it.
        const refuse = (reason: string) => {
          console.error(`[ERROR]: Message from ${userId} refused: ${reason}`)
          broadcastToOne(newPlayer, 'ERROR', reason)
        }

        const handleMessage = async (message: RequestMessage) => {
          const { event, gameId, content } = message
          const game = findGame(gameId, games)
          switch (event) {
            case 'CREATE_GAME': {
              if (games.length >= maxGames) return refuse('Too many games, try again later')
              const newGame = buildInitialGame(generateUID(), userId, content)
              games.push(newGame)
              touch(newGame)
              broadcastGame(players, event, newGame)
              break
            }
            case 'JOIN_GAME': {
              if (!game) return refuse('Unknown game')
              touch(game)
              addPlayerToGame(game, findPlayerById(userId, players))
              updateGameStatus(game)
              broadcastGame(players, event, game)
              break
            }
            case 'PLAY_ROUND': {
              if (!game) return refuse('Unknown game')
              if (!canPlayRound(game)) return refuse('The game is not being played')
              const word = readText(content, LIMITS.wordLength)
              if (!word) return refuse('Empty word')

              touch(game)
              await updateRounds(game, {
                ...message,
                content: word,
                userId,
                messageId: generateUID(),
              })
              updateGameStatus(game)
              updateGameStartTime(game)
              broadcastGame(players, event, game)
              break
            }
            case 'QUIT_GAME': {
              if (!game) return refuse('Unknown game')
              touch(game)
              removePlayerFromGame(userId, game)
              broadcastGame(players, event, game)
              break
            }
            case 'END_GAME': {
              if (!game) return refuse('Unknown game')
              if (!canEndGame(userId, game, content)) return refuse('Not allowed to end this game')
              touch(game)
              updateGameStatusTo(game, content)
              broadcastGame(players, event, game)
              break
            }
            case 'DELETE_GAME': {
              if (!game) return refuse('Unknown game')
              if (!canDeleteGame(userId, game)) return refuse('Not allowed to delete this game')
              broadcast(players, event, deleteGame(game.gameId))
              break
            }
            case 'UPDATE_PLAYER': {
              const player = findPlayerById(userId, players)
              if (!player || !updatePlayer(content, player)) return refuse('Invalid player settings')
              games.forEach((game) => {
                const playerIndex = game.players.findIndex((p) => p.userId === player.userId)
                if (playerIndex !== -1) {
                  game.players[playerIndex] = cleanPlayer(player)
                  broadcastGame(players, event, game)
                }
              })
              break
            }
          }
        }

        socket.on('message', async (m: Buffer) => {
          const message = parseMessage(m)
          if (!message) return refuse('Malformed message')
          // A failure while handling one message must never take the server down.
          try {
            await handleMessage(message)
          } catch (error) {
            console.error(`[ERROR]: Failed to handle ${message.event} from ${userId}`, error)
          }
        })

        // Clean up on disconnect
        socket.on('close', () => {
          const disconnectedPlayer = findPlayer(socket, players)

          if (!disconnectedPlayer) return
          const disconnectedUserId = disconnectedPlayer.userId
          removePlayerFromPlayers(disconnectedPlayer, players)
          const remainingConnections = findPlayerById(disconnectedUserId, players)
          if (!remainingConnections) {
            games.forEach((game) => {
              const isInGame = isPlayerInGame(disconnectedUserId, game)
              if (isInGame) {
                const hasLeftGame = hasPlayerLeftGame(disconnectedUserId, game)
                if (hasLeftGame) {
                  removePlayerFromGame(disconnectedUserId, game)
                }
                broadcastGame(players, 'CLOSE_CONNECTION', game)
              }
            })
          }
        })

        socket.on('error', (error: Error) => {
          console.error(`[ERROR]: WebSocket error for ${userId}`, error)
        })
      },
    )
  })

  return server
}
