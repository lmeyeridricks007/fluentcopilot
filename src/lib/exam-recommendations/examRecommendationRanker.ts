/**
 * Rank and pick ≤3 recommendations with diversity (scenario / drill / lesson / review).
 */
import type {
  ExamRecCandidate,
  ExamRecommendation,
  ExamRecommendationInput,
  ExamRecommendationKind,
} from '@/lib/exam-recommendations/types'

function scoreBand(input: ExamRecommendationInput): 'strong' | 'ok' | 'weak' {
  if (input.pass && input.normalizedPercent >= 85) return 'strong'
  if (input.pass && input.normalizedPercent >= 70) return 'ok'
  return 'weak'
}

function applyRecencyPenalty(c: ExamRecCandidate, input: ExamRecommendationInput): ExamRecCandidate {
  let s = c.score
  if (c.kind === 'scenario' && (input.recentScenarioIds ?? []).includes(c.targetId)) s -= 26
  if (c.kind === 'drill' && (input.recentTrackIds ?? []).includes(c.targetId)) s -= 20
  return { ...c, score: s }
}

function kindOrder(input: ExamRecommendationInput): ExamRecommendationKind[] {
  const needsSupport = !input.pass || input.normalizedPercent < 82
  const execWeak =
    input.weakRubricKeys?.includes('execution') ||
    input.weakRubricKeys?.includes('task_execution')
  const grammarWeak = input.weakRubricKeys?.includes('grammar') || input.weakRubricKeys?.includes('spelling')

  if (!needsSupport) {
    return ['scenario', 'drill', 'review']
  }
  if (grammarWeak && (input.examType === 'speaking' || input.examType === 'writing')) {
    return ['lesson', 'drill', 'scenario']
  }
  if (execWeak && (input.examType === 'speaking' || input.examType === 'writing')) {
    return ['scenario', 'drill', 'lesson']
  }
  if (input.examType === 'listening' || input.examType === 'reading') {
    return ['drill', 'scenario', 'lesson']
  }
  if (input.examType === 'kmn') {
    return ['drill', 'lesson', 'scenario']
  }
  return ['drill', 'scenario', 'lesson']
}

export function rankExamRecommendationCandidates(
  input: ExamRecommendationInput,
  candidates: ExamRecCandidate[]
): { recommendations: ExamRecommendation[]; scoreBand: 'strong' | 'ok' | 'weak' } {
  const band = scoreBand(input)
  const sorted = [...candidates].map((c) => applyRecencyPenalty(c, input)).sort((a, b) => b.score - a.score)

  const picked: ExamRecCandidate[] = []
  const usedTarget = new Set<string>()
  const order = kindOrder(input)

  for (const kind of order) {
    const next = sorted.find((c) => c.kind === kind && !usedTarget.has(`${c.kind}:${c.targetId}`))
    if (next) {
      usedTarget.add(`${next.kind}:${next.targetId}`)
      picked.push(next)
    }
    if (picked.length >= 3) break
  }

  for (const c of sorted) {
    if (picked.length >= 3) break
    const key = `${c.kind}:${c.targetId}`
    if (usedTarget.has(key)) continue
    usedTarget.add(key)
    picked.push(c)
  }

  const recommendations: ExamRecommendation[] = picked.slice(0, 3).map((c, i) => ({
    kind: c.kind,
    targetId: c.targetId,
    title: c.title,
    reason: c.reason,
    rationaleSource: c.rationaleSource,
    priority: (i + 1) as 1 | 2 | 3,
    estimatedMinutes: c.estimatedMinutes,
    href: c.href,
    ctaLabel: c.ctaLabel,
  }))

  return { recommendations, scoreBand: band }
}
