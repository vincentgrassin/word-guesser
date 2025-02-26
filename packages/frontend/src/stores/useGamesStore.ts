import {
  removeGame,
  syncGame,
  type Game,
  type GameProperties,
  type GameStatus,
  type PlayerSettings,
  type RequestMessage,
  type SocketPayload,
  type User,
} from '@word-guesser/shared'
import { defineStore } from 'pinia'
import { reactive } from 'vue'

type GamesState = {
  games: Game[]
  socket: WebSocket | null
  user: User
}

export const useGamesStore = defineStore('games', () => {
  const state: GamesState = reactive({
    games: [],
    socket: null as WebSocket | null,
    user: {
      userId: '',
      userName: '',
    },
  })

  const connect = (userId: string, userName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const wsUrl = `${import.meta.env.VITE_WEB_SOCKET_URL}/connect/${userId}?userName=${userName}`
      if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
        state.socket = new WebSocket(wsUrl)

        state.socket.onopen = () => {
          console.info(`[INFO]: Connected to socket with`, userId)
          resolve()
        }

        state.socket.onmessage = (e) => {
          const { event, payload }: SocketPayload = JSON.parse(e.data)
          switch (event) {
            case 'LIST_GAMES': {
              state.games = payload as Game[]
              break
            }
            case 'CREATE_GAME':
            case 'JOIN_GAME':
            case 'PLAY_ROUND':
            case 'CLOSE_CONNECTION':
            case 'QUIT_GAME':
            case 'UPDATE_PLAYER':
            case 'END_GAME': {
              const game = payload as Game
              if (game) {
                syncGame(game, state.games)
              }
              break
            }
            case 'DELETE_GAME': {
              const gameId = payload as string | false
              if (gameId) {
                removeGame(gameId, state.games)
              }
              break
            }
          }
        }

        state.socket.onclose = () => {
          console.info(`[INFO]: WebSocket connection closed for`, userId)
        }

        state.socket.onerror = (error) => {
          console.error(`[ERROR]: WebSocket error for ${userId}`, error)
          reject(error)
        }
      } else {
        resolve()
      }
    })
  }

  const setUserId = (id: string) => {
    state.user.userId = id
    localStorage.setItem('userId', id)
  }

  const setUserName = (name: string) => {
    state.user.userName = name
    localStorage.setItem('userName', name)
  }

  const message = (message: Omit<RequestMessage, 'date'>) => {
    const { event, content, gameId } = message

    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      state.socket.send(JSON.stringify({ content, date: Date.now(), event, gameId }))
    } else {
      console.error(
        `[ERROR]: WebSocket is not open for game ${state.user.userId}. Cannot send message.`,
      )
    }
  }

  const createGame = (gameProperties: GameProperties) => {
    message({ event: 'CREATE_GAME', content: JSON.stringify(gameProperties) })
  }

  const joinGame = (gameId: string) => {
    message({ gameId, event: 'JOIN_GAME' })
  }

  const endGame = (gameId: string, status: GameStatus) => {
    message({ gameId, event: 'END_GAME', content: status })
  }

  const deleteGame = (gameId: string) => {
    message({ gameId, event: 'DELETE_GAME' })
  }

  const quitGame = (gameId: string) => {
    message({ gameId, event: 'QUIT_GAME' })
  }

  const playRound = (gameId: string, content: string) => {
    message({ gameId, event: 'PLAY_ROUND', content })
  }

  const updatePlayerSettings = (settings: PlayerSettings) => {
    message({ event: 'UPDATE_PLAYER', content: JSON.stringify(settings) })
  }

  const disconnect = () => {
    if (state.socket) {
      state.socket.close()
    }
  }

  return {
    connect,
    message,
    disconnect,
    state,
    createGame,
    joinGame,
    quitGame,
    deleteGame,
    playRound,
    endGame,
    updatePlayerSettings,
    setUserId,
    setUserName,
  }
})
