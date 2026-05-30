import type { ExamSessionRecord } from '@/lib/exam-system/types'
import { getExamProfile } from '@/lib/exam-system/examProfileRegistry'
import type { SessionActivityEvent } from '@/store/sessionActivityStore'
import {
  APP_EXAM_SIMULATION_REPORT,
  APP_EXAM_SIMULATION_RUN,
  APP_EXAM_SIMULATION_SETUP,
  APP_EXAM_SYSTEM,
  APP_EXAM_TRAIN_SETUP,
  APP_EXAM_TRAINING_REPORT,
  APP_EXAM_TRAINING_RUN,
} from '@/lib/routing/appRoutes'

export type ExamHistoryFilterState = {
  runMode: 'all' | 'simulation' | 'training'
  level: 'all' | 'A1' | 'A2' | 'B1'
  profileId: 'all' | string
  datePreset: 'all' | '7d' | '30d'
}

export function defaultExamHistoryFilters(): ExamHistoryFilterState {
  return { runMode: 'all', level: 'all', profileId: 'all', datePreset: 'all' }
}

export function filterExamSessions(sessions: ExamSessionRecord[], f: ExamHistoryFilterState): ExamSessionRecord[] {
  const now = Date.now()
  const minT =
    f.datePreset === '7d'
      ? now - 7 * 86400_000
      : f.datePreset === '30d'
        ? now - 30 * 86400_000
        : null
  return sessions.filter((s) => {
    if (f.runMode !== 'all' && s.mode !== f.runMode) return false
    if (f.level !== 'all' && s.level !== f.level) return false
    if (f.profileId !== 'all' && s.profileId !== f.profileId) return false
    if (minT != null && Date.parse(s.updatedAt) < minT) return false
    return true
  })
}

export function examSimulationRunHref(sessionId: string): string {
  return `${APP_EXAM_SIMULATION_RUN}?id=${encodeURIComponent(sessionId)}`
}

export function examTrainingRunHref(sessionId: string): string {
  return `${APP_EXAM_TRAINING_RUN}?id=${encodeURIComponent(sessionId)}`
}

function readinessBandLabel(band: string): string {
  switch (band) {
    case 'ready':
      return 'Ready'
    case 'borderline':
      return 'Borderline'
    case 'not_ready':
      return 'Not ready'
    default:
      return band.replace(/_/g, ' ')
  }
}

export function examSessionSummaryLine(s: ExamSessionRecord): string {
  if (s.mode === 'simulation' && s.report?.kind === 'simulation') {
    const notes = s.report.readinessConfidenceNotes?.[0]?.trim()
    const band = readinessBandLabel(s.report.readinessBand)
    return notes ? `${band} · ${notes}` : `${band} · Overall ${Math.round(s.report.overallScore01 * 100)}%`
  }
  if (s.mode === 'training' && s.report?.kind === 'training') {
    const drill = s.report.bestNextDrill?.trim() || s.report.nextBestTrainingAction?.trim()
    const q = Math.round(s.report.qualityScore01 * 100)
    if (drill) return `Session quality ${q}% · ${drill}`
    return `Session quality ${q}% · ${s.report.improvedDimensions.length} dimensions up`
  }
  if (s.status === 'in_progress') {
    const n = s.tasks.length
    const done = new Set(s.attempts.map((a) => a.taskId)).size
    return n ? `Progress · ${done}/${n} tasks touched` : 'In progress'
  }
  if (s.status === 'abandoned') return 'Left early — open hub to start fresh.'
  return s.scope === 'full' ? 'Full run' : 'Section run'
}

export function examSessionFootNote(s: ExamSessionRecord): string | null {
  if (typeof s.progressionXpAwarded === 'number' && s.progressionXpAwarded > 0) {
    return `+${s.progressionXpAwarded} XP`
  }
  return null
}

export function examSessionCardTitle(profileTitle: string | undefined, s: ExamSessionRecord): string {
  return profileTitle?.trim() || s.profileId.replace(/_/g, ' ')
}

export function examSessionCardSubtitle(profileTitle: string | undefined, s: ExamSessionRecord): string {
  const examLabel = profileTitle?.trim() || s.profileId
  const mode = s.mode === 'simulation' ? 'Simulation' : 'Training'
  const scope = s.scope === 'full' ? 'Full' : 'Section'
  const support = s.trainingSupport ? ` · ${s.trainingSupport.replace(/_/g, ' ')}` : ''
  return `${examLabel} · ${mode} · ${scope} · ${s.level}${s.mode === 'training' ? support : ''}`
}

export type ExamSessionHistoryStatus = 'paused' | 'active' | 'ended' | 'saved'

export function examSessionHistoryStatus(s: ExamSessionRecord): ExamSessionHistoryStatus {
  if (s.status === 'in_progress') return 'active'
  if (s.status === 'draft') return 'paused'
  return 'ended'
}

export function examSessionPrimaryAction(s: ExamSessionRecord): { label: string; href: string } {
  if (s.status === 'completed' && s.report) {
    return {
      label: 'View report',
      href:
        s.mode === 'simulation'
          ? `${APP_EXAM_SIMULATION_REPORT}?id=${encodeURIComponent(s.id)}`
          : `${APP_EXAM_TRAINING_REPORT}?id=${encodeURIComponent(s.id)}`,
    }
  }
  if (s.status === 'in_progress') {
    return {
      label: 'Continue',
      href: s.mode === 'simulation' ? examSimulationRunHref(s.id) : examTrainingRunHref(s.id),
    }
  }
  return { label: 'Open Fluent Exam', href: APP_EXAM_SYSTEM }
}

export function examSessionSecondaryAction(s: ExamSessionRecord): { label: string; href: string } | null {
  if (s.status === 'in_progress' && (s.mode === 'simulation' || s.mode === 'training')) {
    return { label: 'Exam hub', href: APP_EXAM_SYSTEM }
  }
  if (s.status === 'completed' && s.report) {
    return { label: 'Run again', href: s.mode === 'simulation' ? APP_EXAM_SIMULATION_SETUP : APP_EXAM_TRAIN_SETUP }
  }
  return null
}

export function examSessionModality(s: ExamSessionRecord): 'exam_simulation' | 'exam_training' {
  return s.mode === 'simulation' ? 'exam_simulation' : 'exam_training'
}

export function buildExamSessionActivityPayload(
  s: Pick<ExamSessionRecord, 'id' | 'profileId' | 'level' | 'mode' | 'scope'>,
  xpAwarded?: number | null,
): Omit<SessionActivityEvent, 'id' | 'at'> {
  const title = getExamProfile(s.profileId)?.title ?? s.profileId.replace(/_/g, ' ')
  return {
    kind: s.mode === 'simulation' ? 'exam_simulation' : 'exam_training',
    title,
    mode: `${s.level} · ${s.scope === 'full' ? 'Full' : 'Section'}`,
    outcome: typeof xpAwarded === 'number' && xpAwarded > 0 ? `+${xpAwarded} XP` : undefined,
    note: s.id,
  }
}
