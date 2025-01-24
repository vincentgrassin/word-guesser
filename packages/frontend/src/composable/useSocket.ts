import { inject, reactive } from 'vue'

type Message = {
  userId: string
  message: string
  date: Date
}
type Round = {
  roundId: number
  player1: Message | undefined
  player2: Message | undefined
  status: 'win' | 'ongoing'
}

type GameSettings = {
  status: 'win' | 'ongoing'
  players: string[]
}

type Game = {
  gameId: string
  messages: Message[]
  settings: GameSettings
  rounds: Round[]
}

type GameState = {
  connected: boolean
  game: Game | undefined
  socket: WebSocket | null
  gameId: string
}
export const useSocket = (id: string) => {
  const userId = inject('userId')

  const state: GameState = reactive({
    connected: false,
    game: undefined,
    socket: null as WebSocket | null,
    gameId: id, // Store the game ID
  })

  const connect = () => {
    const wsUrl = `${import.meta.env.VITE_WEB_SOCKET_URL}/game/${id}?userId=${userId}`
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
      state.socket = new WebSocket(wsUrl)

      state.socket.onopen = () => {
        console.log(`Connected to WebSocket game ${id}`)
        state.connected = true
      }

      state.socket.onmessage = (event) => {
        console.log(`Message received in game ${id}:`, typeof event.data)
        const parsedMessage = JSON.parse(event.data)
        state.game = parsedMessage
      }

      state.socket.onclose = () => {
        console.log(`WebSocket connection closed for game ${id}`)
        state.connected = false
        state.socket = null
      }

      state.socket.onerror = (error) => {
        console.error(`WebSocket error in game ${id}:`, error)
      }
    }
  }

  const message = (message: string, userId: string) => {
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      state.socket.send(JSON.stringify({ message, userId, date: new Date() }))
    } else {
      console.error(`WebSocket is not open for game ${id}. Cannot send message.`)
    }
  }

  const disconnect = () => {
    if (state.socket) {
      state.socket.close()
      state.socket = null
      state.connected = false
    }
  }

  return {
    connect,
    message,
    disconnect,
    state,
  }
}
