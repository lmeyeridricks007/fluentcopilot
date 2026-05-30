import type { ListeningLevel } from './listeningLevel'
import type { ListeningScenarioId } from './listeningScenarioId'

export const LISTENING_SESSION_STATUSES = ['in_progress', 'completed', 'abandoned'] as const
export type ListeningSessionStatus = (typeof LISTENING_SESSION_STATUSES)[number]

export type ListeningSession = {
  id: string
  userId: string
  scenarioId: ListeningScenarioId | null
  category: string
  level: ListeningLevel
  drillIds: string[]
  createdAt: string
  completedAt: string | null
  status: ListeningSessionStatus
  trackId: string | null
  clientSessionKey: string | null
}
