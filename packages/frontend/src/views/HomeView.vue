<script setup lang="ts">
import { useGamesSocket } from '@/composable/useGamesSocket'
import { generateUID } from '@/utils/helpers'
import { onMounted, provide, ref } from 'vue'
const userName = ref('')
const uid = generateUID()
provide('userName', userName)
provide('userId', uid)
const { connect, createGame, state } = useGamesSocket(uid)
onMounted(() => {
  connect()
})
</script>

<template>
  <main>
    <h1>Word Guesser</h1>
    <button @:click="createGame">Create game</button>

    <p>User: {{ userName }}</p>
    <input v-model="userName" className="text-black" />
    <ul>
      <li v-for="(game, index) in state.games" :key="index">
        {{ JSON.stringify(game) }}
      </li>
    </ul>
    <!-- <GameManager id="123" />
    <GameManager id="456" /> -->
  </main>
</template>
