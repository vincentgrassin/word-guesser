import type { IconName } from '@/components/ui/BaseIcon.vue'
import type { GameStatus, ResponseMessage, Round } from '@word-guesser/shared'

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

const getMaxScore = (messageId: string, round: Round) => {
  if (!messageId) return 0
  const score = round.messagesSimilarity.reduce(
    (max, { sourceId, targetId, score }) =>
      messageId && (sourceId === messageId || targetId === messageId) ? Math.max(max, score) : max,
    0,
  )
  return score
}

type MessageWithScore = ResponseMessage & { score: number }

export function sortRoundMessages(
  userId: string,
  round: Round,
): {
  me?: MessageWithScore
  others: MessageWithScore[]
} {
  const messages = round.messages
  const userMessage = messages.find((msg) => msg.userId === userId)
  const otherMessages = messages.filter((msg) => msg.userId !== userId)

  return {
    me: userMessage
      ? { ...userMessage, score: getMaxScore(userMessage.messageId, round) }
      : undefined,
    others: otherMessages.map((msg) => ({
      ...msg,
      score: getMaxScore(msg.messageId, round),
    })),
  }
}

export function computeScore(score: number) {
  if (score < 0.4) return 'low'
  if (score < 0.5) return 'medium'
  if (score < 0.7) return 'high'
  return 'extreme'
}
