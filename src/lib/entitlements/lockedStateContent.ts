import type { FeatureKey } from './featureKeys'
import { PRICING_HREF, IN_APP_PREMIUM_HREF } from './routes'

export type LockedFeatureCopy = {
  title: string
  body: string
  primaryCta: string
  primaryHref: string
  secondaryCta?: string
  secondaryHref?: string
}

const DEFAULT_SECONDARY = { secondaryCta: 'Pricing & plans', secondaryHref: PRICING_HREF } as const

export function getLockedFeatureCopy(key: FeatureKey): LockedFeatureCopy {
  switch (key) {
    case 'exam_prep_modules':
      return {
        title: 'Full exam prep is Premium',
        body: 'Training modes, simulations, and rubric-style feedback for speaking, writing, listening, reading, and KNM — included with Premium when billing goes live.',
        primaryCta: 'See Premium benefits',
        primaryHref: IN_APP_PREMIUM_HREF,
        ...DEFAULT_SECONDARY,
      }
    case 'exam_practice_exams':
      return {
        title: 'Practice exams are Premium',
        body: 'Timed mock exam sets and compare views help you rehearse under real pressure. Basic includes lessons and core practice; full exam sets unlock with Premium.',
        primaryCta: 'View Premium features',
        primaryHref: IN_APP_PREMIUM_HREF,
        ...DEFAULT_SECONDARY,
      }
    case 'practice_skill_tracks':
      return {
        title: 'Skill tracks are Premium',
        body: 'Focused drill paths that chain scenarios and checks — better for deep A2 work than one-off tries.',
        primaryCta: 'See what Premium adds',
        primaryHref: IN_APP_PREMIUM_HREF,
        ...DEFAULT_SECONDARY,
      }
    case 'practice_simulation':
      return {
        title: 'Exam-style simulation is Premium',
        body: 'Stricter rules and end-of-session scoring — closer to the real exam than guided practice.',
        primaryCta: 'Upgrade path (beta)',
        primaryHref: IN_APP_PREMIUM_HREF,
        ...DEFAULT_SECONDARY,
      }
    case 'practice_voice_tutor':
      return {
        title: 'Voice tutor is Premium',
        body: 'Open-ended speaking with richer coaching and replay. Basic still includes structured scenarios from the library.',
        primaryCta: 'Premium overview',
        primaryHref: IN_APP_PREMIUM_HREF,
        ...DEFAULT_SECONDARY,
      }
    case 'practice_pronunciation':
      return {
        title: 'Pronunciation feedback is Premium',
        body: 'Deeper pronunciation analysis builds on Premium voice features.',
        primaryCta: 'See Premium',
        primaryHref: IN_APP_PREMIUM_HREF,
        ...DEFAULT_SECONDARY,
      }
    case 'practice_open_conversation':
      return {
        title: 'Open & semi-guided chat is Premium',
        body: 'Freer conversation modes unlock after structured practice. Basic includes the full guided scenario library.',
        primaryCta: 'See Premium benefits',
        primaryHref: IN_APP_PREMIUM_HREF,
        ...DEFAULT_SECONDARY,
      }
    case 'insights_readiness_detail':
      return {
        title: 'Readiness insights are Premium',
        body: 'Full B1 readiness breakdown and trend context stay on Premium; Basic still shows your headline progress.',
        primaryCta: 'Compare plans',
        primaryHref: PRICING_HREF,
        secondaryCta: 'In-app Premium info',
        secondaryHref: IN_APP_PREMIUM_HREF,
      }
    case 'premium_lesson_content':
      return {
        title: 'This lesson is Premium',
        body: 'Marked lessons include extra depth or media. Your path and many core lessons stay open on Basic.',
        primaryCta: 'See Premium lessons',
        primaryHref: IN_APP_PREMIUM_HREF,
        ...DEFAULT_SECONDARY,
      }
    default:
      return {
        title: 'Premium feature',
        body: 'This area is included with Premium when subscriptions launch. You’re on Basic for this beta.',
        primaryCta: 'View Premium',
        primaryHref: IN_APP_PREMIUM_HREF,
        ...DEFAULT_SECONDARY,
      }
  }
}
