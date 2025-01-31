<script setup lang="ts">
import GameItem from '@/components/GameItem.vue'
import { useGamesStore } from '@/stores/useGamesStore'
import { generateUID } from '@word-guesser/shared'
import { onMounted, ref } from 'vue'
const userName = ref('')
const uid = localStorage.getItem('userId') || generateUID()
const { state, connect, createGame, setUserId } = useGamesStore()
onMounted(() => {
  connect(uid)
  if (!state.userId) setUserId(uid)
})
</script>

<template>
  <main>
    <h1>Word Guesser</h1>
    <p>User: {{ state.userId }}</p>
    <button @:click="() => createGame(state.userId)">Create game</button>

    <p>User: {{ userName }}</p>
    <input v-model="userName" className="text-black" />
    <ul>
      <li v-for="(game, index) in state.games" :key="index">
        <GameItem :game="game" />
      </li>
    </ul>
  </main>
</template>
