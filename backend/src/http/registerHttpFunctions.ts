import { app, type HttpRequest, type InvocationContext } from '@azure/functions'
import { z } from 'zod'
import type { FeedbackMode } from '../models/contracts'
import { ApiError } from '../shared/errors'
import { readJson, requireUserId, withJson, withNdjsonStream } from '../shared/http'
import * as conversation from '../services/conversation/conversationAppService'
import { generateSpeechFromText } from '../services/audio/openAiSpeechService'
import { generateSpeakLiveAssistantSpeech } from '../services/speak-live/speakLiveTtsGateway'
import { getSpeechToTextService } from '../services/speech/speechToTextGateway'
import { evaluatePronunciationFromTranscript } from '../services/speech/pronunciationEvaluationService'
import { SpeakingCoachingEvaluateBodySchema } from '../services/speech/speakingCoachingContracts'
import { getOpenAiSpeakingCoachingService } from '../services/speech/openAiSpeakingCoachingService'
import { PronunciationAssessmentHttpBodySchema } from '../services/speech/pronunciationAssessmentContracts'
import { runPronunciationAssessment } from '../services/speech/pronunciationAssessmentGateway'
import { getAzureSpeechLocale } from '../services/speech/pronunciationAssessmentConfig'
import { maxSpeakLiveLearnerAudioBytes, speakLiveTurn } from '../services/speak-live/speakLiveTurnService'
import { generateTtsForClause } from '../services/speak-live/liveTtsChunkService'
import { generateDutchWordGlossEnglish } from '../services/speak-live/speakLiveWordGlossService'
import { generateSpeakLiveStuckHints } from '../services/speak-live/speakLiveStuckHintsService'
import { streamFastTurn, type LiveCompactState } from '../services/speak-live/liveFastTurnService'
import {
  handleGetLiveEvaluation,
  handleGetSavedTrainingItems,
  handleGetSpeakLiveLearnerAudio,
  handleGetSpeakLiveReferenceAudio,
  handlePostLiveEvaluationRun,
  handlePostSavedTrainingItem,
} from '../services/speak-live/liveSessionEvaluationHttp'
import {
  handleGetTrainingLoop,
  handleGetTrainingLoopHistory,
  handlePatchTrainingLoopStatus,
} from '../services/training-loops/trainingLoopHttp'
import {
  handleGetListeningClips,
  handleGetListeningRecommendations,
  handleGetListeningReport,
  handleGetListeningTrack,
  handleGetListeningTracks,
  handleGetListeningWeaknesses,
  handlePostListeningAttempt,
  handlePostListeningFinalize,
  handlePostListeningSession,
} from '../services/listening/listeningModeHttp'
import { issueAzureSpeechAuthorizationToken } from '../services/speech/azureSpeechAuthTokenService'
import {
  handleSpeakingAssessmentGet,
  handleSpeakingAssessmentPost,
  handleSpeakingReferenceAudioGet,
} from '../services/speaking-assessment/speakingAssessmentHandlers'
import { appendSpeakingProgressFromPronunciationResponse } from '../services/speaking-progress/speakingProgressAppend'
import { handleSpeakingProgressionGet } from '../services/speaking-progress/speakingProgressHandlers'
import { generateReadAloudPassage } from '../services/read-aloud/readAloudPassageGenerationService'
import { extractTextFromImage } from '../services/read-aloud/readAloudOcrService'
import { evaluateReadAloudPerformance } from '../services/read-aloud/readAloudEvaluationService'
import { getSqlPool } from '../services/sql/sqlPool'
import * as userRepo from '../repositories/userRepository'
import * as userLearningMemoryRepository from '../repositories/userLearningMemoryRepository'
import { parseUserLearningProfileDocument } from '../domain/learningMemory/userLearningProfileDocument'
import {
  buildPracticeRecommendations,
  buildReportPersonalizationRibbon,
  extractReadAloudWeakHintsForRibbon,
} from '../domain/learningMemory/learningMemoryRecommendationService'
import { resolveReadAloudPassagePersonalization } from '../domain/learningMemory/readAloudPersonalizationFromProfile'
import { fireAndForgetLearningIngestion, ingestReadAloudEvaluation } from '../services/learning-memory/learningMemoryPipeline'
import {
  handleGetQuickCaptureVoicePlayback,
  handleGetQuickCaptures,
  handleGetFromYourDayPack,
  handlePatchQuickCapture,
  handlePostFromYourDayComplete,
  handlePostFromYourDayGenerate,
  handlePostQuickCapture,
} from '../services/quick-capture/quickCaptureHttp'

function normalizeFeedbackMode(v: string): FeedbackMode {
  if (v === 'after_each') return 'turn'
  if (v === 'at_end') return 'end'
  if (v === 'turn' || v === 'end') return v
  throw new Error('Invalid feedbackMode')
}

