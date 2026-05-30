import { describe, expect, it } from 'vitest'
import type { QuickCaptureItem } from '@/lib/api/quickCaptureClient'
import {
  captureDisplayTitle,
  capturePreviewText,
  parseQuickCaptureEnrichment,
} from '@/features/library/capture/parseQuickCaptureEnrichment'

function base(): QuickCaptureItem {
  const now = new Date().toISOString()
  return {
    id: 'x',
    captureType: 'photo_text',
    status: 'enriched',
    title: null,
    bodyPrimary: null,
    bodySecondary: null,
    enrichedJson: null,
    rawJson: null,
    localCaptureDate: '2026-04-22',
    placeKind: null,
    imageMime: 'image/jpeg',
    transcript: null,
    dayPackId: null,
    createdAt: now,
    updatedAt: now,
  }
}

describe('parseQuickCaptureEnrichment', () => {
  it('returns null for empty enrichedJson', () => {
    expect(parseQuickCaptureEnrichment(base())).toBeNull()
  })

  it('parses OCR text, tags, scenario, voice surface (enrichment pipeline output shape)', () => {
    const enrichedJson = JSON.stringify({
      tags: ['aankomst'],
      scenarioSlugGuess: 'train-station',
      ocrText: 'Vertrek 12:05',
      overallConfidence: 0.72,
      needsReview: false,
      struggleSignals: ['listening_in_noise'],
      skillImpacts: [{ skill: 'listening', impact: 'boost', confidence: 0.5 }],
      practiceRecommendations: [{ kind: 'read_aloud_source', confidence: 0.6, rationale: 'Good chunk' }],
      voicePracticeSurface: {
        polishedDutch: 'Ik wil graag een ticket.',
        englishGloss: 'I would like a ticket.',
        whatToSayNextNl: null,
        phrasePracticeNl: null,
        coachDebriefSeed: null,
        miniScenarioSlugGuess: null,
        miniScenarioSeedNl: null,
        vocabularyHints: ['ticket'],
      },
    })
    const row = { ...base(), enrichedJson }
    const e = parseQuickCaptureEnrichment(row)
    expect(e).not.toBeNull()
    expect(e?.ocrText).toBe('Vertrek 12:05')
    expect(e?.tags).toContain('aankomst')
    expect(e?.scenarioSlugGuess).toBe('train-station')
    expect(e?.voicePracticeSurface?.polishedDutch).toContain('ticket')
    expect(e?.struggleSignals).toContain('listening_in_noise')
  })

  it('parses voiceNoteAnalysis when present', () => {
    const enrichedJson = JSON.stringify({
      tags: [],
      voiceNoteAnalysis: {
        contextSummaryEn: 'Shop counter exchange.',
        vocabularyHighlightsNl: ['alstublieft', 'bon'],
        grammarNotesEn: ['Word order in questions might differ from English.'],
        estimatedSpeakerCount: 2,
        learnerSpeakerInference: 'likely_dialogue_two_or_more',
        learnerSpeakerRationaleEn: 'Back-and-forth lines.',
        audioDiarizationApplied: false,
        analysisConfidence: 0.62,
      },
    })
    const e = parseQuickCaptureEnrichment({ ...base(), captureType: 'voice_note', enrichedJson })
    expect(e?.voiceNoteAnalysis?.contextSummaryEn).toBe('Shop counter exchange.')
    expect(e?.voiceNoteAnalysis?.estimatedSpeakerCount).toBe(2)
    expect(e?.voiceNoteAnalysis?.learnerSpeakerInference).toBe('likely_dialogue_two_or_more')
    expect(e?.voiceNoteAnalysis?.audioDiarizationApplied).toBe(false)
    expect(e?.voiceNoteAnalysis?.vocabularyHighlightsNl).toContain('alstublieft')
  })
})

describe('capturePreviewText', () => {
  it('prefers bodyPrimary, then OCR from enrichment', () => {
    const row = { ...base(), bodyPrimary: '  Hallo  ' }
    expect(capturePreviewText(row, null).startsWith('Hallo')).toBe(true)
    const enriched = parseQuickCaptureEnrichment({
      ...base(),
      bodyPrimary: null,
      enrichedJson: JSON.stringify({ tags: [], ocrText: 'Menu van de dag' }),
    })
    expect(capturePreviewText({ ...base(), bodyPrimary: null }, enriched)).toContain('Menu')
  })
})

describe('captureDisplayTitle', () => {
  it('falls back to type label when no title or body', () => {
    const row = { ...base(), title: null, bodyPrimary: null, transcript: null }
    expect(captureDisplayTitle(row)).toBeTruthy()
  })
})
