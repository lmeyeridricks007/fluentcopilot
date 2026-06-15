import * as sdk from 'microsoft-cognitiveservices-speech-sdk'
import { execFile } from 'child_process'
import { existsSync } from 'fs'
import ffmpegStatic from 'ffmpeg-static'
import { createRequire } from 'module'
import { chmod, copyFile, writeFile, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { randomUUID } from 'crypto'
import type {
  NormalizedPronunciationAssessment,
  NormalizedWordAssessment,
  PronunciationAssessmentApiResponse,
  PronunciationAssessmentAssessInput,
  PronunciationAssessmentMode,
} from './pronunciationAssessmentContracts'
import type { IPronunciationAssessmentService } from './pronunciationAssessmentContracts'
import {
  getAzureSpeechKey,
  getAzureSpeechRegion,
  getAzureSpeechLocale,
  isAzurePronunciationConfigured,
} from './pronunciationAssessmentConfig'
// azureStreamFormatForMime no longer needed — we convert to WAV PCM via ffmpeg

const AZURE_PA_DEFAULT_RECOGNIZE_TIMEOUT_MS = 15_000
let ffmpegExecutablePath: string | null = null
const requireFromHere = createRequire(__filename)

function resolveBundledFfmpeg(): string | null {
  if (process.platform === 'linux' && process.arch === 'x64') {
    try {
      const pkg = requireFromHere.resolve('@ffmpeg-installer/linux-x64/package.json')
      const linuxBinary = join(dirname(pkg), 'ffmpeg')
      if (existsSync(linuxBinary)) return linuxBinary
    } catch {
      /* Optional deploy artifact — do not fall through to ffmpeg-static on Linux. */
    }
    console.warn(
      '[PA] Linux ffmpeg missing — install @ffmpeg-installer/linux-x64 before deploy (see scripts/deploy-backend.sh).',
    )
    return null
  }
  return ffmpegStatic || null
}

function azurePaRecognizeTimeoutMs(): number {
  const raw = process.env.AZURE_PA_RECOGNIZE_TIMEOUT_MS
  if (!raw) return AZURE_PA_DEFAULT_RECOGNIZE_TIMEOUT_MS
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return AZURE_PA_DEFAULT_RECOGNIZE_TIMEOUT_MS
  return Math.min(120_000, parsed)
}

/**
 * Convert any audio buffer to 16kHz 16-bit mono PCM WAV using ffmpeg.
 * Azure Speech SDK's push-stream has bugs with WebM/Opus on some platforms,
 * so we normalize everything to WAV PCM before feeding to the recognizer.
 */
async function ensureWavPcm(audio: Buffer, mimeType: string): Promise<Buffer> {
  const isAlreadyWav = mimeType.includes('wav') || mimeType.includes('pcm') || mimeType.includes('l16')
  if (isAlreadyWav) return audio

  let ffmpegBinary = 'ffmpeg'
  const bundledFfmpeg = resolveBundledFfmpeg()
  if (bundledFfmpeg) {
    if (!ffmpegExecutablePath) {
      const target = join(tmpdir(), 'fluentcopilot-ffmpeg')
      await copyFile(bundledFfmpeg, target)
      await chmod(target, 0o755)
      ffmpegExecutablePath = target
    }
    ffmpegBinary = ffmpegExecutablePath
  }

  const id = randomUUID().slice(0, 8)
  const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mpeg') ? 'mp3' : 'bin'
  const inPath = join(tmpdir(), `pa-in-${id}.${ext}`)
  const outPath = join(tmpdir(), `pa-out-${id}.wav`)

  try {
    await writeFile(inPath, audio)
    await new Promise<void>((resolve, reject) => {
      execFile(
        ffmpegBinary,
        ['-y', '-i', inPath, '-ar', '16000', '-ac', '1', '-sample_fmt', 's16', '-f', 'wav', outPath],
        /** Read-aloud / long clips: multi-minute WebM decode can exceed the old 10s cap. */
        { timeout: 120_000 },
        (err, _stdout, stderr) => {
          if (err) {
            console.error('[PA] ffmpeg conversion failed:', stderr?.slice(0, 500))
            reject(err)
          } else {
            resolve()
          }
        }
      )
    })
    const wav = await readFile(outPath)
    return wav
  } finally {
    unlink(inPath).catch(() => {})
    unlink(outPath).catch(() => {})
  }
}

/** Internal caveat for open-response scoring; omit from learner-facing tip lists. */
export const LEARNER_JUNK_PRONUNCIATION_CAVEAT =
  'Reference text is the transcript (what you said). Scores reflect how clearly you pronounced that wording, not match to a separate gold phrase.'

function resolveReferenceText(input: PronunciationAssessmentAssessInput): {
  text: string
  alignment: 'target_phrase' | 'spoken_text_proxy'
  caveat: string | null
} {
  if (input.assessmentMode === 'reference') {
    const t = input.expectedText?.trim()
    if (!t) {
      throw new Error('reference assessmentMode requires expectedText')
    }
    return { text: t, alignment: 'target_phrase', caveat: null }
  }
  const tr = input.transcript?.trim()
  if (!tr) {
    throw new Error('open_response assessmentMode requires transcript (Whisper text) as reference proxy')
  }
  return {
    text: tr,
    alignment: 'spoken_text_proxy',
    caveat: LEARNER_JUNK_PRONUNCIATION_CAVEAT,
  }
}

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

/**
 * Prosody / intonation is often missing on `PronunciationAssessmentResult.prosodyScore` but present
 * inside `detailResult.PronunciationAssessment` (JSON shape varies by SDK version).
 */
function extractProsodyScore(
  pa: sdk.PronunciationAssessmentResult,
  detail: { PronunciationAssessment?: Record<string, unknown> } | undefined
): number | null {
  const fromSdk = pa.prosodyScore
  if (typeof fromSdk === 'number' && Number.isFinite(fromSdk) && fromSdk >= 0) {
    return clamp100(fromSdk)
  }
  const pron = detail?.PronunciationAssessment
  if (!pron || typeof pron !== 'object') return null
  const keys = [
    'ProsodyScore',
    'prosodyScore',
    'Prosody',
    'prosody',
    'IntonationScore',
    'intonationScore',
  ] as const
  for (const k of keys) {
    const v = pron[k]
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return clamp100(v)
  }
  return null
}

/** Azure Speech uses 100-nanosecond ticks; convert to ms. */
function ticksToMs(ticks: unknown): number | undefined {
  if (typeof ticks !== 'number' || !Number.isFinite(ticks)) return undefined
  return Math.round(ticks / 10000)
}

function wordsFromDetail(detail: { Words?: unknown[] } | undefined): NormalizedWordAssessment[] {
  const words = detail?.Words
  if (!Array.isArray(words)) return []
  const out: NormalizedWordAssessment[] = []
  for (const w of words) {
    if (!w || typeof w !== 'object') continue
    const o = w as Record<string, unknown>
    const word = typeof o.Word === 'string' ? o.Word : ''
    const pa = o.PronunciationAssessment as { AccuracyScore?: number; ErrorType?: string } | undefined
    if (!word) continue
    const startMs = ticksToMs(o.Offset)
    const dur = ticksToMs(o.Duration)
    const endMs = startMs != null && dur != null ? startMs + dur : undefined
    out.push({
      word,
      accuracyScore: clamp100(Number(pa?.AccuracyScore ?? 0)),
      errorType: typeof pa?.ErrorType === 'string' ? pa.ErrorType : undefined,
      ...(startMs != null ? { startMs } : {}),
      ...(endMs != null ? { endMs } : {}),
    })
  }
  /** Read-aloud passages can exceed 64 tokens; clipping hid timings for later sentences. */
  return out.slice(0, 400)
}

function extractProviderRawJson(result: sdk.SpeechRecognitionResult): unknown | undefined {
  try {
    const raw = result.properties?.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult, undefined)
    if (typeof raw === 'string' && raw.trim()) {
      return JSON.parse(raw) as unknown
    }
  } catch {
    /* ignore */
  }
  return undefined
}

