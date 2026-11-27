import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildGame, fakeGameServer } from '@/__tests__/fakeGameServer'
import { tokenOf } from '@/__tests__/renderApp'
import { useGamesStore } from '../useGamesStore'

const aliceToken = tokenOf('alice')

describe('useGamesStore', () => {
  let store: ReturnType<typeof useGamesStore>

  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    setActivePinia(createPinia())
    store = useGamesStore()
  })

  afterEach(() => {
    store.disconnect()
  })

  it('connects as the user and loads the list of games', async () => {
    fakeGameServer.games = [buildGame({ gameId: 'g1' }), buildGame({ gameId: 'g2' })]

    await store.connect('alice', 'Alice', aliceToken)

    expect(fakeGameServer.connections).toEqual([
      { userId: 'alice', userName: 'Alice', token: aliceToken },
    ])
    await vi.waitFor(() => expect(store.state.games.map((g) => g.gameId)).toEqual(['g1', 'g2']))
  })

  it('keeps a user name with URL special characters intact', async () => {
    await store.connect('alice', 'Tom & Jerry #1?', aliceToken)

    expect(fakeGameServer.connections).toEqual([
      { userId: 'alice', userName: 'Tom & Jerry #1?', token: aliceToken },
    ])
  })

  describe('when the connection drops (e.g. the server restarts)', () => {
    it('reconnects on its own and reloads the games', async () => {
      await store.connect('alice', 'Alice', aliceToken)
      fakeGameServer.games = [buildGame({ gameId: 'g1' })]

      fakeGameServer.dropConnections()

      await vi.waitFor(() => expect(store.state.connectionLost).toBe(true))
      await vi.waitFor(() => expect(fakeGameServer.connections).toHaveLength(2), { timeout: 3000 })
      expect(fakeGameServer.connections[1]).toEqual(fakeGameServer.connections[0])
      await vi.waitFor(() => expect(store.state.games.map((g) => g.gameId)).toEqual(['g1']))
      expect(store.state.connectionLost).toBe(false)
    })

    it('does not reconnect after a deliberate disconnect', async () => {
      await store.connect('alice', 'Alice', aliceToken)

      store.disconnect()
      await new Promise((resolve) => setTimeout(resolve, 1500))

      expect(fakeGameServer.connections).toHaveLength(1)
      expect(store.state.connectionLost).toBe(false)
    })
  })

  it('adds a game created by anyone, and updates it on later events', async () => {
    await store.connect('alice', 'Alice', aliceToken)

    fakeGameServer.send('CREATE_GAME', buildGame({ gameId: 'g1' }))
    await vi.waitFor(() => expect(store.state.games).toHaveLength(1))

    fakeGameServer.send('JOIN_GAME', buildGame({ gameId: 'g1', players: [{ userId: 'bob', userName: 'Bob' }] }))
    await vi.waitFor(() => expect(store.state.games[0].players).toHaveLength(1))
    expect(store.state.games).toHaveLength(1)
  })

  it('removes a deleted game', async () => {
    fakeGameServer.games = [buildGame({ gameId: 'g1' }), buildGame({ gameId: 'g2' })]
    await store.connect('alice', 'Alice', aliceToken)
    await vi.waitFor(() => expect(store.state.games).toHaveLength(2))

    fakeGameServer.send('DELETE_GAME', 'g1')

    await vi.waitFor(() => expect(store.state.games.map((g) => g.gameId)).toEqual(['g2']))
  })

  it('sends player actions to the server', async () => {
    await store.connect('alice', 'Alice', aliceToken)

    store.createGame({ type: 'basic', maxPlayers: 3, duration: 60_000, name: 'Trio' })
    store.joinGame('g1')
    store.playRound('g1', 'apple')

    await vi.waitFor(() => expect(fakeGameServer.received).toHaveLength(3))
    expect(fakeGameServer.received).toEqual([
      {
        event: 'CREATE_GAME',
        content: JSON.stringify({ type: 'basic', maxPlayers: 3, duration: 60_000, name: 'Trio' }),
        date: expect.any(Number),
      },
      { event: 'JOIN_GAME', gameId: 'g1', date: expect.any(Number) },
      { event: 'PLAY_ROUND', gameId: 'g1', content: 'apple', date: expect.any(Number) },
    ])
  })

  it('does not send anything before being connected', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    store.joinGame('g1')

    expect(error).toHaveBeenCalledOnce()
    expect(fakeGameServer.received).toEqual([])
  })

  it('remembers the user in localStorage', () => {
    store.setUserId('alice')
    store.setUserName('Alice')

    expect(store.state.user).toEqual({ userId: 'alice', userName: 'Alice' })
    expect(localStorage.getItem('userId')).toBe('alice')
    expect(localStorage.getItem('userName')).toBe('Alice')
  })
})
