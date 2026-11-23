import { afterAll, afterEach, beforeAll } from 'vitest'
import { fakeGameServer, mswServer } from './fakeGameServer'

// Any request without a handler fails the test, so no test can reach a real server.
beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  mswServer.resetHandlers()
  fakeGameServer.reset()
  localStorage.clear()
})
afterAll(() => mswServer.close())
