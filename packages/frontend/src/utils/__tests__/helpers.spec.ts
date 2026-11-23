import type { ResponseMessage, Round } from '@word-guesser/shared'
import { describe, expect, it } from 'vitest'
import {
  computeGameStatusIcon,
  computeScore,
  formatDuration,
  formatTime,
  sortRoundMessages,
} from '../helpers'

const message = (userId: string, messageId: string): ResponseMessage => ({
  event: 'PLAY_ROUND',
  userId,
  messageId,
  content: 'word',
  date: 0,
})

describe('formatTime', () => {
  it('formats a timestamp as local HH:mm', () => {
    expect(formatTime(new Date(2026, 0, 1, 9, 5).getTime())).toBe('09:05')
  })
})

describe('formatDuration', () => {
  it('formats milliseconds as mm:ss', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(65_000)).toBe('01:05')
    expect(formatDuration(119_999)).toBe('01:59')
  })
})

describe('computeGameStatusIcon', () => {
  it('maps each status to its icon', () => {
    expect(computeGameStatusIcon('win')).toBe('diamond')
    expect(computeGameStatusIcon('loss')).toBe('skull')
    expect(computeGameStatusIcon('started')).toBe('cog')
    expect(computeGameStatusIcon('opened')).toBe('door')
  })
})

describe('computeScore', () => {
  it.each([
    [0, 'low'],
    [0.39, 'low'],
    [0.4, 'medium'],
    [0.5, 'high'],
    [0.7, 'extreme'],
    [1, 'extreme'],
  ])('%s is %s', (score, level) => {
    expect(computeScore(score)).toBe(level)
  })
})

describe('sortRoundMessages', () => {
  const round: Round = {
    roundId: 1,
    isComplete: true,
    messages: [message('alice', 'm1'), message('bob', 'm2'), message('carol', 'm3')],
    messagesSimilarity: [
      { sourceId: 'm1', targetId: 'm2', score: 0.6 },
      { sourceId: 'm1', targetId: 'm3', score: 0.2 },
      { sourceId: 'm2', targetId: 'm3', score: 0.9 },
    ],
  }

  it("splits the user's message from the others, each with its best similarity score", () => {
    const { me, others } = sortRoundMessages('alice', round)

    expect(me).toMatchObject({ userId: 'alice', score: 0.6 })
    expect(others.map((m) => [m.userId, m.score])).toEqual([
      ['bob', 0.9],
      ['carol', 0.9],
    ])
  })

  it('has no "me" when the user has not played yet', () => {
    expect(sortRoundMessages('dave', round).me).toBeUndefined()
  })

  it('scores 0 when the round has no similarity yet', () => {
    const { me } = sortRoundMessages('alice', { ...round, messagesSimilarity: [] })
    expect(me?.score).toBe(0)
  })
})
