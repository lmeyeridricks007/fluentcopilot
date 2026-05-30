import type { GuidedScenarioDefinition, GuidedTurn } from '@/lib/schemas/practice/guidedScenarioDefinition.schema'

export interface GuidedDefinitionValidationError {
  code: string
  message: string
}

/**
 * Graph + authoring checks after Zod parse. Keeps UI/runtime assumptions explicit.
 */
export function validateGuidedDefinition(def: GuidedScenarioDefinition): GuidedDefinitionValidationError[] {
  const errors: GuidedDefinitionValidationError[] = []
  const turnById = new Map<string, GuidedTurn>()
  for (const t of def.turns) {
    if (turnById.has(t.id)) {
      errors.push({ code: 'duplicate_turn_id', message: `Duplicate turn id: ${t.id}` })
    }
    turnById.set(t.id, t)
  }

  if (!turnById.has(def.startTurnId)) {
    errors.push({ code: 'missing_start_turn', message: `startTurnId not found: ${def.startTurnId}` })
  }

  if (def.scenarioId !== def.scenarioId.trim()) {
    errors.push({ code: 'scenario_id_whitespace', message: 'scenarioId should not have leading/trailing space' })
  }

  for (const turn of def.turns) {
    const replyIds = new Set<string>()
    for (const r of turn.suggestedReplies) {
      if (replyIds.has(r.id)) {
        errors.push({ code: 'duplicate_reply_id', message: `Turn ${turn.id}: duplicate suggested reply id ${r.id}` })
      }
      replyIds.add(r.id)
    }

    if (turn.terminalAfterUser) {
      if (!turn.endOutcome) {
        errors.push({
          code: 'terminal_missing_outcome',
          message: `Turn ${turn.id}: terminalAfterUser requires endOutcome`,
        })
      }
    } else {
      const fb = turn.nextFallbackId
      if (!fb || !turnById.has(fb)) {
        errors.push({
          code: 'missing_fallback',
          message: `Turn ${turn.id}: nextFallbackId must reference an existing turn`,
        })
      }
      const map = turn.nextByReplyId ?? {}
      for (const v of Object.values(map)) {
        if (!turnById.has(v)) {
          errors.push({
            code: 'unknown_next_turn',
            message: `Turn ${turn.id}: nextByReplyId targets unknown turn "${v}"`,
          })
        }
      }
      const branchRules = turn.nextWhenCustomContains ?? []
      for (let i = 0; i < branchRules.length; i += 1) {
        const target = branchRules[i]!.nextId
        if (!turnById.has(target)) {
          errors.push({
            code: 'unknown_custom_branch_turn',
            message: `Turn ${turn.id}: nextWhenCustomContains[${i}] targets unknown turn "${target}"`,
          })
        }
      }
    }
  }

  return errors
}
