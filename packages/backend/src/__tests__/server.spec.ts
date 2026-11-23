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
}

async function connect(server: FastifyInstance, userId: string): Promise<Client> {
  const inbox: SocketPayload[] = []
  let wakeUp: (() => void) | undefined

  const ws = await server.injectWS(`/connect/${userId}?userName=${userId}-name`, undefined, {
    // Listen before the connection opens: the server sends LIST_GAMES straight away.
    onInit: (socket) =>
      socket.on('message', (data) => {
        inbox.push(JSON.parse(data.toString()))
        wakeUp?.()
      }),
  })

  return {
    ws,
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

const twoPlayerGame = JSON.stringify({ type: 'basic', maxPlayers: 2, duration: 120_000, name: 'Duo' })

describe('game server (WebSocket)', () => {
  let server: FastifyInstance
  let alice: Client
  let bob: Client

  // Alice creates a 2-player game, then both players join it.
  async function startGame(): Promise<Game> {
    alice.send('CREATE_GAME', { content: twoPlayerGame })
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

  it('ends the game with the status sent by the client', async () => {
    const { gameId } = await startGame()

    alice.send('END_GAME', { gameId, content: 'loss' })

    expect((await bob.next<Game>('END_GAME')).settings.status).toBe('loss')
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

  it('tells the other players when someone disconnects', async () => {
    await startGame()

    await bob.close()
    const game = await alice.next<Game>('CLOSE_CONNECTION')

    // Bob played no round, so he is not considered gone: he keeps his seat.
    expect(game.players.map((p) => p.userId)).toEqual(['alice', 'bob'])
  })
})
