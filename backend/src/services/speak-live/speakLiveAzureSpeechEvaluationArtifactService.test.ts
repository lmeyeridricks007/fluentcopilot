import { describe, expect, it } from 'vitest'
import {
  buildSpeakLiveAzureSpeechTurnEvaluationArtifact,
  extractPhonemeIssuesFromAzureProviderJson,
} from './speakLiveAzureSpeechEvaluationArtifactService'
import type { NormalizedPronunciationAssessment } from '../speech/pronunciationAssessmentContracts'
import type { TimingAnalysis } from '../../domain/speaking-assessment/speakingAssessmentCanonical'

const timingStub: TimingAnalysis = {
  totalDurationMs: 2000,
  speakingDurationMs: 1600,
  silenceDurationMs: 400,
  pauseCount: 2,
  avgPauseMs: 120,
  longestPauseMs: 200,
  wordsSpokenCount: 4,
  estimatedWpm: 110,
  phraseBoundaryCandidates: [],
  rushedEnding: false,
  trailingCompression: false,
  hesitationMoments: [{ afterWordIndex: 1, pauseMs: 300 }],
  paceProfile: 'steady',
  paceNotes: [],
  sentenceLevelNotes: [],
}

describe('speakLiveAzureSpeechEvaluationArtifactService', () => {
  it('extracts phoneme issues from Azure-like JSON', () => {
    const raw = {
      NBest: [
        {
          Words: [
            {
              Word: 'hallo',
              Phonemes: [
                { Phoneme: 'h', PronunciationAssessment: { AccuracyScore: 40, ErrorType: 'Mispronunciation' } },
              ],
            },
          ],
        },
      ],
    }
    const issues = extractPhonemeIssuesFromAzureProviderJson(raw, 10)
    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0]!.word).toContain('hallo')
    expect(issues[0]!.phoneme).toBeTruthy()
  })

  it('builds a valid artifact with omissions and insertions', () => {
    const assessment: NormalizedPronunciationAssessment = {
      pronunciationScore: 70,
      accuracyScore: 68,
      fluencyScore: 72,
      completenessScore: 65,
      prosodyScore: 60,
      overallScore: 69,
      recognizedText: 'test',
      referenceTextUsed: 'test',
      assessmentMode: 'open_response',
      referenceAlignment: 'spoken_text_proxy',
      words: [
        { word: 'foo', accuracyScore: 50, errorType: 'Omission' },
        { word: 'bar', accuracyScore: 45, errorType: 'Insertion' },
      ],
      actionNotes: [],
      caveatNotes: [],
    }
    const audioScores = { pronunciation: 70, fluency: 72, rhythm: 68, completeness: 65, clarity: 66 }
    const a = buildSpeakLiveAzureSpeechTurnEvaluationArtifact({
      turnId: '22222222-2222-4222-8222-222222222222',
      transcriptReference: 'test',
      audioBlobPath: 'blob/x',
      turnRecordedAtMs: 1_700_000_000_000,
      assessment,
      timing: timingStub,
      audioScores,
      providerRawResult: null,
    })
    expect(a).not.toBeNull()
    expect(a!.omittedWords).toContain('foo')
    expect(a!.insertedWords).toContain('bar')
    expect(a!.hesitationCount).toBe(1)
    expect(a!.speakingRate).toBe(110)
  })
})
