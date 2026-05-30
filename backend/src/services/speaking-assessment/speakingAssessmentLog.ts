type Step =
  | 'upload_received'
  | 'azure_assessment_start'
  | 'azure_assessment_end'
  | 'timing_analysis_start'
  | 'timing_analysis_end'
  | 'reference_audio_start'
  | 'reference_audio_variant_failed'
  | 'reference_audio_end'
  | 'llm_coaching_start'
  | 'llm_coaching_retry'
  | 'llm_coaching_end'
  | 'orchestration_complete'

export function logSpeakingAssessmentStep(params: {
  step: Step
  assessmentId?: string
  durationMs?: number
  extra?: Record<string, unknown>
}): void {
  const line = {
    component: 'speaking_assessment',
    ...params,
    ts: new Date().toISOString(),
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(line))
}
