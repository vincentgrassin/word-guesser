import type { Game } from '@word-guesser/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildGame, fakeGameServer } from '@/__tests__/fakeGameServer'
import { logInAs, renderApp, unmountApp } from '@/__tests__/renderApp'
import router from '@/router'
import { useGamesStore } from '@/stores/useGamesStore'

const alice = { userId: 'alice', userName: 'Alice' }
const bob = { userId: 'bob', userName: 'Bob' }

const playMessage = (userId: string, content: string) => ({
  event: 'PLAY_ROUND' as const,
  gameId: 'g1',
  userId,
  messageId: `m-${userId}`,
  content,
  date: new Date(2026, 0, 1, 9, 5).getTime(),
})

describe('Game page', () => {
  let app: Awaited<ReturnType<typeof renderApp>>
  let startedGame: Game

  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    logInAs('alice', 'Alice')
    startedGame = buildGame({
      gameId: 'g1',
      players: [alice, bob],
      settings: { name: 'Duo', status: 'started' },
    })
  })
  afterEach(() => {
    unmountApp(app)
  })

  it('shows the game, its players and an empty round list', async () => {
    fakeGameServer.games = [startedGame]

    app = await renderApp('/game/g1')

    await vi.waitFor(() => expect(app.wrapper.text()).toContain('Duo'))
    const text = app.wrapper.text()
    expect(text).toContain('Alice (me)')
    expect(text).toContain('Bob')
    expect(text).toContain('2 / 2')
    expect(text).toContain('Waiting for first round')
  })

  it('joins the game when the player is not in it yet', async () => {
    fakeGameServer.games = [buildGame({ gameId: 'g1', players: [bob] })]

    app = await renderApp('/game/g1')

    await vi.waitFor(() => expect(fakeGameServer.receivedEvents('JOIN_GAME')).not.toHaveLength(0))
    expect(fakeGameServer.receivedEvents('JOIN_GAME')[0].gameId).toBe('g1')
  })

  it('does not send a bet of several words, and says why', async () => {
    fakeGameServer.games = [startedGame]
    app = await renderApp('/game/g1')
    const { wrapper } = app
    await vi.waitFor(() => expect(wrapper.find('form').exists()).toBe(true))

    await wrapper.find('form input').setValue('deux mots')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('[role="alert"]').text()).toContain('One word only')
    expect(fakeGameServer.receivedEvents('PLAY_ROUND')).toHaveLength(0)

    await wrapper.find('form input').setValue('arc-en-ciel')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it("sends the player's bet, then hides the partner's bet until the round is complete", async () => {
    fakeGameServer.games = [startedGame]
    app = await renderApp('/game/g1')
    const { wrapper } = app
    await vi.waitFor(() => expect(wrapper.find('form').exists()).toBe(true))

    const betInput = wrapper.find('form input')
    await betInput.setValue('apple')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(fakeGameServer.receivedEvents('PLAY_ROUND')).toHaveLength(1))
    expect(fakeGameServer.receivedEvents('PLAY_ROUND')[0]).toMatchObject({
      gameId: 'g1',
      content: 'apple',
    })
    expect((betInput.element as HTMLInputElement).value).toBe('')

    // Round 1 in progress: Bob has played, Alice not yet.
    fakeGameServer.send('PLAY_ROUND', {
      ...startedGame,
      rounds: [
        {
          roundId: 1,
          isComplete: false,
          messagesSimilarity: [],
          messages: [playMessage('bob', 'pear')],
        },
      ],
    })
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Waiting for first round'))
    expect(wrapper.text()).not.toContain('pear')

    // Both played: the round is complete and every bet is revealed.
    fakeGameServer.send('PLAY_ROUND', {
      ...startedGame,
      rounds: [
        {
          roundId: 1,
          isComplete: true,
          messagesSimilarity: [],
          messages: [playMessage('bob', 'pear'), playMessage('alice', 'apple')],
        },
      ],
    })
    await vi.waitFor(() => expect(wrapper.text()).toContain('pear'))
    expect(wrapper.text()).toContain('apple')
  })

  it('announces the victory and hides the bet form', async () => {
    fakeGameServer.games = [startedGame]
    app = await renderApp('/game/g1')
    await vi.waitFor(() => expect(app.wrapper.find('form').exists()).toBe(true))

    fakeGameServer.send('PLAY_ROUND', {
      ...startedGame,
      settings: { ...startedGame.settings, status: 'win' },
    })

    await vi.waitFor(() => expect(app.wrapper.text()).toContain('You win'))
    expect(app.wrapper.find('form').exists()).toBe(false)
  })

  it('goes home after the game without deleting it for the other players', async () => {
    fakeGameServer.games = [
      buildGame({ gameId: 'g1', players: [alice, bob], settings: { name: 'Duo', status: 'win' } }),
    ]
    app = await renderApp('/game/g1')
    await vi.waitFor(() => expect(app.wrapper.text()).toContain('You win'))

    const goHome = app.wrapper.findAll('a').find((link) => link.text() === 'Go home')!
    await goHome.trigger('click')

    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/'))
    // A last message as a marker: everything sent before it has arrived
    useGamesStore(app.pinia).joinGame('marker')
    await vi.waitFor(() => expect(fakeGameServer.receivedEvents('JOIN_GAME')).not.toHaveLength(0))
    expect(fakeGameServer.receivedEvents('DELETE_GAME')).toEqual([])
  })

  it('leaves ending the game to the server when time runs out', async () => {
    const duration = 120_000
    const almostOver = buildGame({
      gameId: 'g1',
      players: [alice, bob],
      settings: {
        name: 'Duo',
        status: 'started',
        duration,
        startedAt: Date.now() - duration + 1500,
      },
    })
    fakeGameServer.games = [almostOver]
    app = await renderApp('/game/g1')

    // Wait for the countdown to really reach zero (the timer reads 0 before the game loads)
    await vi.waitFor(() => expect(app.wrapper.text()).toContain('00:01'))
    // The timer ticks every second from ~1.5s: it holds exactly 0 after two ticks
    await new Promise((resolve) => setTimeout(resolve, 2200))
    expect(app.wrapper.text()).toContain('00:00')

    fakeGameServer.send('END_GAME', {
      ...almostOver,
      settings: { ...almostOver.settings, status: 'loss' },
    })
    await vi.waitFor(() => expect(app.wrapper.text()).toContain('You lose'))
    // Checked last, so that a message sent at zero has had time to arrive
    expect(fakeGameServer.receivedEvents('END_GAME')).toEqual([])
  })

  it('tells the player when the game does not exist', async () => {
    app = await renderApp('/game/unknown')

    await vi.waitFor(() => expect(app.wrapper.text()).toContain('Oops this game does not exist'))
  })
})
