import {
  SESSION_LEARNING_INSIGHTS_SCHEMA_VERSION,
  type SessionInsightHesitation,
  type SessionInsightPronunciation,
  type SessionInsightWeakPattern,
  type SessionInsightWeakWord,
  type SessionLearningInsights,
} from './sessionLearningInsightTypes'
import type { QuickCaptureType } from '../../repositories/quickCaptureRepository'

/** Suggested downstream practice shape — always interpret with {@link QuickCaptureEnrichmentPayload.needsReview}. */
export type QuickCapturePracticeRecommendationKind =
  | 'word_rep'
  | 'phrase_rep'
  | 'correction_drill'
  | 'mini_scenario'
  | 'read_aloud_source'
  | 'listening_drill_source'
  | 'coach_debrief_source'

export type QuickCapturePracticeRecommendation = {
  kind: QuickCapturePracticeRecommendationKind
  /** Model confidence 0–1; keep conservative. */
  confidence: number
  rationale: string
}

export type QuickCaptureSkillImpact = {
  skill: string
  impact: 'reinforce' | 'stretch' | 'unclear'
  confidence: number
}

/** Persisted snapshot of processed media (blob path when upload succeeded). */
export type QuickCaptureCaptureMedia = {
  kind: 'image' | 'audio'
  blobRelativePath?: string | null
  mimeType?: string | null
  byteLength?: number | null
  ocr?: {
    rawText: string | null
    cleanedText: string | null
    engineLineConfidence: number | null
    partial: boolean
    documentStyleGuess: string | null
    documentStyleConfidence: number | null
  }
  audio?: {
    rawTranscript: string | null
    cleanedTranscript: string | null
    sttConfidence: number | null
  }
}

/** Post-STT transcript analysis for voice_note (no waveform diarization unless audioDiarizationApplied is true). */
export type QuickCaptureVoiceNoteAnalysis = {
  contextSummaryEn: string | null
  vocabularyHighlightsNl: string[]
  grammarNotesEn: string[]
  estimatedSpeakerCount: number | null
  learnerSpeakerInference:
    | 'single_speaker'
    | 'likely_learner_monologue'
    | 'likely_dialogue_two_or_more'
    | 'ambiguous'
    | 'unknown'
  learnerSpeakerRationaleEn: string | null
  /** When false, speaker hints were inferred from text only (no dedicated diarization engine). */
  audioDiarizationApplied: boolean
  analysisConfidence: number
}

/** First-class practice hooks derived after STT + LLM for `voice_note` (also safe on other types). */
export type QuickCaptureVoicePracticeSurface = {
  polishedDutch: string | null
  englishGloss: string | null
  whatToSayNextNl: string | null
  phrasePracticeNl: string | null
  coachDebriefSeed: string | null
  miniScenarioSlugGuess: string | null
  miniScenarioSeedNl: string | null
  vocabularyHints: string[]
}

export type QuickCaptureEnrichmentPayload = {
  tags: string[]
  scenarioSlugGuess: string | null
  registerNotes: string | null
  englishGloss?: string | null
  dutchCanonical?: string | null
  phase: 'capture_enriched' | 'day_practice_complete'
  /** Overall interpretation confidence (0–1). */
  overallConfidence?: number
  /** True when OCR/STT/LLM signals are weak or disagree — prefer human confirmation. */
  needsReview?: boolean
  captureMedia?: QuickCaptureCaptureMedia
  likelyMeaning?: string | null
  likelyScenario?: string | null
  likelyPlaceType?: string | null
  skillImpacts?: QuickCaptureSkillImpact[]
  struggleSignals?: string[]
  practiceRecommendations?: QuickCapturePracticeRecommendation[]
  enrichmentNotes?: string | null
  /** Populated for voice notes: drills, coach seed, scenario, vocab. */
  voicePracticeSurface?: QuickCaptureVoicePracticeSurface | null
  /** Richer voice-note pass: situation, vocab, grammar, soft speaker guess (transcript-based). */
  voiceNoteAnalysis?: QuickCaptureVoiceNoteAnalysis | null
}

function tokenizeDutch(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1)
}

function guessScenarioFromText(combined: string): string | null {
  const s = combined.toLowerCase()
  if (/station|spoor|trein|ov-chip|perron|ns\b/.test(s)) return 'train-station'
  if (/albert|supermarkt|jumbo|lidl|ah\b|winkel|boodschap/.test(s)) return 'supermarket-shop'
  if (/arts|huisarts|apotheek|medicijn|pijn|ziek/.test(s)) return 'doctor-pharmacy'
  if (/gemeente|paspoort|id-kaart|inschrijf|duid/.test(s)) return 'gemeente-style'
  if (/café|restaurant|eten bestellen|menu|ober/.test(s)) return 'ordering-food'
  return null
}

