import type { GuidedScenarioDefinition } from '@/lib/schemas/practice/guidedScenarioDefinition.schema'
import type { GuidedScenarioCheckpointPayload, GuidedSessionState } from '@/lib/practice/guided/guidedSessionState'
import { getUserDrafts, setUserDrafts } from './draftStorage'

export const GUIDED_SCENARIO_CHECKPOINT_PREFIX = 'guidedScenario:' as const

const MAX_CHECKPOINT_AGE_MS = 7 * 24 * 60 * 60 * 1000

function checkpointKey(scenarioId: string): string {
  return `${GUIDED_SCENARIO_CHECKPOINT_PREFIX}${scenarioId}`
}

type StoredCheckpoint = GuidedScenarioCheckpointPayload & { updatedAt: string; scenarioId: string }

function parseStored(raw: unknown): StoredCheckpoint | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.scenarioId !== 'string') return null
  if (typeof o.updatedAt !== 'string') return null
  if (
    o.phase !== 'intro' &&
    o.phase !== 'phrases' &&
    o.phase !== 'chat' &&
    o.phase !== 'complete'
  ) {
    return null
  }
  if (typeof o.currentTurnId !== 'string') return null
  if (!Array.isArray(o.messages)) return null
  if (!Array.isArray(o.branchQualities)) return null
  if (o.outcome != null && o.outcome !== 'success' && o.outcome !== 'partial' && o.outcome !== 'needs_practice')
    return null
  if (typeof o.chatStarted !== 'boolean') return null
  return o as StoredCheckpoint
}

export function saveGuidedScenarioCheckpoint(
  userId: string,
  scenarioId: string,
  state: GuidedSessionState
): boolean {
  if (typeof window === 'undefined') return false
  if (state.phase === 'complete') {
    clearGuidedScenarioCheckpoint(userId, scenarioId)
    return true
  }
  const drafts = getUserDrafts(userId)
  const payload: StoredCheckpoint = {
    scenarioId,
    updatedAt: new Date().toISOString(),
    phase: state.phase,
    currentTurnId: state.currentTurnId,
    messages: state.messages,
    branchQualities: state.branchQualities,
    outcome: state.outcome,
    chatStarted: state.chatStarted,
  }
  setUserDrafts(userId, {
    ...drafts,
    activeLessonState: {
      ...(drafts.activeLessonState ?? {}),
      [checkpointKey(scenarioId)]: payload as unknown as Record<string, unknown>,
    },
  })
  return true
}

export function loadGuidedScenarioCheckpoint(
  userId: string,
  scenarioId: string
): GuidedScenarioCheckpointPayload | null {
  if (typeof window === 'undefined') return null
  const drafts = getUserDrafts(userId)
  const raw = drafts.activeLessonState?.[checkpointKey(scenarioId)]
  const parsed = parseStored(raw)
  if (!parsed || parsed.scenarioId !== scenarioId) return null
  const age = Date.now() - Date.parse(parsed.updatedAt)
  if (!Number.isFinite(age) || age > MAX_CHECKPOINT_AGE_MS) {
    clearGuidedScenarioCheckpoint(userId, scenarioId)
    return null
  }
  const { updatedAt: _u, scenarioId: _s, ...rest } = parsed
  return rest
}

export function clearGuidedScenarioCheckpoint(userId: string, scenarioId: string): void {
  const drafts = getUserDrafts(userId)
  const next = { ...(drafts.activeLessonState ?? {}) }
  delete next[checkpointKey(scenarioId)]
  setUserDrafts(userId, {
    ...drafts,
    activeLessonState: Object.keys(next).length > 0 ? next : undefined,
  })
}

export function mergeCheckpointIntoGuidedState(
  definition: GuidedScenarioDefinition,
  ck: GuidedScenarioCheckpointPayload
): GuidedSessionState {
  return {
    definition,
    phase: ck.phase,
    currentTurnId: ck.currentTurnId,
    messages: ck.messages,
    branchQualities: ck.branchQualities,
    outcome: ck.outcome,
    chatStarted: ck.chatStarted,
  }
}
