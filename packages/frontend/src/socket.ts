import { reactive } from 'vue'

export const state = reactive({
  connected: false,
  messages: [] as string[],
  socket: null as WebSocket | null,
})

const wsUrl = 'ws://localhost:3000/chat/123456'

export const connect = () => {
  if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
    state.socket = new WebSocket(wsUrl)

    state.socket.onopen = () => {
      console.log('Connected to WebSocket')
      state.connected = true
    }

    state.socket.onmessage = (event) => {
      console.log('Message received:', event.data)
      state.messages.push(event.data)
    }

    state.socket.onclose = () => {
      console.log('WebSocket connection closed')
      state.connected = false
      state.socket = null // Clear the socket reference when closed
    }

    state.socket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }
}

export const message = (message: string) => {
  if (state.socket && state.socket.readyState === WebSocket.OPEN) {
    state.socket.send(message)
    state.messages.push(message)
  } else {
    console.error('WebSocket is not open. Cannot send message.')
  }
}

export const disconnect = () => {
  if (state.socket) {
    state.socket.close()
    state.socket = null
    state.connected = false
  }
}
