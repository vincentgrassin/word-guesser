<script lang="ts" setup>
import type { Game } from '@word-guesser/shared'
import { RouterLink } from 'vue-router'

const { game } = defineProps<{
  game: Game
}>()
</script>

<template>
  <div className="p-4 flex flex-col">
    <RouterLink :to="`/game/${game.gameId}`">
      <p>
        {{ game.gameId }}
      </p>
      <p>Players: {{ game.players.length }}/ {{ game.settings.maxPlayers }}</p>
      <p>Rounds:{{ game.rounds.length }}</p>
      <p>Duration: {{ game.settings.duration }}</p>
      <p>Type:{{ game.settings.type }}</p>
      <p>Status: {{ game.settings.status }}</p>
    </RouterLink>
  </div>
</template>
