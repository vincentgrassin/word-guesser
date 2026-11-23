import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSemanticScore } from '../semantic.js'
import { buildMessage } from './setup/factories.js'
import { HUGGING_FACE_URL, mswServer } from './setup/msw.js'

const source = buildMessage('alice', 'apple', { messageId: 'm-alice' })
const targets = [
  buildMessage('bob', 'pear', { messageId: 'm-bob' }),
  buildMessage('carol', 'plum', { messageId: 'm-carol' }),
]

describe('getSemanticScore', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLE_SEMANTIC_CHECK', '1')
    vi.stubEnv('HUGGING_FACE_SEMANTIC_API', HUGGING_FACE_URL)
    vi.stubEnv('HUGGING_FACE_TOKEN', 'test-token')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('sends both sentences to Hugging Face and maps each score to a message pair', async () => {
    let received: { auth: string | null; body: unknown } | undefined
    mswServer.use(
      http.post(HUGGING_FACE_URL, async ({ request }) => {
        received = { auth: request.headers.get('Authorization'), body: await request.json() }
        return HttpResponse.json([0.8, 0.3])
      }),
    )

    const scores = await getSemanticScore(source, targets)

    expect(received).toEqual({
      auth: 'Bearer test-token',
      body: { inputs: { source_sentence: 'apple', sentences: ['pear', 'plum'] } },
    })
    expect(scores).toEqual([
      { sourceId: 'm-alice', targetId: 'm-bob', score: 0.8 },
      { sourceId: 'm-alice', targetId: 'm-carol', score: 0.3 },
    ])
  })

  it('does not call Hugging Face when the semantic check is disabled', async () => {
    vi.stubEnv('ENABLE_SEMANTIC_CHECK', '0')
    const onRequest = vi.fn()
    mswServer.events.on('request:start', onRequest)

    expect(await getSemanticScore(source, targets)).toEqual([])
    expect(onRequest).not.toHaveBeenCalled()

    mswServer.events.removeListener('request:start', onRequest)
  })

  it('returns no score when Hugging Face cannot be reached', async () => {
    mswServer.use(http.post(HUGGING_FACE_URL, () => HttpResponse.error()))

    expect(await getSemanticScore(source, targets)).toEqual([])
  })
})
