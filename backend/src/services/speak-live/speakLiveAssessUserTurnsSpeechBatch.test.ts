import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { PostSessionSpeechTurnInput } from './speakLiveNormalizedConversation'
import type { PostSessionSpeechTurnResult } from './speakLivePostSessionSpeechAssessment'
import * as postSessionSpeech from './speakLivePostSessionSpeechAssessment'
import {
  assessUserTurnsSpeechBatch,
  buildEmergencyUserTurnsSpeechBatchResult,
  buildUserTurnSpeechMetricsFromResult,
  resetAzureSpeechBatchAssessorCacheForTests,
} from './speakLiveAssessUserTurnsSpeechBatch'
import type { TurnEvaluation } from './liveVoiceEvaluationTypes'

function makeUserTurn(msgId: string, index: number, withBlob: boolean): PostSessionSpeechTurnInput {
  return {
    msg: {
      id: msgId,
      threadId: 'th',
      sender: 'user',
      messageType: 'text',
      content: 'Hoi',
      createdAt: '2026-05-01T10:00:00.000Z',
      metadata: withBlob ? { learnerAudioBlobPath: 'path.webm' } : {},
    },
    assistant: 'Hey',
    index,
  }
}

function makeTurnResult(turnId: string, index: number, o: { hadAudio: boolean; assessmentOk: boolean }): PostSessionSpeechTurnResult {
  const te = {
    turnId,
    turnIndex: index,
    audioScores: { pronunciation: 70, fluency: 70, rhythm: 70, completeness: 70, clarity: 70 },
  } as TurnEvaluation
  return {
    llmFact: {
      turnId,
      turnIndex: index,
      learnerTranscript: 'Hoi',
      learnerTranscriptNormalized: 'Hoi',
      assistantReply: 'Hey',
      hasLearnerAudio: o.hadAudio,
      sessionGoals: ['g'],
      azureSummary: null,
    },
    turnEval: te,
    weakWordList: [],
    audioCtx: null,
    turnTiming: {
      turnId,
      turnIndex: index,
      totalMs: 12,
      blobDownloadMs: 1,
      audioAssessmentMs: 10,
      timingAnalysisMs: 1,
      blobBytes: o.hadAudio ? 100 : 0,
      hadAudio: o.hadAudio,
      assessmentOk: o.assessmentOk,
      skippedReason: !o.hadAudio ? 'no_audio' : undefined,
      assessmentSource: 'live',
      providerRequestMs: o.hadAudio ? 10 : 0,
    },
  }
}

describe('speakLiveAssessUserTurnsSpeechBatch', () => {
  beforeEach(() => {
    resetAzureSpeechBatchAssessorCacheForTests()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetAzureSpeechBatchAssessorCacheForTests()
  })

  it('calls assessPostSessionUserTurn once per user turn only', async () => {
    const spy = vi.spyOn(postSessionSpeech, 'assessPostSessionUserTurn').mockImplementation(async ({ turn }) => {
      return makeTurnResult(turn.msg.id, turn.index, { hadAudio: true, assessmentOk: true })
    })
    const userTurns = [makeUserTurn('a', 0, true), makeUserTurn('b', 1, true)]
    const out = await assessUserTurnsSpeechBatch({
      threadId: 'th',
      scenarioGoals: ['g'],
      userTurns,
      concurrencyLimit: 2,
    })
    expect(spy).toHaveBeenCalledTimes(2)
    expect(out.turnResults).toHaveLength(2)
    expect(out.batch.concurrencyLimit).toBe(2)
    expect(out.batch.assessedTurnCount).toBe(2)
    expect(out.batch.skippedTurnCount).toBe(0)
    expect(out.batch.azureMode).toBe('live')
    expect(out.batch.providerRequestMs).toBeGreaterThan(0)
    for (const r of out.turnResults) {
      expect(r.turnTiming.assessmentSource).toBe('live')
      expect(r.turnTiming.providerRequestMs).toBeGreaterThan(0)
    }
  })

  it('counts no-audio turns as skipped', async () => {
    vi.spyOn(postSessionSpeech, 'assessPostSessionUserTurn').mockImplementation(async ({ turn }) =>
      makeTurnResult(turn.msg.id, turn.index, { hadAudio: false, assessmentOk: false }),
    )
    const out = await assessUserTurnsSpeechBatch({
      threadId: 'th',
      scenarioGoals: ['g'],
      userTurns: [makeUserTurn('x', 0, false)],
      concurrencyLimit: 3,
    })
    expect(out.batch.skippedTurnCount).toBe(1)
    expect(out.batch.assessedTurnCount).toBe(0)
    expect(out.batch.failedTurnCount).toBe(0)
  })

  it('counts partial Azure failure (had audio, assessment not ok)', async () => {
    let n = 0
    vi.spyOn(postSessionSpeech, 'assessPostSessionUserTurn').mockImplementation(async ({ turn }) => {
      n++
      const ok = n === 1
      return makeTurnResult(turn.msg.id, turn.index, { hadAudio: true, assessmentOk: ok })
    })
    const out = await assessUserTurnsSpeechBatch({
      threadId: 'th',
      scenarioGoals: ['g'],
      userTurns: [makeUserTurn('t1', 0, true), makeUserTurn('t2', 1, true)],
      concurrencyLimit: 5,
    })
    expect(out.batch.assessedTurnCount).toBe(1)
    expect(out.batch.failedTurnCount).toBe(1)
    expect(out.batch.skippedTurnCount).toBe(0)
  })

  it('counts all Azure failures when audio exists but assessment never succeeds', async () => {
    vi.spyOn(postSessionSpeech, 'assessPostSessionUserTurn').mockImplementation(async ({ turn }) =>
      makeTurnResult(turn.msg.id, turn.index, { hadAudio: true, assessmentOk: false }),
    )
    const out = await assessUserTurnsSpeechBatch({
      threadId: 'th',
      scenarioGoals: ['g'],
      userTurns: [makeUserTurn('x', 0, true), makeUserTurn('y', 1, true)],
      concurrencyLimit: 4,
    })
    expect(out.batch.assessedTurnCount).toBe(0)
    expect(out.batch.failedTurnCount).toBe(2)
    expect(out.batch.skippedTurnCount).toBe(0)
  })

  it('buildEmergencyUserTurnsSpeechBatchResult yields one stub per turn so composer can proceed', () => {
    const userTurns = [makeUserTurn('u1', 0, true), makeUserTurn('u2', 1, false)]
    const out = buildEmergencyUserTurnsSpeechBatchResult({
      threadId: 'th',
      scenarioGoals: ['g'],
      userTurns,
      batchStarted: Date.now() - 5,
      error: new Error('azure down'),
    })
    expect(out.turnResults).toHaveLength(2)
    expect(out.turnResults[0]!.turnTiming.errorCode).toBe('speech_assessment_emergency')
    expect(out.batch.skippedTurnCount).toBeGreaterThanOrEqual(1)
  })

  it('per-turn diagnostics include timing fields on metrics source turn', () => {
    const tr = makeTurnResult('tid', 0, { hadAudio: true, assessmentOk: true })
    tr.turnTiming.blobDownloadMs = 3
    tr.turnTiming.audioAssessmentMs = 20
    const m = buildUserTurnSpeechMetricsFromResult(tr)
    expect(m.turnId).toBe('tid')
    expect(m.assessmentOk).toBe(true)
    expect(tr.turnTiming.totalMs).toBeGreaterThanOrEqual(0)
    expect(tr.turnTiming.blobDownloadMs).toBe(3)
  })
})