const LanguageCoachStartBodySchema = z
  .object({
    conversationGoal: z
      .enum([
        'general',
        'fluency',
        'pronunciation',
        'grammar',
        'confidence',
        'storytelling',
        'follow_up_questions',
      ])
      .optional(),
    feedbackStyle: z.enum(['subtle_and_end', 'at_end_only', 'every_turn']).optional(),
    coachStyle: z.enum(['supportive', 'balanced', 'challenging']).optional(),
    personaStyle: z.enum(['local', 'coach', 'casual']).optional(),
    conversationRole: z.enum(['friend', 'colleague', 'dutch_local', 'date', 'coach']).optional(),
    coachGuideWhileSpeaking: z.boolean().optional(),
    /**
     * Optional English instruction seeded from the previous session's "Plan your next
     * session" deep-link. Length-capped here as a defensive bound; the producer
     * (`languageCoachNextPracticePlanner.ts`) already keeps it ≤220 chars, and
     * `normalizeLanguageCoachStart` caps to 320 on the backend.
     */
    pinnedFocusEnglish: z.string().trim().min(1).max(320).optional(),
  })
  .strict()

const StartBodySchema = z
  .object({
    scenarioId: z.string().min(1).max(200),
    mode: z.enum(['guided', 'free']).optional(),
    feedbackMode: z.enum(['turn', 'end', 'after_each', 'at_end']).transform(normalizeFeedbackMode),
    conversationSurface: z.enum(['text', 'speak_live']).optional(),
    /** Speak Live: optional CEFR band for internal coaching strategy (A1–C2). */
    cefrLevel: z.string().min(2).max(8).optional(),
    scenarioOverrides: z
      .object({
        subType: z.string().min(1).max(64).optional(),
        variation: z.string().min(1).max(64).optional(),
        destination: z.string().min(1).max(120).optional(),
        detailFocus: z.string().min(1).max(64).optional(),
      })
      .strict()
      .optional(),
    languageCoach: LanguageCoachStartBodySchema.optional(),
  })
  .superRefine((val, ctx) => {
    const surface = val.conversationSurface ?? 'text'
    if (surface === 'text' && !val.mode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'mode is required unless conversationSurface is speak_live',
        path: ['mode'],
      })
    }
  })

const UserInputMetaSchema = z
  .object({
    inputMode: z.enum(['text', 'speech']).optional(),
    originalTranscript: z.string().max(16_000).optional().nullable(),
    audioReference: z.string().max(512).optional().nullable(),
    learnerLevelCefr: z.enum(['A1', 'A2', 'B1', 'B2']).optional(),
  })
  .strict()

const SendMessageBodySchema = z.object({
  text: z.string().min(1).max(16_000),
  inputMeta: UserInputMetaSchema.optional(),
  learnerAudioBase64: z.string().min(8).max(36_000_000).optional(),
  learnerAudioMimeType: z.string().min(6).max(120).optional(),
})

const SaveWordBodySchema = z.object({
  selectedText: z.string().min(1).max(512),
  sourceThreadId: z.string().uuid().optional().nullable(),
  sourceMessageId: z.string().uuid().optional().nullable(),
  sourceScenarioId: z.string().uuid().optional().nullable(),
  meaning: z.string().max(512).optional().nullable(),
  sourceType: z.string().min(1).max(64).optional(),
})

const EnrichTurnBodySchema = z.object({
  userMessageId: z.string().uuid(),
  assistantMessageId: z.string().uuid(),
})

const GenerateAudioBodySchema = z.object({
  text: z.string().min(1).max(4096),
  language: z.string().max(32).optional(),
  voice: z.string().max(32).optional(),
  speed: z.number().min(0.25).max(4).optional(),
  messageId: z.string().max(200).optional(),
  threadId: z.string().max(200).optional(),
  /** When `speak_live_assistant`, uses the same Speak Live TTS path as turn replies (Azure/OpenAI + prosody/speed). */
  purpose: z.string().max(120).optional(),
})

const TranscribeSpeechBodySchema = z.object({
  audioBase64: z.string().min(1).max(6_000_000),
  mimeType: z.string().min(6).max(120),
  language: z.string().max(8).optional(),
  evaluatePronunciation: z.boolean().optional(),
  cefrLevel: z.enum(['A1', 'A2', 'B1']).optional(),
  scenarioHint: z.string().max(500).optional(),
  /** Same-language vocabulary hint for the STT model (e.g. scenario line the user is repeating). */
  transcriptionPrompt: z.string().max(2000).optional(),
  threadId: z.string().max(200).optional(),
  scenarioId: z.string().max(200).optional(),
  purpose: z.string().max(120).optional(),
})

