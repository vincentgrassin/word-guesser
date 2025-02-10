<script lang="ts" setup>
import { useGamesStore } from '@/stores/useGamesStore'
import BaseButton from './ui/BaseButton.vue'
import { RouterLink } from 'vue-router'

defineProps<{ gameId: string }>()
const { quitGame, deleteGameRequest } = useGamesStore()
</script>

<template>
  <div class="flex justify-end">
    <RouterLink :to="`/`">
      <BaseButton @:click="() => quitGame(gameId)">Quit</BaseButton>
    </RouterLink>
    <RouterLink :to="`/`">
      <BaseButton @:click="() => deleteGameRequest(gameId)">Delete</BaseButton>
    </RouterLink>
  </div>
</template>
