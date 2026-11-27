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
  isSingleWord,
} from '@word-guesser/shared'
import fastify from 'fastify'
import { createHash, timingSafeEqual } from 'node:crypto'
import {
  LIMITS,
  broadcast,
  broadcastGame,
  broadcastToOne,
  buildInitialGame,
  canDeleteGame,
  canPlayRound,
  clientAddress,
  findPlayer,
  findPlayerById,
  gameForPlayer,
  isGameExpired,
  isOutOfTime,
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
import { loadState, saveState } from './persistence.js'
import { createTokenBucket, RateLimit, TokenBucket } from './rateLimit.js'
import { isSemanticOn } from './semantic.js'

// Largest WebSocket message accepted, in bytes: game messages are a few hundred.
const MAX_MESSAGE_SIZE = 16 * 1024
const CLEANUP_INTERVAL = 60_000
// How often the server checks whether a game ran out of time
const CLOCK_INTERVAL = 1000
// A client whose messages keep being refused for going too fast is disconnected
const MAX_REFUSED_MESSAGES = 20
// WebSocket close code for "policy violation"
const POLICY_VIOLATION = 1008
// The browser generates 32 hex characters; anything much shorter is guessable
const TOKEN_LENGTH = { min: 16, max: 128 }

// Only a hash of each token is kept, so a leak of the server state reveals no token.
const hashToken = (token: string) => createHash('sha256').update(token).digest()

type LimitOptions = {
  maxGames?: number
  // Games still being played (opened or started) created from one IP address
  maxOpenGamesPerAddress?: number
  // WebSocket connections open at the same time from one IP address
  maxConnectionsPerAddress?: number
  // Messages one connection may send
  messageRate?: RateLimit
  // Connections one IP address may open
  connectionRate?: RateLimit
}

const DEFAULT_LIMITS: Required<LimitOptions> = {
  maxGames: LIMITS.maxGames,
  maxOpenGamesPerAddress: 3,
  maxConnectionsPerAddress: 10,
  messageRate: { perSecond: 10, burst: 20 },
  connectionRate: { perSecond: 20 / 60, burst: 20 },
}

type ServerOptions = LimitOptions & {
  // Where the state is saved, so games survive a restart. Nothing is saved without it.
  stateFile?: string
}

// Each call returns an independent server with its own in-memory state,
// so tests can start from a clean slate.
export function buildServer({ stateFile, ...limits }: ServerOptions = {}) {
  const options = { ...DEFAULT_LIMITS, ...limits }
  const server = fastify()
  const saved = stateFile ? loadState(stateFile) : undefined
  const games: Game[] = saved?.games ?? []
  const players: Player[] = []

  // Server-side only, never sent to clients (keyed by game id or IP address):
  const lastActivity = new Map<string, number>(saved?.lastActivity) // when each game last changed
  const creatorAddress = new Map<string, string>(saved?.creatorAddress) // which address created each game
  const connectionsPerAddress = new Map<string, number>()
  const connectionBuckets = new Map<string, TokenBucket>()
  const tokenHashes = new Map<string, Buffer>( // which token owns each user id
    saved?.tokenHashes.map(([userId, hash]) => [userId, Buffer.from(hash, 'hex')]),
  )
  // While the server stops, closing connections must not change the games being saved
  let isShuttingDown = false

  const save = () => {
    if (!stateFile) return
    try {
      saveState(stateFile, {
        games,
        lastActivity: [...lastActivity],
        creatorAddress: [...creatorAddress],
        tokenHashes: [...tokenHashes].map(([userId, hash]) => [userId, hash.toString('hex')]),
      })
    } catch (error) {
      console.error(`[ERROR]: Failed to save the state to ${stateFile}`, error)
    }
  }

  // Returns the reason to refuse this identity, if any. The first connection
  // of a user id reserves it for its token.
  const refuseIdentityReason = (userId: string, token: unknown): string | undefined => {
    if (typeof token !== 'string' || token.length < TOKEN_LENGTH.min || token.length > TOKEN_LENGTH.max) {
      return 'Missing or invalid token'
    }
    const hash = hashToken(token)
    const owner = tokenHashes.get(userId)
    if (owner && !timingSafeEqual(owner, hash)) return 'This user id belongs to someone else'
    tokenHashes.set(userId, hash)
  }

  // An id with no open connection and no seat in a game can be taken again.
  const forgetUnusedIdentities = () => {
    tokenHashes.forEach((_, userId) => {
      const isConnected = players.some((p) => p.userId === userId)
      const hasSeat = games.some((game) => isPlayerInGame(userId, game))
      if (!isConnected && !hasSeat) tokenHashes.delete(userId)
    })
  }

  const touch = (game: Game) => lastActivity.set(game.gameId, Date.now())

  const deleteGame = (gameId: string) => {
    lastActivity.delete(gameId)
    creatorAddress.delete(gameId)
    return removeGame(gameId, games)
  }

  const openGamesCreatedFrom = (address: string) =>
    games.filter(
      (game) =>
        creatorAddress.get(game.gameId) === address &&
        (game.settings.status === 'opened' || game.settings.status === 'started'),
    ).length

  // The server alone decides when time is up: clients only display the timer.
  const endGamesOutOfTime = () => {
    const now = Date.now()
    games
      .filter((game) => isOutOfTime(game, now))
      .forEach((game) => {
        updateGameStatusTo(game, 'loss')
        touch(game)
        broadcastGame(players, 'END_GAME', game)
      })
  }

  const deleteExpiredGames = () => {
    const now = Date.now()
    const expired = games.filter((game) =>
      isGameExpired(game, lastActivity.get(game.gameId) ?? 0, now),
    )
    expired.forEach((game) => broadcast(players, 'DELETE_GAME', deleteGame(game.gameId)))
  }

  // A full bucket with no open connection carries no information: drop it.
  const forgetIdleAddresses = () => {
    connectionBuckets.forEach((bucket, address) => {
      if (bucket.isFull() && !connectionsPerAddress.has(address)) {
        connectionBuckets.delete(address)
      }
    })
  }

  const clockTimer = setInterval(endGamesOutOfTime, CLOCK_INTERVAL)
  const cleanupTimer = setInterval(() => {
    deleteExpiredGames()
    forgetIdleAddresses()
    forgetUnusedIdentities()
    save()
  }, CLEANUP_INTERVAL)

  // Added before the WebSocket plugin, so it runs before the plugin closes the connections
  server.addHook('preClose', async () => {
    isShuttingDown = true
  })
  server.addHook('onClose', async () => {
    clearInterval(clockTimer)
    clearInterval(cleanupTimer)
    save()
  })

  // Returns the reason to refuse a new connection from this address, if any.
  const refuseConnectionReason = (address: string): string | undefined => {
    const bucket = connectionBuckets.get(address) ?? createTokenBucket(options.connectionRate)
    connectionBuckets.set(address, bucket)
    if (!bucket.take()) return 'Too many connections, try again later'
    if ((connectionsPerAddress.get(address) ?? 0) >= options.maxConnectionsPerAddress) {
      return 'Too many open connections'
    }
  }

  const releaseConnection = (address: string) => {
    const remaining = (connectionsPerAddress.get(address) ?? 1) - 1
    if (remaining > 0) connectionsPerAddress.set(address, remaining)
    else connectionsPerAddress.delete(address)
  }

  // Polled by Docker (docker-compose.prod.yml). Not reachable from outside:
  // Caddy only forwards /connect/* to the backend.
  // semantic: 'off' means the word vectors could not be loaded (see the startup logs)
  server.get('/health', async () => ({ status: 'ok', semantic: isSemanticOn() ? 'on' : 'off' }))

  server.register(websocketPlugin, { options: { maxPayload: MAX_MESSAGE_SIZE } })

  server.register(async function (fastify) {
    fastify.get(
      '/connect/:userId',
      { websocket: true },
      (socket /* WebSocket */, req /* FastifyRequest */) => {
        const address = clientAddress(
          req.headers['x-forwarded-for'],
          req.raw.socket?.remoteAddress,
        )
        const connectionRefused = refuseConnectionReason(address)
        if (connectionRefused) {
          console.error(`[ERROR]: Connection from ${address} refused: ${connectionRefused}`)
          socket.close(POLICY_VIOLATION, connectionRefused)
          return
        }
        const userId = (req.params as SocketRequestParams).userId
        const query = req.query as SocketRequestQuery
        const identityRefused = refuseIdentityReason(userId, query.token)
        if (identityRefused) {
          console.error(`[ERROR]: Connection as ${userId} refused: ${identityRefused}`)
          socket.close(POLICY_VIOLATION, identityRefused)
          return
        }
        connectionsPerAddress.set(address, (connectionsPerAddress.get(address) ?? 0) + 1)

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

        const messageBucket = createTokenBucket(options.messageRate)
        let refusedForSpeed = 0

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
              if (games.length >= options.maxGames) return refuse('Too many games, try again later')
              if (openGamesCreatedFrom(address) >= options.maxOpenGamesPerAddress) {
                return refuse('Too many open games created from your address')
              }
              const newGame = buildInitialGame(generateUID(), userId, content)
              games.push(newGame)
              creatorAddress.set(newGame.gameId, address)
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
              // The clock may not have ended the game yet: it only checks every second
              if (isOutOfTime(game, Date.now())) return refuse('Time is up')
              const word = readText(content, LIMITS.wordLength)
              if (!word) return refuse('Empty word')
              if (!isSingleWord(word)) return refuse('One word only')

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
          if (!messageBucket.take()) {
            refusedForSpeed += 1
            if (refusedForSpeed >= MAX_REFUSED_MESSAGES) {
              socket.close(POLICY_VIOLATION, 'Too many messages')
              return
            }
            return refuse('Too many messages, slow down')
          }

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
          releaseConnection(address)
          if (isShuttingDown) return
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
