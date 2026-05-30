/**
 * One lightweight JSON repair pass when structured transcript root validation fails.
 */
import { getSpeakLiveStructuredTranscriptEvalModel, speakLiveEvalCredentialsReady } from '../ai/config/aiProviderConfig'
import { runSpeakLiveEvalChatCompletion } from '../ai/speakLiveEvalChatCompletion'

const REPAIR_SYSTEM = `You fix JSON for FluentCopilot Speak Live transcript evaluation.
Return ONE JSON object only — same schema the user describes — no markdown fences.
Preserve all turnIds exactly. Fill missing required arrays with []. Scores are integers 0–100.`

export async function repairStructuredTranscriptEvalJson(params: {
  failedJsonSnippet: string
  validationIssues: string
}): Promise<string | null> {
  if (!speakLiveEvalCredentialsReady().ok) return null
  const snippet = params.failedJsonSnippet.slice(0, 14_000)
  try {
    const raw = await runSpeakLiveEvalChatCompletion({
      messages: [
        { role: 'system', content: REPAIR_SYSTEM },
        {
          role: 'user',
          content: `Validation issues:\n${params.validationIssues.slice(0, 2000)}\n\nBroken or partial JSON:\n${snippet}`,
        },
      ],
      maxOutputTokens: 4096,
      temperature: 0,
      jsonResponseFormat: true,
      openAiModel: getSpeakLiveStructuredTranscriptEvalModel(),
    })
    return raw || null
  } catch (e) {
    console.warn('[StructuredTranscriptRepair] repair request failed', e instanceof Error ? e.message : e)
    return null
  }
}
