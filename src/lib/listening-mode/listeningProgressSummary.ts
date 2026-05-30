import type { ListeningLearnerProfile } from '@/lib/listening-mode/listeningProfileStorage'
import { readListeningSessionRecord } from '@/lib/listening-mode/listeningSessionStorage'

export type ListeningProgressSummary = {
  sessionsCompleted: number
  lastSessionCorrectRatio: number | null
  lastSessionWhen: string | null
}

export function buildListeningProgressSummary(profile: ListeningLearnerProfile): ListeningProgressSummary {
  const sessionsCompleted = profile.sessionIds.length
  const lastId = profile.sessionIds[0] ?? null
  if (!lastId) {
    return { sessionsCompleted, lastSessionCorrectRatio: null, lastSessionWhen: null }
  }
  const rec = readListeningSessionRecord(lastId)
  if (!rec) {
    return { sessionsCompleted, lastSessionCorrectRatio: null, lastSessionWhen: null }
  }
  if (!rec.attempts?.length) {
    return { sessionsCompleted, lastSessionCorrectRatio: null, lastSessionWhen: rec.endedAt ?? rec.startedAt }
  }
  const ok = rec.attempts.filter((a) => a.correct).length
  const ratio = ok / rec.attempts.length
  return {
    sessionsCompleted,
    lastSessionCorrectRatio: ratio,
    lastSessionWhen: rec.endedAt ?? rec.startedAt,
  }
}
