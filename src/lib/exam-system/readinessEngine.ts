import type { ExamProfile, ExamSessionRecord, ReadinessSnapshot } from './types'
import { aggregateAttempts, meanComposite01 } from './scoringEngine'

function variance(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = xs.reduce((a, b) => a + b, 0) / xs.length
  return xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length
}

function completedSims(sessions: ExamSessionRecord[]) {
  return sessions.filter((s) => s.mode === 'simulation' && s.status === 'completed' && s.report?.kind === 'simulation')
}

function completedTrains(sessions: ExamSessionRecord[]) {
  return sessions.filter((s) => s.mode === 'training' && s.status === 'completed')
}

/** Mean simulation outcome score (from reports, 0–1). */
function simulationOutcomeMean(sessions: ExamSessionRecord[]): number | null {
  const sims = completedSims(sessions)
  if (!sims.length) return null
  const xs = sims.map((s) => (s.report?.kind === 'simulation' ? s.report.readinessScore01 : 0))
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

/** Training ceiling: average attempt quality across recent training (cap so it cannot dominate sim). */
function trainingEvidenceMean(sessions: ExamSessionRecord[]): number | null {
  const trains = completedTrains(sessions)
  if (!trains.length) return null
  const parts = trains.map((s) => meanComposite01(s.attempts)).filter((x) => x > 0)
  if (!parts.length) return null
  return parts.reduce((a, b) => a + b, 0) / parts.length
}

/** Dimensions that stay weak across the last few mixed sessions (structured signal). */
function persistentWeaknesses(sessions: ExamSessionRecord[], maxSessions = 5): string[] {
  const recent = [...sessions]
    .filter((s) => s.status === 'completed' && (s.mode === 'simulation' || s.mode === 'training'))
    .sort((a, b) => Date.parse(b.completedAt ?? b.updatedAt) - Date.parse(a.completedAt ?? a.updatedAt))
    .slice(0, maxSessions)
  const dimScores: Record<string, number[]> = {}
  for (const s of recent) {
    const agg =
      s.report?.kind === 'simulation' && Object.keys(s.report.dimensionAverages).length
        ? s.report.dimensionAverages
        : aggregateAttempts(s.attempts)
    for (const [d, v] of Object.entries(agg)) {
      if (typeof v !== 'number') continue
      if (!dimScores[d]) dimScores[d] = []
      dimScores[d].push(v)
    }
  }
  const weak: string[] = []
  for (const [dim, vals] of Object.entries(dimScores)) {
    if (vals.length < 2) continue
    const m = vals.reduce((a, b) => a + b, 0) / vals.length
    if (m < 0.52 && vals.filter((x) => x < 0.55).length >= Math.ceil(vals.length * 0.6)) {
      weak.push(dim)
    }
  }
  return weak.slice(0, 4)
}

export type ReadinessComputeOptions = {
  /** Optional Talk/skills snapshot — low trust by default so it nudges, not decides. */
  skillProfile?: { strengths: string[]; focusAreas: string[]; trust01?: number }
}

/**
 * Evidence-aware readiness:
 * - Primary: recent **simulation** outcomes (exam-like).
 * - Secondary: **training** volume/quality ceiling (cannot replace missing sim evidence).
 * - Penalty: **persistent weaknesses** across sessions.
 * - Optional: **skill profile** nudge when trusted.
 */
export function computeReadiness(
  profile: ExamProfile,
  recentSessions: ExamSessionRecord[],
  options?: ReadinessComputeOptions,
): ReadinessSnapshot {
  const thr = profile.ui.passReadiness
  const rationale: string[] = []
  const sims = completedSims(recentSessions)
  const trains = completedTrains(recentSessions)
  const simMean = simulationOutcomeMean(recentSessions)
  const trainMean = trainingEvidenceMean(recentSessions)
  const pWeak = persistentWeaknesses(recentSessions)

  let score01 = 0.38
  if (simMean != null) {
    score01 = simMean * 0.78
    rationale.push(`Simulation evidence (${sims.length} run(s)): mean outcome ${simMean.toFixed(2)} → weighted 78% = ${(simMean * 0.78).toFixed(2)}.`)
  } else {
    rationale.push('No completed simulation on this profile yet — readiness is capped without exam-like evidence.')
    score01 = trainMean != null ? Math.min(0.52, trainMean * 0.45) : 0.35
    if (trainMean != null) {
      rationale.push(`Training-only proxy (capped): training quality mean ${trainMean.toFixed(2)} × 0.45, max 0.52.`)
    }
  }

  if (trainMean != null && simMean != null) {
    const lift = Math.max(0, trainMean - simMean) * 0.12
    score01 += lift
    rationale.push(`Training vs sim gap bonus: +${lift.toFixed(3)} (formative practice above sim bar).`)
  } else if (trainMean != null && simMean == null) {
    rationale.push('Training sessions do not replace a simulation for “ready” state.')
  }

  if (pWeak.length) {
    const pen = Math.min(0.12, pWeak.length * 0.035)
    score01 -= pen
    rationale.push(`Persistent weakness penalty (${pWeak.join(', ')}): −${pen.toFixed(3)}.`)
  }

  const skill = options?.skillProfile
  if (skill?.focusAreas?.length && (skill.trust01 ?? 0.35) > 0) {
    const t = skill.trust01 ?? 0.35
    const pen = Math.min(0.06, skill.focusAreas.length * 0.015 * t)
    score01 -= pen
    rationale.push(`Skill profile focus areas (${skill.focusAreas.length}) at trust ${t.toFixed(2)}: −${pen.toFixed(3)}.`)
  }

  score01 = Math.max(0, Math.min(1, score01))

  let band: ReadinessSnapshot['band'] = 'not_ready'
  if (score01 >= thr.readyAbove) band = 'ready'
  else if (score01 >= thr.borderlineAbove) band = 'borderline'
  rationale.push(`Thresholds: ready ≥ ${thr.readyAbove.toFixed(2)}, borderline ≥ ${thr.borderlineAbove.toFixed(2)} → band "${band}".`)

  const recentSimScores = sims.map((s) => (s.report?.kind === 'simulation' ? s.report.readinessScore01 : 0))
  const v = variance(recentSimScores)
  let confidence: ReadinessSnapshot['confidence'] = 'medium'
  if (sims.length === 0 && trains.length < 2) {
    confidence = 'limited'
    rationale.push('Confidence: **limited** — need at least one simulation or more training history.')
  } else if (sims.length >= 3 && v < 0.02) {
    confidence = 'high'
    rationale.push('Confidence: **high** — ≥3 simulations with stable outcomes (low variance).')
  } else if (sims.length >= 2 || (sims.length >= 1 && trains.length >= 4)) {
    confidence = sims.length >= 2 && v < 0.04 ? 'high' : 'medium'
    rationale.push(
      confidence === 'high'
        ? 'Confidence: **high** — enough simulations plus consistent pattern.'
        : 'Confidence: **medium** — some simulation evidence; more runs will tighten the band.',
    )
  } else {
    confidence = 'limited'
    rationale.push('Confidence: **limited** — few simulation datapoints or high spread.')
  }

  const lastSim = sims[0]
  const lastRep = lastSim?.report
  const dimAvgFromReport =
    lastRep?.kind === 'simulation' && Object.keys(lastRep.dimensionAverages).length > 0
      ? lastRep.dimensionAverages
      : aggregateAttempts(lastSim?.attempts ?? [])
  const dims = Object.entries(dimAvgFromReport) as [string, number][]
  dims.sort((a, b) => b[1] - a[1])
  const strongest = dims[0]?.[0] ?? null
  const weakest = dims.length ? dims[dims.length - 1][0] : null

  const blockers: string[] = []
  if (weakest) blockers.push(`Weakest recent dimension: ${weakest}`)
  if (pWeak.length) blockers.push(`Persistent across sessions: ${pWeak.join(', ')}.`)
  if (band !== 'ready') blockers.push('Complete another timed simulation to move the exam-style signal.')

  return {
    band,
    confidence,
    score01,
    blockers,
    strongest,
    rationale,
    persistentWeaknesses: pWeak,
    simulationEvidenceCount: sims.length,
    trainingEvidenceCount: trains.length,
  }
}