function buildSummary(a: NormalizedPronunciationAssessment): string {
  const o = a.overallScore
  if (o >= 82) return 'Your pronunciation and fluency sound strong for this clip.'
  if (o >= 68) return 'You are understandable — a few sounds or rhythms could be smoother.'
  return 'Keep practicing this line — focus on clarity and steady pacing.'
}

function buildNextStep(words: NormalizedWordAssessment[]): string {
  const weakWords = words.filter((w) => w.accuracyScore < 70).slice(0, 2)
  if (weakWords.length > 0) {
    return `Slow down and repeat: “${weakWords.map((x) => x.word).join(' ')}”.`
  }
  return 'Record once more and aim for steady rhythm without rushing the ends of words.'
}

export class AzurePronunciationAssessmentService implements IPronunciationAssessmentService {
  async assessAsync(input: PronunciationAssessmentAssessInput): Promise<PronunciationAssessmentApiResponse> {
    if (!isAzurePronunciationConfigured()) {
      return {
        assessment: null,
        provider: { id: 'azure', mode: 'azure', locale: input.locale },
        summaryFeedback: null,
        recommendedNextStep: null,
        caveats: ['Azure pronunciation mode is on but AZURE_SPEECH_KEY or AZURE_SPEECH_REGION is missing.'],
        providerRawResult: undefined,
      }
    }

    const key = getAzureSpeechKey()!
    const region = getAzureSpeechRegion()!
    const { text: referenceText, alignment, caveat } = resolveReferenceText(input)

    const speechConfig = sdk.SpeechConfig.fromSubscription(key, region)
    speechConfig.speechRecognitionLanguage = input.locale || getAzureSpeechLocale()
    speechConfig.outputFormat = sdk.OutputFormat.Detailed

    const audioBuf = await ensureWavPcm(input.audio, input.mimeType)
    const format = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1)
    const pushStream = sdk.AudioInputStream.createPushStream(format)
    const ab = new ArrayBuffer(audioBuf.length)
    new Uint8Array(ab).set(audioBuf)
    pushStream.write(ab)
    pushStream.close()
    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream)

    const paConfig = new sdk.PronunciationAssessmentConfig(
      referenceText,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Word,
      true
    )
    paConfig.enableProsodyAssessment = true

    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig)
    paConfig.applyTo(recognizer)

    try {
      /**
       * Hard wall-clock timeout around `recognizeOnceAsync`.
       *
       * The Azure Speech SDK retries connection failures and partial-result waits internally and
       * never surfaces a timeout to the caller, so a stalled `switzerlandwest` region or transient
       * TCP/TLS hiccup can leave this promise pending for *minutes*. That, combined with Speak Live's
       * background per-turn prep being awaited at end-of-session via `drainLiveUploads`, is what kept
       * the "Ending session…" overlay up for ~3 minutes in production. A short ceiling lets the call
       * surface as a normal failure (caveat-only result) instead of hanging the worker.
       *
       * Tunable via `AZURE_PA_RECOGNIZE_TIMEOUT_MS` (default 15s — generous for a single learner clip).
       */
      const timeoutMs = azurePaRecognizeTimeoutMs()
      const result = await new Promise<sdk.SpeechRecognitionResult>((resolve, reject) => {
        let settled = false
        const timeoutHandle = setTimeout(() => {
          if (settled) return
          settled = true
          try {
            recognizer.close()
          } catch {
            /* recognizer already torn down */
          }
          reject(new Error(`Azure pronunciation assessment timed out after ${timeoutMs}ms`))
        }, timeoutMs)
        recognizer.recognizeOnceAsync(
          (r) => {
            if (settled) return
            settled = true
            clearTimeout(timeoutHandle)
            resolve(r)
          },
          (err) => {
            if (settled) return
            settled = true
            clearTimeout(timeoutHandle)
            reject(new Error(err))
          }
        )
      })

      if (result.reason !== sdk.ResultReason.RecognizedSpeech) {
        let extra = result.errorDetails || result.text || ''
        if (result.reason === sdk.ResultReason.Canceled) {
          try {
            extra = sdk.CancellationDetails.fromResult(result).errorDetails || extra
          } catch (inner) {
            extra =
              (inner instanceof Error ? inner.message : String(inner)) ||
              extra ||
              'Cancellation details could not be read.'
          }
        }
        return {
          assessment: null,
          provider: { id: 'azure', mode: 'azure', locale: input.locale },
          summaryFeedback: null,
          recommendedNextStep: null,
          caveats: [
            `Azure did not return a recognized result (${sdk.ResultReason[result.reason]}). ${extra}`.trim(),
          ],
          providerRawResult: extractProviderRawJson(result),
        }
      }

      const providerRawResult = extractProviderRawJson(result)
      const pa = sdk.PronunciationAssessmentResult.fromResult(result)
      const detail = pa.detailResult as
        | { Words?: unknown[]; PronunciationAssessment?: Record<string, unknown> }
        | undefined
      const pron = detail?.PronunciationAssessment

      const pronunciationScore = clamp100(pa.pronunciationScore)
      const accuracyScore = clamp100(pa.accuracyScore)
      const fluencyScore = clamp100(pa.fluencyScore)
      const completenessScore = clamp100(pa.completenessScore)
      const prosodyScore = extractProsodyScore(pa, detail)

      const overallScore = clamp100(
        pron && typeof pron.PronScore === 'number'
          ? (pron.PronScore as number)
          : (pronunciationScore + fluencyScore + completenessScore) / 3
      )

      const wordList = wordsFromDetail(detail)
      const assessment: NormalizedPronunciationAssessment = {
        pronunciationScore,
        accuracyScore,
        fluencyScore,
        completenessScore,
        prosodyScore,
        overallScore,
        recognizedText: result.text?.trim() ?? '',
        referenceTextUsed: referenceText,
        assessmentMode: input.assessmentMode as PronunciationAssessmentMode,
        referenceAlignment: alignment,
        words: wordList,
        actionNotes: [buildNextStep(wordList)],
        caveatNotes: [
          ...(caveat ? [caveat] : []),
          ...(input.assessmentMode === 'open_response'
            ? ['Open-response mode: use scores as feedback hints, not as exact exam marks.']
            : []),
        ],
      }

      const caveats = [...assessment.caveatNotes]
      return {
        assessment,
        provider: { id: 'azure', mode: 'azure', locale: input.locale },
        summaryFeedback: buildSummary(assessment),
        recommendedNextStep: buildNextStep(wordList),
        caveats,
        providerRawResult,
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return {
        assessment: null,
        provider: { id: 'azure', mode: 'azure', locale: input.locale },
        summaryFeedback: null,
        recommendedNextStep: null,
        caveats: [`Azure pronunciation assessment failed: ${msg}`],
        providerRawResult: undefined,
      }
    } finally {
      try {
        recognizer.close()
      } catch {
        /* The Speech SDK can dispose the recognizer from timeout/cancel paths before cleanup. */
      }
    }
  }
}
