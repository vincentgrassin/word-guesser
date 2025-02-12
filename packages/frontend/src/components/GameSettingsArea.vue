<script lang="ts" setup>
import { useGameTimer } from '@/hooks/useGameTimer'
import { useGamesStore } from '@/stores/useGamesStore'
import { computed } from 'vue'

const { gameId } = defineProps<{ gameId: string }>()
const { state } = useGamesStore()
const game = computed(() => state.games.find((g) => g.gameId === gameId))
const { gameTimer } = useGameTimer(game)
</script>

<template>
  <div class="rounded border p-4" v-if="!!game">
    <h2>Settings</h2>
    <p>Round:{{ game.rounds.length }}</p>
    <p>PLayers: {{ game.players.length }}/{{ game.settings.maxPlayers }}</p>
    <p>Diff: {{ gameTimer }}</p>
    <p>Status: {{ game.settings.status }}</p>
    <p>Type: {{ game.settings.type }}</p>
  </div>
</template>
