<script lang="ts">
import { connect, disconnect, message, state } from '@/socket'
import { ref } from 'vue'

export default {
  name: 'ConnectionManager',
  setup() {
    const newMessage = ref('')
    const sendMessage = () => {
      if (newMessage.value) {
        message(newMessage.value) // Call the message function from socket.ts
        newMessage.value = '' // Clear the input after sending
      }
    }

    return {
      connect,
      disconnect,
      state,
      newMessage,
      sendMessage,
    }
  },
}
</script>

<template>
  <div>
    <button @click="connect">Connect</button>
    <button @click="disconnect">Disconnect</button>
    <div v-if="state.connected">Connected!</div>
    <input v-model="newMessage" placeholder="Type a message" />
    <button @click="sendMessage">Send Message</button>
    <ul>
      <li v-for="(message, index) in state.messages" :key="index">
        {{ message }}
      </li>
    </ul>
  </div>
</template>
