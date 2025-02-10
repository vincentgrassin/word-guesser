<script setup lang="ts">
import ActionsArea from '@/components/ActionsArea.vue'
import BetFormArea from '@/components/BetFormArea.vue'
import RoundsArea from '@/components/RoundsArea.vue'
import GameSettingsArea from '@/components/GameSettingsArea.vue'
import { useGamesStore } from '@/stores/useGamesStore'
import { findGame } from '@word-guesser/shared'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PlayersArea from '@/components/PlayersArea.vue'
const { id } = defineProps<{ id: string }>()

const { joinGame, state, connect, setUserId } = useGamesStore()
const route = useRoute()
const game = computed(() => findGame(id, state.games))
onMounted(() => {
  const savedUserId = localStorage.getItem('userId')
  if (!state.userId && savedUserId) {
    connect(savedUserId)
    setUserId(savedUserId)
  }

  joinGame(route.params.id as string)
})
</script>

<template>
  <main v-if="!!game">
    <ActionsArea :gameId="id" />
    <h1>Game {{ id }}</h1>
    <p>User: {{ state.userId }}</p>
    <div class="flex flex-col md:flex-row">
      <GameSettingsArea :game="game" />
      <div>
        <PlayersArea :game="game" />
        <RoundsArea :rounds="[...game.rounds].reverse()" />
        <BetFormArea :gameId="id" :gameStatus="game.settings.status" />
      </div>
    </div>
  </main>
</template>
