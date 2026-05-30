import type { ExamScoringDimension, ExamTaskType } from './types'

export function recommendNextTraining(input: {
  weakestDimension: ExamScoringDimension | null
  weakestTaskType: ExamTaskType | null
  mode: 'simulation' | 'training'
}): string {
  const d = input.weakestDimension?.toLowerCase() ?? ''
  if (d.includes('pronunciation') || d.includes('delivery')) {
    return 'Train delivery: Read aloud studio + short timed repeats in Exam Train.'
  }
  if (d.includes('listening')) {
    return 'Sharpen listening: Listening mode bursts, then return to almost-exam timed speaking.'
  }
  if (input.weakestTaskType === 'roleplay' || d.includes('responsiveness')) {
    return 'Roleplay reps: Exam Train · light guidance on follow-up responses.'
  }
  if (input.mode === 'simulation') {
    return 'Next: Exam Train · almost-exam on the section that felt hardest.'
  }
  return 'Next: short simulation section with strict timers to validate gains.'
}
