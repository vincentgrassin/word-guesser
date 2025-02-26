<script lang="ts" setup>
import type { Game } from '@word-guesser/shared'
import { RouterLink } from 'vue-router'

const { game } = defineProps<{
  game: Game
}>()
</script>

<template>
  <RouterLink :to="`/game/${game.gameId}`">
    <div
      className="bg-primary text-black px-4 py-2 rounded-md transition-all duration-200 border-2 font-bold active:translate-x-1 active:translate-y-1 border-black shadow-[3px_3px_0px_black] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
    >
      <p>
        {{ game.gameId }}
      </p>
      <p>Players: {{ game.players.length }}/ {{ game.settings.maxPlayers }}</p>
      <p>Rounds:{{ game.rounds.length }}</p>
      <p>Duration: {{ game.settings.duration }}</p>
      <p>Type:{{ game.settings.type }}</p>
      <p>Status: {{ game.settings.status }}</p>
    </div>
  </RouterLink>
</template>
