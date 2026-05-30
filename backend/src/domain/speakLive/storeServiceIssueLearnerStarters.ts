/**
 * Learner-facing Dutch starters for store / service issue (Speak Live hints).
 * Phrase banks live in {@link ./storeServiceIssueVocabularyPools}.
 */

import type { StoreServiceIssueSubtype, StoreServiceIssueVariation } from './storeServiceIssueScenario'
import { STORE_SERVICE_ISSUE_STARTER_PHRASES_BY_VARIATION_AND_LEVEL } from './storeServiceIssueVocabularyPools'

export type StoreServiceIssueLearnerLevel = 'A1' | 'A2' | 'B1'

export const STORE_SERVICE_ISSUE_LEARNER_STARTERS = STORE_SERVICE_ISSUE_STARTER_PHRASES_BY_VARIATION_AND_LEVEL as Record<
  StoreServiceIssueVariation,
  Record<StoreServiceIssueLearnerLevel, readonly string[]>
>

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

function adaptHintsForSubtype(subType: StoreServiceIssueSubtype | undefined, hints: string[]): string[] {
  if (!subType) return hints
  if (subType === 'service_issue') {
    return hints.map((h) => {
      if (h === 'Ik wil dit graag terugbrengen.') return 'Ik kom voor een probleem met mijn bestelling.'
      if (h === 'Het is te klein.') return 'De levering klopt niet.'
      return h
    })
  }
  if (subType === 'product_problem') {
    return hints.map((h) => {
      if (h === 'Ik wil dit graag terugbrengen.') return 'Ik heb een probleem met dit product.'
      if (h === 'Het is te klein.') return 'Het is kapot / werkt niet goed.'
      return h
    })
  }
  return hints
}

export function getStoreServiceIssueStarterHintsForRuntime(
  level: StoreServiceIssueLearnerLevel,
  variation?: StoreServiceIssueVariation,
  subType?: StoreServiceIssueSubtype
): string[] {
  const v = variation ?? 'returning_item'
  const bank = STORE_SERVICE_ISSUE_LEARNER_STARTERS[v] ?? STORE_SERVICE_ISSUE_LEARNER_STARTERS.returning_item
  const base = [...(bank[level] ?? bank.A2)]
  return dedupeHints(adaptHintsForSubtype(subType, base))
}
