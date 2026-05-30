import { azureOpenAiChatCompletionJson } from '../azureOpenAi/azureOpenAiRestClient'
import type { ChatMessage } from '../../prompts/buildTurnMessages'
import { extractTextFromImage } from '../read-aloud/readAloudOcrService'
import { looksLikeUnsupportedTextContent, postProcessOcrLines } from '../read-aloud/readAloudOcrPostProcess'
import { getSpeechToTextService } from '../speech/speechToTextGateway'
import type { QuickCaptureType } from '../../repositories/quickCaptureRepository'
import type {
  QuickCaptureCaptureMedia,
  QuickCaptureEnrichmentPayload,
  QuickCapturePracticeRecommendation,
  QuickCapturePracticeRecommendationKind,
  QuickCaptureSkillImpact,
  QuickCaptureVoiceNoteAnalysis,
  QuickCaptureVoicePracticeSurface,
} from '../../domain/learningMemory/sessionInsightExtractionQuickCapture'
import { tryUploadQuickCaptureBinaryArtifact } from '../storage/blobStorageService'
import { runVoiceNoteLinguisticAnalysis } from './voiceNoteLinguisticAnalysis'

export type RawCapturePayload = {
  imageBase64?: string
  imageMimeType?: string
  voiceAudioBase64?: string
  voiceMimeType?: string
  /** After processing, raw JSON may be replaced with blob pointers only. */
  imageBlobPath?: string
  voiceBlobPath?: string
}

const PRACTICE_KINDS = new Set<QuickCapturePracticeRecommendationKind>([
  'word_rep',
  'phrase_rep',
  'correction_drill',
  'mini_scenario',
  'read_aloud_source',
  'listening_drill_source',
  'coach_debrief_source',
])

function extForImageMime(mime: string): string {
  const m = mime.split(';')[0]?.trim().toLowerCase() ?? ''
  if (m.includes('png')) return 'png'
  if (m.includes('webp')) return 'webp'
  if (m.includes('gif')) return 'gif'
  if (m.includes('jpeg') || m === 'image/jpg') return 'jpg'
  return 'img'
}

function extForVoiceMime(mime: string): string {
  const m = mime.split(';')[0]?.trim().toLowerCase() ?? ''
  if (m.includes('webm')) return 'webm'
  if (m.includes('wav')) return 'wav'
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3'
  if (m.includes('mp4') || m.includes('m4a')) return 'm4a'
  return 'audio'
}

function cleanOcrBlock(raw: string): string {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  return postProcessOcrLines(lines)
}

function cleanTranscriptBasic(raw: string): string {
  return raw.replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim()
}

const VOCAB_STOP = new Set([
  'de',
  'het',
  'een',
  'ik',
  'je',
  'u',
  'we',
  'te',
  'en',
  'maar',
  'dat',
  'die',
  'dit',
  'van',
  'naar',
  'voor',
  'met',
  'op',
  'aan',
  'er',
  'niet',
  'wel',
  'ja',
  'nee',
  'dus',
  'ook',
  'als',
])

function vocabularyHintsFromDutch(text: string, max: number): string[] {
  const t = text.toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of t.split(/\s+/)) {
    const w = raw.replace(/^[''-]+|[''-]+$/g, '').trim()
    if (w.length < 4 || VOCAB_STOP.has(w)) continue
    if (seen.has(w)) continue
    seen.add(w)
    out.push(w)
    if (out.length >= max) break
  }
  return out
}

function firstSentenceNl(text: string, maxLen: number): string {
  const t = text.trim().replace(/\s+/g, ' ')
  if (!t) return ''
  let end = t.length
  for (const sep of ['. ', '! ', '? ', '.\n', '!\n', '?\n']) {
    const i = t.indexOf(sep)
    if (i >= 0 && i + 1 < end) end = i + 1
  }
  const cut = t.slice(0, end).trim()
  return cut.length > maxLen ? `${cut.slice(0, maxLen - 1)}…` : cut
}

