<script lang="ts" setup>
import { useGameTimer } from '@/hooks/useGameTimer'
import { useGamesStore } from '@/stores/useGamesStore'
import BaseModal from '@/components/ui/BaseModal.vue'
import { computed, watch } from 'vue'
import BaseLink from '@/components/ui/BaseLink.vue'

const { gameId } = defineProps<{ gameId: string }>()
const { state, endGame, deleteGame } = useGamesStore()
const game = computed(() => state.games.find((g) => g.gameId === gameId))
const { gameTimer } = useGameTimer(game)

watch(gameTimer, (newTimer) => {
  if (newTimer === 0) {
    endGame(gameId, 'loss')
  }
})
</script>

<template>
  <div class="rounded border p-4" v-if="!!game">
    <h2>Settings</h2>
    <p>Round:{{ game.rounds.length }}</p>
    <p>PLayers: {{ game.players.length }}/{{ game.settings.maxPlayers }}</p>
    <p>Diff: {{ gameTimer }}</p>
    <p>Status: {{ game.settings.status }}</p>
    <p>Type: {{ game.settings.type }}</p>
    <BaseModal :isOpen="game.settings.status === 'loss' || game.settings.status === 'win'">
      <p>Your game status is {{ game.settings.status }}</p>
      <BaseLink to="/"> <span @:click="() => deleteGame(gameId)"> Go home </span> </BaseLink>
    </BaseModal>
  </div>
</template>
