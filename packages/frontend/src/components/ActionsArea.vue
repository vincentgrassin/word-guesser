<script lang="ts" setup>
import { useGamesStore } from '@/stores/useGamesStore'
import DsButton from './DsButton.vue'
import { RouterLink } from 'vue-router'

defineProps<{ gameId: string }>()
const { quitGame, deleteGameRequest } = useGamesStore()
</script>

<template>
  <div class="flex justify-end">
    <RouterLink :to="`/`">
      <DsButton @:click="() => quitGame(gameId)">Quit</DsButton>
    </RouterLink>
    <RouterLink :to="`/`">
      <DsButton @:click="() => deleteGameRequest(gameId)">Delete</DsButton>
    </RouterLink>
  </div>
</template>
