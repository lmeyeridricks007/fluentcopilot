import { isAzurePronunciationConfigured } from '../speech/pronunciationAssessmentConfig'

function trimEnv(k: string): string {
  return process.env[k]?.trim() ?? ''
}

function envBool(k: string, defaultValue = false): boolean {
  const v = trimEnv(k).toLowerCase()
  if (!v) return defaultValue
  return v === '1' || v === 'true' || v === 'yes'
}

/** Persist speaking assessments (file store when SQL not wired). */
export function isSpeakingAssessmentPersistenceEnabled(): boolean {
  return envBool('SPEAKING_ASSESSMENT_PERSIST', false) || Boolean(trimEnv('SPEAKING_ASSESSMENT_STORE_PATH'))
}

export function getSpeakingAssessmentStorePath(): string | undefined {
  const p = trimEnv('SPEAKING_ASSESSMENT_STORE_PATH')
  return p || undefined
}

export function isSpeakingCacheEnabled(): boolean {
  return envBool('SPEAKING_CACHE_ENABLED', false)
}

/** When true, speaking assessment persistence stores LLM input + raw attempts on the saved row. */
export function isSpeakingCoachingDebugEnabled(): boolean {
  return envBool('SPEAKING_COACHING_DEBUG', false)
}

export function shouldSaveRawProviderPayload(): boolean {
  return envBool('SPEAKING_SAVE_RAW_PROVIDER_PAYLOAD', false)
}

export type SpeakingReferenceAudioProvider = 'azure' | 'openai' | 'browser-fallback'

/** OpenAI voice name for reference clips (must be a supported OpenAI TTS voice). */
export function getOpenAiVoiceForSpeakingReference(): string {
  return trimEnv('SPEAKING_OPENAI_TTS_VOICE') || trimEnv('OPENAI_TTS_VOICE') || 'coral'
}

/**
 * Server-side synthesis order. Empty array means no server TTS — client uses browser speechSynthesis.
 * `SPEAKING_REFERENCE_AUDIO_PROVIDER`: unset = auto (Azure if configured, else OpenAI if key present);
 * `azure` | `openai` | `browser-fallback` forces that path (with sensible downgrade when keys missing).
 */
export function getSpeakingReferenceSynthesisChain(): Array<'azure' | 'openai'> {
  const forced = trimEnv('SPEAKING_REFERENCE_AUDIO_PROVIDER').toLowerCase()
  const openai = Boolean(trimEnv('OPENAI_API_KEY'))

  if (forced === 'browser-fallback') return []
  if (forced === 'azure') {
    if (!isAzurePronunciationConfigured()) return openai ? ['openai'] : []
    return ['azure']
  }
  if (forced === 'openai') {
    return openai ? ['openai'] : []
  }

  const auto: Array<'azure' | 'openai'> = []
  if (isAzurePronunciationConfigured()) auto.push('azure')
  if (openai) auto.push('openai')
  return auto
}

/** Label for logs / UI hints — not the same as the per-request synthesizer that succeeded. */
export function getSpeakingReferenceAudioProvider(): SpeakingReferenceAudioProvider {
  const forced = trimEnv('SPEAKING_REFERENCE_AUDIO_PROVIDER').toLowerCase()
  if (forced === 'browser-fallback') return 'browser-fallback'
  if (forced === 'azure') return 'azure'
  if (forced === 'openai') return 'openai'
  if (isAzurePronunciationConfigured()) return 'azure'
  if (trimEnv('OPENAI_API_KEY')) return 'openai'
  return 'browser-fallback'
}

export function getSpeakingCoachingModel(): string {
  return (
    trimEnv('OPENAI_MODEL_SPEAKING_ASSESSMENT') ||
    trimEnv('OPENAI_MODEL_ENRICHMENT') ||
    trimEnv('OPENAI_MODEL') ||
    'gpt-4o-mini'
  )
}

export function getDefaultAzureTtsVoiceForReference(): string {
  return trimEnv('AZURE_TTS_VOICE') || 'nl-NL-FennaNeural'
}
