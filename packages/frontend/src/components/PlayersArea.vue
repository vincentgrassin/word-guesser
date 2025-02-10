<script lang="ts" setup>
import type { Game } from '@word-guesser/shared'

const { game } = defineProps<{
  game: Game
}>()
</script>

<template>
  <div class="rounded border p-4">
    <h2>Players</h2>
    <ul>
      <li v-for="(player, index) in game?.players" :key="index">
        {{ player }}
      </li>
    </ul>
  </div>
</template>