const SpeakLiveTurnBodySchema = z
  .object({
    /** When provided (e.g. browser Azure STT), server skips audio STT. */
    transcript: z.string().max(16_000).optional(),
    audioBase64: z.string().max(6_000_000).optional(),
    mimeType: z.string().max(120).optional(),
    threadId: z.string().uuid(),
    scenarioId: z.string().min(1).max(200).optional(),
    level: z.enum(['A1', 'A2', 'B1']).optional(),
    language: z.string().max(8).optional(),
  })
  .superRefine((b, ctx) => {
    const tx = b.transcript?.trim()
    const hasAudio = Boolean(b.audioBase64 && b.audioBase64.length > 0 && b.mimeType && b.mimeType.length >= 6)
    if (!tx && !hasAudio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either transcript (non-empty) or audioBase64 with mimeType',
        path: ['transcript'],
      })
    }
  })

function maxTranscribeBytes(): number {
  const mbRaw = process.env.AUDIO_UPLOAD_MAX_MB?.trim()
  const mb = mbRaw ? Number(mbRaw) : 12
  const safe = Number.isFinite(mb) && mb > 0 ? Math.min(mb, 25) : 12
  return Math.floor(safe * 1024 * 1024)
}

const EvaluateTranscriptBodySchema = z.object({
  text: z.string().min(1).max(16_000),
  cefrLevel: z.enum(['A2', 'B1']).optional(),
  scenarioHint: z.string().max(500).optional(),
})

const SpeakingCoachingBodySchema = SpeakingCoachingEvaluateBodySchema

function parseBody<T>(schema: z.ZodType<T>, raw: unknown): T {
  const r = schema.safeParse(raw)
  if (!r.success) {
    const fields: Record<string, string> = {}
    for (const i of r.error.issues) {
      fields[i.path.join('.')] = i.message
    }
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request body', fields)
  }
  return r.data
}

function threadIdFrom(req: HttpRequest): string {
  const id = req.params.threadId
  if (!id?.trim()) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing threadId')
  return id.trim()
}

app.http('health', {
  methods: ['GET', 'HEAD', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'health',
  handler: withJson(async () => conversation.healthCheck()),
})

function speakLiveTtsLanguageFromRequest(lang?: string): string {
  const raw = (lang ?? 'nl').trim().toLowerCase()
  if (raw.startsWith('nl')) return 'nl'
  if (raw.length >= 2) return raw.slice(0, 2)
  return 'nl'
}

async function handleGenerateSpeech(req: HttpRequest, ctx: InvocationContext) {
  void ctx
  requireUserId(req)
  const raw = await readJson(req)
  const body = parseBody(GenerateAudioBodySchema, raw ?? {})
  const purpose = (body.purpose ?? '').trim()
  if (purpose === 'speak_live_assistant') {
    return generateSpeakLiveAssistantSpeech({
      text: body.text,
      threadId: body.threadId,
      messageId: body.messageId,
      language: speakLiveTtsLanguageFromRequest(body.language),
    })
  }
  return generateSpeechFromText({
    text: body.text,
    voice: body.voice,
    language: body.language,
    speed: body.speed,
    messageId: body.messageId,
    threadId: body.threadId,
    ...(purpose ? { purpose } : {}),
  })
}

app.http('generateSpeechAudio', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'audio/generate',
  handler: withJson(handleGenerateSpeech),
})

app.http('generateSpeechAudioTts', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'audio/tts',
  handler: withJson(handleGenerateSpeech),
})

app.http('speakLiveTurn', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'speak-live/turn',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    const externalUserId = requireUserId(req)
    const raw = await readJson(req)
    const body = parseBody(SpeakLiveTurnBodySchema, raw ?? {})
    const transcript = body.transcript?.trim()
    let buf = Buffer.alloc(0)
    let mimeType = body.mimeType ?? 'audio/webm'
    if (body.audioBase64) {
      try {
        buf = Buffer.from(body.audioBase64, 'base64')
      } catch {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid base64 audio', { audioBase64: 'Invalid' })
      }
      mimeType = body.mimeType ?? 'audio/webm'
    }
    return speakLiveTurn({
      externalUserId,
      threadId: body.threadId,
      transcript: transcript && transcript.length > 0 ? transcript : undefined,
      audio: buf,
      mimeType,
      language: body.language,
      scenarioId: body.scenarioId,
      level: body.level,
    })
  }),
})

app.http('speakLiveAzureSpeechToken', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'speak-live/azure-speech-token',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    requireUserId(req)
    return issueAzureSpeechAuthorizationToken()
  }),
})

