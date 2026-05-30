import type { InteractiveExercise } from './types'
import type { InteractiveBlockProgressRecord } from './interactivePackProgressTypes'
import { personalizedPackXpBand } from '@/lib/progression/personalizedPackXp'

export { personalizedPackXpBand }

/**
 * Small per-beat XP *preview* weights (informational). Real pack XP is still computed server-side
 * via {@link computePersonalizedPackXp} on finalize (stable session id + same-day decay).
 */
export function estimateBlockXpPreviewForKind(kind: InteractiveExercise['kind']): number {
  switch (kind) {
    case 'explanation_card':
      return 0
    case 'save_to_library_action':
    case 'reflection_check':
      return 1
    case 'multiple_choice_meaning':
    case 'multiple_choice_usage':
    case 'choose_best_phrase':
    case 'mini_dialogue_choice':
      return 2
    case 'hear_and_repeat':
    case 'pronunciation_rep':
    case 'scenario_jumpoff':
    case 'read_aloud_rep':
      return 2
    case 'fill_in_blank':
    case 'reorder_sentence':
    case 'build_a_sentence':
    case 'listening_burst':
      return 3
    case 'say_it_aloud':
      return 4
    case 'write_your_own_line':
    case 'record_and_compare':
      return 5
    default:
      return 1
  }
}

const HEAVY_KINDS = new Set<InteractiveExercise['kind']>([
  'write_your_own_line',
  'record_and_compare',
  'listening_burst',
  'read_aloud_rep',
])

export function isHeavyInteractiveKind(kind: InteractiveExercise['kind']): boolean {
  return HEAVY_KINDS.has(kind)
}

/** Sum preview XP for completed beats only (capped for display). */
export function sumCompletedInteractiveXpPreview(
  exercises: readonly InteractiveExercise[],
  blocks: Record<string, InteractiveBlockProgressRecord | undefined>,
  cap = 20,
): number {
  let sum = 0
  for (const ex of exercises) {
    const row = blocks[ex.id]
    if (!row || row.completionState !== 'completed') continue
    sum += estimateBlockXpPreviewForKind(ex.kind)
  }
  return Math.min(cap, sum)
}

export function countCompletedHeavyBlocks(
  exercises: readonly InteractiveExercise[],
  blocks: Record<string, InteractiveBlockProgressRecord | undefined>,
): number {
  let n = 0
  for (const ex of exercises) {
    if (!isHeavyInteractiveKind(ex.kind)) continue
    const row = blocks[ex.id]
    if (row?.completionState === 'completed') n += 1
  }
  return n
}

