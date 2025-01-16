import { reactive } from 'vue'

export const useSocket = (id: number) => {
  const state = reactive({
    connected: false,
    messages: [] as string[],
    socket: null as WebSocket | null,
    gameId: id, // Store the game ID
  })

  const connect = () => {
    const wsUrl = `${import.meta.env.VITE_WEB_SOCKET_URL}/game/${id}`
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
      state.socket = new WebSocket(wsUrl)

      state.socket.onopen = () => {
        console.log(`Connected to WebSocket game ${id}`)
        state.connected = true
      }

      state.socket.onmessage = (event) => {
        console.log(`Message received in game ${id}:`, event.data)
        state.messages.push(event.data)
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
      state.socket.send(JSON.stringify({ message, userId }))
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