const FastTurnBodySchema = z.object({
  threadId: z.string().min(1).max(200),
  transcript: z.string().min(1).max(2000),
  compactState: z.object({
    scenarioSlug: z.string().min(1).max(200),
    scenarioTitle: z.string().max(400),
    personaName: z.string().max(200),
    personaRole: z.string().max(400),
    level: z.string().max(8),
    phase: z.string().max(40),
    goalIndex: z.number().int().min(0).max(20),
    goalsCompleted: z.array(z.number().int().min(0).max(20)),
    goalTitles: z.array(z.string().max(200)),
    recentTurns: z.array(
      z.object({ role: z.enum(['U', 'A']), text: z.string().max(400) })
    ).max(8),
    slotState: z.record(z.unknown()).nullable().optional(),
    groundingBlock: z.string().max(1000).default(''),
    rollingSummary: z.string().max(6000).nullable().optional(),
  }),
})

app.http('speakLiveFastTurn', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'speak-live/fast-turn',
  handler: withNdjsonStream(async function* (req: HttpRequest) {
    const externalUserId = requireUserId(req)
    const raw = await readJson(req)
    const body = parseBody(FastTurnBodySchema, raw ?? {})
    yield* streamFastTurn({
      externalUserId,
      threadId: body.threadId,
      transcript: body.transcript,
      compactState: body.compactState as LiveCompactState,
    })
  }),
})

const TtsChunkBodySchema = z.object({
  text: z.string().min(1).max(1200),
  threadId: z.string().max(200).optional(),
  chunkIndex: z.number().int().min(0).max(20),
  language: z.string().max(12).optional(),
})

const WordGlossBodySchema = z.object({
  word: z.string().min(1).max(80),
  phraseContext: z.string().max(500).optional(),
})

app.http('speakLiveTtsChunk', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'speak-live/tts-chunk',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    requireUserId(req)
    const raw = await readJson(req)
    const body = parseBody(TtsChunkBodySchema, raw ?? {})
    return generateTtsForClause({
      text: body.text,
      threadId: body.threadId,
      chunkIndex: body.chunkIndex,
      language: speakLiveTtsLanguageFromRequest(body.language),
    })
  }),
})

app.http('speakLiveWordGloss', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'speak-live/word-gloss',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    requireUserId(req)
    const raw = await readJson(req)
    const body = parseBody(WordGlossBodySchema, raw ?? {})
    return generateDutchWordGlossEnglish({
      word: body.word,
      phraseContext: body.phraseContext,
    })
  }),
})

const SpeakLiveStuckHintsBodySchema = z.object({
  threadId: z.string().uuid(),
  level: z.enum(['A1', 'A2', 'B1']).optional(),
})

app.http('speakLiveStuckHints', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'speak-live/stuck-hints',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    const externalUserId = requireUserId(req)
    const raw = await readJson(req)
    const body = parseBody(SpeakLiveStuckHintsBodySchema, raw ?? {})
    return generateSpeakLiveStuckHints({
      externalUserId,
      threadId: body.threadId,
      level: body.level,
    })
  }),
})

app.http('getLiveSessionEvaluation', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'speak-live/session/{threadId}/evaluation',
  handler: withJson(handleGetLiveEvaluation),
})

app.http('getTrainingLoopHistory', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'speak-live/training-loops/history',
  handler: withJson(handleGetTrainingLoopHistory),
})

app.http('getTrainingLoop', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'speak-live/training-loops/{loopId}',
  handler: withJson(handleGetTrainingLoop),
})

app.http('patchTrainingLoopStatus', {
  methods: ['PATCH', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'speak-live/training-loops/{loopId}/status',
  handler: withJson(handlePatchTrainingLoopStatus),
})

app.http('getListeningTracks', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'talk/listening/tracks',
  handler: withJson(handleGetListeningTracks),
})

app.http('getListeningTrack', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'talk/listening/tracks/{trackId}',
  handler: withJson(handleGetListeningTrack),
})

app.http('getListeningClips', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'talk/listening/clips',
  handler: withJson(handleGetListeningClips),
})

app.http('postListeningSession', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'talk/listening/sessions',
  handler: withJson(handlePostListeningSession),
})

app.http('postListeningAttempt', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'talk/listening/sessions/{sessionId}/attempts',
  handler: withJson(handlePostListeningAttempt),
})

app.http('postListeningFinalize', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'talk/listening/sessions/{sessionId}/finalize',
  handler: withJson(handlePostListeningFinalize),
})

app.http('getListeningReport', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'talk/listening/sessions/{sessionId}/report',
  handler: withJson(handleGetListeningReport),
})

app.http('getListeningRecommendations', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'talk/listening/recommendations',
  handler: withJson(handleGetListeningRecommendations),
})

app.http('getListeningWeaknesses', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'talk/listening/weaknesses',
  handler: withJson(handleGetListeningWeaknesses),
})

