/**
 * Architectural boundary: **live speech** modules vs **post-session deep evaluation**.
 *
 * Live paths must stay fast (STT, reply LLM, TTS). Heavy work — Azure pronunciation assessment,
 * evaluation orchestrator, recap generation for *evaluation JSON*, training-item builders — belongs
 * only under `postSessionEvaluationService` / `liveSessionEvaluation*` / `voiceEvaluationService`, invoked
 * after the session ends.
 *
 * @see docs/live-evaluation-boundaries.md
 */

import fs from 'node:fs'
import path from 'node:path'

/**
 * TypeScript source files (relative to `speak-live/`) that must not statically import post-session
 * evaluation, pronunciation scoring, or recap builders intended for the voice report pipeline.
 */
export const LIVE_SPEECH_BOUNDARY_RELATIVE_FILES = [
  'liveSpeechTurnService.ts',
  'speakLiveTurnService.ts',
  'liveConversationService.ts',
  'speechRecognitionService.ts',
] as const

/**
 * If an ES `from '…'` / `from "…"` path contains any of these fragments, the dependency is treated as
 * post-session / scoring / recap-for-evaluation and is forbidden on {@link LIVE_SPEECH_BOUNDARY_RELATIVE_FILES}.
 */
export const FORBIDDEN_IMPORT_PATH_FRAGMENTS = [
  'voiceEvaluationService',
  'postSessionEvaluationService',
  'liveSessionEvaluationOrchestrator',
  'speakLivePostSessionEvaluationPipeline',
  'speakLivePostSessionSpeechAssessment',
  'speakLiveNormalizedConversation',
  'speakLiveStructuredTranscriptEvaluation',
  'speakLiveAzureSpeechEvaluationArtifactService',
  'liveSessionEvaluationLlm',
  'liveSessionEvaluationAppService',
  'liveSessionEvaluationHttp',
  'liveTurnDeepEvaluationMapper',
  'pronunciationAssessment',
  'speaking-assessment',
  'speakingAssessment',
  'savedTrainingItemRepository',
] as const

const importPathRegex = /\bfrom\s+['"]([^'"]+)['"]/g

/** Resolve `backend/src/services/speak-live` from repo or `backend` cwd (Vitest / CI). */
export function resolveSpeakLiveSourcesDir(): string {
  const candidates = [
    path.join(process.cwd(), 'backend', 'src', 'services', 'speak-live'),
    path.join(process.cwd(), 'src', 'services', 'speak-live'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'liveSpeechTurnService.ts'))) return c
  }
  throw new Error(`Could not locate speak-live sources (tried: ${candidates.join(', ')}) cwd=${process.cwd()}`)
}

export function readSpeakLiveSourceFile(relativeFile: string): string {
  return fs.readFileSync(path.join(resolveSpeakLiveSourcesDir(), relativeFile), 'utf8')
}

export function listForbiddenImportViolations(source: string, fileLabel: string): string[] {
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = importPathRegex.exec(source))) {
    const importPath = m[1]
    for (const frag of FORBIDDEN_IMPORT_PATH_FRAGMENTS) {
      if (importPath.includes(frag)) {
        out.push(`${fileLabel}: forbidden import path fragment "${frag}" in "${importPath}"`)
      }
    }
  }
  return out
}

export function assertLiveSpeechBoundarySources(): void {
  const all: string[] = []
  for (const rel of LIVE_SPEECH_BOUNDARY_RELATIVE_FILES) {
    const src = readSpeakLiveSourceFile(rel)
    all.push(...listForbiddenImportViolations(src, rel))
  }
  if (all.length) {
    throw new Error(`Live speech import boundary violated:\n${all.join('\n')}`)
  }
}
