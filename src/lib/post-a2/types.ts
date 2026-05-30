/**
 * Post-A2 continuation — product state and view models (client-oriented).
 */

export type B1ReadinessLevel = 'ready' | 'nearly_ready' | 'strengthen_first'

/** Primary CTA emphasis — all three paths remain visible. */
export type PostA2NextOptionId = 'continue_b1' | 'a2_mastery' | 'exam_preparation'

export type ReadinessEvaluation = {
  level: B1ReadinessLevel
  headline: string
  body: string
  /** Short supportive line explaining the suggestion (no judgment). */
  reasonLine: string
}

export type PostA2PathStep = {
  id: string
  title: string
  detail: string
}

export type MasteryPathPresentation = {
  /** Product name for Option B */
  phaseTitle: string
  phaseSubtitle: string
  promise: string
  steps: PostA2PathStep[]
  primaryCtaLabel: string
  secondaryHint: string
}

/** Option C — exam-focused track (inburgering / A2 exam skills). */
export type ExamPrepPathPresentation = {
  phaseTitle: string
  phaseSubtitle: string
  promise: string
  steps: PostA2PathStep[]
  primaryCtaLabel: string
  secondaryCtaLabel: string
}

export type PostA2OptionCardModel = {
  id: PostA2NextOptionId
  eyebrow: string
  title: string
  body: string
  href: string
  ctaLabel: string
  variant: 'primary' | 'featured' | 'secondary'
  /** When this matches recommendedId, show “Suggested for you”. */
  recommended: boolean
}

export type PostA2TransitionViewModel = {
  /** Umbrella product framing */
  journeyTitle: string
  journeySubtitle: string
  completionHeadline: string
  completionBody: string
  readiness: ReadinessEvaluation
  recommendedId: PostA2NextOptionId
  options: PostA2OptionCardModel[]
  masteryPath: MasteryPathPresentation
  examPrepPath: ExamPrepPathPresentation
  /** Signals used for recommendation (analytics / transparency). */
  recommendationContext: {
    recentExamAttemptCount: number
    examHabitStreakDays: number
  }
}
