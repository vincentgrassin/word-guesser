import type { IconName } from '@/components/ui/BaseIcon.vue'
import type { GameStatus, ResponseMessage, Round } from '@word-guesser/shared'

// 32 random hex characters. getRandomValues also works on plain HTTP pages,
// unlike crypto.randomUUID, and the server may be reached without HTTPS.
export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

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

// A message's best score against the other words of its round:
// - a number: its level is shown;
// - null: every pair has an unknown word, shown as "?";
// - undefined: nothing to show (round not scored yet, or semantics off on the server).
export type MessageScore = number | null | undefined

const getBestScore = (messageId: string, round: Round): MessageScore => {
  const scores = round.messagesSimilarity
    .filter(({ sourceId, targetId }) => sourceId === messageId || targetId === messageId)
    .map(({ score }) => score)
  if (scores.length === 0) return undefined
  const known = scores.filter((score) => score !== null)
  return known.length > 0 ? Math.max(...known) : null
}

type MessageWithScore = ResponseMessage & { score: MessageScore }

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
      ? { ...userMessage, score: getBestScore(userMessage.messageId, round) }
      : undefined,
    others: otherMessages.map((msg) => ({
      ...msg,
      score: getBestScore(msg.messageId, round),
    })),
  }
}
