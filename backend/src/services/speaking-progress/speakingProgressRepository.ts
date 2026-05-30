import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { getSpeakingProgressStoreDir, isSpeakingProgressEnabled } from './speakingProgressConfig'
import type { SpeakingProgressRecordV1 } from './speakingProgressRecord'

function safeUserFileSegment(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) || 'anonymous'
}

function filePathForUser(userId: string): string {
  return path.join(getSpeakingProgressStoreDir(), `${safeUserFileSegment(userId)}.jsonl`)
}

export async function appendSpeakingProgressRow(userId: string, row: SpeakingProgressRecordV1): Promise<void> {
  if (!isSpeakingProgressEnabled()) return
  const dir = getSpeakingProgressStoreDir()
  await fs.mkdir(dir, { recursive: true })
  const line = `${JSON.stringify(row)}\n`
  await fs.appendFile(filePathForUser(userId), line, 'utf8')
}

export async function readRecentSpeakingProgress(
  userId: string,
  limit = 200
): Promise<SpeakingProgressRecordV1[]> {
  if (!isSpeakingProgressEnabled()) return []
  const p = filePathForUser(userId)
  try {
    const raw = await fs.readFile(p, 'utf8')
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    const slice = lines.slice(-limit)
    const out: SpeakingProgressRecordV1[] = []
    for (const line of slice) {
      try {
        const rec = JSON.parse(line) as SpeakingProgressRecordV1
        if (rec && rec.schemaVersion === 1) out.push(rec)
      } catch {
        /* skip bad line */
      }
    }
    return out
  } catch {
    return []
  }
}