function buildVoicePracticeSurface(input: {
  primary: string
  secondary: string | null
  enrichment: QuickCaptureEnrichmentPayload
}): QuickCaptureVoicePracticeSurface | null {
  const p = input.primary.trim()
  if (!p) return null
  const polished = input.enrichment.dutchCanonical?.trim() || p
  const gloss = input.enrichment.englishGloss?.trim() ?? null
  const slug = input.enrichment.scenarioSlugGuess ?? null
  const notes = input.enrichment.registerNotes?.trim() ?? null
  const sec = input.secondary?.trim() ?? ''
  const struggle = input.enrichment.struggleSignals ?? []
  const paceOrListen = struggle.some((s) => /pace|listen|fast|unclear/i.test(s))
  const whatNext =
    sec.split(/[—–-]/)[0]?.trim().slice(0, 200) ||
    notes?.slice(0, 200) ||
    (paceOrListen
      ? 'Kunt u dat alstublieft iets langzamer herhalen?'
      : 'Mag ik dat nog een keer anders zeggen? Even oefenen.')
  const phrase = firstSentenceNl(polished, 180) || firstSentenceNl(p, 180)
  const coach = `Reflect on what you said: “${p.slice(0, 220)}${p.length > 220 ? '…' : ''}”. What would you tighten next time?`
  const seed = slug
    ? `Korte oefening in ${slug.replace(/-/g, ' ')}: herhaal je punt rustig in één zin.`
    : 'Stel je dezelfde situatie voor — zeg het nu in één rustige zin.'
  const hints = vocabularyHintsFromDutch(`${polished}\n${p}`, 10)

  return {
    polishedDutch: polished,
    englishGloss: gloss,
    whatToSayNextNl: whatNext,
    phrasePracticeNl: phrase,
    coachDebriefSeed: coach,
    miniScenarioSlugGuess: slug,
    miniScenarioSeedNl: seed,
    vocabularyHints: hints,
  }
}

function guessDocumentStyleFromText(text: string): { documentStyleGuess: string; documentStyleConfidence: number } {
  const t = text.slice(0, 6000).toLowerCase()
  if (!t.trim()) return { documentStyleGuess: 'unknown', documentStyleConfidence: 0.25 }
  if (looksLikeUnsupportedTextContent(text)) return { documentStyleGuess: 'unknown', documentStyleConfidence: 0.35 }
  const euroOrPrice = /€|\beur\b|\d+[,.]\d{2}\b/u.test(t)
  const lineCount = text.split(/\n/).filter((l) => l.trim().length > 0).length
  if (euroOrPrice && lineCount <= 14 && text.length < 900) {
    return { documentStyleGuess: 'menu_or_receipt', documentStyleConfidence: 0.55 }
  }
  if (/geachte|hoofdstuk|formulier|aanvraag|betreft:|datum:|handtekening|onderteken/.test(t)) {
    return { documentStyleGuess: 'letter_or_form', documentStyleConfidence: 0.52 }
  }
  if (text.length < 220 && lineCount <= 6 && /^[\sA-Z0-9°•·\-–—]+$/u.test(text.replace(/\n/g, ''))) {
    return { documentStyleGuess: 'sign_or_label', documentStyleConfidence: 0.48 }
  }
  if (text.length > 1200) return { documentStyleGuess: 'long_document', documentStyleConfidence: 0.42 }
  return { documentStyleGuess: 'general_text', documentStyleConfidence: 0.4 }
}

