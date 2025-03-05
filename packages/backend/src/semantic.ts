import { MessageSimilarity, ResponseMessage } from '@word-guesser/shared'

export async function getSemanticScore(
  sourceMessage: ResponseMessage,
  targetMessages: ResponseMessage[],
): Promise<MessageSimilarity[]> {
  try {
    if (!+(process.env.ENABLE_SEMANTIC_CHECK || 0)) {
      return []
    }
    const formatSource = sourceMessage.content
    const formatTargets = targetMessages.map((m) => m.content)

    const response = await fetch(process.env.HUGGING_FACE_SEMANTIC_API!, {
      headers: {
        Authorization: `Bearer ${process.env.HUGGING_FACE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        inputs: {
          source_sentence: formatSource,
          sentences: formatTargets,
        },
      }),
    })
    const result = await response.json()
    const messagesSimilarity: MessageSimilarity[] = targetMessages.map((tm, idx) => {
      return {
        sourceId: sourceMessage.messageId,
        targetId: tm.messageId,
        score: result[idx],
      }
    })
    return messagesSimilarity
  } catch (err) {
    console.error('[ERROR]: Semantic similarity computation failed', err)
    return []
  }
}
