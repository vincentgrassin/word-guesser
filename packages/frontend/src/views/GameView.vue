<script setup lang="ts">
import ActionsArea from '@/components/ActionsArea.vue'
import BetFormArea from '@/components/BetFormArea.vue'
import RoundsArea from '@/components/RoundsArea.vue'
import SettingsArea from '@/components/SettingsArea.vue'
import { useGamesStore } from '@/stores/useGamesStore'
import { getGame } from '@word-guesser/shared'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
const { id } = defineProps<{ id: string }>()

const { joinGame, state, connect, setUserId } = useGamesStore()
const route = useRoute()
const game = computed(() => getGame(state.games, id))
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
  <main>
    <div class="p-4 border rounded">
      <h1>Game {{ id }}</h1>
      <p>User: {{ state.userId }}</p>
    </div>
    {{ game }}
    <div v-if="!!game">
      <ActionsArea :gameId="id" />
      <SettingsArea :game="game" />
      <RoundsArea :rounds="game.rounds" />
      <BetFormArea :gameId="id" :gameStatus="game.settings.status" />
    </div>
  </main>
</template>
