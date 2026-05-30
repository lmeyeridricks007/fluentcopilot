/**
 * One JSON repair pass when {@link ScenarioDialogueStructuredOutputSchema} validation fails.
 */
import {
  getSpeakLiveStructuredTranscriptEvalModel,
  speakLiveEvalCredentialsReady,
} from '../ai/config/aiProviderConfig'
import { runSpeakLiveEvalChatCompletion } from '../ai/speakLiveEvalChatCompletion'

const REPAIR_SYSTEM = `You repair JSON for FluentCopilot Speak Live scenario dialogue evaluation.
Return ONE JSON object only — no markdown fences, no prose.
Schema: root keys overall, goals, turns, recommendations as in the broken payload.
Rules:
- turns must list ONLY user turns, one object per user line, same turnId order as userTurnIdsOrdered in the user message.
- Each turns[i].turnId MUST match userTurnIdsOrdered[i] exactly (full UUID with hyphens); copy character-for-character from that array.
- overall.primaryFocus MUST be an object { title, why, pattern, example } — never a single string.
- Scores are integers 0–100. goal.weight is 0–1.
- Fill missing arrays with []. Use null only where allowed (saveablePhrase, suggestedScenarioId).`

export async function repairScenarioDialogueStructuredJson(params: {
  failedJsonSnippet: string
  validationIssues: string
  userTurnIdsOrdered: string[]
}): Promise<string | null> {
  if (!speakLiveEvalCredentialsReady().ok) return null
  const snippet = params.failedJsonSnippet.slice(0, 14_000)
  try {
    const raw = await runSpeakLiveEvalChatCompletion({
      messages: [
        { role: 'system', content: REPAIR_SYSTEM },
        {
          role: 'user',
          content: `userTurnIdsOrdered (preserve exactly):\n${JSON.stringify(params.userTurnIdsOrdered)}\n\nValidation issues:\n${params.validationIssues.slice(0, 2000)}\n\nBroken or partial JSON:\n${snippet}`,
        },
      ],
      maxOutputTokens: 4096,
      temperature: 0,
      jsonResponseFormat: true,
      openAiModel: getSpeakLiveStructuredTranscriptEvalModel(),
    })
    return raw || null
  } catch (e) {
    console.warn('[ScenarioDialogueStructuredRepair] repair request failed', e instanceof Error ? e.message : e)
    return null
  }
}
