import { describe, expect, it } from 'vitest'
import type { DayPracticeStep } from '@/features/quick-capture/personalizedPracticePackBuilder.client'
import { buildInteractiveSessionFromSteps } from './buildInteractiveSessionFromSteps'
import type { ExplanationCardExercise, InteractiveExercise } from './types'

function isWarmUpExplanationCard(ex: InteractiveExercise): ex is ExplanationCardExercise {
  return ex.kind === 'explanation_card' && ex.phase === 'warm_up'
}

describe('buildInteractiveSessionFromSteps', () => {
  it('merges consecutive warm-up explanation cards before core reps', () => {
    const steps: DayPracticeStep[] = [
      {
        id: 'recap',
        kind: 'short_recap',
        captureId: 'c0',
        headline: 'Today, in short',
        bullets: ['Mixed moments: photo text', 'Mixed moments: add place'],
        prompt: 'Balanced pack — about six minutes.',
      },
      {
        id: 't1',
        kind: 'theme_anchor',
        captureId: 'c1',
        themeTitle: 'Mixed moments',
        prompt: '1 capture · photo text',
      },
      {
        id: 't2',
        kind: 'theme_anchor',
        captureId: 'c2',
        themeTitle: 'Mixed moments',
        prompt: '1 capture · add place',
      },
      {
        id: 'w1',
        kind: 'word_rep',
        captureId: 'c1',
        dutch: 'hallo',
        prompt: 'Rep this word.',
        meaningEn: 'hello',
        exampleLinesNl: ['Hallo daar.'],
      },
    ]

    const pack = buildInteractiveSessionFromSteps(steps, { packTitle: 'Test', mode: 'quick_rep' })

    const warmUps = pack.exercises.filter(isWarmUpExplanationCard)
    expect(warmUps).toHaveLength(1)
    expect(warmUps[0]!.id).toContain('warmup-merged')
    expect(warmUps[0]!.title).toBe('Today, in short')

    const firstCore = pack.exercises.find((e) => e.phase === 'core' && e.kind !== 'explanation_card')
    expect(firstCore?.kind).toBe('hear_and_repeat')

    // Without merge: 3 warm-up cards + word_rep block count; with merge: 1 + same reps.
    expect(pack.exercises.length).toBeLessThan(3 + 3)
  })
})
