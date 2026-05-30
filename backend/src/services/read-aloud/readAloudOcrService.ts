import { ApiError } from '../../shared/errors'
import { looksLikeUnsupportedTextContent, postProcessOcrLines } from './readAloudOcrPostProcess'

function getVisionConfig(): { endpoint: string; key: string } | null {
  const endpoint = process.env.AZURE_VISION_ENDPOINT?.trim()
  const key = process.env.AZURE_VISION_KEY?.trim()
  if (!endpoint || !key) return null
  return { endpoint: endpoint.replace(/\/+$/, ''), key }
}

/** Azure Read v3.2 `readResults` line (subset + optional word confidences). */
type ReadLine = {
  text?: string
  words?: Array<{ text?: string; confidence?: number }>
}

type ReadPage = {
  lines?: ReadLine[]
}

type ReadAnalyzeResult = {
  status?: string
  analyzeResult?: {
    readResults?: ReadPage[]
  }
}

const SUPPORTED_VISION_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/bmp',
  'image/gif',
  'image/tiff',
  'image/webp',
])

export function resolveVisionContentType(mimeType: string): string {
  const m = mimeType.split(';')[0]?.trim().toLowerCase() ?? ''
  if (m === 'image/jpg') return 'image/jpeg'
  return m
}

export function assertSupportedImageMime(mimeType: string): void {
  const m = resolveVisionContentType(mimeType)
  if (SUPPORTED_VISION_CONTENT_TYPES.has(m)) return
  const isHeic = m.includes('heic') || m.includes('heif')
  throw new ApiError(
    400,
    'VALIDATION_ERROR',
    isHeic
      ? 'This image format (HEIC/HEIF) is not supported for text extraction yet. Export as JPEG or PNG and try again.'
      : 'Unsupported image type for text extraction. Use JPEG, PNG, WebP, GIF, BMP, or TIFF.',
    { mimeType: 'Unsupported format' }
  )
}

export type ReadAloudOcrExtractionResult = {
  /** Cleaned passage text (paragraph breaks preserved where lines suggested them). */
  text: string
  /**
   * Mean of per-word confidences when Azure returns them (approximately 0–1).
   * `null` when the service did not expose word-level scores.
   */
  confidence: number | null
  /** True when the extract is unusually short, structurally thin, or low-confidence. */
  partial: boolean
  /** Optional human hint for the review step (not an error). */
  detail: string | null
  /** Non-blocking issues for the learner (blur, incompleteness, etc.). */
  warnings: string[]
}