app.http('postLiveSessionEvaluationRun', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'speak-live/session/{threadId}/evaluation/run',
  handler: withJson(handlePostLiveEvaluationRun),
})

app.http('savedTrainingItems', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'training-items/saved',
  handler: withJson(async (req, ctx) => {
    if (req.method === 'GET') return handleGetSavedTrainingItems(req, ctx)
    return handlePostSavedTrainingItem(req, ctx)
  }),
})

app.http('speakLiveLearnerAudio', {
  methods: ['GET', 'OPTIONS', 'HEAD'],
  authLevel: 'anonymous',
  route: 'speak-live/session/{threadId}/learner-audio/{messageId}',
  handler: handleGetSpeakLiveLearnerAudio,
})

app.http('speakLiveReferenceEvaluationAudio', {
  methods: ['GET', 'OPTIONS', 'HEAD'],
  authLevel: 'anonymous',
  route: 'speak-live/session/{threadId}/reference-audio/{messageId}',
  handler: handleGetSpeakLiveReferenceAudio,
})

app.http('transcribeSpeech', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'speech/transcribe',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    requireUserId(req)
    const raw = await readJson(req)
    const body = parseBody(TranscribeSpeechBodySchema, raw ?? {})
    let buf: Buffer
    try {
      buf = Buffer.from(body.audioBase64, 'base64')
    } catch {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid base64 audio', { audioBase64: 'Invalid' })
    }
    if (buf.length < 32) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Audio clip too short or empty')
    }
    const cap = maxTranscribeBytes()
    if (buf.length > cap) {
      throw new ApiError(400, 'VALIDATION_ERROR', `Audio exceeds maximum size (${Math.round(cap / (1024 * 1024))} MB)`)
    }
    const stt = getSpeechToTextService()
    const tr = await stt.transcribeAsync(buf, body.mimeType, {
      language: body.language,
      transcriptionPrompt: body.transcriptionPrompt,
      purpose: body.purpose,
      threadId: body.threadId,
      scenarioId: body.scenarioId,
    })
    const text = tr.text
    return {
      text,
      provider: tr.provider,
      durationSeconds: tr.durationSeconds,
      detectedLanguage: tr.detectedLanguage,
    }
  }),
})

app.http('pronunciationAssessment', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'speech/pronunciation-assessment',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    const pronunciationUserId = requireUserId(req)
    const raw = await readJson(req)
    const body = parseBody(PronunciationAssessmentHttpBodySchema, raw ?? {})
    let buf: Buffer
    try {
      buf = Buffer.from(body.audioBase64, 'base64')
    } catch {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid base64 audio', { audioBase64: 'Invalid' })
    }
    if (buf.length < 32) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Audio clip too short or empty')
    }
    const cap = maxTranscribeBytes()
    if (buf.length > cap) {
      throw new ApiError(400, 'VALIDATION_ERROR', `Audio exceeds maximum size (${Math.round(cap / (1024 * 1024))} MB)`)
    }
    if (body.assessmentMode === 'reference' && !body.expectedText?.trim()) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'expectedText is required when assessmentMode is reference', {
        expectedText: 'Required',
      })
    }
    if (body.assessmentMode === 'open_response' && !body.transcript?.trim()) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'transcript is required when assessmentMode is open_response', {
        transcript: 'Required',
      })
    }
    const locale = body.locale?.trim() || getAzureSpeechLocale()
    const res = await runPronunciationAssessment({
      audio: buf,
      mimeType: body.mimeType,
      transcript: body.transcript,
      expectedText: body.expectedText,
      locale,
      scenarioHint: body.scenarioHint,
      assessmentMode: body.assessmentMode,
    })
    void appendSpeakingProgressFromPronunciationResponse({ userId: pronunciationUserId, body, response: res }).catch(
      () => undefined
    )
    return res
  }),
})

app.http('evaluateSpokenTranscript', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'speech/evaluate-transcript',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    requireUserId(req)
    const raw = await readJson(req)
    const body = parseBody(EvaluateTranscriptBodySchema, raw ?? {})
    const pronunciation = await evaluatePronunciationFromTranscript({
      transcript: body.text,
      cefrLevel: body.cefrLevel ?? 'A2',
      scenarioHint: body.scenarioHint,
    })
    return { pronunciation }
  }),
})

