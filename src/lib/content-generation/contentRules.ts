/**
 * Shared authoring rules for validation, generation prompts, and QA rubrics (Stage 5).
 * Single source of truth for numeric limits and taxonomy lists.
 */

export const CONTENT_FORMAT_VERSION = 1 as const

/** Max characters for mobile-first step prompts (soft limit — validator warns). */
export const MAX_STEP_PROMPT_CHARS = 220

/** Max characters for MCQ question stem. */
export const MAX_MCQ_QUESTION_CHARS = 280

/** Target lesson duration band (minutes) for A2 mobile sessions. */
export const LESSON_DURATION_MIN = 10
export const LESSON_DURATION_MAX = 20

/** Expected lessons per module when generating with AI (product band). */
export const MODULE_LESSON_TARGET_MIN = 10
export const MODULE_LESSON_TARGET_MAX = 12

/** Step types that count as receptive / input practice. */
export const INPUT_STEP_TYPES = new Set([
  'listening',
  'listen_read',
  'discovery',
  'mcq',
  'practice_loop',
  'reorder',
  'fill_blank',
])

/** Step types that count as productive output. */
export const OUTPUT_STEP_TYPES = new Set(['speaking', 'writing', 'scenario_chat'])

export const RECAP_STEP_TYPE = 'recap' as const

/** IDs should be kebab-case, no spaces (warn if violated). */
export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const NAMING_RULES_DOC = [
  'Use kebab-case ids: a2-m01-l03-goodbyes',
  'Prefix review items: rev-{lessonId}-vt-{vocabId} or rev-{lessonId}-gt-{grammarId}',
  'Grammar spine ids: dotted lowercase e.g. a2.1-present-tense',
] as const

export function isLikelyValidId(id: string): boolean {
  return ID_PATTERN.test(id)
}
