import type { Game, GameSettings, RequestMessage, SocketEvent } from '@word-guesser/shared'
import { ws } from 'msw'
import { setupServer } from 'msw/node'

// Stands in for the backend's /connect/:userId WebSocket during tests (via MSW).
// Like the real server it sends LIST_GAMES on connection; tests then read what
// the app sent (`received`) and push server events to it (`send`).
const gameSocket = ws.link(/\/connect\//)

type Connection = { userId: string; userName: string | null; token: string | null }
type OpenClient = { close: () => void }

const openClients: OpenClient[] = []

export const fakeGameServer = {
  // Games sent in LIST_GAMES to each new connection.
  games: [] as Game[],
  connections: [] as Connection[],
  received: [] as RequestMessage[],

  send(event: SocketEvent, payload: unknown) {
    gameSocket.broadcast(JSON.stringify({ event, payload }))
  },

  receivedEvents(event: SocketEvent) {
    return this.received.filter((m) => m.event === event)
  },

  // Like a server restart: every open connection is closed by the server.
  dropConnections() {
    openClients.splice(0).forEach((client) => client.close())
  },

  reset() {
    this.games = []
    this.connections = []
    this.received = []
    openClients.length = 0
  },
}

export const mswServer = setupServer(
  gameSocket.addEventListener('connection', ({ client }) => {
    openClients.push(client)
    fakeGameServer.connections.push({
      userId: client.url.pathname.split('/').pop() ?? '',
      userName: client.url.searchParams.get('userName'),
      token: client.url.searchParams.get('token'),
    })
    client.send(JSON.stringify({ event: 'LIST_GAMES', payload: fakeGameServer.games }))
    client.addEventListener('message', (event) => {
      fakeGameServer.received.push(JSON.parse(event.data as string))
    })
  }),
)

type GameOverrides = Partial<Omit<Game, 'settings'>> & { settings?: Partial<GameSettings> }

export const buildGame = (overrides: GameOverrides = {}): Game => ({
  gameId: 'g1',
  rounds: [],
  players: [],
  ...overrides,
  settings: {
    status: 'opened',
    createdBy: 'alice',
    createdAt: 0,
    type: 'basic',
    maxPlayers: 2,
    duration: 120_000,
    name: 'Duo',
    ...overrides.settings,
  },
})