function parseStruggleTags(secondary: string | null | undefined): string[] {
  const s = secondary?.trim() ?? ''
  const m = /^tags:([\w,_-]+)/i.exec(s)
  if (!m) return []
  return m[1].split(',').map((x) => x.trim()).filter(Boolean)
}

function normSlug(slug: string | null | undefined): string | null {
  if (!slug?.trim()) return null
  return slug.trim().replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase()
}

function buildWeakWords(params: {
  captureType: QuickCaptureType
  primaryText: string
  combined: string
  captureId: string
  enrichment: QuickCaptureEnrichmentPayload | null
}): SessionInsightWeakWord[] {
  const { captureType, primaryText, combined, captureId, enrichment } = params
  const tokens = tokenizeDutch(combined).slice(0, 14)
  const hints = enrichment?.voicePracticeSurface?.vocabularyHints ?? []
  const out: SessionInsightWeakWord[] = []

  const pushWord = (
    display: string,
    key: string,
    category: string,
    severityScore: number,
    confidence: number,
    source: string,
  ) => {
    const dk = key.toLowerCase().trim()
    if (dk.length < 2) return
    out.push({
      source,
      severity: severityScore >= 0.55 ? 2 : 1,
      severityScore,
      confidence,
      evidenceRefs: [captureId],
      supportingText: primaryText.slice(0, 200),
      normalizedKey: dk,
      displayText: display.trim() || dk,
      category,
    })
  }

  if (captureType === 'save_word') {
    const w = primaryText.trim()
    if (w) pushWord(w, w, 'vocabulary_saved_word', 0.62, 0.68, 'quick_capture_word')
    return out.slice(0, 4)
  }
  if (captureType === 'save_phrase') {
    const phrase = primaryText.trim()
    if (phrase) {
      pushWord(phrase, phrase.slice(0, 48), 'phrase_chunk', 0.52, 0.64, 'quick_capture_phrase')
    }
    return out.slice(0, 3)
  }
  for (const h of hints.slice(0, 5)) {
    pushWord(h, h, 'voice_vocab_hint', 0.48, 0.58, 'quick_capture_voice_vocab')
  }
  const maxTok = captureType === 'voice_note' ? 8 : 6
  for (const t of tokens.slice(0, maxTok)) {
    pushWord(t, t, 'vocabulary_real_world', 0.36, 0.55, 'quick_capture_vocab')
  }
  return out.slice(0, 8)
}

