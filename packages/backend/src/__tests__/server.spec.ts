import type { Game, SocketEvent, SocketPayload, WebSocket } from '@word-guesser/shared'
import type { FastifyInstance } from 'fastify'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildServer } from '../server.js'
import { HUGGING_FACE_URL, mswServer } from './setup/msw.js'

// A test client: a real WebSocket connected to the server (in memory, no port),
// which keeps every message it receives so tests can wait for a given event.
type Client = {
  ws: WebSocket
  send: (event: SocketEvent, fields?: { gameId?: string; content?: string }) => void
  next: <T = unknown>(event: SocketEvent) => Promise<T>
  close: () => Promise<void>
  // Resolves with the close code when the server closes the connection
  closedByServer: Promise<number>
}

async function connect(server: FastifyInstance, userId: string): Promise<Client> {
  const inbox: SocketPayload[] = []
  let wakeUp: (() => void) | undefined
  let onClose: (code: number) => void = () => {}
  const closedByServer = new Promise<number>((resolve) => (onClose = resolve))

  const ws = await server.injectWS(`/connect/${userId}?userName=${userId}-name`, undefined, {
    // Listen before the connection opens: the server sends LIST_GAMES straight away.
    onInit: (socket) => {
      socket.on('message', (data) => {
        inbox.push(JSON.parse(data.toString()))
        wakeUp?.()
      })
      socket.on('close', (code) => onClose(code))
    },
  })

  return {
    ws,
    closedByServer,
    send: (event, fields = {}) => ws.send(JSON.stringify({ event, date: Date.now(), ...fields })),
    async next<T>(event: SocketEvent) {
      for (;;) {
        const index = inbox.findIndex((m) => m.event === event)
        if (index !== -1) return inbox.splice(index, 1)[0].payload as T
        await new Promise<void>((resolve) => (wakeUp = resolve))
      }
    },
    close: () =>
      new Promise((resolve) => {
        ws.once('close', () => resolve())
        ws.terminate()
      }),
  }
}

const MINUTE = 60_000
const twoPlayerGame = JSON.stringify({ type: 'basic', maxPlayers: 2, duration: 2 * MINUTE, name: 'Duo' })
const longGame = JSON.stringify({ type: 'basic', maxPlayers: 2, duration: 30 * MINUTE, name: 'Long' })

