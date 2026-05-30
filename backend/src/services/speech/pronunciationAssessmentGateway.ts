import type {
  IPronunciationAssessmentService,
  PronunciationAssessmentApiResponse,
  PronunciationAssessmentAssessInput,
} from './pronunciationAssessmentContracts'
import { AzurePronunciationAssessmentService } from './azurePronunciationAssessmentService'
import { OffPronunciationAssessmentService } from './offPronunciationAssessmentService'
import { getPronunciationRuntimeMode } from './pronunciationAssessmentConfig'
import { buildPronunciationRetryHints } from './buildPronunciationRetryHints'

export async function runPronunciationAssessment(
  input: PronunciationAssessmentAssessInput
): Promise<PronunciationAssessmentApiResponse> {
  const mode = getPronunciationRuntimeMode()
  const impl: IPronunciationAssessmentService =
    mode === 'azure' ? new AzurePronunciationAssessmentService() : new OffPronunciationAssessmentService()
  const res = await impl.assessAsync(input)
  if (!res.assessment) return { ...res, retryHints: null }
  return { ...res, retryHints: buildPronunciationRetryHints(res.assessment) }
}
