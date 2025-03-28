<script setup lang="ts">
import BetFormArea from '@/components/BetFormArea.vue'
import ErrorView from '@/views/ErrorView.vue'
import GameSettingsArea from '@/components/GameSettingsArea.vue'
import PlayersArea from '@/components/PlayersArea.vue'
import RoundsArea from '@/components/RoundsArea.vue'
import { useUserConnect } from '@/hooks/useUserConnect'
import router from '@/router'
import { useGamesStore } from '@/stores/useGamesStore'
import { findGame, isPlayerInGame } from '@word-guesser/shared'
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
const { id } = defineProps<{ id: string }>()

const { joinGame, state } = useGamesStore()
const route = useRoute()
useUserConnect(() => {
  const gameId = route.params.id as string
  const game = findGame(gameId, state.games)
  if (!isPlayerInGame(state.user.userId, game)) {
    joinGame(gameId)
  }
})
const game = computed(() => findGame(id, state.games))
watch(
  () => game.value?.gameId,
  (newGameId) => {
    if (!newGameId) {
      router.push('/404')
      return
    }
    const game = findGame(newGameId, state.games)
    if (!isPlayerInGame(state.user.userId, game)) {
      joinGame(newGameId)
    }
  },
)
</script>

<template>
  <main class="h-full">
    <div v-if="!!game" class="flex h-full flex-col md:flex-row">
      <GameSettingsArea :gameId="game.gameId" class="w-full md:w-1/5" />
      <div class="flex-1">
        <BetFormArea :gameId="id" :gameStatus="game.settings.status" />
        <PlayersArea :game="game" />
        <RoundsArea :rounds="[...game.rounds].reverse()" />
      </div>
    </div>
    <div v-else>
      <ErrorView />
    </div>
  </main>
</template>
