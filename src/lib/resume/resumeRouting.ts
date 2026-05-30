import { removeAutosaveDraft } from '@/lib/autosave/autosaveStorage'
import { clearSchemaLessonCheckpoint } from '@/lib/storage/schemaLessonCheckpoint'
import type { ResumeRestartPayload } from './resumeTypes'

/** Clears draft/checkpoint only — caller navigates (e.g. same route for fresh start). */
export function executeResumeRestart(userId: string, payload: ResumeRestartPayload): void {
  if (!userId) return
  if (payload.type === 'lesson') {
    clearSchemaLessonCheckpoint(userId, payload.lessonId)
    return
  }
  removeAutosaveDraft(userId, payload.logicalKey, payload.domain, payload.entityId, 'restart')
}
