/**
 * Print built system prompt + mock reply for a scenario (local dev only).
 *
 *   npx tsx --tsconfig tsconfig.json tools/inspect-practice-orchestration.ts cafe semi_guided "Mag ik koffie?"
 */
import { runPracticeConversationTurn } from '../src/lib/practice-orchestration/conversationOrchestrator'
import type { PracticeConversationMode } from '../src/lib/schemas/practice/practiceShared.schema'

async function main(): Promise<void> {
  const [, , scenarioId = 'cafe', modeRaw = 'semi_guided', userMessage = 'Hallo'] = process.argv
  const mode = modeRaw as PracticeConversationMode
  const out = await runPracticeConversationTurn({
    scenarioId,
    mode,
    userMessage,
    priorUserTurns: 0,
    messageHistory: [],
    debug: true,
  })
  console.log('--- systemPromptForProvider ---\n')
  console.log(out.systemPromptForProvider)
  console.log('\n--- assistantNl ---\n')
  console.log(out.assistantNl)
  if (out.coachEn) console.log('\ncoachEn:', out.coachEn)
  console.log('\n--- feedbackSignals ---\n', out.feedbackSignals)
  console.log('\n--- listeningHints ---\n', out.listeningHints)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
