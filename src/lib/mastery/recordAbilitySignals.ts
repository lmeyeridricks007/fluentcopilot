'use client'

import { abilitiesTouchingScenario, abilitiesTouchingSkillTrack } from '@/lib/mastery/abilityMapper'
import { ABILITY_DEFINITIONS } from '@/lib/mastery/abilityRegistry'
import type { ExamSessionRecord } from '@/lib/exam-system/types'
import { abilityIdsFromExamSession, examSessionCompositeQuality } from '@/lib/exam-system/examPersonalizationBridge'
import type { SkillTrackId } from '@/lib/schemas/practice/skillTrack.schema'
import {
  defaultSnapshot,
  loadAbilityMasteryState,
  saveAbilityMasteryState,
} from '@/lib/mastery/abilityMasteryStorage'
import { getRetentionUserId } from '@/lib/retention/retentionService'

function outcomeToQuality(outcome: string): number {
  if (outcome === 'success') return 0.86
  if (outcome === 'partial') return 0.58
  if (outcome === 'needs_practice') return 0.38
  return 0.52
}

function mergeSnapshot(
  prev: ReturnType<typeof defaultSnapshot>,
  quality: number,
  alpha: number
): ReturnType<typeof defaultSnapshot> {
  const base = prev.emaQuality ?? 0.4
  const next = base * (1 - alpha) + quality * alpha
  const hist = [...(prev.scoreHistory ?? []).slice(-11), Math.round(next * 1000) / 1000]
  return {
    emaQuality: Math.round(next * 1000) / 1000,
    touchCount: prev.touchCount + 1,
    lastPracticedAt: new Date().toISOString(),
    scoreHistory: hist,
  }
}

export function recordAbilityScenarioSignal(input: {
  userId?: string
  scenarioId: string
  outcome: string
}): void {
  const userId = input.userId ?? getRetentionUserId()
  const defs = abilitiesTouchingScenario(input.scenarioId)
  if (defs.length === 0) return
  const q = outcomeToQuality(input.outcome)
  const state = loadAbilityMasteryState(userId)
  for (const def of defs) {
    const prev = state.byAbility[def.id] ?? defaultSnapshot()
    state.byAbility[def.id] = mergeSnapshot(prev, q, 0.28)
  }
  saveAbilityMasteryState(state)
}

export function recordAbilitySkillTrackSignal(input: {
  userId?: string
  trackId: string
  sessionScore: number
  passed: boolean
}): void {
  const userId = input.userId ?? getRetentionUserId()
  const defs = abilitiesTouchingSkillTrack(input.trackId as SkillTrackId)
  if (defs.length === 0) return
  const q = input.passed ? 0.48 + input.sessionScore * 0.42 : 0.3 + input.sessionScore * 0.35
  const state = loadAbilityMasteryState(userId)
  for (const def of defs) {
    const prev = state.byAbility[def.id] ?? defaultSnapshot()
    state.byAbility[def.id] = mergeSnapshot(prev, q, 0.14)
  }
  saveAbilityMasteryState(state)
}

/** After review — gently maintains abilities you’ve already practiced. */
/** Nudge practical abilities based on Fluent Exam aggregate + task-type map (client local mastery). */
export function recordAbilityExamSessionSignal(input: { userId?: string; session: ExamSessionRecord }): void {
  const userId = input.userId ?? getRetentionUserId()
  const q = examSessionCompositeQuality(input.session)
  if (q == null) return
  const rawIds = abilityIdsFromExamSession(input.session)
  const defs = ABILITY_DEFINITIONS.filter((a) => rawIds.includes(a.id))
  if (defs.length === 0) return
  const state = loadAbilityMasteryState(userId)
  const alpha = 0.12
  for (const def of defs) {
    const prev = state.byAbility[def.id] ?? defaultSnapshot()
    state.byAbility[def.id] = mergeSnapshot(prev, q, alpha)
  }
  saveAbilityMasteryState(state)
}

export function recordAbilityReviewSignal(userId: string, accuracy: number): void {
  const state = loadAbilityMasteryState(userId)
  const bump = 0.035 * Math.min(1, Math.max(0, accuracy))
  let changed = false
  for (const id of Object.keys(state.byAbility)) {
    const row = state.byAbility[id]
    if (!row || row.touchCount < 1) continue
    const prev = row.emaQuality ?? 0.45
    const next = Math.min(0.97, prev * 0.94 + bump)
    state.byAbility[id] = {
      ...row,
      emaQuality: Math.round(next * 1000) / 1000,
      scoreHistory: [...(row.scoreHistory ?? []).slice(-11), next],
    }
    changed = true
  }
  if (changed) saveAbilityMasteryState(state)
}
