import { readRecentSpeakingProgress } from './speakingProgressRepository'
import { computeSpeakingProgressSummary } from './speakingProgressAggregator'
import { isSpeakingProgressEnabled } from './speakingProgressConfig'

export async function handleSpeakingProgressionGet(userId: string): Promise<{ summary: ReturnType<typeof computeSpeakingProgressSummary>; enabled: boolean }> {
  if (!isSpeakingProgressEnabled()) {
    return {
      enabled: false,
      summary: computeSpeakingProgressSummary([]),
    }
  }
  const rows = await readRecentSpeakingProgress(userId, 220)
  return { enabled: true, summary: computeSpeakingProgressSummary(rows) }
}
