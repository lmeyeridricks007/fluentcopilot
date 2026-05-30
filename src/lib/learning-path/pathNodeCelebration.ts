/** Session flag so the Learn path can play a one-shot “just completed” motion when the learner returns. */
export const PATH_NODE_CELEBRATION_LESSON_KEY = 'lt.path.celebrateLessonId'

export function schedulePathNodeCelebration(lessonId: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(PATH_NODE_CELEBRATION_LESSON_KEY, lessonId)
  } catch {
    /* ignore quota / private mode */
  }
}

export function peekPathNodeCelebrationLessonId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(PATH_NODE_CELEBRATION_LESSON_KEY)
  } catch {
    return null
  }
}

export function clearPathNodeCelebration(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(PATH_NODE_CELEBRATION_LESSON_KEY)
  } catch {
    /* ignore */
  }
}