app.http('speakingCoachingEvaluate', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'speech/speaking-coaching',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    requireUserId(req)
    const raw = await readJson(req)
    const body = parseBody(SpeakingCoachingBodySchema, raw ?? {}) as z.output<typeof SpeakingCoachingBodySchema>
    const svc = getOpenAiSpeakingCoachingService()
    const coaching = await svc.evaluateTranscriptAsync({
      transcript: body.transcript,
      scenarioId: body.scenarioId,
      scenarioTitle: body.scenarioTitle,
      scenarioDescription: body.scenarioDescription ?? undefined,
      scenarioGoals: body.scenarioGoals ?? undefined,
      learnerLevelCefr: body.learnerLevelCefr,
      feedbackMode: body.feedbackMode,
      conversationTurnIndex: body.conversationTurnIndex,
      lastAssistantTurn: body.lastAssistantTurn,
      threadSummary: body.threadSummary,
      expectedIntent: body.expectedIntent,
    })
    return { coaching }
  }),
})

app.http('startConversation', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'conversations/start',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    const externalUserId = requireUserId(req)
    const raw = await readJson(req)
    const body = parseBody(StartBodySchema, raw ?? {})
    return conversation.startConversation({
      externalUserId,
      scenarioId: body.scenarioId,
      mode: body.mode,
      feedbackMode: body.feedbackMode as FeedbackMode,
      conversationSurface: body.conversationSurface,
      cefrLevel: body.cefrLevel,
      scenarioOverrides: body.scenarioOverrides,
      languageCoach: body.languageCoach,
    })
  }),
})

app.http('getConversation', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'conversations/{threadId}',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    const externalUserId = requireUserId(req)
    const threadId = threadIdFrom(req)
    return conversation.getConversation({ externalUserId, threadId })
  }),
})

app.http('sendConversationMessage', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'conversations/{threadId}/messages',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    const externalUserId = requireUserId(req)
    const threadId = threadIdFrom(req)
    const raw = await readJson(req)
    const body = parseBody(SendMessageBodySchema, raw ?? {})
    const result = await conversation.sendConversationMessage({
      externalUserId,
      threadId,
      text: body.text,
      inputMeta: body.inputMeta,
    })
    return {
      userMessage: result.userMessage,
      assistantMessage: result.assistantMessage,
      feedback: result.feedback,
      saveWordCandidates: result.envelope.saveWordCandidates,
      scenarioProgress: result.envelope.scenarioProgress,
      shouldConversationEnd: result.envelope.shouldConversationEnd,
      updatedSummary: result.envelope.updatedSummary,
      thread: result.thread,
      enrichmentPending: result.enrichmentPending,
      perf: result.perf,
      ...(result.liveTurnLatencyTrace ? { liveTurnLatencyTrace: result.liveTurnLatencyTrace } : {}),
      ...(result.liveTurnDiagnostics ? { liveTurnDiagnostics: result.liveTurnDiagnostics } : {}),
      ...(result.liveCoachTurnFeedback ? { liveCoachTurnFeedback: result.liveCoachTurnFeedback } : {}),
    }
  }),
})

app.http('sendConversationMessageStream', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'conversations/{threadId}/messages/stream',
  handler: withNdjsonStream(async function* (req, ctx) {
    const externalUserId = requireUserId(req)
    const threadId = threadIdFrom(req)
    const raw = await readJson(req)
    const body = parseBody(SendMessageBodySchema, raw ?? {})
    let learnerAudio: { buffer: Buffer; mimeType: string } | null = null
    if (body.learnerAudioBase64?.trim()) {
      let buf: Buffer
      try {
        buf = Buffer.from(body.learnerAudioBase64, 'base64')
      } catch {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid base64 learner audio', { learnerAudioBase64: 'Invalid' })
      }
      if (buf.length > maxSpeakLiveLearnerAudioBytes()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Learner audio exceeds maximum size')
      }
      learnerAudio = { buffer: buf, mimeType: body.learnerAudioMimeType?.trim() || 'audio/webm' }
    }
    for await (const ev of conversation.streamSendConversationMessageNdjson({
      externalUserId,
      threadId,
      text: body.text,
      inputMeta: body.inputMeta,
      learnerAudio,
      ctx,
    })) {
      yield ev as Record<string, unknown>
    }
  }),
})

app.http('enrichConversationTurn', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'conversations/{threadId}/messages/enrich',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    const externalUserId = requireUserId(req)
    const threadId = threadIdFrom(req)
    const raw = await readJson(req)
    const body = parseBody(EnrichTurnBodySchema, raw ?? {})
    return conversation.enrichConversationTurn({
      externalUserId,
      threadId,
      userMessageId: body.userMessageId,
      assistantMessageId: body.assistantMessageId,
    })
  }),
})

app.http('endConversation', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'conversations/{threadId}/end',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    const externalUserId = requireUserId(req)
    const threadId = threadIdFrom(req)
    return conversation.endConversation({ externalUserId, threadId })
  }),
})

app.http('talkContinue', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'talk/continue',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    const externalUserId = requireUserId(req)
    return conversation.getTalkContinue({ externalUserId })
  }),
})

