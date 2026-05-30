/**
 * Step-type helpers for the schema lesson engine (completion rules, exercise lookup).
 */
import type { Exercise } from '@/lib/schemas/exercise.schema'
import type { LessonStep } from '@/lib/schemas/lessonStep.schema'

export function firstExercise(step: LessonStep): Exercise | undefined {
  const ex = step.exercises
  if (ex && ex.length > 0) return ex[0]
  return undefined
}

export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:]+$/g, '')
}

export function answersMatch(expected: string, given: string, delimiter = ' '): boolean {
  const a = normalizeAnswer(expected)
  const b = normalizeAnswer(given)
  if (a === b) return true
  const joinA = normalizeAnswer(a.split(/\s+/).join(delimiter))
  const joinB = normalizeAnswer(b.split(/\s+/).join(delimiter))
  return joinA === joinB
}

export function mcqIsCorrect(exercise: Exercise, choice: string): boolean {
  if (exercise.type !== 'multiple_choice') return false
  return answersMatch(exercise.correctAnswer, choice)
}

export function reorderIsCorrect(exercise: Exercise, built: string): boolean {
  if (exercise.type !== 'reorder') return false
  return answersMatch(exercise.correctAnswer, built)
}

export function fillBlankIsCorrect(exercise: Exercise, choice: string): boolean {
  if (exercise.type !== 'fill_blank') return false
  return answersMatch(exercise.correctAnswer, choice)
}
