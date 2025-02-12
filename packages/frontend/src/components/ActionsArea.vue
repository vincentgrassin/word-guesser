<script lang="ts" setup>
import BaseLink from '@/components/ui/BaseLink.vue'
import { useGamesStore } from '@/stores/useGamesStore'

defineProps<{ gameId: string }>()
const { quitGame, deleteGame } = useGamesStore()
</script>

<template>
  <div class="flex justify-end gap-4">
    <BaseLink :to="`/`">
      <span @:click="() => quitGame(gameId)">Quit</span>
    </BaseLink>
    <BaseLink :to="`/`">
      <span @:click="() => deleteGame(gameId)">Delete</span>
    </BaseLink>
  </div>
</template>