function buildWeakPatterns(params: {
  captureId: string
  captureType: QuickCaptureType
  placeKind: string | null | undefined
  secondaryText: string | null | undefined
  enrichment: QuickCaptureEnrichmentPayload | null
  slugGuess: string | null
  primaryText: string
}): SessionInsightWeakPattern[] {
  const patterns: SessionInsightWeakPattern[] = []
  const pk = params.placeKind?.trim()
  if (pk) {
    patterns.push({
      patternId: `qc_place_kind:${pk}`,
      label: `Repeated place context: ${pk.replace(/_/g, ' ')}`,
      explanation: 'Quick Capture place — boosts scenario confidence for this setting.',
      source: 'quick_capture_place',
      severity: 1,
      severityScore: 0.42,
      confidence: 0.58,
      evidenceRefs: [params.captureId],
      supportingText: params.primaryText.slice(0, 160),
    })
  }
  const placeGuess = params.enrichment?.likelyPlaceType?.trim()
  if (placeGuess && placeGuess !== pk) {
    patterns.push({
      patternId: `qc_place_inferred:${placeGuess.toLowerCase().replace(/\s+/g, '_')}`,
      label: `Inferred setting: ${placeGuess}`,
      explanation: params.enrichment?.likelyScenario ?? null,
      source: 'quick_capture_place_inferred',
      severity: 1,
      severityScore: 0.38,
      confidence: 0.52,
      evidenceRefs: [params.captureId],
      supportingText: params.primaryText.slice(0, 120),
    })
  }
  const sigs = [...(params.enrichment?.struggleSignals ?? []), ...parseStruggleTags(params.secondaryText)]
  const seen = new Set<string>()
  for (const raw of sigs) {
    const s = raw.trim().toLowerCase()
    if (!s || seen.has(s)) continue
    seen.add(s)
    patterns.push({
      patternId: `qc_struggle:${s}`,
      label: `Reported friction: ${s.replace(/_/g, ' ')}`,
      explanation: 'From Quick Capture struggle log or enrichment.',
      source: 'quick_capture_struggle',
      severity: 1,
      severityScore: 0.55,
      confidence: 0.6,
      evidenceRefs: [params.captureId],
      supportingText: params.primaryText.slice(0, 200),
    })
  }
  if (params.slugGuess) {
    patterns.push({
      patternId: `qc_scenario_domain:${params.slugGuess}`,
      label: 'Scenario domain exposure',
      explanation: `Mapped toward ${params.slugGuess.replace(/-/g, ' ')} practice.`,
      source: 'quick_capture_scenario_domain',
      severity: 1,
      severityScore: 0.4,
      confidence: 0.54,
      evidenceRefs: [params.captureId],
      supportingText: params.primaryText.slice(0, 160),
    })
  }
  const oc = params.enrichment?.overallConfidence
  if (params.enrichment?.needsReview || (typeof oc === 'number' && oc < 0.42)) {
    patterns.push({
      patternId: 'qc_confidence_low',
      label: 'Capture interpretation uncertain',
      explanation: 'OCR/STT/LLM confidence was low — worth a quick human check before exam prep.',
      source: 'quick_capture_confidence',
      severity: 1,
      severityScore: 0.48,
      confidence: typeof oc === 'number' ? Math.max(0.35, oc) : 0.45,
      evidenceRefs: [params.captureId],
      supportingText: params.primaryText.slice(0, 120),
    })
  }
  if (params.captureType === 'voice_note') {
    patterns.push({
      patternId: 'qc_modality:spontaneous_speaking',
      label: 'Spontaneous production (voice)',
      explanation: 'Voice note — prioritize pronunciation + on-the-spot wording.',
      source: 'quick_capture_modality',
      severity: 1,
      severityScore: 0.44,
      confidence: 0.56,
      evidenceRefs: [params.captureId],
      supportingText: params.primaryText.slice(0, 160),
    })
  }
  if (params.captureType === 'photo_text' || params.captureType === 'paste_text') {
    patterns.push({
      patternId: 'qc_modality:reading_decode',
      label: 'Reading / decode pressure',
      explanation: 'Text or image capture — reading recognition and chunking.',
      source: 'quick_capture_modality',
      severity: 1,
      severityScore: 0.4,
      confidence: 0.55,
      evidenceRefs: [params.captureId],
      supportingText: params.primaryText.slice(0, 160),
    })
  }
  if (sigs.some((x) => /didnt_understand|too_fast|listen/i.test(x))) {
    patterns.push({
      patternId: 'qc_modality:listening_pressure',
      label: 'Listening / comprehension pressure',
      explanation: 'Capture hints you had trouble following spoken or dense Dutch.',
      source: 'quick_capture_modality',
      severity: 1,
      severityScore: 0.5,
      confidence: 0.57,
      evidenceRefs: [params.captureId],
      supportingText: params.primaryText.slice(0, 160),
    })
  }
  const wtn = params.enrichment?.voicePracticeSurface?.whatToSayNextNl?.trim()
  const polished = params.enrichment?.voicePracticeSurface?.polishedDutch?.trim()
  if (wtn || polished) {
    patterns.push({
      patternId: 'qc_what_to_say_next',
      label: 'What to say next time',
      explanation: wtn ?? polished ?? null,
      source: 'quick_capture_voice_drill',
      severity: 1,
      severityScore: 0.58,
      confidence: 0.62,
      evidenceRefs: [params.captureId],
      supportingText: params.primaryText.slice(0, 200),
    })
  }
  return patterns.slice(0, 14)
}

function buildHesitations(
  struggleTags: string[],
  captureId: string,
  extractedAt: string,
  primaryText: string,
): SessionInsightHesitation[] {
  const out: SessionInsightHesitation[] = []
  const tagToPattern: Record<string, { pid: string; label: string }> = {
    froze: { pid: 'qc_hesitation_freeze', label: 'Freeze under real-world pressure' },
    too_fast: { pid: 'qc_hesitation_too_fast', label: 'Partner spoke too fast to follow' },
    wrong_word: { pid: 'qc_hesitation_word_choice', label: 'Wrong word in the moment' },
    didnt_know_how: { pid: 'qc_hesitation_formulation', label: 'Did not know how to phrase' },
    didnt_understand: { pid: 'qc_hesitation_listen', label: 'Did not understand reply' },
  }
  const seen = new Set<string>()
  for (const t of struggleTags) {
    const k = t.trim().toLowerCase()
    const m = tagToPattern[k]
    if (!m || seen.has(m.pid)) continue
    seen.add(m.pid)
    out.push({
      patternId: m.pid,
      label: m.label,
      severityScore: 0.95,
      confidence: 0.55,
      firstSeenAt: extractedAt,
      lastSeenAt: extractedAt,
      occurrences: 1,
      scenarioIds: [],
      evidenceRefs: [captureId],
      recoveryScore: 0.22,
      source: 'quick_capture_struggle_tag',
      supportingText: primaryText.slice(0, 160),
    })
  }
  return out.slice(0, 6)
}

