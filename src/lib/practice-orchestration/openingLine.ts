import { getScenario } from '@/ai-conversation-engine/config/scenarios'
import { ensureCatalogScenariosRegistered } from '@/lib/practice/conversation/ensureCatalogScenarios'

/** First assistant line — in-character, A2-safe, scenario-aware. */
export function getOrchestratedOpeningLine(scenarioId: string): string {
  ensureCatalogScenariosRegistered()
  const ctx = getScenario(scenarioId)
  if (scenarioId === 'cafe') return 'Goedemiddag! Wat mag het zijn?'
  if (scenarioId === 'doctor') return 'Goedemiddag. Wat kan ik voor u doen?'
  if (scenarioId === 'train' || scenarioId === 'travel') return 'Goedemiddag, waarmee kan ik u helpen?'
  if (scenarioId === 'municipality') return 'Goedemiddag. Waarmee kan ik u van dienst zijn?'
  if (ctx?.goal) {
    const g = ctx.goal.length > 80 ? `${ctx.goal.slice(0, 80)}…` : ctx.goal
    return `Goedemiddag. Welkom — ${g}`
  }
  return 'Goedemiddag. Hoe kan ik u helpen?'
}
