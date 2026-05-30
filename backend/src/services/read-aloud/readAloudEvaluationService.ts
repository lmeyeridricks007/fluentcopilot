import { ApiError } from '../../shared/errors'
import { getPronunciationRuntimeMode, isAzurePronunciationConfigured } from '../speech/pronunciationAssessmentConfig'
import type { ReadAloudEvaluateResult } from './readAloudEvaluateTypes'

export type { ReadAloudDimensionBlock } from './readAloudDimensions'
export type { ReadAloudEvaluateResult, ReadAloudSentenceAlignmentRow } from './readAloudEvaluateTypes'

function throwReadAloudModernPipelineFailed(lastError?: Error): never {
  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim())
  const azureConfigured = isAzurePronunciationConfigured()
  const azureMode = getPronunciationRuntimeMode() === 'azure'
  const detail: Record<string, string> = {
    hasOpenAiKey: hasOpenAi ? 'true' : 'false',
    azureSpeechConfigured: azureConfigured ? 'true' : 'false',
    pronunciationModeAzure: azureMode ? 'true' : 'false',
  }
  if (lastError?.message) detail.pipelineError = lastError.message.slice(0, 500)

  if (!hasOpenAi || !azureConfigured || !azureMode) {
    throw new ApiError(
      503,
      'DEPENDENCY_UNAVAILABLE',
      'Read-aloud evaluation requires OpenAI (timed transcription) and Azure pronunciation assessment. Set OPENAI_API_KEY, AZURE_SPEECH_KEY, AZURE_SPEECH_REGION, and PRONUNCIATION_MODE=azure. The legacy full-clip evaluator is no longer used.',
      detail,
    )
  }

  throw new ApiError(
    422,
    'EVALUATION_UNAVAILABLE',
    'We could not score this read with the timed audio pipeline (audio-first or segmented). Try recording again in a quieter place, a bit closer to the mic, or use Regenerate.',
    detail,
  )
}

export async function evaluateReadAloudPerformance(input: {
  targetText: string
  audio: Buffer
  mimeType: string
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2'
  /** Optional genre id from session (for smart next actions only). */
  genre?: string | null
}): Promise<ReadAloudEvaluateResult> {
  const targetText = input.targetText.replace(/\r\n/g, '\n').trim()
  if (targetText.length < 12) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Passage is too short for a read-aloud evaluation.', {
      targetText: 'Minimum ~12 characters',
    })
  }
  if (targetText.length > 12_000) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Passage is too long.', { targetText: 'Max 12000 characters' })
  }
  if (input.audio.length < 64) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Audio clip is empty or too short.')
  }

  /** Whisper follows the prompt language; bias toward Dutch and discourage repetition hallucinations. */
  const promptBias =
    'Alleen Nederlands uittypen. Herhaal geen woorden of zinnen die niet in de tekst staan. ' + targetText.slice(0, 650)
  const promptHint = promptBias.slice(0, 400)

  let lastPipelineError: Error | undefined

  try {
    return await import('./readAloudAudioFirstPipeline').then((m) =>
      m.evaluateReadAloudAudioFirst({
        targetText,
        audio: input.audio,
        mimeType: input.mimeType,
        cefrLevel: input.cefrLevel,
        genre: input.genre ?? null,
        transcriptionPrompt: promptHint,
      }),
    )
  } catch (e) {
    lastPipelineError = e instanceof Error ? e : new Error(String(e))
  }

  try {
    const seg = await import('./readAloudSegmentedPipeline').then((m) =>
      m.tryRunReadAloudSegmentedTimedEvaluation({
        targetText,
        audio: input.audio,
        mimeType: input.mimeType,
        cefrLevel: input.cefrLevel,
        genre: input.genre ?? null,
        transcriptionPrompt: promptHint,
      }),
    )
    if (seg) return seg.result
  } catch (e) {
    lastPipelineError = e instanceof Error ? e : new Error(String(e))
  }

  throwReadAloudModernPipelineFailed(lastPipelineError)
}
