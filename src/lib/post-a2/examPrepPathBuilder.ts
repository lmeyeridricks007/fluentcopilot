import type { ExamPrepPathPresentation } from '@/lib/post-a2/types'

/**
 * Option C — structured exam preparation (not generic “more practice”).
 */
export function buildExamPrepPathPresentation(): ExamPrepPathPresentation {
  return {
    phaseTitle: 'Exam preparation',
    phaseSubtitle: 'Inburgering & A2 exam skills',
    promise:
      'Train the same skills the exam tests — speaking, writing, listening, reading, and KNM — with readiness signals and fixed practice exams.',
    steps: [
      {
        id: 'modules',
        title: 'Skills by module',
        detail: 'Speaking, writing, listening, reading, and KNM each have training and simulations.',
      },
      {
        id: 'practice_exams',
        title: 'Fixed practice exams',
        detail: 'Full sets that mirror exam pacing — compare attempts and see improvement.',
      },
      {
        id: 'readiness',
        title: 'Readiness indicators',
        detail: 'See where you are exam-ready and what still needs honest reps.',
      },
    ],
    primaryCtaLabel: 'Open exam preparation',
    secondaryCtaLabel: 'Speaking exam prep',
  }
}
