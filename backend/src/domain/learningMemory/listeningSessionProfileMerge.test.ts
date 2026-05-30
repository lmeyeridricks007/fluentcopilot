import { describe, expect, it } from 'vitest'
import { createEmptyUserLearningProfile } from './userLearningProfileDocument'
import { applyListeningSessionToUserLearningProfile } from './listeningSessionProfileMerge'
import type { ListeningSession } from '../listening/listeningSession'
import type { ListeningAttempt } from '../listening/listeningAttempt'

describe('applyListeningSessionToUserLearningProfile', () => {
  it('merges listening signals and bumps modality', () => {
    const doc = createEmptyUserLearningProfile('user-1')
    const session: ListeningSession = {
      id: 'sess-1',
      userId: 'user-1',
      trackId: 't1',
      scenarioId: 'train',
      category: 'travel',
      level: 'A2',
      drillIds: [],
      status: 'completed',
      clientSessionKey: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:30:00.000Z',
    }
    const attempts: ListeningAttempt[] = [
      {
        id: 'a1',
        sessionId: 'sess-1',
        clipId: 'c1',
        drillType: 'fast_speech',
        answer: {},
        answerMode: 'mcq',
        correctGist: false,
        correctDetails: null,
        replayCount: 2,
        slowerReplayUsed: false,
        transcriptRevealed: true,
        responseLatencyMs: 1200,
        evaluation: { correct: false, tags: ['platform_2'] },
        createdAt: '2026-01-01T00:01:00.000Z',
      },
    ]
    applyListeningSessionToUserLearningProfile(doc, {
      session,
      attempts,
      nowIso: '2026-01-01T00:40:00.000Z',
    })
    expect(doc.lastSessionModality).toBe('listening')
    expect(doc.totalSessionsObserved).toBe(1)
    const ids = new Set((doc.listeningMemorySignals ?? []).map((s) => s.signalId))
    expect(ids.has('fast_transport_replies_struggle')).toBe(true)
    expect(ids.has('replay_before_answer')).toBe(true)
    expect(ids.has('transcript_reveal_dependent')).toBe(true)
    expect(doc.userSkillProfile?.recentEvidence?.some((e) => e.sessionType === 'listening')).toBe(true)
  })

  it('does not add replay/transcript signals when learner answers cleanly without replay', () => {
    const doc = createEmptyUserLearningProfile('user-2')
    const session: ListeningSession = {
      id: 'sess-clean',
      userId: 'user-2',
      trackId: 't1',
      scenarioId: 'cafe',
      category: 'food',
      level: 'A2',
      drillIds: [],
      status: 'completed',
      clientSessionKey: null,
      createdAt: '2026-01-02T00:00:00.000Z',
      completedAt: '2026-01-02T00:10:00.000Z',
    }
    const attempts: ListeningAttempt[] = [
      {
        id: 'a1',
        sessionId: 'sess-clean',
        clipId: 'cafe-gist-1',
        drillType: 'gist',
        answer: {},
        answerMode: 'mcq',
        correctGist: true,
        correctDetails: null,
        replayCount: 0,
        slowerReplayUsed: false,
        transcriptRevealed: false,
        responseLatencyMs: 800,
        evaluation: { correct: true },
        createdAt: '2026-01-02T00:01:00.000Z',
      },
    ]
    applyListeningSessionToUserLearningProfile(doc, {
      session,
      attempts,
      nowIso: '2026-01-02T00:15:00.000Z',
    })
    const ids = new Set((doc.listeningMemorySignals ?? []).map((s) => s.signalId))
    expect(ids.has('replay_before_answer')).toBe(false)
    expect(ids.has('transcript_reveal_dependent')).toBe(false)
  })

  it('adds short service-question signal for instruction drills in cafe-like scenarios', () => {
    const doc = createEmptyUserLearningProfile('user-3')
    const session: ListeningSession = {
      id: 'sess-svc',
      userId: 'user-3',
      trackId: 't1',
      scenarioId: 'cafe',
      category: 'food',
      level: 'A2',
      drillIds: [],
      status: 'completed',
      clientSessionKey: null,
      createdAt: '2026-01-03T00:00:00.000Z',
      completedAt: '2026-01-03T00:10:00.000Z',
    }
    const attempts: ListeningAttempt[] = [
      {
        id: 'a1',
        sessionId: 'sess-svc',
        clipId: 'x',
        drillType: 'listen_respond',
        answer: {},
        answerMode: 'mcq',
        correctGist: false,
        correctDetails: null,
        replayCount: 0,
        slowerReplayUsed: false,
        transcriptRevealed: false,
        responseLatencyMs: null,
        evaluation: { correct: false },
        createdAt: '2026-01-03T00:01:00.000Z',
      },
    ]
    applyListeningSessionToUserLearningProfile(doc, { session, attempts, nowIso: '2026-01-03T00:15:00.000Z' })
    const ids = new Set((doc.listeningMemorySignals ?? []).map((s) => s.signalId))
    expect(ids.has('misses_short_service_questions')).toBe(true)
  })
})
