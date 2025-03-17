<script lang="ts" setup>
import BaseLink from '@/components/ui/BaseLink.vue'
import { useGamesStore } from '@/stores/useGamesStore'
import { type Game } from '@word-guesser/shared'

defineProps<{ game: Game }>()
const { quitGame, deleteGame, state } = useGamesStore()
</script>

<template>
  <div class="ml-auto flex gap-4 py-4 md:ml-0 md:justify-evenly">
    <div @:click="() => quitGame(game.gameId)" class="flex">
      <BaseLink :to="`/`"> Quit </BaseLink>
    </div>
    <div
      v-if="game.settings.createdBy === state.user.userId"
      @:click="() => deleteGame(game.gameId)"
      class="flex"
    >
      <BaseLink :to="`/`"> Delete </BaseLink>
    </div>
  </div>
</template>
