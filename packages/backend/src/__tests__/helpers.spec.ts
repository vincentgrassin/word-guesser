import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addPlayerToGame,
  areAllMessagesEquals,
  broadcast,
  buildInitialGame,
  cleanPlayer,
  findPlayer,
  findPlayerById,
  gameForPlayer,
  isGameExpired,
  parseMessage,
  removePlayerFromGame,
  removePlayerFromPlayers,
  updateGameStartTime,
  updateGameStatus,
  updateGameStatusTo,
  updatePlayer,
  updateRounds,
} from '../helpers.js'
import { getSemanticScore } from '../semantic.js'
import { buildGame, buildMessage, buildPlayer, sentTo } from './setup/factories.js'

// Rounds call the semantic API when they complete: replace it with a stub here.
// The real call is covered with MSW in semantic.spec.ts and server.spec.ts.
vi.mock('../semantic.js', () => ({
  getSemanticScore: vi.fn(async () => [{ sourceId: 'a', targetId: 'b', score: 0.9 }]),
}))

const alice = { userId: 'alice', userName: 'Alice' }
const bob = { userId: 'bob', userName: 'Bob' }

describe('parseMessage', () => {
  const raw = (value: unknown) => Buffer.from(JSON.stringify(value))

  it('parses a JSON socket message', () => {
    expect(parseMessage(raw({ event: 'JOIN_GAME', gameId: 'g1', date: 42 }))).toEqual({
      event: 'JOIN_GAME',
      gameId: 'g1',
      date: 42,
    })
  })

  it('rejects a message that is not JSON', () => {
    expect(parseMessage(Buffer.from('not json'))).toBeUndefined()
  })

  it('rejects an event the client cannot send', () => {
    expect(parseMessage(raw({ event: 'LIST_GAMES', date: 0 }))).toBeUndefined()
    expect(parseMessage(raw({ event: 'HACK', date: 0 }))).toBeUndefined()
    expect(parseMessage(raw(['JOIN_GAME']))).toBeUndefined()
  })

  it('rejects fields of the wrong type', () => {
    expect(parseMessage(raw({ event: 'JOIN_GAME', gameId: 1, date: 0 }))).toBeUndefined()
    expect(parseMessage(raw({ event: 'PLAY_ROUND', content: { a: 1 }, date: 0 }))).toBeUndefined()
    expect(parseMessage(raw({ event: 'JOIN_GAME', date: 'today' }))).toBeUndefined()
  })
})

describe('buildInitialGame', () => {
  it('builds an opened game from the creation form properties', () => {
    const properties = JSON.stringify({ type: 'solo', maxPlayers: 3, duration: 60_000, name: 'Fun' })
    const game = buildInitialGame('g1', 'alice', properties)

    expect(game).toMatchObject({
      gameId: 'g1',
      rounds: [],
      players: [],
      settings: {
        status: 'opened',
        createdBy: 'alice',
        type: 'solo',
        maxPlayers: 3,
        duration: 60_000,
        name: 'Fun',
      },
    })
  })

  it('falls back to default properties and uses the id as name', () => {
    const game = buildInitialGame('g1', 'alice', undefined)
    expect(game.settings).toMatchObject({
      type: 'basic',
      maxPlayers: 2,
      duration: 120_000,
      name: 'g1',
    })
  })

  it('falls back to default properties when they are not JSON', () => {
    const game = buildInitialGame('g1', 'alice', '{oops')
    expect(game.settings).toMatchObject({ maxPlayers: 2, duration: 120_000, name: 'g1' })
  })

  it('keeps only the properties the creator may choose', () => {
    const properties = JSON.stringify({ name: 'Fun', status: 'win', createdBy: 'bob', startedAt: 1 })
    const { settings } = buildInitialGame('g1', 'alice', properties)

    expect(settings.status).toBe('opened')
    expect(settings.createdBy).toBe('alice')
    expect(settings.startedAt).toBeUndefined()
  })

  it('keeps numbers within the allowed range', () => {
    const tooBig = JSON.stringify({ maxPlayers: 1000, duration: 10 ** 12 })
    expect(buildInitialGame('g1', 'alice', tooBig).settings).toMatchObject({
      maxPlayers: 8,
      duration: 30 * 60_000,
    })

    const tooSmall = JSON.stringify({ maxPlayers: 0, duration: 1 })
    expect(buildInitialGame('g1', 'alice', tooSmall).settings).toMatchObject({
      maxPlayers: 2,
      duration: 60_000,
    })
  })

  it('ignores values of the wrong type', () => {
    const properties = JSON.stringify({ name: 42, maxPlayers: 'many', type: 'chaos' })
    expect(buildInitialGame('g1', 'alice', properties).settings).toMatchObject({
      name: 'g1',
      maxPlayers: 2,
      type: 'basic',
    })
  })

  it('trims and shortens the name', () => {
    const properties = JSON.stringify({ name: `  ${'x'.repeat(100)}  ` })
    expect(buildInitialGame('g1', 'alice', properties).settings.name).toBe('x'.repeat(40))
  })
})

