import type { OnboardingData } from '@/store/onboardingStore'
import type { OnboardingStartExperienceResolved, StartExperienceEmphasis, StartPathwayKey } from './types'

function emphasisForPathway(key: StartPathwayKey): StartExperienceEmphasis {
  switch (key) {
    case 'exam_prep':
      return 'exam_modules'
    case 'practice_confidence':
      return 'scenarios_skills'
    case 'b1_dashboard':
      return 'dashboard_explore'
    case 'a2_curriculum':
    case 'fallback_learn':
    default:
      return 'a2_path'
  }
}

export function buildWelcomeCopy(
  pathwayKey: StartPathwayKey,
  data: Partial<OnboardingData>
): Pick<OnboardingStartExperienceResolved, 'welcomeHeadline' | 'welcomeSubline' | 'summaryCtaLabel'> {
  switch (pathwayKey) {
    case 'exam_prep': {
      const visa = data.learningReason === 'exam_visa'
      return {
        welcomeHeadline: visa ? 'We’ll focus on exam preparation first' : 'Prepare for the Dutch A2 exam',
        welcomeSubline:
          'Your hub for speaking, writing, listening, reading, and KNM — start with any skill area below.',
        summaryCtaLabel: 'Go to exam prep',
      }
    }
    case 'practice_confidence': {
      const speaking = data.primaryGoal === 'speaking_more' || data.focusSkills?.includes('speaking')
      return {
        welcomeHeadline: speaking ? 'Build confidence in real-life Dutch' : 'Go deeper on A2 with practice',
        welcomeSubline:
          'Scenarios, skill tracks, and weak-area drills — your path to stronger, calmer Dutch.',
        summaryCtaLabel: 'Open practice',
      }
    }
    case 'b1_dashboard': {
      return {
        welcomeHeadline: 'You’re working toward B1',
        welcomeSubline: 'Your home base shows progress, missions, and what to do next.',
        summaryCtaLabel: 'Open your home',
      }
    }
    case 'fallback_learn':
    case 'a2_curriculum':
    default: {
      const beginner =
        data.currentLevelSelfReport === 'beginner' ||
        data.currentLevelSelfReport === 'a1' ||
        data.currentLevelSelfReport === 'not_sure'
      return {
        welcomeHeadline: beginner ? 'Start with your A2 path' : 'Continue on your A2 path',
        welcomeSubline: 'Structured lessons and your curriculum path — open “My path” to begin.',
        summaryCtaLabel: 'Start with lessons',
      }
    }
  }
}

export function buildEmphasis(pathwayKey: StartPathwayKey): StartExperienceEmphasis {
  return emphasisForPathway(pathwayKey)
}
