import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveAzureSpeechTurnSkipDiagnostics } from './speakLivePostSessionSpeechAssessment'

describe('resolveAzureSpeechTurnSkipDiagnostics', () => {
  const prev: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const k of ['PRONUNCIATION_MODE', 'AZURE_SPEECH_KEY', 'AZURE_SPEECH_REGION'] as const) {
      prev[k] = process.env[k]
    }
  })

  afterEach(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })

  it('does not use no_audio when hasAudio and blobBytes indicate a clip', () => {
    process.env.PRONUNCIATION_MODE = 'azure'
    process.env.AZURE_SPEECH_KEY = 'test-key'
    process.env.AZURE_SPEECH_REGION = 'westeurope'
    const r = resolveAzureSpeechTurnSkipDiagnostics({
      blobPath: 'sessions/x.webm',
      hasAudio: true,
      blobBytes: 400,
      downloadOk: true,
      prepAssessmentOk: true,
    })
    expect(r.skippedReason).not.toBe('no_audio')
    expect(r.assessmentOk).toBe(true)
  })

  it('uses azure_disabled when Azure lane is not usable but audio evidence exists', () => {
    process.env.PRONUNCIATION_MODE = 'off'
    delete process.env.AZURE_SPEECH_KEY
    delete process.env.AZURE_SPEECH_REGION
    const r = resolveAzureSpeechTurnSkipDiagnostics({
      blobPath: 'sessions/x.webm',
      hasAudio: true,
      blobBytes: 120,
      downloadOk: true,
      prepAssessmentOk: true,
    })
    expect(r.skippedReason).toBe('azure_disabled')
    expect(r.assessmentOk).toBe(false)
  })

  it('uses audio_load_failed when blob exists but download never succeeded', () => {
    process.env.PRONUNCIATION_MODE = 'azure'
    process.env.AZURE_SPEECH_KEY = 'test-key'
    process.env.AZURE_SPEECH_REGION = 'westeurope'
    const r = resolveAzureSpeechTurnSkipDiagnostics({
      blobPath: 'sessions/x.webm',
      hasAudio: false,
      blobBytes: 0,
      downloadOk: false,
      prepAssessmentOk: false,
    })
    expect(r.skippedReason).toBe('audio_load_failed')
    expect(r.assessmentOk).toBe(false)
  })
})
