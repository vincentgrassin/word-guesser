import type { Game } from '@word-guesser/shared'
import { onUnmounted, ref, watch, type ComputedRef } from 'vue'

export function useGameTimer(game: ComputedRef<Game | undefined>) {
  const gameTimer = ref(0)

  let intervalId: ReturnType<typeof setInterval> | null = null

  const updateGameTimer = (game: Game) => {
    if (game.settings.startedAt) {
      gameTimer.value = game.settings.duration - (Date.now() - game.settings.startedAt)
    } else {
      gameTimer.value = game.settings.duration
    }
  }

  watch(
    () => game.value?.settings.startedAt,
    (newStartedAt) => {
      if (newStartedAt) {
        // Start the interval when `startedAt` becomes available
        if (!intervalId) {
          intervalId = setInterval(() => {
            if (game.value?.settings.startedAt) {
              gameTimer.value = Math.max(gameTimer.value - 1000, 0)
            }

            // Clear the interval when timer reaches 0
            if (gameTimer.value === 0 && intervalId) {
              clearInterval(intervalId)
              intervalId = null
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

      if (game.value) {
        updateGameTimer(game.value)
      }
    },
    { immediate: true },
  )
  onUnmounted(() => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  })

  return {
    gameTimer,
  }
}
