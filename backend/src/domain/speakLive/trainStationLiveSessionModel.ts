import type { ConversationMode, ThreadStatus } from '../../models/contracts'
import type { TrainStationGoalId } from './trainStationGoals'
import type { GoalHit, TrainStationTurnFactRecord } from './trainStationSlotState'

/**
 * Strict live-session view for Train Station (documentation + future API).
 * Persisted source of truth remains {@link ScenarioSessionState} on `SpeakLivePersistedState`.
 */
export type TrainLiveSessionSnapshot = {
  sessionId: string
  scenarioId: string
  learnerLevel: 'A1' | 'A2' | 'B1'
  assistantPersonaSlug?: string
  turnHistory: readonly TrainStationTurnFactRecord[]
  achievedGoals: readonly GoalHit[]
  pendingGoals: readonly TrainStationGoalId[]
  lastUserMessageId: string | null
  lastAssistantMessageId: string | null
  sessionStatus: ThreadStatus
  conversationMode: ConversationMode
}

export function mapDifficultyBandToCefr(band: string | undefined | null): 'A1' | 'A2' | 'B1' {
  const b = (band ?? '').toUpperCase()
  if (b.includes('A1')) return 'A1'
  if (b.includes('B1')) return 'B1'
  return 'A2'
}
