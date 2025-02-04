<script lang="ts" setup>
import { useGamesStore } from '@/stores/useGamesStore'
import DsButton from './DsButton.vue'
defineProps<{ gameId: string }>()
const { quitGame } = useGamesStore()
</script>

<template>
  <DsButton @:click="() => quitGame(gameId)">Quit game</DsButton>
</template>
