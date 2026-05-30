import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { GenerateSpeechInput } from './textToSpeechContracts'

const MAX_MEMORY_ENTRIES = 128

function normalizeText(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

export function ttsCacheKey(input: GenerateSpeechInput, model: string, resolvedVoice: string): string {
  const lang = (input.language ?? 'nl-NL').toLowerCase().trim()
  const speed = input.speed != null && Number.isFinite(input.speed) ? String(input.speed) : '1'
  const purpose = (input.purpose ?? 'assistant_message').toString()
  const raw = `${model}|${resolvedVoice}|${lang}|${speed}|${purpose}|${normalizeText(input.text)}`
  return createHash('sha256').update(raw, 'utf8').digest('hex')
}

type Entry = { buf: Buffer; mime: string }

const memoryOrder: string[] = []
const memory = new Map<string, Entry>()

function touchMemory(key: string, entry: Entry) {
  const i = memoryOrder.indexOf(key)
  if (i >= 0) memoryOrder.splice(i, 1)
  memoryOrder.push(key)
  memory.set(key, entry)
  while (memoryOrder.length > MAX_MEMORY_ENTRIES) {
    const ev = memoryOrder.shift()
    if (ev) memory.delete(ev)
  }
}

export function getTtsMemoryCache(key: string): Entry | null {
  return memory.get(key) ?? null
}

export function setTtsMemoryCache(key: string, entry: Entry) {
  touchMemory(key, entry)
}

function diskDir(): string | null {
  const d = process.env.AUDIO_TTS_DISK_CACHE_DIR?.trim()
  return d ? d : null
}

export async function readTtsDiskCache(key: string): Promise<Entry | null> {
  const base = diskDir()
  if (!base) return null
  const fp = path.join(base, `${key}.mp3`)
  try {
    const buf = await readFile(fp)
    if (buf.length < 16) return null
    return { buf, mime: 'audio/mpeg' }
  } catch {
    return null
  }
}

export async function writeTtsDiskCache(key: string, buf: Buffer): Promise<void> {
  const base = diskDir()
  if (!base) return
  try {
    await mkdir(base, { recursive: true })
    const fp = path.join(base, `${key}.mp3`)
    await writeFile(fp, buf)
  } catch {
    /* ignore disk cache failures */
  }
}
