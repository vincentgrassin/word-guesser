<script lang="ts" setup>
// import { connect, disconnect, message, state } from '@/socket'
import { useSocket } from '@/composable/useSocket'
import { ref, inject } from 'vue'

const userName = inject('userName')
const userId = (inject('userId') || '').toString()
console.log({ userId })
const { id } = defineProps<{
  id: string
}>()
const { connect, disconnect, message, state } = useSocket(id)

const newMessage = ref('')

const sendMessage = () => {
  if (newMessage.value) {
    message(newMessage.value, userId)
    newMessage.value = ''
  }
}
</script>

<template>
  <div className="p-4">
    <h2 className="text-xl">Game {{ id }}</h2>
    <div>
      <button @click="connect">Connect</button>
      <button @click="disconnect">Disconnect</button>
      <div v-if="state.connected">
        <h3>Connected!</h3>
        <input v-model="newMessage" placeholder="Type a message" className="text-black" />
        <button @click="sendMessage">Send Message</button>
      </div>
      <div>
        <p>
          {{ state.game?.gameId }}
        </p>
        <p>
          {{ JSON.stringify(state.game?.settings) }}
        </p>
      </div>
      <ul>
        <li v-for="(round, index) in state.game?.rounds" :key="index">
          {{ round }}
        </li>
      </ul>
    </div>
  </div>
</template>
