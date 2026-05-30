import type { Score01 } from './userLearningProfileDocument'
import type { TurnEvaluation } from '../../services/speak-live/liveVoiceEvaluationTypes'
import type { HesitationDelta, SessionInsightHesitation } from './sessionLearningInsightTypes'
import { dedupeEvidenceItems } from './learningInsightNormalization'

export function extractHesitationFromTurn(t: TurnEvaluation): HesitationDelta {
  const ac = t.audioCoaching
  const delta: HesitationDelta = {}
  const pe = ac?.evidence?.pauseIssues?.length ?? 0
  if (pe) delta.longPauses = Math.min(6, pe)
  const rush = ac?.evidence?.rushedEndings?.length ?? 0
  if (rush) delta.restarts = Math.min(4, rush)
  const prob = ac?.evidence?.problematicSegments?.length ?? 0
  if (prob) delta.beforeKeyWords = Math.min(4, prob)
  const dims = t.dimensions ?? []
  for (const d of dims) {
    const id = (d.id ?? '').toLowerCase()
    if (id.includes('filler') || (d.label ?? '').toLowerCase().includes('filler')) {
      delta.fillerTendency = (delta.fillerTendency ?? 0) + 1
    }
  }
  return delta
}

export function mergeHesitationDeltas(deltas: HesitationDelta[]): HesitationDelta {
  const out: HesitationDelta = {}
  for (const d of deltas) {
    for (const k of Object.keys(d) as (keyof HesitationDelta)[]) {
      const v = d[k]
      if (typeof v === 'number' && Number.isFinite(v)) {
        out[k] = (out[k] ?? 0) + v
      }
    }
  }
  return out
}

export function hesitationDeltaToIssues(
  delta: HesitationDelta | null,
  scenarioId: string | null,
  evidencePrefix: string,
  meta: { source: string; baseConfidence: Score01 },
): SessionInsightHesitation[] {
  if (!delta) return []
  const now = new Date().toISOString()
  const mk = (patternId: string, label: string, n?: number, supportingText?: string | null): SessionInsightHesitation | null => {
    if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return null
    return {
      patternId,
      label,
      severityScore: Math.min(3, n / 2.5),
      confidence: meta.baseConfidence,
      firstSeenAt: now,
      lastSeenAt: now,
      occurrences: Math.floor(n),
      scenarioIds: scenarioId ? [scenarioId] : [],
      evidenceRefs: dedupeEvidenceItems([`${evidencePrefix}:${patternId}`]),
      recoveryScore: 0.3,
      source: meta.source,
      supportingText: supportingText ?? null,
    }
  }
  return [
    mk('hes_long_pause', 'Long pauses', delta.longPauses, 'Aggregated pause-like segments across turns.'),
    mk('hes_restart', 'Restarts / compressed line endings', delta.restarts, 'Rushed endings or restart-like cuts in audio.'),
    mk('hes_filler', 'Filler tendency', delta.fillerTendency, 'Filler / hesitation markers in dimensions.'),
    mk('hes_before_key', 'Hesitation before key words', delta.beforeKeyWords, 'Problematic segments before salient words.'),
    mk('hes_before_verb', 'Hesitation before verbs', delta.beforeVerbs),
    mk('hes_before_prep', 'Hesitation before prepositions', delta.beforePrepositions),
    mk('hes_before_q', 'Hesitation before question openers', delta.beforeQuestionOpeners),
  ].filter(Boolean) as SessionInsightHesitation[]
}