function collectLinesAndConfidences(pages: ReadPage[]): { rawLines: string[]; confidences: number[] } {
  const rawLines: string[] = []
  const confidences: number[] = []

  for (const page of pages) {
    for (const line of page.lines ?? []) {
      const words = line.words
      if (Array.isArray(words) && words.length > 0) {
        for (const w of words) {
          const c = w.confidence
          if (typeof c === 'number' && Number.isFinite(c)) {
            confidences.push(Math.max(0, Math.min(1, c)))
          }
        }
      }
      const tx = typeof line.text === 'string' ? line.text.trim() : ''
      if (tx) rawLines.push(tx)
    }
  }

  return { rawLines, confidences }
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

/**
 * Azure Computer Vision Read API v3.2 (printed text; handwriting may vary in quality).
 * Configure `AZURE_VISION_ENDPOINT` + `AZURE_VISION_KEY`.
 */
export async function extractTextFromImage(input: { imageBytes: Buffer; mimeType: string }): Promise<ReadAloudOcrExtractionResult> {
  assertSupportedImageMime(input.mimeType)
  const cfg = getVisionConfig()
  if (!cfg) {
    throw new ApiError(
      503,
      'DEPENDENCY_UNAVAILABLE',
      'Photo-to-text is not configured on the server. Ask your administrator to set AZURE_VISION_ENDPOINT and AZURE_VISION_KEY.',
      { ocr: 'Unavailable' }
    )
  }

  const contentType = resolveVisionContentType(input.mimeType)
  const url = `${cfg.endpoint}/vision/v3.2/read/analyze`

  let submit: Response
  try {
    submit = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Ocp-Apim-Subscription-Key': cfg.key,
      },
      body: new Uint8Array(input.imageBytes),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new ApiError(
      502,
      'DEPENDENCY_UNAVAILABLE',
      `We could not reach the text-extraction service. Check your connection and try again. (${msg.slice(0, 120)})`
    )
  }

  if (submit.status === 413) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Image file is too large. Try a smaller photo or lower camera resolution.', {
      image: 'Too large',
    })
  }

  if (submit.status !== 202) {
    await submit.text().catch(() => '')
    if (submit.status >= 400 && submit.status < 500) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'The image could not be processed. Try a sharper photo, even lighting, and a common format (JPEG or PNG).',
        { upstream: String(submit.status) }
      )
    }
    throw new ApiError(
      502,
      'DEPENDENCY_UNAVAILABLE',
      `Text extraction service returned an error (${submit.status}). Please try again in a moment.`
    )
  }

  const opLoc = submit.headers.get('Operation-Location') ?? submit.headers.get('operation-location')
  if (!opLoc) {
    throw new ApiError(502, 'DEPENDENCY_UNAVAILABLE', 'Text extraction did not start correctly. Please try again.')
  }

  const deadline = Date.now() + 45_000
  let result: ReadAnalyzeResult | null = null
  while (Date.now() < deadline) {
    let poll: Response
    try {
      poll = await fetch(opLoc, {
        headers: { 'Ocp-Apim-Subscription-Key': cfg.key },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new ApiError(502, 'DEPENDENCY_UNAVAILABLE', `Could not retrieve extraction results. ${msg.slice(0, 120)}`)
    }
    if (!poll.ok) {
      throw new ApiError(
        502,
        'DEPENDENCY_UNAVAILABLE',
        'Text extraction was interrupted. Please try again with a smaller or simpler image.'
      )
    }
    result = (await poll.json()) as ReadAnalyzeResult
    const st = result.status?.toLowerCase()
    if (st === 'succeeded') break
    if (st === 'failed') {
      throw new ApiError(
        422,
        'VALIDATION_ERROR',
        'Text extraction failed for this image. Try again with a clearer shot, less glare, and the page filling more of the frame.',
        { ocr: 'Failed' }
      )
    }
    await new Promise((r) => setTimeout(r, 700))
  }

  if (!result || result.status?.toLowerCase() !== 'succeeded') {
    throw new ApiError(
      504,
      'DEPENDENCY_UNAVAILABLE',
      'Text extraction took too long. Try again with a smaller image or fewer pages in frame.'
    )
  }

  const pages = result.analyzeResult?.readResults ?? []
  const { rawLines, confidences } = collectLinesAndConfidences(pages)
  const confidenceAvg = mean(confidences)
  const text = postProcessOcrLines(rawLines)

  if (!text) {
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      'No readable text was found in this image. It may be too blurry, too dark, or not contain printed text. Try moving closer and steadying the camera.',
      { ocr: 'No text' }
    )
  }

  if (looksLikeUnsupportedTextContent(text)) {
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      'We could not find a passage that looks like readable text. If this is a photo of a scene, object, or screen UI, try a straight-on photo of printed words instead.',
      { ocr: 'Unsupported content' }
    )
  }

  const warnings: string[] = []
  if (confidenceAvg != null && confidenceAvg < 0.62) {
    warnings.push(
      'Average word confidence is low — the photo may be blurry, skewed, or glare may be hiding letters. Fix the image or correct the text carefully before reading.'
    )
  }
  if (confidenceAvg != null) {
    const lowWords = confidences.filter((c) => c < 0.5).length
    if (lowWords >= 3 && lowWords / confidences.length > 0.2) {
      warnings.push('Several words were read with low confidence — expect OCR mistakes; edit line by line.')
    }
  }
  if (rawLines.length < 2 && text.length < 120) {
    warnings.push('Only a short fragment was detected — part of the page may be cut off or out of focus.')
  }
  if (text.length < 80) {
    warnings.push('The extract is quite short — make sure nothing was cropped out of the photo.')
  }

  const partial =
    text.length < 80 ||
    rawLines.length < 2 ||
    (confidenceAvg != null && confidenceAvg < 0.65) ||
    warnings.length >= 2

  const detail =
    partial || warnings.length > 0
      ? 'Review every line, fix OCR slips, remove stray characters, then confirm before you read aloud.'
      : null

  return {
    text,
    confidence: confidenceAvg,
    partial,
    detail,
    warnings,
  }
}
