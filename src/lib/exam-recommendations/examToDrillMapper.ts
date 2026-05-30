/**
 * Map exam outcomes → skill tracks (drills) and KMN surfaces.
 */
import { getSkillTrackDefinition } from '@/lib/skill-tracks'
import type { ExamRecCandidate, ExamRecommendationInput } from '@/lib/exam-recommendations/types'

function trackHref(id: string): string {
  return `/app/practice/tracks/${encodeURIComponent(id)}`
}

function kmnDrillHref(topicId: string, surface: 'flashcards' | 'quiz'): string {
  return `/app/exam-prep/kmn/${encodeURIComponent(topicId)}/${surface}`
}

export function drillCandidatesForExam(input: ExamRecommendationInput): ExamRecCandidate[] {
  const out: ExamRecCandidate[] = []

  const addTrack = (
    id: string,
    score: number,
    reason: string,
    rationaleSource: string,
    titleOverride?: string
  ) => {
    const def = getSkillTrackDefinition(id)
    if (!def) return
    out.push({
      kind: 'drill',
      targetId: id,
      title: titleOverride ?? def.title,
      reason,
      rationaleSource,
      estimatedMinutes: def.estimatedMinutesPerSession,
      href: trackHref(id),
      ctaLabel: 'Open skill track',
      score,
    })
  }

  if (input.examType === 'speaking') {
    if (input.weakRubricKeys?.some((k) => k === 'fluency' || k === 'pronunciation')) {
      addTrack(
        'speaking_fluency',
        62,
        'Short prompts and rhythm — best next step when flow or clarity dipped.',
        'low_fluency_or_pronunciation'
      )
    }
    if (input.weakRubricKeys?.includes('grammar') || input.weakRubricKeys?.includes('clearness')) {
      addTrack(
        'conversation_repair',
        58,
        'Fix and clarify in one breath — supports grammar + structure under time.',
        'low_grammar_or_clearness_speaking'
      )
    }
    if (input.weakRubricKeys?.includes('vocabulary')) {
      addTrack(
        'reading_real_life',
        50,
        'Pick up practical words from tiny texts — feeds active vocabulary.',
        'low_vocabulary_speaking'
      )
    }
    addTrack(
      'speaking_fluency',
      44,
      'Keep exam pace with low-pressure speaking reps.',
      'speaking_default_drill'
    )
  }

  if (input.examType === 'writing') {
    if (input.weakRubricKeys?.includes('execution') || input.weakRubricKeys?.includes('clearness')) {
      addTrack(
        'writing_messages',
        60,
        'Polite, complete short messages — mirrors exam bullets and tone.',
        'low_writing_execution_structure'
      )
    }
    if (input.weakRubricKeys?.includes('grammar') || input.weakRubricKeys?.includes('spelling')) {
      addTrack(
        'writing_messages',
        58,
        'Tight sentences with feedback — grammar and spelling in context.',
        'low_writing_grammar_spelling'
      )
      addTrack(
        'conversation_repair',
        45,
        'Stock phrases and repairs — supports clear written lines too.',
        'writing_support_repair'
      )
    }
    addTrack(
      'reading_real_life',
      42,
      'Notice how native snippets are built — copy patterns into your writing.',
      'writing_default_drill'
    )
  }

  if (input.examType === 'listening') {
    if (input.listeningQuestionType === 'detail' || input.listeningQuestionType === 'intent') {
      addTrack(
        'listening_confidence',
        64,
        'Extra detail practice without a full chat — matches what you missed.',
        'listening_detail'
      )
    } else if (input.listeningQuestionType === 'gist') {
      addTrack(
        'listening_confidence',
        58,
        'Gist-first lines — rebuild confidence before harder clips.',
        'listening_gist'
      )
    } else {
      addTrack(
        'listening_confidence',
        55,
        'Short practical “heard” lines — steady progress for exam listening.',
        'listening_intent_or_general'
      )
    }
    if (input.replayHeavy) {
      addTrack(
        'listening_confidence',
        52,
        'Lighter drills so you rely less on replay in the exam.',
        'listening_replay_dependence'
      )
    }
  }

  if (input.examType === 'reading') {
    addTrack(
      'reading_real_life',
      input.readingSkill === 'scanning' ? 62 : 58,
      input.readingSkill === 'scanning'
        ? 'Fast signs and hours — trains scanning for the one fact.'
        : 'Short messages and notices — supports deeper reading habits.',
      input.readingSkill === 'scanning' ? 'reading_scanning' : 'reading_comprehension'
    )
  }

  if (input.examType === 'kmn' && input.kmnTopicId && !input.pass) {
    const t = input.kmnTopicId
    out.push({
      kind: 'drill',
      targetId: `kmn-${t}-flash`,
      title: `KNM — ${t} flashcards`,
      reason: 'Short spaced reps on this society topic — low friction after a miss.',
      rationaleSource: 'kmn_topic_gap',
      estimatedMinutes: 5,
      href: kmnDrillHref(t, 'flashcards'),
      ctaLabel: 'Review flashcards',
      score: 63,
    })
    out.push({
      kind: 'drill',
      targetId: `kmn-${t}-quiz`,
      title: `KNM — ${t} quiz`,
      reason: 'Quick checks to lock facts before longer study.',
      rationaleSource: 'kmn_quiz_followup',
      estimatedMinutes: 4,
      href: kmnDrillHref(t, 'quiz'),
      ctaLabel: 'Short quiz',
      score: 48,
    })
  }

  return out
}
