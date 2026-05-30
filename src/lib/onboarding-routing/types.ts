/**
 * Central types for “first real in-app experience” after onboarding.
 * @see docs/product/onboarding-start-routing.md
 */

export type StartPathwayKey =
  | 'a2_curriculum'
  | 'exam_prep'
  | 'practice_confidence'
  | 'b1_dashboard'
  | 'fallback_learn'

/** What the destination screen should emphasize first. */
export type StartExperienceEmphasis = 'a2_path' | 'exam_modules' | 'scenarios_skills' | 'dashboard_explore'

export type OnboardingStartExperienceResolved = {
  pathwayKey: StartPathwayKey
  /** First in-app route (pathname, no query). */
  route: string
  emphasis: StartExperienceEmphasis
  /** Human-readable priority explanation for logs / analytics (not shown to users). */
  decisionTrace: string
  welcomeHeadline: string
  welcomeSubline: string
  /** Summary step primary button label. */
  summaryCtaLabel: string
}
