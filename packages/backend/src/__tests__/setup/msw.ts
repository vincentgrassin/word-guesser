import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'

export const HUGGING_FACE_URL = 'https://hugging-face.test/similarity'

type SimilarityRequest = { inputs: { source_sentence: string; sentences: string[] } }

// Default fake Hugging Face API: every sentence gets the same score.
export const DEFAULT_SCORE = 0.5
export const huggingFaceHandler = http.post(HUGGING_FACE_URL, async ({ request }) => {
  const body = (await request.json()) as SimilarityRequest
  return HttpResponse.json(body.inputs.sentences.map(() => DEFAULT_SCORE))
})

export const mswServer = setupServer(huggingFaceHandler)

// Any request without a handler fails the test, so no test can reach the real network.
beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())
