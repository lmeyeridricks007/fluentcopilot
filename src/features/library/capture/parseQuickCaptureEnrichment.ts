import type { QuickCaptureItem } from '@/lib/api/quickCaptureClient'

export type ParsedPracticeRecommendation = {
  kind: string
  confidence: number
  rationale: string
}

export type ParsedSkillImpact = {
  skill: string
  impact: string
  confidence: number
}

export type ParsedVoicePracticeSurface = {
  polishedDutch: string | null
  englishGloss: string | null
  whatToSayNextNl: string | null
  phrasePracticeNl: string | null
  coachDebriefSeed: string | null
  miniScenarioSlugGuess: string | null
  miniScenarioSeedNl: string | null
  vocabularyHints: string[]
}

export type ParsedVoiceNoteAnalysis = {
  contextSummaryEn: string | null
  vocabularyHighlightsNl: string[]
  grammarNotesEn: string[]
  estimatedSpeakerCount: number | null
  learnerSpeakerInference: string
  learnerSpeakerRationaleEn: string | null
  audioDiarizationApplied: boolean
  analysisConfidence: number
}

export type ParsedCaptureEnrichment = {
  tags: string[]
  scenarioSlugGuess: string | null
  registerNotes: string | null
  englishGloss: string | null
  dutchCanonical: string | null
  overallConfidence: number | null
  needsReview: boolean | null
  likelyMeaning: string | null
  likelyScenario: string | null
  likelyPlaceType: string | null
  struggleSignals: string[]
  skillImpacts: ParsedSkillImpact[]
  practiceRecommendations: ParsedPracticeRecommendation[]
  enrichmentNotes: string | null
  ocrText: string | null
  pipelineVersion: number | null
  voicePracticeSurface: ParsedVoicePracticeSurface | null
  voiceNoteAnalysis: ParsedVoiceNoteAnalysis | null
}

function asStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function asNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function asBool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null
}

