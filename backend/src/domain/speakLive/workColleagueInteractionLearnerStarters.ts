/**
 * Learner-facing Dutch starters for work / colleague interaction (Speak Live hints).
 * Phrase banks live in `workColleagueInteractionVocabularyPools.ts`.
 */

import type {
  WorkColleagueInteractionSubtype,
  WorkColleagueInteractionVariation,
} from './workColleagueInteractionScenario'
import {
  getWorkColleagueLearnerStarterPhrases,
  type WorkColleaguePoolLevel,
  type WorkColleagueVariationStarterKey,
} from './workColleagueInteractionVocabularyPools'

export type WorkColleagueInteractionLearnerLevel = WorkColleaguePoolLevel

function dedupeHints(lines: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const l of lines) {
    const k = l.trim().toLowerCase()
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(l.trim())
  }
  return out
}

function adaptForSubtype(subType: WorkColleagueInteractionSubtype | undefined, hints: string[]): string[] {
  if (!subType) return hints
  if (subType === 'manager_or_lead_request') {
    return hints.map((h) => {
      if (h.startsWith('Hoe gaat het')) return 'Dag — even kort: hoe sta je met dit stuk?'
      if (h.startsWith('Kun je mij') || h.startsWith('Kun je helpen')) return 'Ik loop vast — kun je me kort de weg wijzen?'
      return h
    })
  }
  if (subType === 'team_task') {
    return hints.map((h) => {
      if (h.startsWith('Waar is het')) return 'Wie pakt dit onderdeel op?'
      return h
    })
  }
  return hints
}

export function getWorkColleagueInteractionStarterHintsForRuntime(
  level: WorkColleagueInteractionLearnerLevel,
  variation?: WorkColleagueInteractionVariation,
  subType?: WorkColleagueInteractionSubtype
): string[] {
  const v = (variation ?? 'simple_workplace_conversation') as WorkColleagueVariationStarterKey
  const base = [...getWorkColleagueLearnerStarterPhrases(v, level)]
  return dedupeHints(adaptForSubtype(subType, base))
}