describe('game server (WebSocket)', () => {
  let server: FastifyInstance
  let alice: Client
  let bob: Client

  // Restart the server with a fake clock, so tests can jump forward in time.
  async function restartServer(options?: Parameters<typeof buildServer>[0]) {
    await server.close()
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    server = buildServer(options)
    await server.ready()
    alice = await connect(server, 'alice')
    bob = await connect(server, 'bob')
  }

  // Alice creates a 2-player game, then both players join it.
  async function startGame(content = twoPlayerGame): Promise<Game> {
    alice.send('CREATE_GAME', { content })
    const { gameId } = await alice.next<Game>('CREATE_GAME')
    await bob.next('CREATE_GAME')

    alice.send('JOIN_GAME', { gameId })
    await alice.next('JOIN_GAME')
    await bob.next('JOIN_GAME')

    bob.send('JOIN_GAME', { gameId })
    await bob.next('JOIN_GAME')
    return alice.next<Game>('JOIN_GAME')
  }

  async function playRound(gameId: string, aliceWord: string, bobWord: string): Promise<Game> {
    alice.send('PLAY_ROUND', { gameId, content: aliceWord })
    await alice.next('PLAY_ROUND')
    await bob.next('PLAY_ROUND')

    bob.send('PLAY_ROUND', { gameId, content: bobWord })
    await bob.next('PLAY_ROUND')
    return alice.next<Game>('PLAY_ROUND')
  }

  beforeEach(async () => {
    vi.stubEnv('ENABLE_SEMANTIC_CHECK', '1')
    vi.stubEnv('HUGGING_FACE_SEMANTIC_API', HUGGING_FACE_URL)
    vi.stubEnv('HUGGING_FACE_TOKEN', 'test-token')

    server = buildServer()
    await server.ready()
    alice = await connect(server, 'alice')
    bob = await connect(server, 'bob')
  })

  afterEach(async () => {
    vi.useRealTimers()
    await server.close()
  })

  it('sends the list of games to a player who connects', async () => {
    expect(await alice.next('LIST_GAMES')).toEqual([])

    alice.send('CREATE_GAME', { content: twoPlayerGame })
    await alice.next('CREATE_GAME')

    const carol = await connect(server, 'carol')
    const games = await carol.next<Game[]>('LIST_GAMES')
    expect(games.map((g) => g.settings.name)).toEqual(['Duo'])
  })

  it('announces a new game to every connected player', async () => {
    alice.send('CREATE_GAME', { content: twoPlayerGame })

    const seenByBob = await bob.next<Game>('CREATE_GAME')
    expect(seenByBob.settings).toMatchObject({
      name: 'Duo',
      maxPlayers: 2,
      status: 'opened',
      createdBy: 'alice',
    })
  })

  it('starts the game once it is full', async () => {
    const game = await startGame()

    expect(game.players).toEqual([
      { userId: 'alice', userName: 'alice-name' },
      { userId: 'bob', userName: 'bob-name' },
    ])
    expect(game.settings.status).toBe('started')
  })

  it('wins the game when both players say the same word', async () => {
    const { gameId } = await startGame()

    const game = await playRound(gameId, 'apple', 'apple')

    expect(game.settings.status).toBe('win')
    expect(game.rounds[0].isComplete).toBe(true)
    expect(game.settings.startedAt).toEqual(expect.any(Number))
  })

  it('scores a round with Hugging Face when the words differ', async () => {
    mswServer.use(http.post(HUGGING_FACE_URL, () => HttpResponse.json([0.73])))
    const { gameId } = await startGame()

    const game = await playRound(gameId, 'apple', 'pear')

    expect(game.settings.status).toBe('started')
    const [round] = game.rounds
    expect(round.messages.map((m) => m.content)).toEqual(['apple', 'pear'])
    expect(round.messagesSimilarity).toEqual([
      { sourceId: round.messages[0].messageId, targetId: round.messages[1].messageId, score: 0.73 },
    ])
  })

  it('still plays the round when Hugging Face is down', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mswServer.use(http.post(HUGGING_FACE_URL, () => HttpResponse.error()))
    const { gameId } = await startGame()

    const game = await playRound(gameId, 'apple', 'pear')

    expect(game.rounds[0].isComplete).toBe(true)
    expect(game.rounds[0].messagesSimilarity).toEqual([])
  })

  it('removes a player who quits the game', async () => {
    const { gameId } = await startGame()

    bob.send('QUIT_GAME', { gameId })
    const game = await alice.next<Game>('QUIT_GAME')

    expect(game.players.map((p) => p.userId)).toEqual(['alice'])
  })

  it('deletes a game for everyone', async () => {
    alice.send('CREATE_GAME', { content: twoPlayerGame })
    const { gameId } = await alice.next<Game>('CREATE_GAME')

    alice.send('DELETE_GAME', { gameId })
    expect(await bob.next('DELETE_GAME')).toBe(gameId)

    const carol = await connect(server, 'carol')
    expect(await carol.next('LIST_GAMES')).toEqual([])
  })

  it('renames a player in the games they joined', async () => {
    await startGame()

    alice.send('UPDATE_PLAYER', { content: JSON.stringify({ userName: 'Alicia' }) })
    const game = await bob.next<Game>('UPDATE_PLAYER')

    expect(game.players).toContainEqual({ userId: 'alice', userName: 'Alicia' })
  })

  // What a newcomer sees: reading the state through a fresh connection.
  async function gamesSeenByNewcomer(): Promise<Game[]> {
    const carol = await connect(server, 'carol')
    return carol.next<Game[]>('LIST_GAMES')
  }

  describe('robustness', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    it('survives a message that is not JSON', async () => {
      alice.ws.send('not json')
      expect(await alice.next('ERROR')).toEqual(expect.any(String))

      alice.send('CREATE_GAME', { content: twoPlayerGame })
      expect((await bob.next<Game>('CREATE_GAME')).settings.name).toBe('Duo')
    })

    it('survives a message with an unknown event', async () => {
      alice.ws.send(JSON.stringify({ event: 'HACK', date: 0 }))
      expect(await alice.next('ERROR')).toEqual(expect.any(String))
    })

    it('survives game properties that are not JSON', async () => {
      alice.send('CREATE_GAME', { content: '{oops' })
      const game = await bob.next<Game>('CREATE_GAME')
      expect(game.settings).toMatchObject({ maxPlayers: 2, status: 'opened' })
    })

    it('survives player settings that are not JSON', async () => {
      alice.send('UPDATE_PLAYER', { content: '{oops' })
      expect(await alice.next('ERROR')).toEqual(expect.any(String))
    })
  })

  describe('hidden words', () => {
    it("hides the other players' words until the round is complete", async () => {
      const { gameId } = await startGame()

      alice.send('PLAY_ROUND', { gameId, content: 'apple' })
      const seenByAlice = await alice.next<Game>('PLAY_ROUND')
      const seenByBob = await bob.next<Game>('PLAY_ROUND')

      expect(seenByAlice.rounds[0].messages[0].content).toBe('apple')
      expect(seenByBob.rounds[0].messages[0].content).toBeUndefined()
      expect(seenByBob.rounds[0].messages[0].userId).toBe('alice')
    })

    it('hides them in the list of games sent on connection too', async () => {
      const { gameId } = await startGame()
      alice.send('PLAY_ROUND', { gameId, content: 'apple' })
      await alice.next('PLAY_ROUND')

      const [game] = await gamesSeenByNewcomer()
      expect(game.rounds[0].messages[0].content).toBeUndefined()
    })

    it('reveals every word once the round is complete', async () => {
      const { gameId } = await startGame()

      await playRound(gameId, 'apple', 'pear')

      const [game] = await gamesSeenByNewcomer()
      expect(game.rounds[0].messages.map((m) => m.content)).toEqual(['apple', 'pear'])
    })
  })

  describe('rules enforced by the server', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    it('refuses a round before the game started', async () => {
      alice.send('CREATE_GAME', { content: twoPlayerGame })
      const { gameId } = await alice.next<Game>('CREATE_GAME')
      alice.send('JOIN_GAME', { gameId })
      await alice.next('JOIN_GAME')

      alice.send('PLAY_ROUND', { gameId, content: 'apple' })
      expect(await alice.next('ERROR')).toEqual(expect.any(String))

      const [game] = await gamesSeenByNewcomer()
      expect(game.rounds).toEqual([])
    })

    it('refuses an empty word', async () => {
      const { gameId } = await startGame()

      alice.send('PLAY_ROUND', { gameId, content: '   ' })
      expect(await alice.next('ERROR')).toEqual(expect.any(String))

      const [game] = await gamesSeenByNewcomer()
      expect(game.rounds).toEqual([])
    })

    it('refuses a round once the game is won', async () => {
      const { gameId } = await startGame()
      await playRound(gameId, 'apple', 'apple')

      alice.send('PLAY_ROUND', { gameId, content: 'again' })
      expect(await alice.next('ERROR')).toEqual(expect.any(String))

      const [game] = await gamesSeenByNewcomer()
      expect(game.rounds).toHaveLength(1)
    })

    it('ignores game settings the client must not choose', async () => {
      const content = JSON.stringify({
        name: 'Duo',
        maxPlayers: 1000,
        duration: 120_000,
        type: 'basic',
        status: 'win',
        createdBy: 'bob',
      })
      alice.send('CREATE_GAME', { content })

      const { settings } = await bob.next<Game>('CREATE_GAME')
      expect(settings).toMatchObject({ status: 'opened', createdBy: 'alice', maxPlayers: 8 })
    })

    it('does not let a player take the id of someone else', async () => {
      await startGame()

      alice.send('UPDATE_PLAYER', { content: JSON.stringify({ userId: 'bob', userName: 'Alicia' }) })
      const game = await bob.next<Game>('UPDATE_PLAYER')

      expect(game.players).toEqual([
        { userId: 'alice', userName: 'Alicia' },
        { userId: 'bob', userName: 'bob-name' },
      ])
    })

    it('keeps the game when a player update carries a game id', async () => {
      const { gameId } = await startGame()

      alice.send('UPDATE_PLAYER', { gameId, content: JSON.stringify({ userName: 'Alicia' }) })
      await bob.next('UPDATE_PLAYER')

      const games = await gamesSeenByNewcomer()
      expect(games.map((g) => g.gameId)).toEqual([gameId])
    })

    it('does not let a client end a game, even a player', async () => {
      const { gameId } = await startGame()

      alice.send('END_GAME', { gameId, content: 'loss' })
      expect(await alice.next('ERROR')).toEqual(expect.any(String))
      alice.send('END_GAME', { gameId, content: 'win' })
      expect(await alice.next('ERROR')).toEqual(expect.any(String))

      const [game] = await gamesSeenByNewcomer()
      expect(game.settings.status).toBe('started')
    })

    it('only lets the creator or a player delete a game', async () => {
      const { gameId } = await startGame()
      const carol = await connect(server, 'carol')

      carol.send('DELETE_GAME', { gameId })
      expect(await carol.next('ERROR')).toEqual(expect.any(String))

      const games = await gamesSeenByNewcomer()
      expect(games.map((g) => g.gameId)).toEqual([gameId])
    })
  })

  describe('game clock', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    it('ends the game as a loss for everyone when time runs out', async () => {
      await restartServer()
      const { gameId } = await startGame()
      // The clock starts once the first round is complete
      await playRound(gameId, 'apple', 'pear')

      vi.advanceTimersByTime(2 * MINUTE + 1000)

      expect((await alice.next<Game>('END_GAME')).settings.status).toBe('loss')
      expect((await bob.next<Game>('END_GAME')).settings.status).toBe('loss')
    })

    it('does not end the game before time runs out', async () => {
      await restartServer()
      const { gameId } = await startGame()
      await playRound(gameId, 'apple', 'pear')

      vi.advanceTimersByTime(MINUTE)

      const [game] = await gamesSeenByNewcomer()
      expect(game.settings.status).toBe('started')
    })

    it('does not turn a won game into a loss', async () => {
      await restartServer()
      const { gameId } = await startGame()
      await playRound(gameId, 'apple', 'apple')

      vi.advanceTimersByTime(3 * MINUTE)

      const [game] = await gamesSeenByNewcomer()
      expect(game.settings.status).toBe('win')
    })

    it('refuses a round sent after time ran out', async () => {
      await restartServer()
      const { gameId } = await startGame()
      await playRound(gameId, 'apple', 'pear')

      // Move the clock without running the timers: the game is not ended yet
      vi.setSystemTime(Date.now() + 3 * MINUTE)
      alice.send('PLAY_ROUND', { gameId, content: 'late' })

      expect(await alice.next('ERROR')).toEqual(expect.any(String))
    })
  })

  describe('rate limits', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    it('refuses messages sent faster than allowed', async () => {
      await restartServer({ messageRate: { perSecond: 1, burst: 2 } })

      alice.send('CREATE_GAME', { content: twoPlayerGame })
      alice.send('CREATE_GAME', { content: twoPlayerGame })
      alice.send('CREATE_GAME', { content: twoPlayerGame })

      expect(await alice.next('ERROR')).toMatch(/too many messages/i)
      expect(await gamesSeenByNewcomer()).toHaveLength(2)
    })

    it('accepts messages again once the player slowed down', async () => {
      await restartServer({ messageRate: { perSecond: 1, burst: 1 } })
      alice.send('CREATE_GAME', { content: twoPlayerGame })
      await alice.next('CREATE_GAME')

      vi.advanceTimersByTime(1000)
      alice.send('CREATE_GAME', { content: twoPlayerGame })

      await alice.next('CREATE_GAME')
      expect(await gamesSeenByNewcomer()).toHaveLength(2)
    })

    it('disconnects a client that keeps flooding', async () => {
      await restartServer({ messageRate: { perSecond: 1, burst: 1 } })

      for (let i = 0; i < 30; i++) alice.send('JOIN_GAME', { gameId: 'none' })

      expect(await alice.closedByServer).toBe(1008)
    })

    it('limits the open games created from one address', async () => {
      await restartServer({ maxOpenGamesPerAddress: 2 })
      alice.send('CREATE_GAME', { content: twoPlayerGame })
      await alice.next('CREATE_GAME')
      bob.send('CREATE_GAME', { content: twoPlayerGame })
      await bob.next('CREATE_GAME')

      // Changing user id does not help: the limit is per address
      bob.send('CREATE_GAME', { content: twoPlayerGame })

      expect(await bob.next('ERROR')).toMatch(/too many open games/i)
    })

    it('counts only the games still open', async () => {
      await restartServer({ maxOpenGamesPerAddress: 1 })
      const { gameId } = await startGame()
      await playRound(gameId, 'apple', 'apple')

      alice.send('CREATE_GAME', { content: twoPlayerGame })

      expect((await bob.next<Game>('CREATE_GAME')).settings.status).toBe('opened')
    })

    it('limits the simultaneous connections from one address', async () => {
      await restartServer({ maxConnectionsPerAddress: 3 })
      await connect(server, 'carol')

      const dave = await connect(server, 'dave')

      expect(await dave.closedByServer).toBe(1008)
    })

    it('limits how often one address opens connections', async () => {
      await restartServer({ connectionRate: { perSecond: 1 / 60, burst: 3 } })
      const carol = await connect(server, 'carol')
      await carol.close()

      const dave = await connect(server, 'dave')

      expect(await dave.closedByServer).toBe(1008)
    })
  })

  describe('cleanup of old games', () => {
    it('deletes a game nobody touched for 30 minutes', async () => {
      await restartServer()
      alice.send('CREATE_GAME', { content: twoPlayerGame })
      const { gameId } = await alice.next<Game>('CREATE_GAME')

      vi.advanceTimersByTime(31 * MINUTE)

      expect(await bob.next('DELETE_GAME')).toBe(gameId)
      expect(await gamesSeenByNewcomer()).toEqual([])
    })

    it('keeps a game that is still being played', async () => {
      await restartServer()
      const { gameId } = await startGame(longGame)

      vi.advanceTimersByTime(20 * MINUTE)
      await playRound(gameId, 'apple', 'pear')
      vi.advanceTimersByTime(20 * MINUTE)

      const games = await gamesSeenByNewcomer()
      expect(games.map((g) => g.gameId)).toEqual([gameId])
    })

    it('deletes a finished game after 10 minutes', async () => {
      await restartServer()
      const { gameId } = await startGame()
      await playRound(gameId, 'apple', 'apple')

      vi.advanceTimersByTime(11 * MINUTE)

      expect(await bob.next('DELETE_GAME')).toBe(gameId)
    })

    it('refuses a new game when the server already holds too many', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      await restartServer({ maxGames: 1 })
      alice.send('CREATE_GAME', { content: twoPlayerGame })
      await alice.next('CREATE_GAME')

      alice.send('CREATE_GAME', { content: twoPlayerGame })

      expect(await alice.next('ERROR')).toEqual(expect.any(String))
      expect(await gamesSeenByNewcomer()).toHaveLength(1)
    })
  })

  it('tells the other players when someone disconnects', async () => {
    await startGame()

    await bob.close()
    const game = await alice.next<Game>('CLOSE_CONNECTION')

    // Bob played no round, so he is not considered gone: he keeps his seat.
    expect(game.players.map((p) => p.userId)).toEqual(['alice', 'bob'])
  })
})
