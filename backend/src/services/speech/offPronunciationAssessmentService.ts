import type {
  IPronunciationAssessmentService,
  PronunciationAssessmentApiResponse,
  PronunciationAssessmentAssessInput,
} from './pronunciationAssessmentContracts'

export class OffPronunciationAssessmentService implements IPronunciationAssessmentService {
  async assessAsync(_input: PronunciationAssessmentAssessInput): Promise<PronunciationAssessmentApiResponse> {
    return {
      assessment: null,
      provider: { id: 'off', mode: 'off' },
      summaryFeedback: null,
      recommendedNextStep: null,
      caveats: ['Pronunciation assessment is disabled (PRONUNCIATION_MODE=off).'],
      providerRawResult: undefined,
    }
  }
}
