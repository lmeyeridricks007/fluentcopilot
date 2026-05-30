/**
 * FluentCopilot — Quick Capture & Personalized Practice domain model.
 * Persistence: see {@link ../repositories/sql/quickCaptureDomainSqlRepository} + migration `041_quick_capture_domain_model.sql`.
 */

export type CaptureType =
  | 'save_word'
  | 'save_phrase'
  | 'photo_text'
  | 'add_place'
  | 'paste_text'
  | 'log_struggle'
  | 'voice_note'

export type CaptureStatus =
  | 'new'
  | 'enriched'
  | 'ready_for_practice'
  | 'included_in_practice'
  | 'practiced'
  | 'saved_long_term'
  | 'archived'

export type CaptureSourceSignal =
  | 'heard'
  | 'read'
  | 'tried_to_say'
  | 'spoken_about'
  | 'uploaded'
  | 'pasted'

export type DifficultyFeeling =
  | 'confused'
  | 'nervous'
  | 'froze'
  | 'rushed'
  | 'embarrassed'
  | 'unsure'
  | 'missed_it'
  | 'none'

export type CaptureMediaKind = 'image' | 'audio'

export type CaptureMedia = {
  kind: CaptureMediaKind
  url: string
  mimeType: string
  durationMs?: number | null
  waveformUrl?: string | null
  transcriptionText?: string | null
  ocrText?: string | null
}

export type CaptureEnrichment = {
  languageDetected: string
  likelyMeaning?: string | null
  englishGloss?: string | null
  normalizedDutch?: string | null
  likelyScenario: string | null
  likelyPlaceType?: string | null
  likelySkillImpacts: string[]
  vocabularyCandidates: string[]
  phraseCandidates: string[]
  confidence: number
  llmNotes?: string[] | null
  needsReview?: boolean | null
}

export type CaptureItem = {
  id: string
  userId: string
  type: CaptureType
  status: CaptureStatus
  createdAt: string
  updatedAt: string
  /** Calendar date the learner associates with this capture (YYYY-MM-DD). */
  captureDate: string
  rawText?: string | null
  cleanedText?: string | null
  title?: string | null
  description?: string | null
  sourceSignals: CaptureSourceSignal[]
  placeId?: string | null
  placeLabel?: string | null
  scenarioTags: string[]
  skillTags: string[]
  difficultyFeelings: DifficultyFeeling[]
  /** Arbitrary client/provenance payload (OCR raw, client build, etc.). */
  metadata: Record<string, unknown>
  media: CaptureMedia[]
  enrichment?: CaptureEnrichment | null
  practiceRefs?: string[] | null
  archivedAt?: string | null
}

export type PlaceItem = {
  id: string
  userId: string
  label: string
  category: string
  createdAt: string
  lastUsedAt?: string | null
  scenarioTags: string[]
}

export type DailyCaptureCluster = {
  id: string
  title: string
  summary: string
  scenarioTags: string[]
  relatedCaptureIds: string[]
  priorityScore: number
}

export type DailyCaptureBundle = {
  id: string
  userId: string
  date: string
  captureIds: string[]
  themeClusters: DailyCaptureCluster[]
  generatedPracticePackIds: string[]
}

export type PersonalizedPracticeItemType =
  | 'word_rep'
  | 'phrase_rep'
  | 'correction_rep'
  | 'mini_scenario'
  | 'read_aloud'
  | 'listening_burst'
  | 'coach_debrief'

export type PersonalizedPracticePackStatus = 'ready' | 'started' | 'completed' | 'archived'

export type PersonalizedPracticeItem = {
  id: string
  type: PersonalizedPracticeItemType
  prompt: string
  config: Record<string, unknown>
  sourceCaptureIds: string[]
  skillTargets: string[]
}

export type PersonalizedPracticePack = {
  id: string
  userId: string
  date: string
  sourceCaptureIds: string[]
  clusterIds: string[]
  title: string
  subtitle: string
  estimatedMinutes: number
  level: string
  items: PersonalizedPracticeItem[]
  xpPotential: number
  status: PersonalizedPracticePackStatus
  createdAt: string
  completedAt?: string | null
}
