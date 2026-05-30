import { describe, expect, it } from 'vitest'
import { buildListeningReportDocument } from './listeningReportFromAttempts'
import type { ListeningAttempt } from '../../domain/listening/listeningAttempt'
import type { ListeningSession } from '../../domain/listening/listeningSession'
import type { ListeningClip } from '../../domain/listening/listeningClip'
import type { ListeningLevel } from '../../domain/listening/listeningLevel'

describe('buildListeningReportDocument', () => {
  const session: ListeningSession = {
    id: 's1',
    userId: 'u1',
    scenarioId: 'cafe',
    category: 'food',
    level: 'A2',
    drillIds: ['cafe-gist-1'],
    createdAt: new Date().toISOString(),
    completedAt: null,
    status: 'completed',
    trackId: 'pack-cafe-burst',
    clientSessionKey: null,
  }

  it('builds summary for all-correct attempts', () => {
    const attempts: ListeningAttempt[] = [
      {
        id: 'a1',
        sessionId: 's1',
        clipId: 'cafe-gist-1',
        drillType: 'gist',
        answer: { selectedIndex: 0 },
        answerMode: 'mcq',
        correctGist: true,
        correctDetails: null,
        replayCount: 1,
        slowerReplayUsed: false,
        transcriptRevealed: false,
        responseLatencyMs: null,
        evaluation: { correct: true },
        createdAt: new Date().toISOString(),
      },
    ]
    const clipByKey = new Map<string, ListeningClip>()
    const doc = buildListeningReportDocument({ session, attempts, clipByKey })
    expect(doc.topSummary.length).toBeGreaterThan(10)
    expect(doc.dimensionScores.gist).toBeGreaterThan(70)
  })

  it('surfaces replay-dependence weak area when many replays and misses', () => {
    const attempts: ListeningAttempt[] = [
      {
        id: 'a1',
        sessionId: 's1',
        clipId: 'cafe-gist-1',
        drillType: 'gist',
        answer: { selectedIndex: 2 },
        answerMode: 'mcq',
        correctGist: false,
        correctDetails: null,
        replayCount: 4,
        slowerReplayUsed: false,
        transcriptRevealed: false,
        responseLatencyMs: null,
        evaluation: { correct: false },
        createdAt: new Date().toISOString(),
      },
    ]
    const clipByKey = new Map<string, ListeningClip>()
    const doc = buildListeningReportDocument({ session, attempts, clipByKey })
    expect(doc.weakAreas.some((w) => w.key === 'replay_dependence')).toBe(true)
  })

  it('includes missed detail rows for failed detail drills when clip metadata exists', () => {
    const attempts: ListeningAttempt[] = [
      {
        id: 'a1',
        sessionId: 's1',
        clipId: 'cafe-detail-1',
        drillType: 'detail',
        answer: { selectedIndex: 0 },
        answerMode: 'mcq',
        correctGist: true,
        correctDetails: false,
        replayCount: 1,
        slowerReplayUsed: false,
        transcriptRevealed: false,
        responseLatencyMs: null,
        evaluation: { correct: false },
        createdAt: new Date().toISOString(),
      },
    ]
    const clip: ListeningClip = {
      id: 'cafe-detail-1',
      scenarioId: 'cafe',
      category: 'food',
      level: 'A2' as ListeningLevel,
      drillType: 'detail',
      speakerProfile: { speechRateHint: 0.9 },
      transcript: 'x',
      normalizedTranscript: null,
      targetMeaning: 'y',
      keyDetails: ['two', 'black'],
      responseExpectation: null,
      audioUrl: null,
      metadata: { optionLabels: ['One', 'Two'] },
    }
    const clipByKey = new Map<string, ListeningClip>([['cafe-detail-1', clip]])
    const doc = buildListeningReportDocument({ session, attempts, clipByKey })
    expect(doc.missedDetails.length).toBeGreaterThanOrEqual(1)
  })
})
