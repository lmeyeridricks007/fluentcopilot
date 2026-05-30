import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type SpeakLiveReferenceTtsCacheProvider = 'azure' | 'openai'

const MAX_MEMORY_ENTRIES = 64
const memoryOrder: string[] = []
const memory = new Map<string, Buffer>()

function touchMemory(key: string, buf: Buffer) {
  const i = memoryOrder.indexOf(key)
  if (i >= 0) memoryOrder.splice(i, 1)
  memoryOrder.push(key)
  memory.set(key, buf)
  while (memoryOrder.length > MAX_MEMORY_ENTRIES) {
    const ev = memoryOrder.shift()
    if (ev) memory.delete(ev)
  }
}

/**
 * Deterministic normalization for reference-TTS cache keys only.
 * NFC, trim, map common line/paragraph breaks to a single ASCII space, collapse ASCII runs of spaces.
 * Does not lowercase or strip punctuation (avoids phrase collisions).
 */
export function normalizeReferenceTtsCacheText(raw: string): string {
  const nfc = raw.normalize('NFC').trim()
  return nfc
    .replace(/[\t\n\r\v\f\u0085\u2028\u2029]+/g, ' ')
    .replace(/ +/g, ' ')
    .trim()
}

/**
 * Cache key: SHA-256 of `language`, `voiceId`, `normalizedText`, `ttsProvider`, `ttsVersion`
 * joined with ASCII record separator (unambiguous field boundaries).
 */
export function referenceTtsCacheKey(parts: {
  language: string
  voiceId: string
  normalizedText: string
  ttsProvider: SpeakLiveReferenceTtsCacheProvider
  ttsVersion: string
}): string {
  const raw = [
    parts.language.trim().toLowerCase(),
    parts.voiceId.trim(),
    parts.normalizedText,
    parts.ttsProvider,
    parts.ttsVersion.trim(),
  ].join('\x1e')
  return createHash('sha256').update(raw, 'utf8').digest('hex')
}

function referenceTtsDiskCacheRoot(): string | null {
  const own = process.env.SPEAK_LIVE_REFERENCE_TTS_DISK_CACHE_DIR?.trim()
  if (own) return own
  const audio = process.env.AUDIO_TTS_DISK_CACHE_DIR?.trim()
  if (audio) return path.join(audio, 'speak-live-reference-tts')
  return null
}

export function isSpeakLiveReferenceTtsLayerCacheEnabled(): boolean {
  const v = (process.env.SPEAK_LIVE_REFERENCE_TTS_CACHE_DISABLED ?? '').trim().toLowerCase()
  if (v === '1' || v === 'true' || v === 'yes') return false
  return true
}

export async function readSpeakLiveReferenceTtsDiskCache(key: string): Promise<Buffer | null> {
  const base = referenceTtsDiskCacheRoot()
  if (!base) return null
  const fp = path.join(base, `${key}.mp3`)
  try {
    const buf = await readFile(fp)
    if (buf.length < 16) return null
    return buf
  } catch {
    return null
  }
}

export async function writeSpeakLiveReferenceTtsDiskCache(key: string, buf: Buffer): Promise<void> {
  const base = referenceTtsDiskCacheRoot()
  if (!base) return
  try {
    await mkdir(base, { recursive: true })
    await writeFile(path.join(base, `${key}.mp3`), buf)
  } catch {
    /* ignore disk cache failures */
  }
}

export function getSpeakLiveReferenceTtsMemoryCache(key: string): Buffer | null {
  return memory.get(key) ?? null
}

export function setSpeakLiveReferenceTtsMemoryCache(key: string, buf: Buffer): void {
  touchMemory(key, buf)
}

/** Test helper: clear in-process reference TTS cache state. */
export function clearSpeakLiveReferenceTtsCachesForTests(): void {
  memoryOrder.length = 0
  memory.clear()
}