function heuristicEnrichment(input: {
  captureType: QuickCaptureType
  primary: string
  secondary?: string | null
}): QuickCaptureEnrichmentPayload {
  const tags: string[] = [input.captureType.replace(/_/g, '-')]
  const t = `${input.primary} ${input.secondary ?? ''}`.toLowerCase()
  let scenarioSlugGuess: string | null = null
  if (/station|trein|perron|ns\b|ov/.test(t)) scenarioSlugGuess = 'train-station'
  else if (/albert|jumbo|lidl|winkel|boodschap/.test(t)) scenarioSlugGuess = 'supermarket-shop'
  else if (/arts|apotheek/.test(t)) scenarioSlugGuess = 'doctor-pharmacy'
  return {
    tags,
    scenarioSlugGuess,
    registerNotes: null,
    phase: 'capture_enriched',
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function parsePracticeRecommendations(raw: unknown): QuickCapturePracticeRecommendation[] {
  if (!Array.isArray(raw)) return []
  const out: QuickCapturePracticeRecommendation[] = []
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue
    const o = x as Record<string, unknown>
    const kind = o.kind
    const confidence = typeof o.confidence === 'number' ? clamp01(o.confidence) : 0
    const rationale = typeof o.rationale === 'string' ? o.rationale.trim().slice(0, 400) : ''
    if (typeof kind !== 'string' || !PRACTICE_KINDS.has(kind as QuickCapturePracticeRecommendationKind)) continue
    if (!rationale) continue
    out.push({ kind: kind as QuickCapturePracticeRecommendationKind, confidence, rationale })
  }
  return out.slice(0, 8)
}

function parseSkillImpacts(raw: unknown): QuickCaptureSkillImpact[] {
  if (!Array.isArray(raw)) return []
  const out: QuickCaptureSkillImpact[] = []
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue
    const o = x as Record<string, unknown>
    const skill = typeof o.skill === 'string' ? o.skill.trim().slice(0, 80) : ''
    const impact = o.impact
    const confidence = typeof o.confidence === 'number' ? clamp01(o.confidence) : 0
    if (!skill) continue
    if (impact !== 'reinforce' && impact !== 'stretch' && impact !== 'unclear') continue
    out.push({ skill, impact, confidence })
  }
  return out.slice(0, 12)
}

async function structuredLlmEnrichment(input: {
  captureType: QuickCaptureType
  primary: string
  secondary?: string | null
  ocrCleaned?: string | null
  documentStyleGuess?: string | null
  rawTranscript?: string | null
  /** Filename or short caption when OCR is empty — helps infer shop / street / transit context. */
  photoFilenameOrCaption?: string | null
}): Promise<Partial<QuickCaptureEnrichmentPayload> | null> {
  try {
    const system: ChatMessage = {
      role: 'system',
      content: `You enrich Dutch learner "quick capture" notes from real life. Be conservative — do not overclaim.

Return JSON ONLY with this shape:
{
  "tags": string[],
  "scenarioSlugGuess": string|null,
  "registerNotes": string|null,
  "englishGloss": string|null,
  "dutchCanonical": string|null,
  "likelyMeaning": string|null,
  "likelyScenario": string|null,
  "likelyPlaceType": string|null,
  "struggleSignals": string[],
  "skillImpacts": Array<{ "skill": string, "impact": "reinforce"|"stretch"|"unclear", "confidence": number }>,
  "practiceRecommendations": Array<{ "kind": "word_rep"|"phrase_rep"|"correction_drill"|"mini_scenario"|"read_aloud_source"|"listening_drill_source"|"coach_debrief_source", "confidence": number, "rationale": string }>,
  "enrichmentNotes": string|null,
  "overallConfidence": number,
  "needsReview": boolean
}

Rules:
- overallConfidence is 0–1 for the whole interpretation (lower if OCR/noisy audio/ambiguous).
- needsReview true if confidence < 0.45 or inputs are partial/ambiguous.
- scenarioSlugGuess one of: train-station, supermarket-shop, doctor-pharmacy, ordering-food, gemeente-style, or null.
- practiceRecommendations: at most 4 items; only include kinds you list; confidence 0–1; rationale short, hedged ("may", "could").
- For captureType "voice_note" with rawTranscript: include 3–4 practiceRecommendations when possible (phrase_rep, correction_drill, mini_scenario, coach_debrief_source, read_aloud_source, listening_drill_source).
- For captureType "photo_text": if primary is a filename/placeholder or OCR is weak, use photoFilenameOrCaption + any ocrCleaned hints to infer likelyScenario, likelyPlaceType, and tags (e.g. shop, street_art, transit); set needsReview true when guessing from little evidence.
- struggleSignals: short snake_case tokens (e.g. pace, vocabulary_gap) or empty.`,
    }
    const user: ChatMessage = {
      role: 'user',
      content: JSON.stringify({
        captureType: input.captureType,
        primary: input.primary.slice(0, 3500),
        secondary: input.secondary?.slice(0, 1200) ?? null,
        ocrCleaned: input.ocrCleaned?.slice(0, 3500) ?? null,
        documentStyleGuess: input.documentStyleGuess,
        rawTranscript: input.rawTranscript?.slice(0, 3500) ?? null,
        photoFilenameOrCaption: input.photoFilenameOrCaption?.trim().slice(0, 400) ?? null,
      }),
    }
    const raw = await azureOpenAiChatCompletionJson([system, user])
    const j = JSON.parse(raw) as Record<string, unknown>
    return {
      tags: Array.isArray(j.tags) ? (j.tags as string[]).filter((x) => typeof x === 'string').slice(0, 16) : undefined,
      scenarioSlugGuess: typeof j.scenarioSlugGuess === 'string' ? j.scenarioSlugGuess : null,
      registerNotes: typeof j.registerNotes === 'string' ? j.registerNotes : null,
      englishGloss: typeof j.englishGloss === 'string' ? j.englishGloss : null,
      dutchCanonical: typeof j.dutchCanonical === 'string' ? j.dutchCanonical : null,
      likelyMeaning: typeof j.likelyMeaning === 'string' ? j.likelyMeaning : null,
      likelyScenario: typeof j.likelyScenario === 'string' ? j.likelyScenario : null,
      likelyPlaceType: typeof j.likelyPlaceType === 'string' ? j.likelyPlaceType : null,
      struggleSignals: Array.isArray(j.struggleSignals)
        ? (j.struggleSignals as string[]).filter((s) => typeof s === 'string').map((s) => s.trim().slice(0, 64)).slice(0, 12)
        : undefined,
      skillImpacts: parseSkillImpacts(j.skillImpacts),
      practiceRecommendations: parsePracticeRecommendations(j.practiceRecommendations),
      enrichmentNotes: typeof j.enrichmentNotes === 'string' ? j.enrichmentNotes : null,
      overallConfidence: typeof j.overallConfidence === 'number' ? clamp01(j.overallConfidence) : undefined,
      needsReview: typeof j.needsReview === 'boolean' ? j.needsReview : undefined,
    }
  } catch {
    return null
  }
}

