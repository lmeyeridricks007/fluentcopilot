import type { ExamLevel, ExamProfile, ExamScope } from './types'
import { pickSectionsForMode } from './profileRegistry/blueprintAccess'
import { generateExamTasks } from './taskGenerator'

export type SimulationRunPreview = {
  taskCount: number
  /** Wall-clock sum of prep + answer seconds for generated instances (level-adjusted). */
  estimatedSeconds: number
  sectionTitlesById: Record<string, string>
}

export function computeSimulationRunPreview(params: {
  profile: ExamProfile
  level: ExamLevel
  scope: ExamScope
  sectionId?: string
}): SimulationRunPreview {
  const tasks = generateExamTasks({
    profile: params.profile,
    level: params.level,
    mode: 'simulation',
    scope: params.scope,
    sectionId: params.sectionId,
    sessionSeed: 'preview-static',
  })
  const estimatedSeconds = tasks.reduce((sum, t) => sum + t.prepSeconds + t.answerSeconds, 0)
  const sections = pickSectionsForMode(params.profile, 'simulation')
  const sectionTitlesById = Object.fromEntries(sections.map((s) => [s.id, s.title]))
  return {
    taskCount: tasks.length,
    estimatedSeconds,
    sectionTitlesById,
  }
}

/** Short lines for setup screen — top weighted scoring dimensions. */
export function formatSimulationScoringSummary(profile: ExamProfile, maxLines = 5): string[] {
  const cw = profile.scoring.coreWeights
  const lines = Object.entries(cw)
    .filter(([, v]) => typeof v === 'number' && v > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, maxLines)
    .map(([k, v]) => {
      const label = k.replace(/_/g, ' ')
      return `${label} · weight ${(v as number).toFixed(2)}`
    })
  const strict = profile.scoring.strictnessSimulation
  return [`Simulation strictness ×${strict.toFixed(2)} (stricter than training).`, ...lines]
}

export function formatDurationMmSs(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}
