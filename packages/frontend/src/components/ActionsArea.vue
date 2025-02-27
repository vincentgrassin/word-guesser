<script lang="ts" setup>
import BaseLink from '@/components/ui/BaseLink.vue'
import { useGamesStore } from '@/stores/useGamesStore'

defineProps<{ gameId: string }>()
const { quitGame, deleteGame } = useGamesStore()
</script>

<template>
  <div class="flex justify-end gap-4 py-4">
    <div @:click="() => quitGame(gameId)" class="flex">
      <BaseLink :to="`/`"> Quit </BaseLink>
    </div>
    <div @:click="() => deleteGame(gameId)" class="flex">
      <BaseLink :to="`/`"> Delete </BaseLink>
    </div>
  </div>
</template>
