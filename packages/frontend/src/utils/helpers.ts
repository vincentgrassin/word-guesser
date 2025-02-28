import type { IconName } from '@/components/ui/BaseIcon.vue'
import type { GameStatus } from '@word-guesser/shared'

export function formatTime(timestamp: number) {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

export const formatDuration = (ms: number): string => {
  const minutes = Math.floor(ms / 60000) // Convert to minutes
  const seconds = Math.floor((ms % 60000) / 1000) // Get remaining seconds

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export const computeGameStatusIcon = (status: GameStatus): IconName => {
  switch (status) {
    case 'win':
      return 'diamond'
    case 'loss':
      return 'skull'
    case 'started':
      return 'cog'
    case 'opened':
      return 'door'
  }
}