describe('addPlayerToGame', () => {
  it('adds the player without its socket', () => {
    const game = buildGame()
    addPlayerToGame(game, buildPlayer('alice', 'Alice'))
    expect(game.players).toEqual([alice])
  })

  it('ignores a player who already joined', () => {
    const game = buildGame({ players: [alice] })
    addPlayerToGame(game, buildPlayer('alice', 'Alice'))
    expect(game.players).toEqual([alice])
  })

  it('ignores new players when the game is full', () => {
    const game = buildGame({ players: [alice, bob] })
    addPlayerToGame(game, buildPlayer('carol'))
    expect(game.players).toEqual([alice, bob])
  })

  it('ignores a missing player', () => {
    const game = buildGame()
    addPlayerToGame(game, undefined)
    expect(game.players).toEqual([])
  })
})

describe('updatePlayer', () => {
  it('applies the new settings to the player', () => {
    const player = buildPlayer('alice', 'Alice')
    updatePlayer(JSON.stringify({ userName: 'Alicia' }), player)
    expect(player.userName).toBe('Alicia')
  })

  it('does nothing without settings', () => {
    const player = buildPlayer('alice', 'Alice')
    expect(updatePlayer(undefined, player)).toBeUndefined()
    expect(player.userName).toBe('Alice')
  })

  it('does nothing when the settings are not JSON', () => {
    const player = buildPlayer('alice', 'Alice')
    expect(updatePlayer('{oops', player)).toBeUndefined()
    expect(player.userName).toBe('Alice')
  })

  it('changes nothing but the name', () => {
    const player = buildPlayer('alice', 'Alice')
    const socket = player.socket
    updatePlayer(JSON.stringify({ userId: 'bob', socket: null, userName: 'Alicia' }), player)

    expect(player.userId).toBe('alice')
    expect(player.socket).toBe(socket)
    expect(player.userName).toBe('Alicia')
  })

  it('refuses an empty name', () => {
    const player = buildPlayer('alice', 'Alice')
    expect(updatePlayer(JSON.stringify({ userName: '   ' }), player)).toBeUndefined()
    expect(player.userName).toBe('Alice')
  })
})

