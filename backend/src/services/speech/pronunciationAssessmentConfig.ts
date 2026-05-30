import type { PronunciationRuntimeMode } from './pronunciationAssessmentContracts'

export function getPronunciationRuntimeMode(): PronunciationRuntimeMode {
  const v = (process.env.PRONUNCIATION_MODE ?? 'off').trim().toLowerCase()
  if (v === 'mock') {
    console.warn(
      '[pronunciation] PRONUNCIATION_MODE=mock is no longer supported (removed). Use PRONUNCIATION_MODE=azure or off.'
    )
    return 'off'
  }
  if (v === 'azure') return 'azure'
  return 'off'
}

export function getAzureSpeechKey(): string | undefined {
  const k = process.env.AZURE_SPEECH_KEY?.trim()
  return k || undefined
}

export function getAzureSpeechRegion(): string | undefined {
  const r = process.env.AZURE_SPEECH_REGION?.trim()
  return r || undefined
}

export function getAzureSpeechLocale(): string {
  return process.env.AZURE_SPEECH_LOCALE?.trim() || 'nl-NL'
}

export function isAzurePronunciationConfigured(): boolean {
  return Boolean(getAzureSpeechKey() && getAzureSpeechRegion())
}