app.http('talkSessionHistory', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'talk/session-history',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    const externalUserId = requireUserId(req)
    return conversation.getTalkSessionHistory({ externalUserId })
  }),
})

app.http('talkSkillsProfile', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'talk/skills-profile',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    const externalUserId = requireUserId(req)
    const devToolsHeader = req.headers.get('x-fluentcopilot-dev-tools') === '1'
    const allowSkillDebug = process.env.NODE_ENV !== 'production' && devToolsHeader
    return conversation.getTalkSkillProfile({ externalUserId, devToolsSkillDebug: allowSkillDebug })
  }),
})

app.http('pauseConversation', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'conversations/{threadId}/pause',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    const externalUserId = requireUserId(req)
    const threadId = threadIdFrom(req)
    return conversation.pauseConversationThread({ externalUserId, threadId })
  }),
})

app.http('resumeConversation', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'conversations/{threadId}/resume',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    const externalUserId = requireUserId(req)
    const threadId = threadIdFrom(req)
    return conversation.resumeConversationThread({ externalUserId, threadId })
  }),
})

app.http('saveWord', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'saved-words',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    const externalUserId = requireUserId(req)
    const raw = await readJson(req)
    const body = parseBody(SaveWordBodySchema, raw ?? {})
    return conversation.saveWord({
      externalUserId,
      text: body.selectedText,
      meaning: body.meaning,
      sourceThreadId: body.sourceThreadId,
      sourceMessageId: body.sourceMessageId,
      sourceScenarioId: body.sourceScenarioId,
      sourceType: body.sourceType ?? 'chat_manual',
    })
  }),
})

app.http('speakingAssess', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'speaking/assess',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    const externalUserId = requireUserId(req)
    return handleSpeakingAssessmentPost(req, externalUserId)
  }),
})

app.http('speakingReferenceAudio', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'speaking/reference-audio',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    requireUserId(req)
    return handleSpeakingReferenceAudioGet(req)
  }),
})

app.http('speakingAssessmentById', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'speaking/assessment/{assessmentId}',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    const externalUserId = requireUserId(req)
    return handleSpeakingAssessmentGet(req, externalUserId)
  }),
})

app.http('speakingProgression', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'speaking/progression',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    const externalUserId = requireUserId(req)
    return handleSpeakingProgressionGet(externalUserId)
  }),
})

const ReadAloudGenreSchema = z.enum([
  'everyday_conversation',
  'story',
  'news_style',
  'travel',
  'work',
  'practical_instructions',
  'social_chat',
  'description',
  'opinion',
  'custom_topic',
])

const ReadAloudPersonalizationProfileSchema = z.enum([
  'pronunciation_focus',
  'weak_sounds_focus',
  'weak_vocabulary_focus',
  'grammar_focus',
  'fluency_focus',
  'mixed_review',
  'everyday_dutch',
  'scenario_linked',
  'storytelling_focus',
  'confidence_build',
])

const ReadAloudGenerateBodySchema = z.object({
  level: z.enum(['A1', 'A2', 'B1', 'B2']),
  genre: ReadAloudGenreSchema,
  topic: z.string().max(400).optional().nullable(),
  length: z.enum(['short', 'medium', 'long']),
  personalizationProfile: ReadAloudPersonalizationProfileSchema.optional(),
  /** When false, skips cross-session personalization hints. Default: personalized when profile exists. */
  usePersonalization: z.boolean().optional(),
})

const ReadAloudOcrBodySchema = z.object({
  imageBase64: z.string().min(8).max(8_000_000),
  mimeType: z.string().min(6).max(120),
})

const ReadAloudEvaluateBodySchema = z.object({
  targetText: z.string().min(12).max(12_000),
  audioBase64: z.string().min(8).max(6_000_000),
  mimeType: z.string().min(6).max(120),
  cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2']),
  /** Optional Read Aloud session genre id — used only for smart next-step actions. */
  genre: z.string().max(64).optional().nullable(),
})

app.http('readAloudGeneratePassage', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'read-aloud/generate-passage',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    const externalUserId = requireUserId(req)
    const raw = await readJson(req)
    const body = parseBody(ReadAloudGenerateBodySchema, raw ?? {})
    let personalizationEnglish: string | null = null
    let personalizationMeta: { appliedProfile: string; chips: string[] } | null = null
    if (body.usePersonalization !== false) {
      const pool = await getSqlPool()
      if (pool) {
        const uid = await userRepo.ensureUser(pool, externalUserId)
        const pj = await userLearningMemoryRepository.getUserLearningProfileJson(pool, uid)
        const doc = parseUserLearningProfileDocument(pj, uid)
        if (doc.totalSessionsObserved >= 2) {
          void buildPracticeRecommendations(doc)
          const resolved = resolveReadAloudPassagePersonalization({
            doc,
            level: body.level,
            genre: body.genre,
            topic: body.topic ?? null,
            personalizationProfileOverride: body.personalizationProfile ?? null,
          })
          personalizationEnglish = resolved.personalizationEnglish
          personalizationMeta = {
            appliedProfile: resolved.appliedProfileId,
            chips: resolved.uiChips,
          }
        }
      }
    }
    const passage = await generateReadAloudPassage({
      level: body.level,
      genre: body.genre,
      topic: body.topic ?? null,
      length: body.length,
      personalizationEnglish,
    })
    return personalizationMeta ? { ...passage, personalization: personalizationMeta } : passage
  }),
})

