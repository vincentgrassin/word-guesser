import {
  type Game,
  type SocketPayload,
  type RequestMessage,
  removeGame,
  syncGame,
} from '@word-guesser/shared'
import { defineStore } from 'pinia'
import { reactive } from 'vue'

type GamesState = {
  games: Game[]
  socket: WebSocket | null
  userId: string
  activeGame: Game | null
}

export const useGamesStore = defineStore('games', () => {
  const state: GamesState = reactive({
    games: [],
    socket: null as WebSocket | null,
    userId: '',
    activeGame: null,
  })

  const setUserId = (uid: string) => {
    state.userId = uid
    localStorage.setItem('userId', uid)
  }

  const connect = (userId: string) => {
    const wsUrl = `${import.meta.env.VITE_WEB_SOCKET_URL}/connect/${userId}`
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
      state.socket = new WebSocket(wsUrl)

      state.socket.onopen = () => {
        console.info(`[INFO]: Connected to socket with`, userId)
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
            const game = payload as Game
            syncGame(game, state.games)
            break
          case 'DELETE_GAME':
            const gameId = payload as string | false
            if (gameId) {
              removeGame(gameId, state.games)
            }
        }
      }

      state.socket.onclose = () => {
        console.info(`[INFO]: WebSocket connection closed for`, userId)
      }

      state.socket.onerror = (error) => {
        console.error(`[ERROR]: WebSocket error for ${userId}`, error)
      }
    }
  }

  const message = (message: Omit<RequestMessage, 'date'>) => {
    const { event, content, gameId } = message

    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      state.socket.send(JSON.stringify({ content, date: new Date(), event, gameId }))
    } else {
      console.error(`[ERROR]: WebSocket is not open for game ${state.userId}. Cannot send message.`)
    }
  }

  const createGame = () => {
    message({ event: 'CREATE_GAME' })
  }

  const joinGame = (gameId: string) => {
    message({ gameId, event: 'JOIN_GAME' })
  }

  const deleteGameRequest = (gameId: string) => {
    message({ gameId, event: 'DELETE_GAME' })
  }

  const quitGame = (gameId: string) => {
    message({ gameId, event: 'QUIT_GAME' })
  }

  const playRound = (gameId: string, content: string) => {
    message({ gameId, event: 'PLAY_ROUND', content })
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
    deleteGameRequest,
    setUserId,
    playRound,
  }
})
