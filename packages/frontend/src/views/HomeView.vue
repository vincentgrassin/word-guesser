<script setup lang="ts">
import GameItem from '@/components/GameItem.vue'
import SettingsArea from '@/components/SettingsArea.vue'
import { useGamesStore } from '@/stores/useGamesStore'
import { generateUID } from '@word-guesser/shared'
import { onMounted } from 'vue'
const uid = localStorage.getItem('userId') || generateUID()
const { state, connect, setUserId } = useGamesStore()
onMounted(() => {
  connect(uid)
  if (!state.userId) setUserId(uid)
})
</script>

<template>
  <main>
    <h1>Word Guesser</h1>
    <p>User: {{ state.userId }}</p>
    <SettingsArea />
    <ul class="lg:grid-cols- grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
      <li v-for="(game, index) in state.games" :key="index">
        <GameItem :game="game" />
      </li>
    </ul>
  </main>
</template>
