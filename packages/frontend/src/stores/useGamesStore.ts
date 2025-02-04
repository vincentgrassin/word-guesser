import type { Game, Message, MessageResponse } from '@word-guesser/shared'
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
        const { event, payload }: MessageResponse = JSON.parse(e.data)
        switch (event) {
          case 'LIST_GAMES': {
            state.games = payload as Game[]
            break
          }
          case 'CREATE_GAME':
            state.games.push(payload as Game)
            break
          case 'JOIN_GAME':
          case 'PLAY_ROUND':
          case 'CLOSE_CONNECTION':
          case 'QUIT_GAME':
            const game = payload as Game
            const idx = state.games.findIndex((g) => g.gameId === game.gameId)
            if (idx !== -1) state.games.splice(idx, 1, game)
            else state.games.push(game)
            break
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

  const message = (message: Omit<Message, 'date' | 'userId'>) => {
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
    setUserId,
    playRound,
  }
})
