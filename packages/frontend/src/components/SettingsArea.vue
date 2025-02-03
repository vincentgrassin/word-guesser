<script lang="ts" setup>
import type { Game } from '@word-guesser/shared'

const { game } = defineProps<{
  game: Game
}>()
</script>

<template>
  <div class="p-4 border rounded">
    <h2>Settings</h2>
    {{ game?.settings }}
  </div>
  <div class="p-4 border rounded">
    <h2>Players</h2>
    <ul>
      <li v-for="(player, index) in game?.players" :key="index">
        {{ player }}
      </li>
    </ul>
  </div>
</template>
