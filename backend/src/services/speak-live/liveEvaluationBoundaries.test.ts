import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  FORBIDDEN_IMPORT_PATH_FRAGMENTS,
  LIVE_SPEECH_BOUNDARY_RELATIVE_FILES,
  assertLiveSpeechBoundarySources,
  listForbiddenImportViolations,
  readSpeakLiveSourceFile,
  resolveSpeakLiveSourcesDir,
} from './liveEvaluationImportBoundary'

function readConversationAppService(): string {
  const speakLive = resolveSpeakLiveSourcesDir()
  const conversationDir = path.join(speakLive, '..', 'conversation')
  return fs.readFileSync(path.join(conversationDir, 'conversationAppService.ts'), 'utf8')
}

describe('live vs post-session evaluation boundaries', () => {
  it('live speech boundary modules have no forbidden static imports', () => {
    expect(() => assertLiveSpeechBoundarySources()).not.toThrow()
  })

  it.each([...LIVE_SPEECH_BOUNDARY_RELATIVE_FILES])('%s individually passes forbidden-import scan', (rel) => {
    const src = readSpeakLiveSourceFile(rel)
    const v = listForbiddenImportViolations(src, rel)
    expect(v, v.join('\n')).toEqual([])
  })

  it('post-session evaluation service wires the pipeline (positive control)', () => {
    const src = readSpeakLiveSourceFile('postSessionEvaluationService.ts')
    expect(src).toContain('speakLivePostSessionEvaluationPipeline')
    expect(src).toContain('runSpeakLivePostSessionEvaluationPipeline')
  })

  it('voice evaluation service exists for post-session Azure PA (positive control)', () => {
    const src = readSpeakLiveSourceFile('voiceEvaluationService.ts')
    expect(src).toContain('assessLearnerAudioForPostSession')
  })

  it('endConversation seeds evaluation via liveSessionEvaluationAppService (dynamic import)', () => {
    const src = readConversationAppService()
    expect(src).toMatch(/endConversation/)
    expect(src).toContain("import('../speak-live/liveSessionEvaluationAppService')")
    expect(src).toContain('seedPendingLiveEvaluation')
    expect(src).toContain('generateEndSummary')
    /** Static `from '…liveSessionEvaluationAppService'` was removed — live callers must not pull it at module load. */
    expect(src).not.toMatch(/from\s+['"][^'"]*liveSessionEvaluationAppService['"]/)
  })

  it('conversationAppService live path does not statically import voice evaluation', () => {
    const src = readConversationAppService()
    expect(src).not.toMatch(/from\s+['"][^'"]*voiceEvaluationService['"]/)
    expect(src).not.toMatch(/from\s+['"][^'"]*azurePronunciationAssessmentService['"]/)
  })

  it('forbidden fragment list stays non-empty (guard against accidental empty rules)', () => {
    expect(FORBIDDEN_IMPORT_PATH_FRAGMENTS.length).toBeGreaterThan(3)
  })
})
