import type { EVENT, Game, MessageResponse } from '@/utils/types'
import { reactive } from 'vue'

type GamesState = {
  games: Game[]
  socket: WebSocket | null
}

export const useGamesSocket = (userId: string) => {
  const state: GamesState = reactive({
    games: [],
    socket: null as WebSocket | null,
  })

  const connect = () => {
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
            state.games = payload as unknown as Game[]
            break
          }
          case 'CREATE_GAME':
            state.games.push(payload as unknown as Game)
            break
        }
      }

      state.socket.onclose = () => {
        console.log(`WebSocket connection closed for`, userId)
      }

      state.socket.onerror = (error) => {
        console.error(`WebSocket error in gam`, error)
      }
    }
  }

  const createGame = () => {
    message(null, userId, 'CREATE_GAME')
  }

  const message = (message: string, userId: string, event: EVENT) => {
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      state.socket.send(JSON.stringify({ message, userId, date: new Date(), event }))
    } else {
      console.error(`WebSocket is not open for game ${userId}. Cannot send message.`)
    }
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
  }
}
