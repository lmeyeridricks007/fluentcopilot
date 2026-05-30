import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type ReferenceSpeedMode = 'normal' | 'slow' | 'chunked'

const MAX_MEMORY = 96
const memoryOrder: string[] = []
const memory = new Map<string, { dataUrl: string }>()

function normalizeText(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

/** Stable cache key: locale + voice + speed mode + normalized text. */
export function referenceAudioCacheKey(input: {
  locale: string
  voice: string
  mode: ReferenceSpeedMode
  text: string
}): string {
  const raw = `${input.locale.toLowerCase()}|${input.voice}|${input.mode}|${normalizeText(input.text)}`
  return createHash('sha256').update(raw, 'utf8').digest('hex')
}

export function getReferenceAudioMemoryCache(key: string): string | null {
  return memory.get(key)?.dataUrl ?? null
}

export function setReferenceAudioMemoryCache(key: string, dataUrl: string): void {
  const i = memoryOrder.indexOf(key)
  if (i >= 0) memoryOrder.splice(i, 1)
  memoryOrder.push(key)
  memory.set(key, { dataUrl })
  while (memoryOrder.length > MAX_MEMORY) {
    const ev = memoryOrder.shift()
    if (ev) memory.delete(ev)
  }
}

function diskDir(): string | null {
  const d = process.env.SPEAKING_REFERENCE_AUDIO_CACHE_DIR?.trim() || process.env.AUDIO_TTS_DISK_CACHE_DIR?.trim()
  return d || null
}

export async function readReferenceAudioDiskCache(key: string): Promise<string | null> {
  const base = diskDir()
  if (!base) return null
  const fp = path.join(base, `speaking-ref-${key}.txt`)
  try {
    const s = await readFile(fp, 'utf8')
    if (s.startsWith('data:')) return s.trim()
    return null
  } catch {
    return null
  }
}

export async function writeReferenceAudioDiskCache(key: string, dataUrl: string): Promise<void> {
  const base = diskDir()
  if (!base) return
  try {
    await mkdir(base, { recursive: true })
    await writeFile(path.join(base, `speaking-ref-${key}.txt`), dataUrl, 'utf8')
  } catch {
    /* ignore */
  }
}