/**
 * Session-shaped insights so real-life captures merge into the same profile tail as Speak / Coach
 * (lower merge weight via {@link sessionWeight} for `quick_capture`).
 */
export function extractSessionInsightsFromQuickCapture(params: {
  captureId: string
  userId: string
  captureType: QuickCaptureType
  primaryText: string
  secondaryText?: string | null
  /** Raw `placeKind` from capture row (add_place). */
  placeKind?: string | null
  enrichment: QuickCaptureEnrichmentPayload | null
  scenarioId: string | null
}): SessionLearningInsights {
  const extractedAt = new Date().toISOString()
  const combined = [params.primaryText, params.secondaryText ?? '', params.enrichment?.registerNotes ?? ''].join(' ')
  const slugGuess = normSlug(params.enrichment?.scenarioSlugGuess ?? guessScenarioFromText(combined))

  const weakWords = buildWeakWords({
    captureType: params.captureType,
    primaryText: params.primaryText,
    combined,
    captureId: params.captureId,
    enrichment: params.enrichment,
  })

  const weakPatterns = buildWeakPatterns({
    captureId: params.captureId,
    captureType: params.captureType,
    placeKind: params.placeKind,
    secondaryText: params.secondaryText,
    enrichment: params.enrichment,
    slugGuess,
    primaryText: params.primaryText,
  })

  const pronunciationIssues: SessionInsightPronunciation[] = []
  if (params.captureType === 'voice_note') {
    const stt = params.enrichment?.captureMedia?.audio?.sttConfidence
    const lowStt = typeof stt === 'number' && stt < 0.55
    pronunciationIssues.push({
      targetKey: `qc_voice:${params.captureId.slice(0, 8)}`,
      issueType: lowStt ? 'unclear_spontaneous_speech' : 'spontaneous_production_review',
      source: 'quick_capture_voice',
      severity: 1,
      severityScore: lowStt ? 0.55 : 0.42,
      confidence: lowStt ? 0.52 : 0.48,
      evidenceRefs: [params.captureId],
      supportingText: params.primaryText.slice(0, 180),
    })
  }

  const struggleTags = [...parseStruggleTags(params.secondaryText), ...(params.enrichment?.struggleSignals ?? [])]
  const hesitationIssues = buildHesitations(struggleTags, params.captureId, extractedAt, params.primaryText)

  let scenarioPerformance: SessionLearningInsights['scenarioPerformance'] = null
  if (slugGuess) {
    const sid = `qc-domain-${slugGuess.replace(/[^a-z0-9-]/gi, '')}`
    scenarioPerformance = {
      scenarioId: sid,
      scenarioSlug: slugGuess,
      attempts: 1,
      rollingScore: 59,
      recentScore: 58,
      confidence: 0.48,
      strongSubskills: [],
      weakSubskills: ['domain_exposure_from_capture', ...(struggleTags.length ? ['self_reported_friction'] : [])],
      lastAttemptAt: extractedAt,
    }
  }

  const strengths: SessionLearningInsights['strengths'] = []
  if (params.enrichment?.phase === 'day_practice_complete') {
    strengths.push({
      label: 'Real-life Dutch practice',
      source: 'quick_capture_practice',
      severity: 1,
      severityScore: 0.4,
      confidence: 0.72,
      evidenceRefs: [params.captureId],
      supportingText: 'Completed personalized practice from your day.',
    })
  } else {
    strengths.push({
      label: 'Noticing Dutch in the wild',
      source: 'quick_capture',
      severity: 1,
      severityScore: 0.35,
      confidence: 0.62,
      evidenceRefs: [params.captureId],
      supportingText: params.primaryText.slice(0, 160),
    })
  }

  return {
    schemaVersion: SESSION_LEARNING_INSIGHTS_SCHEMA_VERSION,
    sessionId: params.captureId,
    userId: params.userId,
    sessionType: 'quick_capture',
    scenarioId: params.scenarioId,
    extractedAt,
    weakWords,
    weakPatterns,
    pronunciationIssues,
    hesitationIssues,
    scenarioPerformance,
    strengths,
    confidenceSummary:
      (params.enrichment?.phase === 'day_practice_complete'
        ? 'Reinforced language noticed during the day.'
        : 'Saved real-world Dutch for later practice.') + (slugGuess ? ` Linked context: ${slugGuess}.` : ''),
  }
}