describe('updateRounds', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('ignores a message from someone who is not in the game', async () => {
    const game = buildGame({ players: [alice, bob] })
    await updateRounds(game, buildMessage('carol', 'apple'))
    expect(game.rounds).toEqual([])
  })

  it('opens round 1 with the first message', async () => {
    const game = buildGame({ players: [alice, bob] })
    const message = buildMessage('alice', 'apple')
    await updateRounds(game, message)

    expect(game.rounds).toEqual([
      { roundId: 1, isComplete: false, messages: [message], messagesSimilarity: [] },
    ])
  })

  it('replaces the previous answer when a player plays twice in the same round', async () => {
    const game = buildGame({ players: [alice, bob] })
    await updateRounds(game, buildMessage('alice', 'apple'))
    await updateRounds(game, buildMessage('alice', 'pear'))
    await updateRounds(game, buildMessage('bob', 'plum'))

    expect(game.rounds).toHaveLength(1)
    expect(game.rounds[0].messages.map((m) => [m.userId, m.content])).toEqual([
      ['alice', 'pear'],
      ['bob', 'plum'],
    ])
  })

  it('completes the round and scores it once every player answered', async () => {
    const game = buildGame({ players: [alice, bob] })
    await updateRounds(game, buildMessage('alice', 'apple'))
    await updateRounds(game, buildMessage('bob', 'plum'))

    const [round] = game.rounds
    expect(round.isComplete).toBe(true)
    expect(round.messages.map((m) => m.userId)).toEqual(['alice', 'bob'])
    expect(getSemanticScore).toHaveBeenCalledWith(round.messages[0], [round.messages[1]])
    expect(round.messagesSimilarity).toEqual([{ sourceId: 'a', targetId: 'b', score: 0.9 }])
  })

  it('opens the next round after a complete one', async () => {
    const game = buildGame({ players: [alice, bob] })
    await updateRounds(game, buildMessage('alice', 'apple'))
    await updateRounds(game, buildMessage('bob', 'plum'))
    await updateRounds(game, buildMessage('bob', 'fruit'))

    expect(game.rounds.map((r) => r.roundId)).toEqual([1, 2])
    expect(game.rounds[1].messages.map((m) => m.content)).toEqual(['fruit'])
  })
})

describe('updateGameStatus', () => {
  it('starts the game when it is full', () => {
    const game = buildGame({ players: [alice, bob] })
    updateGameStatus(game)
    expect(game.settings.status).toBe('started')
  })

  it('keeps the game opened while waiting for players', () => {
    const game = buildGame({ players: [alice] })
    updateGameStatus(game)
    expect(game.settings.status).toBe('opened')
  })

  it('marks the game as won when every player said the same word', () => {
    const game = buildGame({
      players: [alice, bob],
      rounds: [
        {
          roundId: 1,
          isComplete: true,
          messagesSimilarity: [],
          messages: [buildMessage('alice', 'apple'), buildMessage('bob', 'apple')],
        },
      ],
    })
    updateGameStatus(game)
    expect(game.settings.status).toBe('win')
  })
})

describe('updateGameStatusTo', () => {
  it('sets a valid status', () => {
    const game = buildGame()
    updateGameStatusTo(game, 'loss')
    expect(game.settings.status).toBe('loss')
  })

  it('keeps the current status when the new one is invalid', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const game = buildGame({ settings: { status: 'started' } })

    updateGameStatusTo(game, 'paused')
    updateGameStatusTo(game, undefined)

    expect(game.settings.status).toBe('started')
  })
})

describe('isGameExpired', () => {
  const MINUTE = 60_000

  it('expires any game after 30 minutes without activity', () => {
    const game = buildGame({ settings: { status: 'started' } })
    expect(isGameExpired(game, 0, 29 * MINUTE)).toBe(false)
    expect(isGameExpired(game, 0, 31 * MINUTE)).toBe(true)
  })

  it('expires a finished game after 10 minutes', () => {
    expect(isGameExpired(buildGame({ settings: { status: 'win' } }), 0, 11 * MINUTE)).toBe(true)
    expect(isGameExpired(buildGame({ settings: { status: 'loss' } }), 0, 11 * MINUTE)).toBe(true)
    expect(isGameExpired(buildGame({ settings: { status: 'loss' } }), 0, 9 * MINUTE)).toBe(false)
  })
})

