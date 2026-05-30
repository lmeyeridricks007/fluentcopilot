import type { SpeakLiveTtsProviderId } from './speakLiveTtsGateway'
import { getSpeakLiveResolvedTtsVoice } from './speakLiveTtsGateway'

export type SpeakLiveAssistantPresentation = 'male' | 'female'

export type SpeakLiveSessionMedia = {
  assistantPresentation: SpeakLiveAssistantPresentation
  ttsProvider: SpeakLiveTtsProviderId
  ttsVoice: string
}

const AZURE_NEURAL_MALE = new Set(
  [
    'maarten',
    'ryan',
    'guy',
    'tony',
    'davis',
    'jason',
    'brian',
    'andrew',
    'christopher',
    'eric',
    'roger',
    'steffan',
    'duncan',
  ].map((s) => s.toLowerCase())
)

const AZURE_NEURAL_FEMALE = new Set(
  ['fenna', 'colette', 'ada', 'jenny', 'sonia', 'zoey', 'aria', 'emma', 'luna', 'sara', 'michelle', 'natasha'].map((s) =>
    s.toLowerCase()
  )
)

const OPENAI_MALE = new Set(['ash', 'echo', 'fable', 'onyx', 'verse'])
const OPENAI_FEMALE = new Set(['ballad', 'coral', 'nova', 'sage', 'shimmer'])

function azureNeuralNameToken(voice: string): string | null {
  const m = voice.trim().match(/-([A-Za-z]+)Neural$/i)
  return m ? m[1].toLowerCase() : null
}

export function inferSpeakLiveAssistantPresentation(
  provider: SpeakLiveTtsProviderId,
  voice: string
): SpeakLiveAssistantPresentation {
  if (provider === 'azure') {
    const token = azureNeuralNameToken(voice)
    if (token && AZURE_NEURAL_MALE.has(token)) return 'male'
    if (token && AZURE_NEURAL_FEMALE.has(token)) return 'female'
    const lower = voice.toLowerCase()
    if (/\bmaarten\b/i.test(lower)) return 'male'
    if (/\bfenna\b|\bcolette\b/i.test(lower)) return 'female'
    /** Most nl-NL defaults are female (e.g. Fenna). */
    return 'female'
  }
  const v = voice.trim().toLowerCase()
  if (OPENAI_MALE.has(v)) return 'male'
  if (OPENAI_FEMALE.has(v)) return 'female'
  if (v === 'alloy') return 'female'
  return 'female'
}

/** Optional override: `SPEAK_LIVE_ASSISTANT_PRESENTATION=male|female` (forces UI portrait regardless of voice heuristics). */
export function buildSpeakLiveSessionMedia(): SpeakLiveSessionMedia {
  const override = process.env.SPEAK_LIVE_ASSISTANT_PRESENTATION?.trim().toLowerCase()
  const { provider, voice } = getSpeakLiveResolvedTtsVoice()
  if (override === 'male' || override === 'female') {
    return { assistantPresentation: override, ttsProvider: provider, ttsVoice: voice }
  }
  return {
    assistantPresentation: inferSpeakLiveAssistantPresentation(provider, voice),
    ttsProvider: provider,
    ttsVoice: voice,
  }
}
