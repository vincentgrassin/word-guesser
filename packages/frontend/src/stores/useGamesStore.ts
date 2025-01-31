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
        console.log(`Connected to socket with`, userId)
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
            const game = payload as Game
            const idx = state.games.findIndex((g) => g.gameId === game.gameId)
            if (idx !== -1) state.games.splice(idx, 1, game)
            else state.games.push(game)
            break
        }
      }

      state.socket.onclose = () => {
        console.log(`WebSocket connection closed for`, userId)
      }

      state.socket.onerror = (error) => {
        console.error(`WebSocket error for ${userId}`, error)
      }
    }
  }

  const createGame = (userId: string) => {
    message({ userId, event: 'CREATE_GAME' })
  }

  const joinGame = (gameId: string, userId: string) => {
    message({ gameId, userId, event: 'JOIN_GAME' })
  }

  const message = (message: Omit<Message, 'date'>) => {
    const { event, content, gameId, userId } = message
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      state.socket.send(JSON.stringify({ content, userId, date: new Date(), event, gameId }))
    } else {
      console.error(`WebSocket is not open for game ${userId}. Cannot send message.`)
    }
  }

  const disconnect = () => {
    if (state.socket) {
      state.socket.close()
    }
  }

  return { connect, message, disconnect, state, createGame, joinGame, setUserId }
})
