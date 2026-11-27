import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildGame, fakeGameServer } from '@/__tests__/fakeGameServer'
import { logInAs, renderApp, tokenOf, unmountApp } from '@/__tests__/renderApp'

describe('Home page', () => {
  let app: Awaited<ReturnType<typeof renderApp>>

  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => {
    unmountApp(app)
  })

  it('connects as the remembered user and lists the games', async () => {
    logInAs('alice', 'Alice')
    fakeGameServer.games = [
      buildGame({
        settings: { name: 'Duo' },
        players: [{ userId: 'bob', userName: 'Bob' }],
      }),
    ]

    app = await renderApp('/')

    expect(fakeGameServer.connections).toEqual([
      { userId: 'alice', userName: 'Alice', token: tokenOf('alice') },
    ])
    await vi.waitFor(() => expect(app.wrapper.text()).toContain('Duo'))
    const text = app.wrapper.text()
    expect(text).toContain('Alice')
    expect(text).toContain('1/2')
    expect(text).toContain('Bob')
    expect(text).toContain('02:00')
  })

  it('credits the sources of the word proximity scores', async () => {
    logInAs('alice', 'Alice')

    app = await renderApp('/')

    const footer = app.wrapper.find('footer')
    expect(footer.text()).toContain('fastText')
    expect(footer.text()).toContain('Lexique 3.83')
    expect(footer.findAll('a').map((a) => a.attributes('href'))).toEqual([
      'https://fasttext.cc/docs/en/crawl-vectors.html',
      'http://www.lexique.org',
    ])
  })

  it('gives a new visitor an id and a secret token, and remembers them', async () => {
    app = await renderApp('/')

    const [connection] = fakeGameServer.connections
    expect(connection.userId).not.toBe('')
    expect(localStorage.getItem('userId')).toBe(connection.userId)
    expect(connection.token).toMatch(/^[0-9a-f]{32}$/)
    expect(localStorage.getItem('userToken')).toBe(connection.token)
  })

  it('tells the player while the connection is lost, until it is back', async () => {
    logInAs('alice', 'Alice')
    app = await renderApp('/')
    await vi.waitFor(() => expect(fakeGameServer.connections).toHaveLength(1))

    fakeGameServer.dropConnections()

    await vi.waitFor(() => expect(app.wrapper.text()).toContain('Connection lost'))
    await vi.waitFor(() => expect(app.wrapper.text()).not.toContain('Connection lost'), {
      timeout: 3000,
    })
  })

  it('creates a game from the creation form', async () => {
    logInAs('alice', 'Alice')
    app = await renderApp('/')
    const { wrapper } = app

    const createButton = wrapper.findAll('button').find((b) => b.text() === 'Create game')!
    await createButton.trigger('click')
    const form = wrapper.find('[role="dialog"] form')
    const [nameInput, playersInput, durationInput] = form.findAll('input')
    await nameInput.setValue('Trio')
    await playersInput.setValue('3')
    await durationInput.setValue('5')
    await form.trigger('submit')

    await vi.waitFor(() => expect(fakeGameServer.receivedEvents('CREATE_GAME')).toHaveLength(1))
    const [message] = fakeGameServer.receivedEvents('CREATE_GAME')
    expect(JSON.parse(message.content!)).toEqual({
      type: 'basic',
      name: 'Trio',
      maxPlayers: 3,
      duration: 5 * 60_000,
    })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    // The server announces the new game to everyone: it shows up in the list.
    fakeGameServer.send('CREATE_GAME', buildGame({ gameId: 'g2', settings: { name: 'Trio' } }))
    await vi.waitFor(() => expect(wrapper.text()).toContain('Trio'))
  })
})
