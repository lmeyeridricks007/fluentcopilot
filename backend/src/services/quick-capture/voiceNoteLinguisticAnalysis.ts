import { azureOpenAiChatCompletionJson } from '../azureOpenAi/azureOpenAiRestClient'
import type { ChatMessage } from '../../prompts/buildTurnMessages'
import type { QuickCaptureVoiceNoteAnalysis } from '../../domain/learningMemory/sessionInsightExtractionQuickCapture'

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function parseAnalysisJson(raw: string): QuickCaptureVoiceNoteAnalysis | null {
  try {
    const j = JSON.parse(raw) as Record<string, unknown>
    const inf = j.learnerSpeakerInference
    const allowedInference: QuickCaptureVoiceNoteAnalysis['learnerSpeakerInference'][] = [
      'single_speaker',
      'likely_learner_monologue',
      'likely_dialogue_two_or_more',
      'ambiguous',
      'unknown',
    ]
    const learnerSpeakerInference = allowedInference.includes(inf as QuickCaptureVoiceNoteAnalysis['learnerSpeakerInference'])
      ? (inf as QuickCaptureVoiceNoteAnalysis['learnerSpeakerInference'])
      : 'unknown'

    const esc = j.estimatedSpeakerCount
    const estimatedSpeakerCount =
      typeof esc === 'number' && Number.isFinite(esc) && esc >= 1 && esc <= 6 ? Math.round(esc) : null

    const voc = Array.isArray(j.vocabularyHighlightsNl)
      ? (j.vocabularyHighlightsNl as unknown[]).filter((x): x is string => typeof x === 'string').map((s) => s.trim().slice(0, 80)).slice(0, 16)
      : []
    const gram = Array.isArray(j.grammarNotesEn)
      ? (j.grammarNotesEn as unknown[]).filter((x): x is string => typeof x === 'string').map((s) => s.trim().slice(0, 220)).slice(0, 10)
      : []

    return {
      contextSummaryEn: typeof j.contextSummaryEn === 'string' ? j.contextSummaryEn.trim().slice(0, 800) || null : null,
      vocabularyHighlightsNl: voc,
      grammarNotesEn: gram,
      estimatedSpeakerCount,
      learnerSpeakerInference,
      learnerSpeakerRationaleEn:
        typeof j.learnerSpeakerRationaleEn === 'string' ? j.learnerSpeakerRationaleEn.trim().slice(0, 500) || null : null,
      audioDiarizationApplied: false,
      analysisConfidence: clamp01(typeof j.analysisConfidence === 'number' ? j.analysisConfidence : 0.5),
    }
  } catch {
    return null
  }
}

/**
 * Transcript-only linguistic pass for quick-capture voice notes.
 * Does **not** run true speaker diarization on the waveform — STT is plain text; speaker hints are best-effort from dialogue shape.
 */
export async function runVoiceNoteLinguisticAnalysis(params: {
  transcriptNl: string
  userTitle?: string | null
  userContext?: string | null
}): Promise<QuickCaptureVoiceNoteAnalysis | null> {
  const transcript = params.transcriptNl.trim()
  if (transcript.length < 8) return null

  const system: ChatMessage = {
    role: 'system',
    content: `You help Dutch learners reflect on a short voice note that was transcribed to text.

You do NOT have separate audio channels or true speaker diarization — only the transcript text (and optional user hints).
Be explicit when guessing speaker count or which voice is "the learner": those are soft inferences from wording (e.g. questions vs answers, "I" vs other voices implied).

Return JSON ONLY with this exact shape:
{
  "contextSummaryEn": string|null,
  "vocabularyHighlightsNl": string[],
  "grammarNotesEn": string[],
  "estimatedSpeakerCount": number|null,
  "learnerSpeakerInference": "single_speaker"|"likely_learner_monologue"|"likely_dialogue_two_or_more"|"ambiguous"|"unknown",
  "learnerSpeakerRationaleEn": string|null,
  "analysisConfidence": number
}

Rules:
- contextSummaryEn: 1–3 sentences in English: what situation this sounds like.
- vocabularyHighlightsNl: up to 10 short Dutch phrases or lemmas worth recycling (no full transcript dump).
- grammarNotesEn: up to 6 concise English notes (patterns, word order, tense) — hedged ("might", "could").
- estimatedSpeakerCount: integer 1–6 if inferable from dialogue cues, else null.
- learnerSpeakerInference + learnerSpeakerRationaleEn: explain basis; use "unknown" when unsure.
- analysisConfidence: 0–1 for your whole interpretation (lower when transcript is noisy or very short).`,
  }

  const user: ChatMessage = {
    role: 'user',
    content: JSON.stringify({
      transcriptNl: transcript.slice(0, 8000),
      userTitle: params.userTitle?.trim().slice(0, 200) ?? null,
      userContext: params.userContext?.trim().slice(0, 1200) ?? null,
    }),
  }

  try {
    const raw = await azureOpenAiChatCompletionJson([system, user])
    return parseAnalysisJson(raw)
  } catch {
    return null
  }
}
