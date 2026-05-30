/**
 * Map exam outcomes → practice scenario candidates (catalog ids).
 */
import { getScenarioCatalogEntries, getScenarioCatalogEntry } from '@/lib/practice/scenarioCatalog'
import { weakAreaPatternsMatchUserTags } from '@/lib/practice/recommendationSignals'
import type { A2WeakTagCount } from '@/features/curriculum/a2ReviewStore'
import type { ExamRecCandidate, ExamRecommendationInput } from '@/lib/exam-recommendations/types'

function scenarioHref(id: string): string {
  return `/app/practice/guided/${encodeURIComponent(id)}`
}

function weakTagsAsCounts(tags: string[]): A2WeakTagCount[] {
  return tags.map((tag) => ({ tag, wrongCount: 1 }))
}

function boostFromCatalogPatterns(input: ExamRecommendationInput): { id: string; boost: number }[] {
  const entries = getScenarioCatalogEntries()
  const weak = weakTagsAsCounts(input.weakTags)
  const out: { id: string; boost: number }[] = []
  for (const e of entries) {
    if (weakAreaPatternsMatchUserTags(e.weakAreaTagPatterns, weak)) {
      out.push({ id: e.id, boost: 22 })
    }
  }
  return out
}

function speakingGroupToScenarioId(group: string | undefined): string {
  switch (group) {
    case 'health':
      return 'doctor'
    case 'transport':
      return 'train'
    case 'shopping':
      return 'supermarket_shop'
    case 'work':
      return 'problem_solving'
    case 'daily_life':
    case 'family':
    case 'hobbies':
    case 'weather':
    case 'dutch_life':
    default:
      return 'cafe'
  }
}

function writingSubtypeToScenarioId(sub: string | undefined): string {
  switch (sub) {
    case 'form':
      return 'municipality'
    case 'message':
      return 'doctor'
    case 'text_to_audience':
      return 'problem_solving'
    default:
      return 'municipality'
  }
}

export function scenarioCandidatesForExam(input: ExamRecommendationInput): ExamRecCandidate[] {
  const catalog = getScenarioCatalogEntries()
  const byId = (id: string) => catalog.find((s) => s.id === id)
  const push = (
    id: string,
    score: number,
    reason: string,
    rationaleSource: string,
    ctaLabel = 'Start guided practice'
  ): ExamRecCandidate | null => {
    const e = byId(id) ?? getScenarioCatalogEntry(id)
    if (!e) return null
    return {
      kind: 'scenario',
      targetId: id,
      title: e.title,
      reason,
      rationaleSource,
      estimatedMinutes: e.estimatedMinutes,
      href: scenarioHref(id),
      ctaLabel,
      score,
    }
  }

  const out: ExamRecCandidate[] = []
  const tagBoosts = boostFromCatalogPatterns(input)
  const boostById = new Map(tagBoosts.map((x) => [x.id, x.boost]))

  if (input.examType === 'speaking') {
    const sid = speakingGroupToScenarioId(input.speakingScenarioGroupId)
    const base = 58
    const s =
      push(
        sid,
        base + (boostById.get(sid) ?? 0),
        'Your speaking theme matches this real-life setting — short turns with coaching.',
        'speaking_theme_match'
      ) ?? null
    if (s) out.push(s)
    const execWeak =
      input.weakRubricKeys?.includes('execution') || input.weakRubricKeys?.includes('task_execution')
    if (execWeak) {
      const alt = push(
        'problem_solving',
        52 + (boostById.get('problem_solving') ?? 0),
        'Practice staying clear when something goes wrong — good for exam-style structure under pressure.',
        'weak_execution'
      )
      if (alt) out.push(alt)
    }
  }

  if (input.examType === 'writing') {
    const sid = writingSubtypeToScenarioId(input.writingSubtype)
    const s =
      push(
        sid === 'work' ? 'municipality' : sid,
        56,
        'Apply the same polite, practical Dutch in a short conversation after your writing task.',
        'writing_subtype_bridge'
      ) ?? null
    if (s) out.push(s)
    const cle = input.weakRubricKeys?.includes('clearness') || input.weakRubricKeys?.includes('execution')
    if (cle) {
      const p = push(
        'municipality',
        50,
        'Formal requests and clear structure — similar to exam messages and forms.',
        'weak_writing_structure'
      )
      if (p) out.push(p)
    }
  }

  if (input.examType === 'listening') {
    if (input.listeningQuestionType === 'detail' || input.replayHeavy) {
      const t = push(
        'train',
        55,
        'Station-style listening and short questions — builds detail stamina.',
        'listening_detail_weak'
      )
      if (t) out.push(t)
    }
    if (input.listeningQuestionType === 'gist') {
      const c = push(
        'cafe',
        52,
        'Light, natural back-and-forth — good after missing the main idea.',
        'listening_gist_weak'
      )
      if (c) out.push(c)
    }
    const d = push(
      'doctor',
      48,
      'Short explanations and follow-ups — tight listening in a practical setting.',
      'listening_general'
    )
    if (d) out.push(d)
  }

  if (input.examType === 'reading') {
    if (input.readingSkill === 'scanning') {
      const sm = push(
        'supermarket_shop',
        54,
        'Quick info-finding in shops — like scanning a notice for the one fact you need.',
        'reading_scanning_weak'
      )
      if (sm) out.push(sm)
    } else {
      const h = push(
        'housing',
        52,
        'Longer practical turns — supports deeper comprehension habits.',
        'reading_comprehension_weak'
      )
      if (h) out.push(h)
    }
  }

  if (input.examType === 'kmn' && input.kmnTopicId && !input.pass) {
    const topic = input.kmnTopicId
    let sid = 'municipality'
    if (topic === 'healthcare') sid = 'doctor'
    else if (topic === 'work') sid = 'municipality'
    else if (topic === 'government') sid = 'municipality'
    else if (topic === 'culture') sid = 'social_plans'
    const k = push(
      sid,
      57,
      'Turn KNM knowledge into short spoken practice in a matching life area.',
      `kmn_topic_${topic}`
    )
    if (k) out.push(k)
  }

  for (const e of catalog) {
    const extra = boostById.get(e.id) ?? 0
    if (extra === 0) continue
    if (out.some((o) => o.targetId === e.id)) continue
    const c = push(
      e.id,
      40 + extra,
      'Matches patterns from your recent slips — short scenario reps.',
      'weak_tag_pattern'
    )
    if (c) out.push(c)
  }

  return out
}
