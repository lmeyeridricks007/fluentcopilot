'use client'

import { enqueueReviewForSchemaLesson, recordWeakSelfCheckTags } from '@/features/curriculum/a2ReviewStore'
import { ingestLessonReviewMaterialClient } from '@/lib/review-engine/integration'
import { processPracticeScenarioCompletion } from '@/lib/practice-progress/practiceProgressService'
import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'
import type { Tier } from '@/features/entitlements/EntitlementContext'
import type { SessionOutcome } from '@/lib/practice-feedback/types'
import type { PracticeFeedbackSideEffects } from '@/lib/practice-feedback/types'

/**
 * Client-side hooks after feedback is computed: legacy SRS queue, Stage-4 bank, weak tags,
 * then unified practice → retention (XP, streak, missions, milestones, unlocks, mastery).
 */
const DEDUPE_PREFIX = 'lt-practice-fx-ts-'

export function applyPracticeFeedbackClientEffects(opts: {
  scenarioId: string
  mode: PracticeConversationMode
  outcome: SessionOutcome
  sideEffects: PracticeFeedbackSideEffects
  confidencePercent: number
  tier: Tier
}): number | undefined {
  if (typeof window === 'undefined') return undefined
  const dedupeKey = `${DEDUPE_PREFIX}${opts.scenarioId}`
  const now = Date.now()
  const prev = Number(sessionStorage.getItem(dedupeKey) ?? '0')
  if (prev && now - prev < 5000) return undefined
  sessionStorage.setItem(dedupeKey, String(now))

  const lessonId = `practice-${opts.scenarioId}`
  const { reviewLemmas, reviewVocabEntries, reviewGrammarLabel, weakTags } = opts.sideEffects

  if (reviewLemmas.length > 0 || reviewGrammarLabel) {
    enqueueReviewForSchemaLesson(lessonId, reviewLemmas, reviewGrammarLabel)
  }
  recordWeakSelfCheckTags(weakTags.length > 0 ? weakTags : undefined)

  if (reviewLemmas.length > 0 || reviewGrammarLabel) {
    // Prefer the rich `{ lemma, translation }` payload (carries English meaning) so SRS
    // cards can ask "Recall the Dutch word for 'X'." instead of a context-less prompt.
    const vocab = reviewVocabEntries?.length ? reviewVocabEntries : reviewLemmas
    ingestLessonReviewMaterialClient(lessonId, vocab, reviewGrammarLabel)
  }

  const result = processPracticeScenarioCompletion({
    scenarioId: opts.scenarioId,
    mode: opts.mode,
    outcome: opts.outcome,
    confidencePercent: opts.confidencePercent,
    tier: opts.tier,
    sideEffects: opts.sideEffects,
  })
  return result.xpGained
}
