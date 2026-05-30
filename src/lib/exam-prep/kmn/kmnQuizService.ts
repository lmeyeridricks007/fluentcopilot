/**
 * Quiz evaluation + option shuffle (deterministic).
 */
import type { KmnQuizQuestion } from '@/lib/exam-prep/kmn/types'

export function shuffleQuizOptions(question: KmnQuizQuestion, seed: number): KmnQuizQuestion['options'] {
  const out = [...question.options]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.abs(Math.sin(seed + i * 31) * 10000) % (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

export function evaluateKmnQuizAnswer(
  question: KmnQuizQuestion,
  selectedOptionId: string
): { correct: boolean; explanationNl: string } {
  const correct = selectedOptionId === question.correctOptionId
  return { correct, explanationNl: question.explanationNl }
}
