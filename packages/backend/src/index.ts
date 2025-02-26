import websocketPlugin from '@fastify/websocket'
import {
  Game,
  Player,
  SocketRequestParams,
  SocketRequestQuery,
  findGame,
  generateUID,
  hasPlayerLeftGame,
  removeGame,
  isPlayerInGame,
} from '@word-guesser/shared'
import dotenv from 'dotenv'
import fastify from 'fastify'
import {
  broadcast,
  broadcastToOne,
  buildInitialGame,
  findPlayer,
  findPlayerById,
  parseMessage,
  removePlayerFromGame,
  removePlayerFromPlayers,
  updateGameStartTime,
  updateGameStatus,
  updateGameStatusTo,
  addPlayerToGame,
  updateRounds,
  updatePlayer,
  updatePlayerInGames,
  cleanPlayer,
} from './helpers.js'

const server = fastify()
dotenv.config()

const games: Game[] = []
let players: Player[] = []

console.info('[INFO]: Starting server')
server.register(websocketPlugin)

server.register(async function (fastify) {
  fastify.get(
    '/connect/:userId',
    { websocket: true },
    (socket /* WebSocket */, req /* FastifyRequest */) => {
      const userId = (req.params as SocketRequestParams).userId
      const newPlayer = {
        userId,
        socket,
        userName: (req.query as SocketRequestQuery).userName,
      }
      players.push(newPlayer)
      broadcastToOne(newPlayer, 'LIST_GAMES', games)

      socket.on('message', (m: Buffer) => {
        const message = parseMessage(m)
        const { event, gameId, content } = message
        const game = findGame(gameId, games)
        switch (event) {
          case 'CREATE_GAME': {
            const uid = generateUID()
            const newGame = buildInitialGame(uid, userId || '', message.content)
            games.push(newGame)
            broadcast(players, event, newGame)
            break
          }
          case 'JOIN_GAME': {
            if (userId && gameId) {
              const player = findPlayerById(userId, players)
              if (game) {
                addPlayerToGame(game, player)
                updateGameStatus(game)
              }
              broadcast(players, event, game)
            }
            break
          }
          case 'PLAY_ROUND': {
            if (userId && gameId) {
              if (game) {
                const responseMessage = {
                  ...message,
                  userId,
                }
                updateRounds(game, responseMessage)
                updateGameStatus(game)
                updateGameStartTime(game)
                broadcast(players, event, game)
              }
            }
            break
          }
          case 'QUIT_GAME': {
            if (game) {
              removePlayerFromGame(userId, game)
              broadcast(players, event, game)
            }
            break
          }
          case 'END_GAME': {
            if (game) {
              updateGameStatusTo(game, content)
              broadcast(players, event, game)
            }
            break
          }
          case 'DELETE_GAME': {
            if (gameId) {
              const deletedGameId = removeGame(gameId, games)
              broadcast(players, event, deletedGameId)
            }
            break
          }
          case 'UPDATE_PLAYER': {
            const player = findPlayerById(userId, players)
            if (player) {
              updatePlayer(content, player)
              games.forEach((game) => {
                const playerIndex = game.players.findIndex((p) => p.userId === player.userId)
                if (playerIndex !== -1) {
                  game.players[playerIndex] = cleanPlayer(player)
                  broadcast(players, event, game)
                }
              })
            }

            if (gameId) {
              const deletedGameId = removeGame(gameId, games)
              broadcast(players, event, deletedGameId)
            }
            break
          }
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
              broadcast(players, 'CLOSE_CONNECTION', game)
            }
          })
        }
      })

      socket.on('error', (error: Error) => {
        //TODO: handle errors
      })
    },
  )
})

server.listen({ port: parseInt(process.env.PORT!), host: process.env.HOST }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.info(`[INFO]: Server listening at ${address}`)
})
