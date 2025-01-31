<script lang="ts" setup>
import type { Game } from '@word-guesser/shared'
import { RouterLink } from 'vue-router'

const { game } = defineProps<{
  game: Game
}>()
</script>

<template>
  <div className="p-4 flex flex-col">
    {{ JSON.stringify(game) }}
    <RouterLink :to="`/game/${game.gameId}`">Join game {{ game.gameId }}</RouterLink>
  </div>
</template>
