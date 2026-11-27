import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  findGame,
  hasPlayerLeftGame,
  isOlderThan,
  isPlayerInGame,
  removeGame,
  sortPlayers,
  syncGame,
  type Game,
  type ResponseMessage,
  scoreLevel,
  isSingleWord,
} from '../index'

const buildGame = (overrides: Partial<Game> = {}): Game => ({
  gameId: 'game-1',
  rounds: [],
  players: [],
  settings: {
    status: 'opened',
    createdBy: 'alice',
    createdAt: 0,
    type: 'basic',
    maxPlayers: 2,
    duration: 120_000,
    name: 'Test game',
  },
  ...overrides,
})

const buildMessage = (userId: string, date: number): ResponseMessage => ({
  event: 'PLAY_ROUND',
  userId,
  messageId: `msg-${userId}`,
  content: 'word',
  date,
})

const alice = { userId: 'alice', userName: 'Alice' }
const bob = { userId: 'bob', userName: 'Bob' }

describe('sortPlayers', () => {
  it('splits the current user from the other players', () => {
    expect(sortPlayers('alice', [alice, bob])).toEqual({ me: alice, others: [bob] })
  })

  it('returns no "me" when the user is not among the players', () => {
    expect(sortPlayers('carol', [alice, bob])).toEqual({ me: undefined, others: [alice, bob] })
  })
})

describe('findGame', () => {
  const games = [buildGame({ gameId: 'a' }), buildGame({ gameId: 'b' })]

  it('finds a game by id', () => {
    expect(findGame('b', games)).toBe(games[1])
  })

  it('returns undefined for an unknown or missing id', () => {
    expect(findGame('zzz', games)).toBeUndefined()
    expect(findGame(undefined, games)).toBeUndefined()
  })
})

describe('removeGame', () => {
  it('removes the game in place and returns its id', () => {
    const games = [buildGame({ gameId: 'a' }), buildGame({ gameId: 'b' })]
    expect(removeGame('a', games)).toBe('a')
    expect(games.map((g) => g.gameId)).toEqual(['b'])
  })

  it('returns false when the game does not exist', () => {
    const games = [buildGame({ gameId: 'a' })]
    expect(removeGame('zzz', games)).toBe(false)
    expect(games).toHaveLength(1)
  })
})

describe('syncGame', () => {
  it('replaces an existing game with the same id', () => {
    const games = [buildGame({ gameId: 'a' })]
    const updated = buildGame({ gameId: 'a', players: [alice] })
    syncGame(updated, games)
    expect(games).toEqual([updated])
  })

  it('adds the game when it is not in the list yet', () => {
    const games = [buildGame({ gameId: 'a' })]
    syncGame(buildGame({ gameId: 'b' }), games)
    expect(games.map((g) => g.gameId)).toEqual(['a', 'b'])
  })
})

describe('isOlderThan / hasPlayerLeftGame', () => {
  const NOW = new Date('2026-01-01T12:00:00Z').getTime()
  const minutesAgo = (minutes: number) => NOW - minutes * 60_000

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('isOlderThan compares a date with now', () => {
    expect(isOlderThan(minutesAgo(6), 5)).toBe(true)
    expect(isOlderThan(minutesAgo(4), 5)).toBe(false)
    expect(isOlderThan(undefined, 5)).toBe(false)
  })

  it('a player has left when their last message is older than 5 minutes', () => {
    const game = buildGame({
      rounds: [
        {
          roundId: 1,
          isComplete: false,
          messagesSimilarity: [],
          messages: [buildMessage('alice', minutesAgo(10)), buildMessage('bob', minutesAgo(1))],
        },
      ],
    })
    expect(hasPlayerLeftGame('alice', game)).toBe(true)
    expect(hasPlayerLeftGame('bob', game)).toBe(false)
  })

  it('a player has not left a game without rounds', () => {
    expect(hasPlayerLeftGame('alice', buildGame())).toBe(false)
  })
})

describe('isPlayerInGame', () => {
  it('tells whether the user is one of the game players', () => {
    const game = buildGame({ players: [alice] })
    expect(isPlayerInGame('alice', game)).toBe(true)
    expect(isPlayerInGame('bob', game)).toBe(false)
    expect(isPlayerInGame('alice', undefined)).toBe(false)
  })
})

describe('scoreLevel', () => {
  it.each([
    [0, 'low'],
    [0.29, 'low'],
    [0.3, 'medium'],
    [0.41, 'medium'],
    [0.42, 'high'],
    [0.57, 'high'],
    [0.58, 'extreme'],
    [1, 'extreme'],
  ])('%s is %s', (score, level) => {
    expect(scoreLevel(score)).toBe(level)
  })
})

describe('isSingleWord', () => {
  it.each(['mer', 'arc-en-ciel', "aujourd'hui", '  mer  '])('accepts %j', (word) => {
    expect(isSingleWord(word)).toBe(true)
  })

  it.each(['deux mots', 'mer\tplage', 'mer\nplage'])('refuses %j', (word) => {
    expect(isSingleWord(word)).toBe(false)
  })
})
