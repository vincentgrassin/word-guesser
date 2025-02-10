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