export function parseQuickCaptureEnrichment(item: QuickCaptureItem): ParsedCaptureEnrichment | null {
  if (!item.enrichedJson?.trim()) return null
  try {
    const j = JSON.parse(item.enrichedJson) as Record<string, unknown>
    const recs: ParsedPracticeRecommendation[] = []
    if (Array.isArray(j.practiceRecommendations)) {
      for (const x of j.practiceRecommendations) {
        if (!x || typeof x !== 'object') continue
        const o = x as Record<string, unknown>
        const kind = typeof o.kind === 'string' ? o.kind : ''
        const confidence = typeof o.confidence === 'number' ? o.confidence : 0
        const rationale = typeof o.rationale === 'string' ? o.rationale : ''
        if (kind && rationale) recs.push({ kind, confidence, rationale })
      }
    }
    const tags = Array.isArray(j.tags) ? (j.tags as unknown[]).filter((t): t is string => typeof t === 'string') : []
    const struggleSignals = Array.isArray(j.struggleSignals)
      ? (j.struggleSignals as unknown[]).filter((t): t is string => typeof t === 'string')
      : []
    const skillImpacts: ParsedSkillImpact[] = []
    if (Array.isArray(j.skillImpacts)) {
      for (const x of j.skillImpacts) {
        if (!x || typeof x !== 'object') continue
        const o = x as Record<string, unknown>
        const skill = typeof o.skill === 'string' ? o.skill.trim() : ''
        const impact = typeof o.impact === 'string' ? o.impact : ''
        const confidence = typeof o.confidence === 'number' ? o.confidence : 0
        if (skill) skillImpacts.push({ skill, impact, confidence })
      }
    }
    let voiceNoteAnalysis: ParsedVoiceNoteAnalysis | null = null
    const va = j.voiceNoteAnalysis
    if (va && typeof va === 'object') {
      const o = va as Record<string, unknown>
      const inf = typeof o.learnerSpeakerInference === 'string' ? o.learnerSpeakerInference : 'unknown'
      const esc = o.estimatedSpeakerCount
      const estimatedSpeakerCount =
        typeof esc === 'number' && Number.isFinite(esc) && esc >= 1 && esc <= 6 ? Math.round(esc) : null
      const voc = Array.isArray(o.vocabularyHighlightsNl)
        ? (o.vocabularyHighlightsNl as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 16)
        : []
      const gram = Array.isArray(o.grammarNotesEn)
        ? (o.grammarNotesEn as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 10)
        : []
      voiceNoteAnalysis = {
        contextSummaryEn: asStr(o.contextSummaryEn),
        vocabularyHighlightsNl: voc,
        grammarNotesEn: gram,
        estimatedSpeakerCount,
        learnerSpeakerInference: inf,
        learnerSpeakerRationaleEn: asStr(o.learnerSpeakerRationaleEn),
        audioDiarizationApplied: o.audioDiarizationApplied === true,
        analysisConfidence: asNum(o.analysisConfidence) ?? 0,
      }
    }

    let voicePracticeSurface: ParsedVoicePracticeSurface | null = null
    const vs = j.voicePracticeSurface
    if (vs && typeof vs === 'object') {
      const o = vs as Record<string, unknown>
      const voc = Array.isArray(o.vocabularyHints)
        ? (o.vocabularyHints as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 12)
        : []
      voicePracticeSurface = {
        polishedDutch: asStr(o.polishedDutch),
        englishGloss: asStr(o.englishGloss),
        whatToSayNextNl: asStr(o.whatToSayNextNl),
        phrasePracticeNl: asStr(o.phrasePracticeNl),
        coachDebriefSeed: asStr(o.coachDebriefSeed),
        miniScenarioSlugGuess: asStr(o.miniScenarioSlugGuess),
        miniScenarioSeedNl: asStr(o.miniScenarioSeedNl),
        vocabularyHints: voc,
      }
    }

    return {
      tags,
      scenarioSlugGuess: asStr(j.scenarioSlugGuess),
      registerNotes: asStr(j.registerNotes),
      englishGloss: asStr(j.englishGloss),
      dutchCanonical: asStr(j.dutchCanonical),
      overallConfidence: asNum(j.overallConfidence),
      needsReview: asBool(j.needsReview),
      likelyMeaning: asStr(j.likelyMeaning),
      likelyScenario: asStr(j.likelyScenario),
      likelyPlaceType: asStr(j.likelyPlaceType),
      struggleSignals,
      skillImpacts: skillImpacts.slice(0, 12),
      practiceRecommendations: recs.slice(0, 8),
      enrichmentNotes: asStr(j.enrichmentNotes),
      ocrText: asStr(j.ocrText),
      pipelineVersion: asNum(j.pipelineVersion),
      voicePracticeSurface,
      voiceNoteAnalysis,
    }
  } catch {
    return null
  }
}

export function capturePreviewText(item: QuickCaptureItem, enrichment: ParsedCaptureEnrichment | null): string {
  const primary = (item.bodyPrimary ?? item.transcript ?? '').trim()
  if (primary) return primary.slice(0, 160)
  const ocr = enrichment?.ocrText?.trim()
  if (ocr) return ocr.slice(0, 160)
  return (item.title ?? '').trim() || 'Open to see more'
}

export function captureDisplayTitle(item: QuickCaptureItem): string {
  const t = (item.title ?? '').trim()
  if (t) return t.slice(0, 80)
  const p = (item.bodyPrimary ?? item.transcript ?? '').trim()
  if (p) return p.slice(0, 56) + (p.length > 56 ? '…' : '')
  return typeLabel(item.captureType)
}

export function typeLabel(t: QuickCaptureItem['captureType']): string {
  switch (t) {
    case 'save_word':
      return 'Word'
    case 'save_phrase':
      return 'Phrase'
    case 'photo_text':
      return 'Photo'
    case 'add_place':
      return 'Place'
    case 'paste_text':
      return 'Paste'
    case 'log_struggle':
      return 'Rough moment'
    case 'voice_note':
      return 'Voice'
    default:
      return 'Capture'
  }
}