app.http('readAloudOcr', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'read-aloud/ocr',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    requireUserId(req)
    const raw = await readJson(req)
    const body = parseBody(ReadAloudOcrBodySchema, raw ?? {})
    let buf: Buffer
    try {
      buf = Buffer.from(body.imageBase64, 'base64')
    } catch {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid base64 image', { imageBase64: 'Invalid' })
    }
    if (buf.length < 32) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Image data too small')
    }
    const cap = Math.min(12 * 1024 * 1024, maxTranscribeBytes())
    if (buf.length > cap) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Image exceeds maximum size')
    }
    return extractTextFromImage({ imageBytes: buf, mimeType: body.mimeType })
  }),
})

app.http('readAloudEvaluate', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'read-aloud/evaluate',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    void ctx
    const externalUserId = requireUserId(req)
    const raw = await readJson(req)
    const body = parseBody(ReadAloudEvaluateBodySchema, raw ?? {})
    let buf: Buffer
    try {
      buf = Buffer.from(body.audioBase64, 'base64')
    } catch {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid base64 audio', { audioBase64: 'Invalid' })
    }
    const cap = maxTranscribeBytes()
    if (buf.length > cap) {
      throw new ApiError(400, 'VALIDATION_ERROR', `Audio exceeds maximum size (${Math.round(cap / (1024 * 1024))} MB)`)
    }
    let result = await evaluateReadAloudPerformance({
      targetText: body.targetText,
      audio: buf,
      mimeType: body.mimeType,
      cefrLevel: body.cefrLevel,
      genre: body.genre ?? null,
    })
    const pool = await getSqlPool()
    if (pool) {
      const uid = await userRepo.ensureUser(pool, externalUserId)
      try {
        const pj = await userLearningMemoryRepository.getUserLearningProfileJson(pool, uid)
        const doc = parseUserLearningProfileDocument(pj, uid)
        void buildPracticeRecommendations(doc)
        const learningMemoryRibbon = buildReportPersonalizationRibbon({
          doc,
          sessionWeakHints: extractReadAloudWeakHintsForRibbon(result),
          practiceLevel: body.cefrLevel ?? null,
        })
        result = { ...result, learningMemoryRibbon }
      } catch {
        /* ribbon is optional */
      }
      fireAndForgetLearningIngestion(() => ingestReadAloudEvaluation({ pool, userId: uid, result }), 'read_aloud_eval')
    }
    return result
  }),
})

// Single route: Azure Functions v4 does not reliably bind two functions to the same `route`
// with different methods — the second registration can shadow the first (POST → 404).
app.http('quickCapturesCollection', {
  methods: ['GET', 'POST', 'OPTIONS', 'HEAD'],
  authLevel: 'anonymous',
  route: 'quick-captures',
  handler: withJson(async (req: HttpRequest, ctx: InvocationContext) => {
    const m = (req.method ?? 'GET').toUpperCase()
    if (m === 'POST') return handlePostQuickCapture(req, ctx)
    return handleGetQuickCaptures(req, ctx)
  }),
})

app.http('quickCaptureVoicePlayback', {
  methods: ['GET', 'OPTIONS', 'HEAD'],
  authLevel: 'anonymous',
  route: 'quick-captures/{captureId}/voice-playback',
  handler: withJson(handleGetQuickCaptureVoicePlayback),
})

app.http('patchQuickCapture', {
  methods: ['PATCH', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'quick-captures/{captureId}',
  handler: withJson(handlePatchQuickCapture),
})

app.http('postFromYourDayGenerate', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'quick-captures/from-your-day/generate',
  handler: withJson(handlePostFromYourDayGenerate),
})

app.http('getFromYourDayPack', {
  methods: ['GET', 'OPTIONS', 'HEAD'],
  authLevel: 'anonymous',
  route: 'quick-captures/from-your-day/{packId}',
  handler: withJson(handleGetFromYourDayPack),
})

app.http('postFromYourDayComplete', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'quick-captures/from-your-day/{packId}/complete',
  handler: withJson(handlePostFromYourDayComplete),
})
