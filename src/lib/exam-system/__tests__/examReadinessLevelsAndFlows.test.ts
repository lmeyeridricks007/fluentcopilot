import { describe, expect, it } from 'vitest'
import { getExamProfile } from '../examProfileRegistry'
import { generateExamTasks } from '../taskGenerator'
import { computeReadiness } from '../readinessEngine'
import { createExamSession, appendTaskAttempt, finalizeExamSession } from '../sessionLifecycle'
import { buildSimulationReport, buildTrainingReport } from '../reportBuilder'
function completeEveryTask(session: NonNullable<ReturnType<typeof createExamSession>>, answer: string) {
  let s = session
  for (const t of s.tasks) {
    const next = appendTaskAttempt(s, { taskId: t.id, answerText: answer, retriesUsed: 0 })
    expect(next).toBeTruthy()
    s = next!
  }
  return s
}

function buildCompletedSimSession() {
  const profile = getExamProfile('inburgering_speaking_v1')!
  let s = createExamSession({
    userId: 'u-readiness',
    profileId: profile.examId,
    level: 'A2',
    mode: 'simulation',
    scope: 'section',
    sectionId: 'a2_speaking_part1',
  })!
  s = completeEveryTask(
    s,
    'Ik geef een uitgebreid antwoord met meerdere zinnen zodat de scoring engine voldoende tekst heeft om te beoordelen.',
  )
  return finalizeExamSession(s)!
}

describe('level differences (A1 / A2 / B1)', () => {
  it('tags every generated task with the requested level', () => {
    const profile = getExamProfile('inburgering_speaking_v1')!
    for (const level of ['A1', 'A2', 'B1'] as const) {
      const tasks = generateExamTasks({
        profile,
        level,
        mode: 'simulation',
        scope: 'section',
        sectionId: 'a2_speaking_part1',
        sessionSeed: `lvl-${level}`,
      })
      expect(tasks.length).toBeGreaterThan(0)
      expect(tasks.every((t) => t.level === level)).toBe(true)
    }
  })

  it('changes prompt surface across levels for the same section', () => {
    const profile = getExamProfile('inburgering_speaking_v1')!
    const a1 = generateExamTasks({
      profile,
      level: 'A1',
      mode: 'simulation',
      scope: 'section',
      sectionId: 'a2_speaking_part1',
      sessionSeed: 'cmp-a1',
    })[0]
    const b1 = generateExamTasks({
      profile,
      level: 'B1',
      mode: 'simulation',
      scope: 'section',
      sectionId: 'a2_speaking_part1',
      sessionSeed: 'cmp-b1',
    })[0]
    expect(a1.promptNl).not.toBe(b1.promptNl)
  })
})

describe('readiness calculation with session evidence', () => {
  it('adds simulation evidence vs empty history', () => {
    const profile = getExamProfile('inburgering_speaking_v1')!
    const heavy = buildCompletedSimSession()
    const snapEmpty = computeReadiness(profile, [])
    const snapHeavy = computeReadiness(profile, [heavy])
    expect(snapEmpty.simulationEvidenceCount ?? 0).toBe(0)
    expect(snapHeavy.simulationEvidenceCount).toBeGreaterThanOrEqual(1)
    expect(['high', 'medium', 'limited']).toContain(snapHeavy.confidence)
  })

  it('uses training-only ceiling when no simulation exists', () => {
    const profile = getExamProfile('inburgering_speaking_v1')!
    let s = createExamSession({
      userId: 'u-train-only',
      profileId: profile.examId,
      level: 'A2',
      mode: 'training',
      scope: 'section',
      sectionId: 'a2_speaking_part1',
      trainingSupport: 'full_guidance',
    })!
    s = completeEveryTask(s, 'Een volledig antwoord met genoeg inhoud voor formatieve scoring in training.')
    const fin = finalizeExamSession(s)!
    const snap = computeReadiness(profile, [fin])
    expect(snap.rationale?.some((r) => r.toLowerCase().includes('simulation'))).toBe(true)
    expect(snap.trainingEvidenceCount).toBeGreaterThanOrEqual(1)
  })
})

describe('training flow + report', () => {
  it('builds training report with support-specific evidence notes', () => {
    const profile = getExamProfile('inburgering_speaking_v1')!
    let s = createExamSession({
      userId: 'u-train-rep',
      profileId: profile.examId,
      level: 'A2',
      mode: 'training',
      scope: 'section',
      sectionId: 'a2_speaking_part1',
      trainingSupport: 'almost_exam',
    })!
    s = completeEveryTask(
      s,
      'Ik train onder tijdsdruk met een volledig antwoord zodat we formatieve aggregatie kunnen testen.',
    )
    const fin = finalizeExamSession(s)!
    expect(fin.report?.kind).toBe('training')
    const tr = buildTrainingReport(fin, profile, 'almost_exam')
    expect(tr.kind).toBe('training')
    expect(tr.trainingSupport).toBe('almost_exam')
    expect(tr.sessionEvidenceNotes.some((n) => n.toLowerCase().includes('almost'))).toBe(true)
    expect(tr.readinessDelta01).toBe(0.03)
    expect(tr.bestNextDrill.length).toBeGreaterThan(10)
  })
})

describe('simulation report integration', () => {
  it('embeds next-training recommendation string', () => {
    const profile = getExamProfile('inburgering_speaking_v1')!
    const fin = buildCompletedSimSession()
    const rep = buildSimulationReport(fin, profile)
    expect(rep.nextTrainingRecommendation.length).toBeGreaterThan(12)
  })
})