export async function runQuickCaptureEnrichment(params: {
  captureType: QuickCaptureType
  bodyPrimary: string | null
  bodySecondary: string | null
  raw: RawCapturePayload | null
  userId: string
  captureId: string
  /** Optional title / filename from the client (esp. photo uploads) for LLM context when OCR is empty. */
  title?: string | null
  /** Client-side STT or typed backup when server STT is unavailable. */
  transcriptHint?: string | null
}): Promise<{
  enrichment: QuickCaptureEnrichmentPayload
  bodyPrimary: string | null
  bodySecondary: string | null
  transcript: string | null
  ocrText: string | null
  replacementRawJson: string | null
}> {
  let primary = params.bodyPrimary?.trim() ?? ''
  let secondary = params.bodySecondary?.trim() ?? null
  let transcript: string | null = null
  let ocrText: string | null = null
  let replacementRawJson: string | null = null

  let captureMedia: QuickCaptureCaptureMedia | undefined

  if (params.captureType === 'voice_note' && params.raw?.voiceAudioBase64 && params.raw.voiceMimeType) {
    const buf = Buffer.from(params.raw.voiceAudioBase64, 'base64')
    const fn = `voice.${extForVoiceMime(params.raw.voiceMimeType)}`
    let uploaded: Awaited<ReturnType<typeof tryUploadQuickCaptureBinaryArtifact>> = null
    try {
      uploaded = await tryUploadQuickCaptureBinaryArtifact(
        params.userId,
        params.captureId,
        fn,
        buf,
        params.raw.voiceMimeType,
      )
    } catch {
      uploaded = null
    }
    let rawTr: string | null = null
    try {
      const stt = getSpeechToTextService()
      const hintForStt = [params.title?.trim(), secondary].filter(Boolean).join(' — ').trim().slice(0, 400)
      const tr = await stt.transcribeAsync(buf, params.raw.voiceMimeType, {
        language: 'nl',
        purpose: 'quick_capture_voice',
        ...(hintForStt ? { transcriptionPrompt: hintForStt } : {}),
      })
      rawTr = tr.text?.trim() || null
    } catch {
      rawTr = null
    }
    transcript = rawTr ? cleanTranscriptBasic(rawTr) : null
    const hintClean = params.transcriptHint?.trim() ? cleanTranscriptBasic(params.transcriptHint) : null
    if (!transcript && hintClean) {
      transcript = hintClean
    }
    const cleanedTr = transcript
    if (cleanedTr && (!primary.trim() || primary.trim().length < cleanedTr.length * 0.5)) {
      primary = cleanedTr
    } else if (!cleanedTr && hintClean && !primary.trim()) {
      primary = hintClean
    }

    captureMedia = {
      kind: 'audio',
      blobRelativePath: uploaded?.containerRelativePath ?? null,
      mimeType: params.raw.voiceMimeType,
      byteLength: buf.byteLength,
      audio: {
        rawTranscript: rawTr ?? params.transcriptHint?.trim() ?? null,
        cleanedTranscript: cleanedTr,
        sttConfidence: null,
      },
    }

    if (uploaded?.containerRelativePath) {
      replacementRawJson = JSON.stringify({
        voiceBlobPath: uploaded.containerRelativePath,
        voiceMimeType: params.raw.voiceMimeType,
        voiceStoredAt: new Date().toISOString(),
      })
    }
  }

  if (params.captureType === 'voice_note' && !params.raw?.voiceAudioBase64 && params.transcriptHint?.trim()) {
    const c = cleanTranscriptBasic(params.transcriptHint)
    if (c) {
      transcript = c
      if (!primary.trim()) primary = c
    }
  }

  let voiceNoteAnalysisResult: QuickCaptureVoiceNoteAnalysis | null = null
  if (params.captureType === 'voice_note') {
    const ta = (transcript ?? '').trim() || primary.trim()
    if (ta.length >= 8) {
      voiceNoteAnalysisResult = await runVoiceNoteLinguisticAnalysis({
        transcriptNl: ta,
        userTitle: params.title ?? null,
        userContext: secondary,
      })
    }
  }

  if (params.captureType === 'photo_text' && params.raw?.imageBase64 && params.raw.imageMimeType) {
    const buf = Buffer.from(params.raw.imageBase64, 'base64')
    const fn = `image.${extForImageMime(params.raw.imageMimeType)}`
    let uploaded: Awaited<ReturnType<typeof tryUploadQuickCaptureBinaryArtifact>> = null
    try {
      uploaded = await tryUploadQuickCaptureBinaryArtifact(
        params.userId,
        params.captureId,
        fn,
        buf,
        params.raw.imageMimeType,
      )
    } catch {
      uploaded = null
    }
    try {
      const ex = await extractTextFromImage({ imageBytes: buf, mimeType: params.raw.imageMimeType })
      const rawOcr = ex.text?.trim() || null
      ocrText = rawOcr
      const cleaned = rawOcr ? cleanOcrBlock(rawOcr) : ''
      const doc = cleaned ? guessDocumentStyleFromText(cleaned) : { documentStyleGuess: 'unknown', documentStyleConfidence: 0.25 }

      captureMedia = {
        kind: 'image',
        blobRelativePath: uploaded?.containerRelativePath ?? null,
        mimeType: params.raw.imageMimeType,
        byteLength: buf.byteLength,
        ocr: {
          rawText: rawOcr,
          cleanedText: cleaned || null,
          engineLineConfidence: ex.confidence,
          partial: ex.partial,
          documentStyleGuess: doc.documentStyleGuess,
          documentStyleConfidence: doc.documentStyleConfidence,
        },
      }

      if (cleaned && !primary) primary = cleaned.slice(0, 4000)
      if (cleaned && cleaned.length > 4000 && !secondary) secondary = cleaned.slice(4000, 8000)

      if (uploaded?.containerRelativePath) {
        replacementRawJson = JSON.stringify({
          imageBlobPath: uploaded.containerRelativePath,
          imageMimeType: params.raw.imageMimeType,
          imageStoredAt: new Date().toISOString(),
        })
      }
    } catch {
      ocrText = null
      if (uploaded?.containerRelativePath) {
        captureMedia = {
          kind: 'image',
          blobRelativePath: uploaded.containerRelativePath,
          mimeType: params.raw.imageMimeType,
          byteLength: buf.byteLength,
          ocr: {
            rawText: null,
            cleanedText: null,
            engineLineConfidence: null,
            partial: true,
            documentStyleGuess: 'unknown',
            documentStyleConfidence: 0.2,
          },
        }
      }
    }
  }

  // Photo with no legible OCR: still persist a short primary so the moment appears in Library / packs.
  const photoCaption = (params.title ?? '').trim()
  if (params.captureType === 'photo_text' && !primary.trim()) {
    if (photoCaption) {
      primary = photoCaption.slice(0, 400)
    } else if (captureMedia?.kind === 'image') {
      primary =
        'Foto uit je dag — nog zonder leesbare tekst. Voeg een korte beschrijving toe of maak opnieuw met meer licht/contrast.'
    }
  }

  const ocrCleanedForLlm = captureMedia?.ocr?.cleanedText ?? (ocrText ? cleanOcrBlock(ocrText) : null)
  const docStyle = captureMedia?.ocr?.documentStyleGuess ?? null
  const rawTrForLlm = captureMedia?.audio?.rawTranscript ?? transcript

  const structured =
    primary.length > 0
      ? await structuredLlmEnrichment({
          captureType: params.captureType,
          primary,
          secondary,
          ocrCleaned: ocrCleanedForLlm,
          documentStyleGuess: docStyle,
          rawTranscript: rawTrForLlm,
          photoFilenameOrCaption: params.captureType === 'photo_text' ? (photoCaption || null) : null,
        })
      : null

  const base = heuristicEnrichment({ captureType: params.captureType, primary, secondary })

  const ocrConf = captureMedia?.ocr?.engineLineConfidence ?? null
  const ocrPartial = captureMedia?.ocr?.partial === true
  const lowOcr =
    params.captureType === 'photo_text' &&
    (ocrPartial ||
      (ocrConf != null && ocrConf < 0.45) ||
      (Boolean(ocrCleanedForLlm) && looksLikeUnsupportedTextContent(ocrCleanedForLlm ?? '')))

  const overallFromLlm = structured?.overallConfidence
  const overallHeuristic =
    overallFromLlm != null
      ? overallFromLlm
      : primary.length > 0
        ? lowOcr
          ? 0.42
          : 0.62
        : 0.25

  const needsReview =
    structured?.needsReview === true ||
    lowOcr ||
    overallHeuristic < 0.48 ||
    (params.captureType === 'voice_note' && Boolean(captureMedia?.audio?.rawTranscript) && primary.length < 4) ||
    (voiceNoteAnalysisResult != null &&
      (voiceNoteAnalysisResult.analysisConfidence < 0.42 ||
        voiceNoteAnalysisResult.learnerSpeakerInference === 'ambiguous'))

  const enrichment: QuickCaptureEnrichmentPayload = {
    tags: Array.from(new Set([...(structured?.tags ?? []), ...base.tags])).slice(0, 20),
    scenarioSlugGuess: structured?.scenarioSlugGuess ?? base.scenarioSlugGuess,
    registerNotes: structured?.registerNotes ?? base.registerNotes,
    englishGloss: structured?.englishGloss ?? null,
    dutchCanonical: structured?.dutchCanonical ?? null,
    phase: 'capture_enriched',
    overallConfidence: clamp01(overallHeuristic),
    needsReview,
    captureMedia,
    likelyMeaning: structured?.likelyMeaning ?? null,
    likelyScenario: structured?.likelyScenario ?? null,
    likelyPlaceType: structured?.likelyPlaceType ?? null,
    skillImpacts: structured?.skillImpacts?.length ? structured.skillImpacts : undefined,
    struggleSignals: structured?.struggleSignals?.length ? structured.struggleSignals : undefined,
    practiceRecommendations: structured?.practiceRecommendations?.length
      ? structured.practiceRecommendations
      : undefined,
    enrichmentNotes: structured?.enrichmentNotes ?? null,
    ...(voiceNoteAnalysisResult ? { voiceNoteAnalysis: voiceNoteAnalysisResult } : {}),
  }

  if (enrichment.dutchCanonical?.trim()) {
    primary = enrichment.dutchCanonical.trim()
  }
  if (!secondary && enrichment.englishGloss?.trim()) {
    secondary = enrichment.englishGloss.trim()
  }

  if (params.captureType === 'voice_note' && primary.trim()) {
    enrichment.voicePracticeSurface = buildVoicePracticeSurface({
      primary,
      secondary,
      enrichment,
    })
  }

  return {
    enrichment,
    bodyPrimary: primary || null,
    bodySecondary: secondary,
    transcript,
    ocrText,
    replacementRawJson,
  }
}
