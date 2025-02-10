<script lang="ts" setup>
import type { Game } from '@word-guesser/shared'
import { onUnmounted, ref, watch } from 'vue'

const { game } = defineProps<{ game: Game }>()

const diff = ref(
  game.settings.startedAt
    ? game.settings.duration - (Date.now() - game.settings.startedAt)
    : game.settings.duration,
)
let intervalId: ReturnType<typeof setInterval> | null = null

const updateDiff = () => {
  if (game.settings.startedAt) {
    diff.value = game.settings.duration - (Date.now() - game.settings.startedAt)
  } else {
    diff.value = game.settings.duration
  }
}

// Watch for changes in `game.settings.startedAt`
watch(
  () => game.settings.startedAt,
  (newStartedAt) => {
    if (newStartedAt) {
      // Only start the interval when `startedAt` becomes available
      if (!intervalId) {
        intervalId = setInterval(() => {
          console.log('interval is on ?')
          if (game.settings.startedAt) {
            diff.value = Math.max(diff.value - 1000, 0) // Prevent negative values
          }

          // Clear the interval when diff reaches 0
          if (diff.value === 0 && intervalId) {
            clearInterval(intervalId)
            intervalId = null // Reset the intervalId after clearing it
          }
        }, 1000)
      }
    } else {
      // Clear the interval if `startedAt` is cleared
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    updateDiff() // Update the diff when startedAt is set or cleared
  },
  { immediate: true }, // Immediately run when the component is mounted
)

onUnmounted(() => {
  // Ensure the interval is cleared when the component is unmounted
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
})
</script>

<template>
  <div class="rounded border p-4">
    <h2>Settings</h2>
    <p>{{ game.rounds.length }}</p>
    <p>{{ game.players.length }}/{{ game.settings.maxPlayers }}</p>
    <p>Diff: {{ diff }}</p>
    {{ game?.settings }}
  </div>
</template>
