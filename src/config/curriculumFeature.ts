/**
 * Curriculum path UI (E-16) — client-safe flag.
 * Set NEXT_PUBLIC_CURRICULUM_PATH_UI=false to hide Path / Today / Revision surfaces.
 */
export function isCurriculumPathUiEnabled(): boolean {
  if (typeof process === 'undefined') return true
  return process.env.NEXT_PUBLIC_CURRICULUM_PATH_UI !== 'false'
}

/**
 * When true, learners cannot open lessons in a higher A2 band until all lessons
 * in earlier bands are marked completed (demo progress store).
 */
export function isCurriculumSequentialUnlockEnabled(): boolean {
  if (typeof process === 'undefined') return false
  return process.env.NEXT_PUBLIC_CURRICULUM_SEQUENTIAL === 'true'
}

/**
 * When **true**, a path module (e.g. Food & shopping) stays locked until every lesson in
 * all **earlier** registered modules is completed.
 *
 * **Demo default:** unset or `false` — all shipped modules are open so reviewers can jump anywhere.
 * **Go-live:** set `NEXT_PUBLIC_CURRICULUM_PATH_MODULE_GATING=true` in production env.
 */
export function isCurriculumPathModuleGatingEnabled(): boolean {
  if (typeof process === 'undefined') return false
  return process.env.NEXT_PUBLIC_CURRICULUM_PATH_MODULE_GATING === 'true'
}
