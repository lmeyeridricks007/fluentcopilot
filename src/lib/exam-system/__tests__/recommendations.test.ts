import { describe, expect, it } from 'vitest'
import { recommendNextTraining } from '../recommendations'

describe('recommendNextTraining', () => {
  it('prioritizes pronunciation / delivery coaching', () => {
    const t = recommendNextTraining({
      weakestDimension: 'pronunciation_delivery',
      weakestTaskType: 'short_response',
      mode: 'simulation',
    })
    expect(t.toLowerCase()).toContain('read aloud')
  })

  it('suggests listening work when listening dimension is weak', () => {
    const t = recommendNextTraining({
      weakestDimension: 'listening_accuracy',
      weakestTaskType: null,
      mode: 'training',
    })
    expect(t.toLowerCase()).toMatch(/listening|almost-exam/)
  })

  it('suggests roleplay reps for roleplay / responsiveness weak signals', () => {
    const t = recommendNextTraining({
      weakestDimension: 'responsiveness',
      weakestTaskType: 'roleplay',
      mode: 'simulation',
    })
    expect(t.toLowerCase()).toContain('roleplay')
  })

  it('falls back to simulation-oriented copy when mode is simulation', () => {
    const t = recommendNextTraining({
      weakestDimension: 'grammar_control',
      weakestTaskType: 'practical_request',
      mode: 'simulation',
    })
    expect(t.toLowerCase()).toContain('train')
  })

  it('falls back to training-oriented copy when mode is training', () => {
    const t = recommendNextTraining({
      weakestDimension: 'structure',
      weakestTaskType: 'explain_process',
      mode: 'training',
    })
    expect(t.toLowerCase()).toMatch(/simulation|timed/)
  })
})
