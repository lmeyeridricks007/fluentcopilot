import { describe, expect, it } from 'vitest'
import { buildListeningCoachReport } from '@/lib/listening-mode/listeningReportBuilder'
import type { ListeningClipAttempt, ListeningSessionReviewClip } from '@/lib/listening-mode/schema'

describe('buildListeningCoachReport', () => {
  it('returns coach-style headline and five user dimensions', () => {
    const attempts: ListeningClipAttempt[] = [
      {
        clipId: 'a',
        drillType: 'gist',
        scenarioId: 'cafe',
        correct: true,
        playsBeforeAnswer: 1,
        playsSlowAfterAnswer: 0,
        transcriptRevealed: false,
        revealedMeaning: false,
        listeningTags: ['gist'],
      },
      {
        clipId: 'b',
        drillType: 'detail_catch',
        scenarioId: 'cafe',
        correct: true,
        playsBeforeAnswer: 1,
        playsSlowAfterAnswer: 0,
        transcriptRevealed: false,
        revealedMeaning: false,
        listeningTags: ['key_details'],
      },
    ]
    const r = buildListeningCoachReport({
      level: 'A2',
      scenarioId: 'cafe',
      packId: 'pack-cafe-burst',
      attempts,
      recommendedNext: { packId: 'pack-train-platform', title: 'Platforms', reason: 'Travel thread.' },
    })
    expect(r.headline.length).toBeGreaterThan(10)
    expect(r.userDimensions).toHaveLength(5)
    const gist = r.userDimensions.find((d) => d.id === 'gist_understanding')
    expect(gist?.clipsSampled).toBe(1)
    expect(gist?.percentCorrect).toBe(100)
    const fast = r.userDimensions.find((d) => d.id === 'fast_speech_handling')
    expect(fast?.clipsSampled).toBe(0)
    expect(fast?.percentCorrect).toBeNull()
    expect(r.sections.map((s) => s.id)).toContain('strongest_area')
    expect(r.recommendedNext?.packId).toBe('pack-train-platform')
  })

  it('builds review mistake items from review clips', () => {
    const attempts: ListeningClipAttempt[] = [
      {
        clipId: 'x',
        drillType: 'gist',
        scenarioId: 'cafe',
        correct: false,
        selectedIndex: 1,
        playsBeforeAnswer: 2,
        playsSlowAfterAnswer: 0,
        transcriptRevealed: false,
        revealedMeaning: false,
        listeningTags: [],
      },
    ]
    const reviewClips: ListeningSessionReviewClip[] = [
      {
        clipId: 'x',
        drillType: 'gist',
        scenarioId: 'cafe',
        instructionEn: 'What is happening?',
        meaningEn: 'They order drinks.',
        transcriptNl: 'Twee koffie graag.',
        optionLabels: ['Order drinks', 'Ask directions', 'Complain', 'Book table'],
        correctIndex: 0,
        speakLinesNl: ['Twee koffie graag.'],
        attemptCorrect: false,
        selectedIndex: 1,
        hadTranscriptReveal: false,
      },
    ]
    const r = buildListeningCoachReport({
      level: 'A2',
      scenarioId: 'cafe',
      attempts,
      reviewClips,
    })
    expect(r.reviewMistakes).toHaveLength(1)
    expect(r.reviewMistakes[0]?.whatMissedEn).toContain('Ask directions')
  })

  it('surfaces weaker dimension bands when most attempts miss', () => {
    const attempts: ListeningClipAttempt[] = Array.from({ length: 5 }).map((_, i) => ({
      clipId: `c${i}`,
      drillType: 'gist' as const,
      scenarioId: 'train',
      correct: false,
      selectedIndex: 1,
      playsBeforeAnswer: 2,
      playsSlowAfterAnswer: 0,
      transcriptRevealed: false,
      revealedMeaning: false,
      listeningTags: ['gist'],
    }))
    const r = buildListeningCoachReport({
      level: 'A2',
      scenarioId: 'train',
      packId: 'pack-train-platform',
      attempts,
    })
    const weak = r.userDimensions.filter((d) => d.band === 'steady' || d.band === 'building')
    expect(weak.length).toBeGreaterThanOrEqual(1)
  })
})