describe('gameForPlayer', () => {
  const round = (isComplete: boolean) => ({
    roundId: 1,
    isComplete,
    messagesSimilarity: [],
    messages: [buildMessage('alice', 'apple'), buildMessage('bob', 'pear')],
  })

  it("hides the other players' words in a round still being played", () => {
    const game = buildGame({ players: [alice, bob], rounds: [round(false)] })

    const seenByAlice = gameForPlayer(game, 'alice')

    expect(seenByAlice.rounds[0].messages.map((m) => m.content)).toEqual(['apple', undefined])
  })

  it('shows every word of a complete round', () => {
    const game = buildGame({ players: [alice, bob], rounds: [round(true)] })
    const seenByAlice = gameForPlayer(game, 'alice')
    expect(seenByAlice.rounds[0].messages.map((m) => m.content)).toEqual(['apple', 'pear'])
  })

  it('leaves the game itself untouched', () => {
    const game = buildGame({ players: [alice, bob], rounds: [round(false)] })
    gameForPlayer(game, 'alice')
    expect(game.rounds[0].messages[1].content).toBe('pear')
  })
})

describe('updateGameStartTime', () => {
  const NOW = new Date('2026-01-01T12:00:00Z').getTime()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts the clock when the first round completes', () => {
    const game = buildGame({
      rounds: [{ roundId: 1, isComplete: true, messages: [], messagesSimilarity: [] }],
    })
    updateGameStartTime(game)
    expect(game.settings.startedAt).toBe(NOW)
  })

  it('does not start the clock before the first round completes', () => {
    const game = buildGame({
      rounds: [{ roundId: 1, isComplete: false, messages: [], messagesSimilarity: [] }],
    })
    updateGameStartTime(game)
    expect(game.settings.startedAt).toBeUndefined()
  })

  it('never moves the start time once set', () => {
    const game = buildGame({
      settings: { startedAt: 1 },
      rounds: [{ roundId: 1, isComplete: true, messages: [], messagesSimilarity: [] }],
    })
    updateGameStartTime(game)
    expect(game.settings.startedAt).toBe(1)
  })
})

describe('areAllMessagesEquals', () => {
  const messages = (...words: string[]) => words.map((w, i) => buildMessage(`p${i}`, w))

  it('is true when every player sent the same word', () => {
    expect(areAllMessagesEquals(messages('apple', 'apple'), 2)).toBe(true)
  })

  it('is false when the words differ', () => {
    expect(areAllMessagesEquals(messages('apple', 'pear'), 2)).toBe(false)
  })

  it('is false while some players have not answered', () => {
    expect(areAllMessagesEquals(messages('apple'), 2)).toBe(false)
    expect(areAllMessagesEquals([], 2)).toBe(false)
  })
})

describe('player list helpers', () => {
  it('finds a player by id or by socket', () => {
    const a = buildPlayer('alice')
    const b = buildPlayer('bob')
    expect(findPlayerById('bob', [a, b])).toBe(b)
    expect(findPlayerById('carol', [a, b])).toBeUndefined()
    expect(findPlayer(b.socket, [a, b])).toBe(b)
  })

  it('cleanPlayer drops the socket', () => {
    expect(cleanPlayer(buildPlayer('alice', 'Alice'))).toEqual(alice)
  })

  it('removePlayerFromPlayers removes the connection with the same socket', () => {
    const a = buildPlayer('alice')
    const b = buildPlayer('bob')
    const players = [a, b]
    removePlayerFromPlayers(a, players)
    expect(players).toEqual([b])
  })

  it('removePlayerFromGame removes the player from the game', () => {
    const game = buildGame({ players: [alice, bob] })
    removePlayerFromGame('alice', game)
    expect(game.players).toEqual([bob])
  })
})

describe('broadcast', () => {
  it('sends the event and payload to every player', () => {
    const a = buildPlayer('alice')
    const b = buildPlayer('bob')
    broadcast([a, b], 'DELETE_GAME', 'g1')
    expect(sentTo(a)).toEqual([{ event: 'DELETE_GAME', payload: 'g1' }])
    expect(sentTo(b)).toEqual([{ event: 'DELETE_GAME', payload: 'g1' }])
  })
})
