import type { Game, GameSettings, Player, ResponseMessage, WebSocket } from '@word-guesser/shared'
import { vi } from 'vitest'

type GameOverrides = Partial<Omit<Game, 'settings'>> & { settings?: Partial<GameSettings> }

export const buildGame = (overrides: GameOverrides = {}): Game => ({
  gameId: 'game-1',
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
    name: 'Test game',
    ...overrides.settings,
  },
})

export const buildMessage = (
  userId: string,
  content: string,
  overrides: Partial<ResponseMessage> = {},
): ResponseMessage => ({
  event: 'PLAY_ROUND',
  gameId: 'game-1',
  userId,
  messageId: `msg-${userId}-${content}`,
  content,
  date: 0,
  ...overrides,
})

type FakeSocket = { sent: unknown[]; send: (data: string) => void }

// A player whose socket only records what is sent to it (read it back with `sentTo`).
export const buildPlayer = (userId: string, userName = userId): Player => {
  const socket: FakeSocket = {
    sent: [],
    send: vi.fn((data: string) => socket.sent.push(JSON.parse(data))),
  }
  return { userId, userName, socket: socket as unknown as WebSocket }
}

export const sentTo = (player: Player): unknown[] =>
  (player.socket as unknown as FakeSocket).sent
