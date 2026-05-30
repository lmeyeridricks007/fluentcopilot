/**
 * Map exam weaknesses → schema lesson entry points (curriculum spine).
 * Slugs match /app/learn/schema/[slug] routes.
 */
import type { ExamRecCandidate, ExamRecommendationInput } from '@/lib/exam-recommendations/types'

function lessonHref(slug: string): string {
  return `/app/learn/schema/${encodeURIComponent(slug)}`
}

export function lessonCandidatesForExam(input: ExamRecommendationInput): ExamRecCandidate[] {
  const out: ExamRecCandidate[] = []
  const weakG = input.weakRubricKeys?.includes('grammar')
  const weakExec = input.weakRubricKeys?.includes('execution') || input.weakRubricKeys?.includes('task_execution')
  const weakVocab = input.weakRubricKeys?.includes('vocabulary')

  const add = (
    slug: string,
    title: string,
    score: number,
    reason: string,
    rationaleSource: string
  ) => {
    out.push({
      kind: 'lesson',
      targetId: slug,
      title,
      reason,
      rationaleSource,
      estimatedMinutes: 18,
      href: lessonHref(slug),
      ctaLabel: 'Open lesson',
      score,
    })
  }

  if (input.examType === 'kmn' && input.kmnTopicId && !input.pass) {
    const map: Record<string, { slug: string; title: string }> = {
      healthcare: { slug: 'health-doctor', title: 'Health — doctor & basics' },
      work: { slug: 'work-professional', title: 'Work — practical Dutch' },
      government: { slug: 'government-administration', title: 'Government & administration' },
      culture: { slug: 'leisure-culture-conversations', title: 'Culture & daily conversations' },
    }
    const row = map[input.kmnTopicId]
    if (row) {
      add(row.slug, row.title, 66, 'Structured explanation for this KNM theme — then return to quiz/flashcards.', 'kmn_topic_lesson')
    }
  }

  if (weakG && (input.examType === 'speaking' || input.examType === 'writing')) {
    add(
      'people-daily',
      'People & daily life',
      62,
      'Rebuild core grammar patterns in guided steps — complements short exam answers.',
      'low_grammar'
    )
  }

  if (weakExec && input.examType === 'writing') {
    add(
      'plans-social',
      'Plans & social messages',
      58,
      'Practical message structure — helpful when bullets or reasons were incomplete.',
      'low_writing_execution'
    )
  }

  if (weakVocab && input.examType === 'speaking') {
    add(
      'transport-getting-around',
      'Transport & getting around',
      52,
      'Thematic vocabulary you can reuse in many exam prompts.',
      'low_speaking_vocabulary'
    )
  }

  if (input.examType === 'reading' && input.readingSkill === 'comprehension') {
    add(
      'food-shopping',
      'Food & shopping',
      50,
      'Short practical texts — good bridge from exam reading to real notices.',
      'reading_comprehension_lesson'
    )
  }

  if (input.examType === 'listening' && input.listeningQuestionType === 'detail') {
    add(
      'unexpected-situations-problem-solving',
      'Unexpected situations',
      48,
      'Follow practical exchanges step by step — supports detail listening.',
      'listening_detail_lesson'
    )
  }

  return out
}
