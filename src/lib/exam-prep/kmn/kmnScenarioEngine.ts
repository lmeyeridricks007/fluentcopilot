/**
 * Mini scenario — choice resolution + feedback.
 */
import type { KmnScenario } from '@/lib/exam-prep/kmn/types'

export function evaluateKmnScenarioChoice(
  scenario: KmnScenario,
  choiceId: string
): { choiceFound: boolean; isCorrect: boolean; feedbackNl: string } {
  const choice = scenario.choices.find((c) => c.id === choiceId)
  if (!choice) {
    return { choiceFound: false, isCorrect: false, feedbackNl: 'Maak een keuze uit de opties.' }
  }
  return {
    choiceFound: true,
    isCorrect: choice.isCorrect,
    feedbackNl: choice.feedbackNl,
  }
}
