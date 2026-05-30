import type { MasteryPathPresentation } from '@/lib/post-a2/types'
/**
 * Option B packaging: deliberate “Dutch in real situations” / A2 mastery phase.
 * Copy avoids “extra practice” — frames a premium continuation chapter.
 */
export function buildMasteryPathPresentation(): MasteryPathPresentation {
  return {
    phaseTitle: 'A2 Mastery',
    phaseSubtitle: 'Real-life confidence before B1',
    promise:
      'Turn what you learned into calm, real-life Dutch — scenarios, abilities, missions, and your mastery map until B1 feels right.',
    steps: [
      {
        id: 'scenarios',
        title: 'Real-life scenarios',
        detail: 'Guided → semi-guided → open conversation as you earn unlocks.',
      },
      {
        id: 'abilities',
        title: 'Practical ability map',
        detail: 'See strengths and next reps on your Progress screen.',
      },
      {
        id: 'missions',
        title: 'Missions & streak',
        detail: 'Daily and weekly missions keep the habit — the same XP and streak rules you already use.',
      },
      {
        id: 'tracks',
        title: 'Skill micro-drills',
        detail: 'Short listening, speaking, and repair tracks when you want crisp reps.',
      },
    ],
    primaryCtaLabel: 'Open Practice hub',
    secondaryHint: 'Your coach picks and scenario library both respect weak areas automatically.',
  }
}
